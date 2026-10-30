import * as THREE from './vendor/three.module.js';
import { SKY_URL, SKY_GLSL } from './sky.js?v=1c9cff8d2ad4.9df63c26d4';
let texturePromise;
function skyTexture(){
 if(!texturePromise)texturePromise=new THREE.TextureLoader().loadAsync(SKY_URL).then(texture=>{
  // Shared shader uses display RGB, as in the close-up renderer.
  texture.colorSpace=THREE.NoColorSpace;
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  return texture;
 });
 return texturePromise;
}
export function addCelestialSky(scene){
 const placeholder=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);placeholder.needsUpdate=true;
 const material=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,depthTest:false,toneMapped:false,
  uniforms:{skyMap:{value:placeholder},skyReady:{value:0}},
  vertexShader:`
   varying vec3 skyDirection;
   void main(){
    skyDirection=position;
    // At infinity: camera rotation matters, camera translation does not.
    vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.);
    gl_Position=p.xyww;
   }`,
  fragmentShader:`varying vec3 skyDirection;
   ${SKY_GLSL}
   void main(){gl_FragColor=vec4(skyColor(skyDirection),1.);}`
 });
 const dome=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);
 dome.frustumCulled=false;dome.renderOrder=-1000;dome.raycast=()=>{};
 scene.add(dome);
 skyTexture().then(texture=>{material.uniforms.skyMap.value=texture;material.uniforms.skyReady.value=1;placeholder.dispose();}).catch(()=>console.warn('Celestial map unavailable; showing a simple star field.'));
 return dome;
}
