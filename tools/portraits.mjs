import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const OUT = process.env.OUT_DIR || path.join(root, "assets/start");
const SHEET = process.env.SHEET || path.join(root, "out/portraits/sheet.png");
const order = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order.filter((n) => !ONLY.length || ONLY.includes(n));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-portraits"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

const made = [];
let failed = 0;
for (const name of order) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push(m.text()); });
  await page.setViewport({ width: 400, height: 400, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/3d/index.html?level=${encodeURIComponent(name)}&portrait=1`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true, { timeout: 60000, polling: 100 });
  const res = await page.evaluate(() => ({ error: window.__error, ...(window.__portrait || {}) }));
  await page.close();
  if (res.error || !res.url || problems.length) {
    failed++;
    console.log(`FAIL  ${name}  ${res.error || problems.join(" | ")}`);
    continue;
  }
  const file = path.join(OUT, `${name}.jpg`);
  const png = Buffer.from(res.url.split(",")[1], "base64");
  await sharp(png).jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(file);
  made.push({ name, png });
  console.log(`ok    ${name}  ${res.focal}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}
await browser.close();

if (made.length) {
  const D = 58, PAD = 14, COLS = 6, rows = Math.ceil(made.length / COLS);
  const mask = Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}"/></svg>`);
  const tiles = await Promise.all(made.map(async ({ png }, i) => {
    const disc = await sharp(png).resize(D, D, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    return { input: disc, left: PAD + (i % COLS) * (D + PAD), top: PAD + Math.floor(i / COLS) * (D + PAD) };
  }));
  fs.mkdirSync(path.dirname(SHEET), { recursive: true });
  await sharp({ create: { width: PAD + COLS * (D + PAD), height: PAD + rows * (D + PAD), channels: 4, background: "#262c37" } }).composite(tiles).png().toFile(SHEET);
  console.log(`sheet ${path.relative(root, SHEET)}`);
}
process.exit(failed ? 1 : 0);
