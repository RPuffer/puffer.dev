import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { CATALOG, blockedCells, maskCells } from "../../core/catalog.js";
import { surfaceHeight, canStep } from "../../core/level.js";
import { makeProjection } from "../../core/iso.js";
import { loadLevel, root } from "./lib.mjs";
import { TILE, N4, key, DIR_OF, prep, bfs, figureRing, regionGraph, districts, leadOf, cellsOf, thingCells, roleOf } from "./graph.mjs";

export const EYE = 1.5;
export const BAND = { spawnIso: [1 / 3, 0.55], reveal: [0.2, 1], route: [9, 16], detour: [1.3, 1.8], choice: [2, 4], districts: [3, 5] };
const FRAME = [351, 390];

export function screen(level, w, h) {
  const view = level.view, proj = makeProjection(view);
  const zoom = view.zoom * Math.min(w / FRAME[0], h / FRAME[1]);
  const c = proj.project(...view.center);
  return (x, y, z) => { const s = proj.project(x, y, z); return [w / 2 + (s.sx - c.sx) * zoom, h / 2 + (s.sy - c.sy) * zoom]; };
}

export function gateOf(level, route) {
  const g = (level.things || []).find((t) => (t.kind || t.t) === "gate");
  if (g) {
    const cell = (g.blocks && g.blocks[0]) || [g.x, g.z];
    const thr = g.threshold?.[0] || null;
    return { thing: g, cell, threshold: thr };
  }
  const posts = level.decor.filter((d) => d.gapX != null && (roleOf(level, d.t) === "threshold" || d.t === "arch" || /gate/.test(d.t)));
  const gap = posts.length ? [posts[0].gapX, posts[0].gapZ] : null;
  if (!gap) return null;
  const i = route.findIndex(([x, z]) => x === gap[0] && z === gap[1]);
  return { thing: null, cell: gap, threshold: i > 0 ? route[i - 1] : null };
}

export function occluders(level, P, o = {}) {
  const occ = new Map();
  const add = (x, z, h) => { const k = key(x, z); if (h > (occ.get(k) || 0)) occ.set(k, h); };
  for (const d of level.decor) {
    const spec = CATALOG[d.t];
    if (!spec || d.t === "waterfall") continue;
    if (spec.mask) { for (const m of maskCells(d.t, d.x, d.z, d.rot || 0)) if (!m.pass) add(m.x, m.z, m.h ?? spec.height ?? 1); continue; }
    if (spec.passable) continue;
    for (const [a, b] of blockedCells(d)) add(a, b, spec.height ?? 1);
  }
  for (const t of level.things || []) {
    const kind = t.kind || t.t;
    if (kind === "gate" && !o.gateOpen) for (const [a, b] of t.blocks || [[t.x, t.z]]) add(a, b, t.height || 1.5);
    if (kind === "bonfire" || kind === "chest") add(t.x, t.z, 0.6);
  }
  return occ;
}

export function sight(level, P, occ) {
  const top = (px, pz) => {
    const c = P.cell(Math.floor(px), Math.floor(pz));
    if (!c || c.s === "none") return 0;
    return surfaceHeight(level, px, pz) * TILE;
  };
  const ground = (x, z) => (P.cell(x, z)?.h || 0) * TILE;
  const clear = (E, T, skip) => {
    const dist = Math.hypot(T[0] - E[0], T[2] - E[2]);
    const n = Math.max(2, Math.ceil(dist / 0.08));
    for (let i = 1; i < n; i++) {
      const t = i / n, px = E[0] + (T[0] - E[0]) * t, pz = E[2] + (T[2] - E[2]) * t;
      const k = key(Math.floor(px), Math.floor(pz));
      if (skip.has(k)) continue;
      const y = E[1] + (T[1] - E[1]) * t;
      if (y < top(px, pz) + (occ.get(k) || 0) - 1e-6) return false;
    }
    return true;
  };
  const eye = ([x, z]) => [x + 0.5, ground(x, z) + EYE, z + 0.5];
  const seesCell = (from, [x, z]) => {
    if (from[0] === x && from[1] === z) return true;
    const E = eye(from), skip = new Set([key(...from), key(x, z)]), y = ground(x, z) + 0.05;
    for (const [ox, oz] of [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) if (clear(E, [x + ox, y, z + oz], skip)) return true;
    return false;
  };
  const isovist = (from) => {
    const vis = new Set();
    for (const c of P.walk) if (seesCell(from, c)) vis.add(key(...c));
    return vis;
  };
  const seesFigure = (from, lead) => {
    if (!lead) return null;
    const fig = cellsOf(lead), skip = new Set([key(...from), ...fig.map((c) => key(...c))]);
    const E = eye(from), hgt = CATALOG[lead.t]?.height ?? 2;
    for (const [x, z] of fig) for (const f of [0.55, 0.9]) if (clear(E, [x + 0.5, ground(x, z) + hgt * f, z + 0.5], skip)) return true;
    return false;
  };
  return { isovist, seesCell, seesFigure, eye, ground };
}

export function lips(level, P) {
  const L0 = { ...level, blocked: new Set() };
  const edges = [];
  for (let z = 0; z < P.D; z++) for (let x = 0; x < P.W; x++) for (const [dx, dz] of [[1, 0], [0, 1]]) {
    const a = P.cell(x, z), b = P.cell(x + dx, z + dz);
    if (!P.land(a) || !P.land(b) || a.h === b.h) continue;
    const ramp = canStep(L0, x, z, DIR_OF(dx, dz));
    edges.push({ x, z, dx, dz, ramp, hi: a.h > b.h ? 0 : 1, pair: `${Math.max(a.h, b.h)}-${Math.min(a.h, b.h)}` });
  }
  const cliffs = edges.filter((e) => !e.ramp);
  const ek = (e) => `${e.x},${e.z},${e.dx},${e.hi},${e.pair}`;
  const set = new Map(cliffs.map((e) => [ek(e), e]));
  const seen = new Set(), runs = [];
  for (const e of cliffs) {
    if (seen.has(ek(e))) continue;
    let n = 0;
    const q = [e];
    seen.add(ek(e));
    while (q.length) {
      const c = q.pop();
      n++;
      const along = c.dx ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
      for (const [ax, az] of along) {
        const k = `${c.x + ax},${c.z + az},${c.dx},${c.hi},${c.pair}`;
        if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(set.get(k)); }
      }
    }
    runs.push(n);
  }
  let rimRamps = 0;
  for (let z = 0; z < P.D; z++) for (let x = 0; x < P.W; x++) {
    const c = P.cell(x, z);
    if (c?.s === "ramp" && N4.some(([dx, dz]) => { const q = P.cell(x + dx, z + dz); return !q || q.s === "none"; })) rimRamps++;
  }
  return { edges: edges.length, cliff: cliffs.length, ramp: edges.length - cliffs.length, runs: runs.length, short: runs.filter((n) => n === 1).length, rimRamps };
}

export function frame(level, P, lead, w = 900, h = 800) {
  if (!level.view) return null;
  const S = screen(level, w, h);
  const land = [];
  for (let z = 0; z < P.D; z++) for (let x = 0; x < P.W; x++) { const c = P.cell(x, z); if (P.land(c)) land.push(S(x + 0.5, c.h * TILE, z + 0.5)); }
  const cx = land.reduce((a, p) => a + p[0], 0) / land.length, cy = land.reduce((a, p) => a + p[1], 0) / land.length;
  const mass = (d) => {
    const cs = cellsOf(d), spec = CATALOG[d.t] || {};
    const mx = cs.reduce((a, c) => a + c[0] + 0.5, 0) / cs.length, mz = cs.reduce((a, c) => a + c[1] + 0.5, 0) / cs.length;
    const g = Math.max(...cs.map(([x, z]) => (P.cell(x, z)?.h || 0) * TILE));
    return { t: d.t, at: S(mx, g + (spec.height ?? 1) / 2, mz), w: cs.length * (spec.height ?? 1) };
  };
  const third = ([x, y]) => [Math.min(2, Math.max(0, Math.floor(x / (w / 3)))), Math.min(2, Math.max(0, Math.floor(y / (h / 3))))];
  const fig = lead ? mass(lead) : null;
  const others = level.decor.filter((d) => d !== lead && CATALOG[d.t] && !CATALOG[d.t].passable && d.t !== "waterfall").map(mass).sort((a, b) => b.w - a.w);
  const prop = others[0] || null;
  const both = [fig, prop].filter(Boolean);
  const wsum = both.reduce((a, m) => a + m.w, 0);
  const bal = wsum ? [both.reduce((a, m) => a + m.at[0] * m.w, 0) / wsum, both.reduce((a, m) => a + m.at[1] * m.w, 0) / wsum] : null;
  return { land: [(cx - w / 2) / w, (cy - h / 2) / h], fig, figThird: fig && third(fig.at), prop, propThird: prop && third(prop.at), bal, balThird: bal && third(bal), S, w, h };
}

export function measure(level, o = {}) {
  const P = prep(level);
  const lead = leadOf(level);
  const ring = figureRing(level, P, lead);
  const ringSet = new Set(ring.map((c) => key(...c)));
  const R = bfs(P, level.spawn, ring.length ? (x, z) => ringSet.has(key(x, z)) : null);
  const route = R.path;
  const gate = gateOf(level, route);
  const S = sight(level, P, occluders(level, P));
  const spawnVis = S.isovist(level.spawn);
  const thr = gate?.threshold || null;
  const thrVis = thr ? S.isovist(thr) : null;
  const ti = thr ? route.findIndex(([x, z]) => x === thr[0] && z === thr[1]) : -1;
  let reveal = null;
  if (thrVis) {
    const before = new Set();
    for (const c of route.slice(0, Math.max(0, ti))) for (const k of S.isovist(c)) before.add(k);
    reveal = [...thrVis].filter((k) => !before.has(k)).length / P.walk.length;
  }
  const mid = route.length ? route[Math.floor((route.length - 1) / 2)] : null;
  const fig = {
    spawn: S.seesFigure(level.spawn, lead),
    threshold: thr ? S.seesFigure(thr, lead) : null,
    mid: mid ? S.seesFigure(mid, lead) : null,
    route: lead && route.length ? route.filter((c) => S.seesFigure(c, lead)).length / route.length : null,
  };
  const G = regionGraph(level, P);
  const onPath = new Set(route.map(([x, z]) => G.nodeOf.get(key(x, z))));
  const choice = [...onPath].filter((n) => G.adj[n].size >= 3).length;
  const payoff = new Set();
  for (const t of level.things || []) {
    const kind = t.kind || t.t;
    const cs = kind === "bonfire" || kind === "chest" ? N4.map(([dx, dz]) => [t.x + dx, t.z + dz]) : kind === "elevator" ? thingCells(t) : [];
    for (const [x, z] of cs) if (G.nodeOf.has(key(x, z))) payoff.add(G.nodeOf.get(key(x, z)));
  }
  const leaves = G.nodes.length > 1 ? G.nodes.filter((n) => G.adj[n.id].size <= 1 && !onPath.has(n.id)) : [];
  const dead = leaves.filter((n) => !payoff.has(n.id) && !(lead && n.cells.some((c) => S.seesFigure(c, lead))));
  const D = districts(level, P);
  const end = route[route.length - 1];
  const man = end ? Math.abs(end[0] - level.spawn[0]) + Math.abs(end[1] - level.spawn[1]) : 0;
  const reach = bfs(P, level.spawn).seen;
  const m = {
    walk: P.walk.length,
    reach: P.walk.filter(([x, z]) => reach.has(key(x, z))).length,
    spawn: level.spawn.slice(),
    spawnIso: spawnVis.size / P.walk.length,
    threshold: thr,
    thrIso: thrVis ? thrVis.size / P.walk.length : null,
    reveal,
    fig,
    districts: D.big.length,
    plateaus: D.all.length,
    fills: D.big.map((d) => +d.fill.toFixed(2)),
    lips: lips(level, P),
    route: Math.max(0, route.length - 1),
    straight: man,
    euclid: end ? Math.hypot(end[0] - level.spawn[0], end[1] - level.spawn[1]) : 0,
    detour: man ? (route.length - 1) / man : null,
    nodes: G.nodes.length,
    edges: G.edges.length,
    loops: G.loops,
    choice,
    leaves: leaves.length,
    dead: dead.length,
    deadAt: dead.map((n) => `${n.kind}h${n.h}@${n.cells[0].join(",")}(${n.cells.length})`),
  };
  const F = o.frame === false ? null : frame(level, P, lead);
  if (F) m.frame = { land: F.land.map((v) => +v.toFixed(3)), figThird: F.figThird, prop: F.prop?.t || null, propThird: F.propThird, balThird: F.balThird };
  return { m, P, route, gate, lead, ring, spawnVis, thrVis, mid, S, G, F };
}

const inB = (v, [lo, hi]) => v != null && v >= lo - 1e-9 && v <= hi + 1e-9;
const bandDist = (v, [lo, hi]) => (v == null ? 0 : v < lo ? lo - v : v > hi ? v - hi : 0);

export function cost(m) {
  let c = 0;
  c += 6 * bandDist(m.spawnIso, BAND.spawnIso);
  if (m.reveal != null) c += 3 * Math.max(0, BAND.reveal[0] - m.reveal);
  if (m.fig.spawn === false) c += 1.5;
  if (m.fig.threshold === false) c += 1.5;
  if (m.fig.mid === false) c += 0.75;
  if (m.fig.route != null) c += Math.max(0, 0.7 - m.fig.route);
  c += 1 * m.dead;
  c += 0.25 * bandDist(m.route, BAND.route);
  c += 0.2 * bandDist(m.choice, BAND.choice);
  if (m.thrIso != null) c += 0.5 * (1 - m.thrIso);
  return c;
}

export const done = (m) => m.fig.spawn !== false && m.fig.threshold !== false && m.spawnIso >= BAND.spawnIso[0] && m.dead === 0;

const pct = (v) => (v == null ? "n/a" : `${(v * 100).toFixed(0)}%`);
const yn = (v) => (v == null ? "n/a" : v ? "yes" : "no");
const mark = (ok) => (ok == null ? "n/a" : ok ? "pass" : "FAIL");
const T = (t) => (t ? ["L", "M", "R"][t[0]] + ["t", "m", "b"][t[1]] : "n/a");

export function rows(m) {
  const f = m.frame;
  const shortShare = m.lips.runs ? m.lips.short / m.lips.runs : 0;
  return [
    ["spawn isovist", `${pct(m.spawnIso)} of ${m.walk} from ${m.spawn}`, "33-55%", mark(inB(m.spawnIso, BAND.spawnIso))],
    ["threshold isovist", m.threshold ? `${pct(m.thrIso)} from ${m.threshold}, reveal ${pct(m.reveal)}` : "no threshold", "reveal>20%", m.reveal == null ? "n/a" : mark(m.reveal > BAND.reveal[0])],
    ["figure visible", `spawn ${yn(m.fig.spawn)}, threshold ${yn(m.fig.threshold)}, mid ${yn(m.fig.mid)}, route ${pct(m.fig.route)}`, "all, 70%", m.fig.spawn == null ? "n/a" : mark(m.fig.spawn && m.fig.threshold !== false && m.fig.mid && m.fig.route >= 0.7)],
    ["districts (8+ cells)", `${m.districts} of ${m.plateaus} plateaus, fill ${m.fills.join("/")}`, "3-5, >0.7", mark(inB(m.districts, BAND.districts) && m.fills.every((v) => v > 0.7))],
    ["edge continuity", `${m.lips.cliff} cliff / ${m.lips.ramp} ramp lip edges, ${m.lips.short}/${m.lips.runs} 1-cell runs, ${m.lips.rimRamps} rim ramps`, "<15% 1-cell", mark(shortShare < 0.15)],
    ["frame balance", f ? `figure ${T(f.figThird)}, ${f.prop} ${T(f.propThird)}, mass ${T(f.balThird)}, land off ${f.land.map((v) => v.toFixed(2)).join(",")}` : "no view", "fig M, land<12%", f ? mark(f.figThird?.[0] === 1 && f.balThird?.[0] === 1 && Math.abs(f.land[0]) <= 0.12 && Math.abs(f.land[1]) <= 0.12) : "n/a"],
    ["route and detour", m.fig.spawn == null ? "no figure" : `${m.route} steps, straight ${m.straight}, ratio ${m.detour == null ? "n/a" : m.detour.toFixed(2)}`, "9-16, 1.3-1.8", m.fig.spawn == null ? "n/a" : mark(inB(m.route, BAND.route)) + (inB(m.detour, BAND.detour) ? "" : "*")],
    ["region graph", `${m.nodes} nodes, ${m.edges} edges, ${m.loops} loops, reach ${m.reach}/${m.walk}`, "", m.reach === m.walk ? "pass" : "FAIL"],
    ["choice points", `${m.choice}`, "2-4", m.fig.spawn == null ? "n/a" : mark(inB(m.choice, BAND.choice))],
    ["dead ends", `${m.dead} unpaid of ${m.leaves} leaves${m.deadAt.length ? " " + m.deadAt.join(" ") : ""}`, "0", mark(m.dead === 0)],
  ];
}

export const table = (m) => rows(m).map((r) => r.map((c, i) => String(c).padEnd([22, 70, 16, 4][i])).join(" ")).join("\n");

export async function overlay(R, level, render, out) {
  const meta = await sharp(render).metadata();
  const S = screen(level, meta.width, meta.height);
  const g = (x, z) => (R.P.cell(x, z)?.h || 0) * TILE;
  const diamond = (x, z) => [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]].map(([a, b]) => S(a, g(x, z) + 0.02, b).map((v) => v.toFixed(1)).join(",")).join(" ");
  const parts = [];
  for (const [x, z] of R.P.walk) {
    const seen = R.spawnVis.has(key(x, z));
    parts.push(`<polygon points="${diamond(x, z)}" fill="${seen ? "#21d07a" : "#ff3b5c"}" fill-opacity="${seen ? 0.42 : 0.2}"/>`);
  }
  const top = (x, z) => S(x + 0.5, g(x, z) + 0.1, z + 0.5);
  if (R.route.length) parts.push(`<polyline points="${R.route.map(([x, z]) => top(x, z).join(",")).join(" ")}" fill="none" stroke="#ffffff" stroke-width="6" stroke-opacity="0.9" stroke-dasharray="12 6"/>`);
  if (R.lead) {
    const fc = cellsOf(R.lead), hgt = CATALOG[R.lead.t]?.height ?? 2;
    const fx = fc.reduce((a, c) => a + c[0] + 0.5, 0) / fc.length, fz = fc.reduce((a, c) => a + c[1] + 0.5, 0) / fc.length;
    const F = S(fx, g(fc[0][0], fc[0][1]) + hgt * 0.75, fz);
    const from = [["spawn", level.spawn], ["threshold", R.gate?.threshold], ["mid", R.mid]].filter((e) => e[1]);
    for (const [nm, c] of from) {
      const ok = R.S.seesFigure(c, R.lead);
      const E = S(c[0] + 0.5, g(...c) + EYE, c[1] + 0.5);
      parts.push(`<line x1="${E[0]}" y1="${E[1]}" x2="${F[0]}" y2="${F[1]}" stroke="${ok ? "#ffd400" : "#ff2a2a"}" stroke-width="4" stroke-dasharray="${ok ? "0" : "8 6"}"/>`);
      parts.push(`<circle cx="${E[0]}" cy="${E[1]}" r="8" fill="${ok ? "#ffd400" : "#ff2a2a"}" stroke="#000" stroke-width="2"/><text x="${E[0] + 10}" y="${E[1] - 8}" font-family="Helvetica" font-size="15" font-weight="bold" fill="#111">${nm}</text>`);
    }
    parts.push(`<circle cx="${F[0]}" cy="${F[1]}" r="10" fill="none" stroke="#ffd400" stroke-width="4"/>`);
  }
  const m = R.m;
  parts.push(`<rect x="8" y="8" width="560" height="62" fill="#000" fill-opacity="0.65"/><text x="18" y="32" font-family="Helvetica" font-size="17" fill="#fff">spawn isovist ${pct(m.spawnIso)}  reveal ${pct(m.reveal)}  dead ends ${m.dead}  route ${m.route}</text><text x="18" y="56" font-family="Helvetica" font-size="14" fill="#fff">green seen from spawn, red unseen, route dashed white, sightlines yellow (clear) or red (blocked)</text>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${parts.join("")}</svg>`;
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
  await sharp(render).composite([{ input: Buffer.from(svg) }]).png().toFile(path.resolve(root, out));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
  const render = opt("--render"), out = opt("--overlay");
  const json = args.includes("--json") ? (args.splice(args.indexOf("--json"), 1), true) : false;
  if (!args.length) { console.error("usage: node tools/loops/layout-metrics.mjs <level>[,<level>...] [--render png --overlay out.png] [--json]"); process.exit(2); }
  const all = {};
  for (const name of args[0].split(",")) {
    const { level } = await loadLevel(name);
    const R = measure(level);
    all[name] = R.m;
    if (render && out) await overlay(R, level, path.resolve(root, render), out);
    if (!json) console.log(`\n${name}  cost ${cost(R.m).toFixed(3)}\n${table(R.m)}`);
  }
  if (json) console.log(JSON.stringify(all, null, 1));
}
