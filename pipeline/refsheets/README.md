# Creature reference sheets

Stage 2 of the refinement plan (docs/REFINEMENT.md, Route 3) needs one reference sheet per focal figure. The build agent reads a sheet to size and shape the code-built figure. Each sheet shows the pack hero for scale, then the figure in front three-quarter, side and back three-quarter views on flat #404040.

| File | Content |
| --- | --- |
| `<slug>.png` | the kept sheet for each of the twelve figures |
| `manifest.json` | per slug: file, model, tries, kept attempt, measured hero and figure heights in px, height ratio, target ratio, figure height in tiles (hero = 0.93 tile, from `3d/character.js`), four proportion notes, verdict on the current figure |
| `sheet.png` | contact sheet of all twelve, labelled with the measured ratio |
| `gen.mjs` | Gemini call and prompt; `FIGURES` holds the per-figure form, target ratio and any scale fix |
| `measure.mjs` | sharp: masks pixels more than 20 levels off the border colour, splits the row on 6 px column gaps, returns each group's bounding box |
| `build.mjs` | measures every sheet, writes `manifest.json` and `sheet.png`; the proportion notes and verdicts live in its `SHEETS` table |

## Regenerate

```
node pipeline/refsheets/gen.mjs cat
REFSHEET_SUFFIX=-b node pipeline/refsheets/gen.mjs cat
node pipeline/refsheets/build.mjs
```

The first line overwrites `cat.png`; the suffix form writes `cat-b.png` beside it so you can compare before you keep one. `gen.mjs` picks the newest `gemini-N-flash-image` model the API lists (`gemini-3.1-flash-image` on 2026-10-01) unless you set `REFSHEET_MODEL`. One sheet costs $0.045. Inputs per call: the artwork from `pipeline/seed/<slug>.png` resized to 1024 px, `ref/tilesheet.png`, `2d/assets/sheet.png`, and the prompt built from `pipeline/seed/analysis/<slug>.json` (subject, pose, stylisation, dominant colours, first accent).

## Prompt

The cat's prompt, as sent. Other figures swap in their analysis fields, form, ratio and fix.

```
Image 1 is an artwork. Image 2 and image 3 are an isometric game asset pack: chunky low-poly blocks in flat colour, every block face a single flat tone (top lightest, left middle, right darkest), slightly rounded block edges, no outlines, no gradients, no texture. The bottom-left row of image 3 shows the pack's hero: a small cute adventurer with a big blocky brown head of hair, teal tunic and orange backpack.

Draw a character reference sheet of the focal figure of image 1 (domestic cat (Felis catus), head and upper bust) remade as a piece of this asset pack: a seated cat shown as a full chunky body with its big head, not just a bust. Shape notes from the artwork: frontal bust with the head tilted slightly to the viewer's left while the right ear rises taller to the upper right corner. Fauvist chromatic fragmentation replacing natural tabby or calico fur patterns with unblended slabs of primary and secondary colour. Keep the artwork's character and silhouette, but build it only from chunky stacked blocks, wedges, slabs and tapered boxes, like the pack's trees, rocks and hero. Straight edges only, no smooth curves: a curve becomes a chain of two to four angled blocks. Few large parts, at most twelve, no tiny detail except on the face. No patterns, no printed icons, no feather or fur strokes on the faces. Flat two-tone shading on every block (lit top and left faces, darker right face), no outlines, no line art, no gradients, no airbrush, no painterly marks, no texture.

Layout: a flat solid #404040 background filling the whole frame, no ground, no floor tiles, no cast shadows, no text, no labels, no numbers. One row, left to right: the pack's hero exactly as drawn in image 3, then the figure three times, all at the same scale and standing on one shared baseline: front three-quarter view, side view, back three-quarter view. Same isometric camera as the pack, looking down about 30 degrees. Scale: the figure is 2.5 times as tall as the hero. Leave clear empty gaps between the hero and every pose.

Colours: the artwork's own colours #e8dfce, #df9e0c, #363a56, plus one accent #c4616d (as in the artwork) used on one small part only. No other hues.
```

## Findings

- The first pass gave smooth curves on the swallow, sharkbear and dragon tails, painterly feather strokes on the eagle, and printed doodles on the mindbloom hair. Adding "straight edges only", "at most twelve parts" and "no patterns, no printed icons, no feather or fur strokes" fixed the swallow, sharkbear and eagle on the second try.
- The model overshoots scale on big figures: chimera came back at 4.06 hero heights against a 2 target, cosmos at 3.56, ember at 3.13. A per-figure clause ("no taller than three hero heights") pulled them to 2.31, 3.10 and 2.72.
- Monochrome artworks (dragon, chimera, sharkbear, gremlin, eagle, forest) give grey or white sheets. Take shape and proportion from those sheets and colour from the island's brief.
- Weak sheets: dragon (many small plates, the head turns between views; the retry curved the body, so the first try stays), mindbloom (doodle decals on the hair; the retry lost the face and shrank to 1.87), forest (grey, no fire colour), sharkbear and cosmos (3.09 and 3.10 hero heights, just over the 3 ceiling).
