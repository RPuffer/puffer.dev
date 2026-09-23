# Isoworld MVP brief

Every agent on this build reads this file first. It is the spec. Ask nothing of the operator; decide, record the decision in `docs/DECISIONS.md` (one line each, dated), and keep going.

## Goal

A functional interactive website: a controllable character walks a tiled isometric world that looks near-identical to `ref/reference.png` (the left panel of an "Isometric TILES" asset-pack promo, 352x400, dark grey background). `ref/tilesheet.png` is the right panel and shows the pack's individual pieces; `ref/promo.png` is the whole image. Two builds ship side by side from the same level data and the same controls:

- `3d/`: three.js, orthographic isometric camera, flat-shaded low-poly procedural geometry. Zero generative spend.
- `2d/`: HTML canvas compositing of drawn isometric sprites generated with image models, painter's-order depth sort. This is where the generative budget goes.

`index.html` at the repo root shows both in iframes (same `?level=&seed=` query), with a toggle to view either alone. Each build also runs standalone at `3d/index.html` and `2d/index.html`. No bundler, no framework: ES modules with an import map, static files served by `python3 -m http.server` or `npx serve`. three.js comes from `node_modules/three` (copy `build/three.module.js` and needed `examples/jsm` files into `3d/vendor/`).

## Asset categories

1. Interactive: tile-based, one grid cell each, walkable, and the input to procedural generation (grass, sand, dirt path, stone, water, ramp, bridge).
2. Decorative: may span several cells, usually groupings, additive on top of the interactive base, never walked on (trees, rocks, well, fences, barrels, pots, mushrooms, flowers, coins, gems, torches, campfire, crates, chest, signpost, waterfall, bushes). A decor type's footprint blocks its cells unless the catalog marks it `passable`.

The character gets a transparency window last: when a decorative asset occludes the character, a circular see-through (3d: screen-space cutout in the decor material; 2d: alpha fade of occluding sprites inside the radius, or an x-ray silhouette) keeps the character visible.

## Level schema (`levels/*.json`)

```json
{
  "name": "home",
  "size": [W, D],
  "cells": [[{ "h": 1, "s": "grass" }]],
  "decor": [{ "t": "tree-pine", "x": 3, "z": 4, "v": 0, "rot": 0, "ox": 0, "oz": 0 }],
  "spawn": [x, z],
  "bg": "#3b3b3b"
}
```

- `cells` is row-major `[z][x]`. `h` is the stack height in tile units: 0 means water level or void, 1..3 are stacked blocks. `s` is the surface: `grass | sand | dirt | stone | water | none | ramp | bridge`. A ramp cell carries `"d": "n|e|s|w"` (the downhill direction) and joins `h` to `h-1`. A bridge cell sits at `h` with `s: "bridge"` and water or void below.
- Walkable: `h >= 1` and `s` in grass, sand, dirt, stone, ramp, bridge. Moves go between 4-neighbours with equal `h`, or through a ramp along its axis.
- `decor` entries reference a type in `core/catalog.js`, which defines for every type: category, footprint `[w, d]` in cells, `passable`, anchor rules, variant count. `ox`/`oz` are sub-cell offsets in [-0.5, 0.5].
- `spawn` is a walkable cell.

## Validation loop (no review gates)

Nothing goes to the operator until the site works and the home island is near-identical to the reference. Judge it yourself: `tools/shot.mjs` renders any page headless to PNG; `tools/compare.mjs` prints MAD, NCC, and silhouette agreement against `ref/reference.png` at matched size and writes a side-by-side and an overlay. Read the side-by-side image with the Read tool every iteration. Iterate until the metrics plateau and a stranger would call the render a re-creation of the reference. Framing, background colour, camera angle, palette, proportions, and the specific pieces all count.

## Budget and keys

Generative spend cap for the whole project: $30.00. Log every batch in `docs/SPEND.md` as `date | model | count | $ | purpose` and keep a running total on the last line. Gemini `gemini-3.1-flash-image` is $0.045 per image; list models at runtime because ids retire. Keys live in macOS Keychain, service `dev.blacksmith.generator`, accounts `gemini` and `fal`; read them with `security find-generic-password -s dev.blacksmith.generator -a gemini -w` inside scripts and never print them. Working call patterns: `~/dev/loom/island/plate.mjs` (Gemini image in, image out) and `~/dev/loom/island/mesh.mjs` (fal). Stop at $30 and report; the orchestrator escalates.

## House rules

- No code comments, anywhere, ever (the one exception is a justified anti-pattern).
- Commit granular, only your own paths, with a message that says what changed and why. If `.git/index.lock` exists, wait and retry; another agent is committing.
- Own only your directories. Shared files (`core/`, `levels/`, `docs/`) are owned by the agent the orchestrator named; others append via a new file rather than editing.
- Prefer the exact approach the reference implies. Consult primary sources when unsure and write what you learned to `docs/NOTES.md` as a one-line trap or finding.
- Reports back to the orchestrator: under 150 words, verdict first, paths and numbers, then what is unfinished.
- Headless Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` with `--allow-file-access-from-files --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-first-run --disable-background-networking --hide-scrollbars`, own `.pp-profile` dir; see `~/dev/loom/island/shot.mjs`.
