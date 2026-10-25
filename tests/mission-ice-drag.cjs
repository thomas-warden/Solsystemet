const { assert, launch, newPage, visit, ready, screenshot, assertClean } = require('./browser-helpers.cjs');

const shell = '#europaCutaway .europa-ice-shell';
async function startIce(page) {
  await visit(page, 'missions');
  await page.locator('[data-start-mission="europa"]').click();
  await ready(page);
  await page.locator('[data-answer="0"]').click();
  await page.waitForFunction(() => document.querySelector('#atlas').dataset.missionStep === '1');
}
async function point(page) {
  const box = await page.locator(shell).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height * .65 };
}
async function closed(page, reason) {
  assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '1', reason);
  assert.equal(await page.locator('#europaCutaway').evaluate(element => element.classList.contains('is-open')), false, reason);
  assert.equal(await page.locator('#europaCutaway').evaluate(element => element.classList.contains('is-dragging')), false, reason);
  assert.equal(await page.locator('#passportCount').textContent(), '0 / 3', reason);
}
async function open(page) {
  await page.waitForFunction(() => document.querySelector('#atlas').dataset.missionStep === '2');
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#europaCutaway .europa-unopened')).opacity) < .01);
  assert.equal(await page.locator('#passportCount').textContent(), '0 / 3', 'opening the illustration alone does not award a badge');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'missionStepTitle');
}

(async () => {
  const browser = await launch(); let page;
  try {
    const phone = await newPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    page = phone.page;
    await startIce(page);
    const start = await point(page);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '1', 'pointerdown is not an observation');
    await page.mouse.move(start.x, start.y - 4, { steps: 2 }); await page.mouse.up();
    await closed(page, 'an accidental small move must leave the ice closed');

    // Real browser touch events exercise pointer capture and touch-action,
    // including cancellation while the shell is visibly partly lifted.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] :
        [{ id: 1, x: start.x, y, radiusX: 3, radiusY: 3, force: 1 }],
    });
    await touch('touchStart', start.y);
    await touch('touchMove', start.y - 30);
    const partial = await page.locator('#europaCutaway .europa-unopened').evaluate(element => Number(getComputedStyle(element).opacity));
    assert.ok(partial > 0 && partial < .9, 'the ocean cover must respond visibly before release');
    const movement = await page.locator(shell).evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42);
    assert.ok(movement < -2 && movement > -20, 'the illustrated ice must move with the hand');
    await screenshot(page, 'europa-ice-partly-lifted-phone');
    await touch('touchCancel');
    await closed(page, 'canceling a touch must reset the unfinished lift');

    const scrollBefore = await page.evaluate(() => scrollY);
    await touch('touchStart', start.y);
    await touch('touchMove', start.y - 90);
    assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'), '1', 'release confirms the completed lift');
    await touch('touchEnd');
    await open(page);
    assert.equal(await page.evaluate(() => scrollY), scrollBefore, 'lifting the shell must not scroll the page');
    await screenshot(page, 'europa-ice-lifted-phone');
    await page.locator('[data-answer="1"]').click();
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Ocean detective');
    assert.equal(await page.locator('#europaCutaway').isVisible(), true);
    assertClean(phone); await page.close();
    console.log('PASS real phone touch lift, partial reveal, accidental/canceled gesture recovery and deliberate discovery');

    const desktop = await newPage(browser, { reducedMotion: 'reduce' }); page = desktop.page;
    await startIce(page);
    for (let attempts = 0; attempts < 8 && !await page.locator(shell).evaluate(element => element === document.activeElement); attempts++) {
      await page.keyboard.press('Tab');
    }
    assert.equal(await page.locator(shell).evaluate(element => element === document.activeElement), true, 'the illustration is reachable by keyboard');
    assert.equal(await page.locator(shell).getAttribute('role'), 'button');
    await page.keyboard.press('Space'); await open(page);
    await screenshot(page, 'europa-ice-keyboard-desktop');

    // Leaving during an actual held pointer must discard its capture and inline
    // progress, while preserving the mission's unfinished observation step.
    await startIce(page); const again = await point(page);
    await page.mouse.move(again.x, again.y); await page.mouse.down();
    await page.mouse.move(again.x, again.y - 30, { steps: 3 });
    await page.evaluate(() => { location.hash = '#venus'; }); await ready(page);
    await page.mouse.up();
    await page.locator('#missionReturn').click(); await ready(page);
    await closed(page, 'leaving and returning must not retain a half-dragged shell');
    assert.equal(await page.locator('#europaCutaway').evaluate(element => element.style.getPropertyValue('--ice-lift')), '');
    await page.locator('#missionAction').click(); await open(page);
    assertClean(desktop); await page.close();
    console.log('PASS keyboard lift, reduced motion, route cancellation and equivalent Lift button');
  } catch (error) {
    if (page && !page.isClosed()) console.error('Failure screenshot:', await screenshot(page, 'mission-ice-drag-failure').catch(() => 'unavailable'));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
