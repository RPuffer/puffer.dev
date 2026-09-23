import fs from "node:fs";
import sharp from "sharp";
import { ALL } from "./specs.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const RAW = HERE + "raw/";
const OUT = new URL("../assets/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const TW = 128, TOP = Math.round(TW * Math.tan(Math.PI / 6) / 2), STEP = 84;
const pick = JSON.parse(fs.existsSync(HERE + "picks.json") ? fs.readFileSync(HERE + "picks.json", "utf8") : "{}");
const SIZE = { "tree-pine": 2.4, "tree-round": 2.2, "tree-orange": 2.2, bush: 0.55, rock: 0.3, "rock-big": 0.8, well: 1.7, fence: 0.4, "fence-post": 0.4, barrel: 0.5, pot: 0.38, crate: 0.5, chest: 0.45, mushroom: 0.38, flower: 0.26, coin: 0.36, gem: 0.34, torch: 0.95, campfire: 0.5, signpost: 0.7, "stepping-stones": 0.16, log: 0.36, lantern: 0.95, hero: 0.85, stump: 0.42, ladder: 1.35, scaffold: 1.9 };
const MAXW = { "tree-pine": 1.1, "tree-round": 1.25, "tree-orange": 1.25, well: 0.8, fence: 0.9, "stepping-stones": 0.9, log: 0.8, campfire: 0.75, bush: 0.7, "rock-big": 0.8, stump: 0.6, ladder: 0.6, scaffold: 0.9 };
const FLOAT = { coin: 30, gem: 30 };
const MIRROR = { "tile-ramp-s": ["tile-ramp-e", "e"], "tile-ramp-w": ["tile-ramp-n", "n"], "tile-bridge-z": ["tile-bridge-x", "x"], "tile-bridge-logs-z": ["tile-bridge-logs-x", "logs-x"], "hero-front-0": ["hero-right-0", "right-0"], "hero-front-1": ["hero-right-1", "right-1"], "hero-back-0": ["hero-left-0", "left-0"], "hero-back-1": ["hero-left-1", "left-1"] };
const ROTATES = new Set(["fence", "chest", "signpost", "waterfall", "log", "ladder", "stump"]);

const latest = (id) => { if (pick[id] != null) return `${RAW}${id}.${pick[id]}.png`; const f = fs.readdirSync(RAW).filter((n) => n.startsWith(id + ".") && n.endsWith(".png")).sort((a, b) => +b.split(".")[1] - +a.split(".")[1]); return f[0] ? RAW + f[0] : null; };

async function key(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info, N = W * H;
  const mag = new Float32Array(N);
  for (let i = 0; i < N; i++) { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]; mag[i] = Math.max(255 - r, g, 255 - b, Math.abs(r - b) * 0.8); }
  const bg = new Uint8Array(N), q = [];
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) q.push(y * W + x);
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) q.push(y * W + x);
  for (const i of q) bg[i] = mag[i] < 110 ? 1 : 0;
  const st = q.filter((i) => bg[i]);
  while (st.length) { const i = st.pop(); const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!bg[j] && mag[j] < 110) { bg[j] = 1; st.push(j); } } }
  for (let i = 0; i < N; i++) if (mag[i] < 70) bg[i] = 1;
  let a = new Uint8Array(N); for (let i = 0; i < N; i++) a[i] = bg[i] ? 0 : 255;
  for (let pass = 0; pass < 3; pass++) { const b2 = a.slice(); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (a[i] && (!a[i - 1] || !a[i + 1] || !a[i - W] || !a[i + W])) b2[i] = 0; } a = b2; }
  const comp = new Int32Array(N).fill(-1), sizes = [];
  for (let i = 0; i < N; i++) { if (!a[i] || comp[i] >= 0) continue; const id = sizes.length; let n = 0; const st2 = [i]; comp[i] = id; while (st2.length) { const j = st2.pop(); n++; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k2 = ny * W + nx; if (a[k2] && comp[k2] < 0) { comp[k2] = id; st2.push(k2); } } } sizes.push(n); }
  const big = Math.max(0, ...sizes);
  for (let i = 0; i < N; i++) if (a[i] && sizes[comp[i]] < big * 0.004) a[i] = 0;
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    if (a[i] && mag[i] < 170) { const m = Math.min(r, b); const excess = Math.max(0, m - g - 30); r -= excess * 0.6; b -= excess * 0.6; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a[i];
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const buf = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch }).png().toBuffer();
  return { buf, w: cw, h: ch };
}

async function alphaRows(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < info.height; y++) { let l = -1, r = -1; for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) { if (l < 0) l = x; r = x; } rows.push([l, r]); }
  return { rows, w: info.width, h: info.height };
}

async function stack(buf, w, bands) {
  const parts = []; let top = 0;
  for (const [s0, s1, t] of bands) { const hh = s1 - s0; if (hh < 1 || t < 1) continue; parts.push({ input: await sharp(buf).extract({ left: 0, top: s0, width: w, height: hh }).resize(TW, t, { fit: "fill", kernel: "lanczos3" }).png().toBuffer(), left: 0, top }); top += t; }
  return sharp({ create: { width: TW, height: top, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(parts).png().toBuffer();
}

async function tile(k, side = STEP) {
  const { rows, w, h } = await alphaRows(k.buf);
  let cy = rows.findIndex(([l, r]) => r - l + 1 >= w * 0.97);
  if (cy < 0) cy = Math.round(w * 0.29);
  const s = TW / w;
  const lower = Math.min(h, 2 * cy);
  const sideT = side == null ? Math.round((h - lower) * s) : side;
  const buf = await stack(k.buf, w, [[0, cy, TOP], [cy, lower, TOP], [lower, h, sideT]]);
  return { buf, w: TW, h: 2 * TOP + sideT, anchor: [TW / 2, TOP], meta: { rawCornerRow: cy, rawW: w, rawH: h } };
}

async function prop(k, type) {
  const s = Math.min((SIZE[type] * TW) / k.h, ((MAXW[type] || 1) * TW) / k.w);
  const w = Math.max(1, Math.round(k.w * s)), h = Math.max(1, Math.round(k.h * s));
  const buf = await sharp(k.buf).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
  const { rows } = await alphaRows(buf);
  let yb = h - 1; while (yb > 0 && rows[yb][0] < 0) yb--;
  const band = Math.max(2, Math.round(h * 0.06));
  let l = w, r = 0; for (let y = yb - band; y <= yb; y++) if (y >= 0 && rows[y][0] >= 0) { l = Math.min(l, rows[y][0]); r = Math.max(r, rows[y][1]); }
  const wb = Math.max(0, r - l + 1);
  let ax = Math.round((l + r) / 2), ay = Math.round(yb - Math.min(TOP, wb * 0.2887));
  if (FLOAT[type]) { ax = Math.round(w / 2); ay = h + FLOAT[type]; }
  return { buf, w, h, anchor: [ax, ay] };
}

const manifest = [];
const emit = async (id, type, variant, cat, res, extra = {}) => {
  const file = `${id}.png`;
  fs.writeFileSync(OUT + file, res.buf);
  manifest.push({ id, type, variant, cat, file, w: res.w, h: res.h, anchor: res.anchor, footprint: [1, 1], ...extra });
};
const flip = async (res) => ({ ...res, buf: await sharp(res.buf).flop().png().toBuffer(), anchor: [res.w - res.anchor[0], res.anchor[1]] });

const only = process.argv.slice(2);
for (const spec of ALL) {
  const f = latest(spec.id);
  if (!f) { console.log("MISSING", spec.id); continue; }
  const k = await key(f);
  let res, type = spec.type, variant = spec.variant, cat = "decor", extra = {};
  if (spec.type === "tile") { res = await tile(k); type = spec.variant; variant = 0; cat = "tile"; extra = { plane: "top", step: STEP }; }
  else if (spec.type === "ramp") { const away = spec.variant === "w"; const hh = away ? 2 * TOP + STEP - TOP : 2 * TOP + STEP; res = { buf: await sharp(k.buf).resize(TW, hh, { fit: "fill", kernel: "lanczos3" }).png().toBuffer(), w: TW, h: hh, anchor: [TW / 2, away ? 0 : TOP] }; cat = "tile"; extra = { plane: "top", step: STEP, dir: spec.variant }; }
  else if (spec.type === "bridge") { res = await tile(k, null); cat = "tile"; extra = { plane: "top", axis: spec.variant }; }
  else if (spec.type === "waterfall") { res = await tile(k); extra = { plane: "top", step: STEP, rot: 0 }; }
  else if (spec.type === "character") { res = await prop(k, "hero"); type = "hero"; cat = "character"; }
  else { res = await prop(k, spec.type); if (ROTATES.has(spec.type)) extra = { rot: 0 }; }
  delete res.meta;
  await emit(spec.id, type, variant, cat, res, extra);
  if (MIRROR[spec.id]) { const [mid, mv] = MIRROR[spec.id]; const e2 = { ...extra }; if (e2.dir) e2.dir = mv; if (e2.axis) e2.axis = mv; await emit(mid, type, mv, cat, await flip(res), e2); }
  if (ROTATES.has(spec.type)) await emit(spec.id.replace(/(-\d+)?$/, (m) => `${m}-r1`), type, variant, cat, await flip(res), { ...extra, rot: 1 });
}
const doc = { tileWidth: TW, topFaceHeight: 2 * TOP, blockStep: STEP, refTileWidth: 44, refBlockStep: 29, scaleFromRef: +(TW / 44).toFixed(4), anchorNote: "anchor is the pixel of the standing cell's top-face rhombus centre (tiles: at the tile's own top plane; decor and hero: on the ground plane under them; coin and gem float 30 px above it)", sprites: manifest };
fs.writeFileSync(OUT + "manifest.json", JSON.stringify(doc, null, 1));
console.log("sprites", manifest.length);
