# Ocean tides — direction and review

## Direction

Let a child move the Moon and visibly reshape an exaggerated ocean around a detailed Earth, then switch the Sun's pull on/off and compare aligned versus right-angle arrangements. Retain the original same-face observation as a separate view. Prediction, direct manipulation and visible evidence should replace unnecessary reading and repeated questions.

Visual reference: the local Interactive Exhibit Studio Earth specimen (`.agents/skills/interactive-exhibit-studio/assets/reference/`) and the current Earth–Moon scene at source `55a4b75`. Opened the reference on desktop and phone, changed sunlight and camera by keyboard, and inspected its detailed surface/cloud/atmosphere composition. Captures: `/tmp/solsystemet-tides/reference-earth-{desktop,manipulated,phone}.png`; current scene: `baseline-orrery-{desktop,phone}.png` in the same directory. The specimen's large, detailed globe is the reference; the existing phone orrery's tiny Earth is too small for the new water experiment.

Composition: a larger Earth with its actual photographic map and cloud shell, a closer composed Moon orbit, two transparent ocean bulges, restrained warm sunlight and cool specular water. Dark navy, chalk white and champagne gold remain the interface palette; the water supplies the vivid cyan accent. Instrument Serif headings and compact DM Sans controls stay consistent with the app. The meaningful visual change comes from analytical water deformation, not a decorative looping video.

Phone: short heading and a compact experiment switch, one shared Play/time control, a Sun toggle and three geometry presets. The globe and primary controls must remain visible together at 390×844; short/landscape screens may scroll. Keep 44px controls, camera keyboard access, reduced motion, paused/offscreen suspension, and clear loading/retry states.

Assets: reuse existing NASA-derived Earth, cloud and Moon maps and the bundled star field. No new image downloads are needed. The ocean is an explicit model/illustration, not a new observational texture.

## Scientific contract

The equilibrium model adds the Moon and Sun quadrupole terms, with solar strength 0.46 of lunar strength. Two opposite bulges follow the gravitational gradient. The comparison gauge measures range in the shared Moon–Sun plane: lunar-only 1, aligned 1.46, right-angle 0.54. A sphere-wide maximum-minus-minimum is a different quantity and must not be used as the spring/neap comparison. Composed Moon distance does not change the physical forcing.

Visible note: **Water height exaggerated · ideal ocean.** Supporting notes explain that this is an equilibrium illustration without continents/basin response, Earth rotation, tide lag or local forecasting. It is not a flooding or tsunami model. Both aligned and opposite arrangements reinforce the tide. The Sun direction used for tide geometry and lighting must agree.

Sources inspected through verified HTTPS: [NASA: Tides](https://science.nasa.gov/moon/tides/), [NOAA: Restless Tides — Sun and Moon](https://tidesandcurrents.noaa.gov/restles4.html), and [NOAA: Equilibrium and real tides](https://tidesandcurrents.noaa.gov/restles6.html).

## Review record

### Opening scene

The first integrated tide render was too small and dark. Its long header and full-width controls consumed roughly half the desktop viewport. At 1440px, the Earth was only about 150px wide; the water largely disappeared into space. Captures: `/tmp/solsystemet-tides/first-tide-desktop.png`, `first-neap-desktop.png`, `first-tide-phone.png`.

Corrections: a desktop side panel gives the globe more room, the camera fits the composed orbit rather than an oversized bounding sphere, and the tide orbit is compressed to 2.8 scene units. The Earth–Moon diameter ratio remains unchanged. Broader blue transmission at grazing angles, sun-dependent rim reflections and fine filtered wave normals make the water silhouette visible without obscuring the photographic land/cloud maps. The Sun cue became a fixed direction compass after a projected marker overlapped the Moon's label on a phone.

### Final integrated visual review — 25 October 2026

Opened and manipulated the actual application at desktop 1440×1000 and phone 390×844. Inspected aligned and right-angle comparisons, the above view and a rotated night view. The desktop Earth is now about 350px across, with a much larger water silhouette. Both the controls and whole scene fit the normal phone arrival. The aligned bulges read clearly; the right-angle state is visibly rounder. The dark side retains a faint silhouette rather than an equally bright neon rim. No JavaScript, request or shader errors occurred in the final capture run.

Final captures: `/tmp/solsystemet-tides/final/{desktop,phone}-{spring,neap,above}.png`; optical night check: `/tmp/tide-optics/glass-night.png`. Tablet and short-phone checks at 768×1024, 1024×768, 320×568 and 844×390 found no horizontal overflow and retained 44px experiment targets. Short screens use ordinary vertical scrolling.

Inspected Mercury's compact race and desktop prediction-versus-result screen, and Europa's partial and fully lifted illustration. The partial ice gesture initially overlapped its old question with the emerging ocean label; hiding that question while dragging corrected it. Real touch events also exposed a scrolling cancellation, corrected by applying `touch-action` to the containing SVG. The release still confirms the lift; opening alone does not award a badge.

### Interaction and science checks

- The focused Tide suite covers actual Moon dragging, its visible outer limb, Earth occlusion, space/keyboard camera input, cancellation and route changes, default and reduced motion, presets, loading/retry and delayed responses, image recovery, and phone/tablet layouts. A fixed 26px pickup radius initially missed the Moon's outer limb and could intercept Earth input when the Moon was behind it; nearest-body raycasting fixed both confirmed cases.
- The tide math checks cover two opposite bulges throughout an orbit, aligned/opposite range 1.46, right-angle range 0.54, Moon-only range 1, analytical normals, continuity, frozen time and resource cleanup. The ocean uses two draw calls, one shared geometry and no new textures or independent animation loop.
- Mission flow, observations, readiness, wide layouts and direct ice dragging pass, including ungraded predictions, deliberate completion, storage failure, keyboard use and canceled gestures.
- Existing Moon observations, Earth–Moon lighting, image recovery and science checks pass. Switching from tides to Jupiter initially retained the tide-specific light direction; restoration to the original family lighting corrected it.
- All five existing regression suites ultimately pass, covering 27 logged groups including all twenty worlds, cross-scene navigation and reduced motion. The first scene run detected one late paused belt frame. Three checks after asset readiness stayed idle; a controlled late-image response produced exactly one legitimate redraw and then stopped. The unchanged scene suite passed on rerun. The initial event's cause was not recorded, so the asset-timing explanation is supported but not proven for that specific run.
- Copy measurements: world introductions/hints fell from 1,028 to 656 words (36.2%); mission copy from 349 to 224 words (35.8%). Parsed data comparison confirms orbital numbers, facts, image paths, IDs, family order, stories and source URLs are unchanged.

Browser software rendering verifies behavior and workload. It does not establish physical iPhone frame pacing or independent usability with eight-year-olds. This is an exaggerated equilibrium illustration, not a fluid simulation or a coastal tide forecast.

## Refinement review — source 761305c

The follow-up critique found four concrete weaknesses. The thick blue shell and detached white glint suggested a protective bubble; the low camera hid the opposite bulge and put the arriving Moon partly behind Earth; the tiny incoming-light compass did not explain the alignment buttons; and two actual input problems interrupted otherwise smooth exploration.

Baseline captures: `/tmp/solsystemet-tide-refine/before/`. A real pointer probe at 0.1° above the orbital plane turned the Moon about 67° after a 1px vertical movement. At exactly edge-on the interaction stalled. Grabbing a visible tangential limb instead of the centre also caused a roughly 5.3° initial jump. These were interaction defects, not frame-rate measurements. The Sun switch changed its forcing in one update with no intermediate geometry.

### Corrections and rendered recheck

- Consolidated the blue angular shading, reduced noisy ripple detail and the detached glint, and retained subtle paired accents at the actual combined-field maxima. The shape, fixed baseline, .24 display exaggeration, photographic assets and two-pass budget remain unchanged. A .20 exaggeration trial weakened the phone comparison without improving the explanation.
- Raised the view from about 26° to about 41° above the orbital plane. A roughly 50° trial improved separation but made the phone Earth too small, so it was revised. The Moon now begins beside Earth. Its original same-face phase is restored on leaving the tide view.
- Replaced ambiguous alignment labels with three small position diagrams: Same side, Right angle and Opposite side. The source-direction arrow now points **to** the Sun, rather than along incoming light. “Rise & fall” replaces the visible range heading; spring/neap terminology is explained in the expandable note.
- Trimmed the phone header and removed its repeated eyebrow to recover space for the scene. At 390×844, the globe is about 135px wide and the entire scene and controls fit together. The exaggeration/gesture captions are larger and brighter. Desktop, phone spring/neap and above-view captures were inspected at `/tmp/solsystemet-tide-refine/final/`.
- Sun contribution now eases for .35 seconds, with geometry, normals, paired maxima and the gauge using the same fractional coefficient. Reduced motion applies the final state immediately. Reversals begin from the visible state; switching off gravity leaves scene illumination intact. A captured real intermediate frame had mix .4640, forcing .21345 and aligned range 1.21345: `/tmp/solsystemet-tide-refined-regression/tides-sun-mid-frame.png` and its JSON record.
- Normal dragging preserves the initial grab offset. Near edge-on, a horizontal scrub avoids the singular ray/plane intersection and gives a brief left/right instruction. Tests use actual pointer movements above, below and exactly on the orbital plane, plus outer-limb grabs, cancellation and Earth occlusion.

The five math groups pass, including fractional contribution and analytical-normal checks. The extended Tide browser suite passes across desktop, phone and tablet layouts, with transition reversal, live preference changes, paused/offscreen rendering, route/reset settlement and loading recovery. Existing Moon observation and Earth–Moon lighting suites also pass, preserving the original orientation guide and family lighting. This refinement remains an expert/browser review; it does not establish independent comprehension by children or real-device frame pacing.
