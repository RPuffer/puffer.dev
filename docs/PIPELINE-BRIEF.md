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

## Round 4: readings derived from the artwork (2026-09-29)

Operator verdict on round 3: too much similarity between the levels. The scene strategy collapsed every artwork into the same trio (daylight terrace, night water shrine, arena). Round 4 replaces those readings. Each artwork gets three readings again, but each reading is derived from the artwork through a different lens, so the three differ from each other and every island feels like a new experience with more of the artwork in it. The round-3 levels are superseded and their files overwritten; git history keeps them.

Two-stage concept:

1. Deep read, `analyze.mjs --deep <art.png> pipeline/seed/analysis/<slug>.json`: the vision model writes a rich analysis of the piece: medium and mark-making (charcoal smudge, fauvist knife strokes, single-stroke ink, airbrush gradient, vector doodle), palette and value structure, subject and what it is doing, the story or nature the subject implies, composition (where the mass is, flow lines, negative space, symmetry, scale cues), energy and emotional register, and three or four specific details a viewer would remember.

2. Three lenses, `analyze.mjs --lens <name> --analysis <path> <art.png> <brief.json>`, each turning one aspect of the analysis into the world:
   - `medium`: the material and marks become the island's physical character. Single-stroke ink becomes ribbon paths and arcs; airbrush gradients become soft radial terraces; fauvist strokes become a patchwork of colour blocks; charcoal smudge becomes soft-edged dark masses with pale mist; vector doodles become dense small ornament. Palette and surface treatment follow the medium.
   - `subject`: the subject's nature and story become the place. Where would this creature or figure live, what has it built or broken, what does a visitor find on the way in. The figure's pose and props come from what it is doing in the piece.
   - `composition`: the drawing's structure becomes the terrain literally. Its masses, flow lines, negative space, symmetry, and focal point map to plateaus, paths, void, and where the figure stands; its energy sets the terrain's rhythm (calm and wide, or jagged and rising).

Every lens prompt forbids the stock trio and stock time-of-day: lighting, palette, terrain shape, props, and the figure's pose must be argued from the analysis. The souls-like grammar stays light: an approach, a threshold of some kind, the figure at the focal point.

Terrain shapers: build-level.mjs gains named shapers the brief can select (`spiral`, `radial`, `patchwork`, `ribbon`, `shards`, `symmetric`, `twin-mass` with a bridge, `mound`, `basin`) with parameters, so the island's silhouette and terracing differ by lens instead of coming from one generator with the drawing's luminance.

Scope: all twelve artworks including `forest`. Naming: analyses `pipeline/seed/analysis/<slug>.json`, briefs `pipeline/seed/concepts/<slug>-<lens>.json`, levels `levels/<slug>-<lens>.json`, renders `out/final/<slug>-<lens>.png`, one pieces module per artwork `3d/pieces/<slug>.js` extended with lens props (the round-3 creature builders stay). The 80-walkable floor, the pack rules (irregular outline, void rim, heights 0 to 3, chunky stacked-block props, the pack's saturation), the critic loop of up to four rounds, and the walk QA all stay. Budget for the round: $15.

## Round 5: forest and cosmos, five readings each (2026-09-30)

Operator verdict on round 4 (card `puffer-isoworld-round-4-lenses`): ten starting points chosen (cat-medium, dragon-medium, ember-subject, chimera-medium, wizard-medium, swallow-medium, sharkbear-medium, gremlin-subject, mindbloom-medium, eagle-composition). Seven of ten are the `medium` lens: the marks and material becoming the place is what lands. Forest and cosmos were not sold; he asked to shake them up and give five per artwork.

Method: the Gemini account is out of credits, so the analyzer and critic are offline. The build agent authors the five briefs itself in the same schema, from the deep analysis and the artwork, and judges renders by eye against the critic rubric. Each of the five briefs grows from a different specific aspect of that artwork (a mark, a material, a structure, a detail, a light) and uses a different shaper; none may repeat the three round-4 readings or the round-3 trio. At least two of the five lean on the medium lens (marks and material as the place) pushed in directions the round-4 medium reading did not take. Naming: briefs `pipeline/seed/concepts/<slug>-<aspect>.json`, levels `levels/<slug>-<aspect>.json`, renders `out/final/<slug>-<aspect>.png`, aspect slugs chosen by the agent, five per artwork. Everything else stays: pipeline A, the 80-walkable floor, the pack rules, `finishLens`, the walk QA.

## Round 6: multi-tile prop standard and level-design loops (2026-10-02)

Verdicts on the four refinement cards: wind approved; stamps approved but "not the multi-tile I had in mind"; things approved, "still needs work"; style bible rejected, "didn't seem to do much". The operator's concept of multi-tile decoration is larger models of single items that span several tiles (a windmill, a ruined gatehouse, a giant tree, a shipwreck, a shrine, a forge), and he wants generative images to set the standard for them, with samples reviewed before the full build. Separately he wants level-design feedback loops (layout, pathing, ambient decor) researched from sources other than the ones used so far.

Multi-tile standard: every sample is one item rendered in the pack's style and camera on a 5x5 slab of pack blocks (grass or sand) on #404040, so the footprint reads in tiles, with the pack hero beside it for scale, no text, no outlines, flat two-tone. Footprints from 2x2 to 4x3; heights up to 4 tiles. Samples cover the pack's generic vocabulary and one themed item per picked island. Samples live in pipeline/multitile/ with a manifest of footprint and height per item.
