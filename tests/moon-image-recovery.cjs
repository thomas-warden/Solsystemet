const { assert, baseURL, launch, newPage, ready, range, assertClean, screenshot } = require('./browser-helpers.cjs');

const images = {
  moon: '/assets/research/moons/moon.jpg',
  clouds: '/assets/orbits/clouds.jpg',
  earth: '/assets/orbits/earth.jpg',
};

async function instrument(page) {
  // Observe the real scene without adding a production-only test hook.
  await page.route('**/moon-system.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + `
const recoveryShow=MoonSystem.prototype.show;
MoonSystem.prototype.show=function(...args){window.__recoveryScene=this;return recoveryShow.apply(this,args);};` });
  });
}

async function navigate(page, route) {
  await page.evaluate(route => { location.hash = route; }, route);
  await ready(page);
}

async function failedImages(page) {
  await page.locator('#moonRetry').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#moonRetry').disabled);
  assert.ok(await page.locator('#moonStatus').textContent(), 'Failed imagery needs an explanation');
}

async function restored(page) {
  await page.waitForFunction(() => !document.querySelector('#moonStatus').textContent);
  assert.equal(await page.locator('#moonRetry').isVisible(), false);
}

async function sceneState(page) {
  return page.evaluate(() => {
    const s = window.__recoveryScene;
    return { days: s.days, playing: s.playing, selected: s.selected,
      camera: s.camera.position.toArray(), target: s.controls.target.toArray() };
  });
}

function expectedFailureOnly(result, path) {
  assert.deepEqual(result.failed.filter(message => !(message.startsWith('503 ') && message.includes(path))), [],
    'Only the deliberately failed image request may fail');
  assert.equal(result.failed.filter(message => message.startsWith('503 ') && message.includes(path)).length, 1,
    'The fixture should fail once, without hidden retry loops');
  result.failed.length = 0;
  assertClean(result);
}

(async () => {
  const browser = await launch();
  let page;
  try {
    for (const image of ['moon', 'clouds']) {
      for (const recovery of ['revisit', 'button']) {
        const result = await newPage(browser, { reducedMotion: recovery === 'button' ? 'reduce' : 'no-preference' });
        page = result.page;
        await instrument(page);
        const counts = Object.fromEntries(Object.keys(images).map(key => [key, 0]));
        page.on('request', request => {
          const path = new URL(request.url()).pathname;
          for (const [key, value] of Object.entries(images)) if (path === value) counts[key]++;
        });
        let blocked = true, release;
        const gate = new Promise(resolve => { release = resolve; });
        await page.route('**' + images[image], async route => {
          if (blocked) return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporary image failure fixture' });
          if (recovery === 'button') await gate;
          return route.continue();
        });
        await page.goto(baseURL + '#earth-moons/moon', { waitUntil: 'domcontentloaded' });
        await failedImages(page);
        const beforeFailure = await page.evaluate(() => {
          const s = window.__recoveryScene, earth = s.items.earth.mesh;
          return { moon: !!s.items.moon.mesh.material.map, earth: !!earth.material.map,
            clouds: earth.children.filter(child => child.name === 'earth-clouds').length,
            atmosphere: earth.children.filter(child => child.name === 'earth-atmosphere').length };
        });
        assert.equal(beforeFailure.earth, true, 'A missing secondary image must preserve Earth’s loaded surface');
        assert.equal(beforeFailure.moon, image !== 'moon');
        assert.equal(beforeFailure.clouds, image === 'clouds' ? 0 : 1);
        assert.equal(beforeFailure.atmosphere, 1, 'Earth’s atmosphere does not depend on its cloud image');
        if (image === 'clouds') assert.match(await page.locator('#moonStatus').textContent(), /cloud/i,
          'Optional cloud failure must identify the missing layer honestly');
        assert.equal(counts[image], 1);
        blocked = false;
        if (recovery === 'revisit') {
          // A different detail page avoids requesting this family’s textures in
          // the independent close-up renderer and obscuring the request count.
          await navigate(page, 'mars');
          await navigate(page, 'earth-moons/moon');
          await restored(page);
          assert.equal(await page.locator('#moonPlay').getAttribute('aria-pressed'), 'true',
            'A normal revisit still starts motion');
        } else {
          await range(page, '#moonDay', 625);
          await page.locator('#moonCanvas').scrollIntoViewIfNeeded();
          await page.locator('#moonCanvas').focus();
          await page.keyboard.press('ArrowRight');
          const beforeRetry = await sceneState(page);
          assert.equal(beforeRetry.playing, false);
          await page.locator('#moonRetry').click();
          assert.equal(await page.evaluate(() => document.activeElement.id), 'moonCanvas',
            'Explicit Retry keeps keyboard focus in the scene before its button is disabled');
          await page.waitForFunction(() => document.querySelector('#moonRetry').disabled);
          // Exercise overlapping callers as well as the disabled UI control.
          await page.evaluate(() => {
            window.__recoveryScene.retryImages();
            window.__recoveryScene.retryImages();
            document.querySelector('#moonRetry').click();
          });
          await page.waitForTimeout(150);
          assert.equal(counts[image], 2, 'Overlapping retries must share one image request');
          if (image === 'clouds') await page.locator('#moonTop').focus();
          release();
          await restored(page);
          assert.equal(await page.evaluate(() => document.activeElement.id), image === 'clouds' ? 'moonTop' : 'moonCanvas',
            'Image completion must not steal focus from a control chosen while loading');
          assert.deepEqual(await sceneState(page), beforeRetry,
            'Explicit image recovery must preserve paused time, selection and camera');
        }
        const after = await page.evaluate(() => {
          const s = window.__recoveryScene, earth = s.items.earth.mesh;
          return { moon: !!s.items.moon.mesh.material.map,
            clouds: earth.children.filter(child => child.name === 'earth-clouds').length,
            atmosphere: earth.children.filter(child => child.name === 'earth-atmosphere').length };
        });
        assert.deepEqual(after, { moon: true, clouds: 1, atmosphere: 1 });
        for (const key of Object.keys(images)) assert.equal(counts[key], key === image ? 2 : 1,
          'Only the failed image is requested again: ' + key);
        expectedFailureOnly(result, images[image]);
        await page.close();
        console.log(`PASS ${image} failure and ${recovery}: image restored, successful images reused, atmosphere intact`);
      }
    }

    const giant = await newPage(browser, { reducedMotion: 'reduce' });
    page = giant.page; await instrument(page);
    let ioRequests = 0;
    await page.route('**/assets/research/moons/io.jpg', route => {
      // The visible moon cards use the same image as a CSS background. Fail
      // the CORS-enabled Three texture request, not an unrelated card preview.
      if (!route.request().headers().origin) return route.continue();
      return ++ioRequests === 1 ? route.fulfill({ status: 503, contentType: 'text/plain',
        body: 'Temporary Io map failure fixture' }) : route.continue();
    });
    await page.goto(baseURL + '#jupiter-moons/io', { waitUntil: 'domcontentloaded' });
    await failedImages(page);
    for (const parent of ['earth', 'saturn', 'jupiter']) {
      await navigate(page, parent + '-moons');
      const rig = await page.evaluate(() => {
        const s = window.__recoveryScene;
        return { parent: s.parent, sun: s.sunlight.color.getHex(), intensity: s.sunlight.intensity,
          ambient: s.ambientLight.color.getHex(), fill: s.ambientLight.intensity };
      });
      assert.equal(rig.parent, parent);
      if (parent === 'earth') assert.ok(rig.fill < .08);
      else assert.deepEqual(rig, { parent, sun: 0xffedcf, intensity: 2.9, ambient: 0x73879a, fill: .34 });
    }
    assert.equal(ioRequests, 2);
    assert.equal(await page.evaluate(() => !!window.__recoveryScene.items.io.mesh.material.map), true);
    expectedFailureOnly(giant, '/assets/research/moons/io.jpg');
    await page.close();
    console.log('PASS failed giant-family image recovers after switching families and all lighting rigs restore');

    const delayed = await newPage(browser, { reducedMotion: 'reduce' });
    page = delayed.page; await instrument(page);
    let moonRequests = 0, release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**' + images.moon, async route => {
      if (++moonRequests === 1) return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporary Moon map failure fixture' });
      await gate; return route.continue();
    });
    await page.goto(baseURL + '#earth-moons/moon', { waitUntil: 'domcontentloaded' });
    await failedImages(page);
    await page.evaluate(() => {
      window.__retiredMoon = window.__recoveryScene.items.moon.mesh;
      document.querySelector('#moonRetry').click();
      window.__pendingMoonRetry = window.__recoveryScene.retryImages();
    });
    await navigate(page, 'jupiter-moons/europa');
    const currentFamily = () => page.evaluate(() => ({ parent: window.__recoveryScene.parent,
      ids: Object.keys(window.__recoveryScene.items), title: document.querySelector('#moonSystemTitle').textContent,
      status: document.querySelector('#moonStatus').textContent, hash: location.hash }));
    const beforeCompletion = await currentFamily();
    release();
    await page.evaluate(() => window.__pendingMoonRetry);
    assert.deepEqual(await currentFamily(), beforeCompletion, 'Old image completion must not alter the active family or its status');
    assert.equal(await page.evaluate(() => window.__retiredMoon.material.map), null,
      'A retired scene’s disposed material must not be patched by a late completion');
    await navigate(page, 'earth-moons/moon');
    assert.equal(await page.evaluate(() => !!window.__recoveryScene.items.moon.mesh.material.map), true);
    assert.equal(moonRequests, 2, 'The successful late image remains reusable on return');
    expectedFailureOnly(delayed, images.moon);
    console.log('PASS delayed retry respects family changes and returns with the recovered cached texture');
  } catch (error) {
    if (page && !page.isClosed()) console.error('Recovery failure screenshot:', await screenshot(page, 'moon-image-recovery-failure').catch(() => 'unavailable'));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
