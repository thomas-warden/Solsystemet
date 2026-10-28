const { assert, baseURL, launch, newPage, visit, ready, screenshot, assertClean } = require('./browser-helpers.cjs');
const fs = require('node:fs'), path = require('node:path');

async function instrument(page) {
  // Capture the real module instance, without adding production test hooks.
  await page.route('**/moon-system.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + `
const tideTestShow=MoonSystem.prototype.show;
MoonSystem.prototype.show=function(...args){window.__tideScene=this;return tideTestShow.apply(this,args);};` });
  });
}
async function tideReady(page) {
  await page.waitForFunction(() => document.querySelector('#moonSystemView').dataset.tideReady === 'true' && window.__tideScene?.tideOcean);
}
async function settled(page) {
  await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const s = window.__tideScene;
    return s && !s.playing && !s.timeFlight && !s.solarFlight && !s.flight && !s.dirty && !s.modelDirty && !s.labelsMoving && s.skyReady === 1;
  });
}
async function navigate(page, hash) {
  await page.evaluate(hash => { location.hash = hash; }, hash); await ready(page);
}
async function preset(page, angle, expected, reduced = false) {
  const button = page.locator(`[data-tide-angle="${angle}"]`);
  await button.click();
  if (reduced) assert.equal(await page.evaluate(() => window.__tideScene.timeFlight), null, 'Reduced-motion preset is immediate');
  await page.waitForFunction(() => !window.__tideScene.timeFlight); await settled(page);
  assert(Math.abs(await page.evaluate(() => window.__tideScene.tideData.range) - expected) < 1e-8,
    `${angle}° produces the ideal ${expected} relative in-plane tide range`);
  assert.equal(await button.getAttribute('aria-current'), 'step');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tideAngle), String(angle), 'Preset preserves keyboard focus');
  assert.match(await page.locator('#tideStrength').getAttribute('aria-label'), new RegExp(expected.toFixed(2)));
}
async function projectedMoon(page, angle = 0) {
  return page.evaluate(angle => {
    const s = window.__tideScene, p = s.items.moon.mesh.position.clone();
    if (angle) p.applyAxisAngle(s.tideNormal, angle);
    p.project(s.camera); const r = document.querySelector('#moonCanvas').getBoundingClientRect();
    return { x: r.x + (p.x * .5 + .5) * r.width, y: r.y + (-p.y * .5 + .5) * r.height };
  }, angle);
}
async function moonHitTarget(page, occluded = false, tangential = false) {
  return page.evaluate(async ({ occluded, tangential }) => {
    const s = window.__tideScene, THREE = await import('./vendor/three.module.js');
    const moon = s.items.moon.mesh, earth = s.items.earth.mesh;
    if (occluded) {
      // A real camera position where Earth is directly in front of the Moon.
      s.flight = null; s.camera.position.copy(moon.position).normalize().multiplyScalar(-12);
      s.controls.target.set(0, 0, 0); s.controls.update(); s.dirty = true; s.frame(.02, performance.now());
    }
    const box = document.querySelector('#moonCanvas').getBoundingClientRect();
    const center = moon.position.clone().project(s.camera), globe = earth.position.clone().project(s.camera);
    const view = moon.position.clone().applyMatrix4(s.camera.matrixWorldInverse);
    const radius = moon.scale.x * box.height / (2 * Math.tan(s.camera.fov * Math.PI / 360)) / -view.z;
    const point = { x: box.x + (center.x * .5 + .5) * box.width, y: box.y + (-center.y * .5 + .5) * box.height };
    const offset = occluded ? 0 : radius * .85;
    if (!occluded) {
      const dx = (center.x - globe.x) * box.width, dy = -(center.y - globe.y) * box.height, length = Math.hypot(dx, dy);
      point.x += (tangential ? -dy : dx) / length * offset; point.y += (tangential ? dx : dy) / length * offset;
    }
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((point.x - box.x) / box.width * 2 - 1, 1 - (point.y - box.y) / box.height * 2), s.camera);
    let hit = ray.intersectObjects([earth, moon], true)[0]?.object;
    while (hit && !hit.userData.id) hit = hit.parent;
    return { point, radius, offset, days: s.days, firstHit: hit?.userData.id };
  }, { occluded, tangential });
}
async function beginDrag(page) {
  await settled(page); const point = await projectedMoon(page);
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  assert.equal(await page.evaluate(() => !!window.__tideScene.tideDrag), true, 'Pointer press on the visible Moon starts a water interaction');
  assert.equal(await page.evaluate(() => window.__tideScene.controls.enabled), false, 'Moon drag temporarily owns the pointer');
}
async function solarTransitions(page) {
  await preset(page, 0, 1.46);
  const lighting = await page.evaluate(() => ({ sun: window.__tideScene.sunDirection.toArray(), position: window.__tideScene.sunlight.position.toArray() }));
  await page.locator('#tideSun').click();
  await page.waitForFunction(() => window.__tideScene.solarMix > 0 && window.__tideScene.solarMix < 1);
  const reversal = await page.evaluate(() => {
    const s = window.__tideScene, before = s.solarMix, range = s.tideData.range, reading = document.querySelector('#tideStrength').textContent;
    document.querySelector('#tideSun').click();
    return { before, range, reading, after: s.solarMix, start: s.solarFlight.start };
  });
  assert.equal(reversal.after, reversal.before); assert.equal(reversal.start, reversal.before, 'Reversing the Sun transition starts from the current contribution');
  assert.notEqual(reversal.reading, 'Moon only', 'The readout does not claim Moon-only before the contribution reaches zero');
  assert(reversal.range > 1 && reversal.range < 1.46);
  await settled(page);
  assert.equal(await page.evaluate(() => window.__tideScene.solarMix), 1);
  await page.evaluate(() => {
    const s = window.__tideScene, original = s.tideOcean.setState, render = s.renderer.render; window.__solarSamples = []; window.__solarMidFrame = null;
    s.tideOcean.setState = function (...args) { const state = original.apply(this, args); window.__solarSamples.push({ mix: state.solarMix, range: state.range, uniform: this.uniforms.solarWeight.value }); return state; };
    s.renderer.render = function (...args) {
      const result = render.apply(this, args);
      if (!window.__solarMidFrame && s.solarMix > .35 && s.solarMix < .65) window.__solarMidFrame = {
        image: this.domElement.toDataURL('image/png'), mix: s.solarMix, range: s.tideData.range, uniform: s.tideOcean.uniforms.solarWeight.value,
      };
      return result;
    };
    window.__restoreSolarProbe = () => { s.tideOcean.setState = original; s.renderer.render = render; };
  });
  await page.locator('#tideSun').click(); await settled(page);
  const samples = await page.evaluate(() => { window.__restoreSolarProbe(); return window.__solarSamples; });
  const mid = await page.evaluate(() => window.__solarMidFrame);
  assert(mid && mid.mix > .35 && mid.mix < .65, 'Capture a real intermediate rendered water state');
  const directory = process.env.TEST_ARTIFACTS || '/tmp/solsystemet-regression'; fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'tides-sun-mid-frame.png'), Buffer.from(mid.image.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(directory, 'tides-sun-mid-frame.json'), JSON.stringify({ mix: mid.mix, range: mid.range, uniform: mid.uniform }, null, 2));
  assert(samples.filter(s => s.mix > 0 && s.mix < 1).length >= 2, 'Normal Sun switch renders intermediate contributions');
  for (const sample of samples) {
    assert(Math.abs(sample.uniform - .46 * sample.mix) < 1e-10, 'Water shader uses the actual eased contribution');
    assert(Math.abs(sample.range - (1 + .46 * sample.mix)) < 1e-8, 'The range follows the same eased contribution');
  }
  assert.equal(await page.locator('#tideStrength').textContent(), 'Moon only');
  assert.deepEqual(await page.evaluate(() => ({ sun: window.__tideScene.sunDirection.toArray(), position: window.__tideScene.sunlight.position.toArray() })), lighting, 'Removing tidal pull preserves sunlight and source direction');
  const frame = await page.evaluate(() => window.__tideScene.renderer.info.render.frame);
  await page.waitForTimeout(300); assert.equal(await page.evaluate(() => window.__tideScene.renderer.info.render.frame), frame, 'A settled solar transition returns to GPU idle');
  await page.locator('#tideSun').click();
  await page.waitForFunction(() => window.__tideScene.solarMix > 0 && window.__tideScene.solarMix < 1);
  await page.evaluate(() => {
    window.__solarPreferenceResult = null;
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => queueMicrotask(() => {
      const s = window.__tideScene; window.__solarPreferenceResult = { flight: s.solarFlight, mix: s.solarMix };
    }), { once: true });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => window.__solarPreferenceResult);
  assert.equal(await page.evaluate(() => window.__solarPreferenceResult.flight), null, 'The motion-preference event finishes a pending solar transition immediately');
  assert.equal(await page.evaluate(() => window.__solarPreferenceResult.mix), 1);
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await settled(page);
  await page.evaluate(() => {
    const spacer = document.createElement('div'); spacer.id = 'solarOffscreenFixture'; spacer.style.height = '200vh'; spacer.setAttribute('aria-hidden', 'true');
    document.querySelector('#moonSystemView').append(spacer); scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(() => document.querySelector('#moonCanvas').getBoundingClientRect().bottom < 0);
  await page.waitForFunction(() => { const frame = window.__tideScene.renderer.info.render.frame;
    if (window.__solarOffFrame !== frame) { window.__solarOffFrame = frame; window.__solarOffSince = performance.now(); return false; }
    return performance.now() - window.__solarOffSince > 250;
  });
  const offFrame = await page.evaluate(() => { document.querySelector('#tideSun').click(); return window.__tideScene.renderer.info.render.frame; });
  await page.waitForFunction(() => !window.__tideScene.solarFlight);
  assert.equal(await page.evaluate(() => window.__tideScene.renderer.info.render.frame), offFrame, 'Offscreen Sun transitions update state without GPU draws');
  assert.equal(await page.locator('#tideStrength').textContent(), 'Moon only');
  await page.evaluate(() => document.querySelector('#solarOffscreenFixture').remove()); await settled(page);
  await page.locator('#tideSun').click();
  await page.waitForFunction(() => window.__tideScene.solarFlight);
  await page.evaluate(() => { document.querySelector('#moonReset').click(); });
  assert.equal(await page.evaluate(() => window.__tideScene.solarFlight), null);
  assert.equal(await page.evaluate(() => window.__tideScene.solarMix), 1, 'Reset settles Sun pull at full strength');
  await page.locator('#moonPlay').click(); await settled(page);
  await page.evaluate(() => { document.querySelector('#tideSun').click(); location.hash = 'earth-moons/moon'; }); await ready(page);
  assert.equal(await page.evaluate(() => window.__tideScene.solarFlight), null, 'Changing experiment cancels the transition');
  assert.equal(await page.evaluate(() => window.__tideScene.solarMix), 0, 'Route departure settles at the requested endpoint');
  assert.equal(await page.evaluate(() => window.__tideScene.items.moon.phase), 1.1, 'Same-face restores its original model phase');
  await navigate(page, 'earth-moons/tides'); await tideReady(page);
  assert.equal(await page.evaluate(() => window.__tideScene.items.moon.phase), 0);
  await page.locator('#moonPlay').click(); await settled(page);
  await page.locator('#tideSun').click(); await settled(page);
}
async function dragPrecision(page) {
  await page.locator('#moonTop').click(); await settled(page);
  const limb = await moonHitTarget(page, false, true);
  assert.equal(limb.firstHit, 'moon');
  await page.mouse.move(limb.point.x, limb.point.y); await page.mouse.down();
  await page.mouse.move(limb.point.x + 1, limb.point.y + 1); await page.mouse.up(); await settled(page);
  const limbDelta = await page.evaluate(start => Math.atan2(Math.sin((window.__tideScene.days - start) / 27.322 * Math.PI * 2), Math.cos((window.__tideScene.days - start) / 27.322 * Math.PI * 2)) * 180 / Math.PI, limb.days);
  assert(Math.abs(limbDelta) < 1, 'A one-pixel limb drag preserves its grab offset instead of snapping the Moon center under the pointer');
  for (const elevation of [-1, 0, 1]) {
    const start = await page.evaluate(elevation => {
      const s = window.__tideScene, n = s.tideNormal; s.days = 0; s.modelDirty = true; s.flight = null;
      const view = n.clone().set(0, 0, 1).addScaledVector(n, -n.z).normalize().multiplyScalar(Math.cos(elevation * Math.PI / 180)).addScaledVector(n, Math.sin(elevation * Math.PI / 180));
      s.camera.position.copy(view).multiplyScalar(13); s.controls.target.set(0, 0, 0); s.controls.update(); s.dirty = true; s.frame(.02, performance.now());
      const p = s.items.moon.mesh.position.clone().project(s.camera), r = document.querySelector('#moonCanvas').getBoundingClientRect();
      return { x: r.x + (p.x * .5 + .5) * r.width, y: r.y + (-p.y * .5 + .5) * r.height, width: r.width };
    }, elevation);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    assert.equal(await page.evaluate(() => window.__tideScene.tideDrag?.scrub), true, 'Near-edge view selects a fixed stable horizontal gesture');
    await page.mouse.move(start.x, start.y + 1);
    assert(Math.abs(await page.evaluate(() => window.__tideScene.days)) < 1e-9, 'A vertical pixel at edge-on does not teleport the Moon');
    for (const dx of [12, 24, 48, 0]) {
      await page.mouse.move(start.x + dx, start.y + 1);
      const delta = await page.evaluate(() => { const angle = window.__tideScene.days / 27.322 * Math.PI * 2; return Math.atan2(Math.sin(angle), Math.cos(angle)) * 180 / Math.PI; });
      assert(Math.abs(Math.abs(delta) - dx / start.width * 360) < 1e-7, 'Horizontal travel is continuous, reversible, and one orbit per canvas width');
    }
    assert.match(await page.locator('#tideFeedback').textContent(), /left or right/);
    await page.mouse.up(); assert.equal(await page.evaluate(() => window.__tideScene.controls.enabled), true);
  }
  await page.locator('#moonPerspective').click(); await settled(page);
}
function allowFailure(result, path) {
  assert(result.failed.some(message => message.startsWith('503 ') && message.includes(path)), 'The intended 503 fixture was exercised');
  assert.deepEqual(result.failed.filter(message => !message.includes(path)), [], 'No unrelated request failed');
  result.failed.length = 0; assertClean(result);
}
async function layout(page, viewport) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350); // Let route-entry transitions settle before measuring geometry.
  const selectors = ['#moonPlay', '#moonDay', '#tideSun', '[data-tide-angle="0"]', '[data-tide-angle="90"]', '[data-tide-angle="180"]'];
  const boxes = await page.evaluate(selectors => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    stage: document.querySelector('#moonStage').getBoundingClientRect().toJSON(),
    controls: selectors.map(selector => ({ selector, ...document.querySelector(selector).getBoundingClientRect().toJSON() })),
  }), selectors);
  assert.equal(boxes.overflow, false, 'No horizontal overflow');
  for (const box of boxes.controls) {
    assert(box.width >= 44 && box.height >= 44, box.selector + ' has a 44px touch target');
    assert(box.x >= -1 && box.right <= viewport.width + 1, box.selector + ' stays in horizontal bounds');
    if (viewport.width === 390) assert(box.top >= 0 && box.bottom <= viewport.height + 1, box.selector + ' fits the fresh phone arrival');
  }
  if (viewport.width === 390) assert(boxes.stage.bottom <= viewport.height + 1, 'A useful complete tide scene fits 390px arrival');
  if (viewport.height <= 568) assert(boxes.stage.height < viewport.height - 40, 'Short screens leave a strip for touch scrolling beside the canvas');
}

(async () => {
  const browser = await launch(); let page;
  try {
    const normal = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
    page = normal.page; await instrument(page); await visit(page, 'earth-moons/tides'); await tideReady(page);
    assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'true', 'Tides start with gentle motion');
    assert.equal(await page.evaluate(() => window.__tideScene.items.moon.phase), 0, 'Tide arrival starts with its readable phase');
    assert(Math.abs(await page.evaluate(() => window.__tideScene.camera.position.y / window.__tideScene.camera.position.length()) - .58) < 1e-8, 'Default Tide camera uses the higher teaching view');
    const day = await page.evaluate(() => window.__tideScene.days);
    await page.waitForFunction(day => window.__tideScene.days > day, day);
    await page.locator('#moonPlay').click(); await settled(page);
    await page.locator('[data-tide-angle="90"]').click();
    const trip = await page.evaluate(() => ({ trip: window.__tideScene.timeFlight, days: window.__tideScene.days }));
    assert(trip.trip && trip.trip.t < .8 && trip.trip.start !== trip.trip.end, 'Normal presets travel through intermediate positions');
    await page.waitForFunction(start => window.__tideScene.days !== start, trip.trip.start);
    await page.waitForFunction(() => !window.__tideScene.timeFlight); await settled(page);
    for (const [angle, expected] of [[0, 1.46], [90, .54], [180, 1.46]]) await preset(page, angle, expected);
    await screenshot(page, 'tides-desktop-opposite');
    await solarTransitions(page);
    await preset(page, 180, 1.46); await dragPrecision(page);
    await page.locator('#tideSun').click();
    for (const angle of [0, 90, 180]) await preset(page, angle, 1);
    assert.equal(await page.locator('#tideStrength').textContent(), 'Moon only');
    await page.locator('#tideSun').click(); await preset(page, 180, 1.46);
    // Deliberately enlarge the Moon beyond the old fixed 26px pickup radius.
    await page.locator('#moonCanvas').focus(); await page.keyboard.press('+'); await page.keyboard.press('+'); await settled(page);
    const limb = await moonHitTarget(page);
    assert.equal(limb.firstHit, 'moon'); assert(limb.offset > 26, 'This large visible limb exercises more than the old fixed-radius target');
    await page.mouse.move(limb.point.x, limb.point.y); await page.mouse.down();
    assert.equal(await page.evaluate(() => !!window.__tideScene.tideDrag), true, 'Every visible part of the Moon belongs to the Moon drag');
    assert.equal(await page.evaluate(() => window.__tideScene.controls.enabled), false);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => location.hash), '#earth-moons/tides', 'Grabbing the outer limb must not navigate to the close-up');
    const hiddenMoon = await moonHitTarget(page, true);
    assert.equal(hiddenMoon.firstHit, 'earth', 'The occlusion fixture really places Earth in front');
    const behindCamera = await page.evaluate(() => window.__tideScene.camera.position.toArray());
    await page.mouse.move(hiddenMoon.point.x, hiddenMoon.point.y); await page.mouse.down();
    assert.equal(await page.evaluate(() => window.__tideScene.tideDrag), null, 'A hidden Moon cannot capture a pointer on Earth');
    assert.equal(await page.evaluate(() => window.__tideScene.controls.enabled), true);
    await page.mouse.move(hiddenMoon.point.x + 40, hiddenMoon.point.y + 20, { steps: 8 }); await page.mouse.up(); await settled(page);
    assert.notDeepEqual(await page.evaluate(() => window.__tideScene.camera.position.toArray()), behindCamera, 'Dragging visible Earth still turns the camera when the Moon is behind it');
    assert.equal(await page.evaluate(() => location.hash), '#earth-moons/tides');
    await preset(page, 0, 1.46);
    await page.locator('#moonTop').click(); await settled(page);
    const before = await page.evaluate(() => ({ camera: window.__tideScene.camera.position.toArray(), moon: window.__tideScene.items.moon.mesh.position.toArray(), range: window.__tideScene.tideData.range }));
    await beginDrag(page); const destination = await projectedMoon(page, Math.PI / 2);
    await page.mouse.move(destination.x, destination.y, { steps: 12 }); await page.mouse.up(); await settled(page);
    const after = await page.evaluate(() => ({ camera: window.__tideScene.camera.position.toArray(), moon: window.__tideScene.items.moon.mesh.position.toArray(), range: window.__tideScene.tideData.range, enabled: window.__tideScene.controls.enabled, playing: window.__tideScene.playing, water: window.__tideScene.tideOcean.uniforms.moonDirection.value.toArray(), direction: window.__tideScene.items.moon.mesh.position.clone().normalize().toArray() }));
    assert.notDeepEqual(after.moon, before.moon, 'Real pointer drag moves the model Moon');
    assert(Math.abs(after.range - .54) < .002, 'Dragging a quarter orbit changes the water to the small-tide arrangement');
    // Prior OrbitControls input can leave subpixel damping below its change-event threshold.
    assert(Math.hypot(...after.camera.map((value, i) => value - before.camera[i])) < .001, 'Moon drag does not turn the camera');
    assert.deepEqual(after.water, after.direction, 'Rendered water uses the newly dragged Moon direction');
    assert.equal(after.enabled, true); assert.equal(after.playing, false);
    assert.equal(await page.evaluate(() => location.hash), '#earth-moons/tides', 'Releasing the Moon does not follow its close-up link');
    const frame = await page.evaluate(() => window.__tideScene.renderer.info.render.frame);
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.__tideScene.renderer.info.render.frame), frame, 'Settled paused water causes no GPU redraw');
    await page.locator('#moonCanvas').focus(); await page.keyboard.press('ArrowRight'); await settled(page);
    assert.notDeepEqual(await page.evaluate(() => window.__tideScene.camera.position.toArray()), after.camera, 'Keyboard still turns the camera');
    const space = await page.locator('#moonCanvas').boundingBox(), camera = await page.evaluate(() => window.__tideScene.camera.position.toArray());
    await page.mouse.move(space.x + space.width * .12, space.y + space.height * .65); await page.mouse.down();
    assert.equal(await page.evaluate(() => window.__tideScene.tideDrag), null, 'Dragging empty space belongs to the camera');
    await page.mouse.move(space.x + space.width * .20, space.y + space.height * .70, { steps: 8 }); await page.mouse.up(); await settled(page);
    assert.notDeepEqual(await page.evaluate(() => window.__tideScene.camera.position.toArray()), camera);
    await page.locator('#moonTop').click(); await settled(page);
    await beginDrag(page);
    await page.evaluate(() => document.querySelector('#moonCanvas').dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.__tideScene.tideDrag.id, isPrimary: true, bubbles: true })));
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__tideScene.tideDrag), null);
    assert.equal(await page.evaluate(() => window.__tideScene.controls.enabled), true, 'Pointer cancellation restores camera controls');
    await beginDrag(page); await navigate(page, 'earth-moons/moon'); await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__tideScene.controls.enabled), true, 'Leaving mid-drag restores camera controls');
    const orbit = await page.evaluate(() => ({ mode: window.__tideScene.tideMode, radius: window.__tideScene.items.moon.r, sun: window.__tideScene.sunDirection.toArray(), original: window.__tideScene.earthSunDirection.toArray(), water: window.__tideScene.tideOcean.object.visible }));
    assert.equal(orbit.mode, false); assert.equal(orbit.radius, 4.6); assert.equal(orbit.water, false); assert.deepEqual(orbit.sun, orbit.original);
    assert(await page.locator('#tideControls').isHidden()); assert(await page.locator('#moonCheckpoints').isVisible());
    await navigate(page, 'jupiter-moons/io');
    const initialGiant = await page.evaluate(() => ({ position: window.__tideScene.sunlight.position.toArray(), color: window.__tideScene.sunlight.color.getHex(), intensity: window.__tideScene.sunlight.intensity, fill: window.__tideScene.ambientLight.intensity }));
    await navigate(page, 'earth-moons/tides'); await tideReady(page); await page.locator('[data-tide-angle="180"]').click();
    await navigate(page, 'jupiter-moons/io');
    assert.equal(await page.evaluate(() => window.__tideScene.timeFlight), null, 'Leaving during travel cancels it');
    assert.deepEqual(await page.evaluate(() => ({ position: window.__tideScene.sunlight.position.toArray(), color: window.__tideScene.sunlight.color.getHex(), intensity: window.__tideScene.sunlight.intensity, fill: window.__tideScene.ambientLight.intensity })), initialGiant, 'Giant-family lighting is restored after tides');
    assert(await page.locator('#tideControls').isHidden()); assert(await page.locator('#tideSunCue').isHidden());
    assert.equal(await page.locator('#tideFeedback').textContent(), 'Move the Moon. Compare the daily change.');
    assertClean(normal); await page.close();
    console.log('PASS default motion, preset ranges, real Moon drag, camera input, cancellation, idle rendering and family restoration');

    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      const result = await newPage(browser, { viewport, reducedMotion: 'reduce' }); page = result.page;
      await instrument(page); await visit(page, 'earth-moons/tides'); await tideReady(page); await layout(page, viewport);
      assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'false');
      await page.locator('#tideSun').click();
      assert.equal(await page.evaluate(() => window.__tideScene.solarFlight), null);
      assert.equal(await page.evaluate(() => window.__tideScene.solarMix), 0);
      await page.locator('#tideSun').click();
      assert.equal(await page.evaluate(() => window.__tideScene.solarMix), 1);
      await screenshot(page, `tides-${viewport.width}-arrival`);
      for (const [angle, expected] of [[0, 1.46], [90, .54], [180, 1.46]]) await preset(page, angle, expected, true);
      const button = page.locator('[data-tide-angle="90"]'); await button.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.__tideScene.timeFlight), null);
      await settled(page); assert(Math.abs(await page.evaluate(() => window.__tideScene.tideData.range) - .54) < 1e-8);
      await page.locator('#moonReset').click(); await settled(page);
      assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'false', 'Reduced-motion reset remains paused');
      await page.locator('#moonDay').evaluate(element => { element.value = '1000'; element.dispatchEvent(new Event('input', { bubbles: true })); });
      assert.equal(await page.locator('#moonDay').inputValue(), '1000', 'The complete-orbit slider endpoint remains at the end');
      assert.equal(await page.locator('#moonDay').getAttribute('aria-valuetext'), '360 degrees around the model orbit');
      await page.locator('#moonPlay').click();
      await page.evaluate(() => {
        // The compact Tide page ends close to the scene. Extra fixture space
        // lets the real IntersectionObserver suspend a completely hidden canvas.
        const spacer = document.createElement('div'); spacer.style.height = '200vh';
        spacer.setAttribute('aria-hidden', 'true'); document.querySelector('#moonSystemView').append(spacer);
        scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForFunction(() => { const r = document.querySelector('#moonCanvas').getBoundingClientRect(); return r.bottom <= 0 || r.top >= innerHeight; });
      // Observe a stable renderer count after IntersectionObserver has delivered;
      // an arbitrary sleep before the baseline can race the last visible frame.
      await page.waitForFunction(() => { const s = window.__tideScene, frame = s.renderer.info.render.frame;
        if (window.__offFrame !== frame) { window.__offFrame = frame; window.__offSince = performance.now(); return false; }
        return performance.now() - window.__offSince > 300;
      });
      const offscreen = await page.evaluate(() => ({ frame: window.__tideScene.renderer.info.render.frame, days: window.__tideScene.days }));
      await page.waitForFunction(days => window.__tideScene.days > days, offscreen.days);
      assert.equal(await page.evaluate(() => window.__tideScene.renderer.info.render.frame), offscreen.frame, 'Offscreen clock advances without GPU draws');
      assertClean(result); await page.close(); console.log('PASS reduced motion, keyboard, touch target and offscreen checks', viewport.width);
    }

    for (const viewport of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
      const result = await newPage(browser, { viewport, reducedMotion: 'reduce' }); page = result.page;
      await instrument(page); await visit(page, 'earth-moons/tides'); await tideReady(page); await layout(page, viewport);
      for (const selector of ['#moonPlay', '#tideSun', '[data-tide-angle="0"]', '[data-tide-angle="90"]', '[data-tide-angle="180"]']) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        const box = await page.locator(selector).boundingBox();
        assert(box.y >= -1 && box.y + box.height <= viewport.height + 1, selector + ' is reachable at the tablet breakpoint');
      }
      await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
      const box = await page.locator('#moonCanvas').boundingBox();
      assert(Math.min(viewport.height, box.y + box.height) - Math.max(0, box.y) >= 200, 'Tablet scroll exposes a meaningful canvas area');
      await screenshot(page, `tides-${viewport.width}-tablet`);
      assertClean(result); await page.close(); console.log('PASS tablet breakpoint controls, canvas and overflow', viewport.width);
    }

    const recovery = await newPage(browser, { reducedMotion: 'reduce' }); page = recovery.page; await instrument(page);
    const moduleRequests = [];
    await page.route('**/tides.js*', route => {
      moduleRequests.push(route.request().url());
      return moduleRequests.length === 1 ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporary tide-module fixture' }) : route.continue();
    });
    await visit(page, 'earth-moons/tides'); await page.locator('#tideRetry').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#tideSun').isDisabled(), true); assert.match(await page.locator('#tideStatus').textContent(), /could not load/i);
    await page.locator('#tideRetry').click(); await tideReady(page); await settled(page);
    assert.equal(moduleRequests.length, 2); assert.notEqual(moduleRequests[0], moduleRequests[1], 'Retry bypasses cached failed module URL');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'moonCanvas');
    assert.equal(await page.locator('#tideRetry').isVisible(), false); await preset(page, 90, .54, true);
    allowFailure(recovery, '/tides.js'); await page.close();
    console.log('PASS optional tide module failure and explicit fresh-URL retry');

    const delayed = await newPage(browser, { reducedMotion: 'reduce' }); page = delayed.page; await instrument(page);
    let release, requested; const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { requested = resolve; });
    await page.route('**/tides.js*', async route => { requested(); await gate; return route.continue(); });
    await page.goto(baseURL + '#earth-moons/tides', { waitUntil: 'domcontentloaded' }); await seen;
    await navigate(page, 'saturn-moons/titan');
    const snapshot = () => page.evaluate(() => ({ parent: window.__tideScene.parent, mode: window.__tideScene.tideMode, title: document.querySelector('#moonSystemTitle').textContent, hash: location.hash, controls: document.querySelector('#tideControls').hidden }));
    const beforeRelease = await snapshot(); release();
    await page.waitForFunction(() => !!window.__tideScene.tideOcean);
    assert.deepEqual(await snapshot(), beforeRelease, 'Late tide-module completion leaves the active family and UI intact');
    assert.equal(await page.evaluate(() => window.__tideScene.tideOcean.object.visible), false);
    await navigate(page, 'earth-moons/tides'); await tideReady(page); await preset(page, 0, 1.46, true);
    assertClean(delayed); await page.close(); console.log('PASS delayed optional module respects rapid routes and remains reusable');

    const imagery = await newPage(browser, { reducedMotion: 'reduce' }); page = imagery.page; await instrument(page);
    let imageRequests = 0;
    await page.route('**/assets/research/moons/moon.jpg', route => ++imageRequests === 1 ?
      route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporary Moon texture fixture' }) : route.continue());
    await page.goto(baseURL + '#earth-moons/tides', { waitUntil: 'domcontentloaded' }); await tideReady(page);
    await page.locator('#moonRetry').waitFor({ state: 'visible' }); await page.waitForFunction(() => !document.querySelector('#moonRetry').disabled);
    await preset(page, 90, .54, true);
    await page.locator('#moonRetry').click(); await ready(page);
    assert.equal(await page.evaluate(() => !!window.__tideScene.items.moon.mesh.material.map), true);
    assert.equal(await page.evaluate(() => window.__tideScene.tideMode), true);
    assert.equal(await page.locator('#tideStrength').textContent(), 'Small');
    allowFailure(imagery, '/assets/research/moons/moon.jpg'); await page.close();
    console.log('PASS existing imagery recovery remains available inside Tide mode');
  } catch (error) {
    if (page && !page.isClosed()) console.error('Tide failure screenshot:', await screenshot(page, 'tides-failure').catch(() => 'unavailable'));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
