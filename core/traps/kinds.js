import { isWalkable, isVoid, DIRS } from "../level.js";

export const KINDS = {};

export function defineTrap(id, impl) {
  KINDS[id] = impl;
  return impl;
}

const key = (x, z) => x + "," + z;
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const indexOf = (cells, c) => (c ? cells.findIndex((q) => same(q, c)) : -1);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const unit = (d) => [Math.sign(d[0]), Math.sign(d[1])];
const along = (cells) => (cells.length > 1 ? unit(sub(cells[1], cells[0])) : [1, 0]);
const isStraight = (cells) => {
  if (cells.length < 2) return true;
  const d = along(cells);
  return cells.every((c, i) => same(c, add(cells[0], [d[0] * i, d[1] * i])));
};
const block = (level, c, on) => { if (on) level.blocked.add(key(c[0], c[1])); else level.blocked.delete(key(c[0], c[1])); };

export const BEAT = 0.5;

defineTrap("t03", {
  beat: BEAT,
  init(t) { t.up = 0; t.beat = 0; },
  reset(t) { t.up = 0; },
  check(t, P) { return t.cells.length < 2 ? ["beat spikes need a run of two or more cells"] : []; },
  update(t, dt, ctx) {
    const phase = (ctx.time / BEAT) % 4;
    t.beat = Math.floor(phase);
    const want = t.beat === 2 ? 1 : 0;
    t.up += (want - t.up) * Math.min(1, dt * (want ? 30 : 12));
    if (t.up > 0.6 && ctx.onAny(t.cells)) {
      const back = ctx.prev();
      if (ctx.hurt(t, 1, { back })) ctx.emit(t, "spike");
    }
  },
});

defineTrap("t25", {
  windup: 0.55,
  check(t) { return indexOf(t.cells, t.plate) < 0 ? ["the plate must sit on the run"] : !isStraight(t.cells) ? ["the arrow run must be straight"] : []; },
  init(t) { t.fireAt = null; t.volley = -1; t.armed = true; t.pressed = 0; },
  reset(t) { t.fireAt = null; t.volley = -1; t.armed = true; t.pressed = 0; },
  enter(t, c, prev, ctx) {
    if (!same(c, t.plate) || !t.armed) return;
    t.armed = false;
    t.pressed = 1;
    t.fireAt = ctx.time + this.windup;
    ctx.emit(t, "click");
  },
  update(t, dt, ctx) {
    if (t.volley >= 0) t.volley += dt;
    if (t.volley > 0.6) t.volley = -1;
    if (t.fireAt != null && ctx.time >= t.fireAt) {
      t.fireAt = null;
      t.volley = 0;
      ctx.emit(t, "volley");
      if (ctx.onAny(t.cells.filter((c) => !same(c, t.plate)))) ctx.hurt(t, 1);
    }
    if (!t.armed && t.fireAt == null && t.volley < 0 && !ctx.on(t.plate)) { t.armed = true; t.pressed = 0; }
  },
});

defineTrap("t22", {
  hang: 1.5, fall: 0.12, settle: 0.45, rise: 0.8,
  check(t) { return t.cells.length !== 1 ? ["the pancake stone covers one cell"] : []; },
  init(t) { t.phase = 0; t.drop = 0; t.slam = -1; },
  reset(t) { t.phase = 0; t.drop = 0; t.slam = -1; },
  disarm(t) { t.drop = 0; t.slam = -1; },
  update(t, dt, ctx) {
    const cycle = this.hang + this.fall + this.settle + this.rise;
    const was = t.phase;
    t.phase = (t.phase + dt) % cycle;
    const p = t.phase;
    t.drop = p < this.hang ? 0 : p < this.hang + this.fall ? (p - this.hang) / this.fall : p < this.hang + this.fall + this.settle ? 1 : 1 - (p - this.hang - this.fall - this.settle) / this.rise;
    t.shadow = p < this.hang ? p / this.hang : t.drop;
    if (was < this.hang + this.fall && p >= this.hang + this.fall) { t.slam = 0; ctx.emit(t, "slam"); if (ctx.on(t.cells[0])) ctx.hurt(t, 2, { back: ctx.prev() }); }
    if (t.slam >= 0) { t.slam += dt; if (t.slam > 0.5) t.slam = -1; }
    if (t.drop > 0.95 && ctx.on(t.cells[0])) ctx.hurt(t, 2, { back: ctx.prev() });
  },
});

defineTrap("t02", {
  worst(t) { return { blocked: t.cells }; },
  check(t) { return t.cells.length < 3 || t.cells.length > 5 ? ["worn flagstones cover 3 to 5 loop cells"] : []; },
  init(t) { t.crossings = 0; t.broken = false; t.dropAt = null; },
  reset(t, ctx) { if (t.broken) for (const c of t.cells) block(ctx.level, c, false); t.crossings = 0; t.broken = false; t.dropAt = null; },
  disarm(t, ctx) { if (t.broken) for (const c of t.cells) block(ctx.level, c, false); t.broken = false; t.dropAt = null; },
  enter(t, c, prev, ctx) {
    if (t.broken || (prev && indexOf(t.cells, prev) >= 0)) return;
    t.crossings++;
    ctx.emit(t, "crack", { crossings: t.crossings });
    if (t.crossings >= 3) t.dropAt = ctx.time + 0.35;
  },
  update(t, dt, ctx) {
    if (t.dropAt == null || ctx.time < t.dropAt) return;
    t.dropAt = null;
    t.broken = true;
    for (const c of t.cells) block(ctx.level, c, true);
    ctx.emit(t, "collapse");
    if (ctx.onAny(t.cells)) ctx.knock(t, [0, 0]);
  },
});

defineTrap("t24", {
  windup: 0.7, kick: 0.25, recover: 1.4, reach: 2,
  cells(t) { return [...t.cells, t.boss]; },
  extra(t) { return [t.boss]; },
  danger(t) { return t.cells; },
  worst(t) { return { blocked: [t.boss] }; },
  check(t, P) {
    const out = [];
    if (indexOf(t.cells, t.kick) < 0) out.push("the kick cell must sit on the run");
    if (!t.boss || Math.abs(t.boss[0] - t.kick[0]) + Math.abs(t.boss[1] - t.kick[1]) !== 1) out.push("the boss stands on a shoulder cell beside the kick cell");
    return out;
  },
  init(t, ctx) { t.state = "idle"; t.timer = 0; t.leg = 0; block(ctx.level, t.boss, true); },
  reset(t) { t.state = "idle"; t.timer = 0; t.leg = 0; },
  disarm(t) { t.state = "idle"; t.leg = 0; },
  update(t, dt, ctx) {
    const f = ctx.floor();
    const ki = indexOf(t.cells, t.kick), fi = indexOf(t.cells, f);
    const near = fi >= 0 && Math.abs(fi - ki) <= this.reach && !ctx.actor.fx;
    t.timer += dt;
    if (t.state === "idle") {
      t.leg += (0 - t.leg) * Math.min(1, dt * 8);
      if (near) { t.state = "windup"; t.timer = 0; ctx.emit(t, "windup"); }
    } else if (t.state === "windup") {
      t.leg = Math.min(1, t.timer / this.windup);
      if (t.timer >= this.windup) { t.state = "kick"; t.timer = 0; ctx.emit(t, "kick"); }
    } else if (t.state === "kick") {
      t.leg = 1 + Math.min(1, t.timer / 0.08);
      if (ctx.on(t.kick)) {
        ctx.knock(t, sub(t.kick, t.boss));
        ctx.emit(t, "punt");
        t.state = "recover"; t.timer = 0;
      } else if (t.timer >= this.kick) { t.state = "recover"; t.timer = 0; ctx.emit(t, "whiff"); }
    } else if (t.state === "recover") {
      t.leg = Math.max(0, 1 - t.timer / 0.3);
      if (t.timer >= this.recover) { t.state = "idle"; t.timer = 0; }
    }
  },
});

defineTrap("t26", {
  speed: 5.5, rumble: 0.9, gap: 1.5,
  cells(t) { return [...t.cells, ...(t.plate && indexOf(t.cells, t.plate) < 0 ? [t.plate] : [])]; },
  extra(t) { return t.notches || []; },
  danger(t) { return [...t.cells, ...(t.plate && indexOf(t.cells, t.plate) < 0 ? [t.plate] : [])]; },
  check(t, P) {
    const out = [];
    if (t.cells.length < 5) out.push("the chariot lane needs five or more cells");
    if (!isStraight(t.cells)) out.push("the chariot lane must be straight");
    for (let i = 2; i < t.cells.length; i += 3) {
      const n = (t.notches || []).find((q) => Math.abs(q[0] - t.cells[i][0]) + Math.abs(q[1] - t.cells[i][1]) === 1);
      if (!n) out.push(`no shoulder notch beside lane cell ${i}`);
      else if (!isWalkable(P, n[0], n[1])) out.push(`notch ${n} is not walkable`);
    }
    return out;
  },
  init(t) { t.awake = false; t.pos = null; t.next = null; t.idle = 0; },
  reset(t) { t.awake = false; t.pos = null; t.next = null; t.idle = 0; },
  disarm(t) { t.awake = false; t.pos = null; t.next = null; },
  enter(t, c, prev, ctx) {
    if (!same(c, t.plate) || t.awake) return;
    t.awake = true;
    t.idle = 0;
    t.next = ctx.time + this.rumble;
    ctx.emit(t, "wake");
  },
  update(t, dt, ctx) {
    if (!t.awake) return;
    const n = t.cells.length, f = ctx.floor();
    const zone = [...t.cells, ...(t.notches || []), t.plate].filter(Boolean);
    const close = !!f && zone.some((c) => Math.max(Math.abs(c[0] - f[0]), Math.abs(c[1] - f[1])) <= 3);
    t.idle = close ? 0 : t.idle + dt;
    if (t.pos == null) {
      if (t.idle > 2) { t.awake = false; t.next = null; ctx.emit(t, "sleep"); return; }
      if (t.next != null && ctx.time >= t.next) { t.pos = -1.5; ctx.emit(t, "charge"); }
      return;
    }
    t.pos += this.speed * dt;
    const fi = indexOf(t.cells, f);
    if (fi >= 0 && Math.abs(t.pos - fi) < 0.8 && ctx.on(f)) { ctx.knock(t, along(t.cells)); ctx.emit(t, "run-over"); }
    if (t.pos > n + 1.5) { t.pos = null; t.next = ctx.time + this.gap; ctx.emit(t, "pass"); }
  },
});

defineTrap("t21", {
  worst(t) { return { blocked: t.cells }; },
  check(t, P) {
    const c = t.cells[0];
    const around = Object.values(DIRS).map((d) => add(c, d)).filter((q) => isWalkable(P, q[0], q[1]));
    return around.length < 3 ? ["the invisible block needs a walkable shoulder to step around"] : [];
  },
  init(t) { t.solid = false; t.hits = 0; t.star = -1; },
  reveal(t, ctx) { if (!t.solid) { t.solid = true; block(ctx.level, t.cells[0], true); } },
  reset(t, ctx) { if (t.solid) block(ctx.level, t.cells[0], false); t.solid = false; t.chalk = t.hits >= 2; if (t.chalk) t.revealed = true; },
  disarm(t, ctx) { if (t.solid) block(ctx.level, t.cells[0], false); t.solid = false; },
  rest(t) { t.hits = 0; t.chalk = false; },
  update(t, dt, ctx) {
    if (t.star >= 0) { t.star += dt; if (t.star > 0.8) t.star = -1; }
    if (t.solid) return;
    const a = ctx.actor, c = t.cells[0], next = a.path[0];
    if (!next || !same(next, c) || a.fx || a.airborne) return;
    if (Math.hypot(a.pos.x - (c[0] + 0.5), a.pos.z - (c[1] + 0.5)) > 0.62) return;
    a.path = [];
    a.held = null;
    a.tapDir = null;
    a.pos.x = a.cell[0] + 0.5;
    a.pos.z = a.cell[1] + 0.5;
    t.hits++;
    t.star = 0;
    ctx.reveal(t);
    ctx.emit(t, "bonk");
    ctx.hurt(t, 1);
  },
});

defineTrap("t33", {
  radius: 3,
  inZone(t, f) { const z = t.zone; return !z || (!!f && f[0] >= z[0] && f[0] <= z[2] && f[1] >= z[1] && f[1] <= z[3]); },
  init(t) { t.on = !t.zone; t.told = false; t.thick = t.on ? 1 : 0; },
  update(t, dt, ctx) {
    t.on = this.inZone(t, ctx.floor());
    t.thick += ((t.on ? 1 : 0) - t.thick) * Math.min(1, dt * 3);
    if (t.on && !t.told && ctx.time > 0.4) { t.told = true; ctx.say(t.text || "Fog rolls in. You see three cells around you."); ctx.emit(t, "banner"); }
  },
  disarm(t) { t.on = false; t.thick = 0; },
});

defineTrap("t40", {
  cells(t) { return t.plates || []; },
  check(t, P) {
    const out = [];
    if ((t.plates || []).length !== 4) out.push("order plates need four plates");
    if (!t.gate) out.push("order plates gate a reward: set gate to a gate thing id");
    return out;
  },
  init(t, ctx) {
    const g = ctx.things?.byId?.[t.gate];
    t.solved = g?.state === "open";
    t.step = 0;
    t.show = null;
    t.wrong = -1;
    t.inside = false;
    t.lit = [0, 0, 0, 0];
  },
  reset(t) { if (!t.solved) { t.step = 0; t.show = null; t.wrong = -1; t.inside = false; t.lit = [0, 0, 0, 0]; } },
  enter(t, c, prev, ctx) {
    if (t.solved) return;
    if (!t.inside) { t.inside = true; t.step = 0; t.show = 0; ctx.emit(t, "show"); return; }
    if (t.show != null) return;
    const p = indexOf(t.plates, c);
    if (p < 0) return;
    if (t.order[t.step] === p) {
      t.step++;
      ctx.emit(t, "press", { plate: p });
      if (t.step === 4) {
        t.solved = true;
        ctx.solve(t);
        ctx.emit(t, "solved");
        ctx.say(t.text || "Somewhere, a gate grinds open.");
      }
    } else if (!t.order.slice(0, t.step).includes(p)) {
      t.step = 0;
      t.wrong = 0;
      t.show = -0.9;
      ctx.emit(t, "raspberry");
      ctx.say("Pbbbt. The plates reset.");
    }
  },
  update(t, dt, ctx) {
    const f = ctx.floor();
    const here = !!f && indexOf(t.cells, f) >= 0 && !ctx.actor.fx;
    if (t.inside && !here) { t.inside = false; if (!t.solved) { t.step = 0; t.show = null; } }
    else if (!t.inside && here && !t.solved) { t.inside = true; t.step = 0; t.show = 0; ctx.emit(t, "show"); }
    if (t.wrong >= 0) { t.wrong += dt; if (t.wrong > 0.6) t.wrong = -1; }
    const lit = [0, 0, 0, 0];
    if (t.solved) lit.fill(1);
    else if (t.show != null) {
      t.show += dt;
      const k = Math.floor(t.show / 0.6), u = t.show / 0.6 - k;
      if (t.show >= 0 && k < 4) lit[t.order[k]] = u < 0.75 ? 1 : 0;
      if (k >= 4) t.show = null;
    } else for (let i = 0; i < t.step; i++) lit[t.order[i]] = 1;
    t.lit = lit;
  },
});

defineTrap("t18", {
  check(t, P) { return []; },
  init(t) { t.spent = false; t.boing = -1; },
  reset(t) { t.spent = false; t.boing = -1; },
  enter(t, c, prev, ctx) {
    if (t.spent || !prev) return;
    const d = unit(sub(c, prev));
    if (!d[0] && !d[1]) return;
    const one = sub(c, d), two = sub(one, d);
    const P = ctx.level;
    const ok = (q) => isWalkable(P, q[0], q[1]), gone = (q) => !ok(q) && isVoid(P, q[0], q[1]);
    const to = ok(one) ? (ok(two) || gone(two) ? two : one) : gone(one) ? one : null;
    if (!to) return;
    t.spent = true;
    t.boing = 0;
    t.dir = [-d[0], -d[1]];
    ctx.fling(to, 0.5, t);
    ctx.emit(t, "boing");
  },
  update(t, dt) { if (t.boing >= 0) { t.boing += dt; if (t.boing > 0.6) t.boing = -1; } },
});

defineTrap("t23", {
  init(t) { t.spin = 0; t.turn = 0; },
  reset(t) { t.turn = 0; },
  enter(t, c, prev, ctx) {
    if (!prev) return;
    t.turn = 1;
    ctx.emit(t, "turn");
    ctx.rotate(1);
  },
  update(t, dt) { t.turn = Math.max(0, t.turn - dt * 1.5); t.spin += dt * (0.6 + 4 * t.turn); },
});

defineTrap("t52", {
  slick: true,
  check(t) { return t.cells.length ? [] : ["the ice needs at least one cell"]; },
  init(t) { t.glint = 0; },
  update(t, dt) { t.glint = (t.glint + dt) % 3; },
});
