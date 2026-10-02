import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const NEB = {
  sclera: ["#f4eefc", "#ddd3f0", "#bfb1dc"],
  iris: ["#5aa6ff", "#4a94fa", "#3272d6"],
  irisDeep: ["#3a70e6", "#2f60d2", "#2448a8"],
  lime: ["#c4f25e", "#a2dc3c", "#7eba28"],
  pupil: ["#1b1532", "#150f28", "#0e0a1c"],
  lid: ["#e27ab0", "#c85c94", "#a44478"],
  lidLow: ["#9a6ae0", "#7d4fc6", "#613aa6"],
  lash: ["#2c2046", "#231939", "#19112a"],
  star: ["#fffbe8", "#f3efd2", "#dcd6b2"],
  cyan: ["#8ef2ff", "#5ed8f2", "#38b6d6"],
  ring: ["#d4e8ff", "#adc9ee", "#88a8d2"],
  indigo: ["#5c50c4", "#473ca4", "#352c84"],
  violet: ["#8a64d8", "#6f4cbc", "#56389c"],
  teal: ["#2fd6c4", "#1fb2a2", "#158c80"],
  gold: ["#ffd54f", "#e6b022", "#c4920c"],
  rock: ["#6a6494", "#554f7c", "#403b62"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;

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

function eye(B, H, look, v) {
  const s = H / 2.45;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.94, 0.22, look.plinthLo, look.plinthHi);
  B.rbox(1.34, 0.2, 1.0, 0.08, pal(NEB.indigo), 0, 0.22, -0.02);
  B.box(1.0, 0.2, 0.74, pal(NEB.violet), 0, 0.42, -0.02);
  for (const [x, z, h, c] of [[-0.66, 0.5, 0.16, NEB.ring], [-0.38, 0.62, 0.12, NEB.ring], [0.5, 0.56, 0.14, NEB.rock], [0.7, 0.3, 0.2, NEB.ring], [0.02, 0.66, 0.1, NEB.rock]]) B.box(0.16, h, 0.14, pal(c), x, 0.22, z);
  const c = 1.38;
  B.at(0, 0, 0.02, 0.36 + (v % 2) * 0.1, () => {
    B.box(0.72, 0.16, 0.46, pal(NEB.indigo), 0, 0.62, -0.04);
    B.rot([1, 0, 0], Math.PI / 2, 0, c, -0.26);
    B.prism(circle(0, 0, 0.98, 0.62, 6, 0), 0, 0.5, pal(NEB.sclera));
    B.cyl(0.52, 0.08, pal(NEB.iris), 0, 0.5, 0, 12);
    B.cyl(0.34, 0.03, pal(NEB.irisDeep), 0, 0.58, 0, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.33 : 0.42;
      B.box(0.09, 0.05, 0.09, pal(NEB.lime), Math.cos(a) * r, 0.58, Math.sin(a) * r);
    }
    B.cyl(0.22, 0.08, pal(NEB.pupil), 0, 0.6, 0, 10);
    B.box(0.1, 0.03, 0.1, pal(NEB.star), -0.24, 0.6, -0.24);
    B.box(0.05, 0.03, 0.05, pal(NEB.star), -0.14, 0.62, -0.3);
    B.pop();
    B.rbox(1.4, 0.14, 0.62, 0.05, pal(NEB.lid), 0, c + 0.5, -0.02);
    wedge(B, 1.2, 0.1, 0.5, NEB.lidLow, 0, c + 0.64, -0.04);
    B.rbox(1.2, 0.14, 0.62, 0.05, pal(NEB.lidLow), 0, c - 0.66, 0);
    for (const [x, l] of [[-0.54, 0.5], [-0.28, 0.35], [0, 0.3], [0.28, 0.35], [0.54, 0.5]]) {
      B.rot([1, 0, 0], l, x, c + 0.66, 0.12);
      B.rot([0, 0, 1], -x * 0.6, 0, 0, 0);
      B.cone(0.07, 0, 0.36, pal(NEB.lash), 0, 0, 0, 4);
      B.pop(); B.pop();
    }
    for (const x of [-0.4, 0, 0.4]) {
      B.rot([1, 0, 0], -0.6, x, c - 0.6, 0.22);
      B.cone(0.05, 0, 0.18, pal(NEB.lash), 0, -0.18, 0, 4);
      B.pop();
    }
    const sx = 0.96, sy = c - 0.12, sz = 0.14;
    B.box(0.18, 0.18, 0.18, pal(NEB.cyan), sx, sy - 0.09, sz);
    B.box(0.07, 0.86, 0.07, pal(NEB.star), sx, sy - 0.43, sz);
    B.box(0.72, 0.07, 0.07, pal(NEB.star), sx + 0.1, sy - 0.035, sz);
    B.rot([0, 0, 1], Math.PI / 4, sx, sy, sz);
    B.box(0.05, 0.44, 0.05, pal(NEB.cyan), 0, -0.22, 0);
    B.box(0.44, 0.05, 0.05, pal(NEB.cyan), 0, -0.025, 0);
    B.pop();
  });
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|pylon|megalith/i], ["dais", /dais|altar|plinth|pedestal|perch|throne/i], ["light", /lantern|torch|brazier|lamp|beacon/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|cache|relic/i], ["mass", /tree|pine|cypress|spire|pillar|monolith|rock|cliff|totem|crag|asteroid|boulder/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

function rocks(B, H, c0, c1, v) {
  const h1 = H * 0.55;
  B.box(0.62, h1 * 0.5, 0.56, pal(c0), 0, 0, 0);
  wedge(B, 0.62, h1 * 0.5, 0.56, c0, 0, h1 * 0.5, 0);
  B.box(0.3, H * 0.32, 0.3, pal(c1), v % 2 ? 0.14 : -0.12, h1 * 0.5, v % 2 ? -0.1 : 0.08);
  B.box(0.18, 0.16, 0.18, pal(NEB.cyan), v % 2 ? -0.2 : 0.2, 0, 0.26);
}

const LENS_KINDS = [
  ["lash", /lash/i],
  ["nebula", /nebula|cloud/i],
  ["striation", /striation|fibre|fiber/i],
  ["flare", /flare|beacon|star/i],
  ["asteroid", /asteroid|meteor|boulder|chunk|tumbler/i],
  ["capillary", /capillar|vein|vascul|tendril|creeper/i],
];
const lensKind = (t) => (LENS_KINDS.find(([, re]) => re.test(t)) || [null])[0];

function starburst(B, y, s = 1) {
  B.at(0, y, 0, -Math.PI / 4, () => {
    B.box(0.2 * s, 0.2 * s, 0.2 * s, pal(NEB.cyan), 0, -0.1 * s, 0);
    B.box(0.07 * s, 1.0 * s, 0.07 * s, pal(NEB.star), 0, -0.5 * s, 0);
    B.box(0.9 * s, 0.07 * s, 0.07 * s, pal(NEB.star), 0, -0.035 * s, 0);
    B.rot([0, 0, 1], Math.PI / 4, 0, 0, 0);
    B.box(0.05 * s, 0.46 * s, 0.05 * s, pal(NEB.cyan), 0, -0.23 * s, 0);
    B.box(0.46 * s, 0.05 * s, 0.05 * s, pal(NEB.cyan), 0, -0.025 * s, 0);
    B.pop();
  });
}

function zigzag(B, r, y, n, c, s = 1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = i % 2 ? r * 0.8 : r, hh = i % 2 ? 0.1 : 0.2;
    B.box(0.16 * s, hh * s, 0.16 * s, pal(c), Math.cos(a) * rr, y, Math.sin(a) * rr);
  }
}

function pupilMonolith(B, H) {
  const s = H / 2.7;
  B.push(0, 0, 0, 0, s);
  B.prism(circle(0, 0, 0.98, 0.98, 8, Math.PI / 8), 0, 0.14, pal(NEB.sclera));
  B.prism(circle(0, 0, 0.8, 0.8, 8, Math.PI / 8), 0.14, 0.3, pal(NEB.ring));
  B.prism(circle(0, 0, 0.64, 0.64, 8, Math.PI / 8), 0.3, 0.48, pal(NEB.iris));
  B.prism(circle(0, 0, 0.5, 0.5, 8, Math.PI / 8), 0.48, 0.64, pal(NEB.irisDeep));
  B.cyl(0.4, 1.7, pal(NEB.pupil), 0, 0.64, 0, 10);
  B.cyl(0.44, 0.12, pal(NEB.indigo), 0, 1.4, 0, 10);
  zigzag(B, 0.5, 2.06, 14, NEB.lime);
  B.cyl(0.3, 0.1, pal(NEB.pupil), 0, 2.34, 0, 10);
  B.rbox(0.22, 0.22, 0.22, 0.08, pal(NEB.star), -0.2, 1.9, 0.28);
  B.rbox(0.1, 0.1, 0.1, 0.04, pal(NEB.star), -0.3, 1.72, 0.3);
  B.pop();
}

function coronalSentinel(B, H) {
  const s = H / 2.7;
  B.push(0, 0, 0, 0, s);
  B.prism(circle(0, 0, 1.0, 1.0, 12, 0), 0, 0.08, pal(NEB.irisDeep));
  zigzag(B, 0.9, 0.08, 18, NEB.lime);
  B.prism(circle(0, 0, 0.74, 0.74, 12, 0), 0.08, 0.2, pal(NEB.iris));
  B.cyl(0.58, 0.9, pal(NEB.pupil), 0, 0.2, 0, 12);
  B.cyl(0.62, 0.14, pal(NEB.lime), 0, 0.72, 0, 12);
  B.cyl(0.5, 0.5, pal(NEB.pupil), 0, 1.1, 0, 12);
  B.cyl(0.36, 0.08, pal(NEB.iris), 0, 1.6, 0, 12);
  B.rbox(0.18, 0.18, 0.18, 0.06, pal(NEB.star), -0.3, 1.24, 0.42);
  B.at(0, 0.1, 0, Math.PI / 4, () => {
    B.box(2.4, 0.06, 0.12, pal(NEB.star), 0.5, 0, 0);
    B.box(1.6, 0.05, 0.2, pal(NEB.cyan), 0.9, 0.06, 0);
  });
  B.at(0.7, 0, 0.7, 0, () => starburst(B, 1.3, 1.1));
  B.pop();
}

const LENS_BUILD = {
  lash(B, H, v, { c0, d, gate }) {
    B.rbox(0.62, 0.2, 0.56, 0.08, pal(NEB.lid), 0, 0, 0);
    B.rbox(0.44, 0.12, 0.4, 0.06, pal(NEB.lidLow), 0, 0.2, 0);
    const dir = gate && d.side ? -d.side : v % 2 ? 1 : -1;
    const ax = gate && d.axis === "x" ? "z" : "x";
    const n = 7, seg = (H - 0.36) / n;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), off = dir * 0.62 * k * k, w = 0.34 * (1 - k * 0.7);
      const x = ax === "x" ? off : 0, z = ax === "z" ? off : 0;
      B.box(w, seg * 1.05, w, pal(i % 3 === 2 ? NEB.lidLow : NEB.lash), x, 0.32 + i * seg, z);
    }
    const tx = ax === "x" ? dir * 0.7 : 0, tz = ax === "z" ? dir * 0.7 : 0;
    B.cone(0.06, 0, 0.26, pal(NEB.lash), tx, H - 0.06, tz, 4);
    if (gate && d.side) {
      const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.2, th, reach + 0.2, pal(c), 0, y, -d.side * (reach / 2)) : B.box(reach + 0.2, th, 0.2, pal(c), -d.side * (reach / 2), y, 0);
      beam(H * 0.5, 0.14, NEB.lid);
      beam(H * 0.5 + 0.14, 0.06, NEB.lime);
    }
  },
  nebula(B, H, v, { spire }) {
    const cols = v % 2 ? [NEB.teal, NEB.lime, NEB.cyan, NEB.gold] : [NEB.lime, NEB.teal, NEB.gold, NEB.cyan];
    let y = 0;
    if (spire) {
      B.box(0.36, 0.1, 0.36, pal(NEB.indigo));
      B.box(0.18, H * 0.4, 0.18, pal(NEB.lash), 0, 0.1, 0);
      y = H * 0.4;
    }
    const rest = H - y, puffs = [[0.82, 0.34, 0, 0], [0.62, 0.3, 0.14, -0.08], [0.5, 0.26, -0.14, 0.1], [0.3, 0.2, 0.04, 0.02]];
    const tot = puffs.reduce((a, p) => a + p[1], 0);
    for (let i = 0; i < puffs.length; i++) {
      const [w, h, x, z] = puffs[i], hh = (h / tot) * rest;
      B.rbox(w, hh * 1.08, w * 0.9, Math.min(0.12, hh * 0.4), pal(cols[i]), x, y, z);
      y += hh;
    }
    B.box(0.08, 0.08, 0.08, pal(NEB.star), 0.3, H * 0.7, 0.3);
  },
  striation(B, H, v) {
    B.rbox(0.66, 0.1, 0.6, 0.05, pal(NEB.irisDeep), 0, 0, 0);
    const sp = v % 2 ? [[0, 0, 1, NEB.cyan], [0.2, 0.14, 0.7, NEB.teal], [-0.18, 0.12, 0.6, NEB.iris]] : [[0.04, -0.04, 1, NEB.teal], [-0.2, 0.1, 0.72, NEB.cyan], [0.18, 0.16, 0.55, NEB.iris]];
    for (const [x, z, k, c] of sp) B.cone(0.2, 0, (H - 0.1) * k, pal(c), x, 0.1, z, 3);
  },
  flare(B, H) {
    B.box(0.56, 0.14, 0.56, pal(NEB.gold));
    B.box(0.42, 0.14, 0.42, pal(NEB.gold), 0, 0.14, 0);
    B.box(0.3, 0.12, 0.3, pal(NEB.indigo), 0, 0.28, 0);
    B.box(0.16, H * 0.4, 0.16, pal(NEB.indigo), 0, 0.4, 0);
    B.rbox(0.3, 0.3, 0.3, 0.12, pal(NEB.gold), 0, 0.4 + H * 0.4, 0);
    starburst(B, H - 0.05, H / 2.2);
  },
  asteroid(B, H, v, { big }) {
    B.rbox(0.84, 0.06, 0.7, 0.05, pal(NEB.ring), 0, 0, 0);
    B.box(0.5, 0.02, 0.3, pal(NEB.pupil), 0.16, 0.06, 0.22);
    let y = 0.06;
    if (big) {
      B.rbox(0.3, 0.2, 0.3, 0.06, pal(NEB.rock), -0.18, y, 0.1);
      B.rbox(0.22, 0.16, 0.22, 0.05, pal(NEB.rock), 0.2, y, -0.12);
      y += 0.2;
    }
    const r = H - y;
    B.box(0.5, r * 0.45, 0.46, pal(NEB.rock), v % 2 ? 0.04 : -0.04, y, 0);
    wedge(B, 0.5, r * 0.35, 0.46, NEB.rock, v % 2 ? 0.04 : -0.04, y + r * 0.45, 0);
    B.box(0.26, r * 0.3, 0.24, pal(NEB.lash), v % 2 ? -0.1 : 0.12, y + r * 0.45, v % 2 ? 0.08 : -0.08);
    B.box(0.12, 0.08, 0.12, pal(NEB.cyan), v % 2 ? 0.2 : -0.18, y + r * 0.45, 0.2);
  },
  capillary(B, H, v) {
    const red = ["#ff5a6e", "#e0405a", "#b82a46"];
    const th = Math.min(0.08, H * 0.3);
    const seg = (x0, z0, x1, z1, w) => {
      const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
      B.at((x0 + x1) / 2, 0, (z0 + z1) / 2, -Math.atan2(dz, dx), () => B.box(L, th, w, pal(red), 0, 0, 0));
    };
    const m = v % 2 ? 1 : -1;
    seg(-0.34, 0.24 * m, 0.0, 0.0, 0.1);
    seg(0.0, 0.0, 0.34, -0.16 * m, 0.08);
    seg(0.0, 0.0, 0.1, 0.3 * m, 0.06);
    seg(0.16, -0.08 * m, 0.24, -0.3 * m, 0.05);
    seg(-0.2, 0.13 * m, -0.26, -0.16 * m, 0.05);
  },
};

const R5C = {
  tape: ["#fff0d0", "#eedcb4", "#d4bf94"],
  peach: ["#ffc9a3", "#f0a982", "#d88c66"],
  rose: ["#f58fa6", "#e67a93", "#c85c78"],
  lilac: ["#b8a4f2", "#9c86e0", "#7c66c4"],
  plum: ["#6f5a9e", "#57457f", "#433466"],
  cyanPale: ["#c8f6fa", "#a6e8f2", "#84d2e2"],
  ice: ["#eaf4ff", "#c6d8f0", "#a6bedf"],
  slate: ["#5a6698", "#48527e", "#364066"],
  shadow: ["#161a34", "#12152a", "#0c0e20"],
  coral: ["#ff9a8c", "#f07e72", "#d0645c"],
  wine: ["#8e3a50", "#72283e", "#561c2e"],
  lashInk: ["#3a2446", "#2c1a38", "#1e1028"],
  amber: ["#ffd54f", "#ffb31d", "#ff8a1d"],
  ivory: ["#fff4e6", "#eedcc6", "#d6c0a6"],
  crimson: ["#e8364e", "#c82a42", "#a01e34"],
  blush: ["#ffc2c8", "#f4a2ac", "#dc808c"],
  dust: ["#2e3470", "#232858", "#181c40"],
  tealGas: ["#5ee0d0", "#34c8b8", "#22a898"],
};

function upright(B, fn) { B.rot([1, 0, 0], Math.PI / 2, 0, 0, 0); fn(); B.pop(); }

function faceCam(B, yaw, fn) { B.at(0, 0, 0, yaw, fn); }

function gateBeam(B, d, y, th, w, c, reach = 1.0) {
  if (!d.side) return;
  if (d.axis === "x") B.box(w, th, reach + w, pal(c), 0, y, -d.side * (reach / 2));
  else B.box(reach + w, th, w, pal(c), -d.side * (reach / 2), y, 0);
}

function chain(B, n, len, base, dir, bend, w0, w1, cols, y0 = 0) {
  const seg = len / n;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), off = bend * k * k, w = w0 + (w1 - w0) * k;
    B.box(w, seg * 1.08, w, pal(cols[i % cols.length]), base[0] + dir[0] * off, y0 + i * seg, base[1] + dir[1] * off);
  }
}

function orb(B, r, y, cols, n = 8) {
  const sl = 6;
  for (let i = 0; i < sl; i++) {
    const a = -1 + (2 * i + 1) / sl, rr = r * Math.sqrt(1 - a * a) * 1.04;
    B.cyl(rr, (2 * r) / sl + 0.01, pal(cols[i % cols.length]), 0, y - r + (i * 2 * r) / sl, 0, n);
  }
}

function stencilEye(B, H) {
  const s = H / 3.0;
  B.push(0, 0, 0, 0, s);
  B.rbox(1.86, 0.26, 1.7, 0.1, pal(R5C.tape));
  B.box(1.5, 0.06, 1.3, pal(R5C.plum), 0, 0.26, 0);
  faceCam(B, 0.62, () => {
    const c = 1.62;
    for (const x of [-1.02, 1.02]) {
      B.box(0.22, 2.36, 0.5, pal(R5C.plum), x, 0.26, -0.12);
      for (const y of [0.9, 1.6, 2.3]) B.box(0.26, 0.06, 0.54, pal(R5C.lilac), x, y, -0.12);
    }
    B.box(2.3, 0.14, 0.34, pal(R5C.tape), 0, 2.62, -0.12);
    B.box(0.46, c - 0.8 - 0.26, 0.4, pal(R5C.plum), 0, 0.26, -0.24);
    for (const [x, y, w, cc] of [[-0.9, c + 0.52, 0.5, R5C.cyanPale], [0.84, c + 0.6, 0.44, R5C.peach], [-0.96, c - 0.5, 0.4, R5C.rose], [0.9, c - 0.46, 0.46, R5C.cyanPale], [0, c + 0.84, 0.6, R5C.lilac]]) B.rbox(w, w * 0.6, 0.16, 0.06, pal(cc), x, y, -0.46);
    B.push(0, c, 0, 0, 1);
    upright(B, () => {
      B.prism(circle(0, 0, 0.98, 0.8, 10, 0), -0.4, -0.26, pal(R5C.peach));
      B.prism(circle(0, 0, 0.8, 0.62, 10, 0), -0.26, -0.22, pal(NEB.sclera));
      B.cyl(0.58, 0.12, pal(NEB.iris), 0, -0.14, 0, 14);
      B.cyl(0.46, 0.04, pal(NEB.irisDeep), 0, -0.02, 0, 14);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.34 : 0.44;
        B.box(0.1, 0.06, 0.1, pal(NEB.lime), Math.cos(a) * r, -0.02, Math.sin(a) * r);
      }
      B.cyl(0.28, 0.14, pal(NEB.pupil), 0, 0.08, 0, 12);
      B.box(0.1, 0.04, 0.1, pal(NEB.star), -0.14, 0.22, -0.14);
    });
    B.pop();
  });
  B.pop();
}

function ringedPlanet(B, H) {
  const s = H / 3.1;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.94, 0.24, R5C.slate, NEB.indigo);
  B.cyl(0.36, 0.24, pal(NEB.indigo), 0, 0.24, 0, 8);
  const cy = 1.34, R = 0.86;
  orb(B, R, cy, [NEB.sclera, R5C.peach, NEB.sclera, NEB.sclera, R5C.peach, NEB.sclera], 10);
  faceCam(B, 0.66, () => {
    B.push(0, cy, 0, 0, 1);
    upright(B, () => {
      B.cyl(0.5, 0.12, pal(NEB.iris), 0, 0.74, 0, 14);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.3 : 0.4;
        B.box(0.09, 0.05, 0.09, pal(NEB.lime), Math.cos(a) * r, 0.86, Math.sin(a) * r);
      }
      B.cyl(0.22, 0.1, pal(NEB.pupil), 0, 0.86, 0, 12);
      B.box(0.09, 0.03, 0.09, pal(NEB.star), -0.12, 0.96, -0.12);
    });
    B.rot([1, 0, 0], 0.5, 0, 0, 0);
    B.rot([0, 0, 1], -0.18, 0, 0, 0);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
      B.at(x * 1.28, -0.04, z * 1.28, -a, () => B.box(0.18, 0.08, 0.34, pal(R5C.ice)));
      B.at(x * 1.02, -0.03, z * 1.02, -a, () => B.box(0.14, 0.06, 0.22, pal(R5C.cyanPale)));
    }
    for (const [a, sz] of [[2.2, 0.16], [2.5, 0.12], [2.85, 0.14], [3.3, 0.1]]) B.rbox(sz, sz * 0.9, sz, 0.03, pal(NEB.rock), Math.cos(a) * 1.18, 0.04, Math.sin(a) * 1.18);
    B.at(1.28, 0.1, 0.1, 0, () => starburst(B, 0.4, 0.8));
    B.pop(); B.pop();
    B.pop();
  });
  B.pop();
}

function liddedEye(B, H) {
  const s = H / 2.8;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.96, 0.3, R5C.wine, R5C.coral);
  faceCam(B, 0.64, () => {
    const c = 1.32;
    B.box(0.8, c - 0.6 - 0.3, 0.6, pal(R5C.wine), 0, 0.3, -0.06);
    B.rbox(1.4, 0.18, 0.66, 0.06, pal(R5C.coral), 0, c - 0.74, 0);
    for (const x of [-0.44, -0.14, 0.16, 0.44]) {
      B.rot([1, 0, 0], -0.5, x, c - 0.66, 0.28);
      B.cone(0.05, 0, 0.24, pal(R5C.lashInk), 0, -0.24, 0, 4);
      B.pop();
    }
    B.push(0, c, 0, 0, 1);
    upright(B, () => {
      B.prism(circle(0, 0, 1.0, 0.64, 8, 0), -0.28, 0.22, pal(NEB.sclera));
      B.cyl(0.5, 0.08, pal(NEB.iris), 0, 0.22, 0, 12);
      B.cyl(0.34, 0.03, pal(NEB.irisDeep), 0, 0.3, 0, 12);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.32 : 0.41;
        B.box(0.09, 0.05, 0.09, pal(NEB.lime), Math.cos(a) * r, 0.3, Math.sin(a) * r);
      }
      B.cyl(0.21, 0.08, pal(NEB.pupil), 0, 0.32, 0, 10);
      B.box(0.09, 0.03, 0.09, pal(NEB.star), -0.2, 0.32, -0.2);
    });
    B.pop();
    B.rbox(1.72, 0.36, 0.86, 0.12, pal(R5C.coral), 0, c + 0.18, 0.02);
    B.rbox(1.5, 0.2, 0.7, 0.1, pal(R5C.rose), 0, c + 0.54, -0.04);
    B.rbox(1.1, 0.14, 0.5, 0.08, pal(R5C.wine), 0, c + 0.74, -0.08);
    const lashes = [[-0.78, -1], [-0.52, -0.66], [-0.26, -0.3], [0, 0], [0.26, 0.3], [0.52, 0.66], [0.78, 1]];
    for (const [x, k] of lashes) {
      const len = 1.1 - Math.abs(k) * 0.3, n = 6, seg = len / n;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), w = 0.16 - t * 0.1;
        B.box(w, seg * 1.1, w, pal(i === 0 ? R5C.wine : R5C.lashInk), x + k * 0.5 * t * t, c + 0.5 + i * seg * 0.92, 0.38 + 0.36 * t * t);
      }
    }
  });
  B.pop();
}

function caruncle(B, H) {
  const s = H / 2.8;
  B.push(0, 0, 0, 0, s);
  B.cyl(0.98, 0.16, pal(R5C.ivory), 0, 0, 0, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    B.at(Math.cos(a) * 0.72, 0.16, Math.sin(a) * 0.72, -a, () => B.box(0.5, 0.03, 0.07, pal(R5C.crimson)));
  }
  B.rbox(1.46, 0.42, 1.3, 0.16, pal(R5C.coral), 0, 0.16, 0);
  B.rbox(0.56, 0.36, 0.5, 0.14, pal(R5C.blush), -0.5, 0.3, 0.42);
  B.rbox(0.5, 0.3, 0.46, 0.12, pal(R5C.rose), 0.52, 0.34, -0.36);
  B.rbox(1.12, 0.38, 1.0, 0.14, pal(R5C.rose), 0.04, 0.58, -0.02);
  B.rbox(0.44, 0.3, 0.4, 0.12, pal(R5C.coral), 0.44, 0.7, 0.36);
  B.rbox(0.82, 0.3, 0.74, 0.12, pal(R5C.blush), -0.02, 0.96, 0.02);
  for (const [x, z, y0, h] of [[-0.7, 0.2, 0.2, 0.5], [0.66, 0.1, 0.2, 0.6], [0.1, 0.64, 0.2, 0.44], [-0.2, -0.62, 0.2, 0.52], [0.38, 0.48, 0.6, 0.4]]) B.box(0.07, h, 0.07, pal(R5C.crimson), x, y0, z);
  B.cyl(0.46, 0.14, pal(R5C.coral), 0, 1.26, 0, 12);
  B.ball(0.62, tone("#f6feff", "#c8f0fa", "#94d8ec"), 0, 1.96, 0, 0.94, 2);
  B.ball(0.16, tone("#ffffff", "#ffffff", "#e8faff"), -0.26, 2.3, 0.3, 1, 1);
  B.ball(0.12, tone("#dff8ff", "#a6e8f2", "#7ad2e6"), 0.12, 1.1, 0.6, 1.3, 1);
  B.pop();
}

function flareStar(B, H) {
  const s = H / 2.75;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.92, 0.22, R5C.dust, NEB.indigo);
  faceCam(B, 0.7, () => {
    B.push(0, 0.9, -0.1, 0, 1);
    upright(B, () => {
      B.prism(circle(0, 0, 0.78, 0.68, 10, 0), -0.2, 0.06, pal(NEB.sclera));
      B.cyl(0.6, 0.08, pal(NEB.iris), 0, 0.06, 0, 14);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.36 : 0.47;
        B.box(0.1, 0.05, 0.1, pal(NEB.lime), Math.cos(a) * r, 0.14, Math.sin(a) * r);
      }
      B.cyl(0.26, 0.1, pal(NEB.pupil), 0, 0.14, 0, 12);
    });
    B.pop();
    const cx = 0.3, cy = 1.72, cz = 0.18;
    const spike = (dx, dy, len) => {
      const n = 4, seg = len / n;
      for (let i = 0; i < n; i++) {
        const w = 0.3 - i * 0.06, c = i < 2 ? NEB.star : NEB.cyan, m = (i + 0.5) * seg;
        if (dx) B.box(seg * 1.02, w, w, pal(c), cx + dx * m, cy - w / 2, cz);
        else if (dy > 0) B.box(w, seg * 1.02, w, pal(c), cx, cy + i * seg, cz);
        else B.box(w, seg * 1.02, w, pal(c), cx, cy - (i + 1) * seg, cz);
      }
    };
    spike(0, 1, 1.38);
    spike(0, -1, 0.96);
    spike(1, 0, 0.78);
    spike(-1, 0, 1.1);
    B.rot([0, 0, 1], Math.PI / 4, cx, cy, cz);
    B.box(0.1, 1.2, 0.1, pal(NEB.cyan), 0, -0.6, 0);
    B.box(1.2, 0.1, 0.1, pal(NEB.cyan), 0, -0.05, 0);
    B.box(0.56, 0.56, 0.1, pal(R5C.cyanPale), 0, -0.28, -0.16);
    B.pop();
    B.box(0.42, 0.42, 0.42, pal(NEB.star), cx, cy - 0.21, cz);
  });
  B.pop();
}

const R5_FIG = [[/^stencil stack/i, stencilEye], [/^ringed planet/i, ringedPlanet], [/^lidded/i, liddedEye], [/^caruncle/i, caruncle], [/^flare star/i, flareStar]];

const R5 = {
  "frisket-arch"(B, H, v, d) {
    B.box(0.5, 0.16, 0.5, pal(R5C.plum));
    const along = d.axis === "x";
    const w = along ? [0.18, 0.86] : [0.86, 0.18];
    B.box(w[0], H - 0.36, w[1], pal(R5C.tape), 0, 0.16, 0);
    B.box(along ? 0.22 : 0.5, 0.7, along ? 0.5 : 0.22, pal(R5C.rose), 0, H * 0.34, 0);
    B.box(along ? 0.24 : 0.3, 0.34, along ? 0.3 : 0.24, pal(R5C.plum), 0, H * 0.34 + 0.18, 0);
    gateBeam(B, d, H - 0.26, 0.2, 0.34, R5C.tape);
    gateBeam(B, d, H - 0.3, 0.06, 0.4, R5C.peach);
  },
  "cut-stencil-sheet"(B, H, v) {
    B.box(0.46, 0.14, 0.4, pal(R5C.plum));
    B.at(0, 0.14, 0, v % 2 ? 0.5 : -0.3, () => {
      B.box(0.9, H - 0.14, 0.12, pal(R5C.tape));
      B.box(0.9, (H - 0.14) * 0.45, 0.14, pal(v % 2 ? R5C.cyanPale : R5C.peach), 0, 0, 0);
      B.box(0.9, (H - 0.14) * 0.22, 0.15, pal(v % 2 ? NEB.teal : R5C.rose), 0, 0, 0);
      B.cyl(0.2, 0.18, pal(R5C.plum), 0, (H - 0.14) * 0.66, 0, 10);
    });
  },
  "overspray-plume"(B, H, v) {
    const cols = v % 2 ? [NEB.teal, NEB.cyan, R5C.cyanPale] : [R5C.rose, R5C.peach, R5C.tape];
    const ws = [0.34, 0.58, 0.84], hh = H / 3;
    ws.forEach((w, i) => B.rbox(w, hh * 1.04, w * 0.9, Math.min(0.12, w * 0.2), pal(cols[i]), i % 2 ? 0.04 : -0.04, i * hh, 0));
    for (const [x, y, z] of [[0.4, H * 0.5, 0.2], [-0.42, H * 0.7, -0.1], [0.3, H * 0.9, -0.3]]) B.box(0.08, 0.08, 0.08, pal(cols[1]), x, y, z);
  },
  "tape-roll"(B, H) {
    const r = H * 0.5;
    B.box(0.5, 0.02, 0.18, pal(R5C.tape), 0.26, 0, 0.18);
    B.rot([0, 0, 1], Math.PI / 2, 0, r, 0);
    B.cyl(r, 0.34, pal(R5C.tape), 0, -0.17, 0, 12);
    B.cyl(r * 0.45, 0.36, pal(R5C.plum), 0, -0.18, 0, 10);
    B.pop();
  },
  "airbrush-lamp"(B, H) {
    B.box(0.4, 0.16, 0.4, pal(R5C.plum));
    B.box(0.28, 0.1, 0.28, pal(R5C.lilac), 0, 0.16, 0);
    B.cyl(0.11, H - 0.66, pal(NEB.gold), 0, 0.26, 0, 8);
    B.box(0.1, 0.12, 0.18, pal(R5C.plum), 0, H * 0.55, 0.1);
    B.cyl(0.15, 0.06, pal(R5C.plum), 0, H - 0.44, 0, 8);
    B.cone(0.12, 0.03, 0.2, pal(NEB.gold), 0, H - 0.4, 0, 8);
    B.rbox(0.26, 0.2, 0.26, 0.08, pal(NEB.cyan), 0, H - 0.22, 0);
    B.box(0.08, 0.06, 0.08, pal(NEB.star), 0.12, H - 0.08, 0.1);
  },
  "spatter-pad"(B, H, v) {
    const dots = [[-0.3, -0.2, 0.09, NEB.star], [0.2, -0.26, 0.06, NEB.cyan], [0.1, 0.1, 0.11, NEB.star], [-0.12, 0.28, 0.05, R5C.peach], [0.32, 0.26, 0.07, NEB.star], [-0.34, 0.12, 0.05, NEB.cyan], [0.02, -0.34, 0.04, NEB.star]];
    for (const [x, z, r, c] of dots) B.cyl(r, 0.04, pal(c), v % 2 ? -x : x, 0, z, 8);
  },
  "curve-template-gate"(B, H, v, d) {
    B.box(0.48, 0.16, 0.48, pal(R5C.slate));
    const along = d.axis === "x", n = 5, seg = (H - 0.4) / n, dir = d.side ? -d.side : 1;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), off = dir * 0.26 * Math.sin(k * Math.PI);
      B.box(along ? 0.16 : 0.5, seg * 1.04, along ? 0.5 : 0.16, pal(i % 2 ? NEB.cyan : R5C.cyanPale), along ? 0 : off, 0.16 + i * seg, along ? off : 0);
    }
    B.box(0.2, 0.2, 0.2, pal(NEB.star), 0, H - 0.24, 0);
    gateBeam(B, d, H - 0.3, 0.14, 0.26, R5C.cyanPale);
    gateBeam(B, d, H - 0.16, 0.05, 0.3, NEB.star);
  },
  "ring-asteroid"(B, H, v) {
    const m = v % 2 ? 1 : -1;
    B.box(0.86, 0.03, 0.34, pal(R5C.shadow), -0.08, 0, m * 0.14);
    B.box(0.5, H * 0.42, 0.46, pal(NEB.rock), 0.06, 0.03, -m * 0.04);
    wedge(B, 0.5, H * 0.32, 0.46, NEB.rock, 0.06, 0.03 + H * 0.42, -m * 0.04);
    B.rbox(0.28, H * 0.3, 0.26, 0.06, pal(R5C.dust), -0.14 * m, 0.03 + H * 0.42, 0.08);
    B.box(0.12, 0.08, 0.12, pal(NEB.cyan), 0.24, 0.03 + H * 0.4, 0.2 * m);
  },
  "shepherd-moon"(B, H) {
    B.box(0.44, 0.14, 0.44, pal(R5C.slate));
    orb(B, 0.34, 0.14 + 0.36, [NEB.violet, R5C.lilac, R5C.lilac, NEB.violet, R5C.lilac, NEB.violet], 8);
    B.box(0.14, 0.06, 0.14, pal(NEB.indigo), 0.1, 0.78, 0.1);
    B.box(0.1, 0.1, 0.06, pal(NEB.indigo), -0.12, 0.44, 0.3);
  },
  "flare-spike"(B, H) {
    B.box(0.42, 0.14, 0.42, pal(R5C.slate));
    B.box(0.28, 0.12, 0.28, pal(NEB.indigo), 0, 0.14, 0);
    B.box(0.14, H * 0.46, 0.14, pal(NEB.indigo), 0, 0.26, 0);
    B.rbox(0.26, 0.2, 0.26, 0.08, pal(NEB.cyan), 0, 0.26 + H * 0.46, 0);
    starburst(B, H - 0.02, H / 2.6);
  },
  "groove-lane"(B, H, v) {
    for (const [r, c] of [[0.3, NEB.star], [0.42, R5C.ice], [0.54, NEB.star]]) for (let i = 0; i < 5; i++) {
      const a = (v % 2 ? 0.2 : 1.8) + i * 0.3;
      B.at(Math.cos(a) * r - 0.2, 0, Math.sin(a) * r - 0.2, -a, () => B.box(0.07, 0.03, 0.17, pal(c)));
    }
  },
  "lash-arch"(B, H, v, d) {
    B.rbox(0.6, 0.2, 0.6, 0.08, pal(R5C.coral));
    B.rbox(0.44, 0.12, 0.44, 0.06, pal(R5C.rose), 0, 0.2, 0);
    const dir = d.side ? -d.side : 1, ax = d.axis === "x" ? [0, 1] : [1, 0];
    chain(B, 7, H * 0.78, [0, 0], [ax[0] * dir, ax[1] * dir], 0.42, 0.3, 0.14, [R5C.lashInk, R5C.lashInk, R5C.plum], 0.32);
    gateBeam(B, d, H * 0.78, 0.22, 0.44, R5C.coral);
    gateBeam(B, d, H * 0.78 + 0.22, 0.1, 0.34, R5C.rose);
  },
  "lash-column"(B, H, v) {
    B.rbox(0.56, 0.2, 0.56, 0.08, pal(R5C.coral));
    B.rbox(0.4, 0.1, 0.4, 0.06, pal(R5C.blush), 0, 0.2, 0);
    const dir = v % 2 ? [1, -0.3] : [-0.3, 1];
    chain(B, 8, H - 0.3, [0, 0], dir, 0.5, 0.32, 0.1, [R5C.lashInk, R5C.lashInk, R5C.lashInk, NEB.violet], 0.3);
  },
  "follicle-bulb"(B, H, v) {
    B.cyl(0.3, H * 0.45, pal(R5C.blush), 0, 0, 0, 10);
    B.rbox(0.46, H * 0.25, 0.46, 0.14, pal(R5C.coral), 0, H * 0.45, 0);
    B.box(0.1, H * 0.3, 0.1, pal(R5C.lashInk), v % 2 ? 0.05 : -0.05, H * 0.7, 0);
  },
  "gland-lamp"(B, H) {
    B.rbox(0.36, 0.14, 0.36, 0.06, pal(R5C.wine));
    B.box(0.12, H - 0.62, 0.12, pal(R5C.wine), 0, 0.14, 0);
    B.cyl(0.24, 0.14, pal(R5C.coral), 0, H - 0.5, 0, 10);
    B.ball(0.22, tone(...R5C.amber), 0, H - 0.2, 0, 1, 1);
  },
  "tear-bead"(B, H) {
    B.cyl(0.3, 0.1, pal(R5C.coral), 0, 0, 0, 10);
    B.ball(0.24, tone("#f0fdff", "#a6ecf6", "#6ed0e6"), 0, 0.32, 0, 1.15, 1);
    B.box(0.07, 0.05, 0.07, pal(NEB.star), -0.08, H - 0.1, 0.08);
  },
  "lash-shadow"(B, H, v) {
    const m = v % 2 ? 1 : -1;
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      B.box(0.14, 0.03, 0.08 - t * 0.03, pal(R5C.wine), -0.36 + t * 0.7, 0, m * (0.1 - 0.3 * t * t));
      B.box(0.12, 0.03, 0.06 - t * 0.02, pal(R5C.wine), -0.3 + t * 0.6, 0, m * (-0.2 - 0.2 * t * t));
    }
  },
  "vein-arch"(B, H, v, d) {
    B.rbox(0.52, 0.18, 0.52, 0.08, pal(R5C.ivory));
    B.rbox(0.4, H - 0.5, 0.4, 0.08, pal(R5C.ivory), 0, 0.18, 0);
    for (let i = 0; i < 4; i++) B.at(0, 0.36 + i * (H - 0.8) / 4, 0, i * 0.6, () => B.box(0.46, 0.08, 0.46, pal(i % 2 ? R5C.crimson : R5C.wine)));
    B.rbox(0.48, 0.16, 0.48, 0.06, pal(R5C.blush), 0, H - 0.32, 0);
    gateBeam(B, d, H - 0.3, 0.16, 0.2, R5C.crimson);
    gateBeam(B, d, H - 0.14, 0.06, 0.12, R5C.blush);
  },
  "porcelain-shard"(B, H, v) {
    const m = v % 2 ? 1 : -1;
    B.box(0.5, 0.12, 0.44, pal(R5C.blush));
    B.box(0.56, H * 0.55, 0.3, pal(R5C.ivory), 0, 0.12, 0);
    wedge(B, 0.56, H * 0.45 - 0.12, 0.3, R5C.ivory, 0, 0.12 + H * 0.55, 0);
    B.box(0.05, H * 0.6, 0.02, pal(R5C.crimson), m * 0.1, 0.16, 0.15);
    B.box(0.2, 0.05, 0.02, pal(R5C.crimson), m * 0.02, 0.16 + H * 0.35, 0.15);
    B.rbox(0.18, 0.14, 0.16, 0.04, pal(R5C.ivory), m * 0.34, 0.12, 0.2);
  },
  "vein-knot"(B, H, v) {
    B.rbox(0.5, 0.2, 0.46, 0.08, pal(R5C.wine));
    const br = [[0, 0, 0.9, 0], [0.3, 0.5, 0.5, 0.8], [-0.4, 0.4, 0.45, -0.6], [0.5, 0.7, 0.35, 2.2], [-0.3, 0.75, 0.3, -2.4]];
    for (const [lean, y0, len, yaw] of br) {
      B.at(0, 0.2 + y0 * (H - 0.4), 0, yaw + (v % 2 ? 0.8 : 0), () => {
        B.rot([0, 0, 1], -lean, 0, 0, 0);
        B.box(0.12 - Math.abs(lean) * 0.04, len * (H - 0.2), 0.12, pal(R5C.crimson), 0, 0, 0);
        B.box(0.16, 0.1, 0.16, pal(R5C.blush), 0, len * (H - 0.2), 0);
        B.pop();
      });
    }
  },
  "blood-disc"(B, H, v) {
    B.box(0.2, 0.14, 0.4, pal(R5C.ivory), v % 2 ? 0.22 : -0.22, 0, 0);
    B.at(0, H * 0.5, 0, v % 2 ? 0.4 : -0.4, () => {
      B.rot([1, 0, 0], Math.PI / 2 - 0.25, 0, 0, 0);
      B.cyl(H * 0.5, 0.14, pal(["#ff5a6e", "#e0405a", "#b82a46"]), 0, -0.07, 0, 12);
      B.cyl(H * 0.24, 0.16, pal(R5C.wine), 0, -0.08, 0, 10);
      B.pop();
    });
  },
  "slit-lamp"(B, H) {
    B.rbox(0.44, 0.14, 0.44, 0.06, pal(R5C.blush));
    B.box(0.16, H - 0.54, 0.16, pal(NEB.sclera), 0, 0.14, 0);
    B.box(0.44, 0.24, 0.3, pal(NEB.sclera), 0, H - 0.4, 0);
    B.box(0.46, 0.1, 0.32, pal(R5C.crimson), 0, H - 0.16, 0);
    B.box(0.5, 0.08, 0.12, pal(NEB.cyan), 0.02, H - 0.34, 0.18);
  },
  "ion-gate"(B, H, v, d) {
    B.box(0.5, 0.18, 0.5, pal(R5C.dust));
    B.cone(0.3, 0.14, H * 0.5, pal(R5C.tealGas), 0, 0.18, 0, 4);
    B.cone(0.2, 0.04, H * 0.34, pal(NEB.cyan), 0, 0.18 + H * 0.5, 0, 4);
    B.box(0.18, 0.18, 0.18, pal(NEB.star), 0, H * 0.72, 0);
    gateBeam(B, d, H * 0.74, 0.08, 0.12, NEB.star);
    gateBeam(B, d, H * 0.74 - 0.08, 0.08, 0.2, NEB.cyan);
  },
  "dust-lane-shard"(B, H, v) {
    const m = v % 2 ? 1 : -1;
    B.box(0.54, 0.14, 0.4, pal(R5C.dust));
    B.at(0, 0.14, 0, m * 0.4, () => {
      B.box(0.5, H * 0.5, 0.26, pal(R5C.dust));
      wedge(B, 0.5, H * 0.36 - 0.14, 0.26, R5C.dust, 0, H * 0.5, 0);
      B.box(0.06, H * 0.5, 0.28, pal(R5C.tealGas), 0.24, 0.1, 0);
      B.box(0.24, H * 0.3, 0.2, pal(NEB.indigo), -0.3 * m, 0, 0.1);
    });
  },
  "ion-lamp"(B, H) {
    B.box(0.32, 0.12, 0.32, pal(R5C.dust));
    B.box(0.1, H - 0.7, 0.1, pal(R5C.dust), 0, 0.12, 0);
    B.cyl(0.16, 0.08, pal(NEB.gold), 0, H - 0.58, 0, 8);
    B.cone(0.02, 0.2, 0.2, pal(NEB.cyan), 0, H - 0.5, 0, 4);
    B.cone(0.2, 0, 0.3, pal(NEB.cyan), 0, H - 0.3, 0, 4);
  },
  "star-speck"(B, H, v) {
    for (const [x, z, r] of [[-0.3, -0.24, 0.06], [0.26, 0.3, 0.05], [-0.1, 0.3, 0.04], [0.34, -0.2, 0.04], [0.02, 0.0, 0.03]]) B.cyl(r, 0.04, pal(NEB.star), v % 2 ? -x : x, 0, z, 6);
    B.box(0.3, 0.05, 0.05, pal(NEB.star), 0.1, 0.05, -0.02);
    B.box(0.05, 0.05, 0.3, pal(NEB.star), 0.1, 0.05, -0.02);
  },
};
R5["nebula-billow"] = (B, H, v) => LENS_BUILD.nebula(B, H, v, {});
R5["capillary-fork"] = (B, H, v) => LENS_BUILD.capillary(B, H, v);

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, NEB.indigo), plinthHi: pick(dt, 1, NEB.violet) };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const lead = role === "lead" || role === "creature";
    const r5fig = lead ? (R5_FIG.find(([re]) => re.test(String(p.pose || ""))) || [])[1] : null;
    catalog[t] = { footprint: lead ? [2, 2] : role === "threshold" ? [1, 1] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? (r5fig ? Math.min(3.3, Math.max(2.7, p.height || 3)) : 2.7) : Math.min(2.6, Math.max(R5[t] ? 0.1 : 0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, NEB.indigo), c1 = pick(tn, 1, NEB.violet);
    const rocky = /crag|asteroid|meteor|boulder|rock|barrier|rampart/i.test(t);
    const pose = String(p.pose || "");
    const kind = lead ? null : lensKind(t);
    const figure = /coronal ring|within/i.test(pose) ? coronalSentinel : /monolith/i.test(pose) || /singularity/i.test(t) ? pupilMonolith : null;
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (r5fig) r5fig(B, H);
      else if (!lead && R5[t]) R5[t](B, H, v, d);
      else if (lead && figure) figure(B, H);
      else if (lead) eye(B, H, look, v);
      else if (kind) LENS_BUILD[kind](B, H, v, { c0, d, gate: role === "threshold", spire: /spire|stalk/i.test(t), big: /tumbler|big/i.test(t) || H > 1 });
      else if (role === "threshold") {
        const ph = H * 0.66;
        B.box(0.5, 0.22, 0.5, pal(NEB.indigo));
        B.box(0.36, ph * 0.55, 0.36, pal(c0), 0, 0.22, 0);
        B.box(0.3, ph * 0.45, 0.3, pal(NEB.violet), 0.02, 0.22 + ph * 0.55, -0.01);
        const top = 0.22 + ph;
        B.box(0.42, 0.12, 0.42, pal(NEB.gold), 0, top, 0);
        wedge(B, 0.42, 0.26, 0.3, NEB.iris, 0, top + 0.12, 0);
        B.box(0.16, 0.16, 0.16, pal(NEB.cyan), 0, top + 0.38, 0);
        B.box(0.05, 0.34, 0.05, pal(NEB.star), 0, top + 0.3, 0.1);
        B.box(0.3, 0.05, 0.05, pal(NEB.star), 0, top + 0.44, 0.1);
        if (d.side) {
          const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(ph * 0.92, 0.16, NEB.indigo);
          beam(ph * 0.92 + 0.16, 0.08, NEB.lime);
        }
      } else if (role === "dais") {
        plinth(B, 0.42, H, c0, NEB.violet);
        B.cyl(0.24, 0.06, pal(NEB.iris), 0, H, 0, 10);
      } else if (role === "light") {
        B.box(0.28, 0.14, 0.28, pal(NEB.indigo));
        B.box(0.14, H - 0.62, 0.14, pal(c0), 0, 0.14, 0);
        B.box(0.3, 0.06, 0.3, pal(NEB.violet), 0, H - 0.48, 0);
        B.box(0.2, 0.22, 0.2, pal(NEB.cyan), 0, H - 0.42, 0);
        B.box(0.06, 0.2, 0.06, pal(NEB.star), 0, H - 0.2, 0);
        B.cone(0.2, 0, 0.16, pal(NEB.violet), 0, H - 0.2, 0, 4);
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.5, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.06, pal(NEB.indigo), 0, H * 0.5, 0, 8);
        B.box(0.14, 0.12, 0.14, pal(v % 2 ? NEB.cyan : NEB.lime), -0.05, H * 0.5 + 0.06, 0.02);
        B.box(0.1, 0.14, 0.1, pal(NEB.gold), 0.07, H * 0.5 + 0.06, -0.04);
      } else if (role === "mass" && rocky) rocks(B, H, NEB.rock, c1, v);
      else if (role === "mass") {
        const tiers = v % 2 ? [0.84, 0.7, 0.56, 0.42, 0.28] : [0.8, 0.64, 0.48, 0.32];
        const trunkH = 0.4, hh = (H - trunkH - 0.16) / tiers.length;
        B.box(0.42, 0.1, 0.42, pal(NEB.indigo), 0, 0, 0);
        B.box(0.26, trunkH, 0.26, pal(NEB.lash), 0, 0.1, 0);
        const cols = v % 2 ? [NEB.teal, NEB.teal, NEB.iris, NEB.iris, NEB.violet] : [NEB.iris, NEB.iris, NEB.violet, NEB.violet];
        tiers.forEach((w, i) => B.rbox(w, hh * 0.92, w, 0.05, pal(cols[i]), 0, trunkH + i * hh, 0));
        B.cone(0.12, 0, 0.16, pal(NEB.lime), 0, H - 0.16, 0, 4);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const CLIFFS = [
  { cliffUpper: { left: "#8a62cc", right: "#6c48ae", seam: "#553894" }, cliffLower: { left: "#5c4cb0", right: "#473a92", seam: "#352b76", speck: "#2a2262" }, bg: "#171428" },
  { cliffUpper: { left: "#5a64c8", right: "#4550a8", seam: "#353e8a" }, cliffLower: { left: "#46479e", right: "#383882", seam: "#2a2a68", speck: "#212056" }, bg: "#121428" },
  { cliffUpper: { left: "#a4629e", right: "#864a82", seam: "#6c386a" }, cliffLower: { left: "#6a4aa6", right: "#54398a", seam: "#402a70", speck: "#32205c" }, bg: "#1a1226" },
];

function nebula(level) {
  const k = Math.max(0, (+String(level.name).split("-").pop() || 1) - 1) % 3;
  const C = CLIFFS[k];
  level.palette.cliffUpper = C.cliffUpper;
  level.palette.cliffLower = C.cliffLower;
  level.palette.bg = C.bg;
  level.bg = C.bg;
}

function resurface(level, h) {
  const cells = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c)) cells.push([x, z, c]); }
  const sf = h.surf || {};
  const repl = [sf.ground, sf.raised].find((t) => t && t !== "stone") || "grass";
  const near = (x, z) => h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 1);
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length / Math.max(1, cells.length) > 0.25) {
    for (const [x, z, c] of stone) if (!near(x, z) && (x * 7 + z * 13) % 6 !== 0) c.s = repl;
    h.log.push(`resurface: ${stone.length} stone of ${cells.length} land to ${repl}, accents kept`);
  }
  const lone = cells.filter(([x, z, c]) => c.s === "stone" && !near(x, z) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "stone"));
  for (const [, , c] of lone) c.s = repl;
  if (lone.length) h.log.push(`resurface: ${lone.length} lone stone pads to ${repl}`);
}

function dropPuddles(level, h) {
  const seen = new Set();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    if (seen.has(h.key(x, z)) || h.cell(x, z)?.s !== "water") continue;
    const comp = [], st = [[x, z]];
    seen.add(h.key(x, z));
    while (st.length) {
      const [a, b] = st.pop();
      comp.push([a, b]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = h.key(a + dx, b + dz);
        if (!seen.has(k) && h.cell(a + dx, b + dz)?.s === "water") { seen.add(k); st.push([a + dx, b + dz]); }
      }
    }
    if (comp.length >= 6) continue;
    for (const [a, b] of comp) h.set(a, b, { h: 0, s: "none" });
    h.log.push(`dropPuddles: ${comp.length} stray water cells to void`);
  }
}

function torches(level, h, r, t, g) {
  const onRoute = new Set(r.map(([x, z]) => h.key(x, z)));
  const far = (x, z) => h.figure.cells.every(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) > 1);
  let n = 0, last = -9;
  for (let i = 1; i < r.length && n < 4; i++) {
    if (i - last < 3) continue;
    const [x, z] = r[i];
    if (g && Math.abs(g[0] - x) + Math.abs(g[1] - z) <= 1) continue;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const a = x + dx, b = z + dz, c = h.cell(a, b);
      if (onRoute.has(h.key(a, b)) || !h.land(c) || c.s === "ramp" || h.decorAt(a, b).length || !far(a, b)) continue;
      const miss0 = h.reach().missing.length;
      if (!h.put(t, a, b)) continue;
      if (h.reach().missing.length > miss0) { level.decor.pop(); continue; }
      n++; last = i;
      break;
    }
  }
  h.log.push(`torches ${t} x${n}`);
}

function flattenSpikes(level, h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || c.h < 2 || h.figure.cells.some(([a, b]) => a === x && b === z)) continue;
    const ns = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => h.cell(x + dx, z + dz)).filter((e) => h.land(e) || e?.s === "ramp");
    if (ns.some((e) => e.h >= c.h)) continue;
    const lo = Math.max(1, ...ns.map((e) => e.h));
    h.set(x, z, { h: lo, s: c.s });
    n++;
  }
  if (n) h.log.push(`flattenSpikes: ${n} lone raised cells lowered`);
}

function fillPits(level, h) {
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const seen = new Set();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (seen.has(h.key(x, z)) || !h.land(c) || c.s === "ramp") continue;
    const comp = [], st = [[x, z]], rim = [];
    seen.add(h.key(x, z));
    while (st.length) {
      const [a, b] = st.pop();
      comp.push([a, b]);
      for (const [dx, dz] of N4) {
        const e = h.cell(a + dx, b + dz), k = h.key(a + dx, b + dz);
        if (!e || e.s === "none" || e.s === "water") { rim.push(null); continue; }
        if (e.s !== "ramp" && e.h === c.h) { if (!seen.has(k)) { seen.add(k); st.push([a + dx, b + dz]); } continue; }
        rim.push([a + dx, b + dz, e]);
      }
    }
    if (comp.length > 3 || rim.includes(null) || !rim.every(([, , e]) => e.h > c.h)) continue;
    if (comp.some(([a, b]) => h.figure.cells.some(([p, q]) => p === a && q === b))) continue;
    const walls = rim.filter(([, , e]) => e.s !== "ramp").map(([, , e]) => e.h);
    const to = walls.length ? Math.min(...walls) : c.h + 1;
    const before = h.reach().reached;
    const saved = [...comp, ...rim.filter(([, , e]) => e.s === "ramp")].map(([a, b]) => [a, b, { ...h.cell(a, b) }]);
    for (const [a, b] of comp) h.set(a, b, { h: to, s: h.cell(a, b).s });
    for (const [a, b, e] of rim) if (e.s === "ramp" && e.h === to) h.set(a, b, { h: to, s: (h.surf || {}).raised === "stone" ? "grass" : (h.surf || {}).raised || "grass" });
    if (h.reach().reached < before - 1) { for (const [a, b, o] of saved) h.set(a, b, o); continue; }
    h.log.push(`fillPits: ${comp.length} cells raised to h${to}`);
  }
}

function rampTone(level, h) {
  const mats = level.materials?.ramp || ["stone", "sand", "grass", "dirt"];
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c?.s !== "ramp" || !h.DIRS[c.d]) continue;
    const [dx, dz] = h.DIRS[h.OPPOSITE[c.d]];
    const up = h.cell(x + dx, z + dz);
    const m = up && mats.includes(up.s) ? up.s : null;
    if (m && m !== c.m) { c.m = m; n++; }
  }
  if (n) h.log.push(`rampTone: ${n} ramps take their uphill surface`);
}

function backed(level, h) {
  const small = new Set([...h.ofRole("offering"), "pot", "chest", "flower", "gem"]);
  const hit = level.decor.filter((d) => small.has(d.t) && [[-1, 0], [0, -1]].some(([dx, dz]) => (h.cell(d.x + dx, d.z + dz)?.h || 0) > (h.cell(d.x, d.z)?.h || 0)));
  if (hit.length) { h.removeDecor((d) => hit.includes(d)); h.log.push(`backed: removed ${hit.length} small props against taller cliffs`); }
}

function spareRamps(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c?.s !== "ramp" || on.has(h.key(x, z))) continue;
    const r0 = h.reach();
    const [dx, dz] = h.DIRS[c.d] || [0, 0];
    const lo = h.cell(x + dx, z + dz);
    const saved = { ...c };
    h.set(x, z, { h: c.h, s: lo && h.land(lo) ? lo.s : "grass" });
    const r1 = h.reach();
    if (r1.missing.length > r0.missing.length || r1.reached < r0.reached - 1) { h.set(x, z, saved); continue; }
    n++;
  }
  if (n) h.log.push(`spareRamps: ${n} off-route ramps flattened`);
}

function thin(level, h, target) {
  const keep = new Set([...h.ofRole("lead"), ...h.ofRole("threshold"), ...h.ofRole("light"), "torch", "lantern"]);
  const lead = level.decor.find((d) => d.x === h.figure.anchor[0] && d.z === h.figure.anchor[1]);
  const rank = (d) => (/rock|crag|meteor|asteroid|barrier/.test(d.t) ? 0 : /tree|pine|cypress|pylon/.test(d.t) ? 1 : 2);
  let n = 0;
  while (h.reach().reached < target) {
    const cand = level.decor.filter((d) => d !== lead && !keep.has(d.t) && !h.role(d.t)?.includes?.("lead") && h.blockedSet().has(h.key(d.x, d.z)));
    if (!cand.length) break;
    cand.sort((a, b) => rank(a) - rank(b) || ((a.x * 7 + a.z * 13) % 5) - ((b.x * 7 + b.z * 13) % 5));
    const d = cand[0];
    h.removeDecor((e) => e === d);
    n++;
  }
  if (n) h.log.push(`thin: removed ${n} blockers, reach ${h.reach().reached}`);
}

const LOOK = {
  medium: {
    grass: { top: "#5b7fe0", fringe: "#4866c4", fringeDark: "#34509e", speck: "#c4f25e" },
    sand: { top: "#f6e2c8", lip: "#dcbd9c", edge: "#e8cdb0", dots: "#fff4e4" },
    dirt: { top: "#eaa994", patch: "#f2bfae", mottle: "#d48c7c", border: "#b86e62" },
    stone: { top: "#5a9ee8", pebble: "#8cc4ff", pebbleShade: "#3a6cc0", rim: "#2c4f94" },
    cliffUpper: { left: "#3fa0a4", right: "#2c7c82", seam: "#1e5a60" },
    cliffLower: { left: "#3c4a78", right: "#2c3660", seam: "#1e264a", speck: "#5a6ca0" },
    bg: "#101626",
    light: { dir: [-0.35, 1, 0.55], ambient: 0.9, sun: 0.2 },
  },
  subject: {
    grass: { top: "#62d68e", fringe: "#3fb872", fringeDark: "#2a9058", speck: "#c4f25e" },
    dirt: { top: "#f0d8c0", patch: "#e2c4a6", mottle: "#caa888", border: "#a88a6e" },
    cliffUpper: { left: "#5a7ec0", right: "#44609e", seam: "#304680" },
    cliffLower: { left: "#4a3c7a", right: "#382c60", seam: "#281e48", speck: "#6ad8c0" },
    bg: "#2a1a30",
    light: { dir: [0.7, 1, 0.2], ambient: 0.66, sun: 0.45 },
  },
  composition: {
    grass: { top: "#6c5ce0", fringe: "#5446c0", fringeDark: "#3e3298", speck: "#c4f25e" },
    dirt: { top: "#d9907c", patch: "#e6a690", mottle: "#c07866", border: "#9c5a4c" },
    sand: { top: "#f4e6d2", lip: "#dac6aa", edge: "#e6d4bc", dots: "#fffaf0" },
    stone: { top: "#fffaf0", pebble: "#ffffff", pebbleShade: "#d8d0c0", rim: "#b8b0a0" },
    cliffUpper: { left: "#2e4878", right: "#22365c", seam: "#172644" },
    cliffLower: { left: "#262040", right: "#1c1830", seam: "#120e20", speck: "#c4f25e" },
    bg: "#08070e",
    light: { dir: [0.6, 1, -0.3], ambient: 0.6, sun: 0.5 },
  },
};

function lensLook(level, lens) {
  const L = LOOK[lens];
  if (!L) return;
  for (const [k, v] of Object.entries(L)) {
    if (k === "bg") level.bg = level.palette.bg = v;
    else if (k === "light") level.light = { ...(level.light || {}), ...v };
    else level.palette[k] = { ...(level.palette[k] || {}), ...v };
  }
}

function frontSpawn(level, h, lo, hi, score = (x, z) => z * 1.2 + x * 0.4) {
  let best = null;
  const blocked = h.blockedSet();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || blocked.has(h.key(x, z))) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; })) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo || q.length > hi) continue;
    const sc = score(x, z) + q.length * 0.1;
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; h.log.push(`frontSpawn ${level.spawn}`); }
  return h.approach();
}

function scatter(level, h, t, n, pred) {
  if (!t || !level.palette?.props?.[t]) return 0;
  const onR = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  const cand = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || onR.has(h.key(x, z))) continue;
    if (h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 1)) continue;
    if (level.palette.props[t].passable && [[1, 0], [0, 1]].some(([dx, dz]) => { const q = h.cell(x + dx, z + dz); return !h.land(q) || q.h < c.h; })) continue;
    const sc = pred(x, z, c);
    if (sc != null) cand.push([sc, x, z]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  let k = 0;
  for (const [, x, z] of cand) {
    if (k >= n) break;
    const miss = h.reach().missing.length, got = h.reach().reached;
    if (!h.put(t, x, z, { v: (x + z) % 2 })) continue;
    const r = h.reach();
    if (r.missing.length > miss || r.reached < got - (level.palette.props[t].passable ? 0 : 1)) { level.decor.pop(); continue; }
    k++;
  }
  h.log.push(`scatter ${t} x${k}`);
  return k;
}

function streak(level, h) {
  const [ax, az] = h.figure.anchor;
  let n = 0;
  level.streak = [];
  for (let k = 2; k < 14; k++) {
    const x = ax + 1 + k, z = az + Math.round(k * 0.35);
    const c = h.cell(x, z);
    if (!c || c.s === "none") { if (n) break; continue; }
    if (!h.land(c) || c.s === "ramp" || c.s === "water") continue;
    c.s = "stone";
    level.streak.push(h.key(x, z));
    n++;
  }
  h.log.push(`streak ${n} cells`);
}

function levelRamps(h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = h.cell(x - dx, z - dz), dn = h.cell(x + dx, z + dz);
    if (h.land(up) && up.s !== "ramp" && up.h === c.h && h.land(dn) && dn.h === c.h - 1) continue;
    h.set(x, z, { h: c.h, s: c.m && c.m !== "stone" ? c.m : h.surf.ground });
    n++;
  }
  if (n) h.log.push(`levelRamps ${n}`);
}

function gradient(level, h, keep) {
  const by = { 1: "sand", 2: "dirt", 3: "grass" };
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || keep.has(h.key(x, z))) continue;
    const near = h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) === 1);
    const to = by[c.h] || "sand";
    if (c.s !== to) { c.s = to; n++; }
  }
  h.log.push(`gradient ${n}`);
}

function disc(level, h, rad, min) {
  const [ax, az] = h.figure.anchor, cx = ax + 0.5, cz = az + 0.5;
  const cells = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp") continue;
    const d = Math.hypot(x - cx, (z - cz) * 1.15);
    if (d > rad) cells.push([d, x, z]);
  }
  cells.sort((a, b) => b[0] - a[0]);
  let n = 0;
  for (const [, x, z] of cells) {
    if (level.spawn[0] === x && level.spawn[1] === z) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "ramp")) continue;
    if (h.walkN() <= min) break;
    const saved = { ...h.cell(x, z) }, dec = h.decorAt(x, z);
    const r0 = h.reach();
    h.removeDecor((d) => dec.includes(d));
    h.set(x, z, { h: 0, s: "none" });
    const r1 = h.reach();
    if (r1.missing.length > r0.missing.length || h.walkN() < min) { h.set(x, z, saved); level.decor.push(...dec); continue; }
    n++;
  }
  h.log.push(`disc: bit ${n} cells, walk ${h.walkN()}`);
}

function frontStairs(level, h) {
  const [ax, az] = h.figure.anchor;
  const flat = (x, z, hh) => { const c = h.cell(x, z); return h.land(c) && c.s !== "ramp" && c.h === hh; };
  const steps = [];
  for (const hh of [2, 3]) {
    let best = null;
    for (let z = az + 1; z < h.D; z++) for (let x = 0; x < h.W; x++) {
      if (!flat(x, z, hh) || !flat(x, z - 1, hh) || !flat(x, z + 1, hh - 1) || h.isFig(x, z)) continue;
      const prev = steps[steps.length - 1];
      const sc = Math.abs(x - ax - 0.5) + (prev ? Math.abs(x - prev[0]) * 2 : 0) - z * 0.2;
      if (!best || sc < best[0]) best = [sc, x, z];
    }
    if (best) { h.stairs(best[1], best[2], "s", { m: hh === 3 ? "grass" : "dirt" }); steps.push([best[1], best[2]]); }
  }
  h.log.push(`frontStairs ${JSON.stringify(steps)}`);
  return steps;
}

function flareAt(level, h, t) {
  if (!t || level.decor.some((d) => d.t === t)) return;
  const [ax, az] = h.figure.anchor;
  const fc = h.cell(ax, az);
  for (const [x, z] of [[ax + 2, az + 1], [ax + 2, az], [ax + 2, az + 2], [ax + 3, az + 1], [ax + 1, az + 2], [ax - 1, az - 1]]) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || c.h < fc.h - 1 || h.decorAt(x, z).length) continue;
    const r0 = h.reach().missing.length;
    if (!h.put(t, x, z)) continue;
    if (h.reach().missing.length > r0) { level.decor.pop(); continue; }
    h.log.push(`flareAt ${x},${z}`);
    return;
  }
}

function growRing(level, h, min) {
  const [ax, az] = h.figure.anchor;
  let n = 0;
  for (let guard = 0; guard < 40 && h.walkN() < min; guard++) {
    let best = null;
    for (let z = 1; z < h.D - 1; z++) for (let x = ax + 5; x < h.W - 1; x++) {
      const c = h.cell(x, z);
      if (c && c.s !== "none") continue;
      const d = Math.hypot(x - ax - 1, z - az - 1);
      if (d < 6.6 || d > 10.6) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => h.cell(x + dx, z + dz)).filter((q) => h.land(q) && q.s !== "ramp" && q.h === 1);
      if (!nb.length) continue;
      const sc = d - nb.length;
      if (!best || sc < best[0]) best = [sc, x, z];
    }
    if (!best) break;
    h.set(best[1], best[2], { h: 1, s: "sand" });
    n++;
  }
  h.log.push(`growRing ${n}, walk ${h.walkN()}`);
}

function globe(level, h) {
  const [ax, az] = h.figure.anchor;
  const x0 = ax, x1 = ax + 1, z0 = az, z1 = az + 1, mid = x1 + 3;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    const ox = Math.max(x0 - x, x - x1, 0), oz = Math.max(z0 - z, z - z1, 0), db = Math.max(ox, oz);
    if (x <= mid) {
      const bridge = x === mid && (z === z0 || z === z1);
      const keep = db <= 2 || (db === 3 && (x > x1 || z > z1 || x < x0) && !(z < z0 && ox + oz >= 5)) || bridge;
      if (!keep) { if (h.land(c)) { h.removeDecor((e) => e.x === x && e.z === z); h.set(x, z, { h: 0, s: "none" }); } continue; }
      const hh = db <= 1 ? 3 : db === 2 ? 2 : 1;
      h.set(x, z, { h: hh, s: hh === 3 ? "grass" : hh === 2 ? "sand" : "dirt" });
      if (h.isFig(x, z)) continue;
    } else if (h.land(c)) {
      const d = Math.hypot(x - x1, z - z1);
      const onBridge = z === z0 || z === z1;
      if (d > 9.6 || (d > 4.2 && d < 6.6 && !onBridge)) { h.removeDecor((e) => e.x === x && e.z === z); h.set(x, z, { h: 0, s: "none" }); continue; }
      h.set(x, z, { h: 1, s: "sand" });
    } else if ((z === z0 || z === z1) && Math.hypot(x - x1, z - z1) < 7) h.set(x, z, { h: 1, s: "sand" });
  }
  const put = (hh) => {
    let best = null;
    for (const dir of ["e", "s", "w", "n"]) {
      const [dx, dz] = h.DIRS[dir];
      for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
        const c = h.cell(x, z), up = h.cell(x - dx, z - dz), dn = h.cell(x + dx, z + dz);
        if (!h.land(c) || c.s === "ramp" || c.h !== hh || h.isFig(x, z) || h.isFig(x - dx, z - dz)) continue;
        if (!h.land(up) || up.s === "ramp" || up.h !== hh || !h.land(dn) || dn.s === "ramp" || dn.h !== hh - 1) continue;
        const sc = Math.abs(z - z1 - 1.5) + Math.abs(x - mid) * 0.5 + (dir === "e" ? 0 : 1);
        if (!best || sc < best[0]) best = [sc, x, z, dir];
      }
    }
    if (best) h.stairs(best[1], best[2], best[3], { m: "sand" });
    return best;
  };
  const r2 = put(2), r3 = put(3);
  h.log.push(`globe: anchor ${ax},${az} ramps ${r2 && r2.slice(1)} ${r3 && r3.slice(1)}, walk ${h.walkN()}`);
}

const R5LOOK = {
  frisket: { bg: "#efe3d3", light: { dir: [-0.2, 1, 0.5], ambient: 0.92, sun: 0.16 } },
  ringway: { bg: "#0c1024", light: { dir: [0.85, 0.9, 0.1], ambient: 0.64, sun: 0.46 } },
  lashline: { bg: "#2a1020", light: { dir: [-0.8, 0.9, 0.2], ambient: 0.76, sun: 0.4 } },
  veinfield: { bg: "#2c0a14", light: { dir: [0.1, 1, 0.3], ambient: 0.9, sun: 0.22 } },
  nebula: { bg: "#070812", light: { dir: [0.3, 1, 0.6], ambient: 0.82, sun: 0.28 } },
};

const N4R = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function plates(level, h) {
  const seen = new Set(), comps = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (seen.has(h.key(x, z)) || !h.land(c) || c.s === "ramp") continue;
    const comp = [], st = [[x, z]];
    seen.add(h.key(x, z));
    while (st.length) {
      const [a, b] = st.pop();
      comp.push([a, b]);
      for (const [dx, dz] of N4R) {
        const e = h.cell(a + dx, b + dz), k = h.key(a + dx, b + dz);
        if (!seen.has(k) && h.land(e) && e.s !== "ramp" && e.h === c.h) { seen.add(k); st.push([a + dx, b + dz]); }
      }
    }
    comps.push(comp);
  }
  return comps;
}

function sprayPlates(level, h) {
  const comps = plates(level, h).map((c) => ({ c, k: c.reduce((a, [x, z]) => a + x - z, 0) / c.length }));
  const cells = [];
  for (const { c } of comps) for (const p of c) cells.push(p);
  const steps = ["sand", "dirt", "grass"];
  comps.sort((a, b) => a.k - b.k);
  let acc = 0;
  for (const q of comps) {
    const mid = (acc + q.c.length / 2) / cells.length;
    acc += q.c.length;
    const s = steps[Math.min(2, Math.floor(mid * 3))];
    for (const [x, z] of q.c) h.cell(x, z).s = s;
  }
  h.log.push(`sprayPlates ${comps.length} plates`);
}

function ringTerrain(level, h) {
  const [ax, az] = h.figure.anchor, cx = ax + 1.5, cz = az + 2.6;
  const rx = 11.5, rz = 5.2, u0 = 82, u1 = 262;
  const band = (x, z) => {
    const ex = (x + 0.5 - cx) / rx, ez = (z + 0.5 - cz) / rz, r = Math.hypot(ex, ez);
    let u = (Math.atan2(ez, ex) * 180) / Math.PI;
    if (u < 0) u += 360;
    return { r, u, t: (u - u0) / (u1 - u0) };
  };
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    h.removeDecor((d) => d.x === x && d.z === z);
    const shoulder = x >= ax - 1 && x <= ax + 2 && z >= az - 1 && z <= az + 2;
    const { r, u, t } = band(x, z);
    const onBand = x > 0 && z > 0 && x < h.W - 1 && z < h.D - 1 && r >= 0.43 && r <= 1.0 && u >= u0 && u <= u1;
    if (shoulder || h.isFig(x, z)) { h.set(x, z, { h: 3, s: "grass" }); continue; }
    if (!onBand) { h.set(x, z, { h: 0, s: "none" }); continue; }
    const hh = t < 0.34 ? 1 : t < 0.68 ? 2 : 3;
    const outer = r > 0.84, inner = r < 0.62;
    h.set(x, z, { h: hh, s: outer ? "sand" : inner ? "grass" : "dirt" });
  }
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.h !== 3 || (x >= ax - 1 && x <= ax + 2 && z >= az - 1 && z <= az + 2)) continue;
    const d = Math.abs(x - (ax - 1)) + Math.abs(z - (az - 1));
    if (!best || d < best[0]) best = [d, x, z];
  }
  if (best) {
    let [, x, z] = best;
    while (x !== ax - 1 || z !== az - 1) {
      if (x !== ax - 1) x += Math.sign(ax - 1 - x); else z += Math.sign(az - 1 - z);
      const c = h.cell(x, z);
      if (!h.land(c)) h.set(x, z, { h: 3, s: "dirt" });
    }
  }
  const mid = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c)) continue;
    const { r, t } = band(x, z);
    if (Math.abs(r - 0.73) < 0.1) mid.push([t, x, z]);
  }
  mid.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < mid.length; i++) {
    const [, x, z] = mid[i], c = h.cell(x, z);
    for (const [dx, dz] of N4R) {
      const lo = h.cell(x + dx, z + dz), hi = h.cell(x - dx, z - dz);
      if (h.land(lo) && lo.s !== "ramp" && lo.h === c.h - 1 && h.land(hi) && hi.s !== "ramp" && hi.h === c.h && c.s !== "ramp") {
        const dir = Object.keys(h.DIRS).find((k) => h.DIRS[k][0] === dx && h.DIRS[k][1] === dz);
        if (!mid.some(([, a, b]) => h.cell(a, b)?.s === "ramp" && h.cell(a, b).h === c.h)) h.stairs(x, z, dir, { m: c.s });
      }
    }
  }
  const [sx, sz] = level.spawn;
  if (!h.land(h.cell(sx, sz))) {
    let q = null;
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.h === 1 && c.s !== "ramp") { const d = Math.abs(x - sx) + Math.abs(z - sz); if (!q || d < q[0]) q = [d, x, z]; } }
    let [, x, z] = q;
    while (x !== sx || z !== sz) { if (x !== sx) x += Math.sign(sx - x); else z += Math.sign(sz - z); if (!h.land(h.cell(x, z))) h.set(x, z, { h: 1, s: "sand" }); }
  }
  h.repair();
  h.log.push(`ringTerrain anchor ${ax},${az}, walk ${h.walkN()}`);
}

function tierRamps(level, h, order) {
  let n = 0;
  for (let i = 1; i < order.length; i++) {
    const [x0, z0] = order[i - 1], [x1, z1] = order[i];
    const a = h.cell(x0, z0), b = h.cell(x1, z1);
    if (!h.land(a) || !h.land(b) || Math.abs(x0 - x1) + Math.abs(z0 - z1) !== 1 || Math.abs(a.h - b.h) !== 1 || a.s === "ramp" || b.s === "ramp") continue;
    const [hi, lo] = a.h > b.h ? [[x0, z0], [x1, z1]] : [[x1, z1], [x0, z0]];
    const dx = lo[0] - hi[0], dz = lo[1] - hi[1];
    const up = h.cell(hi[0] - dx, hi[1] - dz);
    if (!h.land(up) || up.s === "ramp" || up.h !== h.cell(...hi).h || h.isFig(...hi)) continue;
    const dir = Object.keys(h.DIRS).find((k) => h.DIRS[k][0] === dx && h.DIRS[k][1] === dz);
    h.stairs(hi[0], hi[1], dir, { m: h.cell(...hi).s });
    n++;
  }
  return n;
}

function orderPath(cells, start) {
  const left = cells.slice(), out = [];
  let cur = start;
  while (left.length) {
    left.sort((a, b) => Math.abs(a[0] - cur[0]) + Math.abs(a[1] - cur[1]) - Math.abs(b[0] - cur[0]) - Math.abs(b[1] - cur[1]));
    cur = left.shift();
    out.push(cur);
  }
  return out;
}

function nebulaCoil(level, h) {
  const [ax, az] = h.figure.anchor, cx = ax + 1, cz = az + 0.8;
  const sx = 1.45, sz = 1, r0 = 5.6, turns = 1.05, a0 = 1.9, w = 1.4, rin = 2.2;
  const k = (r0 - rin) / (turns * 2 * Math.PI), T = turns * 2 * Math.PI;
  const arm = (x, z) => {
    const dx = (x + 0.5 - cx) / sx, dz = (z + 0.5 - cz) / sz, r = Math.hypot(dx, dz);
    let phi = Math.atan2(dz, dx) - a0;
    phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let best = null;
    for (let wd = 0; wd < 3; wd++) { const th = phi + wd * 2 * Math.PI; if (th > T) break; const d = Math.abs(r - (r0 - k * th)); if (d <= w) best = [th / T, d]; }
    return best;
  };
  const tier = (t) => (t < 0.34 ? 1 : t < 0.67 ? 2 : 3);
  const surf = { 1: "dirt", 2: "grass", 3: "sand" };
  const mid = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    h.removeDecor((d) => d.x === x && d.z === z && !h.isFig(x, z));
    const apron = Math.abs(x + 0.5 - cx) <= 2 && Math.abs(z + 0.5 - cz) <= 2;
    const a = arm(x, z);
    const orig = level.spawn[0] === x && level.spawn[1] === z;
    if (apron || h.isFig(x, z)) { h.set(x, z, { h: 3, s: "sand" }); continue; }
    if (x <= 0 || z <= 0 || x >= h.W - 1 || z >= h.D - 1 || (!a && !orig)) { h.set(x, z, { h: 0, s: "none" }); continue; }
    const hh = a ? tier(a[0]) : 1;
    h.set(x, z, { h: hh, s: surf[hh] });
    if (a && a[1] <= 0.55) mid.push([a[0], x, z]);
  }
  mid.sort((p, q) => p[0] - q[0]);
  const r = tierRamps(level, h, mid.map(([, x, z]) => [x, z]));
  h.repair();
  h.log.push(`nebulaCoil ${mid.length} spine cells, ${r} tier ramps, walk ${h.walkN()}`);
}

function veinSlabs(level, h) {
  const [ax, az] = h.figure.anchor;
  const S = [[ax + 1, az + 1, 3], [3, 3, 2], [12.5, 3, 2], [3.5, 8.8, 1], [11.5, 8.8, 1]];
  const pairs = [[4, 3], [3, 1], [1, 0], [4, 2]];
  const core = (x, z) => x >= ax - 1 && x <= ax + 2 && z >= az - 1 && z <= az + 2;
  const moat = (x, z) => !core(x, z) && x >= ax - 2 && x <= ax + 3 && z >= az - 2 && z <= az + 3;
  const near = (x, z) => S.slice(1).map(([sx, sz], i) => [Math.hypot(x + 0.5 - sx, (z + 0.5 - sz) * 1.15), i + 1]).sort((a, b) => a[0] - b[0]);
  const inMask = (x, z) => {
    const r = Math.hypot((x + 0.5 - 7.8) / 7.6, (z + 0.5 - 5.8) / 5.6) + (((x * 7 + z * 13) % 5) - 2) * 0.03;
    return x > 0 && z > 0 && x < h.W - 1 && z < h.D - 1 && r <= 1.02;
  };
  const seam = (x, z) => { const n = near(x, z); return moat(x, z) || n[1][0] - n[0][0] < 0.8; };
  const cross = new Map(), lines = [];
  for (const [a, b] of pairs) {
    let x = Math.floor(S[a][0]), z = Math.floor(S[a][1]);
    const bx = Math.floor(S[b][0]), bz = Math.floor(S[b][1]), line = [[x, z]];
    while (x !== bx || z !== bz) {
      const rx = Math.abs(bx - x), rz = Math.abs(bz - z);
      if (rx >= rz) x += Math.sign(bx - x); else z += Math.sign(bz - z);
      line.push([x, z]);
    }
    lines.push(line);
    for (const [px, pz] of line) if (!core(px, pz) && seam(px, pz)) cross.set(h.key(px, pz), Math.min(S[a][2], S[b][2]));
  }
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    h.removeDecor((d) => d.x === x && d.z === z && !h.isFig(x, z));
    const orig = level.spawn[0] === x && level.spawn[1] === z;
    if (core(x, z)) { h.set(x, z, { h: 3, s: h.isFig(x, z) || (x + z) % 3 ? "sand" : "stone" }); continue; }
    if (!inMask(x, z) && !orig) { h.set(x, z, { h: 0, s: "none" }); continue; }
    const k = h.key(x, z);
    if (cross.has(k)) { h.set(x, z, { h: cross.get(k), s: "dirt" }); continue; }
    if (seam(x, z) && !orig) { h.set(x, z, { h: 0, s: "none" }); continue; }
    const hh = S[near(x, z)[0][1]][2];
    h.set(x, z, { h: hh, s: hh === 2 ? "grass" : "sand" });
  }
  let n = 0;
  for (const line of lines) n += tierRamps(level, h, line);
  h.repair();
  h.log.push(`veinSlabs ${cross.size} crossings, ${n} ramps, walk ${h.walkN()}`);
}

function lashTemple(level, h) {
  const [ax, az] = h.figure.anchor;
  const mx = ax + 0.5;
  const land = (x, z) => h.land(h.cell(x, z)) || h.cell(x, z)?.s === "ramp";
  const mask = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const m = Math.round(2 * mx - x);
    if (land(x, z) || (m >= 0 && m < h.W && land(m, z))) mask.push([x, z]);
  }
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) if (!mask.some(([a, b]) => a === x && b === z)) h.set(x, z, { h: 0, s: "none" });
  const front = az + 5;
  for (const [x, z] of mask) {
    if (x <= 0 || x >= h.W - 1 || z <= 0 || z >= h.D - 1) { h.set(x, z, { h: 0, s: "none" }); continue; }
    const ox = Math.abs(x - mx);
    const hh = z <= az + 2 && ox <= 3 ? 3 : z <= front ? 2 : 1;
    h.set(x, z, { h: hh, s: hh === 3 ? "grass" : hh === 2 ? "dirt" : "sand" });
  }
  const rows = (z) => mask.filter(([x, zz]) => zz === z && h.land(h.cell(x, z))).map(([x]) => x);
  const r2 = rows(front), sides = [Math.min(...r2), Math.max(...r2)];
  const out = [];
  for (const x of sides) {
    const xi = x + (x < mx ? 1 : -1);
    if (h.land(h.cell(xi, front + 1)) && h.cell(xi, front + 1).h === 1) { h.stairs(xi, front, "s", { m: "dirt" }); out.push([xi, front]); }
  }
  for (const x of [Math.floor(mx), Math.ceil(mx)]) { h.stairs(x, az + 2, "s", { m: "grass" }); out.push([x, az + 2]); }
  h.repair();
  h.log.push(`lashTemple axis ${mx}, stairs ${JSON.stringify(out)}, walk ${h.walkN()}`);
}

function mirrorLashes(level, h, mx, pairs) {
  const onR = new Set(h.approach({ walkOnly: true }).map(([x, z]) => h.key(x, z)));
  const ok = (x, z) => {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || c.h < 2 || h.isFig(x, z) || onR.has(h.key(x, z)) || h.decorAt(x, z).length) return false;
    if (N4R.some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "ramp")) return false;
    return !h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 1);
  };
  const cand = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < mx; x++) {
    const m = Math.round(2 * mx - x);
    if (Math.abs(x - mx) < 2.5 || !ok(x, z) || !ok(m, z)) continue;
    const edge = N4R.some(([dx, dz]) => { const q = h.cell(x + dx, z + dz); return !h.land(q) || q.h < h.cell(x, z).h; });
    cand.push([(edge ? 0 : 3) + (z % 2) * 2 - Math.abs(x - mx) * 0.2, x, z, m]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  let n = 0;
  for (const [, x, z, m] of cand) {
    if (n >= pairs) break;
    if (level.decor.some((d) => d.t === "lash-column" && Math.abs(d.z - z) <= 1 && (Math.abs(d.x - x) <= 1 || Math.abs(d.x - m) <= 1))) continue;
    const miss = h.reach().missing.length;
    if (!h.put("lash-column", x, z, { v: 0 })) continue;
    if (!h.put("lash-column", m, z, { v: 1 })) { level.decor.pop(); continue; }
    if (h.reach().missing.length > miss) { level.decor.pop(); level.decor.pop(); continue; }
    n++;
  }
  h.log.push(`mirrorLashes ${n} pairs`);
}

function r5Scatter(level, h, lens, ax, az) {
  const P = level.palette.props || {};
  const has = (t) => !!P[t];
  const cheb = (x, z) => Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5));
  const plan = {
    frisket: [["cut-stencil-sheet", 4, (x, z, c) => (c.h >= 2 && (x + z) % 3 === 0 ? -cheb(x, z) : null)], ["overspray-plume", 4, (x, z, c) => ((x * 5 + z) % 4 === 1 ? -c.h * 2 + (x % 3) : null)], ["tape-roll", 3, (x, z, c) => ((x + 2 * z) % 5 === 0 ? cheb(x, z) : null)], ["spatter-pad", 6, (x, z, c) => ((x * 3 + z) % 3 === 0 ? cheb(x, z) * 0.5 : null)]],
    ringway: [["ring-asteroid", 6, (x, z, c) => (c.s === "grass" && (x + z) % 2 === 0 ? cheb(x, z) * 0.2 + ((x * 7) % 3) : null)], ["shepherd-moon", 2, (x, z, c) => (c.s === "sand" && cheb(x, z) > 3 ? -((x * 3 + z) % 7) : null)], ["groove-lane", 6, (x, z, c) => (c.s === "dirt" ? (x * 5 + z * 3) % 4 : null)]],
    lashline: [["follicle-bulb", 4, (x, z, c) => ((x + z) % 3 === 0 && c.h >= 1 ? Math.abs(x - ax - 0.5) : null)], ["tear-bead", 2, (x, z, c) => (cheb(x, z) <= 2.5 && cheb(x, z) >= 1.5 ? cheb(x, z) : null)], ["lash-shadow", 5, (x, z, c) => (c.s === "stone" || (x + z) % 4 === 0 ? cheb(x, z) : null)]],
    veinfield: [["porcelain-shard", 4, (x, z, c) => ((x * 3 + z * 5) % 4 === 0 ? -cheb(x, z) : null)], ["vein-knot", 3, (x, z, c) => ((x + z) % 3 === 1 && cheb(x, z) > 3 ? -((x * 7 + z) % 5) : null)], ["blood-disc", 4, (x, z, c) => ((x * 2 + z) % 5 === 2 ? cheb(x, z) * 0.3 : null)], ["capillary-fork", 7, (x, z, c) => (c.s === "sand" && (x + 2 * z) % 3 === 0 ? cheb(x, z) * 0.4 : null)]],
    nebula: [["nebula-billow", 7, (x, z, c) => ((x + z) % 2 === 0 && cheb(x, z) > 2 ? -cheb(x, z) + ((x * 3 + z) % 4) * 0.5 : null)], ["dust-lane-shard", 3, (x, z, c) => ((x + z) % 3 === 1 && cheb(x, z) > 2.5 ? -((x * 5 + z) % 7) : null)], ["star-speck", 10, (x, z, c) => ((x * 5 + z * 3) % 3 === 0 ? cheb(x, z) * 0.3 : null)]],
  }[lens] || [];
  const apart = (t, pred) => (x, z, c) => (level.decor.some((d) => (d.t === t || P[d.t]?.role === "threshold") && Math.max(Math.abs(d.x - x), Math.abs(d.z - z)) <= (d.t === t && lens === "frisket" ? 2 : 1)) ? null : pred(x, z, c));
  for (const [t, n, pred] of plan) if (has(t)) scatter(level, h, t, n, P[t].passable ? pred : apart(t, pred));
  if (lens === "lashline" && has("lash-column")) mirrorLashes(level, h, ax + 0.5, 4);
}

function spurs(level, h, keep = []) {
  let n = 0;
  for (let pass = 0; pass < 3; pass++) for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || (level.spawn[0] === x && level.spawn[1] === z) || keep.some(([a, b]) => a === x && b === z)) continue;
    const nb = N4R.filter(([dx, dz]) => { const q = h.cell(x + dx, z + dz); return h.land(q) || q?.s === "ramp"; }).length;
    if (nb > 1) continue;
    const r0 = h.reach();
    const saved = { ...c }, dec = h.decorAt(x, z);
    h.removeDecor((d) => dec.includes(d));
    h.set(x, z, { h: 0, s: "none" });
    if (h.reach().missing.length > r0.missing.length) { h.set(x, z, saved); level.decor.push(...dec); continue; }
    n++;
  }
  if (n) h.log.push(`spurs: ${n} one-neighbour cells cut`);
}

function r5Spawn(level, h, lo, hi, score) {
  let best = null;
  const blocked = h.blockedSet();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || blocked.has(h.key(x, z))) continue;
    if (!N4R.some(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; })) continue;
    if (N4R.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp")) continue;
    const q = h.approach({ from: [x, z], walkOnly: true });
    if (q.length < lo || q.length > hi) continue;
    const sc = score(x, z) + q.length * 0.3;
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (!best) return frontSpawn(level, h, lo, hi, score);
  h.clear(best[1], best[2]);
  level.spawn = [best[1], best[2]];
  h.log.push(`r5Spawn ${level.spawn}`);
  return h.approach({ walkOnly: true });
}

function rampDecor(level, h, keep) {
  const props = level.palette.props || {};
  const axis = (d) => (d === "e" || d === "w" ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]);
  const landing = new Set();
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c?.s === "ramp") for (const [dx, dz] of axis(c.d)) landing.add(h.key(x + dx, z + dz)); }));
  const bad = (d, x, z) => h.cell(x, z)?.s === "ramp" || (!props[d.t]?.passable && landing.has(h.key(x, z)));
  const ring = [];
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (dx || dz) ring.push([dx, dz]);
  ring.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]) || Math.max(Math.abs(a[0]), Math.abs(a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1])));
  let moved = 0, dropped = 0;
  for (const d of [...level.decor]) {
    if (d === h.lead || keep.includes(d.t) || !h.footprint(d).some(([x, z]) => bad(d, x, z))) continue;
    const ox = d.x, oz = d.z, r0 = h.reach().missing.length, w0 = h.walkN();
    let ok = false;
    for (const [dx, dz] of ring) {
      const x = ox + dx, z = oz + dz, c = h.cell(x, z);
      if (!h.land(c) || c.s === "ramp" || bad(d, x, z) || h.isFig(x, z) || h.decorAt(x, z).some((e) => e !== d)) continue;
      d.x = x; d.z = z;
      if (h.reach().missing.length <= r0 && h.walkN() >= w0 - 1) { ok = true; break; }
    }
    if (ok) { moved++; continue; }
    d.x = ox; d.z = oz;
    h.removeDecor((e) => e === d);
    dropped++;
  }
  if (moved || dropped) h.log.push(`rampDecor: ${moved} moved, ${dropped} dropped`);
}

function finishR5(level, brief, h, lens) {
  const L = R5LOOK[lens];
  level.bg = level.palette.bg = L.bg;
  level.light = { ...L.light };
  const props = level.palette.props || {};
  const types = Object.keys(props);
  const gateT = brief.threshold?.prop;
  const lightT = types.find((t) => props[t].role === "light");
  const leadT = h.lead?.t;
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && t !== leadT && !props[t]?.passable);
  h.removeDecor(() => true);
  const orig = [...level.spawn];
  const [ax, az] = h.figure.anchor;
  if (lens === "ringway") ringTerrain(level, h);
  if (lens === "nebula") nebulaCoil(level, h);
  if (lens === "lashline") lashTemple(level, h);
  if (lens === "veinfield") veinSlabs(level, h);
  h.dryRim();
  spurs(level, h, [orig]);
  fillPits(level, h);
  if (lens === "frisket") sprayPlates(level, h);
  const score = { frisket: (x, z) => z + x * 0.6, ringway: (x, z) => z * 1.2 + x, lashline: (x, z) => z * 1.4 - Math.abs(x - ax - 0.5), veinfield: (x, z) => z + x, nebula: (x, z) => z + x * 0.3 }[lens];
  let r = r5Spawn(level, h, lens === "ringway" ? 18 : 13, lens === "ringway" ? 40 : 30, score);
  const before = lens === "nebula" ? level.cells.map((row) => row.map((c) => c.s)) : null;
  if (r.length) h.path(r);
  if (before) for (const [x, z] of r) { const c = h.cell(x, z); if (h.land(c) && c.s !== "ramp") c.s = before[z][x] === "ramp" ? { 1: "dirt", 2: "grass", 3: "sand" }[c.h] : before[z][x]; }
  r = h.approach({ walkOnly: true });
  if (!r.length) r = h.approach();
  if (lens === "nebula" && props["star-speck"]) r.forEach(([x, z], i) => { const c = h.cell(x, z); if (i % 3 === 1 && h.land(c) && c.s !== "ramp" && !h.isFig(x, z)) h.put("star-speck", x, z, { v: i % 2 }); });
  let g = null;
  for (const gap of [2, 1]) for (const frac of [0.55, 0.45, 0.65, 0.35, 0.75]) if (!g && gateT) g = h.gate(gateT, { route: r, frac, figGap: gap, fill: false });
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax, az + 2], [ax + 1, az + 2], [ax + 2, az + 2], [ax + 2, az], [ax + 2, az + 1]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  h.along(passT, { route: r });
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t !== gateT && !props[d.t]?.passable && posts.some((q) => Math.max(Math.abs(q.x - d.x), Math.abs(q.z - d.z)) <= 1));
  if (lightT) h.lights(lightT, { route: r, every: 4, skip: 2, max: lens === "lashline" ? 4 : 3, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  r5Scatter(level, h, lens, ax, az);
  h.ledges({ keep: [gateT, lightT] });
  h.repair({ keep: [gateT] });
  if (lens !== "lashline") {
    h.pruneRamps({ route: h.approach({ walkOnly: true }) });
    h.pruneRamps({ all: true, slotsOnly: true });
  }
  h.openRamps();
  if (lens !== "lashline") h.pruneRamps({ all: true, nearFig: 1 });
  levelRamps(h);
  spareRamps(level, h, h.approach({ walkOnly: true }));
  levelRamps(h);
  backed(level, h);
  const keepMass = { ringway: ["ring-asteroid"], nebula: ["nebula-billow"], veinfield: ["porcelain-shard", "vein-knot"], lashline: ["lash-column"], frisket: ["cut-stencil-sheet"] }[lens] || [];
  if (h.walkN() < 82) h.thin(82, { keep: [gateT, lightT, ...keepMass] });
  if (h.walkN() < 81) h.thin(81, { keep: [gateT, lightT] });
  if (h.walkN() < 84 && lens !== "ringway" && lens !== "veinfield" && lens !== "nebula") h.grow(84, { s: h.surf.ground });
  h.rampTone();
  rampDecor(level, h, [gateT]);
  h.log.push(`r5 ${lens}: approach ${h.approach({ walkOnly: true }).length}, walk ${h.walkN()}, gate ${g}`);
}

function finishLens(level, brief, h) {
  const lens = brief.concept?.lens || (typeof brief.lens === "string" ? brief.lens : "");
  if (R5LOOK[lens]) return finishR5(level, brief, h, lens);
  lensLook(level, lens);
  h.dryRim();
  resurface(level, h);
  fillPits(level, h);
  const props = level.palette.props || {};
  const types = Object.keys(props);
  const find = (re) => types.find((t) => re.test(t));
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = brief.threshold?.prop && props[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || find(/flare|beacon/);
  const capT = find(/capillar|creeper|tendril|ridge/);
  const nebT = find(/nebula/);
  const astT = find(/asteroid/);
  const passT = h.passes().filter((t) => !h.ofRole("lead").includes(t) && t !== h.lead?.t && t !== gateT && t !== lightT && t !== capT && !daisTypes.includes(t));
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === capT || passT.includes(d.t) || d.t === "lantern");
  if (astT) h.removeDecor((d) => d.t === astT);
  if (lens === "composition") globe(level, h);
  if (lens === "subject" && nebT) h.removeDecor((d) => d.t === nebT || d.t === "rock");
  let stairs = [];
  if (lens === "medium") { disc(level, h, 5.2, 84); stairs = frontStairs(level, h); }
  const st0 = stairs[0] || [0, 0];
  const side = { medium: (x, z) => z * 0.6 - Math.abs(x - st0[0]) * 1.5, subject: (x, z) => z * 1.2 + x * 0.4, composition: (x, z) => z * 1.0 + x * 0.8 }[lens];
  let r = frontSpawn(level, h, { medium: 5, subject: 8, composition: 12 }[lens] || 9, lens === "composition" ? 22 : 18, side);
  if (r.length) h.path(r);
  r = h.approach();
  if (lens === "composition") streak(level, h);
  const f0 = lens === "medium" ? 0.45 : lens === "subject" ? 0.6 : 0.3;
  let g = null;
  for (const gap of [2, 1]) for (const frac of [f0, 0.3, 0.55, 0.7, 0.2, 0.85]) if (!g && gateT) g = h.gate(gateT, { route: r, frac, figGap: gap });
  for (const at of r.slice(0, 3)) if (!g && gateT) g = h.gate(gateT, { route: r, at });
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1], [ax, az + 2], [ax + 1, az + 2], [ax + 2, az], [ax + 2, az + 1]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t !== gateT && !props[d.t]?.passable && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  h.along(passT.filter((t) => !props[t]?.passable), { route: r });
  if (lightT) h.lights(lightT, { route: r, every: 4, skip: 2, max: lens === "composition" ? 2 : 3, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  if (lens === "medium") {
    flareAt(level, h, lightT);
    gradient(level, h, new Set(h.approach().map(([x, z]) => h.key(x, z))));
    scatter(level, h, capT, 5, (x, z, c) => (c.h <= 2 && (x * 3 + z) % 3 === 0 ? -c.h * 3 + Math.abs(x - ax) + Math.abs(z - az) : null));
    scatter(level, h, astT, 4, (x, z, c) => { const dd = Math.max(Math.abs(x - ax), Math.abs(z - az)); return dd >= 4 && x >= ax ? -dd - z * 0.1 : null; });
  } else if (lens === "subject") {
    scatter(level, h, gateT, 5, (x, z, c) => (c.h >= 2 && z <= az - 1 ? z * 2 + ((x * 7) % 3) : null));
    scatter(level, h, nebT, 3, (x, z, c) => (c.h >= 2 && x >= ax + 2 ? -x + z * 0.5 : null));
    scatter(level, h, capT, 5, (x, z, c) => (c.s === "dirt" && (x + z) % 2 === 0 ? -(x + z) : null));
    scatter(level, h, astT, 4, (x, z, c) => (x - ax + z - az >= 5 ? -(x + z) + (x % 3) * 0.4 : null));
  } else if (lens === "composition") {
    scatter(level, h, astT, 4, (x, z, c) => { const d = Math.hypot(x - ax - 1, z - az - 1); return x > ax + 5 && d > 7 ? -d : null; });
    scatter(level, h, capT, 4, (x, z, c) => (c.s === "sand" && x <= ax + 1 && (x * 3 + z) % 2 === 0 ? -z : null));
  }
  h.ledges({ keep: [gateT, lightT] });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  levelRamps(h);
  if (lens === "composition") {
    spareRamps(level, h, h.approach());
    levelRamps(h);
    const keep = new Set(level.streak || []);
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.s === "stone" && !keep.has(h.key(x, z))) c.s = c.h === 3 ? "grass" : "sand"; }
    delete level.streak;
  }
  if (lens === "medium") {
    spareRamps(level, h, h.approach());
    gradient(level, h, new Set(h.approach().map(([x, z]) => h.key(x, z))));
  }
  backed(level, h);
  const floor = lens === "composition" ? 80 : 86;
  if (h.walkN() < floor) h.thin(floor, { keep: lens === "composition" ? [gateT, lightT, astT] : [gateT, lightT] });
  if (lens === "composition") growRing(level, h, 88);
  if (h.walkN() < (lens === "composition" ? 80 : 86)) h.grow(lens === "composition" ? 80 : 86, { s: "sand" });
  if (lens === "composition") for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.s === "stone" && c.h !== 1) c.s = "sand"; }
  h.rampTone();
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  nebula(level);
  resurface(level, h);
  flattenSpikes(level, h);
  fillPits(level, h);
  dropPuddles(level, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  h.removeDecor((d) => d.t === gateT || (d.t === lightT && !!level.palette?.props?.[lightT]));
  let r = h.approach();
  if (r.length < 10) {
    const [ax, az] = h.figure.anchor;
    let best = null;
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
      const c = h.cell(x, z);
      if (!h.land(c) || c.h !== 1 || c.s === "ramp" || h.decorAt(x, z).length) continue;
      const sc = Math.abs(x - ax) + Math.abs(z - az) + (z - x) * 0.1;
      if (!best || sc > best[2]) best = [x, z, sc];
    }
    if (best) {
      level.spawn = [best[0], best[1]];
      h.log.push(`spawn moved to ${best[0]},${best[1]}`);
      r = h.approach();
    }
  }
  if (r.length) h.path(r);
  r = h.approach();
  let g = null;
  for (const gap of [3, 1]) for (const frac of [0.55, 0.4, 0.7, 0.25, 0.85]) if (!g && gateT) g = h.gate(gateT, { route: r, frac, figGap: gap });
  for (const at of r.slice(0, 3)) if (!g && gateT) g = h.gate(gateT, { route: r, at });
  if (g) h.removeDecor((d) => /^tree/.test(d.t) && d.x - g[0] >= -1 && d.x - g[0] <= 2 && d.z - g[1] >= -1 && d.z - g[1] <= 2);
  if (!h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] })) torches(level, h, r, lightT, g);
  const lit = level.decor.filter((d) => d.t === lightT || d.t === "torch" || d.t === "lantern");
  const dr = (d) => Math.min(...r.map(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z)));
  const drop = lit.sort((a, b) => dr(a) - dr(b)).slice(6);
  if (drop.length) h.removeDecor((d) => drop.includes(d));
  h.repair({ keep: [gateT] });
  spareRamps(level, h, h.approach());
  backed(level, h);
  thin(level, h, 88);
  rampTone(level, h);
}
