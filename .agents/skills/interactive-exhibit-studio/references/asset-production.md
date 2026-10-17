# Asset production

Strong subject assets are part of implementation. Obtain or produce the essential visual material early enough that composition, interaction, and rendering can be built around it.

## Make a small asset plan

For each important asset, record its purpose, source or production method, visual role, required views or layers, reuse terms, and fallback. Prioritize:

1. The main object, environment, specimen, map, or mechanism.
2. The layers or data needed by the signature interaction.
3. A useful still or simplified representation for loading and unavailable graphics.
4. Supporting imagery, symbols, and secondary details.

Inspect candidates at the intended viewing size and crop. A large file can still have poor detail, unsuitable lighting, obvious seams, or the wrong projection. Avoid building the entire interface around an asset that has not been inspected.

Plan the portrait composition as well as the wide view. A landscape image composed with empty space for a headline may crop the subject's face away on a phone. Test the crop early; use separate scene framing, alternate assets, or a different text position to preserve both subject and legibility.

## Select a production method

- **Source existing material** when an observation, specimen, historical document, or real object is central. Prefer a trustworthy record with identifiable provenance and suitable reuse terms.
- **Draw or code a custom illustration** when a diagram, cutaway, or simplified mechanism communicates the relationship best. Design its hierarchy and detail for the actual scene, including its smallest supported layout.
- **Use an existing model or construct one** when spatial inspection is necessary. Check geometry, materials, scale conventions, orientation, and the views the visitor will encounter.
- **Use available image-generation tools where appropriate** for illustration or supporting art. Inspect the result for subject errors, visual inconsistencies, and unusable detail. Label reconstructed or illustrative material correctly. Generated imagery is not observational evidence and must not establish a scientific or historical claim.

No particular external API is required. Use available capabilities and compatible assets. If an essential source or tool is unavailable, choose a coherent alternate representation and state the resulting limitation; do not quietly replace a detailed exhibit with unrelated decoration.

## Prepare assets for the scene

Check the details that affect the final render:

- Image dimensions, crop, transparency, color handling, compression, and sharpness at the intended display size.
- For mapped surfaces: projection, seams, poles, alignment between layers, and whether a picture is a photograph, composite, enhancement, or reconstruction.
- For models: orientation, geometry cost, normals, material response, and the camera distances needed to show useful detail.
- For illustrations: consistent stroke and type treatment, legible annotations, and clean layer boundaries during movement or reveal.
- For typography: actual loaded fonts and required weights or italics, readable body text, and sensible fallback metrics. Keep font licenses with bundled files.

Test the asset inside the application, not only in isolation. Examine the opening view, a close inspection, and the main interaction. Avoid adding noise, glow, blur, or animation to conceal weak source material or an inaccurate representation.

Budget decoded image and GPU use as well as download size. Load detail when it improves the visible result; reuse resources and release inactive allocations where appropriate. Select quality based on actual viewport and device constraints. A performance budget should support the intended appearance and interaction, not justify unexplained loss of essential detail.

## Preserve provenance and reuse terms

Keep an asset record with:

- Local file and role in the exhibit.
- Creator, institution or publisher, source page, and access date.
- License or permission basis, required attribution, and relevant restrictions.
- Modifications: crop, recoloring, retouching, compositing, reconstruction, or generated elements.
- What the asset depicts and any limits on using it as evidence.

An accessible URL does not establish reuse rights. When terms are unclear, find a compatible asset or make an original explanatory representation. Do not invent permission or treat a generated replacement as a photograph. Retain creator and community attribution when adapting cultural material.

Bundle runtime assets and dependencies where practical. Verify fonts, images, modules, and their fallbacks through the exported site's actual path; avoid a polished development view that depends on an unreliable third-party request.

## Subject-specific checks

| Subject | Check before accepting the asset |
| --- | --- |
| Ocean | Species and habitat context, actual versus illustrated color and lighting, depth and scale conventions. |
| Dinosaurs | Named specimen or taxon, preserved versus inferred anatomy, evidence supporting soft tissue or color. |
| Cultures | Creator or community attribution, place and time, translation, contextual meaning, and any restricted reuse. |
| Machines | The pictured version and date, correct part connections, documented versus reconstructed internals. |
| Periodic table | Material purity and form, stated temperature or pressure, and the difference between an element, compound, and everyday object. |

Use [learning and sources](learning-and-sources.md) to connect assets to claims and [visual review](visual-review.md) to evaluate their actual rendered result.
