import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const OUT = path.join(root, "out/qa");
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-qa"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(url, { width, height, touch = false }) {
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
  try { await page.waitForFunction(() => window.__done === true, { timeout: 10000, polling: 100 }); } catch { done = false; }
  return { page, problems, done, ms: Date.now() - t0 };
}

const cellOf = (page) => page.evaluate(() => window.__game.state.actor.cell.slice());
const idle = (page) => page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.held; }, { timeout: 8000, polling: 100 });

async function settle(page, ms = 1500) { await idle(page); await wait(ms); }

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

async function tap(page, cell) {
  const p = await screenOf(page, cell);
  if (!p) return null;
  await page.mouse.click(p[0], p[1]);
  await wait(300);
  await idle(page);
  return cellOf(page);
}

async function keyStep(page, code) {
  const before = await cellOf(page);
  const expect = await page.evaluate(async (code) => {
    const { screenToWorldDir } = await import("/core/game.js");
    const { DIRS, canStep } = await import("/core/level.js");
    const map = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right" };
    const S = window.__game.state, a = S.actor, d = screenToWorldDir(S.proj, map[code]);
    return canStep(S.level, a.cell[0], a.cell[1], d) ? [a.cell[0] + DIRS[d][0], a.cell[1] + DIRS[d][1]] : a.cell.slice();
  }, code);
  await page.keyboard.down(code); await wait(90); await page.keyboard.up(code);
  await wait(200); await idle(page);
  const after = await cellOf(page);
  return { before, after, expect, moved: after[0] !== before[0] || after[1] !== before[1] };
}

async function blockedNeighbourTarget(page) {
  return page.evaluate(async () => {
    const { DIRS, isWalkable } = await import("/core/level.js");
    const { reachable } = await import("/core/path.js");
    const L = window.__game.state.level, a = window.__game.state.actor;
    const reach = reachable(L, a.cell);
    const seen = new Set(reach.map((c) => c.join(",")));
    const dist = (c) => Math.abs(c[0] - a.cell[0]) + Math.abs(c[1] - a.cell[1]);
    let best = null;
    for (const d of L.decor) {
      const c = [d.x, d.z], cell = L.cells[d.z]?.[d.x];
      if (!cell || cell.h < 1 || isWalkable(L, d.x, d.z)) continue;
      if (!["grass", "sand", "dirt", "stone"].includes(cell.s)) continue;
      const adj = Object.values(DIRS).map(([dx, dz]) => [d.x + dx, d.z + dz]).filter((n) => seen.has(n.join(",")) && L.cells[n[1]][n[0]].h === cell.h);
      if (adj.length && dist(c) > 1 && (!best || dist(c) < dist(best.c))) best = { c, adj };
    }
    return best;
  });
}

async function walkableTarget(page) {
  return page.evaluate(async () => {
    const { reachable } = await import("/core/path.js");
    const L = window.__game.state.level, a = window.__game.state.actor;
    const r = reachable(L, a.cell).filter((c) => { const d = Math.abs(c[0] - a.cell[0]) + Math.abs(c[1] - a.cell[1]); return d >= 2 && d <= 4; });
    return r[Math.floor(r.length / 2)] || null;
  });
}

async function diffCount(a, b) {
  const [A, B] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer(), sharp(b).removeAlpha().raw().toBuffer()]);
  let n = 0;
  for (let i = 0; i < A.length; i += 3) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) n++;
  return n;
}

async function xrayCheck(page, tag) {
  await settle(page, 1200);
  const shoot = async (flag) => {
    await page.evaluate((flag) => {
      const g = window.__game;
      g.stop();
      g.state.params.xray = flag;
      g.renderer.render(g.state, 0);
    }, flag);
    await wait(150);
    return page.screenshot();
  };
  const off = await shoot("0"), on = await shoot("1");
  fs.writeFileSync(path.join(OUT, tag + "-xray-on.png"), on);
  fs.writeFileSync(path.join(OUT, tag + "-xray-off.png"), off);
  return diffCount(on, off);
}

async function uiChecks(page, tag) {
  const has = await page.$(".iw-ui input");
  record(`${tag} ui overlay mounted`, !!has);
  if (!has) return;
  await page.$eval(".iw-ui input", (e) => { e.value = ""; e.focus(); });
  await page.type(".iw-ui input", "42");
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.keyboard.press("Enter")]);
  await page.waitForFunction(() => window.__done === true, { timeout: 10000 });
  let q = new URL(page.url()).searchParams;
  let name = await page.evaluate(() => window.__game.state.level.name);
  record(`${tag} seed field loads seed 42`, q.get("level") === "gen" && q.get("seed") === "42", `${q} level=${name}`);
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".iw-ui button")]);
  await page.waitForFunction(() => window.__done === true, { timeout: 10000 });
  q = new URL(page.url()).searchParams;
  record(`${tag} new island changes seed`, q.get("level") === "gen" && q.get("seed") && q.get("seed") !== "42", String(q));
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".iw-ui a")]);
  await page.waitForFunction(() => window.__done === true, { timeout: 10000 });
  name = await page.evaluate(() => window.__game.state.level.name);
  record(`${tag} home link loads home`, name === "home", name);
}

async function buildSuite(build, size) {
  const tag = `${build}@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done, ms } = await open(`${BASE}/${build}/index.html?level=home`, size);
  record(`${tag} __done within 10 s`, done, `${ms} ms`);
  if (!done) { await page.close(); return; }
  await settle(page, 800);
  for (const code of ["KeyW", "KeyD", "KeyS", "KeyA", "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]) {
    const r = await keyStep(page, code);
    const ok = r.after[0] === r.expect[0] && r.after[1] === r.expect[1] && r.moved;
    record(`${tag} key ${code}`, ok, `${r.before} -> ${r.after} expect ${r.expect}`);
  }
  await settle(page, 1200);
  const wt = await walkableTarget(page);
  const got = wt && await tap(page, wt);
  record(`${tag} tap walkable cell`, !!got && got[0] === wt[0] && got[1] === wt[1], `target ${wt} got ${got}`);
  await settle(page, 1200);
  const bt = await blockedNeighbourTarget(page);
  const got2 = bt && await tap(page, bt.c);
  record(`${tag} tap blocked cell stops adjacent`, !!got2 && Math.abs(got2[0] - bt.c[0]) + Math.abs(got2[1] - bt.c[1]) === 1, `target ${bt?.c} got ${got2}`);
  if (size.touch) {
    const pad = await page.$(".iso-dpad");
    record(`${tag} d-pad shown under touch`, !!pad);
    if (pad) {
      const before = await cellOf(page);
      const btn = await page.$('.iso-dpad [data-d="left"]');
      const box = await btn.boundingBox();
      await page.touchscreen.touchStart(box.x + box.width / 2, box.y + box.height / 2);
      await wait(120);
      await page.touchscreen.touchEnd();
      await wait(200); await idle(page);
      const after = await cellOf(page);
      const ui = await page.$(".iw-ui");
      const ub = ui && await ui.boundingBox();
      const pb = await pad.boundingBox();
      const overlap = ub && !(ub.x >= pb.x + pb.width || ub.x + ub.width <= pb.x || ub.y >= pb.y + pb.height || ub.y + ub.height <= pb.y);
      record(`${tag} d-pad press moves hero`, before.join() !== after.join(), `${before} -> ${after}`);
      record(`${tag} d-pad clear of ui overlay`, !overlap);
    }
  }
  await page.screenshot({ path: path.join(OUT, `${tag}-play.png`) });
  await uiChecks(page, tag);
  record(`${tag} no console errors or failed requests`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();

  const x = await open(`${BASE}/${build}/index.html?level=home&spawn=0,1`, size);
  if (!x.done) { record(`${tag} x-ray page loads`, false); await x.page.close(); return; }
  const n = await xrayCheck(x.page, tag);
  record(`${tag} see-through window reveals hero at spawn 0,1`, n > 40, `${n} px differ window on/off`);
  record(`${tag} x-ray page clean`, x.problems.length === 0, x.problems.slice(0, 3).join(" | "));
  await x.page.close();
}

async function startSuite(size) {
  const tag = `start@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done, ms } = await open(`${BASE}/`, size);
  record(`${tag} __done within 10 s`, done, `${ms} ms`);
  if (!done) { await page.close(); return; }
  const order = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
  const beginHref = await page.evaluate(() => document.getElementById("begin").href);
  const beginOk = (() => {
    try {
      const u = new URL(beginHref);
      return u.pathname.endsWith("/3d/index.html") && u.searchParams.get("level") === order[0] && u.searchParams.get("reset") === "1";
    } catch { return false; }
  })();
  record(`${tag} begin link targets first island with reset`, beginOk, beginHref);
  const tileHrefs = await page.evaluate(() => [...document.querySelectorAll("#islands a")].map((a) => a.href));
  const tilesMatch = tileHrefs.length === 12 && order.every((n, i) => {
    try { return new URL(tileHrefs[i]).searchParams.get("level") === n; } catch { return false; }
  });
  const statuses = tilesMatch
    ? await page.evaluate(async (hrefs) => {
        const out = [];
        for (const h of hrefs) { try { out.push((await fetch(h, { method: "HEAD" })).status); } catch { out.push(0); } }
        return out;
      }, tileHrefs)
    : [];
  record(`${tag} all twelve island tile links resolve`, tilesMatch && statuses.every((s) => s >= 200 && s < 400), tilesMatch ? statuses.join(",") : `count ${tileHrefs.length}`);
  await page.close();
}

async function compareSuite(size) {
  const tag = `compare@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done, ms } = await open(`${BASE}/compare.html?level=home&seed=1`, size);
  record(`${tag} __done within 10 s`, done, `${ms} ms`);
  const vis = () => page.evaluate(() => ["p3d", "p2d"].map((id) => { const e = document.getElementById(id); return !e.hidden && e.getBoundingClientRect().height > 50; }));
  record(`${tag} both panes shown by default`, (await vis()).join() === "true,true");
  for (const [v, want] of [["3d", "true,false"], ["2d", "false,true"], ["both", "true,true"]]) {
    await page.click(`[data-view="${v}"]`); await wait(200);
    const got = (await vis()).join();
    record(`${tag} toggle ${v}`, got === want, got);
  }
  const frameDone = () => page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => { try { return f.contentWindow.__done === true; } catch { return false; } }));
  await page.waitForFunction(() => [...document.querySelectorAll("iframe")].every((f) => { try { return f.contentWindow.__done === true; } catch { return false; } }), { timeout: 10000 }).catch(() => {});
  record(`${tag} both iframes render`, (await frameDone()).every(Boolean));
  await page.$eval("#ui input", (e) => { e.value = ""; e.focus(); });
  await page.type("#ui input", "7");
  await page.keyboard.press("Enter");
  await wait(300);
  const srcs = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => f.src));
  record(`${tag} seed field drives both iframes`, srcs.every((s) => /level=gen/.test(s) && /seed=7(&|$)/.test(s)), srcs.map((s) => s.split("?")[1]).join(" ; "));
  await page.click("#ui button"); await wait(300);
  const srcs2 = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => new URL(f.src).searchParams.get("seed")));
  record(`${tag} new island button changes seed`, srcs2[0] === srcs2[1] && srcs2[0] !== "7", srcs2.join(","));
  await page.waitForFunction(() => [...document.querySelectorAll("iframe")].every((f) => { try { return f.contentWindow.__done === true; } catch { return false; } }), { timeout: 10000 }).catch(() => {});
  await wait(500);
  const inner = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => !!f.contentDocument.querySelector(".iw-ui")));
  record(`${tag} no nested overlay inside iframes`, inner.every((v) => !v));
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  record(`${tag} no console errors or failed requests`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
}

try {
  for (const size of [{ width: 1200, height: 800 }, { width: 400, height: 800 }, { width: 400, height: 800, touch: true }]) {
    for (const build of ["3d", "2d"]) await buildSuite(build, size);
    if (!size.touch) { await compareSuite(size); await startSuite(size); }
  }
} finally {
  await browser.close();
}
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length} pass, ${fail.length} fail`);
for (const f of fail) console.log("FAIL", f.name, f.detail);
process.exitCode = fail.length ? 1 : 0;
