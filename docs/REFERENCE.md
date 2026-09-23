# Reference measurements

All pixel coordinates refer to `ref/reference.png` (351x390, promo.png x 5..356, y 5..395; reference pixel = promo pixel minus 5). Measured with sharp on exact pixel values; the art is flat-coloured, so the exact-colour histogram gives the palette directly (15 328 unique colours, the top 40 cover the scene).

## Background and frame

- Background `#404040` (51 605 px, 38% of the frame). The promo border is `#000000`; the tilesheet panel uses `#282828`.
- The island is cropped by the frame on the right (lone block, x 351) and the bottom (lower pool, pines). Match the crop, not a fitted view.

## Projection

- True isometric, not 2:1 dimetric. Four plaza markers sit on the inner grid corners of the 3x3 plaza: N (232.0, 213.9), W (209.8, 226.5), E (254.2, 227.0), S (232.3, 239.9). One tile is therefore 44.4 px wide and 26.0 px tall; same-row sand tiles repeat at 44.4 px (55.2 to 99.6 at y 227.4) and stacked rows at 25.3 px.
- Long edges confirm it: the plaza top plane (x 175..289, y 196..260) has edge slopes of 1.68, 1.72, 1.75, 1.69 px across per px down. True isometric predicts 1.732; dimetric predicts 2.0.
- Width:height = 1.71 to 1.73, so pitch = asin(tan 30) = 35.264 deg, yaw 45 deg, orthographic.
- Scale: 22.15 px per half tile across, 12.8 px per half tile down, 25.58 px per world unit vertically, 31.33 px per world unit in the three.js sense (`zoom`).

## Tile metrics

- Top face: 44.3 px wide, 25.6 px tall, corners rounded at about a 4 px radius, 1 px darker seam between neighbours.
- One block: the lone block runs top vertex y 193 to bottom vertex y 244, which is a 25.6 px rhombus plus a 25.4 px side. With the 3 to 4 px lip under the top face, a single slab reads as a 29 to 30 px step (well block and bridge-end block both measure 30 px of side).
- Terrace offsets do not fall on whole cubes. The grass plateau stands 38.4 px (1.5 cube edges) above the sand terrace, the half-height cobble steps sit halfway, and the lower pool lies 76.8 px below the sand. home.json therefore sets `view.tileH` to 1.5: one `h` step is 1.5 world units, which puts every terrace on its measured pixel row.
- The water group is scaled up by the promo artist: pool tiles measure 44 px wide like sand tiles but repeat at 30 px across and 16.5 px down, 1.35x the land lattice. The lone block sits 9 px right of the lattice (u 4.4). home.json snaps both to the grid.
- Tilesheet tiles are thin slabs drawn at 0.70x: 31 px wide top, 39.5 px grid pitch, same 1.72 ratio.

## Light and shading

Flat shading, no gradients, light from the upper left. The top face is brightest, the face toward screen lower-left (world +z) is mid, the face toward screen lower-right (world +x) is darkest.

| Material | top | left (+z) | right (+x) | right/left luminance |
| --- | --- | --- | --- | --- |
| lower cliff (under sand) | sand `#f4c41e` | `#d6856b` | `#a15b52` | 0.71 |
| upper cliff (under grass) | grass `#aae26c` | `#c3856c` | `#a7695f` | 0.81 |
| grass fringe vs top | `#aae26c` | `#8ac967` | `#73aa4f` | top:left 1 : 0.88 |

Taking ambient 0.5, the ratios top 1.00 : left 0.88 : right 0.66 fit a directional light along world (0.25, 0.78, 0.59): elevation about 51 deg, coming from the +z side with a little +x. Block corners carry a vertical bevel strip in a middle tone (`#ba695e` lower, `#915b53` upper) that reads as vertical stripes down the cliff faces.

## Palette

Exact hex values, pixel counts in brackets, assigned by locating each colour's centroid and bounding box.

| Element | Hex |
| --- | --- |
| background | `#404040` [51605] |
| sand top | `#f4c41e` [6754], dots `#f1cd52`, top edge `#f1b900`, lip `#dd9200` |
| grass top | `#aae26c` [3644], fringe/drip `#8ac967`, drip shadow `#73aa4f`, highlight specks `#c4ef86` |
| dirt path / plaza | `#ffe082` [2016], mottle `#f8d87c`, path patches on grass `#ffe087` |
| cobble stone | slab `#ffe082`, pebbles `#fff0c3` and `#e8dab1`, rim `#dbc9a2` |
| lower cliff | `#d6856b` left, `#a15b52` right, bevel `#ba695e`, specks `#905148` |
| upper cliff | `#c3856c` left, `#a7695f` right, bevel `#915b53` |
| water top | `#a0eeff` [3844], bubbles and foam `#daf7ff` |
| waterfall and deep water | `#00d4ff` [1073], streaks `#00daff`, `#00ceff`, `#00c7ff` |
| wood (bridge, ladder, well frame, scaffold) | `#ff831d`, `#dc7016`, `#bd4c0b`, shadow `#a04b14`, log ends `#f6d881` |
| mint pine (plateau) | `#68e09e`, `#5ac389`, `#44a46b` |
| lime round tree | `#c4ef86`, `#8ce263`, `#73aa4f` |
| leaf pine (foreground) | `#8ce263`, `#64c960`, `#50ab46` |
| teal pine and teal cluster | `#00ffbf`, `#00e09b`, `#00c386`, `#00a568` |
| gold tree | `#f1cd52`, `#f1b900`, `#dd9200` |
| trunk | `#b06a57`, `#9f5950` |
| rock | `#e3e3e3`, `#d4d4d4`, `#ababab`, `#8f8f8f` |
| well stone | `#dbc9a2`, `#c7b693`, `#b1a483` |
| berry bush | `#8fffc2`, `#68e09e`, `#5ac389`, berries `#fe738f`, `#f45f7d` |
| gold (coin, markers) | `#f1b900`, `#dd9200`, highlight `#ffe082` |

`core/catalog.js` exports these as `PALETTE`.

## Asset inventory

Sizes in tile units (1 = one cell edge; heights in cube edges, before `tileH`). Every entry maps to a `CATALOG` type or a surface.

### Surfaces (interactive)

| Piece | Shape | Maps to |
| --- | --- | --- |
| grass block | Rounded-corner slab, top `#aae26c` with three `#c4ef86` dots near the back corner. A grass skin 0.15 thick hangs over the cliff with a scalloped drip edge (`#8ac967`, shadow `#73aa4f`), 3 to 4 bumps per face. | `s: grass` |
| grass with path patch | Grass top with an irregular pale `#ffe087` patch covering 40 to 70% of the face. | `s: grass` (renderer variant) |
| sand block | Top `#f4c41e` with a 3-dot `#f1cd52` cluster in the back corner, darker `#f1b900` rim, `#dd9200` lip 0.12 thick. Lip drips over the side in two or three rounded tongues on some tiles. | `s: sand` |
| dirt path / plaza | Pale `#ffe082` top with faint `#f8d87c` pebble mottle, framed by a 0.1-wide `#f4c41e` border. The plaza is one 3x3 panel with a faint inner grid and four gold diamond markers at the inner grid corners. | `s: dirt`, markers as `marker` |
| cobble slab | Raised pale slab 0.25 thick, rounded, carrying 5 to 6 oval pebbles `#fff0c3` shaded `#e8dab1`. Used on the plateau and as the stair between terraces. | `s: stone`; the stair cell is `s: ramp`, `m: stone` |
| cliff side | Under every land top. Lower cliffs `#d6856b`/`#a15b52`, upper cliffs `#c3856c`/`#a7695f`, vertical bevel stripe at each block corner, a few 2x3 px `#905148` specks. | column sides |
| water | Shallow tile `#a0eeff` with 2 to 3 `#daf7ff` bubble ovals, pale rim, cyan `#00d4ff` side. | `s: water` |
| plank bridge | Three to four orange planks laid across the gap, 0.15 thick, ends rounded, `#dc7016` with `#bd4c0b` gaps. | `s: bridge`, `m: planks` |
| log bridge | Logs laid across the path, 0.3 diameter, `#dc7016` bark with `#f6d881` end caps, tied by rope to stumpy posts at each end. | `s: bridge`, `m: logs` |
| waterfall | Sheet of `#00d4ff` falling from a pool edge with vertical `#00daff`/`#00ceff`/`#00c7ff` streaks and white `#daf7ff` spiral splash blocks at the foot. | `waterfall` |

### Decor

| Piece | Shape | Maps to |
| --- | --- | --- |
| mint pine | Four stacked rounded boxes shrinking upward (widths 0.9, 0.75, 0.55, 0.35), each tier two-tone: lit left `#68e09e`, shaded right `#44a46b`, top `#5ac389`. Trunk 0.15 square `#b06a57`, 0.35 tall. Total 2.4. | `tree-pine` v0 |
| leaf pine / teal pine | Same stack, foreground pair: v1 `#8ce263`/`#64c960`/`#50ab46`, v2 `#00e09b`/`#00c386`/`#00a568`. | `tree-pine` v1, v2 |
| lime round tree | Cluster of rounded cubes (one 0.7 cube on top, three 0.45 cubes around it, offset) on a 0.15 trunk 0.8 tall. `#c4ef86` tops, `#8ce263` sides, `#73aa4f` shade. Total 2.2. | `tree-round` v0 |
| gold tree | Same form as the round tree in `#f1cd52`/`#f1b900`/`#dd9200`, trunk `#b06a57`. | `tree-orange` v0 |
| teal cluster | One rounded 0.55 cube on top of four to five 0.2 cylinders at its base, `#00e09b` with `#00ffbf` highlights, a small grey pebble beside it. About 1.1 tall. | `bush-cluster` v0; the tilesheet gold version is v1 |
| berry bush | Lumpy mound of 5 to 6 overlapping spheres, 0.6 wide, 0.45 tall, `#68e09e` shaded `#5ac389`, pink `#fe738f` berries. | `bush` v0 |
| small rock | Two stacked pebbles, 0.25 wide, `#e3e3e3` over `#ababab`. | `rock` |
| big rock | Blocky boulder pile of 3 to 4 rounded cubes, 0.8 wide, 0.9 tall, `#e3e3e3` top, `#d4d4d4` left, `#ababab` right. | `rock-big` |
| well | Square stone base 0.8 wide, 0.5 tall, `#dbc9a2` with `#c7b693` brick lines; two orange posts rise 1.0 above it, joined by a crossbeam; a pale rope hangs to a bucket. | `well` |
| fence | Two stubby log posts 0.2 wide, 0.35 tall, `#bd4c0b` bands and `#f6d881` tops, joined by a sagging pale rope. | `fence` (rot 1 runs along z) |
| fence post | Single post from the same set. | `fence-post` |
| fence pen | Four posts on the corners of a 0.7 square with rope on all sides. | `fence-pen` |
| barrel | Open wooden bucket 0.4 wide, 0.4 tall, `#dc7016` staves, `#bd4c0b` bands, dark interior. | `barrel` |
| stump | Short log 0.4 wide with a white axe sunk in its top. | `stump` |
| orange flowers | Three to four tiny 4-petal flowers `#ff831d` with `#f1b900` centres, scattered on the tile. | `flower` v0 |
| blue flowers | Two to three hollow blue rings with a green sprout. | `flower` v1 |
| coin | Upright gold disc 0.35 across, `#f1b900` face, `#dd9200` rim, floating 0.3 above the tile. | `coin` |
| plaza marker | Small raised gold diamond, 0.25 wide, `#f4c41e`. | `marker` |
| ladder | Rope ladder, two pale ropes and four orange log rungs, hanging 1.5 down a cliff face. | `ladder` |
| scaffold | Orange timber tower: four legs with an X brace, a platform at bridge height, three post caps on top. Stands in the lower pool under the end of the log bridge. | `scaffold` |
| star | Gold five-point star 0.3 across. Tilesheet only. | `star` |
| heart | Red heart 0.3 across. Tilesheet only. | `heart` |
| stepping stones | Pill-shaped pale slabs in shallow water (tilesheet water tiles with pale ovals). | `stepping-stones` |

## World-to-screen mapping for home.json

home.json is 16 x 12 cells. Cell (X, Z) spans [X, X+1] x [Z, Z+1]; +x draws down-right, +z down-left. With `tileH` 1.5, the top-face centre of cell (X, Z) at height h lands on reference pixel

```
sx = 232.0 + (X - Z - 5) * 22.15
sy = 227.1 + (X + Z - 13) * 12.8 - (h - 2) * 38.37
```

Anchor: the plaza centre cell (9, 4), h 2, sits at (232.0, 227.1). For a world point (wx, wy, wz) with wy = h * tileH:

```
sx = 232.0 + (wx - wz - 5) * 22.15
sy = 227.1 + (wx + wz - 14) * 12.8 - (wy - 3) * 25.58
```

The frame centre (175.5, 195) is world (6.97, 3, 4.52), which home.json stores as `view.center`, with `zoom` 31.33, pitch 35.264, yaw 45, and the 351 x 390 viewport. Checkpoints: well cell (4, 8) at (32.7, 214.3); lone block (11, 1) at (342.8, 214.3) (the reference draws it at 329.5, 205.5, off-grid); bridge-end block (12, 4) at (298.5, 265.5).

Known snaps, all under 16 px: water tiles (the art is rescaled), the lone block, coin and fence offsets, and the ladder foot (10 px low). Islets the reference shows but no path reaches: the lone block (11, 1), the ladder foot (7, 9), and the two foreground pine tiles (15, 9) and (14, 10).

### Fields home.json adds

- `view`: pitch, yaw, tileH, zoom, center, read by `core/iso.js`.
- Bridge cells carry `m` (`planks` or `logs`) and `w`, the height of water drawn under the deck (1 for the upper pool, 0 for the tower cell).
- Ramp cells carry `m`, the material of the slope (`stone` for the cobble stair).
- `waterfall` decor sits on the lower-pool cell at the foot; `rot` 0 means the cliff and the source pool lie on the -z (north) side.
