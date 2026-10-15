import { prepareLevel, canStep, isWalkable, DIRS } from "../level.js";
import { edgeKey, linkKey, ladderEnds, padLinks, PAD_COST } from "../interact.js";
import { checkLevel } from "../procgen.js";
import { maskCells } from "../catalog.js";

const key = (x, z) => x + "," + z;
export const SAVE_SHARE = 0.25;
export const SAVE_STEPS = 4;

function prepared(raw) {
  const warn = console.warn;
  console.warn = () => {};
  try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = warn; }
}

export function world(P, open = new Set(), o = {}) {
  const edges = new Set(), links = new Map();
  for (const t of P.things) {
    if ((t.kind === "gate" || t.kind === "door") && t.edge && !open.has(t.id)) edges.add(edgeKey(t.edge[0], t.edge[1]));
    if (t.kind === "ladder") {
      const e = ladderEnds(t);
      if (!e || o.skip === t.id) continue;
      if (t.mode === "drop") links.set(linkKey(e[0], e[1]), t.id);
      else if (open.has(t.id)) { links.set(linkKey(e[0], e[1]), t.id); links.set(linkKey(e[1], e[0]), t.id); }
    }
  }
  const blocked = new Set(P.blocked);
  for (const t of P.things) if (t.kind === "gate" && t.hold && !open.has(t.id)) for (const [x, z] of t.blocks) blocked.add(key(x, z));
  return { ...P, edges, links, blocked, pads: padLinks(P.things, open) };
}

export const SLIP_KINDS = new Set(["t35"]);

export function slipOf(L) {
  const slick = (L.traps || []).filter((t) => SLIP_KINDS.has(t.kind));
  if (!slick.length) return null;
  const zones = slick.map((t) => (Array.isArray(t.zone) && t.zone.length === 4 ? t.zone : null));
  const grip = new Set(slick.flatMap((t) => t.grip || []).map((c) => key(c[0], c[1])));
  return (x, z) => !!L.cells[z]?.[x] && !L.cells[z][x].p && !grip.has(key(x, z)) && zones.some((q) => !q || (x >= q[0] && x <= q[2] && z >= q[1] && z <= q[3]));
}

export function distances(L, from, { slip = slipOf(L) } = {}) {
  const d = new Map([[key(...from), 0]]);
  const stand = new Map([[key(...from), 0]]);
  const buckets = [[from]];
  for (let g = 0; g < buckets.length; g++) {
    const list = buckets[g];
    if (!list) continue;
    for (const [x, z] of list) {
      if (stand.get(key(x, z)) !== g) continue;
      const next = [];
      for (const dir of Object.keys(DIRS)) {
        if (!canStep(L, x, z, dir)) continue;
        const [dx, dz] = DIRS[dir], f = [x + dx, z + dz];
        if (slip && slip(f[0], f[1]) && canStep(L, f[0], f[1], dir)) next.push([[f[0] + dx, f[1] + dz], 2, f]);
        else next.push([f, 1]);
      }
      const jump = L.pads?.get(key(x, z));
      if (jump) next.push([jump, PAD_COST]);
      for (const [n, w, over] of next) {
        const k = key(...n), nd = g + w;
        if (over) { const ko = key(...over); if (!d.has(ko) || d.get(ko) > g + 1) d.set(ko, g + 1); }
        if (!d.has(k) || d.get(k) > nd) d.set(k, nd);
        if (stand.has(k) && stand.get(k) <= nd) continue;
        stand.set(k, nd);
        (buckets[nd] ||= []).push(n);
      }
    }
  }
  if (slip) d.stand = stand;
  return d;
}

const ringOf = (L, t) => {
  const out = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && isWalkable(L, t.x + dx, t.z + dz)) out.push(key(t.x + dx, t.z + dz));
  return out;
};

const toBonfire = (L, from, fire) => {
  const d = distances(L, from);
  let best = Infinity;
  for (const k of ringOf(L, fire)) if (d.has(k)) best = Math.min(best, d.get(k));
  return best;
};

function standOf(L, t) {
  if (t.kind === "door") return t.edge[1];
  if (t.kind === "pad") return [t.x, t.z];
  if (t.kind === "ladder") return [t.x, t.z];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) if (isWalkable(L, t.x + dx, t.z + dz) && L.cells[t.z + dz][t.x + dx].p) return [t.x + dx, t.z + dz];
  return null;
}

export function unreachableCells(raw) {
  const P = prepared(raw), entry = P.things.find((t) => t.kind === "elevator" && t.role === "entry");
  if (!entry) return [];
  const seen = distances(world(P, new Set(P.things.map((t) => t.id))), [entry.x, entry.z]), out = [];
  P.cells.forEach((row, z) => row.forEach((c, x) => { if (isWalkable(P, x, z) && !seen.has(key(x, z))) out.push([x, z]); }));
  return out;
}

export function routeDistances(raw) {
  const P = prepared(raw), byId = Object.fromEntries(P.things.map((t) => [t.id, t]));
  const fire = P.things.find((t) => t.kind === "bonfire"), core = P.things.find((t) => t.kind === "gate" && /^watcher:/.test(t.open || ""));
  const base = new Set(core ? [core.id] : []);
  return (raw.route?.shortcuts || []).map((s) => {
    const t = byId[s.thing], gate = s.gate ? byId[s.gate] : null;
    const from = standOf(world(P, base), t);
    const unlock = new Set(base);
    unlock.add(gate ? gate.id : t.id);
    const locked = t.mode === "drop" ? toBonfire(world(P, base, { skip: t.id }), from, fire) : toBonfire(world(P, base), from, fire);
    const unlocked = toBonfire(world(P, unlock), from, fire);
    return { id: s.id, kind: s.kind, thing: t.id, from, locked, unlocked, saved: locked - unlocked };
  });
}

export function checkRoute(raw) {
  const problems = [];
  let P;
  try { P = prepared(raw); } catch (e) { return ["prepareLevel: " + e.message]; }
  for (const w of P.warnings || []) problems.push("prepareLevel: " + w);
  for (const p of checkLevel(raw)) if (!/grass share|plateau in/.test(p)) problems.push("checkLevel: " + p);
  const byId = Object.fromEntries(P.things.map((t) => [t.id, t]));
  const lift = (r) => P.things.find((t) => t.kind === "elevator" && t.role === r);
  const entry = lift("entry"), exit = lift("exit"), fire = P.things.find((t) => t.kind === "bonfire");
  const coreGate = P.things.find((t) => t.kind === "gate" && /^watcher:/.test(t.open || ""));
  if (!entry || !exit || !fire || !coreGate) return [...problems, "missing entry, exit, bonfire or core gate"];
  const at = (t) => [t.x, t.z];

  const shut = distances(world(P), at(entry));
  if (shut.has(key(...coreGate.edge[1]))) problems.push(`seal: core gate far side ${coreGate.edge[1]} reachable with everything shut`);
  const lever = P.things.find((t) => t.kind === "lever");
  if (lever && !ringOf(world(P), lever).some((k) => shut.has(k))) problems.push(`lever ${lever.id} not reachable before the core gate`);
  if (!ringOf(world(P), fire).some((k) => shut.has(k))) problems.push("bonfire not reachable from the entry lift");

  const gateOpen = distances(world(P, new Set([coreGate.id])), at(entry));
  if (!gateOpen.has(key(...at(exit)))) problems.push("lift to lift: exit not reachable from entry with only the core gate open");
  for (const t of P.things.filter((q) => q.kind === "door" || q.kind === "ladder")) {
    const far = t.kind === "door" ? t.edge[1] : [t.x, t.z];
    if (!gateOpen.has(key(...far))) problems.push(`shortcut ${t.id}: far side ${far} never reachable`);
  }

  for (const s of routeDistances(raw)) {
    if (!(s.unlocked < Infinity)) problems.push(`shortcut ${s.id}: no way back to the bonfire once unlocked`);
    else if (!(s.saved >= SAVE_STEPS && s.unlocked <= s.locked * (1 - SAVE_SHARE))) problems.push(`shortcut ${s.id}: saves ${s.saved} steps (${s.locked} -> ${s.unlocked})`);
  }

  const L0 = world(P);
  for (const t of P.things) {
    if (t.kind === "door") {
      const [a, b] = t.edge, dir = Object.keys(DIRS).find((d) => a[0] + DIRS[d][0] === b[0] && a[1] + DIRS[d][1] === b[1]);
      if (!dir) { problems.push(`door ${t.id}: edge cells not adjacent`); continue; }
      const L1 = world(P, new Set([t.id]));
      if (canStep(L0, ...a, dir) || canStep(L0, ...b, Object.keys(DIRS).find((d) => DIRS[d][0] === -DIRS[dir][0] && DIRS[d][1] === -DIRS[dir][1]))) problems.push(`door ${t.id}: passable while shut`);
      if (!canStep(L1, ...a, dir)) problems.push(`door ${t.id}: not passable once open`);
    }
    if (t.kind === "ladder") {
      const [top, bot] = ladderEnds(t), up = Object.keys(DIRS).find((d) => DIRS[d][0] === top[0] - bot[0] && DIRS[d][1] === top[1] - bot[1]);
      const down = Object.keys(DIRS).find((d) => DIRS[d][0] === -DIRS[up][0] && DIRS[d][1] === -DIRS[up][1]);
      const hTop = P.cells[top[1]][top[0]].h, hBot = P.cells[bot[1]][bot[0]].h;
      if (hTop - hBot < 2) problems.push(`ladder ${t.id}: drop of ${hTop - hBot} tier, needs 2`);
      if (canStep(L0, ...bot, up)) problems.push(`ladder ${t.id}: climbable from below while ${t.mode === "drop" ? "a drop" : "up"}`);
      if (t.mode === "drop") { if (!canStep(L0, ...top, down)) problems.push(`drop ${t.id}: cannot drop from the top`); }
      else {
        if (canStep(L0, ...top, down)) problems.push(`ladder ${t.id}: usable before it is kicked`);
        const L1 = world(P, new Set([t.id]));
        if (!canStep(L1, ...top, down) || !canStep(L1, ...bot, up)) problems.push(`ladder ${t.id}: not two-way once kicked`);
      }
    }
    if (t.kind === "gate" && /^lever:/.test(t.open || "")) {
      const [a, b] = t.edge, dir = Object.keys(DIRS).find((d) => a[0] + DIRS[d][0] === b[0] && a[1] + DIRS[d][1] === b[1]);
      if (canStep(L0, ...a, dir)) problems.push(`gate ${t.id}: passable before its lever`);
      if (!byId[t.open.split(":")[1]]) problems.push(`gate ${t.id}: lever ${t.open} missing`);
    }
  }

  const all = new Set(P.things.map((t) => t.id));
  const Lall = world(P, all);
  const everywhere = distances(Lall, at(entry));
  const path = [];
  P.cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) path.push([x, z]); }));
  if (!path.length) problems.push("no path cells");
  const pathSet = new Set(path.map((c) => key(...c)));
  const decorOn = new Set();
  for (const d of raw.decor || []) for (const m of maskCells(d.t, d.x, d.z, d.rot || 0)) if (pathSet.has(key(m.x, m.z))) decorOn.add(`${d.t}@${m.x},${m.z}`);
  for (const k of decorOn) problems.push(`decor on path: ${k}`);
  for (const [x, z] of path) if (!isWalkable(Lall, x, z)) problems.push(`path cell ${x},${z} not walkable`);
  if (path.length) {
    const seen = new Set([key(...path[0])]), q = [path[0]];
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      const next = Object.keys(DIRS).filter((dir) => canStep(Lall, x, z, dir)).map((dir) => [x + DIRS[dir][0], z + DIRS[dir][1]]);
      const jump = Lall.pads?.get(key(x, z));
      if (jump) next.push(jump);
      for (const n of next) {
        const k = key(...n);
        if (!pathSet.has(k) || seen.has(k)) continue;
        seen.add(k); q.push(n);
      }
    }
    if (seen.size !== path.length) problems.push(`path not one connected route: ${seen.size} of ${path.length} cells joined, first loose ${path.find((c) => !seen.has(key(...c)))}`);
  }
  for (const [x, z] of path) if (!everywhere.has(key(x, z))) problems.push(`path cell ${x},${z} unreachable`);
  if (Math.max(Math.abs(fire.x - raw.spawn[0]), Math.abs(fire.z - raw.spawn[1])) > 3) problems.push(`bonfire ${fire.x},${fire.z} more than three cells from spawn ${raw.spawn}`);
  return problems;
}

export function padSafeSlots(raw) {
  const P = prepared(raw), entry = P.things.find((t) => t.kind === "elevator" && t.role === "entry");
  const pads = P.things.filter((t) => t.kind === "pad" && t.role !== "shortcut" && t.role !== "reward");
  const slots = raw.route?.trapSlots || [];
  if (!entry || !pads.length) return slots;
  const all = new Set(P.things.map((t) => t.id));
  return slots.filter((slot) => {
    const L = world(P, all);
    for (const [x, z] of slot.cells) L.blocked.add(key(x, z));
    const d = distances(L, [entry.x, entry.z]);
    return pads.every((t) => d.has(key(t.x, t.z)));
  });
}
