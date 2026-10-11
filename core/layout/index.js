import { createRng, hashSeed, valueNoise } from "../rng.js";
import { createGrid, N4, DIR, key } from "./grid.js";
import { planIsland } from "./plan.js";
import { FEATURES } from "./features.js";
import { placeDecor } from "./decor.js";
import { checkRoute, unreachableCells } from "./check.js";

export { FEATURES } from "./features.js";
export { checkRoute, routeDistances } from "./check.js";

const OPP = { n: "s", s: "n", e: "w", w: "e" };

function openLinks(segs) {
  const m = new Map();
  const add = (a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  for (const s of Object.values(segs)) for (const l of s.links) if (!l.via) { add(s.id, l.to); add(l.to, s.id); }
  for (const id of ["terrace", "dais", "exit", "doorway", "spur"]) { add("core", id); add(id, "core"); }
  return (a, b) => a === b || !!m.get(a)?.has(b);
}

function growFlanks(G, plan, rng, noise) {
  const q = [];
  for (const p of plan.pieces) {
    if (!p.flank) continue;
    for (const c of p.cells) {
      if (!G.in(c.x, c.z) || c.s === "lift") continue;
      const h = c.s === "ramp" ? c.h - 1 : c.h;
      const r = p.flank + (p.flank && p.kind !== "plaza" ? 1 : 0) + (noise(c.x / 3, c.z / 3) > 0.6 ? 1 : 0);
      q.push({ x: c.x, z: c.z, h, r, who: p.owner, d: 0 });
    }
  }
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (n.d >= n.r) continue;
    for (const [dx, dz] of N4) {
      const x = n.x + dx, z = n.z + dz, c = G.at(x, z);
      if (!c || c.s !== "none" || N4.some(([ax, az]) => G.at(x + ax, z + az)?.s === "lift")) continue;
      G.set(x, z, { h: n.h, s: noise(x / 2.5 + 9, z / 2.5) > 0.66 ? "grass" : "sand", flank: 1 }, n.who);
      q.push({ x, z, h: n.h, r: n.r, who: n.who, d: n.d + 1 });
    }
  }
}

const steppable = (a, b, dir) => {
  const eh = (c, d) => (c.s !== "ramp" ? c.h : d === c.d ? c.h - 1 : d === OPP[c.d] ? c.h : null);
  const ha = eh(a, dir), hb = eh(b, OPP[dir]);
  return ha != null && ha === hb;
};

function fillHoles(G, maxSize = 8) {
  const seen = new Set();
  G.each((c, x, z) => {
    if (c.s !== "none" || seen.has(key(x, z))) return;
    const comp = [[x, z]], q = [[x, z]];
    seen.add(key(x, z));
    let edge = false;
    for (let i = 0; i < q.length; i++) {
      const [a, b] = q[i];
      for (const [dx, dz] of N4) {
        const nx = a + dx, nz = b + dz, n = G.at(nx, nz);
        if (!n) { edge = true; continue; }
        if (n.s !== "none" || seen.has(key(nx, nz))) continue;
        seen.add(key(nx, nz)); q.push([nx, nz]); comp.push([nx, nz]);
      }
    }
    if (!edge && comp.length <= maxSize) for (const [a, b] of comp) G.set(a, b, { h: 0, s: "water" }, null);
  });
}

function separate(G, plan) {
  const ok = openLinks(plan.segs), clashes = [];
  const lock = new Set(plan.locks.flatMap(([p, q]) => [key(...p) + "|" + key(...q), key(...q) + "|" + key(...p)]));
  for (let pass = 0; pass < 4; pass++) {
    let changed = 0;
    G.each((a, x, z) => {
      if (!G.land(x, z) || a.s === "lift") return;
      for (const dir of ["e", "s"]) {
        const nx = x + DIR[dir][0], nz = z + DIR[dir][1], b = G.at(nx, nz);
        if (!b || !G.land(nx, nz) || b.s === "lift") continue;
        const A = G.who(x, z), Bw = G.who(nx, nz);
        if (!A || !Bw || ok(A, Bw) || !steppable(a, b, dir) || lock.has(key(x, z) + "|" + key(nx, nz))) continue;
        const rank = (c) => (c.p ? 3 : c.room ? 2 : c.flank ? 0 : 1);
        if (rank(a) === 3 && rank(b) === 3) { clashes.push(`${A} ${x},${z} meets ${Bw} ${nx},${nz}`); continue; }
        const [vx, vz] = rank(a) <= rank(b) ? [x, z] : [nx, nz];
        const inner = N4.every(([dx, dz]) => G.at(vx + dx, vz + dz) && G.at(vx + dx, vz + dz).s !== "none");
        G.set(vx, vz, { h: 0, s: inner ? "water" : "none" }, null);
        changed++;
      }
    });
    if (!changed) break;
  }
  return clashes;
}

function settle(level, rng) {
  for (let round = 0; round < 6; round++) {
    const lost = unreachableCells(level);
    if (!lost.length) return;
    for (const [x, z] of lost) {
      level.decor = level.decor.filter((d) => !(d.x === x && d.z === z && (d.fw || 1) === 1 && (d.fd || 1) === 1));
      level.decor.push({ t: rng.chance(0.5) ? "rock-big" : "rock", x, z, v: rng.int(0, 1), rot: 0, ox: 0, oz: 0, fw: 1, fd: 1, fill: true });
    }
  }
}

function pickThings(G, plan, rng, o) {
  const { picks: P, core } = plan;
  const [fx, fz] = core.figure;
  const things = [];
  const spawn = [P.ex, 25];
  const plazaFree = [];
  for (let z = 22; z <= 25; z++) for (let x = P.px; x <= P.px + 3; x++) {
    const c = G.at(x, z);
    if (c.p || (x === P.lx && z === 22)) continue;
    const near = Math.max(Math.abs(x - spawn[0]), Math.abs(z - spawn[1]));
    if (near < 1 || near > 3) continue;
    plazaFree.push([x, z, near]);
  }
  const avoid = plan.locks.flat();
  const clear = plazaFree.filter(([x, z]) => avoid.every(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) > 2));
  rng.shuffle(clear.length ? clear : plazaFree).sort((a, b) => a[2] - b[2]);
  if (clear.length) plazaFree.splice(0, plazaFree.length, ...clear);
  const fire = plazaFree[0];
  things.push({ id: "b1", kind: "bonfire", x: fire[0], z: fire[1], rot: 0 });
  things.push({ id: "e0", kind: "elevator", role: "entry", x: P.ex, z: 28, rot: 0 });
  things.push({ id: "e1", kind: "elevator", role: "exit", x: 24, z: P.ey, rot: 1 });
  const th = [P.gx, 7];
  const radius = +(Math.hypot(th[0] + 0.5 - (fx + 1), th[1] + 0.5 - (fz + 1)) + 0.9).toFixed(1);
  things.push({ id: "w1", kind: "watcher", x: fx, z: fz, size: [2, 2], radius });
  things.push({ id: "g1", kind: "gate", x: P.gx, z: 8, span: "x", blocks: [[P.gx, 8]], open: "watcher:w1", threshold: [th], edge: [th, [P.gx, 8]] });
  const leverAt = [[P.cx + 1, 9], [P.cx - 1, 8], [P.cx + 1, 8]].find(([x, z]) => G.land(x, z) && !G.at(x, z).p && G.at(x, z).h === 2) || [P.cx + 1, 9];
  things.push({ id: "l1", kind: "lever", x: leverAt[0], z: leverAt[1], opens: "g2" });
  things.push({ id: "g2", kind: "gate", x: P.cx, z: 22, span: "x", blocks: [[P.cx, 22]], open: "lever:l1", threshold: [[P.cx, 23]], edge: [[P.cx, 23], [P.cx, 22]] });
  things.push({ id: "d1", kind: "door", edge: [[P.px + 3, 23], [P.px + 4, 23]], x: P.px + 4, z: 23 });
  things.push({ id: "k1", kind: "ladder", x: P.lx, z: 21, d: "s", mode: o.drop ? "drop" : "kick" });
  things.push({ id: "c1", kind: "chest", x: P.vx + 1, z: 2, rot: 2, text: o.chestText || "A curl of dried ink, peeled off the lookout rail." });
  return { things, spawn };
}

function mirrorLevel(L) {
  const W = L.size[0], fl = (x) => W - 1 - x, md = { e: "w", w: "e", n: "n", s: "s" };
  L.cells = L.cells.map((row) => row.slice().reverse().map((c) => (c.d ? { ...c, d: md[c.d] } : c)));
  const fc = ([x, z]) => [fl(x), z];
  for (const d of L.decor) { const w = (d.rot || 0) % 2 ? d.fd || 1 : d.fw || 1; d.x = fl(d.x) - (w - 1); delete d.fw; delete d.fd; if (d.ox) d.ox = -d.ox; }
  for (const t of L.things) {
    const w = t.size ? t.size[0] : 1;
    t.x = fl(t.x) - (w - 1);
    if (t.edge) t.edge = t.edge.map(fc);
    if (t.threshold) t.threshold = t.threshold.map(fc);
    if (t.blocks) t.blocks = t.blocks.map(fc);
    if (t.d) t.d = md[t.d];
    if (t.kind === "elevator") t.rot = [0, 3, 2, 1][t.rot || 0];
  }
  L.spawn = fc(L.spawn);
  const r = L.route;
  if (r) {
    for (const s of r.segments) s.cells = s.cells.map(fc);
    for (const s of r.shortcuts) { s.far = fc(s.far); s.near = fc(s.near); }
    r.vistas = r.vistas.map(fc);
    r.trapSlots = r.trapSlots.map((t) => ({ ...t, cells: t.cells.map(fc) }));
  }
  return L;
}

function routeMeta(G, plan, things) {
  const segments = Object.values(plan.segs).filter((s) => s.cells.length).map((s) => ({
    id: s.id, role: s.role,
    cells: s.cells.filter(([x, z]) => G.at(x, z)?.p).map(([x, z]) => [x, z]),
    links: s.links.map((l) => ({ to: l.to, via: l.via?.kind || null })),
  })).filter((s) => s.cells.length);
  const t = (id) => things.find((q) => q.id === id);
  const shortcuts = [
    { id: "door", kind: "door", thing: "d1", far: t("d1").edge[1], near: t("d1").edge[0] },
    { id: "ladder", kind: t("k1").mode === "drop" ? "drop" : "ladder", thing: "k1", far: [t("k1").x, t("k1").z], near: [t("k1").x + DIR[t("k1").d][0], t("k1").z + DIR[t("k1").d][1]] },
    { id: "lever", kind: "lever", thing: "l1", gate: "g2", far: [t("l1").x, t("l1").z], near: t("g2").edge[0] },
  ];
  const trapSlots = [];
  for (const s of segments) {
    if (s.role !== "spine") continue;
    let run = [];
    const flush = () => { if (run.length >= 3) trapSlots.push({ segment: s.id, cells: run.slice(1, -1).length ? run.slice(1, -1) : run }); run = []; };
    const order = s.cells;
    for (let i = 0; i < order.length; i++) {
      const [x, z] = order[i], c = G.at(x, z);
      const prev = order[i - 1];
      const adj = prev && Math.abs(prev[0] - x) + Math.abs(prev[1] - z) === 1;
      if (c.s === "ramp" || !adj) flush();
      if (c.s !== "ramp") run.push([x, z]);
    }
    flush();
  }
  return { grammar: "hub-and-ring", segments, shortcuts, bonfire: [t("b1").x, t("b1").z], vistas: [], trapSlots };
}

export function generateLayout(base, opts = {}) {
  const seed = opts.seed ?? 1;
  const tries = opts.tries ?? 24;
  let last = null;
  const history = [];
  for (let attempt = 0; attempt < tries; attempt++) {
    const rng = createRng(hashSeed(`${base.name}:${seed}:${attempt}`));
    const noise = valueNoise(hashSeed(`${seed}:${attempt}:n`));
    const [W, D] = base.size;
    const G = createGrid(W, D);
    const o = { drop: !!opts.drop };
    const plan = planIsland(G, rng, o);
    growFlanks(G, plan, rng, noise);
    const clashes = separate(G, plan);
    fillHoles(G);
    for (const p of plan.pieces) p.problems = [...p.problems.filter((m) => /already path/.test(m)), ...FEATURES[p.kind].valid(G, p)];
    const { things, spawn } = pickThings(G, plan, rng, o);
    const cells = G.cells.map((row) => row.map((c) => {
      const out = { h: c.h, s: c.s };
      if (c.d) out.d = c.d;
      if (c.m) out.m = c.m;
      if (c.p) out.p = 1;
      return out;
    }));
    const route = routeMeta(G, plan, things);
    const level = {
      name: opts.name || `${base.name}-r${seed}`,
      concept: "route-first",
      size: [W, D], cells, decor: [], spawn,
      bg: base.bg, palette: base.palette, materials: base.materials, light: base.light,
      pieces: base.pieces, things, route,
      layout: { seed, attempt, grammar: "hub-and-ring", mirror: !!opts.mirror, picks: plan.picks },
    };
    level.decor = placeDecor(level, base, plan, rng, noise);
    settle(level, rng);
    route.vistas = plan.vistas || [];
    if (opts.mirror) mirrorLevel(level);
    for (const d of level.decor) { delete d.fw; delete d.fd; delete d.fill; }
    const problems = [...clashes, ...plan.pieces.flatMap((p) => p.problems), ...checkRoute(level, opts.catalog)];
    history.push(problems.slice(0, 3));
    last = { level, problems, attempt, history };
    if (!problems.length) return last;
  }
  return last;
}
