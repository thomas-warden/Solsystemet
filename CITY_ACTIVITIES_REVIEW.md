# City activity review — 30 October 2026

Sixteen activities across fifteen cities, entered through Try it below the satellite map. Wellington offers wind and a fault cutaway; each other city has one activity. Each has one primary control, a visible response, an optional contextual discovery, reset and motion controls. Explanations appear after deliberate interaction rather than duplicating the prompt.

## Visual review

The initial hand-shaped Table Mountain and strait were too generic. Both were replaced with actual sampled elevation grids, with height exaggeration and original surface materials. The terrain is recognizable as a geographic study; it is not satellite imagery or a photoreal reconstruction. The other scenes intentionally use illustrative landscapes and cutaways.

Opening captures: /tmp/city-activities/wellington.png and cape-town.png. Final collection review: /tmp/city-activities/contact-sheet.jpg (initial collection), updated per-city captures for Stockholm, Cairo, Copenhagen and Auckland. Auckland’s magma was initially hidden by terrain: a visible cutaway now exposes the route. Cairo’s deposit fan now has cut channels. Copenhagen’s two layers have distinct colours and opposite arrows. Static direction arrows also make the Hudson current understandable while paused. The fault view shows a separate release action, an elevated block and the sea-level reference.

Phone capture: /tmp/city-activities/phone-cloud.png. A grid minimum-width issue was fixed so the range and its end labels stay inside the narrow panel. Controls remain below a 350px scene; the terrain subject stays prominent. Sources and model detail are linked quietly from each scene. Physical iPhone frame pacing and child usability have not been measured.

## Interaction and science checks

`tests/city-activities.cjs` checks all fifteen primary activities plus Wellington’s earthquake: rendered pixel changes, intentional discovery, reset, stationary reduced motion, explicit Play, live preference changes, keyboard ranges, narrow portrait/landscape layouts and module failure/retry. Pure relationship checks cover condensation onset, equatorial versus high-latitude daylight, environmental lapse rate, wind alignment, tidal reversal and explicit fault release. The existing city suite also passes: wheel, all city stories, maps/weather failures, navigation and missions.

A stale context-loss event from a disposed renderer initially affected the next activity. The handler now checks the exact scene instance that owns the canvas. Module retries use a fresh import URL after failure. Terrain loads validate their dimensions and numeric values and discard stale completions after city changes. Only an open activity owns a WebGL renderer; closing disposes geometry, materials, textures and its context. Intersection and visibility observers suspend animation offscreen or in a hidden tab.

Models and sources are detailed at sources.html#city-experiments. In particular: wind streamlines are not CFD; cloud base uses a fixed-temperature LCL approximation; Quito uses geometric daylight; Nairobi samples a standard environmental temperature profile with a thermometer, not an adiabatically lifted parcel; delta formation does not imply the modern dammed Nile delta is uniformly growing; geological time is compressed; no earthquake or volcano prediction is offered. The two elevation grids include original tile URLs and provider attribution, and scripts/build-city-terrain.py reproduces them.

Final lifecycle review checks the canvas itself for visibility, rather than its surrounding heading; an offscreen canvas stops even if the summary remains visible. `tests/city-activity-lifecycle.cjs` exercises offscreen pause/resume, scene disposal, a terrain response arriving after a city switch, and failed-terrain retry. DEM sampling preserves horizontal grid aspect; height alone is exaggerated.
