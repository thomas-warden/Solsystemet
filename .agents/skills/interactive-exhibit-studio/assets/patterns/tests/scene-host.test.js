import { SceneHost } from '../scene-host.js';

function assert(value, message) { if (!value) throw new Error(message); }
function close(a, b, message) { assert(Math.abs(a - b) < 1e-9, `${message}: ${a} versus ${b}`); }

// Control browser signals and frame timestamps, rather than guessing how long
// software rendering takes. Actual DOM and browser EventTargets remain in use.
function environment({ reduced = false } = {}) {
  const restore = [], frames = new Map();
  let nextId = 0, hidden = false, observer;
  const replace = (object, name, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    Object.defineProperty(object, name, { configurable: true, value });
    restore.push(() => descriptor ? Object.defineProperty(object, name, descriptor) : delete object[name]);
  };
  const media = new EventTarget();
  media.matches = reduced;
  media.change = value => { media.matches = value; media.dispatchEvent(new Event('change')); };
  replace(window, 'matchMedia', () => media);
  replace(window, 'requestAnimationFrame', callback => { const id = nextId++; frames.set(id, callback); return id; });
  replace(window, 'cancelAnimationFrame', id => frames.delete(id));
  replace(window, 'IntersectionObserver', class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    emit(visible) {
      if (!this.disconnected) this.callback([{ target: this.target, isIntersecting: visible,
        intersectionRect: { width: visible ? 100 : 0, height: visible ? 100 : 0 } }]);
    }
  });
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  restore.push(() => hiddenDescriptor ? Object.defineProperty(document, 'hidden', hiddenDescriptor) : delete document.hidden);
  const element = document.createElement('div');
  document.body.append(element);
  return {
    element, media, frames,
    show: value => observer.emit(value),
    get disconnected() { return observer.disconnected; },
    hideDocument(value) { hidden = value; document.dispatchEvent(new Event('visibilitychange')); },
    step(timestamp) { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(timestamp); },
    restore() { element.remove(); restore.reverse().forEach(action => action()); },
  };
}

export async function runSceneHostTests() {
  const passed = [];
  function test(name, check, options) {
    const env = environment(options);
    const hosts = [];
    const create = settings => { const host = new SceneHost({ element: env.element, ...settings }); hosts.push(host); return host; };
    try { check(env, create); passed.push(name); }
    finally { hosts.forEach(host => host.destroy()); env.restore(); }
  }

  test('Entry, pause, revisit and reset follow explicit playback policy', (env, create) => {
    let draws = 0;
    const host = create({ render: () => draws++ });
    assert(!host.state.active && !env.frames.size, 'Construction must not start a scene');
    host.enter();
    assert(!env.frames.size, 'Wait for initial intersection before drawing');
    env.show(true); env.step(0); env.step(20);
    close(host.state.time, .02, 'Ambient simulation advances');
    host.pause(); env.step(40);
    const pausedDraws = draws;
    env.step(60); env.step(80);
    assert(draws === pausedDraws && env.frames.size === 0, 'Paused scene must settle without RAF or draws');
    host.enter();
    assert(!host.state.playing, 'Repeated enter on active view preserves pause');
    host.leave(); host.enter();
    assert(host.state.playing, 'A new visit starts ambient motion');
    host.enter({ resetTime: true });
    assert(host.state.time === 0 && host.state.playing, 'Reset restarts time and motion');
  });

  test('Paused invalidation and camera settling draw only when needed', (env, create) => {
    let draws = 0, remaining = 0;
    const host = create({ defaultMotion: false, update: () => {
      const changed = remaining > 0;
      if (changed) remaining--;
      return { changed, needsFrame: remaining > 0 };
    }, render: () => draws++ });
    host.enter(); env.show(true); env.step(0);
    assert(draws === 1 && !env.frames.size, 'Initial still draws once');
    host.invalidate(); env.step(50);
    assert(draws === 2 && !env.frames.size, 'Async content or resize redraws once');
    remaining = 3; host.requestFrame();
    env.step(60); env.step(80); env.step(100);
    assert(draws === 5 && !env.frames.size, 'Paused camera finishes and stops');
    close(host.state.time, 0, 'Camera motion does not advance simulation time');
  });

  test('Reduced motion starts paused, changes mid-visit, and permits explicit Play', (env, create) => {
    const changes = [];
    const host = create({ onMotionPreferenceChange: value => changes.push(value) });
    host.enter(); env.show(true); env.step(0);
    assert(!host.state.playing, 'Initial reduced preference stops automatic motion');
    host.play(); env.step(10); env.step(30);
    assert(host.state.playing && host.state.time > 0, 'Explicit Play remains usable');
    env.media.change(false);
    assert(host.state.playing, 'Removing preference preserves explicit playback');
    env.media.change(true);
    assert(!host.state.playing && changes.join(',') === 'false,true', 'Enabling preference pauses and notifies adapter');
    env.media.change(false);
    assert(!host.state.playing, 'Removing preference must not silently restart');
  }, { reduced: true });

  test('Offscreen and hidden scenes suspend work without elapsed-time jumps', (env, create) => {
    let updates = 0, draws = 0;
    const host = create({ update: () => { updates++; return {}; }, render: () => draws++ });
    host.enter(); env.show(true); env.step(0); env.step(20);
    const time = host.state.time, before = [updates, draws];
    env.show(false); host.invalidate(); env.step(10000);
    assert(updates === before[0] && draws === before[1] && !env.frames.size, 'Offscreen default performs no scene work');
    env.show(true); env.step(20000);
    close(host.state.time, time, 'Return does not catch up hidden interval');
    env.step(20020);
    close(host.state.time, time + .02, 'Normal stepping resumes');
    env.hideDocument(true); env.step(30000);
    const hiddenTime = host.state.time;
    env.hideDocument(false); env.step(40000);
    close(host.state.time, hiddenTime, 'Background tab interval is excluded');
    env.step(41000);
    close(host.state.time, hiddenTime + .05, 'A long active frame is capped');
  });

  test('Optional offscreen clock continues without geometry or GPU callbacks', (env, create) => {
    let updates = 0, draws = 0, readouts = 0;
    const host = create({ update: () => { updates++; return {}; }, render: () => draws++, advanceOffscreen: () => readouts++ });
    host.enter(); env.show(true); env.step(0); env.step(20);
    env.show(false); const before = [updates, draws];
    env.step(100); env.step(120);
    close(host.state.time, .04, 'Cheap clock continues');
    assert(readouts === 2 && updates === before[0] && draws === before[1], 'Only offscreen callback runs');
    host.pause(); env.step(140);
    assert(readouts === 2 && !env.frames.size, 'Paused offscreen clock is a cheap no-op');
    host.play(); env.hideDocument(true); env.step(200);
    assert(readouts === 2, 'Hidden tab also suspends optional clock');
  });

  test('Focus hold preserves Play/Pause choice and cannot override manual pause', (env, create) => {
    const host = create({});
    host.enter(); env.show(true); env.step(0); env.step(20);
    host.setHeld(true); env.step(40); env.step(60);
    assert(host.state.playing && !host.state.running, 'Hold keeps user playback choice');
    close(host.state.time, .02, 'Held simulation stays still');
    host.setHeld(false); env.step(80); env.step(100);
    close(host.state.time, .04, 'Release resumes existing Play choice');
    host.setHeld(true); host.pause(); host.setHeld(false); env.step(120);
    assert(!host.state.playing && !env.frames.size, 'Release does not undo manual pause');
  });

  test('Leaving or destroying during update never renders disposed scene content', (env, create) => {
    for (const action of ['leave', 'destroy']) {
      let draws = 0;
      const host = create({ update: () => { host[action](); return { changed: true, needsFrame: true }; }, render: () => draws++ });
      host.enter(); env.show(true); env.step(0);
      assert(draws === 0 && !env.frames.size, `${action} must prevent the pending draw`);
      host.destroy();
    }
  });

  test('Errors stop the loop and destruction removes observers and listeners', (env, create) => {
    let errors = 0, states = 0;
    const host = create({ update: () => { throw new Error('Controlled scene failure'); },
      onError: () => errors++, onStateChange: () => states++ });
    host.enter(); env.show(true); env.step(0); env.step(20);
    assert(errors === 1 && !host.state.active && !env.frames.size, 'Fail once without an error/render loop');
    assert(host.state.error?.message === 'Controlled scene failure', 'Expose recovery reason');
    host.destroy(); const before = states;
    env.media.change(true); env.hideDocument(true); env.show(false);
    host.invalidate(); host.enter(); env.step(100);
    assert(env.disconnected && !env.frames.size && states === before, 'Destroyed host cannot restart or receive events');
  });

  test('Destroy is terminal before state callbacks can re-enter lifecycle methods', (env, create) => {
    let host, destroyedEvents = 0;
    host = create({ onStateChange: state => {
      if (!state.destroyed) return;
      destroyedEvents++;
      host.destroy(); host.enter(); host.play(); host.invalidate();
    } });
    host.enter(); env.show(true); env.step(0);
    host.destroy();
    assert(destroyedEvents === 1 && host.state.destroyed && !host.state.active && !host.state.playing,
      'Reentrant callbacks cannot recurse or restart a destroyed host');
    assert(!env.frames.size && env.disconnected, 'Destroy cancels frames and observers before notifying');
  });
  return passed;
}
