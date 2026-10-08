# Pass 7 phase 5: hero v2 and the clip system

2026-10-07. The hero is a 19-part prim figure under the style bible, posed by seven JSON keyframe clips on `THREE.AnimationMixer`. No skinned mesh, no reference images, no spend.

## Parts

`heroSpec(style)` in `3d/character.js` lists the parts in tile units, rest pose, soles at y 0.02, top of hair at 0.93. `audit()` passes: 4 parts over 0.15 tile (hips, torso, head, hair) against a budget of 12, head 0.37 of height.

| Part | Prim | Size (w h d) | Tone | Joint parent |
| --- | --- | --- | --- | --- |
| hips | chain: rbox + belt box | 0.30 0.08 0.22, belt 0.32 0.04 0.24 | pants, belt | root |
| torso | rbox | 0.32 0.20 0.22 | shirt | hips |
| head (role head) | rbox | 0.36 0.34 0.34 | skin | torso |
| hair | chain: cap + back | 0.40 0.12 0.38, 0.40 0.20 0.10 | hair | head |
| eyes (face) | chain of two boxes | 0.05 0.08 0.02 | eye | head |
| brow (face) | chain of two boxes | 0.07 0.022 0.02 | hair | head |
| mouth (face) | box | 0.07 0.024 0.02 | mouth (ink) | head |
| upperArmL, upperArmR | rbox | 0.085 0.11 0.085 | shirt | torso |
| lowerArmL, lowerArmR | rbox | 0.075 0.09 0.075 | skin | upper arm |
| handL, handR | rbox | 0.085 0.075 0.085 | hand | lower arm |
| upperLegL, upperLegR | rbox | 0.115 0.10 0.115 | pants | hips |
| lowerLegL, lowerLegR | rbox | 0.105 0.11 0.105 | pants | upper leg |
| footL, footR | rbox | 0.13 0.07 0.14 | boot | lower leg |

Each part bakes through `kit()` into its own `Mesh` inside a `Group` named after the part, positioned at the joint pivot in `JOINT_TREE`. Tones come from `ramp()` of the `HERO` base colours, so a level's `palette.hero` override still works. `3d/palette.js` gains `hand` and `mouth`. `docs/STYLE.md` has a new "The hero" section: limb segments stay under 0.15 tile and bake two-tone, and the hero keeps five body ramps.

## Clip format

`3d/clips/<name>.json`, loaded by `3d/clips.js` through JSON module imports:

```json
{ "name": "walk", "duration": 0.8, "loop": true,
  "tracks": { "upperLegL.quaternion": [[0, 0, 0, 0], [0.1, 28.284, 0, 0]],
              "hips.position": [[0, 0, 0, 0], [0.1, 0, 0.042, 0]] } }
```

- Quaternion keys are `[t, ex, ey, ez]` Euler XYZ in degrees, converted to quaternions at load.
- Position keys are offsets from the part's rest position; only `hips.position` is used.
- Every joint a clip leaves out gets a constant rest track (`REST` holds the 7 degree arm splay), so crossfades blend all fifteen joints.
- Rotation sign: +x swings a hanging limb backward, so a knee bend is +x on the lower leg and a forward kick is -x on the upper leg.

| Clip | Length | Loop | Tracks | Keys per track |
| --- | --- | --- | --- | --- |
| idle | 2.0 s | yes | 7 | 7 |
| walk | 0.8 s | yes | 14 | 9 |
| land | 0.5 s | once, back to idle | 11 | 6 |
| brace | 0.6 s | once, holds | 13 | 6 |
| wiggle | 2.0 s | yes | 16 | 9 |
| spin | 2.2 s | yes | 12 | 9 |
| pump | 2.0 s | yes | 15 | 9 |

Playback in `buildCharacter`:

- `walk` replaces the sine cycle; its time follows `actor.walkPhase` (one stride per 2 pi), so the stride matches the old one at any speed.
- Facing yaw stays procedural on the root, damped as before.
- Clip changes crossfade over 0.2 s while `motion.auto` runs. With motion frozen (`t=`, `hero=0`, reduced motion, or `__setTime`), the switch is instant and the clip time follows `uTime`, so shots stay deterministic and `__setTime` scrubs the hero along with the wind. `motion.js` is unchanged.
- `?clip=<name>` loops one clip and ignores walking.
- `root.userData.play(name)` starts a one-shot (`land`, `brace`) for phase 6; `pose(name, t)` sets an exact frame for tools.

## QA

| Check | Result |
| --- | --- |
| `tools/qa-hero.mjs http://localhost:8775` | 29 pass, 0 fail: audit, 19 parts, seven clips with 6 to 9 keys per track, each clip at four phases at 6x inside a 1.2 by 1.4 unit box and moving, walk to idle in 0.217 s, land returns to idle, brace holds, `?clip=wiggle` |
| `tools/qa.mjs http://localhost:8775` | 132 pass, 0 fail |
| `tools/qa-ride-keys.mjs` | 13 pass, 0 fail |
| `tools/qa-visibility.mjs all --json` | tallies unchanged on all twelve islands (cat 16/17, gremlin 22/23, sharkbear 18/19, the rest full); per-cell hero coverage moves by 1 to 2 points; the magenta hero solo still works |
| `tools/cohesion.mjs` on 6x hero close-ups | hero parts, hero face left/top (mean 0.874, worst 0.842) and right/left (mean 0.767) pass on cat-medium and ember-subject; palette CIEDE2000 max 3.46 and 3.84 |

The cohesion runs still fail rows that read level data only: terrain cliff right/left (palette-authored, marked free) and scale bands (`cat-paint-tube-windmill-small`, ember's `arch` and `canopy`).

New tools: `tools/qa-hero.mjs`, `tools/hero-shot.mjs` (one clip at a zoom multiple of the level's fitted view), `tools/hero-media.mjs` (sheet and dance clip), `tools/hero-lib.mjs`.

## Media

- `out/pass7/hero-sheet.jpg`: rest and mid-walk at 1x and 6x on cat-medium and ember-subject.
- `out/pass7/hero-dances.mp4`: 12 s, 4 s each of wiggle, spin and pump at 6x on cat-medium, wind running.

## Spend

$0. The existing hero proportions served, so no Gemini reference images were made.

## Unfinished

- No fortress card yet. The plan's card is a pick-any on the three dances from `hero-dances.mp4` plus the sheet.
- Nothing calls `play("land")` or `play("brace")` yet; phase 6 wires them to the elevator.
- Baked face tones do not follow the hero's live yaw, same as the old hero.
- In wiggle, the hands rise beside the head; the big head still hides most of each arm from the default camera.
