# Motion and accessibility

Use these rules for moving diagrams, maps, simulations, timelines, and spatial scenes. Adapt the implementation to the platform; preserve the interaction guarantees.

## Keep motion attached to meaning

- Define arrival, reset, and return behavior. If ambient motion explains the experience, start it on entry and reset unless the user requests reduced motion. Keep an obvious pause control whose label and state reflect actual playback. Preserve a deliberate pause during the current visit.
- With reduced motion, start paused, remove decorative movement, and apply camera/layout changes immediately. If the preference is enabled during a visit, stop automatic movement and finish pending transitions. Keep deliberate playback and other essential controls usable.
- Advance the model, update the camera or viewport, and project overlays from the same state used to draw the scene. Ensure transformation matrices are current before projection; some renderers update them during drawing.
- Ease camera changes and released gestures using elapsed time, not frame counts. Orbit and zoom around the current inspection target, rather than the scene origin. Verify that an arrow rotation preserves distance from the target.

## Labels should follow their objects

- Use one predictable attachment: project the object, then add a small fixed offset. Update it directly every displayed frame. Do not ease label coordinates separately from the object, or search new rows whenever neighbors approach. A slower label trajectory makes a smooth scene appear unstable.
- Keep connectors short. Derive both ends from the same projection. Include visible extents such as surrounding structures when choosing the offset. For perspective views, calculate apparent size from camera depth rather than straight-line camera distance.
- Use the displayed viewport's dimensions, including fractional CSS pixels where applicable. Do not mix drawing-buffer pixels, rounded element sizes, and overlay coordinates.
- Cache actual label dimensions and reserved control regions. Refresh them after resize, wrapping, or font changes, rather than measuring every label every frame. Retain valid measurements when hidden elements temporarily report zero size.
- Resolve crowding through visibility, never by pushing neighboring names into new positions. Give keyboard focus highest priority, then active pointer interaction and selection; use stable ordering for the rest. Favor already visible labels to prevent repeated exchanges.
- Add visibility hysteresis: require more clearance to reappear than to remain visible, plus a short clear interval. Brief opacity fades can soften changes; remove those fades under reduced motion. Tune against the scene's speed rather than copying arbitrary durations.
- Do not pin a label to an edge while its object continues elsewhere. Fade or hide it when its attached position becomes unusable. Reappearance must use the current projection immediately, with no remembered-position glide.
- Keep focused labels usable during ordinary collisions. If a resize or scene change makes one unusable, move focus to an existing stationary control for the same object before hiding it. Do not leave focus or click targets on invisible content. Retain a stationary selection/visit path for crowded views.

## Keep controls usable while the world moves

- Provide touch targets at least 44 by 44 logical pixels, or the platform's larger recommended minimum. Include the full target in collision and toolbar-clearance calculations.
- Make document order match the intended reading and keyboard sequence on small screens. Visual CSS reordering alone does not change assistive-technology order.
- Check keyboard operation, visible focus, zoomed text, narrow portrait screens, and short landscape screens. A canvas or moving diagram cannot be the only route to its content.

## Spend rendering work where it matters

- Stop GPU draws when a paused scene has settled. Camera input, resize, changed content, and completed asset loads must invalidate it correctly. A label-only fade need not redraw an unchanged canvas.
- Offscreen scenes should skip geometry, controls, overlays, and GPU work. If a visible clock or experiment must continue, advance only its time and textual state; reconcile the visual model once on return. Specify background-tab behavior separately.
- Build fixed paths and geometry once. Reuse dynamic buffers, transforms, and text nodes; avoid replacing whole interface subtrees every frame. Choose a sensible initial quality budget before constructing expensive content, especially on small devices.

For temporal verification and evidence limits, use [Quality and publishing](quality-and-publishing.md).
