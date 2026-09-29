import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const INK = {
  coat: ["#5b4a45", "#463833", "#322724"],
  coatHi: ["#74605a", "#5d4b45", "#45352f"],
  white: ["#ffffff", "#eeebe4", "#d4cec4"],
  shade: ["#dcd8d0", "#c4bfb5", "#a8a298"],
  beak: ["#ffd42e", "#f2b71a", "#d49510"],
  ink: ["#1d1716", "#161110", "#0e0a0a"],
  iris: ["#e8f4f6", "#c9dde2", "#a4bcc2"],
  log: ["#b5773f", "#96602f", "#744622"],
  logHi: ["#d39a5a", "#b57f45", "#8f6032"],
  hay: ["#ffd76a", "#f0bd45", "#cf9a2c"],
  stone: ["#e6e1d6", "#cbc4b6", "#a9a193"],
  stoneLo: ["#b9b1a3", "#9d9585", "#7d7567"],
  rock: ["#8b7c73", "#6f625a", "#554a43"],
  rockHi: ["#a8988c", "#8b7c71", "#6c5f56"],
  gold: ["#ffc93a", "#f0aa1e", "#cf8a12"],
  flame: ["#ffd23a", "#f0a020", "#d07a10"],
  bone: ["#fff4dc", "#eadcc0", "#cbb996"],
  pine: ["#5fcf8a", "#46b271", "#328f58"],
  trunk: ["#8a5a3a", "#6e452b", "#53331f"],
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

function hook(B, x, y, z, s = 1) {
  B.box(0.2 * s, 0.16 * s, 0.14 * s, pal(INK.beak), x, y, z);
  B.box(0.16 * s, 0.14 * s, 0.14 * s, pal(INK.beak), x, y + 0.02 * s, z + 0.14 * s);
  B.box(0.12 * s, 0.1 * s, 0.1 * s, pal(INK.beak), x, y - 0.04 * s, z + 0.25 * s);
  B.box(0.08 * s, 0.1 * s, 0.07 * s, pal(INK.beak), x, y - 0.12 * s, z + 0.27 * s);
  B.box(0.16 * s, 0.04 * s, 0.2 * s, pal(INK.ink), x, y + 0.02 * s, z + 0.06 * s);
}

function head(B, crouch) {
  B.rbox(0.56, 0.46, 0.6, 0.08, pal(INK.white), 0, 0, -0.02);
  B.box(0.5, 0.12, 0.38, pal(INK.white), 0, 0.4, -0.08);
  B.box(0.4, 0.08, 0.26, pal(INK.white), 0, 0.42, -0.24);
  B.box(0.6, 0.08, 0.22, pal(INK.white), 0, 0.34, 0.14);
  hook(B, 0, 0.1, 0.32, 1.7);
  for (const s of [-1, 1]) {
    B.box(0.04, 0.13, 0.13, pal(INK.iris), s * 0.29, 0.2, 0.12);
    B.box(0.04, 0.08, 0.08, pal(INK.ink), s * 0.3, 0.22, 0.15);
    B.box(0.04, 0.05, 0.24, pal(INK.ink), s * 0.29, 0.32, 0.1);
    if (crouch) B.box(0.1, 0.06, 0.24, pal(INK.white), s * 0.22, 0.4, -0.18);
  }
}

function eagle(B, pose) {
  const crouch = pose === "crouch";
  const statue = pose === "statue";
  for (const s of [-1, 1]) {
    B.box(0.14, 0.24, 0.16, pal(INK.beak), s * 0.18, 0, 0.14);
    for (const dx of [-0.05, 0.05]) B.box(0.05, 0.05, 0.12, pal(INK.beak), s * 0.18 + dx, 0, 0.28);
    B.box(0.04, 0.04, 0.06, pal(INK.ink), s * 0.18 - 0.05, 0, 0.36);
    B.box(0.04, 0.04, 0.06, pal(INK.ink), s * 0.18 + 0.05, 0, 0.36);
    B.rbox(0.2, 0.2, 0.24, 0.05, pal(INK.coatHi), s * 0.18, 0.2, 0.08);
  }
  const y0 = 0.34;
  wedge(B, 0.56, 0.4, 0.4, INK.white, 0, y0 - 0.26, -0.62);
  B.box(0.46, 0.14, 0.46, pal(INK.white), 0, y0 - 0.18, -0.6);
  B.rbox(0.7, 0.5, 0.7, 0.12, pal(INK.coat), 0, y0, -0.04);
  B.rbox(0.8, 0.44, 0.8, 0.12, pal(INK.coat), 0, y0 + 0.44, -0.04);
  wedge(B, 0.62, 0.5, 0.2, INK.coatHi, 0, y0 + 0.08, 0.36);
  B.rbox(0.7, 0.26, 0.7, 0.1, pal(INK.coatHi), 0, y0 + 0.84, -0.04);
  const spread = crouch ? 0.16 : 0;
  for (const s of [-1, 1]) {
    B.at(s * (0.4 + spread), y0 + 0.1, -0.12, s * (crouch ? 0.28 : 0.1), () => {
      B.rbox(0.18, 0.9, 0.82, 0.06, pal(INK.coat), 0, -0.02, -0.02);
      B.box(0.22, 0.22, 0.6, pal(INK.coatHi), 0, 0.68, 0.04);
      B.box(0.16, 0.44, 0.4, pal(INK.coat), 0, -0.24, -0.46);
      B.box(0.2, 0.1, 0.5, pal(INK.ink), 0, 0.22, -0.2);
      B.box(0.2, 0.1, 0.4, pal(INK.ink), 0, -0.02, -0.34);
    });
    if (crouch) {
      B.box(0.36, 0.14, 0.4, pal(INK.coat), s * 0.54, y0 + 0.92, -0.1);
      B.box(0.2, 0.12, 0.24, pal(INK.coatHi), s * 0.74, y0 + 1.02, -0.18);
    }
  }
  const ny = y0 + 1.02;
  B.rbox(0.62, 0.22, 0.56, 0.08, pal(INK.white), 0, ny, 0.02);
  B.box(0.48, 0.1, 0.12, pal(INK.white), 0, ny - 0.08, 0.28);
  B.box(0.3, 0.1, 0.1, pal(INK.white), 0, ny - 0.16, 0.3);
  const hy = ny + (crouch ? 0.12 : statue ? 0.26 : 0.2);
  B.rbox(0.46, 0.24, 0.44, 0.08, pal(INK.white), 0, ny + 0.14, 0.04);
  B.at(0, hy, crouch ? 0.2 : 0.08, statue ? 0.2 : 0.38, () => {
    if (crouch) B.rot([1, 0, 0], 0.18, 0, 0, 0);
    head(B, crouch);
    if (crouch) B.pop();
  });
  return hy + 0.46;
}

function nest(B, hi) {
  B.prism(circle(0, 0, 0.94, 0.9, 8, Math.PI / 8), 0, 0.14, pal(INK.stoneLo));
  const ring = 10;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2, r = 0.66;
    B.at(Math.cos(a) * r, 0.14 + (i % 2) * 0.1, Math.sin(a) * r, -a + Math.PI / 2, () => B.box(0.52, 0.14, 0.16, pal(i % 2 ? INK.log : INK.logHi), 0, 0, 0));
  }
  B.prism(circle(0, 0, 0.6, 0.56, 8, Math.PI / 8), 0.14, 0.34, pal(hi || INK.hay));
  B.box(0.18, 0.12, 0.14, pal(INK.bone), 0.42, 0.34, 0.42);
  B.box(0.14, 0.12, 0.14, pal(INK.gold), 0.5, 0.34, 0.24);
  return 0.3;
}

function altar(B, lo, hi) {
  B.box(1.72, 0.18, 1.72, pal(lo), 0, 0, 0);
  B.box(1.4, 0.18, 1.4, pal(hi), 0, 0.18, 0);
  B.box(1.1, 0.14, 1.1, pal(lo), 0, 0.36, 0);
  B.box(1.14, 0.04, 0.08, pal(INK.gold), 0, 0.44, 0.52);
  B.box(0.08, 0.04, 1.14, pal(INK.gold), 0.52, 0.44, 0);
  return 0.5;
}

function crag(B, lo, hi) {
  B.rbox(1.5, 0.3, 1.4, 0.12, pal(lo), 0, 0, -0.04);
  B.rbox(1.12, 0.24, 1.08, 0.1, pal(hi), -0.04, 0.3, 0);
  B.box(0.18, 0.06, 0.1, pal(INK.bone), 0.6, 0.3, 0.46);
  B.box(0.1, 0.06, 0.2, pal(INK.bone), 0.66, 0.3, 0.34);
  return 0.54;
}

function lead(B, H, look, pose) {
  const s = H / 2.6;
  B.push(0, 0, 0, 0, s);
  const top = pose === "nest" ? nest(B, look.hay) : pose === "statue" ? altar(B, look.lo, look.hi) : crag(B, look.lo, look.hi);
  B.at(0, top, 0.06, -0.3, () => eagle(B, pose));
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|pylon/i], ["dais", /dais|altar|plinth|pedestal|nest|throne/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|cache|bones|basin/i], ["mass", /tree|pine|cypress|spire|pillar|needle|monolith|rock|boulder|cliff|totem|crag/i]];
const GATE_RE = /gate|torii|arch|pylon/i;
const roleOf = (P, t) => { const r = P.props?.[t]?.role; if (r && r !== "lead" && GATE_RE.test(t)) return "threshold"; return r || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0]; };
const poseOf = (t) => /shrine|sentinel|aquila|statue|vigil/i.test(t) && !/gale|raptor/i.test(t) ? "statue" : /gale|raptor|boss|storm|crouch/i.test(t) ? "crouch" : "nest";

function wingCrest(B, y, c, side, w = 0.5) {
  for (const s of side ? [side] : [-1, 1]) {
    B.box(w * 0.5, 0.12, 0.24, pal(c), s * w * 0.3, y, 0);
    B.box(w * 0.4, 0.1, 0.2, pal(c), s * w * 0.62, y + 0.1, 0);
    B.box(w * 0.26, 0.1, 0.16, pal(c), s * w * 0.9, y + 0.2, 0);
  }
}

function tree(B, H, v, trunk, a, b, cone) {
  B.box(0.3, H * 0.36, 0.3, pal(trunk));
  const tiers = cone ? [[0.86, 0.34], [0.7, 0.32], [0.54, 0.3], [0.36, 0.28]] : v % 2 ? [[0.92, 0.4], [0.72, 0.36], [0.46, 0.32]] : [[0.84, 0.38], [0.64, 0.34], [0.42, 0.3]];
  let y = H * 0.3;
  const step = (H - y) / tiers.reduce((s, [, h]) => s + h, 0);
  tiers.forEach(([w, hh], i) => { const t = hh * step; B.box(w, t, w, pal(i % 2 ? b : a), (i % 2 ? 0.03 : -0.02), y, (i % 2 ? -0.03 : 0.02)); y += t; });
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const leadT = types.find((t) => roleOf(P, t) === "lead" || roleOf(P, t) === "creature") || "";
  const pose = poseOf(leadT);
  const look = pose === "nest"
    ? { hay: pick(dt, 1, INK.hay) }
    : pose === "statue"
      ? { lo: pick(dt, 0, INK.stoneLo), hi: pick(dt, 1, INK.stone) }
      : { lo: pick(dt, 0, INK.rock), hi: pick(dt, 1, INK.rockHi) };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const isLead = role === "lead" || role === "creature";
    catalog[t] = { footprint: isLead ? [2, 2] : p.footprint || [1, 1], passable: isLead ? false : !!p.passable, variants: 2, height: isLead ? 2.6 : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, INK.log), c1 = pick(tn, 1, INK.stone), c2 = pick(tn, 2, INK.gold);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (isLead) lead(B, H, look, pose);
      else if (role === "threshold") {
        const tall = H * 0.7;
        B.box(0.48, 0.24, 0.48, pal(c1));
        B.box(0.34, tall * 0.55, 0.34, pal(c0), 0, 0.24, 0);
        B.box(0.28, tall * 0.45, 0.28, pal(c0), 0, 0.24 + tall * 0.55, 0);
        const top = 0.24 + tall;
        B.box(0.4, 0.12, 0.4, pal(c2), 0, top, 0);
        if (/crag|beak/i.test(t)) { hook(B, 0, top + 0.16, -0.12, 1.6); }
        else B.cone(0.22, 0, 0.22, pal(INK.gold), 0, top + 0.12, 0, 4);
        if (d.side) {
          const reach = 1.0;
          const beam = (y, th, c) => d.axis === "x" ? B.box(0.24, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.24, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(tall * 0.92, 0.16, c2);
          beam(tall * 0.92 + 0.2, 0.1, INK.white);
        } else wingCrest(B, tall * 0.8, INK.white, 0, 0.5);
      } else if (role === "dais") {
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), 0, H * 0.6, pal(c0));
        B.prism(circle(0, 0, 0.36, 0.36, 8, Math.PI / 8), H * 0.6, H, pal(c1));
      } else if (role === "light") {
        B.box(0.32, 0.14, 0.32, pal(c0));
        B.box(0.16, H - 0.6, 0.16, pal(c0), 0, 0.14, 0);
        B.box(0.36, 0.08, 0.36, pal(c2), 0, H - 0.46, 0);
        B.box(0.24, 0.26, 0.24, pal(P.flame || INK.flame), 0, H - 0.38, 0);
        B.cone(0.24, 0, 0.16, pal(c2), 0, H - 0.12, 0, 4);
      } else if (role === "offering" && /bone/i.test(t)) {
        B.rbox(0.56, 0.1, 0.5, 0.08, pal(INK.rock), 0, 0, 0);
        B.at(0, 0.1, 0, 0.5, () => { B.box(0.5, 0.08, 0.08, pal(INK.bone), 0, 0, 0); for (const s of [-1, 1]) B.box(0.1, 0.12, 0.14, pal(INK.bone), s * 0.26, 0, 0); });
        B.at(0.06, 0.1, 0.1, -0.7, () => B.box(0.36, 0.07, 0.07, pal(INK.bone), 0, 0, 0));
        B.rbox(0.2, 0.18, 0.2, 0.06, pal(INK.bone), -0.14, 0.1, -0.12);
        B.box(0.05, 0.05, 0.03, pal(INK.ink), -0.18, 0.18, -0.02);
        B.box(0.05, 0.05, 0.03, pal(INK.ink), -0.1, 0.18, -0.02);
      } else if (role === "offering" && /basin/i.test(t)) {
        B.prism(circle(0, 0, 0.3, 0.3, 8, Math.PI / 8), 0, H * 0.5, pal(c0));
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), H * 0.5, H * 0.8, pal(c1));
        B.prism(circle(0, 0, 0.34, 0.34, 8, Math.PI / 8), H * 0.8, H * 0.84, pal(["#7fe6f2", "#5ccad8", "#3aa7b8"]));
      } else if (role === "offering") {
        if (v % 2 || /urn/i.test(t)) {
          B.cyl(0.2, H * 0.6, pal(c0), 0, 0, 0, 8);
          B.cyl(0.24, 0.08, pal(c2), 0, H * 0.6, 0, 8);
          B.cyl(0.14, H * 0.2, pal(c0), 0, H * 0.68, 0, 8);
        } else {
          B.box(0.5, H * 0.55, 0.36, pal(c0));
          B.box(0.54, H * 0.22, 0.4, pal(c1), 0, H * 0.55, 0);
          B.box(0.08, H * 0.45, 0.42, pal(INK.gold), -0.14, 0.02, 0);
          B.box(0.08, H * 0.45, 0.42, pal(INK.gold), 0.14, 0.02, 0);
        }
      } else if (role === "mass" && /tree|pine|cypress/i.test(t)) {
        tree(B, H, v, pick(tn, 0, INK.trunk), pick(tn, 1, INK.pine), pick(tn, 2, INK.pine), /cypress|cone/i.test(t));
      } else if (role === "mass" && /boulder|rock/i.test(t)) {
        B.rbox(0.62, H * 0.6, 0.56, 0.1, pal(c0), -0.02, 0, 0);
        B.rbox(0.42, H * 0.42, 0.4, 0.08, pal(c1), 0.06, H * 0.55, -0.04);
        B.rbox(0.3, H * 0.3, 0.26, 0.06, pal(c0), 0.24, 0, 0.24);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.66, 0.5, 0.34] : [0.6, 0.46, 0.3];
        const tot = H - 0.3, hh = tot / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c0][i % 3]), (i % 2 ? 0.05 : -0.04), i * hh, (i % 2 ? -0.04 : 0.04)));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, tot, 0, 4);
      } else {
        const g = [[0, 0, 0.5, H * 0.7, c0], [0.2, 0.12, 0.34, H * 0.55, c1], [-0.18, 0.16, 0.3, H * 0.45, c2]];
        for (const [x, z, w, hgt, c] of g) B.rbox(w, hgt, w, 0.1, pal(c), x, 0, z);
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
    const dn = level.cells[z + dz]?.[x + dx];
    const soft = [up?.s, dn?.s, h.surf.path, h.surf.ground].find((m) => ["sand", "grass", "dirt"].includes(m));
    c.m = soft || "sand";
  }));
}

function grow(h, want) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let pass = 0; pass < 40 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground });
  }
}

function repaint(h, keep) {
  let land = 0, stone = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.s !== "ramp") { land++; if (c.s === "stone") stone++; } }
  if (stone < land * 0.3) return;
  const wet = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "water");
  const base = (c) => (c.h >= 2 && h.surf.raised && h.surf.raised !== "stone" ? h.surf.raised : h.surf.ground && h.surf.ground !== "stone" ? h.surf.ground : c.h >= 2 ? "sand" : "grass");
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || keep.has(h.key(x, z)) || wet(x, z) || (x * 7 + z * 3) % 11 === 0) continue;
    h.set(x, z, { h: c.h, s: base(c) });
  }
  h.log.push(`repaint: ${stone}/${land} stone cells`);
}

function dropRimWater(h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c?.s !== "water") continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; })) { h.set(x, z, { h: 0, s: "none" }); n++; }
  }
  if (n) h.log.push(`rim water: ${n}`);
}

function shore(h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c?.s !== "water") continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + a, Z = z + b, q = h.cell(X, Z);
      if (q && q.s !== "none") continue;
      if (X >= 1 && Z >= 1 && X < h.W - 1 && Z < h.D - 1) { h.set(X, Z, { h: c.h, s: "stone" }); n++; }
      else { h.set(x, z, { h: 0, s: "none" }); break; }
    }
  }
  for (let pass = 0; pass < 4 && h.reach().missing.length; pass++) {
    const miss = new Set(h.reach().missing.map(([x, z]) => h.key(x, z)));
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const q = h.cell(x, z);
      if (q && q.s !== "none") continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [x + a, z + b]).filter(([a, b]) => h.land(h.cell(a, b)) && h.cell(a, b).s !== "ramp" && h.cell(a, b).h === 1);
      if (nb.some(([a, b]) => miss.has(h.key(a, b))) && nb.some(([a, b]) => !miss.has(h.key(a, b)))) h.set(x, z, { h: 1, s: "stone" });
    }
  }
  if (n) h.log.push(`shore: ${n}`);
}

function tidy(level, h, gateT) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const route = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  const nearRamp = (x, z) => N.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp");
  const paved = (d) => h.cell(d.x, d.z)?.s === "stone" && h.cell(d.x, d.z).h === 1 && /tree|pine|cypress/i.test(d.t);
  const moved = level.decor.filter((d) => d.t === "well" && nearRamp(d.x, d.z)).length;
  const n = h.removeDecor((d) => (d.t === "well" && nearRamp(d.x, d.z)) || paved(d));
  let put = 0;
  for (let z = 0; z < h.D && put < moved; z++) for (let x = 0; x < h.W && put < moved; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || route.has(h.key(x, z)) || h.isFig(x, z) || h.decorAt(x, z).length || nearRamp(x, z)) continue;
    if (!N.slice(0, 4).some(([a, b]) => h.cell(x + a, z + b)?.s === "water")) continue;
    if (level.decor.some((d) => (d.t === gateT || d.t === "well") && Math.abs(d.x - x) + Math.abs(d.z - z) <= 2)) continue;
    if (h.put("well", x, z)) { if (h.reach().missing.length) h.removeDecor((d) => d.t === "well" && d.x === x && d.z === z); else put++; }
  }
  if (n) h.log.push(`tidy: -${n} +${put} wells`);
}

function ledges(h, types, level) {
  const drop = (x, z) => [[1, 0], [0, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b), c = h.cell(x, z); return !h.land(n) || n.h <= c.h - 2 || (c.h >= 3 && n.h < c.h); });
  const wall = (x, z) => [[-1, 0], [0, -1]].some(([a, b]) => { const n = h.cell(x + a, z + b), c = h.cell(x, z); return h.land(n) && (n.h >= c.h + 2 || (c.h >= 2 && n.h > c.h)); });
  const n = h.removeDecor((d) => types.includes(d.t) && (drop(d.x, d.z) || wall(d.x, d.z)));
  if (n) h.log.push(`ledges: ${n}`);
}

function jag(level, h, floor) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const voidAt = (x, z) => { const q = h.cell(x, z); return !q || q.s === "none"; };
  const hash = (x, z) => (x * 73856093 ^ z * 19349663) >>> 0;
  const sp = level.spawn || [-9, -9];
  let cut = 0, add = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || (Math.abs(x - sp[0]) + Math.abs(z - sp[1]) <= 1)) continue;
    const nv = N.filter(([a, b]) => voidAt(x + a, z + b)).length;
    if (!nv || !(nv >= 2 || hash(x, z) % 5 === 0)) continue;
    if (h.decorAt(x, z).some((d) => ["lead", "threshold", "light", "mass"].includes(h.role(d.t)) || /tree|pine|well/.test(d.t)) || N.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp")) continue;
    const b0 = h.reach(), before = b0.reached;
    const saved = { ...c }, dec = level.decor.slice();
    h.clear(x, z);
    h.set(x, z, { h: 0, s: "none" });
    const r = h.reach();
    if (r.missing.length > b0.missing.length || r.reached < floor || r.reached < before - 1) { h.set(x, z, saved); level.decor.splice(0, level.decor.length, ...dec); } else cut++;
  }
  for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
    if (!voidAt(x, z) || hash(x, z) % 4) continue;
    const nb = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp" && n.h === 1);
    if (nb.length !== 1) continue;
    h.set(x, z, { h: 1, s: nb[0].s === "stone" ? (h.surf.ground !== "stone" ? h.surf.ground : "grass") : nb[0].s });
    if (h.reach().missing.length) h.set(x, z, { h: 0, s: "none" }); else add++;
  }
  h.log.push(`jag: -${cut} +${add}`);
}

function widenStairs(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of route) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d];
    for (const s of [-1, 1]) {
      const X = x + s * dz, Z = z + s * dx, n = h.cell(X, Z), up = h.cell(X - dx, Z - dz), dn = h.cell(X + dx, Z + dz);
      if (!h.land(n) || n.s === "ramp" || n.h !== c.h - 1 || on.has(h.key(X, Z)) || h.isFig(X, Z) || h.decorAt(X, Z).length) continue;
      if (!up || up.h !== c.h || up.s === "ramp" || !h.land(up) || !dn || dn.h !== c.h - 1 || !h.land(dn)) continue;
      const saved = { ...n };
      h.set(X, Z, { h: c.h, s: "ramp", d: c.d, m: c.m || "stone" });
      if (h.reach().missing.length) h.set(X, Z, saved);
    }
  }
}

function moveSpawn(level, h, min) {
  if (h.approach().length >= min) return;
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z)) continue;
    const q = h.approach({ from: [x, z] });
    if (!q.length) continue;
    const sc = Math.min(q.length, 20) + 0.3 * (x + z);
    if (!best || sc > best[0]) best = [sc, x, z, q.length];
  }
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; h.log.push(`spawn ${best[1]},${best[2]} approach ${best[3]}`); }
}

export function finish(level, brief, h) {
  dropRimWater(h);
  const types = Object.keys(level.palette?.props || {});
  const daisTypes = h.ofRole("dais").concat(types.filter((t) => roleOf(level.palette, t) === "dais"));
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0] || types.find((t) => GATE_RE.test(t));
  const lightT = h.ofRole("light")[0] || types.find((t) => /lantern|torch|brazier|lamp/i.test(t)) || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 90);
  jag(level, h, 84);
  moveSpawn(level, h, 12);
  let r = h.approach();
  if (r.length) h.path(r);
  fixRamps(level, h);
  r = h.approach();
  widenStairs(level, h, r);
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  h.removeDecor((d) => /tree|pine|cypress|needle|boulder|rock/i.test(d.t) && near(d));
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
  repaint(h, keep);
  const [ax, az] = h.figure.anchor;
  for (let a = -1; a <= 2; a++) for (let b = -1; b <= 2; b++) if (!h.isFig(ax + a, az + b)) h.removeDecor((d) => d.x === ax + a && d.z === az + b && h.role(d.t) !== "offering");
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && posts().every((d) => h.cell(d.x, d.z).s !== "ramp") && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  h.repair();
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.5, 0.4, 0.6, 0.3, 0.7]) if (!g) g = tryGate(frac, strict);
  h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  ledges(h, types.filter((t) => roleOf(level.palette, t) === "mass").concat(["rock-big"]), level);
  h.repair({ keep: [gateT] });
  if (gateT && (posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length)) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  shore(h);
  tidy(level, h, gateT);
  rampTone(level, h);
  h.log.push(`posts ${posts().map((d) => d.x + "," + d.z).join(" ")} approach ${h.approach().length} reach ${h.reach().reached}/${h.reach().total}`);
}
