const $ = id => document.getElementById(id);
const STORAGE_KEY = 'solsystemet.discoveries.v1';
const MISSIONS = [
 {id:'sunrise',number:'01',title:'Catch a sunrise',destination:'EARTH',route:'earth',image:'assets/earth-still.jpg',duration:'2 MIN',description:'Turn a whole planet and bring a sleeping city into the light.',reward:'Sunrise spotter',fact:'Sunrise happens because Earth turns. The Sun lights a new part of our world as it rotates.',steps:[
  {title:'Choose your lookout',text:'Pick a city in “Observe a location”, then use it as your lookout.',action:'Use this city'},
  {title:'Find the night',text:'Move “Turn through one day” until your city reads Nighttime. The dark half is facing away from the Sun.',action:'Find the rotation slider'},
  {title:'Bring your city into daylight',text:'Keep turning Earth in the same direction until Nighttime changes to Daylight. You have crossed the edge of night.',action:'Keep turning Earth'}]},
 {id:'europa',number:'02',title:'An ocean in hiding',destination:'EUROPA',route:'europa',image:'assets/research/moons/europa.jpg',duration:'2 MIN',description:'Investigate an icy moon, then follow its journey around Jupiter.',reward:'Ocean detective',fact:'Europa probably hides a salty ocean beneath its icy crust. Nearby Io completes about two orbits in the time Europa completes one.',steps:[
  {title:'Let the light reveal the ice',text:'Move “Explore the light” to see how sunlight changes the view of Europa’s cracked surface.',action:'Find the sunlight slider'},
  {title:'Follow the icy moon',text:'Now zoom out to Jupiter’s moons. Europa travels beside the faster, volcanic moon Io.',action:'Explore Europa’s orbit'},
  {title:'Who takes the faster path?',text:'Io takes about 1.77 Earth days per orbit. Europa takes about 3.55. While Europa makes one trip, how many does Io make?',choices:['One trip','About two trips','Four trips'],answer:1,hint:'Compare 3.55 days with 1.77 days. Two of Io’s journeys take almost the same time as one of Europa’s.'}]},
 {id:'mercury',number:'03',title:'Race around the Sun',destination:'MERCURY + EARTH',route:'orrery/mercury',image:'assets/mercury-still.jpg',duration:'1 MIN',description:'Give every planet one Earth year. Discover who gets furthest.',reward:'Orbit explorer',fact:'Mercury’s year is only about 88 Earth days. In one Earth year it completes four whole trips, with part of a fifth still underway.',steps:[
  {title:'Start the same clock',text:'Watch one Earth year unfold for all eight worlds. Keep an eye on Mercury’s trip counter below the scene.',action:'Start one Earth year'},
  {title:'Watch the worlds race',text:'Let the year finish, or move the timeline to the end. The circles below count whole trips around the Sun.',action:'Find the trip counters'},
  {title:'Count Mercury’s whole trips',text:'Earth has completed one trip around the Sun. How many whole trips did Mercury finish in the same time?',choices:['One trip','Four trips','Twelve trips'],answer:1,hint:'Look at Mercury’s counter: count the completed trips, leaving the partly filled circle for the next one.'}]}
];

// Storage is optional: private browsing and blocked storage must not stop exploration.
export function createMissions({navigate,readState}) {
 let completed=new Set(),storageAvailable=true,active=null,step=0,finished=false,feedback='',focusOnArrival=false;
 try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(id=>MISSIONS.some(m=>m.id===id))); }
 catch { storageAvailable=false; }
 try {localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed]));}catch{storageAvailable=false;}
 const announce=message=>{$('missionAnnouncement').textContent=message;};
 function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed]));}catch{storageAvailable=false;}}
 function renderLibrary(){
  $('missionNavCount').textContent=`${completed.size}/3`;
  $('passportCount').textContent=`${completed.size} / 3`;
  $('passportLabel').textContent=completed.size===3?'SOLAR SYSTEM EXPLORER':'DISCOVERIES COLLECTED';
  $('passportStorage').textContent=storageAvailable?'Saved on this device':'Collected for this visit';
  $('missionCards').innerHTML=MISSIONS.map(m=>`<article class="mission-card" data-mission-card="${m.id}"><div class="mission-card-art mission-art-${m.id}" aria-hidden="true"><img src="${m.image}" alt="" loading="lazy"><span>${m.number} / FIELD MISSION</span></div><div class="mission-card-copy"><div class="mission-card-meta"><span>${m.destination}</span><span>${m.duration}</span></div><h3>${m.title}</h3><p>${m.description}</p><button type="button" data-start-mission="${m.id}">${completed.has(m.id)?'Explore again':'Start mission'} <span aria-hidden="true">↗</span></button><span class="mission-card-status">${completed.has(m.id)?'✓ '+m.reward:'A discovery to collect'}</span></div></article>`).join('');
  $('missionCards').querySelectorAll('[data-start-mission]').forEach(b=>b.onclick=()=>start(b.dataset.startMission));
 }
 function expectedRoute(){return active.id==='europa'&&step===2?'jupiter-moons/europa':active.route;}
 function inPlace(){
  const s=readState();
  if(active.id==='sunrise')return s.view==='planet'&&s.world==='earth';
  if(active.id==='europa')return step===2?s.view==='moons'&&location.hash.startsWith('#jupiter-moons'):s.view==='planet'&&s.world==='europa';
  return s.view==='orrery';
 }
 let wasInPlace=true;
 function renderGuide({focus=false}={}){
  const guide=$('missionGuide');focus=focus||guide.contains(document.activeElement);guide.hidden=!active;if(!active)return;
  const m=active,place=inPlace();wasInPlace=place;
  let content;
  if(finished){const next=MISSIONS.find(x=>!completed.has(x.id));content=`<div class="mission-earned" aria-hidden="true">✧</div><div class="mission-guide-copy"><span class="eyebrow">DISCOVERY COLLECTED · ${completed.size} OF 3</span><h2 id="missionStepTitle" tabindex="-1">${m.reward}</h2><p>${m.fact}</p></div><div class="mission-guide-actions"><button class="mission-primary" id="missionNext">${next?'Next mission ↗':'See your discoveries ↗'}</button><button class="mission-quiet" id="missionEnd">Keep exploring</button></div>`;}
  else {const current=m.steps[step];content=`<div class="mission-step-mark" aria-hidden="true">0${step+1}<span>/ 03</span></div><div class="mission-guide-copy"><span class="eyebrow">${m.title} · STEP ${step+1} OF 3</span><h2 id="missionStepTitle" tabindex="-1">${current.title}</h2><p>${place?current.text:'Your mission is waiting. Return to the experiment whenever you are ready.'}</p>${place&&current.choices?`<div class="mission-choices" aria-label="Choose your answer">${current.choices.map((c,i)=>`<button type="button" data-answer="${i}">${c}</button>`).join('')}</div><p id="missionFeedback" class="mission-feedback" role="status">${feedback}</p>`:''}</div><div class="mission-guide-actions">${!place?'<button id="missionReturn" class="mission-primary">Return to mission ↗</button>':current.action?`<button id="missionAction" class="mission-primary">${current.action} <span aria-hidden="true">↗</span></button>`:''}<button id="missionEnd" class="mission-quiet">Leave mission</button></div>`;}
  guide.innerHTML=content;
  $('missionEnd').onclick=()=>{active=null;guide.hidden=true;const heading=[...document.querySelectorAll('h1')].find(h=>h.getClientRects().length);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}announce('Mission closed. Keep exploring at your own pace.');};
  if($('missionReturn'))$('missionReturn').onclick=()=>navigate(expectedRoute());
  if($('missionAction'))$('missionAction').onclick=action;
  if($('missionNext'))$('missionNext').onclick=()=>{const next=MISSIONS.find(m=>!completed.has(m.id));if(next)start(next.id);else{active=null;guide.hidden=true;navigate('missions');}};
  guide.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
   if(Number(b.dataset.answer)===m.steps[step].answer)advance();
   else{feedback=m.steps[step].hint;$('missionFeedback').textContent=feedback;b.setAttribute('aria-label',b.textContent+'. Try another answer.');}
  });
  if(focus)$('missionStepTitle').focus({preventScroll:true});
 }
 function advance(){
  if(!active||finished)return;
  step++;feedback='';
  if(step>=active.steps.length){finished=true;completed.add(active.id);save();renderLibrary();announce('Discovery collected: '+active.reward+'. '+active.fact);}
  else announce(`Step ${step+1}: ${active.steps[step].title}`);
  renderGuide();
 }
 function spotlight(id){const el=$(id);const top=window.scrollY+el.getBoundingClientRect().top-$('missionGuide').offsetHeight-24;window.scrollTo({top:Math.max(0,top),behavior:'instant'});el.focus({preventScroll:true});el.classList.remove('mission-target');void el.offsetWidth;el.classList.add('mission-target');setTimeout(()=>el.classList.remove('mission-target'),3500);}
 function action(){
  if(!active||finished)return;
  if(active.id==='sunrise'){if(step===0){advance();spotlight('earthRotation');}else spotlight('earthRotation');}
  if(active.id==='europa'){if(step===0)spotlight('sunAngle');else if(step===1){advance();navigate('jupiter-moons/europa');}}
  if(active.id==='mercury'){if(step===0){$('oneYear').click();spotlight('orbitDay');}else spotlight('orbitScoreboard');}
 }
 function start(id){active=MISSIONS.find(m=>m.id===id);step=0;finished=false;feedback='';focusOnArrival=true;renderGuide();navigate(active.route);announce('Mission started: '+active.title+'. '+active.steps[0].text);}
 $('orbitScoreboard').tabIndex=-1;
 // These are the same controls used during free exploration, not separate simulations.
 $('citySelect').addEventListener('change',()=>{if(active?.id==='sunrise'&&step===0&&inPlace())advance();});
 $('sunAngle').addEventListener('input',()=>{if(active?.id==='europa'&&step===0&&inPlace()&&readState().ready)advance();});
 $('oneYear').addEventListener('click',()=>{if(active?.id==='mercury'&&step===0&&inPlace())advance();});
 function tick(){
  if(!active||finished)return;
  const place=inPlace();if(place!==wasInPlace)renderGuide();if(!place)return;
  const s=readState();
  if(active.id==='sunrise'&&s.ready){if(step===1&&s.daylight==='Nighttime')advance();else if(step===2&&s.daylight==='Daylight')advance();}
  if(active.id==='mercury'&&step===1&&s.days>=365.25)advance();
 }
 renderLibrary();
 return {tick,routeChanged:()=>{if(active)renderGuide({focus:focusOnArrival});focusOnArrival=false;}};
}
