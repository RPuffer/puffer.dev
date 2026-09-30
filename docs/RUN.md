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
