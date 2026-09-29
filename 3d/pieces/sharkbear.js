import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const HIDE = {
  back: ["#5b7091", "#4a5c79", "#3a4860"],
  side: ["#7890b2", "#627997", "#4d607b"],
  dark: ["#46566f", "#39465b", "#2b3546"],
  belly: ["#e7ebef", "#cdd4dc", "#aab4c0"],
  skull: ["#f5f1e6", "#ddd6c6", "#bab19f"],
  fin: ["#9fb2cc", "#8398b6", "#687c98"],
  accent: ["#ff6a5c", "#e24c3f", "#b8392e"],
};
const INK = ["#1b1f2a", "#141820", "#0d1016"];
const WHITE = ["#ffffff", "#f0ede6", "#d8d2c8"];
const WOOD = ["#b9824e", "#98673a", "#77502c"];
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

function blade(B, pts, t, c, x, y, z) {
  B.rot([0, 0, 1], Math.PI / 2, x, y, z);
  B.prism(pts, -t, t, pal(c), { bottom: true });
  B.pop();
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function paw(B, K, x, y, z, h) {
  B.rbox(0.3, h, 0.3, 0.06, pal(K.side), x, y + 0.1, z);
  B.rbox(0.36, 0.14, 0.38, 0.06, pal(K.dark), x, y, z + 0.03);
  for (const dx of [-0.1, 0, 0.1]) B.box(0.06, 0.06, 0.07, pal(WHITE), x + dx, y, z + 0.24);
}

function snout(B, c, r, len, x, y, z) {
  B.rot([1, 0, 0], Math.PI / 2, x, y, z);
  B.cone(r, 0, len, pal(c), 0, 0, 0, 6);
  B.pop();
}

function head(B, K, open) {
  B.rbox(0.62, 0.46, 0.56, 0.12, pal(K.skull), 0, 0.12, -0.04);
  B.rbox(0.5, 0.2, 0.4, 0.1, pal(K.skull), 0, 0.58, -0.08);
  snout(B, K.skull, 0.3, 0.62, 0, 0.36, 0.22);
  B.box(0.54, 0.08, 0.46, pal(K.accent), 0, 0.08 - open * 0.3, 0.2);
  B.rbox(0.5, 0.12, 0.56, 0.06, pal(K.belly), 0, -open, 0.14);
  for (let i = 0; i < 5; i++) {
    const z = 0.02 + i * 0.1, w = 0.24 - i * 0.03;
    for (const sx of [-1, 1]) {
      B.cone(0.035, 0, 0.1, pal(WHITE), sx * w, 0.08 - open * 0.3, z, 4);
      B.cone(0.03, 0, 0.08, pal(WHITE), sx * (w - 0.03), 0.12 - open, z + 0.05, 4);
    }
  }
  for (const sx of [-1, 1]) {
    B.box(0.05, 0.14, 0.14, pal(INK), sx * 0.29, 0.34, 0.14);
    B.box(0.04, 0.05, 0.05, pal(WHITE), sx * 0.31, 0.4, 0.17);
    for (const gz of [-0.12, -0.2, -0.28]) B.box(0.04, 0.22, 0.035, pal(K.dark), sx * 0.3, 0.16, gz);
  }
  blade(B, [[0, -0.62], [0, 0.22], [0.26, 0.0], [0.5, -0.36], [0.66, -0.78], [0.5, -0.74], [0.24, -0.66]], 0.1, K.fin, 0, 0.66, 0);
}

function tail(B, K, y, z, sweep) {
  B.rbox(0.3, 0.26, 0.34, 0.08, pal(K.side), sweep * 0.08, y, z);
  B.rbox(0.22, 0.2, 0.34, 0.06, pal(K.back), sweep * 0.22, y - 0.06, z - 0.26);
  B.at(sweep * 0.36, y - 0.1, z - 0.5, sweep * 0.9, () => {
    blade(B, [[0, 0.1], [0.72, -0.34], [0.6, -0.1], [0.06, 0.16], [-0.36, -0.12], [-0.26, 0.06]], 0.05, K.fin, 0, 0.1, 0);
  });
}

function body(B, K, pose, v) {
  const y0 = 0.22;
  const low = pose === "bask";
  const crouch = pose === "stalk";
  const legH = low ? 0.1 : crouch ? 0.3 : 0.42;
  const fy = y0 + legH;
  const ry = y0 + (low ? 0.1 : crouch ? 0.52 : 0.42);
  if (low) {
    paw(B, K, -0.3, y0, 0.58, 0.1);
    paw(B, K, 0.32, y0, 0.66, 0.1);
    B.rbox(0.36, 0.26, 0.42, 0.08, pal(K.side), -0.44, y0, -0.38);
    B.rbox(0.36, 0.26, 0.42, 0.08, pal(K.side), 0.44, y0, -0.38);
  } else {
    paw(B, K, -0.3, y0, 0.4, legH);
    paw(B, K, 0.3, y0, crouch ? 0.56 : 0.36, legH);
    paw(B, K, -0.32, y0, -0.48, ry - y0);
    paw(B, K, 0.32, y0, -0.52, ry - y0);
  }
  B.rbox(0.92, 0.58, 0.72, 0.16, pal(K.side), 0, ry, -0.32);
  B.rbox(0.74, 0.3, 0.56, 0.14, pal(K.back), 0, ry + 0.58, -0.3);
  B.rbox(0.98, 0.62, 0.66, 0.16, pal(K.side), 0, fy, 0.22);
  B.rbox(0.8, 0.34, 0.56, 0.14, pal(K.back), 0, fy + 0.62, 0.14);
  B.rbox(0.5, 0.16, 0.4, 0.1, pal(K.dark), 0, fy + 0.96, 0.08);
  B.box(0.6, 0.12, 1.0, pal(K.belly), 0, fy - 0.03, -0.08);
  wedge(B, 0.66, 0.5, 0.2, K.belly, 0, fy + 0.06, 0.6);
  blade(B, [[0, -0.2], [0, 0.14], [0.26, -0.12], [0.3, -0.24]], 0.05, K.fin, 0, ry + 0.86, -0.36);
  tail(B, K, ry + 0.2, -0.68, v % 2 ? 1 : -1);
  const hy = low ? fy + 0.3 : crouch ? fy + 0.24 : fy + 0.5;
  const tilt = low ? 0.08 : crouch ? 0.3 : 0;
  B.at(0.04, hy, 0.62, 0.12 + (v % 2) * 0.08, () => {
    B.push(0, 0, 0, 0, 1.18);
    B.rot([1, 0, 0], tilt, 0, 0, 0);
    head(B, K, crouch ? 0.16 : low ? 0.03 : 0.06);
    B.pop();
    B.pop();
  });
}

const poseOf = (t) => (/bask|sun|lounge|rest|roost/i.test(t) ? "bask" : /stalk|hunt|chimera|crouch|predator/i.test(t) && !/guardian|abyssal|vigil/i.test(t) ? "stalk" : "stand");
const DESIGN_H = { bask: 2.0, stand: 2.5, stalk: 2.3 };
const LEAD_H = { bask: 2.6, stand: 2.9, stalk: 2.8 };

function beast(B, t, H, look, v) {
  const p = poseOf(t);
  B.push(0, 0, 0, 0, H / DESIGN_H[p]);
  plinth(B, 1.0, 0.22, look.plinthLo, look.plinthHi);
  body(B, HIDE, p, v);
  B.pop();
}

function threshold(B, t, H, c0, c1, c2, d) {
  const tall = H * 0.62;
  B.box(0.48, 0.22, 0.48, pal(c2));
  if (/pylon/i.test(t)) {
    B.box(0.38, tall * 0.6, 0.38, pal(c0), 0, 0.22, 0);
    B.box(0.32, tall * 0.4, 0.32, pal(c1), 0, 0.22 + tall * 0.6, 0);
    B.box(0.42, 0.1, 0.42, pal(c2), 0, 0.22 + tall, 0);
    blade(B, [[0, -0.14], [0, 0.14], [0.34, -0.02], [0.44, -0.2], [0.26, -0.18]], 0.06, HIDE.skull, 0, 0.32 + tall, 0);
  } else if (/basalt|jagged|monolith/i.test(t)) {
    B.box(0.4, tall * 0.5, 0.38, pal(c0), 0, 0.22, 0);
    B.box(0.3, tall * 0.35, 0.3, pal(c1), 0.03, 0.22 + tall * 0.5, -0.02);
    B.cone(0.2, 0, tall * 0.4, pal(c0), 0.03, 0.22 + tall * 0.85, -0.02, 4);
    B.cone(0.1, 0, 0.3, pal(HIDE.skull), -0.16, 0.22, 0.14, 4);
  } else {
    B.box(0.36, tall * 0.45, 0.36, pal(c0), 0, 0.22, 0);
    B.box(0.4, 0.1, 0.4, pal(WOOD), 0, 0.22 + tall * 0.45, 0);
    B.box(0.3, tall * 0.35, 0.3, pal(HIDE.skull), 0, 0.32 + tall * 0.45, 0);
    B.cone(0.18, 0, tall * 0.35, pal(HIDE.skull), 0, 0.32 + tall * 0.8, 0, 4);
  }
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.7, 0.14, /pylon|basalt|jagged/i.test(t) ? c2 : WOOD);
    beam(H * 0.7 + 0.14, 0.1, HIDE.accent);
  }
}

function detail(B, t, H, v, c0, c1, c2) {
  if (/drift|log|timber/i.test(t)) {
    B.at(0, 0, 0, v % 2 ? 0.5 : -0.3, () => {
      B.rbox(0.3, 0.26, 0.8, 0.1, pal(WOOD), 0, 0, 0);
      B.box(0.32, 0.08, 0.1, pal(HIDE.skull), 0, 0.2, 0.12);
      B.box(0.32, 0.08, 0.1, pal(HIDE.skull), 0, 0.2, -0.14);
      B.box(0.12, 0.1, 0.16, pal(c1), 0.08, 0.26, 0.3);
    });
  } else if (/stump|trophy/i.test(t)) {
    B.cyl(0.26, H * 0.6, pal(c0), 0, 0, 0, 7);
    B.cyl(0.22, 0.06, pal(c1), 0, H * 0.6, 0, 7);
    B.rot([0, 0, 1], v % 2 ? 0.35 : -0.35, 0, H * 0.6, 0);
    B.cone(0.1, 0, 0.42, pal(HIDE.skull), 0, 0, 0, 4);
    B.pop();
  } else {
    B.box(0.42, H * 0.5, 0.42, pal(c0));
    wedge(B, 0.42, H * 0.5, 0.42, c1, 0, H * 0.5, 0);
  }
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang|pylon/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|hoard/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem|shard/i]];
const guess = (t) => (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
const roleOf = (P, t) => {
  const r = P.props?.[t]?.role;
  if (r === "creature") return "lead";
  if ((!r || r === "detail") && guess(t) === "threshold") return "threshold";
  return r || guess(t);
};

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ["#9aa5b4", "#808b9b", "#657080"]), plinthHi: pick(dt, 1, ["#d4d8dc", "#b8bec6", "#98a0aa"]) };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const lead = role === "lead";
    catalog[t] = { footprint: lead ? [2, 2] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? LEAD_H[poseOf(t)] : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, HIDE.dark), c1 = pick(tn, 1, HIDE.belly), c2 = pick(tn, 2, HIDE.back);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) beast(B, t, H, look, v);
      else if (role === "threshold") threshold(B, t, H, c0, c1, c2, d);
      else if (role === "dais") plinth(B, 0.42, H, c0, c1);
      else if (role === "light") {
        if (/brazier/i.test(t)) {
          B.prism(circle(0, 0, 0.24, 0.24, 8, Math.PI / 8), 0, 0.16, pal(c2));
          B.prism(circle(0, 0, 0.14, 0.14, 8, Math.PI / 8), 0.16, H - 0.4, pal(c0));
          B.cone(0.18, 0.3, 0.2, pal(c1), 0, H - 0.4, 0, 8);
          B.box(0.26, 0.2, 0.26, pal(P.flame || ["#ffd23a", "#f0a020", "#d07a10"]), 0, H - 0.2, 0);
          B.cone(0.12, 0, 0.18, pal(HIDE.accent), 0, H - 0.02, 0, 4);
        } else {
          B.box(0.3, 0.14, 0.3, pal(c0));
          B.box(0.16, H - 0.62, 0.16, pal(c0), 0, 0.14, 0);
          B.box(0.34, 0.08, 0.34, pal(c1), 0, H - 0.48, 0);
          B.box(0.22, 0.24, 0.22, pal(P.flame || ["#ffd23a", "#f0a020", "#d07a10"]), 0, H - 0.4, 0);
          B.cone(0.24, 0, 0.18, pal(c2), 0, H - 0.16, 0, 4);
        }
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(v % 2 ? HIDE.accent : c1), -0.05, H * 0.55, 0.02);
      } else if (role === "mass") {
        B.box(0.34, H * 0.3, 0.34, pal(c0), 0, 0, 0);
        const segs = v % 2 ? [0.8, 0.62, 0.42] : [0.74, 0.56, 0.36];
        const hh = (H * 0.7) / segs.length;
        segs.forEach((w, i) => B.rbox(w, hh, w, 0.1, pal(i % 2 ? c2 : c1), i % 2 ? 0.03 : -0.02, H * 0.3 + i * hh, i % 2 ? -0.02 : 0.02));
      } else detail(B, t, H, v, c0, c1, c2);
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
  if (stone / Math.max(1, land) < 0.3) return;
  const base = (c) => (c.h >= 2 && h.surf.raised !== "stone" ? h.surf.raised : h.surf.ground !== "stone" ? h.surf.ground : "grass");
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || keep.has(h.key(x, z)) || (x * 3 + z * 5) % 9 === 0) continue;
    h.set(x, z, { h: c.h, s: base(c) });
  }
  h.log.push(`unstone: ${stone}/${land} stone cells repainted`);
}

function farSpawn(h, level) {
  if (h.approach().length >= 7) return;
  const [cx, cz] = h.figure.anchor;
  let best = null, bs = -1;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || c.h > 1 || h.isFig(x, z) || h.decorAt(x, z).length) continue;
    if (!h.route(level.spawn, [x, z])) continue;
    const sc = Math.max(Math.abs(x - cx), Math.abs(z - cz)) + 0.6 * (x - cx + z - cz);
    if (sc > bs) { bs = sc; best = [x, z]; }
  }
  if (best) { h.log.push(`spawn ${level.spawn} -> ${best}`); level.spawn = best; }
}

function lamps(h, t, route, want, avoid) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0, last = -3;
  for (let i = 1; i < route.length - 1 && n < want; i++) {
    const [x, z] = route[i];
    if (i - last < 3 || h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 2) || avoid.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) <= 1)) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + a, Z = z + b, c = h.cell(X, Z);
      if (!h.land(c) || c.s === "ramp" || on.has(h.key(X, Z)) || h.cell(x, z).h !== c.h) continue;
      if (h.decorAt(X, Z).some((d) => !/flower|grass|tuft/i.test(d.t))) continue;
      const before = h.reach().reached;
      if (h.put(t, X, Z) && h.reach().reached >= before - 1) { n++; last = i; break; }
      h.removeDecor((d) => d.t === t && d.x === X && d.z === Z);
    }
  }
  h.log.push(`lamps ${t} x${n}`);
  return n;
}

const CATALOG_HAS = (level, t) => t === "lantern" || t === "torch" || !!level.palette?.props?.[t];

function thin(h, level, max) {
  const trees = level.decor.filter((d) => /tree|pine|cypress/i.test(d.t));
  if (trees.length <= max) return;
  const drop = new Set(trees.filter((d, i) => i % Math.ceil(trees.length / (trees.length - max)) === 0).slice(0, trees.length - max));
  const n = h.removeDecor((d) => drop.has(d));
  h.log.push(`thin: ${n} of ${trees.length} trees removed`);
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
  const types = Object.keys(level.palette?.props || {});
  const daisTypes = types.filter((t) => roleOf(level.palette, t) === "dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = types.find((t) => roleOf(level.palette, t) === "threshold");
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 90);
  let raised = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.h >= 2 && !h.isFig(x, z)) raised++; }
  if (raised < 6) h.dais({ ring: 1, h: 2, s: "stone" });
  farSpawn(h, level);
  let r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  const cut = h.removeDecor((d) => /tree|pine|cypress/i.test(d.t) && near(d));
  if (cut) h.log.push(`clearing: ${cut} trees off the approach`);
  thin(h, level, 9);
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
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
  const lit = h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  if (lit < 2 && CATALOG_HAS(level, lightT)) lamps(h, lightT, h.approach(), 3 - lit, g ? [g] : []);
  ledges(h, [...h.ofRole("mass"), "rock-big"], level);
  h.repair({ keep: [gateT] });
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  h.log.push(`posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}
