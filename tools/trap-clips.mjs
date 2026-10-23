import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const OUT = path.resolve(args.find((a) => !/^https?:/.test(a) && !/^--/.test(a)) || path.join(root, "out/traps"));
const ONLY = (args.find((a) => a.startsWith("--only="))?.slice(7) || "").split(",").filter(Boolean);
const FPS = 20;
const CAM = args.find((a) => a.startsWith("--cam="))?.slice(6) || "4";
const [VW, VH] = (args.find((a) => a.startsWith("--size="))?.slice(7) || "720x720").split("x").map(Number);
fs.mkdirSync(OUT, { recursive: true });

const SCENES = {
  spikes: { secs: 6, start: [11, 12], steps: [[0, { walk: [4, 12] }], [50, { walk: [4, 12] }], [100, { act: true }]] },
  arrows: { secs: 6, start: [20, 12], steps: [[0, { path: [[21, 12], [22, 12]] }], [30, { walk: [27, 12] }], [80, { act: true }]] },
  worn: { secs: 7.5, start: [15, 9], steps: [[0, { path: [[15, 8], [15, 7], [15, 6], [15, 5], [15, 4], [15, 5], [15, 6], [15, 7], [15, 8], [15, 7], [15, 6], [15, 5], [15, 4]] }]] },
  boss: { secs: 6, start: [12, 15], steps: [[0, { path: [[11, 15]] }], [12, { walk: [11, 22] }]] },
  chariot: { secs: 6, start: [18, 14], steps: [[0, { path: [[18, 15], [19, 15], [19, 16], [19, 17], [19, 18], [20, 18]] }], [50, { path: [[19, 18], [19, 19], [19, 20], [19, 21], [20, 21]] }], [90, { path: [[19, 21], [19, 22], [19, 23]] }], [108, { act: true }]] },
  block: { secs: 5, start: [19, 9], steps: [[0, { walk: [24, 9] }], [40, { walk: [24, 9] }]] },
  fog: { secs: 5, start: [24, 9], steps: [[0, { walk: [26, 3] }]] },
  order: { secs: 10, start: [4, 8], steps: [[0, { path: [[4, 7], [4, 6], [4, 5]] }], [80, { path: [[3, 5]] }], [92, { path: [[3, 4], [3, 3]] }], [112, { path: [[3, 4], [4, 4], [5, 4], [5, 5]] }], [140, { path: [[5, 4], [5, 3]] }], [175, { path: [[4, 3], [4, 2]] }]] },
  hearts: { secs: 6, start: [14, 12], steps: [[10, { hurt: 1 }], [40, { hurt: 1 }], [70, { hurt: 1 }]] },
  falltile: { plot: "falsefloor", secs: 4.5, start: [3, 0], steps: [[10, { path: [[3, 1], [3, 2], [3, 3], [3, 4]] }]] },
  rise: { plot: "rise", secs: 6.5, start: [3, 0], steps: [[10, { path: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5]] }], [60, { path: [[3, 2]] }], [80, { walk: [3, 6] }]] },
  lantern: { plot: "plank", secs: 6, start: [3, 1], cls: "nm", steps: [[10, { fire: true }], [25, { path: [[3, 2], [3, 3], [3, 4], [3, 5]] }], [70, { fire: true }]] },
  lanternfail: { plot: "plank", secs: 4.5, start: [3, 1], cls: "wanderer", steps: [[10, { path: [[3, 2], [3, 3], [3, 4]] }]] },
};

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  protocolTimeout: 120000,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-trapclips"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});
try {
  for (const [name, sc] of Object.entries(SCENES)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/3d/index.html?level=traps-showcase&reset=1&cam=${CAM}${sc.cls ? "&class=" + sc.cls : ""}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 60000, polling: 100 });
    await page.evaluate((start, plot) => {
      try { localStorage.removeItem("isoworld:hearts"); } catch {}
      const g = window.__game, a = g.state.actor;
      const o = plot ? g.state.level.plots[plot] : [0, 0];
      window.__clipAt = (c) => [c[0] + o[0], c[1] + o[1]];
      start = window.__clipAt(start);
      g.pause();
      g.state.health.refill();
      a.cell = start.slice(); a.pos.x = start[0] + 0.5; a.pos.z = start[1] + 0.5;
      g.advance(1.5);
      g.renderer.snap();
    }, sc.start, sc.plot || null);
    const frames = path.join(OUT, `${name}-frames`);
    fs.rmSync(frames, { recursive: true, force: true });
    fs.mkdirSync(frames, { recursive: true });
    const n = Math.round(sc.secs * FPS);
    for (let i = 0; i < n; i++) {
      const acts = sc.steps.filter(([f]) => f === i).map(([, a]) => a);
      await page.evaluate(async (acts, fps) => {
        const { findPath } = await import("/core/path.js");
        const S = window.__game.state, a = S.actor;
        for (const act of acts) {
          const at = window.__clipAt;
          if (act.walk) { const p = findPath(S.level, a.cell, at(act.walk)); if (p) a.setPath(p); }
          if (act.path) a.setPath(act.path.map(at));
          if (act.fire) window.__game.powers.fire();
          if (act.hurt) S.life.hurt(act.hurt, { cause: "demo" });
          if (act.act) S.things.act();
        }
        window.__game.advance(1 / fps);
      }, acts, FPS);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
    }
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", path.join(OUT, `${name}.mp4`)]);
    fs.rmSync(frames, { recursive: true, force: true });
    console.log(path.join(OUT, `${name}.mp4`));
    await page.close();
  }
} finally {
  await browser.close();
}
