import { DIRS, canStep, surfaceHeight, edgeFall } from "./level.js";

export const TEETER_S = 1.4, SLIDE_SPEED = 1.6;
const dirOf = (dx, dz) => Object.keys(DIRS).find((k) => DIRS[k][0] === dx && DIRS[k][1] === dz) || null;

export function createActor(L, cell, { speed = 3.2 } = {}) {
  const a = {
    cell: [...cell],
    pos: { x: cell[0] + 0.5, z: cell[1] + 0.5 },
    y: 0,
    facing: 0,
    speed,
    path: [],
    moving: false,
    walkPhase: 0,
    held: null,
    tapDir: null,
    locked: false,
    pause: false,
    presses: 0,
    teeter: null,
    slide: null,
    pratfall: 0,
  };
  a.y = surfaceHeight(L, a.pos.x, a.pos.z);

  a.setPath = (cells) => {
    if (!cells || !cells.length) return;
    const next = a.path[0];
    let list = cells;
    if (next) {
      const i = cells.findIndex((c) => c[0] === next[0] && c[1] === next[1]);
      list = i >= 0 ? cells.slice(i) : [next];
    } else if (cells[0][0] === a.cell[0] && cells[0][1] === a.cell[1]) {
      list = cells.slice(1);
    }
    a.path = list.map((c) => [c[0], c[1]]);
  };

  a.stepDir = (dir) => {
    if (!dir || !canStep(L, a.cell[0], a.cell[1], dir)) return false;
    a.path = [[a.cell[0] + DIRS[dir][0], a.cell[1] + DIRS[dir][1]]];
    return true;
  };

  a.edgeAt = (dir) => edgeFall(L, a.cell[0], a.cell[1], dir);

  const teeterOrFall = (dir) => {
    const T = a.teeter;
    if (T && T.dir === dir) {
      if (a.presses > T.press) { a.teeter = null; a.fall?.(dir, { forced: false, cause: "edge" }); }
      return;
    }
    a.teeter = { dir, t: 0, press: a.presses };
    a.facing = Math.atan2(DIRS[dir][0], DIRS[dir][1]);
    a.onTeeter?.(dir);
  };

  const slideOn = () => {
    const d = a.slide;
    a.tapDir = null;
    if (canStep(L, a.cell[0], a.cell[1], d)) { a.path = [[a.cell[0] + DIRS[d][0], a.cell[1] + DIRS[d][1]]]; return; }
    a.slide = null;
    if (a.edgeAt(d)) a.fall?.(d, { forced: true, cause: "slide" });
    else a.blocked?.(d);
  };

  const arrived = (from) => {
    const dir = dirOf(a.cell[0] - from[0], a.cell[1] - from[1]);
    if (dir && a.slick?.(a.cell[0], a.cell[1])) { a.slide = dir; a.path = []; }
    else a.slide = null;
  };

  const pull = () => {
    if (a.path.length || a.pause) return;
    if (a.slide) { slideOn(); return; }
    const d = a.held || a.tapDir;
    a.tapDir = null;
    const dirs = typeof d === "function" ? d() || [] : d ? [d] : [];
    if (!dirs.length) return;
    if (dirs.some((x) => a.stepDir(x))) { a.teeter = null; return; }
    const edge = dirs.find((x) => a.edgeAt(x));
    if (edge) { teeterOrFall(edge); return; }
    if (a.teeter && a.teeter.dir !== dirs[0]) a.teeter = null;
    a.blocked?.(dirs[0]);
  };

  a.update = (dt) => {
    if (a.pratfall > 0) a.pratfall = Math.max(0, a.pratfall - dt);
    if (a.locked) { a.path = []; a.tapDir = null; a.moving = false; a.walkPhase = 0; a.teeter = null; a.slide = null; return; }
    if (a.teeter && (a.teeter.t += dt) >= TEETER_S) a.teeter = null;
    let budget = a.speed * dt * (a.slide ? SLIDE_SPEED : 1);
    pull();
    const wasMoving = a.path.length > 0;
    if (wasMoving) a.teeter = null;
    while (budget > 0 && a.path.length) {
      const [tx, tz] = a.path[0];
      const gx = tx + 0.5, gz = tz + 0.5;
      const dx = gx - a.pos.x, dz = gz - a.pos.z, d = Math.hypot(dx, dz);
      if (d > 1e-6) a.facing = Math.atan2(dx, dz);
      if (d <= budget) {
        const from = a.cell;
        a.pos.x = gx; a.pos.z = gz; a.cell = [tx, tz];
        a.path.shift();
        budget -= d;
        arrived(from);
        pull();
      } else {
        a.pos.x += (dx / d) * budget; a.pos.z += (dz / d) * budget;
        budget = 0;
      }
    }
    a.moving = wasMoving || a.path.length > 0;
    if (a.moving) a.walkPhase += dt * a.speed * Math.PI * 1.6;
    else a.walkPhase = 0;
    a.y = heightOf();
  };

  const heightOf = () => {
    const t = a.path[0];
    if (t && L.links?.size && L.links.has(a.cell[0] + "," + a.cell[1] + ">" + t[0] + "," + t[1])) {
      const h0 = surfaceHeight(L, a.cell[0] + 0.5, a.cell[1] + 0.5), h1 = surfaceHeight(L, t[0] + 0.5, t[1] + 0.5);
      const u = 1 - Math.min(1, Math.hypot(t[0] + 0.5 - a.pos.x, t[1] + 0.5 - a.pos.z));
      return h0 + (h1 - h0) * u;
    }
    return surfaceHeight(L, a.pos.x, a.pos.z);
  };

  return a;
}
