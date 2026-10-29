# Earth to a city — visual and integration review

## Intent

Keep the exhibit's dark blue, cream and gold palette while moving from the
planet to a recognisable place. The interaction is explicit: choose a city,
then **Explore city**. The sunrise activity still uses the original city
selector and model clock.

Birmingham (United Kingdom), Wellington (New Zealand) and Melbourne
(Australia) join Abu Dhabi, Stockholm, Tokyo, New York and Quito. Shared
coordinates and IANA time zones drive the globe marker, map and weather.

## Review and refinements, 29 October 2026

1. **Camera and continuity.** A 1.65-second eased flight turns the actual globe
   toward the selected latitude and longitude before revealing the map panel.
   Camera pitch and zoom are separate from simulated solar time. Returning
   restores the preceding pose and play state. Reduced motion settles
   immediately; navigation and direct globe input cancel pending travel.
   Arrival frames were checked against central England, Cook Strait and Port
   Phillip. Dark label backings preserve contrast over bright clouds.
2. **Useful information.** The map has its own surface and keeps provider
   attribution visible. A separate weather strip uses large temperature type,
   restrained weather illustrations and three short readings. Its local civil
   clock is independent of the Earth experiment. Partly cloudy nights use a
   crescent rather than a sun. Street View is disabled to keep city changes
   consistent.
3. **Phone and keyboard.** Reviewed desktop, 390 px and 320 px phone layouts,
   plus 844 px landscape. Fixed the narrow Return to Earth button to retain a
   44 px target. Escape closes the city and keyboard focus returns to its
   launch button. Fixed mission layout rules that compressed the city panel
   and kept its sticky guide from covering the city header while scrolling.
4. **Recovery and lifecycle.** Missing configuration, map authentication
   failure, weather timeout, offline refresh, malformed weather, stale data
   and late responses have deliberate states. Last-known weather is labelled;
   unavailable readings are not fabricated. Hidden globe rendering stops,
   closed requests are cancelled and background refresh timers pause.
5. **Publication and service clarity.** A restricted browser key is injected
   into the static export. Its hash changes the entire module cache revision
   on activation or rotation. `--require-google-maps` rejects a release that
   was intended to contain Google imagery but has no key. Sources explains
   imagery age, modelled weather, service attribution and data handling.

## Evidence and limits

- `tests/city-explorer.cjs`: eight integration groups passed, including real
  globe projection and camera state, deliberate provider fixtures, failure
  recovery, motion preference changes and phone layouts.
- `tests/build-site-config.py`: required-key gate, source provenance and
  configuration-only cache invalidation passed using synthetic keys.
- Existing mission observation checks passed. A separate real-UI check
  confirmed that changing cities resets the sunrise activity without moving
  focus away from the city panel, and leaving the activity restores the
  ordinary Earth view.
- Actual, certificate-verified browser requests to Open-Meteo returned current
  weather for Birmingham, Wellington and Melbourne. Screenshots of this
  missing-key state were reviewed at phone size. These are model estimates,
  not a station observation feed.
- Google loading, authentication recovery, map reuse and attribution layout
  were tested with explicitly labelled fixtures. **Real embedded Google
  imagery remains unverified until a restricted browser key is configured.**
  No Google Earth imagery is scraped or bundled. The missing-key view provides
  an official coordinate-specific Google Maps satellite link.
- Browser checks used Chromium, including emulated phone viewports. They do
  not establish native iPhone Safari frame rate or real Google tile latency.

Session captures are in `/tmp/city-explorer/` and `/tmp/city-flight/`. These
temporary files are review evidence, not runtime assets.
