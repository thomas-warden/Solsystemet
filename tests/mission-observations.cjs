const {
  assert, launch, newPage, visit, ready, range, inViewport, screenshot, assertClean,
} = require('./browser-helpers.cjs');

const step = page => page.locator('#atlas').getAttribute('data-mission-step');
const waitStep = (page, expected) => page.waitForFunction(value =>
  document.querySelector('#atlas').dataset.missionStep === String(value), expected);

async function start(page, id) {
  await visit(page, 'missions');
  await page.locator(`[data-start-mission="${id}"]`).click();
  await ready(page);
  await waitStep(page, 0);
}

async function finishYear(page) {
  await page.locator('#orbitDay').focus();
  await page.keyboard.press('End');
  await waitStep(page, 2);
  assert.match(await page.locator('#orbitTime').textContent(), /365/);
  assert.equal(await page.locator('#orbitScoreboard [data-orbit="mercury"] .trip-count').textContent(), '4');
  assert.equal(await page.locator('#orbitScoreboard [data-orbit="earth"] .trip-count').textContent(), '1');
}

async function oceanVisible(page) {
  await page.waitForFunction(() => {
    const figure = document.querySelector('#europaCutaway');
    const cover = figure.querySelector('.europa-unopened');
    const shell = figure.querySelector('.europa-ice-shell');
    return figure.getClientRects().length && !figure.hidden && figure.classList.contains('is-open') &&
      Number(getComputedStyle(cover).opacity) < .01 &&
      new DOMMatrixReadOnly(getComputedStyle(shell).transform).m42 < -19.9;
  });
}

(async () => {
  const browser = await launch();
  let page;
  try {
    const phone = await newPage(browser, { viewport: { width: 390, height: 844 } });
    page = phone.page;
    await start(page, 'sunrise');
    await page.locator('#citySelect').focus();
    await page.locator('#citySelect').selectOption('stockholm');
    assert.equal(await step(page), '0', 'changing the city must leave time to confirm the choice');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'citySelect');
    await page.locator('#citySelect').selectOption('abu-dhabi');
    await page.locator('#missionAction').click();
    await waitStep(page, 1);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'earthRotation');

    // Rewinding from evening darkness into daylight is sunset in reverse,
    // not evidence of the morning transition requested by this activity.
    await range(page, '#earthRotation', 800);
    assert.equal(await page.locator('#dayStatus').textContent(), 'Nighttime');
    await waitStep(page, 2);
    await range(page, '#earthRotation', 700);
    assert.equal(await page.locator('#dayStatus').textContent(), 'Daylight');
    assert.equal(await step(page), '2');
    assert.equal(await page.locator('#missionAction').isEnabled(), false, 'reversing through dusk cannot save a sunrise');

    // Playback may carry a city across dawn, but it must not silently award a
    // discovery. A deliberate observation and the save action are required.
    await range(page, '#earthRotation', 200);
    assert.equal(await page.locator('#dayStatus').textContent(), 'Nighttime');
    await page.locator('#missionScenePlay').click();
    await page.waitForFunction(() => document.querySelector('#dayStatus').textContent === 'Daylight', null, { timeout: 7000 });
    assert.equal(await step(page), '2');
    assert.equal(await page.locator('#missionAction').isEnabled(), false, 'passive dawn cannot arm the observation');
    if (await page.locator('#missionScenePlay').getAttribute('aria-pressed') === 'true') {
      await page.locator('#missionScenePlay').click();
    }

    await range(page, '#earthRotation', 200);
    const before = await page.locator('#solarClock').textContent();
    await range(page, '#earthRotation', 250);
    const after = await page.locator('#solarClock').textContent();
    assert.ok(after > before, `moving the time slider right must move local time forward: ${before} → ${after}`);
    assert.equal(await page.locator('#dayStatus').textContent(), 'Daylight');
    assert.equal(await step(page), '2', 'seeing sunrise still leaves an explicit save action');
    assert.match(await page.locator('#missionFeedback').textContent(), /sunrise/i);
    assert.match(await page.locator('#missionAction').textContent(), /save this sunrise/i);
    assert.equal(await page.locator('#missionAction').isEnabled(), true);
    assert.equal(await page.locator('#cityMarker').isVisible(), true, 'the observed city must be visible at dawn');
    await inViewport(page, ['#missionGuide', '#scene', '#earthRotation', '#cityMarker'], 'phone sunrise evidence');
    await screenshot(page, 'observation-sunrise-phone');
    await page.waitForTimeout(500);
    assert.equal(await step(page), '2', 'a discovery must wait for explicit confirmation');
    await range(page, '#earthRotation', 300);
    assert.equal(await page.locator('#missionAction').isEnabled(), true,
      'continuing to explore must retain an already captured sunrise until it is saved');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'missionAction',
      'capturing dawn must move keyboard focus to the explicit save action');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Sunrise spotter');
    assert.equal(await page.locator('#passportCount').textContent(), '1 / 3');
    console.log('PASS city confirmation, forward sunrise evidence, passive/reverse rejection and visible phone lookout');

    await start(page, 'europa');
    const initialLight = await page.locator('#sunAngle').inputValue();
    await page.locator('[data-answer="1"]').click();
    assert.equal(await step(page), '0');
    assert.match(await page.locator('#missionFeedback').textContent(), /ice|surface|water|ocean/i);
    await page.locator('[data-answer="0"]').click();
    await waitStep(page, 1);
    assert.equal(await page.locator('#sunAngle').inputValue(), initialLight, 'recognizing a line needs no arbitrary slider distance');
    await page.locator('#missionAction').click();
    await waitStep(page, 2);
    await oceanVisible(page);
    await page.locator('[data-answer="1"]').click();
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Ocean detective');
    await oceanVisible(page);
    await inViewport(page, ['#missionGuide', '#europaCutaway'], 'earned ocean discovery retains its evidence');
    await screenshot(page, 'observation-europa-earned-phone');
    await page.locator('#missionEnd').click();
    assert.equal(await page.locator('#europaCutaway').isVisible(), false);
    assertClean(phone);
    await page.close();
    console.log('PASS Europa image observation, specific feedback, revealed ocean and retained completion evidence');

    const desktop = await newPage(browser, { reducedMotion: 'reduce' });
    page = desktop.page;
    await start(page, 'mercury');
    await page.locator('#missionAction').click();
    await waitStep(page, 1);
    await finishYear(page);
    await page.evaluate(() => { location.hash = '#venus'; });
    await ready(page);
    await page.locator('#missionReturn').click();
    await ready(page);
    await waitStep(page, 1);
    assert.equal(await page.locator('[data-answer]').count(), 0, 'returning to a reset year must remove stale quiz answers');
    assert.notEqual(await page.locator('#orbitTime').textContent(), 'Day 365');
    await finishYear(page);
    await page.locator('#orbitPlay').click();
    await waitStep(page, 1);
    assert.equal(await page.locator('[data-answer]').count(), 0, 'replaying time must require observing the year again');
    assert.equal(await page.locator('#passportCount').textContent(), '0 / 3', 'neither replay path awards a stale answer');
    await finishYear(page);
    await page.locator('[data-answer="1"]').click();
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Orbit explorer');
    await screenshot(page, 'observation-mercury-earned-desktop');
    assertClean(desktop);
    await page.close();
    console.log('PASS Mercury return and replay invalidate stale questions until a full year is observed again');
  } catch (error) {
    if (page && !page.isClosed()) {
      console.error('Failure screenshot:', await screenshot(page, 'mission-observations-failure').catch(() => 'unavailable'));
    }
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
