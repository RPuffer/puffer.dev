import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const BLOOM = {
  skin: ["#d6cfff", "#bdb4f0", "#9d93d6"],
  skinLo: ["#b9b0ee", "#a097da", "#8279bd"],
  ink: ["#2e2a44", "#252138", "#1b182a"],
  line: ["#4a4468", "#3d3858", "#2f2b45"],
  mint: ["#7cf0a2", "#5ad483", "#3fb068"],
  teal: ["#4fe0ee", "#2fc2d4", "#1f9fb0"],
  yellow: ["#fff07a", "#f0d44e", "#d4b534"],
  pink: ["#f06ac8", "#d64fae", "#b0398e"],
  lilac: ["#c9a8ff", "#ad8cea", "#8f6fcc"],
  lips: ["#c792d8", "#ad78c0", "#8e5fa2"],
  wax: ["#f4efff", "#ddd5f5", "#bfb5e0"],
  glass: ["#e2dcff", "#c8c0f0", "#a79dd6"],
  flame: ["#ffd54a", "#ffb02e", "#f08a1a"],
  smoke: ["#e6e0ff", "#d2caf6", "#b8aee6"],
};
const DOODLE = [BLOOM.mint, BLOOM.teal, BLOOM.yellow, BLOOM.pink, BLOOM.lilac];
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;

const CANDLE_RE = /candle|tumbler|wax|vigil|brazier|pylon/i;
const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|stele|obelisk/i], ["light", /candle|tumbler|lantern|torch|brazier|lamp/i], ["dais", /dais|altar|plinth|pedestal|hearth|throne/i], ["offering", /pot|basket|bowl|offering|urn|censer|chest/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|horn|totem/i]];
const roleOf = (P, t) => {
  const r = P.props?.[t]?.role;
  if (r === "lead") return r;
  if (r === "threshold") return r;
  if (CANDLE_RE.test(t)) return "light";
  return r || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
};

function flame(B, x, y, z, s = 1) {
  B.box(0.03 * s, 0.05 * s, 0.03 * s, pal(BLOOM.ink), x, y, z);
  B.cone(0.08 * s, 0, 0.2 * s, pal(BLOOM.flame), x, y + 0.04 * s, z, 4);
  B.cone(0.04 * s, 0, 0.1 * s, pal(BLOOM.yellow), x, y + 0.04 * s, z, 4);
}

function candle(B, x, y, z, s, glassC = BLOOM.glass) {
  B.cyl(0.2 * s, 0.34 * s, pal(glassC), x, y, z, 8);
  B.cyl(0.17 * s, 0.03 * s, pal(BLOOM.wax), x, y + 0.34 * s, z, 8);
  B.box(0.26 * s, 0.14 * s, 0.03, pal(BLOOM.wax), x, y + 0.1 * s, z + 0.19 * s);
  flame(B, x, y + 0.37 * s, z, s);
}

function smoke(B, x, y, z, n = 3) {
  const offs = [[0.05, 0.02], [-0.06, 0.05], [0.04, -0.03], [-0.03, 0.02]];
  for (let i = 0; i < n; i++) {
    const [dx, dz] = offs[i % offs.length];
    const w = 0.14 - i * 0.02;
    B.rbox(w, 0.06, w * 0.8, 0.03, pal(BLOOM.smoke), x + dx, y + i * 0.16, z + dz);
  }
}

function bust(B, H, look, v) {
  const s = H / 2.7;
  B.push(0, 0, 0, 0, s);
  B.prism(circle(0, 0, 0.96, 0.96, 8, Math.PI / 8), 0, 0.18, pal(look.lo));
  B.prism(circle(0, -0.06, 0.78, 0.74, 8, Math.PI / 8), 0.18, 0.3, pal(look.hi));
  candle(B, 0.52, 0.3, 0.52, 0.85);
  smoke(B, 0.46, 0.74, 0.44, 3);
  B.at(0, 0.3, -0.12, 0.4, () => {
    B.rbox(1.0, 0.24, 0.56, 0.1, pal(BLOOM.skinLo), 0, 0, 0);
    B.rbox(0.8, 0.2, 0.46, 0.1, pal(BLOOM.skin), 0, 0.24, 0);
    B.box(0.3, 0.22, 0.28, pal(BLOOM.skinLo), 0, 0.42, 0.02);
    const fy = 0.6;
    B.rbox(0.44, 0.16, 0.42, 0.1, pal(BLOOM.skin), 0, fy, 0.08);
    B.rbox(0.64, 0.22, 0.56, 0.12, pal(BLOOM.skin), 0, fy + 0.14, 0.04);
    B.rbox(0.9, 0.42, 0.7, 0.16, pal(BLOOM.skin), 0, fy + 0.34, 0);
    B.box(0.18, 0.05, 0.04, pal(BLOOM.lips), 0, fy + 0.22, 0.35);
    for (const x of [-0.19, 0.19]) {
      B.box(0.16, 0.05, 0.04, pal(BLOOM.ink), x, fy + 0.44, 0.35);
      B.box(0.05, 0.04, 0.04, pal(BLOOM.ink), x - 0.1, fy + 0.47, 0.35);
      B.box(0.05, 0.04, 0.04, pal(BLOOM.ink), x + 0.1, fy + 0.47, 0.35);
      B.rbox(0.08, 0.2, 0.16, 0.04, pal(BLOOM.skinLo), x * 2.4, fy + 0.4, 0.02);
    }
    const y0 = fy + 0.6;
    B.rbox(0.96, 0.2, 0.7, 0.14, pal(BLOOM.ink), 0, y0, -0.06);
    B.cone(0.2, 0, 0.36, pal(BLOOM.ink), 0, y0 - 0.2, 0.26, 4);
    B.box(0.1, 0.14, 0.05, pal(BLOOM.wax), 0, y0 - 0.02, 0.36);
    B.box(0.05, 0.05, 0.06, pal(BLOOM.ink), 0, y0 + 0.02, 0.37);
    const tiers = [[1.3, 0.28, 0.2], [1.56, 0.3, 0.46], [1.5, 0.28, 0.74], [1.2, 0.26, 1.0], [0.76, 0.22, 1.24]];
    for (const [w, h, y] of tiers) B.rbox(w, h, 0.8, 0.2, pal(BLOOM.ink), 0, y0 + y - 0.2, -0.14);
    const lobes = [[-0.74, 0.3, 0], [0.74, 0.34, 3], [-0.86, 0.62, 1], [0.86, 0.6, 4], [-0.66, 0.92, 2], [0.68, 0.96, 0], [-0.36, 1.22, 3], [0.38, 1.24, 1], [0, 1.42, 4]];
    lobes.forEach(([x, y, c], i) => {
      const col = DOODLE[(c + v) % DOODLE.length];
      B.cyl(0.2, 0.26, pal(BLOOM.ink), x, y0 + y - 0.2, -0.14, 8);
      B.cyl(0.13, 0.08, pal(col), x, y0 + y + 0.06, -0.14, 8);
      B.cone(0.12, 0, 0.2, pal(BLOOM.ink), x * 1.18, y0 + y - 0.02, -0.14, 4);
    });
    const blobs = [
      [-0.4, 0.3, 0.24, 0.22, 0], [0.4, 0.34, 0.24, 0.2, 1], [0, 0.58, 0.28, 0.22, 2],
      [-0.5, 0.74, 0.24, 0.18, 3], [0.52, 0.78, 0.24, 0.18, 4], [-0.2, 1.02, 0.24, 0.18, 1], [0.24, 1.06, 0.24, 0.16, 3],
    ];
    blobs.forEach(([x, y, z, r, c], i) => {
      const col = DOODLE[(c + v) % DOODLE.length];
      B.at(x, y0 + y, 0.27 + (z - 0.24), 0, () => {
        B.pushMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        B.cyl(r, 0.1, pal(col), 0, -0.05, 0, 8);
        if (i % 3 === 0) B.cyl(r * 0.4, 0.12, pal(BLOOM.ink), 0, -0.06, 0, 8);
        B.pop();
      });
    });
    B.box(0.06, 0.4, 0.06, pal(BLOOM.yellow), 0.14, y0 + 0.2, 0.28);
    B.box(0.06, 0.3, 0.06, pal(BLOOM.mint), -0.2, y0 + 0.1, 0.28);
  });
  B.pop();
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { lo: pick(dt, 0, ["#9d97c8", "#857fb2", "#6c6697"]), hi: pick(dt, 1, ["#c8c2ec", "#aea8d8", "#908ac0"]) };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" ? false : !!p.passable, variants: 2, height: role === "lead" ? Math.min(2.9, Math.max(2.5, p.height || 2.6)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, BLOOM.lilac), c1 = pick(tn, 1, BLOOM.skin), c2 = pick(tn, 2, BLOOM.teal);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead") bust(B, H, look, v);
      else if (role === "threshold") {
        const wax = CANDLE_RE.test(t);
        B.prism(circle(0, 0, 0.3, 0.3, 8, Math.PI / 8), 0, 0.2, pal(look.lo));
        if (wax) {
          B.cyl(0.2, H * 0.62, pal(BLOOM.wax), 0, 0.2, 0, 8);
          B.cyl(0.23, 0.08, pal(BLOOM.lilac), 0, 0.2 + H * 0.3, 0, 8);
          B.cyl(0.14, 0.04, pal(BLOOM.wax), 0, 0.2 + H * 0.62, 0, 8);
          flame(B, 0, 0.2 + H * 0.62, 0, 2.2);
        } else {
          B.box(0.36, H * 0.4, 0.36, pal(c0), 0, 0.2, 0);
          B.box(0.3, H * 0.24, 0.3, pal(c1), 0, 0.2 + H * 0.4, 0);
          B.cyl(0.2, 0.1, pal(BLOOM.yellow), 0, 0.2 + H * 0.64, 0, 8);
          B.rbox(0.3, 0.26, 0.14, 0.06, pal(BLOOM.wax), 0, 0.2 + H * 0.64 + 0.1, 0);
          B.box(0.12, 0.12, 0.16, pal(BLOOM.teal), 0, 0.2 + H * 0.64 + 0.17, 0);
          B.box(0.06, 0.06, 0.18, pal(BLOOM.ink), 0, 0.2 + H * 0.64 + 0.2, 0);
          B.cone(0.14, 0, 0.2, pal(c2), 0, 0.2 + H * 0.64 + 0.36, 0, 4);
        }
        if (d.side) {
          const reach = 1.0, yb = Math.min(H * 0.7, 1.3);
          const beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(yb, 0.16, BLOOM.lilac);
          beam(yb + 0.16, 0.08, BLOOM.pink);
        }
      } else if (role === "light") {
        if (/brazier|pedestal/i.test(t)) {
          B.box(0.44, 0.16, 0.44, pal(look.lo));
          B.box(0.3, H * 0.4, 0.3, pal(look.hi), 0, 0.16, 0);
          candle(B, 0, 0.16 + H * 0.4, 0, 1);
        } else {
          const s = Math.min(2, H / 0.7);
          B.box(0.5, 0.1, 0.5, pal(look.lo));
          candle(B, 0, 0.1, 0, s * 0.8);
          if (H > 1.2) smoke(B, 0.02, 0.1 + s * 0.8 * 0.6 + 0.1, 0, 2);
        }
      } else if (role === "dais") {
        B.prism(circle(0, 0, 0.46, 0.46, 8, Math.PI / 8), 0, H * 0.6, pal(c0));
        B.prism(circle(0, 0, 0.36, 0.36, 8, Math.PI / 8), H * 0.6, H, pal(c1));
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.08, pal(c1), 0, H * 0.55, 0, 8);
        smoke(B, 0, H * 0.55 + 0.12, 0, 2);
      } else if (role === "mass" && /tree/i.test(t)) {
        B.box(0.3, H * 0.42, 0.3, pal(pick(tn, 0, ["#8d4c7d", "#74406a", "#5a3052"])));
        const cs = v % 2 ? [[0.9, 0.4], [0.7, 0.36], [0.44, 0.3]] : [[0.82, 0.38], [0.64, 0.34], [0.42, 0.28]];
        let y = H * 0.38;
        cs.forEach(([w, h], i) => { B.rbox(w, h, w, 0.12, pal(i === 1 ? c2 : c1), i % 2 ? 0.04 : -0.03, y, i % 2 ? -0.03 : 0.03); y += h; });
      } else if (role === "mass") {
        const segs = v % 2 ? [0.62, 0.46, 0.3] : [0.56, 0.42, 0.28];
        const hh = (H - 0.3) / segs.length;
        const cols = /horn|obsidian/i.test(t) ? [BLOOM.ink, BLOOM.line, BLOOM.ink] : [c0, c1, c2];
        segs.forEach((w, i) => B.box(w, hh, w, pal(cols[i % 3]), (i % 2 ? 0.06 : -0.04), i * hh, (i % 2 ? -0.05 : 0.04)));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(/horn|obsidian/i.test(t) ? BLOOM.teal : c2), 0, H - 0.3, 0, 4);
      } else if (/fung|mush|spore/i.test(t)) {
        B.cyl(0.1, H * 0.5, pal(BLOOM.wax), 0, 0, 0, 6);
        B.cyl(0.3, H * 0.22, pal(DOODLE[v % 5]), 0, H * 0.5, 0, 8);
        B.cyl(0.2, H * 0.18, pal(DOODLE[(v + 3) % 5]), 0, H * 0.72, 0, 8);
      } else {
        const g = [[0, 0, 0.46, H * 0.7, c0], [0.2, 0.12, 0.32, H * 0.55, c1], [-0.18, 0.16, 0.28, H * 0.45, c2]];
        for (const [x, z, w, h, c] of g) B.rbox(w, h, w, 0.1, pal(c), x, 0, z);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

function fixRamps(level, h) {
  const at = (x, z) => level.cells[z]?.[x];
  for (let z = 0; z < level.cells.length; z++) for (let x = 0; x < level.cells[z].length; x++) {
    const c = at(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = at(x - dx, z - dz);
    if (up && up.h === c.h && up.s !== "ramp") continue;
    const up2 = at(x - 2 * dx, z - 2 * dz), D = at(x + dx, z + dz), D2 = at(x + 2 * dx, z + 2 * dz);
    const flat = (q, hh) => q && q.h === hh && q.s !== "ramp" && h.land(q);
    if (up && up.h === c.h + 1 && flat(up2, up.h) && flat(D, c.h - 1) && flat(D2, c.h - 1) && !h.isFig(x + dx, z + dz) && !h.isFig(x - dx, z - dz)) {
      level.cells[z - dz][x - dx] = { h: up.h, s: "ramp", d: c.d, m: c.m || "stone" };
      level.cells[z][x] = { h: c.h, s: h.surf.path };
      level.cells[z + dz][x + dx] = { h: c.h, s: "ramp", d: c.d, m: c.m || "stone" };
      h.clear(x - dx, z - dz); h.clear(x + dx, z + dz);
    } else level.cells[z][x] = { h: c.h, s: h.surf.path };
  }
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    if (up && ["sand", "grass", "dirt", "stone"].includes(up.s)) c.m = up.s;
  }));
}

function repaint(level, h, keep) {
  const cells = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c && h.land(c) && c.s !== "ramp") cells.push([x, z, c]); }));
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length < cells.length * 0.3) return;
  const to = { 1: "grass", 2: "dirt", 3: "grass" };
  for (const [x, z, c] of stone) {
    if (keep.has(h.key(x, z)) || (x * 7 + z * 3) % 11 === 0) continue;
    level.cells[z][x] = { h: c.h, s: to[c.h] || "grass" };
  }
}

function thin(level, h, keep) {
  const order = [/^pot$|urn|censer/i, /mushroom|fung|spore/i, /^rock/i, /tree|pine/i];
  const [ax, az] = h.figure.anchor;
  for (const re of order) {
    while (h.reach().total < 84) {
      const c = level.decor.filter((d) => re.test(d.t) && !keep.includes(d.t) && d !== h.lead);
      if (!c.length) break;
      c.sort((a, b) => Math.abs(b.x - ax) + Math.abs(b.z - az) - Math.abs(a.x - ax) - Math.abs(a.z - az));
      const d = c[c.length > 2 ? 1 : 0];
      h.removeDecor((e) => e === d);
    }
  }
}

function causeway(level, h) {
  const [ax, az] = h.figure.anchor;
  const [sx, sz] = level.spawn;
  const x = ax + 1;
  if (Math.abs(sx - x) > 1 || sz <= az + 2) return;
  const col = [];
  for (let z = az + 2; z <= sz; z++) col.push(level.cells[z]?.[x]);
  if (!col.some((c) => c && c.s === "water")) return;
  if (col.some((c) => !c || (c.s !== "water" && !h.land(c)))) return;
  const hh = level.cells[sz][sx].h;
  for (let z = az + 2; z <= sz; z++) {
    const c = level.cells[z][x];
    if (c.s === "water") level.cells[z][x] = { h: hh, s: h.surf.path };
  }
  if (sx !== x && h.land(level.cells[sz][x])) level.spawn = [x, sz];
}

export function finish(level, brief, h) {
  const props = level.palette?.props || {};
  const names = Object.keys(props);
  const P = { props };
  const daisTypes = names.filter((t) => roleOf(P, t) === "dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = names.find((t) => roleOf(P, t) === "threshold");
  const lightT = names.find((t) => roleOf(P, t) === "light" && !/colossal/i.test(t)) || names.find((t) => roleOf(P, t) === "light") || "lantern";
  const bigCandle = names.find((t) => /colossal/i.test(t));
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === bigCandle || d.t === "torch" || d.t === "lantern");
  causeway(level, h);
  let r = h.approach();
  if (r.length < 12) {
    let best = null;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || !h.land(c) || c.s === "ramp" || h.isFig(x, z)) return;
      const q = h.approach({ from: [x, z] });
      const sc = (q.length >= 12 ? 100 - Math.abs(q.length - 15) : q.length) + 0.2 * (x + z);
      if (q.length > r.length && (!best || sc > best[0])) best = [sc, x, z];
    }));
    if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; r = h.approach(); }
  }
  h.log?.push?.(`mindbloom approach ${r.length}`);
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  r = h.approach();
  repaint(level, h, new Set([...r, ...h.figRing()].map(([x, z]) => h.key(x, z))));
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.55 }) : null;
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az + 2], [ax, az + 2], [ax + 1, az + 2], [ax + 2, az + 2], [ax + 2, az + 1], [ax + 2, az]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z && /tree|horn|pillar/i.test(d.t));
  h.removeDecor((d) => /tree|pine|horn|pillar/i.test(d.t) && d.x >= ax - 1 && d.z >= az - 1 && d.x <= ax + 4 && d.z <= az + 4 && (d.x - ax) + (d.z - az) >= 1);
  h.removeDecor((d) => /tree|pine/i.test(d.t) && d.x >= ax - 2 && d.x <= ax + 3 && d.z >= az - 3 && d.z <= az + 3);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => /tree|pillar|horn/i.test(d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 5, avoid: g ? [g] : [], keep: [gateT] });
  if (bigCandle) {
    const ring = h.figRing().filter(([x, z]) => z >= az + 2 || x >= ax + 2);
    for (const [x, z] of ring) if (!r.some(([a, b]) => a === x && b === z) && h.put(bigCandle, x, z)) break;
  }
  h.repair({ keep: [gateT] });
  thin(level, h, [gateT, lightT, bigCandle]);
  rampTone(level, h);
}
