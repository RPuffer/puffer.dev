import { CATALOG, footprintCells } from "./catalog.js";
import { DIRS, OPPOSITE, cellAt, isWalkable, canStep, validateLevel } from "./level.js";
import { makeProjection } from "./iso.js";
import { createRng, valueNoise } from "./rng.js";

export const DEFAULTS = {
  W: 16, D: 12, mix: 0.55, contrast: 2.2, bayFront: 0.35, islets: [1, 2], centre: [0, -0.15], freq: 1 / 4.5,
  land: [0.34, 0.42], water: [0.13, 0.2], grass: [0.33, 0.41],
  ca: 2, minComp: 4, rampMax: 2, bridgeMax: 3, maxErase: 0.2,
  poissonR: 1.6, poissonK: 30, scatter: 0.15, attempts: 40,
};

export const VIEW = { pitch: 35.264, yaw: 45, tileH: 1.5 };
export const FRAME = { w: 351, h: 390, fillW: 0.96, fillH: 0.94, offX: 0, offY: 0 };

const DK = Object.keys(DIRS);
const ROT = { n: 0, w: 1, s: 2, e: 3 };
const key = (x, z) => x + "," + z;
const unkey = (k) => k.split(",").map(Number);
const LAND = new Set(["grass", "sand", "dirt", "stone"]);
const isLand = (c) => !!c && c.h >= 1 && LAND.has(c.s);
const isWet = (c) => !!c && (c.s === "water" || c.s === "none");

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

function tierField(rng, P, W, D) {
  const n1 = valueNoise(rng.u32()), n2 = valueNoise(rng.u32()), n3 = valueNoise(rng.u32());
  const f = P.freq, cx = P.centre[0] + rng.float(-0.12, 0.12), cz = P.centre[1] + rng.float(-0.06, 0.06);
  const oct = (n, x, z) => {
    const v = (n(x * f, z * f) + 0.5 * n(x * 2 * f + 17.3, z * 2 * f + 31.7) + 0.25 * n(x * 4 * f + 53.1, z * 4 * f + 71.9)) / 1.75;
    return Math.max(0, Math.min(1, (v - 0.5) * P.contrast + 0.5));
  };
  const E = [], G = [], B = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const ux = ((x + 0.5) / W) * 2 - 1, uz = ((z + 0.5) / D) * 2 - 1, nx = ux - cx, nz = uz - cz;
    const bump = 1 - (1 - Math.min(1, nx * nx)) * (1 - Math.min(1, nz * nz));
    E.push(oct(n1, x, z) * (1 - P.mix) + (1 - bump) * P.mix);
    G.push((-ux * 0.7 - uz) * 0.5 + oct(n3, x, z) * 0.6);
    B.push(oct(n2, x * 1.3 + 5, z * 1.3 + 9) + (ux * 0.3 + uz * 0.7) * P.bayFront);
  }
  const byE = E.map((e, i) => i).sort((a, b) => E[b] - E[a]);
  const landN = Math.round(rng.float(...P.land) * W * D), waterN = Math.round(rng.float(...P.water) * W * D);
  const T = new Array(W * D).fill(0);
  for (let r = 0; r < landN; r++) T[byE[r]] = 2;
  const near = [];
  for (let i = 0; i < W * D; i++) {
    if (T[i]) continue;
    const x = i % W, z = (i / W) | 0;
    let d = 9;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx, Z = z + dz;
      if (X >= 0 && Z >= 0 && X < W && Z < D && T[Z * W + X] === 2) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dz)));
    }
    if (d <= 2) near.push(i);
  }
  near.sort((a, b) => B[b] - B[a]).slice(0, waterN).forEach((i) => { T[i] = 1; });
  const landIdx = byE.slice(0, landN).sort((a, b) => G[b] - G[a]);
  const grassN = Math.round(rng.float(...P.grass) * landN);
  for (let r = 0; r < grassN; r++) T[landIdx[r]] = 3;
  return T;
}

function smooth(T, W, D, passes) {
  for (let p = 0; p < passes; p++) {
    const next = T.slice();
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const counts = [0, 0, 0, 0];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Z = z + dz;
        counts[X < 0 || Z < 0 || X >= W || Z >= D ? 0 : T[Z * W + X]]++;
      }
      const own = T[z * W + x];
      if (counts[own] > 3) continue;
      let best = own;
      for (let t = 0; t < 4; t++) if (counts[t] > counts[best]) best = t;
      next[z * W + x] = best;
    }
    T = next;
  }
  return T;
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

function cleanTiers(T, W, D, P) {
  const land = components(W, D, (i) => T[i] >= 2).sort((a, b) => b.length - a.length);
  land.forEach((c, i) => { if (i > 0 && c.length < P.minComp) for (const k of c) T[k] = 0; });
  const grass = components(W, D, (i) => T[i] === 3).sort((a, b) => b.length - a.length);
  grass.forEach((c, i) => { if (i > 0) for (const k of c) T[k] = 2; });
  const water = components(W, D, (i) => T[i] === 1);
  for (const c of water) if (c.length < 2) for (const k of c) T[k] = 0;
  return T;
}

function addIslets(T, W, D, rng, P) {
  const want = rng.int(...P.islets);
  const at = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? T[z * W + x] : -1);
  for (let n = 0, tries = 0; n < want && tries < 60; tries++) {
    const shore = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (at(x, z) === 2) for (const d of ["e", "s"]) if (at(x + DIRS[d][0], z + DIRS[d][1]) <= 1) shore.push([x, z, d]);
    if (!shore.length) return T;
    const [x, z, d] = rng.pick(shore), [dx, dz] = DIRS[d], gap = rng.int(1, P.bridgeMax);
    const gapCells = [], [px, pz] = dx ? [0, 1] : [1, 0];
    for (let g = 1; g <= gap; g++) gapCells.push([x + dx * g, z + dz * g]);
    const ox = x + dx * (gap + 1), oz = z + dz * (gap + 1);
    const lenA = rng.int(2, 3), lenB = 2, shift = -rng.int(0, lenB - 1);
    const blob = [];
    for (let a = 0; a < lenA; a++) for (let b = 0; b < lenB; b++) blob.push([ox + dx * a + px * (b + shift), oz + dz * a + pz * (b + shift)]);
    if (!blob.some(([bx, bz]) => bx === ox && bz === oz)) continue;
    if (gapCells.some(([gx, gz]) => at(gx, gz) < 0 || at(gx, gz) >= 2)) continue;
    const clear = blob.every(([bx, bz]) => at(bx, bz) === 0 || at(bx, bz) === 1)
      && blob.every(([bx, bz]) => Object.values(DIRS).every(([ex, ez]) => { const v = at(bx + ex, bz + ez); return v < 2 || blob.some(([cx, cz]) => cx === bx + ex && cz === bz + ez); }));
    if (!clear) continue;
    for (const [gx, gz] of gapCells) T[gz * W + gx] = 1;
    for (const [bx, bz] of blob) T[bz * W + bx] = 2;
    n++;
  }
  return T;
}

function setWaterHeights(L) {
  const [W, D] = L.size;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = L.cells[z][x];
    if (c.s !== "water" && c.s !== "bridge") continue;
    let low = false;
    for (const [dx, dz] of Object.values(DIRS)) {
      const n = cellAt(L, x + dx, z + dz);
      if (!n || n.s === "none") low = true;
    }
    if (c.s === "water") c.h = low ? 0 : 1;
    else c.w = low ? 0 : 1;
  }
}

function tryBridge(L, rng, P, comp, reach) {
  const cands = [];
  for (const k of comp) {
    const [x, z] = unkey(k), a = L.cells[z][x];
    if (a.s === "ramp" || a.s === "bridge") continue;
    for (const d of DK) {
      const [dx, dz] = DIRS[d], run = [];
      for (let s = 1; s <= P.bridgeMax + 1; s++) {
        const X = x + dx * s, Z = z + dz * s, c = cellAt(L, X, Z);
        if (!c) break;
        if (isWet(c) && s <= P.bridgeMax) { run.push([X, Z]); continue; }
        if (run.length && reach.has(key(X, Z)) && isLand(c) && c.h === a.h) {
          const voids = run.filter(([rx, rz]) => L.cells[rz][rx].s === "none").length;
          cands.push({ run, h: a.h, score: run.length + voids * 0.6 + rng.next() * 0.3 });
        }
        break;
      }
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.score - b.score);
  const { run, h } = cands[0], m = rng.pick(["planks", "logs"]);
  for (const [X, Z] of run) L.cells[Z][X] = { h, s: "bridge", m, w: 0 };
  return run;
}

function tryRamp(L, rng, spawn, comp, reach, onlyIf) {
  const cands = [];
  for (const k of comp) {
    const [px, pz] = unkey(k);
    for (const d of DK) {
      const qx = px + DIRS[d][0], qz = pz + DIRS[d][1];
      if (!reach.has(key(qx, qz))) continue;
      const r = rampAt(L, spawn, [px, pz], [qx, qz], d);
      if (r && (!onlyIf || onlyIf(r))) cands.push(r);
    }
  }
  if (!cands.length) return null;
  let best = null;
  for (const r of cands) {
    const trial = { ...L, cells: L.cells.map((row) => row.slice()) };
    trial.cells[r.lo[1]][r.lo[0]] = r.cell;
    r.score = bfs(trial, spawn).size + rng.next() * 0.5;
    if (!best || r.score > best.score) best = r;
  }
  L.cells[best.lo[1]][best.lo[0]] = best.cell;
  return best;
}

function rampAt(L, spawn, p, q, d) {
  const a = cellAt(L, ...p), b = cellAt(L, ...q);
  if (!isLand(a) || !isLand(b) || Math.abs(a.h - b.h) !== 1) return null;
  const [lo, hi, down] = a.h < b.h ? [p, q, OPPOSITE[d]] : [q, p, d];
  const loC = cellAt(L, ...lo);
  if (lo[0] === spawn[0] && lo[1] === spawn[1]) return null;
  const foot = [lo[0] + DIRS[down][0], lo[1] + DIRS[down][1]], footC = cellAt(L, ...foot);
  if (!isLand(footC) || footC.h !== loC.h) return null;
  for (const dd of DK) {
    const n = cellAt(L, lo[0] + DIRS[dd][0], lo[1] + DIRS[dd][1]);
    if (n && (n.s === "bridge" || n.s === "ramp")) return null;
  }
  return { lo, hi, foot, d: down, cell: { h: loC.h + 1, s: "ramp", d: down, m: "stone" } };
}

function repair(L, rng, P, spawn) {
  let erased = 0;
  for (let it = 0; it < 80; it++) {
    const reach = bfs(L, spawn);
    const miss = walkables(L).find(([x, z]) => !reach.has(key(x, z)));
    if (!miss) return { ok: true, erased };
    const comp = [...bfs(L, miss).keys()];
    if (tryBridge(L, rng, P, comp, reach)) continue;
    if (tryRamp(L, rng, spawn, comp, reach)) continue;
    erased += comp.length;
    for (const k of comp) {
      const [x, z] = unkey(k);
      const wet = DK.some((d) => cellAt(L, x + DIRS[d][0], z + DIRS[d][1])?.s === "water");
      L.cells[z][x] = { h: 0, s: wet ? "water" : "none" };
    }
  }
  return { ok: false, erased };
}

function extraRamps(L, rng, P, spawn) {
  const ramps = () => cellsWhere(L, (c) => c.s === "ramp");
  for (let n = ramps().length; n < P.rampMax; n++) {
    if (!rng.chance(0.5)) return;
    const existing = ramps();
    const all = walkables(L).map(([x, z]) => key(x, z));
    const reach = new Set(all);
    const plateau = all.filter((k) => { const [x, z] = unkey(k), c = L.cells[z][x]; return c.h === 3 && c.s !== "ramp"; });
    const far = (r) => existing.every(([x, z]) => Math.abs(x - r.lo[0]) + Math.abs(z - r.lo[1]) >= 5);
    const before = all.length;
    const saved = L.cells.map((row) => row.slice());
    const r = tryRamp(L, rng, spawn, plateau, reach, far);
    if (!r) return;
    const after = reachability(L, spawn);
    if (after.missing.length || after.total < before) { L.cells = saved; return; }
  }
}

function cellsWhere(L, f) {
  const out = [];
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) if (f(L.cells[z][x], x, z)) out.push([x, z]);
  return out;
}

function pickSpawn(L) {
  const [W, D] = L.size, cx = (W - 1) / 2, cz = (D - 1) / 2;
  const sand = cellsWhere(L, (c) => c.s === "sand");
  if (!sand.length) return null;
  const interior = sand.filter(([x, z]) => DK.every((d) => isLand(cellAt(L, x + DIRS[d][0], z + DIRS[d][1]))));
  const pool = interior.length ? interior : sand;
  pool.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz));
  return pool[0];
}

function paintSurfaces(L, rng, spawn) {
  const parents = bfs(L, spawn), path = new Set();
  const trace = (x, z) => { let k = key(x, z); while (k && !path.has(k)) { path.add(k); k = parents.get(k); } };
  for (const [x, z] of cellsWhere(L, (c) => c.s === "ramp")) {
    const d = L.cells[z][x].d, hx = x - DIRS[d][0], hz = z - DIRS[d][1];
    trace(hx, hz);
    const fx = x + DIRS[d][0], fz = z + DIRS[d][1], foot = cellAt(L, fx, fz);
    if (foot && foot.s === "sand") L.cells[fz][fx] = { h: foot.h, s: "stone" };
  }
  for (const [x, z] of cellsWhere(L, (c) => c.s === "bridge"))
    for (const d of DK) { const n = cellAt(L, x + DIRS[d][0], z + DIRS[d][1]); if (isLand(n)) trace(x + DIRS[d][0], z + DIRS[d][1]); }
  const plaza = new Set();
  let best = null;
  for (let z = 1; z < L.size[1] - 1; z++) for (let x = 1; x < L.size[0] - 1; x++) {
    let ok = true;
    for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1 && ok; dx++) { const c = L.cells[z + dz][x + dx]; ok = c.s === "sand" && c.h === L.cells[z][x].h; }
    if (!ok) continue;
    const dist = Math.hypot(x - spawn[0], z - spawn[1]) + rng.next() * 1.5;
    if (!best || dist < best.dist) best = { x, z, dist };
  }
  if (best) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { L.cells[best.z + dz][best.x + dx].s = "dirt"; plaza.add(key(best.x + dx, best.z + dz)); }
  for (const k of path) { const [x, z] = unkey(k), c = L.cells[z][x]; if (c.s === "sand") L.cells[z][x] = { h: c.h, s: "dirt" }; }
  return { path, plaza, plazaCentre: best && [best.x, best.z] };
}

function sandTrails(L, rng, path, n) {
  const trails = [];
  for (let t = 0; t < n; t++) {
    const seen = new Map(), q = [];
    for (const k of path) { seen.set(k, null); q.push(unkey(k)); }
    const dist = new Map([...path].map((k) => [k, 0]));
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      for (const d of DK) {
        if (!canStep(L, x, z, d)) continue;
        const k = key(x + DIRS[d][0], z + DIRS[d][1]);
        if (seen.has(k)) continue;
        seen.set(k, key(x, z)); dist.set(k, dist.get(key(x, z)) + 1); q.push(unkey(k));
      }
    }
    const beach = [...dist].filter(([k, dd]) => {
      const [x, z] = unkey(k), c = L.cells[z][x];
      return dd >= 2 && dd <= 5 && c.s === "sand" && DK.some((d) => isWet(cellAt(L, x + DIRS[d][0], z + DIRS[d][1])));
    });
    if (!beach.length) break;
    const top = Math.max(...beach.map(([, dd]) => dd));
    const [goal] = rng.pick(beach.filter(([, dd]) => dd === top));
    const trail = [];
    for (let k = goal; k && !path.has(k); k = seen.get(k)) { trail.push(k); path.add(k); }
    trails.push(trail);
  }
  return trails;
}

function decorate(L, rng, P, spawn, surf) {
  const [W, D] = L.size, occ = new Map(), decor = [], { path } = surf;
  L.blocked = new Set();
  const isSpawn = (x, z) => x === spawn[0] && z === spawn[1];
  const host = (t, x, z) => {
    const c = cellAt(L, x, z);
    if (!c || occ.has(key(x, z))) return false;
    if (t === "waterfall") return c.s === "water" && c.h === 0;
    if (!isLand(c)) return false;
    if (t === "stepping-stones") return c.s === "sand";
    if (!CATALOG[t].passable && (isSpawn(x, z) || path.has(key(x, z)))) return false;
    return true;
  };
  const place = (t, x, z, o = {}) => {
    const spec = CATALOG[t], rot = o.rot || 0, cells = footprintCells(t, x, z, rot);
    if (!cells.every(([cx, cz]) => host(t, cx, cz))) return false;
    if (!spec.passable && t !== "waterfall") {
      for (const [cx, cz] of cells) L.blocked.add(key(cx, cz));
      if (reachability(L, spawn).missing.length) { for (const [cx, cz] of cells) L.blocked.delete(key(cx, cz)); return false; }
    }
    const d = { t, x, z, v: rng.int(0, spec.variants - 1), rot, ox: +(o.ox || 0).toFixed(2), oz: +(o.oz || 0).toFixed(2) };
    for (const [cx, cz] of cells) occ.set(key(cx, cz), d);
    decor.push(d);
    return true;
  };
  const nb = (x, z, d) => cellAt(L, x + DIRS[d][0], z + DIRS[d][1]);
  const free = (x, z) => !occ.has(key(x, z));

  const falls = { pool: [], cliff: [] };
  for (const [x, z] of cellsWhere(L, (c) => c.s === "water" && c.h === 0)) {
    for (const d of ["n", "w"]) {
      const n = nb(x, z, d);
      if (!n) continue;
      if (n.s === "water" && n.h === 1) { falls.pool.push([x, z, d]); break; }
      if (isLand(n) && n.h >= 2) { falls.cliff.push([x, z, d]); break; }
    }
  }
  for (const [x, z, d] of rng.shuffle(falls.pool).slice(0, 3)) place("waterfall", x, z, { rot: ROT[d] });
  for (const [x, z, d] of rng.shuffle(falls.cliff).slice(0, rng.int(0, 2))) place("waterfall", x, z, { rot: ROT[d] });

  for (const trail of sandTrails(L, rng, path, rng.int(1, 2))) for (const k of trail) place("stepping-stones", ...unkey(k), { ox: rng.float(-0.1, 0.1), oz: rng.float(-0.1, 0.1) });

  const clear = (x, z, need) => {
    const c = L.cells[z][x];
    let n = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const o = cellAt(L, x + dx, z + dz);
      if (isLand(o) && o.h === c.h && free(x + dx, z + dz) && !L.blocked.has(key(x + dx, z + dz))) n++;
    }
    return n >= need;
  };
  const sites = [];
  for (const need of [8, 7, 6, 5]) {
    for (const [x, z] of cellsWhere(L, (c, x, z) => isLand(c) && !path.has(key(x, z)) && !isSpawn(x, z) && clear(x, z, need))) sites.push([x, z]);
    if (sites.length >= 2) break;
  }
  const centre = surf.plazaCentre || spawn;
  sites.sort((a, b) => Math.hypot(a[0] - centre[0], a[1] - centre[1]) - Math.hypot(b[0] - centre[0], b[1] - centre[1]));
  const wellAt = sites.find(([x, z]) => L.cells[z][x].s !== "grass" && place("well", x, z));
  sites.find(([x, z]) => (!wellAt || Math.abs(x - wellAt[0]) + Math.abs(z - wellAt[1]) >= 4) && place("campfire", x, z));

  for (const [x, z] of cellsWhere(L, (c) => c.s === "bridge")) {
    for (const d of DK) {
      const lx = x + DIRS[d][0], lz = z + DIRS[d][1];
      if (!isLand(cellAt(L, lx, lz)) || !rng.chance(0.85)) continue;
      const side = d === "n" || d === "s" ? ["e", "w"] : ["n", "s"];
      for (const sd of rng.shuffle(side)) if (place("torch", lx + DIRS[sd][0], lz + DIRS[sd][1], { ox: DIRS[d][0] * -0.3, oz: DIRS[d][1] * -0.3 })) break;
    }
  }

  const sandEdge = (c, x, z) => c.s === "sand" && DK.some((d) => { const n = nb(x, z, d); return !n || isWet(n) || (isLand(n) && n.h < c.h); });
  const treeCell = (x, z) => {
    const c = cellAt(L, x, z);
    if (!c || path.has(key(x, z)) || isSpawn(x, z)) return null;
    if (c.s === "grass") return "grass";
    if (sandEdge(c, x, z)) return "sand";
    return null;
  };
  const pts = [], r = P.poissonR;
  const far = (px, pz) => pts.every(([qx, qz]) => (qx - px) ** 2 + (qz - pz) ** 2 >= r * r);
  const seeds = rng.shuffle(cellsWhere(L, (c, x, z) => !!treeCell(x, z)));
  for (const [sx, sz] of seeds) {
    const p0 = [sx + rng.float(0.3, 0.7), sz + rng.float(0.3, 0.7)];
    if (!far(...p0)) continue;
    pts.push(p0);
    const active = [p0];
    while (active.length) {
      const i = Math.floor(rng.next() * active.length), [ax, az] = active[i];
      let found = false;
      for (let k = 0; k < P.poissonK; k++) {
        const ang = rng.next() * Math.PI * 2, rad = r * (1 + rng.next());
        const px = ax + Math.cos(ang) * rad, pz = az + Math.sin(ang) * rad;
        if (px < 0 || pz < 0 || px >= W || pz >= D || !treeCell(Math.floor(px), Math.floor(pz)) || !far(px, pz)) continue;
        pts.push([px, pz]); active.push([px, pz]); found = true; break;
      }
      if (!found) active.splice(i, 1);
    }
  }
  for (const [px, pz] of pts) {
    const x = Math.floor(px), z = Math.floor(pz), kind = treeCell(x, z);
    if (kind === "sand" && !rng.chance(0.45)) continue;
    const u = rng.next();
    const t = kind === "sand" ? "tree-orange" : u < 0.45 ? "tree-pine" : u < 0.87 ? "tree-round" : "tree-orange";
    const cl = (v) => Math.max(-0.2, Math.min(0.2, v));
    place(t, x, z, { ox: cl(px - x - 0.5), oz: cl(pz - z - 0.5) });
  }

  for (const [x, z] of cellsWhere(L, (c, x, z) => c.s === "grass" && c.h >= 2 && !path.has(key(x, z)))) {
    const c = L.cells[z][x];
    const lower = (d) => { const n = nb(x, z, d); return !n || (n.s !== "ramp" && n.h < c.h); };
    const edge = ["s", "e"].find(lower) || (rng.chance(0.3) ? ["n", "w"].find(lower) : null);
    if (!edge || !rng.chance(0.45)) continue;
    const [dx, dz] = DIRS[edge];
    place("fence", x, z, { rot: dz ? 0 : 1, ox: dx * 0.4, oz: dz * 0.4 });
  }

  for (const [x, z] of cellsWhere(L, (c) => isLand(c))) {
    const c = L.cells[z][x];
    const foot = DK.some((d) => { const n = nb(x, z, d); return isLand(n) && n.h > c.h; });
    const shore = DK.some((d) => { const n = nb(x, z, d); return !n || isWet(n); });
    const cliffTop = c.s === "grass" && DK.some((d) => { const n = nb(x, z, d); return !n || (n.s !== "ramp" && n.h < c.h); });
    const p = c.s === "sand" ? (foot ? 0.3 : shore ? 0.12 : 0.05) : cliffTop ? 0.08 : 0;
    if (p && rng.chance(p)) place(rng.chance(0.3) ? "rock-big" : "rock", x, z, { ox: rng.float(-0.2, 0.2), oz: rng.float(-0.2, 0.2) });
  }

  for (const [x, z] of rng.shuffle(cellsWhere(L, (c, x, z) => c.s === "grass" && free(x, z) && !path.has(key(x, z))))) {
    if (!rng.chance(P.scatter)) continue;
    const nearTree = DK.some((d) => /^tree/.test(occ.get(key(x + DIRS[d][0], z + DIRS[d][1]))?.t || ""));
    const u = rng.next();
    const t = u < 0.3 ? "bush" : u < 0.45 ? "bush-cluster" : nearTree && u < 0.7 ? "mushroom" : "flower";
    place(t, x, z, { ox: rng.float(-0.15, 0.15), oz: rng.float(-0.15, 0.15) });
  }

  const dist = bfsDist(L, spawn);
  const open = rng.shuffle(cellsWhere(L, (c, x, z) => isLand(c) && free(x, z) && !L.blocked.has(key(x, z)) && !isSpawn(x, z)));
  const gems = [...open].sort((a, b) => dist.get(key(...b)) - dist.get(key(...a))).slice(0, rng.int(1, 2));
  for (const [x, z] of gems) place("gem", x, z);
  const coins = [];
  for (const [x, z] of open) {
    if (coins.length >= rng.int(3, 6)) break;
    if (!free(x, z) || coins.some(([cx, cz]) => Math.abs(cx - x) + Math.abs(cz - z) < 3)) continue;
    if (place("coin", x, z)) coins.push([x, z]);
  }
  return decor;
}

function bfsDist(L, start) {
  const dist = new Map([[key(...start), 0]]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i];
    for (const d of DK) {
      if (!canStep(L, x, z, d)) continue;
      const k = key(x + DIRS[d][0], z + DIRS[d][1]);
      if (dist.has(k)) continue;
      dist.set(k, dist.get(key(x, z)) + 1); q.push([x + DIRS[d][0], z + DIRS[d][1]]);
    }
  }
  return dist;
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

function attempt(rng, P, seed) {
  const W = P.W, D = P.D;
  const T = addIslets(cleanTiers(smooth(tierField(rng, P, W, D), W, D, P.ca), W, D, P), W, D, rng, P);
  const cells = [];
  for (let z = 0; z < D; z++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const t = T[z * W + x];
      row.push(t === 3 ? { h: 3, s: "grass" } : t === 2 ? { h: 2, s: "sand" } : t === 1 ? { h: 1, s: "water" } : { h: 0, s: "none" });
    }
    cells.push(row);
  }
  const L = { name: `gen-${seed}`, seed: String(seed), size: [W, D], cells, decor: [], blocked: new Set() };
  const landBefore = cellsWhere(L, isLand).length;
  const spawn = pickSpawn(L);
  if (!spawn) return { ok: false, reason: "no sand" };
  const rep = repair(L, rng, P, spawn);
  if (!rep.ok) return { ok: false, reason: "repair" };
  if (rep.erased > P.maxErase * landBefore) return { ok: false, reason: "erased" };
  extraRamps(L, rng, P, spawn);
  setWaterHeights(L);
  const surf = paintSurfaces(L, rng, spawn);
  L.decor = decorate(L, rng, P, spawn, surf);
  L.spawn = spawn;
  L.view = frameView(L).view;
  L.bg = "#404040";
  delete L.blocked;
  const out = { name: L.name, seed: L.seed, size: L.size, cells: L.cells, decor: L.decor, spawn: L.spawn, view: L.view, bg: L.bg };
  const problems = checkLevel(out);
  return problems.length ? { ok: false, reason: problems[0], level: out } : { ok: true, level: out };
}

export function generateLevel(seed = 1, opts = {}) {
  const P = { ...DEFAULTS, ...opts };
  const reasons = [];
  for (let a = 0; a < P.attempts; a++) {
    const r = attempt(createRng(`${seed}#${a}`), P, seed);
    if (r.ok) return { ...r.level, attempt: a };
    reasons.push(r.reason);
  }
  throw new Error(`procgen seed ${seed}: no valid island in ${P.attempts} attempts (${reasons.slice(0, 3).join("; ")})`);
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
  const L = { ...raw, blocked: new Set() };
  const occ = new Map();
  for (const d of L.decor) {
    const spec = CATALOG[d.t];
    if (!spec) { problems.push(`decor ${d.t}: unknown`); continue; }
    for (const [x, z] of footprintCells(d.t, d.x, d.z, d.rot || 0)) {
      const c = cellAt(L, x, z), k = key(x, z);
      if (!c) { problems.push(`decor ${d.t} at ${d.x},${d.z}: footprint off grid`); continue; }
      if (occ.has(k)) problems.push(`decor ${d.t} overlaps ${occ.get(k)} at ${k}`);
      occ.set(k, d.t);
      if (d.t === "waterfall") {
        const dir = Object.keys(ROT).find((q) => ROT[q] === (d.rot || 0));
        const hi = cellAt(L, x + DIRS[dir][0], z + DIRS[dir][1]);
        if (c.s !== "water" || c.h !== 0) problems.push(`waterfall at ${k} not on h0 water`);
        if (!hi || !(hi.h > c.h && hi.s !== "none")) problems.push(`waterfall at ${k} faces no cliff`);
      } else if (!isLand(c)) problems.push(`decor ${d.t} at ${k} on ${c.s}`);
      if (!spec.passable && d.t !== "waterfall") L.blocked.add(k);
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
  for (const [x, z] of cellsWhere(L, (c) => c.s === "bridge")) if (!inRun.has(key(x, z))) problems.push(`bridge ${x},${z}: no 1-3 span with land at both ends`);
  const s = levelStats(L);
  if (s.grassShare < 0.25 || s.grassShare > 0.45) problems.push(`grass share ${s.grassShare.toFixed(2)} outside 0.25-0.45`);
  if (s.plateauComps !== 1) problems.push(`plateau in ${s.plateauComps} pieces`);
  return problems;
}
