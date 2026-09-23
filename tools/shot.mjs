import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const [target, out, w = "352", h = "400"] = process.argv.slice(2);
if (!target || !out) { console.error("usage: node tools/shot.mjs <url-or-path> <out.png> [w] [h]"); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const url = /^[a-z]+:\/\//i.test(target) ? target : "file://" + path.resolve(target);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, ".pp-profile"),
  args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
try {
  const page = await b.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load" });
  try {
    await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 120000, polling: 200 });
  } catch (e) {
    console.error("timeout waiting for window.__done");
  }
  const err = await page.evaluate(() => window.__error || null);
  if (err) errors.push(String(err));
  await page.screenshot({ path: out });
  for (const e of errors) console.error("page:", e);
  console.log(out);
  if (err) process.exitCode = 1;
} finally {
  await b.close();
}
