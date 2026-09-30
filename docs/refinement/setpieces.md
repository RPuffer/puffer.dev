# Set pieces and the interactive layer

Every type in `core/catalog.js` is 1x1 except the 2x2 lead creature. `finishLens` (`3d/pieces/wizard.js`) calls the helpers in `pipeline/a-transcribe/finish-helpers.mjs`; `h.gate` places two 1x1 posts beside a route cell, which read as two sticks on `ember-subject`.

## Catalogue

| Piece | Effect | Mechanism |
|---|---|---|
| Wall or fence run | Encloses a yard | Edge-tagged run, 4-bit neighbour autotile (end, straight, corner, T) |
| Arch or gate | Frames the threshold | 3x1 stamp; outer cells block, centre passes, lintel at h+2 |
| Bridge span | Joins two masses | 1xN stamp over water or void; ends must sit on equal-height land |
| Tower | Landmark seen from anywhere | 2x2, height 4 to 5, attaches to a plateau corner |
| Ruin | History without text | Wall stamp, cells dropped by hash |
| Big tree | Canopy shades a clearing | Trunk blocks one cell; canopy covers 3x3 at h+2, passable below |
| Waterfall run | One fall down a cliff face | `attach: "cliff"` across N cells sharing one top edge |
| Road or cobble run | Leads the eye to the focal point | Surface along `approach()`, kerb decor |
| Shrine | Rest beat and save point | 2x2 stamp: plinth plus light; one passable front cell |
| Dock | Elevator arrival at water | 1xN, `attach: "water-edge"`, plank surface walkable |
| Market row | Life along the road | 1xN stalls parallel to the path, one cell back |

| Interaction | Effect | Mechanism |
|---|---|---|
| Cell trigger | Title card, ground message | `on: "enter"` on a cell list |
| Door or gate | Opens after the boss | Thing with `blocks` cells; `open` flag removes them from `L.blocked` |
| Chest or pickup | Resume item toast | `on: "use"` from an adjacent cell; one-shot flag |
| Dialog spot | Glizard 'Arry's one line | `on: "near"`, radius 1.5 |
| Creature | NPC or boss | Reaction radius; boss adds bar, telegraph cells, banner |
| Bonfire | Save point and menu | Respawn cell near the elevator |
| Elevator | Seam to the next island | `to` level; landing cell on arrival |

## Catalog and schema

The catalog entry grows a per-cell mask; `x,z` stays the minimum corner and `footprintCells` already rotates.

```js
"arch": decor([3, 1], false, 1, 2.6, { rotates: true,
  mask: [{ pass: false, h: 2.6 }, { pass: true, h: 0.6, over: 2.0 }, { pass: false, h: 2.6 }],
  attach: "route" }),
"canopy-oak": decor([3, 3], true, 2, 3.2, { mask: "trunk-centre", over: 2.0 }),
```

`prepareLevel` reads `mask[i].pass` over the type-wide `passable`; `over` marks geometry above head height. The 3d x-ray cuts by screen depth (`3d/renderer.js`), so spans need nothing there. `2d/renderer.js` sorts a sprite at its footprint centre, which mis-sorts the hero under a canopy; slice multi-cell sprites into per-cell columns.

Interactive features go in a new top-level `things` array, never in `decor`:

```json
"things": [
  { "id": "g1", "t": "arch", "x": 6, "z": 4, "rot": 1, "blocks": [[7,4]], "open": "boss" },
  { "id": "b1", "t": "bonfire", "x": 2, "z": 9, "on": "use", "respawn": true },
  { "id": "e1", "t": "elevator", "x": 1, "z": 9, "to": "ember-subject" }
]
```

A new `core/interact.js` watches `actor.cell` each step and emits events. Walk QA keeps passing: `validateLevel` ignores unknown keys and gates start open. `checkLevel` adds one rule: everything reachable with gates open, and the bonfire reachable with them closed. Tier 0 rail saves the `approach()` route as `rail`, with scroll driving `t` along it. Tier 1 dodge is a one-cell sidestep off the rail inside a boss telegraph window.

## Three approaches

**A. Stamps placed by finish helpers.** A set piece is a small grid of cells plus decor; `h.gate`, `h.bridge`, `h.shrine` stamp them on the route. Schema: `mask` plus `things`. Quality: high, each stamp hand-tuned. Automatic: fully, once stamps exist.

**B. Grammars for runs.** Walls, fences and roads come from a WFC or model-synthesis solve with Stålberg's Bad North heuristic, which favours tiles that keep the region walkable; trees and stalls use Poisson-disc with cluster seeds. Schema: medium, runs live on cell edges. Quality: coherent runs, weak focal hierarchy. Automatic: fully, with restarts on contradiction.

**C. Story beats.** The brief gains `beats` (arrive, threshold, rest, reward, focal, exit); a solver gives each beat a set piece and a thing, then a critic loops. Schema: largest, brief and level both. Quality: best readability. Automatic: only with a critic; Gemini is offline, so the checks below stay geometric.

## Staged plan

Start with A; B arrives in step 3; C wraps both later.

1. **Masks and three stamps.** Add `mask`, the 2d column split, and arch, bridge-span and canopy stamps; `h.gate` places the arch. Visible: `ember-subject` with an arch over the approach; `qa-levels.mjs` green.
2. **`things` and `core/interact.js`.** Bonfire, chest toast, opening gate, elevator stub. Visible: walk `wizard-medium`, open the chest, watch the gate lift.
3. **Refinement pass plus critic.** A second pass over the brief's approach and threshold lays wall and road runs (B) and one shrine, dock or market row per beat, then runs the critic. Visible: before and after sheets on a fortress pick-per-group card.

## Readability critic

- **Path:** `approach()` runs 9 to 16 cells (the `spawnAt` bounds), 70% or more on path surface, no gap wider than one cell.
- **Threshold:** the gate sits at 0.3 to 0.7 of the route, both flanks block, no taller decor covers it.
- **Focal point:** the lead sits in the screen's middle third, nothing taller stands within 2 cells in front, and spawn sees it.
- **Landmark:** the elevator shows from spawn, and the bonfire stands within 3 cells of it.
- **Occlusion:** at most 3 consecutive route cells sit under x-ray.
- **Reach:** the two-state rule above.

## Sources

- WFC README (tiled model, symmetry classes, Bad North heuristic, Townscaper): https://github.com/mxgmn/WaveFunctionCollapse
- Merrell, Model Synthesis: https://paulmerrell.org/model-synthesis/
- BorisTheBrave, constraint-based tile generators: https://www.boristhebrave.com/2021/10/31/constraint-based-tile-generators/
- Bridson, Poisson disk sampling: https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
- Tunic (camera hides paths, shrine respawn): https://en.wikipedia.org/wiki/Tunic_(video_game)
- Death's Door (doors as checkpoints): https://en.wikipedia.org/wiki/Death%27s_Door_(video_game)
- Kenney Castle Kit (CC0 modular kit; page lists no piece names): https://kenney.nl/assets/castle-kit
- `~/dev/puffer.dev-build/docs/isoworld/CONCEPTS.md`
