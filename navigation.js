import { MOONS, FAMILIES } from './moons.js?v=f0f54c10a0bd';
import { ORDER } from './worlds.js?v=f0f54c10a0bd';

export const FEATURED_MOONS={earth:['moon'],jupiter:['europa','io','ganymede','callisto'],saturn:['enceladus','titan','mimas','iapetus']};
export const MOON_HOOKS={moon:'Footprints that last for ages.',europa:'A whole ocean beneath the ice.',io:'A world with hundreds of volcanoes.',ganymede:'Bigger than Mercury. Still a moon.',callisto:'Billions of years written in craters.',enceladus:'An ocean spraying into space.',titan:'Lakes and rain made of methane.',mimas:'One crater almost a third of a moon wide.',iapetus:'A moon with a mountain seam.',rhea:'Shining cliffs made of ice.',dione:'Three moons share one track.',tethys:'A valley more than half a world long.'};
const parentName=id=>id[0].toUpperCase()+id.slice(1);
export function resolveRoute(hash){
 const raw=hash.replace(/^#/,'');
 if(!raw||raw==='explore'||raw==='missions')return {view:'home',path:raw||'explore'};
 if(ORDER.includes(raw)||MOONS[raw])return {view:'planet',world:raw,path:raw};
 if(raw==='belt')return {view:'belt',path:raw};
 const [base,selection,...rest]=raw.split('/');
 if(!rest.length&&(base==='orrery'||base==='orrery-belt')){
  const selected=base==='orrery-belt'?'belt':ORDER.includes(selection)||selection==='belt'?selection:undefined;
  return {view:'orrery',selected,path:selected?'orrery/'+selected:'orrery'};
 }
 const parent=base.replace(/-moons$/,'');
 if(!rest.length&&base.endsWith('-moons')&&FAMILIES[parent]){
  const selected=FAMILIES[parent].includes(selection)?selection:undefined;
  return {view:'moons',parent,selected,path:parent+'-moons'+(selected?'/'+selected:'')};
 }
 return {view:'planet',world:'earth',path:'earth'};
}
export function moonCard(id){
 const p=MOONS[id],a=document.createElement('a');a.className='moon-card';a.href='#'+id;a.setAttribute('aria-label','View '+p.title.replace(/^The /,'the '));
 a.innerHTML=`<span class="moon-mini" style="background-image:url('assets/research/${p.map}')" aria-hidden="true"></span><strong>${p.title}</strong><small>${p.chapter}</small><p>${MOON_HOOKS[id]||p.lead}</p><span class="moon-card-visit">View this moon ↗</span>`;
 return a;
}
export function renderFamilyNavigation(world){
 const p=MOONS[world],parent=p?.parent||world,host=document.getElementById('familyNav');host.replaceChildren();host.hidden=!FAMILIES[parent];
 if(host.hidden)return;
 const link=(text,hash,cls)=>{const a=document.createElement('a');a.textContent=text;a.href='#'+hash;if(cls)a.className=cls;host.append(a);};
 if(p)link('← View '+parentName(parent),parent,'family-parent');
 else if(parent==='earth')link('View the Moon ↗','moon','family-primary');
 else{
  const label=document.createElement('span');label.className='family-eyebrow';label.textContent='MOONS TO EXPLORE';host.append(label);
  for(const id of FEATURED_MOONS[parent])link(MOONS[id].title+' ↗',id,'family-moon');
 }
 link(parent==='earth'?'Earth & Moon orrery ↗':'See their orbits ↗',parent+'-moons'+(p?'/'+world:''),'family-system');
}
export function renderMoonShelf(world){
 const parent=MOONS[world]?.parent||world,host=document.getElementById('moonDiscoveries');
 const ids=(FEATURED_MOONS[parent]||[]).filter(id=>id!==world);host.hidden=!ids.length||parent==='earth';
 if(host.hidden)return;
 document.getElementById('moonDiscoveriesTitle').textContent=MOONS[world]?'More around '+parentName(parent)+'.':'Meet '+parentName(parent)+'’s moons.';
 document.getElementById('moonDiscoveriesIntro').textContent=parent==='jupiter'?'Hidden oceans, restless volcanoes and a moon bigger than Mercury.':'Ice fountains, strange rain and worlds shaped by enormous collisions.';
 const grid=document.getElementById('featuredMoonCards');grid.replaceChildren(...ids.map(moonCard));
 const system=document.getElementById('featuredMoonSystem');system.href='#'+parent+'-moons';system.textContent='Explore their orbits ↗';
}
export function renderMoonSystemNavigation(parent,selected){
 const title=parent==='earth'?'Earth & the Moon':parentName(parent)+'’s moons';
 document.title=title+' — Solsystemet';
 document.getElementById('moonSystemTitle').textContent=title+'.';
 const parentLink=document.getElementById('moonParentLink');parentLink.href='#'+parent;parentLink.textContent='← View '+parentName(parent);
 const shortcuts=document.getElementById('moonPageLinks');shortcuts.replaceChildren();
 for(const id of FEATURED_MOONS[parent]){const a=document.createElement('a');a.href='#'+id;a.textContent=(parent==='earth'?'View the Moon':MOONS[id].title)+' ↗';shortcuts.append(a);}
 const ids=[...FEATURED_MOONS[parent],...FAMILIES[parent].filter(id=>!FEATURED_MOONS[parent].includes(id))];
 document.getElementById('moonCards').hidden=parent==='earth';document.getElementById('moonCards').replaceChildren(...ids.map(moonCard));
 const picker=document.getElementById('moonFocus');picker.replaceChildren(...FAMILIES[parent].map(id=>{const o=document.createElement('option');o.value=id;o.textContent=MOONS[id].title;return o;}));picker.value=selected||FAMILIES[parent][0];
 document.querySelectorAll('#moonSystemView .neighbourhood-nav a').forEach(a=>{if(a.hash==='#'+parent+'-moons')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
