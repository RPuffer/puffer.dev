# Variant A: composition transcription

The artwork is the map. Two scripts read `pipeline/seed/forest.png` and `pipeline/seed/brief.json` and write `levels/forest-a.json`; `3d/pieces/forest-a.js` builds the new props in code. The run spent $0.82, all on critic calls, and no generative image or mesh calls.

## Commands

```sh
node pipeline/a-transcribe/regions.mjs [art.png] [brief.json] [--out regions.json] [--debug out/forest-a-regions.png]
node pipeline/a-transcribe/build-level.mjs [--regions pipeline/a-transcribe/regions.json] [--name forest-a]
sh tools/serve.sh
export PP_PROFILE=.pp-profile-a
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=forest-a&hero=0" out/forest-a-351.png 351 390
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=forest-a&hero=0" out/forest-a-900.png 900 800
node pipeline/critic.mjs out/forest-a-351.png --annotate out/forest-a-critic/rN-351.png --out out/forest-a-critic/rN-351.json
node tools/smoke.mjs "http://localhost:8765/3d/index.html?level=forest-a"
```

Both scripts take any artwork and brief. `--name` changes the level name and the pieces module path together.

## regions.mjs

It measures the drawing with sharp and does not call a model.

- Mapping: each cell reads the artwork the way the isometric camera sees the level. Lateral position (x - z) spans the artwork width, and depth (x + z) runs from the top of the artwork at the back corner to its bottom at the front corner. The script finds the horizon at the steepest drop in row luminance (0.619 on the seed). Cells shallower than depth 0.35 sample the band above the horizon; deeper cells invert a mild perspective (t^0.8).
- Per cell it records mean luminance, horizontal and vertical gradient energy, a vertical-stroke score for trunks, and ground darkness under the column.
- Figure: a swirl map (strong gradients in both axes) thresholded at the top 14% gives the fire-bird blob, bbox 0.29..0.83 x 0.43..0.90 of the artwork. The script walks the leg strokes down to the foot at (0.548, 0.814), maps it to a cell, and centres the 2x2 footprint there (anchor 11,8). The tail blob, the part right of the body centroid, places the flame wisp at 12,5.
- Outline: a superellipse over the grid (exponent 2.2, keep radius 0.95) minus 0.5 times each cell's normalised luminance decides void, so the pale mist at the drawing's edges bites into the rim. Cells with fewer than two land neighbours drop to void, and only the component holding the bird survives.
- Heights (0 to 3): 0 is void. Dark, trunk-striped cells within 0.2 of either side become walls at h2, and trunk-striped cells above the horizon become a back shelf at h2. An h2 cell with three or more h2 neighbours rises to h3, which gives the terraces. The knoll is a 4x4 plateau at h2 around the bird's 2x2, with a mossy mound built into the bird prop.
- Path: a least-cost route runs from a rim cell below the horizon, at least 5 cells from the bird, to a cell beside the knoll over bright, low-edge cells. It then grows into neighbours above the 58th percentile of path score, in front of the bird only.
- Motifs: trunks on walls and on vertical-stroke cells above the horizon, mist on bright cells above it, logs where vertical gradient dominates on the left, and roots on other dark, busy ground.

The debug image `out/forest-a-regions.png` draws each cell's sample box on the artwork.

## build-level.mjs

It loads the pieces module in Node to register its catalog, then places, in order:

1. The fire-bird, and a stone ramp from the path up onto the knoll.
2. Canopy trees: round or pine, up to the brief's 25% share times 24 cells, spaced at least 3 cells apart, never with void on their camera side.
3. Chunky bare trunks on 75% of inner-edge wall cells and 55% of the rest.
4. The wisp, up to three fallen logs, roots and mist.

`--lean` also places the leaning trunk, which the default run omits (see the loop history).

Spawn goes on the path cell nearest the front centre. A repair loop turns a cell into a stone ramp wherever a walkable component cannot reach spawn. It drops components of 4 cells or fewer to void, or plants a trunk when nothing else fits. It then runs `checkLevel` from core/procgen.js and `prepareLevel`. It reports the procgen-only rules (grass share 0.25 to 0.45, one h3 plateau) and does not apply them. It sets `view` with `frameView`.

Palette: the brief's dusk translation moved 45% toward the pack hexes for grass, sand and the tree greens, 35% for cliffs and 30% for stone, wood and rock. The path uses a pale warm dirt, and only the background stays dark (`#1c222b`).

Final level: 16x12 with 72 void, 87 h1, 28 h2 and 5 h3 cells. Spawn 8,11, one knoll ramp at 10,10, and all 94 walkable cells reachable. Decor: fire-bird 1, tree-round 4, bare-trunk 14, flame-wisp 1, fallen-log 3, root-tangle 14. No mist-bank survives, because the bright cells that carry mist became void at the rim.

## Props (3d/pieces/forest-a.js)

| Type | Height | Notes |
| --- | --- | --- |
| bare-trunk | 2.5 | 2 or 3 stacked box segments (0.34, 0.28, 0.23 wide), root blocks, stubby branch blocks with an upturned tip, pale cut top; 3 variants |
| leaning-trunk | 2.4 | same trunk tilted 0.3 rad off a wide root socket; placed only with `--lean` |
| root-tangle | 0.3 | passable knot with 3 or 4 arched roots |
| fallen-log | 0.5 | bark cylinder, pale end, moss slabs, one stub |
| mist-bank | 0.1 | passable flat pale slabs at 50% opacity, kept out of the merged mesh |
| flame-wisp | 0.8 | two flat flame shapes with dot eyes |
| fire-bird | 3.0 | 2x2, mossy mound, flat extruded flame shapes in three hot tones: legs, body, wing, tail tongues, neck flame, head, pale beak, eyes, crest |

Colours come from the level palette (`bark`, `rootWood`, `mist`, `spirit`, `ember`, `flame`, `beak`, `spiritEye`) with built-in fallbacks.

## Loop history

| Round | 351 high/med | 900 high/med | Fix after the round |
| --- | --- | --- | --- |
| 1 | 0/1 | 1/1 | Stone ramps replace smooth grass slopes, log raised and thickened, path mottle toned down |
| 2 | 1/0 | 0/0 | Cleared trunks around the leaning trunk (clip); bird raised to 3.0; wisp moved to a cell no taller cell hides |
| 3 | 1/0 | 0/1 | Leaning trunk turned toward the clearing and wider clearing on its screen line; path stops at the bird's feet |
| 4 | 2/0 | 0/0 | Leaning-trunk clearing widened again; the bird's 2x2 pedestal knoll replaced by a mound inside the prop (foot over the edge) |
| 5 | 0/2 | 0/1 | Added the brief's round trees on inner wall edges for pack variety |
| 6 | 0/1 | 0/0 | The coordinator's review asked for the pack's look: carved outline and terraces, chunky trunks with canopies, flat translucent mist, a lifted palette |
| 7 | 1/0 | 0/0 | Leaning trunk clipped the rim; compared rotations, kept rot 0, added a root socket |
| 8 | 0/0 | 1/0 | Leaning trunk reads as sinking; socket widened to 0.5 |
| 9 | 0/0 | 1/0 | Same flag; moved the leaning trunk off the rim into the clearing |
| 10 | 0/0 | 1/0 | Same flag; tilt reduced to 0.3 rad on a 0.6-wide socket |
| 11 | 0/0 | 0/0 | None |
| 12 | 0/0 | 0/0 | Raised more h3 terraces (h2 cells with three h2 neighbours), which changed the level, so the loop restarted its count |
| 13 | 0/1 | 0/0 | Medium: the bird reads as a flat billboard |
| 14 | 0/1 | 1/0 | Leaning trunk flagged a fifth time; the default run now leaves it out |
| 15 | 0/1 | 0/0 | None |
| 16 | 0/0 | 0/0 | Stopped: no high item in two consecutive passes |

Before round 1 the author fixed three faults by eye that the critic never saw: flame shapes built upside down under the terrain, a row-by-row artwork mapping that put the walls in front of the camera, and a path that covered half the floor.

Remaining critic mediums: the fire-bird reads as flat stacked shapes, which is what the brief asked for, and one stone ramp juts from the pale path edge.

## Walk check

`tools/smoke.mjs` on `?level=forest-a`: start 8,11, W to 8,9, D to 9,9, S to 9,11, A to 6,11. The centre tap lands on void and leaves the hero in place. From 9,10, two D presses climb the knoll ramp at 10,10 onto the plateau at 11,10 (y 2).

## Outputs

Final renders are `out/forest-a-351.png` and `out/forest-a-900.png`. Critic reports and annotated images are in `out/forest-a-critic/`, and the region debug image is `out/forest-a-regions.png`.
