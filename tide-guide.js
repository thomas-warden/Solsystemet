import { MAX_TIDE_RANGE } from './tide-constants.js?v=25a4b7bb490d.9df63c26d4';
// Illustrated equilibrium comparison and a separate, exaggerated pull demonstration.
// The comparison follows the live Moon/Sun model. The replay demonstrates relative
// acceleration with sample water points; it is not a time-integrated fluid model.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const ease = value => value * value * (3 - 2 * value);
const P2 = value => (3 * value * value - 1) / 2;
let guideCount = 0;

function globe(x, y, radius, kind, extra = '') {
  const size = radius * 2 * 1.11;
  return `<g ${extra}><circle cx="${x}" cy="${y}" r="${radius}" fill="${kind === 'earth' ? '#153240' : '#aaa9a0'}"/><image href="assets/tides/${kind}.webp" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}"/></g>`;
}

function definitions(id) {
  return `<defs>
  <radialGradient id="${id}-water"><stop offset=".5" stop-color="#153c51" stop-opacity=".05"/><stop offset=".87" stop-color="#285b75" stop-opacity=".25"/><stop offset="1" stop-color="#81c8db" stop-opacity=".5"/></radialGradient>
  <radialGradient id="${id}-sun"><stop stop-color="#fff3cc"/><stop offset=".65" stop-color="#e8c480"/><stop offset="1" stop-color="#ae652c"/></radialGradient>
  <radialGradient id="${id}-sun-glow"><stop stop-color="#e2ad67" stop-opacity=".2"/><stop offset="1" stop-color="#dca258" stop-opacity="0"/></radialGradient>
  </defs>`;
}

function comparisonPath(moonAngle, solarMix, lunarWeight=1) {
  const points = [];
  const radius = 57, baseline = 1.012 + .24 * MAX_TIDE_RANGE / 2;
  for (let i = 0; i <= 120; i++) {
    const angle = i / 120 * TAU;
    const forcing = lunarWeight * P2(Math.cos(angle - moonAngle)) + .46 * solarMix * P2(Math.cos(angle - Math.PI));
    const distance = radius * (baseline + .24 * forcing);
    points.push(`${(240 + Math.cos(angle) * distance).toFixed(2)},${(149 + Math.sin(angle) * distance).toFixed(2)}`);
  }
  return 'M' + points.join(' L') + ' Z';
}

const steps = [
  { title: 'The Moon pulls everything.', copy: 'Both sides of the ocean and Earth itself feel the Moon’s pull.' },
  { title: 'The pull is different.', copy: 'Near water moves more. Far water moves less. Earth moves too.' },
  { title: 'Now look from Earth.', copy: 'Compared with Earth’s middle, the water spreads out on both sides.' },
];

export class TideGuide {
  constructor(host, { onCompare = () => {} } = {}) {
    if (!host) throw new TypeError('TideGuide needs a host element.');
    this.host = host; this.onCompare = onCompare; this.fallback = host.innerHTML;
    this.details = host.closest('details'); this.active = false; this.visible = false; this.replayVisible = false; this.comparisonVisible = false;
    this.playing = false; this.replayPosition = 0; this.elapsed = 0; this.raf = 0;
    this.disposed = false; this.comparisonDirty = true;
    this.state = { range: 1.46, solarMix: 1, moonAngle: 0, sunAngle: 0 };
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.listeners = [];
    const id = `tide-guide-${++guideCount}`;
    host.classList.add('tide-guide');
    host.innerHTML = `<section class="tide-guide-pull" aria-labelledby="${id}-pull-heading">
      <div class="tide-guide-heading"><div><span class="eyebrow">01 / FOLLOW THE PULL</span><h3 id="${id}-pull-heading">Why the far side rises.</h3></div><button type="button" class="tide-guide-replay" data-guide-replay aria-pressed="false">▶ Replay</button></div>
      <div class="tide-guide-pull-layout">
      <figure class="tide-guide-pull-figure"><svg viewBox="0 0 480 270" role="img" aria-labelledby="${id}-pull-title ${id}-pull-desc">
      <title id="${id}-pull-title">Uneven pull makes two ocean bulges</title><desc id="${id}-pull-desc" data-guide-pull-description>The Moon pulls every part toward it. Far water moves least, Earth's middle more, and near water most.</desc>${definitions(id + '-pull')}
      <path class="tide-guide-axis" d="M55 135H452"/>
      <g data-guide-water-group><ellipse cx="210" cy="135" rx="85" ry="72" data-guide-pull-water fill="url(#${id}-pull-water)" stroke="#8ec8d6" stroke-opacity=".75"/><ellipse cx="210" cy="135" rx="85" ry="72" data-guide-starting-ocean class="tide-guide-reference"/></g>
      ${globe(210, 135, 64, 'earth', 'data-guide-earth')}
      ${globe(449, 135, 19, 'moon', 'data-guide-pull-moon')}
      <g class="tide-guide-water-point" data-guide-far><circle cx="125" cy="135" r="6"/><path d="M125 145V199"/><text x="125" y="220">Far water</text></g>
      <g class="tide-guide-water-point" data-guide-near><circle cx="295" cy="135" r="6"/><path d="M295 145V199"/><text x="295" y="220">Near water</text></g>
      <g class="tide-guide-earth-point" data-guide-earth-mark><circle cx="210" cy="135" r="3"/><path d="M210 145V232"/><text x="210" y="253">Earth</text></g>
      <g class="tide-guide-force" data-guide-far-force><path d="M125 135h14m-5-5 5 5-5 5"/></g><g class="tide-guide-force" data-guide-earth-force><path d="M210 135h28m-5-5 5 5-5 5"/></g><g class="tide-guide-force" data-guide-near-force><path d="M295 135h44m-5-5 5 5-5 5"/></g>
      <g class="tide-guide-labels"><text x="449" y="178" data-guide-pull-moon-label>Moon</text><text x="125" y="39" data-guide-less-label>Less pull</text><text x="295" y="39" data-guide-more-label>More pull</text></g>
      </svg><figcaption class="tide-guide-scale-note">Ocean shape and movement exaggerated.</figcaption></figure>
      <div class="tide-guide-pull-reading"><p class="tide-guide-step-title" data-guide-step-title>${steps[0].title}</p><p data-guide-step-copy>${steps[0].copy}</p><div class="tide-guide-steps" role="group" aria-label="Step through the Moon’s uneven pull"><button type="button" data-guide-step="0" aria-pressed="true"><span>1</span>The pull</button><button type="button" data-guide-step="1" aria-pressed="false"><span>2</span>Different pulls</button><button type="button" data-guide-step="2" aria-pressed="false"><span>3</span>From Earth</button></div><p class="tide-guide-replay-note">Gold arrows all point toward the Moon. A longer arrow means a stronger pull.</p></div>
      </div>
    </section>
    <section class="tide-guide-compare" aria-labelledby="${id}-compare-heading"><div class="tide-guide-heading"><div><span class="eyebrow">02 / CHANGE THE ALIGNMENT</span><h3 id="${id}-compare-heading">How big is the change?</h3></div></div>
      <div class="tide-guide-comparison-layout"><figure><svg viewBox="0 0 480 300" role="img" aria-labelledby="${id}-compare-title ${id}-compare-desc"><title id="${id}-compare-title">The live Moon and Sun alignment</title><desc id="${id}-compare-desc" data-guide-comparison-description>The ocean follows the same Moon and Sun arrangement as the experiment above. Its scale stays fixed as the Moon moves.</desc>${definitions(id + '-compare')}
      <circle cx="39" cy="149" r="75" fill="url(#${id}-compare-sun-glow)" data-guide-sun-glow/><path class="tide-guide-axis" d="M39 149H240"/><path class="tide-guide-axis" d="M240 149H377" data-guide-moon-axis/>
      <path data-guide-ocean fill="url(#${id}-compare-water)" stroke="#93cddd" stroke-width="1"/>
      <circle cx="240" cy="149" r="${57*(1.012+.24*MAX_TIDE_RANGE/2)}" class="tide-guide-reference"/>
      ${globe(240, 149, 57, 'earth')}
      <circle cx="39" cy="149" r="24" fill="url(#${id}-compare-sun)" data-guide-sun/>
      ${globe(0, 0, 15.6, 'moon', 'data-guide-moon')}
      <g class="tide-guide-labels"><text x="39" y="202">Sun</text><text data-guide-moon-label>Moon</text></g>
      <g class="tide-guide-range"><path data-guide-range-bracket/><path data-guide-range-high/><path data-guide-range-low/><text x="440" y="126">Tide</text><text x="440" y="143">range</text></g>
      </svg><figcaption class="tide-guide-scale-note"><i aria-hidden="true"></i> Round ocean reference · Ocean shape exaggerated</figcaption></figure>
      <div class="tide-guide-comparison-reading"><div class="tide-guide-compare-buttons" role="group" aria-label="Compare tide ranges in the live experiment"><button type="button" data-guide-compare="0" aria-pressed="false">Bigger change</button><button type="button" data-guide-compare="90" aria-pressed="false">Smaller change</button></div><p class="tide-guide-comparison-title" data-guide-comparison-title></p><p data-guide-comparison-copy></p><p class="tide-guide-linked-note">Linked to the Moon and Sun above. One Earth, one scale.</p></div></div>
    </section><p class="tide-guide-footnote">“Spring” means a bigger tide range, not the season. Sizes and distances are composed. <a href="sources.html#tides" target="_blank" rel="noopener">Sources &amp; model ↗</a></p>`;
    this.get = selector => host.querySelector(selector);
    this.elements = Object.fromEntries(['earth','earth-mark','far','near','far-force','earth-force','near-force','water-group','pull-water','starting-ocean','pull-moon','pull-moon-label','less-label','more-label','pull-description','step-title','step-copy','replay','ocean','moon-axis','moon','moon-label','sun','sun-glow','range-bracket','range-high','range-low','comparison-title','comparison-copy','comparison-description'].map(key => [key, this.get(`[data-guide-${key}]`)]));
    this.stepButtons = [...host.querySelectorAll('[data-guide-step]')];
    this.compareButtons = [...host.querySelectorAll('[data-guide-compare]')];
    this.listen(this.elements.replay, 'click', () => this.toggleReplay());
    for (const button of this.stepButtons) this.listen(button, 'click', () => this.selectStep(Number(button.dataset.guideStep)));
    for (const button of this.compareButtons) this.listen(button, 'click', () => this.onCompare(Number(button.dataset.guideCompare)));
    this.listen(this.reduced, 'change', event => { if (event.matches) this.selectStep(Math.round(this.replayPosition)); });
    this.listen(document, 'visibilitychange', () => this.syncRunning());
    if (this.details) this.listen(this.details, 'toggle', () => this.syncRunning());
    this.pullSection = this.get('.tide-guide-pull'); this.compareSection = this.get('.tide-guide-compare');
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === host) this.visible = entry.isIntersecting;
        if (entry.target === this.pullSection) this.replayVisible = entry.isIntersecting;
        if (entry.target === this.compareSection) this.comparisonVisible = entry.isIntersecting;
      }
      this.syncRunning();
    });
    for (const element of [host, this.pullSection, this.compareSection]) this.observer.observe(element);
    this.renderReplay(); this.renderComparison();
  }

  listen(target, type, callback) { target.addEventListener(type, callback); this.listeners.push([target, type, callback]); }
  canRun() { return this.active && this.visible && !document.hidden && (!this.details || this.details.open); }
  setActive(active) {
    if (this.disposed) return;
    this.active = Boolean(active);
    if (!this.active) { this.playing = false; this.updateReplayControl(); }
    this.syncRunning();
  }
  setState({ range = this.state.range, solarMix = this.state.solarMix, moonAngle = this.state.moonAngle, sunAngle = this.state.sunAngle, moonDistanceRatio=1, lunarWeight=1 } = {}) {
    if (this.disposed) return;
    if (![range, solarMix, moonAngle, sunAngle].every(Number.isFinite)) throw new TypeError('Tide guide state must be finite.');
    if (solarMix < 0 || solarMix > 1 || range < 0) throw new RangeError('Tide guide solar mix/range is invalid.');
    this.state = { range, solarMix, moonAngle, sunAngle, moonDistanceRatio, lunarWeight }; this.comparisonDirty = true;
    if (this.canRun() && this.comparisonVisible) this.renderComparison();
  }
  selectStep(step) {
    if (this.disposed) return;
    this.playing = false; this.replayPosition = clamp(step, 0, 2);
    this.stopFrame(); this.renderReplay(); this.updateReplayControl();
  }
  toggleReplay() {
    if (this.disposed) return;
    if (this.playing) { this.playing = false; this.stopFrame(); }
    else { this.playing = true; this.elapsed = 0; this.replayPosition = 0; this.renderReplay(); this.syncRunning(); }
    this.updateReplayControl();
  }
  updateReplayControl() {
    this.elements.replay.textContent = this.playing ? 'Ⅱ Pause' : '▶ Replay';
    this.elements.replay.setAttribute('aria-pressed', String(this.playing));
    this.elements.replay.setAttribute('aria-label', this.playing ? 'Pause the pull explanation' : 'Replay the Moon’s uneven pull');
  }
  stopFrame() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.lastFrame = 0; }
  syncRunning() {
    if (this.disposed) return;
    if (!this.canRun()) { this.stopFrame(); return; }
    if (this.comparisonDirty && this.comparisonVisible) this.renderComparison();
    if (!this.replayVisible) { this.stopFrame(); return; }
    if (this.playing && !this.raf) { this.lastFrame = 0; this.raf = requestAnimationFrame(time => this.frame(time)); }
  }
  frame(time) {
    this.raf = 0;
    if (!this.canRun() || !this.replayVisible || !this.playing || this.disposed) return;
    if (this.lastFrame) this.elapsed += Math.min(.05, (time - this.lastFrame) / 1000);
    this.lastFrame = time;
    const t = this.elapsed;
    if (t < .65) this.replayPosition = 0;
    else if (t < 2.25) this.replayPosition = ease((t - .65) / 1.6);
    else if (t < 3.2) this.replayPosition = 1;
    else if (t < 4.8) this.replayPosition = 1 + ease((t - 3.2) / 1.6);
    else this.replayPosition = 2;
    this.renderReplay();
    if (t >= 6) { this.playing = false; this.updateReplayControl(); this.lastFrame = 0; return; }
    this.raf = requestAnimationFrame(next => this.frame(next));
  }
  renderReplay() {
    const p = this.replayPosition, stretch = Math.min(p, 1), reframe = Math.max(0, p - 1);
    const centre = 48 * stretch - 48 * reframe;
    const far = 12 * stretch - 48 * reframe;
    const near = 84 * stretch - 48 * reframe;
    const translate = (key, x) => this.elements[key].setAttribute('transform', `translate(${x.toFixed(3)} 0)`);
    for (const key of ['earth', 'earth-mark', 'earth-force', 'water-group']) translate(key, centre);
    for (const key of ['far', 'far-force', 'less-label']) translate(key, far);
    for (const key of ['near', 'near-force', 'more-label']) translate(key, near);
    translate('pull-moon', -48 * reframe); translate('pull-moon-label', -48 * reframe);
    this.elements['pull-water'].setAttribute('rx', (85 + 36 * stretch).toFixed(3));
    this.elements['pull-water'].setAttribute('ry', (72 - 4 * stretch).toFixed(3));
    this.elements['starting-ocean'].style.opacity = String(stretch * .6);
    const index = p < .02 ? 0 : p < 1.02 ? 1 : 2;
    this.elements['step-title'].textContent = steps[index].title;
    this.elements['step-copy'].textContent = steps[index].copy;
    this.elements['pull-description'].textContent = steps[index].copy + ' Gold arrows point toward the Moon on both sides. Movement is exaggerated; these are illustrative sample positions.';
    for (const button of this.stepButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.guideStep) === index));
    this.host.dataset.pullStep = String(index); this.host.dataset.pullPosition = p.toFixed(4);
  }
  renderComparison() {
    const { range, solarMix, moonAngle, sunAngle, moonDistanceRatio=1, lunarWeight=1 } = this.state;
    // Rotate the orbital plane as a whole so the Sun stays on the left. Angles
    // are right-handed radians in the model's orbital plane; SVG y is downward.
    const relative = moonAngle - sunAngle, angle = Math.PI - relative;
    const x = 240 + Math.cos(angle) * 112 * moonDistanceRatio, y = 149 + Math.sin(angle) * 112 * moonDistanceRatio;
    this.elements.ocean.setAttribute('d', comparisonPath(angle, solarMix, lunarWeight));
    this.elements.moon.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    this.elements['moon-axis'].setAttribute('d', `M240 149L${x.toFixed(2)} ${y.toFixed(2)}`);
    const vertical = y < 90 || y > 210;
    this.elements['moon-label'].setAttribute('x', (vertical ? x + 27 : x).toFixed(2));
    this.elements['moon-label'].setAttribute('y', (vertical ? y + 5 : y + 31).toFixed(2));
    this.elements['moon-label'].setAttribute('text-anchor', vertical ? 'start' : 'middle');
    this.elements.sun.style.opacity = String(.35 + .65 * solarMix);
    this.elements['sun-glow'].style.opacity = String(.2 + .8 * solarMix);
    const size = 58 * range / 1.46, high = 195 - size / 2, low = 195 + size / 2;
    this.elements['range-bracket'].setAttribute('d', `M428 ${high.toFixed(2)}H436V${low.toFixed(2)}H428`);
    this.elements['range-high'].setAttribute('d', `M424 ${high.toFixed(2)}H447`);
    this.elements['range-low'].setAttribute('d', `M424 ${low.toFixed(2)}H447`);
    const aligned = Math.abs(Math.sin(relative)) < .1, rightAngle = Math.abs(Math.cos(relative)) < .1;
    let title, copy;
    if (solarMix < .01) { title = 'Moon only · one tide range'; copy = 'The Sun’s pull is off. These two positions now give the same range.'; }
    else if (aligned && moonDistanceRatio < .999) { title = 'Closer-Moon spring tide'; copy = 'Alignment plus a closer Moon makes higher highs. This illustrates one way a “king” tide can happen.'; }
    else if (aligned) { title = 'Spring tide · bigger change'; copy = 'Same side or opposite sides: the Sun and Moon’s tidal effects add together.'; }
    else if (rightAngle) { title = 'Neap tide · smaller change'; copy = 'At a right angle, the Sun partly reduces the Moon’s tidal effect.'; }
    else { title = 'Between spring & neap'; copy = 'Move the Moon. Watch the ocean outline and the tide-range bracket change together.'; }
    if (moonDistanceRatio < .999 && !aligned) copy += ' The closer Moon increases its contribution.';
    this.elements['comparison-title'].textContent = title;
    this.elements['comparison-copy'].textContent = copy;
    this.elements['comparison-description'].textContent = `${title}. ${copy} The grey dashed circle is a fixed round-ocean reference. Ocean height is exaggerated.`;
    for (const button of this.compareButtons) button.setAttribute('aria-pressed', String(solarMix >= .99 && moonDistanceRatio>.999 && (Number(button.dataset.guideCompare) === 0 ? aligned : rightAngle)));
    this.host.dataset.comparisonRange = range.toFixed(6); this.host.dataset.solarMix = solarMix.toFixed(6);
    this.comparisonDirty = false;
  }
  dispose() {
    if (this.disposed) return;
    this.stopFrame(); this.observer.disconnect();
    for (const [target, type, callback] of this.listeners) target.removeEventListener(type, callback);
    this.host.innerHTML = this.fallback; this.host.classList.remove('tide-guide');
    delete this.host.dataset.pullStep; delete this.host.dataset.pullPosition;
    delete this.host.dataset.comparisonRange; delete this.host.dataset.solarMix;
    this.disposed = true;
  }
}
