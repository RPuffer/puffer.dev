# Layout and composition loops

Critic lines 10 and 11 in REFINEMENT.md pass or fail a level once; these loops improve it over rounds. In the renders, `home` has five readable rooms. `cat-medium` puts the cat in the back-left corner behind a terrace wall, so spawn at (9, 9) looks at a flat orange field. `wizard-medium` spends half its land on an empty white plateau with no room shape. `forest-volute` works: the arch sits at the front, the path climbs, and the bird on its plinth closes the view.

## Principles and their tests

Tests run on the level JSON unless they name the render.

| Principle | Source | Test |
|---|---|---|
| Spawn sees a lot, but not all | Benedikt isovist; Alexander 112 | Isovist from spawn at eye height 1.5 over the heightfield covers 25 to 55% of walkable cells |
| The threshold reveals the focal room | Alexander 112 "change of view"; Totten hide-and-reveal | Cells first seen at the threshold cell exceed 20% of walkable cells and include the lead |
| The focal point draws you in | Disney castle at the end of Main Street; Totten's weenie | Lead visible from at least 70% of route cells; lead top is the highest point within 4 cells |
| Landmarks orient | Lynch landmarks | At least two decor items taller than 2 tiles, each visible from more than 40% of walkable cells, at least 6 cells apart |
| Edges read as edges | Lynch edges | Height or surface changes along the island rim and plateau lips form runs of 4 or more cells; count of 1-cell lips stays under 15% |
| Districts are distinct | Lynch districts; Disney land transitions | Flood fill by (surface, height) gives 3 to 5 regions of 8 or more cells; each pair touches at one or two passages |
| Rooms are positive space | Alexander 106 (convexity), 163 | Each district's walkable area keeps a convex-hull fill ratio above 0.7; no L-shaped leftovers over 10 cells |
| A node joins routes | Lynch nodes; Disney's Hub | One cell or plaza with three or more exits sits on the route between spawn and lead |
| A loop beats a dead end | Brogue `addLoops`; Dormans cycles via BorisTheBrave; Boss Keys | At least one cycle of 8 or more cells in the walk graph; Brogue's rule, cut a loop where two neighbours sit more than 10 steps apart, is the repair |
| Chokepoints host gates | Brogue `analyzeMap` chokeMap | The threshold cell's choke value (cells cut off if blocked) exceeds 30% of walkable cells |
| Pacing has four beats | Hayashida kishotenketsu | Along the route, districts change at least three times, and the third segment differs in height or surface from both before it |
| Visual integration | Turner et al. VGA | Mean visual depth from spawn under 2.5; the lead's cell ranks in the top quartile of integration |
| Figure sits in the frame | Totten framing and thirds; Sitte via Alexander | On the render, the lead's bounding box centre falls in the middle third horizontally and the upper half; land mass centroid within 12% of frame centre; void margin 6 to 18% each side |

## Three loops

**1. Metric loop: score, perturb, keep.** Compute the table above into one weighted score, then perturb the brief's shaper parameters, spawn, lead cell and gate cell, rebuild, and keep the change when the score rises and `qa-levels.mjs` stays green. Twenty to sixty headless builds per island cost $0, and the numbers compare cleanly across rounds. The risk is Goodhart: a climber flattens terraces to raise isovist area and drifts toward a generic island. Freeze the lens fields (`shaper`, `surface_mix`, `composition`) and let it touch placement and a narrow parameter band.

**2. Critic loop: vision model with a layout rubric.** Send the render plus an overlay (route, spawn isovist, districts) to a vision model with seven questions: where would you walk first, what do you see from the entrance, what pulls you forward, where is the threshold, how many places does this island have, which space feels left over, does the figure own the frame. It answers in the `critic.mjs` schema. It catches a landmark that reads as clutter or a figure lost against its own palette. It costs per call, Gemini is out of credit, and verdicts drift; feed it the metric numbers.

**3. Comparative loop: render variants, pick by preference.** Build four to eight variants per island from the metric loop's top scorers, render each, and pick by pairwise preference. Start with a Pareto front on the metrics, then fit a Bradley-Terry model to the operator's card picks once 40 pairs exist. Pairwise choices are easier to judge than absolute scores. It needs his picks to learn, and sibling variants share flaws.

## Build first

Build the metric loop. It reuses the `procgen-check.mjs` flood fill and `approach()`, spends nothing, and feeds loops 2 and 3. First three metrics:

1. **Spawn and threshold isovist.** Grid line-of-sight from cell centres at eye height over the heightfield, decor footprints with height as occluders. It covers reveal, focal draw and landmarks, and flags `cat-medium`.
2. **District count and positivity.** Region flood by (surface, height), then convex-hull fill per region. This catches `wizard-medium`'s empty plateau.
3. **Frame balance on the render.** Lead box position, land centroid and void margins from the PNG mask against `bg`.

## The layout card

A fortress `pick-one` card per island, one item per variant, current level first as the control. Each item pairs the render with a 16x12 plan: isovists tinted, route drawn, districts coloured, landmarks starred. The item note carries the six numbers (spawn isovist %, threshold reveal %, lead visibility %, district count, loop length, frame offset) with the delta from the control. Context names the lens and the change. His pick trains loop 3 and sets loop 1's weights.

## Sources

- Lynch, The Image of the City (1960): https://en.wikipedia.org/wiki/The_Image_of_the_City
- Alexander et al., A Pattern Language, patterns 106, 112, 163: https://www.iwritewordsgood.com/apl/patterns/apl106.htm, https://www.iwritewordsgood.com/apl/patterns/apl112.htm, https://www.iwritewordsgood.com/apl/patterns/apl163.htm
- Totten, An Architectural Approach to Level Design, 2nd ed., contents (weenies, Lynch, framing, hide-and-reveal): https://www.routledge.com/An-Architectural-Approach-to-Level-Design-Second-edition/Totten/p/book/9780815361367
- Castle terminus and Hub: https://en.wikipedia.org/wiki/Main_Street,_U.S.A.
- Isovists (Benedikt 1979): https://en.wikipedia.org/wiki/Isovist; VGA (Turner, Doxa, O'Sullivan, Penn 2001, doi 10.1068/b2684): https://en.wikipedia.org/wiki/Visibility_graph_analysis
- Hayashida kishotenketsu: https://www.engadget.com/2015-03-17-super-mario-3d-world-design.html
- Boss Keys and lock-and-key structure: https://www.boristhebrave.com/2021/02/27/lock-and-key-dungeons/; Dormans cyclic generation: https://www.boristhebrave.com/2021/04/10/dungeon-generation-in-unexplored/
- Brogue CE `addLoops` and `analyzeMap`: https://github.com/tmewett/BrogueCE/blob/master/src/brogue/Architect.c

WebSearch returned 502 errors for most queries, so I fetched primary pages directly. The Turner paper returned 403; its VGA measures are cited secondhand.
