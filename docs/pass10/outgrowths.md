# Pass 10: outgrowths

Spec: `docs/PIPELINE-BRIEF.md` "## Pass 10". Every run island now carries four additive edge pieces, three on the back (north or west, the sides that face away at yaw 45) and one dock on the front. No spend.

## Visibility rule

`tools/qa-visibility.mjs` probes all four yaws by default (`--yaw=none` probes the saved yaw only). A route cell hidden at every yaw prints `WARN` (a sneaky route). It prints `FAIL` only when the cell is a ramp on the route and blocking that ramp leaves no path from spawn to the exit or the figure court. The run exits 1 on a fail or a load error, never on warns.

## Module API (`3d/pieces/outgrowth.js`)

Pure ESM with no three.js import, so the browser, the pipeline and procgen can share it. Coordinates are level cells; `side` is `n`, `e`, `s` or `w`; `u` counts cells outward from the anchor and `v` counts across.

- `BUILDERS.dock(L, {at, side, len = 3, m = "planks"})`: `len` bridge cells at the anchor height, flagged `post: 1` so `3d/terrain.js` draws two pilings per plank cell.
- `BUILDERS.plateau(L, {at, side, size: [depth, width], tier = ±1 | ±2, v0, s, m})`: one ramp per tier with a flat landing between ramps (`checkLevel` rejects ramp-to-ramp), then a `depth` by `width` shelf at anchor height plus `tier`.
- `BUILDERS.walkway(L, {at, side, len = 2, islet: [depth, width], causeway, s, m})`: a 1-wide plank bridge (or land causeway with `causeway: true`) to a small islet at anchor height.
- `plan(L, specs, {busy})` returns `{pieces, problems}` without touching the level. A spec is refused when its anchor is not land or sits under a thing, a watcher footprint or any cell in `busy` (pass blocked decor cells), when a cell is occupied or below ground, or when a cell touches any existing cell other than the anchor. Each piece therefore joins the island at one cell and stays a dead end, so it cannot shorten the route or touch a lift tile.
- `outgrow(L, specs, {busy})` applies the plan, grows the grid on whichever sides need room (`growGrid` shifts cells, decor, edits, things with their blocks, thresholds and edges, spawn and earlier outgrowths), records `L.outgrowths = [{kind, side, at, cells}]` and returns log lines. It does nothing on a level that already has outgrowths.
- `suggest(L, {kinds, sides, count, rnd, busy})` picks valid specs at random edge cells, a starting point for procgen.
- `frame(at, side)` maps `(u, v)` to cells; spec decor uses the same `{t, u, v}` frame.

Pinning: each pieces module exports `GROW` and `outgrow(level, o)`. `pipeline/a-transcribe/concept-level.mjs` calls it after `finish` and before `frameView`, so the view reframes the larger island. `core/procgen.js` `checkLevel` lets bridges listed in `outgrowths` end in open air and hold decor. Rebuilding cat, wizard, swallow, forest and ember reproduces the committed levels exactly. The other seven islands carry no layout PIN and drifted on rebuild before this pass; their outgrowths still apply on rebuild.

`tools/outgrow.mjs`: `--map` prints each island grid, `--pick` prints the specs pinned here (seeded by island name), `--write` applies `GROW` to the committed levels.

Saved hero positions in `isoworld:things:<level>` predate the shift; load with `reset=1` once.

## Per island

| Island | Grid | Pieces at (cells) |
| --- | --- | --- |
| cat-medium | 17x16 | plateau n at 9,5 (7); dock w at 2,5 (2); dock s at 9,13 (2); walkway n at 12,5 (7) |
| wizard-medium | 16x17 | plateau n at 10,5 (9); dock w at 3,8 (2); walkway n at 14,5 (7); dock s at 8,14 (2) |
| swallow-medium | 18x15 | plateau n at 10,3 (7); dock w at 3,9 (2); walkway w at 5,6 (7); dock s at 10,12 (2) |
| forest-volute | 19x16 | plateau n at 12,5 (9); dock w at 4,11 (3); walkway w at 5,5 (7); dock s at 11,13 (2) |
| mindbloom-medium | 17x17 | plateau n at 9,5 (9); dock w at 2,10 (2); dock s at 12,14 (2); walkway n at 14,7 (6) |
| cosmos-frisket | 20x16 | plateau n at 9,5 (9); dock w at 5,12 (3); walkway w at 5,8 (7); dock e at 17,9 (2) |
| gremlin-subject | 17x15 | plateau n at 8,3 (5); dock w at 3,8 (3); walkway w at 4,11 (5); dock s at 9,12 (2) |
| eagle-composition | 17x14 | plateau n at 8,3 (5); dock w at 2,8 (2); walkway n at 5,3 (5); dock s at 7,6 (2) |
| dragon-medium | 20x16 | plateau n at 10,5 (7); dock w at 4,10 (4); walkway n at 13,5 (7); dock e at 17,11 (2) |
| sharkbear-medium | 21x16 | plateau n at 12,5 (9); dock w at 5,10 (2); walkway w at 5,8 (7); dock e at 18,10 (2) |
| chimera-medium | 18x16 | plateau n at 9,5 (7); dock w at 2,14 (2); walkway n at 11,5 (5); dock e at 15,10 (2) |
| ember-subject | 19x15 | plateau n at 13,5 (7); dock w at 4,9 (4); walkway n at 8,4 (6); dock e at 15,7 (2) |

## QA

Port 8765, `PP_PROFILE=.pp-profile-p10`, logs in `out/pass10/qa/`.

- `qa-levels`: 238 pass, 0 fail, 1 skip (sharkbear see-through window, standing).
- `qa-visibility all` (four yaws): default 276/276, with rotation 276/276, 0 warns, 0 fails.
- `qa-things` per island: 471 pass, 0 fail (36 to 41 each).
- `qa-ride-keys`: 13 pass. `qa-run`: 14 pass. `qa.mjs`: 186 pass, 0 fail.

Sheet: `out/pass10/sheet.jpg`, rows cat, wizard, swallow / forest, mindbloom, cosmos / gremlin, eagle, dragon / sharkbear, chimera, ember; each pair is yaw 45 then yaw 225.
