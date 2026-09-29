# isoworld

A small isometric island you can walk around in the browser, rebuilt twice from one level file to match the "Isometric TILES" promo panel in `ref/reference.png`. Both builds share `core/` (level loading, input, pathfinding, procgen) and the same controls.

- `3d/` draws flat-shaded low-poly geometry with three.js and an orthographic camera. It cost $0 in generation.
- `2d/` composites image-model sprites on a canvas in painter's order.
- `index.html` shows both side by side in iframes, with a toggle for either one alone.

## Run

```sh
npm install
sh tools/serve.sh
```

Then open:

- `http://localhost:8765/` for both builds
- `http://localhost:8765/3d/index.html` for the 3d build
- `http://localhost:8765/2d/index.html` for the 2d build

W/A/S/D or the arrow keys step one cell; a click or tap walks to a cell; touch screens get a d-pad. The overlay takes a seed, rolls a new island, or goes home. `docs/RUN.md` holds every command, including render comparison and `tools/qa.mjs`.

## Query contract

| Param | Effect |
| --- | --- |
| `level` | `home` loads `levels/home.json`; `gen` builds an island from `seed` |
| `seed` | Island seed for `gen`, colour jitter elsewhere; `?seed=N` alone implies `gen` |
| `spawn` | `x,z` start cell |
| `hero` | `0` hides the hero and frames the level for reference shots |
| `dpad` | `1` forces the d-pad |
| `xray` | `0` turns off the see-through window around the hero |
| `view` | Root page: `both`, `3d` or `2d` |

`docs/RUN.md` lists the camera and scale parameters.

## Interactive and decorative

Interactive tiles fill one grid cell each and carry the walk: grass, sand, dirt, stone, water, ramp, bridge. A cell is walkable at `h >= 1` on a land, ramp or bridge surface, and the hero moves between neighbours of equal height or along a ramp. Decorative pieces (trees, rocks, well, fences, coins, waterfalls and the rest in `core/catalog.js`) sit on top of that grid. A solid piece blocks its cells; coins, gems, flowers and stepping stones let the hero pass. When the hero walks behind a piece, both builds cut a window through it.

## Procgen

1. `core/procgen.js` ranks cells by value noise blended with a falloff bump and keeps the top quantile as land, so each seed yields a similar land share.
2. Elevation quantiles set water, sand and a grass plateau; a cellular-automaton pass smooths the tiers and drops small fragments.
3. A flood fill from spawn finds unreached land and repairs it with a bridge of 1 to 3 cells, a ramp one tier down, or erasure.
4. Rules add a dirt plaza, paths, waterfalls under cliffs, a well or campfire in the widest clearing, Poisson-disc trees, and scatter decor, and reject any piece that would cut the walkable area.
5. `checkLevel` validates the result and the generator retries on failure; `node tools/procgen-check.mjs 200` tests 200 seeds.

## Pipeline

Three pipeline variants turn one artwork (`pipeline/seed/forest.png`) into a 3d level. All three start from the world brief `pipeline/analyze.mjs` writes (`pipeline/seed/brief.json`) and loop against `pipeline/critic.mjs`.

- A, transcription: `pipeline/a-transcribe/` measures the drawing as a map and builds the level and its props in code, at $0.82.
- B, concept repaint: `pipeline/b-concept/` has an image model repaint the drawing as a tile island, then transcribes the chosen concept by hand measurement, at $1.20.
- C, generated meshes: `pipeline/c-meshes/` turns brief props into sprites, trellis meshes and palette-snapped low-poly GLBs, and lays the island out with procgen, at $2.39.

```sh
node pipeline/analyze.mjs pipeline/seed/forest.png pipeline/seed/brief.json
node pipeline/a-transcribe/regions.mjs && node pipeline/a-transcribe/build-level.mjs
node pipeline/b-concept/concept.mjs pipeline/seed/forest.png pipeline/seed/brief.json pipeline/b-concept/candidates 4 -r2
node pipeline/b-concept/transcribe.mjs pipeline/b-concept/measure.json
node pipeline/c-meshes/sprites.mjs --n=2 && node pipeline/c-meshes/meshes.mjs && node pipeline/c-meshes/lowpoly.mjs
node pipeline/c-meshes/layout.mjs --seed=10 --write
node pipeline/critic.mjs out/final/forest-a.png --out out/final/forest-a.json
```

The levels load at `http://localhost:8765/3d/index.html?level=forest-a`, `forest-b`, `forest-b-small` and `forest-c`, from `levels/<name>.json` with props in `3d/pieces/<name>.js`. Each variant's README under `pipeline/` has its full loop, and `docs/RUN.md` holds the results table and `out/final/bakeoff.png`.

Round 2 kept pipeline A and varied only the analyzer's concept prompt (`node pipeline/analyze.mjs --concept <name>`, briefs in `pipeline/seed/concepts/`): `forest-a-pack-first`, `forest-a-scene`, `forest-a-biome`, `forest-a-motif-remap`, and `forest-a-composition-only` load the same way, each with its own pieces module. The six islands side by side are in `out/final/round2-concepts.jpg`, and the results table is under Round 2 results in `docs/RUN.md`.

Round 3 built three scene readings for each of the other eleven artworks (`cat`, `dragon`, `ember`, `chimera`, `wizard`, `swallow`, `cosmos`, `sharkbear`, `gremlin`, `mindbloom`, `eagle`), loadable as `?level=<slug>-<k>`, with one pieces module per artwork in `3d/pieces/<slug>.js` and the readings in `pipeline/seed/concepts/`. The sheet is `out/final/round3-sheet.jpg` and the table is under Round 3 results in `docs/RUN.md`.

## Spend

Generative and vision spend for the project: $8.827, of which $2.835 went on 2d sprites and $5.992 on the art-to-island pipeline. `docs/SPEND.md` has the log.

## Deploy

Publish the repo root as a static site. The pages need `index.html`, `3d/`, `2d/`, `core/` and `levels/`; `3d/vendor/` already holds the three.js files, so `node_modules/` stays out. Nobody has deployed isoworld yet.
