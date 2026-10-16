---
name: interactive-learning-worlds
description: Build, improve, or review polished interactive educational web apps for children, with explorable subjects, meaningful hands-on activities, guided missions, accessible motion, sourced content, and tested publication. Use for requests such as a dinosaur explorer, interactive periodic table, cultural atlas, machine museum, ocean world, or another learning experience. Also use when explicitly invoked as $interactive-learning-worlds. Pure factual questions, ordinary lesson plans, and unrelated websites do not require this workflow.
---

# Interactive Learning Worlds

Create an inviting place to explore, manipulate something meaningful, and discover an idea. Adapt the representation to the subject and learner. Use Solsystemet as an example of the workflow, not as a required visual theme or engine.

## Start with the learning brief

1. Inspect the existing project, its instructions, stack, routes, assets, and publication setup before editing. Preserve useful working features.
2. Infer the subject, age range, language, device priorities, and intended output from the request. For a new unspecified project, assume ages 8–10, English, phone/tablet/desktop, three short missions, and a static web app. State these assumptions briefly. Ask only for missing information that materially changes the result, and continue independent work while waiting.
3. Write three observable learning goals: what will a learner be able to notice, compare, explain, or do? Choose one central interaction for each. Use [learning design](references/learning-design.md) and the relevant [subject recipe](references/subject-recipes.md).
4. Decide which representation teaches each idea best: a map, timeline, diagram, sortable cards, cutaway, scale comparison, or 3D scene. Add 3D where spatial manipulation contributes to the goal. An existing application can retain its framework; a new application can start with the dependency-free template.

## Build a first complete experience

For a new app, run the bundled scaffolder using this skill's actual filesystem location:

```sh
python3 /path/to/interactive-learning-worlds/scripts/scaffold.py \
  --output /path/to/new-app --topic dinosaurs --title "Dinosaur Discovery" \
  --age-min 8 --age-max 10
```

The output is a runnable **prototype** with abstract compare, reveal, and ordering activities. The topic argument sets metadata; it does not supply researched lessons. Read the generated README, replace the illustrative demonstrations with subject-specific content and interactions, and keep prototype status until that work is reviewed. For an existing app, reuse individual patterns without replacing its architecture.

Build a complete path through one mission before multiplying pages:

- A clear invitation and an immediate first action.
- A scene or representation the learner can manipulate.
- A small, legible set of controls with a visible effect.
- Guidance beside the active interaction, including on a narrow phone.
- Completion based on deliberate learner input and the relevant observation.
- Specific feedback, a short explanation, and a distinct discovery reward.
- A working exit, return path, and retry where loading can fail.

Then complete the other missions and free exploration. Use progressive disclosure for longer reading. Keep navigation, selection, view controls, and playback conceptually distinct; remove controls that duplicate the same action.

## Establish the content and visual foundations

Track important factual claims and externally sourced assets in a source ledger. Record source IDs, titles, URLs, publishers, access dates, license/permission information for reused assets, and reconstruction or uncertainty notes. Connect claims to source IDs. Suggested institutions in a recipe are starting points for research; inspect the actual sources before relying on them.

Distinguish observations, reconstructions, inferred structures, and purely illustrative motion. A model should explain its relevant limits in language a child can understand. For cultures, identify place, community, and time rather than presenting a single national stereotype. For machines, emphasize history and visible engineering principles. Read the subject-specific pitfalls in the recipe before authoring content.

Choose coherent typography, a restrained color system, strong imagery, readable text, and generous interaction targets. Source or create appropriate assets; preserve attribution. Avoid turning every subject into a space-themed reskin. Bundle runtime dependencies where practical so fonts, imagery, and modules do not fail unpredictably through third-party services.

## Implement motion and resilient interaction

Read [motion and accessibility](references/motion-and-accessibility.md) before adding animated scenes.

- Start suitable scenes with gentle motion and provide Pause. Respect reduced motion initially and when the preference changes; explicit Play remains available.
- Keep camera transitions coherent. Labels attached to moving objects must use the same current projection as the rendered object. Resolve crowding with stable visibility rules, not labels jumping between rows.
- Use the optional [anchored-label pattern](assets/patterns/README.md) when a scene needs moving HTML labels. It is independent of Three.js and is not required by the starter.
- Keep keyboard focus, DOM order, and visual order aligned. A focused moving link must remain usable.
- Model loading, ready, and unavailable states explicitly. Block observation-dependent completion until the scene is ready; keep recovery and exit available.
- Preserve badge progress locally where appropriate, with a usable fallback when storage is unavailable. Automatic animation must not earn a discovery.
- Reuse geometry and buffers; stop unnecessary drawing when scenes are paused, hidden, or offscreen. Where a visible counter depends on an offscreen model, advance its clock without rendering.

## Critique, verify, and refine

Use [quality and publishing](references/quality-and-publishing.md). Verify real interactions and rendered outcomes, not only classes or the presence of controls.

Run the structural check on a generated project:

```sh
python3 /path/to/interactive-learning-worlds/scripts/validate.py /path/to/new-app
```

Use `--release` after the subject content and source ledger have been reviewed. This checks structural declarations and references; it cannot certify factual accuracy, teaching quality, asset rights, accessibility, or animation performance.

Complete each mission in a browser. Exercise a wrong answer, exit/return, reload, blocked storage, narrow and landscape layouts, keyboard navigation, reduced motion, and loading failure when applicable. Observe moving scenes over full representative cycles and camera changes: look for label jumps, flicker, lag, ambiguous attachment, and focus loss. For a paused/offscreen rendering test, synchronize with the actual state change before measuring drawing work.

Write a concise critique with concrete evidence, implement the material findings, and rerun affected checks. If the user requests a fixed number of critique/fix loops, complete and record that number; each pass must inspect the updated result. Do not label an app child-tested or claim device frame rates from software-rendered browser tests.

## Deliver a reviewable result

Provide the working files, local run instructions, relevant test results, a source ledger, and a concise account of what changed and what remains unverified. When publication is authorized, use the project's established hosting path, publish a coherent revision, and verify the public URL serves that revision. Existing authorization remains valid; do not introduce an extra approval gate. Do not describe an unverified or local-only address as a live site.

The package's [README](README.md) contains installation and packaging instructions. [Example prompts](examples/prompts.md) and a [learning brief](examples/learning-brief.json) can help start a new project.
