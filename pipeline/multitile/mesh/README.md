# Multi-tile props, route A: trellis mesh

Route A turns a multi-tile sample image into a palette-snapped GLB. It covers the windmill and the canopy tree.

```sh
node pipeline/multitile/mesh/cut.mjs [item...]
node pipeline/multitile/mesh/trellis.mjs <item...> --tag=N [--steps=20] [--ss=7.5] [--slat=3]
node pipeline/multitile/mesh/lowpoly.mjs [item...] [--key=value overrides]
```

| Script | Does |
| --- | --- |
| `cut.mjs` | Keys `#404040`, drops grass pixels by hue (the tree only below y 455, so the crown survives), keeps the largest component, which drops the hero and slab sides. Writes `<item>.cut.png` and `<item>.plate.png` (white, 1024 px) |
| `trellis.mjs` | One `fal-ai/trellis` call per item, `mesh_simplify` 0.98, `texture_size` 512, $2 cap in `ledger.jsonl`. Writes `raw/<item>.<tag>.glb` |
| `lowpoly.mjs` | Reads `lowpoly.json`. Rotates by `yaw`, scales height to `height` tiles and x/z so the lowest `baseBand` spans `baseSpan` tiles, capped at `maxStretch` over uniform. Brightens the texture by the mean ratio to the cut image (trellis textures come out at about 0.65 of the sample), labels each triangle with the nearest sample family. `qem` mode runs three's `SimplifyModifier` to `faces` and re-labels by nearest source triangle; `voxel` mode fills an N-high grid and greedy-merges exposed faces. Each face takes its family's top, left (+z) or right (+x) sample hex by normal. Writes `3d/assets/multitile/<item>.glb` with the `sway` family's triangle list in `asset.extras` |

`3d/pieces/multitile-glb.js` loads the GLBs, wraps sway triangles in `Baker.sway("crown")`, and registers `glb-windmill` and `glb-canopy-tree` as 3x3 stamps with every cell blocking at h 4. `levels/showcase-glb.json` holds both props on two sand slabs.

## Kept

| Item | Raw | Build | Faces | Notes |
| --- | --- | --- | --- | --- |
| windmill | try 2 (50 steps, ss 9, slat 4) | qem 1000, yaw 90 | 1004 | Try 1 twisted the sails. At 700 faces the sails turn to mush. Base spans 1.92 tiles under the 1.3 stretch cap; the sample's own base reads near 2x2 |
| canopy-tree | try 1 (20 steps) | voxel 16, smooth 2 | 728 | Try 2 rounded the crown. qem at 500 gave lumpy triangle facets; voxels keep the cube grammar but step every edge |

Renders: `out/multitile/glb-showcase.png` (`?level=showcase-glb&hero=0`, 900x800), `glb-windmill.png` and `glb-canopy-tree.png` (`&spawn=6,14` or `14,6`, `&zoom=54&ui=0`, 600x600). With the hero shown the camera centres on him, so the slab sits higher in frame than in the samples.
