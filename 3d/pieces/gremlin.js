import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-b.js";

const SKINS = {
  artisan: {
    body: ["#f3eee4", "#ded7ca", "#b5ac9d"],
    shade: ["#d6ccb9", "#bdb29e", "#968b78"],
    ink: ["#3b2f2a", "#2c231f", "#1e1714"],
    orb: ["#d8fbff", "#8be9fd", "#3dc2ec"],
    band: ["#fae075", "#f5c83b", "#dc9407"],
    fin: ["#ff8e32", "#e0771e", "#b85410"],
  },
  warden: {
    body: ["#dfe8f0", "#c5d3e0", "#a9b9c9"],
    shade: ["#a9b9c9", "#8898a8", "#728191"],
    ink: ["#343d48", "#29303a", "#1d232b"],
    orb: ["#fff3b8", "#f7d25a", "#d4af42"],
    band: ["#5a6676", "#434d5a", "#343d48"],
    fin: ["#6ed7ed", "#2daecb", "#1f8ea8"],
  },
  stalker: {
    body: ["#ece6dc", "#d4c8b6", "#b3a38c"],
    shade: ["#c7b6a7", "#aba093", "#857b70"],
    ink: ["#45241e", "#361c17", "#27120e"],
    orb: ["#ffe08a", "#ffc23a", "#e0901a"],
    band: ["#784b42", "#59332c", "#45241e"],
    fin: ["#e06c19", "#c0560f", "#98400a"],
  },
};
SKINS.ink = {
  body: ["#f7f6f1", "#e2e0d8", "#bdbab0"],
  shade: ["#cfcdc5", "#aeaca4", "#8a8880"],
  ink: ["#2b2b31", "#1f1f24", "#141418"],
  orb: ["#ffffff", "#f2f6fb", "#d7e2ee"],
  band: ["#44444c", "#34343b", "#26262c"],
  fin: ["#4d86e8", "#346cd0", "#2552a6"],
};
const WOOD = ["#cf7834", "#b05e22", "#8c4414"];
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

function seg(B, a, b, w, d, c) {
  const A = V(...a), dir = V(...b).sub(A), len = dir.length();
  const m = new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), V(1, 1, 1));
  B.pushMatrix(m);
  B.box(w, len, d, pal(c), 0, 0, 0);
  B.pop();
}

function tilt(B, x, y, z, rx, ry, rz, fn) {
  const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(1, 1, 1));
  B.pushMatrix(m);
  fn();
  B.pop();
}

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function foot(B, K, x, y, z, yaw) {
  B.at(x, y, z, yaw, () => {
    B.prism([[-0.26, 0.4], [-0.09, 0.46], [0.09, 0.46], [0.26, 0.4], [0.13, -0.08], [-0.13, -0.08]], 0, 0.08, pal(K.ink));
    for (const t of [-0.19, 0, 0.19]) B.box(0.08, 0.07, 0.14, pal(K.shade), t, 0.08, 0.38);
    B.box(0.24, 0.14, 0.24, pal(K.shade), 0, 0.06, 0.04);
  });
}

function hand(B, K, x, y, z) {
  B.box(0.22, 0.1, 0.22, pal(K.ink), x, y, z);
  for (const t of [-0.07, 0, 0.07]) B.box(0.06, 0.06, 0.12, pal(K.ink), x + t, y, z + 0.14);
}

function tail(B, K) {
  const cy = 1.42, cz = -0.46, r = 0.86, n = 12;
  const pt = (a) => [0, cy + r * Math.sin(a), cz + r * Math.cos(a)];
  const a0 = -Math.PI * 0.62, a1 = -Math.PI * 1.66;
  let prev = [0, 0.72, -0.4];
  for (let i = 1; i <= n; i++) {
    const t = i / n, p = pt(a0 + (a1 - a0) * t), w = 0.26 - t * 0.12;
    seg(B, prev, p, w, w, i % 2 ? K.body : K.shade);
    if (i % 3 === 0) B.at(p[0], p[1] - 0.05, p[2], 0, () => B.box(w + 0.08, 0.1, w + 0.08, pal(K.band)));
    if (i === 5 || i === 7 || i === 9) B.at(p[0], p[1], p[2], 0, () => B.cone(0.09, 0, 0.26, pal(K.fin), 0, w * 0.45, 0, 4));
    prev = p;
  }
  const e = prev, j = [0.3, e[1] - 0.02, e[2] + 0.36], lens = [0.46, e[1] - 0.32, e[2] + 0.56];
  seg(B, e, j, 0.14, 0.14, K.ink);
  seg(B, j, lens, 0.12, 0.12, K.shade);
  B.box(0.2, 0.1, 0.2, pal(K.band), j[0], j[1] - 0.05, j[2]);
  B.cone(0.16, 0.07, 0.2, pal(K.ink), lens[0], lens[1] - 0.18, lens[2], 6);
  B.box(0.1, 0.05, 0.1, pal(K.orb), lens[0], lens[1] - 0.23, lens[2]);
}

const YAW = { medium: 0.2, subject: 0.5, composition: -0.5 };
function gremlin(B, K, H, look, v, lens) {
  const s = H / 2.3;
  B.push(0, 0, 0, YAW[lens] ?? 0.2, s);
  plinth(B, 0.9, 0.2, look.plinthLo, look.plinthHi);
  const y0 = 0.2;
  foot(B, K, -0.4, y0, 0.02, -0.25);
  foot(B, K, 0.4, y0, 0.06, 0.3);
  for (const sx of [-1, 1]) {
    const hip = [sx * 0.26, y0 + 0.42, -0.2], knee = [sx * 0.44, y0 + 0.74, 0.24], ank = [sx * 0.4, y0 + 0.14, 0.08];
    seg(B, hip, knee, 0.28, 0.3, K.body);
    seg(B, knee, ank, 0.22, 0.22, K.shade);
    B.box(0.28, 0.12, 0.28, pal(K.ink), knee[0], knee[1] - 0.08, knee[2]);
  }
  B.rbox(0.66, 0.36, 0.54, 0.1, pal(K.shade), 0, y0 + 0.3, -0.24);
  for (const z of [-0.42, -0.28, -0.14]) B.box(0.68, 0.07, 0.07, pal(K.ink), 0, y0 + 0.58, z);
  tilt(B, 0, y0 + 0.6, -0.2, 0.42, 0, 0, () => {
    B.rbox(0.52, 0.6, 0.4, 0.1, pal(K.body), 0, 0, 0);
    wedge(B, 0.44, 0.34, 0.16, K.shade, 0, 0.1, 0.26);
    B.rbox(0.64, 0.18, 0.44, 0.08, pal(K.body), 0, 0.58, 0);
    B.box(0.2, 0.2, 0.18, pal(K.ink), 0, 0.72, 0.06);
  });
  B.box(0.2, 0.24, 0.2, pal(K.ink), 0, y0 + 1.1, 0.12);
  tilt(B, 0, y0 + 1.26, 0.2, 0.42, 0.42 + (v % 2) * 0.08, 0, () => {
    B.rbox(0.58, 0.56, 0.66, 0.16, pal(K.body), 0, 0.02, 0.04);
    B.rbox(0.5, 0.18, 0.58, 0.14, pal(K.body), 0, 0.58, 0.02);
    B.rbox(0.32, 0.1, 0.38, 0.1, pal(K.body), 0, 0.76, 0.0);
    B.box(0.12, 0.34, 0.06, pal(K.ink), 0, 0.02, 0.37);
    B.box(0.5, 0.07, 0.05, pal(K.shade), 0, 0.46, 0.36);
    for (const x of [-0.3, 0.3]) B.box(0.05, 0.3, 0.36, pal(K.shade), x, 0.1, 0.06);
  });
  const rs = [0.32, y0 + 0.98, 0.04], re = [0.56, y0 + 0.6, 0.3], rh = [0.5, y0 + 0.82, 0.62];
  seg(B, rs, re, 0.17, 0.17, K.body);
  seg(B, re, rh, 0.15, 0.15, K.shade);
  const orb = [0.52, y0 + 1.04, 0.68];
  B.box(0.24, 0.08, 0.24, pal(K.ink), orb[0], orb[1] - 0.25, orb[2]);
  for (const [dx, dz] of [[-0.12, 0], [0.12, 0], [0, 0.12]]) B.box(0.06, 0.2, 0.06, pal(K.ink), orb[0] + dx, orb[1] - 0.2, orb[2] + dz);
  B.ball(0.2, pal(K.orb), orb[0], orb[1], orb[2], 1, 1);
  for (const [dx, dy, dz] of [[0.3, 0.04, 0], [-0.28, 0.08, 0.04], [0.02, 0.3, 0.04], [0.06, -0.02, 0.28]]) B.box(0.06, 0.06, 0.06, pal(K.orb), orb[0] + dx, orb[1] + dy, orb[2] + dz);
  const ls = [-0.3, y0 + 0.98, 0.0], le = [-0.46, y0 + 0.5, 0.24], lh = [-0.3, y0 + 0.08, 0.5];
  seg(B, ls, le, 0.17, 0.17, K.body);
  seg(B, le, lh, 0.15, 0.15, K.shade);
  hand(B, K, lh[0], y0, lh[2]);
  tail(B, K);
  B.pop();
}

function post(B, t, H, c0, c1, c2, d, K) {
  const tall = H * 0.66;
  B.box(0.48, 0.2, 0.48, pal(c2));
  B.box(0.36, tall * 0.5, 0.36, pal(c0), 0, 0.2, 0);
  B.box(0.3, tall * 0.5, 0.3, pal(c1), 0, 0.2 + tall * 0.5, 0);
  for (const f of [0.3, 0.55, 0.8]) B.box(0.4 - f * 0.08, 0.07, 0.4 - f * 0.08, pal(K.band), 0, 0.2 + tall * f, 0);
  const top = 0.2 + tall;
  B.box(0.4, 0.12, 0.4, pal(c2), 0, top, 0);
  if (/rib/i.test(t) && /pylon|spire/i.test(t)) {
    const lean = d.side ? -d.side * 0.35 : 0.3;
    const rz = d.axis === "x" ? 0 : lean, rx = d.axis === "x" ? -lean : 0;
    tilt(B, 0, top + 0.12, 0, rx, 0, rz, () => {
      B.box(0.26, 0.34, 0.26, pal(c0), 0, 0, 0);
      B.box(0.3, 0.06, 0.3, pal(K.band), 0, 0.3, 0);
      tilt(B, 0, 0.34, 0, rx, 0, rz, () => {
        B.box(0.2, 0.3, 0.2, pal(c1), 0, 0, 0);
        for (const a of [-0.45, 0.45]) tilt(B, 0, 0.28, 0, 0, 0, a, () => B.cone(0.07, 0, 0.26, pal(K.ink), 0, 0, 0, 4));
        B.cone(0.08, 0, 0.3, pal(K.fin), 0, 0.28, 0, 4);
      });
    });
    return;
  }
  if (/stele|flute/i.test(t)) {
    for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) B.box(0.05, tall * 0.9, 0.05, pal(K.shade), x, 0.24, z);
    wedge(B, 0.44, 0.22, 0.3, c0, 0, top + 0.12, 0);
    B.box(0.14, 0.14, 0.14, pal(K.orb), 0, top + 0.16, 0.12);
  } else {
    B.at(0, top + 0.12, 0, 0, () => {
      for (const [a, h] of [[-0.5, 0.34], [0, 0.46], [0.5, 0.34]]) tilt(B, 0, 0, 0, 0, 0, a, () => B.cone(0.08, 0, h, pal(K.fin), 0, 0, 0, 4));
    });
  }
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.72, 0.14, c0);
    beam(H * 0.72 + 0.14, 0.08, K.band);
  }
}

function siphon(B, H, c0, c1, K, v) {
  B.box(0.34, 0.16, 0.34, pal(K.shade));
  const n = 4, hh = (H - 0.56) / n;
  let x = 0;
  for (let i = 0; i < n; i++) {
    const nx = (i % 2 ? -1 : 1) * (v % 2 ? 0.06 : 0.08);
    seg(B, [x, 0.16 + i * hh, 0], [nx, 0.16 + (i + 1) * hh, 0.02], 0.16 - i * 0.015, 0.16 - i * 0.015, i % 2 ? c1 : c0);
    B.box(0.2, 0.05, 0.2, pal(K.band), nx, 0.14 + (i + 1) * hh, 0.02);
    x = nx;
  }
  const y = 0.16 + n * hh;
  B.cone(0.1, 0.24, 0.3, pal(c0), x, y, 0.02, 6);
  B.cyl(0.2, 0.04, pal(K.ink), x, y + 0.27, 0.02, 6);
  for (const a of [0, 2.1, 4.2]) B.box(0.05, 0.14, 0.05, pal(K.fin), x + Math.cos(a) * 0.2, y + 0.26, 0.02 + Math.sin(a) * 0.2);
}

function lamp(B, H, c0, c1, K, v) {
  B.box(0.3, 0.14, 0.3, pal(c0));
  B.box(0.16, H * 0.5, 0.16, pal(c0), 0, 0.14, 0);
  seg(B, [0, 0.14 + H * 0.5, 0], [0.18, H - 0.3, 0.06], 0.12, 0.12, K.band);
  B.box(0.2, 0.06, 0.2, pal(K.ink), 0.18, H - 0.46, 0.06);
  B.box(0.2, 0.2, 0.2, pal(K.orb), 0.18, H - 0.4, 0.06);
  B.cone(0.16, 0, 0.14, pal(c1), 0.18, H - 0.2, 0.06, 4);
  for (const x of [0.1, 0.26]) B.box(0.04, 0.2, 0.04, pal(K.band), x, H - 0.42, 0.06);
}

function spire(B, H, c0, c1, K, v) {
  const lean = v % 2 ? 0.16 : -0.14;
  B.box(0.56, 0.26, 0.52, pal(K.shade));
  tilt(B, 0, 0.26, 0, 0, 0, lean, () => {
    const n = 4, hh = (H - 0.6) / n;
    for (let i = 0; i < n; i++) {
      const w = 0.42 - i * 0.07;
      B.box(w, hh, w, pal(i % 2 ? c1 : c0), 0, i * hh, 0);
      B.box(w + 0.06, 0.07, w + 0.06, pal(K.band), 0, i * hh + hh - 0.05, 0);
    }
    B.cone(0.14, 0, 0.34, pal(c0), 0, n * hh, 0, 4);
  });
}

function trough(B, H, c0, K) {
  B.box(0.72, H * 0.7, 0.44, pal(c0));
  B.box(0.6, 0.03, 0.32, pal(["#6ed7ed", "#2daecb", "#1f8ea8"]), 0, H * 0.7, 0);
  B.box(0.12, 0.08, 0.12, pal(K.orb), 0.14, H * 0.7, 0.02);
  B.box(0.8, 0.1, 0.52, pal(K.band), 0, 0, 0);
}

function bench(B, H, c1, K, v) {
  B.box(0.66, 0.1, 0.5, pal(WOOD), 0, H * 0.5, 0);
  for (const [x, z] of [[-0.26, -0.18], [0.26, -0.18], [-0.26, 0.18], [0.26, 0.18]]) B.box(0.1, H * 0.5, 0.1, pal(WOOD), x, 0, z);
  B.cyl(0.18, 0.1, pal(K.band), -0.08, H * 0.5 + 0.1, 0, 8);
  B.box(0.1, 0.1, 0.1, pal(K.orb), -0.08, H * 0.5 + 0.2, 0);
  B.box(0.09, 0.09, 0.09, pal(K.orb), 0.2, H * 0.5 + 0.1, 0.1);
  B.box(0.08, 0.08, 0.08, pal(v % 2 ? K.fin : K.orb), 0.18, H * 0.5 + 0.1, -0.12);
}

function bloom(B, H, c0, c1, K, v) {
  B.box(0.34, 0.14, 0.34, pal(K.shade));
  B.box(0.1, H * 0.45, 0.1, pal(["#7da65b", "#628943", "#4b6e31"]), 0, 0.14, 0);
  const y = 0.14 + H * 0.45;
  for (let i = 0; i < 4; i++) B.at(0, y, 0, i * Math.PI / 2 + (v % 2) * 0.4, () => tilt(B, 0, 0, 0.06, 0.7, 0, 0, () => B.cone(0.1, 0, H * 0.4, pal(i % 2 ? c0 : K.fin), 0, 0, 0, 4)));
  B.box(0.14, 0.14, 0.14, pal(K.orb), 0, y - 0.02, 0);
}

function maw(B, H, c0, c1, K, v) {
  plinth(B, 0.36, 0.2, K.shade, K.band);
  const n = 4, hh = (H * 0.62 - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const r = 0.2 + i * 0.03;
    B.cyl(r, hh - 0.04, pal(i % 2 ? c1 : c0), 0, 0.2 + i * hh, 0, 8);
    B.cyl(r + 0.04, 0.05, pal(K.ink), 0, 0.2 + i * hh + hh - 0.05, 0, 8);
  }
  const y = 0.2 + n * hh, top = H - y;
  tilt(B, 0, y, 0, 0.35, v % 2 ? 0.5 : -0.3, 0, () => {
    B.cone(0.3, 0.46, top, pal(c0), 0, 0, 0, 8);
    B.cyl(0.34, 0.05, pal(K.ink), 0, top - 0.04, 0, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      tilt(B, Math.cos(a) * 0.3, top, Math.sin(a) * 0.3, 0, -a, 0.9, () => B.cone(0.05, 0, 0.2, pal(K.body), 0, 0, 0, 4));
    }
    B.cone(0.12, 0.04, 0.24, pal(K.fin), 0, top - 0.2, 0, 6);
  });
}

function arch(B, H, c0, c1, K, v) {
  B.box(0.46, 0.18, 0.46, pal(K.band), -0.18, 0, 0);
  const n = 11, r = 0.36, cy = H - 0.46, x0 = -0.18;
  let prev = [x0, 0.18, 0];
  const up = 6;
  for (let i = 1; i <= up; i++) {
    const p = [x0, 0.18 + (cy - 0.18) * (i / up), 0];
    seg(B, prev, p, 0.24, 0.24, i % 2 ? c0 : c1);
    if (i % 2 === 0) B.box(0.3, 0.07, 0.3, pal(K.ink), p[0], p[1] - 0.04, 0);
    prev = p;
  }
  for (let i = 1; i <= n - up; i++) {
    const a = Math.PI - (i / (n - up)) * Math.PI * 1.15;
    const p = [x0 + r + r * Math.cos(a), cy + r * Math.sin(a), v % 2 ? 0.08 : -0.06];
    seg(B, prev, p, 0.2, 0.2, i % 2 ? c1 : c0);
    if (i === 2 || i === 4) B.box(0.26, 0.06, 0.26, pal(K.ink), p[0], p[1] - 0.03, p[2]);
    prev = p;
  }
  B.box(0.22, 0.1, 0.22, pal(K.ink), prev[0], prev[1] - 0.1, prev[2]);
  for (const dx of [-0.08, 0.08]) B.cone(0.05, 0, 0.2, pal(K.ink), prev[0] + dx, prev[1] - 0.3, prev[2], 4);
  B.box(0.1, 0.1, 0.1, pal(K.orb), prev[0], prev[1] - 0.2, prev[2]);
}

function crane(B, H, c0, c1, K, v) {
  B.box(0.44, 0.16, 0.44, pal(K.band));
  B.box(0.2, H * 0.55, 0.2, pal(c0), 0, 0.16, 0);
  B.box(0.16, H * 0.3, 0.16, pal(c1), 0, 0.16 + H * 0.55, 0);
  const top = 0.16 + H * 0.85, far = v % 2 ? [0.34, top, 0.2] : [0.2, top, 0.34];
  B.box(0.26, 0.1, 0.26, pal(K.ink), 0, top - 0.04, 0);
  seg(B, [0, top, 0], far, 0.12, 0.12, K.band);
  B.box(0.16, 0.14, 0.16, pal(K.ink), far[0], far[1] - 0.12, far[2]);
  B.cone(0.14, 0.05, 0.16, pal(c0), far[0], far[1] - 0.3, far[2], 6);
  B.box(0.14, 0.14, 0.14, pal(K.orb), far[0], far[1] - 0.44, far[2]);
  for (const a of [0, 2.1, 4.2]) B.box(0.04, 0.16, 0.04, pal(K.ink), far[0] + Math.cos(a) * 0.12, far[1] - 0.46, far[2] + Math.sin(a) * 0.12);
}

function orbPost(B, H, c0, c1, K, d) {
  B.prism(circle(0, 0, 0.3, 0.3, 6, 0), 0, 0.2, pal(K.band));
  B.prism(circle(0, 0, 0.22, 0.22, 6, 0), 0.2, H * 0.55, pal(c0));
  B.prism(circle(0, 0, 0.28, 0.28, 6, 0), H * 0.55, H * 0.62, pal(K.ink));
  B.prism(circle(0, 0, 0.18, 0.18, 6, 0), H * 0.62, H * 0.72, pal(c1));
  for (const a of [0, 2.1, 4.2]) B.box(0.05, 0.14, 0.05, pal(K.ink), Math.cos(a) * 0.14, H * 0.72, Math.sin(a) * 0.14);
  B.ball(0.17, pal(K.orb), 0, H * 0.72 + 0.17, 0, 1, 1);
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.16, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.16, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.5, 0.12, K.ink);
  }
}

function spool(B, H, c0, c1, K, v) {
  B.box(0.62, 0.12, 0.5, pal(K.band));
  for (const x of [-0.26, 0.26]) B.box(0.1, H * 0.7, 0.36, pal(K.ink), x, 0.12, 0);
  const cy = 0.12 + H * 0.42, r = H * 0.3;
  tilt(B, 0, cy, 0, 0, 0, Math.PI / 2, () => {
    B.cyl(r, 0.42, pal(c0), 0, -0.21, 0, 8);
    for (const y of [-0.12, 0, 0.12]) B.cyl(r + 0.04, 0.06, pal(c1), 0, y - 0.03, 0, 8);
  });
  seg(B, [0.1, cy + r, 0.1], [0.3, 0.12, 0.34], 0.1, 0.1, c1);
  B.box(0.16, 0.08, 0.16, pal(K.ink), 0.3, 0.12, 0.34);
}

function podRack(B, H, c0, c1, K, v) {
  B.box(0.74, H * 0.45, 0.46, pal(c0));
  B.box(0.8, 0.08, 0.52, pal(K.band), 0, H * 0.45, 0);
  for (const x of [-0.18, 0.18]) {
    B.cyl(0.15, 0.06, pal(K.ink), x, H * 0.45 + 0.06, 0, 8);
    B.ball(0.14, pal(v % 2 && x > 0 ? K.fin : K.orb), x, H * 0.45 + 0.2, 0, 1, 1);
  }
  for (const x of [-0.34, 0.34]) B.box(0.08, H * 0.45 + 0.1, 0.08, pal(K.ink), x, 0, 0.2);
}

function clawSlab(B, K, c0, v) {
  B.at(0, 0, 0, v % 2 ? 0.6 : -0.3, () => {
    B.prism([[-0.34, 0.3], [-0.12, 0.38], [0.12, 0.38], [0.34, 0.3], [0.18, -0.26], [-0.18, -0.26]], 0, 0.1, pal(c0));
    for (const t of [-0.24, 0, 0.24]) B.box(0.07, 0.06, 0.2, pal(K.ink), t, 0.1, 0.24);
    B.box(0.2, 0.05, 0.2, pal(K.ink), 0, 0.1, -0.08);
  });
}

function LENS_PROPS(B, t, role, H, v, d, K, c0, c1, c2, lens) {
  if (role === "creature" || /maw|proboscis/i.test(t)) maw(B, H, c0, c1, K, v);
  else if (/conduit-arch/i.test(t)) arch(B, H, c0, c1, K, v);
  else if (/crane|sensor/i.test(t)) crane(B, H, c0, c1, K, v);
  else if (/plinth/i.test(t)) orbPost(B, H, c0, c1, K, d);
  else if (/spool/i.test(t)) spool(B, H, c0, c1, K, v);
  else if (/pod-rack|rack/i.test(t)) podRack(B, H, c0, c1, K, v);
  else if (/claw-slab|slab/i.test(t)) clawSlab(B, K, c0, v);
  else if (/drafting|guide/i.test(t)) {
    B.box(0.46, 0.16, 0.46, pal(K.band));
    const n = 5, hh = (H - 0.5) / n;
    for (let i = 0; i < n; i++) { B.box(0.26 - i * 0.025, hh, 0.26 - i * 0.025, pal(i % 2 ? K.ink : c0), 0, 0.16 + i * hh, 0); }
    B.cone(0.12, 0, 0.34, pal(K.ink), 0, 0.16 + n * hh, 0, 4);
  } else if (/scratch/i.test(t)) {
    B.box(0.5, 0.14, 0.46, pal(K.band));
    tilt(B, 0, 0.14, 0, 0.12, v * 0.7, v % 2 ? 0.28 : -0.24, () => {
      B.box(0.36, H * 0.4, 0.14, pal(K.ink), 0, 0, 0);
      tilt(B, 0, H * 0.4, 0, 0, 0, v % 2 ? -0.2 : 0.2, () => { B.box(0.26, H * 0.32, 0.12, pal(c1), 0, 0, 0); B.cone(0.12, 0, H * 0.2, pal(K.ink), 0, H * 0.32, 0, 4); });
    });
    B.box(0.18, H * 0.3, 0.12, pal(K.band), 0.16, 0.14, 0.1);
  } else return false;
  return true;
}

const EXTRA = {
  "ink-stipple": { footprint: [1, 1], passable: true, variants: 3, height: 0.05 },
  "incubator-lamp": { footprint: [1, 1], passable: false, variants: 2, height: 1.6 },
};
const EXTRA_BUILD = {
  "ink-stipple": (B, H, v, K) => {
    for (let i = 0; i < 9; i++) {
      const a = (i * 2.39 + v) % (Math.PI * 2), r = 0.08 + ((i * 37 + v * 11) % 30) / 100;
      B.box(0.05, 0.02, 0.05, pal(K.ink), Math.cos(a) * r, 0, Math.sin(a) * r);
    }
    B.box(0.46, 0.015, 0.03, pal(K.ink), 0, 0, (v - 1) * 0.12);
  },
  "incubator-lamp": (B, H, v, K) => {
    B.box(0.36, 0.14, 0.36, pal(K.band));
    B.box(0.16, H * 0.5, 0.16, pal(K.shade), 0, 0.14, 0);
    B.box(0.3, 0.08, 0.3, pal(K.ink), 0, 0.14 + H * 0.5, 0);
    B.cyl(0.14, H * 0.28, pal(K.orb), 0, 0.22 + H * 0.5, 0, 8);
    for (const a of [0, 1.57, 3.14, 4.71]) B.box(0.04, H * 0.28, 0.04, pal(K.ink), Math.cos(a) * 0.15, 0.22 + H * 0.5, Math.sin(a) * 0.15);
    B.cone(0.2, 0.04, 0.12, pal(K.band), 0, 0.22 + H * 0.78, 0, 8);
  },
};

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|stele/i], ["dais", /dais|altar|plinth|pedestal|perch|throne|crag/i], ["light", /lantern|torch|brazier|lamp|pylon/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|trough/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
const skinOf = (t) => (/artisan|craft|sphere/i.test(t) ? "artisan" : /warden|pearl|vigil|oracle|sightless/i.test(t) ? "warden" : "stalker");

const LENS_SKIN = { medium: "ink", subject: "warden", composition: "stalker" };
const lensFromTypes = (types) => (types.some((t) => /scratch-spire|Funnel Maw/i.test(t)) ? "medium" : types.some((t) => /pod-rack|proboscis/i.test(t)) ? "subject" : types.some((t) => /claw-slab|orb-plinth/i.test(t)) ? "composition" : "");

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const leadT = types.find((t) => roleOf(P, t) === "lead") || "";
  const lens = P.gremlinLens || lensFromTypes(types);
  const K = SKINS[LENS_SKIN[lens] || skinOf(leadT)];
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = lens === "medium" ? { plinthLo: K.ink, plinthHi: K.band } : { plinthLo: pick(dt, 1, K.shade), plinthHi: pick(dt, 0, K.body) };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = p.role;
    const lead = role === "lead";
    const gatey = role === "threshold";
    catalog[t] = { footprint: lead ? [2, 2] : p.footprint || [1, 1], passable: lead || gatey ? false : !!p.passable, variants: 2, height: lead ? 2.7 : gatey ? Math.max(1.7, Math.min(2.4, p.height || 1)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, K.body), c1 = pick(tn, 1, K.shade), c2 = pick(tn, 2, K.band);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) gremlin(B, K, H, look, v, lens);
      else if (LENS_PROPS(B, t, role, H, v, d, K, c0, c1, c2, lens)) {}
      else if (/trough|cistern/i.test(t)) trough(B, H, c0, K);
      else if (/bench|station|basin/i.test(t)) bench(B, H, c1, K, v);
      else if (/bloom|flower/i.test(t)) bloom(B, H, c0, c1, K, v);
      else if (/siphon|tendril|conduit-pole/i.test(t)) siphon(B, H, c0, c1, K, v);
      else if (/rib/i.test(t) && /pylon|spire/i.test(t)) post(B, t, H, c0, c1, c2, d, K);
      else if (role === "threshold") post(B, t, H, c0, c1, c2, d, K);
      else if (role === "dais") plinth(B, 0.42, H, c1, c0);
      else if (role === "light") lamp(B, H, c0, c1, K, v);
      else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(K.band), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(K.orb), -0.05, H * 0.55 + 0.06, 0.02);
      } else if (role === "mass") spire(B, H, c0, c1, K, v);
      else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  for (const [t, spec] of Object.entries(EXTRA)) {
    if (catalog[t]) continue;
    catalog[t] = spec;
    builders[t] = (v, rot, st, ctx) => { const B = new Baker(); EXTRA_BUILD[t](B, ctx.height, v, K, lens); return mesh(B); };
  }
  return { catalog, builders };
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function grow(h, want) {
  for (let pass = 0; pass < 60 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N4.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length + ((x * 7 + z * 5) % 3) * 0.3;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground });
  }
}

const walled = (h, x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return n && n.h > h.cell(x, z).h; });

function moveSpawn(level, h, lo, hi) {
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || walled(h, x, z)) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo || q.length > hi) continue;
    const sc = q.length + 0.5 * (x + z);
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { level.spawn = [best[1], best[2]]; h.log.push(`spawn moved to ${best[1]},${best[2]}`); } else h.log.push(`spawn kept: no approach of ${lo} to ${hi}`);
}

function fixRamps(level, h) {
  const at = (x, z) => level.cells[z]?.[x];
  for (let z = 0; z < level.cells.length; z++) for (let x = 0; x < level.cells[z].length; x++) {
    const c = at(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = at(x - dx, z - dz);
    if (up && up.h === c.h && up.s !== "ramp") continue;
    level.cells[z][x] = { h: c.h, s: h.surf.path === "stone" ? "sand" : h.surf.path };
  }
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    const lo = level.cells[z + dz]?.[x + dx], soft = ["sand", "grass", "dirt"];
    if (up && soft.includes(up.s)) c.m = up.s;
    else if (lo && soft.includes(lo.s)) c.m = lo.s;
  }));
}

function repaint(level, h, keep) {
  const cells = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c && h.land(c) && c.s !== "ramp") cells.push([x, z, c]); }));
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length < cells.length * 0.25) return;
  const soft = [h.surf.ground, h.surf.raised, h.surf.path, "grass"].filter((s) => s && s !== "stone");
  const low = soft[0] || "grass", high = soft.find((s) => s !== low) || (low === "grass" ? "sand" : "grass");
  const wet = (x, z) => N4.some(([dx, dz]) => level.cells[z + dz]?.[x + dx]?.s === "water");
  let n = 0;
  for (const [x, z, c] of stone) {
    if (keep.has(h.key(x, z)) || (!wet(x, z) && (x * 7 + z * 3) % 11 === 0)) continue;
    level.cells[z][x] = { h: c.h, s: c.h >= 2 ? high : low };
    n++;
  }
  h.log.push(`repaint: ${n}/${stone.length} stone cells`);
}

function rimWater(h) {
  const lip = h.surf.ground === "stone" ? "grass" : h.surf.ground;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "water" && N4.some(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; })) h.set(x, z, { h: 1, s: lip });
  }
  h.removeDecor((d) => /tree|pine|spire|pump/i.test(d.t) && N4.some(([a, b]) => h.cell(d.x + a, d.z + b)?.s === "water"));
}

function pruneRamps(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp" || on.has(h.key(x, z))) continue;
    const [dx, dz] = h.DIRS[c.d], lo = h.cell(x + dx, z + dz);
    if (!h.land(lo)) continue;
    const old = { ...c }, before = h.reach().missing.length;
    h.set(x, z, { h: lo.h, s: lo.s === "stone" ? "grass" : lo.s });
    if (h.reach().missing.length > before) h.set(x, z, old); else n++;
  }
  if (n) h.log.push(`pruneRamps: ${n} side ramps flattened`);
}

function ledges(h, types, level) {
  const drop = (x, z) => [[1, 0], [0, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); const c = h.cell(x, z); return !h.land(n) || n.h <= c.h - 2 || (c.h >= 3 && n.h < c.h); });
  const hid = (x, z) => [[1, 0], [0, 1], [1, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return n && n.h > h.cell(x, z).h && n.s !== "ramp"; });
  const n = h.removeDecor((d) => types.includes(d.t) && (drop(d.x, d.z) || hid(d.x, d.z)));
  if (n) h.log.push(`ledges: ${n} tall props off cliff lips`);
}

function lowerFront(level, h) {
  const fc = h.figure.cells, sum = Math.max(...fc.map(([x, z]) => x + z));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || x + z < sum + 4 || c.h < 3 || !(h.land(c) || c.s === "ramp")) continue;
    h.set(x, z, { h: 2, s: c.s === "ramp" ? (h.surf.raised === "stone" ? "dirt" : h.surf.raised || "dirt") : c.s });
    n++;
  }
  if (n) h.log.push(`lowerFront: ${n} near wall cells to h2`);
}

function moreLights(level, h, t, route, want) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  const lit = () => level.decor.filter((d) => d.t === t);
  const fig = h.figure.cells;
  for (const [x, z] of route) {
    if (lit().length >= want) break;
    for (const [a, b] of N4) {
      const X = x + a, Z = z + b, c = h.cell(X, Z);
      if (!h.land(c) || c.s === "ramp" || on.has(h.key(X, Z)) || h.decorAt(X, Z).length || c.h !== h.cell(x, z).h) continue;
      if (N4.some(([p, q]) => h.cell(X + p, Z + q)?.s === "ramp")) continue;
      if (fig.some(([fx, fz]) => Math.abs(fx - X) <= 2 && Math.abs(fz - Z) <= 2)) continue;
      if (lit().some((d) => Math.abs(d.x - X) + Math.abs(d.z - Z) < 3)) continue;
      if (h.put(t, X, Z)) break;
    }
  }
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold").find((t) => !/trough|cistern/i.test(t)) || h.ofRole("mass").find((t) => /rib|pylon|gate/i.test(t));
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type || m.name).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  rimWater(h);
  if (/-3$/.test(level.name || "")) lowerFront(level, h);
  grow(h, 88);
  let raised = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.h >= 2 && !h.isFig(x, z)) raised++; }
  if (raised < 6) h.dais({ ring: 1, h: 2, s: "stone" });
  let r = h.approach();
  if (r.length < 12 || walled(h, ...level.spawn)) { moveSpawn(level, h, 12, 20); r = h.approach(); }
  if (r.length) h.path(r);
  fixRamps(level, h);
  r = h.approach();
  pruneRamps(level, h, r);
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  h.removeDecor((d) => /tree|pine|spire|pump/i.test(d.t) && near(d));
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
  repaint(level, h, keep);
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  h.repair();
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.55, 0.45, 0.65, 0.35, 0.75]) if (!g) g = tryGate(frac, strict);
  ledges(h, [...h.ofRole("mass"), ...h.ofRole("detail"), ...h.ofRole("offering"), "rock-big", "tree-round", "tree-pine", "tree-orange", "well"].filter((t) => t !== gateT), level);
  h.lights(lightT, { route: h.approach(), every: 2, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  moreLights(level, h, lightT, h.approach(), 4);
  h.repair({ keep: [gateT] });
  const bad = () => posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length > 0;
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  rampTone(level, h);
  h.log.push(`approach ${h.approach().length} posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}

const LOOKS = {
  medium: {
    bg: "#d6d3ca",
    light: { dir: [-0.35, 1, 0.55], ambient: 0.95, sun: 0.14 },
    palette: {
      sand: { top: "#f6f4ee", lip: "#dedbd2", edge: "#bdb9ae", dots: "#9a9aa2" },
      stone: { top: "#e2e3e6", pebble: "#f4f5f7", pebbleShade: "#b9bcc2", rim: "#8e9198" },
      dirt: { top: "#9c9ca4", patch: "#8a8a92", mottle: "#6e6e76", border: "#55555c", path: "#a8a8b0" },
      grass: { top: "#c7ccd6", fringe: "#a7adb9", fringeDark: "#858b98", speck: "#e3e6ec" },
      cliffUpper: { left: "#2d2d33", right: "#1d1d22", seam: "#0f0f12" },
      cliffLower: { left: "#26262b", right: "#18181c", seam: "#0c0c0e", speck: "#3a3a42" },
    },
  },
  subject: {
    bg: "#16262a",
    light: { dir: [0.25, 1, 0.7], ambient: 0.72, sun: 0.34 },
    palette: {
      grass: { top: "#8fd6c4", fringe: "#6dbba8", fringeDark: "#4f9a88", speck: "#c2efe3" },
      sand: { top: "#e4efec", lip: "#c4d6d2", edge: "#a2b8b4", dots: "#ffffff" },
      dirt: { top: "#5f7f86", patch: "#6d8f96", mottle: "#4d6a70", border: "#3a5157", path: "#6f9097" },
      stone: { top: "#cfe3e4", pebble: "#e8f4f4", pebbleShade: "#a9c3c5", rim: "#7fa0a3" },
      cliffUpper: { left: "#4d6d78", right: "#3a5660", seam: "#263c44" },
      cliffLower: { left: "#3b5660", right: "#2c434b", seam: "#1d2e34", speck: "#5e8591" },
    },
  },
  composition: {
    bg: "#3a2436",
    light: { dir: [-0.95, 0.75, 0.25], ambient: 0.56, sun: 0.62 },
    palette: {
      sand: { top: "#f0d49a", lip: "#d9b475", edge: "#bb9152", dots: "#fbe7bd" },
      dirt: { top: "#b8704a", patch: "#c7825a", mottle: "#9c5a38", border: "#7a4128", path: "#c98a5e" },
      stone: { top: "#e6d2b8", pebble: "#f4e6d2", pebbleShade: "#c3a98a", rim: "#98785a" },
      grass: { top: "#d9a45e", fringe: "#bd8744", fringeDark: "#946430", speck: "#f0c888" },
      cliffUpper: { left: "#7a4a5e", right: "#5c3548", seam: "#402434" },
      cliffLower: { left: "#5e3548", right: "#472638", seam: "#301826", speck: "#8a5a6e" },
    },
  },
};

const lensOfLevel = (level) => String(level.name).split("-").pop();
const landList = (h) => { const out = []; for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c)) out.push([x, z, c]); } return out; };
const figDist = (h, x, z) => Math.min(...h.figure.cells.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
const hashXZ = (x, z) => ((x * 73856093) ^ (z * 19349663)) >>> 0;

function freeFlat(h, x, z, route) {
  const c = h.cell(x, z);
  if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length) return false;
  if (route.some(([a, b]) => a === x && b === z)) return false;
  return !N4.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp");
}

function safePut(h, t, x, z, o = {}) {
  const miss = h.reach().missing.length;
  if (!h.put(t, x, z, o)) return false;
  if (h.reach().missing.length > miss) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); return false; }
  return true;
}

function scatter(h, t, n, pred, o = {}) {
  const cand = landList(h).filter(([x, z]) => pred(x, z)).sort((a, b) => hashXZ(a[0], a[1] + (o.salt || 0)) - hashXZ(b[0], b[1] + (o.salt || 0)));
  let k = 0;
  for (const [x, z] of cand) {
    if (k >= n) break;
    if (o.gap && h.lvl.decor.some((d) => d.t === t && Math.abs(d.x - x) + Math.abs(d.z - z) < o.gap)) continue;
    if (safePut(h, t, x, z, { v: (o.v0 || 0) + k })) k++;
  }
  h.log.push(`scatter ${t} ${k}/${n}`);
  return k;
}

function tryGate(level, h, gateT, route, fracs, o = {}) {
  const posts = () => level.decor.filter((d) => d.t === gateT);
  for (const strict of [true, false]) for (const frac of fracs) {
    const saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice(), miss = h.reach().missing.length;
    const snap = JSON.stringify(level.cells.map((r) => r.map((c) => c.h)));
    const g = h.gate(gateT, { route, frac, ...o });
    const nearRamp = g && [...posts().map((d) => [d.x, d.z])].some(([x, z]) => [[0, 0], ...N4].some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp"));
    const edge = level.cells.some((row, z) => row.some((c, x) => (x === 0 || z === 0 || x === h.W - 1 || z === h.D - 1) && h.land(c)));
    const ok = g && !nearRamp && !edge && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && !posts().some((d) => h.cell(d.x, d.z).s === "ramp") && h.reach().missing.length <= miss;
    if (ok && (!strict || JSON.stringify(level.cells.map((r) => r.map((c) => c.h))) === snap)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
  }
  h.log.push(`gate ${gateT}: none held`);
  return null;
}

function swell(level, h) {
  const saved = level.cells.map((row) => row.map((c) => ({ ...c })));
  const raised = h.surf.raised && h.surf.raised !== "stone" ? h.surf.raised : "sand";
  let n = 0;
  for (const [x, z, c] of landList(h)) {
    if (c.s === "ramp") continue;
    const d = figDist(h, x, z);
    const want = d <= 1 ? 3 : d <= 2 ? 2 : 0;
    if (want > c.h) { level.cells[z][x] = { h: want, s: h.isFig(x, z) ? c.s : raised }; n++; }
  }
  h.repair();
  if (h.reach().missing.length || h.walkN() < 70) { level.cells.splice(0, level.cells.length, ...saved); h.log.push("swell reverted"); return; }
  h.log.push(`swell ${n} cells`);
}

function restoreShape(level, brief, h) {
  const comp = brief.composition || {}, grid = comp.grid, hs = comp.heights;
  if (!grid || !hs) return;
  const soft = (s) => (s && s !== "stone" ? s : null);
  const raised = soft(h.surf.raised) || soft(h.surf.ground) || "sand", ground = soft(h.surf.ground) || "sand";
  let n = 0;
  for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
    const want = Number(hs[z]?.[x] || 0), c = h.cell(x, z);
    if (!want || !c || c.s !== "none") continue;
    level.cells[z][x] = { h: want, s: grid[z][x] === "P" ? (soft(h.surf.path) || ground) : want >= 2 ? raised : ground };
    n++;
  }
  h.repair();
  h.log.push(`restoreShape ${n} cells, reach ${h.reach().reached}/${h.reach().total}, missing ${h.reach().missing.length}`);
}

function composeTwin(level, brief, h) {
  const hs = brief.composition?.heights;
  if (!hs) return;
  const [ax, az] = h.figure.anchor;
  const raised = h.surf.raised && h.surf.raised !== "stone" ? h.surf.raised : "sand";
  const ground = h.surf.ground && h.surf.ground !== "stone" ? h.surf.ground : "dirt";
  const ex = ax + 2;
  let n = 0;
  for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
    const inA = Number(hs[z]?.[x] || 0) && x <= ex && z <= az + 5;
    const neck = x === ex && z <= az + 3;
    if (!inA && !neck) continue;
    const d = figDist(h, x, z), c = h.cell(x, z);
    const want = x === ex ? 2 : d <= 2 ? 3 : 2;
    if (c.s === "none") n++;
    level.cells[z][x] = { h: want, s: want === 3 ? raised : ground };
    h.clear(x, z);
  }
  const foot = [ex, az + 3];
  const low = [ex, az + 4];
  if (h.cell(...low)) { level.cells[low[1]][low[0]] = { h: 1, s: ground }; h.clear(...low); }
  const hook = [ex + 1, az + 4];
  if (h.cell(...hook) && !h.land(h.cell(...hook))) level.cells[hook[1]][hook[0]] = { h: 1, s: ground };
  h.stairs(foot[0], foot[1], "s", { m: ground });
  let top = null;
  for (let z = az - 2; z <= az + 2 && !top; z++) {
    const c = h.cell(ex - 1, z), hi = h.cell(ex - 2, z), lo = h.cell(ex, z);
    if (c?.h === 3 && hi?.h === 3 && !h.isFig(ex - 2, z) && !h.isFig(ex - 1, z) && lo?.h === 2 && lo.s !== "ramp") { h.stairs(ex - 1, z, "e", { m: raised }); top = [ex - 1, z]; }
  }
  const south = [ax - 1, az + 3];
  if (h.cell(...south)?.h === 3 && h.cell(ax - 1, az + 4)?.h === 2 && h.cell(ax - 1, az + 2)?.h === 3) h.stairs(...south, "s", { m: raised });
  h.repair();
  h.log.push(`composeTwin ${n} new cells, climb ${foot} -> ${top}, reach ${h.reach().reached}/${h.reach().total}, approach ${h.approach().length}`);
}

function levelRamps(level, h) {
  let n = 0;
  for (let pass = 0; pass < 3; pass++) level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], lo = h.cell(x + dx, z + dz), up = h.cell(x - dx, z - dz);
    if (h.land(lo) && lo.h === c.h - 1 && lo.s !== "ramp" && up && up.h === c.h) return;
    row[x] = { h: c.h, s: c.m && c.m !== "stone" ? c.m : h.surf.ground === "stone" ? "sand" : h.surf.ground };
    n++;
  }));
  if (n) { h.log.push(`levelRamps ${n}`); h.repair(); }
}

function finishLens(level, brief, h) {
  const L = lensOfLevel(level);
  h.lvl = level;
  if (L === "composition") composeTwin(level, brief, h);
  const look = LOOKS[L] || {};
  level.palette.gremlinLens = L;
  for (const k of Object.keys(look.palette || {})) level.palette[k] = { ...level.palette[k], ...look.palette[k] };
  if (look.bg) level.bg = look.bg;
  if (look.light) level.light = { ...level.light, ...look.light };
  h.dryRim();
  const daisT = h.ofRole("dais");
  const gateT = brief.threshold?.prop && level.palette?.props?.[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || "incubator-lamp";
  const passT = h.passes().filter((t) => t !== "stepping-stones" && !daisT.includes(t) && t !== gateT && t !== lightT && h.role(t) !== "lead");
  h.removeDecor((d) => daisT.includes(d.t) || d.t === gateT || d.t === lightT || d.t === "lantern" || d.t === "torch" || passT.includes(d.t) || d.t === "stepping-stones");
  if (L === "medium") {
    const sum = Math.max(...h.figure.cells.map(([x, z]) => x + z));
    let n = 0;
    for (const [x, z, c] of landList(h)) {
      if (c.h < 3 || x + z <= sum || c.s === "ramp") continue;
      const old = { ...c }, before = h.reach().reached;
      level.cells[z][x] = { h: 2, s: c.s };
      h.repair();
      if (h.reach().reached < before - 1 || h.reach().missing.length) level.cells[z][x] = old; else n++;
    }
    h.log.push(`medium: lowered ${n} h3 cells in front of the figure`);
  }
  let r = h.spawnAt({ min: 11, max: 18 });
  if (r.length) h.path(r, L === "subject" ? { s: "sand" } : {});
  fixRamps(level, h);
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  r = h.approach();
  let g0 = null;
  if (L === "composition" && gateT) {
    const sp0 = level.spawn.slice();
    const cand = landList(h).filter(([x, z, c]) => c.s !== "ramp" && !h.isFig(x, z) && !h.decorAt(x, z).length).map(([x, z]) => [x, z, h.approach({ from: [x, z] })]).filter(([, , q]) => q.length >= 10 && q.length <= 20).sort((a, b) => (b[0] + b[1]) - (a[0] + a[1]));
    for (const [x, z, q] of cand) {
      level.spawn = [x, z];
      g0 = tryGate(level, h, gateT, q, [0.3, 0.2, 0.4, 0.5]);
      if (g0) { h.log.push(`composition spawn ${x},${z} gate ${g0}`); break; }
    }
    if (!g0) level.spawn = sp0;
    r = h.approach();
  }
  const g = g0 || (gateT && L !== "composition" ? tryGate(level, h, gateT, r, L === "subject" ? [0.3, 0.4, 0.2, 0.5] : L === "composition" ? [0.3, 0.2, 0.4, 0.5, 0.15] : [0.55, 0.45, 0.65, 0.35, 0.25, 0.75]) : null);
  r = h.approach();
  const keep = [gateT, lightT, ...passT, ...h.ofRole("creature")].filter(Boolean);
  h.removeDecor((d) => !keep.includes(d.t) && d.t !== h.lead?.t && figDist(h, d.x, d.z) <= 1 && !level.palette.props?.[d.t]?.passable);
  h.along(passT, { route: r });
  h.lights(lightT, { route: r, every: 3, skip: 2, max: L === "subject" ? 6 : 4, avoid: g ? [g] : [], keep });
  if (L === "medium") {
    scatter(h, "ink-stipple", 10, (x, z) => freeFlat(h, x, z, r) && figDist(h, x, z) > 1 && ["sand", "stone"].includes(h.cell(x, z).s), { gap: 2 });
  }
  if (L === "subject") {
    const rack = Object.keys(level.palette.props || {}).find((t) => /rack/.test(t));
    if (rack) scatter(h, rack, 4 - level.decor.filter((d) => d.t === rack).length, (x, z) => freeFlat(h, x, z, r) && figDist(h, x, z) === 2, { gap: 2, salt: 3 });
  }
  if (L === "composition") {
    const [ax, az] = h.figure.anchor, types = Object.keys(level.palette.props || {});
    const craneT = types.find((t) => /crane/.test(t)), spireT = types.find((t) => /drafting|guide/.test(t)), slabT = types.find((t) => /claw-slab/.test(t));
    if (craneT) for (const [x, z] of [[ax - 1, az + 2], [ax + 2, az - 1], [ax - 1, az - 1]]) if (freeFlat(h, x, z, r) && safePut(h, craneT, x, z, { v: 1 })) break;
    if (spireT) for (const [x, z] of [[ax - 2, az - 2], [ax - 3, az - 1], [ax - 2, az]]) if (freeFlat(h, x, z, r) && safePut(h, spireT, x, z)) break;
    if (slabT) { let k = 0; for (const [i, [x, z]] of r.entries()) if (i % 3 === 1 && k < 5 && h.cell(x, z).s !== "ramp" && !h.decorAt(x, z).length && h.put(slabT, x, z, { v: k })) k++; h.log.push(`claw slabs on route ${k}`); }
    h.removeDecor((d) => /fence/.test(d.t));
    const mawT = types.find((t) => level.palette.props[t].role === "creature"), archT = types.find((t) => /conduit-arch/.test(t));
    if (mawT && !level.decor.some((d) => d.t === mawT)) {
      const cand = landList(h).filter(([x, z]) => x > ax + 4 && freeFlat(h, x, z, r)).sort((a, b) => (b[0] - b[1] + b[2].h) - (a[0] - a[1] + a[2].h));
      for (const [x, z] of cand) if (safePut(h, mawT, x, z, { v: 1 })) { h.log.push(`maw at ${x},${z}`); break; }
    }
    if (archT) for (const [x, z] of [[ax + 2, az - 2], [ax - 1, az - 2], [ax - 2, az + 1]]) if (h.cell(x, z)?.h === 3 && freeFlat(h, x, z, r) && safePut(h, archT, x, z, { v: 0 })) { h.log.push(`court arch ${x},${z}`); break; }
  }
  if (L === "subject") {
    const keepS = new Set([...r, ...h.figRing()].map(([x, z]) => h.key(x, z)));
    let n = 0;
    for (const [x, z, c] of landList(h)) if (c.s === "stone" && !keepS.has(h.key(x, z)) && hashXZ(x, z) % 7) { c.s = c.h >= 2 ? "sand" : "grass"; n++; }
    h.log.push(`subject unstone ${n}`);
  }
  h.ledges({ keep: [gateT, ...h.ofRole("creature")] });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.openRamps();
  fixRamps(level, h);
  if (h.walkN() < 84) h.thin(84, { keep });
  if (h.walkN() < 84) h.grow(84);
  levelRamps(level, h);
  h.rampTone();
  if (L === "subject") placeLandmark(level, h, "gremlin-specimen-vat");
  h.log.push(`lens ${L}: approach ${h.approach().length}, walk ${h.walkN()}, missing ${JSON.stringify(h.reach().missing)}`);
}
