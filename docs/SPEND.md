# Spend log

date | model | count | $ | purpose

2026-09-23 | gemini-3.1-flash-image | 2 | 0.09 | 2d sprites: style probe, tile-grass + tile-sand blocks
2026-09-23 | gemini-3.1-flash-image | 47 | 2.115 | 2d sprites: first pass of every tile, decor variant, waterfall, hero front
2026-09-23 | gemini-3.1-flash-image | 10 | 0.45 | 2d sprites: outline-free retries (crate, chest, rock-1, rock-big-1, signpost), ramp-w x2, hero front-1/back-0/back-1
2026-09-23 | gemini-3.1-flash-image | 4 | 0.18 | 2d engine: stump, ladder, scaffold, log bridge for the new catalog types (ramp-w/n, stone ramp, marker, fence-pen, bush-cluster built at $0)

Total: $2.835

## Pipeline

2026-09-23 | gemini-3.8-flash (vision) | 15 | 0.35 | pipeline analyze.mjs: 9 runs on the forest seed while tuning the brief prompt (estimate from tokens at $0.50/M in, $3/M out)
2026-09-23 | gemini-3.8-flash (vision) | 58 | 0.90 | pipeline critic.mjs: calibration on home and a planted-fault copy of home at 351x390 and 900x800 (same estimate)
2026-09-23 | sharp (local) | 1 | 0.0000 | variant A: regions.mjs luminance, gradient and swirl measurement
2026-09-23 | gemini-3.8-flash | 6 | 0.0372 | variant A: critic round 1, 351 and 900 (3 votes each)
2026-09-23 | gemini-3.8-flash | 6 | 0.0782 | variant A: critic round 2
2026-09-23 | gemini-3.8-flash | 6 | 0.0386 | variant A: critic round 3
2026-09-23 | gemini-3.8-flash | 6 | 0.0603 | variant A: critic round 4
2026-09-23 | gemini-3.8-flash | 6 | 0.0508 | variant A: critic round 5
2026-09-23 | gemini-3.8-flash | 6 | 0.0448 | variant A: critic round 6
2026-09-23 | gemini-3.8-flash | 6 | 0.0400 | variant A: critic round 7 (pack pass)
2026-09-23 | gemini-3.8-flash | 6 | 0.0543 | variant A: critic round 8
2026-09-23 | gemini-3.8-flash | 6 | 0.0416 | variant A: critic round 9
2026-09-23 | gemini-3.8-flash | 6 | 0.0499 | variant A: critic round 10
2026-09-23 | gemini-3.8-flash | 6 | 0.0487 | variant A: critic round 11
2026-09-23 | gemini-3.8-flash | 6 | 0.0496 | variant A: critic round 12
2026-09-23 | gemini-3.8-flash | 6 | 0.0591 | variant A: critic round 13
2026-09-23 | gemini-3.8-flash | 6 | 0.0440 | variant A: critic round 14
2026-09-23 | gemini-3.8-flash | 6 | 0.0551 | variant A: critic round 15
2026-09-23 | gemini-3.8-flash | 6 | 0.0630 | variant A: critic round 16
2026-09-23 | gemini-3.1-flash-image | 5 | 0.225 | variant B: concept round 1 candidates
2026-09-23 | gemini-3.1-flash-image | 4 | 0.180 | variant B: concept round 2 candidates (outline-free prompt)
2026-09-23 | gemini-3.8-flash (vision) | 42 | 0.31 | variant B: critic.mjs, 14 runs x 3 votes on r3 to r9 at 351x390 and 900x800 (estimate from token counts, about $0.022 per run)
2026-09-23 | gemini-3.1-flash-image | 5 | 0.225 | variant B: concept round 3 candidates, larger island (CONCEPT_CELLS=10x8)
2026-09-23 | gemini-3.8-flash (vision) | 36 | 0.26 | variant B: critic.mjs, 12 runs x 3 votes on the larger island and the small level after the piece changes (estimate)
2026-09-23 | gemini-3.1-flash-image | 18 | 0.810 | variant C: sprites.mjs: two candidates for each of 9 types
2026-09-23 | fal-ai/trellis | 9 | 0.180 | variant C: meshes.mjs: one mesh per accepted sprite
2026-09-23 | gemini-3.8-flash (vision) | 19 | 0.755 | variant C: critic.mjs: 10 rounds, 351x390 and 900x800 (round 1 at 351 only)
2026-09-23 | gemini-3.1-flash-image | 8 | 0.360 | variant C: second pass: stacked-cube trunks and round tree, arched roots (two candidates each)
2026-09-23 | fal-ai/trellis | 4 | 0.080 | variant C: second pass: re-mesh the four new picks (a 0.99 mesh_simplify try was refused, not billed)
2026-09-23 | gemini-3.8-flash (vision) | 4 | 0.200 | variant C: critic rounds 11 and 12
2026-09-23 | gemini-3.8-flash (vision) | 21 | 0.342 | final QA: critic on the fixed home at 351x390 and 900x800, then once on each out/final render

2026-09-23 | sharp (local) | 1 | 0.0000 | regions.mjs luminance, gradient and swirl measurement
2026-09-23 | gemini-3.8-flash | 6 | 0.0372 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | gemini-3.8-flash | 6 | 0.0782 | critic round 2
2026-09-23 | gemini-3.8-flash | 6 | 0.0386 | critic round 3
2026-09-23 | gemini-3.8-flash | 6 | 0.0603 | critic round 4
2026-09-23 | gemini-3.8-flash | 6 | 0.0508 | critic round 5
2026-09-23 | gemini-3.8-flash | 6 | 0.0448 | critic round 6
2026-09-23 | gemini-3.8-flash | 6 | 0.0400 | critic round 7 (pack pass)
2026-09-23 | gemini-3.8-flash | 6 | 0.0543 | critic round 8
2026-09-23 | gemini-3.8-flash | 6 | 0.0416 | critic round 9
2026-09-23 | gemini-3.8-flash | 6 | 0.0499 | critic round 10
2026-09-23 | gemini-3.8-flash | 6 | 0.0487 | critic round 11
2026-09-23 | gemini-3.8-flash | 6 | 0.0496 | critic round 12
2026-09-23 | gemini-3.8-flash | 6 | 0.0591 | critic round 13
2026-09-23 | gemini-3.8-flash | 6 | 0.0440 | critic round 14
2026-09-23 | gemini-3.8-flash | 6 | 0.0551 | critic round 15
2026-09-23 | gemini-3.8-flash | 6 | 0.0630 | critic round 16
2026-09-23 | all five | gemini-3.8-flash | 7 | 0.2683 | analyze.mjs first pass, five briefs (scene and motif-remap took a retry)
2026-09-23 | motif-remap, composition-only | gemini-3.8-flash | 3 | 0.1050 | analyze.mjs rerun after tuning the spiral and void-rim fragments
2026-09-23 | composition-only | gemini-3.8-flash | 1 | 0.0312 | analyze.mjs rerun for asymmetric masses
2026-09-23 | round 2 forest-a-pack-first | gemini-3.8-flash | 6 | 0.0741 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | round 2 forest-a-pack-first | gemini-3.8-flash | 6 | 0.0632 | critic round 2
2026-09-23 | round 2 forest-a-scene | gemini-3.8-flash | 6 | 0.0818 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | round 2 forest-a-scene | gemini-3.8-flash | 7 | 0.0770 | critic round 2 (351 took a retry)
2026-09-23 | round 2 forest-a-scene | gemini-3.8-flash | 6 | 0.0516 | critic round 3
2026-09-23 | round 2 forest-a-biome | gemini-3.8-flash | 6 | 0.0444 | critic round 1
2026-09-23 | round 2 forest-a-biome | gemini-3.8-flash | 6 | 0.0498 | critic round 2
2026-09-23 | round 2 forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0554 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | round 2 forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0497 | critic round 2
2026-09-23 | round 2 forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0500 | critic round 3
2026-09-23 | round 2 forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0687 | critic round 4
2026-09-23 | round 2 forest-a-composition-only | gemini-3.8-flash | 6 | 0.0522 | critic round 1
2026-09-23 | round 2 forest-a-composition-only | gemini-3.8-flash | 6 | 0.0555 | critic round 2

2026-09-29 | round 3 cat-1..3 | gemini-3.8-flash | 16 | 0.5120 | analyze.mjs: first three readings, tuning the variant approach shapes, retries after invalid JSON and a bad catalog type
2026-09-29 | round 3 10 artworks x 3 | gemini-3.8-flash | 60 | 1.9285 | analyze.mjs: 30 briefs with the avoid chain (32 runs, validation retries included)
2026-09-29 | round 3 cat-1 | gemini-3.8-flash | 30 | 0.1838 | critic rounds 1 to 4 and final, 351 and 900 (3 votes each)
2026-09-29 | round 3 cat-2 | gemini-3.8-flash | 24 | 0.2001 | critic rounds 1 to 3 and final
2026-09-29 | round 3 cat-3 | gemini-3.8-flash | 30 | 0.2087 | critic rounds 1 to 4 and final
2026-09-29 | round 3 ember-1, ember-2 | gemini-3.8-flash | 4 | 0.1295 | analyze.mjs: regenerated ember-1 (71 walkable) and ember-2 (65 walkable, cobble floor) with --avoid
2026-09-29 | round 3 ember-1..3 | gemini-3.8-flash | 18 | 0.1496 | critic round 1, 351 and 900 (3 votes each)
2026-09-29 | round 3 ember-1..3 | gemini-3.8-flash | 18 | 0.1438 | critic round 2
2026-09-29 | round 3 dragon-1 | gemini-3.8-flash | 1 | 0.0276 | analyze.mjs --variant 1 --avoid dragon-2,dragon-3: the first reading walked 66 cells in three masses
2026-09-29 | round 3 dragon-1 | gemini-3.8-flash | 24 | 0.1630 | critic rounds 1 to 3 and final, 351 and 900 (3 votes each)
2026-09-29 | round 3 dragon-2 | gemini-3.8-flash | 36 | 0.3744 | critic rounds 1 to 3, final, and two rounds after the h2 courtyard
2026-09-29 | round 3 dragon-3 | gemini-3.8-flash | 30 | 0.2640 | critic rounds 1 to 4 and final
2026-09-29 | round 3 chimera-2 | gemini-3.8-flash | 2 | 0.0558 | analyze.mjs: chimera-2 regenerated with --avoid chimera-1,chimera-3; the first reading built cobble pads everywhere
2026-09-29 | round 3 chimera-1 | gemini-3.8-flash | 30 | 0.3180 | critic rounds 1 to 4 and final, 351 and 900 (3 votes each)
2026-09-29 | round 3 chimera-2 | gemini-3.8-flash | 30 | 0.2851 | critic rounds 1 to 4 and final
2026-09-29 | round 3 chimera-3 | gemini-3.8-flash | 30 | 0.3031 | critic rounds 1 to 4 and final
2026-09-29 | round 3 swallow-2 | gemini-3.8-flash | 3 | 0.0921 | analyze.mjs --variant 2 --avoid swallow-1,swallow-3: the first reading was cobble pads everywhere; the regenerated reading walked 70 cells, so the committed brief stays and finish repaints the stone
2026-09-29 | round 3 swallow-1 | gemini-3.8-flash | 21 | 0.1826 | critic rounds 1 to 3 and final, 351 and 900 (3 votes each)
2026-09-29 | round 3 swallow-2 | gemini-3.8-flash | 15 | 0.1183 | critic rounds 1 to 2 and final
2026-09-29 | round 3 swallow-3 | gemini-3.8-flash | 24 | 0.1973 | critic rounds 1 to 4
2026-09-29 | round 3 chimera-2 | gemini-3.8-flash | 9 | 0.0804 | critic runs on chimera-2 renders billed to the swallow profile: the chimera agent overwrote a shared scratchpad loop script
2026-09-29 | round 3 wizard-1 | gemini-3.8-flash | 1 | 0.0510 | analyze.mjs --variant 1 --avoid wizard-2,wizard-3: the first reading walked 60 cells and failed "ramp 8,6: uphill cell not level"
2026-09-29 | round 3 wizard-2 | gemini-3.8-flash | 1 | 0.0105 | analyze.mjs --variant 2 --avoid wizard-1,wizard-3: the first reading walked 78 cells on cobble pads everywhere
2026-09-29 | round 3 wizard-1 | gemini-3.8-flash | 30 | 0.3462 | critic rounds 1 to 6, 351 and 900 (3 votes each)
2026-09-29 | round 3 wizard-2 | gemini-3.8-flash | 30 | 0.3713 | critic rounds 1 to 6
2026-09-29 | round 3 wizard-3 | gemini-3.8-flash | 18 | 0.1608 | critic rounds 1, 2 and 5
2026-09-29 | round 3 swallow-1, swallow-3 | gemini-3.8-flash | 18 | 0.1527 | critic runs on swallow renders billed to the wizard agent: it ran a shared scratchpad loop.sh the swallow agent had overwritten
2026-09-29 | round 3 cosmos-2 | gemini-3.8-flash | 2 | 0.0640 | analyze.mjs --variant 2 --avoid cosmos-1,cosmos-3: the first reading walked 74 cells; the regenerated one walked 63, so the committed brief stays and finish thins blockers
2026-09-29 | round 3 cosmos-1..3 | gemini-3.8-flash | 18 | 0.1529 | critic round 1, 351 and 900 (3 votes each)
2026-09-29 | round 3 cosmos-1..3 | gemini-3.8-flash | 18 | 0.1620 | critic round 2
2026-09-29 | round 3 cosmos-1..3 | gemini-3.8-flash | 18 | 0.1414 | critic round 3
2026-09-29 | round 3 cosmos-1..3 | gemini-3.8-flash | 18 | 0.1550 | critic round 4
2026-09-29 | round 3 cosmos-1..3 | gemini-3.8-flash | 18 | 0.1612 | critic final
2026-09-29 | round 3 mindbloom-1 | gemini-3.8-flash | 24 | 0.1769 | critic rounds 1 to 4, 351 and 900 (3 votes each); round 1 split evenly across the three levels
2026-09-29 | round 3 mindbloom-2 | gemini-3.8-flash | 24 | 0.1814 | critic rounds 1 to 4
2026-09-29 | round 3 mindbloom-3 | gemini-3.8-flash | 24 | 0.1972 | critic rounds 1 to 4
2026-09-29 | round 3 sharkbear-1 | gemini-3.8-flash | 12 | 0.1049 | critic rounds 1 to 2, 351 and 900 (3 votes each); 0 high both rounds
2026-09-29 | round 3 sharkbear-2 | gemini-3.8-flash | 12 | 0.0856 | critic rounds 1 to 2; 0 high both rounds
2026-09-29 | round 3 sharkbear-3 | gemini-3.8-flash | 12 | 0.1002 | critic rounds 1 to 2; 0 high both rounds, 1 medium on the engine's dirt stipple
2026-09-29 | round 3 gremlin-1, gremlin-2, gremlin-3 | gemini-3.8-flash | 4 | 0.1145 | analyze.mjs --variant k --avoid the other two: gremlin-1 walked 53 cells, gremlin-2 was cobble pads everywhere, gremlin-3 held the creature mid-arena with no 12-cell approach
2026-09-29 | round 3 gremlin-1 | gemini-3.8-flash | 24 | 0.2299 | critic rounds 1 to 4, 351 and 900 (3 votes each)
2026-09-29 | round 3 gremlin-2 | gemini-3.8-flash | 24 | 0.1889 | critic rounds 1 to 4
2026-09-29 | round 3 gremlin-3 | gemini-3.8-flash | 24 | 0.1697 | critic rounds 1 to 4
2026-09-29 | round 3 eagle-1 | gemini-3.8-flash | 24 | 0.2117 | critic rounds 1 to 4, 351 and 900 (3 votes each); 0 high every round
2026-09-29 | round 3 eagle-2 | gemini-3.8-flash | 30 | 0.2313 | critic rounds 1 to 4 plus a round-5 check of the round-4 fix
2026-09-29 | round 3 eagle-3 | gemini-3.8-flash | 24 | 0.1651 | critic rounds 1 to 4; 0 high every round, 1 medium on the engine's dirt stipple
2026-09-29 | round 3 cat-1 | gemini-3.8-flash | 1 | 0.0236 | analyze.mjs --variant 1 --avoid cat-2,cat-3: rebuild of the pre-floor cat-1; new reading walked 97 cells before finish
2026-09-29 | round 3 cat-1 | gemini-3.8-flash | 24 | 0.1720 | critic rounds 1 to 4, 351 and 900 (3 votes each); 0, 0, 1, 0 high; round 3 high on stone stairs read as floating pads

Running total: $20.205
