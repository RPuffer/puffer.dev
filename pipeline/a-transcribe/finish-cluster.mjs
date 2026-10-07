import { CATALOG, blockedCells, maskCells } from "../../core/catalog.js";
import { reachability } from "../../core/procgen.js";
import { DIRS, canStep } from "../../core/level.js";

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIR_OF = (dx, dz) => Object.keys(DIRS).find((d) => DIRS[d][0] === dx && DIRS[d][1] === dz);
const key = (x, z) => `${x},${z}`;
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const TILE = 1.5;

export const BANDS = { figure: [0.15, 0.4], approach: [0.15, 0.35], threshold: [0.2, 0.5], rim: [0.2, 0.35], all: [0.25, 0.35] };
export const TYPE_MAX = 0.35;
export const SINGLETON_MAX = 0.15;

const FAMILIES = [
  ["bone", /bone|skull|horn|fin\b|crest|rib|tusk|fang|claw/],
  ["fire", /torch|lantern|fire|flame|ember|vent|brazier|lava|coal|candle/],
  ["stone", /rock|stone|boulder|cairn|basalt|obsidian|slab|plinth|pillar|monolith/],
  ["wood", /barrel|crate|log|stump|fence|plank|wood|chest|sign|well/],
  ["plant", /tree|bush|flower|mushroom|plant|fern|vine|root|tuft|bristle/],
  ["vessel", /pot\b|urn|jar|basket|bowl/],
  ["star", /star|doodle|spire|staff/],
];
export const family = (t, props = {}) => {
  const s = `${t} ${props[t]?.variant_of || ""}`.toLowerCase().replace(/[_-]/g, " ");
  return (FAMILIES.find(([, re]) => re.test(s)) || [t])[0];
};

export const hash = (seed, a = 0, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519 + seed * 3266489917) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const seedOf = (s) => [...String(s)].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);

const cellsOf = (d) => {
  const spec = CATALOG[d.t];
  if (!spec) return [[d.x, d.z]];
  if (spec.mask) return maskCells(d.t, d.x, d.z, d.rot || 0).map((m) => [m.x, m.z]);
  const [fw, fd] = (d.rot || 0) % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
  const out = [];
  for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) out.push([d.x + dx, d.z + dz]);
  return out;
};

const thingCells = (th) => {
  const [w, d] = th.size || [1, 1], out = [];
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push([th.x + dx, th.z + dz]);
  for (const c of [...(th.blocks || []), ...(th.threshold || [])]) out.push(c);
  return out;
};

export function analyse(level, o = {}) {
  const [W, D] = level.size;
  const props0 = level.palette?.props || {};
  const cell = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  const land = (c) => !!c && c.s !== "none" && c.s !== "water" && c.h >= 1;
  const roleOf = (t) => props0[t]?.role || null;
  const lead = o.lead !== undefined ? o.lead : level.decor.filter((d) => ["lead", "creature"].includes(roleOf(d.t))).sort((a, b) => cellsOf(b).length - cellsOf(a).length)[0] || null;
  const figCells = lead ? cellsOf(lead) : [];
  const figSet = new Set(figCells.map((c) => key(...c)));
  const kindOf = (d) => {
    const spec = CATALOG[d.t] || {};
    if (d === lead) return "figure";
    if (spec.passable && (spec.height ?? 0) <= 0.12) return "floor";
    if (spec.passable && spec.mask && spec.mask.every((m) => m.pass && (m.h ?? 0) <= 0.12)) return "floor";
    if (spec.floats || /^(coin|gem|star|heart)$/.test(d.t)) return "pickup";
    return "prop";
  };
  const fixedOf = (d) => {
    const spec = CATALOG[d.t] || {};
    return d === lead || ["lead", "creature", "threshold", "light"].includes(roleOf(d.t)) || d.gapX != null || d.axis != null || d.side != null || !!spec.attach || !!spec.mask || cellsOf(d).length > 1 || /^(arch|canopy|torch|lantern|campfire|well|signpost)$/.test(d.t);
  };
  const blocked = new Set();
  for (const d of level.decor) if (CATALOG[d.t] && d.t !== "waterfall") for (const [a, b] of blockedCells(d)) blocked.add(key(a, b));
  const things = (level.things || []).filter((t) => t.x != null);
  for (const t of things) if (t.kind === "bonfire" || t.kind === "chest") blocked.add(key(t.x, t.z));
  const L = { ...level, blocked };
  const reach = reachability(L);
  const thingSet = new Set(things.flatMap(thingCells).map((c) => key(...c)));

  const walk = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (land(cell(x, z)) && !figSet.has(key(x, z))) walk.push([x, z]);

  const goals = new Set();
  for (const [x, z] of figCells) for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz; if (!figSet.has(key(X, Z)) && land(cell(X, Z)) && !blocked.has(key(X, Z))) goals.add(key(X, Z)); }
  const bfs = () => {
    const prev = new Map([[key(...level.spawn), null]]), q = [level.spawn];
    let end = null;
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      if (goals.has(key(x, z))) { end = [x, z]; break; }
      for (const [dx, dz] of N4) {
        const X = x + dx, Z = z + dz;
        if (prev.has(key(X, Z)) || !canStep(L, x, z, DIR_OF(dx, dz))) continue;
        prev.set(key(X, Z), key(x, z));
        q.push([X, Z]);
      }
    }
    if (!end && !goals.size) end = q[q.length - 1];
    if (!end) return [];
    const out = [];
    for (let k = key(...end); k; k = prev.get(k)) out.unshift(k.split(",").map(Number));
    return out;
  };
  const route = bfs();
  const routeSet = new Set(route.map((c) => key(...c)));

  const gatePieces = level.decor.filter((d) => d.t === "arch" || roleOf(d.t) === "threshold" || /gate/.test(d.t));
  const gateCells = [...gatePieces.flatMap(cellsOf), ...things.filter((t) => t.kind === "gate").flatMap(thingCells)].filter((c) => route.some((r) => cheb(r, c) <= 1));
  let gateIdx = -1;
  route.forEach((r, i) => { if (gateIdx < 0 && gateCells.some((c) => cheb(c, r) <= 0)) gateIdx = i; });
  if (gateIdx < 0) route.forEach((r, i) => { if (gateIdx < 0 && gateCells.some((c) => cheb(c, r) <= 1)) gateIdx = i; });

  const zoneOf = (x, z) => {
    if (figCells.some((c) => cheb(c, [x, z]) <= 2)) return "figure";
    if (gateCells.some((c) => cheb(c, [x, z]) <= 1)) return "threshold";
    if (route.some((c) => cheb(c, [x, z]) <= 1)) return "approach";
    return "rim";
  };
  const zones = { figure: 0, threshold: 0, approach: 0, rim: 0 };
  const zoneMap = new Map();
  for (const [x, z] of walk) { const zn = zoneOf(x, z); zones[zn]++; zoneMap.set(key(x, z), zn); }

  const props = [];
  for (const d of level.decor) {
    if (kindOf(d) !== "prop") continue;
    const cs = cellsOf(d);
    const anchor = cs.find((c) => zoneMap.has(key(...c))) || cs[0];
    props.push({ d, cells: cs, zone: zoneMap.get(key(...anchor)) || "rim", fam: family(d.t, props0), h: CATALOG[d.t]?.height ?? 1, fixed: fixedOf(d) });
  }
  const parent = props.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const touch = (i, j) => props[i].cells.some((a) => props[j].cells.some((b) => cheb(a, b) <= 1));
  const stamp = (p) => p.cells.length > 1 || !!CATALOG[p.d.t]?.mask;
  for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) if (!stamp(props[i]) && !stamp(props[j]) && touch(i, j)) parent[find(i)] = find(j);
  props.forEach((p, i) => { if (!stamp(p)) return; const j = props.findIndex((q, k) => k !== i && !stamp(q) && touch(i, k)); if (j >= 0) parent[find(i)] = find(j); });
  const groups = new Map();
  props.forEach((p, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(p); });
  const clusters = [...groups.values()];
  for (const c of clusters) for (const p of c) p.cluster = c;
  const singles = clusters.filter((c) => c.length === 1).map((c) => c[0]);
  const centre = (c) => { const cs = c.flatMap((p) => p.cells); return [cs.reduce((a, q) => a + q[0], 0) / cs.length, cs.reduce((a, q) => a + q[1], 0) / cs.length]; };
  const cents = clusters.map(centre);
  const nn = cents.map((a, i) => Math.min(...cents.filter((_, j) => j !== i).map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))));
  const multi = clusters.filter((c) => c.length >= 2);
  const sameShare = (c) => { const n = {}; for (const p of c) n[p.fam] = (n[p.fam] || 0) + 1; return Math.max(...Object.values(n)) / c.length; };
  const big = clusters.filter((c) => c.length >= 3);

  const density = {};
  for (const zn of Object.keys(zones)) density[zn] = zones[zn] ? props.filter((p) => p.zone === zn).length / zones[zn] : null;
  density.all = walk.length ? props.length / walk.length : 0;

  const end = gateIdx > 0 ? gateIdx : route.length - 1;
  const hits = [0];
  for (let i = 1; i <= end; i++) if (props.some((p) => p.cells.some((c) => cheb(c, route[i]) <= 1))) hits.push(i);
  hits.push(end);
  let trailGap = 0;
  for (let i = 1; i < hits.length; i++) trailGap = Math.max(trailGap, hits[i] - hits[i - 1]);

  const ramps = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (cell(x, z).s === "ramp") ramps.push([x, z, cell(x, z).d]);
  const fit = [];
  for (const d of level.decor) {
    const spec = CATALOG[d.t];
    if (!spec || d === lead) continue;
    if (d.t === "waterfall") {
      const c = cell(d.x, d.z);
      const hi = N4.some(([dx, dz]) => { const n = cell(d.x + dx, d.z + dz); return n && n.s !== "none" && n.h > (c?.h ?? 0); });
      if (!c || c.s !== "water" || !hi) fit.push(`${d.t}@${d.x},${d.z} not water under a cliff`);
      continue;
    }
    if (spec.attach === "cliff") { const c = cell(d.x, d.z); if (!N4.some(([dx, dz]) => (cell(d.x + dx, d.z + dz)?.h ?? 0) !== (c?.h ?? 0))) fit.push(`${d.t}@${d.x},${d.z} no cliff`); continue; }
    if (spec.attach) continue;
    for (const [x, z] of spec.passable ? [] : blockedCells(d)) {
      const c = cell(x, z);
      if (!c) { fit.push(`${d.t}@${d.x},${d.z} off grid`); break; }
      if (c.s === "ramp") { fit.push(`${d.t}@${x},${z} blocks a ramp`); break; }
      if (!land(c) && c.s !== "bridge" && !(c.s === "water" && /rock|stone|log/.test(d.t))) { fit.push(`${d.t}@${x},${z} on ${c.s}`); break; }
    }
  }

  const xrayRun = (() => {
    let run = 0, worst = 0;
    for (const [x, z] of route) {
      const c = cell(x, z);
      const hit = props.some((p) => p.cells.some(([a, b]) => a + b > x + z && a + b <= x + z + 2 && Math.abs((a - b) - (x - z)) <= 1 && (cell(a, b)?.h ?? 0) * TILE + p.h > c.h * TILE + 0.6));
      run = hit ? run + 1 : 0; worst = Math.max(worst, run);
    }
    return worst;
  })();

  const brief = o.brief;
  const stop = new Set(["narrow", "twin", "with", "from", "into", "along", "marking", "where", "dual", "the", "and", "of", "a"]);
  const toks = (s) => String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !stop.has(w)).map((w) => w.replace(/(es|s)$/, ""));
  const types = [...new Set(level.decor.map((d) => d.t))];
  const beatOf = (name, phrase, wantCluster) => {
    const want = toks(phrase);
    const match = types.filter((t) => toks(`${t} ${props0[t]?.summary || ""}`.slice(0, 80)).some((w) => want.includes(w)) && toks(t).some((w) => want.includes(w)));
    const near = props.filter((p) => match.includes(p.d.t) && p.cells.some((c) => route.some((r) => cheb(r, c) <= 2)));
    const ok = wantCluster ? near.some((p) => p.cluster.length >= 2) : near.length > 0 || level.decor.some((d) => match.includes(d.t) && cellsOf(d).some((c) => routeSet.has(key(...c))));
    return { name, phrase, types: match, ok };
  };
  const beats = [];
  if (brief?.approach?.passes) for (const p of brief.approach.passes) beats.push(beatOf("pass", p, true));
  if (brief?.threshold) beats.push(beatOf("threshold", `${brief.threshold.prop || ""} ${brief.threshold.kind || ""}`, false));

  return {
    W, D, cell, land, lead, figCells, route, routeSet, gateCells, gateIdx, zones, zoneMap, walk, props, clusters, singles, ramps, reach, blocked, thingSet, things,
    metrics: {
      props: props.length, walk: walk.length,
      density, zones,
      singletonShare: props.length ? singles.length / props.length : 0, singletons: singles.length,
      clusters: clusters.length, multi: multi.length, largest: Math.max(0, ...clusters.map((c) => c.length)),
      spacing: cents.length > 1 ? nn.reduce((a, v) => a + v, 0) / nn.length : null,
      similar: big.length ? big.filter((c) => sameShare(c) >= 2 / 3).length / big.length : null,
      mixed: multi.filter((c) => sameShare(c) < 2 / 3).length,
      types: Object.fromEntries(Object.entries(props.reduce((a, p) => ((a[p.d.t] = (a[p.d.t] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])),
      typeShare: props.length ? Math.max(...Object.values(props.reduce((a, p) => ((a[p.d.t] = (a[p.d.t] || 0) + 1), a), {}))) / props.length : 0,
      mono: multi.filter((c) => c.filter((p) => !p.fixed).length >= 2 && new Set(c.filter((p) => !p.fixed).map((p) => p.d.t)).size === 1).length,
      rimOverFigure: density.rim != null && density.figure != null ? Math.max(0, density.rim - density.figure) : 0,
      oversize: clusters.reduce((a, c) => a + Math.max(0, c.filter((p) => !p.fixed).length - 4) + Math.max(0, c.length - 6), 0),
      trailGap, fit, xrayRun, route: route.length, reach: `${reach.reached}/${reach.total}`, missing: reach.missing.length,
      beats,
    },
  };
}

const bandDist = (v, [lo, hi]) => (v == null ? 0 : v < lo ? lo - v : v > hi ? v - hi : 0);

export function cost(m) {
  let c = 3 * m.singletonShare + 5 * bandDist(m.density.all, BANDS.all);
  for (const zn of ["figure", "threshold", "approach", "rim"]) c += (zn === "figure" ? 8 : 4) * bandDist(m.density[zn], BANDS[zn]);
  c += 0.25 * Math.max(0, m.trailGap - 3) + 1 * m.fit.length + 0.25 * m.mono + 4 * Math.max(0, m.typeShare - TYPE_MAX) + 6 * m.rimOverFigure + 0.3 * m.oversize + 0.5 * Math.max(0, m.xrayRun - 3);
  c += 0.4 * m.beats.filter((b) => !b.ok).length;
  return c;
}

export const passes = (m) => m.singletonShare < SINGLETON_MAX && m.typeShare <= TYPE_MAX && !m.rimOverFigure && !m.mono && ["figure", "threshold", "approach", "rim", "all"].every((zn) => bandDist(m.density[zn], BANDS[zn]) === 0);

export function decorPass(level, o = {}) {
  const log = o.log || [];
  const seed = o.seed ?? seedOf(level.name || "level");
  const maxIter = o.iterations ?? 40;
  const A0 = analyse(level, { brief: o.brief });
  const lead = A0.lead;
  const base = A0.metrics;
  const baseRoute = A0.route.map((c) => key(...c));
  const baseRouteSet = new Set(baseRoute);
  const props0 = level.palette?.props || {};
  const fam = (t) => family(t, props0);
  const forbid = new Set([...baseRoute, key(...level.spawn), ...A0.thingSet]);
  for (const g of A0.gateCells) forbid.add(key(...g));
  for (const d of level.decor) if (d.gapX != null) forbid.add(key(d.gapX, d.gapZ));
  for (const [x, z, dir] of A0.ramps) { const [dx, dz] = DIRS[dir] || [0, 0]; forbid.add(key(x + dx, z + dz)); forbid.add(key(x - dx, z - dz)); }
  const islandTypes = [...new Set(A0.props.filter((p) => !p.fixed).map((p) => p.d.t))].filter((t) => CATALOG[t] && CATALOG[t].footprint[0] === 1 && CATALOG[t].footprint[1] === 1);
  const ok1 = (t) => { const sp = CATALOG[t]; return sp && !sp.mask && !sp.attach && !sp.floats && sp.footprint[0] === 1 && sp.footprint[1] === 1 && (sp.height ?? 0) > 0.12 && !["lead", "creature"].includes(props0[t]?.role) && !/^(coin|gem|star|heart|marker)$/.test(t); };
  const named = [...(o.brief?.motifs || []), ...(o.brief?.creatures || [])].map((m) => (CATALOG[m.name] ? m.name : m.type && CATALOG[m.type] ? m.type : null)).filter(Boolean);
  const generic = [...(level.palette?.rock ? ["rock", "rock-big"] : []), ...(level.palette?.mushroomStem || level.palette?.cap ? ["mushroom"] : [])];
  const pool = [...new Set([...named, ...islandTypes, ...generic])].filter(ok1).map((t, i) => [t, hash(seed, i, t.length, 71)]).sort((a, b) => a[1] - b[1]).map((e) => e[0]);
  let rr = 0;
  const small = (t) => CATALOG[t].passable || CATALOG[t].height <= 0.6;
  const chooseTypes = (A, x, z, occ, inCluster = new Set(), n = 3) => {
    const out = [];
    for (const strict of [2, 1, 0]) for (let k = 0; k < pool.length && out.length < n; k++) {
      const t = pool[(rr + k) % pool.length];
      if (out.includes(t) || !admit(A, t, x, z, occ, inCluster, strict)) continue;
      out.push(t);
    }
    return out;
  };
  const admit = (A, t, x, z, occ, inCluster, strict) => {
    const near = A0.route.some((r) => cheb(r, [x, z]) <= 1) || A.zoneMap.get(key(x, z)) === "figure";
    const count = A.props.filter((p) => p.d.t === t).length;
    if (!placeable(t, x, z, occ)) return false;
    if ((count + 1) / (A.props.length + 1) > TYPE_MAX && A.props.length >= 6) return false;
    if (strict >= 1 && inCluster.has(t) && inCluster.size < 3) return false;
    if (strict >= 1 && inCluster.size >= 3 && !inCluster.has(t)) return false;
    if (strict === 2 && near !== small(t)) return false;
    return true;
  };
  const chooseType = (A, x, z, occ, inCluster = new Set()) => {
    const near = A0.route.some((r) => cheb(r, [x, z]) <= 1) || A.zoneMap.get(key(x, z)) === "figure";
    const count = (t) => A.props.filter((p) => p.d.t === t).length;
    for (const strict of [2, 1, 0]) for (let k = 0; k < pool.length; k++) {
      const t = pool[(rr + k) % pool.length];
      if (!placeable(t, x, z, occ)) continue;
      if ((count(t) + 1) / (A.props.length + 1) > TYPE_MAX && A.props.length >= 6) continue;
      if (strict >= 1 && inCluster.has(t) && inCluster.size < 3) continue;
      if (strict >= 1 && inCluster.size >= 3 && !inCluster.has(t)) continue;
      if (strict === 2 && near !== small(t)) continue;
      return t;
    }
    return null;
  };
  const mk = (t, x, z, salt = 0) => { const spec = CATALOG[t]; return { t, x, z, v: Math.floor(hash(seed, x, z, 41 + salt) * (spec.variants || 1)), rot: spec.rotates ? Math.floor(hash(seed, x, z, 42) * 4) : 0, ox: +((hash(seed, x, z, 43) - 0.5) * 0.24).toFixed(2), oz: +((hash(seed, x, z, 44) - 0.5) * 0.24).toFixed(2) }; };
  const typesOf = (c) => new Set((c || []).filter((p) => !p.fixed).map((p) => p.d.t));

  const occupied = () => { const s = new Set(); for (const d of level.decor) for (const c of cellsOf(d)) s.add(key(...c)); return s; };
  const placeable = (t, x, z, occ, ignore) => {
    const c = A0.cell(x, z), spec = CATALOG[t];
    if (!spec || !A0.land(c) || c.s === "ramp" || c.s === "bridge") return false;
    const k = key(x, z);
    if (forbid.has(k) || (occ.has(k) && k !== ignore)) return false;
    if (A0.figCells.some(([p, q]) => (cheb([p, q], [x, z]) <= 1) || (spec.height >= 1 && x + z > p + q && Math.abs(x - p) <= 2 && Math.abs(z - q) <= 2 && Math.abs((x - z) - (p - q)) <= 2))) return false;
    if (!spec.passable && N4.some(([dx, dz]) => baseRouteSet.has(key(x + dx, z + dz))) && spec.height >= 1.2) return false;
    return true;
  };

  const valid = (A) => {
    const m = A.metrics;
    if (m.missing > base.missing) return false;
    if (!A.route.length || A.route.length > base.route) return false;
    if (A.props.some((p) => !p.fixed && p.cells.some((c) => baseRouteSet.has(key(...c))))) return false;
    if (m.fit.length > base.fit.length) return false;
    if (m.xrayRun > Math.max(3, base.xrayRun)) return false;
    if (m.typeShare > Math.max(TYPE_MAX, base.typeShare) + 1e-9) return false;
    return true;
  };
  const evalNow = () => { const A = analyse(level, { brief: o.brief, lead }); return valid(A) ? { A, c: cost(A.metrics) } : null; };

  let cur = { A: A0, c: cost(base) };
  const done = [];
  for (let it = 0; it < maxIter; it++) {
    if (passes(cur.A.metrics)) break;
    const A = cur.A, occ = occupied();
    const cands = [];
    const movable = A.props.filter((p) => !p.fixed);
    const order = (arr, salt) => arr.map((p, i) => [p, hash(seed, it, i, salt)]).sort((a, b) => a[1] - b[1]).map((e) => e[0]);
    for (const s of order(A.singles.filter((p) => !p.fixed), 1)) {
      const [sx, sz] = s.cells[0];
      const targets = [];
      for (const p of A.props) {
        if (p === s) continue;
        for (const [px, pz] of p.cells) for (const [dx, dz] of N8) {
          const x = px + dx, z = pz + dz;
          if (!placeable(s.d.t, x, z, occ, key(sx, sz))) continue;
          if (s.cells.some((c) => cheb(c, [x, z]) === 0)) continue;
          const pen = (p.d.t === s.d.t ? 1 : 0) + (p.fam === s.fam ? 0 : 0.5) + (p.fixed ? 1 : 0) + Math.hypot(x - sx, z - sz) * 0.2 + hash(seed, x, z, it) * 0.1;
          targets.push([x, z, pen]);
        }
      }
      targets.sort((a, b) => a[2] - b[2]);
      for (const [x, z] of targets.slice(0, 10)) cands.push({ kind: "gather", desc: `${s.d.t} ${sx},${sz} -> ${x},${z}`, apply: () => { const ox = s.d.x, oz = s.d.z; s.d.x = x; s.d.z = z; return () => { s.d.x = ox; s.d.z = oz; }; } });
    }
    const addAround = (anchor, kind, salt) => {
      const out = [];
      for (const [ax, az] of anchor.cells) for (const [dx, dz] of N8) {
        const x = ax + dx, z = az + dz;
        if (occ.has(key(x, z)) || out.some((q) => q[0] === x && q[1] === z)) continue;
        out.push([x, z, hash(seed, x, z, it + salt)]);
      }
      out.sort((a, b) => a[2] - b[2]);
      let n = 0;
      for (const [x, z] of out) {
        if (n >= 4) break;
        const ts = chooseTypes(A, x, z, occ, typesOf(anchor.cluster));
        if (!ts.length) continue;
        n++;
        for (const t of ts) { const d = mk(t, x, z); cands.push({ kind, t: [t], desc: `add ${t} ${x},${z} by ${anchor.d.t}`, apply: () => { level.decor.push(d); return () => { level.decor.splice(level.decor.indexOf(d), 1); }; } }); }
      }
    };
    if (pool.length && A.metrics.density.all < BANDS.all[1]) {
      for (const sgl of order(A.singles, 2)) addAround(sgl, "fill", 3);
      for (const c of order(A.clusters.filter((c) => c.length >= 2 && c.filter((p) => !p.fixed).length < 4), 4)) addAround(c.find((p) => !p.fixed) || c[0], "grow", 5);
      const lowZones = ["figure", "threshold", "approach", "rim"].filter((zn) => A.metrics.density[zn] != null && A.metrics.density[zn] < BANDS[zn][1]);
      const edge = [];
      for (const p of A.props) for (const [px, pz] of p.cells) for (const [dx, dz] of N8) {
        const x = px + dx, z = pz + dz;
        if (occ.has(key(x, z)) || !lowZones.includes(A.zoneMap.get(key(x, z))) || edge.some((q) => q[0] === x && q[1] === z)) continue;
        edge.push([x, z, p, (A.zoneMap.get(key(x, z)) === "figure" ? 0 : 1) + hash(seed, x, z, it + 13)]);
      }
      edge.sort((a, b) => a[3] - b[3]);
      let ne = 0;
      for (const [x, z, p] of edge) {
        if (ne >= 12) break;
        const ts = chooseTypes(A, x, z, occ, typesOf(p.cluster));
        if (!ts.length) continue;
        ne++;
        for (const t of ts) { const d = mk(t, x, z); cands.push({ kind: "extend", t: [t], desc: `add ${t} ${x},${z} (${A.zoneMap.get(key(x, z))}) by ${p.d.t}`, apply: () => { level.decor.push(d); return () => { level.decor.splice(level.decor.indexOf(d), 1); }; } }); }
      }
      const spots = A.walk.filter(([x, z]) => !A.props.some((p) => p.cells.some((c) => cheb(c, [x, z]) <= 1))).map(([x, z]) => [x, z, hash(seed, x, z, it + 7)]).sort((a, b) => a[2] - b[2]);
      let n = 0;
      for (const [x, z] of spots) {
        if (n >= 8) break;
        const t0 = chooseType(A, x, z, occ);
        if (!t0) continue;
        let mate = null, t1 = null;
        for (const [dx, dz] of N8) { const X = x + dx, Z = z + dz; if (occ.has(key(X, Z))) continue; const occ2 = new Set([...occ, key(x, z)]); t1 = chooseType(A, X, Z, occ2, new Set([t0])); if (t1) { mate = [X, Z]; break; } }
        if (!mate) continue;
        n++;
        const ds = [mk(t0, x, z), mk(t1, ...mate, 1)];
        cands.push({ kind: "vignette", t: [t0, t1], desc: `pair ${t0} ${x},${z} + ${t1} ${mate.join(",")}`, apply: () => { level.decor.push(...ds); return () => { for (const d of ds) level.decor.splice(level.decor.indexOf(d), 1); }; } });
      }
    }
    for (const p of order(movable.filter((p) => A.metrics.typeShare > TYPE_MAX && A.metrics.types[p.d.t] / A.metrics.props > TYPE_MAX), 8).slice(0, 6)) {
      const occ2 = new Set([...occ].filter((k) => k !== key(p.d.x, p.d.z)));
      const t = chooseType(A, p.d.x, p.d.z, occ2, typesOf(p.cluster.filter((q) => q !== p)));
      if (t && t !== p.d.t) cands.push({ kind: "swap", t: [t], desc: `${p.d.t} ${p.d.x},${p.d.z} -> ${t}`, apply: () => { const was = p.d.t; p.d.t = t; return () => { p.d.t = was; }; } });
    }
    for (const c of A.clusters.filter((c) => c.filter((p) => !p.fixed).length >= 2 && typesOf(c).size === 1)) {
      const p = c.filter((q) => !q.fixed)[1];
      const occ2 = new Set([...occ].filter((k) => k !== key(p.d.x, p.d.z)));
      const t = chooseType(A, p.d.x, p.d.z, occ2, typesOf(c));
      if (t && t !== p.d.t) cands.push({ kind: "swap", t: [t], desc: `${p.d.t} ${p.d.x},${p.d.z} -> ${t}`, apply: () => { const was = p.d.t; p.d.t = t; return () => { p.d.t = was; }; } });
    }
    if (A.metrics.rimOverFigure) for (const p of order(movable.filter((p) => p.zone === "rim"), 9).slice(0, 8)) cands.push({ kind: "thin", desc: `drop ${p.d.t} ${p.d.x},${p.d.z} (rim over figure)`, apply: () => { const i = level.decor.indexOf(p.d); level.decor.splice(i, 1); return () => level.decor.splice(i, 0, p.d); } });
    for (const zn of ["figure", "rim", "approach", "threshold", "all"]) {
      if (bandDist(A.metrics.density[zn], BANDS[zn]) === 0 || A.metrics.density[zn] < BANDS[zn][1]) continue;
      for (const p of order(movable.filter((p) => zn === "all" || p.zone === zn), 6)) cands.push({ kind: "thin", desc: `drop ${p.d.t} ${p.d.x},${p.d.z} (${p.zone})`, apply: () => { const i = level.decor.indexOf(p.d); level.decor.splice(i, 1); return () => level.decor.splice(i, 0, p.d); } });
    }
    let best = null;
    for (const cand of cands) {
      const undo = cand.apply();
      const r = evalNow();
      undo();
      if (r && r.c < cur.c - 1e-6 && (!best || r.c < best.r.c - 1e-9)) best = { cand, r };
    }
    if (!best) break;
    best.cand.apply();
    if (best.cand.t) rr = (pool.indexOf(best.cand.t[best.cand.t.length - 1]) + 1) % pool.length;
    cur = evalNow();
    done.push(`${best.cand.kind}: ${best.cand.desc} (cost ${cur.c.toFixed(3)})`);
  }
  const m = cur.A.metrics;
  log.push(`pool ${pool.join(" ")}`);
  log.push(`decor loop ${done.length} moves, singletons ${base.singletonShare.toFixed(2)} -> ${m.singletonShare.toFixed(2)}, density ${base.density.all.toFixed(2)} -> ${m.density.all.toFixed(2)}, reach ${m.reach}, ${passes(m) ? "in band" : "not in band"}`);
  return { before: base, after: m, moves: done, pass: passes(m) };
}
