import { CLOSE_MOON_DISTANCE_RATIO, MAX_TIDE_RANGE } from './tide-constants.js?v=0bdabc6723e2.9df63c26d4';

// An explicitly illustrative coast: the lunar-day clock is independent of the
// Moon's orbital clock. The caller supplies the actual equilibrium tide range.
const TAU = Math.PI * 2;
let shoreSerial = 0;
const PROFILE = [[0,435],[100,412],[200,385],[300,356],[400,324],[500,289],[600,254],[700,219],[800,185],[900,153],[1000,125]];
const profilePath = 'M' + PROFILE.map(p => p.join(' ')).join('L');
const landPath = profilePath + 'L1000 420H0Z';
const seaPath = 'M0 0H1000V125' + [...PROFILE].reverse().slice(1).map(p => 'L'+p.join(' ')).join('') + 'Z';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

export function shoreLevel(phase,range){
 if(!Number.isFinite(phase)||!Number.isFinite(range))throw new TypeError('Finite shore phase and range required');
 const amplitude = 64 * clamp(range,0,MAX_TIDE_RANGE) / 1.46;
 return {y:250+amplitude*Math.cos(phase*TAU*2),high:250-amplitude,low:250+amplitude,amplitude};
}
function intersection(y){
 for(let i=0;i<PROFILE.length-1;i++){
  const [x1,y1]=PROFILE[i],[x2,y2]=PROFILE[i+1];
  if(y<=y1&&y>=y2)return x1+(x2-x1)*(y-y1)/(y2-y1);
 }
 return y>PROFILE[0][1]?0:1000;
}
function scenarioButton(kind,title,subtitle){
 const moon=kind==='neap'?{x:85,y:9}:kind==='king'?{x:64,y:32}:{x:43,y:32};
 return `<button type="button" data-shore-tide="${kind}" aria-pressed="false"><svg viewBox="0 0 126 56" aria-hidden="true"><path d="M17 32H85L${moon.x} ${moon.y}" fill="none" stroke="#a6bdc4" stroke-opacity=".36" stroke-width="1"/><circle cx="17" cy="32" r="9" fill="#e4bd6e"/><circle cx="17" cy="32" r="13" fill="none" stroke="#e4bd6e" stroke-opacity=".12"/><image href="assets/tides/earth.webp" x="72" y="19" width="26" height="26"/><image href="assets/tides/moon.webp" x="${moon.x-6}" y="${moon.y-6}" width="12" height="12"/>${kind==='king'?'<path d="M47 40h11m0 0-4-3m4 3-4 3" fill="none" stroke="#e4bd6e" stroke-width="1"/>':''}</svg><span>${title}</span><small>${subtitle}</small></button>`;
}
function markup(id){return `
<header class="tide-shore-heading"><div><span class="eyebrow">FROM SPACE TO THE SHORE</span><h2>A day at the water’s edge.</h2></div><p>Choose a tide.<br> Compare how far it reaches.</p></header>
<div class="tide-shore-comparison"><span class="eyebrow">COMPARE HIGH WATER</span><div class="tide-shore-presets" role="group" aria-label="Compare high water at the beach">${scenarioButton('neap','Neap tide','Right angle')}${scenarioButton('spring','Spring tide','Sun + Moon aligned')}${scenarioButton('king','King tide','Aligned + closer Moon')}</div><div class="tide-shore-cause" aria-live="polite" aria-atomic="true"><p data-shore-cause>Move the Moon above, or choose a tide to compare.</p><p data-shore-scenario-note>Both the Sun and Moon affect the tides.</p></div></div>
<div class="tide-shore-body">
<div class="tide-shore-scene">
<svg data-shore-art class="tide-shore-art" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="${id}Title ${id}Desc">
<title id="${id}Title">An illustrated sandy beach with changing water level</title><desc id="${id}Desc" data-shore-description>Follow one coast through an ideal tide day. Gold markers show the highest and lowest water levels; the blue edge shows the water now.</desc>
<defs>
<linearGradient id="${id}Sky" x2="0" y2="1"><stop stop-color="#04090f"/><stop offset=".78" stop-color="#1a303c"/><stop offset="1" stop-color="#4c5555"/></linearGradient>
<linearGradient id="${id}Sand" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#dfcba3"/><stop offset=".25" stop-color="#c4ad83"/><stop offset=".6" stop-color="#8a7b61"/><stop offset="1" stop-color="#5c6259"/></linearGradient>
<linearGradient id="${id}Wet" x2="0" y2="1"><stop stop-color="#342d20" stop-opacity="0"/><stop offset=".35" stop-color="#342d20" stop-opacity=".33"/><stop offset="1" stop-color="#20363a" stop-opacity=".64"/></linearGradient>
<linearGradient id="${id}Water" x2="0" y2="1"><stop stop-color="#8dd9dd" stop-opacity=".65"/><stop offset=".035" stop-color="#337e94" stop-opacity=".85"/><stop offset=".24" stop-color="#16465d" stop-opacity=".94"/><stop offset="1" stop-color="#061821"/></linearGradient>
<linearGradient id="${id}Haze"><stop stop-color="#c7bd9c" stop-opacity=".1"/><stop offset="1" stop-color="#c7bd9c" stop-opacity="0"/></linearGradient>

<clipPath id="${id}Land"><path d="${landPath}"/></clipPath><clipPath id="${id}Sea"><path d="${seaPath}"/></clipPath>
</defs>
<g data-shore-fallback><rect width="1000" height="420" fill="url(#${id}Sky)"/>
<path d="M0 161l75-5 73 3 94-7 89 7 83-3 115 4 97-9 65 6 80-9 98 9 131-6V222H0Z" fill="#0b1821" opacity=".9"/>
<path d="M0 157H1000" stroke="#b3b99f" stroke-opacity=".12"/>
<path d="M0 120Q500 165 1000 165V180Q500 157 0 163Z" fill="url(#${id}Haze)"/>
<path d="${landPath}" fill="url(#${id}Sand)"/>
<g clip-path="url(#${id}Land)"><image href="assets/tides/shore-sand.webp" x="0" y="90" width="1000" height="420" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="90" width="1000" height="420" fill="url(#${id}Sand)" opacity=".14"/><rect data-shore-wet x="0" y="186" width="1000" height="300" fill="url(#${id}Wet)"/></g>

<g clip-path="url(#${id}Sea)"><rect data-shore-water x="0" y="314" width="1000" height="420" fill="url(#${id}Water)"/>
<g data-shore-reflection opacity=".2"><path d="M12 9h190m42 0h110M82 17h140m31 0h178M20 28h90m17 0h192M60 44h180m24 0h95" fill="none" stroke="#a4d8d9" stroke-width="1.2"/></g>
<path data-shore-surface d="M0 314H520" fill="none" stroke="#b8e8e8" stroke-width="2.3"/>
<path data-shore-foam d="M500 314H520" fill="none" stroke="#edf1df" stroke-width="3.2"/>
</g>
</g>
<g class="tide-shore-marker" data-shore-high transform="translate(0 186)"><path d="M405 0H690"/><text x="405" y="-9">High water</text></g>
<g class="tide-shore-marker tide-shore-marker-low" data-shore-low transform="translate(0 314)"><path d="M405 0H540"/><text x="405" y="22">Low water</text></g>
<g data-shore-coast-dot><circle r="6" fill="#f2d5a2" stroke="#162631" stroke-width="3"/><circle r="11" fill="none" stroke="#f2d5a2" stroke-opacity=".35"/></g>
</svg>
<div class="tide-shore-water-state"><span data-shore-level>Low water</span><span data-shore-range>Bigger change</span></div>
<span class="tide-shore-art-note">ILLUSTRATED BEACH · HEIGHT EXAGGERATED</span>
<button type="button" data-shore-retry class="tide-shore-retry" hidden>Load detailed coast ↻</button>
</div>
<div class="tide-shore-clock">
<svg class="tide-shore-orbit" viewBox="0 0 180 150" role="img" aria-labelledby="${id}ClockTitle ${id}ClockDesc"><title id="${id}ClockTitle">One coast turns through two tidal bulges</title><desc id="${id}ClockDesc">In this schematic clock, Earth and its gold coast marker turn together through two fixed ocean bulges. Globe orientation and lighting are illustrative.</desc><defs><radialGradient id="${id}Ocean"><stop offset=".4" stop-color="#1d4558" stop-opacity=".3"/><stop offset="1" stop-color="#70c4d7" stop-opacity=".5"/></radialGradient></defs><ellipse data-shore-clock-ocean cx="75" cy="75" rx="44" ry="65" fill="url(#${id}Ocean)" stroke="#91d4e0" stroke-width=".8"/><g data-shore-earth><circle cx="75" cy="75" r="35" fill="#193443"/><image href="assets/tides/earth.webp" x="36.15" y="36.15" width="77.7" height="77.7"/></g><path d="M108 109A47 47 0 0 1 57 118m0 0 5-2m-5 2 4 4" fill="none" stroke="#a7b8bd" stroke-width="1"/><path data-shore-spoke d="M110 75H119" stroke="#e8cfa0" stroke-width="1.2"/><circle data-shore-point cx="110" cy="75" r="4" fill="#f2d5a2" stroke="#111b24" stroke-width="1.5"/><text x="131" y="73" class="tide-shore-point-label">One</text><text x="131" y="88" class="tide-shore-point-label">coast</text></svg>
<div class="tide-shore-clock-controls"><button type="button" data-shore-play class="play-action" aria-pressed="false">▶ Watch a day</button><label for="${id}Day"><span>Turn Earth</span><output data-shore-clock-reading>Start</output></label><input id="${id}Day" data-shore-day type="range" min="0" max="1000" step="1" value="0" aria-label="Turn Earth through one ideal tide day"/><div class="tide-shore-day-key"><span>START</span><span>ONE TIDE DAY</span></div></div>
<p class="tide-shore-day-note">This clock turns Earth.<br> The Moon’s orbit above sets the size.</p>
</div></div>
<p class="tide-shore-limit">Two highs in an ideal tide day (about 24 h 50 min). Real shores have different timing and heights. <a href="sources.html#tides" target="_blank" rel="noopener">How this model works ↗</a></p>`;}

export class TideShore{
 constructor(host,{onScenario}={}){
  if(!host)throw new TypeError('TideShore needs a host element');
  this.host=host;this.id='tideShore'+(++shoreSerial);this.phase=0;this.range=1.46;this.active=false;this.visible=false;this.sceneVisible=false;this.clockVisible=false;this.frames=0;this.raf=0;this.lastTime=0;this.disposed=false;this.dirty=true;this.renders=0;
  this.coast=null;this.coastPending=null;this.coastAttempt=0;this.waveTime=0;
  this.onScenario=onScenario;this.model={solarMix:1,moonAngle:0,sunAngle:0,moonDistanceRatio:1,lunarWeight:1,transitioning:false};
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.playing=!this.motion.matches;
  host.classList.add('tide-shore');host.innerHTML=markup(this.id);
  this.nodes=Object.fromEntries(['art','play','day','water','surface','foam','reflection','high','low','coast-dot','point','spoke','clock-ocean','earth','level','range','clock-reading','description','retry','wet','cause','scenario-note'].map(name=>[name,host.querySelector(`[data-shore-${name}]`)]));
  this.scene=host.querySelector('.tide-shore-scene');this.clock=host.querySelector('.tide-shore-clock');
  this.scenarioButtons=[...host.querySelectorAll('[data-shore-tide]')];
  this.onChooseScenario=event=>{
   const button=event.currentTarget;if(typeof this.onScenario!=='function')return;
   this.phase=.25;this.playing=false;this.model.transitioning=true;this.render();this.schedule();this.onScenario(button.dataset.shoreTide);
  };
  for(const button of this.scenarioButtons){button.disabled=typeof onScenario!=='function';button.addEventListener('click',this.onChooseScenario);}
  this.onCoastLost=()=>{
   this.coast?.dispose();this.coast=null;this.host.dataset.detail='fallback';this.nodes.retry.hidden=false;
   this.fit();this.render();
  };this.scene.addEventListener('tide-coast-lost',this.onCoastLost);
  this.onRetry=()=>this.loadCoast(true);this.nodes.retry.addEventListener('click',this.onRetry);
  this.onPlay=()=>{if(this.phase>=1)this.phase=0;this.playing=!this.playing;this.render();this.schedule();};
  this.onDay=()=>{this.phase=Number(this.nodes.day.value)/1000;this.playing=false;this.render();this.schedule();};
  this.onMotion=e=>{if(e.matches){this.playing=false;this.render();this.schedule();}};
  this.onVisibility=()=>this.schedule();
  this.nodes.play.addEventListener('click',this.onPlay);this.nodes.day.addEventListener('input',this.onDay);
  this.motion.addEventListener('change',this.onMotion);document.addEventListener('visibilitychange',this.onVisibility);
  this.observer=new IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.target===host)this.visible=entry.isIntersecting;if(entry.target===this.scene)this.sceneVisible=entry.isIntersecting;if(entry.target===this.clock)this.clockVisible=entry.isIntersecting;}
   this.schedule();
  },{threshold:0});for(const target of [host,this.scene,this.clock])this.observer.observe(target);
  this.fit=()=>{
   const {width,height}=this.scene.getBoundingClientRect();
   this.coast?.resize(width,height);
   this.nodes.art.setAttribute('viewBox',this.coast?`0 0 ${width} ${height}`:host.clientWidth<760?'200 0 800 420':'0 0 1000 420');
   this.nodes.art.setAttribute('preserveAspectRatio',this.coast?'none':'xMidYMid slice');
   this.dirty=true;if(this.active&&(this.sceneVisible||this.clockVisible)&&!document.hidden)this.render();
  };this.resizeObserver=new ResizeObserver(this.fit);this.resizeObserver.observe(this.scene);this.fit();
  this.render();
 }
 reset(){
  if(this.disposed)return;this.phase=0;this.playing=!this.motion.matches;this.render();this.schedule();
 }
 setState({range=this.range,solarMix=this.model.solarMix,moonAngle=this.model.moonAngle,sunAngle=this.model.sunAngle,moonDistanceRatio=this.model.moonDistanceRatio,lunarWeight=this.model.lunarWeight,transitioning=false}={}){
  if(this.disposed||![range,solarMix,moonAngle,sunAngle,moonDistanceRatio,lunarWeight].every(Number.isFinite))return;
  const next=clamp(range,0,MAX_TIDE_RANGE),model={solarMix,moonAngle,sunAngle,moonDistanceRatio,lunarWeight,transitioning:Boolean(transitioning)};
  if(Math.abs(next-this.range)<1e-7&&Object.entries(model).every(([key,value])=>value===this.model[key]))return;
  this.range=next;this.model=model;this.host.dataset.range=next.toFixed(6);this.dirty=true;this.renderScenario();
  if(this.active&&(this.sceneVisible||this.clockVisible)&&!document.hidden)this.render();
 }
 scenario(){
  const {solarMix,moonAngle,sunAngle,moonDistanceRatio,transitioning}=this.model;
  if(transitioning||solarMix<.999)return '';
  const alignment=Math.abs(Math.cos(moonAngle-sunAngle)),mean=Math.abs(moonDistanceRatio-1)<1e-5,close=Math.abs(moonDistanceRatio-CLOSE_MOON_DISTANCE_RATIO)<1e-5;
  if(alignment>.995)return close?'king':mean?'spring':'';
  return alignment<.1&&mean?'neap':'';
 }
 renderScenario(){
  const scenario=this.scenario(),{solarMix,moonDistanceRatio,transitioning}=this.model,closer=moonDistanceRatio<.999;
  let cause,note;
  if(transitioning){cause='Changing the alignment and tidal pull…';note='The beach follows the same Moon and Sun above.';}
  else if(scenario==='neap'){cause='Sun and Moon pull at a right angle. A smaller rise and fall.';note='At quarter Moon, their tidal effects partly offset.';}
  else if(scenario==='spring'){cause='Sun, Earth and Moon line up. Higher highs, lower lows.';note='Spring tides happen at new and full Moon, in every season.';}
  else if(scenario==='king'){cause='The Moon is closer while they line up. An extra-high tide.';note='“King tide” is an informal name for an unusually high tide. This shows one way it can happen.';}
  else if(solarMix<.001){cause=closer?'The Sun’s pull is off. The closer Moon still makes a bigger tide.':'The Sun’s pull is off. Only the Moon is shaping this tide.';note='Turn the Sun’s pull on above, or choose a comparison.';}
  else if(closer){cause='The closer Moon pulls more strongly. Alignment still changes the tide.';note='Line up the Sun, Earth and Moon to compare the extra-high example.';}
  else {cause='The Sun and Moon both affect this tide. Move the Moon to compare.';note='Choose a tide to hold the beach at high water.';}
  for(const button of this.scenarioButtons)button.setAttribute('aria-pressed',String(button.dataset.shoreTide===scenario));
  if(this.nodes.cause.textContent!==cause)this.nodes.cause.textContent=cause;
  if(this.nodes['scenario-note'].textContent!==note)this.nodes['scenario-note'].textContent=note;
  this.host.dataset.scenario=scenario||'custom';this.host.dataset.moonDistanceRatio=moonDistanceRatio.toFixed(6);
 }
 setActive(active){if(this.disposed)return;this.active=Boolean(active);this.host.dataset.active=String(this.active);this.schedule();}
 async loadCoast(retry=false){
  if(this.disposed||this.coast||this.coastPending||(!retry&&this.coastAttempt))return;
  const attempt=++this.coastAttempt;this.nodes.retry.hidden=true;this.host.dataset.detail='loading';
  let candidate;
  this.coastPending=(async()=>{
   const {TideCoast}=await import('./tide-coast.js?v=0bdabc6723e2.9df63c26d4'+(retry?'&retry='+attempt:''));
   if(this.disposed||!this.active)return;
   candidate=new TideCoast(this.scene);await candidate.ready;
   if(this.disposed||!this.active){candidate.dispose();candidate=null;return;}
   this.coast=candidate;candidate=null;this.fit();if((this.sceneVisible||this.clockVisible)&&!document.hidden)this.render();this.host.dataset.detail='ready';
  })();
  try{await this.coastPending;}
  catch(error){candidate?.dispose();if(!this.disposed){this.host.dataset.detail='fallback';this.nodes.retry.hidden=false;}}
  finally{this.coastPending=null;if(!this.coast&&!this.disposed&&this.host.dataset.detail==='loading'){this.coastAttempt=0;this.host.dataset.detail='idle';}}
 }
 schedule(){
  if(!this.disposed&&this.active&&this.sceneVisible&&!document.hidden&&!this.coast)this.loadCoast();
  if(!this.disposed&&this.active&&(this.sceneVisible||this.clockVisible)&&!document.hidden&&this.dirty)this.render();
  const run=!this.disposed&&this.active&&(this.sceneVisible||this.clockVisible)&&this.playing&&!document.hidden;
  if(!run){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.lastTime=0;return;}
  if(!this.raf){this.lastTime=0;this.raf=requestAnimationFrame(now=>this.frame(now));}
 }
 frame(now){
  this.raf=0;if(this.disposed||!this.active||(!this.sceneVisible&&!this.clockVisible)||!this.playing||document.hidden){this.lastTime=0;return;}
  const dt=this.lastTime?Math.min(.1,(now-this.lastTime)/1000):0;this.lastTime=now;
  this.waveTime+=dt;this.phase=Math.min(1,this.phase+dt/24);if(this.phase===1)this.playing=false;
  this.render();this.frames++;
  if(this.playing)this.raf=requestAnimationFrame(time=>this.frame(time));else this.lastTime=0;
 }
 render(){
  if(this.disposed)return;this.dirty=false;this.renders++;
  const state=shoreLevel(this.phase,this.range),x=intersection(state.y),n=this.nodes;
  this.renderScenario();n.wet.setAttribute('y',(state.high-12).toFixed(3));
  n.water.setAttribute('y',state.y.toFixed(3));n.reflection.setAttribute('transform',`translate(0 ${state.y.toFixed(3)})`);
  let path=`M0 ${state.y.toFixed(3)}`;
  for(let i=1;i<=30;i++){const px=x*i/30,py=state.y+Math.sin(i*.8+this.phase*TAU*6)*.6;path+=`L${px.toFixed(2)} ${py.toFixed(2)}`;}
  n.surface.setAttribute('d',path);n.foam.setAttribute('d',`M${Math.max(0,x-24).toFixed(2)} ${(state.y+.5).toFixed(2)}L${x.toFixed(2)} ${state.y.toFixed(2)}`);
  n.high.setAttribute('transform',`translate(0 ${state.high.toFixed(3)})`);n.low.setAttribute('transform',`translate(0 ${state.low.toFixed(3)})`);
  const highEnd=intersection(state.high)-15,lowEnd=intersection(state.low)-15;
  n.high.querySelector('path').setAttribute('d',`M405 0H${highEnd.toFixed(2)}m0-5V5`);n.low.querySelector('path').setAttribute('d',`M405 0H${lowEnd.toFixed(2)}m0-5V5`);
  n.high.querySelector('text').setAttribute('x','405');n.low.querySelector('text').setAttribute('x','405');
  n['coast-dot'].setAttribute('transform',`translate(${x.toFixed(3)} ${state.y.toFixed(3)})`);
  if(this.coast){
   if(this.active&&this.sceneVisible&&!document.hidden)this.coast.render({phase:this.phase,range:this.range,waterY:state.y,highY:state.high,lowY:state.low,time:this.waveTime});
   else this.dirty=true;
   const {width,height}=this.scene.getBoundingClientRect();
   const point=y=>{const p=this.coast.projectLevel(y);return {x:p.x*width/1000,y:p.y*height/420};};
   const high=point(state.high),low=point(state.low),current=point(state.y);
   const labelX=Math.max(18,Math.min(high.x,low.x)-width*.34);
   for(const [node,p]of[[n.high,high],[n.low,low]]){
    node.setAttribute('transform',`translate(0 ${p.y.toFixed(3)})`);
    node.querySelector('path').setAttribute('d',`M${labelX.toFixed(2)} 0H${(p.x-8).toFixed(2)}m0-4V4`);
    node.querySelector('text').setAttribute('x',labelX.toFixed(2));
   }
   n['coast-dot'].setAttribute('transform',`translate(${current.x.toFixed(3)} ${current.y.toFixed(3)})`);
  }
  const angle=this.phase*TAU,ry=44+21*this.range/1.46,cx=75+35*Math.cos(angle),cy=75+35*Math.sin(angle);
  // Rotate the schematic globe with its surface marker; the water stays fixed.
  n.earth.setAttribute('transform',`rotate(${(this.phase*360).toFixed(3)} 75 75)`);
  const surfaceRadius=44*ry/Math.hypot(ry*Math.cos(angle),44*Math.sin(angle));
  n['clock-ocean'].setAttribute('ry',ry.toFixed(3));n.point.setAttribute('cx',cx.toFixed(3));n.point.setAttribute('cy',cy.toFixed(3));n.spoke.setAttribute('d',`M${cx.toFixed(3)} ${cy.toFixed(3)}L${(75+surfaceRadius*Math.cos(angle)).toFixed(3)} ${(75+surfaceRadius*Math.sin(angle)).toFixed(3)}`);
  const c=Math.cos(angle*2),level=c>.96?'Low water':c<-.96?'High water':Math.sin(angle*2)>0?'Water rising':'Water falling';
  n.level.textContent=level;const selected=this.scenario();n.range.textContent=selected==='king'?'King tide example':selected==='spring'?'Spring tide':selected==='neap'?'Neap tide':this.model.moonDistanceRatio<.999?'Closer Moon':this.range>1.39?'Bigger change':this.range<.63?'Smaller change':'In between';
  n.play.textContent=this.playing?'Ⅱ Pause day':'▶ Watch a day';n.play.setAttribute('aria-pressed',String(this.playing));
  n.day.value=String(Math.round(this.phase*1000));n.day.setAttribute('aria-valuetext',this.phase===0?'Start, low water':this.phase===1?'One tide day, low water':`${Math.round(this.phase*100)} percent of one tide day, ${level.toLowerCase()}`);
  n['clock-reading'].textContent=this.phase===0?'Start':this.phase===1?'One day':this.phase<.5?'First half':'Second half';
  n.description.textContent=`${level}. Gold markers show this alignment’s highest and lowest levels. The daily change is ${this.range.toFixed(2)} times the mean-distance Moon-only change. This is an illustrative beach, not a forecast.`;
  this.host.dataset.phase=this.phase.toFixed(6);this.host.dataset.range=this.range.toFixed(6);this.host.dataset.waterY=state.y.toFixed(3);this.host.dataset.playing=String(this.playing);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.observer.disconnect();this.resizeObserver.disconnect();
  this.nodes.play.removeEventListener('click',this.onPlay);this.nodes.day.removeEventListener('input',this.onDay);this.motion.removeEventListener('change',this.onMotion);document.removeEventListener('visibilitychange',this.onVisibility);
  for(const button of this.scenarioButtons)button.removeEventListener('click',this.onChooseScenario);
  this.nodes.retry.removeEventListener('click',this.onRetry);this.scene.removeEventListener('tide-coast-lost',this.onCoastLost);this.coast?.dispose();this.coast=null;
 }
}
