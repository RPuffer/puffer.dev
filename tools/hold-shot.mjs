import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "")).map((a) => { const i = a.indexOf("="); return i < 0 ? [a, "1"] : [a.slice(0, i), a.slice(i + 1)]; }));
const base = args.base || "http://localhost:8765";
const levels = (args.levels || "cat-medium,wizard-medium,chimera-medium,ember-subject").split(",");
const sizes = (args.sizes || "900x800").split(",");
const lines = (args.lines || "a,b").split(",");
const out = path.resolve(root, args.out || "out/pass7/hold");
const extra = args.query ? "&" + args.query : "";
fs.mkdirSync(path.dirname(out), { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
const files = [];
try {
  for (const size of sizes) for (const line of lines) for (const level of levels) {
    const [W, H] = size.split("x").map(Number);
    const page = await b.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(`${base}/3d/index.html?level=${level}&reset=1&ui=0&seq=hold&lines=${line}${extra}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__sequence?.state === "hold" || window.__error, { timeout: 60000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = `${out}-${level.split("-")[0]}-${line}-${W}x${H}.png`;
    await page.screenshot({ path: file });
    files.push(file);
    if (errors.length) console.error(level, errors.join("\n"));
    console.log(file);
    await page.close();
  }
} finally {
  await b.close();
}
if (args.sheet) fs.writeFileSync(path.resolve(root, args.sheet + ".list"), files.join("\n"));
