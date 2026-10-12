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
const idle = (page, timeout = 8000) => page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.held; }, { timeout, polling: 100 });
const camStill = (page) => page.waitForFunction(() => {
  const c = window.__game.renderer.three.camera, k = [...c.position.toArray(), c.right, c.top].map((v) => v.toFixed(4)).join();
  const same = window.__camKey === k;
  window.__camKey = k;
  return same;
}, { timeout: 8000, polling: 150 });

async function settle(page, ms = 1500) { await idle(page); await wait(ms); }

async function screenOf(page, [cx, cz]) {
  return page.evaluate(([cx, cz]) => {
    const r = window.__game.renderer, el = r.element || document.body;
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    let sx = 0, sy = 0, n = 0;
    for (let y = 2; y < h; y += 4) for (let x = 2; x < w; x += 4) {
      const c = document.elementFromPoint(x, y) === el && r.pick(x, y, w, h);
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

const tapEl = async (page, sel, touch) => {
  const el = await page.$(sel);
  if (!el) return false;
  const b = await el.boundingBox();
  if (touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  return true;
};
const orbShown = (page) => page.waitForFunction(() => { const o = document.querySelector(".iw-orb"); return o && !o.hidden && o.getBoundingClientRect().width > 0; }, { timeout: 15000, polling: 100 }).then(() => true, () => false);
const navNodes = (page) => page.evaluate(() => [...document.querySelectorAll(".iw-nav .node")].map((n) => {
  const r = n.getBoundingClientRect();
  return { i: +n.dataset.index, slot: +n.dataset.slot, level: n.dataset.level, w: r.width, x: r.left + r.width / 2, y: r.top + r.height / 2, locked: n.classList.contains("locked"), inView: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1, leaving: !!n.dataset.leaving };
}));
const navSettled = (page, timeout = 4000) => page.evaluate((timeout) => new Promise((res) => {
  const t0 = performance.now();
  let last = "", same = 0;
  const f = () => {
    const key = [...document.querySelectorAll(".iw-nav .node")].map((n) => { const r = n.getBoundingClientRect(); return `${n.dataset.index}:${r.width.toFixed(1)}:${r.left.toFixed(1)}:${r.top.toFixed(1)}`; }).join();
    same = key && key === last ? same + 1 : 0;
    last = key;
    if (same >= 6 || performance.now() - t0 > timeout) res(same >= 6); else requestAnimationFrame(f);
  };
  f();
}), timeout);
async function panelOpens(page) {
  const ok = await page.waitForSelector(".iw-panel iframe", { timeout: 4000 }).then(() => true, () => false);
  if (!ok) return false;
  const f = await (await page.$(".iw-panel iframe")).contentFrame();
  const begin = await f.waitForSelector("#begin", { timeout: 6000 }).then(() => true, () => false);
  await f.waitForFunction(() => window.__done === true, { timeout: 8000 }).catch(() => {});
  return begin;
}

async function uiChecks(page, tag, touch) {
  const shown = await orbShown(page);
  const o = shown && await page.$eval(".iw-orb", (e) => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, top: r.top, w: innerWidth }; });
  record(`${tag} island orb at top centre`, !!o && Math.abs(o.cx - o.w / 2) < 2 && o.top < 40, JSON.stringify(o));
  if (!touch) {
    const h = await page.evaluate(() => { const a = document.querySelector(".iw-home"), o = document.querySelector(".iw-orb"); if (!a || !o) return null; const r = a.getBoundingClientRect(), q = o.getBoundingClientRect(); return { href: a.getAttribute("href"), label: a.getAttribute("aria-label"), left: r.right <= q.left, gap: Math.round(q.left - r.right), top: Math.round(r.top) }; });
    record(`${tag} character select button beside the orb`, !!h && /landing\/index\.html$/.test(h.href) && !!h.label && h.left && h.gap < 40 && h.top < 60, JSON.stringify(h));
  }
  record(`${tag} old hex button and islands link gone`, !(await page.$(".iw-nav-btn")) && !(await page.$(".iw-ui a")));
  if (!shown) return;
  await tapEl(page, ".iw-orb", touch);
  await wait(700);
  for (let i = 0; i < 14; i++) await page.keyboard.press("ArrowLeft");
  await wait(750);
  const left = await page.$('.iw-nav .node[data-index="0"]');
  record(`${tag} leftmost node is the island selector`, !!left && (await navNodes(page)).filter((n) => !n.leaving && n.w > 20).sort((a, b) => a.x - b.x)[0]?.i === 0);
  if (!left) return;
  await tapEl(page, '.iw-nav .node[data-index="0"]', touch);
  record(`${tag} selector node opens the islands panel`, await panelOpens(page));
  await page.keyboard.press("Escape");
  await wait(300);
  record(`${tag} Escape closes the panel`, !(await page.$(".iw-panel")));
}

async function charSuite(size) {
  const tag = `chars@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done } = await open(`${BASE}/3d/index.html?level=wizard-medium&reset=1`, size);
  record(`${tag} page loads`, done);
  if (!done) { await page.close(); return; }
  await settle(page, 800);
  for (const k of ["KeyW", "KeyD"]) { await page.keyboard.press(k); await idle(page).catch(() => {}); }
  await page.evaluate(() => window.__game.state.things.act());
  await settle(page, 400);
  await page.waitForFunction(() => !window.__game.state.actor.moving, { timeout: 5000, polling: 50 }).catch(() => {});
  const snap = () => page.evaluate(() => { const g = window.__game, a = g.state.actor; return { level: g.state.level.name, cell: a.cell.join(), facing: +a.facing.toFixed(3), things: g.state.things.things.map((t) => t.id + ":" + t.state).join(), cls: g.renderer.hero.userData.heroClass, url: location.pathname }; });
  const s0 = await snap();
  await tapEl(page, ".iw-home", size.touch);
  const shown = await page.waitForSelector(".iw-cs iframe", { timeout: 4000 }).then(() => true, () => false);
  record(`${tag} character select opens as an overlay over the island`, shown && (await snap()).url === s0.url);
  if (!shown) { await page.close(); return; }
  const f = await (await page.$(".iw-cs iframe")).contentFrame();
  await f.waitForFunction(() => window.__done === true && !!document.querySelector("#sc-cls")?.textContent, { timeout: 10000, polling: 100 }).catch(() => {});
  const ui0 = await f.evaluate(() => ({ cls: localStorage.getItem("isoworld:class"), choose: document.querySelector("#sc-begin")?.textContent, cont: !document.querySelector("#sc-cont")?.hidden }));
  record(`${tag} overlay offers Choose without Begin or Continue`, ui0.choose === "Choose" && !ui0.cont, JSON.stringify(ui0));
  await page.screenshot({ path: path.join(OUT, `${tag}-overlay.png`) });
  await page.click(".iw-cs .x");
  await wait(300);
  const s1 = await snap();
  record(`${tag} closing without a pick returns to play unchanged`, !(await page.$(".iw-cs")) && JSON.stringify(s1) === JSON.stringify(s0), JSON.stringify(s1));
  await tapEl(page, ".iw-home", size.touch);
  await page.waitForSelector(".iw-cs iframe", { timeout: 4000 });
  const f2 = await (await page.$(".iw-cs iframe")).contentFrame();
  await f2.waitForFunction(() => window.__done === true && !!document.querySelector("#sc-cls")?.textContent, { timeout: 10000, polling: 100 }).catch(() => {});
  await wait(600);
  await f2.click('.sc-arw[data-d="1"]');
  await wait(200);
  const want = await f2.evaluate(() => localStorage.getItem("isoworld:class"));
  await f2.$eval("#sc-begin", (b) => setTimeout(() => b.click(), 0));
  await page.waitForFunction(() => !document.querySelector(".iw-cs"), { timeout: 4000 }).catch(() => {});
  await wait(300);
  const s2 = await snap();
  record(`${tag} picking a class swaps the hero in place`, s2.cls === want && s2.cls !== s0.cls, `${s0.cls} -> ${s2.cls} want ${want}`);
  record(`${tag} class swap keeps island, cell, facing and things`, s2.level === s0.level && s2.cell === s0.cell && s2.facing === s0.facing && s2.things === s0.things && s2.url === s0.url, `${JSON.stringify(s0)} vs ${JSON.stringify(s2)}`);
  const c0 = s2.cell;
  let moved = false;
  for (const k of ["KeyS", "KeyA", "KeyW", "KeyD"]) {
    if (moved) break;
    await page.keyboard.press(k);
    await wait(150);
    await idle(page).catch(() => {});
    moved = (await snap()).cell !== c0;
  }
  record(`${tag} play resumes after the swap`, moved, c0);
  record(`${tag} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.evaluate(() => { localStorage.removeItem("isoworld:class"); localStorage.removeItem("isoworld:things:wizard-medium"); });
  await page.close();
}

async function landingSuite(size) {
  const g = await open(`${BASE}/3d/index.html?level=cat-medium&reset=1`, size);
  await g.page.evaluate(() => localStorage.setItem("isoworld:things:cat-medium", JSON.stringify({ respawn: [1, 1], things: { t0: { state: "lit" } } })));
  await g.page.goto(await g.page.$eval(".iw-home", (a) => a.href), { waitUntil: "load" });
  await g.page.waitForFunction(() => window.__done === true, { timeout: 10000, polling: 100 }).catch(() => {});
  const land = await g.page.evaluate(() => ({ path: location.pathname, cont: !!document.querySelector("#sc-cont:not([hidden])"), where: document.querySelector("#sc-where")?.textContent || "" }));
  record("character select link still opens the standalone landing with Continue", /\/landing\//.test(land.path) && land.cont, JSON.stringify(land));
  const links = await g.page.$$eval(".sc-links a", (as) => as.map((a) => ({ href: a.href, label: a.getAttribute("aria-label"), title: a.title, target: a.target, rel: a.rel, svg: !!a.querySelector("svg"), text: a.textContent.trim() })));
  const want = ["behance.net/SyntheticFlow", "github.com/RPuffer", "linkedin.com/in/ryne-puffer-2199303a", "soundcloud.com/orva-music"];
  record("landing icon links", links.length === 4 && want.every((u, i) => links[i].href.includes(u)) && links.every((l) => l.label && l.title === l.label && l.target === "_blank" && /noopener/.test(l.rel) && l.svg && !l.text), JSON.stringify(links.map((l) => [l.label, l.target, l.rel, l.svg])));
  await g.page.evaluate(() => localStorage.removeItem("isoworld:things:cat-medium"));
  record("landing round trip has no console errors", g.problems.length === 0, g.problems.slice(0, 3).join(" | "));
  await g.page.close();
}

async function buildSuite(build, size) {
  const tag = `${build}@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done, ms } = await open(`${BASE}/${build}/index.html?level=home&reset=1`, size);
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
    const band = await page.evaluate(() => { const b = document.querySelector(".iw-band"), u = document.querySelector(".iw-ui"); return { band: !!b && !b.classList.contains("off"), ui: !!u && getComputedStyle(u).display !== "none", old: !!document.querySelector(".iso-dpad,.iw-use") }; });
    record(`${tag} touch band shown, desktop buttons and d-pad gone`, band.band && !band.ui && !band.old, JSON.stringify(band));
    const back = await page.evaluate(() => { const a = document.querySelector(".iw-home"), o = document.querySelector(".iw-orb"); if (!a || !o) return null; const r = a.getBoundingClientRect(), q = o.getBoundingClientRect(); return { href: a.getAttribute("href"), label: a.getAttribute("aria-label"), w: Math.round(r.width), left: Math.round(r.left), top: Math.round(r.top), gap: Math.round(q.left - r.right), band: !!document.querySelector(".iw-band .iw-back"), shown: getComputedStyle(a).display !== "none" }; });
    record(`${tag} character select sits top left, clear of the orb and out of the band`, !!back && /landing\/index\.html$/.test(back.href) && !!back.label && back.w >= 44 && back.left >= 0 && back.left < 30 && back.top < 40 && back.gap >= 40 && !back.band && back.shown, JSON.stringify(back));
  }
  await page.screenshot({ path: path.join(OUT, `${tag}-play.png`) });
  await uiChecks(page, tag, size.touch);
  record(`${tag} no console errors or failed requests`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();

  if (build === "3d") {
    const shot = async (q) => { const o = await open(`${BASE}/3d/index.html?level=home&spawn=0,1&reset=1&hero=1${q}`, size); await settle(o.page, 1200); await o.page.evaluate(() => { const g = window.__game; g.stop(); g.renderer.render(g.state, 0); }); await wait(150); const img = await o.page.screenshot(); await o.page.close(); return img; };
    const lit = await shot(""), bare = await shot("&occlude=none");
    const d = await diffCount(lit, bare);
    record(`${tag} outline and hologram fill show the hidden hero at spawn 0,1`, d > 40, `${d} px differ default vs occlude=none`);
  }
  const x = await open(`${BASE}/${build}/index.html?level=home&spawn=0,1&reset=1&occlude=circle`, size);
  if (!x.done) { record(`${tag} x-ray page loads`, false); await x.page.close(); return; }
  const n = await xrayCheck(x.page, tag);
  record(`${tag} see-through window reveals hero at spawn 0,1`, n > 40, `${n} px differ window on/off`);
  record(`${tag} x-ray page clean`, x.problems.length === 0, x.problems.slice(0, 3).join(" | "));
  await x.page.close();
}

const yawOf = (page) => page.evaluate(() => window.__game.yaw);
const turning = (page) => page.waitForFunction(() => !window.__game.state.turn, { timeout: 4000, polling: 50 });
const heroScreen = (page) => page.evaluate(() => { const S = window.__game.state, a = S.actor; const s = S.proj.project(a.pos.x, a.y * S.view.tileH, a.pos.z); return [s.sx, s.sy]; });

async function screenUp(page, press) {
  const before = await cellOf(page), s0 = await heroScreen(page);
  await press();
  await wait(200); await idle(page);
  const after = await cellOf(page), s1 = await heroScreen(page);
  const dx = s1[0] - s0[0], dy = s1[1] - s0[1];
  return { before, after, moved: before.join() !== after.join(), up: dy < -0.2 && Math.abs(dx) < -dy * 2.5, dx: +dx.toFixed(2), dy: +dy.toFixed(2) };
}

async function rotationSuite(size) {
  const tag = `rotate@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done } = await open(`${BASE}/3d/index.html?level=home&reset=1`, size);
  record(`${tag} page loads`, done);
  if (!done) { await page.close(); return; }
  await settle(page, 600);
  record(`${tag} starts at the level yaw 45`, (await yawOf(page)) === 45, String(await yawOf(page)));
  const seen = [];
  for (const [code, want] of [["KeyE", 135], ["KeyE", 225], ["KeyE", 315], ["KeyE", 45], ["KeyQ", 315]]) {
    await page.keyboard.press(code);
    await wait(60); await turning(page);
    const y = await yawOf(page);
    seen.push(y);
    record(`${tag} ${code} turns to ${want}`, y === want, String(y));
    if (want === 45 && code === "KeyE") continue;
    await settle(page, 300);
    const hit = (code) => async () => { await page.keyboard.down(code); await wait(90); await page.keyboard.up(code); };
    const w = await screenUp(page, hit("KeyW"));
    if (w.moved) record(`${tag} yaw ${y} W moves up on screen`, w.up, `${w.before} -> ${w.after} screen d(${w.dx},${w.dy})`);
    const sd = await screenUp(page, hit("KeyS"));
    record(`${tag} yaw ${y} S moves down on screen`, sd.moved && sd.dy > 0.2 && Math.abs(sd.dx) < sd.dy * 2.5, `${sd.before} -> ${sd.after} screen d(${sd.dx},${sd.dy})`);
    if (!w.moved) { const w2 = await screenUp(page, hit("KeyW")); record(`${tag} yaw ${y} W moves up on screen`, w2.moved && w2.up, `${w2.before} -> ${w2.after} screen d(${w2.dx},${w2.dy})`); }
  }
  const elapsed = await page.evaluate(async () => {
    const g = window.__game, t0 = performance.now();
    g.rotate(1);
    await new Promise((res) => { const f = () => (g.state.turn ? requestAnimationFrame(f) : res()); f(); });
    return performance.now() - t0;
  });
  record(`${tag} turn eases over about 0.35 s`, elapsed > 250 && elapsed < 900, `${Math.round(elapsed)} ms`);
  const yNow = await yawOf(page);
  if (!size.touch) {
    const btn = await page.$('.iw-ui [data-rotate="1"]');
    record(`${tag} rotate buttons in the overlay`, !!btn && !!(await page.$('.iw-ui [data-rotate="-1"]')));
    if (btn) {
      await btn.click();
      await wait(60); await turning(page);
      const y = await yawOf(page);
      record(`${tag} rotate button turns right`, y === (yNow + 90) % 360, `${yNow} -> ${y}`);
    }
  }
  await settle(page, 600);
  const wt = await walkableTarget(page);
  const got = wt && await tap(page, wt);
  record(`${tag} tap-to-walk at yaw ${await yawOf(page)}`, !!got && got.join() === wt.join(), `target ${wt} got ${got}`);
  if (size.touch) {
    await settle(page, 400);
    const rose = await page.$(".iw-rose");
    record(`${tag} compass rose shown`, !!rose && !(await page.$(".iw-stick")));
    if (rose) {
      const p = await petalPoint(page, 0);
      const r = await screenUp(page, async () => { await page.touchscreen.touchStart(p[0], p[1]); await wait(120); await page.touchscreen.touchEnd(); });
      record(`${tag} rose up-right petal moves up on screen at yaw ${await yawOf(page)}`, r.moved ? r.up : true, `${r.before} -> ${r.after} screen d(${r.dx},${r.dy})`);
    }
  }
  const kept = await yawOf(page);
  await page.goto(`${BASE}/3d/index.html?level=home`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true, { timeout: 10000 }).catch(() => {});
  record(`${tag} reload restores the saved yaw ${kept}`, (await yawOf(page)) === kept, String(await yawOf(page)));
  for (const [q, want] of [["hero=0", 45], ["seq=0", 45], ["yaw=225", 225]]) {
    await page.goto(`${BASE}/3d/index.html?level=home&${q}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__done === true, { timeout: 10000 }).catch(() => {});
    record(`${tag} ?${q} yaw ${want}`, (await yawOf(page)) === want, String(await yawOf(page)));
  }
  await page.goto(`${BASE}/3d/index.html?level=home&reset=1`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true, { timeout: 10000 }).catch(() => {});
  record(`${tag} reset=1 clears the saved yaw`, (await yawOf(page)) === 45, String(await yawOf(page)));
  const two = await open(`${BASE}/2d/index.html?level=home`, size);
  if (two.done) {
    await two.page.keyboard.press("KeyE"); await wait(500);
    record(`${tag} 2d build ignores rotate keys`, (await yawOf(two.page)) === 45, String(await yawOf(two.page)));
  }
  await two.page.close();
  record(`${tag} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
}

async function pickMap(page) {
  return page.evaluate(() => {
    const r = window.__game.renderer, el = r.element, w = el.clientWidth, h = el.clientHeight, m = {};
    for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 6) {
      const c = document.elementFromPoint(x, y) === el && r.pick(x, y, w, h);
      if (!c) continue;
      const k = c.join(","), e = m[k] || (m[k] = [0, 0, 0, []]);
      e[0] += x; e[1] += y; e[2]++; e[3].push([x, y]);
    }
    for (const k in m) {
      const e = m[k], cx = e[0] / e[2], cy = e[1] / e[2];
      let best = e[3][0], bd = Infinity;
      for (const q of e[3]) { const d = (q[0] - cx) ** 2 + (q[1] - cy) ** 2; if (d < bd) { bd = d; best = q; } }
      m[k] = [best[0], best[1], e[2]];
    }
    return m;
  });
}

async function clickTargets(page) {
  const map = await pickMap(page);
  return page.evaluate(async (map) => {
    const { routeTo, reachable } = await import("/core/path.js");
    const S = window.__game.state, a = S.actor, L = S.level;
    const seen = new Set(reachable(L, a.cell).map((c) => c.join(",")));
    let far = null, miss = null;
    for (const [k, e] of Object.entries(map)) {
      if (e[2] < 6) continue;
      const c = k.split(",").map(Number), r = routeTo(L, a.cell, c);
      if (!r) continue;
      if (seen.has(k)) { if (!far || r.cells.length > far.n) far = { c, n: r.cells.length, p: e }; }
      else if (L.cells[c[1]]?.[c[0]]?.h >= 1) {
        const end = r.cells[r.cells.length - 1];
        if (end[0] === a.cell[0] && end[1] === a.cell[1]) continue;
        if (!miss || e[2] > miss.p[2]) miss = { c, end, p: e };
      }
    }
    return { far, miss };
  }, map);
}

const routeInfo = (page) => page.evaluate(() => {
  const g = window.__game, R = g.state.route, m = g.renderer.pathLine, u = m?.material.uniforms;
  return { active: R.active, length: R.length, goal: R.goal, ahead: R.ahead(), vis: !!m?.visible, count: m?.geometry.drawRange.count || 0, head: u?.uHead.value, len: u?.uLen.value, mark: g.state.mark };
});

async function clickAt(page, p, touch) {
  if (touch) await page.touchscreen.tap(p[0], p[1]); else await page.mouse.click(p[0], p[1]);
}

async function clickSuite(size) {
  const tag = `click@${size.width}${size.touch ? "t" : ""}`;
  for (const yaw of [45, 225]) {
    const { page, problems, done } = await open(`${BASE}/3d/index.html?level=home&reset=1&yaw=${yaw}${size.touch ? "&cam=3" : ""}`, size);
    record(`${tag} yaw ${yaw} page loads`, done);
    if (!done) { await page.close(); continue; }
    await settle(page, 800);
    let t = await clickTargets(page);
    record(`${tag} yaw ${yaw} far reachable tile on screen`, !!t.far, t.far ? `${t.far.c} ${t.far.n} cells` : "");
    if (t.far) {
      await clickAt(page, t.far.p, size.touch);
      await wait(350);
      const mid = await routeInfo(page);
      record(`${tag} yaw ${yaw} path line present mid-walk`, mid.active && mid.vis && mid.count > 12 && mid.head < mid.len && mid.goal?.join() === t.far.c.join(), `route ${mid.length} head ${mid.head?.toFixed(2)} / ${mid.len?.toFixed(2)} draw ${mid.count}`);
      if (yaw === 45 && !size.touch) await page.screenshot({ path: path.join(OUT, `${tag}-midwalk.png`) });
      await wait(200); await idle(page);
      const got = await cellOf(page), after = await routeInfo(page);
      record(`${tag} yaw ${yaw} click far tile, hero arrives`, got.join() === t.far.c.join(), `target ${t.far.c} got ${got}`);
      record(`${tag} yaw ${yaw} route clears on arrival`, !after.active);
    }
    await settle(page, 300);
    t = await clickTargets(page);
    record(`${tag} yaw ${yaw} unreachable tile on screen`, !!t.miss);
    if (t.miss) {
      await clickAt(page, t.miss.p, size.touch);
      await wait(150);
      const m = await routeInfo(page);
      await idle(page);
      const got = await cellOf(page);
      record(`${tag} yaw ${yaw} unreachable tile walks to nearest`, got.join() === t.miss.end.join() && got.join() !== t.miss.c.join(), `clicked ${t.miss.c} nearest ${t.miss.end} got ${got}`);
      record(`${tag} yaw ${yaw} unreachable tile marked`, m.mark?.ok === false && m.mark.cell.join() === t.miss.c.join());
    }
    if (yaw === 45) {
      await settle(page, 300);
      t = await clickTargets(page);
      if (t.far && t.far.n > 4) {
        await clickAt(page, t.far.p, size.touch);
        await wait(120);
        const stop = await page.evaluate(() => { const R = window.__game.state.route, c = R[R.ahead() + 1]; return c && R.interrupt(c) ? c : null; });
        await idle(page);
        const got = await cellOf(page);
        record(`${tag} route.interrupt(cell) stops the walk there`, !!stop && got.join() === stop.join(), `stop ${stop} got ${got}`);
        await settle(page, 200);
        t = await clickTargets(page);
        if (t.far && t.far.n > 4) {
          await clickAt(page, t.far.p, size.touch);
          await wait(120);
          await page.keyboard.down("KeyS"); await wait(60); await page.keyboard.up("KeyS");
          const r = await routeInfo(page);
          await idle(page);
          const got2 = await cellOf(page);
          record(`${tag} key press cancels the route`, !r.active && got2.join() !== t.far.c.join(), `got ${got2}`);
        }
      }
    }
    record(`${tag} yaw ${yaw} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
    await page.close();
  }
}

async function startSuite(size) {
  const tag = `start@${size.width}${size.touch ? "t" : ""}`;
  const { page, problems, done, ms } = await open(`${BASE}/islands.html`, size);
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
  const srcs = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => f.src));
  record(`${tag} level param drives both iframes`, srcs.every((s) => /level=home/.test(s)), srcs.map((s) => s.split("?")[1]).join(" ; "));
  await page.waitForFunction(() => [...document.querySelectorAll("iframe")].every((f) => { try { return f.contentWindow.__done === true; } catch { return false; } }), { timeout: 10000 }).catch(() => {});
  await wait(500);
  const inner = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => !!f.contentDocument.querySelector(".iw-ui")));
  record(`${tag} no nested overlay inside iframes`, inner.every((v) => !v));
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  record(`${tag} no console errors or failed requests`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
}

async function touchPoints(page, frames) {
  const c = await page.target().createCDPSession();
  for (const [type, pts] of frames) { await c.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) }); await wait(35); }
  await c.detach();
}
const slide = (from, to, n = 8) => {
  const out = [["touchStart", from]];
  for (let k = 1; k <= n; k++) out.push(["touchMove", from.map((p, j) => [p[0] + (to[j][0] - p[0]) * k / n, p[1] + (to[j][1] - p[1]) * k / n])]);
  out.push(["touchEnd", []]);
  return out;
};

const PETAL_SIGN = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
async function petalPoint(page, i) {
  return page.$eval(".iw-rose", (e, i, S) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2 + S[i][0] * r.width * 39 / 252, r.top + r.height / 2 + S[i][1] * r.height * 22.5 / 160]; }, i, PETAL_SIGN);
}
const glyphMap = (page) => page.evaluate((S) => {
  const r = document.querySelector(".iw-rose").getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, out = [];
  for (const g of document.querySelectorAll(".iw-rose .iw-glyph")) {
    const b = g.getBoundingClientRect(), sx = Math.sign(b.left + b.width / 2 - cx), sy = Math.sign(b.top + b.height / 2 - cy);
    out[S.findIndex((s) => s[0] === sx && s[1] === sy)] = g.dataset.dir;
  }
  return out;
}, PETAL_SIGN);
const projMap = (page) => page.evaluate(async (S) => {
  const { DIRS } = await import("/core/level.js");
  const P = window.__game.state.proj, out = [];
  for (const [d, [dx, dz]] of Object.entries(DIRS)) { const s = P.project(dx, 0, dz); out[S.findIndex((q) => q[0] === Math.sign(s.sx) && q[1] === Math.sign(s.sy))] = d; }
  return out;
}, PETAL_SIGN);
async function roseCell(page) {
  return page.evaluate(async () => {
    const { DIRS, canStep } = await import("/core/level.js");
    const { reachable } = await import("/core/path.js");
    const L = window.__game.state.level, a = window.__game.state.actor;
    const near = (x, z) => (L.things || []).some((t) => Math.abs(t.x - x) + Math.abs(t.z - z) <= 3);
    const back = { n: "s", s: "n", e: "w", w: "e" };
    const free = (x, z) => !near(x, z) && Object.keys(DIRS).every((d) => canStep(L, x, z, d) && canStep(L, x + DIRS[d][0], z + DIRS[d][1], back[d]));
    const run = (x, z, d) => { let n = 0; while (n < 6 && canStep(L, x, z, d) && !near(x + DIRS[d][0], z + DIRS[d][1])) { x += DIRS[d][0]; z += DIRS[d][1]; n++; } return n; };
    let best = null;
    for (const [x, z] of reachable(L, a.cell)) {
      if (!free(x, z)) continue;
      const [d, n] = Object.keys(DIRS).map((d) => [d, run(x, z, d)]).sort((p, q) => q[1] - p[1])[0];
      const dist = Math.abs(x - a.cell[0]) + Math.abs(z - a.cell[1]);
      if (n >= 4 && (!best || dist < best.dist)) best = { cell: [x, z], dir: d, run: n, dist };
    }
    return best;
  });
}
async function petalTap(page, i, ms = 120) {
  const p = await petalPoint(page, i);
  const c0 = await cellOf(page), h0 = await heroScreen(page);
  await page.evaluate((i) => {
    const g = window.__game;
    window.__petal = { on: false, t: [] };
    window.__petalOff?.();
    window.__petalOff = g.input.on((it) => { if (it.kind !== "petal") return; window.__petal.t.push(g.state.time); if (it.i === i) window.__petal.on = document.querySelector(`.iw-petal[data-i="${i}"]`).classList.contains("on"); });
  }, i);
  await page.evaluate(() => window.__game.pause());
  await page.touchscreen.touchStart(p[0], p[1]);
  await page.evaluate((s) => window.__game.advance(s), ms / 1000);
  await page.touchscreen.touchEnd();
  await page.evaluate(() => { window.__game.advance(1); window.__game.resume(); });
  await idle(page);
  const pr = await page.evaluate(() => window.__petal), held = pr.t.length === 2 ? pr.t[1] - pr.t[0] : null;
  const c1 = await cellOf(page), h1 = await heroScreen(page);
  return { c0, c1, on: pr.on, held, d: [c1[0] - c0[0], c1[1] - c0[1]], sx: h1[0] - h0[0], sy: h1[1] - h0[1] };
}
const GRID = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

async function roseSuite(size) {
  const tag = `rose@${size.width}x${size.height}t`;
  let o = await open(`${BASE}/3d/index.html?level=wizard-medium&reset=1`, size);
  record(`${tag} page loads`, o.done);
  if (!o.done) { await o.page.close(); return; }
  await settle(o.page, 600);
  const spot = await roseCell(o.page);
  record(`${tag} open cell for petal steps`, !!spot, JSON.stringify(spot));
  await o.page.close();
  if (!spot) return;
  const { page, problems, done } = await open(`${BASE}/3d/index.html?level=wizard-medium&reset=1&spawn=${spot.cell.join(",")}`, size);
  if (!done) { record(`${tag} spawn page loads`, false); await page.close(); return; }
  await settle(page, 1200);
  const ui = await page.evaluate(() => { const r = document.querySelector(".iw-rose")?.getBoundingClientRect(), hr = document.querySelector(".iw-rose .hit-r").getBoundingClientRect(), a = document.querySelector(".iw-act").getBoundingClientRect(), band = document.querySelector(".iw-band").getBoundingClientRect(); return r && { w: Math.round(r.width), h: Math.round(r.height), gap: Math.round(a.left - hr.right), clear: r.right < a.left && hr.right + 20 <= a.left && hr.left >= 0 && a.right <= innerWidth - 12, inBand: r.top > band.top && r.bottom < band.bottom, stick: !!document.querySelector(".iw-stick"), petals: document.querySelectorAll(".iw-petal").length, glyphs: document.querySelectorAll(".iw-glyph").length }; });
  record(`${tag} rose replaces the joystick with room before the action button`, !!ui && !ui.stick && ui.petals === 4 && ui.glyphs === 4 && ui.clear && ui.inBand && ui.w >= 160, JSON.stringify(ui));
  await page.screenshot({ path: path.join(OUT, `${tag}-rose.png`) });
  const yaws = [];
  for (let k = 0; k < 4; k++) {
    if (k) { await page.evaluate(() => window.__game.rotate(1)); await wait(60); await turning(page); await wait(900); }
    const yaw = await yawOf(page);
    yaws.push(yaw);
    const gm = await glyphMap(page), pm = await projMap(page);
    record(`${tag} yaw ${yaw} rim glyphs follow the camera onto their grid direction`, gm.join() === pm.join() && new Set(gm).size === 4, `glyphs ${gm} grid ${pm}`);
    const bad = [];
    for (const i of [0, 1, 2, 3]) {
      for (const j of [i, (i + 2) % 4]) {
        const r = await petalTap(page, j);
        const want = GRID[pm[j]], S = PETAL_SIGN[j];
        const ok = r.on && r.d[0] === want[0] && r.d[1] === want[1] && Math.sign(r.sx) === S[0] && Math.sign(r.sy) === S[1];
        if (!ok) bad.push(`petal ${j} ${pm[j]} ${r.c0}->${r.c1} on ${r.on} held ${r.held?.toFixed(2)} s screen ${r.sx.toFixed(2)},${r.sy.toFixed(2)}`);
      }
    }
    record(`${tag} yaw ${yaw} each petal tap is one step along its grid direction`, !bad.length, bad.join(" | ") || "8 taps");
  }
  record(`${tag} camera turned through all four yaws`, new Set(yaws).size === 4, yaws.join(","));
  const hp = (await projMap(page)).indexOf(spot.dir);
  const slow = await petalTap(page, hp, 300);
  record(`${tag} a 300 ms press is still one step`, Math.abs(slow.d[0]) + Math.abs(slow.d[1]) === 1, `${slow.c0} -> ${slow.c1} held ${slow.held?.toFixed(2)} s`);
  await petalTap(page, (hp + 2) % 4);
  const p = await petalPoint(page, hp), c0 = await cellOf(page);
  await page.evaluate(() => window.__game.pause());
  await page.touchscreen.touchStart(p[0], p[1]);
  const early = await page.evaluate((i) => { window.__game.advance(0.25); return { held: window.__game.state.actor.held, rep: document.querySelector(`.iw-petal[data-i="${i}"]`).classList.contains("rep") }; }, hp);
  const late = await page.evaluate((i) => { window.__game.advance(1.15); return { held: typeof window.__game.state.actor.held === "function", rep: document.querySelector(`.iw-petal[data-i="${i}"]`).classList.contains("rep") }; }, hp);
  await page.touchscreen.touchEnd();
  await page.evaluate(() => { window.__game.advance(1.5); window.__game.resume(); });
  await idle(page);
  const c1 = await cellOf(page), n = Math.abs(c1[0] - c0[0]) + Math.abs(c1[1] - c0[1]);
  record(`${tag} holding a petal repeats steps after the charge`, early.held == null && !early.rep && late.held && late.rep && n >= 3, `${c0} -> ${c1} (${n} steps, run ${spot.run})`);
  record(`${tag} releasing the petal stops the hero`, (await page.evaluate(() => window.__game.state.actor.held)) == null && !(await page.$(".iw-petal.on")));
  record(`${tag} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
  const f = await open(`${BASE}/3d/index.html?level=wizard-medium&reset=1&dpad=1`, { width: 1200, height: 800 });
  record(`${tag} dpad=1 forces the rose on desktop`, f.done && !!(await f.page.$(".iw-band .iw-rose")));
  await f.page.close();
}

async function stickSuite(size) {
  const tag = `stick@${size.width}x${size.height}t`;
  const { page, problems, done } = await open(`${BASE}/3d/index.html?level=wizard-medium&reset=1&controls=stick`, size);
  record(`${tag} page loads`, done);
  if (!done) { await page.close(); return; }
  await settle(page, 1500);
  record(`${tag} controls=stick keeps the joystick for A/B`, !!(await page.$(".iw-stick")) && !(await page.$(".iw-rose")));
  const st = await (await page.$(".iw-stick")).boundingBox(), cx = st.x + st.width / 2, cy = st.y + st.height / 2, R = st.width * 0.32;
  for (const [name, dx, dy] of [["down-left", -R, R], ["up-right", R, -R]]) {
    await idle(page);
    const c0 = await cellOf(page), h0 = await heroScreen(page);
    await page.touchscreen.touchStart(cx + dx, cy + dy);
    await wait(900);
    const mid = await page.evaluate(() => typeof window.__game.state.actor.held === "function");
    await page.touchscreen.touchEnd();
    await wait(150); await idle(page);
    const c1 = await cellOf(page), h1 = await heroScreen(page);
    const sx = h1[0] - h0[0], sy = h1[1] - h0[1], steps = Math.abs(c1[0] - c0[0]) + Math.abs(c1[1] - c0[1]);
    const ok = (dx > 0 ? sx > 0 : sx < 0) && (dy > 0 ? sy > 0 : sy < 0);
    record(`${tag} joystick ${name} held walks that way`, mid && steps >= 1 && ok, `${c0} -> ${c1} (${steps} steps) screen d(${sx.toFixed(2)},${sy.toFixed(2)})`);
  }
  for (const [name, dx, dy] of [["right (cross dead band)", R * 1.4, 0], ["up (cross dead band)", 0, -R * 1.4], ["light touch (center dead zone)", st.width * 0.08, -st.width * 0.08]]) {
    await idle(page);
    const c0 = await cellOf(page);
    await page.touchscreen.touchStart(cx + dx, cy + dy); await wait(600);
    const held = await page.evaluate(() => !!window.__game.state.actor.held);
    await page.touchscreen.touchEnd(); await wait(150); await idle(page);
    const c1 = await cellOf(page);
    record(`${tag} joystick ${name} does not move`, !held && c1.join() === c0.join(), `${c0} -> ${c1} held ${held}`);
  }
  record(`${tag} releasing the joystick stops the hero`, (await page.evaluate(() => window.__game.state.actor.held)) == null);
  record(`${tag} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
}

async function touchSuite(size) {
  const tag = `touch@${size.width}x${size.height}t`;
  const { page, problems, done } = await open(`${BASE}/3d/index.html?level=wizard-medium&reset=1`, size);
  record(`${tag} page loads`, done);
  if (!done) { await page.close(); return; }
  await settle(page, 1500);
  const band = await page.evaluate(() => { const b = document.querySelector(".iw-band")?.getBoundingClientRect(); return b && { top: b.top, h: b.height, H: innerHeight }; });
  record(`${tag} control band covers the bottom quarter`, !!band && Math.abs(band.top + band.h - band.H) < 2 && band.h >= band.H * 0.24 && band.h <= Math.max(151, band.H * 0.26), JSON.stringify(band));
  const states = () => page.evaluate(() => window.__game.state.things.things.map((t) => t.id + ":" + t.state).join());
  await page.evaluate(async () => {
    const { isWalkable } = await import("/core/level.js");
    const S = window.__game.state, a = S.actor, L = S.level, fire = S.things.things.find((t) => t.kind === "bonfire");
    if (!fire || Math.max(Math.abs(a.cell[0] - fire.x), Math.abs(a.cell[1] - fire.z)) <= 1) return;
    const c = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dz]) => [fire.x + dx, fire.z + dz]).find(([x, z]) => isWalkable(L, x, z));
    if (c) { a.path = []; a.cell = c.slice(); a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5; a.moving = false; }
  });
  const prompt = await page.waitForFunction(() => document.documentElement.dataset.iwAct === "1", { timeout: 4000, polling: 50 }).then(() => true, () => false);
  await page.screenshot({ path: path.join(root, `out/pass14/touch-${size.width}x${size.height}.png`) });
  const s0 = await states();
  await tapEl(page, ".iw-act", true);
  await wait(600);
  record(`${tag} action button interacts like F`, prompt && (await states()) !== s0, `prompt ${prompt}`);
  await settle(page, 1500);
  const y0 = await yawOf(page);
  await touchPoints(page, slide([[320, 300]], [[110, 310]]));
  await wait(60); await turning(page);
  const y1 = await yawOf(page);
  record(`${tag} one-finger swipe left turns the island`, y1 === (y0 + 90) % 360, `${y0} -> ${y1}`);
  await touchPoints(page, slide([[120, 300], [200, 300]], [[300, 305], [380, 305]]));
  await wait(60); await turning(page);
  const y2 = await yawOf(page);
  record(`${tag} two-finger swipe right turns it back`, y2 === y0, `${y1} -> ${y2}`);
  const z0 = await page.evaluate(() => window.__game.renderer.cam);
  await touchPoints(page, slide([[150, 350], [250, 350]], [[125, 350], [275, 350]], 5));
  const z1 = await page.evaluate(() => window.__game.renderer.cam);
  await touchPoints(page, slide([[135, 350], [265, 350]], [[155, 350], [245, 350]], 5));
  const z2 = await page.evaluate(() => window.__game.renderer.cam);
  record(`${tag} pinch out zooms in one step, pinch in zooms back`, z1 > z0 && z2 === z0 && (await yawOf(page)) === y0, `${z0} -> ${z1} -> ${z2}`);
  await page.evaluate(() => { window.__game.state.actor.locked = true; });
  await wait(250);
  const hid = await page.evaluate(() => document.querySelector(".iw-band").classList.contains("off"));
  await page.evaluate(() => { window.__game.state.actor.locked = false; });
  await wait(250);
  const back = await page.evaluate(() => !document.querySelector(".iw-band").classList.contains("off"));
  record(`${tag} band hides while the hero is locked for a ride`, hid && back);
  record(`${tag} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
}

async function navSuite(size) {
  const tag = `nav@${size.width}${size.touch ? "t" : ""}`;
  const order = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
  const at = 4, here = order[at], back = order[at - 1];
  const { page, problems, done, ms } = await open(`${BASE}/3d/index.html?level=${here}&reset=1`, size);
  record(`${tag} __done within 10 s`, done, `${ms} ms`);
  if (!done) { await page.close(); return; }
  await page.evaluate((reached, ahead) => {
    for (const n of reached) localStorage.setItem("isoworld:things:" + n, JSON.stringify({ things: {} }));
    for (const n of ahead) localStorage.removeItem("isoworld:things:" + n);
  }, order.slice(0, at), order.slice(at + 1));
  const shown = await orbShown(page);
  const bg = shown && await page.$eval(".iw-orb", (o) => o.style.backgroundImage);
  record(`${tag} orb shows the current island`, shown && bg.includes(`/assets/start/${here}.jpg`), bg);
  if (!shown) { await page.close(); return; }
  await tapEl(page, ".iw-orb", size.touch);
  await wait(300);
  await navSettled(page);
  let nodes = await navNodes(page);
  const mid = nodes.find((n) => n.slot === 0), full = nodes.filter((n) => n.w > mid.w * 0.5), outer = nodes.filter((n) => Math.abs(n.slot) === 2);
  record(`${tag} tap morphs into 5 circles centred on here`, full.length === 5 && mid.level === here && full.every((n) => n.inView), nodes.map((n) => `${n.slot}:${n.i}:${Math.round(n.w)}`).join(" "));
  record(`${tag} outer two slightly smaller than the middle three`, outer.length === 2 && outer.every((n) => n.w < mid.w * 0.9 && n.w > mid.w * 0.65) && nodes.filter((n) => Math.abs(n.slot) === 1).every((n) => Math.abs(n.w - mid.w) < 1));
  record(`${tag} unreached islands locked`, nodes.filter((n) => n.slot > 0).every((n) => n.locked) && nodes.filter((n) => n.slot < 0 && n.i > 0).every((n) => !n.locked));
  await page.screenshot({ path: path.join(root, `out/pass14/nav-${size.width}x${size.height}${size.touch ? "-touch" : ""}.png`) });
  const comer = nodes.find((n) => n.slot === -3), mover = nodes.find((n) => n.slot === -1);
  const step = nodes.find((n) => n.slot === 1).x - mid.x;
  const sampler = page.evaluate((ci, mi) => new Promise((res) => {
    const out = [], t0 = performance.now();
    const f = () => {
      const c = document.querySelector(`.iw-nav .node[data-index="${ci}"]`), m = document.querySelector(`.iw-nav .node[data-index="${mi}"]`);
      if (c && m) { const a = c.getBoundingClientRect(), b = m.getBoundingClientRect(); out.push([a.width, +getComputedStyle(c).opacity, b.top + b.height / 2]); }
      const n = out.length, still = n > 8 && out[0][0] !== out[n - 1][0] && out.slice(-6).every((s) => Math.abs(s[0] - out[n - 1][0]) < 0.2 && Math.abs(s[2] - out[n - 1][2]) < 0.2);
      if (!still && performance.now() - t0 < 8000) requestAnimationFrame(f); else res(out);
    };
    f();
  }), comer.i, mover.i);
  if (size.touch) await touchPoints(page, slide([[60, 300]], [[60 + step * 1.05, 302]], 6));
  else { await page.mouse.move(size.width / 2, 400); await page.mouse.wheel({ deltaY: -120 }); }
  const samples = await sampler;
  nodes = await navNodes(page);
  const ws = samples.map((s) => s[0]), ys = samples.map((s) => s[2]), finalY = mid.y, startY = ys[0];
  const grew = ws.length > 5 && ws[0] < mid.w * 0.25 && Math.abs(ws[ws.length - 1] - mid.w * 0.8) < 3;
  const noFade = samples.every((s) => s[1] === 1);
  const overshoot = startY > finalY ? Math.min(...ys) < finalY - 2 : Math.max(...ys) > finalY + 2;
  record(`${tag} ${size.touch ? "swipe" : "wheel"} scrolls; entering node grows from a dot, no fade`, grew && noFade && nodes.find((n) => n.slot === 0)?.i === mid.i - 1, `width ${Math.round(ws[0])} -> ${Math.round(ws[ws.length - 1])}, opacity ${noFade ? "1 throughout" : "varied"}`);
  record(`${tag} nodes bounce up and down as they settle`, overshoot, `y ${Math.round(startY)} -> ${Math.round(finalY)}, extreme ${Math.round(startY > finalY ? Math.min(...ys) : Math.max(...ys))}`);
  if (size.width === 1200) await page.screenshot({ path: path.join(root, "out/pass14/nav-scrolled-1200x800.png") });
  const swaps0 = await page.evaluate(() => window.__swapCount);
  if (size.touch) await touchPoints(page, slide([[200, 300]], [[200 - step * 1.05, 302]], 6));
  else await page.mouse.wheel({ deltaY: 120 });
  await wait(700);
  await navSettled(page);
  await tapEl(page, `.iw-nav .node[data-slot="1"]`, size.touch);
  await wait(700);
  const afterLock = await page.evaluate(() => ({ level: window.__game.state.level.name, swaps: window.__swapCount, open: !!document.querySelector(".iw-nav.open") }));
  record(`${tag} locked node stays put`, afterLock.level === here && afterLock.swaps === swaps0 && afterLock.open, JSON.stringify(afterLock));
  if (!size.touch) {
    await page.keyboard.press("Escape");
    await wait(600);
    record(`${tag} Escape closes and refocuses the orb`, await page.evaluate(() => !document.querySelector(".iw-nav") && document.activeElement?.classList.contains("iw-orb")));
    await page.keyboard.press("Enter");
    await wait(800);
    for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
    record(`${tag} Enter opens, Tab stays inside`, await page.evaluate(() => !!document.activeElement?.closest(".iw-nav")));
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await wait(700);
  } else {
    await page.touchscreen.tap(200, 560);
    await wait(600);
    record(`${tag} tapping outside closes`, !(await page.$(".iw-nav")));
    await tapEl(page, ".iw-orb", true);
    await wait(900);
  }
  await navSettled(page);
  await tapEl(page, `.iw-nav .node[data-slot="-1"]`, size.touch);
  const jumped = await page.waitForFunction((back) => window.__game.state.level.name === back && !document.querySelector(".iw-veil"), { timeout: 15000, polling: 100 }, back).then(() => true, () => false);
  const after = await page.evaluate(() => ({ level: window.__game.state.level.name, url: new URL(location.href).searchParams.get("level"), swaps: window.__swapCount }));
  record(`${tag} jump to a reached island`, jumped && after.url === back && after.swaps === swaps0 + 1, JSON.stringify(after));
  await orbShown(page);
  await wait(400);
  await tapEl(page, ".iw-orb", size.touch);
  await wait(800);
  for (let k = 0; k < 3; k++) {
    if (size.touch) await touchPoints(page, slide([[60, 300]], [[60 + step * 2.1, 302]], 8));
    else { await page.mouse.wheel({ deltaY: -120 }); await wait(120); await page.mouse.wheel({ deltaY: -120 }); }
    await wait(450);
  }
  await wait(400);
  nodes = await navNodes(page);
  const leftmost = nodes.filter((n) => !n.leaving && n.w > 20).sort((a, b) => a.x - b.x)[0];
  record(`${tag} scrolled to the far left, the selector node leads`, leftmost?.i === 0 && leftmost.level === "@islands", nodes.map((n) => `${n.slot}:${n.i}`).join(" "));
  if (size.width === 1200 || size.touch) await page.screenshot({ path: path.join(root, `out/pass14/nav-left-${size.width}x${size.height}${size.touch ? "-touch" : ""}.png`) });
  await tapEl(page, '.iw-nav .node[data-index="0"]', size.touch);
  const panel = await panelOpens(page);
  record(`${tag} selector node opens the islands panel`, panel);
  if (panel && (size.width === 1200 || size.touch)) { await wait(500); await page.screenshot({ path: path.join(root, `out/pass14/panel-${size.width}x${size.height}${size.touch ? "-touch" : ""}.png`) }); }
  record(`${tag} no console errors or failed requests`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
  if (size.width === 1200) {
    const h = await open(`${BASE}/3d/index.html?level=${here}&hero=0`, size);
    await wait(500);
    record(`${tag} no orb at hero=0`, h.done && !(await h.page.$(".iw-orb")));
    await h.page.close();
  }
}

async function camSuite(size) {
  const tag = `cam@${size.width}${size.touch ? "t" : ""}`;
  const lvl = "wizard-medium";
  const span = (page) => page.evaluate(() => { const r = window.__game.renderer, c = r.three.camera; return { w: (c.right - c.left) / Math.SQRT2, s: r.zoomScale, cam: r.cam }; });
  const d = await open(`${BASE}/3d/index.html?level=${lvl}&reset=1&cam=1`, size);
  await settle(d.page, 300);
  const def = await span(d.page);
  await d.page.close();
  const { page, problems, done } = await open(`${BASE}/3d/index.html?level=${lvl}&reset=1&cam=close`, size);
  record(`${tag} page loads`, done);
  if (!done) { await page.close(); return; }
  await settle(page, 600);
  const cl = await span(page);
  const want = size.width === 1200 ? cl.w >= 9 && cl.w <= 11 : cl.w < def.w * 0.8;
  record(`${tag} close view is tighter than fit`, cl.cam === "close" && cl.w < def.w && want, `fit ${def.w.toFixed(1)} close ${cl.w.toFixed(1)} tiles`);
  await page.evaluate(() => {
    window.__camWorst = 1;
    const loop = () => {
      const g = window.__game, a = g.state.actor, c = g.renderer.three.camera;
      const v = new c.position.constructor(a.pos.x, a.y * g.state.view.tileH + 0.45, a.pos.z).project(c);
      window.__camWorst = Math.min(window.__camWorst, 1 - Math.abs(v.x), 1 - Math.abs(v.y));
      window.__camRaf = requestAnimationFrame(loop);
    };
    loop();
  });
  let hops = 0, landed = 0, moved = 0;
  const start = await cellOf(page);
  for (const key of [null, "KeyE", null, "KeyQ", null]) {
    if (key) { await page.keyboard.press(key); await wait(600); continue; }
    await idle(page, 30000); await camStill(page);
    const t = await clickTargets(page);
    if (!t.far) continue;
    hops++;
    await clickAt(page, t.far.p, size.touch);
    await wait(300); await idle(page, 30000);
    const got = await cellOf(page);
    if (got.join() === t.far.c.join()) landed++;
    moved = Math.max(moved, Math.abs(got[0] - start[0]) + Math.abs(got[1] - start[1]));
  }
  const worst = await page.evaluate(() => { cancelAnimationFrame(window.__camRaf); return window.__camWorst; });
  record(`${tag} click picking lands on the clicked tile`, hops >= 3 && landed === hops, `${landed}/${hops} hops`);
  record(`${tag} hero stays in frame while walking far`, worst > 0.05 && moved >= 8, `min edge margin ${(worst * 50).toFixed(1)}% moved ${moved} tiles`);
  const z = await page.evaluate(async () => {
    const r = window.__game.renderer, z0 = r.three.camera.right;
    r.seq({ k: 1 }); const z1 = r.three.camera.right; r.seq({ k: 0 });
    return { z0, z1, z2: r.three.camera.right };
  });
  record(`${tag} ride close-in returns to the cam zoom`, z.z1 < z.z0 && Math.abs(z.z2 - z.z0) < 1e-6, JSON.stringify(z));
  record(`${tag} no console errors`, problems.length === 0, problems.slice(0, 3).join(" | "));
  await page.close();
}

try {
  for (const size of [{ width: 1200, height: 800 }, { width: 400, height: 800 }, { width: 400, height: 800, touch: true }, { width: 390, height: 844, touch: true, phone: true }]) {
    const only = process.env.QA_ONLY;
    const run = async (name, fn) => {
      try { await fn(size); } catch (e) {
        record(`${name}@${size.width}${size.touch ? "t" : ""} suite completes`, false, String(e.message || e).split("\n")[0]);
        for (const pg of await browser.pages()) await pg.close().catch(() => {});
      }
    };
    if (only === "chars") { if (size.width === 1200 || size.phone) await run("chars", charSuite); continue; }
    if (only === "click") { if (size.width === 1200 || size.touch) await run("click", clickSuite); continue; }
    if (only === "nav") { await run("nav", navSuite); continue; }
    if (only === "touch") { if (size.touch) { await run("touch", touchSuite); await run("rose", roseSuite); } continue; }
    if (only === "rose") { if (size.touch) await run("rose", roseSuite); continue; }
    if (only === "rotation") { if (size.width === 1200 || size.touch) await run("rotation", rotationSuite); continue; }
    if (only === "stick") { if (size.touch) await run("stick", stickSuite); continue; }
    if (size.phone) { await run("touch", touchSuite); await run("rose", roseSuite); await run("stick", stickSuite); await run("chars", charSuite); continue; }
    if (only === "cam") { await run("cam", camSuite); continue; }
    if (only === "landing") { if (size.width === 1200) await run("landing", landingSuite); continue; }
    for (const build of ["3d", "2d"]) await run(build, (s) => buildSuite(build, s));
    if (size.width === 1200 || size.touch) await run("rotation", rotationSuite);
    if (size.width === 1200 || size.touch) await run("click", clickSuite);
    if (!size.touch) { await run("compare", compareSuite); await run("start", startSuite); }
    if (size.width === 1200) { await run("landing", landingSuite); await run("chars", charSuite); }
    if (size.touch) { await run("touch", touchSuite); await run("rose", roseSuite); await run("stick", stickSuite); }
    await run("nav", navSuite);
    await run("cam", camSuite);
  }
} finally {
  await browser.close();
}
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length} pass, ${fail.length} fail`);
for (const f of fail) console.log("FAIL", f.name, f.detail);
process.exitCode = fail.length ? 1 : 0;
