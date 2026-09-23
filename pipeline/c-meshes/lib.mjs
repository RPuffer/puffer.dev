import fs from "node:fs";
import { execSync } from "node:child_process";
import sharp from "sharp";

export const HERE = new URL(".", import.meta.url).pathname;
export const ROOT = new URL("../../", import.meta.url).pathname;
export const CAP = 25;

export const secret = (acct) => { try { return execSync(`security find-generic-password -s dev.blacksmith.generator -a ${acct} -w`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };

export function spent() {
  const f = HERE + "ledger.jsonl";
  if (!fs.existsSync(f)) return 0;
  return fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).usd || 0).reduce((a, b) => a + b, 0);
}

export function charge(entry) {
  if (spent() + (entry.usd || 0) > CAP) throw new Error(`cap $${CAP} reached`);
  fs.appendFileSync(HERE + "ledger.jsonl", JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");
}

export function guard(usd) { if (spent() + usd > CAP) throw new Error(`cap $${CAP} would be exceeded (spent ${spent().toFixed(3)})`); }

export const TYPES = {
  "bare-trunk-tall": { from: "motif", name: "bare-trunk-tall" },
  "leaning-trunk": { from: "motif", name: "leaning-trunk" },
  "fallen-log": { from: "motif", name: "fallen-log" },
  "root-tangle": { from: "motif", name: "root-tangle" },
  "mist-bank": { from: "motif", name: "mist-bank" },
  "mossy-stump": { from: "motif", name: "mossy-stump" },
  "fire-bird": { from: "creature", name: "fire-bird-spirit" },
  "flame-wisp": { from: "creature", name: "flame-wisp" },
  "forest-tree": { from: "tree", name: "tree-round" },
};

export function specFor(brief, type) {
  const t = TYPES[type];
  if (t.from === "motif") return brief.motifs.find((m) => m.name === t.name);
  if (t.from === "creature") return brief.creatures.find((m) => m.name === t.name);
  const P = brief.palette.translation;
  return { name: type, height: 2.2, footprint: [1, 1], passable: false, shape: { summary: "A round-canopy forest tree: a short thick dark trunk under a chunky canopy of three or four stacked rounded leaf cubes, clustered like the pack's round tree.", parts: [{ tones: [...P.treeLeaf, ...P.trunk] }] } };
}

export function tonesOf(spec) {
  const s = new Set();
  for (const p of spec.shape.parts || []) for (const t of p.tones || []) s.add(t.toLowerCase());
  return [...s];
}

export async function key(file) {
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
  for (let i = 0; i < N; i++) { if (!a[i] || comp[i] >= 0) continue; const id = sizes.length; let n = 0; const s2 = [i]; comp[i] = id; while (s2.length) { const j = s2.pop(); n++; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k2 = ny * W + nx; if (a[k2] && comp[k2] < 0) { comp[k2] = id; s2.push(k2); } } } sizes.push(n); }
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
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}

const h2r = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const r2h = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mixHex = (a, b, t) => r2h(h2r(a).map((v, i) => v + (h2r(b)[i] - v) * t));

export async function liftedPalette(brief, t) {
  const { PALETTE } = await import("../../3d/palette.js");
  const map = {}, out = {};
  const walk = (src, ref) => {
    if (typeof src === "string") { if (!/^#[0-9a-f]{6}$/i.test(src) || typeof ref !== "string") return src; const m = mixHex(src, ref, t); map[src.toLowerCase()] = m; return m; }
    if (Array.isArray(src)) return src.map((v, i) => walk(v, Array.isArray(ref) ? ref[Math.min(i, ref.length - 1)] : undefined));
    if (src && typeof src === "object") return Object.fromEntries(Object.entries(src).map(([k, v]) => [k, walk(v, ref?.[k])]));
    return src;
  };
  for (const [k, v] of Object.entries(brief.palette.translation)) if (k !== "bg") out[k] = walk(v, PALETTE[k]);
  return { palette: out, map };
}
