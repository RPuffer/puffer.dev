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

2026-09-23 result: MAD 30.8, NCC 0.691, silhouette 89.0%. Smoke: spawn (6,7), W to (6,6), D to (7,6), S to (7,8); taps on (9,4) and (3,3) path there, a tap on the rock at (9,2) stops at (9,3).

Sprite pipeline: `node 2d/gen/generate.mjs <ids>` (Gemini, logs to 2d/gen/ledger.jsonl and costs $0.045 each), `node 2d/gen/process.mjs` (key, scale, manifest), then `node 2d/gen/ramp.mjs` and `node 2d/gen/marker.mjs`, which rebuild the composite sprites that process.mjs overwrites.

## Procedural islands

`?level=gen&seed=N` generates an island from seed N in both builds; `?seed=N` with no `level` does the same. `?level=home` (or no seed) loads `levels/home.json`. The same seed always gives the same island. `core/procgen.js` exports `generateLevel(seed)`, `checkLevel(level)`, and `levelStats(level)`; `loadLevel("gen", { seed })` returns a prepared level.

```sh
node tools/procgen-check.mjs 200
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=gen&seed=7&hero=0" out/gen-7.png 351 390
```

`procgen-check.mjs [count] [first-seed]` generates each seed twice and checks schema, determinism, reachability from spawn, spawn free of decor, one decor per cell, ramps one tier down, bridges spanning 1 to 3 cells with level land at both ends, waterfalls on h0 water below a cliff, grass share between 0.25 and 0.45, and one plateau. It also feeds the checker five broken levels and fails if the checker misses one. It prints size and decor-count distributions and exits 1 on any problem.

`core/ui.js` exports `mountUI({ container, navigate })`: a seed field, a "new island" button (random seed), and a "home" link. Without a container it mounts a fixed overlay in the bottom-right corner and skips itself inside an iframe or when the query has `hero=0` or `ui=0`, so reference shots stay clean.

## 3d catalog page

`http://localhost:8765/3d/catalog.html` lays out every catalog type and variant on one island, with `?zoom=` and `?center=x,y,z` for close-ups:

```sh
node tools/shot.mjs "http://localhost:8765/3d/catalog.html" out/catalog-3d.png 1400 1000
```

Each type's geometry lives in its own function in `3d/pieces.js`; add a new catalog type there and it shows up on this page. The home island builds in about 25 ms into 5 draw calls and 14k triangles, plus 6 for the hero.
