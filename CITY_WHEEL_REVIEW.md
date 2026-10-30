# City wheel and quieter exhibit — 30 October 2026

The visual reference is the curved, shaded wheel in early Apple pickers, adapted to the exhibit’s charcoal and warm ivory palette. A translucent centre band, country subtitles, perspective compression and top/bottom fades make the selected city distinct. Desktop uses a centred dialog; phone portrait uses a bottom sheet. Native scrolling and CSS snapping carry the gesture. There is no artificial looping at the ends.

Browsing the wheel does not fetch maps or weather. Choose commits once, Cancel/Escape preserves the previous city and returns focus. The native dialog contains focus; the scrollable listbox has an active descendant and selected option. Arrow keys, Page Up/Down, Home/End and initial-letter navigation work. Reduced motion removes perspective and smooth programmatic travel, including changes while the picker is open.

Seven additions bring the atlas to fifteen cities and thirty short stories:

| City | Two natural-world subjects |
| --- | --- |
| Cape Town | Orographic tablecloth cloud; coastal upwelling |
| Nairobi | Highland climate; river drainage to the Indian Ocean |
| Cairo | Nile delta; khamsin dust winds |
| Rio de Janeiro | Resistant rock domes; mangrove nurseries |
| Amsterdam | Peat subsidence; seasonal daylight |
| Copenhagen | Glacial deposits; layered strait circulation |
| Auckland | Volcanic field; two harbours across an isthmus |

Research: linked encyclopedia pages fetched and reviewed, with supporting articles on bornhardts, mangroves, peat and subsidence. Research extracts are in /tmp/city-wheel-research. Peat oxidation/consolidation is supported by Subsidence; Amsterdam’s peatland setting by Amsterdam. Auckland’s second story uses harbour geography, avoiding two stories about volcanism. City coordinates and IANA zones are in cities.js.

Copy audit: removed the “Small worlds, big stories” and redundant moon-discovery eyebrow. Moved the changing planet image note, long solar/moon orbit descriptions and city-service explanation into the global footer’s collapsed About the models section. Shortened the beach and asteroid notes. Kept direct interaction instructions, error/retry states, weather freshness, map attribution, exaggerated ocean/scale cues and the real belt’s empty-space distinction near their subjects.

Rendered reviews: /tmp/city-explorer/integration/city-wheel-desktop.png and city-wheel-phone.png show the stationary picker; /tmp/city-wheel-curved.png shows the perspective treatment; /tmp/city-footer-phone.png shows the expanded footer. Provider fixtures in these layout captures are labelled test fixtures, not real map imagery.

Checks: full city suite (fifteen stories, navigation, weather/map failure handling, responsive layouts, wind compass); wheel commit/cancel, focus, keyboard, mouse scroll snap, request isolation and landscape centring; emulated touch swipe and live reduced-motion change; mission observations/readiness; phone exploration. A readiness test’s old expectation that city exploration must be disabled while globe assets load was updated to the existing fallback behaviour: cities remain usable while mission progression stays gated. Touch is browser-emulated; physical iPhone momentum feel has not been measured.
