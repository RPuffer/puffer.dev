# Variant B: concept repaint, then transcribe

An image model repaints the artwork as one isometric island in the pack's style. I then measure the repaint's tile lattice the way docs/REFERENCE.md measured home, write the level from those measurements, and build the missing props in code.

## Commands

```sh
node pipeline/b-concept/concept.mjs pipeline/seed/forest.png pipeline/seed/brief.json pipeline/b-concept/candidates 4 -r2
cp pipeline/b-concept/candidates/cand-r2-1.png pipeline/b-concept/concept.png
node pipeline/b-concept/transcribe.mjs pipeline/b-concept/measure.json
pipeline/b-concept/round.sh <tag>
node pipeline/critic.mjs out/forest-b/<tag>-351.png --annotate out/forest-b/<tag>-351-crit.png --out out/forest-b/<tag>-351-crit.json
PP_PROFILE=.pp-profile-b node pipeline/b-concept/walk.mjs forest-b "W W A A W D D D S A A S"
```

- `concept.mjs <art> <brief> [outDir] [count] [tag]` lists the Gemini models at runtime, takes the newest `gemini-N-flash-image` (`gemini-3.1-flash-image` on 2026-09-23), and sends the artwork, `ref/reference.png`, `ref/tilesheet.png`, and a prompt built from the brief's palette translation, motifs and creature. It writes `cand<tag>-N.png`, the prompt text, and one line per call to `ledger.jsonl`. The committed candidates are JPEG copies.
- `measure.json` holds everything I measured by hand on the concept: the lattice, the cell grid (`g2` grass at h 2, `p1` path at h 1, `r2e` a ramp at h 2 falling east), one base pixel per prop, and the swatch boxes the palette samples.
- `transcribe.mjs [measure.json]` samples the swatches, maps each prop's base pixel back through the lattice to a cell plus `ox`/`oz`, derives `view` (pitch, tileH, zoom, center) from the lattice, adds path strips, ramp stairs and the column skirt, writes `levels/<name>.json`, and runs `checkLevel` from core/procgen.js with the pieces catalog registered. It drops only the procgen-only checks (grass share, one plateau) and the stairs-on-ramp rule. It exits 1 on any other problem.
- `round.sh <tag>` transcribes, renders the concept size (928x1152), 351x390 and 900x800 under `.pp-profile-b`, and prints the compare against the concept.
- `walk.mjs` presses keys in headless Chrome and prints the hero's cell and height after each press.

Rerun the pipeline on new art by running `concept.mjs`, picking a candidate, and writing a new `measure.json`. The lattice and the prop pixels are hand measurements. Nothing in this variant detects them.

## Candidate choice

Round 1 (5 images, `prompt-r1.txt`) gave faithful compositions, but every candidate drew black outlines and deep columns with no readable grid. Round 2 (4 images, `prompt-r2.txt`) added "no outlines" and "clear square grid, columns one or two blocks deep". `candidates-sheet.jpg` shows all nine.

I picked `cand-r2-1`. It keeps the drawing's layout: bare trunks walling the back and the right, a thick trunk leaning in from the right, the flame bird left of centre on a mound, roots and logs in the front left, a pale path climbing a stair to the bird's feet, and mist between the back trunks. It also draws the clearest lattice of the nine. The outlines are almost gone, and it shows exactly two ground levels. `cand-r2-3` matches the drawing's mood as well, but it adds pines and a smeared grid, and every round-1 image failed the outline test.

## Measurements

The concept is 928x1152. A tile is 141.4 px wide and 84.6 px tall (half steps 70.7 and 42.3), so pitch = asin(42.3 / 70.7) = 36.75 deg, near true isometric. One terrace step is 95 px, which gives tileH 1.186 at 100 px per world unit. The lower terrace's front, left and right corners land at (464, 930), (40, 678) and (888, 676), so the island is 6x6 cells on two levels: the plateau (h 2) covers the back three rows and the bird's mound, and the lower terrace (h 1) covers the rest. A dirt stair ramp at (2,2) joins the two levels. Every walkable cell is reachable from spawn (3,4). The compare frame scales `view.zoom` by min(928/351, 1152/390), so the level stores zoom 37.818 and center (1.82, 1.186, 1.82).

## Props (3d/pieces/forest-b.js)

`bare-trunk` (round bark column, flared foot, stub branches, optional `ht` and a `fork`), `leaning-trunk` (a `lean` vector, splayed foot), `fire-bird` (stacked flame tiers, curved beak, flame crest, wings and tail, on a moss mound, turned to face screen left), `flame-wisp`, `mist` (translucent upright cloud cut-outs, placed by pixel and slid along the view ray off the trunks), `root-tangle` (moss mound with twelve arched roots, passable), `mossy-stump`, `fallen-logs` (a pair or one), `dirt-path` (the path strip; the engine's dirt surface draws round patches on grass), `dirt-stairs` (three treads over the ramp), and `island-skirt` (a second block row under every column, because the concept's columns run two blocks deeper than the engine's 1.26). The level palette carries every hex under `forestB`, sampled from the concept.

## Loop history

Compare is `tools/compare.mjs pipeline/b-concept/concept.png` at 928x1152. Critic counts are agreed high items at 351x390 / 900x800.

| Round | Change | MAD | NCC | Silhouette | Critic high |
| --- | --- | --- | --- | --- | --- |
| r0 | first transcription | 11.8 | 0.756 | 91.3% | |
| r1 | path strips, stairs, skirt, grass palette | 11.2 | 0.763 | 93.8% | |
| r2 | cloud mist, trunk heights, bigger stumps and roots | 10.9 | 0.748 | 94.4% | |
| r3 | fire bird rebuilt with an S-curve and deep oranges | 10.1 | 0.781 | 94.6% | 0 / 1 (fog clips trunks) |
| r4 | mist slid along the view ray off the trunks | 10.2 | 0.777 | 94.6% | 1 (clouds through trunks) / 0 |
| r5 | mist translucent | 10.2 | 0.777 | 94.6% | 0 / 0 |
| r6 | bird moved right, shorter log | 10.2 | 0.774 | 94.7% | 1 / 1 (leaning trunk top unsupported) |
| r7 | leaning trunk tip set against a back trunk | 10.2 | 0.776 | 94.7% | 1 / 2 (clouds, leaning trunk) |
| r8 | ground mist banks, fork on the back trunk | 11.4 | 0.740 | 94.2% | 1 / 0; the banks read as stone pillars, reverted |
| r9, final | clouds back, trunk extended across the back trunk's top | 10.3 | 0.774 | 94.6% | 0 / 1 (leaning trunk without upper anchor) |

The loop hit its round cap. A 1.19x bird scored worse (NCC 0.743) and a 0.93x zoom that fit the tree tops into 900x800 scored MAD 12.9, NCC 0.698, silhouette 86.2%, so I kept both at the concept's values.

## What still looks off

- At 351x390 and 900x800 the frame crops the trunk tops, because those frames are wider than the concept's 928x1152. The critic then sees the leaning trunk's upper end without its support and flags it high in most rounds. The concept draws the same unsupported lean.
- Cloud cut-outs pass in front of and behind trunks. The critic called that clipping in r3, r4 and r7.
- The bird reads blockier and smaller than the concept's flowing flame figure. The roots read as thin arcs where the concept draws thick ones.
- The concept's cells carry black seams and outlines; the engine draws neither.

Walk check (`walk.mjs`, 900x800): spawn (3,4), then W (3,2), A (1,2) up the stair to h 2, A (0,2), D back down the stair to (4,2) h 1, S (5,3), A (3,3), S (3,5), no page errors.

The first-pass renders are now `out/forest-b-small-*.png`.


## Second pass: the larger island (levels/forest-b.json)

The coordinator asked for a larger world. I kept the 6x6 island as `levels/forest-b-small.json` (concept `concept-small.png`, spec `measure-small.json`); both levels share `3d/pieces/forest-b.js`.

```sh
CONCEPT_CELLS=10x8 CONCEPT_ASPECT=1:1 node pipeline/b-concept/concept.mjs pipeline/seed/forest.png pipeline/seed/brief.json pipeline/b-concept/candidates 5 -r3
node pipeline/b-concept/transcribe.mjs pipeline/b-concept/measure.json
pipeline/b-concept/round.sh <tag> [measure.json]
node pipeline/b-concept/clear.mjs levels/forest-b.json
```

I picked `cand-r3-4` (1024x1024). It draws the most regular lattice of the five, 8x8 cells with trunks walling the back and both sides, the bird on a knoll, a stone stair, a pale path, roots and logs in front, and mist behind the trunks. It keeps thin outlines. `cand-r3-1` and `cand-r3-5` follow the drawing's mood as closely, but their tiles change size across the island and no single lattice fits them. Lattice: tile half steps 57 x 34 px, terrace step 60 px, so pitch 36.6 deg and tileH 0.927. The island has a plateau (h 2) at the back and sides and a lower front (h 1) with the pale path, joined by a stone ramp at (4,4).

Changes to the shared pieces:
- Mist: `transcribe.mjs` now places each cloud on the camera ray through its concept pixel, at the depth that puts it 0.75 behind every trunk it overlaps on screen (`behind: true`). `clear.mjs` checks that no cloud plane passes within 0.4 of a trunk or the bird; both levels report clear.
- Bird: longer four-tier neck, crest, tail and wings built as thin stacked flame wedges.
- Roots: radius 0.085 to 0.12, reach cut to 0.72 to 0.94 so they stay on their cell.
- Leaning trunk: `top` gives the concept pixel of its tip; `transcribe.mjs` slides the tip along that pixel's ray until it touches a back trunk below that trunk's top, and adds a fork to the supporting trunk.

| Round | Level | Change | MAD | NCC | Silhouette | Critic high (351 / 900) |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | forest-b | first transcription of cand-r3-4 | 15.5 | 0.677 | 91.8% | |
| L2 | forest-b | trunk height and radius, root, moss and mist swatches | 15.1 | 0.687 | 93.7% | |
| L3 | forest-b | mist moved behind the trunks | 15.6 | 0.666 | 93.3% | 1 / 1 (leaning trunk) |
| L4 | forest-b | leaning trunk solved against a back trunk | 15.6 | 0.667 | 93.4% | 1 / 1 (leaning trunk, stump at its base) |
| final | forest-b | fork on the support, stump moved | 15.6 | 0.666 | 93.4% | 1 / 1 (leaning trunk) |
| S2 | forest-b-small | shared piece changes, mist behind trunks | 10.8 | 0.737 | 94.2% | 1 / 1 (leaning trunk) |

The large island holds: its outline, terraces, stair, path and trunk rows land on the concept, but it scores worse than the small one. Its concept has thin outlines and textured tiles, and the bird and knoll differ in shape. The critic still flags the leaning trunk's upper end in every round at both sizes; at 900x800 the whole island now fits the frame, so the flag is no longer a crop artifact. The sleeker bird cost the small level about 0.04 NCC against its own concept.

Walk check on forest-b: spawn (4,6), W up the ramp to (4,4) and on to (4,2) at h 2, D to (7,2), S stops at the (7,3) cliff edge, A back to (5,3).

Final renders: `out/forest-b-351.png`, `out/forest-b-900.png`, `out/forest-b-small-351.png`, `out/forest-b-small-900.png`.

## Spend

See `SPEND.md`: $0.63 for fourteen concept images and about $0.57 for 26 critic runs, $1.20 of the $12.00 allocation.
