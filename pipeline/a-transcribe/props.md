# Writing a concept's pieces module

`build-level.mjs --concept <name>` stops and lists the brief's new prop types until `3d/pieces/forest-a-<name>.js` registers every one of them. You write that module by hand from the brief. Print the list at any time:

```sh
node pipeline/a-transcribe/build-level.mjs --concept <name> --props
```

Each line gives the type name (the motif or creature `name` in the brief), footprint, height, passable flag, count, and the brief's one-sentence shape summary. The full part list sits in `pipeline/seed/concepts/<name>.json` under `motifs[].shape.parts` and `creatures[].shape.parts`.

## Module contract

Copy `3d/pieces/example.js` for the skeleton and `3d/pieces/forest-a.js` for the forest idioms. Export `register(style)` and return `{ catalog, builders }`:

- `catalog[type]`: `{ footprint, passable, variants, height }`, plus `rotates: true` for props with a facing. Use the brief's footprint, passable flag and height. The lead creature (the one at the focal cell) always takes footprint `[2, 2]`, because `build-level.mjs` gives the bird a 2x2 anchor.
- `builders[type](variant, rot, style, ctx)`: return a `THREE.Mesh` built with `Baker` from `3d/baker.js`, base at y 0, centred on the cell, sized to `ctx.height`.

`style.palette` carries the level palette: the pack groups (`grass`, `wood`, `trunk`, `treeMint`...), the forest extras (`bark`, `rootWood`, `mist`, `spirit`, `ember`, `flame`, `beak`, `spiritEye`), and `tones[type]`, the unique `[top, left, right]` tone triples of that type's parts in brief order. Take colours from `tones[type]` first so the prop wears the concept's palette.

## Reuse before you build

`3d/pieces/forest-a.js` already builds a bare trunk, leaning trunk, root tangle, fallen log, mist bank, flame wisp and the fire-bird. When a brief type matches one of those, call forest-a's `register` with a palette override and hand its builder through, as `3d/pieces/forest-a-pack-first.js` does:

```js
import { register as forestA } from "./forest-a.js";
const trunks = forestA({ ...style, palette: { ...P, bark: P.tones["bare-trunk"][0] } });
builders["bare-trunk"] = trunks.builders["bare-trunk"];
```

A brief type named after a catalog piece (`log`, `torch`, `pot`) never reaches the module: `build-level.mjs` places the catalog piece.

## Pack style for new props

Match the reference island (`ref/reference.png`, `ref/tilesheet.png`) and the builders in `3d/pieces.js`:

- Chunky stacked blocks. Build from `B.box`, `B.rbox`, `B.cyl` with 6 to 8 sides, and `B.prism` outlines. Stack two or three segments that narrow upward instead of one long thin shape.
- Two-tone flat colour. Pass `tone(top, left, right)`; the engine shades the faces. No gradients, textures, outlines or glow.
- Trunks and posts are 0.3 tile wide at the base (forest-a uses 0.34, 0.28, 0.23 for its segments), never pencil-thin. Branches are short stubby boxes with an upturned tip block.
- Props stand 0.3 to 2.6 tall on one cell. The bird stands about 2.2 to 3.0.
- Anything flat and pale (mist, cloud) is a few low offset rounded slabs, 0.1 to 0.15 thick.
- Give most props two or three variants driven by `variant` so repeats do not clone.
- Anchor everything on the ground: no part may float or sink below y 0.

## Terrain rules the builder keeps

`regions.mjs` and `concept-level.mjs` hold the pack proportions from the second forest-a pass: an irregular island with void on every side, heights 0 to 3 with stone ramps between tiers, no tall prop with void on its camera side, and a clear ring around the bird. Your module only decides what each prop looks like.

## Check your module

```sh
node pipeline/a-transcribe/build-level.mjs --concept <name>
node tools/shot.mjs "http://localhost:8765/3d/index.html?level=forest-a-<name>&hero=0&zoom=60&center=X,1.5,Z" out/forest-a-<name>/prop.png 700 700
```

The first command fails with `does not register: ...` if a type is missing. The second frames one prop close up: set `center` to the prop's cell. Read the PNG before you run the critic.
