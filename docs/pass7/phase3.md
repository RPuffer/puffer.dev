# Pass 7 phase 3: sequence controller, close-in, island drop

2026-10-07. Main checkout, dev server on 8765, `PP_PROFILE=.pp-profile-p7-3`. No spend. This pass also carries the light parts of phase 6: dance picker, `brace`, `land`, the hero facing the camera.

## Built

`core/sequence.js` holds every timing in `SEQ`. Press E on an exit and the run goes:

| t (s) | Beat | What happens |
| --- | --- | --- |
| 0.00 | `close` | zoom blends from fit to `closeZoom` (hero 30% of viewport height) over 1.2 s, ease inOut; the camera unclamps by the same factor; hero turns to the camera; `preload(next)` starts |
| 0.30 | `dance` | next clip from a session counter over `DANCES` filtered to 2.3 s or less: wiggle, spin, pump |
| 1.62 | `drop` | deck at RISE; terrain, decor, things and the cloud bed fall `dropSpan()` units, ease in, 1.2 s; the riding deck and its shaft stay pinned |
| 2.62 | `brace` | `brace` clip, ±0.01 jitter |
| 2.83 | `hold` | island gone; next island stages in three frames once preload resolves; hold lasts at least 1.8 s, at most 8 s |
| 4.65 | `arrive` | `pushState`, `__swapCount` +1; next island slides up 1.0 s ease out with its entry deck under the hero; zoom returns to fit; deck settles RISE to 0 over the last 0.6 s with a 0.05 dip |
| 5.67 | `land` | `land` crossfades to idle, hero unlocks |

Every hop on all twelve islands measured 5.67 s, because preload finishes inside the 1.8 s minimum hold.

Pieces:

- `3d/renderer.js`: `seq({ k, y, keep, shake, frac })` drives zoom blend `k`, island offset `y`, the pinned lift and jitter. `zoomScale` is zoom over fit zoom. `dropSpan()` returns the island's screen height plus two close-zoom frame heights over `cos(pitch)`, about 35 units on cat. `detach()` hides an island without freeing it; `dispose()` frees it. `adopt()` takes the cloud meshes so they drop with the island. `fadeBg()` crossfades `scene.background` over 0.6 s across the swap.
- `3d/things.js`: `t.lift` overrides ride easing, and `keep(id)` pins one deck and shaft against the group offset.
- `3d/clouds/billboards.js`: the vertex shader now applies `modelMatrix`, identity at rest.
- `core/run.js`: `stager()` returns the three staging steps (load with the old island detached, `renderer.compile()`, dispose the old island); `commit()` pushes the URL; `onLoad()`; `use(sequence)`. `navigate` hands the ride to the sequence when one runs.
- `core/game.js`: `onTick()` listeners and `load({ keep })`.
- `3d/character.js`: `play(name, { fade, at })`, so the rebuilt hero comes up in the brace pose.
- `window.__sequence`: `state`, `beat`, `time`, `zoomScale`, `hops` (beats, dance and total per hop), `freeze(beat)`, `abort()`.
- Phase 4 hook: `rideUniforms.uRide` (0 to 1, in from 2.2 s over 0.5 s, out over 0.6 s at arrival) and `uRideTime`, exported from `core/sequence.js`. No lines yet.

## Fail and short paths

- Load error: preload rejected (blocked `wizard-medium.json`), `fail` at 1.62, zoom and drop run back over 1.0 s, `things.stall()` returns the deck, toast "The lift stalls", `__swapError` holds the fetch message. A second E full-loads through `defaultNavigate`.
- Cap: a 12 s delayed fetch hit the 8 s hold cap at 10.83 s and ran the same path back.
- `?seq=0`, `hero=0`, `t=`, `prefers-reduced-motion`: the deck rises 1.6 s, then a `bg` veil covers 0.3 s, swaps, uncovers 0.3 s. Total 2.23 s.
- `popstate` and a persisted `pageshow` call `abort()`.
- `nav=0` skips the sequence, so `ride-clip.mjs`, `walk.mjs --live` and `qa-visibility.mjs` see the old behaviour.

## The post-swap stall

The phase 2 stall came from disposal order. `unmount()` disposed every material before the next island compiled, each shader program's refcount hit zero, and three relinked them all on the first frame. Staging now compiles the new island while the old one is still alive, then disposes it. The instant `run.swap` path (short path, Back and Forward, `qa-swap`'s lap closer) uses the same order. Bake to second frame dropped from 175 to 304 ms to 32 to 34 ms on every island; boot stays at 91 ms.

## Wiggle facing the camera

At 105 degrees the upper arms folded behind the head from the front. They now sit at 80 degrees with a 25 degree forward swing (`3d/clips/wiggle.json`, upper arm tracks only), so sleeve, forearm and hand read on both sides. `qa-hero` still passes the 1.2 by 1.4 box.

## QA

| Check | Result |
| --- | --- |
| `qa-ride-keys.mjs` | 13 pass, 0 fail; every hop logs close, dance, drop, brace, hold, arrive, land in order, `zoomScale` 1.000, swapCount +1, no `__swapError` |
| `qa-run.mjs` | 14 pass, 0 fail, 0 skip |
| `qa-swap.mjs` | 24 pass, 0 fail; geometries 30/30, textures 2/2 after both laps |
| `qa.mjs` | 132 pass, 0 fail |
| `qa-hero.mjs` | 29 pass, 0 fail |
| `qa-levels.mjs` | 238 pass, 0 fail, 1 skip (sharkbear see-through window, as before) |
| `qa-visibility.mjs all --json` | per-island tallies identical to `66e6b3b` served from a worktree; 22 cells move one coverage point, and two runs of `66e6b3b` move the same cells by the same point |

Logs: `out/pass7/p3-*.log`.

## Media

`tools/seq-clip.mjs` teleports to each exit, presses E and steps the game 1/30 s per frame.

- `out/pass7/sequence-900x800.mp4`: cat to wizard to swallow to forest-volute, three hops with wiggle, spin and pump, 21.2 s. Beat stills in `sequence-900x800-beats.jpg`.
- `out/pass7/sequence-400x800.mp4`: the same three hops at phone size, 21.2 s.

## Unfinished

- No fortress card for the clips.
- The deck and shaft switch to the next island's colours and rail side at the start of the hold. Phase 4's streaks should cover the cut.
- The baked cage crossbar at 2.6 passes in front of the hero's head as the island drops.
- Not built: lamp brighten, the 0.12 s `bg` flash, the label toast, a mirrored direction for entry rides (entry rides run the same table with `arrive=exit`), the cloud loop column.
