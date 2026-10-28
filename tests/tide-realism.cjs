const { assert, launch, newPage, visit, ready, range, screenshot, assertClean } = require('./browser-helpers.cjs');

// Observe real instances at their public lifecycle boundaries; no test hooks ship.
async function instrument(page) {
  for (const [file, type, method, property] of [
    ['moon-system', 'MoonSystem', 'show', '__realismScene'],
    ['tide-shore', 'TideShore', 'setState', '__realismShore'],
    ['tide-coast', 'TideCoast', 'render', '__realismCoast'],
  ]) await page.route(`**/${file}.js*`, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + `
const originalRealismMethod=${type}.prototype.${method};
${type}.prototype.${method}=function(...args){
 window.${property}=this;
 const result=originalRealismMethod.apply(this,args);
 ${type === 'TideCoast' ? 'if(this.loaded&&!this.disposed)window.__realismDraws=(window.__realismDraws||0)+1;' : ''}
 return result;
};` });
  });
}

async function create(browser, options) {
  const result = await newPage(browser, options);
  result.consoleErrors = [];
  result.page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  await instrument(result.page);
  return result;
}

async function shoreReady(page) {
  await page.waitForFunction(() => window.__realismShore && document.querySelector('#moonSystemView').dataset.learningReady === 'true');
}

async function detailReady(page) {
  await page.locator('#tideShore').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#tideShore').dataset.detail === 'ready');
  assert.equal(await page.locator('.tide-coast-canvas').count(), 1, 'Exactly one detailed coastal canvas');
}

async function snapshot(page) {
  return page.evaluate(() => {
    const shore = window.__realismShore, coast = shore.coast;
    return {
      phase: shore.phase, time: shore.waveTime, frames: shore.frames, renders: shore.renders,
      draws: window.__realismDraws || 0, range: shore.range, playing: shore.playing,
      waterY: Number(shore.host.dataset.waterY), waterHeight: coast?.waterUniforms.waterHeight.value,
      orbitalDay: window.__realismScene.days,
      shaderTime: coast?.waterUniforms.time.value,
      high: coast?.projectLevel(250 - 64 * shore.range / 1.46),
      low: coast?.projectLevel(250 + 64 * shore.range / 1.46),
    };
  });
}

function clean(result, expectedFailure) {
  if (expectedFailure) {
    assert(result.failed.some(message => expectedFailure.test(message)), 'The intended resource failure occurred');
    result.failed = result.failed.filter(message => !expectedFailure.test(message));
  }
  assertClean(result);
  const errors = result.consoleErrors.filter(message => !/Failed to load resource: the server responded with a status of 503/.test(message));
  assert.deepEqual(errors, [], 'No shader, WebGL or console errors');
}

async function stationary(page, message) {
  await page.waitForTimeout(200);
  const before = await snapshot(page);
  await page.waitForTimeout(450);
  const after = await snapshot(page);
  for (const key of ['phase', 'time', 'draws']) assert.equal(after[key], before[key], `${message}: ${key} is stationary`);
}

async function tideRange(page, angle) {
  await page.locator(`[data-tide-angle="${angle}"]`).click();
  await page.waitForFunction(angle => document.querySelector(`[data-tide-angle="${angle}"]`).getAttribute('aria-current') === 'step', angle);
  await page.locator('#tideShore').scrollIntoViewIfNeeded();
}

async function desktopFlow(browser) {
  const result = await create(browser, { viewport: { width: 1440, height: 804 }, reducedMotion: 'reduce' });
  const { page } = result;
  let coastRequests = 0;
  page.on('request', request => { if (/\/tide-coast\.js/.test(request.url())) coastRequests++; });
  await visit(page, 'earth-moons/tides'); await shoreReady(page);
  assert.equal(await page.evaluate(() => window.__realismShore.visible), false, 'Coast begins below the first screen');
  assert.equal(coastRequests, 0, 'Detailed renderer is not fetched before its scene becomes visible');
  await detailReady(page); await tideRange(page, 0);
  const heights = [];
  for (const phase of [0, 250, 500, 750, 1000]) {
    await range(page, '[data-shore-day]', phase);
    const state = await snapshot(page);
    heights.push(state.waterHeight);
    assert(Math.abs(state.waterHeight - (250 - state.waterY) / 80) < .00001, 'Rendered mean water agrees with the tide reading');
    for (const point of [state.high, state.low]) {
      assert(point.x > 0 && point.x < 1000 && point.y > 0 && point.y < 420, 'High/low contact remains inside the coastal composition');
    }
    if (phase <= 250) await screenshot(page, `coast-desktop-${phase === 0 ? 'low' : 'high'}`);
  }
  assert(Math.abs(heights[0] + .8) < 1e-7 && Math.abs(heights[1] - .8) < 1e-7, 'Aligned full excursion uses the original model amplitude');
  assert.equal(heights[0], heights[2]); assert.equal(heights[1], heights[3]); assert.equal(heights[0], heights[4]);
  await tideRange(page, 90); await range(page, '[data-shore-day]', 250);
  const neap = await snapshot(page);
  assert(Math.abs(neap.waterHeight / heights[1] - .54 / 1.46) < .00001, 'Coastal excursion preserves the actual spring/neap ratio');
  await screenshot(page, 'coast-desktop-neap');

  const slider = page.locator('[data-shore-day]');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  assert(Math.abs((await snapshot(page)).phase - .251) < 1e-7, 'Keyboard controls the same coast while paused');
  await stationary(page, 'Reduced motion / keyboard state');
  await page.locator('[data-shore-play]').click();
  const start = await snapshot(page);
  await page.waitForFunction(time => window.__realismShore.waveTime > time + .2, start.time);
  const moved = await snapshot(page);
  assert(moved.phase > start.phase && moved.draws > start.draws, 'Explicit Play advances the day and detailed drawing');
  assert.equal(moved.orbitalDay, start.orbitalDay, 'Wave/day motion never advances the monthly arrangement');
  assert.equal(moved.time, moved.shaderTime, 'Wave optics use the shared pauseable clock');
  await page.locator('[data-shore-play]').click(); await stationary(page, 'Explicit Pause');

  await page.locator('[data-shore-play]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => !window.__realismShore.visible && !window.__realismShore.raf);
  await stationary(page, 'Offscreen coast');
  await page.locator('#tideShore').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__realismShore.raf !== 0);
  // A controlled Page Visibility event tests the browser-hidden lifecycle path.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await stationary(page, 'Hidden document');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => window.__realismShore.raf !== 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => !window.__realismShore.motion.matches);
  await page.waitForTimeout(100);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !window.__realismShore.playing && !window.__realismShore.raf);
  await stationary(page, 'Live reduced-motion change');
  await page.evaluate(() => { location.hash = 'earth'; }); await ready(page);
  await stationary(page, 'Departed tide route');
  await page.evaluate(() => { location.hash = 'earth-moons/tides'; }); await ready(page); await detailReady(page);
  assert.equal(await page.locator('.tide-coast-canvas').count(), 1, 'Revisit reuses a single renderer');
  clean(result); await page.close();
  console.log('PASS detailed coast: lazy startup, actual tide range, keyboard, motion, pause, visibility and revisit');
}

async function responsive(browser) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 720 }, { width: 844, height: 390 }]) {
    const result = await create(browser, { viewport, reducedMotion: 'reduce' });
    const { page } = result;
    await visit(page, 'earth-moons/tides'); await shoreReady(page); await detailReady(page); await tideRange(page, 0);
    for (const phase of [0, 250]) {
      await range(page, '[data-shore-day]', phase);
      const labels = await page.locator('[data-shore-high] text, [data-shore-low] text').evaluateAll(elements => elements.map(element => {
        const label = element.getBoundingClientRect(), scene = element.closest('.tide-shore-scene').getBoundingClientRect();
        return { left: label.left - scene.left, right: scene.right - label.right, top: label.top - scene.top, bottom: scene.bottom - label.bottom };
      }));
      labels.forEach(label => Object.values(label).forEach(clearance => assert(clearance >= -1, 'Every water-level label fits its phone scene')));
      await screenshot(page, `coast-${viewport.width}-${phase === 0 ? 'low' : 'high'}`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
    const slider = await page.locator('[data-shore-day]').boundingBox();
    assert(slider.height >= 44, 'The day slider retains a touch-size target');
    clean(result); await page.close();
    console.log(`PASS detailed coast composition and controls at ${viewport.width}×${viewport.height}`);
  }
}

async function recover(browser, resource) {
  const result = await create(browser, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const { page } = result;
  let block = true;
  const pattern = resource === 'module' ? '**/tide-coast.js*' : '**/shore-water.webp*';
  await page.route(pattern, route => block ? route.fulfill({ status: 503, body: 'Deliberate unavailable detail' }) : route.fallback());
  await visit(page, 'earth-moons/tides'); await shoreReady(page);
  await page.locator('#tideShore').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#tideShore').dataset.detail === 'fallback');
  assert.equal(await page.locator('[data-shore-fallback]').isVisible(), true, 'A failed detailed scene preserves the illustrated tide');
  await range(page, '[data-shore-day]', 250);
  assert((await snapshot(page)).waterY < 250, 'Fallback still responds to the tidal day');
  await screenshot(page, `coast-fallback-${resource}`);
  block = false;
  await page.locator('[data-shore-retry]').click(); await detailReady(page);
  assert.equal(await page.locator('[data-shore-retry]').isVisible(), false, 'Successful retry clears recovery control');
  assert.equal(await page.locator('[data-shore-fallback]').isVisible(), false, 'Ready detail replaces the fallback artwork');
  clean(result, resource === 'module' ? /tide-coast\.js/ : /shore-water\.webp/);
  await page.close(); console.log(`PASS ${resource} failure, working fallback and explicit detail retry`);
}

async function lateNavigation(browser) {
  const result = await create(browser, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const { page } = result;
  let release, requested = false;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/shore-water.webp*', async route => { requested = true; await gate; await route.continue(); });
  await visit(page, 'earth-moons/tides'); await shoreReady(page);
  await page.locator('#tideShore').scrollIntoViewIfNeeded();
  const deadline = Date.now() + 60000;
  while (!requested && Date.now() < deadline) await page.waitForTimeout(30);
  assert(requested, 'The delayed water texture was requested');
  await page.evaluate(() => { location.hash = 'earth'; }); await ready(page); release();
  await page.waitForFunction(() => !window.__realismShore.coastPending);
  assert.equal(await page.locator('.tide-coast-canvas').count(), 0, 'A late scene cannot retain a renderer on a departed route');
  await stationary(page, 'Late asset on departed route');
  await page.evaluate(() => { location.hash = 'earth-moons/tides'; }); await ready(page); await detailReady(page);
  clean(result); await page.close(); console.log('PASS late asset resolution disposes the departed scene and revisit recovers');
}

async function contextRecovery(browser) {
  const result = await create(browser, { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const { page } = result;
  await visit(page, 'earth-moons/tides'); await shoreReady(page); await detailReady(page);
  await range(page, '[data-shore-day]', 250);
  await page.evaluate(() => {
    window.__lostCoast = window.__realismShore.coast;
    const extension = window.__lostCoast.renderer.getContext().getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('The test browser must support real WebGL context loss');
    extension.loseContext();
  });
  await page.waitForFunction(() => document.querySelector('#tideShore').dataset.detail === 'fallback');
  assert.equal(await page.evaluate(() => window.__lostCoast.disposed), true, 'Lost renderer releases its resources');
  assert.equal(await page.locator('.tide-coast-canvas').count(), 0, 'The lost canvas is removed');
  assert.equal(await page.locator('[data-shore-fallback]').isVisible(), true, 'A lost context restores the illustrated tide');
  await range(page, '[data-shore-day]', 0);
  assert((await snapshot(page)).waterY > 250, 'The restored illustration remains interactive');
  const labels = await page.locator('[data-shore-high] text, [data-shore-low] text').evaluateAll(elements => elements.map(element => {
    const label = element.getBoundingClientRect(), scene = element.closest('.tide-shore-scene').getBoundingClientRect();
    return { left: label.left - scene.left, right: scene.right - label.right, top: label.top - scene.top, bottom: scene.bottom - label.bottom };
  }));
  labels.forEach(label => Object.values(label).forEach(clearance => assert(clearance >= -1, 'Restored fallback labels retain phone framing')));
  await screenshot(page, 'coast-context-lost-fallback');
  await page.locator('[data-shore-retry]').click(); await detailReady(page);
  assert.equal(await page.evaluate(() => window.__realismShore.coast === window.__lostCoast), false, 'Retry creates a fresh renderer after real context loss');
  const state = await snapshot(page);
  assert(Math.abs(state.waterHeight - (250 - state.waterY) / 80) < .00001, 'Fresh renderer uses the currently selected tide');
  clean(result); await page.close(); console.log('PASS real GPU context loss, usable phone fallback and fresh renderer retry');
}

(async () => {
  const browser = await launch();
  try {
    await desktopFlow(browser); await responsive(browser);
    await recover(browser, 'module'); await recover(browser, 'texture');
    await lateNavigation(browser); await contextRecovery(browser);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
