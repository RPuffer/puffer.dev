import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CATALOG, registerCatalog } from "../core/catalog.js";
import { makeStyle, lightFactor, packShade } from "../3d/style.js";
import { BIBLE, ramp, hexRgb, rgbHex, luma, lin, enc, audit } from "../3d/prims.js";
import { buildCharacter, heroSpec } from "../3d/character.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const json = args.includes("--json") ? args.splice(args.indexOf("--json"), 1) && true : false;
const [render, name] = args;
if (!render || !name) { console.error("usage: node tools/cohesion.mjs <render.png> <level> [--json]"); process.exit(2); }
const level = JSON.parse(fs.readFileSync(path.join(root, "levels", `${name}.json`), "utf8"));
const style = makeStyle(level);
const rows = [];
const row = (check, value, pass, note = "") => rows.push({ check, value, pass, note });

function lab([r, g, b]) {
  const [R, G, B] = lin([r, g, b]);
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function de2000(a, b) {
  const [L1, a1, b1] = a, [L2, a2, b2] = b, rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (bb, aa) => (bb === 0 && aa === 0 ? 0 : ((Math.atan2(bb, aa) / rad) + 360) % 360);
  const h1 = h(b1, a1p), h2 = h(b2, a2p);
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p) dh = Math.abs(h2 - h1) <= 180 ? h2 - h1 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 + 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2;
  let hm = h1 + h2;
  if (C1p * C2p) hm = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

const { data, info } = await sharp(render).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const bgHex = level.bg || style.bg || "#404040";
const bg = hexRgb(bgHex).map((v) => Math.round(v * 255));
const counts = new Map();
const vals = [];
const isBg = (i) => Math.abs(data[i * 3] - bg[0]) + Math.abs(data[i * 3 + 1] - bg[1]) + Math.abs(data[i * 3 + 2] - bg[2]) <= 24;
for (let i = 0; i < N; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  if (isBg(i)) continue;
  vals.push(Math.max(r, g, b) / 255);
  const x = i % W;
  if ((x > 0 && isBg(i - 1)) || (x < W - 1 && isBg(i + 1)) || (i >= W && isBg(i - W)) || (i < N - W && isBg(i + W))) continue;
  const k = (r << 16) | (g << 8) | b;
  counts.set(k, (counts.get(k) || 0) + 1);
}
vals.sort((a, b) => a - b);
const fg = vals.length;
const p90 = vals[Math.floor(fg * 0.9)] ?? 0;
row("highlight V p90", p90.toFixed(3), p90 >= BIBLE.highlight, `non-background ${(100 * fg / N).toFixed(1)}% of frame, floor ${BIBLE.highlight}`);

const pieceMods = [];
for (const p of level.pieces || []) {
  const mod = await import(path.join(root, "3d", p));
  const out = (await mod.register(style)) || {};
  registerCatalog(out.catalog || {});
  pieceMods.push({ path: p, mod, out });
}

const hexes = new Set();
const walk = (v) => { if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) hexes.add(v.toLowerCase()); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
walk(style.palette);
walk(style.hero);
walk(BIBLE.ink); walk(BIBLE.white);
for (const f of ["3d/pieces.js", "3d/terrain.js", "3d/palette.js", "3d/character.js", ...(level.pieces || []).map((p) => path.join("3d", p))]) {
  const src = fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), "utf8") : "";
  for (const m of src.matchAll(/"(#[0-9a-f]{6})"/gi)) hexes.add(m[1].toLowerCase());
}
const L = style.light;
const lit = (hex, n) => (L ? rgbHex(enc(lin(hexRgb(hex)).map((v) => v * lightFactor(L, ...n)))) : hex);
const FACES = [[0, 1, 0], [0, 0, 1], [1, 0, 0]];
const targets = new Set();
const packed = (hex, n) => rgbHex(enc(lin(hexRgb(hex)).map((v) => v * packShade(...n))));
for (const h of hexes) for (const r of ramp(h)) { targets.add(r); for (const n of FACES) { targets.add(lit(r, n)); targets.add(lit(packed(r, n), n)); targets.add(lit(rgbHex(enc(lin(hexRgb(r)).map((v) => v * 0.85))), n)); } }
const tlab = [...targets].map((h) => lab(hexRgb(h)));
const minCount = Math.max(4, fg * 0.001);
const sw = [...counts.entries()].filter(([, c]) => c >= minCount);
let worst = 0, over = [], wsum = 0;
const des = [];
for (const [k, c] of sw) {
  const rgb = [(k >> 16) / 255, ((k >> 8) & 255) / 255, (k & 255) / 255];
  const l = lab(rgb);
  let best = Infinity;
  for (const t of tlab) { const d = de2000(l, t); if (d < best) best = d; }
  des.push([best, c]); wsum += c;
  if (best > worst) worst = best;
  if (best > 6) over.push([rgbHex(rgb), best, c]);
}
des.sort((a, b) => a[0] - b[0]);
let acc = 0, wp90 = 0;
for (const [d, c] of des) { acc += c; if (acc >= wsum * 0.9) { wp90 = d; break; } }
over.sort((a, b) => b[2] - a[2]);
const share = over.reduce((s, o) => s + o[2], 0) / (wsum || 1);
row("palette CIEDE2000 to ramp", `max ${worst.toFixed(2)}, p90 ${wp90.toFixed(2)}`, worst <= 6, `${sw.length} swatches, ${over.length} over 6 (${(100 * share).toFixed(1)}% of swatch pixels)${over.length ? ": " + over.slice(0, 4).map((o) => `${o[0]} ${o[1].toFixed(1)}`).join(", ") : ""}`);

const cliffs = [style.palette.cliffUpper, style.palette.cliffLower].filter((c) => c?.left && c?.right);
for (const [i, c] of cliffs.entries()) {
  const l = lit(c.left, FACES[1]), r = lit(c.right, FACES[2]);
  const seen = [l, r].map((h) => counts.get(parseInt(h.slice(1), 16)) || 0);
  const ratio = luma(hexRgb(r)) / luma(hexRgb(l));
  row(`terrain ${i ? "lower" : "upper"} cliff right/left`, ratio.toFixed(3), Math.abs(ratio - 0.75) <= BIBLE.face.tol, `${l} ${seen[0]} px, ${r} ${seen[1]} px; free (palette-authored, not locked)`);
}

const decor = level.decor || [];
for (const { path: p, mod, out } of pieceMods) {
  if (typeof mod.figures !== "function") { row(`creature parts (${p})`, "n/a", true, "module exports no figures()"); continue; }
  for (const [t, spec] of Object.entries(mod.figures(style))) {
    const a = audit(spec);
    row(`creature parts ${t}`, `${a.parts} parts, head ${a.headRatio?.toFixed(2)}`, a.ok, a.ok ? `${a.face} face details, ${a.height} tile figure` : a.errors.join("; "));
    const d = decor.find((q) => q.t === t);
    if (!d || !out.builders?.[t]) continue;
    const m = out.builders[t](d.v || 0, d.rot || 0, style, { height: CATALOG[t].height, decor: d });
    const g = m.geometry, P = g.attributes.position, C = g.attributes.color;
    const yaw = -(d.rot || 0) * Math.PI / 2, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const res = [], faceHex = new Set();
    for (const part of m.userData.parts || []) {
      if (part.face || part.chain) continue;
      const cls = { top: [], left: [], right: [] };
      for (let t3 = part.start; t3 < part.end; t3++) {
        const i = t3 * 3;
        const ax = P.getX(i), ay = P.getY(i), az = P.getZ(i);
        const ux = P.getX(i + 1) - ax, uy = P.getY(i + 1) - ay, uz = P.getZ(i + 1) - az, vx = P.getX(i + 2) - ax, vy = P.getY(i + 2) - ay, vz = P.getZ(i + 2) - az;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const ln = Math.hypot(nx, ny, nz); if (ln < 1e-12) continue;
        nx /= ln; ny /= ln; nz /= ln;
        const wx = nx * cy + nz * sy, wz = -nx * sy + nz * cy;
        const f = L ? lightFactor(L, wx, ny, wz) : 1;
        const rgb = enc([C.getX(i) * f, C.getY(i) * f, C.getZ(i) * f]), shown = luma(rgb);
        if (ny > 0.8 || Math.abs(ny) < 0.3) faceHex.add(rgbHex(rgb));
        if (ny > 0.8) cls.top.push(shown);
        else if (Math.abs(ny) < 0.3) { const u = Math.max(0, Math.min(Math.PI / 2, Math.atan2(wx, wz))) / (Math.PI / 2); if (u < 0.3) cls.left.push(shown); else if (u > 0.7) cls.right.push(shown); }
      }
      const med = (a) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1] : null);
      const [tp, lf, rt] = [med(cls.top), med(cls.left), med(cls.right)];
      if (tp && lf) res.push(["left/top", part.id, lf / tp]);
      if (lf && rt && !part.two) res.push(["right/left", part.id, rt / lf]);
    }
    const hits = [...faceHex].filter((h) => [-1, 0, 1].some((dr) => [-1, 0, 1].some((dg) => counts.get(parseInt(h.slice(1), 16) + (dr << 16) + (dg << 8))))).length;
    for (const [kind, want] of [["left/top", BIBLE.face.left], ["right/left", BIBLE.face.right / BIBLE.face.left]]) {
      const r = res.filter((q) => q[0] === kind);
      if (!r.length) continue;
      const dev = r.reduce((m2, q) => (Math.abs(q[2] - want) > Math.abs(m2[2] - want) ? q : m2));
      const mean = r.reduce((s, q) => s + q[2], 0) / r.length;
      row(`face ${kind} ${t}`, `mean ${mean.toFixed(3)}, worst ${dev[2].toFixed(3)} (${dev[1]})`, Math.abs(dev[2] - want) <= BIBLE.face.tol, `${r.length} blocks from the bake under level light, target ${want.toFixed(2)}; ${hits}/${faceHex.size} face tones found in the render`);
    }
  }
}

{
  const ha = audit(heroSpec(style));
  const hero = buildCharacter(1, style);
  const res = [];
  hero.traverse((m) => {
    if (!m.isMesh || ["eyes", "brow", "mouth"].includes(m.parent.name)) return;
    const P = m.geometry.attributes.position, C = m.geometry.attributes.color, cls = { top: [], left: [], right: [] };
    for (let i = 0; i < P.count; i += 3) {
      const ax = P.getX(i), ay = P.getY(i), az = P.getZ(i);
      const ux = P.getX(i + 1) - ax, uy = P.getY(i + 1) - ay, uz = P.getZ(i + 1) - az, vx = P.getX(i + 2) - ax, vy = P.getY(i + 2) - ay, vz = P.getZ(i + 2) - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ln = Math.hypot(nx, ny, nz); if (ln < 1e-12) continue;
      nx /= ln; ny /= ln; nz /= ln;
      const shown = luma(enc([C.getX(i), C.getY(i), C.getZ(i)]));
      if (ny > 0.8) cls.top.push(shown);
      else if (Math.abs(ny) < 0.3) { const u = Math.max(0, Math.min(Math.PI / 2, Math.atan2(nx, nz))) / (Math.PI / 2); if (u < 0.3) cls.left.push(shown); else if (u > 0.7) cls.right.push(shown); }
    }
    const med = (a) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1] : null);
    const [tp, lf, rt] = [med(cls.top), med(cls.left), med(cls.right)];
    if (tp && lf) res.push(["left/top", m.parent.name, lf / tp]);
    if (lf && rt && Math.abs(rt - lf) > 1e-3) res.push(["right/left", m.parent.name, rt / lf]);
  });
  const total = heroSpec(style).parts.length;
  row("hero parts", `${total} parts, ${ha.parts} over 0.15, head ${ha.headRatio?.toFixed(2)}`, ha.ok && total >= 16 && total <= 20, ha.ok ? `${ha.height} tile figure, ${ha.parts} of ${BIBLE.parts.max} budget` : ha.errors.join("; "));
  for (const [kind, want] of [["left/top", BIBLE.face.left], ["right/left", BIBLE.face.right / BIBLE.face.left]]) {
    const r = res.filter((q) => q[0] === kind);
    if (!r.length) continue;
    const dev = r.reduce((m2, q) => (Math.abs(q[2] - want) > Math.abs(m2[2] - want) ? q : m2));
    const mean = r.reduce((s, q) => s + q[2], 0) / r.length;
    row(`hero face ${kind}`, `mean ${mean.toFixed(3)}, worst ${dev[2].toFixed(3)} (${dev[1]})`, Math.abs(dev[2] - want) <= BIBLE.face.tol, `${r.length} parts, target ${want.toFixed(2)}`);
  }
}

const used = [...new Set(decor.map((d) => d.t))].filter((t) => CATALOG[t]);
const bad = [];
let focal = 0, decal = 0;
for (const t of used) {
  const e = CATALOG[t], h = e.height ?? 1;
  const role = style.palette.props?.[t]?.role;
  if (role === "lead" || role === "creature") { focal++; if (h < BIBLE.scale.focal[0] || h > BIBLE.scale.focal[1]) bad.push(`${t} ${h} focal`); continue; }
  if (e.passable && h < BIBLE.scale.decor[0]) { decal++; continue; }
  if (h < BIBLE.scale.decor[0] || h > BIBLE.scale.decor[1]) bad.push(`${t} ${h}`);
}
row("scale bands", `${used.length} types, ${focal} focal, ${decal} decals`, !bad.length, bad.length ? bad.join(", ") : `decor ${BIBLE.scale.decor.join(" to ")}, focal ${BIBLE.scale.focal.join(" to ")}`);

if (json) console.log(JSON.stringify({ render, level: name, rows }, null, 1));
else {
  console.log(`cohesion ${name}  ${render}`);
  for (const r of rows) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.check.padEnd(38)} ${String(r.value).padEnd(34)} ${r.note}`);
}
process.exitCode = rows.every((r) => r.pass) ? 0 : 1;
