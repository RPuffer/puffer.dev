import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const LEVELS = (process.argv[3] || "forest-a,forest-b,forest-b-small,forest-c,hooks-test").split(",");
const OUT = path.join(root, "out/qa");
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const EXPECTED = { "hooks-test": /missing\.glb|File not found/ };
const record = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-qa"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(url, { width = 1200, height = 800, touch = false } = {}) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  page.on("requestfailed", (r) => problems.push("failed " + r.url() + " " + (r.failure()?.errorText || "")));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(r.status() + " " + r.url()); });
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load" });
  let done = true;
  try { await page.waitForFunction(() => window.__done === true, { timeout: 15000, polling: 100 }); } catch { done = false; }
  return { page, problems, done, ms: Date.now() - t0 };
}

const cellOf = (page) => page.evaluate(() => window.__game.state.actor.cell.slice());
const idle = (page) => page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.held; }, { timeout: 8000, polling: 100 });

async function screenOf(page, [cx, cz]) {
  return page.evaluate(([cx, cz]) => {
    const r = window.__game.renderer, el = r.element || document.body;
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    let sx = 0, sy = 0, n = 0;
    for (let y = 2; y < h; y += 4) for (let x = 2; x < w; x += 4) {
      const c = r.pick(x, y, w, h);
      if (c && c[0] === cx && c[1] === cz) { sx += x; sy += y; n++; }
    }
    return n ? [sx / n, sy / n, n] : null;
  }, [cx, cz]);
}

async function keyStep(page, code) {
  const before = await cellOf(page);
  const expect = await page.evaluate(async (code) => {
    const { screenToWorldDir } = await import("/core/game.js");
    const { DIRS, canStep } = await import("/core/level.js");
    const map = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" };
    const S = window.__game.state, a = S.actor, d = screenToWorldDir(S.proj, map[code]);
    return canStep(S.level, a.cell[0], a.cell[1], d) ? [a.cell[0] + DIRS[d][0], a.cell[1] + DIRS[d][1]] : a.cell.slice();
  }, code);
  await page.keyboard.down(code); await wait(90); await page.keyboard.up(code);
  await wait(200); await idle(page);
  const after = await cellOf(page);
  return { before, after, expect, moved: after.join() !== before.join() };
}

async function diffCount(a, b) {
  const [A, B] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer(), sharp(b).removeAlpha().raw().toBuffer()]);
  let n = 0;
  for (let i = 0; i < A.length; i += 3) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) n++;
  return n;
}

async function xrayDiff(page, tag) {
  await idle(page); await wait(1200);
  const shoot = async (flag) => {
    await page.evaluate((flag) => { const g = window.__game; g.stop(); g.state.params.xray = flag; g.renderer.render(g.state, 0); }, flag);
    await wait(150);
    return page.screenshot();
  };
  const off = await shoot("0"), on = await shoot("1");
  fs.writeFileSync(path.join(OUT, tag + "-xray-on.png"), on);
  fs.writeFileSync(path.join(OUT, tag + "-xray-off.png"), off);
  return diffCount(on, off);
}

async function plan(page, file) {
  return page.evaluate(async (file) => {
    const { reachable, findPath } = await import("/core/path.js");
    const { isWalkable, DIRS } = await import("/core/level.js");
    const { CATALOG, footprintCells } = await import("/core/catalog.js");
    const { screenToWorldDir } = await import("/core/game.js");
    const S = window.__game.state, L = S.level;
    const spawn = file.spawn;
    const reach = reachable(L, spawn);
    const hOf = (c) => L.cells[c[1]][c[0]].h;
    let plateau = null, route = null;
    for (const c of reach.slice().sort((a, b) => hOf(b) - hOf(a))) {
      if (hOf(c) <= hOf(spawn)) break;
      const p = findPath(L, spawn, c);
      if (p && p.some((q) => L.cells[q[1]][q[0]].s === "ramp")) { plateau = c; route = p; break; }
    }
    const keyFor = {};
    for (const [code, sd] of [["KeyW", "up"], ["KeyD", "right"], ["KeyS", "down"], ["KeyA", "left"]]) keyFor[screenToWorldDir(S.proj, sd)] = code;
    const keys = route ? route.slice(1).map((q, i) => {
      const d = [q[0] - route[i][0], q[1] - route[i][1]];
      const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === d[0] && DIRS[k][1] === d[1]);
      return keyFor[dir];
    }) : [];
    const seen = new Set(reach.map((c) => c.join(",")));
    let behind = null;
    for (const d of L.decor) {
      const spec = CATALOG[d.t];
      if (!spec || spec.passable || (spec.height || 1) < 1.5) continue;
      for (const [fx, fz] of footprintCells(d.t, d.x, d.z, d.rot || 0)) {
        for (const [ox, oz, w] of [[-1, -1, 3], [-1, 0, 2], [0, -1, 2]]) {
          const c = [fx + ox, fz + oz];
          if (!seen.has(c.join(",")) || !isWalkable(L, c[0], c[1])) continue;
          const score = w + (/trunk/.test(d.t) ? 2 : 0) + (spec.height || 1) / 2 - (hOf(c) < L.cells[fz][fx].h ? 1 : 0);
          if (!behind || score > behind.score) behind = { cell: c, type: d.t, at: [fx, fz], score };
        }
      }
    }
    return { spawnFile: spawn, spawnLive: S.actor.cell.slice(), spawnH: hOf(spawn), plateau, plateauH: plateau && hOf(plateau), route, keys, behind };
  }, file);
}

const clean = (name, problems) => problems.filter((p) => !(EXPECTED[name] && EXPECTED[name].test(p)));

async function levelSuite(name) {
  const file = JSON.parse(fs.readFileSync(path.join(root, "levels", name + ".json"), "utf8"));
  const tag = `lvl-${name}`;
  const { page, problems, done, ms } = await open(`${BASE}/3d/index.html?level=${name}`);
  record(`${tag} __done within 15 s`, done, `${ms} ms`);
  if (!done) { record(`${tag} no console errors or failed requests`, false, problems.slice(0, 3).join(" | ")); await page.close(); return; }
  await idle(page); await wait(400);
  const P = await plan(page, file);
  record(`${tag} spawns at level file spawn`, P.spawnLive.join() === P.spawnFile.join(), `${P.spawnLive} vs ${P.spawnFile}`);
  for (const code of ["KeyW", "KeyD", "KeyS", "KeyA"]) {
    const r = await keyStep(page, code);
    record(`${tag} ${code} steps as canStep predicts`, r.after.join() === r.expect.join(), `${r.before} -> ${r.after} (expect ${r.expect})`);
  }
  const target = await page.evaluate(async () => {
    const { reachable } = await import("/core/path.js");
    const a = window.__game.state.actor;
    const r = reachable(window.__game.state.level, a.cell).filter((c) => { const d = Math.abs(c[0] - a.cell[0]) + Math.abs(c[1] - a.cell[1]); return d >= 2 && d <= 4; });
    return r[Math.floor(r.length / 2)] || null;
  });
  if (!target) record(`${tag} tap target found`, false);
  else {
    const p = await screenOf(page, target);
    if (!p) record(`${tag} tap walks to ${target}`, false, "cell not on screen");
    else {
      await page.mouse.click(p[0], p[1]); await wait(300); await idle(page);
      const got = await cellOf(page);
      record(`${tag} tap walks to ${target}`, got.join() === target.join(), `${got}`);
    }
  }
  await page.screenshot({ path: path.join(OUT, `${tag}-play.png`) });
  record(`${tag} no console errors or failed requests`, clean(name, problems).length === 0, clean(name, problems).slice(0, 3).join(" | "));
  await page.close();

  if (!P.plateau) record(`${tag} ramp climb`, name === "hooks-test", "no ramp route to a higher cell" + (name === "hooks-test" ? " (flat test level)" : ""));
  else {
    const c = await open(`${BASE}/3d/index.html?level=${name}`);
    if (!c.done) record(`${tag} ramp climb page loads`, false);
    else {
      await idle(c.page); await wait(1500);
      const trail = [];
      for (const k of P.keys) { const r = await keyStep(c.page, k); trail.push(`${k}:${r.after}`); }
      const got = await cellOf(c.page);
      record(`${tag} ramp climb ${P.spawnFile} (h${P.spawnH}) -> ${P.plateau} (h${P.plateauH})`, got.join() === P.plateau.join(), `${trail.join(" ")}`);
      record(`${tag} ramp climb page clean`, clean(name, c.problems).length === 0, clean(name, c.problems).slice(0, 3).join(" | "));
    }
    await c.page.close();
  }

  if (!P.behind) record(`${tag} see-through window`, false, "no walkable cell behind a tall piece");
  else {
    const x = await open(`${BASE}/3d/index.html?level=${name}&spawn=${P.behind.cell.join(",")}`);
    if (!x.done) record(`${tag} x-ray page loads`, false);
    else {
      const n = await xrayDiff(x.page, tag);
      record(`${tag} see-through window reveals hero at ${P.behind.cell} behind ${P.behind.type} ${P.behind.at}`, n > 40, `${n} px differ window on/off`);
      record(`${tag} x-ray page clean`, clean(name, x.problems).length === 0, clean(name, x.problems).slice(0, 3).join(" | "));
    }
    await x.page.close();
  }

  const t = await open(`${BASE}/3d/index.html?level=${name}`, { width: 400, height: 800, touch: true });
  if (t.done) {
    await idle(t.page); await wait(1500);
    const tt = await t.page.evaluate(async () => {
      const { reachable } = await import("/core/path.js");
      const a = window.__game.state.actor;
      const r = reachable(window.__game.state.level, a.cell).filter((c) => { const d = Math.abs(c[0] - a.cell[0]) + Math.abs(c[1] - a.cell[1]); return d >= 1 && d <= 2; });
      return r[0] || null;
    });
    const p = tt && await screenOf(t.page, tt);
    if (!p) record(`${tag} touch tap at 400x800`, false, "no target on screen");
    else {
      await t.page.touchscreen.tap(p[0], p[1]); await wait(300); await idle(t.page);
      const got = await cellOf(t.page);
      record(`${tag} touch tap at 400x800 walks to ${tt}`, got.join() === tt.join(), `${got}`);
    }
    record(`${tag} touch page clean`, clean(name, t.problems).length === 0, clean(name, t.problems).slice(0, 3).join(" | "));
  } else record(`${tag} touch page loads`, false);
  await t.page.close();
}

try {
  for (const name of LEVELS) await levelSuite(name);
} finally {
  await browser.close();
}
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length} pass, ${fail.length} fail`);
for (const f of fail) console.log("FAIL", f.name, f.detail);
process.exitCode = fail.length ? 1 : 0;
