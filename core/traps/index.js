import { TRAP_BY_ID } from "./catalog.js";
import { KINDS } from "./kinds.js";

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

export function createTraps(level, { actor, life = null, health = null, things = null, storage = globalThis.localStorage, params = {}, say = null } = {}) {
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
  const ctx = {
    level, actor, things, health, life,
    get time() { return time; },
    floor: () => floor,
    prev: () => prev,
    on: (c) => !!floor && floor[0] === c[0] && floor[1] === c[1] && !airborne(c) && !actor.fx,
    onAny: (cells) => cells.some((c) => ctx.on(c)),
    hurt: (t, n = 1, opts = {}) => life?.hurt(n, { cause: t.kind, ...opts }),
    knock: (t, dir) => life?.knock(dir, t.kind),
    emit: (t, type, extra = {}) => emit({ type, trap: t, ...extra }),
    say: (text) => { if (text) (say || things?.say)?.(text); },
    reveal: (t) => api.reveal(t.id),
  };
  const hydrate = (t) => {
    t.disarmed = disarmed.has(t.id);
    t.revealed = t.meta.visibility !== "hidden";
    t.impl = KINDS[t.kind] || null;
    t.cells = trapCells(t);
  };
  for (const t of list) {
    hydrate(t);
    for (const [x, z] of t.cells) {
      const k = key(x, z);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(t);
    }
    t.impl?.init?.(t, ctx);
  }
  const pick = (ref) => {
    if (ref && typeof ref === "object" && !Array.isArray(ref)) return byId[ref.id] || null;
    if (typeof ref === "string") return byId[ref] || null;
    const c = cellOf(ref);
    return c ? (index.get(key(c[0], c[1])) || [])[0] || null : null;
  };
  const view = (t) => t && { id: t.id, kind: t.kind, name: t.meta.name, tier: t.meta.tier, trigger: t.meta.trigger, visibility: t.meta.visibility, health: t.meta.health, cells: t.cells.map((c) => c.slice()), revealed: !!t.revealed, disarmed: !!t.disarmed, live: !!t.impl };
  const api = {
    list,
    byId,
    ctx,
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
    update(dt) {
      time += dt;
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
      listeners.clear();
    },
  };
  return api;
}
