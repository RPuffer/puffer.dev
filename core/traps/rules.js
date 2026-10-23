import { TRAP_BY_ID } from "./catalog.js";
import { KINDS } from "./kinds.js";
import { trapCells } from "./index.js";
import { world, distances, SLIP_KINDS } from "../layout/check.js";
import { prepareLevel, isWalkable, edgeFall, DIRS } from "../level.js";

const key = (x, z) => x + "," + z;
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

export const BUDGET = [
  { upto: 2, visible: 5, hidden: 2, sequence: 0, puzzle: 1, debuff: 0, total: [4, 7] },
  { upto: 4, visible: 5, hidden: 5, sequence: 1, puzzle: 1, debuff: 1, total: [6, 10] },
  { upto: 8, visible: 5, hidden: 9, sequence: 1, puzzle: 1, debuff: 1, total: [8, 14] },
  { upto: 12, visible: 5, hidden: 12, sequence: 2, puzzle: 1, debuff: 1, total: [11, 17] },
];

export const REPEAT = { t10: 3, t11: 3, t20: 3, t21: 4 };
export const HIDDEN_MAJORITY_FROM = 5;
export const LEAN_OBVIOUS_UPTO = 2;
export const HIDDEN_CLEAR = 6;

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

export const harmless = (kind) => TRAP_BY_ID[kind]?.health === "none";
export const mustGuard = (kind) => { const m = TRAP_BY_ID[kind]; return !!m && m.tier === "local" && m.visibility !== "hidden" && !KINDS[kind]?.free; };
export const needsGuard = (t) => mustGuard(t.kind) && (!!t.guards || !harmless(t.kind));

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

const DODGES = {
  t19: (t) => (t.dodge ? [t.dodge] : []),
  t25: (t) => (t.cover ? [t.cover] : []),
  t26: (t) => t.notches || [],
};

export function luckProblems(t, P) {
  const out = [];
  const lane = trapCells(t);
  for (const c of DODGES[t.kind]?.(t) || []) for (const [name, d] of Object.entries(DIRS)) {
    if (!lane.some((q) => q[0] === c[0] - d[0] && q[1] === c[1] - d[1])) continue;
    if (edgeFall(P, c[0], c[1], name)) out.push(`its safe cell ${c} sits on an open edge: one held step too many drops you`);
  }
  return out;
}

export function isHidden(kind) { return TRAP_BY_ID[kind]?.visibility === "hidden"; }

export function trapDistances(raw, traps = raw.traps || [], P = quiet(raw)) {
  const d = distances(world(P, new Set(P.things.map((t) => t.id))), raw.spawn);
  return traps.map((t) => { const ds = trapCells(t).map((c) => d.get(key(c[0], c[1]))).filter((v) => v != null); return ds.length ? Math.min(...ds) : null; });
}

export function validateTraps(raw, { position = null, traps = raw.traps || [], partial = false } = {}) {
  const problems = [];
  const P = quiet(raw);
  const kinds = [];
  const counts = { visible: 0, hidden: 0, sequence: 0, puzzle: 0, debuff: 0 };
  const showcase = raw.trapRules === "showcase";
  const forbidden = forbiddenCells(raw);
  const foot = [];
  for (const [i, t] of traps.entries()) {
    const m = TRAP_BY_ID[t.kind];
    const name = `${t.id || t.kind + "-" + i} (${t.kind})`;
    if (!m) { problems.push(`${name}: unknown trap kind`); continue; }
    if (!KINDS[t.kind]) problems.push(`${name}: no runtime for ${m.name}`);
    const seen = kinds.filter((k) => k === t.kind).length;
    if (seen && !showcase && seen >= (REPEAT[t.kind] || 1)) problems.push(`${name}: ${m.name} appears ${seen + 1} times, at most ${REPEAT[t.kind] || 1}`);
    kinds.push(t.kind);
    if (m.tier === "sequence" || m.tier === "puzzle" || m.tier === "debuff") counts[m.tier]++;
    if (m.tier === "debuff" || m.tier === "puzzle") {} else if (m.visibility === "hidden") counts.hidden++; else counts.visible++;
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
    if (needsGuard(t)) for (const p of guardProblems(raw, t, P)) problems.push(`${name}: ${p}`);
    for (const p of luckProblems(t, P)) problems.push(`${name}: ${p}`);
    if (m.visibility === "hidden" && cells.length) {
      const marks = [...(raw.decor || []).map((d) => [d.x, d.z]), ...(raw.things || []).map((q) => [q.x, q.z])];
      if (!cells.some((c) => marks.some((d) => cheb(c, d) <= 4))) problems.push(`${name}: hidden trap has no landmark within 4 cells`);
    }
    foot.push({ t, m, cells: [...cells, ...(k?.extra ? k.extra(t) : [])] });
  }
  if (!showcase) for (const [a, b] of compatible([...new Set(kinds)])) problems.push(`${a} and ${b} exclude each other`);
  if (counts.debuff > 1 && !showcase) problems.push(`${counts.debuff} debuffs, at most 1`);
  if (counts.puzzle > 1 && !showcase) problems.push(`${counts.puzzle} puzzles, at most 1`);
  if (!showcase) for (let i = 0; i < foot.length; i++) for (let j = i + 1; j < foot.length; j++) {
    const A = foot[i], B = foot[j];
    if (A.m.tier === "debuff" || B.m.tier === "debuff") continue;
    const pair = A.m.visibility === "hidden" && B.m.visibility === "hidden" && A.m.tier === "local" && B.m.tier === "local";
    if (pair ? A.cells.some((a) => B.cells.some((b) => cheb(a, b) < 1)) : A.cells.some((a) => B.cells.some((b) => cheb(a, b) < 2))) problems.push(pair ? `${A.t.kind} and ${B.t.kind} share a cell` : `${A.t.kind} and ${B.t.kind} touch: footprints keep one clear cell between them`);
  }
  const b = budgetFor(position);
  if (b && !showcase) {
    if (counts.visible > b.visible) problems.push(`${counts.visible} visible traps, island ${position} allows ${b.visible}`);
    for (const tier of ["hidden", "sequence", "puzzle", "debuff"]) if (counts[tier] > b[tier]) problems.push(`${counts[tier]} ${tier}, island ${position} allows ${b[tier]}`);
    const total = traps.filter((t) => TRAP_BY_ID[t.kind] && TRAP_BY_ID[t.kind].tier !== "debuff").length;
    if ((!partial && total < b.total[0]) || total > b.total[1]) problems.push(`${total} traps, island ${position} wants ${b.total[0]} to ${b.total[1]}`);
    if (!partial && position >= HIDDEN_MAJORITY_FROM && counts.hidden * 2 <= total) problems.push(`${counts.hidden} of ${total} traps are hidden; from island ${HIDDEN_MAJORITY_FROM} hidden traps are the majority`);
    if (!partial && position <= LEAN_OBVIOUS_UPTO && counts.hidden >= counts.visible) problems.push(`${counts.hidden} hidden against ${counts.visible} visible; islands 1 to ${LEAN_OBVIOUS_UPTO} lean on traps you can see`);
    const dist = trapDistances(raw, traps, P);
    const hid = [], vis = [];
    traps.forEach((t, i) => { const m = TRAP_BY_ID[t.kind]; if (!m || m.tier === "debuff" || m.tier === "puzzle" || dist[i] == null) return; (m.visibility === "hidden" ? hid : vis).push(dist[i]); });
    for (const [i, t] of traps.entries()) if (isHidden(t.kind) && dist[i] != null && dist[i] < HIDDEN_CLEAR) problems.push(`${t.id || t.kind}: hidden trap ${dist[i]} steps from the bonfire, at least ${HIDDEN_CLEAR}`);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    if (!partial && hid.length && vis.length && mean(hid) <= mean(vis)) problems.push(`hidden traps average ${mean(hid).toFixed(1)} steps from the bonfire against ${mean(vis).toFixed(1)} for visible ones; the hidden ones sit farther along`);
  }
  const worst = worstState(raw, traps);
  const lifts = liftToLift(raw, worst.blocked);
  if (lifts === false) problems.push("worst state cuts the walk from lift to lift");
  const remembered = traps.filter((t) => isHidden(t.kind) && !harmless(t.kind) && TRAP_BY_ID[t.kind].tier === "local").flatMap(dangerCells);
  if (remembered.length && liftToLift(raw, [...worst.blocked, ...remembered]) === false) problems.push("no clean walk: a player who remembers every hidden trap still has to step on one between the lifts");
  const guarded = traps.filter(needsGuard).flatMap(dangerCells);
  if (guarded.length && liftToLift(raw, [...worst.blocked, ...guarded]) === false) problems.push("a guarded reward is not optional: its trap sits on the walk from lift to lift");
  return problems;
}
