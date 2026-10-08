import * as THREE from "three";
import { tone, solid, circle } from "./baker.js";
import { motion } from "./motion.js";
import { rideUniforms } from "../core/sequence.js";

export const SHAFT_STYLES = ["tile", "rails", "hex"];
export const TILE_STYLES = ["a", "b", "c"];
const SIDE = [[0, 1], [1, 0], [0, -1], [-1, 0]];

const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
export const liftOpts = {
  shaft: SHAFT_STYLES.includes(q.get("shaft")) ? q.get("shaft") : "tile",
  tile: TILE_STYLES.includes(q.get("lifttile")) ? q.get("lifttile") : "a",
};

export const BEAM = { up: 32, down: -26, low: -15, fade: [2.0, 15], color: "#12c4f0", hot: "#ffffff" };

const K = {
  hull: tone("#4a5466", "#363e4d", "#262c37"),
  dark: tone("#2a303b", "#1d222b", "#151920"),
  plate: tone("#eef2f6", "#cdd5de", "#a7b1bd"),
  glow: solid("#7df9ff"),
  hot: solid("#d8fdff"),
  amber: solid("#ffb52e"),
  trim: "#1b1f27",
};

export const outOf = (t) => SIDE[((t.rot || 0) % 4 + 4) % 4];
export const isLiftCell = (c) => c?.s === "lift";

function frame(B, x, z, out) {
  const [ox, oz] = out, px = oz, pz = ox, cx = x + 0.5, cz = z + 0.5;
  const at = (u, p) => [cx + ox * u + px * p, cz + oz * u + pz * p];
  const box = (pal, u, p, y0, h, du, dp) => { const [wx, wz] = at(u, p); B.box(Math.abs(ox) * du + Math.abs(px) * dp, h, Math.abs(oz) * du + Math.abs(pz) * dp, pal, wx, y0, wz); };
  const strut = (pal, u0, y0, u1, y1, p, w = 0.09) => {
    const L = Math.hypot(u1 - u0, y1 - y0), s = -pz * ox + px * oz, a = Math.atan2(u1 - u0, y1 - y0) * s;
    const [wx, wz] = at(u0, p);
    B.rot([px, 0, pz], a, wx, y0, wz);
    B.box(w, L, w, pal, 0, 0, 0);
    B.pop();
  };
  return { at, box, strut, ox, oz, px, pz, cx, cz };
}

function tileA(B, F, top, bot) {
  F.box(K.hull, 0, 0, bot, top - 0.16 - bot, 0.96, 0.96);
  F.box(K.dark, 0, 0, bot - 0.14, 0.14, 0.7, 0.7);
  F.box(K.plate, 0, 0, top - 0.16, 0.16, 0.96, 0.96);
  for (const p of [-0.49, 0.49]) F.box(K.glow, 0.1, p, bot + 0.1, top - 0.36 - bot, 0.06, 0.02);
  F.box(K.glow, 0.49, 0, bot + 0.1, top - 0.36 - bot, 0.02, 0.06);
  F.box(K.dark, 0.43, 0, top, 0.025, 0.08, 0.9);
  for (let i = 0; i < 5; i++) F.box(K.amber, 0.43, -0.36 + i * 0.18, top + 0.004, 0.025, 0.08, 0.09);
  for (const p of [-0.3, 0.3]) {
    F.box(K.dark, -0.5, p, top - 0.22, 0.26, 0.34, 0.16);
    F.box(K.hull, -0.58, p, top - 0.01, 0.05, 0.22, 0.16);
    F.box(K.glow, -0.62, p, top + 0.04, 0.012, 0.05, 0.05);
  }
  B.flat(circle(F.cx, F.cz, 0.4, 0.4, 16), top + 0.003, K.trim);
  B.flat(circle(F.cx, F.cz, 0.36, 0.36, 16), top + 0.005, "#7df9ff");
  B.flat(circle(F.cx, F.cz, 0.31, 0.31, 16), top + 0.007, "#dfe5ec");
}

function tileB(B, F, top) {
  const d = 0.24;
  F.box(K.hull, 0.02, 0, top - d, d - 0.06, 0.94, 0.94);
  F.box(K.plate, 0.02, 0, top - 0.06, 0.06, 0.94, 0.94);
  F.box(K.glow, 0.49, 0, top - d + 0.04, 0.05, 0.02, 0.9);
  for (const p of [-0.475, 0.475]) F.box(K.glow, 0.02, p, top - d + 0.04, 0.05, 0.9, 0.02);
  F.box(K.dark, -0.47, 0, top - 1.55, 1.4, 0.06, 0.9);
  for (const p of [-0.33, 0.33]) for (const y of [top - 1.42, top - 0.5]) F.box(K.glow, -0.5, p, y, 0.06, 0.02, 0.06);
  for (const p of [-0.36, 0.36]) {
    F.strut(K.hull, -0.44, top - 1.35, 0.4, top - d, p, 0.1);
    F.box(K.dark, -0.02, p, top - d - 0.08, 0.08, 0.84, 0.07);
  }
  F.box(K.dark, -0.5, 0, top - 0.02, 0.05, 0.14, 0.94);
  for (let i = 0; i < 4; i++) F.box(K.amber, -0.5, -0.33 + i * 0.22, top + 0.006, 0.026, 0.1, 0.1);
  const [qx, qz] = F.at(0.02, 0), sq = (r) => circle(qx, qz, r * Math.SQRT2, r * Math.SQRT2, 4, Math.PI / 4);
  B.flat(sq(0.38), top + 0.003, K.trim);
  B.flat(sq(0.34), top + 0.005, "#7df9ff");
  B.flat(sq(0.29), top + 0.007, "#dfe5ec");
}

function tileC(B, F, top) {
  const u0 = 0.1, [cx, cz] = F.at(u0, 0), pad = circle(cx, cz, 0.44, 0.44, 8, Math.PI / 8);
  B.prism(pad, top - 0.2, top - 0.05, K.hull);
  B.prism(circle(cx, cz, 0.42, 0.42, 8, Math.PI / 8), top - 0.05, top, K.plate);
  B.prism(circle(cx, cz, 0.45, 0.45, 8, Math.PI / 8), top - 0.16, top - 0.11, K.glow, { top: false });
  B.frustum(circle(cx, cz, 0.32, 0.32, 8, Math.PI / 8), circle(cx, cz, 0.4, 0.4, 8, Math.PI / 8), top - 0.5, top - 0.2, K.dark, { top: false });
  B.cone(0.32, 0.14, 0.22, K.dark, cx, top - 0.72, cz, 8);
  B.cyl(0.2, 0.05, K.glow, cx, top - 0.79, cz, 8);
  B.cyl(0.11, 0.06, K.hot, cx, top - 0.84, cz, 8);
  F.box(K.glow, -0.42, 0, top - 0.035, 0.03, 0.2, 0.44);
  for (const p of [-0.26, 0.26]) {
    F.box(K.dark, -0.56, p, top - 0.06, 0.24, 0.1, 0.1);
    F.box(K.glow, -0.56, p, top + 0.18, 0.04, 0.07, 0.07);
    F.box(K.dark, -0.5, p, top - 0.5, 0.42, 0.04, 0.08);
  }
  B.flat(circle(cx, cz, 0.3, 0.3, 8, Math.PI / 8), top + 0.004, "#7df9ff");
  B.flat(circle(cx, cz, 0.25, 0.25, 8, Math.PI / 8), top + 0.006, "#dfe5ec");
}

export function liftTile(B, L, x, z, c, T, bottom) {
  const t = (L.things || []).find((q) => q.kind === "elevator" && q.x === x && q.z === z);
  const F = frame(B, x, z, t ? outOf(t) : attachOut(L, x, z));
  const top = c.h * T;
  const style = liftOpts.tile;
  if (style === "b") tileB(B, F, top);
  else if (style === "c") tileC(B, F, top);
  else tileA(B, F, top, bottom);
}

export function attachOut(L, x, z) {
  for (let r = 0; r < 4; r++) {
    const [ox, oz] = SIDE[r], n = L.cells[z - oz]?.[x - ox];
    if (n && n.s !== "none" && n.s !== "lift" && n.s !== "water") return SIDE[r];
  }
  return SIDE[0];
}

export function liftDeck(B) {
  B.rbox(0.72, 0.06, 0.72, 0.06, K.plate, 0, 0.01, 0);
  for (const s of [-1, 1]) {
    B.box(0.72, 0.02, 0.04, K.glow, 0, 0.07, s * 0.34);
    B.box(0.04, 0.02, 0.72, K.glow, s * 0.34, 0.07, 0);
  }
  B.box(0.2, 0.02, 0.2, K.dark, 0, 0.07, 0);
  B.box(0.1, 0.03, 0.1, K.hot, 0, 0.07, 0);
}

function shell(pos, nor, aux, ring, y0, y1, part) {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n];
    const nx = bz - az, nz = -(bx - ax), l = Math.hypot(nx, nz) || 1;
    const u0 = i / n, u1 = (i + 1) / n;
    const v = [[ax, y0, az, u0], [bx, y0, bz, u1], [bx, y1, bz, u1], [ax, y0, az, u0], [bx, y1, bz, u1], [ax, y1, az, u0]];
    for (const [px, py, pz, u] of v) { pos.push(px, py, pz); nor.push(nx / l, 0, nz / l); aux.push(u, part); }
  }
}

function plane(pos, nor, aux, a, b, y0, y1, part) {
  const nx = b[1] - a[1], nz = -(b[0] - a[0]), l = Math.hypot(nx, nz) || 1;
  const v = [[a, y0, 0], [b, y0, 1], [b, y1, 1], [a, y0, 0], [b, y1, 1], [a, y1, 0]];
  for (const [p, y, u] of v) { pos.push(p[0], y, p[1]); nor.push(nx / l, 0, nz / l); aux.push(u, part); }
}

export function beamGeometry(style, out, arrival) {
  const y0 = arrival ? BEAM.down : 0.04, y1 = arrival ? 0 : BEAM.up;
  const pos = [], nor = [], aux = [];
  const [ox, oz] = out, px = oz, pz = ox;
  const ring = (cx, cz, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
  if (style === "rails") {
    const s = arrival ? 0.34 : 0.4;
    const e = arrival ? 0.3 : 0.36, A = [ox * e + px * s, oz * e + pz * s], Bp = [ox * e - px * s, oz * e - pz * s];
    shell(pos, nor, aux, ring(A[0], A[1], 0.09, 8), y0, y1, 0);
    shell(pos, nor, aux, ring(Bp[0], Bp[1], 0.09, 8), y0, y1, 0);
    plane(pos, nor, aux, A, Bp, y0, y1, 1);
    const C = [-ox * 0.1 + px * s, -oz * 0.1 + pz * s], D = [-ox * 0.1 - px * s, -oz * 0.1 - pz * s];
    plane(pos, nor, aux, A, C, y0, y1, 2);
    plane(pos, nor, aux, Bp, D, y0, y1, 2);
  } else if (style === "hex") {
    shell(pos, nor, aux, ring(0, 0, arrival ? 0.44 : 0.52, 6, Math.PI / 6), y0, y1, 0);
    shell(pos, nor, aux, ring(0, 0, 0.07, 6), y0, y1, 1);
  } else {
    const h = arrival ? 0.41 : 0.47;
    shell(pos, nor, aux, [[h, h], [h, -h], [-h, -h], [-h, h]], y0, y1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aB", new THREE.Float32BufferAttribute(aux, 2));
  return g;
}

const VERT = `attribute vec2 aB;
uniform float uTop, uArr;
varying vec2 vB; varying float vY, vF, vS;
void main() {
  vec3 p = position;
  if (uArr > 0.5 && p.y > -0.001) p.y += uTop;
  vY = p.y; vB = aB;
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 v = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vS = dot(n, v);
  vF = abs(vS);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
}`;

const FRAG = `#define TAU 6.2831853
uniform float uTime, uRide, uRideTime, uRideDir, uOn, uTop, uArr, uLo, uF0, uF1;
uniform vec3 uCol, uHot;
varying vec2 vB; varying float vY, vF, vS;
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  float t = uTime + 7.3, y = vY, u = vB.x, part = vB.y;
  float on = uOn * step(0.001, uRide);
  float env, foot, span, base;
  if (uArr > 0.5) {
    env = smoothstep(uLo, uLo + 11.0, y) * (1.0 - smoothstep(uTop - 0.02, uTop + 0.06, y));
    foot = exp(-abs(y - uTop) * 2.2);
    span = 9.0; base = uTop - span;
  } else {
    float f = 1.0 - smoothstep(uF0, uF1, y);
    env = smoothstep(0.0, 0.35, y) * f * f;
    foot = exp(-y * 2.0);
    span = 11.0; base = 0.0;
  }
  if (env < 0.004) discard;
  float flow = uRideTime * 16.0 * uRideDir * on;
  float ring = 0.0, halo = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i), r = h1(fi + 1.0), s = h1(fi + 11.0);
    float pos = t * (0.45 + 1.0 * r) + 0.7 * sin(t * (0.7 + s) + fi * 2.1) + r * span - flow;
    float yi = base + mod(pos, span);
    float wave = 0.11 * sin(u * TAU * 2.0 + t * (2.0 + 2.0 * r) + fi) + 0.04 * sin(u * TAU * 5.0 - t * 3.0);
    float vis = smoothstep(-0.3, 0.7, sin(t * (0.5 + 0.8 * s) + fi * 4.7)) + 0.5 * on;
#if STYLE == 1
    vis += 0.45;
#endif
    float w = mix(0.035, 0.08, s) * (1.0 + 0.8 * uRide * uOn);
    float d = (y - yi - wave) / w;
    ring += min(vis, 1.0) * exp(-d * d);
    halo += min(vis, 1.0) * exp(-d * d * mix(0.08, 0.5, uRide * uOn));
  }
  ring = min(ring, 1.2);
  halo = min(halo, 1.0);
  float scan = 0.5 + 0.5 * sin(y * 22.0 - t * 5.0);
  float shim = 0.5 + 0.5 * sin(u * TAU * 7.0 + y * 2.3 - t * 3.1) * sin(y * 1.7 + t * 2.3);
  float a, hot;
#if STYLE == 0
  float edge = pow(abs(fract(u * 4.0) - 0.5) * 2.0, 14.0);
  float face = pow(1.0 - vF, 2.0);
  float ray = pow(0.5 + 0.5 * sin(u * TAU * 6.0 + 1.6 * sin(y * 0.35 - t * 0.9)), 5.0);
  a = 0.015 + 0.05 * scan * shim + 0.08 * ray + 0.85 * edge + 0.07 * face + 0.95 * ring + 0.3 * halo;
  hot = clamp(0.7 * ring + 0.25 * edge, 0.0, 1.0);
#elif STYLE == 1
  float pulse = 0.5 + 0.5 * sin(y * 3.0 - t * 6.0 - flow);
  if (part < 0.5) {
    float core = pow(vF, 1.6);
    a = 0.35 + 0.65 * core * (0.75 + 0.25 * pulse) + 0.6 * ring + 0.3 * halo;
    hot = clamp(core * 0.5 + 0.7 * ring, 0.0, 1.0);
  } else {
    float bars = 0.5 + 0.5 * sin(u * TAU * 3.0 + y * 0.8 - t * 1.7);
    float side = part > 1.5 ? 0.45 : 1.0;
    float rim = pow(abs(u - 0.5) * 2.0, 6.0);
    a = side * (0.04 + 0.07 * scan * shim + 0.3 * rim + 1.3 * ring * (0.6 + 0.4 * bars) + 0.45 * halo);
    hot = clamp(0.7 * ring, 0.0, 1.0);
  }
#else
  if (part < 0.5) {
    vec2 g = vec2(u * 12.0, y * 1.5);
    g.x += 0.5 * mod(floor(g.y), 2.0);
    vec2 c = floor(g), f = fract(g) - 0.5;
    float cell = h2(c);
    float ed = max(abs(f.x) * 1.15 + abs(f.y) * 0.4, abs(f.y) * 1.2);
    float line = smoothstep(0.42, 0.52, ed);
    float flick = smoothstep(0.55, 1.0, sin(t * (1.0 + 2.0 * cell) + cell * 40.0 + y * 0.4));
    float edge = pow(abs(fract(u * 6.0) - 0.5) * 2.0, 10.0);
    a = 0.02 + 0.32 * line * (0.45 + 0.55 * shim) + 0.2 * flick * (1.0 - line) + 0.6 * edge + 0.95 * ring + 0.3 * halo;
    hot = clamp(0.7 * ring + 0.3 * flick, 0.0, 1.0);
  } else {
    float core = pow(vF, 2.0);
    a = 0.5 * core * (0.6 + 0.4 * scan) + 0.5 * ring;
    hot = 0.6 * core;
  }
#endif
  float front = step(0.02, vS);
  a = (a + 0.55 * foot * (1.0 - 0.7 * on)) * env * mix(1.0, mix(0.8, 0.18, on), front);
  gl_FragColor = vec4(mix(uCol, uHot, hot), clamp(a, 0.0, 1.0));
}`;

export function beamMaterial(style, arrival) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: motion.uTime,
      uRide: rideUniforms.uRide,
      uRideTime: rideUniforms.uRideTime,
      uRideDir: rideUniforms.uRideDir,
      uOn: { value: 0 },
      uTop: { value: 0.12 },
      uArr: { value: arrival ? 1 : 0 },
      uLo: { value: BEAM.low },
      uF0: { value: BEAM.fade[0] },
      uF1: { value: BEAM.fade[1] },
      uCol: { value: new THREE.Color(BEAM.color) },
      uHot: { value: new THREE.Color(BEAM.hot) },
    },
    defines: { STYLE: SHAFT_STYLES.indexOf(style) },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  m.userData.on = m.uniforms.uOn;
  m.userData.top = m.uniforms.uTop;
  return m;
}
