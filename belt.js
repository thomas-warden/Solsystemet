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
function rockGeometry(seed) {
 const random=randomGenerator(seed),geometry=new THREE.IcosahedronGeometry(1,5),positions=geometry.attributes.position,colors=[];
 const stretch=[.85+random()*.65,.65+random()*.6,.8+random()*.6];
 const craters=Array.from({length:9},()=>{const a=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y);return {x:r*Math.cos(a),y,z:r*Math.sin(a),radius:.12+random()*.3};});
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const n=noise(x*2.5+seed,y*2.5,z*2.5),detail=noise(x*12+seed,y*12,z*12);
  let radius=.79+n*.36+(detail-.5)*.075;
  for(const c of craters){const d=Math.hypot(x-c.x,y-c.y,z-c.z)/c.radius;if(d<1.3)radius+=.025*Math.exp(-Math.pow((d-.94)*9,2))-.13*Math.max(0,1-d*d);}
  positions.setXYZ(i,x*radius*stretch[0],y*radius*stretch[1],z*radius*stretch[2]);
  const v=.33+noise(x*8+seed,y*8,z*8)*.27+detail*.07;colors.push(v,v*.93,v*.82);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export class BeltFlight {
 constructor(){
  this.active=false;this.playing=!reduced.matches;this.speed=1;this.elapsed=0;this.look={x:0,y:0};
  const canvas=$('beltCanvas');
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0x030507);
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x030507,140,260);
  this.camera=new THREE.PerspectiveCamera(58,1,.1,600);
  this.scene.add(new THREE.AmbientLight(0x718093,.21));
  const sun=new THREE.DirectionalLight(0xffecd1,3.8);sun.position.set(-25,18,8);this.scene.add(sun);
  const bounce=new THREE.DirectionalLight(0x8da7c9,.17);bounce.position.set(20,-10,-35);this.scene.add(bounce);
  this.buildStars();this.buildRocks();this.bind();this.reset();
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('beltStage'));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.playing=false;this.active=false;this.updateUI();$('beltStatus').textContent='Graphics interrupted. Reload to resume the journey.';});
  reduced.addEventListener('change',e=>{if(e.matches){this.playing=false;this.look={x:0,y:0};this.updateUI();}});
  $('beltStatus').textContent='';
 }
 buildStars(){
  const random=randomGenerator(317),points=[];
  for(let i=0;i<550;i++){const a=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y);points.push(r*Math.cos(a)*440,y*440,r*Math.sin(a)*440);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  this.scene.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0x7a8b9c,size:.42,transparent:true,opacity:.5,fog:false,depthWrite:false})));
 }
 buildRocks(){
  const material=new THREE.MeshStandardMaterial({roughness:1,metalness:0,vertexColors:true});
  // Object-space mineral grain stays attached as each rock turns. No photo is claimed.
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 rockPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrockPosition=position;');
   const grain=`varying vec3 rockPosition;
    float rh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float rn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float grain(vec3 p){return rn(p*22.)*.5+rn(p*65.)*.32+rn(p*160.)*.18;}
   `;
   shader.fragmentShader=grain+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat dust=grain(rockPosition);diffuseColor.rgb*=.46+dust*.9;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 dx=dFdx(vViewPosition),dy=dFdy(vViewPosition);vec3 r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
    vec3 grad=sign(det)*(dFdx(dust)*r1+dFdy(dust)*r2);normal=normalize(abs(det)*normal-.10*grad);
   `);
  };
  this.variants=[];this.rocks=[];const perVariant=matchMedia('(max-width: 650px)').matches?16:24;
  for(let v=0;v<8;v++){
   const mesh=new THREE.InstancedMesh(rockGeometry(51+v*17),material,perVariant);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.scene.add(mesh);this.variants.push(mesh);
   for(let i=0;i<perVariant;i++)this.rocks.push({mesh,index:i});
  }
  this.dummy=new THREE.Object3D();
 }
 reset(){
  this.random=randomGenerator(4705);this.elapsed=0;this.passed=0;this.look={x:0,y:0};this.camera.position.set(0,0,0);this.camera.lookAt(0,0,-100);
  for(let i=0;i<this.rocks.length;i++)this.place(this.rocks[i],-8-(i/this.rocks.length)*(FAR-8));
  const foreground=[[-16,4,-32,4],[13,-6,-28,3.5],[-3,10,-55,3]];
  foreground.forEach(([x,y,z,size],i)=>Object.assign(this.rocks[i],{x,y,z,size}));
  this.drawRocks(0);this.updateUI();
 }
 place(rock,z=-FAR){
  const r=this.random,angle=r()*Math.PI*2;
  rock.size=.45+Math.pow(r(),2)*3.8;
  // Keep an open route. Near rocks pass outside the camera, never through it.
  const radius=5+rock.size*2+r()*48;
  rock.x=Math.cos(angle)*radius;rock.y=Math.sin(angle)*radius*.58;rock.z=z;
  rock.rotation=[r()*6.28,r()*6.28,r()*6.28];rock.spin=[(r()-.5)*.055,(r()-.5)*.085,(r()-.5)*.035];
 }
 drawRocks(dt){
  for(const rock of this.rocks){
   rock.z+=dt*13*this.speed;
   // Recycle only after the entire rock has travelled behind the camera.
   if(rock.z-rock.size*2>NEAR){this.place(rock);this.passed++;}
   const fade=THREE.MathUtils.clamp((FAR+rock.z)/20,0,1);
   this.dummy.position.set(rock.x,rock.y,rock.z);
   for(let i=0;i<3;i++)rock.rotation[i]+=rock.spin[i]*dt;
   this.dummy.rotation.set(...rock.rotation);this.dummy.scale.setScalar(rock.size*Math.max(0,fade));this.dummy.updateMatrix();rock.mesh.setMatrixAt(rock.index,this.dummy.matrix);
  }
  for(const mesh of this.variants)mesh.instanceMatrix.needsUpdate=true;
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
 resize(){const r=$('beltStage').getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
 show(){this.active=true;this.resize();this.updateUI();}
 hide(){this.active=false;if($('atlas').classList.contains('belt-cinema'))this.toggleCinema();}
 frame(dt){
  if(!this.active)return;
  const step=this.playing?Math.min(dt,.05):0;this.elapsed+=step;this.drawRocks(step);
  const smooth=reduced.matches?1:1-Math.exp(-dt*2);
  this.camera.position.x+=(this.look.x*1.5-this.camera.position.x)*smooth;this.camera.position.y+=(-this.look.y*.75-this.camera.position.y)*smooth;
  this.camera.lookAt(this.look.x*9,-this.look.y*5,-100);this.renderer.render(this.scene,this.camera);
 }
}
