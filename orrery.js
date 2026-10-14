import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { ORDER, WORLDS, orbitalPosition } from './worlds.js';
const $=id=>document.getElementById(id),YEAR=WORLDS.earth.period,EPOCH=16550;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export class Orrery {
 constructor(){
  this.active=false;this.days=0;this.playing=false;this.experiment=false;this.selected='earth';this.spacing=0;this.targetSpacing=0;this.speed=20;this.lastRead=0;
  const canvas=$('orreryCanvas');this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0x030507);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.03,1500);this.camera.position.set(0,30,42);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.065;this.controls.enablePan=false;this.controls.minDistance=3;this.controls.maxDistance=140;this.controls.minPolarAngle=.04;this.controls.maxPolarAngle=Math.PI*.88;this.controls.rotateSpeed=.6;this.controls.zoomSpeed=.8;
  this.controls.addEventListener('start',()=>{this.flight=null;});
  this.scene.add(new THREE.AmbientLight(0x7b8b9e,.38));this.sunlight=new THREE.PointLight(0xffead5,2.7,0,0);this.scene.add(this.sunlight);
  this.textureLoader=new THREE.TextureLoader();this.sphere=new THREE.SphereGeometry(1,64,40);this.meshes={};this.orbits={};this.labels={};this.starts={};this.wires={};
  this.buildSun();this.buildStars();this.buildBelt();this.sunLabel=document.createElement('span');this.sunLabel.className='sun-label';this.sunLabel.textContent='SUN';$('orbitLabels').append(this.sunLabel);
  const loads=ORDER.map(id=>this.buildPlanet(id));
  Promise.allSettled(loads).then(results=>{$('orreryStatus').textContent=results.some(r=>r.status==='rejected')?'Some surface maps unavailable — the orbital model is still active.':'';});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('orreryStage'));
  this.bind();this.select('earth');this.trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xd5c198,transparent:true,opacity:.88}));this.scene.add(this.trail);this.resize();this.updateUI();
 }
 buildSun(){
  const mat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 vP; varying vec3 vN; void main(){vP=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vP; varying vec3 vN; uniform float time;
  float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){float g=n(vP*80.+time*.035)*.45+n(vP*29.)*.3+n(vP*12.)*.25;float limb=.62+.38*pow(max(vN.z,0.),.45);vec3 c=mix(vec3(1.35,.40,.08),vec3(2.,1.28,.43),g)*limb;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
  this.sun=new THREE.Mesh(this.sphere,mat);this.sun.scale.setScalar(1.25);this.scene.add(this.sun);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=256;const c=glowCanvas.getContext('2d'),g=c.createRadialGradient(128,128,20,128,128,128);g.addColorStop(0,'rgba(255,221,166,.55)');g.addColorStop(.3,'rgba(252,172,81,.22)');g.addColorStop(.6,'rgba(228,111,41,.055)');g.addColorStop(1,'rgba(200,90,20,0)');c.fillStyle=g;c.fillRect(0,0,256,256);
  this.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.glow.scale.set(9,9,1);this.scene.add(this.glow);
 }
 buildStars(){let seed=77;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const positions=[],colors=[];for(let i=0;i<750;i++){const y=random()*2-1,a=random()*Math.PI*2,r=250+random()*100,s=Math.sqrt(1-y*y);positions.push(r*s*Math.cos(a),r*y,r*s*Math.sin(a));let v=.07+random()*.25;colors.push(v*.8,v*.9,v);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size:.65,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.7,depthWrite:false})));}
 buildBelt(){
  let seed=921;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};this.asteroids=[];
  for(let n=0;n<1050;n++){const a=2.1+random()*1.2;this.asteroids.push({a,e:.025+random()*.065,i:(random()-.5)*9,L:random()*360,peri:random()*360,node:random()*360,period:365.256*Math.pow(a,1.5)});}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.asteroids.length*3),3));this.belt=new THREE.Points(g,new THREE.PointsMaterial({color:0xa89d87,size:.044,transparent:true,opacity:.48,sizeAttenuation:true,depthWrite:false}));this.scene.add(this.belt);
  this.beltLabel=document.createElement('button');this.beltLabel.className='orbit-label belt-label';this.beltLabel.textContent='Asteroid belt';this.beltLabel.onclick=()=>this.showBelt();$('orbitLabels').append(this.beltLabel);
  fetch('assets/research/moon-stories.json').then(r=>r.json()).then(data=>{const stories=data.belt?.stories||data.asteroid_belt?.stories||[];for(const story of stories){const a=document.createElement('article');a.className='story';const h=document.createElement('h3'),p=document.createElement('p'),link=document.createElement('a');h.textContent=story.title;p.textContent=story.text;link.textContent='Field source ↗';link.href=story.source;link.target='_blank';link.rel='noopener';a.append(h,p,link);$('beltStories').append(a);}}).catch(()=>{});
 }
 showBelt(){this.select('mars');this.beltSelected=true;ORDER.forEach(id=>{this.labels[id].setAttribute('aria-pressed','false');this.orbits[id].material.opacity=.3;});document.querySelectorAll('[data-orbit]').forEach(b=>b.setAttribute('aria-pressed','false'));this.following=null;this.fly('belt');$('beltButton').setAttribute('aria-pressed','true');$('beltDiscovery').hidden=false;$('orbitKind').textContent='ROCKY LEFTOVERS FROM THE BEGINNING';$('orbitName').textContent='Asteroid belt';$('orbitFact').innerHTML='A wide band of small worlds <strong>between Mars and Jupiter.</strong><br><span>The points are a tiny, enlarged sample of the real belt.</span>';$('followOrbit').textContent='Return to whole system ↙';$('visitPlanet').hidden=true;history.replaceState(null,'','#belt');}
 async buildPlanet(id){
  const p=WORLDS[id],group=new THREE.Group();this.scene.add(group);
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
  if(id==='earth')material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n float water=(1.-smoothstep(.0003,.008,diffuseColor.r))*smoothstep(.0001,.001,diffuseColor.b-diffuseColor.r);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.003,.013,.033),water*.9);');};
  if(id==='mars')material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),.16);');};
  if(id==='venus')material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(.73,.69,.59),diffuseColor.rgb,.15);');};
  const mesh=new THREE.Mesh(this.sphere,material);mesh.scale.y=id==='saturn'?.902:id==='jupiter'?.935:.99;group.add(mesh);mesh.rotation.z=id==='uranus'?1.71:id==='earth'?.409:id==='saturn'?.466:.03;mesh.userData.world=id;
  this.meshes[id]={group,mesh};
  if(id==='earth'){const clouds=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({color:0xffffff,alphaMap:this.textureLoader.load('assets/orbits/clouds.jpg'),transparent:true,opacity:.92,depthWrite:false,roughness:1}));clouds.scale.setScalar(1.007);mesh.add(clouds);}
  if(id==='saturn'){
   const geom=new THREE.RingGeometry(1.235,2.27,160,1),pos=geom.attributes.position,uv=geom.attributes.uv;
   for(let i=0;i<pos.count;i++){const r=Math.hypot(pos.getX(i),pos.getY(i));uv.setXY(i,(r-1.235)/1.035,.5);}
   const ringMat=new THREE.MeshStandardMaterial({map:this.texture('assets/research/saturn-rings-radial-8k.png'),transparent:true,side:THREE.DoubleSide,depthWrite:false,roughness:1});
   const ring=new THREE.Mesh(geom,ringMat);ring.rotation.x=-Math.PI/2;ring.rotation.y=.466;group.add(ring);
  }
  const points=new Float32Array(257*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:p.color,transparent:true,opacity:.22}));this.scene.add(line);this.orbits[id]=line;
  const start=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:p.color}));this.scene.add(start);this.starts[id]=start;
  const label=document.createElement('button');label.className='orbit-label';label.dataset.planet=id;label.innerHTML=`<i style="--planet:${p.color}"></i><span>${p.title}</span>`;label.setAttribute('aria-label','Select '+p.title);label.onclick=()=>this.select(id);$('orbitLabels').append(label);this.labels[id]=label;const wire=document.createElement('i');wire.className='orbit-wire';$('orbitLabels').prepend(wire);this.wires[id]=wire;
  const tile=document.createElement('button');tile.dataset.orbit=id;tile.innerHTML=`<span><i style="background:${p.color}"></i>${p.title}</span><strong>0.00<small> laps</small></strong><div><b></b></div>`;tile.onclick=()=>this.select(id);$('orbitScoreboard').append(tile);
  const texture=await this.textureLoader.loadAsync('assets/orbits/'+id+'.jpg');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());material.map=texture;material.needsUpdate=true;
 }
 texture(path){const t=this.textureLoader.load(path);t.colorSpace=THREE.SRGBColorSpace;return t;}
 bind(){
  $('orbitPlay').onclick=()=>{this.playing=!this.playing;if(this.playing&&this.days>=YEAR)this.days=0;this.experiment=false;this.updateUI();};
  $('oneYear').onclick=()=>{this.days=0;this.speed=20;$('orbitSpeed').value='20';this.playing=true;this.experiment=true;this.updateUI();};
  $('orbitDay').oninput=e=>{this.days=Number(e.target.value)/1000*YEAR;this.playing=false;this.experiment=false;this.updateUI();};
  $('orbitSpeed').onchange=e=>{this.speed=Number(e.target.value);};
  $('composedSpace').onclick=()=>this.setSpacing(0);$('trueSpace').onclick=()=>this.setSpacing(1);
  $('followOrbit').onclick=()=>{if(this.beltSelected){this.select('earth');this.fly('perspective');return;}if(this.following){this.following=null;this.fly('perspective');}else this.follow(this.selected);this.select(this.selected);};
  $('beltButton').onclick=()=>this.showBelt();
  $('innerSystem').onclick=()=>this.fly('inner');
  $('obliqueView').onclick=()=>this.fly('perspective');$('overheadView').onclick=()=>this.fly('top');
  $('resetOrbit').onclick=()=>{this.speed=20;$('orbitSpeed').value='20';this.days=0;this.playing=false;this.experiment=false;$('yearInsight').innerHTML='<span class="eyebrow">TRY THIS</span><p>One circle means one trip around the Sun. Watch one Earth year and count the whole trips.</p>';this.setSpacing(0);this.select('earth');this.updateUI();};
  const canvas=$('orreryCanvas');canvas.addEventListener('pointerdown',e=>{this.pointer={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{if(!this.pointer||Math.hypot(e.clientX-this.pointer.x,e.clientY-this.pointer.y)>6)return;const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);const hits=ray.intersectObjects(ORDER.map(id=>this.meshes[id].mesh));if(hits.length)this.select(hits[0].object.userData.world);});
  canvas.onkeydown=e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'];if(!keys.includes(e.key))return;e.preventDefault();this.flight=null;const s=new THREE.Spherical().setFromVector3(this.camera.position);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi=Math.max(.05,s.phi-.1);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI*.88,s.phi+.1);if(['+','='].includes(e.key))s.radius=Math.max(3,s.radius*.85);if(e.key==='-')s.radius=Math.min(140,s.radius/ .85);this.camera.position.setFromSpherical(s);this.controls.update();};
 }
 select(id){
  if(location.hash==='#belt')history.replaceState(null,'','#orrery');this.beltSelected=false;$('beltDiscovery').hidden=true;$('beltButton').setAttribute('aria-pressed','false');$('visitPlanet').hidden=false;
  const changed=this.selected!==id;this.selected=id;if(changed&&this.following)this.follow(id);const p=WORLDS[id];$('orbitKind').textContent=['FIRST','SECOND','THIRD','FOURTH','FIFTH','SIXTH','SEVENTH','EIGHTH'][ORDER.indexOf(id)]+' WORLD FROM THE SUN';$('orbitName').textContent=p.title;
  const year=p.period<730?Math.round(p.period)+' Earth days':(p.period/YEAR).toFixed(p.period>30000?0:1)+' Earth years';
  $('followOrbit').textContent=this.following?'Return to whole system ↙':'Follow '+p.title+' ⊙';
  $('orbitFact').innerHTML=`One year here takes <strong>${year}</strong>.<br><span>${p.a.toFixed(2)}× Earth’s distance from the Sun.</span>`;
  $('visitPlanet').href='#'+id;$('visitPlanet').innerHTML='Travel to '+p.title+' <span>↗</span>';
  ORDER.forEach(key=>{this.labels[key]?.setAttribute('aria-pressed',String(key===id));if(this.orbits[key])this.orbits[key].material.opacity=key===id?.62:.30;});
  document.querySelectorAll('[data-orbit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.orbit===id)));
 }
 setSpacing(value){this.targetSpacing=value;$('composedSpace').setAttribute('aria-pressed',String(!value));$('trueSpace').setAttribute('aria-pressed',String(!!value));$('scaleNote').textContent=value?'TRUE ORBITAL DISTANCES · BODIES STILL ENLARGED':'COMPOSED DISTANCES · PLANETS ENLARGED';this.fly('perspective');}
 follow(id){this.following=id;const item=this.meshes[id],dist=Math.max(2.1,item.group.scale.x*4.5);this.flight={start:this.camera.position.clone(),end:item.group.position.clone().add(new THREE.Vector3(dist*.7,dist*.55,dist)),targetStart:this.controls.target.clone(),targetEnd:item.group.position.clone(),t:0};this.lastFollowPosition=item.group.position.clone();}
 fly(view){this.cameraMode=view;this.following=null;$('followOrbit').textContent=this.beltSelected?'Return to whole system ↙':'Follow '+WORLDS[this.selected].title+' ⊙';let distance=view==='belt'?(this.targetSpacing?8:32):view==='inner'?(this.targetSpacing?4:22):this.fitDistance();const end=view==='top'?new THREE.Vector3(0,distance,.01):new THREE.Vector3(0,distance*.58,distance*.815);this.flight={start:this.camera.position.clone(),end,targetStart:this.controls.target.clone(),targetEnd:new THREE.Vector3(),t:0};$('obliqueView').setAttribute('aria-pressed',String(view==='perspective'));$('overheadView').setAttribute('aria-pressed',String(view==='top'));$('innerSystem').setAttribute('aria-pressed',String(view==='inner'));}
 fitDistance(){const base=this.cameraMode==='top'?74:49;return Math.max(base,base/Math.max(.45,this.camera.aspect)*1.25);}
 resize(){const r=$('orreryStage').getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);const previousAspect=this.camera.aspect;this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();if(this.initialFit&&Math.abs(previousAspect-this.camera.aspect)>.12&&!this.following){this.camera.position.setLength(this.fitDistance());this.controls.target.set(0,0,0);this.flight=null;}if(!this.initialFit){const d=this.fitDistance();this.camera.position.set(0,d*.58,d*.815);this.initialFit=true;}}
 updateUI(){
  const complete=this.days>=YEAR-.001;if(complete!==this.insightComplete){this.insightComplete=complete;$('yearInsight').innerHTML=complete?'<span class="eyebrow">ONE YEAR LATER</span><p>Mercury finished <strong>4 whole trips.</strong> Earth finished <strong>1 whole trip.</strong> Neptune is still near the start of its first. Each circle below shows the trip still underway.</p>':'<span class="eyebrow">TRY THIS</span><p>One circle means one trip around the Sun. Watch one Earth year and count the whole trips.</p>';}
  $('orbitPlay').innerHTML=this.playing?'Ⅱ Pause time':'▶ Play time';$('orbitPlay').setAttribute('aria-pressed',String(this.playing));$('oneYear').classList.toggle('is-running',this.experiment);$('oneYear').textContent=this.experiment?'One year unfolding…':'Watch one Earth year ↗';
  $('orbitDay').value=Math.min(1000,Math.round(this.days/YEAR*1000));$('orbitDay').setAttribute('aria-valuetext',Math.round(this.days)+' Earth days');$('orbitTime').textContent='Day '+Math.floor(this.days).toLocaleString();
  document.querySelectorAll('[data-orbit]').forEach(el=>{const laps=this.days/WORLDS[el.dataset.orbit].period;const whole=Math.floor(laps+1e-8),part=Math.max(0,laps-whole),circ=87.96;el.querySelector('strong').innerHTML=`<svg class="trip-dial" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="14"/><circle class="trip-progress" cx="17" cy="17" r="14" stroke-dasharray="${part*circ} ${circ}"/></svg>${whole}<small>whole<br>${whole===1?'trip':'trips'}</small>`;let caption=el.querySelector('.trip-caption');if(!caption){caption=document.createElement('span');caption.className='trip-caption';el.append(caption);}caption.textContent=part<.001?'Ready for trip '+(whole+1):'Trip '+(whole+1)+' underway';el.setAttribute('aria-label',WORLDS[el.dataset.orbit].title+': '+whole+' whole '+(whole===1?'trip; ':'trips; ')+Math.round(part*100)+' percent of the next trip');});
 }
 show(){this.active=true;this.resize();}
 hide(){this.active=false;this.playing=false;this.updateUI();}
 frame(dt,now){
  if(!this.active)return;
  if(this.playing){this.days+=dt*this.speed;if(this.days>=YEAR){this.days=YEAR;this.playing=false;this.experiment=false;$('yearInsight').innerHTML='<span class="eyebrow">ONE YEAR LATER</span><p>Mercury finished <strong>4 whole trips.</strong> Earth finished <strong>1 whole trip.</strong> Neptune is still near the start of its first. Each circle below shows the trip still underway.</p>';this.updateUI();}}
  this.spacing+=(this.targetSpacing-this.spacing)*(1-Math.exp(-dt*5));if(Math.abs(this.spacing-this.targetSpacing)<.0001)this.spacing=this.targetSpacing;
  if(this.flight){this.flight.t+=dt;const t=Math.min(1,this.flight.t/(reduced.matches?.01:1.25)),e=t*t*(3-2*t);this.camera.position.lerpVectors(this.flight.start,this.flight.end,e);this.controls.target.lerpVectors(this.flight.targetStart,this.flight.targetEnd,e);if(t===1)this.flight=null;}
  this.sun.scale.setScalar(THREE.MathUtils.lerp(1.7,.08,this.spacing));this.glow.scale.setScalar(THREE.MathUtils.lerp(11,.65,this.spacing));this.sun.material.uniforms.time.value=this.days*.02;
  for(const id of ORDER){const p=WORLDS[id],a=THREE.MathUtils.lerp(p.display,p.a*21/WORLDS.neptune.a,this.spacing);const item=this.meshes[id];if(!item)continue;item.group.position.fromArray(orbitalPosition(p,this.days+EPOCH,a));item.group.scale.setScalar(p.size*THREE.MathUtils.lerp(1.75,.13,this.spacing));if(this.playing)item.mesh.rotation.y+=dt*(id==='venus'?-.04:.06);
   const attr=this.orbits[id].geometry.attributes.position;for(let j=0;j<=256;j++){const pos=orbitalPosition(p,j/256*p.period,a);attr.setXYZ(j,...pos);}attr.needsUpdate=true;this.orbits[id].geometry.computeBoundingSphere();this.starts[id].position.fromArray(orbitalPosition(p,EPOCH,a));this.starts[id].visible=this.selected===id;this.starts[id].scale.setScalar(this.spacing>.5?.6:1.6);
  }
  const p=WORLDS[this.selected],a=THREE.MathUtils.lerp(p.display,p.a*21/WORLDS.neptune.a,this.spacing),duration=Math.min(this.days,p.period);const trail=[];for(let j=0;j<=128;j++)trail.push(new THREE.Vector3(...orbitalPosition(p,EPOCH+duration*j/128,a)));this.trail.geometry.setFromPoints(trail);this.trail.visible=this.days>0&&!this.beltSelected;
  if(this.following){const position=this.meshes[this.following].group.position,delta=position.clone().sub(this.lastFollowPosition);if(this.flight){this.flight.end.add(delta);this.flight.targetEnd.copy(position);}else{this.camera.position.add(delta);this.controls.target.copy(position);}this.lastFollowPosition.copy(position);}
  const ba=this.belt.geometry.attributes.position;this.asteroids.forEach((p,i)=>{const a=THREE.MathUtils.lerp(8.9+(p.a-2.1)/1.2*.9,p.a*21/WORLDS.neptune.a,this.spacing);ba.setXYZ(i,...orbitalPosition(p,this.days+EPOCH,a));});ba.needsUpdate=true;this.belt.geometry.computeBoundingSphere();this.belt.material.opacity=this.beltSelected?.82:.42;this.belt.material.size=THREE.MathUtils.lerp(.044,.009,this.spacing);
  this.controls.update();this.renderer.render(this.scene,this.camera);this.positionLabels();if(now-this.lastRead>100){this.updateUI();this.lastRead=now;}
 }
 positionLabels(){
  const width=this.renderer.domElement.clientWidth,height=this.renderer.domElement.clientHeight,placed=[];
  const br=THREE.MathUtils.lerp(9.4,2.7*21/WORLDS.neptune.a,this.spacing),bp=new THREE.Vector3(-br*.86,0,br*.51).project(this.camera);this.beltLabel.hidden=bp.z>1||Math.abs(bp.x)>.88||Math.abs(bp.y)>.8;this.beltLabel.style.left=((bp.x*.5+.5)*width-50)+'px';this.beltLabel.style.top=((-bp.y*.5+.5)*height+12)+'px';
  const sp=this.sun.position.clone().project(this.camera),sr=this.sun.scale.x*height/(2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2)*this.camera.position.length());this.sunLabel.hidden=sp.z>1||Math.abs(sp.x)>1||Math.abs(sp.y)>.9;this.sunLabel.style.left=(sp.x*.5+.5)*width+'px';this.sunLabel.style.top=((-sp.y*.5+.5)*height+sr+7)+'px';
  for(const id of [this.selected,...ORDER.filter(id=>id!==this.selected)]){
   const m=this.meshes[id];if(!m)continue;const point=m.group.position.clone().project(this.camera),label=this.labels[id];const visible=point.z<1&&Math.abs(point.x)<1.07&&Math.abs(point.y)<.91;label.hidden=!visible;this.wires[id].hidden=!visible;if(!visible)continue;
   const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;const radius=m.group.scale.x*height/(2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2)*this.camera.position.distanceTo(m.group.position));let tx=Math.max(8,Math.min(width-90,x+radius+9)),ty=Math.max(63,Math.min(height-70,y-11));
   for(let k=0;k<10;k++){if(!placed.some(b=>Math.abs(b.x-tx)<86&&Math.abs(b.y-ty)<25))break;ty+=25;if(ty>height-75)ty=y-35-k*25;}
   label.style.left=tx+'px';label.style.top=ty+'px';label.style.setProperty('--stem',Math.min(55,Math.abs(ty-y)+8)+'px');const dx=tx+2-x,dy=ty+10-y,d=Math.hypot(dx,dy),wire=this.wires[id];wire.style.left=(x+dx/d*radius)+'px';wire.style.top=(y+dy/d*radius)+'px';wire.style.width=Math.max(0,d-radius-3)+'px';wire.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';placed.push({x:tx,y:ty});
  }
 }
}
