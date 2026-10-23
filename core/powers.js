import { DIRS, cellAt, isWalkable, edgeClosed, surfaceHeight } from "./level.js";
import { reachable } from "./path.js";

export const CLASS_IDS = ["wanderer", "aws", "dutchie", "nm"];
const ALIAS = { wretch: "wanderer" };
export const CLASS_KEY = "isoworld:class";

export const POWERS = {
  wanderer: { id: "ink-step", name: "Ink Step", hero: "Wretch", hint: "Dash two cells ahead" },
  aws: { id: "ward", name: "Ward", hero: "Gatekeeper", hint: "Absorb the next harmful trap" },
  dutchie: { id: "rush", name: "Rush", hero: "Courier", hint: "Slow the world to half speed for 4 s" },
  nm: { id: "lantern", name: "Lantern", hero: "Modernizer", oil: true, hint: "Light the lantern to show traps nearby" },
};

export const DASH_S = 0.2, AVOID_COST = 40;
export const CHARGES = { cap: 3 };
export const OIL = { flask: 20, cap: 3, need: 2 };
export const fullCharges = () => ({ wanderer: CHARGES.cap, aws: CHARGES.cap, dutchie: CHARGES.cap, nm: OIL.flask * OIL.cap });
export const LANTERN_R = 2;
export const RUSH = { secs: 4, scale: 0.5, ease: 0.35, out: 0.5 };
export const TAP_WALK = "all";
export const tapWalkMode = (params = {}) => (params.tapwalk === "courier" || params.tapwalk === "all" ? params.tapwalk : TAP_WALK);
const smooth = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
export const POWER_KEY = "isoworld:power";
export const pickupKey = (name) => "isoworld:pickups:" + (name || "level");

export function powerClass(params = {}, storage = globalThis.localStorage) {
  let v = params.class;
  if (v == null) try { v = storage?.getItem(CLASS_KEY); } catch {}
  v = ALIAS[v] || v;
  return CLASS_IDS.includes(v) ? v : "wanderer";
}

export function facingDir(facing) {
  const a = ((facing % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return ["s", "e", "n", "w"][Math.round(a / (Math.PI / 2)) % 4];
}

const key = (x, z) => x + "," + z;

export function inkStep(L, from, dir) {
  const d = DIRS[dir];
  if (!d) return { why: "No direction to jump." };
  const [ax, az] = from, cA = cellAt(L, ax, az);
  const mid = [ax + d[0], az + d[1]], to = [ax + 2 * d[0], az + 2 * d[1]];
  const cM = cellAt(L, mid[0], mid[1]), cT = cellAt(L, to[0], to[1]);
  if (!cA || cA.s === "ramp") return { why: "No footing to jump from a slope." };
  if (!cT || !isWalkable(L, to[0], to[1]) || cT.s === "ramp") return { why: "Nowhere to land." };
  if (cT.h !== cA.h && cT.h !== cA.h - 1) return { why: cT.h > cA.h ? "Too high to reach." : "Too far down." };
  if (cM && cM.h > cA.h) return { why: "A wall stands in the way." };
  if (L.blocked.has(key(mid[0], mid[1]))) return { why: "Something blocks the jump." };
  if (isWalkable(L, mid[0], mid[1]) && (edgeClosed(L, from, mid) || edgeClosed(L, mid, to))) return { why: "The way is shut." };
  if (!reachable(L, from).some((c) => c[0] === to[0] && c[1] === to[1])) return { why: "The ink will not carry you there." };
  return { mid, to, dir };
}

export function createPowers(game, { storage = globalThis.localStorage } = {}) {
  const { state } = game;
  const listeners = new Set();
  const emit = (e) => { for (const f of [...listeners]) f(e); };
  let rush = null, later = null, cls = null, pool = fullCharges(), lit = false, pending = false, hop = null, actor = null, lastCell = "", offs = [], taken = new Set(), levelName = null;
  const power = () => POWERS[cls];
  const say = (text) => state.things?.say(text);
  const save = () => { try { storage?.setItem(POWER_KEY, JSON.stringify({ cls, pool: { ...pool, nm: Math.round(pool.nm * 10) / 10 } })); } catch {} };
  const load = () => { try { return JSON.parse(storage?.getItem(POWER_KEY) || "null"); } catch { return null; } };
  const oilCap = () => OIL.flask * OIL.cap;
  const fill = () => { pool = fullCharges(); };
  const charges = () => (cls === "nm" ? 0 : pool[cls] ?? 0);
  const oilNow = () => pool.nm;
  const syncClass = () => {
    const c = powerClass(state.params);
    if (c === cls) return;
    if (cls === "aws" && state.health?.warded) state.health.ward(false);
    if (lit) { lit = false; emit({ type: "douse" }); }
    rush = null;
    const was = cls;
    cls = c;
    if (was == null) {
      const s = load();
      if (s?.pool) for (const k of CLASS_IDS) pool[k] = Math.min(k === "nm" ? oilCap() : CHARGES.cap, Math.max(0, +s.pool[k] || 0));
    }
    save();
    pending = false;
    if (actor) actor.pause = false;
    emit({ type: "class", cls });
  };
  const ready = () => {
    const p = power();
    if (p.passive) return true;
    if (p.oil) return pool.nm > 0;
    return charges() > 0 && !(cls === "aws" && state.health?.warded);
  };
  const spend = () => { pool[cls] = Math.max(0, charges() - 1); save(); emit({ type: "spend", power: power().id, charges: charges() }); };
  const busy = () => !actor || actor.locked || !!state.life?.busy || !!hop;
  const cellNow = () => actor.cell.slice();

  const doInk = () => {
    const r = inkStep(state.level, cellNow(), facingDir(actor.facing));
    if (!r.to) { say(r.why); emit({ type: "fail", power: "ink-step", why: r.why }); return false; }
    state.route.cancel();
    actor.path = []; actor.tapDir = null;
    state.traps?.skip([r.mid], DASH_S + 0.5);
    const y0 = actor.y, y1 = surfaceHeight(state.level, r.to[0] + 0.5, r.to[1] + 0.5);
    hop = { from: cellNow(), mid: r.mid, to: r.to, t: 0, y0, y1 };
    actor.pause = true;
    spend();
    emit({ type: "ink", from: hop.from, mid: r.mid, to: r.to });
    return true;
  };
  const doWard = () => {
    if (!state.health) return false;
    state.health.ward(true);
    spend();
    emit({ type: "ward" });
    return true;
  };
  const shine = () => {
    const T = state.traps;
    if (!T || !actor) return;
    const [x, z] = actor.cell;
    for (const t of T.all()) if (!t.revealed && !t.disarmed && t.cells.some((c) => Math.max(Math.abs(c[0] - x), Math.abs(c[1] - z)) <= LANTERN_R)) { T.reveal(t.id); emit({ type: "reveal", trap: t.id }); }
  };
  const toggleLantern = () => {
    if (lit) { lit = false; save(); emit({ type: "douse" }); return true; }
    lit = true;
    emit({ type: "light" });
    shine();
    return true;
  };
  const doRush = () => {
    rush = { t: 0 };
    spend();
    emit({ type: "rush" });
    return true;
  };
  const run = () => {
    if (busy()) return false;
    if (cls === "dutchie") return doRush();
    if (cls === "wanderer") return doInk();
    if (cls === "aws") return doWard();
    return false;
  };
  const give = (what) => {
    if (power().oil) {
      if (pool.nm >= oilCap() - 1e-6) return false;
      pool.nm = Math.min(oilCap(), pool.nm + OIL.flask);
    } else {
      if (charges() >= CHARGES.cap) return false;
      pool[cls] = charges() + 1;
    }
    save();
    emit({ type: "gain", what, charges: charges(), oil: pool.nm });
    return true;
  };
  const gainText = (src) => power().oil ? `${src}: an oil flask. ${Math.round(pool.nm)} s of light.` : `${src}: a power charge. ${charges()} of ${CHARGES.cap}.`;
  const pickups = () => (state.level?.charges || []).filter((c) => !taken.has(c.id));
  const readTaken = () => { try { return new Set(JSON.parse(storage?.getItem(pickupKey(state.level?.name)) || "[]")); } catch { return new Set(); } };
  const writeTaken = () => { try { storage?.setItem(pickupKey(state.level?.name), JSON.stringify([...taken])); } catch {} };
  const collect = () => {
    const [x, z] = actor.cell;
    const k = pickups().find((c) => c.x === x && c.z === z);
    if (!k) return;
    if (!give("pickup")) { say(power().oil ? "Your oil is full." : `You carry ${CHARGES.cap} charges already.`); return; }
    taken.add(k.id);
    writeTaken();
    say(gainText("Picked up"));
    emit({ type: "pickup", id: k.id, cell: [x, z] });
  };

  const api = {
    get cls() { return cls; },
    get power() { return power(); },
    get charges() { return charges(); },
    get pool() { return { ...pool }; },
    get cap() { return CHARGES.cap; },
    get oil() { return oilNow(); },
    get oilCap() { return oilCap(); },
    get lit() { return lit; },
    get ready() { return ready(); },
    get raised() { return cls === "aws" && !!state.health?.warded; },
    get hop() { return hop; },
    get pending() { return pending; },
    get pickups() { return pickups(); },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    canRoute() { syncClass(); return tapWalkMode(state.params) === "all" || cls === "dutchie"; },
    get rush() { return rush ? Math.max(0, RUSH.secs - rush.t) : 0; },
    get scale() { if (!rush) return 1; return 1 - (1 - RUSH.scale) * smooth(rush.t / RUSH.ease) * smooth((RUSH.secs - rush.t) / RUSH.out); },
    avoid(x, z) {
      const t = state.traps?.at([x, z]);
      return t && t.revealed && !t.disarmed ? AVOID_COST : 0;
    },
    give,
    fire() {
      syncClass();
      const p = power();
      if (!actor || actor.locked || state.life?.busy) return false;
      if (p.passive) { say(p.hint + "."); emit({ type: "hint", power: p.id }); return false; }
      if (p.oil) {
        if (!lit && pool.nm <= 0) { say("The lantern is dry. Rest at a bonfire to fill it."); emit({ type: "empty", power: p.id }); return false; }
        return toggleLantern();
      }
      if (cls === "aws" && state.health?.warded) { say("The ward is already raised."); emit({ type: "fail", power: p.id, why: "raised" }); return false; }
      if (cls === "dutchie" && rush) { say("Rush is already running."); emit({ type: "fail", power: p.id, why: "running" }); return false; }
      if (charges() <= 0) { say(`No charges for ${p.name}. Rest at a bonfire to refill.`); emit({ type: "empty", power: p.id }); return false; }
      if (hop) return false;
      if (cls === "dutchie") return busy() ? false : doRush();
      if (actor.path.length || actor.moving) { pending = true; actor.pause = true; state.route.cancel(); return true; }
      return run();
    },
    refill(why = "rest") {
      syncClass();
      fill();
      save();
      emit({ type: "refill", why, charges: charges(), oil: pool.nm });
    },
    reset() { fill(); save(); emit({ type: "refill", why: "reset", charges: charges(), oil: pool.nm }); },
    bind() {
      for (const f of offs) f();
      offs = [];
      actor = state.actor;
      pending = false; hop = null;
      if (actor) actor.pause = false;
      lastCell = actor ? key(actor.cell[0], actor.cell[1]) : "";
      syncClass();
      if (state.level?.name !== levelName) { levelName = state.level?.name; if (lit) { lit = false; emit({ type: "douse" }); } }
      if (state.params.reset === "1") { try { storage?.removeItem(pickupKey(state.level?.name)); } catch {} }
      taken = readTaken();
      const t = state.things?.on?.((e) => {
        if (e.type === "lit" || e.type === "rest") api.refill();
        if (e.type === "open" && e.thing?.kind === "chest" && give("chest")) later = gainText("Found in the chest");
      });
      if (t) offs.push(t);
      const l = state.life?.on?.((e) => { if (e.type === "respawn") { hop = null; pending = false; if (actor) actor.pause = false; lastCell = key(actor.cell[0], actor.cell[1]); if (lit) { lit = false; emit({ type: "douse" }); } api.refill("respawn"); } });
      if (l) offs.push(l);
      const h = state.health?.on?.((e) => { if (cls === "aws" && e.type === "absorb") emit({ type: "absorb" }); });
      if (h) offs.push(h);
      emit({ type: "bind" });
    },
    update(dt) {
      if (!actor || actor !== state.actor) return;
      syncClass();
      if (later) { say(later); later = null; }
      if (lit) {
        pool.nm = Math.max(0, pool.nm - dt);
        shine();
        if (pool.nm <= 0) { lit = false; say("The lantern gutters out."); emit({ type: "douse", dry: true }); }
        if (Math.floor(pool.nm) !== Math.floor(pool.nm + dt)) save();
      }
      if (rush) {
        rush.t += dt;
        if (rush.t >= RUSH.secs) { rush = null; emit({ type: "rush-end" }); }
      }
      if (hop) {
        hop.t = Math.min(DASH_S, hop.t + dt);
        const e = hop.t / DASH_S;
        actor.pos.x = hop.from[0] + 0.5 + (hop.to[0] - hop.from[0]) * e;
        actor.pos.z = hop.from[1] + 0.5 + (hop.to[1] - hop.from[1]) * e;
        actor.y = hop.y0 + (hop.y1 - hop.y0) * e;
        actor.moving = false;
        if (hop.t >= DASH_S) {
          actor.cell = hop.to.slice();
          actor.pos.x = hop.to[0] + 0.5; actor.pos.z = hop.to[1] + 0.5; actor.y = hop.y1;
          lastCell = "";
          emit({ type: "land", cell: hop.to.slice() });
          hop = null;
          actor.pause = false;
        }
        return;
      }
      if (pending && !actor.path.length) {
        pending = false;
        actor.pause = false;
        run();
      }
      const k = key(actor.cell[0], actor.cell[1]);
      if (k !== lastCell) {
        lastCell = k;
        collect();
        emit({ type: "step", cell: actor.cell.slice() });
      }
    },
  };
  return api;
}
