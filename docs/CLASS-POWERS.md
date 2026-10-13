# Class powers

The starter set at the end is built (`core/powers.js`); the other powers stay design ideas. Each class gets one power key, and the four class model options on fortress card `puffer-isoworld-class-models` belong to the same character as the powers below.

## Shared ground rules

- The player picks a class on the landing (`landing/classes.json`): Wretch (`wanderer`), AWS, Dutchie and Northwestern Mutual. In game they play as the Wretch, the Gatekeeper, the Courier and the Modernizer.
- Movement stays one cell per keypress, or the joystick on its diagonals. Click-to-move (tap a cell, walk the route) leaves the shared kit and becomes the Courier's power. `core/game.js` already routes a tap through `state.route`, so the gate is a class check.
- Desktop: `R` fires the power. A directional power uses the hero's facing. A targeted power enters an aim mode: arrows step a cell cursor, `R` or click confirms, `Esc` cancels.
- Touch: a second round button sits beside the `✦` use button. Tap fires a directional power. Hold, drag onto a cell and release fires a targeted one.
- A power never opens a one-way shortcut from its near side, never crosses a closed door, gate or lever gate, and never climbs an unkicked ladder. `core/layout` solvability checks assume this, and the far-side reward of a shortcut depends on it.
- Traps live on `trapSlots` (straight spine runs of three or more cells, LEVEL-DESIGN.md). Below, "trap" means any trap type that fires when the hero enters its cell: spikes, a crumbling tile, a pressure plate.
- Costs: S fits in a day on existing systems, M needs a new system or effect, L touches level generation or the solvability checks.

## The Wretch (Wanderer)

The souls starter who paints, plays violin and games. Model options: the Ink Wraith, the paintbrush staff and drip cape, the violin with a star familiar, the paint-splattered rags.

1. **Ink Step.** You melt into an ink puddle and reappear further on. Mechanic: move exactly two cells in the facing direction when the landing cell is walkable and on the same tier or one tier down; the skipped cell may hold a trap or a one-cell gap. Recharges after 6 normal steps. Traps: the clean answer to a single trap cell. Shortcuts: a closed door, gate or ladder blocks it like a wall, and it never lands on a shortcut's far side from below. Desktop `R`; touch tap the power button. Cost M.
2. **Paint the Path.** One brush stroke shows the floor's secrets. Mechanic: every trap within 4 cells along the facing ray turns magenta and stays visible for the rest of the island. Traps: pure information, so it pairs with plain walking. Shortcuts: a stroke across a shortcut's far end outlines it, so you know a door is worth finding. Desktop `R`; touch tap. Cost S.
3. **Bow Song.** Three bars of violin lull the island. Mechanic: traps within 2 cells go dormant for 6 steps; dormant cells glow cyan. Recharges at a bonfire. Traps: lets you walk a whole trap slot once per rest. Shortcuts: none. Desktop `R`; touch tap. Cost S.
4. **Splatter Mark.** You flick paint on a cell and can always find your way back. Mechanic: aim to drop one mark on your own cell; a second use warps you to it, once per bonfire rest. Traps: the warp lands only on the marked cell, so it skips nothing. Shortcuts: lets you peek at a shortcut's far side and return; it never opens the shortcut. Desktop `R` to mark, `R` again to warp; touch hold. Cost M.
5. **Star Scout.** The star familiar flies ahead and comes back. Mechanic: aim a cell up to 6 cells away along walkable path; the camera follows the star there and back over 1.5 seconds, revealing traps on its route. Traps: reveal at range. Shortcuts: the star stops at closed gates. Desktop aim mode; touch hold and drag. Cost M.

## The Gatekeeper (AWS)

The reliability and security warden of the ingress fleet. Model options: the Gate Sentinel knight, the tower shield and pauldrons, the orbiting node halo, the cyan and gold palette.

1. **Ward.** You raise the tower shield. Mechanic: the next trap you enter does nothing, and the shield cracks; it recharges after 10 steps or at a bonfire. Traps: a free mistake, no planning. Shortcuts: none. Desktop `R` (passive once raised); touch tap. Cost S.
2. **Canary.** You send a small cyan cube one cell ahead to trip whatever waits there. Mechanic: the cube steps into the facing cell; a trap there fires on the cube and stays spent for 8 steps. Traps: disarm by testing, one cell at a time. Shortcuts: the cube cannot pass a closed gate or door. Desktop `R`; touch tap. Cost S.
3. **Node Ring.** The halo drops to the floor as three relays. Mechanic: place up to three node cubes on cells you stand on; every trap inside the triangle they form is revealed and disarmed until you pick the nodes up. Traps: rewards planning a long trap run. Shortcuts: nodes on both sides of a closed shortcut do nothing to it. Desktop `R` to drop, `R` on a node to lift; touch tap. Cost M.
4. **Rate Limit.** Your presence slows everything that ticks. Mechanic: timed traps within 3 cells run at half speed. Traps: makes timing traps readable on a step grid. Shortcuts: none. Passive, no input. Cost S, once timed traps exist.
5. **Failover.** You come back where the network last held. Mechanic: on death, respawn at the near end of the most recently opened shortcut if it is closer to the death cell than the bonfire is. Traps: softens a long trap run late in an island. Shortcuts: makes opening one worth more. Passive. Cost M.
6. **Port Scan.** You read the island's locks. Mechanic: for 3 seconds, a beam line joins each lever to the gate it opens and each shortcut's far end to its near end. Traps: none. Shortcuts: shows the route graph's valves without opening any. Desktop `R`; touch tap. Cost S.

## The Courier (Dutchie)

The fast ramp who learns any stack in a week and ships it. Model options: the Comet Runner, the cap with satchel and winged boots, the leaf-sprite familiar, the moss and violet palette.

1. **Waypoint Run.** Ryne's anchor: you know the route before you walk it. Mechanic: click or tap any reachable cell you can see and the hero walks the shortest path there through `core/path.js`, one cell per tick; any key or joystick input cancels. Traps: the router avoids traps you have revealed and walks into ones you have not, so a careless tap still costs you. Shortcuts: the router treats closed doors, gates and unkicked ladders as walls and uses them once opened, so opening a shortcut visibly shortens every later run. Desktop click; touch tap the world. Cost S, since the click pathfinder already exists.
2. **Sprint.** You burst forward on winged boots. Mechanic: for the next 3 presses, each press moves 2 cells; you cross a crumbling tile before it drops. Recharges after 8 steps. Traps: beats crumble traps, still triggers spikes and plates. Shortcuts: stops at any closed link. Desktop `R` then move; touch tap then stick. Cost S.
3. **Wing Hop.** A short glide across nothing. Mechanic: cross a one-cell gap to a cell on the same tier. Traps: hop over a single trap cell, with the same tier rule. Shortcuts: same tier only, so a drop stays one way. Desktop `R`; touch tap. Cost M, plus a solvability rule that no gap of one cell guards a lock.
4. **Fast Ramp.** You read an island in a glance. Mechanic: on arrival the route graph lights up for 3 seconds: path cells, bonfire, gate, both lifts and every shortcut's far end as an outline. Traps: none shown, which keeps Paint the Path and Port Scan their own. Shortcuts: you see where to aim. Passive on arrival. Cost S.
5. **Sprite Fetch.** The leaf sprite runs an errand. Mechanic: aim at a chest within 4 cells of walkable path; the sprite opens it and brings the contents back. Traps: the sprite walks over traps unharmed, so a trapped alcove still pays out. Shortcuts: the sprite cannot pass closed links. Desktop aim mode; touch hold and drag. Cost S.

## The Modernizer (Northwestern Mutual)

The bridgewright who turns legacy systems into new ones. Model options: the Mainframe Golem, the big wrench and goggles, the backpack crane with lantern, the navy and brass palette.

1. **Unjam.** The wrench fixes what the island broke. Mechanic: disarm the trap on the facing cell for good; a bolted brass plate replaces it. Recharges after 5 steps. Traps: the slow, permanent answer, one cell at a time. Shortcuts: none. Desktop `R`; touch tap. Cost S.
2. **Lantern.** (Built as the Modernizer's starter.) The crane lantern lights the dark tiles. Mechanic: traps within 2 cells show while the lantern is out; the lantern toggles. Traps: constant short-range reveal on the darker path tiles. Shortcuts: none. Desktop `R` toggles; touch tap. Cost S.
3. **Bridge.** You bolt a plank across a gap. Mechanic: once per island, aim a one-cell gap between two cells on the same tier and lay a permanent plank. Both ends must already be reachable from the bonfire, so a bridge shortens a walk and never bypasses a lock. Traps: lets you route around a trap slot. Shortcuts: a player-built shortcut that lives by the same rule as the authored ones. Desktop aim mode; touch hold and drag. Cost L: a runtime edit to the level graph and a reachability check.
4. **Remote Lever.** You rewire a lever from where you stand. Mechanic: pull a lever you can see within 4 cells. Traps: none. Shortcuts: a lever gate still only opens from its lever, just from a little further away, so the one-way rule holds. Desktop `R` when a lever is in range; touch tap. Cost S.
5. **Heavy Frame.** The Mainframe body does not budge. Mechanic: immune to push and knockback traps, and a crumbling tile holds for one extra step under you. Traps: shrugs off the physical ones. Shortcuts: none. Passive. Cost S, once push traps exist.

## Starter set

One power per class, chosen so the four play differently on the same trap slot:

| Class | Starter | Answer to a trap | Cost |
| --- | --- | --- | --- |
| Wretch | Ink Step | jumps it | M |
| Gatekeeper | Ward | absorbs it | S |
| Courier | Waypoint Run | routes around known ones | S |
| Modernizer | Lantern | reveals it | S |

### Built

The starters shipped on 2026-10-12; Ryne's review that evening turned Ink Step into a dash, set the Ward rule, swapped Unjam for Lantern and moved every power from step recharge to collected charges. `core/powers.js` reads the class from `?class=` or `isoworld:class` (no class plays as the Wretch), `core/powers-ui.js` draws the HUD, `3d/powerfx.js` the effects, and `node tools/qa-powers.mjs` proves each one.

| Power | Key | Costs | What it does |
| --- | --- | --- | --- |
| Ink Step | `R`, touch power button | 1 charge | Dashes 0.2 s in a flat line two cells along the facing onto a non-ramp cell of the same tier or one down. The skipped cell may hold a trap (`traps.skip`) or be a one-cell gap. The body fades to 12% with a bright outline and a short smear along the path, then snaps back on landing. |
| Ward | `R`, touch power button | 1 charge | Raises `health.ward()`. Three shield plates orbit the hero until the ward cracks. |
| Waypoint Run | tap or click a cell | nothing | The only class that walks by tap. The router adds 40 to each revealed, live trap cell, so it walks around known traps when a detour exists and through unrevealed ones. `R` shows the hint. |
| Lantern | `R` lights and douses | oil, 1 s per second lit | While lit it reveals every trap with a cell within 2 cells (Chebyshev) through `traps.reveal`. A brass lantern hangs at the hero's shoulder over a warm pool of light. It gutters out when the oil runs dry. |

Unjam is retired.

#### Charges

Powers no longer recharge on steps. You carry charges (oil for the Lantern) and refill them three ways:

| Source | Charge classes | Lantern |
| --- | --- | --- |
| Start of a run, and every bonfire light or rest | tops up to 2 charges | tops up to 1 flask (20 s) |
| Opening a chest | +1 charge | +1 flask |
| Walking onto a glinting pickup | +1 charge | +1 flask |
| Carry cap | 3 charges | 3 flasks (60 s) |

A bonfire never takes away what you carry above the stock. A pickup stays on the ground when you are at the cap. Taken pickups stay gone per island (`isoworld:pickups:<level>`), and the satchel persists across islands (`isoworld:power`).

`core/layout/pickups.js` places two pickups per island off the worn path, scoring lookouts, alcoves and hills, cells behind a shortcut, and dead-end pockets, and keeps at least one reachable before any shortcut opens. `tools/bake-layout.mjs` calls it after trap placement, so a rebake keeps them; `node tools/place-pickups.mjs` adds them to existing levels without rebaking.

#### Ward rule

Ward cracks only when it saves a heart. A trap that costs nothing (a debuff such as fog, a reveal, a zero-damage hit) leaves it up: `health.hit(n)` and `life.hurt(n)` ignore `n <= 0`. A knock-off still cracks it, because a fall costs more than a heart.

Other rules:

- Ink Step lands only on a cell you could already walk to from where you stand. That one check keeps it off every shortcut's far side, so closed doors, lever gates and unkicked ladders block it with no special cases. The QA sweep runs it over every cell and facing of `wizard-medium-r1` to `-r3`.
- A refused power (no landing, no charges, dry lantern) keeps what you carry and says why in a toast.
- Touch stacks the power button above the use button in the right column, so the compass rose keeps its clearance. The chip and the button show charges held (pips and a badge) or the seconds of oil left.
- A power pressed mid-step waits for the hero to reach the cell centre (`actor.pause`).
