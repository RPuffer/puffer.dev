import fs from "node:fs";
import { generateLevel, reachability, frameView } from "../../core/procgen.js";
import { registerCatalog, CATALOG, footprintCells } from "../../core/catalog.js";
import { createRng } from "../../core/rng.js";
import { TYPES } from "../../3d/pieces/forest-c.js";
import { ROOT, liftedPalette } from "./lib.mjs";

registerCatalog(TYPES);
const args = process.argv.slice(2);
const flag = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const briefPath = args.find((a) => a.endsWith(".json")) || ROOT + "pipeline/seed/brief.json";
const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
const TUNE = JSON.parse(fs.readFileSync(new URL("layout.tune.json", import.meta.url), "utf8"));
const META = JSON.parse(fs.readFileSync(ROOT + "3d/assets/forest-c/meta.json", "utf8"));
const TALL = new Set(["bare-trunk-tall", "leaning-trunk", "forest-tree", "tree-round", "tree-pine", "fire-bird"]);
const leanCell = (t, rot) => { const l = META[t]?.lean; if (!l || Math.hypot(...l) < 0.2) return null; const a = -rot * Math.PI / 2, x = l[0] * Math.cos(a) + l[1] * Math.sin(a), z = -l[0] * Math.sin(a) + l[1] * Math.cos(a); return Math.abs(x) > Math.abs(z) ? [Math.sign(x), 0] : [0, Math.sign(z)]; };
const LIFTED = (await liftedPalette(brief, TUNE.lift ?? 0)).palette;
const TREE_ALIAS = { "tree-round": "forest-tree" };
const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const key = (x, z) => x + "," + z;

function build(seed) {
  const B = brief.biome, comp = brief.composition;
  const L0 = generateLevel(seed, { water: [0, 0], islets: [0, 0], land: TUNE.land, grass: [0.3, 0.4], rampMax: 0 });
  const [W, D] = L0.size, rng = createRng(`forest-c#${seed}`);
  const land = (x, z) => { const c = L0.cells[z]?.[x]; return !!c && c.h >= 1 && c.s !== "water" && c.s !== "none"; };
  const cells = L0.cells.map((row, z) => row.map((c, x) => (land(x, z) ? { h: 1, s: "grass" } : { h: 0, s: "none" })));
  const isLand = (x, z) => cells[z]?.[x]?.h >= 1;
  const focal = comp.focal, [fw, fd] = TYPES["fire-bird"].footprint;
  const kx = Math.min(W - fw - 1, Math.max(1, focal.x)), kz = Math.min(D - fd - 4, Math.max(1, focal.z - 1));
  for (let dz = -1; dz <= fd + 3; dz++) for (let dx = -1; dx <= fw; dx++) if (!isLand(kx + dx, kz + dz)) cells[kz + dz][kx + dx] = { h: 1, s: "grass" };
  for (let dz = 0; dz <= fd; dz++) for (let dx = 0; dx < fw; dx++) cells[kz + dz][kx + dx] = { h: 2, s: "grass" };
  cells[kz + fd + 1][kx] = { h: 2, s: "ramp", d: "s", m: "grass" };
  const L = { name: "forest-c", size: [W, D], cells, decor: [], blocked: new Set() };
  const walk = (x, z) => isLand(x, z) && cells[z][x].h === 1;
  const front = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (walk(x, z) && (!isLand(x + 1, z) || !isLand(x, z + 1))) front.push([x, z]);
  const goal = [kx, kz + fd + 2];
  front.sort((a, b) => (b[0] * TUNE.frontX + b[1]) - (a[0] * TUNE.frontX + a[1]) || Math.abs(a[0] - kx) - Math.abs(b[0] - kx));
  const entry = front.find(([x, z]) => z > kz + fd + 2 && Math.abs(x - kx) <= TUNE.entrySpread) || front[0];
  const edgeCell = (x, z) => Object.values(DIRS).some(([dx, dz]) => !isLand(x + dx, z + dz));
  const prev = new Map([[key(...goal), null]]), cost = new Map([[key(...goal), 0]]), open = [[0, ...goal]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [c0, x, z] = open.shift();
    if (c0 > cost.get(key(x, z))) continue;
    for (const [dx, dz] of Object.values(DIRS)) {
      const nx = x + dx, nz = z + dz;
      if (!walk(nx, nz)) continue;
      const c1 = c0 + 1 + (edgeCell(nx, nz) && !(nx === entry[0] && nz === entry[1]) ? TUNE.edgeCost : 0) + rng.next() * 0.3;
      if (c1 >= (cost.get(key(nx, nz)) ?? Infinity)) continue;
      cost.set(key(nx, nz), c1); prev.set(key(nx, nz), [x, z]); open.push([c1, nx, nz]);
    }
  }
  let cur = prev.has(key(...entry)) ? entry : null;
  const spawn = cur && prev.get(key(...entry)) ? prev.get(key(...entry)) : entry;
  const path = new Set();
  while (cur) { path.add(key(...cur)); cells[cur[1]][cur[0]].s = "dirt"; cur = prev.get(key(...cur)); }
  path.add(key(kx, kz + fd + 1)); path.add(key(kx, kz + fd)); path.add(key(kx + 1, kz + fd));
  cells[kz + fd][kx].s = "dirt";
  const occ = new Map(), air = new Set();
  const NEAR = [...Object.values(DIRS), [1, 1], [-1, -1]];
  const tallNear = (x, z) => NEAR.some(([dx, dz]) => TALL.has(occ.get(key(x + dx, z + dz))?.t) || air.has(key(x + dx, z + dz)));
  const place = (t, x, z, o = {}) => {
    const spec = CATALOG[t], rot = o.rot || 0, fc = footprintCells(t, x, z, rot);
    if (!fc.every(([cx, cz]) => isLand(cx, cz) && !occ.has(key(cx, cz)) && (o.knoll || cells[cz][cx].h === 1))) return false;
    if (TALL.has(t) && !o.knoll && fc.some(([cx, cz]) => air.has(key(cx, cz)) || (TUNE.spacing && tallNear(cx, cz)) || Object.values(DIRS).some(([dx, dz]) => path.has(key(cx + dx, cz + dz))))) return false;
    const lc = t === "leaning-trunk" && leanCell(t, rot), lk = lc && key(x + lc[0], z + lc[1]);
    if (lc && (isLand(x + lc[0], z + lc[1]) || [[1, 1], [-1, -1], [lc[0] + lc[1], lc[1] + lc[0]]].some(([dx, dz]) => TALL.has(occ.get(key(x + dx, z + dz))?.t)))) return false;
    if (!spec.passable) {
      if (fc.some(([cx, cz]) => path.has(key(cx, cz)) || (cx === spawn[0] && cz === spawn[1]))) return false;
      for (const [cx, cz] of fc) L.blocked.add(key(cx, cz));
      if (reachability({ ...L, spawn }).missing.length) { for (const [cx, cz] of fc) L.blocked.delete(key(cx, cz)); return false; }
    }
    const d = { t, x, z, v: 0, rot, ox: +(o.ox || 0).toFixed(2), oz: +(o.oz || 0).toFixed(2) };
    for (const [cx, cz] of fc) occ.set(key(cx, cz), d);
    if (lc) air.add(lk);
    L.decor.push(d);
    return true;
  };
  const facing = { n: 0, w: 1, s: 2, e: 3 };
  place("fire-bird", kx, kz, { knoll: true, rot: facing[brief.creatures.find((c) => c.name === "fire-bird-spirit")?.facing || "w"] ?? 1 });
  const wisp = brief.creatures.find((c) => c.name === "flame-wisp");
  if (wisp) { const off = [wisp.cell[0] - focal.x, wisp.cell[1] - focal.z]; const cand = [[kx + fw + Math.max(0, off[0] - 1), kz + off[1]], [kx + fw, kz], [kx + fw, kz + 1], [kx - 1, kz]]; cand.some(([x, z]) => place("flame-wisp", x, z, { rot: 1 })); }
  const landCells = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (isLand(x, z)) landCells.push([x, z]);
  const edgeDist = (x, z) => { let d = 9; for (let r = 1; r <= 4 && d === 9; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (!isLand(x + dx, z + dz)) d = Math.min(d, r); return d; };
  const corridor = (x, z) => (Math.abs(x - (kx + 0.5)) <= TUNE.corridor && z >= kz - 1) || (Math.abs((x - z) - (kx - kz)) <= TUNE.sightline && x + z > kx + kz + 1);
  const trees = B.trees.types.map((t) => ({ t: TREE_ALIAS[t.type] || t.type, w: t.weight })).filter((t) => CATALOG[t.t]);
  const pickW = (list) => { const s = list.reduce((a, b) => a + b.w, 0); let u = rng.next() * s; for (const e of list) if ((u -= e.w) <= 0) return e.t; return list[list.length - 1].t; };
  const want = Math.round(B.trees.density * (TUNE.treeScale ?? 1) * landCells.length);
  const treeSites = landCells.map(([x, z]) => ({ x, z, s: (5 - Math.min(5, edgeDist(x, z))) * TUNE.wall + (x <= 2 || x >= W - 3 ? TUNE.sideCols : 0) + (z <= 1 ? TUNE.backRows : 0) - (corridor(x, z) ? 6 : 0) + rng.next() * TUNE.jitter }))
    .sort((a, b) => b.s - a.s);
  let placed = 0;
  for (const s of treeSites) {
    if (placed >= want) break;
    if (Math.hypot(s.x - spawn[0], s.z - spawn[1]) < 2) continue;
    let t = pickW(trees);
    if (t === "leaning-trunk" && !(s.x >= W / 2)) t = pickW(trees.filter((e) => e.t !== "leaning-trunk"));
    const rots = rng.shuffle([0, 1, 2, 3]);
    if (t === "leaning-trunk") rots.sort((a, b) => { const va = leanCell(t, a), vb = leanCell(t, b); return (isLand(s.x + vb[0], s.z + vb[1]) ? 0 : 1) - (isLand(s.x + va[0], s.z + va[1]) ? 0 : 1); });
    const j = t === "leaning-trunk" ? 0 : TUNE.offset;
    if (rots.some((rot) => place(t, s.x, s.z, { rot, ox: rng.float(-j, j), oz: rng.float(-j, j) }))) placed++;
  }
  const dw = Object.entries(B.decor_weights).map(([t, w]) => ({ t: t === "mushroom" ? "mushroom" : t, w })).filter((e) => CATALOG[e.t]);
  const free = landCells.filter(([x, z]) => !occ.has(key(x, z)) && cells[z][x].h === 1 && !(x === spawn[0] && z === spawn[1]));
  rng.shuffle(free);
  for (const [x, z] of free) {
    const back = z <= Math.round(D * 0.25), frontLeft = z >= D * 0.55 && x <= W * 0.5;
    const pool = dw.map((e) => ({ ...e, w: e.w * (e.t === "mist-bank" ? (back ? 3 : 0.25) : (e.t === "root-tangle" || e.t === "fallen-log") ? (frontLeft ? 2.5 : 0.6) : 1) }));
    if (path.has(key(x, z))) continue;
    const p = TUNE.scatter * (back || frontLeft ? 1.6 : 1);
    if (!rng.chance(p)) continue;
    const nearKnoll = x >= kx - 1 && x <= kx + fw && z >= kz - 1 && z <= kz + fd + 2;
    const t = pickW(pool.filter((e) => e.t !== "mist-bank" || (!edgeCell(x, z) && !nearKnoll)));
    if (path.has(key(x, z)) && !CATALOG[t].passable) continue;
    place(t, x, z, { rot: rng.int(0, 3), ox: rng.float(-0.12, 0.12), oz: rng.float(-0.12, 0.12) });
  }
  delete L.blocked;
  const lt = B.lighting;
  const out = {
    name: "forest-c", seed: String(seed), size: [W, D], cells, decor: L.decor, spawn,
    bg: lt.bg, palette: { ...LIFTED, ...Object.fromEntries(Object.entries(TUNE.palette).map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? { ...LIFTED[k], ...v } : v])) },
    materials: { ramp: ["stone", "grass", "dirt"] },
    light: { dir: TUNE.lightDir, ambient: lt.ambient + TUNE.ambientLift, sun: lt.sun - TUNE.ambientLift },
    pieces: ["pieces/forest-c.js"],
  };
  out.view = { ...frameView(out).view, ...(TUNE.tileH ? { tileH: TUNE.tileH } : {}) };
  return { level: out, stats: score(out, comp, [kx, kz], path) };
}

function score(L, comp, knoll, path) {
  const [W, D] = L.size;
  let match = 0, n = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const want = comp.grid[z]?.[x] && comp.grid[z][x] !== "V" && comp.grid[z][x] !== "W"; const have = L.cells[z][x].h >= 1; n++; if (want === have) match++; }
  const reach = reachability({ ...L, blocked: blockedOf(L) });
  const trees = L.decor.filter((d) => /trunk|tree/.test(d.t)).length;
  return { fill: +(match / n).toFixed(3), path: path.size, reachable: `${reach.reached}/${reach.total}`, missing: reach.missing.length, trees, decor: L.decor.length, knoll };
}

export function blockedOf(L) {
  const s = new Set();
  for (const d of L.decor) if (!CATALOG[d.t].passable) for (const [x, z] of footprintCells(d.t, d.x, d.z, d.rot || 0)) s.add(key(x, z));
  return s;
}

export function check(L) {
  const problems = [], occ = new Set(), blocked = blockedOf(L);
  for (const d of L.decor) for (const [x, z] of footprintCells(d.t, d.x, d.z, d.rot || 0)) { const k = key(x, z); if (occ.has(k)) problems.push(`overlap ${d.t} ${k}`); occ.add(k); if (!(L.cells[z]?.[x]?.h >= 1)) problems.push(`${d.t} off land ${k}`); }
  if (blocked.has(key(...L.spawn))) problems.push("spawn blocked");
  if (!L.decor.some((d) => d.t === "fire-bird")) problems.push("fire-bird missing");
  const r = reachability({ ...L, blocked });
  if (r.missing.length) problems.push(`${r.missing.length} unreachable, first ${r.missing[0]}`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seeds = flag("seeds", "") ? flag("seeds").split(",").map(Number) : [+flag("seed", 1)];
  for (const s of seeds) {
    const { level, stats } = build(s);
    const problems = check(level);
    console.log(`seed ${s} ${JSON.stringify(stats)} ${problems.length ? "FAIL " + problems.join("; ") : "ok"}`);
    if (args.includes("--write")) fs.writeFileSync(ROOT + `levels/${flag("name", "forest-c")}.json`, JSON.stringify({ ...level, name: flag("name", "forest-c") }));
  }
}
