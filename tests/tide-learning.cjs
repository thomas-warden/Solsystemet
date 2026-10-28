const { assert, launch, newPage, visit, ready, range, screenshot, assertClean } = require('./browser-helpers.cjs');

async function instrument(page) {
  // Observe the actual scene and learning modules without shipping test hooks.
  for (const [file, type, method, property] of [
    ['moon-system', 'MoonSystem', 'show', '__learningScene'],
    ['tide-shore', 'TideShore', 'setState', '__learningShore'],
    ['tide-guide', 'TideGuide', 'setState', '__learningGuide'],
  ]) await page.route(`**/${file}.js*`, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + `
const originalLearningMethod=${type}.prototype.${method};
${type}.prototype.${method}=function(...args){window.${property}=this;return originalLearningMethod.apply(this,args);};` });
  });
}

async function learningReady(page) {
  await page.waitForFunction(() => document.querySelector('#moonSystemView')?.dataset.tideReady === 'true' &&
    window.__learningScene?.tideOcean && window.__learningShore && window.__learningGuide);
}

async function settle(page) {
  await page.waitForFunction(() => {
    const scene = window.__learningScene;
    return scene && !scene.playing && !scene.timeFlight && !scene.solarFlight && !scene.flight;
  });
  await page.waitForTimeout(100);
}

async function pauseMain(page) {
  if (await page.locator('#moonPlay').getAttribute('aria-pressed') === 'true') await page.locator('#moonPlay').click();
  await settle(page);
}

async function preset(page, angle, expected) {
  await page.locator(`[data-tide-angle="${angle}"]`).click();
  await settle(page);
  await page.waitForFunction(value => Math.abs(window.__learningScene.tideData.range - value) < 1e-8, expected);
}

async function guideOpen(page) {
  const details = page.locator('#tideNotes');
  if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
  await page.locator('[data-guide-compare="0"]').waitFor({ state: 'visible' });
}

async function moonPoint(page, rotation = 0) {
  return page.evaluate(rotation => {
    const scene = window.__learningScene;
    const position = scene.items.moon.mesh.position.clone();
    if (rotation) position.applyAxisAngle(scene.tideNormal, rotation);
    position.project(scene.camera);
    const box = document.querySelector('#moonCanvas').getBoundingClientRect();
    return { x: box.x + (position.x * .5 + .5) * box.width, y: box.y + (-position.y * .5 + .5) * box.height };
  }, rotation);
}

async function dragQuarterOrbit(page) {
  await page.locator('#moonTop').click(); await settle(page);
  await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
  const start = await moonPoint(page), end = await moonPoint(page, Math.PI / 2);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  assert.equal(await page.evaluate(() => !!window.__learningScene.tideDrag), true, 'The real visible Moon owns the drag');
  await page.mouse.move(end.x, end.y, { steps: 16 }); await page.mouse.up(); await settle(page);
}

async function shoreReading(page) {
  return page.locator('.tide-shore').evaluate(host => ({
    phase: Number(host.dataset.phase), range: Number(host.dataset.range), waterY: Number(host.dataset.waterY),
    high: host.querySelector('[data-shore-high]').getAttribute('transform'),
    low: host.querySelector('[data-shore-low]').getAttribute('transform'),
    playing: host.dataset.playing,
  }));
}

async function shoreClock(page) {
  const play = page.locator('[data-shore-play]');
  await play.scrollIntoViewIfNeeded();
  if ((await shoreReading(page)).playing === 'true') await play.click();
  const orbitalDay = await page.evaluate(() => window.__learningScene.days);
  const heights = [];
  for (const value of [0, 250, 500, 750, 1000]) {
    await range(page, '[data-shore-day]', value);
    heights.push((await shoreReading(page)).waterY);
  }
  assert(heights[1] < heights[0] - 10, 'A quarter of the illustrative day visibly raises the water');
  assert(Math.abs(heights[0] - heights[2]) < .1 && Math.abs(heights[0] - heights[4]) < .1, 'Two low tides close the illustrative day');
  assert(Math.abs(heights[1] - heights[3]) < .1, 'Two high tides share the same model height');
  assert.equal(await page.evaluate(() => window.__learningScene.days), orbitalDay, 'Scrubbing a coastal day never advances the monthly Moon orbit');
  return heights;
}

async function flowDragAndCoast(page) {
  await preset(page, 0, 1.46);
  const spring = await shoreClock(page);
  await range(page, '[data-shore-day]', 250);
  await screenshot(page, 'tide-flow-2-spring-shore');
  await dragQuarterOrbit(page);
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('.tide-shore').dataset.range) - .54) < .003);
  const neap = await shoreClock(page);
  assert(Math.abs((spring[0] - spring[1]) / (neap[0] - neap[1]) - 1.46 / .54) < .025,
    'Dragging from aligned to right-angle changes the actual coastal excursion by the same model range ratio');
  await range(page, '[data-shore-day]', 250);
  await screenshot(page, 'tide-flow-2-neap-shore');
  console.log('PASS flow 2: actual Moon drag, linked coastal range and a separate two-tide day');
}

async function flowComparison(page) {
  await guideOpen(page);
  const ocean = page.locator('[data-guide-ocean]');
  const outlines = [];
  for (const [angle, expected] of [[0, 1.46], [90, .54], [0, 1.46]]) {
    const button = page.locator(`[data-guide-compare="${angle}"]`);
    await button.focus(); await page.keyboard.press('Enter'); await settle(page);
    await page.waitForFunction(value => Math.abs(window.__learningScene.tideData.range - value) < 1e-8, expected);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.guideCompare), String(angle), 'Guide comparison preserves keyboard focus');
    outlines.push(await ocean.getAttribute('d'));
  }
  assert.notEqual(outlines[0], outlines[1], 'The shared illustration visibly changes with the comparison');
  assert.equal(outlines[0], outlines[2], 'Returning to the same alignment restores the same fixed-scale contour');
  await screenshot(page, 'tide-flow-3-live-comparison');
  await page.locator('#tideSun').click(); await settle(page);
  for (const angle of [0, 90]) {
    await page.locator(`[data-guide-compare="${angle}"]`).click(); await settle(page);
    assert(Math.abs(await page.evaluate(() => window.__learningScene.tideData.range) - 1) < 1e-8, 'Without solar pull both arrangements have Moon-only range');
  }
  assert.match(await page.locator('[data-guide-comparison-copy]').textContent(), /Sun|Moon.only|same/i, 'The guide explains Moon-only behavior');
  await page.locator('#tideSun').click(); await settle(page);
  console.log('PASS flow 3: keyboard comparison drives the actual model and handles Sun-off state');
}

async function flowReplay(page) {
  await guideOpen(page);
  const observed = [];
  for (const step of [0, 1, 2, 0]) {
    const button = page.locator(`[data-guide-step="${step}"]`);
    await button.focus(); await page.keyboard.press('Enter');
    observed.push(await page.evaluate(() => window.__learningGuide.replayPosition));
    assert.equal(await page.evaluate(() => window.__learningGuide.playing), false, 'An explicit step is a stationary accessible explanation');
  }
  assert.deepEqual(observed, [0, 1, 2, 0]);
  await page.locator('[data-guide-step="2"]').click();
  await screenshot(page, 'tide-flow-4-relative-pull');
  const replay = page.locator('[data-guide-replay]');
  await replay.click();
  await page.waitForFunction(() => window.__learningGuide.playing && window.__learningGuide.replayPosition !== 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !window.__learningGuide.playing && !window.__learningGuide.raf);
  await replay.click();
  await page.waitForFunction(() => window.__learningGuide.playing, null, { timeout: 5000 });
  await page.locator('#tideNotes summary').click();
  await page.waitForFunction(() => !window.__learningGuide.raf);
  const position = await page.evaluate(() => window.__learningGuide.replayPosition);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__learningGuide.replayPosition), position, 'Closed explanations stop progressing');
  await page.evaluate(() => { location.hash = 'earth-moons/moon'; }); await ready(page);
  assert.equal(await page.evaluate(() => window.__learningGuide.raf), 0, 'Leaving tides cancels replay work');
  await page.evaluate(() => { location.hash = 'earth-moons/tides'; }); await ready(page); await learningReady(page);
  await pauseMain(page);
  console.log('PASS flow 4: stationary replay steps, reduced-motion preference and closed/route lifecycle');
}

async function flowArrival(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => scrollTo(0, 0));
  const stage = await page.locator('#moonStage').boundingBox();
  const consoleBox = await page.locator('#moonConsole').boundingBox();
  if (viewport.width <= 760) assert(stage.y < consoleBox.y, 'The mobile subject appears before the orbital controls');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Arrival has no horizontal overflow');
  const inspect = page.locator('#tideInspect');
  assert.equal(await inspect.getAttribute('aria-pressed'), 'false');
  const before = await page.evaluate(() => ({ radius: window.__learningScene.items.moon.r, camera: window.__learningScene.camera.position.length(), fit: window.__learningScene.distance() }));
  await inspect.focus(); await page.keyboard.press('Enter'); await settle(page);
  const after = await page.evaluate(() => ({ radius: window.__learningScene.items.moon.r, camera: window.__learningScene.camera.position.length(), playing: window.__learningScene.playing }));
  assert.equal(after.radius, before.radius, 'Inspection preserves the wider composed Moon orbit');
  assert(after.camera < before.camera * .8, 'Inspection gives the Earth and ocean materially more screen space');
  assert.equal(after.playing, false, 'Inspection holds the moving Moon for careful observation');
  assert.equal(await inspect.getAttribute('aria-pressed'), 'true');
  await screenshot(page, `tide-flow-1-${viewport.width}-inspect`);
  await inspect.click(); await settle(page);
  assert.equal(await inspect.getAttribute('aria-pressed'), 'false');
  assert(Math.abs(await page.evaluate(() => window.__learningScene.camera.position.length()) - before.fit) < .01, 'Whole orbit restores the current fitted framing');
  for (const selector of ['#tideInspect', '#moonPlay', '#moonDay', '#tideSun']) {
    const box = await page.locator(selector).boundingBox();
    assert(box.width >= 44 && box.height >= 44, selector + ' has a comfortable touch target');
  }
  await page.evaluate(() => scrollTo(0, 0));
  await screenshot(page, `tide-flow-1-${viewport.width}-arrival`);
  console.log(`PASS flow 1: ${viewport.width}px arrival, keyboard inspection and preserved Moon spacing`);
}

async function offscreenMoonInput(page) {
  // On a phone the time controls can remain visible after the canvas has left
  // the viewport. Stationary input must still update the linked illustrations.
  await preset(page, 0, 1.46);
  await page.evaluate(() => {
    const controls = document.querySelector('#moonConsole');
    scrollTo(0, controls.getBoundingClientRect().top + scrollY + 1);
  });
  await page.locator('#moonDay').focus();
  // Layout moves synchronously, but the app's visibility observer is delivered
  // at the browser's rendering checkpoint. Wait for that same real observation
  // before testing offscreen input, rather than racing a final visible frame.
  await page.locator('#moonCanvas').evaluate(element => new Promise(resolve => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => !entry.isIntersecting)) { observer.disconnect(); resolve(); }
    }, { threshold: 0 });
    observer.observe(element);
  }));
  assert(await page.locator('#moonCanvas').evaluate(element => element.getBoundingClientRect().bottom <= 0), 'This input occurs with the orbital canvas offscreen');
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.__learningScene.days === 0);
  const state = await page.evaluate(() => {
    const scene = window.__learningScene, { moonAngle, sunAngle, solarMix } = scene.tideLearningState();
    const q = .46 * solarMix;
    return { range: scene.tideData.range, expected: Math.sqrt(1 + q * q + 2 * q * Math.cos(2 * (moonAngle - sunAngle))), dirty: scene.modelDirty };
  });
  assert(Math.abs(state.range - state.expected) < 1e-8, 'Offscreen keyboard input updates the actual tide range immediately');
  assert(state.dirty, 'The unseen orbital meshes remain marked for a redraw when they return');
  await guideOpen(page); await page.locator('[data-guide-compare="90"]').click(); await settle(page);
  assert(Math.abs(await page.evaluate(() => window.__learningScene.tideData.range) - .54) < 1e-8, 'Reduced-motion comparison synchronizes state while the canvas remains offscreen');
  console.log('PASS paused offscreen Moon input and reduced-motion comparison keep the linked range current');
}

async function discoveryCount(page) {
  return Number(await page.locator('#tideDiscovery').getAttribute('data-found'));
}

async function flowDiscovery(page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#moonReset').click();
  await page.locator('#tideChallengeStart').click(); await settle(page);
  assert.equal(await discoveryCount(page), 0);
  await page.locator('#moonPlay').click();
  // Run the real caller-owned orbital clock through a whole month, without a
  // learner placing or checking the Moon. Decorative playback must never win.
  await page.evaluate(() => window.__learningScene.advanceOffscreen(27.322 / .45, performance.now()));
  assert.equal(await discoveryCount(page), 0, 'A whole passive orbit cannot complete the discovery');
  await preset(page, 0, 1.46);
  assert.equal(await discoveryCount(page), 0, 'Choosing a preset alone does not claim discovery');
  await page.locator('#tideSun').click(); await settle(page);
  const check = page.locator('#tideChallengeCheck');
  if (!await check.isDisabled()) await check.click();
  assert.equal(await discoveryCount(page), 0, 'Moon-only range is not accepted as a Sun–Moon spring alignment');
  await page.locator('#tideSun').click(); await settle(page);
  await check.click();
  assert.equal(await discoveryCount(page), 1, 'Checking the actual same-side geometry records the first position');
  await check.click();
  assert.equal(await discoveryCount(page), 1, 'The same alignment never counts twice');
  await dragQuarterOrbit(page);
  await check.click();
  assert.equal(await discoveryCount(page), 1, 'Checking a right-angle placement gives feedback without completing');
  await dragQuarterOrbit(page);
  assert.equal(await discoveryCount(page), 1, 'Dragging into the other alignment still requires deliberate checking');
  await check.click();
  assert.equal(await discoveryCount(page), 2, 'The opposite alignment completes the two-position discovery');
  await screenshot(page, 'tide-flow-5-both-positions');
  await page.evaluate(() => { location.hash = 'earth-moons/moon'; }); await ready(page);
  await page.evaluate(() => { location.hash = 'earth-moons/tides'; }); await ready(page); await learningReady(page);
  assert.equal(await discoveryCount(page), 2, 'A route round-trip retains deliberate discoveries');
  await page.locator('#moonReset').click();
  assert.equal(await discoveryCount(page), 0, 'Reset clears discovery for a fresh attempt');
  await pauseMain(page);
  console.log('PASS flow 5: passive/preset motion cannot win, both actual alignments require deliberate checking');
}

async function smallerLayouts(browser) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const result = await newPage(browser, { viewport, reducedMotion: 'reduce' });
    const page = result.page;
    await instrument(page); await visit(page, 'earth-moons/tides'); await learningReady(page);
    await flowArrival(page, viewport);
    assert.equal(await page.evaluate(() => window.__learningShore.playing), false, 'Reduced motion starts the coast stationary');
    await page.locator('[data-shore-play]').scrollIntoViewIfNeeded();
    await range(page, '[data-shore-day]', 250);
    await screenshot(page, `tide-shore-${viewport.width}-high`);
    const day = await page.locator('[data-shore-day]').boundingBox();
    assert(day.height >= 44 && day.width >= 44, 'The daily coast slider has a 44px touch area');
    await page.locator('[data-shore-play]').click();
    await page.waitForFunction(() => window.__learningShore.phase > .25);
    await page.locator('[data-shore-play]').click();
    await guideOpen(page);
    await page.locator('[data-guide-compare="90"]').click(); await settle(page);
    assert(Math.abs(await page.evaluate(() => window.__learningScene.tideData.range) - .54) < 1e-8);
    await screenshot(page, `tide-guide-${viewport.width}-comparison`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'All learning sections fit horizontally');
    for (const selector of ['[data-guide-compare="0"]', '[data-guide-compare="90"]', '[data-guide-step="0"]', '[data-guide-step="1"]', '[data-guide-step="2"]', '[data-guide-replay]']) {
      const box = await page.locator(selector).boundingBox();
      assert(box.width >= 44 && box.height >= 44, selector + ' retains a comfortable touch target');
    }
    if (viewport.width === 390) await offscreenMoonInput(page);
    assertClean(result); await page.close();
    console.log(`PASS responsive learning controls and explicit reduced-motion Play at ${viewport.width}×${viewport.height}`);
  }
}

async function learningRecovery(browser) {
  const result = await newPage(browser, { reducedMotion: 'reduce' });
  const page = result.page;
  await instrument(page);
  let failedOnce = false;
  await page.route('**/tide-shore.js*', async route => {
    if (!failedOnce) { failedOnce = true; return route.fulfill({ status: 503, contentType: 'text/javascript', body: '// Intentional coastal illustration failure' }); }
    await route.fallback();
  });
  await visit(page, 'earth-moons/tides');
  await page.locator('#tideLearningRetry').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#tideShore').getAttribute('class'), 'tide-shore-host', 'An unavailable coastal module leaves its fallback intact');
  assert.match(await page.locator('#tideShore').textContent(), /Earth turns|coast/i);
  await preset(page, 0, 1.46);
  assert(await page.locator('#moonCanvas').isVisible(), 'The live orbital experiment remains usable after an illustration failure');
  await page.locator('#tideLearningRetry').click(); await learningReady(page);
  assert(await page.locator('#tideLearningRetry').isHidden());
  assert.equal(await page.locator('[data-shore-play]').count(), 1, 'Retry mounts one coastal controller');
  assert.equal(await page.locator('[data-guide-replay]').count(), 1, 'Retry does not duplicate the successful guide');
  assert(result.failed.some(message => message.startsWith('503 ') && message.includes('/tide-shore.js')), 'The intended import failure occurred');
  result.failed = result.failed.filter(message => !message.includes('/tide-shore.js'));
  assertClean(result); await page.close();
  console.log('PASS learning-module failure keeps the experiment usable and Retry restores one linked illustration');
}

async function lateLearningNavigation(browser) {
  const result = await newPage(browser, { reducedMotion: 'reduce' });
  const page = result.page;
  await instrument(page);
  let release, requested;
  const held = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  await page.route('**/tide-guide.js*', async route => { requested(); await held; await route.fallback(); });
  await visit(page, 'earth-moons/tides'); await started;
  await page.evaluate(() => { location.hash = 'earth-moons/moon'; }); await ready(page);
  release();
  await page.waitForFunction(() => !window.__learningScene.learningPromise);
  assert.equal(await page.evaluate(() => window.__learningScene.tideMode), false);
  assert.equal(await page.locator('[data-guide-replay]').count(), 0, 'A late import does not mount learning controls into a departed route');
  if (await page.evaluate(() => !!window.__learningShore)) {
    assert.equal(await page.evaluate(() => window.__learningShore.active), false, 'An already-loaded coastal scene is inactive away from tides');
    assert.equal(await page.evaluate(() => window.__learningShore.raf), 0);
  }
  await page.evaluate(() => { location.hash = 'earth-moons/tides'; }); await ready(page); await learningReady(page);
  assert.equal(await page.locator('[data-guide-replay]').count(), 1, 'Returning mounts the resolved guide once');
  await guideOpen(page); await page.locator('[data-guide-compare="90"]').click(); await settle(page);
  assert(Math.abs(await page.evaluate(() => window.__learningScene.tideData.range) - .54) < 1e-8, 'The resolved guide remains connected after returning');
  assertClean(result); await page.close();
  console.log('PASS late illustration response stays inactive after navigation and reconnects on return');
}

(async () => {
  const browser = await launch(); let page;
  try {
    const normal = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
    page = normal.page;
    await instrument(page); await visit(page, 'earth-moons/tides'); await learningReady(page);
    await flowArrival(page, { width: 1440, height: 1000 });
    await flowDragAndCoast(page);
    await flowComparison(page);
    await flowReplay(page);
    await flowDiscovery(page);
    assertClean(normal); await page.close(); page = null;
    await smallerLayouts(browser);
    await learningRecovery(browser);
    await lateLearningNavigation(browser);
  } catch (error) {
    if (page) await screenshot(page, 'tide-learning-failure').catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

