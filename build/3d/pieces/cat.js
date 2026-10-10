import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark, register as registerThemed } from "./multitile-themed-a.js";
import { placeThings } from "./wizard.js";
import { dropFront } from "./sightline.js";
import { CATALOG, registerCatalog } from "../../core/catalog.js";
import { placeGeneric } from "./multitile-place.js";
import { BIBLE, ramp, luma, hexRgb, figure, lockedKit } from "../prims.js";
import { outgrow as growOut, echo, grow as widen } from "./outgrowth.js";

const FAUVE = {
  magenta: ["#ee4f8e", "#cf3a78", "#a82a62"],
  pink: ["#f68fb6", "#e06f9c", "#c0527e"],
  yellow: ["#ffd23a", "#f0b81e", "#cf9612"],
  orange: ["#ff8a2a", "#ec6c16", "#c9530d"],
  blue: ["#4f55d6", "#3b3fb5", "#2c2e8f"],
  teal: ["#27a888", "#1d8a6d", "#156a54"],
  lilac: ["#c9b6ea", "#b09bd6", "#8f7bb8"],
  ink: ["#2a1f33", "#21192a", "#170f1e"],
  white: ["#fffaf0", "#efe6d6", "#d7cbb6"],
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

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function otri(B, a, b, c, out, p) {
  const n = V().subVectors(b, a).cross(V().subVectors(c, a));
  if (n.dot(out) < 0) B.tri(a.toArray(), c.toArray(), b.toArray(), p);
  else B.tri(a.toArray(), b.toArray(), c.toArray(), p);
}

function slab(B, pts, o, U, W, t, c) {
  const u = U.clone().normalize(), w0 = W.clone().normalize();
  const N = V().crossVectors(u, w0).normalize();
  const w = V().crossVectors(N, u).normalize();
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const [a, b] = pts[i], [c2, d] = pts[(i + 1) % pts.length]; area += a * d - c2 * b; }
  const P = area < 0 ? [...pts].reverse() : pts;
  const at = (q, sg) => o.clone().addScaledVector(u, q[0]).addScaledVector(w, q[1]).addScaledVector(N, sg * t / 2);
  const f = P.map((q) => at(q, 1)), k = P.map((q) => at(q, -1));
  const pp = pal(c), nN = N.clone().negate();
  for (let i = 1; i < P.length - 1; i++) { otri(B, f[0], f[i], f[i + 1], N, pp); otri(B, k[0], k[i], k[i + 1], nN, pp); }
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    const e = V().subVectors(f[j], f[i]);
    const out = V().crossVectors(e, N);
    otri(B, f[i], f[j], k[j], out, pp);
    otri(B, f[i], k[j], k[i], out, pp);
  }
}

function catBase(B, kind, style) {
  const F = FAUVE;
  if (kind === "palette") {
    B.prism(circle(0, 0, 0.98, 0.82, 10, 0.3), 0, 0.14, pal(["#c98a4e", "#a86d38", "#7f5028"]));
    B.cyl(0.14, 0.02, pal(style.bg || F.white), -0.6, 0.14, 0.32, 8);
    const daubs = [[F.blue, -0.62, -0.28], [F.magenta, -0.2, -0.62], [F.yellow, 0.3, -0.63], [F.orange, 0.66, -0.2], [F.teal, 0.62, 0.3], [F.pink, 0.22, 0.6]];
    for (const [c, x, z] of daubs) { B.rbox(0.26, 0.1, 0.22, 0.08, pal(c), x, 0.14, z); B.cone(0.08, 0, 0.1, pal(c), x + 0.03, 0.24, z, 4); }
    return 0.14;
  }
  if (kind === "box") {
    const K = ["#d9a45c", "#b98541", "#8f632b"], K2 = ["#c28d48", "#a07234", "#7a5424"];
    B.box(1.1, 0.5, 1.0, pal(K), 0, 0, 0);
    B.box(0.96, 0.02, 0.86, pal(F.ink), 0, 0.5, 0);
    slab(B, [[0, -0.5], [0.34, -0.46], [0.34, 0.46], [0, 0.5]], V(0, 0.5, 0.5), V(0, 0.55, 0.8), V(1, 0, 0), 0.04, K2);
    slab(B, [[0, -0.45], [0.3, -0.4], [0.3, 0.42], [0, 0.45]], V(0.55, 0.5, 0), V(0.8, 0.6, 0), V(0, 0, 1), 0.04, K2);
    slab(B, [[0, -0.45], [0.28, -0.4], [0.28, 0.42], [0, 0.45]], V(-0.55, 0.5, 0), V(-0.8, 0.5, 0), V(0, 0, 1), 0.04, K);
    B.box(0.5, 0.03, 0.12, pal(["#e8dfce", "#d5cbbd", "#baa993"]), 0.1, 0.25, 0.51);
    return 0.38;
  }
  if (kind === "tiers") {
    B.prism(circle(0, 0, 1.0, 1.0, 6, Math.PI / 6), 0, 0.16, pal(F.ink));
    B.prism(circle(0, 0, 0.84, 0.84, 6, Math.PI / 6), 0.16, 0.3, pal(F.blue));
    B.prism(circle(0, 0, 0.7, 0.7, 6, Math.PI / 6), 0.3, 0.4, pal(F.orange));
    return 0.4;
  }
  plinth(B, 0.9, 0.24, style.plinthLo, style.plinthHi);
  return 0.24;
}

const BASE_H = { palette: 0.14, box: 0.38, tiers: 0.4 };
const FIG_H = 2.3;
const hueOf = (hex) => { const [r, g, b] = hexRgb(hex), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (d < 1e-6) return -1; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
const satOf = (hex) => { const c = hexRgb(hex), mx = Math.max(...c); return mx ? (mx - Math.min(...c)) / mx : 0; };
const lum = (hex) => luma(hexRgb(hex));

function catColours(list) {
  const hexes = [...new Set(list.map((t) => (Array.isArray(t) ? t[0] : t)).filter((h) => /^#[0-9a-f]{6}$/i.test(h)).map((h) => h.toLowerCase()))];
  const dark = hexes.filter((h) => lum(h) < 0.3).sort((a, b) => lum(a) - lum(b))[0] || "#363a56";
  const cream = hexes.filter((h) => satOf(h) < 0.25 && lum(h) > 0.7).sort((a, b) => lum(b) - lum(a))[0] || "#e8dfce";
  const warm = hexes.filter((h) => { const u = hueOf(h); return u >= 30 && u <= 60 && satOf(h) > 0.6; }).sort((a, b) => satOf(b) - satOf(a))[0] || "#df9e0c";
  const accent = hexes.find((h) => { const u = hueOf(h); return (u >= 330 || u <= 15) && satOf(h) > 0.3 && lum(h) < 0.6; }) || "#c4616d";
  return { body: dark, coat: warm, bib: cream, accent };
}

export function catSpec(c, o = {}) {
  const eye = ramp(c.coat)[3], ink = BIBLE.ink, white = BIBLE.white;
  const head = { pivot: [0, 0.08], ry: o.head ?? 0 };
  return {
    name: "cat",
    groups: { head },
    parts: [
      { id: "haunch", prim: "rbox", dims: [1.0, 0.62, 0.8], at: [0, 0, -0.14], base: c.coat },
      { id: "back", prim: "rbox", dims: [0.74, 0.58, 0.62], at: [0, 0.56, -0.12], base: c.body },
      { id: "bib", prim: "rbox", dims: [0.56, 0.86, 0.36], at: [0, 0.26, 0.2], base: c.bib },
      { id: "legL", prim: "rbox", dims: [0.2, 0.62, 0.2], at: [-0.17, 0.08, 0.4], base: c.coat },
      { id: "legR", prim: "rbox", dims: [0.2, 0.62, 0.2], at: [0.17, 0.08, 0.4], base: c.body },
      { id: "paws", prim: "rbox", dims: [0.62, 0.11, 0.3], at: [0, 0, 0.44], base: c.bib },
      { id: "tail", prim: "chain", at: [0.52, 0, -0.42], base: c.body, links: [
        { dims: [0.17, 0.15, 0.3], at: [0, 0, 0], base: c.body },
        { dims: [0.17, 0.15, 0.3], at: [0.08, 0, 0.3], base: c.coat },
        { dims: [0.17, 0.15, 0.3], at: [0.07, 0, 0.6], base: c.body },
        { dims: [0.17, 0.15, 0.26], at: [-0.04, 0, 0.86], ry: 0.6, base: c.coat },
      ] },
      { id: "head", role: "head", group: "head", prim: "rbox", dims: [0.86, 0.82, 0.74], at: [0, 1.06, 0.08], base: c.body },
      { id: "blaze", group: "head", prim: "rbox", dims: [0.2, 0.05, 0.62], at: [0.02, 1.88, 0.1], base: c.bib },
      { id: "muzzle", group: "head", prim: "rbox", dims: [0.42, 0.22, 0.18], at: [0, 1.24, 0.5], base: c.bib },
      { id: "earL", group: "head", prim: "spike", dims: [0.34, 0.42, 0.16, -0.06], at: [-0.24, 1.88, -0.02], base: c.body },
      { id: "earR", group: "head", prim: "spike", dims: [0.34, 0.42, 0.16, 0.06], at: [0.24, 1.88, -0.02], base: c.coat },
      { id: "innerL", face: true, group: "head", prim: "spike", dims: [0.18, 0.26, 0.04, -0.04], at: [-0.24, 1.88, 0.08], base: c.accent },
      { id: "innerR", face: true, group: "head", prim: "spike", dims: [0.18, 0.26, 0.04, 0.04], at: [0.24, 1.88, 0.08], base: c.accent },
      { id: "eyeL", face: true, group: "head", prim: "box", dims: [0.17, 0.11, 0.04], at: [-0.2, 1.52, 0.46], base: eye },
      { id: "eyeR", face: true, group: "head", prim: "box", dims: [0.17, 0.11, 0.04], at: [0.2, 1.52, 0.46], base: eye },
      { id: "pupilL", face: true, group: "head", prim: "box", dims: [0.05, 0.1, 0.03], at: [-0.17, 1.525, 0.49], base: ink },
      { id: "pupilR", face: true, group: "head", prim: "box", dims: [0.05, 0.1, 0.03], at: [0.23, 1.525, 0.49], base: ink },
      { id: "nose", face: true, group: "head", prim: "box", dims: [0.1, 0.06, 0.05], at: [0, 1.43, 0.58], base: c.accent },
      { id: "mouth", face: true, group: "head", prim: "box", dims: [0.3, 0.15, 0.06], at: [0, 1.09, 0.47], base: ink },
      { id: "tongue", face: true, group: "head", prim: "box", dims: [0.16, 0.05, 0.05], at: [0, 1.09, 0.5], base: c.accent },
      { id: "fangL", face: true, group: "head", prim: "box", dims: [0.05, 0.06, 0.03], at: [-0.08, 1.16, 0.51], base: white },
      { id: "fangR", face: true, group: "head", prim: "box", dims: [0.05, 0.06, 0.03], at: [0.08, 1.16, 0.51], base: white },
    ],
  };
}

function cat(B, H, style, v, o = {}, ctx = {}) {
  const yb = BASE_H[o.base] ?? 0.24;
  const s = H / (yb + FIG_H);
  B.push(0, 0, 0, 0, s);
  const y0 = catBase(B, o.base, style);
  B.push(0, y0, 0, o.yaw ?? 0, 1);
  const K = lockedKit(B, ctx.style, ctx.rot || 0);
  const a = figure(K, catSpec(style.colours, { head: (o.head ?? 0.3) * 0.4 + (v % 2) * 0.12 }));
  B.pop();
  B.pop();
  return { K, audit: a };
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|cushion|crag/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

const LENS_KINDS = [
  ["knifeSlab", /knife|slab|scrap/i],
  ["bristle", /bristle|tuft|brush/i],
  ["paintBars", /chromatic-plinth|paint-bar|oil-bar/i],
  ["cardbox", /cardboard|box/i],
  ["crock", /crock|bowl|dish|saucer/i],
  ["planter", /planter|cat-grass/i],
  ["doorframe", /pantry|sill|beam|door/i],
  ["collar", /collar|curb/i],
  ["tooth", /canine|fang|tooth|pinnacle/i],
  ["ear", /auricle|ear/i],
  ["iris", /iris|eye/i],
];
const lensKind = (t, role) => role === "lead" || role === "creature" ? null : (LENS_KINDS.find(([, re]) => re.test(t)) || [null])[0];

function beamAcross(B, d, y, th, w, c, reach = 1.0) {
  if (!d.side) return;
  if (d.axis === "x") B.box(w, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05));
  else B.box(reach + 0.3, th, w, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
}

const F = FAUVE;
const HUES = [F.magenta, F.yellow, F.blue, F.orange, F.teal, F.pink];
const WOOD = ["#c9793c", "#a55f2b", "#7c441c"];
const CREAM = ["#f4ecdc", "#e2d6c0", "#c6b69c"];

const LENS_BUILD = {
  knifeSlab(B, H, v) {
    const a = HUES[v % 6], b = HUES[(v + 3) % 6];
    B.rbox(0.72, 0.14, 0.6, 0.06, pal(CREAM), 0, 0, 0);
    slab(B, [[0, -0.34], [0.2, -0.36], [H * 0.95, -0.2], [H, 0.18], [0.1, 0.34]], V(-0.1, 0.12, 0.05), V(0.28, 1, 0.1), V(0, 0.2, 1), 0.26, a);
    slab(B, [[0.05, -0.12], [H * 0.9, -0.06], [H * 0.95, 0.1], [0.08, 0.12]], V(-0.02, 0.14, 0.2), V(0.28, 1, 0.1), V(0, 0.2, 1), 0.3, b);
    slab(B, [[0, -0.1], [0.46, -0.08], [0.56, 0], [0.46, 0.08], [0, 0.1]], V(0.2, 0.14, -0.18), V(1, 0.35, -0.2), V(0, 0, 1), 0.04, ["#dfe3ea", "#b8bec9", "#8e95a3"]);
    B.box(0.08, 0.08, 0.26, pal(WOOD), 0.18, 0.1, -0.18);
  },
  bristle(B, H, v) {
    B.rbox(0.34, 0.16, 0.3, 0.05, pal(["#dfe3ea", "#b8bec9", "#8e95a3"]), 0, 0, 0);
    B.sway("crown", { amp: 0.045, root: [0, 0.14, 0], span: H }, () => {
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.32, c = HUES[(i + v) % 6];
        slab(B, [[0, -0.05], [H * 0.9, -0.03], [H, 0], [H * 0.9, 0.04], [0, 0.05]], V(Math.sin(a) * 0.06, 0.14, (i - 3) * 0.012), V(Math.sin(a) * 0.7, 1, (i % 2 ? 0.18 : -0.12)), V(Math.cos(a), 0, 0), 0.12, c);
      }
    });
  },
  paintBars(B, H, v, { d }) {
    const bars = [F.blue, F.magenta, F.yellow, F.orange, F.blue];
    const hh = (H - 0.2) / bars.length;
    bars.forEach((c, i) => B.rbox(0.5 - i * 0.04, hh, 0.44 - i * 0.03, 0.05, pal(c), (i % 2 ? 0.04 : -0.03), i * hh, (i % 2 ? -0.03 : 0.04)));
    B.cone(0.16, 0, 0.2, pal(F.pink), 0, H - 0.2, 0, 4);
    beamAcross(B, d, H * 0.78, 0.16, 0.26, F.blue);
    beamAcross(B, d, H * 0.78 + 0.16, 0.1, 0.2, F.yellow);
  },
  cardbox(B, H, v) {
    const K = ["#d9a45c", "#b98541", "#8f632b"], K2 = ["#c28d48", "#a07234", "#7a5424"];
    B.box(0.76, H * 0.7, 0.7, pal(K), 0, 0, 0);
    B.box(0.66, 0.02, 0.6, pal(F.ink), 0, H * 0.7, 0);
    slab(B, [[0, -0.36], [0.24, -0.32], [0.24, 0.32], [0, 0.36]], V(0, H * 0.7, 0.35), V(0, 0.6, 0.8), V(1, 0, 0), 0.04, K2);
    slab(B, [[0, -0.33], [0.22, -0.3], [0.22, 0.3], [0, 0.33]], V(0.38, H * 0.7, 0), V(0.8, 0.5, 0), V(0, 0, 1), 0.04, K2);
    B.box(0.34, 0.03, 0.1, pal(CREAM), v % 2 ? 0.1 : -0.1, H * 0.35, 0.36);
  },
  crock(B, H, v) {
    const glaze = v % 2 ? F.blue : F.teal;
    B.cyl(0.34, H * 0.5, pal(CREAM), 0, 0, 0, 10);
    B.cyl(0.38, 0.08, pal(glaze), 0, H * 0.5, 0, 10);
    B.cyl(0.28, 0.04, pal(F.ink), 0, H * 0.5 + 0.04, 0, 10);
    for (let i = 0; i < 9; i++) { const a = i * 2.1, r = 0.06 + (i % 3) * 0.07; B.box(0.08, 0.08, 0.08, pal(i % 2 ? F.orange : ["#b86a2a", "#94521d", "#6f3b12"]), Math.cos(a) * r, H * 0.5 + 0.06, Math.sin(a) * r); }
  },
  planter(B, H, v) {
    B.box(0.76, H * 0.45, 0.4, pal(F.orange), 0, 0, 0);
    B.box(0.8, 0.06, 0.44, pal(CREAM), 0, H * 0.45, 0);
    for (let i = 0; i < 6; i++) { const x = -0.28 + i * 0.112, z = (i % 2 ? 0.07 : -0.07); B.cone(0.08, 0, H * (0.5 + (i + v) % 3 * 0.12), pal(i % 2 ? ["#5ac389", "#44a46b", "#32774e"] : ["#8ce263", "#64c960", "#50ab46"]), x, H * 0.5, z, 4); }
  },
  doorframe(B, H, v, { d }) {
    B.box(0.42, 0.14, 0.42, pal(CREAM));
    B.box(0.28, H - 0.14, 0.28, pal(WOOD), 0, 0.14, 0);
    B.box(0.32, 0.08, 0.32, pal(F.yellow), 0, H * 0.45, 0);
    B.box(0.36, 0.12, 0.36, pal(CREAM), 0, H - 0.12, 0);
    beamAcross(B, d, H - 0.24, 0.22, 0.3, WOOD);
    beamAcross(B, d, H - 0.02, 0.08, 0.36, CREAM);
  },
  collar(B, H, v) {
    B.rbox(0.86, H * 0.6, 0.5, 0.12, pal(F.orange), 0, 0, 0);
    B.rbox(0.7, H * 0.4, 0.34, 0.1, pal(v % 2 ? F.yellow : F.pink), 0.04, H * 0.6, -0.02);
    B.box(0.5, 0.04, 0.08, pal(F.ink), 0, H * 0.6, 0.22);
  },
  tooth(B, H, v, { d }) {
    B.prism(circle(0, 0, 0.3, 0.3, 6, Math.PI / 6), 0, 0.22, pal(["#5a3a78", "#46295f", "#321c46"]));
    B.box(0.28, 0.18, 0.28, pal(F.lilac), 0, 0.22, 0);
    B.cone(0.2, 0, H - 0.4, pal(F.white), 0, 0.4, 0, 4);
    beamAcross(B, d, H * 0.45, 0.26, 0.3, F.ink);
    beamAcross(B, d, H * 0.45 - 0.08, 0.08, 0.22, F.lilac);
  },
  ear(B, H, v) {
    const lean = v % 2 ? -1 : 1, W = V(1, 0, -1), U = V(lean * 0.16, 1, lean * -0.16);
    B.rbox(0.8, 0.18, 0.8, 0.08, pal(F.blue), 0, 0, 0);
    slab(B, [[0, -0.46], [H * 0.98, lean * 0.08], [0, 0.46]], V(0, 0.16, 0), U, W, 0.36, lean > 0 ? F.orange : F.blue);
    slab(B, [[0.06, -0.28], [H * 0.72, lean * 0.05], [0.06, 0.28]], V(0.12, 0.18, 0.12), U, W, 0.2, F.pink);
    slab(B, [[H * 0.66, -0.12], [H * 0.98, lean * 0.08], [H * 0.66, 0.14]], V(0.03, 0.16, 0.03), U, W, 0.42, lean > 0 ? F.yellow : F.teal);
  },
  iris(B, H, v) {
    B.cyl(0.3, 0.2, pal(F.ink), 0, 0, 0, 8);
    B.cyl(0.22, H * 0.45, pal(F.orange), 0, 0.2, 0, 8);
    B.cyl(0.26, 0.08, pal(F.yellow), 0, 0.2 + H * 0.45, 0, 8);
    B.at(0, 0.28 + H * 0.45, 0, Math.PI / 4, () => {
      B.box(0.5, 0.36, 0.14, pal(F.ink), 0, 0, 0);
      B.box(0.42, 0.28, 0.16, pal(P_FLAME), 0, 0.04, 0);
      B.box(0.1, 0.26, 0.18, pal(F.ink), 0, 0.05, 0);
      B.box(0.05, 0.05, 0.19, pal(F.white), 0.06, 0.24, 0);
    });
  },
  stroke(B, H, v) {
    const a = HUES[v % 6], b = HUES[(v + 2) % 6];
    B.at(0, 0, 0, (v % 3 - 1) * 0.5, () => {
      B.rbox(0.9, 0.07, 0.3, 0.12, pal(a), 0, 0, 0);
      B.rbox(0.7, 0.05, 0.1, 0.04, pal(b), 0.06, 0.07, -0.06);
      B.rbox(0.18, 0.1, 0.32, 0.06, pal(a), 0.42, 0, 0);
    });
  },
  saucer(B, H, v) {
    B.cyl(0.3, 0.05, pal(CREAM), 0, 0, 0, 10);
    B.cyl(0.22, 0.03, pal(["#fffaf0", "#f4eee2", "#e6dccb"]), 0, 0.05, 0, 10);
    if (v % 2) B.rbox(0.3, 0.02, 0.16, 0.07, pal(["#fffaf0", "#f4eee2", "#e6dccb"]), 0.3, 0, 0.16);
  },
  cupboard(B, H, v) {
    B.box(0.82, H, 0.56, pal(WOOD), 0, 0, 0);
    B.box(0.72, 0.06, 0.02, pal(F.ink), 0, H * 0.34, 0.28);
    B.box(0.72, 0.06, 0.02, pal(F.ink), 0, H * 0.66, 0.28);
    const jars = [[F.yellow, -0.22], [F.magenta, 0.0], [F.teal, 0.22]];
    for (const [k, [c, x]] of jars.entries()) {
      B.cyl(0.09, 0.2, pal(c), x, H * 0.4, 0.22, 6);
      B.cyl(0.08, 0.2, pal(HUES[(k + v + 2) % 6]), x, H * 0.72, 0.23, 6);
    }
    B.box(0.9, 0.08, 0.62, pal(CREAM), 0, H, 0);
    B.box(0.06, 0.18, 0.06, pal(F.yellow), 0.3, H * 0.12, 0.3);
  },
  sunbeam(B, H, v) {
    const S = ["#fff2b8", "#fbe39a", "#f0cf78"];
    B.at(0, 0, 0, -0.6, () => {
      B.box(0.9, 0.03, 0.2, pal(S), 0, 0, -0.18);
      B.box(0.9, 0.03, 0.2, pal(S), 0, 0, 0.14);
    });
  },
};
let P_FLAME = FAUVE.yellow;

const EXTRA = {
  "knife-stroke": { kind: "stroke", footprint: [1, 1], passable: true, height: 0.12, variants: 6 },
  "milk-saucer": { kind: "saucer", footprint: [1, 1], passable: true, height: 0.1, variants: 2 },
  "pantry-cupboard": { kind: "cupboard", footprint: [1, 1], passable: false, height: 1.9, variants: 2 },
  "sun-patch": { kind: "sunbeam", footprint: [1, 1], passable: true, height: 0.05, variants: 1 },
};

const BASE_OF = (t, pose) => /fauvist/.test(t) ? "palette" : /calico|sentinel/.test(t) ? "box" : /fauve-cat/.test(t) ? "tiers" : null;

export function figures(style) {
  const P = style.palette, out = {};
  for (const [t, p] of Object.entries(P.props || {})) if (p.role === "lead" || p.role === "creature") out[t] = catSpec(catColours(tonesOf(P, t)));
  return out;
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ["#9d8fa6", "#847790", "#655a70"]), plinthHi: pick(dt, 1, ["#c7b9cf", "#a799b0", "#85778f"]), bg: P.bg ? [P.bg, P.bg, P.bg] : null };
  P_FLAME = FAUVE.yellow;

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = p.role;
    const kind = lensKind(t, role);
    const tall = role === "threshold" ? 1.7 : kind === "ear" ? 2.4 : null;
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" || role === "threshold" ? false : !!p.passable, variants: kind ? 6 : 2, height: role === "lead" ? Math.min(BIBLE.scale.focal[1], Math.max(2.4, p.height || 2.5)) : tall || Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, FAUVE.orange), c1 = pick(tn, 1, FAUVE.yellow), c2 = pick(tn, 2, FAUVE.magenta);
    const base = BASE_OF(t, p.pose);
    const lensPose = base === "tiers" ? { base, yaw: 0.35, head: 0.3, earR: 0.62, earL: 0.46, tilt: 1 } : base === "box" ? { base, yaw: 0.3, head: 0.62, earR: 0.5, earL: 0.3 } : base ? { base, yaw: 0.4, head: 0.35 } : null;
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead" || role === "creature") { const r = cat(B, H, { ...look, colours: catColours(tonesOf(P, t)) }, v, lensPose || {}, { style, rot }); const m = mesh(B); m.userData.parts = r.K.parts; m.userData.audit = r.audit; return m; }
      else if (kind) LENS_BUILD[kind](B, H, v, { c0, c1, c2, d });
      else if (role === "threshold") {
        B.box(0.44, 0.24, 0.44, pal(c0));
        B.box(0.3, H * 0.62, 0.3, pal(c1), 0, 0.24, 0);
        B.box(0.36, 0.14, 0.36, pal(c2), 0, 0.24 + H * 0.62, 0);
        const top = 0.38 + H * 0.62;
        B.cone(0.13, 0, 0.3, pal(FAUVE.orange), -0.08, top, 0, 4);
        B.cone(0.13, 0, 0.3, pal(FAUVE.pink), 0.08, top, 0, 4);
        if (d.side) {
          const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(H * 0.7, 0.14, c2);
          beam(H * 0.7 + 0.2, 0.08, FAUVE.blue);
        }
      } else if (role === "dais") {
        plinth(B, 0.42, H, c0, c1);
      } else if (role === "light") {
        B.box(0.24, 0.12, 0.24, pal(c0));
        B.box(0.1, H - 0.5, 0.1, pal(c0), 0, 0.12, 0);
        B.box(0.28, 0.06, 0.28, pal(c2), 0, H - 0.4, 0);
        B.sway("swatch", { rate: 0.35, duty: 0.5, root: [0, H - 0.34, 0], alt: pal(FAUVE.orange) }, () => B.box(0.2, 0.22, 0.2, pal(P.flame || FAUVE.yellow), 0, H - 0.34, 0));
        B.cone(0.2, 0, 0.14, pal(c2), 0, H - 0.12, 0, 4);
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        const k = v % 2 ? FAUVE.teal : FAUVE.yellow;
        B.box(0.16, 0.16, 0.16, pal(k), -0.05, H * 0.55, 0.02);
        B.box(0.12, 0.2, 0.12, pal(c1), 0.07, H * 0.55, -0.04);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.62, 0.48, 0.34] : [0.56, 0.44, 0.3];
        const hh = (H - 0.3) / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c2][i % 3]), (i % 2 ? 0.04 : -0.03), i * hh, (i % 2 ? -0.03 : 0.03)));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, H - 0.3, 0, 4);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  if (types.some((t) => BASE_OF(t))) for (const [t, e] of Object.entries(EXTRA)) {
    catalog[t] = { footprint: e.footprint, passable: e.passable, variants: e.variants, height: e.height };
    builders[t] = (v, rot, st, ctx) => { const B = new Baker(); LENS_BUILD[e.kind](B, ctx.height, v, { d: ctx.decor || {} }); return mesh(B); };
  }
  return { catalog, builders };
}

export const PIN = { "cat-medium": {"spawn":[8,9],"cells":[],"decor":[{"t":"fauvist-vocal-cat","x":1,"z":2,"v":0,"rot":0,"ox":0,"oz":0,"watch":"w1"},{"t":"palette-knife-slab","x":5,"z":2,"v":4,"rot":0,"ox":0.05,"oz":-0.02},{"t":"bristle-tuft","x":4,"z":4,"v":5,"rot":0,"ox":0.04,"oz":-0.09},{"t":"bristle-tuft","x":7,"z":8,"v":1,"rot":0,"ox":0.09,"oz":0.12},{"t":"chromatic-plinth","x":5,"z":8,"v":0,"rot":0,"ox":0,"oz":0},{"t":"pot","x":1,"z":4,"v":1,"rot":0,"ox":0,"oz":0},{"t":"palette-knife-slab","x":8,"z":4,"v":2,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":1,"z":6,"v":1,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":3,"z":6,"v":2,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":5,"z":6,"v":3,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":6,"z":10,"v":4,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":6,"z":7,"v":5,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":4,"z":5,"v":7,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":6,"z":2,"v":8,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":7,"z":6,"v":9,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":4,"z":7,"v":10,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":7,"z":4,"v":11,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":8,"z":3,"v":12,"rot":0,"ox":0,"oz":0},{"t":"cat-paint-tube-windmill-small","x":5,"z":3,"v":0,"rot":0,"ox":0,"oz":0},{"t":"market-row","x":11,"z":5,"v":0,"rot":1,"ox":0,"oz":0},{"t":"chromatic-plinth","x":8,"z":7,"v":5,"rot":0,"ox":0.1,"oz":-0.07},{"t":"bristle-tuft","x":10,"z":4,"v":1,"rot":0,"ox":-0.04,"oz":0.1},{"t":"pot","x":9,"z":8,"v":0,"rot":0,"ox":0.07,"oz":0.09},{"t":"palette-knife-slab","x":11,"z":2,"v":2,"rot":0,"ox":-0.06,"oz":-0.04},{"t":"rock-big","x":12,"z":2,"v":0,"rot":0,"ox":-0.06,"oz":0.07},{"t":"chromatic-plinth","x":14,"z":5,"v":3,"rot":0,"ox":-0.1,"oz":-0.05},{"t":"bristle-tuft","x":14,"z":6,"v":4,"rot":0,"ox":0.08,"oz":0.06},{"t":"palette-knife-slab","x":8,"z":2,"v":4,"rot":0,"ox":-0.12,"oz":0.03},{"t":"rock-big","x":9,"z":2,"v":1,"rot":0,"ox":-0.06,"oz":-0.11},{"t":"pot","x":3,"z":5,"v":1,"rot":0,"ox":0.07,"oz":0.03},{"t":"palette-knife-slab","x":11,"z":9,"v":2,"rot":0,"ox":0.08,"oz":-0.11},{"t":"rock-big","x":12,"z":9,"v":1,"rot":0,"ox":0.06,"oz":-0.07},{"t":"chromatic-plinth","x":9,"z":4,"v":4,"rot":0,"ox":-0.09,"oz":0.05},{"t":"rock","x":7,"z":7,"v":2,"rot":0,"ox":0.11,"oz":-0.08},{"t":"chromatic-plinth","x":10,"z":5,"v":2,"rot":0,"ox":0.08,"oz":-0.04}],"things":[{"id":"b1","kind":"bonfire","x":8,"z":8,"rot":0},{"id":"c1","kind":"chest","x":6,"z":8,"rot":0,"text":"Impasto scrapings off the studio floor, the paint still wet."},{"id":"w1","kind":"watcher","x":1,"z":2,"size":[2,2],"radius":6.64},{"id":"g1","kind":"gate","x":2,"z":8,"span":"z","blocks":[[2,8]],"open":"watcher:w1","threshold":[[3,8]],"edge":[[3,8],[2,8]]},{"id":"e1","kind":"elevator","role":"exit","x":1,"z":5,"rot":3},{"id":"e0","kind":"elevator","role":"entry","x":10,"z":9,"rot":0}],"back":{"pad":[0,0,0,0],"cells":[[11,1,{"h":1,"s":"grass"}],[11,2,{"h":1,"s":"grass"}],[13,2,{"h":1,"s":"stone"}],[11,3,{"h":1,"s":"grass"}],[13,3,{"h":1,"s":"stone"}],[11,4,{"h":1,"s":"grass"}],[6,5,{"h":2,"s":"grass"}],[5,6,{"h":1,"s":"dirt"}],[5,7,{"h":1,"s":"dirt"}],[11,0,{"h":1,"s":"grass"}],[5,5,{"h":1,"s":"dirt"}],[10,0,{"h":1,"s":"grass"}],[8,1,{"h":1,"s":"grass"}],[8,2,{"h":2,"s":"ramp","d":"w","m":"grass"}],[8,3,{"h":1,"s":"grass"}],[7,2,{"h":1,"s":"grass"}],[7,1,{"h":1,"s":"grass"}],[7,3,{"h":1,"s":"grass"}],[6,4,{"h":1,"s":"grass"}],[7,4,{"h":1,"s":"grass"}],[9,0,{"h":1,"s":"grass"}],[12,1,{"h":2,"s":"stone"}],[13,1,{"h":2,"s":"stone"}],[12,2,{"h":2,"s":"stone"}],[13,2,{"h":2,"s":"stone"}],[12,3,{"h":2,"s":"stone"}],[13,3,{"h":2,"s":"stone"}],[12,4,{"h":2,"s":"ramp","d":"s","m":"stone"}]],"decor":[{"t":"knife-stroke","x":8,"z":1,"v":0,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":8,"z":3,"v":1,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":6,"z":4,"v":0,"rot":0,"ox":0,"oz":0},{"t":"knife-stroke","x":9,"z":0,"v":1,"rot":0,"ox":0,"oz":0},{"t":"bristle-tuft","x":13,"z":1,"v":2,"rot":0,"ox":0,"oz":0}]},"grow":{"pad":[5,7,5,7],"cells":[[11,0,{"h":2,"s":"stone"}],[12,0,{"h":2,"s":"sand"}],[13,0,{"h":2,"s":"sand"}],[14,0,{"h":2,"s":"sand"}],[15,0,{"h":2,"s":"sand"}],[11,1,{"h":2,"s":"stone"}],[12,1,{"h":2,"s":"sand"}],[13,1,{"h":2,"s":"stone"}],[14,1,{"h":2,"s":"stone"}],[15,1,{"h":2,"s":"stone"}],[10,2,{"h":2,"s":"stone"}],[11,2,{"h":2,"s":"stone"}],[12,2,{"h":2,"s":"sand"}],[13,2,{"h":2,"s":"stone"}],[14,2,{"h":2,"s":"stone"}],[15,2,{"h":2,"s":"stone"}],[16,2,{"h":2,"s":"stone"}],[17,2,{"h":2,"s":"stone"}],[11,3,{"h":2,"s":"stone"}],[12,3,{"h":2,"s":"sand"}],[13,3,{"h":2,"s":"sand"}],[14,3,{"h":2,"s":"sand"}],[15,3,{"h":2,"s":"sand"}],[16,3,{"h":2,"s":"stone"}],[17,3,{"h":2,"s":"stone"}],[11,4,{"h":2,"s":"stone"}],[12,4,{"h":2,"s":"stone"}],[13,4,{"h":2,"s":"stone"}],[14,4,{"h":2,"s":"stone"}],[15,4,{"h":2,"s":"sand"}],[16,4,{"h":2,"s":"stone"}],[17,4,{"h":2,"s":"stone"}],[11,5,{"h":2,"s":"stone"}],[12,5,{"h":2,"s":"stone"}],[13,5,{"h":2,"s":"sand"}],[14,5,{"h":2,"s":"sand"}],[15,5,{"h":2,"s":"sand"}],[16,5,{"h":2,"s":"sand"}],[17,5,{"h":2,"s":"sand"}],[8,6,{"h":2,"s":"bridge","m":"planks","post":1}],[9,6,{"h":2,"s":"bridge","m":"planks","post":1}],[10,6,{"h":2,"s":"bridge","m":"planks","post":1}],[11,6,{"h":2,"s":"stone"}],[12,6,{"h":2,"s":"stone"}],[13,6,{"h":2,"s":"sand"}],[14,6,{"h":2,"s":"stone"}],[15,6,{"h":2,"s":"stone"}],[16,6,{"h":2,"s":"stone"}],[17,6,{"h":2,"s":"stone"}],[12,7,{"h":1,"s":"grass"}],[13,7,{"h":2,"s":"ramp","d":"s","m":"grass"}],[13,11,{"h":1,"s":"grass"}],[15,11,{"h":1,"s":"grass"}],[18,11,{"h":1,"s":"dirt"}],[21,12,{"h":2,"s":"stone"}],[22,12,{"h":2,"s":"stone"}],[23,12,{"h":2,"s":"stone"}],[24,12,{"h":2,"s":"stone"}],[25,12,{"h":2,"s":"stone"}],[26,12,{"h":2,"s":"stone"}],[20,13,{"h":2,"s":"ramp","d":"w","m":"sand"}],[21,13,{"h":2,"s":"sand"}],[22,13,{"h":2,"s":"sand"}],[23,13,{"h":2,"s":"sand"}],[24,13,{"h":2,"s":"sand"}],[25,13,{"h":2,"s":"sand"}],[26,13,{"h":2,"s":"sand"}],[21,14,{"h":2,"s":"stone"}],[22,14,{"h":2,"s":"stone"}],[23,14,{"h":2,"s":"stone"}],[24,14,{"h":2,"s":"sand"}],[25,14,{"h":2,"s":"stone"}],[26,14,{"h":2,"s":"sand"}],[21,15,{"h":2,"s":"stone"}],[22,15,{"h":2,"s":"stone"}],[23,15,{"h":2,"s":"stone"}],[24,15,{"h":2,"s":"sand"}],[25,15,{"h":2,"s":"stone"}],[26,15,{"h":2,"s":"sand"}],[21,16,{"h":1,"s":"sand"}],[22,16,{"h":1,"s":"sand"}],[23,16,{"h":2,"s":"stone"}],[24,16,{"h":2,"s":"stone"}],[25,16,{"h":2,"s":"stone"}],[26,16,{"h":2,"s":"sand"}],[21,17,{"h":1,"s":"sand"}],[22,17,{"h":1,"s":"stone"}],[20,18,{"h":1,"s":"sand"}],[21,18,{"h":1,"s":"sand"}],[22,18,{"h":1,"s":"stone"}],[0,19,{"h":1,"s":"dirt"}],[1,19,{"h":1,"s":"dirt"}],[2,19,{"h":1,"s":"dirt"}],[3,19,{"h":1,"s":"dirt"}],[4,19,{"h":1,"s":"sand"}],[5,19,{"h":1,"s":"sand"}],[6,19,{"h":1,"s":"sand"}],[20,19,{"h":1,"s":"sand"}],[21,19,{"h":1,"s":"stone"}],[22,19,{"h":1,"s":"stone"}],[0,20,{"h":1,"s":"dirt"}],[1,20,{"h":1,"s":"dirt"}],[2,20,{"h":1,"s":"sand"}],[3,20,{"h":1,"s":"sand"}],[4,20,{"h":1,"s":"dirt"}],[5,20,{"h":1,"s":"dirt"}],[6,20,{"h":1,"s":"sand"}],[7,20,{"h":1,"s":"sand"}],[19,20,{"h":1,"s":"stone"}],[20,20,{"h":1,"s":"stone"}],[21,20,{"h":1,"s":"stone"}],[22,20,{"h":1,"s":"stone"}],[0,21,{"h":1,"s":"dirt"}],[1,21,{"h":1,"s":"dirt"}],[2,21,{"h":1,"s":"sand"}],[3,21,{"h":1,"s":"dirt"}],[4,21,{"h":1,"s":"dirt"}],[5,21,{"h":1,"s":"dirt"}],[6,21,{"h":1,"s":"dirt"}],[7,21,{"h":1,"s":"sand"}],[8,21,{"h":1,"s":"dirt"}],[9,21,{"h":1,"s":"dirt"}],[10,21,{"h":1,"s":"sand"}],[19,21,{"h":1,"s":"stone"}],[20,21,{"h":1,"s":"stone"}],[21,21,{"h":1,"s":"stone"}],[22,21,{"h":1,"s":"stone"}],[0,22,{"h":1,"s":"sand"}],[1,22,{"h":1,"s":"sand"}],[2,22,{"h":1,"s":"sand"}],[3,22,{"h":1,"s":"dirt"}],[4,22,{"h":1,"s":"dirt"}],[5,22,{"h":1,"s":"dirt"}],[6,22,{"h":1,"s":"dirt"}],[7,22,{"h":1,"s":"sand"}],[8,22,{"h":1,"s":"dirt"}],[9,22,{"h":1,"s":"dirt"}],[10,22,{"h":1,"s":"sand"}],[11,22,{"h":1,"s":"dirt"}],[12,22,{"h":1,"s":"sand"}],[3,23,{"h":1,"s":"dirt"}],[4,23,{"h":1,"s":"dirt"}],[5,23,{"h":1,"s":"dirt"}],[6,23,{"h":1,"s":"dirt"}],[7,23,{"h":1,"s":"sand"}],[8,23,{"h":1,"s":"sand"}],[9,23,{"h":1,"s":"sand"}],[10,23,{"h":1,"s":"sand"}],[11,23,{"h":1,"s":"dirt"}],[12,23,{"h":1,"s":"sand"}],[3,24,{"h":1,"s":"bridge","m":"planks","post":1}],[5,24,{"h":1,"s":"stone"}],[6,24,{"h":1,"s":"sand"}],[7,24,{"h":1,"s":"sand"}],[8,24,{"h":2,"s":"stone"}],[9,24,{"h":2,"s":"stone"}],[10,24,{"h":1,"s":"dirt"}],[11,24,{"h":1,"s":"dirt"}],[12,24,{"h":1,"s":"sand"}],[3,25,{"h":1,"s":"bridge","m":"planks","post":1}],[5,25,{"h":1,"s":"stone"}],[6,25,{"h":1,"s":"stone"}],[7,25,{"h":1,"s":"sand"}],[8,25,{"h":1,"s":"sand"}],[9,25,{"h":2,"s":"stone"}],[10,25,{"h":1,"s":"dirt"}],[11,25,{"h":1,"s":"dirt"}],[12,25,{"h":1,"s":"sand"}],[5,26,{"h":1,"s":"stone"}],[6,26,{"h":1,"s":"stone"}],[7,26,{"h":1,"s":"stone"}],[8,26,{"h":1,"s":"sand"}],[9,26,{"h":2,"s":"stone"}],[10,26,{"h":2,"s":"stone"}],[11,26,{"h":2,"s":"ramp","d":"e","m":"dirt"}],[12,26,{"h":1,"s":"sand"}],[7,27,{"h":1,"s":"stone"}],[8,27,{"h":1,"s":"sand"}],[9,27,{"h":2,"s":"sand"}],[10,27,{"h":2,"s":"sand"}],[11,27,{"h":2,"s":"sand"}],[7,28,{"h":1,"s":"bridge","m":"planks","post":1}],[9,28,{"h":2,"s":"stone"}],[10,28,{"h":2,"s":"stone"}],[11,28,{"h":2,"s":"sand"}],[7,29,{"h":1,"s":"bridge","m":"planks","post":1}],[9,29,{"h":2,"s":"stone"}],[10,29,{"h":2,"s":"stone"}],[11,29,{"h":2,"s":"sand"}]],"decor":[{"t":"bristle-tuft","x":5,"z":25,"v":4,"rot":0,"ox":0.03,"oz":0.08},{"t":"bristle-tuft","x":6,"z":25,"v":0,"rot":0,"ox":0.06,"oz":0.08},{"t":"knife-stroke","x":5,"z":24,"v":3,"rot":0,"ox":0,"oz":0.02},{"t":"rock-big","x":8,"z":21,"v":1,"rot":0,"ox":0.06,"oz":-0.05},{"t":"rock-big","x":9,"z":21,"v":0,"rot":0,"ox":-0.12,"oz":0.01},{"t":"rock","x":8,"z":22,"v":2,"rot":0,"ox":-0.03,"oz":0.08},{"t":"palette-knife-slab","x":9,"z":22,"v":1,"rot":0,"ox":-0.04,"oz":0.08},{"t":"knife-stroke","x":7,"z":21,"v":2,"rot":0,"ox":-0.02,"oz":0.05},{"t":"rock-big","x":6,"z":22,"v":0,"rot":0,"ox":-0.07,"oz":-0.11},{"t":"rock-big","x":6,"z":23,"v":1,"rot":0,"ox":0.06,"oz":0.1},{"t":"rock","x":5,"z":22,"v":0,"rot":0,"ox":0.03,"oz":0.12},{"t":"palette-knife-slab","x":6,"z":21,"v":4,"rot":0,"ox":-0.1,"oz":0.01},{"t":"bristle-tuft","x":11,"z":25,"v":0,"rot":0,"ox":0.04,"oz":-0.08},{"t":"chromatic-plinth","x":10,"z":25,"v":3,"rot":0,"ox":-0.11,"oz":0.02},{"t":"chromatic-plinth","x":11,"z":24,"v":3,"rot":0,"ox":0.05,"oz":0.11},{"t":"knife-stroke","x":12,"z":24,"v":2,"rot":0,"ox":-0.07,"oz":-0.07},{"t":"bristle-tuft","x":22,"z":12,"v":1,"rot":0,"ox":-0.02,"oz":0.1},{"t":"bristle-tuft","x":23,"z":12,"v":0,"rot":0,"ox":-0.03,"oz":-0.05},{"t":"bristle-tuft","x":21,"z":12,"v":3,"rot":0,"ox":-0.11,"oz":-0.02},{"t":"palette-knife-slab","x":8,"z":24,"v":3,"rot":0,"ox":0.06,"oz":0.11},{"t":"bristle-tuft","x":9,"z":24,"v":2,"rot":0,"ox":0.07,"oz":-0.07},{"t":"bristle-tuft","x":9,"z":25,"v":2,"rot":0,"ox":0,"oz":0.08},{"t":"rock-big","x":22,"z":14,"v":1,"rot":0,"ox":0.04,"oz":-0.1},{"t":"palette-knife-slab","x":23,"z":14,"v":1,"rot":0,"ox":-0.08,"oz":-0.03},{"t":"rock-big","x":21,"z":15,"v":1,"rot":0,"ox":0.07,"oz":-0.1},{"t":"rock-big","x":22,"z":15,"v":1,"rot":0,"ox":0.02,"oz":0.11},{"t":"knife-stroke","x":21,"z":14,"v":2,"rot":0,"ox":-0.02,"oz":0.08},{"t":"rock-big","x":19,"z":20,"v":1,"rot":0,"ox":-0.11,"oz":0.08},{"t":"rock-big","x":20,"z":20,"v":1,"rot":0,"ox":0.08,"oz":0.03},{"t":"palette-knife-slab","x":5,"z":26,"v":2,"rot":0,"ox":-0.03,"oz":-0.04},{"t":"bristle-tuft","x":20,"z":19,"v":0,"rot":0,"ox":0.1,"oz":-0.02},{"t":"rock-big","x":24,"z":12,"v":0,"rot":0,"ox":0.08,"oz":-0.06},{"t":"chromatic-plinth","x":0,"z":21,"v":0,"rot":0,"ox":-0.09,"oz":-0.09},{"t":"rock-big","x":1,"z":21,"v":1,"rot":0,"ox":-0.01,"oz":-0.01},{"t":"bristle-tuft","x":1,"z":19,"v":1,"rot":0,"ox":0.04,"oz":-0.03},{"t":"palette-knife-slab","x":2,"z":19,"v":3,"rot":0,"ox":-0.01,"oz":0.08},{"t":"chromatic-plinth","x":12,"z":22,"v":0,"rot":0,"ox":-0.04,"oz":-0.09},{"t":"rock-big","x":11,"z":22,"v":0,"rot":0,"ox":-0.01,"oz":-0.02},{"t":"bristle-tuft","x":11,"z":0,"v":3,"rot":0,"ox":-0.08,"oz":-0.02},{"t":"palette-knife-slab","x":12,"z":0,"v":1,"rot":0,"ox":-0.1,"oz":0.1},{"t":"chromatic-plinth","x":16,"z":6,"v":2,"rot":0,"ox":0.01,"oz":-0.02},{"t":"rock-big","x":17,"z":6,"v":1,"rot":0,"ox":0.08,"oz":-0.12},{"t":"bristle-tuft","x":14,"z":3,"v":5,"rot":0,"ox":0,"oz":0.08},{"t":"palette-knife-slab","x":15,"z":3,"v":5,"rot":0,"ox":0.02,"oz":0.01},{"t":"chromatic-plinth","x":11,"z":3,"v":5,"rot":0,"ox":0.03,"oz":-0.07},{"t":"rock-big","x":12,"z":3,"v":0,"rot":0,"ox":-0.04,"oz":-0.02},{"t":"bristle-tuft","x":17,"z":3,"v":2,"rot":0,"ox":-0.06,"oz":0.06},{"t":"palette-knife-slab","x":16,"z":3,"v":5,"rot":0,"ox":0.01,"oz":-0.11},{"t":"chromatic-plinth","x":12,"z":5,"v":0,"rot":0,"ox":-0.04,"oz":0.04},{"t":"rock-big","x":13,"z":5,"v":0,"rot":0,"ox":0.07,"oz":-0.08},{"t":"palette-knife-slab","x":6,"z":19,"v":1,"rot":0,"ox":0.09,"oz":0},{"t":"chromatic-plinth","x":5,"z":19,"v":4,"rot":0,"ox":0,"oz":-0.02},{"t":"rock-big","x":11,"z":27,"v":0,"rot":0,"ox":0.06,"oz":0.07},{"t":"bristle-tuft","x":10,"z":27,"v":1,"rot":0,"ox":-0.1,"oz":0.11},{"t":"palette-knife-slab","x":11,"z":29,"v":0,"rot":0,"ox":-0.06,"oz":0.01},{"t":"chromatic-plinth","x":10,"z":29,"v":5,"rot":0,"ox":0.11,"oz":0.06},{"t":"rock-big","x":26,"z":14,"v":1,"rot":0,"ox":-0.1,"oz":0.02},{"t":"bristle-tuft","x":25,"z":14,"v":2,"rot":0,"ox":0.06,"oz":-0.09},{"t":"palette-knife-slab","x":25,"z":16,"v":0,"rot":0,"ox":0.11,"oz":-0.01},{"t":"chromatic-plinth","x":26,"z":16,"v":2,"rot":0,"ox":-0.06,"oz":0.09},{"t":"rock-big","x":14,"z":0,"v":1,"rot":0,"ox":0.03,"oz":0.1},{"t":"bristle-tuft","x":15,"z":0,"v":4,"rot":0,"ox":-0.03,"oz":-0.09},{"t":"palette-knife-slab","x":18,"z":11,"v":2,"rot":0,"ox":-0.04,"oz":-0.01},{"t":"palette-knife-slab","x":11,"z":28,"v":5,"rot":0,"ox":0.09,"oz":0.03},{"t":"bristle-tuft","x":11,"z":4,"v":0,"rot":0,"ox":0.06,"oz":-0.11},{"t":"chromatic-plinth","x":11,"z":1,"v":5,"rot":0,"ox":0.11,"oz":0.03},{"t":"palette-knife-slab","x":12,"z":4,"v":0,"rot":0,"ox":-0.1,"oz":-0.09}],"docks":[{"kind":"dock","side":"w","at":[11,6],"cells":[[10,6],[9,6],[8,6]]},{"kind":"dock","side":"s","at":[3,23],"cells":[[3,24],[3,25]]},{"kind":"dock","side":"s","at":[7,27],"cells":[[7,28],[7,29]]}]}} };

export function finish(level, brief, h) {
  if (brief.lens) {
    finishLens(level, brief, h);
    if (level.name === "cat-medium") { h.edgeLifts(); h.pin(PIN[level.name]); }
    return;
  }
  if (level.name === "cat-1") return home(level, brief, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  let r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.55 }) : null;
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  h.repair({ keep: [gateT] });
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const hash = (x, z) => (x * 73856093 ^ z * 19349663) >>> 0;
const voidAt = (h, x, z) => { const q = h.cell(x, z); return !q || q.s === "none"; };
const walled = (h, x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return n && n.h > h.cell(x, z).h; });
const isTree = (t) => /tree|pine/.test(t);

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

function jag(level, h, floor) {
  const sp = level.spawn || [-9, -9];
  let cut = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || Math.abs(x - sp[0]) + Math.abs(z - sp[1]) <= 1) continue;
    const nv = N4.filter(([a, b]) => voidAt(h, x + a, z + b)).length;
    if (!nv || !(nv >= 2 || hash(x, z) % 3 === 0)) continue;
    if (N4.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp")) continue;
    const b0 = h.reach(), saved = { ...c }, dec = level.decor.slice();
    h.clear(x, z);
    h.set(x, z, { h: 0, s: "none" });
    const r = h.reach();
    if (r.missing.length > b0.missing.length || r.reached < floor || r.reached < b0.reached - 1) { h.set(x, z, saved); level.decor.splice(0, level.decor.length, ...dec); } else cut++;
  }
  h.log.push(`jag: -${cut}`);
}

function moveSpawn(level, h, lo, hi) {
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || walled(h, x, z) || [-1, 0].some((b) => voidAt(h, x + 1, z + b))) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo || q.length > hi) continue;
    const sc = q.length + 0.5 * (x + z);
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { level.spawn = [best[1], best[2]]; h.log.push(`spawn moved to ${best[1]},${best[2]}`); } else h.log.push(`spawn kept: no approach of ${lo} to ${hi}`);
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
  if (n) h.log.push(`pruneRamps: ${n}`);
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    const lo = level.cells[z + dz]?.[x + dx], soft = ["sand", "grass", "dirt"];
    if (up && soft.includes(up.s)) c.m = up.s;
    else if (lo && soft.includes(lo.s)) c.m = lo.s;
    else c.m = soft.includes(h.surf.raised) ? h.surf.raised : "sand";
  }));
}

function trees(level, h, route, max) {
  const near = (d, k) => route.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= k);
  const fig = (d) => h.figure.cells.some(([x, z]) => Math.abs(x - d.x) <= 2 && Math.abs(z - d.z) <= 2);
  const front = (d) => { const c = h.cell(d.x, d.z); return [[1, 0], [0, 1], [1, 1]].some(([a, b]) => { const n = h.cell(d.x + a, d.z + b); return !h.land(n) || n.h < c.h - 1 || (n.h > c.h && n.s !== "ramp"); }); };
  const hides = (d) => route.some(([x, z]) => x <= d.x && z <= d.z && d.x - x + d.z - z <= 4);
  h.removeDecor((d) => isTree(d.t) && (near(d, 1) || fig(d) || front(d) || hides(d)));
  const left = level.decor.filter((d) => isTree(d.t)).sort((a, b) => (a.x + a.z) - (b.x + b.z) || hash(a.x, a.z) - hash(b.x, b.z));
  const drop = new Set(left.filter((d, i) => i % 2 === 1 || i >= max * 2).slice(0, Math.max(0, left.length - max)));
  h.removeDecor((d) => drop.has(d));
}

function moreLights(level, h, t, route, want) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  const lit = () => level.decor.filter((d) => d.t === t);
  for (const [x, z] of route) {
    if (lit().length >= want) break;
    for (const [a, b] of N4) {
      const X = x + a, Z = z + b, c = h.cell(X, Z);
      if (!h.land(c) || c.s === "ramp" || on.has(h.key(X, Z)) || h.decorAt(X, Z).length || c.h !== h.cell(x, z).h) continue;
      if (N4.some(([p, q]) => h.cell(X + p, Z + q)?.s === "ramp")) continue;
      if (h.figure.cells.some(([fx, fz]) => Math.abs(fx - X) <= 2 && Math.abs(fz - Z) <= 2)) continue;
      if (lit().some((d) => Math.abs(d.x - X) + Math.abs(d.z - Z) < 3)) continue;
      if (h.put(t, X, Z)) break;
    }
  }
}

function repaint(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || on.has(h.key(x, z)) || h.isFig(x, z) || hash(x, z) % 7 === 0) continue;
    c.s = c.h >= 2 ? "sand" : "grass";
    n++;
  }
  if (n) h.log.push(`repaint: ${n} stone cells off the approach`);
}

function home(level, brief, h) {
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type || m.name).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 84);
  let r = h.approach();
  if (r.length < 12 || walled(h, ...level.spawn)) { moveSpawn(level, h, 12, 22); r = h.approach(); }
  jag(level, h, 84);
  r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  pruneRamps(level, h, r);
  r = h.approach();
  trees(level, h, r, 6);
  h.repair();
  repaint(level, h, h.approach());
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && !posts().some((d) => h.cell(d.x, d.z).s === "ramp") && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.55, 0.45, 0.65, 0.35, 0.75]) if (!g) g = tryGate(frac, strict);
  h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  moreLights(level, h, lightT, h.approach(), 4);
  h.repair({ keep: [gateT] });
  const bad = () => posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length > 0;
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  rampTone(level, h);
  h.log.push(`approach ${h.approach().length} posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}

const LOOKS = {
  medium: {
    grass: { top: "#e0508c", fringe: "#c23a74", fringeDark: "#962a5a", speck: "#f68fb6" },
    sand: { top: "#ffc629", lip: "#ec8a12", edge: "#cf6d0a", dots: "#ffe27a" },
    dirt: { top: "#f06a1c", patch: "#ff8a3a", mottle: "#cf5410", border: "#a8400a", path: "#e05e14" },
  },
  subject: {
    grass: { top: "#c98a4e", fringe: "#a86d38", fringeDark: "#7f5028", speck: "#dca26a" },
    sand: { top: "#f7e3a4", lip: "#e6c46e", edge: "#caa54f", dots: "#fff1c8" },
    dirt: { top: "#d9784a", patch: "#e58c5e", mottle: "#c46638", border: "#9c4c26", path: "#cf6e40" },
  },
  composition: {
    grass: { top: "#1fa37e", fringe: "#178665", fringeDark: "#0f664d", speck: "#5fd3a8" },
    sand: { top: "#ffc629", lip: "#ec8a12", edge: "#cf6d0a", dots: "#ffe27a" },
    dirt: { top: "#e0607f", patch: "#ec7a95", mottle: "#c94c6c", border: "#9c3550", path: "#d4577a" },
  },
};

const lensOf = (level) => String(level.name).split("-").pop();
const landCells = (h) => { const out = []; for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c)) out.push([x, z, c]); } return out; };
const figBox = (h) => { const xs = h.figure.cells.map((c) => c[0]), zs = h.figure.cells.map((c) => c[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
const figDist = (h, x, z) => Math.min(...h.figure.cells.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));

function freeFlat(h, x, z, route, side = false) {
  const c = h.cell(x, z);
  if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length) return false;
  if (route && route.some(([a, b]) => a === x && b === z)) return false;
  if (N4.some(([a, b]) => { const q = h.cell(x + a, z + b); if (q?.s !== "ramp") return false; if (!side) return true; const [dx, dz] = h.DIRS[q.d]; return dx === -a && dz === -b || dx === a && dz === b; })) return false;
  return true;
}

function safePut(h, t, x, z, o = {}) {
  const m0 = h.reach().missing.length;
  if (!h.put(t, x, z, o)) return false;
  if (h.reach().missing.length > m0) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); return false; }
  return true;
}

function scatter(h, t, n, pred, o = {}) {
  const cand = landCells(h).filter(([x, z]) => pred(x, z)).sort((a, b) => hash(a[0], a[1] + (o.salt || 0)) - hash(b[0], b[1] + (o.salt || 0)));
  let k = 0;
  for (const [x, z] of cand) {
    if (k >= n) break;
    if (o.gap && LV.decor.some((d) => d.t === t && Math.abs(d.x - x) + Math.abs(d.z - z) < o.gap)) continue;
    if (safePut(h, t, x, z, { v: (o.v0 || 0) + k })) k++;
  }
  h.log.push(`scatter ${t} ${k}/${n}`);
  return k;
}
let LV = null;

function tryGate(level, h, gateT, route, fracs, o = {}) {
  const posts = () => level.decor.filter((d) => d.t === gateT);
  for (const strict of [true, false]) for (const frac of fracs) {
    const saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice(), miss = h.reach().missing.length;
    const snap = JSON.stringify(level.cells.map((r) => r.map((c) => c.h)));
    const g = h.gate(gateT, { route, frac, ...o });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && !posts().some((d) => h.cell(d.x, d.z).s === "ramp") && h.reach().missing.length <= miss;
    if (ok && (!strict || JSON.stringify(level.cells.map((r) => r.map((c) => c.h))) === snap)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
  }
  return null;
}

function raisePantry(level, h) {
  const [, fz0, , fz1] = figBox(h);
  let gapZ = -1;
  for (let z = fz1 + 1; z < h.D; z++) { const n = landCells(h).filter(([, zz]) => zz === z).length; if (n > 0 && n <= 3) { gapZ = z; break; } }
  if (gapZ < 0) return;
  let n = 0;
  for (const [x, z, c] of landCells(h)) if (z < gapZ && c.s !== "ramp") { level.cells[z][x] = { h: 2, s: "grass" }; n++; }
  for (const [x, z, c] of landCells(h)) if (z < gapZ && c.s === "ramp") level.cells[z][x] = { h: 2, s: "grass" };
  h.removeDecor((d) => h.cell(d.x, d.z)?.s === "none");
  h.log.push(`pantry shelf raised to h2 above row ${gapZ} (${n} cells)`);
}

function southSpawn(level, h) {
  const [fx0, , fx1] = figBox(h);
  const mid = (fx0 + fx1) / 2;
  let best = null;
  for (const [x, z, c] of landCells(h)) {
    if (c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < 6) continue;
    const sc = z * 2 - Math.abs(x - mid) * 1.5;
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { level.spawn = [best[1], best[2]]; h.log.push(`south spawn ${level.spawn}`); }
  return h.approach();
}

function throat(level, h) {
  const [fx0, fz0, fx1, fz1] = figBox(h);
  const fh = h.cell(fx0, fz0).h, cx = fx0, zl = fz1 + 1;
  const keepTop = new Set([[cx - 1, zl], [cx, zl], [cx + 1, zl]].map(([x, z]) => h.key(x, z)));
  let low = 0;
  for (const [x, z, c] of landCells(h)) if (c.h === fh && !h.isFig(x, z) && !keepTop.has(h.key(x, z))) { level.cells[z][x] = { h: fh - 1, s: "dirt" }; low++; }
  for (const [x, z] of [[cx - 1, zl], [cx, zl], [cx + 1, zl]]) level.cells[z][x] = { h: fh, s: "dirt" };
  level.cells[zl + 1][cx] = { h: fh, s: "ramp", d: "s", m: "grass" };
  level.cells[zl + 2][cx] = { h: fh - 1, s: "grass" };
  h.removeDecor((d) => d.x === cx && (d.z === zl + 1 || d.z === zl + 2));
  let foot = [cx, zl + 2];
  for (const dx of [1, -1]) {
    const X = cx + dx, Z = zl + 2, q = h.cell(X + dx, Z);
    if (h.land(q) && q.s !== "ramp" && q.h === fh - 2) { level.cells[Z][X] = { h: fh - 1, s: "ramp", d: dx > 0 ? "e" : "w", m: "grass" }; h.removeDecor((d) => d.x === X && d.z === Z); foot = [X + dx, Z]; break; }
  }
  let best = null;
  for (const [x, zz, c] of landCells(h)) {
    if (c.h !== 1 || c.s === "ramp" || h.decorAt(x, zz).length) continue;
    if (!N4.some(([a, b]) => { const q = h.cell(x + a, zz + b); return !q || q.s === "none"; })) continue;
    const q = h.route([x, zz], [cx, zl]);
    if (!q || q.length < 8) continue;
    const sc = Math.abs(q.length - 11) - zz * 0.4;
    if (!best || sc < best[0]) best = [sc, x, zz, q];
  }
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; }
  const r = best ? best[3] : h.route(foot, [cx, zl]) || [];
  h.log.push(`throat: lowered ${low} top cells, stair from ${cx},${zl} to ${foot}, spawn ${level.spawn}, route ${r.length}`);
  return r;
}

function dropPillars(level, h) {
  let n = 0;
  for (const [x, z, c] of landCells(h)) {
    if (c.h < 2 || c.s === "ramp" || h.isFig(x, z)) continue;
    const nb = N4.map(([a, b]) => [x + a, z + b, h.cell(x + a, z + b)]).filter(([, , q]) => h.land(q));
    const flat = nb.filter(([, , q]) => q.s !== "ramp");
    if (flat.some(([, , q]) => q.h >= c.h)) continue;
    const to = Math.max(1, ...flat.map(([, , q]) => q.h));
    level.cells[z][x] = { h: to, s: c.s };
    for (const [X, Z, q] of nb) if (q.s === "ramp") { const [dx, dz] = h.DIRS[q.d]; if (X - dx === x && Z - dz === z) level.cells[Z][X] = { h: q.h - 1, s: q.m && q.m !== "stone" ? q.m : "sand" }; }
    h.clear(x, z, true);
    n++;
  }
  if (n) h.log.push(`dropPillars ${n}`);
}

function finishLens(level, brief, h) {
  LV = level;
  const L = lensOf(level);
  const look = LOOKS[L] || {};
  for (const k of Object.keys(look)) level.palette[k] = { ...level.palette[k], ...look[k] };
  h.dryRim();
  const gateT = brief.threshold?.prop && level.palette?.props?.[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0];
  const daisT = h.ofRole("dais")[0];
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === daisT || d.t === "lantern" || d.t === "torch" || d.t === "marker" || /^tree/.test(d.t) || (L === "composition" && /auricle|collar/.test(d.t)) || (L === "subject" && /planter|crock|barrel|cupboard/.test(d.t)));
  if (L === "subject") raisePantry(level, h);
  if (L !== "subject") dropPillars(level, h);
  let r = L === "composition" ? throat(level, h) : h.spawnAt({ min: 10, max: 16, force: L === "subject" });
  if (r.length) h.path(r, { s: L === "composition" ? "grass" : "sand" });
  const main = L === "composition" ? r : null;
  h.pruneRamps({ route: main || h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  r = main || h.approach();
  let g = null;
  if (gateT) g = tryGate(level, h, gateT, r, L === "composition" ? [1] : L === "subject" ? [0.55, 0.45, 0.65, 0.35] : [0.6, 0.5, 0.7, 0.4], L === "composition" ? { at: r[r.length - 1] } : {});
  r = main || h.approach();
  const [fx0, fz0, fx1, fz1] = figBox(h);
  const fh = h.cell(h.figure.anchor[0], h.figure.anchor[1]).h;
  const onR = (x, z) => r.some(([a, b]) => a === x && b === z);
  const keep = [gateT, lightT, daisT, "auricle-spire", "pantry-cupboard", "orange-collar-curb", "ceramic-food-crock", "cat-grass-planter", "pot", "palette-knife-slab"].filter(Boolean);
  if (L === "medium") {
    for (const [x, z, c] of landCells(h)) {
      if (c.s === "ramp" || onR(x, z) || h.isFig(x, z)) continue;
      const pz = Math.floor(z / 2), px = Math.floor((x + (pz % 2) * 1) / 2);
      c.s = ["dirt", "grass", "dirt", "sand", "grass", "dirt", "stone", "grass"][(px * 3 + pz * 5 + ((px * pz) % 3)) % 8];
    }
    h.removeDecor((d) => d.t === "pot" && figDist(h, d.x, d.z) > 3);
    const lip = (d) => { const c = h.cell(d.x, d.z); return [[1, 0], [0, 1]].some(([a, b]) => { const q = h.cell(d.x + a, d.z + b); return !h.land(q) || q.h < c.h; }); };
    h.removeDecor((d) => /bristle|knife-slab/.test(d.t) && (lip(d) || hash(d.x, d.z) % 3 === 0));
    const near = [[fx0 - 1, fz1 + 1], [fx1 + 1, fz1 + 1], [fx1 + 1, fz0], [fx0, fz1 + 1], [fx1 + 2, fz1]];
    let pots = level.decor.filter((d) => d.t === "pot").length;
    for (const [x, z] of near) if (pots < 3 && freeFlat(h, x, z, r) && safePut(h, "pot", x, z, { v: pots })) pots++;
    const slabs = level.decor.filter((d) => /knife-slab/.test(d.t)).length;
    scatter(h, "palette-knife-slab", Math.max(0, 3 - slabs), (x, z) => freeFlat(h, x, z, r) && figDist(h, x, z) > 2 && !lip({ x, z }) && !level.decor.some((d) => /knife-slab|bristle/.test(d.t) && Math.abs(d.x - x) + Math.abs(d.z - z) < 3), { v0: 2, salt: 7 });
    scatter(h, "knife-stroke", 12, (x, z) => freeFlat(h, x, z, r) && figDist(h, x, z) > 1, { gap: 2, v0: 1 });
  }
  if (L === "subject") {
    for (const [x, z, c] of landCells(h)) {
      if (c.s === "ramp" || onR(x, z) || h.isFig(x, z)) continue;
      if (c.h === 1) c.s = (x + z) % 2 ? "sand" : "dirt";
      else c.s = "grass";
    }
    for (const [x, z] of [[fx0 - 1, fz1], [fx1 + 1, fz1], [fx0 - 1, fz0], [fx1 + 1, fz0]]) if (level.decor.filter((d) => d.t === daisT).length < 2 && freeFlat(h, x, z, r)) safePut(h, daisT, x, z, { v: x });
    const back = landCells(h).filter(([x, z, c]) => c.h === 2 && freeFlat(h, x, z, r) && !(h.cell(x, z - 1) && h.land(h.cell(x, z - 1))) && figDist(h, x, z) > 1).sort((a, b) => a[0] - b[0]);
    back.forEach(([x, z], i) => { if (i % 2 === 0) safePut(h, i % 4 === 0 ? "pantry-cupboard" : "cat-grass-planter", x, z, { v: i }); });
    const riser = r.findIndex(([x, z]) => h.cell(x, z).h === 2 || h.cell(x, z).s === "ramp");
    const before = r.slice(Math.max(0, riser - 3), Math.max(0, riser - 1));
    let crocks = 0;
    for (const [x, z] of before.reverse()) for (const [a, b] of N4) { if (crocks < 2 && freeFlat(h, x + a, z + b, r) && safePut(h, "ceramic-food-crock", x + a, z + b, { v: crocks })) crocks++; }
    const floor = r.filter(([x, z]) => h.cell(x, z).h === 1);
    let saucers = 0;
    for (const [i, [x, z]] of floor.entries()) if (i % 3 === 1) for (const [a, b] of N4) { if (saucers < 3 && freeFlat(h, x + a, z + b, r) && safePut(h, "milk-saucer", x + a, z + b, { v: saucers })) { saucers++; break; } }
    const sp = level.spawn;
    let bar = 0;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 0], [1, 0], [-2, 0], [2, 0]]) if (bar < 2 && freeFlat(h, sp[0] + a, sp[1] + b, r) && safePut(h, "barrel", sp[0] + a, sp[1] + b)) bar++;
    scatter(h, "sun-patch", 5, (x, z) => h.cell(x, z).h === 1 && freeFlat(h, x, z, r) && (x - z) % 4 === 0, { gap: 2 });
  }
  if (L === "composition") {
    for (const [x, z, c] of landCells(h)) {
      if (c.s === "ramp" || onR(x, z) || h.isFig(x, z)) continue;
      c.s = c.h === 1 ? "sand" : "dirt";
    }
    const earAt = [[[fx0 - 2, fz0 - 1], [fx0 - 1, fz0 - 1], [fx0 - 1, fz0 - 2]], [[fx1 + 2, fz0 - 1], [fx1 + 1, fz0 - 1], [fx1 + 1, fz0 - 2]]];
    earAt.forEach((list, i) => { for (const [x, z] of list) if (freeFlat(h, x, z, r, true) && safePut(h, "auricle-spire", x, z, { v: i })) break; });
    if (lightT) {
      for (const list of [[[fx0 - 1, fz0], [fx0 - 1, fz0 + 1], [fx0 - 2, fz0]], [[fx1 + 1, fz0], [fx1 + 1, fz0 + 1], [fx1 + 2, fz0]]]) for (const [x, z] of list) if (freeFlat(h, x, z, r) && safePut(h, lightT, x, z, { v: 0 })) break;
    }
    const col = landCells(h).filter(([x, z]) => freeFlat(h, x, z, r) && z >= fz1 + 1 && z <= fz1 + 2 && x >= fx0 - 3 && x <= fx1 + 3 && x !== fx0).sort((a, b) => Math.abs(a[0] - (fx0 + fx1) / 2) - Math.abs(b[0] - (fx0 + fx1) / 2));
    let cn = 0;
    for (const [x, z] of col) if (cn < 6 && !level.decor.some((d) => /collar/.test(d.t) && Math.abs(d.x - x) + Math.abs(d.z - z) < 2) && safePut(h, "orange-collar-curb", x, z, { v: cn })) cn++;
  }
  h.ledges({ keep, tall: 2.5 });
  h.repair({ keep });
  if (h.walkN() < 84) h.thin(84, { keep });
  if (h.walkN() < 84) h.grow(84);
  h.rampTone();
  if (L === "composition") for (const [x, z, c] of landCells(h)) if (c.s === "ramp") c.m = "dirt";
  h.log.push(`lens ${L}: approach ${h.approach().length}, walk ${h.walkN()}, gate ${g}, missing ${JSON.stringify(h.reach().missing)}`);
  if (level.name === "cat-medium" && !landmarkNear(level, h, "cat-paint-tube-windmill", 3)) placeLandmark(level, h, "cat-paint-tube-windmill");
  if (level.name === "cat-medium") placeGeneric(level, h, "market-row", { near: 1 });
  if (level.name === "cat-medium") placeThings(level, h, { chestText: "Impasto scrapings off the studio floor, the paint still wet." });
  if (level.name === "cat-medium") dropFront(level, h, [4, 9]);
}

function landmarkNear(level, h, type, max) {
  registerCatalog(registerThemed().catalog);
  const route = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  const fc = h.figure.cells, fd = fc.map(([u, v]) => u - v);
  const lat = [Math.min(...fd), Math.max(...fd)], fMax = Math.max(...fc.map(([u, v]) => u + v));
  const r0 = h.readability(); h.log.pop();
  const m0 = h.reach().missing.length, len0 = h.approach().length;
  const fixed = (d) => d === h.lead || CATALOG[d.t]?.stamp || d.side || d.axis || ["threshold", "light"].includes(h.role(d.t));
  for (const t of [type, type + "-small"]) {
    const [w, d] = CATALOG[t].footprint, out = [];
    for (let z = 0; z + d <= h.D; z++) for (let x = 0; x + w <= h.W; x++) {
      const cs = [];
      for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) cs.push([x + a, z + b]);
      const c0 = h.cell(x, z);
      if (!h.land(c0) || cs.some(([a, b]) => { const q = h.cell(a, b); return !h.land(q) || q.s === "ramp" || q.h !== c0.h || h.isFig(a, b) || route.has(h.key(a, b)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([p, k]) => h.cell(a + p, b + k)?.s === "ramp") || h.decorAt(a, b).some(fixed); })) continue;
      const gap = Math.min(...cs.flatMap(([a, b]) => fc.map(([u, v]) => Math.max(Math.abs(a - u), Math.abs(b - v)))));
      if (gap < 2 || gap > max + 1) continue;
      const side = Math.min(...cs.map(([a, b]) => Math.max(lat[0] - (a - b), (a - b) - lat[1], 0)));
      if (cs.some(([a, b]) => a + b > fMax) && side < 1) continue;
      out.push({ x, z, score: gap * 2 - side + cs.reduce((s, [a, b]) => s + h.decorAt(a, b).length, 0) * 0.3 });
    }
    out.sort((a, b) => a.score - b.score);
    for (const c of out) {
      const S = h.snapshot();
      h.removeDecor((e) => !fixed(e) && h.footprint(e).some(([a, b]) => a >= c.x && a < c.x + w && b >= c.z && b < c.z + d));
      if (!h.put(t, c.x, c.z, { rot: 0, v: 0 })) { h.restore(S); continue; }
      const r1 = h.readability(); h.log.pop();
      if (h.reach().missing.length > m0 || h.approach().length !== len0 || !r1.walks || r1.xrayRun > Math.max(3, r0.xrayRun) || r1.tallerInFront.length > r0.tallerInFront.length) { h.restore(S); continue; }
      level.pieces = [...new Set([...(level.pieces || []), "pieces/multitile-themed-a.js"])];
      h.log.push(`landmark ${t} at ${c.x},${c.z} within ${max} of the figure${t !== type ? " (footprint shrunk one step)" : ""}`);
      return true;
    }
  }
  h.log.push(`landmark ${type}: nothing within ${max} of the figure`);
  return false;
}

export const GROW = { "cat-medium": [{"kind":"plateau","side":"n","at":[8,1],"size":[3,2],"tier":1,"decor":[{"t":"knife-stroke","u":4,"v":1}]},{"kind":"dock","side":"w","at":[1,1],"len":2,"decor":[{"t":"palette-knife-slab","u":2}]},{"kind":"dock","side":"s","at":[8,9],"len":2,"decor":[]},{"kind":"walkway","side":"n","at":[11,1],"len":3,"islet":[2,2],"causeway":true,"decor":[{"t":"palette-knife-slab","u":5,"v":1}]}] };
export const outgrow = (level, o) => [...growOut(level, GROW[level.name], o), ...echo(level, PIN[level.name]?.back), ...widen(level, PIN[level.name]?.grow)];
