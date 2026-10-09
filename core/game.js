import { createInput } from "./input.js";
import { createActor } from "./actor.js";
import { routeTo } from "./path.js";
import { createRoute } from "./route.js";
import { DIRS, isWalkable } from "./level.js";
import { makeProjection, viewFrom } from "./iso.js";
import { createInteract, storageKey } from "./interact.js";

export const STEP = 1 / 60;

export function readParams(search = location.search) {
  const q = new URLSearchParams(search);
  const out = { level: q.get("level") || "home", seed: q.get("seed") || "1" };
  for (const [k, v] of q) if (!(k in out)) out[k] = v;
  return out;
}

const SCREEN = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function screenToWorldDir(proj, screenDir) {
  const [ux, uy] = SCREEN[screenDir];
  const c = Math.SQRT1_2, ix = ux * c - uy * c, iy = ux * c + uy * c;
  let best = null, bd = -Infinity;
  for (const [dir, [dx, dz]] of Object.entries(DIRS)) {
    const s = proj.project(dx, 0, dz);
    const len = Math.hypot(s.sx, s.sy) || 1;
    const d = (s.sx * ix + s.sy * iy) / len;
    if (d > bd) { bd = d; best = dir; }
  }
  return best;
}

export const TURN = 0.35;
const wrapYaw = (y) => ((y % 360) + 360) % 360;
const easeTurn = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const hasParam = (p, k) => p[k] != null && p[k] !== "" && !isNaN(+p[k]);

export function savedYaw(name, storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(storageKey(name)) || "null")?.yaw; return Number.isFinite(v) ? v : null; } catch { return null; }
}

export function saveYaw(name, yaw, storage = globalThis.localStorage) {
  try {
    const k = storageKey(name), v = JSON.parse(storage?.getItem(k) || "null") || {};
    v.yaw = wrapYaw(yaw);
    storage?.setItem(k, JSON.stringify(v));
  } catch {}
}

export function createGame(renderer, params = readParams()) {
  const state = { level: null, view: null, proj: null, actor: null, params, things: null, time: 0, frame: 0, turn: null, route: createRoute(), mark: null };
  let screenHeld = null;

  const input = createInput(renderer.element || document.body, { dpad: params.dpad === "1" || params.touch === "1" ? true : "auto" });
  input.on((it) => {
    const { actor, proj, things, level } = state;
    if (!actor) return;
    if (it.kind === "rotate") { game.rotate(it.step); return; }
    if (it.kind === "zoom") { game.zoom(it.step); return; }
    if (it.kind === "hold") {
      screenHeld = it.dir || null;
      actor.held = it.dir ? screenToWorldDir(proj, it.dir) : null;
      if (it.press && !actor.locked) { state.route.cancel(); actor.tapDir = screenToWorldDir(proj, it.press); }
    }
    if (it.kind === "tap") {
      const cell = renderer.pick?.(it.x, it.y, it.w, it.h);
      if (!cell || actor.locked) return;
      if (things?.tap(cell)) { if (actor.path.length) { state.route.follow(cell); markAt(cell, true); } return; }
      const r = routeTo(level, actor.path[0] || actor.cell, cell);
      markAt(cell, !!r?.reached);
      if (r) state.route.set(r.cells, cell, r.reached);
    }
  });

  const markAt = (cell, ok) => { state.mark = { cell: [cell[0], cell[1]], ok, time: state.time }; };

  const tickers = new Set();
  const orient = () => {
    state.proj = makeProjection(state.view);
    if (screenHeld && state.actor?.held) state.actor.held = screenToWorldDir(state.proj, screenHeld);
  };
  const stepTurn = (dt) => {
    const T = state.turn;
    if (!T) return;
    T.t = Math.min(TURN, T.t + dt);
    const u = easeTurn(T.t / TURN);
    state.view.yaw = T.from + (T.to - T.from) * u;
    if (T.t >= TURN) { state.view.yaw = wrapYaw(T.to); state.turn = null; }
    orient();
  };
  const tick = () => {
    stepTurn(STEP);
    state.actor.update(STEP);
    state.route.update();
    state.things?.update(STEP);
    for (const f of tickers) f(STEP);
    renderer.update?.(state, STEP);
    state.time += STEP;
  };

  let acc = 0, last = performance.now(), raf = 0, running = false, started = false;
  const frame = (now) => {
    if (!running) return;
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= STEP) { tick(); acc -= STEP; }
    renderer.render(state, acc / STEP);
    state.frame++;
    if (state.frame === 1) requestAnimationFrame(() => { window.__done = true; });
    raf = requestAnimationFrame(frame);
  };

  const game = {
    state,
    renderer,
    onTick(f) { tickers.add(f); return () => tickers.delete(f); },
    canRotate: () => true,
    canZoom: () => true,
    zoom(step) { return !!(state.actor && game.canZoom() && renderer.zoomStep?.(step)); },
    rotate(step = 1) {
      if (!renderer.onOrient || !state.view || !state.actor || !step || !game.canRotate()) return false;
      const base = state.turn ? state.turn.to : state.view.yaw;
      const to = base + Math.sign(step) * 90;
      state.turn = { from: state.view.yaw, to, t: 0 };
      if (state.params.hero !== "0") saveYaw(state.level.name, to);
      return true;
    },
    get yaw() { return wrapYaw(state.turn ? state.turn.to : state.view?.yaw ?? 45); },
    load(level, { arrive = params.arrive, spawn = params.spawn, reset = params.reset, from = params.from, at = null, navigate, keep = false } = {}) {
      state.things?.dispose();
      if (state.level && !keep) renderer.unmount?.(state);
      const p = { ...params, level: level.name, arrive, spawn, reset, from };
      for (const k of ["arrive", "spawn", "reset", "from"]) if (p[k] == null) delete p[k];
      const view = viewFrom(level, p);
      const carry = keep && state.view ? wrapYaw(state.turn ? state.turn.to : state.view.yaw) : null;
      const reference = p.hero === "0" || p.seq === "0";
      if (p.reset === "1" && carry == null) { try { globalThis.localStorage?.removeItem(storageKey(level.name)); } catch {} }
      if (!hasParam(p, "yaw")) {
        if (carry != null) view.yaw = carry;
        else if (!reference && renderer.onOrient && p.reset !== "1") { const y = savedYaw(level.name); if (y != null) view.yaw = y; }
      }
      state.turn = null;
      const proj = makeProjection(view);
      const sp = String(spawn || "").split(",").map(Number);
      const things = level.things?.length ? createInteract(level, { params: p, navigate }) : null;
      const cellOk = (c) => Array.isArray(c) && c.length === 2 && isWalkable(level, c[0], c[1]) ? c : null;
      const cell = cellOk(sp) || cellOk(at) || things?.arrivalCell() || things?.spawnCell() || level.spawn;
      const actor = createActor(level, cell);
      things?.bind(actor);
      state.route.bind(actor);
      state.mark = null;
      Object.assign(state, { level, view, proj, actor, params: p, things });
      if (renderer.mount) renderer.mount(state); else renderer.init?.(state);
      renderer.update?.(state, 0);
      if (!started) { started = running = true; acc = 0; last = performance.now(); raf = requestAnimationFrame(frame); }
      return state;
    },
    stop() { running = false; cancelAnimationFrame(raf); input.dispose(); state.things?.dispose(); },
    pause() { running = false; cancelAnimationFrame(raf); },
    advance(seconds) {
      for (let n = Math.round(seconds / STEP); n > 0; n--) tick();
      renderer.render(state, 0);
      state.frame++;
    },
  };
  window.__game = game;
  return game;
}

export function start(level, renderer, { params = readParams() } = {}) {
  const game = createGame(renderer, params);
  game.load(level);
  return game;
}
