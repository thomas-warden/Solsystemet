# Into the Deep

## Experience promise
A child pilots a descent from sunlit water to the midnight ocean. The water loses its sunlight, the depth counter climbs, and unfamiliar creatures replace familiar ones. Three carefully framed animals invite a closer look. The invitation is simple: go deeper; notice what changes.

## Direction and references
- The skill's Earth exhibit is the implementation-quality reference: a commanding subject, a legible instrument, and a quiet interface. Inspected the runnable reference at http://127.0.0.1:8105/ in desktop and phone view, then changed sunlight, clouds, keyboard orbit and zoom. Captures are in `evidence/reference-earth-*.png`. The detailed globe and quiet controls informed the commanding animal scale and restrained depth instrument; the ocean uses a different, layered illustration technique.
- Subject references: NOAA ocean light zones and sea turtle records; Monterey Bay Aquarium vampire squid record; NOAA dumbo octopus record. Specific inspected source pages are mapped in SOURCES.md. These establish factual/anatomical context, not permission to redistribute photographs.
- Original generated natural-history illustrations were made specifically for the opening turtle, twilight vampire squid, and midnight dumbo octopus. They are exhibit illustrations, never observations. Animals are shown with expedition lighting, sizes and depth spacing are compressed, and the journey does not claim they share one specific location.

## Opening composition
Full-bleed dark teal ocean. A detailed green sea turtle occupies the right two-thirds, with high soft sunlight above it and room for dark water below. Small expedition identity at upper left; a large cream serif invitation on the left. The animal's inspect label is adjacent to its image. A depth instrument spans the bottom. A useful descent button sits below the invitation, and the slider provides direct control.

## Visual language
Instrument Serif for large, curious headlines; DM Sans for practical labels and reading. Pale warm ivory, ocean teal, restrained luminous mint accents, red-brown vampire squid, peach dumbo octopus. Fine rules and instrument ticks provide structure; imagery carries most of the scene. One broad inspection panel is enough. No page of repeated cards.

## Asset plan
Three 1536-pixel generated environment/creature illustrations, locally bundled and compressed; locally bundled licensed fonts; original CSS/canvas water particles and depth tick marks. Each illustration is inspected before acceptance. Essential loading has progress, retry, and a textual fallback. Deep scenes are loaded while the opening is in use; the same factual material remains available if images fail.

## Signature interaction
Drag depth or press Descend. The depth value follows the displayed journey, the light fades, particles pass upward, and each region reveals a different animal with a new adaptation to inspect. Clicking an animal opens a stationary, keyboard-accessible field note. A small deliberate observation asks which creature uses ear-like fins; observing or waiting never completes it.

## Phone
An ocean image remains the main event. The title moves above the animal, the inspect label below it, and the depth control stays beneath the scene. The phone page scrolls: preserving image detail and readable controls takes priority over fitting everything inside one initial viewport. Detail becomes a scrollable full-height panel with a persistent close control. Narrow portrait and landscape are reviewed separately.

## Implementation and limits
Layered 2D illustration and a small canvas particle field fit static HTTP delivery and make a coherent depth journey without a large 3D dependency. The animals are illustrations, not anatomically validated models; motion is restrained ambient drift, not a swimming simulation. Depth zones use approximate conventional boundaries. No physical-device frame-rate or child-testing claim is planned.
