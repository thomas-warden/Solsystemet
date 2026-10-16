const { assert, launch, newPage, visit, ready, screenshot, assertClean } = require('./browser-helpers.cjs');

async function captureScene(page, moons = false) {
  await page.evaluate(async moons => {
    const filename = moons ? '/moon-system.js' : '/orrery.js';
    const url = performance.getEntriesByType('resource').map(item => item.name)
      .find(url => new URL(url).pathname.endsWith(filename));
    const module = await import(url), Scene = moons ? module.MoonSystem : module.Orrery;
    const original = Scene.prototype.frame;
    Scene.prototype.frame = function (...args) { window.__labelScene = this; return original.apply(this, args); };
  }, moons);
  await page.locator(moons ? '#moonCanvas' : '#orreryCanvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !!window.__labelScene);
}

// Exercise the real scene model and DOM layout at deterministic simulation times.
// Skip GPU draws during these long samples; this is a motion regression, not a
// measurement of frame rate on the browser's software renderer.
async function sampleMotion(page, { moons = false, focus = false, reduced = false, camera = false } = {}) {
  return page.evaluate(({ moons, focus, reduced, camera }) => {
    const scene = window.__labelScene, dt = moons ? 1 / 30 : 1 / 60;
    const duration = camera ? 0 : moons ? 80 : 365.256, speed = moons ? .25 : 20;
    const frames = camera ? 180 : Math.ceil(duration / (speed * dt));
    const labels = moons ? scene.labels : Object.entries(scene.labels).map(([id, label]) => ({ id, label, wire: scene.wires[id] }));
    const hidden = labels.map(entry => entry.label.hidden);
    labels.forEach(entry => { entry.label.hidden = false; });
    const entries = labels.map(entry => ({ ...entry, height: entry.label.offsetHeight, width: entry.label.offsetWidth,
      body: moons ? scene.items[entry.id].mesh : scene.meshes[entry.id].group }));
    labels.forEach((entry, index) => { entry.label.hidden = hidden[index]; });
    const canvas = scene.renderer.domElement;
    const stage = canvas.parentElement, canvasBox = canvas.getBoundingClientRect();
    const { width, height } = canvasBox;
    const toolbar = stage.querySelector('.orbit-toolbar').getBoundingClientRect(), key = stage.querySelector('.orbit-key').getBoundingClientRect();
    const bounds = { top: Math.max(8, toolbar.height ? toolbar.bottom - canvasBox.top + 8 : 8),
      bottom: Math.min(height - 8, key.height ? key.top - canvasBox.top - 8 : height - 8) };
    const draw = scene.renderer.render, active = scene.active, damping = scene.controls.enableDamping;
    scene.renderer.render = (model, camera) => { model.updateMatrixWorld(true); camera.updateMatrixWorld(true); };
    scene.active = true; scene.playing = false; scene.flight = null; scene.controls.enableDamping = false;
    scene.controls.update(); scene.measureLabelBounds();
    const tick = (days, frame) => { scene.days = days; scene.modelDirty = true; scene.frame(dt, frame * dt * 1000); };
    const read = entry => {
      const { body, label, wire } = entry, point = body.position.clone().project(scene.camera);
      const bx = (point.x * .5 + .5) * width, by = (-point.y * .5 + .5) * height;
      const depth = -body.position.clone().applyMatrix4(scene.camera.matrixWorldInverse).z;
      // Saturn's connector starts outside its rings rather than through them.
      const radius = body.scale.x * (entry.id === 'saturn' ? 2.27 : 1) * height /
        (2 * Math.tan(scene.camera.fov * Math.PI / 360) * depth);
      const matrix = new DOMMatrixReadOnly(label.style.transform || undefined);
      const wireMatrix = new DOMMatrixReadOnly(wire.style.transform || undefined);
      const alpha = label.hidden || label.style.visibility === 'hidden' ? 0 : Number(label.style.opacity || 1);
      const edge = Math.min(matrix.m41 - 8, width - 8 - matrix.m41 - entry.width,
        matrix.m42 - bounds.top, bounds.bottom - matrix.m42 - entry.height);
      return { alpha, edge, attachment: Math.hypot(matrix.m41 - bx - radius - 10, matrix.m42 + entry.height / 2 - by),
        wireError: Math.hypot(wireMatrix.m41 - bx - radius - 2, wireMatrix.m42 - by),
        wireLength: parseFloat(wire.style.width), verticalWire: Math.abs(wireMatrix.b) + Math.abs(wireMatrix.c),
        x: matrix.m41, y: matrix.m42, width: entry.width, height: entry.height,
        interactive: label.tabIndex >= 0 && label.style.pointerEvents !== 'none',
        focused: document.activeElement === label };
    };
    const result = { frames, shownSamples: 0, reappearances: 0, maxAttachmentError: 0, maxWireError: 0,
      maxWireLength: 0, maxVerticalWire: 0, maxFadeStep: 0, rapidReversals: [],
      invisibleTargets: 0, overlapsToolbar: 0, focusedHidden: 0, focusCollisions: 0, perBody: {} };
    try {
      for (let i = -90; i < 0; i++) tick(0, i);
      if (focus) {
        const entry = entries.find(entry => entry.id !== scene.selected && read(entry).alpha > .99);
        if (!entry) throw new Error('No visible unselected label to test keyboard focus');
        entry.label.focus({ preventScroll: true }); result.focusedId = entry.id;
      }
      const previous = {}, lastCrossing = {};
      for (let frame = 0; frame <= frames; frame++) {
        if (camera && frame === 0) scene.fly('top');
        if (camera && frame === 60) scene.fly('perspective');
        if (camera && frame === 120) { scene.select('neptune'); scene.follow('neptune'); }
        tick(frame / frames * duration, frame);
        const current = Object.fromEntries(entries.map(entry => [entry.id, read(entry)]));
        for (const { id } of entries) {
          const value = current[id], prior = previous[id];
          const body = result.perBody[id] ||= { shown: 0, crossings: 0 };
          if (value.alpha > .001) {
            result.shownSamples++; body.shown++;
            result.maxAttachmentError = Math.max(result.maxAttachmentError, value.attachment);
            result.maxWireError = Math.max(result.maxWireError, value.wireError);
            result.maxWireLength = Math.max(result.maxWireLength, value.wireLength);
            result.maxVerticalWire = Math.max(result.maxVerticalWire, value.verticalWire);
            if (value.edge < -.1) result.overlapsToolbar++;
            if (prior?.alpha <= .001) result.reappearances++;
          } else if (value.interactive) result.invisibleTargets++;
          if (prior) {
            // A body leaving the viewport may hide immediately. Measure collision
            // fades only when both positions are safely inside the usable area.
            if (value.edge > 12 && prior.edge > 12) result.maxFadeStep = Math.max(result.maxFadeStep, Math.abs(value.alpha - prior.alpha));
            if ((value.alpha > .5) !== (prior.alpha > .5)) {
              body.crossings++;
              if (value.edge > 12 && prior.edge > 12 && lastCrossing[id] !== undefined &&
                (frame - lastCrossing[id]) * dt < .15 - 1e-6) result.rapidReversals.push({ id, day: scene.days });
              lastCrossing[id] = frame;
            }
          }
          if (id === result.focusedId && value.edge > 12) {
            if (!value.focused || value.alpha < .99 || !value.interactive) result.focusedHidden++;
            const selected = current[scene.selected];
            if (selected && value.x < selected.x + selected.width && value.x + value.width > selected.x &&
              value.y < selected.y + selected.height && value.y + value.height > selected.y) result.focusCollisions++;
          }
          previous[id] = value;
        }
      }
      for (let i = 0; i < 90; i++) tick(duration, frames + i);
      const settled = entries.map(entry => ({ transform: entry.label.style.transform, opacity: entry.label.style.opacity }));
      for (let i = 0; i < 30; i++) tick(duration, frames + 90 + i);
      result.stationary = JSON.stringify(settled) === JSON.stringify(entries.map(entry => ({ transform: entry.label.style.transform, opacity: entry.label.style.opacity })));
      result.pending = !!scene.labelsMoving;
      result.clickId = entries.find(entry => read(entry).alpha > .99 && read(entry).interactive)?.id;
    } finally {
      scene.renderer.render = draw; scene.active = active; scene.controls.enableDamping = damping;
      scene.dirty = true; scene.modelDirty = true;
    }
    return result;
  }, { moons, focus, reduced, camera });
}

function check(report, name, { reduced = false, focus = false, moons = false, camera = false } = {}) {
  console.log(name, JSON.stringify(report));
  assert.ok(report.shownSamples > report.frames, name + ': keep multiple useful labels visible');
  assert.ok(report.reappearances > 0, name + ': exercise labels returning after being hidden');
  assert.ok(report.maxAttachmentError < .1, name + ': every visible name stays directly attached to its projected body, including reappearance');
  assert.ok(report.maxWireError < .1 && report.maxWireLength <= 8.1 && report.maxVerticalWire < .001,
    name + ': connectors remain short and horizontal');
  assert.equal(report.overlapsToolbar, 0, name + ': visible names clear controls and scene edges');
  assert.equal(report.invisibleTargets, 0, name + ': invisible names cannot receive pointer or keyboard input');
  if (!reduced && !camera) {
    assert.ok(report.maxFadeStep <= (moons ? .23 : .12), name + ': crowding fades without abrupt opacity jumps');
    assert.deepEqual(report.rapidReversals, [], name + ': no repeated collision visibility changes within 150 ms');
  }
  assert.ok(report.stationary && !report.pending, name + ': a paused layout settles instead of drifting forever');
  if (focus) {
    assert.ok(report.focusCollisions > 0, name + ': the focused label actually crosses another label');
    assert.equal(report.focusedHidden, 0, name + ': keyboard focus survives crowding');
  }
}

async function keyboardFocusMotion(page) {
  const report = await page.evaluate(() => {
    const scene = window.__labelScene, draw = scene.renderer.render;
    scene.renderer.render = (model, camera) => { model.updateMatrixWorld(true); camera.updateMatrixWorld(true); };
    const step = count => { for (let i = 0; i < count; i++) scene.frame(1 / 60, i * 1000 / 60); };
    try {
      scene.days = 0; scene.playing = false; scene.modelDirty = true; step(90);
      const label = scene.labels.earth, canvas = scene.renderer.domElement;
      label.focus({ preventScroll: true }); scene.playing = true;
      const before = scene.days; step(120);
      const held = scene.days, focused = document.activeElement === label, stillPlaying = scene.playing;
      scene.advanceOffscreen(1, 3000); const heldOffscreen = scene.days;
      canvas.focus({ preventScroll: true }); step(60); const resumed = scene.days;
      scene.playing = false; label.focus({ preventScroll: true }); step(60);
      canvas.focus({ preventScroll: true }); step(60);
      return { before, held, heldOffscreen, resumed, paused: scene.days, focused, stillPlaying };
    } finally { scene.renderer.render = draw; scene.dirty = true; }
  });
  assert.ok(report.focused && report.stillPlaying, 'focusing a visible name preserves focus and the user’s play setting');
  assert.equal(report.held, report.before, 'keyboard focus holds the orbit clock so the target cannot drift away');
  assert.equal(report.heldOffscreen, report.before, 'offscreen advancement also respects keyboard focus');
  assert.ok(report.resumed > report.held, 'orbits resume when keyboard focus leaves the name');
  assert.equal(report.paused, report.resumed, 'focus and blur do not restart a manually paused scene');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForFunction(() => window.__labelScene.renderer.domElement.width > 1000);
  await page.evaluate(() => {
    const scene = window.__labelScene;
    scene.days = 220; scene.playing = false; scene.modelDirty = true;
  });
  const earth = page.locator('#orbitLabels [data-planet="earth"]');
  await earth.waitFor({ state: 'visible' }); await earth.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.activeElement === document.querySelector('#orreryCanvas'));
  assert.equal(await earth.isVisible(), false, 'resize fixture actually clips the focused name');
  console.log('PASS mobile keyboard focus holds/resumes time and resize transfers clipped focus to the canvas');
}

(async () => {
  const browser = await launch(); let page;
  try {
    const scenarios = [
      ['desktop system', { width: 1440, height: 1000 }, 'orrery/earth', {}],
      ['desktop home', { width: 1440, height: 1000 }, '', {}],
      ['phone system', { width: 390, height: 844 }, 'orrery/earth', {}],
      ['phone home', { width: 390, height: 844 }, '', {}],
      ['camera transitions', { width: 1440, height: 1000 }, 'orrery/earth', { camera: true }],
      ['keyboard focus', { width: 1440, height: 1000 }, 'orrery/earth', { focus: true }],
      ['reduced motion', { width: 390, height: 844 }, 'orrery/earth', { reduced: true }],
      ['Saturn moon cycle', { width: 1440, height: 1000 }, 'saturn-moons/iapetus', { moons: true }],
    ];
    for (const [name, viewport, route, options] of scenarios) {
      const result = await newPage(browser, { viewport, reducedMotion: options.reduced ? 'reduce' : 'no-preference' });
      page = result.page; await visit(page, route); await captureScene(page, options.moons);
      const report = await sampleMotion(page, options); check(report, name, options);
      if (options.focus) {
        await page.keyboard.press('Enter'); await ready(page);
        assert.equal(await page.locator('#atlas').getAttribute('data-world'), report.focusedId, 'Enter opens the focused world');
      } else if (name === 'phone home') {
        await page.locator(`#orbitLabels [data-planet="${report.clickId}"]`).click(); await ready(page);
        assert.equal(await page.locator('#atlas').getAttribute('data-world'), report.clickId, 'A visible phone label opens its world');
      }
      assertClean(result); await page.close(); page = null;
    }
    const result = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = result.page; await visit(page, 'orrery/earth'); await captureScene(page);
    await keyboardFocusMotion(page); assertClean(result); await page.close(); page = null;
    console.log('PASS anchored labels stay attached through solar and lunar orbits, fades, focus, and reduced motion');
  } catch (error) {
    if (page) console.error('Failure screenshot:', await screenshot(page, 'orbit-label-motion-failure').catch(() => 'unavailable'));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
