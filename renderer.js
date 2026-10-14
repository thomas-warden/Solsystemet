import { WORLDS } from './worlds.js';
// Solsystemet: analytic ellipsoids, a separately lit cloud shell and a depth-sorted ring plane.
// Textures remain photographic maps; motion is an illustrative reconstruction.
const vertex = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float world, spin, time, cameraAngle, cloudsOn, lightsOn, storm, compareEarth, particles, speed, lightPhase, axisTilt;
uniform sampler2D surfaceMap, cloudMap, nightMap, ringMap, earthMap;
const float PI=3.141592653589793;
vec3 linearize(vec3 c){return pow(max(c,vec3(0.)),vec3(2.2));}
vec3 rotateX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec3 rotateZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
vec2 hitEllipsoid(vec3 ro,vec3 rd,vec3 shape){vec3 o=ro/shape,d=rd/shape;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.;float det=b*b-a*c;if(det<0.)return vec2(-1.);float k=sqrt(det);return vec2((-b-k)/a,(-b+k)/a);}
vec2 uvAt(vec3 n,float rotation){return vec2(fract(.5+atan(n.x,n.z)/(2.*PI)+rotation/(2.*PI)),.5+asin(clamp(n.y,-1.,1.))/PI);}
vec4 ringAt(float r){if(r<1.235||r>2.27)return vec4(0.);return texture(ringMap,vec2((r-1.235)/1.035,.5));}
float cloudAt(vec3 n,float rotation){vec2 st=uvAt(normalize(n),rotation+time*.00065);return smoothstep(.075,.94,texture(cloudMap,st).r)*cloudsOn;}
float ringShadow(vec3 p,vec3 light){float t=-p.y/light.y;if(t<=0.)return 1.;vec3 q=p+light*t;return 1.-ringAt(length(q.xz)).a*.9;}
float globeShadow(vec3 p,vec3 light,vec3 shape){vec3 o=p/shape,d=normalize(light/shape);float b=dot(o,d);if(b>0.)return 1.;float d2=dot(o,o)-b*b;return smoothstep(.97,1.025,sqrt(max(0.,d2)));}
vec3 renderSurface(vec3 p,vec3 normal,vec3 rd,vec3 light){
 float nl=dot(normal,light),nv=max(dot(normal,-rd),0.);
 vec2 st=uvAt(normalize(p),spin);
 if(world==2.)st=uvAt(normal,spin); // Saturn's map is planetographic.
 if(world==1.){float lat=st.y;st.x=fract(st.x+sin(time*.018*speed)*.0025*sin(lat*39.)+sin(time*.012*speed)*.0012*sin(lat*88.));}
 vec3 tex=texture(surfaceMap,st).rgb;
 if(world==4.)tex=mix(vec3(.89,.87,.80),tex,.15); // Visible Venus has near-featureless ivory cloud tops.
 if(world==5.)tex=mix(tex,vec3(dot(tex,vec3(.2126,.7152,.0722))),.16);
 if(world==10.)tex=mix(vec3(dot(tex,vec3(.2126,.7152,.0722))),tex,.25);
 vec3 base=linearize(tex),result;
 if(world==0.){
  float water=(1.-smoothstep(.01,.09,tex.r))*smoothstep(.0,.02,tex.b-tex.r);
  base=mix(base,linearize(vec3(.025,.075,.15)),water*.85);
  float clShadow=cloudAt(normalize(p+light*.008),spin);
  float diffuse=max(nl,0.);
  result=base*(.006+diffuse*1.25*(1.-clShadow*.48));
  float ocean=(1.-smoothstep(.02,.13,tex.r))*smoothstep(.012,.08,tex.b-tex.r);
  vec3 halfVector=normalize(light-rd);
  float spec=pow(max(dot(normal,halfVector),0.),110.);
  float fres=.025+.975*pow(1.-max(dot(-rd,halfVector),0.),5.);
  result+=vec3(1.,.92,.79)*spec*fres*ocean*diffuse*.65*(1.-clShadow);
  vec3 city=texture(nightMap,st).rgb;
  result+=linearize(city)*vec3(1.,.70,.40)*1.5*(1.-smoothstep(-.16,.07,nl))*lightsOn*(1.-clShadow*.75);
  float haze=pow(1.-nv,4.)*.35*smoothstep(-.12,.5,nl);
  result=mix(result,vec3(.09,.27,.52)*(.4+.6*diffuse),haze);
 }else{
  // Atmospheric scattering softens the limb, without lifting the unlit hemisphere.
  float diffuse=pow(max(nl,0.),.78);
  float limb=.6+.4*pow(nv,.35);
  result=base*(.006+diffuse*1.24)*limb;
  if(world==2.)result*=ringShadow(p,light);
  if(world==3.||world==5.||world==8.||world==10.)result=base*(.006+max(nl,0.)*1.24);
 }
 if(world==6.){
  // A deliberately drawn meridian and equator reveal spin without inventing weather.
  float lon=atan(p.x,p.z)+spin;
  float meridian=1.-smoothstep(.004,.011,abs(sin(lon)));
  float equator=1.-smoothstep(.003,.009,abs(normalize(p).y));
  result=mix(result,vec3(.55,.43,.24),max(meridian*.38,equator*.18));
  vec3 marker=vec3(sin(-spin),0.,cos(-spin));
  float dotGuide=1.-smoothstep(.021,.035,length(normalize(p)-marker));
  float halo=1.-smoothstep(.040,.060,length(normalize(p)-marker));
  result=mix(result,vec3(.014,.02,.025),halo);
  result=mix(result,vec3(1.7,1.3,.55),dotGuide);
 }
 return result;
}
void main(){
 float aspect=resolution.x/resolution.y;
 float halfHeight=world==2.?max(max(1.44,2.565*sqrt(pow(sin(.26),2.)+pow(sin(radians(cameraAngle))*cos(.26),2.))),2.48/aspect):1.13;
 halfHeight=mix(halfHeight,.64,storm*step(.5,world)*step(world,1.5));
 vec2 xy=(gl_FragCoord.xy/resolution-.5)*vec2(aspect,1.)*2.*halfHeight;
 if(world==1.)xy+=vec2(0.,-.39)*storm;
 float angle=(world==2.||world>=8.)?radians(cameraAngle):world==0.?.15:.04;
 float roll=world==2.?-.26:world==0.?-.12:world==6.?-radians(axisTilt):.035;
 vec3 ro=vec3(xy,6.0),rd=vec3(0.,0.,-1.);
 // Rotate the entire physical scene, including surface, rings, lighting and shadows.
 ro=rotateX(rotateZ(ro,-roll),-angle);rd=rotateX(rotateZ(rd,-roll),-angle);
 vec3 light=world==2.?normalize(vec3(-1.5,.9,1.1)):normalize(vec3(-1.8,.55,1.3));
 if(world>2.)light=normalize(vec3(-sin(lightPhase)*2.2,.4,cos(lightPhase)*2.2));
 if(world==6.||world>=8.)light=rotateX(rotateZ(light,-roll),-angle);
 vec3 shape=vec3(1.,world==2.?.902:world==1.?.935:world==6.?.977:1.,1.);
 vec2 ht=hitEllipsoid(ro,rd,shape);float t=ht.x;
 vec3 result=linearize(vec3(3.,5.,7.)/255.)/1.18;
 if(t>0.){
  vec3 p=ro+rd*t,n=normalize(p/(shape*shape));
  result=renderSurface(p,n,rd,light);
 }
 if(world==0.){
  // Clouds sit above the globe. Their brightness comes from direct sunlight,
  // opacity from the cloud map, with a small self-shadow along texture gradients.
  vec2 hc=hitEllipsoid(ro,rd,vec3(1.004));
  if(hc.x>0.){
   vec3 p=ro+rd*hc.x,n=normalize(p);float coverage=cloudAt(n,spin);
   float nl=dot(n,light),nv=max(dot(n,-rd),0.);
   float relief=cloudAt(normalize(n+light*.0015),spin)-coverage;
   vec3 c=vec3(.95,.97,1.)*(.006+max(nl,0.)*1.24)*(.86+.14*nv);
   c*=clamp(1.-relief*.65,.65,1.12);
   c*=mix(vec3(1.,.72,.42),vec3(1.),smoothstep(0.,.15,nl));
   result=mix(result,c,coverage*.97);
  }
  // A very thin blue limb, strongest in sunlight, never a full-globe white veil.
  float radial=length(xy);
  float rim=exp(-abs(radial-1.002)*185.)*.20;
  vec3 edge=rotateX(rotateZ(normalize(vec3(xy,.06)),-roll),-angle);
  float sun=smoothstep(-.18,.65,dot(edge,light));
  result+=vec3(.035,.15,.42)*rim*sun;
 }
 if(world==2.){
  float denom=rd.y;
  if(abs(denom)>.000001){
   float tr=-ro.y/denom;vec3 p=ro+rd*tr;float r=length(p.xz);
   if(tr>0.&&(t<0.||tr<t)&&r>1.235&&r<2.27){
    vec4 ring=ringAt(r);float shadow=globeShadow(p,light,shape);
    float opacity=1.-pow(max(.001,1.-ring.a),1./max(abs(denom),.2));
    opacity*=smoothstep(1.235,1.235+fwidth(r)*1.5,r)*(1.-smoothstep(2.27-fwidth(r)*2.,2.27,r));
    float sunSide=sign(ro.y)==sign(light.y)?1.:.38;
    float illumination=.08+1.12*pow(abs(light.y),.32)*sunSide*shadow;
    vec3 rc=linearize(ring.rgb)*illumination;
    if(particles>.5){
     float pa=atan(p.z,p.x),a1=time*.24,a2=time*.24*pow(1.5/2.10,1.5)+PI;
     float d1=length(p.xz-1.5*vec2(cos(a1),sin(a1)));
     float d2=length(p.xz-2.10*vec2(cos(a2),sin(a2)));
     float dot1=1.-smoothstep(.009,.025,d1),dot2=1.-smoothstep(.009,.025,d2);
     rc+=vec3(.36,.7,1.)*dot1*3.+vec3(1.,.55,.13)*dot2*3.;
     opacity=max(opacity,max(dot1,dot2));
    }
    result=mix(result,rc,opacity);
   }
  }
 }
 if(world==1.&&compareEarth>.5){
  float lat=-.127*PI,lon=.354*2.*PI-spin;
  vec3 centre=vec3(cos(lat)*sin(lon),.935*sin(lat),cos(lat)*cos(lon));
  centre=rotateZ(rotateX(centre,.04),.035);
  float distance=length(xy-centre.xy),r=.0892,pixel=2.*halfHeight/resolution.y;
  float outline=1.-smoothstep(pixel*1.1,pixel*2.3,abs(distance-r));
  float underlay=1.-smoothstep(pixel*2.5,pixel*4.,abs(distance-r));
  result=mix(result,vec3(.002),underlay*.78);
  result=mix(result,vec3(1.5,1.35,1.07),outline);
 }
 // Explicit linear-light rendering and display transfer; no sharpening/noise layers on maps.
 result=1.-exp(-max(result,vec3(0.))*1.18);
 result=pow(result,vec3(1./2.2));
 float dither=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 color=vec4(result+dither/255.,1.);
}`;

export class PlanetRenderer {
 constructor(canvas,onReady,onError){
  this.canvas=canvas;this.onReady=onReady;this.onError=onError;this.current='';this.quality=1;this.ready=false;this.maps={};this.loading=new Map();
  this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  if(!this.gl)throw Error('WebGL2 unavailable');
  const gl=this.gl;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);let position=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  this.locations={};for(const name of ['resolution','world','spin','time','cameraAngle','cloudsOn','lightsOn','storm','compareEarth','particles','speed','lightPhase','axisTilt','surfaceMap','cloudMap','nightMap','ringMap','earthMap'])this.locations[name]=gl.getUniformLocation(this.program,name);
  this.placeholder=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.placeholder);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  this.anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
  this.highDetail=gl.getParameter(gl.MAX_TEXTURE_SIZE)>=8192&&innerWidth>700;
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;onError('Graphics connection interrupted. Reload to restore the scene.');});
 }
 async load(name,url){
  if(this.maps[name])return this.maps[name];if(this.loading.has(name))return this.loading.get(name);
  const promise=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const gl=this.gl,t=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,name==='ring'?gl.CLAMP_TO_EDGE:gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);if(this.anisotropy)gl.texParameterf(gl.TEXTURE_2D,this.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(this.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));this.maps[name]=t;resolve(t);};im.onerror=()=>reject(Error('Could not load '+url));im.src=url;});this.loading.set(name,promise);return promise;
 }
 async setWorld(world){
  this.current=world;this.ready=false;
  const suffix=this.highDetail?'8k':'4k';
  try{
   const jobs=[this.load(world,'assets/research/'+(world==='jupiter'?'jupiter-cassini-juno-'+suffix+'.jpg':WORLDS[world].map))];
   if(world==='earth')jobs.push(this.load('cloud','assets/research/earth-clouds-'+suffix+'.jpg'),this.load('night','assets/research/earth-night-4k.jpg'));
   if(world==='titan')jobs.push(this.load('titan-surface','assets/research/moons/titan-surface.jpg'));
   if(world==='saturn')jobs.push(this.load('ring','assets/research/saturn-rings-radial-8k.png'));
   await Promise.all(jobs);
   if(this.current===world){this.ready=true;this.onReady();}
  }catch(e){if(this.current===world)this.onError(e.message);}
 }
 resize(){const box=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,this.quality===1?2:1);this.canvas.width=Math.max(1,Math.round(box.width*dpr));this.canvas.height=Math.max(1,Math.round(box.height*dpr));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 render(s){
  if(!this.ready)return;
  const gl=this.gl;gl.useProgram(this.program);
  for(const [i,key,name] of [[0,'surfaceMap',s.world==='titan'&&s.titanSurface?'titan-surface':s.world],[1,'cloudMap','cloud'],[2,'nightMap','night'],[3,'ringMap','ring'],[4,'earthMap','earth']]){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.maps[name]||this.placeholder);gl.uniform1i(this.locations[key],i);}
  gl.uniform2f(this.locations.resolution,this.canvas.width,this.canvas.height);
  const values={world:s.world==='titan'&&!s.titanSurface?9:(WORLDS[s.world].parent==='saturn'&&s.world!=='titan'?10:WORLDS[s.world].parent?8:['earth','jupiter','saturn','mercury','venus','mars','uranus','neptune'].indexOf(s.world)),spin:s.spin,time:s.time,cameraAngle:s.angle,cloudsOn:+s.clouds,lightsOn:+s.lights,storm:s.zoom,compareEarth:+s.compare,particles:+s.particles,speed:s.speed,lightPhase:s.lightPhase,axisTilt:s.axisTilt};
  for(const [k,v] of Object.entries(values))gl.uniform1f(this.locations[k],v);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
}
