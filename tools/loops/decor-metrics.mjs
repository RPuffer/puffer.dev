import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { makeProjection } from "../../core/iso.js";
import { loadLevel, analyse, table, rows, root } from "./lib.mjs";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const render = opt("--render"), overlay = opt("--overlay"), brief = opt("--brief");
const json = args.includes("--json") ? (args.splice(args.indexOf("--json"), 1), true) : false;
if (!args.length) { console.error("usage: node tools/loops/decor-metrics.mjs <level>[,<level>...] [--brief path] [--render png [--overlay out.png]] [--json]"); process.exit(2); }

const FRAME = [351, 390], TILE = 1.5;
export function screen(level, w, h) {
  const view = level.view, proj = makeProjection(view);
  const zoom = view.zoom * Math.min(w / FRAME[0], h / FRAME[1]);
  const c = proj.project(...view.center);
  return (x, y, z) => { const s = proj.project(x, y, z); return [w / 2 + (s.sx - c.sx) * zoom, h / 2 + (s.sy - c.sy) * zoom]; };
}

async function edges(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, e = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = (dx, dy) => data[(y + dy) * W + x + dx];
    const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
    const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
    e[y * W + x] = Math.hypot(gx, gy) > 60 ? 1 : 0;
  }
  return { e, W, H };
}

async function saliency(A, level, file) {
  const { e, W, H } = await edges(file);
  const S = screen(level, W, H);
  const box = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.max(0, Math.floor(Math.min(...xs))), Math.max(0, Math.floor(Math.min(...ys))), Math.min(W - 1, Math.ceil(Math.max(...xs))), Math.min(H - 1, Math.ceil(Math.max(...ys)))]; };
  const dens = (b) => { let n = 0, s = 0; for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { n++; s += e[y * W + x]; } return n ? s / n : 0; };
  const cellBox = (x, z, top) => { const y0 = (A.cell(x, z)?.h || 0) * TILE; return box([[x, y0, z], [x + 1, y0, z], [x, y0, z + 1], [x + 1, y0, z + 1], [x, y0 + top, z], [x + 1, y0 + top, z + 1]].map((p) => S(...p))); };
  if (!A.figCells.length) return { ratio: null };
  const fh = 2.7;
  const fig = box(A.figCells.flatMap(([x, z]) => { const y0 = (A.cell(x, z)?.h || 0) * TILE; return [[x, y0, z], [x + 1, y0, z + 1], [x + 1, y0, z], [x, y0, z + 1], [x + 0.5, y0 + fh, z + 0.5]]; }).map((p) => S(...p)));
  const rimCells = A.walk.filter(([x, z]) => A.zoneMap.get(`${x},${z}`) === "rim");
  let s = 0, n = 0;
  for (const [x, z] of rimCells) { const b = cellBox(x, z, 1.2); const area = (b[2] - b[0] + 1) * (b[3] - b[1] + 1); s += dens(b) * area; n += area; }
  const rim = n ? s / n : 0, f = dens(fig);
  return { ratio: rim ? f / rim : null, fig, figDensity: f, rimDensity: rim, S };
}

async function drawOverlay(A, level, file, out) {
  const meta = await sharp(file).metadata();
  const S = screen(level, meta.width, meta.height);
  const top = (x, z, lift = 0) => S(x + 0.5, (A.cell(x, z)?.h || 0) * TILE + lift, z + 0.5);
  const hues = ["#00e5ff", "#7cff4f", "#ffe14f", "#ff6bf2", "#4f8bff", "#ff9f4f", "#b388ff", "#4fffc4"];
  const parts = [];
  const route = A.route.map(([x, z]) => top(x, z, 0.05));
  parts.push(`<polyline points="${route.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity="0.85" stroke-dasharray="10 6"/>`);
  if (route.length) parts.push(`<circle cx="${route[0][0]}" cy="${route[0][1]}" r="9" fill="#ffffff"/>`);
  let ci = 0;
  for (const c of A.clusters) {
    const pts = c.flatMap((p) => p.cells.map(([x, z]) => top(x, z, 0.3)));
    if (c.length === 1) { const [x, y] = pts[0]; parts.push(`<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="#ff2a2a" stroke-width="4"/>`); continue; }
    const col = hues[ci++ % hues.length];
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const r = Math.max(30, ...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy) + 24));
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.62}" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="4"/>`);
    for (const [x, y] of pts) parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="${col}"/>`);
    parts.push(`<text x="${cx}" y="${cy - r * 0.62 - 6}" font-family="Helvetica" font-size="16" font-weight="bold" fill="${col}" text-anchor="middle">${c.length}</text>`);
  }
  const m = A.metrics;
  parts.push(`<rect x="8" y="8" width="430" height="58" fill="#000" fill-opacity="0.6"/><text x="18" y="32" font-family="Helvetica" font-size="17" fill="#fff">singletons ${m.singletonShare.toFixed(2)} (${m.singletons}/${m.props}) density ${m.density.all.toFixed(2)}</text><text x="18" y="56" font-family="Helvetica" font-size="15" fill="#fff">clusters ringed by colour, singletons red, route dashed white</text>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${parts.join("")}</svg>`;
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
  await sharp(file).composite([{ input: Buffer.from(svg) }]).png().toFile(path.resolve(root, out));
}

const all = {};
for (const name of args[0].split(",")) {
  const { level, brief: b } = await loadLevel(name, { brief });
  const A = analyse(level, { brief: b });
  if (render) {
    const s = await saliency(A, level, path.resolve(root, render));
    A.metrics.edgeRatio = s.ratio;
    if (overlay) await drawOverlay(A, level, path.resolve(root, render), overlay);
  }
  all[name] = A.metrics;
  if (!json) console.log(`\n${name}  props ${A.metrics.props}, walkable ${A.metrics.walk}\n${table(A.metrics)}`);
}
if (json) console.log(JSON.stringify(all, null, 1));
export { rows };
