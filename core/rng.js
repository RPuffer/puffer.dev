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
