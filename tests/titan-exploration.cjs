const { assert, launch, newPage, visit, ready, inViewport, screenshot, assertClean } = require('./browser-helpers.cjs');

async function observeRenderer(page) {
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(item => item.name)
      .find(url => new URL(url).pathname.endsWith('/renderer.js'));
    const { PlanetRenderer } = await import(url), render = PlanetRenderer.prototype.render;
    PlanetRenderer.prototype.render = function (state) {
      window.__titanRenderer = this; window.__titanState = { ...state };
      return render.call(this, state);
    };
  });
  await page.locator('#universe').focus(); await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => !!window.__titanRenderer);
}

async function surfaceReady(page) {
  await page.waitForFunction(() => document.querySelector('#titanSurface').getAttribute('aria-pressed') === 'true' &&
    window.__titanState?.titanSurface === true);
}

(async () => {
  const browser = await launch(); let page;
  try {
    const result = await newPage(browser);
    page = result.page;
    await visit(page, 'titan');
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'true', 'Titan starts moving');
    await observeRenderer(page); // Deliberate keyboard input pauses the scene.
    const haze = await page.locator('#universe').screenshot();
    assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'true');
    await page.locator('#titanSurface').click(); await surfaceReady(page);
    assert.equal(haze.equals(await page.locator('#universe').screenshot()), false, 'surface changes rendered pixels');
    assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#titanViewDescription').textContent(), /reconstructed.*not a visible-light photograph/i);
    await page.locator('#titanSurface').click();
    assert.equal(await page.locator('#titanSurface').getAttribute('aria-pressed'), 'true', 'selected mode stays selected');
    await page.locator('#titanNorth').click();
    await page.waitForFunction(() => window.__titanState.angle === 55 && window.__titanState.lightPhase === .3);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'universe');
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'false', 'lake inspection holds still');
    assert.equal(await page.evaluate(() => window.__titanRenderer.gl.getError()), 0);
    await screenshot(page, 'titan-desktop-northern-lakes');
    await page.locator('#resetButton').click();
    assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'true', 'reset restores default motion');
    await page.waitForFunction(() => window.__titanState.running && window.__titanState.angle === 0);
    const spin = await page.evaluate(() => window.__titanState.spin);
    await page.waitForFunction(spin => Math.abs(window.__titanState.spin - spin) > .002, spin);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#playButton').getAttribute('aria-pressed') === 'false');
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'false');
    await page.locator('#resetButton').click();
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'false', 'reduced-motion reset stays paused');
    await visit(page, 'titan');
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'false', 'reduced-motion arrival stays paused');
    await observeRenderer(page);
    await page.locator('#titanSurface').click(); await surfaceReady(page);
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'false', 'changing view preserves pause');

    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport); await page.locator('#resetButton').click();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await inViewport(page, ['#worldTitle', '#scene'], 'Titan phone arrival');
      if (viewport.width === 390) await inViewport(page, ['#titanHaze', '#titanSurface'], 'Titan phone view choices');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await screenshot(page, `titan-${viewport.width}-haze`);
      await page.locator('#titanHaze').focus(); await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'titanSurface');
      await page.keyboard.press('Enter'); await surfaceReady(page);
      await page.locator('#titanNorth').click();
      await page.waitForFunction(() => window.__titanState.angle === 55);
      await inViewport(page, ['#scene'], 'Titan phone northern lakes');
      await screenshot(page, `titan-${viewport.width}-northern-lakes`);
    }
    await page.locator('#familyNav .family-system').click(); await ready(page);
    assert.equal(await page.locator('#visitMoon').getAttribute('href'), '#titan');
    await page.locator('#visitMoon').click(); await ready(page);
    assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#storyGrid h3').count(), 3);
    assert.equal(await page.locator('#titanSourceCredit').getAttribute('href'), 'sources.html#titan');
    assertClean(result); await page.close();
    console.log('PASS Titan rendered views, lake inspection, motion preferences, keyboard, phone layouts and Saturn return');

    const recovery = await newPage(browser, { reducedMotion: 'reduce' }); page = recovery.page;
    let attempts = 0;
    await page.route('**/assets/research/moons/titan-surface.jpg', route => ++attempts === 1 ?
      route.fulfill({ status: 503, contentType: 'text/plain', body: 'Controlled unavailable surface' }) : route.continue());
    await visit(page, 'titan'); await observeRenderer(page);
    assert.equal(attempts, 0, 'optional surface must not delay haze readiness');
    await page.locator('#titanSurface').click();
    await page.waitForFunction(() => document.querySelector('#titanViewStatus').textContent.includes('could not load'));
    assert.equal(await page.locator('#fallbackPlanet').isVisible(), false);
    assert.equal(await page.locator('#playButton').isDisabled(), false);
    assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#titanSurface').isDisabled(), false);
    await page.locator('#titanSurface').click(); await surfaceReady(page);
    assert.equal(attempts, 2);
    recovery.failed = recovery.failed.filter(message => !message.startsWith('503 ') || !message.includes('/titan-surface.jpg'));
    assertClean(recovery); await page.close();
    console.log('PASS optional Titan image failure preserves haze and retries');

    for (const cancellation of ['haze', 'reset', 'route', 'context-loss']) {
      const result = await newPage(browser, { reducedMotion: 'reduce' }); page = result.page;
      let release, requested;
      const gate = new Promise(resolve => { release = resolve; });
      const seen = new Promise(resolve => { requested = resolve; });
      await page.route('**/assets/research/moons/titan-surface.jpg', async route => { requested(); await gate; await route.continue(); });
      await visit(page, 'titan'); await observeRenderer(page);
      await page.locator('#titanSurface').click(); await seen;
      assert.equal(await page.locator('#titanSurface').isDisabled(), true);
      assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#playButton').isDisabled(), false);
      if (cancellation === 'haze') await page.locator('#titanHaze').click();
      if (cancellation === 'reset') await page.locator('#resetButton').click();
      if (cancellation === 'route') { await page.evaluate(() => { location.hash = '#venus'; }); await ready(page); }
      if (cancellation === 'context-loss') {
        await page.evaluate(() => window.__titanRenderer.gl.getExtension('WEBGL_lose_context').loseContext());
        await page.waitForFunction(() => document.querySelector('#playButton').disabled);
      }
      release();
      if (cancellation === 'context-loss') {
        await page.waitForFunction(() => document.querySelector('#titanViewStatus').textContent.includes('interactive view is unavailable'));
        assert.equal(await page.locator('#titanSurface').isDisabled(), true);
        assert.equal(await page.locator('#playButton').isDisabled(), true);
        assert.equal(await page.locator('#fallbackPlanet').isVisible(), true);
      } else {
        await page.waitForFunction(() => !!window.__titanRenderer.maps['titan-surface']);
        if (cancellation === 'route') {
          assert.equal(await page.locator('#atlas').getAttribute('data-world'), 'venus');
          assert.match(await page.locator('#sceneCaption').textContent(), /^VENUS/);
          await page.evaluate(() => { location.hash = '#titan'; }); await ready(page);
        }
        assert.equal(await page.locator('#titanHaze').getAttribute('aria-pressed'), 'true', 'obsolete completion must not change the chosen view');
        assert.equal(await page.locator('#titanViewStatus').textContent(), '');
        assert.equal(await page.locator('#titanSurface').isDisabled(), false);
        await page.locator('#titanSurface').click(); await surfaceReady(page);
      }
      assertClean(result); await page.close();
      console.log('PASS Titan pending surface: ' + cancellation);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error('Failure screenshot:', await screenshot(page, 'titan-failure').catch(() => 'unavailable'));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
