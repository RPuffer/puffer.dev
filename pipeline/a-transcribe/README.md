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

## Round 2: concept levels

Each concept brief runs through the same two scripts. `regions.mjs --concept <name>` reads `pipeline/seed/concepts/<name>.json` as a plan (grid cell `[z][x]` is level cell `x,z`) and writes `pipeline/a-transcribe/regions-<name>.json`. `build-level.mjs --concept <name>` hands the brief to `concept-level.mjs`, which writes `levels/forest-a-<name>.json`. It applies everything the brief says: palette translation and lighting tint, light and bg, surfaces (`biome.surfaces`), plateau share, motif cells, tree density and types, decor density and weights, water with waterfalls, and the bird at the focal cell. The literal `forest-a` build is unchanged.

Commands for one concept, from the repo root, with the server running (`sh tools/serve.sh`). Replace `NAME` with `scene`, `biome`, `motif-remap` or `composition-only`, and `R` with the round number.

```sh
export PP_PROFILE=.pp-profile-NAME C=NAME
node pipeline/a-transcribe/regions.mjs --concept $C
node pipeline/a-transcribe/build-level.mjs --concept $C --props
```

Write `3d/pieces/forest-a-$C.js` for the listed types, following `pipeline/a-transcribe/props.md`. Then build, render and critique:

```sh
node pipeline/a-transcribe/build-level.mjs --concept $C
mkdir -p out/forest-a-$C
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=forest-a-$C&hero=0" out/forest-a-$C/rR-351.png 351 390
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=forest-a-$C&hero=0" out/forest-a-$C/rR-900.png 900 800
node pipeline/critic.mjs out/forest-a-$C/rR-351.png --annotate out/forest-a-$C/rR-351-ann.png --out out/forest-a-$C/rR-351.json
node pipeline/critic.mjs out/forest-a-$C/rR-900.png --annotate out/forest-a-$C/rR-900-ann.png --out out/forest-a-$C/rR-900.json
```

Read both PNGs and the annotated copies, fix the pieces module (or the brief-reading scripts, if the fault is general), rebuild, and repeat for up to four rounds. Stop after two consecutive rounds with no agreed high item. Then check the walk and save the final render:

```sh
node tools/smoke.mjs "http://localhost:8765/3d/index.html?level=forest-a-$C"
node tools/qa-levels.mjs http://localhost:8765 forest-a-$C
cp out/forest-a-$C/rR-900.png out/final/forest-a-$C.png
```

Log every analyze and critic run in `pipeline/a-transcribe/SPEND.md` from the `spend:` lines. Commit `levels/forest-a-$C.json`, `3d/pieces/forest-a-$C.js` and `pipeline/a-transcribe/regions-$C.json`.

The five briefs are already committed. Regenerate one only if you change its fragment in `pipeline/analyze.mjs`: `node pipeline/analyze.mjs pipeline/seed/forest.png --concept $C` (about $0.03 a call).

### pack-first result

`levels/forest-a-pack-first.json`: 16x12, 127 land cells (93 h1, 32 h2, 2 h3), spawn 8,10, five stone ramps, all 94 walkable cells reachable. Decor: fire-bird, 12 pack trees (6 pine, 6 round), 3 bare trunks, 3 root tangles, 1 fallen log, 2 mist wisps, and pack scatter (7 bushes, 6 flowers, 3 rocks, 3 mushrooms, 2 coins). Palette is the pack's own, lit at ambient 0.92, sun 0.18, on `#3b3d42`. `3d/pieces/forest-a-pack-first.js` reuses forest-a's bird, trunk, roots and log in the brief's pack tones and adds a two-lobe `mist-wisp`.

| Round | 351 high/med | 900 high/med | Fix after the round |
| --- | --- | --- | --- |
| 0 (by eye) | | | Trees hid the bird; void holes inside the island; one flat slab. Added the bird's clear ring, filled small unreachable pockets from their neighbours, grew terraces to `plateau_share` |
| 1 | 0/0 | 0/0 | None |
| 2 | 0/0 | 0/0 | Stopped: two clean rounds |

`tools/qa-levels.mjs`: 14 pass, 0 fail, including the ramp climb from 8,10 to the h3 cell at 3,3. Final render: `out/final/forest-a-pack-first.png`.

## Round 3: one artwork, three scene readings

Each artwork agent runs this sequence from the repo root with the server up (`sh tools/serve.sh`). The briefs `pipeline/seed/concepts/<slug>-1..3.json` are already committed; do not regenerate them. Set `S` to your slug (`dragon`, `ember`, `chimera`, `wizard`, `swallow`, `cosmos`, `sharkbear`, `gremlin`, `mindbloom`, `eagle`).

1. List the new prop types all three briefs need:

```sh
export PP_PROFILE=.pp-profile-$S
for k in 1 2 3; do node pipeline/a-transcribe/build-level.mjs --art $S --brief pipeline/seed/concepts/$S-$k.json --level $S-$k --pieces $S --props; done
```

Each line names a type, its role (`lead`, `threshold`, `dais`, `light`, `offering`, `mass`, `detail`), footprint, height and the brief's one-line shape.

2. Write `3d/pieces/$S.js` by following `props.md`. Copy the structure of `3d/pieces/cat.js`: `register(style)` builds the catalog from `style.palette.props` and picks a builder by role, so one module covers all three briefs. Export `finish(level, brief, h)` and place the threshold, lights and path through the helpers; never edit a level file by hand.

3. Build, render and critique each level, up to four rounds, stopping after two rounds in a row with no agreed high item (`R` is the round):

```sh
for k in 1 2 3; do
  node pipeline/a-transcribe/build-level.mjs --art $S --brief pipeline/seed/concepts/$S-$k.json --level $S-$k --pieces $S
  for sz in "351 390" "900 800"; do set -- $sz
    node tools/shot.mjs "http://localhost:8765/3d/index.html?level=$S-$k&hero=0" out/$S-$k/r$R-$1.png $sz
    node pipeline/critic.mjs out/$S-$k/r$R-$1.png --annotate out/$S-$k/r$R-$1-ann.png --out out/$S-$k/r$R-$1.json
  done
done
```

The build must end with `PASS: checkLevel + prepareLevel clean` and `reach N/N`. Read every PNG and annotated copy yourself before you trust the critic; fix faults in `3d/pieces/$S.js`, then rerun the loop.

4. Check the walk and save the final renders:

```sh
node tools/qa-levels.mjs http://localhost:8765 $S-1,$S-2,$S-3
for k in 1 2 3; do node tools/shot.mjs "http://localhost:8765/3d/index.html?level=$S-$k&hero=0" out/final/$S-$k.png 900 800; done
```

5. Log each critic run's `spend:` line in `SPEND.md` under your slug, then commit `3d/pieces/$S.js`, `levels/$S-1.json`, `levels/$S-2.json`, `levels/$S-3.json` and `pipeline/a-transcribe/regions/$S-*.json`.

### Script flags

- `analyze.mjs <art.png> [brief.json] [--concept scene] [--variant 1|2|3] [--avoid a.json,b.json]`: `scene` is the default. Variant 1 reads the creature's home (terraces to a height 3 perch, a winding path, warm midday), variant 2 a shrine (a pool of 12 to 24 water cells, an axial causeway, dusk or night), variant 3 an encounter (a flat arena walled by height 3 cliffs, a diagonal path from a near corner, golden hour or a strange sky). `--avoid` hands the named briefs' `scene` summaries and motif names to the model as readings to steer away from. With `--variant` and no output path the brief lands at `pipeline/seed/concepts/<slug>-<k>.json`. Each brief carries a `scene` block: place, approach, creature_doing, palette_key, terrain, summary.
- `regions.mjs --art <slug> --brief <path> [--out ...]`: reads `pipeline/seed/<slug>.png`, writes `pipeline/a-transcribe/regions/<brief>.json` and `out/<brief>/regions.png`. Round 3 briefs describe an invented place, so the artwork's luminance no longer bites the rim.
- `build-level.mjs --art <slug> --brief <path> --level <name> --pieces <module>`: reruns `regions.mjs` first, then builds `levels/<name>.json` with `3d/pieces/<module>.js`. `--props` lists the new types; `--no-finish` skips the module's `finish`.

### Finish helpers

When the pieces module exports `finish(level, brief, h)` with at least one parameter, `concept-level.mjs` calls it after layout, then repairs terrain and decor and reframes the view. The helpers in `finish-helpers.mjs`:

| Helper | Does |
| --- | --- |
| `h.approach()` | cells from spawn to the ring around the creature, preferring path cells and straight runs; steps of one height become stairs |
| `h.path(cells, {s})` | paints the cells with the path surface, clears blocking props, and turns each one-height step into a stone ramp when the path runs straight through it |
| `h.stairs(x, z, d)` | makes a stone ramp at a cell, down toward `d` |
| `h.plateau(x0, z0, x1, z1, {h, s})` | raises or lowers a rectangle of land to one height and surface |
| `h.dais({ring, h, s})` | flattens the creature's cells and a ring around them to one stone platform |
| `h.gate(type, {route, frac})` | sets a pair of posts astride the approach near `frac` of its length, two cells clear of the creature when it can; levels or builds up a flank cell when that is the only way; posts get `side` and `axis` for the lintel |
| `h.lights(type, {route, every, max, keep})` | lanterns or torches beside the approach, never next to a ramp or within two cells of the creature |
| `h.put(type, x, z)`, `h.clear(x, z)`, `h.removeDecor(pred)` | direct placement |
| `h.ofRole(role)`, `h.role(type)` | new types by role from the brief |
| `h.repair({keep})` | removes the fewest props that restore full reachability, never the creature or `keep` types |

Every helper that places a prop checks reachability and undoes itself if the prop would cut the island.

### cat result

`3d/pieces/cat.js` builds the cat from about 35 flat blocks, wedges and four-sided pyramid ears in the painting's fauvist colours (magenta, yellow, orange, blue-violet, teal), seated on a plinth in the brief's dais tones, 2.6 tall, facing +z with the head turned 0.38 rad toward the camera. Threshold posts, lanterns, offerings and spires come from the same role builders in each brief's tones.

| Level | Reading | Land h1/h2/h3 | Critic highs by round (r1..r4, final) |
| --- | --- | --- | --- |
| cat-1 | Sun-Perch garden terrace, the cat basking on a cushion at midday | 23/8/23 | 0, 0, 0, 0, 0 |
| cat-2 | Moon-Mirror water shrine at night, the cat keeping vigil beyond a causeway and torii | 74/24/0, 16 water | 0, 0, 0, not run, 0 |
| cat-3 | Howling Caldera boss arena at golden hour, the cat hissing between bone fangs | 73/37/3 | 0, 1, 0, 0, 0 |

The one high (cat-3 round 2) was a torch beside a ramp, which the critic read as standing on it; `lights` now skips cells beside ramps. Every round flagged the cat's saturated colours as a medium palette clash; the brief asks for the painting's fauvist colours, so the cat keeps them. cat-1 has the smallest island (46 walkable cells) because its brief grid holds 70 land cells. `tools/qa-levels.mjs cat-1,cat-2,cat-3`: 42 pass, 0 fail. Final renders: `out/final/cat-1.png`, `cat-2.png`, `cat-3.png`.
