const $ = id => document.getElementById(id);
const STORAGE_KEY = 'solsystemet.discoveries.v1';
const MISSIONS = [
 {id:'sunrise',number:'01',title:'Catch a sunrise',destination:'EARTH',route:'earth',image:'assets/earth-still.jpg',duration:'2 MIN',description:'Turn Earth and bring your own lookout into the sunlight.',reward:'Sunrise spotter',fact:'You brought a city from night into daylight. Earth turns, so sunlight reaches a new part of our world.',steps:[
  {title:'Pick your lookout',text:'Choose a city below. This is where you will watch the sunrise.',action:'Use this city'},
  {title:'Find the night',text:'Move the time slider until your city reads Nighttime. Then we will watch a new day begin.'},
  {title:'Catch the first light',text:'Move time forward →. Watch your city’s gold marker cross from night into sunlight.',action:'Save this sunrise'}]},
 {id:'europa',number:'02',title:'An ocean in hiding',destination:'EUROPA',route:'europa',image:'assets/research/moons/europa.jpg',duration:'2 MIN',description:'Look for cracks in the ice. Discover what may be hiding underneath.',reward:'Ocean detective',fact:'Spacecraft clues suggest a salty ocean beneath Europa’s icy shell. We cannot photograph it through the ice, and its depth is still uncertain.',steps:[
  {title:'What can you see in the ice?',text:'Turn Europa or move the light. Which feature can you see on its surface?',choices:['Dark lines','Open water'],answer:0,hint:'Those long dark lines cross solid ice. The ocean is hidden below; we cannot see open water in this picture.'},
  {title:'A clue, then a question',text:'You saw dark lines in solid ice. Other spacecraft clues suggest an ocean below. Lift the ice in our illustration.',action:'Lift the icy shell'},
  {title:'Where is the ocean hiding?',text:'Look at the blue layer in the cutaway. Where could liquid water lie?',choices:['Above the ice','Under the ice'],answer:1,hint:'The bright icy shell is the roof. Look at the blue water below it.'}]},
 {id:'mercury',number:'03',title:'Race around the Sun',destination:'MERCURY + EARTH',route:'orrery/mercury',image:'assets/mercury-still.jpg',duration:'1 MIN',description:'Start one clock. Watch little Mercury race Earth around the Sun.',reward:'Orbit explorer',fact:'Mercury finishes four whole trips while Earth finishes one. Its short year lasts about 88 Earth days.',steps:[
  {title:'Ready, set, orbit!',text:'Give both worlds one Earth year. Watch Mercury’s counter as they travel.',action:'Start the race'},
  {title:'Watch Mercury go',text:'Let the year finish, or slide time to the end. Count Mercury’s whole trips.'},
  {title:'How many trips for Mercury?',text:'Earth has finished one trip. How many whole trips did Mercury make?',choices:['One trip','Four trips','Twelve trips'],answer:1,hint:'Read Mercury’s whole-trip counter. Its partly filled circle is the next trip.'}]}
];
const BADGE_ART = {
 sunrise:'<path d="M18 40h44M25 46h30M30 52h20"/><path d="M26 35a14 14 0 0 1 28 0"/><path d="M40 12v6M20 20l5 5M60 20l-5 5M13 34h6M61 34h6"/>',
 europa:'<path d="M17 27l12-6 12 5 10-5 12 6-5 9-13-3-13 5-15-5z"/><path d="M17 44q7-6 15 0t16 0 15 0M21 53q6-5 13 0t14 0 11 0"/><path d="M41 23l-4 7 7 4"/>',
 mercury:'<ellipse cx="40" cy="39" rx="27" ry="14" transform="rotate(-25 40 39)"/><circle cx="40" cy="39" r="8"/><circle cx="62" cy="23" r="5"/><path d="M18 57l8 2-2-8"/>'
};
function badge(id,extra='') {return `<svg class="discovery-badge ${extra}" viewBox="0 0 80 80" aria-hidden="true"><circle class="badge-rim" cx="40" cy="40" r="36"/><g>${BADGE_ART[id]}</g></svg>`;}

// Completion is stored locally; exploration also works when storage is unavailable.
export function createMissions({navigate,readState,setSunriseView=()=>{},captureSunrise=()=>{}}) {
 const root=$('atlas');
 let completed=new Set(),storageAvailable=true,active=null,step=0,finished=false,feedback='',focusOnArrival=false;
 let sunriseSeen=false,observed='',wasInPlace=true,wasAvailability='loading';
 try {const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(id=>MISSIONS.some(m=>m.id===id)));}catch{storageAvailable=false;}
 try {localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed]));}catch{storageAvailable=false;}
 const announce=message=>{$('missionAnnouncement').textContent=message;};
 function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed]));}catch{storageAvailable=false;}}
 function renderLibrary(){
  $('missionNavCount').textContent=`${completed.size}/3`;$('passportCount').textContent=`${completed.size} / 3`;
  $('passportLabel').textContent=completed.size===3?'SOLAR SYSTEM EXPLORER':'DISCOVERIES COLLECTED';
  $('passportStorage').textContent=storageAvailable?'Saved on this device':'Collected for this visit';
  $('missionCards').innerHTML=MISSIONS.map(m=>`<article class="mission-card" data-mission-card="${m.id}"><div class="mission-card-art mission-art-${m.id}" aria-hidden="true"><img src="${m.image}" alt="" loading="lazy"><span>${m.number} / FIELD MISSION</span></div><div class="mission-card-copy"><div class="mission-card-meta"><span>${m.destination}</span><span>${m.duration}</span></div><h3>${m.title}</h3><p>${m.description}</p><button type="button" data-start-mission="${m.id}">${completed.has(m.id)?'Explore again':'Start mission'} <span aria-hidden="true">↗</span></button><span class="mission-card-status ${completed.has(m.id)?'is-collected':''}">${badge(m.id)}<span>${completed.has(m.id)?m.reward:'Collect the '+m.reward.toLowerCase()+' badge'}</span></span></div></article>`).join('');
  $('missionCards').querySelectorAll('[data-start-mission]').forEach(b=>b.onclick=()=>start(b.dataset.startMission));
 }
 function inPlace(){const s=readState();return active?.id==='mercury'?s.view==='orrery':s.view==='planet'&&s.world===(active?.id==='sunrise'?'earth':'europa');}
 function availability(){const s=readState();return s.availability||(s.view==='orrery'||s.ready?'ready':'loading');}
 function canAdvance(){return !!active&&!finished&&inPlace()&&availability()==='ready'&&!(active.id==='mercury'&&step===2&&readState().days<readState().yearLength);}
 function syncMode(){
  const working=!!active&&inPlace(),cutaway=working&&active.id==='europa'&&step>0;
  setSunriseView(working&&active.id==='sunrise');
  root.classList.toggle('mission-active',working);root.classList.toggle('mission-cutaway',cutaway);
  root.dataset.mission=active?.id||'';root.dataset.missionStep=String(step);
  root.dataset.missionAvailability=working?availability():'';
  $('europaCutaway').hidden=!cutaway;$('europaCutaway').classList.toggle('is-open',step>=2);
  $('missionScenePlay').hidden=!working||active.id==='mercury'||cutaway;
  $('missionScenePlay').disabled=!working||availability()!=='ready';
 }
 function fitScene(){
  if(!root.classList.contains('mission-active'))return;
  root.style.setProperty('--mission-guide-height',$('missionGuide').offsetHeight+'px');
  if(matchMedia('(max-width:1000px), (max-width:1200px) and (max-height:820px)').matches){const top=window.scrollY+$('missionGuide').getBoundingClientRect().top;window.scrollTo({top,behavior:'instant'});}
 }
 new ResizeObserver(()=>root.style.setProperty('--mission-guide-height',$('missionGuide').offsetHeight+'px')).observe($('missionGuide'));
 function close(){active=null;$('missionGuide').hidden=true;syncMode();const heading=[...document.querySelectorAll('h1')].find(h=>h.getClientRects().length);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}announce('Mission closed. Keep exploring at your own pace.');}
 function renderGuide({focus=false,fit=false,statusChange=false}={}){
  const guide=$('missionGuide'),focusedId=guide.contains(document.activeElement)?document.activeElement.id:'';focus=focus||(!statusChange&&guide.contains(document.activeElement));guide.hidden=!active;syncMode();if(!active)return;
  const m=active,place=inPlace(),status=availability();wasInPlace=place;wasAvailability=status;
  if(finished){const next=MISSIONS.find(x=>!completed.has(x.id));guide.innerHTML=`${badge(m.id,'badge-earned')}<div class="mission-guide-copy"><span class="eyebrow">DISCOVERY ${completed.size} OF 3 · COLLECTED</span><h2 id="missionStepTitle" tabindex="-1">${m.reward}</h2>${observed?`<p class="mission-evidence">${observed}</p>`:''}<p>${m.fact}</p></div><div class="mission-guide-actions"><button class="mission-primary" id="missionNext">${next?'Next mission ↗':'My discoveries ↗'}</button><button class="mission-quiet" id="missionEnd">Keep exploring</button></div>`;}
  else if(place&&status!=='ready'){
   const loading=status==='loading',world=m.id==='sunrise'?'Earth':m.id==='europa'?'Europa':'the solar system';
   guide.innerHTML=`<div class="mission-step-mark" aria-hidden="true">0${step+1}<span>/ 03</span></div><div class="mission-guide-copy"><span class="eyebrow">${m.title} · ${step+1} OF 3</span><h2 id="missionStepTitle" tabindex="-1">${loading?'Getting '+world+' ready…':'The moving view could not start'}</h2><p id="${loading?'missionLoading':'missionUnavailable'}" role="status">${loading?'Loading the moving world. Your mission will be ready soon.':m.id==='mercury'?'Try again, or leave the mission to explore the planet pages.':'Try again, or leave the mission to explore the still picture.'}</p></div><div class="mission-guide-actions">${loading?'<button id="missionAction" class="mission-primary" disabled>Preparing…</button>':'<button id="missionRetry" class="mission-primary">Try again ↗</button>'}<button id="missionEnd" class="mission-quiet">Leave mission</button></div>`;
  }
  else {const current=m.steps[step];guide.innerHTML=`<div class="mission-step-mark" aria-hidden="true">0${step+1}<span>/ 03</span></div><div class="mission-guide-copy"><span class="eyebrow">${m.title} · ${step+1} OF 3</span><h2 id="missionStepTitle" tabindex="-1">${current.title}</h2><p>${place?current.text:'Your discovery is waiting. Come back whenever you are ready.'}</p>${place&&current.choices?`<div class="mission-choices" aria-label="Choose your answer">${current.choices.map((c,i)=>`<button type="button" data-answer="${i}">${c}</button>`).join('')}</div>`:''}<p id="missionFeedback" class="mission-feedback" role="status">${feedback}</p></div><div class="mission-guide-actions">${!place?'<button id="missionReturn" class="mission-primary">Back to my mission ↗</button>':current.action?`<button id="missionAction" class="mission-primary">${current.action} <span aria-hidden="true">↗</span></button>`:''}<button id="missionEnd" class="mission-quiet">Leave mission</button></div>`;}
  $('missionEnd').onclick=close;
  if($('missionReturn'))$('missionReturn').onclick=()=>{focusOnArrival=true;navigate(active.route);};
  if($('missionAction'))$('missionAction').onclick=action;
  if($('missionRetry'))$('missionRetry').onclick=()=>{focusOnArrival=true;navigate(active.route);};
  if($('missionNext'))$('missionNext').onclick=()=>{const next=MISSIONS.find(m=>!completed.has(m.id));if(next)start(next.id);else{close();navigate('missions');}};
  guide.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(!canAdvance())return;if(Number(b.dataset.answer)===m.steps[step].answer){if(m.id==='europa'&&step===2)observed='You compared visible cracks with an illustration of the hidden layers.';if(m.id==='mercury')observed='At one Earth year: Mercury made 4 whole trips; Earth made 1.';advance();}else{feedback=m.steps[step].hint;$('missionFeedback').textContent=feedback;b.setAttribute('aria-label',b.textContent+'. Try another answer.');}});
  if(m.id==='sunrise'&&step===2&&$('missionAction'))$('missionAction').disabled=!sunriseSeen;
  if(focus)$('missionStepTitle').focus({preventScroll:true});
  else if(statusChange&&focusedId&&$(focusedId)&&!$(focusedId).disabled)$(focusedId).focus({preventScroll:true});
  if(fit){fitScene();requestAnimationFrame(fitScene);}
 }
 function advance(){
  if(!canAdvance())return;step++;feedback='';
  if(step>=active.steps.length){finished=true;completed.add(active.id);save();renderLibrary();announce('Discovery collected: '+active.reward+'. '+active.fact);}
  else announce(`Step ${step+1}: ${active.steps[step].title}`);
  renderGuide({focus:finished,fit:true});
 }
 function spotlight(id){const el=$(id);if(matchMedia('(max-width:1000px), (max-width:1200px) and (max-height:820px)').matches)fitScene();else el.scrollIntoView({block:'center',behavior:'instant'});el.focus({preventScroll:true});el.classList.remove('mission-target');void el.offsetWidth;el.classList.add('mission-target');setTimeout(()=>el.classList.remove('mission-target'),3500);}
 function action(){
  if(!canAdvance())return;
  if(active.id==='sunrise'&&step===0){advance();spotlight('earthRotation');}
  else if(active.id==='sunrise'&&step===2&&sunriseSeen)advance();
  if(active.id==='europa'&&step===1)advance();
  if(active.id==='mercury'&&step===0){$('oneYear').click();spotlight('orbitDay');}
 }
 function start(id){active=MISSIONS.find(m=>m.id===id);if(!active)return;step=0;finished=false;feedback='';sunriseSeen=false;observed='';focusOnArrival=true;renderGuide();navigate(active.route);announce('Mission started: '+active.title+'. '+active.steps[0].text);}
 $('homeStartMission').onclick=()=>start('sunrise');
 $('missionScenePlay').onclick=()=>{if(active&&inPlace()&&availability()==='ready')$('playButton').click();};
 $('orbitScoreboard').tabIndex=-1;
 $('citySelect').addEventListener('change',()=>{if(active?.id==='sunrise'&&!finished&&step>0){step=0;sunriseSeen=false;observed='';feedback='Choose Use this city when your lookout is ready.';renderGuide({focus:true,fit:true});}});
 // Only a deliberate slider input advances sunrise; animation alone never earns it.
 $('earthRotation').addEventListener('input',()=>{
  if(active?.id!=='sunrise'||!canAdvance())return;const s=readState(),input=s.earthInput;
  if(step===1&&s.daylight==='Nighttime')advance();
  else if(step===2&&input){
   if(sunriseSeen)return; // Keep an observation already made, even while exploring further.
   sunriseSeen=false;observed='';
   if(input.to<input.from)feedback='Time moved backward. To catch sunrise, move the slider forward → from night into day.';
   else if(!input.wasDaylight&&s.daylight==='Daylight'){
    captureSunrise(input.from,input.to);sunriseSeen=true;observed=s.city+' crossed from night into daylight.';
    feedback='Sunrise in '+s.city+'! The gold marker reached the light. Save what you observed.';
   }else feedback=s.daylight==='Nighttime'?'Still nighttime. Keep moving time forward →.':'Already in daylight. Go back into night, then move forward across the edge.';
   $('missionFeedback').textContent=feedback;$('missionAction').disabled=!sunriseSeen;
   if(sunriseSeen){announce(feedback);$('missionAction').focus({preventScroll:true});}
  }
 });
 $('resetButton').addEventListener('click',()=>{if(active?.id==='sunrise'&&!finished){step=0;sunriseSeen=false;observed='';feedback='';renderGuide({focus:true,fit:true});}});
 $('oneYear').addEventListener('click',()=>{if(active?.id==='mercury'&&step===0&&canAdvance())advance();});
 function tick(){
  if(!active)return;const place=inPlace(),status=availability();if(place!==wasInPlace||status!==wasAvailability)renderGuide({statusChange:true,fit:place});if(!place||status!=='ready')return;
  if(!finished&&active.id==='mercury'){
   if(step===2&&readState().days<readState().yearLength){step=1;feedback='The clock restarted. Run or slide to one Earth year to compare the trips again.';renderGuide({fit:true});}
   else if(step===1&&readState().days>=readState().yearLength)advance();
  }
  const playing=$('playButton').getAttribute('aria-pressed')==='true';$('missionScenePlay').textContent=playing?'Ⅱ Pause':'▶ Play';$('missionScenePlay').setAttribute('aria-pressed',String(playing));
 }
 for(const id of ['orbitDay','orbitPlay','resetOrbit'])$(id).addEventListener(id==='orbitDay'?'input':'click',()=>queueMicrotask(tick));
 renderLibrary();
 return {tick,routeChanged:()=>{if(active)renderGuide({focus:focusOnArrival,fit:focusOnArrival});focusOnArrival=false;}};
}
