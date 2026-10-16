const { assert, baseURL, launch, newPage, visit, ready, assertClean, screenshot } = require('./browser-helpers.cjs');

(async () => {
  const browser = await launch();
  let page;
  try {
    const delayed = await newPage(browser, { reducedMotion: 'reduce' });
    page = delayed.page;
    let release, requested;
    const gate = new Promise(resolve => { release = resolve; });
    const requestSeen = new Promise(resolve => { requested = resolve; });
    await page.route('**/assets/research/venus-radar.jpg', async route => {
      requested();
      await gate;
      await route.continue();
    });
    await visit(page, 'venus');
    await page.locator('#venusSurface').click();
    await requestSeen;
    assert.equal(await page.locator('#venusSurface').getAttribute('aria-pressed'), 'false',
      'pending radar image must not replace available clouds');
    assert.equal(await page.locator('#venusSurface').isDisabled(), true);
    assert.equal(await page.locator('#venusClouds').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => { location.hash = '#earth'; });
    await ready(page);
    release();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#atlas').getAttribute('data-world'), 'earth');
    assert.match(await page.locator('#sceneCaption').textContent(), /^EARTH/);
    assert.equal(await page.locator('#assetStatus').textContent(), '');
    await visit(page, 'venus');
    assert.equal(await page.locator('#venusSurface').isDisabled(), false, 'stale request must not disable a later visit');
    assert.equal(await page.locator('#venusClouds').getAttribute('aria-pressed'), 'true');
    await page.locator('#venusSurface').click();
    await page.waitForFunction(() => document.querySelector('#venusSurface').getAttribute('aria-pressed') === 'true');
    assert.equal(await page.locator('#venusRadarCredit').isVisible(), true);
    await page.locator('#venusSurface').click();
    assert.equal(await page.locator('#venusSurface').getAttribute('aria-pressed'), 'true', 'selected view is idempotent');
    await page.locator('#venusOrdinary').click();
    assert.equal(await page.locator('#venusOrdinary').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#venusRadarCredit').isVisible(), false);
    assertClean(delayed);
    await page.close();
    console.log('PASS delayed radar request, route race, revisit, and mutually exclusive view controls');

    const recovery = await newPage(browser, { reducedMotion: 'reduce' });
    page = recovery.page;
    let attempts = 0;
    await page.route('**/assets/research/venus-radar.jpg', route => ++attempts === 1 ?
      route.fulfill({ status: 503, contentType: 'text/plain', body: 'Test fixture: temporary image failure' }) : route.continue());
    await visit(page, 'venus');
    await page.locator('#venusSurface').click();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('could not load'));
    assert.equal(await page.locator('#venusSurface').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#venusSurface').isDisabled(), false);
    assert.equal(await page.locator('#venusClouds').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#fallbackPlanet').isVisible(), false);
    assert.equal(await page.locator('#playButton').isDisabled(), false, 'optional radar failure must preserve the working globe');
    await page.locator('#venusSurface').click();
    await page.waitForFunction(() => document.querySelector('#venusSurface').getAttribute('aria-pressed') === 'true');
    assert.equal(attempts, 2, 'failed optional imagery must be retryable');
    assert.deepEqual(recovery.failed.filter(message => !message.startsWith('503 ') || !message.includes('/venus-radar.jpg')), []);
    recovery.failed.length = 0; // The controlled 503 above is the expected failure under test.
    assertClean(recovery);
    await page.close();
    console.log('PASS optional radar failure keeps clouds usable and recovers on retry');

    const imagery = await newPage(browser, { reducedMotion: 'reduce' });
    page = imagery.page;
    let earthAttempts = 0;
    await page.route('**/assets/research/earth-nasa-5400.jpg', route => ++earthAttempts === 1 ?
      route.fulfill({ status: 503, contentType: 'text/plain', body: 'Test fixture: temporary map failure' }) : route.continue());
    await page.goto(baseURL + '#earth', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('#fallbackPlanet').hidden &&
      !document.querySelector('#scene').classList.contains('is-loading'));
    assert.equal(await page.locator('#scene').getAttribute('aria-busy'), 'false');
    assert.equal(await page.locator('#playButton').isDisabled(), true);
    await visit(page, 'orrery');
    assert.equal(await page.locator('#orreryCanvas').isVisible(), true, 'close-up fallback must not hide another working renderer');
    await visit(page, 'earth');
    assert.equal(earthAttempts, 2);
    assert.equal(await page.locator('#fallbackPlanet').isVisible(), false);
    assert.equal(await page.locator('#playButton').isDisabled(), false);
    assert.deepEqual(imagery.failed.filter(message => !message.startsWith('503 ') || !message.includes('/earth-nasa-5400.jpg')), []);
    imagery.failed.length = 0;
    assertClean(imagery);
    await page.close();
    console.log('PASS failed close-up image shows a still, keeps orrery visible, and retries successfully');

    const unavailable = await newPage(browser, { reducedMotion: 'reduce' });
    page = unavailable.page;
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return this.id === 'universe' && kind === 'webgl2' ? null : original.call(this, kind, ...args);
      };
    });
    await page.goto(baseURL + '#earth', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('#fallbackPlanet').hidden &&
      !document.querySelector('#scene').classList.contains('is-loading'));
    assert.equal(await page.locator('#scene').getAttribute('aria-busy'), 'false');
    assert.equal(await page.locator('#fallbackPlanet').isVisible(), true);
    assert.equal(await page.locator('#playButton').isDisabled(), true);
    await visit(page, 'orrery');
    assert.equal(await page.locator('#orreryCanvas').isVisible(), true);
    assertClean(unavailable);
    await page.close();
    console.log('PASS unavailable close-up WebGL ends loading and preserves the orbital renderer');

    const lost = await newPage(browser, { reducedMotion: 'reduce' });
    page = lost.page;
    await visit(page, 'earth');
    await page.evaluate(() => document.querySelector('#universe').getContext('webgl2')
      .getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => !document.querySelector('#fallbackPlanet').hidden);
    await page.evaluate(() => { location.hash = '#venus'; });
    await page.waitForFunction(() => document.querySelector('#atlas').dataset.world === 'venus' &&
      !document.querySelector('#scene').classList.contains('is-loading'));
    assert.equal(await page.locator('#fallbackPlanet').isVisible(), true);
    assert.equal(await page.locator('#scene').getAttribute('aria-busy'), 'false');
    assert.equal(await page.locator('#playButton').isDisabled(), true);
    await page.reload();
    await ready(page);
    assert.equal(await page.locator('#fallbackPlanet').isVisible(), false);
    assertClean(lost);
    await page.close();
    console.log('PASS a lost graphics context stays in fallback across routes and reload restores rendering');
  } catch (error) {
    if (page && !page.isClosed()) console.error('Failure screenshot:', await screenshot(page, 'asset-race-failure').catch(() => 'unavailable'));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
