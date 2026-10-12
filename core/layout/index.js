import { createRng, hashSeed, valueNoise } from "../rng.js";
import { createGrid, N4, DIR, key } from "./grid.js";
import { planIsland } from "./plan.js";
import { buildMission, ARCHETYPES } from "./topology.js";
import { drawShortcuts, WINDOWS } from "./shortcuts.js";
import { placeShape, shapeById, scaleFor } from "./shape.js";
import { SHAPES, resolveTransforms } from "./shapes/index.js";
import { FEATURES, stamp } from "./features.js";
import { placeDecor, profileFor, PROFILES } from "./decor.js";
import { CATALOG, maskCells } from "../catalog.js";
import { checkRoute, unreachableCells, padSafeSlots } from "./check.js";

export { FEATURES } from "./features.js";
export { checkRoute, routeDistances } from "./check.js";
export { ARCHETYPES, routeFingerprint, fingerprintClash } from "./topology.js";
export { SHAPES } from "./shapes/index.js";

const OPP = { n: "s", s: "n", e: "w", w: "e" };

function openLinks(links) {
  const m = new Map();
  const add = (a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  for (const [a, b] of links) { add(a, b); add(b, a); }
  return (a, b) => a === b || !!m.get(a)?.has(b);
}

function growFlanks(G, plan, rng, noise, SH = null) {
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
      if (SH && !SH.inMask(x, z)) continue;
      G.set(x, z, { h: n.h, s: noise(x / 2.5 + 9, z / 2.5) > 0.66 ? "grass" : "sand", flank: 1 }, n.who);
      q.push({ x, z, h: n.h, r: n.r, who: n.who, d: n.d + 1 });
    }
  }
  if (SH) fillMask(G, plan, noise, SH);
}

function fillMask(G, plan, noise, SH) {
  const limit = new Map([["sanctum", 1], ["entry-dock", 0], ["exit-dock", 0]]);
  const q = [];
  G.each((c, x, z) => {
    const who = G.who(x, z);
    if (!who || c.s === "none" || c.s === "water" || c.s === "lift") return;
    if ((limit.get(who) ?? 9) <= 0) return;
    q.push({ x, z, h: c.s === "ramp" ? c.h - 1 : c.h, who, d: 0 });
  });
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (n.d >= (limit.get(n.who) ?? 99)) continue;
    for (const [dx, dz] of N4) {
      const x = n.x + dx, z = n.z + dz, c = G.at(x, z);
      if (!c || c.s !== "none" || !SH.inMask(x, z) || N4.some(([ax, az]) => G.at(x + ax, z + az)?.s === "lift")) continue;
      let inner = true;
      for (let dz = -2; dz <= 2 && inner; dz++) for (let dx = -2; dx <= 2; dx++) if (!SH.inMask(x + dx, z + dz)) { inner = false; break; }
      const lake = inner && n.d >= 2 && noise(x / 5.5 - 21, z / 5.5 + 13) > 0.5;
      if (lake) G.set(x, z, { h: 0, s: "water", lake: 1 }, null);
      else G.set(x, z, { h: n.h, s: noise(x / 2.5 + 9, z / 2.5) > 0.6 ? "grass" : noise(x / 1.7 - 3, z / 1.7 + 5) > 0.72 ? "dirt" : "sand", flank: 1, fill: 1 }, n.who);
      q.push({ x, z, h: n.h, who: n.who, d: n.d + 1, lake });
    }
  }
}

const steppable = (a, b, dir) => {
  const eh = (c, d) => (c.s !== "ramp" ? c.h : d === c.d ? c.h - 1 : d === OPP[c.d] ? c.h : null);
  const ha = eh(a, dir), hb = eh(b, OPP[dir]);
  return ha != null && ha === hb;
};

function dryStrays(G) {
  const seen = new Set();
  G.each((c, x, z) => {
    if (c.s !== "water" || seen.has(key(x, z))) return;
    const comp = [[x, z]];
    seen.add(key(x, z));
    let shore = 0, open = 0;
    for (let i = 0; i < comp.length; i++) for (const [dx, dz] of N4) {
      const a = comp[i][0] + dx, b = comp[i][1] + dz, n = G.at(a, b);
      if (n?.s === "water") { if (!seen.has(key(a, b))) { seen.add(key(a, b)); comp.push([a, b]); } }
      else if (G.land(a, b)) shore++;
      else open++;
    }
    if (shore < 3 || open > shore * 2) for (const [a, b] of comp) G.set(a, b, { h: 0, s: "none" }, null);
  });
}

function fillHoles(G, maxSize = 8, SH = null) {
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
    if (!edge && comp.length <= maxSize && (!SH || comp.every(([a, b]) => SH.inMask(a, b)) || comp.length <= 3)) for (const [a, b] of comp) G.set(a, b, { h: 0, s: "water" }, null);
  });
}

function separate(G, plan) {
  const ok = openLinks(plan.links), clashes = [];
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
    const covered = new Set(level.decor.filter((d) => (d.fw || 1) * (d.fd || 1) > 1).flatMap((d) => maskCells(d.t, d.x, d.z, d.rot || 0).map((m) => key(m.x, m.z))));
    const lostSet = new Set(lost.map(([x, z]) => key(x, z)));
    const arches = level.decor.filter((d) => (d.fw || 1) * (d.fd || 1) > 1 && maskCells(d.t, d.x, d.z, d.rot || 0).some((m) => m.pass && lostSet.has(key(m.x, m.z))));
    if (arches.length) { level.decor = level.decor.filter((d) => !arches.includes(d)); continue; }
    for (const [x, z] of lost) {
      if (covered.has(key(x, z))) continue;
      level.decor = level.decor.filter((d) => !(d.x === x && d.z === z && (d.fw || 1) === 1 && (d.fd || 1) === 1));
      level.decor.push({ t: rng.chance(0.5) ? "rock-big" : "rock", x, z, v: rng.int(0, 1), rot: 0, ox: 0, oz: 0, fw: 1, fd: 1, fill: true });
    }
  }
}

export const RECIPES = {
  ring: [],
  showpiece: [["hill", { size: [3, 2] }], ["lookout", { size: [4, 3] }], ["alcove", { size: [3, 3] }], ["inlet", { size: [2, 3] }]],
  hill: [["hill", { size: [3, 2] }]],
};

function withLandmark(recipe, profile) {
  const lm = profile.landmark && CATALOG[profile.landmark];
  if (!lm) return recipe;
  const size = lm.footprint.slice();
  const out = recipe.filter(([k]) => k !== "hill");
  return [["hill", { size }], ...out];
}

function pathDist(G) {
  const dist = new Map(), q = [];
  G.each((c, x, z) => { if (c.p) { dist.set(key(x, z), 0); q.push([x, z]); } });
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i], d = dist.get(key(x, z));
    for (const [dx, dz] of N4) {
      const nx = x + dx, nz = z + dz;
      if (!G.in(nx, nz) || dist.has(key(nx, nz))) continue;
      dist.set(key(nx, nz), d + 1);
      q.push([nx, nz]);
    }
  }
  return dist;
}

function sightCells(plan, things) {
  const [fx, fz] = plan.core.figure, centre = [fx + 0.5, fz + 0.5], out = new Set();
  const fire = things.find((t) => t.kind === "bonfire"), chest = things.find((t) => t.kind === "chest"), gate = things.find((t) => t.open === "watcher:w1");
  for (const v of [[fire.x, fire.z], [chest.x, chest.z], gate.threshold[0]]) {
    const n = Math.max(Math.abs(centre[0] - v[0]), Math.abs(centre[1] - v[1])) * 2;
    for (let i = 0; i <= n; i++) out.add(key(Math.round(v[0] + ((centre[0] - v[0]) * i) / n), Math.round(v[1] + ((centre[1] - v[1]) * i) / n)));
  }
  return out;
}

function growFeatures(G, plan, things, recipe, rng) {
  const placed = [];
  if (!recipe.length) return placed;
  const avoid = new Set(), mark = (x, z, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) avoid.add(key(x + dx, z + dz)); };
  for (const t of things) if (t.kind !== "watcher") { mark(t.x, t.z, 2); for (const c of [...(t.edge || []), ...(t.threshold || [])]) mark(c[0], c[1], 2); }
  for (const l of plan.locks) for (const c of l) mark(c[0], c[1], 2);
  const [tx0, tz0, tx1, tz1] = plan.core.terrace;
  for (let z = tz0 - 1; z <= tz1 + 1; z++) for (let x = tx0 - 1; x <= tx1 + 1; x++) avoid.add(key(x, z));
  const [px0, pz0, px1, pz1] = plan.plaza;
  for (let z = pz0 - 1; z <= pz1 + 1; z++) for (let x = px0 - 1; x <= px1 + 1; x++) avoid.add(key(x, z));
  G.each((c, x, z) => { if (c.s === "lift" || c.s === "ramp") mark(x, z, 2); });
  for (const k of sightCells(plan, things)) avoid.add(k);
  const dist = pathDist(G);
  for (const [kind, opts] of recipe) {
    const spec = FEATURES[kind];
    const options = rng.shuffle(spec.site(G, { avoid, dist }, opts)).sort((a, b) => b.score - a.score);
    for (const o of options.slice(0, 40)) {
      const snap = G.cells.map((r) => r.slice()), own = G.owner.map((r) => r.slice());
      const name = `${kind}-${placed.length + 1}`;
      const piece = stamp(G, name, kind, o.params, o.owner);
      if (piece.problems.length) {
        G.cells.forEach((r, z) => r.splice(0, r.length, ...snap[z]));
        G.owner.forEach((r, z) => r.splice(0, r.length, ...own[z]));
        continue;
      }
      placed.push(piece);
      for (const c of piece.cells) mark(c.x, c.z, 1);
      break;
    }
  }
  return placed;
}


function pickThings(G, plan, rng, o) {
  const things = [];
  const R = plan.rest, spawn = R.spawn.slice();
  const front = (x, z) => (x - spawn[0]) + (z - spawn[1]) > 0;
  const locks = plan.locks.flat();
  const [bx0, bz0, bx1, bz1] = R.box;
  const spots = [];
  for (let z = bz0; z <= bz1; z++) for (let x = bx0; x <= bx1; x++) {
    const c = G.at(x, z);
    if (!c || c.p || c.s === "ramp" || c.s === "lift" || c.s === "none" || c.s === "water") continue;
    const near = Math.max(Math.abs(x - spawn[0]), Math.abs(z - spawn[1]));
    if (near < 1 || near > 3) continue;
    const lockNear = locks.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 2);
    const lockTouch = locks.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 1);
    if (lockTouch) continue;
    spots.push([x, z, (near === 1 ? 3 : near) + (front(x, z) ? 4 : 0) + (lockNear ? 6 : 0) + rng.float(0, 0.5)]);
  }
  spots.sort((a, b) => a[2] - b[2]);
  if (!spots.length) throw new Error("no bonfire spot in the rest");
  const fire = spots[0];
  things.push({ id: "b1", kind: "bonfire", x: fire[0], z: fire[1], rot: 0 });
  const liftRot = (d) => ({ n: 0, w: 1, s: 2, e: 3 })[OPP[d]];
  things.push({ id: "e0", kind: "elevator", role: "entry", x: plan.entry.lift[0], z: plan.entry.lift[1], rot: liftRot(plan.entry.dir) });
  things.push({ id: "e1", kind: "elevator", role: "exit", x: plan.exitLift.lift[0], z: plan.exitLift.lift[1], rot: liftRot(plan.exitLift.dir) });
  const [fx, fz] = plan.core.figure, th = plan.core.threshold, rp = plan.core.ramp;
  const radius = +(Math.hypot(th[0] + 0.5 - (fx + 1), th[1] + 0.5 - (fz + 1)) + 0.9).toFixed(1);
  things.push({ id: "w1", kind: "watcher", x: fx, z: fz, size: [2, 2], radius });
  things.push({ id: "g1", kind: "gate", x: rp[0], z: rp[1], span: th[0] !== rp[0] ? "z" : "x", blocks: [rp.slice()], open: "watcher:w1", threshold: [th.slice()], edge: [th.slice(), rp.slice()] });
  const cellOf = (u) => plan.unitCell(u);
  const locked = new Set(locks.map((c) => key(...c)));
  const meta = [];
  const num = {};
  const nextId = (p) => `${p}${(num[p] = (num[p] || 0) + 1)}`;
  const padThings = (pad, role, cells = null) => {
    const a = nextId("p"), b = nextId("p");
    const live = role === "shortcut" ? "dark" : "live";
    const [n, f] = cells ? [cells.near, cells.far] : [pad.near, pad.far].map((u) => plan.unitCell(u.join ? u.join(",") : u));
    things.push({ id: a, kind: "pad", x: n[0], z: n[1], to: b, role, end: "near", state: live });
    things.push({ id: b, kind: "pad", x: f[0], z: f[1], to: a, role, end: "far", state: live });
    return [a, b, n, f];
  };
  const seenPads = new Set();
  for (const hop of plan.hops) {
    if (!hop.pad || seenPads.has(hop.pad.id)) continue;
    seenPads.add(hop.pad.id);
    padThings(hop.pad, hop.pad.exit ? "exit" : hop.pad.role, hop.cells || null);
  }
  for (const sc of plan.shortcuts) {
    const base = { id: sc.id, kind: sc.kind, progress: sc.progress, detour: +(sc.detour || 0).toFixed(1), reward: sc.reward, ...(sc.junction ? { junction: cellOf(sc.junction) } : {}) };
    if (sc.kind === "door") {
      const id = nextId("d");
      things.push({ id, kind: "door", edge: [sc.edge[0].slice(), sc.edge[1].slice()], x: sc.edge[1][0], z: sc.edge[1][1] });
      meta.push({ ...base, thing: id, far: cellOf(sc.far), near: sc.edge[0].slice() });
    } else if (sc.kind === "ladder" || sc.kind === "drop") {
      const id = nextId("k");
      things.push({ id, kind: "ladder", x: sc.top[0], z: sc.top[1], d: sc.dir, mode: sc.kind === "drop" ? "drop" : "kick" });
      meta.push({ ...base, thing: id, far: cellOf(sc.far), near: sc.bottom.slice() });
    } else if (sc.kind === "lever") {
      const lid = nextId("l"), gid = `g${things.filter((t) => t.kind === "gate").length + 1}`;
      const node = cellOf(sc.far), h = G.at(...node).h;
      const opts = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = node[0] + dx, z = node[1] + dz, c = G.at(x, z);
        if (!G.land(x, z) || c.p || c.room || c.s === "ramp" || c.s === "lift" || c.h !== h || locked.has(key(x, z))) continue;
        if (!N4.some(([ax, az]) => G.at(x + ax, z + az)?.p && G.at(x + ax, z + az).h === h && G.at(x + ax, z + az).s !== "ramp")) continue;
        opts.push([x, z, (dx && dz ? 0.5 : 0) + rng.float(0, 0.2)]);
      }
      opts.sort((a, b) => a[2] - b[2]);
      if (!opts.length) throw new Error(`lever ${sc.id}: no stand beside ${node}`);
      const [lx, lz] = opts[0];
      things.push({ id: lid, kind: "lever", x: lx, z: lz, opens: gid });
      const [near, block] = sc.edge;
      things.push({ id: gid, kind: "gate", x: block[0], z: block[1], span: near[0] !== block[0] ? "z" : "x", blocks: [block.slice()], open: `lever:${lid}`, threshold: [near.slice()], edge: [near.slice(), block.slice()] });
      meta.push({ ...base, thing: lid, gate: gid, far: [lx, lz], near: near.slice() });
    } else if (sc.kind === "pad") {
      const [a, b, n, f] = padThings(sc.pad, "shortcut");
      meta.push({ ...base, thing: b, far: f, near: n });
    }
  }
  const ch = plan.chest || { x: 1, z: 1, rot: 0 };
  plan.rewardLines = meta.filter((m) => m.reward && m.junction).map((m) => [m.junction, [ch.x, ch.z]]);
  things.push({ id: "c1", kind: "chest", x: ch.x, z: ch.z, rot: ch.rot, text: o.chestText || "A curl of dried ink, peeled off a lookout rail." });
  return { things, spawn, shortcuts: meta };
}

function routeMeta(G, plan, things, shortcuts) {
  const segments = Object.values(plan.segs).filter((s) => s.cells.length).map((s) => ({
    id: s.id, role: s.role,
    cells: s.cells.filter(([x, z]) => G.at(x, z)?.p).map(([x, z]) => [x, z]),
    links: s.links.map((l) => ({ to: l.to, via: l.via?.kind || null })),
  })).filter((s) => s.cells.length);
  const pads = things.filter((t) => t.kind === "pad");
  const near = (x, z, r) => pads.some((p) => Math.max(Math.abs(p.x - x), Math.abs(p.z - z)) <= r);
  const trapSlots = [];
  for (const s of segments) {
    if (s.role !== "spine") continue;
    let run = [];
    const flush = () => { if (run.length >= 3) trapSlots.push({ segment: s.id, cells: run.slice(1, -1).length ? run.slice(1, -1) : run }); run = []; };
    const order = s.cells;
    for (let i = 0; i < order.length; i++) {
      const [x, z] = order[i], c = G.at(x, z);
      const prev = run[run.length - 1];
      const adjacent = prev && Math.abs(prev[0] - x) + Math.abs(prev[1] - z) === 1;
      if (c.s === "ramp" || c.s === "lift" || near(x, z, 2) || (prev && !adjacent)) { flush(); if (c.s !== "ramp" && c.s !== "lift" && !near(x, z, 2)) run.push([x, z]); continue; }
      run.push([x, z]);
    }
    flush();
  }
  const features = (plan.features || []).map((p) => ({ kind: p.kind, name: p.name, cells: p.cells.filter((c) => c.s !== "ramp").map((c) => [c.x, c.z]), ...(p.ramp ? { ramp: p.ramp } : {}), ...(p.from ? { from: p.from, neck: p.neck } : {}) }));
  const fire = things.find((t) => t.kind === "bonfire");
  return { grammar: plan.topology.archetype, segments, shortcuts, bonfire: [fire.x, fire.z], vistas: [], trapSlots, features, pads: pads.map((p) => ({ id: p.id, to: p.to, role: p.role, end: p.end, at: [p.x, p.z] })) };
}

export function shapesFor(archetype) {
  return SHAPES.filter((s) => !archetype || s.archetypes.includes(archetype));
}

export function generateLayout(base, opts = {}) {
  const seed = opts.seed ?? 1;
  const tries = opts.tries ?? 40;
  let last = null;
  const history = [];
  const archetype = opts.archetype || "ring";
  for (let attempt = 0; attempt < tries; attempt++) {
    const rng = createRng(hashSeed(`${base.name}:${seed}:${attempt}`));
    const noise = valueNoise(hashSeed(`${seed}:${attempt}:n`));
    const shape = shapeById(opts.shape) || rng.pick(shapesFor(archetype).filter((s) => opts.pads !== false || !s.links || !Object.keys(s.links).length));
    const transforms = resolveTransforms(shape);
    const transform = opts.transform && transforms.includes(opts.transform) ? opts.transform : rng.pick(transforms);
    const scale = opts.scale || scaleFor(shape, { area: opts.area || 600 });
    const o = { archetype, chestText: opts.chestText || base.things?.find((t) => t.kind === "chest")?.text };
    let plan, G, SH, M;
    try {
      SH = placeShape(shape, { transform, scale, noise, rough: opts.rough !== false });
      G = createGrid(SH.W, SH.D);
      M = buildMission(SH, archetype, rng, { pads: opts.pads !== false, exitPad: opts.pads !== false, zones: !!opts.mask });
      M.noPads = opts.pads === false;
      drawShortcuts(SH, M, rng, { kinds: opts.shortcuts || rng.shuffle(["door", "lever", "ladder"]), windows: opts.windows === false ? null : opts.windows || WINDOWS, reward: !!opts.reward, count: opts.shortcutCount || 2, ninths: opts.ninths || null });
      plan = planIsland(G, SH, M, rng, { ...o, inIsland: opts.mask ? SH.inMask : null });
      plan.unitCell = (u) => SH.centre(SH.unuk(u));
    } catch (e) { history.push([e.message]); last = last || { level: null, problems: [e.message], attempt, history }; continue; }
    growFlanks(G, plan, rng, noise, opts.mask ? SH : null);
    const clashes = separate(G, plan);
    fillHoles(G, 8, opts.mask ? SH : null);
    for (const p of plan.pieces) p.problems = [...p.problems.filter((m) => /already path/.test(m)), ...FEATURES[p.kind].valid(G, p)];
    let picked;
    try { picked = pickThings(G, plan, rng, o); } catch (e) { history.push([e.message]); continue; }
    const { things, spawn, shortcuts } = picked;
    plan.profile = profileFor(base);
    const recipe = withLandmark(Array.isArray(opts.features) ? opts.features : RECIPES[opts.features || "ring"] || [], plan.profile);
    plan.features = growFeatures(G, plan, things, recipe, rng);
    plan.pieces.push(...plan.features);
    dryStrays(G);
    const cells = G.cells.map((row) => row.map((c) => {
      const out = { h: c.h, s: c.s };
      if (c.d) out.d = c.d;
      if (c.m) out.m = c.m;
      if (c.p) out.p = 1;
      return out;
    }));
    const route = routeMeta(G, plan, things, shortcuts);
    const level = {
      name: opts.name || `${base.name}-r${seed}`,
      concept: "route-first",
      size: [SH.W, SH.D], cells, decor: [], spawn,
      bg: base.bg, palette: { ...base.palette, kitTheme: opts.kitTheme || (PROFILES[base.name.split("-")[0]] ? base.name.split("-")[0] : "auto") }, materials: base.materials, light: base.light,
      pieces: [...new Set([...(base.pieces || []), ...(opts.kits === false ? [] : ["pieces/kits.js"])])], things, route,
      layout: { seed, attempt, grammar: "shape-route", shape: SH.id, family: SH.family, feeling: SH.feeling, transform: SH.transform, scale: SH.scale, landmasses: SH.landmasses, archetype, mirror: false, picks: plan.picks, features: recipe.map(([k]) => k) },
    };
    level.decor = placeDecor(level, base, plan, rng, noise);
    settle(level, rng);
    route.vistas = plan.vistas || [];
    for (const d of level.decor) { delete d.fw; delete d.fd; delete d.fill; }
    const problems = [...clashes, ...plan.pieces.flatMap((p) => p.problems), ...checkRoute(level, opts.catalog)];
    history.push(problems.slice(0, 3));
    if (!last?.level || problems.length < last.problems.length) last = { level, problems, attempt, history };
    if (!problems.length) { route.trapSlots = padSafeSlots(level); return { level, problems, attempt, history }; }
  }
  return last;
}
