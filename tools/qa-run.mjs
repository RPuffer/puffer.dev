import puppeteer from "puppeteer-core";
import { watchdog } from "./qa-lib.mjs";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const orderArg = opt("--order", null);
const W = +opt("--w", 900), H = +opt("--h", 800);
const noEnds = flag("--no-ends");
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
const ORDER = orderArg ? orderArg.split(",") : Array.isArray(run) ? run : run.order;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const alive = watchdog();
const record = (status, name, detail = "") => { alive(status); results.push({ status, name, detail }); console.log(`${status.padEnd(4)} ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-run"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
let problems = [];
page.on("pageerror", (e) => problems.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
page.on("requestfailed", (r) => problems.push("failed " + r.url()));

const loaded = () => page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 30000, polling: 100 }).then(() => page.evaluate(() => window.__done === true && !window.__error), () => false);

async function go(query) {
  await page.goto(`${BASE}/3d/index.html?${query}${process.env.QA_CLASS ? `&class=${process.env.QA_CLASS}` : ""}`, { waitUntil: "load" });
  return loaded();
}

const snap = () => page.evaluate(() => {
  const S = window.__game.state, T = S.things;
  return {
    name: S.level.name,
    cell: S.actor.cell.slice(),
    spawn: S.level.spawn.slice(),
    url: location.search,
    things: (T?.things || []).map((t) => ({ id: t.id, kind: t.kind, role: t.role || null, x: t.x, z: t.z, state: t.state, open: t.open || null, threshold: t.threshold || null, edge: t.edge || null, back: t.back || null, blocks: t.blocks })),
  };
});

const elevator = (s, role) => s.things.find((t) => t.kind === "elevator" && t.role === role) || null;
const at = (s, t) => s.cell[0] === t.x && s.cell[1] === t.z;

async function pathTo(goals) {
  return page.evaluate(async (goals) => {
    const { findPath } = await import("/core/path.js");
    const { isWalkable } = await import("/core/level.js");
    const S = window.__game.state, a = S.actor;
    const { KINDS } = await import("/core/traps/kinds.js");
    const { slipOf } = await import("/core/layout/check.js");
    const slip = slipOf(S.level);
    const live = (S.traps?.list || []).filter((t) => !t.disarmed && t.meta.tier !== "debuff");
    const gateAt = new Map(live.filter((t) => KINDS[t.kind]?.cls).map((t) => [t.footprint[0].join(","), t]));
    const danger = new Set(live.filter((t) => !KINDS[t.kind]?.cls).flatMap((t) => (KINDS[t.kind]?.danger ? KINDS[t.kind].danger(t) : t.footprint).map((c) => c.join(","))));
    let best = null;
    for (const g of goals) {
      if (!isWalkable(S.level, g[0], g[1])) continue;
      const p = findPath(S.level, a.cell, g, { cost: (x, z) => (danger.has(x + "," + z) ? 400 : 0) + (slip?.(x, z) ? 30 : 0) });
      if (p && (!best || p.length < best.length)) best = p;
    }
    if (!best) return null;
    const j = best.findIndex((c) => gateAt.has(c.join(",")));
    window.__gateAhead = j > 0 ? { id: gateAt.get(best[j].join(",")).id, at: best[j - 1], over: best[j], next: best[j + 1] || null } : null;
    if (j > 0) best = best.slice(0, j);
    a.setPath(best);
    return best.length - 1;
  }, goals);
}


const gates = [];
let rests = 0, resting = false;
async function restAtFire() {
  const fire = await page.evaluate(() => { const f = window.__game.state.things.things.find((t) => t.kind === "bonfire"); return f ? [f.x, f.z] : null; });
  if (!fire) return { full: false };
  for (let k = 0; k < 4; k++) {
    await walk(around({ x: fire[0], z: fire[1] }));
    const near = await page.evaluate((f) => { const c = window.__game.state.actor.cell; return Math.max(Math.abs(c[0] - f[0]), Math.abs(c[1] - f[1])) <= 1; }, fire);
    if (near) break;
    const pad = await page.evaluate(async (f) => { const { nextPad } = await import("/core/path.js"); const S = window.__game.state; for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const p = nextPad(S.level, S.actor.cell, [f[0] + dx, f[1] + dz]); if (p) return p; } return null; }, fire);
    if (!pad || (await walk([pad])) == null) break;
    await page.waitForFunction(() => window.__game.state.things.focus?.kind === "pad", { timeout: 3000, polling: 50 }).catch(() => {});
    await page.keyboard.press("KeyF");
    await wait(1500);
  }
  await page.waitForFunction(() => window.__game.state.things.focus?.kind === "bonfire", { timeout: 2000, polling: 50 }).catch(() => {});
  await page.keyboard.press("KeyF");
  await wait(300);
  rests++;
  return page.evaluate(() => { const W = window.__game.state.powers, p = W.pool; return { full: p.wanderer === W.cap && p.aws === W.cap && p.dutchie === W.cap, at: window.__game.state.actor.cell.slice() }; });
}
async function crossGate(g) {
  const ok = await page.evaluate(async (g) => {
    const { KINDS } = await import("/core/traps/kinds.js");
    const G = window.__game, S = G.state, a = S.actor, t = S.traps.byId[g.id], cls = KINDS[t.kind].cls;
    if (a.cell[0] !== g.at[0] || a.cell[1] !== g.at[1] || S.life.busy) return { skip: true };
    const draw = G.renderer.render;
    G.pause();
    G.renderer.render = () => {};
    const step = (n = 1) => { for (let i = 0; i < n; i++) G.advance(1 / 60); };
    const until = (f, max = 600) => { for (let i = 0; i < max && !f(); i++) step(); return f(); };
    const pick = (c) => { try { localStorage.setItem("isoworld:class", c); } catch {} S.params.class = c; G.renderer.swapHero?.(c); step(); };
    try {
      pick(cls);
      if (!S.powers.ready && !S.powers.raised) return { ok: false, dry: true, cls, at: a.cell.slice(), charges: S.powers.charges };
      const d = [g.over[0] - a.cell[0], g.over[1] - a.cell[1]];
      a.facing = Math.atan2(d[0], d[1]);
      const target = g.next || g.over;
      if (cls === "wanderer") { S.powers.fire(); until(() => !S.powers.hop, 60); step(2); }
      else {
        S.powers.fire();
        if (cls === "dutchie") {
          until(() => S.powers.scale <= 0.51, 60);
          const shut = () => KINDS.t58.closed(t, S.traps.time);
          until(() => shut(), 300); until(() => !shut(), 300);
        }
        a.setPath([g.over, ...(g.next ? [g.next] : [])]);
        until(() => (!a.path.length && !a.moving) || !!S.life.busy, 240);
        if (cls === "nm" && S.powers.lit) S.powers.fire();
      }
      const there = a.cell[0] === target[0] && a.cell[1] === target[1];
      return { ok: there && !S.life.busy, cls, at: a.cell.slice(), busy: S.life.busy, charges: S.powers.charges };
    } finally { G.renderer.render = draw; G.resume(); }
  }, g);
  return { ...ok, id: g.id, steps: 2 };
}

async function walkOnce(goals) {
  const n = await pathTo(goals);
  if (n == null) return null;
  await page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, { timeout: 4000 + n * 800, polling: 50 }).catch(() => {});
  return n;
}

async function walk(goals) {
  let total = null;
  for (let k = 0; k < 12; k++) {
    await page.waitForFunction(() => { const S = window.__game.state; return !S.actor.locked && !S.life?.busy; }, { timeout: 8000, polling: 50 }).catch(() => {});
    const n = await walkOnce(goals);
    if (n == null) return total;
    total = (total || 0) + n;
    const g = await page.evaluate(() => window.__gateAhead);
    if (g) {
      let r = await crossGate(g);
      if (r.dry && !resting) {
        resting = true;
        const ok = await restAtFire();
        resting = false;
        console.log(`rest before ${g.id}: ${JSON.stringify(ok)}`);
        if (!ok.full) { gates.push({ ...r, why: "out of charges and could not rest" }); return null; }
        const back = await walkOnce([g.at]);
        r = back == null ? { ...r, why: "no way back to the gate after resting" } : await crossGate(g);
      }
      if (!r.skip) gates.push(r);
      if (r.ok) total += r.steps;
      continue;
    }
    const s = await page.evaluate(() => ({ cell: window.__game.state.actor.cell.slice(), traps: !!window.__game.state.traps }));
    if (!s.traps || goals.some((g) => g[0] === s.cell[0] && g[1] === s.cell[1])) return total;
  }
  return total;
}

const around = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [t.x + a, t.z + b]);
const gateOpen = (id) => page.waitForFunction((id) => window.__game.state.things.byId[id].state === "open", { timeout: 6000, polling: 50 }, id).then(() => true, () => false);

async function reachExit(s, exit) {
  let steps = 0;
  const via = [];
  for (let tries = 0; tries < 10; tries++) {
    const n = await walk([[exit.x, exit.z]]);
    if (n != null) { steps += n; return { ok: at(await snap(), exit), steps, via }; }
    const pad = await page.evaluate(async (to) => {
      const { nextPad } = await import("/core/path.js");
      const S = window.__game.state;
      return nextPad(S.level, S.actor.cell, to);
    }, [exit.x, exit.z]);
    if (pad) {
      const m = await walk([pad]);
      if (m != null) {
        steps += m;
        const before = (await snap()).cell.join();
        const ready = await page.waitForFunction(() => window.__game.state.things.focus?.kind === "pad", { timeout: 3000, polling: 50 }).then(() => true, () => false);
        if (!ready) return { ok: false, steps, via, why: `stood at ${pad} but no pad took focus` };
        await page.keyboard.press("KeyF");
        const moved = await page.waitForFunction((b) => window.__game.state.actor.cell.join() !== b, { timeout: 3000, polling: 50 }, before).then(() => true, () => false);
        if (!moved) return { ok: false, steps, via, why: `pad at ${pad} did not carry the hero` };
        via.push(`pad@${pad}`);
        steps += 4;
        continue;
      }
    }
    const cur = await snap();
    const gate = cur.things.find((t) => t.kind === "gate" && t.state !== "open" && !via.includes(t.id) && /^watcher:|^chest:|^bonfire:/.test(String(t.open || "")));
    if (!gate) return { ok: false, steps, via, why: "no path to the exit and no closed gate left" };
    via.push(gate.id);
    const [kind, id] = String(gate.open || "").split(":");
    const o = cur.things.find((t) => t.id === id);
    if (!o) return { ok: false, steps, via, why: `gate ${gate.id} opens on unknown ${gate.open}` };
    if (kind === "watcher") {
      const goals = gate.edge ? [gate.edge[0]] : gate.threshold?.length ? gate.threshold : around(gate.blocks[0] ? { x: gate.blocks[0][0], z: gate.blocks[0][1] } : gate);
      const m = (await walk(goals)) ?? (gate.back ? await walk([gate.back]) : null);
      if (m == null) return { ok: false, steps, via, why: `no path to gate ${gate.id} threshold` };
      steps += m;
    } else if (kind === "chest" || kind === "bonfire") {
      const m = await walk(around(o));
      if (m == null) return { ok: false, steps, via, why: `no path to ${kind} ${id}` };
      steps += m;
      await page.keyboard.press("KeyF");
    } else return { ok: false, steps, via, why: `gate ${gate.id} condition ${gate.open} not drivable` };
    if (!(await gateOpen(gate.id))) return { ok: false, steps, via, why: `gate ${gate.id} stayed shut (${gate.open}) with the hero at ${(await snap()).cell}` };
  }
  return { ok: false, steps, via, why: "too many gates" };
}

async function ride(next) {
  const count = await page.evaluate(() => window.__swapCount || 0);
  await page.keyboard.press("KeyF");
  const ok = await page.waitForFunction((n) => { const S = window.__game.state; return S.level.name === n && !S.actor.locked; }, { timeout: 20000, polling: 50 }, next).then(() => true, () => false);
  if (!ok) return false;
  const s = await page.evaluate(() => ({ count: window.__swapCount, err: window.__swapError }));
  if (s.err) problems.push("__swapError " + s.err);
  return s.count === count + 1;
}

async function stubCheck(s, t, label) {
  if (!(await walk([[t.x, t.z]])) && !at(await snap(), t)) return record("FAIL", label, `no path to ${t.role} ${t.x},${t.z}`);
  await page.waitForFunction(() => !!document.querySelector(".iw-prompt:not([hidden])"), { timeout: 3000, polling: 50 }).catch(() => {});
  const url = page.url();
  await page.keyboard.press("KeyF");
  await wait(1200);
  const r = await page.evaluate(() => ({ toast: window.__game.state.things.toastText, locked: window.__game.state.actor.locked, nav: window.__game.state.things.navigated }));
  const ok = page.url() === url && r.toast && !r.locked && !r.nav;
  record(ok ? "PASS" : "FAIL", label, `"${r.toast}" at ${t.x},${t.z}`);
}

async function arrival(name, role, label) {
  const s = await snap();
  const t = elevator(s, role);
  if (s.name !== name) return { s, fail: `loaded ${s.name}, expected ${name}` };
  if (!t) return { s, fail: `${name} has no ${role} platform; hero at ${s.cell}` };
  if (!at(s, t)) return { s, fail: `hero at ${s.cell}, ${role} platform ${t.x},${t.z}` };
  return { s, where: `${role} ${t.x},${t.z}` };
}

try {
  if (!(await go(`level=${ORDER[0]}&reset=1`))) throw new Error(`${ORDER[0]} did not load`);
  await page.evaluate((c) => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); if (c) localStorage.setItem("isoworld:class", c); else localStorage.removeItem("isoworld:class"); }, process.env.QA_CLASS || null);
  if (process.env.QA_CLASS) {
    const got = await page.evaluate(() => window.__game.renderer.three.scene.children.find((o) => o.userData?.animate)?.userData.heroClass || null);
    record(got === process.env.QA_CLASS ? "PASS" : "FAIL", `hero body is ${process.env.QA_CLASS}`, `got ${got}`);
  }
  let rode = false, last = null;
  for (let i = 0; i < ORDER.length; i++) {
    const name = ORDER[i], next = ORDER[i + 1] || null;
    problems = [];
    if (!rode) {
      const ok = await go(`level=${name}&reset=1${i ? "&arrive=entry" : ""}`);
      if (!ok) { record("FAIL", `load ${name}`, "window.__done never set"); continue; }
    }
    rode = false;
    const s = await snap();
    if (i === 0 && !noEnds) {
      const en = elevator(s, "entry");
      if (en) await stubCheck(s, en, `first entry stub ${name}`);
      else record("SKIP", `first entry stub ${name}`, "no entry elevator yet");
    }
    const exit = elevator(s, "exit");
    const hop = next ? `hop ${name} -> ${next}` : `last exit stub ${name}`;
    if (!next && noEnds) { last = { i, name }; break; }
    if (!exit) { record("SKIP", hop, `${name} has no exit elevator yet`); last = { i, name }; continue; }
    const topped = await page.evaluate(() => { const W = window.__game.state.powers, p = W.pool; return p.wanderer === W.cap && p.aws === W.cap && p.dutchie === W.cap && p.nm >= 20; });
    if (!topped) { resting = true; const ok = await restAtFire(); resting = false; if (!ok.full) problems.push(`could not rest at the bonfire on arrival: ${JSON.stringify(ok)}`); }
    const r = await reachExit(s, exit);
    if (!r.ok) { record("FAIL", hop, `${r.why || "did not reach the exit"} (${r.steps} steps${r.via.length ? ", gates " + r.via.join(",") : ""})`); last = { i, name }; continue; }
    if (!next) { await stubCheck(await snap(), exit, hop); last = { i, name }; break; }
    if (!(await ride(next))) { record("FAIL", hop, `ride from ${exit.x},${exit.z} did not swap to ${next}`); last = { i, name }; continue; }
    const a = await arrival(next, "entry");
    const dirty = problems.slice(0, 2).join(" | ");
    if (a.fail) { record("FAIL", hop, a.fail); rode = a.s.name === next; last = { i: i + 1, name: next }; continue; }
    record(dirty ? "FAIL" : "PASS", hop, `${r.steps} steps${r.via.length ? " through gate " + r.via.join(",") : ""}, landed on ${a.where}${dirty ? "; " + dirty : ""}`);
    rode = true;
    last = { i: i + 1, name: next };
  }

  const backLabel = last && last.i > 0 ? `back ${ORDER[last.i]} -> ${ORDER[last.i - 1]}` : "back ride";
  if (!last || last.i === 0) record("SKIP", backLabel, "no island past the first was reached");
  else {
    let s = await snap();
    if (s.name !== ORDER[last.i]) { await go(`level=${ORDER[last.i]}&arrive=entry`); s = await snap(); }
    const en = elevator(s, "entry");
    if (!en) record("SKIP", backLabel, `${s.name} has no entry elevator yet`);
    else {
      const n = at(s, en) ? 0 : (await reachExit(s, en)).ok ? 0 : null;
      if (n == null || !at(await snap(), en)) record("FAIL", backLabel, `no path to the entry at ${en.x},${en.z}`);
      else if (!(await ride(ORDER[last.i - 1]))) record("FAIL", backLabel, `ride from ${en.x},${en.z} did not swap to ${ORDER[last.i - 1]}`);
      else {
        const a = await arrival(ORDER[last.i - 1], "exit");
        record(a.fail ? "FAIL" : "PASS", backLabel, a.fail || `landed on ${a.where}`);
      }
    }
  }
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); }).catch(() => {});
} finally {
  await browser.close();
}

for (const g of gates) record(g.ok ? "PASS" : "FAIL", `class gate ${g.id} crossed after a swap to ${g.cls}`, g.ok ? `at ${g.at}` : g.why || JSON.stringify(g));
console.log(`bonfire rests to refill charges before a gate: ${rests}`);
const n = (st) => results.filter((r) => r.status === st).length;
console.log(`\n${n("PASS")} pass, ${n("FAIL")} fail, ${n("SKIP")} skip`);
process.exitCode = n("FAIL") ? 1 : 0;
