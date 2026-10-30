# City controls and wind dial — 30 October 2026

Direction: the restraint of Braun wall clocks, adapted to the exhibit’s dark palette. A larger charcoal face, sixty fine index marks, four cardinal labels and a single warm yellow hand replace the small decorative arrow. The dial is 104px on desktop and 80–104px on phones. It retains meteorological FROM direction, calm/missing-data states and an explicit text reading.

The Earth city control now pairs the city name with a contrasting Visit button. Both controls have 48px targets. City selectors share a quiet border, rounded corners and a drawn chevron. Browsers supporting customizable selects also receive a styled, spaced menu. Other browsers keep their native accessible picker. Selection, keyboard operation and the existing city flight remain native/event-driven; no separate custom listbox was introduced.

Visual review: desktop 1385px and phones at 390px and 320px. Captures in /tmp/city-instruments show the picker, city header, weather and opened menu. The compass has enough room for direction and speed without crowding adjacent readings. The weather/map fixtures used in these captures are for layout review, not evidence of current conditions or actual imagery.

Verification: the full city regression suite passed after the main changes, including wind pointer geometry, missing data, all cities, missions, keyboard, responsive layouts and failure recovery. Responsive checks were repeated after adding the progressively enhanced menu. No changes to map or weather provider requests.
