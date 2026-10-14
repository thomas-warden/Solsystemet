const {chromium}=require('playwright');
const assert=require('node:assert/strict');
// Start the static site first (see README). Playwright is only a development tool.
const baseURL=process.env.BASE_URL||'http://127.0.0.1:8087/';
(async()=>{
const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(60000);
const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`)});page.on('requestfailed',r=>{if(!r.url().includes('fonts.'))failed.push(r.url()+': '+r.failure().errorText)});
await page.goto(baseURL);await page.waitForFunction(()=>document.querySelector('#homeStage canvas')?.width>0);await page.waitForTimeout(1500);
assert.equal(await page.locator('#homeView').isVisible(),true);assert.equal(await page.locator('.mission-card').count(),3);
console.log('PASS home');
await page.locator('[data-start-mission="sunrise"]').focus();
await page.keyboard.press('Enter');
await page.waitForFunction(()=>document.activeElement?.id==='missionStepTitle');
await page.locator('#missionEnd').click();
await page.goto(baseURL+'#missions');
console.log('PASS keyboard mission entry');
await page.locator('[data-start-mission="sunrise"]').click();await page.waitForFunction(()=>document.querySelector('#atlas').dataset.world==='earth'&&!document.querySelector('#scene').classList.contains('is-loading'));
await page.locator('#missionAction').click();
async function slider(selector,value){await page.locator(selector).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));await page.waitForTimeout(250)}
for(let n=0;n<=1000;n+=50){if((await page.locator('#missionStepTitle').textContent()).includes('Bring'))break;await slider('#earthRotation',n)}
assert.match(await page.locator('#missionStepTitle').textContent(),/Bring/);
for(let n=0;n<=1000;n+=50){if((await page.locator('#missionStepTitle').textContent()).includes('Sunrise spotter'))break;await slider('#earthRotation',n)}
assert.equal(await page.locator('#missionStepTitle').textContent(),'Sunrise spotter');console.log('PASS sunrise mission');
await page.locator('#missionNext').click();await page.waitForFunction(()=>document.querySelector('#atlas').dataset.world==='europa'&&!document.querySelector('#scene').classList.contains('is-loading'));
await slider('#sunAngle',110);assert.equal(await page.locator('#missionStepTitle').textContent(),'Follow the icy moon');await page.locator('#missionAction').click();
await page.waitForFunction(()=>document.querySelector('#atlas').dataset.view==='moons'&&!document.querySelector('#moonStatus').textContent);
await page.locator('[data-answer="0"]').click();assert.ok((await page.locator('#missionFeedback').textContent()).includes('3.55'));
await page.locator('[data-answer="1"]').click();assert.equal(await page.locator('#missionStepTitle').textContent(),'Ocean detective');console.log('PASS Europa mission and incorrect answer guidance');
await page.locator('#missionNext').click();await page.waitForFunction(()=>document.querySelector('#atlas').dataset.view==='orrery'&&!document.querySelector('#orreryStatus').textContent);
await page.locator('#missionAction').click();await page.waitForTimeout(200);assert.match(await page.locator('#missionStepTitle').textContent(),/Watch/);
await slider('#orbitDay',1000);await page.locator('[data-answer="1"]').click();assert.equal(await page.locator('#missionStepTitle').textContent(),'Orbit explorer');console.log('PASS Mercury mission');
await page.locator('#missionNext').click();await page.waitForFunction(()=>document.querySelector('#homeView').hidden===false);assert.equal(await page.locator('#passportCount').textContent(),'3 / 3');
await page.reload();await page.waitForFunction(()=>document.querySelector('#passportCount')?.textContent==='3 / 3');console.log('PASS reload persistence');

await page.setViewportSize({width:390,height:844});await page.goto(baseURL);await page.waitForTimeout(1200);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log('PASS mobile width');
await page.setViewportSize({width:320,height:844});
for(const route of ['earth','europa','orrery/mercury']){await page.goto(baseURL+'#'+route);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' overflows at 320px');}
console.log('PASS narrow phone layouts');
console.log({errors,failed});assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
} finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
