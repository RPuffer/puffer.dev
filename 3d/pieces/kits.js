import * as THREE from "three";
import { Baker, bakedMaterial } from "../baker.js";
import { lockedKit } from "../prims.js";
import { stamp } from "../../core/catalog.js";

export const THEMES = {
  wizard: {
    indigo: "#2b3b5c",
    indigoLight: "#3d5280",
    indigoDark: "#1d2842",
    parch: "#ebe5dc",
    parchDark: "#d8cfc4",
    rust: "#c97652",
    rustDark: "#ad5e3c",
    gold: "#f0c438",
    goldLight: "#fae078",
    cyan: "#6ce6f8",
    cyanLight: "#dcfaff",
    wood: "#b9805a",
    woodLight: "#d39a6c",
    woodDark: "#8a5a3e",
    iron: "#4a4f5e",
    ironLight: "#6a7082",
    stone: "#a9a39a",
    stoneLight: "#c9c3b8",
  },
};

const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tilt = (B, x, y, z, axis, a, fn) => { B.push(x, y, z, 0); B.rot(axis, a); fn(); B.pop(); B.pop(); };
const Q = Math.PI / 4;

function star(K, L, x, y, z, s = 1) {
  const B = K.B;
  B.push(x, y, z, Q + (L.rot || 0) * (Math.PI / 2));
  K.rbox(0.26 * s, 0.26 * s, 0.22 * s, L.gold, 0, -0.13 * s, 0);
  for (let k = 0; k < 5; k++) tilt(B, 0, 0, 0, [0, 0, 1], (k * 2 * Math.PI) / 5, () => K.spike(0.2 * s, 0.32 * s, 0.2 * s, k % 2 ? L.gold : L.goldLight, 0, 0.1 * s, 0));
  B.pop();
}

function flame(K, L, x, y, z, s = 1) {
  K.cone(0.11 * s, 0, 0.26 * s, L.cyan, x, y, z, 4);
  K.cone(0.06 * s, 0, 0.16 * s, L.cyanLight, x + 0.02 * s, y + 0.02 * s, z + 0.03 * s, 4);
}

function starShrine(K, L) {
  const B = K.B;
  K.part("plinth", {}, () => {
    K.rbox(1.8, 0.3, 1.5, L.indigoDark, -0.45, 0, -0.05);
    K.rbox(1.36, 0.28, 1.1, L.indigo, -0.45, 0.3, -0.08);
    K.rbox(0.9, 0.26, 0.72, L.indigoLight, -0.45, 0.58, -0.1);
  });
  K.part("step-blocks", {}, () => {
    K.rbox(0.42, 0.16, 0.3, L.indigoLight, -0.45, 0, 0.82);
    K.rbox(0.3, 0.14, 0.42, L.indigoLight, 0.55, 0, 0.0);
  });
  K.part("star", {}, () => star(K, L, -0.45, 1.2, -0.1, 1.5));
  K.part("standing-stone", {}, () => tilt(B, 1.0, 0, -0.45, [0, 0, 1], -0.06, () => {
    K.rbox(0.4, 1.5, 0.36, L.indigo, 0, 0, 0);
    K.rbox(0.3, 0.12, 0.28, L.indigoLight, 0.02, 1.5, 0);
  }));
  K.part("stump", {}, () => {
    K.rbox(0.36, 0.48, 0.34, L.indigo, 1.05, 0, 0.45);
    tilt(B, 1.08, 0.48, 0.45, [1, 0, 0], 0.3, () => K.rbox(0.24, 0.16, 0.22, L.indigoLight, 0, 0, 0));
  });
  K.part("rubble", {}, () => {
    B.at(-1.15, 0, 0.78, 0.35, () => K.rbox(0.5, 0.14, 0.26, L.parch, 0, 0, 0));
    B.at(0.42, 0, 0.78, -0.25, () => K.rbox(0.46, 0.14, 0.24, L.parchDark, 0, 0, 0));
    B.at(0.62, 0.14, 0.72, 0.4, () => K.rbox(0.26, 0.12, 0.2, L.parch, 0, 0, 0));
  });
}

function wizardCamp(K, L) {
  const B = K.B, tx = 0.42, tz = -0.4, tw = 0.96, th = 0.98, td = 1.0;
  K.part("tent", {}, () => K.spike(tw, th, td, L.indigo, tx, 0, tz));
  K.part("tent-flap", {}, () => K.spike(0.42, 0.56, 0.06, L.indigoDark, tx, 0, tz + td / 2 + 0.02));
  K.part("tent-pole", {}, () => K.rbox(0.08, 0.18, 0.08, L.woodDark, tx, th - 0.06, tz + td / 2 - 0.02));
  K.part("tent-stars", { face: true }, () => {
    for (const [x, y] of [[-0.2, 0.22], [0.25, 0.3], [0.05, 0.62]]) K.box(0.09, 0.09, 0.03, L.gold, tx + x, y, tz + td / 2 + 0.03);
  });
  K.part("hearth", {}, () => {
    for (const [x, z] of [[-0.66, 0.3], [-0.34, 0.3], [-0.5, 0.62]]) K.rbox(0.16, 0.14, 0.16, L.stone, x, 0, z);
  });
  K.part("fire", {}, () => flame(K, L, -0.5, 0.02, 0.42, 1.0));
  K.part("cauldron", {}, () => {
    K.cyl(0.26, 0.28, L.iron, -0.5, 0.16, 0.42, 8);
    K.cyl(0.28, 0.06, L.ironLight, -0.5, 0.44, 0.42, 8);
    K.cyl(0.2, 0.03, L.cyan, -0.5, 0.48, 0.42, 8);
  });
  K.part("stool", {}, () => K.cyl(0.15, 0.3, L.wood, 0.08, 0, 0.62, 7));
  K.part("bedroll", {}, () => tilt(B, 0.6, 0.13, 0.58, [0, 0, 1], Math.PI / 2, () => {
    K.cyl(0.13, 0.62, L.rust, 0, -0.31, 0, 7);
    K.cyl(0.135, 0.06, L.rustDark, 0, -0.03, 0, 7);
  }));
  K.part("woodpile", {}, () => {
    for (const [z, y] of [[-0.62, 0], [-0.38, 0], [-0.5, 0.17]]) tilt(B, -0.55, y + 0.08, z, [0, 0, 1], Math.PI / 2, () => K.cyl(0.09, 0.56, y ? L.woodLight : L.wood, 0, -0.28, 0, 6));
  });
}

function supplyLanding(K, L) {
  const B = K.B;
  K.part("deck", {}, () => {
    for (let i = 0; i < 5; i++) K.rbox(0.36, 0.1, 0.88, i % 2 ? L.woodLight : L.wood, -0.76 + i * 0.38, 0, 0.02);
  });
  K.part("beam", {}, () => K.box(1.94, 0.08, 0.12, L.woodDark, 0, 0.1, -0.4));
  K.part("posts", {}, () => {
    for (const x of [-0.84, 0.84]) {
      K.rbox(0.16, 1.2, 0.16, L.woodDark, x, 0.1, -0.36);
      K.box(0.36, 0.1, 0.1, L.woodDark, x + (x < 0 ? 0.12 : -0.12), 1.12, -0.36);
    }
  });
  K.part("lanterns", {}, () => {
    for (const x of [-0.64, 0.64]) {
      K.box(0.03, 0.12, 0.03, L.iron, x, 1.0, -0.36);
      K.rbox(0.16, 0.06, 0.16, L.iron, x, 0.94, -0.36);
      K.rbox(0.13, 0.18, 0.13, L.cyan, x, 0.76, -0.36);
      K.rbox(0.16, 0.05, 0.16, L.iron, x, 0.72, -0.36);
    }
  });
  K.part("crates", {}, () => {
    K.rbox(0.42, 0.4, 0.42, L.woodLight, 0.5, 0.1, 0.12);
    B.at(0.48, 0.5, 0.1, 0.3, () => K.rbox(0.3, 0.3, 0.3, L.wood, 0, 0, 0));
  });
  K.part("crate-bands", { face: true }, () => {
    K.box(0.44, 0.05, 0.02, L.woodDark, 0.5, 0.28, 0.34);
  });
  K.part("barrel", {}, () => {
    K.cyl(0.19, 0.42, L.wood, -0.36, 0.1, 0.18, 8);
    K.cyl(0.2, 0.05, L.iron, -0.36, 0.2, 0.18, 8);
    K.cyl(0.2, 0.05, L.iron, -0.36, 0.42, 0.18, 8);
  });
}

function scrollCart(K, L) {
  const B = K.B;
  K.part("bed", {}, () => {
    K.rbox(1.0, 0.12, 0.62, L.woodDark, -0.38, 0.26, 0);
    K.box(1.0, 0.24, 0.08, L.wood, -0.38, 0.38, 0.29);
    K.box(1.0, 0.24, 0.08, L.wood, -0.38, 0.38, -0.29);
    K.box(0.08, 0.24, 0.5, L.wood, -0.84, 0.38, 0);
  });
  K.part("wheels", {}, () => {
    for (const z of [0.38, -0.38]) tilt(B, -0.3, 0.26, z, [1, 0, 0], Math.PI / 2, () => {
      K.cyl(0.26, 0.08, L.woodDark, 0, -0.04, 0, 8);
      K.cyl(0.08, 0.1, L.iron, 0, -0.05, 0, 6);
    });
  });
  K.part("handles", {}, () => { for (const z of [0.2, -0.2]) tilt(B, 0.16, 0.4, z, [0, 0, 1], -0.35, () => K.box(0.46, 0.06, 0.06, L.wood, 0.23, 0, 0)); });
  K.part("legs", {}, () => K.rbox(0.08, 0.28, 0.4, L.woodDark, -0.8, 0, 0));
  K.part("scrolls", {}, () => {
    const rolls = [[-0.6, 0.48, 0.13], [-0.36, 0.48, -0.12], [-0.14, 0.48, 0.12], [-0.5, 0.64, -0.02], [-0.26, 0.64, 0.05]];
    for (const [x, y, z] of rolls) tilt(B, x, y, z, [1, 0, 0], Math.PI / 2, () => {
      K.cyl(0.085, 0.44, L.parch, 0, -0.22, 0, 6);
      K.cyl(0.05, 0.5, L.rust, 0, -0.25, 0, 6);
    });
  });
  K.part("lectern", {}, () => {
    K.rbox(0.34, 0.06, 0.34, L.woodDark, 0.62, 0, 0);
    K.rbox(0.1, 0.62, 0.1, L.wood, 0.62, 0.06, 0);
    tilt(B, 0.62, 0.68, 0, [1, 0, 0], -0.4, () => K.rbox(0.44, 0.06, 0.34, L.wood, 0, 0, 0));
  });
  K.part("tome", {}, () => tilt(B, 0.62, 0.74, 0.02, [1, 0, 0], -0.4, () => {
    tilt(B, -0.1, 0, 0, [0, 0, 1], 0.12, () => K.rbox(0.2, 0.04, 0.26, L.parch, 0, 0, 0));
    tilt(B, 0.1, 0, 0, [0, 0, 1], -0.12, () => K.rbox(0.2, 0.04, 0.26, L.parchDark, 0, 0, 0));
    K.box(0.04, 0.06, 0.28, L.rust, 0, -0.02, 0);
  }));
}

function runeRing(K, L) {
  K.part("disc", {}, () => {
    K.cyl(1.2, 0.08, L.stone, 0, 0, 0, 10);
    K.cyl(0.78, 0.04, L.stoneLight, 0, 0.08, 0, 10);
  });
  K.part("rune", {}, () => {
    K.rbox(0.5, 0.05, 0.5, L.cyan, 0, 0.1, 0);
    K.rbox(0.22, 0.04, 0.22, L.cyanLight, 0, 0.14, 0);
  });
  K.part("stones", {}, () => {
    for (const [sx, sz, h] of [[-1, -1, 0.82], [1, -1, 0.68], [-1, 1, 0.6], [1, 1, 0.76]]) {
      K.rbox(0.44, h, 0.38, L.indigo, sx * 1.0, 0, sz * 1.0);
      K.rbox(0.34, 0.1, 0.3, L.indigoLight, sx * 1.0, h, sz * 1.0);
    }
  });
  K.part("glyphs", { face: true }, () => {
    for (const [sx, sz] of [[-1, 1], [1, 1]]) K.box(0.1, 0.16, 0.02, L.cyan, sx * 1.0, 0.32, sz * 1.0 + 0.2);
  });
  K.part("plinth", {}, () => K.rbox(0.3, 0.22, 0.3, L.indigoDark, 0, 0.14, 0));
  K.part("star", {}, () => star(K, L, 0, 0.66, 0, 1.0));
}

function waymark(K, L) {
  K.part("foot", {}, () => K.rbox(0.5, 0.16, 0.5, L.indigoDark, 0, 0, 0));
  K.part("post", {}, () => K.rbox(0.34, 0.62, 0.34, L.indigo, 0, 0.16, 0));
  K.part("cap", {}, () => K.rbox(0.42, 0.1, 0.42, L.indigoLight, 0, 0.78, 0));
  K.part("bowl", {}, () => {
    K.cyl(0.22, 0.1, L.indigoLight, 0, 0.88, 0, 8);
    K.cyl(0.15, 0.03, L.indigoDark, 0, 0.98, 0, 8);
  });
  K.part("flame", {}, () => flame(K, L, 0, 0.96, 0, 1.25));
}

const B_ = (h) => ({ pass: false, h });
const P_ = (h) => ({ pass: true, h });

export const KITS = {
  "star-shrine": {
    footprint: [3, 2], height: 2.1, build: starShrine,
    mask: [B_(1.4), B_(1.9), B_(1.6), B_(0.9), B_(0.9), B_(0.6)],
    kit: { slots: ["turn", "hill", "shortcut-far"], dist: [2, 4], max: 3, face: "path", tall: true, about: "a landmark: marks a turn of the route, a shortcut's far end or a hill top" },
  },
  "wizard-camp": {
    footprint: [2, 2], height: 1.1, build: wizardCamp,
    mask: [B_(0.6), B_(1.1), B_(0.7), B_(0.5)],
    kit: { slots: ["pocket", "rest"], dist: [1, 3], max: 2, face: "path", about: "set dressing for a resting place: off-path pockets and the walk home" },
  },
  "supply-landing": {
    footprint: [2, 1], height: 1.3, build: supplyLanding,
    mask: [B_(1.3), B_(1.3)],
    kit: { slots: ["rim", "bank"], dist: [1, 3], max: 2, face: "path", rim: true, about: "dressing for the island's edge and a water bank, back to the drop" },
  },
  "scroll-cart": {
    footprint: [2, 1], height: 1.0, build: scrollCart,
    mask: [B_(0.9), B_(1.0)],
    kit: { slots: ["turn", "rest", "approach"], dist: [1, 2], max: 2, face: "path", about: "low set dressing beside the route at a turn or on the approach" },
  },
  "rune-ring": {
    footprint: [3, 3], height: 1.0, build: runeRing,
    mask: [B_(0.8), P_(0.1), B_(0.7), P_(0.1), P_(0.2), P_(0.1), B_(0.6), P_(0.1), B_(0.8)],
    kit: { slots: ["pocket", "reward"], dist: [1, 4], max: 2, face: "path", reward: true, about: "a reward place: the end of a pocket or the top of a terrace, walk-in" },
  },
  "waymark": {
    footprint: [1, 1], height: 1.2, build: waymark,
    kit: { slots: ["frame"], dist: [1, 1], max: 24, about: "a low post that frames the path at a gateway, a shortcut end or the approach" },
  },
};

export function register(style = {}) {
  const catalog = {}, builders = {};
  for (const [t, p] of Object.entries(KITS)) {
    const [w, d] = p.footprint;
    const mask = p.mask || Array.from({ length: w * d }, () => B_(p.height));
    catalog[t] = { ...stamp(p.footprint, mask, { multitile: w * d > 1 }), height: p.height, kit: { theme: "wizard", ...p.kit } };
    if (w * d === 1) Object.assign(catalog[t], { rotates: false, stamp: false });
    builders[t] = (v, rot, st) => {
      const pal = (st || style)?.palette || {};
      const look = { ...THEMES.wizard, ...(THEMES[pal.kitTheme] || {}), ...(pal.kits || {}), rot: rot || 0 };
      const B = new Baker();
      const K = lockedKit(B, st || style, rot || 0);
      p.build(K, look);
      const m = mesh(B);
      m.userData.parts = K.parts.filter((q) => !q.face).map((q) => q.id);
      return m;
    };
  }
  return { catalog, builders };
}
