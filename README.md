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

## Direct navigation and asteroid flight

- Click any planet or its name in the orrery to open that world's entry. Dragging still controls the camera; the trip chart still selects an orbit to follow.
- The asteroid belt now has a dedicated entry at #belt, with three sourced stories and an imagined flight among generated rocky bodies.
- Rocks approach, tumble, pass beside the camera and disappear behind it. Pause/resume, speed, reset, pointer/keyboard look-around and view-only controls work in this scene.
- Reduced-motion preferences start the flight paused. Spacing is explicitly compressed for exploration; these are illustrative shapes, not tracked asteroids.
- belt.js contains the lazily loaded Three.js flight. #orrery-belt locates the band in the orbital model.


## Motion and close-pass revision

- Earth and all moons in the neighbourhood orreries open their entries from either the body or its name; dragging remains camera control.
- Every planet and moon close-up starts rotating on arrival, unless reduced motion is requested. Pause and Motion off stop the same motion; arriving at a new world starts it again.
- The belt's cruise speed is about a quarter of the previous speed. Fewer, much larger bodies have crater relief, broken planes, fissures and layered surface detail. Each body keeps the same mesh throughout its pass, avoiding visible detail changes.
- Bodies turn about independently chosen axes at different rates and directions. Small, occasional staged contacts release chips and a brief dust veil.
- Collision objects are pooled and recycled behind the viewer; subsequent pairs enter through the distant fog. The real belt's sparse spacing and illustrative collisions are explained in Field notes.

## Celestial background

- One locally bundled NASA/SVS catalogue-based sky map supplies varied star colours, brightness, the Milky Way and dark dust lanes. The 4096 × 2048 WebP is about 154 KiB.
- Shared sky shading appears in every planet and moon close-up, all orbital models and the asteroid flight. It is rendered behind solid bodies and transparent rings.
- The distant sky is fixed during globe rotation and close-up zoom. Three.js scenes respond to camera direction while ignoring translation, keeping stars at infinity.
- No additional animated layers or atmospheric twinkling. A sparse static fallback remains available if the map fails to load. Existing pause and reduced-motion behavior is unchanged.
- sky.js holds common exposure and sampling; sky-scene.js adds the Three.js background. Sources and artistic-exposure limits are in sources.html#sky and the sky asset manifest.

## Moon discovery and navigation

- Earth has a direct View the Moon link, with the Earth–Moon orrery as a separate destination. Jupiter and Saturn show direct moon-page links beside their descriptions and a curated set of moon cards below.
- Moon-system labels and cards open entries directly. A separately labelled orbit selector highlights a path, and parent-planet links make the way back explicit. The solar orrery has the same selection control and contextual moon-system links.
- Hash routes retain browser Back/Forward history. Optional routes such as #orrery/jupiter and #jupiter-moons/europa keep the requested world selected. Legacy #orrery-belt still resolves.
- Five expanded moon pages add sourced stories about tidal heat, lava fountains, orbital rhythm, hot springs and ice behaving as rock. The other existing moon entries remain available.

## Asteroid flight clarity and camera motion

- Pointer and keyboard input drive a single critically damped gaze. Camera position and direction follow it together, including when the pointer enters or leaves the field. Captured drags stay within the viewing limits.
- The packed 1024px rock material stores surface slopes, mineral reflectance and crevice shading. Triplanar mapping, mipmaps and anisotropic filtering keep the relief stable during motion and at oblique angles. Surface slopes are filtered before lighting, avoiding screen-space derivative artifacts at triangle edges.
- Large bodies use 160-segment terrain meshes; small bodies use 64. Meshes remain fixed for a whole pass, and rendering uses up to 2× display resolution with antialiasing. Slow travel, independent spins and staged contacts remain intact.
- The material is generated illustration, not spacecraft photography. The deterministic generator is in scripts/build-rock-material.py (Python, NumPy and Pillow).
