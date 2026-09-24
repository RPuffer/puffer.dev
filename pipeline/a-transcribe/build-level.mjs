import fs from "node:fs";
import path from "node:path";
import { registerCatalog, CATALOG, PALETTE as CORE } from "../../core/catalog.js";
import { checkLevel, frameView, reachability } from "../../core/procgen.js";
import { prepareLevel, DIRS } from "../../core/level.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const conceptArg = flag("--concept", null);
const regions = JSON.parse(fs.readFileSync(path.resolve(root, flag("--regions", conceptArg ? `pipeline/a-transcribe/regions-${conceptArg}.json` : "pipeline/a-transcribe/regions.json")), "utf8"));
const brief = JSON.parse(fs.readFileSync(path.resolve(root, regions.brief), "utf8"));
if (brief.concept && brief.concept.name !== "literal") {
  const { build } = await import("./concept-level.mjs");
  await build({ root, flag, has: (k) => args.includes(k), regions, brief });
  process.exit(process.exitCode ?? 0);
}
const name = flag("--name", "forest-a");
const outPath = path.resolve(root, flag("--out", `levels/${name}.json`));
const piecesRel = `pieces/${name}.js`;

const mod = await import(path.resolve(root, "3d", piecesRel));
const T = brief.palette.translation;
const hexMix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const mixAll = (a, b, t) => typeof a === "string" ? hexMix(a, b, t) : Array.isArray(a) ? a.map((v, i) => mixAll(v, b[i] ?? b[b.length - 1], t)) : Object.fromEntries(Object.entries(a).map(([kk, v]) => [kk, b?.[kk] ? mixAll(v, b[kk], t) : v]));
const LIFT = 0.45;
const palette = {
  grass: mixAll(T.grass, CORE.grass, LIFT), sand: mixAll(T.sand, CORE.sand, LIFT), stone: mixAll(T.stone, CORE.stone, 0.3),
  cliffUpper: mixAll(T.cliffUpper, CORE.cliffUpper, 0.35), cliffLower: mixAll(T.cliffLower, CORE.cliffLower, 0.35),
  dirt: { top: "#d9c9a0", patch: "#8fae63", mottle: "#cdbd93", border: "#b39a62", path: "#e6d6ad" },
  wood: mixAll(T.wood, CORE.wood, 0.3), trunk: mixAll(T.trunk, CORE.trunk, 0.5), rock: mixAll(T.rock, CORE.rock, 0.3),
  treeMint: mixAll(T.treeMint, CORE.treeMint, LIFT), treeLeaf: mixAll(T.treeLeaf, CORE.treeLeaf, LIFT), treeLime: mixAll(T.treeLime, CORE.treeLime, LIFT), treeTeal: mixAll(T.treeTeal, CORE.treeTeal, LIFT),
  bark: ["#a58f93", "#86707a", "#6a5662"],
  rootWood: ["#8c6a6c", "#6e5258", "#553f47"],
  mist: ["#dfe8f5", "#c9d5e6", "#b3c0d4"],
  spirit: ["#ff9a3c", "#f06a1e", "#c9481a"],
  ember: ["#ffcf4a", "#f5a51d", "#dd7a12"],
  flame: ["#ffe082", "#ffb31d", "#ff831d"],
  beak: ["#fff4d6", "#f2dfb0", "#d8bf86"],
  spiritEye: "#2a2230",
  hero: { shirt: ["#ff9a3c", "#ff9a3c", "#c9481a"] },
};
const reg = mod.register({ palette });
registerCatalog(reg.catalog);

const [W, D] = regions.size;
const R = regions.cells;
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cells = R.map((row) => row.map((c) => (c.h === 0 ? { h: 0, s: "none" } : { h: c.h, s: c.s === "path" ? "dirt" : "grass" })));
const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
const decor = [], used = new Set(), k = (x, z) => `${x},${z}`;
const put = (d) => {
  const spec = CATALOG[d.t], [fw, fd] = (d.rot || 0) % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
  for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) if (!inb(d.x + dx, d.z + dz) || used.has(k(d.x + dx, d.z + dz))) return false;
  for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) used.add(k(d.x + dx, d.z + dz));
  decor.push({ v: 0, rot: 0, ox: 0, oz: 0, ...d });
  return true;
};
const has = (x, z, m) => R[z]?.[x]?.motif.includes(m);

const fig = regions.figure;
const figRot = { w: 0, s: 1, e: 2, n: 3 }[brief.creatures?.[0]?.facing || "w"] ?? 0;
put({ t: "fire-bird", x: fig.anchor[0], z: fig.anchor[1], rot: figRot });
const figSet = new Set(fig.cells.map(([x, z]) => k(x, z)));

const ramps = [];
const tryRamp = (x, z) => {
  const c = cells[z][x];
  for (const d of ["s", "e", "w", "n"]) {
    const [dx, dz] = DIRS[d], lo = cells[z + dz]?.[x + dx], hi = cells[z - dz]?.[x - dx];
    if (!lo || !hi || lo.h !== c.h - 1 || hi.h !== c.h || lo.s === "ramp" || lo.s === "none" || used.has(k(x + dx, z + dz)) || figSet.has(k(x - dx, z - dz))) continue;
    cells[z][x] = { h: c.h, s: "ramp", d, m: "stone" };
    ramps.push([x, z, d]);
    return true;
  }
  return false;
};
const knollRing = [];
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (R[z][x].knoll && !figSet.has(k(x, z))) {
  const toPath = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => cells[z + dz]?.[x + dx]?.s === "dirt");
  knollRing.push([x, z, (toPath ? 10 : 0) + x + z]);
}
knollRing.sort((a, b) => b[2] - a[2]);
for (const [x, z] of knollRing) if (tryRamp(x, z)) break;

const leanTarget = args.includes("--lean") ? brief.motifs.find((m) => /lean/.test(m.name))?.cells?.[0] : null;
const clear = new Set();
const tt = brief.biome?.trees?.types || [], roundMax = Math.round((tt.find((t) => t.type === "tree-round")?.weight || 0) * 24);
if (leanTarget) {
  const ok = (x, z) => {
    const c = cells[z]?.[x];
    if (!c || c.h === 0 || c.s !== "grass" || used.has(k(x, z)) || R[z][x].knoll) return false;
    for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const n = cells[z + dz]?.[x + dx]; if (!n || n.h === 0 || n.h > c.h) return false; }
    return true;
  };
  const cand = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (ok(x, z)) cand.push([x, z, Math.abs(x - leanTarget[0]) + Math.abs(z - leanTarget[1])]);
  cand.sort((a, b) => a[2] - b[2]);
  if (cand.length) {
    const [x, z] = cand[0];
    if (put({ t: "leaning-trunk", x, z, v: 0, rot: 0 })) for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) if (dx - dz >= -3 && dx - dz <= 1 && dx + dz >= -5 && dx + dz <= 3) clear.add(k(x + dx, z + dz));
  }
}

const innerEdge = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => cells[z + dz]?.[x + dx] && cells[z + dz][x + dx].h < cells[z][x].h);
const onEdge = (x, z) => x === 0 || z === 0 || x === W - 1 || z === D - 1;
let rounds = 0;
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  if (rounds >= roundMax || !has(x, z, "trunk") || used.has(k(x, z)) || clear.has(k(x, z)) || hash(x, z, 11) > 0.75) continue;
  if ([[1, 0], [0, 1], [1, 1]].some(([dx, dz]) => (cells[z + dz]?.[x + dx]?.h ?? 0) === 0)) continue;
  let near = false;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (decor.some((d) => (d.t === "tree-round" || d.t === "tree-pine") && d.x === x + dx && d.z === z + dz)) near = true;
  if (near) continue;
  if (put({ t: hash(x, z, 12) < 0.5 ? "tree-round" : "tree-pine", x, z, v: Math.floor(hash(x, z, 1) * 3) })) { rounds++; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) clear.add(k(x + dx, z + dz)); }
}
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  if (!has(x, z, "trunk") || used.has(k(x, z)) || clear.has(k(x, z))) continue;
  const keep = hash(x, z) < (innerEdge(x, z) ? 0.75 : 0.55);
  if (keep) put({ t: "bare-trunk", x, z, v: Math.floor(hash(x, z, 1) * 3), ox: +((hash(x, z, 2) - 0.5) * 0.3).toFixed(2), oz: +((hash(x, z, 3) - 0.5) * 0.3).toFixed(2) });
}

const wisp = regions.wisp.cell;
if (wisp) put({ t: "flame-wisp", x: wisp[0], z: wisp[1], ox: 0.1, oz: -0.1 });

const logs = [];
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (has(x, z, "log")) logs.push([x, z]);
logs.sort((a, b) => R[b[1]][b[0]].edge - R[a[1]][a[0]].edge);
let nLogs = 0;
for (const [x, z] of logs) {
  if (nLogs >= 3) break;
  if (cells[z][x].s === "dirt") continue;
  if (put({ t: "fallen-log", x, z, rot: hash(x, z, 4) < 0.5 ? 0 : 1, v: nLogs % 2 })) nLogs++;
}
for (const [x, z] of logs) if (!used.has(k(x, z)) && cells[z][x].s !== "dirt") put({ t: "root-tangle", x, z, rot: Math.floor(hash(x, z, 5) * 4), v: 1 });

for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  if (has(x, z, "root") && cells[z][x].s !== "ramp") put({ t: "root-tangle", x, z, rot: Math.floor(hash(x, z, 6) * 4), v: Math.floor(hash(x, z, 7) * 2) });
  if (has(x, z, "mist") && cells[z][x].s !== "ramp") put({ t: "mist-bank", x, z, v: Math.floor(hash(x, z, 8) * 2) });
}

const front = [];
for (let z = D - 1; z >= 0; z--) for (let x = 0; x < W; x++) if (cells[z][x].s === "dirt" && cells[z][x].h === 1 && !used.has(k(x, z))) front.push([x, z, Math.abs(x - W / 2) + (D - 1 - z) * 2]);
front.sort((a, b) => a[2] - b[2]);
const spawn = front[0].slice(0, 2);

const L = { name, size: [W, D], cells, decor, spawn };
const blockedNow = () => { const b = new Set(); for (const d of decor) if (!CATALOG[d.t].passable) { const [fw, fd] = (d.rot || 0) % 2 ? [CATALOG[d.t].footprint[1], CATALOG[d.t].footprint[0]] : CATALOG[d.t].footprint; for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) b.add(k(d.x + dx, d.z + dz)); } return b; };
let fixes = 0;
for (let pass = 0; pass < 40; pass++) {
  const r = reachability({ ...L, blocked: blockedNow() });
  if (!r.missing.length) break;
  const reached = (x, z) => !r.missing.some(([a, b]) => a === x && b === z) && !blockedNow().has(k(x, z));
  const miss = new Set(r.missing.map(([x, z]) => k(x, z)));
  let done = false;
  for (const [x, z] of r.missing) {
    const c = cells[z][x];
    if (c.s === "ramp") continue;
    for (const d of ["s", "e", "w", "n"]) {
      const [dx, dz] = DIRS[d], lo = cells[z + dz]?.[x + dx], hi = cells[z - dz]?.[x - dx];
      if (!lo || !hi || lo.h !== c.h - 1 || lo.s === "none" || hi.h !== c.h || lo.s === "ramp" || !miss.has(k(x - dx, z - dz)) || !reached(x + dx, z + dz)) continue;
      const i = decor.findIndex((e) => e.x === x && e.z === z);
      if (i >= 0) { decor.splice(i, 1); used.delete(k(x, z)); }
      cells[z][x] = { h: c.h, s: "ramp", d, m: "stone" };
      ramps.push([x, z, d]);
      done = true; fixes++;
      break;
    }
    if (done) break;
  }
  if (done) continue;
  const [x, z] = r.missing[0];
  const comp = [], seen = new Set([k(x, z)]), st = [[x, z]];
  while (st.length) { const [a, b] = st.pop(); comp.push([a, b]); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = k(a + dx, b + dz); if (miss.has(kk) && !seen.has(kk)) { seen.add(kk); st.push([a + dx, b + dz]); } } }
  if (comp.length <= 4 && comp.every(([a, b]) => cells[b][a].h === cells[z][x].h)) {
    for (const [a, b] of comp) { cells[b][a] = { h: 0, s: "none" }; for (let i = decor.length - 1; i >= 0; i--) if (decor[i].x === a && decor[i].z === b) { decor.splice(i, 1); used.delete(k(a, b)); } }
    fixes++; continue;
  }
  if (cells[z][x].s === "ramp") { cells[z][x] = { h: cells[z][x].h, s: "grass" }; fixes++; continue; }
  const i = decor.findIndex((e) => e.x === x && e.z === z && CATALOG[e.t].passable);
  if (i >= 0) { decor.splice(i, 1); used.delete(k(x, z)); }
  put({ t: "bare-trunk", x, z, v: Math.floor(hash(x, z, 9) * 3) });
  fixes++;
}

const level = {
  name, size: [W, D], cells, decor, spawn,
  bg: brief.biome?.lighting?.bg || T.bg,
  palette: { ...palette, bg: T.bg },
  materials: { ramp: ["stone", "sand", "grass", "dirt"] },
  light: { dir: [-0.35, 1, 0.55], ambient: 0.86, sun: 0.2 },
  pieces: [piecesRel],
};
level.view = frameView(level).view;
const problems = checkLevel(level);
const procgenOnly = problems.filter((p) => /grass share|plateau in/.test(p));
const real = problems.filter((p) => !procgenOnly.includes(p));
try { const P = prepareLevel(JSON.parse(JSON.stringify(level))); if (P.warnings?.length) real.push("prepareLevel: " + P.warnings[0]); } catch (e) { real.push("prepareLevel: " + e.message); }
const reach = reachability({ ...level, blocked: blockedNow() });
fs.writeFileSync(outPath, JSON.stringify(level));
const byType = {};
for (const d of decor) byType[d.t] = (byType[d.t] || 0) + 1;
console.log(`wrote ${path.relative(root, outPath)}: ${W}x${D}, spawn ${spawn}, ramps ${ramps.map((r) => r.join("")).join(" ")}, repairs ${fixes}, reach ${reach.reached}/${reach.total}`);
console.log("decor " + JSON.stringify(byType));
if (procgenOnly.length) console.log("procgen-only rules not applied: " + procgenOnly.join("; "));
console.log(real.length ? "FAIL\n  " + real.join("\n  ") : "PASS: checkLevel + prepareLevel clean");
process.exitCode = real.length ? 1 : 0;
