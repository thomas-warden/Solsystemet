import * as THREE from './vendor/three.module.js';

// An authored, illustrative coast. The mean water plane follows TideShore's
// equilibrium tide; small optical waves do not change that educational reading.
const PROFILE=[[0,364],[150,362],[270,351],[365,337],[438,321],[493,305],[546,290],[594,273],[639,253],[674,231],[703,207],[731,189],[751,167],[779,159],[803,143],[838,142],[863,124],[899,124],[925,109],[959,113],[980,104],[1000,110]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const level=y=>(250-y)/80;
function profileHeight(x){
 const px=(x+7)/14*1000;
 if(px<=0)return level(364)+(px/1000)*.35;
 if(px>=1000)return level(110)+(px-1000)/1000*.9;
 for(let i=1;i<PROFILE.length;i++)if(px<=PROFILE[i][0]){const [a,ay]=PROFILE[i-1],[b,by]=PROFILE[i];return level(ay+(by-ay)*(px-a)/(b-a));}
 return 0;
}
function hash(x,z){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);}
function noise2(x,z){
 const a=Math.floor(x),b=Math.floor(z),u=x-a,v=z-b,s=u*u*(3-2*u),t=v*v*(3-2*v);
 return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;
}
function terrainHeight(x,z){
 // The front reference transect is the original scientific profile, while the
 // surrounding coast meanders and carries geological relief in three dimensions.
 const beyond=Math.min(1,Math.abs(z)*.6);
 const bend=((noise2(z*.21,3)-.5)*2+(noise2(z*.63,8)-.5)*.5)*beyond;
 const h=profileHeight(x+bend);
 const relief=((noise2(x*1.2,z*1.3)-.5)*.17+(noise2(x*3.1,z*3.2)-.5)*.085+(noise2(x*7,z*6)-.5)*.025)*beyond;
 return h+relief;
}

const waterVertex=`
 varying vec3 worldPosition;
 varying vec4 reflectedPosition;
 uniform float time, waterHeight;
 uniform mat4 reflectionMatrix;
 void main(){
  vec3 p=position;
  float warp=.85*sin(p.x*.31+p.z*.23+time*.17)+.43*sin(p.x*.67-p.z*.41-time*.11);
  p.y=waterHeight+.026*sin(dot(p.xz,vec2(1.7,1.1))-time*.67+warp)
    +.020*sin(dot(p.xz,vec2(-1.3,2.1))+time*.91+warp*.62)
    +.004*sin(dot(p.xz,vec2(5.3,2.9))-time*1.25+warp*1.4);
  vec4 world=modelMatrix*vec4(p,1.);
  worldPosition=world.xyz; reflectedPosition=reflectionMatrix*world;
  gl_Position=projectionMatrix*viewMatrix*world;
 }`;
const waterFragment=`
 uniform sampler2D waterMap, terrainMap, reflectionMap;
 uniform float time, waterHeight;
 uniform vec3 sunDirection;
 varying vec3 worldPosition;
 varying vec4 reflectedPosition;
 float noise(vec2 p){return texture2D(waterMap,p).r;}
 void main(){
  vec2 p=worldPosition.xz;
  vec2 uv=p*vec2(.12,.15);
  vec2 flow=vec2(time*.006,-time*.004);
  float fine=noise(uv+flow), cross=noise(uv*1.73-flow*.6);
  float dx=(noise(uv+flow+vec2(.0025,0.))-noise(uv+flow-vec2(.0025,0.)))*.48;
  float dz=(noise(uv+flow+vec2(0.,.0025))-noise(uv+flow-vec2(0.,.0025)))*.40;
  float warp=.85*sin(p.x*.31+p.y*.23+time*.17)+.43*sin(p.x*.67-p.y*.41-time*.11);
  vec2 slope=vec2(.043,.030)*cos(dot(p,vec2(1.7,1.1))-time*.67+warp)
    +vec2(-.025,.046)*cos(dot(p,vec2(-1.3,2.1))+time*.91+warp*.62)
    +vec2(.019,.011)*cos(dot(p,vec2(5.3,2.9))-time*1.25+warp*1.4);
  vec3 normal=normalize(vec3(-slope.x-dx,1.,-slope.y-dz));
  vec3 view=normalize(cameraPosition-worldPosition);
  float facing=max(dot(normal,view),0.);
  float fresnel=.02+.98*pow(1.-facing,4.);
  vec2 terrainUV=(p+vec2(16.,30.))/vec2(32.,52.);
  vec2 margin=min(terrainUV,1.-terrainUV);
  float inTerrain=smoothstep(0.,.14,margin.x)*smoothstep(0.,.14,margin.y);
  float terrain=mix(-4.,texture2D(terrainMap,terrainUV).r*8.-4.,inTerrain);
  float depth=max(0.,waterHeight-terrain);
  // Shallow glacial green gives way to blue absorption. Rock appears through
  // the thin shore water, while the reflection remains anchored to this coast.
  vec3 deep=vec3(.004,.024,.040), shallow=vec3(.023,.14,.145);
  vec3 body=mix(shallow,deep,1.-exp(-depth*1.25));
  vec2 reflectionUV=reflectedPosition.xy/reflectedPosition.w;
  reflectionUV+=normal.xz*.025;
  vec3 reflection=texture2D(reflectionMap,clamp(reflectionUV,vec2(.002),vec2(.998))).rgb;
  vec3 color=mix(body,reflection,.20+fresnel*.55);
  vec3 halfDirection=normalize(view+sunDirection);
  float spec=pow(max(dot(normal,halfDirection),0.),240.);
  color+=vec3(.82,.87,.83)*spec*.22;
  color+=vec3(.025,.065,.075)*smoothstep(.12,.53,fine)*(.08+cross*.10);
  // Broken foam exists only where water meets this exact displaced terrain.
  float contact=(1.-smoothstep(.025,.19,depth))*smoothstep(-.01,.02,waterHeight-terrain)*inTerrain;
  float lace=smoothstep(.12,.39,noise(uv*2.1+vec2(time*.011,-time*.009)));
  float pulse=.66+.34*sin(p.y*3.2+p.x*1.8-time*1.6);
  color=mix(color,vec3(.63,.76,.70),contact*lace*pulse*.72);
  float fog=1.-exp(-length(cameraPosition-worldPosition)*.022);
  color=mix(color,vec3(.025,.047,.062),fog);
  float alpha=mix(.65,.99,1.-exp(-depth*2.));
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

export class TideCoast{
 constructor(host){
  if(!host)throw new TypeError('TideCoast needs a host element');
  this.host=host;this.disposed=false;this.loaded=false;this.width=1000;this.height=420;this.textures=[];
  this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
  this.renderer.setClearColor(0x07121b);this.renderer.domElement.className='tide-coast-canvas';this.renderer.domElement.setAttribute('aria-hidden','true');
  this.renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;';
  this.onContextLost=event=>{event.preventDefault();this.lost=true;this.host.dispatchEvent(new CustomEvent('tide-coast-lost'));};
  this.renderer.domElement.addEventListener('webglcontextlost',this.onContextLost);
  host.appendChild(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x0a1822);this.scene.fog=new THREE.FogExp2(0x0a1822,.045);
  this.camera=new THREE.PerspectiveCamera(38,1000/420,.1,150);this.target=new THREE.Vector3(-.5,-.3,-3.5);
  this.reflectCamera=new THREE.PerspectiveCamera();this.reflectionTarget=new THREE.WebGLRenderTarget(512,256,{depthBuffer:true});
  this.reflectionMatrix=new THREE.Matrix4();this.sunDirection=new THREE.Vector3(-.35,.6,-.8).normalize();
  this.scene.add(new THREE.HemisphereLight(0xb1c9d4,0x1b252d,1.2));
  const sunlight=new THREE.DirectionalLight(0xffedcf,2.1);sunlight.position.copy(this.sunDirection).multiplyScalar(20);this.scene.add(sunlight);
  sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);Object.assign(sunlight.shadow.camera,{left:-11,right:11,top:15,bottom:-15,near:.5,far:60});sunlight.shadow.bias=-.0003;sunlight.shadow.normalBias=.025;
  this.ready=this.load().catch(error=>{this.dispose();throw error;});
 }
 async load(){
  const loader=new THREE.TextureLoader();
  const loaded=await Promise.allSettled(['assets/tides/shore-rock.webp','assets/tides/shore-water.webp'].map(path=>new Promise((resolve,reject)=>{
   let settled=false;const timeout=setTimeout(()=>{settled=true;reject(new Error('Coastal texture timed out'));},20000);
   loader.load(path,texture=>{if(settled){texture.dispose();return;}settled=true;clearTimeout(timeout);resolve(texture);},undefined,error=>{if(settled)return;settled=true;clearTimeout(timeout);reject(error);});
  })));
  for(const result of loaded)if(result.status==='fulfilled')this.textures.push(result.value);
  const error=loaded.find(result=>result.status==='rejected');
  if(error){this.textures.forEach(texture=>texture.dispose());throw error.reason;}
  if(this.disposed||this.lost){this.textures.forEach(texture=>texture.dispose());throw new Error('Coast unavailable while loading');}
  const [rock,water]=loaded.map(result=>result.value);
  rock.colorSpace=THREE.SRGBColorSpace;rock.wrapS=rock.wrapT=THREE.MirroredRepeatWrapping;rock.anisotropy=Math.min(this.renderer.capabilities.getMaxAnisotropy(),8);
  water.wrapS=water.wrapT=THREE.MirroredRepeatWrapping;water.anisotropy=Math.min(this.renderer.capabilities.getMaxAnisotropy(),4);
  const terrainGeometry=new THREE.PlaneGeometry(32,52,180,220);terrainGeometry.rotateX(-Math.PI/2);terrainGeometry.translate(0,0,-4);
  const positions=terrainGeometry.attributes.position,uv=terrainGeometry.attributes.uv;
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,terrainHeight(x,z));uv.setXY(i,x*.16,z*.12);}
  terrainGeometry.computeVertexNormals();
  this.terrainMaterial=new THREE.MeshStandardMaterial({map:rock,bumpMap:rock,bumpScale:.06,roughness:.9,metalness:0,color:0xd2d7d5});
  this.terrainUniforms={waterHeight:{value:-.8},highHeight:{value:.8},coastRock:{value:rock}};
  this.terrainMaterial.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,this.terrainUniforms);
   shader.vertexShader='varying vec3 coastPosition,coastNormal;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n coastPosition=(modelMatrix*vec4(transformed,1.)).xyz;coastNormal=normalize(mat3(modelMatrix)*normal);');
   shader.fragmentShader=`varying vec3 coastPosition,coastNormal;uniform float waterHeight,highHeight;uniform sampler2D coastRock;
    vec3 rockAt(vec3 p){
     vec3 w=pow(abs(normalize(coastNormal)),vec3(4.));w/=max(w.x+w.y+w.z,.001);
     return texture2D(coastRock,p.zy*vec2(.30,.40)).rgb*w.x+texture2D(coastRock,p.xz*vec2(.26,.28)).rgb*w.y+texture2D(coastRock,p.xy*vec2(.30,.40)).rgb*w.z;
    }
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 rockColor=rockAt(coastPosition);float coastDetail=dot(rockColor,vec3(.3333));diffuseColor.rgb*=rockColor;
    float wet=1.-smoothstep(waterHeight+.04,highHeight+.18,coastPosition.y);
    diffuseColor.rgb*=mix(1.,.51,wet);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,.54,wet);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(coastDetail),dFdy(coastDetail))*.075,faceDirection);');
  };
  this.terrain=new THREE.Mesh(terrainGeometry,this.terrainMaterial);this.terrain.receiveShadow=true;this.scene.add(this.terrain);
  const distantGeometry=new THREE.PlaneGeometry(32,100,64,120);distantGeometry.rotateX(-Math.PI/2);distantGeometry.translate(0,0,-80);
  const distantPositions=distantGeometry.attributes.position;
  for(let i=0;i<distantPositions.count;i++)distantPositions.setY(i,terrainHeight(distantPositions.getX(i),distantPositions.getZ(i)));
  distantGeometry.computeVertexNormals();this.scene.add(new THREE.Mesh(distantGeometry,this.terrainMaterial));
  // A few weathered outcrops break the continuous shelf silhouette. Their
  // positions avoid the labelled reference transect at z=0.
  for(const [x,z,r]of[[4.35,4.8,.92],[5.2,4.1,.57],[3.9,-3.2,.39],[5.1,-7.8,.83],[4.1,-15,.56],[5.3,-17.5,1.08]]){
   const geometry=new THREE.DodecahedronGeometry(r,1),p=geometry.attributes.position;
   for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),rough=1+(noise2(px*4+z,pz*4+x)-.5)*.23;p.setXYZ(i,px*rough*1.2,py*rough*.64,pz*rough);}
   geometry.computeVertexNormals();const stone=new THREE.Mesh(geometry,this.terrainMaterial);stone.position.set(x,terrainHeight(x,z)+r*.12,z);stone.rotation.y=z*.34;stone.castShadow=true;stone.receiveShadow=true;this.scene.add(stone);
  }
  const size=256,heights=new Uint8Array(size*size*4);
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
   const height=terrainHeight(x/(size-1)*32-16,z/(size-1)*52-30),value=Math.round(clamp((height+4)/8,0,1)*255),i=(z*size+x)*4;
   heights[i]=heights[i+1]=heights[i+2]=value;heights[i+3]=255;
  }
  this.heightMap=new THREE.DataTexture(heights,size,size);this.heightMap.minFilter=this.heightMap.magFilter=THREE.LinearFilter;this.heightMap.needsUpdate=true;
  this.waterUniforms={waterMap:{value:water},terrainMap:{value:this.heightMap},reflectionMap:{value:this.reflectionTarget.texture},time:{value:0},waterHeight:{value:-.8},sunDirection:{value:this.sunDirection},reflectionMatrix:{value:this.reflectionMatrix}};
  const waterGeometry=new THREE.PlaneGeometry(300,300,180,180);waterGeometry.rotateX(-Math.PI/2);waterGeometry.translate(0,0,-80);
  this.waterMaterial=new THREE.ShaderMaterial({uniforms:this.waterUniforms,vertexShader:waterVertex,fragmentShader:waterFragment,transparent:true,depthWrite:false});
  this.water=new THREE.Mesh(waterGeometry,this.waterMaterial);this.water.renderOrder=2;this.scene.add(this.water);
  this.loaded=true;this.resize(this.host.clientWidth||1000,this.host.clientHeight||420);return this;
 }
 resize(width,height){
  if(this.disposed||!width||!height)return;this.width=width;this.height=height;
  this.renderer.setSize(width,height,false);this.camera.aspect=width/height;
  // The coast keeps its scale and focal transect in portrait; only the open sea
  // is cropped away. Controls and annotations are overlaid by TideShore.
  const portrait=width/height<1.7;
  this.target.set(portrait?.5:-.5,-.3,-3.5);
  this.camera.position.set(portrait?.5:-.5,8.6,14.5);this.camera.lookAt(this.target);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const scale=Math.min(1,640/width);this.reflectionTarget.setSize(Math.max(128,Math.round(width*scale)),Math.max(128,Math.round(height*scale)));
 }
 projectLevel(y){
  const height=level(y);let lo=-7,hi=7;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(terrainHeight(mid,0)<height)lo=mid;else hi=mid;}
  const point=new THREE.Vector3((lo+hi)/2,height,0).project(this.camera);
  return{x:(point.x*.5+.5)*1000,y:(.5-point.y*.5)*420};
 }
 render({phase=0,range=1.46,waterY=314,highY=186,lowY=314,time=0}={}){
  if(this.disposed||this.lost||!this.loaded)return;
  const waterHeight=level(waterY);this.waterUniforms.waterHeight.value=waterHeight;this.waterUniforms.time.value=Number.isFinite(time)?time:phase*24;
  this.terrainUniforms.waterHeight.value=waterHeight;this.terrainUniforms.highHeight.value=level(highY);
  this.reflectCamera.copy(this.camera);this.reflectCamera.position.y=waterHeight*2-this.camera.position.y;
  const reflectedTarget=this.target.clone();reflectedTarget.y=waterHeight*2-this.target.y;
  this.reflectCamera.up.set(0,-1,0);this.reflectCamera.lookAt(reflectedTarget);this.reflectCamera.updateMatrixWorld();
  this.reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(this.reflectCamera.projectionMatrix).multiply(this.reflectCamera.matrixWorldInverse);
  this.water.visible=false;this.renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-waterHeight+.02)];
  this.renderer.setRenderTarget(this.reflectionTarget);this.renderer.render(this.scene,this.reflectCamera);
  this.renderer.clippingPlanes=[];this.water.visible=true;this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  this.renderer.domElement.style.opacity='1';
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.textures.forEach(texture=>texture.dispose());this.heightMap?.dispose();
  this.scene.traverse(object=>{object.geometry?.dispose();if(object.material)object.material.dispose();object.shadow?.map?.dispose();object.shadow?.mapPass?.dispose();});
  this.reflectionTarget.dispose();this.renderer.dispose();this.renderer.domElement.remove();
  this.renderer.domElement.removeEventListener('webglcontextlost',this.onContextLost);this.renderer.forceContextLoss();
 }
}
