const { assert, baseURL, launch, newPage, visit, ready, inViewport, screenshot, assertClean } = require('./browser-helpers.cjs');

(async () => {
  const browser = await launch();
  let page;
  try {
    const pending = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = pending.page;
    let release, requested;
    const gate = new Promise(resolve => { release = resolve; });
    const requestSeen = new Promise(resolve => { requested = resolve; });
    await page.route('**/assets/research/earth-nasa-5400.jpg', async route => {
      requested(); await gate; await route.continue();
    });
    await visit(page, 'missions');
    await page.locator('[data-start-mission="sunrise"]').click();
    await requestSeen;
    await page.waitForSelector('#missionLoading');
    assert.equal(await page.locator('#missionAction').isDisabled(), true);
    assert.equal(await page.locator('#citySelect').isDisabled(), true);
    assert.equal(await page.locator('#earthRotation').isDisabled(), true);
    assert.equal(await page.locator('#missionEnd').isDisabled(), false);
    await inViewport(page, ['#missionGuide', '#missionLoading', '#missionEnd'], 'loading mission explains its wait');
    await page.locator('#citySelect').dispatchEvent('change');
    await page.locator('#missionAction').dispatchEvent('click');
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '0',
      'input events received before graphics are ready must not skip a mission observation');
    await screenshot(page, 'mission-loading-guidance');
    release();
    await ready(page);
    await page.waitForFunction(() => document.querySelector('#missionAction') && !document.querySelector('#missionAction').disabled);
    assert.equal(await page.locator('#missionLoading').isVisible(), false);
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '0');
    await page.locator('#missionAction').click();
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '1');
    await page.locator('#missionEnd').click();
    assertClean(pending);
    await page.close();
    console.log('PASS delayed world explains loading, gates observations, then enables the mission when ready');

    const failed = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = failed.page;
    let attempts = 0;
    await page.route('**/assets/research/earth-nasa-5400.jpg', route => ++attempts === 1 ?
      route.fulfill({ status: 503, contentType: 'text/plain', body: 'Test fixture: temporary map failure' }) : route.continue());
    await visit(page, 'missions');
    await page.locator('[data-start-mission="sunrise"]').click();
    await page.waitForSelector('#missionUnavailable');
    assert.equal(await page.locator('#missionRetry').isDisabled(), false);
    assert.equal(await page.locator('#missionEnd').isDisabled(), false);
    assert.equal(await page.locator('#earthRotation').isDisabled(), true);
    await inViewport(page, ['#missionGuide', '#missionUnavailable', '#missionRetry'], 'failed mission offers a visible recovery');
    await page.locator('#missionRetry').click();
    await ready(page);
    await page.waitForFunction(() => document.querySelector('#missionAction') && !document.querySelector('#missionAction').disabled);
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '0');
    assert.equal(attempts, 2);
    await page.locator('#missionEnd').click();
    assert.equal(await page.locator('#missionGuide').isVisible(), false);
    assert.deepEqual(failed.failed.filter(message => !message.startsWith('503 ') || !message.includes('/earth-nasa-5400.jpg')), []);
    failed.failed.length = 0;
    assertClean(failed);
    await page.close();
    console.log('PASS missing imagery offers Retry and returns to the same unfinished mission');

    const unavailable = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = unavailable.page;
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return this.id === 'universe' && kind === 'webgl2' ? null : original.call(this, kind, ...args);
      };
    });
    await visit(page, 'missions');
    await page.locator('[data-start-mission="sunrise"]').click();
    await page.waitForSelector('#missionUnavailable');
    assert.equal(await page.locator('#missionLoading').isVisible(), false);
    assert.equal(await page.locator('#scene').getAttribute('aria-busy'), 'false');
    await page.locator('#missionEnd').click();
    assert.equal(await page.locator('#missionGuide').isVisible(), false);
    assertClean(unavailable);
    await page.close();
    console.log('PASS unavailable graphics gives an honest mission state and a working exit');

    const pendingOrbit = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = pendingOrbit.page;
    let releaseOrbit;
    const orbitGate = new Promise(resolve => { releaseOrbit = resolve; });
    await page.route('**/orrery.js*', async route => { await orbitGate; await route.continue(); });
    // Mission cards remain usable while the welcome scene's lazy module loads.
    await page.goto(baseURL + '#missions', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-start-mission="mercury"]').click();
    await page.waitForSelector('#missionLoading');
    for (const selector of ['#missionAction', '#oneYear', '#orbitDay', '#orbitPlay']) {
      assert.equal(await page.locator(selector).isDisabled(), true, selector + ' waits for the orbital simulation');
    }
    await page.locator('#oneYear').dispatchEvent('click');
    await page.locator('#missionAction').dispatchEvent('click');
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '0');
    releaseOrbit();
    await ready(page);
    await page.waitForFunction(() => document.querySelector('#missionAction') && !document.querySelector('#missionAction').disabled);
    for (const selector of ['#missionAction', '#oneYear', '#orbitDay', '#orbitPlay']) {
      assert.equal(await page.locator(selector).isDisabled(), false, selector + ' becomes usable after initialization');
    }
    await page.locator('#missionAction').click();
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '1');
    assertClean(pendingOrbit);
    await page.close();
    console.log('PASS delayed orbital initialization gates native controls and the race until ready');

    const failedOrbit = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = failedOrbit.page;
    let moduleAttempts = 0, failModule;
    const failureGate = new Promise(resolve => { failModule = resolve; });
    await page.route('**/orrery.js*', async route => {
      if (++moduleAttempts === 1) {
        await failureGate;
        await route.fulfill({ status: 503, contentType: 'text/javascript', body: '// Test fixture: temporary module failure' });
      } else await route.continue();
    });
    await page.goto(baseURL + '#missions', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-start-mission="mercury"]').click();
    await page.waitForSelector('#missionLoading');
    failModule();
    await page.waitForSelector('#missionUnavailable');
    assert.equal(await page.locator('#oneYear').isDisabled(), true);
    await page.locator('#missionRetry').click();
    await ready(page);
    await page.waitForFunction(() => document.querySelector('#missionAction') && !document.querySelector('#missionAction').disabled);
    assert.ok(moduleAttempts >= 2, 'retry must actually fetch a fresh module after an import failure');
    assert.equal(await page.locator('#atlas').getAttribute('data-mission'), 'mercury');
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '0');
    assert.equal(await page.locator('#oneYear').isDisabled(), false);
    assert.deepEqual(failedOrbit.failed.filter(message => !message.includes('/orrery.js')), []);
    failedOrbit.failed.length = 0;
    assertClean(failedOrbit);
    await page.close();
    console.log('PASS failed orbital module fetch retries successfully without losing the Mercury mission');
  } catch (error) {
    if (page && !page.isClosed()) console.error('Failure screenshot:', await screenshot(page, 'mission-readiness-failure').catch(() => 'unavailable'));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
