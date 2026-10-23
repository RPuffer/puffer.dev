# Traps

Design catalog for the booby-trapped islands. The operator approved all 53 entries, and all 53 now run (see Implemented). Each entry carries the tags procgen needs to mix traps without breaking an island: footprint, trigger, the rule it teaches or bends, visibility, pull, and exclusions. The machine-readable copy sits at the end of this file. Fortress card `puffer-isoworld-trap-concepts` holds the same set for review.

53 entries: 25 local traps, 6 sequences, 8 whole-island debuffs and 14 puzzles. Visibility: 19 obvious, 19 telegraphed, 15 hidden.

## Implemented

`?level=traps-showcase` puts every trap on the map. The nine first-built traps sit on spokes off a bonfire hub; every other trap gets its own plot hanging off a grid of boulevards south of the hub, and the level's `plots` field maps each plot name to its origin cell. `node tools/qa-traps.mjs` proves each one: it fires the trap, checks what it costs, and walks the way past it or the puzzle's solution.

| Id | Name | Tier | Trigger | Visibility | Health | Showcase spot |
| --- | --- | --- | --- | --- | --- | --- |
| t01 | Four-tile vanish, then the gate | sequence | step | hidden | knock-off | plot `vanish` |
| t02 | Worn-through flagstones | local | step | telegraphed | knock-off | north spoke, guards a chest |
| t03 | Beat spikes | local | timer | obvious | -1 heart | west spoke, guards a chest |
| t04 | Goose plates | local | step | obvious | none | plot `goose` |
| t05 | Banana scuff | local | step | telegraphed | knock-off | plot `banana` |
| t06 | Sneeze dust | local | step | obvious | none | plot `sneeze` |
| t07 | Mimic chest | local | interact | hidden | -1 heart | plot `mimic` |
| t08 | Trapdoor chest | local | interact | hidden | -1 heart | plot `trapdoor` |
| t09 | Prop decoys | local | interact | hidden | none | plot `decoys` |
| t10 | The hole that scoots | local | step | hidden | knock-off | plot `scoot` |
| t11 | Painted hole | local | camera | hidden | knock-off | plot `painted` |
| t12 | Fake spur | local | step | telegraphed | none | plot `spur` |
| t13 | Long-stride plate | local | step | telegraphed | -1 heart | plot `stride` |
| t14 | Painted decoy | local | step | hidden | -1 heart | plot `decoy` |
| t15 | Faith tiles | local | step | obvious | none | plot `faith` |
| t16 | Nothing here | local | step | obvious | none | plot `nothing` |
| t17 | Stone twin | local | look | telegraphed | none | plot `twin` |
| t18 | Spring tile | local | step | telegraphed | none | plot `spring` |
| t19 | Barrel lane | local | timer | obvious | -1 heart | plot `barrel` |
| t20 | Rewind tile | local | step | hidden | none | plot `rewind` |
| t21 | Invisible block | local | step | hidden | -1 heart | north-east road, cell 22,9 |
| t22 | Pancake stone | local | timer | telegraphed | -2 hearts | plot `pancake` |
| t23 | Turntable | local | step | telegraphed | none | plot `turntable` |
| t24 | Boss kick | local | step | telegraphed | knock-off | south-west rim spoke, guards a chest |
| t25 | Arrow plate | local | step | telegraphed | -1 heart | east spoke, plate at 22,12, cover at 24,13, guards a chest |
| t26 | Chariot | local | step | telegraphed | knock-off | south-east lane, notches at 20,18 and 20,21, guards a chest |
| t27 | Kind bridge, still bridge | sequence | step | hidden | knock-off | plot `bridges` |
| t28 | Sign, then sign again | sequence | step | hidden | knock-off | plot `signs` |
| t29 | Empty hall, then the bonk | sequence | step | hidden | -1 heart | plot `hall` |
| t30 | Real chest, then the mimic | sequence | interact | hidden | -1 heart | plot `chests` |
| t31 | Coin trail to a painted hole | sequence | step | hidden | knock-off | plot `coins` |
| t32 | Mirror controls | debuff | arrival | obvious | none | plot `mirror` |
| t33 | Fog | debuff | arrival | obvious | none | the garden past the block |
| t34 | Nap timer | debuff | arrival | obvious | all hearts | plot `nap` |
| t35 | Slick soles | debuff | arrival | obvious | none | plot `slick` |
| t36 | Gusts | debuff | arrival | telegraphed | none | plot `gusts` |
| t37 | Sticky soles | debuff | arrival | obvious | none | plot `sticky` |
| t38 | Stuck camera | debuff | arrival | obvious | none | plot `stuck` |
| t39 | Hiccups | debuff | arrival | telegraphed | none | plot `hiccups` |
| t40 | Order plates | puzzle | step | telegraphed | none | north-west room, gate and chest behind it |
| t41 | Crate push | puzzle | step | obvious | none | plot `crates` |
| t42 | Lights-out floor | puzzle | step | obvious | none | plot `lights` |
| t43 | One-visit floor | puzzle | step | obvious | none | plot `onevisit` |
| t44 | Gaze bridge | puzzle | look | telegraphed | none | plot `gaze` |
| t45 | Valve swap | puzzle | interact | telegraphed | none | plot `valves` |
| t46 | One-angle bridge | puzzle | camera | telegraphed | none | plot `angle` |
| t47 | Flash path | puzzle | step | hidden | none | plot `flash` |
| t48 | Counting gate | puzzle | step | obvious | none | plot `counting` |
| t49 | Mirror twin | puzzle | step | obvious | none | plot `mirrortwin` |
| t50 | Pictogram gates | puzzle | step | telegraphed | none | plot `pictos` |
| t51 | Fuse run | puzzle | timer | obvious | none | plot `fuse` |
| t52 | Ice rink | puzzle | step | obvious | none | south spoke, 3x3 ice with open edges and one rock |
| t53 | Conveyor knot | puzzle | timer | telegraphed | none | plot `belts` |

### How traps run

- A level lists traps beside its things: `"traps": [{ "id", "kind": "t03", "cells": [[x, z], ...], ...kind fields }]`. The kind is the catalog id. `core/traps/catalog.js` holds all 53 rows; `node tools/trap-catalog.mjs` regenerates it from the machine-readable block below.
- `core/traps/kinds.js` holds one runtime per kind with optional `enter`, `update`, `reset`, `reveal`, `disarm`, `worst` and `check` hooks. A new trap adds one entry there and one builder in `3d/traps.js`.
- `core/traps/rules.js` enforces the composition rules: exclusions (a sequence inherits its members' lists), the repeat caps, one debuff and one puzzle, the budget by run position, the lull-then-betray shape, forbidden cells, footprint spacing, a landmark within four cells of a hidden trap, safe dodge cells, lift to lift with every trap at its worst state, and the clean memorized walk. `core/traps/place.js` picks footprints and keeps the first that passes.
- `state.traps` exposes `at(cell)`, `all()`, `reveal(ref)`, `disarm(ref)` (stored under `isoworld:traps:<level>`), `skip(cells, seconds)` for a hop over a cell, and `on(f)`. `state.health.ward()` absorbs the next hit or knock-off.
- Hearts persist under `isoworld:hearts`. `core/dev.js` `resetAll()` clears both keys.

### Rule changes from building it

- Before you rest at any bonfire, you respawn beside the island bonfire, not at the entry lift. After a rest you respawn where you rested.
- Beat spikes run on a 0.5 s beat. A continuous walk across four spike cells takes 1.4 s, so you clear them only by starting on the beat after they drop.
- Worn-through flagstones count a crossing each time you step onto the arc from off it. They heal on respawn with every other trap.
- The boss winds up for 0.7 s when you come within two cells of the kick cell, kicks for 0.25 s, then hops for 1.4 s. Walk past during the hop.
- The chariot charges 0.9 s after the plate and runs the lane at 5.5 cells a second, faster than the hero's 3.2. It keeps making passes until you are three cells clear of the lane for two seconds.
- The arrow plate is the first cell of a straight lane of 4 to 6 cells, so you cannot reach the reward without arming it. A stone slot beside the plate looses one arrow down the lane at 6 cells a second. One cover cell sits beside the lane, off the line of fire, beside lane cell 1 to n-3. The delay is set per lane so a hero who walks straight to the cover reaches it 0.25 s before the arrow does; stopping on the plate, dawdling short of the cover or running the whole lane takes the arrow for one heart. Stepping back off the plate also dodges it. The plate rearms once the arrow has passed and you are off it, and it only arms when you step onto the lane from outside it.
- The boss kick shows a red "!" over the brute for the whole wind-up, a white swoosh on the kick, and a bouncing hop while it recovers.
- Worn-through flagstones guarding a dead end let you in and out once. A second visit drops you.
- A level may set `"trapRules": "showcase"` to skip exclusions, spacing and the one-kind rule. Only the showcase uses it.
- Fog takes an optional `zone` rectangle. The showcase uses it so fog covers the garden and leaves the other spokes readable. On a run island fog covers the whole island.
- Ice (t52) ships as the floor alone, with no rail and no reward yet. A press onto ice slides you cell by cell until a wall, a solid prop or the end of the ice stops you, and an open edge drops you. Routing skips ice.
- Forced movement carries you off edges: a spring fling that lands over the void falls, and so does an ice slide. Knockback traps already knocked you off.
- Sound is not built yet: no drum tick, slide whistle or raspberry audio.
- Debuffs read an optional `zone` rectangle, like fog. The showcase gives each debuff its own garden; on a run island a debuff covers the whole island.
- Trap props (the mimic chest, prop decoys, valve and fuse levers) are things with a `trap` field. The things renderer skips them, the trap draws them with the same chest and lever builders, and F on one raises a `trap-act` event instead of the usual action. Decoys and mimics glow on purpose.
- Faith tiles, gaze glass, the one-angle bridge and the fuse drawbridge keep real floor in the level file and sink it when the trap loads, so layout checks see a reachable island. The trap raises a cell only while its rule holds: you stand beside it, the watcher watches, the camera sits at the bridge's angle, or the fuse burns.
- Banana scuff needs a cell beside the run before the turn so you can cut the corner; the guard rule counts that cell as part of the trap.
- The scooting hole moves once, on the first respawn after it drops you, and a chalk outline marks the cell it left.
- The stone twin opts out of the reward guard: it never hurts, it only stands beside the gate approach.
- Class traps (long-stride plate, painted decoy) run anywhere, but the bake never places them because a run has no class until you pick one. Long-stride reads Ink Step's skipped cell; painted decoy paints only its harmless cell when a reveal power finds it.
- Puzzles open a gate thing whose `open` reads `trap:<id>`, like order plates. On a run island the counting gate puts its gate on the reward pocket and pins the charge behind it.

## Game rules every trap respects

- Movement is one cell per input. A tap is one step and a held key repeats. Touch petals sit on the four screen diagonals and follow the camera, so screen-up stays screen-up after a turn.
- The camera turns in 90 degree steps (Q and E, or a sideways swipe). An island remembers its angle.
- The watcher is the island's focal creature. It turns to watch you while you are inside its radius (3.5 cells) and opens the core gate when you stand on the gate threshold while it watches. It never punishes movement, never patrols, and no trap may make it do either. A trap may read whether it is watching (trigger `look`).
- The island has one bonfire, in the plaza near spawn, one real chest on a stone pad past a dead end, and two lifts on the rim that ride to the previous and next island. Traps never imitate these in a way that changes what the real ones do.
- Interactables glow when you come within a few cells: bonfire, chest, gate, lever, door, ladder and elevator. Traps never glow, except a trap whose joke is the glow (the mimic chest, the prop decoys). Those glow on purpose.
- Shortcuts are doors, kicked ladders or drops, and lever gates (`docs/LEVEL-DESIGN.md`). They open one way from the far side. No trap sits on a shortcut cell, opens one from the near side, or changes the one-way rule.

## Health and respawn

- The hero starts each life with 3 hearts. A trap does not have to throw you off the island to matter: a spike, an arrow or a bonk costs one heart.
- **Knock-off.** Leave the island by any edge and the hero falls into the cloud bed, then respawns at the last lit bonfire with 3 hearts. One press toward the void drops you at once, and a held key that runs off the end of a path drops you too. The one exception: a key you keep holding through a camera turn (Q, E or the turntable) stops at the edge until you press it again, so the turn never walks you off. A fall costs no heart and the ward does not stop it. Losing the last heart does the same with a flop and a puff.
- **Last lit bonfire.** Each island's bonfire sits within three cells of spawn. Before you rest at it, you respawn beside it anyway. The walk back from the bonfire is why shortcuts are worth opening.
- **What survives a respawn.** Opened shortcuts, the chest and the gate stay as they were. Traps reset to their starting state, and hidden ones hide again. An invisible block that bonks you three times before you rest shows a faint chalk outline until the next rest (`CHALK_HITS` in `core/traps/kinds.js`). It took two hits before the gauntlet rebake; memorizing is the skill now, so the hint comes late. The scooting hole still chalks the cell it left, which is part of its joke.
- **Refills.** Resting at a bonfire refills all 3 hearts. A heart pickup is rare: at most one per island, on a reward spot (a lookout, an alcove or a puzzle prize), and it restores one heart up to 3. Nothing raises the cap.
- **Puzzles do not cost hearts.** A puzzle failure resets the puzzle with a raspberry or a cushion bounce and leaves your hearts alone.
- **Health tags.** `none`, `-1 heart`, `-2 hearts`, `all hearts` (empties the hearts, so you respawn) or `knock-off` (respawn at the last lit bonfire). Only the slow, shadow-telegraphed pancake stone takes two; the rest cost one and stack up across an island.

### Health budget

There is none. A first walk through a late island is meant to end in respawns, from hearts or from falls, and the cost of a death is the walk back from the bonfire. The guarantee is the clean memorized walk instead: once you know where every hidden trap is, you can walk from lift to lift without stepping on one (rule 7 below).

## Tags

| Tag | Values |
| --- | --- |
| tier | `local` (one spot), `sequence` (two or three traps bound in route order), `debuff` (the whole island), `puzzle` (a self-contained room or run that gates a reward) |
| footprint | `slot` is a `trapSlot`: a straight spine run of three or more path cells. `shoulder` is an off-path cell beside a path cell. `pocket` is off-path land two or more cells from the path. `arc` is a loop arc. `dead end`, `alcove`, `lookout` and `branch` are route and feature roles from LEVEL-DESIGN. `rN` is a radius in cells. |
| trigger | `step` (entering a cell), `timer` (a beat clock), `look` (the watcher watching), `interact` (F or the use button), `camera` (the camera angle), `arrival` (debuffs: on for the whole island) |
| visibility | `obvious` (you see it and know what it does), `telegraphed` (a tell you can learn: a crack, a shadow, a sound), `hidden` (nothing shows until it fires; you remember where it was) |
| pull | `onto the path` (the trap makes path cells the safe choice), `off the path` (it makes you leave the path), `neutral` |
| health | `none`, `-1 heart`, `-2 hearts`, `all hearts`, `knock-off` |
| exclusions | traps that may not share an island with it. The list is symmetric. |

## Composition rules

Procgen applies these after `checkRoute` passes and before decor, and rejects the island on any violation.

### Placement, every tier

0. **Guard a reward.** An obvious or telegraphed local trap that costs a heart or knocks you off sits on the only approach to a chest, a charge pickup or an item, in a pocket or a dead end with no shoulder to step around it. You get the reward by timing the trap or by disarming it (order plates, a lever, a power). The reward stays optional: lift to lift still passes with the trap's cells blocked. Hidden traps, and visible traps that cost nothing, may sit on routes. `core/traps/rules.js` (`guardProblems`) enforces this, and a trap names its reward with `"guards": { "chest": id }`, `{ "charge": id }` or `{ "at": [x, z] }`.

1. No trap cell on a shortcut cell, ramp landing, lock cell, gate threshold, lift tile or the plaza, and none within two cells of spawn or the bonfire. No trap cell on a teleporter pad or within two cells of an arrival pad, and no trap whose worst state blocks the only walk to a connector pad. A trap may guard the walk to a shortcut or reward pad; the risk is the price of the shortcut.
2. Each trap declares a worst state (holes open, blocks solid, gates up). `checkRoute` runs again with every trap in its worst state, and lift to lift must still pass with only the core gate open. A dark shortcut pad counts as shut in that check.
3. Two trap footprints keep one clear cell between them. Two hidden local traps may touch, so hidden traps can cluster; they never share a cell. Debuffs have no footprint.
4. Each trap kind appears at most once per island, except the hidden step traps: the scooting hole, the painted hole and the rewind tile up to three times each, and the invisible block up to four times (`REPEAT` in `core/traps/rules.js`).
5. A hidden trap gets a landmark within four cells (decor rule 4 in LEVEL-DESIGN), so you can remember the spot.
6. Class-tagged traps roll only when the run's class owns the power they bend.
7. **Clean memorized walk.** With every hidden local trap that costs a heart or knocks you off blocked, on top of every trap at its worst state, lift to lift still passes. A player who remembers each spot can always walk around it. Sequences sit outside this rule because each one is a crossing you learn to time.
8. **Safe dodge cells.** Falls have no teeter, so a barrel dodge, an arrow cover or a chariot notch may not sit on an open edge in the direction you step into it; one held step too many would drop you for doing the right thing.
9. **Lull, then betray.** No hidden trap sits within 6 walking steps of the bonfire (`HIDDEN_CLEAR`), and the hidden traps on an island sit farther from the bonfire on average than its visible ones. The bake fills reward approaches nearest the bonfire with visible traps first and puts hidden traps in clusters of three along the far stretch of the spine and the walks to the core gate and the exit lift.

### Exclusions

Two traps that list each other never share an island. The cap: no trap may exclude more than a quarter of the set (13 of 53). The widest list in this set holds 8 entries, and most hold 0 to 3. A new trap that needs more gets cut or reworked, and so does one whose exclusions grow past the cap as the set grows.

### Budget by run position

| Islands (run order) | Traps (no debuffs) | Visible | Hidden | Sequences | Puzzles | Debuff |
| --- | --- | --- | --- | --- | --- | --- |
| 1 to 2 | 4 to 7 | up to 5 | up to 2 | 0 | 0 or 1 | none |
| 3 to 4 | 6 to 10 | up to 5 | up to 5 | up to 1 | up to 1 | up to 1 |
| 5 to 8 | 8 to 14 | up to 5 | up to 9 | up to 1 | up to 1 | up to 1 |
| 9 to 12 | 11 to 17 | up to 5 | up to 12 | up to 2 | up to 1 | up to 1 |

Visible means obvious or telegraphed local traps; a puzzle counts toward the total and toward neither column. A sequence counts once against the hidden budget. On islands 1 and 2 the visible traps outnumber the hidden ones, so you learn that you can see danger. From island 5 on, hidden traps are the majority. Hidden traps may sit on the spine and on the only walk to the core gate wherever the worst-state and clean-walk checks still pass. A harmless visible trap (health `none`) may sit on the route with no reward behind it. Two islands next to each other in run order never roll the same debuff, puzzle or sequence. `BUDGET`, `HIDDEN_MAJORITY_FROM` and `LEAN_OBVIOUS_UPTO` in `core/traps/rules.js` hold the numbers.

### Sequences

A sequence binds two or three footprints in route order: the comfort member sits closer to the bonfire by walking distance than the betrayal member. It inherits every exclusion of its members. Sequences are the funny-cruel set pieces, so the run spends them late.

### Debuffs

One debuff per island at most. A banner names it on arrival, so every debuff is obvious or telegraphed even when it hides other things. A debuff applies to the whole island except where its entry says otherwise. Its exclusions are the local traps and puzzles that become unreadable or unfair under it.

### Puzzles

One puzzle per island at most. A puzzle sits on a branch, an alcove, a lookout or a loop arc, fits in 5x5 cells with its approach, and gates a reward. It never gates a lock that `checkRoute` needs. Each puzzle has a reset (a bell cell, a cushion or a raspberry) that keeps you on the spot.

## Catalog

| Id | Name | Tier | Footprint | Trigger | Visibility | Pull | Health | Rule it teaches or bends | Excludes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t01 | Four-tile vanish, then the gate | sequence | pocket or shoulder patch, r3; then a later slot | step | hidden | onto the path, then off it | knock-off | Teaches that the path is the safe ground, then makes you leave it. | t29, t35 |
| t02 | Worn-through flagstones | local | loop arc, 3 to 5 path cells | step | telegraphed | neutral | knock-off | Bends free backtracking: a loop is one way per visit, so you come home by the other arc. | t20, t28, t43 |
| t03 | Beat spikes | local | slot, every cell | timer | obvious | onto the path | -1 heart | Teaches tap rhythm against hold-to-repeat. | t19, t26 |
| t04 | Goose plates | local | shoulder cells beside one slot, r1 | step | obvious | onto the path | none | Teaches that the shoulder is noisy and the path is quiet. | t06 |
| t05 | Banana scuff | local | slot end at a turn, 1 cell plus the cell straight on | step | telegraphed | off the path | knock-off | Bends one-cell steps: this cell carries you two. | t18, t35 |
| t06 | Sneeze dust | local | shoulder cells, r1 | step | obvious | onto the path | none | Teaches that the shoulder pushes back. | t04 |
| t07 | Mimic chest | local | dead end or pocket, 1 cell plus r2 chase | interact | hidden | off the path | -1 heart | Bends the chest: the island's real chest sits on its stone pad, and this one is extra. | t08 |
| t08 | Trapdoor chest | local | chest pad over a lower tier, 1 cell | interact | hidden | off the path | -1 heart | Bends the chest reward: you keep the loot and lose the floor. | t07, t30 |
| t09 | Prop decoys | local | pocket or spur tip, 1 cell | interact | hidden | off the path | none | Teaches the fixed frame: the real bonfire sits in the plaza and the real lift on the rim. | t12 |
| t10 | The hole that scoots | local | slot, 2 adjacent cells | step | hidden | off the path | knock-off | Bends memory: you remember the hole, and it moves once. | none |
| t11 | Painted hole | local | slot or shoulder, 1 cell | camera | hidden | off the path | knock-off | Teaches the 90 degree camera: one angle out of four shows the seam. | t31, t33, t38 |
| t12 | Fake spur | local | 3-cell spur off a turn, stone surface, not route | step | telegraphed | onto the path | none | Bends the darker path tile: these flagstones are mossy and crooked, and they lead nowhere. | t09 |
| t13 | Long-stride plate | local | slot, trap cell plus the cell two past it | step | telegraphed | onto the path | -1 heart | Class trap: bends Ink Step, Sprint and Wing Hop, which skip a cell. Class: Wretch (Ink Step), Courier (Sprint, Wing Hop). | none |
| t14 | Painted decoy | local | slot, 2 adjacent cells | step | hidden | onto the path | -1 heart | Class trap: bends the reveal powers once per island. Class: Wretch (Paint the Path, Star Scout), Modernizer (Lantern). | none |
| t15 | Faith tiles | local | 2 to 4 cell gap between two path runs at one height | step | obvious | onto the path | none | Bends solid ground: the path builds itself under your foot. | t21, t24, t29, t35, t36 |
| t16 | Nothing here | local | slot of 5 or more cells | step | obvious | onto the path | none | Teaches nothing, on purpose: the island earns your trust back. | none |
| t17 | Stone twin | local | gate approach, 1 decor cell beside the path | look | telegraphed | onto the path | none | Teaches the watcher rule: the real one turns to face you. | t44 |
| t18 | Spring tile | local | slot, 1 cell plus 2 cells behind | step | telegraphed | onto the path | none | Bends forward progress: this cell sends you back. | t05 |
| t19 | Barrel lane | local | slot of 4 or more cells plus 1 shoulder dodge cell | timer | obvious | off the path | -1 heart | Teaches that the shoulder is a safe pocket on a timer. | t03, t22, t26 |
| t20 | Rewind tile | local | slot, 1 cell | step | hidden | neutral | none | Bends the step count: three of your steps play backwards. | t02 |
| t21 | Invisible block | local | path cell plus a walkable shoulder detour | step | hidden | off the path | -1 heart | Bends the open path: one path cell is solid. | t15 |
| t22 | Pancake stone | local | slot cell under an overhang, r1 | timer | telegraphed | onto the path | -2 hearts | Teaches reading shadows on a step grid. | t19 |
| t23 | Turntable | local | slot cell at a junction, 1 cell | step | telegraphed | neutral | none | Bends the camera: the island turns 90 degrees for you. | t32, t38 |
| t24 | Boss kick | local | rim slot of 3 or more cells, boss on a shoulder cell, r1 | step | telegraphed | onto the path | knock-off | Teaches reading a wind-up: the kick follows a beat you can see. | t15, t26, t35, t36 |
| t25 | Arrow plate | local | straight slot of 4 to 6 cells, plate on its first cell, one cover cell beside it | step | telegraphed | onto the path | -1 heart | Teaches the Souls pressure plate: a raised flagstone looses an arrow you outrun to cover. | none |
| t26 | Chariot | local | straight slot of 5 or more cells with a shoulder notch every 3 cells | step | telegraphed | off the path | knock-off | Teaches the notch: the run is a lane, and the safe cells sit beside it. | t03, t19, t24, t35, t36 |
| t27 | Kind bridge, still bridge | sequence | two bridge segments on the spine, in route order | step | hidden | onto the path | knock-off | Teaches that wobble means safe, then breaks it. | t36 |
| t28 | Sign, then sign again | sequence | two slots in route order, 3 cells each | step | hidden | off the path | knock-off | Teaches a warning, then plays it late. | t02, t43 |
| t29 | Empty hall, then the bonk | sequence | Nothing here, then Invisible block on the next slot | step | hidden | off the path | -1 heart | Teaches trust, then spends it. | t01, t15 |
| t30 | Real chest, then the mimic | sequence | two dead ends on the lattice rim | interact | hidden | off the path | -1 heart | Teaches that chests pay, then makes you check. | t08 |
| t31 | Coin trail to a painted hole | sequence | slot plus shoulder staircase, r3 | step | hidden | off the path | knock-off | Teaches that coins mark the route, then leads you off it. | t11, t33, t38 |
| t32 | Mirror controls | debuff | whole island | arrival | obvious | neutral | none | Bends input: up is down and left is right. | t23, t49 |
| t33 | Fog | debuff | whole island, sight r3 | arrival | obvious | onto the path | none | Bends the vista: you see three cells around you, and the core figure and lamps glow through. | t11, t31, t46, t47 |
| t34 | Nap timer | debuff | whole island | arrival | obvious | onto the path | all hearts | Adds a clock to an island with no clock. | t41, t42, t45, t51 |
| t35 | Slick soles | debuff | whole island except path cells | arrival | obvious | onto the path | none | Bends one-cell steps off the path: you slide one extra cell. | t01, t05, t15, t24, t26, t41, t52, t53 |
| t36 | Gusts | debuff | whole island | arrival | telegraphed | onto the path | none | Adds a push you can see coming. | t15, t24, t26, t27, t41, t48, t49 |
| t37 | Sticky soles | debuff | whole island | arrival | obvious | neutral | none | Bends hold-to-repeat: every step needs its own tap. | none |
| t38 | Stuck camera | debuff | whole island | arrival | obvious | neutral | none | Bends rotation: Q, E and swipe do nothing. | t11, t23, t31, t46 |
| t39 | Hiccups | debuff | whole island | arrival | telegraphed | neutral | none | Bends one-cell steps on a counter. | t41, t42, t43, t47, t48, t53 |
| t40 | Order plates | puzzle | alcove room 3x3 | step | telegraphed | off the path | none | Plate-and-gate: a reward gate opens on the right order. | none |
| t41 | Crate push | puzzle | room up to 4x4 on a lookout or alcove | step | obvious | off the path | none | Sokoban: walking into a crate pushes it one cell. | t34, t35, t36, t39 |
| t42 | Lights-out floor | puzzle | 3x3 tile grid plus 1 entry cell | step | obvious | off the path | none | Tile-flip: each cell you enter flips itself and its four neighbours. | t34, t39 |
| t43 | One-visit floor | puzzle | 3x4 tile grid | step | obvious | off the path | none | Each tile crumbles when you leave it: visit every tile once and end on the exit. | t02, t28, t39 |
| t44 | Gaze bridge | puzzle | glass cells inside the watcher's radius, off the gate threshold | look | telegraphed | onto the path | none | Watcher-gaze routing: the watcher turns to watch you inside its radius, and glass goes solid while it does. | t17 |
| t45 | Valve swap | puzzle | loop arc with two gates and two levers, apart from the shortcut lever | interact | telegraphed | off the path | none | Shortcut state: each lever swaps which of two gates is open. | t34 |
| t46 | One-angle bridge | puzzle | 4-cell broken bridge to a lookout | camera | telegraphed | onto the path | none | Rotation: the bridge is whole from one camera angle. | t33, t38 |
| t47 | Flash path | puzzle | 4x4 wobble grid | step | hidden | off the path | none | Memory path: the safe cells glow once. | t33, t39 |
| t48 | Counting gate | puzzle | branch run of 4 to 7 path cells ending at a reward gate | step | obvious | onto the path | none | Step counting: the gate shows a tally. | t36, t39 |
| t49 | Mirror twin | puzzle | two parallel 2x4 strips | step | obvious | off the path | none | Mirror room: a ghost copies your moves left for right. | t32, t36 |
| t50 | Pictogram gates | puzzle | three waymarks on the spine plus a 3-gate branch | step | telegraphed | off the path | none | Memory: the gate that opens matches the last pictogram you passed. | none |
| t51 | Fuse run | puzzle | branch lever plus a drawbridge of up to 6 cells | timer | obvious | off the path | none | A visible fuse gives you ten beats. | t34 |
| t52 | Ice rink | puzzle | 5x5 ice room with a low rail | step | obvious | off the path | none | Ice slide: one input slides you until you hit something. | t35 |
| t53 | Conveyor knot | puzzle | 4x4 belt grid plus a switch | timer | telegraphed | off the path | none | Belts carry you one cell per beat; a switch flips half the arrows. | t35, t39 |

## Exclusion pairs

- t01 Four-tile vanish, then the gate / t29 Empty hall, then the bonk
- t01 Four-tile vanish, then the gate / t35 Slick soles
- t02 Worn-through flagstones / t20 Rewind tile
- t02 Worn-through flagstones / t28 Sign, then sign again
- t02 Worn-through flagstones / t43 One-visit floor
- t03 Beat spikes / t19 Barrel lane
- t03 Beat spikes / t26 Chariot
- t04 Goose plates / t06 Sneeze dust
- t05 Banana scuff / t18 Spring tile
- t05 Banana scuff / t35 Slick soles
- t07 Mimic chest / t08 Trapdoor chest
- t08 Trapdoor chest / t30 Real chest, then the mimic
- t09 Prop decoys / t12 Fake spur
- t11 Painted hole / t31 Coin trail to a painted hole
- t11 Painted hole / t33 Fog
- t11 Painted hole / t38 Stuck camera
- t15 Faith tiles / t21 Invisible block
- t15 Faith tiles / t24 Boss kick
- t15 Faith tiles / t29 Empty hall, then the bonk
- t15 Faith tiles / t35 Slick soles
- t15 Faith tiles / t36 Gusts
- t17 Stone twin / t44 Gaze bridge
- t19 Barrel lane / t22 Pancake stone
- t19 Barrel lane / t26 Chariot
- t23 Turntable / t32 Mirror controls
- t23 Turntable / t38 Stuck camera
- t24 Boss kick / t26 Chariot
- t24 Boss kick / t35 Slick soles
- t24 Boss kick / t36 Gusts
- t26 Chariot / t35 Slick soles
- t26 Chariot / t36 Gusts
- t27 Kind bridge, still bridge / t36 Gusts
- t28 Sign, then sign again / t43 One-visit floor
- t31 Coin trail to a painted hole / t33 Fog
- t31 Coin trail to a painted hole / t38 Stuck camera
- t32 Mirror controls / t49 Mirror twin
- t33 Fog / t46 One-angle bridge
- t33 Fog / t47 Flash path
- t34 Nap timer / t41 Crate push
- t34 Nap timer / t42 Lights-out floor
- t34 Nap timer / t45 Valve swap
- t34 Nap timer / t51 Fuse run
- t35 Slick soles / t41 Crate push
- t35 Slick soles / t52 Ice rink
- t35 Slick soles / t53 Conveyor knot
- t36 Gusts / t41 Crate push
- t36 Gusts / t48 Counting gate
- t36 Gusts / t49 Mirror twin
- t38 Stuck camera / t46 One-angle bridge
- t39 Hiccups / t41 Crate push
- t39 Hiccups / t42 Lights-out floor
- t39 Hiccups / t43 One-visit floor
- t39 Hiccups / t47 Flash path
- t39 Hiccups / t48 Counting gate
- t39 Hiccups / t53 Conveyor knot

## Entries

### t01 Four-tile vanish, then the gate

Sequence | pulls onto the path, then pushes off it | hidden | health: knock-off | excludes t29, t35

Step on four off-path cells in a row inside a three-cell patch and all four drop away; the hero windmills and flops into the clouds. Later, on the safe path, a pop-up gate springs across your way. The only way around is a three-cell detour off the path that skirts the old patch, so you have to remember which cells dropped.

### t02 Worn-through flagstones

Local trap | neutral | telegraphed | health: knock-off | excludes t20, t28, t43

Flagstones on a loop arc crack a little each time you cross them, and the third crossing drops you into the clouds with a slide whistle. The cracks show from the first crossing. You walk back to the bonfire by the loop's other arc, which is the route the island wanted anyway.

### t03 Beat spikes

Local trap | pulls onto the path | obvious | health: -1 heart | excludes t19, t26

Spikes rise out of a straight run on the third beat of every four, with a drum tick on each beat. Hold a direction and you walk onto a raised spike: one heart, a yelp, and a poke back one cell. Tapping in time gets you through untouched.

### t04 Goose plates

Local trap | pulls onto the path | obvious | health: none | excludes t06

The off-path cells beside a straight run hide plates that honk and puff feathers. The third honk on the island calls a goose, which waddles onto the next path cell and sits there for four beats. It is a goose; you wait.

### t05 Banana scuff

Local trap | pushes off the path | telegraphed | health: knock-off | excludes t18, t35

The last flagstone before a turn has a faint scuff mark. Step on it and you slide one extra cell straight ahead, over the rim and into the clouds with a long cartoon whistle. Cut the corner one cell early and you skip it.

### t06 Sneeze dust

Local trap | pulls onto the path | obvious | health: none | excludes t04

Dusty off-path cells puff a visible cloud when you step on them. The hero sneezes and the sneeze knocks them one cell back to where they came from. It costs a step and a tissue, nothing else.

### t07 Mimic chest

Local trap | pushes off the path | hidden | health: -1 heart | excludes t08

A second chest sits at a dead end, identical to the real one. It glows like the real chest as you approach, because that is the joke. Open it and it grows teeth and hops after you for five hops; if it lands on you it bites one heart, then gets bored and coughs up a coin. Rotate the camera to its back first and you catch its tail wagging.

### t08 Trapdoor chest

Local trap | pushes off the path | hidden | health: -1 heart | excludes t07, t30

Open the real chest and its stone pad drops one tier with you on it. You land on your bottom for one heart, on a ledge with a ramp back to the low road, loot in hand. The ledge never touches a shortcut's far side.

### t09 Prop decoys

Local trap | pushes off the path | hidden | health: none | excludes t12

A prop glows like an interactable as you come near, on purpose. It is a campfire in a far pocket that answers F with a puff of smoke and a cough, a lever that comes off in your hand, or a lift pad at a spur tip that plays two seconds of the ride dance and plops you back down. One decoy per island, and none of them hurt.

### t10 The hole that scoots

Local trap | pushes off the path | hidden | health: knock-off | excludes none

A path cell gives way and you flop. Come back and the hole has scooted one cell along the run, so the cell you avoided is now the hole. It only moves once.

### t11 Painted hole

Local trap | pushes off the path | hidden | health: knock-off | excludes t31, t33, t38

A canvas painted to look like ground stretches over a hole. From three camera angles it matches the floor; from the fourth you see the seam and the painter's signature. Walk on it and you tear through like a paper banner.

### t12 Fake spur

Local trap | pulls onto the path | telegraphed | health: none | excludes t09

Three mossy flagstones branch off a turn and look like route. They end at a smug sign that reads "made you look" and a single coin. Nothing bad happens beyond the walk back.

### t13 Long-stride plate

Local trap | pulls onto the path | telegraphed | health: -1 heart | excludes none | class: Wretch (Ink Step), Courier (Sprint, Wing Hop)

A plate sits two cells past an obvious trap cell, right where a skip lands. Land on it and a boxing glove pops out, takes one heart and bonks you back to where you started the skip. Walking, Ward or Unjam gets through.

### t14 Painted decoy

Local trap | pulls onto the path | hidden | health: -1 heart | excludes none | class: Wretch (Paint the Path, Star Scout), Modernizer (Lantern)

Paint the Path, Lantern or Star Scout outlines a cell in magenta, and that cell is only a honk plate. The real trap, a spike plate worth one heart, sits on the next cell and skips the reveal. Each island lies to a reveal power once at most.

### t15 Faith tiles

Local trap | pulls onto the path | obvious | health: none | excludes t21, t24, t29, t35, t36

The path runs to the edge and stops over open sky. Step forward and a flagstone rises to meet your foot, one per step, until you reach the far side. Step back and they sink again; nothing falls but your stomach.

### t16 Nothing here

Local trap | pulls onto the path | obvious | health: none | excludes none

A long straight run dressed like a trap, with scorch marks and a warning sign. Nothing happens on any cell. The last cell holds a sign that says "thanks for being careful".

### t17 Stone twin

Local trap | pulls onto the path | telegraphed | health: none | excludes t44

A statue of the island's focal creature stands beside the gate approach, nearer the path than the real watcher. It never turns, so players stand in front of it and wait. The real watcher stands three cells on and turns the moment you reach its threshold.

### t18 Spring tile

Local trap | pulls onto the path | telegraphed | health: none | excludes t05

A coil peeks from under one flagstone. Step on it and you boing two cells back the way you came and land in a pose. Step around it on the shoulder and it sulks.

### t19 Barrel lane

Local trap | pushes off the path | obvious | health: -1 heart | excludes t03, t22, t26

A barrel rolls down a straight run every six beats. Step onto the shoulder cell beside the run to let it pass. If it catches you, it takes one heart and you roll back to the start of the run with it, dizzy.

### t20 Rewind tile

Local trap | neutral | hidden | health: none | excludes t02

One flagstone plays a VHS rewind squeal and walks you three cells back along your own trail, backwards. You lose three steps and keep everything else.

### t21 Invisible block

Local trap | pushes off the path | hidden | health: -1 heart | excludes t15

An invisible block sits on a path cell. You bonk into it for one heart, a star pops, and the block shows as a cyan outline from then on. You step around it on the shoulder.

### t22 Pancake stone

Local trap | pulls onto the path | telegraphed | health: -2 hearts | excludes t19

A stone face hangs over one cell and slams down on every fourth beat when you stand under it or beside it. Its shadow grows before each slam. A hit costs two hearts and flattens the hero into a pancake for two beats; they peel off and carry on.

### t23 Turntable

Local trap | neutral | telegraphed | health: none | excludes t32, t38

A painted turntable spins you and the camera a quarter turn when you step on it. Screen-up now points a different way down the route, and you reorient. Turn the camera back with Q or E whenever you like.

### t24 Boss kick

Local trap | pulls onto the path | telegraphed | health: knock-off | excludes t15, t26, t35, t36

A big brute stands on the shoulder of a run along the rim and lifts one foot as you come level with it, then kicks on the next beat and punts you off the island with a satisfied grunt. Wait a beat or step back, let it whiff, and walk past while it hops to regain its balance.

### t25 Arrow plate

Local trap | pulls onto the path | telegraphed | health: -1 heart | excludes none

The first flagstone of a straight run sits a hair higher than the rest, and a stone slot stands beside it. Step on it and the slot glows, then looses an arrow down the run; an arrow in the hat costs one heart. Race to the cover cell beside the run before the arrow arrives, or step back off the plate and let it fly.

### t26 Chariot

Local trap | pushes off the path | telegraphed | health: knock-off | excludes t03, t19, t24, t35, t36

Wheel ruts score a long straight run, and a plate at its top end wakes a skeleton chariot that rumbles down the lane. It runs anything on the run off the end of the map. Duck into a notch beside the lane, let it thunder past, and keep walking before it turns for another pass.

### t27 Kind bridge, still bridge

Sequence | pulls onto the path | hidden | health: knock-off | excludes t36

The first plank bridge shakes on every step and holds, so you learn that wobble is fine. The next bridge stays still, and its third plank drops you into the clouds. On the way back, the still one is the one you test.

### t28 Sign, then sign again

Sequence | pushes off the path | hidden | health: knock-off | excludes t02, t43

A big sign and a creak warn that the first run drops each tile one beat after you leave it, and it does. The second run has the same sign, but it drops the tile in front of you, and the creak plays half a beat late. Wait for the creak, then step.

### t29 Empty hall, then the bonk

Sequence | pushes off the path | hidden | health: -1 heart | excludes t01, t15

You walk the long, scorched, signposted hallway of Nothing here and nothing happens. The very next run holds an invisible block on its second cell. You walk into it at full confidence and lose a heart.

### t30 Real chest, then the mimic

Sequence | pushes off the path | hidden | health: -1 heart | excludes t08

The first dead end holds the real chest, and it pays. A later dead end holds an identical chest that glows just the same, and it is a mimic worth one heart if it catches you. The tail wag from the reverse angle gives it away if you think to look.

### t31 Coin trail to a painted hole

Sequence | pushes off the path | hidden | health: knock-off | excludes t11, t33, t38

Four coins sit on path cells and you collect them. Each coin after that drifts one cell off the path as you grab the one before, in a staircase. The last coin sits on a painted hole.

### t32 Mirror controls

Whole-island debuff | neutral | obvious | health: none | excludes t23, t49

A banner and a swirl announce it on arrival: every direction is reversed for the island. Touch petals swap too. Resting at the bonfire clears it for ten steps.

### t33 Fog

Whole-island debuff | pulls onto the path | obvious | health: none | excludes t11, t31, t46, t47

Fog rolls in on arrival and you see three cells around the hero. Lamps, waymarks and the core figure glow through it, so the route still reads. The fog lifts within three cells of a lit bonfire.

### t34 Nap timer

Whole-island debuff | pulls onto the path | obvious | health: all hearts | excludes t41, t42, t45, t51

A sleepy sun counts down three minutes from arrival. At zero the hero yawns, drops every heart and wakes at the last lit bonfire with every opened shortcut still open. Resting at the bonfire resets the sun.

### t35 Slick soles

Whole-island debuff | pulls onto the path | obvious | health: none | excludes t01, t05, t15, t24, t26, t41, t52, t53

Every off-path cell is glazed with ice for the island. Step onto one and you slide one cell further, and the path flagstones are the only grip. Sliding into a rock or decor stops you with a bonk. The bake leaves a bare-ground apron (the `grip` list) around every pickup, chest side and guarded trap, so the ice never puts a reward out of reach; `checkCharges` walks the island with the slides and fails the bake if a pickup or chest side cannot be reached.

### t36 Gusts

Whole-island debuff | pulls onto the path | telegraphed | health: none | excludes t15, t24, t26, t27, t41, t48, t49

Every sixth beat a gust shoves you one cell downwind, and the flags on the island flap a beat before. The gust never pushes you off an edge; you crouch instead. Path flagstones and the plaza sit out of the wind.

### t37 Sticky soles

Whole-island debuff | neutral | obvious | health: none | excludes none

Your boots squelch and holding a direction stops repeating. Each step needs its own tap. Everything else on the island plays as normal.

### t38 Stuck camera

Whole-island debuff | neutral | obvious | health: none | excludes t11, t23, t31, t46

The camera arrives jammed at one of its four angles, and Q, E and the rotate swipe do nothing. The see-through window still keeps the hero visible. The bonfire cannot fix it; the next island can.

### t39 Hiccups

Whole-island debuff | neutral | telegraphed | health: none | excludes t41, t42, t43, t47, t48, t53

The hero has the hiccups, and every seventh step carries them one extra cell. A counter by the hero shows the next one coming. A hiccup into an edge or a wall becomes a bonk instead.

### t40 Order plates

Puzzle | pushes off the path | telegraphed | health: none | excludes none

Four plates sit in a small room with a lamp beside each. Step in and the lamps flash an order; press the plates in that order to open the reward gate. A wrong plate blows a raspberry and all four reset.

### t41 Crate push

Puzzle | pushes off the path | obvious | health: none | excludes t34, t35, t36, t39

Walking into a crate pushes it one cell if the cell beyond is clear. Push a crate onto the plate and the reward gate stays open. A bell in the corner poofs the crates back to the start.

### t42 Lights-out floor

Puzzle | pushes off the path | obvious | health: none | excludes t34, t39

Each cell you enter flips itself and its four neighbours between lit and dark. Light all nine and a bridge to the reward rises. The bake only seeds starting patterns its solver can clear in a few moves, and a bell resets the floor.

### t43 One-visit floor

Puzzle | pushes off the path | obvious | health: none | excludes t02, t28, t39

Each tile crumbles behind you. Visit all twelve once and finish on the exit tile to open the reward. A wrong move drops you onto a cloud cushion that bounces you back to the start of the grid.

### t44 Gaze bridge

Puzzle | pulls onto the path | telegraphed | health: none | excludes t17

Glass cells near the watcher shimmer and go solid while the watcher is turned to watch you. Leave its radius and the glass fades. Plan a route that stays inside the radius all the way across, or drop to the ledge below and walk back.

### t45 Valve swap

Puzzle | pushes off the path | telegraphed | health: none | excludes t34

Two coloured gates sit on a loop, one open and one shut, and a lever at each end swaps them. The reward needs you through both, so you pull, walk, and pull again from the far side. The island's real shortcut lever stays one way.

### t46 One-angle bridge

Puzzle | pulls onto the path | telegraphed | health: none | excludes t33, t38

A broken bridge lines up into one walkable span from only one of the four camera angles. Rotate until it reads whole, then walk it. Rotate away mid-span and the pieces drift apart and drop you onto a cushion below.

### t47 Flash path

Puzzle | pushes off the path | hidden | health: none | excludes t33, t39

Step on the start cell and a safe line across a wobbly 4x4 grid glows for two seconds. Walk it from memory. A wrong cell dunks you in a puddle and sends you back to the start cell, where it glows again.

### t48 Counting gate

Puzzle | pulls onto the path | obvious | health: none | excludes t36, t39

A reward gate carries a tally of N marks and opens after N steps in a row on its approach. A step off the path resets the tally with a raspberry. A later gate wants a different N.

### t49 Mirror twin

Puzzle | pushes off the path | obvious | health: none | excludes t32, t36

A ghost on a parallel strip copies each step you take, left for right. When the ghost walks into a wall it stays put, so you use walls to line it up. Put you and the ghost on your two plates together to open the reward.

### t50 Pictogram gates

Puzzle | pushes off the path | telegraphed | health: none | excludes none

Three waymarks along the route carry pictograms. At a branch, three gates carry pictograms too, and only the one that matches the last waymark opens to the reward. The wrong two tip you onto a lower ledge with a coin and a ramp back.

### t51 Fuse run

Puzzle | pushes off the path | obvious | health: none | excludes t34

A lever off the route lights a fuse and lowers a drawbridge to a reward for ten beats. Run it. If the bridge rises under you, you ride it up and slide off backwards onto the near side.

### t52 Ice rink

Puzzle | pushes off the path | obvious | health: none | excludes t35

One tap slides you across the ice until a rock or the rail stops you. Reach the exit cell to claim the reward. The rail means you cannot fall, only bump.

### t53 Conveyor knot

Puzzle | pushes off the path | telegraphed | health: none | excludes t35, t39

Belt cells carry you one cell per beat in the direction of their arrows. A switch at the edge flips half the arrows. Find the switch state that delivers you to the reward.

## Run placements (spoilers)

The operator meets these blind. Keep them out of cards, commit subjects, README and notifications. `tools/bake-layout.mjs` `TRAP_PLAN` sets the kinds; `placeTraps` puts each one on the only approach to a reward and pins a charge pickup when the reward is a pickup.

| Island | Level | Traps |
| --- | --- | --- |
| 1 | cat-medium | t18 Spring tile on 20,13 guards c1; t03 Beat spikes on 30,4 to 29,4 guards charge kg2 at 28,4; t16 Nothing here on 22,16 to 18,16 guards charge kg3 at 18,15; t06 Sneeze dust on 21,8 to 21,7 guards charge kg4 at 21,6; t20 Rewind tile on 5,32; t21 Invisible block on 11,30 |
| 2 | wizard-medium | t05 Banana scuff on 31,4 guards charge kg1 at 30,3; t25 Arrow plate on 35,14 to 38,14 guards charge kg2 at 38,15; t04 Goose plates on 14,39 to 18,39 guards charge kg3 at 18,38; t22 Pancake stone on 26,7 guards charge kg4 at 25,7; t10 The hole that scoots on 4,30 to 4,29; t21 Invisible block on 6,37 |
| 3 | swallow-medium | t03 Beat spikes on 36,20 to 39,20 guards charge kg1 at 40,20; t02 Worn-through flagstones on 35,10 to 37,10 guards charge kg2 at 38,10; t18 Spring tile on 24,8 guards charge kg3 at 24,7; t21 Invisible block on 9,14; t21 Invisible block on 9,13; t10 The hole that scoots on 11,7 to 11,8; t11 Painted hole on 15,7; t07 Mimic chest on 25,6 |
| 4 | forest-volute | t37 Sticky soles over the whole island; t17 Stone twin on 11,6; t48 Counting gate on 15,28 to 15,24 guards charge kg3 at 14,24; t04 Goose plates on 15,32 to 19,32 guards charge kg4 at 21,35; t20 Rewind tile on 5,5; t20 Rewind tile on 5,6; t21 Invisible block on 7,9; t21 Invisible block on 8,9; t10 The hole that scoots on 14,5 to 13,5 |
| 5 | mindbloom-medium | t38 Stuck camera over the whole island; t06 Sneeze dust on 4,42 guards charge kg2 at 3,42; t16 Nothing here on 14,30 to 10,30 guards charge kg3 at 10,29; t03 Beat spikes on 20,36 to 23,36 guards charge kg4 at 23,35; t10 The hole that scoots on 9,5 to 8,5; t10 The hole that scoots on 11,5 to 10,5; t21 Invisible block on 11,6; t21 Invisible block on 11,7; t21 Invisible block on 35,11; t20 Rewind tile on 8,4; t20 Rewind tile on 35,12 |
| 6 | cosmos-frisket | t35 Slick soles over the whole island; t48 Counting gate on 9,9 to 14,9 guards charge kg2 at 14,10; t12 Fake spur on 17,18 to 17,20 guards charge kg3 at 18,20; t22 Pancake stone on 6,16 guards charge kg4 at 6,17; t20 Rewind tile on 24,22; t20 Rewind tile on 25,22; t21 Invisible block on 25,21; t21 Invisible block on 25,20; t10 The hole that scoots on 20,16 to 21,16; t10 The hole that scoots on 18,16 to 19,16; t11 Painted hole on 19,17 |
| 7 | gremlin-subject | t32 Mirror controls over the whole island; t30 Real chest, then the mimic on 27,39; t18 Spring tile on 34,35 guards charge kg3 at 34,36; t03 Beat spikes on 34,30 to 35,30 guards charge kg4 at 36,30; t16 Nothing here on 15,27 to 15,23 guards charge kg5 at 13,23; t21 Invisible block on 16,19; t21 Invisible block on 16,20; t10 The hole that scoots on 17,23 to 17,22; t10 The hole that scoots on 25,27 to 24,27; t11 Painted hole on 5,9; t11 Painted hole on 19,28; t20 Rewind tile on 16,18 |
| 8 | eagle-composition | t39 Hiccups over the whole island; t07 Mimic chest on 15,13; t19 Barrel lane on 29,37 to 25,37 guards charge kg3 at 24,37; t12 Fake spur on 42,37 to 44,37 guards charge kg4 at 45,37; t16 Nothing here on 40,29 to 40,25 guards charge kg5 at 41,25; t21 Invisible block on 5,6; t21 Invisible block on 12,11; t21 Invisible block on 13,11; t10 The hole that scoots on 13,13 to 13,12; t10 The hole that scoots on 12,20 to 12,19; t11 Painted hole on 14,14; t20 Rewind tile on 10,13; t20 Rewind tile on 12,17 |
| 9 | dragon-medium | t36 Gusts over the whole island; t25 Arrow plate on 14,31 to 11,31 guards charge kg2 at 10,31; t29 Empty hall, then the bonk on 17,29 to 13,29; t03 Beat spikes on 14,35 to 12,35 guards charge kg4 at 11,35; t22 Pancake stone on 17,22 guards charge kg5 at 16,22; t16 Nothing here on 39,8 to 39,12; t11 Painted hole on 18,31; t21 Invisible block on 39,6; t21 Invisible block on 38,6; t21 Invisible block on 37,6; t10 The hole that scoots on 23,27 to 24,27; t10 The hole that scoots on 22,28 to 22,27; t10 The hole that scoots on 22,30 to 22,29; t11 Painted hole on 13,25; t11 Painted hole on 14,25; t20 Rewind tile on 15,26 |
| 10 | sharkbear-medium | t34 Nap timer over the whole island; t28 Sign, then sign again on 32,36 to 32,34 guards charge kg2 at 38,34; t19 Barrel lane on 14,37 to 10,37 guards charge kg3 at 9,36; t18 Spring tile on 25,39; t20 Rewind tile on 31,32; t21 Invisible block on 32,32; t21 Invisible block on 25,37; t21 Invisible block on 25,36; t10 The hole that scoots on 26,36 to 26,37; t11 Painted hole on 24,35; t11 Painted hole on 24,37; t11 Painted hole on 33,32; t20 Rewind tile on 24,36 |
| 11 | chimera-medium | t33 Fog over the whole island; t30 Real chest, then the mimic on 4,27; t25 Arrow plate on 49,42 to 46,42 guards charge kg3 at 46,43; t18 Spring tile on 6,18; t16 Nothing here on 10,19 to 10,23; t21 Invisible block on 9,44; t21 Invisible block on 10,44; t21 Invisible block on 10,43; t21 Invisible block on 10,39; t10 The hole that scoots on 10,34 to 10,35; t10 The hole that scoots on 10,28 to 10,29; t10 The hole that scoots on 6,25 to 6,26; t20 Rewind tile on 10,30; t20 Rewind tile on 6,24; t20 Rewind tile on 6,23; t09 Prop decoys on 19,30 |
| 12 | ember-subject | t32 Mirror controls over the whole island; t31 Coin trail to a painted hole on 25,42 to 21,40 guards charge kg2 at 22,45; t48 Counting gate on 36,40 to 39,40 guards charge kg3 at 40,40; t12 Fake spur on 39,36 to 39,38 guards charge kg4 at 40,38; t04 Goose plates on 38,28 to 34,28 guards charge kg5 at 34,29; t21 Invisible block on 27,18; t21 Invisible block on 28,18; t21 Invisible block on 29,22; t21 Invisible block on 28,22; t10 The hole that scoots on 26,22 to 27,22; t10 The hole that scoots on 26,24 to 26,23; t10 The hole that scoots on 26,26 to 26,25; t20 Rewind tile on 26,27; t20 Rewind tile on 18,19; t20 Rewind tile on 18,20 |

The bake leaves these traps off run islands: t01 (no pocket patch with a later gate slot and detour), t08 (no island chest pad sits beside a lower tier), t13 and t14 (class traps; the bake has no class), t23 (it fits, and the plan spends visible slots on other kinds), t24 and t26 (no guard shape in the bake yet), t27 (the layout builds no bridges), and every puzzle but the counting gate (the layout builds no puzzle rooms with a reward gate behind them). Hidden locals may share a reward approach with a guard; they pin no charge of their own. The repeated hidden step traps form clusters of up to three along the far stretch of each island.

Spring tile fires once per life and flings you two cells back the way you came. Pancake stone hangs over its cell on two posts; its shadow grows for 1.5 s, it slams for 2 hearts, rests and lifts. Every guarded reward is optional: lift to lift passes with the trap cells blocked.

## Machine-readable

```json
[
 {
  "id": "t01",
  "name": "Four-tile vanish, then the gate",
  "tier": "sequence",
  "footprint": "pocket or shoulder patch, r3; then a later slot",
  "trigger": "step",
  "visibility": "hidden",
  "health": "knock-off",
  "pull": "onto the path, then off it",
  "rule": "Teaches that the path is the safe ground, then makes you leave it.",
  "excludes": [
   "t29",
   "t35"
  ],
  "members": [
   "pop-up gate (inline)"
  ]
 },
 {
  "id": "t02",
  "name": "Worn-through flagstones",
  "tier": "local",
  "footprint": "loop arc, 3 to 5 path cells",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "knock-off",
  "pull": "neutral",
  "rule": "Bends free backtracking: a loop is one way per visit, so you come home by the other arc.",
  "excludes": [
   "t20",
   "t28",
   "t43"
  ]
 },
 {
  "id": "t03",
  "name": "Beat spikes",
  "tier": "local",
  "footprint": "slot, every cell",
  "trigger": "timer",
  "visibility": "obvious",
  "health": "-1 heart",
  "pull": "onto the path",
  "rule": "Teaches tap rhythm against hold-to-repeat.",
  "excludes": [
   "t19",
   "t26"
  ]
 },
 {
  "id": "t04",
  "name": "Goose plates",
  "tier": "local",
  "footprint": "shoulder cells beside one slot, r1",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Teaches that the shoulder is noisy and the path is quiet.",
  "excludes": [
   "t06"
  ]
 },
 {
  "id": "t05",
  "name": "Banana scuff",
  "tier": "local",
  "footprint": "slot end at a turn, 1 cell plus the cell straight on",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "knock-off",
  "pull": "off the path",
  "rule": "Bends one-cell steps: this cell carries you two.",
  "excludes": [
   "t18",
   "t35"
  ]
 },
 {
  "id": "t06",
  "name": "Sneeze dust",
  "tier": "local",
  "footprint": "shoulder cells, r1",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Teaches that the shoulder pushes back.",
  "excludes": [
   "t04"
  ]
 },
 {
  "id": "t07",
  "name": "Mimic chest",
  "tier": "local",
  "footprint": "dead end or pocket, 1 cell plus r2 chase",
  "trigger": "interact",
  "visibility": "hidden",
  "health": "-1 heart",
  "pull": "off the path",
  "rule": "Bends the chest: the island's real chest sits on its stone pad, and this one is extra.",
  "excludes": [
   "t08"
  ]
 },
 {
  "id": "t08",
  "name": "Trapdoor chest",
  "tier": "local",
  "footprint": "chest pad over a lower tier, 1 cell",
  "trigger": "interact",
  "visibility": "hidden",
  "health": "-1 heart",
  "pull": "off the path",
  "rule": "Bends the chest reward: you keep the loot and lose the floor.",
  "excludes": [
   "t07",
   "t30"
  ]
 },
 {
  "id": "t09",
  "name": "Prop decoys",
  "tier": "local",
  "footprint": "pocket or spur tip, 1 cell",
  "trigger": "interact",
  "visibility": "hidden",
  "health": "none",
  "pull": "off the path",
  "rule": "Teaches the fixed frame: the real bonfire sits in the plaza and the real lift on the rim.",
  "excludes": [
   "t12"
  ]
 },
 {
  "id": "t10",
  "name": "The hole that scoots",
  "tier": "local",
  "footprint": "slot, 2 adjacent cells",
  "trigger": "step",
  "visibility": "hidden",
  "health": "knock-off",
  "pull": "off the path",
  "rule": "Bends memory: you remember the hole, and it moves once.",
  "excludes": []
 },
 {
  "id": "t11",
  "name": "Painted hole",
  "tier": "local",
  "footprint": "slot or shoulder, 1 cell",
  "trigger": "camera",
  "visibility": "hidden",
  "health": "knock-off",
  "pull": "off the path",
  "rule": "Teaches the 90 degree camera: one angle out of four shows the seam.",
  "excludes": [
   "t31",
   "t33",
   "t38"
  ]
 },
 {
  "id": "t12",
  "name": "Fake spur",
  "tier": "local",
  "footprint": "3-cell spur off a turn, stone surface, not route",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "onto the path",
  "rule": "Bends the darker path tile: these flagstones are mossy and crooked, and they lead nowhere.",
  "excludes": [
   "t09"
  ]
 },
 {
  "id": "t13",
  "name": "Long-stride plate",
  "tier": "local",
  "footprint": "slot, trap cell plus the cell two past it",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "-1 heart",
  "pull": "onto the path",
  "rule": "Class trap: bends Ink Step, Sprint and Wing Hop, which skip a cell.",
  "excludes": [],
  "class": "Wretch (Ink Step), Courier (Sprint, Wing Hop)"
 },
 {
  "id": "t14",
  "name": "Painted decoy",
  "tier": "local",
  "footprint": "slot, 2 adjacent cells",
  "trigger": "step",
  "visibility": "hidden",
  "health": "-1 heart",
  "pull": "onto the path",
  "rule": "Class trap: bends the reveal powers once per island.",
  "excludes": [],
  "class": "Wretch (Paint the Path, Star Scout), Modernizer (Lantern)"
 },
 {
  "id": "t15",
  "name": "Faith tiles",
  "tier": "local",
  "footprint": "2 to 4 cell gap between two path runs at one height",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Bends solid ground: the path builds itself under your foot.",
  "excludes": [
   "t21",
   "t24",
   "t29",
   "t35",
   "t36"
  ]
 },
 {
  "id": "t16",
  "name": "Nothing here",
  "tier": "local",
  "footprint": "slot of 5 or more cells",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Teaches nothing, on purpose: the island earns your trust back.",
  "excludes": []
 },
 {
  "id": "t17",
  "name": "Stone twin",
  "tier": "local",
  "footprint": "gate approach, 1 decor cell beside the path",
  "trigger": "look",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "onto the path",
  "rule": "Teaches the watcher rule: the real one turns to face you.",
  "excludes": [
   "t44"
  ]
 },
 {
  "id": "t18",
  "name": "Spring tile",
  "tier": "local",
  "footprint": "slot, 1 cell plus 2 cells behind",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "onto the path",
  "rule": "Bends forward progress: this cell sends you back.",
  "excludes": [
   "t05"
  ]
 },
 {
  "id": "t19",
  "name": "Barrel lane",
  "tier": "local",
  "footprint": "slot of 4 or more cells plus 1 shoulder dodge cell",
  "trigger": "timer",
  "visibility": "obvious",
  "health": "-1 heart",
  "pull": "off the path",
  "rule": "Teaches that the shoulder is a safe pocket on a timer.",
  "excludes": [
   "t03",
   "t22",
   "t26"
  ]
 },
 {
  "id": "t20",
  "name": "Rewind tile",
  "tier": "local",
  "footprint": "slot, 1 cell",
  "trigger": "step",
  "visibility": "hidden",
  "health": "none",
  "pull": "neutral",
  "rule": "Bends the step count: three of your steps play backwards.",
  "excludes": [
   "t02"
  ]
 },
 {
  "id": "t21",
  "name": "Invisible block",
  "tier": "local",
  "footprint": "path cell plus a walkable shoulder detour",
  "trigger": "step",
  "visibility": "hidden",
  "health": "-1 heart",
  "pull": "off the path",
  "rule": "Bends the open path: one path cell is solid.",
  "excludes": [
   "t15"
  ]
 },
 {
  "id": "t22",
  "name": "Pancake stone",
  "tier": "local",
  "footprint": "slot cell under an overhang, r1",
  "trigger": "timer",
  "visibility": "telegraphed",
  "health": "-2 hearts",
  "pull": "onto the path",
  "rule": "Teaches reading shadows on a step grid.",
  "excludes": [
   "t19"
  ]
 },
 {
  "id": "t23",
  "name": "Turntable",
  "tier": "local",
  "footprint": "slot cell at a junction, 1 cell",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "neutral",
  "rule": "Bends the camera: the island turns 90 degrees for you.",
  "excludes": [
   "t32",
   "t38"
  ]
 },
 {
  "id": "t24",
  "name": "Boss kick",
  "tier": "local",
  "footprint": "rim slot of 3 or more cells, boss on a shoulder cell, r1",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "knock-off",
  "pull": "onto the path",
  "rule": "Teaches reading a wind-up: the kick follows a beat you can see.",
  "excludes": [
   "t15",
   "t26",
   "t35",
   "t36"
  ]
 },
 {
  "id": "t25",
  "name": "Arrow plate",
  "tier": "local",
  "footprint": "straight slot of 4 to 6 cells, plate on its first cell, one cover cell beside it",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "-1 heart",
  "pull": "onto the path",
  "rule": "Teaches the Souls pressure plate: a raised flagstone looses an arrow you outrun to cover.",
  "excludes": []
 },
 {
  "id": "t26",
  "name": "Chariot",
  "tier": "local",
  "footprint": "straight slot of 5 or more cells with a shoulder notch every 3 cells",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "knock-off",
  "pull": "off the path",
  "rule": "Teaches the notch: the run is a lane, and the safe cells sit beside it.",
  "excludes": [
   "t03",
   "t19",
   "t24",
   "t35",
   "t36"
  ]
 },
 {
  "id": "t27",
  "name": "Kind bridge, still bridge",
  "tier": "sequence",
  "footprint": "two bridge segments on the spine, in route order",
  "trigger": "step",
  "visibility": "hidden",
  "health": "knock-off",
  "pull": "onto the path",
  "rule": "Teaches that wobble means safe, then breaks it.",
  "excludes": [
   "t36"
  ]
 },
 {
  "id": "t28",
  "name": "Sign, then sign again",
  "tier": "sequence",
  "footprint": "two slots in route order, 3 cells each",
  "trigger": "step",
  "visibility": "hidden",
  "health": "knock-off",
  "pull": "off the path",
  "rule": "Teaches a warning, then plays it late.",
  "excludes": [
   "t02",
   "t43"
  ]
 },
 {
  "id": "t29",
  "name": "Empty hall, then the bonk",
  "tier": "sequence",
  "footprint": "Nothing here, then Invisible block on the next slot",
  "trigger": "step",
  "visibility": "hidden",
  "health": "-1 heart",
  "pull": "off the path",
  "rule": "Teaches trust, then spends it.",
  "excludes": [
   "t01",
   "t15"
  ],
  "members": [
   "t16",
   "t21"
  ]
 },
 {
  "id": "t30",
  "name": "Real chest, then the mimic",
  "tier": "sequence",
  "footprint": "two dead ends on the lattice rim",
  "trigger": "interact",
  "visibility": "hidden",
  "health": "-1 heart",
  "pull": "off the path",
  "rule": "Teaches that chests pay, then makes you check.",
  "excludes": [
   "t08"
  ],
  "members": [
   "t07"
  ]
 },
 {
  "id": "t31",
  "name": "Coin trail to a painted hole",
  "tier": "sequence",
  "footprint": "slot plus shoulder staircase, r3",
  "trigger": "step",
  "visibility": "hidden",
  "health": "knock-off",
  "pull": "off the path",
  "rule": "Teaches that coins mark the route, then leads you off it.",
  "excludes": [
   "t11",
   "t33",
   "t38"
  ],
  "members": [
   "t11"
  ]
 },
 {
  "id": "t32",
  "name": "Mirror controls",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "health": "none",
  "pull": "neutral",
  "rule": "Bends input: up is down and left is right.",
  "excludes": [
   "t23",
   "t49"
  ]
 },
 {
  "id": "t33",
  "name": "Fog",
  "tier": "debuff",
  "footprint": "whole island, sight r3",
  "trigger": "arrival",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Bends the vista: you see three cells around you, and the core figure and lamps glow through.",
  "excludes": [
   "t11",
   "t31",
   "t46",
   "t47"
  ]
 },
 {
  "id": "t34",
  "name": "Nap timer",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "health": "all hearts",
  "pull": "onto the path",
  "rule": "Adds a clock to an island with no clock.",
  "excludes": [
   "t41",
   "t42",
   "t45",
   "t51"
  ]
 },
 {
  "id": "t35",
  "name": "Slick soles",
  "tier": "debuff",
  "footprint": "whole island except path cells",
  "trigger": "arrival",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Bends one-cell steps off the path: you slide one extra cell.",
  "excludes": [
   "t01",
   "t05",
   "t15",
   "t24",
   "t26",
   "t41",
   "t52",
   "t53"
  ]
 },
 {
  "id": "t36",
  "name": "Gusts",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "onto the path",
  "rule": "Adds a push you can see coming.",
  "excludes": [
   "t15",
   "t24",
   "t26",
   "t27",
   "t41",
   "t48",
   "t49"
  ]
 },
 {
  "id": "t37",
  "name": "Sticky soles",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "health": "none",
  "pull": "neutral",
  "rule": "Bends hold-to-repeat: every step needs its own tap.",
  "excludes": []
 },
 {
  "id": "t38",
  "name": "Stuck camera",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "health": "none",
  "pull": "neutral",
  "rule": "Bends rotation: Q, E and swipe do nothing.",
  "excludes": [
   "t11",
   "t23",
   "t31",
   "t46"
  ]
 },
 {
  "id": "t39",
  "name": "Hiccups",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "neutral",
  "rule": "Bends one-cell steps on a counter.",
  "excludes": [
   "t41",
   "t42",
   "t43",
   "t47",
   "t48",
   "t53"
  ]
 },
 {
  "id": "t40",
  "name": "Order plates",
  "tier": "puzzle",
  "footprint": "alcove room 3x3",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "off the path",
  "rule": "Plate-and-gate: a reward gate opens on the right order.",
  "excludes": []
 },
 {
  "id": "t41",
  "name": "Crate push",
  "tier": "puzzle",
  "footprint": "room up to 4x4 on a lookout or alcove",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "off the path",
  "rule": "Sokoban: walking into a crate pushes it one cell.",
  "excludes": [
   "t34",
   "t35",
   "t36",
   "t39"
  ]
 },
 {
  "id": "t42",
  "name": "Lights-out floor",
  "tier": "puzzle",
  "footprint": "3x3 tile grid plus 1 entry cell",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "off the path",
  "rule": "Tile-flip: each cell you enter flips itself and its four neighbours.",
  "excludes": [
   "t34",
   "t39"
  ]
 },
 {
  "id": "t43",
  "name": "One-visit floor",
  "tier": "puzzle",
  "footprint": "3x4 tile grid",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "off the path",
  "rule": "Each tile crumbles when you leave it: visit every tile once and end on the exit.",
  "excludes": [
   "t02",
   "t28",
   "t39"
  ]
 },
 {
  "id": "t44",
  "name": "Gaze bridge",
  "tier": "puzzle",
  "footprint": "glass cells inside the watcher's radius, off the gate threshold",
  "trigger": "look",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "onto the path",
  "rule": "Watcher-gaze routing: the watcher turns to watch you inside its radius, and glass goes solid while it does.",
  "excludes": [
   "t17"
  ]
 },
 {
  "id": "t45",
  "name": "Valve swap",
  "tier": "puzzle",
  "footprint": "loop arc with two gates and two levers, apart from the shortcut lever",
  "trigger": "interact",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "off the path",
  "rule": "Shortcut state: each lever swaps which of two gates is open.",
  "excludes": [
   "t34"
  ]
 },
 {
  "id": "t46",
  "name": "One-angle bridge",
  "tier": "puzzle",
  "footprint": "4-cell broken bridge to a lookout",
  "trigger": "camera",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "onto the path",
  "rule": "Rotation: the bridge is whole from one camera angle.",
  "excludes": [
   "t33",
   "t38"
  ]
 },
 {
  "id": "t47",
  "name": "Flash path",
  "tier": "puzzle",
  "footprint": "4x4 wobble grid",
  "trigger": "step",
  "visibility": "hidden",
  "health": "none",
  "pull": "off the path",
  "rule": "Memory path: the safe cells glow once.",
  "excludes": [
   "t33",
   "t39"
  ]
 },
 {
  "id": "t48",
  "name": "Counting gate",
  "tier": "puzzle",
  "footprint": "branch run of 4 to 7 path cells ending at a reward gate",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "onto the path",
  "rule": "Step counting: the gate shows a tally.",
  "excludes": [
   "t36",
   "t39"
  ]
 },
 {
  "id": "t49",
  "name": "Mirror twin",
  "tier": "puzzle",
  "footprint": "two parallel 2x4 strips",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "off the path",
  "rule": "Mirror room: a ghost copies your moves left for right.",
  "excludes": [
   "t32",
   "t36"
  ]
 },
 {
  "id": "t50",
  "name": "Pictogram gates",
  "tier": "puzzle",
  "footprint": "three waymarks on the spine plus a 3-gate branch",
  "trigger": "step",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "off the path",
  "rule": "Memory: the gate that opens matches the last pictogram you passed.",
  "excludes": []
 },
 {
  "id": "t51",
  "name": "Fuse run",
  "tier": "puzzle",
  "footprint": "branch lever plus a drawbridge of up to 6 cells",
  "trigger": "timer",
  "visibility": "obvious",
  "health": "none",
  "pull": "off the path",
  "rule": "A visible fuse gives you ten beats.",
  "excludes": [
   "t34"
  ]
 },
 {
  "id": "t52",
  "name": "Ice rink",
  "tier": "puzzle",
  "footprint": "5x5 ice room with a low rail",
  "trigger": "step",
  "visibility": "obvious",
  "health": "none",
  "pull": "off the path",
  "rule": "Ice slide: one input slides you until you hit something.",
  "excludes": [
   "t35"
  ]
 },
 {
  "id": "t53",
  "name": "Conveyor knot",
  "tier": "puzzle",
  "footprint": "4x4 belt grid plus a switch",
  "trigger": "timer",
  "visibility": "telegraphed",
  "health": "none",
  "pull": "off the path",
  "rule": "Belts carry you one cell per beat; a switch flips half the arrows.",
  "excludes": [
   "t35",
   "t39"
  ]
 }
]
```
