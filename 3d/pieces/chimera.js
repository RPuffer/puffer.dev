import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const INK = {
  bone: ["#ebe8dc", "#d6d2c4", "#beb9a8"],
  bone2: ["#d6d2c4", "#beb9a8", "#a8a290"],
  mid: ["#a4a095", "#89847a", "#6c665f"],
  dark: ["#6c665f", "#4d4741", "#3a342e"],
  deep: ["#3a342e", "#2d251f", "#1f1914"],
  gold: ["#ebb834", "#d19a17", "#b07e0b"],
  ember: ["#ffb31d", "#ff831d", "#dc5a10"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const sat = (h) => { const c = rgb(h); return Math.max(...c) - Math.min(...c); };
const lum = (h) => { const c = rgb(h); return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };

function tilt(B, x, y, z, rx, ry, rz, fn) {
  B.pushMatrix(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1)));
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
  B.prism(circle(0, 0, r, r * 0.92, 7, 0.3), 0, h * 0.55, pal(lo));
  B.prism(circle(0.03, -0.02, r * 0.84, r * 0.78, 7, 0.1), h * 0.55, h, pal(hi));
}

function claws(B, x, y, z, c) {
  for (const dx of [-0.11, 0, 0.11]) wedge(B, 0.08, 0.1, 0.16, c, x + dx, y, z);
}

function chimera(B, H, K, v) {
  const s = H / 2.45;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.95, 0.22, K.plinthLo, K.plinthHi);
  const y0 = 0.22;
  B.rbox(0.44, 0.56, 0.58, 0.08, pal(K.dark), -0.44, y0, -0.3);
  B.rbox(0.44, 0.56, 0.58, 0.08, pal(K.dark), 0.44, y0, -0.3);
  B.rbox(0.52, 0.84, 0.82, 0.1, pal(K.bone), -0.23, y0 + 0.06, 0.02);
  B.rbox(0.5, 0.84, 0.82, 0.1, pal(K.bone2), 0.24, y0 + 0.06, 0.02);
  for (const [w, y] of [[0.76, 0.16], [0.7, 0.3], [0.6, 0.44], [0.46, 0.58]]) B.box(w, 0.05, 0.06, pal(K.mid), 0, y0 + y, 0.44);
  B.box(0.05, 0.62, 0.05, pal(K.dark), 0.01, y0 + 0.1, 0.45);
  B.rbox(1.14, 0.16, 0.94, 0.12, pal(K.bone), 0, y0 + 0.88, -0.02);
  for (const [x, z] of [[-0.54, 0.32], [0.54, 0.3], [-0.58, -0.2], [0.58, -0.22]]) B.cone(0.08, 0, 0.24, pal(K.bone2), x, y0 + 0.88, z, 4);
  for (const side of [-1, 1]) {
    const x = side * 0.62;
    B.rbox(0.36, 0.4, 0.36, 0.06, pal(K.dark), x, y0, 0.36);
    B.rbox(0.42, 0.42, 0.4, 0.06, pal(K.mid), x, y0 + 0.38, 0.3);
    for (const [dx, dy] of [[-0.1, 0.14], [0.09, 0.26], [-0.05, 0.5], [0.1, 0.62]]) B.cone(0.05, 0, 0.13, pal(K.bone), x + dx, y0 + dy, 0.52, 4);
    B.box(0.42, 0.1, 0.42, pal(K.dark), x, y0, 0.44);
    claws(B, x, y0, 0.7, K.bone);
  }
  const tail = [[-0.62, 0.34, -0.54, 0.26], [-0.72, 0.58, -0.64, 0.23], [-0.78, 0.84, -0.64, 0.2], [-0.8, 1.08, -0.56, 0.18], [-0.78, 1.3, -0.44, 0.16], [-0.74, 1.48, -0.3, 0.14]];
  tail.forEach(([x, y, z, w], i) => B.box(w, 0.24, w, pal(i % 2 ? K.bone2 : K.dark), x, y0 + y, z));
  tilt(B, -0.74, y0 + 1.7, -0.22, 0.8, 0, 0, () => B.cone(0.08, 0, 0.3, pal(K.bone), 0, 0, 0, 4));
  B.rbox(0.5, 0.36, 0.46, 0.08, pal(K.dark), -0.1, y0 + 0.96, 0.08);
  const turn = 0.38 + (v % 2) * 0.1;
  for (let i = 0; i < 6; i++) {
    const x = -0.46 + i * 0.17, h = [0.5, 0.72, 0.8, 0.7, 0.56, 0.42][i];
    tilt(B, x, y0 + 1.36, -0.22 + Math.abs(i - 2.5) * 0.04, -0.6, 0, (i - 2.5) * 0.14, () => {
      B.box(0.1, h, 0.28, pal(i % 2 ? K.bone2 : K.bone), 0, 0, 0);
      B.box(0.11, h * 0.4, 0.1, pal(K.dark), 0, h * 0.3, -0.1);
    });
  }
  B.at(0.44, y0 + 1.02, -0.04, turn + 0.6, () => {
    B.rbox(0.26, 0.34, 0.26, 0.05, pal(K.dark), 0, 0, 0);
    B.rbox(0.4, 0.32, 0.42, 0.06, pal(K.dark), 0, 0.32, 0.04);
    wedge(B, 0.32, 0.16, 0.2, K.mid, 0, 0.32, 0.34);
    for (const [x, y] of [[-0.12, 0.54], [0.0, 0.58], [0.12, 0.54], [0.06, 0.44]]) B.box(0.08, 0.08, 0.04, pal(K.accent), x, y, 0.26);
    B.cone(0.07, 0, 0.22, pal(K.bone), -0.12, 0.64, 0, 4);
    B.cone(0.07, 0, 0.26, pal(K.bone), 0.12, 0.64, -0.04, 4);
  });
  B.box(0.16, 0.2, 0.05, pal(K.deep), 0.3, y0 + 0.9, 0.45);
  B.box(0.08, 0.12, 0.04, pal(K.accent), 0.3, y0 + 0.94, 0.47);
  B.at(-0.16, y0 + 1.18, 0.28, turn, () => {
    B.rbox(0.72, 0.36, 0.6, 0.08, pal(K.bone), 0, 0.12, 0);
    B.rbox(0.78, 0.12, 0.52, 0.06, pal(K.bone2), 0.02, 0.48, -0.04);
    for (const [x, z, h] of [[-0.28, 0.12, 0.24], [-0.06, 0.04, 0.3], [0.2, 0, 0.24], [-0.18, -0.18, 0.2]]) B.cone(0.07, 0, h, pal(K.bone2), x, 0.6, z, 4);
    B.box(0.58, 0.22, 0.36, pal(K.bone), -0.02, 0.16, 0.44);
    for (const x of [-0.22, -0.09, 0.04, 0.17]) B.box(0.06, 0.09, 0.05, pal(K.bone), x, 0.08, 0.6);
    B.box(0.52, 0.12, 0.32, pal(K.deep), -0.02, 0.02, 0.44);
    B.box(0.54, 0.1, 0.34, pal(K.bone2), -0.02, -0.1 - (v % 2 ? 0.04 : 0), 0.42);
    for (const x of [-0.2, -0.03, 0.14]) B.box(0.06, 0.08, 0.05, pal(K.bone), x, 0.0, 0.56);
    for (const x of [-0.18, 0.16]) {
      B.box(0.22, 0.14, 0.04, pal(K.deep), x, 0.32, 0.3);
      B.box(0.09, 0.09, 0.03, pal(K.accent), x + 0.03, 0.34, 0.32);
    }
  });
  B.pop();
}

function bonePost(B, H, c0, c1, c2, K, v, d = {}) {
  B.rbox(0.48, 0.24, 0.48, 0.06, pal(K.dark), 0, 0, 0);
  const segs = [[0.34, 0.0], [0.3, 0.05], [0.26, 0.1], [0.22, 0.14]];
  const top = d.side ? H * 0.72 : H - 0.26;
  const hh = (top - 0.24) / segs.length;
  segs.forEach(([w, dz], i) => {
    B.box(w, hh, w, pal(i % 2 ? c1 : c0), 0, 0.24 + i * hh, d.side ? 0 : dz);
    B.box(w + 0.04, 0.05, w + 0.04, pal(K.dark), 0, 0.24 + i * hh + hh - 0.05, d.side ? 0 : dz);
  });
  if (!d.side) { tilt(B, 0, top, 0.26, 0.6, 0, v % 2 ? 0.15 : -0.1, () => B.cone(0.12, 0, 0.32, pal(c2), 0, 0, 0, 4)); return; }
  const lean = (a) => d.axis === "x" ? [-d.side * a, 0] : [0, d.side * a];
  const [rx1, rz1] = lean(0.6), [rx2, rz2] = lean(1.15);
  const L1 = 0.5, off = L1 * Math.sin(0.6), up = L1 * Math.cos(0.6);
  const ox = d.axis === "x" ? 0 : -d.side * off, oz = d.axis === "x" ? -d.side * off : 0;
  tilt(B, 0, top - 0.04, 0, rx1, 0, rz1, () => { B.box(0.2, L1, 0.2, pal(c0), 0, 0, 0); B.box(0.22, 0.05, 0.22, pal(K.dark), 0, L1 * 0.5, 0); });
  tilt(B, ox, top - 0.08 + up, oz, rx2, 0, rz2, () => { B.box(0.15, 0.2, 0.15, pal(c1), 0, 0, 0); B.cone(0.1, 0, 0.26, pal(c1), 0, 0.2, 0, 4); });
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang|pillar/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|mound/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn/i], ["mass", /tree|pine|spire|monolith|rock|cliff|totem|bastion/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const leadT = types.find((t) => roleOf(P, t) === "lead");
  const lt = leadT ? tonesOf(P, leadT) : [];
  const accent = lt.filter((c) => sat(c[0]) > 0.35).sort((a, b) => sat(b[0]) - sat(a[0]))[0] || INK.gold;
  const bones = lt.filter((c) => sat(c[0]) < 0.25).sort((a, b) => lum(b[0]) - lum(a[0]));
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const K = {
    bone: bones[0] || INK.bone,
    bone2: bones[1] || INK.bone2,
    mid: INK.mid,
    dark: INK.dark,
    deep: INK.deep,
    accent,
    plinthLo: pick(dt, 1, INK.mid),
    plinthHi: pick(dt, 0, INK.bone2),
  };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" ? false : !!p.passable, variants: 2, height: role === "lead" ? Math.min(3, Math.max(2.4, p.height || 2.5)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, INK.bone), c1 = pick(tn, 1, INK.bone2), c2 = pick(tn, 2, INK.mid);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead" || role === "creature") chimera(B, H, K, v);
      else if (role === "threshold") {
        bonePost(B, H, c0, c1, c2, K, v, d);
      } else if (role === "dais") {
        plinth(B, 0.42, H, c1, c0);
      } else if (role === "light") {
        B.box(0.26, 0.14, 0.26, pal(K.dark));
        B.box(0.12, H - 0.5, 0.12, pal(c0), 0, 0.14, 0);
        B.box(0.28, 0.06, 0.28, pal(K.dark), 0, H - 0.4, 0);
        B.box(0.2, 0.22, 0.2, pal(INK.ember), 0, H - 0.34, 0);
        B.cone(0.2, 0, 0.14, pal(c1), 0, H - 0.12, 0, 4);
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(K.accent), -0.04, H * 0.55, 0.02);
      } else if (role === "mass") {
        B.rbox(0.66, 0.34, 0.66, 0.08, pal(K.dark), 0, 0, 0);
        const segs = v % 2 ? [0.54, 0.4, 0.28] : [0.5, 0.38, 0.26];
        const hh = (H - 0.7) / segs.length;
        segs.forEach((w, i) => wedge(B, w, hh, w, [c0, c1, c0][i], (i % 2 ? 0.04 : -0.03), 0.34 + i * hh, (i % 2 ? -0.03 : 0.03)));
        segs.forEach((w, i) => B.box(w * 0.9, hh * 0.5, w * 0.5, pal(i % 2 ? c0 : c1), (i % 2 ? 0.04 : -0.03), 0.34 + i * hh, -w * 0.2));
        tilt(B, 0, H - 0.4, -0.02, 0.25 * (v % 2 ? 1 : -1), 0, 0.15, () => B.cone(0.13, 0, 0.42, pal(c0), 0, 0, 0, 4));
      } else {
        B.rbox(0.8, 0.14, 0.8, 0.08, pal(K.dark));
        B.rbox(0.62, 0.12, 0.62, 0.06, pal(c0), 0, 0.14, 0);
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + v;
          B.cone(0.06, 0, 0.2, pal(c1), Math.cos(a) * 0.26, 0.26, Math.sin(a) * 0.26, 4);
        }
        B.box(0.16, 0.12, 0.16, pal(INK.ember), 0, 0.26, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const K2 = (x, z) => `${x},${z}`;

function moveSpawn(level, h) {
  const fc = h.figure.cells, cx = fc.reduce((a, c) => a + c[0], 0) / fc.length, cz = fc.reduce((a, c) => a + c[1], 0) / fc.length;
  let best = null, bs = -1;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length) continue;
    if (!h.route(level.spawn, [x, z])) continue;
    const sc = Math.max(Math.abs(x - cx), Math.abs(z - cz)) + 0.6 * (x - cx + z - cz);
    if (sc > bs) { bs = sc; best = [x, z]; }
  }
  if (best) level.spawn = best;
}

function repaint(level, h, route, gate) {
  const keep = new Set();
  for (const [x, z] of route) keep.add(K2(x, z));
  for (const [x, z] of h.figure.cells) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) keep.add(K2(x + dx, z + dz));
  if (gate) for (const g of [].concat(gate)) if (g && g.x !== undefined) keep.add(K2(g.x, g.z));
  const low = h.surf.ground === "stone" ? "grass" : h.surf.ground;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "stone" && !keep.has(K2(x, z))) c.s = c.h >= 2 ? "grass" : low;
  }
}

function placeGate(h, t, r) {
  const want = Math.round((r.length - 1) * 0.55);
  const open = ([x, z], R) => {
    const c = h.cell(x, z);
    if (!c || c.s === "ramp") return false;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const n = h.cell(x + dx, z + dz), near = Math.abs(dx) <= 1 && Math.abs(dz) <= 1;
      if (near && (!n || n.s === "none" || n.s === "ramp" || h.isFig(x + dx, z + dz))) return false;
      if (n && n.h > c.h && dx + dz <= 1) return false;
    }
    return true;
  };
  for (const R of [2, 1]) {
    const order = r.map((c, i) => [c, i]).filter(([c, i]) => i > 1 && i < r.length - 2 && open(c, R)).sort((a, b) => Math.abs(a[1] - want) - Math.abs(b[1] - want));
    for (const [at] of order) { const g = h.gate(t, { route: r, at }); if (g) return g; }
  }
  return h.gate(t, { route: r, frac: 0.55 });
}

function dropRimWater(h) {
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "water" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; })) h.set(x, z, { h: 0, s: "none" });
  }
}

function flattenStubs(h) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || c.h < 2) continue;
    const ns = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) || n?.s === "ramp");
    if (ns.some((n) => n.h >= c.h)) continue;
    const lo = Math.max(1, ...ns.filter((n) => n.s !== "ramp").map((n) => n.h));
    const before = h.reach().missing.length, old = { ...c };
    c.h = lo;
    if (h.reach().missing.length > before) h.set(x, z, old);
  }
}

function widenStairs(h, route, level, gateT) {
  const posts = level.decor.filter((d) => d.t === gateT);
  const nearPost = (x, z) => posts.some((d) => Math.abs(d.x - x) <= 1 && Math.abs(d.z - z) <= 1);
  const onRoute = new Set(route.map(([x, z]) => K2(x, z)));
  const seeds = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (c?.s === "ramp" && onRoute.has(K2(x, z))) seeds.push([x, z, c]); }
  for (const [x, z, c] of seeds) {
    const [dx, dz] = h.DIRS[c.d], px = dz ? 1 : 0, pz = dx ? 1 : 0;
    for (const sgn of [-1, 1]) for (let k = 1; k <= 3; k++) {
      const X = x + sgn * px * k, Z = z + sgn * pz * k, n = h.cell(X, Z), hi = h.cell(X - dx, Z - dz), lo = h.cell(X + dx, Z + dz);
      if (!h.land(n) || n.s === "ramp" || n.h !== c.h - 1 || !h.land(hi) || hi.s === "ramp" || hi.h !== c.h || !h.land(lo) || lo.h !== c.h - 1 || h.isFig(X, Z) || nearPost(X, Z)) break;
      const before = h.reach().missing.length, old = { ...n }, dec = h.decorAt(X, Z).map((d) => ({ ...d }));
      h.stairs(X, Z, c.d, { h: c.h });
      if (h.reach().missing.length > before) { h.set(X, Z, old); for (const d of dec) h.put(d.t, d.x, d.z, d); break; }
    }
  }
}

function pathRamps(h, route, level, gateT) {
  const posts = level.decor.filter((d) => d.t === gateT);
  const m = ["sand", "grass", "dirt"].includes(h.surf.path) ? h.surf.path : null;
  if (!m) return;
  const seen = new Set();
  const grow = (x, z) => {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp" || seen.has(K2(x, z)) || posts.some((d) => Math.abs(d.x - x) <= 2 && Math.abs(d.z - z) <= 2)) return;
    seen.add(K2(x, z));
    c.m = m;
    const [dx, dz] = h.DIRS[c.d];
    grow(x + dz, z + dx); grow(x - dz, z - dx);
  };
  for (const [x, z] of route) grow(x, z);
}

export function finish(level, brief, h) {
  const daisTypes = h.ofRole("dais").filter((t) => !level.palette?.props?.[t]?.passable || (level.palette.props[t].footprint || [1, 1])[0] > 1);
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  let r = h.approach();
  if (r.length < 10) { moveSpawn(level, h); r = h.approach(); }
  if (r.length) h.path(r);
  r = h.approach();
  const g = gateT ? placeGate(h, gateT, r) : null;
  widenStairs(h, r, level, gateT);
  pathRamps(h, r, level, gateT);
  dropRimWater(h);
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  repaint(level, h, r, g);
  flattenStubs(h);
  h.repair({ keep: [gateT] });
}
