import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const C = {
  fur: ["#68717b", "#555d66", "#424850"],
  furDeep: ["#4b5259", "#3c4248", "#2e3338"],
  hatch: ["#2c3036", "#22262b", "#191c20"],
  skull: ["#f4f1ea", "#dedad0", "#c1bcb1"],
  belly: ["#dcd8d0", "#c4c0b7", "#a9a49a"],
  ink: ["#17191d", "#111316", "#0b0c0e"],
  tooth: ["#fffdf6", "#efebe2", "#d6d1c6"],
  gum: ["#4a3a3e", "#3b2e31", "#2d2326"],
  paper: ["#efece4", "#d9d5cb", "#bcb7ab"],
  stone: ["#c9ccd1", "#acb0b6", "#8f949b"],
  stoneDeep: ["#9da2a9", "#858a91", "#6d7279"],
  crack: ["#3a3f46", "#2f3339", "#24272c"],
  sand: ["#e8dcc0", "#cbbb98", "#b3a17c"],
};
const T = (c) => tone(c[0], c[1], c[2]);
const UP = new THREE.Vector3(0, 1, 0);
const TILE = 1.5;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function tube(B, a, b, r0, r1, pal, n = 7) {
  const A = new THREE.Vector3(...a), D = new THREE.Vector3(...b).sub(A);
  const len = D.length();
  if (len < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(UP, D.clone().normalize());
  B.pushMatrix(new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)));
  if (r1 > 0) B.cone(r0, r1, len, pal, 0, 0, 0, n);
  else B.cone(r0, 0, len, pal, 0, 0, 0, n);
  B.pop();
}

function blade(B, pts, t, pal, x, y, z, yaw = 0) {
  B.push(x, y, z, yaw);
  B.rot([0, 0, 1], Math.PI / 2);
  B.prism(pts, -t, t, pal, { bottom: true });
  B.pop();
  B.pop();
}

function tuft(B, x, y, z, h, w, pal, yaw, lean) {
  B.push(x, y, z, yaw);
  B.rot([1, 0, 0], -lean);
  B.cone(w, 0, h, pal, 0, 0, 0, 3);
  B.pop();
  B.pop();
}

function fluke(B, s, pal) {
  blade(B, [[0, 0], [0.9 * s, -0.55 * s], [1.15 * s, -0.75 * s], [0.55 * s, -0.12 * s], [0.1 * s, 0.12 * s]], 0.05 * s, pal, 0, 0, 0);
  blade(B, [[0, 0], [-0.7 * s, -0.45 * s], [-0.85 * s, -0.6 * s], [-0.35 * s, -0.05 * s], [-0.05 * s, 0.12 * s]], 0.05 * s, pal, 0, 0, 0);
}

export function sharkHead(B, s = 1, open = 0.18, rich = true, crest = true) {
  B.push(0, 0, 0, 0, s);
  B.rbox(0.78, 0.5, 0.86, 0.14, T(C.skull), 0, 0.1, 0.05);
  B.rbox(0.62, 0.22, 0.6, 0.1, T(C.skull), 0, 0.58, 0.0);
  B.rot([1, 0, 0], Math.PI / 2 - 0.12, 0, 0.42, 0.45);
  B.cone(0.36, 0.06, 0.78, T(C.skull), 0, 0, 0, 8);
  B.pop();
  B.rbox(0.6, 0.18, 0.9, 0.08, T(C.belly), 0, 0.05 - open, 0.42);
  B.box(0.5, 0.06, 0.7, T(C.gum), 0, 0.17 - open * 0.5, 0.48);
  for (const side of [-1, 1]) {
    for (let i = 0; i < (rich ? 6 : 3); i++) {
      const z = 0.12 + i * (rich ? 0.12 : 0.24);
      B.at(side * 0.26 * (1 - i * 0.05), 0.24 - open * 0.3, z, 0, () => B.cone(0.045, 0, -0.13, T(C.tooth), 0, 0, 0, 3));
      B.at(side * 0.25 * (1 - i * 0.05), 0.2 - open, z + 0.06, 0, () => B.cone(0.04, 0, 0.12, T(C.tooth), 0, 0, 0, 3));
    }
    B.box(0.04, 0.12, 0.18, T(C.ink), side * 0.36, 0.42, 0.42);
    B.box(0.02, 0.05, 0.06, T(C.paper), side * 0.37, 0.45, 0.46);
    for (let g = 0; g < (rich ? 4 : 2); g++) B.box(0.03, 0.3, 0.035, T(C.ink), side * 0.4, 0.18, -0.12 - g * 0.09);
  }
  if (crest) blade(B, [[0, -0.35], [0.55, -0.2], [1.55, -0.55], [1.7, -0.62], [0.85, 0.02], [0.2, 0.28]], 0.06, T(C.skull), 0, 0.62, -0.05);
  B.pop();
}

function furHatch(B, rand, cx, cy, cz, w, h, d, n, yaw = 0) {
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1, side = rand() < 0.5 ? -1 : 1, top = rand() < 0.45;
    const x = top ? u * w * 0.42 : side * w * 0.5;
    const y = top ? cy + h : cy + h * (0.25 + rand() * 0.7);
    const z = cz + (rand() * 2 - 1) * d * 0.45;
    const ly = Math.atan2(x, 0.0001) + yaw;
    tuft(B, x + cx, y, z, 0.12 + rand() * 0.16, 0.025 + rand() * 0.02, T(rand() < 0.5 ? C.hatch : C.furDeep), top ? Math.PI : ly, top ? 1.25 : 1.0 + rand() * 0.4);
  }
}

export function beast(B, rand, { rich = true, head = true, tail = true, tailSweep = 1 } = {}) {
  const segs = [[-0.62, 0.92, 0.9, 0.62, 0.62], [-0.22, 1.06, 1.1, 0.66, 0.62], [0.18, 1.18, 1.22, 0.72, 0.6], [0.52, 1.02, 1.12, 0.68, 0.5]];
  for (const [z, y, w, h, d] of segs) B.rbox(w, h, d, 0.16, T(C.fur), 0, y, z);
  B.rbox(0.9, 0.34, 1.2, 0.12, T(C.belly), 0, 0.82, -0.02);
  B.rbox(1.0, 0.3, 0.7, 0.14, T(C.furDeep), 0, 1.78, 0.12);
  if (rich) for (const [z, y, w, h, d] of segs) furHatch(B, rand, 0, y, z, w, h, d, 16);
  for (const sx of [-1, 1]) {
    const sh = [sx * 0.58, 1.55, 0.52], el = [sx * 0.72, 0.85, 0.82], pw = [sx * 0.64, 0.12, 0.98];
    B.ball(0.32, T(C.fur), sh[0], sh[1], sh[2], 1.1, 1);
    tube(B, sh, el, 0.3, 0.25, T(C.fur));
    tube(B, el, pw, 0.25, 0.23, T(C.furDeep));
    B.rbox(0.42, 0.2, 0.44, 0.08, T(C.furDeep), pw[0], 0, pw[2]);
    for (const dx of [-0.12, 0, 0.12]) B.ball(0.07, T(C.hatch), pw[0] + dx, 0.06, pw[2] + 0.22, 0.8, 0);
    if (rich) for (let i = 0; i < 6; i++) tuft(B, el[0] + sx * 0.18, el[1] - 0.2 + i * 0.12, el[2] - 0.05, 0.16, 0.03, T(C.hatch), sx * Math.PI / 2, 1.2);
    const hp = [sx * 0.48, 1.0, -0.66], kn = [sx * 0.6, 0.5, -0.42], ft = [sx * 0.55, 0.08, -0.7];
    B.ball(0.36, T(C.fur), hp[0], hp[1], hp[2], 1, 1);
    tube(B, hp, kn, 0.3, 0.24, T(C.fur));
    tube(B, kn, ft, 0.22, 0.2, T(C.furDeep));
    B.rbox(0.36, 0.16, 0.46, 0.06, T(C.furDeep), ft[0], 0, ft[2] + 0.06);
  }
  if (tail) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, a = -Math.PI * 0.95 + u * Math.PI * 1.25 * tailSweep;
      const r = 1.05 + u * 0.35;
      pts.push([Math.sin(a) * r * 0.9, 0.95 - u * 0.75 + Math.sin(u * Math.PI) * 0.15, Math.cos(a) * r - 0.1]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const r0 = 0.26 * (1 - i / 11) + 0.04, r1 = 0.26 * (1 - (i + 1) / 11) + 0.04;
      tube(B, pts[i], pts[i + 1], r0, r1, T(i < 3 ? C.fur : C.paper), 7);
    }
    const e = pts[pts.length - 1], p = pts[pts.length - 2];
    B.push(e[0], e[1], e[2], Math.atan2(e[0] - p[0], e[2] - p[2]) + Math.PI / 2);
    fluke(B, 0.7, T(C.paper));
    B.pop();
  }
  if (head) {
    B.push(0, 1.2, 0.86, 0);
    B.rot([1, 0, 0], 0.35);
    sharkHead(B, 1.05, 0.2, rich);
    B.pop();
    B.pop();
  }
}

function dais(B, r, tiers, rand) {
  let y = 0;
  tiers.forEach(([k, h, pal], i) => {
    B.prism(circle(0, 0, r * k, r * k, 10, Math.PI / 10), y, y + h, T(pal));
    if (i === 0) for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2 + Math.PI / 10;
      B.box(0.22, h * 0.7, 0.08, T(C.crack), Math.sin(a) * r * k * 0.99, y + h * 0.15, Math.cos(a) * r * k * 0.99);
    }
    y += h;
  });
  return y;
}

function mergeMesh(B) {
  const m = new THREE.Mesh(B.geometry(), bakedMaterial());
  m.frustumCulled = false;
  return m;
}

const headMesh = (light, fn) => { const B = new Baker(light); fn(B); return mergeMesh(B); };

function groundY(L, x, z) {
  const c = L.cells[Math.floor(z)]?.[Math.floor(x)];
  return c && c.s !== "none" ? c.h * TILE : 0;
}

function focalA(L, light, rand) {
  const B = new Baker(light);
  const top = 3 * TILE + 0.12, base = 1 * TILE - 0.2;
  const xs = [15.0, 16.2, 17.4, 18.6, 19.8, 21.0, 22.2, 23.4, 24.6];
  xs.forEach((x, i) => {
    const u = i / (xs.length - 1), w = 3.3 + u * 1.0 + Math.sin(u * Math.PI) * 0.3;
    B.rbox(1.4, top - base, w, 0.45, T(i % 2 ? C.fur : C.furDeep), x + 0.6, base, 10.5);
    const roll = u > 0.6 ? 0.55 + (u - 0.6) * 2.2 : 0.35;
    for (const sz of [-1, 1]) {
      B.rbox(1.3, roll + 0.3, 0.75, 0.3, T(C.fur), x + 0.6, top - 0.3, 10.5 + sz * (w / 2 - 0.3));
      B.rbox(1.1, 0.5, 0.5, 0.2, T(C.furDeep), x + 0.6, base + 0.9, 10.5 + sz * (w / 2 + 0.05));
    }
  });
  B.rbox(9.3, 0.03, 1.4, 0.3, T(C.hatch), 20.0, top - 0.01, 10.5);
  B.rbox(9.0, 0.035, 1.0, 0.3, T(C.furDeep), 20.0, top - 0.005, 10.5);
  for (let i = 0; i < 420; i++) {
    const x = 15.2 + rand() * 10, sz = rand() < 0.5 ? -1 : 1, u = (x - 15) / 10, w = 3.3 + u * 1.0, onTop = rand() < 0.45;
    const z = onTop ? 10.5 + sz * (0.75 + rand() * (w / 2 - 0.7)) : 10.5 + sz * (w / 2 + 0.25);
    const y = onTop ? top + 0.15 : base + 0.3 + rand() * (top - base - 0.3);
    tuft(B, x, y, z, 0.3 + rand() * 0.4, 0.05 + rand() * 0.05, T(rand() < 0.6 ? C.hatch : C.furDeep), sz > 0 ? 0 : Math.PI, onTop ? 0.7 + rand() * 0.4 : 1.2 + rand() * 0.3);
  }
  blade(B, [[0, -0.9], [1.8, -0.4], [3.6, -1.4], [3.9, -1.6], [2.4, 0.3], [0.5, 0.9]], 0.12, T(C.paper), 19.5, top - 0.1, 9.0, Math.PI / 2);
  for (const [sx, sz, px, pz] of [[22.6, 9.0, 23.5, 7.5], [22.6, 12.0, 23.5, 13.5]]) {
    const sh = [sx, top - 0.4, sz], el = [(sx + px) / 2 + 0.3, top - 0.6, (sz + pz) / 2], pw = [px, groundY(L, px, pz) + 0.05, pz];
    B.ball(0.75, T(C.fur), ...sh, 1, 1);
    tube(B, sh, el, 0.62, 0.52, T(C.fur), 8);
    tube(B, el, pw, 0.52, 0.48, T(C.furDeep), 8);
    B.rbox(1.0, 0.4, 0.95, 0.15, T(C.furDeep), pw[0], pw[1], pw[2]);
    for (const dz of [-0.28, 0, 0.28]) B.ball(0.15, T(C.hatch), pw[0] + 0.45, pw[1] + 0.1, pw[2] + dz, 0.8, 0);
    for (let i = 0; i < 18; i++) tuft(B, el[0] + (rand() - 0.5) * 0.6, el[1] - rand() * 1.4, el[2] + (rand() - 0.5) * 0.9, 0.3, 0.05, T(C.hatch), rand() * 6.28, 1.0);
  }
  for (const [hx, hz, fx, fz] of [[15.6, 9.0, 15.5, 8.5], [16.4, 12.0, 17.5, 13.5]]) {
    const hp = [hx, top - 0.6, hz], ft = [fx, groundY(L, fx, fz) + 0.05, fz];
    B.ball(0.85, T(C.fur), ...hp, 0.9, 1);
    tube(B, hp, ft, 0.6, 0.45, T(C.furDeep), 8);
    B.rbox(0.9, 0.3, 1.0, 0.15, T(C.furDeep), ft[0], ft[1], ft[2]);
  }
  const tp = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    if (u < 0.35) { const k = u / 0.35; tp.push([15.0 - k * 2.1, 3 * TILE - k * 2 * TILE - 0.1, 10.5]); }
    else { const k = (u - 0.35) / 0.65, a = k * Math.PI * 1.1; tp.push([12.9 - Math.sin(a) * 2.2, 1.0 - k * 1.2 + Math.sin(k * Math.PI) * 0.8, 10.5 + (1 - Math.cos(a)) * 2.2]); }
  }
  for (let i = 0; i < tp.length - 1; i++) {
    const r0 = 1.25 * (1 - i / 15) + 0.12, r1 = 1.25 * (1 - (i + 1) / 15) + 0.12;
    const a = [...tp[i]], b = [...tp[i + 1]];
    if (i < 5) { a[1] -= r0; b[1] -= r1; }
    tube(B, a, b, r0, r1, T(i < 6 ? C.furDeep : C.paper), 9);
  }
  const e = tp[tp.length - 1], p = tp[tp.length - 2];
  B.push(e[0], e[1], e[2], Math.atan2(e[0] - p[0], e[2] - p[2]) + Math.PI / 2);
  fluke(B, 2.4, T(C.paper));
  B.pop();
  const statics = [mergeMesh(B)];
  const hy = groundY(L, 26, 10) + 0.1;
  const head = headMesh(light, (H) => { H.push(0, 0, 0, Math.PI / 2, 4.2); sharkHead(H, 1, 0.34, true, false); H.pop(); });
  head.position.set(25.7, hy, 10.5);
  const live = [{ mesh: head, track: { base: 0, limit: 0.6, radius: 9, rate: 2.5 } }];
  return { statics, live };
}

function focalB(L, light, rand) {
  const B = new Baker(light);
  const g = (x, z) => groundY(L, x, z);
  const crack = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 0.3);
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n, x = ax + (bx - ax) * u + (rand() - 0.5) * 0.08, z = az + (bz - az) * u + (rand() - 0.5) * 0.08;
        const c = L.cells[Math.floor(z)]?.[Math.floor(x)];
        if (!c || c.s === "none" || c.s === "ramp" || c.s === "water") continue;
        B.at(x, c.h * TILE + 0.015, z, Math.atan2(bx - ax, bz - az) + (rand() - 0.5) * 0.5, () => B.box(0.1, 0.02, 0.24, T(C.crack)));
      }
    }
  };
  crack([[18, 12], [19.2, 13.6], [20.1, 15.4]]);
  crack([[21.7, 16.3], [23.5, 16.4], [25.5, 15.6]]);
  crack([[18, 12], [16.3, 14.8], [16.3, 16.5]]);
  crack([[18.7, 16.5], [20.1, 15.4]]);
  crack([[16.3, 16.5], [14.6, 16.5]]);
  crack([[18, 12], [20.4, 10.7], [22.4, 9.5]]);
  crack([[24.9, 15.6], [26.4, 12.6]]);
  const hy = g(17.5, 11.5);
  B.push(18, hy, 12, -0.6);
  B.rbox(2.2, 0.5, 2.2, 0.4, T(C.stoneDeep), 0, -0.1, 0);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; B.box(0.3 + rand() * 0.3, 0.25, 0.25, T(C.sand), Math.sin(a) * 1.15, 0.05, Math.cos(a) * 1.15); }
  B.rbox(1.5, 1.4, 1.2, 0.3, T(C.fur), 0, 0.0, -0.1);
  furHatch(B, rand, 0, 0.2, -0.1, 1.5, 1.1, 1.1, 30);
  for (const sx of [-1, 1]) {
    tube(B, [sx * 0.75, 1.1, 0.1], [sx * 1.15, 0.5, 0.75], 0.32, 0.28, T(C.fur));
    tube(B, [sx * 1.15, 0.5, 0.75], [sx * 1.1, 0.0, 1.05], 0.28, 0.25, T(C.furDeep));
    B.rbox(0.5, 0.2, 0.5, 0.08, T(C.furDeep), sx * 1.1, 0, 1.1);
  }
  B.pop();
  const head = headMesh(light, (H) => { H.push(0, 0, 0, 0, 1.6); H.rot([1, 0, 0], -0.35); sharkHead(H, 1, 0.32, true); H.pop(); H.pop(); });
  head.position.set(18, hy + 1.45, 12.1);
  const coil = (x0, z0, x1, z1, hgt, r) => {
    const pts = [];
    const y0 = g(x0, z0);
    for (let i = 0; i <= 10; i++) { const u = i / 10; const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; pts.push([x, y0 - 0.2 + Math.sin(u * Math.PI) * hgt, z]); }
    for (let i = 0; i < 10; i++) tube(B, pts[i], pts[i + 1], r, r, T(i % 2 ? C.fur : C.furDeep), 8);
    for (let i = 2; i < 9; i++) { const [x, y, z] = pts[i]; for (let k = 0; k < 4; k++) tuft(B, x + (rand() - 0.5) * 0.3, y + r * 0.8, z + (rand() - 0.5) * 0.3, 0.22, 0.04, T(C.hatch), rand() * 6.28, 0.6); }
    for (const [x, y, z] of [pts[0], pts[10]]) for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; B.box(0.2, 0.18, 0.2, T(C.sand), x + Math.sin(a) * (r + 0.2), y0, z + Math.cos(a) * (r + 0.2)); }
  };
  coil(16.3, 16.5, 18.7, 16.5, 2.3, 0.42);
  coil(20.1, 15.4, 21.7, 16.3, 1.6, 0.34);
  const fy = g(26.5, 12.5);
  blade(B, [[0, -0.9], [1.4, -0.4], [2.8, -1.1], [3.0, -1.25], [1.6, 0.4], [0, 0.8]], 0.1, T(C.paper), 26.5, fy - 0.1, 12.5, 0.4);
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; B.box(0.22, 0.16, 0.22, T(C.sand), 26.5 + Math.sin(a) * 0.9, fy, 12.5 + Math.cos(a) * 0.6); }
  B.push(25.5, g(25.5, 15.5) - 0.2, 15.5, -0.5);
  for (let i = 0; i < 5; i++) tube(B, [0, i * 0.5, -0.2 + i * 0.05], [0, (i + 1) * 0.5, -0.2 + (i + 1) * 0.08], 0.42 - i * 0.06, 0.36 - i * 0.06, T(i < 2 ? C.fur : C.paper), 8);
  B.push(0, 2.6, 0.2, Math.PI / 2);
  B.rot([0, 0, 1], -Math.PI / 2);
  fluke(B, 1.4, T(C.paper));
  B.pop();
  B.pop();
  B.pop();
  for (const [px, pz, yaw] of [[14.5, 16.5, 2.6], [22.5, 9.5, -0.6]]) {
    const y = g(px, pz);
    B.push(px, y, pz, yaw);
    tube(B, [0, -0.3, -0.6], [0, 0.9, -0.1], 0.36, 0.3, T(C.fur), 8);
    tube(B, [0, 0.9, -0.1], [0, 0.15, 0.35], 0.3, 0.27, T(C.furDeep), 8);
    B.rbox(0.62, 0.3, 0.6, 0.1, T(C.furDeep), 0, 0, 0.4);
    for (const dx of [-0.18, 0, 0.18]) B.ball(0.09, T(C.hatch), dx, 0.08, 0.72, 0.8, 0);
    for (let k = 0; k < 10; k++) tuft(B, (rand() - 0.5) * 0.4, 0.2 + rand() * 0.8, -0.3 + rand() * 0.4, 0.2, 0.04, T(C.hatch), rand() * 6.28, 1.1);
    B.pop();
  }
  return { statics: [mergeMesh(B)], live: [{ mesh: head, track: { base: -0.6, limit: 1.3, radius: 6, rate: 3 } }] };
}

function focalC(L, light, rand) {
  const B = new Baker(light);
  const gy = groundY(L, 18.5, 12.5);
  B.push(18.5, gy, 12.5, 0);
  const top = dais(B, 1.62, [[1, 0.22, C.stoneDeep], [0.82, 0.2, C.stone], [0.62, 0.16, C.skull]], rand);
  B.push(0, top, 0, 0.55, 1.3);
  beast(B, rand, { rich: true, head: false, tail: false });
  B.pop();
  const tp = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, a = -2.6 + u * 4.6;
    const r = 1.35 + Math.sin(u * Math.PI) * 0.15;
    tp.push([Math.sin(a) * r, top + 0.2 + Math.sin(u * Math.PI * 1.5) * 0.35 + (u > 0.85 ? (u - 0.85) * 6 : 0), Math.cos(a) * r]);
  }
  for (let i = 0; i < tp.length - 1; i++) {
    const r0 = 0.3 * (1 - i / 19) + 0.05, r1 = 0.3 * (1 - (i + 1) / 19) + 0.05;
    tube(B, tp[i], tp[i + 1], r0, r1, T(i < 4 ? C.fur : C.paper), 8);
    B.at(tp[i][0], tp[i][1] + r0 * 0.7, tp[i][2], 0, () => B.box(0.04, 0.03, 0.04, T(C.ink)));
  }
  const e = tp[tp.length - 1], p = tp[tp.length - 2];
  B.push(e[0], e[1], e[2], Math.atan2(e[0] - p[0], e[2] - p[2]) + Math.PI / 2);
  fluke(B, 0.95, T(C.paper));
  B.pop();
  B.pop();
  const sat = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = [8, 12, 14][ring], rad = [2.6, 3.9, 5.4][ring], sz = [1.5, 1.1, 0.8][ring];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + ring * 0.37 + rand() * 0.2, r = rad + (rand() - 0.5) * 0.6;
      const x = 18.5 + Math.sin(a) * r, z = 12.5 + Math.cos(a) * r;
      const c = L.cells[Math.floor(z)]?.[Math.floor(x)];
      if (!c || c.s === "none" || c.s === "water" || c.s === "ramp") continue;
      sat.push([x, c.h * TILE, z, a, sz, i % 3]);
    }
  }
  for (const [x, y, z, a, s, k] of sat) {
    B.push(x, y, z, a + rand());
    if (k === 0) { B.rot([1, 0, 0], 0.25); B.cone(0.16 * s, 0, 0.75 * s, T(C.tooth), 0, 0, 0, 3); B.pop(); B.ball(0.12 * s, T(C.stoneDeep), 0.1, 0, 0.05, 0.5, 0); }
    else if (k === 1) { for (let j = 0; j < 7; j++) tuft(B, (rand() - 0.5) * 0.35 * s, 0, (rand() - 0.5) * 0.35 * s, (0.35 + rand() * 0.25) * s, 0.05 * s, T(j % 2 ? C.hatch : C.furDeep), rand() * 6.28, 0.3 + rand() * 0.4); }
    else { blade(B, [[0, -0.25 * s], [0.6 * s, -0.05 * s], [1.0 * s, -0.4 * s], [0.4 * s, 0.25 * s], [0, 0.25 * s]], 0.04, T(C.paper), 0, -0.05, 0); }
    B.pop();
  }
  const head = headMesh(light, (H) => { H.push(0, 0, 0, 0, 1.3); H.rot([1, 0, 0], 0.35); sharkHead(H, 1.05, 0.22, true); H.pop(); H.pop(); });
  const k = 1.3, yaw = 0.55;
  head.position.set(18.5 + Math.sin(yaw) * 0.86 * k, gy + top + 1.2 * k, 12.5 + Math.cos(yaw) * 0.86 * k);
  return { statics: [mergeMesh(B)], live: [{ mesh: head, track: { base: yaw, limit: 1.2, radius: 6.5, rate: 3 } }] };
}

function cub(light, rand, s = 0.42) {
  const body = headMesh(light, (B) => { B.push(0, 0, 0, 0, s); beast(B, rand, { rich: true, head: false, tail: true, tailSweep: 0.7 }); B.pop(); });
  const head = headMesh(light, (B) => { B.push(0, 0, 0, 0, s); B.rot([1, 0, 0], 0.25); sharkHead(B, 1.05, 0.15, false); B.pop(); B.pop(); });
  const g = new THREE.Group();
  head.position.set(0, 1.2 * s, 0.86 * s);
  g.add(body, head);
  return { g, body, head };
}

function burrowHead(light, rand) {
  const B = new Baker(light);
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; B.box(0.16, 0.12, 0.16, T(C.sand), Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42); }
  B.cyl(0.36, 0.08, T(C.crack), 0, 0, 0, 10);
  const base = mergeMesh(B);
  const head = headMesh(light, (H) => { H.push(0, -0.15, 0, 0, 0.62); H.rbox(1.0, 0.55, 0.95, 0.2, T(C.furDeep), 0, -0.35, -0.1); furHatch(H, rand, 0, -0.35, -0.1, 1.0, 0.5, 0.9, 14); H.rot([1, 0, 0], -0.25); sharkHead(H, 1, 0.24, false); H.pop(); H.pop(); });
  const g = new THREE.Group();
  g.add(base, head);
  return { g, head };
}

const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function followA(L, light, rand) {
  const spots = [[25, 16], [20, 17], [16, 15], [23, 11], [19, 9], [14, 11], [26, 9], [21, 6]];
  const live = [];
  const group = new THREE.Group();
  for (const [x, z] of spots) {
    const c = L.cells[z]?.[x];
    if (!c || c.s === "none") continue;
    const b = burrowHead(light, rand);
    b.g.position.set(x + 0.5, c.h * TILE + 0.02, z + 0.5);
    const base = rand() * 6.28;
    b.head.rotation.y = base;
    group.add(b.g);
    live.push({ mesh: b.head, origin: [x + 0.5, z + 0.5], track: { base, limit: Math.PI, radius: 6.5, rate: 5, rise: 0.12 } });
  }
  return { statics: [group], live, blocks: spots };
}

function followB(L, light, rand) {
  const c = cub(light, rand, 0.5);
  const trail = [];
  let pos = null, yaw = 0, sit = 0, phase = 0;
  const step = (S, dt) => {
    const a = S.actor, hy = a.y * TILE;
    const hp = new THREE.Vector3(a.pos.x, hy, a.pos.z);
    if (!pos) { pos = hp.clone(); for (let i = 0; i < 40; i++) trail.push(pos.clone()); }
    const last = trail[trail.length - 1];
    if (last.distanceTo(hp) > 0.12) trail.push(hp.clone());
    while (trail.length > 60) trail.shift();
    let tgt = trail[0];
    let acc = 0;
    for (let i = trail.length - 1; i > 0; i--) { acc += trail[i].distanceTo(trail[i - 1]); if (acc > 1.5) { tgt = trail[i - 1]; break; } }
    const d = new THREE.Vector3(tgt.x - pos.x, 0, tgt.z - pos.z), dist = d.length();
    const moving = dist > 0.08;
    if (moving) { const sp = Math.min(dist, dt * (2.6 + dist * 2.2)); pos.addScaledVector(d.normalize(), sp); yaw += angle(Math.atan2(d.x, d.z) - yaw) * Math.min(1, dt * 8); phase += dt * 11; }
    const sy = surface(L, pos.x, pos.z);
    pos.y += ((sy > 0 ? sy : hy) - pos.y) * Math.min(1, dt * 12);
    sit += ((moving ? 0 : 1) - sit) * Math.min(1, dt * 4);
    c.g.position.set(pos.x, pos.y + Math.abs(Math.sin(phase)) * 0.06 * (1 - sit), pos.z);
    c.g.rotation.y = yaw;
    c.body.rotation.x = -0.28 * sit;
    c.body.position.y = -0.04 * sit;
    const look = angle(Math.atan2(hp.x - pos.x, hp.z - pos.z) - yaw);
    c.head.rotation.y = Math.max(-1.2, Math.min(1.2, look)) * (0.35 + 0.65 * sit);
    c.head.rotation.x = -0.25 * sit;
  };
  return { statics: [c.g], live: [{ step }] };
}

function surface(L, x, z) {
  const c = L.cells[Math.floor(z)]?.[Math.floor(x)];
  if (!c || c.s === "none") return 0;
  if (c.s === "ramp") {
    const fx = x - Math.floor(x), fz = z - Math.floor(z);
    const t = { e: 1 - fx, w: fx, n: fz, s: 1 - fz }[c.d] ?? 0;
    return (c.h - 1 + t) * TILE;
  }
  return c.h * TILE;
}

function followC(L, light, rand) {
  const spots = [[24, 17], [23, 16], [23, 15], [22, 14], [20, 14], [19, 13], [16, 12], [16, 10], [17, 9]];
  const group = new THREE.Group();
  const live = [];
  spots.forEach(([x, z], i) => {
    const c = L.cells[z]?.[x];
    if (!c || c.s === "none") return;
    const ox = (i % 2 ? 0.75 : 0.25), oz = (i % 2 ? 0.25 : 0.75);
    const finB = new Baker(light);
    blade(finB, [[0, -0.45], [0.8, -0.18], [1.5, -0.6], [1.6, -0.68], [0.8, 0.22], [0, 0.42]], 0.06, T(C.furDeep), 0, -0.02, 0);
    blade(finB, [[0.75, 0.2], [1.5, -0.6], [1.6, -0.68], [0.9, 0.3]], 0.065, T(C.paper), 0, -0.02, 0);
    for (let k = 0; k < 4; k++) finB.box(0.025, 0.5 - k * 0.1, 0.02, T(C.hatch), 0.07, 0.15, -0.3 + k * 0.13);
    const fin = mergeMesh(finB);
    const ringB = new Baker(light);
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; ringB.box(0.12, 0.08, 0.12, T(C.sand), Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32); }
    const ring = mergeMesh(ringB);
    const g = new THREE.Group();
    g.position.set(x + ox, c.h * TILE + 0.01, z + oz);
    g.add(fin, ring);
    fin.scale.set(1, 0.001, 1);
    ring.scale.setScalar(0.001);
    group.add(g);
    let up = 0, seen = false;
    live.push({ step: (S, dt) => {
      const a = S.actor, dx = a.pos.x - g.position.x, dz = a.pos.z - g.position.z, d = Math.hypot(dx, dz);
      if (d < 2.6) seen = true;
      const want = seen && d < 3.4 ? 1 : 0;
      up += (want - up) * Math.min(1, dt * (want ? 5 : 2));
      fin.scale.y = Math.max(0.001, up);
      fin.position.y = -0.6 * (1 - up);
      ring.scale.setScalar(Math.max(0.001, Math.sin(Math.min(1, up) * Math.PI) + up * 0.6));
      fin.rotation.y += angle(Math.atan2(dx, dz) + Math.PI / 2 - fin.rotation.y) * Math.min(1, dt * 4);
      if (d > 3.4) seen = false;
    } });
  });
  return { statics: [group], live };
}

const BUILD = { "concept-focal-a": focalA, "concept-focal-b": focalB, "concept-focal-c": focalC };
const FOLLOW = { a: followA, b: followB, c: followC };

function countTris(root) {
  let tris = 0, calls = 0;
  root.traverse((o) => { if (o.isMesh) { calls++; tris += o.geometry.attributes.position.count / 3; } });
  return { tris: Math.round(tris), calls };
}

function attach(style) {
  const q = new URLSearchParams(location.search);
  const want = q.get("level");
  const tries = { n: 0 };
  const done = new WeakSet();
  const poll = () => {
    const G = window.__game, S = G?.state;
    if (!S?.level || S.level.name !== want || !G.renderer?.three?.scene || !S.actor) { if (tries.n++ < 600) setTimeout(poll, 30); return; }
    if (done.has(S)) return;
    done.add(S);
    const rand = rng(7);
    const fn = BUILD[want] || FOLLOW[q.get("follow")];
    if (!fn) { window.__concept = { ready: true, tris: 0, calls: 0, tickMs: 0, none: true }; return; }
    const out = fn(S.level, style.light, rand);
    const root = new THREE.Group();
    root.name = "concept";
    for (const m of out.statics) root.add(m);
    for (const l of out.live) if (l.mesh && !l.mesh.parent) root.add(l.mesh);
    G.renderer.three.scene.add(root);
    const stat = { ready: true, ...countTris(root), tickMs: 0, ticks: 0 };
    window.__concept = stat;
    const trackers = out.live.filter((l) => l.track).map((l) => {
      const m = l.mesh, base = l.track.base;
      const o = l.origin || null;
      let cur = 0, lift = 0;
      return (S, dt) => {
        const a = S.actor;
        const wp = new THREE.Vector3();
        m.getWorldPosition(wp);
        const px = o ? o[0] : wp.x, pz = o ? o[1] : wp.z;
        const dx = a.pos.x - px, dz = a.pos.z - pz, d = Math.hypot(dx, dz);
        const inside = d < l.track.radius;
        const target = inside ? Math.max(-l.track.limit, Math.min(l.track.limit, angle(Math.atan2(dx, dz) - base))) : Math.sin(S.time * 0.4 + px) * 0.15;
        cur += (target - cur) * Math.min(1, dt * l.track.rate);
        m.rotation.y = base + cur;
        if (l.track.rise != null) { lift += ((inside ? 1 : 0) - lift) * Math.min(1, dt * 4); m.position.y = -0.25 + lift * (0.25 + l.track.rise); }
      };
    });
    const steps = out.live.filter((l) => l.step).map((l) => l.step);
    G.onTick((dt) => {
      if (G.state !== S) return;
      const t0 = performance.now();
      for (const f of trackers) f(S, dt);
      for (const f of steps) f(S, dt);
      stat.tickMs += performance.now() - t0;
      stat.ticks++;
    });
  };
  setTimeout(poll, 0);
}

export function register(style) {
  attach(style);
  return {
    catalog: { "cf-block": { footprint: [1, 1], passable: false, variants: 1, height: 0.4 } },
    builders: { "cf-block": () => null },
  };
}
