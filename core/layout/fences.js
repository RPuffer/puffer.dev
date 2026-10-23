import { CATALOG, WALKABLE, maskCells } from "../catalog.js";
import { voidCells } from "../level.js";
import { checkLevel } from "../procgen.js";
import { checkRoute } from "./check.js";
import { trapCellSet } from "./pickups.js";
import { reservedCells } from "./decor.js";
import { validateTraps } from "../traps/rules.js";
import { KINDS } from "../traps/kinds.js";
import { N4, DIR, key } from "./grid.js";
import { createRng, hashSeed } from "../rng.js";

export const FENCE = { share: 0.1, run: 4, min: 1, slideRadius: 3, thingRadius: 1 };
export const FENCE_BY_ISLAND = { cat: "rockwall", wizard: "masonry", swallow: "logs", forest: "hedge", mindbloom: "hedge", cosmos: "rockwall", gremlin: "coral", eagle: "logs", dragon: "bone", sharkbear: "coral", chimera: "masonry", ember: "bone", traps: "hedge" };
const WALKED = new Set(["spine", "entry"]);
export const FLANK_KINDS = new Set(["t03", "t25", "t02", "t22"]);
export const SLIDE_KINDS = new Set(["t52", "t18", "t05", "t35"]);
export const RULES = [
  ["flank", "the shoulders of a heart-costing trap run on the route, so you cannot step around it"],
  ["spine", "rim shoulders along the spine where a slip costs the longest walk back, never near a slide or ice trap"],
  ["gap", "a deliberate one-cell gap where a branch, lookout or alcove leaves the fenced stretch"],
];

export const railType = (mat, n) => `rail-${mat}-${n}`;
export const isFence = (t) => /^rail-/.test(String(t || ""));
export const fenceMaterial = (level) => level.palette?.fence || FENCE_BY_ISLAND[String(level.name || "").split("-")[0]] || "hedge";

const land = (c) => !!c && c.h >= 1 && WALKABLE.has(c.s) && c.s !== "lift";

export function edgeCells(level) {
  const voids = voidCells(level), [W, D] = level.size, out = [];
  const gone = (x, z) => x < 0 || z < 0 || x >= W || z >= D || voids.has(key(x, z));
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (land(c) && N4.some(([dx, dz]) => gone(x + dx, z + dz))) out.push([x, z]); }));
  return out;
}

export function fenceStats(level) {
  const edges = edgeCells(level), set = new Set(edges.map(([x, z]) => key(x, z)));
  let cells = 0, onEdge = 0, runs = 0;
  for (const d of level.decor || []) {
    if (!isFence(d.t)) continue;
    runs++;
    for (const m of maskCells(d.t, d.x, d.z, d.rot || 0)) { cells++; if (set.has(key(m.x, m.z))) onEdge++; }
  }
  return { runs, cells, edges: edges.length, share: edges.length ? onEdge / edges.length : 0 };
}

function pathDistance(level) {
  const [W, D] = level.size, dist = new Map(), q = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) { dist.set(key(x, z), 0); q.push([x, z]); } }));
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i], d = dist.get(key(x, z));
    for (const [dx, dz] of N4) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= D || dist.has(key(nx, nz))) continue;
      dist.set(key(nx, nz), d + 1);
      q.push([nx, nz]);
    }
  }
  return dist;
}

function walkFrom(level, start, blocked) {
  const [W, D] = level.size, seen = new Map([[key(...start), 0]]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i], c = level.cells[z][x];
    for (const [dx, dz] of N4) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz), n = level.cells[nz]?.[nx];
      if (nx < 0 || nz < 0 || nx >= W || nz >= D || seen.has(k) || blocked.has(k) || !n || n.h < 1 || !WALKABLE.has(n.s)) continue;
      if (Math.abs(n.h - c.h) > 1) continue;
      seen.set(k, seen.get(key(x, z)) + 1);
      q.push([nx, nz]);
    }
  }
  return seen;
}

function sliceRuns(cells, max, hOf) {
  const set = new Set(cells.map((c) => key(...c))), used = new Set(), runs = [];
  const chunk = (line, axis) => {
    const size = Math.ceil(line.length / Math.ceil(line.length / max));
    for (let i = 0; i < line.length; i += size) {
      const part = line.slice(i, i + size);
      runs.push({ cells: part, axis });
      for (const c of part) used.add(key(...c));
    }
  };
  const sorted = cells.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [axis, d, min] of [["x", [1, 0], 2], ["z", [0, 1], 1]]) {
    for (const c of sorted) {
      if (used.has(key(...c))) continue;
      const prev = key(c[0] - d[0], c[1] - d[1]);
      if (set.has(prev) && !used.has(prev) && hOf(c[0] - d[0], c[1] - d[1]) === hOf(...c)) continue;
      const line = [];
      for (let k = 0; ; k++) {
        const q = [c[0] + d[0] * k, c[1] + d[1] * k], qk = key(...q);
        if (!set.has(qk) || used.has(qk) || hOf(...q) !== hOf(...c)) break;
        line.push(q);
      }
      if (line.length >= min) chunk(line, axis);
    }
  }
  return runs;
}

export function placeFences(level, { seed = level.layout?.seed ?? 1, share = FENCE.share } = {}) {
  const rng = createRng(hashSeed(`${level.name}:fences:${seed}`));
  const [W, D] = level.size;
  const at = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  const voids = voidCells(level);
  const gone = (x, z) => !at(x, z) || voids.has(key(x, z));
  const edges = edgeCells(level);
  const budget = Math.max(0, Math.floor(edges.length * share));
  const mat = fenceMaterial(level);
  const report = { material: mat, edges: edges.length, budget, reasons: { flank: 0, spine: 0 }, gaps: 0, runs: 0, cells: 0, dropped: [] };
  if (!budget || !CATALOG[railType(mat, 1)]) { (level.route ||= {}).fences = { material: mat, edges: edges.length, runs: 0, cells: 0, share: 0, gaps: 0 }; return report; }

  const dist = pathDistance(level), dOf = (x, z) => dist.get(key(x, z)) ?? 9;
  const taken = new Set();
  for (const d of level.decor || []) for (const m of maskCells(d.t, d.x, d.z, d.rot || 0)) taken.add(key(m.x, m.z));
  const res = level.things ? reservedCells(level) : new Set();
  const keep = new Set([...res, ...trapCellSet(level.traps || [])]);
  for (const t of level.traps || []) for (const [x, z] of KINDS[t.kind]?.clear?.(t) || []) keep.add(key(x, z));
  const near = (c, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) keep.add(key(c[0] + dx, c[1] + dz)); };
  for (const t of level.things || []) if (t.kind !== "watcher" && t.kind !== "gate") near([t.x, t.z], FENCE.thingRadius);
  for (const c of level.charges || []) near([c.x, c.z], FENCE.thingRadius);
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "lift" || c.s === "ramp") near([x, z], 1); }));
  const slide = new Set();
  for (const t of level.traps || []) if (SLIDE_KINDS.has(t.kind)) for (const c of t.cells || []) for (let dz = -FENCE.slideRadius; dz <= FENCE.slideRadius; dz++) for (let dx = -FENCE.slideRadius; dx <= FENCE.slideRadius; dx++) slide.add(key(c[0] + dx, c[1] + dz));
  const free = (x, z) => { const c = at(x, z), k = key(x, z); return land(c) && !c.p && !taken.has(k) && !keep.has(k); };

  const segs = level.route?.segments || [];
  const spine = new Set(), branch = new Set();
  for (const s of segs) for (const [x, z] of s.cells || []) if (at(x, z)?.p) (WALKED.has(s.role) ? spine : branch).add(key(x, z));
  for (const k of spine) branch.delete(k);
  const gapAt = new Set();
  for (const k of branch) { const [x, z] = k.split(",").map(Number); if (N4.some(([dx, dz]) => spine.has(key(x + dx, z + dz)))) for (const [dx, dz] of N4) gapAt.add(key(x + dx, z + dz)); }
  for (const f of level.route?.features || []) for (const c of [f.from, ...(f.neck || []), f.ramp?.at].filter(Boolean)) { for (const [dx, dz] of N4) gapAt.add(key(c[0] + dx, c[1] + dz)); gapAt.add(key(c[0], c[1])); }

  const fire = (level.things || []).find((t) => t.kind === "bonfire");
  const home = fire ? walkFrom(level, [fire.x, fire.z], new Set()) : new Map();
  const far = (x, z) => home.get(key(x, z)) ?? 0;

  const hOf = (x, z) => at(x, z)?.h;
  const uniqC = (list) => [...new Map(list.map((c) => [key(...c), c])).values()];
  const groups = [];
  const flank = [];
  for (const t of level.traps || []) {
    if (!FLANK_KINDS.has(t.kind)) continue;
    const cells = (t.cells || []).filter(([x, z]) => at(x, z)?.p);
    if (!cells.length) continue;
    const along = cells.length > 1 ? [Math.sign(cells[1][0] - cells[0][0]), Math.sign(cells[1][1] - cells[0][1])] : null;
    const perps = along ? [[along[1], along[0]], [-along[1], -along[0]]] : N4;
    for (const [x, z] of cells) for (const [px, pz] of perps) {
      const q = [x + px, z + pz];
      if (free(...q) && !slide.has(key(...q)) && at(...q).h === at(x, z).h) flank.push(q);
    }
  }
  for (const r of sliceRuns(uniqC(flank), FENCE.run, hOf)) groups.push({ ...r, why: "flank", score: 100 });

  const flankSet = new Set(flank.map((c) => key(...c)));
  const rim = [];
  for (const k of spine) {
    const [x, z] = k.split(",").map(Number);
    for (const [dx, dz] of N4) {
      const q = [x + dx, z + dz], qk = key(...q);
      if (!free(...q) || slide.has(qk) || gapAt.has(qk) || flankSet.has(qk) || dOf(...q) !== 1) continue;
      if (!N4.some(([ex, ez]) => gone(q[0] + ex, q[1] + ez))) continue;
      if (at(...q).h !== at(x, z).h) continue;
      rim.push(q);
    }
  }
  for (const r of sliceRuns(uniqC(rim), FENCE.run, hOf)) {
    if (r.cells.length < FENCE.min) continue;
    const ends = [r.cells[0], r.cells[r.cells.length - 1]];
    const step = r.axis === "x" ? [1, 0] : [0, 1];
    const marks = [[ends[0][0] - step[0], ends[0][1] - step[1]], [ends[1][0] + step[0], ends[1][1] + step[1]]].filter((c) => gapAt.has(key(...c)) && land(at(...c)));
    const score = Math.max(...r.cells.map((c) => far(...c))) + r.cells.length * 2 + marks.length * 12 + rng.float(0, 3);
    groups.push({ ...r, why: "spine", score, marks: marks.length });
  }

  groups.sort((a, b) => b.score - a.score);
  const placed = [], why = new Map();
  const baseProblems = new Set(checkRoute(level));
  const baseTraps = new Set(level.traps?.length ? validateTraps(level) : []);
  let used = 0;
  for (const g of groups) {
    if (g.cells.some(([x, z]) => taken.has(key(x, z)))) continue;
    if (used + g.cells.length > budget && g.why !== "flank") continue;
    if (used + g.cells.length > budget * 1.5) continue;
    const [x0, z0] = g.cells[0];
    const d = { t: railType(mat, g.cells.length), x: x0, z: z0, rot: g.axis === "x" ? 0 : 1, v: 0, fw: g.axis === "x" ? g.cells.length : 1, fd: g.axis === "x" ? 1 : g.cells.length };
    level.decor.push(d);
    const bad = checkLevel(level).filter((p) => !/grass share|plateau in/.test(p));
    if (bad.length) { level.decor.pop(); report.dropped.push(`${g.why} at ${x0},${z0}: ${bad[0]}`); continue; }
    for (const [a, b] of g.cells) taken.add(key(a, b));
    placed.push(d);
    why.set(d, g.why);
    used += g.cells.length;
    report.reasons[g.why]++;
    if (g.marks) report.gaps += g.marks;
  }
  const fresh = () => [...checkRoute(level).filter((p) => !baseProblems.has(p)), ...(level.traps?.length ? validateTraps(level).filter((p) => !baseTraps.has(p)) : [])];
  const drop = (d, p) => {
    placed.splice(placed.indexOf(d), 1);
    level.decor.splice(level.decor.indexOf(d), 1);
    report.reasons[why.get(d)]--;
    report.dropped.push(`${why.get(d)} at ${d.x},${d.z}: ${p}`);
  };
  for (let p = fresh(); p.length && placed.length; p = fresh()) {
    let culprit = null;
    for (const d of [...placed].reverse()) {
      const i = level.decor.indexOf(d);
      level.decor.splice(i, 1);
      const left = fresh().length;
      level.decor.splice(i, 0, d);
      if (left < p.length) { culprit = d; break; }
    }
    drop(culprit || placed[placed.length - 1], p[0]);
  }
  report.runs = placed.length;
  report.cells = placed.reduce((s, d) => s + d.fw * d.fd, 0);
  report.share = edges.length ? +(placed.reduce((s, d) => s + maskCells(d.t, d.x, d.z, d.rot).filter((m) => N4.some(([dx, dz]) => gone(m.x + dx, m.z + dz))).length, 0) / edges.length).toFixed(4) : 0;
  (level.route ||= {}).fences = { material: mat, edges: edges.length, runs: report.runs, cells: report.cells, share: report.share, gaps: report.gaps };
  return report;
}
