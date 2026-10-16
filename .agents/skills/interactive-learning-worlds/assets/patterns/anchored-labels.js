// Names stay attached to the rendered bodies. Crowding changes visibility,
// never position: a moving label must not chase a second, eased trajectory.
const GAP=4,RETURN_GAP=12,RETURN_DELAY=.3,FADE_IN=.22,FADE_OUT=.18;

export class AnchoredLabels {
 constructor(container,onLayoutChange){
  this.container=container;this.onLayoutChange=onLayoutChange;this.entries=new Map();this.byElement=new WeakMap();this.bounds={available:false};
  this.observer=new ResizeObserver(records=>{
   let changed=false;
   for(const record of records){
    const entry=this.byElement.get(record.target),width=record.target.offsetWidth,height=record.target.offsetHeight;
    if(entry&&width&&height&&(width!==entry.width||height!==entry.height)){entry.width=width;entry.height=height;changed=true;}
   }
   if(changed)this.onLayoutChange();
  });
 }
 add(id,label,wire){
  const entry={id,label,wire,width:Math.max(44,label.offsetWidth),height:Math.max(44,label.offsetHeight),opacity:0,target:0,clearTime:0};
  this.entries.set(id,entry);this.byElement.set(label,entry);
  label.classList.add('anchored-label');wire.classList.add('anchored-wire');
  label.hidden=wire.hidden=false;label.style.left=label.style.top=wire.style.left=wire.style.top='0px';
  label.style.opacity=wire.style.opacity='0';label.style.visibility=wire.style.visibility='hidden';label.style.pointerEvents='none';label.tabIndex=-1;label.setAttribute('aria-hidden','true');
  this.observer.observe(label);
 }
 clear(){for(const entry of this.entries.values())this.observer.unobserve(entry.label);this.entries.clear();}
 destroy(){this.observer.disconnect();this.entries.clear();}
 // Let a keyboard user activate a moving link without racing its orbit.
 hasFocus(){return this.container.contains(document.activeElement)&&document.activeElement.matches('.anchored-label');}
 measure(canvas,toolbar,key){
  const top=Math.max(8,toolbar.height?toolbar.bottom-canvas.top+8:8),bottom=Math.min(canvas.height-8,key.height?key.top-canvas.top-8:canvas.height-8);
  const bounds={left:8,right:canvas.width-8,top,bottom,width:canvas.width,height:canvas.height,available:canvas.width>=60&&bottom-top>=44};
  if(Object.keys(bounds).some(key=>bounds[key]!==this.bounds[key])){this.bounds=bounds;this.onLayoutChange();}
 }
 update(items,dt,{selected,reducedMotion=false}={}){
  const bounds=this.bounds,placed=[];let pending=false;
  const candidates=items.map((item,index)=>{
   const entry=this.entries.get(item.id);if(!entry)return null;
   const x=item.x+item.radius+10,y=item.y-entry.height/2;
   const focused=document.activeElement===entry.label,held=focused||entry.label.matches(':hover');
   return {item,entry,index,x,y,width:entry.width,height:entry.height,held,
    priority:focused?0:held?1:item.id===selected?2:entry.target?3:4};
  }).filter(Boolean).sort((a,b)=>a.priority-b.priority||a.index-b.index);
  for(const candidate of candidates){
   const {item,entry,x,y,width,height,held}=candidate,{label,wire}=entry;
   // The body and its label use the very same projection, even on the first
   // frame after a hidden label returns or the camera changes direction.
   label.style.transform=`translate3d(${x}px,${y}px,0)`;
   wire.style.transform=`translate3d(${item.x+item.radius+2}px,${item.y}px,0)`;wire.style.width='8px';
   const edge=Math.min(x-bounds.left,bounds.right-x-width,y-bounds.top,bounds.bottom-y-height);
   const inside=bounds.available&&edge>=0;
   const gap=entry.target?GAP:RETURN_GAP;
   const crowded=placed.some(other=>x<other.x+other.width+gap&&x+width+gap>other.x&&y<other.y+other.height+gap&&y+height+gap>other.y);
   if(!inside||!item.visible||crowded){entry.target=0;entry.clearTime=0;}
   else{
    entry.clearTime+=dt;
    if(entry.target||held||reducedMotion||entry.clearTime>=RETURN_DELAY)entry.target=1;
    else pending=true;
    placed.push(candidate);
   }
   // Fade before reaching an edge. Never pin a name against a toolbar while
   // its planet keeps moving elsewhere, or leave an invisible click target.
   const target=entry.target*Math.min(1,Math.max(0,edge)/12);
   if(!inside||reducedMotion)entry.opacity=inside?target:0;
   else if(entry.opacity<target)entry.opacity=Math.min(target,entry.opacity+dt/FADE_IN);
   else if(entry.opacity>target)entry.opacity=Math.max(target,entry.opacity-dt/FADE_OUT);
   if(Math.abs(entry.opacity-target)>.001)pending=true;
   const visible=entry.opacity>.001,interactive=visible&&entry.target===1;
   if(document.activeElement===label&&!interactive)this.container.parentElement.querySelector('canvas')?.focus({preventScroll:true});
   label.hidden=wire.hidden=!visible;
   label.style.opacity=wire.style.opacity=entry.opacity.toFixed(4);
   label.style.visibility=wire.style.visibility=visible?'visible':'hidden';
   label.style.pointerEvents=interactive?'auto':'none';label.tabIndex=interactive?0:-1;
   if(interactive)label.removeAttribute('aria-hidden');else label.setAttribute('aria-hidden','true');
  }
  return pending;
 }
}
