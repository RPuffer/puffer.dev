# Procedural islands

Status 2026-10-08: the generator this document specifies was removed from `core/procgen.js` (it made the MVP's generic islands, unrelated to the artwork). The checks survived as helpers. The research below stays for a later generator that varies the artwork islands.

## State of the art

**Model synthesis and WaveFunctionCollapse.** Merrell introduced model synthesis at i3D 2007 ("Example-Based Model Synthesis"): learn tile adjacencies from an example and fill a larger grid by arc consistency (TVCG 2010 generalises it) ([paulmerrell.org/model-synthesis](https://paulmerrell.org/model-synthesis/)). Gumin's WaveFunctionCollapse (2016, [github.com/mxgmn/WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse)) reimplements it with N x N overlapping patterns, a minimum-entropy observation order, and AC-4 propagation. The simple tiled model is plain adjacency propagation over a tile list; on contradiction Gumin's code gives up. Karth and Smith frame it as constraint solving (FDG 2017); Boris the Brave adds backtracking ([boristhebrave.com](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/)).

**Stålberg.** Bad North runs WFC over 3D modules and keeps islands playable with a navigability heuristic: each placed tile knows its navigability, house tiles go down only where navigable, and unnavigable areas become forest. On failure he restarts the island. Townscaper runs WFC on a relaxed irregular quad grid with corner modules. His warning for this project: WFC "is pretty bad for long, thin things", and he wants "the larger shapes to feel very predictable" ([Game Developer, "How Townscaper works"](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making); the WFC README lists both games).

**Noise and cellular automata.** Red Blob Games shapes islands by blending octave noise with a distance falloff, `e = lerp(e, 1 - d, mix)`, with `d` a square bump `1 - (1 - nx²)(1 - ny²)` or a Euclidean distance, ([redblobgames.com/maps/terrain-from-noise](https://www.redblobgames.com/maps/terrain-from-noise/)). Johnson, Yannakakis and Togelius smooth random fill with a Moore-neighbourhood majority rule over a few iterations ("Cellular automata for real-time generation of infinite cave levels", PCGames 2010, doi 10.1145/1814256.1814266). The rule also removes one-cell spikes from a tiered heightfield.

**Poisson-disc scattering.** Bridson's algorithm (SIGGRAPH 2007 sketch, "Fast Poisson Disk Sampling in Arbitrary Dimensions") keeps an active list, tries up to k candidates in the annulus [r, 2r] around a random active point, and checks a background grid of cell size r/√n. It runs in O(N).

**Connectivity.** DeBroglie's ConnectedConstraint bans any placement that would make a path between relevant cells impossible,; its docs say path constraints "usually require backtracking" ([DeBroglie path constraints](https://github.com/BorisTheBrave/DeBroglie/blob/master/docs/articles/path_constraints.md)). On 200 cells, a flood fill plus repair gives the same guarantee in microseconds.

## Recommendation: tiered heightfield, repair, then rules

Our grids hold about 200 cells in three tiers. The reference demands a predictable two-level silhouette and full reachability, the two things WFC handles worst. Generate the interactive tiles first as a noise-shaped tiered heightfield, repair connectivity, then derive surfaces, bridges, and decor by rule. WFC can come later as a surface-variant pass.

### Parameters

| Name | Default | Role |
| --- | --- | --- |
| `W, D` | 16, 12 | grid size |
| `mix` | 0.55 | noise vs falloff; octaves 1, 0.5, 0.25 |
| `falloff` | square bump, centre (0, -0.15) | high tier sits at the back, as in the reference |
| `tiers` | e < 0.30 void, < 0.42 water, < 0.68 sand h2, else grass h3 | quantise |
| `lowPool` | water cells touching the island edge drop to h0 | two water levels |
| `ca` | 2 passes, Moore majority per tier | smooth |
| `rampMax` | 2 | ramps carved per tier boundary |
| `bridgeSpan` | 1 to 3 | water run a bridge may cross |
| `poissonR` | 1.6 cells, k 30 | tree spacing |

### Data flow against the schema

1. Sample elevation per cell, quantise to `{h, s}`: void `{0, none}`, water `{1|0, water}`, sand `{2, sand}`, grass `{3, grass}`.
2. Smooth with CA; drop connected land components under 4 cells.
3. Connectivity: flood fill land from spawn (a sand cell nearest the centre). For each unreached land component: if a straight 4-neighbour water run of 1 to 3 cells joins it at equal `h`, set those cells to `{h, bridge, w: waterH, m: planks|logs}`; if it touches reached land one tier different, convert the lower cell on the shared edge to `{h+1, ramp, d}` pointing away from the higher cell. Otherwise delete it. Repeat until the fill covers all land.
4. Surfaces: a 3 x 3 sand block becomes a `dirt` plaza; ramps get `m: stone`; BFS paths of `dirt` join spawn to ramps and bridges.
5. Decor, in priority order, each rejected if it would disconnect walkable cells (re-run the flood fill with the footprint blocked):
   - `waterfall` on every h0 water cell whose north or west neighbour is h1 water or land, `rot` facing that cliff.
   - `well` or `campfire` in the largest clearing: a sand or dirt cell whose 8 neighbours are walkable and empty.
   - trees by Poisson disc over grass cells (pine and round) and sand edge cells (gold), never on paths.
   - bushes, rocks, flowers at 0.15 per free cell; fences and coins on plateau edges.
6. Write `levels/<seed>.json`; `view.center` is the centroid of land cells at h2.

```
grid = quantise(lerp(octaves(seed), 1 - bump(x, z), mix))
grid = ca(grid, 2)
spawn = nearestSand(centre)
loop:
  reach = flood(grid, spawn)
  comp = firstUnreached(grid, reach)
  if !comp: break
  bridge(grid, comp, 1..3) or ramp(grid, comp) or erase(grid, comp)
paintSurfaces(grid, spawn)
for rule in [waterfall, clearing, poissonTrees, scatter]:
  for site in rule.sites(grid):
    if connectedWithout(grid, site.footprint): place(site)
```

### Failure modes to test

- Unreachable walkable cells after decor (flood count must equal walkable count).
- Ramp whose downhill neighbour is not exactly one tier lower, or whose axis runs off the grid.
- Bridge over more than 3 cells, or with no land at both ends.
- Waterfall on a cell with no higher neighbour, or facing the wrong way.
- Spawn on a cell a decor footprint blocks.
- Islands that lose the two-tier shape: grass share outside 25 to 45% of land, or grass split into more than one component.
- Repair erasing over 20% of land; regenerate.
