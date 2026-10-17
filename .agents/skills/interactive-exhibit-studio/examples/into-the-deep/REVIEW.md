# Into the Deep — rendered review

Reviewed 17 October 2026 at http://127.0.0.1:8113/ with system Chromium driven by Playwright. Desktop: 1440 × 1000. Phone portrait: 390 × 844. Phone landscape: 844 × 390. The local preview is not a published deployment. Screenshot filenames below are relative to the working project's `evidence/` directory; raw evidence is not required in a portable runtime.

## Reference and asset inspection

Opened the three generated 1536 × 1024 image originals before implementing the scene. The turtle has readable face scales, shell plates and flippers; the vampire illustration makes its webbed arms and fine feeding thread visible; the dumbo illustration prominently shows two fins. The images have a consistent dark-water treatment and directional illumination. Fine anatomy and exact natural colour were not independently validated, so the app labels the work as illustration, not observation or a scientific model.

Opened the skill's Earth reference in desktop and phone layouts, then changed its sunlight, hid clouds, and used keyboard orbit and zoom. Inspected `reference-earth-desktop.png`, `reference-earth-phone.png`, `reference-earth-light-change.png`, and `reference-earth-manipulated.png`. Its large detailed subject and compact observation control are the quality comparison. Into the Deep translates those qualities to an ocean descent, with full-scene illustration and an explicit depth instrument. It does not reuse Earth maps or globe code.

## Opening-scene pass

The initial desktop turtle scene had enough detail and scale to carry the experience. The big title, one descent button, creature inspection, and quiet depth instrument had a clear reading order. The first phone render put the turtle's face behind the title and made the smaller instrument labels too tiny.

Fixes: gave the animal a separate image band below the introduction on phones; placed its inspect label below the image; enlarged key controls and labels; blended the image band's upper edge into the dark water; replaced unsupported special arrow/pause glyphs with supported arrows and CSS marks. The revised opening was reopened and inspected in `opening-phone-v2.png` and `phone-opening-recheck.png`. The latter is a paused full-page capture, which avoids the compositor artifacts observed in one animated full-page capture. The phone intentionally scrolls to preserve animal detail.

Compressed generated PNGs into local WebP without changing content: the three runtime images total about 401 KB. Inspected them again in the app at full desktop and phone size. Face/scute, webbing and fin detail remained visible.

## Integrated art and motion pass

Inspected the full descent frame sequence (`descent-frame-0.png` through `descent-frame-4.png`), desktop twilight, midnight, creature inspection, field notes, portrait and landscape. The water loses its sunlit surface, the depth value advances, marine particles move upward, and the next specimen replaces the previous one. The transition uses an illustrative dissolve; it is not a camera simulation through one real habitat. The stationary species controls remain usable while the imagery drifts.

An integrated phone pass exposed a longer twilight heading wrapping to four lines and overlapping the image. Expanded the title to the full available width and made its type size responsive. A final independent root-agent review also found the midnight ascent button still pointed down and the dumbo label crossed a pale arm. Changed the ascent arrow to point upward and moved that desktop label into clear dark water below-left of the animal. The final recheck uses `final-phone-twilight.png` and `final-desktop-midnight.png`.

The adult-sized inspection view reads comfortably beside a large crop; the phone view places the full creature image above the text in a scrollable native dialog. Close remains reachable as the dialog scrolls. Deep-scene captions explicitly say the animals are shown with light. Full-page page captures reset scroll to the top; open dialogs use viewport captures to avoid showing unrelated offscreen page regions.

## Behavior and access pass

`tests/exhibit.cjs` exercises the actual browser and writes `test-results.json`. The test checks:

- A complete timed descent and reversal from the currently displayed depth.
- Pause stops frame drawing; paused travel is immediate; opening a field note suspends ambient work.
- Keyboard depth adjustment with Home, End and arrow keys, native dialog Escape, and focus return.
- All three creatures remain available from field notes. Merely visiting depths or waiting cannot complete the observation question; wrong and correct answers give different feedback, and the correct result survives closing/reopening the notebook during this page session.
- Initial and changed reduced-motion preference, with explicit Play still available.
- Simulated hidden-document suspension. No physical-device rendering speed is inferred.
- A failed essential image, readable factual fallback, and successful retry; delayed deep artwork presents a loading state and then becomes ready.
- Portrait and landscape without horizontal overflow; the 720 × 500 CSS viewport supplies an additional compact desktop-layout check, not a claim of testing every browser zoom implementation.

One actual focus race was found: a JavaScript close handler repeated the native dialog's focus restoration and could steal focus from the next control. Removed the redundant focus call and re-ran the keyboard sequence. Native dialog focus restoration now owns this behavior.

The final browser suite passed with no JavaScript errors or failed normal-runtime requests. The image-failure test intentionally aborts a request. No external asset requests are required. The static validator passed on the 15-file portable export (539,699 bytes at the review point). It runs on the export because downloaded third-party HTML in the research evidence is not a portable application page. A separate nested-path preview at `/portable/` also loaded and opened the dumbo field note successfully.

## Evidence and limits

Main captures: `final-desktop-sunlight.png`, `final-desktop-twilight.png`, `final-desktop-midnight.png`, `final-phone-sunlight.png`, `final-phone-twilight.png`, `final-phone-landscape.png`, `final-vampire-inspection.png`, `final-phone-inspection.png`, `final-field-notes.png`, and `failed-image-fallback.png`. The descent frame sequence supports the temporal review; static screenshots alone were not treated as proof of interaction behavior.

The exhibit is a small, complete three-encounter experience. Broad depth zones and example sightings simplify a varied ocean. Generated art is not field evidence. Creature motion is scene drift, not articulated swimming. The source text is traceable to inspected science pages in SOURCES.md. No child usability session, learning-gain study, screen-reader session, or physical-phone frame-rate measurement was performed. Browser behavior and rendered visual review do not establish those outcomes.
