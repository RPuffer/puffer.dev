import fs from "node:fs";
import path from "node:path";
import { CATALOG, blockedCells } from "../../core/catalog.js";
import { prepareLevel, DIRS, OPPOSITE } from "../../core/level.js";
import { checkLevel } from "../../core/procgen.js";
import { findPath, reachable } from "../../core/path.js";
import { edgeKey } from "../../core/interact.js";
import { growGrid } from "../../3d/pieces/outgrowth.js";
import { decorPass, family, hash, seedOf } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { execFileSync } from "node:child_process";
import { ISLANDS } from "./rebuild.mjs";
import { loadLevel, root } from "./lib.mjs";

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const write = args.includes("--write"), map = args.includes("--map");
const ref = (args.find((a) => a.startsWith("--ref=")) || "--ref=HEAD").slice(6);
const target = +(args.find((a) => a.startsWith("--ratio=")) || "--ratio=2").slice(8);
const N4 = Object.values(DIRS), SIDES = Object.keys(DIRS);
const LAND = /^(grass|sand|dirt|stone)$/;
const key = (x, z) => x + "," + z;
const P = 9;
const quiet = console.warn;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const real = (L) => checkLevel(L).filter((q) => !/grass share|plateau in/.test(q));

function prep(L) {
  console.warn = () => {};
  try { return prepareLevel(JSON.parse(JSON.stringify(L))); } finally { console.warn = quiet; }
}

function measure(L) {
  const Q = prep(L);
  const lift = (r) => Q.things.find((t) => t.kind === "elevator" && t.role === r);
  const a = lift("entry"), b = lift("exit"), gates = Q.things.filter((t) => t.kind === "gate" && t.edge);
  const closed = { ...Q, edges: new Set(gates.map((g) => edgeKey(g.edge[0], g.edge[1]))) };
  for (const g of gates) if (g.hold) for (const [x, z] of g.blocks || []) closed.blocked.add(key(x, z));
  const seen = new Set(reachable(closed, [a.x, a.z]).map((c) => c.join()));
  const bypass = gates.filter((g) => seen.has(g.edge[1].join())).map((g) => g.id);
  const open = { ...Q, edges: new Set(), blocked: new Set(Q.blocked) };
  for (const g of gates) for (const [x, z] of g.blocks || []) open.blocked.delete(key(x, z));
  const route = findPath(open, [a.x, a.z], [b.x, b.z]);
  let walk = 0;
  for (let z = 0; z < Q.size[1]; z++) for (let x = 0; x < Q.size[0]; x++) { const c = Q.cells[z][x]; if (c.h >= 1 && /grass|sand|dirt|stone|ramp|bridge|lift/.test(c.s) && !Q.blocked.has(key(x, z))) walk++; }
  return { warnings: Q.warnings.length, bypass, route: route ? route.length : 0, routeKey: route ? route.map((c) => c.join()).join(" ") : "", problems: real(L), walk };
}

function grow(name, art, L0, target) {
  const L = JSON.parse(JSON.stringify(L0));
  growGrid(L, [P, P, P, P]);
  const [W, D] = L.size;
  const rnd = rng(seedOf(name + ":grow13"));
  const base = measure(L);
  const brief = JSON.parse(fs.readFileSync(path.join(root, "pipeline/seed/concepts", name + ".json"), "utf8"));
  const S = brief.biome?.surfaces || {};
  const have = {};
  for (const row of L.cells) for (const c of row) if (LAND.test(c.s)) have[c.s] = (have[c.s] || 0) + 1;
  const pickS = (s, d) => (LAND.test(s || "") && have[s] ? s : d);
  const top = Object.entries(have).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const surf = { ground: pickS(S.ground, top[0]), raised: pickS(S.raised, top[1] || top[0]), path: pickS(S.path, "dirt"), shore: pickS(S.shore, top[0]) };
  const cell = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? L.cells[z][x] : null);
  const orig = new Set();
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (L.cells[z][x].s !== "none") orig.add(key(x, z));
  const keep = new Set();
  const lane = (x, z, [ox, oz], n, w) => { for (let k = 1; k <= n; k++) for (let v = -w; v <= w; v++) keep.add(key(x + ox * k + -oz * v, z + oz * k + ox * v)); };
  for (const t of L.things.filter((t) => t.kind === "elevator")) {
    const att = N4.filter(([dx, dz]) => { const c = cell(t.x + dx, t.z + dz); return c && c.s !== "none"; });
    for (const [dx, dz] of N4) { const c = cell(t.x + dx, t.z + dz); if (!c || c.s === "none") keep.add(key(t.x + dx, t.z + dz)); }
    if (att.length === 1) lane(t.x, t.z, [-att[0][0], -att[0][1]], P + 2, 1);
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = L.cells[z][x];
    if (c.s !== "bridge") continue;
    for (const [dx, dz] of N4) {
      const n = cell(x + dx, z + dz);
      if (n && n.s === "none") keep.add(key(x + dx, z + dz));
      const g = (L.outgrowths || []).find((g) => g.kind === "dock" && g.cells.some(([a, b]) => a === x && b === z));
      if (n && n.s === "none" && g && DIRS[g.side][0] === dx && DIRS[g.side][1] === dz) lane(x, z, [dx, dz], P + 2, 1);
    }
  }
  const blockedNow = () => { const s = new Set(); for (const d of L.decor) if (CATALOG[d.t] && d.t !== "waterfall") for (const [a, b] of blockedCells(d)) s.add(key(a, b)); for (const t of L.things) { const [w, d] = t.size || [1, 1]; for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) s.add(key(t.x + dx, t.z + dz)); for (const f of ["blocks", "threshold", "edge"]) for (const [a, b] of t[f] || []) s.add(key(a, b)); } return s; };
  const free = (x, z) => { const c = cell(x, z); return !!c && c.s === "none" && !keep.has(key(x, z)) && x >= 1 && z >= 1 && x < W - 1 && z < D - 1; };
  const added = new Map(), decor = [], docks = [], notes = [];
  const sideOf = (x, z, cx, cz) => { const dx = x - cx, dz = z - cz; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "e" : "w") : dz > 0 ? "s" : "n"; };
  const coreCells = [...orig].map((k) => k.split(",").map(Number));
  const cx = coreCells.reduce((a, c) => a + c[0], 0) / coreCells.length, cz = coreCells.reduce((a, c) => a + c[1], 0) / coreCells.length;
  const hMax = Math.max(...coreCells.map(([x, z]) => L.cells[z][x].h));
  const want = Math.round(base.walk * (target - 1));
  const gain = { n: 0, e: 0, s: 0, w: 0 };
  const accept = () => {
    const m = measure(L);
    if (m.problems.length > base.problems.length) return m.problems[0];
    if (m.warnings > base.warnings) return "prepare warning";
    if (m.bypass.length > base.bypass.length) return "gate bypass " + m.bypass.join();
    if (m.route !== base.route || m.routeKey !== base.routeKey) return "route changed";
    return null;
  };
  const apply = (cells) => { const prev = cells.map(([x, z]) => L.cells[z][x]); cells.forEach(([x, z, c]) => { L.cells[z][x] = { ...c }; }); return () => cells.forEach(([x, z], i) => { L.cells[z][x] = prev[i]; }); };
  const touchesOld = (x, z, h, own, touch) => N4.some(([dx, dz]) => { const n = cell(x + dx, z + dz); return n && n.s !== "none" && !own.has(key(x + dx, z + dz)) && (n.s === "lift" || n.s === "bridge" || n.s === "water" || (!touch && (n.s === "ramp" || (n.h === h && LAND.test(n.s))))); });
  const hug = (x, z, own) => N4.filter(([dx, dz]) => { const n = cell(x + dx, z + dz); return n && n.s !== "none" && !own.has(key(x + dx, z + dz)); }).length;
  const busy = blockedNow();
  const sites = () => {
    const out = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const c = L.cells[z][x];
      if (!LAND.test(c.s) || c.h < 1 || busy.has(key(x, z))) continue;
      for (const s of SIDES) {
        const [ox, oz] = DIRS[s];
        if (!free(x + ox, z + oz) || !free(x + 2 * ox, z + 2 * oz)) continue;
        out.push({ at: [x, z], side: s, h: c.h, face: sideOf(x + ox, z + oz, cx, cz) });
      }
    }
    return out;
  };
  const lobe = (site, size, mode, touch) => {
    const [ox, oz] = DIRS[site.side], [ax, az] = site.at;
    const ramp = mode === "up" ? { h: site.h + 1, s: "ramp", d: OPPOSITE[site.side] } : mode === "down" ? { h: site.h, s: "ramp", d: site.side } : null;
    const hl = mode === "up" ? site.h + 1 : mode === "down" ? site.h - 1 : site.h;
    if (hl < 1 || hl > hMax) return null;
    const first = [ax + ox, az + oz];
    const seed = ramp ? [ax + 2 * ox, az + 2 * oz] : first;
    if (ramp && !free(...seed)) return null;
    const own = new Set([key(...first), key(...seed)]);
    const body = [seed];
    const frontier = new Map();
    const push = (x, z) => { for (const [dx, dz] of N4) { const k = key(x + dx, z + dz); if (own.has(k) || frontier.has(k)) continue; frontier.set(k, [x + dx, z + dz]); } };
    push(...seed);
    const out = (x, z) => (x - cx) * ox + (z - cz) * oz;
    while (body.length < size && frontier.size) {
      let best = null, bs = -Infinity;
      for (const [k, [x, z]] of frontier) {
        if (!free(x, z) || touchesOld(x, z, hl, own, touch)) continue;
        if (ramp && x === first[0] + -oz && z === first[1] + ox) continue;
        if (ramp && x === first[0] + oz && z === first[1] - ox) continue;
        const nb = N4.filter(([dx, dz]) => own.has(key(x + dx, z + dz))).length;
        const open = (a, b) => own.has(key(a, b)) || free(a, b);
        if ((!open(x - 1, z) && !open(x + 1, z)) || (!open(x, z - 1) && !open(x, z + 1))) continue;
        const dist = Math.abs(x - seed[0]) + Math.abs(z - seed[1]);
        const sc = nb * 3.6 + Math.min(2, hug(x, z, own)) * (touch ? 0.9 : 0) + out(x, z) * 0.12 - dist * 0.35 + hash(seedOf(name), x, z, body.length) * 1.3;
        if (sc > bs) { bs = sc; best = [k, x, z]; }
      }
      if (!best) break;
      frontier.delete(best[0]);
      own.add(best[0]);
      body.push([best[1], best[2]]);
      push(best[1], best[2]);
    }
    if (body.length < Math.min(size, 6)) return null;
    const S0 = rnd() < 0.7 ? (hl >= 2 ? surf.raised : surf.ground) : surf.shore;
    const cells = body.map(([x, z]) => [x, z, { h: hl, s: S0 }]);
    if (ramp) cells.unshift([...first, { ...ramp, m: L.cells[az][ax].s }]);
    return { cells, hl, body, first, seed, site, mode, s: S0 };
  };
  const shelf = (lb) => {
    if (lb.body.length < 12 || lb.hl + 1 > hMax) return null;
    const far = lb.body.slice().sort((a, b) => (Math.abs(b[0] - lb.seed[0]) + Math.abs(b[1] - lb.seed[1])) - (Math.abs(a[0] - lb.seed[0]) + Math.abs(a[1] - lb.seed[1])));
    const n = Math.max(4, Math.round(lb.body.length * 0.3));
    const own = new Set(lb.body.map((c) => key(...c)));
    const pick = [far[0]], pk = new Set([key(...far[0])]);
    while (pick.length < n) {
      const c = far.find(([x, z]) => !pk.has(key(x, z)) && N4.some(([dx, dz]) => pk.has(key(x + dx, z + dz))));
      if (!c) break;
      pick.push(c); pk.add(key(...c));
    }
    if (pick.length < 4) return null;
    for (const [x, z] of pick) for (const [dx, dz] of N4) {
      const r = [x + dx, z + dz], lo = [x + 2 * dx, z + 2 * dz];
      if (pk.has(key(...r)) || !own.has(key(...r)) || !own.has(key(...lo)) || pk.has(key(...lo))) continue;
      if (key(...r) === key(...lb.seed)) continue;
      const d = Object.keys(DIRS).find((q) => DIRS[q][0] === dx && DIRS[q][1] === dz);
      const lat = [[-dz, dx], [dz, -dx]];
      if (lat.some(([a, b]) => pk.has(key(r[0] + a, r[1] + b)))) continue;
      return [...pick.map(([a, b]) => [a, b, { h: lb.hl + 1, s: surf.raised === lb.s ? surf.ground : surf.raised }]), [...r, { h: lb.hl + 1, s: "ramp", d, m: lb.s }]];
    }
    return null;
  };
  const pathway = (lb) => {
    const own = new Set(lb.body.map((c) => key(...c)));
    const far = lb.body.slice().sort((a, b) => (Math.abs(b[0] - lb.seed[0]) + Math.abs(b[1] - lb.seed[1])) - (Math.abs(a[0] - lb.seed[0]) + Math.abs(a[1] - lb.seed[1])))[0];
    const prev = new Map([[key(...lb.seed), null]]), q = [lb.seed];
    for (let i = 0; i < q.length; i++) for (const [dx, dz] of N4) { const n = [q[i][0] + dx, q[i][1] + dz], k = key(...n); if (own.has(k) && !prev.has(k)) { prev.set(k, q[i]); q.push(n); } }
    const out = [];
    for (let c = far; c; c = prev.get(key(...c))) out.push(c);
    return out;
  };
  const dock = (lb) => {
    for (const [x, z] of lb.body.slice().reverse()) for (const s of SIDES) {
      const [ox, oz] = DIRS[s], len = 2 + (hash(seedOf(name), x, z, 9) < 0.5 ? 0 : 1);
      const cs = [];
      for (let u = 1; u <= len; u++) cs.push([x + ox * u, z + oz * u]);
      if (!cs.every(([a, b]) => free(a, b))) continue;
      const near = cs.some(([a, b]) => N4.some(([dx, dz]) => { const k = key(a + dx, b + dz); if (k === key(x, z) || cs.some((c) => key(...c) === k)) return false; const n = cell(a + dx, b + dz); return n && n.s !== "none"; }));
      if (near) continue;
      return { side: s, at: [x, z], cells: cs.map(([a, b]) => [a, b, { h: lb.hl, s: "bridge", m: "planks", post: 1 }]) };
    }
    return null;
  };
  const notches = () => {
    let n = 0;
    for (let pass = 0; pass < 3; pass++) {
      let grew = 0;
      for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
        if (!free(x, z)) continue;
        const nb = N4.map(([dx, dz]) => cell(x + dx, z + dz)).filter((c) => c && c.s !== "none");
        if (nb.length < 3 || nb.some((c) => /lift|bridge|water/.test(c.s))) continue;
        const land = nb.filter((c) => LAND.test(c.s));
        if (land.length < 2) continue;
        const hs = {};
        for (const c of land) hs[c.h] = (hs[c.h] || 0) + 1;
        const h = +Object.entries(hs).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
        const sf = land.find((c) => c.h === h).s;
        const u = apply([[x, z, { h, s: sf }]]);
        if (accept()) { u(); continue; }
        added.set(key(x, z), L.cells[z][x]); grew++; n++;
      }
      if (!grew) break;
    }
    return n;
  };
  const faces = ["n", "e", "s", "w"];
  let tries = 0, lobes = 0;
  const newWalk = () => measure(L).walk - base.walk;
  const bl0 = blockedNow();
  let lc = 0, bc = 0;
  for (const k of orig) { const [x, z] = k.split(",").map(Number), c = L.cells[z][x]; if (c.h >= 1 && LAND.test(c.s)) { lc++; if (bl0.has(k)) bc++; } }
  const decorShare = (bc / Math.max(1, lc)) * 0.7;
  while (newWalk() * (1 - decorShare) < want && tries < 400) {
    tries++;
    const face = faces.slice().sort((a, b) => gain[a] - gain[b])[0];
    const all = sites().filter((s) => s.face === face && s.side === face);
    const pool = all.length ? all : sites().filter((s) => s.face === face);
    if (!pool.length) { gain[face] += 5; continue; }
    const site = pool[Math.floor(rnd() * pool.length)];
    const r = rnd();
    const mode = site.h >= 2 && r < 0.35 ? "down" : site.h < hMax && r > 0.78 ? "up" : "flat";
    const size = 8 + Math.floor(rnd() * 11);
    let lb = null, why = "none";
    for (const touch of [true, false]) {
      lb = lobe(site, size, mode, touch);
      if (!lb) continue;
      const undo = apply(lb.cells);
      why = accept();
      if (!why) break;
      undo(); lb = null;
    }
    if (!lb) { gain[face] += 0.5; continue; }
    for (const [x, z, c] of lb.cells) added.set(key(x, z), c);
    let label = `lobe ${face} ${mode} h${lb.hl} ${lb.s} ${lb.body.length}${lb.cells.length > lb.body.length ? "+ramp" : ""} at ${site.at}`;
    const sh = rnd() < 0.55 ? shelf(lb) : null;
    if (sh) { const u = apply(sh); if (accept()) u(); else { for (const [x, z, c] of sh) added.set(key(x, z), c); label += `, shelf ${sh.length - 1}`; } }
    const pw = pathway(lb).filter(([x, z]) => L.cells[z][x].s !== "ramp" && L.cells[z][x].h === lb.hl);
    if (pw.length >= 3 && surf.path !== lb.s) { const u = apply(pw.map(([x, z]) => [x, z, { h: lb.hl, s: surf.path }])); if (accept()) u(); else { for (const [x, z] of pw) added.set(key(x, z), L.cells[z][x]); label += `, path ${pw.length}`; } }
    if (rnd() < 0.45) {
      const dk = dock(lb);
      if (dk) {
        L.outgrowths = L.outgrowths || [];
        const g = { kind: "dock", side: dk.side, at: dk.at, cells: dk.cells.map(([x, z]) => [x, z]) };
        L.outgrowths.push(g);
        const u = apply(dk.cells);
        if (accept()) { u(); L.outgrowths.pop(); } else { for (const [x, z, c] of dk.cells) added.set(key(x, z), c); docks.push(g); label += `, dock ${dk.side} ${dk.cells.length}`; }
      }
    }
    const nf = notches();
    if (nf) label += `, notches ${nf}`;
    gain[face] += lb.cells.length + nf;
    lobes++;
    notes.push(label);
  }
  return { L, base, added, docks, notes, gain, lobes, surf };
}

function dress(name, art, G, brief) {
  const { L, added, base } = G;
  const props = L.palette?.props || {};
  const fixedRole = (t) => ["lead", "creature", "threshold", "light"].includes(props[t]?.role);
  const counts = {};
  for (const d of L.decor) {
    const sp = CATALOG[d.t];
    if (!sp || sp.mask || sp.attach || sp.floats || d.watch || d.gapX != null || fixedRole(d.t)) continue;
    if (sp.footprint[0] !== 1 || sp.footprint[1] !== 1 || /^(coin|gem|star|heart|marker)$/.test(d.t)) continue;
    counts[d.t] = (counts[d.t] || 0) + 1;
  }
  const types = Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t]) => t);
  const solid = types.filter((t) => !CATALOG[t].passable);
  const soft = types.filter((t) => CATALOG[t].passable && (CATALOG[t].height || 0) > 0.05);
  let landCore = 0, blockCore = 0;
  const bl = new Set();
  for (const d of L.decor) if (CATALOG[d.t] && !CATALOG[d.t].passable) for (const [a, b] of blockedCells(d)) bl.add(key(a, b));
  L.cells.forEach((row, z) => row.forEach((c, x) => { if (c.h >= 1 && LAND.test(c.s) && !added.has(key(x, z))) { landCore++; if (bl.has(key(x, z))) blockCore++; } }));
  const dens = blockCore / Math.max(1, landCore);
  const rampEnds = new Set();
  L.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "ramp") { const [dx, dz] = DIRS[c.d]; rampEnds.add(key(x + dx, z + dz)); rampEnds.add(key(x - dx, z - dz)); rampEnds.add(key(x, z)); } }));
  for (const g of L.outgrowths || []) for (const [x, z] of g.cells) { rampEnds.add(key(x, z)); rampEnds.add(key(...g.at)); }
  const spots = [...added.entries()].filter(([k, c]) => LAND.test(c.s) && !rampEnds.has(k) && c.s !== G.surf.path).map(([k]) => k.split(",").map(Number));
  const wantN = Math.round(spots.length * dens * 0.95);
  const seed = seedOf(name + ":dress13");
  spots.sort((a, b) => hash(seed, ...a, 1) - hash(seed, ...b, 1));
  const occ = new Set(bl);
  const placed = [];
  const fam = (t) => family(t, props);
  const mk = (t, x, z, i) => { const sp = CATALOG[t]; return { t, x, z, v: Math.floor(hash(seed, x, z, 41 + i) * (sp.variants || 1)), rot: sp.rotates ? Math.floor(hash(seed, x, z, 42) * 4) : 0, ox: +((hash(seed, x, z, 43) - 0.5) * 0.24).toFixed(2), oz: +((hash(seed, x, z, 44) - 0.5) * 0.24).toFixed(2) }; };
  const tryPut = (d) => {
    if (occ.has(key(d.x, d.z))) return false;
    L.decor.push(d);
    const m = measure(L);
    if (m.problems.length > base.problems.length || m.warnings > base.warnings || m.routeKey !== base.routeKey || m.bypass.length > base.bypass.length) { L.decor.pop(); return false; }
    occ.add(key(d.x, d.z)); placed.push(d); return true;
  };
  const pool = solid.length ? solid : types;
  let ci = 0;
  for (const [x, z] of spots) {
    if (placed.filter((d) => !CATALOG[d.t].passable).length >= wantN) break;
    if (occ.has(key(x, z))) continue;
    const t0 = pool[Math.floor(hash(seed, x, z, 5 + ci) * Math.min(pool.length, 4))];
    if (!tryPut(mk(t0, x, z, ci))) continue;
    ci++;
    const mates = pool.filter((t) => fam(t) === fam(t0));
    let n = 0;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      if (n >= 1 + Math.floor(hash(seed, x, z, 7) * 3)) break;
      const X = x + dx, Z = z + dz, c = added.get(key(X, Z));
      if (!c || !LAND.test(c.s) || rampEnds.has(key(X, Z)) || c.s === G.surf.path) continue;
      const t = mates[(n + 1) % mates.length] || t0;
      if (tryPut(mk(t, X, Z, ci + n))) n++;
    }
    if (soft.length && hash(seed, x, z, 8) < 0.5) {
      for (const [dx, dz] of [[0, -1], [-1, 0], [1, -1]]) {
        const X = x + dx, Z = z + dz, c = added.get(key(X, Z));
        if (!c || !LAND.test(c.s) || rampEnds.has(key(X, Z))) continue;
        if (tryPut(mk(soft[ci % soft.length], X, Z, ci))) break;
      }
    }
  }
  const frozen = L.decor.filter((d) => !placed.includes(d));
  for (const d of frozen) d.__k = d.axis === undefined ? 1 : 2;
  for (const d of frozen) if (d.__k === 1) d.axis = "pass13";
  const log = [];
  const r = decorPass(L, { brief, seed, iterations: 30, log });
  for (const d of frozen) { if (d.__k === 1) delete d.axis; delete d.__k; }
  const mine = new Set(added.keys());
  const kept = [];
  for (let i = L.decor.length - 1; i >= 0; i--) {
    const d = L.decor[i];
    if (frozen.includes(d)) continue;
    if (!mine.has(key(d.x, d.z))) { L.decor.splice(i, 1); continue; }
    kept.push(d);
  }
  const m = measure(L);
  if (m.problems.length > base.problems.length || m.routeKey !== base.routeKey || m.bypass.length > base.bypass.length || m.warnings > base.warnings) {
    for (const d of kept) if (!placed.includes(d)) L.decor.splice(L.decor.indexOf(d), 1);
    log.push("decor loop result reverted to seeded clusters");
  }
  log.push(`seeded ${placed.length} of want ${wantN} solid on ${spots.length} spots`);
  return { dens, wantN, placed: L.decor.filter((d) => !frozen.includes(d)), loop: r.moves.length, log };
}

function finalSpec(L0, G, placed) {
  const { L, added, docks } = G;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  L.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s !== "none") { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } }));
  const [W, D] = L0.size;
  const pad = [Math.max(0, P - x0), Math.max(0, P - z0), Math.max(0, x1 - (P + W - 1)), Math.max(0, z1 - (P + D - 1))];
  const sx = P - pad[0], sz = P - pad[1];
  const cells = [...added.entries()].map(([k]) => { const [x, z] = k.split(",").map(Number); return [x - sx, z - sz, { ...L.cells[z][x] }]; }).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const decor = placed.map((d) => ({ t: d.t, x: d.x - sx, z: d.z - sz, v: d.v || 0, rot: d.rot || 0, ox: d.ox || 0, oz: d.oz || 0 }));
  const dk = docks.map((g) => ({ kind: "dock", side: g.side, at: [g.at[0] - sx, g.at[1] - sz], cells: g.cells.map(([x, z]) => [x - sx, z - sz]) }));
  return { pad, cells, decor, docks: dk };
}

const report = [];
for (const [name, art] of ISLANDS.filter(([l]) => !only || only.split(",").includes(l))) {
  const { brief } = await loadLevel(name);
  const L0 = JSON.parse(execFileSync("git", ["show", `${ref}:levels/${name}.json`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }));
  let t = target, G, dr, after, ratio;
  for (let k = 0; k < 4; k++) {
    G = grow(name, art, L0, t);
    dr = dress(name, art, G, brief);
    after = measure(G.L);
    ratio = after.walk / G.base.walk;
    if (Math.abs(ratio - target) <= 0.1) break;
    t += target - ratio;
  }
  const spec = finalSpec(L0, G, dr.placed);
  report.push({ name, ratio, base: G.base.walk, now: after.walk, cells: spec.cells.length, decor: spec.decor.length, docks: spec.docks.length, lobes: G.lobes, pad: spec.pad, gain: G.gain });
  console.log(`== ${name}: walk ${G.base.walk} -> ${after.walk} (x${ratio.toFixed(2)}), ${spec.cells.length} cells, ${G.lobes} lobes, ${spec.docks.length} docks, ${spec.decor.length} decor (density ${dr.dens.toFixed(2)}, loop moves ${dr.loop}), pad ${spec.pad}, faces ${Object.entries(G.gain).map(([k, v]) => k + Math.round(v)).join(" ")}, bypass ${after.bypass.length}, problems ${after.problems.length}`);
  for (const n of G.notes) console.log("   " + n);
  for (const n of dr.log.slice(-3)) console.log("   decor: " + n);
  if (map) G.L.cells.forEach((row, z) => { const s = row.map((c, x) => { const k = key(x, z); const d = G.L.decor.some((e) => e.x === x && e.z === z); const t = G.L.things.find((q) => q.x === x && q.z === z); if (t) return t.kind[0].toUpperCase(); const ch = c.s === "none" ? "." : c.s === "ramp" ? { n: "^", s: "v", e: ">", w: "<" }[c.d] : c.s === "bridge" ? "=" : c.s === "lift" ? "L" : String(c.h); return G.added.has(k) ? (d ? "#" : ch === "." ? "?" : ch.replace(/\d/, (q) => "abcde"[q - 1])) : d ? "*" : ch; }).join(""); if (/[^.]/.test(s)) console.log("   " + s); });
  if (write) {
    const file = path.join(root, "3d/pieces", art + ".js");
    const src = fs.readFileSync(file, "utf8").split("\n");
    const i = src.findIndex((l) => l.startsWith("export const PIN = "));
    const PIN = JSON.parse(src[i].slice("export const PIN = ".length).replace(/;\s*$/, ""));
    PIN[name].grow = spec;
    src[i] = "export const PIN = { " + Object.entries(PIN).map(([k, v]) => JSON.stringify(k) + ": " + JSON.stringify(v)).join(", ") + " };";
    fs.writeFileSync(file, src.join("\n"));
  }
}
if (report.length > 1) console.log(report.map((r) => `${r.name.padEnd(18)} ${r.base} -> ${r.now}  x${r.ratio.toFixed(2)}  +${r.cells} cells, ${r.docks} docks, ${r.decor} decor, pad ${r.pad}`).join("\n"));
