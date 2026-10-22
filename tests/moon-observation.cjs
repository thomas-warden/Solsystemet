const { assert, launch, newPage, visit, ready, screenshot, assertClean } = require('./browser-helpers.cjs');

async function inspect(page) {
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(item => item.name)
      .find(url => new URL(url).pathname.endsWith('/moon-system.js'));
    const { MoonSystem } = await import(url);
    for (const method of ['frame', 'advanceOffscreen']) {
      const original = MoonSystem.prototype[method];
      MoonSystem.prototype[method] = function (...args) { window.__observation = this; return original.apply(this, args); };
    }
  });
  await page.waitForFunction(() => window.__observation);
}
async function settled(page) {
  await page.waitForFunction(() => {
    const s = window.__observation;
    return s && !s.playing && !s.timeFlight && !s.flight && !s.dirty && !s.modelDirty && !s.labelsMoving && s.skyReady === 1;
  });
}
async function checkpoint(page, fraction) {
  const button = page.locator(`[data-moon-checkpoint="${fraction}"]`);
  await button.click();
  await page.waitForFunction(() => !window.__observation.timeFlight);
  await settled(page);
  assert.equal(await button.getAttribute('aria-current'), 'step');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.moonCheckpoint), String(fraction), 'Travel retains keyboard focus');
}
async function arrival(page, compact = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350); // Route-entry opacity/translation settles before measuring layout.
  const result = await page.evaluate(() => {
    const ids = ['moonPlay', 'moonDay', 'moonCheckpoints', 'moonStage'];
    return {
      width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth,
      boxes: Object.fromEntries(ids.map(id => [id, document.getElementById(id).getBoundingClientRect().toJSON()])),
      redundantPicker: !!document.querySelector('#moonFocus').getClientRects().length,
      upperLink: !!document.querySelector('#moonPageLinks').getClientRects().length,
      counts: ['moonPlay', 'moonDay', 'moonConsole'].map(id => document.querySelectorAll('#' + id).length),
    };
  });
  assert.equal(result.overflow, false, 'No horizontal overflow');
  assert.equal(result.redundantPicker, false); assert.equal(result.upperLink, false);
  assert.deepEqual(result.counts, [1, 1, 1], 'Moving controls must not duplicate them');
  for (const [id, box] of Object.entries(result.boxes)) {
    assert(box.width > 0 && box.x >= -1 && box.right <= result.width + 1, id + ' stays in horizontal bounds');
    if (!compact) assert(box.top >= 0 && box.bottom <= result.height + 1, id + ' fits the fresh viewport');
  }
  if (compact) assert(result.boxes.moonStage.height < result.height - 40, 'Canvas leaves room to scroll on short screens');
}

(async () => {
  const browser = await launch();
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const result = await newPage(browser, { viewport }), page = result.page;
      await visit(page, 'earth-moons/moon'); await inspect(page); await arrival(page);
      assert.equal(await page.locator('#playButton').evaluate(() => document.querySelector('#atlas').classList.contains('mission-active')), false);
      assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'true');
      await screenshot(page, `moon-observation-${viewport.width}-arrival`);
      const before = await page.evaluate(() => window.__observation.days);
      await page.waitForFunction(before => window.__observation.days > before, before);
      await page.locator('[data-moon-checkpoint="0.25"]').click();
      const flight = await page.evaluate(() => ({ ...window.__observation.timeFlight, days: window.__observation.days, playing: window.__observation.playing }));
      assert.equal(flight.playing, false); assert(flight.t < .8 && flight.end > flight.start, 'Normal motion travels rather than teleporting');
      await page.waitForFunction(() => !window.__observation.timeFlight); await settled(page);
      assert.equal(await page.locator('#moonTurnReading').textContent(), '¼ orbit · ¼ turn');
      await screenshot(page, `moon-observation-${viewport.width}-quarter`);
      await checkpoint(page, 1);
      await page.locator('[data-moon-checkpoint="0.25"]').click();
      assert(await page.evaluate(() => window.__observation.timeFlight.start > window.__observation.timeFlight.end), 'Earlier checkpoints travel backwards from the current position');
      await page.waitForFunction(() => !window.__observation.timeFlight); await settled(page);
      assert.equal(await page.locator('#moonTurnReading').textContent(), '¼ orbit · ¼ turn');
      await checkpoint(page, .5);
      const frame = await page.evaluate(() => window.__observation.renderer.info.render.frame);
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => window.__observation.renderer.info.render.frame), frame, 'Paused guide causes no repeated GPU draw');
      await page.locator('#moonCanvas').focus(); await page.keyboard.press('ArrowRight');
      await page.waitForFunction(frame => window.__observation.renderer.info.render.frame > frame, frame); await settled(page);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#moonFaceGuide')).pointerEvents), 'none');

      // Observe the actual mesh and projected cue at all orbital quarters, from both views.
      // Hidden cues are legitimate when the direction is end-on, occluded, or outside
      // the usable canvas; they must never be pinned over controls or detached.
      const geometry = await page.evaluate(async () => {
        const s = window.__observation;
        const url = performance.getEntriesByType('resource').map(item => item.name).find(url => new URL(url).pathname.endsWith('/moons.js'));
        const { MOONS } = await import(url), THREE = await import('./vendor/three.module.js');
        const samples = [];
        for (const top of [false, true]) for (const part of [0, .25, .5, .75, 1]) {
          s.days = MOONS.moon.period * part; s.modelDirty = true; s.setView(top, { immediate: true }); s.frame(.02, performance.now());
          const moon = s.items.moon.mesh, earth = s.items.earth.mesh;
          const facing = new THREE.Vector3(-1, 0, 0).applyQuaternion(moon.quaternion);
          const inward = moon.position.clone().negate().normalize();
          const center = moon.position.clone().project(s.camera), face = new THREE.Vector3(-1, 0, 0).applyMatrix4(moon.matrixWorld).project(s.camera);
          const { width, height } = s.labelLayout.bounds;
          const expected = Math.atan2(-(face.y - center.y) * height, (face.x - center.x) * width);
          const node = document.querySelector('#moonFaceGuide'), transform = document.querySelector('#moonFacePointer').getAttribute('transform');
          const angle = Number(transform?.match(/rotate\(([^)]+)\)/)?.[1]) * Math.PI / 180;
          const hidden = node.hasAttribute('hidden');
          const moonLabel = s.labels.find(item => item.id === 'moon').label, labelBox = moonLabel.getBoundingClientRect();
          const labelOverlap = !hidden && !moonLabel.hidden && ['moonFaceRing', 'moonFaceArrow'].some(id => {
            const shape = document.getElementById(id), length = shape.getTotalLength(), matrix = shape.getScreenCTM();
            // A rotated SVG group's rectangular DOM box overestimates a round cue.
            // Sample the rendered outlines after their actual screen transform.
            for (let i = 0; i <= 120; i++) {
              const point = shape.getPointAtLength(length * i / 120).matrixTransform(matrix);
              if (point.x > labelBox.left - 1 && point.x < labelBox.right + 1 && point.y > labelBox.top - 1 && point.y < labelBox.bottom + 1) return true;
            }
            return false;
          });
          samples.push({ top, part, hidden, lock: facing.dot(inward), ratio: moon.scale.x / earth.scale.x,
            expectedRatio: MOONS.moon.radius / 6371.0084, angleError: Math.abs(Math.atan2(Math.sin(angle - expected), Math.cos(angle - expected))),
            valid: !transform || !/NaN|Infinity/.test(transform),
            labelOverlap });
        }
        // Look directly along the Earth/Moon line, from each side, and far away.
        const hiddenCases = [];
        for (const sign of [-1, 1]) {
          s.camera.position.copy(s.items.moon.mesh.position).normalize().multiplyScalar(20 * sign); s.controls.target.set(0, 0, 0); s.controls.update(); s.dirty = true; s.frame(.02, performance.now());
          hiddenCases.push(document.querySelector('#moonFaceGuide').hasAttribute('hidden'));
        }
        s.camera.position.set(50, 0, 20); s.controls.target.set(50, 0, 0); s.controls.update(); s.dirty = true; s.frame(.02, performance.now());
        hiddenCases.push(document.querySelector('#moonFaceGuide').hasAttribute('hidden'));
        s.setView(false, { immediate: true }); s.dirty = true;
        return { samples, hiddenCases };
      });
      for (const sample of geometry.samples) {
        assert(sample.valid); assert(sample.lock > .999999, 'The model face stays toward Earth');
        assert(Math.abs(sample.ratio - sample.expectedRatio) < 1e-8, 'Earth/Moon diameter ratio is unchanged');
        if (!sample.hidden) assert(sample.angleError < 1e-8, 'Guide direction comes from the real transformed face');
        assert.equal(sample.labelOverlap, false, 'The guide never covers the Moon link');
      }
      assert(geometry.samples.filter(sample => !sample.hidden).length >= 5, 'Guide remains useful through both views');
      assert(geometry.hiddenCases.every(Boolean), 'End-on, occluded and offscreen guide hides safely');
      console.log('PASS arrival, forward/reverse travel, real orientation, idle rendering, camera and occlusion', viewport.width);

      // Cancelling via input or navigation must not let an old trip finish later.
      await page.locator('[data-moon-checkpoint="0.25"]').click();
      await page.locator('#moonDay').fill('120');
      assert.equal(await page.evaluate(() => window.__observation.timeFlight), null);
      assert.equal(await page.locator('#moonCheckpointStatus').textContent(), 'The pointer turns with the Moon.');
      await page.locator('[data-moon-checkpoint="1"]').click(); await page.locator('#moonPlay').click();
      assert.equal(await page.evaluate(() => window.__observation.timeFlight), null);
      await page.locator('[data-moon-checkpoint="0.5"]').click(); await page.locator('#moonReset').click();
      assert.equal(await page.evaluate(() => window.__observation.timeFlight), null);
      assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'true');
      await page.locator('[data-moon-checkpoint="1"]').click();
      await page.evaluate(() => { scrollTo(0, document.body.scrollHeight); location.hash = 'jupiter-moons/io'; });
      await ready(page);
      assert.equal(await page.evaluate(() => window.__observation.timeFlight), null);
      assert.equal(await page.locator('#moonCheckpointStatus').textContent(), 'The pointer turns with the Moon.');
      assert(await page.locator('#moonFocus').isVisible(), 'Larger family retains the meaningful picker');
      assert(await page.locator('#moonPageLinks').isVisible());
      assert(await page.locator('#moonCheckpoints').isHidden());
      assert(await page.evaluate(() => !!(document.querySelector('#moonStage').compareDocumentPosition(document.querySelector('#moonConsole')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'Shared console returns after the giant-family stage');
      await page.evaluate(() => { location.hash = 'earth-moons/moon'; }); await ready(page);
      assert.equal(await page.locator('#moonCheckpointStatus').textContent(), 'The pointer turns with the Moon.');
      assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'true');
      await page.locator('#visitMoon').click(); await ready(page);
      assert.equal(await page.evaluate(() => location.hash), '#moon', 'Full Moon close-up remains reachable');
      assert.equal(await page.evaluate(() => window.__observation.timeFlight), null);
      assertClean(result); await page.close();
    }

    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      const result = await newPage(browser, { viewport, reducedMotion: 'reduce' }), page = result.page;
      await visit(page, 'earth-moons/moon'); await inspect(page); await arrival(page, viewport.width !== 390);
      assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'false');
      const button = page.locator('[data-moon-checkpoint="0.5"]'); await button.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.__observation.timeFlight), null, 'Reduced checkpoint is immediate');
      assert.equal(await page.evaluate(() => window.__observation.days), 13.661, 'Half of the measured 27.322-day orbit updates even offscreen');
      assert.equal(await page.locator('#moonTurnReading').textContent(), '½ orbit · ½ turn', 'Offscreen readout updates before any GPU draw');
      await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
      await settled(page); assert.equal(await page.locator('#moonTurnReading').textContent(), '½ orbit · ½ turn');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.moonCheckpoint), '0.5');
      await page.locator('#moonReset').click(); assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'false');
      await page.locator('#moonCheckpoints').scrollIntoViewIfNeeded(); await screenshot(page, `moon-observation-${viewport.width}-reduced`);
      assertClean(result); await page.close();
    }
    console.log('PASS cancellations, family restoration, close-up links, reduced motion and compact/landscape access');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
