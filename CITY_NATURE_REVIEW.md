# City nature and wind review — 30 October 2026

The two stories for each city now explain different natural phenomena. Each card has one central idea, original short prose and its own source link. Buildings, museum collections and repeated variations on the same topic have been removed from this set.

| City | First subject | Second subject |
| --- | --- | --- |
| Abu Dhabi | Coastal mangroves | Evaporation and salt-flat minerals |
| Stockholm | Postglacial land rebound | Brackish Baltic water |
| Tokyo | Tectonic plates and earthquakes | Urban heat storage |
| New York | Reversing estuary currents | Glacial scratches in bedrock |
| Quito | Volcanic terrain | Equatorial daylight |
| Birmingham | Connected river drainage | Nearby ancient reef fossils |
| Wellington | Cook Strait wind funnel | Earthquake coastal uplift |
| Melbourne | Suspended river clay | Cooling lava columns |

Sources are linked directly in city-stories.js. Research checked the source pages, using local agencies where available and referenced encyclopedia articles for other geography. Wren’s Nest is explicitly in nearby Dudley; the Organ Pipes are outside Melbourne. Wellington’s uplift is scoped to the city area, roughly 1–2 metres in 1855; no unqualified “world’s windiest city” claim. Quito’s daylight is approximately twelve hours, not exactly twelve.

The wind compass points towards the source of the wind, with an explicit “From” label and accessible description. Tests measure rendered pointer geometry at the cardinal directions and the 360° wrap. Calm and unavailable/invalid data remove the needle rather than retaining an old direction. Below 1 km/h is shown without rounding it to calm.

Desktop visual review used actual Google imagery and Open-Meteo data through the configured browser key. The compass fits the existing gold, ivory and dark atlas palette. Phone review and the full city regression suite cover responsive controls, story switching, provider failures, keyboard use, motion settings and mission integration. Provider fixtures in regression tests are separate from real-service browser review.
