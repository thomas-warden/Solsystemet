const { assert, launch, visit, ready } = require('./browser-helpers.cjs');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.TEST_ARTIFACTS || '/tmp/city-explorer/integration';
const safe = value => String(value).replace(/([?&]key=)[^&\s]+/g, '$1[redacted]');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// These provider fixtures test integration and failure handling. They are not
// evidence that a real Google key or real satellite imagery has been verified.
function mapsFixture(callback, authFailure = false) {
  if (authFailure) return `window.gm_authFailure?.(); window[${JSON.stringify(callback)}]?.();`;
  return `(() => {
    class MapFixture {
      constructor(host, options) {
        this.host=host;this.center=options.center;this.zoom=options.zoom;this.options=options;
        window.__mapFixture=this;window.__mapConstructs=(window.__mapConstructs||0)+1;
        host.innerHTML='<div style="position:absolute;inset:0;background:linear-gradient(135deg,#23454a,#67795c);display:grid;place-items:center;color:white;font:12px Arial">Satellite map TEST FIXTURE — not Google imagery</div><button data-provider-zoom style="position:absolute;right:10px;bottom:30px;width:44px;height:44px;color:black;background:white">+</button><span data-provider-attribution style="position:absolute;bottom:0;left:0;background:white;color:black;padding:3px;font:11px Arial">Provider attribution test fixture</span>';
        host.querySelector('[data-provider-zoom]').onclick=()=>this.zoom++;
      }
      setCenter(value){this.center=value;}
      setZoom(value){this.zoom=value;}
      getZoom(){return this.zoom;}
    }
    window.google={maps:{Map:MapFixture,event:{
      addListenerOnce(map,type,callback){const token=setTimeout(callback,30);return{remove(){clearTimeout(token);}};},
      trigger(){},clearInstanceListeners(){}
    }}};
    window[${JSON.stringify(callback)}]?.();
  })();`;
}
function weatherFixture(latitude, stale = false) {
  const temperature = latitude > 50 ? 12 : latitude < -40 ? 17 : 21;
  return { current: { time: Math.floor(Date.now()/900000)*900-(stale?10800:0), interval:900,
    temperature_2m:temperature,apparent_temperature:temperature-1,relative_humidity_2m:65,
    weather_code:2,is_day:1,precipitation:0,wind_speed_10m:12,wind_direction_10m:225 },
    current_units:{time:'unixtime',temperature_2m:'°C',wind_speed_10m:'km/h'} };
}
async function create(browser, { key=true, viewport={width:1385,height:804}, reducedMotion='reduce', weather, mapAuthFailures=0, mapDelay=0, moduleDelay=0 }={}) {
  const page=await browser.newPage({viewport,reducedMotion});page.setDefaultTimeout(60000);
  const result={page,errors:[],failures:[],mapRequests:0,weatherRequests:[]};
  page.on('pageerror',error=>result.errors.push(safe(error.message)));
  page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource/.test(message.text()))result.errors.push(safe(message.text()));});
  page.on('response',response=>{if(response.status()>=400)result.failures.push(`${response.status()} ${safe(response.url())}`);});
  page.on('requestfailed',request=>{if(request.failure()?.errorText!=='net::ERR_ABORTED')result.failures.push(`${safe(request.url())}: ${request.failure()?.errorText}`);});
  await page.route('**/app.js*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+`\nwindow.__cityTest={read:()=>({world:state.world,earthProgress:state.earthProgress,earthViewYaw:state.earthViewYaw,earthViewPitch:state.earthViewPitch,earthCityZoom:state.earthCityZoom,running:state.running,city:state.city,flight:!!cityFlight,revealing:cityRevealing,open:!!cityExplorer?.active}),instance:()=>cityExplorer};`});
  });
  await page.route('**/renderer.js*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nconst cityOriginalRender=PlanetRenderer.prototype.render;PlanetRenderer.prototype.render=function(...args){window.__cityPlanetRenders=(window.__cityPlanetRenders||0)+1;return cityOriginalRender.apply(this,args);};`});
  });
  await page.route('**/site-config.js*',route=>route.fulfill({contentType:'text/javascript',body:`export const GOOGLE_MAPS_BROWSER_KEY=${JSON.stringify(key?'test-browser-key-not-real':'')};`}));
  await page.route('**/city-explorer.js*',async route=>{const response=await route.fetch();if(moduleDelay)await sleep(moduleDelay);const body=await response.text()+`
const testOpenCity=CityExplorer.prototype.open;CityExplorer.prototype.open=function(...args){if(!this.active){const marker=document.querySelector('#cityMarker'),canvas=document.querySelector('#universe').getBoundingClientRect();window.__cityArrival={dx:parseFloat(marker.style.left)-canvas.width/2,dy:parseFloat(marker.style.top)-canvas.height/2};}return testOpenCity.apply(this,args);};`;await route.fulfill({response,body}).catch(()=>{});});
  await page.route('https://maps.googleapis.com/maps/api/js*',async route=>{
    result.mapRequests++;const callback=new URL(route.request().url()).searchParams.get('callback');
    if(mapDelay)await sleep(mapDelay);
    await route.fulfill({contentType:'text/javascript',body:mapsFixture(callback,result.mapRequests<=mapAuthFailures)}).catch(()=>{});
  });
  await page.route('https://api.open-meteo.com/v1/forecast*',async route=>{
    const url=new URL(route.request().url());result.weatherRequests.push(Object.fromEntries(url.searchParams));
    if(weather)return weather(route,url,result.weatherRequests.length);
    await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(weatherFixture(Number(url.searchParams.get('latitude'))))});
  });
  return result;
}
function clean(result, expected=[]) {
  assert.deepEqual(result.errors,[],'No browser/shader errors');
  const unexpected=result.failures.filter(message=>!expected.some(pattern=>pattern.test(message)));
  assert.deepEqual(unexpected,[],'No unexpected application failures');
}
async function capture(page,name) {fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,name+'.png')});}
async function openCity(page,id,{map='ready'}={}) {
  await page.locator('#citySelect').selectOption(id);await page.locator('#cityVisit').click();
  await page.waitForFunction(id=>window.__cityTest.instance()?.active&&document.querySelector('#cityExplorer').dataset.city===id,id);
  await page.waitForFunction(state=>document.querySelector('#cityExplorer').dataset.mapState===state,map);
  await page.waitForFunction(()=>['ready','stale','error'].includes(document.querySelector('#cityExplorer').dataset.weatherState));
}
async function closeCity(page){await page.locator('[data-city-close]').click();await page.waitForFunction(()=>!window.__cityTest.read().open);}

async function flights(browser) {
  const result=await create(browser,{reducedMotion:'no-preference'}),{page}=result;
  await visit(page,'earth');
  assert.equal(result.mapRequests,0,'No map service before deliberate visit');
  assert.equal(result.weatherRequests.length,0,'No city weather before deliberate visit');
  assert.equal(await page.locator('#citySelect option').count(),8);
  assert.equal(await page.evaluate(()=>window.__cityTest.read().running),true,'Earth starts with its default motion');
  await page.locator('#playButton').click();
  for(const id of ['birmingham','wellington','melbourne']) {
    const before=await page.evaluate(()=>window.__cityTest.read());
    await openCity(page,id);
    const after=await page.evaluate(()=>window.__cityTest.read());
    assert.equal(after.earthProgress,before.earthProgress,'City flight does not change simulated solar time');
    assert.equal(after.earthCityZoom,1,'Actual Earth camera zoom reaches the city');
    // Measure the visible globe arrival before the atlas changes its container size.
    const center=await page.evaluate(()=>window.__cityArrival);
    assert(Math.abs(center.dx)<1&&Math.abs(center.dy)<1,`${id} is centred by actual latitude/longitude projection`);
    const renders=await page.evaluate(()=>window.__cityPlanetRenders);await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>window.__cityPlanetRenders),renders,'Hidden globe stops rendering under the city');
    assert(await page.locator('[data-city-weather-updated]').textContent().then(text=>/Updated.*local/.test(text)));
    assert.match(await page.locator('.city-explorer-note').textContent(),/actual local time|model clock/);
    assert.equal(result.weatherRequests.at(-1).timeformat,'unixtime');
    await capture(page,'city-'+id);
    await closeCity(page);
    const restored=await page.evaluate(()=>window.__cityTest.read());
    for(const field of ['earthViewYaw','earthViewPitch','earthCityZoom','running'])assert.equal(restored[field],before[field],`Return restores ${field}`);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'cityVisit','Return preserves useful keyboard focus');
  }
  await page.locator('#playButton').click();await openCity(page,'melbourne');await closeCity(page);
  assert.equal(await page.evaluate(()=>window.__cityTest.read().running),true,'A moving Earth resumes after returning from its city');
  clean(result);await page.close();console.log('PASS city flights: new locations, centred cameras, model-time separation, paused hidden globe and restoration');
}
async function missingKey(browser) {
  const result=await create(browser,{key:false}),{page}=result;await visit(page,'earth');await openCity(page,'birmingham',{map:'unavailable'});
  assert.equal(result.mapRequests,0,'Blank key never sends a Google script request');
  assert.match(await page.locator('[data-city-map-title]').textContent(),/isn’t available/);
  const link=new URL(await page.locator('[data-city-external]').getAttribute('href'));
  assert.equal(link.searchParams.get('center'),'52.4862,-1.8904');assert.equal(link.searchParams.get('basemap'),'satellite');
  assert.match(await page.locator('[data-city-temperature]').textContent(),/12/);
  await capture(page,'city-missing-key');await page.keyboard.press('Escape');assert.equal(await page.locator('#cityExplorer').isVisible(),false);
  clean(result);await page.close();console.log('PASS missing-key fallback is truthful, external satellite link and current weather remain usable');
}
async function weatherRecovery(browser) {
  let mode='valid';
  const result=await create(browser,{weather:async(route,url)=>{
    const latitude=Number(url.searchParams.get('latitude'));
    if(mode==='failed')return route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'});
    if(mode==='offline')return route.abort('internetdisconnected');
    if(mode==='malformed')return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"current":{"time":"wrong"}}'});
    if(mode==='delayed'&&latitude< -40)await sleep(650);
    await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(weatherFixture(latitude,mode==='stale'))}).catch(()=>{});
  }}),{page}=result;await visit(page,'earth');await openCity(page,'birmingham');
  mode='failed';await page.locator('[data-city-weather-refresh]').click();await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='stale');
  assert.equal(await page.locator('[data-city-temperature]').textContent(),'12°','Failed refresh retains labelled last data');assert.match(await page.locator('[data-city-weather-status]').textContent(),/last available/);
  mode='valid';await page.locator('[data-city-weather-refresh]').click();await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='ready');
  mode='offline';await page.locator('[data-city-weather-refresh]').click();await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='stale');
  assert.equal(await page.locator('[data-city-temperature]').textContent(),'12°','Disconnected refresh keeps the last reading clearly stale');
  mode='valid';await page.locator('[data-city-weather-refresh]').click();await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='ready');
  mode='malformed';await page.locator('[data-city-select]').selectOption('wellington');await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='error');assert.equal(await page.locator('[data-city-temperature]').textContent(),'—','Malformed new-city data cannot masquerade as zero weather');
  mode='delayed';await page.locator('[data-city-weather-refresh]').click();await page.locator('[data-city-select]').selectOption('melbourne');await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='ready');await page.waitForTimeout(800);
  assert.equal(await page.locator('[data-city-temperature]').textContent(),'21°','Late Wellington response cannot overwrite Melbourne');
  assert.match(await page.locator('[data-city-name]').textContent(),/Melbourne/);
  assert.match(await page.locator('[data-city-country]').textContent(),/Australia/);
  assert.equal(await page.locator('#citySelect').inputValue(),'melbourne','Internal selection remains linked to Earth city selection');
  mode='stale';await page.locator('[data-city-weather-refresh]').click();await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='stale');assert.match(await page.locator('[data-city-weather-status]').textContent(),/may have changed/);
  await capture(page,'city-weather-stale');
  clean(result,[/^503 https:\/\/api.open-meteo.com/,/^https:\/\/api.open-meteo.com.*net::ERR_INTERNET_DISCONNECTED/]);await page.close();console.log('PASS weather errors, offline retry, stale timestamps and rapid-city response isolation');
}
async function weatherTimeout(browser) {
  let hold=true,release;
  const stalled=new Promise(resolve=>release=resolve);
  const result=await create(browser,{key:false,weather:async(route,url)=>{
    if(hold)await stalled;
    await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(weatherFixture(Number(url.searchParams.get('latitude'))))}).catch(()=>{});
  }}),{page}=result;
  try{
    await visit(page,'earth');await page.clock.install();
    await page.locator('#citySelect').selectOption('birmingham');await page.locator('#cityVisit').click();
    await page.waitForFunction(()=>window.__cityTest.read().open&&document.querySelector('#cityExplorer').dataset.weatherState==='loading');
    await page.clock.fastForward(12500);
    await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='error');
    assert.equal(await page.locator('[data-city-temperature]').textContent(),'—','Timed-out fetch cannot present invented weather');
    hold=false;release();await page.locator('[data-city-weather-refresh]').click();
    await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.weatherState==='ready');
    assert.equal(await page.locator('[data-city-temperature]').textContent(),'12°','Manual retry recovers after timeout');
    clean(result);console.log('PASS actual weather timeout and manual retry without invented data');
  }finally{release();await page.close();}
}
async function motionPreference(browser) {
  const result=await create(browser,{reducedMotion:'no-preference'}),{page}=result;await visit(page,'earth');
  await page.locator('#citySelect').selectOption('wellington');await page.locator('#cityVisit').click();
  await page.waitForFunction(()=>window.__cityTest.read().flight&&window.__cityTest.read().earthCityZoom>0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>window.__cityTest.read().open);
  assert.equal(await page.evaluate(()=>window.__cityTest.read().earthCityZoom),1,'Motion preference changes settle the camera at the city');
  await closeCity(page);assert.equal(await page.evaluate(()=>window.__cityTest.read().running),false,'Return respects the new reduced-motion preference');
  clean(result);await page.close();console.log('PASS reduced-motion change settles an active flight and keeps return paused');
}
async function mapRecovery(browser) {
  const result=await create(browser,{mapAuthFailures:1}),{page}=result;await visit(page,'earth');
  const discoveries=await page.locator('#passportCount').textContent();
  await openCity(page,'wellington',{map:'unavailable'});
  await page.locator('[data-city-map-retry]').click();await page.waitForFunction(()=>document.querySelector('#cityExplorer').dataset.mapState==='ready');
  assert.equal(result.mapRequests,2,'Retry fetches a fresh provider script after auth failure');
  const attribution=await page.locator('[data-provider-attribution]').boundingBox(),map=await page.locator('.city-map-region').boundingBox(),weather=await page.locator('.city-weather').boundingBox();
  assert(attribution.y+attribution.height<=map.y+map.height+1&&attribution.y>=map.y,'Provider attribution stays within its map');
  assert(weather.y>=map.y+map.height-1,'Weather does not cover provider attribution');
  await page.locator('[data-provider-zoom]').click();assert.equal(await page.evaluate(()=>window.__mapFixture.zoom),15);
  await page.locator('[data-city-map-reset]').click();assert.equal(await page.evaluate(()=>window.__mapFixture.zoom),14);
  assert.equal(await page.locator('#passportCount').textContent(),discoveries,'Provider controls do not collect unrelated discoveries');
  clean(result);await page.close();console.log('PASS map auth fallback/retry and unobstructed provider controls/attribution (test fixture)');
}
async function cancellation(browser) {
  const result=await create(browser,{mapDelay:450,moduleDelay:500}),{page}=result;await visit(page,'earth');
  await page.locator('#citySelect').selectOption('melbourne');await page.locator('#cityVisit').click();await page.evaluate(()=>location.hash='venus');await ready(page);await page.waitForTimeout(850);
  assert.equal(await page.locator('#cityExplorer').isVisible(),false,'Late city import cannot open over another planet');
  await page.evaluate(()=>location.hash='earth');await ready(page);await page.locator('#cityVisit').click();await page.waitForFunction(()=>window.__cityTest.read().open);await page.evaluate(()=>location.hash='jupiter');await ready(page);await page.waitForTimeout(650);
  assert.equal(await page.locator('#cityExplorer').isVisible(),false,'Late provider response cannot revive a departed city');
  clean(result);await page.close();console.log('PASS late module/provider navigation cancellation');
}
async function stories(browser) {
  const result=await create(browser),{page}=result;await visit(page,'earth');
  const earthStories=await page.locator('#storyGrid h3').allTextContents();
  await openCity(page,'wellington');
  for(const id of ['wellington','birmingham','melbourne','abu-dhabi','stockholm','tokyo','new-york','quito']){
    await page.locator('[data-city-select]').selectOption(id);
    assert.equal(await page.locator('#storyGrid .story').count(),2,'Two city stories');
    assert.equal(await page.locator('#storyGrid a').count(),2,'Each story links to its source');
    const name=await page.locator('[data-city-name]').textContent();
    assert.match(await page.locator('#fieldStories').getAttribute('aria-label'),new RegExp(name));
    assert((await page.locator('#storyGrid h3').allTextContents()).every(title=>!earthStories.includes(title)),'City selection replaces Earth stories');
  }
  await page.locator('[data-city-story-link]').click();assert.equal(new URL(page.url()).hash,'#earth','Story link scrolls without changing the app route');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Imagine that.','Story heading receives keyboard focus');
  await closeCity(page);assert.deepEqual(await page.locator('#storyGrid h3').allTextContents(),earthStories,'Earth stories return with Earth');
  clean(result);await page.close();console.log('PASS all eight sourced city stories, keyboard jump and Earth return');
}
async function missionCity(browser) {
  const result=await create(browser,{viewport:{width:320,height:720}}),{page}=result;
  await visit(page,'missions');await page.locator('[data-start-mission="sunrise"]').click();await ready(page);await openCity(page,'wellington');
  assert(await page.locator('[data-city-name]').isVisible(),'City survives the phone mission DOM arrangement');
  await page.locator('[data-city-zoom-in]').click();assert.equal(await page.evaluate(()=>window.__mapFixture.zoom),15,'Custom map zoom changes provider camera');
  await page.locator('[data-city-zoom-out]').click();assert.equal(await page.evaluate(()=>window.__mapFixture.zoom),14);
  await page.locator('[data-city-story-link]').click();assert(await page.locator('#fieldStories').isVisible(),'City stories remain available during a mission');
  assert.equal(await page.locator('#atlas').getAttribute('data-mission-step'),'0','Exploring facts does not award a mission');
  await capture(page,'city-mission-stories-320');await closeCity(page);
  assert(await page.locator('#missionAction').isVisible(),'Return restores mission controls');
  clean(result);await page.close();console.log('PASS phone mission city, custom zoom, visible stories and deliberate progress');
}
async function responsive(browser) {
  for(const viewport of [{width:390,height:844},{width:320,height:720},{width:844,height:390}]) {
    const result=await create(browser,{viewport}),{page}=result;await visit(page,'earth');await openCity(page,'melbourne');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'City layout fits horizontally');
    for(const selector of ['[data-city-close]','[data-city-select]','[data-city-weather-refresh]','[data-city-map-reset]','[data-city-zoom-in]','[data-city-zoom-out]','[data-city-story-link]']){
      const box=await page.locator(selector).boundingBox();assert(box,selector+' must be visible');assert(box.height>=44&&box.width>=44,`${selector} is a comfortable target (${box.width}×${box.height} at ${viewport.width}px)`);
    }
    const expected=await page.evaluate(()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Melbourne',hour:'2-digit',minute:'2-digit'}).format(new Date()));assert.equal(await page.locator('[data-city-now]').textContent(),expected,'Local clock uses selected city timezone');
    await page.locator('[data-city-select]').focus();await page.keyboard.press('Home');await page.keyboard.press('End');await page.keyboard.press('Tab');
    await capture(page,'city-'+viewport.width);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#cityExplorer').isVisible(),false);
    clean(result);await page.close();console.log('PASS city keyboard and responsive layout '+viewport.width+'×'+viewport.height);
  }
}
(async()=>{const browser=await launch();try{for(const test of [flights,missingKey,weatherRecovery,weatherTimeout,mapRecovery,cancellation,motionPreference,stories,missionCity,responsive])if(!process.env.TEST_CITY_FILTER||test.name.includes(process.env.TEST_CITY_FILTER))await test(browser);}finally{await browser.close();}})().catch(error=>{console.error(safe(error.stack||error));process.exitCode=1;});
