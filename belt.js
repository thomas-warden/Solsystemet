import { addCelestialSky } from './sky-scene.js?v=20261014d';
import * as THREE from './vendor/three.module.js';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const FAR = 260, NEAR = 16;

function randomGenerator(seed) {
 return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function hash(x,y,z) { const v=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return v-Math.floor(v); }
function noise(x,y,z) {
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 let fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
 const mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy),fz);
}
// The same terrain is sampled at two resolutions: relief holds up during a close pass.
export function rockGeometry(seed, detail=96) {
 const random=randomGenerator(seed),geometry=new THREE.SphereGeometry(1,detail,Math.round(detail*.7)),positions=geometry.attributes.position,colors=[];
 const stretch=[.9+random()*.6,.78+random()*.65,.8+random()*.5];
 const direction=()=>{const a=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y);return new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a));};
 const planes=Array.from({length:7},()=>({n:direction(),cut:.73+random()*.35}));
 const faults=Array.from({length:3},()=>({n:direction(),offset:(random()-.5)*.8}));
 const craters=Array.from({length:34},(_,i)=>({n:direction(),radius:i<5?.22+random()*.25:.035+random()*.12}));
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),n=new THREE.Vector3(x,y,z);
  const broad=noise(x*2.2+seed,y*2.2,z*2.2),medium=noise(x*9+seed,y*9,z*9),fine=noise(x*33+seed,y*33,z*33);
  let radius=.89+broad*.23+(medium-.5)*.06+(fine-.5)*.017,scar=0;
  for(const plane of planes){const dot=n.dot(plane.n);if(dot>0)radius=Math.min(radius,plane.cut/dot+(medium-.5)*.027);}
  for(const fault of faults){
   const d=Math.abs(n.dot(fault.n)-fault.offset+(noise(x*7+seed,y*7,z*7)-.5)*.11);
   const split=Math.exp(-d*d/.00023);radius-=split*.065;scar+=split*.12;
  }
  for(const c of craters){
   const d=n.distanceTo(c.n)/c.radius;
   if(d<1.2){const bowl=Math.max(0,1-d*d);radius+=c.radius*(.085*Math.exp(-Math.pow((d-.93)*13,2))-.34*bowl*bowl);scar+=bowl*.065;}
  }
  positions.setXYZ(i,x*radius*stretch[0],y*radius*stretch[1],z*radius*stretch[2]);
  const v=.235+broad*.13+medium*.04-scar;colors.push(v,v*.95,v*.87);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 // Smooth the longitude seam and duplicated pole vertices after displacement.
 const normals=geometry.attributes.normal,w=detail+1,h=Math.round(detail*.7),normal=new THREE.Vector3();
 for(let row=0;row<=h;row++){
  const first=row*w,last=first+detail;
  if(row===0||row===h){normal.set(0,0,0);for(let j=first;j<=last;j++)normal.add(new THREE.Vector3().fromBufferAttribute(normals,j));normal.normalize();for(let j=first;j<=last;j++)normals.setXYZ(j,normal.x,normal.y,normal.z);}
  else{normal.fromBufferAttribute(normals,first).add(new THREE.Vector3().fromBufferAttribute(normals,last)).normalize();normals.setXYZ(first,normal.x,normal.y,normal.z);normals.setXYZ(last,normal.x,normal.y,normal.z);}
 }
 geometry.computeBoundingSphere();return geometry;
}
const CRUISE=3.4, IMPACT_AT=12;
function orientation(body,age,target) { return target.setFromAxisAngle(body.axis,age*body.rate).multiply(body.initial); }
function support(geometry,quaternion,scale,side) {
 const point=new THREE.Vector3(),best=new THREE.Vector3(side>0?-Infinity:Infinity,0,0),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).multiplyScalar(scale).applyQuaternion(quaternion);if(point.x*side>best.x*side)best.copy(point);}
 return best;
}

export class BeltFlight {
 constructor(){
  this.active=false;this.playing=!reduced.matches;this.speed=1;this.elapsed=0;this.look={x:0,y:0};
  const canvas=$('beltCanvas');
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0x030507);
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x030507,180,260);
  this.camera=new THREE.PerspectiveCamera(58,1,.1,600);
  this.scene.add(new THREE.AmbientLight(0x718093,.21));
  const sun=new THREE.DirectionalLight(0xffecd1,3.8);sun.position.set(-25,18,8);this.scene.add(sun);
  const bounce=new THREE.DirectionalLight(0x8da7c9,.17);bounce.position.set(20,-10,-35);this.scene.add(bounce);
  this.buildStars();this.buildRocks();this.buildCollisions();this.bind();this.reset();
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('beltStage'));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.playing=false;this.active=false;this.updateUI();$('beltStatus').textContent='Graphics interrupted. Reload to resume the journey.';});
  reduced.addEventListener('change',e=>{if(e.matches){this.playing=false;this.look={x:0,y:0};this.updateUI();}});
  $('beltStatus').textContent='';
 }
 buildStars(){this.sky=addCelestialSky(this.scene);}
 buildRocks(){
  const material=new THREE.MeshStandardMaterial({roughness:1,metalness:0,vertexColors:true});
  // Several scales of mineral relief, attached to the rotating surface.
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 rockPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrockPosition=position;');
   shader.fragmentShader=`varying vec3 rockPosition;
    float rh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float rn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float coarse=rn(rockPosition*19.);
    float strata=sin(rockPosition.y*110.+rn(rockPosition*8.)*12.)*.5+.5;
    float grain=rn(rockPosition*88.);
    float fine=rn(rockPosition*250.);
    float closeDetail=1.-smoothstep(65.,140.,length(vViewPosition));
    float relief=coarse*.58+strata*.11+grain*.23+fine*.08*closeDetail;
    diffuseColor.rgb*=.7+coarse*.35+grain*.10+strata*.05;
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 dx=dFdx(vViewPosition),dy=dFdy(vViewPosition);
    vec3 r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
    vec3 grad=sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2);
    normal=normalize(abs(det)*normal-.075*grad);
   `);
  };
  this.material=material;
  this.shapes=Array.from({length:7},(_,i)=>({near:rockGeometry(51+i*17,128),far:rockGeometry(51+i*17,40)}));
  this.rocks=[];
  const count=matchMedia('(max-width: 650px)').matches?32:48;
  for(let i=0;i<count;i++){
   const shape=this.shapes[i%this.shapes.length],mesh=new THREE.Mesh(shape.far,material);this.scene.add(mesh);
   this.rocks.push({mesh,shape,large:i<10});
  }
  this.turn=new THREE.Quaternion();
 }
 reset(){
  this.random=randomGenerator(4705);this.elapsed=0;this.passed=0;this.look={x:0,y:0};this.camera.position.set(0,0,0);this.camera.lookAt(0,0,-100);
  for(let i=0;i<this.rocks.length;i++)this.place(this.rocks[i],-48-(i/this.rocks.length)*(FAR-48));
  const foreground=[[-26,-3,-58,13],[34,12,-105,17],[-15,37,-156,18]];
  foreground.forEach(([x,y,z,size],i)=>Object.assign(this.rocks[i],{x,y,z,size}));
  for(const event of this.collisions){event.active=false;event.group.visible=false;}
  this.startCollision(this.collisions[0]);this.nextCollision=48;
  this.drawRocks(0);this.drawCollisions(0);this.updateUI();
 }
 place(rock,z=-FAR){
  const r=this.random,angle=r()*Math.PI*2;
  rock.size=rock.large?7+r()*10:.5+Math.pow(r(),1.6)*3.2;
  // Clearance includes the full bounding sphere at every spin angle.
  const clearance=rock.size*rock.shape.near.boundingSphere.radius+9;
  const radius=clearance+r()*66;
  rock.x=Math.cos(angle)*radius;rock.y=Math.sin(angle)*radius;rock.z=z;
  rock.axis=new THREE.Vector3(r()-.5,r()-.5,r()-.5).normalize();
  rock.rate=(r()<.5?-1:1)*(rock.large?.012+r()*.018:.025+r()*.085);
  rock.mesh.quaternion.setFromEuler(new THREE.Euler(r()*6.28,r()*6.28,r()*6.28));
 }
 drawRocks(dt){
  for(const rock of this.rocks){
   rock.z+=dt*CRUISE*this.speed;
   if(rock.z-rock.size*rock.shape.near.boundingSphere.radius>NEAR){this.place(rock);this.passed++;}
   const fade=THREE.MathUtils.smoothstep(rock.z,-FAR,-FAR+30);
   rock.mesh.position.set(rock.x,rock.y,rock.z);
   if(dt)rock.mesh.quaternion.premultiply(this.turn.setFromAxisAngle(rock.axis,rock.rate*dt));
   rock.mesh.scale.setScalar(rock.size*fade);
   const distance=rock.mesh.position.distanceTo(this.camera.position);
   rock.mesh.geometry=distance/rock.size<12?rock.shape.near:rock.shape.far;
  }
 }
 buildCollisions(){
  // A bounded pool; choreography is illustrative, not an impact-frequency model.
  this.collisions=Array.from({length:3},()=>{
   const group=new THREE.Group();this.scene.add(group);
   const big=new THREE.Mesh(this.shapes[3].near,this.material),small=new THREE.Mesh(this.shapes[5].near,this.material);
   big.scale.setScalar(8);small.scale.setScalar(1.7);group.add(big,small);
   const chips=Array.from({length:9},(_,i)=>{const mesh=new THREE.Mesh(this.shapes[i%7].far,this.material);group.add(mesh);return {mesh};});
   const dustGeometry=new THREE.BufferGeometry();
   dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(42*3),3));
   dustGeometry.setAttribute('veil',new THREE.Float32BufferAttribute(new Float32Array(42),1));
   const dustMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:{pixelScale:{value:500}},
    vertexShader:`attribute float veil;varying float opacity;uniform float pixelScale;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(pixelScale*.8/-p.z,1.,36.);opacity=veil;}`,
    fragmentShader:`varying float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.1,1.,r))*opacity;gl_FragColor=vec4(.43,.40,.35,a);}`
   });
   const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;group.add(dust);
   return {group,big,small,chips,dust,active:false};
  });
 }
 startCollision(event){
  const r=this.random,axis=()=>new THREE.Vector3(r()-.5,r()-.5,r()-.5).normalize();
  event.active=true;event.startZ=this.elapsed<1?-116:-FAR;event.age=(event.startZ+116)/CRUISE;event.distance=0;event.group.visible=true;
  event.side=this.elapsed<1?1:(r()<.5?-1:1);
  event.bigBody={axis:axis(),rate:.014,initial:new THREE.Quaternion().setFromEuler(new THREE.Euler(.4,r()*6.28,.3))};
  event.smallBody={axis:axis(),rate:-.07,initial:new THREE.Quaternion().setFromEuler(new THREE.Euler(r(),r(),r()))};
  // Match actual support vertices in their contact poses, then separate the bodies.
  const qa=orientation(event.bigBody,IMPACT_AT,new THREE.Quaternion()),qb=orientation(event.smallBody,IMPACT_AT,new THREE.Quaternion());
  event.contact=support(event.big.geometry,qa,8,1);
  event.smallAtContact=event.contact.clone().sub(support(event.small.geometry,qb,1.7,-1));
  for(const chip of event.chips){chip.size=.09+r()*.23;chip.velocity=new THREE.Vector3(.35+r()*1.7,(r()-.5)*1.8,(r()-.3)*1.8);chip.axis=axis();chip.rate=(r()-.5)*.7;chip.mesh.quaternion.identity();}
  event.dustVelocities=Array.from({length:42},()=>new THREE.Vector3(.1+r()*1.3,(r()-.5)*1.5,(r()-.4)*1.5));
 }
 drawCollisions(dt){
  if(this.elapsed>=this.nextCollision){
   const free=this.collisions.find(e=>!e.active);
   if(free){this.startCollision(free);this.nextCollision=this.elapsed+48;}
  }
  for(const event of this.collisions){
   if(!event.active)continue;
   event.age+=dt*this.speed;event.distance+=dt*CRUISE*this.speed;
   const t=event.age-IMPACT_AT,z=event.startZ+event.distance;
   event.group.position.set((-10-Math.max(0,z+116)*.25)*event.side,7,z);
   event.group.scale.setScalar(THREE.MathUtils.smoothstep(z,-FAR,-FAR+30));
   event.group.rotation.y=event.side<0?Math.PI:0;
   if(z-24>NEAR){event.active=false;event.group.visible=false;continue;}
   orientation(event.bigBody,Math.max(0,event.age),event.big.quaternion);
   orientation(event.smallBody,Math.max(0,event.age)+Math.max(0,t)*1.8,event.small.quaternion);
   event.small.position.copy(event.smallAtContact);
   if(t<0){const approach=Math.min(-t,IMPACT_AT);event.small.position.add(new THREE.Vector3(approach*.95,approach*.37,approach*.12));}
   else event.small.position.add(new THREE.Vector3(t*.7,-t*.58,t*.24));
   const life=THREE.MathUtils.smoothstep(t,0,.18)*(1-THREE.MathUtils.smoothstep(t,12,20));
   for(const chip of event.chips){
    chip.mesh.visible=life>0;if(!chip.mesh.visible)continue;
    chip.mesh.position.copy(event.contact).addScaledVector(chip.velocity,t);
    chip.mesh.quaternion.setFromAxisAngle(chip.axis,t*chip.rate);
    chip.mesh.scale.setScalar(chip.size*life);
   }
   const positions=event.dust.geometry.attributes.position,veil=event.dust.geometry.attributes.veil;
   const opacity=t>0?Math.min(t/.3,1)*Math.exp(-t/.95)*.22:0;
   event.dust.visible=opacity>.0001;
   if(event.dust.visible){
    for(let i=0;i<positions.count;i++){const v=event.dustVelocities[i];positions.setXYZ(i,event.contact.x+v.x*t,event.contact.y+v.y*t,event.contact.z+v.z*t);veil.setX(i,opacity);}
    positions.needsUpdate=true;veil.needsUpdate=true;
   }
  }
 }
 bind(){
  $('beltPlay').onclick=()=>{this.playing=!this.playing;this.updateUI();};
  $('beltFlightState').onclick=()=>$('beltPlay').click();
  $('beltSpeed').oninput=e=>{this.speed=Number(e.target.value);this.updateUI();};
  $('beltRestart').onclick=()=>{this.speed=1;$('beltSpeed').value='1';this.reset();};
  $('beltCinema').onclick=()=>this.toggleCinema();
  const canvas=$('beltCanvas');
  const look=e=>{if(reduced.matches)return;const r=canvas.getBoundingClientRect();this.look.x=((e.clientX-r.left)/r.width-.5)*2;this.look.y=((e.clientY-r.top)/r.height-.5)*2;};
  canvas.addEventListener('pointerdown',e=>{if(e.isPrimary){this.dragging=true;canvas.setPointerCapture(e.pointerId);look(e);}});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||this.dragging)look(e);});
  canvas.addEventListener('pointerup',()=>{this.dragging=false;});canvas.addEventListener('pointercancel',()=>{this.dragging=false;this.look={x:0,y:0};});
  canvas.addEventListener('pointerleave',()=>{if(!this.dragging)this.look={x:0,y:0};});
  canvas.addEventListener('keydown',e=>{
   if(e.code==='Space'){e.preventDefault();$('beltPlay').click();return;}
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();
   if(e.key==='Home')this.look={x:0,y:0};
   else{this.look.x=THREE.MathUtils.clamp(this.look.x+(e.key==='ArrowLeft'?-.2:e.key==='ArrowRight'?.2:0),-1,1);this.look.y=THREE.MathUtils.clamp(this.look.y+(e.key==='ArrowUp'?-.2:e.key==='ArrowDown'?.2:0),-1,1);}
  });
 }
 toggleCinema(){const active=$('atlas').classList.toggle('belt-cinema');$('beltCinema').textContent=active?'Return to exploration ↙':'View only ⤢';$('beltCinema').setAttribute('aria-pressed',String(active));}
 updateUI(){
  $('beltPlay').textContent=this.playing?'Ⅱ Pause flight':this.elapsed>0?'▶ Resume flight':'▶ Begin flight';$('beltPlay').setAttribute('aria-pressed',String(this.playing));
  $('beltFlightState').textContent=this.playing?'Ⅱ PAUSE FLIGHT':'▶ RESUME FLIGHT';$('beltFlightState').setAttribute('aria-pressed',String(this.playing));
  $('beltSpeedLabel').textContent=this.speed<.7?'Drift':this.speed>1.6?'Fly':'Cruise';
  $('beltSpeed').setAttribute('aria-valuetext',this.speed.toFixed(2)+' times cruise speed');
 }
 resize(){const r=$('beltStage').getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();for(const event of this.collisions)event.dust.material.uniforms.pixelScale.value=r.height*this.renderer.getPixelRatio();}
 show(){this.active=true;this.resize();this.updateUI();}
 hide(){this.active=false;if($('atlas').classList.contains('belt-cinema'))this.toggleCinema();}
 frame(dt){
  if(!this.active)return;
  const step=this.playing?Math.min(dt,.05):0;this.elapsed+=step;this.drawRocks(step);this.drawCollisions(step);
  const smooth=reduced.matches?1:1-Math.exp(-dt*2);
  this.camera.position.x+=(this.look.x*1.5-this.camera.position.x)*smooth;this.camera.position.y+=(-this.look.y*.75-this.camera.position.y)*smooth;
  this.camera.lookAt(this.look.x*9,-this.look.y*5,-100);this.renderer.render(this.scene,this.camera);
 }
}
