import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { root, launch, openHero, fitZoom, posePage } from "./hero-lib.mjs";
import { DANCES, CLIP_DATA } from "../3d/clips.js";

const BASE = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const what = process.argv[3] || "all";
const OUT = path.join(root, "out/pass7");
fs.mkdirSync(OUT, { recursive: true });
const T = 480;
const label = (text) => Buffer.from(`<svg width="${T}" height="34"><rect width="${T}" height="34" fill="#1d1a24" opacity="0.82"/><text x="12" y="23" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="#fffaf0">${text}</text></svg>`);

const browser = await launch();
try {
  if (what === "all" || what === "sheet") {
    const tiles = [];
    for (const level of ["cat-medium", "ember-subject"]) {
      const z = await fitZoom(browser, BASE, level);
      for (const mult of [1, 6]) {
        const { page, problems } = await openHero(browser, BASE, `level=${level}&zoom=${(z * mult).toFixed(2)}`, { width: T, height: T });
        if (problems.length) throw new Error(problems.join("; "));
        for (const [clip, t, name] of [["idle", 0, "rest"], ["walk", 0.2, "mid-walk"]]) {
          await posePage(page, clip, t);
          const png = await page.screenshot();
          tiles.push(await sharp(png).composite([{ input: label(`${level}  ${mult}x  ${name}`), top: T - 34, left: 0 }]).png().toBuffer());
        }
        await page.close();
      }
    }
    const cols = 4, rows = Math.ceil(tiles.length / cols), gap = 6;
    await sharp({ create: { width: cols * T + (cols + 1) * gap, height: rows * T + (rows + 1) * gap, channels: 3, background: "#101014" } })
      .composite(tiles.map((input, i) => ({ input, left: gap + (i % cols) * (T + gap), top: gap + Math.floor(i / cols) * (T + gap) })))
      .jpeg({ quality: 90 }).toFile(path.join(OUT, "hero-sheet.jpg"));
    console.log(path.join(OUT, "hero-sheet.jpg"));
  }
  if (what === "all" || what === "dances") {
    const level = "cat-medium", fps = 30, each = 4;
    const z = await fitZoom(browser, BASE, level);
    const frames = path.join(OUT, "hero-dances-frames");
    fs.rmSync(frames, { recursive: true, force: true });
    fs.mkdirSync(frames, { recursive: true });
    let n = 0;
    for (const d of DANCES) {
      const { page, problems } = await openHero(browser, BASE, `level=${level}&zoom=${(z * 6).toFixed(2)}&clip=${d}`, { width: 720, height: 720 });
      if (problems.length) throw new Error(problems.join("; "));
      const dur = CLIP_DATA[d].duration;
      for (let i = 0; i < each * fps; i++) {
        const t = i / fps;
        await page.evaluate((tt) => window.__setTime(tt), t);
        await posePage(page, d, t % dur);
        const png = await page.screenshot();
        await sharp(png).composite([{ input: Buffer.from(`<svg width="720" height="40"><text x="16" y="28" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#fffaf0" stroke="#1d1a24" stroke-width="3" paint-order="stroke">${d}</text></svg>`), top: 0, left: 0 }]).toFile(path.join(frames, `f${String(n++).padStart(4, "0")}.png`));
      }
      await page.close();
    }
    const out = path.join(OUT, "hero-dances.mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out], { stdio: "inherit" });
    fs.rmSync(frames, { recursive: true, force: true });
    console.log(out, `${n} frames`);
  }
} finally {
  await browser.close();
}
