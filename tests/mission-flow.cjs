const {
  assert, launch, newPage, visit, ready, range, inViewport, screenshot, assertClean,
} = require('./browser-helpers.cjs');

const step = page => page.locator('#atlas').getAttribute('data-mission-step');

async function completionFocus(page) {
  await page.waitForFunction(() => document.activeElement?.id === 'missionStepTitle');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'missionNext',
    'Tab from a completed discovery should reach the next mission');
}

async function revealedOcean(page) {
  await page.waitForFunction(() => {
    const overlay = document.querySelector('#europaCutaway .europa-unopened');
    const shell = document.querySelector('#europaCutaway .europa-ice-shell');
    const ocean = document.querySelector('#europaCutaway .europa-inside');
    return Number(getComputedStyle(overlay).opacity) < .01 &&
      new DOMMatrixReadOnly(getComputedStyle(shell).transform).m42 < -19.9 &&
      getComputedStyle(ocean).visibility === 'visible' && ocean.getBoundingClientRect().height > 0;
  });
}

async function start(page, id) {
  await visit(page, 'missions');
  await page.locator(`[data-start-mission="${id}"]`).click();
  await ready(page);
  await page.waitForFunction(() => document.querySelector('#atlas').classList.contains('mission-active'));
}

async function earthLight(page, wanted) {
  for (let value = 0; value <= 1000; value += 100) {
    await range(page, '#earthRotation', value);
    if (await page.locator('#dayStatus').textContent() === wanted) return value;
  }
  throw new Error(`Earth never reached ${wanted}`);
}

async function checkFit(page, activeControl, scene = '#scene') {
  await page.waitForTimeout(250);
  const viewport = page.viewportSize(), label = `${viewport.width}×${viewport.height} mission`;
  const boxes = await inViewport(page, ['#missionGuide', scene, activeControl], label);
  assert.ok(boxes[scene].height >= (viewport.height < 500 ? 100 : 140), `${label}: scene too small to observe`);
  const guide = boxes['#missionGuide'], world = boxes[scene];
  const overlapWidth = Math.min(guide.right, world.right) - Math.max(guide.x, world.x);
  const overlapHeight = Math.min(guide.bottom, world.bottom) - Math.max(guide.y, world.y);
  assert.ok(overlapWidth <= 1 || overlapHeight <= 1, `${label}: guide covers the world`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
}

(async () => {
  const browser = await launch();
  let page;
  try {
    const result = await newPage(browser);
    page = result.page;
    if (!process.env.TEST_LAYOUT_ONLY) {
    await visit(page);
    assert.equal(await page.locator('#homeView').isVisible(), true);
    assert.equal(await page.locator('.mission-card').count(), 3);
    await page.locator('[data-start-mission="sunrise"]').focus();
    await page.keyboard.press('Enter');
    await ready(page);
    await page.waitForFunction(() => document.activeElement?.id === 'missionStepTitle');
    await page.locator('#missionEnd').click();
    console.log('PASS welcome and keyboard mission entry');

    await start(page, 'sunrise');
    const night = await earthLight(page, 'Nighttime');
    assert.equal(await step(page), '0', 'rotating before choosing a city must not skip city selection');
    await page.locator('#missionAction').click();
    await page.waitForTimeout(700);
    assert.equal(await step(page), '1', 'an already-dark city must not pass an observation without input');
    await range(page, '#earthRotation', night);
    assert.equal(await step(page), '2');
    await page.waitForTimeout(700);
    assert.equal(await step(page), '2', 'nighttime alone must not earn the sunrise badge');
    await earthLight(page, 'Daylight');
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Sunrise spotter');
    await completionFocus(page);
    console.log('PASS sunrise requires deliberate observations');

    await page.locator('#missionNext').click();
    await ready(page);
    assert.equal(await step(page), '0');
    await range(page, '#sunAngle', 60);
    assert.equal(await step(page), '0', 'a tiny lighting adjustment must not finish observing cracks');
    await range(page, '#sunAngle', 110);
    assert.equal(await step(page), '0', 'light movement needs an explicit observation');
    await page.locator('#missionAction').click();
    assert.equal(await step(page), '1');
    assert.equal(await page.locator('#europaCutaway').evaluate(element => element.classList.contains('is-open')), false);
    await page.locator('#missionAction').click();
    assert.equal(await step(page), '2');
    await revealedOcean(page);
    assert.equal(await page.locator('#europaCutaway').isVisible(), true);
    assert.equal(await page.locator('#europaCutaway').evaluate(element => element.classList.contains('is-open')), true);
    assert.match(await page.locator('#europaCutaway').textContent(), /ocean/i);
    await page.locator('[data-answer="0"]').click();
    assert.equal(await step(page), '2');
    assert.ok((await page.locator('#missionFeedback').textContent()).trim(), 'incorrect answer needs useful feedback');
    await page.locator('[data-answer="1"]').click();
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Ocean detective');
    await completionFocus(page);
    console.log('PASS Europa crack observation, illustrated ocean reveal, and answer feedback');

    await page.locator('#missionNext').click();
    await ready(page);
    await page.locator('#missionAction').click();
    assert.equal(await step(page), '1');
    await page.locator('#orbitDay').focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('#atlas').dataset.missionStep === '2');
    await page.locator('[data-answer="0"]').click();
    assert.equal(await step(page), '2');
    await page.locator('[data-answer="1"]').click();
    assert.equal(await page.locator('#missionStepTitle').textContent(), 'Orbit explorer');
    await completionFocus(page);
    await page.locator('#missionNext').click();
    await page.waitForFunction(() => !document.querySelector('#homeView').hidden);
    assert.equal(await page.locator('#passportCount').textContent(), '3 / 3');
    await page.reload();
    await ready(page);
    assert.equal(await page.locator('#passportCount').textContent(), '3 / 3');
    console.log('PASS Mercury experiment, all badges, and persistence');
    }

    // These are functional viewport checks, not a mobile hardware performance claim.
    const viewports = process.env.TEST_FLOW_ONLY ? [] : process.env.TEST_VIEWPORTS ? process.env.TEST_VIEWPORTS.split(',').map(value => {
      const [width, height] = value.split('x').map(Number); return { width, height };
    }) : [
      { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 320, height: 568 },
      { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1024, height: 768 },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await start(page, 'sunrise');
      await checkFit(page, '#citySelect');
      await page.locator('#missionAction').click();
      await checkFit(page, '#earthRotation');
      await screenshot(page, `sunrise-${viewport.width}x${viewport.height}`);
      await page.locator('#missionEnd').click();
      await start(page, 'europa');
      await checkFit(page, '#sunAngle');
      await range(page, '#sunAngle', 110);
      await page.locator('#missionAction').click();
      await checkFit(page, '#missionAction');
      await page.locator('#missionAction').click();
      await revealedOcean(page);
      await inViewport(page, ['#missionGuide', '#europaCutaway', '[data-answer="1"]'], 'Europa reveal');
      await screenshot(page, `europa-${viewport.width}x${viewport.height}`);
      await page.locator('#missionEnd').click();
      await start(page, 'mercury');
      await checkFit(page, '#missionAction', '#orreryStage');
      await page.locator('#missionAction').click();
      await checkFit(page, '#orbitDay', '#orreryStage');
      await screenshot(page, `mercury-${viewport.width}x${viewport.height}`);
      await page.locator('#missionEnd').click();
      console.log(`PASS simultaneous guide, scene, and active control at ${viewport.width}×${viewport.height}`);
    }
    assertClean(result);
    if (process.env.TEST_LAYOUT_ONLY) return;

    await start(page, 'sunrise');
    await page.evaluate(() => { location.hash = '#venus'; });
    await ready(page);
    await page.waitForSelector('#missionReturn');
    assert.equal(await page.locator('#atlas').evaluate(element => element.classList.contains('mission-active')), false);
    await page.locator('#missionReturn').click();
    await ready(page);
    await page.waitForFunction(() => document.querySelector('#atlas').dataset.world === 'earth');
    assert.equal(await step(page), '0');
    await page.locator('#missionEnd').click();
    console.log('PASS leave and return without losing the mission');
    assertClean(result);
    await page.close();

    const blocked = await newPage(browser, { reducedMotion: 'reduce' });
    page = blocked.page;
    await blocked.page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await visit(blocked.page, 'missions');
    assert.equal(await blocked.page.locator('#passportStorage').textContent(), 'Collected for this visit');
    await blocked.page.locator('[data-start-mission="europa"]').click();
    await ready(blocked.page);
    assert.equal(await blocked.page.locator('#playButton').getAttribute('aria-pressed'), 'false');
    await range(blocked.page, '#sunAngle', 110);
    await blocked.page.locator('#missionAction').click();
    await blocked.page.locator('#missionAction').click();
    await blocked.page.locator('[data-answer="1"]').click();
    assert.equal(await blocked.page.locator('#missionStepTitle').textContent(), 'Ocean detective');
    assertClean(blocked);
    await blocked.page.close();
    console.log('PASS reduced-motion mission with storage unavailable');
  } catch (error) {
    if (page) console.error('Failure screenshot:', await screenshot(page, 'mission-failure').catch(() => 'unavailable'));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
