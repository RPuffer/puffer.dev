import * as THREE from "three";
import { motion } from "./motion.js";

const BIT = { S: 0x80, V: 0x40, F: 0x20, O: 0x10 };
const ORDER = { V: 30, S: 31, F: 32, I: 33, O: 34 };
const SLACK = { V: 0.05, O: 0.3 };

const shared = { uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uTime: motion.uTime };
const size = new THREE.Vector2();
const sync = (gl) => {
  gl.getDrawingBufferSize(size);
  shared.uRes.value.copy(size);
  shared.uDpr.value = gl.getPixelRatio();
};

export const FILL_FX = {
  tint: "return vec4(color, alpha);",
  scan: "float s = step(0.5, fract((p.y + t * 18.0) / 5.0)); return vec4(color, alpha * mix(0.25, 1.0, s));",
  hatch: "float s = step(0.55, fract((p.x + p.y - t * 14.0) / 7.0)); return vec4(color, alpha * s);",
  flash: "float s = pow(0.5 + 0.5 * sin(t * 6.2831853 * 1.5), 2.0); return vec4(mix(color, vec3(1.0), 0.35 * s), alpha * mix(0.2, 1.0, s));",
  dither: "return vec4(color, hlBayer(p) < alpha ? 1.0 : 0.0);",
  holo: "float band = 0.5 + 0.5 * sin(p.y * 0.9 - t * 9.0); float sweep = smoothstep(0.92, 1.0, fract(p.y / 90.0 - t * 0.6)); float flick = 0.85 + 0.15 * sin(t * 47.0); vec3 c = mix(color, vec3(1.0), 0.25 * band + 0.6 * sweep); return vec4(c, alpha * flick * mix(0.45, 1.0, band) + sweep * 0.5);",
};

export function addFillEffect(name, glsl) {
  FILL_FX[name] = glsl;
}

const VERT = `attribute vec3 hlNormal;
uniform float uWidth;
uniform float uSlack;
uniform vec2 uRes;
uniform float uDpr;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  if (uWidth > 0.0) {
    vec3 n = normalize(normalMatrix * hlNormal);
    vec2 d = (projectionMatrix * vec4(n, 0.0)).xy * uRes;
    float l = length(d);
    if (l > 1e-6) c.xy += d / l * uWidth * uDpr * 2.0 / uRes * c.w * smoothstep(0.05, 0.4, length(n.xy));
  }
  c.z += projectionMatrix[2][2] * uSlack * c.w;
  gl_Position = c;
}`;

const frag = (fx) => `uniform vec3 uColor;
uniform float uAlpha;
uniform float uPulse;
uniform float uTime;
uniform float uDpr;
float hlBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float a = mod(q.x, 2.0), b = mod(q.y, 2.0), c = floor(q.x * 0.5), d = floor(q.y * 0.5);
  return (8.0 * mod(a + b, 2.0) + 4.0 * b + 2.0 * mod(c + d, 2.0) + d + 0.5) / 16.0;
}
vec4 hlFx(vec2 p, float t, vec3 color, float alpha) {
  ${fx}
}
void main() {
  float a = uAlpha;
  if (uPulse > 0.0) a *= 0.55 + 0.45 * sin(uTime * 6.2831853 * uPulse);
  vec4 o = hlFx(gl_FragCoord.xy / uDpr, uTime, uColor, a);
  if (o.a <= 0.002) discard;
  gl_FragColor = vec4(o.rgb, min(o.a, 1.0));
  #include <colorspace_fragment>
}`;

function material({ color = "#ffffff", opacity = 1, pulse = 0, width = 0, slack = 0, fx = FILL_FX.tint, colorWrite = true, depth = null, ref = 0, mask = 0, write = 0, op = THREE.InvertStencilOp }) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uAlpha: { value: opacity },
      uPulse: { value: pulse === true ? 1.2 : +pulse || 0 },
      uWidth: { value: width },
      uSlack: { value: slack },
      uRes: shared.uRes,
      uDpr: shared.uDpr,
      uTime: shared.uTime,
    },
    vertexShader: VERT,
    fragmentShader: frag(fx),
    transparent: true,
    depthWrite: false,
    depthTest: depth !== null,
    depthFunc: depth ?? THREE.LessEqualDepth,
    colorWrite,
    side: THREE.DoubleSide,
    stencilWrite: true,
    stencilRef: ref,
    stencilFuncMask: mask,
    stencilWriteMask: write,
    stencilFunc: mask ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: op,
  });
  m.userData.highlight = true;
  return m;
}

function hullNormals(geo) {
  if (geo.getAttribute("hlNormal")) return;
  const pos = geo.getAttribute("position"), idx = geo.index, n = pos.count;
  const key = new Array(n), acc = new Map();
  for (let i = 0; i < n; i++) key[i] = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3(), e = new THREE.Vector3();
  const tris = idx ? idx.count : n;
  for (let t = 0; t < tris; t += 3) {
    const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    f.subVectors(b, a).cross(e.subVectors(c, a));
    for (const i of [i0, i1, i2]) {
      const v = acc.get(key[i]) || acc.set(key[i], new THREE.Vector3()).get(key[i]);
      v.add(f);
    }
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = acc.get(key[i]).normalize();
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  geo.setAttribute("hlNormal", new THREE.BufferAttribute(out, 3));
}

const DEPTH = { true: null, hidden: THREE.GreaterDepth, false: THREE.LessEqualDepth };
const mode = (v) => (v === "hidden" ? "hidden" : v === false ? "false" : "true");

const norm = (o, base) => (o === false || o == null ? null : { ...base, ...(o === true ? {} : o) });
const OUTLINE = { color: "#12c4f0", width: 2, through: true, pulse: 0, opacity: 1, inner: null };
const FILL = { effect: "tint", color: "#12c4f0", opacity: 0.35, through: true, pulse: 0 };

function passes(opts) {
  const top = opts.outline === undefined && opts.fill === undefined ? { color: opts.color, width: opts.width, through: opts.through, pulse: opts.pulse } : null;
  const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined));
  const outline = norm(top ? clean(top) : opts.outline, OUTLINE);
  const fill = norm(opts.fill, FILL);
  const list = [];
  if (fill && mode(fill.through) !== "true") list.push(["V", material({ colorWrite: false, slack: SLACK.V, depth: THREE.LessEqualDepth, write: BIT.V, op: THREE.ReplaceStencilOp, ref: BIT.V })]);
  if (outline) list.push(["S", material({ colorWrite: false, write: BIT.S, op: THREE.ReplaceStencilOp, ref: BIT.S })]);
  if (fill) {
    const m = mode(fill.through);
    const fx = FILL_FX[fill.effect] || fill.effect;
    list.push(["F", material({ ...fill, fx, ref: m === "false" ? BIT.V : 0, mask: m === "true" ? BIT.F : BIT.F | BIT.V, write: BIT.F })]);
  }
  if (outline) {
    const d = DEPTH[mode(outline.through)];
    const ring = (o) => material({ ...o, slack: SLACK.O, depth: d, ref: 0, mask: BIT.S | BIT.O, write: BIT.O, pulse: outline.pulse });
    if (outline.inner) list.push(["I", ring({ opacity: outline.opacity, ...outline.inner })]);
    list.push(["O", ring(outline)]);
  }
  return list;
}

const live = new WeakMap();
const noRay = () => {};

export function highlight(object3d, opts = {}) {
  unhighlight(object3d);
  const meshes = [];
  object3d.traverse((o) => { if (o.isMesh && !o.userData.highlightPass) meshes.push(o); });
  const mats = passes(opts), added = [];
  for (const mesh of meshes) {
    hullNormals(mesh.geometry);
    for (const [k, mat] of mats) {
      const p = new THREE.Mesh(mesh.geometry, mat);
      p.userData.highlightPass = k;
      p.renderOrder = ORDER[k];
      p.raycast = noRay;
      p.onBeforeRender = sync;
      mesh.add(p);
      added.push(p);
    }
  }
  const handle = {
    object: object3d,
    passes: added,
    materials: mats.map(([, m]) => m),
    set visible(v) { for (const p of added) p.visible = v; },
    update(next) { return highlight(object3d, { ...opts, ...next }); },
    remove() { unhighlight(object3d); },
  };
  live.set(object3d, handle);
  return handle;
}

export function unhighlight(object3d) {
  const h = live.get(object3d);
  if (!h) return;
  for (const p of h.passes) p.parent?.remove(p);
  for (const m of h.materials) m.dispose();
  live.delete(object3d);
}

export const highlighted = (object3d) => live.get(object3d) || null;
