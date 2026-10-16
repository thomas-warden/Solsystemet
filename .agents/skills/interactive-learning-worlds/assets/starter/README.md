# Illustrated learning starter

A dependency-free HTML/CSS/JavaScript demonstration for ages 8–10. It is an **illustrative prototype**, not a lesson about a real subject. The sizes and shapes are made-up practice samples; `sources.json` is intentionally empty. Do not present these activities as reviewed subject content.

Serve this directory over local HTTP because the app fetches `content.json`:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. No installation, build step, external font, image, library, or network service is needed. Opening `index.html` directly with a `file:` URL may block the JSON request; the app displays its retry state in that case.

## Files and extension points

- `content.json` holds schema version 1, title, topic, age range, prototype status, introduction, three learning goals, and source IDs. The scaffolder changes only title, topic, and age range. These changes do **not** turn the geometry demonstrations into a subject lesson. All displayed configuration strings use `textContent`.
- `sources.json` is the separate source registry. Add reviewed sources and connect their IDs to real subject claims before release. The runtime does not fetch this empty registry because the starter makes no subject claims.
- `index.html` keeps guide, illustration, and controls in reading order. It includes loading, failed-load retry, activity exit, activity retry, and completion states.
- `style.css` supplies responsive layouts, large controls, focus indicators, and small decorative movements. It uses local system fonts and CSS/SVG illustrations.
- `app.js` owns loading, validation, interaction state, mission completion, badge persistence, and motion preferences. `missions` supplies activity copy; `samples` supplies the abstract ordering examples. Replace the fixed demonstration logic with deliberate observations appropriate to the reviewed lesson.

## Demonstrations

1. **Compare:** move the size slider, then explicitly check the match. The target is 64 illustrative units; a tolerance of two units accepts a visual match. Merely arriving at the target does not complete the activity.
2. **Reveal:** lift the cover, inspect the star, then choose an answer. Answer events are ignored before the cover is lifted; wrong answers allow another try.
3. **Order:** use the earlier/later arrow buttons to arrange three samples from small to large, then explicitly check. Dragging is not required. The buttons keep keyboard focus on the moved sample.

Each activity awards a different named badge. Badges are stored in `localStorage`, scoped to this directory’s URL path. If reading or writing storage is blocked, the same activities still work and badges remain in memory for the current page. The page says when badges will last only for that visit. Retrying an activity never removes an earned badge.

Gentle decorative movement starts by default. The visible motion control pauses it. A reduced-motion preference starts with motion off and removes the cover transition; a learner may explicitly start decorative movement. The preference is respected again if the operating-system setting changes to reduced motion. Motion never advances or completes an activity.

## Before adapting this into a lesson

Keep `status` as `prototype` until content, source coverage, learning goals, accessibility, and actual learning interactions have been reviewed. Replacing the title alone is not enough. Check the complete flow with a keyboard and at a narrow phone width, with reduced motion and blocked storage, and with a failed content request followed by retry. Verify that correct answers require the learner’s deliberate action and that wrong answers offer useful feedback.
