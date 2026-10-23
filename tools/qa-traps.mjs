import puppeteer from "puppeteer-core";
import { screenOf, watchdog } from "./qa-lib.mjs";
import path from "node:path";
import fs from "node:fs";
import { validateTraps, liftToLift, worstState, mustGuard, guardProblems, rewardCells } from "../core/traps/rules.js";
import { prepareLevel } from "../core/level.js";
import { findPath } from "../core/path.js";
import { TRAP_CATALOG } from "../core/traps/catalog.js";
import { KINDS } from "../core/traps/kinds.js";
import { registerCatalog } from "../core/catalog.js";
import { createActor } from "../core/actor.js";
import { createHealth } from "../core/health.js";
import { createLife } from "../core/life.js";
import { createTraps } from "../core/traps/index.js";
import { walkReport, deathBandFor, WALK } from "../core/traps/walk.js";
import { inkStep, DASH_S, RUSH, CLASS_IDS } from "../core/powers.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const SHOW = "traps-showcase";
const RUN = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const results = [];
const alive = watchdog();
const record = (name, ok, detail = "") => { alive(name); results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " " + detail : ""}`); };
const readLevel = (n) => JSON.parse(fs.readFileSync(path.join(root, "levels", `${n}.json`), "utf8"));
const registered = new Set();
const register = async (L) => {
  for (const p of [...new Set([...(L.pieces || []), "pieces/kits.js"])]) {
    if (registered.has(p)) continue;
    registered.add(p);
    const mod = await import(path.join(root, "3d", p));
    if (mod.register) registerCatalog((await mod.register({ palette: L.palette || {} })).catalog || {});
  }
};

record("catalog holds all 60 approved traps", TRAP_CATALOG.length === 60, `${TRAP_CATALOG.length}`);
const POC = TRAP_CATALOG.map((t) => t.id);
record("every approved trap has a runtime", POC.every((k) => KINDS[k]), POC.filter((k) => !KINDS[k]).join(","));
const show = readLevel(SHOW);
await register(show);
record("showcase holds one of each approved trap", POC.every((k) => show.traps.some((t) => t.kind === k)), POC.filter((k) => !show.traps.some((t) => t.kind === k)).join(","));
const sv = validateTraps(show);
record("showcase traps pass the placement rules", !sv.length, sv.join("; "));
record("validator rejects an unguarded obvious trap", validateTraps({ ...show, traps: show.traps.map((t) => t.kind === "t03" ? { ...t, guards: undefined } : t) }).some((p) => /must guard a reward/.test(p)));
record("validator rejects a guard you can walk around", validateTraps({ ...show, traps: show.traps.map((t) => t.kind === "t03" ? { ...t, cells: [[9, 12]], guards: { chest: "arrows-chest" } } : t) }).some((p) => /walk around it|only approach|cannot be reached/.test(p)));
for (const t of show.traps.filter((t) => mustGuard(t.kind))) record(`showcase ${t.kind} guards a reward with no way around`, !guardProblems(show, t).length && !!(t.guards?.chest || t.guards?.at));
const firstLaneTile = (L, t) => {
  const P = prepareLevel(JSON.parse(JSON.stringify(L)));
  const goals = rewardCells(L, t.guards, P) || [];
  const p = goals.map((g) => findPath(P, L.spawn, g)).filter(Boolean).sort((a, b) => a.length - b.length)[0] || [];
  const hit = p.find((c) => t.cells.some((q) => q[0] === c[0] && q[1] === c[1]));
  const cover = KINDS.t25.coverAt(t);
  return !!hit && hit[0] === t.plate[0] && hit[1] === t.plate[1] && t.cells[0][0] === t.plate[0] && t.cells[0][1] === t.plate[1] && cover >= 1 && cover <= t.cells.length - 3 && !KINDS.t25.check(t, P).length;
};
for (const n of RUN) await register(readLevel(n));
for (const [n, L] of [[SHOW, show], ...RUN.map((n) => [n, readLevel(n)])]) for (const t of (L.traps || []).filter((t) => t.kind === "t25")) record(`${n === SHOW ? "showcase" : "a run island"} t25 trigger is the first lane tile and a cover cell sits off the line`, firstLaneTile(L, t));
record("validator rejects an excluded pair", validateTraps({ ...show, trapRules: undefined }).some((p) => /exclude each other/.test(p)));
for (const [i, name] of RUN.entries()) {
  const L = readLevel(name);
  if (!L.traps?.length) continue;
  await register(L);
  const p = validateTraps(L, { position: i + 1 });
  record(`run island ${i + 1} traps pass rules and budget`, !p.length, p.join("; "));
  record(`run island ${i + 1} lift to lift with traps at worst`, liftToLift(L, worstState(L).blocked) === true);
  record(`run island ${i + 1} keeps a guarded optional reward`, L.traps.some((t) => t.guards && mustGuard(t.kind)));
}

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const mini = (rows, traps, extra = {}) => {
  const cells = rows.map((r) => r.split("").map((ch) => (ch === "." ? { h: 0, s: "none" } : ch === "#" ? { h: 1, s: "stone", p: 1 } : { h: 1, s: "grass" })));
  return prepareLevel({ name: "mini", size: [cells[0].length, cells.length], cells, decor: [], spawn: [1, 1], things: [{ id: "f", kind: "bonfire", x: 0, z: 0 }], trapRules: "showcase", traps, ...extra });
};
const sim = (L, cell, { cls = "wanderer" } = {}) => {
  const actor = createActor(L, cell), health = createHealth({ storage: mem() });
  let traps = null;
  const life = createLife({ level: L, actor, health, variant: "pause", random: () => 0, onRespawn: () => traps?.reset() });
  const power = { cls, lit: false };
  const solved = [];
  traps = createTraps(L, { actor, life, health, storage: mem(), power: () => power, things: { solve: (id) => solved.push(id), byId: {}, on: () => () => {} } });
  const ev = [];
  life.on((e) => ev.push("life:" + e.type));
  traps.on((e) => ev.push("trap:" + e.type));
  let scale = 1;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { actor.update(1 / 60); traps.update(scale / 60); life.update(1 / 60); } };
  const walk = (cells, max = 240) => { actor.path = cells.map((c) => c.slice()); for (let i = 0; i < max && (actor.path.length || actor.moving) && !life.busy; i++) tick(); };
  const use = () => {
    if (cls === "wanderer") return (from, dir) => { const r = inkStep(L, from, dir); if (!r.to) return false; traps.skip([r.mid], DASH_S + 0.5); tick(Math.round(DASH_S * 60)); actor.cell = r.to.slice(); actor.pos.x = r.to[0] + 0.5; actor.pos.z = r.to[1] + 0.5; tick(2); return true; };
    if (cls === "aws") return () => health.ward(true);
    if (cls === "dutchie") return () => { scale = RUSH.scale; return true; };
    return () => { power.lit = true; return true; };
  };
  return { actor, health, life, traps, ev, tick, walk, use, power, solved, set scale(v) { scale = v; } };
};
const lane = ["......", ".####.", "......"];
const lost = (s) => s.ev.some((e) => e === "life:knock" || e === "life:fall" || e === "life:flop");

{
  const s = sim(mini(lane, [{ id: "ff", kind: "t54", cells: [[3, 1]] }]), [1, 1]);
  s.walk([[2, 1], [3, 1], [4, 1]]);
  record("t54 false floor drops you off the island", s.ev.includes("trap:drop") && s.ev.includes("life:knock"), s.ev.join(","));
}
{
  const rows = [".......", ".ggggg.", ".#####.", ".ggggg.", "......."];
  const L = mini(rows, [{ id: "fd", kind: "t55", cells: [[3, 2], [3, 1], [3, 3]], prev: [2, 2], next: [4, 2] }]);
  const s = sim(L, [1, 2]);
  s.walk([[2, 2], [3, 2]]);
  const first = lost(s);
  for (let i = 0; i < 300 && s.life.busy; i++) s.tick();
  s.ev.length = 0;
  s.actor.cell = [2, 2]; s.actor.pos.x = 2.5; s.actor.pos.z = 2.5;
  s.walk([[2, 1], [3, 1]]);
  const second = lost(s);
  for (let i = 0; i < 300 && s.life.busy; i++) s.tick();
  s.ev.length = 0;
  s.actor.cell = [2, 2]; s.actor.pos.x = 2.5; s.actor.pos.z = 2.5;
  s.walk([[2, 3], [3, 3], [4, 3], [4, 2], [5, 2]]);
  const third = lost(s);
  record("t55 the path cell drops you, then the first shoulder you try, and the other shoulder holds", first && second && !third && s.actor.cell.join() === "5,2", `${first} ${second} ${third} ${s.actor.cell}`);
  s.traps.rest(); s.traps.reset(); s.ev.length = 0;
  s.actor.cell = [2, 2]; s.actor.pos.x = 2.5; s.actor.pos.z = 2.5;
  s.walk([[2, 1], [3, 1], [4, 1]]);
  record("t55 after a rest both shoulders hold until the path cell drops you again", !lost(s), s.ev.join(","));
}
const GATES = { t56: "wanderer", t57: "aws", t58: "dutchie", t59: "nm" };
for (const [kind, owner] of Object.entries(GATES)) {
  for (const cls of CLASS_IDS) {
    let passed = 0;
    const tries = kind === "t58" ? 12 : 1;
    for (let k = 0; k < tries; k++) {
      const L = mini(lane, [{ id: "g", kind, cells: [[3, 1]], phase: k / tries }]);
      const s = sim(L, [2, 1], { cls });
      s.tick(1);
      if (cls === owner) {
        const use = s.use();
        if (cls === "wanderer") use([2, 1], "e");
        else use();
        if (kind === "t58") {
          const shut = () => KINDS.t58.closed(s.traps.byId.g, s.traps.ctx.time);
          for (let i = 0; i < 240 && !shut(); i++) s.tick();
          for (let i = 0; i < 240 && shut(); i++) s.tick();
          s.tick(WALK.jitter);
        }
      }
      if (cls !== "wanderer" || cls !== owner) s.walk([[3, 1], [4, 1]]);
      else s.walk([[4, 1]]);
      if (!lost(s) && s.actor.cell.join() === "4,1") passed++;
    }
    record(`${kind} ${KINDS[kind].cls === cls ? "lets its own class through" : `stops ${cls}`}`, cls === owner ? passed === tries : passed === 0, `${passed}/${tries}`);
  }
}
{
  const K = KINDS.t58, cross = 1 / 3.2;
  record("t58 jaws stay shut too long to cross at full speed, and Rush leaves a window", K.opening < cross && K.opening / RUSH.scale - cross >= 8 / 60, `${K.opening} s open, ${(K.opening / RUSH.scale - cross).toFixed(2)} s slack under Rush`);
}
for (const cls of CLASS_IDS) {
  const L = mini(["......", ".####.", "......"], [{ id: "seal", kind: "t60", cells: [[3, 1]], cls: "nm", gate: "sg" }]);
  const s = sim(L, [2, 1], { cls });
  s.walk([[3, 1]]);
  record(`t60 class seal ${cls === "nm" ? "opens for its class" : `stays shut for ${cls}`}`, cls === "nm" ? s.solved.includes("seal") : !s.solved.length && s.ev.includes("trap:nope"), s.ev.join(","));
}
for (const [i, name] of RUN.entries()) {
  const L = readLevel(name);
  await register(L);
  const r = walkReport(L, { position: i + 1 }), m = r.runs[0].mind, band = deathBandFor(i + 1);
  record(`run island ${i + 1} mindless walk dies ${band[0]} to ${band[1]} times`, m.done && m.deaths >= band[0] && m.deaths <= band[1], `${m.deaths} deaths, ${m.hearts} hearts, ${m.swaps} class swaps`);
  record(`run island ${i + 1} memorized walk reaches the exit lift without dying, on time and ${WALK.jitter} frames late`, r.runs[0].sure.done && !r.runs[0].sure.deaths && r.runs[0].late.done && !r.runs[0].late.deaths, `${r.runs[0].sure.deaths}/${r.runs[0].late.deaths}`);
}

if (args.includes("--no-browser")) {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-traps"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(query, { width = 1000, height = 800 } = {}) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/3d/index.html?${query}`, { waitUntil: "load" });
  const done = await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 }).then(() => true, () => false);
  await page.evaluate(async () => {
    const { findPath } = await import("/core/path.js");
    const g = window.__game, S = () => g.state;
    g.pause();
    const ev = (window.__ev = []);
    const hook = () => {
      const s = S();
      if (s.__hooked === s.traps) return;
      s.__hooked = s.traps;
      s.traps?.on((e) => ev.push({ src: "trap", type: e.type, kind: e.trap?.kind }));
      s.life?.on((e) => ev.push({ src: "life", type: e.type, cell: e.cell }));
    };
    S().health.on((e) => ev.push({ src: "health", type: e.type, hearts: e.hearts }));
    hook();
    const draw = g.renderer.render, quiet = () => {};
    const tick = (n = 1) => { g.renderer.render = quiet; try { for (let i = 0; i < n; i++) g.advance(1 / 60); } finally { g.renderer.render = draw; } };
    const settle = (max = 6) => { const a = S().actor; let t = 0; while ((a.path.length || a.moving || a.locked) && t < max) { tick(); t += 1 / 60; } return t; };
    window.__qt = {
      tick, settle,
      cell: () => S().actor.cell.slice(),
      floor: () => S().traps?.ctx.floor(),
      hearts: () => S().health.hearts,
      clear: () => { ev.length = 0; },
      events: () => ev.slice(),
      place(c) {
        const a = S().actor;
        a.path = []; a.held = null; a.tapDir = null; a.moving = false; a.locked = false; a.fx = null;
        a.cell = [c[0], c[1]]; a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5;
        tick(2);
      },
      until(f, max = 6) { let t = 0; while (!f() && t < max) { tick(); t += 1 / 60; } return f(); },
      walk(goal, max = 8) {
        const a = S().actor, p = findPath(S().level, a.cell, goal);
        if (!p) return null;
        a.setPath(p);
        settle(max);
        return a.cell.slice();
      },
      path(cells, max = 8) { S().actor.setPath(cells); settle(max); return S().actor.cell.slice(); },
      trap: (id) => { const t = S().traps.byId[id]; return { up: t.up, beat: t.beat, crossings: t.crossings, broken: t.broken, state: t.state, solved: t.solved, step: t.step, show: t.show, revealed: t.revealed, solid: t.solid, pos: t.pos, awake: t.awake, on: t.on, thick: t.thick, volley: t.volley }; },
      beat: () => Math.floor((S().traps.time / 0.5) % 4),
      refill: () => { S().health.refill(); tick(80); },
      rest: () => S().life.respawnCell(),
    };
  });
  return { page, problems, done };
}

const q = (page, f, ...a) => page.evaluate(f, ...a);

{
  const { page, problems, done } = await open(`level=${SHOW}&reset=1`);
  record("showcase loads", done && !problems.length, problems.join(" | "));
  await page.evaluate(() => { try { localStorage.removeItem("isoworld:hearts"); } catch {} window.__game.state.health.refill(); });
  const hud = await q(page, () => { const h = document.querySelector(".iw-hearts"); return h && { n: h.querySelectorAll(".h").length, full: h.querySelectorAll(".h:not(.empty)").length }; });
  record("hearts HUD shows 3 full hearts", hud?.n === 3 && hud.full === 3, JSON.stringify(hud));

  const reach = await q(page, async () => {
    const { findPath } = await import("/core/path.js");
    const S = window.__game.state, bad = [];
    for (const t of S.traps.list) {
      const zone = t.zone || (t.kind === "t33" ? [24, 5, 24, 5] : null);
      const around = (cs) => [...cs, ...cs.flatMap(([x, z]) => [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]])].filter((c) => !S.level.slick.has(c.join(",")));
      const cells = zone ? [[zone[0] + 3, zone[1] + 2], [24, 5]] : t.kind === "t24" ? t.cells : around(t.footprint);
      if (!cells.some((c) => findPath(S.level, S.level.spawn, c))) bad.push(t.kind);
    }
    return bad;
  });
  record("every showcase trap is reachable from spawn", !reach.length, reach.join(","));

  await q(page, () => { __qt.place([10, 12]); __qt.until(() => __qt.beat() === 1, 3); __qt.clear(); __qt.place([9, 12]); __qt.until(() => __qt.hearts() < 3, 2); __qt.settle(); });
  let r = await q(page, () => ({ hearts: __qt.hearts(), cell: __qt.cell(), ev: __qt.events() }));
  record("t03 beat spikes cost one heart", r.hearts === 2, JSON.stringify(r.hearts));
  record("t03 beat spikes poke you back a cell", r.cell[0] === 10 && r.cell[1] === 12, `${r.cell}`);
  record("damage flashes the HUD", await q(page, () => !!document.querySelector(".iw-hurt.on") && document.querySelector(".iw-hearts").dataset.hearts === "2"));

  await q(page, () => { __qt.refill(); __qt.place([10, 12]); __qt.until(() => __qt.beat() === 2, 3); __qt.until(() => __qt.beat() === 3, 3); __qt.clear(); __qt.walk([5, 12]); });
  r = await q(page, () => ({ hearts: __qt.hearts(), cell: __qt.cell() }));
  record("t03 walking in time gets through untouched", r.hearts === 3 && r.cell[0] === 5, JSON.stringify(r));
  r = await q(page, () => { __qt.walk([4, 12]); const T = window.__game.state.things; T.act(); __qt.tick(10); return T.byId["spikes-chest"].state; });
  record("t03 guards a chest you reach by timing it", r === "open", r);

  const arrowRun = (cells) => q(page, (cells) => {
    __qt.refill(); __qt.place([21, 12]); __qt.tick(90); __qt.clear();
    const S = window.__game.state, t = S.traps.byId.arrows, shot = window.__game.renderer.traps.group.getObjectByName("t25-arrow");
    S.actor.setPath(cells);
    const seen = [];
    for (let i = 0; i < 240; i++) { __qt.tick(); if (t.arrow != null) seen.push({ s: t.arrow, vis: shot.visible, x: shot.position.x, z: shot.position.z }); }
    return { hearts: __qt.hearts(), cell: __qt.cell(), ev: __qt.events().filter((e) => e.src === "trap").map((e) => e.type), seen, k: t.k, delay: t.delay };
  }, cells);
  r = await arrowRun([[22, 12], [23, 12], [24, 12], [24, 13]]);
  record("t25 stepping onto the first lane tile arms the plate", r.ev[0] === "click" && r.ev.includes("loose"), r.ev.join(","));
  record("t25 the cover cell saves you when you reach it in time", r.hearts === 3 && r.ev.includes("thunk") && !r.ev.includes("arrow-hit") && r.cell[1] === 13, JSON.stringify({ h: r.hearts, cell: r.cell, ev: r.ev }));
  const fly = r.seen;
  record("t25 the arrow is visible for its whole flight", fly.length > 10 && fly.every((p) => p.vis), `${fly.length} frames, ${fly.filter((p) => !p.vis).length} hidden`);
  record("t25 the arrow leaves the slot beside the plate and flies down the lane", fly.length > 10 && Math.abs(fly[0].x - 22.14) < 0.5 && fly.at(-1).x > fly[0].x + 4 && fly.every((p, i) => !i || p.x > fly[i - 1].x), `${fly[0]?.x.toFixed(2)} -> ${fly.at(-1)?.x.toFixed(2)}`);
  r = await arrowRun([[22, 12]]);
  record("t25 standing on the plate takes the arrow", r.hearts === 2 && r.ev.includes("arrow-hit"), JSON.stringify({ h: r.hearts, ev: r.ev }));
  r = await arrowRun([[22, 12], [23, 12], [24, 12], [25, 12], [26, 12], [27, 12]]);
  record("t25 running the lane without cover takes the arrow", r.hearts === 2 && r.ev.includes("arrow-hit"), JSON.stringify({ h: r.hearts, ev: r.ev }));
  r = await arrowRun([[22, 12], [23, 12]]);
  record("t25 dawdling short of the cover takes the arrow", r.hearts === 2, JSON.stringify({ h: r.hearts, ev: r.ev }));
  await q(page, () => { __qt.refill(); __qt.place([24, 13]); __qt.tick(60); __qt.walk([27, 12]); __qt.tick(20); });
  r = await q(page, () => { const T = window.__game.state.things; T.act(); __qt.tick(10); return T.byId["arrows-chest"].state; });
  record("t25 guards a chest at the end of the lane", r === "open", r);

  await q(page, () => { __qt.refill(); __qt.place([15, 8]); __qt.clear(); __qt.walk([15, 4]); });
  r = await q(page, () => __qt.trap("worn"));
  record("t02 flagstones crack on the first crossing", r.crossings === 1 && !r.broken, JSON.stringify(r));
  await q(page, () => { __qt.walk([15, 8]); __qt.walk([15, 4], 2.5); __qt.until(() => !window.__game.state.life.busy, 4); __qt.settle(); });
  r = await q(page, () => ({ ev: __qt.events().map((e) => e.src + ":" + e.type), cell: __qt.cell(), rest: __qt.rest(), hearts: __qt.hearts(), worn: __qt.trap("worn") }));
  record("t02 third crossing drops you off the island", r.ev.includes("trap:collapse") && r.ev.includes("life:knock"), r.ev.join(","));
  record("knock-off respawns at the bonfire", r.ev.includes("life:respawn") && r.cell[0] === r.rest[0] && r.cell[1] === r.rest[1], `${r.cell} vs ${r.rest}`);
  record("respawn refills hearts and resets traps", r.hearts === 3 && !r.worn.broken && r.worn.crossings === 0, JSON.stringify(r.worn));

  await q(page, () => { __qt.refill(); __qt.place([11, 15]); __qt.clear(); __qt.walk([11, 21], 3); __qt.until(() => !window.__game.state.life.busy, 4); __qt.settle(); });
  r = await q(page, () => ({ ev: __qt.events().map((e) => e.src + ":" + e.type), cell: __qt.cell() }));
  record("t24 boss winds up before the kick", r.ev.indexOf("trap:windup") >= 0 && r.ev.indexOf("trap:windup") < r.ev.indexOf("trap:kick"), r.ev.join(","));
  record("t24 kick knocks you off", r.ev.includes("trap:punt") && r.ev.includes("life:knock") && r.ev.includes("life:respawn"), r.ev.join(","));
  await q(page, () => { __qt.place([11, 15]); __qt.tick(80); __qt.path([[11, 16]]); __qt.clear(); __qt.until(() => __qt.trap("kick").state === "recover", 3); __qt.walk([11, 21]); });
  r = await q(page, () => ({ ev: __qt.events().map((e) => e.src + ":" + e.type), cell: __qt.cell() }));
  record("t24 waiting out the kick lets you walk past", r.ev.includes("trap:whiff") && !r.ev.includes("life:knock") && r.cell[1] === 21, `${r.cell} ${r.ev.join(",")}`);

  await q(page, () => { __qt.place([18, 15]); __qt.tick(80); __qt.clear(); __qt.walk([19, 23], 4); __qt.until(() => !window.__game.state.life.busy, 4); __qt.settle(); });
  r = await q(page, () => ({ ev: __qt.events().map((e) => e.src + ":" + e.type), cell: __qt.cell() }));
  record("t26 plate wakes the chariot", r.ev.includes("trap:wake") && r.ev.includes("trap:charge"), r.ev.join(","));
  record("t26 chariot runs you off the lane", r.ev.includes("trap:run-over") && r.ev.includes("life:knock"), r.ev.join(","));
  await q(page, () => { __qt.place([12, 12]); __qt.tick(200); __qt.place([18, 15]); __qt.clear(); __qt.path([[19, 15], [19, 16], [19, 17], [19, 18], [20, 18]]); __qt.until(() => __qt.events().some((e) => e.type === "pass"), 6); });
  r = await q(page, () => ({ ev: __qt.events().map((e) => e.src + ":" + e.type), cell: __qt.cell() }));
  record("t26 a shoulder notch lets the chariot pass", r.ev.includes("trap:pass") && !r.ev.includes("life:knock") && r.cell[0] === 20, `${r.cell} ${r.ev.join(",")}`);
  await q(page, () => { __qt.place([12, 12]); __qt.tick(200); });

  await q(page, () => { __qt.refill(); __qt.place([20, 9]); __qt.clear(); __qt.walk([24, 9]); });
  r = await q(page, () => ({ hearts: __qt.hearts(), cell: __qt.cell(), t: __qt.trap("block"), ev: __qt.events().map((e) => e.src + ":" + e.type) }));
  record("t21 hidden block bonks for one heart", r.hearts === 2 && r.ev.includes("trap:bonk") && r.cell[0] === 21, JSON.stringify(r));
  record("t21 block shows its outline after the bonk", r.t.revealed && r.t.solid);
  r = await q(page, () => __qt.walk([24, 9]));
  record("t21 you step around the block on the shoulder", r && r[0] === 24, `${r}`);

  await q(page, () => { __qt.refill(); __qt.clear(); __qt.walk([24, 5]); __qt.tick(90); });
  r = await q(page, async () => {
    const THREE = await import("three");
    const g = window.__game, S = g.state, cv = document.querySelector(".iw-fog");
    g.advance(1 / 60);
    if (!cv || cv.style.display === "none") return { on: false };
    const cam = g.renderer.three.camera, a = S.actor;
    const v = new THREE.Vector3(a.pos.x, a.y + 0.4, a.pos.z).project(cam);
    const px = Math.round((v.x + 1) / 2 * cv.width), py = Math.round((1 - v.y) / 2 * cv.height);
    const ctx = cv.getContext("2d");
    return { on: true, hero: ctx.getImageData(px, py, 1, 1).data[3], corner: ctx.getImageData(4, 4, 1, 1).data[3], toast: document.querySelector(".iw-toast")?.textContent || "", status: (window.__status?.items() || []).map((it) => `${it.title}: ${it.text}`).join(" | ") };
  });
  record("t33 fog covers the island", r.on && r.corner > 200, JSON.stringify(r));
  record("t33 fog clears three cells around the hero", r.on && r.hero < 40, `${r.hero}`);
  record("t33 fog names itself on arrival in the status bubble", /fog/i.test(r.status || "") && !/fog/i.test(r.toast || ""), JSON.stringify({ status: r.status, toast: r.toast }));
  await q(page, () => { __qt.walk([24, 9]); __qt.tick(120); });
  r = await q(page, () => __qt.trap("fog").thick);
  record("t33 fog lifts outside its zone on the showcase", r < 0.05, `${r}`);

  await q(page, () => { __qt.clear(); __qt.walk([4, 7], 10); __qt.path([[4, 6]]); __qt.tick(20); });
  r = await q(page, () => __qt.trap("order"));
  record("t40 lamps flash the order on entry", r.show != null, JSON.stringify(r));
  await q(page, () => { __qt.until(() => __qt.trap("order").show == null, 4); __qt.clear(); __qt.path([[4, 5], [5, 5]]); __qt.tick(10); });
  r = await q(page, () => ({ t: __qt.trap("order"), hearts: __qt.hearts(), ev: __qt.events().map((e) => e.type) }));
  record("t40 a wrong plate blows a raspberry, resets and costs no heart", r.ev.includes("raspberry") && r.t.step === 0 && r.hearts === 3, JSON.stringify(r));
  await q(page, () => {
    __qt.until(() => __qt.trap("order").show == null, 4);
    __qt.clear();
    __qt.path([[4, 5], [3, 5]]);
    __qt.path([[3, 4], [3, 3]]);
    __qt.path([[3, 4], [4, 4], [5, 4], [5, 5]]);
    __qt.path([[5, 4], [5, 3]]);
    __qt.tick(120);
  });
  r = await q(page, () => ({ t: __qt.trap("order"), gate: window.__game.state.things.byId["plate-gate"].state, ev: __qt.events().map((e) => e.type) }));
  record("t40 the right order solves the puzzle", r.t.solved && r.ev.filter((e) => e === "press").length === 4, JSON.stringify(r));
  record("t40 solving opens the reward gate", r.gate === "open", r.gate);
  r = await q(page, () => { __qt.path([[4, 3], [4, 2]]); return __qt.cell(); });
  record("t40 the reward is walkable once open", r[0] === 4 && r[1] === 2, `${r}`);

  await q(page, () => { __qt.place([14, 12]); __qt.refill(); __qt.clear(); const L = window.__game.state.life; for (let i = 0; i < 3; i++) { L.hurt(1, { cause: "qa" }); __qt.tick(80); } __qt.until(() => !L.busy, 4); __qt.tick(5); });
  r = await q(page, () => ({ ev: __qt.events().map((e) => e.src + ":" + e.type), hearts: __qt.hearts(), cell: __qt.cell(), rest: __qt.rest(), hud: document.querySelector(".iw-hearts").dataset.hearts }));
  record("hearts drain one at a time", r.ev.filter((e) => e === "health:hurt").length === 3, r.ev.join(","));
  record("losing the last heart flops and respawns", r.ev.includes("life:flop") && r.ev.includes("life:respawn"), r.ev.join(","));
  record("death respawns at the bonfire with 3 hearts", r.hearts === 3 && r.hud === "3" && r.cell[0] === r.rest[0] && r.cell[1] === r.rest[1], JSON.stringify(r));

  await q(page, () => { __qt.tick(80); window.__game.state.life.hurt(1, { cause: "qa" }); __qt.tick(80); __qt.place([15, 11]); __qt.tick(5); });
  const before = await q(page, () => __qt.hearts());
  r = await q(page, () => { const T = window.__game.state.things; const ok = T.act(); __qt.tick(10); return { ok, hearts: __qt.hearts(), focus: T.focus?.kind, fire: T.byId.fire.state }; });
  record("resting at the bonfire refills hearts", before === 2 && r.hearts === 3 && r.fire === "lit", `${before} -> ${JSON.stringify(r)}`);
  r = await q(page, () => { window.__game.state.life.knock([1, 0], "qa"); __qt.until(() => !window.__game.state.life.busy, 4); __qt.tick(2); return { cell: __qt.cell(), rest: __qt.rest() }; });
  record("respawn lands at the bonfire you rested at", r.cell[0] === 15 && r.cell[1] === 11 && r.rest[0] === 15, JSON.stringify(r));

  r = await q(page, () => { __qt.tick(80); window.__game.state.life.hurt(1, { cause: "qa" }); return localStorage.getItem("isoworld:hearts"); });
  record("hearts persist under isoworld:hearts", r === "2", r);
  r = await q(page, async () => { const { resetAll } = await import("/core/dev.js"); resetAll(); return [localStorage.getItem("isoworld:hearts"), localStorage.getItem("isoworld:traps:traps-showcase")]; });
  record("resetAll clears hearts", r[0] == null, JSON.stringify(r));
  r = await q(page, () => { const T = window.__game.state.traps; const at = T.at([22, 9]); const ok = T.disarm(at.id); return { at, ok, saved: localStorage.getItem("isoworld:traps:traps-showcase"), after: T.at([22, 9]) }; });
  record("trap API: at, disarm persists", r.at?.kind === "t21" && r.ok && /block/.test(r.saved || "") && r.after.disarmed, JSON.stringify(r.after));
  r = await q(page, () => { const S = window.__game.state; __qt.tick(80); S.health.ward(); const h = S.health.hearts; S.life.hurt(1, { cause: "qa" }); return { before: h, after: S.health.hearts, warded: S.health.warded }; });
  record("trap API: ward absorbs the next hit", r.before === r.after && !r.warded, JSON.stringify(r));
  await page.close();
}

{
  const { page, problems, done } = await open(`level=${SHOW}&reset=1`);
  record("showcase with every trap loads clean", done && !problems.length, problems.slice(0, 3).join(" | "));
  await q(page, () => {
    const S = () => window.__game.state;
    window.__tq = {
      P: (plot, x, z) => { const o = S().level.plots[plot]; return [o[0] + x, o[1] + z]; },
      t: (id) => S().traps.byId[id],
      ev: (src, kind) => __qt.events().filter((e) => (!src || e.src === src) && (!kind || e.src !== "trap" || e.kind === kind)).map((e) => e.src + ":" + e.type),
      wait: () => { __qt.until(() => !S().life.busy, 6); __qt.tick(3); __qt.settle(); },
      act: () => { __qt.tick(3); const r = S().things.act(); __qt.tick(10); return r; },
      focus: () => { __qt.tick(3); return S().things.focus?.id || null; },
      walkable: (c) => { const L = S().level, k = L.cells[c[1]]?.[c[0]]; return !!k && k.h >= 1 && k.s !== "none" && !L.blocked.has(c[0] + "," + c[1]); },
      at: (c) => S().actor.cell[0] === c[0] && S().actor.cell[1] === c[1],
      fresh: () => { S().health.refill(); __qt.tick(80); __qt.clear(); },
    };
  });
  const run = async (fn, ...a) => q(page, fn, ...a);
  let r;

  r = await run(() => {
    const P = (x, z) => __tq.P("goose", x, z);
    __tq.fresh(); __qt.place(P(3, 1)); __qt.clear();
    for (const c of [[3, 2], [2, 2], [3, 2], [3, 3], [4, 3], [3, 3], [3, 4], [2, 4]]) __qt.path([P(...c)]);
    __qt.tick(5);
    const t = __tq.t("goose"), g = t.goose && t.goose.slice(), blocked = g && !__tq.walkable(g);
    const bird = window.__game.renderer.traps.group.children.some((m) => m.visible && Math.abs(m.position.x - (g?.[0] ?? -9) - 0.5) < 0.01 && Math.abs(m.position.z - (g?.[1] ?? -9) - 0.5) < 0.01);
    __qt.tick(150);
    return { ev: __tq.ev("trap"), g, blocked, bird, gone: !__tq.t("goose").goose, hearts: __qt.hearts() };
  });
  record("t04 shoulder plates honk and the third honk calls a goose onto the path", r.ev.filter((e) => e === "trap:honk").length === 3 && r.ev.includes("trap:goose") && r.blocked && r.bird, JSON.stringify(r));
  record("t04 the goose waddles off after four beats and costs nothing", r.gone && r.ev.includes("trap:waddle") && r.hearts === 3, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("banana", x, z);
    __tq.fresh(); __qt.place(P(3, 2)); __qt.clear(); __qt.path([P(3, 3), P(3, 4)]); __tq.wait();
    const fell = __tq.ev();
    __qt.place(P(3, 3)); __qt.clear(); __qt.path([P(4, 3), P(4, 4)]);
    const cut = { ev: __tq.ev("trap"), at: __tq.at(P(4, 4)) };
    __qt.walk(P(6, 4)); __tq.act();
    return { fell, cut, chest: window.__game.state.things.byId["banana-chest"].state };
  });
  record("t05 the scuff slides you straight on into the clouds", r.fell.includes("trap:slip") && r.fell.includes("life:fall") && r.fell.includes("life:respawn"), r.fell.join(","));
  record("t05 cutting the corner skips the scuff and reaches the chest", r.cut.at && !r.cut.ev.includes("trap:slip") && r.chest === "open", JSON.stringify(r.cut) + " " + r.chest);

  r = await run(() => {
    const P = (x, z) => __tq.P("sneeze", x, z);
    __tq.fresh(); __qt.place(P(3, 3)); __qt.clear(); __qt.path([P(3, 4)]); __qt.tick(30);
    const first = { at: __tq.at(P(3, 3)), ev: __tq.ev("trap") };
    __qt.path([P(3, 4)]); __qt.path([P(3, 5)]); __qt.tick(30); __qt.path([P(3, 5)]); __qt.tick(5);
    __tq.act();
    return { first, through: __tq.at(P(3, 5)), sneezes: __tq.ev("trap").filter((e) => e === "trap:sneeze").length, hearts: __qt.hearts(), chest: window.__game.state.things.byId["sneeze-chest"].state };
  });
  record("t06 dust makes you sneeze back a cell for no heart", r.first.at && r.first.ev.includes("trap:sneeze") && r.hearts === 3, JSON.stringify(r));
  record("t06 each dusty cell sneezes once, so you get through", r.through && r.sneezes === 2 && r.chest === "open", JSON.stringify(r));

  r = await run(async () => {
    const { beckons } = await import("/core/beckon.js");
    const P = (x, z) => __tq.P("mimic", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 7));
    const focus = __tq.focus(), glow = beckons(S.things.byId["mimic-chest"]);
    __tq.act();
    __qt.until(() => __tq.ev("trap").includes("trap:bite"), 5); __qt.tick(10);
    return { focus, glow, ev: __tq.ev("trap"), hearts: __qt.hearts(), state: __tq.t("mimic").state };
  });
  record("t07 the mimic glows and offers itself like a chest", r.focus === "mimic-chest" && r.glow, JSON.stringify(r));
  record("t07 opening it grows teeth, it bites one heart, then coughs up a coin", r.ev.includes("trap:teeth") && r.ev.includes("trap:bite") && r.ev.includes("trap:cough") && r.hearts === 2 && r.state === "bored", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("trapdoor", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 4)); __tq.act(); __qt.tick(60); __qt.settle();
    return { ev: __tq.ev("trap"), at: __tq.at(P(4, 4)), y: S.actor.y, hearts: __qt.hearts(), chest: S.things.byId["trapdoor-chest"].state };
  });
  record("t08 opening the chest drops its pad a tier with you on it", r.ev.includes("trap:drop") && r.at && r.y < 1.5, JSON.stringify(r));
  record("t08 you keep the loot and land for one heart", r.chest === "open" && r.hearts === 2 && r.ev.includes("trap:bump"), JSON.stringify(r));

  r = await run(async () => {
    const { beckons } = await import("/core/beckon.js");
    const P = (x, z) => __tq.P("decoys", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(2, 4));
    const f1 = __tq.focus(); __tq.act();
    const fire = { ev: __tq.ev("trap"), state: S.things.byId["decoy-fire"].state, glow: beckons(S.things.byId["decoy-fire"]) };
    __qt.place(P(5, 4)); const f2 = __tq.focus(); __tq.act();
    return { f1, f2, fire, lever: { ev: __tq.ev("trap"), state: S.things.byId["decoy-lever"].state }, hearts: __qt.hearts(), lit: S.things.things.filter((t) => t.kind === "bonfire" && t.state === "lit").length };
  });
  record("t09 a campfire decoy glows, answers F with a puff and costs nothing", r.f1 === "decoy-fire" && r.fire.glow && r.fire.ev.includes("trap:puff") && r.hearts === 3, JSON.stringify(r));
  record("t09 a lever decoy comes off in your hand", r.f2 === "decoy-lever" && r.lever.ev.includes("trap:snap") && r.lever.state === "pulled", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("scoot", x, z);
    __tq.fresh(); __qt.place(P(3, 2)); __qt.clear(); __qt.path([P(3, 3)]); __tq.wait();
    const first = __tq.ev(), at = __tq.t("scoot").at;
    __qt.place(P(3, 2)); __qt.clear(); __qt.path([P(3, 3)]); __qt.tick(20);
    const safe = { ev: __tq.ev(), at: __tq.at(P(3, 3)) };
    __qt.path([P(3, 4)]); __tq.wait();
    return { first, at, safe, second: __tq.ev() };
  });
  record("t10 a hidden hole drops you", r.first.includes("trap:drop") && r.first.includes("life:knock"), r.first.join(","));
  record("t10 the hole scoots once: the old cell holds and the next one drops", r.at === 1 && r.safe.at && !r.safe.ev.includes("trap:drop") && r.second.includes("trap:drop"), JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("painted", x, z), g = window.__game;
    __tq.fresh(); __qt.place(P(3, 1)); __qt.tick(5);
    const yaws = [];
    for (let i = 0; i < 4; i++) { yaws.push({ yaw: g.yaw, seam: __tq.t("painted").seam }); g.rotate(1); __qt.tick(40); }
    __qt.clear(); __qt.path([P(3, 2), P(3, 3)]); __tq.wait();
    return { yaws, ev: __tq.ev() };
  });
  record("t11 the seam shows from exactly one of the four camera angles", r.yaws.filter((y) => y.seam).length === 1 && r.yaws.find((y) => y.seam)?.yaw === 315, JSON.stringify(r.yaws));
  record("t11 walking on the painted hole tears through", r.ev.includes("trap:tear") && r.ev.includes("life:knock"), r.ev.join(","));

  r = await run(() => {
    const P = (x, z) => __tq.P("spur", x, z);
    __tq.fresh(); __qt.place(P(3, 4)); __qt.clear(); __qt.path([P(2, 4), P(1, 4), P(0, 4)]); __qt.tick(5);
    return { ev: __tq.ev("trap"), toast: document.querySelector(".iw-toast")?.textContent || "", hearts: __qt.hearts() };
  });
  record("t12 the fake spur ends at a smug sign and nothing else", r.ev.includes("trap:smug") && /made you look/i.test(r.toast) && r.hearts === 3, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("stride", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 2)); __qt.clear(); S.traps.skip([P(3, 3)], 1.2); __qt.path([P(3, 3), P(3, 4)]); __qt.tick(40); __qt.settle();
    const skip = { ev: __tq.ev("trap"), hearts: __qt.hearts(), back: __tq.at(P(3, 2)) };
    __tq.fresh(); __qt.place(P(3, 2)); __qt.clear(); __qt.path([P(3, 3), P(3, 4), P(3, 5)]);
    return { skip, walk: { ev: __tq.ev("trap"), hearts: __qt.hearts(), at: __tq.at(P(3, 5)) } };
  });
  record("t13 landing a skip on the plate takes a glove to the face", r.skip.ev.includes("trap:glove") && r.skip.hearts === 2 && r.skip.back, JSON.stringify(r.skip));
  record("t13 walking across never trips the glove", !r.walk.ev.includes("trap:glove") && r.walk.hearts === 3 && r.walk.at, JSON.stringify(r.walk));

  r = await run(() => {
    const P = (x, z) => __tq.P("decoy", x, z), S = window.__game.state;
    S.traps.reveal("decoy");
    const lit = { painted: __tq.t("decoy").painted, real: S.traps.at(P(3, 4)), fake: S.traps.at(P(3, 3))?.kind };
    __tq.fresh(); __qt.place(P(3, 2)); __qt.clear(); __qt.path([P(3, 3)]); __qt.tick(5);
    const honk = { ev: __tq.ev("trap"), hearts: __qt.hearts() };
    __qt.path([P(3, 4)]); __qt.tick(10);
    return { lit, honk, spike: { ev: __tq.ev("trap"), hearts: __qt.hearts() } };
  });
  record("t14 a reveal paints the decoy cell and skips the real one", r.lit.painted && r.lit.fake === "t14" && !r.lit.real, JSON.stringify(r.lit));
  record("t14 the painted cell only honks; the next cell spikes one heart", r.honk.ev.includes("trap:honk") && r.honk.hearts === 3 && r.spike.ev.includes("trap:spike") && r.spike.hearts === 2, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("faith", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 1)); __qt.tick(5);
    const before = __tq.walkable(P(3, 3));
    __qt.path([P(3, 2)]); __qt.tick(2);
    const rim = __tq.walkable(P(3, 3));
    __qt.path([P(3, 3), P(3, 4), P(3, 5), P(3, 6)]); __qt.tick(5);
    const across = __tq.at(P(3, 6)), behind = __tq.walkable(P(3, 3));
    __qt.walk(P(3, 7)); __tq.act();
    return { before, rim, across, behind, hearts: __qt.hearts(), chest: S.things.byId["faith-chest"].state };
  });
  record("t15 the gap has no floor until you step to its edge", !r.before && r.rim, JSON.stringify(r));
  record("t15 flagstones rise under each step and sink behind you", r.across && !r.behind && r.chest === "open" && r.hearts === 3, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("nothing", x, z);
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.walk(P(3, 7), 6); __qt.tick(5);
    return { ev: __tq.ev(null, "t16"), hearts: __qt.hearts(), toast: document.querySelector(".iw-toast")?.textContent || "" };
  });
  record("t16 nothing happens on the hall and the last cell thanks you", r.ev.filter((e) => e.startsWith("trap:")).join() === "trap:thanks" && r.hearts === 3 && /careful/i.test(r.toast), JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("twin", x, z);
    __tq.fresh(); __qt.place(P(3, 4)); __qt.tick(200);
    return { blocked: !__tq.walkable(P(4, 4)), ev: __tq.ev("trap"), hearts: __qt.hearts() };
  });
  record("t17 the stone twin stands solid and never turns", r.blocked && r.ev.includes("trap:stare") && r.hearts === 3, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("barrel", x, z);
    __tq.fresh(); __qt.place(P(3, 4)); __qt.until(() => __tq.ev("trap").includes("trap:squash"), 6); __qt.tick(40); __qt.settle();
    const hit = { ev: __tq.ev("trap"), hearts: __qt.hearts(), start: __tq.at(P(3, 2)) };
    __tq.fresh(); __qt.place(P(4, 4)); __qt.clear(); __qt.until(() => __tq.ev("trap").includes("trap:gone"), 7);
    return { hit, dodge: { ev: __tq.ev("trap"), hearts: __qt.hearts() } };
  });
  record("t19 a barrel costs a heart and rolls you back to the start", r.hit.ev.includes("trap:squash") && r.hit.hearts === 2 && r.hit.start, JSON.stringify(r.hit));
  record("t19 the dodge cell lets the barrel pass", r.dodge.ev.includes("trap:roll") && r.dodge.ev.includes("trap:gone") && !r.dodge.ev.includes("trap:squash") && r.dodge.hearts === 3, JSON.stringify(r.dodge));

  r = await run(() => {
    const P = (x, z) => __tq.P("rewind", x, z), a = window.__game.state.actor;
    __tq.fresh(); __qt.place(P(3, 1)); __qt.tick(5); __qt.clear(); __qt.path([P(3, 2), P(3, 3), P(3, 4), P(3, 5), P(3, 6)], 8); __qt.tick(20);
    return { ev: __tq.ev("trap"), cell: __qt.cell(), back: a.backward, hearts: __qt.hearts() };
  });
  record("t20 the rewind tile walks you three cells back", r.ev.includes("trap:rewind") && r.ev.includes("trap:play") && r.cell.join() === [show.plots.rewind[0] + 3, show.plots.rewind[1] + 2].join() && !r.back && r.hearts === 3, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("bridges", x, z);
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.path([P(3, 1), P(3, 2), P(3, 3)]); __qt.tick(10);
    const kind = { ev: __tq.ev(), at: __tq.at(P(3, 3)) };
    __qt.path([P(3, 4), P(3, 5), P(3, 6)]); __tq.wait();
    return { kind, still: __tq.ev() };
  });
  record("t27 the kind bridge wobbles and holds", r.kind.at && r.kind.ev.includes("trap:wobble") && !r.kind.ev.includes("life:knock"), JSON.stringify(r.kind));
  record("t27 the still bridge's third plank drops you", r.still.includes("trap:snap") && r.still.includes("life:knock"), r.still.join(","));

  r = await run(() => {
    const P = (x, z) => __tq.P("signs", x, z), t = __tq.t("signs");
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.path([P(3, 1), P(3, 2)]); __qt.tick(40); __qt.path([P(3, 1)]); __tq.wait();
    const behind = __tq.ev();
    __qt.place(P(3, 3)); __qt.tick(120); __qt.clear(); __qt.path([P(3, 4), P(3, 5)]); __tq.wait();
    const rush = __tq.ev();
    __qt.place(P(3, 3)); __qt.tick(120); __qt.clear(); __qt.path([P(3, 4)]); __qt.until(() => __tq.ev("trap").includes("trap:creak"), 2);
    __qt.path([P(3, 5)]); __qt.clear(); __qt.until(() => __tq.ev("trap").includes("trap:creak"), 2); __qt.path([P(3, 6)]); __qt.tick(20);
    return { behind, rush, wait: { ev: __tq.ev(), at: __tq.at(P(3, 6)) } };
  });
  record("t28 the first run drops each tile a beat after you leave it", r.behind.includes("trap:plunge") && r.behind.includes("life:knock"), r.behind.join(","));
  record("t28 the second run drops the tile ahead, so rushing falls", r.rush.includes("trap:drop-ahead") && r.rush.includes("trap:plunge"), r.rush.join(","));
  record("t28 waiting for the creak gets you across", r.wait.at && !r.wait.ev.includes("trap:plunge"), JSON.stringify(r.wait));

  r = await run(() => {
    const P = (x, z) => __tq.P("hall", x, z);
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.walk(P(3, 8), 6); __qt.tick(20);
    const first = { ev: __tq.ev("trap"), hearts: __qt.hearts(), solid: __tq.t("hall").solid };
    const end = __qt.walk(P(3, 8), 6);
    return { first, end: end && end.join() === P(3, 8).join() };
  });
  record("t29 the empty hall thanks you, then the next run bonks you", r.first.ev.includes("trap:thanks") && r.first.ev.includes("trap:bonk") && r.first.hearts === 2 && r.first.solid, JSON.stringify(r.first));
  record("t29 you step around the bonk on the shoulder", r.end, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("chests", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(1, 2)); __tq.act();
    const real = S.things.byId["real-chest"].state;
    __tq.fresh(); __qt.place(P(5, 5)); __tq.act(); __qt.until(() => __tq.ev("trap").includes("trap:bite"), 5);
    return { real, ev: __tq.ev("trap"), hearts: __qt.hearts() };
  });
  record("t30 the first chest pays and the later one is a mimic", r.real === "open" && r.ev.includes("trap:teeth") && r.ev.includes("trap:bite") && r.hearts === 2, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("coins", x, z);
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear();
    __qt.path([[3, 1], [3, 2], [3, 3], [3, 4], [4, 4], [5, 4], [5, 5], [6, 5], [6, 6]].map(([x, z]) => P(x, z)), 8); __tq.wait();
    return { ev: __tq.ev() };
  });
  record("t31 coins lead off the path in a staircase", r.ev.filter((e) => e === "trap:coin").length === 6, r.ev.join(","));
  record("t31 the last coin sits on a painted hole", r.ev.includes("trap:tear") && r.ev.includes("life:knock"), r.ev.join(","));

  r = await run(() => {
    const P = (x, z) => __tq.P("vanish", x, z);
    __tq.fresh(); __qt.place(P(3, 1)); __qt.clear(); __qt.path([P(4, 1), P(5, 1), P(6, 1), P(6, 2)]); __tq.wait();
    const drop = __tq.ev();
    __qt.place(P(3, 3)); __qt.clear(); __qt.path([P(3, 4), P(3, 5)]); __qt.tick(5);
    const gate = { ev: __tq.ev("trap"), shut: !__tq.walkable(P(3, 6)) };
    const end = __qt.walk(P(3, 7), 6);
    return { drop, gate, end: !!end && end.join() === P(3, 7).join() };
  });
  record("t01 four steps on the patch drop it into the clouds", r.drop.includes("trap:vanish") && r.drop.includes("life:knock"), r.drop.join(","));
  record("t01 a gate springs across the path and the detour gets around it", r.gate.ev.includes("trap:gate") && r.gate.shut && r.end, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("mirror", x, z), S = window.__game.state, a = S.actor;
    __tq.fresh(); __qt.place(P(3, 4)); __qt.tick(40);
    a.tapDir = "s"; __qt.tick(30);
    const flipped = __qt.cell()[1];
    S.traps.rest(); __qt.tick(2);
    a.tapDir = "s"; __qt.tick(30);
    return { flipped, start: P(3, 4)[1], calm: __qt.cell()[1], toast: __tq.ev("trap") };
  });
  record("t32 mirror controls reverse your steps inside the island", r.flipped === r.start - 1 && r.toast.includes("trap:banner"), JSON.stringify(r));
  record("t32 resting clears the mirror for a while", r.calm === r.flipped + 1, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("nap", x, z);
    __tq.fresh(); __qt.place(P(3, 4)); __qt.tick(40);
    const hud = document.querySelector(".iw-nap"), shown = hud && hud.style.display !== "none" && /nap in 2:5|nap in 3:00/.test(hud.textContent);
    __tq.t("nap").left = 0.3; __qt.tick(40); __tq.wait();
    return { shown, text: hud?.textContent, ev: __tq.ev(), hearts: __qt.hearts(), left: __tq.t("nap").left };
  });
  record("t34 a sun counts down three minutes on arrival", r.shown, r.text);
  record("t34 at zero you nap, lose every heart and wake at the bonfire", r.ev.includes("trap:nap") && r.ev.includes("life:flop") && r.ev.includes("life:respawn") && r.hearts === 3 && r.left > 170, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("slick", x, z);
    __tq.fresh(); __qt.place(P(3, 4)); __qt.tick(30); __qt.clear(); __qt.path([P(4, 4)]); __qt.tick(30); __qt.settle();
    const slide = { ev: __tq.ev("trap"), cell: __qt.cell().join() === P(5, 4).join() };
    __qt.place(P(3, 3)); __qt.tick(5); __qt.clear(); __qt.path([P(4, 3)]); __qt.tick(30);
    const bonk = { ev: __tq.ev("trap"), cell: __qt.cell().join() === P(4, 3).join() };
    __qt.place(P(3, 2)); __qt.tick(5); __qt.clear(); __qt.path([P(3, 3)]); __qt.tick(30);
    return { slide, bonk, path: { ev: __tq.ev("trap"), cell: __qt.cell().join() === P(3, 3).join() } };
  });
  record("t35 off-path cells slide you one extra cell", r.slide.cell && r.slide.ev.includes("trap:slip"), JSON.stringify(r.slide));
  record("t35 sliding into a rock bonks and the path keeps its grip", r.bonk.cell && r.bonk.ev.includes("trap:bonk") && r.path.cell && !r.path.ev.includes("trap:slip"), JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("gusts", x, z);
    __tq.fresh(); __qt.place(P(4, 4)); __qt.clear();
    let warned = false;
    for (let i = 0; i < 300 && !__tq.ev("trap").includes("trap:gust"); i++) { __qt.tick(); if (__tq.t("gusts").warn) warned = true; }
    __qt.settle();
    const gust = { ev: __tq.ev("trap"), cell: __qt.cell().join() === P(5, 4).join(), warned };
    __qt.place(P(3, 4)); __qt.clear(); __qt.until(() => __tq.ev("trap").includes("trap:crouch") || __tq.ev("trap").includes("trap:gust"), 4); __qt.settle();
    return { gust, path: { ev: __tq.ev("trap"), cell: __qt.cell().join() === P(3, 4).join() } };
  });
  record("t36 flags flap a beat before a gust shoves you downwind", r.gust.warned && r.gust.ev.includes("trap:gust") && r.gust.cell, JSON.stringify(r.gust));
  record("t36 the path sits out of the wind", r.path.cell && r.path.ev.includes("trap:crouch"), JSON.stringify(r.path));

  r = await run(() => {
    const P = (x, z) => __tq.P("sticky", x, z), a = window.__game.state.actor;
    __tq.fresh(); __qt.place(P(3, 4)); __qt.tick(10);
    a.held = "s"; __qt.tick(60);
    const held = __qt.cell().join() === P(3, 4).join();
    a.held = null; a.tapDir = "s"; __qt.tick(30);
    return { held, tap: __qt.cell().join() === P(3, 5).join(), sticky: a.sticky };
  });
  record("t37 sticky soles ignore a held key and take each tap", r.held && r.tap && r.sticky, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("stuck", x, z), g = window.__game;
    __tq.fresh(); __qt.place(P(3, 4)); __qt.tick(10);
    const inside = g.rotate(1); __qt.tick(30);
    __qt.place(P(3, -1)); __qt.tick(10);
    const out = g.rotate(1); __qt.tick(30); g.rotate(-1); __qt.tick(30);
    return { inside, out };
  });
  record("t38 the camera will not turn on a stuck island", r.inside === false && r.out === true, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("hiccups", x, z);
    __tq.fresh(); __qt.place(P(3, 1)); __qt.tick(5); __tq.t("hiccups").steps = 0; __qt.clear();
    const shown = [];
    for (const c of [[3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]]) { __qt.path([P(...c)]); shown.push(__tq.t("hiccups").left); }
    __qt.path([P(4, 7)]); __qt.tick(30); __qt.settle();
    return { shown, ev: __tq.ev("trap"), cell: __qt.cell().join() === P(5, 7).join() };
  });
  record("t39 a counter shows the next hiccup coming", r.shown.join() === "6,5,4,3,2,1", JSON.stringify(r.shown));
  record("t39 the seventh step hiccups you one cell further", r.ev.includes("trap:hic") && r.cell, JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("crates", x, z), S = window.__game.state, a = S.actor;
    __tq.fresh(); __qt.place(P(4, 2)); __qt.tick(5);
    a.tapDir = "s"; __qt.settle(); __qt.tick(5);
    const one = __tq.t("crates").pos[0].join() === P(4, 4).join();
    __qt.place(P(2, 4)); __qt.path([P(2, 5)]); __qt.tick(5);
    const bell = __tq.t("crates").pos[0].join() === P(4, 3).join();
    __qt.place(P(4, 2)); __qt.tick(5);
    a.tapDir = "s"; __qt.settle(); __qt.tick(5); a.tapDir = "s"; __qt.settle(); __qt.tick(90);
    const gate = S.things.byId["crate-gate"].state;
    __qt.walk(P(6, 3)); __tq.act();
    return { one, bell, solved: __tq.t("crates").solved, gate, chest: S.things.byId["crate-chest"].state, ev: __tq.ev("trap") };
  });
  record("t41 walking into a crate pushes it and the bell poofs it back", r.one && r.bell && r.ev.includes("trap:bell"), JSON.stringify(r));
  record("t41 a crate on the plate opens the reward gate", r.solved && r.gate === "open" && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("lights", x, z), S = window.__game.state, t = __tq.t("lights");
    __tq.fresh(); __qt.place(P(3, 1)); __qt.path([P(3, 2)]); __qt.tick(2);
    const moved = t.lit.join() !== t.start.join();
    __qt.place(P(1, 2)); __qt.tick(2);
    const bell = t.lit.join() === t.start.join();
    __qt.place(P(3, 1)); __qt.path([P(3, 2)]); __qt.path([P(3, 3)]); __qt.path([P(4, 3)]); __qt.tick(90);
    __qt.walk(P(5, 3)); __tq.act();
    return { moved, bell, solved: t.solved, gate: S.things.byId["lights-gate"].state, chest: S.things.byId["lights-chest"].state };
  });
  record("t42 each step flips a cross of tiles and the bell resets the floor", r.moved && r.bell, JSON.stringify(r));
  record("t42 lighting all nine opens the reward", r.solved && r.gate === "open" && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("onevisit", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(2, 1)); __qt.clear(); __qt.path([P(2, 2), P(3, 2), P(2, 2)]); __qt.tick(50); __qt.settle();
    const wrong = { ev: __tq.ev("trap"), at: __tq.at(P(2, 1)) };
    __qt.place(P(2, 1)); __qt.tick(3);
    const snake = [[2, 2], [3, 2], [4, 2], [4, 3], [3, 3], [2, 3], [2, 4], [3, 4], [4, 4], [4, 5], [3, 5], [2, 5]].map(([x, z]) => P(x, z));
    __qt.path(snake, 10); __qt.tick(90);
    __qt.walk(P(1, 5)); __tq.act();
    return { wrong, solved: __tq.t("onevisit").solved, gate: S.things.byId["visit-gate"].state, chest: S.things.byId["visit-chest"].state, hearts: __qt.hearts() };
  });
  record("t43 stepping on a crumbled tile bounces you back to the start", r.wrong.ev.includes("trap:cushion") && r.wrong.at && r.hearts === 3, JSON.stringify(r.wrong));
  record("t43 visiting every tile once and ending on the exit opens the reward", r.solved && r.gate === "open" && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("gaze", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 0)); __qt.tick(80);
    const outside = __tq.walkable(P(3, 3));
    __qt.path([P(3, 1), P(3, 2)]); __qt.until(() => __tq.t("gaze").solid, 3);
    __qt.path([P(3, 3), P(3, 4), P(3, 5), P(3, 6)]); __qt.tick(5);
    const across = __tq.at(P(3, 6));
    __qt.walk(P(3, 7)); __tq.act();
    return { outside, across, chest: S.things.byId["gaze-chest"].state, watch: S.things.byId["gaze-watcher"].state };
  });
  record("t44 gaze glass is empty air until the watcher watches you", !r.outside, JSON.stringify(r));
  record("t44 inside the watcher's gaze the glass holds all the way across", r.across && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("valves", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 2)); __qt.tick(5);
    const start = { a: __tq.walkable(P(3, 3)), b: __tq.walkable(P(3, 5)) };
    const f1 = __tq.focus(); __tq.act();
    const swapped = { a: __tq.walkable(P(3, 3)), b: __tq.walkable(P(3, 5)) };
    __qt.path([P(3, 3), P(3, 4)]); __qt.tick(5);
    const f2 = __tq.focus(); __tq.act();
    __qt.path([P(3, 5), P(3, 6)]); __tq.act();
    return { start, swapped, f1, f2, at: __tq.at(P(3, 6)), chest: S.things.byId["valve-chest"].state, real: S.things.things.filter((t) => t.kind === "lever" && !t.trap).every((t) => t.state === "up") };
  });
  record("t45 each lever swaps which gate is open", !r.start.a && r.start.b && r.swapped.a && !r.swapped.b && r.f1 === "valve-a" && r.f2 === "valve-b", JSON.stringify(r));
  record("t45 pull, walk and pull again gets you through both gates", r.at && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("angle", x, z), S = window.__game.state, g = window.__game;
    __tq.fresh(); __qt.place(P(3, 2)); __qt.tick(5);
    const yaw0 = g.yaw, broken = !__tq.walkable(P(3, 3));
    while (g.yaw !== 135) { g.rotate(1); __qt.tick(30); }
    const whole = __tq.walkable(P(3, 3));
    __qt.path([P(3, 3), P(3, 4)]); __qt.clear(); g.rotate(1); __qt.tick(80); __qt.settle();
    const drift = { ev: __tq.ev("trap"), at: __tq.at(P(3, 2)) };
    g.rotate(-1); __qt.tick(30);
    __qt.path([P(3, 3), P(3, 4), P(3, 5), P(3, 6), P(3, 7)]); __tq.act();
    const chest = S.things.byId["angle-chest"].state;
    while (g.yaw !== yaw0) { g.rotate(-1); __qt.tick(30); }
    return { yaw0, broken, whole, drift, chest };
  });
  record("t46 the broken bridge is whole from one camera angle", r.broken && r.whole, JSON.stringify(r));
  record("t46 turning away mid-span drops you onto a cushion back at the start", r.drift.ev.includes("trap:drift") && r.drift.ev.includes("trap:cushion") && r.drift.at && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("flash", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.path([P(3, 1)]); __qt.tick(5);
    const glow = __tq.t("flash").glow >= 0;
    __qt.path([P(3, 2), P(2, 2)]); __qt.tick(50); __qt.settle();
    const dunk = { ev: __tq.ev("trap"), at: __tq.at(P(3, 1)) };
    __qt.path([[3, 2], [3, 3], [4, 3], [4, 4], [4, 5]].map(([x, z]) => P(x, z))); __qt.tick(90);
    __qt.walk(P(4, 6)); __tq.act();
    return { glow, dunk, solved: __tq.t("flash").solved, chest: S.things.byId["flash-chest"].state, hearts: __qt.hearts() };
  });
  record("t47 the start cell flashes the safe line and a wrong cell dunks you back", r.glow && r.dunk.ev.includes("trap:dunk") && r.dunk.at && r.hearts === 3, JSON.stringify(r));
  record("t47 walking the line from memory opens the reward", r.solved && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("counting", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.path([P(3, 1), P(3, 2), P(3, 3), P(2, 3)]); __qt.tick(5);
    const off = { ev: __tq.ev("trap"), count: __tq.t("counting").count };
    __qt.place(P(3, 0)); __qt.tick(3); __qt.path([P(3, 1), P(3, 2), P(3, 3), P(3, 4), P(3, 5)]); __qt.tick(90);
    __qt.walk(P(3, 6)); __tq.act();
    return { off, solved: __tq.t("counting").solved, chest: S.things.byId["count-chest"].state };
  });
  record("t48 stepping off the path resets the tally with a raspberry", r.off.ev.includes("trap:raspberry") && r.off.count === 0, JSON.stringify(r.off));
  record("t48 the full tally opens the gate", r.solved && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("mirrortwin", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(1, 1)); __qt.clear(); __qt.path([P(1, 2), P(2, 2)]); __qt.tick(5);
    const mirrored = __tq.t("mirrortwin").ghost.join() === P(5, 3).join();
    __qt.path([P(2, 3), P(2, 4), P(2, 5)]); __qt.tick(90);
    __qt.walk(P(2, 6)); __tq.act();
    return { mirrored, ghost: __tq.t("mirrortwin").ghost, ev: __tq.ev("trap"), solved: __tq.t("mirrortwin").solved, chest: S.things.byId["twin-chest"].state };
  });
  record("t49 the ghost copies each step left for right and stops at walls", r.mirrored && r.ev.includes("trap:ghost-bump"), JSON.stringify(r));
  record("t49 you and the ghost on both plates open the reward", r.solved && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("pictos", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 0)); __qt.clear(); __qt.path([[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [2, 5], [2, 6]].map(([x, z]) => P(x, z)), 8); __qt.tick(50); __qt.settle();
    const wrong = { ev: __tq.ev("trap"), at: __tq.at(P(6, 5)), last: __tq.t("pictos").last };
    __qt.walk(P(3, 5)); __qt.clear(); __qt.path([P(3, 6), P(3, 7)]); __tq.act();
    return { wrong, right: { ev: __tq.ev("trap"), at: __tq.at(P(3, 7)) }, chest: S.things.byId["picto-chest"].state, hearts: __qt.hearts() };
  });
  record("t50 a gate that misses the last waymark tips you onto a ledge", r.wrong.ev.includes("trap:tip") && r.wrong.at && r.wrong.last === "square" && r.hearts === 3, JSON.stringify(r.wrong));
  record("t50 the gate matching the last waymark opens to the reward", r.right.ev.includes("trap:open") && r.right.at && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const P = (x, z) => __tq.P("fuse", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 1)); __qt.tick(5);
    const up = __tq.walkable(P(3, 3)), f = __tq.focus(); __tq.act();
    const down = __tq.walkable(P(3, 3));
    __qt.path([[3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]].map(([x, z]) => P(x, z))); __tq.act();
    const crossed = { at: __tq.at(P(3, 7)), chest: S.things.byId["fuse-chest"].state };
    __qt.tick(360);
    __qt.walk(P(3, 7)); __qt.place(P(3, 1)); __qt.tick(5); __tq.act(); __qt.clear();
    __qt.path([P(3, 2), P(3, 3), P(3, 4)]); __qt.until(() => __tq.ev("trap").includes("trap:rise"), 7); __qt.tick(50); __qt.settle();
    return { f, up, down, crossed, late: { ev: __tq.ev("trap"), at: __tq.at(P(3, 2)) }, hearts: __qt.hearts() };
  });
  record("t51 the lever lights a fuse and lowers the drawbridge", r.f === "fuse-lever" && !r.up && r.down, JSON.stringify(r));
  record("t51 crossing in ten beats reaches the reward", r.crossed.at && r.crossed.chest === "open", JSON.stringify(r.crossed));
  record("t51 when the bridge rises under you, you slide off to the near side", r.late.ev.includes("trap:slide-off") && r.late.at && r.hearts === 3, JSON.stringify(r.late));

  r = await run(() => {
    const P = (x, z) => __tq.P("belts", x, z), S = window.__game.state;
    __tq.fresh(); __qt.place(P(3, 1)); __qt.clear(); __qt.path([P(3, 2)]); __qt.tick(300);
    const loop = { ev: __tq.ev("trap").filter((e) => e === "trap:carry").length, solved: __tq.t("belts").solved };
    __qt.place(P(1, 2)); __qt.tick(3);
    const flipped = __tq.t("belts").flipped;
    __qt.place(P(3, 1)); __qt.clear(); __qt.path([P(3, 2)]); __qt.until(() => __tq.t("belts").solved, 8); __qt.tick(90);
    __qt.walk(P(4, 7)); __tq.act();
    return { loop, flipped, solved: __tq.t("belts").solved, chest: S.things.byId["belt-chest"].state };
  });
  record("t53 belts carry you a cell per beat in a loop until you find the switch", r.loop.ev >= 6 && !r.loop.solved && r.flipped, JSON.stringify(r));
  record("t53 with the switch flipped the belts deliver you to the reward", r.solved && r.chest === "open", JSON.stringify(r));

  r = await run(() => {
    const S = window.__game.state, g = window.__game;
    const P = (n, x, z) => __tq.P(n, x, z);
    __tq.fresh(); __qt.place(P("spring", 3, 3)); __qt.clear(); __qt.path([P("spring", 3, 4)]); __qt.tick(60); __qt.settle();
    const spring = { ev: __tq.ev("trap"), at: __tq.at(P("spring", 3, 2)) };
    __tq.fresh(); __qt.place(P("pancake", 3, 4)); __qt.until(() => __qt.hearts() < 3, 4);
    const pancake = __qt.hearts();
    __tq.fresh(); __qt.place(P("turntable", 3, 2)); const y0 = g.yaw; __qt.clear(); __qt.path([P("turntable", 3, 3)]); __qt.tick(40);
    const turn = { ev: __tq.ev("trap"), yaw: g.yaw !== y0 };
    g.rotate(-1); __qt.tick(40);
    return { spring, pancake, turn };
  });
  record("showcase t18 spring flings you two cells back", r.spring.ev.includes("trap:boing") && r.spring.at, JSON.stringify(r.spring));
  record("showcase t22 pancake stone slams for two hearts", r.pancake === 1, `${r.pancake}`);
  record("showcase t23 turntable turns the camera", r.turn.ev.includes("trap:turn") && r.turn.yaw, JSON.stringify(r.turn));

  r = await run(() => {
    const T = window.__game.state.traps, R = window.__game.renderer.traps;
    return { kinds: [...new Set(T.list.map((t) => t.kind))].length, meshes: R.group.children.length };
  });
  record(`showcase builds visuals for all ${TRAP_CATALOG.length} trap kinds`, r.kinds === TRAP_CATALOG.length && r.meshes > 300, JSON.stringify(r));
  await page.close();
}

{
  const { page } = await open(`level=${SHOW}&reset=1&touch=1`, { width: 390, height: 844 });
  const r = await q(page, () => {
    const box = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.left, b.top, b.right, b.bottom] : null; };
    return { hearts: box(".iw-hearts"), rose: box(".iw-rose"), home: box(".iw-home"), orb: box(".iw-orb"), ui: box(".iw-ui"), prompt: box(".iw-prompt") };
  });
  const hit = (a, b) => !!a && !!b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  record("mobile hearts sit on screen", !!r.hearts && r.hearts[0] >= 0 && r.hearts[2] <= 390 && r.hearts[1] >= 0, JSON.stringify(r.hearts));
  record("mobile hearts clear the compass rose, home and orb", !hit(r.hearts, r.rose) && !hit(r.hearts, r.home) && !hit(r.hearts, r.orb) && !hit(r.hearts, r.ui), JSON.stringify(r));
  await page.close();
}
{
  const { page } = await open(`level=${SHOW}&reset=1`, { width: 1200, height: 800 });
  const r = await q(page, () => {
    const box = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.left, b.top, b.right, b.bottom] : null; };
    return { hearts: box(".iw-hearts"), home: box(".iw-home"), orb: box(".iw-orb"), ui: box(".iw-ui") };
  });
  const hit = (a, b) => !!a && !!b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  record("desktop hearts clear the home button, orb and controls", !!r.hearts && !hit(r.hearts, r.home) && !hit(r.hearts, r.orb) && !hit(r.hearts, r.ui), JSON.stringify(r));
  const s = await screenOf(page, [15, 12]);
  record("showcase spawn projects on screen", !!s, JSON.stringify(s));
  await page.close();
}

for (const [i, name] of RUN.entries()) {
  const L = readLevel(name);
  if (!L.traps?.length) continue;
  const { page, problems, done } = await open(`level=${name}&reset=1&seq=0`);
  const r = await q(page, () => ({ n: window.__game.state.traps?.list.length || 0, built: window.__game.renderer.traps?.group.children.length || 0 }));
  record(`run island ${i + 1} loads its traps`, done && !problems.length && r.n === L.traps.length && r.built > 0, `${JSON.stringify(r)} ${problems.join(" | ")}`);
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
