import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "")).map((a) => { const i = a.indexOf("="); return i < 0 ? [a, "1"] : [a.slice(0, i), a.slice(i + 1)]; }));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const base = args.base || "http://localhost:8765";
const levels = (args.levels || "home,ember-subject").split(",");
const options = (args.options || "none,billboards").split(",");
const frames = +(args.frames || 300);
const [W, H] = (args.size || "900x800").split("x").map(Number);
const dprs = (args.dpr || "1,2").split(",").map(Number);
const extra = args.query ? "&" + args.query : "";
const hold = /(^|&)seq=hold(&|$)/.test(args.query || "");

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile"),
  args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});

const measure = (n) => {
  const g = window.__game, gl = g.renderer.three.gl, ctx = gl.getContext(), px = new Uint8Array(4);
  g.pause();
  gl.info.autoReset = false;
  const step = () => { gl.info.reset(); g.renderer.render(g.state, 0); ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px); };
  for (let i = 0; i < 20; i++) { window.__setTime(i / 60); step(); }
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) { window.__setTime(2 + i / 60); const t0 = performance.now(); step(); t[i] = performance.now() - t0; }
  const sorted = [...t].sort((a, c) => a - c);
  const info = gl.info.render;
  const seen = new Set();
  let bytes = 0;
  const texBytes = (tx) => {
    if (!tx || !tx.isTexture || seen.has(tx)) return;
    seen.add(tx);
    const img = tx.image || {};
    const w = img.width || 0, h = img.height || 0, d = img.depth || 1;
    const comp = { 1028: 1, 1030: 2, 1022: 3, 1023: 4 }[tx.format] ?? 4;
    const size = { 1016: 2, 1015: 4, 1009: 1 }[tx.type] ?? 1;
    const mip = tx.generateMipmaps && tx.minFilter !== 1006 && tx.minFilter !== 1003 ? 4 / 3 : 1;
    bytes += w * h * d * comp * size * mip;
  };
  g.renderer.three.scene.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) {
      for (const v of Object.values(m)) texBytes(v);
      for (const u of Object.values(m.uniforms || {})) texBytes(u.value);
    }
  });
  return { mean: t.reduce((a, c) => a + c, 0) / n, median: sorted[n >> 1], p95: sorted[Math.floor(n * 0.95)], calls: info.calls, tris: info.triangles, texMB: bytes / 1048576, cloudObjects: window.__clouds?.objects.length || 0 };
};

const rows = [];
try {
  for (const level of levels) for (const opt of options) {
    const row = { level, option: opt };
    for (const dpr of dprs) {
      const page = await b.newPage();
      const errors = [];
      await page.setCacheEnabled(false);
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.setViewport({ width: W, height: H, deviceScaleFactor: dpr });
      await page.goto(`${base}/3d/index.html?level=${level}${hold ? "&reset=1" : "&hero=0"}&ui=0&clouds=${opt}${extra}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.__done || window.__error, { timeout: 120000 });
      if (hold) await page.waitForFunction(() => window.__sequence?.state === "hold" || window.__error, { timeout: 120000 });
      const r = await page.evaluate(measure, frames);
      if (errors.length) console.error(level, opt, errors.join("\n"));
      row[`ms${dpr}`] = r.median; row[`mean${dpr}`] = r.mean; row[`p95_${dpr}`] = r.p95;
      Object.assign(row, { calls: r.calls, tris: r.tris, texMB: r.texMB });
      await page.close();
    }
    rows.push(row);
    console.error(JSON.stringify(row));
  }
} finally { await b.close(); }

for (const r of rows) {
  const n = rows.find((x) => x.level === r.level && x.option === "none");
  if (!n) continue;
  for (const d of dprs) r[`rel${d}`] = r[`ms${d}`] / n[`ms${d}`];
  r.dCalls = r.calls - n.calls; r.dTris = r.tris - n.tris; r.dTexMB = r.texMB - n.texMB;
}
const f = (v, k = 1) => (v == null ? "" : v.toFixed(k));
console.log(`| level | option | ${dprs.map((d) => `ms @${d}x | rel @${d}x`).join(" | ")} | cloud calls | cloud tris | cloud tex MB |`);
console.log(`| --- | --- | ${dprs.map(() => "--- | ---").join(" | ")} | --- | --- | --- |`);
for (const r of rows) console.log(`| ${r.level} | ${r.option} | ${dprs.map((d) => `${f(r[`ms${d}`])} | ${f(r[`rel${d}`], 2)}x`).join(" | ")} | ${r.dCalls} | ${r.dTris} | ${f(r.dTexMB)} |`);
if (args.out) fs.writeFileSync(args.out, JSON.stringify(rows, null, 1) + "\n");
