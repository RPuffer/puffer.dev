# Pathing and flow loops

Flow is the walk from spawn to the focal figure and the elevator: where you choose, where you turn back, what the camera hides. Every test runs on a level JSON through `core/level.js` and `core/path.js`, or drives the hero headless as `tools/qa-levels.mjs` does.

## Baseline

The raw cell grid misleads. On `wizard-medium` 109 reachable cells give 51 cells of degree 3 or more and 34 cycles, because every 2-wide terrace counts as a junction and every 2x2 patch as a loop. Collapse each same-height plateau to one node, with ramp and bridge cells as connector nodes, and `wizard-medium` has 12 nodes, 12 edges and 1 loop; `ember-subject` 16, 17 and 2; `cat-medium` and `dragon-medium` are trees with 4 and 5 leaf plateaus. Spawn to elevator on `wizard-medium` takes 14 steps against a Manhattan distance of 15, a detour ratio near 1. Compute structure on this region graph and shape on the cell path.

## Principles and their tests

1. **One readable critical path.** Spelunky lays its solution path first (Kazemi); Left 4 Dead calls the shortest path the "escape route" (Booth). Test: A* steps from spawn to elevator and to figure; target 9 to 16.
2. **Detour that earns its length.** Test: critical path steps over Manhattan distance; target 1.3 to 1.8.
3. **Tortuosity on the route.** Test: turns per 10 steps and longest straight run on the critical path.
4. **Choice points.** Boss Keys graphs ask whether paths branch (Brown). Test: critical-path region nodes with 3 or more edges; target 2 to 4.
5. **Dead ends pay out.** Test: leaf plateaus off the critical path, and the share holding a chest, gems or a view.
6. **Shortcut loops.** Dark Souls folds a straight route into a circle and opens a one-way door back to the bonfire (Ribbing and Melander). Brogue adds a loop door when the two sides sit more than 20 path steps apart (Brogue generation write-up). Test: for each region-graph edge, path length between its ends with that edge removed; a shortcut is any edge saving 8 or more steps, and at least one should return to the bonfire.
7. **Return to bonfire.** Test: steps from the focal figure back to the bonfire with the gate open, against steps out. Under 0.6 means a loop home.
8. **Backtracking under a greedy agent.** Test: a walker steps toward the elevator by straight-line distance with local sight only; count revisits and steps over optimal.
9. **Time to figure.** Test: steps until the focal figure first enters the camera's middle third during the greedy walk, plus steps until the hero first stands within 3 cells of it.
10. **The camera keeps the hero.** Swink's game feel needs you to see what you steer. Test: route cells where tall decor sits at the (-1,-1), (-1,0) or (0,-1) offsets that `qa-levels.mjs` uses to find x-ray spots; count total and the longest run. REFINEMENT.md caps the run at 3.
11. **Pacing beats.** Journey shapes its walk as an emotional arc (Chen) and Left 4 Dead alternates build-up, peak and relax (Booth). Test: the gate lands at 0.3 to 0.7 of the critical path and a rest beat follows the steepest climb.
12. **No traps.** Test: every walkable cell reaches spawn and back under both gate states.

## Three loops

**Agent loop.** A headless runner loads each island and walks it with four policies: optimal A*, greedy toward the elevator, random walk with a step budget, and a novelty seeker that prefers unvisited cells. EA SEED rewards agents for novelty to raise coverage (Gordillo et al.) and uses RL to find navigation exploits (Bergdahl et al.); Zhao et al. want testers that model human skill and style. Scripted policies cover our small grid without the training Unity ML-Agents (Juliani et al.) needs. Output per island: visit heatmap per policy, greedy backtrack count, time to figure, x-ray firings on each trace. Cost: seconds per island in pure JSON. Weakness: it measures and proposes nothing.

**Graph loop.** Build the region graph, score it on principles 1 to 7, then perturb: move a ramp along a plateau edge, flip its direction, add or drop a bridge across a 1-cell gap at equal height, and keep a change when the score rises and `qa-levels.mjs` stays green. Mission graphs (Boris the Brave, after Dormans) treat connectivity as the design object. Cost: cheap, deterministic, runs inside `finishLens`. Weakness: a score can climb while the picked silhouette degrades, so it freezes the outline and touches only connectors.

**Human-trace loop.** The game records your walk (cell, time, camera) to a local file on each playthrough. A comparer overlays your trace on the agents' traces and reports where you paused, turned back or stood under x-ray. Drachen's spatial analytics and Valve's Episode Two death maps put telemetry on the map; one red spot there showed players jumping off a cliff. Cost: one walk per island from you. Weakness: a sample of one, so it confirms or vetoes the agents' findings.

## Build order

Build the agent loop first, as a pure JSON walker. It needs no schema change, scores all 58 levels at once, and its traces feed the card and the graph loop's objective. First three metrics:

1. **Critical path length and detour ratio**, spawn to elevator and to the focal figure.
2. **Region-graph loops and shortcut savings**, which already split the picks: `cat-medium` and `dragon-medium` have none.
3. **X-ray firings on the critical path**, total and longest run, which closes the open item from REFINEMENT.md check 12.

## The pathing card

One `approve` card per island: the `hero=0` render beside three overlays. The critical path runs as a thick line from spawn through the gate to the figure and the elevator, x-ray cells in red; a visit heatmap shows the greedy and novelty agents; your recorded trace joins once it exists. The note lists the three numbers against targets and names the worst cell (for example "greedy walker turns back 6 times at 9,4"). You approve or flag the cell that feels wrong.

## Sources

Search returned server errors for most queries, so most pages came by direct fetch; King's playtesting talk was not reached.

- M. Brown: https://www.patreon.com/posts/how-my-boss-key-13801754
- Boris the Brave: https://www.boristhebrave.com/2021/02/27/lock-and-key-dungeons/
- D. Kazemi: https://tinysubversions.com/spelunkyGen/
- Brogue generation write-up: http://anderoonies.github.io/2020/04/07/brogue-generation-2.html
- V. Ribbing and L. Melander: https://www.diva-portal.org/smash/get/diva2:935733/FULLTEXT01.pdf
- M. Booth: https://cdn.cloudflare.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf
- T. Francis: https://www.pentadact.com/2007-11-15-episode-two-death-maps/
- A. Drachen and M. Schubert: https://andersdrachen.com/wp-content/uploads/2014/07/spatialgameanalytics_cig2013.pdf
- C. Gordillo et al.: https://arxiv.org/abs/2103.13798
- J. Bergdahl et al.: https://arxiv.org/abs/2103.15819
- Y. Zhao et al.: https://arxiv.org/abs/1903.10545
- A. Juliani et al.: https://arxiv.org/abs/1809.02627
- S. Swink: https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient
- J. Chen: https://www.gdcvault.com/play/1017700/Designing-Journey
