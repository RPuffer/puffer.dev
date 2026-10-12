import { TRAP_BY_ID } from "./catalog.js";
import { KINDS } from "./kinds.js";
import { trapCells } from "./index.js";
import { world, distances } from "../layout/check.js";
import { prepareLevel } from "../level.js";

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
    for (const c of cells) {
      if (ownCells.has(key(c[0], c[1]))) continue;
      const why = forbidden.get(key(c[0], c[1]));
      if (why && m.tier !== "debuff") problems.push(`${name}: cell ${c} sits on ${why}`);
    }
    const k = KINDS[t.kind];
    if (k?.check) for (const p of k.check(t, P) || []) problems.push(`${name}: ${p}`);
    if (m.visibility === "hidden" && cells.length) {
      const marks = [...(raw.decor || []).map((d) => [d.x, d.z]), ...(raw.things || []).map((q) => [q.x, q.z])];
      if (!cells.some((c) => marks.some((d) => cheb(c, d) <= 4))) problems.push(`${name}: hidden trap has no landmark within 4 cells`);
    }
    foot.push({ t, m, cells: [...cells, ...(k?.extra ? k.extra(t) : [])] });
  }
  const showcase = raw.trapRules === "showcase";
  if (!showcase) for (const [a, b] of compatible(kinds)) problems.push(`${a} and ${b} exclude each other`);
  if (counts.debuff > 1) problems.push(`${counts.debuff} debuffs, at most 1`);
  if (counts.puzzle > 1) problems.push(`${counts.puzzle} puzzles, at most 1`);
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
  return problems;
}
