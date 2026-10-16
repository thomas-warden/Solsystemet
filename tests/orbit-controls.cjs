const { assert, launch, newPage, visit, screenshot, assertClean } = require('./browser-helpers.cjs');

async function labelsClearToolbar(page, stage, label) {
  const layout = await page.locator(stage).evaluate(stage => {
    const controls = [...stage.querySelectorAll('.orbit-toolbar button, .orbit-toolbar select')]
      .filter(element => element.getClientRects().length).map(element => element.getBoundingClientRect());
    const bottom = Math.max(...controls.map(rect => rect.bottom));
    const labels = [...stage.querySelectorAll('.orbit-label')].filter(element => !element.hidden && element.getClientRects().length)
      .map(element => ({ name: element.textContent.trim(), top: element.getBoundingClientRect().top,
        height: element.getBoundingClientRect().height }));
    return { bottom, labels };
  });
  assert.ok(layout.labels.length > 0, label + ': keep usable body labels visible');
  for (const body of layout.labels) assert.ok(body.top >= layout.bottom + 7,
    `${label}: ${body.name} label overlaps toolbar; label top=${body.top}, toolbar bottom=${layout.bottom}`);
}

(async () => {
  const browser = await launch();
  let page;
  try {
    const result = await newPage(browser, { reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    page = result.page;
    await visit(page, 'orrery/neptune');
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').map(item => item.name)
        .find(url => new URL(url).pathname.endsWith('/orrery.js'));
      const { Orrery } = await import(url), original = Orrery.prototype.frame;
      Orrery.prototype.frame = function (...args) { window.__testOrbit = this; return original.apply(this, args); };
    });
    await page.locator('#orreryCanvas').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !!window.__testOrbit);
    await page.locator('#followOrbit').click();
    await page.locator('#orreryCanvas').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__testOrbit.following === 'neptune' && !window.__testOrbit.flight);
    const camera = () => page.evaluate(() => {
      const scene = window.__testOrbit;
      return { radius: scene.camera.position.distanceTo(scene.controls.target), target: scene.controls.target.toArray() };
    });
    const initial = await camera();
    await page.locator('#orreryCanvas').focus();
    for (const key of ['ArrowRight', 'ArrowUp']) {
      await page.keyboard.press(key);
      const current = await camera();
      assert.ok(Math.abs(current.radius - initial.radius) < 1e-5, key + ' rotates around the followed planet without changing distance');
      assert.deepEqual(current.target, initial.target, key + ' keeps the followed planet centered');
    }
    await page.keyboard.press('+');
    const zoomed = await camera();
    assert.ok(Math.abs(zoomed.radius - initial.radius * .85) < 1e-5, 'plus zooms around the followed planet');
    await page.keyboard.press('-');
    assert.ok(Math.abs((await camera()).radius - initial.radius) < 1e-5, 'minus restores the same viewing distance');
    console.log('PASS keyboard orbit and zoom preserve the followed planet as their center');

    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await visit(page, 'orrery/neptune');
      for (const button of ['#obliqueView', '#overheadView']) {
        await page.locator(button).click();
        await page.locator('#orreryCanvas').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !window.__testOrbit.flight && !window.__testOrbit.labelsMoving);
        await labelsClearToolbar(page, '#orreryStage', `${viewport.width}×${viewport.height} solar system`);
      }
      await visit(page, 'saturn-moons/iapetus');
      for (const button of ['#moonPerspective', '#moonTop']) {
        await page.locator(button).click();
        await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await labelsClearToolbar(page, '#moonStage', `${viewport.width}×${viewport.height} moon system`);
      }
      console.log(`PASS body labels clear controls at ${viewport.width}×${viewport.height}`);
    }
    assertClean(result);
  } catch (error) {
    if (page) console.error('Failure screenshot:', await screenshot(page, 'orbit-controls-failure').catch(() => 'unavailable'));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
