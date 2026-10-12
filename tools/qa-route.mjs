import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { registerCatalog } from "../core/catalog.js";
import { prepareLevel, canStep, DIRS } from "../core/level.js";
import { createInteract, GATE_LIFT, ladderEnds } from "../core/interact.js";
import { rampLandings } from "../core/procgen.js";
import { checkRoute, routeDistances } from "../core/layout/check.js";
import { routeFingerprint, fingerprintClash } from "../core/layout/topology.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const LEVELS = (args.find((a) => !/^https?:/.test(a) && !a.startsWith("--")) || "wizard-medium-r1,wizard-medium-r2,wizard-medium-r3").split(",");
const live = !args.includes("--no-browser");
const results = [];
const record = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " " + detail : ""}`); };

const raws = Object.fromEntries(LEVELS.map((n) => [n, JSON.parse(fs.readFileSync(path.join(root, "levels", `${n}.json`), "utf8"))]));
for (const raw of Object.values(raws)) for (const p of raw.pieces || []) {
  const mod = await import(path.join(root, "3d", p));
  if (mod.register) registerCatalog((await mod.register({ palette: raw.palette || {} })).catalog || {});
}

const CHECKS = [
  ["lift to lift", /^lift to lift/],
  ["core gate seals the core", /^seal|lever .* not reachable|bonfire not reachable/],
  ["shortcuts shorten the bonfire return", /^shortcut/],
  ["doors are one-way", /^door/],
  ["ladders and drops are one-way", /^ladder|^drop/],
  ["lever gates hold until pulled", /^gate/],
  ["path tiles form one connected route", /^path|no path cells/],
  ["no decor on path cells", /^decor on path/],
  ["level loads clean (prepareLevel, checkLevel)", /^prepareLevel|^checkLevel/],
  ["bonfire within three cells of spawn", /^bonfire/],
];

const opp = (d) => ({ n: "s", s: "n", e: "w", w: "e" })[d];
const dirTo = (a, b) => Object.keys(DIRS).find((d) => a[0] + DIRS[d][0] === b[0] && a[1] + DIRS[d][1] === b[1]);

function fakeActor(cell) {
  return { cell: cell.slice(), pos: { x: cell[0] + 0.5, z: cell[1] + 0.5 }, path: [], locked: false, moving: false, held: null, setPath(p) { this.path = p.slice(1); } };
}

function interactProbe(raw) {
  const out = [];
  const L = prepareLevel(JSON.parse(JSON.stringify(raw)));
  const it = createInteract(L, { params: { hero: "0" }, storage: null, dom: false });
  const tick = (a, s = 0.05) => { it.bind(a); it.update(s); };
  for (const t of it.things) {
    if (t.kind === "door") {
      const [near, far] = t.edge, d = dirTo(near, far);
      const a = fakeActor(near); tick(a);
      const before = canStep(L, ...near, d);
      it.act();
      const stillShut = t.state === "closed" && !canStep(L, ...near, d) && !canStep(L, ...far, opp(d));
      const b = fakeActor(far); tick(b);
      it.act();
      out.push([`door ${t.id}: shut from the near side, opens from the far side`, !before && stillShut && t.state === "open" && canStep(L, ...near, d) && canStep(L, ...far, opp(d)), `near ${near} far ${far}`]);
    }
    if (t.kind === "ladder") {
      const [top, bot] = ladderEnds(t), down = dirTo(top, bot), up = opp(down);
      if (t.mode === "drop") {
        out.push([`drop ${t.id}: down from ${top} to ${bot}, never back up`, canStep(L, ...top, down) && !canStep(L, ...bot, up), ""]);
        continue;
      }
      const a = fakeActor(bot); tick(a);
      it.act();
      const held = t.state === "up" && !canStep(L, ...bot, up) && !canStep(L, ...top, down);
      const b = fakeActor(top); tick(b);
      it.act();
      out.push([`ladder ${t.id}: out of reach from below, kicked down from above`, held && t.state === "down" && canStep(L, ...top, down) && canStep(L, ...bot, up), `top ${top} bottom ${bot}`]);
    }
    if (t.kind === "lever") {
      const g = it.things.find((q) => q.kind === "gate" && q.open === `lever:${t.id}`);
      const d = dirTo(g.edge[0], g.edge[1]);
      const shut = !canStep(L, ...g.edge[0], d);
      const stand = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [t.x + dx, t.z + dz]).find(([x, z]) => L.cells[z]?.[x]?.p);
      const a = fakeActor(stand); tick(a);
      it.act();
      for (let i = 0; i < Math.ceil(GATE_LIFT / 0.05) + 4; i++) tick(a);
      out.push([`lever ${t.id}: opens gate ${g.id} at ${g.edge[0]}|${g.edge[1]}`, shut && t.state === "pulled" && g.state === "open" && canStep(L, ...g.edge[0], d), `pulled from ${stand}`]);
    }
  }
  return out;
}

for (const name of LEVELS) {
  const raw = raws[name], tag = `route-${name}`;
  const problems = checkRoute(raw);
  for (const [label, re] of CHECKS) {
    const mine = problems.filter((p) => re.test(p));
    record(`${tag} ${label}`, !mine.length, mine.slice(0, 3).join(" | "));
  }
  const stray = problems.filter((p) => !CHECKS.some(([, re]) => re.test(p)));
  record(`${tag} no other route problems`, !stray.length, stray.slice(0, 3).join(" | "));
  const ramps = rampLandings(raw, new Set());
  record(`${tag} every ramp has open landings top and bottom`, !ramps.length, ramps.slice(0, 3).join(" | "));
  for (const s of routeDistances(raw)) record(`${tag} shortcut ${s.id} (${s.kind}) shortens the bonfire return`, s.unlocked < s.locked, `${s.locked} -> ${s.unlocked} steps from ${s.from}`);
  for (const [label, ok, detail] of interactProbe(raw)) record(`${tag} ${label}`, ok, detail);
}

{
  const order = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
  const fp = order.map((n) => [n, routeFingerprint(JSON.parse(fs.readFileSync(path.join(root, "levels", `${n}.json`), "utf8")))]);
  const clashes = [];
  let closest = [0, ""];
  for (let i = 0; i < fp.length; i++) for (let j = i + 1; j < fp.length; j++) {
    const c = fingerprintClash(fp[i][1], fp[j][1]);
    if (c.jaccard > closest[0]) closest = [c.jaccard, `${fp[i][0]}/${fp[j][0]}`];
    if (c.same) clashes.push(`${fp[i][0]} = ${fp[j][0]} (${c.jaccard.toFixed(2)})`);
  }
  record(`run-set no two islands share a route graph`, !clashes.length, clashes.length ? clashes.slice(0, 4).join(" | ") : `closest ${closest[1]} ${closest[0].toFixed(2)}`);
  const kinds = new Set(fp.map(([, f]) => f.archetype));
  record(`run-set uses at least six route archetypes`, kinds.size >= 6, [...kinds].join(", "));
  const twins = fp.filter(([, f], i) => i && f.archetype === fp[i - 1][1].archetype && f.mirror === fp[i - 1][1].mirror).map(([n], i) => n);
  record(`run-set neighbours differ in archetype or orientation`, !twins.length, twins.join(", "));
}

if (live) {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-route"),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
  });
  fs.mkdirSync(path.join(root, "out/qa"), { recursive: true });
  for (const name of LEVELS) {
    const tag = `route-${name} live`;
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push("console " + m.text()); });
    await page.setViewport({ width: 1100, height: 900 });
    await page.goto(`${BASE}/3d/index.html?level=${name}&reset=1&clouds=none`, { waitUntil: "load" });
    let done = true;
    try { await page.waitForFunction(() => window.__done === true, { timeout: 20000, polling: 100 }); } catch { done = false; }
    record(`${tag} loads`, done, errs.slice(0, 2).join(" | "));
    if (!done) { await page.close(); continue; }
    const res = await page.evaluate(async () => {
      const { routeTo } = await import("/core/path.js");
      const { ladderEnds, edgeKey, linkKey } = await import("/core/interact.js");
      const S = window.__game.state, L = S.level, it = S.things, a = S.actor;
      const fire = it.things.find((t) => t.kind === "bonfire");
      const ring = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [fire.x + dx, fire.z + dz]).filter(([x, z]) => L.cells[z]?.[x] && !L.blocked.has(x + "," + z) && L.cells[z][x].h >= 1);
      const home = (from) => { let best = Infinity; for (const c of ring) { const r = routeTo(L, from, c); if (r?.reached) best = Math.min(best, r.cells.length - 1); } return best; };
      const place = (c) => { a.path = []; a.cell = c.slice(); a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5; a.moving = false; };
      const core = it.things.find((t) => t.kind === "gate" && /^watcher:/.test(t.open));
      L.edges.delete(edgeKey(core.edge[0], core.edge[1]));
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = [];
      for (const t of it.things) {
        let stand = null;
        if (t.kind === "door") stand = t.edge[1];
        else if (t.kind === "ladder") stand = [t.x, t.z];
        else if (t.kind === "lever") stand = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [t.x + dx, t.z + dz]).find(([x, z]) => L.cells[z]?.[x]?.p);
        else continue;
        place(stand);
        const drop = t.kind === "ladder" && t.mode === "drop" ? linkKey(...ladderEnds(t)) : null;
        if (drop) L.links.delete(drop);
        const before = home(stand);
        if (drop) L.links.set(drop, t.id);
        for (let i = 0; i < 40 && it.focus !== t && !(t.kind === "ladder" && t.mode === "drop"); i++) { place(stand); a.locked = false; await wait(60); }
        const prompt = document.querySelector(".iw-prompt")?.textContent || "";
        if (t.kind !== "ladder" || t.mode !== "drop") it.act();
        await wait(1500);
        const opens = t.kind === "lever" ? it.things.find((g) => g.open === `lever:${t.id}`) : null;
        for (let i = 0; opens && opens.state !== "open" && i < 40; i++) await wait(100);
        place(stand);
        const after = home(stand);
        out.push({ id: t.id, kind: t.kind + (t.mode === "drop" ? " (drop)" : ""), stand, before, after, state: t.state, prompt });
      }
      return out;
    });
    for (const r of res) record(`${tag} ${r.kind} ${r.id} unlocked in the game shortens the walk home`, r.after < r.before, `${r.before} -> ${r.after} steps from ${r.stand}, state ${r.state}${r.prompt ? `, prompt "${r.prompt}"` : ""}`);
    await page.screenshot({ path: path.join(root, "out/qa", `${tag.replace(/ /g, "-")}.png`) });
    record(`${tag} no console errors`, !errs.length, errs.slice(0, 2).join(" | "));
    await page.close();
  }
  await browser.close();
}

const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length} passed, ${fail.length} failed`);
process.exitCode = fail.length ? 1 : 0;
