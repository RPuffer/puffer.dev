# Motion and life

Only the hero (`3d/character.js`), pickup spinners and camera move today. Decor bakes into one vertex-coloured `MeshBasicMaterial` mesh carrying the x-ray cutout through `onBeforeCompile` (`3d/xray.js`): home is 5 draw calls plus 6 for the hero, plus one per spinner. Figures such as `3d/pieces/cat.js` merge into that static mesh, so they cannot move.

## Catalogue

| Idea | Effect | Mechanism |
| --- | --- | --- |
| **Idle** | | |
| Canopy and flower sway | Crowns lean a few px, out of phase | Bend by height above a baked root |
| Flame flicker | Tongues stretch and twist | Same bend, fast, tip-weighted |
| Water shimmer | Bubbles drift on the pool | Phase on bubble discs in the water mesh |
| Waterfall flow | Bands slide down | Fragment picks `fall[0]` or `fall[1]` from `mod(worldY + t)` |
| Mist drift | Low bands cross chasms | Dithered with `xrayBayer`, stays opaque and merged |
| Lantern pulse | Glass steps between two swatches | Glow flag; fragment picks swatch on a slow square wave |
| Pickup bob and spin | Coins rise and turn | Pivot attribute, shader rotation; folds spinner calls into one |
| Birds and butterflies | Flocks orbit a tree | InstancedMesh anchored to a prop, as in Townscaper |
| Figure breath | Chest rises 2 to 3 px every 4 s | Torso-weighted scale about a pivot |
| Blink | Eyes shut two frames, irregularly | Eye verts collapse when `fract(t * rate + phase)` crosses a threshold |
| Tail, ear, crest | Tips trail the body | Bend by distance from the root |
| **Interactive** | | |
| Rustle | Flowers and bushes lean from the hero | Hero-position uniform, inverse-distance bend |
| Doors and gates | Swing open on approach | `noMerge` hinge part, tweened |
| Chest open | Lid snaps back, coin pops | Back-out tween, pooled pickup |
| Pickup collect | Jumps, swells, gone | Instance scale tween to zero |
| Watching creature | Head tracks the hero in a radius | `noMerge` head, damped yaw like the hero's turn |
| Threshold reaction | Figure bows or rears at a marked cell | One-shot tween; GLB clip for bosses |
| Footstep dust | Cubes puff per step | Pooled InstancedMesh on `walkPhase` crossings |
| Splash | Foam shards at water edges | Same pool, `water.foam` |
| Camera and light | Push-in at thresholds and the elevator; colour ramp lerps | Focus offset; ramp uniform |

## Three approaches

**A. Baked vertex motion.** `Baker.tri()` writes an optional `aSway` attribute (amplitude, phase, root height), zero when untagged. One chunk chains onto the x-ray `onBeforeCompile` before `project_vertex`, so the cutout follows moved vertices.

- Performance: zero draw calls, one uniform.
- Authoring: builders set `B.motion` around moving parts.
- Flat look: per-face colours stay baked, so a leaning crown keeps its three tones.
- Limit: no state. A door that stays open needs B.

```js
const prev = material.onBeforeCompile;
material.onBeforeCompile = (shader, r) => {
  prev(shader, r);
  shader.uniforms.uTime = motion.uTime;
  shader.vertexShader = shader.vertexShader
    .replace("void main() {", "uniform float uTime;\nattribute vec3 aSway;\nvoid main() {")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed.xz += aSway.x * max(0.0, transformed.y - aSway.z) * vec2(sin(uTime * 1.6 + aSway.y), 0.6 * cos(uTime * 1.3 + aSway.y));");
};
material.customProgramCacheKey = () => "xray2-motion1";
```

**B. Live parts plus tweens.** Builders flag moving parts `userData.noMerge` with `userData.anim` (hinge, head, lid); `extractTris` already routes them to extras with an x-ray copy. Pickups, dust and birds become one `InstancedMesh` per type with per-instance phase.

- Cost: one call per part or type; budget eight per level. Builders split out a lid or head. Parts bake the same way, so the look holds.
- Catch: extras use `o.clone(false)`, which drops children, so each part is one mesh.

**C. Blender GLB clips.** `AnimationMixer` on skinned figures, crossfading idle and reaction clips, morph targets for faces.

- Cost: a call per skinned mesh plus bones, and a rig per creature; fine for two bosses, wrong for decor. CONCEPTS keeps Blender off the core path.
- Flat look: smooth curves read as another game. `loadGlbs` bakes to static tris and `mergeable` rejects skinned meshes, so C needs its own loader branch.

## Staged plan

1. **Wind.** Add `aSway`, chain the chunk onto decor and land materials, tag crowns, flowers, bushes, flames and waterfall bands in `3d/pieces.js`. Freeze `uTime` at `hero=0` for `compare.mjs`. Home sways and flickers at 5 draw calls.
2. **Figures wake.** Tag breath, blink and tails on the cat and wizard; split each head into a `noMerge` part that watches the hero. `cat-medium` breathes, blinks and follows you.
3. **Touch.** A small tween module, the rustle uniform, chest and gate hinges, instanced pickups with a collect pop, dust and splash pools. On home the chest opens, the coin pops, dust puffs.

Each step ends in a before-and-after clip on a fortress `approve` card.

## What a motion critic checks

- **Jitter.** Sub-2 px amplitude shimmers on thin trunks under the ortho camera: use 0 or 2 px and up. Wrap `uTime` for float precision; clamp `dt` when the tab returns.
- **Popping.** Tweens start from the current value; phase survives reloads and region swaps; pickups scale out, never vanish in one frame.
- **Off-pack smoothness.** Pulses step between swatches with no blended mid-tones. Triggers snap with back-out easing; idle stays slow sine, out of phase between neighbours.
- **Distraction.** Peripheral motion stays below the hero's in amplitude and contrast, one fast mover per screen region. Honour `prefers-reduced-motion`.

## Sources

- GPU Gems 3 ch. 16, Crysis vegetation: bending with phase and stiffness in vertex colours. https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis
- three.js docs: https://threejs.org/docs/pages/Material.html, https://threejs.org/docs/pages/AnimationMixer.html; examples `webgl_animation_skinning_morph`, `webgl_instancing_morph`.
- T. Thompson, "How Townscaper Works" (birds anchor to nearby objects). https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making
- E. Wohllaib, "Procedural Grass in Ghost of Tsushima", GDC 2021. https://gdcvault.com/play/1027033/
- J. Smyth, stylised WebGL grass (vertex-colour bend weight, position phase). https://smythdesign.com/blog/stylized-grass-webgl/
- Jonasson and Purho, "Juice it or lose it". https://www.youtube.com/watch?v=Fy0aCDmgnxg

WebSearch returned 502s and the fallback engines returned captchas; Bad North, Dorfromantik and Animal Well lack a primary source here.
