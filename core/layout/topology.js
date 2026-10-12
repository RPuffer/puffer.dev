export const LATTICE = { x0: 1, z0: 2, step: 3, S: [2, 8], E: [5, 2] };

export const allowed = ([c, r]) => (c >= 0 && c <= 2 && r >= 0 && r <= 10) || (c >= 0 && c <= 8 && r >= 0 && r <= 2);
export const nodeCell = ([c, r]) => [LATTICE.x0 + c * LATTICE.step, LATTICE.z0 + r * LATTICE.step];
export const nk = ([c, r]) => c + ":" + r;
export const ek = (a, b) => (nk(a) < nk(b) ? nk(a) + "|" + nk(b) : nk(b) + "|" + nk(a));
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const S = LATTICE.S, E = LATTICE.E;

export function unitSteps(nodes) {
  const out = [];
  for (let i = 1; i < nodes.length; i++) {
    const [a, b] = [nodes[i - 1], nodes[i]];
    if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`diagonal leg ${nk(a)} to ${nk(b)}`);
    const dc = Math.sign(b[0] - a[0]), dr = Math.sign(b[1] - a[1]);
    for (let p = a; p[0] !== b[0] || p[1] !== b[1]; ) {
      const q = [p[0] + dc, p[1] + dr];
      out.push([p, q]);
      p = q;
    }
  }
  return out;
}

function ring(rng) {
  const s = rng.pick([9, 10]), a = rng.int(4, 7), via = rng.pick([1, 2]), k = rng.pick([3, 4]);
  return {
    main: [S, [2, s], [0, s], [0, 1], [5, 1], E],
    extra: [{ nodes: [[k, 1], [k, 0]], role: "branch", chest: true }],
    chord: via === 2 ? [[2, 1], S] : [[1, 1], [1, 8], S],
    h: ([, r]) => (r >= a ? 1 : 2),
  };
}

function figure8(rng) {
  const j = rng.pick([4, 5, 6]), s = rng.pick([9, 10]), k = rng.pick([3, 4]);
  return {
    main: [S, [1, 8], [1, s], [0, s], [0, j], [1, j], [1, 2], E],
    extra: [
      { nodes: [[1, j], [2, j], [2, 2]], role: "spine" },
      { nodes: [[k, 2], [k, 1]], role: "branch", chest: true },
    ],
    chord: [[1, j], [1, 8]],
    h: ([, r]) => (r > j ? 1 : 2),
  };
}

function spiral(rng) {
  const s = rng.pick([9, 10]), a = rng.int(5, 7), k = rng.pick([3, 4, 5]), d = rng.pick([6, 7]);
  return {
    main: [S, [2, s], [0, s], [0, 0], [8, 0], [8, 1], [5, 1], E],
    extra: [{ nodes: [[d, 1], [d, 2]], role: "branch", chest: true }],
    chord: [[1, 0], [1, 8], S],
    h: ([c, r]) => {
      if (c <= 2 && r >= a) return 1;
      if (r === 0) return c >= k ? 3 : 2;
      if (c >= 5) return 3;
      return 2;
    },
  };
}

function switchback(rng) {
  const a = rng.pick([6, 7]), b = rng.pick([4, 5]), k = rng.pick([3, 4]);
  const main = [S, [0, 8]];
  let col = 0;
  for (let r = 7; r >= 3; r--) {
    main.push([col, r]);
    col = col === 0 ? 1 : 0;
    main.push([col, r]);
  }
  main.push([col, 2], E);
  const clean = main.filter((n, i) => i === 0 || nk(n) !== nk(main[i - 1]));
  return {
    main: clean,
    extra: [{ nodes: [[k, 2], [k, 1]], role: "branch", chest: true }],
    chord: [[2, 2], S],
    h: ([, r]) => (r >= a ? 1 : r >= b ? 2 : 3),
  };
}

function comb(rng) {
  const a = rng.int(4, 6);
  const rows = rng.shuffle([2, 3, 4, 5, 6, 7]);
  const teeth = [];
  for (const r of rows) if (teeth.length < 3 && teeth.every((q) => Math.abs(q - r) >= 2)) teeth.push(r);
  const north = rng.pick([3, 4]);
  const chestTooth = rng.int(0, teeth.length);
  const extra = teeth.map((r, i) => ({ nodes: [[0, r], [1, r]], role: "branch", chest: i === chestTooth }));
  extra.push({ nodes: [[north, 1], [north, 0]], role: "branch", chest: chestTooth === teeth.length });
  return {
    main: [S, [0, 8], [0, 1], [5, 1], E],
    extra,
    chord: [[2, 1], S],
    h: ([, r]) => (r >= a ? 1 : 2),
  };
}

function twin(rng) {
  const s = rng.pick([9, 10]), a = rng.int(4, 7), b = rng.int(4, 7), k = rng.pick([3, 4]);
  return {
    main: [S, [2, s], [1, s], [1, 2], E],
    extra: [
      { nodes: [[1, s], [0, s], [0, 2], [1, 2]], role: "spine" },
      { nodes: [[k, 2], [k, 1]], role: "branch", chest: true },
    ],
    chord: [[2, 2], S],
    h: ([c, r]) => (c === 0 ? (r >= b ? 1 : 2) : r >= a ? 1 : 2),
  };
}

function maze(rng) {
  const inMaze = ([c, r]) => (c >= 0 && c <= 2 && r >= 0 && r <= 10) || (c >= 3 && c <= 4 && r >= 0 && r <= 2);
  const X = [4, 2];
  const root = rng.pick([X, [0, 0], [0, 10], [2, 10]]);
  const edges = new Set(), seen = new Set([nk(root)]);
  const frontier = N4.map(([dc, dr]) => [root, [root[0] + dc, root[1] + dr]]).filter(([, n]) => inMaze(n));
  while (frontier.length) {
    const i = rng.int(0, frontier.length - 1);
    const [a, n] = frontier.splice(i, 1)[0];
    if (seen.has(nk(n))) continue;
    edges.add(ek(a, n)); seen.add(nk(n));
    for (const [dc, dr] of N4) { const q = [n[0] + dc, n[1] + dr]; if (inMaze(q) && !seen.has(nk(q))) frontier.push([n, q]); }
  }
  const adj = () => {
    const m = new Map();
    for (const e of edges) { const [p, q] = e.split("|"); if (!m.has(p)) m.set(p, []); if (!m.has(q)) m.set(q, []); m.get(p).push(q); m.get(q).push(p); }
    return m;
  };
  const bfs = (from, m = adj()) => { const d = new Map([[from, 0]]), q = [from]; for (let i = 0; i < q.length; i++) for (const n of m.get(q[i]) || []) if (!d.has(n)) { d.set(n, d.get(q[i]) + 1); q.push(n); } return d; };
  const unkey = (k) => k.split(":").map(Number);
  const deg = (k, m) => (m.get(k) || []).length;
  const rim = (n) => n[0] === 0 || n[1] === 10 || n[1] === 0;
  let m = adj();
  const deads = rng.shuffle([...m.keys()].filter((k) => deg(k, m) === 1 && k !== nk(S) && k !== nk(X)));
  const keep = deads.find((k) => rim(unkey(k)));
  for (const k of deads) {
    if (k === keep) continue;
    m = adj();
    const n = unkey(k), d = bfs(k, m);
    const opts = N4.map(([dc, dr]) => [n[0] + dc, n[1] + dr]).filter((q) => inMaze(q) && !edges.has(ek(n, q)) && (d.get(nk(q)) ?? 0) >= 4);
    if (opts.length && rng.chance(0.45)) edges.add(ek(n, opts.sort((p, q) => d.get(nk(q)) - d.get(nk(p)))[0]));
  }
  m = adj();
  const fromS = bfs(nk(S), m);
  let chord = null, best = 0;
  for (const uk of m.keys()) {
    const u = unkey(uk);
    if (fromS.get(uk) > 3) continue;
    for (const [dc, dr] of N4) {
      const v = [u[0] + dc, u[1] + dr];
      if (!inMaze(v) || edges.has(ek(u, v)) || nk(v) === nk(X)) continue;
      const gain = fromS.get(nk(v)) - 1 - fromS.get(uk);
      if (gain > best) { best = gain; chord = [v, u]; }
    }
  }
  if (!chord || best < 3) throw new Error("maze: no lever chord saves enough");
  const prev = new Map([[nk(S), null]]), q = [nk(S)];
  for (let i = 0; i < q.length; i++) for (const n of m.get(q[i]) || []) if (!prev.has(n)) { prev.set(n, q[i]); q.push(n); }
  const path = [];
  for (let k = nk(X); k; k = prev.get(k)) path.unshift(unkey(k));
  const onMain = new Set();
  for (let i = 1; i < path.length; i++) onMain.add(ek(path[i - 1], path[i]));
  const deadNow = [...m.keys()].filter((k) => deg(k, m) === 1 && k !== nk(S) && k !== nk(X)).map(unkey);
  const chestAt = deadNow.find(rim) ? nk(deadNow.find(rim)) : null;
  const extra = [...edges].filter((e) => !onMain.has(e)).map((e) => {
    const [p, qq] = e.split("|").map(unkey);
    const [a, b] = nk(qq) === chestAt ? [p, qq] : nk(p) === chestAt ? [qq, p] : [p, qq];
    return { nodes: [a, b], role: deg(nk(a), m) === 1 || deg(nk(b), m) === 1 ? "branch" : "spine", chest: nk(b) === chestAt };
  });
  if (!chestAt) throw new Error("maze: no dead end on the rim for the chest");
  return { main: [...path, E], extra, chord, h: ([c]) => (c >= 5 ? 2 : 1) };
}

export const ARCHETYPES = { ring, figure8, spiral, switchback, comb, twin, maze };

export function buildTopology(name, rng) {
  const make = ARCHETYPES[name];
  if (!make) throw new Error(`unknown archetype ${name}`);
  const t = make(rng);
  const lines = [{ id: "main", nodes: t.main, role: "spine" }, ...t.extra.map((x, i) => ({ id: `${x.role}${i + 1}`, ...x })), { id: "chord", nodes: t.chord, role: "shortcut" }];
  const used = new Map();
  for (const l of lines) {
    l.steps = unitSteps(l.nodes);
    for (const [a, b] of l.steps) {
      for (const n of [a, b]) if (!allowed(n)) throw new Error(`${name}: ${l.id} leaves the lattice at ${nk(n)}`);
      if (Math.abs(t.h(a) - t.h(b)) > 1) throw new Error(`${name}: ${l.id} climbs two tiers at ${nk(a)}`);
      const k = ek(a, b);
      if (used.has(k)) throw new Error(`${name}: ${l.id} reuses ${k} from ${used.get(k)}`);
      used.set(k, l.id);
    }
  }
  return { archetype: name, lines, h: t.h, S, E, u: t.chord[t.chord.length - 1], v: t.chord[0] };
}

export function routeFingerprint(level) {
  const [W, D] = level.size, P = new Set();
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) P.add(x + "," + z); }));
  const deg = (k) => { const [x, z] = k.split(",").map(Number); return N4.filter(([dx, dz]) => P.has(x + dx + "," + (z + dz))).length; };
  let edges = 0, junctions = 0, ends = 0;
  for (const k of P) { const d = deg(k); edges += d; if (d >= 3) junctions++; if (d === 1) ends++; }
  const cycles = edges / 2 - P.size + 1;
  const step = LATTICE.step;
  const run = (x, z, dx, dz) => { for (let i = 0; i <= step; i++) if (!P.has(x + dx * i + "," + (z + dz * i))) return false; return true; };
  let coarse = [];
  for (let oz = 0; oz < step; oz++) for (let ox = 0; ox < step; ox++) {
    const out = [];
    for (let z = oz; z < D; z += step) for (let x = ox; x < W; x += step) {
      if (run(x, z, 1, 0)) out.push(`${x},${z}>e`);
      if (run(x, z, 0, 1)) out.push(`${x},${z}>s`);
    }
    if (out.length > coarse.length) coarse = out;
  }
  return { topology: `cycles ${cycles} junctions ${junctions} ends ${ends}`, coarse, size: [W, D], archetype: level.layout?.archetype || level.route?.grammar || "?", mirror: !!level.layout?.mirror };
}

export const SAME_ROUTE = 0.8;

export function fingerprintClash(a, b) {
  const parse = (e) => { const [p, d] = e.split(">"); const [x, z] = p.split(",").map(Number); return { x, z, d }; };
  const A = a.coarse.map(parse), B = b.coarse.map(parse);
  const near = (e, set) => set.some((q) => q.d === e.d && Math.abs(q.x - e.x) <= 1 && Math.abs(q.z - e.z) <= 1);
  const hits = A.filter((e) => near(e, B)).length + B.filter((e) => near(e, A)).length;
  const jaccard = hits / (A.length + B.length || 1);
  return { same: jaccard >= SAME_ROUTE, jaccard };
}
