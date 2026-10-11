# Level design: route first

An island is a trip, not a scatter. The generator draws the route, then grows land and decor out from it. The numbered practices (P1 to P7) refer to `docs/procgen-research.md`.

Code: `core/layout/` (browser-safe generator), `tools/bake-layout.mjs` (writes `levels/*.json`), `tools/qa-route.mjs` (proof).

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

Modules shipped: `road`, `plaza`, `dock`, `causeway`, `spur`, `peninsula`, `hill` (the hub-and-ring plan does not place hills yet). Rules worth knowing: a dock or causeway ends on the lift tile and nothing else may touch that tile at its height; a spur needs a cliff of two tiers under its tip; a hill sits one tier above the land around it and may not sit level with any path cell.

## Land grows from the route

Flanks grow outward from each path cell, one to three cells deep, at the owner's height. Two flanks may touch only when their segments link without a lock. Where they would touch across a lock, the generator cuts the cell to air or a pond (P5). Small enclosed holes become ponds.

## Decor yields to the route

`core/layout/decor.js`, rules in `YIELD`:

1. No decor on a path cell, passable or not.
2. No decor on a ramp landing or at either end of a door, gate or ladder.
3. A cell beside the path takes only low decor (height 1.2 or less), and only now and then.
4. Tall decor stays two cells or more from the path and off every sightline.
5. The plaza stays open ground.

Decor lands in three intentional places: a lamp beside each lock and the bonfire, a handful of one-family groves at least six cells apart, and spires along the rim. Cells the route can never reach get filled with rock.

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

## Live regeneration boundary

`core/layout/*` is pure ES modules with a seeded RNG (`core/rng.js`) and no node imports. A page can call `generateLayout(base, { seed, mirror, drop })` after `loadPieces` has registered the island's catalog, then hand the result to `prepareLevel`. The node wrapper `tools/bake-layout.mjs` only registers pieces, writes JSON and prints the shortcut distances. The fixed frame (core figure, lift edges, bonfire role) stays the same across seeds (P7).
