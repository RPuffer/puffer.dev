import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "./baker.js";
import { CROWN } from "./pieces.js";
import { stamp } from "../core/catalog.js";

export const ARCH = { post: 2.3, over: 1.6 };
export const CANOPY = { height: 3.3, over: 1.9 };
export const SPAN_MAX = 3, RUN_MAX = 4;

const t3 = (c) => (Array.isArray(c) ? tone(c[0], c[1] ?? c[0], c[2] ?? c[1] ?? c[0]) : tone(c, c, c));
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

export function stampLook(palette = {}, over = {}) {
  const P = palette;
  const wood = P.wood || {};
  return {
    base: P.rock?.slice?.(1, 4) || ["#d4d4d4", "#ababab", "#8f8f8f"],
    post: [P.wellStone || ["#dbc9a2", "#c7b693", "#b1a483"], P.rock?.slice?.(0, 3) || ["#e3e3e3", "#d4d4d4", "#ababab"]],
    lintel: [wood.light || "#ff831d", wood.mid || "#dc7016", wood.dark || "#bd4c0b"],
    trim: [wood.end || "#f6d881", wood.light || "#ff831d", wood.mid || "#dc7016"],
    rail: [wood.mid || "#dc7016", wood.dark || "#bd4c0b", wood.shadow || "#a04b14"],
    cobble: [P.stone?.pebble || "#fff0c3", P.stone?.pebbleShade || "#e8dab1", P.stone?.rim || "#dbc9a2"],
    kerb: [P.stone?.rim || "#dbc9a2", P.wellStone?.[1] || "#c7b693", P.wellStone?.[2] || "#b1a483"],
    trunk: P.trunk ? [P.trunk[0], P.trunk[1], P.trunk[1]] : ["#b06a57", "#9f5950", "#9f5950"],
    crown: P.treeLime || ["#c4ef86", "#8ce263", "#73aa4f"],
    crest: null,
    ...over,
  };
}

function arch(B, L) {
  const H = ARCH.post, top = ARCH.over;
  for (const sx of [-1, 1]) {
    B.rbox(0.62, 0.22, 0.62, 0.06, t3(L.base), sx, 0, 0);
    B.rbox(0.44, top * 0.55, 0.44, 0.05, t3(L.post[0]), sx, 0.22, 0);
    B.rbox(0.4, top * 0.45 - 0.22, 0.4, 0.05, t3(L.post[1]), sx + 0.01, 0.22 + top * 0.55, -0.01);
  }
  B.rbox(2.56, 0.24, 0.5, 0.06, t3(L.lintel), 0, top, 0);
  B.box(2.3, 0.08, 0.54, t3(L.trim), 0, top + 0.24, 0);
  B.rbox(2.86, 0.2, 0.42, 0.06, t3(L.lintel), 0, top + 0.32, 0);
  for (const sx of [-1, 1]) B.box(0.36, H - top - 0.52, 0.36, t3(L.post[0]), sx, top + 0.52, 0);
  if (L.crest) for (const sx of [-1, 1]) L.crest(B, sx, H, 0, sx);
  else for (const sx of [-1, 1]) B.cone(0.22, 0, 0.3, t3(L.trim), sx, H, 0, 4);
}

function span(B, L, n) {
  const z0 = -n / 2, z1 = n / 2;
  for (const sx of [-1, 1]) {
    const x = sx * 0.44;
    B.box(0.08, 0.1, n + 0.1, t3(L.rail), x, 0.5, 0);
    B.box(0.06, 0.06, n + 0.1, t3(L.rail), x, 0.24, 0);
    for (let i = 0; i <= n; i++) {
      const z = z0 + i, end = i === 0 || i === n;
      B.rbox(end ? 0.18 : 0.12, end ? 0.74 : 0.6, end ? 0.18 : 0.12, 0.03, t3(end ? L.post[0] : L.rail), x, -0.12, Math.max(z0 + 0.06, Math.min(z1 - 0.06, z)));
      if (end) B.box(0.22, 0.06, 0.22, t3(L.trim), x, 0.62, Math.max(z0 + 0.06, Math.min(z1 - 0.06, z)));
    }
  }
  for (let i = 0; i < n; i++) B.box(0.96, 0.14, 0.12, t3(L.rail), 0, -0.3, z0 + i + 0.5);
}

function canopy(B, L, v) {
  const H = CANOPY.height, k = CANOPY.over;
  B.at(-0.5, 0, -0.5, 0, () => {
    B.rbox(0.5, 0.16, 0.5, 0.06, t3(L.base), 0, 0, 0);
    B.box(0.3, k + 0.3, 0.3, t3(L.trunk), 0, 0.12, 0);
    B.at(0, k * 0.55, 0, 0, () => { B.rot([0, 0, 1], -0.7, 0, 0, 0); B.box(0.14, 0.7, 0.14, t3(L.trunk), 0, 0, 0); B.pop(); });
    B.at(0, k * 0.7, 0, 0, () => { B.rot([1, 0, 0], 0.75, 0, 0, 0); B.box(0.14, 0.7, 0.14, t3(L.trunk), 0, 0, 0); B.pop(); });
  });
  const cubes = [[0.86, -0.425, -0.425, k + 0.1, 1], [0.86, 0.525, -0.425, k + 0.22, 0], [0.86, -0.425, 0.525, k + 0.16, 2], [0.86, 0.525, 0.525, k + 0.28, 1], [0.82, 0.05, 0.05, k + 1.01, 0]];
  cubes.forEach(([a, x, z, y, c], i) => B.sway("crown", { amp: CROWN, root: [x, k, z], span: H - k, phase: i * 1.7 }, () => B.rbox(a, a * 0.82, a, 0.12, t3([L.crown[c], L.crown[Math.min(2, c + 1)], L.crown[2]]), x + (v % 2 ? -0.04 : 0.04), y, z)));
}

function fence(B, L, n) {
  const x0 = -n / 2, z = 0.34;
  B.box(n - 0.04, 0.08, 0.1, t3(L.rail), 0, 0.52, z);
  B.box(n - 0.04, 0.07, 0.08, t3(L.rail), 0, 0.26, z);
  for (let i = 0; i <= n; i++) {
    const x = Math.max(x0 + 0.08, Math.min(-x0 - 0.08, x0 + i));
    B.rbox(0.16, 0.74, 0.16, 0.03, t3(i % n === 0 ? L.post[0] : L.rail), x, 0, z);
    B.box(0.2, 0.06, 0.2, t3(L.trim), x, 0.74, z);
  }
}

function road(B, L, n) {
  const x0 = -n / 2;
  for (let i = 0; i < n; i++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const j = hash(i * 3 + c, r);
    const w = 0.24 + j * 0.06, d = 0.22 + hash(r, i * 3 + c) * 0.06;
    B.rbox(w, 0.05, d, 0.04, t3(j < 0.33 ? L.kerb : L.cobble), x0 + i + 0.2 + c * 0.3, 0.005, -0.3 + r * 0.3);
  }
  for (const sz of [-1, 1]) B.box(n - 0.02, 0.07, 0.07, t3(L.kerb), 0, 0, sz * 0.47);
}

export function registerStamps(style = {}, over = {}) {
  const L = stampLook(style.palette, over);
  const catalog = {}, builders = {};
  const add = (t, entry, fn) => { catalog[t] = entry; builders[t] = (v, rot, st, ctx) => { const B = new Baker(); fn(B, v, ctx); return mesh(B); }; };
  add("arch", stamp([3, 1], [{ pass: false, h: ARCH.post + 0.3 }, { pass: true, h: ARCH.over + 0.52, over: ARCH.over }, { pass: false, h: ARCH.post + 0.3 }], { attach: "route" }), (B) => arch(B, L));
  for (let n = 1; n <= SPAN_MAX; n++) add(`bridge-span-${n}`, stamp([1, n], Array.from({ length: n }, () => ({ pass: true, h: 0.68, span: true })), { attach: "span" }), (B) => span(B, L, n));
  add("canopy", stamp([2, 2], [{ pass: false, h: CANOPY.height }, { pass: true, h: CANOPY.height, over: CANOPY.over }, { pass: true, h: CANOPY.height, over: CANOPY.over }, { pass: true, h: CANOPY.height, over: CANOPY.over }]), (B, v) => canopy(B, L, v));
  for (let n = 2; n <= RUN_MAX; n++) {
    add(`fence-run-${n}`, stamp([n, 1], Array.from({ length: n }, () => ({ pass: false, h: 0.8 })), { attach: "edge" }), (B) => fence(B, L, n));
    add(`road-run-${n}`, stamp([n, 1], Array.from({ length: n }, () => ({ pass: true, h: 0.06 })), { attach: "route" }), (B) => road(B, L, n));
  }
  return { catalog, builders, look: L };
}

export const flameCrest = (flames, tones) => (B, x, y, z) => {
  B.box(0.3, 0.08, 0.3, t3(tones[0]), x, y, z);
  B.push(x, y + 0.08, z);
  flames(B, [[0, 0, 0.16, 0.5, tones[1], 0], [-0.1, 0.05, 0.09, 0.34, tones[2], 0.35], [0.1, -0.04, 0.09, 0.38, tones[3], -0.35]]);
  B.pop();
};
