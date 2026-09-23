# Art-to-island pipeline: shared front end

Two tools turn an artwork into a world brief and judge renders of the result. Both call the newest plain `gemini-N-flash` model the API lists at runtime (`gemini-3.8-flash` on 2026-09-23; override with `PIPELINE_VISION_MODEL`). The key comes from Keychain (`security find-generic-password -s dev.blacksmith.generator -a gemini -w`) or `GEMINI_API_KEY` and is never printed. `pipeline/vision.mjs` holds the shared call: JSON response mode, shape validation, one retry that feeds the validation errors back, and a token tally printed as `spend:` on stderr. Set `PIPELINE_DEBUG=<prefix>` to dump each raw reply.

## analyze.mjs

```
node pipeline/analyze.mjs <art.png> <brief.json>
node pipeline/analyze.mjs pipeline/seed/forest.png pipeline/seed/brief.json
```

1. Measures the artwork's palette itself: 8-colour k-means over a 192 px thumbnail (sharp), seeded by luminance quantiles, so the numbers are repeatable.
2. Sends the artwork, `ref/reference.png`, and `ref/tilesheet.png` with the pack's grammar (primitives, tone ladder, idioms), the `CATALOG` types, `PALETTE`, and the extra prop colours from `3d/palette.js`. The model first lists observations with boxes on the artwork, then derives everything else from them.
3. Validates the reply, repairs what is mechanical, and writes the brief. Repairs: heights forced to 0 under `W`/`V` and to at least 1 on land; motif cells on water or void dropped and `count` set to the cells kept; creature cells and the focal point snapped to the nearest `F` cell; translated tones below HSL saturation 0.30 raised to 0.30 and tone groups whose top sits below a per-group lightness floor lifted as a group, so a monochrome drawing still translates into the pack's hue families. Every repaired hex is listed in `palette.clamped` and substituted in motif and creature tones. Rejections that trigger the retry: missing keys, a palette group with the wrong shape, a primitive with the wrong `dims` count, a beam without `to`, a grid that is not 12 x 16 of the legend codes, and land that is not one 4-connected mass.

One run costs about $0.03 to $0.05 (one or two calls, about 7.5k tokens in and 5k to 8k out per call). Output varies between runs; the committed `pipeline/seed/brief.json` is the run the variants build from.

### brief.json schema

| Key | Content |
| --- | --- |
| `source` | `art`, `width`, `height`, `model`, `date` |
| `mood` | 4 to 8 words |
| `observations[]` | `what`, `box` `[ymin,xmin,ymax,xmax]` on the artwork in 0..1000, `maps_to` |
| `palette.measured[]` | k-means `hex`, `share` of area, model-assigned `role` |
| `palette.translation` | Per-level override of `PALETTE` with the same keys and shapes, plus `bg`. Merge it over the catalog palette as the level's `palette`. |
| `palette.notes`, `palette.clamped[]` | Translation logic; repairs as `key.sub old->new` |
| `motifs[]` | `name`, `type` (catalog type or `new`), `variant_of`, `footprint` `[w,d]`, `height`, `passable`, `count`, `cells` `[[x,z]...]`, `where`, `shape` |
| `creatures[]` | `name`, `source`, `becomes` (`prop` or `npc`), `type`, `footprint`, `height`, `shape`, `pose`, `cell` `[x,z]` on an `F` cell, `facing` (`n/e/s/w`), `why` |
| `composition.legend` | `G` ground, `R` raised ground, `W` water, `V` void, `T` vegetation, `F` figure, `P` path |
| `composition.grid` | 12 strings of 16 codes, row = z (0 is the far side of the artwork), column = x (0 is its left edge) |
| `composition.heights` | 12 strings of 16 digits 0..3 aligned with `grid` (block count, before `tileH`) |
| `composition.focal` | `x`, `z`, `what`; always an `F` cell |
| `composition.mass`, `composition.read` | Prose: where the weight sits; framing, eye path, what to preserve |
| `biome` | `trees.density` (share of land cells), `trees.types[]` `{type, variant, weight}`, `water_share`, `plateau_share`, `void_share`, `decor_weights` `{type: weight}`, `lighting` `{bg, ambient, sun, tint, notes}`, `rules[]` |

`shape` is `{ summary, parts[] }`. Each part is `{ prim, dims, at, tones }` with `tones` `[top, left, right]` and `at` `[x,y,z]` from the cell centre on the ground, in tile units:

| prim | dims | extra | `at` means |
| --- | --- | --- | --- |
| `box` | `[w,h,d]` | | bottom centre |
| `rbox` | `[w,h,d,r]` | | bottom centre |
| `cyl` | `[r,h,sides]` | | bottom centre |
| `cone` | `[r0,r1,h,sides]` | | bottom centre |
| `ball` | `[r,squashY]` | | centre |
| `prism` | `[h]` | `outline` `[[x,z]...]` | bottom centre |
| `beam` | `[r]` | `to` `[x,y,z]` | start point |

Any part may carry `rot` `[rx,ry,rz]` in degrees. These map onto `Baker.box`, `rbox`, `cyl`, `cone`, `ball`, `prism`, and the `beam`/`bar` helpers in `3d/pieces.js`.

The task named the translation's keys after `MATERIALS` in `core/catalog.js`; that export only lists bridge and ramp materials, so the translation is keyed by the `PALETTE` groups, which is what a per-level `palette` override merges over.

### The seed brief

The forest (1454 x 2048, pure greyscale) measures eight greys from `#181818` to `#dddddd`. The translation keeps the pack's hue families at dusk values: grass `#4b8c4b`, sand `#bfa054`, water `#3ba1ab`, wood `#a26843`, mint pine `#478568`, grey-violet cliffs `#434752`/`#333742`, background `#1c222b`. The flame-feathered bird stays in the pack's flame colours `#ffe082`/`#ffb31d`/`#ff831d` as the one hot accent. Motifs, strongest first: tall bare trunk (7), leaning trunk (2), fallen log (3), root tangle (5), mist bank (6), mossy stump (2). Creatures: the fire-bird spirit (NPC, 2.4 tall, 11 parts, focal cell 7,6) and a small flame wisp behind its tail (NPC, 0.8 tall, cell 9,5). Composition: trunks wall the perimeter and the right side, the bird stands left of centre on a low knoll, a pale path runs up from the foreground to its feet, logs and roots fill the lower left, no water.

## critic.mjs

```
node pipeline/critic.mjs <render.png> [--out report.json] [--style ref/reference.png] [--annotate out.png] [--votes 3]
```

Sends the render and the style image with a fixed rubric: floating props, sunken or wrong-surface props (water, bridge, stair), interpenetration, scale, off-grid placement, style breaks, palette clashes, layout nonsense, anything unnatural. The prompt lists what the reference itself does (log bridge as separate sagging logs, tower in the pool, floating coins, cropped frame) so those are not flagged, and asks for a prop inventory first, recording what each prop's base rests on, before the defect list. Boxes come back in the model's `[ymin,xmin,ymax,xmax]` 0..1000 convention and are converted to render pixels `[x0,y0,x1,y1]`.

Each run makes `--votes` independent passes (default 3, temperature 0.4) and keeps an item only when a majority of passes report it (boxes matched at IoU 0.25 or mutual centre containment). Rubric rules 1 to 3 (floating, wrong surface, interpenetration) are forced to high. Items the model marks as drawn the same way in the style image are dropped. Output: a table with severity, votes, box, issue, and fix; a verdict line; exit 1 when any agreed high item remains, else 0. `--out` writes `{ render, size, model, style, verdict, votes, high, items[{issue, rule, severity, support, box, fix_hint}], minority[], dropped[], inventory[] }`. `--annotate` draws the agreed items as numbered boxes (red high, amber medium, blue low) on a copy of the render. One critique costs about $0.02 to $0.07.

### Calibration (2026-09-23)

Renders at `?hero=0`, 351x390 and 900x800. The broken level was a temporary copy of `levels/home.json` (deleted afterwards) with five planted faults: a pine hanging off the right islet over the void, a barrel on the upper pool, a barrel on the lower pool, a big rock inside the well, and a round tree on the log bridge.

| Render | Agreed items | Result |
| --- | --- | --- |
| broken 351x390 | tree on bridge 3/3, both barrels on water 3/3 | FAIL, 3 high, no false positives |
| broken 900x800 | the same three, 3/3 each | FAIL, 3 high, no false positives |
| home `out/final-3d.png` 351x390 | log bridge split into two runs 3/3 | FAIL, 1 high |
| home 351x390 (fresh render) | tower lacks its base 2/3 high; bridge split 3/3 medium | FAIL, 1 high |
| home 900x800 | upper pool slab overhangs empty space 3/3; cobble slab hovering 2/3 | FAIL, 2 high |

The critic catches every fault on a water or bridge surface and flags nothing on the broken level that was not planted. It misses the pine over the void and the rock fused into the well in every configuration tried. The home island does not pass. Two of its flags hold up against `ref/reference.png`: the log bridge renders as two offset runs with a gap where the reference ties one continuous span, and the upper pool's front-right slab has no column under it where the reference stands it on a sand block. The tower and cobble-slab flags are false positives.

Tuning history: a single pass flagged 1 to 3 different home items per run. Listing the reference's own quirks and asking for the base inventory cut some of them. Forcing rules 1 to 3 to high fixed barrels on water coming back as medium. Majority voting removed the run-to-run noise. Four enlarged quadrant crops (`--zoom`) found the floating pine once, but threw box coordinates off by up to 250 px on small renders and added home false positives, so it was removed.

## Spend

Logged in `docs/SPEND.md` under Pipeline: about $1.25 for this phase. The figure is an estimate from API token counts at an assumed $0.50 per million input and $3.00 per million output tokens; the Gemini API returns no price.
