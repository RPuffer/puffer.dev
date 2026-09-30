# Refinement

A player feels an island in three layers. Life comes first: in the first second you notice whether the crowns sway, the flame flickers and the cat breathes. Place comes next, as you walk: an arch frames the threshold, a bridge joins two masses, a chest opens and a gate lifts. Finish lands last, on a longer look: chamfered edges catch light, creatures share proportions, and every island reads as the same pack. The build stage already carries shapers, `finishLens`, per-level style hooks, GLB loading and per-material merging. Motion, set pieces and cohesion each need their own schema fields, engine hooks and critic checks, so they go in a fourth stage, refine, that runs on a level the critic has already passed. A bad refine pass then rolls back without a rebuild, and refine reruns across all ten picks without touching their briefs.

## Idea catalogue

Detail lives in `docs/refinement/motion.md`, `docs/refinement/setpieces.md` and `docs/refinement/cohesion.md`.

**Life**

- Canopy, flower and bush sway: crowns lean a few pixels out of phase, bent by height above a baked root.
- Flame flicker: tongues stretch and twist with the same bend, run fast and tip-weighted.
- Waterfall flow and water shimmer: bands slide down and bubbles drift, the fragment stage picking between two baked swatches.
- Lantern and shrine pulse: glass steps between two swatches on a slow square wave.
- Figure breath and blink: the chest rises 2 to 3 px every 4 s, eye vertices collapse for two frames at irregular times.
- Watching creature: the head splits out as a live part and yaws toward the hero inside a radius.
- Rustle: flowers and bushes lean away from the hero through one position uniform.
- Footstep dust and splash: pooled instanced cubes puff on step crossings and at water edges.
- Pickup bob and collect pop: coins rise, turn and scale out through one instanced mesh.

**Place**

- Arch or gate: a 3x1 stamp frames the threshold, flanks block, centre passes under a lintel.
- Bridge span: a 1xN stamp joins two masses of equal height over water or void.
- Big tree: a trunk blocks one cell and a 3x3 canopy shades a passable clearing.
- Road run: a surface along `approach()` with kerb decor leads the eye to the figure.
- Shrine or bonfire: a plinth and light mark the rest beat and respawn cell.
- Wall, fence and ruin runs: an edge-tagged autotile encloses a yard, with hash-dropped cells for ruin.
- Chest and dialog spot: a use trigger raises a toast, a near trigger speaks one line.
- Gate that opens after the boss: a thing with blocked cells clears them on a flag.
- Elevator and dock: the seam to the next island, landing on a plank edge.

**Finish**

- Chamfered top edges: blocks gain the lit rim the pack shows, a 0.04-tile chamfer toned toward white.
- Hue-shifted ramps: each brief colour becomes a five-step ramp that shifts hue as it brightens.
- Face ratio lock: left and right faces derive from top at fixed luminance, so one light rig covers every island.
- Highlight ceiling: the top ramp step covers at least 3% of pixels, which catches the muddy forest failure.
- Silhouette budget: at most 12 parts over 0.15 tile per creature, tiny parts only on the face.
- Proportion rule: head at 0.35 to 0.45 of body height and stacks on the pine taper, so creatures look related.
- Shared primitives: `wedge`, `slab`, `spike` and `plinth`, copied across 11 modules today, move to one module with `lathe` and `taperBox`.
- Shared lip and drip band: one lip thickness and drip count ties every island to the pack.
- Clutter and edge wear: one small item per 3 to 4 walkable cells, chipped lips on 1 in 8 edges.

## Three routes

**Route 1, all procedural.** The engine gains a sway attribute baked by `Baker` and chained onto the x-ray `onBeforeCompile`, a small set of live parts plus a tween module, a shared primitives and style module, and stamp helpers in `finish-helpers.mjs`. Schema adds a per-cell `mask` to the catalog, a `things` array to levels, and a per-slug style sheet. Brief to render stays automatic, and one stamp serves every island. Spend is $0. Risk to the flat look is the lowest of the three: a leaning crown keeps its three baked tones. Verdict: cheapest and safest, and weakest on focal creature proportion.

**Route 2, authored assets.** Creatures come from Blender or a mesh generator as rigged GLBs with idle and reaction clips, models follow image-model reference sheets, and set pieces get placed by hand. The engine needs an `AnimationMixer` branch, since `loadGlbs` bakes static tris and `mergeable` rejects skinned meshes, plus a palette `snap` strong enough to recover the pack's swatches. Only the terrain stays automatic. Authoring costs a modelling job per creature and a human in the loop per island. Risk to the flat look is high: smooth curves and skinned deformation read as another game. Verdict: right for a boss, wrong for decor and for ten islands.

**Route 3, hybrid.** Ambient life, stamps, clutter and the style bible stay procedural as in Route 1. For each focal creature an image model draws a reference sheet in pack style at about $0.05, and the build agent reads it to size the code-built figure. GLB clips appear only for bosses, on their own loader branch. Everything but boss rigging stays automatic, and spend stays under a dollar across the ten picks. Risk to the flat look sits low, bounded by the cohesion critic catching sheet drift. Verdict: Route 1's safety with a fix for proportion where cube stacking fails.

**Recommendation: Route 3.** All three lanes converged on procedural work, and seven of your ten picks are the medium lens, where the pack's flat, chunky look carries the reading, so the engine should keep baked colour and code-built figures. The hybrid adds reference sheets only where the cohesion lane found cube stacking failing and defers GLB until a boss needs a clip.

## Staged plan

1. **Wind on home.** Add the sway attribute and chain it onto the land and decor materials, tag crowns, flowers, flames and waterfall bands, and freeze time at `hero=0` for `compare.mjs`. Visible: `home` sways, flickers and flows at its current 5 decor draw calls. Check: motion. No sub-2 px shimmer on trunks, neighbours out of phase, draw calls unchanged, and `prefers-reduced-motion` stills it.
2. **Style bible on cat-medium.** Ship the shared primitives module, chamfered `rbox`, ramps and the face ratio lock; generate one reference sheet and rebuild the cat to the proportion rule and silhouette budget, then tag breath, blink and a watching head. Visible: the cat reads as a face, breathes and follows you. Check: cohesion metric. Face ratio within 0.08, palette CIEDE2000 at or under 6, V p90 at or above 0.80, 12 parts or fewer.
3. **Stamps on ember-subject.** Add the catalog `mask`, the 2d per-cell column split, and arch, bridge-span and canopy stamps; `h.gate` places the arch in place of the two posts. Visible: an arch frames the approach where two sticks stand today. Check: readability. Route of 9 to 16 cells, threshold at 0.3 to 0.7 of it, at most 3 consecutive route cells under x-ray, `qa-levels.mjs` green.
4. **Things on wizard-medium.** Add `things` and `core/interact.js` with a bonfire, a chest toast, a gate that opens after the boss and an elevator stub, then clutter and wear through the style sheet. Visible: walk in, open the chest, watch the gate lift. Check: reach, with everything reachable gates open and the bonfire reachable gates closed, plus clutter at 0.25 to 0.35 items per walkable cell.

Each stage lands as a before-and-after fortress card.

## Refinement critic

1. Jitter: motion amplitude is 0 or at least 2 px; `dt` clamps on tab return.
2. Popping: tweens start from the current value, pickups scale out, phase survives reloads.
3. Stepped pulses: lights change between swatches, idle stays slow sine, triggers use back-out easing.
4. Distraction: peripheral motion below the hero's, one fast mover per screen region.
5. Highlight: V p90 of non-background pixels at or above 0.80.
6. Face ratio: left/top and right/left luminance within 0.08 of 0.88 and 0.75.
7. Palette: every swatch within CIEDE2000 6 of its ramp; hue and key stay free.
8. Silhouette and scale: 12 parts or fewer per creature, decor 0.3 to 2.4 tiles, focal up to 3.
9. Grammar and clutter: lip, drip and bevel match REFERENCE.md; 0.25 to 0.35 items per walkable cell, none on paths.
10. Path and threshold: route 9 to 16 cells, 70% on path surface, gate at 0.3 to 0.7 with both flanks blocked.
11. Focal and landmark: lead in the screen's middle third with nothing taller 2 cells in front; spawn sees the elevator, the bonfire sits within 3 cells of it.
12. Occlusion and reach: at most 3 consecutive route cells under x-ray; the two-state reach rule holds.

## Open questions

1. Do you want bosses at all? If no, Route 3 drops its GLB branch and becomes Route 1 plus reference sheets.
2. Do the islands link into a run through elevators, or stay separate postcards? The answer decides whether stage 4 ships now.
3. Should the cohesion critic hold hue and key free or pull islands toward the pack's bright key?
4. May reference sheets spend while Gemini credit is out or does stage 2 wait for Gemini?
5. How much motion suits the pack: ambient life only, or creatures that react to you as well?
