# Decor loops: from scattered props to a lived-in place

## What the levels show (measured 2026-10-02)

| Level (clusters link within 1.5 cells) | Props | Per walkable cell | Clusters | Singletons | Largest |
| --- | --- | --- | --- | --- | --- |
| `home` (pack reference) | 35 | 0.59 | 8 | 1 | 13 |
| `ember-subject` | 14 | 0.15 | 11 | 8 | 2 |
| `gremlin-subject` | 19 | 0.18 | 9 | 5 | 6 |

On `home` barrels sit by the well and flowers fill the yard; on `ember-subject` bone piles and horns stand one per plateau. Singleton share separates pack from build. `home` also runs at 0.59 per walkable cell, double the rubric's 0.25 to 0.35 (REFINEMENT.md critic line 9), so that target needs a recount before any loop optimises toward it.

## Principles and their tests

| Principle | Source | Test |
| --- | --- | --- |
| Group by proximity: gaps inside a group stay smaller than gaps between groups | Gestalt proximity; NN/g | Singleton share under 0.15; median intra-cluster gap at most half the median inter-cluster gap |
| Group by similarity: a cluster shares a family (wood, stone, bone, plant) | Gestalt similarity; Animal Crossing set and series bonuses reward 3 or 4 same-family items together | Share of clusters of 3 or more where at least two thirds of items share a family tag |
| Continuity: dressing lines edges, fences and the path's kerb | Gestalt good continuation | Share of props within one cell of a path edge, cliff lip or fence run |
| Density by zone: sparse near the figure and path, rich at destinations | Carson's "less is more", detail saved for the destination | Props per walkable cell in three rings (figure ring, approach, rim); the figure ring runs lowest, the destination plateau highest |
| Cause and effect: props imply what happened here | Carson; Smith and Worch, "What Happened Here?" (GDC 2010) | Each story beat from the brief maps to a cluster of 2 or more props near its cell |
| Breadcrumbs: a trail leads in | Carson, "Following Saknussemm" | Props along the approach spaced at most 3 route cells apart from spawn to threshold |
| One hero prop per vignette, the rest subordinate | Carson's single lit prop; film set dressing splits hero props from background dressing | In each cluster, one prop at least 1.5 times the next tallest |
| Decor quieter than the player and figure | Valve, Mitchell 2008: environments "desaturated relative to players"; "too many areas of contrast" | Mean saturation and local contrast in the figure's screen box exceed the rim's |
| Clutter cost | Rosenholtz, Li, Nakano 2007 (feature congestion, subband entropy, edge density) | Edge density in the figure box over edge density in the rim band, target above 1.2 |
| Prop fits its surface | Stardew's indoor-only furniture; catalog `attach` | Zero mismatches: waterfalls on cliffs, nothing blocking on ramps |

## Three loops

**Rule loop.** A pass after `finishLens`. It clusters props, moves each singleton to the nearest same-family cluster or the path kerb, adds members to thin vignettes from the island's catalog, and prunes to zone density targets, rerunning `h.walkN()` and the reach rule after each move. It costs nothing and needs no render. It can't see the picture: a cluster that reads in plan can hide behind a cliff in iso, and shared rules push ten islands toward one pattern unless per-artwork family tags and seeded jitter keep them apart.

**Saliency loop.** Render at `hero=0`, compute a saliency map (colour, intensity and orientation contrast, or spectral residual) plus edge density, and score the figure's box and the route's screen polygon against the rim band. Where a rim prop wins, the loop swaps it for a quieter variant or moves it one cell off the sightline, then rerenders. It measures the picture the operator judges and catches occlusion. Each step costs a headless render, scores jitter when a prop shifts one cell, and saliency rewards a dull island whose figure wins by default, so it needs the rule loop's floor beneath it.

**Story loop.** From the deep analysis, a reader writes three to five beats along the approach (a broken threshold, a last meal, the creature's leavings by its lair), each with a cell range and prop family. The check passes when each beat has a cluster of two or more in range, in route order. With Gemini out, the build agent writes beats by hand as in round 5. This loop carries the artwork into the decor. It costs a model call or agent judgment, and it can't tell whether a bone pile reads as a story.

## Build first

The rule loop: no render, no model, it targets the failure the table shows, and both other loops assume clustered input. Saliency comes second; story follows once beats join the brief schema.

First three metrics:

1. **Singleton share**: props with no neighbour within 1.5 cells, over all props. `home` 0.03, `ember-subject` 0.57. Target 0.15.
2. **Zone density**: props per walkable cell in the figure ring, the approach and the rim, targets taken from `home`.
3. **Figure-versus-rim edge ratio** on the render.

## The decor card

A fortress `approve` card per island with, before and after side by side, each with overlays: clusters outlined, singletons ringed red, the saliency heat map, beat labels on their cells. The note lists singleton share, zone densities, edge ratio and reach count before and after. The context names each beat and flags any left unmet. The operator judges whether the island looks lived in; the numbers say what changed.

## Sources

- Don Carson, "Environmental Storytelling: Creating Immersive 3D Worlds Using Lessons Learned from the Theme Park Industry", Game Developer (gamedeveloper.com).
- Harvey Smith and Matthias Worch, "What Happened Here? Environmental Storytelling", GDC 2010 (gdcvault.com/play/1012647).
- Jason Mitchell, "Connecting Visuals to Gameplay at Valve", MIGS 2008 (Valve publications PDF).
- Ruth Rosenholtz, Yuanzhen Li, Lisa Nakano, "Measuring visual clutter", Journal of Vision 7(2), 2007; software record at dspace.mit.edu/handle/1721.1/37593.
- Aurora Harley, "Proximity Principle in Visual Design", NN/g, 2020; Wikipedia, "Principles of grouping".
- Nookipedia, "Happy Home Academy" and "Island evaluation"; Stardew Valley Wiki, "Furniture"; Wikipedia, "Set dresser".

WebSearch and Firecrawl search errored all session; every source came from a direct fetch. Bethesda, Naughty Dog, Hitman, Dishonored, Supergiant and Sims sources were unreachable, and none of their claims appear here.
