const $ = id => document.getElementById(id);
const controls = ['lightControl', 'motion', 'clouds', 'reset', 'zoomIn', 'zoomOut'];
let earth = null;
let attempt = 0;
let request = 0;
let ready = false;

function motionState(state) {
  $('motion').setAttribute('aria-pressed', String(state.playing));
  $('motionText').textContent = state.playing ? 'Pause Earth’s turn' : 'Start Earth’s turn';
}

function enableControls(value) {
  for (const id of controls) $(id).disabled = !value;
}

function failure() {
  ready = false;
  earth?.dispose(); earth = null;
  enableControls(false);
  $('earthStage').setAttribute('aria-busy', 'false');
  $('loading').hidden = true; $('stageTools').hidden = true;
  $('earthCanvas').hidden = true; $('fallback').hidden = false;
}

async function start() {
  const token = ++request;
  earth?.dispose(); earth = null; ready = false;
  enableControls(false);
  $('earthStage').setAttribute('aria-busy', 'true');
  $('loading').hidden = false; $('fallback').hidden = true; $('stageTools').hidden = true;
  // A fresh canvas also makes retry useful after context loss.
  const previous = $('earthCanvas'), canvas = previous.cloneNode(false);
  canvas.hidden = false; previous.replaceWith(canvas);
  try {
    const { EarthScene } = await import('./earth-scene.js' + (attempt ? '?retry=' + attempt : ''));
    if (token !== request) return;
    earth = new EarthScene(canvas, { onStateChange: motionState, onError: failure });
    await earth.load();
    if (token !== request || !earth) return;
    ready = true; $('earthStage').setAttribute('aria-busy', 'false');
    $('loading').hidden = true; $('stageTools').hidden = false;
    $('lightControl').value = '-48'; $('clouds').setAttribute('aria-pressed', 'true');
    updateLight(); enableControls(true);
  } catch { if (token === request) failure(); }
}

function updateLight() {
  const degrees = Number($('lightControl').value), magnitude = Math.abs(degrees);
  $('lightReadout').textContent = magnitude < 28 ? 'Daylit face' : magnitude > 120 ? 'The night side' : 'Day meets night';
  $('lightControl').setAttribute('aria-valuetext', $('lightReadout').textContent + ', light angle ' + degrees + ' degrees');
  if (ready) earth.setSunlight(degrees);
}

$('retry').addEventListener('click', () => { attempt++; start(); });
$('lightControl').addEventListener('input', updateLight);
$('motion').addEventListener('click', () => { if (ready) earth.host.toggle(); });
$('clouds').addEventListener('click', () => {
  if (!ready) return;
  const visible = $('clouds').getAttribute('aria-pressed') !== 'true';
  $('clouds').setAttribute('aria-pressed', String(visible)); earth.setClouds(visible);
});
$('reset').addEventListener('click', () => {
  if (!ready) return;
  earth.reset(); $('lightControl').value = '-48'; $('clouds').setAttribute('aria-pressed', 'true'); updateLight();
});
$('zoomIn').addEventListener('click', () => { if (ready) earth.zoom(0.86); });
$('zoomOut').addEventListener('click', () => { if (ready) earth.zoom(1 / 0.86); });
window.addEventListener('pagehide', event => { if (!event.persisted) { request++; earth?.dispose(); } });
start();
