import { DIRS, cellAt, isWalkable, edgeClosed, surfaceHeight } from "./level.js";
import { reachable } from "./path.js";

export const CLASS_IDS = ["wanderer", "aws", "dutchie", "nm"];
const ALIAS = { wretch: "wanderer" };
export const CLASS_KEY = "isoworld:class";

export const POWERS = {
  wanderer: { id: "ink-step", name: "Ink Step", hero: "Wretch", recharge: 6, hint: "Jump two cells ahead" },
  aws: { id: "ward", name: "Ward", hero: "Gatekeeper", recharge: 10, hint: "Absorb the next trap" },
  dutchie: { id: "waypoint-run", name: "Waypoint Run", hero: "Courier", recharge: 0, passive: true, hint: "Tap a cell to run there" },
  nm: { id: "unjam", name: "Unjam", hero: "Modernizer", recharge: 5, hint: "Disarm the trap ahead" },
};

export const HOP_S = 0.42, HOP_H = 0.7, AVOID_COST = 40;

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

export function createPowers(game) {
  const { state } = game;
  const listeners = new Set();
  const emit = (e) => { for (const f of [...listeners]) f(e); };
  let cls = null, since = 0, pending = false, hop = null, actor = null, lastCell = "", offs = [];
  const power = () => POWERS[cls];
  const say = (text) => state.things?.say(text);
  const syncClass = () => {
    const c = powerClass(state.params);
    if (c === cls) return;
    if (cls === "aws" && state.health?.warded) state.health.ward(false);
    cls = c;
    since = POWERS[c].recharge;
    pending = false;
    if (actor) actor.pause = false;
    emit({ type: "class", cls });
  };
  const ready = () => !power().passive && since >= power().recharge && !(cls === "aws" && state.health?.warded);
  const spend = () => { since = 0; emit({ type: "spend", power: power().id }); };
  const busy = () => !actor || actor.locked || !!state.life?.busy || !!hop;
  const cellNow = () => actor.cell.slice();

  const doInk = () => {
    const r = inkStep(state.level, cellNow(), facingDir(actor.facing));
    if (!r.to) { say(r.why); emit({ type: "fail", power: "ink-step", why: r.why }); return false; }
    state.route.cancel();
    actor.path = []; actor.tapDir = null;
    state.traps?.skip([r.mid], HOP_S + 0.5);
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
    since = 0;
    emit({ type: "ward" });
    return true;
  };
  const doUnjam = () => {
    const d = DIRS[facingDir(actor.facing)], at = [actor.cell[0] + d[0], actor.cell[1] + d[1]];
    const t = state.traps?.at(at);
    if (!t || t.disarmed) { const why = t ? "Already bolted down." : "Nothing jammed there."; say(why); emit({ type: "fail", power: "unjam", why }); return false; }
    state.traps.disarm(t.id);
    spend();
    say(`Unjammed: ${t.name}.`);
    emit({ type: "unjam", cell: at, trap: t.id });
    return true;
  };
  const run = () => {
    if (busy()) return false;
    if (cls === "wanderer") return doInk();
    if (cls === "aws") return doWard();
    if (cls === "nm") return doUnjam();
    return false;
  };

  const api = {
    get cls() { return cls; },
    get power() { return power(); },
    get since() { return since; },
    get ready() { return ready(); },
    get left() { return power().passive ? 0 : Math.max(0, power().recharge - since); },
    get charge() { const p = power(); return p.passive ? 1 : (cls === "aws" && state.health?.warded) ? 1 : Math.min(1, since / p.recharge); },
    get raised() { return cls === "aws" && !!state.health?.warded; },
    get hop() { return hop; },
    get pending() { return pending; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    canRoute() { syncClass(); return cls === "dutchie"; },
    avoid(x, z) {
      const t = state.traps?.at([x, z]);
      return t && t.revealed && !t.disarmed ? AVOID_COST : 0;
    },
    fire() {
      syncClass();
      const p = power();
      if (!actor || actor.locked || state.life?.busy) return false;
      if (p.passive) { say(p.hint + "."); emit({ type: "hint", power: p.id }); return false; }
      if (cls === "aws" && state.health?.warded) { say("The ward is already raised."); emit({ type: "fail", power: p.id, why: "raised" }); return false; }
      if (!ready()) { const n = p.recharge - since; say(`${p.name} recharges in ${n} step${n === 1 ? "" : "s"}.`); emit({ type: "wait", power: p.id, left: n }); return false; }
      if (hop) return false;
      if (actor.path.length || actor.moving) { pending = true; actor.pause = true; state.route.cancel(); return true; }
      return run();
    },
    refill() { since = power().recharge; emit({ type: "refill" }); },
    bind() {
      for (const f of offs) f();
      offs = [];
      actor = state.actor;
      pending = false; hop = null;
      if (actor) actor.pause = false;
      lastCell = actor ? key(actor.cell[0], actor.cell[1]) : "";
      syncClass();
      const t = state.things?.on?.((e) => { if (e.type === "lit" || e.type === "rest") api.refill(); });
      if (t) offs.push(t);
      const l = state.life?.on?.((e) => { if (e.type === "respawn") { hop = null; pending = false; if (actor) actor.pause = false; lastCell = key(actor.cell[0], actor.cell[1]); } });
      if (l) offs.push(l);
      const h = state.health?.on?.((e) => { if (cls === "aws" && e.type === "absorb") { since = 0; emit({ type: "absorb" }); } });
      if (h) offs.push(h);
    },
    update(dt) {
      if (!actor || actor !== state.actor) return;
      syncClass();
      if (hop) {
        hop.t = Math.min(HOP_S, hop.t + dt);
        const u = hop.t / HOP_S, e = u * u * (3 - 2 * u);
        actor.pos.x = hop.from[0] + 0.5 + (hop.to[0] - hop.from[0]) * e;
        actor.pos.z = hop.from[1] + 0.5 + (hop.to[1] - hop.from[1]) * e;
        actor.y = hop.y0 + (hop.y1 - hop.y0) * e + HOP_H * 4 * u * (1 - u);
        actor.moving = false;
        if (hop.t >= HOP_S) {
          actor.cell = hop.to.slice();
          actor.pos.x = hop.to[0] + 0.5; actor.pos.z = hop.to[1] + 0.5; actor.y = hop.y1;
          lastCell = key(hop.to[0], hop.to[1]);
          emit({ type: "land", cell: hop.to.slice() });
          hop = null;
          actor.pause = false;
        }
        return;
      }
      if (pending && !actor.path.length) {
        pending = false;
        actor.pause = false;
        if (!run() && !hop) actor.pause = false;
      }
      const k = key(actor.cell[0], actor.cell[1]);
      if (k !== lastCell) {
        lastCell = k;
        if (!power().passive && !(cls === "aws" && state.health?.warded) && since < power().recharge) {
          since++;
          if (since === power().recharge) emit({ type: "ready", power: power().id });
        }
        emit({ type: "step", cell: actor.cell.slice() });
      }
    },
  };
  return api;
}
