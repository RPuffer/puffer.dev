import fs from "node:fs";
import path from "node:path";
import { launch, openHero, fitZoom, posePage } from "./hero-lib.mjs";

const [base = "http://localhost:8765", level = "cat-medium", mult = "6", clip = "idle", t = "0", out = "out/hero/shot.png", w = "900", h = "800"] = process.argv.slice(2);
if (process.argv.length < 3) { console.error("usage: node tools/hero-shot.mjs <base> <level> <zoom-mult> <clip> <time> <out.png> [w] [h]"); process.exit(2); }
const browser = await launch();
try {
  const z = await fitZoom(browser, base, level);
  const { page, problems } = await openHero(browser, base, `level=${level}&zoom=${(z * +mult).toFixed(2)}`, { width: +w, height: +h });
  await posePage(page, clip, +t);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  for (const p of problems) console.error(p);
  console.log(out, `zoom ${(z * +mult).toFixed(2)}`);
  if (problems.length) process.exitCode = 1;
} finally { await browser.close(); }
