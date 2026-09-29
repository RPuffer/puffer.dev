import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

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

function head(B, K, open, v) {
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
    B.box(0.05, 0.03, 0.16, pal(INK), x, 0.24, 0.1);
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

export function finish(level, brief, h) {
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
