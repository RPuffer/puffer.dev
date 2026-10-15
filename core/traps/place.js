import { createRng, hashSeed } from "../rng.js";
import { prepareLevel, isWalkable, isVoid, DIRS } from "../level.js";
import { TRAP_BY_ID } from "./catalog.js";
import { findPath } from "../path.js";
import { world, distances } from "../layout/check.js";
import { forbiddenCells, validateTraps, excluded, mustGuard, guardProblems, applyGrip } from "./rules.js";

const key = (x, z) => x + "," + z;
const N4 = Object.values(DIRS);

const quiet = (raw) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = warn; }
};

const straight = (cells) => {
  if (cells.length < 2) return true;
  const d = [cells[1][0] - cells[0][0], cells[1][1] - cells[0][1]];
  return cells.every((c, i) => c[0] === cells[0][0] + d[0] * i && c[1] === cells[0][1] + d[1] * i);
};

const flat = (raw, cells) => cells.every(([x, z]) => raw.cells[z][x].s !== "ramp" && raw.cells[z][x].h === raw.cells[cells[0][1]][cells[0][0]].h);

const onPath = (path, c) => path.some((q) => q[0] === c[0] && q[1] === c[1]);
function coversFor(cells, { P, raw, free, path }) {
  const d = [Math.sign(cells[1][0] - cells[0][0]), Math.sign(cells[1][1] - cells[0][1])];
  const out = [];
  for (let k = 1; k <= cells.length - 3; k++) for (const s of [1, -1]) {
    const c = [cells[k][0] + d[1] * s, cells[k][1] - d[0] * s];
    const h = raw.cells[c[1]]?.[c[0]];
    if (!h || h.s === "ramp" || h.h !== raw.cells[cells[k][1]][cells[k][0]].h || !isWalkable(P, c[0], c[1]) || !free(c[0], c[1]) || onPath(path, c)) continue;
    out.push(c);
  }
  return out;
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const step = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
const level = (raw, a, b) => raw.cells[a[1]][a[0]].h === raw.cells[b[1]][b[0]].h && raw.cells[b[1]][b[0]].s !== "ramp";
const offCell = (c, { P, raw, free, path }, from) => {
  const h = raw.cells[c[1]]?.[c[0]];
  return !!h && !h.p && h.s !== "ramp" && isWalkable(P, c[0], c[1]) && free(c[0], c[1]) && !onPath(path, c) && (!from || level(raw, from, c));
};
function shoulders(cells, o, ks) {
  const d = step(cells[0], cells[1]);
  const out = [];
  for (const k of ks) for (const s of [1, -1]) { const c = [cells[k][0] + d[1] * s, cells[k][1] - d[0] * s]; if (offCell(c, o, cells[k])) out.push(c); }
  return out;
}
const reach = (o, blocked) => {
  const W = world(o.P, new Set(o.P.things.map((t) => t.id)));
  for (const [x, z] of blocked) W.blocked.add(key(x, z));
  const d = distances(W, o.raw.spawn);
  return o.goals.some((g) => d.has(key(g[0], g[1])));
};
function staircase(path, i, o) {
  const p = path[i], d = step(path[i - 1], p);
  for (const s of [1, -1]) {
    const e = [d[1] * s, -d[0] * s];
    const a = [p[0] + e[0], p[1] + e[1]], b = [a[0] + d[0], a[1] + d[1]], c = [b[0] + e[0], b[1] + e[1]];
    if ([a, b, c].every((q, j) => offCell(q, o, j ? null : p))) return [a, b, c];
  }
  return null;
}

export const GUARD_SHAPES = {
  t03: (w) => [4, 3, 2].flatMap((n) => w(n)).map((cells) => ({ cells })),
  t25: (w, path, i, o) => [5, 4, 6].flatMap((n) => w(n)).flatMap((cells) => coversFor(cells, o).map((cover) => ({ cells, plate: cells[0], cover }))),
  t02: (w) => w(3).map((cells) => ({ cells })),
  t18: (w, path, i) => w(1).filter(([c]) => { const j = path.findIndex((q) => q[0] === c[0] && q[1] === c[1]); return j >= 2 && straight(path.slice(j - 2, j + 1)); }).map((cells) => ({ cells })),
  t22: (w) => w(1).map((cells) => ({ cells })),
  t21: (w) => w(1).map((cells) => ({ cells })),
  t23: (w) => w(1).map((cells) => ({ cells })),
  t04: (w, path, i, o) => [5, 4, 6].flatMap((n) => w(n)).map((cells) => ({ cells, plates: shoulders(cells, o, cells.map((_, k) => k)).slice(0, 3) })).filter((t) => t.plates.length >= 2),
  t05: (w, path, i, o) => {
    const out = [];
    for (const j of o.tailIdx) {
      if (j < 1 || j >= path.length - 1) continue;
      const a = path[j - 1], b = path[j], c = path[j + 1], d = step(a, b), e = step(b, c);
      if (same(d, e)) continue;
      const on = [b[0] + d[0], b[1] + d[1]], cut = [a[0] + e[0], a[1] + e[1]];
      if (!isVoid(o.P, on[0], on[1]) || !offCell(cut, o, a) || !o.free(b[0], b[1]) || !level(o.raw, a, b)) continue;
      out.push({ cells: [b], from: a, on, cut });
    }
    return out;
  },
  t06: (w, path, i, o) => [2, 1].flatMap((n) => w(n)).filter((cells) => cells.every((c) => !o.raw.cells[c[1]][c[0]].p)).map((cells) => ({ cells })),
  t12: (w, path, i, o) => w(3).filter((cells) => cells.every((c) => !o.raw.cells[c[1]][c[0]].p) && same(cells[2], path[path.length - 2])).map((cells) => ({ cells })),
  t16: (w) => [5, 6].flatMap((n) => w(n)).map((cells) => ({ cells })),
  t19: (w, path, i, o) => [5, 4, 6].flatMap((n) => w(n)).flatMap((cells) => shoulders(cells, o, cells.map((_, k) => k).slice(1)).map((dodge) => ({ cells, dodge }))),
  t15: (w, path, i, o) => [5, 4].flatMap((n) => w(n)).map((cells) => ({ cells: cells.slice(1, -1), h: o.raw.cells[cells[0][1]][cells[0][0]].h })).filter((t) => t.cells.length >= 2 && t.cells.length <= 3),
  t10: (w, path, i, o) => w(2).filter((cells) => reach(o, [cells[0]]) && reach(o, [cells[1]])).map((cells) => ({ cells })),
  t11: (w, path, i, o) => o.tail.flatMap((c, k) => k + 1 < o.tail.length ? shoulders([c, o.tail[k + 1]], o, [0]) : []).map((c) => ({ cells: [c], angle: [225, 135, 315][i % 3] })),
  t20: (w, path, i, o) => w(1).filter(([c]) => path.findIndex((q) => same(q, c)) >= 4).map((cells) => ({ cells })),
  t29: (w, path, i, o) => {
    const out = [];
    for (let j = 1; j + 7 <= path.length - 1; j++) {
      const hallCells = path.slice(j, j + 5), next = path.slice(j + 5, j + 7);
      if (!straight(hallCells) || !flat(o.raw, hallCells) || !hallCells.every(([x, z]) => o.free(x, z))) continue;
      if (same(step(hallCells[3], hallCells[4]), step(hallCells[4], next[0]))) continue;
      const block = next[1];
      if (!o.free(block[0], block[1]) || !reach(o, [block])) continue;
      if (N4.filter(([dx, dz]) => isWalkable(o.P, block[0] + dx, block[1] + dz)).length < 3) continue;
      out.push({ cells: hallCells, block });
    }
    return out;
  },
  t28: (w) => {
    const runs = w(3).reverse(), out = [];
    for (let a = 0; a < runs.length; a++) for (let b = a + 1; b < runs.length; b++) {
      const A = runs[a], B = runs[b];
      if (A.some((c) => B.some((q) => Math.abs(c[0] - q[0]) + Math.abs(c[1] - q[1]) < 2))) continue;
      out.push({ cells: A, second: B });
    }
    return out;
  },
  t31: (w, path, i, o) => {
    const out = [];
    for (const j of o.tailIdx) {
      if (j < 4) continue;
      const coins = path.slice(j - 3, j + 1);
      if (!coins.every(([x, z]) => o.free(x, z) && o.raw.cells[z][x].p)) continue;
      const st = staircase(path, j, o);
      if (st) out.push({ coins: [...coins, ...st], angle: [225, 135, 315][i % 3] });
    }
    return out;
  },
  t48: (w, path, i, o) => o.spot.kind !== "charge" ? [] : [6, 5, 4].flatMap((n) => w(n)).filter((cells) => same(cells[cells.length - 1], path[path.length - 2])).map((cells) => {
    const at = o.spot.at, gid = `g-${o.id}`;
    return { cells, gate: gid, things: [{ id: gid, kind: "gate", x: at[0], z: at[1], span: cells[cells.length - 1][0] === at[0] ? "x" : "z", edge: [cells[cells.length - 1].slice(), at.slice()], blocks: [at.slice()], open: `trap:${o.id}` }] };
  }),
};

const PROP_SHAPES = {
  t07: (spot, o) => ({ cells: [spot.at], chest: `m-${o.id}`, things: [{ id: `m-${o.id}`, kind: "chest", x: spot.at[0], z: spot.at[1], rot: 0, trap: o.id, decoy: true }] }),
  t30: (spot, o) => o.chestFar(spot) ? { cells: [spot.at], chest: `m-${o.id}`, real: o.chest.id, things: [{ id: `m-${o.id}`, kind: "chest", x: spot.at[0], z: spot.at[1], rot: 0, trap: o.id, decoy: true }] } : null,
  t09: (spot, o) => ({ cells: [spot.at], thing: `p-${o.id}`, prop: o.i % 2 ? "lever" : "campfire", things: [{ id: `p-${o.id}`, kind: "lever", x: spot.at[0], z: spot.at[1], rot: 0, trap: o.id, decoy: true, ...(o.i % 2 ? {} : { verb: "Light the campfire" }) }] }),
};

const DEBUFF_EXTRA = { t36: (raw, i) => ({ dir: ["e", "s", "w", "n"][i % 4] }) };

function rewardSpots(raw, P, free, rng) {
  const out = [];
  for (const t of raw.things || []) if ((t.kind || t.t) === "chest") out.push({ kind: "chest", id: t.id, goals: N4.map(([dx, dz]) => [t.x + dx, t.z + dz]).filter(([x, z]) => isWalkable(P, x, z)) });
  const start = raw.spawn, open = distances(world(P, new Set(P.things.map((t) => t.id))), start);
  const taken = new Set((raw.charges || []).map((c) => key(c.x, c.z)));
  const pockets = [];
  P.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!isWalkable(P, x, z) || c.s === "ramp" || !open.has(key(x, z)) || taken.has(key(x, z)) || !free(x, z)) return;
    if (Math.max(Math.abs(x - start[0]), Math.abs(z - start[1])) <= 4) return;
    const exits = N4.filter(([dx, dz]) => isWalkable(P, x + dx, z + dz)).length;
    if (exits === 1) pockets.push([x, z]);
  }));
  for (const c of rng.shuffle(pockets)) out.push({ kind: "charge", at: c, goals: [c] });
  return out;
}

function trapdoorShape(raw, P, free, o) {
  const chest = (raw.things || []).find((t) => t.kind === "chest" && !t.trap);
  if (!chest) return [];
  const out = [];
  for (const [dx, dz] of N4) {
    const pad = [chest.x + dx, chest.z + dz];
    if (!isWalkable(P, pad[0], pad[1]) || !free(pad[0], pad[1]) || raw.cells[pad[1]][pad[0]].s === "ramp") continue;
    for (const [ex, ez] of N4) {
      const land = [pad[0] + ex, pad[1] + ez], c = raw.cells[land[1]]?.[land[0]];
      if (!c || c.s === "ramp" || c.h !== raw.cells[pad[1]][pad[0]].h - 1 || !isWalkable(P, land[0], land[1]) || !o.reachable(land)) continue;
      out.push({ cells: [pad], land, chest: chest.id });
    }
  }
  return out;
}

function twinShape(raw, P, free) {
  const gate = P.things.find((t) => t.kind === "gate" && /^watcher:/.test(String(t.open || "")));
  const th = gate?.threshold?.[0];
  if (!th) return [];
  const p = findPath(world(P, new Set(P.things.map((t) => t.id))), raw.spawn, th);
  if (!p) return [];
  const out = [];
  for (let k = p.length - 3; k >= Math.max(1, p.length - 5); k--) {
    const c = p[k], d = step(p[k - 1], c);
    for (const s of [1, -1]) {
      const q = [c[0] + d[1] * s, c[1] - d[0] * s], h = raw.cells[q[1]]?.[q[0]];
      if (h && !h.p && h.s !== "ramp" && isWalkable(P, q[0], q[1]) && free(q[0], q[1]) && !p.some((r) => same(r, q))) out.push({ cells: [q] });
    }
  }
  return out;
}

export function placeTraps(raw, kinds, { position = null, seed = raw.name } = {}) {
  const rng = createRng(hashSeed(`${seed}:traps`));
  const P = quiet(raw);
  const forbidden = forbiddenCells(raw);
  const free = (x, z) => !forbidden.has(key(x, z));
  const placed = [], charges = [], problems = [], used = new Set(), added = [];
  const spots = rewardSpots(raw, P, free, rng);
  const open = world(P, new Set(P.things.map((t) => t.id)));
  const fromFire = distances(open, raw.spawn);
  const realChest = (raw.things || []).find((t) => t.kind === "chest" && !t.trap);
  const keep = (t, extra = [], charge = null) => {
    const test = { ...raw, things: [...(raw.things || []), ...added, ...extra], charges: [...(raw.charges || []), ...charges, ...(charge ? [charge] : [])], traps: [...placed, t].map((q) => ({ ...q })) };
    applyGrip(test);
    if (mustGuard(t.kind) && guardProblems(test, t, quiet(test)).length) return false;
    if (validateTraps(test, { position, traps: [...placed, t] }).length) return false;
    placed.push(t);
    added.push(...extra);
    if (charge) charges.push(charge);
    return true;
  };
  for (const [i, kind] of kinds.entries()) {
    if (placed.some((t) => excluded(t.kind, kind))) { problems.push(`${kind} excluded by an earlier pick`); continue; }
    const id = `${kind}-${i}`;
    if (TRAP_BY_ID[kind]?.tier === "debuff") { if (!keep({ id, kind, ...(DEBUFF_EXTRA[kind]?.(raw, i) || {}) })) problems.push(`${kind}: debuff does not fit`); continue; }
    if (kind === "t08" || kind === "t17") {
      const opts = kind === "t08" ? trapdoorShape(raw, P, free, { reachable: (c) => fromFire.has(key(c[0], c[1])) }) : twinShape(raw, P, free);
      if (!opts.some((o) => keep({ id, kind, ...o }))) problems.push(`${kind}: no spot fits`);
      continue;
    }
    if (PROP_SHAPES[kind]) {
      const chestD = realChest ? Math.min(...N4.map(([dx, dz]) => fromFire.get(key(realChest.x + dx, realChest.z + dz)) ?? Infinity)) : Infinity;
      const o = { id, i, chest: realChest, chestFar: (sp) => (fromFire.get(key(sp.at[0], sp.at[1])) ?? -1) > chestD };
      let done = false;
      for (const spot of spots) {
        if (done || spot.kind !== "charge" || used.has(spot)) continue;
        const sh = PROP_SHAPES[kind](spot, o);
        if (!sh) continue;
        const { things, ...rest } = sh;
        if (keep({ id, kind, ...rest }, things)) { used.add(spot); done = true; }
      }
      if (!done) problems.push(`${kind}: no pocket fits`);
      continue;
    }
    const shape = GUARD_SHAPES[kind];
    if (!shape) { problems.push(`${kind}: no guard shape`); continue; }
    let done = false;
    const shares = !mustGuard(kind) && TRAP_BY_ID[kind]?.tier === "local";
    for (const spot of spots) {
      if (done) break;
      if (used.has(spot) && !shares) continue;
      if (spot.kind === "chest" && !shares && placed.some((t) => t.guards?.chest === spot.id)) continue;
      let path = null;
      for (const g of spot.goals) { const p = findPath(open, raw.spawn, g); if (p && (!path || p.length < path.length)) path = p; }
      if (!path || path.length < 6) continue;
      const tail = path.slice(Math.max(1, path.length - 14), path.length - (spot.kind === "charge" ? 1 : 0));
      const w = (n) => {
        const out = [];
        for (let j = tail.length - n; j >= 0; j--) {
          const cells = tail.slice(j, j + n);
          if (straight(cells) && flat(raw, cells) && cells.every(([x, z]) => free(x, z))) out.push(cells);
        }
        return out;
      };
      const charge = spot.kind === "charge" && !shares && !used.has(spot) ? { id: `kg${i + 1}`, x: spot.at[0], z: spot.at[1], pinned: true } : null;
      const guards = charge ? { charge: charge.id } : { chest: spot.id };
      const tailIdx = tail.map((c) => path.findIndex((q) => same(q, c)));
      for (const o of shape(w, path, i, { P, raw, free, path, tail, tailIdx, spot, id, goals: spot.goals }).slice(0, 40)) {
        const { things, ...rest } = o;
        const t = { id, kind, ...rest, ...(mustGuard(kind) || charge ? { guards } : {}) };
        if (!keep(t, things || [], charge)) continue;
        if (!shares) used.add(spot);
        done = true;
        break;
      }
    }
    if (!done) problems.push(`${kind}: no reward approach it can guard`);
  }
  return { traps: placed, charges, things: added, problems };
}
