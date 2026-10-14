import { PlanetRenderer } from './renderer.js';
import { FAMILIES } from './moons.js';
import { ORDER, WORLDS } from './worlds.js';
const $=id=>document.getElementById(id),root=$('atlas'),canvas=$('universe');
$('planetNav').innerHTML=ORDER.map(id=>`<button data-world="${id}" type="button"><i style="background:${WORLDS[id].color}"></i>${WORLDS[id].title}</button>`).join('');
$('worldCards').innerHTML=ORDER.map(id=>`<button data-world="${id}"><small>${WORLDS[id].number}</small><strong>${WORLDS[id].title}</strong></button>`).join('');
let orrery,orreryPromise,moonSystem,moonPromise,beltFlight,beltPromise,view='planet',stories,extraStories={};
fetch('assets/research/planet-stories-and-orbits.json').then(r=>r.json()).then(data=>{stories=data.planets;showStories();});
fetch('assets/research/extra-planet-stories.json').then(r=>r.json()).then(data=>{extraStories=data.planets||data;showStories();}).catch(()=>{});
function showStories(){
 const entries=[...(WORLDS[state.world].stories||stories?.[state.world]?.stories||[]),...(extraStories[state.world]?.stories||extraStories[state.world]||[])];
 $('storyGrid').replaceChildren();
 for(const story of entries){const el=document.createElement('article');el.className='story';const title=document.createElement('h3'),body=document.createElement('p'),link=document.createElement('a');title.textContent=story.title;body.textContent=story.text;link.href=story.source;link.target='_blank';link.rel='noopener';link.textContent='Field source ↗';el.append(title,body,link);$('storyGrid').append(el);}
}
async function showMoonSystem(parent){
 view='moons';beltFlight?.hide();$('beltView').hidden=true;window.scrollTo(0,0);root.classList.remove('cinema');orrery?.hide();$('main').hidden=true;$('fieldStories').hidden=true;$('orreryView').hidden=true;$('moonSystemView').hidden=false;root.dataset.view='moons';$('motionToggle').hidden=true;history.replaceState(null,'','#'+parent+'-moons');
 document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false');});
 try{moonPromise||=import('./moon-system.js').then(({MoonSystem})=>new MoonSystem());moonSystem=await moonPromise;if(view==='moons')moonSystem.show(parent);}catch(e){$('moonStatus').textContent='The moon system could not start. Individual moon views remain available below.';console.error(e);}
}
async function showOrrery(selected){beltFlight?.hide();$('beltView').hidden=true;moonSystem?.hide();$('moonSystemView').hidden=true;view='orrery';window.scrollTo(0,0);root.classList.remove('cinema');$('cinemaButton').setAttribute('aria-pressed','false');$('cinemaButton').textContent='View only ⤢';$('main').hidden=true;$('fieldStories').hidden=true;$('orreryView').hidden=false;root.dataset.view='orrery';$('motionToggle').hidden=true;history.replaceState(null,'','#orrery');document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','true');document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false');});
 try{orreryPromise||=import('./orrery.js').then(({Orrery})=>new Orrery());orrery=await orreryPromise;if(view==='orrery'){orrery.show();if(selected==='belt')orrery.showBelt();else if(selected)orrery.select(selected);else if(orrery.beltSelected){orrery.select('earth');orrery.fly('perspective');}}}catch(e){$('orreryStatus').textContent='The orbital scene could not start. Planet views remain available.';console.error(e);}}
async function showBeltEntry(){
 view='belt';window.scrollTo(0,0);root.classList.remove('cinema');orrery?.hide();moonSystem?.hide();
 for(const id of ['main','fieldStories','orreryView','moonSystemView'])$(id).hidden=true;
 $('beltView').hidden=false;root.dataset.view='belt';$('motionToggle').hidden=true;history.replaceState(null,'','#belt');
 document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');
 document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false');});
 try{beltPromise||=import('./belt.js').then(({BeltFlight})=>new BeltFlight());beltFlight=await beltPromise;if(view==='belt')beltFlight.show();}
 catch(e){$('beltStatus').textContent='The flight could not start on this device. You can still explore the stories below.';$('beltPlay').disabled=true;$('beltSpeed').disabled=true;console.error(e);}
}
$('locateBelt').onclick=()=>showOrrery('belt');
fetch('assets/research/moon-stories.json').then(r=>r.json()).then(data=>{
 for(const story of data.belt.stories){const article=document.createElement('article');article.className='story';const title=document.createElement('h3'),body=document.createElement('p'),link=document.createElement('a');title.textContent=story.title;body.textContent=story.text;link.href=story.source;link.target='_blank';link.rel='noopener';link.textContent='Field source ↗';article.append(title,body,link);$('beltEntryStories').append(article);}
}).catch(()=>{$('beltEntryStories').textContent='Discover more about these small worlds in the NASA sources linked in Field notes.';});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const profiles=WORLDS;
const cities={'abu-dhabi':{name:'Abu Dhabi',lon:54.37,lat:24.45},stockholm:{name:'Stockholm',lon:18.06,lat:59.33},tokyo:{name:'Tokyo',lon:139.69,lat:35.68},'new-york':{name:'New York',lon:-74.01,lat:40.71},quito:{name:'Quito',lon:-78.47,lat:-.18}};
const state={world:'earth',otherSpin:0,moonTilt:0,lightPhase:.943,axisTilt:98,titanSurface:false,earthProgress:.3,jupiterSpin:2.224,saturnSpin:.4,angle:24,renderAngle:24,spin:0,time:0,clouds:true,lights:true,zoom:0,storm:false,compare:false,particles:false,speed:1,running:!reduced.matches,motion:!reduced.matches,city:'abu-dhabi'};
let renderer,ready=false,last=0,lastReadout=0,drag=null;
const wrap=v=>((v%1)+1)%1;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function setRunning(value){state.running=value;state.motion=value;updateReadouts();}
function updateReadouts(){
 const p=profiles[state.world];
 $('playButton').setAttribute('aria-pressed',String(state.running));$('playIcon').textContent=state.running?'Ⅱ':'▶';$('playLabel').textContent=state.running?'Pause':p.play;
 $('motionToggle').hidden=view!=='planet';
 $('motionToggle').setAttribute('aria-pressed',String(state.motion));$('motionToggle').textContent=state.motion?'Motion on':'Motion off';
 $('earthRotation').value=Math.round(state.earthProgress*1000);
 const spin=state.earthProgress*Math.PI*2-1.3;
 const sunLon=(Math.atan2(-1.8,1.3)+spin)*180/Math.PI;
 const hour=wrap((12+(cities[state.city].lon-sunLon)/15)/24)*24;
 $('solarClock').textContent=String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor(hour%1*60)).padStart(2,'0');
 const c=cities[state.city],lat=c.lat*Math.PI/180,lon=c.lon*Math.PI/180-spin;
 const n=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];
 const daylight=n[0]*-1.8+n[1]*.55+n[2]*1.3>0;
 $('dayStatus').textContent=daylight?'Daylight':'Nighttime';
 $('jupiterReading').textContent='×'+state.speed.toFixed(1);$('saturnReading').textContent=state.angle+'°';$('saturnAngle').value=state.angle;
 $('stormButton').setAttribute('aria-pressed',String(state.storm));$('earthCompare').setAttribute('aria-pressed',String(state.compare));$('particleButton').setAttribute('aria-pressed',String(state.particles));
 $('compareLabel').hidden=state.world!=='jupiter'||!state.compare;
 positionComparison();
 $('phaseReading').textContent=state.lightPhase<.4?'Full light':state.lightPhase<1.25?'Gibbous':state.lightPhase<1.8?'Half light':'Crescent';$('tiltReading').textContent=state.axisTilt+'°';$('axisGuide').hidden=state.world!=='uranus';$('axisGuide').style.transform='translateX(-50%) rotate('+state.axisTilt+'deg)';
 const turn=Math.abs(state.otherSpin-Math.PI*2)<1e-6?360:Math.round(wrap(state.otherSpin/(Math.PI*2))*360);$('uranusSpin').value=turn;$('spinReading').textContent=turn+'°';
 $('particleInsight').hidden=state.world!=='saturn'||!state.particles;
 for(const [id,a] of [['saturnTop',55],['saturnEdge',0],['saturnBelow',-35]])$(id).classList.toggle('is-active',state.angle===a);
 positionCity(n);
}
function positionCity(n){
 const c=cities[state.city],lat=c.lat*Math.PI/180,lon=c.lon*Math.PI/180-(state.earthProgress*Math.PI*2-1.3);
 n=n||[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];
 const a=.15,r=-.12;const y=Math.cos(a)*n[1]-Math.sin(a)*n[2],z=Math.sin(a)*n[1]+Math.cos(a)*n[2];const x=Math.cos(r)*n[0]-Math.sin(r)*y,yy=Math.sin(r)*n[0]+Math.cos(r)*y;
 const rect=canvas.getBoundingClientRect(),half=1.13,aspect=rect.width/rect.height;
 $('cityMarker').hidden=state.world!=='earth'||z<.12||!ready;
 $('cityMarker').style.left=(.5+x/(2*half*aspect))*rect.width+'px';$('cityMarker').style.top=(.5-yy/(2*half))*rect.height+'px';$('cityMarkerName').textContent=c.name;
}
function positionComparison(){
 const half=1.13+(.64-1.13)*state.zoom,r=canvas.getBoundingClientRect();
 // GRS centre on the historical map; same model-to-view transform as the shader.
 const lat=-.127*Math.PI,lon=.354*Math.PI*2-state.jupiterSpin;
 const x=Math.cos(lat)*Math.sin(lon),y=.935*Math.sin(lat),z=Math.cos(lat)*Math.cos(lon);
 const yy=Math.cos(.04)*y-Math.sin(.04)*z,xx=Math.cos(.035)*x-Math.sin(.035)*yy,ys=Math.sin(.035)*x+Math.cos(.035)*yy;
 $('compareLabel').style.left=(r.width/2+xx*r.height/(2*half)+.0892*r.height/(2*half)+9)+'px';
 $('compareLabel').style.top=(r.height/2-(ys+.39*state.zoom)*r.height/(2*half))+'px';
}
async function switchWorld(world){
 if(world==='belt'){await showBeltEntry();return;}
 if(world==='orrery'||world==='orrery-belt'){await showOrrery(world==='orrery-belt'?'belt':undefined);return;}
 if(world.endsWith('-moons')&&FAMILIES[world.replace('-moons','')]){await showMoonSystem(world.replace('-moons',''));return;}
 moonSystem?.hide();$('moonSystemView').hidden=true;beltFlight?.hide();$('beltView').hidden=true;
 view='planet';window.scrollTo(0,0);if(orrery)orrery.hide();$('main').hidden=false;$('fieldStories').hidden=false;$('orreryView').hidden=true;root.dataset.view='planet';$('motionToggle').hidden=false;document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');
 if(!profiles[world])world='earth';state.world=world;state.running=!reduced.matches;state.motion=!reduced.matches;state.particles=false;state.storm=false;state.zoom=0;state.compare=false;state.otherSpin=world==='mars'?3.9:world==='mimas'?.9:0;state.moonTilt=0;state.lightPhase=.943;state.axisTilt=98;$('sunAngle').value=54;$('axisTilt').value=98;ready=false;
 const p=profiles[world];root.dataset.world=world;
 for(const [id,value] of Object.entries({chapterNumber:p.number,chapterKind:p.chapter,worldLead:p.lead,worldText:p.text,experimentQuestion:p.question,experimentHint:p.hint,gestureText:p.gesture,sceneCaption:p.caption,modelNote:p.note,factValue:p.fact,factUnit:p.unit}))$(id).textContent=value;
 $('worldTitle').innerHTML=p.title.replace(/^The /,'')+'<span>.</span>';root.classList.toggle('moon-detail',!!p.parent);
 canvas.setAttribute('aria-label','Interactive '+p.title+'. '+(world==='saturn'?'Drag vertically to change the viewpoint.':p.parent?'Drag or use arrow keys to turn and tilt the moon.':'Drag to turn the world.'));
 for(const w of ['earth','jupiter','saturn'])$(w+'Instrument').hidden=w!==world;
 $('otherInstrument').hidden=['earth','jupiter','saturn'].includes(world);$('tiltControl').hidden=world!=='uranus';$('phaseControl').hidden=world==='uranus';$('findOrbit').textContent=p.parent?'See '+WORLDS[p.parent].title+' and its moons ↗':'Find '+p.title+' in the orrery ↗';$('titanSurface').hidden=world!=='titan';state.titanSurface=false;$('titanSurface').setAttribute('aria-pressed','false');$('titanSurface').textContent='Look beneath the haze ↗';$('spinControl').hidden=world!=='uranus';$('spinGuideNote').hidden=world!=='uranus';const family=p.parent||world;$('familyLink').hidden=!FAMILIES[family];$('familyLink').href='#'+family+'-moons';$('familyLink').textContent=p.parent?'← The '+WORLDS[family].title+' system':'Explore '+(family==='earth'?'the Moon':(FAMILIES[family]?.length||0)+' moons')+' ↗';showStories();
 document.querySelectorAll('button[data-world]').forEach(b=>{const active=b.dataset.world===world;b.classList.toggle('is-active',active);b.classList.toggle('is-current',active);b.setAttribute('aria-pressed',String(active));});
 $('fallbackPlanet').src=p.parent?'assets/research/'+p.map:'assets/'+world+'-still.jpg';$('fallbackPlanet').classList.toggle('map-fallback',!!p.parent);$('fallbackPlanet').alt=p.title+' illustration; interactive rendering is unavailable.';
 history.replaceState(null,'','#'+world);$('assetStatus').textContent='Loading surface maps';updateReadouts();
 if(renderer)await renderer.setWorld(world);
}
function unavailable(message){
 ready=false;root.classList.add('no-webgl');$('fallbackPlanet').hidden=false;$('assetStatus').textContent='Still illustration';$('cityMarker').hidden=true;
 document.querySelectorAll('.instrument input,.instrument select,.instrument button,#playButton').forEach(el=>el.disabled=true);
 console.error('Solsystemet:',message);toast(message);
}
try{renderer=new PlanetRenderer(canvas,()=>{ready=true;root.classList.remove('no-webgl');$('fallbackPlanet').hidden=true;$('assetStatus').textContent='';document.querySelectorAll('.instrument input,.instrument select,.instrument button,#playButton').forEach(el=>el.disabled=false);updateReadouts();},unavailable);}catch(e){unavailable(e.message);}
document.querySelectorAll('button[data-world]').forEach(b=>b.onclick=()=>switchWorld(b.dataset.world));
document.querySelector('.brand').onclick=e=>{e.preventDefault();showOrrery();};
document.querySelector('button[data-view="orrery"]').onclick=()=>showOrrery();
$('findOrbit').onclick=()=>profiles[state.world].parent?showMoonSystem(profiles[state.world].parent):showOrrery(state.world);
$('uranusSpin').oninput=e=>{state.otherSpin=Number(e.target.value)*Math.PI/180;state.motion=false;setRunning(false);};
$('titanSurface').onclick=()=>{state.titanSurface=!state.titanSurface;$('titanSurface').setAttribute('aria-pressed',String(state.titanSurface));$('titanSurface').textContent=state.titanSurface?'Return to the orange haze ↙':'Look beneath the haze ↗';$('sceneCaption').textContent=state.titanSurface?'TITAN / RECONSTRUCTED SURFACE · INFRARED & RADAR':profiles.titan.caption;$('modelNote').textContent=state.titanSurface?'RECONSTRUCTED MAP · NOT A VISIBLE-LIGHT VIEW · SEE FIELD NOTES':profiles.titan.note;};
$('sunAngle').oninput=e=>{state.lightPhase=Number(e.target.value)*Math.PI/180;updateReadouts();};
$('axisTilt').oninput=e=>{state.axisTilt=Number(e.target.value);updateReadouts();};
$('citySelect').onchange=e=>{state.city=e.target.value;updateReadouts();};
$('earthRotation').oninput=e=>{state.earthProgress=Number(e.target.value)/1000;state.motion=false;setRunning(false);};
$('cloudToggle').onchange=e=>state.clouds=e.target.checked;$('lightsToggle').onchange=e=>state.lights=e.target.checked;
$('jupiterTime').oninput=e=>{state.speed=1+Number(e.target.value)*.1;updateReadouts();};
$('saturnAngle').oninput=e=>{state.angle=Number(e.target.value);updateReadouts();};
for(const [id,angle] of [['saturnTop',55],['saturnEdge',0],['saturnBelow',-35]])$(id).onclick=()=>{state.angle=angle;updateReadouts();};
$('stormButton').onclick=()=>{state.storm=!state.storm;if(state.storm)state.jupiterSpin=2.224;else state.compare=false;updateReadouts();};
$('earthCompare').onclick=()=>{state.compare=!state.compare;if(state.compare){state.storm=true;state.jupiterSpin=2.224;state.motion=false;state.running=false;}updateReadouts();};
$('particleButton').onclick=()=>{state.particles=!state.particles;if(state.particles){state.motion=true;state.running=true;}updateReadouts();};
$('playButton').onclick=()=>setRunning(!state.running);
$('motionToggle').onclick=()=>setRunning(!state.motion);
$('resetButton').onclick=()=>{Object.assign(state,{earthProgress:.3,jupiterSpin:2.224,saturnSpin:.4,otherSpin:state.world==='mars'?3.9:state.world==='mimas'?.9:0,moonTilt:0,lightPhase:.943,axisTilt:98,titanSurface:false,angle:24,storm:false,zoom:0,compare:false,particles:false,speed:1,running:!reduced.matches,motion:!reduced.matches,time:0,clouds:true,lights:true});$('cloudToggle').checked=true;$('lightsToggle').checked=true;$('jupiterTime').value=0;$('sunAngle').value=54;$('axisTilt').value=98;$('titanSurface').setAttribute('aria-pressed','false');$('titanSurface').textContent='Look beneath the haze ↗';$('sceneCaption').textContent=profiles[state.world].caption;$('modelNote').textContent=profiles[state.world].note;updateReadouts();};
$('cinemaButton').onclick=()=>{const active=root.classList.toggle('cinema');$('cinemaButton').setAttribute('aria-pressed',String(active));$('cinemaButton').textContent=active?'Return to exploration ↙':'View only ⤢';};
$('aboutButton').onclick=()=>{$('aboutPanel').showModal();$('aboutButton').setAttribute('aria-expanded','true');};
$('closeAbout').onclick=()=>$('aboutPanel').close();$('aboutPanel').onclose=()=>{$('aboutButton').setAttribute('aria-expanded','false');$('aboutButton').focus();};
$('aboutPanel').onclick=e=>{if(e.target===$('aboutPanel')){const r=$('aboutPanel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('aboutPanel').close();}};
$('lowPower').onchange=e=>{if(renderer){renderer.quality=e.target.checked?.6:1;renderer.resize();}};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('belt-cinema'))beltFlight?.toggleCinema();if(e.key==='Escape'&&root.classList.contains('cinema'))$('cinemaButton').click();});
reduced.addEventListener('change',e=>{if(e.matches){state.motion=false;state.running=false;updateReadouts();}});
function move(dx,dy){if(state.world==='earth')state.earthProgress=wrap(state.earthProgress-dx/900);else if(state.world==='jupiter'){state.jupiterSpin-=dx*.008;state.storm=false;state.compare=false;}else if(state.world==='saturn')state.angle=Math.round(Math.max(-70,Math.min(70,state.angle-dy*.25)));else{state.otherSpin-=dx*.008;if(profiles[state.world].parent)state.moonTilt=Math.max(-75,Math.min(75,state.moonTilt-dy*.25));}state.running=false;state.motion=false;updateReadouts();}
canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(drag){move(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0,e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0);}};
window.addEventListener('hashchange',()=>switchWorld(location.hash.slice(1)));
function frame(ts){
 const dt=Math.min((ts-last)/1000||.016,.05);last=ts;
 if(!document.hidden&&view==='belt'&&beltFlight)beltFlight.frame(dt);
 if(!document.hidden&&view==='moons'&&moonSystem)moonSystem.frame(dt,ts);
 if(!document.hidden&&view==='orrery'&&orrery)orrery.frame(dt,ts);
 if(!document.hidden&&ready&&view==='planet'){
  if(state.motion){state.time+=dt*(state.running?3:1);if(state.world==='earth')state.earthProgress=wrap(state.earthProgress-dt/(state.running?35:900));if(state.world==='jupiter'&&!state.storm)state.jupiterSpin+=dt*(state.running?.035:.007);if(state.world==='saturn')state.saturnSpin+=dt*.035;state.otherSpin+=dt*(state.world==='uranus'?(state.running?.72:.09):(state.running?.13:.012))*(state.world==='venus'?-1:1);}
  const k=reduced.matches?1:1-Math.exp(-dt*6);state.zoom+=((state.storm?1:0)-state.zoom)*k;state.renderAngle+=(state.angle-state.renderAngle)*k;
  state.spin=state.world==='earth'?state.earthProgress*Math.PI*2-1.3:state.world==='jupiter'?state.jupiterSpin:state.world==='saturn'?state.saturnSpin:state.otherSpin;
  renderer.render({...state,angle:profiles[state.world].parent?state.moonTilt:state.renderAngle});
  if(ts-lastReadout>100){updateReadouts();lastReadout=ts;}
 }
 requestAnimationFrame(frame);
}
switchWorld(location.hash.slice(1)||'earth');requestAnimationFrame(frame);
