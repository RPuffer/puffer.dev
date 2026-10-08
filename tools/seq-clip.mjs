import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const W = +opt("--w", 900), H = +opt("--h", 800), FPS = +opt("--fps", 30), HOPS = +opt("--hops", 3), PRE = +opt("--pre", 0.6), POST = +opt("--post", 0.8);
const OUT = path.resolve(root, opt("--out", "out/pass7/sequence.mp4"));
const STILLS = opt("--stills", null);
const query = opt("--query", "");
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
const ORDER = (opt("--order", null) || "").split(",").filter(Boolean);
const order = ORDER.length ? ORDER : (Array.isArray(run) ? run : run.order).slice(0, HOPS + 1);
const frames = fs.mkdtempSync(path.join(os.tmpdir(), "seq-clip-"));
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-seq"),
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
const shoot = () => page.screenshot({ path: path.join(frames, `f${String(n++).padStart(4, "0")}.png`) });
const step = async () => { await page.evaluate((d) => window.__game.advance(d), 1 / FPS); await shoot(); };
const tick = async (sec) => { for (let i = 0; i < Math.round(sec * FPS); i++) await step(); };

try {
  await page.goto(`${BASE}/3d/index.html?level=${order[0]}&reset=1&ui=0${query}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 });
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); window.__game.pause(); });
  for (let i = 0; i + 1 < order.length; i++) {
    const at = await page.evaluate(() => {
      const S = window.__game.state, e = S.things.things.find((t) => t.kind === "elevator" && t.role === "exit");
      const a = S.actor;
      a.path = []; a.cell = [e.x, e.z]; a.pos.x = e.x + 0.5; a.pos.z = e.z + 0.5;
      return [e.x, e.z];
    });
    await tick(PRE);
    const used = await page.evaluate(() => window.__game.state.things.act());
    if (!used) throw new Error(`${order[i]} exit ${at} did not take E`);
    marks.push({ frame: n, label: `${order[i]} E` });
    const t0 = n;
    let beat = "";
    for (let f = 0; f < 20 * FPS; f++) {
      await step();
      const b = await page.evaluate(() => window.__sequence.state);
      if (b !== beat) { marks.push({ frame: n - 1, label: b }); beat = b; }
      if (b === "idle") break;
    }
    const s = await page.evaluate(() => ({ name: window.__game.state.level.name, z: window.__game.renderer.zoomScale, hop: window.__sequence.hops.at(-1), err: window.__swapError }));
    if (s.name !== order[i + 1] || s.err) throw new Error(`hop ${i + 1}: ${JSON.stringify(s)}`);
    console.log(`${order[i]} -> ${order[i + 1]} ${((n - t0) / FPS).toFixed(2)} s clip, beats ${JSON.stringify(s.hop.beats)}, dance ${s.hop.dance}, zoomScale ${s.z.toFixed(3)}`);
    await tick(POST);
  }
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
} finally {
  await browser.close();
}
for (const p of problems) console.error("page:", p);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", OUT], { stdio: "inherit" });
if (STILLS) {
  const want = ["dance", "drop", "hold", "arrive", "land"];
  const picks = marks.filter((m) => want.includes(m.label)).slice(0, want.length).map((m) => m.frame + (m.label === "drop" ? Math.round(0.6 * FPS) : m.label === "arrive" ? Math.round(0.5 * FPS) : 0));
  const sheet = path.resolve(root, STILLS);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...picks.flatMap((i) => ["-i", path.join(frames, `f${String(i).padStart(4, "0")}.png`)]), "-filter_complex", `${picks.map((_, i) => `[${i}:v]scale=${Math.round(W / 2)}:-1[s${i}]`).join(";")};${picks.map((_, i) => `[s${i}]`).join("")}hstack=inputs=${picks.length}`, "-q:v", "3", sheet], { stdio: "inherit" });
  console.log(`stills ${sheet}: frames ${picks.join(",")}`);
}
fs.rmSync(frames, { recursive: true, force: true });
console.log(`${OUT}: ${n} frames, ${(n / FPS).toFixed(1)} s`);
