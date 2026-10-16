const {
  assert, launch, newPage, visit, ready, screenshot, assertClean,
} = require('./browser-helpers.cjs');

async function inspectScene(page, name, file, exported, method = 'frame') {
  await page.evaluate(async ({ name, file, exported, method }) => {
    const url = performance.getEntriesByType('resource').map(item => item.name)
      .find(url => new URL(url).pathname.endsWith('/' + file));
    const Class = (await import(url))[exported], original = Class.prototype[method];
    Class.prototype[method] = function (...args) {
      window.__testScenes ||= {};
      window.__testScenes[name] = this;
      if (name === 'planet') {
        window.__planetDraws = (window.__planetDraws || 0) + 1;
        window.__planetState = { ...args[0] };
      }
      return original.apply(this, args);
    };
  }, { name, file, exported, method });
}

async function frameCount(page, name) {
  return page.evaluate(name => name === 'planet' ? window.__planetDraws :
    window.__testScenes?.[name]?.renderer.info.render.frame, name);
}

async function settled(page, name) {
  let previous = -1, unchanged = 0;
  for (let attempt = 0; attempt < 60; attempt++) {
    const current = await frameCount(page, name);
    unchanged = current === previous && current !== undefined ? unchanged + 1 : 0;
    if (unchanged >= 3) return current;
    previous = current;
    await page.waitForTimeout(500);
  }
  throw new Error(`${name} keeps drawing while paused and settled`);
}

async function rotationDirection(page) {
  await page.locator('#universe').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__planetState?.world === document.querySelector('#atlas').dataset.world &&
    window.__planetState.running);
  const initial = await page.evaluate(() => {
    const renderer = window.__testScenes.planet;
    return renderer.gl.getUniform(renderer.program, renderer.locations.spin);
  });
  await page.waitForFunction(initial => {
    const renderer = window.__testScenes.planet;
    const delta = renderer.gl.getUniform(renderer.program, renderer.locations.spin) - initial;
    return Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) > .002;
  }, initial);
  return page.evaluate(initial => {
    const renderer = window.__testScenes.planet;
    const delta = renderer.gl.getUniform(renderer.program, renderer.locations.spin) - initial;
    return Math.sign(Math.atan2(Math.sin(delta), Math.cos(delta)));
  }, initial);
}

async function checkOrbitPause(page, route, name, file, exported, play, canvas, preset) {
  await visit(page, route);
  assert.equal(await page.locator(play).getAttribute('aria-pressed'), 'true', route + ' starts moving');
  await inspectScene(page, name, file, exported);
  await page.waitForFunction(name => !!window.__testScenes?.[name], name);
  await page.locator(play).click();
  const before = await settled(page, name);
  await page.waitForTimeout(700);
  assert.equal(await frameCount(page, name), before, route + ' should stop GPU rendering while settled');
  await page.locator(canvas).focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(({ name, before }) => window.__testScenes[name].renderer.info.render.frame > before,
    { name, before });
  await settled(page, name);
  if (preset) {
    const previous = await frameCount(page, name);
    await page.locator(preset).click();
    await page.waitForFunction(({ name, previous }) => window.__testScenes[name].renderer.info.render.frame > previous,
      { name, previous });
    await settled(page, name);
  }
  await page.locator(play).click();
  const stopped = await frameCount(page, name);
  await page.waitForFunction(({ name, stopped }) => window.__testScenes[name].renderer.info.render.frame > stopped,
    { name, stopped });
  console.log(`PASS ${route}: autoplay, settled pause, keyboard/preset redraw, and resume`);
}

(async () => {
  const browser = await launch();
  let page;
  try {
    const result = await newPage(browser, { viewport: { width: 1100, height: 900 } });
    page = result.page;
    await visit(page, 'venus');
    await inspectScene(page, 'planet', 'renderer.js', 'PlanetRenderer', 'render');
    await page.waitForFunction(() => !!window.__planetState);
    assert.equal(await page.locator('#venusClouds').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#venusSurface').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#sceneCaption').textContent(), /ENHANCED/);
    await page.locator('#playButton').click();
    await settled(page, 'planet');
    const enhanced = await page.locator('#universe').screenshot();
    await page.locator('#venusOrdinary').click();
    await page.waitForFunction(() => window.__planetState.venusEnhanced === false);
    assert.equal(await page.locator('#venusOrdinary').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#sceneCaption').textContent(), /ORDINARY/);
    const ordinary = await page.locator('#universe').screenshot();
    assert.notDeepEqual(enhanced, ordinary, 'enhanced and ordinary Venus must render distinct pixels');
    await page.locator('#venusSurface').click();
    await page.waitForFunction(() => document.querySelector('#venusSurface').getAttribute('aria-pressed') === 'true');
    await page.waitForFunction(() => window.__planetState.venusSurface === true);
    assert.equal(await page.evaluate(() => {
      const renderer = window.__testScenes.planet;
      return renderer.gl.getUniform(renderer.program, renderer.locations.venusSurface);
    }), 1, 'radar surface uniform should only enable with its texture ready');
    const radar = await page.locator('#universe').screenshot();
    assert.notDeepEqual(ordinary, radar, 'radar must render distinct ground, not ordinary clouds');
    assert.match(await page.locator('#modelNote').textContent(), /RADAR RECONSTRUCTION/);
    assert.doesNotMatch(await page.locator('#playLabel').textContent(), /cloud/i, 'radar view describes movement of the ground');
    await screenshot(page, 'venus-radar');
    await page.locator('#playButton').click();
    const venusDirection = await rotationDirection(page);
    await page.locator('#resetButton').click();
    assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#venusClouds').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#venusSurface').getAttribute('aria-pressed'), 'false');
    console.log('PASS Venus enhanced default, ordinary clouds, radar pixels/readiness, and reset');
    await visit(page, 'earth');
    const earthDirection = await rotationDirection(page);
    assert.equal(earthDirection, -1, 'Earth rotates eastward in the close-up coordinate convention');
    assert.equal(venusDirection, 1, 'Venus solid ground rotates opposite to Earth');
    console.log('PASS Earth and Venus solid surface rotate in opposite directions');

    const worlds = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
      'moon', 'io', 'europa', 'ganymede', 'callisto', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'];
    for (const world of worlds) {
      await visit(page, world);
      assert.equal(await page.locator('#atlas').getAttribute('data-world'), world);
      assert.equal(await page.locator('#playButton').getAttribute('aria-pressed'), 'true', world + ' starts moving');
      assert.equal(await page.locator('#fallbackPlanet').isVisible(), false, world + ' should use live rendering');
    }
    await page.locator('#playButton').click();
    await settled(page, 'planet');
    const pausedPlanet = await frameCount(page, 'planet');
    await page.locator('#universe').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(previous => window.__planetDraws > previous, pausedPlanet);
    console.log('PASS all 20 world routes and paused planet keyboard rendering');

    await checkOrbitPause(page, 'orrery/mercury', 'orrery', 'orrery.js', 'Orrery', '#orbitPlay', '#orreryCanvas', '#overheadView');
    const initial = await page.evaluate(() => {
      const scene = window.__testScenes.orrery;
      window.__testTrail = scene.trail.geometry.attributes.position;
      window.__testScore = document.querySelector('#orbitScoreboard svg');
      return Object.fromEntries(Object.entries(scene.orbits).map(([id, orbit]) => [id, orbit.geometry.attributes.position.version]));
    });
    await page.locator('#trueSpace').click();
    await page.waitForFunction(() => window.__testScenes.orrery.spacing === 1);
    assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(window.__testScenes.orrery.orbits)
      .map(([id, orbit]) => [id, orbit.geometry.attributes.position.version]))), initial);
    assert.equal(await page.evaluate(() => window.__testTrail === window.__testScenes.orrery.trail.geometry.attributes.position), true);
    assert.equal(await page.evaluate(() => window.__testScore === document.querySelector('#orbitScoreboard svg')), true);
    console.log('PASS orbital geometry, trail buffer, and scoreboard stay allocated across spacing and motion');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#oneYear').click();
    await page.locator('#orbitScoreboard').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: document.querySelector('#orbitScoreboard').getBoundingClientRect().top + scrollY, behavior: 'instant' }));
    await page.waitForTimeout(250);
    assert.ok(await page.locator('#orreryCanvas').evaluate(element => element.getBoundingClientRect().bottom <= 0),
      'offscreen counter check must actually move the scene out of view');
    const clockBefore = await page.evaluate(() => window.__testScenes.orrery.days);
    const offscreenFrames = await frameCount(page, 'orrery');
    await page.waitForTimeout(1500);
    const clockAfter = await page.evaluate(() => window.__testScenes.orrery.days);
    assert.ok(clockAfter > clockBefore,
      `the one-year experiment must continue while its trip counters are on screen: ${clockBefore}→${clockAfter} days in1500ms`);
    assert.equal(await frameCount(page, 'orrery'), offscreenFrames, 'offscreen simulation should not render invisible frames');
    console.log(`PASS one-year experiment advances ${clockBefore.toFixed(2)}→${clockAfter.toFixed(2)} days while offscreen GPU frames stay at ${offscreenFrames}`);
    await page.setViewportSize({ width: 1100, height: 900 });

    await checkOrbitPause(page, 'jupiter-moons/europa', 'moons', 'moon-system.js', 'MoonSystem', '#moonPlay', '#moonCanvas', '#moonTop');
    await checkOrbitPause(page, 'belt', 'belt', 'belt.js', 'BeltFlight', '#beltPlay', '#beltCanvas');
    for (const route of ['earth-moons/moon', 'saturn-moons/titan', 'explore', 'earth', 'orrery/venus', 'belt', 'venus']) {
      await visit(page, route);
      assert.equal(await page.locator('.is-loading:visible').count(), 0, route + ' finishes loading after route changes');
    }
    assertClean(result);
    console.log('PASS cross-scene navigation without errors');
    await page.close();

    const reduced = await newPage(browser, { reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    page = reduced.page;
    for (const [route, play, reset] of [
      ['explore', '#homeMotion'], ['earth', '#playButton', '#resetButton'],
      ['venus', '#playButton', '#resetButton'], ['europa', '#playButton', '#resetButton'],
      ['orrery', '#orbitPlay', '#resetOrbit'], ['earth-moons', '#moonPlay', '#moonReset'],
      ['jupiter-moons', '#moonPlay', '#moonReset'], ['saturn-moons', '#moonPlay', '#moonReset'],
      ['belt', '#beltPlay', '#beltRestart'],
    ]) {
      await visit(reduced.page, route);
      assert.equal(await reduced.page.locator(play).getAttribute('aria-pressed'), 'false', route + ' respects reduced motion');
      await reduced.page.locator(play).click();
      assert.equal(await reduced.page.locator(play).getAttribute('aria-pressed'), 'true', route + ' permits explicit play');
      if (reset) {
        await reduced.page.locator(reset).click();
        assert.equal(await reduced.page.locator(play).getAttribute('aria-pressed'), 'false', route + ' reset respects reduced motion');
      }
      assert.ok(await reduced.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' overflows mobile');
    }
    assertClean(reduced);
    await reduced.page.close();
    console.log('PASS reduced motion, explicit play, reset, and mobile route widths');
  } catch (error) {
    if (page) console.error('Failure screenshot:', await screenshot(page, 'scene-failure').catch(() => 'unavailable'));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
