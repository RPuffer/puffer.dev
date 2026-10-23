import puppeteer from "puppeteer-core";
import { watchdog } from "./qa-lib.mjs";
import path from "node:path";
import fs from "node:fs";
import { registerCatalog, CATALOG, maskCells } from "../core/catalog.js";
import { prepareLevel, isWalkable, isVoid, canStep, DIRS, edgeFall, cellAt } from "../core/level.js";
import { createActor } from "../core/actor.js";
import { createHealth } from "../core/health.js";
import { createLife, FALL_VARIANTS } from "../core/life.js";
import { createTraps } from "../core/traps/index.js";
import { checkLevel } from "../core/procgen.js";
import { checkRoute, world, distances } from "../core/layout/check.js";
import { fenceStats, isFence, FENCE } from "../core/layout/fences.js";
import { routeTo } from "../core/path.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
const SHOW = "traps-showcase";
const RUN = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const results = [];
const alive = watchdog();
const record = (name, ok, detail = "") => { alive(name); results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " " + detail : ""}`); };
const readLevel = (n) => JSON.parse(fs.readFileSync(path.join(root, "levels", `${n}.json`), "utf8"));
const key = (x, z) => x + "," + z;
const quiet = (raw) => { const w = console.warn; console.warn = () => {}; try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = w; } };
const registered = new Set();
const register = async (L) => {
  for (const p of [...new Set([...(L.pieces || []), "pieces/kits.js"])]) {
    if (registered.has(p)) continue;
    registered.add(p);
    const mod = await import(path.join(root, "3d", p));
    if (mod.register) registerCatalog((await mod.register({ palette: L.palette || {} })).catalog || {});
  }
};

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const strip = (w) => w.split("\n").map((r) => r.split("").map((ch) => (ch === "." ? { h: 0, s: "none" } : ch === "#" ? { h: 1, s: "stone", p: 1 } : { h: 1, s: "grass" })));
const mini = (rows, extra = {}) => { const cells = strip(rows.join("\n")); return quiet({ name: "mini", size: [cells[0].length, cells.length], cells, decor: [], spawn: [1, 1], things: [], trapRules: "showcase", ...extra }); };
const sim = (L, cell, o = {}) => {
  const actor = createActor(L, cell);
  const health = createHealth({ storage: mem() });
  const life = createLife({ level: L, actor, health, variant: o.variant || null });
  const traps = L.traps?.length ? createTraps(L, { actor, life, health, storage: mem() }) : null;
  const ev = [];
  life.on((e) => ev.push(e));
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { actor.update(1 / 60); traps?.update(1 / 60); life.update(1 / 60); } };
  const press = (dir) => { actor.presses++; actor.tapDir = dir; };
  return { actor, health, life, traps, ev, tick, press };
};

{
  const L = mini(["......", ".ggg..", ".ggg..", "......"]);
  record("void covers the cloud bed and the grid border", isVoid(L, 0, 0) && isVoid(L, -1, 2) && !isVoid(L, 2, 2));
  record("an island edge cell can fall, an inland step cannot", edgeFall(L, 1, 1, "n") && edgeFall(L, 3, 2, "e") && !edgeFall(L, 2, 1, "s"));
  const pond = strip(".....\n.ggg.\n.g.g.\n.ggg.\n.....");
  pond[2][2] = { h: 0, s: "water" };
  const P = quiet({ name: "pond", size: [5, 5], cells: pond, decor: [], spawn: [1, 1], things: [] });
  record("an inland pond is not a fall", !isVoid(P, 2, 2) && !edgeFall(P, 1, 2, "e"));
  const tier = strip("....\n.gg.\n....");
  tier[1][2] = { h: 2, s: "grass" };
  const T = quiet({ name: "tier", size: [4, 3], cells: tier, decor: [], spawn: [1, 1], things: [] });
  record("a ledge onto a lower walkable tier stays blocked, not a fall", !canStep(T, 2, 1, "w") && !edgeFall(T, 2, 1, "w"));
}

{
  const L = mini(["......", ".ggg..", ".ggg..", "......"]);
  const s = sim(L, [1, 1]);
  s.press("n"); s.tick(2);
  record("the first press toward the void falls at once", s.life.busy === "fall" && s.ev.some((e) => e.type === "fall" && !e.forced && e.cause === "edge") && s.actor.cell.join() === "1,1");
  for (let i = 0; i < 300 && s.life.busy; i++) s.tick();
  record("a fall costs no heart and respawns with a pratfall", s.health.hearts === 3 && s.ev.some((e) => e.type === "respawn" && e.after === "fall") && s.actor.pratfall > 0 && !s.actor.locked);
  const h = sim(L, [2, 2]);
  h.press("e"); h.actor.held = "e"; h.tick(60);
  record("holding a key along a run carries you off its end", h.life.busy === "fall" && h.ev.some((e) => e.type === "fall" && !e.forced && e.cause === "hold"));
  const t = sim(L, [2, 1]);
  t.actor.held = "n"; t.actor.turnedPress = t.actor.presses; t.tick(30);
  record("a key held through a camera turn never walks you off an edge", !t.life.busy && t.actor.cell.join() === "2,1");
  t.press("n"); t.tick(2);
  record("a fresh press after the turn falls as usual", t.life.busy === "fall");
  const seen = new Set();
  for (let i = 0; i < 40; i++) { const r = sim(L, [1, 1], { variant: null }); r.press("w"); r.tick(1); r.press("w"); r.tick(1); seen.add(r.life.busy && r.ev.find((x) => x.type === "fall")?.variant); }
  record("falls pick from the funny variants at random", FALL_VARIANTS.every((v) => seen.has(v)), [...seen].join(","));
}

{
  const P = mini([".......", ".gg##..", "......."], { traps: [{ id: "spring", kind: "t18", cells: [[3, 1]] }] });
  const s = sim(P, [4, 1]);
  s.actor.setPath([[3, 1]]);
  for (let i = 0; i < 90 && !s.life.busy; i++) s.tick();
  record("a spring fling that lands over the void falls", s.life.busy === "fall" && s.ev.some((e) => e.type === "fall" && e.forced && e.cause === "t18"), JSON.stringify(s.ev.map((e) => e.type)));
  const I = mini(["........", ".gggg...", "........"], { traps: [{ id: "ice", kind: "t52", cells: [[2, 1], [3, 1], [4, 1]] }] });
  const k = sim(I, [1, 1]);
  k.press("e");
  for (let i = 0; i < 120 && !k.life.busy; i++) k.tick();
  record("ice carries a single press off the edge", k.life.busy === "fall" && k.ev.some((e) => e.type === "fall" && e.forced && e.cause === "slide"));
  const R = mini(["........", ".ggggg..", "........"], { decor: [{ t: "rock", x: 5, z: 1 }], traps: [{ id: "ice", kind: "t52", cells: [[2, 1], [3, 1], [4, 1]] }] });
  const r = sim(R, [1, 1]);
  r.press("e"); r.tick(120);
  record("ice slides until something solid stops it", !r.life.busy && r.actor.cell.join() === "4,1");
  const path = routeTo(R, [1, 1], [4, 1]);
  record("tap-walk never routes across ice", !path?.reached && !(path?.cells || []).some(([x, z]) => R.slick?.has(key(x, z))), JSON.stringify(path?.cells));
}

const fenced = [];
for (const name of [SHOW, ...RUN]) {
  const raw = readLevel(name);
  await register(raw);
  const st = fenceStats(raw);
  if (!st.runs) continue;
  fenced.push(name);
  record(`${name} fences stay a small share of edge cells`, st.share <= FENCE.share * 1.5, `${(st.share * 100).toFixed(1)}% of ${st.edges} (${st.cells} cells, ${st.runs} runs)`);
  const lv = checkLevel(raw).filter((p) => !/grass share|plateau in/.test(p));
  record(`${name} passes checkLevel with fences`, !lv.length, lv.slice(0, 2).join("; "));
  if (raw.route?.segments?.length && name !== SHOW) {
    const cr = checkRoute(raw);
    record(`${name} passes checkRoute with fences`, !cr.length, cr.slice(0, 2).join("; "));
  }
  const P = quiet(raw), bare = quiet({ ...raw, decor: raw.decor.filter((d) => !isFence(d.t)) });
  const ids = new Set(P.things.map((t) => t.id));
  const start = P.things.find((t) => t.kind === "elevator" && t.role === "entry") || { x: P.spawn[0], z: P.spawn[1] };
  const reach = distances(world(P, ids), [start.x, start.z]), was = distances(world(bare, ids), [start.x, start.z]);
  const fenceCells = new Set(raw.decor.filter((d) => isFence(d.t)).flatMap((d) => maskCells(d.t, d.x, d.z, d.rot || 0).map((m) => key(m.x, m.z))));
  const lost = [...was.keys()].filter((k) => !reach.has(k) && !fenceCells.has(k));
  record(`${name} fences cut no reachable cell`, !lost.length, lost.slice(0, 4).join(" "));
  const rewards = [...P.things.filter((t) => ["chest", "bonfire", "elevator", "lever", "pad"].includes(t.kind)).map((t) => [t.x, t.z, t.kind]), ...(raw.charges || []).map((c) => [c.x, c.z, "charge"])];
  const near = (x, z) => [[0, 0], ...Object.values(DIRS)].some(([dx, dz]) => reach.has(key(x + dx, z + dz)));
  const miss = rewards.filter(([x, z]) => !near(x, z));
  record(`${name} every chest, bonfire, lift, pad and pickup stays reachable`, !miss.length, miss.map((m) => m.join(",")).join(" "));
  const onReward = rewards.filter(([x, z]) => fenceCells.has(key(x, z)));
  record(`${name} no fence sits on a reward or lift cell`, !onReward.length);
  const mats = new Set(raw.decor.filter((d) => isFence(d.t)).map((d) => CATALOG[d.t]?.rail));
  record(`${name} fences use one themed material`, mats.size === 1 && ![...mats].includes("picket"), [...mats].join(","));
}
record("fences prove out on the showcase and two run islands or more", fenced.includes(SHOW) && fenced.length >= 3, fenced.join(","));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-falls"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(query, { width = 1000, height = 800 } = {}) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/3d/index.html?${query}`, { waitUntil: "load" });
  const done = await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 }).then(() => true, () => false);
  await page.evaluate(async () => {
    const g = window.__game, S = () => g.state;
    g.pause();
    const ev = (window.__ev = []);
    S().life?.on((e) => ev.push({ type: e.type, forced: e.forced, cause: e.cause, variant: e.variant, cell: e.cell, after: e.after }));
    const tick = (n = 1, draw = false) => { const r = g.renderer.render; if (!draw) g.renderer.render = () => {}; try { for (let i = 0; i < n; i++) g.advance(1 / 60); } finally { g.renderer.render = r; } };
    const { screenToWorldDir } = await import("/core/game.js");
    window.__qf = {
      tick,
      S,
      place(c) {
        const a = S().actor;
        a.path = []; a.held = null; a.tapDir = null; a.moving = false; a.locked = false; a.fx = null; a.slide = null;
        a.cell = [c[0], c[1]]; a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5;
        tick(2);
      },
      keyFor(dir) { for (const [k, s] of [["ArrowUp", "up"], ["ArrowDown", "down"], ["ArrowLeft", "left"], ["ArrowRight", "right"]]) if (screenToWorldDir(S().proj, s) === dir) return k; return null; },
      state: () => { const a = S().actor; return { cell: a.cell.slice(), busy: S().life.busy, hearts: S().health.hearts, fx: a.fx && { kind: a.fx.kind, variant: a.fx.variant }, pratfall: a.pratfall, slide: a.slide }; },
      events: () => ev.slice(),
      clear: () => { ev.length = 0; },
    };
  });
  return { page, problems, done };
}
const q = (page, f, ...a) => page.evaluate(f, ...a);

{
  const { page, problems, done } = await open(`level=${SHOW}&reset=1`);
  record("showcase loads with ice and fences", done && !problems.length, problems.join(" | "));
  const edge = await q(page, () => {
    const S = __qf.S(), L = S.level;
    for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
      if (!S.actor || L.cells[z][x].s !== "sand") continue;
      for (const d of ["n", "e", "s", "w"]) if (S.actor.edgeAt && (() => { const a = S.actor, c = a.cell; a.cell = [x, z]; const r = a.edgeAt(d); a.cell = c; return r; })()) return { cell: [x, z], dir: d };
    }
    return null;
  });
  record("showcase hub has an open edge", !!edge, JSON.stringify(edge));
  const k = await q(page, (d) => __qf.keyFor(d), edge.dir);
  await q(page, (c) => { __qf.place(c); __qf.clear(); }, edge.cell);
  await page.keyboard.press(k);
  await q(page, () => __qf.tick(3));
  let s = await q(page, () => __qf.state());
  record("one real key press toward the edge falls at once", s.busy === "fall" && s.fx?.kind === "fall" && s.cell.join() === edge.cell.join(), JSON.stringify(s));
  await q(page, () => __qf.tick(150, false));
  const r = await q(page, () => ({ st: __qf.state(), rest: __qf.S().life.respawnCell(), ev: __qf.events() }));
  record("the fall respawns at the bonfire rest cell", r.ev.some((e) => e.type === "respawn") && r.st.cell.join() === r.rest.join(), JSON.stringify(r.st.cell) + " vs " + JSON.stringify(r.rest));
  record("respawn after a fall keeps 3 hearts", r.st.hearts === 3);

  await q(page, () => { __qf.place([16, 13]); __qf.clear(); });
  const uk = await q(page, () => __qf.keyFor("n"));
  await page.keyboard.down(uk);
  const turned = await q(page, () => { const g = window.__game, a = g.state.actor, before = a.presses; g.rotate(1); __qf.tick(40); return { marked: a.turnedPress === a.presses, before, after: a.presses, held: typeof a.held }; });
  await page.keyboard.up(uk);
  await q(page, () => { window.__game.rotate(-1); __qf.tick(40); });
  record("a camera turn marks the held key so it cannot walk you off an edge", turned.marked, JSON.stringify(turned));
  await q(page, () => { __qf.place([15, 17]); __qf.clear(); });
  const sk = await q(page, () => __qf.keyFor("s"));
  await page.keyboard.press(sk);
  const slide = await q(page, () => { for (let i = 0; i < 120 && !__qf.S().life.busy; i++) __qf.tick(1); return { st: __qf.state(), ev: __qf.events() }; });
  record("showcase ice slides the hero off the edge", slide.st.busy === "fall" && slide.ev.some((e) => e.type === "fall" && e.forced && e.cause === "slide"), JSON.stringify(slide.st));
  await q(page, () => __qf.tick(150));
  await q(page, () => { __qf.place([16, 18]); __qf.clear(); });
  await page.keyboard.press(sk);
  await q(page, () => __qf.tick(90));
  s = await q(page, () => __qf.state());
  record("showcase ice stops against the rock", !s.busy && s.cell.join() === "16,20", JSON.stringify(s));
  const wk = await q(page, () => __qf.keyFor("w"));
  await page.keyboard.press(wk);
  await q(page, () => __qf.tick(90));
  s = await q(page, () => __qf.state());
  record("showcase ice then carries a sideways press off the far edge", s.busy === "fall" || s.fx?.kind === "fall" || (await q(page, () => __qf.events())).some((e) => e.type === "fall" && e.cause === "slide"), JSON.stringify(s));
  await q(page, () => __qf.tick(150));

  const fence = await q(page, () => {
    const S = __qf.S(), L = S.level;
    for (const d of L.decor) {
      if (!/^rail-/.test(d.t)) continue;
      const cells = [];
      const n = Number(d.t.split("-").pop());
      for (let i = 0; i < n; i++) cells.push(d.rot % 2 ? [d.x, d.z + i] : [d.x + i, d.z]);
      for (const [x, z] of cells) for (const [dir, [dx, dz]] of Object.entries({ n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] })) {
        const from = [x - dx, z - dz];
        if (L.cells[from[1]]?.[from[0]]?.s && L.cells[from[1]][from[0]].h === L.cells[z][x].h && !L.blocked.has(from.join(",")) && L.cells[from[1]][from[0]].s !== "none") return { from, to: [x, z], dir };
      }
    }
    return null;
  });
  record("showcase has a fence you can walk up to", !!fence, JSON.stringify(fence));
  if (fence) {
    await q(page, (c) => { __qf.place(c); __qf.clear(); }, fence.from);
    const fk = await q(page, (d) => __qf.keyFor(d), fence.dir);
    await page.keyboard.press(fk); await q(page, () => __qf.tick(20));
    await page.keyboard.press(fk); await q(page, () => __qf.tick(20));
    s = await q(page, () => __qf.state());
    record("a fence blocks movement and never drops you", s.cell.join() === fence.from.join() && !s.busy, JSON.stringify(s));
  }

  const tap = await q(page, async () => {
    const { routeTo } = await import("/core/path.js");
    const { canStep, isVoid } = await import("/core/level.js");
    const S = __qf.S(), L = S.level, bad = [];
    let n = 0;
    for (let z = -1; z <= L.size[1]; z += 2) for (let x = -1; x <= L.size[0]; x += 2) {
      const r = routeTo(L, S.actor.cell, [x, z], { cost: S.powers.avoid });
      if (!r) continue;
      n++;
      for (let i = 1; i < r.cells.length; i++) {
        const a = r.cells[i - 1], b = r.cells[i];
        const dir = b[0] > a[0] ? "e" : b[0] < a[0] ? "w" : b[1] > a[1] ? "s" : "n";
        if (isVoid(L, b[0], b[1]) || L.slick?.has(b.join(",")) || (!canStep(L, a[0], a[1], dir) && !L.links?.has(a.join(",") + ">" + b.join(",")))) { bad.push(`${a}>${b}`); break; }
      }
    }
    return { n, bad };
  });
  record("tap-walk routes to every target without leaving the island or crossing ice", tap.n > 50 && !tap.bad.length, `${tap.n} routes ${tap.bad.slice(0, 3).join(" ")}`);
  await page.close();
}

for (const v of FALL_VARIANTS) {
  const { page, problems } = await open(`level=${SHOW}&reset=1&fall=${v}`);
  await q(page, () => { __qf.place([15, 17]); __qf.clear(); });
  const sk = await q(page, () => __qf.keyFor("s"));
  await page.keyboard.press(sk);
  const r = await q(page, () => { const seen = []; for (let i = 0; i < 240; i++) { __qf.tick(1, i % 6 === 0); const s = __qf.state(); if (s.fx) seen.push(s.fx.variant); } return { seen: [...new Set(seen)], ev: __qf.events() }; });
  record(`fall variant ${v} plays and renders, then respawns`, !problems.length && r.seen.includes(v) && r.ev.some((e) => e.type === "respawn" && e.after === "fall"), `${r.seen.join(",")} ${problems.join(" | ")}`);
  await page.close();
}

for (const name of fenced.filter((n) => n !== SHOW).slice(0, 2)) {
  const { page, problems, done } = await open(`level=${name}&reset=1&traps=0&seq=0`);
  const r = await q(page, async () => {
    const { routeTo } = await import("/core/path.js");
    const S = __qf.S(), L = S.level, start = S.actor.cell.slice();
    const targets = [];
    for (let z = 0; z < L.size[1]; z += 3) for (let x = 0; x < L.size[0]; x += 3) targets.push([x, z]);
    let falls = 0, walks = 0;
    for (const t of targets.slice(0, 60)) {
      const r = routeTo(L, S.actor.cell, t, { cost: S.powers.avoid });
      if (!r) continue;
      S.route.set(r.cells, t, r.reached);
      for (let i = 0; i < 600 && (S.actor.path.length || S.actor.moving); i++) { __qf.tick(1); if (S.life.busy) { falls++; break; } }
      walks++;
      if (S.life.busy) __qf.tick(200);
    }
    return { falls, walks, start };
  });
  record(`${name} tap-walks ${r.walks} routes and never falls`, done && !problems.length && r.walks > 20 && !r.falls, JSON.stringify(r));
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
