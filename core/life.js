import { isWalkable, surfaceHeight, DIRS } from "./level.js";

export const KNOCK_S = 1.5, FLOP_S = 1.3, INVULN_S = 1.1, PRAT_S = 0.8;
export const FALLS = { pause: 1.9, spin: 1.7, shrink: 1.8 };
export const FALL_VARIANTS = Object.keys(FALLS);

const N4 = Object.values(DIRS);

export function bonfireRestCell(level, things) {
  const fires = (things?.things || level.things || []).filter((t) => t.kind === "bonfire");
  if (!fires.length) return null;
  const s = level.spawn || [0, 0];
  const d = (c) => Math.abs(c[0] - s[0]) + Math.abs(c[1] - s[1]);
  const fire = fires.slice().sort((a, b) => d([a.x, a.z]) - d([b.x, b.z]))[0];
  const near = N4.map(([dx, dz]) => [fire.x + dx, fire.z + dz]).filter(([x, z]) => isWalkable(level, x, z));
  return near.sort((a, b) => d(a) - d(b))[0] || null;
}

export function createLife({ level, actor, things = null, health, onRespawn = null, variant = null, random = Math.random }) {
  const listeners = new Set();
  const emit = (e) => { for (const f of [...listeners]) f(e); };
  let busy = null, invuln = 0;
  const respawnCell = () => things?.spawnCell() || bonfireRestCell(level, things) || level.spawn;
  const pickVariant = () => (FALLS[variant] ? variant : FALL_VARIANTS[Math.floor(random() * FALL_VARIANTS.length) % FALL_VARIANTS.length]);
  const begin = (kind, dir, cause, extra = {}) => {
    busy = { kind, t: 0, dur: kind === "knock" ? KNOCK_S : kind === "fall" ? FALLS[extra.variant] : FLOP_S, dir: dir ? dir.slice() : [0, 0], cause, from: [actor.pos.x, actor.pos.z], y: actor.y, ...extra };
    actor.teeter = null;
    actor.slide = null;
    actor.path = [];
    actor.tapDir = null;
    actor.moving = false;
    actor.locked = true;
    actor.fx = busy;
    emit({ type: kind, cause, dir: busy.dir, ...extra });
  };
  const respawn = () => {
    const c = respawnCell();
    const was = busy?.kind;
    busy = null;
    actor.fx = null;
    actor.blink = 0;
    actor.cell = [c[0], c[1]];
    actor.pos.x = c[0] + 0.5;
    actor.pos.z = c[1] + 0.5;
    actor.y = surfaceHeight(level, actor.pos.x, actor.pos.z);
    actor.path = [];
    actor.held = null;
    actor.tapDir = null;
    actor.moving = false;
    actor.locked = false;
    actor.teeter = null;
    actor.slide = null;
    actor.pratfall = was === "fall" || was === "knock" ? PRAT_S : 0;
    invuln = INVULN_S;
    health.refill("respawn");
    onRespawn?.(c);
    emit({ type: "respawn", cell: c.slice(), after: was || null });
  };
  actor.fall = (dir, o) => api.fall(dir, o);
  const api = {
    get busy() { return busy ? busy.kind : null; },
    get invulnerable() { return invuln > 0; },
    respawnCell,
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    hurt(n = 1, { cause = null, back = null } = {}) {
      if (!(n > 0)) return false;
      if (busy || invuln > 0) return false;
      const r = health.hit(n, cause);
      invuln = INVULN_S;
      if (r.absorbed) { emit({ type: "absorb", cause }); return "absorbed"; }
      actor.blink = INVULN_S;
      if (back && isWalkable(level, back[0], back[1])) {
        actor.path = [[back[0], back[1]]];
        actor.tapDir = null;
      }
      emit({ type: "hurt", n, cause, hearts: health.hearts });
      if (r.dead) begin("flop", null, cause);
      return true;
    },
    fall(dir, { cause = "edge", forced = false } = {}) {
      if (busy) return false;
      const d = typeof dir === "string" ? DIRS[dir] : dir;
      if (!d) return false;
      begin("fall", d, cause, { forced: !!forced, variant: pickVariant() });
      return true;
    },
    knock(dir = [0, 0], cause = null) {
      if (busy) return false;
      if (health.absorb(cause)) { invuln = INVULN_S; emit({ type: "absorb", cause }); return "absorbed"; }
      begin("knock", dir, cause);
      return true;
    },
    update(dt) {
      if (invuln > 0) invuln = Math.max(0, invuln - dt);
      if (actor.blink > 0) actor.blink = Math.max(0, actor.blink - dt);
      if (!busy) return;
      busy.t += dt;
      if (busy.t >= busy.dur) respawn();
    },
    respawn,
  };
  return api;
}
