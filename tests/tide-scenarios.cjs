const { assert, launch, newPage, visit, ready, range, screenshot, assertClean } = require('./browser-helpers.cjs');
const MEAN_SPRING = 1.46, MEAN_NEAP = .54, CLOSE = .95, KING = 1 / CLOSE ** 3 + .46;

async function instrument(page) {
  for (const [file, type, method, property] of [
    ['moon-system', 'MoonSystem', 'show', '__scenarioScene'],
    ['tide-shore', 'TideShore', 'setState', '__scenarioShore'],
  ]) await page.route(`**/${file}.js*`, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + `
const scenarioOriginal=${type}.prototype.${method};
${type}.prototype.${method}=function(...args){window.${property}=this;return scenarioOriginal.apply(this,args);};` });
  });
}
async function create(browser, options = {}) {
  const result = await newPage(browser, options); result.consoleErrors = [];
  result.page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
  await instrument(result.page); await visit(result.page, 'earth-moons/tides');
  await result.page.waitForFunction(() => window.__scenarioShore && document.querySelector('#moonSystemView').dataset.learningReady === 'true');
  return result;
}
async function coastVisible(page) {
  await page.locator('#tideShore').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__scenarioShore.visible && document.querySelector('#tideShore').dataset.detail === 'ready');
}
async function settled(page) {
  await page.waitForFunction(() => {
    const scene = window.__scenarioScene;
    return scene && !scene.timeFlight && !scene.lunarFlight && !scene.solarFlight && !scene.flight;
  });
}
async function read(page) {
  return page.evaluate(() => {
    const scene = window.__scenarioScene, shore = window.__scenarioShore, coast = shore.coast;
    return { distance: scene.moonDistanceRatio, radius: scene.items.moon.r,
      range: scene.tideData.range, lunarWeight: scene.tideData.lunarWeight,
      baseline: scene.tideOcean.baseline, sun: scene.solarMix,
      phase: shore.phase, playing: shore.playing, day: scene.days,
      water: coast?.waterUniforms.waterHeight.value,
      scenario: shore.host.dataset.scenario,
      camera: coast?.camera.position.toArray(), cameraTarget: coast?.target.toArray(),
      found: document.querySelector('#tideDiscovery').dataset.found,
      waveTime: shore.waveTime, frames: shore.frames,
    };
  });
}
async function select(page, kind, keyboard = false) {
  const button = page.locator(`[data-shore-tide="${kind}"]`);
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); }
  else await button.click();
  await settled(page); await coastVisible(page);
  await page.waitForFunction(kind => document.querySelector('#tideShore').dataset.scenario === kind, kind);
  assert.equal(await button.getAttribute('aria-pressed'), 'true', 'Actual arrangement selects its comparison');
  if (keyboard) assert.equal(await page.evaluate(() => document.activeElement.dataset.shoreTide), kind, 'Keyboard focus remains on the comparison');
  const state = await read(page), expected = kind === 'king' ? KING : kind === 'spring' ? MEAN_SPRING : MEAN_NEAP;
  assert(Math.abs(state.range - expected) < 1e-8, `${kind}: actual global tide uses the expected forcing`);
  assert.equal(state.sun, 1, 'Every named comparison includes the Sun');
  assert.equal(state.phase, .25, 'Comparisons hold the same high-water phase');
  assert.equal(state.playing, false, 'Comparison pauses the daily clock');
  assert(Math.abs(state.water - .8 * expected / MEAN_SPRING) < 1e-7, 'Detailed beach water uses the actual model range');
  assert(Math.abs(state.radius - 3.3 * state.distance) < 1e-9, 'Displayed Moon distance matches the selected distance ratio');
  return state;
}
function clean(result) { assertClean(result); assert.deepEqual(result.consoleErrors, [], 'No shader, WebGL or console errors'); }
async function dragQuarter(page) {
  await page.locator('#moonTop').click(); await settled(page);
  await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
  const points = await page.evaluate(() => {
    const scene = window.__scenarioScene, box = document.querySelector('#moonCanvas').getBoundingClientRect();
    return [0, Math.PI / 2].map(angle => {
      const p = scene.items.moon.mesh.position.clone().applyAxisAngle(scene.tideNormal, angle).project(scene.camera);
      return { x: box.x + (p.x * .5 + .5) * box.width, y: box.y + (-p.y * .5 + .5) * box.height };
    });
  });
  await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
  assert(await page.evaluate(() => !!window.__scenarioScene.tideDrag), 'The visible Moon owns the real drag');
  await page.mouse.move(points[1].x, points[1].y, { steps: 14 }); await page.mouse.up(); await settled(page);
}
async function desktop(browser) {
  const result = await create(browser, { reducedMotion: 'reduce', viewport: { width: 1385, height: 804 } });
  const p = result.page;
  assert.equal((await read(p)).playing, false, 'Reduced motion starts the beach stationary');
  await p.locator('#tideChallengeStart').click(); await coastVisible(p);
  const spring = await select(p, 'spring', true); await screenshot(p, 'scenario-desktop-spring');
  const king = await select(p, 'king', true); await screenshot(p, 'scenario-desktop-king');
  const neap = await select(p, 'neap', true); await screenshot(p, 'scenario-desktop-neap');
  assert(king.water > spring.water && spring.water > neap.water, 'King example, spring and neap have visibly ordered high-water heights');
  assert.equal(king.distance, CLOSE); assert.equal(spring.distance, 1); assert.equal(neap.distance, 1);
  assert.equal(king.baseline, spring.baseline); assert.equal(neap.baseline, spring.baseline);
  assert.deepEqual(king.camera, spring.camera); assert.deepEqual(neap.camera, spring.camera);
  assert.deepEqual(king.cameraTarget, spring.cameraTarget);
  assert.equal(neap.found, '0', 'Preset comparisons never award the active discovery challenge');
  await select(p, 'spring');
  await p.locator('[data-tide-angle="180"]').click(); await settled(p); await coastVisible(p);
  assert.equal((await read(p)).scenario, 'spring', 'Opposite-side full-Moon alignment also counts as spring tide');
  assert.match(await p.locator('[data-shore-scenario-note]').textContent(), /new and full Moon/);
  await select(p, 'king'); await p.locator('#tideSun').click(); await settled(p); await coastVisible(p);
  const moonOnly = await read(p);
  assert.equal(moonOnly.scenario, 'custom'); assert(Math.abs(moonOnly.range - 1 / CLOSE ** 3) < 1e-8);
  assert.match(await p.locator('[data-shore-cause]').textContent(), /Sun.*off.*closer Moon/i);
  assert.equal(await p.locator('[data-shore-tide][aria-pressed="true"]').count(), 0, 'Sun-off state does not retain a king label');
  await select(p, 'king'); await dragQuarter(p); await coastVisible(p);
  assert.equal((await read(p)).scenario, 'custom', 'Manual drag out of alignment clears the king example');
  assert.match(await p.locator('[data-shore-cause]').textContent(), /closer Moon.*Alignment/i);
  assert.equal(await p.locator('[data-shore-tide][aria-pressed="true"]').count(), 0);
  await select(p, 'king');
  const beforeDay = await read(p); await p.locator('[data-shore-play]').click();
  await p.waitForFunction(time => window.__scenarioShore.waveTime > time + .15, beforeDay.waveTime);
  await p.locator('[data-shore-play]').click(); const afterDay = await read(p);
  assert(afterDay.phase > beforeDay.phase); assert.equal(afterDay.day, beforeDay.day, 'Watching the day leaves the chosen monthly arrangement fixed');
  assert.equal(afterDay.distance, CLOSE); assert.equal(afterDay.found, '0');
  await p.evaluate(() => { location.hash = 'earth-moons/moon'; }); await ready(p);
  assert.equal(await p.evaluate(() => window.__scenarioScene.items.moon.r), 4.6, 'The normal Earth–Moon family restores its normal orbit radius');
  await p.evaluate(() => { location.hash = 'earth-moons/tides'; }); await ready(p); await coastVisible(p);
  assert.equal((await read(p)).distance, CLOSE, 'Returning retains the chosen closer-Moon experiment');
  await p.locator('#moonReset').click(); await settled(p); await coastVisible(p);
  const reset = await read(p);
  assert.equal(reset.distance, 1); assert.equal(reset.radius, 3.3); assert.equal(reset.phase, 0); assert.equal(reset.found, '0');
  clean(result); await p.close();
  console.log('PASS linked neap/spring/king high water, actual distance, manual changes, day clock, keyboard, discovery and route/reset');
}
async function transition(browser) {
  const result = await create(browser, { viewport: { width: 1385, height: 804 } }), p = result.page;
  await coastVisible(p); await select(p, 'spring');
  await p.locator('#moonCanvas').evaluate(element => new Promise(resolve => {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => !entry.isIntersecting)) { observer.disconnect(); resolve(); } });
    observer.observe(element);
  }));
  await p.evaluate(() => {
    window.__scenarioSamples = [];
    const collect = () => {
      const s = window.__scenarioScene;
      window.__scenarioSamples.push({ distance: s.moonDistanceRatio, range: s.tideData.range, phase: window.__scenarioShore.phase });
      if (s.lunarFlight || s.timeFlight || window.__scenarioSamples.length < 2) requestAnimationFrame(collect);
    };
    document.querySelector('[data-shore-tide="king"]').click(); requestAnimationFrame(collect);
  });
  await settled(p); await p.waitForFunction(() => document.querySelector('#tideShore').dataset.scenario === 'king');
  const samples = await p.evaluate(() => window.__scenarioSamples);
  assert(samples.some(s => s.distance > CLOSE + .0001 && s.distance < .9999), 'Normal motion has real intermediate Moon distances');
  for (let i = 0; i < samples.length; i++) {
    const state = samples[i];
    assert(Math.abs(state.range - (1 / state.distance ** 3 + .46)) < 1e-7, 'Every observed transition range uses the same intermediate Moon distance');
    assert.equal(state.phase, .25);
    if (i) assert(state.distance <= samples[i - 1].distance + 1e-9, 'The Moon approaches continuously without reversing');
  }
  await screenshot(p, 'scenario-normal-king');
  await select(p, 'spring'); await p.locator('[data-shore-tide="king"]').click();
  await p.emulateMedia({ reducedMotion: 'reduce' }); await settled(p);
  assert.equal((await read(p)).distance, CLOSE, 'A live reduced-motion preference settles the closer-Moon transition');
  clean(result); await p.close();
  console.log('PASS offscreen normal-motion Moon approach, synchronized intermediate forcing and live reduced-motion settlement');
}
async function layouts(browser) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 720 }, { width: 844, height: 390 }]) {
    const result = await create(browser, { viewport, reducedMotion: 'reduce' }), p = result.page;
    await coastVisible(p); const spring = await select(p, 'spring', true); const king = await select(p, 'king', true);
    assert(king.water > spring.water); await screenshot(p, `scenario-${viewport.width}-king`);
    for (const selector of ['[data-shore-tide="neap"]', '[data-shore-tide="spring"]', '[data-shore-tide="king"]', '[data-shore-day]', '[data-shore-play]']) {
      const box = await p.locator(selector).boundingBox();
      assert(box.width >= 44 && box.height >= 44, 'Comparison and day controls retain touch targets');
      assert(box.x >= -1 && box.x + box.width <= viewport.width + 1, 'Controls fit the screen width');
    }
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal page overflow');
    assert.match(await p.locator('[data-shore-scenario-note]').textContent(), /informal.*unusually high.*one way/i);
    assert.match(await p.locator('[data-shore-art] title').textContent(), /sand|beach/i);
    const start = await read(p); await p.locator('[data-shore-play]').click();
    await p.waitForFunction(phase => window.__scenarioShore.phase > phase, start.phase);
    await p.locator('[data-shore-play]').click(); assert.equal((await read(p)).day, start.day);
    clean(result); await p.close(); console.log(`PASS sandy beach and comparison controls at ${viewport.width}×${viewport.height}`);
  }
}
(async () => { const browser = await launch(); try { await desktop(browser); await transition(browser); await layouts(browser); } finally { await browser.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
