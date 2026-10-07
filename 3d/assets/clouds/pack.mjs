import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const RAW = path.join(ROOT, "out/clouds/raw");
const OUT = path.join(ROOT, "3d/assets/clouds");
const TILE = 512, GRID = 4, ROWS = 3, KINDS = ["tuft", "flat", "wisp"];

function keyImage({ data, info }) {
  const { width: W, height: H } = info, ch = info.channels;
  const K = [0, 0, 0];
  let n = 0;
  for (const [x0, y0] of [[0, 0], [W - 16, 0], [0, H - 16], [W - 16, H - 16]]) for (let y = y0; y < y0 + 16; y++) for (let x = x0; x < x0 + 16; x++) { const i = (y * W + x) * ch; K[0] += data[i]; K[1] += data[i + 1]; K[2] += data[i + 2]; n++; }
  for (let c = 0; c < 3; c++) K[c] /= n * 255;
  const a11 = 3, a12 = K[0] + K[1] + K[2], a22 = K[0] * K[0] + K[1] * K[1] + K[2] * K[2], det = a11 * a22 - a12 * a12;
  const lum = new Float32Array(W * H), alpha = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * ch, r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const b1 = r + g + b, b2 = r * K[0] + g * K[1] + b * K[2];
    const cp = (a22 * b1 - a12 * b2) / det, beta = (a11 * b2 - a12 * b1) / det;
    const a = Math.min(1, Math.max(0, 1 - beta));
    alpha[p] = a < 0.04 ? 0 : (a - 0.04) / 0.96;
    lum[p] = a > 0.01 ? Math.min(1, Math.max(0, cp / a)) : 0;
  }
  return { W, H, lum, alpha };
}

function components({ W, H, alpha }) {
  const S = 8, w = Math.ceil(W / S), h = Math.ceil(H / S), m = new Uint8Array(w * h);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.06) m[((y / S) | 0) * w + ((x / S) | 0)] = 1;
  const d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 0;
    for (let dy = -2; dy <= 2 && !on; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && m[Y * w + X]) { on = 1; break; } }
    d[y * w + x] = on;
  }
  const lab = new Int32Array(w * h).fill(-1), boxes = [];
  for (let s = 0; s < w * h; s++) {
    if (!d[s] || lab[s] >= 0) continue;
    const st = [s], b = { x0: w, y0: h, x1: 0, y1: 0, n: 0 };
    lab[s] = boxes.length;
    while (st.length) {
      const q = st.pop(), x = q % w, y = (q / w) | 0;
      b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); b.n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = Y * w + X; if (X >= 0 && Y >= 0 && X < w && Y < h && d[k] && lab[k] < 0) { lab[k] = boxes.length; st.push(k); } }
    }
    boxes.push(b);
  }
  return boxes.filter((b) => b.n > 60).map((b) => ({ x0: b.x0 * S, y0: b.y0 * S, x1: Math.min(W, (b.x1 + 1) * S), y1: Math.min(H, (b.y1 + 1) * S) }));
}

const atlas = Buffer.alloc(TILE * GRID * TILE * ROWS * 4);
const tiles = [];
const files = fs.readdirSync(RAW).filter((f) => /^tuft-\d+\.png$/.test(f)).sort();
for (const f of files) {
  const kind = KINDS[Number(f.match(/\d+/)[0])] || "tuft";
  const img = keyImage(await sharp(path.join(RAW, f)).raw().toBuffer({ resolveWithObject: true }));
  for (const b of components(img)) {
    if (tiles.length >= GRID * ROWS) break;
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0, side = Math.max(bw, bh) * 1.08;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, k = side / TILE;
    const t = tiles.length, ox = (t % GRID) * TILE, oy = ((t / GRID) | 0) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const sx = cx + (x + 0.5 - TILE / 2) * k, sy = cy + (y + 0.5 - TILE / 2) * k;
      let L = 0, A = 0;
      if (sx >= b.x0 && sy >= b.y0 && sx < b.x1 - 1 && sy < b.y1 - 1) {
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
        for (const [dx, dy, wgt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
          const p = (y0 + dy) * img.W + x0 + dx, a = img.alpha[p];
          A += a * wgt; L += img.lum[p] * a * wgt;
        }
        L = A > 1e-4 ? L / A : 0;
      }
      const ex = Math.min(x, TILE - 1 - x), ey = Math.min(y, TILE - 1 - y), edge = Math.min(1, Math.min(ex, ey) / 24);
      A *= edge * edge * (3 - 2 * edge);
      const o = ((oy + y) * TILE * GRID + ox + x) * 4, v = Math.round(L * 255);
      atlas[o] = v; atlas[o + 1] = v; atlas[o + 2] = v; atlas[o + 3] = Math.round(A * 255);
    }
    tiles.push({ kind, aspect: +(bw / bh).toFixed(3), src: f });
  }
}
await sharp(atlas, { raw: { width: TILE * GRID, height: TILE * ROWS, channels: 4 } }).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(OUT, "atlas.webp"));
fs.writeFileSync(path.join(OUT, "atlas.json"), JSON.stringify({ grid: [GRID, ROWS], tiles }, null, 1) + "\n");
await sharp(atlas, { raw: { width: TILE * GRID, height: TILE * ROWS, channels: 4 } }).flatten({ background: "#3a5a8a" }).resize(1024).jpeg().toFile(path.join(ROOT, "out/clouds/raw/atlas-preview.jpg"));
console.log(tiles.length, "tiles", tiles.map((t) => t.kind + ":" + t.aspect).join(" "));
