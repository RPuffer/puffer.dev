import fs from "node:fs";
import path from "node:path";
import { registerCatalog, CATALOG } from "../../core/catalog.js";
import { checkLevel, frameView, reachability } from "../../core/procgen.js";
import { prepareLevel, DIRS } from "../../core/level.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const regions = JSON.parse(fs.readFileSync(path.resolve(root, flag("--regions", "pipeline/a-transcribe/regions.json")), "utf8"));
const brief = JSON.parse(fs.readFileSync(path.resolve(root, regions.brief), "utf8"));
const name = flag("--name", "forest-a");
const outPath = path.resolve(root, flag("--out", `levels/${name}.json`));
const piecesRel = `pieces/${name}.js`;

const mod = await import(path.resolve(root, "3d", piecesRel));
const T = brief.palette.translation;
const palette = {
  grass: T.grass, sand: T.sand, stone: T.stone, cliffUpper: T.cliffUpper, cliffLower: T.cliffLower,
  dirt: { top: "#bcae95", patch: "#6f7a4e", mottle: "#b1a38b", border: "#8a7d66", path: "#c8bca4" },
  wood: T.wood, trunk: T.trunk, treeLime: T.treeLime, treeTeal: T.treeTeal, rock: T.rock, treeMint: T.treeMint, treeLeaf: T.treeLeaf,
  bark: ["#9a8fa0", "#7b7185", "#5f5669"],
  rootWood: ["#80646f", "#634d58", "#4b3a45"],
  mist: ["#b9c3d6", "#9aa5bc", "#808ba3"],
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
const cells = R.map((row) => row.map((c) => ({ h: c.h, s: c.s === "path" ? "dirt" : "grass" })));
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

const leanCells = (brief.motifs.find((m) => /lean/.test(m.name))?.cells || []).filter(([x, z]) => has(x, z, "trunk"));
const clear = new Set();
const tt = brief.biome?.trees?.types || [], roundMax = Math.round((tt.find((t) => t.type === "tree-round")?.weight || 0) * 16);
for (const [x, z] of leanCells.slice(0, 1)) if (put({ t: "leaning-trunk", x, z, v: 0, rot: 0, ox: -0.1 })) for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) if (dx - dz >= -3 && dx - dz <= 1 && dx + dz >= -5 && dx + dz <= 3) clear.add(k(x + dx, z + dz));

const innerEdge = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => cells[z + dz]?.[x + dx] && cells[z + dz][x + dx].h < cells[z][x].h);
const onEdge = (x, z) => x === 0 || z === 0 || x === W - 1 || z === D - 1;
let rounds = 0;
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  if (rounds >= roundMax || !has(x, z, "trunk") || used.has(k(x, z)) || clear.has(k(x, z)) || onEdge(x, z) || !innerEdge(x, z) || hash(x, z, 11) > 0.35) continue;
  let near = false;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (decor.some((d) => d.t === "tree-round" && d.x === x + dx && d.z === z + dz)) near = true;
  if (near) continue;
  if (put({ t: "tree-round", x, z, v: Math.floor(hash(x, z, 1) * 3) })) { rounds++; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) clear.add(k(x + dx, z + dz)); }
}
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  if (!has(x, z, "trunk") || used.has(k(x, z)) || clear.has(k(x, z))) continue;
  const keep = hash(x, z) < (innerEdge(x, z) ? 0.8 : 0.62);
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
      if (!lo || !hi || lo.h !== c.h - 1 || hi.h !== c.h || lo.s === "ramp" || !miss.has(k(x - dx, z - dz)) || !reached(x + dx, z + dz)) continue;
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
  light: { dir: [-0.35, 1, 0.55], ambient: 0.82, sun: 0.26 },
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
