# Four-pass exhibit review — 22 October 2026

Brief: improve the discoveries and observations, Earth lighting in the Earth–Moon model, and other problems found while using the exhibit. Keep a detailed, calm visual language suitable for an eight-year-old; instructions should lead to something the learner can actually see and change.

Baseline: source `b267d2a`, matching the public site at the start of work. Chromium with software WebGL; desktop 1440×1000 and phone 390×844. Initial captures are in `/tmp/exhibit-four-passes/baseline/`. Review also uses the existing detailed Earth exhibit and its credited imagery as a visual reference. No new generated imagery is needed.

Initial findings:

- Sunrise accepted a reverse crossing of sunset as success, while the genuine dawn marker could be hidden behind Earth.
- Europa's crack observation used an unexplained cumulative light-slider threshold rather than a check of what the learner noticed.
- Returning to the Mercury final question could leave the time model reset, removing the evidence needed to answer it.
- Earth in the Earth–Moon model is muddy and dark. Its scalar cloud-density texture is incorrectly decoded as an sRGB colour image.
- The Earth–Moon Pause/time controls fall below the initial viewport. A one-option moon selector and repeated close-up links add clutter.
- Earth and Moon diameters are proportional, but the gap is compressed. The current model omits daily Earth rotation and is not an Earth-observed phase calendar. Those limits need to be clear.

Each pass below reviews the result of the previous pass, applies focused changes, and reopens the changed exhibit. Functional checks and visual inspection are recorded separately. Browser tests do not establish physical-phone frame rates or independent child usability.

## Pass 1 — Observations that match the evidence

Implemented a dawn-side camera with matching marker projection and atmospheric lighting. Moving the Earth time slider right now advances time. City choice requires confirmation; reverse sunset and passive animation cannot earn sunrise. A deliberate dawn observation enables an explicit Save action, with focus moved to that action. The captured observation remains available while exploring further.

Europa now asks the learner to distinguish visible dark lines from open water. Its explanation separates the observed surface from the inferred ocean; the cutaway remains visible with the completed discovery. Mercury removes its final question if the clock resets, so answers cannot use stale evidence.

Recheck: inspected the phone dawn capture, Europa completion with its revealed layers, and Mercury completion. Mission observations, all six mission layout sizes, five loading/failure checks, and all five cities passed. Camera cleanup after leaving, completion and reset passed. Evidence: `/tmp/solsystemet-fourpass/pass1/pass1-dawn-phone.png`, `/tmp/solsystemet-observations/observation-europa-earned-phone.png`, and `/tmp/solsystemet-observations/observation-mercury-earned-desktop.png`.

Next critique: on wide desktop Mercury's guide can cover the upper scene after the timeline is focused. Retain this concrete finding for the integrated layout pass.

## Pass 2 — Earth–Moon lighting and material detail

Pass 1 has been rendered and reviewed. Lighting changes now begin from that implementation.

## Pass 3 — An observable Earth–Moon experiment and usable controls

Pending review of the completed second pass.

## Pass 4 — Integrated critique, failures and final refinement

Pending review of the completed third pass.
