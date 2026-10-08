# Pass 7 phase 2: one page per run

2026-10-07. The run rides in one page. At `ride >= 1` the next island swaps in at once: the deck is back at rest and the hero stands unlocked on the arrival platform. No new visuals.

## As built

- `core/run.js` exports `createRun(game, { prepare, unmount, mount })` with `preload`, `swap`, `navigate` and `boot`, plus `nextSearch`. The `ride` event from `createInteract` starts `preload(next)`; `navigate` awaits it and calls `swap`. `swap` records the leaving cell with `replaceState({ at })`, loads the island, then `pushState(null, "", "?level=next&from=this&arrive=entry|exit")` with `spawn` and `reset` dropped. `popstate` swaps to the URL's island and puts the hero on the stored `at` cell, so Back lands on the exit platform as bfcache did; a failed popstate swap reloads. `pageshow` with `persisted` cancels a pending swap; `createInteract` still calls `settle()`.
- Fail path: a rejected preload sets `window.__swapError`, logs `[run] swap failed: ...` as a warning, and calls the new `things.stall()`: the elevator goes `returning`, the toast reads the thing's `stub` or "The lift stalls", the hero unlocks at the bottom. The next E on that island goes through `defaultNavigate`, a full page load.
- `core/game.js`: `createGame(renderer, params)` owns input, the loop and `window.__game`; `game.load(level, { arrive, spawn, reset, from, at, navigate })` disposes the old interact, unmounts, builds view, projection, interact and actor, and mounts. Boot reads `arrive`, `spawn` and `reset` from the URL; swaps pass `spawn` and `reset` as undefined. Spawn order: `spawn`, `at`, `arrive`, lit-bonfire respawn, file spawn. `start()` stays as a wrapper for `2d/main.js` and `3d/catalog.js`. The loop starts on the first load only, so a paused game stays paused across a swap.
- `3d/renderer.js`: `createRenderer` adds the resize listener once; `mount(state, style)` builds terrain, decor, things and the hero; `unmount()` removes the three groups and the hero and disposes every geometry and material under them, skipping geometries that `GLBS` extras share. The hero is rebuilt per island because `buildCharacter` bakes the island's `light`. `disposeTree` is exported and also disposes `DataTexture` uniforms.
- `3d/clouds/index.js`: `mount(renderer, state, style)` takes the island's style; `unmount(renderer)` removes the mesh and disposes its geometry, material and island `DataTexture`. The atlas texture persists.
- `3d/main.js`: `prepare(name)` resets `CATALOG` to its base entries and empties `BUILDERS`, then runs `loadLevel` with `loadPieces`, `makeStyle` and `loadGlbs`. Each island registers its own style-bound builders, and no island inherits another's types. `window.__run` exposes the run.
- `window.__swapCount` counts swaps, `window.__swapError` holds the last failure, `window.__bakes` lists `{ name, loadMs, bakeMs, frameMs }` per load.

Unchanged: `nav=0` stops at `arrived` with the hero locked, as before; `hero=0`, `?clouds=none`, one localStorage key per island, the start page.

## QA (port 8772, profile `.pp-profile-p7-2`)

| Tool | Result |
| --- | --- |
| `qa-run.mjs` | 14 pass, 0 fail, 0 skip |
| `qa-ride-keys.mjs` | 13 pass, 0 fail; Back and Forward each swap once with no reload |
| `qa-things.mjs wizard-medium` | 40 pass, 0 fail |
| `qa-things.mjs cat-medium` | 40 pass, 0 fail |
| `qa-swap.mjs` | 24 pass, 0 fail; geometries 14 and textures 2 after both laps, equal to the first island |
| `qa.mjs` | 132 pass, 0 fail |
| `qa-levels.mjs` | 166 pass, 0 fail, 1 skip (sharkbear see-through window; the same skip on the base commit) |
| `qa-visibility.mjs all --json` | tallies identical to the base commit d3a0467 served from an archive |

A probe checked the fail path (blocked `wizard-medium.json`: deck returned, hero unlocked, `__swapError` set, second E did a full load to wizard), `nav=0`, and Back after reloading a pushed URL (hero on cat's exit 1,5).

## Bake times

`tools/qa-swap.mjs`, swiftshader, 900x800. Bake is `unmount` plus `mount` plus clouds; frame is bake start to the second frame after it; preload is fetch, pieces and style.

| Island | Bake ms | Frame ms | Preload ms |
| --- | --- | --- | --- |
| cat-medium | 15 to 16 (boot 37) | 231 to 237 (boot 86) | 3 |
| wizard-medium | 12 to 19 | 218 to 304 | 38 to 40 |
| swallow-medium | 9 to 11 | 201 to 226 | 25 to 31 |
| forest-volute | 13 to 15 | 200 to 262 | 27 to 30 |
| mindbloom-medium | 16 to 20 | 203 to 215 | 36 to 46 |
| cosmos-frisket | 13 to 16 | 207 to 230 | 33 to 41 |
| gremlin-subject | 14 to 18 | 221 to 227 | 32 to 36 |
| eagle-composition | 11 | 175 to 208 | 40 to 42 |
| dragon-medium | 13 to 14 | 224 to 235 | 32 to 43 |
| sharkbear-medium | 9 to 10 | 229 to 234 | 34 to 39 |
| chimera-medium | 11 to 12 | 210 to 235 | 28 to 36 |
| ember-subject | 11 to 12 | 226 to 235 | 30 to 40 |

Worst CPU bake: 20 ms on mindbloom-medium. The first frames after a swap cost 200 to 300 ms against 86 ms at boot; GPU upload and program setup for the fresh materials sit there, not in the bake.

## Deferred to phase 3

- The 200 to 300 ms first-frame stall after a swap. Phase 3 bakes during the hold, sliced over frames; it should also look at sharing materials across islands so programs do not rebuild.
- `zoomScale`, the unclamped camera, the island drop and the arrival slide; the mount `offset` argument does not exist yet.
- The 8 s hold cap and the reduced-motion path. A slow preload today keeps the hero locked on the raised deck until it resolves or fails.
- The `qa-ride-keys` per-hop checks for `shaft`, the hold and `zoomScale`.
