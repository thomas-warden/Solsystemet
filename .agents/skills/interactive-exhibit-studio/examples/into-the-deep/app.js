const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const creatures = [
  {name:'Green sea turtle',latin:'Chelonia mydas',image:'assets/turtle.webp',depth:20,zone:'01 — THE SUNLIT OCEAN',title:'A little deeper.<br>A lot stranger.',invitation:'There’s a whole other world below the waves.<br> Ready to meet the neighbours?',next:'Descend to twilight',destination:'Next stop · 700 metres below',light:'Plenty of sunlight',condition:'Sunlight feeds tiny ocean plants.<br>Life here is full of colour.',feature:'A breath of fresh air',text:'A turtle can spend a long time underwater, but it still needs air. Like you, it breathes with lungs. Sooner or later, it must swim back up to the surface.',notice:'Look for the broad front flippers. They help this ocean traveller swim.',fact:'Grown green turtles mainly eat seagrasses and algae.',source:'https://www.fisheries.noaa.gov/species/green-turtle',publisher:'NOAA Fisheries'},
  {name:'Vampire squid',latin:'Vampyroteuthis infernalis',image:'assets/vampire.webp',depth:700,zone:'02 — THE TWILIGHT ZONE',title:'The light fades.<br>Life gets strange.',invitation:'Only a little sunlight reaches this far.<br> What could live in the almost-dark?',next:'Descend to midnight',destination:'Next stop · 3,000 metres below',light:'Very little sunlight',condition:'Too dim for plants to make food.<br>Some creatures eat what drifts down.',feature:'A surprisingly gentle eater',text:'That spooky name is a trick. This animal mostly eats marine snow: tiny scraps drifting down from the water above. It catches them with two long, sticky feeding threads.',notice:'Look for the fine feeding thread and the web of skin between its arms.',fact:'Despite its name, it is more closely related to octopuses than true squid.',source:'https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/vampire-squid',publisher:'Monterey Bay Aquarium'},
  {name:'Dumbo octopus',latin:'Grimpoteuthis · a group of deep-sea octopuses',image:'assets/dumbo.webp',depth:3000,zone:'03 — THE MIDNIGHT ZONE',title:'No sunlight.<br>Still full of life.',invitation:'Welcome to the deep ocean.<br> Even here, there are neighbours to meet.',next:'Return to sunlight',destination:'Back to the bright blue · 20 metres',light:'No sunlight',condition:'Sunlight cannot reach this deep.<br>Our expedition lights reveal the animal.',feature:'Those “ears” are fins',text:'A dumbo octopus flaps its two ear-like fins to swim. Its arms are joined by a soft web of skin. These octopuses often hover above the seabed, searching for food.',notice:'Find the two rounded fins. They are where this animal gets its nickname.',fact:'Snails and worms can be on the menu in this deep-water world.',source:'https://ocean.si.edu/ocean-life/invertebrates/dumbo-octopus-curly-arms',publisher:'Smithsonian Ocean'}
];
const range = $('#depth'), number = $('#depthNumber'), main = $('#expedition'), dialog = $('#detail');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !reduce.matches, currentDepth = 20, zone = -1, flight = null, frame = 0, lastTime = 0, clock = 0, drawCount = 0, onScreen = true;
let inspected = new Set(), solved = false;
const imageStates = ['loading','loading','loading'];
const canvas = $('#snow'), context = canvas.getContext('2d');
let width=1,height=1;
const particles = Array.from({length:65},(_,i)=>({x:((i*73+19)%101)/101,y:((i*47+17)%103)/103,r:.45+(i%4)*.25,s:.007+(i%6)*.002}));
function positionForDepth(depth){if(depth<=200)return depth/200*250;if(depth<=1000)return 250+(depth-200)/800*300;return 550+(depth-1000)/3000*450;}
function depthForPosition(position){if(position<=250)return position/250*200;if(position<=550)return 200+(position-250)/300*800;return 1000+(position-550)/450*3000;}
function zoneForDepth(depth){return depth<200?0:depth<1000?1:2;}
function clamp(n){return Math.min(1,Math.max(0,n));}
function setDepth(depth,{announce=false}={}){
  currentDepth=Math.max(0,Math.min(4000,depth));
  const nextZone=zoneForDepth(currentDepth), creature=creatures[nextZone];
  const position=positionForDepth(currentDepth);
  range.value=String(Math.round(position));range.setAttribute('aria-valuetext',`${Math.round(currentDepth).toLocaleString('en-GB')} metres, ${['sunlit ocean','twilight zone','midnight zone'][nextZone]}`);
  range.style.setProperty('--depth',`${position/10}%`);
  number.value=Math.round(currentDepth).toLocaleString('en-GB');
  const first=clamp((currentDepth-120)/210), second=clamp((currentDepth-870)/400);
  $('#layer0').style.opacity=String(1-first);$('#layer1').style.opacity=String(first*(1-second));$('#layer2').style.opacity=String(second);
  main.dataset.depth=String(Math.round(currentDepth));
  if(zone!==nextZone){
    zone=nextZone;main.dataset.zone=String(zone);
    $('#zoneLabel').textContent=creature.zone;$('#headline').innerHTML=creature.title;$('#invitation').innerHTML=creature.invitation;
    $('#descendText').textContent=creature.next;$('#destination').textContent=creature.destination;$('#descend .arrow').textContent=zone===2?'↑':'↓';
    $('.image-caption').textContent=zone===0?'Illustration · Sizes & depth spacing not to scale':'Illustration · Shown with light · Sizes not to scale';
    $('#creatureName').textContent=creature.name;$('#inspect').setAttribute('aria-label',`Inspect ${creature.name.toLowerCase()}`);
    $('#light').innerHTML=`<i></i>${creature.light}`;$('#condition').innerHTML=creature.condition;
    $$('.zone-shortcuts button').forEach((button,index)=>{button.classList.toggle('active',zone===index);button.setAttribute('aria-pressed',String(zone===index));});
    updateAssetStatus();
  }
  if(announce)$('#announcement').textContent=`${Math.round(currentDepth).toLocaleString('en-GB')} metres. ${creature.zone.slice(5).toLowerCase()}. ${creature.name} is ready to inspect.`;
}
function updateAssetStatus(){
  const status=imageStates[Math.max(zone,0)], message=$('#assetMessage');
  message.classList.toggle('visible',status!=='ready');
  $('#assetText').textContent=status==='error'?'This illustration could not load. You can still open the animal’s field note.':'Bringing this ocean neighbour into view…';
  $('#retry').hidden=status!=='error';
  main.dataset.assetState=status;
}
$$('.image-layer img').forEach((img,index)=>{
  function ready(){imageStates[index]='ready';img.parentElement.classList.remove('failed');updateAssetStatus();}
  function failed(){imageStates[index]='error';img.parentElement.classList.add('failed');updateAssetStatus();}
  img.addEventListener('load',ready);img.addEventListener('error',failed);
  if(img.complete){if(img.naturalWidth)ready();else failed();}
});
$('#retry').addEventListener('click',()=>{const img=$(`#layer${zone} img`);imageStates[zone]='loading';updateAssetStatus();img.src=creatures[zone].image+'?retry='+Date.now();});
function resize(){const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);width=box.width;height=box.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context?.setTransform(dpr,0,0,dpr,0,0);draw(0);}
function draw(dt){
  drawCount++;
  if(context){context.clearRect(0,0,width,height);context.fillStyle='#c4eee2';for(const particle of particles){particle.y=(particle.y-dt*(particle.s+(flight ? .1 : 0))+1)%1;context.globalAlpha=.13+(particle.r*.14);context.beginPath();context.arc(particle.x*width,particle.y*height,particle.r,0,Math.PI*2);context.fill();}}
  const x=Math.sin(clock*.12)*3,y=Math.cos(clock*.16)*2;
  $$('.image-layer').forEach(layer=>{layer.style.transform=`translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(1.014)`;});
}
function canAnimate(){return playing&&!document.hidden&&onScreen&&!dialog.open;}
function schedule(){if(!frame&&canAnimate()){lastTime=performance.now();frame=requestAnimationFrame(tick);}}
function tick(now){frame=0;if(!canAnimate())return;const dt=Math.min((now-lastTime)/1000,.06);lastTime=now;clock+=dt;
  if(flight){flight.elapsed+=dt;const t=Math.min(1,flight.elapsed/flight.duration),ease=t*t*(3-2*t);setDepth(flight.from+(flight.to-flight.from)*ease);if(t===1){flight=null;setDepth(currentDepth,{announce:true});}}
  draw(dt);frame=requestAnimationFrame(tick);
}
function stopFrame(){if(frame){cancelAnimationFrame(frame);frame=0;}lastTime=0;}
function syncMotion(){main.classList.toggle('paused',!playing);$('#motion').innerHTML=playing?'<span aria-hidden="true" class="motion-mark pause-mark"></span> Pause motion':'<span aria-hidden="true" class="motion-mark play-mark"></span> Play motion';$('#motion').setAttribute('aria-pressed',String(playing));if(canAnimate())schedule();else stopFrame();}
function travel(to){if(!playing||reduce.matches){flight=null;setDepth(to,{announce:true});draw(0);}else{flight={from:currentDepth,to,duration:3.4,elapsed:0,active:true};schedule();}}
$('#motion').addEventListener('click',()=>{playing=!playing;if(!playing)flight=null;syncMotion();});
reduce.addEventListener('change',event=>{if(event.matches){playing=false;flight=null;syncMotion();}});
range.addEventListener('input',()=>{flight=null;setDepth(depthForPosition(Number(range.value)));draw(0);});
range.addEventListener('change',()=>setDepth(currentDepth,{announce:true}));
$('#descend').addEventListener('click',()=>travel([700,3000,20][zone]));
$$('[data-depth]').forEach(button=>button.addEventListener('click',()=>travel(Number(button.dataset.depth))));
function openDialog(content){$('#detailContent').innerHTML=content;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;stopFrame();$('#closeDetail').focus();}
function showCreature(index){
  const c=creatures[index];inspected.add(index);$('#count').textContent=`${inspected.size} / 3`;
  openDialog(`<div class="detail-grid"><div class="detail-illustration"><img src="${c.image}" alt="Illustration of ${c.name.toLowerCase()}" onerror="this.hidden=true"><span class="illustration-label">Illustration · shown with expedition lighting</span></div><article class="detail-copy"><p class="eyebrow">FIELD NOTE ${String(index+1).padStart(2,'0')} · ENCOUNTER AT ABOUT ${c.depth.toLocaleString('en-GB')} M</p><h2 id="detailTitle">${c.name}</h2><p class="latin">${c.latin}</p><h3>${c.feature}</h3><p>${c.text}</p><h3>Look a little closer</h3><p>${c.notice}</p><p class="fact">${c.fact}</p><a class="source-link" href="${c.source}" target="_blank" rel="noopener">Read more at ${c.publisher} →</a></article></div>`);
}
function showGuide(){
  openDialog(`<section class="guide-copy"><p class="eyebrow">YOUR EXPEDITION NOTEBOOK</p><h2 id="detailTitle">A world of neighbours.</h2><p>Take a closer look at each animal. Then try the little discovery below. Your notes stay here while this page is open.</p><div class="guide-animals">${creatures.map((c,i)=>`<button class="guide-animal" data-creature="${i}">${c.name}<small>${inspected.has(i)?'FIELD NOTE OPENED':'OPEN FIELD NOTE →'}</small></button>`).join('')}</div><div class="discovery"><p class="eyebrow">A LITTLE DISCOVERY</p><h3>Which neighbour swims with fins that look like ears?</h3><div class="answers">${creatures.map((c,i)=>`<button data-answer="${i}" ${solved&&i===2?'class="chosen"':''}>${c.name}</button>`).join('')}</div><p class="feedback" role="status">${solved?'You spotted it! The dumbo octopus flaps its ear-like fins to swim.':'Look closely at their shapes. You can open any field note for a clue.'}</p></div></section>`);
  $$('[data-creature]').forEach(button=>button.addEventListener('click',()=>showCreature(Number(button.dataset.creature))));
  $$('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
    const correct=button.dataset.answer==='2';if(correct)solved=true;
    $$('.answers button').forEach(b=>b.classList.toggle('chosen',b===button));
    $('.feedback').textContent=correct?'You spotted it! The dumbo octopus flaps its ear-like fins to swim.':'Look for two rounded fins high on the animal’s body. Open the dumbo octopus note, then try again.';
  }));
}
function showSources(){openDialog(`<section class="guide-copy source-copy"><p class="eyebrow">BEHIND THE EXPEDITION</p><h2 id="detailTitle">The science & the pictures.</h2><p>This is an illustrated journey through broad ocean zones. The animals are shown at example depths, with light added so you can see them. Their sizes and the spacing between depths are not to scale. They are not all neighbours in one real location.</p><p>Sunlight usually fades through a sunlit zone (about 0–200 m), a twilight zone (200–1,000 m), and the midnight zone (1,000–4,000 m). Water clarity varies. The deeper ocean continues beyond our journey.</p><ol class="source-list"><li><a href="https://oceanexplorer.noaa.gov/ocean-fact/light-distributed/" target="_blank" rel="noopener">NOAA Ocean Exploration — Light in the ocean</a><br>Depth zones and the fading of sunlight.</li><li><a href="${creatures[0].source}" target="_blank" rel="noopener">NOAA Fisheries — Green turtle</a><br>Air breathing, coastal habitats, and food.</li><li><a href="${creatures[1].source}" target="_blank" rel="noopener">Monterey Bay Aquarium — Vampire squid</a><br>Sticky feeding threads, marine snow, and reflected eye colour.</li><li><a href="https://ocean.si.edu/ocean-life/invertebrates/grimpoteuthis-dumbo-octopus" target="_blank" rel="noopener">Smithsonian Ocean — Grimpoteuthis</a> and <a href="${creatures[2].source}" target="_blank" rel="noopener">ear-like fins</a><br>Deep-ocean habitat, fins, and food.</li></ol><p>Creature art was generated for this exhibit with OpenAI image generation, then visually reviewed. It is illustration, not a photograph or a scientific anatomical model. Gentle drifting suggests motion; it does not simulate swimming. Source pages checked 17 October 2026.</p><p>Type: Instrument Serif and DM Sans by their respective project authors, under the SIL Open Font License. <a href="ASSET_CREDITS.md">Full asset credits</a> · <a href="SOURCES.md">Claim evidence</a></p></section>`);}
$('#inspect').addEventListener('click',()=>showCreature(zone));$('#guide').addEventListener('click',showGuide);$('#sources').addEventListener('click',showSources);
$('#closeDetail').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFrame();else schedule();});
new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;if(onScreen)schedule();else stopFrame();}).observe(main);
addEventListener('resize',resize);setDepth(20);resize();syncMotion();
window.expeditionState=()=>({depth:currentDepth,zone,playing,flight:!!flight,drawCount,inspected:inspected.size,solved,images:[...imageStates]});
