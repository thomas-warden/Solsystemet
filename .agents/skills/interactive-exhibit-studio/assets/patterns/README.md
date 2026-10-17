# Small scene patterns

Copy the modules you need into an application. They have no package, renderer, framework, or network dependencies. The [finished Earth reference](../reference/README.md) demonstrates scene ownership in a complete exhibit; these helpers do not supply its art direction, lighting, materials, or learning content.

| Module | Owns | Application still owns |
| --- | --- | --- |
| `scene-host.js` | Frame scheduling, playback, elapsed simulation time, visibility, reduced-motion policy | Assets, model, renderer, camera controls, route lifecycle, errors shown to users |
| `camera-transition.js` | A timed interpolation between numeric camera states | Camera coordinate conventions, presets, drag gestures, rotation-aware interpolation |
| `anchored-labels.js` + `.css` | Direct label attachment, collision visibility, focus fallback, size caching | Projection, occlusion, selected item, measured toolbar bounds, a persistent alternative item list |

Use browser ES modules over HTTP, not `file://`. Modern browsers provide `requestAnimationFrame`, `matchMedia`, and module support. `SceneHost` falls back to bounds checks when IntersectionObserver is unavailable. Without ResizeObserver, call `labels.measure()` after any layout, text, or font change.

## SceneHost: one owner for playback and frames

```js
import { SceneHost } from './scene-host.js';

const host = new SceneHost({
  element: canvas,
  update({ dt, time, running, reducedMotion }) {
    // time is cumulative simulation seconds; dt is this visible frame's seconds.
    if (running) model.setTime(time);
    const cameraChanged = controls.update(dt, { reducedMotion });
    return {
      changed: running || cameraChanged,
      needsFrame: controls.isSettling(),
    };
  },
  render() { renderer.draw(model, controls.camera); },
  onStateChange(state) {
    playButton.textContent = state.playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(state.playing));
  },
  onMotionPreferenceChange(reduced) {
    if (reduced) {
      controls.cancelInertia();
      cameraFlight.finish();
    }
  },
  onError(error) { showSceneFallback(error); },
});

const togglePlayback = () => host.toggle();
playButton.addEventListener('click', togglePlayback);
await loadRequiredAssets();
host.enter();                  // Call only when this route is ready to use.
// Route exit: host.leave(). Route return: host.enter().
// Reset: reset the model/camera, then host.enter({ resetTime: true }).
```

`model`, `controls`, `renderer`, and `cameraFlight` above are application adapters, not imports supplied by SceneHost. `controls.update()` must report actual camera change and stop requesting frames after damping settles. Do not permanently return `needsFrame: true`.

Playback policy is deliberate:

- A new visit starts ambient motion by default. Initial reduced motion starts paused. Use `defaultMotion: false` for scenes where unsolicited motion would obstruct the activity.
- Enabling reduced motion during a visit pauses the simulation and calls `onMotionPreferenceChange`. Removing the preference preserves the current playback choice. Explicit Play remains available.
- `pause()` stops simulation time. Camera interaction and label fades can still finish. `enter()` on an already active scene preserves manual pause; `enter({ resetTime: true })` explicitly restarts the scene.
- `setHeld(true)` temporarily holds simulation motion, for example while a label has keyboard focus. It preserves the user's Play/Pause choice. Releasing a hold cannot undo manual pause.
- `playing` is the chosen playback state; `running` also requires an active, visible, unheld scene. Read `state.time` for the simulation clock. `onStateChange` reports lifecycle and playback changes, not every elapsed-time tick.

`update(context)` runs before `render(context)`. Its result has two independent fields:

| Result | Meaning |
| --- | --- |
| `changed: true` | The canvas needs a draw now. Defaults to `running && dt > 0` when omitted. |
| `needsFrame: true` | Call update again, even while paused. A DOM label fade can need a frame without a GPU draw. |

`host.invalidate()` marks the canvas dirty and schedules a frame. Use it after resize, asset completion, or a direct model/camera change. `host.requestFrame()` schedules an update without forcing a draw; use it when paused camera damping or DOM label changes need evaluation. A stopped, clean scene schedules no frames.

The first frame after entry, a visibility change, or resumed scheduling has `dt = 0`. Long active frames are capped by `maxDelta` (default `0.05` seconds). `time` is simulation time, not wall time; hidden intervals are excluded. The application can scale simulation time without changing camera transition time.

Offscreen scenes skip update and render; hidden documents stop all work. If a visible experiment readout must keep advancing after its canvas scrolls away, supply:

```js
advanceOffscreen({ time }) {
  experimentReadout.textContent = formatSimulationTime(time);
}
```

This opt-in callback receives the same clock, but must avoid geometry, controls, labels, or GPU work. On re-entry, reconstruct the visible model from `time`; integrating only the last `dt` would lose the offscreen interval. Paused offscreen scenes and hidden documents still stop completely. IntersectionObserver detects viewport intersection, not every kind of visual occlusion: call `leave()` for inactive application tabs and routes.

Destroy the host before disposing resources it could draw. Destruction cancels frames and removes its own listeners/observer; it does not remove application input handlers or dispose a renderer:

```js
host.destroy();
playButton.removeEventListener('click', togglePlayback);
labels.destroy();
controls.dispose();
renderer.dispose();
```

An exception from update/render stops the scene and reaches `onError`. Show a usable fallback; retry only after the application has repaired or rebuilt the failed resources. Constructor state callbacks receive a state argument immediately: use that argument rather than referencing a not-yet-assigned `const host`.

## CameraTransition: elapsed time, explicit endpoints

```js
import { CameraTransition } from './camera-transition.js';

// 2D example: pan X, pan Y, zoom. A 3D adapter can use position and target XYZ.
const cameraFlight = new CameraTransition({
  duration: 0.7,
  apply([x, y, zoom]) { camera.setView(x, y, zoom); },
});

function goToPreset(destination) {
  cameraFlight.start(camera.getView(), destination, {
    immediate: host.state.reducedMotion,
  });
  host.invalidate(); // Immediate/reduced transitions also need their final draw.
}

// Inside SceneHost.update, including while the simulation is paused:
const wasFlying = cameraFlight.active;
cameraFlight.advance(dt, { reducedMotion });
// Include wasFlying in `changed`, and cameraFlight.active in `needsFrame`.
// The final frame must draw even though active has just become false.
```

`start(from, to, { duration, immediate })` copies equal-length finite numeric arrays. `advance(dt)` returns whether another flight frame is needed. The default smoothstep curve eases departure and arrival; `finish()` applies the exact endpoint. A preference-change callback can call `finish()` immediately. `cancel()` preserves the current view; cancel on a new drag and restart from the currently displayed view, never an old preset.

This interpolator intentionally does not infer camera semantics. Unwrap angles before interpolation. Use quaternion slerp for rotations rather than treating quaternion components as ordinary coordinates. For orbiting cameras, compute presets and keyboard moves relative to the current target, then add that target back; origin-relative calculations break follow mode.

## AnchoredLabels: one projection, no independent chase

Place the canvas and overlay in the same positioned, untransformed coordinate container. Load `anchored-labels.css`. The overlay must have the same CSS dimensions and origin as the canvas; drawing-buffer pixels are not label coordinates.

```html
<div class="scene" style="position: relative">
  <canvas tabindex="0" aria-label="Interactive exhibit"></canvas>
  <div class="anchored-label-layer"></div>
</div>
```

```js
import { AnchoredLabels } from './anchored-labels.js';

const labels = new AnchoredLabels(labelLayer, () => {
  host.setHeld(labels.hasFocus());
  host.requestFrame();
}, { focusTarget: canvas });

// Append before registration. Use a real button or link, with an accessible name.
labelLayer.append(subjectButton, subjectWire);
labels.add('subject', subjectButton, subjectWire);

function onResize() {
  const box = canvas.getBoundingClientRect();
  resizeRenderer(box.width, box.height);
  labels.measure(box, toolbar.getBoundingClientRect(), footer.getBoundingClientRect());
  host.invalidate();
}

// Inside the same update that moves objects and cameras:
updateWorldAndCameraMatrices();
const labelsPending = labels.update([
  { id: 'subject', x: cssX, y: cssY, radius: projectedRadius, visible: inFront },
], dt, { selected: selectedId, reducedMotion });
// Include labelsPending in `needsFrame`. It need not imply a canvas redraw.
```

Projection rules are the integration contract:

- Use the current frame's object and camera transforms before projecting. In 3D engines, explicitly update matrices if they normally refresh only during rendering. A label derived from last frame's camera will visibly lag even when the label helper is correct.
- Project into `labels.bounds.width` and `.height`, which retain fractional CSS dimensions from the latest measurement. Use camera view depth for perspective projected radius, not Euclidean camera distance. Include protruding shapes such as rings, handles, or fins in the intended silhouette clearance.
- Keep item order stable. Each label sits exactly at `x + radius + 10`, vertically centered on `y`. A short connector stays attached. Never ease the label separately, clamp it to an unrelated position, or send it to greedy collision lanes.
- Supply `visible: false` for objects behind the camera or otherwise occluded. Omitted/invalid projections immediately remove stale input targets. The helper does not perform raycasting or infer physical occlusion.

Crowding changes visibility. Focus outranks hover, selection, and existing visible labels; established labels win otherwise. A returning label needs wider clearance and 0.3 seconds of stability before fading in. Reduced motion settles visibility immediately. Input is disabled as soon as a label loses its place, even during fade-out.

Call `measure()` on container/toolbar/footer resize, layout mode changes, and initial readiness. Toolbar and footer arguments reserve rectangular top/bottom strips; omit absent regions. Do not pass a toolbar that lives outside the canvas merely because it exists elsewhere on the page. No per-label layout measurement occurs inside `update()`. ResizeObserver refreshes dimensions when text or fonts change, including while a label is invisible; hidden boxes remain measurable through `visibility: hidden`.

If a focused label can no longer fit after resize, focus moves to the explicitly supplied scene target. Targets are at least 44×44 CSS pixels. Keep a persistent subject list or inspector outside the scene so collision-hidden labels are never the only route to information. `clear()` hides and unregisters entries without removing their DOM nodes; the application owns DOM removal. `destroy()` also disconnects observers and listeners.

## Run the browser tests

From this directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/tests/`. The page reports every passing case and exposes `{ passed, errors, done }` at `window.patternTestResults` for a browser driver. The tests require no packages. Scene scheduling tests control browser signals and timestamps; label tests use real DOM layout, focus, and ResizeObserver.

Coverage includes playback/revisit/reset, initial and changed reduced motion, paused settling, offscreen clocks, hidden documents, teardown reentrancy, camera interruption and elapsed-time invariance, 1,200 moving label projections, collision hysteresis, keyboard focus recovery, translated/hidden label resizing, and no layout reads inside label frame updates. These are behavior and geometry checks, not real-device frame-rate certification. An application's scene still needs screenshots, route/resize tests, rendering-cost checks, and testing on its intended devices.
