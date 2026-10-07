import puppeteer from "puppeteer-core";
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
const record = (status, name, detail = "") => { results.push({ status, name, detail }); console.log(`${status.padEnd(4)} ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
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
  await page.goto(`${BASE}/3d/index.html?${query}`, { waitUntil: "load" });
  return loaded();
}

const snap = () => page.evaluate(() => {
  const S = window.__game.state, T = S.things;
  return {
    name: S.level.name,
    cell: S.actor.cell.slice(),
    spawn: S.level.spawn.slice(),
    url: location.search,
    things: (T?.things || []).map((t) => ({ id: t.id, kind: t.kind, role: t.role || null, x: t.x, z: t.z, state: t.state, open: t.open || null, threshold: t.threshold || null, edge: t.edge || null, blocks: t.blocks })),
  };
});

const elevator = (s, role) => s.things.find((t) => t.kind === "elevator" && t.role === role) || null;
const at = (s, t) => s.cell[0] === t.x && s.cell[1] === t.z;

async function pathTo(goals) {
  return page.evaluate(async (goals) => {
    const { findPath } = await import("/core/path.js");
    const { isWalkable } = await import("/core/level.js");
    const S = window.__game.state, a = S.actor;
    let best = null;
    for (const g of goals) {
      if (!isWalkable(S.level, g[0], g[1])) continue;
      const p = findPath(S.level, a.cell, g);
      if (p && (!best || p.length < best.length)) best = p;
    }
    if (best) a.setPath(best);
    return best ? best.length - 1 : null;
  }, goals);
}

async function walk(goals) {
  const n = await pathTo(goals);
  if (n == null) return null;
  await page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, { timeout: 4000 + n * 800, polling: 50 }).catch(() => {});
  return n;
}

const around = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [t.x + a, t.z + b]);
const gateOpen = (id) => page.waitForFunction((id) => window.__game.state.things.byId[id].state === "open", { timeout: 6000, polling: 50 }, id).then(() => true, () => false);

async function reachExit(s, exit) {
  let steps = 0;
  const via = [];
  for (let tries = 0; tries < 4; tries++) {
    const n = await walk([[exit.x, exit.z]]);
    if (n != null) { steps += n; return { ok: at(await snap(), exit), steps, via }; }
    const cur = await snap();
    const gate = cur.things.find((t) => t.kind === "gate" && t.state !== "open" && !via.includes(t.id));
    if (!gate) return { ok: false, steps, via, why: "no path to the exit and no closed gate left" };
    via.push(gate.id);
    const [kind, id] = String(gate.open || "").split(":");
    const o = cur.things.find((t) => t.id === id);
    if (!o) return { ok: false, steps, via, why: `gate ${gate.id} opens on unknown ${gate.open}` };
    if (kind === "watcher") {
      const goals = gate.edge ? [gate.edge[0]] : gate.threshold?.length ? gate.threshold : around(gate.blocks[0] ? { x: gate.blocks[0][0], z: gate.blocks[0][1] } : gate);
      const m = await walk(goals);
      if (m == null) return { ok: false, steps, via, why: `no path to gate ${gate.id} threshold` };
      steps += m;
    } else if (kind === "chest" || kind === "bonfire") {
      const m = await walk(around(o));
      if (m == null) return { ok: false, steps, via, why: `no path to ${kind} ${id}` };
      steps += m;
      await page.keyboard.press("KeyE");
    } else return { ok: false, steps, via, why: `gate ${gate.id} condition ${gate.open} not drivable` };
    if (!(await gateOpen(gate.id))) return { ok: false, steps, via, why: `gate ${gate.id} stayed shut (${gate.open})` };
  }
  return { ok: false, steps, via, why: "too many gates" };
}

async function ride() {
  const nav = page.waitForNavigation({ timeout: 15000 }).then(() => true, () => false);
  await page.keyboard.press("KeyE");
  if (!(await nav)) return false;
  return loaded();
}

async function stubCheck(s, t, label) {
  if (!(await walk([[t.x, t.z]])) && !at(await snap(), t)) return record("FAIL", label, `no path to ${t.role} ${t.x},${t.z}`);
  await page.waitForFunction(() => !!document.querySelector(".iw-prompt:not([hidden])"), { timeout: 3000, polling: 50 }).catch(() => {});
  const url = page.url();
  await page.keyboard.press("KeyE");
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
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
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
    const r = await reachExit(s, exit);
    if (!r.ok) { record("FAIL", hop, `${r.why || "did not reach the exit"} (${r.steps} steps${r.via.length ? ", gates " + r.via.join(",") : ""})`); last = { i, name }; continue; }
    if (!next) { await stubCheck(await snap(), exit, hop); last = { i, name }; break; }
    if (!(await ride())) { record("FAIL", hop, `ride from ${exit.x},${exit.z} did not load a page`); last = { i, name }; continue; }
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
      const n = at(s, en) ? 0 : await walk([[en.x, en.z]]);
      if (n == null || !at(await snap(), en)) record("FAIL", backLabel, `no path to the entry at ${en.x},${en.z}`);
      else if (!(await ride())) record("FAIL", backLabel, `ride from ${en.x},${en.z} did not load a page`);
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

const n = (st) => results.filter((r) => r.status === st).length;
console.log(`\n${n("PASS")} pass, ${n("FAIL")} fail, ${n("SKIP")} skip`);
process.exitCode = n("FAIL") ? 1 : 0;
