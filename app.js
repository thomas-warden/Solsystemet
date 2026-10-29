import { CITIES } from './cities.js?v=ee3f09657be8';
import { createMissions } from './missions.js?v=ee3f09657be8';
import { PlanetRenderer } from './renderer.js?v=ee3f09657be8';
import { FAMILIES } from './moons.js?v=ee3f09657be8';
import { resolveRoute, renderFamilyNavigation, renderMoonShelf, renderMoonSystemNavigation } from './navigation.js?v=ee3f09657be8';
import { ORDER, WORLDS } from './worlds.js?v=ee3f09657be8';
const $=id=>document.getElementById(id),root=$('atlas'),canvas=$('universe');
$('planetNav').innerHTML=ORDER.map(id=>`<button data-world="${id}" type="button"><i style="background:${WORLDS[id].color}"></i>${WORLDS[id].title}</button>`).join('');
$('worldCards').innerHTML=ORDER.map(id=>`<button data-world="${id}"><small>${WORLDS[id].number}</small><strong>${WORLDS[id].title}</strong></button>`).join('');
let orrery,orreryPromise,orreryAttempt=0,moonSystem,moonPromise,beltFlight,beltPromise,view='planet',moonTarget='',stories,extraStories={},orreryAvailability='loading';
function loadOrrery(){
 // Browsers cache failed module downloads, so a retry needs a fresh URL.
 return orreryPromise||=import('./orrery.js?v=ee3f09657be8'+(orreryAttempt?'&retry='+orreryAttempt:'')).then(({Orrery})=>new Orrery()).catch(error=>{orreryPromise=null;orreryAttempt++;throw error;});
}
fetch('assets/research/planet-stories-and-orbits.json').then(r=>r.json()).then(data=>{stories=data.planets;showStories();}).catch(()=>{});
fetch('assets/research/extra-planet-stories.json').then(r=>r.json()).then(data=>{extraStories=data.planets||data;showStories();}).catch(()=>{});
function showStories(){
 const entries=[...(WORLDS[state.world].stories||stories?.[state.world]?.stories||[]),...(extraStories[state.world]?.stories||extraStories[state.world]||[])];
 $('storyGrid').replaceChildren();
 for(const story of entries){const el=document.createElement('article');el.className='story';const title=document.createElement('h3'),body=document.createElement('p'),link=document.createElement('a');title.textContent=story.title;body.textContent=story.text;link.href=story.source;link.target='_blank';link.rel='noopener';link.textContent='Field source ↗';el.append(title,body,link);if(story.related){const next=document.createElement('a');next.className='story-next';next.href='#'+story.related;next.textContent=story.action;el.append(next);}$('storyGrid').append(el);}
}
async function showMoonSystem(parent,selected,experiment){
 moonTarget=parent+'/'+(selected||'')+'/'+(experiment||'orbits');const target=moonTarget;renderMoonSystemNavigation(parent,selected);$('moonDiscoveries').hidden=true;
 view='moons';beltFlight?.hide();$('beltView').hidden=true;window.scrollTo(0,0);root.classList.remove('cinema');orrery?.hide();$('main').hidden=true;$('fieldStories').hidden=true;$('orreryView').hidden=true;$('moonSystemView').hidden=false;root.dataset.view='moons';
 document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false');});
 try{moonPromise||=import('./moon-system.js?v=ee3f09657be8').then(({MoonSystem})=>new MoonSystem());moonSystem=await moonPromise;if(view==='moons'&&moonTarget===target)await moonSystem.show(parent,selected,experiment);}catch(e){$('moonLoadNotice').hidden=false;$('moonStatus').textContent='This moving view could not start. Open a moon below.';$('moonRetry').hidden=true;console.error(e);}
}
async function showOrrery(selected){$('moonDiscoveries').hidden=true;document.title='The solar system — Solsystemet';beltFlight?.hide();$('beltView').hidden=true;moonSystem?.hide();$('moonSystemView').hidden=true;view='orrery';orreryAvailability='loading';window.scrollTo(0,0);root.classList.remove('cinema');$('cinemaButton').setAttribute('aria-pressed','false');$('cinemaButton').textContent='View only ⤢';$('main').hidden=true;$('fieldStories').hidden=true;$('orreryView').hidden=false;root.dataset.view='orrery';document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','true');document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false');});
 document.querySelectorAll('#orreryView button,#orreryView input,#orreryView select').forEach(el=>el.disabled=true);
 try{orrery=await loadOrrery();if(view==='orrery'){orrery.show();if(selected==='belt')orrery.showBelt();else if(selected)orrery.select(selected);else if(orrery.beltSelected){orrery.select('earth');orrery.fly('perspective');}orreryAvailability='ready';document.querySelectorAll('#orreryView button,#orreryView input,#orreryView select').forEach(el=>el.disabled=false);}}catch(e){orreryAvailability='unavailable';$('orreryStatus').textContent='The orbital scene could not start. Planet views remain available.';console.error(e);}}
async function showBeltEntry(){
 $('moonDiscoveries').hidden=true;document.title='The asteroid belt — Solsystemet';
 view='belt';window.scrollTo(0,0);root.classList.remove('cinema');orrery?.hide();moonSystem?.hide();
 for(const id of ['main','fieldStories','orreryView','moonSystemView'])$(id).hidden=true;
 $('beltView').hidden=false;root.dataset.view='belt';
 document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');
 document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false');});
 try{beltPromise||=import('./belt.js?v=ee3f09657be8').then(({BeltFlight})=>new BeltFlight());beltFlight=await beltPromise;if(view==='belt')beltFlight.show();}
 catch(e){$('beltStatus').textContent='The flight could not start on this device. You can still explore the stories below.';$('beltPlay').disabled=true;$('beltSpeed').disabled=true;console.error(e);}
}
$('locateBelt').onclick=()=>navigate('orrery/belt');
fetch('assets/research/moon-stories.json').then(r=>r.json()).then(data=>{
 for(const story of data.belt.stories){const article=document.createElement('article');article.className='story';const title=document.createElement('h3'),body=document.createElement('p'),link=document.createElement('a');title.textContent=story.title;body.textContent=story.text;link.href=story.source;link.target='_blank';link.rel='noopener';link.textContent='Field source ↗';article.append(title,body,link);$('beltEntryStories').append(article);}
}).catch(()=>{$('beltEntryStories').textContent='Discover more about these small worlds in the NASA sources linked in Field notes.';});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const profiles=WORLDS;
const cities=CITIES;
$('citySelect').replaceChildren(...Object.values(cities).map(city=>{const option=document.createElement('option');option.value=city.id;option.textContent=city.name;return option;}));
const state={world:'earth',earthViewYaw:0,earthViewPitch:0,earthCityZoom:0,otherSpin:0,moonTilt:0,lightPhase:.943,axisTilt:98,titanSurface:false,venusEnhanced:true,venusSurface:false,earthProgress:.3,jupiterSpin:2.224,saturnSpin:.4,angle:24,renderAngle:24,spin:0,time:0,clouds:true,lights:true,zoom:0,storm:false,compare:false,particles:false,speed:1,running:!reduced.matches,city:'abu-dhabi'};
let renderer,ready=false,last=0,lastReadout=0,drag=null,venusRequest=0,titanRequest=0,lastPlanetFrame='',rendererFailure='',earthInput=null;
const releaseMotion={x:0,y:0};
let cityExplorer,cityModulePromise,cityModuleAttempt=0,cityVisitRequest=0,cityFlight=null,citySnapshot=null,cityRevealing=false,cityCaption='';
const sceneVisibility=new WeakMap();
const sceneObserver=new IntersectionObserver(entries=>{for(const entry of entries)sceneVisibility.set(entry.target,entry.isIntersecting);},{threshold:0});
for(const el of document.querySelectorAll('canvas'))sceneObserver.observe(el);
const isSceneVisible=id=>{const el=$(id);return el&&sceneVisibility.get(el)!==false;};
const wrap=v=>((v%1)+1)%1;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function setRunning(value){releaseMotion.x=releaseMotion.y=0;state.running=value;updateReadouts();}
function setSunriseView(active){
 const yaw=active?-Math.PI*.8:0,caption=active?'EARTH / WATCHING THE DAWN SIDE':profiles.earth.caption;
 if(citySnapshot){citySnapshot.earthViewYaw=yaw;cityCaption=caption;return;}
 if(state.earthViewYaw!==yaw){state.earthViewYaw=yaw;lastPlanetFrame='';updateReadouts();}
 if(state.world==='earth')$('sceneCaption').textContent=caption;
}
function captureSunrise(from,to){
 // Locate the actual night-to-day crossing along the user's forward time input.
 // This holds the observation at the boundary instead of awarding a skipped scene.
 const city=cities[state.city],lat=city.lat*Math.PI/180;
 const lit=value=>{const lon=city.lon*Math.PI/180-((1-value/1000)*Math.PI*2-1.3);return Math.cos(lat)*(-1.8*Math.sin(lon)+1.3*Math.cos(lon))+.55*Math.sin(lat)>0;};
 let night=from,day=to;for(let i=0;i<24;i++){const middle=(night+day)/2;if(lit(middle))day=middle;else night=middle;}
 state.earthProgress=1-day/1000;setRunning(false);lastPlanetFrame='';
}
function updateReadouts(){
 const p=profiles[state.world];
 $('playButton').setAttribute('aria-pressed',String(state.running));$('playIcon').textContent=state.running?'Ⅱ':'▶';$('playLabel').textContent=state.running?'Pause':state.world==='venus'&&state.venusSurface?'Watch the backward turn':p.play;
 $('earthRotation').value=Math.round((1-state.earthProgress)*1000);
 const spin=state.earthProgress*Math.PI*2-1.3;
 const sunLon=(Math.atan2(-1.8,1.3)+spin)*180/Math.PI;
 const hour=wrap((12+(cities[state.city].lon-sunLon)/15)/24)*24;
 $('solarClock').textContent=String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor(hour%1*60)).padStart(2,'0');
 const c=cities[state.city],lat=c.lat*Math.PI/180,lon=c.lon*Math.PI/180-spin;
 const n=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];
 const daylight=n[0]*-1.8+n[1]*.55+n[2]*1.3>0;
 $('dayStatus').textContent=daylight?'Daylight':'Nighttime';
 $('earthRotation').setAttribute('aria-valuetext',cities[state.city].name+', '+$('solarClock').textContent+' model solar time, '+$('dayStatus').textContent);
 $('jupiterReading').textContent='×'+state.speed.toFixed(1);$('saturnReading').textContent=Math.round(state.angle)+'°';$('saturnAngle').value=state.angle;
 $('stormButton').setAttribute('aria-pressed',String(state.storm));$('earthCompare').setAttribute('aria-pressed',String(state.compare));$('particleButton').setAttribute('aria-pressed',String(state.particles));
 $('compareLabel').hidden=state.world!=='jupiter'||!state.compare;
 positionComparison();
 $('phaseReading').textContent=state.lightPhase<.4?'Fully lit':state.lightPhase<1.25?'Mostly lit':state.lightPhase<1.8?'Half lit':'Thin crescent';$('tiltReading').textContent=state.axisTilt+'°';$('axisGuide').hidden=state.world!=='uranus';$('axisGuide').style.transform='translateX(-50%) rotate('+state.axisTilt+'deg)';
 const turn=Math.abs(state.otherSpin-Math.PI*2)<1e-6?360:Math.round(wrap(state.otherSpin/(Math.PI*2))*360);$('uranusSpin').value=turn;$('spinReading').textContent=turn+'°';
 $('particleInsight').hidden=state.world!=='saturn'||!state.particles;
 for(const [id,a] of [['saturnTop',55],['saturnEdge',0],['saturnBelow',-35]])$(id).classList.toggle('is-active',state.angle===a);
 positionCity(n);syncCityControls();
}
function positionCity(n){
 const c=cities[state.city],lat=c.lat*Math.PI/180,lon=c.lon*Math.PI/180-(state.earthProgress*Math.PI*2-1.3);
 n=n||[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];
 const yaw=state.earthViewYaw,cameraX=Math.cos(yaw)*n[0]-Math.sin(yaw)*n[2],cameraZ=Math.sin(yaw)*n[0]+Math.cos(yaw)*n[2];
 const a=.15+state.earthViewPitch,r=-.12;const y=Math.cos(a)*n[1]-Math.sin(a)*cameraZ,z=Math.sin(a)*n[1]+Math.cos(a)*cameraZ;const x=Math.cos(r)*cameraX-Math.sin(r)*y,yy=Math.sin(r)*cameraX+Math.cos(r)*y;
 const rect=canvas.getBoundingClientRect(),half=1.13*(1-.85*state.earthCityZoom),aspect=rect.width/rect.height;
 $('cityMarker').hidden=state.world!=='earth'||z<.12||!ready||!!cityExplorer?.active;
 $('cityMarker').style.left=(.5+x/(2*half*aspect))*rect.width+'px';$('cityMarker').style.top=(.5-yy/(2*half))*rect.height+'px';$('cityMarkerName').textContent=c.name;
}
function syncCityControls(){
 const travelling=!!cityFlight||cityRevealing,open=!!cityExplorer?.active;
 const button=$('cityVisit');if(button){button.disabled=travelling;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-busy',String(travelling));button.textContent=travelling?'Travelling…':'Explore city ↗';}
 if(state.world==='earth'){
  for(const id of ['earthRotation','cloudToggle','lightsToggle','playButton'])$(id).disabled=!ready||travelling||open;
  $('citySelect').disabled=false;
 }
}
function closeCity({focus=true}={}){
 cityVisitRequest++;
 if(cityFlight){cityFlight.resolve(false);cityFlight=null;}
 cityRevealing=false;cityExplorer?.close({notify:false});
 if(citySnapshot){const saved=citySnapshot;citySnapshot=null;Object.assign(state,saved);if(reduced.matches)state.running=false;lastPlanetFrame='';$('sceneCaption').textContent=cityCaption;}
 if($('scene'))delete $('scene').dataset.cityFlight;
 updateReadouts();
 if(focus&&view==='planet'&&state.world==='earth')$('cityVisit')?.focus({preventScroll:true});
}
function settleCityFlight(){
 if(!cityFlight)return;
 const flight=cityFlight;Object.assign(state,flight.end);cityFlight=null;lastPlanetFrame='';$('sceneCaption').textContent='EARTH / OPENING '+cities[state.city].name.toUpperCase();updateReadouts();flight.resolve(true);
}
function advanceCityFlight(dt){
 if(!cityFlight)return;
 if(reduced.matches){settleCityFlight();return;}
 const flight=cityFlight;flight.elapsed+=dt;const t=Math.min(1,flight.elapsed/1.65),ease=x=>x*x*(3-2*x);
 const orientation=ease(Math.min(1,t/.7)),zoom=ease(Math.max(0,(t-.3)/.7));
 state.earthViewYaw=flight.start.earthViewYaw+(flight.end.earthViewYaw-flight.start.earthViewYaw)*orientation;
 state.earthViewPitch=flight.start.earthViewPitch+(flight.end.earthViewPitch-flight.start.earthViewPitch)*orientation;
 state.earthCityZoom=flight.start.earthCityZoom+(flight.end.earthCityZoom-flight.start.earthCityZoom)*zoom;
 positionCity();
 if(t===1)settleCityFlight();
}
function flyToCity(city){
 // Match the shader's inverse camera transform; the model's time stays fixed.
 const spin=state.earthProgress*Math.PI*2-1.3,longitude=city.lon*Math.PI/180-spin;
 const yaw=state.earthViewYaw+Math.atan2(Math.sin(longitude-state.earthViewYaw),Math.cos(longitude-state.earthViewYaw));
 const end={earthViewYaw:yaw,earthViewPitch:city.lat*Math.PI/180-.15,earthCityZoom:1};
 if(reduced.matches||!ready){Object.assign(state,end);lastPlanetFrame='';updateReadouts();return Promise.resolve(true);}
 return new Promise(resolve=>{cityFlight={start:{earthViewYaw:state.earthViewYaw,earthViewPitch:state.earthViewPitch,earthCityZoom:state.earthCityZoom},end,elapsed:0,resolve};});
}
async function visitCity(){
 if(view!=='planet'||state.world!=='earth')return;
 const city=cities[state.city];if(!city)return;
 if(cityExplorer?.active){await cityExplorer.open(city);return;}
 const request=++cityVisitRequest;
 if(cityFlight){cityFlight.resolve(false);cityFlight=null;}
 if(!citySnapshot){citySnapshot={earthViewYaw:state.earthViewYaw,earthViewPitch:state.earthViewPitch,earthCityZoom:state.earthCityZoom,running:state.running};cityCaption=$('sceneCaption').textContent;}
 cityRevealing=true;drag=null;setRunning(false);$('sceneCaption').textContent='EARTH / FLYING TO '+city.name.toUpperCase();$('scene').dataset.cityFlight='true';$('scene').scrollIntoView({block:'center',behavior:'instant'});
 cityModulePromise||=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('City view timed out')),20000);import('./city-explorer.js?v=ee3f09657be8'+(cityModuleAttempt?'&retry='+cityModuleAttempt:'')).then(module=>{clearTimeout(timeout);resolve(module);},error=>{clearTimeout(timeout);reject(error);});}).catch(error=>{cityModulePromise=null;cityModuleAttempt++;throw error;});
 try{
  const [module,arrived]=await Promise.all([cityModulePromise,flyToCity(city)]);
  if(!arrived||request!==cityVisitRequest||view!=='planet'||state.world!=='earth')return;
  cityRevealing=false;delete $('scene').dataset.cityFlight;
  // Notify the existing city/mission listeners without opening the map twice.
  cityExplorer||=new module.CityExplorer($('cityExplorer'),{onClose:()=>closeCity(),onSelect:selected=>{if(!cities[selected.id])return;$('citySelect').value=selected.id;$('citySelect').dispatchEvent(new CustomEvent('change',{bubbles:true,detail:{fromCityExplorer:true}}));}});
  const opening=cityExplorer.open(city);updateReadouts();await opening;
 }catch(error){
  if(request!==cityVisitRequest)return;
  closeCity({focus:false});toast('The city view could not load. Choose Explore city to try again.');
 }finally{if(request===cityVisitRequest){cityRevealing=false;syncCityControls();}}
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
function navigate(path){if(location.hash==='#'+path)switchWorld(path);else location.hash=path;}
async function applyRoute(path){
 const route=resolveRoute(path);
 if(path!==route.path)history.replaceState(null,'','#'+route.path);
 if(route.view==='home'){await showHome(route.path==='missions');return;}
 if(route.view==='belt'){await showBeltEntry();return;}
 if(route.view==='orrery'){await showOrrery(route.selected);return;}
 if(route.view==='moons'){await showMoonSystem(route.parent,route.selected,route.experiment);return;}
 const world=route.world;
 moonSystem?.hide();$('moonSystemView').hidden=true;beltFlight?.hide();$('beltView').hidden=true;
 view='planet';root.classList.remove('cinema');$('cinemaButton').setAttribute('aria-pressed','false');$('cinemaButton').textContent='View only ⤢';window.scrollTo(0,0);if(orrery)orrery.hide();$('main').hidden=false;$('fieldStories').hidden=false;$('orreryView').hidden=true;root.dataset.view='planet';document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');
 state.world=world;state.running=!reduced.matches;state.particles=false;state.storm=false;state.zoom=0;state.compare=false;state.venusEnhanced=true;state.venusSurface=false;state.otherSpin=world==='mars'?3.9:world==='mimas'?.9:0;state.moonTilt=0;state.lightPhase=.943;state.axisTilt=98;releaseMotion.x=releaseMotion.y=0;venusRequest++;titanRequest++;$('titanViewStatus').textContent='';lastPlanetFrame='';$('sunAngle').value=54;$('axisTilt').value=98;ready=false;$('scene').classList.add('is-loading');$('scene').setAttribute('aria-busy','true');
 document.querySelectorAll('.instrument input,.instrument select,.instrument button,#playButton').forEach(el=>el.disabled=true);
 const p=profiles[world];root.dataset.world=world;
 for(const [id,value] of Object.entries({chapterNumber:p.number,chapterKind:p.chapter,worldLead:p.lead,worldText:p.text,experimentQuestion:p.question,experimentHint:p.hint,gestureText:p.gesture,sceneCaption:p.caption,modelNote:p.note,factValue:p.fact,factUnit:p.unit}))$(id).textContent=value;
 $('worldTitle').innerHTML=p.title.replace(/^The /,'')+'<span>.</span>';root.classList.toggle('moon-detail',!!p.parent);
 canvas.setAttribute('aria-label','Interactive '+p.title+'. '+(world==='saturn'?'Drag vertically to change the viewpoint.':p.parent?'Drag or use arrow keys to turn and tilt the moon.':'Drag to turn the world.'));
 for(const w of ['earth','jupiter','saturn'])$(w+'Instrument').hidden=w!==world;
 $('otherInstrument').hidden=['earth','jupiter','saturn'].includes(world);$('tiltControl').hidden=world!=='uranus';$('phaseControl').hidden=world==='uranus';$('findOrbit').hidden=!!p.parent;$('findOrbit').textContent=p.parent?'See '+WORLDS[p.parent].title+' and its moons ↗':'Find '+p.title+' in the solar system ↗';state.titanSurface=false;$('spinControl').hidden=world!=='uranus';$('spinGuideNote').hidden=world!=='uranus';renderFamilyNavigation(world);renderMoonShelf(world);document.title=p.title+' — Solsystemet';showStories();updateVenusView();updateTitanView();
 document.querySelectorAll('button[data-world]').forEach(b=>{const active=b.dataset.world===world;b.classList.toggle('is-active',active);b.classList.toggle('is-current',active);b.setAttribute('aria-pressed',String(active));});
 $('fallbackPlanet').src=p.parent?'assets/research/'+p.map:'assets/'+world+'-still.jpg';$('fallbackPlanet').classList.toggle('map-fallback',!!p.parent);$('fallbackPlanet').alt=p.title+' preview while the interactive world loads.';$('fallbackPlanet').hidden=false;
 $('assetStatus').textContent='Loading surface maps';updateReadouts();
 if(renderer)await renderer.setWorld(world);else unavailable(rendererFailure||'Interactive graphics are unavailable on this device. You can explore the still views and stories.');
}
function unavailable(message){
 rendererFailure=message;ready=false;settleCityFlight();root.classList.add('no-webgl');$('scene').classList.remove('is-loading');$('scene').setAttribute('aria-busy','false');$('fallbackPlanet').hidden=false;$('fallbackPlanet').alt=profiles[state.world].title+' illustration; interactive rendering is unavailable.';$('assetStatus').textContent='Still illustration';$('cityMarker').hidden=true;
 document.querySelectorAll('.instrument input,.instrument select,.instrument button,#playButton').forEach(el=>el.disabled=true);
 if(state.world==='earth'){if($('cityVisit'))$('cityVisit').disabled=false;$('citySelect').disabled=false;}
 console.error('Solsystemet:',message);toast(message);
}
try{renderer=new PlanetRenderer(canvas,()=>{ready=true;lastPlanetFrame='';$('scene').classList.remove('is-loading');$('scene').setAttribute('aria-busy','false');root.classList.remove('no-webgl');$('fallbackPlanet').hidden=true;$('assetStatus').textContent='';document.querySelectorAll('.instrument input,.instrument select,.instrument button,#playButton').forEach(el=>el.disabled=false);updateReadouts();updateVenusView();updateTitanView();},unavailable);}catch(e){unavailable(e.message);}

function updateVenusView(){
 const group=$('venusControls');if(!group)return;group.hidden=state.world!=='venus';if(group.hidden)return;
 const surface=state.venusSurface,enhanced=state.venusEnhanced;
 $('venusClouds').textContent='Cloud patterns';
 $('venusClouds').setAttribute('aria-pressed',String(!surface&&enhanced));
 $('venusOrdinary')?.setAttribute('aria-pressed',String(!surface&&!enhanced));
 $('venusSurface').textContent='Radar surface';$('venusSurface').setAttribute('aria-pressed',String(surface));
 if($('venusViewDescription'))$('venusViewDescription').textContent=surface?'Radar sees through the clouds to map the ground. These colours help show the landscape; they are not its natural colours.':enhanced?'We have boosted the cloud patterns so you can follow them. This is an enhanced illustration.':'To our eyes, Venus looks pale and almost smooth. Its thick clouds hide the ground.';
 if($('venusRadarCredit'))$('venusRadarCredit').hidden=!surface;
 $('sceneCaption').textContent=surface?'VENUS / RADAR VIEW OF THE GROUND':enhanced?'VENUS / CLOUD PATTERNS ENHANCED':'VENUS / ORDINARY CLOUD VIEW';
 $('modelNote').textContent=surface?'MAGELLAN RADAR RECONSTRUCTION · COLOURS ARE NOT WHAT YOUR EYES WOULD SEE · GOLD MARKER IS A DRAWN GUIDE':enhanced?'CLOUD CONTRAST ENHANCED TO REVEAL PATTERNS · CLOUD MOVEMENT IS ILLUSTRATIVE':'VISIBLE-LIGHT CLOUDS ARE NATURALLY PALE · CLOUD MOVEMENT IS ILLUSTRATIVE';
 $('experimentQuestion').textContent=surface?'A whole world beneath the clouds.':'Why can’t we see the ground?';
 $('experimentHint').textContent=surface?'Radar can see through the clouds. Follow the gold guide to watch the solid planet turn backwards.':'Try the ordinary cloud view, reveal its patterns, then use radar to look at the hidden ground.';
 if(!state.running)$('playLabel').textContent=surface?'Watch the backward turn':profiles.venus.play;
}
function showVenusClouds(enhanced){venusRequest++;state.venusSurface=false;state.venusEnhanced=enhanced;$('venusSurface').disabled=false;$('assetStatus').textContent='';updateVenusView();}
$('venusClouds')?.addEventListener('click',()=>showVenusClouds(true));
$('venusOrdinary')?.addEventListener('click',()=>showVenusClouds(false));
$('venusSurface')?.addEventListener('click',async()=>{
 if(state.venusSurface)return;
 const request=++venusRequest;$('venusSurface').disabled=true;$('assetStatus').textContent='Loading the radar view…';
 try{await renderer.prepareVenusSurface();if(request!==venusRequest||state.world!=='venus'||view!=='planet')return;state.venusSurface=true;lastPlanetFrame='';updateVenusView();}
 catch(e){if(request===venusRequest)toast('The radar view could not load. Try again, or keep exploring the clouds.');}
 finally{if(request===venusRequest){$('venusSurface').disabled=false;$('assetStatus').textContent='';}}
});
document.querySelectorAll('button[data-world]').forEach(b=>b.onclick=()=>navigate(b.dataset.world));
document.querySelector('.brand').onclick=e=>{e.preventDefault();navigate('explore');};
document.querySelector('button[data-view="orrery"]').onclick=()=>navigate('orrery');
$('findOrbit').onclick=()=>navigate(profiles[state.world].parent?profiles[state.world].parent+'-moons/'+state.world:'orrery/'+state.world);
$('uranusSpin').oninput=e=>{state.otherSpin=Number(e.target.value)*Math.PI/180;setRunning(false);};
function updateTitanView(){
 const group=$('titanControls');group.hidden=state.world!=='titan';if(group.hidden)return;
 const surface=state.titanSurface;
 $('titanHaze').setAttribute('aria-pressed',String(!surface));$('titanSurface').setAttribute('aria-pressed',String(surface));
 $('titanNorth').hidden=!surface;
 $('titanViewDescription').textContent=surface?'Infrared and radar help reveal the hidden ground. This reconstructed map includes dark lakes around the north pole; its colours are not a visible-light photograph.':'Titan’s thick haze hides the ground, so this view looks almost smooth. Switch views to discover the landscape beneath it.';
 $('sceneCaption').textContent=surface?'TITAN / RECONSTRUCTED SURFACE':profiles.titan.caption;
 $('modelNote').textContent=surface?'INFRARED & RADAR RECONSTRUCTION · POLAR LAKES DRAWN FROM RADAR MAPS':profiles.titan.note;
}
$('titanHaze').onclick=()=>{
 if(!ready||state.world!=='titan'||view!=='planet')return;
 titanRequest++;state.titanSurface=false;$('titanSurface').disabled=false;$('titanViewStatus').textContent='';updateTitanView();
};
$('titanSurface').onclick=async()=>{
 if(!ready||state.world!=='titan'||view!=='planet'||state.titanSurface)return;
 const request=++titanRequest,current=()=>request===titanRequest&&state.world==='titan'&&view==='planet';
 $('titanSurface').disabled=true;$('titanViewStatus').textContent='Preparing the surface. You can keep exploring the haze.';
 try{await renderer.prepareTitanSurface();if(!current()||!ready)return;state.titanSurface=true;lastPlanetFrame='';$('titanViewStatus').textContent='';updateTitanView();}
 catch{if(current())$('titanViewStatus').textContent=ready?'The surface could not load. Choose Surface reconstruction to try again, or keep exploring the haze.':'The interactive view is unavailable. Reload to restore it, or explore the still image and sources.';}
 finally{if(current())$('titanSurface').disabled=!ready;}
};
$('titanNorth').onclick=()=>{
 if(!ready||state.world!=='titan'||!state.titanSurface||view!=='planet')return;
 state.moonTilt=55;state.otherSpin=0;state.lightPhase=.3;$('sunAngle').value=Math.round(.3*180/Math.PI);setRunning(false);
 $('titanViewStatus').textContent='North-pole view. Look for the dark lakes drawn from radar maps. Drag to explore.';
 $('scene').scrollIntoView({block:'center',behavior:'instant'});canvas.focus({preventScroll:true});
};
$('sunAngle').oninput=e=>{state.lightPhase=Number(e.target.value)*Math.PI/180;updateReadouts();};
$('axisTilt').oninput=e=>{state.axisTilt=Number(e.target.value);updateReadouts();};
$('citySelect').onchange=e=>{state.city=e.target.value;updateReadouts();if(!e.detail?.fromCityExplorer&&(cityExplorer?.active||cityFlight||cityRevealing))visitCity();};
if($('cityVisit'))$('cityVisit').onclick=()=>visitCity();
$('earthRotation').oninput=e=>{const from=(1-state.earthProgress)*1000,to=Number(e.target.value);earthInput={from,to,wasDaylight:$('dayStatus').textContent==='Daylight'};state.earthProgress=1-to/1000;setRunning(false);};
$('cloudToggle').onchange=e=>state.clouds=e.target.checked;$('lightsToggle').onchange=e=>state.lights=e.target.checked;
$('jupiterTime').oninput=e=>{state.speed=1+Number(e.target.value)*.1;updateReadouts();};
$('saturnAngle').oninput=e=>{state.angle=Number(e.target.value);updateReadouts();};
for(const [id,angle] of [['saturnTop',55],['saturnEdge',0],['saturnBelow',-35]])$(id).onclick=()=>{state.angle=angle;updateReadouts();};
$('stormButton').onclick=()=>{state.storm=!state.storm;if(state.storm)state.jupiterSpin=2.224;else state.compare=false;updateReadouts();};
$('earthCompare').onclick=()=>{state.compare=!state.compare;if(state.compare){state.storm=true;state.jupiterSpin=2.224;state.running=false;}updateReadouts();};
$('particleButton').onclick=()=>{state.particles=!state.particles;if(state.particles){state.running=true;}updateReadouts();};
$('playButton').onclick=()=>setRunning(!state.running);
$('resetButton').onclick=()=>{closeCity({focus:false});venusRequest++;titanRequest++;$('titanViewStatus').textContent='';releaseMotion.x=releaseMotion.y=0;Object.assign(state,{earthProgress:.3,jupiterSpin:2.224,saturnSpin:.4,otherSpin:state.world==='mars'?3.9:state.world==='mimas'?.9:0,moonTilt:0,lightPhase:.943,axisTilt:98,titanSurface:false,venusEnhanced:true,venusSurface:false,angle:24,storm:false,zoom:0,compare:false,particles:false,speed:1,running:!reduced.matches,time:0,clouds:true,lights:true});$('cloudToggle').checked=true;$('lightsToggle').checked=true;$('jupiterTime').value=0;$('sunAngle').value=54;$('axisTilt').value=98;$('titanSurface').disabled=!ready;$('sceneCaption').textContent=profiles[state.world].caption;$('modelNote').textContent=profiles[state.world].note;if($('venusSurface'))$('venusSurface').disabled=!ready;updateReadouts();updateVenusView();updateTitanView();};
$('cinemaButton').onclick=()=>setCinema(!root.classList.contains('cinema'));
$('aboutButton').onclick=()=>{$('aboutPanel').showModal();$('aboutButton').setAttribute('aria-expanded','true');};
$('closeAbout').onclick=()=>$('aboutPanel').close();$('aboutPanel').onclose=()=>{$('aboutButton').setAttribute('aria-expanded','false');$('aboutButton').focus();};
$('aboutPanel').onclick=e=>{if(e.target===$('aboutPanel')){const r=$('aboutPanel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('aboutPanel').close();}};
$('lowPower').onchange=e=>{if(renderer){renderer.quality=e.target.checked?.6:1;renderer.resize();}};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(cityFlight||cityRevealing||cityExplorer?.active)){e.preventDefault();closeCity();return;}if(e.key==='Escape'&&root.classList.contains('belt-cinema'))beltFlight?.toggleCinema();if(e.key==='Escape'&&root.classList.contains('cinema'))$('cinemaButton').click();});
reduced.addEventListener('change',e=>{if(e.matches){state.running=false;settleCityFlight();updateReadouts();}});
function move(dx,dy){if(state.world==='earth')state.earthProgress=wrap(state.earthProgress-dx/900);else if(state.world==='jupiter'){state.jupiterSpin-=dx*.008;state.storm=false;state.compare=false;}else if(state.world==='saturn')state.angle=Math.max(-70,Math.min(70,state.angle-dy*.25));else{state.otherSpin-=dx*.008;if(profiles[state.world].parent)state.moonTilt=Math.max(-75,Math.min(75,state.moonTilt-dy*.25));}state.running=false;updateReadouts();}
canvas.onpointerdown=e=>{if(cityFlight||cityRevealing)closeCity({focus:false});releaseMotion.x=releaseMotion.y=0;drag={x:e.clientX,y:e.clientY,vx:0,vy:0,time:e.timeStamp};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y,seconds=Math.max(.008,(e.timeStamp-drag.time)/1000);move(dx,dy);drag={x:e.clientX,y:e.clientY,vx:Math.max(-700,Math.min(700,dx/seconds)),vy:Math.max(-700,Math.min(700,dy/seconds)),time:e.timeStamp};}};
canvas.onpointerup=e=>{if(drag&&!reduced.matches&&e.timeStamp-drag.time<90){releaseMotion.x=drag.vx;releaseMotion.y=drag.vy;}drag=null;};
canvas.onpointercancel=()=>{drag=null;releaseMotion.x=releaseMotion.y=0;};
canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(cityFlight||cityRevealing)closeCity({focus:false});releaseMotion.x=releaseMotion.y=0;move(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0,e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0);}};
window.addEventListener('hashchange',()=>switchWorld(location.hash.slice(1)));

// Reuse the same orbital renderer on the welcome page and the full model.
const stageAnchor=document.createComment('Full orrery stage');$('orreryStage').before(stageAnchor);
const planetActions=document.querySelector('.primary-actions');
const observation=document.querySelector('.observation');
const observationAnchor=document.createComment('Desktop observation position');observation.before(observationAnchor);
const planetActionsAnchor=document.createComment('Desktop planet actions position');planetActions.before(planetActionsAnchor);
const compactPlanet=matchMedia('(max-width:760px)');
function syncPlanetLayout(){
 const focused=document.activeElement;
 const compact=compactPlanet.matches&&view==='planet'&&!root.classList.contains('mission-active')&&!root.classList.contains('cinema');
 if(compact){if($('worldLead').nextElementSibling!==observation)$('worldLead').after(observation);if($('scene').nextElementSibling!==planetActions)$('scene').after(planetActions);}
 else{if(observationAnchor.nextElementSibling!==observation)observationAnchor.after(observation);if(!root.classList.contains('cinema')&&planetActionsAnchor.nextElementSibling!==planetActions)planetActionsAnchor.after(planetActions);}
 if(focused!==document.body&&focused?.isConnected&&document.activeElement!==focused&&!focused.closest('[inert]'))focused.focus({preventScroll:true});
}
compactPlanet.addEventListener('change',syncPlanetLayout);
new MutationObserver(syncPlanetLayout).observe(root,{attributes:true,attributeFilter:['class','data-view']});
function setCinema(active){
 const changed=root.classList.contains('cinema')!==active;
 root.classList.toggle('cinema',active);
 $('cinemaButton').setAttribute('aria-pressed',String(active));$('cinemaButton').textContent=active?'Return to exploration ↙':'View only ⤢';
 if(active)$('scene').append(planetActions);else document.querySelector('.narrative').insertBefore(planetActions,document.querySelector('.world-fact'));
 for(const child of root.children)if(child!==$('main'))child.inert=active;
 document.querySelector('.narrative').inert=active;document.querySelector('.instrument').inert=active;
 syncPlanetLayout();
 if(changed&&!reduced.matches)$('scene').animate([{opacity:.55},{opacity:1}],{duration:200,easing:'ease-out'});
}
async function showHome(jumpToMissions=false){
 view='home';root.dataset.view='home';document.title='Solsystemet — A whole universe to explore';
 beltFlight?.hide();moonSystem?.hide();
 for(const id of ['main','fieldStories','moonDiscoveries','beltView','moonSystemView','orreryView'])$(id).hidden=true;
 $('homeMotion').disabled=true;$('homeView').hidden=false;$('homeStage').append($('orreryStage'));
 document.querySelectorAll('button[data-world]').forEach(b=>{b.classList.remove('is-active','is-current');b.setAttribute('aria-pressed','false');});
 document.querySelector('button[data-view="orrery"]').setAttribute('aria-pressed','false');
 window.scrollTo(0,0);
 try{orrery=await loadOrrery();if(view==='home'){orrery.show({ambient:true});$('homeMotion').disabled=false;orrery.setSpacing(0);orrery.select('earth');orrery.fly('perspective');}}
 catch(e){$('orreryStatus').textContent='The interactive sky could not start. Explore the world pages and their stories below.';console.error(e);}
 if(jumpToMissions&&view==='home'){$('missions').scrollIntoView({block:'start'});$('missionsTitle').focus({preventScroll:true});}
}
let routeRequest=0;
async function switchWorld(path){
 const request=++routeRequest;closeCity({focus:false});venusRequest++;releaseMotion.x=releaseMotion.y=0;drag=null;setCinema(false);root.classList.remove('belt-cinema');
 $('homeView').hidden=true;stageAnchor.after($('orreryStage'));
 await applyRoute(path);
 if(request!==routeRequest)return;
 const region=view==='planet'?$('main'):view==='home'?$('homeView'):view==='moons'?$('moonSystemView'):view==='belt'?$('beltView'):$('orreryView');
 if(!reduced.matches){for(const animation of region.getAnimations())animation.cancel();region.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)'});}
 const heading=view==='planet'?$('worldTitle'):view==='home'?$(path==='missions'?'missionsTitle':'homeTitle'):view==='moons'?$('moonSystemTitle'):view==='belt'?$('beltTitle'):$('orreryView').querySelector('h1');
 if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 missions.routeChanged();$('routeAnnouncement').textContent=document.title.split(' — ')[0];
}
$('homeMotion').onclick=()=>{if(orrery){orrery.playing=!orrery.playing;orrery.updateUI();$('homeMotion').setAttribute('aria-pressed',String(orrery.playing));$('homeMotion').textContent=orrery.playing?'Ⅱ Pause':'▶ Play';}};
const missions=createMissions({navigate,setSunriseView,captureSunrise,readState:()=>({view,world:state.world,ready,earthInput,city:cities[state.city].name,yearLength:WORLDS.earth.period,availability:view==='planet'?(ready?'ready':$('scene').classList.contains('is-loading')?'loading':'unavailable'):view==='orrery'?orreryAvailability:'ready',daylight:$('dayStatus').textContent,days:orrery?.days||0})});
let lastMissionRead=0,lastReduced=reduced.matches;
function frame(ts){
 // Some browsers delay media-query change events; also observe the preference at frame boundaries.
 if(reduced.matches&&!lastReduced){setRunning(false);settleCityFlight();for(const scene of [orrery,moonSystem,beltFlight])if(scene){scene.playing=false;scene.updateUI();}}
 lastReduced=reduced.matches;
 const dt=Math.min((ts-last)/1000||.016,.05);last=ts;
 if(!document.hidden&&cityFlight&&view==='planet'){if(ready)advanceCityFlight(dt);else settleCityFlight();}
 if(!document.hidden&&view==='belt'&&beltFlight&&isSceneVisible('beltCanvas'))beltFlight.frame(dt);
 if(!document.hidden&&view==='moons'&&moonSystem){if(isSceneVisible('moonCanvas'))moonSystem.frame(dt,ts);else moonSystem.advanceOffscreen?.(dt,ts);}
 if(!document.hidden&&(view==='orrery'||view==='home')&&orrery){if(isSceneVisible('orreryCanvas'))orrery.frame(dt,ts);else orrery.advanceOffscreen?.(dt,ts);}
 if(!document.hidden&&ready&&view==='planet'&&isSceneVisible('universe')&&!cityExplorer?.active){
  if(!drag&&(Math.abs(releaseMotion.x)>.5||Math.abs(releaseMotion.y)>.5)){
   if(reduced.matches){releaseMotion.x=releaseMotion.y=0;}else{move(releaseMotion.x*dt,releaseMotion.y*dt);const decay=Math.exp(-dt*9);releaseMotion.x*=decay;releaseMotion.y*=decay;}
  }
  // uvAt adds spin to texture coordinates: a decreasing offset turns a
  // north-up globe prograde. Venus turns the other way; Uranus carries its tilt.
  if(state.running){state.time+=dt*3;if(state.world==='earth')state.earthProgress=wrap(state.earthProgress-dt/35);if(state.world==='jupiter'&&!state.storm)state.jupiterSpin-=dt*.035;if(state.world==='saturn')state.saturnSpin-=dt*.035;state.otherSpin+=dt*(state.world==='uranus'?.72:.13)*(state.world==='venus'?1:-1);}
  const k=reduced.matches?1:1-Math.exp(-dt*6);state.zoom+=((state.storm?1:0)-state.zoom)*k;state.renderAngle+=(state.angle-state.renderAngle)*k;
  state.spin=state.world==='earth'?state.earthProgress*Math.PI*2-1.3:state.world==='jupiter'?state.jupiterSpin:state.world==='saturn'?state.saturnSpin:state.otherSpin;
  if(Math.abs(state.zoom-(state.storm?1:0))<.00005)state.zoom=state.storm?1:0;
  if(Math.abs(state.renderAngle-state.angle)<.001)state.renderAngle=state.angle;
  const renderState={...state,angle:profiles[state.world].parent?state.moonTilt:state.renderAngle};
  const signature=[state.world,state.spin,state.time,renderState.angle,state.lightPhase,state.axisTilt,state.clouds,state.lights,state.zoom,state.compare,state.particles,state.speed,state.titanSurface,state.earthViewYaw,state.earthViewPitch,state.earthCityZoom,state.venusEnhanced,state.venusSurface,canvas.width,canvas.height,renderer.revision].join('|');
  if(signature!==lastPlanetFrame){renderer.render(renderState);lastPlanetFrame=signature;}
  if(ts-lastReadout>100&&(state.running||cityFlight||drag||Math.abs(releaseMotion.x)>.5||Math.abs(releaseMotion.y)>.5)){updateReadouts();lastReadout=ts;}
 }
 if(ts-lastMissionRead>150){if(!cityFlight&&!cityRevealing&&!cityExplorer?.active)missions.tick();if(view==='home'&&orrery){$('homeMotion').setAttribute('aria-pressed',String(orrery.playing));$('homeMotion').textContent=orrery.playing?'Ⅱ Pause':'▶ Play';}lastMissionRead=ts;}
 requestAnimationFrame(frame);
}
switchWorld(location.hash.slice(1)||'explore');requestAnimationFrame(frame);
