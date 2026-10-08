# Pass 7 phase 1: shafts off the top of the frame

Branch `worktree-agent-a5a0efb2b0e35d9f4`, commit `f9cb101`. Server on port 8771, `PP_PROFILE=.pp-profile-p7-1`. No spend.

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

## Shafts crossing the island on screen

A rail drawn up from a front-row lift crosses the terrain behind it.

- Down the island to the front edge: cat-medium, forest-volute, mindbloom-medium, cosmos-frisket, gremlin-subject, eagle-composition, sharkbear-medium, chimera-medium, ember-subject.
- Across the back half only: wizard-medium, swallow-medium.
- Clear, rails at the island's left and right edges: dragon-medium.

On the 400x800 phone stills both cat shafts cross the island, and an ember shaft crosses the summit.

## Unfinished

- No fortress approve card yet for the stills.
- No redesign of crossing shafts; the operator decides from the card.
