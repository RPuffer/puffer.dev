# Traps

Design catalog for the booby-trapped islands. Nothing here is built yet. Each entry carries the tags procgen needs to mix traps without breaking an island: footprint, trigger, the rule it teaches or bends, visibility, pull, and exclusions. The machine-readable copy sits at the end of this file. Fortress card `puffer-isoworld-trap-concepts` holds the same set for review.

Fifty entries: 22 local traps, 6 sequences, 8 whole-island debuffs and 14 puzzles. Visibility: 19 obvious, 16 telegraphed, 15 hidden.

## Game rules every trap respects

- Movement is one cell per input. A tap is one step and a held key repeats. Touch petals sit on the four screen diagonals and follow the camera, so screen-up stays screen-up after a turn.
- The camera turns in 90 degree steps (Q and E, or a sideways swipe). An island remembers its angle.
- The watcher is the island's focal creature. It turns to watch you while you are inside its radius (3.5 cells) and opens the core gate when you stand on the gate threshold while it watches. It never punishes movement, never patrols, and no trap may make it do either. A trap may read whether it is watching (trigger `look`).
- The island has one bonfire, in the plaza near spawn, one real chest on a stone pad past a dead end, and two lifts on the rim that ride to the previous and next island. Traps never imitate these in a way that changes what the real ones do.
- Shortcuts are doors, kicked ladders or drops, and lever gates (`docs/LEVEL-DESIGN.md`). They open one way from the far side. No trap sits on a shortcut cell, opens one from the near side, or changes the one-way rule.

## Failure is a pratfall

- **Flop.** A fall: the hero windmills, drops into the cloud bed with a slide whistle and respawns at the bonfire (the entry lift before the bonfire is lit). Opened shortcuts, the chest and the gate stay as they were. Traps reset to their starting state, hidden ones hidden again.
- **Bonk.** A knock: the hero loses one or two beats or a few cells, then carries on. No respawn.
- **Puzzle reset.** A puzzle failure resets the puzzle only, with a raspberry or a cushion bounce. It never sends you to the bonfire.
- Nothing takes items, coins or progress. A hidden trap that flops you twice on one visit shows a faint chalk outline until the next rest.

## Tags

| Tag | Values |
| --- | --- |
| tier | `local` (one spot), `sequence` (two or three traps bound in route order), `debuff` (the whole island), `puzzle` (a self-contained room or run that gates a reward) |
| footprint | `slot` is a `trapSlot`: a straight spine run of three or more path cells. `shoulder` is an off-path cell beside a path cell. `pocket` is off-path land two or more cells from the path. `arc` is a loop arc. `dead end`, `alcove`, `lookout` and `branch` are route and feature roles from LEVEL-DESIGN. `rN` is a radius in cells. |
| trigger | `step` (entering a cell), `timer` (a beat clock), `look` (the watcher watching), `interact` (F or the use button), `camera` (the camera angle), `arrival` (debuffs: on for the whole island) |
| visibility | `obvious` (you see it and know what it does), `telegraphed` (a tell you can learn: a crack, a shadow, a sound), `hidden` (nothing shows until it fires; you remember where it was) |
| pull | `onto the path` (the trap makes path cells the safe choice), `off the path` (it makes you leave the path), `neutral` |
| exclusions | traps that may not share an island with it. The list is symmetric. |

## Composition rules

Procgen applies these after `checkRoute` passes and before decor, and rejects the island on any violation.

### Placement, every tier

1. No trap cell on a shortcut cell, ramp landing, lock cell, gate threshold, lift tile or the plaza, and none within two cells of spawn or the bonfire.
2. Each trap declares a worst state (holes open, blocks solid, gates up). `checkRoute` runs again with every trap in its worst state, and lift to lift must still pass with only the core gate open.
3. Two trap footprints keep two clear cells between them unless a sequence binds them.
4. Each trap kind appears at most once per island.
5. A hidden trap gets a landmark within four cells (decor rule 4 in LEVEL-DESIGN), so you can remember the spot.
6. Class-tagged traps roll only when the run's class owns the power they bend.

### Exclusions

Two traps that list each other never share an island. The cap: no trap may exclude more than a quarter of the set (12 of 50). The widest list in this set holds 6 entries, and most hold 0 to 3. A new trap that needs more than 12 gets cut or reworked, and so does one whose exclusions grow past 12 as the set grows.

### Budget by run position

| Islands (run order) | Local traps | Hidden | Sequences | Puzzles | Debuff |
| --- | --- | --- | --- | --- | --- |
| 1 to 3 | up to 2 | 0 | 0 | 0 or 1 | none |
| 4 to 8 | up to 4 | up to 1 | up to 1 | up to 1 | up to 1 |
| 9 to 12 | up to 5 | up to 2 | up to 1 | up to 1 | up to 1 |

A sequence counts its members as local traps and counts once against the hidden budget. An island with a debuff takes one local trap fewer. Two islands next to each other in run order never roll the same debuff, puzzle or sequence.

### Sequences

A sequence binds two or three footprints in route order: the comfort member sits closer to the bonfire by walking distance than the betrayal member. It inherits every exclusion of its members. Sequences are the funny-cruel set pieces, so the run spends them late.

### Debuffs

One debuff per island at most. A banner names it on arrival, so every debuff is obvious or telegraphed even when it hides other things. A debuff applies to the whole island except where its entry says otherwise. Its exclusions are the local traps and puzzles that become unreadable or unfair under it.

### Puzzles

One puzzle per island at most. A puzzle sits on a branch, an alcove, a lookout or a loop arc, fits in 5x5 cells with its approach, and gates a reward. It never gates a lock that `checkRoute` needs. Each puzzle has a reset (a bell cell, a cushion or a raspberry) that keeps you on the spot.

## Catalog

| Id | Name | Tier | Footprint | Trigger | Visibility | Pull | Rule it teaches or bends | Excludes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t01 | Four-tile vanish, then the gate | sequence | pocket or shoulder patch, r3; then a later slot | step | hidden | onto the path, then off it | Teaches that the path is the safe ground, then makes you leave it. | t26, t32 |
| t02 | Worn-through flagstones | local | loop arc, 3 to 5 path cells | step | telegraphed | neutral | Bends free backtracking: a loop is one way per visit, so you come home by the other arc. | t20, t25, t40 |
| t03 | Beat spikes | local | slot, every cell | timer | obvious | onto the path | Teaches tap rhythm against hold-to-repeat. | t19 |
| t04 | Goose plates | local | shoulder cells beside one slot, r1 | step | obvious | onto the path | Teaches that the shoulder is noisy and the path is quiet. | t06 |
| t05 | Banana scuff | local | slot end at a turn, 1 cell plus the cell straight on | step | telegraphed | off the path | Bends one-cell steps: this cell carries you two. | t18, t32 |
| t06 | Sneeze dust | local | shoulder cells, r1 | step | obvious | onto the path | Teaches that the shoulder pushes back. | t04 |
| t07 | Mimic chest | local | dead end or pocket, 1 cell plus r2 chase | interact | hidden | off the path | Bends the chest: the island's real chest sits on its stone pad, and this one is extra. | t08 |
| t08 | Trapdoor chest | local | chest pad over a lower tier, 1 cell | interact | hidden | off the path | Bends the chest reward: you keep the loot and lose the floor. | t07, t27 |
| t09 | Prop decoys | local | pocket or spur tip, 1 cell | interact | hidden | off the path | Teaches the fixed frame: the real bonfire sits in the plaza and the real lift on the rim. | t12 |
| t10 | The hole that scoots | local | slot, 2 adjacent cells | step | hidden | off the path | Bends memory: you remember the hole, and it moves once. | none |
| t11 | Painted hole | local | slot or shoulder, 1 cell | camera | hidden | off the path | Teaches the 90 degree camera: one angle out of four shows the seam. | t28, t30, t35 |
| t12 | Fake spur | local | 3-cell spur off a turn, stone surface, not route | step | telegraphed | onto the path | Bends the darker path tile: these flagstones are mossy and crooked, and they lead nowhere. | t09 |
| t13 | Long-stride plate | local | slot, trap cell plus the cell two past it | step | telegraphed | onto the path | Class trap: bends Ink Step, Sprint and Wing Hop, which skip a cell. Class: Wretch (Ink Step), Courier (Sprint, Wing Hop). | none |
| t14 | Painted decoy | local | slot, 2 adjacent cells | step | hidden | onto the path | Class trap: bends the reveal powers once per island. Class: Wretch (Paint the Path, Star Scout), Modernizer (Lantern). | none |
| t15 | Faith tiles | local | 2 to 4 cell gap between two path runs at one height | step | obvious | onto the path | Bends solid ground: the path builds itself under your foot. | t21, t26, t32, t33 |
| t16 | Nothing here | local | slot of 5 or more cells | step | obvious | onto the path | Teaches nothing, on purpose: the island earns your trust back. | none |
| t17 | Stone twin | local | gate approach, 1 decor cell beside the path | look | telegraphed | onto the path | Teaches the watcher rule: the real one turns to face you. | t41 |
| t18 | Spring tile | local | slot, 1 cell plus 2 cells behind | step | telegraphed | onto the path | Bends forward progress: this cell sends you back. | t05 |
| t19 | Barrel lane | local | slot of 4 or more cells plus 1 shoulder dodge cell | timer | obvious | off the path | Teaches that the shoulder is a safe pocket on a timer. | t03, t22 |
| t20 | Rewind tile | local | slot, 1 cell | step | hidden | neutral | Bends the step count: three of your steps play backwards. | t02 |
| t21 | Invisible block | local | path cell plus a walkable shoulder detour | step | hidden | off the path | Bends the open path: one path cell is solid. | t15 |
| t22 | Pancake stone | local | slot cell under an overhang, r1 | timer | telegraphed | onto the path | Teaches reading shadows on a step grid. | t19 |
| t23 | Turntable | local | slot cell at a junction, 1 cell | step | telegraphed | neutral | Bends the camera: the island turns 90 degrees for you. | t29, t35 |
| t24 | Kind bridge, still bridge | sequence | two bridge segments on the spine, in route order | step | hidden | onto the path | Teaches that wobble means safe, then breaks it. | t33 |
| t25 | Sign, then sign again | sequence | two slots in route order, 3 cells each | step | hidden | off the path | Teaches a warning, then plays it late. | t02, t40 |
| t26 | Empty hall, then the bonk | sequence | Nothing here, then Invisible block on the next slot | step | hidden | off the path | Teaches trust, then spends it. | t01, t15 |
| t27 | Real chest, then the mimic | sequence | two dead ends on the lattice rim | interact | hidden | off the path | Teaches that chests pay, then makes you check. | t08 |
| t28 | Coin trail to a painted hole | sequence | slot plus shoulder staircase, r3 | step | hidden | off the path | Teaches that coins mark the route, then leads you off it. | t11, t30, t35 |
| t29 | Mirror controls | debuff | whole island | arrival | obvious | neutral | Bends input: up is down and left is right. | t23, t46 |
| t30 | Fog | debuff | whole island, sight r3 | arrival | obvious | onto the path | Bends the vista: you see three cells around you, and the core figure and lamps glow through. | t11, t28, t43, t44 |
| t31 | Nap timer | debuff | whole island | arrival | obvious | onto the path | Adds a clock to an island with no clock. | t38, t39, t42, t48 |
| t32 | Slick soles | debuff | whole island except path cells | arrival | obvious | onto the path | Bends one-cell steps off the path: you slide one extra cell. | t01, t05, t15, t38, t49, t50 |
| t33 | Gusts | debuff | whole island | arrival | telegraphed | onto the path | Adds a push you can see coming. | t15, t24, t38, t45, t46 |
| t34 | Sticky soles | debuff | whole island | arrival | obvious | neutral | Bends hold-to-repeat: every step needs its own tap. | none |
| t35 | Stuck camera | debuff | whole island | arrival | obvious | neutral | Bends rotation: Q, E and swipe do nothing. | t11, t23, t28, t43 |
| t36 | Hiccups | debuff | whole island | arrival | telegraphed | neutral | Bends one-cell steps on a counter. | t38, t39, t40, t44, t45, t50 |
| t37 | Order plates | puzzle | alcove room 3x3 | step | telegraphed | off the path | Plate-and-gate: a reward gate opens on the right order. | none |
| t38 | Crate push | puzzle | room up to 4x4 on a lookout or alcove | step | obvious | off the path | Sokoban: walking into a crate pushes it one cell. | t31, t32, t33, t36 |
| t39 | Lights-out floor | puzzle | 3x3 tile grid plus 1 entry cell | step | obvious | off the path | Tile-flip: each cell you enter flips itself and its four neighbours. | t31, t36 |
| t40 | One-visit floor | puzzle | 3x4 tile grid | step | obvious | off the path | Each tile crumbles when you leave it: visit every tile once and end on the exit. | t02, t25, t36 |
| t41 | Gaze bridge | puzzle | glass cells inside the watcher's radius, off the gate threshold | look | telegraphed | onto the path | Watcher-gaze routing: the watcher turns to watch you inside its radius, and glass goes solid while it does. | t17 |
| t42 | Valve swap | puzzle | loop arc with two gates and two levers, apart from the shortcut lever | interact | telegraphed | off the path | Shortcut state: each lever swaps which of two gates is open. | t31 |
| t43 | One-angle bridge | puzzle | 4-cell broken bridge to a lookout | camera | telegraphed | onto the path | Rotation: the bridge is whole from one camera angle. | t30, t35 |
| t44 | Flash path | puzzle | 4x4 wobble grid | step | hidden | off the path | Memory path: the safe cells glow once. | t30, t36 |
| t45 | Counting gate | puzzle | branch run of 4 to 7 path cells ending at a reward gate | step | obvious | onto the path | Step counting: the gate shows a tally. | t33, t36 |
| t46 | Mirror twin | puzzle | two parallel 2x4 strips | step | obvious | off the path | Mirror room: a ghost copies your moves left for right. | t29, t33 |
| t47 | Pictogram gates | puzzle | three waymarks on the spine plus a 3-gate branch | step | telegraphed | off the path | Memory: the gate that opens matches the last pictogram you passed. | none |
| t48 | Fuse run | puzzle | branch lever plus a drawbridge of up to 6 cells | timer | obvious | off the path | A visible fuse gives you ten beats. | t31 |
| t49 | Ice rink | puzzle | 5x5 ice room with a low rail | step | obvious | off the path | Ice slide: one input slides you until you hit something. | t32 |
| t50 | Conveyor knot | puzzle | 4x4 belt grid plus a switch | timer | telegraphed | off the path | Belts carry you one cell per beat; a switch flips half the arrows. | t32, t36 |

## Exclusion pairs

- t01 Four-tile vanish, then the gate / t26 Empty hall, then the bonk
- t01 Four-tile vanish, then the gate / t32 Slick soles
- t02 Worn-through flagstones / t20 Rewind tile
- t02 Worn-through flagstones / t25 Sign, then sign again
- t02 Worn-through flagstones / t40 One-visit floor
- t03 Beat spikes / t19 Barrel lane
- t04 Goose plates / t06 Sneeze dust
- t05 Banana scuff / t18 Spring tile
- t05 Banana scuff / t32 Slick soles
- t07 Mimic chest / t08 Trapdoor chest
- t08 Trapdoor chest / t27 Real chest, then the mimic
- t09 Prop decoys / t12 Fake spur
- t11 Painted hole / t28 Coin trail to a painted hole
- t11 Painted hole / t30 Fog
- t11 Painted hole / t35 Stuck camera
- t15 Faith tiles / t21 Invisible block
- t15 Faith tiles / t26 Empty hall, then the bonk
- t15 Faith tiles / t32 Slick soles
- t15 Faith tiles / t33 Gusts
- t17 Stone twin / t41 Gaze bridge
- t19 Barrel lane / t22 Pancake stone
- t23 Turntable / t29 Mirror controls
- t23 Turntable / t35 Stuck camera
- t24 Kind bridge, still bridge / t33 Gusts
- t25 Sign, then sign again / t40 One-visit floor
- t28 Coin trail to a painted hole / t30 Fog
- t28 Coin trail to a painted hole / t35 Stuck camera
- t29 Mirror controls / t46 Mirror twin
- t30 Fog / t43 One-angle bridge
- t30 Fog / t44 Flash path
- t31 Nap timer / t38 Crate push
- t31 Nap timer / t39 Lights-out floor
- t31 Nap timer / t42 Valve swap
- t31 Nap timer / t48 Fuse run
- t32 Slick soles / t38 Crate push
- t32 Slick soles / t49 Ice rink
- t32 Slick soles / t50 Conveyor knot
- t33 Gusts / t38 Crate push
- t33 Gusts / t45 Counting gate
- t33 Gusts / t46 Mirror twin
- t35 Stuck camera / t43 One-angle bridge
- t36 Hiccups / t38 Crate push
- t36 Hiccups / t39 Lights-out floor
- t36 Hiccups / t40 One-visit floor
- t36 Hiccups / t44 Flash path
- t36 Hiccups / t45 Counting gate
- t36 Hiccups / t50 Conveyor knot

## Entries

### t01 Four-tile vanish, then the gate

Sequence | pulls onto the path, then pushes off it | hidden | excludes t26, t32

Step on four off-path cells in a row inside a three-cell patch and all four drop away; the hero windmills and flops into the clouds. Later, on the safe path, a pop-up gate springs across your way. The only way around is a three-cell detour off the path that skirts the old patch, so you have to remember which cells dropped.

### t02 Worn-through flagstones

Local trap | neutral | telegraphed | excludes t20, t25, t40

Flagstones on a loop arc crack a little each time you cross them, and the third crossing drops you into the clouds with a slide whistle. The cracks show from the first crossing. You walk back to the bonfire by the loop's other arc, which is the route the island wanted anyway.

### t03 Beat spikes

Local trap | pulls onto the path | obvious | excludes t19

Spikes rise out of a straight run on the third beat of every four, with a drum tick on each beat. Holding a direction walks you onto a raised spike, which pokes you back one cell with a yelp. Tapping in time gets you through.

### t04 Goose plates

Local trap | pulls onto the path | obvious | excludes t06

The off-path cells beside a straight run hide plates that honk and puff feathers. The third honk on the island calls a goose, which waddles onto the next path cell and sits there for four beats. It is a goose; you wait.

### t05 Banana scuff

Local trap | pushes off the path | telegraphed | excludes t18, t32

The last flagstone before a turn has a faint scuff mark. Step on it and you slide one extra cell straight ahead, over the rim and into the clouds with a long cartoon whistle. Cut the corner one cell early and you skip it.

### t06 Sneeze dust

Local trap | pulls onto the path | obvious | excludes t04

Dusty off-path cells puff a visible cloud when you step on them. The hero sneezes and the sneeze knocks them one cell back to where they came from. It costs a step and a tissue, nothing else.

### t07 Mimic chest

Local trap | pushes off the path | hidden | excludes t08

A second chest sits at a dead end, identical to the real one. Open it and it grows teeth and hops after you, one hop per step, for five hops before it gets bored and coughs up a coin. Rotate the camera to its back first and you catch its tail wagging.

### t08 Trapdoor chest

Local trap | pushes off the path | hidden | excludes t07, t27

Open the real chest and its stone pad drops one tier with you on it. You land on a ledge with a ramp back to the low road, loot in hand. The ledge never touches a shortcut's far side.

### t09 Prop decoys

Local trap | pushes off the path | hidden | excludes t12

A campfire in a far pocket looks like the bonfire, and pressing F on it gets a puff of smoke and a cough. On other islands the decoy is a lift pad at a spur tip that hums and plays two seconds of the ride dance before it plops you back down. One decoy per island.

### t10 The hole that scoots

Local trap | pushes off the path | hidden | excludes none

A path cell gives way and you flop. Come back and the hole has scooted one cell along the run, so the cell you avoided is now the hole. It only moves once.

### t11 Painted hole

Local trap | pushes off the path | hidden | excludes t28, t30, t35

A canvas painted to look like ground stretches over a hole. From three camera angles it matches the floor; from the fourth you see the seam and the painter's signature. Walk on it and you tear through like a paper banner.

### t12 Fake spur

Local trap | pulls onto the path | telegraphed | excludes t09

Three mossy flagstones branch off a turn and look like route. They end at a smug sign that reads "made you look" and a single coin. Nothing bad happens beyond the walk back.

### t13 Long-stride plate

Local trap | pulls onto the path | telegraphed | excludes none | class: Wretch (Ink Step), Courier (Sprint, Wing Hop)

A plate sits two cells past an obvious trap cell, right where a skip lands. Land on it and a boxing glove pops out and bonks you back to where you started the skip. Walking, Ward or Unjam gets through.

### t14 Painted decoy

Local trap | pulls onto the path | hidden | excludes none | class: Wretch (Paint the Path, Star Scout), Modernizer (Lantern)

Paint the Path, Lantern or Star Scout outlines a cell in magenta, and that cell is only a honk plate. The real trap sits on the next cell and skips the reveal. Each island lies to a reveal power once at most.

### t15 Faith tiles

Local trap | pulls onto the path | obvious | excludes t21, t26, t32, t33

The path runs to the edge and stops over open sky. Step forward and a flagstone rises to meet your foot, one per step, until you reach the far side. Step back and they sink again; nothing falls but your stomach.

### t16 Nothing here

Local trap | pulls onto the path | obvious | excludes none

A long straight run dressed like a trap, with scorch marks and a warning sign. Nothing happens on any cell. The last cell holds a sign that says "thanks for being careful".

### t17 Stone twin

Local trap | pulls onto the path | telegraphed | excludes t41

A statue of the island's focal creature stands beside the gate approach, nearer the path than the real watcher. It never turns, so players stand in front of it and wait. The real watcher stands three cells on and turns the moment you reach its threshold.

### t18 Spring tile

Local trap | pulls onto the path | telegraphed | excludes t05

A coil peeks from under one flagstone. Step on it and you boing two cells back the way you came and land in a pose. Step around it on the shoulder and it sulks.

### t19 Barrel lane

Local trap | pushes off the path | obvious | excludes t03, t22

A barrel rolls down a straight run every six beats. Step onto the shoulder cell beside the run to let it pass. If it catches you, you roll back to the start of the run with it, dizzy.

### t20 Rewind tile

Local trap | neutral | hidden | excludes t02

One flagstone plays a VHS rewind squeal and walks you three cells back along your own trail, backwards. You lose three steps and keep everything else.

### t21 Invisible block

Local trap | pushes off the path | hidden | excludes t15

An invisible block sits on a path cell. You bonk into it, a star pops, and the block shows as a cyan outline from then on. You step around it on the shoulder.

### t22 Pancake stone

Local trap | pulls onto the path | telegraphed | excludes t19

A stone face hangs over one cell and slams down on every fourth beat when you stand under it or beside it. Its shadow grows before each slam. A hit flattens the hero into a pancake for two beats; they peel off and carry on.

### t23 Turntable

Local trap | neutral | telegraphed | excludes t29, t35

A painted turntable spins you and the camera a quarter turn when you step on it. Screen-up now points a different way down the route, and you reorient. Turn the camera back with Q or E whenever you like.

### t24 Kind bridge, still bridge

Sequence | pulls onto the path | hidden | excludes t33

The first plank bridge shakes on every step and holds, so you learn that wobble is fine. The next bridge stays still, and its third plank drops you into the clouds. On the way back, the still one is the one you test.

### t25 Sign, then sign again

Sequence | pushes off the path | hidden | excludes t02, t40

A big sign and a creak warn that the first run drops each tile one beat after you leave it, and it does. The second run has the same sign, but it drops the tile in front of you, and the creak plays half a beat late. Wait for the creak, then step.

### t26 Empty hall, then the bonk

Sequence | pushes off the path | hidden | excludes t01, t15

You walk the long, scorched, signposted hallway of Nothing here and nothing happens. The very next run holds an invisible block on its second cell. You walk into it at full confidence.

### t27 Real chest, then the mimic

Sequence | pushes off the path | hidden | excludes t08

The first dead end holds the real chest, and it pays. A later dead end holds an identical chest, and it is a mimic. The tail wag from the reverse angle gives it away if you think to look.

### t28 Coin trail to a painted hole

Sequence | pushes off the path | hidden | excludes t11, t30, t35

Four coins sit on path cells and you collect them. Each coin after that drifts one cell off the path as you grab the one before, in a staircase. The last coin sits on a painted hole.

### t29 Mirror controls

Whole-island debuff | neutral | obvious | excludes t23, t46

A banner and a swirl announce it on arrival: every direction is reversed for the island. Touch petals swap too. Resting at the bonfire clears it for ten steps.

### t30 Fog

Whole-island debuff | pulls onto the path | obvious | excludes t11, t28, t43, t44

Fog rolls in on arrival and you see three cells around the hero. Lamps, waymarks and the core figure glow through it, so the route still reads. The fog lifts within three cells of a lit bonfire.

### t31 Nap timer

Whole-island debuff | pulls onto the path | obvious | excludes t38, t39, t42, t48

A sleepy sun counts down three minutes from arrival. At zero the hero yawns, curls up and wakes at the bonfire with every opened shortcut still open. Lighting or resting at the bonfire resets the sun.

### t32 Slick soles

Whole-island debuff | pulls onto the path | obvious | excludes t01, t05, t15, t38, t49, t50

Every off-path cell is glazed with ice for the island. Step onto one and you slide one cell further, and the path flagstones are the only grip. Sliding into a rock or decor stops you with a bonk.

### t33 Gusts

Whole-island debuff | pulls onto the path | telegraphed | excludes t15, t24, t38, t45, t46

Every sixth beat a gust shoves you one cell downwind, and the flags on the island flap a beat before. The gust never pushes you off an edge; you crouch instead. Path flagstones and the plaza sit out of the wind.

### t34 Sticky soles

Whole-island debuff | neutral | obvious | excludes none

Your boots squelch and holding a direction stops repeating. Each step needs its own tap. Everything else on the island plays as normal.

### t35 Stuck camera

Whole-island debuff | neutral | obvious | excludes t11, t23, t28, t43

The camera arrives jammed at one of its four angles, and Q, E and the rotate swipe do nothing. The see-through window still keeps the hero visible. The bonfire cannot fix it; the next island can.

### t36 Hiccups

Whole-island debuff | neutral | telegraphed | excludes t38, t39, t40, t44, t45, t50

The hero has the hiccups, and every seventh step carries them one extra cell. A counter by the hero shows the next one coming. A hiccup into an edge or a wall becomes a bonk instead.

### t37 Order plates

Puzzle | pushes off the path | telegraphed | excludes none

Four plates sit in a small room with a lamp beside each. Step in and the lamps flash an order; press the plates in that order to open the reward gate. A wrong plate blows a raspberry and all four reset.

### t38 Crate push

Puzzle | pushes off the path | obvious | excludes t31, t32, t33, t36

Walking into a crate pushes it one cell if the cell beyond is clear. Push a crate onto the plate and the reward gate stays open. A bell in the corner poofs the crates back to the start.

### t39 Lights-out floor

Puzzle | pushes off the path | obvious | excludes t31, t36

Each cell you enter flips itself and its four neighbours between lit and dark. Light all nine and a bridge to the reward rises. The bake only seeds starting patterns its solver can clear in a few moves, and a bell resets the floor.

### t40 One-visit floor

Puzzle | pushes off the path | obvious | excludes t02, t25, t36

Each tile crumbles behind you. Visit all twelve once and finish on the exit tile to open the reward. A wrong move drops you onto a cloud cushion that bounces you back to the start of the grid.

### t41 Gaze bridge

Puzzle | pulls onto the path | telegraphed | excludes t17

Glass cells near the watcher shimmer and go solid while the watcher is turned to watch you. Leave its radius and the glass fades. Plan a route that stays inside the radius all the way across, or drop to the ledge below and walk back.

### t42 Valve swap

Puzzle | pushes off the path | telegraphed | excludes t31

Two coloured gates sit on a loop, one open and one shut, and a lever at each end swaps them. The reward needs you through both, so you pull, walk, and pull again from the far side. The island's real shortcut lever stays one way.

### t43 One-angle bridge

Puzzle | pulls onto the path | telegraphed | excludes t30, t35

A broken bridge lines up into one walkable span from only one of the four camera angles. Rotate until it reads whole, then walk it. Rotate away mid-span and the pieces drift apart and drop you onto a cushion below.

### t44 Flash path

Puzzle | pushes off the path | hidden | excludes t30, t36

Step on the start cell and a safe line across a wobbly 4x4 grid glows for two seconds. Walk it from memory. A wrong cell dunks you in a puddle and sends you back to the start cell, where it glows again.

### t45 Counting gate

Puzzle | pulls onto the path | obvious | excludes t33, t36

A reward gate carries a tally of N marks and opens after N steps in a row on its approach. A step off the path resets the tally with a raspberry. A later gate wants a different N.

### t46 Mirror twin

Puzzle | pushes off the path | obvious | excludes t29, t33

A ghost on a parallel strip copies each step you take, left for right. When the ghost walks into a wall it stays put, so you use walls to line it up. Put you and the ghost on your two plates together to open the reward.

### t47 Pictogram gates

Puzzle | pushes off the path | telegraphed | excludes none

Three waymarks along the route carry pictograms. At a branch, three gates carry pictograms too, and only the one that matches the last waymark opens to the reward. The wrong two tip you onto a lower ledge with a coin and a ramp back.

### t48 Fuse run

Puzzle | pushes off the path | obvious | excludes t31

A lever off the route lights a fuse and lowers a drawbridge to a reward for ten beats. Run it. If the bridge rises under you, you ride it up and slide off backwards onto the near side.

### t49 Ice rink

Puzzle | pushes off the path | obvious | excludes t32

One tap slides you across the ice until a rock or the rail stops you. Reach the exit cell to claim the reward. The rail means you cannot fall, only bump.

### t50 Conveyor knot

Puzzle | pushes off the path | telegraphed | excludes t32, t36

Belt cells carry you one cell per beat in the direction of their arrows. A switch at the edge flips half the arrows. Find the switch state that delivers you to the reward.

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
  "pull": "onto the path, then off it",
  "rule": "Teaches that the path is the safe ground, then makes you leave it.",
  "excludes": [
   "t26",
   "t32"
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
  "pull": "neutral",
  "rule": "Bends free backtracking: a loop is one way per visit, so you come home by the other arc.",
  "excludes": [
   "t20",
   "t25",
   "t40"
  ]
 },
 {
  "id": "t03",
  "name": "Beat spikes",
  "tier": "local",
  "footprint": "slot, every cell",
  "trigger": "timer",
  "visibility": "obvious",
  "pull": "onto the path",
  "rule": "Teaches tap rhythm against hold-to-repeat.",
  "excludes": [
   "t19"
  ]
 },
 {
  "id": "t04",
  "name": "Goose plates",
  "tier": "local",
  "footprint": "shoulder cells beside one slot, r1",
  "trigger": "step",
  "visibility": "obvious",
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
  "pull": "off the path",
  "rule": "Bends one-cell steps: this cell carries you two.",
  "excludes": [
   "t18",
   "t32"
  ]
 },
 {
  "id": "t06",
  "name": "Sneeze dust",
  "tier": "local",
  "footprint": "shoulder cells, r1",
  "trigger": "step",
  "visibility": "obvious",
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
  "pull": "off the path",
  "rule": "Bends the chest reward: you keep the loot and lose the floor.",
  "excludes": [
   "t07",
   "t27"
  ]
 },
 {
  "id": "t09",
  "name": "Prop decoys",
  "tier": "local",
  "footprint": "pocket or spur tip, 1 cell",
  "trigger": "interact",
  "visibility": "hidden",
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
  "pull": "off the path",
  "rule": "Teaches the 90 degree camera: one angle out of four shows the seam.",
  "excludes": [
   "t28",
   "t30",
   "t35"
  ]
 },
 {
  "id": "t12",
  "name": "Fake spur",
  "tier": "local",
  "footprint": "3-cell spur off a turn, stone surface, not route",
  "trigger": "step",
  "visibility": "telegraphed",
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
  "pull": "onto the path",
  "rule": "Bends solid ground: the path builds itself under your foot.",
  "excludes": [
   "t21",
   "t26",
   "t32",
   "t33"
  ]
 },
 {
  "id": "t16",
  "name": "Nothing here",
  "tier": "local",
  "footprint": "slot of 5 or more cells",
  "trigger": "step",
  "visibility": "obvious",
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
  "pull": "onto the path",
  "rule": "Teaches the watcher rule: the real one turns to face you.",
  "excludes": [
   "t41"
  ]
 },
 {
  "id": "t18",
  "name": "Spring tile",
  "tier": "local",
  "footprint": "slot, 1 cell plus 2 cells behind",
  "trigger": "step",
  "visibility": "telegraphed",
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
  "pull": "off the path",
  "rule": "Teaches that the shoulder is a safe pocket on a timer.",
  "excludes": [
   "t03",
   "t22"
  ]
 },
 {
  "id": "t20",
  "name": "Rewind tile",
  "tier": "local",
  "footprint": "slot, 1 cell",
  "trigger": "step",
  "visibility": "hidden",
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
  "pull": "neutral",
  "rule": "Bends the camera: the island turns 90 degrees for you.",
  "excludes": [
   "t29",
   "t35"
  ]
 },
 {
  "id": "t24",
  "name": "Kind bridge, still bridge",
  "tier": "sequence",
  "footprint": "two bridge segments on the spine, in route order",
  "trigger": "step",
  "visibility": "hidden",
  "pull": "onto the path",
  "rule": "Teaches that wobble means safe, then breaks it.",
  "excludes": [
   "t33"
  ]
 },
 {
  "id": "t25",
  "name": "Sign, then sign again",
  "tier": "sequence",
  "footprint": "two slots in route order, 3 cells each",
  "trigger": "step",
  "visibility": "hidden",
  "pull": "off the path",
  "rule": "Teaches a warning, then plays it late.",
  "excludes": [
   "t02",
   "t40"
  ]
 },
 {
  "id": "t26",
  "name": "Empty hall, then the bonk",
  "tier": "sequence",
  "footprint": "Nothing here, then Invisible block on the next slot",
  "trigger": "step",
  "visibility": "hidden",
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
  "id": "t27",
  "name": "Real chest, then the mimic",
  "tier": "sequence",
  "footprint": "two dead ends on the lattice rim",
  "trigger": "interact",
  "visibility": "hidden",
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
  "id": "t28",
  "name": "Coin trail to a painted hole",
  "tier": "sequence",
  "footprint": "slot plus shoulder staircase, r3",
  "trigger": "step",
  "visibility": "hidden",
  "pull": "off the path",
  "rule": "Teaches that coins mark the route, then leads you off it.",
  "excludes": [
   "t11",
   "t30",
   "t35"
  ],
  "members": [
   "t11"
  ]
 },
 {
  "id": "t29",
  "name": "Mirror controls",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "pull": "neutral",
  "rule": "Bends input: up is down and left is right.",
  "excludes": [
   "t23",
   "t46"
  ]
 },
 {
  "id": "t30",
  "name": "Fog",
  "tier": "debuff",
  "footprint": "whole island, sight r3",
  "trigger": "arrival",
  "visibility": "obvious",
  "pull": "onto the path",
  "rule": "Bends the vista: you see three cells around you, and the core figure and lamps glow through.",
  "excludes": [
   "t11",
   "t28",
   "t43",
   "t44"
  ]
 },
 {
  "id": "t31",
  "name": "Nap timer",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "pull": "onto the path",
  "rule": "Adds a clock to an island with no clock.",
  "excludes": [
   "t38",
   "t39",
   "t42",
   "t48"
  ]
 },
 {
  "id": "t32",
  "name": "Slick soles",
  "tier": "debuff",
  "footprint": "whole island except path cells",
  "trigger": "arrival",
  "visibility": "obvious",
  "pull": "onto the path",
  "rule": "Bends one-cell steps off the path: you slide one extra cell.",
  "excludes": [
   "t01",
   "t05",
   "t15",
   "t38",
   "t49",
   "t50"
  ]
 },
 {
  "id": "t33",
  "name": "Gusts",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "telegraphed",
  "pull": "onto the path",
  "rule": "Adds a push you can see coming.",
  "excludes": [
   "t15",
   "t24",
   "t38",
   "t45",
   "t46"
  ]
 },
 {
  "id": "t34",
  "name": "Sticky soles",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "pull": "neutral",
  "rule": "Bends hold-to-repeat: every step needs its own tap.",
  "excludes": []
 },
 {
  "id": "t35",
  "name": "Stuck camera",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "obvious",
  "pull": "neutral",
  "rule": "Bends rotation: Q, E and swipe do nothing.",
  "excludes": [
   "t11",
   "t23",
   "t28",
   "t43"
  ]
 },
 {
  "id": "t36",
  "name": "Hiccups",
  "tier": "debuff",
  "footprint": "whole island",
  "trigger": "arrival",
  "visibility": "telegraphed",
  "pull": "neutral",
  "rule": "Bends one-cell steps on a counter.",
  "excludes": [
   "t38",
   "t39",
   "t40",
   "t44",
   "t45",
   "t50"
  ]
 },
 {
  "id": "t37",
  "name": "Order plates",
  "tier": "puzzle",
  "footprint": "alcove room 3x3",
  "trigger": "step",
  "visibility": "telegraphed",
  "pull": "off the path",
  "rule": "Plate-and-gate: a reward gate opens on the right order.",
  "excludes": []
 },
 {
  "id": "t38",
  "name": "Crate push",
  "tier": "puzzle",
  "footprint": "room up to 4x4 on a lookout or alcove",
  "trigger": "step",
  "visibility": "obvious",
  "pull": "off the path",
  "rule": "Sokoban: walking into a crate pushes it one cell.",
  "excludes": [
   "t31",
   "t32",
   "t33",
   "t36"
  ]
 },
 {
  "id": "t39",
  "name": "Lights-out floor",
  "tier": "puzzle",
  "footprint": "3x3 tile grid plus 1 entry cell",
  "trigger": "step",
  "visibility": "obvious",
  "pull": "off the path",
  "rule": "Tile-flip: each cell you enter flips itself and its four neighbours.",
  "excludes": [
   "t31",
   "t36"
  ]
 },
 {
  "id": "t40",
  "name": "One-visit floor",
  "tier": "puzzle",
  "footprint": "3x4 tile grid",
  "trigger": "step",
  "visibility": "obvious",
  "pull": "off the path",
  "rule": "Each tile crumbles when you leave it: visit every tile once and end on the exit.",
  "excludes": [
   "t02",
   "t25",
   "t36"
  ]
 },
 {
  "id": "t41",
  "name": "Gaze bridge",
  "tier": "puzzle",
  "footprint": "glass cells inside the watcher's radius, off the gate threshold",
  "trigger": "look",
  "visibility": "telegraphed",
  "pull": "onto the path",
  "rule": "Watcher-gaze routing: the watcher turns to watch you inside its radius, and glass goes solid while it does.",
  "excludes": [
   "t17"
  ]
 },
 {
  "id": "t42",
  "name": "Valve swap",
  "tier": "puzzle",
  "footprint": "loop arc with two gates and two levers, apart from the shortcut lever",
  "trigger": "interact",
  "visibility": "telegraphed",
  "pull": "off the path",
  "rule": "Shortcut state: each lever swaps which of two gates is open.",
  "excludes": [
   "t31"
  ]
 },
 {
  "id": "t43",
  "name": "One-angle bridge",
  "tier": "puzzle",
  "footprint": "4-cell broken bridge to a lookout",
  "trigger": "camera",
  "visibility": "telegraphed",
  "pull": "onto the path",
  "rule": "Rotation: the bridge is whole from one camera angle.",
  "excludes": [
   "t30",
   "t35"
  ]
 },
 {
  "id": "t44",
  "name": "Flash path",
  "tier": "puzzle",
  "footprint": "4x4 wobble grid",
  "trigger": "step",
  "visibility": "hidden",
  "pull": "off the path",
  "rule": "Memory path: the safe cells glow once.",
  "excludes": [
   "t30",
   "t36"
  ]
 },
 {
  "id": "t45",
  "name": "Counting gate",
  "tier": "puzzle",
  "footprint": "branch run of 4 to 7 path cells ending at a reward gate",
  "trigger": "step",
  "visibility": "obvious",
  "pull": "onto the path",
  "rule": "Step counting: the gate shows a tally.",
  "excludes": [
   "t33",
   "t36"
  ]
 },
 {
  "id": "t46",
  "name": "Mirror twin",
  "tier": "puzzle",
  "footprint": "two parallel 2x4 strips",
  "trigger": "step",
  "visibility": "obvious",
  "pull": "off the path",
  "rule": "Mirror room: a ghost copies your moves left for right.",
  "excludes": [
   "t29",
   "t33"
  ]
 },
 {
  "id": "t47",
  "name": "Pictogram gates",
  "tier": "puzzle",
  "footprint": "three waymarks on the spine plus a 3-gate branch",
  "trigger": "step",
  "visibility": "telegraphed",
  "pull": "off the path",
  "rule": "Memory: the gate that opens matches the last pictogram you passed.",
  "excludes": []
 },
 {
  "id": "t48",
  "name": "Fuse run",
  "tier": "puzzle",
  "footprint": "branch lever plus a drawbridge of up to 6 cells",
  "trigger": "timer",
  "visibility": "obvious",
  "pull": "off the path",
  "rule": "A visible fuse gives you ten beats.",
  "excludes": [
   "t31"
  ]
 },
 {
  "id": "t49",
  "name": "Ice rink",
  "tier": "puzzle",
  "footprint": "5x5 ice room with a low rail",
  "trigger": "step",
  "visibility": "obvious",
  "pull": "off the path",
  "rule": "Ice slide: one input slides you until you hit something.",
  "excludes": [
   "t32"
  ]
 },
 {
  "id": "t50",
  "name": "Conveyor knot",
  "tier": "puzzle",
  "footprint": "4x4 belt grid plus a switch",
  "trigger": "timer",
  "visibility": "telegraphed",
  "pull": "off the path",
  "rule": "Belts carry you one cell per beat; a switch flips half the arrows.",
  "excludes": [
   "t32",
   "t36"
  ]
 }
]
```
