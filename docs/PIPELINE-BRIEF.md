# Art-to-island pipeline brief

Every agent on this run reads this file, then docs/BRIEF.md, docs/RUN.md, docs/NOTES.md, and docs/DECISIONS.md. Ask nothing of the operator; decide, log the decision in docs/DECISIONS.md, keep going.

## Goal

A re-runnable pipeline that turns one of the operator's artworks into a playable 3D island in the style of this repo's 3d build (flat low-poly, block terrain, chunky props, the look of `ref/reference.png` and `3d/pieces.js`). The operator wants one-of-N: three pipeline variants run on the same seed artwork, each delivering a level the 3d build loads with `?level=forest-a`, `forest-b`, or `forest-c`, so he can pick the pipeline that carries forward. The 2d build is out of scope from here on.

Seed: `pipeline/seed/forest.png`, a charcoal drawing of a dark forest: tall bare trunks, mist, roots, and a flame-spirit figure drawn in flowing single strokes rising from the ground. The world the pipeline produces should feel like that drawing (mood, palette translated into the cute grammar, motifs, composition) while staying unmistakably the same asset pack as the home island. New prop types are allowed and expected (spirit, roots, mist, bare trees, lanterns, whatever the artwork calls for), built in the same style and registered through the engine hooks.

## Shared front end (phase 1)

- `pipeline/analyze.mjs <art.png> <brief.json>`: vision-model analysis producing the world brief: measured palette and its translation into a cute-tile palette, mood words, motif list with shape descriptions in the pack's grammar, a composition map on a 16x12 grid (mass, ground, water, vegetation, the figure, paths), creature translations, and biome rules for procgen. `pipeline/seed/brief.json` is the run's copy.
- `pipeline/critic.mjs <render.png> [--out report.json]`: the validation loop. A vision-model pass over a render with a fixed rubric: floating or sunken props, interpenetrating geometry, scale mismatches, props on the wrong surface, off-grid placement, style breaks (smooth shading, gradients, outlines, photoreal texture), palette clashes with the pack, unreachable or nonsensical layout, anything a player would call unnatural. Output: JSON items with `issue`, `severity` (high, medium, low), `box` in render pixels, `fix_hint`, plus a one-line verdict. Exit code reflects whether any high item remains.
- Engine hooks in `3d/` and `core/`: per-level `materials` and `palette` overrides merged over the catalog constants; per-level `pieces` list of extra modules that register new builders and catalog entries; GLB decor support (`glb` path on a catalog entry, scaled to the catalog height, with optional flat-shading and palette snapping); any `?level=<name>` loads `levels/<name>.json`.

## Variants (phase 2, parallel)

- A, composition transcription (`pipeline/a-transcribe/`, `levels/forest-a.json`, `3d/pieces/forest-a.js`): the artwork is the map. Region and depth estimates of the drawing become a 16x12 heightmap and surface map; motifs place decor where the drawing has them; props are code-built. Near-zero spend.
- B, concept repaint then transcribe (`pipeline/b-concept/`, `levels/forest-b.json`, `3d/pieces/forest-b.js`): an image model repaints the artwork as a cute-tile isometric island (reference crops as style images, several candidates, best one chosen by the agent), which is then transcribed into a level the way home.json was, with new props code-built to match the concept. Compare against the concept, then critic.
- C, generated meshes (`pipeline/c-meshes/`, `levels/forest-c.json`, `3d/assets/forest-c/*.glb`, `3d/pieces/forest-c.js`): props from the brief are generated as cute-style sprites, turned into meshes with fal trellis, post-processed to flat-shaded, palette-snapped low-poly GLBs, and registered as catalog types; the layout comes from procgen driven by the brief's biome rules.

Each variant runs the same loop: render at the home framing (`?level=forest-x&hero=0`, 351x390) and at 900x800, read the PNG, run the critic, fix, repeat until no high-severity item survives two consecutive passes or six rounds are done. Structural checks (connectivity from spawn, footprint overlaps) must pass too; reuse the logic in tools/procgen-check.mjs.

## Budget

Cap for this run: $50.00, on top of the $2.84 already logged. Allocations: A up to $5, B up to $12, C up to $25, the rest reserve. Log every batch under a `## Pipeline` heading in docs/SPEND.md with the running total. Keys and call patterns are in docs/BRIEF.md. Stop at the allocation and report.

## House rules

Same as docs/BRIEF.md: no code comments, granular commits of your own paths only, `PP_PROFILE=.pp-profile-<yourname>` for headless runs, reports under 150 words with verdict first.
