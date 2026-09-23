export function hashSeed(s) {
  let h = 2166136261 >>> 0;
  for (const ch of String(s ?? "")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const cellNoise = (seed, x, z) => mulberry32(hashSeed(seed) ^ Math.imul(x + 1, 73856093) ^ Math.imul(z + 1, 19349663))();

export function createRng(seed) {
  const next = mulberry32(typeof seed === "number" ? seed : hashSeed(seed));
  return {
    next,
    float: (a = 0, b = 1) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    u32: () => Math.floor(next() * 4294967296) >>> 0,
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    },
  };
}

export function valueNoise(seed) {
  const base = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  const lat = (i, j) => mulberry32(base ^ Math.imul(i + 7919, 73856093) ^ Math.imul(j + 104729, 19349663))();
  const ease = (t) => t * t * (3 - 2 * t);
  return (x, z) => {
    const i = Math.floor(x), j = Math.floor(z), sx = ease(x - i), sz = ease(z - j);
    const a = lat(i, j), b = lat(i + 1, j), c = lat(i, j + 1), d = lat(i + 1, j + 1);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
}
