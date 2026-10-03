import * as THREE from "three";
import { Baker, bakedMaterial } from "../baker.js";
import { lockedKit } from "../prims.js";
import { CROWN } from "../pieces.js";
import { stamp } from "../../core/catalog.js";

export const LOOK = {
  stone: "#ababab",
  stoneLight: "#d0d0d0",
  door: "#5a3524",
  timber: "#a65a2c",
  infill: "#f4c94a",
  window: "#4a2a1c",
  roof: "#f4c23e",
  roofAlt: "#dfa02c",
  ridge: "#a65a2c",
  sail: "#f2d6a2",
  spar: "#bd7a3e",
  trunk: "#ad5f3e",
  root: "#a2553a",
  leaf: "#8ce263",
  leafDeep: "#6cc957",
  leafTeal: "#3fd9a0",
};

const R2 = Math.SQRT2;
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const solidMask = (w, d, h) => Array.from({ length: w * d }, () => ({ pass: false, h }));

function windmill(K, L) {
  const B = K.B;
  K.part("base", {}, () => {
    K.cone(0.9 * R2, 0.76 * R2, 1.7, L.stone, 0, 0, 0, 4);
  });
  K.part("quoins", {}, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      K.rbox(0.48, 0.5, 0.48, L.stoneLight, sx * 0.84, 0, sz * 0.84);
      K.rbox(0.36, 0.4, 0.36, L.stoneLight, sx * 0.78, 0.5, sz * 0.78);
    }
  });
  K.part("door", {}, () => {
    K.box(0.46, 0.8, 0.1, L.door, -0.3, 0.05, 0.86);
    K.rbox(0.66, 0.18, 0.2, L.stoneLight, -0.3, 0.85, 0.84);
  });
  K.part("patch", { face: true }, () => {
    K.box(0.1, 0.22, 0.42, L.stoneLight, 0.85, 0.85, 0.2);
    K.box(0.1, 0.18, 0.3, L.stoneLight, 0.8, 1.22, -0.3);
  });
  K.part("sill", {}, () => K.rbox(2.05, 0.24, 2.05, L.timber, 0, 1.68, 0));
  K.part("body", {}, () => K.box(1.7, 1.08, 1.7, L.infill, 0, 1.92, 0));
  K.part("posts", {}, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.rbox(0.24, 1.08, 0.24, L.timber, sx * 0.86, 1.92, sz * 0.86);
    K.box(0.16, 1.08, 0.1, L.timber, 0.22, 1.92, 0.86);
    K.box(0.1, 1.08, 0.16, L.timber, 0.86, 1.92, -0.3);
    K.box(1.76, 0.12, 0.1, L.timber, 0, 2.36, 0.86);
    K.box(0.1, 0.12, 1.76, L.timber, 0.86, 2.36, 0);
  });
  K.part("window", {}, () => {
    K.box(0.1, 0.42, 0.36, L.window, 0.86, 2.5, 0.3);
  });
  K.part("plate", {}, () => K.rbox(2.0, 0.2, 2.0, L.timber, 0, 3.0, 0));
  K.part("gable", {}, () => K.spike(1.76, 0.72, 1.7, L.infill, 0, 3.2, 0));
  K.part("roof", {}, () => {
    const pitch = Math.atan2(0.72, 0.88), run = Math.hypot(0.88, 0.72) + 0.24;
    for (const s of [-1, 1]) {
      B.push(0, 3.9, 0, 0);
      B.rot([0, 0, 1], -s * pitch, 0, 0, 0);
      const planks = 3, d = 2.3 / planks;
      for (let i = 0; i < planks; i++) K.box(run, 0.16, d - 0.02, i % 2 ? L.roofAlt : L.roof, s * run / 2, -0.04, -1.15 + d * (i + 0.5));
      B.pop();
      B.pop();
    }
  });
  K.part("ridge", {}, () => K.rbox(0.24, 0.14, 2.45, L.ridge, 0, 3.84, 0));
  const hub = [0.1, 2.5, 1.18];
  K.part("hub", {}, () => {
    K.box(0.28, 0.28, 0.4, L.spar, hub[0], hub[1] - 0.14, 1.0);
  });
  K.part("sails", {}, () => {
    B.sway("crown", { amp: CROWN * 0.6, root: hub, span: 1.9 }, () => {
      for (let k = 0; k < 4; k++) {
        B.push(hub[0], hub[1], hub[2], 0);
        B.rot([0, 0, 1], 0.55 + k * Math.PI / 2, 0, 0, 0);
        K.box(0.15, 1.85, 0.1, L.spar, 0, -0.05, 0);
        K.box(0.5, 1.4, 0.06, L.sail, 0.32, 0.42, -0.02);
        for (let r = 0; r < 5; r++) K.box(0.52, 0.07, 0.05, L.spar, 0.32, 0.5 + r * 0.3, 0.03);
        K.box(0.07, 1.4, 0.05, L.spar, 0.58, 0.42, 0.03);
        B.pop();
        B.pop();
      }
    });
  });
}

function canopyTree(K, L) {
  const B = K.B;
  K.part("collar", {}, () => {
    K.rbox(1.35, 0.22, 1.35, L.root, 0, 0, 0);
    K.rbox(1.15, 0.18, 1.15, L.trunk, 0, 0.22, 0);
  });
  K.part("trunk", {}, () => {
    K.rbox(0.92, 1.6, 0.92, L.trunk, 0, 0.4, 0);
    K.rbox(0.74, 0.6, 0.74, L.trunk, 0, 2.0, 0);
  });
  K.part("buttress", {}, () => {
    for (let k = 0; k < 4; k++) B.at(0, 0, 0, k * Math.PI / 2 + Math.PI / 4, () => K.rbox(0.36, 1.35, 0.5, L.trunk, 0, 0, 0.5));
  });
  K.part("roots", {}, () => {
    for (let k = 0; k < 8; k++) {
      const long = k % 2 === 1;
      B.at(0, 0, 0, k * Math.PI / 4, () => {
        K.wedge(long ? 0.72 : 0.62, long ? 0.8 : 0.66, long ? 1.0 : 0.85, L.root, 0, 0, long ? 1.0 : 0.95);
        K.rbox(long ? 0.6 : 0.5, long ? 0.38 : 0.3, long ? 0.42 : 0.36, L.root, 0, 0, long ? 1.55 : 1.32);
      });
    }
  });
  const cubes = [
    [1.7, 1.25, 0, 2.6, 0, 0],
    [1.25, 0.95, -0.85, 2.45, -0.6, 1],
    [1.25, 0.95, 0.8, 2.4, -0.75, 0],
    [1.25, 0.95, -0.9, 2.35, 0.75, 0],
    [1.2, 0.9, 0.9, 2.3, 0.8, 1],
    [1.1, 0.85, 0.05, 2.25, 1.05, 0],
    [1.1, 0.85, 1.05, 2.3, 0.0, 0],
    [1.0, 0.8, -1.05, 2.4, 0.0, 1],
    [1.0, 0.75, 0, 2.5, -1.05, 1],
    [1.05, 0.62, 0.15, 3.38, 0.1, 0],
    [0.8, 0.55, -0.7, 3.12, -0.4, 0],
    [0.8, 0.5, 0.65, 3.08, 0.5, 1],
    [0.5, 0.5, 1.3, 2.6, 0.85, 0],
    [0.46, 0.46, -1.25, 2.65, 1.0, 0],
  ];
  const accents = [[0.32, 0.5, 2.1, 1.0], [0.28, 1.05, 2.15, 0.4], [0.24, -0.25, 2.12, 1.05]];
  K.part("crown", {}, () => {
    B.sway("crown", { amp: CROWN, root: [0, 2.3, 0], span: 1.7 }, () => {
      for (const [a, h, x, y, z, c] of cubes) K.rbox(a, h, a, c ? L.leafDeep : L.leaf, x, y, z);
      for (const [a, x, y, z] of accents) K.rbox(a, a, a, L.leafTeal, x, y, z);
    });
  });
}

export const PROPS = {
  "windmill": { footprint: [3, 3], height: 4, build: windmill },
  "canopy-tree": { footprint: [3, 3], height: 4, build: canopyTree },
};

export function partsOf(type, style = {}) {
  const B = new Baker();
  const K = lockedKit(B, style, 0);
  PROPS[type].build(K, { ...LOOK });
  return K.parts.filter((p) => !p.face).map((p) => p.id);
}

export function register(style = {}) {
  const catalog = {}, builders = {};
  for (const [t, p] of Object.entries(PROPS)) {
    const [w, d] = p.footprint;
    catalog[t] = stamp(p.footprint, solidMask(w, d, p.height), { multitile: true });
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker();
      const K = lockedKit(B, st || style, rot || 0);
      p.build(K, { ...LOOK, ...(st?.palette?.multitile || {}) });
      const m = mesh(B);
      m.userData.parts = K.parts.filter((q) => !q.face).map((q) => q.id);
      return m;
    };
  }
  return { catalog, builders };
}
