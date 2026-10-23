import { TRAP_BY_ID } from "./catalog.js";
import { KINDS } from "./kinds.js";
import { surfaceHeight, isWalkable, isVoid } from "../level.js";
import { createTiles } from "../tiles.js";

export { TRAP_CATALOG, TRAP_BY_ID } from "./catalog.js";
export { KINDS } from "./kinds.js";

const key = (x, z) => x + "," + z;
const cellOf = (c) => (Array.isArray(c) ? c : null);

export const trapStorageKey = (name) => "isoworld:traps:" + (name || "level");

export function trapCells(t) {
  const k = KINDS[t.kind];
  return (k?.cells ? k.cells(t) : t.cells) || [];
}

export function normalizeTrap(t, i = 0) {
  const meta = TRAP_BY_ID[t.kind];
  if (!meta) return null;
  return { ...t, id: t.id || `${t.kind}-${i}`, meta };
}

export function createTraps(level, { actor, life = null, health = null, things = null, storage = globalThis.localStorage, params = {}, say = null, rotate = null, lockCamera = null, yaw = null, power = null } = {}) {
  const list = (level.traps || []).map(normalizeTrap).filter(Boolean);
  const byId = Object.fromEntries(list.map((t) => [t.id, t]));
  const skey = trapStorageKey(level.name);
  const read = () => { try { return JSON.parse(storage?.getItem(skey) || "null") || {}; } catch { return {}; } };
  const write = (v) => { try { storage?.setItem(skey, JSON.stringify(v)); } catch {} };
  if (params.reset === "1") { try { storage?.removeItem(skey); } catch {} }
  const saved = read();
  const disarmed = new Set(Array.isArray(saved.disarmed) ? saved.disarmed : []);
  const listeners = new Set();
  const index = new Map();
  const skips = new Map();
  let time = 0, floor = null, prev = null;
  const emit = (e) => { for (const f of [...listeners]) f(e); };
  const floorCell = () => [Math.floor(actor.pos.x), Math.floor(actor.pos.z)];
  const skipped = (c) => { const e = skips.get(key(c[0], c[1])); return e != null && e > time; };
  const airborne = (c) => !!actor.airborne || skipped(c);
  const tiles = createTiles(level);
  const ctx = {
    level, actor, things, health, life, tiles,
    get time() { return time; },
    floor: () => floor,
    prev: () => prev,
    on: (c) => !!floor && floor[0] === c[0] && floor[1] === c[1] && !airborne(c) && !actor.fx,
    onAny: (cells) => cells.some((c) => ctx.on(c)),
    hurt: (t, n = 1, opts = {}) => life?.hurt(n, { cause: t.kind, ...opts }),
    knock: (t, dir) => life?.knock(dir, t.kind),
    drop: (t, c) => life?.knock([0, 0], t.kind, { ride: c }),
    emit: (t, type, extra = {}) => emit({ type, trap: t, ...extra }),
    say: (text) => { if (text) (say || things?.say)?.(text); },
    reveal: (t) => api.reveal(t.id),
    rotate: (step) => rotate?.(step),
    lockCamera: (on) => lockCamera?.(on),
    yaw: () => (yaw ? yaw() : 45),
    power: () => power?.() || {},
    skipped: (c) => skipped(c),
    sink: (c, on) => {
      const k = key(c[0], c[1]);
      if (on) { if (!sunk.has(k)) { sunk.set(k, level.cells[c[1]][c[0]]); level.cells[c[1]][c[0]] = { h: 0, s: "none" }; } }
      else if (sunk.has(k)) { level.cells[c[1]][c[0]] = sunk.get(k); sunk.delete(k); }
    },
    block: (c, on) => { if (on) level.blocked.add(key(c[0], c[1])); else level.blocked.delete(key(c[0], c[1])); },
    solve: (t) => things?.solve?.(t.id),
    void: (c) => isVoid(level, c[0], c[1]),
    fling: (to, dur = 0.5, t = null) => {
      actor.path = [];
      actor.tapDir = null;
      actor.moving = false;
      actor.locked = true;
      actor.fx = { kind: "hop", t: 0, dur, from: [actor.pos.x, actor.pos.z], to: [to[0], to[1]], cause: t?.kind || null };
      hop = actor.fx;
    },
  };
  let hop = null;
  const sunk = new Map();
  const offThings = things?.on?.((e) => { for (const t of list) if (!t.disarmed && t.impl?.thing) t.impl.thing(t, e, ctx); });
  const stepHop = (dt) => {
    if (!hop) return;
    if (actor.fx !== hop) { hop = null; return; }
    hop.t = Math.min(hop.dur, hop.t + dt);
    const u = hop.t / hop.dur;
    actor.pos.x = hop.from[0] + (hop.to[0] + 0.5 - hop.from[0]) * u;
    actor.pos.z = hop.from[1] + (hop.to[1] + 0.5 - hop.from[1]) * u;
    hop.lift = Math.sin(Math.PI * u) * 0.9;
    actor.y = surfaceHeight(level, actor.pos.x, actor.pos.z);
    if (hop.t >= hop.dur) {
      const h = hop;
      actor.fx = null;
      actor.locked = false;
      hop = null;
      if (!isWalkable(level, h.to[0], h.to[1]) && isVoid(level, h.to[0], h.to[1])) {
        const d = [Math.sign(h.to[0] + 0.5 - h.from[0]), Math.sign(h.to[1] + 0.5 - h.from[1])];
        const dir = d[0] ? (d[0] > 0 ? "e" : "w") : d[1] > 0 ? "s" : "n";
        if (life?.fall) { life.fall(dir, { forced: true, cause: h.cause || "push" }); return; }
      }
      actor.cell = [h.to[0], h.to[1]];
    }
  };
  const hydrate = (t) => {
    t.disarmed = disarmed.has(t.id);
    t.revealed = t.meta.visibility !== "hidden";
    t.impl = KINDS[t.kind] || null;
    t.cells = t.cells || [];
    t.footprint = trapCells(t);
  };
  const slick = (level.slick = new Set());
  const syncSlick = () => {
    slick.clear();
    for (const t of list) if (t.impl?.slick && !t.disarmed) for (const [x, z] of t.cells) slick.add(key(x, z));
  };
  actor.slick = (x, z) => slick.has(key(x, z));
  for (const t of list) {
    hydrate(t);
    for (const [x, z] of t.footprint) {
      const k = key(x, z);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(t);
    }
    t.impl?.init?.(t, ctx);
  }
  syncSlick();
  const pushers = list.filter((t) => t.impl?.push);
  if (pushers.length) actor.push = (dir) => pushers.some((t) => !t.disarmed && t.impl.push(t, dir, ctx));
  const pick = (ref) => {
    if (ref && typeof ref === "object" && !Array.isArray(ref)) return byId[ref.id] || null;
    if (typeof ref === "string") return byId[ref] || null;
    const c = cellOf(ref);
    return c ? (index.get(key(c[0], c[1])) || [])[0] || null : null;
  };
  const view = (t) => t && { id: t.id, kind: t.kind, name: t.meta.name, tier: t.meta.tier, trigger: t.meta.trigger, visibility: t.meta.visibility, health: t.meta.health, cells: t.footprint.map((c) => c.slice()), revealed: !!t.revealed, disarmed: !!t.disarmed, live: !!t.impl };
  const api = {
    list,
    byId,
    ctx,
    tiles,
    get time() { return time; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    at(cell) { return view(pick(cell)); },
    all() { return list.map(view); },
    reveal(ref) {
      const t = pick(ref);
      if (!t || t.revealed) return false;
      t.revealed = true;
      t.impl?.reveal?.(t, ctx);
      emit({ type: "reveal", trap: t });
      return true;
    },
    disarm(ref) {
      const t = pick(ref);
      if (!t || t.disarmed) return false;
      t.disarmed = true;
      t.revealed = true;
      disarmed.add(t.id);
      write({ ...read(), disarmed: [...disarmed] });
      t.impl?.disarm?.(t, ctx);
      syncSlick();
      emit({ type: "disarm", trap: t });
      return true;
    },
    skip(cells, seconds = 1) {
      const cs = Array.isArray(cells?.[0]) ? cells : [cells];
      for (const c of cs) if (cellOf(c)) skips.set(key(c[0], c[1]), time + seconds);
      return true;
    },
    reset() {
      for (const t of list) {
        t.revealed = t.disarmed || t.meta.visibility !== "hidden";
        if (!t.disarmed) t.impl?.reset?.(t, ctx);
      }
      emit({ type: "reset" });
    },
    rest() {
      for (const t of list) if (typeof t.impl?.rest === "function") t.impl.rest(t, ctx);
      emit({ type: "rest" });
    },
    update(dt) {
      time += dt;
      stepHop(dt);
      tiles.update(dt);
      for (const [k, e] of skips) if (e <= time) skips.delete(k);
      const f = floorCell();
      if (!floor || f[0] !== floor[0] || f[1] !== floor[1]) {
        prev = floor;
        floor = f;
        if (!actor.fx && !airborne(f)) for (const t of index.get(key(f[0], f[1])) || []) if (!t.disarmed) t.impl?.enter?.(t, f, prev, ctx);
      }
      for (const t of list) if (!t.disarmed) t.impl?.update?.(t, dt, ctx);
    },
    dispose() {
      for (const t of list) t.impl?.dispose?.(t, ctx);
      offThings?.();
      for (const k of [...sunk.keys()]) { const [x, z] = k.split(",").map(Number); ctx.sink([x, z], false); }
      tiles.dispose();
      slick.clear();
      if (actor.slick) actor.slick = null;
      if (pushers.length) actor.push = null;
      listeners.clear();
    },
  };
  return api;
}
