# Pass 8 final: tile beam and cantilever lift on every island

Picks (`docs/DECISIONS.md`, 2026-10-08): shaft `tile`, lift tile `b`. Operator note: the arrival shaft coming up from below should sit behind the clouds more.

## Built

- One lift look. `3d/lift.js` keeps the cantilever tile (`tileB`), the shared deck and the tile-wide beam. The rails and hex shafts, tiles a and c, `?shaft=` and `?lifttile=` are gone. `3d/things.js` lost the pass-7 cage, the rail-and-rung shaft and its ride shader; `3d/renderer.js` lost the island stencil that only that shaft read, and the WebGL context no longer asks for a stencil buffer. Every elevator now gets the deck and a beam.
- Arrival beam under the clouds. The arrival beam draws with `renderOrder` 1, before the cloud billboards (2), so the cloud bed covers it. It runs 9 units below its tile (was 26) and its alpha climbs from zero at 7.5 units below the tile to full at 1.5 below (`BEAM.low`, `BEAM.rise`), so it comes up out of the cloud sea and reads brightest at the tile. The departure beam keeps `renderOrder` 3 and its fade above.
- Hero clear at the ride. `beamClear` in `3d/lift.js` holds the hero's screen position and `CLEAR.radius x zoom x pixel ratio`, the same circle the speed lines use; the renderer sets it each frame. A beam carrying the hero fades to zero inside 0.9 radii and back to full at 1.15.
- Edge lifts in the pipeline. `h.edgeLifts()` in `pipeline/a-transcribe/finish-helpers.mjs` moves each elevator onto a lift cell one step outward from its rim cell, or onto a named cell, and refuses a cell that is off the grid, already used, or touching more or fewer than one island cell. Each island module calls it at the end of its finish. The decor pass, the loop graphs, the layout loop and spawn picking treat `lift` cells as off the island, so the layout loop cannot bridge to a lift or count it as rim.
- `wizard-medium-p8` folded into `wizard-medium` and deleted. Its spawn change (4,10) did not survive: the layout loop moves spawn toward the bonfire and put it back on 3,5.

## Lift moves

| Island | Departure (exit) | Arrival (entry) | Side effects of the regenerate |
| --- | --- | --- | --- |
| cat-medium | 1,5 -> 0,5 (west) | 10,9 -> 10,10 (south) | 19 decor changes; layout loop raised 11,4 and 12,4 |
| wizard-medium | 12,1 -> 12,0 (north) | 3,4 -> 4,11 (south, off 4,10) | 11 decor changes |
| swallow-medium | 12,1 -> 12,0 (north) | 3,4 -> 4,11 (south, off 4,10) | 12 decor changes |
| forest-volute | 7,1 -> 7,0 (north) | 13,6 -> 14,6 (east) | 22 decor changes; layout loop edits moved |
| mindbloom-medium | 5,1 -> 5,0 (north) | 9,10 -> 9,11 (south) | 4 decor changes (2 predate this pass) |
| cosmos-frisket | 1,6 -> 0,6 (west) | 8,10 -> 8,11 (south) | 2 decor changes; one cut edit dropped |
| gremlin-subject | 6,2 -> 5,0 (north, off 5,1) | 13,6 -> 15,7 (east, off 14,7) | 10 decor changes |
| eagle-composition | 9,1 -> 9,0 (north) | 14,7 -> 15,7 (east) | 2 decor changes (predate this pass) |
| dragon-medium | 12,1 -> 12,0 (north) | 1,9 -> 1,10 (south) | view reframed: zoom 21.66 -> 20.72 |
| sharkbear-medium | 4,1 -> 4,0 (north) | 11,10 -> 11,11 (south) | 8 decor changes; spawn 10,10 -> 11,10 |
| chimera-medium | 4,1 -> 4,0 (north) | 12,10 -> 12,11 (south) | none |
| ember-subject | 7,1 -> 7,0 (north) | 12,6 -> 13,6 (east) | 17 decor changes; spawn 12,9 -> 12,7 |

Every departure sits on a back edge (north or west), so its beam rises behind the island. Every arrival sits on a front edge (south or east), so you see its beam come up from under the island. Compromises:

- wizard and swallow: the old arrival sat on the north edge, where the island hides a beam from below. Both moved to the south edge at 4,11, seven cells from the old spot.
- gremlin: the old exit cell 6,2 faces a notch at 6,1 with three island neighbours, so the exit moved to 5,0 off 5,1. The old entry's outward cell 14,6 also touches 14,7, so the entry moved one row down to 15,7 off 14,7.
- No island chases the previous island's departure side. Departures face the back of the frame and arrivals face the front, so matching them would hide the arrival beam.

The repro (`tools/loops/rebuild.mjs` without decor, then `decor-loop --write` and `layout-loop --terrain=4 --write`, the `pass.mjs` sequence) gives the committed file on nine islands. Before this pass gremlin, mindbloom and eagle already came back with two to four decor items swapped; that drift is unchanged.

## QA

Port 8765, `PP_PROFILE=.pp-profile-p8b`; outputs in `out/pass8/qa/`.

- `qa-levels`: 237 pass, 1 fail, 1 skip on the first run. The fail was the tap check on sharkbear-medium: the new spawn made it pick 10,7, a cell hidden behind the h3 block at 11,7. The check now walks the candidates from the middle until one shows on screen; a rerun on sharkbear-medium passed 18, 0 fail, the same standing see-through skip. Every shaft check passed: departure tops above frame at 900x800, 400x800 and 1600x900, arrival tops on their decks and on screen.
- `qa-visibility all`: 252/253 cells. The run has 253 cells now (259 before) because the routes changed with the lifts. The fail: ember-subject 9,4, floor 2% visible from 10,4. The decor loop now puts a `glowing_ember_vent` on 9,4; with that vent removed the cell passes at 100%. Not fixed (see below).
- `qa-ride-keys`: 13 pass, 0 fail.
- `qa-run`: 14 pass, 0 fail, 0 skip.
- `qa-swap`: 24 pass, memory geo 33/33 and tex 2/2, worst bake 28 ms on dragon-medium.
- `qa.mjs`: 132 pass. `qa-hero`: 29 pass.
- `qa-things`: cat 40, wizard 40, swallow 39, forest 39, mindbloom 39, cosmos 39, gremlin 40, eagle 39, dragon 39, sharkbear 41, chimera 40, ember 36; 0 fail on every island.
- Perf at the hold (`tools/perf.mjs --query=seq=hold`, swiftshader, 900x800, 1x, 150 frames, billboards): wizard-medium 15.9 ms, 26 calls; cat-medium 16.1 ms, 26 calls. The options pass measured 15.8 ms and 26 calls for the `tile` hold, against 12.5 ms for the pass-7 rails. Results in `out/pass8/perf-hold.json`.

## Media, `out/pass8/`

- `arrive-NN-<level>.png`: each island in run order at 900x800, loaded with `arrive=entry`.
- `final-sheet.jpg`: the twelve arrival stills, four columns.
- `ride.mp4`: `tools/ride-clip.mjs`, 32 s at 900x800: cat-medium to wizard-medium (landing on the 4,11 arrival tile at 14.2 s) to swallow-medium (landing on 4,11 at 30.8 s), 0 page errors.

## Unfinished

- ember-subject 9,4 visibility fail. The regenerate made the decor loop place a passable vent on that route cell, and the vent hides its floor from 10,4. A fix belongs in the decor pass (keep floor-covering props off route cells), which this pass did not touch.
- Decor churn on cat, forest, ember, swallow and wizard (11 to 22 items each). Figures, landmark buildings and island-named props stayed put, except one eagle-cairn (9,3 to 11,10), part of eagle's older drift; the loops re-placed rocks and props. No one has judged the changed islands by eye yet.
- Levels outside the run (cat-subject, forest-lift and the other lens variants) still place elevators on ordinary cells and now get a beam that starts inside the island. Nobody rides them.
- No fortress Review Queue card yet.
