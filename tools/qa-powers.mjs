import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { screenOf, watchdog } from "./qa-lib.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const OUT = path.join(root, "out", "qa-powers");
fs.mkdirSync(OUT, { recursive: true });
const TRAPS = "traps-showcase";
const hasTraps = fs.existsSync(path.join(root, "levels", `${TRAPS}.json`));
const SHORTCUT_LEVELS = ["wizard-medium-r1", "wizard-medium-r2", "wizard-medium-r3"];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const alive = watchdog();
const record = (name, ok, detail = "") => { alive(name); results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-powers"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(query, { width = 1200, height = 800, touch = false } = {}) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  page.on("requestfailed", (r) => problems.push("failed " + r.url()));
  await page.setViewport({ width, height, deviceScaleFactor: 1, ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  await page.goto(`${BASE}/3d/index.html?${query}&reset=1&clouds=none&seq=0${query.includes("traps-showcase") ? "" : "&traps=0"}`, { waitUntil: "load" });
  const done = await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 30000, polling: 100 }).then(() => true, () => false);
  if (done) await page.evaluate(() => { localStorage.removeItem("isoworld:hearts"); for (const k of Object.keys(localStorage)) if (/^isoworld:(traps|pickups):|^isoworld:power$/.test(k)) localStorage.removeItem(k); window.__game.powers.reset(); window.__game.state.health.refill?.("qa"); });
  return { page, problems, done };
}

const P = (page) => page.evaluate(() => { const g = window.__game, W = g.powers; return { cls: W.cls, id: W.power.id, ready: W.ready, charges: W.charges, oil: +W.oil.toFixed(2), lit: W.lit, pickups: W.pickups.length, raised: W.raised, cell: g.state.actor.cell.slice(), hearts: g.state.health.hearts, warded: g.state.health.warded, route: g.state.route.active }; });
const advance = (page, s) => page.evaluate((s) => window.__game.advance(s), s);

const place = (page, cell, dir) => page.evaluate(([c, dir]) => {
  const D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }, a = window.__game.state.actor;
  a.path = []; a.held = null; a.tapDir = null; a.moving = false;
  a.cell = c.slice(); a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5;
  if (dir) a.facing = Math.atan2(D[dir][0], D[dir][1]);
  window.__game.advance(0.05);
}, [cell, dir]);

const fireKey = async (page) => { await page.keyboard.press("KeyR"); await wait(30); await advance(page, 0.7); };

const walkSteps = (page, n) => page.evaluate((n) => {
  const g = window.__game, S = g.state, a = S.actor;
  const avoid = (x, z) => !!S.traps?.at([x, z]);
  let prev = null, taken = 0;
  for (let i = 0; i < n * 4 && taken < n; i++) {
    const opts = ["n", "e", "s", "w"].filter((d) => {
      const D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[d], x = a.cell[0] + D[0], z = a.cell[1] + D[1];
      return !avoid(x, z) && a.stepDir(d) && (a.path = []) && true;
    });
    if (!opts.length) break;
    const back = prev && opts.find((d) => { const D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[d]; return a.cell[0] + D[0] === prev[0] && a.cell[1] + D[1] === prev[1]; });
    const pick = opts.find((d) => d !== back) || opts[0];
    prev = a.cell.slice();
    a.stepDir(pick);
    g.advance(0.4);
    taken++;
  }
  return taken;
}, n);

const findJump = (page, { gap = null, notTrap = true } = {}) => page.evaluate(async ([gap, notTrap]) => {
  const { inkStep } = await import("/core/powers.js");
  const { isWalkable } = await import("/core/level.js");
  const S = window.__game.state, L = S.level, out = [];
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
    if (!isWalkable(L, x, z)) continue;
    for (const d of ["n", "e", "s", "w"]) {
      const r = inkStep(L, [x, z], d);
      if (!r.to) continue;
      const midWalk = isWalkable(L, r.mid[0], r.mid[1]);
      if (gap === true && midWalk) continue;
      if (gap === false && !midWalk) continue;
      if (notTrap && (S.traps?.at(r.to) || S.traps?.at([x, z]))) continue;
      out.push({ from: [x, z], dir: d, mid: r.mid, to: r.to, gap: !midWalk });
    }
  }
  const sp = S.actor.cell;
  out.sort((a, b) => Math.abs(a.from[0] - sp[0]) + Math.abs(a.from[1] - sp[1]) - (Math.abs(b.from[0] - sp[0]) + Math.abs(b.from[1] - sp[1])));
  return out[0] || null;
}, [gap, notTrap]);

async function hudSuite(cls, want) {
  const tag = `hud ${cls}`;
  const o = await open(`level=wizard-medium&class=${cls}`);
  record(`${tag} page loads`, o.done);
  if (!o.done) return o.page.close();
  await wait(400);
  const chip = await o.page.evaluate(() => { const c = document.querySelector(".iw-power"); if (!c) return null; const r = c.getBoundingClientRect(), u = document.querySelector(".iw-ui")?.getBoundingClientRect(); return { text: c.textContent, power: c.dataset.power, shown: getComputedStyle(c).display !== "none", left: r.left, bottom: innerHeight - r.bottom, clearUi: !u || r.right < u.left }; });
  record(`${tag} desktop chip shows ${want}`, !!chip && chip.shown && chip.text.includes(want) && chip.left < 40 && chip.bottom < 40 && chip.clearUi, JSON.stringify(chip));
  await o.page.close();
  const t = await open(`level=wizard-medium&class=${cls}&dpad=1`, { width: 390, height: 844, touch: true });
  await wait(400);
  const ui = await t.page.evaluate(() => {
    const rect = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const pow = rect(".iw-pow"), act = rect(".iw-act"), hit = rect(".iw-rose .hit-r"), band = rect(".iw-band"), chip = document.querySelector(".iw-power");
    const apart = (a, b) => a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
    return { pow, power: document.querySelector(".iw-pow")?.dataset.power, chipHidden: !chip || getComputedStyle(chip).display === "none", clearAct: !!pow && apart(pow, act), clearRose: !!pow && apart(pow, hit) && hit.r + 20 <= Math.min(pow.l, act.l), inBand: !!pow && pow.t >= band.t && pow.b <= band.b && pow.r <= innerWidth - 8 };
  });
  record(`${tag} touch power button sits beside use, clear of the rose`, !!ui.pow && ui.clearAct && ui.clearRose && ui.inBand && ui.chipHidden, JSON.stringify(ui));
  await t.page.screenshot({ path: path.join(OUT, `hud-${cls}-touch.png`) });
  await t.page.close();
}

async function inkSuite() {
  const tag = "ink-step";
  const o = await open("level=wizard-medium&class=wanderer");
  record(`${tag} page loads`, o.done);
  if (!o.done) return o.page.close();
  const page = o.page;
  for (const gap of [true, false]) {
    const j = await findJump(page, { gap });
    record(`${tag} ${gap ? "gap" : "floor"} jump exists on wizard-medium`, !!j, JSON.stringify(j));
    if (!j) continue;
    await place(page, j.from, j.dir);
    await page.evaluate(() => window.__game.powers.reset());
    const before = await P(page);
    await fireKey(page);
    const after = await P(page);
    record(`${tag} R dashes two cells ${gap ? "over a gap" : "over floor"}`, before.ready && after.cell.join() === j.to.join() && after.charges === before.charges - 1, `${j.from} ${j.dir} -> ${after.cell} want ${j.to}`);
  }
  const dj = await findJump(page, { gap: true });
  if (dj) {
    await place(page, dj.from, dj.dir);
    await page.evaluate(() => window.__game.powers.reset());
    const trace = await page.evaluate(async () => {
      const { DASH_S } = await import("/core/powers.js");
      const g = window.__game, a = g.state.actor, y0 = a.y;
      const opac = () => { const out = []; g.renderer.hero.traverse((o) => { if (o.isMesh && !o.userData.highlightPass) out.push(...[].concat(o.material).map((m) => m.opacity)); }); return out.join(); };
      const before = opac();
      g.pause();
      g.powers.fire();
      const ys = [], cells = [];
      let ghost = 0, t = 0;
      for (; t < 1 && (t === 0 || g.powers.hop); t += 1 / 60) {
        g.advance(1 / 60);
        ys.push(a.y);
        cells.push([Math.floor(a.pos.x), Math.floor(a.pos.z)].join());
        let faded = false;
        g.renderer.hero.traverse((o) => { if (o.isMesh && !o.userData.highlightPass && [].concat(o.material).some((m) => m.opacity < 0.5)) faded = true; });
        if (faded) ghost++;
      }
      g.advance(0.3);
      const restored = opac() === before;
      g.resume();
      return { y0, y1: a.y, max: Math.max(...ys), min: Math.min(...ys), secs: +t.toFixed(3), want: DASH_S, cells: [...new Set(cells)], ghost, restored };
    });
    const flat = trace.max <= Math.max(trace.y0, trace.y1) + 1e-6 && trace.min >= Math.min(trace.y0, trace.y1) - 1e-6;
    record(`${tag} dash runs flat with no arc and lands in ${"<"}0.3 s`, flat && trace.secs <= 0.3 && trace.cells.includes(dj.mid.join()), JSON.stringify(trace));
    record(`${tag} dash ghosts the hero and restores it on landing`, trace.ghost > 0 && trace.restored, `ghost frames ${trace.ghost} restored ${trace.restored}`);
  }
  const fj = await findJump(page, {});
  await place(page, fj.from, fj.dir);
  await page.evaluate(() => { const W = window.__game.powers; W.reset(); W.fire(); });
  await advance(page, 0.6);
  await place(page, fj.from, fj.dir);
  await page.evaluate(() => window.__game.powers.fire());
  await advance(page, 0.6);
  await place(page, fj.from, fj.dir);
  const s0 = await P(page);
  await fireKey(page);
  const s1 = await P(page);
  const toast = await page.evaluate(() => document.querySelector(".iw-toast")?.textContent || "");
  record(`${tag} two charges spend, the third press is refused with a toast`, s0.charges === 0 && s1.cell.join() === s0.cell.join() && /No charges/.test(toast), `${JSON.stringify(s1)} toast "${toast}"`);
  const hud = await page.evaluate(() => ({ chip: document.querySelector(".iw-power")?.textContent, pips: document.querySelectorAll(".iw-power .pips i").length, on: document.querySelectorAll(".iw-power .pips i.on").length }));
  record(`${tag} HUD shows charges held`, /no charges/.test(hud.chip || "") && hud.pips === 3 && hud.on === 0, JSON.stringify(hud));
  const cap = await page.evaluate(() => { const W = window.__game.powers; for (let i = 0; i < 6; i++) W.give("qa"); return W.charges; });
  record(`${tag} carry cap holds at 3`, cap === 3, String(cap));
  const blocked = await page.evaluate(async () => {
    const { inkStep } = await import("/core/powers.js");
    const { isWalkable, cellAt } = await import("/core/level.js");
    const L = window.__game.state.level;
    for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
      if (!isWalkable(L, x, z) || cellAt(L, x, z).s === "ramp") continue;
      for (const d of ["n", "e", "s", "w"]) { const r = inkStep(L, [x, z], d); if (!r.to && /high|wall/i.test(r.why)) return { from: [x, z], dir: d, why: r.why }; }
    }
    return null;
  });
  if (blocked) {
    await place(page, blocked.from, blocked.dir);
    await page.evaluate(() => window.__game.powers.reset());
    await fireKey(page);
    const s3 = await P(page);
    const toast = await page.evaluate(() => document.querySelector(".iw-toast")?.textContent || "");
    record(`${tag} refuses a climb and keeps its charge`, s3.cell.join() === blocked.from.join() && s3.charges === 2 && toast.length > 0, `${blocked.why} toast "${toast}"`);
  } else record(`${tag} refuses a climb and keeps its charge`, false, "no blocked jump found");
  record(`${tag} no page errors`, o.problems.length === 0, o.problems.slice(0, 3).join(" | "));
  await page.close();
}

async function shortcutSuite() {
  for (const name of SHORTCUT_LEVELS) {
    const o = await open(`level=${name}&class=wanderer`);
    if (!o.done) { record(`shortcuts ${name} page loads`, false); await o.page.close(); continue; }
    const page = o.page;
    const sweep = await page.evaluate(async () => {
      const { inkStep } = await import("/core/powers.js");
      const { isWalkable, cellAt, edgeClosed } = await import("/core/level.js");
      const { reachable } = await import("/core/path.js");
      const L = window.__game.state.level, bad = [];
      let jumps = 0;
      const reach = new Map();
      const R = (c) => { const k = c.join(); if (!reach.has(k)) reach.set(k, new Set(reachable(L, c).map((q) => q.join()))); return reach.get(k); };
      for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
        if (!isWalkable(L, x, z)) continue;
        for (const d of ["n", "e", "s", "w"]) {
          const r = inkStep(L, [x, z], d);
          if (!r.to) continue;
          jumps++;
          const a = cellAt(L, x, z), t = cellAt(L, r.to[0], r.to[1]);
          const crosses = isWalkable(L, r.mid[0], r.mid[1]) && (edgeClosed(L, [x, z], r.mid) || edgeClosed(L, r.mid, r.to));
          if (t.h > a.h || crosses || !R([x, z]).has(r.to.join())) bad.push({ from: [x, z], d, to: r.to });
        }
      }
      const things = window.__game.state.things.things.filter((t) => (t.kind === "door" && t.state === "closed") || (t.kind === "gate" && /^lever:/.test(String(t.open)) && t.state !== "open") || (t.kind === "ladder" && t.state !== "down"));
      return { jumps, bad: bad.slice(0, 4), nbad: bad.length, kinds: things.map((t) => t.kind + (t.mode ? ":" + t.mode : "")) };
    });
    record(`shortcuts ${name} every Ink Step lands on walk-reachable ground, never higher, never through a closed link`, sweep.jumps > 0 && sweep.nbad === 0, `${sweep.jumps} jumps, ${sweep.nbad} bad ${JSON.stringify(sweep.bad)}; links ${sweep.kinds.join(",")}`);
    const tries = await page.evaluate(() => {
      const S = window.__game.state, out = [];
      const D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
      const dirOf = (a, b) => Object.keys(D).find((k) => a[0] + D[k][0] === b[0] && a[1] + D[k][1] === b[1]);
      for (const t of S.things.things) {
        let near = null, far = null;
        if (t.kind === "door" && t.state === "closed" && t.edge) { near = t.edge[0]; far = t.edge[1]; }
        else if (t.kind === "gate" && /^lever:/.test(String(t.open)) && t.state !== "open" && t.edge) { near = t.edge[0]; far = t.edge[1]; }
        else if (t.kind === "ladder" && t.state !== "down") { const d = D[t.d]; if (d) { near = [t.x + d[0], t.z + d[1]]; far = [t.x, t.z]; } }
        if (!near) continue;
        const d = dirOf(near, far);
        if (!d) continue;
        const back = [near[0] - D[d][0], near[1] - D[d][1]];
        out.push({ kind: t.kind + (t.mode ? ":" + t.mode : ""), from: near, dir: d });
        out.push({ kind: t.kind + (t.mode ? ":" + t.mode : ""), from: back, dir: d });
      }
      return out;
    });
    for (const tr of tries) {
      const ok = await page.evaluate(async (c) => { const { isWalkable } = await import("/core/level.js"); return isWalkable(window.__game.state.level, c[0], c[1]); }, tr.from);
      if (!ok) continue;
      await place(page, tr.from, tr.dir);
      await page.evaluate(() => window.__game.powers.reset());
      const before = await P(page);
      await fireKey(page);
      const after = await P(page);
      const allowed = tr.kind === "ladder:drop" ? null : after.cell.join() === before.cell.join();
      if (allowed !== null) record(`shortcuts ${name} Ink Step from the near side of a ${tr.kind} stays put`, allowed && after.ready, `${tr.from} ${tr.dir} -> ${after.cell}`);
    }
    await page.close();
  }
}

async function wardSuite() {
  const tag = "ward";
  const o = await open("level=wizard-medium&class=aws");
  record(`${tag} page loads`, o.done);
  if (!o.done) return o.page.close();
  const page = o.page;
  await fireKey(page);
  const a = await P(page);
  const hud = await page.evaluate(() => document.querySelector(".iw-power")?.textContent || "");
  record(`${tag} R raises the ward`, a.warded && a.raised && /raised/.test(hud), hud);
  await fireKey(page);
  const a2 = await P(page);
  record(`${tag} second R keeps one ward`, a2.warded, JSON.stringify(a2));
  const hearts0 = a.hearts;
  await page.evaluate(() => window.__game.state.life.hurt(1, { cause: "qa" }));
  await advance(page, 0.2);
  const b = await P(page);
  record(`${tag} absorbs a hit, ward cracks, one charge spent`, b.hearts === hearts0 && !b.warded && b.charges === 1, JSON.stringify(b));
  await advance(page, 1.5);
  await page.evaluate(() => { const W = window.__game.powers; while (W.charges) { W.fire(); window.__game.state.health.ward(false); } });
  const c0 = await P(page);
  const fire = await page.evaluate(() => window.__game.powers.fire());
  const toast = await page.evaluate(() => document.querySelector(".iw-toast")?.textContent || "");
  record(`${tag} with no charges R is refused with a toast`, c0.charges === 0 && !fire && /No charges/.test(toast) && !(await P(page)).warded, toast);
  const fireAt = await page.evaluate(() => { const S = window.__game.state, b = S.things.things.find((t) => t.kind === "bonfire"); return [b.x, b.z]; });
  const lit = await page.evaluate(async (b) => {
    const { isWalkable } = await import("/core/level.js");
    const S = window.__game.state, a = S.actor;
    const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [b[0] + dx, b[1] + dz]).find(([x, z]) => isWalkable(S.level, x, z));
    a.path = []; a.cell = c.slice(); a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5;
    window.__game.advance(0.1);
    S.things.act();
    window.__game.advance(0.1);
    return window.__game.powers.charges;
  }, fireAt);
  record(`${tag} resting at the bonfire refills to the stock of 2`, lit === 2, String(lit));
  record(`${tag} no page errors`, o.problems.length === 0, o.problems.slice(0, 3).join(" | "));
  await page.close();
}

async function tapSuite() {
  for (const [cls, mode] of [["wanderer", "all"], ["aws", "all"], ["wanderer", "courier"], ["aws", "courier"], ["nm", "courier"], ["dutchie", "courier"]]) {
    const o = await open(`level=wizard-medium&class=${cls}${mode === "courier" ? "&tapwalk=courier" : ""}`);
    if (!o.done) { record(`tap ${cls} page loads`, false); await o.page.close(); continue; }
    const page = o.page;
    await wait(300);
    const target = await page.evaluate(async () => {
      const { findPath } = await import("/core/path.js");
      const { isWalkable } = await import("/core/level.js");
      const S = window.__game.state, L = S.level, a = S.actor.cell;
      for (let r = 4; r < 9; r++) for (let dz = -r; dz <= r; dz++) for (const dx of [r - Math.abs(dz), -(r - Math.abs(dz))]) {
        const x = a[0] + dx, z = a[1] + dz;
        if (!isWalkable(L, x, z) || S.things.things.some((t) => t.x === x && t.z === z)) continue;
        const p = findPath(L, a, [x, z]);
        if (p && p.length >= 5) return [x, z];
      }
      return null;
    });
    const pt = target && await screenOf(page, target, { topmost: true });
    if (!pt) { record(`tap ${cls} target on screen`, false, String(target)); await page.close(); continue; }
    const before = await P(page);
    await page.mouse.click(pt[0], pt[1]);
    await wait(200);
    const mid = await P(page);
    await page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, { timeout: 8000, polling: 100 }).catch(() => {});
    const after = await P(page);
    if (cls === "dutchie" || mode === "all") record(`tap ${cls} walks to the tapped cell with tapwalk=${mode}`, mid.route && after.cell.join() === target.join(), `target ${target} got ${after.cell}`);
    else record(`tap ${cls} ignores a tap on the floor with tapwalk=courier`, !mid.route && after.cell.join() === before.cell.join(), `target ${target} got ${after.cell}`);
    await page.close();
  }
  for (const name of SHORTCUT_LEVELS) {
    const o = await open(`level=${name}&class=dutchie`);
    if (!o.done) { await o.page.close(); continue; }
    const r = await o.page.evaluate(async () => {
      const { routeTo } = await import("/core/path.js");
      const { canStep } = await import("/core/level.js");
      const S = window.__game.state, L = S.level;
      const D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
      const dirOf = (a, b) => Object.keys(D).find((k) => a[0] + D[k][0] === b[0] && a[1] + D[k][1] === b[1]);
      let tested = 0, bad = 0, longer = 0;
      for (const t of S.things.things) {
        let near = null, far = null;
        if (t.kind === "door" && t.state === "closed" && t.edge) { near = t.edge[0]; far = t.edge[1]; }
        else if (t.kind === "gate" && /^lever:/.test(String(t.open)) && t.state !== "open" && t.edge) { near = t.edge[0]; far = t.edge[1]; }
        else if (t.kind === "ladder" && t.state === "up" && D[t.d]) { near = [t.x + D[t.d][0], t.z + D[t.d][1]]; far = [t.x, t.z]; }
        if (!near) continue;
        tested++;
        const route = routeTo(L, near, far, { cost: S.powers.avoid });
        const cells = route?.cells || [];
        const legal = cells.every((c, i) => i === 0 || (dirOf(cells[i - 1], c) && canStep(L, cells[i - 1][0], cells[i - 1][1], dirOf(cells[i - 1], c))));
        const jumps = cells.some((c, i) => i > 0 && cells[i - 1].join() === near.join() && c.join() === far.join());
        if (!legal || jumps) bad++;
        if (cells.length > 2) longer++;
      }
      return { tested, bad, longer };
    });
    record(`waypoint ${name} never routes through a closed shortcut`, r.tested > 0 && r.bad === 0, JSON.stringify(r));
    await o.page.close();
  }
}

async function avoidSuite() {
  const o = await open("level=wizard-medium&class=dutchie");
  if (!o.done) { record("waypoint avoid page loads", false); return o.page.close(); }
  const r = await o.page.evaluate(async () => {
    const { findPath } = await import("/core/path.js");
    const S = window.__game.state, L = S.level, a = S.actor.cell;
    const plain = findPath(L, a, [a[0], a[1] + 6]) || findPath(L, a, [a[0] - 6, a[1]]) || findPath(L, a, [a[0] + 6, a[1]]);
    if (!plain || plain.length < 4) return null;
    const goal = plain[plain.length - 1], trap = plain[Math.floor(plain.length / 2)];
    const cost = (x, z) => (x === trap[0] && z === trap[1] ? 40 : 0);
    const around = findPath(L, a, goal, { cost });
    return { trap, plain: plain.length, around: around?.length, avoids: !!around && !around.some((c) => c[0] === trap[0] && c[1] === trap[1]) };
  });
  record("waypoint router steps around a revealed trap cell", !!r && r.avoids, JSON.stringify(r));
  await o.page.close();
}

async function trapSuite() {
  if (!hasTraps) { record(`traps ${TRAPS} level exists`, false, "levels/traps-showcase.json missing"); return; }
  for (const cls of ["aws", "nm", "dutchie", "wanderer"]) {
    const o = await open(`level=${TRAPS}&class=${cls}`);
    record(`traps ${cls} page loads`, o.done && !!(await o.page.evaluate(() => !!window.__game?.state.traps)));
    if (!o.done) { await o.page.close(); continue; }
    const page = o.page;
    const spot = await page.evaluate(async (cls) => {
      const { isWalkable, canStep, DIRS } = await import("/core/level.js");
      const { inkStep } = await import("/core/powers.js");
      const S = window.__game.state, L = S.level;
      const step = ["t03", "t02", "t21", "t24", "t25", "t26", "t33", "t40"];
      for (const t of S.traps.all().sort((a, b) => step.indexOf(a.kind) - step.indexOf(b.kind))) {
        if (t.trigger !== "step" && t.trigger !== "timer") continue;
        for (const c of t.cells) for (const d of Object.keys(DIRS)) {
          const from = [c[0] - DIRS[d][0], c[1] - DIRS[d][1]];
          if (!isWalkable(L, from[0], from[1]) || S.traps.at(from) || !canStep(L, from[0], from[1], d)) continue;
          if (cls === "wanderer") { const r = inkStep(L, from, d); if (!r.to || S.traps.at(r.to)) continue; return { trap: t.id, kind: t.kind, cell: c, from, dir: d, to: r.to }; }
          return { trap: t.id, kind: t.kind, cell: c, from, dir: d };
        }
      }
      return null;
    }, cls);
    record(`traps ${cls} a trap cell with an approach`, !!spot, JSON.stringify(spot));
    if (!spot) { await page.close(); continue; }
    await place(page, spot.from, spot.dir);
    await page.evaluate(() => window.__game.powers.reset());
    if (cls === "aws") {
      const fog = await page.evaluate(() => window.__game.state.traps.all().find((t) => t.kind === "t33")?.id || null);
      if (fog) {
        await place(page, [24, 8], "n");
        await fireKey(page);
        await page.evaluate(() => { const a = window.__game.state.actor; a.path = [[24, 7], [25, 7]]; });
        await advance(page, 1.5);
        await page.evaluate(() => { window.__game.state.life.hurt(0, { cause: "qa-zero" }); window.__game.state.health.hit(0, "qa-zero"); });
        await advance(page, 0.2);
        const f = await P(page);
        const fogOn = await page.evaluate(() => window.__game.state.traps.list.find((t) => t.kind === "t33")?.on);
        record(`traps ward survives the fog debuff and zero-damage hits`, f.warded && f.raised && fogOn === true && f.hearts === 3, JSON.stringify({ ...f, fogOn }));
        await page.evaluate(() => { const a = window.__game.state.actor; a.path = [[24, 8], [23, 8], [22, 8]]; });
        await advance(page, 1.5);
        await page.evaluate(() => { const a = window.__game.state.actor; a.path = [[22, 9]]; });
        await advance(page, 1.2);
        const b = await P(page);
        record(`traps ward cracks on the invisible block and saves the heart`, !b.warded && b.hearts === 3, JSON.stringify(b));
        await advance(page, 1.5);
        await page.evaluate(() => window.__game.powers.reset());
      }
      await fireKey(page);
      const h0 = (await P(page)).hearts;
      let hit = null;
      for (let i = 0; i < 12 && !hit; i++) {
        await page.evaluate((c) => { const a = window.__game.state.actor; if (!a.locked && !a.path.length) { a.path = [c.slice()]; } }, spot.cell);
        await advance(page, 0.5);
        const s = await P(page);
        if (!s.warded) hit = s;
        else await place(page, spot.from, spot.dir);
      }
      record(`traps ward absorbs ${spot.kind}`, !!hit && hit.hearts === h0 && hit.charges === 1, JSON.stringify(hit));
    } else if (cls === "nm") {
      const block = await page.evaluate(() => window.__game.state.traps.all().find((t) => t.kind === "t21") || null);
      const far = await page.evaluate(() => window.__game.state.traps.all().filter((t) => !t.revealed && t.kind !== "t21").map((t) => t.id));
      if (block) {
        await place(page, [block.cells[0][0] - 3, block.cells[0][1]], "e");
        const o0 = await P(page);
        await fireKey(page);
        const o1 = await P(page);
        const early = await page.evaluate((id) => window.__game.state.traps.at(id).revealed, block.id);
        await place(page, [block.cells[0][0] - 2, block.cells[0][1]], "e");
        await advance(page, 5);
        const o2 = await P(page);
        const seen = await page.evaluate((id) => window.__game.state.traps.at(id).revealed, block.id) && !early;
        const still = await page.evaluate((ids) => ids.filter((id) => !window.__game.state.traps.at(id).revealed).length, far);
        record(`traps lantern lights on R and drains oil by the clock`, o0.oil === 20 && o1.lit && o2.lit && o0.oil - o2.oil > 5 && o0.oil - o2.oil < 7.5 && o2.oil < o1.oil, `${o0.oil} -> ${o1.oil} -> ${o2.oil}`);
        record(`traps lantern reveals the hidden ${block.kind} at two cells, not at three`, !block.revealed && seen && still === far.length, `revealed at 2 ${seen}, far hidden ${still}/${far.length}`);
        const hud = await page.evaluate(() => document.querySelector(".iw-power")?.textContent || "");
        record(`traps lantern HUD shows the oil left`, /lit, 1[45] s oil/.test(hud), hud);
        await fireKey(page);
        const d0 = await P(page);
        await advance(page, 3);
        const d1 = await P(page);
        record(`traps R douses the lantern and the oil holds`, !d0.lit && d0.oil === d1.oil, `${d0.oil} -> ${d1.oil}`);
        await fireKey(page);
        await advance(page, 16);
        const e = await P(page);
        const ft = await page.evaluate(() => window.__game.powers.fire());
        const toast = await page.evaluate(() => document.querySelector(".iw-toast")?.textContent || "");
        record(`traps lantern gutters out when dry and refuses to light`, !e.lit && e.oil === 0 && !ft && /dry/.test(toast), `${JSON.stringify(e)} "${toast}"`);
        const gained = await page.evaluate(() => { const W = window.__game.powers; W.give("qa"); W.give("qa"); W.give("qa"); W.give("qa"); return W.oil; });
        record(`traps oil caps at three flasks`, gained === 60, String(gained));
      } else record("traps lantern target exists", false);
    } else if (cls === "dutchie") {
      const r = await page.evaluate(async () => {
        const S = window.__game.state, { findPath } = await import("/core/path.js");
        const { reachable } = await import("/core/path.js");
        const onTrap = (p) => !!p && p.some((c) => { const t = S.traps.at(c); return t && !t.disarmed; });
        for (const t of S.traps.all()) {
          if (t.disarmed) continue;
          S.traps.reveal(t.id);
          const cells = reachable(S.level, S.actor.cell).filter((c) => !S.traps.at(c));
          for (const a of cells) for (const b of cells) {
            if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 6) continue;
            const plain = findPath(S.level, a, b);
            if (!plain || !onTrap(plain)) continue;
            const routed = findPath(S.level, a, b, { cost: S.powers.avoid });
            if (routed && !onTrap(routed) && routed.length <= plain.length + 8) return { trap: t.id, from: a, to: b, plain: plain.length, routed: routed.length, plainHits: true, routedHits: false };
          }
        }
        return null;
      });
      record(`traps waypoint routes around a revealed trap`, !!r && r.plainHits && !r.routedHits, JSON.stringify(r));
    } else if (cls === "wanderer") {
      const h0 = (await P(page)).hearts;
      await fireKey(page);
      await advance(page, 1);
      const s = await P(page);
      record(`traps ink step jumps ${spot.kind} unhurt`, s.cell.join() === spot.to.join() && s.hearts === h0, JSON.stringify(s));
    }
    record(`traps ${cls} no page errors`, o.problems.length === 0, o.problems.slice(0, 3).join(" | "));
    await page.close();
  }
}

async function touchSuite() {
  const o = await open("level=wizard-medium&class=wanderer&dpad=1", { width: 390, height: 844, touch: true });
  if (!o.done) { record("touch page loads", false); return o.page.close(); }
  const page = o.page;
  const j = await findJump(page, {});
  await place(page, j.from, j.dir);
  const b = await page.$eval(".iw-pow", (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.touchscreen.tap(b[0], b[1]);
  await wait(30);
  await advance(page, 0.7);
  const s = await P(page);
  record("touch power button fires Ink Step", s.cell.join() === j.to.join(), `${j.from} -> ${s.cell} want ${j.to}`);
  await advance(page, 0.2);
  const badge = await page.$eval(".iw-pow", (e) => ({ badge: e.querySelector("b").textContent, wait: e.classList.contains("wait"), c: e.style.getPropertyValue("--c") }));
  record("touch button shows the charges left", badge.badge === "1" && !badge.wait, JSON.stringify(badge));
  await page.close();
}

async function rushSuite() {
  const o = await open(`level=${TRAPS}&class=dutchie`);
  record("rush page loads", o.done);
  if (!o.done) return o.page.close();
  const page = o.page;
  const r = await page.evaluate(async () => {
    const { RUSH } = await import("/core/powers.js");
    const g = window.__game, S = g.state, W = g.powers, a = S.actor;
    g.pause();
    const spikes = S.traps.list.find((t) => t.kind === "t03");
    const beats = (secs) => { const out = []; let last = spikes.beat; for (let i = 0; i < secs * 60; i++) { g.advance(1 / 60); if (spikes.beat !== last) { out.push(S.time); last = spikes.beat; } } return out; };
    const gap = (ts) => { const d = ts.slice(1).map((v, i) => v - ts[i]); return d.length ? d.reduce((x, y) => x + y, 0) / d.length : null; };
    const stepTicks = () => {
      const D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
      const d = Object.keys(D).find((k) => a.stepDir(k));
      a.path = [];
      const c0 = a.cell.join();
      a.stepDir(d);
      let n = 0;
      while (a.cell.join() === c0 && n < 200) { g.advance(1 / 60); n++; }
      return n;
    };
    const normal = gap(beats(4));
    const step0 = stepTicks();
    const c0 = W.charges;
    W.fire();
    g.advance(RUSH.ease + 0.05);
    const mid = { scale: S.timeScale, left: W.rush, chip: document.querySelector(".iw-power")?.textContent || "" };
    const slow = gap(beats(2.2));
    const step1 = stepTicks();
    const again = W.fire();
    g.advance(RUSH.secs);
    const after = { scale: S.timeScale, left: W.rush, charges: W.charges };
    W.fire(); g.advance(RUSH.secs + 0.2);
    const none = W.fire();
    const toast = document.querySelector(".iw-toast")?.textContent || "";
    g.resume();
    return { normal, slow, step0, step1, c0, mid, again, after, none, toast, charges: W.charges };
  });
  record("rush halves the beat-spike timer", r.normal && r.slow && Math.abs(r.slow / r.normal - 2) < 0.15, `beat gap ${r.normal?.toFixed(3)} s normal, ${r.slow?.toFixed(3)} s in Rush`);
  record("rush keeps the hero's step time", Math.abs(r.step1 - r.step0) <= 1, `${r.step0} ticks normal, ${r.step1} in Rush`);
  record("rush runs at half scale, spends a charge and shows the time left", Math.abs(r.mid.scale - 0.5) < 0.01 && r.after.charges === r.c0 - 1 && /rush \d\.\d s/.test(r.mid.chip) && !r.again, JSON.stringify(r.mid));
  record("rush returns the world scale to 1 when it ends", r.after.scale === 1 && r.after.left === 0, JSON.stringify(r.after));
  record("rush with no charges is refused with a toast", r.charges === 0 && !r.none && /No charges/.test(r.toast), r.toast);
  record("rush no page errors", o.problems.length === 0, o.problems.slice(0, 3).join(" | "));
  await page.close();
}

async function pickupSuite() {
  const levels = [...JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order, TRAPS];
  const { registerCatalog } = await import("../core/catalog.js");
  const { checkCharges } = await import("../core/layout/pickups.js");
  for (const name of levels) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, "levels", `${name}.json`), "utf8"));
    for (const p of raw.pieces || []) { const mod = await import(path.join(root, "3d", p)); if (mod.register) registerCatalog((await mod.register({ palette: raw.palette || {} })).catalog || {}); }
    const problems = checkCharges(raw);
    record(`pickups ${name} keeps a reachable charge pickup off the traps`, !problems.length, `${(raw.charges || []).length} pickups ${problems.join("; ")}`);
  }
  for (const cls of ["wanderer", "nm"]) {
    const o = await open(`level=${TRAPS}&class=${cls}`);
    if (!o.done) { record(`pickups ${cls} page loads`, false); await o.page.close(); continue; }
    const page = o.page;
    const k = await page.evaluate(async () => {
      const { isWalkable, canStep, DIRS } = await import("/core/level.js");
      const S = window.__game.state, k = S.level.charges[0];
      const d = Object.keys(DIRS).find((d) => { const f = [k.x - DIRS[d][0], k.z - DIRS[d][1]]; return isWalkable(S.level, f[0], f[1]) && canStep(S.level, f[0], f[1], d); });
      return { k, from: [k.x - DIRS[d][0], k.z - DIRS[d][1]], dir: d };
    });
    await place(page, k.from, k.dir);
    const p0 = await P(page);
    const gems0 = await page.evaluate(() => window.__game.renderer.three.scene.getObjectByName("charge-pickups")?.children.length || 0);
    await page.evaluate((c) => { window.__game.state.actor.path = [[c.x, c.z]]; }, k.k);
    await advance(page, 0.8);
    const p1 = await P(page);
    const gems1 = await page.evaluate(() => window.__game.renderer.three.scene.getObjectByName("charge-pickups")?.children.length || 0);
    if (cls === "nm") record(`pickups an oil flask adds 20 s for the Lantern`, p1.oil === p0.oil + 20 && p1.pickups === p0.pickups - 1, `${p0.oil} -> ${p1.oil}`);
    else record(`pickups walking onto a glint grants a charge and removes it`, p1.charges === p0.charges + 1 && p1.pickups === p0.pickups - 1 && gems1 === gems0 - 1, `${p0.charges} -> ${p1.charges}, gems ${gems0} -> ${gems1}`);
    if (cls === "wanderer") {
      await page.evaluate(() => { const W = window.__game.powers; W.give("qa"); });
      const back = await page.evaluate((k) => { const S = window.__game.state; const c = S.level.charges[1]; return c; });
      await place(page, [back.x, back.z - 1], "s");
      const okFrom = await page.evaluate(async (c) => { const { canStep } = await import("/core/level.js"); return canStep(window.__game.state.level, c.x, c.z - 1, "s"); }, back);
      if (okFrom) {
        await page.evaluate((c) => { window.__game.state.actor.path = [[c.x, c.z]]; }, back);
        await advance(page, 0.8);
        const full = await P(page);
        record(`pickups a full satchel leaves the glint on the ground`, full.charges === 3 && full.pickups === 1, JSON.stringify(full));
      }
    }
    await page.close();
  }
  const c = await open("level=wizard-medium&class=aws");
  if (c.done) {
    const r = await c.page.evaluate(async () => {
      const { isWalkable } = await import("/core/level.js");
      const S = window.__game.state, ch = S.things.things.find((t) => t.kind === "chest"), a = S.actor;
      const at = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [ch.x + dx, ch.z + dz]).find(([x, z]) => isWalkable(S.level, x, z));
      a.path = []; a.cell = at.slice(); a.pos.x = at[0] + 0.5; a.pos.z = at[1] + 0.5;
      window.__game.advance(0.1);
      const before = window.__game.powers.charges;
      S.things.act();
      window.__game.advance(0.1);
      return { before, after: window.__game.powers.charges, toast: document.querySelector(".iw-toast")?.textContent || "" };
    });
    record("pickups opening a chest grants a charge", r.after === r.before + 1 && /charge/.test(r.toast), JSON.stringify(r));
  }
  await c.page.close();
}

try {
  for (const [cls, want] of [["wanderer", "Ink Step"], ["aws", "Ward"], ["dutchie", "Rush"], ["nm", "Lantern"]]) await hudSuite(cls, want);
  await inkSuite();
  await shortcutSuite();
  await wardSuite();
  await tapSuite();
  await avoidSuite();
  await touchSuite();
  await trapSuite();
  await pickupSuite();
  await rushSuite();
} finally {
  await browser.close();
}
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length} pass, ${fail.length} fail`);
for (const f of fail) console.log("FAIL", f.name, f.detail);
process.exitCode = fail.length ? 1 : 0;
