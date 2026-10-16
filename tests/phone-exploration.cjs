const { assert, launch, newPage, visit, ready, inViewport, screenshot, assertClean } = require('./browser-helpers.cjs');

(async () => {
  const browser = await launch();
  let page;
  try {
    const result = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = result.page;
    for (const world of ['earth', 'venus', 'jupiter', 'saturn', 'europa']) {
      await visit(page, world);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await inViewport(page, ['#worldTitle', '#scene'], `${world} phone first view`);
      const order = await page.evaluate(() => {
        const scene = document.querySelector('#scene').getBoundingClientRect();
        return { top: scene.top, text: document.querySelector('#worldText').getBoundingClientRect().top,
          question: document.querySelector('.discovery-question').getBoundingClientRect().top };
      });
      assert.ok(order.top < 350, `${world} globe should appear without scrolling through a long introduction`);
      assert.ok(order.text > order.top && order.question > order.top, `${world} puts extended reading after its globe`);
      if (world === 'venus') {
        await inViewport(page, ['#venusClouds', '#venusOrdinary', '#venusSurface'], 'Venus views on phone arrival');
        await page.locator('#worldTitle').focus();
        for (const expected of ['universe', 'cinemaButton', 'playButton']) {
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement?.id), expected,
            'phone keyboard focus should follow the visual globe-first order');
        }
        await screenshot(page, 'venus-phone-first-view');
      }
    }
    console.log('PASS phone worlds show their globe first and Venus views are within the opening viewport');
    await page.setViewportSize({ width: 320, height: 568 });
    for (const world of ['venus', 'ganymede', 'enceladus']) {
      await visit(page, world);
      await inViewport(page, ['#worldTitle', '#scene'], `${world} compact phone arrival`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        world + ' must fit a compact phone without horizontal scrolling');
      if (world === 'venus') assert.ok(await page.locator('#venusControls').evaluate(element =>
        element.getBoundingClientRect().top < innerHeight + 60), 'Venus views should be just below the globe on a small phone');
    }
    console.log('PASS compact phone globe layout, including long moon names');

    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, 'missions');
    await page.locator('[data-start-mission="sunrise"]').click();
    await ready(page);
    const pauseButtons = page.locator('#playButton:visible, #missionScenePlay:visible');
    assert.equal(await pauseButtons.count(), 1);
    await page.locator('#cinemaButton').click();
    assert.equal(await page.locator('#atlas').evaluate(element => element.classList.contains('cinema')), true);
    assert.equal(await pauseButtons.count(), 1, 'View only mode should offer one visible pause control');
    await pauseButtons.click();
    assert.equal(await pauseButtons.getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#atlas').evaluate(element => element.classList.contains('cinema')), false);
    assert.equal(await pauseButtons.count(), 1);
    await inViewport(page, ['#missionGuide', '#scene', '#citySelect'], 'mission after leaving View only');
    assertClean(result);
    console.log('PASS mission View only uses a single pause control and Escape restores the guided view');
  } catch (error) {
    if (page) console.error('Failure screenshot:', await screenshot(page, 'phone-exploration-failure').catch(() => 'unavailable'));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
