# Resume point (written 2026-10-07 at sign-off)

Pass 4 (the run) is mid-flight. Read this, then docs/PIPELINE-BRIEF.md (Pass 4 section) and docs/DECISIONS.md (last four lines).

## Done and committed
- Engine: elevators read levels/run.json, carry `role: entry|exit`, arrival places the hero on the platform (`?arrive=entry|exit`); `tools/loops/pass.mjs <level>` is the standing pass; `tools/qa-run.mjs` rides the whole run headless; `tools/qa-things.mjs <level>` handles two elevators.
- Islands A (cat, dragon, chimera, wizard, swallow, sharkbear): things placed through `placeThings` in each module, levels rebuilt, critic 0 high, qa-levels 14/14 each; qa-things 36/36 on five, sharkbear 34/36 (bonfire inside the watcher radius) with a fix in progress.
- Islands B (gremlin, mindbloom, eagle, forest, cosmos, ember): things placed and committed, pass.mjs PASS on all six, qa-levels 14/14; cosmos greedy 50 to 20, eagle 26 to 18. Final renders, critic, and qa-things were still running at sign-off.
- The creature in sharkbear is a shark-gorilla (operator correction); analysis, briefs, and sheet manifest corrected; a new reference sheet regenerated (commit edcdf96); the figure builder rebuild was in progress.
- The last commit before this note is a WIP snapshot of whatever the three agents had on disk; treat the modified files in it as possibly half-done.

## To finish pass 4
1. Verify sharkbear: `node tools/qa-things.mjs sharkbear-medium` to 36/36 (move the bonfire outside radius 4.41 or shrink the radius to 3.5), and confirm the figure builder in 3d/pieces/sharkbear.js is the gorilla version (knuckle-walk, hunched back, fin, tail); if not, rebuild it from pipeline/refsheets/sharkbear.png per the Pass 3 figure rules.
2. Render every island: `?level=<island>&hero=0` at 900x800 into out/pass4/a|b/<island>.png (clear `<profile>/Default/Cache` first), critic once each, fix highs.
3. Ride the run: `sh tools/serve.sh` then `node tools/qa-run.mjs` to 0 fail; then qa-levels on all twelve and qa.mjs.
4. Record results under a "Pass 4" heading in docs/RUN.md (things cells per island, greedy steps, ride result), roll critic spend into docs/SPEND.md under Refinement, commit.
5. Capture a ride clip (tools/clip.mjs or a scripted puppeteer walk through two hops) and file an approve card `puffer-isoworld-pass-4-run` with the sheet, the clip, and per-island renders, per ~/dev/cauldron/fortress/docs/review-queue.md.

## Known traps
- qa-levels drops a keypress under CPU load; rerun a failing level alone with a fresh PP_PROFILE.
- Never read a level JSON whole; use node snippets.
- tools/shot.mjs reuses the Chrome cache; clear `<profile>/Default/Cache` after module edits.
