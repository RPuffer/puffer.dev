import { isWalkable } from "./level.js";
import { pathToward } from "./path.js";

export const THING_KINDS = ["bonfire", "chest", "gate", "elevator", "watcher"];
const START = { bonfire: "unlit", chest: "closed", gate: "closed", elevator: "idle", watcher: "idle" };
const VERB = { bonfire: ["Light the bonfire", "Rest"], chest: ["Open the chest"], elevator: ["Ride the lift"] };
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

export function thingEdge(t) { return t.kind === "gate" ? t.edge || null : null; }

export function normalizeThing(t) {
  const kind = t.kind || t.t;
  const out = { ...t, kind, rot: t.rot || 0, state: t.state || START[kind] };
  if (kind === "gate") {
    out.blocks = Array.isArray(t.blocks) && t.blocks.length ? t.blocks : [[t.x, t.z]];
    const e = gateEdge(out);
    if (e) { out.edge = e; out.threshold = [e[0]]; if (!Array.isArray(t.edge)) out.migrated = true; } else delete out.edge;
  }
  else if (kind === "bonfire" || kind === "chest") out.blocks = [[t.x, t.z]];
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
  for (const t of things) if (t.kind === "gate" && t.state === "open") openGate(t);

  const listeners = new Set();
  const emit = (e) => { for (const f of listeners) f(e); };
  const save = () => write({ ...(read() || {}), v: 1, respawn, things: Object.fromEntries(things.map((t) => [t.id, { state: t.state }])) });

  let actor = null, pending = null, focus = null, toastText = "", toastT = 0, nav = null, stalled = false;
  const log = [];

  const ui = dom && params.hero !== "0" ? mountThingsUI({ touch: params.touch === "1" }) : null;
  const toast = (text) => { toastText = text; toastT = 2.6; log.push({ toast: text }); ui?.toast(text); emit({ type: "toast", text }); };

  const center = (t) => t.kind === "watcher" ? [t.x + t.size[0] / 2, t.z + t.size[1] / 2] : [t.x + 0.5, t.z + 0.5];
  const inRange = (t, c = actor.cell) => {
    if (t.kind === "elevator") return c[0] === t.x && c[1] === t.z;
    if (t.kind !== "bonfire" && t.kind !== "chest") return false;
    const dx = Math.abs(c[0] - t.x), dz = Math.abs(c[1] - t.z);
    return Math.max(dx, dz) === 1;
  };
  const usable = (t) => (t.kind === "bonfire") || (t.kind === "chest" && t.state === "closed") || (t.kind === "elevator" && t.state === "idle");
  const verb = (t) => t.kind === "bonfire" ? VERB.bonfire[t.state === "lit" ? 1 : 0] : VERB[t.kind]?.[0] || "Use";

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
    bind(a) { actor = a; },
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
    tap(cell) {
      if (!actor || !cell) return false;
      const t = things.find((q) => (q.kind === "bonfire" || q.kind === "chest" || q.kind === "elevator") && q.x === cell[0] && q.z === cell[1]);
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
      const best = t.kind === "elevator" ? shortest([[t.x, t.z]]) : shortest(side) || shortest(near);
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
.iw-prompt[hidden],.iw-toast[hidden],.iw-use[hidden]{display:none}
.iw-prompt.iw-touch{left:164px;bottom:calc(max(18px,env(safe-area-inset-bottom,0px)) + 112px);transform:none;max-width:calc(100vw - 180px)}
.iw-use{position:fixed;left:164px;bottom:calc(max(18px,env(safe-area-inset-bottom,0px)) + 38px);z-index:15;width:60px;height:60px;border:0;border-radius:50%;background:rgba(24,22,30,.45);color:rgba(244,239,228,.75);font:700 20px/60px system-ui,sans-serif;padding:0;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-use.on{background:#f5c243;color:#18161e;box-shadow:0 2px 0 rgba(24,22,30,.35)}
.iw-toast{position:fixed;left:50%;top:max(18px,env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:15;padding:8px 14px;border-radius:8px;background:rgba(24,22,30,.82);color:#f4efe4;font:14px/1.3 system-ui,sans-serif;pointer-events:none;transition:opacity .25s}
`;

function mountThingsUI({ touch = false } = {}) {
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
  const use = document.createElement("button");
  use.type = "button";
  use.className = "iw-use";
  use.textContent = "F";
  use.setAttribute("aria-label", "Use");
  use.hidden = true;
  document.body.append(prompt, toastEl, use);
  const showTouch = () => { use.hidden = false; prompt.classList.add("iw-touch"); };
  const coarse = matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window;
  if (touch || coarse) showTouch();
  const onTouch = () => showTouch();
  addEventListener("touchstart", onTouch, { once: true, passive: true });
  for (const ev of ["pointerdown", "pointerup", "touchstart", "touchend"]) use.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev.startsWith("touch") });
  use.addEventListener("click", (e) => { e.preventDefault(); actFn?.(); });
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
      use.classList.toggle("on", !!text);
      prompt.hidden = !text;
      prompt.innerHTML = "";
      if (!text) return;
      const k = document.createElement("kbd");
      k.textContent = "F";
      if (prompt.classList.contains("iw-touch")) prompt.append(document.createTextNode(text));
      else prompt.append(k, document.createTextNode(text));
    },
    toast(text) { toastEl.hidden = !text; toastEl.textContent = text || ""; },
    dispose() { removeEventListener("keydown", onKey); removeEventListener("touchstart", onTouch); prompt.remove(); toastEl.remove(); use.remove(); },
  };
}

