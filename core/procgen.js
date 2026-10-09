import { CATALOG, maskCells } from "./catalog.js";
import { DIRS, cellAt, isWalkable, canStep, validateLevel } from "./level.js";
import { makeProjection } from "./iso.js";
import { normalizeThing, thingBlocks } from "./interact.js";
import { findPath } from "./path.js";

export const VIEW = { pitch: 35.264, yaw: 45, tileH: 1.5 };
export const FRAME = { w: 351, h: 390, fillW: 0.96, fillH: 0.94, offX: 0, offY: 0 };

const DK = Object.keys(DIRS);
const ROT = { n: 0, w: 1, s: 2, e: 3 };
const key = (x, z) => x + "," + z;
const LAND = new Set(["grass", "sand", "dirt", "stone"]);
const isLand = (c) => !!c && c.h >= 1 && LAND.has(c.s);

function bfs(L, start, extra) {
  const seen = new Map([[key(...start), null]]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i];
    for (const d of DK) {
      if (!canStep(L, x, z, d)) continue;
      const nx = x + DIRS[d][0], nz = z + DIRS[d][1], k = key(nx, nz);
      if (seen.has(k) || (extra && !extra(nx, nz))) continue;
      seen.set(k, key(x, z));
      q.push([nx, nz]);
    }
  }
  return seen;
}

function walkables(L) {
  const out = [];
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) if (isWalkable(L, x, z)) out.push([x, z]);
  return out;
}

export function reachability(L, spawn = L.spawn) {
  const all = walkables(L);
  if (!isWalkable(L, spawn[0], spawn[1])) return { reached: 0, total: all.length, missing: all };
  const seen = bfs(L, spawn);
  return { reached: seen.size, total: all.length, missing: all.filter(([x, z]) => !seen.has(key(x, z))) };
}

function components(W, D, inSet) {
  const comp = new Array(W * D).fill(-1), out = [];
  for (let i = 0; i < W * D; i++) {
    if (comp[i] >= 0 || !inSet(i)) continue;
    const id = out.length, list = [i];
    comp[i] = id;
    for (let j = 0; j < list.length; j++) {
      const x = list[j] % W, z = (list[j] / W) | 0;
      for (const [dx, dz] of Object.values(DIRS)) {
        const X = x + dx, Z = z + dz, k = Z * W + X;
        if (X < 0 || Z < 0 || X >= W || Z >= D || comp[k] >= 0 || !inSet(k)) continue;
        comp[k] = id; list.push(k);
      }
    }
    out.push(list);
  }
  return out;
}

function cellsWhere(L, f) {
  const out = [];
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) if (f(L.cells[z][x], x, z)) out.push([x, z]);
  return out;
}

export function frameView(L, frame = FRAME) {
  const view = { ...VIEW };
  const proj = makeProjection(view);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  L.cells.forEach((row, z) => row.forEach((c, x) => {
    if (c.s === "none") return;
    for (const [px, pz] of [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]]) for (const y of [0, c.h * view.tileH]) {
      const s = proj.project(px, y, pz);
      minX = Math.min(minX, s.sx); maxX = Math.max(maxX, s.sx); minY = Math.min(minY, s.sy); maxY = Math.max(maxY, s.sy);
    }
  }));
  for (const d of L.decor || []) {
    const c = L.cells[d.z][d.x], s = proj.project(d.x + 0.5, (Math.max(c.h, 0) + (CATALOG[d.t]?.height || 0)) * view.tileH, d.z + 0.5);
    minY = Math.min(minY, s.sy);
  }
  const bw = maxX - minX, bh = maxY - minY;
  const zoom = Math.min((frame.w * frame.fillW) / bw, (frame.h * frame.fillH) / bh);
  const sx = (minX + maxX) / 2 + frame.offX * bw, sy = (minY + maxY) / 2 + frame.offY * bh;
  const c = proj.unprojectGround(sx, sy, 2 * view.tileH);
  return { bounds: { minX, minY, maxX, maxY, bw, bh }, view: { ...view, zoom: +zoom.toFixed(2), center: [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)] } };
}

export function levelStats(L) {
  const land = cellsWhere(L, (c) => isLand(c) || c.s === "ramp");
  const plateau = land.filter(([x, z]) => L.cells[z][x].h >= 3 && L.cells[z][x].s !== "ramp");
  const W = L.size[0], D = L.size[1];
  const plateauComps = components(W, D, (i) => { const c = L.cells[(i / W) | 0][i % W]; return isLand(c) && c.h >= 3; }).length;
  const count = (s) => cellsWhere(L, (c) => c.s === s).length;
  const xs = land.map(([x]) => x), zs = land.map(([, z]) => z);
  return {
    land: land.length, plateau: plateau.length, grassShare: plateau.length / Math.max(1, land.length), plateauComps,
    water: count("water"), ramps: count("ramp"), bridges: count("bridge"), dirt: count("dirt"),
    bbox: [Math.max(...xs) - Math.min(...xs) + 1, Math.max(...zs) - Math.min(...zs) + 1],
  };
}

export function checkLevel(raw) {
  const problems = [];
  const { errors } = validateLevel(raw);
  if (errors.length) return errors;
  const grown = new Set((raw.outgrowths || []).flatMap((g) => g.cells.map(([x, z]) => x + "," + z)));
  const L = { ...raw, blocked: new Set() };
  const occ = new Map();
  for (const d of L.decor) {
    const spec = CATALOG[d.t];
    if (!spec) { problems.push(`decor ${d.t}: unknown`); continue; }
    for (const m of maskCells(d.t, d.x, d.z, d.rot || 0)) {
      const x = m.x, z = m.z, c = cellAt(L, x, z), k = key(x, z);
      if (!c) { problems.push(`decor ${d.t} at ${d.x},${d.z}: footprint off grid`); continue; }
      if (occ.has(k)) problems.push(`decor ${d.t} overlaps ${occ.get(k)} at ${k}`);
      occ.set(k, d.t);
      if (d.t === "waterfall") {
        const dir = Object.keys(ROT).find((q) => ROT[q] === (d.rot || 0));
        const hi = cellAt(L, x + DIRS[dir][0], z + DIRS[dir][1]);
        if (c.s !== "water" || c.h !== 0) problems.push(`waterfall at ${k} not on h0 water`);
        if (!hi || !(hi.h > c.h && hi.s !== "none")) problems.push(`waterfall at ${k} faces no cliff`);
      } else if (m.span ? !(c.s === "bridge" || c.s === "water" || c.s === "none") : !isLand(c) && !(c.s === "bridge" && grown.has(k))) problems.push(`decor ${d.t} at ${k} on ${c.s}`);
      if (!m.pass && d.t !== "waterfall") L.blocked.add(k);
    }
  }
  if (L.blocked.has(key(...L.spawn))) problems.push("spawn blocked by decor");
  if (!isWalkable(L, ...L.spawn)) problems.push("spawn not walkable");
  const r = reachability(L);
  if (r.missing.length) problems.push(`${r.missing.length} walkable cells unreachable, first ${r.missing[0]}`);
  for (const [x, z] of cellsWhere(L, (c) => c.s === "ramp")) {
    const c = L.cells[z][x], down = cellAt(L, x + DIRS[c.d][0], z + DIRS[c.d][1]), up = cellAt(L, x - DIRS[c.d][0], z - DIRS[c.d][1]);
    if (!down || down.h !== c.h - 1 || !isWalkable({ ...L, blocked: new Set() }, x + DIRS[c.d][0], z + DIRS[c.d][1])) problems.push(`ramp ${x},${z}: downhill cell not one tier lower`);
    if (!up || up.h !== c.h) problems.push(`ramp ${x},${z}: uphill cell not level`);
  }
  for (const msg of rampLandings(raw, L.blocked)) problems.push(msg);
  const lift = (role) => (raw.things || []).find((t) => t.kind === "elevator" && t.role === role);
  if (lift("entry") && lift("exit")) {
    const open = { ...L, blocked: new Set(L.blocked), edges: new Set() };
    for (const t of raw.things) if (t.kind === "bonfire" || t.kind === "chest") open.blocked.add(key(t.x, t.z));
    if (!findPath(open, [lift("entry").x, lift("entry").z], [lift("exit").x, lift("exit").z])) problems.push(`lift to lift: no path from entry ${lift("entry").x},${lift("entry").z} to exit ${lift("exit").x},${lift("exit").z} with gates open`);
  }
  const inRun = new Set();
  for (const [dx, dz] of [[1, 0], [0, 1]]) {
    for (const [x, z] of cellsWhere(L, (c, x, z) => c.s === "bridge" && cellAt(L, x - dx, z - dz)?.s !== "bridge")) {
      const run = [];
      let X = x, Z = z;
      while (cellAt(L, X, Z)?.s === "bridge") { run.push(key(X, Z)); X += dx; Z += dz; }
      const h = L.cells[z][x].h, a = cellAt(L, x - dx, z - dz), b = cellAt(L, X, Z);
      if (run.length <= 3 && isLand(a) && isLand(b) && a.h === h && b.h === h) run.forEach((k) => inRun.add(k));
    }
  }
  for (const [x, z] of cellsWhere(L, (c) => c.s === "bridge")) if (!inRun.has(key(x, z)) && !grown.has(key(x, z))) problems.push(`bridge ${x},${z}: no 1-3 span with land at both ends`);
  const s = levelStats(L);
  if (s.grassShare < 0.25 || s.grassShare > 0.45) problems.push(`grass share ${s.grassShare.toFixed(2)} outside 0.25-0.45`);
  if (s.plateauComps !== 1) problems.push(`plateau in ${s.plateauComps} pieces`);
  return problems;
}

export function rampLandings(raw, decorBlocked) {
  const solid = new Set(decorBlocked);
  for (const t of raw.things || []) if (t && (t.kind || t.t)) for (const [x, z] of thingBlocks(normalizeThing(t))) solid.add(key(x, z));
  const out = [];
  raw.cells.forEach((row, z) => row.forEach((c, x) => {
    if (c.s !== "ramp" || !DIRS[c.d]) return;
    const [dx, dz] = DIRS[c.d];
    for (const [end, nx, nz] of [["top", x - dx, z - dz], ["bottom", x + dx, z + dz]]) if (solid.has(key(nx, nz))) out.push(`ramp ${x},${z}: ${end} landing ${nx},${nz} blocked`);
  }));
  return out;
}
