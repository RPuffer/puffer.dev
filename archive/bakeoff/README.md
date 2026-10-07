# Bake-off routes B and C

Moved here on 2026-10-08 from `pipeline/b-concept/`, `pipeline/c-meshes/`, `levels/forest-b.json`, `levels/forest-b-small.json`, `levels/forest-c.json`, `3d/pieces/forest-b.js`, `3d/pieces/forest-c.js` and `3d/assets/forest-c/`. Pipeline A won the 2026-09-23 bake-off (`docs/RUN.md`, Pipeline results). Nothing here runs from its new location: `c-meshes/layout.mjs` imports `generateLevel`, which left `core/procgen.js` the same day, and the pieces modules import from paths that no longer resolve. `c-meshes/meshes.mjs` is the working fal trellis call pattern.
