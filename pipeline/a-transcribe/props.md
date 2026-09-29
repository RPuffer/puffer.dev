# Writing a concept's pieces module

`build-level.mjs --concept <name>` stops and lists the brief's new prop types until `3d/pieces/forest-a-<name>.js` registers every one of them. You write that module by hand from the brief. Print the list at any time:

```sh
node pipeline/a-transcribe/build-level.mjs --concept <name> --props
```

Each line gives the type name (the motif or creature `name` in the brief), footprint, height, passable flag, count, and the brief's one-sentence shape summary. The full part list sits in `pipeline/seed/concepts/<name>.json` under `motifs[].shape.parts` and `creatures[].shape.parts`.

## Module contract

Copy `3d/pieces/example.js` for the skeleton and `3d/pieces/forest-a.js` for the forest idioms. Export `register(style)` and return `{ catalog, builders }`:

- `catalog[type]`: `{ footprint, passable, variants, height }`, plus `rotates: true` for props with a facing. Use the brief's footprint, passable flag and height. The lead creature (the one at the focal cell) always takes footprint `[2, 2]`, because `build-level.mjs` gives the bird a 2x2 anchor.
- `builders[type](variant, rot, style, ctx)`: return a `THREE.Mesh` built with `Baker` from `3d/baker.js`, base at y 0, centred on the cell, sized to `ctx.height`.

`style.palette` carries the level palette: the pack groups (`grass`, `wood`, `trunk`, `treeMint`...), the forest extras (`bark`, `rootWood`, `mist`, `spirit`, `ember`, `flame`, `beak`, `spiritEye`), and `tones[type]`, the unique `[top, left, right]` tone triples of that type's parts in brief order. Take colours from `tones[type]` first so the prop wears the concept's palette.

## Reuse before you build

`3d/pieces/forest-a.js` already builds a bare trunk, leaning trunk, root tangle, fallen log, mist bank, flame wisp and the fire-bird. When a brief type matches one of those, call forest-a's `register` with a palette override and hand its builder through, as `3d/pieces/forest-a-pack-first.js` does:

```js
import { register as forestA } from "./forest-a.js";
const trunks = forestA({ ...style, palette: { ...P, bark: P.tones["bare-trunk"][0] } });
builders["bare-trunk"] = trunks.builders["bare-trunk"];
```

A brief type named after a catalog piece (`log`, `torch`, `pot`) never reaches the module: `build-level.mjs` places the catalog piece.

## Pack style for new props

Match the reference island (`ref/reference.png`, `ref/tilesheet.png`) and the builders in `3d/pieces.js`:

- Chunky stacked blocks. Build from `B.box`, `B.rbox`, `B.cyl` with 6 to 8 sides, and `B.prism` outlines. Stack two or three segments that narrow upward instead of one long thin shape.
- Two-tone flat colour. Pass `tone(top, left, right)`; the engine shades the faces. No gradients, textures, outlines or glow.
- Trunks and posts are 0.3 tile wide at the base (forest-a uses 0.34, 0.28, 0.23 for its segments), never pencil-thin. Branches are short stubby boxes with an upturned tip block.
- Props stand 0.3 to 2.6 tall on one cell. The bird stands about 2.2 to 3.0.
- Anything flat and pale (mist, cloud) is a few low offset rounded slabs, 0.1 to 0.15 thick.
- Give most props two or three variants driven by `variant` so repeats do not clone.
- Anchor everything on the ground: no part may float or sink below y 0.

## Terrain rules the builder keeps

`regions.mjs` and `concept-level.mjs` hold the pack proportions from the second forest-a pass: an irregular island with void on every side, heights 0 to 3 with stone ramps between tiers, no tall prop with void on its camera side, and a clear ring around the bird. Your module only decides what each prop looks like.

## Check your module

```sh
node pipeline/a-transcribe/build-level.mjs --concept <name>
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=forest-a-<name>&hero=0&zoom=60&center=X,1.5,Z" out/forest-a-<name>/prop.png 700 700
```

The first command fails with `does not register: ...` if a type is missing. The second frames one prop close up: set `center` to the prop's cell. Read the PNG before you run the critic.

## Round 3: one module per artwork

`build-level.mjs --art <slug> --brief <path> --level <slug>-<k> --pieces <slug>` loads `3d/pieces/<slug>.js` for all three of that artwork's levels. The three briefs name their types differently (`chromatic-calico-cat`, `The Calico Vigil-Keeper`, `prismatic-calico-stalker`), so do not hard-code names. `style.palette.props[type]` gives each new type's `role`, `footprint`, `height`, `passable` and `variant_of`; build the catalog from it and pick a builder by role, as `3d/pieces/cat.js` does. The roles are `lead` (the artwork's creature), `threshold`, `dais`, `light`, `offering`, `mass` and `detail`. The engine hands the same palette to `register` at runtime, so the module works in the browser without the brief.

Export `finish(level, brief, h)` and do every placement fix there with the helpers listed in the README (`h.approach`, `h.path`, `h.gate`, `h.lights`, `h.dais`, `h.plateau`, `h.stairs`, `h.repair`). A rerun of `build-level.mjs` then reproduces the level. Never edit `levels/<slug>-<k>.json` by hand.

## Building the creature

The creature is the artwork's subject as a still toy figure:

- Stack flat blocks and wedges: `B.box` and `B.rbox` for body, haunches, legs, paws, head and muzzle; a wedge (a triangular prism, see `wedge()` in `cat.js`) for chests, snouts and beaks; `B.cone(r, 0, h, pal, x, y, z, 4)` for four-sided ears, horns, fins and flame tips; `B.prism` outlines for flat silhouettes. At most a few tiny boxes for eyes and teeth. No balls for bodies, no beams for limbs.
- Paint each block one flat colour from the artwork. Split the body left and right, or top and bottom, where the artwork's colour patches split; keep the artwork's saturation.
- Stand it 1.5 to 3 tiles tall on the 2x2 footprint, on its own low plinth or perch built into the prop (use the `dais` type's tones). `finish` should remove the separate dais prop, because the creature and a dais cannot share the focal cell.
- Face it +z (the cell's front, screen lower-left) and turn the head 0.3 to 0.5 rad toward +x so the camera sees it three-quarter. Round 3 builds place the creature at `rot` 0, so the pose you build is the pose on screen.
- The bird-facing trap: a builder that sets `rotation` on the mesh it returns does nothing, because the engine bakes geometry relative to the returned root. Rotate inside the `Baker` (`B.at(x, y, z, rotY, fn)`) or wrap the mesh in a `THREE.Group` and rotate a child. A flat upright silhouette seen edge-on reads as a spike; give every creature depth on both axes.

Check it close up before you run the critic:

```sh
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=<slug>-1&hero=0&zoom=70&center=X,2,Z" out/<slug>-1/creature.png 700 700
```

with `X,Z` the creature's anchor plus 1.

## Round 4: lens props

A lens brief names its props after the lens (`arc-ribbon-pylon`, `mud-cup-cluster`, `spiral-scroll-threshold`), and each motif carries a `role` the model chose: `threshold`, `dais`, `light`, `offering`, `mass`, `detail` or `approach`. `style.palette.props[type]` now also holds `summary` and `parts` (the brief's primitive list) for every new type, and `pose` (the brief's `figure_pose.pose`) for the lead creature.

Keep the round-3 creature builder and pick its pose from `props[lead].pose` as well as from the name. For the other props, match by keyword first, the way `LENS_KINDS` in `3d/pieces/swallow.js` does, and hand-build the ones that carry the artwork. Put the most specific patterns first (`midge-swarm-pylon` must reach the swarm builder before the `pylon` blade pattern). A threshold always builds as a gate post that honours `ctx.decor.side` and `axis`, whatever its name.

For any new type no builder covers, bake the brief's own parts:

```js
import { bakeParts } from "../../pipeline/a-transcribe/parts.js";
bakeParts(B, style.palette.props[t].parts, { height: ctx.height, fallback: tones[0] });
```

`bakeParts` scales the part list to the catalog height, lifts parts that dip below y 0, and draws box, rbox, cyl, cone, ball, prism and beam. Check the result close up: the model's parts often need a hand builder.

### Shapers

`brief.shaper = { name, params }` picks the island's silhouette and terracing. The builder handles all of them; your module never sees the shaper.

| Shaper | Params | Reads as |
| --- | --- | --- |
| mound | peak [x,z] 0..1, height 2 or 3, spread 0.6..1.4, lobes 0..3 | one swelling hill ringed by terraces |
| basin | wall 2 or 3, open s, e or se, pool, focal floor or wall | a bowl walled at the back, open to the camera |
| radial | rings 2..4, center, order up, down or ripple, spokes 0..4 | concentric soft terraces |
| spiral | turns 0.75..1.75, center, climb in or out, hand cw or ccw | one coiled path climbing to the figure |
| patchwork | patch 2..4, levels 1..3, holes 0..3 | rectangular colour blocks at different heights |
| ribbon | width 2..5, waves 0.5..2, rise up, down or arch, fork, from w, s or sw | one sinuous stroke of land over void |
| shards | count 3..6, spread 0..1, cracks | angular slabs split by void seams, one crossing each |
| symmetric | tiers 2..3, axis x or diag, notch 0..2 | a mirrored plan with the figure at its head |
| twin-mass | split diag, x or z, ratio, heights [a,b], bridge land or planks, focal a or b | two masses joined by a land neck or a plank bridge |

`surface_mix` (`pattern` rings, bands, patches, scatter, height, shaper or uniform; `surfaces` with shares) repaints the land after the shaper; stone stays at or under 0.2. `cliff_treatment.style` is banded, sheer, stepped, mossy or soft, with `upper` and `lower` cliff tones.

### Finish helpers added in round 4

Call them from `finishLens(level, brief, h)`; each logs to `h.log`, and every one that removes or moves land checks reach and reverts itself when it would cut the island.

| Helper | Does |
| --- | --- |
| `h.spawnAt({ min, max })` | moves `level.spawn` to a rim cell whose approach runs `min` to `max` cells, returns the route |
| `h.passes()` | resolves `brief.approach.passes` names to placeable types, in order |
| `h.along(types, { route })` | places one prop per type beside the approach, in order, spaced along it, never on a ramp |
| `h.dryRim({ void })` | turns water that touches the void into shore (or void) and drops stranded waterfalls |
| `h.ledges({ keep, tall })` | drops props with taller land on their camera side and tall props on a lip over void |
| `h.pruneRamps({ route, all, slotsOnly, nearFig })` | flattens ramps off the route, or ramps in a slot between taller flanks, or ramps beside the figure |
| `h.openRamps()` | lowers a flank that stands above a ramp's top so the wedge does not cut into a wall |
| `h.thin(min, { keep, order })` | removes blockers, farthest from the figure first, until `min` cells walk |
| `h.grow(min, { s })` | adds ground beside low land until `min` cells walk |
| `h.rampTone({ stone })` | gives each ramp the sand, grass or dirt of its uphill or downhill cell |
| `h.walkN()` | walkable cells reachable from spawn |

The swallow's `finishLens` runs, in order: `dryRim`, remove dais props, clear threshold, light and approach props, `spawnAt({ min: 9, max: 16 })`, `path`, `gate(threshold, { frac: 0.6 })`, clear the wing side of the bird, `along(passes)`, `lights(role light)`, `ledges`, `repair`, `pruneRamps` three ways, `openRamps`, then `thin` and `grow` to 84 and `rampTone`.
