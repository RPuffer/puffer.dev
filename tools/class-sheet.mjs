import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { root, launch } from "./hero-lib.mjs";

const BASE = (process.env.QA_BASE || "http://localhost:8765").replace(/\/$/, "");
const OLD = process.env.OLD_BASE || "";
const OUT = process.env.OUT || path.join(root, "out/class-models/v2");
const CONCEPTS = process.env.CONCEPTS || path.join(os.homedir(), "dev/cauldron/fortress/review/resolved/puffer-isoworld-class-models");
const what = new Set((process.argv[2] || "sheet,perf,walk").split(","));
const CLASSES = [
  ["wanderer", "Ink Wraith", "wretch-1.png"],
  ["aws", "Gate Sentinel", "aws-1.png"],
  ["dutchie", "Delivery Rover", "dutchie-1.png"],
  ["nm", "Mainframe Golem", "nm-1.png"],
];
const LEVEL = process.env.LEVEL || "cat-medium";
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3 };
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(b, url, view) {
  const page = await b.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  await page.setViewport(view);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 120000, polling: 200 });
  const err = await page.evaluate(() => window.__error || null);
  if (err) problems.push("error " + err);
  return { page, problems };
}

const heroAt = (page) => page.evaluate(async () => {
  const THREE = await import("three");
  const g = window.__game, cam = g.renderer.three.camera, hero = g.renderer.three.scene.children.find((o) => o.userData?.animate);
  const v = new THREE.Vector3();
  hero.getWorldPosition(v);
  v.y += 0.6 * hero.scale.y;
  v.project(cam);
  const c = g.renderer.three.gl.domElement.getBoundingClientRect();
  return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height];
});

async function crop(page, w, h, dy = -0.35) {
  const [x, y] = await heroAt(page);
  const v = page.viewport();
  const left = Math.max(0, Math.min(v.width - w, x - w / 2)), top = Math.max(0, Math.min(v.height - h, y - h * 0.5));
  return page.screenshot({ clip: { x: left, y: top, width: w, height: h } });
}

const still = async (page) => { await wait(2500); };

const label = (w, h, text, size = 17) => Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#1d1a2e"/><text x="14" y="${Math.round(h * 0.68)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="#fffaf0">${text}</text></svg>`);

async function turnaround(b, cls, clip = "idle", t = 0.4) {
  const { page, problems } = await open(b, `${BASE}/3d/turnaround.html?class=${cls}&clip=${clip}&t=${t}`, { width: 1200, height: 420, deviceScaleFactor: 1 });
  const stats = await page.evaluate(() => window.__stats);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 420 } });
  await page.close();
  return { png, stats, problems };
}

async function inGame(b, cls) {
  const q = `level=${LEVEL}&reset=1&ui=0&nav=0&class=${cls}`;
  const { page, problems } = await open(b, `${BASE}/3d/index.html?${q}`, PHONE);
  await still(page);
  const full = await page.screenshot();
  const phone = await crop(page, 130, 200);
  await page.evaluate(async () => {
    const { highlight } = await import("/3d/highlight.js");
    const { RIDE_GLOW } = await import("/3d/renderer.js");
    const g = window.__game, hero = g.renderer.three.scene.children.find((o) => o.userData?.animate);
    highlight(hero, RIDE_GLOW);
  });
  await wait(600);
  const ride = await crop(page, 130, 200);
  await page.close();
  const x = await open(b, `${BASE}/3d/index.html?level=home&spawn=0,1&reset=1&ui=0&nav=0&occlude=circle&class=${cls}`, PHONE);
  await wait(1200);
  const shoot = async (flag) => {
    await x.page.evaluate((f) => { window.__game.state.params.xray = f; }, flag);
    await wait(700);
    return crop(x.page, 130, 200);
  };
  const off = await shoot("0"), on = await shoot("1");
  const [A, B] = await Promise.all([sharp(off).removeAlpha().raw().toBuffer(), sharp(on).removeAlpha().raw().toBuffer()]);
  let diff = 0;
  for (let i = 0; i < A.length; i += 3) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) diff++;
  await x.page.close();
  return { full, phone, ride, xray: on, xrayDiff: diff, problems: [...problems, ...x.problems] };
}

const measure = (n) => {
  const g = window.__game, gl = g.renderer.three.gl, ctx = gl.getContext(), px = new Uint8Array(4);
  g.pause();
  gl.info.autoReset = false;
  const step = () => { gl.info.reset(); g.renderer.render(g.state, 0); ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px); };
  for (let i = 0; i < 20; i++) { window.__setTime(i / 60); step(); }
  const t = [];
  for (let i = 0; i < n; i++) { window.__setTime(2 + i / 60); const t0 = performance.now(); step(); t.push(performance.now() - t0); }
  t.sort((a, c) => a - c);
  let heroTris = 0, heroCalls = 0;
  const hero = g.renderer.three.scene.children.find((o) => o.userData?.animate);
  hero?.traverse((o) => { if (o.isMesh && o.visible) { heroCalls++; heroTris += o.geometry.attributes.position.count / 3; } });
  return { median: t[n >> 1], p95: t[Math.floor(n * 0.95)], calls: gl.info.render.calls, tris: gl.info.render.triangles, heroTris, heroCalls };
};

async function perf(b) {
  const rows = [];
  const runs = [["none", BASE, "&hero=0"], ["default", BASE, ""], ...CLASSES.map(([c]) => [c, BASE, `&class=${c}`])];
  if (OLD) runs.push(...CLASSES.map(([c]) => [`old-${c}`, OLD, `&class=${c}`]));
  for (let rep = 0; rep < 2; rep++) for (const [name, base, extra] of runs) {
    const { page, problems } = await open(b, `${base}/3d/index.html?level=${LEVEL}&reset=1&ui=0${extra}`, { width: 390, height: 844, deviceScaleFactor: 2 });
    const r = await page.evaluate(measure, 240);
    if (problems.length) r.problems = problems.slice(0, 2);
    await page.close();
    const prev = rows.find((x) => x.name === name);
    if (prev) { prev.median = Math.min(prev.median, r.median); prev.p95 = Math.min(prev.p95, r.p95); }
    else rows.push({ name, ...r });
  }
  for (const r of rows) console.log(JSON.stringify(r));
  fs.writeFileSync(path.join(OUT, "perf.json"), JSON.stringify(rows, null, 1) + "\n");
  return rows;
}

async function walk(b, cls) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `walk-${cls}-`));
  const { page } = await open(b, `${BASE}/3d/turnaround.html?class=${cls}&clip=walk&yaw=30,300&w=480&h=560`, { width: 960, height: 560, deviceScaleFactor: 1 });
  const fps = 30, n = fps * 4;
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.__setTime(t), i / fps);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 960, height: 560 } });
  }
  await page.close();
  const out = path.join(OUT, `walk-${cls}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(out);
}

const b = await launch();
try {
  let rows = [];
  if (what.has("perf")) rows = await perf(b);
  else if (fs.existsSync(path.join(OUT, "perf.json"))) rows = JSON.parse(fs.readFileSync(path.join(OUT, "perf.json"), "utf8"));
  if (what.has("walk")) for (const [c] of CLASSES) await walk(b, c);
  if (what.has("sheet")) {
    const RH = 420, LH = 36, tiles = [];
    let y = 0;
    const W = 300 + 1200 + 3 * 270 + 20;
    const none = rows.find((r) => r.name === "none");
    for (const [cls, title, file] of CLASSES) {
      const t = await turnaround(b, cls);
      const g = await inGame(b, cls);
      const probs = [...t.problems, ...g.problems];
      fs.writeFileSync(path.join(OUT, `game-${cls}.png`), g.full);
      const p = rows.find((r) => r.name === cls), o = rows.find((r) => r.name === `old-${cls}`);
      const ms = p && none ? `frame ${p.median.toFixed(1)} ms vs ${none.median.toFixed(1)} no hero${o ? `, ${o.median.toFixed(1)} old model` : ""}` : "";
      const head = `${title}  (${cls})   ${t.stats.tris} tris, ${t.stats.calls} meshes, ${t.stats.height.toFixed(2)} tall, x ${t.stats.x.map((v) => v.toFixed(2)).join("..")}, z ${t.stats.z.map((v) => v.toFixed(2)).join("..")}   ${ms}   x-ray ${g.xrayDiff}px${probs.length ? "   ERR " + probs[0].replace(/[<>&]/g, "") : ""}`;
      tiles.push({ input: label(W, LH, head), left: 0, top: y });
      y += LH;
      const concept = await sharp(path.join(CONCEPTS, file)).resize({ height: RH, width: 300, fit: "contain", background: "#2e2a4a" }).png().toBuffer();
      tiles.push({ input: concept, left: 0, top: y }, { input: t.png, left: 300, top: y });
      const cell = async (buf, i, cap) => {
        tiles.push({ input: await sharp(buf).resize({ width: 260, height: 400 }).png().toBuffer(), left: 1500 + 10 + i * 270, top: y + 4 });
        tiles.push({ input: label(260, 24, cap, 13), left: 1500 + 10 + i * 270, top: y + 4 });
      };
      await cell(g.phone, 0, "phone 390x844 @3x, idle");
      await cell(g.ride, 1, "lift ride glow");
      await cell(g.xray, 2, "x-ray window on");
      y += RH;
    }
    const file = path.join(OUT, "compare-sheet.png");
    await sharp({ create: { width: W, height: y, channels: 3, background: "#2e2a4a" } }).composite(tiles).png().toFile(file);
    console.log(file);
  }
} finally { await b.close(); }
