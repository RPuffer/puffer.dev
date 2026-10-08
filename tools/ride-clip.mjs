import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const OUT = path.resolve(root, opt("--out", "out/pass4/ride.mp4"));
const W = +opt("--w", 900), H = +opt("--h", 800), FPS = 30, HOLD = +opt("--hold", 1.4);
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
const ORDER = (Array.isArray(run) ? run : run.order).slice(0, 3);
const frames = path.resolve(opt("--frames", path.join(os.tmpdir(), "ride-clip-frames")));
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-ride"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });

let n = 0;
const marks = [];
const mark = (label) => { marks.push({ frame: n, label }); console.log(`${(n / FPS).toFixed(2)}s ${label}`); };
const shoot = () => page.screenshot({ path: path.join(frames, `f${String(n++).padStart(4, "0")}.png`) });
const step = async () => { await page.evaluate((d) => window.__game.advance(d), 1 / FPS); await shoot(); };
const tick = async (sec) => { for (let i = 0; i < Math.round(sec * FPS); i++) await step(); };
const until = async (fn, arg, max) => { for (let i = 0; i < max * FPS; i++) { if (await page.evaluate(fn, arg)) return true; await step(); } return false; };

async function load(query) {
  await page.goto(`${BASE}/3d/index.html?${query}&ui=0&nav=0`, { waitUntil: "load" });
  const ok = await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 }).then(() => page.evaluate(() => window.__done === true && !window.__error), () => false);
  if (!ok) throw new Error(`${query} did not load`);
  await page.evaluate(() => window.__game.pause());
}

const snap = () => page.evaluate(() => {
  const S = window.__game.state;
  return { name: S.level.name, cell: S.actor.cell.slice(), things: S.things.things.map((t) => ({ id: t.id, kind: t.kind, role: t.role || null, x: t.x, z: t.z, state: t.state, open: t.open || null, threshold: t.threshold || null })) };
});
const around = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [t.x + a, t.z + b]);

async function walk(goals) {
  const len = await page.evaluate(async (goals) => {
    const { findPath } = await import("/core/path.js");
    const { isWalkable } = await import("/core/level.js");
    const S = window.__game.state, a = S.actor;
    let best = null;
    for (const g of goals) {
      if (!isWalkable(S.level, g[0], g[1])) continue;
      const p = findPath(S.level, a.cell, g);
      if (p && (!best || p.length < best.length)) best = p;
    }
    if (best) a.setPath(best);
    return best ? best.length : null;
  }, goals);
  if (len == null) return false;
  await until(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, null, 20);
  return true;
}

async function use(id, want, label) {
  await page.keyboard.press("KeyF");
  await step();
  const st = await page.evaluate((id) => window.__game.state.things.byId[id].state, id);
  if (st !== want) throw new Error(`${label}: ${id} is ${st}`);
  mark(label);
  await tick(HOLD);
}

async function openGate(s) {
  const gate = s.things.find((t) => t.kind === "gate" && t.state !== "open");
  if (!gate) return;
  const [kind, id] = String(gate.open).split(":");
  if (kind !== "watcher") throw new Error(`gate ${gate.id} opens on ${gate.open}`);
  if (!(await walk(gate.threshold))) throw new Error(`no path to ${gate.id} threshold`);
  mark(`${s.name} threshold, ${id} turns`);
  const opened = await until((g) => window.__game.state.things.byId[g].state === "open", gate.id, 8);
  if (!opened) throw new Error(`gate ${gate.id} stayed shut`);
  mark(`${s.name} gate open`);
  await tick(HOLD);
}

async function rideExit(s, next) {
  const exit = s.things.find((t) => t.kind === "elevator" && t.role === "exit");
  if (!(await walk([[exit.x, exit.z]]))) throw new Error(`no path to ${s.name} exit`);
  await tick(0.3);
  await page.keyboard.press("KeyF");
  mark(`${s.name} ride`);
  const nav = await until(() => window.__game.state.things.navigated, null, 4);
  if (!nav) throw new Error(`${s.name} exit did not ride`);
  const to = await page.evaluate(() => window.__game.state.things.navigated);
  if (to !== next) throw new Error(`${s.name} exit rides to ${to}, expected ${next}`);
  await tick(0.4);
  await load(`level=${next}&from=${s.name}&arrive=entry`);
  const a = await snap();
  const entry = a.things.find((t) => t.kind === "elevator" && t.role === "entry");
  if (a.name !== next || !entry || a.cell[0] !== entry.x || a.cell[1] !== entry.z) throw new Error(`${next} arrival at ${a.cell}`);
  await tick(0.2);
  mark(`${next} entry platform ${entry.x},${entry.z}`);
  await tick(HOLD);
  return a;
}

try {
  await load(`level=${ORDER[0]}&reset=1`);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
  await load(`level=${ORDER[0]}&reset=1`);
  let s = await snap();
  mark(`${s.name} spawn ${s.cell}`);
  await tick(HOLD);
  const fire = s.things.find((t) => t.kind === "bonfire");
  if (!(await walk(around(fire)))) throw new Error("no path to bonfire");
  await tick(0.5);
  await use(fire.id, "lit", `${s.name} bonfire lit`);
  await tick(0.6);
  const chest = s.things.find((t) => t.kind === "chest");
  const ring = new Set(around(fire).map(String));
  if (!(await walk(around(chest).filter((c) => !ring.has(String(c)))))) throw new Error("no path to chest");
  await tick(0.4);
  await use(chest.id, "open", `${s.name} chest open`);
  await tick(0.6);
  await openGate(await snap());
  s = await rideExit(await snap(), ORDER[1]);
  const fire2 = s.things.find((t) => t.kind === "bonfire");
  if (!(await walk(around(fire2)))) throw new Error("no path to wizard bonfire");
  await tick(0.4);
  await use(fire2.id, "lit", `${s.name} bonfire lit`);
  await tick(0.6);
  await openGate(await snap());
  await rideExit(await snap(), ORDER[2]);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
} finally {
  await browser.close();
}
for (const p of problems) console.error("page:", p);

execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", OUT], { stdio: "inherit" });
const pick = Array.from({ length: 6 }, (_, i) => Math.round((i + 0.5) * n / 6));
const strip = OUT.replace(/\.mp4$/, "-strip.jpg");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...pick.flatMap((i) => ["-i", path.join(frames, `f${String(i).padStart(4, "0")}.png`)]), "-filter_complex", `${pick.map((_, i) => `[${i}:v]scale=450:-1[s${i}]`).join(";")};${pick.map((_, i) => `[s${i}]`).join("")}hstack=inputs=6`, "-q:v", "3", strip], { stdio: "inherit" });
console.log(`${OUT}: ${n} frames, ${(n / FPS).toFixed(1)} s; strip frames ${pick.join(",")}`);
