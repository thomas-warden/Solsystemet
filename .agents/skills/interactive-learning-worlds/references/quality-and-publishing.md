# Quality and publishing

Use this reference to turn a plausible demonstration into a verified learning experience and a reviewable release.

## Test behavior over time

- Record a reproducible baseline before changing a motion system. Separate model movement, camera movement, label movement, visibility changes, and rendering work. A screenshot cannot establish smoothness.
- Sample a meaningful cycle or interaction sequence at controlled time steps. Include slow and fast playback, pause, scrub, reset, revisit, camera reversal, and return from offscreen. Test normal and reduced motion, including preference changes during an active visit.
- Assert relationships: an attached label keeps its intended offset; a connector stays short; rotation preserves target distance; paused clocks stay paused; offscreen clocks continue only when intended. For periodic or scientific models, check closure, units, signs, and other domain invariants against their stated conventions.
- Test collision thresholds repeatedly, including labels that disappear and return. Detect visibility chatter and ensure focusing a label does not reshuffle its neighbors. Check focus fallback after resizing and that hidden labels cannot intercept input.
- Wait for observable readiness and settled state, not arbitrary sleeps. For resize checks, confirm measured bounds match the displayed viewport and pending layout/camera changes have finished before asserting final positions.
- Pair temporal assertions with visual review of representative desktop, narrow portrait, and landscape layouts. Inspect readable text, clipped controls, loading states, and touch-target clearance. Automate the invariants most likely to regress; avoid tests that merely repeat implementation details.

## Verify learning and loading states

- Treat a scene as ready only when required content is applied to the current scene and its controls work. Keep useful fallback content visible while loading, and make partial failures understandable.
- Switch views during slow or failed loads. Obsolete completions and errors must not overwrite the current selection, imagery, readiness, or control state.
- Advance learning tasks through deliberate input or explicit observation evidence. Ambient playback, route arrival, a restored value, or a programmatic control update should not accidentally complete a task. Test prerequisites, repeat attempts, progress restoration, and reset behavior.
- Check that feedback describes what the learner actually did and that every control produces an understandable result. Remove duplicated controls or explanations when they compete for the same job.

## Keep content and claims traceable

- Record source links, attribution, license or reuse terms, and the basis of factual claims. Prefer primary sources when available. Keep the record with the project so it survives a redesign or export.
- Distinguish observed material, enhanced imagery, reconstructed surfaces, illustrative motion, and simplified models. Explain consequential simplifications where they help the learner interpret the scene; keep implementation details out of ordinary user flows.
- State what testing established. Software rendering can verify frame counts, geometry budgets, state changes, and layout; it does not prove real tablet or phone frame rates. Automated checks do not establish child usability, learning outcomes, or complete accessibility. Claim device testing or participant testing only when it actually happened.

## Export and publish a coherent result

1. Produce the complete artifact before requesting any genuinely missing publication approval. Use the destination and authorization already established in the conversation; do not ask again merely because this reference mentions publishing. If publication is not authorized, finish the build and reviewable result before asking for that specific action.
2. Verify the exported artifact through a static server or the intended hosting environment. Check nested routes or subpaths, asset resolution, dynamic imports, fonts, and fallback behavior. Opening source files directly is insufficient.
3. Version the dependency graph coherently: entry points, nested modules, assets, and any worker or application caches must resolve to a compatible release. Avoid a fresh page importing stale dependencies through inconsistent version identifiers. Verify the deployed files, rather than assuming the build configuration worked.
4. When publishing is authorized, publish the verified artifact and open the actual resulting link. Exercise representative routes and controls, inspect application errors and failed requests, and confirm that the expected release is served. Keep normal TLS verification enabled.
5. Report the live link, meaningful changes, checks performed, and any observed limitation. Distinguish local verification from live verification. If live access is blocked, say what prevented verification rather than presenting an unverified link as tested.
