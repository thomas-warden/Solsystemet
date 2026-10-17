// A small numeric adapter: supply position, target, zoom, or other scalar values
// in a consistent order. Apply them to your own camera; no renderer is required.
// Unwrap angles before starting. Quaternion rotations require a different,
// rotation-aware interpolator, not this component-wise numeric interpolation.
const smoothstep = t => t * t * (3 - 2 * t);

function validDuration(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, nonnegative number.`);
  }
  return value;
}

function copyState(value, name) {
  const numericArray = Array.isArray(value) ||
    (ArrayBuffer.isView(value) && typeof value.length === 'number');
  if (!numericArray) throw new TypeError(`${name} must be a numeric array.`);
  const copy = Array.from(value);
  if (!copy.length || !copy.every(Number.isFinite)) {
    throw new TypeError(`${name} must contain finite numbers and cannot be empty.`);
  }
  return copy;
}

export class CameraTransition {
  #apply;
  #ease;
  #defaultDuration;
  #duration = 0;
  #elapsed = 0;
  #from = [];
  #to = [];
  #active = false;

  constructor({ duration = .7, apply, ease = smoothstep } = {}) {
    this.#defaultDuration = validDuration(duration, 'duration');
    if (typeof apply !== 'function') throw new TypeError('apply must be a function.');
    if (typeof ease !== 'function') throw new TypeError('ease must be a function.');
    this.#apply = apply;
    this.#ease = ease;
  }

  get active() { return this.#active; }

  // Pass the currently displayed state as `from` when interrupting a flight.
  // Each callback receives its own array; it may retain or modify that array.
  start(from, to, { duration = this.#defaultDuration, immediate = false } = {}) {
    const start = copyState(from, 'from');
    const end = copyState(to, 'to');
    validDuration(duration, 'duration');
    if (start.length !== end.length) throw new RangeError('Camera states must have equal lengths.');
    if (typeof immediate !== 'boolean') throw new TypeError('immediate must be a boolean.');

    // Validate everything before replacing an existing, valid transition.
    this.#from = start;
    this.#to = end;
    this.#duration = duration;
    this.#elapsed = 0;
    this.#active = !immediate && duration > 0 && start.some((value, i) => value !== end[i]);
    this.#apply((this.#active ? start : end).slice());
    return this;
  }

  // dt is elapsed time in seconds. Call only while the scene should advance;
  // pausing or suspending a tab is the scene owner's policy.
  advance(dt, { reducedMotion = false } = {}) {
    validDuration(dt, 'dt');
    if (typeof reducedMotion !== 'boolean') throw new TypeError('reducedMotion must be a boolean.');
    if (!this.#active) return false;
    if (reducedMotion) { this.finish(); return false; }
    if (dt === 0) return true;

    const elapsed = Math.min(this.#duration, this.#elapsed + dt);
    // Avoid one extra frame caused only by accumulated floating-point rounding.
    if (this.#duration - elapsed <= this.#duration * Number.EPSILON * 8) {
      this.finish();
      return false;
    }
    const amount = this.#ease(elapsed / this.#duration);
    if (!Number.isFinite(amount)) throw new RangeError('ease must return a finite number.');
    const state = this.#from.map((value, i) => value * (1 - amount) + this.#to[i] * amount);
    if (!state.every(Number.isFinite)) throw new RangeError('Easing produced a nonfinite camera state.');
    this.#elapsed = elapsed;
    this.#apply(state);
    return this.#active;
  }

  // Finish applies the exact endpoint, independent of the custom easing curve.
  finish() {
    if (this.#active) {
      this.#elapsed = this.#duration;
      this.#active = false;
      this.#apply(this.#to.slice());
    }
    return this;
  }

  // Cancellation leaves the displayed camera untouched. It never jumps to an
  // old start or destination; a later start must supply the new current state.
  cancel() {
    this.#active = false;
    return this;
  }
}
