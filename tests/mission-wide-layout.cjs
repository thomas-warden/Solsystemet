const {
  assert, launch, newPage, visit, ready, inViewport, screenshot, assertClean,
} = require('./browser-helpers.cjs');

const wideViewports = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  // This width previously fell between the phone/tablet and desktop rules.
  { width: 1200, height: 900 },
];

async function checkWorkspace(page, state) {
  // Wait for the guide's ResizeObserver and the resulting canvas resize.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const size = page.viewportSize(), label = `${size.width}×${size.height} Mercury ${state}`;
  const boxes = await inViewport(page, [
    '#missionGuide', '#orreryStage', '#orbitPlay', '#orbitDay',
    '#orbitScoreboard [data-orbit="mercury"]', '#orbitScoreboard [data-orbit="earth"]',
    '#scaleNote',
  ], label);
  const guide = boxes['#missionGuide'], scene = boxes['#orreryStage'];
  assert.ok(scene.height >= 260, label + ': the scene must remain large enough to observe');
  assert.ok(scene.y >= guide.bottom - 1, label + ': the guide must not cover the scene');
  for (const selector of ['#orbitPlay', '#orbitDay', '#orbitScoreboard [data-orbit="mercury"]', '#orbitScoreboard [data-orbit="earth"]']) {
    const box = boxes[selector];
    assert.ok(box.y >= guide.bottom - 1, label + ': the guide must not cover ' + selector);
  }
  assert.match(await page.locator('#scaleNote').textContent(), /distances.*enlarged/i,
    label + ': the composed scale must remain explained');
  assert.equal(await page.locator('#orbitScoreboard button:visible').count(), 2,
    label + ': the comparison should show the two worlds in this mission');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': horizontal overflow');
}

async function tabTo(page, selector, key, state) {
  // Exercise native focus scrolling. Do not use locator.focus()/scrollIntoView(),
  // which could conceal the original guide-over-scene regression.
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await page.locator(selector).evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press(key);
    await checkWorkspace(page, state + ' after ' + key);
  }
  assert.fail('Keyboard could not reach ' + selector);
}

(async () => {
  const browser = await launch();
  let page;
  try {
    for (const viewport of wideViewports) {
      const result = await newPage(browser, { viewport, reducedMotion: 'reduce' });
      page = result.page;
      await visit(page, 'missions');
      await page.locator('[data-start-mission="mercury"]').click();
      await ready(page);
      await page.waitForFunction(() => document.activeElement.id === 'missionStepTitle');
      await checkWorkspace(page, 'arrival');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'missionAction');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#atlas').dataset.missionStep === '1');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orbitDay');
      await checkWorkspace(page, 'after Start focuses time');

      // Move from the time slider to Play and back with the browser's own Tab
      // order, then finish the experiment with a genuine range-key input.
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orbitPlay');
      await checkWorkspace(page, 'Play focused');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orbitDay');
      await page.keyboard.press('End');
      await page.waitForFunction(() => document.querySelector('#atlas').dataset.missionStep === '2');
      await checkWorkspace(page, 'question');

      await tabTo(page, '[data-answer="0"]', 'Shift+Tab', 'question navigation');
      await page.keyboard.press('Enter');
      assert.ok((await page.locator('#missionFeedback').textContent()).trim(), 'an incorrect answer should give useful feedback');
      await checkWorkspace(page, 'answer feedback');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.answer), '1');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'missionStepTitle');
      assert.equal(await page.locator('#missionStepTitle').textContent(), 'Orbit explorer');
      await checkWorkspace(page, 'completion');
      assert.equal(await page.locator('[data-orbit="mercury"] .trip-count').textContent(), '4');
      assert.equal(await page.locator('[data-orbit="earth"] .trip-count').textContent(), '1');
      await screenshot(page, `mercury-wide-${viewport.width}x${viewport.height}`);

      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'missionNext');
      await checkWorkspace(page, 'Next mission focused');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'missionEnd');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#missionGuide').isVisible(), false);
      for (const selector of ['.orbit-toolbar', '.orbit-selected', '.orbit-speed', '#oneYear']) {
        assert.equal(await page.locator('#orreryView').locator(selector).isVisible(), true, selector + ' returns in free exploration');
      }
      assert.equal(await page.locator('#orbitScoreboard button:visible').count(), 8);
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
      assertClean(result);
      await page.close();
      console.log(`PASS Mercury ${viewport.width}×${viewport.height}: visible evidence, native keyboard focus and restored exploration`);
    }
  } catch (error) {
    if (page && !page.isClosed()) {
      console.error('Focused element:', await page.evaluate(() => ({
        tag: document.activeElement.tagName, id: document.activeElement.id,
        answer: document.activeElement.dataset.answer, href: document.activeElement.getAttribute('href'),
        scrollY,
      })).catch(() => 'unavailable'));
      console.error('Failure screenshot:', await screenshot(page, 'mercury-wide-failure').catch(() => 'unavailable'));
    }
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
