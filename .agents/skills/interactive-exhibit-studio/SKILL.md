---
name: interactive-exhibit-studio
description: Create visually ambitious interactive web exhibits, explorable worlds, specimen viewers, and illustrated atlases with art direction, detailed subject assets, convincing motion, and rendered visual review. Use for requests for a premium educational explorer, immersive ocean or dinosaur experience, interactive museum, machine viewer, cultural atlas, or a Solsystemet-quality app. Also use when explicitly invoked as $interactive-exhibit-studio. The workflow includes a finished visual reference and tests the actual result in a browser.
---

# Interactive Exhibit Studio

Build an experience whose subject is immediately recognizable and compelling. Its imagery, composition, movement, and interaction should carry the experience. Preserve age-appropriate clarity, factual grounding, and access to the same content without motion.

This is a multi-file skill. Locate its complete installed directory before running bundled scripts. If supplied through a cloud skill provider, read linked resources through that provider and resolve the full package into the execution workspace; a `skill://` identifier is not a filesystem path. If only the instruction text is available, state that the bundled reference is unavailable, continue asset research and implementation with available tools, and do not claim to have inspected it.

## Establish the visual direction

1. Inspect the repository, instructions, existing assets, runtime, and delivery setup. Infer the subject, intended audience, and constraints from the request. For an unspecified family exhibit, assume ages 8–10 with accompanying adults, phone/tablet/desktop, and static web delivery. State material assumptions briefly and continue work. Ask only for missing information that would change the result.
2. Read [art direction](references/art-direction.md). Choose a relevant working reference: the [Earth exhibit](assets/reference/README.md) for a manipulable 3D subject, or [Into the Deep](examples/into-the-deep/README.md) for an illustrated environment. Run it over HTTP and visually inspect its initial scene, manipulation, and phone layout. Inspect the [Earth captures](examples/reference-captures.md) and [ocean trial captures](examples/transfer-trial.md) when browser access is unavailable. Treat its detailed assets, composition, and interaction as a concrete quality reference; choose a subject-specific visual language.
3. Record a short `ART_DIRECTION.md` in the new project: the experience promise; specific visual references; opening composition; typography and palette; asset plan; one signature interaction; and how a phone preserves the central experience. Choose a rendering technique that can realize that direction: authored imagery with layered motion, SVG/Canvas, a 3D specimen, or a living 3D environment. Explain consequential limitations honestly.
4. Gather or create the essential subject assets before filling out pages. Follow [asset production](references/asset-production.md). Inspect actual images/models at their intended display size. Use available image-generation tools for authored illustration when appropriate; record generated imagery as illustration, never as observation. Choose a coherent stylized direction if credible realistic assets are unavailable. Resolve missing central assets during implementation instead of presenting placeholders as the finished exhibit.

## Build one finished exhibit

Use the reference as executable implementation guidance. To copy it into a new directory:

```sh
python3 /path/to/interactive-exhibit-studio/scripts/scaffold.py --output /path/to/new-exhibit
```

This copies a complete Earth exhibit and its credited assets. It does not manufacture a new subject by changing its title. For another subject, build the appropriate scene and reuse only relevant code. Read [reference implementation notes](assets/reference/README.md) and [reusable patterns](assets/patterns/README.md) before adapting them.

Deliver one coherent opening scene, one meaningful manipulation, and one detail/discovery state using intended final assets. Make the subject prominent on arrival; keep its instruction and control close enough to understand together. Compose foreground, subject, and background deliberately. Give lighting a clear direction, preserve surface detail, and make scale readable. Choose typography and restrained controls that support the subject. A creature needs a credible silhouette and movement; a machine needs understandable parts; a culture exhibit needs specific people, places, objects, and context.

Run the exhibit in a real browser. Capture and inspect desktop and narrow phone views, then exercise the signature interaction over time. Compare them with the chosen references using [visual review](references/visual-review.md). Fix the largest visual or interaction weaknesses before adding breadth. This is an implementation checkpoint, not a request for extra user approval.

Once that scene establishes the standard, extend navigation and subject content. Let the subject determine the interactions: inspection, descent, layers, scale, assembly, light, time, or comparison. Add guided activities when they deepen exploration. Keep their number and format appropriate to the brief; completion requires deliberate learner input. Use [learning and sources](references/learning-and-sources.md).

## Preserve the quality in motion

- Start suitable ambient motion on arrival, with an obvious Pause control. Honor reduced motion initially and when its preference changes; explicit Play remains usable.
- Keep animation time based, camera targets coherent, and moving labels attached to the same current projection as their subjects. Use the bundled patterns where appropriate. Review full motion sequences, not just still frames.
- Keep the scene usable by keyboard and touch. Preserve focus through state changes, offer stationary access to moving subjects, and provide controls with comfortable targets.
- Model loading, ready, retry, and fallback explicitly. Load the important visual first. Avoid stale responses after navigation and dispose resources on removal.
- Set sensible pixel density, geometry, and asset budgets. Stop unnecessary rendering while paused, offscreen, or in a background tab. Software browser tests can establish behavior; they cannot establish physical-device frame pacing.

## Review the result and deliver it

Use two independent review lenses: (a) art direction, composition, asset detail, movement, and immediate appeal; (b) meaningful interaction, content, keyboard/touch access, loading, and responsive behavior. Record concrete observations and fixes in `REVIEW.md`, with capture paths and any unverified claims. Complete at least an opening-scene review and a final integrated review; each review must inspect the updated rendered result. If the user requests more passes, complete that number.

Run the bundled structural validator on a standalone static export where applicable:

```sh
python3 /path/to/interactive-exhibit-studio/scripts/validate.py /path/to/exhibit
```

The command checks portable files and references. It cannot approve visual quality, verify source truth or asset rights, or replace browser interaction tests. A framework project should also use its own build checks.

Test the signature interaction, return/revisit, phone portrait and landscape, keyboard, reduced motion, slow/failed essential assets, and persistence if present. Inspect console errors and failed requests. Retain usable fallback information. Claim child testing or hardware frame rates only when observed.

Deliver working files, run instructions, actual review evidence, credits, and any meaningful remaining limits. When publication is authorized, use the established destination, publish a coherent revision, and verify the actual resulting URL. Continue under existing authorization; do not add an approval gate just because this skill mentions publication. Distinguish local artifacts from a verified public deployment.
