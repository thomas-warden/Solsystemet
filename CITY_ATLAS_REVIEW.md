# City atlas review — 30 October 2026

## Opening review

Reference: the existing Earth exhibit and the two user-supplied screenshots of
its original city/weather panel. The nested city widget competed with the large
Earth title, while small weather symbols and widely separated data felt detached
from the exhibit. The first implemented atlas capture used actual Google imagery
and current Open-Meteo responses on a 1385px desktop.

Changes: use the full observation width, a large Instrument Serif city name,
country, coordinates and local civil time; keep the satellite map unfiltered;
replace flat weather symbols with original gradient-lit SVG illustrations;
increase weather reading size and use the exhibit's near-black and gold palette.

## Interaction and phone review

The first rendered desktop capture exposed extra blank space from the hidden
Earth canvas remaining in normal flow. Removed that layout contribution while
preserving the hidden renderer. Phone review exposed an existing responsive DOM
move: the observation becomes a child of the narrative. Hiding the narrative
therefore also hid the map. The city layout now retains that container and hides
only the unrelated Earth copy. Fresh real-provider phone checks then loaded the
map and weather correctly.

The full-width reveal scrolls to its own heading, keeping the new map in view.
Dark 46px zoom controls and a City centre button use the provider's camera API;
Google's attribution and scale remain visible and unobscured. The map stays north
up. The short heading entrance honours reduced motion; there is no automatic
map drift to fight the visitor's navigation.

## Content review

All eight cities have two original short stories, each linked to the checked
source. City stories replace Earth stories only during a city visit. The
Imagine that jump scrolls and focuses its heading without changing the hash
route. Returning restores Earth; mission exploration does not award progress.

Checked sources: Te Ara, UNESCO, US National Park Service, Canal & River Trust,
Royal Botanic Gardens Victoria, Vasa Museum, Tokyo Skytree and Louvre Abu Dhabi.
Wellington's wind explanation uses Cook Strait's funnelling effect, without an
unsupported worldwide ranking. Birmingham's 100 miles explicitly refers to the
wider canal network. New York's inch measurements are rounded to centimetres.
Weather illustrations are authored symbols; satellite imagery is historical and
weather remains modelled current conditions.

## Integrated review evidence

Reviewed rendered desktop and 390px phone city and story captures, including
actual Wellington satellite imagery and weather, at
`/tmp/city-redesign/{desktop,phone}-wellington.png` and
`/tmp/city-redesign/{desktop,phone}-stories.png`. The final composition keeps the
place dominant, the map useful and the lower weather/stories readable. Provider
fixture checks are separately labelled and do not stand in for actual imagery.

Functional checks cover city flights and restoration, all eight story selections,
keyboard story navigation, map zoom, missing key, authentication retry, weather
errors/timeouts/stale data, delayed responses, reduced-motion changes, phone
mission interaction, and 320/390px portrait plus 844px landscape layouts.

These are browser and viewport checks, not child testing or physical iPhone
performance measurements. Native Safari frame pacing remains unmeasured.

Final integrated checks passed all ten city test groups and the existing sunrise, Europa and Mercury observation regressions. Additional actual-provider desktop views of Birmingham, Melbourne and Abu Dhabi loaded maps/weather without browser errors and were checked for place-specific story changes and Earth return.
