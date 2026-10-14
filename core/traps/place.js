import { createRng, hashSeed } from "../rng.js";
import { prepareLevel, isWalkable, DIRS } from "../level.js";
import { findPath } from "../path.js";
import { world, distances } from "../layout/check.js";
import { forbiddenCells, validateTraps, excluded, mustGuard, guardProblems } from "./rules.js";

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

export const GUARD_SHAPES = {
  t03: (w) => [4, 3, 2].flatMap((n) => w(n)).map((cells) => ({ cells })),
  t25: (w, path, i, o) => [5, 4, 6].flatMap((n) => w(n)).flatMap((cells) => coversFor(cells, o).map((cover) => ({ cells, plate: cells[0], cover }))),
  t02: (w) => w(3).map((cells) => ({ cells })),
  t18: (w, path, i) => w(1).filter(([c]) => { const j = path.findIndex((q) => q[0] === c[0] && q[1] === c[1]); return j >= 2 && straight(path.slice(j - 2, j + 1)); }).map((cells) => ({ cells })),
  t22: (w) => w(1).map((cells) => ({ cells })),
  t21: (w) => w(1).map((cells) => ({ cells })),
  t23: (w) => w(1).map((cells) => ({ cells })),
};

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

export function placeTraps(raw, kinds, { position = null, seed = raw.name } = {}) {
  const rng = createRng(hashSeed(`${seed}:traps`));
  const P = quiet(raw);
  const forbidden = forbiddenCells(raw);
  const free = (x, z) => !forbidden.has(key(x, z));
  const placed = [], charges = [], problems = [], used = new Set();
  const spots = rewardSpots(raw, P, free, rng);
  const open = world(P, new Set(P.things.map((t) => t.id)));
  for (const [i, kind] of kinds.entries()) {
    if (placed.some((t) => excluded(t.kind, kind))) { problems.push(`${kind} excluded by an earlier pick`); continue; }
    const shape = GUARD_SHAPES[kind];
    if (!shape) { problems.push(`${kind}: no guard shape`); continue; }
    let done = false;
    for (const spot of spots) {
      if (done) break;
      if (used.has(spot)) continue;
      if (spot.kind === "chest" && placed.some((t) => t.guards?.chest === spot.id)) continue;
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
      const charge = spot.kind === "charge" ? { id: `kg${i + 1}`, x: spot.at[0], z: spot.at[1], pinned: true } : null;
      const guards = charge ? { charge: charge.id } : { chest: spot.id };
      const test = charge ? { ...raw, charges: [...(raw.charges || []), ...charges, charge] } : { ...raw, charges: [...(raw.charges || []), ...charges] };
      for (const o of shape(w, path, i, { P, raw, free, path }).slice(0, 24)) {
        const t = { id: `${kind}-${i}`, kind, ...o, guards };
        if (mustGuard(kind) && guardProblems(test, t, P).length) continue;
        if (validateTraps(test, { position, traps: [...placed, t] }).length) continue;
        placed.push(t);
        if (charge) charges.push(charge);
        used.add(spot);
        done = true;
        break;
      }
    }
    if (!done) problems.push(`${kind}: no reward approach it can guard`);
  }
  return { traps: placed, charges, problems };
}
