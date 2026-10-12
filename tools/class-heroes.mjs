import puppeteer from "puppeteer-core";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const base = process.env.QA_BASE || "http://localhost:8765";
const out = process.env.OUT || path.join(root, "landing");
const quality = +(process.env.Q || 90);
const classes = JSON.parse(fs.readFileSync(path.join(root, "landing/classes.json"), "utf8")).classes.map((c) => c.id);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : classes;
const query = (id) => `level=cat-medium&reset=1&ui=0&nav=0&clip=wiggle&zoom=${process.env.ZOOM || 155}${id === "base" ? "" : `&class=${id}`}`;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "class-heroes-")),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
try {
  for (const id of ids) {
    const page = await b.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 1 });
    await page.goto(`${base}/3d/index.html?${query(id)}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 120000, polling: 200 });
    const err = await page.evaluate(() => window.__error || null);
    if (err) errors.push(String(err));
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 900, height: 1000 } });
    const file = path.join(out, `hero-${id}.jpg`);
    await sharp(png).jpeg({ quality, mozjpeg: true }).toFile(file);
    console.log(file, fs.statSync(file).size, errors.join(" | "));
    if (errors.length) process.exitCode = 1;
    await page.close();
  }
} finally {
  await b.close();
}

if (out === path.join(root, "landing") && !process.exitCode) {
  const theme = path.join(root, "landing/themes/souls.js");
  const src = fs.readFileSync(theme, "utf8");
  const v = +src.match(/const HERO_V = "(\d+)"/)[1] + 1;
  fs.writeFileSync(theme, src.replace(/const HERO_V = "\d+"/, `const HERO_V = "${v}"`));
  console.log(`HERO_V ${v}`);
}
