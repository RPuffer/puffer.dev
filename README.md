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

- `http://localhost:8765/` for the landing (character select); `islands.html` for the run start page
- `http://localhost:8765/3d/index.html?level=cat-medium` for one island in the 3d build
- `http://localhost:8765/compare.html` for the old 3d and 2d side by side

W/A/S/D or the arrow keys step one cell; a click or tap walks to a cell; touch screens get a d-pad. The overlay holds one link, "islands", back to the start page. `docs/RUN.md` holds every command, including render comparison and `tools/qa.mjs`.

## Query contract

| Param | Effect |
| --- | --- |
| `level` | Loads `levels/<name>.json`; `home` (the default) is the reference-match island |
| `seed` | Colour jitter |
| `spawn` | `x,z` start cell |
| `hero` | `0` hides the hero and frames the level for reference shots |
| `dpad` | `1` forces the d-pad |
| `xray` | `0` turns off the see-through window around the hero |
| `clouds` | `none` (or `0`) turns off the cloud bed every island floats on; reference shots use it |
| `view` | Root page: `both`, `3d` or `2d` |

`docs/RUN.md` lists the camera and scale parameters.

## Interactive and decorative

Interactive tiles fill one grid cell each and carry the walk: grass, sand, dirt, stone, water, ramp, bridge. A cell is walkable at `h >= 1` on a land, ramp or bridge surface, and the hero moves between neighbours of equal height or along a ramp. Decorative pieces (trees, rocks, well, fences, coins, waterfalls and the rest in `core/catalog.js`) sit on top of that grid. A solid piece blocks its cells; coins, gems, flowers and stepping stones let the hero pass. When the hero walks behind a piece, both builds cut a window through it.

## Procgen helpers

`core/procgen.js` keeps the checks every island goes through: `reachability` (flood fill from spawn), `checkLevel` (schema, decor overlap, ramp and bridge rules, reachability), `levelStats`, and `frameView` (fits the camera to the silhouette). Pipeline A and the pieces modules import them. The seed-driven island generator that produced the MVP's generic islands was removed on 2026-10-08 (commit history has it); variation of the artwork islands runs through pipeline A's shapers (`build-level.mjs --seed N`), and `docs/PROCGEN.md` keeps the research for a later per-island generator.

## Route-first layouts

`core/layout/` generates an island from its route: spine, loops, and one-way shortcuts (door, kicked ladder or drop, lever gate) back to the bonfire, with land grown outward and path cells drawn as darker worn flagstones. Late feature modules (hill, lookout, alcove, inlet) then grow onto the land, and a rule-ordered decor pass places multi-cell decor kits (`3d/pieces/kits.js`, `?level=kits-showcase`) where the route calls for them: landmarks at turns and on hills, rewards in pockets, waymarks along the approach. `node tools/bake-layout.mjs --base run` bakes the twelve run islands from their artwork levels in `levels/base/`, and `node tools/bake-layout.mjs` bakes `wizard-medium-r1`, `-r2` and `-r3`; `node tools/qa-route.mjs` proves them. `docs/LEVEL-DESIGN.md` holds the rules and `docs/procgen-research.md` the practices they build on.

## Pipeline

Pipeline A turns one artwork into a 3d level: `pipeline/analyze.mjs` writes the world brief, `pipeline/a-transcribe/` measures the drawing as a map and builds the level and its props in code, and `pipeline/critic.mjs` scores the render. The bake-off's two losing routes, B (concept repaint, `pipeline/b-concept/`) and C (generated meshes and procgen layout, `pipeline/c-meshes/`), moved to `archive/bakeoff/` on 2026-10-08 with their levels, pieces and GLBs; they are inert there.

```sh
node pipeline/analyze.mjs pipeline/seed/forest.png pipeline/seed/brief.json
node pipeline/a-transcribe/regions.mjs && node pipeline/a-transcribe/build-level.mjs
node pipeline/critic.mjs out/final/forest-a.png --out out/final/forest-a.json
```

The level loads at `http://localhost:8765/3d/index.html?level=forest-a` from `levels/forest-a.json` with props in `3d/pieces/forest-a.js`. `pipeline/a-transcribe/README.md` has the full loop, and `docs/RUN.md` holds the bake-off results table and `out/final/bakeoff.png`.

Round 2 kept pipeline A and varied only the analyzer's concept prompt (`node pipeline/analyze.mjs --concept <name>`, briefs in `pipeline/seed/concepts/`): `forest-a-pack-first`, `forest-a-scene`, `forest-a-biome`, `forest-a-motif-remap`, and `forest-a-composition-only` load the same way, each with its own pieces module. The six islands side by side are in `out/final/round2-concepts.jpg`, and the results table is under Round 2 results in `docs/RUN.md`.

Round 3 built three scene readings for each of the other eleven artworks (`cat`, `dragon`, `ember`, `chimera`, `wizard`, `swallow`, `cosmos`, `sharkbear`, `gremlin`, `mindbloom`, `eagle`), loadable as `?level=<slug>-<k>`, with one pieces module per artwork in `3d/pieces/<slug>.js` and the readings in `pipeline/seed/concepts/`. The sheet is `out/final/round3-sheet.jpg` and the table is under Round 3 results in `docs/RUN.md`.

Round 4 replaced those with readings derived from each artwork: a deep read per piece, then three lenses (medium, subject, composition) that each argue a different world from it, built with named terrain shapers. The 36 levels load as `?level=<slug>-<lens>`; round 3 is archived under `archive/round-3/`. Sheet `out/final/round4-sheet.jpg`, table under Round 4 results in `docs/RUN.md`.

Round 5 rebuilt forest and cosmos with five aspect-derived readings each (`forest-tooth`, `-lift`, `-volute`, `-trunks`, `-roots`; `cosmos-frisket`, `-ringway`, `-lashline`, `-veinfield`, `-nebula`), authored by the build agents while the Gemini account was out of credits. Sheet `out/final/round5-sheet.jpg`, table under Round 5 results in `docs/RUN.md`.

## Refinement

A fourth stage after brief, build, and critic, planned in `docs/REFINEMENT.md` with the lane research under `docs/refinement/`. Four stages landed, each proven on one island and judged on a before-and-after card: wind (baked vertex sway on crowns, flames, water, waterfall bands, mist, and pickups; frozen at `hero=0`; draw calls unchanged), stamps (a per-cell mask schema and arch, bridge-span, canopy, fence-run, and road-run stamps placed by the finish helpers; proven on `ember-subject`), the style bible (`docs/STYLE.md`, `3d/prims.js`, creatures rebuilt from the pack-style reference sheets in `pipeline/refsheets/`; proven on `cat-medium`), and things (`core/interact.js`: bonfire, chest, gate, elevator, watcher; F or Enter or tap; proven on `wizard-medium`). Commands and numbers per stage are under the Refinement headings in `docs/RUN.md`; `tools/clip.mjs` captures motion clips, `tools/cohesion.mjs` prints the cohesion metrics, `tools/qa-things.mjs` drives the interactions.

## Multi-tile props and loops

Twenty multi-tile props (eight generic, twelve themed) were standardised as generative sample images in `pipeline/multitile/` and then code-built on `3d/prims.js` in `3d/pieces/multitile*.js` with multi-cell masks; the generic set lives on `?level=showcase` and each themed prop stands on its island as the landmark. The level-design feedback loops are planned in `docs/LOOPS.md` (research under `docs/loops/`); stage 1, the decor rule loop, is `tools/loops/decor-loop.mjs` with `tools/loops/decor-metrics.mjs`, proven on `ember-subject`.

## The run

The twelve picked islands form one run in the order of `levels/run.json`: each island has a bonfire near spawn, a chest, a gate that opens when the focal creature turns to watch you at its threshold, and entry and exit elevators that ride to the previous and next island. Open http://localhost:8765/ and press Begin (or start an island at 3d/index.html?level=cat-medium), walk with WASD or arrows, press F at things, ride the exit. `node tools/qa-run.mjs` rides it headless; `node tools/loops/pass.mjs <level>` is the standing per-island pass (rebuild, decor loop, layout loop, walks, overlay).

## Spend

Generative and vision spend for the project: $8.827, of which $2.835 went on 2d sprites and $5.992 on the art-to-island pipeline. `docs/SPEND.md` has the log.

## Deploy

Publish the repo root as a static site. The pages need `index.html`, `3d/`, `2d/`, `core/` and `levels/`; `3d/vendor/` already holds the three.js files, so `node_modules/` stays out. Nobody has deployed isoworld yet.
