import { mulberry32, hashSeed } from "../../core/rng.js";

export const W = 16, D = 12;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d, a = -Infinity, b = Infinity) => (Number.isFinite(+v) && v !== null && v !== "" ? clamp(+v, a, b) : d);

export const SHAPERS = {
  mound: { params: "peak [x,z] 0..1 of the grid (default [0.5,0.4]), height 2|3 (default 3), spread 0.6..1.4 (default 1), lobes 0..3 extra bumps", reads: "one swelling hill, terraces ring down from a summit; for soft masses, a sleeping or brooding subject, a portrait's single dome" },
  basin: { params: "floor 1 (fixed), wall 2|3 (default 3), open \"s\"|\"e\"|\"se\" side the wall breaks for the entrance (default \"se\"), pool true|false (still water in the floor), focal \"floor\"|\"wall\"", reads: "a bowl or crater walled on the far side, open toward the camera; for a gaze, an eye, a hollow, a gathering place" },
  radial: { params: "rings 2..4, center [x,z] 0..1, order \"up\" (centre highest) or \"down\" (centre lowest) or \"ripple\" (alternating), spokes 0..4 straight paths to the centre", reads: "concentric soft terraces; for airbrush gradients, irises, halos, anything that radiates" },
  spiral: { params: "turns 0.75..1.75, center [x,z] 0..1, climb \"in\" (rises to the centre) or \"out\", hand \"cw\"|\"ccw\"", reads: "one coiled path climbing to the figure; for curls, swirls, a coiled tail or a whorl" },
  patchwork: { params: "patch 2..4 cells, levels 1..3 max height, holes 0..3 patches dropped to void at the edge", reads: "a quilt of rectangular colour blocks at different heights; for fauvist or knife strokes, collage, flat colour areas" },
  ribbon: { params: "width 2..5, waves 0.5..2, rise \"up\"|\"down\"|\"arch\", fork true|false (a second thinner stroke splits off near the end), from \"w\"|\"s\"|\"sw\" where the stroke starts", reads: "one long sinuous stroke of land over void; for single-stroke ink, calligraphy, a tail, a wing, a flight line" },
  shards: { params: "count 3..6, spread 0..1, cracks true|false (thin void seams between slabs, crossed at one cell each)", reads: "angular slabs at different heights, tilted and broken; for crosshatch, pencil scratch, bone, spikes, a fractured subject" },
  symmetric: { params: "tiers 2..3, axis \"x\" (left-right mirror) or \"diag\" (mirror across the screen's vertical), notch 0..2 cells cut into the rim on the axis", reads: "a mirrored layout on an axis with the figure at its head; for frontal portraits, masks, faces, heraldic poses" },
  "twin-mass": { params: "split \"diag\"|\"x\"|\"z\", ratio 0.35..0.65 size of the first mass, heights [a,b] each 1..3, bridge \"land\"|\"planks\", focal \"a\"|\"b\"", reads: "two masses joined by a narrow bridge; for two figures, a creature and its double, head and body, predator and prey" },
};
export const SHAPER_NAMES = Object.keys(SHAPERS);

function field(v = 0) { return Array.from({ length: D }, () => new Array(W).fill(v)); }
function noise2(rnd) {
  const g = Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => rnd()));
  return (x, z) => {
    const u = (x / (W - 1)) * 5, v = (z / (D - 1)) * 4, i = Math.min(4, Math.floor(u)), j = Math.min(3, Math.floor(v)), fu = u - i, fv = v - j;
    const s = (t) => t * t * (3 - 2 * t);
    const a = g[j][i] + (g[j][i + 1] - g[j][i]) * s(fu), b = g[j + 1][i] + (g[j + 1][i + 1] - g[j + 1][i]) * s(fu);
    return a + (b - a) * s(fv);
  };
}
const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
const pt = (p, d) => (Array.isArray(p) && p.length === 2 ? [num(p[0], d[0], 0, 1) * (W - 1), num(p[1], d[1], 0, 1) * (D - 1)] : [d[0] * (W - 1), d[1] * (D - 1)]);

function blobOutline(H, rnd, o = {}) {
  const n = noise2(rnd), cx = o.cx ?? 7.5, cz = o.cz ?? 5.5, rx = o.rx ?? 6.6, rz = o.rz ?? 5.0, bite = o.bite ?? 0.28;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const r = Math.pow(Math.pow(Math.abs(x - cx) / rx, 2.4) + Math.pow(Math.abs(z - cz) / rz, 2.4), 1 / 2.4);
    if (r > 1 - bite * (n(x, z) - 0.35)) H[z][x] = 0;
  }
}

function rimAndKeep(H, keep, P) {
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (x === 0 || z === 0 || x === W - 1 || z === D - 1) H[z][x] = 0;
  for (let pass = 0; pass < 3; pass++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x] > 0 && !keep(x, z) && N4.filter(([dx, dz]) => (H[z + dz]?.[x + dx] ?? 0) > 0).length < 2) H[z][x] = 0;
  const seen = new Set(), comps = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!H[z][x] || seen.has(z * W + x)) continue;
    const comp = [], st = [[x, z]]; seen.add(z * W + x);
    while (st.length) { const [a, b] = st.pop(); comp.push([a, b]); for (const [dx, dz] of N4) { const X = a + dx, Z = b + dz; if (inb(X, Z) && H[Z][X] && !seen.has(Z * W + X)) { seen.add(Z * W + X); st.push([X, Z]); } } }
    comps.push(comp);
  }
  const main = comps.find((c) => c.some(([a, b]) => keep(a, b))) || comps.sort((a, b) => b.length - a.length)[0] || [];
  const mset = new Set(main.map(([a, b]) => b * W + a));
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x] && !mset.has(z * W + x)) { H[z][x] = 0; if (P) P.delete(z * W + x); }
}

function smoothSteps(H, fixed) {
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (!H[z][x] || fixed(x, z)) continue;
      const lo = Math.min(...N4.map(([dx, dz]) => H[z + dz]?.[x + dx] ?? 0).filter((v) => v > 0), 9);
      if (lo < 9 && H[z][x] - lo > 1) { H[z][x] = lo + 1; changed = true; }
    }
    if (!changed) break;
  }
}

function stepOk(H, x, z, dx, dz) {
  const a = H[z][x], b = H[z + dz]?.[x + dx];
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.abs(a - b) !== 1) return false;
  const [hx, hz, sx, sz] = b > a ? [x + dx, z + dz, dx, dz] : [x, z, -dx, -dz];
  return H[hz + sz]?.[hx + sx] === H[hz][hx];
}

function ensureRamps(H, start, fixed, wet = () => false) {
  for (let it = 0; it < 60; it++) {
    const seen = new Set([start[1] * W + start[0]]), st = [start];
    while (st.length) { const [x, z] = st.pop(); for (const [dx, dz] of N4) { const k = (z + dz) * W + x + dx; if (!seen.has(k) && !wet(x + dx, z + dz) && stepOk(H, x, z, dx, dz)) { seen.add(k); st.push([x + dx, z + dz]); } } }
    const miss = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x] && !wet(x, z) && !seen.has(z * W + x)) miss.push([x, z]);
    if (!miss.length) return 0;
    let done = false;
    for (const [x, z] of miss) {
      for (const [dx, dz] of N4) {
        const X = x + dx, Z = z + dz;
        if (!seen.has(Z * W + X) || Math.abs(H[z][x] - H[Z][X]) !== 1) continue;
        const [hx, hz, sx, sz] = H[z][x] > H[Z][X] ? [x, z, -dx, -dz] : [X, Z, dx, dz];
        const bx = hx + sx, bz = hz + sz;
        if (!inb(bx, bz) || !H[bz][bx] || fixed(bx, bz)) continue;
        H[bz][bx] = H[hz][hx];
        done = true; break;
      }
      if (done) break;
    }
    if (done) continue;
    const [x, z] = miss.find(([a, b]) => !fixed(a, b)) || miss[0];
    const nb = N4.map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => seen.has(b * W + a));
    if (nb.length) H[z][x] = H[nb[0][1]][nb[0][0]];
    else H[z][x] = Math.max(1, H[z][x] - 1);
  }
  return 1;
}

function grow(H, target, rnd, hFor, hold) {
  let n = H.flat().filter((v) => v > 0).length, guard = 0;
  while (n < target && guard++ < 400) {
    const cand = [];
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) if (!H[z][x] && !(hold && hold.has(z * W + x)) && N4.some(([dx, dz]) => H[z + dz][x + dx] > 0)) cand.push([x, z, Math.hypot((x - 7.5) / 7, (z - 5.5) / 5.5) + rnd() * 0.3]);
    if (!cand.length) break;
    cand.sort((a, b) => a[2] - b[2]);
    const [x, z] = cand[0];
    H[z][x] = hFor ? hFor(x, z) : Math.max(1, Math.min(...N4.map(([dx, dz]) => H[z + dz][x + dx]).filter((v) => v > 0)));
    n++;
  }
}

function placeFocal(H, want, h, o = {}) {
  let best = null;
  for (let z = 1; z < D - 2; z++) for (let x = 1; x < W - 2; x++) {
    const d = Math.hypot(x + 0.5 - want[0], z + 0.5 - want[1]);
    if (o.within && !o.within(x, z)) continue;
    if (!best || d < best[2]) best = [x, z, d];
  }
  const [fx, fz] = best;
  for (let dz = -2; dz <= 3; dz++) for (let dx = -2; dx <= 3; dx++) {
    const X = fx + dx, Z = fz + dz;
    if (!inb(X, Z) || X === 0 || Z === 0 || X === W - 1 || Z === D - 1) continue;
    const core = dx >= -1 && dx <= 2 && dz >= -1 && dz <= 2;
    if (core || H[Z][X] > 0) H[Z][X] = h;
  }
  return [fx, fz];
}

function carvePath(from, to, H, P, o = {}) {
  const key = (x, z) => z * W + x;
  const dist = new Map([[key(...from), 0]]), prev = new Map(), open = [[0, ...from]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, x, z] = open.shift();
    if (x === to[0] && z === to[1]) break;
    if (d > (dist.get(key(x, z)) ?? Infinity)) continue;
    for (const [dx, dz] of N4) {
      const X = x + dx, Z = z + dz;
      if (!inb(X, Z) || !H[Z][X]) continue;
      const dh = Math.abs(H[Z][X] - H[z][x]);
      if (dh > 1) continue;
      const nd = d + 1 + dh * (o.climb ?? 1.5) + (o.bias ? o.bias(X, Z) : 0);
      if (nd < (dist.get(key(X, Z)) ?? Infinity)) { dist.set(key(X, Z), nd); prev.set(key(X, Z), key(x, z)); open.push([nd, X, Z]); }
    }
  }
  let k = key(...to);
  if (!prev.has(k)) return [];
  const out = [];
  while (k !== undefined) { out.unshift([k % W, Math.floor(k / W)]); k = prev.get(k); }
  for (const [x, z] of out) P.add(key(x, z));
  return out;
}

function spawnEdge(H, from, focal) {
  let best = null;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!H[z][x] || !N4.some(([dx, dz]) => !(H[z + dz]?.[x + dx] > 0))) continue;
    const want = from === "w" ? [1, 6] : from === "sw" ? [2, 10] : from === "e" ? [14, 6] : [9, 10];
    const d = Math.hypot(x - want[0], z - want[1]) - Math.hypot(x - focal[0], z - focal[1]) * 0.25;
    if (!best || d < best[2]) best = [x, z, d];
  }
  return best ? [best[0], best[1]] : [8, 10];
}

const SHAPE = {
  mound(p, rnd) {
    const H = field(0), [px, pz] = pt(p.peak, [0.5, 0.4]), top = num(p.height, 3, 2, 3), spread = num(p.spread, 1, 0.6, 1.4);
    const n = noise2(rnd), bumps = Array.from({ length: num(p.lobes, 1, 0, 3) | 0 }, () => [2 + rnd() * 11, 2 + rnd() * 7, 1.3 + rnd()]);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      let r = Math.hypot((x - px) / (5.2 * spread), (z - pz) / (4.2 * spread));
      for (const [bx, bz, br] of bumps) r = Math.min(r, Math.hypot(x - bx, z - bz) / (br * 2.4 * spread) + 0.45);
      r += (n(x, z) - 0.5) * 0.3;
      H[z][x] = r > 1.18 ? 0 : r < 0.3 ? top : r < 0.62 ? Math.max(1, top - 1) : 1;
    }
    blobOutline(H, rnd, { rx: 7, rz: 5.3, bite: 0.18 });
    return { H, focalWant: [px + 0.5, pz + 0.5], focalH: top };
  },
  basin(p, rnd) {
    const H = field(0), wall = num(p.wall, 3, 2, 3), open = String(p.open || "se"), n = noise2(rnd);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const r = Math.hypot((x - 7.5) / 6.4, (z - 5.6) / 4.8) + (n(x, z) - 0.5) * 0.18;
      const openSide = (open.includes("s") && z >= 8 && Math.abs(x - 8) < 3.5) || (open.includes("e") && x >= 11 && Math.abs(z - 6) < 2.5) || (open === "se" && x + z >= 17);
      H[z][x] = r > 1.3 ? 0 : r > 0.72 && !openSide ? (x + z < 14 ? wall : Math.max(1, wall - 1)) : r > 0.72 ? 1 : 1;
    }
    blobOutline(H, rnd, { rx: 7.6, rz: 5.7, bite: 0.1 });
    const pool = [];
    if (p.pool === true || p.pool === "true") for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const r = Math.hypot((x - 6.2) / 2.2, (z - 6.4) / 1.6); if (r < 1 && H[z][x] === 1) pool.push([x, z]); }
    const onWall = p.focal === "wall";
    return { H, focalWant: onWall ? [5, 2.6] : [8.8, 5.4], focalH: onWall ? wall : 1, water: pool };
  },
  radial(p, rnd) {
    const H = field(0), [cx, cz] = pt(p.center, [0.5, 0.42]), rings = num(p.rings, 3, 2, 4) | 0, order = String(p.order || "up"), n = noise2(rnd);
    const lv = (i) => (order === "down" ? Math.min(3, 1 + i) : order === "ripple" ? [3, 2, 1, 2][i] : Math.max(1, 3 - i));
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const r = Math.hypot((x - cx) / 6.8, (z - cz) / 5.2) + (n(x, z) - 0.5) * 0.12;
      if (r > 1.05) continue;
      const i = Math.min(rings - 1, Math.floor((r / 1.0) * rings));
      H[z][x] = lv(i);
    }
    blobOutline(H, rnd, { cx, cz, rx: 7, rz: 5.3, bite: 0.14 });
    const P = new Set(), spokes = num(p.spokes, 1, 0, 4) | 0;
    for (let s = 0; s < spokes; s++) {
      const a = Math.PI * (0.25 + (s / Math.max(1, spokes)) * 2) + 0.4;
      let x = cx, z = cz;
      for (let t = 0; t < 12; t++) { x += Math.cos(a); z += Math.sin(a); const X = Math.round(x), Z = Math.round(z); if (!inb(X, Z) || !H[Z][X]) break; P.add(Z * W + X); }
    }
    return { H, P, focalWant: [cx + 0.5, cz + 0.5], focalH: lv(0) };
  },
  spiral(p, rnd) {
    const H = field(0), [cx, cz] = pt(p.center, [0.48, 0.42]), turns = num(p.turns, 1.25, 0.75, 1.75), climbIn = p.climb !== "out", hand = p.hand === "ccw" ? -1 : 1;
    blobOutline(H, rnd, { cx: cx + 0.3, cz: cz + 0.3, rx: 7.2, rz: 5.5, bite: 0.1 });
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x] === 0 && Math.hypot((x - cx) / 6.9, (z - cz) / 5.3) < 1.02) H[z][x] = 1;
    const rmax = 5.8, arm = [];
    for (let t = 0; t <= 1; t += 0.004) {
      const a = hand * t * turns * Math.PI * 2 + 2.3, r = rmax * (1 - t) + 1.1 * t;
      arm.push([Math.round(cx + Math.cos(a) * r * 1.2), Math.round(cz + Math.sin(a) * r * 0.9), t]);
    }
    const tAt = field(-1);
    for (const [x, z, t] of arm) if (inb(x, z) && tAt[z][x] < 0) tAt[z][x] = t;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (!H[z][x]) continue;
      let bt = 0, bd = Infinity;
      for (const [ax, az, t] of arm) { const d = Math.hypot(ax - x, az - z); if (d < bd) { bd = d; bt = t; } }
      const lvl = climbIn ? 1 + Math.floor(bt * 2.99) : 3 - Math.floor(bt * 2.99);
      H[z][x] = bd > 1.6 && bt > 0.12 && bt < 0.9 ? Math.min(3, lvl + 1) : lvl;
    }
    const P = new Set();
    for (const [x, z] of arm) if (inb(x, z) && H[z][x]) P.add(z * W + x);
    const end = arm[arm.length - 1];
    return { H, P, focalWant: [end[0] + 0.5, end[1] + 0.5], focalH: climbIn ? 3 : 1, from: [arm[0][0], arm[0][1]] };
  },
  patchwork(p, rnd) {
    const H = field(0), S = field(null), size = num(p.patch, 3, 2, 4) | 0, top = num(p.levels, 3, 1, 3) | 0, holes = num(p.holes, 2, 0, 3) | 0;
    const cols = [], rows = [];
    for (let x = 1; x < W - 1;) { const w = size - 1 + Math.floor(rnd() * 3); cols.push([x, Math.min(W - 1, x + w)]); x += w; }
    for (let z = 1; z < D - 1;) { const d = size - 1 + Math.floor(rnd() * 2) + 1; rows.push([z, Math.min(D - 1, z + d)]); z += d; }
    const patches = [];
    rows.forEach(([z0, z1], j) => {
      let x = 1;
      while (x < W - 1) {
        const w = Math.max(2, size - 1 + Math.floor(rnd() * 3)), x1 = Math.min(W - 1, x + w);
        patches.push({ x0: x, x1, z0, z1, h: 1 + Math.floor(rnd() * top), j, s: Math.floor(rnd() * 4) });
        x = x1;
      }
    });
    for (const q of patches) {
      const nb = patches.filter((o) => o !== q && o.j === q.j - 1 && o.x0 < q.x1 && o.x1 > q.x0);
      if (nb.length && Math.abs(nb[0].h - q.h) > 1) q.h = nb[0].h + Math.sign(q.h - nb[0].h);
      for (let z = q.z0; z < q.z1; z++) for (let x = q.x0; x < q.x1; x++) { H[z][x] = q.h; S[z][x] = q.s; }
    }
    blobOutline(H, rnd, { rx: 7.2, rz: 5.5, bite: 0.08 });
    const edge = patches.filter((q) => q.x0 <= 1 || q.x1 >= W - 1 || q.z0 <= 1 || q.z1 >= D - 1).sort(() => rnd() - 0.5).slice(0, holes);
    for (const q of edge) for (let z = q.z0; z < q.z1; z++) for (let x = q.x0; x < q.x1; x++) if ((q.x0 <= 1 && x < q.x0 + 2) || (q.x1 >= W - 1 && x >= q.x1 - 2) || (q.z0 <= 1 && z < q.z0 + 2) || (q.z1 >= D - 1 && z >= q.z1 - 2)) H[z][x] = 0;
    const hi = patches.filter((q) => q.z0 <= 5).sort((a, b) => b.h - a.h || a.z0 - b.z0)[0];
    return { H, S, focalWant: hi ? [(hi.x0 + hi.x1) / 2, (hi.z0 + hi.z1) / 2] : [8, 4], focalH: hi ? hi.h : 2 };
  },
  ribbon(p, rnd) {
    const H = field(0), width = num(p.width, 4, 2, 5), waves = num(p.waves, 1, 0.5, 2), rise = String(p.rise || "up"), from = String(p.from || "sw");
    const A = from === "w" ? [1, 7] : from === "s" ? [6, 10.5] : [1.5, 9.5], B = from === "s" ? [10, 1.5] : [13.5, 2.5];
    const path = [];
    for (let t = 0; t <= 1; t += 0.01) {
      const bx = A[0] + (B[0] - A[0]) * t, bz = A[1] + (B[1] - A[1]) * t;
      const nx = -(B[1] - A[1]), nz = B[0] - A[0], nl = Math.hypot(nx, nz), amp = 2.2 * Math.sin(t * Math.PI * waves * 2) * Math.sin(t * Math.PI);
      path.push([bx + (nx / nl) * amp, bz + (nz / nl) * amp, t]);
    }
    const lvl = (t) => rise === "down" ? 3 - Math.floor(t * 2.99) : rise === "arch" ? 1 + Math.round(2 * Math.sin(t * Math.PI)) : 1 + Math.floor(t * 2.99);
    const paint = (pts, wd) => {
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        let bd = Infinity, bt = 0;
        for (const [px, pz, t] of pts) { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; bt = t; } }
        const w = wd * (0.55 + 0.45 * Math.sin(Math.min(1, bt * 1.15) * Math.PI * 0.9 + 0.3));
        if (bd <= w / 2 + 0.25) H[z][x] = Math.max(H[z][x], lvl(bt));
      }
    };
    paint(path, width + 1.2);
    let fork = [];
    if (p.fork === true || p.fork === "true") {
      const s = path[Math.floor(path.length * 0.25)];
      for (let t = 0; t <= 1; t += 0.02) fork.push([s[0] + t * 4.5 + 0.5, s[1] + t * 2.6 + 0.2, s[2]]);
      paint(fork, width * 0.75);
    }
    const hold = new Set();
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (!H[z][x] && !N4.some(([dx, dz]) => H[z + dz]?.[x + dx] > 0 || H[z + 2 * dz]?.[x + 2 * dx] > 0)) hold.add(z * W + x);
    grow(H, 96, rnd, null, hold);
    const P = new Set();
    for (const [x, z] of path) { const X = Math.round(x), Z = Math.round(z); if (inb(X, Z) && H[Z][X]) P.add(Z * W + X); }
    const end = path[Math.floor(path.length * 0.86)];
    return { H, P, hold, focalWant: [end[0], end[1]], focalH: lvl(0.86), from: [Math.round(A[0] + 0.5), Math.round(A[1])] };
  },
  shards(p, rnd) {
    const H = field(0), count = num(p.count, 4, 3, 6) | 0, spread = num(p.spread, 0.5, 0, 1), cracks = p.cracks !== false && p.cracks !== "false";
    const id = field(-1), seeds = [];
    for (let i = 0; i < count; i++) seeds.push([3 + rnd() * 10, 2.5 + rnd() * 7, 1 + ((i + (rnd() < 0.5 ? 0 : 1)) % 3), rnd() * Math.PI]);
    seeds.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      let best = -1, bd = Infinity;
      seeds.forEach(([sx, sz, , a], i) => { const dx = x - sx, dz = z - sz, u = Math.abs(dx * Math.cos(a) + dz * Math.sin(a)), v = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a)); const d = Math.max(u * 0.9, v * 1.25); if (d < bd) { bd = d; best = i; } });
      id[z][x] = best; H[z][x] = seeds[best][2];
    }
    blobOutline(H, rnd, { rx: 7.2 - spread * 0.6, rz: 5.4 - spread * 0.4, bite: 0.22 });
    const hold = new Set();
    if (cracks) {
      const pairs = new Map();
      for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
        if (!H[z][x]) continue;
        const o = [[1, 0], [0, 1]].map(([dx, dz]) => (H[z + dz][x + dx] ? id[z + dz][x + dx] : id[z][x])).find((v) => v !== id[z][x]);
        if (o === undefined) continue;
        const k = [id[z][x], o].sort().join();
        if (!pairs.has(k)) pairs.set(k, []);
        pairs.get(k).push([x, z]);
      }
      for (const list of pairs.values()) {
        const cross = list.filter(([x, z]) => [[1, 0], [0, 1]].some(([dx, dz]) => H[z + dz]?.[x + dx] && H[z - dz]?.[x - dx] && id[z + dz][x + dx] !== id[z - dz][x - dx]));
        if (list.length < 3 || !cross.length) continue;
        const keep = cross[Math.floor(cross.length / 2)];
        const mate = list.find(([x, z]) => Math.abs(x - keep[0]) + Math.abs(z - keep[1]) === 1);
        const spared = [keep, mate].filter(Boolean);
        const lo = Math.min(...spared.flatMap(([x, z]) => N4.map(([dx, dz]) => H[z + dz]?.[x + dx]).filter((v) => v > 0)));
        for (const [x, z] of spared) H[z][x] = Math.max(1, lo);
        for (const [x, z] of list) if (!spared.some(([a, b]) => a === x && b === z)) { H[z][x] = 0; hold.add(z * W + x); }
      }
    }
    grow(H, 100, rnd, null, hold);
    const top = seeds.filter((s) => s[1] < 6).sort((a, b) => b[2] - a[2])[0] || seeds[0];
    return { H, hold, focalWant: [top[0], top[1]], focalH: top[2] };
  },
  symmetric(p, rnd) {
    const H = field(0), tiers = num(p.tiers, 3, 2, 3) | 0, diag = p.axis === "diag", notch = num(p.notch, 1, 0, 2) | 0, n = noise2(rnd);
    const half = field(0);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const u = diag ? (x - z + 4) / 2 : x - 7.5, v = diag ? (x + z) / 2 - 6.5 : z - 5.5;
      const au = Math.abs(u), r = Math.pow(Math.pow(au / 6.6, 2.2) + Math.pow(Math.abs(v) / (diag ? 6 : 5), 2.2), 1 / 2.2) + (n(Math.min(x, 15 - x), z) - 0.5) * 0.14;
      if (r > 1.02) continue;
      const depth = diag ? 1 - (v + 6) / 12 : 1 - (z - 1) / 10;
      half[z][x] = Math.max(1, Math.min(tiers, 1 + Math.floor(depth * tiers * 1.05 - au * 0.06)));
    }
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const [mx, mz] = diag ? [z + 4 <= 15 && x - 4 >= 0 ? z + 4 : x, x - 4 >= 0 && z + 4 <= 15 ? x - 4 : z] : [W - 1 - x, z];
      H[z][x] = inb(mx, mz) ? Math.min(half[z][x], half[mz]?.[mx] ?? half[z][x]) || 0 : half[z][x];
    }
    const P = new Set();
    if (diag) { for (let t = 0; t < 11; t++) { const x = 12 - Math.floor(t * 0.75), z = 10 - Math.ceil(t * 0.75); if (inb(x, z) && H[z][x]) P.add(z * W + x); } }
    else for (let z = 3; z < D - 1; z++) for (const x of [7, 8]) if (H[z][x]) P.add(z * W + x);
    if (notch) for (let k = 0; k < notch; k++) { const [x, z] = diag ? [14 - k, 11 - k] : [7 + (k % 2), 10 - Math.floor(k / 2) * 0]; if (inb(x, z)) { H[z][x] = 0; P.delete(z * W + x); } }
    return { H, P, focalWant: diag ? [5.5, 2.5] : [8, 2.6], focalH: tiers, from: diag ? [12, 10] : [8, 10] };
  },
  "twin-mass"(p, rnd) {
    const H = field(0), split = String(p.split || "diag"), ratio = num(p.ratio, 0.5, 0.35, 0.65), hs = Array.isArray(p.heights) ? p.heights.map((v) => num(v, 2, 1, 3) | 0) : [3, 1];
    const n = noise2(rnd);
    const A = split === "x" ? [3.8, 5.5] : split === "z" ? [7.5, 3] : [4, 3.2], B = split === "x" ? [11.6, 5.5] : split === "z" ? [7.5, 8.6] : [11.4, 8.2];
    const ra = 3.4 + ratio * 2.6, rb = 3.4 + (1 - ratio) * 2.6;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const da = Math.hypot((x - A[0]) / (ra * 1.15), (z - A[1]) / ra) + (n(x, z) - 0.5) * 0.3, db = Math.hypot((x - B[0]) / (rb * 1.15), (z - B[1]) / rb) + (n(z, x) - 0.5) * 0.3;
      if (da < 1) H[z][x] = da < 0.45 ? hs[0] : Math.max(1, hs[0] - 1);
      else if (db < 1) H[z][x] = db < 0.45 ? hs[1] : Math.max(1, hs[1] - 1);
    }
    const hold = new Set();
    const ab = [B[0] - A[0], B[1] - A[1]], L2 = ab[0] ** 2 + ab[1] ** 2;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const da = Math.hypot((x - A[0]) / (ra * 1.15), (z - A[1]) / ra), db = Math.hypot((x - B[0]) / (rb * 1.15), (z - B[1]) / rb);
      if (!H[z][x] && Math.min(da, db) > 1.4 + (n(x, z) - 0.5) * 0.4) hold.add(z * W + x);
      const t = ((x - A[0]) * ab[0] + (z - A[1]) * ab[1]) / L2;
      if (Math.abs(t - 0.5) < (p.bridge === "planks" ? 0.12 : 0.2)) { H[z][x] = 0; hold.add(z * W + x); }
    }
    const planks = p.bridge === "planks";
    const tOf = (x, z) => ((x - A[0]) * ab[0] + (z - A[1]) * ab[1]) / L2;
    let best = null;
    if (planks) for (const [dx, dz] of [[1, 0], [0, 1]]) for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (H[z][x] || !H[z - dz]?.[x - dx]) continue;
      let n = 0;
      while (inb(x + dx * n, z + dz * n) && !H[z + dz * n][x + dx * n] && n < 4) n++;
      const ex = x + dx * n, ez = z + dz * n;
      if (n < 1 || n > 3 || !inb(ex, ez) || !H[ez][ex]) continue;
      const ta = tOf(x - dx, z - dz), tb = tOf(ex, ez);
      if (!((ta < 0.5 && tb > 0.5) || (ta > 0.5 && tb < 0.5))) continue;
      const mid = [x + dx * (n - 1) / 2, z + dz * (n - 1) / 2], sc = Math.hypot(mid[0] - (A[0] + B[0]) / 2, mid[1] - (A[1] + B[1]) / 2) + n * 0.3;
      if (!best || sc < best.sc) best = { sc, x, z, dx, dz, n };
    }
    const bridge = [], line = [];
    let cx = Math.round(A[0]), cz = Math.round(A[1]);
    const bx = Math.round(B[0]), bz = Math.round(B[1]);
    line.push([cx, cz]);
    while (cx !== bx || cz !== bz) {
      const rx = Math.abs(bx - cx) / (Math.abs(bx - Math.round(A[0])) || 1), rz = Math.abs(bz - cz) / (Math.abs(bz - Math.round(A[1])) || 1);
      if (rx >= rz && cx !== bx) cx += Math.sign(bx - cx); else cz += Math.sign(bz - cz);
      line.push([cx, cz]);
    }
    const bh = Math.max(1, Math.min(hs[0], hs[1]) - 1);
    if (best) {
      const { x, z, dx, dz, n } = best;
      for (let k = -1; k <= n; k++) { const X = x + dx * k, Z = z + dz * k; H[Z][X] = bh; hold.delete(Z * W + X); if (k >= 0 && k < n) bridge.push([X, Z]); }
      for (const k of [-2, n + 1]) { const X = x + dx * k, Z = z + dz * k; if (inb(X, Z) && H[Z][X] > bh + 1) H[Z][X] = bh + 1; if (inb(X, Z) && !H[Z][X]) H[Z][X] = bh; }
    } else {
      const gap = line.filter(([x, z]) => !H[z][x]);
      const gi = gap.map(([x, z]) => line.findIndex(([a, b]) => a === x && b === z));
      const i0 = gi.length ? Math.min(...gi) : Math.floor(line.length * 0.4), i1 = gi.length ? Math.max(...gi) : Math.floor(line.length * 0.6);
      const [ox, oz] = split === "z" ? [1, 0] : [0, 1];
      line.forEach(([x, z], i) => {
        if (i < i0 - 1 || i > i1 + 1) return;
        const deck = i >= i0 && i <= i1;
        H[z][x] = deck ? bh : Math.min(Math.max(H[z][x], bh), bh + 1);
        hold.delete(z * W + x);
        if (deck) bridge.push([x, z]);
        if (deck && p.bridge !== "planks" && inb(x + ox, z + oz)) { H[z + oz][x + ox] = bh; hold.delete((z + oz) * W + x + ox); bridge.push([x + ox, z + oz]); }
      });
    }
    grow(H, 90, rnd, () => 1, hold);
    const f = p.focal === "b" ? B : A;
    return { H, hold, focalWant: [f[0] + 0.5, f[1]], focalH: hs[p.focal === "b" ? 1 : 0], bridge: p.bridge === "planks" && best ? bridge : [], from: p.focal === "b" ? [A[0] | 0, (A[1] + 2) | 0] : [(B[0] + 1) | 0, (B[1] + 1.5) | 0] };
  },
};

export function shape(spec, seed = 1) {
  const name = typeof spec === "string" ? spec : spec?.name;
  if (!SHAPE[name]) throw new Error(`unknown shaper ${name}; one of ${SHAPER_NAMES.join(", ")}`);
  const params = (typeof spec === "object" && spec.params) || {};
  const rnd = mulberry32(hashSeed(`${name}:${seed}:${JSON.stringify(params)}`));
  const r = SHAPE[name](params, rnd);
  const H = r.H, P = r.P || new Set();
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) H[z][x] = clamp(H[z][x] | 0, 0, 3);
  const water = new Set((r.water || []).map(([x, z]) => z * W + x));
  const focal = placeFocal(H, r.focalWant, clamp(r.focalH | 0 || 1, 1, 3), { within: (x, z) => !water.has(z * W + x) && !water.has(z * W + x + 1) });
  const isF = (x, z) => x >= focal[0] && x <= focal[0] + 1 && z >= focal[1] && z <= focal[1] + 1;
  const apron = (x, z) => x >= focal[0] - 1 && x <= focal[0] + 2 && z >= focal[1] - 1 && z <= focal[1] + 2;
  const bridge = new Set((r.bridge || []).map(([x, z]) => z * W + x));
  rimAndKeep(H, (x, z) => isF(x, z) || bridge.has(z * W + x), P);
  grow(H, 122, rnd, null, r.hold);
  rimAndKeep(H, (x, z) => isF(x, z) || bridge.has(z * W + x), P);
  {
    const nz = noise2(rnd), keepC = (x, z) => isF(x, z) || bridge.has(z * W + x) || P.has(z * W + x);
    let land = H.flat().filter((v) => v > 0).length;
    const rim = [];
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) if (H[z][x] && !keepC(x, z)) { const v = N4.filter(([dx, dz]) => !H[z + dz][x + dx]).length; if (v) rim.push([x, z, nz(x, z) + v * 0.25 + rnd() * 0.2]); }
    rim.sort((a, b) => b[2] - a[2]);
    for (const [x, z, sc] of rim) {
      if (land <= 114 || sc < 0.7) break;
      const nb = N4.map(([dx, dz]) => H[z + dz][x + dx] > 0);
      if ((nb[0] && nb[1] && !nb[2] && !nb[3]) || (nb[2] && nb[3] && !nb[0] && !nb[1]) || nb.filter(Boolean).length < 2) continue;
      H[z][x] = 0; land--;
    }
    rimAndKeep(H, (x, z) => isF(x, z) || bridge.has(z * W + x), P);
  }
  smoothSteps(H, apron);
  const capAt = (x, z) => { let dx = 0, dz = 0; while (H[z]?.[x + dx + 1] > 0) dx++; while (H[z + dz + 1]?.[x] > 0) dz++; return 1 + Math.min(dx, dz); };
  const caps = H.map((row, z) => row.map((v, x) => (v ? capAt(x, z) : 0)));
  const apronCells = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x] && apron(x, z)) apronCells.push([x, z]);
  const fCap = Math.min(...apronCells.map(([x, z]) => caps[z][x]), ...apronCells.filter(([x, z]) => isF(x, z)).map(([x, z]) => H[z][x]));
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x]) H[z][x] = apron(x, z) ? fCap : Math.min(H[z][x], caps[z][x]);
  for (let pass = 0; pass < 4; pass++) for (const k of [...water]) { const x = k % W, z = Math.floor(k / W); if (!H[z][x] || isF(x, z)) { water.delete(k); continue; } if (N4.some(([dx, dz]) => !(H[z + dz]?.[x + dx] > 0))) { H[z][x] = 0; water.delete(k); } }
  const wet = (x, z) => water.has(z * W + x);
  const from0 = spawnEdge(H, r.from ? null : spec?.params?.from, focal);
  const start0 = r.from && inb(...r.from) && H[r.from[1]][r.from[0]] ? r.from : from0;
  ensureRamps(H, start0, apron, wet);
  smoothSteps(H, apron);
  const ringH = [];
  for (let dz = -1; dz <= 2; dz++) for (let dx = -1; dx <= 2; dx++) { const X = focal[0] + dx, Z = focal[1] + dz; if (!isF(X, Z) && H[Z]?.[X] > 0) ringH.push(H[Z][X]); }
  const fh = ringH.length ? Math.max(...ringH) : 1;
  for (let dz = 0; dz <= 1; dz++) for (let dx = 0; dx <= 1; dx++) H[focal[1] + dz][focal[0] + dx] = fh;
  ensureRamps(H, start0, apron, wet);
  const from = spawnEdge(H, r.from ? null : spec?.params?.from, focal);
  const start = r.from && inb(...r.from) && H[r.from[1]][r.from[0]] ? r.from : from;
  if (!P.size) {
    const land = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (H[z][x]) land.push([x, z]);
    const tgt = [focal[0] + (focal[1] < 9 ? 0 : 0), focal[1] + 2];
    const goal = inb(...tgt) && H[tgt[1]][tgt[0]] ? tgt : [focal[0] - 1, focal[1] + 1];
    if (inb(...goal) && H[goal[1]][goal[0]]) carvePath(start, goal, H, P, { climb: 0.8 });
  }
  const grid = [], heights = [];
  for (let z = 0; z < D; z++) {
    let g = "", h = "";
    for (let x = 0; x < W; x++) {
      const k = z * W + x, v = H[z][x];
      const c = isF(x, z) ? "F" : !v ? "V" : water.has(k) ? "W" : P.has(k) ? "P" : v >= 2 ? "R" : "G";
      g += c; h += c === "V" || c === "W" ? "0" : String(v);
    }
    grid.push(g); heights.push(h);
  }
  return { name, params, seed, grid, heights, focal: { x: focal[0], z: focal[1] }, start, surfaces: r.S || null, bridge: [...bridge].filter((k) => H[Math.floor(k / W)][k % W]).map((k) => [k % W, Math.floor(k / W)]) };
}

function nearestLand(grid, x, z, avoid) {
  let best = null;
  for (let zz = 0; zz < D; zz++) for (let xx = 0; xx < W; xx++) {
    const g = grid[zz][xx];
    if (!"GRPT".includes(g) || avoid.has(zz * W + xx)) continue;
    const d = Math.abs(xx - x) + Math.abs(zz - z);
    if (!best || d < best[2]) best = [xx, zz, d];
  }
  return best ? [best[0], best[1]] : [x, z];
}

function landConnected(grid) {
  const cells = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if ("GRPTF".includes(grid[z][x])) cells.push([x, z]);
  if (!cells.length) return true;
  const seen = new Set([cells[0][1] * W + cells[0][0]]), st = [cells[0]];
  while (st.length) { const [x, z] = st.pop(); for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, k = Z * W + X; if (inb(X, Z) && !seen.has(k) && "GRPTF".includes(grid[Z][X])) { seen.add(k); st.push([X, Z]); } } }
  return seen.size === cells.length;
}

export function addPool(s, want, n) {
  const g = s.grid.map((r) => [...r]), h = s.heights.map((r) => [...r]);
  const interior = (x, z) => g[z][x] === "G" && h[z][x] === "1" && N4.every(([dx, dz]) => "GRPTFW".includes(g[z + dz]?.[x + dx] || "V")) && Math.abs(x - s.focal.x - 0.5) + Math.abs(z - s.focal.z - 0.5) > 3;
  let seedC = null;
  for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) if (interior(x, z)) { const d = Math.hypot(x - want[0], z - want[1]); if (!seedC || d < seedC[2]) seedC = [x, z, d]; }
  if (!seedC) return 0;
  const q = [[seedC[0], seedC[1]]], seen = new Set([seedC[1] * W + seedC[0]]);
  let placed = 0;
  while (q.length && placed < n) {
    const [x, z] = q.shift();
    if (!interior(x, z)) continue;
    g[z][x] = "W"; h[z][x] = "0";
    if (!landConnected(g.map((r) => r.join("")))) { g[z][x] = "G"; h[z][x] = "1"; continue; }
    placed++;
    for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, k = Z * W + X; if (inb(X, Z) && !seen.has(k)) { seen.add(k); q.push([X, Z]); } }
  }
  s.grid = g.map((r) => r.join("")); s.heights = h.map((r) => r.join(""));
  return placed;
}

export function applyShaper(brief, seed = 1) {
  const s = shape(brief.shaper, brief.shaper?.seed ?? seed);
  const ws = +brief.biome?.water_share || 0;
  if (ws >= 0.04 && !s.grid.join("").includes("W")) {
    const mg = brief.composition?.grid || [], wc = [];
    mg.forEach((row, z) => [...row].forEach((c, x) => { if (c === "W") wc.push([x, z]); }));
    const want = wc.length ? [wc.reduce((a, c) => a + c[0], 0) / wc.length, wc.reduce((a, c) => a + c[1], 0) / wc.length] : [W * 0.4, D * 0.65];
    s.pool = addPool(s, want, Math.min(14, Math.max(4, Math.round(ws * W * D))));
  }
  const out = JSON.parse(JSON.stringify(brief));
  const old = brief.composition || {};
  const of = old.focal || { x: 8, z: 4 };
  const dx = s.focal.x - of.x, dz = s.focal.z - of.z;
  const used = new Set();
  const lead = (out.creatures || []).find((c) => c.cell?.[0] === of.x && c.cell?.[1] === of.z) || out.creatures?.[0];
  for (const c of out.creatures || []) {
    if (c === lead) { c.cell = [s.focal.x, s.focal.z]; continue; }
    if (Array.isArray(c.cell)) { c.cell = nearestLand(s.grid, c.cell[0] + dx, c.cell[1] + dz, used); used.add(c.cell[1] * W + c.cell[0]); }
  }
  for (const m of out.motifs || []) {
    if (!Array.isArray(m.cells)) continue;
    m.cells = m.cells.map(([x, z]) => { const c = nearestLand(s.grid, clamp(x + dx, 0, W - 1), clamp(z + dz, 0, D - 1), used); used.add(c[1] * W + c[0]); return c; });
  }
  out.composition = { ...old, grid: s.grid, heights: s.heights, focal: { ...of, x: s.focal.x, z: s.focal.z }, shaped: { name: s.name, params: s.params, seed: s.seed, start: s.start, pool: s.pool || 0, bridge: s.bridge, model_grid: old.grid } };
  if (s.surfaces) out.composition.shaped.surfaces = s.surfaces.map((row) => row.map((v) => (v === null ? "." : String(v))).join(""));
  if (brief.biome) out.biome = { ...brief.biome, plateau_share: 0 };
  return out;
}
