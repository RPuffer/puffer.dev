# Style bible

`3d/prims.js` holds every number below in `BIBLE` and enforces it at bake. A module that builds through `kit()` and `figure()` gets the bible for free; `tools/cohesion.mjs` checks the result. Hue and key stay free per island. Value ramps, face ratios, part budgets and scale bands lock.

## Luminance

Luma means Rec. 709 weights on sRGB-encoded values: `0.2126 R' + 0.7152 G' + 0.0722 B'`. Measured this way, the pack's grass fringe sits at 0.878 of its top and its cliffs at 0.709 and 0.814 right over left (REFERENCE.md), so the targets below come straight from the pack.

## Face ratios (locked)

| Face | Luma target | Tolerance |
| --- | --- | --- |
| top (+y) | 1.00, the base colour | |
| left (+z, screen lower-left) | 0.88 of top | 0.08 |
| right (+x, screen lower-right) | 0.66 of top, so 0.75 of left | 0.08 |

The lock applies at bake. `kit()` takes the level light, computes each face's world normal, picks the ramp step for that normal, then divides by `lightFactor(light, n)`. The engine multiplies the same factor back in, so the screen shows the ramp step exactly, under any island's light rig.

## Ramps

Every base colour becomes a five-step ramp, `ramp(hex)`:

| Step | Use | Hue | Saturation | Value |
| --- | --- | --- | --- | --- |
| -2 | right face, underside | 12 deg toward 250 (cool) | +0.10 | luma 0.66 of base |
| -1 | left face | 6 deg toward 250 | +0.05 | luma 0.88 of base |
| 0 | top face | base | base | base |
| +1 | chamfer rim | 6 deg toward 60 (warm) | base | 30% toward white |
| +2 | spare highlight | 12 deg toward 60 | base | 55% toward white |

Hue moves along the shorter arc and stops at its target, so yellows shadow toward orange and blues toward violet, as the pack's sand lip does (`#f4c41e` to `#dd9200`). The pack's own trees shift 1 to 4 deg per step and slynyrd suggests 20; 6 sits between. Rounded and bevelled corners between left and right take the midpoint of steps -1 and -2, the pack's vertical bevel stripe.

## Two-tone and three-tone

- Three-tone: any solid whose smallest side is 0.15 tile or more shows top, left and right from one ramp.
- Two-tone: details under 0.15 tile show top and step -1 on every side. A third tone on a 3 px face reads as noise.
- One ramp per part. A figure carries at most three body ramps plus one accent, and the accent sits on face details only. Eyes and mouths use the shared `ink` `#2a1f33` and `white` `#fffaf0`.

## Edges

Block size `s` is the smallest horizontal side of a part.

- Vertical corners: a 45 deg bevel of 0.10 s, clamped to 0.01 to 0.09 tile. A full tile gets the pack's 4 px corner.
- Top chamfer: 0.05 s, clamped to 0.012 to 0.04 tile and never over 0.3 of the part's height, toned step +1. It draws the lit rim the pack's blocks carry.
- Everything flat-shaded, one colour per triangle, no gradients, no outlines.

## Highlight floor

V (max of R, G, B) at the 90th percentile of non-background pixels reaches 0.80 or more. The rejected forest-medium sat at 0.71.

## Silhouette budget

- At most 12 parts per creature with any side of 0.15 tile or more. A tail or chain of links counts as one part.
- Parts under 0.08 tile appear only as face details (eyes, nose, mouth, fangs, inner ears), flagged `face: true`.
- `figure()` throws when a spec breaks the budget, so a bad creature never bakes.

## The hero

The hero (`3d/character.js`, `heroSpec()`) runs through `audit()` like any creature, with two readings of the rules above, added in pass 7 phase 5 when the figure grew to 19 parts for the clip library:

- Limbs split into upper, lower and hand or foot segments. Each segment stays under 0.15 tile on every side, so it bakes two-tone and leaves the 12-part budget alone; only hips, torso, head and hair count, 4 of 12. A segment never drops under 0.08 tile, so none needs the face flag.
- The hero keeps five body ramps (skin, shirt, pants, hair, boot) where a creature gets three. The player has to read at 1x against any island, and the pack's own hero carries as many.

Each part bakes into its own mesh under a named joint group, so `THREE.AnimationMixer` can pose it from the clips in `3d/clips/`.

## Scale bands

| Class | Height in tiles |
| --- | --- |
| decor | 0.3 to 2.4 |
| focal figure, base included | 1.5 to 3 |
| decals (passable, under 0.3) | exempt |

## Proportions from a reference sheet

A creature builder reads its sheet in `pipeline/refsheets/` and its row in `manifest.json`, then writes a spec in tile units:

1. Figure height: the manifest's `target_ratio` times the hero's 0.93 tile, base excluded. The cat targets 2.5, so 2.3 tiles.
2. Head block, ears excluded: 0.35 to 0.45 of figure height. Ears or horns add on top; the cat's head plus ears reach 0.5 of height, as its sheet shows.
3. Limb thickness from the manifest, scaled by figure height over `figure_tiles`.
4. Widest point at the manifest's location (haunches plus tail for the cat), within the footprint.
5. Accent on the parts the manifest names and nowhere else.
6. Mark the head part `role: "head"` and group the face onto it, so a watching head turns as one.
7. Stacked bodies follow the pine taper: each tier 0.9, 0.75, 0.55, 0.35 of the widest.

## Check

```sh
node tools/cohesion.mjs out/refine/stage2-after.png cat-medium
```
