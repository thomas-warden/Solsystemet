import { AnchoredLabels } from '../anchored-labels.js';

function assert(value, message) { if (!value) throw new Error(message); }
function hidden(entry) { return entry.label.style.visibility === 'hidden'; }
// Browser CSS transform serialization rounds sub-millipixel values.
function close(a, b, message) { assert(Math.abs(a - b) < .001, `${message}: ${a} versus ${b}`); }
function fixture() {
  const stage = document.createElement('div');
  stage.style.cssText = 'position:relative;width:600.25px;height:400.5px;font:14px sans-serif;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Test scene');
  const layer = document.createElement('div');
  layer.className = 'anchored-label-layer';
  stage.append(canvas, layer);
  document.body.append(stage);
  let changes = 0;
  const labels = new AnchoredLabels(layer, () => changes++, { focusTarget: canvas });
  function add(id, title = id) {
    const label = document.createElement('button');
    label.textContent = title;
    const wire = document.createElement('span');
    layer.append(label, wire);
    labels.add(id, label, wire);
    return labels.entries.get(id);
  }
  labels.measure(canvas.getBoundingClientRect());
  return { stage, canvas, layer, labels, add, get changes() { return changes; },
    destroy() { labels.destroy(); stage.remove(); } };
}
function point(id, x, y, radius = 12) { return { id, x, y, radius, visible: true }; }
function settle(labels, points, options = {}, count = 45) {
  let pending;
  for (let i = 0; i < count; i++) pending = labels.update(points, 1 / 60, options);
  return pending;
}
function assertAttached(entry, point) {
  const matrix = new DOMMatrix(entry.label.style.transform);
  close(matrix.m41, point.x + point.radius + 10, 'Label follows the current projected edge exactly');
  close(matrix.m42, point.y - entry.height / 2, 'Label center follows the current body center exactly');
  const wire = new DOMMatrix(entry.wire.style.transform);
  close(wire.m41, point.x + point.radius + 2, 'Connector starts at body edge');
  close(wire.m42, point.y, 'Connector shares body center');
  assert(entry.wire.style.width === '8px', 'Connector stays short, without a separate lane');
}
async function waitFor(condition, message) {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 3000) throw new Error(message);
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

export async function runAnchoredLabelsTests() {
  const passed = [];
  async function test(name, check) {
    const env = fixture();
    try { await check(env); passed.push(name); }
    finally { env.destroy(); }
  }

  await test('Temporal projection remains directly attached through collisions and variable frame times', env => {
    const a = env.add('a', 'Moving subject'), b = env.add('b', 'Second subject');
    for (let i = 0; i < 1200; i++) {
      const angle = i / 90;
      const points = [point('a', 230 + 150 * Math.cos(angle), 200 + 120 * Math.sin(angle), 10.25),
        point('b', 230 + 150 * Math.cos(angle + .8), 200 + 120 * Math.sin(angle + .8), 18.5)];
      env.labels.update(points, i % 3 === 0 ? 1 / 30 : 1 / 120, { selected: 'a' });
      assertAttached(a, points[0]); assertAttached(b, points[1]);
    }
    assert(env.labels.bounds.width === 600.25, 'Projection bounds preserve fractional CSS pixels');
  });

  await test('Collision disappearance is immediate for input, with delayed stable return', env => {
    const a = env.add('a'), b = env.add('b');
    let points = [point('a', 100, 100), point('b', 350, 250)];
    assert(!settle(env.labels, points, { selected: 'a' }), 'Visible labels settle without endless work');
    assert(a.label.tabIndex === 0 && b.label.tabIndex === 0, 'Separated labels are keyboard targets');
    points[1] = point('b', 100, 100);
    env.labels.update(points, 1 / 60, { selected: 'a' });
    assert(b.label.tabIndex === -1 && b.label.style.pointerEvents === 'none', 'A fading collision cannot intercept input');
    assert(b.opacity > 0, 'Normal motion fades instead of popping');
    settle(env.labels, points, { selected: 'a' });
    assert(hidden(b) && a.label.tabIndex === 0, 'Priority label remains stable');
    points[1] = point('b', 350, 250);
    assert(settle(env.labels, points, { selected: 'a' }, 10), 'Returning label requests settling frames');
    assert(b.label.tabIndex === -1 && b.target === 0, 'Brief clearance cannot flicker a label back');
    assert(!settle(env.labels, points, { selected: 'a' }), 'Clearance dwell plus fade eventually settles');
    assert(b.label.tabIndex === 0 && b.opacity === 1, 'Sustained clearance restores the label');
  });

  await test('Focused label wins collisions and resize has an explicit focus fallback', env => {
    const a = env.add('a'), b = env.add('b');
    const points = [point('a', 100, 100), point('b', 350, 250)];
    settle(env.labels, points);
    b.label.focus();
    assert(env.labels.hasFocus(), 'Scene can hold simulation while a label is focused');
    points[0] = point('a', 350, 250);
    env.labels.update(points, 1 / 60, { selected: 'a' });
    assert(document.activeElement === b.label && b.target === 1 && a.target === 0, 'Focus outranks selection');
    const bounds = env.canvas.getBoundingClientRect();
    env.labels.measure({ ...bounds.toJSON(), width: 200, height: 120 });
    env.labels.update(points, 0);
    assert(document.activeElement === env.canvas && !env.labels.hasFocus(), 'Out-of-bounds focus moves to the scene, never the document body');
    assert(hidden(b) && b.label.tabIndex === -1, 'Resize removes inaccessible targets immediately');
  });

  await test('Reduced motion reveals or hides without fades and reserves controls', env => {
    const a = env.add('a', 'Accessible target');
    const rect = env.canvas.getBoundingClientRect();
    env.labels.measure(rect, { height: 60, bottom: rect.top + 60 }, { height: 40, top: rect.bottom - 40 });
    const points = [point('a', 100, 150)];
    assert(!env.labels.update(points, 0, { reducedMotion: true }), 'Reduced labels settle in one update');
    assert(a.opacity === 1 && a.label.tabIndex === 0, 'No time-based fade is needed');
    const box = a.label.getBoundingClientRect();
    assert(box.width >= 44 && box.height >= 44, 'Interactive target is at least 44 CSS pixels');
    points[0] = point('a', 100, 60);
    env.labels.update(points, 0, { reducedMotion: true });
    assert(hidden(a), 'Labels do not cross measured toolbar bounds');
    points[0] = point('a', 100, 370);
    env.labels.update(points, 0, { reducedMotion: true });
    assert(hidden(a), 'Labels do not cross measured footer bounds');
  });

  await test('Missing, invalid, and occluded projections cannot leave live stale links', env => {
    const a = env.add('a'), b = env.add('b');
    const points = [point('a', 100, 100), point('b', 350, 250)];
    env.labels.update(points, 0, { reducedMotion: true });
    a.label.focus();
    env.labels.update([{ ...points[1], x: NaN }], 0, { reducedMotion: true });
    assert(hidden(a) && hidden(b) && document.activeElement === env.canvas, 'Missing and invalid projections are removed and focus restored');
    env.labels.update(points.map(item => ({ ...item, visible: false })), 0, { reducedMotion: true });
    assert(a.label.tabIndex === -1 && b.label.tabIndex === -1, 'Occluded labels do not participate in input');
  });

  await test('Label dimensions update through ResizeObserver, never per-frame layout reads', async env => {
    const a = env.add('a', 'Small');
    const points = [point('a', 50, 150)];
    env.labels.update(points, 0, { reducedMotion: true });
    const oldWidth = a.width;
    a.label.textContent = 'A substantially longer translated label';
    await waitFor(() => a.width > oldWidth, 'ResizeObserver did not refresh translated label dimensions');
    close(a.width, a.label.getBoundingClientRect().width, 'Cached size matches rendered size');
    let reads = 0;
    const original = a.label.getBoundingClientRect;
    a.label.getBoundingClientRect = () => { reads++; return original.call(a.label); };
    for (let i = 0; i < 120; i++) env.labels.update(points, 1 / 60);
    a.label.getBoundingClientRect = original;
    assert(reads === 0, 'Projection updates must not trigger DOM measurements');
  });

  await test('A hidden label can remeasure smaller text and return after responsive layout changes', async env => {
    const a = env.add('a', 'A very long label that cannot fit inside the narrow display');
    const rect = env.canvas.getBoundingClientRect();
    env.labels.measure({ ...rect.toJSON(), width: 220 });
    const points = [point('a', 100, 100)];
    env.labels.update(points, 0, { reducedMotion: true });
    assert(hidden(a), 'Oversized label is hidden');
    const oldWidth = a.width;
    a.label.textContent = 'Short';
    await waitFor(() => a.width < oldWidth, 'Hidden label did not remeasure after its text shrank');
    env.labels.update(points, 0, { reducedMotion: true });
    assert(!hidden(a) && a.label.tabIndex === 0, 'New smaller geometry restores the label without stale bounds');
  });

  await test('Clear and destroy remove ownership and interaction callbacks', env => {
    const a = env.add('a');
    env.labels.update([point('a', 100, 100)], 0, { reducedMotion: true });
    a.label.focus();
    env.labels.clear();
    assert(!env.labels.entries.size && hidden(a) && document.activeElement === env.canvas, 'Clear releases labels and restores focus');
    env.add('a', 'Replacement');
    env.labels.destroy();
    const count = env.changes;
    env.layer.dispatchEvent(new Event('pointerover', { bubbles: true }));
    env.layer.dispatchEvent(new Event('focusin', { bubbles: true }));
    assert(env.changes === count, 'Destroyed layer has no active interaction listeners');
    assert(env.canvas.tabIndex === 0, 'Caller-owned focusability is preserved');
  });
  return passed;
}
