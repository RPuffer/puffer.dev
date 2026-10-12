import { SHAPES, transformShape, parseShape, rimsOf } from "./shapes/index.js";

export const MARGIN = 4;
export const SCALE = { min: 3, max: 4.8 };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const RIM = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const uk = (u) => u[0] + "," + u[1];
const unuk = (s) => s.split(",").map(Number);

export const shapeById = (id) => SHAPES.find((s) => s.id === id) || null;

export function scaleFor(shape, { area = 600, min = SCALE.min, max = SCALE.max } = {}) {
  const units = parseShape(shape).land.size;
  return Math.min(max, Math.max(min, +Math.sqrt(area / units).toFixed(2)));
}

export function placeShape(shape, { transform = "r0", scale = 3.5, noise = null, rough = true } = {}) {
  const T = transformShape(shape, transform);
  const P = parseShape(T);
  const s = Math.max(SCALE.min, scale);
  const W = Math.ceil(P.W * s) + 2 * MARGIN, D = Math.ceil(P.H * s) + 2 * MARGIN;
  const unitOf = (x, z) => [Math.floor((x - MARGIN) / s), Math.floor((z - MARGIN) / s)];
  const centre = (u) => [MARGIN + Math.floor((u[0] + 0.5) * s), MARGIN + Math.floor((u[1] + 0.5) * s)];
  const landUnit = (u) => P.land.has(uk(u));
  const inGrid = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
  const idx = (x, z) => z * W + x;
  const mask = new Uint8Array(W * D);
  const unitAt = new Int32Array(W * D).fill(-1);
  const unitList = [...P.land].map(unuk);
  const unitIndex = new Map(unitList.map((u, i) => [uk(u), i]));
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (x < MARGIN || z < MARGIN) continue;
    const u = unitOf(x, z);
    if (u[0] >= P.W || u[1] >= P.H || !landUnit(u)) continue;
    mask[idx(x, z)] = 1;
    unitAt[idx(x, z)] = unitIndex.get(uk(u));
  }

  const adj = new Map(unitList.map((u) => [uk(u), []]));
  for (const u of unitList) for (const [dx, dz] of N4) {
    const v = [u[0] + dx, u[1] + dz];
    if (landUnit(v)) adj.get(uk(u)).push(uk(v));
  }

  const keys = {
    entry: P.keys.entry, exit: P.keys.exit, bonfire: P.keys.bonfire,
    centrepieces: P.keys.centrepieces, rewards: P.keys.rewards,
  };
  const rimDirs = (u) => rimsOf(P, u);

  const protect = new Uint8Array(W * D);
  const guard = (x, z, r = 1) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (inGrid(x + dx, z + dz)) protect[idx(x + dx, z + dz)] = 1; };
  for (const u of unitList) {
    const [cx, cz] = centre(u);
    guard(cx, cz, 1);
    for (const vk of adj.get(uk(u))) {
      const [vx, vz] = centre(unuk(vk));
      for (let x = Math.min(cx, vx); x <= Math.max(cx, vx); x++) for (let z = Math.min(cz, vz); z <= Math.max(cz, vz); z++) guard(x, z, 1);
    }
  }
  for (const u of [keys.entry, keys.exit]) for (const d of rimDirs(u)) {
    let [x, z] = centre(u);
    while (inGrid(x, z) && mask[idx(x, z)]) { guard(x, z, 1); x += RIM[d][0]; z += RIM[d][1]; }
  }

  if (rough && noise) roughen();

  function distTo(state, x, z, r) {
    for (let k = 1; k <= r; k++) for (let dz = -k; dz <= k; dz++) for (let dx = -k; dx <= k; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== k) continue;
      const X = x + dx, Z = z + dz;
      const v = inGrid(X, Z) ? mask[idx(X, Z)] : 0;
      if (v === state) return k;
    }
    return Infinity;
  }

  function unitsNear(x, z, r) {
    const out = new Set();
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Z = z + dz;
      if (inGrid(X, Z) && mask[idx(X, Z)] && unitAt[idx(X, Z)] >= 0) out.add(unitAt[idx(X, Z)]);
    }
    return [...out].map((i) => unitList[i]);
  }

  function safeAccrete(x, z) {
    const us = unitsNear(x, z, 2);
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j], dx = Math.abs(a[0] - b[0]), dz = Math.abs(a[1] - b[1]);
      if (dx > 1 || dz > 1) return false;
      if (dx === 1 && dz === 1 && !landUnit([a[0], b[1]]) && !landUnit([b[0], a[1]])) return false;
    }
    return us.length > 0;
  }

  function nearestUnit(x, z) {
    let best = -1, bd = Infinity;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx, Z = z + dz;
      if (!inGrid(X, Z) || !mask[idx(X, Z)] || unitAt[idx(X, Z)] < 0) continue;
      const d = Math.abs(dx) + Math.abs(dz);
      if (d < bd) { bd = d; best = unitAt[idx(X, Z)]; }
    }
    return best;
  }

  function roughen() {
    const n = (x, z, o = 0) => noise(x / 3.3 + 17 + o, z / 3.3 - 11 - o) * 0.7 + noise(x / 1.4 - 5 + o, z / 1.4 + 3) * 0.3;
    const next = mask.slice();
    const owner = unitAt.slice();
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const i = idx(x, z), v = n(x, z);
      if (mask[i]) {
        if (protect[i]) continue;
        const d = distTo(0, x, z, 2);
        if ((d === 1 && v < 0.42) || (d === 2 && v < 0.22)) next[i] = 0;
      } else {
        if (x < 2 || z < 2 || x >= W - 2 || z >= D - 2) continue;
        const d = distTo(1, x, z, 2);
        if (((d === 1 && v > 0.58) || (d === 2 && v > 0.8)) && safeAccrete(x, z)) { next[i] = 1; owner[i] = nearestUnit(x, z); }
      }
    }
    mask.set(next);
    unitAt.set(owner);
    const smooth = mask.slice();
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, z);
      if (protect[i]) continue;
      let k = 0;
      for (const [dx, dz] of N8) k += mask[idx(x + dx, z + dz)];
      if (mask[i] && k <= 2) smooth[i] = 0;
      else if (!mask[i] && k >= 6 && safeAccrete(x, z)) { smooth[i] = 1; unitAt[i] = nearestUnit(x, z); }
    }
    mask.set(smooth);
    for (let i = 0; i < mask.length; i++) if (!mask[i]) unitAt[i] = -1;
    const keep = new Uint8Array(W * D), seen = new Uint8Array(W * D);
    for (const u of unitList) {
      const [cx, cz] = centre(u), s0 = idx(cx, cz);
      if (seen[s0] || !mask[s0]) continue;
      const q = [s0];
      seen[s0] = 1;
      while (q.length) {
        const c = q.pop();
        keep[c] = 1;
        const x = c % W, z = (c / W) | 0;
        for (const [dx, dz] of N4) {
          const X = x + dx, Z = z + dz;
          if (!inGrid(X, Z)) continue;
          const j = idx(X, Z);
          if (mask[j] && !seen[j]) { seen[j] = 1; q.push(j); }
        }
      }
    }
    for (let i = 0; i < mask.length; i++) if (mask[i] && !keep[i]) { mask[i] = 0; unitAt[i] = -1; }
  }

  const zoneOf = (u) => P.zone.get(uk(u)) || null;
  const range = (u) => { const z = zoneOf(u); return z && T.heights?.[z] ? T.heights[z] : null; };
  const pads = Object.values(P.pads).filter((p) => p.near && p.far).map((p) => ({ id: p.id, role: p.role, near: p.near, far: p.far }));
  const landmassOf = new Map();
  for (const [k, id] of P.landmassOf) landmassOf.set(k, id);

  return {
    shape: T, id: shape.id, family: shape.family, feeling: shape.feeling, transform, scale: s,
    W, D, mask, unitAt, unitList, adj, keys, pads, P,
    landmasses: P.landmasses.length, landmassOf: (u) => landmassOf.get(uk(u)),
    inMask: (x, z) => inGrid(x, z) && !!mask[idx(x, z)],
    unitAtCell: (x, z) => (inGrid(x, z) && unitAt[idx(x, z)] >= 0 ? unitList[unitAt[idx(x, z)]] : null),
    centre, unitOf, rimDirs, zoneOf, range, landUnit, uk, unuk,
    landCells() { let n = 0; for (const v of mask) n += v; return n; },
  };
}
