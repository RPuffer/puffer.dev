# Route visibility, batch B: dragon, sharkbear, chimera, ember, and the wizard repair

2026-10-08. Four islands from the pass 6 tally plus the wizard follow-up. Every fix lives in the island's pieces module so `tools/loops/rebuild.mjs` reproduces it; `node tools/loops/pass.mjs <level>` ran after each edit. Checks ran on port 8765 with `PP_PROFILE=.pp-profile-visb` (ride reruns on `.pp-profile-visb2`). Visibility output: `out/pass6/vis-b-before.txt`/`.json` (the committed levels), `out/pass6/vis-b.txt`/`.json` (dragon, sharkbear, chimera, ember after the first pass), `out/pass6/vis-b-sharkbear.json`, `out/pass6/vis-b-ember.json`, `out/pass6/vis-b-wizard.json` (final levels). Arrival shots at 900x800 from the entry lift: `out/pass6/<island>-arrival.png`. Every level ran `pass.mjs` twice more after its fix and reads `level unchanged`.

| Island | qa-visibility | qa-levels | qa-things | ride | greedy |
| --- | --- | --- | --- | --- | --- |
| dragon-medium | 21/22 to 23/23 | 14 pass | 39 pass | eagle → dragon → sharkbear pass | 19 to 19 |
| sharkbear-medium | 17/19 to 18/19 (10,7 left, below) | 12 pass, 1 standing skip | 40 pass | dragon → sharkbear → chimera pass | 14 to 14 |
| chimera-medium | 19/20 to 20/20 | 14 pass | 39 pass | sharkbear → chimera → ember pass | 22 to 14 |
| ember-subject | 17/18 to 19/19 | 14 pass | 36 pass | chimera → ember, ember last pass | 13 to 16 |
| wizard-medium | 26/26 to 26/26, market row back | 14 pass | 40 pass | cat → wizard → swallow pass | 44 to 38 |

Three helpers went into `3d/pieces/wizard.js` beside `faceRamps`, so any island can call them from its `finishLens`:

- `backEntry(level, h)`: when the six-cell walk from the entry platform toward the exit ends on a gate cell (the landing test's target is then the far cell, hidden behind the shut bars from the entry side, and every cell nearer the exit is past the gate), move the entry lift to another rim cell within 7 of the spawn whose walk ends before the gate. It skips the figure, the spawn, gate cells, cells cut off with the gate shut, cells with large or multi-tile decor, and cells within two steps of a bonfire or chest (a platform that shares a neighbour with the bonfire makes E ride the lift instead of lighting it; the ride tool proved that on ember). Score: distance from spawn, same rim side as before, distance from the old platform. Small decor on the chosen cell is cleared.
- `orphanPosts(level, h)`: drop threshold posts (`gapX`/`gapZ`) whose gap cell no longer belongs to any gate thing's blocks, threshold or edge. The build flanks the gate's first cell with posts before `placeThings` moves the gate; the posts stayed behind on chimera.
- `floorClear(level, h, cells)`: for passable props 0.3 or taller sitting on the given route cells, move them to a free flat neighbour off the route, or drop them. The check's floor marker sits 0.15 above the surface, so a 0.45 slab or a 0.3 vent on a route cell reads as 0% floor with no named occluder.

## dragon-medium

Before: 21/22. Entry landing from 2,9 failed: `3,9:100% 4,9:78% 5,9:100% 6,9:100% 7,9:100% 8,9:19%(spine_frill@9,10)`. The sixth cell of the walk is the gate threshold 8,9, and the gate's own post at 9,10 (threshold role, h1.2) fronts it from the camera side.

Fix: `backEntry` (no terrain). The entry lift moved one cell west to 1,9 (south rim, rot 0); the wire_loop there cleared. The walk now ends at 7,9. Gate, posts and route untouched; `edits` stays at the one earlier lower (13,7).

After: 23/23 (the entry step 2,9 became a tested cell). Entry landing `2,9:100% 3,9:100% 4,9:78% 5,9:100% 6,9:100% 7,9:100%`. qa-levels 14 pass, 0 fail. qa-things 39 pass, 0 fail. Ride eagle → dragon PASS (entry key s, tap 14,8), dragon → sharkbear PASS (entry key n, tap 1,8). Pass line: `walkable 80/80 singletons 0.07 density 0.26 figure-from-spawn y greedy 19 edits 1`. Greedy 19 before, 19 after.

## sharkbear-medium

Before: 17/19. Two route cells failed: 10,7 (`hero 0%/95% floor-from 10,8 0%`, ramp faces away from the camera) and 7,5 (`hero 35%/85% floor-from 7,6 20%`, no named occluder).

7,5: a graphite-shard-slab (passable, h0.45) sat on the cell and covered the floor marker. `floorClear` on the spawn-to-exit route dropped it (no free flat neighbour off the route); the decor loop re-placed the slab at 6,7. 7,5 now reads 91% from 7,6.

10,7: left failing. The route climbs the one-cell h2 bump (ramp 10,9 up, 10,8, ramp 10,7 down) and drops north onto the h1 gate line 10,6 → 9,6 → 8,6 → court 7,6. Every drop toward the gate heads north or west, both away-facing at yaw 45. Flattening the bump (three edits: 10,9, 10,8, 10,7 to h1) was tested on a copy: 10,7 passes but the lane becomes a trench under 11,9 h2, the bristle-clump at 11,8 (h3) and the chest's h3 block at 11,7, and the entry landing fails `10,8:1% 10,7:0% 10,6:0% 9,6:0%`. Raising the gate line instead needs 10,6, 9,6, 8,6 and the court 7,6 (court edits are out, and it is four cells). The hero reads 95% through the x-ray window there.

After: 18/19. qa-levels 12 pass, 0 fail, 1 skip (the see-through-window skip, already in `out/pass5/a/qa-levels-sharkbear-medium.txt`: no walkable cell within two rings behind a tall piece with gates closed). qa-things 40 pass, 0 fail. Ride dragon → sharkbear PASS (entry key n, tap 1,8), sharkbear → chimera PASS (entry key e, tap 12,10). Pass line: `walkable 80/80 singletons 0.07 density 0.26 figure-from-spawn y greedy 14 edits 4`. Greedy 14 before, 14 after. The rebuild's layout loop moved its own rim cut from 14,3 to 14,4 and the decor loop took a second run to settle (bristle-clump 7,8 to 6,8, rock 6,8 to 7,8); the third `pass.mjs` run reads `level unchanged`. The ledger holds four cells, all the loop's own.

## chimera-medium

Before: 19/20. Entry landing from 12,10 failed: `11,10:57% 10,10:100% 9,10:100% 8,10:100% 7,10:5%(ribbed-plates@8,11) 7,9:2%`. Two ribbed-plates (h1.7) at 8,9 and 8,11 carried `gapX 8, gapZ 10`: the build's `gate ribbed-plates flanking 8,10`, left behind when `placeThings` put the gate on edge 6,8 | 6,7. They flanked the walk's fifth cell and fronted 7,10 and 7,9.

Fix: `orphanPosts` (no terrain, `edits` stays empty). Both posts dropped; the decor loop re-placed ribbed-plates elsewhere for the density band (11,9, 13,6). Gate untouched.

After: 20/20. Entry landing `11,10:57% 10,10:100% 9,10:100% 9,9:100% 8,9:100% 7,9:100%`. qa-levels 14 pass, 0 fail. qa-things 39 pass, 0 fail. Ride sharkbear → chimera PASS, chimera → ember PASS (entry key e, tap 13,10). Pass line: `walkable 78/78 singletons 0.15 density 0.19 figure-from-spawn y greedy 14 edits 0`. Greedy 22 before, 14 after: the posts had been steering the greedy walker too.

## ember-subject

Before: 17/18. Entry landing from 12,5 failed: `12,4:55% 11,4:100% 10,4:100% 9,4:2% 8,4:100% 8,3:25%`. 9,4 held a glowing_ember_vent (passable, h0.3) over the marker. 8,3 is the gate's far cell: the walk's sixth cell, behind the shut bars from the platform, and no cell nearer the exit lies before the gate, so the landing test cannot end anywhere else.

Fix: `backEntry` plus `floorClear` on the entry walk (no terrain, `edits` stays empty). The entry lift moved one cell south to 12,6 (east rim, rot 1); the bone pile there cleared, the vent at 9,4 dropped (no free neighbour off the route). The walk now ends at 8,4, the threshold, with the gate cells out of it.

The platform at 12,6 sits diagonal to the bonfire at 11,7. `qa-ride-keys` walked to the platform to light the bonfire (`bonfire 11,7 [12,5] -> [12,6]`) and E rode the lift instead: `FAIL ember-subject (last) E beside bonfire 11,7 left it unlit`, twice, on a fresh profile. That is the game's rule (on a platform the lift owns E, and the prompt reads "Ride the lift"), so the tool now keeps its bonfire step off lift platforms (`tools/qa-ride-keys.mjs`, the one change). A stricter `backEntry` that also refused the bonfire's diagonal ring sent the lift to 11,2 on the NE rim (h2, above the south ramp 11,3), which cost two route cells (12,6 and 9,4 read 9% and 2%) and was reverted; the orthogonal-only clearance stays.

After: 19/19. Entry landing `12,5:59% 12,4:100% 11,4:61% 10,4:46% 9,4:100% 8,4:100%`. qa-levels 14 pass, 0 fail. qa-things 36 pass, 0 fail. Ride chimera → ember PASS (entry key e, tap 13,10), ember (last) PASS (entry key n, tap 12,5; bonfire lit; through g1; exit key e, tap 8,1). Pass line: `walkable 72/72 singletons 0.04 density 0.26 figure-from-spawn y greedy 16 edits 0`, second run `level unchanged`. Greedy 13 before, 16 after (the walker now starts one cell farther from the figure).

## wizard-medium

Numbers from `caeb844`: visibility 26/26, greedy 44 (22 before the fix per RUN.md; `walk.mjs` on the pre-fix level reads 20), market row gone.

Market row. `placeGeneric` found no footprint after `faceRamps` for a reason unrelated to the footprints: its `sight` guard calls `readability()`, whose route is `approach()` without `walkOnly`, and that route now takes a cliff step (the walkable climb is 20 cells, the cliff cut 9), so `walks` is false for every candidate and every footprint is rejected. Candidate footprints on the built level (reach kept, route length kept): market-row at 1,7 rot 1 (1,7 1,8 1,9, h1, west rim) and 1,8 rot 1; market-row-small at 1,7/1,8/1,9 rot 1, 3,9, 9,9 and 11,9 rot 1. Rows 10 (9,10, 8,10 and west) cut 11,9 and 11,10 off the walk graph. Re-placing with `sight: false` after the drop puts the market row at 1,7 rot 1, on the west rim below the spawn pocket; it fronts no route cell. Visibility with it: 26/26 (entry landing `3,5:100% 4,5:74% 4,6:78% 4,7:85% 5,7:0% 5,8:67%`, as before). On copies, the same row at 9,10 and a small row at 10,10 or 9,9 also kept 26/26; a small row at 11,9 rot 1 flipped the entry walk onto the 5,5 decoy and failed.

Cheaper edit set. `faceRamps` with budget 2 (lower 5,7, ramp 7,8; 5,6 and 5,8 stay h3) passed the static check on a copy, 25/25 with 4,7 as the one allowed hidden cell on the entry landing, greedy 30. Run through `pass.mjs` the loops spent the two spare cells (lower 8,6, lower 8,8), swapped the decoy ramp from 5,5 to 9,9, and the decor loop put a cyan-ember-pillar at 5,8 fronting 4,7: visibility 25/26 (`4,5:16%(terrain 5,6 h3) 4,7:0%(cyan-ember-pillar@5,8)`), greedy 122. Reverted to budget 4. Raising the landing (4,7 and 4,8 to h3) needs a camera-facing climb from the spawn pocket onto the plateau, and every such ramp (5,5 south, 4,4 south) lands north of the gate edge 7,7 | 7,6.

Greedy. 44 comes from the layout loop's unbudgeted south-facing ramp at 5,5, which opens the dead-end pocket 5,4 4,3 5,3 5,2 6,2 toward the figure: the greedy walker climbs it and wanders. 32 with that cell flat, 30 straight out of the build before the loops. The shortest route is 20 against 16 before the fix because the only camera-facing climbs onto the plateau start from row 9 (7,8 or 6,8). Left as the loop built it.

Outcome: market row back (1,7 rot 1), terrain and `edits` identical to `caeb844` (lower 5,7, ramp 7,8, lower 5,6, lower 5,8), hidden climb stays closed. Pass line: `walkable 73/73 singletons 0.07 density 0.26 figure-from-spawn y greedy 38 edits 4`; greedy 44 to 38 comes from the decor loop's prop moves, not the terrain. The pass run's own qa-levels step reported `tap walks to 3,7 -> 4,7` once (a tap on the west ramp after the four key steps, under load); the standalone qa-levels run right after read 14 pass, 0 fail. qa-visibility 26/26, qa-things 40 pass, 0 fail. Ride `--order cat-medium,wizard-medium,swallow-medium` 4 pass, 0 fail (cat → wizard entry key w, tap 9,9; wizard → swallow entry key s, tap 3,5; the market row sits off both walks).
