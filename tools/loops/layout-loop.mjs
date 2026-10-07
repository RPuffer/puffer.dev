import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CATALOG } from "../../core/catalog.js";
import { DIRS } from "../../core/level.js";
import { analyse, hash, seedOf } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { loadLevel, root } from "./lib.mjs";
import { N4, key, prep, bfs, figureRing, leadOf, cellsOf, thingCells, roleOf } from "./graph.mjs";
import { measure, cost as baseCost, done, table, BAND } from "./layout-metrics.mjs";

export function shapeCost(m) {
  const d = m.districts < BAND.districts[0] ? BAND.districts[0] - m.districts : m.districts > BAND.districts[1] ? m.districts - BAND.districts[1] : 0;
  return 0.5 * d + m.fills.reduce((s, f) => s + Math.max(0, 0.7 - f), 0);
}

function xrayWindow(level) {
  const P = prep(level, { gateClosed: true }), seen = bfs(P, level.spawn).seen;
  let best = 0;
  for (const d of level.decor) {
    const spec = CATALOG[d.t];
    if (!spec || spec.passable || (spec.height || 1) < 1.5) continue;
    for (const [fx, fz] of cellsOf(d)) for (const [ox, oz, w] of [[-1, -1, 3], [-1, 0, 2], [0, -1, 2]]) {
      const x = fx + ox, z = fz + oz;
      if (!seen.has(key(x, z)) || !P.walkable(x, z)) continue;
      best = Math.max(best, w + (spec.height || 1) / 2 - (P.cell(x, z).h < (P.cell(fx, fz)?.h ?? 0) ? 1 : 0));
    }
  }
  return best;
}

const FIXED_ROLES = ["lead", "creature", "threshold", "light", "dais"];

export function walkChecks(level, base) {
  const P = prep(level), lead = leadOf(level);
  const [sx, sz] = level.spawn;
  if (!P.walkable(sx, sz)) return "spawn not walkable";
  if ((level.things || []).some((t) => thingCells(t).some(([x, z]) => x === sx && z === sz))) return "spawn on a thing";
  const seen = bfs(P, level.spawn).seen;
  const missing = P.walk.filter(([x, z]) => !seen.has(key(x, z))).length;
  if (missing > base.missing) return `reach drops (${missing} missing)`;
  for (const t of level.things || []) {
    const kind = t.kind || t.t;
    if ((kind === "bonfire" || kind === "chest") && !N4.some(([dx, dz]) => seen.has(key(t.x + dx, t.z + dz)))) return `${kind} unreachable`;
    if (kind === "elevator" && !thingCells(t).some(([x, z]) => seen.has(key(x, z)))) return "elevator unreachable";
  }
  const ring = figureRing(level, P, lead);
  if (lead && !ring.some(([x, z]) => seen.has(key(x, z)))) return "figure unreachable";
  const g = (level.things || []).find((t) => (t.kind || t.t) === "gate");
  if (g) {
    const Pc = prep(level, { gateClosed: true });
    const seenC = bfs(Pc, level.spawn).seen;
    if (ring.some(([x, z]) => seenC.has(key(x, z)))) return "gate does not gate";
    if (g.threshold?.length && !g.threshold.some(([x, z]) => seenC.has(key(x, z)))) return "threshold unreachable";
    const w = String(g.open || "").startsWith("watcher:") ? (level.things || []).find((t) => t.id === g.open.split(":")[1]) : null;
    if (w && g.threshold?.length) {
      const [ww, wd] = w.size || [1, 1], cx = w.x + ww / 2, cz = w.z + wd / 2;
      if (!g.threshold.some(([x, z]) => Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < (w.radius || 3.5))) return "threshold outside watcher radius";
    }
  }
  if (xrayWindow(level) < base.window - 1e-9) return "weakens the x-ray window";
  const hs = P.cell(sx, sz).h;
  if (![...seen.keys()].some((k) => { const [x, z] = k.split(",").map(Number); return P.cell(x, z).h > hs; }) && base.climb) return "no climb from spawn";
  const A = analyse(level, { lead });
  if (A.metrics.fit.length > base.fit) return `fit ${A.metrics.fit.join("; ")}`;
  if (A.metrics.xrayRun > Math.max(3, base.xray)) return `x-ray run ${A.metrics.xrayRun}`;
  return null;
}

function baseline(level) {
  const P = prep(level), lead = leadOf(level);
  const seen = bfs(P, level.spawn).seen;
  const hs = P.cell(...level.spawn).h;
  const A = analyse(level, { lead });
  return {
    missing: P.walk.filter(([x, z]) => !seen.has(key(x, z))).length,
    climb: [...seen.keys()].some((k) => { const [x, z] = k.split(",").map(Number); return P.cell(x, z).h > hs; }),
    window: xrayWindow(level),
    fit: A.metrics.fit.length,
    xray: A.metrics.xrayRun,
  };
}

export function layoutPass(level, o = {}) {
  const seed = o.seed ?? seedOf(level.name || "level");
  const maxIter = o.iterations ?? 30;
  const log = o.log || [];
  const base = baseline(level);
  const lead = leadOf(level);
  const figSet = new Set((lead ? cellsOf(lead) : []).map((c) => key(...c)));
  const anchorSpawn = (level.things || []).find((t) => (t.kind || t.t) === "bonfire") || { x: level.spawn[0], z: level.spawn[1] };
  const route0 = measure(level, { frame: false });
  const routeLim = [Math.min(9, route0.m.route), Math.max(16, route0.m.route)];
  const cost = (m) => baseCost(m) + (o.terrain ? shapeCost(m) : 0);
  const ev = () => {
    const why = walkChecks(level, base);
    if (why) return { why };
    const R = measure(level, { frame: false });
    if (R.m.route < routeLim[0] || R.m.route > routeLim[1]) return { why: `route ${R.m.route}` };
    if (!o.loops && R.m.loops > route0.m.loops) return { why: `adds a cycle (${R.m.loops})` };
    return { R, c: cost(R.m) };
  };
  let cur = ev();
  if (!cur.R) throw new Error(`level fails walk checks before the loop: ${cur.why}`);
  const before = cur.R.m;
  const moves = [];
  const cellOf = (x, z) => level.cells[z]?.[x] || null;
  const land = (c) => !!c && c.h >= 1 && c.s !== "none" && c.s !== "water";
  const voidNear = (x, z) => N4.some(([dx, dz]) => { const q = cellOf(x + dx, z + dz); return !q || q.s === "none" || q.s === "water"; });
  const decorAt = (x, z) => level.decor.filter((d) => cellsOf(d).some(([a, b]) => a === x && b === z));
  const thingAt = (x, z) => (level.things || []).some((t) => thingCells(t).some(([a, b]) => a === x && b === z) || (t.blocks || []).some(([a, b]) => a === x && b === z) || (t.threshold || []).some(([a, b]) => a === x && b === z));
  const budget = o.terrain || 0;
  const landN = () => level.cells.reduce((n, row) => n + row.filter(land).length, 0);
  const area0 = landN();
  const route0Set = new Set(route0.route.map((c) => key(...c)));
  const court = new Set();
  for (const [fx, fz] of lead ? cellsOf(lead) : []) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) court.add(key(fx + a, fz + b));
  const maxH = Math.max(...level.cells.flat().map((c) => c.h || 0));
  const editsSet = () => new Set((level.edits || []).map((e) => key(e.x, e.z)));
  const edit = (x, z, to, kind) => {
    const old = level.cells[z][x], prev = level.edits;
    const list = (prev || []).map((e) => ({ ...e }));
    const i = list.findIndex((e) => e.x === x && e.z === z);
    const from = i >= 0 ? list[i].from : { h: old.h, s: old.s };
    if (i >= 0) list.splice(i, 1);
    if (from.h !== to.h || from.s !== to.s) list.push({ x, z, kind, from, to: { h: to.h, s: to.s } });
    level.cells[z][x] = to;
    level.edits = list;
    return () => { level.cells[z][x] = old; if (prev) level.edits = prev; else delete level.edits; };
  };
  const leaks = () => {
    const ring = figureRing(level, prep(level), lead), seen = bfs(prep(level, { gateClosed: true }), level.spawn).seen;
    return ring.some(([x, z]) => seen.has(key(x, z)));
  };
  const sealEdge = (g, flanks, from) => {
    const added = [];
    if (!leaks()) return added;
    const old = level.decor.find((d) => d.gapX == null && cellsOf(d).length === 1 && CATALOG[d.t] && !CATALOG[d.t].passable && N4.some(([dx, dz]) => d.x === from[0] + dx && d.z === from[1] + dz));
    const t = old?.t || "rock";
    for (const [a, b] of flanks) {
      const c = cellOf(a, b);
      if (!land(c) || c.s === "ramp" || c.s === "bridge" || figSet.has(key(a, b)) || thingAt(a, b) || decorAt(a, b).length) continue;
      const d = { t, x: a, z: b, v: 0, rot: 0 };
      level.decor.push(d);
      added.push(d);
      if (!leaks()) break;
    }
    return added;
  };
  const rampEnds = () => {
    const s = new Set();
    level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s !== "ramp") return; const [dx, dz] = DIRS[c.d]; s.add(key(x + dx, z + dz)); s.add(key(x - dx, z - dz)); }));
    return s;
  };

  for (let it = 0; it < maxIter; it++) {
    if (done(cur.R.m) && (!o.terrain || !shapeCost(cur.R.m))) { log.push(`stop: targets met after ${it} iterations`); break; }
    const R = cur.R, routeSet = new Set(R.route.map((c) => key(...c))), ends = rampEnds();
    const ringSet = new Set(R.ring.map((c) => key(...c)));
    const exitT = (level.things || []).find((t) => t.kind === "elevator" && t.role === "exit");
    const exitSet = new Set(exitT ? (bfs(prep(level), level.spawn, (x, z) => x === exitT.x && z === exitT.z).path || []).map((c) => key(...c)) : []);
    const order = (arr, salt) => arr.map((v, i) => [v, hash(seed, i, it, salt)]).sort((a, b) => a[1] - b[1]).map((e) => e[0]);
    const cands = [];

    const free = (x, z) => {
      const c = cellOf(x, z);
      if (!land(c) || c.s === "ramp" || c.s === "bridge") return false;
      const k = key(x, z);
      if (routeSet.has(k) || ringSet.has(k) || exitSet.has(k) || figSet.has(k) || ends.has(k) || thingAt(x, z) || decorAt(x, z).length) return false;
      if (x === level.spawn[0] && z === level.spawn[1]) return false;
      return true;
    };
    const movable = level.decor.filter((d) => {
      const spec = CATALOG[d.t];
      return spec && d !== lead && !spec.passable && !spec.mask && !spec.attach && cellsOf(d).length === 1 && d.gapX == null && !FIXED_ROLES.includes(roleOf(level, d.t)) && d.t !== "waterfall";
    });
    const spots = [];
    for (let z = 0; z < level.size[1]; z++) for (let x = 0; x < level.size[0]; x++) if (free(x, z)) spots.push([x, z]);
    for (const d of order(movable, 1)) {
      const i = level.decor.indexOf(d);
      level.decor.splice(i, 1);
      const r = ev();
      level.decor.splice(i, 0, d);
      if (!r.R || r.c >= cur.c - 1e-6) continue;
      const near = order(spots, 2 + i).map((c, j) => [c, Math.max(Math.abs(c[0] - d.x), Math.abs(c[1] - d.z)) + j * 1e-3]).sort((a, b) => a[1] - b[1]).map((e) => e[0]);
      for (const [x, z] of near.slice(0, 16)) cands.push({ kind: "relocate", desc: `${d.t} ${d.x},${d.z} -> ${x},${z}`, apply: () => { const ox = d.x, oz = d.z; d.x = x; d.z = z; return () => { d.x = ox; d.z = oz; }; } });
    }

    const v = level.view || {}, pi = ((v.pitch ?? 35.264) * Math.PI) / 180, yi = ((v.yaw ?? 45) * Math.PI) / 180, tH = v.tileH ?? 1.5;
    const camV = [Math.cos(pi) * Math.sin(yi), Math.sin(pi), Math.cos(pi) * Math.cos(yi)];
    const facesCam = (d) => DIRS[d][0] * tH * camV[0] + camV[1] + DIRS[d][1] * tH * camV[2] > 0.05;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!land(c) || c.s === "ramp" || c.s === "bridge" || c.h < 2 || figSet.has(key(x, z)) || thingAt(x, z) || decorAt(x, z).length || voidNear(x, z)) return;
      if (x === level.spawn[0] && z === level.spawn[1]) return;
      for (const [d, [dx, dz]] of Object.entries(DIRS)) {
        if (!facesCam(d)) continue;
        const lo = cellOf(x + dx, z + dz), back = cellOf(x - dx, z - dz);
        if (!land(lo) || lo.s === "ramp" || lo.s === "bridge" || lo.h !== c.h - 1 || !land(back) || back.s === "ramp" || back.h !== c.h) continue;
        if (decorAt(x + dx, z + dz).some((e) => !CATALOG[e.t]?.passable) || decorAt(x - dx, z - dz).some((e) => !CATALOG[e.t]?.passable)) continue;
        cands.push({ kind: "ramp+", desc: `ramp ${x},${z} down ${d}`, apply: () => { const old = level.cells[z][x]; level.cells[z][x] = { h: c.h, s: "ramp", d, m: c.s }; return () => { level.cells[z][x] = old; }; } });
      }
    }));
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (c.s !== "ramp" || routeSet.has(key(x, z))) return;
      cands.push({ kind: "ramp-", desc: `drop ramp ${x},${z}`, apply: () => { const old = level.cells[z][x]; level.cells[z][x] = { h: c.h, s: c.m || "stone" }; return () => { level.cells[z][x] = old; }; } });
    }));
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if ((c.s !== "none" && c.s !== "water") || (level.edits || []).some((e) => e.x === x && e.z === z)) return;
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        const a = cellOf(x - dx, z - dz), b = cellOf(x + dx, z + dz);
        if (!land(a) || !land(b) || a.h !== b.h || a.s === "ramp" || b.s === "ramp" || a.s === "bridge" || b.s === "bridge") continue;
        cands.push({ kind: "bridge+", desc: `bridge ${x},${z} at h${a.h}`, apply: () => { const old = level.cells[z][x]; level.cells[z][x] = { h: a.h, s: "bridge", m: "planks", ...(c.s === "water" ? { w: c.h } : {}) }; return () => { level.cells[z][x] = old; }; } });
      }
    }));

    for (let z = 0; z < level.size[1]; z++) for (let x = 0; x < level.size[0]; x++) {
      const c = cellOf(x, z);
      if (!land(c) || c.s === "ramp" || c.s === "bridge" || !voidNear(x, z) || decorAt(x, z).length || thingAt(x, z) || figSet.has(key(x, z))) continue;
      if (Math.abs(x - anchorSpawn.x) + Math.abs(z - anchorSpawn.z) > 4 || (x === level.spawn[0] && z === level.spawn[1])) continue;
      cands.push({ kind: "spawn", desc: `spawn ${level.spawn} -> ${x},${z}`, apply: () => { const old = level.spawn; level.spawn = [x, z]; return () => { level.spawn = old; }; } });
    }

    if (budget) {
      const used = editsSet();
      for (let z = 0; z < level.size[1]; z++) for (let x = 0; x < level.size[0]; x++) {
        const c = cellOf(x, z), k = key(x, z);
        if (!land(c) || c.s === "ramp" || c.s === "bridge" || court.has(k) || routeSet.has(k) || route0Set.has(k) || ends.has(k)) continue;
        if (thingAt(x, z) || (x === level.spawn[0] && z === level.spawn[1])) continue;
        if (!used.has(k) && used.size >= budget) continue;
        const ds = decorAt(x, z);
        if (ds.length && ds.every((d) => d !== lead && cellsOf(d).length === 1 && !CATALOG[d.t]?.mask) && c.h >= 2) cands.push({ kind: "lower", desc: `lower ${x},${z} h${c.h} -> h${c.h - 1} under ${ds.map((d) => d.t).join("+")}`, apply: () => edit(x, z, { ...c, h: c.h - 1 }, "lower") });
        if (ds.length) continue;
        if (c.h < maxH) cands.push({ kind: "raise", desc: `raise ${x},${z} h${c.h} -> h${c.h + 1}`, apply: () => edit(x, z, { ...c, h: c.h + 1 }, "raise") });
        if (c.h >= 2) cands.push({ kind: "lower", desc: `lower ${x},${z} h${c.h} -> h${c.h - 1}`, apply: () => edit(x, z, { ...c, h: c.h - 1 }, "lower") });
        if (voidNear(x, z) && !N4.some(([dx, dz]) => cellOf(x + dx, z + dz)?.s === "bridge" || decorAt(x + dx, z + dz).some((d) => CATALOG[d.t]?.attach === "span")) && Math.abs(area0 - (landN() - 1)) <= 0.05 * area0) cands.push({ kind: "cut", desc: `cut rim ${x},${z} to void`, apply: () => edit(x, z, { h: 0, s: "none" }, "cut") });
      }
    }

    const g = (level.things || []).find((t) => (t.kind || t.t) === "gate");
    if (g) {
      const gc = (g.blocks && g.blocks[0]) || [g.x, g.z];
      const posts = level.decor.filter((d) => d.gapX === gc[0] && d.gapZ === gc[1]);
      const r = R.route;
      r.forEach(([x, z], i) => {
        if (i < 2 || i > r.length - 3 || (x === gc[0] && z === gc[1])) return;
        const c = cellOf(x, z), p = r[i - 1];
        if (!land(c) || c.s === "ramp" || c.s === "bridge" || cellOf(...p).s === "ramp") return;
        if (decorAt(x, z).some((e) => e.gapX == null || e.gapX !== gc[0] || e.gapZ !== gc[1]) || thingAt(x, z) && !(gc[0] === x && gc[1] === z)) return;
        const axis = p[0] !== x ? "x" : "z";
        const flanks = axis === "z" ? [[x - 1, z, -1], [x + 1, z, 1]] : [[x, z - 1, -1], [x, z + 1, 1]];
        const okFlank = ([a, b]) => { const q = cellOf(a, b); return land(q) && q.s !== "ramp" && q.s !== "bridge" && q.h === c.h && !routeSet.has(key(a, b)) && !figSet.has(key(a, b)) && !thingAt(a, b) && decorAt(a, b).every((e) => posts.includes(e)); };
        if (posts.length && !flanks.every(okFlank)) return;
        const isEdge = Array.isArray(g.edge);
        cands.push({ kind: "gate", desc: `gate ${isEdge ? g.edge.join(" | ") : gc} -> ${isEdge ? `${p} | ${x},${z}` : `${x},${z}`} span ${axis === "z" ? "x" : "z"}, threshold ${p}`, apply: () => {
          const snap = { x: g.x, z: g.z, blocks: g.blocks, threshold: g.threshold, span: g.span, edge: g.edge }, ps = posts.map((d) => ({ d, x: d.x, z: d.z, side: d.side, axis: d.axis, gapX: d.gapX, gapZ: d.gapZ }));
          Object.assign(g, { x, z, blocks: [[x, z]], threshold: [p.slice()], span: axis === "z" ? "x" : "z" });
          if (isEdge) g.edge = [p.slice(), [x, z]];
          posts.slice(0, 2).forEach((d, j) => Object.assign(d, { x: flanks[j][0], z: flanks[j][1], side: flanks[j][2], axis, gapX: x, gapZ: z }));
          const plugs = isEdge ? sealEdge(g, flanks, gc) : [];
          return () => { for (const d of plugs) level.decor.splice(level.decor.indexOf(d), 1); if (snap.edge) g.edge = snap.edge; Object.assign(g, { x: snap.x, z: snap.z, blocks: snap.blocks, threshold: snap.threshold, span: snap.span }); for (const s of ps) Object.assign(s.d, { x: s.x, z: s.z, side: s.side, axis: s.axis, gapX: s.gapX, gapZ: s.gapZ }); };
        } });
      });
    }

    let best = null, tried = 0;
    for (const cand of cands) {
      const undo = cand.apply();
      const r = ev();
      undo();
      tried++;
      const gain = ["raise", "lower", "cut"].includes(cand.kind) ? o.terrainGain ?? 0.02 : 1e-6;
      if (r.R && r.c < cur.c - gain && (!best || r.c < best.r.c - 1e-9)) best = { cand, r };
    }
    if (!best) { log.push(`stop: no improving move among ${tried} candidates after ${it} iterations`); break; }
    best.cand.apply();
    cur = ev();
    moves.push(`${best.cand.kind}: ${best.cand.desc} (cost ${cur.c.toFixed(3)})`);
  }
  if (budget) log.push(`terrain: ${(level.edits || []).length} of ${budget} cells edited, land ${area0} -> ${landN()}`);
  return { before, after: cur.R.m, moves, seed, log, costBefore: cost(before), costAfter: cur.c, edits: level.edits || [] };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
  const seedArg = opt("--seed", null), iterations = +opt("--iterations", 30), out = opt("--out", null);
  const write = flag("--write"), loops = flag("--loops");
  const ti = args.findIndex((a) => a.startsWith("--terrain"));
  const terrain = ti < 0 ? 0 : args[ti].includes("=") ? +args.splice(ti, 1)[0].split("=")[1] : +args.splice(ti, 2)[1];
  const name = args[0];
  if (!name) { console.error("usage: node tools/loops/layout-loop.mjs <level> [--seed n] [--iterations 30] [--loops] [--terrain=4] [--write | --out file.json]"); process.exit(2); }
  const { file, level } = await loadLevel(name);
  const before = measure(level).m;
  const seed = seedArg != null ? +seedArg : seedOf(level.name || name);
  const r = layoutPass(level, { seed, iterations, loops, terrain });
  for (const m of r.moves) console.log("  " + m);
  console.log(r.log.join("\n"));
  for (const e of r.edits || []) console.log(`  edit ${e.kind} ${e.x},${e.z}: h${e.from.h} ${e.from.s} -> h${e.to.h} ${e.to.s}`);
  console.log(`\nbefore  cost ${r.costBefore.toFixed(3)}\n${table(before)}\n\nafter  cost ${r.costAfter.toFixed(3)}\n${table(measure(level).m)}`);
  const dest = write ? file : out ? path.resolve(root, out) : null;
  if (dest) { fs.writeFileSync(dest, JSON.stringify(level)); console.log(`wrote ${path.relative(root, dest)} (seed ${seed})`); }
}
