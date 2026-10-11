import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const W = +opt("--w", 720), H = +opt("--h", 720), FPS = +opt("--fps", 30), SECS = +opt("--secs", 8);
const still = opt("--still", null), stillQuery = opt("--still-query", "hero=0");
const wps = (opt("--path", "") || "").split(";").filter(Boolean).map((s) => s.split(",").map(Number));
const pause = +opt("--pause", 0.6);
const [query, out] = args;
if (!query || !out) { console.error("usage: node tools/concept-clip.mjs <query> <out.mp4> [--path x,z;x,z] [--still out.png] [--secs N]"); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = process.env.BASE || "http://localhost:8765";
const frames = path.resolve(out.replace(/\.mp4$/, "") + "-frames");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-concept"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});
const errors = [];
const load = async (page, q) => {
  await page.goto(`${BASE}/3d/index.html?${q}&ui=0&nav=0&clouds=none&reset=1&seq=0`, { waitUntil: "load" });
  await page.waitForFunction(() => (window.__done === true && window.__concept?.ready) || !!window.__error, { timeout: 120000, polling: 100 });
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(String(err));
  await page.evaluate(() => window.__game.pause());
};
let stats = null;
try {
  const page = await b.newPage();
  await page.setCacheEnabled(false);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  if (still) {
    await load(page, `${query}&${stillQuery}`);
    await page.evaluate(() => { window.__setTime?.(3); window.__game.advance(1 / 30); });
    await page.screenshot({ path: still });
    console.log(still);
  }
  await load(page, query);
  let wi = 0, wait = 0;
  for (let i = 0; i < Math.round(SECS * FPS); i++) {
    const r = await page.evaluate(async (wp, dt) => {
      const S = window.__game.state;
      if (wp && !S.actor.path.length) {
        const { routeTo } = await import("/core/path.js");
        const r = routeTo(S.level, S.actor.cell, wp);
        if (r && r.cells.length > 1) S.route.set(r.cells, wp, r.reached);
        else return "arrived";
      }
      window.__setTime?.(2 + window.__game.state.time);
      window.__game.advance(dt);
      return S.actor.path.length ? "walk" : "idle";
    }, wait > 0 ? null : wps[wi] || null, 1 / FPS);
    if (wait > 0) wait -= 1 / FPS;
    else if (r === "arrived" || (r === "idle" && wps[wi])) { if (wi < wps.length) { wi++; wait = pause; } }
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
  }
  stats = await page.evaluate(() => {
    const c = window.__concept, gl = window.__game.renderer.three.gl;
    window.__game.renderer.render(window.__game.state, 0);
    return { concept: { tris: c.tris, calls: c.calls, tickMs: c.ticks ? +(c.tickMs / c.ticks).toFixed(3) : 0 }, frame: { tris: gl.info.render.triangles, calls: gl.info.render.calls } };
  });
} finally {
  await b.close();
}
for (const e of errors) console.error("page:", e);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", path.resolve(out)], { stdio: "inherit" });
fs.rmSync(frames, { recursive: true, force: true });
console.log(out);
console.log("STATS " + JSON.stringify(stats));
