export const FINGERPRINT_STEP = 3;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const ARCHETYPES = {
  ring: { about: "a medium spine with one long loop that both arcs keep open", style: "random", share: [0.35, 0.5], tiers: [3, 3] },
  figure8: { about: "a spine with two loops that meet at one node", style: "random", share: [0.3, 0.45], tiers: [3, 3] },
  spiral: { about: "one long walk that keeps turning the same way and climbs the whole way", style: "spiral", share: [0.55, 0.75], tiers: [3, 4] },
  switchback: { about: "a folded walk that doubles back on itself, a tier up every few turns", style: "zigzag", share: [0.55, 0.75], tiers: [3, 4] },
  comb: { about: "a straight spine with dead-end teeth off it", style: "straight", share: [0.35, 0.5], tiers: [3, 3] },
  twin: { about: "two parallel climbs that split and rejoin, each with its ramp at a different height", style: "random", share: [0.3, 0.45], tiers: [3, 3] },
  maze: { about: "a random spanning tree over most of the shape, braided, rooted away from the bonfire", style: "maze", share: [0.6, 0.8], tiers: [3, 3] },
};
export const ARCHETYPE_NAMES = Object.keys(ARCHETYPES);

const uk = (u) => u[0] + "," + u[1];
const unuk = (s) => s.split(",").map(Number);
const dirOf = (a, b) => { const A = unuk(a), B = unuk(b); const d = [B[0] - A[0], B[1] - A[1]]; return Math.abs(d[0]) + Math.abs(d[1]) === 1 ? d : null; };
const cross = (d0, d1) => (d0 && d1 ? d0[0] * d1[1] - d0[1] * d1[0] : 0);
export const edgeKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

export function unitGraph(SH, { pads = true } = {}) {
  const hop = new Map();
  const add = (a, b, p, end) => { if (!hop.has(a)) hop.set(a, []); hop.get(a).push({ to: b, pad: p, end }); };
  if (pads) for (const p of SH.pads) { add(uk(p.near), uk(p.far), p, "near"); add(uk(p.far), uk(p.near), p, "far"); }
  const land = (u) => SH.adj.get(u) || [];
  const conn = (u) => (hop.get(u) || []).filter((e) => e.pad.role === "connector").map((e) => e.to);
  const padBetween = (a, b) => (hop.get(a) || []).find((e) => e.to === b)?.pad || null;
  return { land, conn, hop, padBetween, nb: (u) => [...land(u), ...conn(u)] };
}

function bfs(from, to, nb, allow) {
  const prev = new Map([[from, null]]), q = [from];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === to) break;
    for (const n of nb(c)) if (!prev.has(n) && (n === to || allow(n))) { prev.set(n, c); q.push(n); }
  }
  if (!prev.has(to)) return null;
  const out = [];
  for (let k = to; k != null; k = prev.get(k)) out.unshift(k);
  return out;
}

function reach(from, nb, allow) {
  const seen = new Set([from]), q = [from];
  for (let i = 0; i < q.length; i++) for (const n of nb(q[i])) if (!seen.has(n) && allow(n)) { seen.add(n); q.push(n); }
  return seen;
}

function walk(rng, from, to, nb, allow, style, maxLen, o = {}) {
  const path = [from], used = new Set([from]);
  let turnSign = rng.chance(0.5) ? 1 : -1;
  for (let guard = 0; guard < 400; guard++) {
    const cur = path[path.length - 1];
    if (cur === to) return path;
    const free = (v) => allow(v) && !used.has(v);
    if (path.length >= maxLen) {
      const rest = bfs(cur, to, nb, free);
      if (!rest) return null;
      return [...path, ...rest.slice(1)];
    }
    let opts = nb(cur).filter((v) => v === to || free(v));
    opts = opts.filter((v) => v === to || reach(v, nb, (w) => free(w) || w === to).has(to));
    if (!opts.length) return null;
    const others = opts.filter((v) => v !== to);
    if (!others.length) { path.push(to); continue; }
    const prev = path.length > 1 ? dirOf(path[path.length - 2], cur) : null;
    const scored = others.map((v) => {
      const d = dirOf(cur, v);
      let sc = rng.float(0, 1);
      const turn = prev && d ? cross(prev, d) : 0;
      const straight = prev && d && prev[0] === d[0] && prev[1] === d[1];
      if (style === "straight") sc += straight ? 2.5 : 0;
      if (style === "spiral") sc += turn === turnSign ? 2.2 : straight ? 1.2 : 0;
      if (style === "zigzag") sc += straight ? 1.4 : turn ? 0.9 : 0;
      if (!d) sc += 0.4;
      if (o.away) sc += 0.7 * (o.away(v) - o.away(cur));
      return [v, sc, turn];
    }).sort((a, b) => b[1] - a[1]);
    const [v, , turn] = scored[0];
    if (style === "zigzag" && turn) turnSign = -turnSign;
    used.add(v);
    path.push(v);
  }
  return null;
}

function turns(path) {
  let same = 0, flip = 0, total = 0, last = 0, uturn = 0, straight = 0;
  for (let i = 2; i < path.length; i++) {
    const t = cross(dirOf(path[i - 2], path[i - 1]), dirOf(path[i - 1], path[i]));
    if (!t) { if (dirOf(path[i - 2], path[i - 1])) straight++; continue; }
    total++;
    if (last) { if (t === last) same++; else flip++; }
    last = t;
  }
  for (let i = 3; i < path.length; i++) {
    const a = dirOf(path[i - 3], path[i - 2]), b = dirOf(path[i - 1], path[i]);
    if (a && b && a[0] === -b[0] && a[1] === -b[1]) uturn++;
  }
  return { same, flip, total, uturn, straight };
}

function scorePath(style, path) {
  const t = turns(path), n = path.length;
  if (style === "spiral") return n + 2.5 * t.same - 1.5 * t.flip;
  if (style === "zigzag") return n + 3 * t.uturn;
  if (style === "straight") return n * 0.5 + t.straight - t.total;
  return n;
}

export function buildMission(SH, name, rng, o = {}) {
  const spec = ARCHETYPES[name];
  if (!spec) throw new Error(`unknown archetype ${name}`);
  const g = unitGraph(SH, { pads: o.pads !== false });
  const S = uk(SH.keys.entry), B = uk(SH.keys.bonfire), E = uk(SH.keys.exit);
  const Cs = rng.shuffle(SH.keys.centrepieces.map(uk));
  const landNb = (u) => g.land(u);
  const entry = bfs(S, B, landNb, (v) => !Cs.includes(v) && v !== E);
  if (!entry) throw new Error(`${SH.id}: no land walk from S to B`);
  const entrySet = new Set(entry);
  const entryEdges = new Set(entry.slice(1).map((u, i) => edgeKey(entry[i], u)));
  const nbPre = (u) => g.nb(u).filter((v) => !entryEdges.has(edgeKey(u, v)));

  let C = null, exit = null, A = null, Gs = null, exitPad = null;
  const tryLeg = (c, leg) => {
    const legSet = new Set(leg);
    const avail = new Set(SH.unitList.map(uk).filter((u) => !legSet.has(u)));
    const fromB = new Set([...reach(B, nbPre, (v) => avail.has(v) && v !== S), ...reach(S, nbPre, (v) => avail.has(v) && v !== B)]);
    const gs = g.land(c).filter((v) => avail.has(v) && fromB.has(v) && v !== B && v !== S);
    if (!gs.length) return false;
    C = c; exit = leg; A = avail; Gs = gs;
    return true;
  };
  const legs = [];
  for (const c of Cs) {
    if (c === E) continue;
    for (let k = 0; k < 4; k++) {
      const outs = rng.shuffle(g.land(c).filter((v) => !entrySet.has(v)));
      for (const x of outs) {
        const rest = x === E ? [E] : bfs(x, E, (u) => rng.shuffle(g.nb(u).slice()), (v) => v !== c && !entrySet.has(v));
        if (rest) legs.push([c, ...rest]);
      }
    }
  }
  legs.sort((a, b) => a.length - b.length + rng.float(-0.6, 0.6));
  const longLeg = Math.max(4, Math.round(SH.unitList.length * (o.legShare ?? 0.25)));
  for (const leg of legs) if ((leg.length <= longLeg || o.exitPad === false) && tryLeg(leg[0], leg)) break;
  if (!Gs?.length && o.exitPad !== false && !entrySet.has(E)) {
    for (const c of Cs) {
      if (c === E || g.land(E).includes(c)) continue;
      if (tryLeg(c, [c, E])) { exitPad = { id: "x", role: "connector", near: unuk(c), far: unuk(E), exit: true }; break; }
    }
  }
  let exitDock = null;
  if (!Gs?.length) {
    for (const c of Cs) {
      const rims = SH.rimDirs(unuk(c));
      if (!rims.length) continue;
      if (tryLeg(c, [c])) { exitDock = rims; break; }
    }
  }
  if (!Gs?.length) for (const leg of legs) if (tryLeg(leg[0], leg)) break;
  if (!Gs?.length) throw new Error(`${SH.id}: no centrepiece with an approach and an exit`);
  if (exitPad) {
    const pn = uk(exitPad.near), pf = uk(exitPad.far);
    g.hop.set(pn, [...(g.hop.get(pn) || []), { to: pf, pad: exitPad, end: "near" }]);
    g.hop.set(pf, [...(g.hop.get(pf) || []), { to: pn, pad: exitPad, end: "far" }]);
  }

  const used = new Set([...entry, ...exit]);
  const lines = [];
  const lineEdges = new Set();
  const addLine = (id, role, units) => {
    for (let i = 1; i < units.length; i++) {
      const k = edgeKey(units[i - 1], units[i]);
      if (lineEdges.has(k)) throw new Error(`${name}: ${id} reuses edge ${k}`);
      lineEdges.add(k);
    }
    for (const u of units) used.add(u);
    const l = { id, role, units };
    lines.push(l);
    return l;
  };
  addLine("entry", "entry", entry);

  const allowPre = (v) => A.has(v) && v !== C;
  const distFrom = (from, avoid) => { const d = new Map([[from, 0]]), q = [from]; for (let i = 0; i < q.length; i++) for (const n of nbPre(q[i])) if (!d.has(n) && allowPre(n) && n !== avoid) { d.set(n, d.get(q[i]) + 1); q.push(n); } return d; };
  const dB = distFrom(B, S), dS = distFrom(S, B);
  const longStyle = spec.style === "spiral" || spec.style === "zigzag";
  const Gpick = (dist) => (longStyle || name === "maze" ? Gs.filter((v) => dist.has(v)).sort((a, b) => (dist.get(b) ?? 0) - (dist.get(a) ?? 0) + rng.float(-0.5, 0.5))[0] : rng.pick(Gs.filter((v) => dist.has(v))));
  const fromBOk = Gs.some((v) => dB.has(v));
  const start = fromBOk ? B : S;
  const other = start === B ? S : B;
  const distB = start === B ? dB : dS;
  const G = Gpick(distB);
  const preCount = [...A].filter((v) => v !== C).length;

  let main = null;
  const treeExtra = [];
  if (name === "maze") {
    for (let t = 0; t < 12 && !main; t++) {
      const reserve = new Set(rng.shuffle([...A].filter((v) => v !== B && v !== S && v !== G && v !== C)).slice(0, Math.floor(preCount * rng.float(0.15, 0.3))));
      const ok = (v) => allowPre(v) && !reserve.has(v) && v !== other;
      const root = rng.pick([...A].filter((v) => ok(v) && v !== start));
      if (!root) continue;
      const landPre = (u) => g.nb(u).filter((v) => !entryEdges.has(edgeKey(u, v)));
      const seen = new Set([root]), tree = [], frontier = landPre(root).filter(ok).map((n) => [root, n]);
      while (frontier.length) {
        const [a, n] = frontier.splice(rng.int(0, frontier.length - 1), 1)[0];
        if (seen.has(n)) continue;
        seen.add(n); tree.push([a, n]);
        for (const q of landPre(n)) if (ok(q) && !seen.has(q)) frontier.push([n, q]);
      }
      if (!seen.has(start) || !seen.has(G)) continue;
      const adjT = new Map();
      const link = (a, b) => { if (!adjT.has(a)) adjT.set(a, []); if (!adjT.has(b)) adjT.set(b, []); adjT.get(a).push(b); adjT.get(b).push(a); };
      for (const [a, b] of tree) link(a, b);
      const tdist = (from) => { const d = new Map([[from, 0]]), q = [from]; for (let i = 0; i < q.length; i++) for (const n of adjT.get(q[i]) || []) if (!d.has(n)) { d.set(n, d.get(q[i]) + 1); q.push(n); } return d; };
      const edges = new Set(tree.map(([a, b]) => edgeKey(a, b)));
      for (const k of rng.shuffle([...adjT.keys()].filter((k) => adjT.get(k).length === 1 && k !== start && k !== G))) {
        if (!rng.chance(0.4)) continue;
        const d = tdist(k);
        const opts = landPre(k).filter((q) => seen.has(q) && !edges.has(edgeKey(k, q)) && (d.get(q) ?? 0) >= 4);
        if (opts.length) { const q = opts[0]; edges.add(edgeKey(k, q)); link(k, q); }
      }
      const path = bfs(start, G, (u) => adjT.get(u) || [], () => true);
      if (!path) continue;
      main = path;
      const onMain = new Set();
      for (let i = 1; i < path.length; i++) onMain.add(edgeKey(path[i - 1], path[i]));
      for (const e of edges) if (!onMain.has(e)) treeExtra.push(e.split("|"));
    }
    if (!main) throw new Error(`${SH.id}: maze found no tree joining B and G`);
  } else {
    const [lo, hi] = spec.share;
    const cands = [];
    for (let t = 0; t < 28; t++) {
      const maxLen = Math.max(3, Math.round(preCount * rng.float(lo, hi)));
      const p = walk(rng, start, G, nbPre, (v) => allowPre(v) && v !== other, spec.style, maxLen, { away: (v) => Math.min(3, distB.get(v) ?? 0) });
      if (p && p.length >= 3) cands.push(p);
    }
    if (!cands.length) throw new Error(`${SH.id}: ${name} found no walk from ${start} to G`);
    cands.sort((a, b) => scorePath(spec.style, b) - scorePath(spec.style, a));
    main = cands[Math.min(cands.length - 1, rng.int(0, 2))];
  }
  addLine("main", "spine", main);
  const [t0, t1] = spec.tiers;
  let Hg = Math.min(rng.int(t0, t1), Math.max(1, main.length - 2));
  const h = new Map();
  for (const u of entry) h.set(u, 1);
  const climbEnd = Math.max(1, Math.round((main.length - 1) * (longStyle ? rng.float(0.75, 0.9) : rng.float(0.55, 0.75))));
  for (let i = 0; i < main.length; i++) {
    const want = 1 + Math.floor(((Hg - 1) * Math.min(i, climbEnd)) / climbEnd);
    const prev = i ? h.get(main[i - 1]) : 1;
    h.set(main[i], i <= 1 ? 1 : Math.min(prev + 1, want));
  }
  h.set(G, Math.max(h.get(G), Hg));
  for (let i = main.length - 2; i >= 1; i--) if (h.get(main[i]) < h.get(main[i + 1]) - 1) h.set(main[i], h.get(main[i + 1]) - 1);
  const zone = (u) => (o.zones ? SH.range(unuk(u)) : null);
  if (o.zones && main.some((u) => zone(u))) {
    for (let i = 2; i < main.length; i++) { const r = zone(main[i]); if (r) h.set(main[i], Math.max(r[0], Math.min(r[1], h.get(main[i])))); }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 2; i < main.length; i++) { const a = h.get(main[i - 1]), b = h.get(main[i]); if (b > a + 1) h.set(main[i], a + 1); if (b < a - 1) h.set(main[i], a - 1); }
      for (let i = main.length - 2; i >= 2; i--) { const a = h.get(main[i + 1]), b = h.get(main[i]); if (b < a - 1) h.set(main[i], a - 1); }
    }
    const top = Math.max(...main.map((u) => h.get(u)));
    if (h.get(G) < top) h.set(G, Math.min(top, h.get(main[main.length - 2]) + 1));
  }
  Hg = h.get(G);
  if (main.some((u) => h.get(u) > Hg)) throw new Error(`${name}: the climb peaks before the approach`);
  const fillLine = (units) => {
    const a = h.get(units[0]), b = h.get(units[units.length - 1]) ?? a;
    for (let i = 1; i < units.length - (h.has(units[units.length - 1]) ? 1 : 0); i++) {
      const t = i / (units.length - 1);
      let v = Math.round(a + (b - a) * t);
      if (name === "twin" && i === 1 && units.length > 2) v = Math.max(1, Math.min(Hg, v + (rng.chance(0.5) ? 1 : -1)));
      const zr = zone(units[i]);
      if (zr) v = Math.max(zr[0], Math.min(zr[1], v));
      v = Math.max(h.get(units[i - 1]) - 1, Math.min(h.get(units[i - 1]) + 1, v));
      h.set(units[i], Math.max(1, Math.min(Hg, v)));
    }
  };

  const free = (v) => allowPre(v) && !used.has(v) && v !== other;
  const loop = (i, j, minLen = 2) => {
    const inner = bfs(main[i], main[j], (u) => g.land(u), (v) => free(v));
    if (!inner || inner.length - 1 < minLen) return null;
    if (Math.abs(h.get(main[i]) - h.get(main[j])) > inner.length - 1) return null;
    return inner;
  };
  const extras = [];
  const tryLoops = (count, share) => {
    const made = [];
    for (let k = 0; k < count; k++) {
      const pairs = [];
      for (let i = 1; i < main.length; i++) for (let j = i + 3; j < main.length; j++) pairs.push([i, j]);
      rng.shuffle(pairs).sort((a, b) => (share ? Math.abs(share(b)) - Math.abs(share(a)) : 0));
      for (const [i, j] of pairs.slice(0, 60)) {
        if (made.some((m) => !(j <= m[0] || i >= m[1]) && !(name === "figure8" && (i === m[1] || j === m[0])))) continue;
        if (name === "figure8" && made.length && !made.some((m) => i === m[1] || j === m[0])) continue;
        const p = loop(i, j);
        if (!p) continue;
        made.push([i, j]);
        extras.push(addLine(`loop${made.length}`, "spine", p));
        break;
      }
    }
    return made.length;
  };
  if (name === "ring") tryLoops(1, ([i, j]) => j - i);
  if (name === "figure8") tryLoops(2, ([i, j]) => j - i);
  if (name === "twin") tryLoops(1, ([i, j]) => -(Math.abs(j - i - 3)));
  const mainDeg = new Map();
  for (const [a, b] of [...main.slice(1).map((u, i) => [main[i], u]), ...treeExtra]) for (const u of [a, b]) mainDeg.set(u, (mainDeg.get(u) || 0) + 1);
  for (const [i, [a, b]] of treeExtra.entries()) {
    const deg = (u) => mainDeg.get(u) || 0;
    const dead = deg(a) === 1 || deg(b) === 1;
    const [p, q] = deg(a) === 1 ? [b, a] : [a, b];
    extras.push(addLine(`${dead ? "branch" : "spine"}m${i + 1}`, dead ? "branch" : "spine", [p, q]));
  }
  const teeth = name === "comb" ? rng.int(2, 3) : name === "maze" ? 0 : 1;
  const tooth = (len) => {
    const roots = rng.shuffle(main.slice(1, -1).filter((u) => u !== B && u !== S));
    for (const r of roots) {
      const path = [r];
      for (let k = 0; k < len; k++) {
        const nx = rng.shuffle(g.land(path[path.length - 1]).filter((v) => free(v) && !path.includes(v)))[0];
        if (!nx) break;
        path.push(nx);
      }
      if (path.length >= 2) return path;
    }
    return null;
  };
  for (let k = 0, n = 0; k < teeth; k++) {
    const p = tooth(rng.int(1, 2));
    if (p) extras.push(addLine(`branch${++n}`, "branch", p));
  }

  if (name === "maze") {
    const adjL = new Map();
    for (const l of [lines[1], ...extras]) for (let i = 1; i < l.units.length; i++) {
      const [a, b] = [l.units[i - 1], l.units[i]];
      if (!adjL.has(a)) adjL.set(a, []); if (!adjL.has(b)) adjL.set(b, []);
      adjL.get(a).push(b); adjL.get(b).push(a);
    }
    const d = new Map([[start, 0]]), q = [start];
    for (let i = 0; i < q.length; i++) for (const n of adjL.get(q[i]) || []) if (!d.has(n)) { d.set(n, d.get(q[i]) + 1); q.push(n); }
    const dG = Math.max(2, d.get(G));
    for (const [u, du] of d) h.set(u, Math.min(Hg, 1 + Math.floor((Math.max(0, du - 1) * (Hg - 1)) / (dG - 1))));
    h.set(G, Hg);
  } else {
    const pending = extras.slice();
    for (let pass = 0; pass < 20 && pending.length; pass++) for (let i = pending.length - 1; i >= 0; i--) {
      const l = pending[i];
      if (!h.has(l.units[0])) continue;
      fillLine(l.units);
      pending.splice(i, 1);
    }
    for (const l of extras) if (l.role === "branch") {
      const tip = l.units[l.units.length - 1], pre = l.units[l.units.length - 2];
      if ((name === "spiral" || name === "switchback") && h.get(pre) < Hg && rng.chance(0.5)) h.set(tip, h.get(pre) + 1);
    }
  }
  for (const l of lines) for (let i = 1; i < l.units.length; i++) {
    const [a, b] = [l.units[i - 1], l.units[i]];
    if (g.land(a).includes(b) && Math.abs(h.get(a) - h.get(b)) > 1) throw new Error(`${name}: ${l.id} climbs two tiers between ${a} and ${b}`);
  }

  return {
    archetype: name, S, B, C, G, E: exitDock ? C : E, shapeExit: E, exitDock, start, entry, main, exit, exitPad, lines, extras, used, lineEdges, h, Hg, graph: g, allowPre, A,
  };
}

export function routeFingerprint(level) {
  const [W, D] = level.size, P = new Set();
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) P.add(x + "," + z); }));
  const deg = (k) => { const [x, z] = k.split(",").map(Number); return N4.filter(([dx, dz]) => P.has(x + dx + "," + (z + dz))).length; };
  let edges = 0, junctions = 0, ends = 0;
  for (const k of P) { const d = deg(k); edges += d; if (d >= 3) junctions++; if (d === 1) ends++; }
  const cycles = edges / 2 - P.size + 1;
  const step = FINGERPRINT_STEP;
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
  return { topology: `cycles ${cycles} junctions ${junctions} ends ${ends}`, coarse, size: [W, D], archetype: level.layout?.archetype || level.route?.grammar || "?", mirror: !!level.layout?.mirror, shape: level.layout?.shape || null };
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
