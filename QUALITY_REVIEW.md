# Five-pass quality review

This record tracks the five implementation and critique passes requested on 16 October 2026. The review uses desktop, phone and tablet layouts, source inspection and automated browser interaction. It does not substitute for testing with children or frame-pacing measurements on physical devices.

## Pass 1 — Discovery and motion foundations

Implemented a compact mission workspace, deliberate sunrise observations, an illustrated Europa ocean reveal, distinct discovery badges, larger controls and a direct starter mission. Venus gained enhanced cloud structure, an ordinary view and a sourced radar surface. Orbital geometry and scoreboards reuse buffers and nodes; paused scenes settle without continuing GPU work; cameras share eased movement; the asteroid scene uses fewer vertices.

Critique: mission flows and the main phone layout worked, but a narrow cutaway clipped, Venus had redundant return actions, external font loading could change typography, and suspending an offscreen canvas also stopped visible orbital counters.

## Pass 2 — Responsive fit and clear viewing modes

Fixed narrow, short landscape and tablet mission layouts. Venus now has three mutually exclusive views with contextual explanations and a readable radar source link. Fonts and their licenses are bundled locally, including real italic lettering. Added restrained page arrivals and separated offscreen simulation clocks from rendering.

Verification: all three activities fit the checked 320×568, 320×740, 390×844, 844×390 and 1024×768 layouts. Local fonts load without external font requests. Radar loading, delayed navigation, selected-mode clicks and retry after a controlled failure pass. An offscreen orbital clock advances while its GPU frame count remains unchanged.

Critique: the next review found inconsistent rotation direction in the analytic planet renderer, stale loading/fallback states after graphics failures, and overly broad fallback styling. Programmatically focused headings also showed a control-like outline.

## Pass 3 — Scientific consistency and recovery

Corrected the close-up rotation convention so Venus turns opposite to Earth and the other prograde planets. Radar playback describes the solid planet rather than the clouds. Planet failures stop showing a loading state and no longer hide independent solar-system, moon or asteroid canvases. Route headings retain accessible focus without a decorative outline. Texture allocation and context-loss handling are reviewed alongside error recovery.

Verification: controlled missing imagery, absent WebGL and lost graphics contexts produce usable fallbacks. Healthy orbital scenes remain available after a planet failure. Reloading restores a lost context; retrying restores a failed image request. Eligible high-detail Earth and Jupiter views use approximately 171 and 213 MiB of estimated active texture storage, respectively, below the 256 MiB high-memory budget.

Critique: free exploration on phones put the globe below too much reading. Finishing a mission could leave focus outside the visible guide, and cinema mode showed two pause buttons. A numerical orbital review also found inconsistent handedness between close-up rotation, solar paths and moon paths.

## Pass 4 — Immediate exploration and consistent orbits

Moved the globe and its controls ahead of longer reading on phones, retained the title and short introduction, focused completed mission guidance, and removed the duplicate cinema pause action. Corrected solar and moon orbital handedness and the corresponding moon path and tidal-lock orientation. Updated scientific limitations and image credits. Added a repeatable static export with a source revision and coherent module/style versions.

Verification: free exploration shows Venus's complete globe and useful controls on a 390×844 viewport. All eight planets and twelve moons have consistent prograde orbital angular momentum in the model; circular moon paths close after their stated period, and the rendered moons keep the intended face toward their parent. Mission completion and cinema keyboard checks pass.

Critique: visual phone ordering still differed from keyboard order. Following an outer planet then using arrow keys changed the camera radius around the wrong origin. Wrapped toolbars could cover labels, and a mission could ask children to interact while its imagery was still loading or unavailable.

## Pass 5 — Keyboard, labels and loading recovery

Made phone DOM order match the displayed globe-first layout. Camera keyboard movement now uses the followed planet as its origin. Scene labels have 44px targets and reserve measured toolbar space; crowded small views hide labels that cannot fit, while the planet picker remains available. Toolbar bounds are cached rather than measured for every label each frame. Missions explain loading and unavailable graphics, block premature advancement, offer retry, and retain a working exit. Simulation controls stay disabled until their scene is ready.

Focused verification: actual Tab order follows heading → globe → View only → Play. Following Neptune preserves its camera radius through an arrow-key turn. Labels clear toolbars at 320px, 390px and landscape sizes. Delayed loading blocks both normal and synthetic premature mission input; a controlled image failure can be retried; unavailable graphics leave a working way out.

The final review also caught a browser-cached failed orbital module download. Retrying now uses a fresh module URL while retaining the current mission. Delayed orbital initialization keeps the mission and native controls disabled until the scene is available. Europa screenshots and checks now wait for the actual shell movement and ocean reveal, rather than checking only a CSS class.

Final regression: all seven browser suites pass, covering the three complete missions, saved badges and unavailable storage, all twenty world routes, six phone/tablet layouts, keyboard navigation, default and reduced motion, paused and offscreen rendering, scientific orientation, and controlled asset/graphics failures. JavaScript syntax and repository whitespace checks pass. Local font files, licenses, radar provenance and project-prefix asset paths were independently audited.

Final critique: the activities give an eight-year-old clearer goals, visible actions and rewards, while free exploration keeps its quieter museum-like presentation. Dense small-screen orbit views necessarily show fewer labels and retain a world picker. Whether children complete the activities unaided and whether animation feels consistently smooth on older physical phones or iPads remain unverified; neither a visual review nor software-rendered browser tests can establish those outcomes.

## Follow-up — Labels during orbital motion

User feedback exposed a motion defect missed by the earlier static layout checks. The collision solver moved labels between 48px lanes, then eased them separately from their planets. Deterministic browser samples measured a 40.45px Venus label jump while its planet moved 0.53px, and a 46.36px Mars label jump on the welcome view while its planet moved 0.22px. Previously hidden phone labels could return more than 57px behind their intended anchor.

Replaced the lane solver in solar and moon scenes with shared labels attached to each body's current projection. Short horizontal connectors replace stretching leader lines. Crowding affects opacity rather than position: existing visible labels retain priority, focused labels take precedence, and returning labels wait for sustained clear space. Bounds are respected without clamping names away from their planets. Saturn's labels clear its rings, and solar labels fade when their bodies pass behind the Sun. Hidden names are removed from pointer and keyboard interaction.

The new temporal regression samples full orbital cycles, camera transitions, reappearance after collisions, keyboard activation, phone navigation and reduced motion. It directly checks label-to-body attachment and visibility stability; it is not a device frame-rate benchmark.

Keyboard focus temporarily holds orbital time so a name cannot drift out from under an Enter keypress; leaving the label resumes the existing playback state. If a resize removes a focused name, focus moves to the scene canvas rather than falling back to the page body.

Verification: sampled label attachment error stays below 0.01 CSS pixels across solar and Saturn moon cycles, including camera moves and hundreds of reappearances. No rapid visibility reversals were found in the representative cycles. Keyboard hold/resume, preserved manual pause, resize focus fallback, phone label activation, toolbar clearance, mission flows and paused/offscreen rendering checks pass. Offscreen rendering is measured after the intersection observer has actually switched the scene to its offscreen update path.

## Follow-up — Complete Titan exploration

Review found that Titan's optional reconstructed-surface image was a prerequisite for showing its healthy haze view. Its single toggle and generic imagery note also made the two views hard to distinguish, while the northern lakes sat near the globe's edge in the default viewpoint.

Separated the surface download from initial readiness, retained the haze during loading or failure, and added retry without a page reload. Explicit Orange haze and Surface reconstruction choices now explain what each map shows and link to retained image credits. A northern-lakes action tilts and lights the model for inspection, pauses it deliberately and focuses the canvas. Route arrival and reset retain default motion, with reduced-motion preferences respected. Late downloads cannot override a later view, reset or route; a lost graphics context keeps controls disabled. Both Titan views gain analytic silhouette smoothing, with an illustrative amber atmospheric rim restricted to the haze view. The reconstructed map's infrared/radar origins and drawn polar lakes remain clearly labelled.

Verification: the focused Titan browser suite passes rendered-view comparison, lake inspection, keyboard order, default/reduced motion and reset, Saturn-system return, 390×844 and 320×568 layouts, optional-image failure/retry, delayed-request cancellation and context-loss recovery. Desktop and phone captures show the reconstructed lakes and smoothed globe edges. An independent browser review checked the same recovery and navigation risks. The shared scene and asset-race suites also pass, including Venus, all twenty worlds, scene motion and graphics failures. JavaScript syntax and whitespace checks pass. These are software-rendered browser checks, not physical-device frame-pacing measurements or child usability testing.
