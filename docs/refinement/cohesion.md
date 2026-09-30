# Refinement lane: cohesion and model detail

## What the picks show (measured 2026-09-29)

HSV, non-background pixels:

| Render | S p50 | V p50 | V p90 | Verdict |
| --- | --- | --- | --- | --- |
| `ref/reference.png` | 0.52 | 0.89 | 1.00 | pack |
| cat-medium | 0.66 | 0.88 | 1.00 | pick |
| ember-subject | 0.81 | 0.49 | 0.80 | pick |
| eagle-composition | 0.10 | 0.42 | 0.91 | pick |
| forest-medium | 0.19 | 0.51 | 0.71 | rejected |

The picks sit far outside the pack's value band, so pulling islands toward its bright key would erase them. The rejected forest lacks a highlight (V p90 0.71). Cohesion belongs in structure: three-tone faces, lips, bands, prop scale, a highlight ceiling. Hue and key stay free.

`Baker.rbox` rounds vertical edges only, so every top edge is a hard corner. The dragon's tiny cubes turn to speckle at 900 px; the cat's face does not read.

## Catalogue

**Figures**
- Chamfered top edges. Effect: the lit rim the pack's blocks show. Mechanism: `rbox` gains a 0.04-tile top chamfer toned `top` lerped 30% to white.
- Silhouette budget. Effect: creatures read at 351 px. Mechanism: at most 12 parts over 0.15 tile; parts under 0.08 tile only on the face.
- Proportion rule. Effect: creatures look like one family. Mechanism: head 0.35 to 0.45 of body height; stacks follow the pine's 0.9/0.75/0.55/0.35 taper.
- Two-tone parts. Effect: flat-colour clarity. Mechanism: one body ramp plus one accent per figure; eyes from shared `INK`/`WHITE`.
- Richer primitives. Effect: wings, beaks, horns without cube stacks. Mechanism: `wedge`, `slab`, `spike`, `plinth` (copied across 11 modules) move to `3d/prims.js` with `lathe` and `taperBox`.

**Palette**
- Hue-shifted ramps. Effect: tones harmonise across islands. Mechanism: each brief colour becomes a 5-step ramp, hue +10 to +20 deg per brighter step, saturation peaking mid-ramp.
- Face ratio lock. Effect: one lighting rig everywhere. Mechanism: `left` and `right` derived from `top` at luminance 0.88 and 0.66 (REFERENCE.md).
- Highlight ceiling. Effect: no muddy islands. Mechanism: the top ramp step reaches V 0.85 on at least 3% of pixels.

**Terrain grammar**
- Shared lip and band. Effect: islands read as one pack. Mechanism: lip 0.12 thick, 3 to 4 drip tongues per face, mid-tone bevel stripe at cliff corners.
- Prop scale. Effect: no toy-in-giant-land drift. Mechanism: decor 0.3 to 2.4 tiles tall; the focal figure up to 3.

**Detail passes**
- Clutter density. Effect: fields stop reading empty. Mechanism: one small item per 3 to 4 walkable cells, none on paths.
- Edge wear. Effect: age. Mechanism: cliff specks and a chipped lip on 1 in 8 edge tiles.
- Story props. Effect: the subject's world. Mechanism: 3 to 5 props from the analysis's remembered details.
- Approach. Effect: a readable eye path. Mechanism: a path from spawn to the focal cell, flanked by the tallest props; clutter halves within 2 cells of the figure.

## Three approaches

| Approach | Authoring cost | Consistency | Stays automatic |
| --- | --- | --- | --- |
| A. Richer code primitives plus a style bible enforced in `Baker` | Low | High: rules live in code every module calls | All of it |
| B. Image-model reference sheets in pack style, then hand-built | Medium: about $0.05 a sheet | Medium: sheets drift, code rules catch it | Brief and build; the builder reads a sheet |
| C. Blender or generated meshes, retopologised, loaded as GLB with `flat` and `snap` | High: a modelling job per creature | Low until `snap` recovers the palette | Partial; a human sits in the loop |

Recommendation: A everywhere, B for focal creatures, where cube stacking fails on proportion.

## Staged plan

1. **Style bible in code.** Add `3d/prims.js`, a chamfered `rbox`, `ramp(hex)` and the face ratio lock in `3d/style.js`. Rebuild cat-medium and dragon-medium. Visible: before/after on a fortress `pick-one` card.
2. **Style sheet and detail pass.** The pipeline emits `pipeline/seed/style/<slug>.json` (ramps, accent, clutter set, focal cell, scale caps); `refine.mjs` scatters clutter and wear. Visible: the ten picks re-rendered as a contact sheet beside `home.png`.
3. **Cohesion critic and loop.** After brief, build, critic: run `cohesion.mjs`, apply fixes, re-render, up to three rounds. Visible: the ten picks with metric tables and round counts.

## Cohesion critic

| Check | Metric | Pass |
| --- | --- | --- |
| Highlight | V p90, non-background pixels | >= 0.80; forest 0.71 fails, every pick passes |
| Face ratio | luminance left/top and right/left on sampled block faces | within 0.08 of 0.88 and 0.75 |
| Palette ramp | CIEDE2000 from each swatch to its ramp's nearest step | <= 6 |
| Hue focus | share of the largest 30-degree hue family, S > 0.25 | >= 30%, to calibrate: cosmos-medium 27%, cat-medium 33% |
| Silhouette | parts over 0.15 tile; creature mask perimeter-to-area | <= 12 parts; ratio inside the picks' range |
| Prop scale | catalog heights | 0.3 to 2.4, focal <= 3 |
| Clutter | small items per walkable cell | 0.25 to 0.35, none on paths |
| Grammar | lip thickness, drip count, bevel stripe | matches REFERENCE.md |

A second vision rubric, voted 3 passes like `critic.mjs`, runs once Gemini credit returns. Against `ref/reference.png` it asks: shared lips and bands, shared bevel and three-tone faces, one focal point read first, colours outside the ramps. It never judges hue choice.

## Sources

- Raymond Schlitter, "Pixelblog 1: Color Palettes", slynyrd.com, 2018: 20-degree hue shift per swatch, saturation peaking mid-ramp.
- three.js docs: `RoundedBoxGeometry` and source; `MeshLambertMaterial.flatShading`.
- Wikipedia, "Townscaper": rule-based decoration from each block's neighbours, the model for clutter and wear.
- Wikipedia, "Monument Valley": colour marks interaction, the model for the focal check.
- WebSearch errored all session; the Kenney and Synty pages fetched stated no technical conventions.
