import { createInput } from "./input.js";
import { createActor } from "./actor.js";
import { pathToward } from "./path.js";
import { DIRS, isWalkable } from "./level.js";
import { makeProjection, viewFrom } from "./iso.js";

export const STEP = 1 / 60;

export function readParams(search = location.search) {
  const q = new URLSearchParams(search);
  const out = { level: q.get("level") || (q.get("seed") ? "gen" : "home"), seed: q.get("seed") || "1" };
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

export function start(level, renderer, { params = readParams() } = {}) {
  const view = viewFrom(level, params);
  const proj = makeProjection(view);
  const sp = String(params.spawn || "").split(",").map(Number);
  const spawn = sp.length === 2 && isWalkable(level, sp[0], sp[1]) ? sp : level.spawn;
  const actor = createActor(level, spawn);
  const state = { level, view, proj, actor, params, time: 0, frame: 0 };
  renderer.init?.(state);

  const input = createInput(renderer.element || document.body, { dpad: params.dpad === "1" ? true : "auto" });
  input.on((it) => {
    if (it.kind === "hold") actor.held = it.dir ? screenToWorldDir(proj, it.dir) : null;
    if (it.kind === "tap") {
      const cell = renderer.pick?.(it.x, it.y, it.w, it.h);
      if (!cell) return;
      const from = actor.path[0] || actor.cell;
      const p = pathToward(level, from, cell);
      if (p) actor.setPath(p);
    }
  });

  let acc = 0, last = performance.now(), raf = 0, running = true;
  const frame = (now) => {
    if (!running) return;
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      actor.update(STEP);
      renderer.update?.(state, STEP);
      state.time += STEP;
      acc -= STEP;
    }
    renderer.render(state, acc / STEP);
    state.frame++;
    if (state.frame === 1) requestAnimationFrame(() => { window.__done = true; });
    raf = requestAnimationFrame(frame);
  };
  renderer.update?.(state, 0);
  raf = requestAnimationFrame(frame);

  const game = {
    state,
    stop() { running = false; cancelAnimationFrame(raf); input.dispose(); },
  };
  window.__game = game;
  return game;
}
