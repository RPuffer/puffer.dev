import { prepareLevel, isWalkable, canStep, DIRS } from "../level.js";
import { world, distances } from "./check.js";
import { createRng } from "../rng.js";

const key = (x, z) => x + "," + z;
export const PICKUPS = { count: 2, spacing: 6, feature: { lookout: 6, alcove: 5, hill: 4, inlet: 3 }, behind: 4, pocket: 3, off: 3 };

const quiet = (raw) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = warn; }
};

export function trapCellSet(traps = []) {
  const out = new Set();
  const add = (c) => { if (Array.isArray(c) && typeof c[0] === "number") out.add(key(c[0], c[1])); };
  for (const t of traps) {
    for (const f of ["cells", "plates", "notches"]) for (const c of t[f] || []) add(c);
    for (const f of ["plate", "kick", "boss"]) add(t[f]);
    if (Array.isArray(t.zone) && t.zone.length === 4) for (let z = t.zone[1]; z <= t.zone[3]; z++) for (let x = t.zone[0]; x <= t.zone[2]; x++) out.add(key(x, z));
  }
  return out;
}

export function startCell(P) {
  const e = P.things.find((t) => t.kind === "elevator" && t.role === "entry");
  return e ? [e.x, e.z] : P.spawn;
}

export function placeCharges(raw, { seed = 1, count = PICKUPS.count } = {}) {
  const P = quiet(raw);
  const start = startCell(P);
  const all = new Set(P.things.map((t) => t.id));
  const closed = distances(world(P), start), open = distances(world(P, all), start);
  const traps = trapCellSet(raw.traps);
  const thingCells = new Set(P.things.flatMap((t) => [[t.x, t.z], ...(t.blocks || [])]).map((c) => key(c[0], c[1])));
  const path = [];
  P.cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) path.push([x, z]); }));
  const feat = new Map();
  for (const f of raw.route?.features || []) for (const c of f.cells || []) feat.set(key(c[0], c[1]), PICKUPS.feature[f.kind] || 0);
  const rng = createRng(String(seed) + ":charges:" + (raw.name || "")).next;
  const cands = [];
  P.cells.forEach((row, z) => row.forEach((c, x) => {
    const k = key(x, z);
    if (!isWalkable(P, x, z) || c.p || c.s === "ramp" || !open.has(k) || traps.has(k) || thingCells.has(k)) return;
    if (Math.max(Math.abs(x - start[0]), Math.abs(z - start[1])) <= 2) return;
    const exits = Object.keys(DIRS).filter((d) => canStep(P, x, z, d)).length;
    const off = path.length ? Math.min(...path.map((q) => Math.abs(q[0] - x) + Math.abs(q[1] - z))) : 3;
    const score = (feat.get(k) || 0) + (closed.has(k) ? 0 : PICKUPS.behind) + (exits <= 1 ? PICKUPS.pocket : 0) + Math.min(off, PICKUPS.off) + rng() * 0.5;
    cands.push({ x, z, score, near: closed.has(k) });
  }));
  cands.sort((a, b) => b.score - a.score);
  const picked = [];
  const far = (c) => picked.every((q) => Math.abs(q.x - c.x) + Math.abs(q.z - c.z) >= PICKUPS.spacing);
  for (const c of cands) { if (picked.length >= count) break; if (far(c)) picked.push(c); }
  if (picked.length && !picked.some((c) => c.near)) {
    const n = cands.find((c) => c.near && picked.slice(0, -1).every((q) => Math.abs(q.x - c.x) + Math.abs(q.z - c.z) >= PICKUPS.spacing)) || cands.find((c) => c.near);
    if (n) picked[picked.length - 1] = n;
  }
  return picked.map((c, i) => ({ id: "k" + (i + 1), x: c.x, z: c.z }));
}

export function checkCharges(raw) {
  const P = quiet(raw), start = startCell(P);
  const closed = distances(world(P), start), traps = trapCellSet(raw.traps);
  const list = raw.charges || [];
  const problems = [];
  if (!list.length) problems.push("no charge pickups");
  if (list.length && !list.some((c) => closed.has(key(c.x, c.z)))) problems.push("no charge pickup reachable before any shortcut opens");
  for (const c of list) {
    if (!isWalkable(P, c.x, c.z)) problems.push(`pickup ${c.id} at ${c.x},${c.z} is not walkable`);
    if (traps.has(key(c.x, c.z))) problems.push(`pickup ${c.id} at ${c.x},${c.z} sits on a trap cell`);
  }
  return problems;
}
