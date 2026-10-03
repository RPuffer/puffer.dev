# Multi-tile prop samples

Round 6 asks for a standard for large props: single items that span several tiles, like a windmill, a ruined gatehouse, a giant tree, a shipwreck, a shrine or a forge. The operator reviews these samples before anyone builds a batch. The stage 3 stamps (`out/refine/stage3-after.png`) were small helper clusters of 1x1 parts; this round replaces that idea with one big object per footprint.

## The standard

A multi-tile prop is one item. It has:

- a footprint of 2x2 to 4x3 tiles, its base edges on the tile seams;
- a height of up to 4 tiles, counted in pack ground-block heights;
- an anchor cell (the footprint's back corner) that places it on the grid;
- a blocking mask: the footprint cells the hero cannot enter, usually all of them, minus any walk-through gap such as a gate arch;
- one model, code-built or generated, placed once. It never gets assembled from 1x1 decor.

The style is the pack's: chunky stacked blocks, wedges and tapered boxes, flat colour, a lit top, a mid left face and a dark right face, rounded block edges.

## How a sample reads

Every sample puts the prop on a 5x5 slab of pack ground blocks (grass or sand) with the seams visible, so you count the footprint in tiles. The prop sits centred on its footprint and leaves the other slab tiles empty. The pack hero stands on an empty front corner tile, so height reads against a body one tile tall. The camera matches the pack: isometric, about 30 degrees down, slab seen corner-on. The background is flat #404040.

The image must avoid outlines, line art, gradients, smooth shading, texture, text or numbers, extra props or trees, and any background scene. Each of those either breaks the pack style or blurs which cells the prop occupies.

## From image to model

The operator picks one route:

- **Code-built:** a build agent reads the sample as a reference sheet and composes the prop from boxes and wedges in `3d/`, the way stage 2 rebuilt the creatures.
- **Trellis mesh:** an image-to-3D pass on the cropped prop, then a step that snaps every face to the nearest palette tone and scales the base to the footprint.
- **Hybrid:** a code-built footprint and silhouette with a generated mesh for one hard part, such as a sail, a hull or a canopy.

## Files

| File | Content |
| --- | --- |
| `gen.mjs` | `ITEMS` table (footprint w x d, height, slab, description, island colours) and the prompt; `node pipeline/multitile/gen.mjs <item>` writes `<item>.png`, `MULTITILE_SUFFIX=-b` writes `<item>-b.png` for comparison, `windmill-ramp` draws the scale ramp |
| `<item>.png` | kept sample per item |
| `windmill-ramp.png` | one windmill design at 2x2, 3x3 and 4x4 on one slab |
| `manifest.json` | item, island, footprint, height, file, tries, note |
| `sheet.png` | labelled contact sheet, 4 per row |
| `build.mjs` | writes `manifest.json` and `sheet.png` |

Model: newest `gemini-N-flash-image` the API lists, $0.045 per image. Style images every call: `ref/tilesheet.png` and `2d/assets/sheet.png`.

## Prompt

The windmill's prompt, as sent. Other items swap the description, footprint, height, slab and, for island items, a colour line taken from the brief's palette.

```
Image 1 and image 2 are an isometric game asset pack: chunky low-poly blocks in flat colour, every block face a single flat tone (top lightest, left middle, right darkest), slightly rounded block edges, no outlines, no gradients, no texture. Image 2's bottom-left row shows the pack's hero: a small cute adventurer with a big blocky brown head of hair, teal tunic and orange backpack. One pack ground block is one tile; the hero stands about one tile tall.

Draw one new multi-tile prop for this pack: a windmill: a stone and timber tower with a pointed roof and four big flat sail blades. It is one single object, anchored to the tile grid.

Ground: a square slab of exactly 5 by 5 ground blocks, one block high, made of the pack's grass blocks (green top, red-brown dirt sides). The block seams stay visible so every tile can be counted. The prop's base covers exactly 3 by 3 tiles of the slab, centred, with its edges on the block seams; the remaining slab tiles stay empty. The prop is 4 tiles tall at its highest point, measured in slab-block heights. The pack's hero, exactly as drawn in image 2, stands on one empty front corner tile of the slab for scale.

Build the prop only from chunky stacked blocks, wedges, slabs and tapered boxes, like the pack's trees, rocks and stone well. Straight edges only: a curve becomes a chain of two to four angled blocks. Few large parts, no tiny detail, no patterns, no printed icons, no lettering. Flat two-tone shading on every block (lit top and left faces, darker right face), no outlines, no line art, no gradients, no smooth shading, no texture.

Layout: the slab floating alone in the middle of a flat solid #404040 background filling the whole frame. Same isometric camera as the pack, looking down about 30 degrees, the slab seen corner-on like the pack's ground blocks. No other props, no trees, no scenery, no sky, no cast shadows on the background, no text, no labels, no numbers. Colours: the pack's own palette only.
```
