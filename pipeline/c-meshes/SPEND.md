# Variant C spend

Allocation: $25.00. `ledger.jsonl` holds one line per paid call; `lib.mjs` refuses any call that would push the total past the cap. Critic costs are the token estimates `pipeline/critic.mjs` prints.

date | model | count | $ | purpose
2026-09-23 | gemini-3.1-flash-image | 18 | 0.810 | sprites.mjs: two candidates for each of 9 types
2026-09-23 | fal-ai/trellis | 9 | 0.180 | meshes.mjs: one mesh per accepted sprite
2026-09-23 | gemini-3.8-flash (vision) | 19 | 0.755 | critic.mjs: 10 rounds, 351x390 and 900x800 (round 1 at 351 only)

Total: $1.745
