import * as THREE from "three";
import { CATALOG } from "../core/catalog.js";
import { cellAt } from "../core/level.js";
import { PALETTE } from "./palette.js";
import { WATER_Y } from "./terrain.js";

const mats = new Map();
export const mat = (hex) => {
  if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  return mats.get(hex);
};

const box = (w, h, d, hex, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex)); m.position.set(x, y + h / 2, z); return m; };
const cyl = (rt, rb, h, seg, hex, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(hex)); m.position.set(x, y + h / 2, z); return m; };
const ico = (r, hex, x = 0, y = 0, z = 0, detail = 0) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(hex)); m.position.set(x, y, z); return m; };

const PINE = ["#4fc28a", "#5ccf8f", "#3fae6f"];
const ROUND = ["#b5e36a", "#9fd65a", "#c4ef86"];
const ORANGE = ["#f5c242", "#f0a93a"];

const BUILDERS = {
  "tree-pine": (H, v) => {
    const g = new THREE.Group(), c = PINE[v % PINE.length], trunk = H * 0.15;
    g.add(box(0.14, trunk, 0.14, PALETTE.wood));
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const s = 0.8 - i * 0.2, th = (H - trunk) / tiers;
      g.add(box(s, th * 1.05, s, i % 2 ? c : new THREE.Color(c).multiplyScalar(0.92).getHexString().replace(/^/, "#"), 0, trunk + i * th, 0));
    }
    return g;
  },
  "tree-round": (H, v) => blobTree(H, ROUND[v % ROUND.length]),
  "tree-orange": (H, v) => blobTree(H, ORANGE[v % ORANGE.length]),
  bush: (H, v) => { const g = new THREE.Group(), c = ["#6fcf6a", "#58b85a"][v % 2]; g.add(ico(H * 0.55, c, 0, H * 0.45, 0)); g.add(ico(H * 0.3, "#e0506a", 0.12, H * 0.8, 0.12)); return g; },
  rock: (H, v) => { const g = new THREE.Group(); g.add(ico(H * 0.6, ["#d6d2cc", "#c8c2ba", "#e2ded8"][v % 3], 0, H * 0.45, 0)); return g; },
  "rock-big": (H) => { const g = new THREE.Group(); g.add(ico(H * 0.55, "#c8c2ba", 0, H * 0.5, 0)); g.add(ico(H * 0.35, "#d6d2cc", 0.22, H * 0.3, 0.2)); return g; },
  well: (H) => { const g = new THREE.Group(); g.add(cyl(0.38, 0.4, H * 0.35, 8, "#b0aaa0")); g.add(box(0.06, H * 0.9, 0.06, PALETTE.wood, -0.32)); g.add(box(0.06, H * 0.9, 0.06, PALETTE.wood, 0.32)); g.add(box(0.8, 0.08, 0.3, "#e57519", 0, H * 0.88)); g.add(box(0.7, 0.12, 0.5, "#c0502a", 0, H * 0.95)); return g; },
  fence: (H) => { const g = new THREE.Group(); g.add(box(0.1, H, 0.1, PALETTE.wood, -0.4)); g.add(box(0.1, H, 0.1, PALETTE.wood, 0.4)); g.add(box(1, 0.08, 0.06, PALETTE.woodDark, 0, H * 0.45)); g.add(box(1, 0.08, 0.06, PALETTE.woodDark, 0, H * 0.8)); return g; },
  "fence-post": (H) => { const g = new THREE.Group(); g.add(box(0.14, H, 0.14, PALETTE.wood)); return g; },
  barrel: (H) => { const g = new THREE.Group(); g.add(cyl(0.22, 0.2, H, 8, "#c0702e")); g.add(cyl(0.225, 0.225, 0.06, 8, "#6b4a2a", 0, H * 0.2)); g.add(cyl(0.225, 0.225, 0.06, 8, "#6b4a2a", 0, H * 0.72)); return g; },
  pot: (H, v) => { const g = new THREE.Group(); g.add(cyl(0.14, 0.2, H * 0.8, 7, ["#d2764a", "#b85f3a"][v % 2])); g.add(cyl(0.16, 0.14, H * 0.2, 7, "#9c4b2c", 0, H * 0.8)); return g; },
  crate: (H) => { const g = new THREE.Group(); g.add(box(H * 0.85, H, H * 0.85, "#d08a44")); return g; },
  chest: (H) => { const g = new THREE.Group(); g.add(box(0.55, H * 0.6, 0.38, "#b8683a")); g.add(box(0.57, H * 0.4, 0.4, "#e0a030", 0, H * 0.6)); return g; },
  mushroom: (H, v) => { const g = new THREE.Group(); g.add(cyl(0.05, 0.06, H * 0.6, 6, "#f4ead8")); g.add(cyl(0.02, 0.18, H * 0.4, 7, ["#e0463c", "#f0a040"][v % 2], 0, H * 0.6)); return g; },
  flower: (H, v) => { const g = new THREE.Group(), c = ["#ff7a8a", "#ffd24a", "#b58aff"][v % 3]; for (const [dx, dz] of [[-0.15, 0.1], [0.12, -0.08], [0.05, 0.2]]) { g.add(box(0.03, H * 0.7, 0.03, "#4f9a3a", dx, 0, dz)); g.add(box(0.1, 0.06, 0.1, c, dx, H * 0.7, dz)); } return g; },
  coin: (H) => { const g = new THREE.Group(); const m = cyl(0.2, 0.2, 0.06, 10, "#ffcc33"); m.rotation.x = Math.PI / 2; m.position.y = H; g.add(m); g.userData.spin = true; return g; },
  gem: (H, v) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), mat(["#4ae0d0", "#ff5a9a"][v % 2])); m.position.y = H * 0.6; g.add(m); g.userData.spin = true; return g; },
  torch: (H) => { const g = new THREE.Group(); g.add(box(0.08, H * 0.85, 0.08, PALETTE.wood)); g.add(box(0.14, 0.18, 0.14, "#ff9a2a", 0, H * 0.85)); return g; },
  campfire: (H) => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const l = box(0.5, 0.08, 0.1, PALETTE.wood); l.rotation.y = (i * Math.PI) / 3; g.add(l); } const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, H, 5), mat("#ff8a2a")); f.position.y = H / 2; g.add(f); return g; },
  signpost: (H) => { const g = new THREE.Group(); g.add(box(0.08, H, 0.08, PALETTE.wood)); g.add(box(0.5, 0.2, 0.05, "#d08a44", 0.1, H * 0.7)); return g; },
  waterfall: (H) => { const g = new THREE.Group(); g.add(box(0.9, 1, 0.12, PALETTE.waterfall, 0, -1, 0.5)); g.userData.hang = true; return g; },
  "stepping-stones": () => { const g = new THREE.Group(); for (const [dx, dz] of [[-0.2, -0.15], [0.18, 0.12], [-0.05, 0.3]]) g.add(cyl(0.14, 0.16, 0.1, 7, "#d6d2cc", dx, 0, dz)); return g; },
  log: (H) => { const g = new THREE.Group(); const m = cyl(H * 0.5, H * 0.5, 0.9, 8, PALETTE.wood); m.rotation.z = Math.PI / 2; m.position.y = H * 0.5; g.add(m); return g; },
  lantern: (H) => { const g = new THREE.Group(); g.add(box(0.07, H * 0.8, 0.07, "#555a60")); g.add(box(0.2, 0.22, 0.2, "#ffe07a", 0, H * 0.78)); return g; },
};

function blobTree(H, c) {
  const g = new THREE.Group(), trunk = H * 0.35;
  g.add(box(0.14, trunk, 0.14, PALETTE.wood));
  const s = 0.62, dark = "#" + new THREE.Color(c).multiplyScalar(0.9).getHexString();
  g.add(box(s, s, s, c, 0, trunk, 0));
  g.add(box(s * 0.7, s * 0.7, s * 0.7, dark, 0.16, trunk + s * 0.55, -0.1));
  g.add(box(s * 0.55, s * 0.55, s * 0.55, c, -0.12, trunk + s * 0.9, 0.08));
  const top = trunk + s * 0.9 + s * 0.55;
  g.scale.y = H / top;
  return g;
}

export function buildDecor(L, view) {
  const T = view.tileH, group = new THREE.Group(), spinners = [];
  for (const d of L.decor) {
    const spec = CATALOG[d.t];
    const H = (spec.height || 0.5) * T;
    const make = BUILDERS[d.t] || ((h) => { const g = new THREE.Group(); g.add(box(0.5, h, 0.5, "#ff00ff")); return g; });
    const obj = make(H, d.v || 0);
    const c = cellAt(L, d.x, d.z);
    const baseY = c.h >= 1 && c.s !== "ramp" ? c.h * T : c.s === "ramp" ? (c.h - 0.5) * T : WATER_Y;
    const [fw, fd] = (d.rot || 0) % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    obj.position.set(d.x + fw / 2 + (d.ox || 0), baseY, d.z + fd / 2 + (d.oz || 0));
    obj.rotation.y = -(d.rot || 0) * (Math.PI / 2);
    if (obj.userData.hang) obj.scale.y = Math.max(1, c.h) * T;
    obj.userData.decor = d;
    if (obj.userData.spin) spinners.push(obj);
    group.add(obj);
  }
  return { group, spinners };
}
