import puppeteer from "puppeteer-core";
import { screenOf, watchdog } from "./qa-lib.mjs";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const clipOut = opt("--clip", null);
const W = +opt("--w", 900), H = +opt("--h", 800);
if (args[0] && !/^https?:\/\//.test(args[0])) args.unshift("http://localhost:8765");
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
const LEVEL = args[1] || "wizard-medium";
const RUN = (() => { const r = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")); return Array.isArray(r) ? r : r.order || []; })();
const OUT = path.join(root, "out/qa");
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const alive = watchdog();
const record = (name, ok, detail = "") => { alive(name); results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-things"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(query, { width = W, height = H } = {}) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  page.on("requestfailed", (r) => problems.push("failed " + r.url()));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/3d/index.html?${query}`, { waitUntil: "load" });
  const done = await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 30000, polling: 100 }).then(() => true, () => false);
  return { page, problems, done };
}

const idle = (page) => page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.held && !a.moving; }, { timeout: 15000, polling: 50 }).catch(() => {});
const cellOf = (page) => page.evaluate(() => window.__game.state.actor.cell.slice());
const thing = (page, id) => page.evaluate((id) => { const t = window.__game.state.things.byId[id]; return { state: t.state, look: t.look, met: t.met, ride: t.ride }; }, id);
const ui = (page) => page.evaluate(() => {
  const p = document.querySelector(".iw-prompt"), t = document.querySelector(".iw-toast");
  return { prompt: p && !p.hidden ? p.textContent : "", toast: t && !t.hidden ? t.textContent : "" };
});

async function routeKeys(page, goal) {
  return page.evaluate(async (goal) => {
    const { findPath } = await import("/core/path.js");
    const { DIRS, isWalkable } = await import("/core/level.js");
    const { screenToWorldDir } = await import("/core/game.js");
    const S = window.__game.state, a = S.actor;
    const goals = Array.isArray(goal[0]) ? goal : [goal];
    let best = null;
    for (const g of goals) {
      if (!isWalkable(S.level, g[0], g[1])) continue;
      const p = findPath(S.level, a.cell, g);
      if (p && (!best || p.length < best.length)) best = p;
    }
    if (!best) return null;
    const keyFor = {};
    for (const [code, sd] of [["KeyW", "up"], ["KeyD", "right"], ["KeyS", "down"], ["KeyA", "left"]]) keyFor[screenToWorldDir(S.proj, sd)] = code;
    return best.slice(1).map((q, i) => {
      const d = [q[0] - best[i][0], q[1] - best[i][1]];
      return keyFor[Object.keys(DIRS).find((k) => DIRS[k][0] === d[0] && DIRS[k][1] === d[1])];
    });
  }, goal);
}

async function walkTo(page, goal) {
  let keys = await routeKeys(page, goal);
  if (!keys) return false;
  for (let n = 0; keys?.length && n < 240; n++) {
    await page.keyboard.down(keys[0]);
    await wait(60);
    await page.keyboard.up(keys[0]);
    await idle(page);
    keys = await routeKeys(page, goal);
  }
  return !!keys;
}

const around = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [t.x + a, t.z + b]);

const beckonOf = (page, id) => page.evaluate((i) => window.__game.renderer.things?.beckon?.state()[i] || null, id);

async function suite() {
  const { page, problems, done } = await open(`level=${LEVEL}&reset=1`);
  record("loads with reset", done);
  if (!done) return;
  const info = await page.evaluate(() => {
    const S = window.__game.state, T = S.things;
    return { things: T.things.map((t) => ({ id: t.id, kind: t.kind, role: t.role || null, run: t.run || null, to: t.to || null, x: t.x, z: t.z, state: t.state, threshold: t.threshold, blocks: t.blocks, edge: t.edge || null, hold: !!t.hold, open: t.open || null })), spawn: S.actor.cell.slice(), file: S.level.spawn.slice(), calls: (() => { const gl = window.__game.renderer.three.gl; window.__game.renderer.render(S, 0); return gl.info.render.calls; })() };
  });
  const by = Object.fromEntries(info.things.map((t) => [t.kind, t]));
  by.gate = info.things.find((t) => t.kind === "gate" && /^watcher:/.test(t.open || "")) || by.gate;
  const lifts = info.things.filter((t) => t.kind === "elevator");
  by.elevator = lifts.find((t) => t.role === "exit") || lifts.find((t) => !t.role) || by.elevator;
  const entry = lifts.find((t) => t.role === "entry") || null;
  const W1 = by.watcher?.id;
  const i0 = RUN.indexOf(LEVEL), order = by.elevator.run || RUN, iE = order.indexOf(LEVEL);
  const next = by.elevator.to || (iE >= 0 ? order[iE + 1] : null) || null;
  const prev = i0 > 0 ? RUN[i0 - 1] : null;
  record("five kinds present", ["bonfire", "chest", "gate", "elevator", "watcher"].every((k) => by[k]), info.things.map((t) => `${t.kind}@${t.x},${t.z}`).join(" "));
  record("fresh state spawns at the file spawn", info.spawn.join() === info.file.join(), `${info.spawn}`);
  record("fresh state: things closed", by.bonfire.state === "unlit" && by.chest.state === "closed" && by.gate.state === "closed" && lifts.every((t) => t.state === "idle"), info.things.map((t) => t.state).join(","));
  if (lifts.some((t) => t.role)) record("elevators report their role", by.elevator.role === "exit" && (!entry || entry.role === "entry"), lifts.map((t) => `${t.id} ${t.role || "none"}@${t.x},${t.z}`).join(" "));
  const gateCell = by.gate.blocks[0];
  const edge = by.gate.edge;
  const crossable = (pg = page) => pg.evaluate(async (g) => {
    const { isWalkable, canStep, DIRS } = await import("/core/level.js");
    const L = window.__game.state.level;
    if (!g.edge) return isWalkable(L, g.blocks[0][0], g.blocks[0][1]);
    const [[ax, az], [bx, bz]] = g.edge;
    const dir = Object.keys(DIRS).find((d) => ax + DIRS[d][0] === bx && az + DIRS[d][1] === bz);
    return canStep(L, ax, az, dir);
  }, by.gate);
  const walkable = (c) => page.evaluate(async (c) => { const { isWalkable } = await import("/core/level.js"); return isWalkable(window.__game.state.level, c[0], c[1]); }, c);
  record("gate is an edge gate", !!edge, edge ? `${edge[0]} | ${edge[1]}${by.gate.hold ? ", migrated with its cell held" : ""}` : `cell gate ${gateCell}`);
  record("closed gate blocks crossing", !(await crossable()), edge ? `${edge[0]} -> ${edge[1]}` : `${gateCell}`);
  if (edge && !by.gate.hold) record("closed edge leaves both cells walkable", (await walkable(edge[0])) && (await walkable(edge[1])), `${edge[0]} ${edge[1]}`);
  if (edge) {
    const bypass = await page.evaluate(async (g) => {
      const { reachable } = await import("/core/path.js");
      const S = window.__game.state;
      return reachable(S.level, S.actor.cell).some((c) => c[0] === g.edge[1][0] && c[1] === g.edge[1][1]);
    }, by.gate);
    record("closed gate cannot be bypassed", !bypass, `${edge[1]} ${bypass ? "reachable" : "unreachable"} from spawn`);
    const at = await page.evaluate((id) => { const m = window.__game.renderer.three.scene.getObjectByName("things").children.find((o) => o.userData.thing === id); return m ? [+m.position.x.toFixed(2), +m.position.z.toFixed(2)] : null; }, by.gate.id);
    const mid = [(edge[0][0] + edge[1][0]) / 2 + 0.5, (edge[0][1] + edge[1][1]) / 2 + 0.5];
    record("gate bars drawn on the edge", !!at && Math.abs(at[0] - mid[0]) < 0.01 && Math.abs(at[1] - mid[1]) < 0.01, `${at} vs ${mid}`);
  }
  console.log(`draw calls at ${W}x${H}: ${info.calls}`);
  await idle(page);
  await wait(400);

  if (entry && !prev) {
    await walkTo(page, [entry.x, entry.z]);
    const before = page.url();
    await page.keyboard.press("KeyF");
    await wait(1200);
    const s = await page.evaluate((id) => ({ state: window.__game.state.things.byId[id].state, locked: window.__game.state.actor.locked, toast: window.__game.state.things.toastText }), entry.id);
    record("entry on the first island toasts the stub", s.state === "idle" && !s.locked && !!s.toast && page.url() === before, `"${s.toast}" at ${await cellOf(page)}`);
  } else if (entry) console.log(`entry ${entry.id} at ${entry.x},${entry.z} rides back to ${prev}`);

  await walkTo(page, around(by.bonfire).filter((c) => c.join() !== info.file.join()));
  let u = await ui(page);
  record("prompt beside the bonfire", /bonfire/i.test(u.prompt), `"${u.prompt}" at ${await cellOf(page)}`);
  await wait(700);
  const hl = await beckonOf(page, by.bonfire.id);
  record("bonfire highlight on and in reach beside it", !!hl && hl.near > 0.9 && hl.reach > 0.9, JSON.stringify(hl));
  await page.keyboard.press("KeyF");
  await wait(250);
  u = await ui(page);
  const b = await thing(page, by.bonfire.id);
  const flame = await page.evaluate((id) => { const m = window.__game.renderer.three.scene.getObjectByName("things").children.find((o) => o.userData.thing === id); return m ? m.visible : null; }, by.bonfire.id);
  record("E lights the bonfire", b.state === "lit", b.state);
  record("bonfire toast", /lit/i.test(u.toast), `"${u.toast}"`);
  record("bonfire flame part shows", flame === true);
  const respawn = await cellOf(page);

  const nearB = (c) => Math.max(Math.abs(c[0] - by.bonfire.x), Math.abs(c[1] - by.bonfire.z)) <= 1;
  const chestSide = around(by.chest).filter((c) => !nearB(c));
  await walkTo(page, chestSide.length ? chestSide : around(by.chest));
  u = await ui(page);
  record("prompt beside the chest", /chest/i.test(u.prompt), `"${u.prompt}" at ${await cellOf(page)}`);
  await page.keyboard.press("Enter");
  await wait(900);
  u = await ui(page);
  const c = await thing(page, by.chest.id);
  const lid = await page.evaluate((id) => { const m = window.__game.renderer.three.scene.getObjectByName("things").children.find((o) => o.userData.thing === id); return m ? +m.rotation.x.toFixed(2) : null; }, by.chest.id);
  record("Enter opens the chest", c.state === "open", c.state);
  record("chest toast", u.toast.length > 0 && !/lit/i.test(u.toast), `"${u.toast}"`);
  record("chest lid swung back", lid !== null && lid < -1.5, `${lid}`);
  await page.keyboard.press("KeyF");
  await wait(200);
  record("chest stays open", (await thing(page, by.chest.id)).state === "open");

  const w0 = await thing(page, W1);
  record("watcher idle before the threshold", w0.look < 0.05, `look ${w0.look?.toFixed(2)}`);
  const th = by.gate.threshold[0];
  await walkTo(page, th);
  record("hero on the threshold", (await cellOf(page)).join() === th.join(), `${await cellOf(page)}`);
  await wait(1500);
  const w1 = await thing(page, W1);
  const head = await page.evaluate(() => {
    let h = null;
    window.__game.renderer.three.scene.traverse((o) => { if (o.userData?.live?.part === "head") h = o; });
    if (!h) return null;
    const a = h.userData.base.elements, b = h.matrix.elements;
    return { moved: a.some((v, i) => Math.abs(v - b[i]) > 1e-3), glow: +h.userData.glow.toFixed(2) };
  });
  record("watcher turns to face the hero", w1.look > 0.9 && (!head || head.moved), `look ${w1.look.toFixed(2)}, head moved ${head ? head.moved : "no live head part"}`);
  if (head) record("hat crest flame brightens", head.glow > 0.9, `glow ${head.glow}`);
  else console.log("no live head part: crest check skipped");
  await page.waitForFunction((id) => window.__game.state.things.byId[id].state === "open", { timeout: 6000, polling: 100 }, by.gate.id).catch(() => {});
  const g = await thing(page, by.gate.id);
  record("gate opens at the threshold", g.state === "open", g.state);
  record("open gate lets the hero cross", await crossable());
  const lift = await page.evaluate((id) => { const m = window.__game.renderer.three.scene.getObjectByName("things").children.find((o) => o.userData.thing === id); return m ? +m.userData.lift.toFixed(2) : null; }, by.gate.id);
  record("gate bars lifted", lift > 0.95, `${lift}`);

  const ok = await walkTo(page, [by.elevator.x, by.elevator.z]);
  record("walks through the gate to the elevator", ok && (await cellOf(page)).join() === [by.elevator.x, by.elevator.z].join(), `${await cellOf(page)}`);
  await wait(1600);
  const wOut = await thing(page, W1);
  const far = await page.evaluate((id) => { const S = window.__game.state, w = S.things.byId[id]; return Math.hypot(S.actor.pos.x - w.x - w.size[0] / 2, S.actor.pos.z - w.z - w.size[1] / 2) >= w.radius; }, W1);
  if (far) record("watcher returns to pose outside its radius", wOut.look < 0.05, `look ${wOut.look.toFixed(2)}`);
  u = await ui(page);
  record("prompt on the elevator", /lift/i.test(u.prompt), `"${u.prompt}"`);
  record("page clean before the ride", problems.length === 0, problems.slice(0, 3).join(" | "));
  if (!next) {
    const before = page.url();
    await page.keyboard.press("KeyF");
    await wait(1200);
    const s = await page.evaluate((id) => ({ state: window.__game.state.things.byId[id].state, toast: window.__game.state.things.toastText }), by.elevator.id);
    record("last exit toasts the stub", s.state === "idle" && !!s.toast && page.url() === before, `"${s.toast}"`);
  } else {
    await page.keyboard.press("KeyF");
    await wait(300);
    const e = await thing(page, by.elevator.id);
    record("E starts the ride", e.state === "rising", e.state);
    const navd = await page.waitForFunction((n) => { const S = window.__game.state; return S.level.name === n && !S.actor.locked; }, { timeout: 20000, polling: 50 }, next).then(() => true, () => false);
    const url = page.url();
    const q = new URL(url).searchParams;
    record(`${by.elevator.role || "elevator"} rides forward to ${next}`, navd && q.get("level") === next && q.get("from") === LEVEL && (!by.elevator.role || q.get("arrive") === "entry"), url.replace(BASE, ""));
    const landed = navd && !(await page.evaluate(() => window.__swapError));
    const there = landed ? await page.evaluate(() => { const S = window.__game.state, e = S.things?.things.find((t) => t.kind === "elevator" && t.role === "entry"); return { name: S.level.name, cell: S.actor.cell.slice(), entry: e ? [e.x, e.z] : null }; }) : null;
    record("next island loads", there?.name === next, there?.name);
    if (by.elevator.role) record("hero lands on the next island's entry platform", !!there?.entry && there.cell.join() === there.entry.join(), there ? `${there.cell} vs entry ${there.entry}` : "");
    await page.evaluate((k) => localStorage.removeItem(k), `isoworld:things:${next}`).catch(() => {});
  }
  await page.close();

  const r = await open(`level=${LEVEL}`);
  const back = await r.page.evaluate(() => { const S = window.__game.state; return { cell: S.actor.cell.slice(), things: Object.fromEntries(S.things.things.map((t) => [t.id, t.state])) }; });
  record("reload keeps state", back.things[by.bonfire.id] === "lit" && back.things[by.chest.id] === "open" && back.things[by.gate.id] === "open", JSON.stringify(back.things));
  record("reload respawns at the bonfire", back.cell.join() === respawn.join(), `${back.cell} vs ${respawn}`);
  record("open gate stays passable after reload", await crossable(r.page));
  await r.page.close();

  const t = await open(`level=${LEVEL}&reset=1&class=dutchie&spawn=${th.join(",")}`);
  const fresh = await t.page.evaluate(() => window.__game.state.things.things.filter((q) => q.kind !== "watcher").map((q) => `${q.kind}:${q.state}`));
  const want = { bonfire: "unlit", chest: "closed", gate: "closed", elevator: "idle", lever: "up", door: "closed", ladder: "up" };
  record("?reset=1 clears state", fresh.every((f) => want[f.split(":")[0]] === f.split(":")[1]), fresh.join(","));
  await idle(t.page);
  await wait(1200);
  const seen = await thing(t.page, W1);
  const from = await t.page.evaluate(async (b) => {
    const { findPath } = await import("/core/path.js");
    const { isWalkable } = await import("/core/level.js");
    const S = window.__game.state, L = S.level, a = S.actor;
    const goal = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [b.x + dx, b.z + dz]).find(([x, z]) => isWalkable(L, x, z)) || [b.x, b.z + 1];
    let pick = null;
    for (let z = 0; z < L.cells.length && !pick; z++) for (let x = 0; x < L.cells[z].length && !pick; x++) {
      if (!L.cells[z][x].p || Math.abs(x - b.x) + Math.abs(z - b.z) < 5) continue;
      const p = findPath(L, [x, z], goal);
      if (p && p.length >= 6 && p.length <= 9) pick = [x, z];
    }
    if (pick) { a.path = []; a.cell = pick.slice(); a.pos.x = pick[0] + 0.5; a.pos.z = pick[1] + 0.5; a.moving = false; }
    return pick || a.cell.slice();
  }, by.bonfire);
  await wait(1200);
  await t.page.waitForFunction((b) => { const g = window.__game, c = g.renderer.three.camera, h = g.state.level.cells[b.z][b.x].h * g.state.view.tileH; const v = new c.position.constructor(b.x + 0.5, h, b.z + 0.5).project(c); return Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.8; }, { timeout: 8000, polling: 200 }, by.bonfire).catch(() => {});
  const target = await screenOf(t.page, [by.bonfire.x, by.bonfire.z]);
  if (!target) record("tap on the bonfire", false, "bonfire cell not on screen");
  else {
    await t.page.mouse.click(target[0], target[1]);
    await wait(400);
    await idle(t.page);
    await wait(200);
    record("tap on the bonfire walks over and lights it", (await thing(t.page, by.bonfire.id)).state === "lit", `from ${from} to ${await cellOf(t.page)}`);
    await wait(1500);
    const gone = await thing(t.page, W1);
    record("watcher returns to its pose when the hero leaves", seen.look > 0.9 && gone.look < 0.05, `look ${seen.look.toFixed(2)} at the threshold, ${gone.look.toFixed(2)} at the bonfire`);
  }
  const away = await t.page.evaluate(async (b) => {
    const { isWalkable } = await import("/core/level.js");
    const L = window.__game.state.level;
    let best = null, bd = 0;
    for (let z = 0; z < L.cells.length; z++) for (let x = 0; x < L.cells[z].length; x++) {
      const d = Math.hypot(x - b.x, z - b.z);
      if (isWalkable(L, x, z) && d > 6 && d < 10 && d > bd) { bd = d; best = [x, z]; }
    }
    return best;
  }, by.bonfire);
  record("page clean after reset", t.problems.length === 0, t.problems.slice(0, 3).join(" | "));
  await t.page.evaluate((k) => localStorage.removeItem(k), `isoworld:things:${LEVEL}`);
  await t.page.close();
  if (away) {
    const f = await open(`level=${LEVEL}&reset=1&spawn=${away.join(",")}`);
    await wait(700);
    const hl = await beckonOf(f.page, by.bonfire.id);
    record("bonfire highlight off away from it", !!hl && hl.near === 0 && hl.reach === 0, `${JSON.stringify(hl)} at ${away}`);
    await f.page.evaluate((k) => localStorage.removeItem(k), `isoworld:things:${LEVEL}`);
    await f.page.close();
  } else record("bonfire highlight off away from it", false, "no walkable cell 6 to 10 tiles from the bonfire");
}

async function clip(out) {
  const fps = 30, frames = path.resolve(out.replace(/\.mp4$/, "-frames"));
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const { page, problems, done } = await open(`level=${LEVEL}&reset=1&ui=0&nav=0`);
  if (!done) throw new Error("page did not load");
  await page.evaluate(() => window.__game.pause());
  let n = 0;
  const shoot = async () => { await page.screenshot({ path: path.join(frames, `f${String(n++).padStart(4, "0")}.png`) }); };
  const tick = async (sec) => { for (let i = 0; i < Math.round(sec * fps); i++) { await page.evaluate((d) => window.__game.advance(d), 1 / fps); await shoot(); } };
  const go = async (goal) => {
    const ok = await page.evaluate(async (goal) => {
      const { findPath } = await import("/core/path.js");
      const { isWalkable } = await import("/core/level.js");
      const S = window.__game.state, a = S.actor;
      let best = null;
      for (const g of goal) if (isWalkable(S.level, g[0], g[1])) { const p = findPath(S.level, a.cell, g); if (p && (!best || p.length < best.length)) best = p; }
      if (best) a.setPath(best);
      return !!best;
    }, Array.isArray(goal[0]) ? goal : [goal]);
    if (!ok) throw new Error(`no path to ${goal}`);
    for (let i = 0; i < 400; i++) {
      await page.evaluate((d) => window.__game.advance(d), 1 / fps);
      await shoot();
      if (await page.evaluate(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; })) break;
    }
  };
  const T = await page.evaluate(() => { const L = window.__game.state.things.things; const o = Object.fromEntries(L.map((t) => [t.kind, t])); o.elevator = L.find((t) => t.kind === "elevator" && t.role === "exit") || L.find((t) => t.kind === "elevator" && !t.role) || o.elevator; return o; });
  await tick(0.4);
  await go(around(T.bonfire));
  await page.keyboard.press("KeyF");
  await tick(0.6);
  await go(around(T.chest));
  await page.keyboard.press("KeyF");
  await tick(0.6);
  await go(T.gate.threshold[0]);
  await tick(1.3);
  await go([T.elevator.x, T.elevator.z]);
  await page.keyboard.press("KeyF");
  await tick(1.9);
  await page.close();
  for (const p of problems) console.error("page:", p);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", path.resolve(out)], { stdio: "inherit" });
  console.log(`${out}: ${n} frames, ${(n / fps).toFixed(1)} s`);
}

async function shortcutSay(level, id, kind, re, label) {
  const probe = await open(`level=${level}&reset=1`);
  const t = probe.done && await probe.page.evaluate(async (id) => {
    const { ladderEnds } = await import("/core/interact.js");
    const q = window.__game.state.things.byId[id];
    if (!q) return null;
    if (q.kind === "ladder") { const e = ladderEnds(q); return { from: e[1], to: e[0], kind: q.kind }; }
    return { from: q.edge[0], to: q.edge[1], kind: q.kind };
  }, id);
  await probe.page.close();
  if (!t) { record(`${label} on ${level}`, false, `no ${kind} ${id}`); return; }
  const { page, problems, done } = await open(`level=${level}&reset=1&spawn=${t.from.join(",")}`);
  if (!done) { record(`${label} on ${level}`, false, "page did not load"); await page.close(); return; }
  await idle(page);
  await wait(400);
  const key = await page.evaluate(async (t) => {
    const { screenToWorldDir } = await import("/core/game.js");
    const { DIRS } = await import("/core/level.js");
    const S = window.__game.state, d = [t.to[0] - t.from[0], t.to[1] - t.from[1]];
    const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === d[0] && DIRS[k][1] === d[1]);
    for (const [code, sd] of [["KeyW", "up"], ["KeyD", "right"], ["KeyS", "down"], ["KeyA", "left"]]) if (screenToWorldDir(S.proj, sd) === dir) return code;
    return null;
  }, t);
  const at = await cellOf(page);
  if (kind !== "drop") {
    const u = await ui(page);
    await page.keyboard.press("KeyF");
    await wait(300);
    const said = await page.evaluate(() => window.__game.state.things.toastText);
    record(`${label}: F says so`, at.join() === t.from.join() && !!u.prompt && re.test(said), `"${u.prompt}" -> "${said}" at ${at}`);
  }
  const n0 = await page.evaluate(() => window.__game.state.things.log.filter((l) => l.toast).length);
  await page.keyboard.down(key);
  await wait(500);
  await page.keyboard.up(key);
  await idle(page);
  const log = await page.evaluate(() => window.__game.state.things.log.filter((l) => l.toast).map((l) => l.toast));
  const after = await cellOf(page);
  const bumps = log.slice(n0);
  record(`${label}: walking into it says so once`, after.join() === t.from.join() && bumps.length === 1 && re.test(bumps[0]), `${key} from ${t.from} to ${after}: ${JSON.stringify(bumps)}`);
  record(`${label}: page clean`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.evaluate((k) => localStorage.removeItem(k), `isoworld:things:${level}`);
  await page.close();
}

async function shortcutSuite() {
  const lv = await open(`level=${LEVEL}&reset=1`);
  const ids = lv.done ? await lv.page.evaluate(() => window.__game.state.things.things.filter((t) => t.kind === "door" || t.kind === "ladder" || (t.kind === "gate" && /^lever:/.test(t.open || ""))).map((t) => ({ id: t.id, kind: t.kind === "ladder" && t.mode === "drop" ? "drop" : t.kind }))) : [];
  await lv.page.close();
  const SAY = { gate: [/won't budge/i, "lever gate before its lever"], door: [/not open from this side/i, "one-way door from the wrong side"], ladder: [/drawn up/i, "kick ladder from below"], drop: [/too high/i, "drop from below"] };
  for (const { id, kind } of ids) await shortcutSay(LEVEL, id, kind, SAY[kind][0], SAY[kind][1]);
  if (!ids.some((t) => t.kind === "drop")) await shortcutSay("wizard-medium-r2", "k1", "drop", SAY.drop[0], SAY.drop[1]);
}

try {
  if (clipOut) await clip(clipOut);
  else { await suite(); await shortcutSuite(); }
} finally {
  await browser.close();
}
if (!clipOut) {
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fail.length} pass, ${fail.length} fail`);
  for (const f of fail) console.log("FAIL", f.name, f.detail);
  process.exitCode = fail.length ? 1 : 0;
}
