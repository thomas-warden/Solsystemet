import { CLOSE_MOON_DISTANCE_RATIO, MAX_TIDE_RANGE } from './tide-constants.js?v=20261029';
import { addCelestialSky } from './sky-scene.js?v=20261014d';
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { WORLDS } from './worlds.js?v=20261014d';
import { MOONS, FAMILIES, moonPosition } from './moons.js?v=20261014d';
import { AnchoredLabels } from './orbit-labels.js?v=20261016labels';
const $=id=>document.getElementById(id),TAU=Math.PI*2;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const CAMERA_DURATION=.75;
const CHECKPOINT_DURATION=.8;
const SOLAR_DURATION=.35,TIDE_CAMERA_Y=.58,TIDE_ORBIT_RADIUS=3.3;

function earthMaterial(material){
 // Color maps are already decoded to linear light by Three. The water mask is
 // a restrained visual approximation, not a measured roughness or height map.
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <map_fragment>',`#include <map_fragment>
    float earthWater=(1.-smoothstep(.0003,.008,diffuseColor.r))*smoothstep(.0001,.001,diffuseColor.b-diffuseColor.r);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.004,.025,.060),earthWater*.9);`)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=mix(roughnessFactor,.35,earthWater);`)
   .replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
    material.specularColor*=mix(1.,.5,earthWater);`)
   .replace('#include <opaque_fragment>',`
    #if NUM_DIR_LIGHTS > 0
     float earthSun=dot(normal,directionalLights[0].direction);
     float earthRim=pow(1.-max(dot(normal,normalize(vViewPosition)),0.),4.);
     outgoingLight+=vec3(.016,.055,.095)*earthRim*smoothstep(-.12,.4,earthSun);
    #endif
    #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'earth-moon-surface-v1';
}

function earthAtmosphere(geometry,sunDirection){
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
  uniforms:{sunDirection:{value:sunDirection}},
  vertexShader:`varying vec3 worldNormal;varying vec3 worldPosition;
   void main(){vec4 world=modelMatrix*vec4(position,1.);worldPosition=world.xyz;
    worldNormal=normalize(mat3(modelMatrix)*normal);
    gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`uniform vec3 sunDirection;varying vec3 worldNormal;varying vec3 worldPosition;
   void main(){vec3 normal=normalize(worldNormal),view=normalize(cameraPosition-worldPosition);
    float rim=pow(1.-abs(dot(normal,view)),3.5);
    float sun=smoothstep(-.12,.4,dot(normal,sunDirection));
    gl_FragColor=vec4(vec3(.10,.27,.50),rim*sun*.24);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 // A thin illustrated scattering edge, lit from the same fixed Sun as the Moon.
 const atmosphere=new THREE.Mesh(geometry,material);atmosphere.name='earth-atmosphere';
 atmosphere.scale.setScalar(1.018);atmosphere.raycast=()=>{};return atmosphere;
}
export class MoonSystem {
 constructor(){
  this.active=false;this.days=0;this.playing=!reduced.matches;this.parent='';this.items={};this.textures=new Map();this.imageLoads=[];this.tideMode=false;this.solarEnabled=true;this.solarMix=1;this.solarFlight=null;this.moonDistanceRatio=1;this.lunarFlight=null;this.tideAttempts=0;this.request=0;this.dirty=true;this.modelDirty=true;
  this.renderer=new THREE.WebGLRenderer({canvas:$('moonCanvas'),antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0x030507);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.scene=new THREE.Scene();this.sky=addCelestialSky(this.scene);this.camera=new THREE.PerspectiveCamera(38,1,.03,500);this.camera.position.set(0,17,25);this.controls=new OrbitControls(this.camera,$('moonCanvas'));this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=4;this.controls.maxDistance=90;this.controls.maxPolarAngle=Math.PI*.9;this.controls.target.set(0,0,0);this.controls.addEventListener('start',()=>{this.flight=null;});this.controls.addEventListener('change',()=>{this.dirty=true;});
  this.ambientLight=new THREE.AmbientLight(0x73879a,.34);this.sunlight=new THREE.DirectionalLight(0xffedcf,2.9);this.sunlight.position.set(-8,5,7);this.sunDirection=this.sunlight.position.clone().normalize();this.earthSunDirection=this.sunDirection.clone();this.tideNormal=new THREE.Vector3(0,Math.cos(.09),Math.sin(.09));this.tideSunDirection=this.sunDirection.clone().addScaledVector(this.tideNormal,-this.sunDirection.dot(this.tideNormal)).normalize();this.scene.add(this.ambientLight,this.sunlight);this.group=new THREE.Group();this.scene.add(this.group);this.sphere=new THREE.SphereGeometry(1,64,40);this.loader=new THREE.TextureLoader();this.labels=[];
  this.labelLayout=new AnchoredLabels($('moonLabels'),()=>{this.dirty=true;});
  this.consoleAnchor=document.createComment('Moon console position for the larger families');$('moonConsole').before(this.consoleAnchor);
  this.tideChallenge={active:false,found:new Set()};this.tideInspect=false;
  $('tideInspect').onclick=()=>this.inspectTides(!this.tideInspect);
  $('tideChallengeStart').onclick=()=>this.startTideChallenge();
  $('tideChallengeCheck').onclick=()=>this.checkTideChallenge();
  $('tideLearningRetry').onclick=()=>this.loadTideLearning();
  // Hold the monthly arrangement while the visitor watches the separate tide day.
  this.shoreObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.25)&&this.active&&this.tideMode&&this.playing){this.playing=false;this.updateUI();}},{threshold:.25});this.shoreObserver.observe($('tideShore'));
  this.guideVectors=Array.from({length:5},()=>new THREE.Vector3());
  $('tideSun').onclick=()=>this.toggleSolar();
  $('tideRetry').onclick=()=>{if(document.activeElement===$('tideRetry'))$('moonCanvas').focus({preventScroll:true});this.loadTides();};
  for(const button of document.querySelectorAll('[data-tide-angle]'))button.onclick=()=>this.tidePreset(Number(button.dataset.tideAngle));
  $('moonFocus').onchange=e=>this.select(e.target.value);
  $('moonRetry').onclick=()=>{if(document.activeElement===$('moonRetry'))$('moonCanvas').focus({preventScroll:true});this.retryImages();};
  $('moonPlay').onclick=()=>{this.cancelCheckpoint();if(this.days>=this.span){this.days=0;this.modelDirty=true;}this.playing=!this.playing;this.updateUI();};$('moonDay').oninput=e=>{this.cancelCheckpoint();this.days=Number(e.target.value)/1000*this.span;this.playing=false;this.modelDirty=true;if(this.tideMode)this.updateTideState(true);this.updateUI();};$('moonPerspective').onclick=()=>this.setView(false);$('moonTop').onclick=()=>this.setView(true);$('moonReset').onclick=()=>{this.cancelTideDrag();this.cancelCheckpoint();this.solarEnabled=true;this.settleSolar();this.setTideDistance(1);this.days=0;this.playing=!reduced.matches;this.tideInspect=false;this.resetTideChallenge();this.tideShore?.reset();this.tideGuide?.selectStep(0);if(this.tideMode)this.updateTideState(true);this.select(FAMILIES[this.parent][0]);this.setView(false);this.updateUI();};
  for(const button of document.querySelectorAll('[data-moon-checkpoint]'))button.onclick=()=>this.checkpoint(Number(button.dataset.moonCheckpoint));
  const canvas=$('moonCanvas');
  canvas.addEventListener('pointerdown',e=>this.beginTideDrag(e),true);
  canvas.addEventListener('pointermove',e=>this.moveTideDrag(e),true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(this.tideDrag?.id===e.pointerId){e.stopImmediatePropagation();this.cancelTideDrag();}},true);
  canvas.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
  canvas.addEventListener('pointermove',e=>{if(this.pointer?.id===e.pointerId&&Math.hypot(e.clientX-this.pointer.x,e.clientY-this.pointer.y)>6)this.pointer.moved=true;});
  canvas.addEventListener('pointercancel',()=>{this.pointer=null;});
  canvas.addEventListener('pointerup',e=>{
   const pointer=this.pointer;this.pointer=null;
   if(!pointer||pointer.id!==e.pointerId||pointer.moved||Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)return;
   const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);
   const hit=ray.intersectObjects(Object.values(this.items).map(v=>v.mesh),true)[0];
   let body=hit?.object;
   while(body&&!body.userData.id)body=body.parent;
   if(body?.userData.id)location.hash='#'+body.userData.id;
  });
  canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();this.flight=null;const s=new THREE.Spherical().setFromVector3(this.camera.position);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi=Math.max(.05,s.phi-.1);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI*.9,s.phi+.1);if(['+','='].includes(e.key))s.radius=Math.max(4,s.radius*.85);if(e.key==='-')s.radius=Math.min(90,s.radius/.85);this.camera.position.setFromSpherical(s);this.controls.update();};
  reduced.addEventListener('change',e=>{if(e.matches){this.playing=false;if(this.timeFlight)this.finishCheckpoint();if(this.solarFlight){this.settleSolar(true);this.updateTideState(true);}if(this.lunarFlight){this.setTideDistance(this.lunarFlight.end);this.lunarFlight=null;this.updateTideState(true);}this.dirty=true;this.updateUI();}});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('moonStage'));
  this.labelObserver=new ResizeObserver(()=>this.measureLabelBounds());for(const el of $('moonStage').querySelectorAll('.orbit-toolbar,.orbit-key'))this.labelObserver.observe(el);
  this.arrivalObserver=new ResizeObserver(()=>this.fitEarthStage());for(const el of [$('moonConsole'),$('moonSystemView').querySelector('.orrery-heading'),$('moonSystemView').querySelector('.neighbourhood-nav'),document.querySelector('.topbar')])this.arrivalObserver.observe(el);
  window.addEventListener('resize',()=>this.fitEarthStage());
 }
 configureEarthExperiment(){
  if(this.parent!=='earth')return;
  this.sunDirection.copy(this.tideMode?this.tideSunDirection:this.earthSunDirection);if(this.tideMode)this.sunlight.position.copy(this.sunDirection).multiplyScalar(12);else this.sunlight.position.set(-8,5,7);
  this.maxRadius=this.tideMode?TIDE_ORBIT_RADIUS:4.6;this.span=this.tideMode?MOONS.moon.period:28;const item=this.items.moon;
  if(item){item.r=this.maxRadius*(this.tideMode?this.moonDistanceRatio:1);item.phase=this.tideMode?0:1.1;const p=item.orbit.geometry.attributes.position;for(let n=0;n<p.count;n++){const a=n/(p.count-1)*TAU;p.setXYZ(n,Math.cos(a)*item.r,Math.sin(a)*item.r*Math.sin(item.inclination),-Math.sin(a)*item.r*Math.cos(item.inclination));}p.needsUpdate=true;item.orbit.geometry.computeBoundingSphere();item.orbit.material.opacity=this.tideMode?.2:.65;}
  $('moonSystemTitle').textContent=this.tideMode?'Ocean tides.':'Earth & the Moon.';
  $('moonSystemEyebrow').textContent=this.tideMode?'EARTH + MOON + SUN':'OUR NEAREST NEIGHBOUR';
  $('moonSystemIntro').textContent=this.tideMode?'Move the Moon. Watch both bulges.':'One orbit. One turn. The same face.';
  if(this.tideMode)document.title='Ocean tides — Solsystemet';
  if(this.tideOcean)this.tideOcean.object.visible=this.tideMode;
  this.modelDirty=true;
 }
 async loadTides(){
  if(!this.tideMode||this.parent!=='earth')return;
  if(this.tideOcean){this.tideOcean.object.visible=true;this.setTideReady(true);return;}
  $('tideStatus').textContent='Preparing the ocean…';$('tideRetry').hidden=true;this.setTideReady(false);
  try{
   this.tideImport||=import('./tides.js?v=20261025'+(this.tideAttempts?'&retry='+this.tideAttempts:'')).catch(error=>{this.tideImport=null;this.tideAttempts++;throw error;});
   const {TideOcean}=await this.tideImport;
   if(!this.tideOcean){this.tideOcean=new TideOcean({radius:1.3,sunDirection:this.sunDirection,orbitNormal:this.tideNormal,exaggeration:.24,opacity:.11});this.scene.add(this.tideOcean.object);}
   this.tideOcean.object.visible=this.active&&this.parent==='earth'&&this.tideMode;
   if(this.tideOcean.object.visible){this.setTideReady(true);this.modelDirty=true;this.dirty=true;}
  }catch(error){
   if(this.active&&this.parent==='earth'&&this.tideMode){$('tideStatus').textContent='The water view could not load. Try again, or read how tides work below.';$('tideRetry').hidden=false;this.setTideReady(false);}
  }
 }
 setTideReady(ready){
  $('moonSystemView').dataset.tideReady=String(ready);
  for(const button of $('tideControls').querySelectorAll('button:not(#tideRetry)'))button.disabled=!ready;
  if(ready){$('tideStatus').textContent='';$('tideRetry').hidden=true;this.loadTideLearning();}
  $('tideChallengeStart').disabled=$('tideChallengeCheck').disabled=!ready;
 }
 async loadTideLearning(){
  if(this.learningPromise||!this.active||!this.tideMode)return;
  $('tideLearningNotice').hidden=false;$('tideLearningStatus').textContent='Preparing the coastal view…';$('tideLearningRetry').hidden=true;
  const suffix=this.learningAttempts?'&retry='+this.learningAttempts:'';
  this.learningPromise=Promise.allSettled([
   (async()=>{if(this.tideGuide)return;const {TideGuide}=await import('./tide-guide.js?v=20261027'+suffix);if(!this.active||!this.tideMode)return;this.tideGuide=new TideGuide($('tideGuide'),{onCompare:degrees=>this.tideComparison(degrees)});})(),
   (async()=>{if(this.tideShore)return;const {TideShore}=await import('./tide-shore.js?v=20261027'+suffix);if(!this.active||!this.tideMode)return;this.tideShore=new TideShore($('tideShore'),{onScenario:kind=>this.tideScenario(kind)});})()
  ]);
  const results=await this.learningPromise;this.learningPromise=null;
  const failed=results.some(result=>result.status==='rejected');
  if(failed)this.learningAttempts=(this.learningAttempts||0)+1;
  $('tideLearningNotice').hidden=!failed||!this.active||!this.tideMode;$('tideLearningStatus').textContent=failed?'One illustration could not load. The orbit and explanation are still available.':'';$('tideLearningRetry').hidden=!failed;
  this.tideGuide?.setActive(this.active&&this.tideMode);this.tideShore?.setActive(this.active&&this.tideMode);
  if(this.active&&this.tideMode){this.updateTideState(true);$('moonSystemView').dataset.learningReady=String(!!this.tideGuide&&!!this.tideShore);}
 }
 tideLearningState(){
  return {range:this.tideData?.range??1,solarMix:this.solarMix,moonDistanceRatio:this.moonDistanceRatio,lunarWeight:1/this.moonDistanceRatio**3,transitioning:!!(this.timeFlight||this.solarFlight||this.lunarFlight),moonAngle:(this.items.moon?.phase??0)+this.days/MOONS.moon.period*TAU,sunAngle:Math.atan2(-this.tideSunDirection.z/Math.cos(.09),this.tideSunDirection.x)};
 }
 resetTideChallenge(){
  this.tideChallenge={active:false,found:new Set()};$('tideDiscovery').dataset.found='0';$('tideChallengeCount').textContent='0 / 2';$('tideChallengeStart').textContent='Try it';$('tideChallengeCheck').hidden=true;
  $('tideChallengeStatus').textContent='Two Moon positions make the biggest change. Can you find them?';
 }
 startTideChallenge(){
  if(!this.tideMode||!this.tideOcean)return;this.cancelCheckpoint();this.cancelTideDrag();this.playing=false;this.resetTideChallenge();this.tideChallenge.active=true;
  $('tideChallengeStart').textContent='Start again';$('tideChallengeCheck').hidden=false;$('tideChallengeStatus').textContent='Move the Moon, then check your position.';this.updateUI();
 }
 checkTideChallenge(){
  if(!this.tideMode||!this.tideOcean||!this.tideChallenge.active)return;
  const status=$('tideChallengeStatus');
  if(this.playing||this.timeFlight||this.solarFlight||this.lunarFlight||this.tideDrag){status.textContent='Pause the Moon in the position you want to check.';return;}
  if(this.solarMix<.99){status.textContent='Turn on the Sun’s pull to find the two biggest tides.';return;}
  const state=this.tideLearningState(),alignment=Math.cos(state.moonAngle-state.sunAngle);
  if(Math.abs(alignment)<Math.cos(Math.PI/18)){status.textContent='The change can be bigger. Try lining up the Sun, Earth and Moon.';return;}
  const side=alignment>0?'same':'opposite',found=this.tideChallenge.found;
  if(found.has(side)){status.textContent=found.size===2?'You found both: same side and opposite sides.': 'You found this one already. Look on the other side of Earth.';return;}
  found.add(side);$('tideDiscovery').dataset.found=String(found.size);$('tideChallengeCount').textContent=found.size+' / 2';
  status.textContent=found.size===2?'Both found! Same side or opposite sides, the tidal effects add together.':(side==='same'?'Same side found.':'Opposite sides found.')+' Can you find the other big tide?';
 }
 inspectTides(enabled){
  if(!this.tideMode)return;this.tideInspect=enabled;this.cancelTideDrag();this.cancelCheckpoint();this.playing=false;this.setView(this.top);this.updateUI();
 }
 toggleSolar(){
  if(!this.tideMode||!this.tideOcean)return;
  this.cancelCheckpoint();this.playing=false;this.solarEnabled=!this.solarEnabled;
  this.solarFlight={start:this.solarMix,end:this.solarEnabled?1:0,t:0};
  $('tideFeedback').textContent='Watch the rise and fall change.';
  if(reduced.matches){this.settleSolar(true);this.updateTideState(true);}
  this.updateUI();
 }
 settleSolar(feedback=false){
  const changed=this.solarMix!==(this.solarEnabled?1:0);
  this.solarMix=this.solarEnabled?1:0;this.solarFlight=null;this.solarFeedbackPending=feedback;
  if(changed)this.dirty=true;
 }
 advanceSolar(dt){
  if(!this.solarFlight)return false;
  const trip=this.solarFlight;trip.t+=dt;const t=Math.min(1,trip.t/SOLAR_DURATION),e=t*t*(3-2*t);
  this.solarMix=trip.start+(trip.end-trip.start)*e;this.dirty=true;
  if(t===1)this.settleSolar(true);
  return true;
 }
 updateTideState(offscreen=false){
  if(!this.tideMode||!this.tideOcean||!this.items.moon)return;
  let direction=this.items.moon.mesh.position;
  if(offscreen){
   const item=this.items.moon,angle=item.phase+this.days/MOONS.moon.period*TAU;
   this.tideDirection||=new THREE.Vector3();direction=this.tideDirection.set(Math.cos(angle),Math.sin(angle)*Math.sin(item.inclination),-Math.sin(angle)*Math.cos(item.inclination));
  }
  this.tideData=this.tideOcean.setState({moonDirection:direction,sunDirection:this.sunDirection,solarEnabled:this.solarEnabled,solarMix:this.solarMix,moonDistanceRatio:this.moonDistanceRatio,time:this.days*3,animated:this.playing&&!reduced.matches});
  this.updateTideReading();
  const state=this.tideLearningState();this.tideGuide?.setState(state);this.tideShore?.setState(state);
  if(this.solarFeedbackPending){
   this.solarFeedbackPending=false;
   $('tideFeedback').textContent=this.solarMix===0?'Moon only: the range stays the same around the orbit.':this.tideData.range>this.tideData.lunarWeight+.02?'Here, the Sun makes the rise and fall bigger.':this.tideData.range<this.tideData.lunarWeight-.02?'Here, the Sun makes the rise and fall smaller.':'Here, the rise and fall is nearly the same.';
  }
 }
 updateTideReading(){
  if(!this.tideData)return;const range=this.tideData.range;
  $('tideMeter').style.setProperty('--tide-range',Math.min(100,range/MAX_TIDE_RANGE*100).toFixed(1)+'%');
  $('tideStrength').textContent=this.solarMix===0&&!this.solarFlight?'Moon only':range>1.5?'Extra high':range>1.39?'Large':range<.63?'Small':'Between';
  $('tideStrength').setAttribute('aria-label','Ideal tide range, '+range.toFixed(2)+' times the mean-distance Moon-only range');
 }
 setTideDistance(ratio){
  this.moonDistanceRatio=ratio;
  if(this.tideMode&&this.parent==='earth'&&this.items.moon){
   const item=this.items.moon;item.r=TIDE_ORBIT_RADIUS*ratio;
   const positions=item.orbit.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){const a=i/(positions.count-1)*TAU;positions.setXYZ(i,Math.cos(a)*item.r,Math.sin(a)*item.r*Math.sin(item.inclination),-Math.sin(a)*item.r*Math.cos(item.inclination));}
   positions.needsUpdate=true;item.orbit.geometry.computeBoundingSphere();
  }
  this.modelDirty=true;this.dirty=true;
 }
 advanceLunar(dt){
  if(!this.lunarFlight)return false;
  const trip=this.lunarFlight;trip.t+=dt;const t=Math.min(1,trip.t/CHECKPOINT_DURATION),e=t*t*(3-2*t);
  this.setTideDistance(trip.start+(trip.end-trip.start)*e);
  if(t===1){this.setTideDistance(trip.end);this.lunarFlight=null;}
  return true;
 }
 moveTideDistance(target){
  if(reduced.matches||Math.abs(target-this.moonDistanceRatio)<1e-9){this.setTideDistance(target);this.lunarFlight=null;}
  else this.lunarFlight={start:this.moonDistanceRatio,end:target,t:0};
 }
 tideComparison(degrees){
  this.tidePreset(degrees);this.moveTideDistance(1);this.updateTideState(true);this.updateUI();
 }
 tideScenario(kind){
  if(!this.tideMode||!this.tideOcean||!['neap','spring','king'].includes(kind))return;
  this.cancelTideDrag();this.solarEnabled=true;this.settleSolar();
  this.tidePreset(kind==='neap'?90:0);
  this.moveTideDistance(kind==='king'?CLOSE_MOON_DISTANCE_RATIO:1);
  this.updateTideState(true);this.updateUI();
 }
 tidePreset(degrees){
  if(!this.tideMode||!this.tideOcean)return;this.cancelCheckpoint();this.playing=false;this.tidePresetAngle=degrees;
  const sunAngle=Math.atan2(-this.tideSunDirection.z/Math.cos(.09),this.tideSunDirection.x);
  const period=MOONS.moon.period,final=((sunAngle+degrees*Math.PI/180-this.items.moon.phase)%TAU+TAU)%TAU/TAU*period;
  const delta=((final-this.days+period*1.5)%period+period)%period-period*.5;
  this.timeFlight={kind:'tide',start:this.days,end:this.days+delta,final,t:0};
  if(reduced.matches||Math.abs(delta)<1e-8)this.finishCheckpoint();this.updateUI();
 }
 beginTideDrag(e){
  if(!this.tideMode||!this.tideOcean||!e.isPrimary||e.button!==0)return;
  const canvas=$('moonCanvas'),r=canvas.getBoundingClientRect(),p=this.items.moon.mesh.position.clone().project(this.camera);
  const x=(p.x*.5+.5)*r.width+r.left,y=(-p.y*.5+.5)*r.height+r.top;
  const ray=new THREE.Raycaster(),bodies=[this.items.earth.mesh,this.items.moon.mesh];
  ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);
  const hit=ray.intersectObjects(bodies,false)[0]?.object;
  if(hit===this.items.earth.mesh)return;
  if(hit!==this.items.moon.mesh){
   if(p.z< -1||p.z>=1||Math.hypot(e.clientX-x,e.clientY-y)>26)return;
   // Small moons have a padded target; an occluded Moon never steals Earth's input.
   ray.setFromCamera(new THREE.Vector2(p.x,p.y),this.camera);
   if(ray.intersectObjects(bodies,false)[0]?.object!==this.items.moon.mesh)return;
  }
  // Fix the interaction mode at pointerdown. Ray/plane angles are unstable
  // when viewed edge-on; a horizontal scrub stays predictable from either side.
  ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);
  const point=ray.ray.intersectPlane(new THREE.Plane(this.tideNormal,0),new THREE.Vector3());
  const angle=this.items.moon.phase+this.days/MOONS.moon.period*TAU;
  const scrub=Math.abs(this.camera.getWorldDirection(new THREE.Vector3()).dot(this.tideNormal))<.30||!point||point.length()<.4;
  const tangent=this.items.moon.mesh.position.clone().add(new THREE.Vector3(-Math.sin(angle),Math.cos(angle)*Math.sin(.09),-Math.cos(angle)*Math.cos(.09)).multiplyScalar(this.items.moon.r*.02)).project(this.camera);
  const tangentX=(tangent.x-p.x)*r.width/2,direction=Math.abs(tangentX)>.5?Math.sign(tangentX):1;
  const offset=scrub?0:angle-Math.atan2(-point.z/Math.cos(.09),point.x);
  e.preventDefault();e.stopImmediatePropagation();this.cancelCheckpoint();this.playing=false;this.pointer=null;this.controls.enabled=false;
  this.tideDrag={id:e.pointerId,scrub,startX:e.clientX,startAngle:angle,width:r.width,direction,offset};canvas.setPointerCapture(e.pointerId);this.updateUI();
  if(scrub)$('tideFeedback').textContent='Move left or right to turn the Moon.';
 }
 moveTideDrag(e){
  const drag=this.tideDrag;if(drag?.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
  let angle;
  if(drag.scrub)angle=drag.startAngle+THREE.MathUtils.clamp((e.clientX-drag.startX)/drag.width,-1,1)*TAU*drag.direction;
  else{
   const r=$('moonCanvas').getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);
   const point=ray.ray.intersectPlane(new THREE.Plane(this.tideNormal,0),new THREE.Vector3());if(!point||point.length()<.4)return;
   angle=Math.atan2(-point.z/Math.cos(.09),point.x)+drag.offset;
  }
  this.days=((angle-this.items.moon.phase)%TAU+TAU)%TAU/TAU*MOONS.moon.period;
  this.modelDirty=true;this.updateUI();$('tideFeedback').textContent=drag.scrub?'Move left or right to turn the Moon.':'The ocean reshapes as the Moon moves.';
 }
 cancelTideDrag(){
  const drag=this.tideDrag;this.tideDrag=null;this.controls.enabled=true;
  if(drag&&$('moonCanvas').hasPointerCapture(drag.id))$('moonCanvas').releasePointerCapture(drag.id);
 }
 positionSunCue(){
  const cue=$('tideSunCue');if(!this.tideMode){cue.hidden=true;return;}
  const {width,height}=this.labelLayout.bounds;
  // A fixed compass points toward the Sun's source direction. It is not a tiny Sun
  // placed on the composed orbit, and cannot collide with the moving labels.
  const direction=this.tideSunDirection.clone().transformDirection(this.camera.matrixWorldInverse);
  const dx=direction.x,dy=-direction.y,length=Math.hypot(dx,dy);
  cue.hidden=!width||!height||length<.08;
  if(cue.hidden)return;
  cue.style.left=(width*.14)+'px';cue.style.top='78px';
  cue.style.setProperty('--sun-arrow',Math.atan2(dy,dx)+'rad');
 }
 texture(path,colorSpace=THREE.SRGBColorSpace){
  const key=path+'|'+colorSpace;
  if(!this.textures.has(key)){
   const pending=this.loader.loadAsync(path).then(t=>{t.colorSpace=colorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t;}).catch(error=>{
    if(this.textures.get(key)===pending)this.textures.delete(key);
    throw error;
   });
   this.textures.set(key,pending);
  }
  return this.textures.get(key);
 }
 queueImage(path,apply,{colorSpace=THREE.SRGBColorSpace,optional=false}={}){
  this.imageLoads.push({path,apply,colorSpace,optional,request:this.request,state:'waiting',promise:null});
 }
 loadImages(images=this.imageLoads){
  const jobs=images.map(image=>{
   if(image.promise)return image.promise;
   if(image.state==='ready')return Promise.resolve();
   image.state=image.state==='failed'?'retrying':'loading';
   image.promise=this.texture(image.path,image.colorSpace).then(texture=>{
    // A previous family's meshes may already be disposed. Keep the texture
    // cached for a later visit, but only patch the current family's materials.
    if(image.request!==this.request)return;
    image.apply(texture);image.state='ready';this.dirty=true;
   }).catch(()=>{if(image.request===this.request)image.state='failed';}).finally(()=>{
    image.promise=null;if(image.request===this.request)this.updateImageStatus();
   });
   return image.promise;
  });
  this.updateImageStatus();return Promise.all(jobs);
 }
 retryImages(){return this.loadImages(this.imageLoads.filter(image=>image.state==='failed'||image.promise));}
 updateImageStatus(){
  const pending=this.imageLoads.some(image=>image.promise),retrying=this.imageLoads.some(image=>image.state==='retrying'),failed=this.imageLoads.filter(image=>image.state==='failed');
  $('moonStatus').textContent=pending?(retrying?'Retrying missing images…':'Preparing the moon system…'):failed.length?(failed.every(image=>image.optional)?'Earth’s cloud layer is unavailable. Surfaces and orbits still work.':'Some world images are unavailable. Orbits still work.'):'';
  $('moonRetry').hidden=!failed.length&&!retrying;$('moonRetry').disabled=pending;
  $('moonLoadNotice').hidden=!$('moonStatus').textContent;
 }
 async show(parent,selected,experiment='orbits'){
  this.settleSolar();
  const changed=this.tideMode!==(parent==='earth'&&experiment==='tides');this.tideMode=parent==='earth'&&experiment==='tides';if(changed)this.tideInspect=false;
  this.cancelTideDrag();this.cancelCheckpoint();this.configureObservation(parent);
  this.active=true;this.dirty=true;this.modelDirty=true;this.playing=!reduced.matches;if(this.parent===parent){if(this.days>=this.span)this.days=0;this.select(selected||this.selected);this.configureEarthExperiment();this.fitEarthStage();if(changed)this.setView(false,{immediate:true});this.resize();this.updateUI();return Promise.all([this.retryImages(),this.tideMode?this.loadTides():null]);}this.parent=parent;this.days=0;this.selected=selected||FAMILIES[parent][0];this.request++;this.imageLoads=[];
  // The Earth neighbourhood has neutral sunlight and a darker night side.
  // Restore the established rig when moving to either giant-planet family.
  this.ambientLight.color.setHex(parent==='earth'?0xffffff:0x73879a);this.ambientLight.intensity=parent==='earth'?.035:.34;
  this.sunlight.color.setHex(parent==='earth'?0xfffaf3:0xffedcf);this.sunlight.intensity=parent==='earth'?3.2:2.9;if(parent!=='earth'){this.sunDirection.copy(this.earthSunDirection);this.sunlight.position.set(-8,5,7);}
  for(const child of [...this.group.children]){child.traverse(o=>{if(o.geometry&&o.geometry!==this.sphere)o.geometry.dispose();if(o.material)o.material.dispose();});this.group.remove(child);}this.items={};this.labels=[];this.labelLayout.clear();$('moonLabels').replaceChildren();
  const ids=FAMILIES[parent];this.span=parent==='earth'?28:parent==='jupiter'?17:80;this.maxRadius=parent==='earth'?4.6:parent==='jupiter'?8.3:11.4;
  $('moonSystemTitle').textContent=parent==='earth'?'Earth & the Moon.':WORLDS[parent].title+'’s moons.';$('moonSystemIntro').innerHTML=parent==='earth'?'Why do we see the same face?<br>Follow the drawn gold pointer.':parent==='jupiter'?'Four moons. Four different worlds.<br>Fire, ice and hidden oceans.':'Seven moons beyond the rings.<br>Ice fountains, methane rain and a mountain seam.';
  $('moonSystemEyebrow').textContent=parent==='earth'?'OUR NEAREST NEIGHBOUR':parent==='jupiter'?'THE FOUR GALILEAN MOONS':'SEVEN MAJOR MOONS OF SATURN';$('moonClockNote').textContent=parent==='jupiter'?'Io makes about four trips while Ganymede makes one.':parent==='saturn'?'Watch the inner moons hurry past distant Iapetus.':'The Moon takes about 27 Earth days to circle Earth.';$('moonTimeSpan').textContent=this.span+' EARTH DAYS';
  
  this.makeBody(parent,1.3,0,0);
  ids.forEach((id,i)=>{const p=MOONS[id],r=parent==='earth'?4.6:3.5+i*(parent==='jupiter'?1.6:1.3166667),size=parent==='earth'?1.3*p.radius/WORLDS.earth.radius:Math.max(.115,1.3*p.radius/WORLDS[parent].radius*5.5);this.makeBody(id,size,r,i);});
  if(parent==='saturn')this.makeRings();this.configureEarthExperiment();this.fitEarthStage();this.setView(false,{immediate:true});this.resize();this.select(this.selected);this.updateUI();return Promise.all([this.loadImages(),this.tideMode?this.loadTides():null]);
 }
 configureObservation(parent){
  const earth=parent==='earth';$('moonSystemView').dataset.parent=parent;$('moonSystemView').dataset.experiment=this.tideMode?'tides':'orbits';
  $('earthExperiments').hidden=!earth;for(const a of $('earthExperiments').querySelectorAll('a')){if(a.dataset.experiment===(this.tideMode?'tides':'orbits'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  for(const id of ['tideControls','tideNotes','tideShore','tideDiscovery','tideInspect','tideModelKey'])$(id).hidden=!this.tideMode;this.tideGuide?.setActive(this.active&&this.tideMode);this.tideShore?.setActive(this.active&&this.tideMode);if(!this.tideMode)$('tideLearningNotice').hidden=true;if(this.tideMode)$('moonConsole').append($('tideControls'));
  $('moonCheckpoints').hidden=!earth||this.tideMode;$('moonObservationNotes').hidden=!earth||this.tideMode;
  $('moonCanvas').setAttribute('aria-label',this.tideMode?'Ocean tides. Drag the Moon to move it. Drag space or use arrow keys to turn the camera. Plus and minus zoom.':'Moon system. Click a world or its name to visit. Drag to orbit. Arrow keys turn the camera; plus and minus zoom.');
  if(this.tideOcean)this.tideOcean.object.visible=earth&&this.tideMode;
  if(earth)$('moonStage').before($('moonConsole'));else this.consoleAnchor.after($('moonConsole'));
  $('moonFaceGuide').setAttribute('hidden','');
  $('moonScaleKey').textContent=this.tideMode?'IDEAL OCEAN · DISTANCE COMPRESSED':earth?'GOLD POINTER · DRAWN SAME-FACE GUIDE':'COMPOSED DISTANCES · MOONS ENLARGED';
  $('moonGestureKey').textContent=this.tideMode?'DRAG THE MOON · DRAG SPACE TO TURN':earth?'TRY FROM ABOVE · DRAG TO ORBIT':'CLICK A WORLD TO VISIT · DRAG TO ORBIT';$('tideSunCue').hidden=!this.tideMode;
  if(!earth)$('moonStage').style.removeProperty('height');
 }
 fitEarthStage(){
  if(this.parent!=='earth'||!this.active||$('moonSystemView').hidden)return;
  const stage=$('moonStage'),console=$('moonConsole'),phone=this.tideMode&&matchMedia('(max-width:760px)').matches;
  if(phone){if(stage.nextElementSibling!==console)stage.after(console);}else if(console.nextElementSibling!==stage)stage.before(console);
  const top=stage.getBoundingClientRect().top+window.scrollY;
  // Leave scrolling room on short phones; fit the complete scene on ordinary arrivals.
  const reserve=phone?console.getBoundingClientRect().height+12:12;
  const height=Math.max(phone?300:280,Math.min(phone?480:this.tideMode?780:620,innerHeight-top-reserve));
  if(Math.abs(stage.getBoundingClientRect().height-height)>1)stage.style.height=height+'px';
 }
 cancelCheckpoint(){this.timeFlight=null;this.lunarFlight=null;this.checkpointTarget=null;this.tidePresetAngle=null;$('moonCheckpointStatus').textContent='The pointer turns with the Moon.';if($('tideFeedback'))$('tideFeedback').textContent='Move the Moon. Compare the daily change.';}
 checkpoint(fraction){
  if(!this.active||this.parent!=='earth'||!this.items.moon)return;
  this.cancelCheckpoint();this.playing=false;this.checkpointTarget=fraction;
  this.timeFlight={start:this.days,end:MOONS.moon.period*fraction,t:0};
  if(reduced.matches||Math.abs(this.days-this.timeFlight.end)<1e-9)this.finishCheckpoint();
  this.updateUI();
 }
 finishCheckpoint(){
  if(!this.timeFlight)return;const trip=this.timeFlight;this.days=trip.final??trip.end;this.timeFlight=null;this.modelDirty=true;
  if(trip.kind==='tide'){this.updateTideState(true);$('tideFeedback').textContent=this.solarFlight?'Watch the rise and fall change.':this.solarMix===0?'Moon only: same range, a new direction.':this.tidePresetAngle===90?'Right angle: a smaller rise and fall.':this.tidePresetAngle===180?'Opposite sides: bigger again.':'Same side: a bigger rise and fall.';return;}
  const fraction=this.checkpointTarget,label=fraction===.25?'¼ turn':fraction===.5?'½ turn':'One turn';
  $('moonCheckpointStatus').textContent=label+'; the pointer still faces Earth.';
 }
 makeBody(id,size,r,index){
  const p=WORLDS[id],material=new THREE.MeshStandardMaterial({roughness:1,color:0xffffff}),mesh=new THREE.Mesh(this.sphere,material);mesh.scale.set(size,size*(id==='jupiter'?.935:id==='saturn'?.902:1),size);mesh.userData.id=id;this.group.add(mesh);
  if(id==='earth'){earthMaterial(material);mesh.add(earthAtmosphere(this.sphere,this.sunDirection));}
  if(p.parent==='saturn'&&id!=='titan')material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.25);');};
  const phase=1.1+index*2.399963,inclination=id==='iapetus'?.27:id==='moon'?.09:0;this.items[id]={mesh,r,phase,inclination};
  const label=document.createElement('a');label.href='#'+id;label.className='orbit-label';label.innerHTML=`<i style="--planet:${p.color}"></i><span>${p.title}</span>`;label.setAttribute('aria-label','Visit '+p.title);$('moonLabels').append(label);const wire=document.createElement('i');wire.className='orbit-wire';$('moonLabels').prepend(wire);this.labels.push({id,label,wire});
  this.labelLayout.add(id,label,wire);
  if(r){const pts=[];for(let n=0;n<=192;n++){const a=n/192*TAU;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*Math.sin(inclination),-Math.sin(a)*r*Math.cos(inclination)));}const orbit=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xb8b4a6,transparent:true,opacity:.23}));this.group.add(orbit);this.items[id].orbit=orbit;}
  this.queueImage(r?'assets/research/'+p.map:'assets/orbits/'+id+'.jpg',texture=>{material.map=texture;material.needsUpdate=true;});
  if(id==='earth'){
   // Opacity is scalar data; sRGB decoding would erase much of the cloud veil.
   this.queueImage('assets/orbits/clouds.jpg',texture=>{
    const clouds=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({color:0xffffff,alphaMap:texture,transparent:true,opacity:.92,depthWrite:false,roughness:1}));
    clouds.name='earth-clouds';clouds.scale.setScalar(1.007);mesh.add(clouds);
   },{colorSpace:THREE.NoColorSpace,optional:true});
  }
 }
 makeRings(){const geo=new THREE.RingGeometry(1.3*1.235,1.3*2.27,160),pos=geo.attributes.position,uv=geo.attributes.uv;for(let n=0;n<pos.count;n++)uv.setXY(n,(Math.hypot(pos.getX(n),pos.getY(n))/1.3-1.235)/1.035,.5);const material=new THREE.MeshStandardMaterial({transparent:true,side:THREE.DoubleSide,roughness:1,depthWrite:false});const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;this.group.add(mesh);this.queueImage('assets/research/saturn-rings-radial-8k.png',texture=>{material.map=texture;material.needsUpdate=true;});}
 select(id){if(!MOONS[id])return;this.dirty=true;this.modelDirty=true;this.selected=id;if(location.hash.startsWith('#'+this.parent+'-moons'))history.replaceState(null,'','#'+this.parent+'-moons/'+(this.tideMode?'tides':id));$('moonFocus').value=id;const p=MOONS[id];$('moonSelectedKind').textContent=p.chapter;$('moonSelectedName').textContent=p.title;$('moonSelectedStory').textContent=p.text;$('visitMoon').href='#'+id;$('visitMoon').textContent='Visit '+p.title.replace(/^The /,'the ')+' ↗';for(const {id:key,label} of this.labels){label.classList.toggle('is-selected',key===id);if(this.items[key].orbit)this.items[key].orbit.material.opacity=key===id?.65:.23;}}
 setView(top,{immediate=false}={}){
  this.top=top;const dist=this.distance(),end=this.tideMode?new THREE.Vector3(0,top?dist:dist*TIDE_CAMERA_Y,top?.01:dist*Math.sqrt(1-TIDE_CAMERA_Y*TIDE_CAMERA_Y)):new THREE.Vector3(0,top?dist:dist*.6,top?.01:dist*.8);
  if(immediate||reduced.matches){this.camera.position.copy(end);this.controls.target.set(0,0,0);this.flight=null;this.controls.update();}
  else this.flight={start:this.camera.position.clone(),end,targetStart:this.controls.target.clone(),targetEnd:new THREE.Vector3(),t:0};
  this.dirty=true;$('moonTop').setAttribute('aria-pressed',String(top));$('moonPerspective').setAttribute('aria-pressed',String(!top));
 }
 distance(){if(this.tideMode){const tangent=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)),aspect=Math.max(.35,this.camera.aspect),cy=this.top?1:TIDE_CAMERA_Y,cz=this.top?0:Math.sqrt(1-cy*cy);let distance=2.03/(tangent*.80);for(let n=0;n<64;n++){const angle=n/64*TAU,x=Math.cos(angle)*TIDE_ORBIT_RADIUS,y=Math.sin(angle)*TIDE_ORBIT_RADIUS*Math.sin(.09),z=-Math.sin(angle)*TIDE_ORBIT_RADIUS*Math.cos(.09),depth=y*cy+z*cz,up=y*cz-z*cy;distance=Math.max(distance,depth+(Math.abs(x)+.36)/(tangent*aspect*.92),depth+(Math.abs(up)+.36)/(tangent*.80));}return distance*(this.tideInspect?.68:1);}return (this.maxRadius+.9)*Math.max(this.top?3.25:2.35,3.65/Math.max(.4,this.camera.aspect));}
 resize(){
  if(!this.parent)return;const r=$('moonStage').getBoundingClientRect();if(!r.width||!r.height)return;
  const oldFit=this.distance(),oldAspect=this.camera.aspect;this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.renderer.setSize(r.width,r.height,false);
  if(Math.abs(oldAspect-this.camera.aspect)>.05){
   // Fit the same viewpoint to the new viewport instead of resetting a user's orbit.
   this.camera.position.sub(this.controls.target).multiplyScalar(this.distance()/oldFit).add(this.controls.target);this.flight=null;
  }
  this.dirty=true;
  this.measureLabelBounds();
 }
 measureLabelBounds(){
  // Observe wrapping controls once, instead of reading their layout per label/frame.
  const stage=$('moonStage'),canvas=this.renderer.domElement.getBoundingClientRect(),toolbar=stage.querySelector('.orbit-toolbar').getBoundingClientRect(),key=stage.querySelector('.orbit-key').getBoundingClientRect();
  this.labelLayout.measure(canvas,toolbar,key);
  this.guideObstacles=[...stage.querySelectorAll('.orbit-toolbar button,.orbit-toolbar select')].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-canvas.left-4,right:r.right-canvas.left+4,top:r.top-canvas.top-4,bottom:r.bottom-canvas.top+4};});
 }
 hide(){this.cancelTideDrag();this.cancelCheckpoint();this.settleSolar();this.active=false;this.playing=false;this.tideGuide?.setActive(false);this.tideShore?.setActive(false);$('moonFaceGuide').setAttribute('hidden','');this.updateUI();}
 updateUI(){
  $('moonPlay').textContent=this.tideMode?(this.playing?'Ⅱ Pause':'▶ Play'):(this.playing?'Ⅱ Pause orbits':'▶ Play orbits');$('moonPlay').setAttribute('aria-pressed',String(this.playing));$('moonDay').value=Math.round(this.days/this.span*1000);$('moonDay').setAttribute('aria-valuetext',this.days.toFixed(1)+' Earth days');$('moonTime').textContent=this.tideMode?'Move the Moon':'Day '+this.days.toFixed(1);$('moonTimeSpan').textContent=this.tideMode?'ABOUT 27 DAYS':this.span+' EARTH DAYS';
  if(this.tideMode){const distanceKey=$('tideDistanceKey');if(distanceKey){distanceKey.hidden=this.moonDistanceRatio>.9999&&!this.lunarFlight;distanceKey.textContent=this.lunarFlight?'Moon distance changing':'Closer Moon · stronger tides';}$('tideInspect').setAttribute('aria-pressed',String(this.tideInspect));$('tideInspect').textContent=this.tideInspect?'Whole orbit':'Inspect water';$('moonGestureKey').textContent=this.tideInspect?'CLOSE VIEW · MOVE THE MOON WITH THE SLIDER':'DRAG THE MOON · DRAG SPACE TO TURN';const angle=this.days===this.span?360:(((this.items.moon.phase+this.days/MOONS.moon.period*TAU)*180/Math.PI)%360+360)%360;$('moonDay').value=Math.round(angle/360*1000);$('moonDay').setAttribute('aria-valuetext',Math.round(angle)+' degrees around the model orbit');$('tideSun').setAttribute('aria-pressed',String(this.solarEnabled));$('tideSun').querySelector('span').textContent=this.solarEnabled?'On':'Off';for(const button of document.querySelectorAll('[data-tide-angle]')){if(!this.timeFlight&&Number(button.dataset.tideAngle)===this.tidePresetAngle)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');}}
  if(this.parent==='earth'){
   const progress=this.days/MOONS.moon.period,near=value=>Math.abs(progress-value)<.0001;
   const value=near(.25)?'¼':near(.5)?'½':near(1)?'1':near(0)?'0':progress.toFixed(2);
   $('moonTurnReading').textContent=value+' orbit'+(progress>1.0001?'s':'')+' · '+value+' turn'+(progress>1.0001?'s':'');
   for(const button of document.querySelectorAll('[data-moon-checkpoint]')){
    if(!this.timeFlight&&near(Number(button.dataset.moonCheckpoint)))button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
   }
  }
 }
 advanceTime(dt){
  if(this.labelLayout.hasFocus())return false;
  if(this.timeFlight){
   const trip=this.timeFlight;trip.t+=dt;const t=Math.min(1,trip.t/CHECKPOINT_DURATION),e=t*t*(3-2*t);
   this.days=trip.start+(trip.end-trip.start)*e;
   if(t===1){this.finishCheckpoint();this.updateUI();}
   return true;
  }
  if(!this.playing)return false;const previousDays=this.days;
  this.days=Math.min(this.span,this.days+dt*(this.parent==='earth'?(this.tideMode?.45:1):.25));if(this.days>=this.span)this.playing=false;
  return this.days!==previousDays;
 }
 advanceOffscreen(dt,now){
  if(!this.active||!this.parent||(!this.playing&&!this.timeFlight&&!this.solarFlight&&!this.lunarFlight))return;
  const timeChanged=this.advanceTime(dt),solarChanged=this.advanceSolar(dt),lunarChanged=this.advanceLunar(dt);
  if(timeChanged)this.modelDirty=true;
  if(this.tideMode&&(timeChanged||solarChanged||lunarChanged))this.updateTideState(true);
  if(!this.playing||!this.lastRead||now-this.lastRead>100){this.updateUI();this.lastRead=now;}
 }
 frame(dt,now){
  if(!this.active||!this.parent)return;
  const wasPlaying=this.playing,timeChanged=this.advanceTime(dt);this.advanceSolar(dt);this.advanceLunar(dt);
  if(wasPlaying&&!this.playing){this.updateUI();this.lastRead=now;}
  const positionsChanged=this.modelDirty||timeChanged;
  if(positionsChanged){
   for(const [id,item] of Object.entries(this.items)){if(!item.r)continue;const angle=item.phase+this.days/MOONS[id].period*TAU;if(this.tideMode&&id==='moon')item.mesh.position.set(Math.cos(angle)*item.r,Math.sin(angle)*item.r*Math.sin(item.inclination),-Math.sin(angle)*item.r*Math.cos(item.inclination));else item.mesh.position.fromArray(moonPosition(id,this.days,item.r,FAMILIES[this.parent].indexOf(id)));item.mesh.rotation.set(item.inclination,angle,0);}
   this.modelDirty=false;
  }
  if(this.flight){this.flight.t+=dt;const t=reduced.matches?1:Math.min(1,this.flight.t/CAMERA_DURATION),e=t*t*(3-2*t);this.camera.position.lerpVectors(this.flight.start,this.flight.end,e);this.controls.target.lerpVectors(this.flight.targetStart,this.flight.targetEnd,e);this.dirty=true;if(t===1)this.flight=null;}
  this.controls.dampingFactor=reduced.matches?1:1-Math.pow(1-.065,dt*60);this.controls.update();
  const skyReady=this.sky.material.uniforms.skyReady.value;if(skyReady!==this.skyReady){this.skyReady=skyReady;this.dirty=true;}
  const redraw=this.dirty||positionsChanged;
  if(this.tideMode&&this.tideOcean&&(redraw||this.labelsMoving))this.updateTideState();
  if(redraw){this.renderer.render(this.scene,this.camera);this.dirty=false;}
  if(redraw||this.labelsMoving)this.labelsMoving=this.positionLabels(dt);
  if((redraw||wasPlaying)&&(!this.lastRead||now-this.lastRead>100)){this.updateUI();this.lastRead=now;}
 }
 positionLabels(dt){
  const {width,height}=this.labelLayout.bounds,scale=height/(2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2));
  if(!width||!height)return false;
  const items=this.labels.map(({id})=>{
   const mesh=this.items[id].mesh,p=mesh.position.clone().project(this.camera),view=mesh.position.clone().applyMatrix4(this.camera.matrixWorldInverse);
   const radius=mesh.scale.x*(id==='saturn'?2.27:1)*scale/Math.max(.001,-view.z);
   return {id,x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height,radius,visible:p.z>=-1&&p.z<1};
  });
  const moving=this.labelLayout.update(items,dt,{selected:this.selected,reducedMotion:reduced.matches});
  this.positionFaceGuide();this.positionSunCue();return moving;
 }
 positionFaceGuide(){
  const svg=$('moonFaceGuide'),moon=this.items.moon?.mesh,earth=this.items.earth?.mesh;
  if(this.parent!=='earth'||this.tideMode||!moon||!earth){svg.setAttribute('hidden','');return;}
  const {width,height,left,right,bottom}=this.labelLayout.bounds;
  const [center,face,planet,view,earthView]=this.guideVectors;
  moon.getWorldPosition(center);earth.getWorldPosition(planet);
  // Derive the direction from the real mesh orientation, not a line aimed at Earth.
  face.set(-1,0,0).applyMatrix4(moon.matrixWorld);
  view.copy(center).applyMatrix4(this.camera.matrixWorldInverse);earthView.copy(planet).applyMatrix4(this.camera.matrixWorldInverse);
  const scale=height/(2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2));
  const radius=moon.scale.x*scale/Math.max(.001,-view.z),earthRadius=earth.scale.x*scale/Math.max(.001,-earthView.z);
  center.project(this.camera);face.project(this.camera);planet.project(this.camera);
  const x=(center.x*.5+.5)*width,y=(-center.y*.5+.5)*height,dx=(face.x-center.x)*width/2,dy=-(face.y-center.y)*height/2;
  const length=Math.hypot(dx,dy),extent=radius+9;
  const covered=earthView.z>view.z&&Math.hypot((planet.x-center.x)*width/2,(planet.y-center.y)*height/2)<earthRadius+radius;
  // A nearly end-on direction has no stable screen angle. Never normalize it,
  // clip a pointer into controls, or draw it through the foreground Earth.
  const obstructed=this.guideObstacles?.some(r=>x+extent>r.left&&x-extent<r.right&&y+extent>r.top&&y-extent<r.bottom);
  if(!width||center.z<0||center.z>=1||length<(svg.hasAttribute('hidden')?2.5:1.5)||covered||obstructed||x-extent<left||x+extent>right||y-extent<8||y+extent>bottom){svg.setAttribute('hidden','');return;}
  const entry=this.labelLayout.entries.get('earth');
  if(entry?.target){
   const ex=(planet.x*.5+.5)*width+earthRadius+10,ey=(-planet.y*.5+.5)*height-entry.height/2;
   if(x+extent>ex&&x-extent<ex+entry.width&&y+extent>ey&&y-extent<ey+entry.height){svg.setAttribute('hidden','');return;}
  }
  svg.removeAttribute('hidden');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  $('moonFacePointer').setAttribute('transform',`translate(${x} ${y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`);
  $('moonFaceRing').setAttribute('r',radius+6);
  const tip=radius+8,neck=radius-1;
  $('moonFaceArrow').setAttribute('d',`M ${tip} 0 L ${neck} -6 L ${neck} -2 L -3 -2 L -3 2 L ${neck} 2 L ${neck} 6 Z`);
 }
}
