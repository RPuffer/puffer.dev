import * as THREE from "three";
import { Mesher } from "./mesher.js";
import { PALETTE } from "./palette.js";
import { cellAt, isWalkable } from "../core/level.js";
import { cellNoise } from "../core/rng.js";

export const BASE_Y = -0.4;
export const WATER_Y = 0;

const jitter = (hex, n, amt = 0.04) => {
  const c = new THREE.Color(hex);
  const k = 1 + (n - 0.5) * 2 * amt;
  return c.multiplyScalar(k);
};

export function buildTerrain(L, view, seed) {
  const T = view.tileH;
  const land = new Mesher(), water = new Mesher();
  const [W, D] = L.size;
  const lipH = 0.2 * T, inset = 0.14;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = cellAt(L, x, z);
    const n = cellNoise(seed, x, z);
    if (c.s === "none") continue;
    if (c.s === "water" || c.h === 0 || c.s === "bridge") {
      water.box(x, BASE_Y, z, x + 1, WATER_Y, z + 1, { top: jitter(PALETTE.water.top, n, 0.02), side: PALETTE.water.side });
      if (c.s !== "bridge" || c.h < 1) continue;
    }
    if (c.s === "bridge") { buildBridge(land, L, x, z, c.h * T - 0.12 * T, n); continue; }
    const pal = PALETTE[c.s] || PALETTE.grass;
    const topY = c.h * T;
    if (c.s === "ramp") {
      const lowY = (c.h - 1) * T;
      land.box(x, BASE_Y, z, x + 1, lowY, z + 1, { side: jitter(PALETTE.earth, n) });
      land.wedge(x, z, x + 1, z + 1, lowY, topY, c.d, { top: jitter(pal.top, n), side: jitter(pal.lip, n) });
      continue;
    }
    land.box(x, BASE_Y, z, x + 1, topY - lipH, z + 1, { side: jitter(PALETTE.earth, n) });
    land.box(x, topY - lipH, z, x + 1, topY, z + 1, { top: jitter(pal.top, n), side: jitter(pal.lip, n) });
    land.quad([x + inset, topY + 0.002, z + inset], [x + inset, topY + 0.002, z + 1 - inset], [x + 1 - inset, topY + 0.002, z + 1 - inset], [x + 1 - inset, topY + 0.002, z + inset], jitter(pal.inner, n));
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const group = new THREE.Group();
  const landMesh = new THREE.Mesh(land.geometry(), mat);
  const waterMesh = new THREE.Mesh(water.geometry(), mat);
  landMesh.name = "land"; waterMesh.name = "water";
  group.add(landMesh, waterMesh);
  return { group, pickables: [landMesh, waterMesh] };
}

function buildBridge(m, L, x, z, y, n) {
  const alongX = isWalkable(L, x - 1, z) || isWalkable(L, x + 1, z) || cellAt(L, x - 1, z)?.s === "bridge" || cellAt(L, x + 1, z)?.s === "bridge";
  const planks = 4, gap = 0.04, pw = (1 - gap * (planks - 1)) / planks, th = 0.1;
  for (let i = 0; i < planks; i++) {
    const a = i * (pw + gap);
    const col = jitter(i % 2 ? PALETTE.bridge.top : PALETTE.bridge.inner, n, 0.05);
    if (alongX) m.box(x + a, y, z + 0.04, x + a + pw, y + th, z + 0.96, { top: col, side: PALETTE.bridge.lip });
    else m.box(x + 0.04, y, z + a, x + 0.96, y + th, z + a + pw, { top: col, side: PALETTE.bridge.lip });
  }
  const beam = 0.08;
  if (alongX) {
    m.box(x, y - 0.12, z + 0.12, x + 1, y, z + 0.12 + beam, { top: PALETTE.woodDark, side: PALETTE.woodDark });
    m.box(x, y - 0.12, z + 0.88 - beam, x + 1, y, z + 0.88, { top: PALETTE.woodDark, side: PALETTE.woodDark });
  } else {
    m.box(x + 0.12, y - 0.12, z, x + 0.12 + beam, y, z + 1, { top: PALETTE.woodDark, side: PALETTE.woodDark });
    m.box(x + 0.88 - beam, y - 0.12, z, x + 0.88, y, z + 1, { top: PALETTE.woodDark, side: PALETTE.woodDark });
  }
}
