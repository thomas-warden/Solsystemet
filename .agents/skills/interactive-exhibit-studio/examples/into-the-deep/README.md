# Into the Deep

A small illustrated ocean expedition for ages 8–10. Pilot a descent through the sunlit ocean, twilight zone, and midnight zone; inspect a green sea turtle, vampire squid, and dumbo octopus; then use a field note to answer one observation question.

## Run

```sh
cd /path/to/IntoTheDeep
python3 -m http.server 8113 --bind 127.0.0.1
```

Open http://127.0.0.1:8113/. Any static HTTP server works. No install, API key, build step, or live asset service is needed. ES modules require HTTP rather than opening `index.html` directly.

Use the depth slider, named zone buttons, or Descend. Slider arrow keys, Home and End work. Look closer opens a stationary field note; Escape closes it. Field notes provide a permanent route to all three creatures. Pause stops ambient rendering and makes travel immediate. Reduced motion begins paused; explicit Play is available. Notes and discovery progress last only for the current page session.

## Portable files

Copy these files with their paths intact:

```text
index.html
app.js
style.css
assets/turtle.webp
assets/vampire.webp
assets/dumbo.webp
assets/dm-sans-normal-latin.woff2
assets/instrument-serif-normal-latin.woff2
assets/dmsans-OFL.txt
assets/instrumentserif-OFL.txt
ASSET_CREDITS.md
SOURCES.md
ART_DIRECTION.md
REVIEW.md
README.md
```

The three compressed illustrations together are approximately 401 KB. Each decodes to 1536 × 1024 pixels; about 18 MiB for all three uncompressed RGBA images. The particle canvas caps device pixel ratio at 1.5. The app has no 3D dependency. Background images are full illustration compositions, with restrained scene drift and an upward particle flow during descent. It is a layered 2D illustration experience, not a free-swimming 3D world or a biological simulation.

Original PNGs and research snapshots remain in the original working project. Selected review screenshots and a test report are included alongside this example in the skill package. The optional `tests/exhibit.cjs` browser harness is bundled but is not needed to run the exhibit. [SOURCES.md](SOURCES.md) retains claim excerpts and public supporting URLs even when research snapshots are omitted.

## Checks and evidence

With Node and the `playwright` package available and the server running (install Playwright in your working project with `npm install --no-save playwright` if needed):

```sh
node tests/exhibit.cjs
```

Optional `BASE_URL` and `BROWSER_BIN` environment variables select the server and Chromium executable. The test uses the machine's Chromium by default, writes `evidence/test-results.json`, and captures desktop, portrait, landscape, inspection, transition, and failure states. Tests verify behavior; the images must also be opened and reviewed. Read [REVIEW.md](REVIEW.md) for the actual visual observations and fixes.

The skill's static validator can check the portable directory:

```sh
python3 /path/to/interactive-exhibit-studio/scripts/validate.py /path/to/portable-exhibit
```

Scientific wording uses inspected NOAA, Monterey Bay Aquarium, and Smithsonian Ocean source pages. The generated creature art is explicitly illustration, with expedition lighting and compressed scales. No child session or physical-device performance measurement has been performed. The local server is a local preview, not a public deployment.
