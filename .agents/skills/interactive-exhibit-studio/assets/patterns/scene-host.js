/** A scheduler for one scene; it owns no renderer, assets, or input controls. */
export class SceneHost {
  constructor({
    element, update = () => ({}), render = () => {}, defaultMotion = true,
    advanceOffscreen, onStateChange = () => {},
    onMotionPreferenceChange = () => {}, onError, maxDelta = 0.05,
  } = {}) {
    if (!element?.ownerDocument?.defaultView) throw new TypeError('A browser element is required.');
    if (!Number.isFinite(maxDelta) || maxDelta <= 0) throw new RangeError('maxDelta must be positive seconds.');
    for (const callback of [update, render, onStateChange, onMotionPreferenceChange]) {
      if (typeof callback !== 'function') throw new TypeError('Scene callbacks must be functions.');
    }
    if (advanceOffscreen !== undefined && typeof advanceOffscreen !== 'function') throw new TypeError('advanceOffscreen must be a function.');
    if (onError !== undefined && typeof onError !== 'function') throw new TypeError('onError must be a function.');
    this.element = element;
    this.document = element.ownerDocument;
    this.window = this.document.defaultView;
    this.update = update;
    this.render = render;
    this.advanceOffscreen = advanceOffscreen;
    this.onStateChange = onStateChange;
    this.onMotionPreferenceChange = onMotionPreferenceChange;
    this.onError = onError;
    this.defaultMotion = Boolean(defaultMotion);
    this.maxDelta = maxDelta;
    this._active = false;
    this._playing = false;
    this._held = false;
    this._destroyed = false;
    this._dirty = true;
    this._time = 0;
    this._lastTimestamp = null;
    this._frameId = null;
    this._error = null;
    this._documentVisible = !this.document.hidden;
    this._motionQuery = this.window.matchMedia('(prefers-reduced-motion: reduce)');
    this._reducedMotion = this._motionQuery.matches;
    this._requestAnimationFrame = this.window.requestAnimationFrame.bind(this.window);
    this._cancelAnimationFrame = this.window.cancelAnimationFrame.bind(this.window);
    this._tick = this._tick.bind(this);

    this._onPreference = () => {
      if (this._destroyed || this._reducedMotion === this._motionQuery.matches) return;
      this._reducedMotion = this._motionQuery.matches;
      if (this._reducedMotion) this._playing = false;
      // The adapter can finish camera transitions and cancel gesture inertia.
      this.onMotionPreferenceChange(this._reducedMotion, this.state);
      this.invalidate();
      this._emit();
    };
    this._motionQuery.addEventListener('change', this._onPreference);
    this._onDocumentVisibility = () => {
      this._documentVisible = !this.document.hidden;
      this._suspend();
      this.invalidate();
      this._emit();
    };
    this.document.addEventListener('visibilitychange', this._onDocumentVisibility);

    // Wait for the first observation before drawing a possibly offscreen scene.
    this._inView = false;
    if (this.window.IntersectionObserver) {
      this._observer = new this.window.IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === this.element);
        if (entry) this._setInView(entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0);
      }, { threshold: 0 });
      this._observer.observe(element);
    } else {
      this._checkBounds = () => {
        const box = this.element.getBoundingClientRect();
        this._setInView(box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 &&
          box.top < this.window.innerHeight && box.left < this.window.innerWidth);
      };
      this.window.addEventListener('scroll', this._checkBounds, { passive: true, capture: true });
      this.window.addEventListener('resize', this._checkBounds);
      this._checkBounds();
    }
    this._emit();
  }

  get state() {
    return {
      active: this._active, playing: this._playing, held: this._held,
      running: this._active && this._playing && !this._held && this._documentVisible &&
        (this._inView || Boolean(this.advanceOffscreen)),
      inView: this._inView, documentVisible: this._documentVisible,
      reducedMotion: this._reducedMotion, time: this._time,
      destroyed: this._destroyed, error: this._error,
    };
  }

  enter({ resetTime = false } = {}) {
    if (this._destroyed) return;
    const fresh = !this._active || resetTime;
    this._active = true;
    this._error = null;
    if (resetTime) this._time = 0;
    if (fresh) {
      this._held = false;
      this._playing = this.defaultMotion && !this._reducedMotion;
      this._suspend();
    }
    this._checkBounds?.();
    this.invalidate();
    this._emit();
  }

  leave() {
    if (this._destroyed) return;
    this._active = this._playing = this._held = false;
    this._suspend();
    this._emit();
  }

  play() { this._setPlaying(true); }
  pause() { this._setPlaying(false); }
  toggle() { this._setPlaying(!this._playing); }

  setHeld(value) {
    if (this._destroyed || this._held === Boolean(value)) return;
    this._held = Boolean(value);
    this._suspend();
    this.invalidate();
    this._emit();
  }

  invalidate() {
    if (this._destroyed) return;
    this._dirty = true;
    this.requestFrame();
  }

  requestFrame() {
    if (this._frameId === null && this._canTick()) this._frameId = this._requestAnimationFrame(this._tick);
  }

  destroy() {
    if (this._destroyed) return;
    // Become terminal before any user callback can re-enter destroy or enter.
    this._destroyed = true;
    this._active = this._playing = this._held = false;
    this._suspend();
    this._observer?.disconnect();
    this._motionQuery.removeEventListener('change', this._onPreference);
    this.document.removeEventListener('visibilitychange', this._onDocumentVisibility);
    if (this._checkBounds) {
      this.window.removeEventListener('scroll', this._checkBounds, true);
      this.window.removeEventListener('resize', this._checkBounds);
    }
    this._emit();
  }

  _emit() { this.onStateChange(this.state); }

  _setPlaying(value) {
    if (this._destroyed || !this._active || this._playing === value) return;
    // Explicit Play is allowed even when automatic motion is reduced.
    this._playing = value;
    this._suspend();
    this.invalidate();
    this._emit();
  }

  _setInView(value) {
    if (this._destroyed || this._inView === value) return;
    this._inView = value;
    this._suspend();
    this.invalidate();
    this._emit();
  }

  _canTick() {
    return !this._destroyed && this._active && this._documentVisible &&
      (this._inView || (this._playing && !this._held && Boolean(this.advanceOffscreen)));
  }

  _suspend() {
    if (this._frameId !== null) this._cancelAnimationFrame(this._frameId);
    this._frameId = null;
    this._lastTimestamp = null;
  }

  _tick(timestamp) {
    this._frameId = null;
    if (!this._canTick()) { this._lastTimestamp = null; return; }
    // Never catch up a hidden tab with one enormous simulation or camera step.
    const dt = this._lastTimestamp === null ? 0 : Math.max(0, Math.min(this.maxDelta, (timestamp - this._lastTimestamp) / 1000));
    this._lastTimestamp = timestamp;
    if (this.state.running) this._time += dt;
    const context = { ...this.state, dt, timestamp };
    try {
      let needsFrame = false;
      if (!this._inView) {
        this.advanceOffscreen(context);
        this._dirty = true;
      } else {
        const dirty = this._dirty;
        this._dirty = false;
        const result = this.update(context) || {};
        // Adapters may leave a route and dispose their renderer during update.
        if (!this._canTick() || !this._inView) return;
        needsFrame = Boolean(result.needsFrame);
        const changed = result.changed ?? (context.running && dt > 0);
        if (dirty || changed) this.render(context);
      }
      if (this.state.running || needsFrame || (this._inView && this._dirty)) this.requestFrame();
      else if (this._frameId === null) this._lastTimestamp = null;
    } catch (error) {
      this._error = error;
      this.leave();
      if (this.onError) this.onError(error);
      else this.window.queueMicrotask(() => { throw error; });
    }
  }
}
