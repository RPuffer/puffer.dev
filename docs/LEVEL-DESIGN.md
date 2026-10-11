# Level design: route first

An island is a trip, not a scatter. The generator draws the route, then grows land and decor out from it. The numbered practices (P1 to P7) refer to `docs/procgen-research.md`.

Code: `core/layout/` (browser-safe generator), `3d/pieces/kits.js` (decor kits), `tools/bake-layout.mjs` (writes `levels/*.json`), `tools/qa-route.mjs` (proof).

## Route grammar

The current grammar is `hub-and-ring`: the artwork core sits in the middle, the route runs a ring around it, and shortcuts cut back across the ring (P2).

- **Spine.** Entry lift, bonfire plaza, outer road, north road, the core gate, the core terrace, the dais climb, the exit causeway, exit lift. Drawn first (P1). Every other piece must leave it intact.
- **Core.** The transcribed drawing keeps its figure, tower and spires as the landmark. The spine approaches it, passes the watcher gate, circles it on the terrace (a C, sealed at one corner by the tower and at another by two spires), climbs to the dais and circles the figure three quarters of the way before it leaves.
- **Loops.** Each loop is two arcs between the same two nodes. The outer road and the chord form one; the terrace and the dais form another; each shortcut closes a third through the core.
- **Shortcuts** (Dormans' valves, P2). Each one joins a late cell (far side) to a cell near the bonfire (near side) and works one way until the player opens it from the far side:
  - *Door*: shuts an edge; only the far cell can open it. From the near side the prompt reads "Try the door".
  - *Ladder*: links a cliff top to the cell two or more tiers below once kicked from the top. A *drop* links top to bottom only, for good.
  - *Lever*: a gate elsewhere whose `open` is `lever:<id>`. The existing gate code lifts it.
- **Gates.** The watcher gate is the only way onto the core before any shortcut opens. Lever gates sit on a chord near the bonfire.
- **Bonfire.** In the plaza, within three cells of spawn and at least three from any lock, so the walk home always ends somewhere you can see.
- **Vistas.** The bonfire, the north peninsula pad and the gate threshold each keep a clear sightline to the core figure: no decor taller than 1.2 on that line.

## Feature modules (P3)

A module is a hand-made piece the plan stamps onto the grid. `core/layout/features.js` holds each module's contract:

| Field | Meaning |
| --- | --- |
| `build(params)` | Returns cells `{x, z, h, s, d, path}`, a flank radius and `attach.in` / `attach.out` points |
| `role` | `route`, `shortcut`, `branch` or `flank` |
| height rule | Heights change only through a ramp with a flat landing on each side |
| `valid(G, piece)` | The module's own checks, re-run after the whole island is built |

Modules shipped: `road`, `plaza`, `dock`, `causeway`, `spur`, `peninsula`, `hill`, `lookout`, `alcove`, `inlet`. Rules worth knowing: a dock or causeway ends on the lift tile and nothing else may touch that tile at its height; a spur needs a cliff of two tiers under its tip.

The last four are late modules. They grow onto the island after the flanks, the separation pass and the things, and each one has a `site(G, ctx, opts)` that lists every legal placement. The generator shuffles the list, tries the best scores first, stamps one, re-runs its `valid` and rolls the grid back on any problem. `ctx` carries the walking distance from the path and an avoid set: two cells around every thing, lock and lift, one cell around the core terrace and the plaza, every sightline cell and every cell of an earlier feature.

| Module | Shape | Rule |
| --- | --- | --- |
| `hill` | a box, 3x2 by default, grown out over the drop | one tier above the land it leans on, no ramp, level with no land or path; at least two cells from the path so a tall landmark fits; the decor pass covers every cell |
| `lookout` | a 4x3 pad over the drop plus one ramp | one tier above the land it leans on, reached by a ramp whose foot sits on that land; a dead end that holds a reward |
| `alcove` | a one-wide neck and a 3x3 room off a road's flank | the room hangs over the drop at the road's height; only the neck touches the island, so the room reads as its own place |
| `inlet` | a 2x3 bay of water cut from the rim | never on a path cell, never beside a ramp or lift; it breaks a straight shore and gives the decor pass a bank |

A seed names its features as a recipe in `tools/bake-layout.mjs` (`features: "showpiece"` or a list of `[module, opts]`). `RECIPES` in `core/layout/index.js` holds the named ones. Every wizard seed places a hill; r1 places all four.

## Land grows from the route

Flanks grow outward from each path cell, one to three cells deep, at the owner's height. Two flanks may touch only when their segments link without a lock. Where they would touch across a lock, the generator cuts the cell to air or a pond (P5). Small enclosed holes become ponds.

## Decor reads the route

`core/layout/decor.js` places decor in a fixed order of rules, `MACHINES`, each a small Brogue-style machine: a context the route defines, a choice from a pool of kits, a budget. The kit pool works like Spelunky's room templates and Dead Cells' hand-made chunks (P3): each kit is built by hand once, and the rule only decides where it goes.

1. **Anchors.** The core figure, its tower and spires, and the core's own decor copied from the artwork level.
2. **Locks.** One lamp beside every lock and the bonfire.
3. **Features.** Each late module gets the kit it was grown for. A landmark kit covers a hill. A reward kit sits on a lookout and in an alcove, clear of the ramp landing and the neck. A landing kit stands on an inlet's bank, facing the water. Waymarks flank the foot of a lookout's ramp and the entry to an alcove.
4. **Shortcuts.** A landmark within four cells of each shortcut's far end, so the player remembers where it opened; a waymark beside the near end.
5. **Approach.** An avenue of waymarks on both shoulders of the road into the core gate, every second cell. Waymarks are 1.2 tall, so the view of the core stays open.
6. **Turns.** A kit on the outside of a route turn: a tall landmark when there is room two cells back, low set dressing on the shoulder otherwise. At most five, six cells apart.
7. **Gateways and rhythm.** A pair of waymarks where a spine road leaves a junction, and one waymark on alternating shoulders every third cell of a straight run.
8. **Pockets.** Off-path land two or more cells from the path splits into pockets. The two largest get a camp; the rest get groves: one tall piece, mid pieces in the ring around it, low rocks at the edge. Groves sit five cells apart and stay three cells from any landmark.
9. **Rim.** At most six tall spires, on convex corners of the rim only, five cells apart.
10. **Shoulder.** Now and then a rock or star on a cell beside the path, where noise is high.

Every rule yields to the route (`YIELD`):

- No decor on a path cell, passable or not.
- No decor on a ramp landing, at either end of a door, gate or ladder, on an alcove's neck, or on the lane from a feature's entry back to the path.
- A cell beside the path takes only low decor (height 1.2 or less).
- Tall decor stays two cells or more from the path, off every sightline, and two cells from a feature's entry.
- The plaza stays open ground, and no multi-cell kit stands within two cells of a lift.
- Two lights (waymark, lamp) never stand on neighbouring cells, so pairs read as pairs.

Cells the route can never reach get filled with rock, unless a kit already covers them.

## Decor kits

A kit is one multi-cell prop with a cell mask, built once on `3d/prims.js` and placed as a unit. `3d/pieces/kits.js` holds the library; `?level=kits-showcase` lays it out. Each catalog entry carries a `kit` block the layout reads:

| Field | Meaning |
| --- | --- |
| `slots` | where it may go: `hill`, `turn`, `shortcut-far`, `reward`, `pocket`, `rest`, `bank`, `rim`, `approach`, `frame` |
| `dist` | nearest path distance, min and max, over its footprint |
| `face` | `path`: rotate so the front (local +z) faces the nearest path cell or the feature's entry |
| `max` | per-island budget, so no kit becomes the new scatter |
| `theme` | the island set it belongs to; `palette.kitTheme` picks the colour table in `THEMES` |

Shipped, from one generated sheet (`pipeline/multitile/kits-sheet.png`): `star-shrine` 3x2 (landmark), `wizard-camp` 2x2 (rest), `supply-landing` 2x1 (bank, rim), `scroll-cart` 2x1 (turn, rest, approach), `rune-ring` 3x3 (reward, walk-in edges and centre) and `waymark` 1x1 (frame). Adding a kit means one entry in `KITS` with a build function, a mask and a `kit` block; the machines pick it up by slot without code changes. A later asset pass can add a theme per island and many kits per slot.

## The path tile

A cell with `p: 1` is route. The renderer draws it as cut flagstones in a darker shade of that cell's own ground (`3d/terrain.js` `WORN`: grout 0.62, stones 0.8 of the ground colour), so the route reads on any palette. Path ramps draw as a worn wedge. Path cells join edge to edge where a neighbour is also path at the same height.

## Traps attach to path segments

Each baked level carries `route` metadata: `segments` (id, role, path cells, links), `shortcuts` (kind, far and near cells) and `trapSlots`. A trap slot is a straight spine run of three or more cells with ramp ends trimmed. A trap later claims a slot by segment id, so the solvability checks keep working on the graph (P4). Traps never go on shortcut cells, ramp landings or lock cells.

## Generate and test (P6)

`checkRoute` in `core/layout/check.js` must return nothing before a seed bakes:

- lift to lift with only the core gate open;
- with everything shut, the core gate's far side and every shortcut's far side stay out of reach from the entry, and the lever stays reachable;
- each shortcut saves at least four steps and a quarter of the walk back to the bonfire;
- doors, ladders, drops and lever gates behave one way;
- path cells form one connected route and carry no decor;
- `checkLevel` and `prepareLevel` run clean, including ramp landings and the lift-on-the-rim rule.

## The run islands

All twelve islands of `levels/run.json` are route-first. `node tools/bake-layout.mjs --base run` reads each island's artwork level from `levels/base/<name>.json` and writes `levels/<name>.json`, with fixed seeds 101 to 112 so every bake is the same. Four feature recipes rotate down the run, and every third uses a one-way drop in place of the kicked ladder.

An island keeps its identity through the base level: palette, light and background, its pieces modules, its focal creature (the decor marked `watch`) as the core figure and watcher, and its chest text. `profileFor(base)` in `core/layout/decor.js` reads the rest from the island's own decor:

| Role | Pick |
| --- | --- |
| landmark | the largest themed multi-cell prop; a 2x2 one seals the terrace corner, any other size stands on a hill grown to its footprint |
| spire | the tallest one-cell piece up to 2.4, used for the terrace seals and the rim |
| lamp | a one-cell piece 0.8 to 1.3 tall whose name reads as a light, else the waymark kit |
| tall, mid, accent | grove centres, grove rings and shoulder scatter |

Kits outside the wizard set take their colours from the island palette (`themeFrom` in `3d/pieces/kits.js`). Elevators carry no `to`; the run order chains them at runtime. To rebuild an island from its artwork, run pipeline A into `levels/base/` and bake again.

## Live regeneration boundary

`core/layout/*` is pure ES modules with a seeded RNG (`core/rng.js`) and no node imports. A page can call `generateLayout(base, { seed, mirror, drop })` after `loadPieces` has registered the island's catalog, then hand the result to `prepareLevel`. The node wrapper `tools/bake-layout.mjs` only registers pieces, writes JSON and prints the shortcut distances. The fixed frame (core figure, lift edges, bonfire role) stays the same across seeds (P7).
