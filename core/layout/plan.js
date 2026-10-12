import { stamp } from "./features.js";
import { key, DIR } from "./grid.js";
import { edgeKey } from "./topology.js";

const unuk = (s) => s.split(",").map(Number);
const sgn = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
const add = (c, d, k = 1) => [c[0] + d[0] * k, c[1] + d[1] * k];
const dirName = (d) => Object.keys(DIR).find((n) => DIR[n][0] === d[0] && DIR[n][1] === d[1]);
const RIM_PREF = { entry: ["s", "e", "w", "n"], exit: ["n", "w", "e", "s"] };

export function coreBands(fx, fz) {
  const cheb = (x, z) => Math.max(fx - x, x - (fx + 1), fz - z, z - (fz + 1), 0);
  return { cheb, figure: [fx, fz], dais: [fx - 1, fz - 1, fx + 2, fz + 2], terrace: [fx - 3, fz - 3, fx + 4, fz + 4] };
}

export function planIsland(G, SH, M, rng, o = {}) {
  const pieces = [], segs = {}, links = [], locks = [];
  const owners = new Map();
  const cellOf = (u) => SH.centre(unuk(u));
  const h = M.h;
  const seg = (id, role) => (segs[id] ||= { id, role, cells: [], links: [] });
  const segLink = (a, b, via = null) => { seg(a); seg(b); segs[a].links.push({ to: b, via }); segs[b].links.push({ to: a, via }); };
  const touch = (u, owner, lock = false) => { if (!owners.has(u)) owners.set(u, []); owners.get(u).push({ owner, lock }); };
  const link = (a, b) => links.push([a, b]);
  const put = (segId, name, kind, params, owner = name) => {
    const p = stamp(G, name, kind, params, owner);
    pieces.push(p);
    for (const c of p.cells) if (G.in(c.x, c.z)) seg(segId).cells.push([c.x, c.z]);
    return p;
  };
  const isPad = (a, b) => !M.graph.land(a).includes(b);
  const hops = [];

  const B = M.B, Bc = cellOf(B);
  const plaza = [Bc[0] - 1, Bc[1] - 1, Bc[0] + 1, Bc[1] + 1];
  seg("rest", "bonfire");
  put("rest", "rest", "plaza", { box: plaza, h: h.get(B), doors: [], flank: 1 }, "rest");
  const restDoors = [];
  const restPath = (d) => {
    const door = add(Bc, d);
    for (const c of [door, Bc]) { G.set(c[0], c[1], { ...G.at(c[0], c[1]), p: 1 }, "rest"); seg("rest").cells.push(c); }
    restDoors.push(door);
    return door;
  };
  restPath([0, 0]);

  const road = (segId, a, b, { lock = null, ownerName = null, hFrom = null, hTo = null } = {}) => {
    const owner = ownerName || `u${a}-${b}`.replace(/,/g, ":");
    const A = cellOf(a), Bb = cellOf(b), d = sgn(A, Bb);
    const ha = hFrom ?? h.get(a), hb = hTo ?? h.get(b);
    let pa = A, pb = Bb;
    if (a === B) pa = add(Bc, d, 2);
    if (b === B) pb = add(Bc, d, -2);
    if ((a === B || b === B) && ha !== hb) throw new Error(`road ${a}-${b} into the rest is not flat`);
    if (Math.abs(ha - hb) > 1) throw new Error(`road ${a}-${b} climbs ${Math.abs(ha - hb)} tiers`);
    const first = add(pa, d);
    const overVoid = !SH.landUnit(unuk(a)) || !SH.landUnit(unuk(b));
    const p = put(segId, owner, "road", { points: [pa, pb], h: ha, steps: ha !== hb ? [[first[0], first[1], hb > ha ? "up" : "down"]] : [], flank: overVoid ? 0 : 1 }, owner);
    for (const [u, end, other] of [[a, "a", b], [b, "b", a]]) {
      const locked = lock && lock.at === u;
      if (u === B) {
        const door = restPath(sgn(Bc, cellOf(other)));
        if (locked) locks.push([door, end === "a" ? pa : pb]);
        else link(owner, "rest");
        if (locked) lock.cells = [door, end === "a" ? pa : pb];
      } else {
        touch(u, owner, locked);
        if (locked) { const c = cellOf(u), dd = sgn(c, cellOf(other)); lock.cells = [c, add(c, dd)]; locks.push(lock.cells); }
      }
    }
    return p;
  };

  const drawLine = (l) => {
    seg(l.id, l.role);
    for (let i = 1; i < l.units.length; i++) {
      const a = l.units[i - 1], b = l.units[i];
      if (isPad(a, b)) { hops.push({ line: l.id, a, b, pad: M.graph.padBetween(a, b) }); continue; }
      road(l.id, a, b);
    }
  };

  const entryLine = M.lines.find((l) => l.id === "entry");
  drawLine(entryLine);
  for (const l of M.lines) if (l.id !== "entry") drawLine(l);

  const Sc = cellOf(M.S);
  const inIsland = o.inIsland || ((x, z) => SH.landUnit(SH.unitOf(x, z)));
  const dockFrom = (c, dName, hh, role, owner) => {
    const d = DIR[dName];
    let len = 0;
    for (let p = add(c, d); len < 14 && inIsland(p[0], p[1]); p = add(p, d)) len++;
    len = Math.max(1, len);
    const lift = add(c, d, len + 1);
    if (!G.in(lift[0], lift[1])) throw new Error(`${role} lift ${lift} off the grid`);
    put(role === "entry" ? "entry" : "exit", owner, "dock", { from: c, dir: dName, len, h: hh }, owner);
    return { lift, dir: dName };
  };
  const dock = (u, role) => {
    const dirs = SH.rimDirs(unuk(u));
    const pref = RIM_PREF[role].filter((d) => dirs.includes(d));
    const dName = pref[0] || dirs[0];
    if (!dName) throw new Error(`${role} unit ${u} has no rim`);
    const name = role === "entry" ? "entry-dock" : "exit-dock";
    const out = dockFrom(cellOf(u), dName, h.get(u), role, name);
    touch(u, name);
    return out;
  };

  const HD = Math.max(...[...M.used].filter((u) => !M.exit.includes(u)).map((u) => h.get(u) ?? 1)) + 1;
  M.HD = HD;
  const exit = M.exit;
  h.set(M.C, HD);
  for (let i = 1; i < exit.length; i++) h.set(exit[i], i === 1 ? HD : Math.max(1, h.get(exit[i - 1]) - 1));
  if (h.get(M.G) !== HD - 1) throw new Error(`approach ${M.G} at ${h.get(M.G)}, sanctum at ${HD}`);

  const Cc = cellOf(M.C);
  const nbC = (dx, dz) => { const u = unuk(M.C); return SH.landUnit([u[0] + dx, u[1] + dz]) ? cellOf(`${u[0] + dx},${u[1] + dz}`) : null; };
  const W = nbC(-1, 0), E = nbC(1, 0), N = nbC(0, -1), S = nbC(0, 1);
  const exitMode = M.exitDock ? "dock" : isPad(M.C, exit[1]) ? "pad" : "leg";
  const gDir = sgn(Cc, cellOf(M.G));
  const dockDir = exitMode === "dock" ? (RIM_PREF.exit.filter((d) => M.exitDock.includes(d) && (DIR[d][0] !== gDir[0] || DIR[d][1] !== gDir[1]))[0] || null) : null;
  if (exitMode === "dock" && !dockDir) throw new Error("sanctum has no rim apart from its approach");
  const xDir = exitMode === "leg" ? sgn(Cc, cellOf(exit[1])) : exitMode === "dock" ? DIR[dockDir] : [0, 0];
  const lo = (n, c) => (n ? n + 1 : c - 3), hi = (n, c) => (n ? n - 1 : c + 3);
  const span = (loN, hiN, c, approachLo, approachHi) => {
    const out = [];
    for (let r0 = lo(loN, c); r0 + 3 <= hi(hiN, c); r0++) {
      if (approachLo && r0 < loN + 2) continue;
      if (approachHi && r0 + 3 > hiN - 2) continue;
      out.push(r0);
    }
    return out;
  };
  const along = (d) => (d[0] ? "x" : d[1] ? "z" : "none");
  const colsC = span(W?.[0], E?.[0], Cc[0], gDir[0] < 0, gDir[0] > 0).filter((r0) => (gDir[0] || xDir[0] ? true : true) && ((along(gDir) === "z" ? r0 <= Cc[0] && Cc[0] <= r0 + 3 : true) && (along(xDir) === "z" ? r0 <= Cc[0] && Cc[0] <= r0 + 3 : true)));
  const rowsC = span(N?.[1], S?.[1], Cc[1], gDir[1] < 0, gDir[1] > 0).filter((q0) => (along(gDir) === "x" ? q0 <= Cc[1] && Cc[1] <= q0 + 3 : true) && (along(xDir) === "x" ? q0 <= Cc[1] && Cc[1] <= q0 + 3 : true));
  if (!colsC.length || !rowsC.length) throw new Error(`sanctum at ${M.C} does not fit between its neighbours`);
  const pickMid = (arr, c) => arr.slice().sort((a, b) => Math.abs(a + 1.5 - c) - Math.abs(b + 1.5 - c) + rng.float(-0.3, 0.3))[0];
  const r0 = pickMid(colsC, Cc[0]), q0 = pickMid(rowsC, Cc[1]);
  const ring = [r0, q0, r0 + 3, q0 + 3];
  const fx = r0 + 1, fz = q0 + 1;
  seg("dais", "spine");
  put("dais", "sanctum", "road", { points: [[r0, q0], [r0 + 3, q0], [r0 + 3, q0 + 3], [r0, q0 + 3], [r0, q0 + 1]], h: HD, flank: 0 }, "sanctum");
  for (const [x, z] of [[fx, fz], [fx + 1, fz], [fx, fz + 1], [fx + 1, fz + 1]]) G.set(x, z, { h: HD, s: "stone" }, "sanctum");

  const ringHit = (from, d) => {
    let c = from;
    for (let k = 0; k < 16; k++) { c = add(c, d); if (c[0] >= ring[0] && c[0] <= ring[2] && c[1] >= ring[1] && c[1] <= ring[3]) return c; }
    throw new Error("road misses the ring");
  };
  const Gc = cellOf(M.G);
  const gIn = ringHit(Gc, sgn(Gc, Cc));
  const ramp = add(gIn, gDir, 1);
  const threshold = add(gIn, gDir, 2);
  seg("approach", "spine");
  put("approach", "approach", "road", { points: [Gc, gIn], h: HD - 1, steps: [[ramp[0], ramp[1], "up"]], flank: 1 }, "approach");
  touch(M.G, "approach");
  locks.push([threshold, ramp], [ramp, gIn]);
  let exitLiftSanctum = null;
  if (exitMode === "dock") {
    const d = DIR[dockDir];
    const mid = [d[0] > 0 ? ring[2] : d[0] < 0 ? ring[0] : r0 + 1 + (rng.chance(0.5) ? 1 : 0), d[1] > 0 ? ring[3] : d[1] < 0 ? ring[1] : q0 + 1 + (rng.chance(0.5) ? 1 : 0)];
    exitLiftSanctum = dockFrom(mid, dockDir, HD, "exit", "exit-dock");
    link("exit-dock", "sanctum");
  } else if (exitMode === "pad") {
    const border = [];
    for (let z = ring[1]; z <= ring[3]; z++) for (let x = ring[0]; x <= ring[2]; x++) if (x === ring[0] || x === ring[2] || z === ring[1] || z === ring[3]) border.push([x, z]);
    const padCell = border.sort((a, b) => Math.abs(b[0] - gIn[0]) + Math.abs(b[1] - gIn[1]) - (Math.abs(a[0] - gIn[0]) + Math.abs(a[1] - gIn[1])))[0];
    const Ec = cellOf(exit[1]);
    seg("exitleg", "spine");
    put("exitleg", "exit-node", "road", { points: [Ec, Ec], h: h.get(exit[1]), flank: 1 }, "exit-node");
    touch(exit[1], "exit-node");
    hops.push({ line: "exitleg", a: M.C, b: exit[1], pad: M.exitPad, cells: { near: padCell, far: Ec } });
  } else {
    const X1 = cellOf(exit[1]);
    const xOut = ringHit(X1, sgn(X1, Cc));
    seg("exit", "spine");
    put("exit", "exit-road", "road", { points: [xOut, X1], h: HD, flank: 1 }, "exit-road");
    link("exit-road", "sanctum");
    touch(exit[1], "exit-road");
  }
  const exitLine = { id: "exitleg", role: "spine", units: exit.slice(1) };
  seg("exitleg", "spine");
  for (let i = 1; i < exitLine.units.length; i++) {
    const a = exitLine.units[i - 1], b = exitLine.units[i];
    if (isPad(a, b)) { hops.push({ line: "exitleg", a, b, pad: M.graph.padBetween(a, b) }); continue; }
    road("exitleg", a, b);
  }

  const shortcuts = [];
  for (const sc of M.shortcuts || []) {
    const id = sc.id;
    seg(id, "shortcut");
    const P = sc.units;
    if (sc.kind === "pad") { shortcuts.push({ ...sc }); continue; }
    if (sc.kind === "ladder" || sc.kind === "drop") {
      for (let i = 1; i < P.length - 1; i++) road(id, P[i - 1], P[i], { hFrom: sc.hf, hTo: sc.hf });
      const last = P[P.length - 2], N0 = P[P.length - 1];
      const A = cellOf(last), Nc = N0 === B ? Bc : cellOf(N0), d = sgn(A, Nc);
      const bottom = N0 === B ? add(Bc, d, -1) : Nc;
      const top = add(bottom, d, -1);
      const owner = `s-${id}`;
      put(id, owner, "road", { points: [A, top], h: sc.hf, flank: 1 }, owner);
      touch(last, owner);
      if (P.length > 2) link(owner, `u${P[P.length - 3]}-${last}`.replace(/,/g, ":"));
      if (N0 === B) restPath(sgn(Bc, A));
      locks.push([top, bottom]);
      shortcuts.push({ ...sc, top, bottom, dir: dirName(d) });
      continue;
    }
    const lock = { at: P[P.length - 1] };
    for (let i = 1; i < P.length; i++) road(id, P[i - 1], P[i], { lock: i === P.length - 1 ? lock : null, hFrom: sc.heights[i - 1], hTo: sc.heights[i] });
    shortcuts.push({ ...sc, edge: lock.cells });
  }

  const entry = dock(M.S, "entry");
  const exitLift = exitLiftSanctum || dock(M.E, "exit");

  for (const [u, list] of owners) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (!list[i].lock && !list[j].lock) link(list[i].owner, list[j].owner);
  }


  const spawnDoor = add(Bc, sgn(Bc, cellOf(entryLine.units[entryLine.units.length - 2] || M.S)));

  let chest = null;
  const tips = [];
  for (const l of M.lines) if (l.role === "branch" && l.units.length >= 2) tips.push({ tip: l.units[l.units.length - 1], from: l.units[l.units.length - 2], line: l.id });
  if (M.chestAt) tips.unshift(M.chestAt);
  for (const t of tips) {
    const tc = cellOf(t.tip), d0 = t.from ? sgn(cellOf(t.from), tc) : [0, 1];
    const tries = [d0, [d0[1], d0[0]], [-d0[1], -d0[0]]];
    for (const d of tries) {
      const c = add(tc, d);
      const cur = G.at(c[0], c[1]);
      if (!cur || cur.p) continue;
      G.set(c[0], c[1], { h: h.get(t.tip), s: "stone", room: true }, G.who(tc[0], tc[1]));
      chest = { x: c[0], z: c[1], rot: { n: 0, s: 2, w: 3, e: 1 }[dirName([-d[0], -d[1]])] ?? 0, tip: tc, line: t.line, unit: t.tip };
      break;
    }
    if (chest) break;
  }

  return {
    pieces, segs, links, locks, hops, shortcuts, chest,
    topology: M,
    entry, exitLift,
    rest: { centre: Bc, box: plaza, doors: restDoors, spawn: spawnDoor },
    core: { ...coreBands(fx, fz), HD, ring, blocks: { tower: null, spires: [] }, sealed: [], threshold, ramp, back: gIn, approachDir: gDir },
    plaza,
    picks: { archetype: M.archetype, shape: SH.id, transform: SH.transform, scale: SH.scale, C: M.C, G: M.G, B: M.B, S: M.S, E: M.E },
    lever: null,
  };
}

export const segKey = (segs) => {
  const m = new Map();
  for (const s of Object.values(segs)) for (const [x, z] of s.cells) if (!m.has(key(x, z))) m.set(key(x, z), s.id);
  return m;
};
