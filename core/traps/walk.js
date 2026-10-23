import { prepareLevel, DIRS, isWalkable, neighbours, canStep } from "../level.js";
import { createActor } from "../actor.js";
import { createHealth } from "../health.js";
import { createLife, bonfireRestCell } from "../life.js";
import { edgeKey, padLinks, PAD_COST } from "../interact.js";
import { inkStep, DASH_S, RUSH } from "../powers.js";
import { createTraps, trapCells } from "./index.js";
import { KINDS } from "./kinds.js";
import { slipOf } from "../layout/check.js";
import { TRAP_BY_ID } from "./catalog.js";

const MOVES = new Set(["rewind", "boing", "slip", "hic", "carry", "gust", "kick", "fling"]);
export const WALK = { dt: 1 / 60, deaths: 14, life: 150, stuck: 6, avoid: 40, offPath: 0.5, loop: 12, moved: 2.5, jitter: 5 };
export const DEATH_BAND = [
  { upto: 2, deaths: [2, 3] },
  { upto: 4, deaths: [3, 4] },
  { upto: 8, deaths: [3, 5] },
  { upto: 12, deaths: [4, 6] },
];
export const deathBandFor = (position) => (position == null ? null : (DEATH_BAND.find((b) => position <= b.upto) || DEATH_BAND[DEATH_BAND.length - 1]).deaths);

const key = (x, z) => x + "," + z;
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const quiet = (raw) => { const w = console.warn; console.warn = () => {}; try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = w; } };
const harmful = (kind) => { const h = TRAP_BY_ID[kind]?.health; return !!h && h !== "none"; };
export const classOf = (kind) => KINDS[kind]?.cls || null;

function route(V, pads, from, to, cost, slip = null) {
  const goal = key(to[0], to[1]), dist = new Map([[key(from[0], from[1]), 0]]), prev = new Map(), open = [[0, from[0], from[1]]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [d, x, z] = open.splice(bi, 1)[0], k = key(x, z);
    if (d > dist.get(k)) continue;
    if (k === goal) break;
    const next = neighbours(V, x, z).map(([nx, nz, dir]) => {
      if (slip?.(nx, nz) && canStep(V, nx, nz, dir)) { const d = DIRS[dir]; return [nx + d[0], nz + d[1], 2 + cost(nx + d[0], nz + d[1]), false]; }
      return [nx, nz, 1 + cost(nx, nz), false];
    });
    const j = pads.get(k);
    if (j && isWalkable(V, j[0], j[1])) next.push([j[0], j[1], PAD_COST, true]);
    for (const [nx, nz, c, hop] of next) {
      const nk = key(nx, nz), nd = d + c;
      if (nd < (dist.get(nk) ?? Infinity)) { dist.set(nk, nd); prev.set(nk, { k, hop }); open.push([nd, nx, nz]); }
    }
  }
  if (!dist.has(goal)) return null;
  const segs = [[]];
  for (let k = goal; prev.has(k); k = prev.get(k).k) {
    segs[0].unshift(k.split(",").map(Number));
    if (prev.get(k).hop) segs.unshift([]);
  }
  return segs;
}

export function walkGoals(L) {
  const gate = (L.things || []).find((t) => t.kind === "gate" && /^watcher:/.test(String(t.open || "")));
  const exit = (L.things || []).find((t) => t.kind === "elevator" && t.role === "exit");
  const goals = [];
  if (gate?.threshold?.length) goals.push(gate.threshold[0].slice());
  if (exit) goals.push(isWalkable(L, exit.x, exit.z) ? [exit.x, exit.z] : Object.values(DIRS).map(([dx, dz]) => [exit.x + dx, exit.z + dz]).filter(([x, z]) => isWalkable(L, x, z)));
  return goals;
}

function openCore(L) {
  for (const t of L.things || []) {
    if (t.kind !== "gate" || !/^watcher:/.test(String(t.open || ""))) continue;
    if (t.edge) L.edges.delete(edgeKey(t.edge[0], t.edge[1]));
    for (const [x, z] of t.blocks || []) if (t.hold) L.blocked.delete(key(x, z));
  }
}

export function walkIsland(raw, { cls = "wanderer", knows = null, full = false, jitter = 0, trace = false } = {}) {
  const L = quiet(raw);
  openCore(L);
  const goals = walkGoals(L);
  const start = raw.spawn.slice();
  const actor = createActor(L, start);
  const health = createHealth({ storage: mem() });
  let traps = null, lit = false, rush = 0, killer = null, lastHit = null;
  const params = { class: cls };
  const life = createLife({ level: L, actor, health, variant: "pause", random: () => 0, onRespawn: () => traps?.reset() });
  traps = L.traps?.length ? createTraps(L, { actor, life, health, storage: mem(), params, power: () => ({ cls: params.class, lit }) }) : null;
  const out = { deaths: 0, hearts: 0, kills: [], time: 0, done: false, stuck: null, cls, swaps: 0, killCells: new Set() };
  if (!goals.length) { out.stuck = "no core gate or exit lift"; return out; }
  if (traps) {
    const ctx = traps.ctx;
    for (const k of ["hurt", "knock", "fling"]) {
      const f = ctx[k];
      ctx[k] = (...a) => { const t = k === "fling" ? a[2] : a[0]; if (t?.kind) lastHit = t; return f(...a); };
    }
  }
  const learned = new Set(), gates = new Set(), timed = new Set();
  let mover = null;
  traps?.on((e) => { if (MOVES.has(e.type)) mover = { t: e.trap, at: out.time }; });
  const learnTrap = (t) => {
    const k = KINDS[t.kind];
    if (k?.cls) { gates.add(t.id); return; }
    if (k?.unsafe) { timed.add(t.id); return; }
    for (const c of k?.learn ? k.learn(t) : trapCells(t)) learned.add(key(c[0], c[1]));
  };
  if (knows && traps) for (const t of traps.list) if (knows(t)) { learnTrap(t); if (full && !KINDS[t.kind]?.cls && !KINDS[t.kind]?.unsafe) for (const c of KINDS[t.kind]?.danger ? KINDS[t.kind].danger(t) : trapCells(t)) learned.add(key(c[0], c[1])); }
  life.on((e) => {
    if (e.type === "hurt") { out.hearts += e.n; if (lastHit) killer = lastHit; }
    if (e.type === "fall" || e.type === "knock" || e.type === "flop") {
      out.deaths++;
      const t = e.type === "flop" ? killer || lastHit : lastHit;
      const f = [Math.floor(actor.pos.x), Math.floor(actor.pos.z)];
      out.killCells.add(key(f[0], f[1]));
      out.kills.push({ type: e.type, kind: t?.kind || null, id: t?.id || null, cause: e.cause || null, at: f, t: +out.time.toFixed(2) });
      if (t) learnTrap(t);
      if (mover && out.time - mover.at < WALK.moved && mover.t !== t && TRAP_BY_ID[mover.t.kind]?.tier !== "debuff") learnTrap(mover.t);
    }
    if (e.type === "respawn") { killer = null; lastHit = null; lit = false; rush = 0; }
  });
  const slip = slipOf(L);
  const avoidCost = (x, z) => {
    const t = traps?.at([x, z]);
    return (t && (t.revealed || full) && !t.disarmed && !classOf(t.kind) ? WALK.avoid : 0) + (L.cells[z]?.[x]?.p ? 0 : WALK.offPath);
  };
  const pads = padLinks(L.things, new Set());
  const plan = (to) => {
    const V = { ...L, blocked: new Set([...L.blocked, ...[...learned].filter((k) => k !== key(to[0], to[1]) && k !== key(actor.cell[0], actor.cell[1]))]) };
    return route(V, pads, actor.cell, to, avoidCost, slip);
  };
  const visits = new Map();
  let gi = 0, lifeT = 0, idle = 0, held = 0, lastCell = key(...actor.cell), segs = [];
  const hop = (to) => { actor.cell = to.slice(); actor.pos.x = to[0] + 0.5; actor.pos.z = to[1] + 0.5; };
  const step = (dt) => {
    actor.update(dt);
    const scale = rush > 0 ? RUSH.scale : 1;
    if (rush > 0) rush = Math.max(0, rush - dt);
    traps?.update(dt * scale);
    life.update(dt);
    out.time += dt;
  };
  const pick = (g) => {
    if (!Array.isArray(g[0])) return g;
    let best = null;
    for (const c of g) { const p = plan(c); const n = p && p.flat().length; if (p && (!best || n < best.n)) best = { n, c }; }
    return best ? best.c : g[0];
  };
  let queue = [], segEnd = null;
  const near1 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  const dirTo = (a, b) => Object.keys(DIRS).find((q) => DIRS[q][0] === b[0] - a[0] && DIRS[q][1] === b[1] - a[1]);
  const live = () => (traps?.list || []).filter((t) => !t.disarmed);
  while (gi < goals.length && out.deaths < WALK.deaths) {
    const goal = pick(goals[gi]);
    const free = !life.busy && !actor.locked;
    if (!free) { segs = []; queue = []; }
    const idleNow = free && !actor.path.length && !actor.moving;
    if (idleNow && same(actor.cell, goal) && !queue.length) { gi++; continue; }
    let hold = false;
    if (idleNow) {
      if (queue.length && !near1(actor.cell, queue[0])) queue = [];
      if (!queue.length) {
        if (segs.length && !same(actor.cell, segEnd)) segs = [];
        if (segs.length) { const sg = segs.shift(); hop(sg[0]); queue = sg.slice(1); segEnd = sg[sg.length - 1]; }
        else {
          const p = plan(goal);
          if (!p) { out.stuck = `no way to ${goal} from ${actor.cell}`; break; }
          queue = p[0].slice(same(p[0][0], actor.cell) ? 1 : 0);
          segEnd = p[0].length ? p[0][p[0].length - 1] : actor.cell.slice();
          segs = p.slice(1);
        }
      }
      const n = queue[0];
      if (n) {
        const on = live().filter((t) => trapCells(t).some((c) => same(c, n)));
        for (const t of on) {
          const k = KINDS[t.kind];
          if (!gates.has(t.id)) continue;
          if (params.class !== k.cls) { params.class = k.cls; out.swaps++; }
          if (k.cls === "nm") lit = true;
          if (k.cls === "aws" && !health.warded) health.ward(true);
          if (k.cls === "dutchie" && rush <= 0) rush = RUSH.secs;
        }
        const scale = rush > 0 ? RUSH.scale : 1, from = (0.5 / actor.speed - 2 * WALK.dt) * scale, to = (1.5 / actor.speed + 3 * WALK.dt) * scale;
        const waits = live().filter((t) => KINDS[t.kind].unsafe && (timed.has(t.id) || gates.has(t.id)));
        if (waits.some((t) => KINDS[t.kind].unsafe(t, n, traps.ctx, from, to))) { hold = true; held = 0; }
        else if (held < jitter && waits.some((t) => trapCells(t).some((c) => same(c, n)))) { hold = true; held++; }
        if (!hold && knows) {
          const hic = live().find((t) => t.kind === "t39" && t.on && t.left === 1);
          const beyond = [2 * n[0] - actor.cell[0], 2 * n[1] - actor.cell[1]];
          if (hic && learned.has(key(...beyond)) && isWalkable(L, beyond[0], beyond[1])) {
            const alt = Object.values(DIRS).map(([dx, dz]) => [actor.cell[0] + dx, actor.cell[1] + dz]).find((m) => !same(m, n) && isWalkable(L, m[0], m[1]) && !learned.has(key(...m)) && !learned.has(key(2 * m[0] - actor.cell[0], 2 * m[1] - actor.cell[1])) && canStep(L, actor.cell[0], actor.cell[1], dirTo(actor.cell, m)));
            if (alt) { queue = [alt]; segs = []; }
          }
        }
        const ink = on.find((t) => gates.has(t.id) && KINDS[t.kind].cls === "wanderer");
        if (ink && !hold) {
          const r = inkStep(L, actor.cell, dirTo(actor.cell, n));
          if (r.to) {
            traps.skip([r.mid], DASH_S + 0.5);
            const at = queue.findIndex((c) => same(c, r.to));
            queue = at >= 0 ? queue.slice(at + 1) : [];
            for (let i = 0; i < Math.round(DASH_S / WALK.dt); i++) step(WALK.dt);
            hop(r.to);
            hold = true;
          }
        }
        if (!hold) actor.path = [queue.shift()];
      }
    }
    step(WALK.dt);
    if (trace && Math.round(out.time / WALK.dt) % 6 === 0) console.log(`t ${out.time.toFixed(1)} cell ${actor.cell} goal ${goal} path ${actor.path.length} busy ${life.busy} locked ${actor.locked} slide ${actor.slide}`);
    lifeT = life.busy ? 0 : lifeT + WALK.dt;
    const ck = key(...actor.cell);
    if (ck !== lastCell || life.busy || hold) { if (ck !== lastCell) { visits.set(ck, (visits.get(ck) || 0) + 1); if (visits.get(ck) > WALK.loop) { out.stuck = `walks in circles at ${ck}`; break; } } idle = 0; lastCell = ck; } else idle += WALK.dt;
    if (life.busy) visits.clear();
    if (idle > WALK.stuck) { out.stuck = `stuck at ${actor.cell} toward ${goal}`; break; }
    if (lifeT > WALK.life) { out.stuck = `one life ran past ${WALK.life} s`; break; }
  }
  out.done = gi >= goals.length;
  out.killCells = [...out.killCells];
  traps?.dispose();
  return out;
}

export function mindlessWalk(raw, opts = {}) {
  return walkIsland(raw, { ...opts, knows: null });
}

export function memorizedWalk(raw, opts = {}) {
  return walkIsland(raw, { ...opts, knows: (t) => harmful(t.kind) || !!KINDS[t.kind]?.cls || !!KINDS[t.kind]?.unsafe, full: true });
}

export function walkReport(raw, { position = null } = {}) {
  const runs = [{ cls: "wanderer", mind: mindlessWalk(raw), sure: memorizedWalk(raw), late: memorizedWalk(raw, { jitter: WALK.jitter }) }];
  const band = deathBandFor(position);
  const problems = [];
  for (const r of runs) {
    if (!r.mind.done) problems.push(`mindless walk never reaches the exit lift: ${r.mind.stuck || `${r.mind.deaths} deaths`}`);
    else if (band && (r.mind.deaths < band[0] || r.mind.deaths > band[1])) problems.push(`mindless walk dies ${r.mind.deaths} times, island ${position} wants ${band[0]} to ${band[1]}`);
    for (const [name, w] of [["memorized walk", r.sure], [`memorized walk ${WALK.jitter} frames late`, r.late]]) {
      if (!w.done) problems.push(`${name} never reaches the exit lift: ${w.stuck || `${w.deaths} deaths`}`);
      else if (w.deaths) problems.push(`${name} dies ${w.deaths} times: ${w.kills.map((k) => `${k.id || k.cause} at ${k.at}`).join(", ")}`);
    }
  }
  return { runs, band, problems };
}

export function walkPath(raw, { blocked = [] } = {}) {
  const L = quiet(raw);
  openCore(L);
  for (const [x, z] of blocked) L.blocked.add(key(x, z));
  const pads = padLinks(L.things, new Set());
  const slip = slipOf(L);
  const goals = walkGoals(L);
  let at = raw.spawn.slice();
  const out = [at.slice()];
  for (const g of goals) {
    let best = null;
    for (const c of Array.isArray(g[0]) ? g : [g]) { const s = route(L, pads, at, c, (x, z) => (L.cells[z]?.[x]?.p ? 0 : WALK.offPath), slip); const n = s && s.flat().length; if (s && (!best || n < best.n)) best = { n, s, c }; }
    if (!best) return null;
    for (const seg of best.s) for (const c of seg) if (!same(c, out[out.length - 1])) out.push(c.slice());
    at = best.c;
  }
  return out;
}
