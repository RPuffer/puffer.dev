import fs from "node:fs";
import path from "node:path";
import { root, launch } from "./hero-lib.mjs";

const BASE = (process.env.QA_BASE || "http://localhost:8765").replace(/\/$/, "");
const OUT = process.env.OUT || path.join(root, "out/class-models/v2");
const classes = process.argv.slice(2).length ? process.argv.slice(2) : ["wanderer", "aws", "dutchie", "nm"];
const extra = process.env.Q || "";
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
try {
  for (const c of classes) {
    const page = await b.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.setViewport({ width: 1200, height: 420, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/3d/turnaround.html?class=${c}${extra}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__done || window.__error, { timeout: 60000 }).catch(() => {});
    const s = await page.evaluate(() => window.__stats || null);
    const perr = await page.evaluate(() => window.__error || null);
    if (perr) errors.push(perr);
    const file = path.join(OUT, `turn-${c}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1200, height: 420 } });
    console.log(c, JSON.stringify(s ? { tris: s.tris, calls: s.calls, h: +s.height.toFixed(2), x: s.x.map((v) => +v.toFixed(2)), z: s.z.map((v) => +v.toFixed(2)), parts: s.audit.parts, head: s.audit.headRatio && +s.audit.headRatio.toFixed(2) } : null), errors.join(" | "));
    await page.close();
  }
} finally { await b.close(); }
