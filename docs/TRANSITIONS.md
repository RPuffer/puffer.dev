# Pass 7: elevator transitions

Plan for the six features in `docs/PIPELINE-BRIEF.md` "Pass 7". Timings live as constants in one file, `core/sequence.js`, so the card can retune them without touching the engine.

## 1. The sequence

Today: E on an exit sets `t.state = "rising"`, locks the actor, and `createInteract.update` raises `t.ride` over 1.6 s (`3d/things.js` lifts the deck by `ease.inOut(ride) * RISE`, RISE 2.4); at `ride >= 1` `defaultNavigate` sets `location.search` and the browser reloads. The new sequence keeps the first 1.6 s and replaces the reload.

| t (s) | Camera | Hero | Elevator and island | Speed lines | Clouds | Cue | Load |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.0 | zoom tween, fit to `closeZoom`, 1.2 s ease inOut; focus from feet+0.4 to feet+0.5; bounds clamp off | yaw tweens to face the camera (`-proj.dir` in xz), 0.3 s | `rising`, deck lifts as today | off | drift as today | prompt hides | `preload(next)` starts: JSON, pieces modules, GLBs |
| 0.3 | | dance clip, 2.0 to 2.3 s, picked by a counter cycling the library | | | | deck lamp brightens | |
| 1.6 | follows the hero up, unclamped | | deck at RISE; terrain, decor, things (minus shaft and deck) and the cloud mesh translate down, ease in, clear of the frame by 2.8; rungs start scrolling | fade in 0.5 s from 2.2 | go down with the island | `bg` 15% brighter for 0.12 s | |
| 2.6 | | dance ends, `brace` pose, jitter ±0.01 | | full speed | a 24-sprite loop column streams past | | |
| 2.6 to T | hold | hold | hold | hold | hold | | at least two beats (0.86 s), ends on the first dance beat after `ready` resolves |
| T | zoom back to the next island's fit, 1.0 s | | next island mounts `DROP` units below the frame with its entry deck under the hero, slides up ease out 1.0 s; ride RISE to 0 over the last 0.6 s with a 0.05 overshoot | fade out 0.6 s | next bed arrives with it | `pushState` to `?level=next&from=this&arrive=entry`; toast the island label | `swap()` commits |
| T+1.0 | clamp on | `land` clip 0.4 s, crossfade to idle; unlock | `idle` | off | normal | prompt returns | done |

Typical total 5.6 to 6.5 s. `closeZoom` makes the 0.93-unit hero 30% of the viewport height, `0.3 * h / 0.93` pixels per unit, 258 at 800 px tall, about 6x the fit on every island. An entry elevator runs the same table mirrored, `arrive=exit`.

Slow load: the hold loops (rungs, streaks, cloud column) until `ready`, up to 8 s. Failed load (fetch error, bad JSON, a pieces module that throws) or the 8 s cap: the sequence runs backward, the deck returns through the existing `returning` path, the hero unlocks on the exit platform and a toast reads the thing's `stub` or "The lift stalls"; `window.__swapError` holds the message for QA. A second E goes through `defaultNavigate`, so the error page in `3d/main.js` shows the cause and the available levels.

`prefers-reduced-motion`, `hero=0` and `t=` take a short path: no zoom, no streaks, a 0.6 s crossfade through `bg`; `motion.auto` in `3d/motion.js` already encodes those three.

## 2. One page per run

### What changes

`3d/main.js` becomes the run shell: renderer, hero, cloud atlas, input and UI once, then `run.boot(params)`. New `core/run.js`:

- `preload(name)`: `loadLevel(name, { beforePrepare: loadPieces })` (which imports the pieces modules and reads `run.json`), then `loadGlbs`, then `makeStyle`. Starts on the `ride` event `createInteract` already emits.
- `swap(level, { from, arrive, offset })`: unmounts the old island, `renderer.mount(level, state, offset)`, a new `createInteract(level, { params: { ...params, arrive, reset: undefined }, navigate: run.navigate })`, a new actor at `things.arrivalCell(arrive)`, rebinds input and clouds, pushes the URL.
- `navigate(next, from, arrive)`: the hook `createInteract` already accepts. `defaultNavigate` stays as the fallback.

`core/game.js`: `start` splits into `createGame(renderer, params)` (loop, input, `window.__game`) and `game.load(level, { arrive })` (view, projection, interact, actor, `renderer.mount`). `state.level`, `view`, `proj`, `actor` and `things` are reassigned on swap; the loop reads `state` each tick.

`3d/renderer.js`: `init(state)` splits into `create()` (gl, scene, camera, hero, resize listener) and `mount(level, state, offset)` (terrain, decor, things, `bounds`, `resize()`). `unmount()` removes the three groups and the cloud mesh and calls `dispose()` on every geometry and material under them and on the island `DataTexture` from `island()` in `3d/clouds/common.js`; removing from the scene frees nothing, `dispose()` does, and the renderer persists ([three.js cleanup manual](https://threejs.org/manual/en/cleanup.html)). Kept across swaps: renderer, hero, cloud atlas, `xray` and `motion` uniforms, `BUILDERS` and `GLBS` in `3d/hooks.js` (`loadGlbs` skips loaded types, so each GLB fetches once per run) and `CATALOG`. Pieces builders are style-bound closures, so `loadPieces` re-registers them per island before `buildDecor`, as it does on every page load today.

`placeCamera` takes an `unclamped` flag and `resize()` multiplies by `zoomScale` (1 at rest, tweened by the sequence), the same division `OrthographicCamera.updateProjectionMatrix` applies for `zoom` ([docs](https://threejs.org/docs/#api/en/cameras/OrthographicCamera)). `3d/clouds/index.js` gains `unmount` and the loop column.

### What keeps working

- `?level=` boots it; `?arrive=` feeds `arrivalCell` on boot and `swap` passes `arrive` per island; `?spawn=` wins on boot only. `reset=1` clears `isoworld:things:<name>` for the booted island only; `swap` drops it, as `defaultNavigate` deletes it from the URL today.
- URL contract: `history.pushState(null, "", "?level=next&from=this&arrive=entry")` at T, so `qa-things.mjs` line 214 keeps reading `level`, `from` and `arrive` from `page.url()` ([MDN pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)). A `popstate` listener swaps to the URL's island, replacing the full reload on Back and Forward. `pageshow` with `persisted` still calls `settle()` ([MDN pageshow](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event)); a page restored mid-sequence cancels it through the fail path, no toast.
- localStorage: one key per island, unchanged; the start page's continue and lit logic and its `3d/index.html?level=X&reset=1` links stay. `nav=0` ends the ride `returning` as today, which `walk.mjs --live`, `ride-clip.mjs` and `qa-visibility.mjs` depend on.
- `window.__done` stays the first-frame signal; `state.level.name` changes on swap and `window.__swapCount` increments.

### Tools

- `tools/qa-ride-keys.mjs` `ride()`: `waitForFunction(() => S.level.name === next && !S.actor.locked)`, 20 s timeout, instead of `waitForNavigation`; `backAndForth` keeps `goBack` and `goForward` on the same predicate. Per hop it adds: state reached `shaft`, hold ended on `ready`, `zoomScale` back within 0.05 of 1, `swapCount` +1, no `__swapError`, one key step after landing.
- `tools/qa-run.mjs` `ride()`: same predicate; `arrival()` and `stubCheck` unchanged.
- `tools/qa-things.mjs`: the ride block waits on the predicate and reads the pushed URL.
- `tools/qa-levels.mjs`: `page.goto` per island, unchanged, plus the shaft check from phase 1.
- `tools/perf.mjs`: `--query=seq=hold` freezes the sequence at the hold through `window.__sequence.freeze("hold")`, so the streak cost is measured against `none` on the same harness.

## 3. Phases

Ask the hero question (section 4) before phase 1, so phase 5 runs in parallel from phase 3 on.

### Phase 1: shafts off the top of the frame

Scope: `elevatorFrame` in `3d/things.js` extends both posts `SHAFT = 24` units above the deck (16 levels at tileH 1.5) with a rung every 1.5; cap and lamp stay at 2.6 as the cage. A rail clears the top of `levelScreenBounds` once it passes `(maxH + 2.5) * T + 0.5 * (x + z)`; 24 covers every entry and exit in `run.json`, the worst being eagle's entry at 14,7. The rails move from the baked decor Baker to a live `partMesh` with `frustumCulled = false`, since phase 4 scrolls the rungs.
Files: `3d/things.js`, `tools/qa-levels.mjs`. Depends on: nothing.
Risk: a front-row entry shaft crosses the island on screen; rails are 0.16 wide and the card shows it.
QA: `qa-levels.mjs` projects the shaft top with the live camera at 900x800, 400x800 and 1600x900 and asserts NDC y > 1 on all twelve; `qa-visibility.mjs all --json` tallies unchanged.
Card: twelve stills at 900x800 and two at 400x800, `out/pass7/shaft-<island>.png`, approve. Spend: 0.
Done: twelve islands pass the projection check and the ride tests still pass.

### Phase 2: in-page swap, no visuals

Scope: section 2 with an instant swap at `ride >= 1`: `core/run.js`, `createGame` and `load`, `create`, `mount` and `unmount`, cloud `unmount`, `pushState`, `popstate`, the fail path with `defaultNavigate` on the second press.
Files: `core/run.js` (new), `core/game.js`, `core/interact.js` (the `navigate` call site and `settle`), `3d/main.js`, `3d/renderer.js`, `3d/clouds/index.js`, the three ride tools. Depends on: nothing.
Risk: GPU memory leaking across twelve hops; builders registered for the wrong style.
QA: `qa-run.mjs` and `qa-ride-keys.mjs` on the new predicate; `qa-things.mjs wizard-medium`; new `tools/qa-swap.mjs` hops the run twice in one page, asserts `renderer.info.memory.geometries` and `textures` return to the first island's counts, logs bake milliseconds per island.
Card: none. Spend: 0. Done: 14 pass on `qa-run`, 13 on `qa-ride-keys`, memory flat over 24 hops.

### Phase 3: sequence controller, close-in, island drop

Scope: `core/sequence.js` with the timeline, `zoomScale`, unclamped camera, island drop and arrival slide, hold and fail paths, the reduced-motion path, `window.__sequence.freeze`. The next island bakes at the start of the hold, sliced over four frames (terrain, decor, things, clouds), so a 300 ms bake does not stall the streaks.
Files: `core/sequence.js` (new), `core/run.js`, `3d/renderer.js`, `core/interact.js` (states `rising`, `shaft`, `landing`). Depends on: phase 2.
Risk: the unclamped camera shows the void under the island before the drop; `DROP` must put the new island below a 1600x900 frame at `closeZoom`.
QA: `qa-ride-keys` asserts the state order per hop and `zoomScale` within 0.05 of 1; `ride-clip.mjs` drives `__sequence` with `advance`.
Card: a 30 s clip of three hops at 900x800 and one at 400x800. Spend: 0.
Done: the clip shows close-in, drop, hold and arrival on every hop and the tests pass.

### Phase 4: speed lines and the shaft scroll

Scope: two draw calls, no post pass. (a) A screen overlay: one transparent quad at the near plane, drawn last; the fragment shader takes polar coordinates from the hero's screen position, samples a small repeating noise texture along the angle, scrolls the radius with time, masks the centre clear, raises to a power and posterises to two levels. That is the shape of the CC0 Godot anime speed-line shader ([godotshaders.com](https://godotshaders.com/shader/anime-style-speedlines-w-or-w-o-distortion/)), one fetch per pixel. (b) 300 additive streak quads around the shaft in one `InstancedMesh`, positions fixed at build, stretched along y and wrapped with `mod` on a `uRide` uniform in the vertex shader: the starfield-warp pattern of a fixed pool allocated once and recycled by wrapping ([starfield warp](https://webdevpuneet.com/ui-snippets/three-starfield-warp/), [space warp](https://redstapler.co/space-warp-background-effect-three-js/)). The rungs scroll on the same uniform. Streak length plus the posterised overlay give the motion-blur read; no `AfterimagePass`.
Why no post pass: a radial blur renders the scene into a target and reads it 8 to 16 times per pixel in a full-screen pass, then an `OutputPass`; `EffectComposer` ping-pongs two targets ([three.js post-processing manual](https://threejs.org/manual/en/post-processing.html)). Pass 6 measured one fill-rate-bound draw call at 3.3x to 4.5x frame cost at 2x DPR (`docs/RUN.md` Clouds); Mugen87 calls post-processing "very expensive" and the first thing to switch off on phones ([discourse 1873](https://discourse.threejs.org/t/ambient-occlusion-shadows-on-the-ground/1873/2), [discourse 54444](https://discourse.threejs.org/t/threejs-is-dropping-frame-when-scrolling-on-mobile/54444/2)); pmndrs/postprocessing merges passes for the same reason ([github](https://github.com/pmndrs/postprocessing)). The overlay costs one full-screen fill at one fetch; the streaks cost 600 triangles.
Files: `3d/speedlines.js` (new), `3d/things.js` (rung attribute), `3d/clouds/billboards.js` (loop column), `tools/perf.mjs`. Depends on: phases 1 and 3.
Risk: the overlay on light islands (cat `#e8dfce`, wizard `#f4efe4`); line colour is `ink` mixed toward `bg`.
QA: `perf.mjs --query=seq=hold` on home and ember at 1x and 2x, target under 1.5x of `billboards` at the hold.
Card: stills at the hold on cat, wizard, chimera and ember at 900x800 and 400x800, the phase 3 clip re-cut, pick-one across two line densities. Spend: 0.
Done: perf under target and a density picked.

### Phase 5: hero v2 and the clip system

Scope: `3d/character.js` rebuilt from a figure spec with 16 to 20 parts (torso, hips, head, hair, upper and lower arms, hands, upper and lower legs, feet, eyes, mouth, brow), each part its own `Mesh` under a named `Group` pivot, tones from `kit()`, the spec run through `audit()` in `3d/prims.js` so the 12-part budget holds (parts under 0.15 tile are two-tone details and do not count). New `3d/clips.js`: clips as JSON keyframe tables, `{ name, duration, loop, tracks: { "<part>.quaternion": [[t, ex, ey, ez], ...], "<part>.position": [...] } }`, Euler keys converted to quaternions at load and played by `THREE.AnimationMixer` on the root. `PropertyBinding` resolves `partName.property` on any `Object3D` tree with no skeleton, as `misc_animation_keys` shows with `.position`, `.quaternion` and `.scale` tracks on a plain mesh ([example](https://threejs.org/examples/#misc_animation_keys), [PropertyBinding](https://threejs.org/docs/#api/en/animation/PropertyBinding)); blends use `crossFadeTo` ([AnimationAction](https://threejs.org/docs/#api/en/animation/AnimationAction)). Clips: `idle`, `walk` (the sine cycle as keys, so blends are uniform), `land`, `brace`, three dances (`wiggle`, `spin`, `pump`) at 2.0 to 2.3 s, 6 to 10 keys per track. Facing yaw stays procedural on the root.
Files: `3d/character.js`, `3d/clips.js`, `3d/clips/*.json`, `3d/palette.js` (hand and mouth tones), `tools/cohesion.mjs` (hero row). Depends on: the operator's answer only.
Risk: the hero is in every pass-6 render and the start-page thumbnails; `hero=0` shots are unaffected.
QA: new `tools/qa-hero.mjs` renders each clip at four phases at 6x, asserts the audit passes, no part leaves a 1.2 by 1.4 unit box, walk blends to idle under 0.3 s; `cohesion.mjs` on a hero close-up.
Card: a sheet of the hero at rest and mid-walk at 1x and 6x, a 12 s clip cycling the dances, pick-any on the dances. Spend: 0 by default (section 4).
Done: audit passes, clips play from JSON, the operator keeps at least two dances.

### Phase 6: wired end to end

Scope: the dance picker, `brace` and `land` in the timeline, the hero facing the camera, the label toast, touch (the use button rides as today), the extended ride tests on all twelve plus the back ride.
Files: `core/sequence.js`, `core/interact.js`, the three ride tools. Depends on: phases 3, 4 and 5.
Risk: a dance longer than the pre-hold beat; the picker clamps to clips at or under 2.3 s.
QA: `qa-ride-keys` 13 pass, `qa-run` 14 pass, `qa-things` on wizard and cat, `qa-swap` memory flat.
Card: the full 60 s ride, six hops at 900x800 and one at 400x800 with touch, approve. Spend: 0.
Done: ride tools green and the clip approved.

### Phase 7: polish and the device check

Scope: constants tuned from the cards, `?seq=0` to skip the sequence for reference shots, a `docs/RUN.md` section, and the phone check swiftshader cannot give: `perf.mjs` numbers plus a 30 s on-device recording over a LAN URL, logged in `docs/RUN.md`. Depends on: phase 6. Spend: 0.
Done: the operator's verdict on the final card and the RUN.md section.

## 4. One-way doors and limits

Hero model route. `docs/STYLE.md` locks flat-shaded prims, two- and three-tone ramps, face details in shared ink and white, a 12-part budget, no gradients. The GLB path in this engine bakes to static triangles (`extractTris` in `3d/bake.js`), so a skinned GLB hero needs a second render path (`SkinnedMesh`, a material without `applyXray`), a rig and clips from outside (Mixamo retargeting or paid animation), and it brings smooth shading and gradients the cohesion check rejects. Cost: 2 to 4 agent-days plus a model source, and the hero stops matching the twelve figures built through `figure()`. The prim route costs one agent-day for the figure and one for clips, gets the bible for free, and its JSON clip format is what later animation (watcher reactions, creature idles) builds on. Recommend prim. The one-way part is the part names and the clip schema: a later switch to a skinned hero re-authors every clip.

Other doors: none the size of the hero. `window.__game` turns from a page global into a run global that every tool reads; phase 2 keeps its shape. `pushState` replaces the bfcache behaviour pass 5 fixed; `popstate` plus `settle()` covers it and `qa-ride-keys` keeps the Back and Forward check.

Spend: `docs/SPEND.md` reads $34.570 against the $30.00 cap in `docs/BRIEF.md`. Every phase is zero spend. The one optional item is four Gemini reference-sheet images for the hero's face and hands, $0.18, only if the operator wants a design pass before phase 5; the default authors from `3d/palette.js` HERO and the existing proportions.

Time: phases 1 and 2 a few hours each; 3, 4 and 5 half a day each; 6 and 7 a few hours. Phase 7 needs the operator's phone on the LAN.

## 5. Open questions

- Bake cost per island on a phone: unmeasured. Default: slice the bake over four frames and log milliseconds in `qa-swap.mjs`.
- Where the hero looks during the dance. Default: at the camera; the iso yaw is fixed and a profile dance reads worse.
- Front-row entry shafts crossing the island. Default: build them and let the phase 1 card decide; the fallback is a cable-only entry shaft.
- Streak colour on light islands. Default: `ink` mixed 40% toward `bg`.
- Dance choice. Default: a session counter cycling the library; a seeded pick per hop is a one-line change.
- Going back. Default: the same sequence mirrored, no separate downward streak set.
- The 30 fps floor on a mid phone. Default: the pass-6 relative yardstick in `perf.mjs` plus the phase 7 device recording.
