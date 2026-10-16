# Learning design

Use this reference to turn a subject into observable learning activities. The default audience is ages 8–10; this is a design starting point, not a claim of tested educational effectiveness.

## Start with something the learner can notice

Write one learning objective as an action: compare, predict, change, trace, sort, explain, or identify evidence. Avoid objectives such as “understand the ocean” that cannot guide an interaction or a completion check.

Use the loop **explore → interact → discover**:

1. **Explore:** show a recognizable object, place, process, or question. Let the learner look before asking them to read a long introduction.
2. **Interact:** provide one meaningful control that changes an observable result. Show the control and its result together, including on a small phone.
3. **Discover:** ask the learner to notice, compare, or make a choice using the result. Give a short explanation tied to their action, with a route back to free exploration.

The interaction should carry the idea. Dragging a lever's fulcrum changes the force and distance tradeoff; dragging an unrelated decorative object does not teach that relationship. Use 3D when viewpoint, spatial relationships, or physical manipulation matters. Prefer diagrams, maps, timelines, photographs, or tables when they explain the subject more clearly.

## Define the activity before adding polish

For each activity, record this small contract:

| Field | What to specify |
| --- | --- |
| Objective | One observable learning goal. |
| Starting question | A concrete question the learner can investigate. |
| Evidence | The image, measurement, source record, or model result they must inspect. |
| Action | The control they use and what changes as a result. |
| Discovery check | A deliberate action or answer supported by the evidence. |
| Explanation | One or two sentences connecting the action to the concept. |
| Limits | What is simplified, uncertain, reconstructed, or outside the model. |
| Availability | What works while loading or after interactive rendering fails. |

Example: “Move the fulcrum to lift the same load with less force.” Keep the load fixed; update both effort force and effort distance. Completion requires trying two positions and recognizing the tradeoff. Explain that the ideal model omits friction and that less force does not mean free energy. A source must support the relationship; a plausible animation alone is not evidence.

## Three short missions

Start with three distinct missions, each about 1–3 minutes as an estimate to test. Usually give each mission two or three purposeful steps. Do not force every subject into an identical quiz sequence.

- **Mission 1: notice a relationship.** Use a simple control and identify what changed.
- **Mission 2: investigate evidence.** Compare examples, reveal layers, or inspect a source-backed reconstruction.
- **Mission 3: transfer the idea.** Make a prediction or choose a solution under a new, clearly stated condition.

The subject recipes may use another sequence when it better fits the material. Missions should also make sense individually; offer free exploration and a visible exit throughout.

Advance from evidence, not elapsed time. Ambient motion, a completed loading animation, or leaving a page open must not earn a discovery. A time-dependent process can finish automatically, but the learner should still deliberately start, observe, or interpret the activity before receiving its reward.

Make completion checks meaningful:

- Require the relevant control change or observation, not an arbitrary number of clicks.
- Use broad, defensible thresholds for observations. Do not require an exact decimal slider value unless precision is the lesson.
- Explain a wrong choice with a clue to inspect; allow another attempt without losing progress.
- If multiple answers are valid, accept them or change the prompt. Do not silently encode a debatable interpretation as a single correct answer.
- Do not grade an open explanation automatically unless a defensible assessment method is part of the task. An ungraded reflection can still be useful.
- Give each discovery a distinct name and image tied to its concept. A badge records completion, not mastery or a measured learning gain.

## Reading, attention, and age adaptation

For ages 8–10, begin with a short verb-led instruction and one main control. Keep the first explanation to one or two sentences. Define necessary terms beside the thing they describe: “Fulcrum: the point the lever turns around.” Put longer context and sources after the activity, without hiding caveats needed to interpret it.

| Audience or need | Adaptation |
| --- | --- |
| Younger or emerging readers | Fewer visible choices, concrete pictures and labels, one action per step, optional replayable audio with equivalent text. Avoid instructions that rely on color alone. |
| Ages 8–10 | Short comparisons, visible cause and effect, familiar quantities, clues that support independent retry. |
| Older or more experienced learners | Optional numerical readings, competing explanations, source comparison, and explicit model limits. Keep the simple entry path. |
| Different language or reading ability | Plain vocabulary, localized units where appropriate, translated labels that preserve meaning, and layouts that tolerate longer text. Do not infer ability from age alone. |

Motion should explain or invite exploration. Default ambient motion can be appropriate, but honor reduced motion and provide an obvious pause. Avoid moving a control away from a learner, changing numbers faster than they can inspect them, or forcing timed answers. Keyboard focus must remain usable while a scene moves.

Keep the instruction, subject, and active control visible together. On a phone, place extended prose after the object and controls. The DOM and keyboard reading order should match that visual order. Ensure a clear focus destination after step changes and completion, with a useful next action.

## Preserve sources and uncertainty

Maintain a claim-level source record: claim or measurement, supporting URL and section, publisher or creator, relevant date, units and conditions, and any uncertainty. For assets, also record creator, license or permission, modifications, and what the image represents. Search-result snippets and institution homepages are starting points, not evidence for a specific claim.

Distinguish these representations in the interface where they appear:

- **Observation:** a photograph, specimen, measured result, or documented account.
- **Reconstruction:** an evidence-informed depiction with inferred parts.
- **Illustration:** an explanatory image, which may omit detail or change scale.
- **Model:** a set of assumptions used to explore a relationship; state material omissions.

Use phrases such as “Evidence suggests…” or “In this simplified model…” when warranted. Avoid presenting reconstructions as photographs, visual enhancement as natural color, approximate boundaries as exact lines, or one person's account as the experience of an entire community. If a source cannot support a feature's central claim, revise the feature or leave the claim unresolved.

## Readiness, feedback, and recovery

Before a mission's interaction is ready, show a brief preparing message and prevent progress through its dependent steps. When it cannot start, explain that plainly and offer an available alternative: a still illustration, source material, another activity, or leaving the mission. Offer retry only where it actually attempts recovery; do not promise that retry fixes unsupported graphics.

Keep deliberate progress separate from passive scene state. Reloading, navigating back, changing a mode, or recovering from an error must not accidentally award a badge. If progress cannot be saved, let the activity work and state that discoveries last for the current visit.

## Validate honestly

Review four different kinds of evidence separately:

1. **Factual review:** sources support the claims, calculations, representations, and caveats.
2. **Functional checks:** controls produce the intended result; missions require deliberate evidence; loading, failure, replay, and navigation work.
3. **Accessibility and layout checks:** keyboard, focus, reduced motion, text enlargement, and small screens preserve the activity.
4. **Learner observation:** when sessions actually occur, record the age band, task, observed confusion, help needed, and limits of the sample without collecting unnecessary personal data.

Browser automation and expert review can reveal usability problems. They do not establish that children enjoy the app or learn from it. Report “reviewed against the intended age range” or “tested with these participants and tasks” accurately; never invent child testing, engagement results, mastery, or educational validation.
