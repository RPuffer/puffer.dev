# Pass 7 phase 1: shafts off the top of the frame

Branch `worktree-agent-a5a0efb2b0e35d9f4`, commit `f9cb101`. Server on port 8771, `PP_PROFILE=.pp-profile-p7-1` (underlay fix: `.pp-profile-p7-1b`). No spend.

## Built

`elevatorFrame` in `3d/things.js` keeps the cage: caps, bar and lamp at 2.6. The two rails left the baked decor Baker for a live `partMesh` per elevator with `frustumCulled = false` and `userData.shaft`, so phase 4 can scroll the rungs. `SHAFT = 32` units above the deck, a trim rung every 1.5 from above the cage.

The plan said 24. The `levelScreenBounds` rule only holds for a clamped camera. At 400x800 the island is shorter than the frame, `placeCamera` centres it, and the rails need more height: sharkbear's entry at 11,10 needs 28.1 units, chimera 27.0, eagle 26.3. Per-lift numbers are in `out/pass7/probe.log`.

## QA

- `tools/qa-levels.mjs` gains `shaftSuite`: per island, `arrive=entry` and `arrive=exit` at 900x800, 400x800 and 1600x900; it projects the top corners of each shaft mesh with the live camera and asserts NDC y > 1 and one shaft per elevator. 72 shaft checks pass. The tightest is sharkbear at 400x800, NDC y 1.156, then chimera at 400x800, 1.218. Suite total: 238 pass, 0 fail, 1 skip (the existing sharkbear see-through-window skip).
- `qa-visibility.mjs all --json`: per-island pass/fail tallies match the pre-change run line for line. cat 16/17, gremlin 22/23 and sharkbear 18/19 carry the same fails they had before. cosmos-frisket goes from 1 to 2 passes via x-ray.
- Hero visibility drops at landings and the cells next to them, because the front rail now stands in front of the hero: forest 9,2 97% to 44%, chimera 6,5 100% to 47%, chimera exit landing path 4,2 100% to 47%, ember 7,1 91% to 40%, eagle 9,1 90% to 50%, cosmos 1,4 100% to 44%. 23 lines change in all; every one still passes. Logs: `out/pass7/vis-before.log`, `out/pass7/vis-after.log`.
- `qa-ride-keys.mjs`: 13 pass, 0 fail. `qa-run.mjs`: 14 pass, 0 fail, 0 skip. `qa.mjs`: 132 pass, 0 fail.

## Stills

`out/pass7/shaft-<level>.png` for all twelve at 900x800, `arrive=entry`, hero shown; `shaft-cat-medium-phone.png` and `shaft-ember-subject-phone.png` at 400x800; contact sheet `out/pass7/shaft-sheet.jpg` from `out/pass7/sheet.mjs`. `out/` is gitignored.

## Shafts crossing the island on screen (before)

`f9cb101` drew the whole rail in front of the island. A rail from a front-row lift crossed the terrain behind it on cat-medium, forest-volute, mindbloom-medium, cosmos-frisket, gremlin-subject, eagle-composition, sharkbear-medium, chimera-medium and ember-subject; on cat it ran across the cat figure, the market and the hero. At landings the rail stood in front of the hero and cut visibility to 40-50% (QA list above).

## Underlay (after)

The rail now splits at the cage. From -0.3 to 2.6 the posts are baked back into `elevatorFrame`, as before pass 7, and take the x-ray dither like other decor. Above 2.6 the rails and rungs stay a live mesh (`buildThings` `shafts`, `userData.shaft`) with an underlay material: the renderer asks for a stencil buffer, and every terrain, decor, thing and hero material writes stencil 1 (`ISLAND`). The shaft draws after them at `renderOrder` 3 with stencil test not-equal 1, so island pixels always win and the rail shows only against the sky. It still writes depth, so the clouds drawn after it sit behind it as before. No extra draw calls.

Three variants compared on cat-medium, ember-subject and eagle-composition at 900x800 (`out/pass7/cmp/grid.jpg`):

- (a) underlay only: the shaft rises from behind the island and reappears above its top silhouette.
- (b) (a) plus a 50% Bayer ghost of the rail over the island silhouette (second mesh, stencil equal 1).
- (c) (b) with the ghost cut away in the hero's see-through window.

Kept (a). The ghost in (b) and (c) reads as screen-door noise across the cat, the market and the eagle totem, the thing this fix removes, and costs a second draw per lift. (a) gives a clean figure-ground: island in front, shaft behind, rails clear of the frame top. A shaft drawn behind tall decor drops out beside it (cat's right shaft next to the cat's head), which reads as depth. (b) and (c) are deleted.

A stencil test stood in for the plan's draw-first-with-depth idea: a shaft drawn first with no depth write sits under the cloud billboards too, and pushing its depth to the far plane does the same, so the rails would vanish into the sky clouds at the frame top.

`tools/qa-visibility.mjs` copies the hero's stencil state onto its magenta stand-in, so the measurement matches the real render.

### QA after

- `qa-levels.mjs`: 72 shaft checks pass; suite 238 pass, 0 fail, 1 skip (`out/pass7/qa-levels-fix.log`).
- `qa-visibility.mjs all --json`: `out/pass7/vis-fix.log` is byte-identical to the pre-shaft `vis-before.log`. Forest 9,2 back to 97%, chimera 6,5 100%, chimera 4,2 100%, ember 7,1 91%, eagle 9,1 90%, cosmos 1,4 100%.
- `qa-ride-keys.mjs` 13 pass, `qa-run.mjs` 14 pass, 0 skip, `qa.mjs` 132 pass; 0 fail in each.
- Stills and `shaft-sheet.jpg` recaptured. Every shaft clears the top of the frame and none crosses an island or a hero, phone stills included.

## Unfinished

- No fortress approve card yet for the stills.
