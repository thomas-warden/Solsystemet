# Four-pass exhibit review — 22 October 2026

Brief: improve the discoveries and observations, Earth lighting in the Earth–Moon model, and other problems found while using the exhibit. Keep a detailed, calm visual language suitable for an eight-year-old; instructions should lead to something the learner can actually see and change.

Baseline: source `b267d2a`, matching the public site at the start of work. Chromium with software WebGL; desktop 1440×1000 and phone 390×844. Initial captures are in `/tmp/exhibit-four-passes/baseline/`. Review also uses the existing detailed Earth exhibit and its credited imagery as a visual reference. No new generated imagery is needed.

Initial findings:

- Sunrise accepted a reverse crossing of sunset as success, while the genuine dawn marker could be hidden behind Earth.
- Europa's crack observation used an unexplained cumulative light-slider threshold rather than a check of what the learner noticed.
- Returning to the Mercury final question could leave the time model reset, removing the evidence needed to answer it.
- Earth in the Earth–Moon model is muddy and dark. Its scalar cloud-density texture is incorrectly decoded as an sRGB colour image.
- The Earth–Moon Pause/time controls fall below the initial viewport. A one-option moon selector and repeated close-up links add clutter.
- Earth and Moon diameters are proportional, but the gap is compressed. The current model omits daily Earth rotation and is not an Earth-observed phase calendar. Those limits need to be clear.

Each pass below reviews the result of the previous pass, applies focused changes, and reopens the changed exhibit. Functional checks and visual inspection are recorded separately. Browser tests do not establish physical-phone frame rates or independent child usability.

## Pass 1 — Observations that match the evidence

Implemented a dawn-side camera with matching marker projection and atmospheric lighting. Moving the Earth time slider right now advances time. City choice requires confirmation; reverse sunset and passive animation cannot earn sunrise. A deliberate dawn observation enables an explicit Save action, with focus moved to that action. The captured observation remains available while exploring further.

Europa now asks the learner to distinguish visible dark lines from open water. Its explanation separates the observed surface from the inferred ocean; the cutaway remains visible with the completed discovery. Mercury removes its final question if the clock resets, so answers cannot use stale evidence.

Recheck: inspected the phone dawn capture, Europa completion with its revealed layers, and Mercury completion. Mission observations, all six mission layout sizes, five loading/failure checks, and all five cities passed. Camera cleanup after leaving, completion and reset passed. Evidence: `/tmp/solsystemet-fourpass/pass1/pass1-dawn-phone.png`, `/tmp/solsystemet-observations/observation-europa-earned-phone.png`, and `/tmp/solsystemet-observations/observation-mercury-earned-desktop.png`.

Next critique: on wide desktop Mercury's guide can cover the upper scene after the timeline is focused. Retain this concrete finding for the integrated layout pass.

## Pass 2 — Earth–Moon lighting and material detail

Corrected cloud opacity to use scalar data rather than sRGB decoding. Earth now has blue ocean reflectance, clearer cloud detail and a thin sunlit atmospheric edge. Earth and Moon share a fixed sunlight direction; low neutral fill preserves the dark hemisphere. Jupiter and Saturn retain their previous light rigs. Existing textures and sphere geometry are reused, with one additional atmospheric draw.

Recheck: compared the same desktop, phone, close-up and night-side cameras before and after the change. The cloud pattern remains detailed, the limb is restrained and the night side stays dark. Source notes identify the reflectance and atmospheric treatment as illustrative. The focused browser suite passed colour/data handling, shared sunlight, texture/geometry budget, shader compilation, actual rendered day/night luminance (70.88 versus 1.80), paused rendering, keyboard camera changes, family switching, phone layout, reduced motion and normal autoplay. Offscreen time advances without GPU draws. Syntax and whitespace checks passed. Evidence: `/tmp/earth-moon-lighting/after-desktop.png`, `after-detail.png`, `after-night.png` and `after-phone.png`.

Next critique: the smaller phone Moon needs a readable orientation guide, and the useful controls still sit below the initial view. Preserve the proportional body diameters while improving the teaching overlay and page layout.

## Pass 3 — An observable Earth–Moon experiment and usable controls

Moved Earth–Moon time controls above the scene, removed its single-option moon picker and duplicate upper close-up link, and fitted the scene to the remaining opening viewport. Larger moon families retain their established controls. Quarter-, half- and full-orbit checkpoints show both orbital travel and the matching turn, measured from Day zero.

A gold pointer follows the Moon's actual local near-side direction. It is explicitly labelled as a drawing, stays separate from the clickable name, and hides for occlusion or a nearly end-on direction. The bodies keep their proportional diameters. Notes distinguish compressed spacing, omitted daily Earth rotation and fixed illustrative sunlight from a phase calendar. Re-review added a short visible conclusion at each checkpoint; reserved space prevents the scene from jumping when that text changes.

Recheck: inspected fresh phone arrival and quarter-orbit views at 390×844, plus desktop arrival at 1440×1000. Pause, time, checkpoints and the complete scene fit together. The gold pointer is readable on the phone Moon without obscuring its name. Also inspected the compact 320×568 and landscape 844×390 views: these remain scrollable and usable rather than forcing every element into the opening screen. The focused suite passed forward/reverse checkpoint travel, actual orientation in both camera views, occlusion, paused rendering, keyboard access, cancellations, family restoration, close-up links and reduced motion. Lighting checks still pass. The science regression passed prograde motion and period closure for eight planets and twelve moons, plus actual mesh tidal locking through all orbital phases, including inclined Moon and Iapetus. Final evidence: `/tmp/solsystemet-pass3/moon-observation-390-quarter.png`, `moon-observation-1440-quarter.png`, `moon-observation-320-reduced.png` and `moon-observation-844-reduced.png`.

Next critique: failed downloads still leave imagery missing after a revisit, and the wide Mercury activity still needs a workspace that keeps the orbit scene and its evidence together. These are the final integrated pass's two concrete fixes.

## Pass 4 — Integrated critique, failures and final refinement

Pending review of the completed third pass.
