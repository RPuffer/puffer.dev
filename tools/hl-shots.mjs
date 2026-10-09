import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
const root = "/Users/pibbles/dev/puffer.dev-build/isoworld";
const [name, yaw, spawn, outDir, ...variants] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-hl"), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--hide-scrollbars", "--disable-cache"] });
for (const v of variants) {
  const [tag, q] = v.split("=", 2).length > 1 ? [v.slice(0, v.indexOf(":")), v.slice(v.indexOf(":") + 1)] : [v, v];
  const page = await b.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.setViewport({ width: 520, height: 520 });
  await page.goto(`http://localhost:8765/3d/index.html?level=${name}&reset=1&ui=0&nav=0&yaw=${yaw}&spawn=${spawn}&t=1.3&${q}`);
  await page.waitForFunction(() => window.__done || window.__error, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 400));
  const f = path.join(outDir, `${name}-${tag}.png`);
  await page.screenshot({ path: f });
  console.log(f, errs.length ? errs.slice(0, 2).join(" | ") : "ok");
  await page.close();
}
await b.close();
