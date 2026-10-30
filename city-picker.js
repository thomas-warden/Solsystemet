import { CITIES } from './cities.js?v=2b5e4bf4b624.9df63c26d4';

// A scroll-snap wheel with an explicit commit: browsing never starts map/weather requests.
const pickers=new WeakMap();
let dialog, wheel, options, current, pending=0, frame=0, settle=0;
const rowHeight=52;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function paint(){
 frame=0;
 const position=wheel.scrollTop/rowHeight;
 pending=Math.max(0,Math.min(options.length-1,Math.round(position)));
 options.forEach((option,i)=>{
  const distance=i-position;
  option.style.transform=reduced()?'none':`perspective(420px) rotateX(${Math.max(-65,Math.min(65,-distance*20))}deg) scale(${1-Math.min(.12,Math.abs(distance)*.035)})`;
  option.setAttribute('aria-selected',String(i===pending));
 });
 wheel.setAttribute('aria-activedescendant',options[pending].id);
}
function move(index, smooth=true){
 index=Math.max(0,Math.min(options.length-1,index));
 wheel.scrollTo({top:index*rowHeight,behavior:smooth&&!reduced()?'smooth':'instant'});
 if(!smooth||reduced())paint();
}
function close(commit=false){
 if(!current)return;
 const target=current;current=null;
 clearTimeout(settle);cancelAnimationFrame(frame);frame=0;
 const value=options[Math.max(0,Math.min(options.length-1,Math.round(wheel.scrollTop/rowHeight)))].dataset.value;
 dialog.close();target.button.setAttribute('aria-expanded','false');
 if(commit&&target.select.value!==value){target.select.value=value;target.select.dispatchEvent(new Event('change',{bubbles:true}));}
 target.sync();if(target.button.isConnected&&!target.button.disabled)target.button.focus({preventScroll:true});
}
function createWheel(){
 dialog=document.createElement('dialog');dialog.className='city-wheel-dialog';dialog.setAttribute('aria-labelledby','cityWheelTitle');
 dialog.innerHTML='<header><h2 id="cityWheelTitle">Choose a city</h2><button type="button" data-wheel-cancel aria-label="Cancel city selection">×</button></header><div class="city-wheel-window"><div class="city-wheel-band" aria-hidden="true"></div><div class="city-wheel" tabindex="0" role="listbox" aria-label="Cities"></div></div><footer><span>Scroll to explore</span><button type="button" data-wheel-choose>Choose</button></footer>';
 document.body.append(dialog);wheel=dialog.querySelector('.city-wheel');
 options=Object.values(CITIES).map((city,i)=>{
  const item=document.createElement('div');item.id=`cityWheelOption${i}`;item.role='option';item.dataset.value=city.id;item.className='city-wheel-option';
  const name=document.createElement('span'),country=document.createElement('small');name.textContent=city.name;country.textContent=city.country;item.append(name,country);wheel.append(item);
  item.addEventListener('click',()=>move(i));return item;
 });
 wheel.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(paint);clearTimeout(settle);settle=setTimeout(()=>{if(current)move(Math.round(wheel.scrollTop/rowHeight),false);},160);},{passive:true});
 wheel.addEventListener('keydown',e=>{
  const jumps={ArrowDown:1,ArrowUp:-1,PageDown:5,PageUp:-5};
  if(e.key in jumps){e.preventDefault();move(pending+jumps[e.key],false);}
  else if(e.key==='Home'||e.key==='End'){e.preventDefault();move(e.key==='Home'?0:options.length-1,false);}
  else if(e.key==='Enter'){e.preventDefault();close(true);}
  else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){const index=options.findIndex((o,i)=>i>pending&&o.textContent.toLowerCase().startsWith(e.key.toLowerCase()));const first=index<0?options.findIndex(o=>o.textContent.toLowerCase().startsWith(e.key.toLowerCase())):index;if(first>=0){e.preventDefault();move(first,false);}}
 });
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();}});
 dialog.querySelector('[data-wheel-cancel]').onclick=()=>close();dialog.querySelector('[data-wheel-choose]').onclick=()=>close(true);
 window.addEventListener('hashchange',()=>close());
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(current)move(Math.round(wheel.scrollTop/rowHeight),false);});
}
export function attachCityPicker(select){
 if(pickers.has(select))return pickers.get(select);
 const button=document.createElement('button');button.type='button';button.className='city-picker-trigger';button.id=select.id+'Trigger';button.dataset.cityPicker=select.id;
 button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
 select.after(button);select.hidden=true;
 const label=document.querySelector(`label[for="${select.id}"]`);if(label)label.htmlFor=button.id;
 const picker={select,button,sync(){button.textContent=CITIES[select.value]?.name||'Choose a city';button.disabled=select.disabled;button.setAttribute('aria-label',`Choose city, ${button.textContent}`);}};
 select.addEventListener('change',()=>picker.sync());new MutationObserver(()=>picker.sync()).observe(select,{attributes:true,attributeFilter:['disabled']});
 button.onclick=()=>{if(!dialog)createWheel();current=picker;button.setAttribute('aria-expanded','true');dialog.showModal();move(options.findIndex(o=>o.dataset.value===select.value),false);wheel.focus({preventScroll:true});};
 picker.sync();pickers.set(select,picker);return picker;
}
