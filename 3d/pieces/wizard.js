import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const ART = {
  robe: ["#2a4fb8", "#1f3d96", "#162c70"],
  robeDark: ["#1a2f72", "#142558", "#0e1a40"],
  lining: ["#10183a", "#0c1230", "#080c22"],
  skin: ["#e0765a", "#c8624a", "#a24c39"],
  skinLight: ["#f39a7e", "#dc8166", "#b9644e"],
  collar: ["#fffdf6", "#e9e6de", "#c9c6bf"],
  star: ["#fff08a", "#f2d95e", "#d0b640"],
  flame: ["#6fe3ff", "#3cc4f0", "#1f97c8"],
  flameCore: ["#e8fbff", "#bdf2ff", "#8fdcf2"],
  staff: ["#b8603f", "#9a4c31", "#7a3a25"],
  ink: ["#1b1420", "#150f19", "#0e0a12"],
  gold: ["#ffc94a", "#eaa92a", "#c4861b"],
  stone: ["#d9d4e6", "#b9b3cc", "#958fab"],
  wood: ["#b8703a", "#96562a", "#733f1d"],
  teal: ["#2fae9c", "#23907f", "#186e61"],
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

function plinth(B, r, h, lo, hi, trim) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
  if (trim) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    B.at(Math.sin(a) * r * 0.93, h * 0.12, Math.cos(a) * r * 0.93, a, () => B.box(0.14, 0.14, 0.06, pal(trim)));
  }
}

function flame(B, x, y, z, k = 1) {
  B.cone(0.13 * k, 0, 0.34 * k, pal(ART.flame), x, y, z, 4);
  B.cone(0.07 * k, 0, 0.22 * k, pal(ART.flameCore), x + 0.02 * k, y + 0.02 * k, z + 0.02 * k, 4);
  B.cone(0.05 * k, 0, 0.16 * k, pal(ART.flame), x - 0.08 * k, y + 0.06 * k, z, 4);
}

function wizard(B, H, look, v) {
  const s = H / 2.75;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.92, 0.22, look.plinthLo, look.plinthHi, look.trim);
  const y0 = 0.22;
  B.at(0, 0, 0, -0.12, () => {
    B.box(0.12, 0.34, 0.12, pal(ART.skin), -0.14, y0, 0.06);
    B.box(0.12, 0.34, 0.12, pal(ART.skin), 0.14, y0, 0.02);
    B.box(0.16, 0.08, 0.3, pal(ART.skinLight), -0.16, y0, 0.14);
    B.box(0.16, 0.08, 0.3, pal(ART.skinLight), 0.16, y0, 0.1);
    B.rbox(0.36, 1.72, 0.34, 0.12, pal(ART.skin), 0, y0 + 0.3, 0);
    B.box(0.06, 1.2, 0.04, pal(ART.skinLight), 0.1, y0 + 0.5, 0.17);
    B.box(0.34, 0.5, 0.6, pal(ART.robe), -0.26, y0 + 0.18, -0.04);
    B.box(0.34, 0.5, 0.6, pal(ART.robe), 0.26, y0 + 0.18, -0.04);
    B.box(0.86, 0.5, 0.26, pal(ART.robeDark), 0, y0 + 0.18, -0.24);
    B.box(0.3, 0.48, 0.52, pal(ART.robe), -0.24, y0 + 0.68, -0.02);
    B.box(0.3, 0.48, 0.52, pal(ART.robe), 0.24, y0 + 0.68, -0.02);
    B.box(0.76, 0.48, 0.22, pal(ART.robeDark), 0, y0 + 0.68, -0.2);
    B.box(0.66, 0.24, 0.46, pal(ART.robe), 0, y0 + 1.16, -0.06);
    B.box(0.2, 0.24, 0.12, pal(ART.robe), -0.23, y0 + 1.16, 0.2);
    B.box(0.2, 0.24, 0.12, pal(ART.robe), 0.23, y0 + 1.16, 0.2);
    wedge(B, 0.18, 0.44, 0.14, ART.collar, -0.3, y0 + 1.3, 0.02);
    wedge(B, 0.18, 0.44, 0.14, ART.collar, 0.3, y0 + 1.3, 0.02);
    B.box(0.72, 0.4, 0.1, pal(ART.collar), 0, y0 + 1.36, -0.22);
    B.box(0.14, 0.62, 0.08, pal(ART.collar), -0.2, y0 + 0.62, 0.23);
    B.box(0.14, 0.62, 0.08, pal(ART.collar), 0.2, y0 + 0.62, 0.23);
    const stars = [[-0.3, 0.3, 0.27], [-0.2, 0.52, 0.27], [0.3, 0.42, 0.27], [0.22, 0.2, 0.27], [-0.28, 0.86, 0.25], [0.3, 0.98, 0.25], [0.43, 0.34, 0.1], [0.43, 0.56, -0.18], [0.39, 0.84, 0.04], [0.39, 1.0, -0.2], [0.43, 0.2, -0.3], [-0.12, 1.24, 0.26]];
    for (const [x, y, z] of stars) B.box(0.07, 0.07, 0.07, pal(ART.star), x, y0 + y, z);
    B.at(-0.44, y0 + 1.0, 0.04, 0.5, () => {
      B.box(0.28, 0.2, 0.3, pal(ART.robe), 0, 0.06, 0);
      B.box(0.36, 0.34, 0.36, pal(ART.robe), -0.04, -0.3, 0.04);
      B.box(0.24, 0.1, 0.26, pal(ART.lining), -0.04, -0.3, 0.06);
      B.box(0.1, 0.1, 0.44, pal(ART.skin), -0.02, -0.12, 0.38);
      B.box(0.2, 0.05, 0.16, pal(ART.skinLight), -0.02, -0.07, 0.62);
      flame(B, -0.02, -0.02, 0.62, 1.6);
    });
    B.at(0.46, y0 + 0.98, 0.02, -0.2, () => {
      B.box(0.26, 0.24, 0.3, pal(ART.robe), 0, 0.04, 0);
      B.box(0.34, 0.5, 0.34, pal(ART.robe), 0.04, -0.46, 0.02);
      B.box(0.22, 0.1, 0.24, pal(ART.lining), 0.04, -0.46, 0.04);
      B.box(0.14, 0.16, 0.14, pal(ART.skin), 0.12, -0.28, 0.2);
    });
    const sx = 0.6, sz = 0.26;
    B.box(0.1, 1.5, 0.1, pal(ART.staff), sx, y0 - 0.02, sz);
    B.box(0.1, 0.26, 0.1, pal(ART.staff), sx - 0.06, y0 + 1.46, sz);
    B.box(0.18, 0.1, 0.1, pal(ART.staff), sx - 0.08, y0 + 1.68, sz);
    B.box(0.1, 0.12, 0.1, pal(ART.staff), sx - 0.18, y0 + 1.6, sz);
    B.box(0.08, 0.06, 0.08, pal(ART.skinLight), sx + 0.03, y0 + 1.2, sz + 0.03);
    B.at(0, y0 + 1.82, 0, 0.42 + (v % 2) * 0.08, () => {
      const t = 0.2;
      B.rbox(0.36, 0.3 + t, 0.34, 0.12, pal(ART.skin), 0, 0, 0);
      B.box(0.06, 0.07, 0.03, pal(ART.ink), -0.08, 0.14, 0.17);
      B.box(0.06, 0.07, 0.03, pal(ART.ink), 0.08, 0.14, 0.17);
      B.box(0.08, 0.04, 0.03, pal(ART.ink), 0.01, 0.02, 0.17);
      B.box(0.06, 0.3, 0.03, pal(ART.skinLight), 0.13, 0.0, 0.16);
      B.push(0, t, 0);
      B.prism(circle(0, 0, 0.64, 0.58, 8, Math.PI / 8), 0.26, 0.34, pal(ART.robe));
      B.prism(circle(0, 0, 0.28, 0.28, 8, Math.PI / 8), 0.34, 0.5, pal(ART.robeDark));
      B.cone(0.26, 0.14, 0.34, pal(ART.robe), 0, 0.5, 0, 8);
      B.at(0.04, 0.84, -0.03, 0, () => {
        B.cone(0.14, 0.05, 0.24, pal(ART.robe), 0, 0, 0, 6);
        B.box(0.26, 0.08, 0.08, pal(ART.robe), 0.12, 0.2, 0);
        B.cone(0.05, 0, 0.14, pal(ART.robe), 0.3, 0.2, 0, 4);
      });
      B.box(0.12, 0.12, 0.04, pal(ART.star), 0.02, 0.62, 0.22);
      B.pop();
    });
  });
  B.pop();
}

const byName = [
  ["lead", /glizard|wizard|frankfurter|sorcerer(?!y)|combatant/i],
  ["threshold", /gate|arch|torii|portal|marker/i],
  ["basin", /basin(?!_edge)|font/i],
  ["slab", /edge|kerb|curb/i],
  ["light", /lantern|torch|brazier|lamp|beacon/i],
  ["dais", /dais|altar|plinth|pedestal/i],
  ["crag", /crag|spire|rock|cliff/i],
  ["stele", /tablet|stele|monument|obelisk/i],
  ["slab", /slab|rune|glyph|tile/i],
  ["crystal", /crystal|gem|shard/i],
  ["offering", /pot|urn|cauldron|chest|barrel|cache|bowl/i],
  ["mass", /tree|pine|cypress|bush|pillar|totem/i],
];
export const kindOf = (P, t) => {
  const r = P.props?.[t]?.role;
  if (r === "lead") return "lead";
  if (r === "threshold") return "threshold";
  return (byName.find(([, re]) => re.test(t)) || [r || "detail"])[0];
};

function post(B, H, c0, c1, c2, d, v) {
  B.box(0.46, 0.22, 0.46, pal(c0));
  B.box(0.34, H * 0.36, 0.34, pal(c1), 0, 0.22, 0);
  B.box(0.28, H * 0.3, 0.28, pal(c1), 0, 0.22 + H * 0.36, 0);
  B.box(0.4, 0.12, 0.4, pal(c2), 0, 0.22 + H * 0.66, 0);
  B.box(0.1, 0.1, 0.04, pal(ART.star), 0, 0.22 + H * 0.46, 0.15);
  B.box(0.04, 0.1, 0.1, pal(ART.star), 0.15, 0.22 + H * 0.46, 0);
  const top = 0.34 + H * 0.66;
  B.cone(0.2, 0, 0.34, pal(ART.robe), 0, top, 0, 4);
  B.box(0.1, 0.1, 0.1, pal(ART.star), 0, top + 0.3, 0);
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.24, th, reach + 0.34, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.34, th, 0.24, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.74, 0.16, c2);
    beam(H * 0.74 + 0.22, 0.08, ART.robe);
  }
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => kindOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ART.stone), plinthHi: pick(dt, 1, ART.gold), trim: ART.star };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = kindOf(P, t);
    const h = role === "lead" ? 2.45 : role === "threshold" ? 2.6 : role === "slab" ? 0.25 : Math.min(2.6, Math.max(0.3, p.height || 1));
    catalog[t] = { footprint: role === "lead" ? [2, 2] : role === "threshold" || role === "dais" ? [1, 1] : p.footprint || [1, 1], passable: role === "lead" || role === "threshold" ? false : role === "slab" ? true : !!p.passable, variants: 2, height: h };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, ART.stone), c1 = pick(tn, 1, ART.wood), c2 = pick(tn, 2, ART.gold);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead") wizard(B, H, look, v);
      else if (role === "threshold") post(B, H, c0, c1, c2, d, v);
      else if (role === "dais") plinth(B, 0.42, H, c0, c1, ART.star);
      else if (role === "basin") {
        B.box(0.44, 0.16, 0.44, pal(c0));
        B.box(0.26, H * 0.5, 0.26, pal(c1), 0, 0.16, 0);
        B.box(0.5, 0.18, 0.5, pal(c0), 0, 0.16 + H * 0.5, 0);
        B.box(0.36, 0.04, 0.36, pal(ART.flame), 0, 0.3 + H * 0.5, 0);
        flame(B, 0, 0.36 + H * 0.5, 0, 0.9);
      } else if (role === "light") {
        const brazier = /brazier/i.test(t);
        if (brazier) {
          for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [0, 0.16]]) B.box(0.08, H * 0.55, 0.08, pal(ART.ink), x, 0, z);
          B.cyl(0.3, 0.2, pal(c0), 0, H * 0.55, 0, 8);
          B.cyl(0.24, 0.03, pal(ART.flame), 0, H * 0.55 + 0.2, 0, 8);
          flame(B, 0, H * 0.55 + 0.2, 0, 1.2);
        } else {
          B.box(0.26, 0.14, 0.26, pal(c0));
          B.box(0.14, H - 0.56, 0.14, pal(ART.wood), 0, 0.14, 0);
          B.box(0.3, 0.06, 0.3, pal(ART.robe), 0, H - 0.42, 0);
          B.box(0.22, 0.24, 0.22, pal(ART.flame), 0, H - 0.36, 0);
          B.cone(0.22, 0, 0.16, pal(ART.robe), 0, H - 0.12, 0, 4);
        }
      } else if (role === "crag") {
        const segs = [[0.84, 0.38], [0.64, 0.33], [0.42, 0.29]];
        let y = 0;
        segs.forEach(([w, f], i) => { const hh = H * f; B.box(w, hh, w * (0.9 + 0.1 * i), pal([c0, c1, c2][i]), i % 2 ? 0.06 : -0.05, y, i % 2 ? -0.04 : 0.05); y += hh; });
        B.cone(0.24, 0, 0.3, pal(c2), 0, y - 0.02, 0, 4);
      } else if (role === "stele") {
        B.box(0.56, 0.18, 0.36, pal(c0));
        B.box(0.44, H - 0.36, 0.2, pal(c1), 0, 0.18, 0);
        B.box(0.5, 0.18, 0.26, pal(c0), 0, H - 0.18, 0);
        for (const y of [0.4, 0.62, 0.84]) B.box(0.24, 0.07, 0.04, pal(ART.robe), 0, H * y, 0.11);
      } else if (role === "slab") {
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), 0, 0.14, pal(c0));
        B.box(0.36, 0.03, 0.08, pal(ART.flame), 0, 0.14, 0);
        B.box(0.08, 0.03, 0.36, pal(ART.flame), 0, 0.14, 0);
      } else if (role === "crystal") {
        B.box(0.36, 0.12, 0.36, pal(c0));
        B.cone(0.14, 0, H * 0.8, pal(ART.flame), -0.06, 0.1, 0, 4);
        B.cone(0.1, 0, H * 0.55, pal(ART.flameCore), 0.12, 0.1, 0.06, 4);
        B.cone(0.09, 0, H * 0.45, pal(ART.flame), 0.02, 0.1, -0.12, 4);
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.07, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.16, 0.12, 0.16, pal(v % 2 ? ART.flame : ART.gold), 0, H * 0.55 + 0.06, 0);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.62, 0.48, 0.34] : [0.56, 0.44, 0.3];
        const hh = (H - 0.3) / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c2][i % 3]), i % 2 ? 0.04 : -0.03, i * hh, i % 2 ? -0.03 : 0.03));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, H - 0.3, 0, 4);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const walkable = (c) => c && c.h >= 1 && c.s !== "none" && c.s !== "water" && c.s !== "ramp";

function farSpawn(level, brief, h) {
  const grid = brief.composition?.grid || [];
  const [ax, az] = h.figure.anchor;
  let best = null, bd = -1;
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!walkable(c) || grid[z]?.[x] !== "P") return;
    const d = Math.abs(x - ax) + Math.abs(z - az);
    if (d > bd) { bd = d; best = [x, z]; }
  }));
  if (best) level.spawn = best;
}

function lawns(level, h) {
  const [ax, az] = h.figure.anchor;
  if (h.surf.ground === "grass") level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (walkable(c) && (c.s === "stone" || c.s === "dirt") && Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5)) > 2) c.s = "grass";
  }));
  let land = 0, stone = 0;
  for (const row of level.cells) for (const c of row) if (walkable(c)) { land++; if (c.s === "stone") stone++; }
  if (stone < land * 0.6) return;
  level.cells.forEach((row) => row.forEach((c) => { if (walkable(c) && c.s === "stone" && c.h <= 2) c.s = "grass"; }));
}

function ring(level, h, t, want) {
  const [ax, az] = h.figure.anchor;
  const cx = ax + 0.5, cz = az + 0.5;
  const cand = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!walkable(c) || h.decorAt(x, z).length || c.s === h.surf.path) return;
    const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
    if (d < 2.5 || d > 3.5) return;
    cand.push([x, z, Math.atan2(z - cz, x - cx)]);
  }));
  const placed = [];
  for (const [x, z, a] of cand.sort((p, q) => p[2] - q[2])) {
    if (placed.length >= want) break;
    if (placed.some(([px, pz]) => Math.abs(px - x) + Math.abs(pz - z) < 4)) continue;
    const miss = h.reach().missing.length;
    if (!h.put(t, x, z)) continue;
    if (h.reach().missing.length > miss) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    placed.push([x, z]);
  }
  h.log.push(`ring ${t} x${placed.length}`);
}

function causeway(level, h, r) {
  const ps = h.surf.path;
  const on = new Set(r.map(([x, z]) => x + "," + z));
  const at = (x, z) => level.cells[z]?.[x];
  for (const [x, z] of r) {
    const c = at(x, z);
    if (!c || c.s !== ps) continue;
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const a = at(x + dx, z + dz), b = at(x - dx, z - dz);
      const wa = a?.s === "water", wb = b?.s === "water";
      if (wa === wb) continue;
      const [nx, nz] = wa ? [x - dx, z - dz] : [x + dx, z + dz];
      const n = at(nx, nz);
      if (n && walkable(n) && n.h === c.h && !on.has(nx + "," + nz) && !h.decorAt(nx, nz).length) n.s = ps;
    }
  }
}

function solidCauseway(level) {
  const at = (x, z) => level.cells[z]?.[x];
  const wet = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, z + b)?.s === "water");
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "stone" && c.h === 1 && wet(x, z)) c.s = "sand"; }));
}

function rimRamps(level, h, r) {
  const at = (x, z) => level.cells[z]?.[x];
  const on = new Set(r.map(([x, z]) => x + "," + z));
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (c.s !== "ramp" || on.has(x + "," + z)) return;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = at(x + a, z + b); return !n || n.s === "none"; })) return;
    const snap = { ...c }, miss = h.reach().missing.length;
    level.cells[z][x] = { h: c.h, s: h.surf.ground };
    if (h.reach().missing.length > miss) level.cells[z][x] = snap;
    else h.log.push(`rim ramp ${x},${z} flattened`);
  }));
}

export function finish(level, brief, h) {
  const P = level.palette || {};
  const types = Object.keys(P.props || {});
  const of = (k) => types.filter((t) => kindOf(P, t) === k);
  lawns(level, h);
  h.removeDecor((d) => of("dais").includes(d.t));
  const gateT = of("threshold")[0];
  const lightT = of("basin")[0] || of("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  const lamps = [...of("basin"), ...of("light"), "torch", "lantern"];
  h.removeDecor((d) => d.t === gateT || lamps.includes(d.t));
  let r = h.approach();
  if (r.length < 8) { farSpawn(level, brief, h); r = h.approach(); }
  if (r.length) h.path(r);
  causeway(level, h, r);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.5 }) : null;
  const n = h.lights(lightT, { route: r, every: 2, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  if (n < 2) ring(level, h, lightT, 4 - n);
  h.repair({ keep: [gateT] });
  rimRamps(level, h, h.approach());
  solidCauseway(level);
}
