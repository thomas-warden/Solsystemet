# Optional: names attached to moving objects

Use `anchored-labels.js` and its companion CSS when moving objects need HTML links above a canvas or illustration. This pattern is independent of a rendering engine. The starter does not need it.

It keeps names at a fixed offset from their current projected bodies. Crowding changes opacity; it does not assign new positional lanes or ease a second label trajectory. It caches label dimensions, respects toolbar/footer bounds, preserves focused/hovered names during collisions, and removes invisible links from interaction.

## Integrate

1. Create a positioned scene containing a keyboard-focusable canvas and a `.anchored-label-layer` overlay. The canvas must be in the overlay's parent for focus fallback.
2. Create one layout instance for the scene. Its callback should request a frame when measured label dimensions or bounds change.
3. Add each anchor and its connector element to the overlay before registering them. Use real links, meaningful accessible names, and your own typography/colors.
4. Measure canvas, toolbar, and footer rectangles on resize or layout changes. For absent controls pass `{height: 0}`. Do not perform these reads for every label in every frame.
5. After updating camera/world matrices and rendering, project each object with the same current camera. Supply CSS-pixel centers and projected radii, visibility, frame delta in seconds, and the current motion preference.
6. Keep requesting label updates while `update()` returns true; a fade or a delayed reappearance is still settling. It need not trigger another GPU draw when the scene itself is unchanged.

```js
import { AnchoredLabels } from './anchored-labels.js';

const labels = new AnchoredLabels(overlay, () => { needsFrame = true; });
labels.add('specimen-a', specimenLink, connector);
labels.measure(canvas.getBoundingClientRect(), toolbar.getBoundingClientRect(), {height: 0});

// Run after projecting the body in the current rendered frame:
const labelsPending = labels.update([
  {id: 'specimen-a', x: projectedX, y: projectedY, radius: projectedRadius, visible: inView}
], deltaSeconds, {selected: 'specimen-a', reducedMotion: reduced.matches});
```

Preserve subpixel canvas dimensions. For a perspective projection, calculate projected radii from camera-space depth rather than Euclidean camera distance. Account for rings or other protruding geometry. Determine physical occlusion in the scene adapter and pass `visible: false` where appropriate.

## Interaction and lifecycle

While `labels.hasFocus()` is true, hold the simulation clock so keyboard users can activate a moving link. Preserve the user's Play/Pause choice and resume that state when focus leaves. A resize that makes a focused name unavailable transfers focus to the scene canvas.

Use `clear()` before removing a set of registered labels. Remove their DOM nodes yourself. Call `destroy()` when disposing the entire scene so the size observer releases its references. Each instance belongs to one overlay and document.

Adapt the gap, fade timing, and appearance to the subject only after checking representative cycles, dense views, keyboard focus, reduced motion, and smaller screens. Verify the rendered names and their hit targets; static screenshots alone do not establish stable motion.
