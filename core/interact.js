import { isWalkable, DIRS } from "./level.js";
import { pathToward } from "./path.js";

export const THING_KINDS = ["bonfire", "chest", "gate", "elevator", "watcher", "door", "ladder", "lever", "pad"];
const START = { bonfire: "unlit", chest: "closed", gate: "closed", elevator: "idle", watcher: "idle", door: "closed", ladder: "up", lever: "up", pad: "live" };
const VERB = { bonfire: ["Light the bonfire", "Rest"], chest: ["Open the chest"], elevator: ["Ride the lift"], lever: ["Pull the lever"], pad: ["Step through the pad"] };
export const PAD_COST = 4;
const SAY = {
  doorShut: "It does not open from this side.",
  gateShut: "It won't budge. A lever works it.",
  dropHigh: "Too high to climb back up.",
  doorOpen: "The door swings open. A shortcut.",
  ladderHigh: "The ladder is drawn up. Someone above could kick it down.",
  ladderDown: "Kicked the ladder down. A shortcut.",
  lever: "Somewhere, a gate grinds open.",
  padDark: "The pad is dark.",
  padWake: "The pad hums awake. A shortcut.",
};
const key = (x, z) => x + "," + z;
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const adjacent = (a, b) => Array.isArray(a) && Array.isArray(b) && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

export function edgeKey(a, b) {
  const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  return p[0] + "," + p[1] + "|" + q[0] + "," + q[1];
}

export function gateEdge(t) {
  const th = Array.isArray(t.threshold) ? t.threshold[0] : null;
  if (Array.isArray(t.edge) && adjacent(t.edge[0], t.edge[1]) && (!th || (th[0] === t.edge[0][0] && th[1] === t.edge[0][1]) || (th[0] === t.edge[1][0] && th[1] === t.edge[1][1]))) {
    return th && th[0] === t.edge[1][0] && th[1] === t.edge[1][1] ? [t.edge[1].slice(), t.edge[0].slice()] : [t.edge[0].slice(), t.edge[1].slice()];
  }
  if (!th || !Array.isArray(t.blocks)) return null;
  const b = t.blocks.find((c) => adjacent(th, c));
  return b ? [th.slice(), b.slice()] : null;
}

export function thingEdge(t) { return t.kind === "gate" || t.kind === "door" ? t.edge || null : null; }

export const linkKey = (a, b) => a[0] + "," + a[1] + ">" + b[0] + "," + b[1];

export function ladderEnds(t) {
  const d = DIRS[t.d];
  return d ? [[t.x, t.z], [t.x + d[0], t.z + d[1]]] : null;
}

export function thingLinks(t) {
  if (t.kind !== "ladder") return [];
  const e = ladderEnds(t);
  if (!e) return [];
  if (t.mode === "drop") return [e];
  return t.state === "down" ? [e, [e[1], e[0]]] : [];
}

export const isShortcutGate = (t) => t.kind === "gate" && /^lever:/.test(String(t.open || ""));

export const padLive = (t) => t.kind === "pad" && t.state === "live";

export function padLinks(things, open = null) {
  const byId = Object.fromEntries((things || []).map((t) => [t.id, t]));
  const out = new Map();
  for (const t of things || []) {
    if (t.kind !== "pad" || !byId[t.to]) continue;
    const o = byId[t.to];
    const live = open ? (t.role !== "shortcut" || open.has(t.id) || open.has(o.id)) : padLive(t);
    if (live) out.set(key(t.x, t.z), [o.x, o.z]);
  }
  return out;
}

export function normalizeThing(t) {
  const kind = t.kind || t.t;
  const out = { ...t, kind, rot: t.rot || 0, state: t.state || START[kind] };
  if (kind === "gate") {
    out.blocks = Array.isArray(t.blocks) && t.blocks.length ? t.blocks : [[t.x, t.z]];
    const e = gateEdge(out);
    if (e) { out.edge = e; out.threshold = [e[0]]; if (!Array.isArray(t.edge)) out.migrated = true; } else delete out.edge;
  }
  else if (kind === "door") {
    const ok = Array.isArray(t.edge) && adjacent(t.edge[0], t.edge[1]);
    out.edge = ok ? [t.edge[0].slice(), t.edge[1].slice()] : null;
    out.blocks = [];
    if (out.edge) { out.x = out.edge[1][0]; out.z = out.edge[1][1]; }
  }
  else if (kind === "ladder") { out.mode = t.mode === "drop" ? "drop" : "kick"; if (out.mode === "drop") out.state = "drop"; out.blocks = []; }
  else if (kind === "bonfire" || kind === "chest" || kind === "lever") out.blocks = [[t.x, t.z]];
  else if (kind === "pad") { out.blocks = []; if (!t.state) out.state = t.role === "shortcut" ? "dark" : "live"; }
  else out.blocks = [];
  if (kind === "watcher") { out.size = t.size || [1, 1]; out.radius = t.radius || 3.5; }
  return out;
}

export function thingBlocks(t) {
  if (t.kind === "gate" && (t.state === "open" || (t.edge && !t.hold))) return [];
  return t.blocks || [];
}

export const GATE_LIFT = 1.1;

export function storageKey(name) { return "isoworld:things:" + (name || "level"); }

export function createInteract(level, { params = {}, storage = globalThis.localStorage, navigate, dom = typeof document !== "undefined" } = {}) {
  const things = (level.things || []).map((t) => ({ ...t }));
  const byId = Object.fromEntries(things.map((t) => [t.id, t]));
  const skey = storageKey(level.name);
  const read = () => { try { return JSON.parse(storage?.getItem(skey) || "null"); } catch { return null; } };
  const write = (v) => { try { storage?.setItem(skey, JSON.stringify(v)); } catch {} };
  if (params.reset === "1") { try { storage?.removeItem(skey); } catch {} }
  const saved = read() || {};
  let respawn = Array.isArray(saved.respawn) ? saved.respawn : null;
  for (const t of things) {
    const s = saved.things?.[t.id];
    if (s?.state && t.kind !== "elevator" && t.kind !== "watcher") t.state = s.state;
    if (t.kind === "watcher") { t.look = 0; t.target = 0; t.met = false; }
    if (t.kind === "elevator") { t.ride = 0; t.rideDir = 0; }
  }
  const openGate = (g) => {
    if (g.edge) level.edges?.delete(edgeKey(g.edge[0], g.edge[1]));
    if (!g.edge || g.hold) for (const [x, z] of g.blocks) level.blocked.delete(key(x, z));
  };
  const setLinks = (t) => {
    level.links ||= new Map();
    const e = ladderEnds(t);
    if (!e) return;
    level.links.delete(linkKey(e[0], e[1]));
    level.links.delete(linkKey(e[1], e[0]));
    for (const [p, q] of thingLinks(t)) level.links.set(linkKey(p, q), t.id);
  };
  for (const t of things) {
    if (t.kind === "gate" && t.state === "open") openGate(t);
    if (t.kind === "door" && t.state === "open" && t.edge) level.edges?.delete(edgeKey(t.edge[0], t.edge[1]));
    if (t.kind === "ladder") setLinks(t);
  }
  const syncPads = () => { level.pads = padLinks(things); };
  syncPads();

  const listeners = new Set();
  const emit = (e) => { for (const f of listeners) f(e); };
  const save = () => write({ ...(read() || {}), v: 1, respawn, things: Object.fromEntries(things.map((t) => [t.id, { state: t.state }])) });

  let actor = null, pending = null, focus = null, toastText = "", toastT = 0, nav = null, stalled = false, bumped = "", padCell = "";
  const log = [];

  const ui = dom && params.hero !== "0" ? mountThingsUI() : null;
  const toast = (text) => { toastText = text; toastT = 2.6; log.push({ toast: text }); ui?.toast(text); emit({ type: "toast", text }); };

  const center = (t) => t.kind === "watcher" ? [t.x + t.size[0] / 2, t.z + t.size[1] / 2] : [t.x + 0.5, t.z + 0.5];
  const at = (c, p) => !!p && c[0] === p[0] && c[1] === p[1];
  const inRange = (t, c = actor.cell) => {
    if (t.kind === "elevator" || t.kind === "pad") return c[0] === t.x && c[1] === t.z;
    if (t.kind === "door") return !!t.edge && (at(c, t.edge[0]) || at(c, t.edge[1]));
    if (t.kind === "ladder") { const e = ladderEnds(t); return !!e && (at(c, e[0]) || at(c, e[1])); }
    if (t.kind === "gate") return leverGate(t) && !!t.edge && (at(c, t.edge[0]) || at(c, t.edge[1]));
    if (t.kind !== "bonfire" && t.kind !== "chest" && t.kind !== "lever") return false;
    const dx = Math.abs(c[0] - t.x), dz = Math.abs(c[1] - t.z);
    return Math.max(dx, dz) === 1;
  };
  const leverGate = (t) => isShortcutGate(t) && t.state !== "open" && t.lifting == null && byId[String(t.open).split(":")[1]]?.state !== "pulled";
  const usable = (t) => (t.kind === "gate" && leverGate(t)) || (t.kind === "bonfire") || (t.kind === "chest" && t.state === "closed") || (t.kind === "elevator" && t.state === "idle") || (t.kind === "door" && t.state === "closed") || (t.kind === "ladder" && t.state === "up") || (t.kind === "lever" && t.state === "up") || (t.kind === "pad" && t.state === "live" && !!byId[t.to]);
  const farSide = (t, c = actor.cell) => t.kind === "door" ? at(c, t.edge?.[1]) : t.kind === "ladder" ? at(c, [t.x, t.z]) : true;
  const verb = (t) => {
    if (t.kind === "bonfire") return VERB.bonfire[t.state === "lit" ? 1 : 0];
    if (t.kind === "door") return farSide(t) ? "Open the door" : "Try the door";
    if (t.kind === "ladder") return farSide(t) ? "Kick the ladder down" : "Reach for the ladder";
    if (t.kind === "gate") return "Push the gate";
    return VERB[t.kind]?.[0] || "Use";
  };

  const act = (t) => {
    if (!t || !usable(t) || !actor || actor.locked) return false;
    if (t.kind === "bonfire") {
      const first = t.state !== "lit";
      t.state = "lit";
      respawn = isWalkable(level, actor.cell[0], actor.cell[1]) ? actor.cell.slice() : respawn;
      save();
      emit({ type: first ? "lit" : "rest", thing: t });
      toast(t.text || (first ? "Bonfire lit" : "Rested at the bonfire"));
    } else if (t.kind === "chest") {
      t.state = "open";
      save();
      emit({ type: "open", thing: t });
      toast(t.text || "Found something");
    } else if (t.kind === "door") {
      if (!farSide(t)) { emit({ type: "locked", thing: t }); toast(t.text || SAY.doorShut); return true; }
      t.state = "open";
      level.edges?.delete(edgeKey(t.edge[0], t.edge[1]));
      save();
      emit({ type: "door", thing: t });
      toast(SAY.doorOpen);
    } else if (t.kind === "ladder") {
      if (!farSide(t)) { emit({ type: "locked", thing: t }); toast(t.text || SAY.ladderHigh); return true; }
      t.state = "down";
      setLinks(t);
      save();
      emit({ type: "ladder", thing: t });
      toast(SAY.ladderDown);
    } else if (t.kind === "gate") {
      emit({ type: "locked", thing: t });
      toast(SAY.gateShut);
    } else if (t.kind === "lever") {
      t.state = "pulled";
      save();
      emit({ type: "lever", thing: t });
      toast(t.text || SAY.lever);
    } else if (t.kind === "pad") {
      const o = byId[t.to];
      actor.path = []; actor.held = null; actor.tapDir = null; actor.moving = false;
      actor.cell = [o.x, o.z];
      actor.pos.x = o.x + 0.5; actor.pos.z = o.z + 0.5;
      emit({ type: "teleport", thing: t, to: o });
    } else if (t.kind === "elevator") {
      const run = t.run || level.runOrder || [], i = run.indexOf(level.name), back = t.role === "entry";
      t.next = t.to || (i >= 0 ? run[back ? i - 1 : i + 1] : null) || null;
      t.arrive = back ? "exit" : "entry";
      if (!t.next && t.role) {
        emit({ type: "stub", thing: t });
        toast(t.stub || (back ? "The way back is sealed" : "The shaft goes no higher yet"));
        return true;
      }
      t.state = "rising";
      t.rideDir = 1;
      actor.path = []; actor.held = null; actor.locked = true;
      emit({ type: "ride", thing: t, next: t.next });
    }
    return true;
  };

  const gateReady = (g) => {
    const cond = String(g.open || "");
    const [kind, id] = cond.split(":");
    const o = byId[id];
    if (!o) return false;
    if (kind === "chest") return o.state === "open";
    if (kind === "bonfire") return o.state === "lit";
    if (kind === "lever") return o.state === "pulled";
    if (kind === "watcher") {
      const th = Array.isArray(g.threshold) && g.threshold.length ? g.threshold : null;
      const on = !th || th.some(([x, z]) => x === actor.cell[0] && z === actor.cell[1]);
      if (o.state !== "watching") g.primed = false;
      else if (on) g.primed = true;
      return o.look >= 0.9 && (on || !!g.primed);
    }
    return false;
  };

  const api = {
    things, byId, log,
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    bind(a) { actor = a; a.blocked = (dir) => { if (!a.locked) api.bump(a.cell, dir); }; },
    spawnCell() {
      if (respawn && things.some((t) => t.kind === "bonfire" && t.state === "lit") && isWalkable(level, respawn[0], respawn[1])) return respawn.slice();
      return null;
    },
    arrivalCell(role = params.arrive) {
      if (role !== "entry" && role !== "exit") return null;
      const e = things.find((t) => t.kind === "elevator" && t.role === role);
      return e && isWalkable(level, e.x, e.z) ? [e.x, e.z] : null;
    },
    get focus() { return focus; },
    get toastText() { return toastT > 0 ? toastText : ""; },
    get navigated() { return nav; },
    act() { return act(focus); },
    say(text) { if (text) toast(text); },
    bump(from, dir) {
      const d = DIRS[dir];
      if (!d || !from) return null;
      const to = [from[0] + d[0], from[1] + d[1]];
      const k = from.join() + ">" + to.join();
      if (k === bumped && toastT > 0) return null;
      let text = null;
      for (const t of things) {
        const e = t.edge;
        if ((t.kind === "door" || t.kind === "gate") && e && t.state !== "open" && ((at(from, e[0]) && at(to, e[1])) || (at(from, e[1]) && at(to, e[0])))) {
          if (t.kind === "door") text = farSide(t, from) ? null : t.text || SAY.doorShut;
          else if (leverGate(t)) text = SAY.gateShut;
        } else if (t.kind === "ladder" && (t.mode === "drop" || t.state === "up")) {
          const l = ladderEnds(t);
          if (l && at(from, l[1]) && at(to, l[0])) text = t.mode === "drop" ? SAY.dropHigh : t.text || SAY.ladderHigh;
        }
        if (text) break;
      }
      if (!text) return null;
      bumped = k;
      emit({ type: "bump", text });
      toast(text);
      return text;
    },
    tap(cell) {
      if (!actor || !cell) return false;
      const t = things.find((q) => (q.kind === "bonfire" || q.kind === "chest" || q.kind === "elevator" || q.kind === "lever" || q.kind === "door" || q.kind === "ladder" || q.kind === "pad") && (q.kind !== "door" && q.kind !== "ladder" || usable(q)) && q.x === cell[0] && q.z === cell[1]);
      if (!t) return false;
      if (inRange(t)) { act(t); return true; }
      const from = actor.path[0] || actor.cell;
      const h = level.cells[t.z]?.[t.x]?.h;
      const near = N8.map(([dx, dz]) => [t.x + dx, t.z + dz]).filter(([x, z]) => isWalkable(level, x, z));
      const side = near.filter(([x, z]) => Math.abs(x - t.x) + Math.abs(z - t.z) === 1 && level.cells[z][x].h === h);
      const shortest = (goals) => {
        let best = null;
        for (const g of goals) {
          const p = pathToward(level, from, g);
          if (p && p[p.length - 1][0] === g[0] && p[p.length - 1][1] === g[1] && (!best || p.length < best.length)) best = p;
        }
        return best;
      };
      const best = t.kind === "elevator" || t.kind === "door" || t.kind === "ladder" || t.kind === "pad" ? shortest([[t.x, t.z]]) : shortest(side) || shortest(near);
      if (!best) return false;
      actor.setPath(best);
      pending = t.id;
      return true;
    },
    update(dt) {
      if (!actor) return;
      dt = Math.min(Math.max(dt, 0), 0.1);
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) ui?.toast(""); }
      for (const t of things) {
        if (t.kind === "watcher") {
          const [cx, cz] = center(t);
          const dx = actor.pos.x - cx, dz = actor.pos.z - cz, d = Math.hypot(dx, dz);
          const inside = d < t.radius;
          if (inside) t.target = Math.atan2(dx, dz);
          const want = inside ? 1 : 0;
          t.look += (want - t.look) * (1 - Math.exp(-dt * 4));
          if (Math.abs(want - t.look) < 1e-3) t.look = want;
          const st = inside ? "watching" : "idle";
          if (st !== t.state) { t.state = st; emit({ type: inside ? "watch" : "unwatch", thing: t }); }
          if (t.look > 0.9 && !t.met) { t.met = true; emit({ type: "faced", thing: t }); }
          if (!inside && t.look < 0.1) t.met = false;
        }
        if (t.kind === "elevator" && t.rideDir) {
          t.ride = Math.min(1, Math.max(0, t.ride + t.rideDir * dt / 1.6));
          if (t.rideDir > 0 && t.ride >= 1) {
            if (t.next) {
              t.rideDir = 0; t.state = "arrived";
              nav = t.next;
              emit({ type: "navigate", thing: t, next: t.next });
              if (params.nav !== "0") (navigate && !stalled ? navigate : defaultNavigate)(t.next, level.name, t.arrive);
            } else {
              t.rideDir = -1; t.state = "returning";
              toast(t.stub || "The shaft goes no higher yet");
            }
          } else if (t.rideDir < 0 && t.ride <= 0) {
            t.rideDir = 0; t.state = "idle"; actor.locked = false;
          }
        }
      }
      for (const g of things) {
        if (g.kind !== "gate" || g.state === "open") continue;
        if (g.lifting != null) {
          g.lifting -= dt;
          if (g.lifting <= 0) { g.lifting = null; g.state = "open"; openGate(g); save(); }
          continue;
        }
        if (!gateReady(g)) continue;
        g.lifting = GATE_LIFT;
        emit({ type: "gate", thing: g });
      }
      const here = actor.cell[0] + "," + actor.cell[1];
      if (here !== padCell) {
        padCell = here;
        const p = things.find((q) => q.kind === "pad" && q.x === actor.cell[0] && q.z === actor.cell[1]);
        if (p && p.state === "dark") {
          if (p.end === "far") {
            for (const q of [p, byId[p.to]]) if (q) q.state = "live";
            syncPads();
            save();
            emit({ type: "pad", thing: p });
            toast(p.text || SAY.padWake);
          } else toast(p.text || SAY.padDark);
        }
      }
      if (pending) {
        const t = byId[pending];
        if (!actor.path.length && !actor.moving) { pending = null; if (t && inRange(t)) act(t); }
      }
      focus = null;
      if (!actor.locked && !actor.moving) {
        let bd = Infinity;
        for (const t of things) {
          if (!usable(t) || !inRange(t)) continue;
          const d = Math.hypot(actor.pos.x - t.x - 0.5, actor.pos.z - t.z - 0.5);
          if (d < bd) { bd = d; focus = t; }
        }
      }
      ui?.prompt(focus ? verb(focus) : "");
    },
    settle() {
      for (const t of things) if (t.kind === "elevator" && (t.rideDir || t.state !== "idle")) { t.lift = null; t.ride = 0; t.rideDir = 0; t.state = "idle"; }
      nav = null;
      if (actor) { actor.locked = false; actor.path = []; actor.held = null; actor.tapDir = null; }
    },
    stall(text) {
      stalled = true;
      nav = null;
      for (const t of things) if (t.kind === "elevator" && (t.state === "arrived" || t.state === "shaft")) { t.lift = null; t.rideDir = -1; t.state = "returning"; if (text !== "") toast(text ?? t.stub ?? "The lift stalls"); }
    },
    dispose() { ui?.dispose(); if (dom) removeEventListener("pageshow", onShow); },
  };
  const onShow = (e) => { if (e.persisted) api.settle(); };
  if (dom) addEventListener("pageshow", onShow);
  if (ui) ui.onAct(() => api.act());
  return api;
}

function defaultNavigate(next, from, arrive) {
  const q = new URLSearchParams(location.search);
  q.set("level", next);
  q.set("from", from);
  if (arrive) q.set("arrive", arrive); else q.delete("arrive");
  q.delete("spawn");
  q.delete("reset");
  location.search = q.toString();
}

const CSS = `
.iw-prompt{position:fixed;left:50%;bottom:max(22px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:15;display:flex;gap:8px;align-items:center;padding:7px 12px;border:0;border-radius:999px;background:rgba(24,22,30,.78);color:#f4efe4;font:13px/1.2 system-ui,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-prompt kbd{display:inline-block;min-width:18px;padding:1px 5px;border-radius:5px;background:#f4efe4;color:#18161e;font:600 12px/16px system-ui,sans-serif;text-align:center}
.iw-prompt[hidden],.iw-toast[hidden]{display:none}
.iw-touch .iw-prompt{bottom:calc(max(25vh,150px) + 12px);max-width:calc(100vw - 32px);border:2px solid rgba(18,196,240,.55);font-weight:600}
.iw-touch .iw-prompt kbd{display:none}
.iw-toast,.iw-scroll-ghost{position:fixed;left:50%;top:calc(max(12px,env(safe-area-inset-top,0px)) + 80px);transform:translateX(-50%) rotate(-.6deg);z-index:15;display:flex;align-items:stretch;pointer-events:none;filter:drop-shadow(0 5px 0 rgba(30,18,8,.35))}
.iw-toast .rod{position:relative;flex:none;width:18px;margin:-5px 0;border-radius:9px;background:linear-gradient(90deg,#d9b779 0 30%,#f3dfae 30% 55%,#c9a263 55%);box-shadow:inset 0 0 0 2px #8a5a2b}
.iw-toast .rod::before,.iw-toast .rod::after{content:"";position:absolute;left:4px;width:10px;height:12px;border-radius:5px;background:linear-gradient(90deg,#6b3f1d 0 40%,#a8693a 40% 70%,#6b3f1d 70%)}
.iw-toast .rod::before{top:-10px}
.iw-toast .rod::after{bottom:-10px}
.iw-toast .paper{overflow:hidden;width:var(--pw,auto);min-height:52px;display:flex;align-items:center;background:linear-gradient(#e6c98e 0 4px,#f6e6c0 4px 10px,#fbf0d4 10px calc(100% - 10px),#efd8a6 calc(100% - 10px) calc(100% - 4px),#d9b779 calc(100% - 4px));box-shadow:inset 0 3px 0 rgba(255,255,255,.35),inset 0 -3px 0 rgba(120,80,30,.25)}
.iw-toast .msg{flex:none;box-sizing:border-box;max-width:min(calc(100vw - 72px),520px);padding:10px 16px;color:#3b2414;font:italic 600 16px/1.15 Georgia,"Palatino Linotype",Palatino,serif;letter-spacing:.02em;text-align:center;text-wrap:balance}
.iw-toast.unfurl .paper{animation:iw-unfurl .42s cubic-bezier(.3,1.25,.5,1) both}
.iw-toast.unfurl .msg{animation:iw-ink .5s .18s both}
.iw-scroll-ghost .paper{animation:iw-rollup .3s ease-in both}
.iw-scroll-ghost{animation:iw-fade .3s .12s ease-in both}
@keyframes iw-unfurl{from{width:0}to{width:var(--pw)}}
@keyframes iw-rollup{from{width:var(--pw)}to{width:0}}
@keyframes iw-ink{from{opacity:0}to{opacity:1}}
@keyframes iw-fade{to{opacity:0}}
@keyframes iw-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px) rotate(-6deg)}}
@keyframes iw-boing{0%{transform:translateX(-50%) translateY(14px) scale(.4)}55%{transform:translateX(-50%) translateY(-6px) scale(1.08,.94)}78%{transform:translateX(-50%) translateY(1px) scale(.97,1.03)}100%{transform:translateX(-50%)}}
@media (hover:hover){
html:not(.iw-touch) .iw-prompt{bottom:max(30px,env(safe-area-inset-bottom,0px));gap:12px;padding:9px 20px 9px 9px;border:3px solid transparent;border-radius:999px;background:linear-gradient(#211a33,#211a33) padding-box,conic-gradient(from var(--iw-spin,0deg),#12c4f0,#9a7ae0,#e86aa0,#f5c243,#7cc56a,#12c4f0) border-box;color:#fff3e0;font:800 16px/1.2 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;box-shadow:0 7px 0 rgba(10,8,18,.5),0 0 28px rgba(232,106,160,.35);animation:iw-spin 6s linear infinite;transition:filter .15s}
html:not(.iw-touch) .iw-prompt.pop{animation:iw-spin 6s linear infinite,iw-boing .55s cubic-bezier(.3,1.4,.5,1)}
html:not(.iw-touch) .iw-prompt:hover{filter:brightness(1.12)}
html:not(.iw-touch) .iw-prompt kbd{min-width:30px;padding:5px 8px;border-radius:10px;background:linear-gradient(160deg,#ffd76a 0 48%,#f5c243 48%);color:#2a1f33;font:900 15px/20px ui-rounded,"SF Pro Rounded",system-ui,sans-serif;box-shadow:0 3px 0 #9a6b18;animation:iw-bob 1.4s ease-in-out infinite}
}
@media (prefers-reduced-motion:reduce){html:not(.iw-touch) .iw-prompt,html:not(.iw-touch) .iw-prompt kbd{animation:none!important}}
@media (prefers-reduced-motion:reduce){.iw-toast.unfurl .paper,.iw-toast.unfurl .msg,.iw-scroll-ghost,.iw-scroll-ghost .paper{animation-duration:.01s}}
`;

function mountThingsUI() {
  if (!document.getElementById("iw-things-css")) {
    const st = document.createElement("style");
    st.id = "iw-things-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className = "iw-prompt";
  prompt.hidden = true;
  const toastEl = document.createElement("div");
  toastEl.className = "iw-toast";
  toastEl.setAttribute("role", "status");
  toastEl.hidden = true;
  toastEl.innerHTML = '<i class="rod"></i><div class="paper"><span class="msg"></span></div><i class="rod"></i>';
  const msg = toastEl.querySelector(".msg");
  const rollUp = () => {
    if (toastEl.hidden) return;
    const ghost = toastEl.cloneNode(true);
    ghost.className = "iw-toast iw-scroll-ghost";
    ghost.removeAttribute("role");
    ghost.setAttribute("aria-hidden", "true");
    document.body.appendChild(ghost);
    setTimeout(() => ghost.remove(), 450);
  };
  document.body.append(prompt, toastEl);
  const root = document.documentElement;
  let actFn = null, shown = "";
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (e.code === "KeyF" || e.code === "Enter" || e.code === "NumpadEnter") { if (actFn?.()) e.preventDefault(); }
  };
  addEventListener("keydown", onKey);
  prompt.addEventListener("pointerdown", (e) => e.stopPropagation());
  prompt.addEventListener("pointerup", (e) => e.stopPropagation());
  prompt.addEventListener("click", (e) => { e.preventDefault(); actFn?.(); });
  return {
    onAct(f) { actFn = f; },
    prompt(text) {
      if (text === shown) return;
      shown = text;
      if (text) root.dataset.iwAct = "1"; else delete root.dataset.iwAct;
      prompt.hidden = !text;
      prompt.innerHTML = "";
      if (!text) return;
      const k = document.createElement("kbd");
      k.textContent = "F";
      prompt.append(k, document.createTextNode(text));
      prompt.classList.remove("pop");
      void prompt.offsetWidth;
      prompt.classList.add("pop");
    },
    toast(text) {
      if (!text) { rollUp(); toastEl.hidden = true; msg.textContent = ""; return; }
      toastEl.hidden = false;
      toastEl.classList.remove("unfurl");
      toastEl.style.removeProperty("--pw");
      msg.textContent = text;
      toastEl.style.setProperty("--pw", Math.ceil(msg.getBoundingClientRect().width) + "px");
      void toastEl.offsetWidth;
      toastEl.classList.add("unfurl");
    },
    dispose() { removeEventListener("keydown", onKey); delete root.dataset.iwAct; prompt.remove(); toastEl.remove(); },
  };
}

