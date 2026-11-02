# Aurora — Sun and dynamo rebuild

Reviewed 2 November 2026. Source of visual direction: the user's rejected Aurora captures and the existing detailed Earth exhibit. No new image assets or external rendering dependencies.

## Opening-scene review

Rendered the actual WebGL page at 1080 × 802. Initial rebuild captures: `/tmp/new-aurora-system.png`, `/tmp/new-aurora-core.png`.

- A textured Sun, corona and prominence loops establish the source of the wind. Changed the wind's origin from offscreen to a fan leaving the Sun.
- First cutaway had repetitive concentric bands and excessive brightness. Removed the bands, darkened the solid mantle, shaded the two exposed faces differently, and retained a brighter flowing outer core and solid central sphere.
- Added exterior field guides connected through the cutaway, directional flow tracers, selectable layers and a projected annotation. The guides illustrate a relationship; they are not a numerical dynamo simulation.
- The original interaction required scientific controls before the visitor had a reason to use them. Replaced prominent sliders with a Sun-to-aurora journey and direct subject picking. Technical controls remain in Sources & the model.

## Integrated review

Captures under `/tmp/aurora-journey-review/`: opening, three story stages, cutaway, 390/320/844-width views and animated finale.

- Tap the visible Sun or use its keyboard-accessible button to start. A travelling brighter band reaches the magnetic environment, followed by an illustrative tail release and a polar camera transition.
- Four explicit journey positions provide stationary access and replay. Reduced motion never auto-plays the journey. Pause stops both the journey and ambient animation.
- Inside Earth supports turning, selecting exposed geometry and selecting accessible layer buttons. Projected annotations follow the same camera as the object; annotations hide when the cut face turns away.
- Phone review showed Earth too small in the overview, so its illustrative display scale was increased. Kept the cutaway prominent and moved its annotation away from the main subject. No horizontal overflow at 320, 390 or 844 pixels.
- Removed duplicate explanatory prose and the obsolete release-status overlay. Replaced an unsupported arrow glyph found in rendered buttons.
- Automated tests cover real pointer selection, keyboard/drag inspection, stationary and animated journeys, pause/resume, independent technical parameters, responsive views, reduced motion, offscreen suspension, failed imagery, retry and WebGL context loss.

## Sources and limits

Earth/cloud/night assets retain their existing credits in the model notes. Sun, corona, cutaway surfaces, flow and field guides are original procedural illustrations. Layer radii approximately match the 1,221 km inner core, 3,480 km core boundary and 6,371 km Earth radius; reference: NASA Earth facts. Interior colours/textures are illustrative, not observations. The mantle is solid rock; the outer core is liquid conducting metal; the inner core is solid.

A solar-wind disturbance does not guarantee an aurora. The journey depicts favourable magnetic conditions and a compressed sequence, not a forecast or a pressure-only aurora model. Core motion sustains the magnetic field; it does not supply the aurora's solar energy. Scale and timing are explicitly compressed.

This is a detailed interactive scientific illustration, not a photoreal simulation of inaccessible Earth layers. Chromium software rendering validates behavior and composition; physical iPhone Safari frame pacing and child usability are not verified. No 9/10 rating is claimed.
