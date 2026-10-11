# How procgen games make levels feel designed

Random levels feel random when the generator scatters content and then hopes a route exists. The games below flip that order: they decide what the player's trip should be first, then let randomness fill in the parts that do not change the trip. Seven practices from them apply to our souls-style islands. `docs/LEVEL-DESIGN.md` builds on each one.

## 1. Lay the critical path first, then fill around it

Spelunky splits each level into a 4x4 grid of rooms. Before it picks a single room layout, it walks a "solution path" from a top-row room to the bottom: left, right or down by dice roll. Rooms on that path get guaranteed openings; rooms off it get whatever fits ([Kazemi, Spelunky Generator Lessons](http://tinysubversions.com/spelunkyGen/)). Binding of Isaac grows its floor plan outward from the start room and keeps the dead ends for the boss and treasure ([Boris the Brave, Isaac](https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/)).

Why it works: you can always finish, and the route is a shape the generator chose on purpose. For us: the spine from the entry lift to the exit lift is drawn first, and nothing else may cut it.

## 2. Build around cycles, not trees

Unexplored (Joris Dormans) starts each dungeon as a loop between entrance and goal. The two arcs of the loop become two routes, and the generator decorates them with locks, keys and one-way "valves" so the player goes out one way and comes back the other. A tree forces you to backtrack down the branch you came up; a loop hands you a new way home ([Boris the Brave, Unexplored](https://www.boristhebrave.com/2021/04/10/dungeon-generation-in-unexplored/); Dormans, "Adventures in Level Design", PCGames 2010, [doi:10.1145/1814256.1814257](https://doi.org/10.1145/1814256.1814257)).

Why it works: a loop that closes on itself is the Dark Souls shortcut. You fight the long way around, then kick down a ladder and find yourself back at the bonfire. That moment is the reward. Our shortcuts are exactly Dormans' valves: a door, a ladder or a drop that works in one direction until you open it from the far side.

## 3. Hand-made pieces, generated arrangement

Dead Cells keeps the level graph procedural but builds every room by hand, tagged by job (combat, treasure, merchant) and number of exits. The generator only picks which hand-made room fits each node of the graph ([Bénard, The Level Design of Dead Cells](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/)). Isaac draws its room interiors from pools of designed layouts; Spelunky does the same with room templates.

Why it works: a designer's judgement lives inside each piece, and the dice only decide the order. For us: feature modules (plaza, dock, causeway, spur, peninsula, hill) are the hand-made pieces. Each one knows its own footprint, attach points and validity rules.

## 4. Keep the plan abstract until late

Unexplored places "Obstacle" and "Lock" as placeholders and only turns them into a trap, a monster or a puzzle near the end, once it knows the theme and the room's role. Dormans splits generation into a mission grammar (what happens, in what order) and a space grammar (where it happens).

Why it works: you can reason about solvability on a tiny graph, then dress it however you like. For us: the route is a graph of segments with roles (spine, loop, shortcut, branch). Traps attach to segments later as abstract slots, and the art comes last.

## 5. Measure walking distance before you open a loop

Brogue adds loops by knocking a doorway through a wall only where the two floor tiles on either side are more than a set number of steps apart by walking. It places a bridge only if the bridge shortens the walk enough, and it throws a lake away if the lake cuts the level in two ([Brogue CE, Architect.c: addLoops, designLakes](https://github.com/tmewett/BrogueCE/blob/master/src/brogue/Architect.c)).

Why it works: a shortcut that saves two steps is noise; one that saves forty is a discovery. For us: QA measures the walk back to the bonfire from each shortcut's far side, locked and unlocked, and rejects a shortcut that does not save a quarter of the trip.

## 6. Generate, test, throw away

Isaac rejects any floor plan with the wrong room count or with the boss room touching the start. Dead Cells retries rooms until one matches the graph. Brogue rejects lakes that break connectivity.

Why it works: a cheap checker lets the generator stay simple and a bit dumb. For us: every attempt runs `checkRoute`; the first clean attempt per seed wins, and the same check runs in QA.

## 7. Fixed frame, random fill

Dead Cells keeps its world map, its level links and its key locations the same on every run. Only the inside of each level changes.

Why it works: the player learns the anchors and still meets surprises between them. For us: the artwork core, the bonfire near the entry, the lifts on the rim and the core gate are fixed roles; the seed moves everything around them.

## Local-rule tools: use them for surface, not structure

Wave Function Collapse (Townscaper, Bad North) fills a grid so every tile agrees with its neighbours. Boris the Brave notes it "rarely generates large scale structures" ([WFC Explained](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/)); Oskar Stålberg pairs it with hand-placed structure in Bad North ([EPC2018 talk](https://www.youtube.com/watch?v=0bcZb-SsnrA)). For us, local rules suit decor dressing and rim edges. They should never decide the route.
