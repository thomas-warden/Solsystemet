import { CITIES } from './cities.js?v=ee3f09657be8';
import { GOOGLE_MAPS_BROWSER_KEY } from './site-config.js?v=ee3f09657be8';

const WEATHER_INTERVAL = 10 * 60 * 1000;
const WEATHER_STALE = 90 * 60 * 1000;
const weatherCache = new Map();
let mapsPromise = null, mapsAttempt = 0, mapsRejected = false;
const authEvent = 'solsystemet-map-auth-failed';

function satelliteLink(city) {
  const url = new URL('https://www.google.com/maps/@');
  url.search = new URLSearchParams({ api:'1', map_action:'map', center:`${city.lat},${city.lon}`, zoom:'15', basemap:'satellite' });
  return url.href;
}

function loadMaps({retry=false}={}) {
  if (!GOOGLE_MAPS_BROWSER_KEY) return Promise.reject(new Error('Map configuration unavailable'));
  if (window.google?.maps?.Map && !mapsRejected) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  if (mapsRejected && !retry) return Promise.reject(new Error('Map service unavailable'));
  mapsRejected = false;
  const attempt = ++mapsAttempt;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = `__solsystemetCityMapReady${attempt}`;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      // A script that arrives after its timeout must not call a deleted callback.
      window[callback] = () => {};
      if (error) { mapsRejected = true; mapsPromise = null; script.remove(); reject(new Error('Map service unavailable')); }
      else resolve(window.google.maps);
    };
    window[callback] = () => finish(window.google?.maps?.Map ? null : new Error('Map service unavailable'));
    const timer = setTimeout(() => finish(new Error('Map service timed out')), 15000);
    script.async = true;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.dataset.cityMaps = String(attempt);
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.search = new URLSearchParams({ key:GOOGLE_MAPS_BROWSER_KEY, callback, v:'quarterly', loading:'async' });
    script.src = url.href;
    script.onerror = () => finish(new Error('Map service unavailable'));
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      mapsRejected = true; mapsPromise = null;
      finish(new Error('Map service unavailable'));
      document.dispatchEvent(new Event(authEvent));
      if (typeof previousAuthFailure === 'function' && !previousAuthFailure.cityExplorerHandler) previousAuthFailure();
    };
    window.gm_authFailure.cityExplorerHandler = true;
    document.head.append(script);
  });
  return mapsPromise;
}

function conditions(code, day) {
  if (code===0) return [day?'Clear sky':'Clear night',day?'sun':'moon'];
  if (code===1) return ['Mainly clear',day?'sun':'moon'];
  if (code===2) return ['Partly cloudy',day?'partly':'partly-night'];
  if (code===3) return ['Overcast','cloud'];
  if ([45,48].includes(code)) return ['Fog','fog'];
  if ([51,53,55].includes(code)) return ['Drizzle','rain'];
  if ([56,57].includes(code)) return ['Freezing drizzle','rain'];
  if ([61,63,65].includes(code)) return [code===65?'Heavy rain':'Rain','rain'];
  if ([66,67].includes(code)) return ['Freezing rain','rain'];
  if ([71,73,75,77].includes(code)) return ['Snow','snow'];
  if ([80,81,82].includes(code)) return ['Rain showers','rain'];
  if ([85,86].includes(code)) return ['Snow showers','snow'];
  if ([95,96,99].includes(code)) return ['Thunderstorms','storm'];
  return ['Conditions unavailable','cloud'];
}

function weatherIcon(kind) {
  const sun='<circle cx="30" cy="29" r="12" fill="#e7c781" stroke="none"/><path d="M30 7V2m0 54v-5M8 29H3m54 0h-5M14 13l-4-4m40 40-4-4M14 45l-4 4m40-40-4 4" stroke="#c8aa76"/>';
  const moon='<path d="M42 6c-7 18-1 33 17 36C34 58 8 32 22 10c5-7 12-8 20-4Z" fill="#ded8ba" stroke="#ebe6d1"/>';
  const cloud='<path d="M17 45C2 45 3 26 17 26c2-18 29-17 32 1 17-2 20 20 4 20H17" fill="#889fa9" stroke="#c6d4d8"/>';
  let body=cloud;
  if(kind==='sun')body=sun;
  if(kind==='moon')body=moon;
  if(kind==='partly')body=`<g transform="translate(9 -5) scale(.8)">${sun}</g>${cloud}`;
  if(kind==='partly-night')body=`<g transform="translate(3 -4) scale(.8)">${moon}</g>${cloud}`;
  if(kind==='rain')body=cloud+'<path d="m20 53-3 7m19-7-3 7m19-7-3 7" stroke="#8ebdd2"/>';
  if(kind==='snow')body=cloud+'<path d="M21 53v9m-4-4h8m15-5v9m-4-4h8m15-5v9m-4-4h8" stroke="#c4dce8"/>';
  if(kind==='fog')body=cloud+'<path d="M9 53h48M17 60h34" stroke="#afbec6"/>';
  if(kind==='storm')body=cloud+'<path d="m36 46-9 12h9l-6 11 19-18H38l4-5" fill="#e7c781" stroke="none"/>';
  return `<svg viewBox="0 0 72 72" aria-hidden="true" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function number(value, suffix, decimals=0) { return Number.isFinite(value) ? value.toFixed(decimals)+suffix : '—'; }
function bearing(value) { return Number.isFinite(value)?['N','NE','E','SE','S','SW','W','NW'][Math.round(value/45)%8]:''; }
function formatTime(epoch, city, date=false) {
  return new Intl.DateTimeFormat('en-GB',{timeZone:city.timeZone,hour:'2-digit',minute:'2-digit',...(date?{day:'numeric',month:'short'}:{})}).format(new Date(epoch));
}

export class CityExplorer {
  constructor(host,{onClose=()=>{},onSelect=()=>{}}={}) {
    if(!host)throw new TypeError('CityExplorer needs a host');
    this.host=host;this.scene=host.closest('#scene');this.onClose=onClose;this.onSelect=onSelect;
    this.active=false;this.disposed=false;this.request=0;this.weatherRequest=0;this.mapGeneration=0;
    this.map=null;this.mapCity=null;this.mapListener=null;this.weatherController=null;this.city=null;this.lastWeather=null;
    this.listeners=[];this.clockTimer=0;this.refreshTimer=0;this.mapTimer=0;
    host.innerHTML=`<header class="city-explorer-header"><button type="button" class="city-return" data-city-close>← Earth</button><div class="city-choice"><label for="cityExplorerSelect">EXPLORE A CITY</label><select id="cityExplorerSelect" data-city-select></select></div><div class="city-now"><span data-city-now>—</span><small>LOCAL TIME NOW</small></div></header>
      <div class="city-map-region"><div class="city-map" data-city-map aria-label="Google satellite map"></div><div class="city-map-message" data-city-map-message role="status"><span class="eyebrow">A CLOSER LOOK</span><h2 data-city-map-title>Finding the city…</h2><p data-city-map-copy></p><div class="city-map-actions"><button type="button" data-city-map-retry hidden>Try satellite view again ↻</button><a data-city-external target="_blank" rel="noopener">Open Google satellite map ↗</a></div></div><button type="button" class="city-map-reset" data-city-map-reset hidden>Back to city centre ⌖</button></div>
      <section class="city-weather" aria-label="Current weather"><div class="city-weather-top"><div><span class="eyebrow">WEATHER NOW</span><p class="city-weather-location" data-city-country></p></div><button type="button" class="city-weather-refresh" data-city-weather-refresh aria-label="Refresh current weather">Refresh ↻</button></div><div class="city-weather-report" data-city-weather-report><div class="city-weather-main"><div class="city-weather-icon" data-city-weather-icon></div><div><strong data-city-temperature>—</strong><span data-city-condition>Fetching current weather…</span></div></div><dl class="city-weather-details"><div><dt>Feels like</dt><dd data-city-feels>—</dd></div><div><dt>Wind</dt><dd data-city-wind>—</dd></div><div><dt>Humidity</dt><dd data-city-humidity>—</dd></div></dl></div><p class="city-weather-status" data-city-weather-status role="status">Connecting to the weather service…</p><div class="city-weather-foot"><span data-city-weather-updated>Waiting for an update</span><span>Modelled current conditions · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo ↗</a></span></div></section>
      <footer class="city-explorer-note">Satellite imagery is not live. Weather uses the actual local time, separate from Earth’s model clock. <a href="sources.html#city-services" target="_blank" rel="noopener">Services &amp; privacy ↗</a></footer>`;
    this.nodes=Object.fromEntries(['close','select','now','map','map-message','map-title','map-copy','map-retry','external','map-reset','country','weather-refresh','weather-report','weather-icon','temperature','condition','feels','wind','humidity','weather-status','weather-updated'].map(key=>[key,host.querySelector(`[data-city-${key}]`)]));
    for(const city of Object.values(CITIES)){const option=document.createElement('option');option.value=city.id;option.textContent=city.name;this.nodes.select.append(option);}
    this.listen(this.nodes.close,'click',()=>this.close({notify:true}));
    this.listen(this.nodes.select,'change',()=>{const city=CITIES[this.nodes.select.value];this.onSelect(city);this.open(city,{focus:false});});
    this.listen(this.nodes['map-retry'],'click',()=>this.showMap(true));
    this.listen(this.nodes['map-reset'],'click',()=>{if(this.map&&this.city){this.map.setCenter({lat:this.city.lat,lng:this.city.lon});this.map.setZoom(14);}});
    this.listen(this.nodes['weather-refresh'],'click',()=>this.loadWeather(true));
    this.listen(document,'keydown',event=>{if(this.active&&event.key==='Escape'){event.preventDefault();this.close({notify:true});}});
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.clearTimers();else if(this.active){this.updateClock();this.loadWeather();this.schedule();}});
    this.listen(document,authEvent,()=>{if(this.active){this.clearMap();this.mapUnavailable();}});
    this.nodes['weather-icon'].innerHTML=weatherIcon('cloud');
  }
  listen(target,type,handler){target.addEventListener(type,handler);this.listeners.push([target,type,handler]);}
  open(city,{focus=true}={}) {
    if(this.disposed||!city||!CITIES[city.id])return;
    this.request++;this.active=true;this.city=CITIES[city.id];this.host.hidden=false;
    if(this.scene)this.scene.dataset.cityOpen='true';
    this.host.dataset.city=this.city.id;this.nodes.select.value=this.city.id;
    this.nodes.country.textContent=`${this.city.name} · ${this.city.country}`;
    this.nodes.external.href=satelliteLink(this.city);
    this.nodes.map.setAttribute('aria-label',`Google satellite map of ${this.city.name}, ${this.city.country}`);
    this.updateClock();this.showMap();this.loadWeather();this.schedule();
    if(focus)this.nodes.close.focus({preventScroll:true});
  }
  mapUnavailable() {
    this.host.dataset.mapState='unavailable';this.nodes['map-message'].hidden=false;this.nodes['map-reset'].hidden=true;
    this.nodes['map-title'].textContent='Satellite view isn’t available yet.';
    this.nodes['map-copy'].textContent='You can still explore this city in Google Maps and see its latest weather below.';
    this.nodes['map-retry'].hidden=!GOOGLE_MAPS_BROWSER_KEY;
    this.nodes['map-retry'].disabled=false;
  }
  clearMapWait(){clearTimeout(this.mapTimer);this.mapTimer=0;this.mapListener?.remove?.();this.mapListener=null;}
  clearMap(){this.clearMapWait();if(this.map)window.google?.maps?.event?.clearInstanceListeners(this.map);this.map=null;this.mapCity=null;this.nodes.map.replaceChildren();}
  async showMap(retry=false) {
    if(!this.active||this.disposed)return;
    const request=this.request,generation=++this.mapGeneration,city=this.city;
    this.clearMapWait();
    if(!GOOGLE_MAPS_BROWSER_KEY){this.mapUnavailable();return;}
    this.host.dataset.mapState='loading';this.nodes['map-message'].hidden=false;this.nodes['map-reset'].hidden=true;
    this.nodes['map-title'].textContent=`Above ${city.name}.`;
    this.nodes['map-copy'].textContent='Loading Google satellite imagery…';this.nodes['map-retry'].hidden=true;
    try {
      const maps=await loadMaps({retry});
      if(!this.active||this.disposed||request!==this.request||generation!==this.mapGeneration)return;
      if(retry&&this.map)this.clearMap();
      const reusable=this.map&&this.mapCity===city.id;
      if(!this.map)this.map=new maps.Map(this.nodes.map,{center:{lat:city.lat,lng:city.lon},zoom:14,minZoom:3,mapTypeId:'satellite',gestureHandling:'cooperative',streetViewControl:false,fullscreenControl:false,mapTypeControl:false,rotateControl:false,scaleControl:true,zoomControl:true,keyboardShortcuts:true,clickableIcons:false});
      else{maps.event?.trigger(this.map,'resize');this.map.setCenter({lat:city.lat,lng:city.lon});this.map.setZoom(14);}
      const ready=()=>{
        if(!this.active||this.disposed||request!==this.request||generation!==this.mapGeneration)return;
        this.clearMapWait();this.mapCity=city.id;this.host.dataset.mapState='ready';this.nodes['map-message'].hidden=true;this.nodes['map-reset'].hidden=false;
      };
      if(reusable){ready();return;}
      this.mapListener=maps.event.addListenerOnce(this.map,'tilesloaded',ready);
      this.mapTimer=setTimeout(()=>{if(this.active&&request===this.request&&generation===this.mapGeneration){this.clearMapWait();this.mapUnavailable();}},15000);
    } catch {if(this.active&&request===this.request&&generation===this.mapGeneration)this.mapUnavailable();}
  }
  async loadWeather(force=false) {
    if(!this.active||this.disposed||document.hidden)return;
    this.weatherController?.abort();this.weatherController=null;
    const city=this.city,request=++this.weatherRequest,cache=weatherCache.get(city.id);
    this.lastWeather=cache?.data||null;
    if(cache){this.renderWeather(cache.data);if(!force&&Date.now()-cache.fetchedAt<WEATHER_INTERVAL)return;}
    else {
      this.nodes.temperature.textContent='—';this.nodes.condition.textContent='Fetching current weather…';
      for(const key of ['feels','wind','humidity'])this.nodes[key].textContent='—';
      this.nodes['weather-icon'].innerHTML=weatherIcon('cloud');this.nodes['weather-updated'].textContent='Waiting for an update';
    }
    this.host.dataset.weatherState=cache?'refreshing':'loading';this.nodes['weather-refresh'].disabled=true;
    this.nodes['weather-status'].textContent=cache?'Refreshing current weather…':'Connecting to the weather service…';
    const controller=new AbortController();this.weatherController=controller;
    const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const url=new URL('https://api.open-meteo.com/v1/forecast');
      url.search=new URLSearchParams({latitude:String(city.lat),longitude:String(city.lon),current:'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation,wind_speed_10m,wind_direction_10m',timezone:city.timeZone,timeformat:'unixtime',forecast_days:'1',temperature_unit:'celsius',wind_speed_unit:'kmh'});
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Weather unavailable');
      const body=await response.json(),current=body.current;
      if(!current||![current.time,current.temperature_2m,current.weather_code].every(Number.isFinite)||current.time<=0||!Number.isFinite(new Date(current.time*1000).getTime()))throw new Error('Weather unavailable');
      if(!this.active||this.disposed||request!==this.weatherRequest||city.id!==this.city.id)return;
      weatherCache.set(city.id,{data:current,fetchedAt:Date.now()});this.lastWeather=current;this.renderWeather(current);
    } catch {
      if(!this.active||this.disposed||request!==this.weatherRequest||city.id!==this.city.id)return;
      this.host.dataset.weatherState=cache?'stale':'error';
      this.nodes['weather-status'].textContent=cache?'Showing the last available update. Refresh to try again.':'Current weather is unavailable. Try Refresh in a moment.';
      if(!cache)this.nodes.condition.textContent='Weather unavailable';
    } finally {
      clearTimeout(timer);
      if(request===this.weatherRequest){this.weatherController=null;this.nodes['weather-refresh'].disabled=false;}
    }
  }
  renderWeather(current) {
    const stale=Date.now()-current.time*1000>WEATHER_STALE;
    const [description,icon]=conditions(current.weather_code,Boolean(current.is_day));
    this.host.dataset.weatherState=stale?'stale':'ready';
    this.nodes.temperature.textContent=number(current.temperature_2m,'°');this.nodes.condition.textContent=description;
    this.nodes['weather-icon'].innerHTML=weatherIcon(icon);
    this.nodes.feels.textContent=number(current.apparent_temperature,'°C');
    this.nodes.wind.textContent=number(current.wind_speed_10m,' km/h')+(Number.isFinite(current.wind_speed_10m)?' '+bearing(current.wind_direction_10m):'');
    this.nodes.humidity.textContent=number(current.relative_humidity_2m,'%');
    this.nodes['weather-updated'].textContent=`Updated ${formatTime(current.time*1000,this.city,true)} local`;
    this.nodes['weather-status'].textContent=stale?'Latest available update; current conditions may have changed.':'';
    this.nodes['weather-refresh'].disabled=false;
  }
  updateClock(){if(this.active&&this.city)this.nodes.now.textContent=formatTime(Date.now(),this.city);}
  clearTimers(){clearTimeout(this.clockTimer);clearTimeout(this.refreshTimer);this.clockTimer=this.refreshTimer=0;}
  schedule(){
    this.clearTimers();if(!this.active||this.disposed||document.hidden)return;
    const clock=()=>{this.clockTimer=setTimeout(()=>{if(this.active&&!document.hidden){this.updateClock();clock();}},60000);};clock();
    const cached=weatherCache.get(this.city.id),remaining=cached?Math.max(60000,WEATHER_INTERVAL-(Date.now()-cached.fetchedAt)):WEATHER_INTERVAL;
    this.refreshTimer=setTimeout(async()=>{await this.loadWeather(true);this.schedule();},remaining);
  }
  close({notify=false}={}) {
    if(!this.active)return;
    this.active=false;this.request++;this.weatherRequest++;this.mapGeneration++;
    this.weatherController?.abort();this.weatherController=null;this.clearTimers();this.clearMapWait();
    this.host.hidden=true;if(this.scene)delete this.scene.dataset.cityOpen;
    if(notify)this.onClose();
  }
  dispose(){
    if(this.disposed)return;this.close();this.clearMap();this.clearTimers();
    for(const [target,type,handler]of this.listeners)target.removeEventListener(type,handler);
    this.listeners=[];this.host.replaceChildren();this.disposed=true;
  }
}
