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
  const has = await page.$(".iw-ui a");
  record(`${tag} ui overlay mounted`, !!has);
  if (!has) return;
  const href = await page.$eval(".iw-ui a", (a) => a.href);
  record(`${tag} overlay links to the start page`, /\/index\.html$/.test(href) && !/\/(3d|2d)\//.test(href), href);
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".iw-ui a")]);
  const begin = await page.$("#begin");
  record(`${tag} islands link opens the start page`, !!begin, page.url());
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

  const x = await open(`${BASE}/${build}/index.html?level=home&spawn=0,1&reset=1`, size);
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
  const btn = await page.$('.iw-ui [data-rotate="1"]');
  record(`${tag} rotate buttons in the overlay`, !!btn && !!(await page.$('.iw-ui [data-rotate="-1"]')));
  if (btn) {
    if (size.touch) { const b = await btn.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await btn.click();
    await wait(60); await turning(page);
    const y = await yawOf(page);
    record(`${tag} rotate button turns right`, y === (yNow + 90) % 360, `${yNow} -> ${y}`);
  }
  await settle(page, 600);
  const wt = await walkableTarget(page);
  const got = wt && await tap(page, wt);
  record(`${tag} tap-to-walk at yaw ${await yawOf(page)}`, !!got && got.join() === wt.join(), `target ${wt} got ${got}`);
  if (size.touch) {
    await settle(page, 400);
    const pad = await page.$('.iso-dpad [data-d="up"]');
    record(`${tag} d-pad shown`, !!pad);
    if (pad) {
      const b = await pad.boundingBox();
      let r = await screenUp(page, async () => { await page.touchscreen.touchStart(b.x + b.width / 2, b.y + b.height / 2); await wait(120); await page.touchscreen.touchEnd(); });
      record(`${tag} d-pad up moves up on screen at yaw ${await yawOf(page)}`, r.moved ? r.up : true, `${r.before} -> ${r.after} screen d(${r.dx},${r.dy})`);
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
      const c = r.pick(x, y, w, h);
      if (!c) continue;
      const k = c.join(","), e = m[k] || (m[k] = [0, 0, 0]);
      e[0] += x; e[1] += y; e[2]++;
    }
    for (const k in m) { const e = m[k]; m[k] = [e[0] / e[2], e[1] / e[2], e[2]]; }
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
    const { page, problems, done } = await open(`${BASE}/3d/index.html?level=home&reset=1&yaw=${yaw}`, size);
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

try {
  for (const size of [{ width: 1200, height: 800 }, { width: 400, height: 800 }, { width: 400, height: 800, touch: true }]) {
    const only = process.env.QA_ONLY;
    if (only === "click") { if (size.width === 1200 || size.touch) await clickSuite(size); continue; }
    for (const build of ["3d", "2d"]) await buildSuite(build, size);
    if (size.width === 1200 || size.touch) await rotationSuite(size);
    if (size.width === 1200 || size.touch) await clickSuite(size);
    if (!size.touch) { await compareSuite(size); await startSuite(size); }
  }
} finally {
  await browser.close();
}
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length} pass, ${fail.length} fail`);
for (const f of fail) console.log("FAIL", f.name, f.detail);
process.exitCode = fail.length ? 1 : 0;
