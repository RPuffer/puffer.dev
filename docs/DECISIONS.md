# Decisions

- 2026-09-23 Two builds, 3d procedural and 2d drawn sprites, from one level schema; side by side at the root.
- 2026-09-23 Site is a static build in this repo; the live RPuffer/puffer.dev repo is not touched until the operator says so.
- 2026-09-23 World axes: cell (x, z) spans [x, x+1] x [z, z+1]; +x draws down-right, +z down-left, north is -z. W walks north (up-right); each key maps to the world axis nearest its screen direction turned 45 deg clockwise.
- 2026-09-23 Ramp cell at h is h-1 blocks plus a wedge rising from h-1 on its downhill `d` edge to h on the opposite edge; moves are legal when both cells show the same height on the shared edge.
- 2026-09-23 3d camera defaults to pitch 35.264 and yaw 45; a level's optional `view` block or `?pitch=` overrides it. It follows the hero but clamps to the level's screen bounds, so a level that fits the viewport stays centred.
- 2026-09-23 Water cells render as a slab with its top at y 0; land columns reach down to y -0.4 so the island has a base under the waterline.
- 2026-09-23 docs/REFERENCE.md had not landed when the 3d build shipped, so pitch stays at the 35.264 default; home.json can set it through its `view` block without touching engine code.
- 2026-09-23 home.json sets view.tileH 1.5: the reference terraces step 38.4 px (1.5 cube edges), so integer h with tileH 1.5 puts sand, plateau, and pools on their measured rows. Bridge cells carry m (planks|logs) and w (water height under the deck); ramps carry m.
- 2026-09-23 Generated islands: `?level=gen&seed=N`, or `?seed=N` alone, runs core/procgen.js in the page; no level file is written. The view block keeps home's pitch, yaw, and tileH 1.5 and fits zoom and center to the island's bounds, decor tops included.
- 2026-09-23 Operator chose the 3d build; the 2d build stays as-is and the art-to-island pipeline targets 3d only.
- 2026-09-23 Seed artwork for the pipeline bake-off is the charcoal forest with the flame spirit (puffer-assets A3F70CA1); the dragon is excluded by request.
- 2026-09-23 Bake-off verdict: pipeline A carries forward; round 2 varies the concept step only, five strategies, forest-a kept as baseline.
- 2026-09-29 Round-2 verdict: scene strategy picked; round 3 builds three scene readings for each of the eleven remaining artworks.
