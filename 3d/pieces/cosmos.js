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
    catalog[t] = { footprint: lead ? [2, 2] : role === "threshold" ? [1, 1] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? 2.7 : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, NEB.indigo), c1 = pick(tn, 1, NEB.violet);
    const rocky = /crag|asteroid|meteor|boulder|rock|barrier|rampart/i.test(t);
    const pose = String(p.pose || "");
    const kind = lead ? null : lensKind(t);
    const figure = /coronal ring|within/i.test(pose) ? coronalSentinel : /monolith/i.test(pose) || /singularity/i.test(t) ? pupilMonolith : null;
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead && figure) figure(B, H);
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
    dirt: { top: "#5a86e4", patch: "#6e9cf0", mottle: "#4670cc", border: "#3558a8" },
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
  for (let k = 2; k < 14; k++) {
    const x = ax + 1 + k, z = az + Math.round(k * 0.35);
    const c = h.cell(x, z);
    if (!c || c.s === "none") { if (n) break; continue; }
    if (!h.land(c) || c.s === "ramp" || c.s === "water") continue;
    c.s = "stone";
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

function finishLens(level, brief, h) {
  const lens = brief.concept?.lens || (typeof brief.lens === "string" ? brief.lens : "");
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
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && t !== capT && !daisTypes.includes(t));
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === capT || passT.includes(d.t) || d.t === "lantern");
  if (astT) h.removeDecor((d) => d.t === astT);
  if (lens === "subject" && nebT) h.removeDecor((d) => d.t === nebT || d.t === "rock");
  let stairs = [];
  if (lens === "medium") { disc(level, h, 5.2, 84); stairs = frontStairs(level, h); }
  const st0 = stairs[0] || [0, 0];
  const side = { medium: (x, z) => z * 0.6 - Math.abs(x - st0[0]) * 1.5, subject: (x, z) => z * 1.2 + x * 0.4, composition: (x, z) => z * 1.2 - x * 0.8 }[lens];
  let r = frontSpawn(level, h, { medium: 5, subject: 8, composition: 12 }[lens] || 9, lens === "composition" ? 22 : 18, side);
  if (r.length) h.path(r);
  r = h.approach();
  if (lens === "composition") streak(level, h);
  const f0 = lens === "medium" ? 0.45 : lens === "subject" ? 0.6 : 0.7;
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
    scatter(level, h, astT, 5, (x, z, c) => (x > ax + 3 ? -z + (x % 2) * 0.3 : null));
    scatter(level, h, capT, 4, (x, z, c) => (c.s === "sand" && x <= ax + 1 && (x * 3 + z) % 2 === 0 ? -z : null));
  }
  h.ledges({ keep: [gateT, lightT] });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  levelRamps(h);
  if (lens === "medium") {
    spareRamps(level, h, h.approach());
    gradient(level, h, new Set(h.approach().map(([x, z]) => h.key(x, z))));
  }
  backed(level, h);
  if (h.walkN() < 86) h.thin(86, { keep: [gateT, lightT] });
  if (h.walkN() < 86) h.grow(86);
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
