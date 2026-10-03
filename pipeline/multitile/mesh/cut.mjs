import fs from "node:fs";
import sharp from "sharp";

const HERE = new URL(".", import.meta.url).pathname;
const SRC = new URL("../", import.meta.url).pathname;
const CFG = { windmill: { grassY: 0, hueMax: 92 }, "canopy-tree": { grassY: 455, hueMax: 90 } };

const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
};

async function cut(item) {
  const c = CFG[item];
  const { data, info } = await sharp(`${SRC}${item}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H, keep = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], y = (i / W) | 0;
    if (Math.abs(r - 0x40) < 22 && Math.abs(g - 0x40) < 22 && Math.abs(b - 0x40) < 22) continue;
    const [h, s, v] = hsv(r, g, b);
    if (y >= c.grassY && h > 55 && h < c.hueMax && s > 0.3 && v > 0.45) continue;
    keep[i] = 1;
  }
  const comp = new Int32Array(N).fill(-1), sizes = [];
  for (let i = 0; i < N; i++) {
    if (!keep[i] || comp[i] >= 0) continue;
    const id = sizes.length, st = [i]; comp[i] = id; let n = 0;
    while (st.length) { const j = st.pop(); n++; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const k = Y * W + X; if (keep[k] && comp[k] < 0) { comp[k] = id; st.push(k); } } }
    sizes.push(n);
  }
  const big = sizes.indexOf(Math.max(...sizes));
  const a = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (comp[i] === big) a[i] = 255;
  const fill = new Uint8Array(N), q = [];
  for (let x = 0; x < W; x++) q.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) q.push(y * W, y * W + W - 1);
  for (const i of q) if (!a[i]) fill[i] = 1;
  const st = q.filter((i) => fill[i]);
  while (st.length) { const j = st.pop(), x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const k = Y * W + X; if (!a[k] && !fill[k]) { fill[k] = 1; st.push(k); } } }
  const rgba = Buffer.alloc(N * 4);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < N; i++) {
    const on = a[i] || (!fill[i] && (i / W | 0) < (c.holeY ?? H));
    if (!on) continue;
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = 255;
    const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const trimmed = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
  fs.writeFileSync(`${HERE}${item}.cut.png`, trimmed);
  const m = await sharp(trimmed).metadata(), side = Math.round(Math.max(m.width, m.height) * 1.2);
  const plate = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).composite([{ input: trimmed }]).flatten({ background: "#ffffff" }).resize(1024, 1024).png().toBuffer();
  fs.writeFileSync(`${HERE}${item}.plate.png`, plate);
  return `${item}: bbox ${x0},${y0}-${x1},${y1}`;
}

for (const it of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CFG)) console.log(await cut(it));
