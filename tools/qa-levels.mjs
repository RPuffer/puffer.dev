import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { screenOf, watchdog } from "./qa-lib.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const LEVELS = (process.argv[3] || JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order.join(",")).split(",");
const OUT = path.join(root, "out/qa");
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const EXPECTED = { "hooks-test": /missing\.glb|File not found/ };
const alive = watchdog();
const record = (name, ok, detail = "") => { alive(name); results.push({ name, ok, detail }); console.log(`${ok === "skip" ? "SKIP" : ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
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

async function keyStep(page, code) {
  const before = await cellOf(page);
  const expect = await page.evaluate(async (code) => {
    const { screenToWorldDir } = await import("/core/game.js");
    const { DIRS, canStep } = await import("/core/level.js");
    const map = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" };
    const S = window.__game.state, a = S.actor, d = screenToWorldDir(S.proj, map[code]);
    return canStep(S.level, a.cell[0], a.cell[1], d) ? [a.cell[0] + DIRS[d][0], a.cell[1] + DIRS[d][1]] : a.cell.slice();
  }, code);
  await page.keyboard.down(code); await wait(90);
  await page.waitForFunction((b) => { const a = window.__game.state.actor; return a.moving || a.cell.join() !== b.join(); }, { timeout: 1000, polling: 16 }, before).catch(() => {});
  await page.keyboard.up(code);
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

async function openGated(url) {
  const o = await open(url);
  if (!o.done) return o;
  const n = await o.page.evaluate(async () => {
    const { storageKey } = await import("/core/interact.js");
    const S = window.__game.state, gates = (S.things?.things || []).filter((t) => t.kind === "gate");
    localStorage.setItem(storageKey(S.level.name), JSON.stringify({ v: 1, respawn: null, things: Object.fromEntries(gates.map((g) => [g.id, { state: "open" }])) }));
    return gates.length;
  });
  await o.page.evaluate(() => { window.__done = false; });
  await o.page.reload({ waitUntil: "load" });
  try { await o.page.waitForFunction(() => window.__done === true, { timeout: 15000, polling: 100 }); } catch { o.done = false; }
  o.opened = o.done && await o.page.evaluate(() => (window.__game.state.things?.things || []).filter((t) => t.kind === "gate").every((t) => t.state === "open"));
  o.gates = n;
  return o;
}

async function liftToLift(name) {
  const o = await open(`${BASE}/3d/index.html?level=${name}&arrive=entry&reset=1`);
  if (!o.done) { await o.page.close(); return { ok: false, detail: "page did not load" }; }
  const page = o.page;
  const info = await page.evaluate(() => {
    const S = window.__game.state, things = S.things?.things || [];
    const lift = (role) => things.find((t) => t.kind === "elevator" && t.role === role);
    const a = lift("entry"), b = lift("exit"), fire = things.find((t) => t.kind === "bonfire");
    if (!a || !b) return null;
    return { from: [a.x, a.z], to: [b.x, b.z], fire: fire && [fire.x, fire.z], gates: things.filter((t) => t.kind === "gate").length, start: S.actor.cell.slice() };
  });
  if (!info) { await page.close(); return null; }
  const settle = async () => {
    await wait(250);
    await page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, { timeout: 30000, polling: 100 }).catch(() => {});
    await wait(1500);
    return page.evaluate(() => ({ cell: window.__game.state.actor.cell.slice(), th: (window.__game.state.things?.things || []).filter((t) => t.kind !== "elevator").map((t) => t.id + ":" + t.state).join(" ") }));
  };
  const click = (cell, thing) => page.evaluate(async ([cell, thing]) => {
    const { routeTo } = await import("/core/path.js");
    const S = window.__game.state, a = S.actor;
    if (thing) return S.things.tap(cell);
    const r = routeTo(S.level, a.path[0] || a.cell, cell);
    if (r) S.route.set(r.cells, cell, r.reached);
    return !!r;
  }, [cell, thing]);
  const trail = [];
  let ok = info.start.join() === info.from.join(), now = { cell: info.start, th: "" };
  if (!ok) trail.push(`arrived at ${info.start} not entry lift`);
  if (ok && info.fire) { await click(info.fire, true); now = await settle(); trail.push(`bonfire -> ${now.cell} [${now.th}]`); }
  const padToward = () => page.evaluate(async (to) => {
    const { nextPad, findPath, gateToward } = await import("/core/path.js");
    const S = window.__game.state;
    if (findPath(S.level, S.actor.cell, to)) return null;
    const pad = nextPad(S.level, S.actor.cell, to);
    if (!pad) return null;
    if (findPath(S.level, S.actor.cell, pad)) return { pad };
    const g = gateToward(S.level, S.actor.cell, pad);
    return g ? { walk: g.cells[g.cells.length - 1] } : null;
  }, info.to);
  for (let i = 0, hops = 0; ok && i < 14 && now.cell.join() !== info.to.join(); i++) {
    const step = await padToward();
    if (step?.walk && hops < 8) {
      hops++;
      await click(step.walk, false);
      now = await settle();
      trail.push(`gate ${step.walk} -> ${now.cell}`);
      continue;
    }
    const pad = step?.pad;
    if (pad && hops < 8) {
      hops++;
      await click(pad, true);
      now = await settle();
      if (now.cell.join() === pad.join()) { await click(pad, true); now = await settle(); }
      trail.push(`pad ${pad} -> ${now.cell}`);
      if (now.cell.join() !== pad.join()) continue;
    }
    if (!(await click(info.to, false))) { trail.push("no route"); break; }
    now = await settle();
    trail.push(`click exit -> ${now.cell} [${now.th}]`);
  }
  ok = ok && now.cell.join() === info.to.join();
  await forgetThings(page);
  await page.close();
  return { ok, gates: info.gates, detail: `${info.from} -> ${info.to} by click: ${trail.join("; ")}` };
}

async function gateSeal(page) {
  return page.evaluate(async () => {
    const { findPath, reachable } = await import("/core/path.js");
    const { edgeKey } = await import("/core/interact.js");
    const S = window.__game.state, things = S.things?.things || [];
    const entry = things.find((t) => t.kind === "elevator" && t.role === "entry");
    const shut = things.filter((t) => (t.kind === "gate" || t.kind === "door") && t.edge);
    const gates = shut.filter((t) => t.kind === "gate" && !/^lever:/.test(String(t.open || "")));
    if (!entry || !gates.length) return null;
    const blocked = new Set(S.level.blocked);
    for (const g of gates) if (g.hold) for (const [x, z] of g.blocks || []) blocked.add(x + "," + z);
    const L = { ...S.level, blocked, links: new Map([...(S.level.links || [])].filter(([, id]) => things.find((t) => t.id === id)?.mode === "drop")), edges: new Set(shut.map((g) => edgeKey(g.edge[0], g.edge[1]))) };
    const from = [entry.x, entry.z], seen = new Set(reachable(L, from).map((c) => c.join()));
    const out = [];
    const { CATALOG } = await import("/core/catalog.js");
    const raw = await fetch(`/levels/${S.level.name}.json`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    const posts = raw ? [] : ["level file did not load"];
    for (const g of gates) {
      const around = findPath(L, g.edge[0], g.edge[1]);
      if (around) out.push(`${g.id} threshold ${g.edge[0]} reaches far side ${g.edge[1]} around the shut edge via ${around.map((c) => c.join(",")).join(" ")}`);
      for (const [x, z] of [[g.edge[1][0] - 1, g.edge[1][1]], [g.edge[1][0] + 1, g.edge[1][1]], [g.edge[1][0], g.edge[1][1] - 1], [g.edge[1][0], g.edge[1][1] + 1]]) {
        const unk = (raw?.decor || []).filter((d) => d.x === x && d.z === z && !CATALOG[d.t]);
        if (unk.length) out.push(`${g.id} post ${unk[0].t}@${x},${z} not in the catalog, so it does not block`);
      }
      if (!seen.has(g.edge[1].join())) continue;
      const p = findPath(L, from, g.edge[1]) || [];
      out.push(`${g.id} far side ${g.edge[1]} reached around edge ${g.edge[0]}|${g.edge[1]} via ${p.slice(-4).map((c) => c.join(",")).join(" ")}`);
    }
    return { n: gates.length, out: [...posts, ...out], reach: seen.size, from };
  });
}

async function forgetThings(page) {
  await page.evaluate(async () => { const { storageKey } = await import("/core/interact.js"); localStorage.removeItem(storageKey(window.__game.state.level.name)); }).catch(() => {});
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
    const climb = () => {
      for (const c of reachable(L, spawn).sort((a, b) => hOf(b) - hOf(a))) {
        if (hOf(c) <= hOf(spawn)) break;
        const p = findPath(L, spawn, c);
        if (p && p.some((q) => L.cells[q[1]][q[0]].s === "ramp")) return [c, p];
      }
      return [null, null];
    };
    let [plateau, route] = climb(), viaGate = false;
    if (!plateau) {
      const shut = [];
      for (const t of S.things?.things || []) if (t.kind === "gate" && t.state !== "open") for (const [x, z] of t.blocks) if (L.blocked.delete(x + "," + z)) shut.push(x + "," + z);
      const edges = L.edges;
      if (edges?.size) { L.edges = new Set(); shut.push("edges"); }
      if (shut.length) { [plateau, route] = climb(); viaGate = !!plateau; }
      for (const k of shut) if (k !== "edges") L.blocked.add(k);
      if (edges) L.edges = edges;
    }
    const keyFor = {};
    for (const [code, sd] of [["KeyW", "up"], ["KeyD", "right"], ["KeyS", "down"], ["KeyA", "left"]]) keyFor[screenToWorldDir(S.proj, sd)] = code;
    const keys = route ? route.slice(1).map((q, i) => {
      const d = [q[0] - route[i][0], q[1] - route[i][1]];
      const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === d[0] && DIRS[k][1] === d[1]);
      return keyFor[dir];
    }) : [];
    const seen = new Set(reach.map((c) => c.join(",")));
    const RING1 = [[-1, -1, 3], [-1, 0, 2], [0, -1, 2]];
    const RING2 = [[-2, -2, 2.5], [-2, -1, 2], [-1, -2, 2], [-2, 0, 1.5], [0, -2, 1.5]];
    const probe = (offsets, wide) => {
      let best = null;
      for (const d of L.decor) {
        const spec = CATALOG[d.t];
        if (!spec || spec.passable) continue;
        const foot = footprintCells(d.t, d.x, d.z, d.rot || 0);
        if ((spec.height || 1) < 1.5 && !(wide && (foot.length > 1 || d.watch))) continue;
        for (const [fx, fz] of foot) {
          for (const [ox, oz, w] of offsets) {
            const c = [fx + ox, fz + oz];
            if (!seen.has(c.join(",")) || !isWalkable(L, c[0], c[1])) continue;
            const score = w + (/trunk/.test(d.t) ? 2 : 0) + (spec.height || 1) / 2 - (hOf(c) < L.cells[fz][fx].h ? 1 : 0);
            if (!best || score > best.score) best = { cell: c, type: d.t, at: [fx, fz], score, wide };
          }
        }
      }
      return best;
    };
    const behind = probe(RING1, false) || probe([...RING1, ...RING2], true);
    const tall = L.decor.filter((d) => { const sp = CATALOG[d.t]; return sp && !sp.passable && ((sp.height || 1) >= 1.5 || footprintCells(d.t, 0, 0, 0).length > 1 || d.watch); }).map((d) => `${d.t}@${d.x},${d.z}`);
    return { spawnFile: spawn, spawnLive: S.actor.cell.slice(), spawnH: hOf(spawn), plateau, plateauH: plateau && hOf(plateau), route, keys, viaGate, behind, reach: reach.length, tall };
  }, file);
}

const clean = (name, problems) => problems.filter((p) => !(EXPECTED[name] && EXPECTED[name].test(p)));

async function levelSuite(name) {
  const file = JSON.parse(fs.readFileSync(path.join(root, "levels", name + ".json"), "utf8"));
  const tag = `lvl-${name}`;
  const { page, problems, done, ms } = await open(`${BASE}/3d/index.html?level=${name}&reset=1`);
  record(`${tag} __done within 15 s`, done, `${ms} ms`);
  if (!done) { record(`${tag} no console errors or failed requests`, false, problems.slice(0, 3).join(" | ")); await page.close(); return; }
  await idle(page); await wait(400);
  const P = await plan(page, file);
  record(`${tag} spawns at level file spawn`, P.spawnLive.join() === P.spawnFile.join(), `${P.spawnLive} vs ${P.spawnFile}`);
  const landings = await page.evaluate(() => {
    const L = window.__game.state.level, D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }, out = [];
    let n = 0;
    L.cells.forEach((row, z) => row.forEach((c, x) => {
      if (c.s !== "ramp" || !D[c.d]) return;
      n++;
      const [dx, dz] = D[c.d];
      for (const [end, a, b] of [["top", x - dx, z - dz], ["bottom", x + dx, z + dz]]) if (L.blocked.has(a + "," + b)) out.push(`${x},${z} ${end} ${a},${b}`);
    }));
    return { n, out };
  });
  record(`${tag} ramp landings unblocked`, landings.out.length === 0, landings.out.length ? landings.out.slice(0, 4).join(" | ") : `${landings.n} ramps`);
  const seal = await gateSeal(page);
  if (seal) record(`${tag} closed gates sealed from the arrival lift`, seal.out.length === 0, seal.out.length ? seal.out.join(" | ") : `${seal.n} gate(s), ${seal.reach} cells reachable from entry ${seal.from}`);
  for (const code of ["KeyW", "KeyD", "KeyS", "KeyA"]) {
    const r = await keyStep(page, code);
    record(`${tag} ${code} steps as canStep predicts`, r.after.join() === r.expect.join(), `${r.before} -> ${r.after} (expect ${r.expect})`);
  }
  const cands = await page.evaluate(async () => {
    const { reachable } = await import("/core/path.js");
    const a = window.__game.state.actor;
    const r = reachable(window.__game.state.level, a.cell).filter((c) => { const d = Math.abs(c[0] - a.cell[0]) + Math.abs(c[1] - a.cell[1]); return d >= 2 && d <= 4; });
    const m = Math.floor(r.length / 2);
    return [...r.slice(m), ...r.slice(0, m)];
  });
  let target = cands[0] || null, p = null;
  for (const c of cands) { p = await screenOf(page, c); if (p) { target = c; break; } }
  if (!target) record(`${tag} tap target found`, false);
  else {
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

  const lifts = await liftToLift(name);
  if (lifts) record(`${tag} lift to lift by click from fresh arrival${lifts.gates ? " (gates opened by their conditions)" : ""}`, lifts.ok, lifts.detail);

  if (!P.plateau) record(`${tag} ramp climb`, name === "hooks-test", "no ramp route to a higher cell, gates closed or open" + (name === "hooks-test" ? " (flat test level)" : ""));
  else {
    const url = `${BASE}/3d/index.html?level=${name}`;
    const c = P.viaGate ? await openGated(url) : await open(url);
    const via = P.viaGate ? " (via gate)" : "";
    if (!c.done) record(`${tag} ramp climb page loads${via}`, false);
    else if (P.viaGate && !c.opened) record(`${tag} ramp climb${via}`, false, `stored open state did not open ${c.gates} gate(s)`);
    else {
      await idle(c.page); await wait(1500);
      const Q = P.viaGate ? await plan(c.page, file) : P;
      if (!Q.plateau) record(`${tag} ramp climb${via}`, false, "no ramp route with the gates open in play");
      else {
        const trail = [];
        for (const k of Q.keys) { const r = await keyStep(c.page, k); trail.push(`${k}:${r.after}`); }
        const got = await cellOf(c.page);
        record(`${tag} ramp climb ${Q.spawnFile} (h${Q.spawnH}) -> ${Q.plateau} (h${Q.plateauH})${via}`, got.join() === Q.plateau.join(), `${trail.join(" ")}`);
      }
      record(`${tag} ramp climb page clean`, clean(name, c.problems).length === 0, clean(name, c.problems).slice(0, 3).join(" | "));
    }
    if (P.viaGate) await forgetThings(c.page);
    await c.page.close();
  }

  if (!P.behind) record(`${tag} see-through window`, "skip", `no walkable cell within two rings behind a tall, multi-cell, or figure piece in ${P.reach} cells reachable with gates closed (pieces: ${P.tall.join(" ") || "none"})`);
  else {
    const x = await open(`${BASE}/3d/index.html?level=${name}&spawn=${P.behind.cell.join(",")}&occlude=circle`);
    if (!x.done) record(`${tag} x-ray page loads`, false);
    else {
      const n = await xrayDiff(x.page, tag);
      record(`${tag} see-through window reveals hero at ${P.behind.cell} behind ${P.behind.type} ${P.behind.at}${P.behind.wide ? " (outer ring)" : ""}`, n > 40, `${n} px differ window on/off`);
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

const SHAFT_SIZES = [[900, 800], [400, 800], [1600, 900]];

async function shaftSuite(name) {
  const tag = `lvl-${name}`;
  const file = JSON.parse(fs.readFileSync(path.join(root, "levels", name + ".json"), "utf8"));
  const lifts = (file.things || []).filter((t) => t.kind === "elevator");
  if (!lifts.length) { record(`${tag} shaft tops off frame`, "skip", "no elevators"); return; }
  for (const arrive of ["entry", "exit"]) for (const [width, height] of SHAFT_SIZES) {
    const label = `${tag} shaft tops off frame at ${width}x${height} arrive=${arrive}`;
    const o = await open(`${BASE}/3d/index.html?level=${name}&arrive=${arrive}`, { width, height });
    if (!o.done) { record(label, false, "page did not load"); await o.page.close(); continue; }
    await idle(o.page); await wait(300);
    const tops = await o.page.evaluate(async () => {
      const THREE = await import("three");
      const g = window.__game;
      g.stop();
      const S = g.state, cam = g.renderer.three.camera;
      g.renderer.update(S, 0); g.renderer.render(S, 0);
      const out = [], decks = {};
      g.renderer.three.scene.getObjectByName("things")?.traverse((m) => { if (m.userData?.thing && !m.userData.shaft) decks[m.userData.thing] = m.position.y; });
      g.renderer.three.scene.getObjectByName("things")?.traverse((m) => {
        if (!m.userData?.shaft) return;
        m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox;
        let y = Infinity, seen = false;
        for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
          y = Math.min(y, new THREE.Vector3(x, b.max.y, z).applyMatrix4(m.matrixWorld).project(cam).y);
          const foot = new THREE.Vector3(x, b.min.y, z).applyMatrix4(m.matrixWorld).project(cam);
          if (Math.abs(foot.x) <= 1 && Math.abs(foot.y) <= 1) seen = true;
        }
        out.push({ id: m.userData.thing, ndcY: +y.toFixed(3), beam: m.userData.beam || null, seen, gap: +Math.abs(b.max.y + m.position.y - decks[m.userData.thing]).toFixed(3) });
      });
      return out;
    });
    record(label, tops.length === lifts.length && tops.every((t) => (t.beam === "arrival" ? (t.ndcY < 1 || !t.seen) && t.gap < 0.01 : t.ndcY > 1)), tops.map((t) => `${t.id}${t.beam === "arrival" ? ` (arrival, top ${t.gap} off its tile${t.seen ? "" : ", lift off screen"})` : ""} ndc y ${t.ndcY}`).join(" ") || "no shaft meshes");
    await o.page.close();
  }
}

try {
  for (const name of LEVELS) { await levelSuite(name); await shaftSuite(name); }
} finally {
  await browser.close();
}
const fail = results.filter((r) => !r.ok), skip = results.filter((r) => r.ok === "skip");
console.log(`\n${results.length - fail.length - skip.length} pass, ${fail.length} fail, ${skip.length} skip`);
for (const s of skip) console.log("SKIP", s.name, s.detail);
for (const f of fail) console.log("FAIL", f.name, f.detail);
process.exitCode = fail.length ? 1 : 0;
