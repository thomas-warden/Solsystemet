import {PlanetaryAurora,pressureAt,standOff} from 'aurora-scene';
import * as THREE from 'three';
const $=s=>document.querySelector(s),all=s=>document.querySelectorAll(s);
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let scene=null,playing=!reduced.matches,visible=true,raf=0,last=0,dirty=true,attempt=0,view='system';
let release=0,sequencePlaying=false,journeyPlaying=false,journey=-1,phase=0,layer=1;
const stops=[0,.34,.61,1];
const story=[['THE SUN','A star reaches across space.','The Sun sends a stream of charged particles into space. This is the solar wind.'],['EARTH’S MAGNETIC FIELD','The wind meets a world.','Much of the wind is diverted around Earth’s magnetic environment. The Sun-facing side presses inward.'],['THE MAGNETIC TAIL','Energy takes the long way round.','Energy can enter the magnetic system, build up in its stretched tail, and be released towards Earth.'],['THE POLAR ATMOSPHERE','The sky answers in light.','Energetic particles reach the air around the magnetic poles. The atmosphere glows.']];
const layers=[['Solid at the centre.','The inner core is mostly iron. Enormous pressure keeps it solid, even at temperatures comparable to the Sun’s surface.'],['A moving ocean of metal.','Liquid iron flows in the outer core. Its motion creates electric currents that sustain Earth’s magnetic field. Earth’s rotation helps organise the flow.'],['Rock that moves slowly.','The mantle is mostly solid rock. It can flow over millions of years. The liquid outer core lies beneath it.']];
function sync(){
 document.body.dataset.view=view;document.body.dataset.phase=String(phase);
 all('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 $('#corePanel').hidden=view!=='core';$('.journey-panel').hidden=view==='core';
 $('#polarLabel').hidden=view!=='polar';$('#sunAction').hidden=view!=='system';$('#guides').hidden=view!=='system';
 $('#gesture').textContent=view==='core'?'TAP A LAYER · DRAG TO TURN':view==='system'?'TAP THE SUN · DRAG TO TURN':'DRAG TO TURN · ARROW KEYS TO EXPLORE';
 $('#motion').textContent=playing||journeyPlaying||sequencePlaying?'Pause motion':'Play motion';
 $('#journeyPlay').innerHTML=journeyPlaying?'Pause journey':journey>=1?'Send another gust →':journey<0?'Send a solar gust →':reduced.matches?'Next part →':'Continue journey →';
 $('#journeyNext').disabled=journey>=1;
 $('#playRelease').textContent=sequencePlaying?'Pause sequence':'Play sequence';
 const entry=story[phase];$('#storyEyebrow').textContent=entry[0];$('#storyTitle').textContent=entry[1];$('#storyText').textContent=journey<0?'Send a gust. Follow its path to the northern lights.':entry[2];
 all('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===phase)));
 $('#viewCaption').textContent=view==='core'?'Select a layer. Turn Earth to look inside.':view==='polar'?'Auroral curtains above the magnetic poles.':'The Sun → Earth’s magnetic field → the atmosphere.';

 $('#earthLabel').hidden=view!=='system';$('#tailLabel').hidden=view!=='system';
}
function mark(){dirty=true;wake();}
function wake(){if(scene&&!raf&&!document.hidden&&visible&&(dirty||playing||journeyPlaying||sequencePlaying||scene.needsFrame()))raf=requestAnimationFrame(frame);}
function restartClock(){last=0;if(raf)cancelAnimationFrame(raf);raf=0;wake();}
function frame(now){raf=0;const dt=last?Math.min(.06,(now-last)/1000):.016;last=now;if(document.hidden||!visible)return;
 if(scene){if(journeyPlaying){setJourney(Math.min(1,journey+dt/16),false);if(journey>=1){journeyPlaying=false;sync();}}
 if(sequencePlaying){setRelease(Math.min(100,release+dt*12));if(release>=100){sequencePlaying=false;sync();}}
 const changed=scene.update(dt,playing||journeyPlaying,reduced.matches);if(changed||dirty){scene.draw();labels();dirty=false;}}wake();}
function labels(){if(!scene)return;const box=scene.canvas.getBoundingClientRect();
 const place=(el,p,show)=>{el.hidden=!show||Math.abs(p.x)>.97||Math.abs(p.y)>.9;el.style.left=(p.x*.5+.5)*box.width+'px';el.style.top=(-p.y*.5+.5)*box.height+'px';};
 const coreVisible=view==='core'&&scene.camera.position.x>0&&scene.camera.position.z>0;$('#coreLeader').toggleAttribute('hidden',!coreVisible);$('#coreAnnotation').hidden=!coreVisible;if(coreVisible){const p=scene.projectLayer(layer),x=(p.x*.5+.5)*box.width,y=(-p.y*.5+.5)*box.height,endX=box.width*.78,endY=box.height*.3;$('#coreLeader').setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);$('#coreLeader path').setAttribute('d',`M${x},${y} L${endX-28},${endY+20} H${endX-6}`);$('#coreLeader circle').setAttribute('cx',x);$('#coreLeader circle').setAttribute('cy',y);}
 place($('#earthLabel'),scene.anchor(),view==='system');place($('#tailLabel'),scene.project(7.5,0,0),view==='system');place($('#sunAction'),scene.project(-7,-2.5,0),view==='system');}
function setView(next){view=next;scene?.setView(view,reduced.matches);sync();mark();}
function setRelease(value){release=value;$('#release').value=value;scene?.setRelease(value/100);$('#sequenceCaption').textContent=value<28?'Stored energy in the tail.':value<68?'Energy is released Earthward.':'The polar atmosphere brightens.';mark();}
function setPressure(p){$('#pressureValue').innerHTML=p.toFixed(1)+' <small>nPa</small>';$('#boundaryValue').innerHTML=standOff(p).toFixed(1)+' <small>Earth radii</small>';scene?.setPressure(p,reduced.matches);mark();}
function setJourney(value,seek=true){const old=phase;journey=value;phase=value<.28?0:value<.55?1:value<.82?2:3;scene?.setEvent(value);setPressure(2+10*Math.exp(-(((value-.39)/.13)**2)));setRelease(Math.max(0,Math.min(100,(value-.48)/.45*100)));
 if(seek||old!==phase){if(phase===3)setView('polar');else if(seek||view==='core')setView('system');sync();}mark();}
function next(){journeyPlaying=false;setJourney(stops[journey<0?0:Math.min(3,phase+1)]);sync();}
function playJourney(){sequencePlaying=false;if(reduced.matches){if(journey>=1)journey=-1;next();return;}if(journeyPlaying){journeyPlaying=false;sync();return;}if(journey<0||journey>=1)setJourney(0);else if(view==='core')setView('system');journeyPlaying=true;playing=true;sync();restartClock();}
function setLayer(value){layer=value;scene?.setLayer(value);$('#coreAnnotation strong').textContent=['Inner core','Outer core','Mantle'][value];$('#coreAnnotation span').textContent=['SOLID METAL','LIQUID METAL','SOLID ROCK'][value];$('#layerTitle').textContent=layers[value][0];$('#layerText').textContent=layers[value][1];all('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.layer)===value)));mark();}
const disabledControls='.journey-panel button,.core-panel button,.instruments input,.instruments button,.stage-toolbar button,.stage-bottom button,#sunAction';
function failure(){document.body.dataset.ready='error';$('#loading').hidden=true;$('#failure').hidden=false;journeyPlaying=false;sequencePlaying=false;all(disabledControls).forEach(e=>e.disabled=true);}
async function start(){const ticket=++attempt;$('#loading').hidden=false;$('#failure').hidden=true;document.body.dataset.ready='loading';let pending=null;try{const textures=await PlanetaryAurora.load();pending=textures;if(ticket!==attempt){textures.forEach(t=>t.dispose());return;}scene?.dispose();const previous=$('#universe'),canvas=previous.cloneNode();previous.replaceWith(canvas);
 scene=new PlanetaryAurora(canvas,textures,{onChange:mark,onLost:()=>{scene?.dispose();scene=null;failure();}});pending=null;
 let pointerStart=null;canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8)return;pointerStart=null;const hit=scene.pick(e.clientX,e.clientY);if(hit==='sun'){journey=-1;journeyPlaying=false;playJourney();}else if(typeof hit==='number')setLayer(hit);});canvas.addEventListener('pointercancel',()=>pointerStart=null);
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();scene.transition=null;const offset=scene.camera.position.clone().sub(scene.controls.target);offset.applyAxisAngle(e.key==='ArrowLeft'||e.key==='ArrowRight'?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),e.key==='ArrowLeft'||e.key==='ArrowUp'?.08:-.08);scene.camera.position.copy(scene.controls.target).add(offset);scene.controls.update();mark();});
 all(disabledControls).forEach(e=>e.disabled=false);scene.setView(view,true);scene.setLayer(layer);scene.setGuides($('#guides').getAttribute('aria-pressed')==='true');if(journey>=0)setJourney(journey,false);else setRelease(release);document.body.dataset.ready='true';$('#loading').hidden=true;sync();mark();}catch(e){pending?.forEach(t=>t.dispose());scene?.dispose();scene=null;console.warn('Planetary view unavailable:',e.message);failure();}}
$('#journeyPlay').addEventListener('click',playJourney);$('#sunAction').addEventListener('click',()=>{if(journeyPlaying)return;journey=-1;playJourney();});$('#journeyNext').addEventListener('click',next);
all('[data-step]').forEach(b=>b.addEventListener('click',()=>{journeyPlaying=false;sequencePlaying=false;setJourney(stops[Number(b.dataset.step)]);}));
all('[data-layer]').forEach(b=>b.addEventListener('click',()=>setLayer(Number(b.dataset.layer))));
all('button[data-view]').forEach(b=>b.addEventListener('click',()=>{journeyPlaying=false;sequencePlaying=false;setView(b.dataset.view);}));
$('#returnSystem').addEventListener('click',()=>setView('system'));
$('#motion').addEventListener('click',()=>{if(playing||journeyPlaying||sequencePlaying){playing=false;journeyPlaying=false;sequencePlaying=false;}else playing=true;sync();restartClock();});
$('#reset').addEventListener('click',()=>{scene?.setView(view,reduced.matches);mark();});$('#guides').addEventListener('click',()=>{const enabled=$('#guides').getAttribute('aria-pressed')!=='true';$('#guides').setAttribute('aria-pressed',String(enabled));$('#guides span').textContent=enabled?'On':'Off';scene?.setGuides(enabled);mark();});
$('#pressure').addEventListener('input',()=>{journeyPlaying=false;setPressure(pressureAt(Number($('#pressure').value)));sync();});$('#release').addEventListener('input',()=>{journeyPlaying=false;sequencePlaying=false;setRelease(Number($('#release').value));sync();});$('#playRelease').addEventListener('click',()=>{journeyPlaying=false;sequencePlaying=!sequencePlaying;if(sequencePlaying&&release>=100)setRelease(0);sync();restartClock();});
$('#retry').addEventListener('click',start);
reduced.addEventListener('change',()=>{if(reduced.matches){playing=false;journeyPlaying=false;sequencePlaying=false;if(scene?.transition)scene.setView(view,true);scene?.setPressure(scene.targetPressure,true);}sync();restartClock();});
document.addEventListener('visibilitychange',restartClock);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;restartClock();},{threshold:.01}).observe($('#stage'));
new ResizeObserver(()=>{scene?.resize();mark();}).observe($('#stage'));$('#about').addEventListener('click',()=>{journeyPlaying=false;sequencePlaying=false;sync();$('#notes').showModal();});$('#closeNotes').addEventListener('click',()=>$('#notes').close());
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);scene?.dispose();scene=null;});window.addEventListener('pageshow',e=>{if(e.persisted)start();});
window.auroraStudy={get state(){return {ready:document.body.dataset.ready,playing,journeyPlaying,journey,phase,layer,visible,release,sequencePlaying,view,frames:scene?.frames,time:scene?.time,pressure:scene?.pressure,boundary:scene?.radius,aurora:scene?.auroras[0].material.uniforms.activity.value,camera:scene?.camera.position.toArray(),transition:!!scene?.transition};}};sync();start();
