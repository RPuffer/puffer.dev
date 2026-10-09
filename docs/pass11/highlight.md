# Highlight and outline system (pass 11)

`3d/highlight.js` draws a silhouette outline and a silhouette fill around any mesh or group. The hero uses it for `?occlude=outline`; later uses (pickups, targets, a selected tile prop, a trap warning) call the same two functions.

Try it: `http://localhost:8765/3d/index.html?level=ember-subject&spawn=2,7&occlude=outline,fill` and walk behind the tree. Sheet: `out/pass11/outline-sheet.jpg`.

## API

```js
import { highlight, unhighlight, addFillEffect, FILL_FX } from "./highlight.js";

const h = highlight(object3d, {
  outline: { color: "#12c4f0", width: 2, through: true, pulse: 0, opacity: 1, inner: { color: "#1b1f27", width: 1.5 } },
  fill: { effect: "hatch", color: "#12c4f0", opacity: 0.35, through: true, pulse: 0 },
});
h.update({ fill: false });
h.visible = false;
unhighlight(object3d);
```

- `outline` and `fill` are independent layers. Pass `false` or leave one out to skip it; pass `true` for the defaults. Shorthand `highlight(obj, { color, width, through, pulse })` means outline only.
- `width` is in CSS pixels at every zoom and DPR. `inner` adds a second ring inside the first; the visible outer band is `width - inner.width`.
- `through` on either layer: `true` draws over everything, `"hidden"` draws only where something covers the object, `false` draws only where the object is visible.
- `pulse` is a frequency in Hz (`true` = 1.2). It scales alpha between 0.1 and 1.
- `highlight` on an object that already has one replaces it. It collects meshes at call time; call it again after adding parts.

## Fill effects

Built in: `tint`, `scan` (scrolling scanlines), `hatch` (scrolling diagonal hatch), `flash`, `dither` (Bayer 4x4 cutout at `alpha`), `holo` (bands, a bright sweep, flicker).

A new effect is one GLSL snippet: the body of `vec4 hlFx(vec2 p, float t, vec3 color, float alpha)`. `p` is the fragment in CSS pixels, `t` is `motion.uTime` seconds (frozen under `?t=`, so stills stay deterministic), `color` and `alpha` come from the options after pulse. `hlBayer(p)` is in scope. Return straight (not premultiplied) RGBA; alpha at or below 0.002 discards.

```js
addFillEffect("grid", "vec2 g = step(0.85, fract(p / 8.0)); return vec4(color, alpha * max(g.x, g.y));");
highlight(chest, { fill: { effect: "grid" } });
```

`fill.effect` also accepts a raw snippet string.

## How it draws

Each mesh in the object gets up to five child meshes that share its geometry, one per pass, all transparent with depth writes off, sorted by `renderOrder` 30 to 34 so every highlighted object's masks land before any colour:

| order | pass | stencil bit | when |
|---|---|---|---|
| 30 | V: mark visible pixels (depth LessEqual, 0.05 slack) | 0x40 | fill with `through` `"hidden"` or `false` |
| 31 | S: mark the full silhouette (no depth test) | 0x80 | outline |
| 32 | F: fill, once per pixel | 0x20 | fill |
| 33 | I: inner ring | 0x10 | `outline.inner` |
| 34 | O: outer ring, outside S and outside I | 0x10 | outline |

Rings are an inverted hull: the vertex shader pushes each vertex along a smoothed normal (`hlNormal`, built once per geometry from welded positions) by `width` pixels in screen space, and the stencil keeps only the band outside the silhouette. Ring depth uses 0.3 world units of slack toward the camera, so ground just in front of the feet does not count as an occluder. Each pass writes its stencil bit, so overlapping parts and back faces blend once. The stencil buffer clears each frame; `createRenderer` now asks for `stencil: true`. Bits 0x01 to 0x08 stay free for other stencil users.

Cost: one draw per pass per mesh. The hero has 19 part meshes: `outline` (S, I, O) adds 57 draws, `fill` (V, F) adds 38, `outline,fill` adds 95. No full-screen pass, no render target, no per-frame allocation; `onBeforeRender` copies the drawing-buffer size into a shared uniform.

Limits: passes follow the mesh transform only, so vertex-shader sway from `applyMotion` does not reach the highlight. Multiple highlighted objects share the bits, so two overlapping objects outline as one union shape. The hidden test is per pixel against the depth buffer, so a highlighted object inside a discarded x-ray window counts as visible.

## Hero modes

`?occlude=` takes a comma or plus list: `circle` (default, today's x-ray window), `outline`, `fill`, `both` (circle and outline), `none`. `?fillfx=` picks the hero fill effect (default `hatch`). `outline` and `fill` without `circle` turn the x-ray window off; `xray=0` still turns it off in any mode, and `hero=0` hides the hero and its highlight.

Hero outline (`HERO_OUTLINE` in `3d/renderer.js`): through `"hidden"`, a 1.5 px ink ring (`#1b1f27`, the lift trim colour) inside a 4 px ring in beam cyan (`#12c4f0`, `BEAM.color`). The cyan reads on the dark islands (wizard navy, ember browns) and matches the path line and lift beam, so it reads as the game's "you" colour. The ink ring carries the shape on the cream and white islands, where cyan alone loses contrast. The hero's own palette fails one side either way: the red shirt vanishes on ember, the brown hair on dark rock. Hero fill (`HERO_FILL`): beam cyan at 0.45 alpha, through `"hidden"`.

Sheet rows (`out/pass11/outline-sheet.jpg`): wizard-medium at cell 5,7 behind the dome, ember-subject at 2,7 behind the tree and ledge, each in circle, outline, fill, outline+fill, both; then ember with outline+fill across `tint`, `scan`, `dither`, `holo`, `flash`. Stills come from `tools/hl-shots.mjs` (`node tools/hl-shots.mjs <level> <yaw> <x,z> <dir> tag:query ...`); `tools/hl-find-hidden.mjs <level> <yaw>` ranks cells by how much of the hero a camera ray finds covered.

## QA

Counts on port 8765, profile `.pp-profile-hl`, default `occlude=circle`: qa.mjs 226/226 run alone (a run in parallel with three other suites dropped five 3d@1200 key and tap checks to swiftshader timing). qa-hero 29/29. qa-visibility all yaws exits 0: default yaw 248/250, 249/250 with rotation, 0 fail. qa-ride-keys 12/13: swallow-medium to forest-volute finds no path from 7,13 to gate g1 at 11,11, which tracks the other agent's uncommitted `levels/swallow-medium.json` edit; path search reads level data only.
