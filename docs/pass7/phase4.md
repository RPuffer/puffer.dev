# Pass 7 phase 4: speed lines and shaft scroll

2026-10-08. Main checkout, dev server on 8765, `PP_PROFILE=.pp-profile-p7-4b`. No spend.

## Built

Commits 9598819..5d32c02.

| Commit | Change |
| --- | --- |
| 9598819 | `3d/clouds/billboards.js`: a 24-sprite loop column streams past the deck during the ride |
| 2a3762b | `3d/renderer.js`: fx hook, departing deck and shaft keep their colours, bg holds, lift-off flash |
| c90b95e | `core/sequence.js`: ride direction (`s.dir`, -1 on a back ride), flash at drop, departing colours held to arrival, island label toast |
| da36064 | `3d/speedlines.js` wired behind `?lines=a\|b`; `?seq=hold` freezes a ride at the hold; `tools/hold-shot.mjs` |
| e0d0919 | `tools/perf.mjs --query=seq=hold` measures the frozen hold; `=` inside flag values parses |
| f3520f6, 5d32c02 | renderer warms the ride fx with `compileAsync` at boot, then uploads buffers, so the first ride does not stall |

`3d/speedlines.js` draws two things. The overlay is one screen quad with polar noise around the hero, centre clear. The streaks are one `InstancedMesh` wrapped on `uRide` in the vertex shader. Line colour is the island `ink` mixed toward `bg`, so light islands get dark lines and dark islands get pale ones.

| Density | Overlay lines | Width | Streaks | Inner clear |
| --- | --- | --- | --- | --- |
| a | 44 | 0.14 | 140 | 0.30 |
| b | 96 | 0.10 | 300 | 0.27 |

Arrival: `core/sequence.js` calls `things.say(islandLabel(next))` at swap and at commit, and the entry elevator lands in the `landing` state with `lift` easing from `rise` to rest plus an overshoot dip, mirroring the departure.

## Perf

Swiftshader, 900x800, 300 frames, billboards on. Baseline is normal play (`hero=0`); hold is `seq=hold`.

| Level | Baseline 1x | Hold a 1x | Hold b 1x | Baseline 2x | Hold a 2x | Hold b 2x |
| --- | --- | --- | --- | --- | --- | --- |
| cat-medium | 28.5 ms | 12.6 ms | 14.1 ms | 93.6 ms | 38.3 ms | 39.6 ms |
| ember-subject | 27.1 ms | 10.0 ms | 11.3 ms | 95.0 ms | 28.1 ms | 29.6 ms |

Target: hold under 1.5x the billboard frame. Worst case is hold b on cat-medium at 1x, 0.49x. The hold hides the island (2052 tris against 18397), so the fx cost less than the terrain they replace. Density b adds 1.3 to 1.5 ms over a.

## QA

| Tool | Result |
| --- | --- |
| `qa-ride-keys` | 13 pass, 0 fail |
| `qa-run` | 14 pass, 0 fail, 0 skip |
| `qa-swap` | 24 pass, 0 fail; memory geo 33/33, tex 2/2 on both laps; worst swap bake 28 ms (dragon-medium) |
| `qa.mjs` | 132 pass, 0 fail |
| `qa-hero` | 29 pass, 0 fail |
| `qa-levels` | 238 pass, 0 fail, 1 skip (sharkbear-medium see-through multi-cell) |
| `qa-visibility` | all islands match the phase 3 log |

## Media

`out/pass7/` (gitignored):

- `ride-a.mp4`, `ride-b.mp4`: 900x800, 21.2 s, cat-medium to forest-volute over three hops. I re-rendered ride-a on current code because the old cut predated c90b95e and ran 14.1 s.
- `ride-phone.mp4`: 400x800, density a, same route.
- `hold-{cat,wizard,chimera,ember}-{a,b}-{900x800,400x800}.png`: 16 hold stills.
- `hold-sheet.jpg`: 900x800 stills, density a on top, b below.

On the sheet, cat and wizard carry grey ink lines on cream and chimera and ember carry pale lines on black and brown. Both read as a fall down the shaft, so I did not tune.

## Unfinished

- Density pick: needs the operator's pick-one card across `ride-a.mp4` and `ride-b.mp4`. Until he picks, `?lines` defaults to a.
- Phone perf is swiftshader only; the on-device check belongs to phase 7.
