# Solsystemet

Eight interactive planets, twelve moons, the asteroid belt, sourced stories for ages 8-9, and an explorable 3D orrery. Built on the approved Earth, Jupiter and Saturn rendering.

## Preview

Run `python3 -m http.server 8087 --bind 127.0.0.1` in this directory and open http://127.0.0.1:8087/.
No packages or build step are required. Uses WebGL2. The repository contains the complete static site and its production assets. Serve it over HTTP; opening index.html directly as a file will not load the JavaScript modules. Publishing these files to GitHub does not by itself configure public hosting.

## Revision

- Solsystemet naming throughout the user interface; voice narration removed.
- New high-resolution NASA and spacecraft-derived maps with attribution in sources.html.
- Correct geographic orientation, separate cloud opacity and night-light maps, cloud shadows, thin atmospheric limb, directional sunlight and linear-light shading.
- Jupiter uses a Cassini/Juno mosaic, with real map detail replacing painted procedural storm shapes.
- Oblate Saturn, depth-sorted transparent rings and two-way cast shadows.
- Controls below the scene. View-only mode removes the surrounding UI.
- Latitude/longitude marker and solar clock use the same planet orientation and light direction as the renderer.
- Motion toggle, reduced-motion support, keyboard controls and explicit graphics fallback.

## Eight-world revision

- Five additional worlds with inspected maps and full attribution.
- Three sourced anecdotes per world; sunlight controls and Uranus tilt demonstration.
- Earth-width outline anchored over the historical Great Red Spot at 1:11.2 scale.
- 3D orrery: inclined elliptical orbits, relative periods, orbit/zoom, following camera, inner-world and overhead views.
- Composed spacing and true orbital spacing, with enlarged bodies explicitly disclosed.
- Play/pause, speed, timeline, one-year experiment and eight whole-trip counters.
- Locally bundled Three.js r180 loads when opening the orrery or a moon-system view.

## Files

- index.html / style.css: interface
- app.js: interaction, camera, motion and geographic readouts
- renderer.js: WebGL2 planet renderer
- worlds.js: planet profiles and fixed-element Kepler model
- orrery.js: interactive Three.js orbital scene
- moons.js / moon-system.js: twelve moon profiles and three orbital systems
- vendor/: Three.js r180 and MIT license
- sources.html: full image attribution and limitations
- assets/research/PLANET_ASSET_SOURCES.json: planetary source/license evidence and hashes

## Important limits

Historical image composites are not a live feed. Cloud movement is illustrative. Atmospheric scattering, ring opacity and cloud shadows are real-time approximations. Desktop browser checks cannot establish iPad hardware performance. Unused original research downloads are excluded from the repository; their source URLs and processing notes remain in the asset manifests. All maps requested by the renderer are included.

## Moons and small worlds revision

- Twelve moon close-ups: Moon; Io, Europa, Ganymede, Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus.
- Three interactive moon-system views with sourced periods, orbit playback, a scrubber, selection, overhead/perspective views and keyboard camera control.
- Titan haze/reconstructed-surface toggle, explicitly labelled.
- Sparse illustrative asteroid belt in the orrery, with NASA stories about empty space, Ceres and Vesta.
- Twenty-four moon stories and eight more planet stories; sources linked beside the copy.
- Whole-trip counters and progress circles replace mixed decimal/percentage comparisons.
- Uranus has a drawn rotating guide dot/meridian, tilt and one-turn slider.
- `moons.js` contains profiles and family ordering; `moon-system.js` renders local moon orbits.
- Credits and reconstruction limits are recorded in `sources.html` and `assets/research/moons/MOON_ASSET_SOURCES.json`.
