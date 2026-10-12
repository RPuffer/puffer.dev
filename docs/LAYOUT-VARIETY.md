# Layout variety: shape first, then route

Status: approved (commit 1655c57). Phase 0 and phase 1 have landed; phase 2 onward waits for Ryne.

Ryne's read of the run: the islands path differently, but they share a centre section and their shortcuts look identical. The numbers agree. This doc names the cause in code, then proposes a shape-first pipeline with a shape library, teleporters, a shortcut deck that pays for detours, and QA that fails a run of look-alikes.

Evidence: `out/layout-variety/route-sheet.png` (top-down route maps of the 12 run islands and wizard-medium-r1 to r3, plus land and path frequency heatmaps) and `out/layout-variety/metrics.json` (per-level and per-pair numbers). Mirrored islands are flipped back before comparison, because the player sees the shape, and a mirror image of a shape reads as the same shape.

## 1. What the bake produces

Across the 66 pairs of run islands:

| Measure | Mean | Range |
| --- | --- | --- |
| Footprint (land cells, Jaccard) | 0.67 | 0.50 to 0.86 |
| Centre window land (x 10..27, z 11..31) | 0.82 | 0.73 to 0.94 |
| Centre window cells identical in surface, height and path | 0.72 | 0.61 to 0.83 |
| Path cells outside the centre window | 0.44 | 0.21 to 1.00 |
| Route fingerprint, as `qa-route` computes it | 0.35 | 0.12 to 0.73 |
| Route fingerprint, mirror undone | 0.57 | 0.35 to 0.98 |

Fixed points across all twelve:

- The core figure stands on one cell, (15,16). The exit lift sits at x 27, z 15 or 16. The entry lift sits at z 31 in every island.
- 261 land cells (46 percent of a mean island of 572) and 58 path cells (34 percent of a mean route of 170) appear in all twelve islands.
- The fixed frame owns 46 percent of every route's path cells on average (38 to 54 percent).
- The door's far cell is (15,26) or (16,26) in all twelve. The ladder or drop's far cell is always on row z 24, x 12 to 15. Ten of twelve lever gates sit at (7,26). Every shortcut lands within nine cells of the bonfire on rows 25 and 26.
- Every archetype was realised as intended. The variety the archetypes add lives only in the west and north bands.
- Four pairs are the same route mirrored: swallow and chimera (spiral, 0.98), mindbloom and eagle (twin, 0.97), wizard and ember (switchback, 0.91), gremlin and dragon (0.83). `qa-route` passes them because it compares raw coordinates.

## 2. Why they converge

Ryne suspected the earlier outward growth pass (the artwork base plus the 2x expansion, `tools/outgrow.mjs`, commit 4f448dd). That pass does not feed the route-first bake. `generateLayout` in `core/layout/index.js` reads only the base level's decor, palette, light, pieces and chest text; it never reads `base.cells` or `base.size`. The shared centre comes from a fixed frame the route-first planner stamps on every island.

1. **The core is a constant.** `planIsland` in `core/layout/plan.js` sets `FRAME = { X: 3, Z: 3 }` and `fx = 12 + X, fz = 13 + Z`, so the figure sits at (15,16) on every seed. `coreBands` then stamps the same 10x10 terrace, and `planIsland` draws the terrace C, the dais climb, the three-quarter dais loop, the dais descent, the east ring and a six-cell exit causeway at literal offsets from it. The rolls `sx`, `ey`, `dy` move those roads by one cell.
2. **The plaza and lifts are constants.** `PZ = 22 + Z` fixes the plaza row at z 25; `px` rolls between 11 and 12. The entry dock hangs off the plaza bottom, so the entry lift lands on z 31. The exit causeway starts at the terrace's east edge, so the exit lift lands at x 27.
3. **The lattice is an L around that core.** `LATTICE` in `core/layout/topology.js` pins node S at (2,8) and node E at (5,2), and `allowed()` admits only columns 0 to 2 (the west band) and rows 0 to 2 (the north band). Every archetype in `ARCHETYPES` draws its journey inside this L. That is why the west strip varies and nothing else does.
4. **The land follows the frame.** `growFlanks` in `index.js` grows land one to three cells out from path cells, and `LAYOUT_SIZE = [29, 37]` is the same for every island. A fixed route skeleton yields a fixed silhouette: core block, plaza lobe below it, east causeway, L of corridors.
5. **The shortcuts are three hard-coded pieces.** In `planIsland`: `put("doorway", ...)` always runs from the east ring down to the plaza's east door at `[px + 4, PZ + 1]`; `put("spur", ...)` always drops south from the terrace at `lx` to the plaza's top door; the lever chord always ends at node S, which the low road ties to the plaza's west door. `routeMeta` in `index.js` lists exactly these three (`door`, `ladder`, `lever`) for every island. The archetype changes only where the lever stands.
6. **The artwork centrepiece always sits dead centre.** `placeDecor` in `core/layout/decor.js` puts the base level's `watch` decor at `fx, fz` and copies the artwork's one-cell decor around it into `core.terrace` (`inCore`). The terrace seals (`core.blocks.tower`, `core.blocks.spires`) sit at fixed corners of that terrace.
7. **Mirroring hides duplicates.** `RUN_TOPOLOGY` in `tools/bake-layout.mjs` lists ring, switchback, spiral, maze, twin, figure8, comb, then repeats five of them mirrored. `mirrorLevel` flips the finished level, and `fingerprintClash` in `topology.js` compares coarse edges by raw coordinate, so a mirrored repeat scores 0.15 where the unflipped shape scores 0.97.

## 3. The pipeline

Three stages, each one constraining the next and never undoing it.

1. **Shape.** Pick a shape from the library (`levels/shapes/*.json`), then a dihedral transform (rotate 0/90/180/270, optional mirror) and a scale that fits the grid. The shape fixes the landmasses, their outlines, the corridor graph the route may use, and the key points: entry lift, exit lift, centrepiece slot, bonfire slot, teleporter pads, reward slots.
2. **Route in the shape.** Pick an archetype that the shape lists as compatible. The archetype becomes a mission graph (Dormans, P2 and practice 8 in `docs/procgen-research.md`): start, bonfire, lock, gate, goal, loops, branches. The generator embeds that graph on the shape's corridor graph, places the sanctum (today's core terrace and dais) at the centrepiece slot, and draws shortcuts from the shortcut deck (section 8).
3. **Decor and height.** The shape gives height hints per region (a mesa rises, a lagoon sinks); the route sets tiers along its arcs; flanks grow only inside the shape mask; then `placeDecor` dresses the island with its machines as today.

The shape and the route complement each other because the shape declares which archetypes it can host and where their anchors go. A spiral never gets forced into a dumbbell; a dumbbell never gets a ring.

## 4. Shape library format

One JSON file per shape. Coordinates are in shape units; one unit is a 3x3 cell block, matching today's lattice step, so a corridor and its flanks fit one unit wide.

```json
{
  "id": "atoll",
  "size": [9, 12],
  "landmasses": [
    { "id": "ring", "mask": ["..#####..", ".##...##.", "##.....##", "#.......#", "..."] },
    { "id": "islet", "mask": ["....##...", "..."], "height": 2 }
  ],
  "links": [
    { "kind": "teleporter", "a": "ring", "b": "islet", "role": "connector", "pads": [[4, 9], [4, 5]] }
  ],
  "corridors": "derive",
  "keys": {
    "entry": { "at": [4, 11], "rim": "s" },
    "exit": { "at": [4, 0], "rim": "n" },
    "centrepiece": [{ "at": [4, 5], "landmass": "islet", "size": "large" }],
    "bonfire": { "near": "entry", "within": 2 },
    "rewards": [[0, 6], [8, 3]]
  },
  "heights": { "ring": [1, 2], "islet": [3, 4] },
  "archetypes": ["ring", "twin", "figure8"],
  "feeling": "lagoon"
}
```

| Field | Meaning |
| --- | --- |
| `landmasses` | one mask per separate piece of land; `#` land, `.` void. Up to four per shape |
| `links` | how landmasses join: `bridge` (a causeway module), `teleporter`, or `drop` (one-way fall to a lower landmass) |
| `corridors` | `derive` takes the medial axis of each mask as the corridor graph; a shape may instead list nodes and edges by hand |
| `keys` | entry and exit lifts on the rim, one to three centrepiece slots, the bonfire rule, reward slots for chests and collectibles |
| `heights` | the tier range each landmass may use |
| `archetypes` | the route archetypes this shape can host, best first |
| `feeling` | a tag the run sequencer reads so neighbours in the run differ (Spelunky's level feelings) |

The generator rejects a shape transform that puts the entry lift on the camera's far rim or any key point outside the grid.

## 5. Example shapes

One character is one shape unit (3x3 cells). `#` land, `.` void, `S` entry lift, `E` exit lift, `C` centrepiece slot, `B` bonfire, `a`/`A` a teleporter pair (lower case near the bonfire), `$` reward slot.

**1. Crescent.** Centrepiece on a horn tip; the route walks the arc. Hosts ring (the chord cuts the bay), switchback.

```
....####.
..###..C#
.##......
##.......
##.......
.##....$.
..###...#
....##BS#
```

**2. Atoll.** A ring of land around a lagoon; the centrepiece stands on an islet in the lagoon, reached only by a teleporter from the ring's far side. Hosts ring, twin.

```
..#####..
.##...##.
##.....##
#...C...#
#..#A#..#
#.......#
##..$..##
.##a..##.
..#BS##..
```

**3. Dumbbell.** Two lobes and a narrow bridge. The bonfire lobe holds the first half of the route; the far lobe holds the sanctum and the exit. A teleporter on the far lobe wakes as the return shortcut. Hosts figure8 (one loop per lobe), twin.

```
###.......E##
#B##.....##C#
#Sa#######A##
####.....####
.$#.......##.
```

**4. Stepping stones.** Three landmasses in a diagonal; connector teleporters chain them, and the exit lift sits on the last. The centrepiece sits on the middle stone, so you pass it twice. Hosts comb (teeth on each stone), maze on the big stone.

```
.......###E
.......#A##
....###....
....#C#b...
....#B#....
###.###....
#Sa#.......
###$.......
```

**5. Ridge.** A long diagonal spine with a switchback climb; the centrepiece sits at the bend two thirds up, the exit at the crest. Hosts switchback, spiral.

```
.........E#
........###
.......##C.
......##...
.....##....
....##.$...
...##......
..##.......
SB#........
```

**6. Fishhook.** A long shank and a curled hook; the route spirals into the hook, where the centrepiece waits, then leaves by the shank's head. Hosts spiral, comb.

```
.######E
.#....##
.#......
.#..###.
.#.#C.#.
.#.#..#.
.#.##.#.
.#....#.
SB#####$
```

**7. Mesa.** A compact block in three tiers; the route climbs the terraces in a switchback and the centrepiece crowns the top tier's corner. A drop links the top tier back to the bonfire tier. Height carries the variety; the outline stays simple. Hosts switchback, maze.

```
########E
#333333C#
#3333333#
#2222222#
#2222$22#
#1111111#
#11B1111#
####S####
```

(Digits mark tiers; all are land.)

**8. Broken ring with satellite.** A C of land with a maze in its body and a small reward islet off the gap; an off-route one-way teleporter goes out to the islet, and a return pad brings you back beside the bonfire. Hosts maze, comb.

```
.#######..
##.....##.
#.......#.
#....C..#.
#.......#..##
##.....##..#$
.##B.##....A#
..#S#a.......
```

**9. Trefoil.** Three lobes around a hub. The bonfire sits in the hub; each lobe is a branch, one holds the sanctum, one the exit, one a reward. Hosts figure8 (two lobes as loops), comb.

```
...###...
..#####..
...#C#...
....#....
.##B###..
###S#E##.
.##...##.
.$#...#..
```

## 6. Pairing shapes and archetypes

| Shape | Best archetypes | Why they fit |
| --- | --- | --- |
| Crescent | ring, switchback | the bay gives the lever chord a short cut across open water |
| Atoll | ring, twin | the ring is the route; twin splits it into two arcs that rejoin at the far pad |
| Dumbbell | figure8, twin | one loop per lobe, crossing at the bridge |
| Stepping stones | comb, maze | dead-end teeth on each stone; a maze fits the largest stone |
| Ridge | switchback, spiral | the spine is long and thin, so the route has to fold |
| Fishhook | spiral, comb | the hook wraps the centrepiece; the shank carries teeth |
| Mesa | switchback, maze | tiers carry the climb inside a small outline |
| Broken ring | maze, comb | the C body holds a maze; the gap holds the reward islet |
| Trefoil | figure8, comb | lobes are loops or teeth around a hub bonfire |

The run sequencer picks shape and archetype together from these pairs, with three rules: no shape twice in four islands, no `feeling` twice in a row, and no archetype twice in a row.

## 7. Teleporters

A teleporter is a pair of pads, a new thing kind (`pad`). Stepping on a live pad and pressing act moves you to its partner.

**As connectors.** A connector pair joins two landmasses on the critical path. It is live from the start and works both ways. `checkRoute` treats it as a route edge with a walking cost of four steps, so shortcut savings stay honest. A connector replaces a bridge where a bridge would need to cross more than two units of void.

**As shortcuts.** A shortcut pair obeys the valve rule (P2). The far pad sits on a late landmass or past the core gate; the near pad sits within four cells of the bonfire. The pair stays dark until you step on the far pad, like a stag station. From the near side the prompt reads "The pad is dark". It must save at least four steps and a quarter of the walk back, as every shortcut must today.

**As reward links.** An off-route pair carries you out to a reward islet. The islet holds a chest or collectible, and its return pad lands you back near where you left. Hades' doors show their reward; this pad shows its islet from the junction (the vista rule in `docs/LEVEL-DESIGN.md`).

**Rules.**

- At most three pairs per island, and at most one of each role. Teleporters first appear on the third island of the run, as a connector, so you learn the pad before it matters.
- An arrival pad faces the landmass you left and keeps a sightline to it, so the map stays in your head.
- No pad may reach the sanctum's side of the core gate before the gate opens. `checkRoute` already checks that the gate's far side stays out of reach with everything shut; pads join that graph.
- Traps (`docs/TRAPS.md`, placement rule 1) gain two exclusions: no trap cell on a pad or within two cells of an arrival pad, and no trap whose worst state blocks the only walk to a connector pad. A trap may guard the walk to a shortcut or reward pad; the risk is the price of the shortcut.
- A dark shortcut pad counts as shut when traps run their worst-state check.

## 8. Shortcuts

Shortcuts come from a deck, and their placement follows the route, not the frame.

1. **Kinds.** door, ladder, drop, lever gate, teleporter, and lowered plank (a bridge you kick down from the far side). An island draws two or three.
2. **Far end by walking distance.** Measure the critical path from the bonfire. The first shortcut's far end sits between 40 and 60 percent of that walk; the second between 75 and 95 percent; a third, when drawn, past the core gate. Today all three far ends sit within nine cells of the bonfire.
3. **Near end spread.** The near end lies within six steps of the bonfire, and two near ends keep four cells between them. A shape with a second rest point may put a near end at its own small landing.
4. **Off-route shortcuts pay.** When reaching a shortcut's far end costs a detour of six or more steps off the critical path, the detour must end on a reward: a chest, a collectible, a lore marker or a vista lookout. Reward value grows with detour length. The reward stands where you can see it from the junction.
5. **Run deck.** Across the twelve islands each kind appears four to eight times, no two neighbouring islands share the same kind set, and the door stops being universal.
6. **Metadata.** `route.shortcuts` lists whatever the island drew, with `kind`, `far`, `near`, `detour` and `reward`, so traps and QA keep working on the graph.

## 9. The centrepiece

The artwork figure becomes the sanctum module: the watcher, the gate, the dais loop and the artwork's copied core decor, stamped as a unit at one of the shape's centrepiece slots, with a rotation that faces its gate toward the route's approach.

- Slots vary by shape: a horn tip, a lagoon islet, a ridge bend, a mesa crown, a lobe. The run sequencer makes sure no more than three islands put the sanctum in the same ninth of their bounding box.
- The sanctum offers three dais forms (C, U and half spiral) so the climb around the figure changes too.
- The vista rule stays: the bonfire, the chest and the gate threshold keep a clear line to the figure. A slot that cannot satisfy it from the bonfire fails the shape transform.
- `placeDecor` keeps copying the artwork's decor around the lead, now relative to the sanctum's slot and rotation instead of the fixed `core.terrace`.

## 10. QA that guarantees variety

`tools/qa-route.mjs` gains run-level checks. Each one fails the current bake, which is the point.

| Check | Threshold | Today |
| --- | --- | --- |
| Route fingerprint, compared under all eight dihedral transforms | under 0.8 for every pair | 4 pairs at 0.83 to 0.98 once mirror is undone |
| Footprint Jaccard, best over dihedral transforms | max 0.55, mean 0.40 | max 0.86, mean 0.67 |
| Cells that are land in every run island | under 15 percent of mean island area | 46 percent |
| Path cells shared by every run island | under 10 percent of mean route | 34 percent |
| Centrepiece position, normalised to the island's bounding box | no more than 3 islands per ninth | all 12 in one cell |
| Distinct shapes in the run | 8 or more, none twice in four islands | 1 |
| Multi-landmass islands | 4 or more | 0 |
| Shortcut far ends | distinct cells in at least 10 of 12 islands per kind, and spread over at least 3 ninths of the run | door: 2 distinct cells |
| Off-route shortcuts | every detour of 6 or more steps ends on a reward | not measured |

The sheet generator behind `out/layout-variety/` becomes a QA artifact the bake writes, so a run's variety is visible at a glance.

## 11. Implementation plan

**Phase 0: measure first.** Add the dihedral fingerprint, the footprint, constant-cell and centrepiece checks to `qa-route.mjs`. Confirm they fail the current run. Stop mirroring repeated archetypes in `RUN_TOPOLOGY` as a stopgap.

**Phase 1: shape library.** Add `levels/shapes/` with the nine shapes above, a loader in `core/layout/shape.js` that rasterises masks, applies the transform and derives the corridor graph. The grid size comes from the transformed shape, capped at today's 29x37.

**Phase 2: route in shape.** Rewrite each archetype in `topology.js` as a mission graph (nodes: start, bonfire, branch, lock, gate, goal; edges with roles) and embed it on the shape's corridor graph. Move the core terrace, dais, approach and exit into a `sanctum` feature module placed at a centrepiece slot. The plaza becomes a `rest` module at the bonfire slot.

**Phase 3: shortcut deck.** Replace the hard-coded doorway, spur and chord with deck draws placed by walking-distance percentile. Add the detour and reward rule, and the plank kind.

**Phase 4: teleporters.** Add the `pad` thing to `core/interact.js`, its edge to `checkRoute` and `routeDistances`, a renderer piece, the trap exclusions in `docs/TRAPS.md`, and connector and reward links between landmasses.

**Phase 5: height and decor.** Feed shape height hints into tier assignment. Bound `growFlanks` and `fillHoles` by the shape mask. Teach the rim and pocket machines in `decor.js` about multiple landmasses.

**What goes, what changes.**

| Location | Change |
| --- | --- |
| `core/layout/plan.js` `FRAME`, `fx`/`fz`, `PZ`, `px`, `sx`, `ey`, `dy` | delete; key points come from the shape |
| `planIsland` terrace, dais, east-ring and exit roads | move into the `sanctum` module with rotation |
| `planIsland` `doorway`, `spur`, chord-to-S lever gate | delete; the shortcut deck replaces them |
| `core/layout/topology.js` `LATTICE`, `allowed`, fixed `S` and `E` | delete; the corridor graph comes from the shape |
| `ARCHETYPES` | keep the names, rewrite as mission graphs |
| `fingerprintClash` | compare under dihedral transforms |
| `core/layout/index.js` `LAYOUT_SIZE`, `routeMeta` shortcut list, `mirrorLevel` | size from the shape; shortcuts from the deck; mirroring becomes part of the shape transform |
| `core/layout/decor.js` `inCore`, `core.blocks` | relative to the sanctum slot |
| `tools/bake-layout.mjs` `RUN_TOPOLOGY` | replace with a run sequencer over shape and archetype pairs |
| `docs/LEVEL-DESIGN.md` "Frame" and "Lattice" bullets | rewrite once phase 2 lands |

## 12. Phase 0 baseline

`node tools/qa-variety.mjs` runs the section 10 checks on the run in `levels/run.json` (or a comma list of level names) without a browser, and exits 1 on any failure. `--json` prints thresholds, metrics and results; the baseline lives in `out/layout-variety/variety-baseline.json`. Every comparison takes the best of the eight rotations and mirrors, with each footprint moved to its bounding-box corner. The centre window is an 18 by 21 cell box on each island's bounding-box centre.

All twelve checks fail on the current bake:

| Check | Threshold | Baseline |
| --- | --- | --- |
| Route fingerprint, best of eight transforms | under 0.8 every pair | 4 pairs over: swallow/chimera 0.977, mindbloom/eagle 0.975, wizard/ember 0.906, gremlin/dragon 0.831; mean 0.575 |
| Footprint Jaccard, best transform | max 0.55, mean 0.40 | max 0.857, mean 0.634 |
| Centre window land Jaccard, best transform | max 0.60, mean 0.45 | max 0.954, mean 0.723 |
| Land in every island | 15 percent of mean area | 261 cells, 45.7 percent of 571.7 |
| Path in every island | 10 percent of mean route | 58 cells, 34.1 percent of 169.9 |
| Centrepieces per bounding-box ninth | 3 or fewer | 12 in the centre ninth |
| Door far ends | 10 distinct cells, 3 ninths | 2 cells, 1 ninth (12 doors) |
| Ladder far ends | 8 distinct cells, 3 ninths | 3 cells, 2 ninths (8 ladders) |
| Drop far ends | 4 distinct cells, 3 ninths | 4 cells, 1 ninth (4 drops) |
| Lever far ends | 10 distinct cells, 3 ninths | 7 cells, 3 ninths (12 levers) |
| Distinct shapes | 8 | 1 |
| Multi-landmass islands | 4 | 0 |

## 13. Phase 1: the shape library

The library is `core/layout/shapes/`, pure ES modules so the browser can load it next to the generator. It holds 36 shapes in eleven families; section 14 lists them. `node tools/shape-sheet.mjs` validates every shape and draws `out/layout-variety/shape-sheet.png` plus one panel per shape in `out/layout-variety/shapes/`. It exits 1 if any shape or the library fails.

A shape is a map of characters, one per shape unit (3 by 3 cells):

| Char | Meaning |
| --- | --- |
| `#` | land at the default height |
| `1` to `4` | land in a height zone (tier) |
| `.` | void |
| `S` | entry lift; it must sit on the rim |
| `E` | exit lift; it must sit on the rim |
| `C` | centrepiece slot; one to three |
| `B` | bonfire |
| `$` | reward slot |
| `p`/`P`, `q`/`Q`, `r`/`R` | a teleporter pair, lower case at the end nearer the bonfire |

Landmasses are the four-connected pieces of land. Each pair needs an entry in `links` with a role: `connector` (live both ways, on the critical path), `shortcut` (dark until you reach the upper-case pad) or `reward` (out to a reward islet and back). `heights` maps a zone digit to a tier range, `archetypes` lists the route archetypes the shape pairs with, best first, and `transforms` lists the allowed members of r0, r90, r180, r270, m0, m90, m180 and m270.

`validateShape` in `core/layout/shapes/index.js` rejects a shape when:

- rows differ in length, a character is unknown, or the map exceeds 12 units a side;
- it lacks exactly one `S`, `E` and `B`, or has no `C` or more than three;
- a pad has no partner, or a pair has no link;
- `S` or `E` does not touch void or the map edge, or `B` is more than two units' walk from `S`;
- any key point, pad or reward cannot be reached from `S` through land and links (dark shortcut pads open only once the far pad is reached), or the exit or a centrepiece needs a shortcut or reward link to reach;
- a shortcut's near pad is more than three units from the bonfire, or the pair saves fewer than two units of walk;
- a landmass has fewer than two units, the land totals under 30 units, or the walk from `S` through the first centrepiece to `E` runs under 8 units;
- an allowed transform puts `S` off the camera's near rims (south or east, since the camera looks from +x, +z), or two allowed transforms give the same map.

The library check wants at least 30 shapes, at least 10 with more than one landmass, at least 8 families, centrepieces in at least 7 of the 9 bounding-box ninths, and no more than a quarter of them in the centre ninth.

The generator does not read the library yet. Phase 2 places a shape, embeds the route in it and rebakes the run, and waits for Ryne.

## 14. Library contents

`out/layout-variety/shape-sheet.png` draws all 36. Each shape yields 4 to 8 variants under its allowed transforms, 194 in all. Centrepieces per bounding-box ninth, reading rows from the top: 7, 4, 5, 5, 5, 6, 2, 0, 2.

| Family | Shapes | Landmasses | Archetypes |
| --- | --- | --- | --- |
| blob | `blob-pebble`, `blob-kidney`, `blob-pear` | 1, 1, 1 | maze, ring, figure8, switchback, comb |
| ridge | `ridge-diagonal`, `ridge-peninsula`, `ridge-zigzag`, `ridge-tongue` | 1, 1, 1, 1 | switchback, spiral, comb |
| ring | `atoll-islet`, `atoll-open`, `atoll-reef`, `atoll-eight` | 2, 1, 2, 1 | ring, twin, figure8 |
| crescent | `crescent-horn`, `crescent-moon`, `crescent-bay` | 1, 1, 2 | ring, switchback, comb |
| archipelago | `arch-stepping`, `arch-chain`, `arch-scatter`, `arch-delta` | 3, 4, 3, 3 | comb, maze, switchback, twin |
| tiers | `tier-mesa`, `tier-ziggurat`, `tier-sky-shelf` | 1, 1, 2 | switchback, maze, spiral |
| hub | `hub-trefoil`, `hub-isles`, `hub-cross` | 1, 4, 1 | figure8, comb, maze |
| bridge | `bridge-span`, `bridge-split-ring`, `bridge-snapped` | 2, 2, 3 | switchback, comb, ring, twin |
| spiral | `spiral-fishhook`, `spiral-snail`, `spiral-coil` | 1, 1, 1 | spiral, comb, maze, switchback |
| twin | `twin-dumbbell`, `twin-tiered`, `twin-rings` | 2, 2, 2 | figure8, twin, switchback, ring |
| satellite | `sat-ring`, `sat-cluster`, `sat-moons` | 2, 3, 3 | maze, comb, ring, figure8 |
