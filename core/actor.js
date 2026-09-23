import { DIRS, canStep, surfaceHeight } from "./level.js";

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

  a.update = (dt) => {
    let budget = a.speed * dt;
    if (!a.path.length && a.held) a.stepDir(a.held);
    const wasMoving = a.path.length > 0;
    while (budget > 0 && a.path.length) {
      const [tx, tz] = a.path[0];
      const gx = tx + 0.5, gz = tz + 0.5;
      const dx = gx - a.pos.x, dz = gz - a.pos.z, d = Math.hypot(dx, dz);
      if (d > 1e-6) a.facing = Math.atan2(dx, dz);
      if (d <= budget) {
        a.pos.x = gx; a.pos.z = gz; a.cell = [tx, tz];
        a.path.shift();
        budget -= d;
        if (!a.path.length && a.held) a.stepDir(a.held);
      } else {
        a.pos.x += (dx / d) * budget; a.pos.z += (dz / d) * budget;
        budget = 0;
      }
    }
    a.moving = wasMoving || a.path.length > 0;
    if (a.moving) a.walkPhase += dt * a.speed * Math.PI * 1.6;
    else a.walkPhase = 0;
    a.y = surfaceHeight(L, a.pos.x, a.pos.z);
  };

  return a;
}
