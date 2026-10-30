const {assert,launch,visit}=require('./browser-helpers.cjs');
const {create,openCity,closeCity,clean}=require('./city-explorer.cjs');
const fs=require('node:fs');fs.mkdirSync('/tmp/city-activities',{recursive:true});
const change=async(p,value)=>p.locator('.activity-controls input').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
const open=async p=>{await p.locator('.city-experiment summary').click();await p.waitForFunction(()=>document.querySelector('.city-activities').dataset.activityState==='ready');};
(async()=>{
 const {CITY_ACTIVITIES,activityState}=await import('../city-activity-models.js');
 assert.equal(Object.keys(CITY_ACTIVITIES).length,15);
 assert.equal(activityState('cloud',0).cloud,0);assert(activityState('cloud',90).cloud>.5);
 assert(Math.abs(activityState('daylight',0).stockholm-12)<.01);assert(activityState('daylight',25).stockholm>18);assert(Math.abs(activityState('daylight',25).quito-12)<.05);assert(activityState('daylight',75).stockholm<6);
 assert(activityState('altitude',72).temp<activityState('altitude',0).temp);assert.equal(activityState('altitude',72).height,1800);
 assert(activityState('wind',0).strength>activityState('wind',100).strength);assert(activityState('estuary',25).flow>0&&activityState('estuary',75).flow<0);assert(Math.abs(activityState('estuary',50).flow)<.001);
 assert.equal(activityState('quake',90).goal,false);assert.equal(activityState('quake',90,{released:true}).goal,true);console.log('PASS cloud threshold, day length, altitude cooling, wind, tidal reversal and explicit fault release');
 const b=await launch();try{
 const result=await create(b,{viewport:{width:1385,height:1000},reducedMotion:'reduce'}),{page:p}=result;await visit(p,'earth');
 for(const [city,def]of Object.entries(CITY_ACTIVITIES)){
  if(process.env.TEST_ACTIVITY_CITIES&&!process.env.TEST_ACTIVITY_CITIES.split(',').includes(city))continue;
  await openCity(p,city);assert.equal(await p.locator('.city-activities canvas').count(),0,'Closed activity does not allocate a renderer');await open(p);
  assert.equal(await p.locator('.city-activities').getAttribute('data-discovered'),'false','Arrival never earns discovery');
  const initial=await p.locator('.activity-stage canvas').screenshot();await change(p,10);await change(p,def.id==='altitude'?72:def.id==='daylight'?25:def.id==='estuary'?75:def.id==='wind'?0:90);
  const changed=await p.locator('.activity-stage canvas').screenshot();assert(!initial.equals(changed),city+' visibly responds to its control');
  assert.equal(await p.locator('.city-activities').getAttribute('data-discovered'),'true',city+' observes an intentional result');
  const stable=await p.evaluate(()=>window.__cityTest.instance().activities.scene.time);await p.waitForTimeout(120);assert.equal(await p.evaluate(()=>window.__cityTest.instance().activities.scene.time),stable,'Reduced motion remains stationary');
  await p.locator('.activity-reset').click();assert.equal(await p.locator('.city-activities').getAttribute('data-discovered'),'false');
  if(city==='wellington'){await p.locator('[data-mode=quake]').click();await p.waitForFunction(()=>document.querySelector('.city-activities').dataset.activityState==='ready');assert(await p.locator('.activity-release').isDisabled());await change(p,90);await p.locator('.activity-release').click();assert.equal(await p.locator('.city-activities').getAttribute('data-discovered'),'true');await p.locator('.city-activities').screenshot({path:'/tmp/city-activities/quake.png'});}
  await p.locator('.city-experiment summary').click();await p.waitForFunction(()=>!window.__cityTest.instance().activities.scene);await closeCity(p);console.log('PASS activity',city);
 }
 await openCity(p,'cape-town');await open(p);await p.setViewportSize({width:390,height:844});await change(p,90);await p.locator('.city-activities').screenshot({path:'/tmp/city-activities/phone-cloud.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const fit=await p.locator('.activity-controls input').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.activity-controls').getBoundingClientRect();return a.right<=b.right+1;});assert(fit,'Phone slider stays inside its controls');
 await p.locator('.activity-play').click();await p.waitForTimeout(250);assert(await p.evaluate(()=>window.__cityTest.instance().activities.scene.time>0),'Explicit Play works with reduced motion');
 await p.evaluate(()=>{window.activityMotionChanged=false;window.__cityTest.instance().activities.reduced.addEventListener('change',e=>{if(!e.matches)window.activityMotionChanged=true;},{once:true});});await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>window.activityMotionChanged);await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!window.__cityTest.instance().activities.playing);
 await p.locator('.activity-controls input').focus();const val=Number(await p.locator('.activity-controls input').inputValue());await p.keyboard.press('ArrowLeft');assert.equal(Number(await p.locator('.activity-controls input').inputValue()),val-1);
 await p.setViewportSize({width:320,height:720});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.setViewportSize({width:844,height:390});await p.locator('.activity-stage').scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await closeCity(p);clean(result);await p.close();
 // Module failure gives an explanation and retry; retry creates a working scene.
 const failure=await create(b),q=failure.page;let blocked=true;await q.route('**/city-activity-scene.js*',r=>blocked?r.abort():r.continue());await visit(q,'earth');await openCity(q,'cairo');await q.locator('.city-experiment summary').click();await q.waitForFunction(()=>document.querySelector('.city-activities').dataset.activityState==='error');assert(await q.locator('.activity-loading').textContent().then(t=>t.includes('Sediment')));blocked=false;await q.locator('.activity-loading button').click();await q.waitForFunction(()=>document.querySelector('.city-activities').dataset.activityState==='ready');await q.close();
 console.log('PASS phone/landscape, keyboard, play/pause, live motion changes, module failure and retry');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
