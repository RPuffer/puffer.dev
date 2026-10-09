import * as THREE from "three";
import { DEPTH, liftLevel, floorLevel } from "../terrain.js";
import { mulberry32, hashSeed } from "../../core/rng.js";
import { motion } from "../motion.js";
import { SKY } from "../sky.js";

const PACK_DIR = [0.3, 1, 0.6];
const VOID = -99;

export function island(state, style) {
  const L = liftLevel(state.level), T = state.view.tileH, [W, D] = L.size, F = floorLevel(L), BASE = F * T - DEPTH;
  const data = new Uint16Array((W + 2) * (D + 2) * 4);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const occ = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = L.cells[z]?.[x];
    if (!c || c.s === "none") continue;
    if (c.h >= 1 && c.s !== "bridge") occ[z * W + x] = 1;
    else if (c.s === "water" || c.h === 0) occ[z * W + x] = 2;
    else continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); z0 = Math.min(z0, z); z1 = Math.max(z1, z + 1);
  }
  const H = THREE.DataUtils.toHalfFloat;
  for (let z = -1; z <= D; z++) for (let x = -1; x <= W; x++) {
    const o = ((z + 1) * (W + 2) + x + 1) * 4, k = x >= 0 && z >= 0 && x < W && z < D ? occ[z * W + x] : 0, c = k ? L.cells[z][x] : null;
    const top = k === 1 ? c.h * T : k === 2 ? c.h * T - 0.1 : VOID, bot = k === 1 ? top - DEPTH - Math.max(0, c.h - F) * T : k === 2 ? top - 0.2 : VOID;
    data[o] = H(top); data[o + 1] = H(bot); data[o + 2] = H(k ? 1 : 0); data[o + 3] = H(0);
  }
  const tex = new THREE.DataTexture(data, W + 2, D + 2, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const bottom = (x, z) => { const c = L.cells[z][x]; return occ[z * W + x] === 1 ? c.h * T - DEPTH - Math.max(0, c.h - F) * T : c.h * T - 0.3; };
  const rim = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!occ[z * W + x]) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Z = z + dz;
      if (X < 0 || Z < 0 || X >= W || Z >= D || !occ[Z * W + X]) rim.push({ x: x + 0.5 + dx * 0.5, z: z + 0.5 + dz * 0.5, nx: dx, nz: dz, top: occ[z * W + x] === 1 ? L.cells[z][x].h * T : 0, bot: bottom(x, z) });
    }
  }
  const l = style.light?.dir ? style.light.dir.clone() : new THREE.Vector3(...PACK_DIR).normalize();
  const bg = new THREE.Color(style.bg);
  const srgb = bg.clone().convertLinearToSRGB(), mx = Math.max(srgb.r, srgb.g, srgb.b, 1e-3);
  const sat = mx - Math.min(srgb.r, srgb.g, srgb.b), lum = 0.299 * srgb.r + 0.587 * srgb.g + 0.114 * srgb.b;
  const night = THREE.MathUtils.clamp((0.28 - lum) / 0.18, 0, 1), tinted = THREE.MathUtils.smoothstep(sat, 0.03, 0.1);
  const chroma = new THREE.Color(srgb.r / mx, srgb.g / mx, srgb.b / mx);
  const lit = SKY !== "none";
  const hue = new THREE.Color(0.78, 0.86, 1).lerp(new THREE.Color(0.62, 0.7, 1), lit ? 0.4 : night).lerp(chroma, lit ? 0.15 : Math.max(tinted, 0.5 * night)).convertSRGBToLinear();
  const exposure = style.light ? Math.min(1, style.light.ambient + style.light.sun) : 1;
  const gain = exposure * (lit ? 1 : 1 - 0.55 * night * (1 - tinted));
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, radius = Math.hypot(x1 - x0, z1 - z0) / 2;
  const dir = new THREE.Vector3(...state.proj.dir);
  const right = new THREE.Vector3(...state.proj.right), up = new THREE.Vector3(...state.proj.up);
  return {
    L, T, W, D, occ, tex, rim, center: new THREE.Vector2(cx, cz), radius, box: { x0, x1, z0, z1 },
    base: BASE, light: l, bg, hue, gain, night, dir, right, up,
    lightScreen: new THREE.Vector2(l.dot(right), l.dot(up)).normalize(),
    bottomAt(x, z) { const X = Math.floor(x), Z = Math.floor(z); return X >= 0 && Z >= 0 && X < W && Z < D && occ[Z * W + X] ? bottom(X, Z) : BASE; },
    occupied(x, z) { const X = Math.floor(x), Z = Math.floor(z); return X >= 0 && Z >= 0 && X < W && Z < D && occ[Z * W + X] > 0; },
    rng: (k) => mulberry32(hashSeed(`clouds:${k}:${state.params.seed || 1}`)),
  };
}

export function uniformsFor(I) {
  return {
    uTime: motion.uTime,
    uIsland: { value: I.tex },
    uGrid: { value: new THREE.Vector2(I.W, I.D) },
    uCenter: { value: I.center },
    uRadius: { value: I.radius },
    uBg: { value: I.bg },
    uHue: { value: I.hue },
    uLightScreen: { value: I.lightScreen },
    uBase: { value: I.base },
  };
}

export const GLSL_COMMON = `
uniform float uTime;
uniform sampler2D uIsland;
uniform vec2 uGrid;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec3 uBg;
uniform vec3 uHue;
uniform vec2 uLightScreen;
uniform float uBase;
vec4 islandAt(vec2 xz) { return texture2D(uIsland, (xz + 1.0) / (uGrid + 2.0)); }
float fogAt(vec2 xz) { return smoothstep(uRadius + 1.5, uRadius + 9.0, distance(xz, uCenter)); }
float fadeAt(vec2 xz) { return 1.0 - smoothstep(uRadius + 6.0, uRadius + 11.0, distance(xz, uCenter)); }
`;

export function shapeDistance(I) {
  if (I._sd) return I._sd;
  const pad = 24, step = 0.5, X0 = -pad, Z0 = -pad, NX = Math.ceil((I.W + 2 * pad) / step), NZ = Math.ceil((I.D + 2 * pad) / step);
  const d = new Float32Array(NX * NZ).fill(1e9), q = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) if (I.occupied(X0 + (i + 0.5) * step, Z0 + (j + 0.5) * step)) { d[j * NX + i] = 0; q.push(j * NX + i); }
  for (let pass = 0; pass < 2; pass++) for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    for (const [di, dj, w] of pass ? [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]] : [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]]) {
      const a = i + (pass ? di : di), b = j + (pass ? dj : dj);
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const v = d[b * NX + a] + w * step;
      if (v < d[k]) d[k] = v;
    }
  }
  for (let pass = 0; pass < 2; pass++) for (let j = NZ - 1; j >= 0; j--) for (let i = NX - 1; i >= 0; i--) {
    const k = j * NX + i;
    for (const [di, dj, w] of [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const v = d[b * NX + a] + w * step;
      if (v < d[k]) d[k] = v;
    }
  }
  I._sd = (x, z) => {
    const i = Math.floor((x - X0) / step), j = Math.floor((z - Z0) / step);
    return i < 0 || j < 0 || i >= NX || j >= NZ ? 1e9 : d[j * NX + i];
  };
  return I._sd;
}

export function hugScatter(I, rng, { count, inner, outer, round = 8, yMin, yMax, minGap = 0 }) {
  const sd = shapeDistance(I), out = [], core = Math.max(1, I.radius * 0.55);
  const reach = outer + round;
  let tries = 0;
  while (out.length < count && tries++ < count * 60) {
    const x = I.box.x0 - reach + rng() * (I.box.x1 - I.box.x0 + 2 * reach), z = I.box.z0 - reach + rng() * (I.box.z1 - I.box.z0 + 2 * reach);
    const ds = sd(x, z);
    if (ds <= 0.05) continue;
    const dc = Math.max(0, Math.hypot(x - I.center.x, z - I.center.y) - core);
    const w = Math.min(1, ds / round), lvl = ds * (1 - w) + Math.max(ds, dc - (I.radius - core)) * w;
    if (lvl < inner || lvl > outer) continue;
    if (minGap && out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minGap * minGap)) continue;
    out.push({ x, y: yMin + rng() * (yMax - yMin), z, r: rng() });
  }
  return out;
}

export function scatter(I, rng, { count, inner, outer, yMin, yMax, minGap = 0, avoid = true }) {
  const out = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 40) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(inner * inner + rng() * (outer * outer - inner * inner));
    const x = I.center.x + Math.cos(a) * r * ((I.box.x1 - I.box.x0) / (2 * I.radius) * 0.35 + 0.65), z = I.center.y + Math.sin(a) * r * ((I.box.z1 - I.box.z0) / (2 * I.radius) * 0.35 + 0.65);
    if (avoid && I.occupied(x, z)) continue;
    if (minGap && out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minGap * minGap)) continue;
    out.push({ x, y: yMin + rng() * (yMax - yMin), z, r: rng() });
  }
  return out;
}

export function rimPoints(I, rng, { every = 1, outset = 0.7, jitter = 0.25 }) {
  const pts = [];
  I.rim.forEach((e, i) => {
    if (i % every) return;
    const o = outset + (rng() - 0.5) * jitter, t = (rng() - 0.5) * 0.6;
    pts.push({ x: e.x + e.nx * o + e.nz * t, z: e.z + e.nz * o + e.nx * t, nx: e.nx, nz: e.nz, top: e.top, bot: e.bot, r: rng() });
  });
  return pts;
}

export function underPoints(I, rng, { step = 2, y0, y1 }) {
  const pts = [];
  for (let z = I.box.z0 + step / 2; z < I.box.z1; z += step) for (let x = I.box.x0 + step / 2; x < I.box.x1; x += step) {
    const px = x + (rng() - 0.5) * step * 0.6, pz = z + (rng() - 0.5) * step * 0.6;
    if (I.occupied(px, pz)) pts.push({ x: px, y: I.bottomAt(px, pz) - I.base + y0 + rng() * (y1 - y0), z: pz, r: rng() });
  }
  return pts;
}

export const depthOf = (I, p) => p.x * I.dir.x + p.y * I.dir.y + p.z * I.dir.z;
