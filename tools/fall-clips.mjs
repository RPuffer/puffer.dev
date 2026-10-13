import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const OUT = path.resolve(args.find((a) => !/^https?:/.test(a) && !/^--/.test(a)) || path.join(root, "out/falls"));
const ONLY = (args.find((a) => a.startsWith("--only="))?.slice(7) || "").split(",").filter(Boolean);
const FPS = 24, SIZE = 720;
fs.mkdirSync(OUT, { recursive: true });

const EDGE = [[6, { press: "s" }], [22, { press: "s" }], [44, { press: "s" }]];
const SCENES = {
  teeter: { secs: 5, start: [16, 13], steps: [[6, { press: "s" }], [22, { press: "s" }], [62, { press: "n" }], [80, { press: "s" }], [96, { press: "s" }]] },
  pause: { secs: 5, start: [16, 13], fall: "pause", steps: EDGE },
  spin: { secs: 5, start: [16, 13], fall: "spin", steps: EDGE },
  shrink: { secs: 5, start: [16, 13], fall: "shrink", steps: EDGE },
  ice: { secs: 6, start: [15, 16], fall: "spin", steps: [[10, { press: "s" }], [24, { press: "s" }]] },
};

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-fallclips"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});
try {
  for (const [name, sc] of Object.entries(SCENES)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/3d/index.html?level=traps-showcase&reset=1&cam=4${sc.fall ? "&fall=" + sc.fall : ""}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 });
    await page.evaluate((start) => {
      try { localStorage.removeItem("isoworld:hearts"); } catch {}
      const g = window.__game, a = g.state.actor;
      g.pause();
      g.state.health.refill();
      a.cell = start.slice(); a.pos.x = start[0] + 0.5; a.pos.z = start[1] + 0.5;
      g.advance(1.5);
      g.renderer.snap();
    }, sc.start);
    const frames = path.join(OUT, `${name}-frames`);
    fs.rmSync(frames, { recursive: true, force: true });
    fs.mkdirSync(frames, { recursive: true });
    const n = Math.round(sc.secs * FPS);
    for (let i = 0; i < n; i++) {
      const acts = sc.steps.filter(([f]) => f === i).map(([, a]) => a);
      await page.evaluate((acts, fps) => {
        const a = window.__game.state.actor;
        for (const act of acts) if (act.press) { a.presses++; a.tapDir = act.press; }
        window.__game.advance(1 / fps);
      }, acts, FPS);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
    }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", path.join(OUT, `${name}.mp4`)]);
    fs.copyFileSync(path.join(frames, `f${String(Math.min(n - 1, 30)).padStart(4, "0")}.png`), path.join(OUT, `${name}.png`));
    fs.rmSync(frames, { recursive: true, force: true });
    console.log(path.join(OUT, `${name}.mp4`));
    await page.close();
  }
} finally {
  await browser.close();
}
