// Adapted from Solsystemet: names share the body's projection, not a second
// eased trajectory. Crowding changes visibility rather than position.
const GAP = 4, RETURN_GAP = 12, RETURN_DELAY = 0.3;
const FADE_IN = 0.22, FADE_OUT = 0.18, PADDING = 8, OFFSET = 10;

export class AnchoredLabels {
  constructor(container, onLayoutChange = () => {}, { focusTarget } = {}) {
    if (!container?.ownerDocument?.defaultView) throw new TypeError('A browser label container is required.');
    this.container = container;
    this.document = container.ownerDocument;
    this.onLayoutChange = onLayoutChange;
    this.focusTarget = focusTarget || container.parentElement?.querySelector('canvas, [data-scene-focus]') || container;
    this._addedTabIndex = !this.focusTarget.matches('a[href], button, input, select, textarea, [tabindex]');
    if (this._addedTabIndex) this.focusTarget.tabIndex = -1;
    this.entries = new Map();
    this.byElement = new WeakMap();
    this.bounds = { available: false };
    this.destroyed = false;
    this._onInteraction = () => this.onLayoutChange();
    for (const type of ['focusin', 'focusout', 'pointerover', 'pointerout']) container.addEventListener(type, this._onInteraction);
    const Observer = this.document.defaultView.ResizeObserver;
    if (Observer) this.observer = new Observer(records => {
      let changed = false;
      for (const record of records) changed = this._measureEntry(this.byElement.get(record.target)) || changed;
      if (changed) this.onLayoutChange();
    });
  }

  add(id, label, wire) {
    if (this.destroyed) throw new Error('Cannot add to destroyed labels.');
    if (typeof id !== 'string' || !id) throw new TypeError('A nonempty string label id is required.');
    if (this.entries.has(id)) throw new Error(`Duplicate label: ${id}`);
    if (!this.container.contains(label) || !this.container.contains(wire)) throw new Error('Append the label and wire to the container before adding them.');
    label.classList.add('anchored-label');
    wire.classList.add('anchored-wire');
    label.hidden = wire.hidden = false;
    label.style.left = label.style.top = wire.style.left = wire.style.top = '0px';
    label.style.opacity = wire.style.opacity = '0';
    label.style.visibility = wire.style.visibility = 'hidden';
    label.style.pointerEvents = 'none';
    label.tabIndex = -1;
    label.setAttribute('aria-hidden', 'true');
    wire.setAttribute('aria-hidden', 'true');
    const entry = { id, label, wire, width: 44, height: 44, opacity: 0, target: 0, clearTime: 0 };
    this.entries.set(id, entry);
    this.byElement.set(label, entry);
    this._measureEntry(entry);
    this.observer?.observe(label);
    this.onLayoutChange();
  }

  clear() {
    for (const entry of this.entries.values()) {
      this._hide(entry);
      this.observer?.unobserve(entry.label);
    }
    this.entries.clear();
    this.byElement = new WeakMap();
  }

  destroy() {
    if (this.destroyed) return;
    this.clear();
    this.observer?.disconnect();
    for (const type of ['focusin', 'focusout', 'pointerover', 'pointerout']) this.container.removeEventListener(type, this._onInteraction);
    if (this._addedTabIndex) this.focusTarget.removeAttribute('tabindex');
    this.destroyed = true;
  }

  hasFocus() { return this.entries.has(this.byElement.get(this.document.activeElement)?.id); }

  measure(canvas, toolbar = { height: 0 }, footer = { height: 0 }) {
    if (this.destroyed) return;
    const top = Math.max(PADDING, toolbar.height ? toolbar.bottom - canvas.top + PADDING : PADDING);
    const bottom = Math.min(canvas.height - PADDING, footer.height ? footer.top - canvas.top - PADDING : canvas.height - PADDING);
    const bounds = { left: PADDING, right: canvas.width - PADDING, top, bottom,
      width: canvas.width, height: canvas.height, available: canvas.width >= 44 + 2 * PADDING && bottom - top >= 44 };
    let changed = Object.keys(bounds).some(key => bounds[key] !== this.bounds[key]);
    this.bounds = bounds;
    for (const entry of this.entries.values()) changed = this._measureEntry(entry) || changed;
    if (changed) this.onLayoutChange();
  }

  update(items, dt, { selected, reducedMotion = false } = {}) {
    if (this.destroyed) return false;
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('dt must be nonnegative seconds.');
    const placed = [], included = new Set(), bounds = this.bounds;
    let pending = false;
    const candidates = items.map((item, index) => {
      const entry = this.entries.get(item.id);
      if (!entry || ![item.x, item.y, item.radius].every(Number.isFinite) || item.radius < 0) return null;
      included.add(item.id);
      const focused = this.document.activeElement === entry.label;
      const held = focused || entry.label.matches(':hover');
      return { item, entry, index, held, x: item.x + item.radius + OFFSET, y: item.y - entry.height / 2,
        width: entry.width, height: entry.height, priority: focused ? 0 : held ? 1 : item.id === selected ? 2 : entry.target ? 3 : 4 };
    }).filter(Boolean).sort((a, b) => a.priority - b.priority || a.index - b.index);

    // Omitted or invalid projections must not leave a previous frame's links alive.
    for (const entry of this.entries.values()) if (!included.has(entry.id)) this._hide(entry);
    for (const candidate of candidates) {
      const { item, entry, x, y, width, height, held } = candidate;
      const { label, wire } = entry;
      label.style.transform = `translate3d(${x}px,${y}px,0)`;
      wire.style.transform = `translate3d(${item.x + item.radius + 2}px,${item.y}px,0)`;
      wire.style.width = '8px';
      const edge = Math.min(x - bounds.left, bounds.right - x - width, y - bounds.top, bounds.bottom - y - height);
      const inside = bounds.available && edge >= 0;
      const gap = entry.target ? GAP : RETURN_GAP;
      const crowded = placed.some(other => x < other.x + other.width + gap && x + width + gap > other.x &&
        y < other.y + other.height + gap && y + height + gap > other.y);
      if (!inside || !item.visible || crowded) {
        entry.target = 0;
        entry.clearTime = 0;
      } else {
        entry.clearTime += dt;
        if (entry.target || held || reducedMotion || entry.clearTime >= RETURN_DELAY) entry.target = 1;
        else pending = true;
        placed.push(candidate);
      }
      // Fade near a boundary; do not clamp a name away from its body.
      const target = entry.target * Math.min(1, Math.max(0, edge) / 12);
      if (!inside || reducedMotion) entry.opacity = inside ? target : 0;
      else if (entry.opacity < target) entry.opacity = Math.min(target, entry.opacity + dt / FADE_IN);
      else if (entry.opacity > target) entry.opacity = Math.max(target, entry.opacity - dt / FADE_OUT);
      if (Math.abs(entry.opacity - target) > 0.001) pending = true;
      this._applyVisibility(entry, entry.opacity > 0.001 && entry.target === 1);
    }
    return pending;
  }

  _measureEntry(entry) {
    if (!entry) return false;
    const box = entry.label.getBoundingClientRect();
    // Detached labels report zero. Preserve the last usable dimensions.
    if (!box.width || !box.height) return false;
    const width = Math.max(44, box.width), height = Math.max(44, box.height);
    if (entry.width === width && entry.height === height) return false;
    entry.width = width;
    entry.height = height;
    return true;
  }

  _hide(entry) {
    entry.target = entry.opacity = entry.clearTime = 0;
    this._applyVisibility(entry, false);
  }

  _applyVisibility(entry, interactive) {
    const { label, wire } = entry;
    if (this.document.activeElement === label && !interactive) this.focusTarget.focus({ preventScroll: true });
    const visible = entry.opacity > 0.001;
    // Keep layout boxes measurable while hidden. A display:none label whose
    // text shrinks may otherwise retain old bounds and never fit on screen.
    label.hidden = wire.hidden = false;
    label.style.opacity = wire.style.opacity = entry.opacity.toFixed(4);
    label.style.visibility = wire.style.visibility = visible ? 'visible' : 'hidden';
    label.style.pointerEvents = interactive ? 'auto' : 'none';
    label.tabIndex = interactive ? 0 : -1;
    if (interactive) label.removeAttribute('aria-hidden');
    else label.setAttribute('aria-hidden', 'true');
  }
}
