# Pass 9: island rotation

2026-10-08. The operator asked for a way to turn the island, since some layouts hide their route behind terrain from the fixed camera. The 3d build now turns in 90-degree steps: yaw 45, 135, 225, 315.

## Controls

- `Q` turns left (yaw -90), `E` turns right (yaw +90).
- `E` still lights, opens and rides first. When an interact prompt shows, `E` acts and the view stays put. With no prompt, `E` turns.
- The overlay in the corner (`core/ui.js`) carries a turn-left and turn-right button pair beside the islands link, for touch.
- A turn eases over 0.35 s (`TURN` in `core/game.js`, cubic in-out). Pressing again mid-turn queues the next 90 degrees from the pending target.
- The 2d build has no rotate support (`renderer.onOrient` missing), so the keys do nothing there.

## What follows the yaw

`core/game.js` steps the turn inside the fixed 60 Hz tick and rebuilds `state.proj` each step. Everything that reads `state.proj` follows:

- `screenToWorldDir`: W, the arrow keys and the d-pad still move up on screen. A key held through a turn remaps to the new screen direction when the turn steps.
- Tap-to-walk: the raycast pick runs against the live camera.
- `3d/renderer.js` recomputes `levelScreenBounds`, the fit zoom and the follow clamp whenever `state.proj` changes, then calls its `onOrient` hooks.
- Clouds: the billboard bed re-sorts its instances back to front for the new view direction and recomputes its screen-space light (`uLightScreen`, `uFlip`).
- The x-ray window, the beam shaft, the lift tile and the speed lines already derive their axes from the camera matrices, so they needed no change.
- The ride's hero facing reads `state.proj.dir` at the start of each beat.

## Rides

Rotation is refused while the ride sequence runs and while the hero is locked on a lift. The next island keeps the current yaw: the hero rises into it facing the same way, and Back and Forward keep it too. A direct load or a reload uses the island's saved yaw.

## Persistence

`game.rotate` writes the target yaw into the island's existing localStorage record, `isoworld:things:<level>`, as `yaw`. `core/interact.js` keeps that field when it saves thing state. Load order:

1. `?yaw=` wins, for shots.
2. A ride, swap or Back/Forward carries the current yaw.
3. `hero=0`, `seq=0` and `reset=1` loads use the level default (45 on every island today). `reset=1` also deletes the record.
4. Otherwise the saved yaw, else the level default.

## Shading from the back

The baker shaded side faces by clamping the face angle into the +z..+x quadrant. From yaw 135 both visible sides took the dark tone, from 315 both took the light tone, and the bake dropped corner faces that point at (-x,-z) outright. `sideBand` in `3d/style.js` now walks the full circle:

| Face | Tone |
| --- | --- |
| +z | left (light) |
| +x | right |
| -x | right |
| -z | back, the right tone at 0.8 (linear) |

Every adjacent pair of sides differs, so each yaw shows a light and a dark side. From 225 and 315 the darker side sits on the left of the screen, which reads as the sun sitting behind the island. GLB pack shading darkens -z faces by the same 0.8 so pieces match. The baker no longer culls (-x,-z) faces. Default-yaw shots change only on faces turned more than 117 degrees from +z, which the default camera barely sees.

## Visibility per yaw

`tools/qa-visibility.mjs --yaw=all` probes each island at all four yaws and prints, per route cell and landing, which yaws pass and the best yaw. `PASS` passes at the default yaw, `TURN` passes only after a turn, `FAIL` fails at every yaw. Each island ends with `default yaw 45 d/n, reachable with rotation w/n`, and the run ends with totals.

Run of 2026-10-08, twelve run islands, 276 checks each yaw:

| Yaw | Pass |
| --- | --- |
| 45 (default) | 276/276 |
| 135 | 257/276 |
| 225 | 237/276 |
| 315 | 264/276 |

Default yaw 276/276, reachable with rotation 276/276. Every island was laid out and tuned for yaw 45, so a turn uncovers nothing the default hides; it loses cells instead, most from 225 (cat-medium 13/18, forest-volute 15/19, cosmos-frisket 19/25). The per-cell table in `out/rot/vis-yaw.json` names the cells each yaw hides. A layout pass that wants rotation to pay off can now aim pieces so the 135 or 315 view reads where 45 fails.

## QA

Port 8765, `PP_PROFILE=.pp-profile-rot`:

| Tool | Result |
| --- | --- |
| `qa.mjs` (with the new rotation suite) | 186 pass, 0 fail |
| `qa-ride-keys.mjs` | 13 pass, 0 fail |
| `qa-ride-keys.mjs --yaw 135` | 13 pass, 0 fail |
| `qa-run.mjs` | 14 pass, 0 fail |
| `qa-swap.mjs` | 24 pass, 0 fail |
| `qa-hero.mjs` | 29 pass, 0 fail |
| `qa-levels.mjs` | 238 pass, 0 fail, 1 skip (sharkbear-medium x-ray, unchanged) |
| `qa-visibility.mjs all` | 276/276 |
| `qa-visibility.mjs all --yaw=all` | default 276/276, with rotation 276/276 |

The rotation suite in `qa.mjs` runs at 1200x800 and 400x800 touch: Q and E reach each yaw, W moves up on screen and S down at every yaw, a turn takes about 359 ms, the overlay buttons turn, tap-to-walk and the d-pad work rotated, a reload restores the saved yaw, `hero=0` and `seq=0` stay at 45, `?yaw=225` wins, `reset=1` clears, and the 2d build ignores the keys.

## Left open

- Grass drips and cliff specks sit on the +x and +z faces only, so the back faces look plainer.
