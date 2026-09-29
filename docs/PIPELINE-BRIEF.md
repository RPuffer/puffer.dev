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

## Round 2: concept variations through pipeline A (2026-09-23)

Operator verdict on the bake-off: A is closest to the pack's style; the concept step is the struggle. Round 2 keeps pipeline A unchanged in spirit (artwork regions to heightmap, code-built props, pack proportions) and varies only the concept: how the drawing is read into a world brief. Five named concept strategies, each a prompt fragment in pipeline/analyze.mjs selected with `--concept <name>`, each producing `pipeline/seed/concepts/<name>.json`, each run through A into `levels/forest-a-<name>.json` with its own pieces module `3d/pieces/forest-a-<name>.js` where new props are needed. The existing `forest-a` stays as the literal baseline.

Strategies:
- `pack-first`: start from the pack's daylight look and vocabulary; the drawing contributes only its motifs (bare trunks, mist, roots, the fire-bird) as a few props on an otherwise standard bright island.
- `scene`: read the drawing as a place with a souls-like story: a shrine clearing where the fire-bird waits, an approach path, offerings, torches, a threshold; props and layout serve the scene.
- `biome`: read the drawing as a biome (dark pine forest with a pool) and build it from the existing pack pieces (pines, mushrooms, rocks, water, waterfall) at the drawing's density; the bird is the only new prop.
- `motif-remap`: map the drawing's shapes and tones onto pack pieces by likeness rather than by object: the flame strokes become orange trees and ember gems, the swirling ground becomes a spiral path and terraces, the mist becomes pale sand.
- `composition-only`: take only the drawing's masses, void, and focal point for the layout; palette and decor are the plain pack; the bird stands at the focal point.

Every result must keep the pack: compact irregular island with void around it, terraces at heights 0 to 3, chunky stacked-block props, the pack's saturation in daylight or dusk. Budget for the round: $10 across all five, logged per level in pipeline/a-transcribe/SPEND.md.

## Round 3: every artwork, best of three (2026-09-29)

Operator verdict on round 2: the `scene` strategy wins and is the analyzer's default. Round 3 runs the eleven remaining artworks through pipeline A with the scene strategy, three distinct readings each, so the operator can pick one jumping-off island per artwork from a pick-per-group card.

Seeds in `pipeline/seed/`: `cat` (fauvist acrylic cat portrait), `dragon` (pencil dragon), `ember` (flame spirit face on black), `chimera` (ink bony multi-headed creature), `wizard` (cartoon hot-dog wizard, "Glizard 'Arry"), `swallow` (single-stroke ink bird), `cosmos` (airbrush eye with a nebula), `sharkbear` (pencil shark-bear creature), `gremlin` (ink creature holding an orb), `mindbloom` (vector face with a psychedelic bloom for hair on lavender), `eagle` (charcoal bald eagle). Most are creature portraits with no environment; the scene strategy has to invent the place the creature belongs to, in a souls-like grammar (an approach, a threshold, the creature at the focal point as a still figure), while the palette translation keeps the pack's saturation.

Naming: briefs `pipeline/seed/concepts/<slug>-<k>.json`, levels `levels/<slug>-<k>.json`, one pieces module per artwork `3d/pieces/<slug>.js` shared by its three levels (creature builders, motif props), renders `out/final/<slug>-<k>.png` at 900x800 with `hero=0`. `k` is 1 to 3.

Variation: `analyze.mjs --concept scene --variant k` must produce three readings that differ in the scene itself (what place, what approach, what the creature is doing), the palette translation, and the terrain emphasis, not three renders of one brief. Feed the earlier variants' summaries back as things to avoid.

Every level keeps the pack: irregular outline, void rim, heights 0 to 3, chunky stacked-block props, the pack's saturation. Creatures are built from stacked flat blocks and wedges like the fire-bird, at a height of 1.5 to 3 tiles depending on the subject, facing the camera three-quarter. The critic loop runs up to four rounds per level. Budget for the round: $15, logged in `pipeline/a-transcribe/SPEND.md` per level.
