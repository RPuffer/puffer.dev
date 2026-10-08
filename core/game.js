import { createInput } from "./input.js";
import { createActor } from "./actor.js";
import { pathToward } from "./path.js";
import { DIRS, isWalkable } from "./level.js";
import { makeProjection, viewFrom } from "./iso.js";
import { createInteract } from "./interact.js";

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

export function createGame(renderer, params = readParams()) {
  const state = { level: null, view: null, proj: null, actor: null, params, things: null, time: 0, frame: 0 };

  const input = createInput(renderer.element || document.body, { dpad: params.dpad === "1" || params.touch === "1" ? true : "auto" });
  input.on((it) => {
    const { actor, proj, things, level } = state;
    if (!actor) return;
    if (it.kind === "hold") {
      actor.held = it.dir ? screenToWorldDir(proj, it.dir) : null;
      if (it.press && !actor.locked) actor.tapDir = screenToWorldDir(proj, it.press);
    }
    if (it.kind === "tap") {
      const cell = renderer.pick?.(it.x, it.y, it.w, it.h);
      if (!cell) return;
      if (actor.locked || things?.tap(cell)) return;
      const from = actor.path[0] || actor.cell;
      const p = pathToward(level, from, cell);
      if (p) actor.setPath(p);
    }
  });

  const tick = () => {
    state.actor.update(STEP);
    state.things?.update(STEP);
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
    load(level, { arrive = params.arrive, spawn = params.spawn, reset = params.reset, from = params.from, at = null, navigate } = {}) {
      state.things?.dispose();
      if (state.level) renderer.unmount?.(state);
      const p = { ...params, level: level.name, arrive, spawn, reset, from };
      for (const k of ["arrive", "spawn", "reset", "from"]) if (p[k] == null) delete p[k];
      const view = viewFrom(level, p);
      const proj = makeProjection(view);
      const sp = String(spawn || "").split(",").map(Number);
      const things = level.things?.length ? createInteract(level, { params: p, navigate }) : null;
      const cellOk = (c) => Array.isArray(c) && c.length === 2 && isWalkable(level, c[0], c[1]) ? c : null;
      const cell = cellOk(sp) || cellOk(at) || things?.arrivalCell() || things?.spawnCell() || level.spawn;
      const actor = createActor(level, cell);
      things?.bind(actor);
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
