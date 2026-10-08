import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const orderArg = opt("--order", null);
const W = +opt("--w", 900), H = +opt("--h", 800);
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
const ORDER = orderArg ? orderArg.split(",") : Array.isArray(run) ? run : run.order;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (status, name, detail = "") => { results.push({ status, name, detail }); console.log(`${status.padEnd(4)} ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-ridekeys"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
let problems = [];
page.on("pageerror", (e) => problems.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });

const loaded = () => page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 30000, polling: 100 }).then(() => page.evaluate(() => window.__done === true && !window.__error), () => false);
const go = async (q) => { await page.goto(`${BASE}/3d/index.html?${q}`, { waitUntil: "load" }); const ok = await loaded(); await wait(400); return ok; };

const snap = () => page.evaluate(() => {
  const S = window.__game.state, T = S.things;
  return { name: S.level.name, cell: S.actor.cell.slice(), locked: S.actor.locked, things: (T?.things || []).map((t) => ({ id: t.id, kind: t.kind, role: t.role || null, x: t.x, z: t.z, state: t.state, open: t.open || null, threshold: t.threshold || null, edge: t.edge || null, blocks: t.blocks })) };
});
const idle = () => page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, { timeout: 4000, polling: 30 }).catch(() => {});
const cellNow = () => page.evaluate(() => window.__game.state.actor.cell.slice());
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

const keyFor = () => page.evaluate(async () => {
  const { screenToWorldDir } = await import("/core/game.js");
  const S = window.__game.state, out = {};
  for (const [code, sd] of [["KeyW", "up"], ["KeyD", "right"], ["KeyS", "down"], ["KeyA", "left"]]) out[screenToWorldDir(S.proj, sd)] = code;
  return out;
});
const DIR = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const dirOf = (a, b) => Object.keys(DIR).find((d) => a[0] + DIR[d][0] === b[0] && a[1] + DIR[d][1] === b[1]);

async function keyStep(keys, dir) {
  const code = keys[dir];
  if (!code) return { ok: false, why: `no key maps to world ${dir}` };
  const from = await cellNow();
  await page.keyboard.down(code);
  await page.waitForFunction((f) => { const a = window.__game.state.actor, c = a.cell; return a.path.length > 0 || c[0] !== f[0] || c[1] !== f[1]; }, { timeout: 2000, polling: "raf" }, from).catch(() => {});
  await page.keyboard.up(code);
  await idle();
  const to = await cellNow();
  return same(to, from) ? { ok: false, why: `${code} (${dir}) did not move the hero off ${from}` } : { ok: true, from, to };
}

const planTo = (goals) => page.evaluate(async (goals) => {
  const { findPath } = await import("/core/path.js");
  const S = window.__game.state;
  let best = null;
  for (const g of goals) { const p = findPath(S.level, S.actor.cell, g); if (p && (!best || p.length < best.length)) best = p; }
  return best;
}, goals);

async function walkKeys(keys, goals, label) {
  let steps = 0;
  for (let n = 0; n < 120; n++) {
    const cur = await cellNow();
    if (goals.some((g) => same(g, cur))) return { ok: true, steps };
    const p = await planTo(goals);
    if (!p) return { ok: false, steps, why: `no path from ${cur} to ${label}` };
    const r = await keyStep(keys, dirOf(p[0], p[1]));
    if (process.env.TRACE) console.log("  ", label, cur, "->", p[1], r.to, r.why || "");
    if (!r.ok) return { ok: false, steps, why: r.why + ` (walking to ${label})` };
    steps++;
  }
  return { ok: false, steps, why: `gave up walking to ${label}` };
}

const screenOf = (c) => page.evaluate(async ([x, z]) => {
  const THREE = await import("three");
  const { surfaceY, liftLevel } = await import("/3d/terrain.js");
  const g = window.__game, S = g.state, cam = g.renderer.three.camera, r = g.renderer.element.getBoundingClientRect();
  const LL = liftLevel(S.level);
  for (const [ox, oz] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3]]) {
    const v = new THREE.Vector3(x + ox, surfaceY(LL, S.view, x, z), z + oz).project(cam);
    const px = (v.x + 1) / 2 * r.width, py = (1 - v.y) / 2 * r.height;
    const hit = g.renderer.pick(px, py, r.width, r.height);
    if (hit && hit[0] === x && hit[1] === z) return { x: r.left + px, y: r.top + py };
  }
  return null;
}, c);

async function tapOff(platform) {
  const cands = await page.evaluate(async (p) => {
    const { reachable } = await import("/core/path.js");
    const S = window.__game.state;
    return reachable(S.level, p).filter((c) => c[0] !== p[0] || c[1] !== p[1]).map((c) => [c, Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1])]).filter(([, d]) => d <= 4).sort((a, b) => a[1] - b[1]).map(([c]) => c);
  }, platform);
  for (const c of cands) {
    const s = await screenOf(c);
    if (!s) continue;
    await page.mouse.click(s.x, s.y);
    await wait(120);
    await idle();
    const now = await cellNow();
    if (same(now, c)) return { ok: true, cell: c };
    return { ok: false, why: `tap on ${c} left the hero on ${now}` };
  }
  return { ok: false, why: `no visible reachable cell within 4 of ${platform}` };
}

async function leave(keys, t, label) {
  const p = [t.x, t.z];
  if (!same(await cellNow(), p)) return { ok: false, why: `${label}: hero not on platform ${p}` };
  const nb = await page.evaluate(async (p) => { const { neighbours } = await import("/core/level.js"); return neighbours(window.__game.state.level, p[0], p[1]).map((n) => n[2]); }, p);
  if (!nb.length) return { ok: false, why: `${label}: platform ${p} has no steppable neighbour` };
  const k = await keyStep(keys, nb[0]);
  if (!k.ok) return { ok: false, why: `${label}: ${k.why}` };
  const back = await walkKeys(keys, [p], `${label} platform`);
  if (!back.ok) return { ok: false, why: `${label}: ${back.why}` };
  const tp = await tapOff(p);
  if (!tp.ok) return { ok: false, why: `${label}: ${tp.why}` };
  return { ok: true, note: `${label} key ${nb[0]}, tap ${tp.cell}` };
}

const pressE = async () => { await page.keyboard.down("KeyE"); await wait(60); await page.keyboard.up("KeyE"); };
const around = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [t.x + a, t.z + b]);
const thingState = (id) => page.evaluate((id) => window.__game.state.things.byId[id].state, id);

async function bonfire(keys, s) {
  const b = s.things.find((t) => t.kind === "bonfire");
  if (!b) return { ok: true, skip: true };
  const others = s.things.filter((t) => t.kind === "chest" && t.state === "closed");
  const lifts = s.things.filter((t) => t.kind === "elevator");
  const beside = around(b).filter(([x, z]) => !lifts.some((t) => t.x === x && t.z === z));
  const clear = beside.filter(([x, z]) => !others.some((t) => Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) <= 1));
  const w = await walkKeys(keys, clear.length ? clear : beside, `bonfire ${b.x},${b.z}`);
  if (!w.ok) return w;
  await page.waitForFunction(() => !!document.querySelector(".iw-prompt:not([hidden])"), { timeout: 2000, polling: 30 }).catch(() => {});
  await pressE();
  await wait(150);
  const st = await thingState(b.id);
  return st === "lit" ? { ok: true } : { ok: false, why: `E beside bonfire ${b.x},${b.z} left it ${st}` };
}

function gateEdge(g) {
  if (Array.isArray(g.edge) && g.edge.length === 2) return g.edge;
  const th = g.threshold?.[0], b = g.blocks?.[0];
  return th && b ? [th, b] : null;
}

async function gate(keys, s) {
  const g = s.things.find((t) => t.kind === "gate" && t.state !== "open");
  if (!g) return { ok: true, skip: true };
  const e = gateEdge(g);
  if (!e) return { ok: false, why: `gate ${g.id} has no edge or threshold` };
  const [kind, id] = String(g.open || "").split(":");
  if (kind === "chest" || kind === "bonfire") {
    const o = s.things.find((t) => t.id === id);
    const w = await walkKeys(keys, around(o), `${kind} ${id}`);
    if (!w.ok) return w;
    await pressE();
  } else {
    const w = await walkKeys(keys, [e[0]], `gate ${g.id} threshold ${e[0]}`);
    if (!w.ok) return w;
  }
  const opened = await page.waitForFunction((id) => window.__game.state.things.byId[id].state === "open", { timeout: 6000, polling: 50 }, g.id).then(() => true, () => false);
  if (!opened) return { ok: false, why: `gate ${g.id} stayed shut on ${await cellNow()}` };
  await wait(300);
  const w2 = await walkKeys(keys, [e[0]], `gate ${g.id} threshold`);
  if (!w2.ok) return w2;
  const k = await keyStep(keys, dirOf(e[0], e[1]));
  if (!k.ok) return { ok: false, why: `through gate ${g.id}: ${k.why}` };
  return same(k.to, e[1]) ? { ok: true, via: g.id } : { ok: false, why: `through gate ${g.id} landed on ${k.to}, expected ${e[1]}` };
}

async function island(i) {
  const s = await snap();
  const keys = await keyFor();
  const notes = [];
  if (s.locked) return { ok: false, why: "hero locked on arrival" };
  const entry = s.things.find((t) => t.kind === "elevator" && t.role === "entry");
  if (!entry) return { ok: false, why: "no entry platform" };
  if (!same(s.cell, [entry.x, entry.z])) return { ok: false, why: `arrived on ${s.cell}, entry ${entry.x},${entry.z}` };
  const l1 = await leave(keys, entry, "entry");
  if (!l1.ok) return l1;
  notes.push(l1.note);
  let b = await bonfire(keys, s);
  let gr = null;
  if (!b.ok && /no path/.test(b.why)) { gr = await gate(keys, await snap()); if (!gr.ok) return gr; b = await bonfire(keys, s); }
  if (!b.ok) return b;
  if (!b.skip) notes.push("bonfire lit");
  const exit = s.things.find((t) => t.kind === "elevator" && t.role === "exit");
  if (!exit) return { ok: false, why: "no exit platform" };
  for (let tries = 0; tries < 3; tries++) {
    const p = await planTo([[exit.x, exit.z]]);
    if (p) break;
    gr = await gate(keys, await snap());
    if (!gr.ok) return gr;
    if (gr.skip) return { ok: false, why: `no path to exit ${exit.x},${exit.z} and no closed gate` };
    notes.push(`through ${gr.via}`);
  }
  const w = await walkKeys(keys, [[exit.x, exit.z]], `exit ${exit.x},${exit.z}`);
  if (!w.ok) return w;
  const l2 = await leave(keys, exit, "exit");
  if (!l2.ok) return l2;
  notes.push(l2.note);
  const w2 = await walkKeys(keys, [[exit.x, exit.z]], `exit ${exit.x},${exit.z}`);
  if (!w2.ok) return w2;
  return { ok: true, note: notes.join("; ") };
}

const landed = (name) => page.waitForFunction((n) => { const S = window.__game?.state; return !!S && S.level.name === n && !S.actor.locked; }, { timeout: 20000, polling: 50 }, name).then(() => true, () => false);

async function ride(next) {
  const count = await page.evaluate(() => window.__swapCount || 0);
  await pressE();
  if (!(await landed(next))) return { ok: false, why: `E on exit did not swap to ${next}` };
  const s = await page.evaluate(() => ({ count: window.__swapCount, err: window.__swapError }));
  await wait(400);
  if (s.err) return { ok: false, why: `__swapError ${s.err}` };
  if (s.count !== count + 1) return { ok: false, why: `swapCount ${count} -> ${s.count}` };
  return { ok: true };
}

async function touchCheck(name) {
  const label = `touch ${name} 400x800`;
  await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (!(await go(`level=${name}&reset=1`))) return record("FAIL", label, "did not load");
  const ui = await page.evaluate(() => { const u = document.querySelector(".iw-use"), p = document.querySelector(".iso-dpad"); if (!u || u.hidden) return null; const a = u.getBoundingClientRect(), b = p?.getBoundingClientRect(); return { pad: !!p, beside: !!b && a.left >= b.right && a.bottom > b.top && a.top < b.bottom }; });
  if (!ui) return record("FAIL", label, "no interact button on a touch device");
  if (!ui.beside) return record("FAIL", label, "interact button not beside the d-pad");
  const s = await snap();
  const b = s.things.find((t) => t.kind === "bonfire");
  const others = s.things.filter((t) => t.kind === "chest");
  const goals = around(b).filter(([x, z]) => !others.some((t) => Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) <= 1));
  const p = await planTo(goals.length ? goals : around(b));
  if (!p) return record("FAIL", label, `no path to bonfire ${b.x},${b.z}`);
  for (const c of p.slice(1)) {
    const at = await screenOf(c);
    if (!at) continue;
    await page.touchscreen.tap(at.x, at.y);
    await wait(150);
    await idle();
  }
  const prompt = await page.waitForFunction(() => { const e = document.querySelector(".iw-prompt:not([hidden])"), u = document.querySelector(".iw-use.on"); if (!e || !u) return null; const a = e.getBoundingClientRect(), c = u.getBoundingClientRect(); return { text: e.textContent, above: a.bottom <= c.top }; }, { timeout: 3000, polling: 50 }).then((h) => h.jsonValue(), () => null);
  if (!prompt) return record("FAIL", label, `no prompt beside the bonfire on ${await cellNow()}`);
  const box = await page.$eval(".iw-use", (u) => { const r = u.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(box.x, box.y);
  await wait(300);
  const st = await thingState(b.id);
  record(st === "lit" && prompt.above ? "PASS" : "FAIL", label, `prompt "${prompt.text}" ${prompt.above ? "above" : "not above"} the button, tap on it left the bonfire ${st}`);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
}

async function backAndForth(name, next, exit) {
  const count = await page.evaluate(() => window.__swapCount || 0);
  await page.goBack({ waitUntil: "load", timeout: 5000 }).catch(() => {});
  await landed(name);
  await wait(400);
  const back = await page.evaluate(() => window.__swapCount || 0);
  if (back !== count + 1) return `Back swapped ${back - count} times, reloaded or did not swap`;
  const s = await snap();
  if (s.name !== name) return `Back loaded ${s.name}`;
  if (s.locked) return `Back restored ${name} with the hero locked on ${s.cell}`;
  const keys = await keyFor();
  const nb = await page.evaluate(async (p) => { const { neighbours } = await import("/core/level.js"); return neighbours(window.__game.state.level, p[0], p[1]).map((n) => n[2]); }, s.cell);
  const k = nb.length ? await keyStep(keys, nb[0]) : { ok: false, why: "no neighbour" };
  if (!k.ok) return `after Back: ${k.why}`;
  await page.goForward({ waitUntil: "load", timeout: 5000 }).catch(() => {});
  await landed(next);
  await wait(400);
  const fwd = await page.evaluate(() => window.__swapCount || 0);
  if (fwd !== back + 1) return `Forward swapped ${fwd - back} times, reloaded or did not swap`;
  const f = await snap();
  if (f.name !== next) return `Forward loaded ${f.name}`;
  if (f.locked) return `Forward restored ${next} with the hero locked`;
  return null;
}

try {
  await go(`level=${ORDER[0]}&reset=1`);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
  let rode = false;
  for (let i = 0; i < ORDER.length; i++) {
    const name = ORDER[i], next = ORDER[i + 1] || null, hop = next ? `${name} -> ${next}` : `${name} (last)`;
    if (!rode && !(await go(`level=${name}&reset=1&arrive=entry`))) { record("FAIL", hop, "did not load"); continue; }
    rode = false;
    problems = [];
    const r = await island(i);
    if (!r.ok) { record("FAIL", hop, r.why); continue; }
    if (!next) { record(problems.length ? "FAIL" : "PASS", hop, r.note + (problems.length ? "; " + problems[0] : "")); continue; }
    const rd = await ride(next);
    if (!rd.ok) { record("FAIL", hop, `${r.note}; ${rd.why}`); continue; }
    const s = await snap();
    if (s.name !== next) { record("FAIL", hop, `loaded ${s.name}`); continue; }
    rode = true;
    const bf = await backAndForth(name, next);
    if (bf) { record("FAIL", hop, `${r.note}; ${bf}`); rode = false; continue; }
    record(problems.length ? "FAIL" : "PASS", hop, r.note + "; back and forward unlocked" + (problems.length ? "; " + problems.slice(0, 2).join(" | ") : ""));
  }
  await touchCheck(ORDER[0]);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
} catch (e) {
  record("FAIL", "harness", e.message);
}
await browser.close();
const n = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${n("PASS")} pass, ${n("FAIL")} fail`);
process.exitCode = n("FAIL") ? 1 : 0;
