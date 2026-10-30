# Solsystemet

An interactive solar-system atlas for curious children and the adults exploring with them: eight planets, twelve moons, an asteroid flight, orbital models, and three guided discoveries.

Live site: https://thomas-warden.github.io/Solsystemet/

## Add to your iPhone Home Screen

Open the [welcome page](https://thomas-warden.github.io/Solsystemet/#explore) in Safari on your iPhone. Tap **Share → Add to Home Screen**, keep the name **Solsystemet**, then tap **Add**. This creates a shortcut to the live website. Adding it from another scene may save that scene as the shortcut's destination.

If an existing shortcut still shows the old icon, remove that Home Screen shortcut, reload the site in Safari, then add it again. iOS can cache previously saved icons.

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
- On Earth, choose **Visit** to fly toward one of fifteen cities and open its satellite/weather view: Abu Dhabi, Stockholm, Tokyo, New York, Quito, Birmingham (United Kingdom), Wellington (New Zealand), Melbourne (Australia), Cape Town, Nairobi, Cairo, Rio de Janeiro, Amsterdam, Copenhagen and Auckland. Embedded Google satellite imagery needs the browser-key setup below; the city-specific Google Maps link and current weather work without that key.
- Drag or use keyboard controls to inspect planets and moons. Every scene starts moving on arrival/reset unless reduced motion is requested. Pause remains available.
- Venus offers ordinary clouds, enhanced cloud patterns and a labelled Magellan radar reconstruction. A drawn surface marker helps show its backward rotation.
- Titan offers orange haze and a labelled surface reconstruction, with a northern-lakes viewpoint. The optional surface image can retry without interrupting the haze view.
- The solar-system model compares orbital periods, with readable or true orbital spacing, camera presets and a one-Earth-year experiment.
- Earth, Jupiter and Saturn have interactive moon systems. The asteroid belt offers an explicitly illustrated close-up flight.
- Earth–Moon orbit checkpoints show why the Moon keeps the same face toward Earth, using a labelled gold orientation pointer and visible turn/orbit feedback. Time controls remain beside the experiment on phones.
- In [**Ocean tides**](https://thomas-warden.github.io/Solsystemet/#earth-moons/tides), drag the Moon or use the position slider. Use the alignment diagrams to compare same-side, right-angle and opposite-side positions, then switch the Sun's pull off. The exaggerated water shows two bulges, and the Sun comparison blends smoothly unless reduced motion is requested. Inspect the water close up, watch a separate daily tide at an illustrated shore, replay the uneven pull, and find both big-tide positions. The guide’s comparison controls move the actual Moon.
- **Catch a sunrise:** choose a city, move forward through dawn and save what you saw. **An ocean in hiding:** spot Europa's cracks, then drag its illustrated ice layer open; keyboard controls work too. **Race around the Sun:** predict a winner, run the clock and compare Mercury's trips with Earth's year. Completed discoveries retain their evidence.
- Shorter introductions and hints keep the worlds and experiments in view. Longer stories and scientific notes remain available.
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
node tests/tide-math.mjs
node tests/tide-experiment.cjs
node tests/tide-learning.cjs
node tests/tide-realism.cjs
node tests/tide-scenarios.cjs
node tests/mission-ice-drag.cjs
node tests/city-explorer.cjs
~~~

BASE_URL overrides the site address; BROWSER_BIN defaults to /usr/bin/chromium. TEST_ARTIFACTS chooses the screenshot directory, defaulting to /tmp/solsystemet-regression.

Checks cover deliberate mission completion, badges and blocked storage, six phone/tablet layouts, keyboard navigation, default/reduced motion, all twenty worlds, Venus modes and rotation, paused/offscreen rendering, and recovery from delayed or failed imagery and lost graphics contexts. Software rendering verifies behavior and workload; physical iPad/phone tests are still needed for actual frame pacing.

The label motion check samples complete solar and lunar cycles and camera transitions. It checks that labels stay attached to their projected bodies, crowding fades settle without flicker, and visible links remain usable. Accelerated samples skip GPU drawing and do not measure hardware frame rate.

The Titan check covers distinct rendered views, the northern-lakes viewpoint, phone and keyboard exploration, motion preferences, Saturn-system navigation, optional-image retry, canceled requests and lost graphics contexts.

The observation checks reject backward sunset and passive dawn as sunrise evidence, retain Europa's revealed layers, and invalidate Mercury's question when the clock resets. The Earth–Moon lighting check verifies shader compilation, rendered day/night contrast, colour versus opacity data, family switching and paused/offscreen rendering. The Moon observation check covers checkpoint travel, actual mesh orientation, guide occlusion, input/navigation cancellation, keyboard access and compact/reduced-motion layouts.

Image recovery checks simulate failed Moon/cloud downloads, retry and revisit, preserved clock/camera state, and late responses after changing families. Wide Mercury layout checks use native keyboard focus through the race, answer feedback and completion, then verify that closing the mission restores the full exploration controls.

Tide checks cover the quadrupole model, opposite bulges, aligned/right-angle range, the Sun toggle, manipulation, motion preferences and scene lifecycle. The coastal checks cover the linked daily water level, detailed-scene loading and retry, stationary access, and phone layouts. Scenario checks compare neap, spring and closer-Moon high tides through the shared model. Europa's ice check exercises direct drag and keyboard control, including deliberate completion and retained evidence. Mercury checks require an ungraded prediction before the race and compare it with the observed counters.

City checks use explicit provider fixtures to cover globe travel, city selection, return navigation, phone/reduced-motion layouts, weather timestamps, failed or stale requests and missing/rejected map configuration. They do not verify a real Google key or imagery. Run `python3 tests/build-site-config.py` to check the required-key gate and cache invalidation when only the browser configuration changes; this check needs no running server.

## Runtime structure

- index.html, style.css, app.js: interface, routing, input and animation coordination.
- missions.js: activities, illustrated discoveries and badges.
- renderer.js: analytic WebGL2 planets and texture allocation.
- cities.js: fifteen representative city centres and their IANA civil-time zones.
- city-explorer.js: Google satellite view, external map fallback and Open-Meteo current weather.
- site-config.js: empty public browser configuration; the export builder injects a restricted Google Maps browser key when supplied.
- worlds.js, moons.js: world profiles and orbital models.
- orrery.js, moon-system.js, belt.js: Three.js scenes.
- tides.js: exaggerated ocean, tide forcing and relative range calculation.
- tide-constants.js: shared mean-Sun and closer-Moon forcing constants.
- tide-shore.js: coastal day clock, linked tidal range, labels and illustrated fallback.
- tide-coast.js: optional sandy 3D beach with reflected water, wet sand and a mean water plane driven by that clock.
- tide-guide.js: uneven-pull replay and live fixed-scale alignment comparison.
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

The output contains the runtime site, .nojekyll and build-info.json. The build record identifies `source_commit`, `asset_revision` and `google_maps_configured`, without recording the key itself. Module/style version parameters use the asset revision throughout the import chain: the committed source revision plus a key hash when configured. Changing the key therefore invalidates cached modules even when the source commit stays the same. The script refuses to overwrite an existing directory or label uncommitted source as a committed build. Publish the output at the configured GitHub Pages branch root.

The city explorer opens as a full-width atlas with a serif place heading, geographic coordinates, an unobstructed Google map and current weather. Each of the fifteen cities has two sourced stories in **Imagine that**; returning restores Earth’s stories. `city-stories.js` contains the original copy and source links. `CITY_ART_DIRECTION.md` and `CITY_ATLAS_REVIEW.md` record the redesign and browser review.

### Enable the embedded city satellite view

1. In a Google Cloud project, enable billing and the **Maps JavaScript API**, then create a browser API key. See [Google's setup instructions](https://developers.google.com/maps/documentation/javascript/get-api-key).
2. Restrict the key to **Websites**, allowing `https://thomas-warden.github.io/*`, and restrict its APIs to **Maps JavaScript API** only. Use the host-wide pattern because cross-origin referrers can omit the repository path. See [Google's key restrictions](https://developers.google.com/maps/api-security-best-practices).
3. Add the key to the cloud environment's variables sidebar as `GOOGLE_MAPS_BROWSER_KEY`. Do not paste its value into chat or commit it to source. This is a public browser key that appears in the exported `site-config.js`, protected by the restrictions above; do not supply a server key.
4. With that variable available to the build process and source changes committed, export to a new directory:

~~~sh
python3 scripts/build-site.py --require-google-maps --output /tmp/solsystemet-city-site
~~~

Publish this output to GitHub Pages. Adding or rotating the environment variable requires a fresh export and deployment, even with no source changes. `--require-google-maps` prevents an accidentally unconfigured export. With no key and without that flag, the ordinary export still provides weather and an external Google Maps satellite link; it does not embed imagery. A configured map uses the official Maps JavaScript API with its provider attribution, not extracted Google Earth images.

The city footer links to the public [city services terms and privacy notice](sources.html#city-services), which describes direct provider requests, browser storage and the applicable Google policies. Keep this notice and the map's provider attribution available when deploying.

## Scientific limits

Imagery comes from historical observations, composites and labelled reconstructions. Cloud drift, camera travel and animation rates are illustrative. Venus's cloud movement differs from the solid planet's 243-Earth-day turn; its radar colours are simulated and its marker is drawn. Europa's cutaway depicts an inferred ocean without claiming measured layer thickness or a live view.

The solar-system model uses fixed NASA/JPL orbital elements and relative periods; starting positions are illustrative rather than today's sky. Body sizes and readable orbital spacing are exaggerated. Moon paths are simplified circular models with stated inclinations and tidal locking. The Earth–Moon neighbourhood preserves the bodies' diameter ratio, compresses their separation, omits daily Earth rotation and uses fixed illustrative sunlight rather than a lunar-phase calendar. Earth local solar time in the close-up is not civil clock time, and its model has no seasons.

The city view uses representative city-centre coordinates, historical Google satellite/aerial imagery and an actual local civil clock. Open-Meteo current conditions are based on 15-minute weather-model data, separate from the globe's simulated solar-time slider. The active, visible city panel checks for updates every ten minutes, caches recent responses, labels stale data and offers Refresh after a failure. Unix timestamps are formatted in each city's time zone; temperature and wind use °C and km/h. [City imagery, weather attribution and service terms](https://thomas-warden.github.io/Solsystemet/sources.html#cities).

Ocean tides uses an ideal global-ocean quadrupole model. At mean distances, the lunar and solar forcing weights are 1 and 0.46; the relative range is 1 for Moon only, 1.46 when aligned and 0.54 at right angles. The “king tide” example holds the Moon 5% closer, increasing its forcing by inverse distance cubed and giving an aligned range of about 1.62635. This illustrates a perigean spring tide; “king tide” is an informal name, not a universal height threshold. The Sun remains at its mean distance, and the held-distance circular display is not an elliptical lunar ephemeris.

The globe, guide and sandy beach share the same forcing. The water shell and its height are greatly exaggerated, and display compression does not set the physical distance ratio. A separate beach clock shows two ideal highs and lows per lunar day (about 24 h 50 min); presets pause at the same high-water phase for comparison. Imagined terrain and generated materials are illustrative, and optical waves, reflections, foam and wetness do not alter the tide calculation. The global model omits Earth's daily spin, tidal lag and the effects of coasts, basins and weather. It is not a local tide forecast or a volume-conserving fluid simulation. [Sources and model details](https://thomas-warden.github.io/Solsystemet/sources.html#tides).

The asteroid flight compresses distances and illustrates shapes and occasional collisions; the real belt is mostly empty space. The catalogue-based sky is brightened for visibility. Atmospheres, rings and shadows are real-time approximations. Source manifests and font/Three.js licenses are bundled with the site.

City discovery stories cover distinct natural-world phenomena: climate, geology, rivers, coasts and landforms. The weather compass points towards the source of the wind and labels it “From”. See [city nature review](CITY_NATURE_REVIEW.md).

The city wheel uses native momentum scrolling with centred snap positions, fading perspective and explicit Choose/Cancel actions. Arrow keys, Home/End, Page Up/Down and initial-letter navigation work in the list; Escape cancels without leaving the city. Reduced motion removes the perspective and smooth programmatic scrolling. Long model and service notes are collected in the footer.
