import puppeteer from "puppeteer-core";
import { screenOf, watchdog } from "./qa-lib.mjs";
import path from "node:path";
import fs from "node:fs";
import { validateTraps, liftToLift, worstState, mustGuard, guardProblems } from "../core/traps/rules.js";
import { TRAP_CATALOG } from "../core/traps/catalog.js";
import { KINDS } from "../core/traps/kinds.js";
import { registerCatalog } from "../core/catalog.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
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

record("catalog holds all 53 approved traps", TRAP_CATALOG.length === 53, `${TRAP_CATALOG.length}`);
const POC = ["t02", "t03", "t21", "t24", "t25", "t26", "t33", "t40"];
record("every PoC trap has a runtime", POC.every((k) => KINDS[k]), POC.filter((k) => !KINDS[k]).join(","));
const show = readLevel(SHOW);
await register(show);
record("showcase holds one of each PoC trap", POC.every((k) => show.traps.some((t) => t.kind === k)));
const sv = validateTraps(show);
record("showcase traps pass the placement rules", !sv.length, sv.join("; "));
record("validator rejects an unguarded obvious trap", validateTraps({ ...show, traps: show.traps.map((t) => t.kind === "t03" ? { ...t, guards: undefined } : t) }).some((p) => /must guard a reward/.test(p)));
record("validator rejects a guard you can walk around", validateTraps({ ...show, traps: show.traps.map((t) => t.kind === "t03" ? { ...t, cells: [[9, 12]], guards: { chest: "arrows-chest" } } : t) }).some((p) => /walk around it|only approach|cannot be reached/.test(p)));
for (const t of show.traps.filter((t) => mustGuard(t.kind))) record(`showcase ${t.kind} guards a chest with no way around`, !guardProblems(show, t).length && !!t.guards?.chest);
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
      const cells = t.kind === "t33" ? [[24, 5]] : t.kind === "t24" ? t.cells : t.impl?.slick ? t.footprint.flatMap(([x, z]) => [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]).filter((c) => !S.level.slick.has(c.join(","))) : t.footprint;
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

  await q(page, () => { __qt.refill(); __qt.place([21, 12]); __qt.clear(); __qt.walk([27, 12]); __qt.tick(30); });
  r = await q(page, () => ({ hearts: __qt.hearts(), ev: __qt.events().filter((e) => e.src === "trap").map((e) => e.type) }));
  record("t25 arrow plate fires a volley", r.ev.includes("click") && r.ev.includes("volley"), r.ev.join(","));
  record("t25 arrows cost one heart on the run", r.hearts === 2, `${r.hearts}`);
  await q(page, () => { __qt.refill(); __qt.place([20, 12]); __qt.tick(80); __qt.clear(); __qt.path([[21, 12], [22, 12]]); __qt.tick(60); __qt.walk([27, 12]); __qt.tick(20); });
  r = await q(page, () => ({ hearts: __qt.hearts(), cell: __qt.cell(), ev: __qt.events().filter((e) => e.src === "trap").map((e) => e.type) }));
  record("t25 waiting on the plate lets the volley pass", r.ev.includes("volley") && r.hearts === 3 && r.cell[0] === 27, JSON.stringify(r));
  r = await q(page, () => { const T = window.__game.state.things; T.act(); __qt.tick(10); return T.byId["arrows-chest"].state; });
  record("t25 guards a chest at the end of the run", r === "open", r);

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
    return { on: true, hero: ctx.getImageData(px, py, 1, 1).data[3], corner: ctx.getImageData(4, 4, 1, 1).data[3], toast: document.querySelector(".iw-toast")?.textContent || "" };
  });
  record("t33 fog covers the island", r.on && r.corner > 200, JSON.stringify(r));
  record("t33 fog clears three cells around the hero", r.on && r.hero < 40, `${r.hero}`);
  record("t33 fog names itself on arrival", /fog/i.test(r.toast || ""), r.toast);
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
