import * as THREE from "three";
import { Baker, roundRect, circle, tone, bakedMaterial } from "./baker.js";
import { makeStyle } from "./style.js";
import { cellAt, isWalkable } from "../core/level.js";
import { mulberry32, hashSeed } from "../core/rng.js";
import { applyXray } from "./xray.js";

export const BASE_Y = -0.4;
export const WATER_Y = 0;
export const LIP = 0.15;
export const DEPTH = 1.26;
export const WATER_DROP = 0.1;
const GAP = 0.018, R = 0.11;

const isLand = (c) => c && c.h >= 1 && c.s !== "none" && c.s !== "water" && c.s !== "bridge";

export function liftLevel(L) {
  if (L.lifted) return L;
  const cells = L.cells.map((row) => row.map((c) => (c.lift ? { ...c, h: c.s === "bridge" ? c.h : c.h + c.lift, ...(c.w != null ? { w: c.w + c.lift } : {}) } : c)));
  return { ...L, cells, lifted: true, explicitPatches: cells.some((row) => row.some((c) => c.patch)) };
}

export const liftAt = (L, x, z) => { const c = cellAt(L, Math.floor(x), Math.floor(z)); return c && c.s !== "bridge" ? c.lift || 0 : 0; };

export function floorLevel(L) {
  const n = new Map();
  for (const row of L.cells) for (const c of row) if (isLand(c)) n.set(c.h, (n.get(c.h) || 0) + 1);
  let best = 1, bn = -1;
  for (const [h, k] of n) if (k > bn || (k === bn && h > best)) { best = h; bn = k; }
  return best;
}

export function surfaceY(L, view, x, z) {
  const c = cellAt(L, x, z), T = view.tileH;
  if (!c) return 0;
  if (c.s === "water" || (c.h === 0 && c.s !== "none")) return c.h * T - WATER_DROP;
  if (c.s === "ramp") return (c.h - 0.5) * T;
  if (c.s === "none") return 0;
  return c.h * T;
}

const cliffPal = (P, upper) => upper ? tone(P.cliffUpper.left, P.cliffUpper.left, P.cliffUpper.right, P.cliffUpper.seam) : tone(P.cliffLower.left, P.cliffLower.left, P.cliffLower.right, P.cliffLower.seam);

function contextOf(L, x, z) {
  let grass = 0, other = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const n = cellAt(L, x + dx, z + dz);
    if (!n || !isLand(n)) continue;
    if (n.s === "grass") grass++; else if (n.s === "sand" || n.s === "dirt") other++;
  }
  return grass > other ? "grass" : "sand";
}

function blob(cx, cz, r, rnd, n = 9) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = r * (0.75 + rnd() * 0.4); pts.push([cx + Math.sin(a) * k, cz + Math.cos(a) * k * 0.95]); }
  return pts;
}

function dots(B, x, z, y, hex, rnd, count = 3, r = 0.05) {
  const cx = x + 0.28 + rnd() * 0.08, cz = z + 0.28 + rnd() * 0.08;
  const offs = [[0, 0], [0.14, 0.03], [0.04, 0.14], [0.17, 0.16]];
  for (let i = 0; i < count; i++) B.flat(circle(cx + offs[i][0], cz + offs[i][1], r * (0.8 + rnd() * 0.4), r * (0.8 + rnd() * 0.4), 7), y, hex);
}

function drips(B, x, z, y, face, hex, rnd, count) {
  const n = count || 3 + (rnd() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const c = (i + 0.5) / n + (rnd() - 0.5) * 0.08, w = 0.09 + rnd() * 0.04, d = 0.08 + rnd() * 0.1;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const a = Math.PI * (k / 6), u = c - Math.cos(a) * w, v = y - Math.sin(a) * d;
      pts.push(face === "z" ? [x + u, v, z + 1 - GAP + 0.006] : [x + 1 - GAP + 0.006, v, z + 1 - u]);
    }
    pts.push(face === "z" ? [x + c, y + 0.02, z + 1 - GAP + 0.006] : [x + 1 - GAP + 0.006, y + 0.02, z + 1 - c]);
    const hub = pts[7];
    for (let k = 0; k < 6; k++) B.vpoly([hub, pts[k], pts[k + 1]], hex);
  }
}

function specks(B, x, z, y0, y1, hex, rnd) {
  if (rnd() < 0.6) return;
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const u = 0.2 + rnd() * 0.6, v = y0 + 0.2 + rnd() * Math.max(0.1, y1 - y0 - 0.5), w = 0.035, h = 0.07;
    const zf = z + 1 - GAP + 0.005;
    B.vpoly([[x + u, v, zf], [x + u + w, v, zf], [x + u + w, v + h, zf], [x + u, v + h, zf]], hex);
  }
}

function column(B, x, z, y0, y1, upper) {
  if (y1 - y0 < 0.01) return;
  B.prism(roundRect(x + GAP, z + GAP, x + 1 - GAP, z + 1 - GAP, R), y0, y1, cliffPal(B.pal, upper), { top: false });
}

function slab(B, x, z, y0, y1, pal, inset = GAP, r = R) {
  B.prism(roundRect(x + inset, z + inset, x + 1 - inset, z + 1 - inset, r), y0, y1, pal);
}

function bottomOf(top, h, F, T) {
  return top - DEPTH - Math.max(0, h - F) * T;
}

function landCell(B, L, x, z, c, T, F, rnd) {
  const P = B.pal;
  const top = c.h * T;
  const upper = c.h > F;
  const bot = bottomOf(top, c.h, F, T);
  const kind = c.s === "dirt" ? contextOf(L, x, z) === "grass" ? "patch" : "plaza" : c.s;
  if (kind === "grass" || kind === "patch") {
    const GL = 0.2;
    column(B, x, z, bot, top - GL, upper || kind === "grass");
    slab(B, x, z, top - GL, top, tone(P.grass.top, P.grass.fringe, P.grass.fringeDark));
    const nz = cellAt(L, x, z + 1), nx = cellAt(L, x + 1, z);
    if (!(isLand(nz) && nz.h >= c.h)) drips(B, x, z, top - GL, "z", P.grass.fringe, rnd);
    if (!(isLand(nx) && nx.h >= c.h)) drips(B, x, z, top - GL, "x", P.grass.fringeDark, rnd);
    if (kind === "patch" || c.patch) pathPatch(B, x, z, top, rnd);
    else if (!L.explicitPatches && rnd() < 0.18) B.flat(blob(x + 0.4 + rnd() * 0.2, z + 0.4 + rnd() * 0.2, 0.28, rnd), top + 0.003, P.dirt.patch);
    dots(B, x, z, top + 0.005, P.grass.speck, rnd, 3, 0.045);
    specks(B, x, z, bot, top - LIP, P.cliffUpper.seam, rnd);
    return;
  }
  if (kind === "plaza") {
    column(B, x, z, bot, top - LIP, upper);
    const d = (dx, dz) => cellAt(L, x + dx, z + dz)?.s === "dirt";
    const e = (dx, dz) => (d(dx, dz) ? 0 : GAP);
    B.prism([[x + 1 - e(1, 0), z + 1 - e(0, 1)], [x + 1 - e(1, 0), z + e(0, -1)], [x + e(-1, 0), z + e(0, -1)], [x + e(-1, 0), z + 1 - e(0, 1)]], top - LIP, top, tone(P.sand.top, P.sand.edge, P.sand.lip));
    const b = (dx, dz) => (d(dx, dz) ? 0 : 0.11);
    const x0 = x + b(-1, 0), x1 = x + 1 - b(1, 0), z0 = z + b(0, -1), z1 = z + 1 - b(0, 1);
    B.flat([[x1, z1], [x1, z0], [x0, z0], [x0, z1]], top + 0.003, P.dirt.top);
    const rim = tone(P.sand.top, P.sand.edge, P.sand.lip);
    const rh = 0.07, ex = x + e(-1, 0), ex1 = x + 1 - e(1, 0), ez = z + e(0, -1), ez1 = z + 1 - e(0, 1);
    if (!d(1, 0)) B.prism([[ex1, ez1], [ex1, ez], [x1, ez], [x1, ez1]], top, top + rh, rim);
    if (!d(-1, 0)) B.prism([[x0, ez1], [x0, ez], [ex, ez], [ex, ez1]], top, top + rh, rim);
    if (!d(0, 1)) B.prism([[ex1, ez1], [ex1, z1], [ex, z1], [ex, ez1]], top, top + rh, rim);
    if (!d(0, -1)) B.prism([[ex1, z0], [ex1, ez], [ex, ez], [ex, z0]], top, top + rh, rim);
    for (let i = 0; i < 6; i++) B.flat(circle(x + 0.15 + rnd() * 0.7, z + 0.15 + rnd() * 0.7, 0.09, 0.08, 8), top + 0.005, P.dirt.mottle);
    if (d(1, 0)) B.flat([[x + 1.008, z1], [x + 1.008, z0], [x + 0.992, z0], [x + 0.992, z1]], top + 0.006, P.dirt.mottle);
    if (d(0, 1)) B.flat([[x1, z + 1.008], [x1, z + 0.992], [x0, z + 0.992], [x0, z + 1.008]], top + 0.006, P.dirt.mottle);
    return;
  }
  if (kind === "stone") {
    column(B, x, z, bot, top - 0.12, upper);
    stoneSlab(B, x, z, top - 0.12, top + 0.04, rnd);
    return;
  }
  column(B, x, z, bot, top - LIP, upper);
  slab(B, x, z, top - LIP, top, tone(P.sand.top, P.sand.edge, P.sand.lip));
  dots(B, x, z, top + 0.004, P.sand.dots, rnd, 3, 0.05);
  const nz = cellAt(L, x, z + 1), nx = cellAt(L, x + 1, z);
  if (rnd() < 0.35 && !(isLand(nz) && nz.h >= c.h)) drips(B, x, z, top - LIP, "z", P.sand.edge, rnd, 2);
  if (rnd() < 0.35 && !(isLand(nx) && nx.h >= c.h)) drips(B, x, z, top - LIP, "x", P.sand.lip, rnd, 2);
}

function stoneSlab(B, x, z, y0, y1, rnd) {
  const S = B.pal.stone;
  const PEBBLE = tone(S.pebble, S.pebbleShade, S.pebbleEdge);
  slab(B, x, z, y0, y1, tone(S.top, S.side[0], S.side[1], S.side[2]), 0.04, 0.15);
  const spots = [[0.28, 0.27, 0.17], [0.7, 0.3, 0.16], [0.3, 0.71, 0.16], [0.72, 0.7, 0.17], [0.5, 0.5, 0.12]];
  for (const [u, v, r] of spots) {
    const cx = x + u + (rnd() - 0.5) * 0.05, cz = z + v + (rnd() - 0.5) * 0.05;
    B.prism(circle(cx, cz, r * 1.05, r * 0.85, 10), y1, y1 + 0.035, PEBBLE);
  }
}

function pathPatch(B, x, z, top, rnd) {
  const P = B.pal;
  const n = 12, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 0.4 + rnd() * 0.07;
    pts.push([Math.min(x + 0.96, Math.max(x + 0.04, x + 0.5 + Math.sin(a) * k)), Math.min(z + 0.96, Math.max(z + 0.04, z + 0.5 + Math.cos(a) * k))]);
  }
  B.flat(pts, top + 0.003, P.dirt.path);
  for (let i = 0; i < 4; i++) B.flat(circle(x + 0.25 + rnd() * 0.5, z + 0.25 + rnd() * 0.5, 0.08, 0.065, 8), top + 0.005, P.dirt.patch);
}

function rampTone(P, m) {
  if (m === "grass") return tone(P.grass.top, P.grass.fringe, P.grass.fringeDark);
  if (m === "dirt") return tone(P.dirt.top, P.sand.edge, P.sand.lip);
  const q = P[m];
  if (q && typeof q === "object" && !Array.isArray(q) && q.top) return tone(q.top, q.edge || q.fringe || q.left || q.top, q.lip || q.fringeDark || q.right || q.top);
  return tone(P.sand.top, P.sand.edge, P.sand.lip);
}

function rampCell(B, L, x, z, c, T, F, rnd) {
  const lowY = (c.h - 1) * T, topY = c.h * T;
  const bot = bottomOf(lowY, c.h - 1, F, T);
  const m = c.m || "stone";
  if (m === "stone") {
    const mid = lowY + 0.45;
    column(B, x, z, bot, mid - 0.14, c.h - 1 > F);
    stoneSlab(B, x, z, mid - 0.14, mid, rnd);
    return;
  }
  column(B, x, z, bot, lowY, c.h - 1 > F);
  B.wedgeRamp(x, z, lowY, topY, c.d, rampTone(B.pal, m), cliffPal(B.pal, c.h - 1 > F));
}

Baker.prototype.wedgeRamp = function (x, z, yLow, yHigh, d, topPal, sidePal) {
  const H = (u, v) => {
    const t = { n: 1 - v, s: v, e: u, w: 1 - u }[d];
    return yHigh - (yHigh - yLow) * t;
  };
  const p = (u, v) => [x + u, H(u, v), z + v];
  const b = (u, v) => [x + u, yLow, z + v];
  this.quad(p(1, 1), p(1, 0), p(0, 0), p(0, 1), topPal);
  const edges = [[[0, 1], [1, 1]], [[1, 1], [1, 0]], [[1, 0], [0, 0]], [[0, 0], [0, 1]]];
  for (const [[au, av], [bu, bv]] of edges) {
    const ha = H(au, av) - yLow, hb = H(bu, bv) - yLow;
    if (ha < 1e-6 && hb < 1e-6) continue;
    if (ha < 1e-6) this.tri(b(au, av), b(bu, bv), p(bu, bv), sidePal);
    else if (hb < 1e-6) this.tri(b(au, av), b(bu, bv), p(au, av), sidePal);
    else this.quad(b(au, av), b(bu, bv), p(bu, bv), p(au, av), sidePal);
  }
};

function waterCell(B, L, x, z, h, T, rnd, below) {
  const P = B.pal;
  const top = h * T - WATER_DROP;
  const y0 = below != null ? below : top - 0.3;
  const side = tone(P.water.deep, P.water.deep, P.water.fall[2], P.water.fall[1]);
  B.prism([[x + 1, z + 1], [x + 1, z], [x, z], [x, z + 1]], y0, top - 0.06, side, { top: false });
  B.prism(roundRect(x + 0.012, z + 0.012, x + 0.988, z + 0.988, 0.1), top - 0.06, top, tone(P.water.top, P.water.deep, P.water.fall[2]));
  B.flat(roundRect(x + 0.07, z + 0.07, x + 0.93, z + 0.93, 0.08), top + 0.002, P.water.top);
  const cx = x + 0.28 + rnd() * 0.12, cz = z + 0.26 + rnd() * 0.1;
  B.flat(circle(cx, cz, 0.13, 0.1, 10), top + 0.004, P.water.bubble);
  B.flat(circle(cx + 0.24, cz + 0.03, 0.09, 0.07, 10), top + 0.004, P.water.bubble);
  B.flat(circle(cx + 0.08, cz + 0.22, 0.07, 0.06, 10), top + 0.004, P.water.bubble);
}

function bridgeCell(B, L, x, z, c, T, rnd) {
  const P = B.pal;
  const y = c.h * T;
  const nb = (dx, dz) => { const n = cellAt(L, x + dx, z + dz); return n && (n.s === "bridge" || isWalkable(L, x + dx, z + dz) || isLand(n)); };
  const alongX = nb(-1, 0) || nb(1, 0) ? !(nb(0, -1) && nb(0, 1) && !(nb(-1, 0) && nb(1, 0))) : false;
  const m = c.m || "planks";
  const Bx = (u0, u1, v0, v1, y0, y1, pal) => alongX ? B.prism(roundRect(x + u0, z + v0, x + u1, z + v1, 0.03), y0, y1, pal) : B.prism(roundRect(x + v0, z + u0, x + v1, z + u1, 0.03), y0, y1, pal);
  if (m === "planks") {
    const n = 3, gap = 0.035, pw = (0.94 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const v0 = 0.03 + i * (pw + gap);
      Bx(0.02, 0.98, v0, v0 + pw, y - 0.17, y + 0.01, tone(P.wood.mid, P.wood.dark, P.wood.shadow));
      Bx(0.02, 0.98, v0 + pw * 0.15, v0 + pw * 0.3, y + 0.01, y + 0.012, tone(P.wood.light, P.wood.light, P.wood.light));
    }
    Bx(0.1, 0.22, 0.02, 0.98, y - 0.27, y - 0.17, tone(P.wood.dark, P.wood.shadow, P.wood.shadow));
    Bx(0.78, 0.9, 0.02, 0.98, y - 0.27, y - 0.17, tone(P.wood.dark, P.wood.shadow, P.wood.shadow));
    return;
  }
  const r = 0.16, n = 2;
  const logPal = tone(P.wood.light, P.wood.mid, P.wood.dark);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n + (rnd() - 0.5) * 0.06;
    B.at(alongX ? x + u : x + 0.5, y - 0.02 - r, alongX ? z + 0.5 : z + u, alongX ? 0 : Math.PI / 2, () => {
      B.rot([1, 0, 0], Math.PI / 2);
      B.cyl(r, 0.8, logPal, 0, -0.4, 0, 8, { topPal: P.wood.end });
      B.cyl(r + 0.01, 0.05, tone(P.wood.dark, P.wood.dark, P.wood.shadow), 0, 0.26, 0, 8, { top: false });
      B.cyl(r + 0.01, 0.05, tone(P.wood.dark, P.wood.dark, P.wood.shadow), 0, -0.31, 0, 8, { top: false });
      B.pop();
    });
  }
  const ropeY = y - 0.02 - r;
  const rp = tone(P.rope, P.rope, P.ropeShade);
  for (const v of [0.2, 0.8]) {
    if (alongX) B.box(1, 0.035, 0.035, rp, x + 0.5, ropeY, z + v);
    else B.box(0.035, 0.035, 1, rp, x + v, ropeY, z + 0.5);
  }
  if (c.w != null && c.w > 0 && rnd() < 0.7) {
    const hang = (c.h - c.w) * T - 0.2;
    const u = 0.1 + rnd() * 0.2;
    if (alongX) B.box(0.03, hang, 0.03, rp, x + u, ropeY - hang, z + 0.8);
    else B.box(0.03, hang, 0.03, rp, x + 0.8, ropeY - hang, z + u);
  }
}

export function buildTerrain(L, view, seed, style = makeStyle(L)) {
  L = liftLevel(L);
  const T = view.tileH, F = floorLevel(L);
  const B = new Baker(style.light), Wb = new Baker(style.light);
  B.pal = Wb.pal = style.palette;
  const [W, D] = L.size;
  const lowestWater = (x, z) => {
    let y = null;
    for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const n = cellAt(L, x + dx, z + dz);
      if (n && (n.s === "water" || (n.s === "bridge" && n.w != null)) && (n.s === "water" ? n.h : n.w) < (cellAt(L, x, z).s === "water" ? cellAt(L, x, z).h : cellAt(L, x, z).w)) y = 0 - WATER_DROP;
    }
    return y;
  };
  const overVoid = (x, z) => [[1, 0], [0, 1]].some(([dx, dz]) => { const n = cellAt(L, x + dx, z + dz); return !n || n.s === "none"; });
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = cellAt(L, x, z);
    const rnd = mulberry32(hashSeed(seed) ^ Math.imul(x + 1, 73856093) ^ Math.imul(z + 1, 19349663));
    if (c.s === "none") continue;
    if (c.s === "water" || (c.h === 0 && c.s !== "bridge")) { waterCell(Wb, L, x, z, c.h, T, rnd, c.h > 0 ? (lowestWater(x, z) ?? (overVoid(x, z) ? c.h * T - WATER_DROP - DEPTH : c.h * T - 0.4)) : null); continue; }
    if (c.s === "bridge") {
      if (c.w != null) waterCell(Wb, L, x, z, c.w, T, rnd, c.w > 0 ? (lowestWater(x, z) ?? c.w * T - 0.4) : null);
      bridgeCell(B, L, x, z, c, T, rnd);
      continue;
    }
    if (c.s === "ramp") { rampCell(B, L, x, z, c, T, F, rnd); continue; }
    landCell(B, L, x, z, c, T, F, rnd);
  }
  const group = new THREE.Group();
  const landMesh = new THREE.Mesh(B.geometry(), applyXray(bakedMaterial()));
  const waterMesh = new THREE.Mesh(Wb.geometry(), bakedMaterial());
  landMesh.name = "land"; waterMesh.name = "water";
  group.add(landMesh, waterMesh);
  return { group, pickables: [landMesh, waterMesh] };
}
