import { TRAP_BY_ID } from "./catalog.js";
import { KINDS } from "./kinds.js";
import { trapCells } from "./index.js";
import { world, distances, SLIP_KINDS } from "../layout/check.js";
import { prepareLevel, isWalkable } from "../level.js";

const key = (x, z) => x + "," + z;
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

export const BUDGET = [
  { upto: 3, local: 2, hidden: 0, sequence: 0, puzzle: 1, debuff: 0 },
  { upto: 8, local: 4, hidden: 1, sequence: 1, puzzle: 1, debuff: 1 },
  { upto: 12, local: 5, hidden: 2, sequence: 1, puzzle: 1, debuff: 1 },
];

export const budgetFor = (position) => (position == null ? null : BUDGET.find((b) => position <= b.upto) || BUDGET[BUDGET.length - 1]);

export function excludesOf(kind) {
  const m = TRAP_BY_ID[kind];
  if (!m) return [];
  const own = m.excludes || [];
  const inherited = (m.members || []).filter((id) => TRAP_BY_ID[id]).flatMap((id) => TRAP_BY_ID[id].excludes || []);
  return [...new Set([...own, ...inherited])];
}

export function excluded(a, b) {
  return excludesOf(a).includes(b) || excludesOf(b).includes(a);
}

export function compatible(kinds) {
  const out = [];
  for (let i = 0; i < kinds.length; i++) for (let j = i + 1; j < kinds.length; j++) if (excluded(kinds[i], kinds[j])) out.push([kinds[i], kinds[j]]);
  return out;
}

const quiet = (raw) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = warn; }
};

export function forbiddenCells(raw) {
  const out = new Map();
  const add = (c, why) => { if (Array.isArray(c) && !out.has(key(c[0], c[1]))) out.set(key(c[0], c[1]), why); };
  const near = (c, r, why) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) add([c[0] + dx, c[1] + dz], why); };
  if (raw.spawn) near(raw.spawn, 2, "near spawn");
  for (const t of raw.things || []) {
    if (t.trap) continue;
    const kind = t.kind || t.t;
    const at = [t.x, t.z];
    if (kind === "bonfire") near(at, 2, "near bonfire");
    else if (kind === "elevator") near(at, 1, "lift");
    else if (kind === "pad") near(at, t.role === "exit" || t.end === "far" ? 2 : 1, "teleporter pad");
    else if (kind === "gate") { for (const c of t.blocks || [at]) add(c, "gate"); for (const c of t.threshold || []) add(c, "gate threshold"); for (const c of t.edge || []) add(c, "gate"); if (t.back) add(t.back, "gate"); }
    else if (kind === "door") { for (const c of t.edge || [at]) add(c, "shortcut"); }
    else if (kind === "ladder") { add(at, "shortcut"); }
    else if (kind === "lever") near(at, 1, "lever");
    else if (kind === "chest") near(at, 1, "chest");
  }
  for (const s of raw.route?.shortcuts || []) { add(s.far, "shortcut"); add(s.near, "shortcut"); }
  for (const s of raw.route?.segments || []) if (s.role === "bonfire") for (const c of s.cells) add(c, "plaza");
  const cells = raw.cells || [];
  for (let z = 0; z < cells.length; z++) for (let x = 0; x < cells[z].length; x++) {
    if (cells[z][x].s !== "ramp") continue;
    near([x, z], 1, "ramp landing");
  }
  return out;
}

export const mustGuard = (kind) => { const m = TRAP_BY_ID[kind]; return !!m && m.tier === "local" && m.visibility !== "hidden" && !KINDS[kind]?.free; };

export function applyGrip(raw) {
  const slick = (raw.traps || []).filter((t) => SLIP_KINDS.has(t.kind));
  if (!slick.length) return raw;
  const N = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const seeds = [...(raw.charges || []).map((c) => [c.x, c.z])];
  for (const t of raw.things || []) if ((t.kind || t.t) === "chest") seeds.push(...N.slice(1).map(([dx, dz]) => [t.x + dx, t.z + dz]));
  for (const t of raw.traps || []) if (t.guards) seeds.push(...dangerCells(t));
  const out = new Map();
  for (const [x, z] of seeds) for (const [dx, dz] of N) {
    const c = raw.cells[z + dz]?.[x + dx];
    if (c && !c.p && c.s !== "none" && c.s !== "water" && c.h >= 1) out.set(key(x + dx, z + dz), [x + dx, z + dz]);
  }
  const grip = [...out.values()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const t of slick) { if (grip.length) t.grip = grip; else delete t.grip; }
  return raw;
}

export function dangerCells(t) {
  const k = KINDS[t.kind];
  return k?.danger ? k.danger(t) : trapCells(t);
}

export function rewardCells(raw, guards, P) {
  if (!guards) return null;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (guards.chest) {
    const c = (raw.things || []).find((q) => q.id === guards.chest && (q.kind || q.t) === "chest");
    return c ? N4.map(([dx, dz]) => [c.x + dx, c.z + dz]).filter(([x, z]) => P.cells[z]?.[x] && isWalkable(P, x, z)) : null;
  }
  if (guards.charge) {
    const c = (raw.charges || []).find((q) => q.id === guards.charge);
    return c ? [[c.x, c.z]] : null;
  }
  if (Array.isArray(guards.at)) return [guards.at.slice()];
  return null;
}

export function guardProblems(raw, t, P = quiet(raw)) {
  const r = rewardCells(raw, t.guards, P);
  if (!t.guards) return ["a visible or telegraphed trap must guard a reward (set guards to a chest, a charge or a cell)"];
  if (!r || !r.length) return [`guards ${JSON.stringify(t.guards)} names no reward on this level`];
  const all = new Set(P.things.map((q) => q.id));
  const start = raw.spawn;
  const open = world(P, all);
  if (!r.some((c) => distances(open, start).has(key(c[0], c[1])))) return ["its reward cannot be reached at all"];
  const cut = world(P, all);
  for (const [x, z] of dangerCells(t)) cut.blocked.add(key(x, z));
  const d = distances(cut, start);
  if (r.some((c) => d.has(key(c[0], c[1])))) return ["you can walk around it to its reward; it must sit on the only approach"];
  return [];
}

export function worstState(raw, traps = raw.traps || []) {
  const blocked = [];
  for (const t of traps) {
    const k = KINDS[t.kind];
    const w = k?.worst ? k.worst(t) : null;
    for (const c of w?.blocked || []) blocked.push(c);
  }
  return { blocked };
}

export function liftToLift(raw, extraBlocked = []) {
  const P = quiet(raw);
  const entry = P.things.find((t) => t.kind === "elevator" && t.role === "entry");
  const exit = P.things.find((t) => t.kind === "elevator" && t.role === "exit");
  if (!entry || !exit) return null;
  const core = P.things.filter((t) => t.kind === "gate" && /^watcher:/.test(String(t.open || ""))).map((t) => t.id);
  const L = world(P, new Set(core));
  for (const [x, z] of extraBlocked) L.blocked.add(key(x, z));
  return distances(L, [entry.x, entry.z]).has(key(exit.x, exit.z));
}

export function validateTraps(raw, { position = null, traps = raw.traps || [] } = {}) {
  const problems = [];
  const P = quiet(raw);
  const kinds = [];
  const counts = { local: 0, hidden: 0, sequence: 0, puzzle: 0, debuff: 0 };
  const forbidden = forbiddenCells(raw);
  const foot = [];
  for (const [i, t] of traps.entries()) {
    const m = TRAP_BY_ID[t.kind];
    const name = `${t.id || t.kind + "-" + i} (${t.kind})`;
    if (!m) { problems.push(`${name}: unknown trap kind`); continue; }
    if (!KINDS[t.kind]) problems.push(`${name}: no runtime for ${m.name}`);
    if (kinds.includes(t.kind) && raw.trapRules !== "showcase") problems.push(`${name}: ${m.name} appears twice`);
    kinds.push(t.kind);
    counts[m.tier]++;
    if (m.visibility === "hidden") counts.hidden++;
    if (m.tier === "sequence") counts.local += Math.max(2, (m.members || []).length);
    const cells = trapCells(t);
    const own = (raw.things || []).find((q) => q.id && q.id === t.gate);
    const ownCells = new Set(own ? [...(own.edge || []), ...(own.threshold || []), ...(own.blocks || [])].map((c) => key(c[0], c[1])) : []);
    const prize = (t.guards?.chest || t.chest || t.real) && (raw.things || []).find((q) => q.id === (t.guards?.chest || t.chest || t.real));
    if (prize) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) ownCells.add(key(prize.x + dx, prize.z + dz));
    for (const c of cells) {
      if (ownCells.has(key(c[0], c[1]))) continue;
      const why = forbidden.get(key(c[0], c[1]));
      if (why && m.tier !== "debuff") problems.push(`${name}: cell ${c} sits on ${why}`);
    }
    const k = KINDS[t.kind];
    if (k?.check) for (const p of k.check(t, P) || []) problems.push(`${name}: ${p}`);
    if (mustGuard(t.kind)) for (const p of guardProblems(raw, t, P)) problems.push(`${name}: ${p}`);
    if (m.visibility === "hidden" && cells.length) {
      const marks = [...(raw.decor || []).map((d) => [d.x, d.z]), ...(raw.things || []).map((q) => [q.x, q.z])];
      if (!cells.some((c) => marks.some((d) => cheb(c, d) <= 4))) problems.push(`${name}: hidden trap has no landmark within 4 cells`);
    }
    foot.push({ t, m, cells: [...cells, ...(k?.extra ? k.extra(t) : [])] });
  }
  const showcase = raw.trapRules === "showcase";
  if (!showcase) for (const [a, b] of compatible(kinds)) problems.push(`${a} and ${b} exclude each other`);
  if (counts.debuff > 1 && !showcase) problems.push(`${counts.debuff} debuffs, at most 1`);
  if (counts.puzzle > 1 && !showcase) problems.push(`${counts.puzzle} puzzles, at most 1`);
  if (!showcase) for (let i = 0; i < foot.length; i++) for (let j = i + 1; j < foot.length; j++) {
    const A = foot[i], B = foot[j];
    if (A.m.tier === "debuff" || B.m.tier === "debuff") continue;
    if (A.cells.some((a) => B.cells.some((b) => cheb(a, b) < 3))) problems.push(`${A.t.kind} and ${B.t.kind} sit within two cells of each other`);
  }
  const b = budgetFor(position);
  if (b) {
    const locals = b.local - (counts.debuff ? 1 : 0);
    if (counts.local > locals) problems.push(`${counts.local} local traps, island ${position} allows ${locals}`);
    for (const tier of ["hidden", "sequence", "puzzle", "debuff"]) if (counts[tier] > b[tier]) problems.push(`${counts[tier]} ${tier}, island ${position} allows ${b[tier]}`);
  }
  const worst = worstState(raw, traps);
  const lifts = liftToLift(raw, worst.blocked);
  if (lifts === false) problems.push("worst state cuts the walk from lift to lift");
  const guarded = traps.filter((t) => mustGuard(t.kind)).flatMap(dangerCells);
  if (guarded.length && liftToLift(raw, [...worst.blocked, ...guarded]) === false) problems.push("a guarded reward is not optional: its trap sits on the walk from lift to lift");
  return problems;
}
