# Point-and-click movement (pass 11 proof of concept)

Click or tap a tile and the hero walks the fewest-step route there. WASD, the arrow keys and the d-pad still work; a key press cancels the route after the current step.

## Pieces

- `core/path.js`: `findPath` is a binary-heap A* over the walk graph (`neighbours`, so gates, closed edges, ramps, lift tiles and decor-blocked cells all count). A 0.001 turn cost breaks ties toward straighter lines without changing step count. `routeTo(L, from, to)` returns `{ cells, reached }`; an unreachable tile routes to the nearest reachable cell by straight-line distance, ties to the closer walk. `pathToward` wraps it for `interact.tap`.
- `core/route.js`: `state.route` is the cell array from the hero's current cell to the goal, plus `target`, `goal`, `reached`, `active`, `version`, `ahead()`, `interrupt(cell)`, `cancel()`. `interrupt(cell)` truncates the walk so the hero stops on that cell if it lies ahead; this is the trap hook. The route clears itself on arrival, on lock (elevator rides) or when anything else rewrites `actor.path`.
- `core/game.js`: a tap picks the tile, sets `state.mark` (cell, ok, time) for the pulse and calls `route.set`. A tap on a bonfire, chest or elevator keeps the old walk-to-thing behaviour and mirrors the route so the line shows.
- `3d/pathline.js`: one mesh, one draw call. Chevrons flow toward the goal over a thin core line in the lift-beam cyan (`BEAM.color`) with a white-hot core, on tile tops, ramp slopes and lift-step risers, rounded at turns. It is consumed behind the hero, races ahead at 40 tiles/s on a new route, and adds the tap pulse (cyan, amber when unreachable) and a goal reticle. Buffers are preallocated (1024 samples) and rewritten only when `route.version` changes; per frame only uniforms move. Depth-tested, no depth write: decor hides it, the x-ray window shows it, and it fades inside the hero clear radius like the speed lines.

## QA

`tools/qa.mjs` gains `clickSuite` at 1200 and 400 touch, yaw 45 and 225: far tile arrives, path line present mid-walk, route clears on arrival, unreachable tile walks to nearest and marks amber, `route.interrupt` stops on the cell, a key press cancels. `QA_ONLY=click` runs just that suite.

Clip: `out/pass11/click-move.mp4` on wizard-medium (click, re-path mid-walk, turn to 225, unreachable click, long walk).

## Open

- No trap cost in the solver yet; traps would add edge weights or call `route.interrupt`.
- The 2d build walks routes but draws no line.
- `tools/qa-visibility.mjs` retires only if click movement replaces keys.
