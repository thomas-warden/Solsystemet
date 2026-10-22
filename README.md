# Solsystemet

An interactive solar-system atlas for curious children and the adults exploring with them: eight planets, twelve moons, an asteroid flight, orbital models, and three guided discoveries.

Live site: https://thomas-warden.github.io/Solsystemet/

## Create another learning app

The [Interactive Exhibit Studio skill](.agents/skills/interactive-exhibit-studio/README.md) packages this project's art direction, detailed visual assets, motion, and rendered-review workflow for reuse. It includes a finished Earth reference, reusable scene patterns, subject guidance, and a transfer trial on an ocean exhibit.

Start a new Codex session in this repository and invoke `$interactive-exhibit-studio`, or follow the skill's installation instructions to use it in another project. The earlier [Interactive Learning Worlds package](.agents/skills/interactive-learning-worlds/README.md) remains available for its simple activity demonstrations.

## Run locally

From the repository directory:

~~~sh
python3 -m http.server 8087 --bind 127.0.0.1
~~~

Open http://127.0.0.1:8087/. No package install or compilation is required. Serve the app over HTTP; opening the source index.html directly as a file will not load its JavaScript modules. WebGL2 provides the interactive scenes, with still-image fallbacks on planet pages. Fonts, textures and Three.js are bundled locally.

## Explore

- Start with **Catch a sunrise**, directly on the welcome page.
- Drag or use keyboard controls to inspect planets and moons. Every scene starts moving on arrival/reset unless reduced motion is requested. Pause remains available.
- Venus offers ordinary clouds, enhanced cloud patterns and a labelled Magellan radar reconstruction. A drawn surface marker helps show its backward rotation.
- Titan offers orange haze and a labelled surface reconstruction, with a northern-lakes viewpoint. The optional surface image can retry without interrupting the haze view.
- The solar-system model compares orbital periods, with readable or true orbital spacing, camera presets and a one-Earth-year experiment.
- Earth, Jupiter and Saturn have interactive moon systems. The asteroid belt offers an explicitly illustrated close-up flight.
- Earth–Moon orbit checkpoints show why the Moon keeps the same face toward Earth, using a labelled gold orientation pointer and visible turn/orbit feedback. Time controls remain beside the experiment on phones.
- **Catch a sunrise** asks you to choose a city, move forward through dawn and save the visible observation. **An ocean in hiding** distinguishes the cracks visible on Europa from its inferred ocean, then reveals an illustrated cutaway. **Race around the Sun** compares Mercury's whole trips with Earth's year. Completed discoveries keep their evidence on screen.
- Distinct discovery badges stay on the device. Activities also work when browser storage is unavailable.

## Browser regression checks

Development checks require Node.js, Playwright and Chromium. These are available in the prepared cloud environment and are not production dependencies. On another machine, install Playwright locally and set BROWSER_BIN to its Chromium executable if needed.

With the local server running:

~~~sh
node tests/mission-flow.cjs
node tests/mission-observations.cjs
node tests/scene-regression.cjs
node tests/asset-races.cjs
node tests/science-regression.cjs
node tests/phone-exploration.cjs
node tests/mission-readiness.cjs
node tests/orbit-controls.cjs
node tests/orbit-label-motion.cjs
node tests/titan-exploration.cjs
node tests/earth-moon-lighting.cjs
node tests/moon-observation.cjs
node tests/moon-image-recovery.cjs
node tests/mission-wide-layout.cjs
~~~

BASE_URL overrides the site address; BROWSER_BIN defaults to /usr/bin/chromium. TEST_ARTIFACTS chooses the screenshot directory, defaulting to /tmp/solsystemet-regression.

Checks cover deliberate mission completion, badges and blocked storage, six phone/tablet layouts, keyboard navigation, default/reduced motion, all twenty worlds, Venus modes and rotation, paused/offscreen rendering, and recovery from delayed or failed imagery and lost graphics contexts. Software rendering verifies behavior and workload; physical iPad/phone tests are still needed for actual frame pacing.

The label motion check samples complete solar and lunar cycles and camera transitions. It checks that labels stay attached to their projected bodies, crowding fades settle without flicker, and visible links remain usable. Accelerated samples skip GPU drawing and do not measure hardware frame rate.

The Titan check covers distinct rendered views, the northern-lakes viewpoint, phone and keyboard exploration, motion preferences, Saturn-system navigation, optional-image retry, canceled requests and lost graphics contexts.

The observation checks reject backward sunset and passive dawn as sunrise evidence, retain Europa's revealed layers, and invalidate Mercury's question when the clock resets. The Earth–Moon lighting check verifies shader compilation, rendered day/night contrast, colour versus opacity data, family switching and paused/offscreen rendering. The Moon observation check covers checkpoint travel, actual mesh orientation, guide occlusion, input/navigation cancellation, keyboard access and compact/reduced-motion layouts.

Image recovery checks simulate failed Moon/cloud downloads, retry and revisit, preserved clock/camera state, and late responses after changing families. Wide Mercury layout checks use native keyboard focus through the race, answer feedback and completion, then verify that closing the mission restores the full exploration controls.

## Runtime structure

- index.html, style.css, app.js: interface, routing, input and animation coordination.
- missions.js: activities, illustrated discoveries and badges.
- renderer.js: analytic WebGL2 planets and texture allocation.
- worlds.js, moons.js: world profiles and orbital models.
- orrery.js, moon-system.js, belt.js: Three.js scenes.
- orbit-labels.js: shared planet-attached labels, collision fades and accessible hit targets.
- navigation.js, sky.js, sky-scene.js: shared navigation and sky.
- assets/ and vendor/: bundled imagery, provenance, fonts and licenses.
- sources.html: image credits and scientific limitations.
- QUALITY_REVIEW.md: the original five implementation/review passes.
- EXHIBIT_REVIEW_2026-10-22.md: the later four-pass review of discoveries, Earth–Moon lighting, observations and recovery.

## Static publication

After committing source changes:

~~~sh
python3 scripts/build-site.py --output /tmp/solsystemet-site
~~~

The output contains the runtime site, .nojekyll and build-info.json with its source revision. Module/style version parameters use that revision so a deployment loads a coherent set of files. The script refuses to overwrite an existing directory or label uncommitted source as a committed build. Publish the output at the configured GitHub Pages branch root.

## Scientific limits

Imagery comes from historical observations, composites and labelled reconstructions. Cloud drift, camera travel and animation rates are illustrative. Venus's cloud movement differs from the solid planet's 243-Earth-day turn; its radar colours are simulated and its marker is drawn. Europa's cutaway depicts an inferred ocean without claiming measured layer thickness or a live view.

The solar-system model uses fixed NASA/JPL orbital elements and relative periods; starting positions are illustrative rather than today's sky. Body sizes and readable orbital spacing are exaggerated. Moon paths are simplified circular models with stated inclinations and tidal locking. The Earth–Moon neighbourhood preserves the bodies' diameter ratio, compresses their separation, omits daily Earth rotation and uses fixed illustrative sunlight rather than a lunar-phase calendar. Earth local solar time in the close-up is not civil clock time, and its model has no seasons.

The asteroid flight compresses distances and illustrates shapes and occasional collisions; the real belt is mostly empty space. The catalogue-based sky is brightened for visibility. Atmospheres, rings and shadows are real-time approximations. Source manifests and font/Three.js licenses are bundled with the site.
