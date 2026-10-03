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

- `http://localhost:8765/?level=home&seed=1` for both builds side by side
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
| `view` | Root page only: `both`, `3d`, or `2d` |

## Controls

W/A/S/D or the arrow keys walk one cell per step: W up-right, D down-right, S down-left, A up-left. Click or tap a cell to path there. Touch devices get a d-pad.

## Render and compare

```sh
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=home" out/home-3d.png 351 390
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

## Procedural islands

`?level=gen&seed=N` generates an island from seed N in both builds; `?seed=N` with no `level` does the same. `?level=home` (or no seed) loads `levels/home.json`. The same seed always gives the same island. `core/procgen.js` exports `generateLevel(seed)`, `checkLevel(level)`, and `levelStats(level)`; `loadLevel("gen", { seed })` returns a prepared level.

```sh
node tools/procgen-check.mjs 200
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=gen&seed=7&hero=0" out/gen-7.png 351 390
```

`procgen-check.mjs [count] [first-seed]` generates each seed twice and checks schema, determinism, reachability from spawn, spawn free of decor, one decor per cell, ramps one tier down, bridges spanning 1 to 3 cells with level land at both ends, waterfalls on h0 water below a cliff, grass share between 0.25 and 0.45, and one plateau. It also feeds the checker five broken levels and fails if the checker misses one. It prints size and decor-count distributions and exits 1 on any problem.

`core/ui.js` exports `mountUI({ container, navigate })`: a seed field, a "new island" button (random seed), and a "home" link. Both build pages mount it. Without a container it mounts a fixed overlay in the bottom-right corner (top-right below 560 px wide, clear of the d-pad) and skips itself inside an iframe or when the query has `hero=0` or `ui=0`, so reference shots stay clean.

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

`decor-metrics.mjs` counts as props every decor entry except the figure, flat passable floor stamps (`road-run`, `bridge-span`, `stepping-stones`, `marker`) and floating pickups. Props link into a cluster when any of their cells touch (Chebyshev 1). Zones split the land outside the figure: figure court within 2 cells of the figure, threshold within 1 of the gate on the route, approach within 1 of the BFS route from spawn to the figure, rim the rest. Bands: figure 0 to 0.15, threshold 0.2 to 0.5, approach 0.15 to 0.35, rim 0.25 to 0.4, whole island 0.25 to 0.35. `--render png --overlay out.png` adds the figure-versus-rim edge ratio and draws clusters, singletons and the route.

| Level | Props/walkable | Figure | Threshold | Approach | Rim | All | Singleton share | Clusters | Mean spacing | Fit mismatches | Beats | Trail gap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `home` | 33/66 | n/a | n/a | 0.38 | 0.62 | 0.50 | 0.03 | 8 | 3.8 | 0 | n/a | 1 |
| `ember-subject` before | 12/92 | 0.17 | 0.13 | 0.14 | 0.10 | 0.13 | 0.50 | 9 | 2.6 | 0 | 1/5 | 1 |
| `ember-subject` after | 23/92 | 0.13 | 0.20 | 0.21 | 0.36 | 0.25 | 0.00 | 7 | 3.5 | 0 | 3/5 | 1 |
| `cat-medium` | 10/108 | 0.08 | 0.18 | 0.07 | 0.09 | 0.09 | 0.70 | 8 | 3.2 | 0 | 1/5 | 1 |
| `wizard-medium` | 12/108 | 0.13 | 0.19 | 0.12 | 0.06 | 0.11 | 0.58 | 9 | 2.3 | 0 | 3/5 | 3 |

ember-subject singleton share reads 0.50 under these rules; LOOPS.md's 0.57 counted the road and bridge stamps. The loop made 9 moves: two gathers, one fill beside the ember vent, four new pairs, two grows. Every zone and the whole island now sit in band, reach goes 84/84 to 81/81 with nothing missing (new props block three cells), the route stays 12 steps, and the longest x-ray run stays 3. Beats rose from 1/5 to 3/5; the two left need the `feathered_flame_flick` colonnade, which the build never places (the arch stands in for it). The figure-versus-rim edge ratio fell from 0.96 to 0.77, so the rim now out-shouts the figure. Dry runs on cat-medium (0.70 to 0.04, density 0.25) and wizard-medium (0.58 to 0.14, density 0.20) wrote nothing.

Files in `out/loops/`: `ember-decor-before.png` renders the committed level before the loop (`out/final/ember-subject.png` predates stage 3 and no longer matches it), `ember-decor-after.png`, `ember-decor-overlay.png`, `ember-decor-overlay-before.png`. Critic on the after render (3 votes, `out/loops/critic-ember-after.json`): 0 high, 1 medium, the stepped path at the ramp meeting a cliff face, terrain the loop does not touch. Spend $0.0254 across 3 calls. QA: `PP_PROFILE=.pp-profile-loops1 node tools/qa-levels.mjs http://localhost:8765 ember-subject` 14 pass, 0 fail.
