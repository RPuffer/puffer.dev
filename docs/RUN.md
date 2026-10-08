# Run isoworld

All commands run from the repo root.

## Install once

```sh
npm install
```

## Serve

```sh
sh tools/serve.sh
```

The server listens on `http://localhost:8765/` (set `PORT=` to change it). Open:

- `http://localhost:8765/` for the start page of the run (see Start page)
- `http://localhost:8765/compare.html?level=home&seed=1` for both builds side by side
- `http://localhost:8765/3d/index.html?level=home&seed=1` for the 3d build alone
- `http://localhost:8765/2d/index.html?level=home&seed=1` for the 2d build alone

`?level=dev` loads `levels/dev.json`, the engine test island.

## Query parameters (3d)

| Param | Effect |
| --- | --- |
| `level` | Level file under `levels/`, default `home` |
| `seed` | Seed for per-cell colour jitter, default `1` |
| `pitch`, `yaw` | Camera angles in degrees, default from the level's `view` block, then 35.264 and 45 |
| `tileH` | World height of one stack level, default 1 |
| `zoom` | Pixels per world unit; 0 or absent fits the level to the viewport |
| `spawn` | `x,z` start cell override |
| `hero` | `0` hides the hero, for reference comparisons; the camera then centres on `center` |
| `center` | `x,y,z` world point the camera centres on when `hero=0`, else the level's `view.center` |
| `dpad` | `1` forces the on-screen d-pad |
| `xray` | `0` switches off the see-through window around the hero (both builds) |
| `t` | Freezes the wind clock at `t` seconds (3d); `hero=0` and `prefers-reduced-motion` freeze it at 0 |
| `ui` | `0` hides the seed overlay |
| `clouds` | `none` or `0` turns off the billboard cloud bed (on by default since pass 6) |
| `view` | `compare.html` only: `both`, `3d`, or `2d` |

## Controls

W/A/S/D or the arrow keys walk one cell per step: W up-right, D down-right, S down-left, A up-left. Click or tap a cell to path there. Touch devices get a d-pad.

## Render and compare

```sh
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=home&clouds=none" out/home-3d.png 351 390
node tools/compare.mjs ref/reference.png out/home-3d.png out/home-3d
node tools/smoke.mjs "http://localhost:8765/3d/index.html?level=dev"
```

`shot.mjs` waits for `window.__done` and prints page errors. `shot.mjs` and `smoke.mjs` launch Chrome with the profile dir named by `PP_PROFILE` (default `.pp-profile`); set `PP_PROFILE=.pp-profile-2d` so parallel agents do not collide on one profile. `compare.mjs` prints `MAD  NCC  silhouette` and writes `out/home-3d-side.jpg` and `out/home-3d-overlay.jpg`. `smoke.mjs` drives the keys and a tap and prints the hero's cell after each.

## Level view block

A level may carry `"view": { "pitch": 35.264, "yaw": 45, "tileH": 1, "zoom": 0, "center": [x, y, z] }`. Query parameters override it. `center` frames reference comparisons; in play the camera follows the hero.

## 2d build

`http://localhost:8765/2d/index.html?level=home&seed=1` runs the canvas sprite build on the same `start(level, renderer)` contract, controls and query parameters as the 3d build (`level`, `seed`, `hero`, `spawn`, `center`, `dpad`). Extra parameters:

| Param | Effect |
| --- | --- |
| `scale` | Screen px per sprite px at the 351x390 frame; overrides the level's `view.zoom` (zoom / 90.5) |
| `center` | `x,y,z` world point the camera centres on when `hero=0` |

A level without `view.zoom` fits its screen bounds. `2d/view.js` holds per-level 2d overrides keyed by level name.

```sh
export PP_PROFILE=.pp-profile-2d
rm -rf .pp-profile-2d/Default/Cache ".pp-profile-2d/Default/Code Cache"
node tools/shot.mjs "http://localhost:8765/2d/index.html?level=home&hero=0" out/home-2d.png 351 390
node tools/compare.mjs ref/reference.png out/home-2d.png out/home-2d
node tools/smoke.mjs "http://localhost:8765/2d/index.html?level=home"
```

2026-09-23 result after the polish pass: MAD 23.2, NCC 0.807, silhouette 93.4% (from MAD 30.8, NCC 0.691, 89.0%). Smoke: spawn (6,7), W to (6,6), D to (7,6), S to (7,8); taps on (9,4), (3,3), (4,4), (4,5), (8,8) and (10,8) path there, a tap on the rock at (9,2) stops at (9,3).

home.json cells may carry two optional fields both builds read: `lift` offsets a cell's drawn height by a fraction of a step (h units; on a bridge it moves only the water under the deck), and `patch: 1` draws a pale path patch on a grass top. Walking still uses `h`. The 2d build draws water-to-water drops, the log bridge, the plaza and path patches in canvas (`2d/water2d.js`, `2d/surface2d.js`) instead of sprites.

Sprite pipeline: `node 2d/gen/generate.mjs <ids>` (Gemini, logs to 2d/gen/ledger.jsonl and costs $0.045 each), `node 2d/gen/process.mjs` (key, scale, manifest), then `node 2d/gen/ramp.mjs` and `node 2d/gen/marker.mjs`, which rebuild the composite sprites that process.mjs overwrites.

## Procgen helpers

`core/procgen.js` exports `reachability(level)`, `checkLevel(level)`, `levelStats(level)`, `frameView(level)`, `VIEW` and `FRAME`. The seed-driven generator (`generateLevel`, `?level=gen&seed=N`, `tools/procgen-check.mjs`) was removed on 2026-10-08: it predated the artwork islands and the overlay's "new island" button dropped players into one of its generic islands. `?level=home` (or no `level`) still loads `levels/home.json`, the MVP reference match. The pipeline-A shapers in `pipeline/a-transcribe/build-level.mjs --seed N` are the route for seeded variation of the artwork islands.

`core/ui.js` exports `mountUI({ container })`: one "islands" link back to the root start page. Both build pages mount it. Without a container it mounts a fixed overlay in the bottom-right corner (top-right below 560 px wide, clear of the d-pad) and skips itself inside an iframe or when the query has `hero=0` or `ui=0`, so reference shots stay clean.

## Level hooks (3d)

`?level=<name>` loads `levels/<name>.json` for any name made of letters, digits, `-` and `_`. A missing or malformed file puts a readable message in the middle of the page, lists the files in `levels/`, and sets `window.__error`. Every hook below is optional; a level without them renders pixel-identical to the build before the hooks.

| Field | Contract |
| --- | --- |
| `palette` | Object merged over `3d/palette.js` PALETTE (core PALETTE plus 3d extras). An object value merges one level deep (`"grass": { "top": "#c8a4e8" }` keeps the other grass keys); arrays and strings replace. `palette.hero` merges over `HERO` in `3d/palette.js` (`skin`, `shirt`, `pants`, `hair`, `boot`, `belt`, `eye`, each a hex or `[top, left, right]`); without it the hero keeps its own colours. `palette.bg` is the background when the level has no `bg`. |
| `materials` | Object merged over core `MATERIALS` (surface to list of `m` names). A ramp `m` that names a palette entry with `top` (plus `edge`/`lip`, `fringe`/`fringeDark` or `left`/`right`) draws its slope in those colours, so `"moss": { "top", "edge", "lip" }` in `palette` plus `"m": "moss"` on a ramp cell adds a ramp material. |
| `light` | `{ "dir": [x, y, z], "ambient": a, "sun": s }`. Every baked vertex colour (terrain, decor, GLB, hero) is multiplied by `a + s * max(0, n . dir)`. Absent means factor 1, the pack's hand-toned faces. |
| `bg` | Background colour, as before. |
| `pieces` | List of module paths relative to `3d/`, e.g. `["pieces/forest-a.js"]`. Each exports `register(style)` returning `{ catalog, builders }`. `catalog` entries merge into core `CATALOG` (defaults: footprint `[1, 1]`, passable `false`, variants 1, height 1; `rotates`, `floats`, `attach`, `spin`, `glb`, `snap`, `flat`, `shade` optional) before the level is validated, so walking and blocking follow them. `builders[type](variant, rot, style, ctx)` returns a `THREE.Object3D` sized in world units with its base at y 0 and centred on the origin; the engine places it on the cell, applies `rot` and `ox`/`oz`, and `ctx` carries `height`, `drop`, `deck` and the `decor` entry. |

`style` is `{ palette, materials, hero, light, bg, swatches }` for the current level. `3d/pieces/example.js` is the template: it registers a code-built `rubber-duck` (Baker plus palette tones, returned as a mesh) and three GLB types. `levels/hooks-test.json` uses it with a palette override, a moss ramp material, a hero shirt and a light block:

```sh
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=hooks-test" out/hooks-test.png 700 700
```

### Merging

Builder and GLB meshes bake into the one static decor mesh (one draw call, x-ray window included) when their material is opaque. A mesh with vertex colours keeps them; otherwise the engine uses the material colour times its texture sampled at each vertex. Meshes with transparent materials, `userData.noMerge`, lines, points and sprites stay separate objects with a cloned x-ray material. Types in `SPIN` or with `spin: true` bake into their own spinning mesh. `shade: true` tones faces like the pack (top 1.0, +z side 0.83, +x side 0.67); the default is on for meshes without vertex colours and off for meshes with them.

### GLB decor

A catalog entry (base or from a pieces module) with `"glb": "assets/x.glb"` (relative to `3d/`) loads through `3d/vendor/jsm/loaders/GLTFLoader.js` before the game starts; `window.__done` waits for every GLB to resolve or fail. The loader scales the model uniformly so its height equals the catalog `height`, puts its lowest point on the cell surface, centres its x/z bounds on the cell, then applies `rot` and `ox`/`oz`. `"flat": true` gives each triangle one colour and a face normal; without it vertices keep their own colours and normals. `"snap": true` moves every vertex or sampled texture colour to the nearest hex in the level palette (luma-weighted sRGB distance). Only types the level places are loaded. A failed GLB logs `[glb] <type> (<path>) failed: ...` to the console and falls back to the type's builder, or to a magenta box.

Test GLBs come from `3d/export-glb.mjs`, which bakes any catalog type from `3d/pieces.js` (or a smooth off-palette `blob`) and writes it with GLTFExporter:

```sh
node 3d/export-glb.mjs well 3d/assets/test/well.glb
node 3d/export-glb.mjs blob 3d/assets/test/blob.glb
```

## 3d catalog page

`http://localhost:8765/3d/catalog.html` lays out every catalog type and variant on one island, with `?zoom=` and `?center=x,y,z` for close-ups:

```sh
node tools/shot.mjs "http://localhost:8765/3d/catalog.html" out/catalog-3d.png 1400 1000
```

Each type's geometry lives in its own function in `3d/pieces.js`; add a new catalog type there and it shows up on this page. The home island builds in about 25 ms into 5 draw calls and 14k triangles, plus 6 for the hero.

## Functional QA

```sh
PP_PROFILE=.pp-profile-qa node tools/qa.mjs
```

`qa.mjs` drives both builds and the root page in headless Chrome at 1200x800, 400x800, and 400x800 with touch emulated. It checks `window.__done` within 10 s, zero console errors and failed requests, one cell per WASD and arrow press, a tap on a walkable cell, a tap on a decor-blocked cell (the hero stops adjacent), the see-through window at `?level=home&spawn=0,1` (one frame rendered with `xray` 0 and 1, pixel diff), the seed field, new island button and home link, the root toggle, and the d-pad under touch. It prints PASS or FAIL per check, writes screenshots to `out/qa/`, and exits 1 on any failure.

```sh
PP_PROFILE=.pp-profile-qa node tools/qa-levels.mjs [base-url] [level,level,...]
```

`qa-levels.mjs` runs the same kind of checks on the pipeline levels in the 3d build: `forest-a`, `forest-b`, `forest-b-small`, `forest-c` and `hooks-test` by default. For each level it checks `window.__done` within 15 s (GLB loads included), zero console errors and failed requests, spawn against the level file, one step per W/D/S/A press, a click and a 400x800 touch tap on walkable cells, a key-driven climb from spawn up a ramp to the highest cell it can reach, and the see-through window with the hero spawned on the cell behind the tallest blocking piece. The 404 on `hooks-test`'s `glb-missing` counts as expected.

## Results

2026-09-23, committed `levels/home.json`, `?level=home&hero=0` at 351x390 against `ref/reference.png`:

| Build | MAD | NCC | Silhouette |
| --- | --- | --- | --- |
| 3d | 23.7 | 0.795 | 92.6% |
| 2d | 23.2 | 0.807 | 93.4% |

```sh
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=home&hero=0" out/final-3d.png 351 390
node tools/shot.mjs "http://localhost:8765/2d/index.html?level=home&hero=0" out/final-2d.png 351 390
node tools/compare.mjs ref/reference.png out/final-3d.png out/final-3d
node tools/compare.mjs ref/reference.png out/final-2d.png out/final-2d
```

`out/final-triptych.png` puts the reference, 3d and 2d side by side at 2x. `tools/qa.mjs`: 134 pass, 0 fail. `tools/qa-levels.mjs`: 70 pass, 0 fail.

## Pipeline results

2026-09-23, 3d build, `?level=<name>&hero=0` at 900x800 in `out/final/<name>.png`, one critic run each (`node pipeline/critic.mjs out/final/<name>.png --out out/final/<name>.json`, 3 votes). Walkable counts cells where `isWalkable` holds after decor blocking. New prop types are decor types the level places that the core catalog lacks; B's count includes its path, stair and skirt pieces. Spend comes from each variant's `SPEND.md`.

| Level | Size | Walkable | Decor | New prop types | Critic high / medium | Spend |
| --- | --- | --- | --- | --- | --- | --- |
| forest-a | 16x12 | 94 | 37 | 5 | 0 / 0 | $0.82 |
| forest-b | 8x8 | 43 | 28 | 10 | 1 / 1 | $1.20 (shared with forest-b-small) |
| forest-b-small | 6x6 | 22 | 24 | 11 | 1 / 1 | in forest-b |
| forest-c | 16x12 | 112 | 46 | 9 | 0 / 2 | $2.39 |
| home | 16x12 | 46 | 39 | 0 | 2 / 0 | n/a |

Remaining highs: forest-b's leaning trunk reads as driven into the trunk behind it (2/3), forest-b-small's leaning trunk tip hangs in air (2/3), and home's stone step and scaffold base read as floating (2/3 each). The scaffold flag is the calibration false positive noted in `pipeline/README.md`: rocks and a pine hide the tower's sand footing.

`out/final/bakeoff.png` (3680x1760) puts the seed drawing, fitted to 900x800 on `#1c222b`, beside the A, B and C renders, with B's concept (`pipeline/b-concept/concept.png`) beside B's render on the second row.

## Round 2 results

2026-09-23, five concept strategies through pipeline A on the same seed, rendered at 900x800 with `hero=0` into `out/final/`; the literal round-1 level is the baseline. Walkable counts every cell with h >= 1 and a walkable surface. QA: `tools/qa-levels.mjs` 84 pass, 0 fail across the six levels; `tools/qa.mjs` 134 pass, 0 fail; `tools/procgen-check.mjs 50` PASS.

| Level | Concept | Size | Walkable | Decor | New types | Critic high/med | $ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| forest-a | literal reading of the drawing | 16x12 | 120 | 37 | 5 | 0/0 | 0.82 (round 1) |
| forest-a-pack-first | pack look, drawing adds motifs | 16x12 | 127 | 43 | 5 | 0/0 | 0.14 |
| forest-a-scene | souls-like shrine clearing | 16x12 | 120 | 37 | 4 | 0/1 | 0.21 |
| forest-a-biome | dark pine biome from pack pieces | 16x12 | 127 | 53 | 1 | 0/2 | 0.09 |
| forest-a-motif-remap | strokes mapped to pack pieces | 16x12 | 140 | 49 | 1 | 0/0 | 0.22 |
| forest-a-composition-only | masses and focal point only | 16x12 | 84 | 36 | 1 | 0/0 | 0.11 |

Shared round-2 brief generation: $0.27 (five analyze runs) plus $0.13 of critic pre-runs logged against two levels. Sheet: `out/final/round2-concepts.jpg`. Card: `puffer-isoworld-concept-round-2`.

## Round 3 results

2026-09-29, eleven artworks through pipeline A with the scene strategy, three readings each (`analyze.mjs --variant k --avoid ...`), one pieces module per artwork. Walkable counts every cell with h >= 1 and a walkable surface. QA: `tools/qa-levels.mjs` over all 33 levels, 462 pass, 0 fail; cat-1 was rebuilt to the 80-cell floor afterwards and passed 14 of 14 alone. Every level loads at `3d/index.html?level=<slug>-<k>`. Sheet: `out/final/round3-sheet.jpg`, one row per artwork in `out/final/round3-<slug>.jpg`. Card: `puffer-isoworld-round-3-islands` (pick-per-group).

| Level | Size | Walkable | Decor | New types |
| --- | --- | --- | --- | --- |
| cat-1 | 16x12 | 106 | 19 | 2 |
| cat-2 | 16x12 | 98 | 27 | 3 |
| cat-3 | 16x12 | 113 | 28 | 3 |
| dragon-1 | 16x12 | 96 | 17 | 2 |
| dragon-2 | 16x12 | 107 | 23 | 2 |
| dragon-3 | 16x12 | 143 | 25 | 3 |
| ember-1 | 16x12 | 121 | 34 | 3 |
| ember-2 | 16x12 | 117 | 28 | 2 |
| ember-3 | 16x12 | 118 | 24 | 3 |
| chimera-1 | 16x12 | 112 | 27 | 3 |
| chimera-2 | 16x12 | 107 | 23 | 3 |
| chimera-3 | 16x12 | 141 | 30 | 4 |
| wizard-1 | 16x12 | 140 | 34 | 2 |
| wizard-2 | 16x12 | 119 | 24 | 3 |
| wizard-3 | 16x12 | 110 | 30 | 5 |
| swallow-1 | 16x12 | 114 | 26 | 3 |
| swallow-2 | 16x12 | 133 | 38 | 2 |
| swallow-3 | 16x12 | 113 | 24 | 4 |
| cosmos-1 | 16x12 | 128 | 37 | 2 |
| cosmos-2 | 16x12 | 106 | 15 | 2 |
| cosmos-3 | 16x12 | 119 | 23 | 4 |
| sharkbear-1 | 16x12 | 130 | 33 | 3 |
| sharkbear-2 | 16x12 | 114 | 24 | 3 |
| sharkbear-3 | 16x12 | 137 | 27 | 4 |
| gremlin-1 | 16x12 | 106 | 24 | 4 |
| gremlin-2 | 16x12 | 106 | 18 | 3 |
| gremlin-3 | 16x12 | 139 | 14 | 3 |
| mindbloom-1 | 16x12 | 112 | 30 | 3 |
| mindbloom-2 | 16x12 | 98 | 11 | 3 |
| mindbloom-3 | 16x12 | 146 | 28 | 3 |
| eagle-1 | 16x12 | 99 | 11 | 2 |
| eagle-2 | 16x12 | 106 | 15 | 2 |
| eagle-3 | 16x12 | 105 | 18 | 4 |

Round spend: $10.200 across 48 ledger lines (briefs and critic calls only).

## Round 4 results

2026-09-29, twelve artworks through pipeline A with artwork-derived readings: `analyze.mjs --deep` writes an analysis per piece (`pipeline/seed/analysis/`), then `--lens medium|subject|composition` argues one world from one aspect of it (briefs in `pipeline/seed/concepts/<slug>-<lens>.json`); build-level picks a named terrain shaper from the brief (used this round: basin 7, mound 5, spiral 2, patchwork 1, twin-mass 8, shards 5, ribbon 5, symmetric 2, radial 1). Round 3's levels are archived under `archive/round-3/` (tag `round-3`). Walkable counts every cell with h >= 1 and a walkable surface. QA: `tools/qa-levels.mjs` over all 36 levels, 503 pass, 1 fail (a dropped keypress on forest-medium in the batch run; it passed 14 of 14 alone). Every level loads at `3d/index.html?level=<slug>-<lens>`. Sheet: `out/final/round4-sheet.jpg`, one row per artwork in `out/final/round4-<slug>.jpg`. Card: `puffer-isoworld-round-4-lenses` (pick-per-group). The Gemini account ran out of credits (HTTP 402) during the last sharkbear and eagle loops; those final rounds were judged by eye, and the critic stays offline until the account is topped up.

| Level | Shaper | Walkable | Decor | New types |
| --- | --- | --- | --- | --- |
| forest-medium | basin | 110 | 24 | 5 |
| forest-subject | mound | 112 | 24 | 6 |
| forest-composition | spiral | 112 | 15 | 5 |
| cat-medium | patchwork | 112 | 23 | 5 |
| cat-subject | twin-mass | 114 | 20 | 8 |
| cat-composition | mound | 112 | 10 | 5 |
| dragon-medium | shards | 112 | 18 | 5 |
| dragon-subject | twin-mass | 105 | 19 | 4 |
| dragon-composition | ribbon | 100 | 24 | 6 |
| ember-medium | symmetric | 112 | 15 | 3 |
| ember-subject | basin | 99 | 15 | 6 |
| ember-composition | ribbon | 95 | 12 | 5 |
| chimera-medium | shards | 106 | 26 | 6 |
| chimera-subject | basin | 103 | 16 | 6 |
| chimera-composition | mound | 113 | 19 | 6 |
| wizard-medium | ribbon | 112 | 22 | 5 |
| wizard-subject | basin | 108 | 17 | 5 |
| wizard-composition | mound | 113 | 10 | 5 |
| swallow-medium | ribbon | 112 | 17 | 3 |
| swallow-subject | twin-mass | 104 | 18 | 4 |
| swallow-composition | spiral | 113 | 27 | 5 |
| cosmos-medium | radial | 102 | 16 | 7 |
| cosmos-subject | basin | 108 | 18 | 6 |
| cosmos-composition | twin-mass | 97 | 14 | 5 |
| sharkbear-medium | shards | 112 | 13 | 4 |
| sharkbear-subject | twin-mass | 100 | 12 | 4 |
| sharkbear-composition | mound | 112 | 12 | 5 |
| gremlin-medium | shards | 113 | 19 | 7 |
| gremlin-subject | basin | 108 | 19 | 5 |
| gremlin-composition | twin-mass | 93 | 12 | 6 |
| mindbloom-medium | symmetric | 112 | 44 | 8 |
| mindbloom-subject | basin | 105 | 31 | 8 |
| mindbloom-composition | twin-mass | 114 | 33 | 7 |
| eagle-medium | ribbon | 117 | 26 | 7 |
| eagle-subject | twin-mass | 96 | 10 | 6 |
| eagle-composition | shards | 118 | 17 | 6 |

Round spend: $9.324 across 41 ledger lines (analyses and briefs $4.23, critic the rest).

## Round 5 results

2026-09-30, forest and cosmos rebuilt with five readings each after the round-4 verdict rejected both. The Gemini account was out of credits (HTTP 402), so the build agents authored the briefs themselves from the deep analyses and judged renders by eye against the critic rubric; no generative spend this round. Each reading grows from one aspect of the artwork and uses its own shaper; four of the five cosmos shapers needed the finish step to rebuild terrain (see docs/NOTES.md). QA: `tools/qa-levels.mjs`, cosmos 70 pass, 0 fail; forest 70 pass, 0 fail. Levels load at `3d/index.html?level=<slug>-<aspect>`. Sheet: `out/final/round5-sheet.jpg`, rows in `out/final/round5-forest.jpg` and `round5-cosmos.jpg`. Card: `puffer-isoworld-round-5-forest-cosmos` (pick-per-group).

| Level | Shaper | Walkable | Decor | New types | Place |
| --- | --- | --- | --- | --- | --- |
| forest-tooth | patchwork | 111 | 22 | 6 | A cold-press sheet laid out as a quilt of paper tiles, charcoal dust caught blac |
| forest-lift | ribbon | 113 | 25 | 6 | One stroke of paper rubbed clean through night-black charcoal, the eraser's path |
| forest-volute | symmetric | 111 | 15 | 6 | A gilded rococo parterre carved out of the bird's scrollwork, clipped curl hedge |
| forest-trunks | shards | 110 | 21 | 6 | A colonnade of pale trunks on bark slabs split by seams of mist, dawn haze glowi |
| forest-roots | twin-mass | 113 | 13 | 6 | The forest floor at root height: a mossy root knee and a duff bank joined by the |
| cosmos-frisket | patchwork | 114 | 22 | 7 | A stencil yard of lifted frisket plates, each a hard-edged masked sheet at its o |
| cosmos-ringway | ribbon | 93 | 14 | 5 | The planet's ring as a road: one long pale band sprayed against a French curve,  |
| cosmos-lashline | symmetric | 118 | 23 | 7 | A lid temple: a mirrored ridge of rose flesh terraces where the lashes stand as  |
| cosmos-veinfield | shards | 97 | 19 | 6 | A porcelain plain of sclera cracked into slabs, where the zero-gauge capillaries |
| cosmos-nebula | spiral | 99 | 28 | 5 | A coil of yellow-green and teal gas hanging in the black, the path climbing its  |

## Refinement stage 1

2026-10-01, wind and ambient life (Route A, baked vertex motion, from `docs/refinement/motion.md`).

`Baker.sway(kind, opts, fn)` in `3d/baker.js` tags every triangle `fn` emits. Each vertex carries `aSway` (mode, amplitude or swatch rate, phase, span or duty), `aRoot` (the tag's root point in mesh space) and `aAlt` (a second swatch, shaded like the face). Untagged vertices carry zeros. `extractTris` and `bakeInto` in `3d/bake.js` carry the tags through pieces-module builders, so a module tags its own Baker and the engine bakes the tag into the merged decor mesh. `applyMotion` in `3d/motion.js` chains onto the x-ray `onBeforeCompile`: it displaces `transformed` after `begin_vertex`, before `project_vertex`, so the see-through window cuts the moved vertex. The decor mesh, the water mesh and the cloned x-ray materials of unmerged extras carry it. Phase adds a hash of the root's x and z, so neighbours differ and a reload keeps the same phase.

| Mode | Tagged pieces | Motion | Amplitude (world) |
| --- | --- | --- | --- |
| `crown` | pine tiers and round-tree cubes (root at the trunk top), `bush`, `bush-cluster`, `flower`, cat `bristle` tufts | slow sine lean, weighted by height above root, 1.3 and 0.97 rad/s | 0.045 crowns and tufts, 0.035 bushes and flowers |
| `flame` | `flame()` in torch and campfire, ember `flames()` | lean plus stretch, weighted by height squared, 9 to 13.7 rad/s | 0.04 |
| `ripple` | bubble discs on every water cell (`3d/terrain.js`) | circular drift, 0.7 to 0.9 rad/s | 0.035 |
| `fall` | waterfall bubble streaks, split into 8 segments | each segment shrinks onto its lower edge, the wave travelling down | at most 0.6 of a half segment |
| `mist` | forest-a `mist-bank`, forest-b `mist`, forest-a-pack-first `mist-wisp` | slow drift, 0.37 to 0.8 rad/s | 0.05 |
| `pickup` | coin, gem, star, heart (their spinner meshes) | bob plus a 0.18 rad yaw swing about the piece's centre | 0.05 |
| `swatch` | lantern glass, cat light box, ember vent pools (0.35 Hz, half duty); waterfall bands (0.7 Hz, 0.2 duty, phase stepping down the 8 segments) | colour steps between the baked swatch and `aAlt` | none |

Trunks, terrain, buildings and the hero carry no tag. `uTime` ramps the displacement in over its first 1.5 s, so motion starts from the rest pose. The game loop runs fixed 1/60 s steps and caps catch-up at 0.25 s, which is the clamp on tab return; `stepMotion` also caps one step at 0.1 s. The JS spinner swing in `3d/renderer.js` is gone: the shader drives pickups.

Frozen clock: `hero=0`, `t=<seconds>` and `prefers-reduced-motion: reduce` stop the clock. `window.__setTime(s)` sets it and stops the automatic clock, for frame-exact capture.

Draw calls from `renderer.info` at 900x800 are unchanged from the build before the stage: home 11 (5 with `hero=0`: land, water, decor, two coin spinners), cat-medium 9, ember-subject 9, gen seed 7 13. Home grows from 14457 to 14709 triangles (`hero=0`), the waterfall segments.

Compare at `?level=home&hero=0`, 351x390: MAD 23.7, NCC 0.795, silhouette 92.6%, and MAD 0.0 against the render from before the stage.

Capture:

```sh
export PP_PROFILE=.pp-profile-wind
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=home&hero=0" out/refine/stage1-before.png 900 800
node tools/clip.mjs "http://localhost:8765/3d/index.html?level=home&ui=0" out/refine/stage1-after.mp4
node tools/clip.mjs "http://localhost:8765/3d/index.html?level=cat-medium&ui=0" out/refine/stage1-cat-medium.mp4
```

`tools/clip.mjs <url> <out.mp4> [w=900] [h=800] [seconds=6] [fps=30] [start=2]` loads the page, calls `__setTime` once per frame from `start`, screenshots each frame into `<out>-frames/`, and encodes with libx264, yuv420p, crf 18. A 6 s clip takes about 45 s under swiftshader.


## Refinement stage 3

2026-10-01, stamps on ember-subject (Approach A in `docs/refinement/setpieces.md`).

### Schema

A catalog entry may carry `mask`, one object per footprint cell in row-major order of the unrotated footprint (`dz` outer, `dx` inner): `{ pass, h, over, span }`. `pass` says whether the hero may stand on the cell, `h` is the height the piece occupies there in world units, `over` is the bottom of geometry above head height (the hero walks under it), and `span: true` lets the cell sit on a bridge, water or void cell instead of land. `attach` names the placement rule: `route` (arch, road), `span` (bridge), `edge` (fence on a terrace lip) and the existing `cliff` and `under`. `x,z` stays the footprint's minimum corner after rotation.

`core/catalog.js` exports `stamp(footprint, mask, extra)`, which builds the entry from its mask (`passable` when every cell passes, `height` as the tallest cell, `rotates`, `stamp: true`), plus `maskCells(t, x, z, rot)` and `blockedCells(decor)`. Rotation turns the mask the way `3d/decor.js` turns the mesh: rot 1 maps local cell `(dx, dz)` of a `[w, d]` footprint to `(d - 1 - dz, dx)`. `prepareLevel` blocks only cells whose mask says `pass: false` and records cells under `over` geometry in `L.cover`. `checkLevel` reads the mask too: `span` cells may sit on bridge, water or void, and only blocking cells count against reach. An entry without `mask` behaves as before, so every existing level loads unchanged; `home` at `hero=0` compares MAD 0.0 against `out/final-3d.png`.

The 3d build needs no sort or x-ray change: the decor mesh is depth-tested, and the x-ray window cuts any fragment nearer than the hero and above its feet, so a lintel or crown over the hero opens like any other occluder. The 2d build still draws each sprite at its footprint centre and has no sprites for stamps; it skips them with an unknown-type warning.

### Stamps

`3d/stamps.js` exports `registerStamps(style, look)`. A pieces module merges its `catalog` and `builders` into its own `register()` result and passes a `look` (base, post, lintel, trim, rail, cobble, kerb, trunk, crown, and an optional `crest(B, x, y, z)` for the post tops); missing keys fall back to the level palette. `3d/pieces/ember.js` passes the HOT ramps and a flame crest.

| Type | Footprint | Mask | Helper |
| --- | --- | --- | --- |
| `arch` | 3x1 | posts block (h 2.6), centre passes under a lintel at 1.6 | `h.gate` places it in place of the post pair whenever `CATALOG.arch` is a stamp; `stamp: false` restores the posts |
| `bridge-span-1..3` | 1xN | every cell passes, `span` | `h.bridge({ route, frac, n, before, reach, void, sunk, split })` spans route bridge cells, or cuts a level straight run into bridge cells with a lava or water channel `reach` cells to each side and reverts when reach or the route breaks |
| `canopy` | 2x2 | trunk cell blocks, three cells pass under a crown at 1.9 tagged `crown` sway | `h.canopy({ route, near })` puts it 1 to `near` cells beside the figure, never in front of it, on four level land cells |
| `fence-run-2..4` | Nx1 | every cell blocks (h 0.8), rail on the `+z` lip | `h.fence({ route, max, minH })` finds straight runs on a terrace lip facing `+x` (rot 3) or `+z` (rot 0), prefers drops onto land near the route; `h.grow` leaves void beside an `edge` stamp alone |
| `road-run-2..4` | Nx1 | every cell passes (h 0.06) | `h.road({ route, max, until })` lays cobbles on straight path-surface runs of the route before index `until` |

`h.readability({ route })` logs the stage-3 check: route length, share of route cells on path surface, bridge or a passable stamp, gate position and blocked flanks, the figure's screen position at 351x390, taller pieces within two cells in front of the figure, the longest run of route cells under an occluder, and whether the route walks with decor blocking.

### ember-subject

`finishLens` paints the approach, places the arch, cuts a lava channel before it and spans it, then lays the canopy, road and, after the terrain repairs, the fence (an earlier fence lost its lip to `openRamps`).

```sh
node pipeline/a-transcribe/build-level.mjs --art ember --brief pipeline/seed/concepts/ember-subject.json --level ember-subject --pieces ember
```

Build log: arch spanning 8,7; bridge span 1 at 8,9 over a four-cell lava channel; canopy at 1,3 beside the figure; road-run-2 at 8..9,10; fence-run-2 at 7,4..7,5 above the route. Readability PASS: route 12 cells, 0.83 on path, gate at 0.36 with both flanks blocked, figure at x 0.52, y 0.30 of the frame, nothing taller in front, longest x-ray run 1, route walks. Walkable 84, reach 84/84.

Critic (`node pipeline/critic.mjs <png> --annotate ... --out ...`, 3 votes, files in `out/refine/critic/`): round 1 at 900x800 gave 0 high, 1 medium (the cobble road ran past the arch into a cliff, so roads now stop at the gate); round 2 gave 0 high, 0 medium at both 900x800 and 351x390. Spend $0.066 across 9 calls.

QA: `tools/qa-levels.mjs http://localhost:8765 ember-subject` 14 pass, 0 fail; its ramp climb walks 8,10, 8,9 (bridge), 8,8, 8,7 (arch) up to 9,2. `tools/qa.mjs` 134 pass, 0 fail. `tools/procgen-check.mjs 50` PASS.

Capture:

```sh
export PP_PROFILE=.pp-profile-stamps
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=ember-subject&hero=0" out/refine/stage3-after.png 900 800
node tools/clip.mjs "http://localhost:8765/3d/index.html?level=ember-subject&ui=0" out/refine/stage3-after.mp4
```

`out/refine/stage3-before.png` is the committed level before this stage at the same framing.

## Refinement stage 2

2026-10-01, style bible on cat-medium (Approach A plus B in `docs/refinement/cohesion.md`). The numbers live in `docs/STYLE.md` and in `BIBLE` in `3d/prims.js`.

### prims.js

`kit(B, { light, rot })` wraps a `Baker` and draws `rbox`, `box`, `wedge`, `spike`, `cone`, `cyl` and `disc` from a base hex. Each solid's faces take a step of `ramp(hex)` by world normal: top step 0, chamfer band step +1, left step -1, right step -2, bevel corners the midpoint, underside step -2; parts under 0.15 tile go two-tone. The kit divides every face colour by `lightFactor(light, n)` for the normal the decor baker will see after `rot`, so the level light multiplies it back to the ramp step. `lockedKit(B, style, rot)` reads `style.light`. Faces pass to `B.tri`, so `B.sway` tags still apply to anything drawn inside a sway block.

`figure(K, spec)` lays out `spec.parts` (`id`, `prim`, `dims` in tiles, `at`, optional `on` to stack on another part's top, `group` to turn with a pivot in `spec.groups`, `face: true` for details, `prim: "chain"` with `links` for a tail) and records each part's triangle range on `K.parts`. `audit(spec)` counts parts with a side of 0.15 tile or more, flags sub-0.08 parts off the face, and checks the `role: "head"` part against 0.35 to 0.45 of height; `figure` throws when the audit fails.

### The cat

`3d/pieces/cat.js` builds every `lead` or `creature` prop through `catSpec`: haunch, back, bib, two legs, paws, a four-link tail, head, blaze, muzzle and two ears (12 parts), plus eyes, pupils, nose, open mouth, tongue, fangs and inner ears as face details. Head block 0.82 of a 2.3-tile figure (0.36), ears to the top. `catColours` picks the darkest lead tone as body, the most saturated yellow-orange as coat, the palest as bib and a pink-red as accent, so cat-subject and cat-composition get their own cats. Lead height now clamps to 2.4..3 (was 2.6..3); the lens bases (palette, box, tiers) and every lens prop are unchanged. The head turns 0.12 to 0.26 rad by variant through the `head` group. `figures(style)` exports the specs, and the builder's mesh carries `userData.parts` and `userData.audit`. No level JSON changed.

### Cohesion

```sh
node tools/cohesion.mjs <render.png> <level> [--json]
```

Rows: highlight V p90 of non-background pixels; palette CIEDE2000 from each swatch (exact colours covering 0.1% of the foreground, edge pixels against the background dropped) to the nearest step of a ramp built from every palette hex and every hex literal in the engine and the level's piece modules, as shown raw, under the level light, under the pack shade and darkened 0.85; terrain cliff right/left from the palette under the level light, with the pixel count of each tone in the render; creature parts and head ratio from the module's `figures()`; face left/top and right/left per part from the module's bake under the level light, with how many of those tones the render contains; scale bands from the catalog (decals exempt). Exit code 1 on any FAIL.

| Row | cat-medium before | cat-medium after | home (control) |
| --- | --- | --- | --- |
| highlight V p90 | 1.000 | 1.000 | 1.000 |
| palette max / p90 | 1.84 / 0.43 | 1.84 / 0.43 | 3.32 / 0.00 |
| upper cliff right/left | 0.627 FAIL | 0.627 FAIL | 0.814 |
| lower cliff right/left | 0.673 | 0.673 | 0.709 |
| cat parts | no `figures()` | 12, head 0.36 | n/a |
| cat face left/top | 0.79 mean, 0.73 to 0.86 | 0.881, worst 0.883 | n/a |
| cat face right/left | 0.72 mean, 0.58 to 0.78 | 0.748, worst 0.747 | n/a |
| scale bands | pass | pass | pass |

The before face ratios come from the old FAUVE tone triples under the cat-medium light; the old module records no part ranges. Home compares identical at `hero=0`, 351x390: MAD 0.0 against its pre-stage render, MAD 23.7, NCC 0.795, silhouette 92.6% against `ref/reference.png`.

### Validation

Critic, 3 votes, files in `out/refine/s2/critic/`: round 1 gave 0 high, 0 medium at 900x800 and 351x390 (three single-vote items at 351, none agreed). Spend $0.038. `tools/qa-levels.mjs http://localhost:8765 cat-medium` 14 pass, 0 fail; cat-subject and cat-composition 14 pass each. `tools/qa.mjs` 134 pass, 0 fail.

Capture:

```sh
export PP_PROFILE=.pp-profile-style
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=cat-medium&hero=0" out/refine/stage2-after.png 900 800
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=cat-medium&hero=0&zoom=102.87" out/refine/s2/after-2x.png 1800 1600
```

`zoom=102.87` at 1800x1600 doubles the 900x800 framing (the renderer skips its frame fit when `zoom` is set). `out/refine/stage2-before.png` is the committed cat-medium at 900x800; `out/refine/stage2-cat-crop.png` puts the 400 px crops at 450,220 of the 2x renders side by side, before on the left.

## Refinement stage 4

2026-10-01, things on wizard-medium (`docs/refinement/setpieces.md` step 2, `docs/refinement/motion.md` live parts).

### Schema

A level may carry `things`, a list of `{ "id", "kind", "x", "z", "rot", "state", ...params }`. `prepareLevel` drops unknown kinds and out-of-bounds entries with a warning, fills `rot` 0 and the starting `state`, and adds each thing's blocked cells to `L.blocked`. A level without `things` loads as before.

| Kind | Start state | Params | Behaviour |
| --- | --- | --- | --- |
| `bonfire` | `unlit` | `text` | Blocks its cell. Use from any of the 8 neighbours: it lights, toasts, and saves the hero's cell as the respawn. Use again to rest. |
| `chest` | `closed` | `text` (the toast line) | Blocks its cell. Use from a neighbour: the lid swings back, the toast shows `text`, and the chest stays open. `rot` turns the front toward the route. |
| `gate` | `closed` | `blocks`, `open`, `threshold`, `span` (`x` or `z`), `width`, `height`, `frame` | `blocks` cells (default its own) stay blocked until `open` holds: `watcher:<id>` (the watcher has turned to face the hero, at least 0.9 of its turn, while the hero stands on a `threshold` cell), `chest:<id>` (that chest is open) or `bonfire:<id>`. Opening deletes the cells from `L.blocked`; the bars retract into the lintel. `frame: false` skips the engine's posts and lintel when decor posts already flank the cell. |
| `elevator` | `idle` | `run`, `to` | Passable. Use while standing on it: the deck rises 2.4 world units over 1.6 s with the hero on it, then the page loads the next level in `run` after the current one (or `to`) with `?level=<next>&from=<current>`. With no next level it toasts a stub line and descends. |
| `watcher` | `idle` | `size`, `radius` | Sits on the lead decor at the same `x,z`, which carries `"watch": "<id>"`. Inside `radius` (world distance from the footprint centre) the head turns to face the hero and the hat crest flame brightens; outside it the head returns to its pose. |

### Interaction

`core/interact.js` owns the state. `createInteract(level, { params })` runs once per page when the level has things; `core/game.js` calls its `update(dt)` each fixed step after the actor, with `dt` clamped to 0.1 s. The action key is E, Enter or numpad Enter. A tap on a bonfire, chest or elevator cell walks the hero beside it (onto it for the elevator) and uses it on arrival. A pill at the bottom centre names the action while a thing is in range and can itself be tapped; a toast at the top centre holds for 2.6 s. Neither shows with `hero=0`.

State persists per level in `localStorage` under `isoworld:things:<level name>`: thing states and the bonfire respawn cell. `?reset=1` clears it on load. A lit bonfire puts the hero on its respawn cell at load, unless `spawn=` says otherwise. `nav=0` stops the elevator from changing page (the clip uses it). `window.__game.pause()` and `window.__game.advance(seconds)` step the game without the frame loop.

### Engine

`3d/things.js` bakes the static bodies (bonfire ring and sword, chest base, elevator frame, gate frame) into the merged decor mesh through the new `bakeExtra` option of `buildDecor`, so they cost no draw call. Each moving part is its own small mesh with `userData.noMerge` and the x-ray and motion material: the bonfire flame (hidden until lit, flame sway), the chest lid, the gate bars and the elevator deck. A pieces-module builder splits a live part out by returning a group with a `noMerge` child tagged `userData.live = { thing, part, rest, limit, pivot, flame, flameRoot, hot }`; `3d/pieces/wizard.js` does this for the wizard's head and hat when `ctx.decor.watch` is set. The head turns about its pivot, clamped to 1.5 rad of its rest yaw, and the crest flame's vertex colours and size lerp toward the hot tone.

`3d/tween.js` runs the triggers: each tween starts from the current value, eases back-out by default (in-out for the ride and the glow fading), and clamps `dt` to 0.1 s.

A level palette may carry `things` (`stone`, `ash`, `wood`, `metal`, `blade`, `flame`, `core`, `lamp`, `deck`, `trim`, `post`, `cap`, each a tone triple) to dress the things; the wizard finish writes the wizard's own.

Draw calls from `renderer.info` at 900x800: wizard-medium 16 before the stage, 20 after (10 and 14 with `hero=0`), so four live parts plus one more when the bonfire lights: at most one per thing, five things. Home stays at 11.

### wizard-medium

`placeThings(level, h, o)` in `3d/pieces/wizard.js` runs at the end of the medium-lens finish. It picks the gate on a straight, flat approach cell at 0.3 to 0.85 of the route that cuts the figure off; when a side path goes round it (here the south terrace), it plugs the bypass with one more ink spire that costs no reach. Then: the bonfire within 3 cells of spawn off the route, the chest one or two cells off the route before the gate, the watcher on the wizard with its radius reaching the threshold cell, and the elevator on a rim cell past the gate facing the void.

```sh
node pipeline/a-transcribe/build-level.mjs --art wizard --brief pipeline/seed/concepts/wizard-medium.json --level wizard-medium --pieces wizard
```

Build log: plug brush-flick-spire at 9,6; bonfire 1,9 (2 cells from spawn 2,10), chest 5,8, gate 7,6 between the star-doodle totems at 0.64 of a 15-cell route, threshold 7,7, watcher radius 6.3, elevator 8,1 with run `wizard-medium`, `cat-medium`. Reach: every cell reachable with the gate open, the bonfire and chest reachable with it closed, the elevator and 51 cells only past the gate. checkLevel and prepareLevel clean, reach 96/96.

### QA and critic

```sh
export PP_PROFILE=.pp-profile-things
node tools/qa-things.mjs [base-url] [level]
node tools/qa-things.mjs --clip out/refine/stage4-after.mp4
```

`qa-things.mjs` loads with `?reset=1` and drives the hero with keys: prompt beside the bonfire, E lights it (state, toast, flame part); Enter opens the chest (state, toast, lid at -1.95 rad, stays open); the watcher idles until the hero reaches the threshold, then turns (head matrix moves, crest glow 1); the gate opens and its cell turns walkable; the hero walks through to the elevator, E rides it and the page lands on `level=cat-medium&from=wizard-medium`. A reload keeps the states and respawns at the bonfire, `?reset=1` clears them, a tap on the bonfire from the threshold walks over and lights it, and the watcher returns to its pose. It clears its storage key at the end. `--clip` steps the same walk at 30 fps through `advance` with `nav=0` and encodes like `tools/clip.mjs`.

Results: `qa-things.mjs` 34 pass, 0 fail; `qa.mjs` 134 pass, 0 fail; `qa-levels.mjs` over wizard-medium, wizard-subject, wizard-composition, cat-medium and ember-subject 70 pass, 0 fail; `procgen-check.mjs 50` PASS; home at `hero=0`, 351x390, MAD 0.0 against `out/final-3d.png`. Critic (3 votes, `out/refine/s4/critic/`): round 1 at 900x800 0 high, 0 medium; at 351x390 0 high, 1 medium, a whole-frame "pixelated raster" style note. Round 2: a mid-walk frame (bonfire lit, chest open, gate up) 0 high, 0 medium; the committed level before this stage draws the same 351x390 medium note, so the stage left it as a baseline. Spend $0.108 across 15 calls.

Capture: `out/refine/stage4-before.png` is `out/final/wizard-medium.png`; `stage4-after.png` is `?level=wizard-medium&hero=0&reset=1` at 900x800; `stage4-after.mp4` is the 9.6 s `--clip` walk: bonfire, chest, threshold as the wizard turns, gate, elevator ride.

## Loops stage 1

2026-10-02, the decor rule loop from `docs/loops/decor.md`, proven on ember-subject.

```sh
node pipeline/a-transcribe/build-level.mjs --art ember --brief pipeline/seed/concepts/ember-subject.json --level ember-subject --pieces ember
node tools/loops/decor-loop.mjs ember-subject --write
node tools/loops/decor-metrics.mjs home,ember-subject,cat-medium,wizard-medium
```

The loop runs as a second command after the build. It reads the level JSON and the brief at `pipeline/seed/concepts/<level>.json`, seeds itself from the level name (`--seed n` overrides it), and writes the same file for the same seed. A finish script can call the same pass as `h.cluster()`; `pipeline/a-transcribe/finish-cluster.mjs` holds both. `--out file.json` writes elsewhere; neither flag means a dry run.

`decor-metrics.mjs` counts as props every decor entry except the figure, flat passable floor stamps (`road-run`, `bridge-span`, `stepping-stones`, `marker`) and floating pickups. Two 1x1 props share a cluster when their cells touch (Chebyshev 1); a multi-cell stamp (arch, canopy, fence run) joins one neighbour's cluster but never links two clusters. Zones split the land outside the figure: figure court within 2 cells of the figure, threshold within 1 of the gate on the route, approach within 1 of the BFS route from spawn to the figure, rim the rest. Bands: figure 0.15 to 0.4, threshold 0.2 to 0.5, approach 0.15 to 0.35, rim 0.2 to 0.35, whole island 0.25 to 0.35, and the rim may not run denser than the figure court. No type may pass 35% of props, and a cluster of two or more movable props holds at least two types. `--render png --overlay out.png` adds the figure-versus-rim edge ratio and draws clusters, singletons and the route.

The loop draws new props round-robin from the brief's named motifs, the island's movable types, and `rock`/`rock-big` when the palette carries rock tones. It puts low passable pieces (height up to 0.6) within one cell of the route or in the figure court, and taller blocking pieces away from them, relaxing that only when nothing else fits. It never moves the figure, gates, lights, things, stamps or any multi-cell piece, never touches cells, and keeps every prop off the route.

| Level | Props/walkable | Figure | Threshold | Approach | Rim | All | Singleton share | Top type share | Clusters | Mean spacing | Beats | Trail gap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `home` | 33/66 | n/a | n/a | 0.38 | 0.62 | 0.50 | 0.03 | 0.12 | 8 | 3.8 | n/a | 1 |
| `ember-subject` before | 12/92 | 0.17 | 0.13 | 0.14 | 0.10 | 0.13 | 0.50 | 0.33 | 9 | 2.6 | 1/5 | 1 |
| `ember-subject` after | 23/92 | 0.21 | 0.40 | 0.29 | 0.21 | 0.25 | 0.00 | 0.17 | 6 | 3.1 | 5/5 | 1 |
| `cat-medium` | 10/108 | 0.08 | 0.18 | 0.07 | 0.09 | 0.09 | 0.70 | 0.30 | 8 | 3.2 | 1/5 | 1 |
| `wizard-medium` | 12/108 | 0.13 | 0.19 | 0.12 | 0.06 | 0.11 | 0.58 | 0.58 | 9 | 2.3 | 3/5 | 3 |

ember-subject singleton share reads 0.50 under these rules; LOOPS.md's 0.57 counted the road and bridge stamps. The loop made 10 moves: two gathers, one fill, three mixed pairs, two extensions into the figure court, two grows. After it, the props run `calcined_bone_pile` 4, `glowing_ember_vent` 4, `curved_ram_horn` 3, `dorsal_crest_fin` 3, `feathered_flame_flick` 3, `rock-big` 1, `rock` 1, plus the four fixed stamps. Every zone sits in band, no cluster holds one type, reach goes 84/84 to 76/76 with nothing missing (new props block eight cells), the route stays 12 steps, and the longest x-ray run stays 3. Same-family share for clusters of three or more reads 0.50: mixed clusters trade family coherence for type variety. The figure-versus-rim edge ratio reads 0.92 against 0.96 before, still under the 1.2 target; matching rim density to the figure court held it near level but did not raise it. Dry runs: cat-medium 0.70 to 0.04, wizard-medium 0.58 to 0.00, neither written.

Files in `out/loops/`: `ember-decor-before.png` renders the committed level before the loop (`out/final/ember-subject.png` predates stage 3 and no longer matches it), `ember-decor-after.png`, `ember-decor-overlay.png`, `ember-decor-overlay-before.png`. Critic on the after render (3 votes, `out/loops/critic-ember-after.json`): 0 high, 0 medium, clean. An earlier pass that piled 13 bone piles drew 0 high, 1 medium; total critic spend $0.047 across 6 calls. QA: `PP_PROFILE=.pp-profile-loops1 node tools/qa-levels.mjs http://localhost:8765 ember-subject` 14 pass, 0 fail.

## Multi-tile props

`3d/pieces/multitile.js` builds the eight generic props on `3d/prims.js` from the samples in `pipeline/multitile/`. Each `PROPS` entry carries `footprint`, `height`, `build` and an optional `mask`; `register()` turns it into a stamp, solid when `mask` is absent. `partsOf(type)` lists the non-face parts.

| Type | Footprint | Height | Parts | Mask | Sway |
| --- | --- | --- | --- | --- | --- |
| `windmill` | 3x3 | 4 | 13 | solid | sails `crown` |
| `canopy-tree` | 3x3 | 4 | 10 | solid | crown cubes `crown`, root at 2.75 |
| `watchtower` | 2x2 | 4 | 14 | solid | none |
| `gatehouse` | 3x2 | 3 | 14 | middle column passes, arch `over` 1.6 on the back cell; front-right cell passes | none |
| `shipwreck` | 4x2 | 3 | 15 | back row blocks with `span` (water), front row: two hull cells block, two dock cells pass | flag `crown` |
| `shrine` | 3x3 | 2 | 12 | four column corners block, the centre cross passes under the roof (`over` 1.6) | none |
| `market-row` | 3x1 | 2 | 12 | solid | awning, roll and valance `crown` at 0.5 amplitude |
| `waterfall-cliff` | 2x3 | 3 | 14 | cliff rows block, front pool row blocks with `span` | falls `fall` and `swatch` per segment, pool cubes `ripple` |

The builder origin sits at the footprint centre on the anchor cell's surface. The shipwreck anchor is a water cell, so its dock rises 0.1 to meet sand.

`levels/showcase.json` lays the eight props on 5x5 sand slabs in a 23x11 grid, joined by one-cell necks, with a two-high step and ramp beside the waterfall slab for the QA climb. The shipwreck and gatehouse slabs place their props at `rot` 3 and 0 to match the samples' orientation. Spawn 22,10. `levels/showcase-code.json` keeps the first two props.

```sh
PP_PROFILE=.pp-profile-generic node tools/shot.mjs "http://localhost:8765/3d/index.html?level=showcase&hero=0&ui=0" out/multitile/showcase.png 1200 900
PP_PROFILE=.pp-profile-generic node tools/qa-levels.mjs http://localhost:8765 showcase
```

`out/multitile/code-<type>.png` renders each prop alone on a 5x5 slab with the hero on a front tile: a 900x1000 shot at zoom 40 of a one-slab level, cropped 800x800 from 50,100 and scaled to 600. The one-slab levels never touch `levels/`: the render script served them through request interception. `out/multitile/generic-compare.png` puts each sample above its build, eight columns.

Results, 2026-10-02: `qa-levels.mjs` on showcase 14 pass, 0 fail (one earlier run failed the first KeyW step and passed on rerun). Key walks from 20,0 go 20,1, 20,2, 20,3 under the gatehouse arch; from 8,5 they go through the shrine to 8,9, and from 6,8 across it to 10,8. Reach 161/161.

## Multi-tile placement

2026-10-03, the twelve themed props placed on their islands through each island module's finishLens, terrain unchanged, levels rebuilt through the pipeline. Walk QA 14 of 14 per island; critic 0 high except cat-medium (a knife reading as cutting the plinth, hub since raised) and swallow-medium (an old feather spire). Five props dropped one footprint step to fit.

| Island | Prop | Footprint | Cell | Note |
| --- | --- | --- | --- | --- |
| cat-medium | paint-tube windmill | 3x3 | 9,1 | east field, seven cells from the cat |
| dragon-medium | graphite crane | 3x2 | 11,8 | beside the figure court; rebuild needs --seed 6 |
| chimera-medium | ink monolith | 2x2 | 1,4 | h2 shelf behind the figure |
| wizard-medium | scroll tower | 2x2 | 5,2 | h3 behind the gate |
| swallow-medium | blade arch | 3x1 | 9,1 | behind the figure |
| sharkbear-medium | shard watchtower | 2x2 | 1,1 | back corner; rebuild needs --seed 8 |
| gremlin-subject | specimen vat | 2x2 | 6,6 | west of the scout |
| mindbloom-medium | doodle fountain | 2x2 (from 3x3) | 2,5 | west shelf; reads small |
| eagle-composition | slate eyrie | 2x2 (from 3x3) | 8,5 | beside the bust |
| forest-volute | gilt gazebo | 2x2 (from 3x3) | 2,3 | behind the bird; placed after finishAspect |
| cosmos-frisket | stencil press | 3x2 (from 4x3) | 7,1 | back strip; bed hidden by the court |
| ember-subject | brimstone forge | 2x2 (from 3x3) | 5,7 | beside the approach; decor loop undershoots density after it |

Sheet: `out/multitile/islands-sheet.jpg`. Card: `puffer-isoworld-multitile-build`.

## Loops stage 2

2026-10-05, layout metric loop from `docs/loops/layout.md`, proven on `levels/wizard-medium-layout.json`, a copy of `wizard-medium` taken before the sibling rebuilds landed.

```sh
node tools/loops/layout-metrics.mjs home,wizard-medium,cat-medium,dragon-medium,ember-subject
node tools/loops/layout-loop.mjs wizard-medium-layout --write
PP_PROFILE=.pp-profile-layout node tools/shot.mjs "http://localhost:8765/3d/index.html?level=wizard-medium-layout&hero=0" out/loops/layout/wizard-after.png 900 800
node tools/loops/layout-metrics.mjs wizard-medium-layout --render out/loops/layout/wizard-after.png --overlay out/loops/layout/wizard-overlay.png
```

`tools/loops/graph.mjs` holds the shared walk model: walkable cells with decor, bonfire and chest blocking and the gate open or closed, BFS, the figure ring, the region graph (same-height plateaus plus ramp and bridge connector nodes), districts and convex-hull fill. `layout-metrics.mjs` casts isovists from an eye 1.5 world units above the cell top; a cell counts as seen when the ray to its centre or one of four inset points clears terrain (ramps by their slope), blocking decor at catalogue height, mask cells, the closed gate at 1.5 and bonfire or chest at 0.6. The figure counts as seen when a ray reaches 55% or 90% of its height over any footprint cell. Reveal counts cells seen from the threshold that no route cell before it sees. Dead ends are leaf region nodes off the critical path with no bonfire, chest or elevator and no sightline to the figure. Frame balance projects the figure, the largest blocking prop and the land centroid through the level's `view` block at 900x800; pass needs the figure and the weighted mass in the middle third and the land centroid within 12%. Route detour divides BFS steps by the Manhattan distance; the `*` marks a ratio outside pathing.md's 1.3 to 1.8, which a linear approach rarely reaches.

Readings on the live files at 2026-10-05 (siblings were rebuilding `wizard-medium`, so its row differs from the copy's before row):

| Level | Spawn isovist | Threshold isovist / reveal | Figure seen (spawn, threshold, mid; route share) | Districts / plateaus | Lips cliff/ramp, 1-cell runs | Figure third | Route / straight (ratio) | Choice | Dead ends / leaves |
|---|---|---|---|---|---|---|---|---|---|
| `home` | 78% | n/a | no figure | 2/7 | 4/1, 4/4 | n/a | n/a | 0 | 8/8 |
| `wizard-medium` | 43% | 14% / 0% | n n n, 33% | 3/6 | 39/6, 10/18 | right middle | 14 / 14 (1.00) | 1 | 0/3 |
| `cat-medium` | 48% | 38% / 1% | n n y, 77% | 4/5 | 27/4, 4/10 | middle top | 12 / 12 (1.00) | 1 | 1/2 |
| `dragon-medium` | 58% | 72% / 2% | y y y, 100% | 2/6 | 20/5, 5/9 | right middle | 13 / 13 (1.00) | 1 | 0/4 |
| `ember-subject` | 50% | 42% / 1% | y n n, 58% | 3/7 | 36/8, 16/23 | middle top | 11 / 11 (1.00) | 2 | 0/4 |
| `wizard-medium-layout` before | 42% | 22% / 3% | n n n, 33% | 3/6 | 39/6, 10/18 | right middle | 14 / 14 (1.00) | 1 | 0/3 |
| `wizard-medium-layout` after | 42% | 24% / 3% | y n n, 64% | 3/6 | 39/6, 10/18 | right middle | 13 / 11 (1.18) | 1 | 0/4 |

`home` reads 39/46 reach because its islets sit apart by design, and its eight dead ends are those islets and bridge stubs.

The loop scores spawn isovist against 33 to 55%, threshold reveal against 20%, figure sight from spawn, threshold and route midpoint, route share seeing the figure against 70%, dead ends, route length and choice points. Moves: relocate a single-cell blocking prop whose removal alone lowers the cost to one of the 16 nearest free cells (seed breaks ties), add a ramp between existing heights off the rim, drop a ramp off the route, add a one-cell bridge between equal heights, shift spawn to a rim cell within 4 of the bonfire, and shift or rotate the gate with its posts along the route. It never touches cell heights or surfaces outside a connector cell, the figure, things other than the gate, the themed prop, lights or gate posts. A move keeps only if the cost falls and every walk check holds: reach, bonfire, chest, elevator and figure reachable with the gate open; figure cut off and threshold reachable with it closed; threshold inside the watcher radius; a climb from spawn; route length in band; no new region-graph cycle (`--loops` lifts that, per the 2026-10-03 linear-approach decision); no new prop-to-surface misfit; x-ray run held at 3; and the qa-levels see-through window kept as strong. A first run moved the spire at 8,8 off the threshold diagonal, and qa-levels then failed its see-through check on the next-best piece; the window check came from that.

On the copy the loop stopped after four moves, with no improving candidate among 26: spawn 2,10 to 2,6, spire 1,6 to 3,4, spawn 2,6 to 1,6, staff perch 1,8 to 1,10. Cost 5.21 to 3.39. The figure now shows from spawn and from 64% of route cells, up from 33%; spawn isovist holds at 42%; the route runs 13 steps against 14. Three targets stay out of reach without terrain: the threshold at 7,7 cannot see the figure because the right gate post at 8,6 stands 2.6 above an h3 cell on the sightline; the threshold reveals 3% because the open h3 plateau shows nearly everything before the gate; and districts stay 3 with hull fill 0.52 and 0.51 on the two big plateaus. No other gate cell on the route still cuts the figure off when closed.

Files in `out/loops/layout/` (gitignored): `wizard-before.png`, `wizard-after.png`, `wizard-overlay-before.png`, `wizard-overlay.png` (green cells seen from spawn, red unseen, route dashed, sightlines yellow when clear and red when blocked), `wizard-medium-layout.before.json`, `critic-wizard-after.json`, `qa.txt`. Critic on the after render, 3 votes: 0 high, 0 other, $0.0216; an earlier critic pass on the first, discarded after render also read clean at $0.0220. QA: `PP_PROFILE=.pp-profile-layout node tools/qa-levels.mjs http://localhost:8765 wizard-medium-layout` 14 pass, 0 fail.

## Pass 2: generic props and the decor loop

2026-10-05, after the multi-tile and decor-loop approvals. Each picked island got one or two generic props chosen from its brief, placed through finishLens as secondary landmarks (never on the route, a ramp, the figure, the things, the stamps, or the themed prop; terrain untouched), then the decor loop ran as the pass after build. Nine of twelve islands took a prop; forest-volute, ember-subject, and sharkbear-medium had no spot that kept every cell reachable. Two islands then failed the tap check because an h2 terrace hid route cell 2,7 and the loop had put the tap target there; moving the occluders (a watchtower on swallow, scroll pads on wizard) fixed both. Walk QA 14 of 14 on every island after the fix.

| Island | Generic prop | Cell | Singletons | Density | Critic high |
| --- | --- | --- | --- | --- | --- |
| cat-medium | market row | 11,6 | 0.04 | 0.23 | 0 |
| dragon-medium | watchtower | 2,7 | 0.00 | 0.26 | 0 |
| chimera-medium | watchtower | 12,2 | 0.05 | 0.22 | 0 |
| wizard-medium | market row (shrunk) | 11,9 | 0.00 | 0.26 | 0 |
| swallow-medium | watchtower (1x1) | 9,9 | 0.00 | 0.25 | 1 (tower read as floating) |
| sharkbear-medium | none | | 0.00 | 0.25 | 1 (threshold lintel, posts verified on flat tiles) |
| gremlin-subject | market row | 6,9 | 0.00 | 0.25 | 0 |
| mindbloom-medium | shrine | 3,1 | 0.04 | 0.22 | 0 (medium: shrine too large) |
| eagle-composition | watchtower | 7,9 | 0.00 | 0.25 | 0 |
| forest-volute | none | | 0.00 | 0.24 | 0 |
| cosmos-frisket | market row | 13,6 | 0.00 | 0.25 | 0 |
| ember-subject | none | | 0.00 | 0.18 | 0 |

Known: the decor loop stalls when rim density exceeds the figure court's; the generic placer lives in `3d/pieces/multitile-place-a.js` (with a `spawnGap` option) and inline in four B modules, to be unified. Sheet: `out/pass2/islands-sheet.jpg`. Card: `puffer-isoworld-pass-2-islands`.

## Pass 3 tooling

2026-10-06. One generic placer, the decor loop's rim stall broken, bounded terrain edits in the layout loop, loops stage 3 walks and overlays, and a figure-scale table. The island agents run the commands below; each one is safe to rerun.

### Rebuild check

```sh
node tools/loops/rebuild.mjs
node tools/loops/rebuild.mjs cat-medium,ember-subject
node tools/loops/rebuild.mjs --ref=HEAD~1
```

`rebuild.mjs` reads each island's shaper seed from `pipeline/a-transcribe/shaped/<level>.json`, runs `build-level.mjs --art <slug> --brief pipeline/seed/concepts/<level>.json --level <level> --pieces <slug> --seed <n>` and then `decor-loop.mjs <level> --write`, and compares `levels/<level>.json` with git. It writes the levels in place, so stash or commit first. Each line reads `identical`, `placer-only` (only generic-prop decor, `pieces` entries for the multitile modules, or `palette.multitile` changed) or `differs [keys]`. `--no-decor` skips the decor loop.

### Unified placer

`3d/pieces/multitile-place.js` exports `placeGeneric(level, h, want, o)`, `register()` for the `-small` variants, `tint(level)`, `ROLES` and the `UNPADDED` profile. `want` takes a generic type, a role from `ROLES` (`lookout`, `trade`, `devotion`, `passage`, `labour`, `shade`, `wreck`, `water`) or an array; the placer tries every full-size type first, then each one shrunk one step (`shrink: false` turns that off). It scans flat footprints at one height off the route, ramps and their neighbours (`pad`), the figure, spawn, things, stamps, fixed decor and two cells from any multi-tile landmark, never in front of the figure, with `spawnGap`, `near`, `span`, `at` and `figGap` steering the score. A spot keeps only if reach and the approach length hold and, unless `sight: false`, the readability walk, x-ray run and taller-in-front count hold. `clear: true` removes movable blockers beside cells the prop cuts off. `look` tints the prop with hand tones; without it `tint()` takes the island's wood, dirt, stone and sand. `UNPADDED` reproduces the old B placer: no padding, 70% span, a four-diagonal cover test weighted 3, blocker clearing, no sight check.

cat, chimera, dragon, swallow and wizard import it in place of `multitile-place-a.js` (deleted); gremlin, mindbloom, eagle and cosmos call it with `UNPADDED` instead of their inline `placeProp`. sharkbear, forest and ember have no generic prop and do not call it. Rebuild on the commit before the decor-loop change:

| Level | Seed | Result |
| --- | --- | --- |
| cat-medium | 1 | identical |
| dragon-medium | 6 | identical |
| chimera-medium | 1 | identical |
| wizard-medium | 1 | placer-only: `pieces` names `multitile-place.js` |
| swallow-medium | 1 | placer-only: `pieces` names `multitile-place.js` |
| sharkbear-medium | 8 | identical |
| gremlin-subject | 1 | identical |
| mindbloom-medium | 1 | identical |
| eagle-composition | 6 | identical |
| forest-volute | 7 | identical |
| cosmos-frisket | 7 | identical |
| ember-subject | 1 | identical |

QA on wizard-medium, swallow-medium and gremlin-subject: 42 pass, 0 fail.

### Decor loop rim stall

```sh
node tools/loops/decor-loop.mjs ember-subject
node tools/loops/decor-loop.mjs ember-subject --write
node tools/loops/decor-loop.mjs ember-subject --no-rim-first
```

When the greedy pass ends out of band with the rim at least as dense as the figure court and the island under its top density band, `tools/loops/rim-first.mjs` takes over. It drops rim props (singletons first, then the most crowded clusters, pairs last) until the rim sits under the court. It then adds low props (0.6 tall or less, from the island's own types plus `rock` on rock palettes) to the figure court and then the approach, one per step while the cost falls. The court ring beside the figure counts, but never the three diagonals in front of it. Then the greedy pass reruns. The whole sequence keeps only if the cost falls and reach, route length, prop fit and the x-ray run hold.

Dry runs on the committed levels: chimera-medium cost 0.978 to 0.515, in band; forest-volute 0.631 to 0.500, in band; mindbloom-medium 1.210 to 0.915 (whole-island density 0.22 to 0.25, singletons 0.04 to 0.00); ember-subject 0.485 to 0.463 (rim 0.18 to 0.21, figure court 0.17 to 0.25, whole island still 0.22). cat-medium stays: every free court cell cuts reach, so the loop keeps the original. These four levels change on the next `--write` or `rebuild.mjs`; the rebuild check then reports `differs [decor]` for them.

### Terrain edits in the layout loop

```sh
node tools/loops/layout-loop.mjs <level> --terrain=4
node tools/loops/layout-loop.mjs <level> --terrain=4 --write
```

With `--terrain=N` the loop adds three moves: raise a cell by one (up to the island's top height), lower one by one (also under a single-cell prop that is not the figure), and cut a land cell beside the void to `none`. It never edits the figure court (Chebyshev 2 of the figure), a cell on the current or the starting route, a ramp end, a thing or spawn. Edited cells count against N across reruns; land area stays within 5% of the start. A terrain move must lower the cost by at least 0.02 and pass the same walk checks as every other move. In terrain mode the cost adds half the distance from the 3 to 5 district band plus each district's shortfall under 0.7 hull fill, and the loop keeps going after `done()` until those terms reach zero. Each edit lands in the level's `edits` array as `{ x, z, kind, from: { h, s }, to: { h, s } }` for the card, and the loop prints them.

`levels/wizard-medium-layout.json` with `--terrain=4`, written: lower 8,6 h3 to h2 under the right gate post, spawn 1,6 to 2,6, lower 7,8 h3 to h2, cut 11,9 to void, lower 3,9 h2 to h1, ramp at 4,9 down west. Cost 3.757 to 1.258 under the terrain score.

| Check | Before | After |
| --- | --- | --- |
| Figure seen from spawn, threshold, mid | y n n | y y y |
| Route share seeing the figure | 64% | 77% |
| Threshold isovist / reveal | 24% / 3% | 28% / 4% |
| Districts, fill | 3 of 6, 0.86/0.52/0.51 | 4 of 7, 0.81/0.63/0.65/0.59 |
| Spawn isovist | 42% | 40% |
| Choice points | 1 | 1 |

The threshold sightline passes: lowering 8,6 was the only single edit that opened it. Districts reach the 3 to 5 band, but three fills stay under 0.7, so the districts row still fails; reveal stays at 4%. QA `PP_PROFILE=.pp-profile-tooling3 node tools/qa-levels.mjs http://localhost:8765 wizard-medium-layout` 14 pass, 0 fail. Critic on `out/loops/layout/wizard-terrain.png`, 3 votes: 0 high, 0 other, $0.0186. Files in `out/loops/layout/`: `wizard-terrain.png`, `wizard-terrain.txt`, `wizard-medium-layout.before-terrain.json`, `qa-terrain.txt`, `critic-wizard-terrain.json`.

### Stage 3 walks and the readability overlay

```sh
node tools/loops/walk.mjs cat-medium,wizard-medium
PP_PROFILE=.pp-profile-<island> node tools/loops/walk.mjs <level> --live http://localhost:8765
PP_PROFILE=.pp-profile-<island> node tools/loops/overlay.mjs <level>
```

`walk.mjs` steps the hero on `canStep` with decor, bonfire and chest blocking. The gate stays shut until the hero stands on its threshold inside the watcher's radius. Four policies: `shortest` (BFS through the threshold to the figure ring, then to the elevator), `greedy` (the neighbour nearest the figure, then the elevator, plus one per earlier visit; 150 steps), `random` (seeded, 300 steps) and `novelty` (fewest visits, then most unvisited cells within two; 300 steps). A walk ends at the elevator after the figure, or at the figure when the island has no elevator. Per level it writes `<level>-heatmap.png` (four plan panels, log visits, critical path, x-ray cells, figure), `<level>-walks.json` (critical path, trails, visits, per-policy numbers) and `<level>-walks.txt`. Time to figure comes three ways: the step the figure first enters the middle third of a 900x800 camera that follows the hero with the renderer's clamp, the step the hero first stands within three cells, and the step it reaches the ring. X-ray cells are critical-path cells with a blocking piece 1.5 or taller at the (+1,+1), (+1,0) or (0,+1) cell no lower than the hero's, the inverse of the offsets `qa-levels.mjs` probes. Dead ends are leaf region nodes off the critical path. `--seed` and `--budget` override; `--out` moves the folder. `--live` replays the shortest and greedy walks in Chrome by key, as `qa-levels.mjs` does, and counts landing cells that match.

`overlay.mjs` shoots `out/loops/walks/<level>.png` at 900x800 with `hero=0` when it is missing (`--render` takes another file), then writes `<level>-overlay.png`: greedy plus novelty heat on the tiles, the critical path in blue, x-ray cells boxed red, green dots on cells seen from spawn, cluster hulls, dashed red rings on singletons, and magenta edit boxes from `edits`.

| Level | Critical path | X-ray (run) | Policy | Steps | Figure third / within 3 / ring | Elevator | Backtracks | Dead-end steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cat-medium | 12 | 3 (3) at 5,9 4,9 4,8 | shortest | 12 | 9 / 10 / 12 | none | 0 | 0 |
| | | | greedy | 12 | 9 / 10 / 12 | none | 0 | 0 |
| | | | random | 218 | 25 / 26 / 218 | none | 181 | 0 |
| | | | novelty | 170 | 11 / 12 / 170 | none | 109 | 35 |
| wizard-medium | 20 | 6 (3) at 7,7 7,6 7,5 10,4 7,2 7,1 | shortest | 20 | never / 12 / 14 | 20 | 3 | 0 |
| | | | greedy | 70 | never / 43 / 48 | 70 | 40 | 0 |
| | | | random | 300 | never | never | 272 | 0 |
| | | | novelty | 94 | never / 13 / 19 | 94 | 45 | 14 |

Live replay: cat-medium shortest 12/12, greedy 12/12; wizard-medium shortest 20/20, greedy 70/70. The wizard never enters the middle third because the whole island fits the 900x800 frame, so the camera clamps to the level centre and the figure stays in the right third. The random walker on wizard-medium never opens the gate in 300 steps. Files in `out/loops/walks/` (gitignored): `cat-medium.png`, `wizard-medium.png`, and the heatmap, overlay, json and txt for each.

### Figure scale

```sh
node tools/figure-scale.mjs
node tools/figure-scale.mjs cat-medium --json
```

`figure-scale.mjs` loads each island's pieces through `hooks.loadPieces`, builds the lead alone through `buildDecor` on a flat h1 slab and the hero through `buildCharacter`, and divides bounding-box heights in world units (one tile). The box includes any plinth or dais the figure builds in. It prints the ratio beside the reference sheet's measured ratio (`height_ratio`) and target (`target_ratio`) from `pipeline/refsheets/manifest.json`, and the factor to apply to reach the target. It measures the builder only, not a render.

| Island | Figure | Tiles | Catalog height | Ratio | Sheet | Target | Scale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cat-medium | fauvist-vocal-cat | 2.50 | 2.5 | 2.78 | 2.26 | 2.5 | x0.90 |
| dragon-medium | graphite_wyvern_totem | 2.58 | 2.6 | 2.87 | 3.00 | 3.0 | x1.04 |
| chimera-medium | chitin-chimera | 2.27 | 2.4 | 2.53 | 2.31 | 2.0 | x0.79 |
| wizard-medium | Glizard the Frankfurter Mage | 3.18 | 2.45 | 3.53 | 2.35 | 2.5 | x0.71 |
| swallow-medium | spiral-swallow | 2.73 | 2.6 | 3.03 | 1.49 | 1.5 | x0.50 |
| sharkbear-medium | selachian-ursine-stalker | 2.66 | 2.9 | 2.96 | 3.09 | 2.5 | x0.84 |
| gremlin-subject | synthetic-specimen-scout | 3.02 | 2.7 | 3.36 | 2.96 | 2.5 | x0.74 |
| mindbloom-medium | dreamer-effigy | 3.03 | 2.9 | 3.37 | 2.94 | 2.5 | x0.74 |
| eagle-composition | vigilant_raptor_totem | 4.29 | 2.6 | 4.77 | 1.79 | 1.5 | x0.31 |
| forest-volute | volute_gilt_bird | 3.90 | 3.0 | 4.33 | 2.52 | 2.5 | x0.58 |
| cosmos-frisket | stencil-eye | 3.10 | 3.3 | 3.45 | 3.10 | 3.0 | x0.87 |
| ember-subject | dragon_skull_totem | 2.87 | 2.7 | 3.19 | 2.72 | 2.5 | x0.78 |

Hero height 0.90 on every island. Eagle, forest and wizard build well past their catalog height (plinth, crag or hat), so their factors apply to the whole build, plinth included.

Pass 3 tooling critic spend: $0.0186 over 3 calls.

## Pass 3: figures, fixes, loops live

2026-10-06. Five figures rebuilt from their reference sheets (dragon, chimera, sharkbear, gremlin, cosmos); every figure held in the 2.5 to 3.5 hero-height band; the card weak spots fixed; the decor loop (rim-first fix) and the layout loop (`--terrain=4`, bounded edits logged in each level's `edits`) run live on all twelve; stage-3 walks and readability overlays per island in out/pass3/. Critic 0 high on every final render; walk QA 14 of 14 per island.

| Island | Figure (hero ratio) | Fixes | Terrain edits | Greedy steps |
| --- | --- | --- | --- | --- |
| cat-medium | cat 2.78 | windmill 2x2 within three cells of the cat | raise 8,4 | 14 |
| dragon-medium | full white wyvern rebuilt, 3.0 |  | lower 13,7 | 15 |
| chimera-medium | crested head and neck arc rebuilt, 2.72 | boulder in front of the face removed; edge gap filled | none | 11 |
| wizard-medium | 3.53 to 3.31 |  | lower 8,6; cut 8,10; lower 3,9; lower 9,7 | 20 |
| swallow-medium | 3.03 | tower footed on stone; lintel removed; spawn moved to 2,8 | lower 8,6; lower 7,9; lower 2,6; lower 7,8 | 20 (was 74) |
| sharkbear-medium | hunched bear with shark head and blade tail rebuilt, 3.0 | gate moved to 8,6 for a visible tap target; ramp added near spawn | lower 13,8; lower 13,7; cut 14,3; lower 13,6 | 9 |
| gremlin-subject | thin-limbed crouch, orb raised, rebuilt, 2.93 |  | lower 3,2 | 8 |
| mindbloom-medium | 3.37 | shrine 2x2 at 4,9 off the sightline | lower 9,7; lower 9,6 | 8 |
| eagle-composition | 4.77 to 3.49 |  | lower 13,7; cut 1,1 | 26 |
| forest-volute | 4.33 to 3.50 | canopy tree 2x2 at 6,8; bypass ramps flattened so the route passes the gilt arch; spawn 9,10 | lower 10,5 | 10 |
| cosmos-frisket | tilted ring and iris disc rebuilt, 3.16 | press moved to 8,4 so its bed shows; spawn 8,10 for a sightline | lower 6,6; lower 8,9; lower 6,8 | 50 |
| ember-subject | 3.19 | density 0.22 to 0.25 | none | 15 |

Sheets: `out/pass3/islands-sheet.jpg`, `out/pass3/figures-before-after.jpg`. Card: `puffer-isoworld-pass-3-islands`.

## Pass 4 engine

2026-10-07. Elevators ride the run order, arrival lands on a platform, and two commands cover one island and the whole run.

### Arrival contract

An elevator thing may carry `role: "entry"` or `role: "exit"`. When it has no `run` and no `to`, `loadLevel` reads `order` from `levels/run.json` into `level.runOrder`. An exit rides to the next island in that order and an entry rides back to the previous one. The first island's entry and the last island's exit toast a stub ("The way back is sealed", "The shaft goes no higher yet", or the thing's `stub`) and do not ride. `run` and `to` on the thing still win, so the old wizard elevator with `run: ["wizard-medium", "cat-medium"]` behaves as before.

A ride navigates to `?level=<next>&from=<this>&arrive=entry` going forward and `arrive=exit` going back. On load the game puts the hero on the cell of the elevator whose `role` matches `arrive`. Precedence: `spawn=`, then `arrive`, then the lit-bonfire respawn, then the file spawn. A level without the param, or without a matching platform, loads as before. The stored bonfire respawn does not change on arrival.

### One island

```sh
PP_PROFILE=.pp-profile-<island> node tools/loops/pass.mjs <level> [--terrain=4] [--no-walk] [--base http://localhost:8765]
```

`pass.mjs` runs `rebuild` (build-level only), `decor-loop.mjs --write`, `layout-loop.mjs --terrain=N --write` (N defaults to 4), `walk.mjs --live`, `overlay.mjs` on a fresh render and `qa-levels.mjs`, all on one profile, and logs each step to `out/loops/pass/<level>.log`. A level with no island module, such as the test bed, skips the rebuild and repeats the two loops until the file stops changing (eight rounds at most). It prints one line:

```
wizard-medium walkable 74/74 singletons 0.00 density 0.25 figure-from-spawn n greedy 44 edits 4 level unchanged PASS
```

`walkable` counts cells reachable from spawn with gates open; `singletons` and `density` come from `analyse`; `figure-from-spawn` from the layout metrics; `greedy` is the greedy walker's step count; `level` reads `unchanged` or the old and new file hashes. The command exits 1 when reach drops, a bonfire, chest or elevator becomes unreachable, a step fails or qa-levels fails. `--no-walk` skips the live walk. `walk.mjs` now ends its walks at the `role: "exit"` elevator when a level carries one.

On a worktree at HEAD, two runs on wizard-medium printed the line above both times with the level unchanged: the rebuild and both loops reproduce the committed file. On the test bed `wizard-medium-layout` the first run took two loop rounds and the second run left the file unchanged (73/73, singletons 0.03, density 0.27, figure seen, greedy 52, edits 4).

### The whole run

```sh
PP_PROFILE=.pp-profile-run node tools/qa-run.mjs [base-url] [--order a,b,...] [--no-ends]
```

`qa-run.mjs` clears every `isoworld:things:` key, then loads the first island with `reset=1`. It walks to the first entry and checks the stub. For each island it paths to the exit elevator with `findPath`. When the path fails it opens the closed gate: it walks onto the threshold and waits for the watcher, or walks beside the chest or bonfire and presses E. It then presses E on the exit and checks that the next island in the order loads with the hero on its entry platform. On the last island it checks the exit stub, walks back to the entry, rides it and checks that the previous island loads with the hero on its exit platform. An island with no exit elevator gets a `SKIP` line naming it, and the next island loads directly with `arrive=entry`. Lines read `PASS|FAIL|SKIP <hop> <detail>`, then `N pass, N fail, N skip`; it exits 1 on any fail. `--order` replaces the run order and `--no-ends` drops the two stub checks.

Results on 2026-10-07 against the island agents' working tree: 14 pass, 0 fail, 0 skip (first entry stub, eleven hops each through gate g1 in 13 to 24 steps, last exit stub, ember-subject back to chimera-medium's exit at 4,1). Test bed, `--order wizard-medium-layout,wizard-medium-layout --no-ends`: 2 pass. On HEAD: `qa-things.mjs` 34 pass, `qa.mjs` 134 pass.

`qa-things.mjs [base-url] [level]` (or `qa-things.mjs <level>`) now takes any island. It reports each elevator's role, rides the exit and checks the `run.json` successor loads with the hero on its entry platform (`arrive=entry`). On the first island it checks the entry's stub toast, and on the last the exit's. It compares reset states by kind, keeps the chest approach off the bonfire's ring, skips the crest check on islands without a live head part, and replans the route after every key step. Island agents' working tree, 2026-10-07: wizard-medium 36 pass, cat-medium 36 pass.

## Pass 4: the run

2026-10-07. Every island carries the things layer (bonfire, chest, gate opened by the watcher at the threshold, entry and exit elevators with roles); the order is levels/run.json and the engine reads it when an elevator has no run of its own; arrival lands the hero on the destination platform (`?arrive=entry|exit`). `tools/loops/pass.mjs <level>` is the standing pass and is idempotent on all twelve; `tools/qa-run.mjs` rides the whole run; `tools/qa-things.mjs <level>` checks each island's things. The creature on sharkbear-medium is a shark-gorilla (operator correction), rebuilt from a regenerated sheet at 3.0 hero heights. Critic 0 high on every final render. Ride clip: out/pass4/ride.mp4 (29 s, cat to wizard to swallow). Sheet: out/pass4/run-sheet.jpg in run order.

| # | Island | Spawn | Bonfire | Chest | Gate (threshold) | Entry | Exit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | cat-medium | 8,9 | 8,8 | 6,8 | 2,8 (3,8) | 10,9 | 1,5 |
| 2 | wizard-medium | 3,5 | 2,6 | 7,8 | 7,6 (7,7) | 3,4 | 12,1 |
| 3 | swallow-medium | 3,5 | 3,8 | 6,9 | 7,6 (7,7) | 3,4 | 12,1 |
| 4 | forest-volute | 12,9 | 11,8 | 13,8 | 9,5 (9,6) | 13,6 | 2,1 |
| 5 | mindbloom-medium | 12,9 | 12,7 | 11,9 | 7,6 (7,7) | 9,10 | 5,1 |
| 6 | cosmos-frisket | 4,10 | 5,10 | 9,6 | 6,5 (7,5) | 8,10 | 6,1 |
| 7 | gremlin-subject | 14,9 | 13,9 | 12,3 | 11,7 (12,7) | 13,6 | 6,2 |
| 8 | eagle-composition | 14,8 | 13,9 | 9,8 | 10,5 (10,6) | 14,7 | 8,2 |
| 9 | dragon-medium | 3,10 | 4,8 | 7,8 | 9,9 (8,9) | 2,9 | 12,1 |
| 10 | sharkbear-medium | 10,10 | 9,8 | 11,7 | 8,6 (9,6) | 11,10 | 4,1 |
| 11 | chimera-medium | 10,10 | 10,9 | 7,8 | 6,7 (6,8) | 12,10 | 4,1 |
| 12 | ember-subject | 12,8 | 11,7 | 11,9 | 8,4 (8,5) | 12,5 | 7,1 |

Greedy walk steps to the figure (shortest in brackets): cat 14, dragon 15, chimera 11, wizard 20, swallow 20 (12), sharkbear 9, gremlin 7 (7), mindbloom 10 (10), eagle 22 (12), forest 12 (12), cosmos 20 (16), ember 12 (12). Weak: eagle's ring walk rose from 9 to 22 after its rebuild; gremlin lost nine walkable cells to its gate and chest placement; cosmos's exit walk is long (46 against 26).

## Start page

`index.html` at the repo root opens the run in `levels/run.json`. It shows the title, one line on the run, the controls, a Begin button, a Continue button when one is due, a tile per island in run order, and a footer link to `compare.html` (the old side-by-side page, unchanged).

- **Begin** clears `isoworld:things:<island>` for every island in the run, then opens `3d/index.html?level=<first>&reset=1`.
- **Continue** appears when localStorage holds `isoworld:things:<island>` for any island in the run. It opens `3d/index.html?level=<island>` for the last island in run order with a lit bonfire and a saved `respawn`, else the last island with any saved state. `createInteract` then spawns the hero at the respawn cell through `spawnCell()`; the start page passes no `spawn`.
- **Tiles** link to `3d/index.html?level=<island>` with saved state kept. A tile with a lit bonfire carries an orange corner square.

Thumbnails are 300x267 JPEGs in `assets/start/`, cut from the 900x800 pass-6 cloud renders (`out/pass6/clouds-<island>.png`, hero shown) with sharp, since `out/` is git-ignored. Rebuild them after a re-render:

```sh
node -e 'const sharp=require("sharp");for(const n of require("./levels/run.json").order){sharp("out/pass6/clouds-"+n+".png").resize(300,267,{fit:"cover"}).jpeg({quality:82,mozjpeg:true}).toFile("assets/start/"+n+".jpg")}'
```

The page sets `window.__done` once the tiles decode:

```sh
PP_PROFILE=.pp-profile-start node tools/shot.mjs "http://localhost:8765/" out/pass5/start-1200.png 1200 800
PP_PROFILE=.pp-profile-start node tools/shot.mjs "http://localhost:8765/" out/pass5/start-400.png 400 800
```

At 400 px wide the tiles wrap to three columns; at 900 px, four; above that, six.


## Pass 5 engine

2026-10-07.

### The stuck after an elevator

A ride sets `actor.locked`, raises the platform and navigates. Browser Back (or a trackpad or phone swipe back) restores the island you left from the back-forward cache exactly as it was: hero locked on a raised exit platform, keys and taps ignored. `createInteract` now listens for `pageshow` with `persisted` and settles every elevator to `idle`, unlocks the hero and clears its path; `core/input.js` drops held keys on `pagehide`. A forward ride, `?arrive=entry` and direct loads never left the hero stuck in a real-time Chrome, by keys or taps, on any island.

Two smaller causes rode along. A key or d-pad press released before the next frame vanished, because the actor only read the held direction; the input now sends the fresh press and the actor steps once (`actor.tapDir`). A watcher gate needed the hero standing on the threshold at the moment the figure finished turning; walking east through wizard's 7,7 left the look at 0.88 as the hero stepped onto 8,7, and the gate stayed shut. The gate now opens once the hero has stood on the threshold while watched (`g.primed`, cleared when the hero leaves the watcher radius).

### Edge gates

A gate carries `edge: [[x1, z1], [x2, z2]]`, the threshold cell first and the far cell second, 4-adjacent. While shut it blocks crossing that edge only: `prepareLevel` builds `L.edges` (keys from `edgeKey`), `canStep` refuses a closed edge, and `findPath`, `reachable` and procgen's `reachability` inherit that through `canStep`. An edge gate does not add its `blocks` cells to `L.blocked`. Opening deletes the edge. `things.js` draws the gate centred on the edge, posts at its two ends, bars one tile wide, at the shared edge height; it ignores `frame`, `width` and `span` on an edge gate.

Migration on load: a gate with `blocks` and `threshold` and no `edge` takes its edge from the threshold cell to the blocked cell beside it. When that edge has a way around (the far cell reachable from the threshold with the edge shut), the gate is marked `hold` and keeps its far cell blocked while shut, and `L.notes` records it. On the committed levels only ember-subject holds (8,5 to 8,4: 9,4 and 10,4 lead round). A gate with an explicit `edge` that leaks gets a `prepareLevel` warning, which fails `build-level`.

`placeThings` (wizard.js) and `placeRunThings` (ember.js) call `sealGate`: it tries the edge from the route cell before the gate to the gate cell, plugs the far cell's two flanks with the plug prop where that costs no reach, and checks the far cell is unreachable with the edge shut. If that edge leaks it tries the next route edge when its approach cell sits 0.2 inside the watcher radius; failing both it writes the old cell gate. New gates keep `x`, `z` and `blocks` on the far cell, so `tools/loops` graph and metrics still treat it as the cut cell. On a scratch rebuild wizard-medium gets 7,7 | 7,6, cat-medium 4,8 | 3,8, gremlin-subject 12,7 | 11,7, and ember-subject 8,4 | 8,3 (the second edge).

### Touch

On a coarse pointer, after the first touch, or with `?touch=1`, a round use button sits right of the d-pad and fires the same action as E; it turns gold when something is in reach, and the prompt moves above it without the E key cap. `?touch=1` also forces the d-pad.

### Checks

```sh
PP_PROFILE=.pp-profile-ridekeys node tools/qa-ride-keys.mjs [base-url] [--order a,b,...]
```

`qa-ride-keys.mjs` plays the run in real time with keys and taps, no frame stepping. Per island: land on the entry platform, step off by key and back, tap a cell within four and walk there, walk by keys beside the bonfire and press E, walk to the gate threshold, wait for the watcher, step through the edge by key, walk to the exit, leave it by key and tap, return, press E, then Back and Forward and step off the restored page. A key step holds the key until the hero starts moving, so one press is one cell. Last, at 400x800 with touch it taps a path to the first island's bonfire and lights it with the use button. Lines read `PASS|FAIL <hop> <detail>`.

`qa-things.mjs` adds: gate is an edge gate, closed gate blocks crossing, closed edge leaves both cells walkable, closed gate cannot be bypassed, gate bars drawn on the edge; "gate mask" checks now test the crossing. `qa-run.mjs` walks to `edge[0]`. `qa-levels.mjs` clears `L.edges` with the gate cells when it plans its climb through a gate.

Results on the committed levels (migrated gates): `qa-ride-keys` 13 pass, 0 fail (twelve hops plus touch); `qa-run` 14 pass, 0 fail, 0 skip; `qa-things wizard-medium` 40 pass, 0 fail; `qa.mjs` crashes in its root suite after 37 pass, because `/` is now the start page with no panes; with the root suite pointed at `compare.html` it reads 134 pass, 0 fail.

## Pass 5: nits, polish, start page

2026-10-07. The operator's two play nits: gates drawn mid-tile, and the wizard island unplayable after the elevator. The stuck was the browser's back-forward cache restoring a left island with the hero locked on its exit platform; core/interact.js resets elevators and unlocks the hero on page restore, quick key taps count as a step, and a watcher gate opens when the hero crosses the threshold without stopping. Gates are edge gates (`edge: [threshold, far]`, blocking only that crossing while closed, drawn on the edge with posts at the tile corners; a gate with blocks and threshold but no edge migrates on load); the layout loop's gate move now carries the edge and reseals the flanks. A use button sits beside the d-pad on touch. The root page is the run's start page (Begin, Continue from the last lit bonfire, twelve tiles); the old side-by-side page is compare.html; tools/qa.mjs covers both. Polish: eagle ring walk 22 to 12, forest exit 27 to 12, cosmos exit 46 to 22 (shortest 18), gremlin walkable 61 to 64, the shark-gorilla's snout sharpened. Sheets: out/pass5/run-sheet.jpg, out/pass5/gates-sheet.jpg. Card: puffer-isoworld-pass-5-nits.

| # | Island | Gate edge (threshold to far) | Walkable |
| --- | --- | --- | --- |
| 1 | cat-medium | 3,8 to 2,8 | 112 |
| 2 | wizard-medium | 7,7 to 7,6 | 111 |
| 3 | swallow-medium | 7,7 to 7,6 | 111 |
| 4 | forest-volute | 9,6 to 9,5 | 111 |
| 5 | mindbloom-medium | 7,7 to 7,6 | 112 |
| 6 | cosmos-frisket | 7,5 to 6,5 | 114 |
| 7 | gremlin-subject | 12,7 to 11,7 | 108 |
| 8 | eagle-composition | 10,7 to 10,6 | 113 |
| 9 | dragon-medium | 8,9 to 9,9 | 114 |
| 10 | sharkbear-medium | 9,6 to 8,6 | 113 |
| 11 | chimera-medium | 6,8 to 6,7 | 109 |
| 12 | ember-subject | 8,4 to 8,3 | 98 |

## Clouds

2026-10-07, pass 6. Six cloud techniques went on the `puffer-isoworld-clouds` card behind `?clouds=<name>`; the operator picked billboards, which are now the default on every island (see Default below). `3d/main.js` awaits `loadClouds(params, style)` from `3d/clouds/index.js` before `start`, then mounts the mesh into the scene right after `start`, before the first frame, so `window.__done` waits for the atlas. The bake-off table and measurements below stay as the record; the five losing modules are gone from the tree.

| Name | Technique | Draw calls |
| --- | --- | --- |
| `billboards` | One InstancedMesh of camera-facing quads from `3d/assets/clouds/atlas.webp` (12 Gemini cumulus, stratocumulus and wisp tufts keyed off magenta, 4x3 tiles of 512). Rim sprites sit 0.75 cell outside each open edge at the cell's own bottom; more fill the underside and two rings out to the island radius plus 11. The engine sorts them once by view depth; drift runs along the screen plane on `uTime` with a per-sprite phase, so the order holds. Light tints the side facing the island light in screen space; a sprite fades where it meets a column and into the background with distance. | 1 |
| `volumetric` | A box shader marches a baked 64^3 Perlin-Worley texture (`noise64.bin`, rebuild with `node 3d/assets/clouds/noise.mjs`). The slab's top follows a per-cell cloud line half a tile up each rim wall (water cells sit above it); density thins inside the footprint, advects on `uTime`, and takes two taps toward the light plus the background as ambient. Rays stop where they enter a column, read from a half-float height texture, so the slab needs no depth pass. It renders into a half-resolution half-float target from the composite mesh's `onBeforeRender`. `?csteps=` (default 28) and `?cres=` (default 0.5, 1 draws straight into the scene) set quality. | 2 |
| `hybrid` | The volumetric slab plus a second InstancedMesh of wisp and stratus sprites on the rim. | 3 |
| `puffs` | Flat-shaded icosahedron clusters baked by `Baker` in pack tones (top, left, right faces), tagged `mist` so the stage-1 shader drifts them. The control for "not photo-real". | 1 |
| `painterly` | Instanced smooth ellipsoids with a four-tone ramp whose band edges wobble with value noise, a warm rim on the shade side, and the same layout as `cel` and `puffs`. | 1 |
| `cel` | The same balls with a hard two-tone step and an inverted-hull outline in a darker shade of the cloud colour. | 2 |

Every technique reads `motion.uTime`, so `hero=0` and `t=` freeze it and `__setTime` drives clips. No technique runs JavaScript per frame except the half-resolution pass, which allocates nothing. Cloud colours come from the level: the light direction from `light.dir` (else the pack's), the shade and fade colour from `bg`, and a warm palette when `bg` leans red.

Atlas: `node 3d/assets/clouds/gen.mjs` (three Gemini images into `out/clouds/raw/`), then `node 3d/assets/clouds/pack.mjs`. The packer solves each pixel as a neutral grey over the sampled key colour, so alpha and colour both come out unmixed, and finds tufts by connected components.

Measure:

```sh
PP_PROFILE=.pp-profile-clouds node tools/perf.mjs --out=out/clouds/perf.json
```

`tools/perf.mjs` loads each level with each option headless at 900x800 (`--size=`), pauses the game, and times 300 renders at 1x and 2x device pixel ratio, each ended by a one-pixel `readPixels` so swiftshader finishes the frame. It reports the median, draw calls and triangles from `renderer.info` (reset by hand, because the half-resolution pass nests a render), and texture memory summed over scene materials and cloud render targets. Flags: `--levels=`, `--options=`, `--frames=`, `--dpr=`, `--query=`.

Swiftshader runs these on the CPU, so the milliseconds are far above a GPU's. Read the relative column: frame time over `none` on the same level.

| Level | Option | ms 1x | rel 1x | ms 2x | rel 2x | Cloud calls | Cloud tris | Cloud tex MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | none | 8.9 | 1.00x | 22.7 | 1.00x | 0 | 0 | 0.0 |
| home | billboards | 29.6 | 3.33x | 100.1 | 4.41x | 1 | 488 | 16.0 |
| home | volumetric | 32.8 | 3.69x | 117.4 | 5.17x | 2 | 24 | 11.0 |
| home | puffs | 16.3 | 1.83x | 31.3 | 1.38x | 1 | 30879 | 0.0 |
| home | hybrid | 44.4 | 4.99x | 160.1 | 7.05x | 3 | 288 | 27.0 |
| home | painterly | 29.4 | 3.34x | 49.8 | 2.32x | 1 | 76140 | 0.0 |
| home | cel | 39.2 | 4.45x | 71.4 | 3.32x | 2 | 109980 | 0.0 |
| ember-subject | none | 8.7 | 1.00x | 21.6 | 1.00x | 0 | 0 | 0.0 |
| ember-subject | billboards | 26.1 | 3.00x | 85.6 | 3.96x | 1 | 424 | 16.0 |
| ember-subject | volumetric | 37.7 | 4.33x | 146.9 | 6.80x | 2 | 24 | 11.0 |
| ember-subject | puffs | 20.8 | 2.39x | 39.5 | 1.83x | 1 | 26207 | 0.0 |
| ember-subject | hybrid | 44.7 | 5.14x | 153.8 | 7.12x | 3 | 180 | 27.0 |
| ember-subject | painterly | 37.2 | 3.26x | 64.1 | 2.37x | 1 | 64620 | 0.0 |
| ember-subject | cel | 39.2 | 3.44x | 53.8 | 1.99x | 2 | 93340 | 0.0 |

Texture memory is the 2x run: the atlas is 16 MB with mipmaps, the noise 0.5 MB, and the half-resolution target 5.5 MB at 2x on a 900x800 page. The painterly and cel rows come from a second run after their ball detail dropped from 3 to 2, measured against that run's own `none` (home 8.8 and 21.5 ms, ember 11.4 and 27.1 ms). The swiftshader cost of `painterly` and `cel` is vertex work on 65k to 110k instanced triangles, which a GPU absorbs; billboards and the slab spend fill rate, which grows with pixel ratio. The slab drew 9.8x at full resolution against 3.7x at half.

Capture, with the server running:

```sh
sh out/clouds/shoot.sh billboards volumetric hybrid puffs painterly cel
sh out/clouds/clips.sh billboards volumetric hybrid puffs painterly cel
node out/clouds/sheet.mjs
```

`shoot.sh` writes `out/clouds/<option>-<level>.png` at 900x800 with `hero=0` for home and ember-subject, plus `<option>-home-phone.png` at 400x800. `clips.sh` runs `tools/clip.mjs` once (about 75 s under swiftshader) for a 6 s drift clip per option and level (`<option>-<level>.mp4`). `sheet.mjs` lays the stills out as `out/clouds/options-sheet.jpg`, one row per option, with the relative frame cost in each label.

### Default

2026-10-07. Verdict: billboards (card `puffer-isoworld-clouds`, last line of `docs/DECISIONS.md`). Every island floats on the billboard bed with no query parameter; `?clouds=none` (or `clouds=0`) turns it off, which the reference shot under "Render and compare" and the home silhouette compare use (351x390, `MAD 23.7  NCC 0.795  silhouette 92.6%`, unchanged). `hero=0` and `t=` still freeze the drift.

Deleted: `3d/clouds/volumetric.js`, `hybrid.js`, `puffs.js`, `painterly.js`, `cel.js` and the files only they used, `balls.js`, `noise.js`, `noise-bake.js`, `3d/assets/clouds/noise.mjs` and `noise64.bin`. The `wisps`, rim/under/bed and render-order switches that only hybrid used left `billboards.js`; the cloud line, `islandCell`, `hash12` and `uLight` that only the slab used left `common.js`. `tools/perf.mjs` measures `none` and `billboards` and passes `clouds=` explicitly; `out/clouds/shoot.sh`, `clips.sh` and `sheet.mjs` belong to the bake-off.

Per-island tint, in `island()` of `3d/clouds/common.js`: the hue is `bg`'s chroma when `bg` carries colour (`tinted` smoothsteps sRGB saturation from 0.03 to 0.1), else a sky blue `#c7dbff` that cools toward `#9eb3ff` as `bg` darkens (`night` runs from 0 at sRGB luminance 0.28 to 1 at 0.10). The sunlit gain is `min(1, light.ambient + light.sun)` times `1 - 0.55 * night * (1 - tinted)`, so a dark neutral background dims the lit tops while a dark coloured one keeps them; the lit side still follows `light.dir`, the shade colour still mixes `bg` with the hue, and sprites still fade into `bg` with distance. Gains: cat, wizard, mindbloom, cosmos, eagle 1.00; home 0.91; ember 0.90 (warm chroma); gremlin 0.90 (teal); forest 0.90 (purple); sharkbear 0.62; swallow 0.61; dragon 0.58; chimera 0.48. Before this rule dragon, chimera, swallow and sharkbear carried white daylight cloud under a near-black sky.

Visibility: `qa-visibility.mjs all --json` with clouds on against the same run with `--query clouds=none` gives the same twelve tallies (cat 15/17, wizard 26/26, swallow 23/25, forest 18/18, mindbloom 20/20, cosmos 22/23, gremlin 22/23, eagle 15/19, dragon 21/22, sharkbear 17/19, chimera 19/20, ember 17/18), no cell or landing flips, and one fraction moves: cosmos-frisket 4,10 hero 100% to 99%. The rim sprites sit at the island's bottom and the bed below it, so no route cell loses floor to a cloud and the bed was left as picked. `out/pass6/visibility-clouds.{txt,json}` and `visibility-none.{txt,json}` hold both runs.

Perf, `PP_PROFILE=.pp-profile-cloudsdef-perf node tools/perf.mjs --out=out/pass6/clouds-perf.json` (swiftshader, 900x800, 300 frames):

| Level | Option | ms 1x | rel 1x | ms 2x | rel 2x | Cloud calls | Cloud tris | Cloud tex MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | none | 8.6 | 1.00x | 21.4 | 1.00x | 0 | 0 | 0.0 |
| home | billboards | 28.6 | 3.33x | 96.2 | 4.50x | 1 | 488 | 16.0 |
| ember-subject | none | 8.5 | 1.00x | 21.5 | 1.00x | 0 | 0 | 0.0 |
| ember-subject | billboards | 26.2 | 3.08x | 86.0 | 4.00x | 1 | 424 | 16.0 |

One draw call (244 sprites on home, 212 on ember), no JavaScript per frame, no allocation. The relative cost is fill rate on the CPU rasteriser; the 60 fps and 30 fps floors need a device check, which swiftshader cannot give.

QA: `PP_PROFILE=.pp-profile-cloudsdef node tools/qa.mjs http://localhost:8765` 132 pass, 0 fail (clouds on in every 3d page it opens; the home silhouette compare runs with `clouds=none`); `PP_PROFILE=.pp-profile-cloudsdef node tools/qa-ride-keys.mjs http://localhost:8765` 13 pass, 0 fail, so the elevator hops ride through the cloud bed unchanged.

Stills: `out/pass6/clouds-<island>.png` (900x800, hero shown) for the twelve run islands, `clouds-cat-medium-phone.png` and `clouds-ember-subject-phone.png` at 400x800, and `node out/pass6/clouds-sheet.mjs` lays them out as `out/pass6/clouds-sheet.jpg`. The start page tiles in `assets/start/` are cut from these renders (see Start page).

## Route visibility

2026-10-08. `tools/qa-visibility.mjs` checks that a hero on the critical route can see where to go.

```sh
PP_PROFILE=.pp-profile-vis node tools/qa-visibility.mjs <level>[,<level>...] [--json out/pass6/visibility.json]
PP_PROFILE=.pp-profile-vis node tools/qa-visibility.mjs all
```

`all` reads `levels/run.json`. One Chrome page per island loads `?reset=1&nav=0`, stops the frame loop, opens every gate in `L.blocked` and `L.edges`, and moves the hero cell by cell. The critical route is spawn, the shortest path from spawn to the exit platform with gates open, the entry and exit platforms, the first step off each, the gate threshold and far cell, and the figure court cell (the nearest cell one ring from the figure). The twelve islands take about 70 s.

Each cell gets two tests:

- Hero. The tool swaps the hero's materials for flat magenta and renders three times: hero alone, the full scene with `xray=0`, and the full scene with the x-ray window. It counts magenta pixels inside the hero's projected box in the second and third renders that were also magenta in the first. A cell passes at 30% (`--min-hero`) directly or through the window.
- Floor. A flat cyan quad follows the cell's surface 0.15 above it (0.25 on an elevator deck). With the hero on the previous route cell and the hero's meshes hidden but its x-ray window kept, the tool counts the cyan pixels that survive against the quad rendered alone. A floor reads at 30% (`--min-floor`). A ramp whose surface normal points away from the camera counts 0%: at `tileH` 1.5 a ramp is 56 degrees steep, so with the default yaw a ramp descending west or north shows only its cliff. Gate bars draw shut for views from before the threshold and open after it; the gate's far cell skips its floor test, since the gate marks that crossing.

Two landing tests follow. From the entry platform (gates shut) and from the exit platform (gates open), the tool walks the shortest path toward the goal up to its first ramp or sixth cell, whichever comes first. The landing passes when a path of at most that length plus two reaches as far toward the goal through cells whose floor reads from the platform or, with the x-ray window kept, from the cell before on that path (the same credit the route-cell floor test gives), with at most one hidden cell (`--max-gap`) and never a hidden ramp.

Output is `PASS` or `FAIL` per cell with its roles, hero direct/x-ray share, each floor view, and on a fail the occluder: the tallest decor footprint or terrain cell above the line from the cell toward the camera, or "ramp faces away from the camera". Things and the figure's own blocking do not count as named occluders. The exit code is 1 when any cell or landing fails.

### wizard-medium

The committed level before this pass: entry landing FAIL, `3,5:100% 4,5:61% 4,6:58% 4,7:0%(market-row@4,9) 5,7:0%(ramp faces away from the camera)`, and route cell 5,7 FAIL for the same reason. The climb out of the landing pocket was the west-descending ramp at 5,7, which the camera sees from behind.

`faceRamps(level, h, { budget })` in `3d/pieces/wizard.js` runs in `finishLens` for wizard-medium after the landmark, the market row and spawn. It finds the first approach ramp facing away from the camera, flattens it to its low side, and tries every flat cell at the upper height as a ramp descending toward the camera (east or south) whose high side matches it and whose low side sits one level down. Small single-cell decor on the three cells is cleared. A candidate must keep reach, rejoin the old route above the ramp and keep its later cells (so the gate stays put), and carry no away-facing ramp; any cell it strands gets lowered one level. The shortest route wins. With budget left it lowers flat cells in front of the route up to the new ramp (camera side, off the route, no large decor). Its edits go into `level.edits`, so the layout loop's terrain budget counts them. The market row is dropped when its footprint fronts the new route.

Build log: `faceRamps lower 5,7, ramp 7,8, lower 5,6, lower 5,8`. The route now runs 4,7, 4,8, along row 9 to 7,9, and up the south-facing ramp at 7,8 to the threshold 7,7. The gate stays at edge 7,7 | 7,6. The chest moved to 3,9, the market row is gone, and the layout loop added a south-facing ramp at 5,5 that ends at the pocket (the gate still holds: the exit is unreachable from spawn with it shut).

`node tools/loops/pass.mjs wizard-medium`: `walkable 77/77 singletons 0.12 density 0.24 figure-from-spawn y greedy 44 edits 4`, a second run `level unchanged PASS`. Greedy steps to the figure rose from 22 to 44 with the longer climb. Checks: `qa-visibility` 26/26 (entry landing `3,5:100% 4,5:74% 4,6:78% 4,7:85% 5,7:0% 5,8:67%`); `qa-levels` 14 pass, 0 fail; `qa-things wizard-medium` 40 pass, 0 fail; `qa-ride-keys --order cat-medium,wizard-medium,swallow-medium` 4 pass, 0 fail. Renders at 900x800: `out/pass6/wizard-arrival.png` (`?level=wizard-medium&arrive=entry`) and `out/pass6/wizard-arrival-before.png` (the committed level). No critic calls.

### Pass 6 close

2026-10-08. All twelve islands pass: 259 of 259 cells and landings (`PP_PROFILE=.pp-profile-close node tools/qa-visibility.mjs all --json out/pass6/visibility-close.json`, clouds on, output in `out/pass6/visibility-close.{txt,json}`). Per-island logs: `docs/pass6/vis-fix-a.md` (cat, swallow, cosmos, gremlin, eagle) and `docs/pass6/vis-fix-b.md` (dragon, sharkbear, chimera, ember, wizard repair).

Two changes in the close made the last three cells pass. Gate frames, gate bars and gate posts (any decor with `gapX`) already carried the x-ray cutout, but the window missed the next cell past a gate: on cat-medium the ramp 2,7 sits 80 px from the window centre (radius 62 px at 900x800), and gremlin's pylons stand at the hero's own depth, inside the window's 0.35-unit depth margin. Those meshes now bake into a separate `posts` mesh (`3d/decor.js`, `3d/things.js`) whose cutout (`applyXray(material, true)`, `REACH` in `3d/xray.js`) reaches 1.6 times the radius, cuts at the hero's depth and starts one unit below the feet. `hero=0` and `?xray=0` set the radius to 0, so stills and the home silhouette are unchanged. Second, the landing walk now also tests each cell from the cell before it with the window there; the route-cell test always did. On sharkbear the lane bump came out: `flattenBump(level, h)` in `3d/pieces/wizard.js` lowers an up-ramp, top and away-facing down-ramp on the exit route when reach and the route hold.

| # | Island | Before pass 6 | Close | Fix | Greedy | Terrain edits |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | cat-medium | 15/17 | 17/17 | plinth off the entry walk; exit ramp 2,7 behind the gate frame reads 50% from 2,6 through the reach window | 12 to 12 | 0 |
| 2 | wizard-medium | 26/26 (after `faceRamps`) | 26/26 | `faceRamps` south-facing climb; market row back | 22 to 38 | 4 |
| 3 | swallow-medium | 23/25 | 29/29 | `faceClimb` and `plugShadow` rock at 11,2 | 36 to 42 | 4 |
| 4 | forest-volute | 18/18 | 18/18 | none | | |
| 5 | mindbloom-medium | 20/20 | 20/20 | none | | |
| 6 | cosmos-frisket | 22/23 | 23/23 | `moveFront` plume 4,5 to 4,3 | 22 to 22 | 0 to 1 |
| 7 | gremlin-subject | 22/23 | 23/23 | none to the level; 11,7 behind the pylon at 12,8 reads 49% from 12,7, 10,6 and 10,5 read 100% from the cell before | unchanged | unchanged |
| 8 | eagle-composition | 15/19 | 22/22 | `clearFloor` lichen mats; exit lift to 9,1 | 17 to 14 | 4 |
| 9 | dragon-medium | 21/22 | 23/23 | `backEntry` | 19 to 19 | 1 |
| 10 | sharkbear-medium | 17/19 | 19/19 | `floorClear` slab at 7,5; `flattenBump` 10,9 10,8 10,7 to h1 | 14 to 14 | 4 (3 bump, loop's cut 14,4) |
| 11 | chimera-medium | 19/20 | 20/20 | `orphanPosts` | 22 to 14 | 0 |
| 12 | ember-subject | 17/18 | 19/19 | `backEntry`, `floorClear` | 13 to 16 | 0 |

Cells left: none. Sharkbear's 10,7 was a north-descending ramp from the h2 bump onto the h1 gate line, and no idea short of flattening could turn it: 9,8 holds the bonfire, 9,9 is void and x=11 is an h2 to h3 wall, so every descent toward the gate runs north or west, and lowering the wall leaves the away-facing ramp in place. Batch B rejected flattening because the entry landing lost the lane (`10,8:1% 10,7:0% 10,6:0% 9,6:0%` from the platform); with the per-step credit those cells read 65%, 66%, 82% and 83%. The layout loop then spent the one edit left on the rim cut 14,4 and no longer lowers 13,6 to 13,8. Sharkbear's pass line: `walkable 80/80 singletons 0.07 density 0.26 figure-from-spawn y greedy 14 edits 4`, second run `level unchanged`.

QA on the close (port 8765, outputs in `out/pass6/close/`):

- `qa-ride-keys` all hops: 13 pass, 0 fail (twelve hops plus touch on cat-medium).
- `qa-ride-keys --order mindbloom-medium,cosmos-frisket`, fresh profile: failed `touch mindbloom-medium 400x800 no path to bonfire 12,7` every time, not only under load. The bonfire's one side reachable with the gate shut, 12,8, sits diagonal to the chest at 11,9, and the touch test skipped sides next to a chest. The test now falls back to any side; rerun 3 pass, 0 fail (`prompt "Light the bonfire" above the button`).
- `qa-run`: 14 pass, 0 fail, 0 skip.
- `qa-levels.mjs http://localhost:8765`: 166 pass, 0 fail, 1 skip (sharkbear's standing see-through-window skip).
- `qa-things`: cat 40, wizard 40, swallow 39, forest 39, mindbloom 39, cosmos 39, gremlin 39, eagle 39, dragon 39, sharkbear 40, chimera 39, ember 36; 0 fail on every island.
- `qa.mjs http://localhost:8765`: 132 pass, 0 fail.

Arrival stills from each entry platform (`?level=<level>&arrive=entry`, hero shown, clouds on, 900x800): `out/pass6/<level>-arrival.png`; `node out/pass6/arrival-sheet.mjs` lays them out four across with each island's tally as `out/pass6/arrival-sheet.jpg`.

## Pass 7: the elevator ride

An exit elevator lifts you off the top of the frame. The camera closes in on the hero, who dances a clip from `DANCES` (wiggle, spin, pump). Ink speed lines and cloud streaks then run past for the climb, and the hero braces as the next island loads in the same page. The deck drops onto that island's entry platform with a flash and an overshoot dip, and a toast names the island. Riding back down plays the same sequence reversed (`uRideDir` -1).

Timings (`SEQ` in `core/sequence.js`): close 1.2 s, dance from 0.3 s for up to 2.3 s, drop 1.2 s, brace at 2.6 s, hold 1.8 to 8 s (it waits for the next island's bake), arrive 1.0 s, settle 0.6 s, rise 2.4 s (`RISE` in `3d/things.js`). A cat-to-wizard ride runs 6.3 s on swiftshader.

Speed lines: one density, 44 overlay lines and 140 streaks (`LINES` in `3d/speedlines.js`). The overlay and the streaks clear a circle around the hero's screen position at 1.2 x zoom x pixel ratio, the same radius as the see-through window, and fade from 0.9 to 1.15 radii.

Query flags:

- `?seq=0` swaps islands with the 0.6 s fade and skips the ride, for reference shots.
- `?seq=hold` freezes a ride at the hold; `&ride=entry` freezes a back ride.
- `?clip=<name>` loops one hero clip.

Perf (swiftshader, 900x800, 300 frames, billboards on): the hold costs 12.5 ms at 1x and 38.3 ms at 2x on cat-medium, against 28.6 and 93.0 ms in normal play. On ember-subject the hold costs 10.0 and 28.1 ms, against 26.9 and 88.2 ms.

QA at the close (port 8765, `PP_PROFILE=.pp-profile-p7-7`): `qa-ride-keys` 13 pass; `qa-run` 14 pass; `qa-swap` 24 pass, memory geo 33/33 and tex 2/2 on both laps, worst bake 29 ms on dragon-medium; `qa.mjs` 132 pass; `qa-hero` 29 pass; `qa-levels` 238 pass, 1 skip (sharkbear see-through); `qa-visibility all` 259/259 cells on twelve islands.

Files: `core/sequence.js` (beats, timings, ride uniforms), `core/run.js` (in-page swap), `3d/speedlines.js` (overlay and streaks), `3d/clips.js` (hero clip library), `3d/character.js` (hero), `3d/things.js` (shafts and decks), `3d/clouds/billboards.js` (ride cloud column), `3d/renderer.js` (fx hook, flash, hero clear circle). Tools: `ride-clip.mjs`, `seq-clip.mjs`, `hold-shot.mjs`, `qa-ride-keys.mjs`, `qa-swap.mjs`. Media in `out/pass7/`: `ride-final.mp4`, `ride-final-phone.mp4`, `hold-clear-sheet.jpg`.

Still open: the 30 s on-device phone recording over a LAN URL.

## Pass 8: edge lifts and the tile beam

Every island's two elevators stand on lift tiles off the island's edge: the departure lift on a back edge (north or west), the arrival lift on a front edge (south or east). Each lift tile is the cantilever dock (`tileB` in `3d/lift.js`), and each elevator gets one tile-wide beam. The departure beam rises 32 units and fades out well inside the frame. The arrival beam draws before the cloud bed, so the clouds cover it, and fades in over the 6 units below its tile, so it comes up out of the cloud sea. While a beam carries the hero, it clears the speed lines' circle around the hero.

`h.edgeLifts({ exit, entry })` in `pipeline/a-transcribe/finish-helpers.mjs` places the lift cells; each island module calls it at the end of its finish, so a rebuild reproduces the moves. The lift cell contract is in `docs/pass8/options.md`. The loop tools and the decor pass treat lift cells as off the island.

QA at the close (port 8765, `PP_PROFILE=.pp-profile-p8b`): `qa-levels` 237 pass, 1 fail fixed in the tool and rerun, 1 skip (sharkbear see-through); `qa-visibility all` 252/253 cells, ember-subject 9,4 open; `qa-ride-keys` 13; `qa-run` 14; `qa-swap` 24, memory flat; `qa.mjs` 132; `qa-hero` 29. Per-island moves, `qa-things` counts, perf and the open items are in `docs/pass8/final.md`. Media: `out/pass8/final-sheet.jpg`, `out/pass8/arrive-*.png`, `out/pass8/ride.mp4`.
