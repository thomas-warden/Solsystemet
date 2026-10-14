// Shared celestial exposure. NASA/SVS map; orientation and exposure chosen for exploration.
export const SKY_URL = 'assets/research/sky/deep-star-map-4k.webp';
export const SKY_GLSL = `
uniform sampler2D skyMap;
uniform float skyReady;
vec3 skyRotateX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec3 skyRotateY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 skyRotateZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
float skyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 skyColor(vec3 direction){
 vec3 d=skyRotateY(skyRotateX(skyRotateZ(normalize(direction),-.6),-.28),-2.7);
 vec2 uv=vec2(.5+atan(d.z,d.x)/6.28318530718,.5+asin(clamp(d.y,-1.,1.))/3.14159265359);
 vec3 mapColor=texture2D(skyMap,uv).rgb;
 vec3 backdrop=pow(mapColor,vec3(.80))*.72;
 vec3 base=vec3(.008,.012,.019);
 // Sparse, static fallback while the local asset is loading or unavailable.
 vec2 grid=uv*vec2(900.,450.),cell=floor(grid);
 vec2 offset=vec2(skyHash(cell),skyHash(cell+19.3));
 float radius=length(fract(grid)-(.18+offset*.64));
 float point=(1.-smoothstep(.025,.10,radius))*step(.993,skyHash(cell+53.));
 vec3 fallback=base+point*vec3(.32,.36,.42);
 return mix(fallback,base+backdrop,skyReady);
}
`;
