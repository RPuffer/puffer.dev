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

Running total: $4.085
