# Pass 11: rounder backs

Operator: "there's still an obvious front and back, could we introduce maybe some more symmetry to help round out the backside a bit more."

## What the backs lacked

At yaw 45 the camera sits off the south-east corner, so the north and west sides face away. A scan of the twelve run islands (cells split on the diagonal through the land centroid) found the same shape on all of them: the front rim sits at h1 and climbs inward in terraces, while the back rim sits at h2 to h4 and drops straight to the clouds. From yaw 225 you met a wall where the front shows you a staircase. The pass 10 plateaus and islets on the back made it worse: tall pillars with sheer sides.

## Mechanism

- `3d/pieces/outgrowth.js` `echo(L, spec)` grows the grid by `spec.pad` (left, top) with `growGrid`, writes `spec.cells` and appends `spec.decor`. It returns one log line.
- Each run island's `PIN[level].back` holds that spec, in the frame after outgrowths. Every pieces module's `outgrow` now runs `growOut` and then `echo(level, PIN[level.name]?.back)`, so `concept-level.mjs` applies the echo before `frameView` reframes the island.
- `tools/loops/backs.mjs` computes the specs from the pre-pass levels at `6973682` (`--ref=` overrides), prints what it placed (`--map` draws the grid, `+` new cell, `R` new ramp, `#` new cell with decor) and `--write` stores them into each PIN. Rerunning it rewrites the same specs.

The tool works outward from the north and west rims and checks every addition before it keeps it:

1. Notch fill: open cells on the back, reachable from outside the grid, with two or more land neighbours, take the lowest neighbour height.
2. Step 1: a ring one tier below each back rim cell at h2 or higher, outgrowth plateaus and islets included (docks and bridges excluded). A same-height run either joins land it touches or gets one ramp off a rim cell, with a landing row so the whole step stays walkable. Single cells, and runs past the ramp budget (3 per island), get a solid prop on every cell instead.
3. Step 2: the same again below step 1 where step 1 is h2 or higher, budget 2 ramps.
4. Plateau: islands with fewer than two new ramps after the steps (cat) get a 2x3 back block raised from h1 to h2 with one ramp.
5. Decor: passable front props on alternate terrace cells, a solid front prop capping the far end, then solid and passable props on back rim cells until back density matches the front.
6. Landmark: when the front holds more multi-tile props than the back, the tool tries the front's non-generic, non-lead landmark on a flat back patch. None fit this pass (dragon crane, eagle eyrie, cosmos press).

Each candidate is rejected if the spawn-to-exit or entry-to-exit path changes by a single cell, the unreachable-cell count rises, `prepareLevel` warns, or `checkLevel` finds a new problem. Gates, lifts, things, docks, multi-tile landmarks and route cells keep their positions and heights.

## Per island

| Island | New/changed cells | New ramps | Decor | Pad (left,top) |
| --- | --- | --- | --- | --- |
| cat-medium | 28 | 2 | 5 | 0,0 |
| wizard-medium | 44 | 5 | 17 | 0,4 |
| swallow-medium | 39 | 3 | 17 | 2,2 |
| forest-volute | 64 | 5 | 19 | 2,3 |
| mindbloom-medium | 30 | 4 | 5 | 0,0 |
| cosmos-frisket | 45 | 5 | 22 | 2,4 |
| gremlin-subject | 22 | 3 | 9 | 1,2 |
| eagle-composition | 17 | 2 | 11 | 0,2 |
| dragon-medium | 23 | 4 | 7 | 0,4 |
| sharkbear-medium | 36 | 4 | 21 | 2,4 |
| chimera-medium | 29 | 4 | 5 | 0,4 |
| ember-subject | 45 | 5 | 16 | 0,4 |

Ramp counts include plateau ramps and the planted single cells are counted as cells. Saved hero positions predate the pad shift; load with `reset=1` once.

## Ramp landings

Operator rule: a ramp needs an unblocked landing at the top and the bottom. He hit a bonfire on swallow that sat on a ramp's top cell, so he had to climb the ramp to reach it.

- `core/procgen.js` `rampLandings(raw, decorBlocked)` lists every ramp whose uphill or downhill neighbour holds blocking decor or a thing that blocks its cell (bonfire, chest, a gate that holds its cell). `checkLevel` adds each one as a problem, so `concept-level.mjs` fails the build.
- `tools/qa-levels.mjs` records `ramp landings unblocked` per level from the live prepared level.
- An edge gate (door on the edge between its threshold and its cell) leaves its cell walkable, so a gate cell can serve as a landing. Cat, cosmos, forest and mindbloom each have a ramp that lands on the gate cell; they pass.

Run islands before the fix: 2 violations, 0 after.

- swallow-medium: the bonfire sat on the top landing of the ramp at 7,13. It moves one cell west to 6,12 (PIN 2,8), beside the foot of the ramp at 7,11. Swapping it with the marker at 8,12 cut the island in two, since the route runs through 8,12.
- ember-subject: the brimstone forge footprint covered the bottom landing of the east ramp at 7,15. Moving the forge opens a way around gate g1 at every cell I tried, so the ramp cell becomes flat h2 dirt instead, a ledge above the forge. PIN cell `[4, 8, {h: 2, s: "dirt"}]`.

Five violations remain on levels outside the run: chimera-composition (1), cosmos-lashline (1), cosmos-subject (2), mindbloom-composition (1).

## QA

Port 8765, `PP_PROFILE=.pp-profile-p11a`, logs in `out/pass11/qa-backs/` (script `out/pass11/qa-backs.sh`). The renderer's hero occlusion default changed to outline plus hologram fill during this pass (`ee6f900`, not part of this pass).

- `qa-levels`: 251 pass, 11 fail, 1 skip. Lift to lift passes 12/12 and ramp landings 12/12. All 11 fails are `see-through window ... 0 px differ`, which measures the old see-through circle that `ee6f900` replaced. The skip is the standing sharkbear see-through window.
- `qa-visibility all` (advisory now): default 248/250, with rotation 249/250, 2 warns, 0 fails. The warns are sharkbear route cells 13,12 and 10,11, hidden at every yaw. A run before `ee6f900` with the same back terrain read default 273/274, rotation 274/274, 0 warns.
- `qa-things` per island: 471 pass, 0 fail (36 to 41 each).
- `qa-ride-keys`: 13 pass, 0 fail.
- `tools/loops/rebuild.mjs`: all twelve islands build PASS and match the committed levels byte for byte.

Islands that changed the most from yaw 225: forest, cosmos, ember, wizard, swallow. Dragon, eagle and gremlin changed the least; their back rims sit at h1, so they get few steps.

Sheet: `out/pass11/backs-sheet.jpg` (script `out/pass11/backs-sheet.mjs`), rows cat, wizard, swallow / forest, mindbloom, cosmos / gremlin, eagle, dragon / sharkbear, chimera, ember; each pair is yaw 45 then yaw 225.
