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
2026-09-29 | mindbloom-1 | gemini-3.8-flash | 24 | 0.1769 | critic rounds 1 to 4, 351 and 900 (3 votes each); round 1 split evenly across the three levels
2026-09-29 | mindbloom-2 | gemini-3.8-flash | 24 | 0.1814 | critic rounds 1 to 4
2026-09-29 | mindbloom-3 | gemini-3.8-flash | 24 | 0.1972 | critic rounds 1 to 4
2026-09-29 | sharkbear-1 | gemini-3.8-flash | 12 | 0.1049 | critic rounds 1 to 2, 351 and 900 (3 votes each); 0 high both rounds
2026-09-29 | sharkbear-2 | gemini-3.8-flash | 12 | 0.0856 | critic rounds 1 to 2; 0 high both rounds
2026-09-29 | sharkbear-3 | gemini-3.8-flash | 12 | 0.1002 | critic rounds 1 to 2; 0 high both rounds, 1 medium on the engine's dirt stipple
2026-09-29 | gremlin-1, gremlin-2, gremlin-3 | gemini-3.8-flash | 4 | 0.1145 | analyze.mjs --variant k --avoid the other two: gremlin-1 walked 53 cells, gremlin-2 was cobble pads everywhere, gremlin-3 held the creature mid-arena with no 12-cell approach
2026-09-29 | gremlin-1 | gemini-3.8-flash | 24 | 0.2299 | critic rounds 1 to 4, 351 and 900 (3 votes each)
2026-09-29 | gremlin-2 | gemini-3.8-flash | 24 | 0.1889 | critic rounds 1 to 4
2026-09-29 | gremlin-3 | gemini-3.8-flash | 24 | 0.1697 | critic rounds 1 to 4
2026-09-29 | eagle-1 | gemini-3.8-flash | 24 | 0.2117 | critic rounds 1 to 4, 351 and 900 (3 votes each); 0 high every round
2026-09-29 | eagle-2 | gemini-3.8-flash | 30 | 0.2313 | critic rounds 1 to 4 plus a round-5 check of the round-4 fix
2026-09-29 | eagle-3 | gemini-3.8-flash | 24 | 0.1651 | critic rounds 1 to 4; 0 high every round, 1 medium on the engine's dirt stipple
2026-09-29 | cat-1 | gemini-3.8-flash | 1 | 0.0236 | analyze.mjs --variant 1 --avoid cat-2,cat-3: rebuild of the pre-floor cat-1; new reading walked 97 cells before finish
2026-09-29 | cat-1 | gemini-3.8-flash | 24 | 0.1720 | critic rounds 1 to 4, 351 and 900 (3 votes each); 0, 0, 1, 0 high; round 3 high on stone stairs read as floating pads

## Round 4: readings derived from the artwork

Allocation: $15.00 across the round. Same token rates as above. Artwork agents log their critic runs below under their slug.

date | level | model | count | $ | purpose
--- | --- | --- | --- | --- | ---
2026-09-29 | analyses | gemini-3.8-flash | 17 | 0.1527 | analyze.mjs --deep: three tuning runs (swallow, cosmos, cat), then all twelve seeds after the story prompt asked for a concrete habitat
2026-09-29 | swallow-* | gemini-3.8-flash | 18 | 0.7954 | analyze.mjs --lens: medium once, subject twice (second after the palette-from-habitat rule), composition four times (two runs failed validation before surface and bg clashes became repairs)
2026-09-29 | eleven artworks | gemini-3.8-flash | 51 | 3.2836 | analyze.mjs --lens for the other 33 briefs; 8 failed on the old strict sibling checks and were regenerated
2026-09-29 | swallow-medium | gemini-3.8-flash | 30 | 0.2020 | critic r0 check, rounds 1 to 4 at 351 and 900 (3 votes each): 0, 1, 0, 0 high
2026-09-29 | swallow-subject | gemini-3.8-flash | 36 | 0.2400 | critic r0 check, rounds 1 to 5: 0, 0, 0, 1, 0 high; round 5 checked the finish change after round 4
2026-09-29 | swallow-composition | gemini-3.8-flash | 24 | 0.1780 | critic rounds 1 to 4: 0, 0, 1, 0 high

Round 4 running total: $4.8517 (briefs and analyses $4.2317, swallow critic $0.6200).
2026-09-29 | ember-medium | gemini-3.8-flash | 18 | ~0.12 | critic rounds 1, 2, 4 at 351 and 900 (3 votes each): 0, 0, 0 high; round 3 changed only subject and composition
2026-09-29 | ember-subject | gemini-3.8-flash | 24 | ~0.19 | critic rounds 1 to 4: 3, 0, 0, 0 high (bone piles beside vents read as critters clipping into props)
2026-09-29 | ember-composition | gemini-3.8-flash | 24 | ~0.17 | critic rounds 1 to 4: 0, 1, 0, 0 high (horn gate beam floated off the curled posts)
2026-09-29 | chimera-medium | gemini-3.8-flash | 18 | ~0.20 | critic rounds 1 to 3 at 351 and 900 (3 votes each): 0, 0, 0 high
2026-09-29 | chimera-subject | gemini-3.8-flash | 12 | ~0.12 | critic rounds 1 and 2: 0, 0 high
2026-09-29 | chimera-composition | gemini-3.8-flash | 18 | ~0.12 | critic rounds 2 to 4 (round 1 rebuilt before a critic run): 0, 1, 0 high (curled tail overhung the rim and read as a cairn)
2026-09-29 | dragon-medium | gemini-3.8-flash | 18 | 0.1353 | critic rounds 1 to 3 at 351 and 900: 1, 0, 0 high
2026-09-29 | dragon-subject | gemini-3.8-flash | 18 | 0.1434 | critic rounds 1 to 3: 0, 0, 0 high
2026-09-29 | dragon-composition | gemini-3.8-flash | 18 | 0.1454 | critic rounds 1 to 3: 2, 0, 0 high
2026-09-29 | cat-medium | gemini-3.8-flash | 18 | 0.1066 | critic rounds 1 to 3 at 351 and 900: 1, 0, 0 high (bristle tuft on a plateau lip read as a pencil pot on a bridge)
2026-09-29 | cat-subject | gemini-3.8-flash | 12 | 0.0741 | critic rounds 1 to 2: 0, 0 high
2026-09-29 | cat-composition | gemini-3.8-flash | 24 | 0.1338 | critic rounds 1 to 4: 0, 1, 0, 0 high (route markers on the teal stair read as stepping stones in a stream)
2026-09-29 | forest-medium | gemini-3.8-flash | 18 | 0.1163 | critic rounds 4, 5 and 8 at 351 and 900 (3 votes each): 0, 0, 0 high
2026-09-29 | forest-subject | gemini-3.8-flash | 30 | 0.2655 | critic rounds 4, 5, 6, 7 and 9: 1, 1, 0, 0, 0 high; round 9 checked the unhide pass
2026-09-29 | forest-composition | gemini-3.8-flash | 24 | 0.1811 | critic rounds 4, 5, 8 and 9: 1, 0, 0, 0 high
2026-09-29 | wizard-medium | gemini-3.8-flash | 12 | 0.0861 | critic rounds 1 to 2 at 351 and 900: 0, 0 high (round 2 on the parchment-and-ink repaint)
2026-09-29 | wizard-subject | gemini-3.8-flash | 12 | 0.1060 | critic rounds 1 to 2: 0, 0 high
2026-09-29 | wizard-composition | gemini-3.8-flash | 12 | 0.0658 | critic rounds 3 to 4: 0, 0 high
2026-09-29 | mindbloom-medium | gemini-3.8-flash | 12 | 0.0978 | critic rounds 1 and 2 at 351 and 900 (3 votes each): 0, 0 high
2026-09-29 | mindbloom-subject | gemini-3.8-flash | 12 | 0.0998 | critic rounds 1 and 2: 0, 0 high
2026-09-29 | mindbloom-composition | gemini-3.8-flash | 18 | 0.1579 | critic rounds 1 to 3: 0, 0, 0 high; round 3 checked the grass neck and path after round 2
2026-09-29 | gremlin-medium | gemini-3.8-flash | 18 | 0.0961 | critic rounds 1, 3 and 4 at 351 and 900: 0, 0, 0 high
2026-09-29 | gremlin-subject | gemini-3.8-flash | 18 | 0.1458 | critic rounds 1, 3 and 4: 0, 0, 0 high
2026-09-29 | gremlin-composition | gemini-3.8-flash | 24 | 0.1753 | critic rounds 1, 3, 4 and 5: 0, 1, 0, 0 high (orb-plinth gate beam across the ramp foot)
