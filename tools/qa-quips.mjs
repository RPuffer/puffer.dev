import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { watchdog } from "./qa-lib.mjs";
import { QUIPS } from "../core/quips-lines.js";
import { createQuips, DEATHS_KEY } from "../core/quips.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const SHOTS = path.join(root, "out/quips");
fs.mkdirSync(SHOTS, { recursive: true });
const ORDER = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const results = [];
const alive = watchdog();
const record = (name, ok, detail = "") => { alive(name); results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " " + detail : ""}`); };

const all = [...QUIPS.edge, ...QUIPS.heart, ...QUIPS.generic, ...QUIPS.again, ...Object.values(QUIPS.island).flat(), ...Object.values(QUIPS.run).flat()];
const NAMES = /\b(holes?|spikes?|blocks?|plates?|arrows?|barrels?|chests?|mimics?|tiles?|bridges?|signs?|rewind|scoot\w*|paint\w*|decoys?|springs?|gusts?|stones?|flagstones?|lanes?|ice|north|south|east|west|corner)\b/i;
record("the pool holds at least 60 lines", all.length >= 60, `${all.length}`);
record("no line repeats in the pool", new Set(all).size === all.length);
record("every line stays under 70 characters", all.every((l) => l.length <= 70), `longest ${Math.max(...all.map((l) => l.length))}`);
record("no line names a trap or a place", !all.some((l) => NAMES.test(l)), all.filter((l) => NAMES.test(l)).join(" | "));
const ryne = all.filter((l) => /\bRyne/.test(l)).length / all.length;
record("most lines are about Ryne", ryne >= 0.6 && ryne <= 0.75, `${Math.round(ryne * 100)}%`);
record("every bucket has lines", ["edge", "heart", "generic", "again"].every((b) => QUIPS[b].length >= 8) && [5, 10, 25].every((n) => QUIPS.island[n]?.length) && [10, 25, 50].every((n) => QUIPS.run[n]?.length));

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
{
  const st = mem();
  const q = createQuips({ storage: st });
  const seen = [];
  let cell = [0, 0];
  for (let i = 0; i < 400; i++) { cell = [cell[0] + 3, 0]; seen.push(q.death({ island: `i${i % 7}`, kind: i % 3 ? "fall" : "flop", cell })); }
  record("no immediate repeats over 400 deaths", seen.every((r, i) => !i || r.line !== seen[i - 1].line));
  const kinds = new Set(seen.map((r) => r.bucket.split(":")[0]));
  record("deaths draw from cause, generic and milestone buckets", ["edge", "heart", "generic", "island", "run"].every((b) => kinds.has(b)), [...kinds].join(","));
  const v = JSON.parse(st.getItem(DEATHS_KEY));
  record("death counts persist per island and per run", v.run === 400 && v.islands.i0 === 58, JSON.stringify({ run: v.run, i0: v.islands.i0 }));
  const r = createQuips({ storage: mem() });
  r.death({ island: "a", kind: "fall", cell: [4, 4] });
  const again = r.death({ island: "a", kind: "fall", cell: [4, 5] });
  const elsewhere = r.death({ island: "a", kind: "fall", cell: [9, 9] });
  record("a second death on the same spot draws from the again bucket", again.bucket === "again" && elsewhere.bucket !== "again", `${again.bucket} ${elsewhere.bucket}`);
  const m = createQuips({ storage: mem() });
  let fifth = null;
  for (let i = 0; i < 5; i++) fifth = m.death({ island: "b", kind: "flop", cell: [i * 5, 0] });
  record("the fifth death on an island gets a milestone line", fifth.bucket === "island:5" && QUIPS.island[5].includes(fifth.line), fifth.line);
}

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-quips"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function open(query, viewport) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  await page.setViewport(viewport);
  await page.goto(`${BASE}/3d/index.html?${query}`, { waitUntil: "load" });
  const done = await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 }).then(() => true, () => false);
  return { page, problems, done };
}

const edgeOf = () => {
  const S = window.__game.state, L = S.level, a = S.actor;
  const keep = a.cell.slice();
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) for (const d of ["n", "e", "s", "w"]) {
    const t = (S.traps?.at?.([x, z]) || []);
    if (t.length) continue;
    a.cell = [x, z];
    const hit = a.edgeAt(d);
    a.cell = keep;
    if (hit) return { cell: [x, z], dir: d };
  }
  return null;
};
const dropAt = (page, e) => page.evaluate((e) => {
  const a = window.__game.state.actor;
  a.path = []; a.held = null; a.cell = e.cell.slice(); a.pos.x = e.cell[0] + 0.5; a.pos.z = e.cell[1] + 0.5;
  a.presses++; a.tapDir = e.dir;
}, e);
const quip = (page) => page.evaluate(() => {
  const el = window.__quips?.element, r = el?.getBoundingClientRect();
  const box = (q) => { const b = document.querySelector(q)?.getBoundingClientRect(); return b && b.width ? [b.left, b.top, b.right, b.bottom] : null; };
  return { shown: !!el && !el.hidden && el.classList.contains("on"), text: el?.textContent || "", rect: r ? [r.left, r.top, r.right, r.bottom] : null, pe: el ? getComputedStyle(el).pointerEvents : null, last: window.__quips?.last, busy: window.__game.state.life.busy, hearts: box(".iw-hearts"), toast: box(".iw-toast:not([hidden])"), status: box(".iw-status"), card: box(".iw-card"), vw: innerWidth };
});
const hit = (a, b) => !!a && !!b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

for (const [label, viewport, extra] of [["desktop", { width: 1200, height: 800, deviceScaleFactor: 1 }, ""], ["phone", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, "&dpad=1"]]) {
  const { page, problems, done } = await open(`level=${ORDER[0]}&reset=1${extra}`, viewport);
  record(`${label} loads with the quip mounted`, done && !problems.length && !!(await page.evaluate(() => !!window.__quips)), problems.join(" | "));
  await page.evaluate(() => localStorage.removeItem("isoworld:deaths"));
  const e = await page.evaluate(edgeOf);
  record(`${label} finds an open edge`, !!e, JSON.stringify(e));
  await dropAt(page, e);
  await page.waitForFunction(() => window.__game.state.life.busy === "fall", { timeout: 4000, polling: 30 }).catch(() => {});
  let s = await quip(page);
  record(`${label} a fall shows a quip at once`, s.shown && all.includes(s.text) && s.last?.kind === "fall", `${s.text} ${JSON.stringify(s.last)}`);
  await page.screenshot({ path: path.join(SHOTS, `${label}-fall.png`) });
  record(`${label} the quip ignores taps`, s.pe === "none");
  record(`${label} the quip fits the viewport with a 16 px gutter`, s.rect[0] >= 15 && s.rect[2] <= s.vw - 15, JSON.stringify(s.rect));
  record(`${label} the quip clears the hearts, toast and status`, !hit(s.rect, s.hearts) && !hit(s.rect, s.toast) && !hit(s.rect, s.status) && !hit(s.rect, s.card), JSON.stringify(s));
  await page.waitForFunction(() => !window.__game.state.life.busy, { timeout: 6000, polling: 50 }).catch(() => {});
  s = await quip(page);
  record(`${label} the quip is still up after the respawn`, s.shown && !s.busy, s.text);
  await page.screenshot({ path: path.join(SHOTS, `${label}-respawn.png`) });
  const moved = await page.evaluate(async () => {
    const a = window.__game.state.actor, from = a.cell.slice();
    a.presses++;
    for (const d of ["n", "e", "s", "w"]) if (!a.edgeAt(d)) { a.tapDir = d; break; }
    await new Promise((r) => setTimeout(r, 700));
    return a.cell.join() !== from.join();
  });
  record(`${label} the hero walks while the quip shows`, moved);
  await dropAt(page, e);
  await page.waitForFunction(() => window.__game.state.life.busy === "fall", { timeout: 4000, polling: 30 }).catch(() => {});
  s = await quip(page);
  record(`${label} dying on the same spot again draws an again line`, s.last?.bucket === "again" && QUIPS.again.includes(s.text), `${s.last?.bucket} ${s.text}`);
  await page.waitForFunction(() => !window.__game.state.life.busy, { timeout: 6000, polling: 50 }).catch(() => {});
  const flop = await page.evaluate(async () => {
    const S = window.__game.state;
    await new Promise((r) => setTimeout(r, 1300));
    S.health.refill();
    S.life.hurt(3, { cause: "qa" });
    await new Promise((r) => setTimeout(r, 120));
    return { busy: S.life.busy, last: window.__quips.last, text: window.__quips.element.textContent };
  });
  record(`${label} losing the last heart shows a quip`, flop.busy === "flop" && flop.last?.kind === "flop" && all.includes(flop.text), JSON.stringify(flop));
  const v = await page.evaluate(() => JSON.parse(localStorage.getItem("isoworld:deaths")));
  record(`${label} death counts land in localStorage`, v?.run === 3 && v.islands?.[ORDER[0]] === 3, JSON.stringify(v));
  await page.close();
}

{
  const { page, problems, done } = await open(`level=${ORDER[0]}&reset=1`, { width: 900, height: 800, deviceScaleFactor: 1 });
  record("swap page loads", done && !problems.length, problems.join(" | "));
  await page.evaluate(() => localStorage.removeItem("isoworld:deaths"));
  await page.evaluate((n, f) => window.__run.swap(n, { from: f, arrive: "entry" }), ORDER[1], ORDER[0]);
  const ok = await page.waitForFunction((n) => { const S = window.__game.state; return S.level.name === n && !S.actor.locked; }, { timeout: 20000, polling: 50 }, ORDER[1]).then(() => true, () => false);
  record("the elevator swap lands on the next island", ok);
  const e = await page.evaluate(edgeOf);
  await dropAt(page, e);
  await page.waitForFunction(() => window.__game.state.life.busy === "fall", { timeout: 4000, polling: 30 }).catch(() => {});
  const s = await quip(page);
  const count = await page.evaluate(() => document.querySelectorAll(".iw-quip").length);
  record("a death after the in-page swap still shows a quip", s.shown && all.includes(s.text), s.text);
  record("the swap keeps one quip element", count === 1, `${count}`);
  const v = await page.evaluate((n) => JSON.parse(localStorage.getItem("isoworld:deaths"))?.islands?.[n], ORDER[1]);
  record("the death counts against the new island", v === 1, `${v}`);
  await page.close();
  const { page: p2 } = await open(`level=${ORDER[0]}`, { width: 900, height: 800, deviceScaleFactor: 1 });
  const cleared = await p2.evaluate(async () => { const { resetAll } = await import("/core/dev.js"); resetAll(); return localStorage.getItem("isoworld:deaths"); });
  record("resetAll clears the death counts", cleared === null);
  await p2.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
