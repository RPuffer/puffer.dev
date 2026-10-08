import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const root = "/Users/pibbles/dev/puffer.dev-build/isoworld", dir = root + "/out/pass10/shots";
fs.mkdirSync(dir, { recursive: true });
const run = JSON.parse(fs.readFileSync(root + "/levels/run.json", "utf8")).order;
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, userDataDir: root + "/" + (process.env.PP_PROFILE || ".pp-profile-p10"), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--hide-scrollbars"] });
let i = 0;
for (const n of run) for (const yaw of [45, 225]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 800 });
  await page.goto(`http://localhost:8765/3d/index.html?level=${n}&reset=1&ui=0&nav=0&yaw=${yaw}`);
  await page.waitForFunction(() => window.__done || window.__error, { timeout: 60000, polling: 200 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${dir}/${String(i++).padStart(2, "0")}.png` });
  await page.close();
}
await browser.close();
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${dir}/%02d.png`, "-vf", "scale=300:267,tile=6x4", "-frames:v", "1", "-q:v", "3", root + "/out/pass10/sheet.jpg"]);
console.log("sheet ok", i);
