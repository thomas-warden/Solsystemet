# Earth — a worked exhibit reference

This is the **finished Earth reference/worked example** for Interactive Exhibit Studio. It demonstrates one polished specimen, not a universal subject template. It needs deliberate adaptation before representing another subject: copying it or changing its title does not create an ocean, dinosaur, culture, or chemistry exhibit.

## Run it

Serve this directory with any static HTTP server:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. There is no install or build step. All runtime modules, images and fonts are bundled here. Source and license URLs are documentation only; the exhibit makes no external runtime requests. ES modules should be served over HTTP, not opened through a `file:` URL.

## What the scene does

The Earth combines NASA's Blue Marble surface composite, a separate cloud shell, historical night-light imagery and a thin illustrated atmospheric rim. Drag or use arrow keys to change the viewpoint. Pinch, scroll, use the zoom buttons, or press plus/minus to zoom. The sunlight slider changes the illumination direction; cloud visibility provides a second, quieter way to inspect the surface.

The moving light is an observation control, not a model of the Sun travelling around Earth. Earth’s rotation causes day and night. The scene labels this distinction. Lighting, ocean reflectance, atmospheric scattering, cloud height/shadow/drift and rotation speed are approximations. There is no weather, season or current-ephemeris simulation. Map dates differ. The explicit local source record and image credits are part of the reference.

## Subject-specific choices

- `earth-scene.js` owns Earth’s three materials and textures, the cloud shell, color-derived ocean treatment, initial geographic framing, scale and spin. These choices should **not** be carried into another subject just because they produced an attractive globe.
- `index.html` and `style.css` compose one large specimen against editorial type and a compact observation strip. A new subject should earn its own spatial composition, object scale and control vocabulary.
- The observations are about the day/night boundary, atmospheric rim and city lights. They are not a substitute for researched learning goals or appropriate activities in a new exhibit.

## Reusable pieces

- `lib/scene-host.js` is a copied, dependency-free scheduler from the skill’s patterns. It starts automatic motion unless reduced motion is requested; explicit Play remains available. It suspends frame scheduling when the canvas leaves the viewport or the document is hidden. A paused, settled scene does not redraw. Camera damping can finish while spin is paused.
- `app.js` separates loading, readiness, errors and controls. Failed images and unavailable graphics reveal a labelled flat source map with a retry action; controls stay disabled until the scene has actually rendered. Retry creates a fresh canvas, which also supports recovery after context loss.
- The texture loader caps decoded/GPU maps at 2048 pixels wide on phones and 4096 on larger screens, at or below the GPU limit. Device pixel ratio is capped. A twenty-second timeout prevents indefinite image loading. Every decoded bitmap, texture, material, geometry, observer, input listener, renderer and animation scheduler has an explicit disposal path.
- Keyboard camera controls, 44-pixel touch targets, self-hosted fonts, plain model limitations and a visible pause button are portable practices.

`EarthScene` exports the small scene adapter; `SceneHost` exports the general lifecycle/scheduling helper. Neither depends on the surrounding Solsystemet application. Three.js r180 and OrbitControls are local modules with their MIT license. DM Sans and Instrument Serif are unchanged Latin WOFF2 subsets with their SIL Open Font License notices.

## Review the reference in a browser

Inspect a desktop width and a narrow phone width. Change sunlight and confirm that the visible boundary and night lights change. Hide clouds. Orbit and zoom with both pointer and keyboard. Pause and confirm the rendered frame counter stops after camera damping settles; move a control and confirm it redraws. Scroll the scene offscreen and confirm rendering stops. Test reduced motion at startup and when the preference changes. Block a texture request, retry it successfully, and test unavailable WebGL and context loss. Verify local resource requests and inspect the source and license records before redistribution.

The visual references demonstrate composition and material detail; they are not a device frame-rate certification. Software-rendered browser tests check behavior and rendering correctness only.
