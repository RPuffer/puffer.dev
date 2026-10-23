import { isWalkable, isVoid, DIRS, OPPOSITE, canStep } from "../level.js";

export const CHALK_HITS = 3;
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
  arrowSpeed: 6, margin: 0.25, walk: 3.2,
  cells(t) { return [...t.cells, ...(t.cover ? [t.cover] : [])]; },
  danger(t) { return t.cells; },
  coverAt(t) { return t.cover ? t.cells.findIndex((c) => Math.abs(c[0] - t.cover[0]) + Math.abs(c[1] - t.cover[1]) === 1) : -1; },
  timing(t, walk = this.walk) {
    const k = this.coverAt(t), v = this.arrowSpeed;
    const reach = (k + 1) / walk + this.margin;
    return { k, v, delay: Math.max(0.15, reach - (k + 0.1) / v) };
  },
  check(t, P) {
    const out = [];
    const n = t.cells.length, k = this.coverAt(t);
    if (!same(t.plate, t.cells[0])) out.push("the plate must be the first lane cell");
    if (!isStraight(t.cells)) out.push("the arrow lane must be straight");
    if (!t.cover) out.push("the arrow lane needs a cover cell beside it");
    else if (k < 1 || k > n - 3) out.push("the cover cell must sit beside lane cell 1 to n-3");
    else if (indexOf(t.cells, t.cover) >= 0 || !isWalkable(P, t.cover[0], t.cover[1])) out.push("the cover cell must be a walkable cell off the lane");
    else { const d = along(t.cells), o = sub(t.cover, t.cells[k]); if (o[0] * d[0] + o[1] * d[1] !== 0) out.push("the cover cell must sit out of the line of fire"); }
    return out;
  },
  init(t, ctx) { Object.assign(t, this.timing(t, ctx?.actor?.speed || this.walk)); this.reset(t); },
  reset(t) { t.fireAt = null; t.arrow = null; t.armed = true; t.pressed = 0; t.hit = -1; },
  disarm(t) { t.fireAt = null; t.arrow = null; t.pressed = 0; },
  enter(t, c, prev, ctx) {
    if (!same(c, t.plate) || !t.armed || (prev && indexOf(t.cells, prev) >= 0)) return;
    t.armed = false;
    t.pressed = 1;
    t.fireAt = ctx.time + t.delay;
    ctx.emit(t, "click");
  },
  update(t, dt, ctx) {
    if (t.hit >= 0) { t.hit += dt; if (t.hit > 0.6) t.hit = -1; }
    if (t.fireAt != null && ctx.time >= t.fireAt) { t.fireAt = null; t.arrow = -0.5; ctx.emit(t, "loose"); }
    if (t.arrow != null) {
      const was = t.arrow;
      t.arrow += t.v * dt;
      const fi = indexOf(t.cells, ctx.floor());
      if (fi >= 0 && ctx.on(t.cells[fi]) && t.arrow >= fi - 0.5 && was <= fi + 0.5) {
        t.arrow = null;
        t.hit = 0;
        ctx.emit(t, "arrow-hit");
        ctx.hurt(t, 1);
      } else if (t.arrow > t.cells.length + 0.5) { t.arrow = null; ctx.emit(t, "thunk"); }
    }
    if (!t.armed && t.fireAt == null && t.arrow == null && !ctx.on(t.plate)) { t.armed = true; t.pressed = 0; }
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
  reset(t, ctx) { if (t.solid) block(ctx.level, t.cells[0], false); t.solid = false; t.chalk = t.hits >= CHALK_HITS; if (t.chalk) t.revealed = true; },
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
    if (t.on) announce(t, ctx, "Fog rolls in. You see three cells around you.");
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

const N4 = Object.values(DIRS);
const near1 = (a, b) => !!a && !!b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const dirKey = (d) => Object.keys(DIRS).find((k) => DIRS[k][0] === d[0] && DIRS[k][1] === d[1]) || null;
const inZone = (t, f) => { const z = t.zone; return !z || (!!f && f[0] >= z[0] && f[0] <= z[2] && f[1] >= z[1] && f[1] <= z[3]); };
const onPath = (ctx, c) => !!ctx.level.cells[c[1]]?.[c[0]]?.p;
const shove = (ctx, from, d) => {
  const k = dirKey(d);
  if (!k || !canStep(ctx.level, from[0], from[1], k)) return false;
  ctx.actor.path = [add(from, d)];
  ctx.actor.tapDir = null;
  return true;
};
const stepped = (t, ctx) => {
  const f = ctx.floor();
  if (!f || ctx.actor.fx) return null;
  const was = t.lastFloor;
  t.lastFloor = f;
  return was && !same(was, f) ? was : null;
};
const tick = (t, k, dt, max = 0.6) => { if (t[k] >= 0) { t[k] += dt; if (t[k] > max) t[k] = -1; } };
const announce = (t, ctx, text) => {
  if (t.told || ctx.time <= 0.4) return;
  t.told = true;
  const line = { text: t.text || text, shown: false };
  ctx.emit(t, "banner", { line });
  if (!line.shown) ctx.say(line.text);
};
const cushion = (t, ctx, to, type = "cushion") => { ctx.fling(to, 0.6, t); ctx.emit(t, type); };

defineTrap("t04", {
  cells(t) { return [...t.cells, ...(t.plates || [])]; },
  danger(t) { return t.cells; },
  check(t) {
    const out = [];
    if (!(t.plates || []).length) out.push("goose plates need at least one shoulder plate");
    for (const p of t.plates || []) if (indexOf(t.cells, p) >= 0 || !t.cells.some((c) => near1(c, p))) out.push(`plate ${p} must sit on a shoulder beside the run`);
    return out;
  },
  init(t) { t.honks = 0; t.goose = null; t.sit = 0; t.puff = -1; t.puffAt = null; },
  reset(t, ctx) { if (t.goose) block(ctx.level, t.goose, false); t.goose = null; t.honks = 0; },
  disarm(t, ctx) { if (t.goose) block(ctx.level, t.goose, false); t.goose = null; },
  enter(t, c, prev, ctx) {
    if (indexOf(t.plates, c) < 0) return;
    t.honks++;
    t.puff = 0;
    t.puffAt = c;
    ctx.emit(t, "honk", { honks: t.honks });
    if (t.honks % 3 || t.goose) return;
    const i = t.cells.findIndex((q) => near1(q, c));
    const f = ctx.floor();
    const pick = [i + 1, i, i + 2, i - 1].filter((j) => j >= 0 && j < t.cells.length).map((j) => t.cells[j]).find((q) => !same(q, f));
    if (!pick) return;
    t.goose = pick;
    t.sit = 0;
    block(ctx.level, pick, true);
    ctx.emit(t, "goose");
    ctx.say("HONK. A goose waddles onto the path and sits.");
  },
  update(t, dt, ctx) {
    tick(t, "puff", dt);
    if (!t.goose) return;
    t.sit += dt;
    if (t.sit >= 4 * BEAT) { block(ctx.level, t.goose, false); t.goose = null; ctx.emit(t, "waddle"); }
  },
});

defineTrap("t05", {
  cells(t) { return [t.cells[0], ...(t.cut ? [t.cut] : [])]; },
  extra(t) { return t.on ? [t.on] : []; },
  danger(t) { return [t.cells[0], ...(t.cut ? [t.cut] : [])]; },
  check(t, P) {
    const out = [];
    if (!t.from || !near1(t.from, t.cells[0])) out.push("the scuff needs the run cell it is entered from");
    else if (!t.on || !same(t.on, add(t.cells[0], sub(t.cells[0], t.from)))) out.push("the slide cell sits straight on from the scuff");
    else if (isWalkable(P, t.on[0], t.on[1])) out.push("the slide cell must be off the island or off the route");
    if (t.cut && (!near1(t.cut, t.from) || !isWalkable(P, t.cut[0], t.cut[1]))) out.push("the corner cut must sit beside the run cell before the scuff");
    return out;
  },
  init(t) { t.slid = -1; },
  reset(t) { t.slid = -1; },
  enter(t, c, prev, ctx) {
    if (!same(c, t.cells[0]) || !same(prev, t.from)) return;
    t.slid = 0;
    ctx.emit(t, "slip");
    ctx.fling(t.on, 0.35, t);
  },
  update(t, dt) { tick(t, "slid", dt, 1); },
});

defineTrap("t06", {
  check(t, P) { return t.cells.length ? [] : ["sneeze dust needs at least one shoulder cell"]; },
  init(t) { t.dusted = new Set(); t.puff = -1; t.puffAt = null; },
  reset(t) { t.dusted = new Set(); t.puff = -1; },
  rest(t) { t.dusted = new Set(); },
  enter(t, c, prev, ctx) {
    const k = key(c[0], c[1]);
    if (!prev || t.dusted.has(k)) return;
    t.dusted.add(k);
    t.puff = 0;
    t.puffAt = c;
    ctx.emit(t, "sneeze");
    ctx.fling(prev, 0.3, t);
  },
  update(t, dt) { tick(t, "puff", dt, 0.9); },
});

const mimic = {
  hopEvery: BEAT, hops: 5,
  check(t, P) { return t.chest ? [] : ["the mimic needs its chest thing id"]; },
  init(t, ctx) { t.home = t.cells[0].slice(); this.reset(t, ctx); },
  reset(t, ctx) {
    t.state = "idle"; t.pos = t.home.slice(); t.from = t.home.slice(); t.hop = 0; t.left = 0; t.next = null; t.bite = -1; t.coin = -1;
    const q = ctx?.things?.byId?.[t.chest];
    if (q) q.state = "closed";
    if (ctx) block(ctx.level, t.home, true);
  },
  disarm(t, ctx) { t.state = "idle"; },
  thing(t, e, ctx) {
    if (e.type !== "trap-act" || e.thing.trap !== t.id || t.state !== "idle") return;
    e.thing.state = "open";
    t.state = "chase";
    t.left = this.hops;
    t.next = ctx.time + 0.6;
    ctx.emit(t, "teeth");
    ctx.say("The chest grows teeth!");
  },
  update(t, dt, ctx) {
    tick(t, "bite", dt, 0.8);
    tick(t, "coin", dt, 1.4);
    if (t.state !== "chase") return;
    t.hop = Math.min(1, t.hop + dt / 0.3);
    if (t.hop >= 1 && same(t.pos, ctx.floor()) && ctx.on(t.pos)) {
      ctx.hurt(t, 1);
      t.bite = 0;
      ctx.emit(t, "bite");
      this.bored(t, ctx);
      return;
    }
    if (ctx.time < t.next) return;
    if (t.left <= 0) { this.bored(t, ctx); return; }
    const f = ctx.floor() || t.pos;
    const opts = N4.map((d) => add(t.pos, d)).filter((q) => same(q, f) || (isWalkable(ctx.level, q[0], q[1]) && !same(q, t.home)));
    const dist = (q) => Math.abs(q[0] - f[0]) + Math.abs(q[1] - f[1]);
    const best = opts.sort((a, b) => dist(a) - dist(b))[0];
    t.next = ctx.time + this.hopEvery;
    t.left--;
    if (!best || dist(best) >= dist(t.pos)) return;
    if (same(t.pos, t.home)) block(ctx.level, t.home, false);
    t.from = t.pos;
    t.pos = best;
    t.hop = 0;
    ctx.emit(t, "hop");
  },
  bored(t, ctx) {
    t.state = "bored";
    t.coin = 0;
    ctx.emit(t, "cough");
    ctx.say("It gets bored and coughs up a coin.");
  },
};
defineTrap("t07", { ...mimic });

defineTrap("t08", {
  worst(t) { return { blocked: t.cells }; },
  check(t, P) {
    const out = [];
    const pad = t.cells[0];
    if (!t.chest) out.push("the trapdoor needs the chest it sits under");
    if (!t.land || !near1(t.land, pad)) out.push("the landing must sit beside the pad");
    else if (!isWalkable(P, t.land[0], t.land[1]) || P.cells[t.land[1]][t.land[0]].h !== P.cells[pad[1]][pad[0]].h - 1) out.push("the landing must be walkable one tier below the pad");
    return out;
  },
  init(t) { t.sprung = false; t.landAt = null; t.drop = -1; },
  reset(t, ctx) { if (t.sprung) block(ctx.level, t.cells[0], false); t.sprung = false; t.landAt = null; t.drop = -1; },
  disarm(t, ctx) { this.reset(t, ctx); },
  thing(t, e, ctx) {
    if (e.type !== "open" || e.thing.id !== t.chest || t.sprung || !ctx.on(t.cells[0])) return;
    t.sprung = true;
    t.drop = 0;
    block(ctx.level, t.cells[0], true);
    ctx.fling(t.land, 0.55, t);
    t.landAt = ctx.time + 0.56;
    ctx.emit(t, "drop");
  },
  update(t, dt, ctx) {
    if (t.drop >= 0) t.drop += dt;
    if (t.landAt == null || ctx.time < t.landAt) return;
    t.landAt = null;
    ctx.hurt(t, 1);
    ctx.emit(t, "bump");
    ctx.say("Ow. You keep the loot, though.");
  },
});

defineTrap("t09", {
  check(t) { return t.thing ? [] : ["the decoy needs its prop thing id"]; },
  init(t) { t.fx = -1; t.broken = false; },
  reset(t, ctx) { t.fx = -1; t.broken = false; const q = ctx?.things?.byId?.[t.thing]; if (q) q.state = "up"; },
  disarm(t, ctx) { this.reset(t, ctx); },
  thing(t, e, ctx) {
    if (e.type !== "trap-act" || e.thing.trap !== t.id) return;
    t.fx = 0;
    if (t.prop === "lever") { t.broken = true; e.thing.state = "pulled"; ctx.emit(t, "snap"); ctx.say("The lever comes off in your hand."); }
    else { ctx.emit(t, "puff"); ctx.say("*Cough.* The campfire is painted on."); }
  },
  update(t, dt) { tick(t, "fx", dt, 1.6); },
});

defineTrap("t10", {
  worst(t) { return { blocked: t.cells }; },
  learn(t) { return [t.cells[t.at]]; },
  check(t) { return t.cells.length !== 2 || !near1(t.cells[0], t.cells[1]) ? ["the scooting hole covers two adjacent cells"] : []; },
  init(t) { t.at = 0; t.open = false; t.moved = false; t.drop = -1; t.chalkAt = null; },
  reset(t, ctx) {
    if (t.open) { block(ctx.level, t.cells[t.at], false); t.chalkAt = t.cells[t.at]; t.chalk = true; if (!t.moved) { t.at = 1; t.moved = true; } }
    t.open = false;
    t.drop = -1;
  },
  rest(t) { t.chalk = false; },
  disarm(t, ctx) { if (t.open) block(ctx.level, t.cells[t.at], false); t.open = false; },
  enter(t, c, prev, ctx) {
    if (t.open || !same(c, t.cells[t.at])) return;
    t.open = true;
    t.drop = 0;
    ctx.emit(t, "drop");
    ctx.knock(t, [0, 0]);
  },
  update(t, dt) { if (t.drop >= 0) t.drop += dt; },
});

const paintedHole = {
  angle: 315,
  seen(t, ctx) { const y = ((ctx.yaw() - (t.angle ?? this.angle)) % 360 + 360) % 360; return y < 1 || y > 359; },
  tear(t, ctx) { t.torn = true; t.rip = 0; ctx.emit(t, "tear"); ctx.knock(t, [0, 0]); },
};
defineTrap("t11", {
  ...paintedHole,
  worst(t) { return { blocked: t.cells }; },
  check(t) { return t.cells.length !== 1 ? ["the painted hole covers one cell"] : []; },
  init(t) { t.torn = false; t.rip = -1; t.seam = false; },
  reset(t) { t.torn = false; t.rip = -1; },
  enter(t, c, prev, ctx) { if (!t.torn) this.tear(t, ctx); },
  update(t, dt, ctx) { t.seam = this.seen(t, ctx); if (t.rip >= 0) t.rip += dt; },
});

defineTrap("t12", {
  check(t, P) { return t.cells.length !== 3 || !isStraight(t.cells) ? ["the fake spur is three straight cells"] : t.cells.some((c) => P.cells[c[1]][c[0]].p) ? ["the fake spur sits off the route"] : []; },
  init(t) { t.told = false; },
  reset(t) { t.told = false; },
  enter(t, c, prev, ctx) {
    if (!same(c, t.cells[t.cells.length - 1]) || t.told) return;
    t.told = true;
    ctx.emit(t, "smug");
    ctx.say(t.text || "The sign reads: made you look.");
  },
});

defineTrap("t13", {
  cells(t) { return [t.cells[0], t.plate]; },
  check(t) { return !t.plate || !near1(t.plate, t.cells[0]) ? ["the long-stride plate sits where a skip over the bait lands"] : []; },
  init(t) { t.fired = false; t.glove = -1; },
  reset(t) { t.fired = false; t.glove = -1; },
  update(t, dt, ctx) {
    tick(t, "glove", dt, 0.7);
    if (!ctx.on(t.plate)) { if (!ctx.actor.pause) t.fired = false; return; }
    if (t.fired || ctx.actor.pause || !ctx.skipped(t.cells[0])) return;
    t.fired = true;
    t.glove = 0;
    ctx.emit(t, "glove");
    ctx.hurt(t, 1);
    ctx.fling(add(t.cells[0], sub(t.cells[0], t.plate)), 0.35, t);
  },
});

defineTrap("t14", {
  cells(t) { return [t.cells[0]]; },
  extra(t) { return [t.cells[1]]; },
  danger(t) { return [t.cells[1]]; },
  check(t) { return t.cells.length !== 2 || !near1(t.cells[0], t.cells[1]) ? ["the painted decoy covers two adjacent cells"] : []; },
  init(t) { t.painted = false; t.stung = false; t.spike = -1; t.honk = -1; },
  reset(t) { t.stung = false; t.spike = -1; },
  reveal(t) { t.painted = true; },
  enter(t, c, prev, ctx) { if (same(c, t.cells[0])) { t.honk = 0; ctx.emit(t, "honk"); } },
  update(t, dt, ctx) {
    tick(t, "honk", dt);
    tick(t, "spike", dt, 0.8);
    const real = t.cells[1];
    if (!ctx.on(real)) { t.stung = false; return; }
    if (t.stung) return;
    t.stung = true;
    t.spike = 0;
    ctx.emit(t, "spike");
    ctx.hurt(t, 1, { back: ctx.prev() });
  },
});

defineTrap("t15", {
  worst(t) { return { blocked: t.cells }; },
  check(t, P) { return t.cells.some((c) => !isWalkable(P, c[0], c[1])) ? ["faith tiles sit on cells the trap sinks at load"] : t.cells.length < 2 || t.cells.length > 4 ? ["faith tiles span a 2 to 4 cell gap"] : []; },
  init(t, ctx) { t.lift = t.cells.map(() => 0); t.up = t.cells.map(() => false); for (const c of t.cells) ctx.sink(c, true); },
  reset(t, ctx) { t.cells.forEach((c, i) => { if (t.up[i]) ctx.sink(c, true); t.up[i] = false; }); },
  disarm(t, ctx) { t.cells.forEach((c, i) => { ctx.sink(c, false); t.up[i] = true; }); },
  update(t, dt, ctx) {
    const f = ctx.floor();
    t.cells.forEach((c, i) => {
      const want = !!f && (same(f, c) || near1(f, c));
      if (want !== t.up[i]) { t.up[i] = want; ctx.sink(c, !want); if (want) ctx.emit(t, "rise", { i }); }
      t.lift[i] += ((want ? 1 : 0) - t.lift[i]) * Math.min(1, dt * 10);
    });
  },
});

const hall = {
  init(t) { t.thanked = false; },
  reset(t) { t.thanked = false; },
  enter(t, c, prev, ctx) {
    if (t.thanked || !same(c, t.cells[t.cells.length - 1])) return;
    t.thanked = true;
    ctx.emit(t, "thanks");
    ctx.say(t.text || "A sign: thanks for being careful.");
  },
};
defineTrap("t16", { ...hall, check(t) { return t.cells.length < 5 || !isStraight(t.cells) ? ["nothing here needs a straight run of five or more cells"] : []; } });

defineTrap("t17", {
  free: true,
  worst(t) { return { blocked: t.cells }; },
  check(t) { return t.cells.length !== 1 ? ["the stone twin stands on one cell"] : []; },
  init(t, ctx) { t.stare = 0; t.told = false; block(ctx.level, t.cells[0], true); },
  reset(t) { t.stare = 0; },
  update(t, dt, ctx) {
    const f = ctx.floor();
    const close = !!f && Math.max(Math.abs(f[0] - t.cells[0][0]), Math.abs(f[1] - t.cells[0][1])) <= 1 && !ctx.actor.moving;
    t.stare = close ? t.stare + dt : 0;
    if (t.stare > 2.5 && !t.told) { t.told = true; ctx.emit(t, "stare"); ctx.say("It does not turn. It is a statue."); }
    if (!close) t.told = false;
  },
});

defineTrap("t19", {
  every: 6 * BEAT, speed: 3,
  cells(t) { return [...t.cells, ...(t.dodge ? [t.dodge] : [])]; },
  danger(t) { return t.cells; },
  check(t, P) {
    const out = [];
    if (t.cells.length < 4 || !isStraight(t.cells)) out.push("the barrel lane is a straight run of four or more cells");
    if (!t.dodge || !t.cells.some((c) => near1(c, t.dodge)) || indexOf(t.cells, t.dodge) >= 0) out.push("the barrel lane needs a dodge cell beside it");
    else { const k = t.cells.findIndex((c) => near1(c, t.dodge)), o = sub(t.dodge, t.cells[k]), d = along(t.cells); if (o[0] * d[0] + o[1] * d[1]) out.push("the dodge cell sits beside the lane, not on its line"); }
    return out;
  },
  init(t) { t.roll = null; t.clock = 0; t.hit = -1; },
  reset(t) { t.roll = null; t.clock = 0; t.hit = -1; },
  disarm(t) { t.roll = null; },
  update(t, dt, ctx) {
    tick(t, "hit", dt, 1);
    t.clock += dt;
    if (t.roll == null && t.clock >= this.every) { t.clock = 0; t.roll = t.cells.length - 0.5; ctx.emit(t, "roll"); }
    if (t.roll == null) return;
    const was = t.roll;
    t.roll -= this.speed * dt;
    const fi = indexOf(t.cells, ctx.floor());
    if (fi >= 0 && ctx.on(t.cells[fi]) && t.roll <= fi + 0.5 && was >= fi - 0.5) {
      t.hit = 0;
      ctx.emit(t, "squash");
      if (ctx.hurt(t, 1)) ctx.fling(t.cells[0], 0.5, t);
    }
    if (t.roll < -0.6) { t.roll = null; ctx.emit(t, "gone"); }
  },
});

defineTrap("t20", {
  check(t) { return t.cells.length !== 1 ? ["the rewind tile covers one cell"] : []; },
  init(t) { t.trail = []; t.spent = false; t.rewind = -1; },
  reset(t, ctx) { t.trail = []; t.spent = false; t.rewind = -1; if (ctx?.actor) ctx.actor.backward = false; },
  disarm(t, ctx) { if (ctx?.actor) ctx.actor.backward = false; },
  dispose(t, ctx) { if (ctx?.actor) ctx.actor.backward = false; },
  enter(t, c, prev, ctx) {
    if (t.spent || t.rewind >= 0) return;
    const seq = [...t.trail, prev].filter(Boolean).filter((q, i, a) => !i || !same(q, a[i - 1]));
    const back = seq.slice(-3).reverse().filter((q) => !same(q, c));
    let at = c;
    const walk = [];
    for (const q of back) { if (!near1(at, q) || !isWalkable(ctx.level, q[0], q[1])) break; walk.push(q); at = q; }
    if (!walk.length) return;
    t.spent = true;
    t.rewind = 0;
    const a = ctx.actor;
    a.path = walk.map((q) => q.slice());
    a.tapDir = null;
    a.held = null;
    a.backward = true;
    ctx.emit(t, "rewind", { steps: walk.length });
  },
  update(t, dt, ctx) {
    if (t.rewind >= 0) {
      t.rewind += dt;
      if (!ctx.actor.path.length && t.rewind > 0.2) { t.rewind = -1; ctx.actor.backward = false; ctx.emit(t, "play"); }
      return;
    }
    const was = stepped(t, ctx);
    if (was) { t.trail.push(was); if (t.trail.length > 6) t.trail.shift(); }
  },
});

defineTrap("t27", {
  cells(t) { return [...(t.kind1 || []), ...t.cells]; },
  worst(t) { return { blocked: [t.cells[t.drop ?? 2]] }; },
  check(t, P) {
    const out = [];
    if (!(t.kind1 || []).length) out.push("the kind bridge needs its own cells");
    if (t.cells.length < 3) out.push("the still bridge needs three or more planks");
    for (const c of [...(t.kind1 || []), ...t.cells]) if (P.cells[c[1]][c[0]].s !== "bridge") out.push(`cell ${c} is not a bridge plank`);
    return out;
  },
  init(t) { t.wob = (t.kind1 || []).map(() => 0); t.gone = false; t.fall = -1; },
  reset(t, ctx) { if (t.gone) block(ctx.level, t.cells[t.drop ?? 2], false); t.gone = false; t.fall = -1; },
  disarm(t, ctx) { this.reset(t, ctx); },
  enter(t, c, prev, ctx) {
    const k = indexOf(t.kind1 || [], c);
    if (k >= 0) { t.wob[k] = 1; ctx.emit(t, "wobble"); return; }
    if (t.gone || !same(c, t.cells[t.drop ?? 2])) return;
    t.gone = true;
    t.fall = 0;
    block(ctx.level, c, true);
    ctx.emit(t, "snap");
    ctx.knock(t, [0, 0]);
  },
  update(t, dt) { t.wob = t.wob.map((w) => Math.max(0, w - dt * 1.4)); if (t.fall >= 0) t.fall += dt; },
});

defineTrap("t28", {
  late: 0.75, down: 2 * BEAT,
  cells(t) { return [...t.cells, ...(t.second || [])]; },
  check(t) { return t.cells.length !== 3 || (t.second || []).length !== 3 ? ["both sign runs hold three cells"] : !isStraight(t.cells) || !isStraight(t.second) ? ["both sign runs are straight"] : []; },
  init(t) { t.holes = new Map(); t.creak = -1; },
  reset(t) { t.holes = new Map(); t.creak = -1; },
  holeAt(t, c, now) { const h = t.holes.get(key(c[0], c[1])); return !!h && now >= h.from && now < h.to; },
  unsafe(t, c, ctx, from, to) { const h = t.holes.get(key(c[0], c[1])); return !!h && h.to > ctx.time + from && h.from < ctx.time + to; },
  enter(t, c, prev, ctx) {
    if (this.holeAt(t, c, ctx.time)) { ctx.emit(t, "plunge"); ctx.knock(t, [0, 0]); return; }
    const i = indexOf(t.second, c);
    if (i >= 0 && i < t.second.length - 1) {
      const n = t.second[i + 1];
      t.holes.set(key(n[0], n[1]), { c: n, from: ctx.time, to: ctx.time + this.late });
      t.creakAt = ctx.time + this.late;
      ctx.emit(t, "drop-ahead");
    }
  },
  update(t, dt, ctx) {
    tick(t, "creak", dt, 0.5);
    if (t.creakAt != null && ctx.time >= t.creakAt) { t.creakAt = null; t.creak = 0; ctx.emit(t, "creak"); }
    const was = stepped(t, ctx);
    if (was && indexOf(t.cells, was) >= 0) {
      t.holes.set(key(was[0], was[1]), { c: was, from: ctx.time + BEAT, to: ctx.time + BEAT + this.down });
      ctx.emit(t, "creak-behind");
    }
    for (const [k, h] of t.holes) if (ctx.time >= h.to) t.holes.delete(k);
    const f = ctx.floor();
    if (f && this.holeAt(t, f, ctx.time) && ctx.on(f) && !t.plunged) { t.plunged = true; ctx.emit(t, "plunge"); ctx.knock(t, [0, 0]); }
    if (!f || !this.holeAt(t, f, ctx.time)) t.plunged = false;
  },
});

defineTrap("t29", {
  cells(t) { return [...t.cells, t.block]; },
  worst(t) { return { blocked: [t.block] }; },
  check(t, P) {
    const out = [];
    if (t.cells.length < 5 || !isStraight(t.cells)) out.push("the empty hall is a straight run of five or more cells");
    if (!t.block) out.push("the bonk needs its block cell");
    else out.push(...KINDS.t21.check({ cells: [t.block] }, P));
    return out;
  },
  sub(t) { return (t.bonk ||= { id: t.id, kind: "t21", cells: [t.block], meta: t.meta, revealed: t.revealed }); },
  init(t, ctx) { hall.init(t); KINDS.t21.init(this.sub(t), ctx); },
  reset(t, ctx) { hall.reset(t); const b = this.sub(t); b.revealed = t.revealed; KINDS.t21.reset(b, ctx); t.chalk = b.chalk; if (b.chalk) t.revealed = true; },
  reveal(t, ctx) { KINDS.t21.reveal(this.sub(t), ctx); },
  rest(t) { KINDS.t21.rest(this.sub(t)); t.chalk = false; },
  disarm(t, ctx) { KINDS.t21.disarm(this.sub(t), ctx); },
  enter(t, c, prev, ctx) { hall.enter(t, c, prev, ctx); },
  update(t, dt, ctx) {
    const b = this.sub(t);
    const fake = { ...ctx, reveal: () => { t.revealed = true; KINDS.t21.reveal(b, ctx); }, emit: (_, type, extra) => ctx.emit(t, type, extra), hurt: (_, n, o) => ctx.hurt(t, n, o) };
    KINDS.t21.update(b, dt, fake);
    t.solid = b.solid; t.hits = b.hits; t.star = b.star;
  },
});

defineTrap("t30", {
  ...mimic,
  check(t, P) { return [...mimic.check(t, P), ...(t.real ? [] : ["the sequence needs the real chest it follows"])]; },
});

defineTrap("t31", {
  ...paintedHole,
  cells(t) { return t.coins || []; },
  worst(t) { return { blocked: [t.coins[t.coins.length - 1]] }; },
  check(t, P) {
    const out = [];
    const cs = t.coins || [];
    if (cs.length < 6) out.push("the coin trail needs four path coins and a staircase of two or more");
    for (let i = 1; i < cs.length; i++) if (Math.abs(cs[i][0] - cs[i - 1][0]) + Math.abs(cs[i][1] - cs[i - 1][1]) > 2) out.push(`coin ${i} is more than a step from the last`);
    for (let i = 0; i < Math.min(4, cs.length); i++) if (!P.cells[cs[i][1]][cs[i][0]].p) out.push(`coin ${i} must sit on the path`);
    return out;
  },
  init(t) { t.got = 0; t.torn = false; t.rip = -1; t.seam = false; t.shine = -1; },
  reset(t) { t.got = 0; t.torn = false; t.rip = -1; },
  enter(t, c, prev, ctx) {
    const last = t.coins.length - 1;
    if (same(c, t.coins[last]) && !t.torn) { this.tear(t, ctx); return; }
    if (t.got < last && same(c, t.coins[t.got])) { t.got++; t.shine = 0; ctx.emit(t, "coin", { got: t.got }); }
  },
  update(t, dt, ctx) { t.seam = this.seen(t, ctx); if (t.rip >= 0) t.rip += dt; tick(t, "shine", dt, 0.5); },
});

defineTrap("t01", {
  cells(t) { return [...t.cells, t.spring, t.gate].filter(Boolean); },
  worst(t) { return { blocked: [...t.cells, t.gate] }; },
  check(t, P) {
    const out = [];
    if (t.cells.length < 4) out.push("the vanish patch needs four or more cells");
    if (t.cells.some((c) => P.cells[c[1]][c[0]].p)) out.push("the vanish patch sits off the path");
    if (!t.gate || !t.spring || !near1(t.gate, t.spring)) out.push("the pop-up gate springs on the cell after its trigger");
    return out;
  },
  init(t) { t.run = 0; t.gone = false; t.up = false; t.fall = -1; t.pop = -1; },
  reset(t, ctx) {
    if (t.gone) for (const c of t.cells) block(ctx.level, c, false);
    if (t.up) block(ctx.level, t.gate, false);
    t.run = 0; t.gone = false; t.up = false; t.fall = -1; t.pop = -1;
  },
  disarm(t, ctx) { this.reset(t, ctx); },
  enter(t, c, prev, ctx) {
    if (same(c, t.spring) && !t.up && (!prev || !same(prev, t.gate))) {
      t.up = true;
      t.pop = 0;
      block(ctx.level, t.gate, true);
      ctx.emit(t, "gate");
      ctx.say("A gate springs up across the path.");
      return;
    }
    if (indexOf(t.cells, c) < 0 || t.gone) return;
    t.run = prev && indexOf(t.cells, prev) >= 0 ? t.run + 1 : 1;
    if (t.run < 4) return;
    t.gone = true;
    t.fall = 0;
    for (const q of t.cells) block(ctx.level, q, true);
    ctx.emit(t, "vanish");
    ctx.knock(t, [0, 0]);
  },
  update(t, dt) { if (t.fall >= 0) t.fall += dt; tick(t, "pop", dt, 0.5); },
});

defineTrap("t32", {
  init(t) { t.on = false; t.told = false; t.calm = 0; t.swirl = -1; },
  reset(t) { t.calm = 0; },
  rest(t) { t.calm = 10; },
  disarm(t, ctx) { ctx.actor.mapDir = null; t.on = false; },
  dispose(t, ctx) { ctx.actor.mapDir = null; },
  update(t, dt, ctx) {
    tick(t, "swirl", dt, 1.2);
    if (stepped(t, ctx) && t.calm > 0) t.calm--;
    const on = inZone(t, ctx.floor()) && t.calm <= 0;
    if (on && !t.on) t.swirl = 0;
    t.on = on;
    ctx.actor.mapDir = on ? (d) => OPPOSITE[d] : null;
    if (on) announce(t, ctx, "Mirror controls: every direction is reversed here.");
  },
});

defineTrap("t34", {
  secs: 180,
  init(t) { t.left = t.secs || this.secs; t.on = false; t.told = false; t.yawn = -1; },
  reset(t) { t.left = t.secs || this.secs; t.yawn = -1; },
  rest(t) { t.left = t.secs || this.secs; },
  update(t, dt, ctx) {
    tick(t, "yawn", dt, 1.5);
    t.on = inZone(t, ctx.floor());
    if (!t.on) return;
    announce(t, ctx, "A sleepy sun rises. Three minutes until nap time.");
    t.left -= dt;
    if (t.left > 0) return;
    const hearts = ctx.health?.hearts || 0;
    if (hearts > 0 && ctx.hurt(t, hearts)) { t.yawn = 0; ctx.emit(t, "nap"); ctx.say("*Yawn.* Nap time."); }
  },
});

defineTrap("t35", {
  init(t) { t.on = false; t.told = false; t.slid = false; t.bonk = -1; t.gripSet = new Set((t.grip || []).map((c) => c[0] + "," + c[1])); },
  reset(t) { t.slid = false; },
  update(t, dt, ctx) {
    tick(t, "bonk", dt, 0.6);
    const f = ctx.floor();
    t.on = inZone(t, f);
    if (t.on) announce(t, ctx, "Slick soles: everything off the path is glazed with ice.");
    const was = stepped(t, ctx);
    if (!was) return;
    if (t.slid) { t.slid = false; return; }
    if (!t.on || onPath(ctx, f) || t.gripSet?.has(f[0] + "," + f[1]) || !near1(was, f)) return;
    const d = sub(f, was), next = add(f, d);
    if (shove(ctx, f, d)) { t.slid = true; ctx.emit(t, "slip"); }
    else if (!isVoid(ctx.level, next[0], next[1])) { t.bonk = 0; ctx.emit(t, "bonk"); }
  },
});

defineTrap("t36", {
  init(t) { t.on = false; t.told = false; t.beat = -1; t.warn = false; t.gust = -1; t.wind = DIRS[t.dir] || DIRS.e; },
  update(t, dt, ctx) {
    tick(t, "gust", dt, 0.8);
    t.on = inZone(t, ctx.floor());
    if (t.on) announce(t, ctx, "Gusts: every sixth beat the wind shoves you. Flags flap first.");
    const beat = Math.floor(ctx.time / BEAT);
    const fresh = beat !== t.beat;
    t.beat = beat;
    t.warn = beat % 6 === 5;
    if (!fresh || beat % 6 || !t.on) return;
    const f = ctx.floor();
    if (!f || ctx.actor.fx || ctx.actor.locked) return;
    t.gust = 0;
    const next = add(f, t.wind);
    if (onPath(ctx, f) || isVoid(ctx.level, next[0], next[1]) || !shove(ctx, f, t.wind)) { ctx.emit(t, "crouch"); return; }
    ctx.emit(t, "gust");
  },
});

defineTrap("t37", {
  init(t) { t.on = false; t.told = false; },
  disarm(t, ctx) { ctx.actor.sticky = false; },
  dispose(t, ctx) { ctx.actor.sticky = false; },
  update(t, dt, ctx) {
    t.on = inZone(t, ctx.floor());
    ctx.actor.sticky = t.on;
    if (t.on) announce(t, ctx, "Sticky soles: every step needs its own tap.");
  },
});

defineTrap("t38", {
  init(t) { t.on = false; t.told = false; },
  disarm(t, ctx) { ctx.lockCamera(false); },
  dispose(t, ctx) { ctx.lockCamera(false); },
  update(t, dt, ctx) {
    const on = inZone(t, ctx.floor());
    if (on !== t.on) ctx.lockCamera(on);
    t.on = on;
    if (on) announce(t, ctx, "Stuck camera: Q, E and the swipe do nothing here.");
  },
});

defineTrap("t39", {
  every: 7,
  init(t) { t.on = false; t.told = false; t.steps = 0; t.skip = false; t.hic = -1; },
  reset(t) { t.steps = 0; t.skip = false; },
  update(t, dt, ctx) {
    tick(t, "hic", dt, 0.7);
    const f = ctx.floor();
    t.on = inZone(t, f);
    if (t.on) announce(t, ctx, "Hiccups: every seventh step carries you one cell further.");
    const was = stepped(t, ctx);
    t.left = this.every - (t.steps % this.every);
    if (!was || !t.on) return;
    if (t.skip) { t.skip = false; return; }
    t.steps++;
    t.left = this.every - (t.steps % this.every);
    if (t.steps % this.every || !near1(was, f)) return;
    t.hic = 0;
    const d = sub(f, was);
    const next = add(f, d);
    if (!isVoid(ctx.level, next[0], next[1]) && shove(ctx, f, d)) { t.skip = true; ctx.emit(t, "hic"); }
    else ctx.emit(t, "hic-bonk");
  },
});

const solveWith = (t, ctx, text) => { t.solved = true; ctx.solve(t); ctx.emit(t, "solved"); ctx.say(t.text || text); };
const solvedGate = (t, ctx) => { const g = ctx.things?.byId?.[t.gate]; return g?.state === "open"; };
const grid = (t) => t.grid || t.cells;

defineTrap("t41", {
  check(t, P) {
    const out = [];
    if (!(t.crates || []).length) out.push("crate push needs a crate");
    if (!t.plate || indexOf(t.cells, t.plate) < 0) out.push("the crate plate sits in the room");
    if (!t.gate) out.push("crate push gates a reward");
    return out;
  },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.pos = (t.crates || []).map((c) => c.slice()); t.ring = -1; for (const c of t.pos) block(ctx.level, c, true); },
  bell(t, ctx) { for (const c of t.pos) block(ctx.level, c, false); t.pos = t.crates.map((c) => c.slice()); for (const c of t.pos) block(ctx.level, c, true); t.ring = 0; ctx.emit(t, "bell"); },
  enter(t, c, prev, ctx) { if (t.bellAt && same(c, t.bellAt)) this.bell(t, ctx); },
  push(t, dir, ctx) {
    const d = DIRS[dir], a = ctx.actor;
    const at = add(a.cell, d), i = t.pos.findIndex((q) => same(q, at));
    if (i < 0) return false;
    const to = add(at, d);
    if (indexOf(t.cells, to) < 0 || same(to, t.bellAt) || t.pos.some((q) => same(q, to)) || !isWalkable(ctx.level, to[0], to[1])) { ctx.emit(t, "stuck"); return false; }
    block(ctx.level, at, false);
    block(ctx.level, to, true);
    t.pos[i] = to;
    t.moved = { i, from: at, t: 0 };
    ctx.emit(t, "push");
    if (!t.solved && same(to, t.plate)) solveWith(t, ctx, "The crate settles on the plate. A gate grinds open.");
    return true;
  },
  update(t, dt) { tick(t, "ring", dt, 0.8); if (t.moved) { t.moved.t += dt; if (t.moved.t > 0.25) t.moved = null; } },
});

const flip = (lit, i, w, h) => {
  const x = i % w, z = Math.floor(i / w);
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx >= 0 && nz >= 0 && nx < w && nz < h) lit[nz * w + nx] ^= 1; }
};
export function lightsOutStart(walk, w = 3, h = 3) {
  const lit = new Array(w * h).fill(1);
  for (const i of walk) flip(lit, i, w, h);
  return lit;
}
defineTrap("t42", {
  cells(t) { return [...t.cells, ...(t.bellAt ? [t.bellAt] : [])]; },
  check(t) { return t.cells.length !== 9 ? ["lights-out needs a 3x3 grid"] : (t.start || []).length !== 9 ? ["lights-out needs a start pattern"] : t.start.every(Boolean) ? ["the start pattern is already solved"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.lit = t.solved ? new Array(9).fill(1) : t.start.slice(); t.ring = -1; },
  reset(t) { if (!t.solved) t.lit = t.start.slice(); },
  enter(t, c, prev, ctx) {
    if (t.solved) return;
    if (t.bellAt && same(c, t.bellAt)) { t.lit = t.start.slice(); t.ring = 0; ctx.emit(t, "bell"); return; }
    const i = indexOf(t.cells, c);
    if (i < 0) return;
    flip(t.lit, i, 3, 3);
    ctx.emit(t, "flip", { i });
    if (t.lit.every(Boolean)) solveWith(t, ctx, "All nine lit. A bridge rises to the reward.");
  },
  update(t, dt) { tick(t, "ring", dt, 0.8); },
});

defineTrap("t43", {
  check(t) { return t.cells.length !== 12 ? ["the one-visit floor is a 3x4 grid"] : indexOf(t.cells, t.exit) < 0 ? ["the exit tile sits in the grid"] : !t.entry ? ["the one-visit floor needs its entry cell"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.visited = new Set(); t.crumbled = new Set(); t.bounce = -1; },
  clear(t) { t.visited = new Set(); t.crumbled = new Set(); },
  reset(t) { this.clear(t); },
  enter(t, c, prev, ctx) {
    if (t.solved) return;
    const k = key(c[0], c[1]);
    if (indexOf(t.cells, c) < 0) return;
    if (t.crumbled.has(k)) { this.clear(t); t.bounce = 0; cushion(t, ctx, t.entry); ctx.say("Boing. The tiles knit back together."); return; }
    t.visited.add(k);
    if (same(c, t.exit) && t.visited.size === t.cells.length) solveWith(t, ctx, "Every tile once. The reward opens.");
  },
  update(t, dt, ctx) {
    tick(t, "bounce", dt, 1);
    const was = stepped(t, ctx);
    if (t.solved || !was || indexOf(t.cells, was) < 0) return;
    t.crumbled.add(key(was[0], was[1]));
    ctx.emit(t, "crumble");
    const f = ctx.floor();
    if (f && indexOf(t.cells, f) < 0 && !same(f, t.exit)) this.clear(t);
  },
});

const raiseAll = (t, ctx, on) => { for (const c of t.cells) ctx.sink(c, !on); };
const floorless = (t, P) => (t.cells.some((c) => !isWalkable(P, c[0], c[1])) ? ["these cells sit on floor the trap sinks at load"] : []);
defineTrap("t44", {
  worst(t) { return { blocked: t.cells }; },
  check(t, P) { return !t.watcher ? ["the gaze bridge needs its watcher"] : !t.start ? ["the gaze bridge needs a start cell to bounce you back to"] : floorless(t, P); },
  init(t, ctx) { t.solid = false; t.fade = 0; raiseAll(t, ctx, false); },
  reset(t, ctx) { if (t.solid) raiseAll(t, ctx, false); t.solid = false; },
  disarm(t, ctx) { raiseAll(t, ctx, true); t.solid = true; },
  update(t, dt, ctx) {
    const w = ctx.things?.byId?.[t.watcher];
    const on = w?.state === "watching" && (w.look ?? 0) > 0.6;
    t.fade += ((on ? 1 : 0) - t.fade) * Math.min(1, dt * 6);
    if (on === t.solid) return;
    t.solid = on;
    raiseAll(t, ctx, on);
    ctx.emit(t, on ? "solid" : "fade");
    if (!on && indexOf(t.cells, ctx.floor()) >= 0) cushion(t, ctx, t.start);
  },
});

defineTrap("t45", {
  cells(t) { return t.gates || []; },
  check(t) { return (t.gates || []).length !== 2 || (t.levers || []).length !== 2 ? ["valve swap needs two gates and two levers"] : []; },
  init(t, ctx) { t.open = 0; t.swap = -1; this.sync(t, ctx); },
  reset(t, ctx) { t.open = 0; this.sync(t, ctx); },
  sync(t, ctx) { t.gates.forEach((g, i) => block(ctx.level, g, i !== t.open)); },
  thing(t, e, ctx) {
    if (e.type !== "trap-act" || e.thing.trap !== t.id) return;
    const f = ctx.floor();
    if (t.gates.some((g) => same(g, f))) { ctx.say("Step out of the gateway first."); return; }
    t.open = 1 - t.open;
    t.swap = 0;
    this.sync(t, ctx);
    ctx.emit(t, "swap", { open: t.open });
    ctx.say(t.open ? "Clunk. The blue gate drops and the red one rises." : "Clunk. The red gate drops and the blue one rises.");
  },
  update(t, dt) { tick(t, "swap", dt, 0.6); },
});

defineTrap("t46", {
  worst(t) { return { blocked: t.cells }; },
  check(t, P) { return t.yaw == null || !t.start ? ["the one-angle bridge needs its angle and a start cell"] : floorless(t, P); },
  init(t, ctx) { t.whole = false; t.align = 0; raiseAll(t, ctx, false); },
  reset(t, ctx) { if (t.whole) raiseAll(t, ctx, false); t.whole = false; },
  disarm(t, ctx) { raiseAll(t, ctx, true); t.whole = true; },
  update(t, dt, ctx) {
    const y = ((ctx.yaw() - t.yaw) % 360 + 360) % 360;
    const on = y < 1 || y > 359;
    t.align += ((on ? 1 : 0) - t.align) * Math.min(1, dt * 5);
    if (on === t.whole) return;
    t.whole = on;
    raiseAll(t, ctx, on);
    ctx.emit(t, on ? "whole" : "drift");
    if (!on && indexOf(t.cells, ctx.floor()) >= 0) cushion(t, ctx, t.start);
  },
});

defineTrap("t47", {
  cells(t) { return [...t.cells, t.start]; },
  check(t) { return t.cells.length !== 16 ? ["the flash path is a 4x4 grid"] : !(t.safe || []).length || t.safe.some((c) => indexOf(t.cells, c) < 0) ? ["the safe line runs inside the grid"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.glow = -1; t.dunk = -1; },
  reset(t) { t.glow = -1; },
  enter(t, c, prev, ctx) {
    if (t.solved) return;
    if (same(c, t.start)) { t.glow = 0; ctx.emit(t, "flash"); return; }
    if (indexOf(t.cells, c) < 0) return;
    if (indexOf(t.safe, c) < 0) { t.dunk = 0; t.dunkAt = c; cushion(t, ctx, t.start, "dunk"); ctx.say("Splash. Back to the start."); return; }
    if (same(c, t.safe[t.safe.length - 1])) solveWith(t, ctx, "You remembered the way. The reward opens.");
  },
  update(t, dt) { if (t.glow >= 0) { t.glow += dt; if (t.glow > 2) t.glow = -1; } tick(t, "dunk", dt, 0.9); },
});

defineTrap("t48", {
  check(t) { return t.cells.length < 4 || t.cells.length > 7 ? ["the counting run holds 4 to 7 cells"] : !t.gate ? ["the counting gate needs its gate"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.count = 0; t.bad = -1; },
  reset(t) { if (!t.solved) t.count = 0; },
  update(t, dt, ctx) {
    tick(t, "bad", dt, 0.6);
    const was = stepped(t, ctx);
    if (t.solved || !was) return;
    const f = ctx.floor(), i = indexOf(t.cells, f);
    if (i === t.count) {
      t.count++;
      ctx.emit(t, "tally", { count: t.count });
      if (t.count === t.cells.length) solveWith(t, ctx, "The tally is full. The gate opens.");
    } else if (t.count > 0 && (i < 0 || i !== t.count)) {
      t.count = i === 0 ? 1 : 0;
      t.bad = 0;
      ctx.emit(t, "raspberry");
      ctx.say("Pbbbt. The tally resets.");
    }
  },
});

defineTrap("t49", {
  cells(t) { return [...t.cells, ...(t.ghostCells || [])]; },
  check(t) { return t.cells.length !== 8 || (t.ghostCells || []).length !== 8 ? ["mirror twin needs two 2x4 strips"] : !t.plate || !t.ghostPlate || !t.ghostStart ? ["mirror twin needs both plates and the ghost start"] : !t.mirror ? ["mirror twin needs its mirror axis"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.ghost = t.ghostStart.slice(); t.from = t.ghost.slice(); t.move = 1; t.bump = -1; },
  reset(t) { t.ghost = t.ghostStart.slice(); t.from = t.ghost.slice(); },
  update(t, dt, ctx) {
    t.move = Math.min(1, t.move + dt / 0.25);
    tick(t, "bump", dt, 0.4);
    const was = stepped(t, ctx);
    const f = ctx.floor();
    if (!was || t.solved) return;
    if (indexOf(t.cells, f) < 0) { if (indexOf(t.cells, was) >= 0) { t.ghost = t.ghostStart.slice(); t.from = t.ghost.slice(); } return; }
    if (indexOf(t.cells, was) < 0 || !near1(was, f)) return;
    const d = sub(f, was), m = t.mirror === "x" ? [-d[0], d[1]] : [d[0], -d[1]];
    const to = add(t.ghost, m);
    t.from = t.ghost.slice();
    t.move = 0;
    if (indexOf(t.ghostCells, to) >= 0) { t.ghost = to; ctx.emit(t, "ghost"); } else { t.bump = 0; ctx.emit(t, "ghost-bump"); }
    if (same(f, t.plate) && same(t.ghost, t.ghostPlate)) solveWith(t, ctx, "You and your twin press both plates. The reward opens.");
  },
});

defineTrap("t50", {
  cells(t) { return [...(t.marks || []).map((m) => m.cell), ...(t.gates || []).map((g) => g.cell)]; },
  check(t) { return (t.marks || []).length !== 3 || (t.gates || []).length !== 3 ? ["pictogram gates need three waymarks and three gates"] : !t.ledge ? ["wrong gates tip you onto a ledge"] : []; },
  init(t) { t.last = null; t.tip = -1; t.opened = null; },
  reset(t) { t.tip = -1; },
  enter(t, c, prev, ctx) {
    const m = (t.marks || []).find((q) => same(q.cell, c));
    if (m) { t.last = m.glyph; ctx.emit(t, "mark", { glyph: m.glyph }); return; }
    const g = (t.gates || []).find((q) => same(q.cell, c));
    if (!g) return;
    if (g.glyph === t.last) { if (t.opened !== g.glyph) { t.opened = g.glyph; ctx.emit(t, "open", { glyph: g.glyph }); ctx.say("The gate matches the last waymark. It swings open."); } return; }
    t.tip = 0;
    cushion(t, ctx, t.ledge, "tip");
    ctx.say("Wrong gate. It tips you onto a ledge.");
  },
  update(t, dt) { tick(t, "tip", dt, 1); },
});

defineTrap("t51", {
  fuse: 10 * BEAT,
  cells(t) { return t.cells; },
  worst(t) { return { blocked: t.cells }; },
  check(t, P) { return !t.lever ? ["the fuse run needs its lever"] : t.cells.length > 6 ? ["the drawbridge holds up to six cells"] : !t.near ? ["the fuse run needs its near-side cell"] : floorless(t, P); },
  init(t, ctx) { t.lit = -1; t.down = false; t.lower = 0; raiseAll(t, ctx, false); },
  reset(t, ctx) { if (t.down) raiseAll(t, ctx, false); t.down = false; t.lit = -1; const q = ctx?.things?.byId?.[t.lever]; if (q) q.state = "up"; },
  disarm(t, ctx) { raiseAll(t, ctx, true); t.down = true; },
  thing(t, e, ctx) {
    if (e.type !== "trap-act" || e.thing.trap !== t.id || t.lit >= 0) return;
    t.lit = 0;
    t.down = true;
    raiseAll(t, ctx, true);
    ctx.emit(t, "light");
    ctx.say("The fuse fizzes. Ten beats to cross.");
  },
  update(t, dt, ctx) {
    t.lower += ((t.down ? 1 : 0) - t.lower) * Math.min(1, dt * 6);
    if (t.lit < 0) return;
    t.lit += dt;
    if (t.lit < (t.secs || this.fuse)) return;
    t.lit = -1;
    t.down = false;
    raiseAll(t, ctx, false);
    ctx.emit(t, "rise");
    if (indexOf(t.cells, ctx.floor()) >= 0) cushion(t, ctx, t.near, "slide-off");
  },
});

defineTrap("t53", {
  cells(t) { return [...t.cells, ...(t.switchAt ? [t.switchAt] : []), ...(t.exit ? [t.exit] : [])]; },
  check(t) { return t.cells.length !== 16 || (t.dirs || []).length !== 16 ? ["the conveyor knot is a 4x4 belt grid with a direction per belt"] : !t.exit ? ["the conveyor knot needs its exit"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.flipped = false; t.beat = -1; t.flick = -1; },
  reset(t) { t.flipped = false; },
  dirAt(t, i) { const d = DIRS[t.dirs[i]]; return t.flipped && (t.flip || []).includes(i) ? [-d[0], -d[1]] : d; },
  enter(t, c, prev, ctx) {
    if (same(c, t.switchAt)) { t.flipped = !t.flipped; t.flick = 0; ctx.emit(t, "switch", { flipped: t.flipped }); return; }
    if (!t.solved && same(c, t.exit)) solveWith(t, ctx, "The belts deliver you. The reward opens.");
  },
  update(t, dt, ctx) {
    tick(t, "flick", dt, 0.5);
    const beat = Math.floor(ctx.time / BEAT);
    const fresh = beat !== t.beat;
    t.beat = beat;
    if (!fresh) return;
    const a = ctx.actor, f = ctx.floor(), i = indexOf(t.cells, f);
    if (i < 0 || a.path.length || a.moving || a.fx || a.locked) return;
    if (shove(ctx, f, this.dirAt(t, i))) ctx.emit(t, "carry");
  },
});

const dropAt = (t, c, ctx, type = "drop") => { t.open = c.slice(); t.drop = 0; ctx.emit(t, type, { at: c }); ctx.knock(t, [0, 0]); };

defineTrap("t54", {
  worst(t) { return { blocked: t.cells }; },
  check(t) { return t.cells.length !== 1 ? ["the false floor covers one cell"] : []; },
  init(t) { t.open = null; t.drop = -1; },
  reset(t) { t.open = null; t.drop = -1; },
  enter(t, c, prev, ctx) { if (!t.open) dropAt(t, c, ctx); },
  update(t, dt) { if (t.drop >= 0) t.drop += dt; },
});

defineTrap("t55", {
  worst(t) { return { blocked: [t.cells[0]] }; },
  danger(t) { return [t.cells[0]]; },
  learn(t) { return t.open ? [t.open] : [t.cells[0]]; },
  clear(t) { return t.prev && t.next ? t.cells.slice(1).flatMap((s) => { const p = sub(s, t.cells[0]); return [add(t.prev, p), add(t.next, p)]; }) : []; },
  check(t, P) {
    const out = [];
    const [a, ...sides] = t.cells;
    if (sides.length !== 2) return ["the false detour is one path cell and its two shoulders"];
    for (const s of sides) if (!near1(a, s) || !isWalkable(P, s[0], s[1])) out.push(`shoulder ${s} must be a walkable cell beside ${a}`);
    if (!t.prev || !t.next || !near1(t.prev, a) || !near1(t.next, a) || !same(sub(a, t.prev), sub(t.next, a))) out.push("the false detour sits on a straight run, entered from prev and left by next");
    else for (const s of sides) {
      const p = sub(s, a);
      for (const q of [add(t.prev, p), add(t.next, p)]) if (!isWalkable(P, q[0], q[1])) out.push(`the detour past ${s} needs ${q} walkable`);
    }
    return out;
  },
  init(t) { t.open = null; t.drop = -1; t.fell = 0; t.second = null; },
  reset(t) { t.open = null; t.drop = -1; },
  rest(t) { t.fell = 0; t.second = null; },
  enter(t, c, prev, ctx) {
    if (t.open) return;
    if (same(c, t.cells[0])) { t.fell++; dropAt(t, c, ctx); return; }
    if (!t.fell) return;
    if (!t.second) t.second = c.slice();
    if (same(c, t.second)) dropAt(t, c, ctx, "drop-second");
  },
  update(t, dt) { if (t.drop >= 0) t.drop += dt; },
});

const classGate = (cls, impl) => ({
  cls,
  check(t, P) {
    const c = t.cells[0];
    if (t.cells.length !== 1) return ["a class gate covers one cell"];
    return isWalkable(P, c[0], c[1]) ? [] : ["a class gate sits on a walkable cell"];
  },
  init(t) { t.open = null; t.drop = -1; t.held = -1; },
  reset(t) { t.open = null; t.drop = -1; t.held = -1; },
  ...impl,
  update(t, dt, ctx) { if (t.drop >= 0) t.drop += dt; tick(t, "held", dt, 0.8); impl.update?.call(this, t, dt, ctx); },
});

defineTrap("t56", classGate("wanderer", {
  check(t, P) {
    const c = t.cells[0];
    if (t.cells.length !== 1) return ["the ink pit covers one cell"];
    const jumps = N4.some((d) => { const from = sub(c, d), to = add(c, d); return isWalkable(P, from[0], from[1]) && isWalkable(P, to[0], to[1]) && P.cells[from[1]][from[0]].s !== "ramp" && P.cells[to[1]][to[0]].s !== "ramp" && [0, 1].includes(P.cells[from[1]][from[0]].h - P.cells[to[1]][to[0]].h) && P.cells[c[1]][c[0]].h <= P.cells[from[1]][from[0]].h; });
    return jumps ? [] : ["Ink Step must be able to dash over the ink pit"];
  },
  enter(t, c, prev, ctx) { if (!t.open) dropAt(t, c, ctx, "sink"); },
}));

defineTrap("t57", classGate("aws", {
  enter(t, c, prev, ctx) {
    if (t.open) return;
    const r = ctx.knock(t, [0, 0]);
    if (r === "absorbed") { t.held = 0; ctx.emit(t, "hold"); return; }
    t.open = c.slice(); t.drop = 0; ctx.emit(t, "zap", { at: c });
  },
}));

defineTrap("t58", classGate("dutchie", {
  period: 1, opening: 0.29,
  closed(t, now) { return ((now + (t.phase || 0)) % this.period + this.period) % this.period >= this.opening; },
  unsafe(t, c, ctx, from, to) {
    if (!same(c, t.cells[0])) return false;
    for (let u = from; u <= to + 1e-9; u += 1 / 240) if (this.closed(t, ctx.time + u)) return true;
    return false;
  },
  update(t, dt, ctx) {
    t.shut = this.closed(t, ctx.time) ? 1 : 0;
    if (t.shut && !t.open && ctx.on(t.cells[0])) { t.open = t.cells[0].slice(); t.drop = 0; ctx.emit(t, "chomp"); ctx.knock(t, [0, 0]); }
  },
}));

defineTrap("t59", classGate("nm", {
  enter(t, c, prev, ctx) {
    if (t.open) return;
    if (ctx.power().lit) { t.held = 0; ctx.emit(t, "hold"); return; }
    dropAt(t, c, ctx, "snap");
  },
}));

defineTrap("t60", {
  free: true,
  check(t) { return !t.gate ? ["the class seal needs its gate"] : !["wanderer", "aws", "dutchie", "nm"].includes(t.cls) ? ["the class seal names one class"] : t.cells.length !== 1 ? ["the class seal is read from one cell"] : []; },
  init(t, ctx) { t.solved = solvedGate(t, ctx); t.nope = -1; t.told = false; },
  reset(t) { t.told = false; },
  enter(t, c, prev, ctx) {
    if (t.solved || !same(c, t.cells[0])) return;
    if (ctx.power().cls === t.cls) { solveWith(t, ctx, t.text || "The seal knows you. The gate swings open."); return; }
    t.nope = 0;
    ctx.emit(t, "nope");
    if (!t.told) { t.told = true; ctx.say(t.hint || "The seal stays shut. It wants someone else."); }
  },
  update(t, dt) { tick(t, "nope", dt, 0.6); },
});
