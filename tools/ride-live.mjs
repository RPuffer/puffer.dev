import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const OUT = path.resolve(root, opt("--out", "out/pass8/ride-fixed.mp4"));
const W = +opt("--w", 900), H = +opt("--h", 800);
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
const ORDER = (Array.isArray(run) ? run : run.order).slice(0, 3);
const frames = path.resolve(opt("--frames", path.join(os.tmpdir(), "ride-live-frames")));
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
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror " + e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shots = [];
let recording = false, t0 = 0;
const cdp = await page.createCDPSession();
cdp.on("Page.screencastFrame", async (f) => {
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  if (!recording) return;
  const file = path.join(frames, `f${String(shots.length).padStart(5, "0")}.jpg`);
  fs.writeFileSync(file, Buffer.from(f.data, "base64"));
  const seq = await page.evaluate(() => ({ beat: window.__sequence?.beat || "idle", clip: window.__game?.renderer?.hero?.userData.clip?.() || null, level: window.__game?.state.level.name })).catch(() => ({}));
  shots.push({ file, t: f.metadata.timestamp, ...seq });
});

async function load(query) {
  await page.goto(`${BASE}/3d/index.html?${query}&ui=0`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 });
}
const snap = () => page.evaluate(() => {
  const S = window.__game.state;
  return { name: S.level.name, cell: S.actor.cell.slice(), things: S.things.things.map((t) => ({ id: t.id, kind: t.kind, role: t.role || null, x: t.x, z: t.z, state: t.state, open: t.open || null, threshold: t.threshold || null })) };
});
const around = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [t.x + a, t.z + b]);
const until = async (fn, arg, sec) => page.waitForFunction(fn, { timeout: sec * 1000, polling: 50 }, arg).then(() => true, () => false);

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
  await wait(100);
  return until(() => { const a = window.__game.state.actor; return !a.path.length && !a.moving; }, null, 30);
}

async function island(s) {
  const fire = s.things.find((t) => t.kind === "bonfire");
  if (fire && fire.state !== "lit") {
    if (!(await walk(around(fire)))) throw new Error(`${s.name}: no path to bonfire`);
    await page.keyboard.press("KeyE");
    await wait(500);
  }
  const gate = (await snap()).things.find((t) => t.kind === "gate" && t.state !== "open");
  if (gate?.threshold) {
    if (!(await walk(gate.threshold))) throw new Error(`${s.name}: no path to ${gate.id}`);
    if (!(await until((g) => window.__game.state.things.byId[g].state === "open", gate.id, 10))) throw new Error(`${gate.id} stayed shut`);
  }
  const exit = s.things.find((t) => t.kind === "elevator" && t.role === "exit");
  if (!(await walk([[exit.x, exit.z]]))) throw new Error(`${s.name}: no path to exit`);
}

async function ride(next) {
  const hops = await page.evaluate(() => window.__sequence.hops.length);
  await page.keyboard.press("KeyE");
  const ok = await until((n) => window.__sequence.hops.length > n && !window.__sequence.active, hops, 30);
  if (!ok) throw new Error(`ride to ${next} did not finish`);
  const hop = await page.evaluate(() => window.__sequence.hops.at(-1));
  if (hop.next !== next || hop.failed) throw new Error(`hop ${JSON.stringify(hop)}`);
  await wait(800);
  return hop;
}

const log = [];
try {
  await load(`level=${ORDER[0]}&reset=1`);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
  await load(`level=${ORDER[0]}&reset=1`);
  await island(await snap());
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  recording = true;
  await wait(600);
  log.push(await ride(ORDER[1]));
  recording = false;
  await island(await snap());
  recording = true;
  await wait(300);
  log.push(await ride(ORDER[2]));
  recording = false;
  await cdp.send("Page.stopScreencast");
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
} finally {
  await browser.close();
}
for (const p of problems) console.error("page:", p);
for (const h of log) console.log(`${h.from} -> ${h.next}: ${h.dance}, beats ${JSON.stringify(h.beats)}, clips ${JSON.stringify(h.clips)}`);

const list = path.join(frames, "list.txt");
fs.writeFileSync(list, shots.map((s, i) => `file '${s.file}'\nduration ${Math.max(0.001, ((shots[i + 1]?.t ?? s.t + 1 / 30) - s.t)).toFixed(4)}`).join("\n") + `\nfile '${shots.at(-1).file}'\n`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=${W}:${H},fps=30`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", OUT], { stdio: "inherit" });
const first = shots.findIndex((s) => s.beat === "drop");
const end = shots.findIndex((s, i) => i > first && s.beat === "idle");
const span = shots.slice(first, end > 0 ? end : undefined);
const of = (beats, k) => { const x = span.filter((s) => beats.includes(s.beat)); return Array.from({ length: k }, (_, i) => x[Math.min(x.length - 1, Math.round((i + 0.5) * x.length / k))]).filter(Boolean); };
const pick = [...of(["drop", "hold"], 2), ...of(["brace"], 1), ...of(["arrive"], 3)];
const strip = OUT.replace(/\.mp4$/, "-strip.jpg");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...pick.flatMap((s) => ["-i", s.file]), "-filter_complex", `${pick.map((_, i) => `[${i}:v]scale=450:-1[s${i}]`).join(";")};${pick.map((_, i) => `[s${i}]`).join("")}hstack=inputs=${pick.length}`, "-q:v", "3", strip], { stdio: "inherit" });
const dur = (shots.at(-1).t - shots[0].t);
console.log(`${OUT}: ${shots.length} frames over ${dur.toFixed(1)} s (${(shots.length / dur).toFixed(1)} fps captured)`);
console.log(`strip ${strip}: ${pick.map((s) => `${(s.t - shots[0].t).toFixed(2)}s ${s.beat}/${s.clip}`).join(", ")}`);
