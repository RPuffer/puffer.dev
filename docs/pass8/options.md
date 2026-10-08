# Pass 8 options: beam shafts and the elevator tile

Spec: `docs/PIPELINE-BRIEF.md` "## Pass 8". Island: `levels/wizard-medium-p8.json`, a copy of wizard-medium with both lifts moved onto added edge tiles. `wizard-medium.json` and every other level render as before. No spend.

Open `3d/index.html?level=wizard-medium-p8` with any mix of the two flags. Defaults: `shaft=tile`, `lifttile=a`.

## Shaft styles, `?shaft=`

One mesh and one `ShaderMaterial` per shaft, alpha-blended, `depthWrite` off, both faces drawn, depth-tested against the island (the pass-7 stencil underlay does not apply to beams). The fragment shader draws all FX; the geometry is a handful of open quads with no caps. Shared across styles:

- Forcefield idle: five rings ride up the beam. Each ring's height follows its own speed plus a sine wobble, its outline is a wave around the beam (two sine harmonics in the around-coordinate), and a slow sine gates it on and off, so rings pass at irregular gaps. Each ring has a white core and a wider cyan halo so it reads on light and dark skies.
- Scanlines and a sine shimmer, plus a bright foot where the beam meets the tile.
- Departure (role `exit`): rises 32 units from the tile top and fades with `(1 - smoothstep(2, 15, y))^2`, so it thins out well inside the 900x800 frame and leaves the top with no hard edge.
- Arrival (role `entry`): runs from 26 units below the tile up to the tile's underside. It fades in from below over 11 units. The arrival beam is narrower (0.82 tile) so it tucks inside the tile body. While a lift rides, the arrival beam's top follows the deck (`uTop`).
- Ride: rings stream at 16 units/s scaled by `uRideTime`, the same clock as the pass-7 rungs, and walls facing the camera drop to 18% alpha so the hero stays clear inside the beam.
- `hero=0` and `t=` freeze it: time comes from `motion.uTime`.

| Flag | Option | Reference | Geometry |
| --- | --- | --- | --- |
| `tile` | 1. Beam one tile wide | Square light column; edge glow on the four vertical seams, faint vertical rays inside | 4 quads |
| `rails` | 2. Two thin beams as rails | Twin rails at the tile's outer corners; a faint field membrane between them carries the rings as wavy rungs of light | 2 eight-sided tubes, 3 quads |
| `hex` | 3. Hex energy column | Halo's Covenant gravity lift, with the hexagonal shield shimmer from the same games: hex prism, honeycomb cells that flicker one by one, a thin bright core | 6 + 6 quads |

## Lift tile styles, `?lifttile=`

The tile bakes into the island's land mesh, so it adds no draw call. It uses a fixed sci-fi palette (gunmetal hull, white plate, cyan emitters, amber hazard marks) and takes no island colours; only the island's light direction shades it. The moving deck is one shared design: a white plate with a cyan border and lamp. The island's own cliff face stays whole behind the tile because terrain treats a `lift` cell as void.

| Flag | Option | How it meets the edge |
| --- | --- | --- |
| `a` | Dock block | A full-height gunmetal column down to the island's floor, butted flush to the island side. Two clamp tabs reach over the neighbour cell's top edge. Cyan strips run down the exposed faces; an amber hazard strip marks the void lip. |
| `b` | Cantilever dock | A 0.24-thick deck slab. Two diagonal struts run down to an anchor plate on the island's cliff face, with cyan bolt lamps. The hazard strip sits on the seam with the island. |
| `c` | Hover pad | An octagonal pad set 0.1 out from the edge with a gap, held by two coupler posts on the island lip and a hard-light walkway strip across the gap. Under the pad, an emitter cone with a glowing ring points down. |

## Edge-tile contract

A level declares a lift tile like this:

```json
"cells": [ ... { "h": 2, "s": "lift" } ... ],
"things": [ { "id": "e1", "kind": "elevator", "role": "exit", "x": 12, "z": 0, "rot": 2 } ]
```

- The lift cell is an extra cell outside the island footprint, surface `"lift"` (added to `SURFACES` and `WALKABLE` in `core/catalog.js`). It must touch exactly one island cell (not `none`, `lift` or `water`) on its four sides, at the same `h`, so `canStep` joins them.
- An elevator thing stands on the lift cell. `role: "exit"` gets the departure beam and `role: "entry"` the arrival beam.
- `rot` names the side facing away from the island: 0 = +z (s), 1 = +x (e), 2 = -z (n), 3 = -x (w). `prepareLevel` in `core/level.js` finds the attach side, stores it as `t.attach`, fills `rot` when the level omits it, and warns on a mismatch or on zero or two island neighbours.
- No other fields are needed, so a generator can append the cell and the thing at any edge cell whose outward neighbour is empty.
- Elevators on ordinary cells keep the pass-7 cage and rail shaft.

In wizard-medium-p8 the departure lift sits at 12,0 on the back (north) edge off 12,1, so its beam rises clear of the island. The arrival lift sits at 4,11 on the front (south) edge off 4,10, so you see its beam come up from under the island. Spawn moved to 4,10. Both elevators carry a `run` list with `wizard-medium-p8` in wizard-medium's slot, so rides link cat-medium, wizard-medium-p8 and swallow-medium.

## Checks

- `PP_PROFILE=.pp-profile-p8 node tools/qa-levels.mjs http://localhost:8765 wizard-medium-p8`: 20 pass, 0 fail, 0 skip. `shaftSuite` now accepts an arrival beam whose top stays on screen (NDC y -0.32 at 900x800) and still requires the departure top off frame (2.59 at 900x800, 1.44 at 400x800).
- Ride with `PP_PROFILE=.pp-profile-p8` (`out/pass8/ride.mjs`): cat-medium exit to wizard-medium-p8, landing on the arrival tile at 4,11, then the wizard-medium-p8 exit at 12,0 to swallow-medium. Both rides land with 0 page errors. Frames and log are in `out/pass8/ride/`.

## Draw calls and perf

`tools/perf.mjs`, swiftshader, 900x800, dpr 1, 150 frames, billboards.

| Case | ms (median) | calls | tris |
| --- | --- | --- | --- |
| wizard-medium play, pass-7 rails | 24.9 | 18 | - |
| wizard-medium-p8 play, `tile` | 24.4 | 18 | 17125 |
| wizard-medium-p8 play, `hex` | 24.4 | 18 | 17097 |
| wizard-medium hold, pass-7 rails | 12.5 | 26 | 2040 |
| wizard-medium-p8 hold, `tile` | 15.8 | 26 | 1572 |
| wizard-medium-p8 hold, `rails` | 15.3 | 26 | 1632 |
| wizard-medium-p8 hold, `hex` | 15.8 | 26 | 1604 |

Each beam replaces the old shaft mesh one for one, so draw calls match pass 7. The hold costs about 3 ms more on swiftshader because the beam covers a large part of the screen with blended pixels, and swiftshader pays per pixel on the CPU. The render loop allocates nothing per frame; per-shaft state is two uniforms (`uOn`, `uTop`).

## Media, `out/pass8/`

- `shaft-{tile,rails,hex}.png`: each shaft style with tile a, `hero=0`, 900x800.
- `tile-{a,b,c}.png`: each tile style with shaft `tile`.
- `close-{a,b,c}.png`: close-ups of the arrival tile at 4,11, clouds off, zoom 260.
- `hold-{tile,rails,hex}-wizard-900x800.png`: the frozen ride hold for each shaft.
- `shaft-{tile,rails,hex}.mp4`: 4 s idle clips.
- `options-sheet.jpg`: four rows: shaft styles, tile styles, close-ups, holds.

## Unfinished

- No fortress Review Queue card yet.
- The departure tile sits on the back edge, so the island hides its body; the close-ups show the front arrival tile only.
- At the `tile` hold a passing ring can cross the hero's head for a few frames.
- Beam colour is one cyan for every island. On wizard's cream sky the rings rely on their cyan halo; dark-sky islands are untested.
