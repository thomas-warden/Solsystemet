import { CameraTransition } from '../camera-transition.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function close(actual, expected, message) {
  assert(actual.length === expected.length, `${message}: different state lengths`);
  actual.forEach((value, i) => {
    assert(Math.abs(value - expected[i]) < 1e-10, `${message}: component ${i}: ${value} versus ${expected[i]}`);
  });
}

function throws(action, message) {
  let rejected = false;
  try { action(); } catch (error) {
    assert(error instanceof TypeError || error instanceof RangeError, `${message}: unexpected error`);
    rejected = true;
  }
  assert(rejected, `${message}: invalid input was accepted`);
}

function recorder(options = {}) {
  const frames = [];
  const transition = new CameraTransition({ ...options, apply: state => frames.push(state) });
  return { transition, frames, current: () => frames[frames.length - 1] };
}

// Import in a browser module and await this function. No DOM or test library is
// needed; rejection identifies the first broken behavioral guarantee.
export async function runCameraTransitionTests() {
  const passed = [];
  const test = (name, check) => { check(); passed.push(name); };

  test('Equal elapsed time gives equal 2D and 3D camera positions at different frame rates', () => {
    for (const destination of [[8, -4], [8, -4, 12]]) {
      const from = destination.map(() => 0);
      const coarse = recorder({ duration: 1 });
      const fine = recorder({ duration: 1 });
      coarse.transition.start(from, destination);
      fine.transition.start(from, destination);
      assert(coarse.transition.advance(.5), 'Halfway flight must remain active');
      for (let i = 0; i < 30; i++) fine.transition.advance(1 / 60);
      close(coarse.current(), fine.current(), 'Frame-rate-independent midpoint');
      close(coarse.current(), destination.map(value => value / 2), 'Smoothstep midpoint');
      coarse.transition.advance(.5);
      for (let i = 0; i < 30; i++) fine.transition.advance(1 / 60);
      close(coarse.current(), destination, 'Coarse endpoint');
      close(fine.current(), destination, 'Fine endpoint');
      assert(!coarse.transition.active && !fine.transition.active, 'Both flights must finish');
    }
  });

  test('Default easing slows arrival and a large final delta applies the exact endpoint once', () => {
    const { transition, frames, current } = recorder({ duration: 1 });
    transition.start([0, 0], [8, -8]);
    transition.advance(.25);
    close(current(), [1.25, -1.25], 'Smoothstep quarter point');
    transition.advance(10);
    close(current(), [8, -8], 'Oversized delta endpoint');
    const count = frames.length;
    assert(!transition.advance(.1), 'Completed transition must be inactive');
    transition.finish();
    assert(frames.length === count, 'Finished camera must not keep applying the endpoint');
  });

  test('Cancellation holds the current view and an interrupted restart starts from that view', () => {
    const { transition, frames, current } = recorder({ duration: 1 });
    transition.start([0, 0, 0], [10, 20, 30]);
    transition.advance(.4);
    const interrupted = current().slice();
    const count = frames.length;
    transition.cancel();
    assert(!transition.advance(1), 'Cancelled transition must remain inactive');
    transition.finish();
    assert(frames.length === count, 'Cancel and finish-after-cancel must not move the camera');
    transition.start(interrupted, [-5, 3, 9]);
    close(current(), interrupted, 'Restart must not jump');
    transition.advance(.25);
    const secondStart = current().slice();
    transition.start(secondStart, [2, 4, 6], { duration: .2 });
    close(current(), secondStart, 'Active replacement must not jump');
    transition.advance(.2);
    close(current(), [2, 4, 6], 'Replaced flight endpoint');
  });

  test('Reduced motion finishes an active flight immediately, including a zero-time preference change', () => {
    const { transition, frames, current } = recorder();
    transition.start([1, 2, 3], [4, 5, 6]);
    transition.advance(.1);
    assert(!transition.advance(0, { reducedMotion: true }), 'Reduced motion must stop the transition');
    close(current(), [4, 5, 6], 'Reduced-motion endpoint');
    const count = frames.length;
    transition.advance(.2, { reducedMotion: true });
    assert(frames.length === count, 'Reduced-motion endpoint must not keep redrawing');
  });

  test('Immediate and zero-duration starts skip intermediate frames; overrides do not change the default', () => {
    const { transition, frames, current } = recorder({ duration: 1 });
    transition.start([0, 0], [3, 4], { immediate: true });
    assert(!transition.active && frames.length === 1, 'Immediate start must apply only the destination');
    close(current(), [3, 4], 'Immediate endpoint');
    transition.start([3, 4], [5, 6], { duration: 0 });
    assert(!transition.active && frames.length === 2, 'Zero-duration start must apply only the destination');
    transition.start([5, 6], [9, 10]);
    transition.advance(.5);
    close(current(), [7, 8], 'Default duration survives a zero-duration override');
    assert(transition.active, 'Default duration must remain one second');
  });

  test('Input arrays and callback arrays cannot mutate stored endpoints', () => {
    const from = [0, 1, 2], to = new Float32Array([10, 11, 12]);
    const { transition, frames, current } = recorder({ duration: 1 });
    transition.start(from, to);
    from[0] = 500;
    to[1] = 500;
    frames[0][2] = 500;
    transition.advance(.5);
    close(current(), [5, 6, 7], 'Copied endpoints after external mutation');
    current()[0] = 500;
    transition.finish();
    close(current(), [10, 11, 12], 'Callback mutation must not change the final endpoint');
    assert(from[1] === 1 && to[2] === 12, 'Transition must not write into caller arrays');
  });

  test('Invalid replacements and invalid time steps leave a valid active flight intact', () => {
    const { transition, frames, current } = recorder({ duration: 1 });
    transition.start([0, 0], [10, 20]);
    transition.advance(.25);
    const count = frames.length;
    const invalidStarts = [
      () => transition.start([], []),
      () => transition.start([0], [1, 2]),
      () => transition.start([0, NaN], [1, 2]),
      () => transition.start([0, 1], [1, Infinity]),
      () => transition.start('00', [1, 2]),
      () => transition.start([0, 1], [1, 2], { duration: -1 }),
      () => transition.start([0, 1], [1, 2], { immediate: 'yes' })
    ];
    invalidStarts.forEach(action => throws(action, 'Invalid replacement'));
    for (const dt of [-.1, NaN, Infinity]) throws(() => transition.advance(dt), 'Invalid delta');
    assert(transition.active && frames.length === count, 'Rejection must preserve the running flight');
    transition.advance(.25);
    close(current(), [5, 10], 'Rejected operations must not advance or replace state');
    throws(() => new CameraTransition({ apply() {}, duration: Infinity }), 'Invalid constructor duration');
    throws(() => new CameraTransition({ apply: null }), 'Missing apply callback');
  });

  test('Custom easing controls intermediate motion but completion and invalid output stay safe', () => {
    const linear = recorder({ duration: 1, ease: t => t });
    linear.transition.start([0, 0], [8, 4]);
    linear.transition.advance(.25);
    close(linear.current(), [2, 1], 'Custom linear easing');
    let broken = true;
    const faulty = recorder({ duration: 1, ease: t => broken ? NaN : t });
    faulty.transition.start([0, 0], [8, 4]);
    throws(() => faulty.transition.advance(.25), 'Nonfinite ease result');
    assert(faulty.frames.length === 1 && faulty.transition.active, 'Invalid easing must not apply a corrupt state');
    broken = false;
    faulty.transition.advance(.25);
    close(faulty.current(), [2, 1], 'Invalid easing must not advance elapsed time');
    const offset = recorder({ duration: 1, ease: () => .2 });
    offset.transition.start([0, 0], [8, 4]);
    offset.transition.advance(1);
    close(offset.current(), [8, 4], 'Completion must use the exact endpoint despite custom easing');
  });

  return passed;
}
