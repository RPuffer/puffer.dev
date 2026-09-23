import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CATALOG, registerCatalog } from "../../core/catalog.js";
import { checkLevel } from "../../core/procgen.js";
import { makeProjection } from "../../core/iso.js";

const [specPath = "pipeline/b-concept/measure.json", outPath] = process.argv.slice(2);
const M = JSON.parse(fs.readFileSync(specPath, "utf8"));
const out = outPath || `levels/${M.name}.json`;
const { a, b, ox, oy, step, base } = M.lattice;
const zoomPx = (a / Math.SQRT1_2) * Math.cos(Math.asin(b / a));
const tileHv = step / zoomPx;

const { data, info } = await sharp(M.concept).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const CW = info.width, CH = info.height;
const hex = (r, g, bl) => "#" + [r, g, bl].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const shade = (h, f) => hex(...rgb(h).map((v) => v * f));
const mix = (p, q, t) => { const A = rgb(p), B = rgb(q); return hex(...A.map((v, i) => v + (B[i] - v) * t)); };
function modeHex([x0, y0, x1, y1]) {
  const m = new Map();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const o = (y * CW + x) * 3, k = ((data[o] >> 2) << 12) | ((data[o + 1] >> 2) << 6) | (data[o + 2] >> 2);
    const e = m.get(k) || [0, 0, 0, 0];
    e[0] += data[o]; e[1] += data[o + 1]; e[2] += data[o + 2]; e[3]++;
    m.set(k, e);
  }
  const [r, g, bl, n] = [...m.values()].sort((p, q) => q[3] - p[3])[0];
  return hex(r / n, g / n, bl / n);
}

const S = Object.fromEntries(Object.entries(M.swatches).map(([k, box]) => [k, modeHex(box)]));
const g = S["grass.top"], fr = S["grass.fringe"], dt = S["dirt.top"];
const bark = [shade(S["forestB.bark.1"], 1.22), S["forestB.bark.1"], S["forestB.bark.2"]];
const leanC = [shade(S["forestB.lean.1"], 1.18), S["forestB.lean.1"], shade(S["forestB.lean.1"], 0.72)];
const logC = [shade(S["forestB.log.1"], 1.15), S["forestB.log.1"], shade(S["forestB.log.1"], 0.8)];
const rootC = [shade(S["forestB.root.1"], 1.08), S["forestB.root.1"], shade(S["forestB.root.1"], 0.78)];
const mossC = [shade(S["forestB.moss.1"], 1.1), S["forestB.moss.1"], shade(S["forestB.moss.1"], 0.82)];
const fl = S["forestB.flame.1"];
const palette = {
  bg: S.bg,
  grass: { top: g, fringe: fr, fringeDark: shade(fr, 0.74), speck: shade(g, 1.05) },
  dirt: { top: dt, patch: g, mottle: shade(dt, 0.9), border: dt, path: shade(dt, 1.05) },
  sand: { top: dt, lip: shade(dt, 0.8), edge: shade(dt, 0.9), dots: shade(dt, 1.1) },
  stone: { top: dt, pebble: shade(dt, 1.2), pebbleShade: shade(dt, 1.05), rim: shade(dt, 0.85), side: [shade(dt, 0.8), shade(dt, 0.75), shade(dt, 0.9)], pebbleEdge: shade(dt, 1.1) },
  cliffUpper: { left: mix(S["cliffUpper.left"], S["cliffLower.left"], 0.5), right: S["cliffUpper.right"], seam: mix(S["cliffUpper.left"], S["cliffUpper.right"], 0.5) },
  cliffLower: { left: S["cliffLower.left"], right: S["cliffLower.right"], seam: mix(S["cliffLower.left"], S["cliffLower.right"], 0.5), speck: shade(S["cliffLower.right"], 0.8) },
  trunk: [bark[1], bark[2]],
  wood: { light: logC[0], mid: logC[1], dark: logC[2], shadow: shade(logC[2], 0.8), end: shade(logC[0], 1.15) },
  forestB: {
    bark, lean: leanC, log: logC, logEnd: [shade(logC[0], 1.15), logC[1]], root: rootC, moss: mossC,
    stump: [shade(bark[0], 1.35), shade(bark[1], 1.2), shade(bark[2], 1.3)],
    mist: [shade(S["forestB.mist.1"] || "#808c94", 1.08), S["forestB.mist.1"] || "#808c94", shade(S["forestB.mist.1"] || "#808c94", 0.85)],
    path: [shade(dt, 1.08), dt, shade(dt, 0.78)],
    flame: ["#fcd468", fl, "#f47824", "#e0601c"],
    beak: ["#f8c858", shade("#f8c858", 0.92), shade("#f8c858", 0.72)],
    eye: shade(bark[2], 1.0),
  },
  hero: { shirt: [fl, fl, shade(fl, 0.82)] },
};
for (const [k, v] of Object.entries(M.paletteExtra || {})) palette[k] = v;

const codes = { p: "grass", g: "grass", d: "dirt", s: "sand", t: "stone", w: "water", r: "ramp", b: "bridge" };
const cells = M.grid.map((row) => row.trim().split(/\s+/).map((tok) => {
  if (tok === ".") return { h: 0, s: "none" };
  const m = tok.match(/^([a-z])(\d)([nesw])?$/);
  if (!m || !codes[m[1]]) throw new Error("bad grid token " + tok);
  const c = { h: +m[2], s: codes[m[1]] };
  if (c.s === "ramp") { c.d = m[3]; c.m = M.rampMaterial || "grass"; }
  return c;
}));
const W = cells[0].length, D = cells.length;
const auto = [];
M.grid.forEach((row, z) => row.trim().split(/\s+/).forEach((tok, x) => {
  if (tok[0] === "p") auto.push({ t: "dirt-path", x, z, v: 0 });
  if (tok[0] === "r") auto.push({ t: "dirt-stairs", x, z, rot: { e: 0, s: 1, w: 2, n: 3 }[tok[2]] });
}));

function locate(px, py, h) {
  const u = (px - ox) / a, v = (py - oy + (h - base) * step) / b;
  const cx = (u + v) / 2, cz = (v - u) / 2;
  return { x: Math.floor(cx), z: Math.floor(cz), fx: cx - Math.floor(cx) - 0.5, fz: cz - Math.floor(cz) - 0.5 };
}

const mod = await import(path.resolve("3d", M.pieces || `pieces/${M.name}.js`));
const reg = mod.register({ palette, materials: {}, light: null });
registerCatalog(reg.catalog);

const decor = [], log = [];
for (const p of M.props) {
  const d = { t: p.t };
  if (p.cell) {
    d.x = p.cell[0]; d.z = p.cell[1];
    if (p.px) {
      const u = (p.px[0] - ox) / a, v = (p.px[1] + (p.y || 0) * zoomPx - oy + (p.h - base) * step) / b;
      d.at = [+((u + v) / 2 - d.x - 0.5).toFixed(3), 0, +((v - u) / 2 - d.z - 0.5).toFixed(3)];
    }
  }
  else {
    const L = locate(p.px[0], p.px[1], p.h);
    const c = cells[L.z]?.[L.x];
    d.x = L.x; d.z = L.z;
    const clamp = (q) => +Math.max(-0.45, Math.min(0.45, q)).toFixed(2);
    if (Math.abs(L.fx) > 0.05) d.ox = clamp(L.fx);
    if (Math.abs(L.fz) > 0.05) d.oz = clamp(L.fz);
    log.push(`${p.t.padEnd(14)} px ${p.px.join(",").padEnd(8)} h${p.h} -> cell ${L.x},${L.z} (${c ? c.s + c.h : "off grid"}) off ${L.fx.toFixed(2)},${L.fz.toFixed(2)}${c && c.h !== p.h ? "  HEIGHT MISMATCH" : ""}`);
  }
  for (const k of ["v", "rot", "ht", "lean", "y", "w", "ox", "oz", "fork", "r"]) if (p[k] != null) d[k] = p[k];
  decor.push(d);
}

decor.push(...auto);
const zoomC = a / Math.SQRT1_2;
const pitch = +(Math.asin(b / a) * 180 / Math.PI).toFixed(3);
const tileH = +(step / (zoomC * Math.cos(pitch * Math.PI / 180))).toFixed(3);
const frameScale = Math.min(CW / 351, CH / 390);
const view = { pitch, yaw: 45, tileH, zoom: +(zoomC / frameScale).toFixed(3) };
const proj = makeProjection(view);
const o = proj.project(0, base * tileH, 0, zoomC);
const lat = (cx, cz) => proj.project(cx, base * tileH, cz, zoomC);
const offX = ox - o.sx, offY = oy - o.sy;
const drift = Math.hypot(lat(W, D).sx + offX - (ox + (W - D) * a), lat(W, D).sy + offY - (oy + (W + D) * b));
for (const d of decor) if (d.t === "dirt-stairs") d.tileH = tileH;
M.props.forEach((p, i) => {
  if (!p.top) return;
  const d = decor[i], bx = d.x + 0.5 + (d.ox || 0), bz = d.z + 0.5 + (d.oz || 0), by = cells[d.z][d.x].h * tileHv;
  const u = (p.top[0] - ox) / a, V = p.top[1] - oy + (p.h - base) * step;
  const trunkDecor = decor.filter((q) => q.t === "bare-trunk");
  const trunks = trunkDecor.map((q) => [q.x + 0.5 + (q.ox || 0), q.z + 0.5 + (q.oz || 0), cells[q.z][q.x].h * tileHv + (q.ht || 4.6), q]);
  let best = null;
  for (let S = -4; S < 20; S += 0.01) {
    const yRel = (S * b - V) / zoomPx, x = (S + u) / 2, z = (S - u) / 2, y = p.h * tileHv + yRel;
    for (const [tx, tz, ttop, tq] of trunks) {
      const dist = Math.hypot(tx - x, tz - z), err = Math.abs(dist - 0.44);
      if (y < ttop - 0.25 && y > by + 1 && err < 0.04 && (!best || S > best.S)) best = { S, err, v: [x - bx, y - by, z - bz], tq, fork: [+(y - cells[tq.z][tq.x].h * tileHv - 0.12).toFixed(3), +Math.atan2(x - tx, z - tz).toFixed(3)] };
    }
  }
  if (best) { d.lean = best.v.map((q) => +q.toFixed(3)); best.tq.fork = best.fork; }
});
M.props.forEach((p, i) => {
  if (!p.behind) return;
  const d = decor[i], u = (p.px[0] - ox) / a, V = p.px[1] - oy + (p.h - base) * step;
  const half = (p.w || 1.9) / 2 + 0.35;
  const posts = decor.filter((q) => /trunk|fire-bird/.test(q.t)).map((q) => [q.x + 0.5 + (q.ox || 0), q.z + 0.5 + (q.oz || 0)]);
  const near = posts.filter(([x, z]) => Math.abs((x - z - u) * Math.SQRT1_2) < half);
  const S = Math.min(...near.map(([x, z]) => x + z)) - (p.behind === true ? 0.75 : p.behind);
  const y = (S * b - V) / zoomPx, x = (S + u) / 2, z = (S - u) / 2;
  d.at = [+(x - d.x - 0.5).toFixed(3), 0, +(z - d.z - 0.5).toFixed(3)];
  d.y = +y.toFixed(3);
});
M.props.forEach((p, i) => {
  if (!p.depth) return;
  const d = decor[i], pr = pitch * Math.PI / 180, hz = p.depth * Math.cos(pr) * Math.SQRT1_2;
  d.at = [+(d.at[0] + hz).toFixed(3), d.at[1], +(d.at[2] + hz).toFixed(3)];
  d.y = +((d.y || 0) + p.depth * Math.sin(pr)).toFixed(3);
});
if (M.skirt) {
  const land = [];
  cells.forEach((row, z) => row.forEach((c, x) => { if (c.h >= 1 && c.s !== "none" && c.s !== "water") land.push([x, z, c.h]); }));
  const n = new Map();
  for (const [, , h] of land) n.set(h, (n.get(h) || 0) + 1);
  const F = [...n].sort((p, q) => q[1] - p[1] || q[0] - p[0])[0][0];
  const [hx, hz] = M.skirt.host, hy = cells[hz][hx].h * tileH;
  decor.push({ t: "island-skirt", x: hx, z: hz, y0: +(M.skirt.bottom - hy).toFixed(3), y1: +(F * tileH - 1.26 + 0.02 - hy).toFixed(3), cells: land.map(([x, z]) => [x - hx, z - hz]) });
}
const c = proj.unprojectGround(CW / 2 - offX, CH / 2 - offY, base * tileH, zoomC);
view.center = [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)];
if (M.zoomScale) view.zoom = +(view.zoom * M.zoomScale).toFixed(3);
if (M.viewOffset) view.center = view.center.map((v, i) => +(v + M.viewOffset[i]).toFixed(3));

const level = {
  name: M.name, size: [W, D], bg: palette.bg, palette,
  materials: { ramp: ["stone", "sand", "grass", "dirt"] },
  light: M.light || { dir: [-0.35, 1, 0.55], ambient: 0.92, sun: 0.1 },
  pieces: [M.pieces || `pieces/${M.name}.js`],
  view, cells, decor, spawn: M.spawn,
};
const problems = checkLevel(JSON.parse(JSON.stringify(level))).filter((p) => !/grass share|plateau in|dirt-stairs at [0-9]+,[0-9]+ on ramp/.test(p));
fs.writeFileSync(out, JSON.stringify(level, null, 1).replace(/\n\s+([\]}\d"#-])/g, (m, ch) => (m.length < 40 ? " " + ch : m)) + "\n");
console.log(log.join("\n"));
console.log(`lattice drift ${drift.toFixed(2)} px; view ${JSON.stringify(view)}`);
console.log(`${out}: ${W}x${D}, ${decor.length} decor, ${problems.length ? "FAIL " + problems.join("; ") : "checks pass"}`);
process.exitCode = problems.length ? 1 : 0;
