# Variant A spend

Allocation: $5.00. Figures come from `pipeline/critic.mjs` token tallies at $0.50 per million input and $3.00 per million output tokens.

date | model | count | $ | purpose
--- | --- | --- | --- | ---
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

Total: $0.82 of $5.00

## Round 2: concepts

Allocation: $10.00 across all five concepts. Same token rates as above.

date | level | model | count | $ | purpose
--- | --- | --- | --- | --- | ---
2026-09-23 | all five | gemini-3.8-flash | 7 | 0.2683 | analyze.mjs first pass, five briefs (scene and motif-remap took a retry)
2026-09-23 | motif-remap, composition-only | gemini-3.8-flash | 3 | 0.1050 | analyze.mjs rerun after tuning the spiral and void-rim fragments
2026-09-23 | composition-only | gemini-3.8-flash | 1 | 0.0312 | analyze.mjs rerun for asymmetric masses
2026-09-23 | forest-a-pack-first | gemini-3.8-flash | 6 | 0.0741 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | forest-a-pack-first | gemini-3.8-flash | 6 | 0.0632 | critic round 2

Round 2 total: $0.54 of $10.00 (briefs $0.40, forest-a-pack-first critic $0.14)
2026-09-23 | forest-a-scene | gemini-3.8-flash | 6 | 0.0818 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | forest-a-scene | gemini-3.8-flash | 7 | 0.0770 | critic round 2 (351 took a retry)
2026-09-23 | forest-a-scene | gemini-3.8-flash | 6 | 0.0516 | critic round 3
2026-09-23 | forest-a-biome | gemini-3.8-flash | 6 | 0.0444 | critic round 1
2026-09-23 | forest-a-biome | gemini-3.8-flash | 6 | 0.0498 | critic round 2

forest-a-scene and forest-a-biome critic: $0.30 of their $2.50 share
2026-09-23 | forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0554 | critic round 1, 351 and 900 (3 votes each)
2026-09-23 | forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0497 | critic round 2
2026-09-23 | forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0500 | critic round 3
2026-09-23 | forest-a-motif-remap | gemini-3.8-flash | 6 | 0.0687 | critic round 4
2026-09-23 | forest-a-composition-only | gemini-3.8-flash | 6 | 0.0522 | critic round 1
2026-09-23 | forest-a-composition-only | gemini-3.8-flash | 6 | 0.0555 | critic round 2

## Round 3: every artwork, best of three

Allocation: $15.00 across the round. Same token rates as above. Artwork agents log their critic runs below under their slug.

date | level | model | count | $ | purpose
--- | --- | --- | --- | --- | ---
2026-09-29 | cat-1..3 | gemini-3.8-flash | 16 | 0.5120 | analyze.mjs: first three readings, tuning the variant approach shapes, retries after invalid JSON and a bad catalog type
2026-09-29 | 10 artworks x 3 | gemini-3.8-flash | 60 | 1.9285 | analyze.mjs: 30 briefs with the avoid chain (32 runs, validation retries included)
2026-09-29 | cat-1 | gemini-3.8-flash | 30 | 0.1838 | critic rounds 1 to 4 and final, 351 and 900 (3 votes each)
2026-09-29 | cat-2 | gemini-3.8-flash | 24 | 0.2001 | critic rounds 1 to 3 and final
2026-09-29 | cat-3 | gemini-3.8-flash | 30 | 0.2087 | critic rounds 1 to 4 and final

Round 3 so far: $3.03 of $15.00 (briefs $2.44, cat critic $0.59)
2026-09-29 | ember-1, ember-2 | gemini-3.8-flash | 4 | 0.1295 | analyze.mjs: regenerated ember-1 (71 walkable) and ember-2 (65 walkable, cobble floor) with --avoid
2026-09-29 | ember-1..3 | gemini-3.8-flash | 18 | 0.1496 | critic round 1, 351 and 900 (3 votes each)
2026-09-29 | ember-1..3 | gemini-3.8-flash | 18 | 0.1438 | critic round 2
2026-09-29 | dragon-1 | gemini-3.8-flash | 1 | 0.0276 | analyze.mjs --variant 1 --avoid dragon-2,dragon-3: the first reading walked 66 cells in three masses
2026-09-29 | dragon-1 | gemini-3.8-flash | 24 | 0.1630 | critic rounds 1 to 3 and final, 351 and 900 (3 votes each)
2026-09-29 | dragon-2 | gemini-3.8-flash | 36 | 0.3744 | critic rounds 1 to 3, final, and two rounds after the h2 courtyard
2026-09-29 | dragon-3 | gemini-3.8-flash | 30 | 0.2640 | critic rounds 1 to 4 and final
2026-09-29 | chimera-2 | gemini-3.8-flash | 2 | 0.0558 | analyze.mjs: chimera-2 regenerated with --avoid chimera-1,chimera-3; the first reading built cobble pads everywhere
2026-09-29 | chimera-1 | gemini-3.8-flash | 30 | 0.3180 | critic rounds 1 to 4 and final, 351 and 900 (3 votes each)
2026-09-29 | chimera-2 | gemini-3.8-flash | 30 | 0.2851 | critic rounds 1 to 4 and final
2026-09-29 | chimera-3 | gemini-3.8-flash | 30 | 0.3031 | critic rounds 1 to 4 and final
2026-09-29 | swallow-2 | gemini-3.8-flash | 3 | 0.0921 | analyze.mjs --variant 2 --avoid swallow-1,swallow-3: the first reading was cobble pads everywhere; the regenerated reading walked 70 cells, so the committed brief stays and finish repaints the stone
2026-09-29 | swallow-1 | gemini-3.8-flash | 21 | 0.1826 | critic rounds 1 to 3 and final, 351 and 900 (3 votes each)
2026-09-29 | swallow-2 | gemini-3.8-flash | 15 | 0.1183 | critic rounds 1 to 2 and final
2026-09-29 | swallow-3 | gemini-3.8-flash | 24 | 0.1973 | critic rounds 1 to 4
2026-09-29 | chimera-2 | gemini-3.8-flash | 9 | 0.0804 | critic runs on chimera-2 renders billed to the swallow profile: the chimera agent overwrote a shared scratchpad loop script
2026-09-29 | wizard-1 | gemini-3.8-flash | 1 | 0.0510 | analyze.mjs --variant 1 --avoid wizard-2,wizard-3: the first reading walked 60 cells and failed "ramp 8,6: uphill cell not level"
2026-09-29 | wizard-2 | gemini-3.8-flash | 1 | 0.0105 | analyze.mjs --variant 2 --avoid wizard-1,wizard-3: the first reading walked 78 cells on cobble pads everywhere
2026-09-29 | wizard-1 | gemini-3.8-flash | 30 | 0.3462 | critic rounds 1 to 6, 351 and 900 (3 votes each)
2026-09-29 | wizard-2 | gemini-3.8-flash | 30 | 0.3713 | critic rounds 1 to 6
2026-09-29 | wizard-3 | gemini-3.8-flash | 18 | 0.1608 | critic rounds 1, 2 and 5
2026-09-29 | swallow-1, swallow-3 | gemini-3.8-flash | 18 | 0.1527 | critic runs on swallow renders billed to the wizard agent: it ran a shared scratchpad loop.sh the swallow agent had overwritten
2026-09-29 | cosmos-2 | gemini-3.8-flash | 2 | 0.0640 | analyze.mjs --variant 2 --avoid cosmos-1,cosmos-3: the first reading walked 74 cells; the regenerated one walked 63, so the committed brief stays and finish thins blockers
2026-09-29 | cosmos-1..3 | gemini-3.8-flash | 18 | 0.1529 | critic round 1, 351 and 900 (3 votes each)
2026-09-29 | cosmos-1..3 | gemini-3.8-flash | 18 | 0.1620 | critic round 2
2026-09-29 | cosmos-1..3 | gemini-3.8-flash | 18 | 0.1414 | critic round 3
2026-09-29 | cosmos-1..3 | gemini-3.8-flash | 18 | 0.1550 | critic round 4
2026-09-29 | cosmos-1..3 | gemini-3.8-flash | 18 | 0.1612 | critic final
