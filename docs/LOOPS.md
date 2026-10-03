# Level-design feedback loops

You said you have no concrete concept for these loops yet and you are not sold on the current islands. This page turns the three lane studies into one harness and a path to try it on islands you already know. Detail lives in `docs/loops/layout.md`, `docs/loops/pathing.md` and `docs/loops/decor.md`.

## What a loop means here

A level-design loop takes an island the pipeline generated from its brief, measures it, then either perturbs the level or rewrites the brief, rebuilds, re-renders, and judges the result. Most rounds end at a number: a script scores the level JSON or the render and keeps the change if the score rose and `qa-levels.mjs` stayed green. Fewer rounds end at a vision critic. The rarest step is your card, which arrives only after the cheap judges agree something improved. Layout, pathing and decor share one harness because they read the same inputs (the level JSON, the region graph, the `hero=0` render), they collide on the same cells (a tall prop is a landmark to layout, an x-ray hazard to pathing and a hero prop to decor), and you should judge an island once, not three times.

## The metrics that matter

| Metric | Lane | What it tests | Cheap now | Current reading |
|---|---|---|---|---|
| Spawn isovist share | layout | Spawn sees 25 to 55% of walkable cells, a lot but not all | yes | not measured; renders show `cat-medium` spawn facing a flat field |
| Threshold reveal | layout | Over 20% of cells first appear at the gate, lead included | yes | not measured |
| District count and convex fill | layout | 3 to 5 readable rooms, each with hull fill above 0.7 | yes | not measured; `wizard-medium` spends half its land on one empty plateau |
| Frame balance | layout | Lead in the middle third, land centred, void margins 6 to 18% | yes | not measured |
| Critical path length and detour ratio | pathing | 9 to 16 steps, ratio 1.3 to 1.8 | yes | `wizard-medium` 14 steps against Manhattan 15, ratio near 1 |
| Region-graph loops and shortcut savings | pathing | At least one loop, one edge saving 8 or more steps | yes | `cat-medium` 0, `dragon-medium` 0, `wizard-medium` 1, `ember-subject` 2 |
| Greedy backtracks and time to figure | pathing | Where a naive walker turns back, how long until the figure frames | yes | not measured |
| X-ray firings on the route | pathing | Tall decor hiding the hero, longest run at most 3 | yes | not measured |
| Singleton share | decor | Props stand in groups, target under 0.15 | yes | `home` 0.03, `ember-subject` 0.57 |
| Props per walkable cell by zone | decor | Sparse at the figure, rich at destinations | yes | `home` 0.59, `ember-subject` 0.15, `gremlin-subject` 0.18 |
| Figure-versus-rim edge ratio | decor | The figure carries more contrast than the rim, target above 1.2 | yes | not measured |
| Story beat coverage | decor | Each brief beat has a cluster of 2 or more near its cell | no | needs beats in the brief schema |

`home` runs at 0.59 props per walkable cell, about double the 0.25 to 0.35 band in REFINEMENT.md critic line 9. Someone has to settle that target before any loop optimises toward it.

## Loop designs

Layout (`docs/loops/layout.md`):

- **Metric loop, first pick.** Score the table, perturb spawn, lead, gate and a narrow band of shaper parameters, keep gains; twenty to sixty builds per island at $0.
- **Critic loop.** A vision model answers seven layout questions over the render plus an overlay of route, isovist and districts.
- **Comparative loop.** Four to eight variants per island, picked pairwise, with a preference model fitted once 40 pairs exist.

Pathing (`docs/loops/pathing.md`):

- **Agent loop, first pick.** Four headless walkers (optimal, greedy, random, novelty) produce heatmaps, backtracks and x-ray firings in seconds per island.
- **Graph loop.** Collapse plateaus to a region graph and move ramps or add bridges to create loops and shortcuts, touching connectors only.
- **Human-trace loop.** The game records your walk and overlays it on the agents' traces.

Decor (`docs/loops/decor.md`):

- **Rule loop, first pick.** Pull singletons into same-family clusters or onto the path kerb, fill thin vignettes, prune to zone density; no render needed.
- **Saliency loop.** Score the render's figure box against the rim band and swap or nudge the loudest rim props.
- **Story loop.** Three to five beats along the approach, each checked for a matching cluster in route order.

### The recommended harness

The inner loop runs on its own and costs $0. It computes the metrics, runs the four agent walks, and applies rule-based moves from all three lanes: layout placement perturbations, graph-loop connector edits and decor rule-loop moves. It freezes the lens fields (`shaper`, `surface_mix`, `composition`) and the picked silhouette so it cannot flatten an island toward a generic score. Each move keeps only when the combined score rises and `qa-levels.mjs` passes.

The outer loop is a critic. It sends the best inner-loop candidate to a vision model with one rubric covering all three lanes, over the render plus metric overlays, with the numbers in the prompt so the verdict stays anchored. With the Gemini account funded this costs cents per island, logged in `docs/SPEND.md`. The critic can veto a candidate the numbers liked, for example a cluster that reads well in plan but hides behind a cliff in iso.

Each island then gets one operator card. It shows before and after renders, and beside them four overlays: the agents' visit heatmap, the critical path from spawn through the gate to the figure and elevator with x-ray cells marked, the isovist from spawn, and the decor clusters with singletons ringed. The note carries the before and after numbers; the context names what moved. Use an `approve` card for one candidate and `pick-one` when the outer loop returns variants. Your picks on `pick-one` cards later train the comparative loop.

## Staged plan

The order follows what should move your "not sold" reaction fastest: visible emptiness first, then shape, then flow, then scale.

**Stage 1: decor rule loop on `ember-subject`.** Bone piles and horns stand one per plateau today. The inner loop's decor moves gather them into vignettes and trail them along the approach. Check: singleton share falls from 0.57 to under 0.15, density lands in the band you choose, reach count unchanged, and the card shows clusters before and after. This stage also builds the card template and the overlay renderer the later stages reuse.

**Stage 2: layout metric loop on `wizard-medium`.** The empty white plateau is the clearest layout failure in the set. Isovist, district and convex-fill metrics drive placement moves, plus terrain cuts if question 4 allows them, until the plateau splits into rooms. Check: district count reaches 3 to 5 with each hull fill above 0.7, spawn isovist lands in 25 to 55%, and frame balance passes on the render.

Stages 1 and 2 come before the multi-tile build. They fix where things go, so the windmill, gatehouse and shrine samples land in districts and clusters that already exist and serve as their hero props and landmarks.

**Stage 3: agent walks and graph loop on `cat-medium`.** It has no loop in its region graph, and spawn faces a flat field with the cat hidden behind a terrace wall. The graph loop adds a connector that folds the route back toward the bonfire, and the walkers measure the result. Check: at least one region-graph loop with an edge saving 8 or more steps, figure-to-bonfire return under 0.6 of the outbound steps, and no x-ray run over 3.

**Stage 4: critic outer loop on `home` as control, then the twelve picks.** Run the full harness with the vision critic over the overlays, starting on `home` so you can see the critic agree with the pack reference before it judges builds. Check: the critic passes `home` unchanged, and the twelve cards land in the queue, one per island.

Stages 3 and 4 come after the multi-tile build. Multi-tile items change sightlines and x-ray exposure, so flow and critique should measure the islands with those items in place.

## Open questions

1. Will you record your own walk on each island? If yes, the human-trace loop joins the card and vetoes agent findings; if no, the agents are the only walkers and the card says so.
2. Should islands have loops and shortcuts in the souls-like sense, a one-way door back to the bonfire, or stay linear approaches to the figure? This sets whether the graph loop adds cycles or only tidies the single route, and it decides stage 3.
3. How dense should decor be relative to `home`? Matching its 0.59 per walkable cell or holding the rubric's 0.25 to 0.35 sets the zone targets for stage 1.
4. May the inner loop touch terrain at all, or only placement and connectors? Freezing the silhouette protects the picks; loosening it lets stage 2 reshape `wizard-medium`'s plateau directly instead of dressing around it.
