import { mixHex } from "../prims.js";

export const RAIL_MAX = 4;
export const RAIL_H = { hedge: 0.85, rockwall: 0.7, masonry: 0.95, coral: 0.9, logs: 0.75, bone: 0.95 };
export const RAIL_MATERIALS = Object.keys(RAIL_H);
export const railType = (mat, n) => `rail-${mat}-${n}`;

const pick = (v, k, d) => (Array.isArray(v) ? v[Math.min(k, v.length - 1)] : typeof v === "string" ? v : d);
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

export function railLook(pal = {}) {
  const leaf = pal.treeMint || pal.treeLime || pal.bushTeal || ["#68e09e", "#5ac389", "#44a46b"];
  const rock = pal.rock || ["#e3e3e3", "#d4d4d4", "#ababab", "#8f8f8f"];
  const well = pal.wellStone || ["#dbc9a2", "#c7b693", "#b1a483"];
  const wood = pal.wood || {};
  const coral = [pick(pal.berry, 0, "#fe738f"), pick(pal.flowerOrange, 0, "#ff831d"), pick(pal.berry, 1, "#f45f7d"), pick(pal.gold, 0, "#f1b900")];
  return {
    leaf: [pick(leaf, 0), pick(leaf, 1), pick(leaf, 2)],
    flower: pick(pal.flowerOrange, 0, "#ff831d"),
    rock: [pick(rock, 1), pick(rock, 2), pick(rock, 3)],
    well: [pick(well, 0), pick(well, 1), pick(well, 2)],
    moss: pick(leaf, 1),
    wood: [wood.light || "#ff831d", wood.mid || "#dc7016", wood.dark || "#bd4c0b", wood.end || "#f6d881"],
    coral,
    bone: ["#f3ead2", "#ddd0ae", "#b8aa86"],
  };
}

function hedge(K, L, n) {
  const x0 = -n / 2;
  K.part("hedge", {}, () => {
    K.rbox(n - 0.06, 0.5, 0.5, L.leaf[2], 0, 0, 0);
    for (let i = 0; i < n * 2; i++) {
      const x = x0 + 0.25 + i * 0.5, j = hash(i, n);
      K.rbox(0.52, 0.32 + j * 0.08, 0.46, i % 2 ? L.leaf[1] : L.leaf[0], x, 0.44, (j - 0.5) * 0.06);
    }
    for (let i = 0; i < n; i++) K.rbox(0.08, 0.06, 0.08, L.flower, x0 + 0.3 + i + hash(i, 3) * 0.4, 0.82, (hash(i, 9) - 0.5) * 0.3);
  });
}

function rockwall(K, L, n) {
  const x0 = -n / 2;
  K.part("wall", {}, () => {
    for (let r = 0; r < 3; r++) {
      let x = x0 + 0.02 + (r % 2) * 0.12;
      for (let i = 0; x < -x0 - 0.06 && i < 20; i++) {
        const j = hash(i + r * 13, n), w = Math.min(-x0 - 0.02 - x, 0.3 + j * 0.25);
        K.rbox(w - 0.03, 0.22, 0.46 - r * 0.06, L.rock[(i + r) % 3], x + w / 2, r * 0.23, (j - 0.5) * 0.04);
        x += w;
      }
    }
    for (let i = 0; i < n; i++) K.rbox(0.3, 0.05, 0.22, L.moss, x0 + 0.35 + i + hash(i, 4) * 0.3, 0.69, 0.04);
  });
}

function masonry(K, L, n) {
  const x0 = -n / 2;
  K.part("ruin", {}, () => {
    K.rbox(n - 0.04, 0.14, 0.5, L.rock[2], 0, 0, 0);
    for (let i = 0; i < n * 3; i++) {
      const x = x0 + 1 / 6 + i / 3, j = hash(i, n + 1), top = 0.3 + j * 0.62;
      for (let y = 0.14, k = 0; y < top; y += 0.2, k++) K.rbox(0.3, Math.min(0.18, top - y), 0.4, (i + k) % 2 ? L.well[0] : L.well[1], x + (k % 2 ? 0.02 : -0.02), y, 0);
    }
    K.rbox(0.28, 0.16, 0.28, L.well[2], x0 + 0.5 + hash(n, 7) * (n - 1), 0, 0.34);
    for (let i = 0; i < n; i++) K.rbox(0.22, 0.04, 0.3, L.moss, x0 + 0.4 + i, 0.32 + hash(i, 2) * 0.3, 0.03);
  });
}

function coral(K, L, n) {
  const x0 = -n / 2;
  K.part("reef", {}, () => {
    K.rbox(n - 0.06, 0.18, 0.46, L.rock[1], 0, 0, 0);
    for (let i = 0; i < n * 3; i++) {
      const x = x0 + 1 / 6 + i / 3, j = hash(i, n + 5), h = 0.4 + j * 0.45, c = L.coral[i % L.coral.length];
      K.taper(0.14, 0.14, 0.07, 0.07, h, c, x, 0.16, (j - 0.5) * 0.18, (hash(i, 1) - 0.5) * 0.12, 0);
      K.cone(0.07, 0, 0.18, c, x + (hash(i, 1) - 0.5) * 0.12, 0.16 + h, (j - 0.5) * 0.18, 5);
      if (i % 2) K.taper(0.08, 0.08, 0.05, 0.05, h * 0.5, mixHex(c, "#ffffff", 0.2), x + 0.08, 0.3, (j - 0.5) * 0.18 + 0.08, 0.1, 0);
    }
  });
}

function logs(K, L, n) {
  const x0 = -n / 2;
  K.part("logs", {}, () => {
    for (let i = 0; i <= n; i++) {
      const x = Math.max(x0 + 0.08, Math.min(-x0 - 0.08, x0 + i));
      K.cyl(0.08, 0.78, L.wood[2], x, 0, 0.2, 6);
      K.cyl(0.08, 0.78, L.wood[2], x, 0, -0.2, 6);
    }
    for (let r = 0; r < 3; r++) {
      K.rbox(n - 0.02, 0.2, 0.22, r % 2 ? L.wood[1] : L.wood[0], 0, 0.04 + r * 0.22, 0);
      K.box(0.03, 0.16, 0.18, L.wood[3], x0 + 0.005, 0.06 + r * 0.22, 0);
      K.box(0.03, 0.16, 0.18, L.wood[3], -x0 - 0.005, 0.06 + r * 0.22, 0);
    }
  });
}

function bone(K, L, n) {
  const x0 = -n / 2;
  K.part("bones", {}, () => {
    for (let i = 0; i < n * 2; i++) {
      const x = x0 + 0.25 + i * 0.5, j = hash(i, n);
      K.taper(0.16, 0.16, 0.06, 0.06, 0.78 + j * 0.15, L.bone[i % 2], x, 0, 0, (i % 2 ? 0.08 : -0.08), 0);
      K.rbox(0.18, 0.08, 0.18, L.bone[2], x, 0, 0);
    }
    K.rbox(n - 0.1, 0.1, 0.12, L.bone[1], 0, 0.5, 0);
    for (const s of [-1, 1]) K.rbox(0.16, 0.16, 0.16, L.bone[0], s * (-x0 - 0.12), 0.47, 0);
  });
}

const BUILD = { hedge, rockwall, masonry, coral, logs, bone };

export function railEntries() {
  const out = [];
  for (const mat of RAIL_MATERIALS) for (let n = 1; n <= RAIL_MAX; n++) out.push({ t: railType(mat, n), mat, n, h: RAIL_H[mat] });
  return out;
}

export const buildRail = (K, pal, mat, n) => BUILD[mat](K, railLook(pal), n);
