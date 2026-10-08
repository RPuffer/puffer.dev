# Pass 8 ride fix: upward arrival and dances

Operator, 2026-10-08: "the animation isn't quite right - it seems reversed, the end of the lift animation when going up ends with coming down into the new island - also, character is not doing the fun dances during it."

## Arrival direction

Root cause: `settleNew` in `core/sequence.js` parked the new island at `y = -dir * D2` (below the frame) and the arrive beat eased it up to 0. The camera is pinned to the hero on the kept deck, so an island rising past a still hero reads as the hero sinking. The landing deck also started at `lift = +rise` and lowered onto the tile, a second downward cue.

Fix: the new island now starts at `y = +dir * D2`, above the frame, and settles down to 0. The deck starts at `lift = -dir * rise`, under the arrival tile inside its beam, and rises onto the tile with the overshoot above it. Going up, the world keeps flowing down past the hero from drop to land: the old island falls away, then the new island's cloud bed and arrival beam slide down past him until he stands on the arrival lift tile. Speed lines keep `uRideDir = 1` the whole hop, so they still run upward. An entry ride (`dir = -1`) mirrors it: the island comes up from below and the deck lowers onto the tile.

I picked "island enters from above" over "hero and deck rise from below a fixed island" because the camera already locks to the hero for the whole ride. Moving the hero would mean unpinning the camera mid-hop and a visible stop before the rise; moving the island keeps one continuous motion vector from drop to land.

## Dances

Root cause: the dance was triggered (`dance` beat at 0.3 s) but a fixed `braceAt: 2.6` replaced it with `brace` before the hold began (hold starts at 2.83 s), and `settleNew` started the freshly mounted hero in `brace` too. The dance only ran during the zoom-in, when the hero is small, and brace filled the whole visible hold. The mixer, facing yaw and walk/idle blend were fine: the actor is locked, so `moving` is false and the one-shot wins.

Fix: `braceAt` is gone. The dance (cycled by the session counter through wiggle, spin, pump) runs from 0.3 s through the close-in, drop and hold. When the new hero mounts at swap, `settleNew` replays the same dance at the same phase (`(t - danceAt) % duration`). Brace now lands at the end of the hold for `SEQ.braceLead` (0.5 s) before the commit, and carries through the arrive. Staging no longer waits on brace.

## Measurement

Each hop now records `clips`: the distinct hero clips seen per beat, sampled every tick. `tools/qa-ride-keys.mjs` (real keys, real-time loop) asserts that the `dance`, `drop` and `hold` beats saw only the hop's dance, and the beat order is now close, dance, drop, hold, brace, arrive, land.

Real-time hop (cat to wizard): close 0, dance 0.30, drop 1.62, hold 2.83, brace 4.65, arrive 5.17, land 6.18; clips hold `wiggle`, brace and arrive `brace`.

QA on 8765, `PP_PROFILE=.pp-profile-p8d`: qa-ride-keys 13/0, qa-run 14/0, qa-swap 24/0, qa-hero 29/0, qa.mjs 132/0.

## Media

`tools/ride-live.mjs` drives cat to wizard to swallow in real time (no frame stepping, game loop on wall clock) and records with a CDP screencast at 900x800, about 22 fps captured, resampled to 30 fps.

- `out/pass8/ride-fixed.mp4`
- `out/pass8/ride-fixed-strip.jpg`: drop and hold (wiggle poses), brace, then three arrive frames. The last frame shows the wizard island coming down from the top of the frame while the hero rises through the cloud bed on his arrival beam toward the lift tile.

## Unfinished

The arrive beat is 1.0 s and eased out, so in the video the island's descent past the hero is quick; if it reads too fast, lengthen `SEQ.arrive`. The operator has not seen the new capture.
