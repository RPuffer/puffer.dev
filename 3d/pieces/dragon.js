import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-a.js";

const SKINS = {
  lounge: {
    back: ["#4b4f78", "#3b3e62", "#2b2d4a"],
    side: ["#5d6290", "#4a4e78", "#383b5e"],
    belly: ["#f6e2a6", "#e8c97e", "#c9a45c"],
    spike: ["#ffd23a", "#f0b81e", "#cf9612"],
    maw: ["#ff6f8c", "#ee5575", "#c23a5a"],
  },
  coil: {
    back: ["#34466e", "#283859", "#1c2842"],
    side: ["#46608e", "#374c74", "#29395a"],
    belly: ["#b9d4ea", "#9dbad4", "#7f9cb8"],
    spike: ["#8ff0f2", "#5fd2dc", "#3aa9b8"],
    maw: ["#ffb347", "#e8902a", "#c06d16"],
  },
  rear: {
    back: ["#463a3f", "#362c31", "#261e23"],
    side: ["#5c4b50", "#4a3b40", "#372b30"],
    belly: ["#e8c28a", "#d4a468", "#b58049"],
    spike: ["#fff1d6", "#e8d6b4", "#c4ae8a"],
    maw: ["#f04863", "#c9324a", "#9c2238"],
  },
};
const INK = ["#1a1420", "#140f19", "#0e0a12"];
const WHITE = ["#ffffff", "#f0ede6", "#d8d2c8"];
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

function tilted(B, axis, a, x, y, z, fn) {
  B.rot(axis, a, x, y, z);
  fn();
  B.pop();
}

function spike(B, r, h, c, x, y, z, ax = 0, az = 0) {
  B.rot([1, 0, 0], ax, x, y, z);
  B.rot([0, 0, 1], az, 0, 0, 0);
  B.cone(r, 0, h, pal(c), 0, 0, 0, 4);
  B.pop();
  B.pop();
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function wing(B, K, side, x, y, z, spread, len) {
  B.rot([0, 1, 0], -0.7 + side * spread * 0.5, x, y, z);
  B.rot([0, 0, 1], side * (Math.PI / 2 - 0.25), 0, 0, 0);
  B.prism([[0, 0.12], [len, -0.05], [len * 0.72, -0.5], [len * 0.35, -0.42], [0.05, -0.3]], -0.07, 0.07, pal(K.side), { bottom: true });
  B.pop();
  B.pop();
  B.rot([0, 1, 0], -0.7 + side * spread * 0.5, x, y, z);
  B.box(0.09, len * 0.95, 0.09, pal(K.back), side * 0.02, 0, 0.1);
  B.cone(0.06, 0, 0.16, pal(K.spike), side * 0.02, len * 0.95, 0.1, 4);
  B.pop();
}

function head(B, K, open, v, blank = false) {
  B.rbox(0.46, 0.3, 0.42, 0.06, pal(K.back), 0, 0, 0);
  B.box(0.5, 0.08, 0.3, pal(K.side), 0, 0.26, 0.04);
  B.box(0.3, 0.16, 0.38, pal(K.side), 0, 0.1, 0.36);
  B.box(0.22, 0.06, 0.1, pal(K.back), 0, 0.26, 0.42);
  B.box(0.26, 0.06, 0.34, pal(K.maw), 0, 0.06 - open * 0.5, 0.34);
  B.box(0.28, 0.08, 0.36, pal(K.side), 0, -open, 0.32);
  for (const x of [-0.1, -0.03, 0.04, 0.11]) B.cone(0.025, 0, 0.07, pal(WHITE), x, -open + 0.08, 0.46, 4);
  for (const x of [-0.12, 0.12]) B.box(0.04, 0.1, 0.04, pal(WHITE), x, 0.02, 0.5);
  for (const x of [-0.24, 0.24]) {
    B.box(0.04, 0.09, 0.14, pal(WHITE), x, 0.15, 0.1);
    if (!blank) B.box(0.05, 0.03, 0.16, pal(INK), x, 0.24, 0.1);
  }
  spike(B, 0.07, 0.42, K.spike, -0.16, 0.28, -0.08, -0.75, 0.35);
  spike(B, 0.07, 0.42, K.spike, 0.16, 0.28, -0.08, -0.75, -0.35);
  spike(B, 0.05, 0.26, K.spike, -0.24, 0.05, -0.14, -1.1, 0.9);
  spike(B, 0.05, 0.26, K.spike, 0.24, 0.05, -0.14, -1.1, -0.9);
  if (v % 2) spike(B, 0.04, 0.16, K.spike, 0, 0.32, 0.08, -0.4, 0);
}

function collar(B, K, y, z, r) {
  for (let i = 0; i < 7; i++) {
    const a = -1.35 + i * 0.45, x = Math.sin(a) * r, zz = z - Math.cos(a) * r * 0.4;
    spike(B, 0.045, 0.24, K.spike, x, y, zz, -0.5, -Math.sin(a) * 1.1);
  }
}

function dorsal(B, K, pts) {
  pts.forEach(([y, z, h], i) => spike(B, 0.07, h, i % 2 ? K.spike : K.side, 0, y, z, -0.35, 0));
}

function tailArc(B, K, cx, cz, r, a0, a1, n, w0, y) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = a0 + (a1 - a0) * t, w = w0 * (1 - t * 0.65);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    B.at(x, y, z, -a, () => {
      B.rbox(w, w * 0.8, 0.3, 0.04, pal(i % 2 ? K.back : K.side), 0, 0, 0);
      if (i % 2 === 0 && i < n - 1) B.cone(0.05, 0, 0.14, pal(K.spike), 0, w * 0.8, 0, 4);
    });
  }
  const a = a1, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
  B.at(x, y, z, -a, () => wedge(B, 0.2, 0.24, 0.22, K.spike, 0, 0, 0.12));
}

function claws(B, x, y, z) {
  for (const dx of [-0.05, 0.05]) B.box(0.04, 0.05, 0.08, pal(WHITE), x + dx, y, z);
}

function lounge(B, K, v) {
  const y0 = 0.22;
  tailArc(B, K, 0.15, 0.05, 0.62, -2.2, 0.9, 8, 0.28, y0);
  B.rbox(0.7, 0.36, 0.9, 0.1, pal(K.side), 0, y0, -0.12);
  B.rbox(0.56, 0.16, 0.8, 0.08, pal(K.back), 0, y0 + 0.36, -0.14);
  B.box(0.46, 0.08, 0.5, pal(K.belly), 0, y0 + 0.02, 0.14);
  for (const x of [-0.34, 0.34]) {
    B.rbox(0.18, 0.3, 0.36, 0.05, pal(K.back), x, y0, -0.34);
    B.box(0.18, 0.12, 0.38, pal(K.side), x * 0.8, y0, 0.44);
    claws(B, x * 0.8, y0, 0.66);
  }
  dorsal(B, K, [[y0 + 0.5, -0.42, 0.2], [y0 + 0.5, -0.2, 0.26], [y0 + 0.5, 0.02, 0.26]]);
  wing(B, K, -1, -0.3, y0 + 0.4, -0.2, 0.25, 0.62);
  wing(B, K, 1, 0.3, y0 + 0.4, -0.2, 0.25, 0.62);
  B.rbox(0.38, 0.34, 0.34, 0.06, pal(K.side), 0, y0 + 0.3, 0.3);
  wedge(B, 0.36, 0.3, 0.2, K.belly, 0, y0 + 0.3, 0.5);
  B.rbox(0.32, 0.26, 0.3, 0.05, pal(K.back), 0, y0 + 0.6, 0.38);
  collar(B, K, y0 + 0.66, 0.4, 0.2);
  B.at(0.04, y0 + 0.82, 0.46, 0.42 + (v % 2) * 0.08, () => {
    B.rot([1, 0, 0], -0.25, 0, 0, 0);
    head(B, K, 0.2, v);
    B.pop();
  });
  return y0 + 1.55;
}

function coil(B, K, v) {
  const y0 = 0.22;
  tailArc(B, K, 0, -0.02, 0.66, 0.4, 5.4, 11, 0.34, y0);
  B.rbox(0.62, 0.5, 0.62, 0.1, pal(K.side), 0, y0 + 0.16, -0.08);
  B.rbox(0.5, 0.42, 0.5, 0.08, pal(K.back), 0, y0 + 0.66, -0.12);
  wedge(B, 0.44, 0.5, 0.2, K.belly, 0, y0 + 0.36, 0.3);
  for (const x of [-0.26, 0.26]) {
    B.box(0.14, 0.4, 0.16, pal(K.side), x, y0, 0.3);
    claws(B, x, y0, 0.42);
  }
  wing(B, K, -1, -0.26, y0 + 0.8, -0.24, 0.6, 0.72);
  wing(B, K, 1, 0.26, y0 + 0.8, -0.24, 0.6, 0.72);
  dorsal(B, K, [[y0 + 1.08, -0.26, 0.22], [y0 + 1.08, -0.06, 0.24]]);
  B.rbox(0.34, 0.34, 0.32, 0.05, pal(K.side), 0, y0 + 1.08, 0.08);
  B.rbox(0.28, 0.28, 0.3, 0.05, pal(K.back), 0, y0 + 1.4, 0.2);
  wedge(B, 0.28, 0.4, 0.14, K.belly, 0, y0 + 1.1, 0.3);
  collar(B, K, y0 + 1.48, 0.22, 0.2);
  B.at(0.02, y0 + 1.62, 0.3, 0.4 + (v % 2) * 0.08, () => head(B, K, 0.1, v));
  return y0 + 2.1;
}

function rear(B, K, v) {
  const y0 = 0.22;
  tailArc(B, K, 0.1, -0.1, 0.7, -2.6, -0.4, 8, 0.3, y0);
  for (const x of [-0.24, 0.24]) {
    B.rbox(0.22, 0.42, 0.44, 0.06, pal(K.back), x, y0, -0.04);
    B.box(0.16, 0.12, 0.28, pal(K.side), x, y0, 0.2);
    claws(B, x, y0, 0.36);
  }
  tilted(B, [1, 0, 0], 0.32, 0, y0 + 0.36, -0.05, () => {
    B.rbox(0.58, 0.62, 0.48, 0.1, pal(K.side), 0, 0, 0);
    B.rbox(0.44, 0.42, 0.4, 0.08, pal(K.back), 0, 0.62, -0.02);
    wedge(B, 0.44, 0.7, 0.18, K.belly, 0, 0.1, 0.3);
    dorsal(B, K, [[0.64, -0.28, 0.24], [0.9, -0.24, 0.26], [0.3, -0.3, 0.2]]);
  });
  for (const s of [-1, 1]) {
    B.box(0.12, 0.3, 0.14, pal(K.side), s * 0.3, y0 + 0.68, 0.3);
    B.box(0.12, 0.12, 0.26, pal(K.back), s * 0.3, y0 + 0.9, 0.44);
    claws(B, s * 0.3, y0 + 0.86, 0.6);
  }
  wing(B, K, -1, -0.3, y0 + 0.9, -0.18, 1.05, 1.0);
  wing(B, K, 1, 0.3, y0 + 0.9, -0.18, 1.05, 1.0);
  B.rbox(0.32, 0.36, 0.32, 0.05, pal(K.side), 0, y0 + 1.08, 0.08);
  B.rbox(0.28, 0.3, 0.3, 0.05, pal(K.back), 0, y0 + 1.42, 0.14);
  wedge(B, 0.28, 0.44, 0.14, K.belly, 0, y0 + 1.1, 0.3);
  collar(B, K, y0 + 1.5, 0.18, 0.22);
  B.at(0.02, y0 + 1.68, 0.24, 0.38 + (v % 2) * 0.08, () => {
    B.rot([1, 0, 0], -0.3, 0, 0, 0);
    head(B, K, 0.24, v);
    B.pop();
  });
  return y0 + 2.2;
}

const POSES = { lounge, coil, rear };
const poseOf = (t) => (/sun|lounge|bask|rest|sleep|roost/i.test(t) ? "lounge" : /coil|shrine|wyrm|vigil|serpent/i.test(t) ? "coil" : "rear");
const LEAD_H = { lounge: 2.3, coil: 2.7, rear: 2.8 };
const DESIGN_H = { lounge: 1.77, coil: 2.32, rear: 2.42 };

function dragon(B, t, H, look, v) {
  const p = poseOf(t);
  const s = H / DESIGN_H[p];
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.9, 0.22, look.plinthLo, look.plinthHi);
  POSES[p](B, SKINS[p], v);
  B.pop();
}

function threshold(B, t, H, c0, c1, c2, d, K) {
  const tall = H * 0.62;
  B.box(0.46, 0.22, 0.46, pal(c2));
  B.box(0.34, tall * 0.55, 0.34, pal(c0), 0, 0.22, 0);
  B.box(0.28, tall * 0.45, 0.28, pal(c1), 0, 0.22 + tall * 0.55, 0);
  const top = 0.22 + tall;
  if (/torii|shrine|monolith/i.test(t)) {
    B.box(0.38, 0.12, 0.38, pal(c2), 0, top, 0);
    B.box(0.22, 0.2, 0.22, pal(["#ffc24a", "#f0a020", "#c97a10"]), 0, top + 0.12, 0);
    B.cone(0.2, 0, 0.16, pal(c2), 0, top + 0.32, 0, 4);
  } else if (/fang|tooth/i.test(t)) {
    B.box(0.34, 0.1, 0.34, pal(c2), 0, top, 0);
    spike(B, 0.15, 0.62, WHITE, 0.02, top + 0.1, 0, 0, -0.22);
  } else {
    B.box(0.34, 0.1, 0.34, pal(c2), 0, top, 0);
    spike(B, 0.1, 0.5, K.spike, -0.07, top + 0.1, 0, 0, 0.3);
    spike(B, 0.08, 0.36, K.spike, 0.09, top + 0.1, 0, 0, -0.35);
  }
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.72, 0.14, c2);
    beam(H * 0.72 + 0.14, 0.1, K.spike);
  }
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|rostrum/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|hoard/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem|shard|spine/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const leadT = types.find((t) => roleOf(P, t) === "lead") || "";
  const K = SKINS[poseOf(leadT)];
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ["#9d8fa6", "#847790", "#655a70"]), plinthHi: pick(dt, 1, ["#c7b9cf", "#a799b0", "#85778f"]) };

  const catalog = {};
  const builders = {};
  if (props[leadT]?.pose) return registerLens(P, props, types, leadT);
  for (const t of types) {
    const p = props[t], role = p.role;
    const lead = role === "lead" || role === "creature";
    catalog[t] = { footprint: lead ? [2, 2] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? LEAD_H[poseOf(t)] : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, K.side), c1 = pick(tn, 1, K.belly), c2 = pick(tn, 2, K.back);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) dragon(B, t, H, look, v);
      else if (role === "threshold") threshold(B, t, H, c0, c1, c2, d, K);
      else if (role === "dais") plinth(B, 0.42, H, c0, c1);
      else if (role === "light") {
        B.box(0.3, 0.14, 0.3, pal(c0));
        B.box(0.16, H - 0.62, 0.16, pal(c0), 0, 0.14, 0);
        B.box(0.34, 0.08, 0.34, pal(c1), 0, H - 0.48, 0);
        B.box(0.22, 0.24, 0.22, pal(P.flame || ["#ffd23a", "#f0a020", "#d07a10"]), 0, H - 0.4, 0);
        B.cone(0.24, 0, 0.18, pal(c2), 0, H - 0.16, 0, 4);
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(v % 2 ? K.spike : c1), -0.05, H * 0.55, 0.02);
      } else if (role === "mass") {
        const lean = v % 2 ? 0.22 : -0.18;
        B.box(0.6, H * 0.3, 0.56, pal(c0), 0, 0, 0);
        tilted(B, [0, 0, 1], lean, 0, H * 0.3, 0, () => {
          B.box(0.44, H * 0.32, 0.42, pal(c1), 0.02, 0, 0.02);
          B.box(0.3, H * 0.2, 0.3, pal(c2), -0.02, H * 0.32, -0.02);
          B.cone(0.2, 0, H * 0.22, pal(c1), 0, H * 0.52, 0, 4);
        });
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

function grow(h, want) {
  const { W, D } = h;
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let pass = 0; pass < 40 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground });
  }
}

function unstone(h, keep) {
  const { W, D } = h;
  let land = 0, stone = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const c = h.cell(x, z); if (h.land(c)) { land++; if (c.s === "stone") stone++; } }
  if (stone / Math.max(1, land) < 0.35) return;
  const base = (c) => (c.h >= 2 && h.surf.raised !== "stone" ? h.surf.raised : h.surf.ground !== "stone" ? h.surf.ground : "grass");
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || keep.has(h.key(x, z)) || (x * 3 + z * 5) % 9 === 0) continue;
    h.set(x, z, { h: c.h, s: base(c) });
  }
  h.log.push(`unstone: ${stone}/${land} stone cells repainted`);
}

function seal(h) {
  const { W, D } = h;
  let n = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "water" && c.h === 0) { h.set(x, z, { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground }); n++; }
  }
  if (n) { h.removeDecor((d) => d.t === "waterfall"); h.log.push(`seal: ${n} low water cells closed`); }
}

function ledges(h, types, level) {
  const drop = (x, z) => [[1, 0], [0, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); const c = h.cell(x, z); return !h.land(n) || n.h <= c.h - 2 || (c.h >= 3 && n.h < c.h); });
  const wall = (x, z) => [[-1, 0], [0, -1]].some(([a, b]) => { const n = h.cell(x + a, z + b); const c = h.cell(x, z); return h.land(n) && (n.h >= c.h + 2 || (c.h >= 2 && n.h > c.h)); });
  const n = h.removeDecor((d) => types.includes(d.t) && (drop(d.x, d.z) || (h.role(d.t) === "mass" && (wall(d.x, d.z) || !h.route(level.spawn, [d.x, d.z])))));
  if (n) h.log.push(`ledges: ${n} tall props off cliff lips`);
}

function lensPasses(brief) {
  const cands = (brief.motifs || []).map((m) => ({ n: m.name.toLowerCase(), t: m.type && m.type !== "new" ? m.type : m.name }));
  return (brief.approach?.passes || []).map((s) => { const low = s.toLowerCase(); const m = cands.find((c) => low.includes(c.n) || low.includes(c.n.replace(/_/g, " "))); return m?.t; }).filter(Boolean);
}

function capDecor(level, h, t, max) {
  const list = level.decor.filter((d) => d.t === t);
  const [ax, az] = h.figure.anchor;
  list.sort((a, b) => Math.hypot(a.x - ax, a.z - az) - Math.hypot(b.x - ax, b.z - az));
  const drop = new Set(list.slice(max));
  return h.removeDecor((d) => drop.has(d));
}

const N4L = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function scatter(level, h, t, n, pred, o = {}) {
  if (!level.palette?.props?.[t] && !o.catalog) return 0;
  const route = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  const ring = new Set(h.figRing().map(([x, z]) => h.key(x, z)));
  const cand = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || ring.has(h.key(x, z)) || h.decorAt(x, z).length) return;
    if (!o.onRoute && (route.has(h.key(x, z)) || c.s === h.surf.path)) return;
    if (N4L.some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "ramp")) return;
    if (!pred(x, z, c)) return;
    cand.push([x, z, (x * 73 + z * 151 + t.length * 17) % 97]);
  }));
  cand.sort((a, b) => a[2] - b[2]);
  let k = 0;
  for (const [x, z] of cand) {
    if (k >= n) break;
    const m0 = h.reach().missing.length;
    if (!h.put(t, x, z, { v: k % 2, rot: (x + z) % 4 })) continue;
    if (h.reach().missing.length > m0 || h.walkN() < (o.floor ?? 83) || h.approach().length === 0) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    k++;
  }
  h.log.push(`scatter ${t} ${k}/${n}`);
  return k;
}

const voidOrLow = (h, x, z, c) => { const q = h.cell(x, z); return !h.land(q) || q.h < c.h; };
const frontSafe = (h, x, z, c) => [[1, 0], [0, 1]].every(([dx, dz]) => { const q = h.cell(x + dx, z + dz); return h.land(q) && q.h <= c.h; });

function restoreSubject(level, brief, h) {
  const g = brief.composition?.grid, hs = brief.composition?.heights;
  if (!g || !hs) return;
  const bridge = new Set(["7,6", "7,7"]);
  let n = 0;
  for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
    const ch = g[z]?.[x];
    if (!ch || ch === "V" || ch === "W") continue;
    const massA = x <= 7 && z <= 9 && !bridge.has(`${x},${z}`);
    if (!massA) continue;
    const back = (z === 1 && x <= 4) || (x === 1 && z <= 3) || (x === 2 && z === 2);
    const hh = back ? 3 : 2;
    const s = hh === 3 ? "stone" : (x * 5 + z * 3) % 7 === 0 ? "stone" : (x * 3 + z) % 5 === 0 ? "sand" : "dirt";
    if (!h.isFig(x, z)) h.clear(x, z);
    level.cells[z][x] = { h: hh, s };
    n++;
  }
  level.cells[7][7] = { h: 1, s: "dirt" };
  level.cells[6][7] = { h: 2, s: "ramp", d: "s", m: "dirt" };
  if (h.cell(8, 7)?.s === "none") level.cells[7][8] = { h: 1, s: "dirt" };
  level.cells[2][5] = { h: 3, s: "ramp", d: "e", m: "stone" };
  level.cells[1][5] = { h: 3, s: "stone" };
  level.cells[3][1] = { h: 3, s: "stone" };
  for (const [x, z] of [[11, 3], [11, 4], [10, 4], [10, 5], [9, 6], [8, 8]]) if (h.cell(x, z)?.s === "none") level.cells[z][x] = { h: 1, s: "dirt" };
  for (const [x, z] of [[6, 6], [4, 8], [4, 9], [8, 1], [8, 2]]) if (h.cell(x, z)?.s === "none") level.cells[z][x] = { h: 2, s: "dirt" };
  h.removeDecor((d) => d.t === "stepping-stones");
  h.log.push(`restoreSubject ${n} roost cells`);
}

function carveComposition(level, h) {
  const bay = [[6, 6], [7, 6], [8, 6], [6, 7], [7, 7], [8, 7], [9, 6], [10, 6], [11, 6], [9, 7], [10, 7], [11, 7], [12, 7], [10, 8], [11, 8]];
  const hole = [[2, 8], [3, 8]];
  let n = 0;
  for (const [x, z] of [...bay, ...hole]) {
    const c = h.cell(x, z);
    if (!c || c.s === "none" || h.isFig(x, z)) continue;
    h.clear(x, z);
    level.cells[z][x] = { h: 0, s: "none" };
    n++;
  }
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], lo = h.cell(x + dx, z + dz), hi = h.cell(x - dx, z - dz);
    if (!h.land(lo) || !h.land(hi)) level.cells[z][x] = h.land(hi) ? { h: c.h, s: h.surf.raised } : { h: Math.max(1, c.h - 1), s: h.surf.ground };
  }
  for (const [x, z] of [[5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [12, 9], [13, 9], [12, 10], [13, 10]]) if (h.cell(x, z)?.s !== "ramp") { h.clear(x, z); level.cells[z][x] = { h: 1, s: h.surf.ground }; n--; }
  for (const [x, z] of [[5, 6], [5, 7], [4, 6], [3, 6], [2, 6], [1, 6]]) if (h.land(h.cell(x, z))) level.cells[z][x] = { h: 1, s: h.surf.ground };
  if (h.cell(4, 5)?.h === 2) { level.cells[5][4] = { h: 2, s: "ramp", d: "s", m: "grass" }; h.clear(4, 5); }
  const fh = h.cell(...h.figure.anchor).h;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || h.isFig(x, z)) continue;
    const dist = Math.min(...h.figure.cells.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
    if (dist <= 2 && (c.s === "ramp" || c.h > fh)) { level.cells[z][x] = { h: fh, s: h.surf.raised }; h.clear(x, z); }
  }
  h.log.push(`carveComposition ${n} net cells to void`);
}

function tailSpawn(level, h) {
  let best = null;
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || x > 4 || z < 7 || h.blockedSet().has(h.key(x, z))) return;
    const q = h.approach({ from: [x, z] });
    if (q.length && (!best || q.length + (z - x) * 0.5 > best[0])) best = [q.length + (z - x) * 0.5, x, z];
  }));
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; h.log.push(`tail spawn ${level.spawn}`); }
  return h.approach();
}

function lensLook(level, lens, h) {
  const P = level.palette;
  if (lens === "subject") { level.bg = "#3d6272"; P.bg = "#3d6272"; }
  if (lens === "subject") level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "grass") level.cells[z][x] = { h: c.h, s: (x + z) % 3 ? "dirt" : "sand" }; }));
  if (lens === "medium") {
    P.stone = { top: "#4a4d55", pebble: "#5c606a", pebbleShade: "#34363c", rim: "#2a2c31" };
  }
}

function finishLens(level, brief, h) {
  const lens = brief.concept?.lens || "medium";
  h.dryRim();
  if (lens === "subject") restoreSubject(level, brief, h);
  if (lens === "composition") carveComposition(level, h);
  h.repair();
  lensLook(level, lens, h);
  const gateT = brief.threshold?.prop && level.palette?.props?.[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || "lantern";
  const passT = lensPasses(brief).filter((t) => t !== gateT && t !== lightT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "lantern" || passT.includes(d.t));
  let r = lens === "composition" ? tailSpawn(level, h) : h.spawnAt({ min: 10, max: 18 });
  if (r.length) h.path(r);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: lens === "subject" ? 0.45 : 0.6 }) : null;
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1], [ax, az + 2], [ax + 1, az + 2]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t !== gateT && h.role(d.t) !== "lead" && /tree|pine|spire|talon|shard|frill/i.test(d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  h.along(passT, { route: r });
  h.lights(lightT, { route: r, every: 5, skip: 2, max: 2, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  for (const t of Object.keys(level.palette?.props || {})) if (h.role(t) !== "lead") capDecor(level, h, t, t === gateT ? 2 : 6);
  h.removeDecor((d) => d.t === lightT && N4L.some(([dx, dz]) => { const q = h.cell(d.x + dx, d.z + dz); return !h.land(q) || q.h !== h.cell(d.x, d.z).h; }));
  h.ledges({ keep: [gateT] });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  dress(level, brief, h, lens);
  if (h.walkN() < 82) h.thin(82, { keep: [gateT, lightT] });
  if (h.walkN() < 82) h.grow(82);
  h.rampTone();
  h.log.push(`lens ${lens} passes ${passT.join(",")} gate ${level.decor.filter((d) => d.t === gateT).map((d) => d.x + "," + d.z).join(" ")} walk ${h.walkN()} approach ${h.approach().length}`);
  if (level.name === "dragon-medium") placeLandmark(level, h, "dragon-graphite-crane");
}

function dress(level, brief, h, lens) {
  const tall = (x, z, c) => frontSafe(h, x, z, c) && (voidOrLow(h, x - 1, z, c) || voidOrLow(h, x, z - 1, c));
  if (lens === "medium") {
    scatter(level, h, "hatch_shard", 5, tall);
    scatter(level, h, "wire_loop", 4, (x, z, c) => c.h === 1 && x + (h.D - z) < 12);
    scatter(level, h, "woven_crest", 2, (x, z, c) => c.h >= 2);
  } else if (lens === "subject") {
    scatter(level, h, "scute_cairn", 3, (x, z, c) => c.h >= 2 && frontSafe(h, x, z, c));
    scatter(level, h, "bush-cluster", 3, (x, z, c) => c.h >= 2, { catalog: true });
    scatter(level, h, "calcified_ribcage", 1, (x, z, c) => c.h === 2 && frontSafe(h, x, z, c));
    scatter(level, h, "calcified_ribcage", 1, (x, z, c) => c.h === 1);
    scatter(level, h, "rock-big", 2, (x, z, c) => c.h === 1 && tall(x, z, c), { catalog: true });
  } else {
    scatter(level, h, "bone_talon_spire", 3, tall);
    scatter(level, h, "wire_loop_curb", 4, (x, z, c) => c.h === 1, { onRoute: false });
    scatter(level, h, "spiked_frill_palisade", 3, (x, z, c) => c.h >= 2 && frontSafe(h, x, z, c));
  }
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  seal(h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 86);
  let raised = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.h >= 2 && !h.isFig(x, z)) raised++; }
  if (raised < 6) h.dais({ ring: 1, h: 2, s: "stone" });
  let r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  const cut = h.removeDecor((d) => /tree|pine|cypress/i.test(d.t) && near(d));
  if (cut) h.log.push(`clearing: ${cut} trees off the approach`);
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
  for (const [x, z] of h.figure.cells) keep.add(h.key(x, z));
  unstone(h, keep);
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const bad = () => posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length > 0;
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
  h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  ledges(h, [...h.ofRole("mass"), "rock-big"], level);
  h.repair({ keep: [gateT] });
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  h.log.push(`posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}

function beads(B, a, b, r, c, gap = 1.25) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const n = Math.max(2, Math.ceil(Math.hypot(dx, dy, dz) / (r * gap)));
  for (let i = 0; i <= n; i++) { const t = i / n; B.box(r, r, r, pal(c), a[0] + dx * t, a[1] + dy * t - r / 2, a[2] + dz * t); }
}

function wireWing(B, K, s, x, y, z, up, back) {
  const root = [s * x, y, z];
  const elbow = [s * (x + 0.4), y + 0.5 * up, z - 0.2 * back];
  beads(B, root, elbow, 0.13, K.back, 1.1);
  const tips = [[0.14, 0.5, -0.36], [0.46, 0.26, -0.3], [0.56, -0.12, -0.22]].map(([a, b, c]) => [elbow[0] + s * a, elbow[1] + b * up, elbow[2] + c * back]);
  tips.forEach((t, i) => beads(B, elbow, t, i ? 0.1 : 0.11, i ? K.side : K.back, 1.15));
  beads(B, tips[0], tips[1], 0.08, K.belly, 1.9);
  beads(B, tips[1], tips[2], 0.08, K.belly, 1.9);
  spike(B, 0.05, 0.16, K.spike, elbow[0], elbow[1], elbow[2], -0.3, -s * 0.5);
}

function beard(B, K, y, z) {
  for (let i = 0; i < 5; i++) { const x = -0.16 + i * 0.08; spike(B, 0.035, 0.2 + (i % 2) * 0.08, K.spike, x, y, z, Math.PI - 0.3, x * 1.5); }
}

function lensHead(B, K, x, y, z, yaw, pitch, open, v) {
  B.at(x, y, z, yaw, () => {
    B.rot([1, 0, 0], pitch, 0, 0, 0);
    head(B, K, open, v, true);
    beard(B, K, -open, 0.2);
    B.pop();
  });
}

function lensCoil(B, K, v) {
  const y0 = 0.22;
  tailArc(B, K, 0, -0.02, 0.66, 0.4, 5.4, 11, 0.34, y0);
  B.rbox(0.62, 0.5, 0.62, 0.1, pal(K.side), 0, y0 + 0.16, -0.08);
  B.rbox(0.5, 0.42, 0.5, 0.08, pal(K.back), 0, y0 + 0.66, -0.12);
  wedge(B, 0.44, 0.5, 0.2, K.belly, 0, y0 + 0.36, 0.3);
  for (const x of [-0.26, 0.26]) { B.box(0.14, 0.4, 0.16, pal(K.side), x, y0, 0.3); claws(B, x, y0, 0.42); }
  wireWing(B, K, -1, 0.24, y0 + 0.9, -0.2, 1, 1);
  wireWing(B, K, 1, 0.24, y0 + 0.9, -0.2, 1, 1);
  dorsal(B, K, [[y0 + 1.08, -0.3, 0.24], [y0 + 1.08, -0.1, 0.26]]);
  B.rbox(0.34, 0.34, 0.32, 0.05, pal(K.side), 0, y0 + 1.08, 0.1);
  B.rbox(0.28, 0.26, 0.3, 0.05, pal(K.back), 0, y0 + 1.36, 0.28);
  collar(B, K, y0 + 1.44, 0.3, 0.2);
  lensHead(B, K, 0.02, y0 + 1.46, 0.48, 0.42 + (v % 2) * 0.06, 0.12, 0.3, v);
}

function lensCrouch(B, K, v) {
  const y0 = 0.22;
  tailArc(B, K, 0.05, -0.12, 0.62, -2.5, 0.3, 9, 0.3, y0);
  for (const x of [-0.3, 0.3]) {
    B.rbox(0.26, 0.42, 0.5, 0.06, pal(K.back), x, y0, -0.24);
    B.box(0.18, 0.12, 0.3, pal(K.side), x, y0, 0.06);
    claws(B, x, y0, 0.24);
  }
  tilted(B, [1, 0, 0], -0.35, 0, y0 + 0.24, -0.2, () => {
    B.rbox(0.62, 0.46, 0.82, 0.1, pal(K.side), 0, 0, 0.05);
    B.rbox(0.48, 0.14, 0.7, 0.08, pal(K.back), 0, 0.46, 0.02);
    B.box(0.44, 0.06, 0.6, pal(K.belly), 0, -0.02, 0.1);
  });
  for (const x of [-0.26, 0.26]) { B.box(0.15, 0.56, 0.17, pal(K.side), x, y0, 0.4); claws(B, x, y0, 0.52); }
  dorsal(B, K, [[y0 + 0.66, -0.4, 0.22], [y0 + 0.8, -0.15, 0.26], [y0 + 0.94, 0.1, 0.26]]);
  wireWing(B, K, -1, 0.28, y0 + 0.82, -0.08, 1.1, 1.2);
  wireWing(B, K, 1, 0.28, y0 + 0.82, -0.08, 1.1, 1.2);
  B.rbox(0.46, 0.4, 0.4, 0.06, pal(K.side), 0, y0 + 0.6, 0.34);
  wedge(B, 0.4, 0.34, 0.16, K.belly, 0, y0 + 0.62, 0.56);
  B.rbox(0.34, 0.3, 0.34, 0.05, pal(K.back), 0, y0 + 0.9, 0.5);
  B.rbox(0.3, 0.26, 0.3, 0.05, pal(K.side), 0, y0 + 0.98, 0.68);
  collar(B, K, y0 + 1.12, 0.56, 0.2);
  lensHead(B, K, 0.02, y0 + 1.0, 0.84, 0.44 + (v % 2) * 0.06, 0.18, 0.3, v);
}

function lensLunge(B, K, v) {
  const y0 = 0.18;
  for (const x of [-0.26, 0.26]) {
    B.rbox(0.24, 0.5, 0.42, 0.06, pal(K.back), x, y0, -0.36);
    B.box(0.16, 0.1, 0.26, pal(K.side), x, y0, -0.1);
    claws(B, x, y0, 0.06);
  }
  tilted(B, [1, 0, 0], 0.28, 0, y0 + 0.36, -0.3, () => {
    B.rbox(0.58, 0.44, 0.86, 0.1, pal(K.side), 0, 0, 0.12);
    B.rbox(0.44, 0.14, 0.74, 0.08, pal(K.back), 0, 0.44, 0.1);
  });
  for (const x of [-0.34, 0.34]) { B.box(0.15, 0.32, 0.17, pal(K.side), x, y0, 0.44); claws(B, x, y0, 0.56); }
  dorsal(B, K, [[y0 + 0.84, -0.5, 0.3], [y0 + 0.78, -0.26, 0.28], [y0 + 0.68, -0.02, 0.26], [y0 + 0.56, 0.22, 0.22]]);
  const tail = [[0, 0.62, -0.72, 0.3], [0.08, 0.84, -0.94, 0.26], [0.2, 1.08, -1.02, 0.22], [0.32, 1.28, -0.92, 0.18], [0.38, 1.4, -0.72, 0.15]];
  tail.forEach(([x, y, z, w], i) => { B.rbox(w, w * 0.9, w, 0.04, pal(i % 2 ? K.back : K.side), x, y0 + y - w / 2, z); if (i % 2 === 0) B.cone(0.05, 0, 0.14, pal(K.spike), x, y0 + y + w * 0.4, z, 4); });
  B.at(0.38, y0 + 1.46, -0.66, 0, () => wedge(B, 0.16, 0.2, 0.2, K.spike, 0, 0, 0.1));
  wireWing(B, K, -1, 0.26, y0 + 0.76, -0.18, 0.8, 1.4);
  wireWing(B, K, 1, 0.26, y0 + 0.76, -0.18, 0.8, 1.4);
  B.rbox(0.36, 0.3, 0.36, 0.05, pal(K.side), 0, y0 + 0.4, 0.5);
  B.rbox(0.3, 0.26, 0.3, 0.05, pal(K.back), 0, y0 + 0.34, 0.74);
  collar(B, K, y0 + 0.64, 0.6, 0.2);
  lensHead(B, K, 0.02, y0 + 0.4, 0.96, 0.46 + (v % 2) * 0.06, 0.1, 0.34, v);
}

const LENS_POSES = { coil: lensCoil, crouch: lensCrouch, lunge: lensLunge };
const LENS_POSE_H = { coil: [2.6, 2.3], crouch: [2.4, 2.05], lunge: [2.2, 1.85] };
const lensPose = (text) => (/crouch|seated|perch|squat/i.test(text) ? "crouch" : /lung|low|stalk|prowl/i.test(text) ? "lunge" : "coil");

function lensSkin(tn, pose) {
  const g = (i, d) => tn[i] || d;
  if (pose === "crouch") return { side: g(0, SKINS.rear.side), back: g(6, SKINS.rear.back), belly: g(3, SKINS.rear.belly), spike: g(4, WHITE), maw: ["#3a2630", "#2b1c24", "#1e1319"] };
  if (pose === "lunge") return { side: g(0, SKINS.rear.side), back: ["#5a2c22", "#46221a", "#321812"], belly: g(5, SKINS.rear.belly), spike: g(3, WHITE), maw: ["#2a1a1c", "#201416", "#160e10"] };
  return { side: g(0, SKINS.coil.side), back: g(1, SKINS.coil.back), belly: g(3, SKINS.coil.belly), spike: g(2, WHITE), maw: ["#1c1c20", "#161619", "#101012"] };
}

function lensBase(B, pose, K, lo, hi, v) {
  if (pose === "crouch") {
    B.prism(circle(0, 0, 0.92, 0.84, 8, Math.PI / 8), 0, 0.12, pal(lo));
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63 + v * 0.3, r = 0.74;
      B.at(Math.cos(a) * r, 0.1, Math.sin(a) * r, -a + (i % 2 ? 0.5 : -0.4), () => B.box(0.5, 0.1, 0.1, pal(i % 3 ? hi : K.spike), 0, 0, 0));
      if (i % 3 === 0) B.box(0.12, 0.12, 0.12, pal(K.spike), Math.cos(a + 0.3) * 0.62, 0.2, Math.sin(a + 0.3) * 0.62);
    }
    return;
  }
  if (pose === "lunge") { B.rbox(1.5, 0.14, 1.4, 0.2, pal(lo), 0, 0, 0.05); B.rbox(0.9, 0.08, 0.8, 0.14, pal(hi), -0.1, 0.14, -0.2); return; }
  B.at(0, 0, 0, 0.3, () => { B.box(1.5, 0.12, 1.4, pal(lo)); B.box(1.1, 0.1, 1.0, pal(hi), 0.06, 0.12, -0.04); });
}

function beamPair(B, H, d, y, th, c, reach = 1.0) {
  if (!d.side) return;
  if (d.axis === "x") B.box(0.2, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05));
  else B.box(reach + 0.3, th, 0.2, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
}

const LK = [
  ["ribcage", /rib|carcass|skeleton/i],
  ["lattice", /lintel|lattice|chevron|trellis/i],
  ["woven", /woven|weave|diamond|crest/i],
  ["frill", /frill|quill|palisade|picket|needle/i],
  ["loop", /wire|loop|hoop|curb|gesture/i],
  ["talon", /talon|claw|spire|tooth|fang/i],
  ["scute", /scute|cairn|plate/i],
  ["shard", /shard|slate|scree|hatch/i],
];

const LB = {
  shard(B, H, v, { c0, c1, c2 }) {
    const ink = ["#3a3a40", "#2e2e33", "#222226"];
    B.rbox(0.8, 0.14, 0.7, 0.06, pal(c2), 0, 0, 0);
    const slabs = v % 2 ? [[0.62, 0.5, 0.2, 0.26, -0.05, 0.06], [0.5, 0.4, 0.18, -0.2, 0.08, -0.08]] : [[0.66, 0.46, 0.22, -0.3, 0.02, 0.0], [0.46, 0.44, 0.18, 0.22, -0.06, 0.1]];
    slabs.forEach(([w, hk, t, lean, ox, oz], i) => tilted(B, [0, 0, 1], lean, ox, 0.12, oz, () => {
      B.box(w, H * hk, t + 0.22, pal(i ? c1 : c0), 0, 0, 0);
      B.box(w * 0.7, H * (1 - hk) * 0.8, t + 0.12, pal(i ? c0 : c1), 0.02, H * hk, 0);
      for (let k = 0; k < 3; k++) B.box(w + 0.02, 0.04, t + 0.24, pal(ink), 0, H * hk * (0.25 + k * 0.25), 0);
    }));
  },
  frill(B, H, v, { c0, c1, c2, d, gate }) {
    if (gate) {
      B.box(0.48, 0.2, 0.48, pal(c2));
      B.box(0.34, H * 0.5, 0.34, pal(c0), 0, 0.2, 0);
      B.box(0.28, H * 0.22, 0.28, pal(c1), 0, 0.2 + H * 0.5, 0);
      const top = 0.2 + H * 0.72;
      for (let i = 0; i < 5; i++) spike(B, 0.06, 0.42 - Math.abs(i - 2) * 0.06, i % 2 ? ["#f3f3f3", "#ededed", "#d8d8d8"] : c1, 0, top, 0, 0, (i - 2) * 0.38);
      beamPair(B, H, d, H * 0.62, 0.14, c0);
      if (d.side) for (let k = 0; k < 3; k++) { const off = -d.side * (0.2 + k * 0.28); if (d.axis === "x") spike(B, 0.04, 0.24, ["#f3f3f3", "#ededed", "#d8d8d8"], 0, H * 0.62 + 0.14, off, 0, 0); else spike(B, 0.04, 0.24, ["#f3f3f3", "#ededed", "#d8d8d8"], off, H * 0.62 + 0.14, 0, 0, 0); }
      return;
    }
    B.rbox(0.8, 0.16, 0.44, 0.06, pal(c2), 0, 0, 0);
    for (let i = 0; i < 5; i++) { const x = -0.3 + i * 0.15; spike(B, 0.07, H * (0.7 + (i % 2) * 0.3), i % 2 ? c1 : c0, x, 0.14, (i % 2 ? 0.06 : -0.06), (v % 2 ? 0.35 : -0.35), x * 0.8); }
  },
  loop(B, H, v, { c0, c1, c2 }) {
    const pts = [];
    const R = 0.36, hh = Math.max(0.3, H);
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); pts.push([Math.cos(a) * R, Math.sin(a) * hh * 0.9, 0]); }
    B.at(0, 0, 0, v % 2 ? 0.5 : -0.4, () => {
      for (const x of [-R, R]) B.box(0.16, 0.06, 0.16, pal(c1), x, 0, 0);
      for (let i = 0; i < pts.length; i++) B.box(0.1, 0.1, 0.1, pal(i % 2 ? c0 : c1), pts[i][0], pts[i][1], 0);
      if (hh > 0.45) for (let i = 1; i < 8; i += 2) B.box(0.06, 0.06, 0.06, pal(c2), pts[i][0] * 0.72, pts[i][1] * 0.75 + 0.1, 0.12);
    });
  },
  woven(B, H, v, { c0, c1, c2 }) {
    B.box(0.64, H * 0.42, 0.56, pal(c0));
    B.box(0.5, H * 0.3, 0.44, pal(c1), 0, H * 0.42, 0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) B.at(-0.2 + i * 0.2, H * 0.72, -0.1 + j * 0.2, Math.PI / 4, () => B.box(0.12, 0.08, 0.12, pal((i + j + v) % 2 ? c2 : c0), 0, 0, 0));
    for (const s of [-1, 1]) B.at(s * 0.33, H * 0.12, 0, Math.PI / 4, () => B.box(0.14, H * 0.2, 0.14, pal(c2), 0, 0, 0));
  },
  lattice(B, H, v, { c0, c1, c2, d, gate }) {
    B.box(0.46, 0.18, 0.46, pal(c2));
    B.box(0.3, H * 0.62, 0.3, pal(c0), 0, 0.18, 0);
    B.box(0.36, 0.1, 0.36, pal(c1), 0, 0.18 + H * 0.62, 0);
    B.at(0, 0.28 + H * 0.62, 0, Math.PI / 4, () => B.box(0.22, 0.22, 0.22, pal(c1), 0, 0, 0));
    if (gate || d.side) {
      const y = H * 0.66;
      beamPair(B, H, d, y, 0.14, c0);
      if (d.side) for (let k = 0; k < 4; k++) {
        const off = -d.side * (0.12 + k * 0.24), up = k % 2 ? 0.18 : 0.3;
        if (d.axis === "x") B.at(0, y + 0.14, off, 0, () => B.box(0.16, up, 0.12, pal(k % 2 ? c1 : c2), 0, 0, 0));
        else B.at(off, y + 0.14, 0, 0, () => B.box(0.12, up, 0.16, pal(k % 2 ? c1 : c2), 0, 0, 0));
      }
    }
  },
  ribcage(B, H, v, { c0, c1 }) {
    B.rbox(0.5, 0.22, 0.36, 0.08, pal(c1), 0, 0, -0.04);
    B.box(0.14, 0.14, 0.7, pal(c0), 0, 0.2, 0);
    for (let i = 0; i < 3; i++) {
      const z = -0.24 + i * 0.24, hk = H * (0.8 - i * 0.14);
      for (const s of [-1, 1]) {
        B.box(0.1, hk * 0.5, 0.1, pal(c0), s * 0.26, 0.1, z);
        B.box(0.1, hk * 0.35, 0.1, pal(c0), s * 0.2, 0.1 + hk * 0.5, z);
        B.box(0.12, 0.08, 0.1, pal(c1), s * 0.12, 0.1 + hk * 0.82, z);
      }
    }
  },
  talon(B, H, v, { c0, c1, c2, d, gate, bone }) {
    if (bone) {
      B.rbox(0.7, 0.14, 0.6, 0.08, pal(c2), 0, 0, 0);
      [[-0.18, -0.08, 0.95, 0.3], [0.16, 0.06, 0.8, -0.35], [0.0, 0.18, 0.6, 0.1]].forEach(([x, z, k, lean]) => tilted(B, [0, 0, 1], lean, x, 0.12, z, () => {
        B.box(0.2, H * k * 0.45, 0.2, pal(c0), 0, 0, 0);
        B.box(0.15, H * k * 0.3, 0.15, pal(c1), -Math.sign(lean) * 0.03, H * k * 0.45, 0);
        spike(B, 0.08, H * k * 0.28, c0, -Math.sign(lean) * 0.06, H * k * 0.75, 0, 0, Math.sign(lean) * 0.6);
      }));
      return;
    }
    B.box(0.52, 0.2, 0.52, pal(c1));
    B.box(0.42, H * 0.36, 0.42, pal(c0), 0, 0.2, 0);
    B.box(0.32, H * 0.28, 0.32, pal(c1), 0.03, 0.2 + H * 0.36, -0.02);
    B.cone(0.2, 0, H * 0.22, pal(c0), 0.03, 0.2 + H * 0.64, -0.02, 4);
    for (const s of [-1, 1]) spike(B, 0.07, 0.3, c2, s * 0.22, 0.2 + H * (s > 0 ? 0.3 : 0.5), 0, 0, -s * 1.1);
    beamPair(B, H, d, H * 0.55, 0.14, c1);
  },
  scute(B, H, v, { c0, c1, c2 }) {
    const seg = [[0.62, 0.36, c0], [0.48, 0.32, c1], [0.34, 0.28, c2 || c0]];
    let y = 0;
    const tot = seg.reduce((a, s) => a + s[1], 0);
    seg.forEach(([w, hk, c], i) => { const hh = H * hk / tot; B.at(i % 2 ? 0.04 : -0.03, y, 0, Math.PI / 4 + (v % 2 ? 0.2 : 0) + i * 0.15, () => B.box(w, hh, w, pal(c), 0, 0, 0)); y += hh; });
  },
};

const lensKind = (t, role) => (LK.find(([, re]) => re.test(t)) || [null])[0];

function registerLens(P, props, types, leadT) {
  const pose = lensPose(props[leadT].pose || "");
  const K = lensSkin(tonesOf(P, leadT), pose);
  const baseLo = pose === "crouch" ? ["#6e5a48", "#5a483a", "#44362c"] : pose === "lunge" ? ["#8a6048", "#6e4a38", "#56382a"] : ["#4a4a50", "#3a3a40", "#2a2a2e"];
  const baseHi = pose === "crouch" ? ["#9a8266", "#806a52", "#665440"] : pose === "lunge" ? ["#b07c5c", "#946448", "#784e38"] : ["#d8d8d8", "#bcbcbc", "#9a9a9a"];
  const catalog = {}, builders = {};
  for (const t of types) {
    const p = props[t], role = p.role;
    const lead = role === "lead" || role === "creature";
    catalog[t] = { footprint: lead ? [2, 2] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? LENS_POSE_H[pose][0] : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, K.side), c1 = pick(tn, 1, K.belly), c2 = pick(tn, 2, K.back);
    const kind = lensKind(t, role);
    const bone = /bone/i.test(t);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) {
        B.push(0, 0, 0, 0, H / LENS_POSE_H[pose][1]);
        lensBase(B, pose, K, baseLo, baseHi, v);
        LENS_POSES[pose](B, K, v);
        B.pop();
      } else if (kind && LB[kind]) LB[kind](B, H, v, { c0, c1, c2, d, gate: role === "threshold", bone });
      else if (role === "threshold") threshold(B, t, H, c0, c1, c2, d, K);
      else if (role === "light") {
        B.box(0.3, 0.14, 0.3, pal(c0));
        B.box(0.16, H - 0.62, 0.16, pal(c0), 0, 0.14, 0);
        B.box(0.34, 0.08, 0.34, pal(c1), 0, H - 0.48, 0);
        B.box(0.22, 0.24, 0.22, pal(P.flame || ["#ffd23a", "#f0a020", "#d07a10"]), 0, H - 0.4, 0);
        B.cone(0.24, 0, 0.18, pal(c2), 0, H - 0.16, 0, 4);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}
