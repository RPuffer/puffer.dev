import { CATALOG, WALKABLE, blockedCells, maskCells } from "../../core/catalog.js";
import { DIRS, canStep } from "../../core/level.js";

export const TILE = 1.5;
export const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const key = (x, z) => `${x},${z}`;
export const DIR_OF = (dx, dz) => Object.keys(DIRS).find((d) => DIRS[d][0] === dx && DIRS[d][1] === dz);

export function roleOf(level, t) {
  return level.palette?.props?.[t]?.role || null;
}

export function leadOf(level) {
  return level.decor.find((d) => ["lead", "creature"].includes(roleOf(level, d.t))) || null;
}

export function cellsOf(d) {
  const spec = CATALOG[d.t];
  if (!spec) return [[d.x, d.z]];
  if (spec.mask) return maskCells(d.t, d.x, d.z, d.rot || 0).map((m) => [m.x, m.z]);
  const [fw, fd] = (d.rot || 0) % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
  const out = [];
  for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) out.push([d.x + dx, d.z + dz]);
  return out;
}

export function thingCells(t) {
  const [w, d] = t.size || [1, 1], out = [];
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push([t.x + dx, t.z + dz]);
  return out;
}

export function prep(level, o = {}) {
  const [W, D] = level.size;
  const cell = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  const land = (c) => !!c && c.h >= 1 && c.s !== "none" && c.s !== "water";
  const blocked = new Set();
  for (const d of level.decor) if (CATALOG[d.t] && d.t !== "waterfall") for (const [a, b] of blockedCells(d)) blocked.add(key(a, b));
  for (const t of level.things || []) {
    const kind = t.kind || t.t;
    if (kind === "gate") { if (o.gateClosed) for (const [a, b] of t.blocks || [[t.x, t.z]]) blocked.add(key(a, b)); }
    else if (kind === "bonfire" || kind === "chest") blocked.add(key(t.x, t.z));
  }
  const L = { ...level, blocked };
  const walkable = (x, z) => { const c = cell(x, z); return !!c && c.h >= 1 && WALKABLE.has(c.s) && !blocked.has(key(x, z)); };
  const step = (x, z, dx, dz) => canStep(L, x, z, DIR_OF(dx, dz));
  const walk = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (walkable(x, z)) walk.push([x, z]);
  return { W, D, cell, land, blocked, L, walkable, step, walk };
}

export function bfs(P, from, goal) {
  const prev = new Map([[key(...from), null]]), q = [from];
  let end = null;
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i];
    if (goal && goal(x, z)) { end = [x, z]; break; }
    for (const [dx, dz] of N4) {
      const X = x + dx, Z = z + dz;
      if (prev.has(key(X, Z)) || !P.step(x, z, dx, dz)) continue;
      prev.set(key(X, Z), key(x, z));
      q.push([X, Z]);
    }
  }
  const path = [];
  if (end) for (let k = key(...end); k; k = prev.get(k)) path.unshift(k.split(",").map(Number));
  return { seen: prev, path };
}

export function figureRing(level, P, lead = leadOf(level)) {
  if (!lead) return [];
  const fig = cellsOf(lead), fs = new Set(fig.map((c) => key(...c))), out = [];
  for (const [x, z] of fig) for (const [dx, dz] of N4) {
    const X = x + dx, Z = z + dz;
    if (!fs.has(key(X, Z)) && P.walkable(X, Z) && !out.some(([a, b]) => a === X && b === Z)) out.push([X, Z]);
  }
  return out;
}

export function regionGraph(level, P = prep(level)) {
  const nodeOf = new Map(), nodes = [];
  const kindOf = (c) => (c.s === "ramp" ? "ramp" : c.s === "bridge" ? "bridge" : "plateau");
  for (const [x, z] of P.walk) {
    if (nodeOf.has(key(x, z))) continue;
    const c0 = P.cell(x, z), kind = kindOf(c0), id = nodes.length;
    const cells = [[x, z]];
    nodeOf.set(key(x, z), id);
    for (let i = 0; i < cells.length; i++) {
      const [a, b] = cells[i];
      for (const [dx, dz] of N4) {
        const X = a + dx, Z = b + dz, k = key(X, Z);
        if (nodeOf.has(k) || !P.walkable(X, Z)) continue;
        const c = P.cell(X, Z);
        if (kindOf(c) !== kind) continue;
        if (kind === "plateau" && c.h !== c0.h) continue;
        if (!P.step(a, b, dx, dz)) continue;
        nodeOf.set(k, id);
        cells.push([X, Z]);
      }
    }
    nodes.push({ id, kind, h: c0.h, cells });
  }
  const adj = nodes.map(() => new Set());
  for (const [x, z] of P.walk) for (const [dx, dz] of N4) {
    const X = x + dx, Z = z + dz;
    if (!P.walkable(X, Z) || !P.step(x, z, dx, dz)) continue;
    const a = nodeOf.get(key(x, z)), b = nodeOf.get(key(X, Z));
    if (a !== b) { adj[a].add(b); adj[b].add(a); }
  }
  const edges = [];
  adj.forEach((s, a) => s.forEach((b) => { if (a < b) edges.push([a, b]); }));
  let comps = 0;
  const seen = new Set();
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    comps++;
    const q = [n.id];
    seen.add(n.id);
    for (let i = 0; i < q.length; i++) for (const m of adj[q[i]]) if (!seen.has(m)) { seen.add(m); q.push(m); }
  }
  return { nodes, edges, adj, nodeOf, loops: edges.length - nodes.length + comps };
}

export function districts(level, P = prep(level), min = 8) {
  const seen = new Set(), out = [];
  for (let z = 0; z < P.D; z++) for (let x = 0; x < P.W; x++) {
    const c = P.cell(x, z);
    if (!P.land(c) || c.s === "ramp" || c.s === "bridge" || seen.has(key(x, z))) continue;
    const cells = [[x, z]];
    seen.add(key(x, z));
    for (let i = 0; i < cells.length; i++) {
      const [a, b] = cells[i];
      for (const [dx, dz] of N4) {
        const X = a + dx, Z = b + dz, q = P.cell(X, Z);
        if (seen.has(key(X, Z)) || !P.land(q) || q.s === "ramp" || q.s === "bridge" || q.h !== c.h) continue;
        seen.add(key(X, Z));
        cells.push([X, Z]);
      }
    }
    out.push({ h: c.h, cells, fill: hullFill(cells) });
  }
  return { all: out, big: out.filter((d) => d.cells.length >= min) };
}

export function hullFill(cells) {
  const pts = [];
  for (const [x, z] of cells) pts.push([x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]);
  const uniq = [...new Map(pts.map((p) => [key(...p), p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (uniq.length < 3) return 1;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of uniq) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of uniq.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let a = 0;
  for (let i = 0; i < hull.length; i++) { const p = hull[i], q = hull[(i + 1) % hull.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return cells.length / (Math.abs(a) / 2);
}
