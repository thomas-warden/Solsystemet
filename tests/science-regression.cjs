const { assert, launch, newPage, visit, range, assertClean } = require('./browser-helpers.cjs');

(async () => {
  const browser = await launch();
  try {
    const result = await newPage(browser, { reducedMotion: 'reduce', viewport: { width: 900, height: 900 } });
    const { page } = result;
    await visit(page, 'earth-moons');
    const numerical = await page.evaluate(async () => {
      const urlFor = file => performance.getEntriesByType('resource').map(item => item.name)
        .find(url => new URL(url).pathname.endsWith('/' + file));
      const { ORDER, WORLDS, orbitalPosition } = await import(urlFor('worlds.js'));
      const { MOONS, FAMILIES, moonPosition } = await import(urlFor('moons.js'));
      const bodies = [
        ...ORDER.map(id => ({ id, period: WORLDS[id].period, radius: WORLDS[id].a,
          at: days => orbitalPosition(WORLDS[id], days) })),
        ...Object.keys(MOONS).map(id => ({ id, period: MOONS[id].period, radius: 5,
          at: days => moonPosition(id, days, 5, FAMILIES[MOONS[id].parent].indexOf(id)) })),
      ];
      return bodies.map(body => {
        let minNorthMomentum = Infinity, maxClosureError = 0;
        for (const phase of [0, .125, .333, .75]) {
          const days = body.period * phase, dt = body.period * 1e-5;
          const p = body.at(days), next = body.at(days + dt), closed = body.at(days + body.period);
          const velocity = p.map((value, index) => (next[index] - value) / dt);
          // +Y is north in the rendered, right-handed coordinate system.
          minNorthMomentum = Math.min(minNorthMomentum, p[2] * velocity[0] - p[0] * velocity[2]);
          maxClosureError = Math.max(maxClosureError, Math.hypot(...p.map((value, index) => value - closed[index])) / body.radius);
        }
        return { id: body.id, minNorthMomentum, maxClosureError };
      });
    });
    assert.equal(numerical.length, 20);
    for (const body of numerical) {
      assert.ok(body.minNorthMomentum > 0, `${body.id} travels prograde when viewed from north`);
      assert.ok(body.maxClosureError < 1e-8, `${body.id} returns to its starting position after one period`);
    }
    console.log('PASS all eight planets and twelve moons travel prograde and close their orbits after one period');

    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').map(item => item.name)
        .find(url => new URL(url).pathname.endsWith('/moon-system.js'));
      const { MoonSystem } = await import(url), original = MoonSystem.prototype.frame;
      MoonSystem.prototype.frame = function (...args) {
        window.__testMoonSystem = this;
        return original.apply(this, args);
      };
    });
    for (const parent of ['earth', 'jupiter', 'saturn']) {
      await visit(page, parent + '-moons');
      await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
      await page.waitForFunction(parent => window.__testMoonSystem?.parent === parent, parent);
      for (const value of [0, 250, 500, 750, 1000]) {
        await range(page, '#moonDay', value);
        await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !window.__testMoonSystem.modelDirty);
        const alignment = await page.evaluate(async () => {
          const { Vector3 } = await import('./vendor/three.module.js');
          return Object.entries(window.__testMoonSystem.items).filter(([, item]) => item.r).map(([id, item]) => ({
            id, dot: new Vector3(-1, 0, 0).applyQuaternion(item.mesh.quaternion).normalize()
              .dot(item.mesh.position.clone().negate().normalize()),
          }));
        });
        for (const moon of alignment) assert.ok(moon.dot > .999999,
          `${moon.id} must keep the same face toward its parent at timeline ${value}; dot=${moon.dot}`);
      }
    }
    assertClean(result);
    console.log('PASS actual moon meshes stay tidally locked through all phases, including inclined Moon and Iapetus');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
