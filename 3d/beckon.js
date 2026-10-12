import * as THREE from "three";
import { motion } from "./motion.js";
import { surfaceY, liftLevel } from "./terrain.js";
import { beckons, beckonReach, NEAR } from "../core/beckon.js";
import { gatePlace, ladderPlace } from "./things.js";
import { DIRS } from "../core/level.js";

export const BECKON = {
  near: NEAR,
  fadeIn: 7,
  fadeOut: 4,
  focusIn: 10,
  focusOut: 6,
  ring: "#ffe7a3",
  edge: "#c8611c",
  hot: "#ffc93c",
  glyph: ["#ffe58a", "#f5c243", "#c98a1c"],
  ink: "#2a1f33",
  lift: 0.035,
  rise: { bonfire: 1.6, chest: 1.15, lever: 1.35, door: 2.3, gate: 2.55, ladder: 1.5, elevator: 1.25, watcher: 2 },
  size: { gate: 0.6, door: 0.6, elevator: 0.6, watcher: 0.75 },
};

const RING_VERT = `attribute vec2 aK;
varying vec2 vUv;
varying vec2 vK;
void main() {
  vUv = uv * 2.0 - 1.0;
  vK = aK;
  vec4 w = instanceMatrix * vec4(position, 1.0);
  gl_Position = aK.x < 0.002 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * modelMatrix * w;
}`;

const RING_FRAG = `uniform float uTime;
uniform vec3 uCol, uHot, uEdge;
varying vec2 vUv;
varying vec2 vK;
void main() {
  float r = length(vUv), k = vK.x, f = vK.y;
  float beat = 0.5 + 0.5 * sin(uTime * mix(2.6, 4.2, f));
  float R = mix(0.62, 0.7, beat * (0.4 + 0.6 * f)) * mix(0.8, 1.0, k);
  float w = mix(0.07, 0.12, f);
  float d = r - R;
  float band = 1.0 - smoothstep(w, w + 0.03, abs(d));
  float rim = smoothstep(w * 0.15, w * 0.45, d);
  float ang = atan(vUv.y, vUv.x) / 6.2831853 + 0.5;
  float dash = step(0.5, fract(ang * 8.0 - uTime * 0.35)) * f;
  float outer = (1.0 - smoothstep(0.035, 0.065, abs(d - w - 0.14))) * dash;
  float fill = (1.0 - smoothstep(R - 0.3, R - w, r)) * mix(0.1, 0.3, f) * (0.7 + 0.3 * beat);
  vec3 face = mix(uCol, uHot, f);
  vec3 c = mix(face, uEdge, max(rim * band, outer));
  float a = (band * mix(0.8, 1.0, f) + outer + fill * (1.0 - band)) * k;
  if (a < 0.01 || r > 1.0) discard;
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
}`;

const GLYPH_VERT = `attribute vec2 aK;
attribute vec3 color;
uniform float uTime, uGrow;
uniform vec3 uInk;
varying vec3 vCol;
varying float vF;
void main() {
  float f = aK.y;
  vCol = uGrow > 0.0 ? uInk : color;
  vF = f;
  float s = f * (1.0 + 0.35 * sin(3.14159 * f));
  float a = uTime * 2.2;
  vec3 p = position * s * (1.0 + uGrow);
  p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
  p.y += 0.08 * sin(uTime * 3.4) + 0.25 * (1.0 - f);
  vec4 w = instanceMatrix * vec4(p, 1.0);
  gl_Position = f < 0.002 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * modelMatrix * w;
}`;

const GLYPH_FRAG = `varying vec3 vCol;
varying float vF;
void main() {
  gl_FragColor = vec4(vCol, clamp(vF * 1.4, 0.0, 1.0));
}`;

function glyphGeometry() {
  const top = [0, 0.42, 0], bot = [0, -0.5, 0], r = 0.26;
  const rim = [0, 1, 2, 3].map((i) => [Math.cos(i * Math.PI / 2) * r, 0, Math.sin(i * Math.PI / 2) * r]);
  const tones = BECKON.glyph.map((c) => new THREE.Color(c));
  const pos = [], col = [];
  for (let i = 0; i < 4; i++) {
    const a = rim[i], b = rim[(i + 1) % 4];
    const lit = i % 2 ? 0 : 1;
    for (const [tri, tone] of [[[top, b, a], tones[lit ? 0 : 1]], [[bot, a, b], tones[lit ? 1 : 2]]]) {
      for (const v of tri) { pos.push(...v); col.push(tone.r, tone.g, tone.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function anchorsOf(LL, view, t) {
  if (t.kind === "gate" || t.kind === "door") {
    if (t.kind === "door" && !t.edge) return [];
    const g = gatePlace(LL, view, t);
    return [[g.x, g.y, g.z]];
  }
  if (t.kind === "ladder") {
    const d = DIRS[t.d] || [0, 1], g = ladderPlace(LL, view, t);
    const top = [t.x + 0.5, g.yTop, t.z + 0.5];
    if (t.mode === "drop") return [top];
    return [top, [t.x + d[0] + 0.5, g.yBot, t.z + d[1] + 0.5]];
  }
  if (t.kind === "watcher") {
    const s = t.size || [1, 1], x = t.x + s[0] / 2, z = t.z + s[1] / 2;
    return [[x, surfaceY(LL, view, Math.floor(x), Math.floor(z)), z]];
  }
  return [[t.x + 0.5, surfaceY(LL, view, t.x, t.z), t.z + 0.5]];
}

export function buildBeckon(L, view, parts = {}) {
  const LL = liftLevel(L);
  const items = [];
  for (const t of L.things || []) {
    if (t.trap && !t.decoy) continue;
    const at = anchorsOf(LL, view, t);
    if (!at.length) continue;
    const s = t.kind === "watcher" ? Math.max(...(t.size || [1, 1])) * 0.55 : BECKON.size[t.kind] || 0.5;
    items.push({ id: t.id, kind: t.kind, at, size: t.beckonSize || s, rise: t.beckonRise || BECKON.rise[t.kind] || 1.1, k: 0, f: 0, end: 0 });
  }
  const group = new THREE.Group();
  group.name = "beckon";
  const n = Math.max(1, items.length);
  const ringK = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const glyphK = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const plane = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  plane.setAttribute("aK", ringK);
  const ring = new THREE.InstancedMesh(plane, new THREE.ShaderMaterial({
    uniforms: { uTime: motion.uTime, uCol: { value: new THREE.Color(BECKON.ring) }, uHot: { value: new THREE.Color(BECKON.hot) }, uEdge: { value: new THREE.Color(BECKON.edge) } },
    vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }), n);
  ring.renderOrder = 2;
  const gg = glyphGeometry();
  gg.setAttribute("aK", glyphK);
  const glyphMat = (grow) => new THREE.ShaderMaterial({
    uniforms: { uTime: motion.uTime, uGrow: { value: grow }, uInk: { value: new THREE.Color(BECKON.ink) } },
    vertexShader: GLYPH_VERT, fragmentShader: GLYPH_FRAG, transparent: true, depthTest: false, depthWrite: false, side: grow > 0 ? THREE.BackSide : THREE.FrontSide,
  });
  const glyph = new THREE.InstancedMesh(gg, glyphMat(0), n);
  const ink = new THREE.InstancedMesh(gg, glyphMat(0.22), n);
  ink.instanceMatrix = glyph.instanceMatrix;
  ink.renderOrder = 40;
  glyph.renderOrder = 41;
  for (const m of [ring, ink, glyph]) { m.frustumCulled = false; m.userData.noMerge = true; m.visible = false; m.count = items.length; group.add(m); }
  const mtx = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const approach = (v, to, up, down, dt) => {
    const r = to > v ? up : down;
    const out = v + (to - v) * (dt > 0 ? 1 - Math.exp(-dt * r) : 1);
    return Math.abs(out - to) < 2e-3 ? to : out;
  };

  return {
    group,
    items,
    state() { return Object.fromEntries(items.map((i) => [i.id, { near: +i.k.toFixed(3), reach: +i.f.toFixed(3) }])); },
    update(state, dt) {
      const live = state.things, a = state.actor;
      const off = !a || a.locked || state.params?.hero === "0";
      const focus = live?.focus?.id;
      let any = false;
      items.forEach((it, i) => {
        const t = live?.byId?.[it.id];
        const on = !off && !!t && beckons(t);
        let best = Infinity;
        it.at.forEach((c, j) => { const d = Math.hypot(a.pos.x - c[0], a.pos.z - c[2]); if (d < best) { best = d; it.end = j; } });
        it.k = approach(it.k, on ? beckonReach(best, BECKON.near) : 0, BECKON.fadeIn, BECKON.fadeOut, dt);
        it.f = approach(it.f, on && focus === it.id ? 1 : 0, BECKON.focusIn, BECKON.focusOut, dt);
        if (it.f > it.k) it.k = it.f;
        const c = it.at[it.end];
        let y = c[1];
        if (it.kind === "elevator" && parts[it.id]) y = parts[it.id].position.y;
        p.set(c[0], y + BECKON.lift, c[2]);
        sc.setScalar(it.size);
        ring.setMatrixAt(i, mtx.compose(p, q, sc));
        p.y = y + it.rise;
        glyph.setMatrixAt(i, mtx.compose(p, q, one));
        ringK.setXY(i, it.k, it.f);
        glyphK.setXY(i, it.k, it.f);
        if (it.k > 0) any = true;
      });
      ring.visible = any;
      glyph.visible = ink.visible = items.some((it) => it.f > 0);
      if (any) { ring.instanceMatrix.needsUpdate = glyph.instanceMatrix.needsUpdate = true; ringK.needsUpdate = glyphK.needsUpdate = true; }
    },
  };
}
