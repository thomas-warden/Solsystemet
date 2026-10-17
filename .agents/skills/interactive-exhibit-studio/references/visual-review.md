# Visual review

Review the rendered exhibit against its stated direction and inspected references. Passing functional tests establishes behavior; it does not establish composition, image quality, or the feel of an interaction.

## Capture a reproducible baseline

Open the actual app in a browser. Wait for the intended route, assets, fonts, and scene state to be ready. Record the URL or revision, viewport, interaction state, and what was captured.

Capture and inspect:

- The opening composition and main exhibit on desktop.
- The same experience on a narrow phone, including its first useful control.
- The distinctive interaction before, during, and after its visible consequence.
- Any materially different view, such as a cutaway, comparison, close inspection, or contextual map.

Include tablet or landscape views when relevant to the audience or layout. Inspect the images themselves; a screenshot file's existence is not a visual review. Use the real loaded typography and intended assets, and identify any fallback that changes the result.

Check responsive text and symbols in the actual browser. Hiding a line break can join words if the markup has no space, and a subset font may render an arrow as an empty box. Verify labels and icons at normal size after fonts load.

## Evaluate the intended qualities

Use specific comparisons rather than an invented quality score:

| Area | What to look for |
| --- | --- |
| Subject presence | The main object is recognizable and carries meaningful detail at normal viewing size. |
| Composition | Scale, framing, space, and hierarchy lead attention to the exhibit and its useful action. |
| Asset fidelity | Imagery, models, materials, diagrams, and lighting support the intended representation without obvious artifacts. |
| Typography | Display type and body text have distinct roles; actual weights render correctly; instructions remain readable. |
| Interaction | The control's purpose and consequence are visible, specific to the subject, and understandable. |
| Responsive layout | The phone preserves the exhibit's central idea; the active object and control remain usable together. |
| Coherence | Navigation, detail views, sources, and feedback belong to the same visual system without every section becoming an identical card. |

Reference the inspected direction: “The fossil's surface detail disappears at the default camera distance” is actionable. “Needs more polish” is not. Do not replace evidence with arbitrary percentages, a self-awarded score, or a checklist claiming beauty has been automated.

## Watch motion over time

Record or observe a complete representative interaction, not just its final frame. Inspect the recording or a sufficient frame sequence. Include arrival, manipulation, reversal, release, pause, and reset where applicable.

- Check that a moving object, its annotations, and its controls agree about the current state.
- Examine camera starts, stops, and reversals for snaps or unexpected changes of target.
- Check reveals and comparisons for alignment, readable boundaries, and a clear visual consequence.
- Try real pointer dragging after Pause. Camera response must remain useful when ambient time has stopped; changing a control's class or value alone does not prove that the rendered view responds.
- Examine crowding over full relevant cycles. Names must not jump between positions, trail behind their objects, flicker, or remain clickable while invisible.
- Verify reduced motion and explicit pause. A focused moving link must remain usable; if a layout removes it, move focus to an appropriate visible element.

Use targeted temporal assertions for relationships such as label attachment, orbit closure, camera distance, or paused drawing. These support visual inspection. Software-rendered browser timings do not establish physical phone or tablet frame rates; report device performance only when it was actually measured on the stated device and conditions.

## Review, fix, then review the changed result

Run distinct passes over the current implementation:

1. **Scene and art direction:** inspect the first finished scene against the chosen references. Fix the material composition and asset problems before expanding it.
2. **Interaction and continuity:** inspect the complete manipulation, transitions, feedback, and return path. Fix motion and state mismatches.
3. **Responsive and accessible use:** inspect the complete experience on relevant smaller layouts and with keyboard, reduced motion, and text enlargement. Fix the observed obstacles.

For each finding, retain a short record: observed problem, affected route and state, evidence location, implemented correction, and recheck result. Reopen the changed result before marking a finding resolved. If the user requests a particular number of review passes, perform that number on successive implementations; do not relabel the same inspection as several passes.

Expand the exhibit after the representative scene meets its stated criteria. Before delivery, review representative expanded views for consistency and rerun checks affected by the changes. When a criterion remains unmet, identify it plainly and finish any independently authorized work; do not claim that unperformed review passed.

## Preserve the interaction while refining appearance

Check deliberate task completion, wrong-answer feedback where relevant, exit and return, loading, failed assets, and recovery. Verify that decorative motion cannot advance an activity and unavailable graphics do not leave instructions for unusable controls.

Keep visual and DOM reading order aligned. Test real keyboard traversal, focus after a reveal or completion, large touch targets, and hidden hit targets. Sources and material caveats must remain reachable. Avoid fixing a screenshot by hiding controls or reducing text until the activity becomes harder to use.

Finish with a concise account of what was observed and checked, plus the remaining limits. Browser checks and expert review do not establish enjoyment, independent use by children, or learning gains; report actual participant testing separately.
