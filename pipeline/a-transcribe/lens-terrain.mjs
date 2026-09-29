const HEX = /^#[0-9a-f]{6}$/i;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const SURF = ["grass", "sand", "dirt", "stone"];
export const CLIFF_STYLES = ["banded", "sheer", "stepped", "mossy", "soft"];
export const MIX_PATTERNS = ["rings", "bands", "patches", "scatter", "height", "shaper", "uniform"];
export const STONE_CAP = 0.2;

const hexMix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const mixObj = (o, to, t) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, HEX.test(v) ? hexMix(v, to, t) : v]));
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function cliffPalette(palette, ct) {
  if (!ct) return [];
  const log = [];
  const tri = (a) => Array.isArray(a) && a.length >= 3 && a.slice(0, 3).every((h) => HEX.test(h));
  if (tri(ct.upper)) { palette.cliffUpper = { left: ct.upper[0], right: ct.upper[1], seam: ct.upper[2] }; log.push("upper"); }
  if (tri(ct.lower)) { palette.cliffLower = { left: ct.lower[0], right: ct.lower[1], seam: ct.lower[2], speck: hexMix(ct.lower[2], "#000000", 0.2) }; log.push("lower"); }
  const style = ct.style;
  const grassFringe = palette.grass?.fringe || "#5fa845";
  if (style === "mossy") { palette.cliffUpper = mixObj(palette.cliffUpper, grassFringe, 0.35); palette.cliffLower = mixObj(palette.cliffLower, grassFringe, 0.25); }
  if (style === "soft") { const pale = palette.sand?.top || "#f0e0b8"; palette.cliffUpper = mixObj(palette.cliffUpper, pale, 0.35); palette.cliffLower = mixObj(palette.cliffLower, pale, 0.3); }
  if (style === "sheer") { palette.cliffUpper = mixObj(palette.cliffUpper, "#1c1a26", 0.18); palette.cliffLower = mixObj(palette.cliffLower, "#1c1a26", 0.22); }
  if (style === "banded") palette.cliffLower = mixObj(palette.cliffLower, palette.cliffUpper.right === palette.cliffLower.right ? "#2a2440" : palette.cliffLower.left, 0.1);
  log.push(style || "none");
  return log;
}

export function cliffShape(cells, ct, isFig) {
  const style = ct?.style;
  let n = 0;
  if (style === "stepped") {
    for (let pass = 0; pass < 4; pass++) for (let z = 0; z < cells.length; z++) for (let x = 0; x < cells[z].length; x++) {
      const c = cells[z][x];
      if (c.h < 2 || c.s === "water" || c.s === "none" || isFig(x, z)) continue;
      const lo = Math.min(...N4.map(([dx, dz]) => cells[z + dz]?.[x + dx]).filter((q) => q && q.h >= 1 && q.s !== "water" && q.s !== "none").map((q) => q.h), 9);
      if (lo < 9 && c.h - lo >= 2) { c.h--; n++; }
    }
  }
  if (style === "mossy") for (const row of cells) for (const c of row) if (c.h >= 2 && ["sand", "dirt", "stone"].includes(c.s)) { c.s = "grass"; n++; }
  if (style === "sheer") for (const row of cells) for (const c of row) if (c.h >= 3 && c.s === "grass") { c.s = "sand"; n++; }
  return n;
}

export function surfaceMix(cells, mix, o = {}) {
  if (!mix || !Array.isArray(mix.surfaces) || !mix.surfaces.length) return 0;
  let list = mix.surfaces.filter((e) => SURF.includes(e?.s) && +e.share > 0).map((e) => ({ s: e.s, w: +e.share }));
  if (!list.length) return 0;
  const tot = list.reduce((a, e) => a + e.w, 0);
  list = list.map((e) => ({ ...e, w: e.w / tot }));
  const st = list.find((e) => e.s === "stone");
  if (st && st.w > STONE_CAP) { const spare = st.w - STONE_CAP; st.w = STONE_CAP; const rest = list.filter((e) => e !== st); rest.forEach((e) => (e.w += spare / rest.length)); if (!rest.length) list.push({ s: "grass", w: spare }); }
  const cum = []; let acc = 0;
  for (const e of list) { acc += e.w; cum.push([acc, e.s]); }
  const pickAt = (v) => (cum.find(([c]) => v < c) || cum[cum.length - 1])[1];
  const [fx, fz] = o.focal || [7.5, 5.5];
  const pattern = MIX_PATTERNS.includes(mix.pattern) ? mix.pattern : "patches";
  const period = Math.max(1.5, +mix.period || 2.5);
  const shaped = o.shapedSurfaces;
  const g = Array.from({ length: 5 }, (_, j) => Array.from({ length: 6 }, (_, i) => hash(i, j, 77)));
  const noise = (x, z) => { const u = (x / 15) * 5, v = (z / 11) * 4, i = Math.min(4, Math.floor(u)), j = Math.min(3, Math.floor(v)), fu = u - i, fv = v - j; const a = g[j][i] + (g[j][i + 1] - g[j][i]) * fu, b = g[j + 1][i] + (g[j + 1][i + 1] - g[j + 1][i]) * fu; return a + (b - a) * fv; };
  const target = [];
  cells.forEach((row, z) => row.forEach((c, x) => { if (c.h >= 1 && SURF.includes(c.s) && !(o.skip && o.skip(x, z))) target.push([x, z, c]); }));
  let vals;
  if (pattern === "patches" || pattern === "scatter") {
    const key = pattern === "patches" ? ([x, z]) => noise(x, z) + hash(x, z, 3) * 0.08 : ([x, z]) => hash(x, z, 5);
    const order = [...target].sort((a, b) => key(a) - key(b));
    vals = new Map(order.map((t, i) => [t, i / order.length]));
  }
  let n = 0;
  for (const t of target) {
    const [x, z, c] = t;
    let v;
    if (vals) v = vals.get(t);
    else if (pattern === "rings") v = ((Math.hypot(x + 0.5 - fx, z + 0.5 - fz) / period) % 1 + 1) % 1;
    else if (pattern === "bands") v = (((x + z) / (period * 1.4)) % 1 + 1) % 1;
    else if (pattern === "height") v = Math.min(0.999, (c.h - 1) / 3 + 0.05);
    else if (pattern === "shaper" && shaped) { const ch = shaped[z]?.[x]; v = ch && ch !== "." ? ((+ch + 0.5) / 4) % 1 : 0; }
    else v = 0;
    const s = pickAt(v);
    if (s !== c.s) { c.s = s; n++; }
  }
  return n;
}

export function bridges(cells, list) {
  let n = 0;
  for (const [x, z] of list || []) { const c = cells[z]?.[x]; if (!c || c.s === "water") continue; cells[z][x] = { h: Math.max(1, c.h), s: "bridge", m: "planks" }; n++; }
  return n;
}
