# Pass 13: grown islands

The operator asked for "2x the size of all the islands" and chose to grow each island around its core. Every run island keeps its pass 12 layout as the heart: cells, route, gate, things, landmarks and figure stay where they were, shifted by the grid pad. New terrain grows around that core until the walkable area roughly doubles.

## How it grows

`tools/loops/grow.mjs` reads each level from `HEAD` (`--ref=` picks another commit), pads the grid by 9 on every side and grows lobes from free rim cells. It prints a report by default; `--map` adds the grid, and `--write` stores the result as `PIN[level].grow` in the island's pieces module.

- A lobe starts from a land cell on the rim and grows 8 to 18 cells outward. It comes in three kinds: flat (joins at the rim height), up (one ramp to a tier above) or down (one ramp to a tier below, from h2 or higher). Lobes may sit beside old land. When that changes the route, the tool retries the lobe with no contact, then drops it.
- After that, a lobe may gain a shelf: about 30% of its cells, raised one tier by one ramp, with clear landings. It may also gain a path strip in the island's path surface from the lobe's entry to its far end, and a 2 or 3 cell dock flagged `post: 1`. Each dock lands in `outgrowths`, so `checkLevel` lets it end in open air.
- Notch fill closes single empty cells that have three or more neighbours, which joins neighbouring lobes.
- Lobe surfaces come from the brief's `biome.surfaces` (ground, raised, path, shore), so each island keeps its own palette.
- The tool rotates lobes across the four faces n, e, s, w by cells gained, which gives each yaw a comparable amount of new ground.
- Every lobe, shelf, path, dock, notch and prop passes a gate before it stays. `checkLevel` problems may not increase, `prepareLevel` warnings may not increase, the entry to exit route with gates open must keep the same cells, and every closed gate's far side must stay unreachable from the arrival lift.
- Lifts stay on their tiles. The tool keeps their open neighbours empty, plus a lane 3 cells wide straight out from the lift for the full pad, so no lift gets buried and none had to move. Dock tips from pass 10 keep the same outward lane.
- Decor: the tool seeds clusters of the island's own 1x1 props, one family per cluster, at the core's blocked-cell density. It then runs `decorPass` (the decor loop) with every older prop frozen, and keeps only props that sit on new cells.
- The tool retries with a corrected target until the walkable ratio lands within 0.1 of 2.0.

`3d/pieces/outgrowth.js` gains `grow(L, spec)`. It applies `spec.pad` through `growGrid`, then writes the cells, decor and docks. Each pieces module calls it after `echo` as `widen` (several modules already define `grow` and `ring`). Rebuild order: finish, pin, `GROW` outgrowths, back echo, grow.

## Walkable area

Walkable means a cell `isWalkable` accepts after `prepareLevel`: land, ramp, bridge or lift, minus cells blocked by decor or things.

| Island | Before | After | Ratio | New cells | Lobes | Docks | Decor | Pad l,t,r,b | Grid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cat-medium | 116 | 242 | 2.09 | 189 | 12 | 3 | 67 | 5,7,5,7 | 27x30 |
| dragon-medium | 119 | 241 | 2.03 | 155 | 11 | 6 | 34 | 3,6,6,4 | 29x30 |
| chimera-medium | 120 | 250 | 2.08 | 166 | 10 | 5 | 40 | 5,5,7,5 | 30x30 |
| wizard-medium | 128 | 259 | 2.02 | 176 | 12 | 3 | 47 | 4,5,6,8 | 26x34 |
| swallow-medium | 130 | 249 | 1.92 | 149 | 10 | 2 | 31 | 4,8,4,3 | 28x28 |
| sharkbear-medium | 120 | 235 | 1.96 | 144 | 9 | 3 | 33 | 7,0,6,4 | 36x24 |
| gremlin-subject | 91 | 190 | 2.09 | 138 | 10 | 4 | 42 | 7,8,8,4 | 33x29 |
| mindbloom-medium | 120 | 249 | 2.08 | 158 | 10 | 4 | 34 | 7,4,5,8 | 29x29 |
| eagle-composition | 111 | 230 | 2.07 | 150 | 9 | 4 | 35 | 3,6,7,7 | 27x29 |
| forest-volute | 136 | 262 | 1.93 | 160 | 11 | 4 | 34 | 5,4,3,4 | 29x27 |
| cosmos-frisket | 126 | 260 | 2.06 | 176 | 12 | 3 | 50 | 8,8,5,8 | 35x36 |
| ember-subject | 127 | 255 | 2.01 | 162 | 10 | 5 | 37 | 8,4,7,7 | 34x30 |

Per-lobe logs sit in `out/pass13/grow-log.txt`.

## Gate seal

`tools/qa-levels.mjs` adds `closed gates sealed from the arrival lift`. In the live page, with every gate edge shut and held gate blocks blocked, it fails on any of three findings:

- `findPath` from a gate's threshold cell to its far cell returns a path.
- The far cell is reachable from the entry lift.
- A decor entry in the level file beside the far cell has no catalog entry. `prepareLevel` drops unknown decor, so that post would stop blocking.

Before and after growth, all twelve islands show 0 bypasses by every rule, in node with the islands' pieces registered and in the live page.

The wizard bypass that was reported, `[[11,20],[10,20],[10,19],[11,19]]` on the grown layout (6,14 before the shift), appears only when nobody registers the catalog. Running `prepareLevel` and `findPath` in node without importing `pieces/wizard.js` reproduces that exact path. Without the catalog, `prepareLevel` drops the two `star-doodle-totem` posts at 10,19 and 12,19, and the shut edge stands alone on open sand. With the catalog loaded, both posts block and `findPath` returns null, in node and in the live page. A player sees the bypass only when `pieces/wizard.js` fails to load. That happened for a few minutes during this pass: two transient module errors ("Identifier 'grow' has already been declared", and `live is not defined` in `3d/things.js`) broke the module or the whole page. The third rule above catches that case. Terrain stays unchanged at the gates. If the operator wants gates that hold without their posts, raising or dropping the two post cells one tier would do it, at the cost of editing the core.

## Lift beam

On the larger islands the portrait frame (400x800) zooms out far enough to show the top of the departure beam. `BEAM.up` in `3d/lift.js` rose from 32 to 64. The fade (`fade: [2.0, 15]`) still hides the beam above 15, so stills look as before (`out/pass13/beam-cat-1200x800.png`, `out/pass13/beam-cat-400x800.png`).

## QA

Port 8765, plain server. `PP_PROFILE=.pp-profile-2x` for qa-levels. The other suites ran alongside it on suffixed profiles (`-things`, `-rk`, `-swap`, `-perf`, `-shot`). Logs sit in `out/pass13/qa/`.

- `qa-levels` (all twelve): 274 pass, 0 fail, 1 skip (sharkbear see-through window, a standing skip). Lift to lift by click 12/12, ramp landings unblocked 12/12, closed gates sealed 12/12, shaft tops off frame 72/72 at 900x800, 400x800 and 1600x900.
- `qa-things` per island: 471 pass, 0 fail (36 to 41 each).
- `qa-ride-keys`: 13 pass, 0 fail.
- `qa-swap`: 24 pass, 0 fail. Memory stays flat: geometries 34/34 and textures 2/2 at hop 12 and hop 24. The slowest swap bake took 45 ms, on forest-volute.
- `qa-sway`: 2478 prop variants, 0 fail.
- `rebuild.mjs` x12: two consecutive rebuilds give byte-identical level files (md5 match). After the commit, all twelve report `identical` against HEAD.
- Perf at the hold (`perf.mjs --query=seq=hold`, billboards, swiftshader, 900x800, 300 frames), measured against the pre-growth commit on the same machine. cat-medium: 21.6 to 19.5 ms at 1x and 73.6 to 56.7 ms at 2x. ember-subject: 15.0 to 14.0 ms at 1x and 42.5 to 36.1 ms at 2x. The spread falls within run-to-run noise, so the grown islands add no measurable cost at the hold. Normal play after growth: cat 32.2 and 66.7 ms, ember 29.9 and 61.5 ms.

Sheet: `out/pass13/grow-sheet.jpg`, each island at yaw 45 in run order: cat, dragon, chimera, wizard / swallow, sharkbear, gremlin, mindbloom / eagle, forest, cosmos, ember. `out/pass13/sheet-y225.jpg` shows the same islands from the back.

## For the operator

- Hero positions saved under `isoworld:things:<level>` predate the shift. Load with `reset=1` once.
- Lobes reach outward rather than filling a full ring, because lift lanes and pass 10 dock lanes stay open water. Islands read as a cross or a star from yaw 45.
- To roll back, revert the pass 13 commit. To regrow with a different target, run `node tools/loops/grow.mjs --ratio=1.8 --ref=<pre-pass-13 commit> --write`, then `node tools/loops/rebuild.mjs`.
