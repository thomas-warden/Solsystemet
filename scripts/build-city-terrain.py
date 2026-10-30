"""Build the two attributed, resampled elevation grids (requires Pillow)."""
import urllib.request,math,concurrent.futures,json,io
from PIL import Image
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'assets'/'city-activities'
for name,lat,lon,z in [('cape-town',-33.965,18.415,13),('wellington',-41.25,174.45,10)]:
 n=2**z;cx=int((lon+180)/360*n);cy=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n)
 tiles=[(x,y) for y in range(cy-1,cy+2) for x in range(cx-1,cx+2)]
 def tile(t):
  x,y=t;u=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';return x,y,Image.open(io.BytesIO(urllib.request.urlopen(u,timeout=30).read())).convert('RGB')
 canvas=Image.new('RGB',(768,768))
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for x,y,im in pool.map(tile,tiles):canvas.paste(im,((x-cx+1)*256,(y-cy+1)*256))
 vals=[]
 # Decode before resampling so RGB channel carries do not create altitude spikes.
 floats=Image.new('F',(768,768));floats.putdata([r*256+g+b/256-32768 for r,g,b in canvas.getdata()]);floats=floats.resize((193,193),Image.Resampling.BILINEAR)
 vals=[round(v) for v in floats.getdata()]
 data={'width':193,'height':193,'elevations':vals,'lat':lat,'lon':lon,'zoom':z,'tileOrigin':[cx-1,cy-1],'verticalExaggeration':True,'source':'Mapzen terrain tiles, via AWS Open Data','tileURLs':[f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png' for x,y in tiles]}
 (out/(name+'.json')).write_text(json.dumps(data,separators=(',',':')))
 print(name,min(vals),max(vals))
u='https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md'
s=urllib.request.urlopen(u,timeout=30).read().decode();(out/'TERRAIN_ATTRIBUTION.md').write_text(s);print(s[:2000])
