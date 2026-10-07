import { mulberry32 } from "../../core/rng.js";

export const NOISE_N = 64;

export function bakeNoise(N = NOISE_N) {
  const rnd = mulberry32(1337);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const perlin = (x, y, z, P) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
    const u = fade(fx), v = fade(fy), w = fade(fz);
    let out = 0;
    for (let c = 0; c < 8; c++) {
      const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
      const g = G[perm[perm[perm[(X + dx) % P] + ((Y + dy) % P)] + ((Z + dz) % P)] % 12];
      const d = g[0] * (fx - dx) + g[1] * (fy - dy) + g[2] * (fz - dz);
      out += d * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    }
    return out;
  };
  const feat = new Map();
  const point = (i, j, k, P) => {
    const key = `${P}:${i},${j},${k}`;
    let p = feat.get(key);
    if (!p) { const h = perm[perm[perm[i % 256] + (j % 256)] + (k % 256)]; const r = mulberry32(h * 7919 + P); p = [r(), r(), r()]; feat.set(key, p); }
    return p;
  };
  const worley = (x, y, z, P) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    let best = 9;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const p = point(((X + i) % P + P) % P, ((Y + j) % P + P) % P, ((Z + k) % P + P) % P, P);
      const dx = X + i + p[0] - x, dy = Y + j + p[1] - y, dz = Z + k + p[2] - z, d = dx * dx + dy * dy + dz * dz;
      if (d < best) best = d;
    }
    return 1 - Math.min(1, Math.sqrt(best));
  };
  const data = new Uint8Array(N * N * N * 2);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, w = z / N;
    let pf = 0, amp = 1, tot = 0;
    for (let o = 0; o < 3; o++) { const f = 4 << o; pf += amp * perlin(u * f, v * f, w * f, f); tot += amp; amp *= 0.5; }
    pf = pf / tot * 0.5 + 0.5;
    const w1 = worley(u * 4, v * 4, w * 4, 4), w2 = worley(u * 8, v * 8, w * 8, 8), w3 = worley(u * 16, v * 16, w * 16, 16);
    const wf = w1 * 0.625 + w2 * 0.25 + w3 * 0.125;
    const pw = Math.min(1, Math.max(0, (pf - (wf - 1)) / (1 - (wf - 1)) * 1.4 - 0.45));
    const det = w2 * 0.5 + w3 * 0.35 + worley(u * 32, v * 32, w * 32, 32) * 0.15;
    const o = (z * N * N + y * N + x) * 2;
    data[o] = Math.round(pw * 255); data[o + 1] = Math.round(det * 255);
  }
  for (const c of [0, 1]) {
    const hist = new Uint32Array(256), n = N * N * N;
    for (let i = c; i < data.length; i += 2) hist[data[i]]++;
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc < n * 0.01) lo = v; if (acc < n * 0.995) hi = v + 1; }
    for (let i = c; i < data.length; i += 2) data[i] = Math.round(Math.min(1, Math.max(0, (data[i] - lo) / (hi - lo))) * 255);
  }
  return data;
}
