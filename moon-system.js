import { addCelestialSky } from './sky-scene.js?v=20261014d';
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { WORLDS } from './worlds.js?v=20261014d';
import { MOONS, FAMILIES, moonPosition } from './moons.js?v=20261014d';
import { AnchoredLabels } from './orbit-labels.js?v=20261016labels';
const $=id=>document.getElementById(id),TAU=Math.PI*2;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const CAMERA_DURATION=.75;

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
  this.active=false;this.days=0;this.playing=!reduced.matches;this.parent='';this.items={};this.textures=new Map();this.request=0;this.dirty=true;this.modelDirty=true;
  this.renderer=new THREE.WebGLRenderer({canvas:$('moonCanvas'),antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0x030507);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.scene=new THREE.Scene();this.sky=addCelestialSky(this.scene);this.camera=new THREE.PerspectiveCamera(38,1,.03,500);this.camera.position.set(0,17,25);this.controls=new OrbitControls(this.camera,$('moonCanvas'));this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=4;this.controls.maxDistance=90;this.controls.maxPolarAngle=Math.PI*.9;this.controls.target.set(0,0,0);this.controls.addEventListener('start',()=>{this.flight=null;});this.controls.addEventListener('change',()=>{this.dirty=true;});
  this.ambientLight=new THREE.AmbientLight(0x73879a,.34);this.sunlight=new THREE.DirectionalLight(0xffedcf,2.9);this.sunlight.position.set(-8,5,7);this.sunDirection=this.sunlight.position.clone().normalize();this.scene.add(this.ambientLight,this.sunlight);this.group=new THREE.Group();this.scene.add(this.group);this.sphere=new THREE.SphereGeometry(1,64,40);this.loader=new THREE.TextureLoader();this.labels=[];
  this.labelLayout=new AnchoredLabels($('moonLabels'),()=>{this.dirty=true;});
  $('moonFocus').onchange=e=>this.select(e.target.value);
  $('moonPlay').onclick=()=>{if(this.days>=this.span)this.days=0;this.playing=!this.playing;this.updateUI();};$('moonDay').oninput=e=>{this.days=Number(e.target.value)/1000*this.span;this.playing=false;this.modelDirty=true;this.updateUI();};$('moonPerspective').onclick=()=>this.setView(false);$('moonTop').onclick=()=>this.setView(true);$('moonReset').onclick=()=>{this.days=0;this.playing=!reduced.matches;this.select(FAMILIES[this.parent][0]);this.setView(false);this.updateUI();};
  const canvas=$('moonCanvas');
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
  reduced.addEventListener('change',e=>{if(e.matches){this.playing=false;this.dirty=true;this.updateUI();}});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('moonStage'));
  this.labelObserver=new ResizeObserver(()=>this.measureLabelBounds());for(const el of $('moonStage').querySelectorAll('.orbit-toolbar,.orbit-key'))this.labelObserver.observe(el);
 }
 texture(path,colorSpace=THREE.SRGBColorSpace){const key=path+'|'+colorSpace;if(!this.textures.has(key))this.textures.set(key,this.loader.loadAsync(path).then(t=>{t.colorSpace=colorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.dirty=true;return t;}));return this.textures.get(key);}
 async show(parent,selected){
  this.active=true;this.dirty=true;this.modelDirty=true;this.playing=!reduced.matches;if(this.parent===parent){if(this.days>=this.span)this.days=0;this.select(selected||this.selected);this.resize();this.updateUI();return;}this.parent=parent;this.days=0;this.selected=selected||FAMILIES[parent][0];const token=++this.request;
  // The Earth neighbourhood has neutral sunlight and a darker night side.
  // Restore the established rig when moving to either giant-planet family.
  this.ambientLight.color.setHex(parent==='earth'?0xffffff:0x73879a);this.ambientLight.intensity=parent==='earth'?.035:.34;
  this.sunlight.color.setHex(parent==='earth'?0xfffaf3:0xffedcf);this.sunlight.intensity=parent==='earth'?3.2:2.9;
  for(const child of [...this.group.children]){child.traverse(o=>{if(o.geometry&&o.geometry!==this.sphere)o.geometry.dispose();if(o.material)o.material.dispose();});this.group.remove(child);}this.items={};this.labels=[];this.labelLayout.clear();$('moonLabels').replaceChildren();
  const ids=FAMILIES[parent];this.span=parent==='earth'?28:parent==='jupiter'?17:80;this.maxRadius=parent==='earth'?4.6:parent==='jupiter'?8.3:11.4;
  $('moonSystemTitle').textContent=parent==='earth'?'Earth & the Moon.':WORLDS[parent].title+'’s moons.';$('moonSystemIntro').innerHTML=parent==='earth'?'Two worlds, one familiar sky.<br>Watch the Moon circle our home.':parent==='jupiter'?'Four moons. Four different worlds.<br>Fire, ice and hidden oceans.':'Seven moons beyond the rings.<br>Ice fountains, methane rain and a mountain seam.';
  $('moonSystemEyebrow').textContent=parent==='earth'?'OUR NEAREST NEIGHBOUR':parent==='jupiter'?'THE FOUR GALILEAN MOONS':'SEVEN MAJOR MOONS OF SATURN';$('moonClockNote').textContent=parent==='jupiter'?'Io makes about four trips while Ganymede makes one.':parent==='saturn'?'Watch the inner moons hurry past distant Iapetus.':'The Moon takes about 27 Earth days to circle Earth.';$('moonTimeSpan').textContent=this.span+' EARTH DAYS';
  
  const jobs=[this.makeBody(parent,1.3,0,0)];
  ids.forEach((id,i)=>{const p=MOONS[id],r=parent==='earth'?4.6:3.5+i*(parent==='jupiter'?1.6:1.3166667),size=parent==='earth'?1.3*p.radius/WORLDS.earth.radius:Math.max(.115,1.3*p.radius/WORLDS[parent].radius*5.5);jobs.push(this.makeBody(id,size,r,i));});
  if(parent==='saturn')jobs.push(this.makeRings());this.setView(false,{immediate:true});this.resize();this.select(this.selected);this.updateUI();$('moonStatus').textContent='Preparing the moon system…';const results=await Promise.allSettled(jobs);if(token===this.request)$('moonStatus').textContent=results.some(r=>r.status==='rejected')?'Some imagery is unavailable. The orbit model is still active.':'';
 }
 async makeBody(id,size,r,index){
  const p=WORLDS[id],material=new THREE.MeshStandardMaterial({roughness:1,color:0xffffff}),mesh=new THREE.Mesh(this.sphere,material);mesh.scale.set(size,size*(id==='jupiter'?.935:id==='saturn'?.902:1),size);mesh.userData.id=id;this.group.add(mesh);
  if(id==='earth')earthMaterial(material);
  if(p.parent==='saturn'&&id!=='titan')material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.25);');};
  const phase=1.1+index*2.399963,inclination=id==='iapetus'?.27:id==='moon'?.09:0;this.items[id]={mesh,r,phase,inclination};
  const label=document.createElement('a');label.href='#'+id;label.className='orbit-label';label.innerHTML=`<i style="--planet:${p.color}"></i><span>${p.title}</span>`;label.setAttribute('aria-label','Visit '+p.title);$('moonLabels').append(label);const wire=document.createElement('i');wire.className='orbit-wire';$('moonLabels').prepend(wire);this.labels.push({id,label,wire});
  this.labelLayout.add(id,label,wire);
  if(r){const pts=[];for(let n=0;n<=192;n++){const a=n/192*TAU;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*Math.sin(inclination),-Math.sin(a)*r*Math.cos(inclination)));}const orbit=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xb8b4a6,transparent:true,opacity:.23}));this.group.add(orbit);this.items[id].orbit=orbit;}
  const texture=await this.texture(r?'assets/research/'+p.map:'assets/orbits/'+id+'.jpg');material.map=texture;material.needsUpdate=true;
  if(id==='earth'){
   // Opacity is scalar data; sRGB decoding would erase much of the cloud veil.
   const clouds=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({color:0xffffff,alphaMap:await this.texture('assets/orbits/clouds.jpg',THREE.NoColorSpace),transparent:true,opacity:.92,depthWrite:false,roughness:1}));
   clouds.name='earth-clouds';clouds.scale.setScalar(1.007);mesh.add(clouds,earthAtmosphere(this.sphere,this.sunDirection));this.dirty=true;
  }
 }
 async makeRings(){const geo=new THREE.RingGeometry(1.3*1.235,1.3*2.27,160),pos=geo.attributes.position,uv=geo.attributes.uv;for(let n=0;n<pos.count;n++)uv.setXY(n,(Math.hypot(pos.getX(n),pos.getY(n))/1.3-1.235)/1.035,.5);const material=new THREE.MeshStandardMaterial({transparent:true,side:THREE.DoubleSide,roughness:1,depthWrite:false});const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;this.group.add(mesh);material.map=await this.texture('assets/research/saturn-rings-radial-8k.png');material.needsUpdate=true;}
 select(id){if(!MOONS[id])return;this.dirty=true;this.modelDirty=true;this.selected=id;if(location.hash.startsWith('#'+this.parent+'-moons'))history.replaceState(null,'','#'+this.parent+'-moons/'+id);$('moonFocus').value=id;const p=MOONS[id];$('moonSelectedKind').textContent=p.chapter;$('moonSelectedName').textContent=p.title;$('moonSelectedStory').textContent=p.lead+' '+p.stories[0].text;$('visitMoon').href='#'+id;$('visitMoon').textContent='Visit '+p.title.replace(/^The /,'the ')+' ↗';for(const {id:key,label} of this.labels){label.classList.toggle('is-selected',key===id);if(this.items[key].orbit)this.items[key].orbit.material.opacity=key===id?.65:.23;}}
 setView(top,{immediate=false}={}){
  this.top=top;const dist=this.distance(),end=new THREE.Vector3(0,top?dist:dist*.6,top?.01:dist*.8);
  if(immediate||reduced.matches){this.camera.position.copy(end);this.controls.target.set(0,0,0);this.flight=null;this.controls.update();}
  else this.flight={start:this.camera.position.clone(),end,targetStart:this.controls.target.clone(),targetEnd:new THREE.Vector3(),t:0};
  this.dirty=true;$('moonTop').setAttribute('aria-pressed',String(top));$('moonPerspective').setAttribute('aria-pressed',String(!top));
 }
 distance(){return (this.maxRadius+.9)*Math.max(this.top?3.25:2.35,3.65/Math.max(.4,this.camera.aspect));}
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
 }
 hide(){this.active=false;this.playing=false;this.updateUI();}
 updateUI(){$('moonPlay').textContent=this.playing?'Ⅱ Pause orbits':'▶ Play orbits';$('moonPlay').setAttribute('aria-pressed',String(this.playing));$('moonDay').value=Math.round(this.days/this.span*1000);$('moonDay').setAttribute('aria-valuetext',this.days.toFixed(1)+' Earth days');$('moonTime').textContent='Day '+this.days.toFixed(1);}
 advanceTime(dt){
  if(!this.playing||this.labelLayout.hasFocus())return false;const previousDays=this.days;
  this.days=Math.min(this.span,this.days+dt*(this.parent==='earth'?1:.25));if(this.days>=this.span)this.playing=false;
  return this.days!==previousDays;
 }
 advanceOffscreen(dt,now){
  if(!this.active||!this.parent||!this.playing)return;
  if(this.advanceTime(dt))this.modelDirty=true;
  if(!this.playing||!this.lastRead||now-this.lastRead>100){this.updateUI();this.lastRead=now;}
 }
 frame(dt,now){
  if(!this.active||!this.parent)return;
  const wasPlaying=this.playing,timeChanged=this.advanceTime(dt);
  if(wasPlaying&&!this.playing){this.updateUI();this.lastRead=now;}
  const positionsChanged=this.modelDirty||timeChanged;
  if(positionsChanged){
   for(const [id,item] of Object.entries(this.items)){if(!item.r)continue;const angle=item.phase+this.days/MOONS[id].period*TAU;item.mesh.position.fromArray(moonPosition(id,this.days,item.r,FAMILIES[this.parent].indexOf(id)));item.mesh.rotation.set(item.inclination,angle,0);}
   this.modelDirty=false;
  }
  if(this.flight){this.flight.t+=dt;const t=reduced.matches?1:Math.min(1,this.flight.t/CAMERA_DURATION),e=t*t*(3-2*t);this.camera.position.lerpVectors(this.flight.start,this.flight.end,e);this.controls.target.lerpVectors(this.flight.targetStart,this.flight.targetEnd,e);this.dirty=true;if(t===1)this.flight=null;}
  this.controls.dampingFactor=reduced.matches?1:1-Math.pow(1-.065,dt*60);this.controls.update();
  const skyReady=this.sky.material.uniforms.skyReady.value;if(skyReady!==this.skyReady){this.skyReady=skyReady;this.dirty=true;}
  const redraw=this.dirty||positionsChanged;
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
  return this.labelLayout.update(items,dt,{selected:this.selected,reducedMotion:reduced.matches});
 }
}
