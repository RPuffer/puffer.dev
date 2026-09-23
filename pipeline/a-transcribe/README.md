# Variant A: composition transcription

The artwork is the map. Two scripts read `pipeline/seed/forest.png` and `pipeline/seed/brief.json` and write `levels/forest-a.json`; `3d/pieces/forest-a.js` builds the new props in code. The run spent $0.31, all on critic calls, and no generative image or mesh calls.

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
- Heights: 1 by default. Dark, trunk-striped cells within 0.2 of either side become walls at h2, h3 at the outer corners, and trunk-striped cells above the horizon become a raised h2 shelf at the back. The knoll under the bird is a low mossy mound built into the bird prop, so the bird stands inside its cells.
- Path: a least-cost route runs from the front edge to the bird's feet over bright, low-edge cells, then grows into neighbours above the 58th percentile of path score, in front of the bird only.
- Motifs: trunks on walls and on vertical-stroke cells above the horizon, mist on bright cells above it, logs where vertical gradient dominates on the left, and roots on other dark, busy ground.

The debug image `out/forest-a-regions.png` draws each cell's sample box on the artwork.

## build-level.mjs

It loads the pieces module in Node to register its catalog, places the fire-bird, the leaning trunk (brief cell 14,3, with the trunks on its screen line cleared), round trees (the brief's 25% share, capped at 4 and spaced out), bare trunks (80% of inner-edge wall cells, 62% elsewhere), the wisp, up to three fallen logs, roots and mist. Spawn goes on the path cell nearest the front centre. A repair loop turns a wall cell into a stone ramp wherever a walkable component cannot reach spawn, or plants a trunk when no ramp fits. It then runs `checkLevel` from core/procgen.js and `prepareLevel`. It reports the procgen-only rules (grass share 0.25 to 0.45, one h3 plateau) and does not apply them, because a flat forest floor fails both by design. It sets `view` with `frameView`.

Final level: 16x12, spawn 8,11, 4 stone ramps, all 126 walkable cells reachable, decor fire-bird 1, leaning-trunk 1, tree-round 2, bare-trunk 34, flame-wisp 1, fallen-log 3, root-tangle 15, mist-bank 10.

## Props (3d/pieces/forest-a.js)

| Type | Height | Notes |
| --- | --- | --- |
| bare-trunk | 2.8 | tapered six-sided trunk, four root flares, 2 to 4 stub branches, pale cut top; 3 variants |
| leaning-trunk | 2.4 | same trunk tilted at 60 degrees of yaw |
| root-tangle | 0.3 | passable knot with 3 or 4 arched roots |
| fallen-log | 0.5 | bark cylinder, pale end, moss slabs, one stub |
| mist-bank | 0.3 | passable stacked pale-blue lozenges |
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
| 6 | 0/1 | 0/0 | Stopped: no high item in two consecutive passes |

Before round 1 the author fixed three faults by eye that the critic never saw: flame shapes built upside down under the terrain, a row-by-row artwork mapping that put the walls in front of the camera, and a path that covered half the floor.

Remaining critic mediums: the palette reads gloomy next to the reference, and bare trunks lack canopies. Both follow from the drawing and the brief.

## Walk check

`tools/smoke.mjs` on `?level=forest-a`: start 8,11, W to 8,10, D to 11,10, S to 11,11, A to 8,11, and a tap at the centre walks to 6,3. Ramp checks: from 12,2 two W presses climb the ramp at 12,1 onto the shelf at 12,0 (y 2); from 4,1 an A press climbs the ramp at 3,1 (y 1.5 mid-ramp).

## Outputs

Final renders are `out/forest-a-351.png` and `out/forest-a-900.png`. Critic reports and annotated images are in `out/forest-a-critic/`, and the region debug image is `out/forest-a-regions.png`.
