import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [ref, render, prefix] = process.argv.slice(2);
if (!ref || !render) { console.error("usage: node tools/compare.mjs <ref.png> <render.png> [outPrefix]"); process.exit(2); }
const meta = await sharp(ref).metadata();
const W = meta.width, H = meta.height;
const load = (f) => sharp(f).flatten({ background: "#000" }).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
const g = await load(ref), r = await load(render);
const bgOf = (b) => { const i = 3 * (2 * W + 2); return [b[i], b[i + 1], b[i + 2]]; };
const gbg = bgOf(g), rbg = bgOf(r);

let mad = 0;
const gl = new Float64Array(W * H), rl = new Float64Array(W * H);
for (let i = 0, p = 0; i < g.length; i += 3, p++) {
  mad += Math.abs(g[i] - r[i]) + Math.abs(g[i + 1] - r[i + 1]) + Math.abs(g[i + 2] - r[i + 2]);
  gl[p] = 0.299 * g[i] + 0.587 * g[i + 1] + 0.114 * g[i + 2];
  rl[p] = 0.299 * r[i] + 0.587 * r[i + 1] + 0.114 * r[i + 2];
}
mad /= g.length;
const mean = (a) => { let s = 0; for (const v of a) s += v; return s / a.length; };
const mg = mean(gl), mr = mean(rl);
let num = 0, dg = 0, dr = 0;
for (let i = 0; i < gl.length; i++) { num += (gl[i] - mg) * (rl[i] - mr); dg += (gl[i] - mg) ** 2; dr += (rl[i] - mr) ** 2; }
const ncc = num / Math.sqrt(dg * dr || 1);

let agree = 0;
for (let i = 0; i < g.length; i += 3) {
  const gb = Math.abs(g[i] - gbg[0]) + Math.abs(g[i + 1] - gbg[1]) + Math.abs(g[i + 2] - gbg[2]) < 30;
  const rb = Math.abs(r[i] - rbg[0]) + Math.abs(r[i + 1] - rbg[1]) + Math.abs(r[i + 2] - rbg[2]) < 30;
  if (gb === rb) agree++;
}
agree /= g.length / 3;

if (prefix) {
  fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
  const s = Math.max(1, Math.round(600 / H));
  const w = W * s, h = H * s;
  const A = await sharp(ref).resize(w, h, { fit: "fill", kernel: "nearest" }).removeAlpha().png().toBuffer();
  const B = await sharp(render).resize(w, h, { fit: "fill", kernel: "nearest" }).removeAlpha().png().toBuffer();
  await sharp({ create: { width: w * 2 + 8, height: h, channels: 3, background: "#ff00ff" } })
    .composite([{ input: A, left: 0, top: 0 }, { input: B, left: w + 8, top: 0 }]).jpeg({ quality: 88 }).toFile(prefix + "-side.jpg");
  const Bh = await sharp(B).ensureAlpha(0.5).png().toBuffer();
  await sharp(A).composite([{ input: Bh, blend: "over" }]).jpeg({ quality: 88 }).toFile(prefix + "-overlay.jpg");
}
console.log(`MAD ${mad.toFixed(1)}  NCC ${ncc.toFixed(3)}  silhouette ${(100 * agree).toFixed(1)}%`);
