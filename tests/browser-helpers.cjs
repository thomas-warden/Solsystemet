const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8087/';
const artifactDir = process.env.TEST_ARTIFACTS || '/tmp/solsystemet-regression';

async function launch() {
  return chromium.launch({
    executablePath: process.env.BROWSER_BIN || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}

async function newPage(browser, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ...options });
  page.setDefaultTimeout(60000);
  const errors = [], failed = [], fontFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    const message = `${request.url()}: ${request.failure()?.errorText}`;
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) fontFailures.push(message);
    else if (request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(message);
  });

  // Optional fixtures fetched with the machine's normal verified TLS trust store.
  // This helps layout checks when Chromium cannot use a corporate proxy's CA.
  // Never turn off certificate verification to make the tests pass.
  if (process.env.TEST_FONT_CACHE) {
    const directory = process.env.TEST_FONT_CACHE;
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
      status: 200, contentType: 'text/css', body: fs.readFileSync(path.join(directory, 'google.css')),
    }));
    await page.route('https://fonts.gstatic.com/**', route => {
      const file = manifest[route.request().url()];
      return file ? route.fulfill({ status: 200, contentType: 'font/ttf',
        headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(file) }) : route.continue();
    });
  }
  return { page, errors, failed, fontFailures };
}

async function visit(page, route = '') {
  await page.goto(baseURL + (route ? '#' + route : ''), { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.evaluate(() => document.fonts.ready);
}

async function ready(page) {
  await page.waitForFunction(() => {
    const atlas = document.querySelector('#atlas');
    if (!atlas) return false;
    const view = atlas.dataset.view, route = location.hash.replace(/^#/, '');
    const expected = !route || ['explore', 'missions'].includes(route) ? 'home' :
      route.startsWith('orrery') ? 'orrery' : route.includes('-moons') ? 'moons' : route === 'belt' ? 'belt' : 'planet';
    if (view !== expected || (view === 'planet' && atlas.dataset.world !== route)) return false;
    if (view === 'planet') return !document.querySelector('#scene').classList.contains('is-loading') &&
      !document.querySelector('#playButton').disabled && !document.querySelector('#assetStatus').textContent;
    if (view === 'home') return document.querySelector('#homeStage canvas')?.width > 0 &&
      !document.querySelector('#homeMotion').disabled;
    const ids = { orrery: 'orreryStatus', moons: 'moonStatus', belt: 'beltStatus' };
    const canvas = { orrery: 'orreryCanvas', moons: 'moonCanvas', belt: 'beltCanvas' };
    if (view === 'moons' && (!document.querySelector('#moonPlay').onclick ||
      !document.querySelector(`#moonLabels a[href="#${route.split('-moons')[0]}"]`))) return false;
    return ids[view] && !document.getElementById(ids[view]).textContent &&
      document.getElementById(canvas[view]).width > 0;
  });
}

async function range(page, selector, value) {
  // Dispatch the same input event as a deliberate slider adjustment; unlike a
  // timer tick, this must be allowed to advance an observation-based mission.
  await page.locator(selector).evaluate((element, next) => {
    element.value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(200);
}

async function inViewport(page, selectors, label) {
  const boxes = await page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
    const element = document.querySelector(selector), box = element?.getBoundingClientRect();
    return [selector, box && { x: box.x, y: box.y, width: box.width, height: box.height,
      right: box.right, bottom: box.bottom, shown: !!element.getClientRects().length,
      viewportWidth: innerWidth, viewportHeight: innerHeight }];
  })), selectors);
  for (const selector of selectors) {
    const box = boxes[selector];
    assert.ok(box?.shown && box.width > 0 && box.height > 0, `${label}: ${selector} is hidden`);
    assert.ok(box.x >= -1 && box.y >= -1 && box.right <= box.viewportWidth + 1 &&
      box.bottom <= box.viewportHeight + 1, `${label}: ${selector} outside viewport: ${JSON.stringify(box)}`);
  }
  return boxes;
}

async function screenshot(page, name) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const file = path.join(artifactDir, name + '.png');
  await page.screenshot({ path: file });
  return file;
}

function assertClean(result) {
  assert.deepEqual(result.errors, [], 'JavaScript errors');
  assert.deepEqual(result.failed, [], 'Failed application requests');
  if (process.env.TEST_FONT_CACHE) assert.deepEqual(result.fontFailures, [], 'Fixture font requests failed');
  else if (result.fontFailures.length) console.log('NOTE: external fonts unavailable; layout used fallback fonts.');
}

module.exports = { assert, baseURL, launch, newPage, visit, ready, range, inViewport, screenshot, assertClean };
