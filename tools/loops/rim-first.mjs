import { analyse, cost, passes, decorPass, hash, BANDS } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { CATALOG } from "../../core/catalog.js";
import { DIRS } from "../../core/level.js";

const key = (x, z) => `${x},${z}`;
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const LOW = 0.6;

export function stalled(m) {
  return !passes(m) && m.density.figure != null && m.density.rim != null && m.density.rim >= m.density.figure - 1e-9 && (m.density.all ?? 0) < BANDS.all[1];
}

function lowTypes(level, A) {
  const roles = level.palette?.props || {};
  const ok = (t) => { const s = CATALOG[t]; return s && !s.mask && !s.attach && !s.floats && s.footprint[0] === 1 && s.footprint[1] === 1 && (s.height ?? 0) > 0.12 && (s.height ?? 0) <= LOW && !["lead", "creature"].includes(roles[t]?.role) && !/^(coin|gem|star|heart|marker)$/.test(t); };
  const ts = [...new Set(A.props.filter((p) => !p.fixed).map((p) => p.d.t))].filter(ok);
  if (Array.isArray(level.palette?.rock)) for (const t of ["rock"]) if (ok(t) && !ts.includes(t)) ts.push(t);
  return ts;
}

function forbidden(level, A) {
  const out = new Set([...A.route.map((c) => key(...c)), key(...level.spawn), ...A.thingSet]);
  for (const g of A.gateCells) out.add(key(...g));
  for (const d of level.decor) if (d.gapX != null) out.add(key(d.gapX, d.gapZ));
  for (const [x, z, dir] of A.ramps) { const [dx, dz] = DIRS[dir] || [0, 0]; out.add(key(x + dx, z + dz)); out.add(key(x - dx, z - dz)); }
  return out;
}

function inFront(A, x, z) {
  return A.figCells.some(([p, q]) => x + z > p + q && Math.abs(x - p) <= 2 && Math.abs(z - q) <= 2 && Math.abs((x - z) - (p - q)) <= 2);
}

export function rimFirst(level, o = {}) {
  const log = o.log || [];
  const seed = o.seed ?? 1;
  const A0 = analyse(level, { brief: o.brief });
  const m0 = A0.metrics;
  if (!stalled(m0)) return { applied: false, before: m0, after: m0, moves: [] };
  const lead = A0.lead, snapshot = JSON.stringify(level.decor), c0 = cost(m0);
  const valid = (A) => A.metrics.missing <= m0.missing && A.route.length && A.route.length <= A0.route.length && A.metrics.fit.length <= m0.fit.length && A.metrics.xrayRun <= Math.max(3, m0.xrayRun) && !A.props.some((p) => !p.fixed && p.cells.some((c) => A0.routeSet.has(key(...c))));
  const moves = [];
  for (let it = 0; it < 40; it++) {
    const A = analyse(level, { brief: o.brief, lead });
    if (!A.metrics.rimOverFigure && A.metrics.density.rim < A.metrics.density.figure) break;
    const rim = A.props.filter((p) => !p.fixed && p.zone === "rim");
    if (!rim.length) break;
    const occ = new Set(level.decor.map((d) => key(d.x, d.z)));
    const rank = (p) => (p.cluster.length === 1 ? 0 : p.cluster.length >= 3 ? 1 : 2);
    const crowd = (p) => p.cells.reduce((s, [x, z]) => s + N8.filter(([dx, dz]) => occ.has(key(x + dx, z + dz))).length, 0);
    rim.sort((a, b) => rank(a) - rank(b) || crowd(b) - crowd(a) || hash(seed, a.d.x, a.d.z, 91) - hash(seed, b.d.x, b.d.z, 91));
    const p = rim[0];
    level.decor.splice(level.decor.indexOf(p.d), 1);
    moves.push(`thin rim: drop ${p.d.t} ${p.d.x},${p.d.z}`);
  }
  for (const zone of ["figure", "approach"]) {
    for (let it = 0; it < 12; it++) {
      const A = analyse(level, { brief: o.brief, lead });
      const want = BANDS[zone];
      if (A.metrics.density[zone] == null || A.metrics.density[zone] >= want[1] - 0.02) break;
      const types = lowTypes(level, A);
      if (!types.length) break;
      const bad = forbidden(level, A), occ = new Set(level.decor.flatMap((d) => [key(d.x, d.z)]));
      const cells = A.walk.filter(([x, z]) => A.zoneMap.get(key(x, z)) === zone && !bad.has(key(x, z)) && !occ.has(key(x, z)) && !inFront(A, x, z) && !A.figCells.some((f) => cheb(f, [x, z]) < 1) && A.land(A.cell(x, z)) && !["ramp", "bridge"].includes(A.cell(x, z).s));
      const c1 = cost(A.metrics);
      let best = null;
      for (const [x, z] of cells.sort((a, b) => hash(seed, ...a, it) - hash(seed, ...b, it)).slice(0, 16)) {
        const near = new Set(level.decor.filter((d) => cheb([d.x, d.z], [x, z]) <= 1).map((d) => d.t));
        for (const t of [...types].sort((a, b) => near.has(a) - near.has(b) || hash(seed, x, z, a.length) - hash(seed, x, z, b.length))) {
          const s = CATALOG[t];
          const d = { t, x, z, v: Math.floor(hash(seed, x, z, 41) * (s.variants || 1)), rot: s.rotates ? Math.floor(hash(seed, x, z, 42) * 4) : 0, ox: +((hash(seed, x, z, 43) - 0.5) * 0.24).toFixed(2), oz: +((hash(seed, x, z, 44) - 0.5) * 0.24).toFixed(2) };
          level.decor.push(d);
          const B = analyse(level, { brief: o.brief, lead });
          level.decor.pop();
          if (!valid(B) || B.metrics.rimOverFigure) continue;
          const c = cost(B.metrics);
          if (c < c1 - 1e-6 && (!best || c < best.c)) best = { d, c };
          break;
        }
      }
      if (!best) break;
      level.decor.push(best.d);
      moves.push(`refill ${zone}: add ${best.d.t} ${best.d.x},${best.d.z} (cost ${best.c.toFixed(3)})`);
    }
  }
  const r = decorPass(level, { brief: o.brief, seed, iterations: o.iterations ?? 40, log: [] });
  const A1 = analyse(level, { brief: o.brief, lead });
  const c1 = cost(A1.metrics);
  if (!(c1 < c0 - 1e-6) || !valid(A1)) {
    level.decor = JSON.parse(snapshot);
    log.push(`rim-first: ${moves.length} moves then ${r.moves.length} loop moves, cost ${c0.toFixed(3)} -> ${c1.toFixed(3)}, kept the original`);
    return { applied: false, before: m0, after: m0, moves: [] };
  }
  log.push(`rim-first: ${moves.length} moves then ${r.moves.length} loop moves, cost ${c0.toFixed(3)} -> ${c1.toFixed(3)}, ${passes(A1.metrics) ? "in band" : "not in band"}`);
  return { applied: true, before: m0, after: A1.metrics, moves: [...moves, ...r.moves] };
}
