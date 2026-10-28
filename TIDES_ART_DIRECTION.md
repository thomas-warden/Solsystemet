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


## Illustrated explanation and orbit spacing — 26 October 2026

The user found the Moon too close to Earth and asked for illustrations in the expandable explanation. Increased only the tide orbit from 2.8 to 3.3 scene units (+18%); one shared constant now drives the orbit and camera fit. This remains composed spacing, without changing physical tidal forcing or the Earth/Moon diameter ratio. Ordinary Earth–Moon spacing stays 4.6. Actual desktop and phone arrival, spring/neap and above views were inspected at `/tmp/solsystemet-spacing/{before,after}/`. The wider fit reduces phone Earth diameter from about135px to117px, while creating a clearer gap between the Moon and exaggerated water. Both stay usable in the complete390×844 arrival.

Replaced the three explanatory paragraphs with a static illustrated guide: a detailed Earth/Moon pair and three gold arrows showing absolute lunar pull, followed by equal-scale spring/neap comparisons. All three pull arrows point toward the Moon; increasing lengths illustrate the gravitational gradient. Short captions and accessible SVG descriptions retain the explanation without requiring animation or working WebGL. New globe stills use the existing credited maps, rendered with transparent backgrounds and consistent upper-left light. Combined runtime imagery is155KB; no additional animation loop or GPU scene runs in the guide. Provenance and a reproducible render script are included. The precise blue contours use the same quadrupole field, fixed baseline and.24 exaggeration as the interactive model. Detailed coastal limits remain in Sources & model.

The opening illustrated review found a misplaced Moon label in the authored SVG and unequal comparison widths. Both were corrected before the final integrated desktop/phone/narrow-phone review. Keyboard Enter/Space opens and closes the guide; text and diagrams stay within the viewport at1440,390 and320px. Final inspected captures: `/tmp/solsystemet-illustrated-tides/{desktop,phone,narrow}-notes.png`. A separate science/learning review confirmed all pull arrows, both spring alignments, neap orientation and concise labels; its wording suggestion made same-side/opposite-side reinforcement explicit.

The existing full Tide browser regression passes, covering real dragging, edge-on and visible-limb interaction, reduced/default motion, Sun/preset behavior, cancellation, offscreen idle, family restoration, tablet/phone layouts and failure/retry. Its large-limb fixture now explicitly zooms twice so it still tests a limb outside the former26px pickup radius after the wider camera fit. No physical-device performance or child testing was performed.

## Five learning flows — 27–28 October 2026

The next critique identified a missing connection between global bulges and a daily tide at a coast, a small phone Earth, a spring/neap comparison that required scrolling and visual memory, an unexplained far-side bulge, and a water envelope that still resembled a glass shell. The implementation keeps the existing detailed globes and 3.3-unit Moon orbit, while linking those views to a daily coastal illustration and deliberate discovery.

### 1. Arrive, then inspect the water

On phones, the main Earth scene now appears before its controls. Redundant neighbourhood links are removed from this compact view, and the whole orbit and controls fit together at 390×844. “Inspect water” pauses the orbit and moves to 0.68 of the fitted camera distance; “Whole orbit” restores the current viewport fit. The Moon's model distance and body sizes do not change. Close-view instructions point to the Moon slider when the Moon is outside the frame. A quiet neutral reference follows the solid Earth's limb, while reduced broad blue tint/front opacity preserve more photographic detail. The water's mathematical field, exaggerated height and two-pass rendering budget remain unchanged.

### 2. Move the Moon, then watch a day at the shore

A textured coastal cutaway has an independently controlled day: the gold coast marker moves through two ideal bulges, and a visible waterline crosses the same rock profile. The actual shared tide range sets the amplitude; the day slider sets phase without advancing the Moon's orbital clock. Entering the coast holds the monthly arrangement so the two clocks do not compete. A roughly 24-hour-50-minute lunar day is a simplified teaching cycle, not a prediction for a named coast.

The first visual pass rejected a geometric rock pattern and clipped phone labels. An original generated rock texture now supplies surface detail inside the authored profile; the water remains a precise SVG layer. The phone crop includes both high/low contacts. The rotating coast marker stays at a fixed radius on Earth rather than riding the changing ocean outline, and its slider has a 44px interaction area. Coastal drawing and its independent animation suspend offscreen, while paused range changes redraw once on return.

### 3. Compare spring and neap without remembering another screen

Two separate static comparison panels are replaced by one fixed-scale diagram. “Bigger change” and “Smaller change” move the actual model Moon, and the diagram's shape, Moon position and range bracket follow the same live state. It also explains the equal-range Moon-only result when solar pull is off. A round reference contour makes the changing shape easier to compare. Initial review corrected a Moon-label collision and matched the orbit's direction to the changing contour. The comparison and replay sections independently avoid drawing while offscreen.

### 4. See why the far side rises

The guide provides three stationary steps and an optional replay. Far water, Earth's centre and near water first move toward the Moon by illustrative amounts of 12, 48 and 84 SVG units. The next step recentres on Earth by subtracting 48, leaving relative offsets of −36, 0 and +36. This makes the far-side explanation visible without an outward arrow incorrectly labelled as the Moon's gravitational pull. The solid Earth does not deform. The reference shapes, sample movement and timing are deliberately schematic; they do not integrate a real fluid response. Reduced motion starts stationary; the same content remains available through keyboard buttons.

### 5. Find both big-tide positions

The challenge records a discovery only after “Check position” evaluates the actual selected Moon–Sun geometry. It requires the Sun's contribution to be on, a settled position within 10 degrees of alignment, and separate same-side/opposite-side discoveries. Rechecking one side cannot count twice. Autoplay, preset travel and dragging alone cannot finish it. Incorrect geometry and Sun-off checks give a concrete next step; Reset clears progress.

### Review evidence and verification boundary

During the 27 October implementation session, the main agent inspected phone arrival, close inspection, coast, replay and comparison captures in `/tmp/tides-five-flow-pass1/`, and the independent flow reviewer inspected `/tmp/solsystemet-five-flows/`. These were temporary artifacts from the previous runtime; they are historical review evidence and were no longer available in the resumed environment. The reviewed changes resolved the flat rock treatment, phone crop, misplaced coastal marker, Moon-label collision and dense initial composition described above.

All five desktop journeys passed before the environment disconnected. The 390px run stopped on a test-fixture assumption: arrival had a resize-preserved camera distance of 11.8423, while the current fit was 11.9387. Inspection correctly used 8.11834, and Whole orbit correctly returned to the current fit. The test must compare the restoration with that current fit, rather than demanding the exact pre-resize radius. The fixture was corrected to compare the current fit. The resumed phone, landscape and recovery checks then completed as recorded below.

On 28 October, verified HTTPS reads of NOAA's [lunar-day glossary](https://tidesandcurrents.noaa.gov/glossary.html#lunarday) confirmed the approximately 24.84-solar-hour mean lunar day. NOAA's [ideal tide explanation](https://tidesandcurrents.noaa.gov/restles3.html) describes Earth's rotation through the bulges, and its [observed-tide limits](https://tidesandcurrents.noaa.gov/restles6.html) support the explicit coastal caveats. The source notes distinguish the global equilibrium field, fixed-scale comparison, relative-pull replay and illustrative daily coast. The generated rock material has its own provenance record; it supplies appearance, not scientific evidence.

This remains browser and expert review. It does not establish independent comprehension by children, real coastal accuracy or physical-device frame pacing.


### Final integrated review — 28 October 2026

All five desktop flows and the 390px, 320px and 844px landscape journeys pass in `tests/tide-learning.cjs`. The resumed run found a real reduced-motion defect: a comparison selected while the 3D canvas was offscreen changed the Moon’s day but left its tide range stale. Tide preset settlement, paused slider input and Reset now synchronise the shared tide state immediately while preserving the dirty mesh for its next visible render. A focused offscreen keyboard/comparison regression verifies the fix. Optional coastal-module failure, explicit retry and a late guide response during navigation also pass.

The existing Tide experiment suite passes: direct dragging, large visible limbs, edge-on input, Sun transitions, paused/offscreen GPU idle, family restoration, 390/320/844 layouts, 768/1024 tablets, lazy-module recovery and image retry. All five tide-math groups pass. Existing Moon observation and Earth–Moon lighting suites pass, including keyboard camera input, reduced motion and the original same-face pointer.

Fresh final images were inspected at `/tmp/solsystemet-five-flows-final/` and `/tmp/shore-final-review/`: phone arrival/inspection, the high/low coastal waterline, the live spring/neap comparison, the far-side explanation and discovery feedback. The small coastal Earth now turns with its fixed-radius marker while its water bulges stay still; the globe orientation and baked lighting are explicitly schematic. The phone inspection preserves the wider Moon orbit and keeps the scene controls accessible. Styles from the two temporary module fragments were merged into the production stylesheet, and the obsolete static comparison layout was removed.

### Ocean visibility and coastal material refinement — 28 October 2026

The visitor should immediately see both exaggerated ocean bulges, then watch the same tidal range lift a believable body of water against a rocky shore. The existing dark editorial layout, detailed Earth and restrained gold controls remain the reference. The supplied browser annotations and the local Earth reference were inspected alongside the rendered baseline. The original coastal cutaway stays available as a working fallback.

The globe now concentrates clearer transmitted cyan outside Earth's projected solid limb and gives the full water edge enough fill to remain readable against space. Its Earth-facing layer stays transparent enough to retain cloud and continental detail. The quadrupole field, exaggeration, forcing ratio, two shared-geometry passes and caller-owned motion are unchanged. Side/overhead views, spring/neap positions, inspection and a full normal-play orbit were captured at `/tmp/tides-realism/ocean-*.png`; the temporal record is `ocean-motion.json`.

The coast uses an oblique 3D view with an authored rock shelf and outcrops, triplanar rock detail, depth-dependent water colour, a reflection of the same coast, small optical waves, broken contact foam and darker wet rock. A generated water material supplies fine surface variation; its provenance is recorded beside the existing generated rock material. The same analytical tide height positions the mean water plane, and high/low annotations project the same fixed coastal transect. The daily clock still runs independently of the held monthly Moon arrangement. Small waves do not change the reported tide height.

Three successive rendered refinement passes and a final recheck were completed:

1. **Composition and material presence.** The baseline had a flat blue water fill and a nearly straight white edge against detailed rock. The first 3D scene supplied perspective and reflections, but exposed nonseamless texture repeats, stretched rock detail and excessive wet-rock glare. Desktop and phone evidence: `coast-pass1-*.png`.
2. **Material continuity.** Mirrored water sampling, triplanar rock mapping, less reflective wet rock and nonperiodic terrain relief removed the texture slabs and metallic-looking band. The next review still found regular rows of highlights and foam extending beyond the terrain. Evidence: `coast-pass2-*.png`.
3. **Motion and shoreline contact.** Several differently directed waves with varied phase replaced the regular highlight pattern. Foam is constrained to the actual terrain, distant coast geometry continues into haze, and weathered outcrops provide relief. Five normal-play frames (`coast-pass3-sequence-*.png`) show the contact rising smoothly toward the fixed high-water marker while small reflections evolve. This review caught a hard low-tide colour boundary at the finite seabed's edge.

The final correction blends the seabed's optical contribution smoothly into deeper open water, varies the outcrop arrangement and adds static soft contact shadows. Fresh desktop, 390px and 320px images (`coast-final-*.png`) confirm that the boundary is gone and the controls, high/low labels and contact marker remain legible. The main agent inspected final desktop low water and phone high water as well as the brighter globe. Independent review records are in `/tmp/tides-realism/COAST_*_REVIEW.md`.

The detailed renderer loads only when the coast becomes visible. It owns no animation loop: TideShore supplies the time and pauses drawing when stationary, offscreen, hidden or inactive. Pixel density is capped at 1.6; the coast reflection is capped at 640px wide and static rock shadows are calculated once. Failed modules/textures or actual WebGL context loss retain the usable SVG view and offer an explicit retry. Late assets are disposed after navigation; retries create one fresh renderer. Reduced motion starts stationary and explicit Play remains available.

This is an imagined educational coast with an illustrative material treatment, not a photographic reconstruction or coastal fluid forecast. Software Chromium checks establish rendering and interaction behaviour; physical iPhone frame pacing and testing with children were not performed.

Validation: all tide-math groups and the existing tide-experiment suite pass. The new `tests/tide-realism.cjs` passes mean-level/range linkage, keyboard input, pause, reduced motion, offscreen/background idle, 390/320/844 layouts, failed module/texture retry, late-navigation disposal and real GPU-context-loss recovery. The full `tests/tide-learning.cjs` passes all five journeys and recovery checks. Its offscreen keyboard fixture initially raced the browser's asynchronous visibility observation: the canvas was geometrically offscreen while the previously delivered observer value remained visible, allowing one legitimate final frame. The test now waits for a real non-intersecting observation before the input; the range and dirty-mesh assertions remain intact. No application change was needed for that test timing issue.
