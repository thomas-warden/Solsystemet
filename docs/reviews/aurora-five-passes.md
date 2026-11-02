# Aurora visual review — 2 November 2026

Five successive source versions were rendered in Chromium/WebGL at the user's 1080 × 802 viewport, followed by phone review. Captures are session artifacts under `/tmp/aurora-*-system.png` and `/tmp/aurora-*-polar.png`.

1. **Read the whole system.** The original gold specks and magnetic guides disappeared against space. Increased boundary/guide contrast and replaced 105 short dashes with 160 connected, curved wind trails. Reviewed `pass1-system`: the Sun-facing boundary and stretched tail are now readable. Trails in front of the translucent volume can overlap its projection; their 3D paths remain outside the boundary.
2. **Make the aurora the subject.** The original narrow regular ring barely registered. Increased illustrative curtain height, introduced irregular oval folds, fine fibres and patchy emission, and made quiet activity visible. Reviewed `pass2-polar`: stronger silhouette, but the bright fibres looked too sharp.
3. **Soften and frame.** Reduced peak intensity, added a lower-frequency translucent glow, gave folds slow movement, pulled the polar camera back, and tapered wind-trail brightness. Reviewed `pass3-polar`: better separation from Earth's limb and more room around the light. This remains a stylised planetary visualization, not photographic aurora footage.
4. **Follow the cause and result.** Increased energy-tracer visibility and added an in-scene release indicator with a direct close-up action when the atmosphere brightens. Reviewed `pass4-polar` and `phone4`: desktop placement worked, but the indicator obscured the phone aurora.
5. **Protect the phone experience.** Moved the mobile indicator below the aurora, removed the disabled field toggle from polar mobile presentation, and kept the scene sticky beside the controls. Reviewed `pass5-polar`: the auroral region remains unobstructed. Checked regression coverage for pressure, release, camera, keyboard, drag, reduced motion, offscreen suspension and renderer recovery.

The pressure law and energy release remain independent. Distances, curtain heights and Earth size are illustrative exaggerations documented in Sources & the model. No new external imagery, services or dependencies were added.

Limitations: software-rendered Chromium review does not establish physical iPhone Safari frame rate. No numerical 9/10 quality claim is made; stronger readability and engagement are observable, while final visual appeal remains a user judgement.
