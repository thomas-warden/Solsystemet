const { assert, launch, newPage, visit, ready, screenshot, assertClean } = require('./browser-helpers.cjs');

async function instrument(page) {
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name)
      .find(url => new URL(url).pathname.endsWith('/moon-system.js'));
    const { MoonSystem } = await import(url), frame = MoonSystem.prototype.frame;
    MoonSystem.prototype.frame = function (...args) {
      window.__lightingScene = this;
      return frame.apply(this, args);
    };
  });
  await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__lightingScene);
}

async function settled(page) {
  await page.waitForFunction(() => {
    const scene = window.__lightingScene;
    return scene && !scene.dirty && !scene.modelDirty && !scene.labelsMoving && !scene.flight && scene.skyReady === 1;
  });
}

(async () => {
  const browser = await launch();
  let page;
  try {
    const result = await newPage(browser, { reducedMotion: 'reduce' });
    page = result.page;
    const shaderErrors = [];
    page.on('console', message => {
      if (message.type() === 'error' && /THREE|shader|VALIDATE_STATUS|WebGLProgram/i.test(message.text())) shaderErrors.push(message.text());
    });
    await visit(page, 'earth-moons/moon');
    await instrument(page);
    await settled(page);
    const material = await page.evaluate(async () => {
      const THREE = await import('./vendor/three.module.js');
      const s = window.__lightingScene, earth = s.items.earth.mesh;
      const clouds = earth.getObjectByName('earth-clouds'), atmosphere = earth.getObjectByName('earth-atmosphere');
      return {
        dayColor: earth.material.map.colorSpace, cloudData: clouds.material.alphaMap.colorSpace,
        expectedDay: THREE.SRGBColorSpace, expectedData: THREE.NoColorSpace,
        sharedGeometry: earth.geometry === clouds.geometry && earth.geometry === atmosphere.geometry,
        sharedSun: atmosphere.material.uniforms.sunDirection.value === s.sunDirection,
        sunAlignment: s.sunDirection.dot(s.sunlight.position.clone().sub(s.sunlight.target.position).normalize()),
        sunLength: s.sunDirection.length(), textureCount: s.textures.size,
        dayWidth: earth.material.map.image.width, cloudWidth: clouds.material.alphaMap.image.width,
        shellScale: atmosphere.scale.x, plays: s.playing,
      };
    });
    assert.equal(material.dayColor, material.expectedDay, 'Photographic color uses sRGB');
    assert.equal(material.cloudData, material.expectedData, 'Opacity data must not undergo gamma decoding');
    assert.ok(material.sharedGeometry && material.sharedSun, 'Atmosphere reuses geometry and the actual sunlight direction');
    assert.ok(material.sunAlignment > .999999 && Math.abs(material.sunLength - 1) < 1e-9, 'Earth and Moon share parallel sunlight');
    assert.equal(material.textureCount, 3, 'Earth, Moon and clouds need no additional texture allocation');
    assert.equal(material.dayWidth, 2048); assert.equal(material.cloudWidth, 2048);
    assert.ok(material.shellScale > 1 && material.shellScale < 1.03, 'Atmosphere is a thin shell');
    assert.equal(material.plays, false, 'Initial reduced motion is paused');
    console.log('PASS color versus scalar data, shared sunlight, thin atmosphere and retained texture/geometry budget');
    await screenshot(page, 'earth-moon-lighting-desktop');

    // Read the actual rendered disk from opposite viewing directions. This
    // catches emissive/ambient material mistakes that make night as bright as day.
    const contrast = await page.evaluate(() => {
      const s = window.__lightingScene, gl = s.renderer.getContext();
      const initial = s.camera.position.clone(), readings = [];
      for (const side of [1, -1]) {
        s.camera.position.copy(s.sunDirection).multiplyScalar(6 * side);
        s.controls.update(); s.renderer.render(s.scene, s.camera);
        const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const radius = height / (2 * Math.tan(s.camera.fov * Math.PI / 360)) * 1.3 / 6 * .6;
        let luminance = 0, count = 0;
        for (let y = Math.ceil(height / 2 - radius); y < height / 2 + radius; y += 3) {
          for (let x = Math.ceil(width / 2 - radius); x < width / 2 + radius; x += 3) {
            if ((x - width / 2) ** 2 + (y - height / 2) ** 2 > radius ** 2) continue;
            const i = (y * width + x) * 4;
            luminance += pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722; count++;
          }
        }
        readings.push(luminance / count);
      }
      s.camera.position.copy(initial); s.controls.update(); s.dirty = true;
      return { day: readings[0], night: readings[1] };
    });
    assert.ok(contrast.day > 35, `Sunlit Earth should retain readable detail: ${JSON.stringify(contrast)}`);
    assert.ok(contrast.night < contrast.day * .2, `The dark side must stay dark: ${JSON.stringify(contrast)}`);
    assert.deepEqual(shaderErrors, [], 'All Earth surface/cloud/atmosphere shaders compile and link');
    console.log('PASS rendered day/night contrast', contrast);

    await settled(page);
    const paused = await page.evaluate(() => window.__lightingScene.renderer.info.render.frame);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => window.__lightingScene.renderer.info.render.frame), paused,
      'The new atmosphere must not redraw a settled paused scene');
    await page.locator('#moonCanvas').focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(previous => window.__lightingScene.renderer.info.render.frame > previous, paused);
    await settled(page);
    assert.ok(await page.evaluate(() => window.__lightingScene.sunDirection.dot(window.__lightingScene.sunlight.position.clone().normalize()) > .999999),
      'Orbiting the camera must not move the Sun');
    console.log('PASS paused rendering settles and keyboard camera changes keep world-space illumination');

    // Route changes within the same application must restore the pre-existing
    // giant-planet light rig, then restore the Earth rig on return.
    for (const parent of ['jupiter', 'saturn', 'earth']) {
      await page.evaluate(parent => { location.hash = parent + '-moons'; }, parent);
      await ready(page); await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
      await page.waitForFunction(parent => window.__lightingScene.parent === parent, parent);
      await settled(page);
      const rig = await page.evaluate(() => {
        const s = window.__lightingScene;
        return { sun: s.sunlight.color.getHex(), intensity: s.sunlight.intensity,
          ambient: s.ambientLight.color.getHex(), fill: s.ambientLight.intensity };
      });
      if (parent === 'earth') {
        assert.ok(rig.fill < .08 && rig.intensity >= 2.9, 'Earth returns to neutral low-fill lighting');
      } else assert.deepEqual(rig, { sun: 0xffedcf, intensity: 2.9, ambient: 0x73879a, fill: .34 },
        `${parent} must retain its established lighting`);
    }
    console.log('PASS Earth → Jupiter → Saturn → Earth restores each family’s lighting');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#moonCanvas').scrollIntoViewIfNeeded(); await settled(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Phone view does not overflow');
    await screenshot(page, 'earth-moon-lighting-phone');
    await page.locator('#moonPlay').click();
    const start = await page.evaluate(() => window.__lightingScene.days);
    await page.waitForFunction(start => window.__lightingScene.days > start + .05, start);
    await page.locator('#moonReset').click(); await settled(page);
    assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => window.__lightingScene.days), 0);
    console.log('PASS phone layout, explicit Play and reduced-motion Reset');
    assertClean(result); await page.close();

    const normal = await newPage(browser);
    page = normal.page; await visit(page, 'earth-moons/moon'); await instrument(page);
    assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'true');
    const days = await page.evaluate(() => window.__lightingScene.days);
    await page.waitForFunction(previous => window.__lightingScene.days > previous + .05, days);
    await page.locator('#moonPlay').click(); await settled(page);
    await page.locator('#moonPlay').click();
    await page.evaluate(() => {
      const s = window.__lightingScene, advance = s.advanceOffscreen;
      window.__lightingOffscreenTicks = 0;
      s.advanceOffscreen = function (...args) { window.__lightingOffscreenTicks++; return advance.apply(this, args); };
      // Ensure this viewport can scroll completely past the canvas, independent
      // of how much explanatory content is below it in a particular layout.
      const spacer = document.createElement('div');
      spacer.style.height = '200vh'; spacer.setAttribute('aria-hidden', 'true');
      document.querySelector('#moonSystemView').append(spacer);
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });
    await page.waitForFunction(() => window.__lightingOffscreenTicks >= 2);
    const offscreen = await page.evaluate(() => ({ days: window.__lightingScene.days,
      frame: window.__lightingScene.renderer.info.render.frame, bottom: document.querySelector('#moonCanvas').getBoundingClientRect().bottom }));
    assert.ok(offscreen.bottom <= 0, 'Canvas is actually outside the viewport');
    await page.waitForFunction(previous => window.__lightingScene.days > previous + .1, offscreen.days);
    assert.equal(await page.evaluate(() => window.__lightingScene.renderer.info.render.frame), offscreen.frame,
      'The running offscreen clock must not draw the atmosphere or other scene geometry');
    assertClean(normal);
    console.log('PASS normal arrival retains motion; offscreen clock advances without GPU draws');
  } catch (error) {
    if (page) console.error('Failure capture:', await screenshot(page, 'earth-moon-lighting-failure').catch(() => 'unavailable'));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
