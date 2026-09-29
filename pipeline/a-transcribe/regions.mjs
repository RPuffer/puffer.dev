import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const conceptArg = flag("--concept", null);
const artSlug = flag("--art", null), briefArg = flag("--brief", null);
const art = path.resolve(root, artSlug ? `pipeline/seed/${artSlug}.png` : pos[0] || "pipeline/seed/forest.png");
const briefPath = path.resolve(root, briefArg || pos[1] || (conceptArg ? `pipeline/seed/concepts/${conceptArg}.json` : "pipeline/seed/brief.json"));
const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
const concept = brief.concept && brief.concept.name !== "literal" ? brief.concept.name : null;
const stem = briefArg ? path.basename(briefPath, ".json") : null;
const outPath = path.resolve(root, flag("--out", stem ? `pipeline/a-transcribe/regions/${stem}.json` : concept ? `pipeline/a-transcribe/regions-${concept}.json` : "pipeline/a-transcribe/regions.json"));
const debugPath = path.resolve(root, flag("--debug", stem ? `out/${stem}/regions.png` : concept ? `out/forest-a-${concept}/regions.png` : "out/forest-a-regions.png"));
const grid = brief.composition.grid, heights = brief.composition.heights;
const D = grid.length, W = grid[0].length;
const TB = 0.35, P = 0.8;

const IW = 480, IH = Math.round(IW * 1.4);
const { data, info } = await sharp(art).greyscale().resize(IW, IH, { fit: "fill" }).blur(1.2).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const L = new Float32Array(w * h), GX = new Float32Array(w * h), GY = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) L[i] = data[i] / 255;
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const i = y * w + x;
  GX[i] = Math.abs(L[i + 1] - L[i - 1]);
  GY[i] = Math.abs(L[i + w] - L[i - w]);
}
const boxMean = (A, x0, y0, x1, y1) => {
  let s = 0, n = 0;
  for (let y = Math.max(1, Math.floor(y0)); y < Math.min(h - 1, Math.ceil(y1)); y++) for (let x = Math.max(1, Math.floor(x0)); x < Math.min(w - 1, Math.ceil(x1)); x++) { s += A[y * w + x]; n++; }
  return n ? s / n : 0;
};

const rowLum = [];
for (let y = 0; y < h; y++) rowLum.push(boxMean(L, 0, y, w, y + 1));
const smooth = rowLum.map((_, y) => { let s = 0, n = 0; for (let k = -12; k <= 12; k++) if (rowLum[y + k] != null) { s += rowLum[y + k]; n++; } return s / n; });
const topMean = smooth.slice(0, h * 0.35).reduce((a, b) => a + b, 0) / Math.floor(h * 0.35);
const botMean = smooth.slice(h * 0.7).reduce((a, b) => a + b, 0) / (h - Math.ceil(h * 0.7));
const mid = (topMean + botMean) / 2;
let hy = 0.5, best = 0;
for (let y = Math.floor(h * 0.35); y < h * 0.8; y++) {
  const drop = (smooth[y - 20] ?? smooth[0]) - (smooth[y + 20] ?? smooth[h - 1]);
  if (drop > best) { best = drop; hy = y / h; }
}

const N = W + D;
const depthToY = (t) => (t < TB ? (t / TB) * hy : hy + Math.pow((t - TB) / (1 - TB), 1 / P) * (1 - hy));
const yToDepth = (iy) => (iy < hy ? (iy / hy) * TB : TB + Math.pow((iy - hy) / (1 - hy), P) * (1 - TB));
const cellPoint = (x, z) => { const cx = x + 0.5, cz = z + 0.5; return { ix: (cx - cz + D) / N, t: (cx + cz) / N }; };
const cellRect = (x, z) => {
  const { ix, t } = cellPoint(x, z);
  return [(ix - 0.75 / N) * w, depthToY(Math.max(0, t - 0.5 / N)) * h, (ix + 0.75 / N) * w, depthToY(Math.min(1, t + 0.5 / N)) * h];
};
const imgToCellF = (ix, iy) => { const u = ix * N - D, v = yToDepth(iy) * N; return [(u + v) / 2, (v - u) / 2]; };
const imgToCell = (ix, iy) => imgToCellF(ix, iy).map((c, i) => Math.max(0, Math.min((i ? D : W) - 1, Math.floor(c))));

const SW = 96, SH = Math.round(SW * 1.4), sx = w / SW, sy = h / SH;
const swirl = new Float32Array(SW * SH);
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const gx = boxMean(GX, x * sx - sx, y * sy - sy, x * sx + 2 * sx, y * sy + 2 * sy);
  const gy = boxMean(GY, x * sx - sx, y * sy - sy, x * sx + 2 * sx, y * sy + 2 * sy);
  swirl[y * SW + x] = Math.min(gx, gy) * (1 - Math.abs(gx - gy) / (gx + gy + 1e-6));
}
const sorted = [...swirl].sort((a, b) => b - a), thr = sorted[Math.floor(sorted.length * 0.14)];
const lab = new Int32Array(SW * SH).fill(-1), comps = [];
for (let i = 0; i < SW * SH; i++) {
  if (lab[i] >= 0 || swirl[i] < thr) continue;
  const c = { id: comps.length, px: [] }, q = [i];
  lab[i] = c.id;
  while (q.length) {
    const j = q.pop(), x = j % SW, y = (j / SW) | 0;
    c.px.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const X = x + dx, Y = y + dy, k = Y * SW + X;
      if (X >= 0 && Y >= 0 && X < SW && Y < SH && lab[k] < 0 && swirl[k] >= thr) { lab[k] = c.id; q.push(k); }
    }
  }
  comps.push(c);
}
comps.sort((a, b) => b.px.length - a.px.length);
const blobInfo = (c) => {
  const xs = c.px.map((p) => p[0]), ys = c.px.map((p) => p[1]);
  const bbox = [Math.min(...xs) / SW, Math.min(...ys) / SH, (Math.max(...xs) + 1) / SW, (Math.max(...ys) + 1) / SH];
  const yMax = Math.max(...ys), low = c.px.filter((p) => p[1] >= yMax - SH * 0.08).map((p) => p[0]).sort((a, b) => a - b);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length / SW, cy = ys.reduce((a, b) => a + b, 0) / ys.length / SH;
  return { bbox: bbox.map((v) => +v.toFixed(3)), centroid: [+cx.toFixed(3), +cy.toFixed(3)], foot: [+((low[low.length >> 1] + 0.5) / SW).toFixed(3), +((yMax + 1) / SH).toFixed(3)], pixels: c.px.length };
};
const main = comps[0];
const core = blobInfo(main);
let mb = core.bbox;
for (const c of comps.slice(1)) {
  const b = blobInfo(c).bbox, pad = 0.03;
  if (c.px.length < main.px.length * 0.02) continue;
  const cx = (b[0] + b[2]) / 2;
  if (cx > core.bbox[0] - pad && cx < core.bbox[2] + pad && b[1] < mb[3] + pad && b[3] > mb[1] - pad) { main.px.push(...c.px); c.merged = true; mb = blobInfo(main).bbox; }
}
const rest = comps.filter((c) => c !== main && !c.merged);
const legX = Math.round(core.foot[0] * w);
let legY = Math.round(core.foot[1] * h);
while (legY < h - 4) {
  const e = boxMean(GX, legX - w * 0.05, legY, legX + w * 0.05, legY + 4), l = boxMean(L, legX - w * 0.05, legY, legX + w * 0.05, legY + 4);
  if (e < thr * 0.9 || l > 0.62) break;
  legY += 4;
}
const figBlob = { ...blobInfo(main), foot: [+(legX / w).toFixed(3), +(legY / h).toFixed(3)] };
const focal = brief.composition.focal;
const planToCell = (u, t) => [Math.min(W - 1, Math.floor(u * W)), Math.min(D - 1, Math.floor(t * D))];
const focalPt = concept ? [(focal.x + 0.5) / W, (focal.z + 0.5) / D] : figBlob.foot;
const footCell = concept ? planToCell(...focalPt) : imgToCell(...focalPt);
const fNear = concept ? grid.flatMap((row, z) => [...row].map((g, x) => [g, x, z])).filter(([g, x, z]) => g === "F" && Math.abs(x - focal.x) <= 1 && Math.abs(z - focal.z) <= 1) : [];
const footF = concept ? [Math.min(...fNear.map((f) => f[1])) + 1, Math.min(...fNear.map((f) => f[2])) + 1] : imgToCellF(...focalPt);
const figAnchor = [Math.max(1, Math.min(W - 3, Math.round(footF[0]) - 1)), Math.max(1, Math.min(D - 3, Math.round(footF[1]) - 1))];
const figCells = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dz]) => [figAnchor[0] + dx, figAnchor[1] + dz]);
const isFig = (x, z) => figCells.some(([a, b]) => a === x && b === z);

const tailPx = main.px.filter(([x]) => x / SW > core.centroid[0] + 0.12);
const tail = tailPx.length ? { x: tailPx.reduce((a, p) => a + p[0], 0) / tailPx.length / SW, top: Math.min(...tailPx.map((p) => p[1])) / SH, pixels: tailPx.length } : null;

const F = [];
for (let z = 0; z < D; z++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const r = cellRect(x, z), { ix, t } = cellPoint(x, z);
    const lum = boxMean(L, ...r), gx = boxMean(GX, ...r), gy = boxMean(GY, ...r);
    const col = [(ix - 1 / N) * w, 0, (ix + 1 / N) * w, hy * h * 1.15];
    const cgx = boxMean(GX, ...col), cgy = boxMean(GY, ...col);
    const low = [(ix - 1 / N) * w, hy * h, (ix + 1 / N) * w, (hy + 0.25 * (1 - hy)) * h];
    row.push({ ix, t, lum, gx, gy, edge: gx + gy, trunk: cgx / (cgy + 1e-6), dark: 1 - boxMean(L, ...low) });
  }
  F.push(row);
}
const all = F.flat(), ground = all.filter((c) => c.t >= TB), back = all.filter((c) => c.t < TB + 0.08);
const q = (arr, p) => { const v = [...arr].sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const lumHi = q(ground.map((c) => c.lum), 0.7), edgeLo = q(ground.map((c) => c.edge), 0.5), edgeHi = q(ground.map((c) => c.edge), 0.68);
const trunkHi = q(all.map((c) => c.trunk), 0.5), darkHi = q(all.map((c) => c.dark), 0.55), mistHi = q(back.map((c) => c.lum), 0.45);
const invented = !!brief.concept?.variant;
const RIM_EXP = 2.2, RIM_KEEP = invented ? 1.3 : concept ? 1.08 : 0.95, RIM_NOISE = invented ? 0 : concept ? 0.35 : 0.5, WALL = 0.2, PATH_SHARE = 0.42, aboveLum = q(all.filter((c) => depthToY(c.t) < hy).map((c) => c.lum), 0.6);

const cells = [];
for (let z = 0; z < D; z++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const f = F[z][x];
    const gz = concept ? z : Math.min(D - 1, Math.floor(depthToY(f.t) * D)), gxI = concept ? x : Math.min(W - 1, Math.floor(f.ix * W));
    const code = grid[gz][gxI], prior = +heights[gz][gxI];
    const side = Math.min(f.ix, 1 - f.ix);
    const edgeCol = side < WALL || (side < WALL + 0.06 && code === "T");
    const isBack = f.t < TB;
    const pathScore = (f.lum - lumHi) * 3 - (f.edge - edgeLo) * 6 + (code === "P" ? 0.35 : 0) - (isBack ? 1 : 0);
    let hgt = 1;
    if (edgeCol && (f.trunk >= trunkHi || f.dark >= darkHi || code === "T")) hgt = 2;
    if (side < 0.1 && f.dark >= darkHi) hgt = 3;
    if (isBack && (code === "T" || f.trunk >= trunkHi)) hgt = Math.max(hgt, 2);
    if (f.t < TB * 0.45 && hgt >= 2) hgt = 3;
    if (concept) {
      const iyC = depthToY(f.t), mist = hgt >= 0 && iyC < hy && f.lum >= mistHi;
      const ch = code === "W" || code === "V" ? 0 : Math.max(1, Math.min(3, prior || 1));
      row.push({ h: ch, s: code === "W" ? "water" : code === "V" ? "none" : code === "P" ? "path" : "ground", code, motif: isFig(x, z) ? ["figure"] : mist && ch === 1 && code !== "P" ? ["mist"] : [], ix: +f.ix.toFixed(3), iy: +iyC.toFixed(3), lum: +f.lum.toFixed(3), edge: +f.edge.toFixed(3), path: code === "P" ? 1 : 0, prior: code + prior });
      continue;
    }
    const motif = [];
    if (isFig(x, z)) motif.push("figure");
    else if (hgt >= 2) motif.push("trunk");
    const iy = depthToY(f.t), above = iy < hy;
    if (hgt === 1 && !motif.length && above) {
      if (f.gx > f.gy * 1.1 && f.lum < aboveLum) motif.push("trunk");
      else if (f.lum >= mistHi) motif.push("mist");
    }
    if (hgt === 1 && !motif.length && !above && f.edge >= edgeHi && f.lum < lumHi) motif.push(f.gy > f.gx * 1.25 && f.ix < 0.5 ? "log" : "root");
    row.push({ h: hgt, s: pathScore > 0 && hgt === 1 ? "path" : "ground", motif, ix: +f.ix.toFixed(3), iy: +depthToY(f.t).toFixed(3), lum: +f.lum.toFixed(3), edge: +f.edge.toFixed(3), trunk: +f.trunk.toFixed(2), dark: +f.dark.toFixed(2), path: +pathScore.toFixed(2), prior: code + prior });
  }
  cells.push(row);
}
const lumMed = q(all.map((c) => c.lum), 0.5), lumSpan = q(all.map((c) => c.lum), 0.9) - q(all.map((c) => c.lum), 0.1) || 1;
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  const c = cells[z][x];
  const nx = (x + 0.5 - W / 2) / (W / 2), nz = (z + 0.5 - D / 2) / (D / 2);
  const r = Math.pow(Math.abs(nx) ** RIM_EXP + Math.abs(nz) ** RIM_EXP, 1 / RIM_EXP);
  const n = (c.lum - lumMed) / lumSpan;
  c.rim = +r.toFixed(3);
  if (isFig(x, z)) continue;
  if (concept && c.s === "water") { if (r > 1.3) Object.assign(c, { h: 0, s: "none", motif: [] }); continue; }
  if (r > RIM_KEEP - RIM_NOISE * n) { c.h = 0; c.s = "none"; c.motif = []; }
}
const landish = (c) => c && (c.h > 0 || c.s === "water");
for (let pass = 0; pass < 3; pass++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  const c = cells[z][x];
  if (landish(c) && !isFig(x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => landish(cells[z + dz]?.[x + dx])).length < 2) Object.assign(c, { h: 0, s: "none", motif: [] });
}
const snapshot = cells.map((row) => row.map((c) => c.h));
const briefHas3 = heights.some((r) => r.includes("3"));
const need3 = concept ? 4 : 3;
if (!concept || !briefHas3) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (snapshot[z][x] === 2 && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => (snapshot[z + dz]?.[x + dx] ?? 0) >= 2).length >= need3) cells[z][x].h = 3;
const near = (x, z, d) => figCells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= d);
const knollH = concept ? Math.max(1, Math.min(3, +heights[focal.z][focal.x] || 1)) : 2;
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (near(x, z, 1)) {
  const c = cells[z][x];
  if (concept && !isFig(x, z) && (c.s === "path" || (c.h === 0 && !near(x, z, 0)))) { if (c.s === "path") { c.h = knollH; c.knoll = 1; } continue; }
  c.h = knollH; c.s = "ground"; c.knoll = 1; c.motif = isFig(x, z) ? ["figure"] : [];
}
{
  const seen = new Set(), stack = [figCells[0].join(",")];
  while (stack.length) {
    const kk = stack.pop();
    if (seen.has(kk)) continue;
    seen.add(kk);
    const [x, z] = kk.split(",").map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = cells[z + dz]?.[x + dx]; if (c && c.h > 0) stack.push(x + dx + "," + (z + dz)); }
  }
  const wetOk = (x, z) => cells[z][x].s === "water" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has(x + dx + "," + (z + dz)) || (cells[z + dz]?.[x + dx]?.s === "water"));
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (!seen.has(x + "," + z) && !(concept && wetOk(x, z))) Object.assign(cells[z][x], { h: 0, s: "none", motif: [] });
}
const wetSeen = new Set(), wq = [];
if (concept) {
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (cells[z][x].s === "water" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => (cells[z + dz]?.[x + dx]?.h ?? 0) > 0)) { wetSeen.add(x + "," + z); wq.push([x, z]); }
  while (wq.length) { const [x, z] = wq.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = x + dx + "," + (z + dz); if (cells[z + dz]?.[x + dx]?.s === "water" && !wetSeen.has(kk)) { wetSeen.add(kk); wq.push([x + dx, z + dz]); } } }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (cells[z][x].s === "water" && !wetSeen.has(x + "," + z)) Object.assign(cells[z][x], { h: 0, s: "none", motif: [] });
}
const isRim = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => (cells[z + dz]?.[x + dx]?.h ?? 0) === 0);
const pathThr = q(cells.flat().filter((c) => c.h === 1 && c.iy >= hy).map((c) => c.path), 1 - PATH_SHARE);
console.log("path threshold", pathThr.toFixed(2));
const pathSet = new Set();
const maxScore = Math.max(...cells.flat().map((c) => c.path));
const dist = new Map(), prev = new Map(), open = [];
const isP = (c) => c.code === "P";
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (isRim(x, z) && depthToY(cellPoint(x, z).t) >= hy && (concept ? cells[z][x].h > 0 : cells[z][x].h === 1) && !figCells.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) < 5)) { const d0 = concept && !isP(cells[z][x]) ? 4 : 0; dist.set(x + "," + z, d0); open.push([d0, x, z]); }
const goal = concept ? (x, z) => cells[z][x].h > 0 && !isFig(x, z) && (cells[z][x].knoll || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => isFig(x + dx, z + dz))) : (x, z) => cells[z][x].h === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => cells[z + dz]?.[x + dx]?.knoll && !isFig(x + dx, z + dz));
let end = null;
while (open.length) {
  open.sort((a, b) => a[0] - b[0]);
  const [d, x, z] = open.shift();
  if (d > dist.get(x + "," + z)) continue;
  if (goal(x, z)) { end = [x, z]; break; }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const X = x + dx, Z = z + dz, c = cells[Z]?.[X];
    if (!c || isFig(X, Z) || (concept ? c.h === 0 || Math.abs(c.h - cells[z][x].h) > 1 : c.h !== 1)) continue;
    const nd = d + 1 + (concept ? (isP(c) ? 0 : 3) + Math.abs(c.h - cells[z][x].h) * 2 : Math.max(0, maxScore - c.path) * 1.5), kk = X + "," + Z;
    if (nd < (dist.get(kk) ?? Infinity)) { dist.set(kk, nd); prev.set(kk, x + "," + z); open.push([nd, X, Z]); }
  }
}
const route = [];
for (let kk = end && end.join(","); kk; kk = prev.get(kk)) route.push(kk);
const grow = concept ? [] : [...route];
if (concept) { for (const kk of route) pathSet.add(kk); for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (cells[z][x].h > 0 && isP(cells[z][x]) && !isFig(x, z)) pathSet.add(x + "," + z); }
while (grow.length) {
  const kk = grow.pop();
  if (pathSet.has(kk)) continue;
  pathSet.add(kk);
  const [x, z] = kk.split(",").map(Number);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = cells[z + dz]?.[x + dx]; if (c && c.h === 1 && c.path > pathThr && !isFig(x + dx, z + dz) && x + dx + z + dz >= figAnchor[0] + figAnchor[1] - 1) grow.push(x + dx + "," + (z + dz)); }
}
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (cells[z][x].s !== "water" || !concept) cells[z][x].s = cells[z][x].h === 0 ? (cells[z][x].s === "water" && concept ? "water" : "none") : pathSet.has(x + "," + z) ? "path" : "ground";
const gridMap = grid.map((row, gz) => [...row].map((_, gx) => (concept ? planToCell : imgToCell)((gx + 0.5) / W, (gz + 0.5) / D)));
const wispCell = concept ? null : (() => {
  const c0 = tail ? imgToCell(tail.x, figBlob.foot[1] - 0.04) : [figAnchor[0] + 2, figAnchor[1]];
  const order = [];
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) order.push([dx, dz, Math.abs(dx) + Math.abs(dz)]);
  order.sort((a, b) => a[2] - b[2]);
  for (const [dx, dz] of order) {
    const x = c0[0] + dx, z = c0[1] + dz, c = cells[z]?.[x];
    const open = [[1, 0], [0, 1], [1, 1]].every(([a, b]) => (cells[z + b]?.[x + a]?.h ?? 0) <= 1) && !isRim(x, z);
    if (c && c.h === 1 && !c.motif.length && !c.knoll && open) { c.motif.push("wisp"); return [x, z]; }
  }
  return null;
})();

const out = {
  source: path.relative(root, art), brief: path.relative(root, briefPath), size: [W, D],
  mapping: concept ? { plan: "the brief grid is a plan: grid[z][x] is level cell (x,z); row 0 is the back-right edge on screen, column 0 the back-left edge", horizon: +hy.toFixed(3) } : { horizon: +hy.toFixed(3), backDepth: TB, power: P, note: "level cell (x,z) is read as the isometric screen sees it: lateral (x-z) spans the artwork width, depth (x+z) runs from the top of the artwork (back corner) to its bottom (front corner); depth below backDepth samples the band above the horizon, deeper cells invert a mild perspective t^power" },
  concept,
  figure: { ...figBlob, focal: concept ? { grid: [focal.x, focal.z], point: focalPt.map((v) => +v.toFixed(3)) } : undefined, footCell, anchor: figAnchor, cells: figCells },
  gridMap,
  wisp: { tail, cell: wispCell },
  cells,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));

const sym = (c) => c.s === "water" ? "~" : c.motif.includes("figure") ? "F" : c.motif.includes("trunk") ? "T" : c.motif.includes("log") ? "L" : c.motif.includes("root") ? "r" : c.motif.includes("mist") ? "m" : c.motif.includes("wisp") ? "w" : c.s === "path" ? "P" : ".";
console.log(`horizon ${hy.toFixed(3)}  figure foot ${figBlob.foot} -> cell ${footCell}, anchor ${figAnchor}  wisp ${wispCell}`);
for (let z = 0; z < D; z++) console.log(cells[z].map((c) => c.h).join("") + "  " + cells[z].map(sym).join(""));

const AW = 640, AH = Math.round(AW * 2048 / 1454);
const svg = [];
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  const [x0, y0, x1, y1] = cellRect(x, z).map((v, i) => (i % 2 ? v / h * AH : v / w * AW));
  const c = cells[z][x], s = sym(c);
  const fill = { "~": "#3ba1ab", F: "#ff831d", T: "#472d26", L: "#a26843", r: "#8c5432", m: "#c8d6e5", w: "#ffe082", P: "#e8dab1", ".": "none" }[s];
  svg.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${fill}" fill-opacity="0.45" stroke="#00ffbf" stroke-width="0.6"/>`);
  svg.push(`<text x="${x0 + 2}" y="${y0 + 11}" font-size="10" fill="#ff0" font-family="monospace">${c.h}${s}</text>`);
}
svg.push(`<line x1="0" x2="${AW}" y1="${hy * AH}" y2="${hy * AH}" stroke="#f0f" stroke-width="2"/>`);
const [bx0, by0, bx1, by1] = figBlob.bbox;
svg.push(`<rect x="${bx0 * AW}" y="${by0 * AH}" width="${(bx1 - bx0) * AW}" height="${(by1 - by0) * AH}" fill="none" stroke="#f00" stroke-width="2"/>`);
svg.push(`<circle cx="${figBlob.foot[0] * AW}" cy="${figBlob.foot[1] * AH}" r="6" fill="#f00"/>`);
fs.mkdirSync(path.dirname(debugPath), { recursive: true });
await sharp(art).resize(AW, AH, { fit: "fill" }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}">${svg.join("")}</svg>`) }]).png().toFile(debugPath);
console.log(`wrote ${path.relative(root, outPath)} and ${path.relative(root, debugPath)}`);
