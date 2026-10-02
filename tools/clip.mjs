import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [target, out, w = "900", h = "800", secs = "6", fps = "30", t0 = "2"] = process.argv.slice(2);
if (!target || !out) {
  console.error("usage: node tools/clip.mjs <url> <out.mp4> [w] [h] [seconds] [fps] [start-time]");
  process.exit(2);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const frames = path.resolve(out.replace(/\.mp4$/, "") + "-frames");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile"),
  args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
const errors = [];
try {
  const page = await b.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  await page.goto(target, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 120000, polling: 200 });
  const n = Math.round(+secs * +fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => new Promise((r) => { window.__setTime(t); requestAnimationFrame(() => requestAnimationFrame(r)); }), +t0 + i / +fps);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
  }
} finally {
  await b.close();
}
for (const e of errors) console.error("page:", e);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", fps, "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", path.resolve(out)], { stdio: "inherit" });
console.log(out);
if (errors.length) process.exitCode = 1;
