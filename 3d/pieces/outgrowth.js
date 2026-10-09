const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" };
const LAND = new Set(["grass", "sand", "dirt", "stone"]);
const N4 = Object.values(DIRS);

export const SIDES = Object.keys(DIRS);

export function frame(at, side) {
  const [ox, oz] = DIRS[side], [lx, lz] = [-oz, ox];
  return (u, v) => [at[0] + ox * u + lx * v, at[1] + oz * u + lz * v];
}

export const BUILDERS = {
  dock(L, p) {
    const A = cellOf(L, p.at), g = frame(p.at, p.side), len = p.len ?? 3;
    const cells = [];
    for (let u = 1; u <= len; u++) cells.push([...g(u, 0), { h: A.h, s: "bridge", m: p.m || "planks", post: 1 }]);
    return cells;
  },
  plateau(L, p) {
    const A = cellOf(L, p.at), g = frame(p.at, p.side), tier = p.tier ?? 1, n = Math.abs(tier);
    const [depth, width] = p.size || [2, 2], v0 = p.v0 ?? -Math.floor((width - 1) / 2);
    const s = p.s || (LAND.has(A.s) ? A.s : "stone"), m = p.m || s;
    const cells = [];
    for (let k = 1; k <= n; k++) {
      const c = tier > 0 ? { h: A.h + k, s: "ramp", d: OPPOSITE[p.side], m } : { h: A.h - k + 1, s: "ramp", d: p.side, m };
      cells.push([...g(2 * k - 1, 0), c]);
      if (k < n) cells.push([...g(2 * k, 0), { h: A.h + Math.sign(tier) * k, s }]);
    }
    const st = 2 * n - 1;
    for (let u = st + 1; u <= st + depth; u++) for (let v = v0; v < v0 + width; v++) cells.push([...g(u, v), { h: A.h + tier, s }]);
    return cells;
  },
  walkway(L, p) {
    const A = cellOf(L, p.at), g = frame(p.at, p.side), len = p.len ?? 2;
    const [depth, width] = p.islet || [2, 2], v0 = p.v0 ?? -Math.floor((width - 1) / 2);
    const s = p.s || "stone", cells = [];
    for (let u = 1; u <= len; u++) cells.push([...g(u, 0), p.causeway ? { h: A.h, s } : { h: A.h, s: "bridge", m: p.m || "planks" }]);
    for (let u = len + 1; u <= len + depth; u++) for (let v = v0; v < v0 + width; v++) cells.push([...g(u, v), { h: A.h, s }]);
    return cells;
  },
};

const cellOf = (L, [x, z]) => (x >= 0 && z >= 0 && x < L.size[0] && z < L.size[1] ? L.cells[z][x] : null);
const k = (x, z) => x + "," + z;

export function thingCells(L) {
  const s = new Set((L.decor || []).map((d) => k(d.x, d.z)));
  for (const t of L.things || []) {
    const [w, d] = t.size || [1, 1];
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) s.add(k(t.x + dx, t.z + dz));
    for (const [x, z] of [...(t.blocks || []), ...(t.threshold || []), ...(t.edge || [])]) s.add(k(x, z));
  }
  return s;
}

export function plan(L, specs, o = {}) {
  const taken = new Map(), out = [], problems = [];
  const busy = new Set([...thingCells(L), ...(o.busy || [])]);
  for (const p of specs) {
    const A = cellOf(L, p.at), why = [];
    if (!A || A.h < 1 || !LAND.has(A.s)) why.push(`anchor ${p.at} is ${A ? A.s : "off grid"}`);
    else if (busy.has(k(...p.at))) why.push(`anchor ${p.at} holds a thing or decor`);
    const cells = why.length ? [] : BUILDERS[p.kind](L, p);
    const own = new Set(cells.map(([x, z]) => k(x, z)));
    for (const [x, z, c] of cells) {
      if (c.h < 1) why.push(`${x},${z} below ground`);
      const e = cellOf(L, [x, z]);
      if ((e && e.s !== "none") || taken.has(k(x, z))) why.push(`${x},${z} occupied`);
      for (const [dx, dz] of N4) {
        const nx = x + dx, nz = z + dz, nk = k(nx, nz);
        if (own.has(nk)) continue;
        const first = nx === p.at[0] && nz === p.at[1] && Math.abs(x - p.at[0]) + Math.abs(z - p.at[1]) === 1;
        if (first) continue;
        const n = cellOf(L, [nx, nz]);
        if ((n && n.s !== "none") || taken.has(nk)) why.push(`${x},${z} touches ${nx},${nz}`);
      }
    }
    if (why.length) { problems.push(`${p.kind} ${p.side} at ${p.at}: ${why[0]}`); continue; }
    for (const [x, z] of cells) taken.set(k(x, z), p);
    const decor = (p.decor || []).map((d) => { const [x, z] = frame(p.at, p.side)(d.u, d.v || 0); return { t: d.t, x, z, v: d.var || 0, rot: d.rot || 0, ox: d.ox || 0, oz: d.oz || 0 }; });
    out.push({ ...p, cells, decor });
  }
  return { pieces: out, problems };
}

export function growGrid(L, pad) {
  const [l, t, r, b] = pad;
  if (!(l || t || r || b)) return [0, 0];
  const [W, D] = L.size, W2 = W + l + r, D2 = D + t + b;
  const rows = Array.from({ length: D2 }, (_, z) => Array.from({ length: W2 }, (_, x) => (z - t >= 0 && z - t < D && x - l >= 0 && x - l < W ? L.cells[z - t][x - l] : { h: 0, s: "none" })));
  L.cells.splice(0, L.cells.length, ...rows);
  L.size = [W2, D2];
  const mv = (c) => { c[0] += l; c[1] += t; };
  for (const d of L.decor || []) { d.x += l; d.z += t; }
  for (const e of L.edits || []) { e.x += l; e.z += t; }
  for (const th of L.things || []) { th.x += l; th.z += t; for (const f of ["blocks", "threshold", "edge"]) for (const c of th[f] || []) mv(c); }
  if (L.spawn) mv(L.spawn);
  for (const g of L.outgrowths || []) { mv(g.at); for (const c of g.cells) mv(c); }
  return [l, t];
}

export function echo(L, spec) {
  if (!spec) return [];
  const [l, t] = growGrid(L, spec.pad || [0, 0, 0, 0]);
  for (const [x, z, c] of spec.cells) L.cells[z][x] = { ...c };
  for (const d of spec.decor || []) L.decor.push({ ...d });
  return [`back echo: ${spec.cells.length} cells, ${(spec.decor || []).length} decor${l || t ? `, shift ${l},${t}` : ""}`];
}

export function outgrow(L, specs, o = {}) {
  const log = [];
  if (!specs?.length || L.outgrowths?.length) return log;
  const { pieces, problems } = plan(L, specs, o);
  for (const p of problems) log.push("skipped " + p);
  if (!pieces.length) return log;
  const all = pieces.flatMap((p) => p.cells);
  const xs = all.map((c) => c[0]), zs = all.map((c) => c[1]);
  const [W, D] = L.size;
  const [dx, dz] = growGrid(L, [Math.max(0, -Math.min(...xs)), Math.max(0, -Math.min(...zs)), Math.max(0, Math.max(...xs) - W + 1), Math.max(0, Math.max(...zs) - D + 1)]);
  L.outgrowths = [];
  for (const p of pieces) {
    const cells = p.cells.map(([x, z, c]) => [x + dx, z + dz, c]);
    for (const [x, z, c] of cells) L.cells[z][x] = { ...c };
    for (const d of p.decor) L.decor.push({ ...d, x: d.x + dx, z: d.z + dz });
    L.outgrowths.push({ kind: p.kind, side: p.side, at: [p.at[0] + dx, p.at[1] + dz], cells: cells.map(([x, z]) => [x, z]) });
    log.push(`${p.kind} ${p.side} at ${p.at[0] + dx},${p.at[1] + dz}: ${cells.length} cells, ${p.decor.length} decor`);
  }
  if (dx || dz || L.size[0] !== W || L.size[1] !== D) log.push(`grid ${W}x${D} -> ${L.size[0]}x${L.size[1]}, shift ${dx},${dz}`);
  return log;
}

export function suggest(L, o = {}) {
  const kinds = o.kinds || ["dock", "plateau", "walkway"], sides = o.sides || ["n", "w"], want = o.count ?? 3;
  const rnd = o.rnd || Math.random, busy = new Set([...thingCells(L), ...(o.busy || [])]);
  const edge = [];
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
    const c = L.cells[z][x];
    if (!c || c.h < 1 || !LAND.has(c.s) || busy.has(k(x, z))) continue;
    for (const side of sides) { const [ox, oz] = DIRS[side], n = cellOf(L, [x + ox, z + oz]); if (!n || n.s === "none") edge.push({ at: [x, z], side }); }
  }
  const picked = [];
  for (let i = 0; i < 200 && picked.length < want; i++) {
    const e = edge[Math.floor(rnd() * edge.length)], kind = kinds[picked.length % kinds.length];
    if (!e) break;
    const spec = { kind, ...e, ...(kind === "plateau" ? { tier: rnd() < 0.7 ? 1 : 2 } : {}) };
    if (!plan(L, [...picked, spec], { busy }).problems.length) picked.push(spec);
  }
  return picked;
}
