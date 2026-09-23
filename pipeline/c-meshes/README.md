# Variant C: generated meshes, procgen layout

Variant C turns the brief's props into Gemini sprites, runs the sprites through fal trellis, rebuilds each mesh as a flat-shaded low-poly GLB in the brief's palette, and lays the island out with `core/procgen.js` plus the brief's biome rules. Output: `levels/forest-c.json`, `3d/pieces/forest-c.js`, `3d/assets/forest-c/*.glb`.

## Commands

Run from the repo root with the server up (`sh tools/serve.sh`). Every script takes an optional brief path; the default is `pipeline/seed/brief.json`.

```sh
node pipeline/c-meshes/sprites.mjs --n=2 [types...]
node pipeline/c-meshes/meshes.mjs [types...] [--force]
node pipeline/c-meshes/lowpoly.mjs [types...]
node pipeline/c-meshes/layout.mjs --seeds=4,9,10,11
node pipeline/c-meshes/layout.mjs --seed=10 --write
PP_PROFILE=.pp-profile-c node pipeline/c-meshes/validate.mjs <round>
PP_PROFILE=.pp-profile-c node tools/smoke.mjs "http://localhost:8765/3d/index.html?level=forest-c"
```

| Script | Does |
| --- | --- |
| `lib.mjs` | Keychain keys, the $25 cap and ledger, the type list (`TYPES`), the 2d/gen magenta keyer |
| `sprites.mjs` | One `gemini-3.1-flash-image` call per candidate: reference, tilesheet and a crop as style images, the motif's shape summary, height, footprint and hexes, magenta background. Keys and trims into `sprites/<type>.<n>.png` and rebuilds `sprites/contact.png` |
| `picks.json` | The candidate index accepted per type |
| `meshes.mjs` | Pads the pick onto white at 1024 px, calls `fal-ai/trellis` (20/20 sampling steps, `mesh_simplify` 0.98, `texture_size` 512), writes `3d/assets/forest-c/raw/<type>.glb` |
| `lowpoly.mjs` | Parses the raw GLB. `voxel: N` in `lowpoly.json` rebuilds the type as stacked cubes instead: N cells along the longest axis, surface voxels from triangle samples, interior filled, each voxel coloured by its family vote, only exposed faces emitted. Otherwise it samples the texture per triangle, assigns each triangle to a tone family from the brief (`[top, left, right]` per shape part, or `families` in `lowpoly.json`), decimates by vertex clustering (grid shrinks until faces fall under `faces`, vertices pulled 85% toward half-cell lattice points), drops components under 8% of the largest, writes flat normals and the family's top hex as vertex colour, no texture. `alpha` writes an unlit blended material. Also writes `meta.json` with face counts and the lean vector each layout rule uses |
| `layout.mjs` | See below |
| `layout.tune.json` | Layout weights, palette additions, light split, `tileH` |
| `validate.mjs` | Renders `?level=forest-c&hero=0` at 351x390 and 900x800, runs the critic on both, logs its cost |

Every family hex passes through `liftedPalette(brief, 0.4)` in `lib.mjs`, which moves each translated hex 40% of the way toward the pack's hex for the same key (`grass.top`, `cliffUpper.left`, `trunk[0]` and so on). Hexes with no key within 40 RGB units, the flames and mist, stay as they are. `layout.mjs` writes the same lifted palette into the level, so terrain and meshes match; only `bg` stays dark.

`3d/pieces/forest-c.js` registers eight GLB types with `shade: true`, so the engine tones each face 1.0 / 0.83 / 0.67 by world normal after rotation. No type uses `flat` or `snap`. The flame wisp has a builder instead of a `glb` entry: the module top-level-awaits its GLB in the browser, scales the body to 0.55 and lifts it 0.3 above the cell, because the GLB loader drops every model onto the ground and the 3d engine ignores `floats`.

## Layout rules

`layout.mjs` calls `generateLevel(seed, { water: [0, 0], islets: [0, 0], land: [0.74, 0.82], rampMax: 0 })` for the island outline and nothing else from it. It then:

1. Flattens all land to h1 grass (brief `plateau_share` 0.02, `water_share` 0).
2. Raises a 2x3 knoll at the brief's focal cell (x 7, z 5..7), puts the fire-bird on the back 2x2 facing west, and a grass ramp (d s) on the front row.
3. Picks the front-edge cell nearest the knoll's column as the trail entry, runs Dijkstra to the ramp foot with a +4 cost per island-edge cell, paints the trail `dirt`, and spawns the hero one step in.
4. Places the flame wisp by the brief's offset from the bird.
5. Places trees up to `density x treeScale x land` (0.38 x 0.35) from the brief's weights (`tree-round` maps to the restyled `forest-tree`), scored toward the perimeter, side columns and back rows. No tall tree may sit 4-adjacent or front/back diagonal to another, beside the trail, or in the sightline from the front to the knoll. Leaning trunks only go where their lean vector points off the island.
6. Scatters decor at 0.16 per free cell from `decor_weights`: mist banks x3 in the back quarter and off edge cells, roots and logs x2.5 in the front-left, nothing on the trail.
7. Every blocking placement reruns `reachability`; `check()` fails on overlaps, decor off land, a blocked spawn, a missing bird or any unreachable walkable cell.

Seed 10 won from renders of seeds 1, 2, 4, 5, 7, 9, 10, 11: trunks wall both flanks, the knoll sits left of centre, and the trail climbs from the foreground to the bird.

## Assets

Nine types. The first pass kept one of two candidates per type. The second pass, after coordinator review, regenerated both trunks and the round tree with "built from a few stacked cubes and a straight cylinder, no fine branches, no twigs", and the roots as "two or three thick arched root segments half-sunk in the ground". Trellis refuses `mesh_simplify` above 0.98, so voxel rebuilds supply the flatter facets.

| Type | Sprite pick | Build | Faces | Read on the island |
| --- | --- | --- | --- | --- |
| bare-trunk-tall | 3 | voxel 16 | 716 | Chunky stacked-block trunk with stub branches; reads as the pack's grammar, thicker than its tree trunks |
| leaning-trunk | 2 | voxel 14 | 692 | Stacked blocks with a leaf cap; the lean barely shows |
| forest-tree | 3 | voxel 10 | 476 | Stacked-cube canopy on a one-block trunk; closest match to `tree-round` |
| root-tangle | 3 | cluster | 251 | Low arches; no longer reads as a spider |
| fallen-log | 0 | cluster | 315 | Mossy log with a pale cut end; faceted |
| mist-bank | 0 | cluster, unlit alpha 0.6, y x0.5 | 187 | Low fog |
| mossy-stump | 1 | cluster | 350 | Lumpy stump, faceted |
| fire-bird | 1 | cluster | 866 | Flame bird, orange body, gold beak, brown legs; faceted |
| flame-wisp | 0 | cluster, hover builder | 319 | Small flame hovering 0.3 above the ground |

First-pass rejections: fire-bird 0 (smooth, illustrative), leaning-trunk 0, mossy-stump 0, and near-duplicate second tries. Second-pass rejections: bare-trunk-tall 2 (thin pole), leaning-trunk 3, forest-tree 2, root-tangle 2 (four legs, still a spider).

## Loop history

Critic counts are agreed high / all items, 351 then 900.

| Round | Seed | 351 | 900 | Change after |
| --- | --- | --- | --- | --- |
| 1 | 7 | 2/2 | | Floating leaf tuft, fused trunks: dropped leaf family on trunks, component filter, tall-tree spacing, lean metadata |
| 2 | 10 | 0/2 | 1/3 | Boulder-like mist clipping a trunk: unlit translucent flattened mist; trail starts at the island edge |
| 3 | 10 | 0/2 | 0/2 | Trail "dead-ends": no tall trees beside the trail |
| 4 | 10 | 0/2 | 0/1 | Trail still ends short of the bird: knoll gets a ledge and ramp |
| 5 | 10 | 0/2 | 0/1 | Ramp read as a plank: grass ramp, recoloured mushrooms |
| 6 | 10 | 2/3 | 1/2 | Trail hugged the edge, roots on the ramp foot: edge-cost Dijkstra, no decor on the trail |
| 7 | 10 | 1/2 | 1/2 | Leaning trunk behind an upright one: lean only off-island, front/back diagonal spacing |
| 8 | 10 | 1/3 | 0/2 | The lean rule dropped the bird: restricted it to leaning trunks, bird presence check, sightline to the knoll |
| 9 | 10 | 2/2 | 1/3 of 2/3 | Mist over edge cells, steep ramp: mist off edges and knoll, `tileH` 1.0 |
| 10 | 10 | 0/2 | 0/2 | Coordinator review: lift palette, fewer and chunkier trees, new roots, hovering wisp |
| 11 | 10 | 0/2 | 0/1 | Front scatter cluttered: scatter 0.22 to 0.16 |
| 12 | 10 | 0/2 | 0/1 | Stop |

Rounds 3 to 5 cleared the stop rule; I kept going because the trail never reached the bird. Rounds 6 to 9 each fixed the last round's highs and raised new ones from the change. Rounds 10 to 12 have no high item at either size. After the lift the palette complaint dropped out. The medium that stays: the critic calls the voxel trees stepped where the pack bevels its boxes, and the path's raised border reads as an abrupt end.

`tools/smoke.mjs` on `?level=forest-c` after round 12: spawn (10,10); D moves to (13,10), S to (13,11); W and A stop at blocking decor; a tap at the centre paths to (8,4). `layout.mjs` check: 112/112 walkable cells reachable, no overlaps; the knoll ledge (7,7) at y 2 sits in that set.

Final renders: `out/forest-c-351.png`, `out/forest-c-900.png`. Annotated critic copies: `out/forest-c-r<N>-<w>-ann.png`. Reports: `critic/r<N>-<w>.json`.

## Spend

$2.385 of $25.00. See `SPEND.md`.

## Still off

- Voxel trunks run 700 faces; a greedy quad merge would cut them to a few hundred without changing the look.
- Voxel edges are square; the pack bevels its boxes.
- The bird, log and stump keep the faceted cluster look. Voxel mode would match the trees better, but it would blur the bird's silhouette.
- The leaning trunk barely leans.
