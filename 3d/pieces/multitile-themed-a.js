import * as THREE from "three";
import { Baker, bakedMaterial } from "../baker.js";
import { lockedKit } from "../prims.js";
import { CROWN } from "../pieces.js";
import { stamp, registerCatalog, CATALOG } from "../../core/catalog.js";

const R2 = Math.SQRT2;
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());

function tilt(B, at, axis, ang, fn) {
  B.push(at[0], at[1], at[2], 0);
  B.rot(axis, ang);
  fn();
  B.pop();
  B.pop();
}

const PAINT = { cream: "#ece3d2", plinth: "#ddd2bc", gold: "#df9e0c", navy: "#363a56", orange: "#cf610d", cap: "#d6d0c4" };

function paintTubeWindmill(K, L) {
  const B = K.B;
  K.part("plinth", {}, () => K.rbox(2.2, 0.45, 2.2, L.plinth, 0, 0, 0));
  K.part("puddle", {}, () => {
    K.rbox(0.8, 0.08, 0.6, L.gold, 0.1, 0.45, 0.5);
    K.rbox(0.46, 0.08, 0.36, L.gold, 0.5, 0.53, 0.35);
    K.rbox(0.32, 0.1, 0.28, L.gold, -0.3, 0.45, 0.8);
  });
  K.part("cap", {}, () => K.cyl(0.36, 0.36, L.cap, 0, 0.45, 0, 8));
  K.part("neck", {}, () => K.cyl(0.26, 0.3, L.cream, 0, 0.81, 0, 8));
  K.part("shoulder", {}, () => K.cone(0.34 * R2, 0.52 * R2, 0.32, L.cream, 0, 1.11, 0, 4));
  K.part("tube-low", {}, () => K.rbox(1.04, 0.62, 0.84, L.cream, 0, 1.43, 0));
  K.part("band-low", {}, () => K.rbox(1.1, 0.4, 0.9, L.gold, 0, 2.05, 0));
  K.part("tube-mid", {}, () => K.rbox(1.08, 0.66, 0.86, L.cream, 0, 2.45, 0));
  K.part("band-high", {}, () => K.rbox(1.12, 0.3, 0.9, L.gold, 0, 3.11, 0));
  K.part("tube-top", {}, () => K.cone(0.56 * R2, 0.62 * R2, 0.4, L.cream, 0, 3.41, 0, 4));
  K.part("crimp", {}, () => {
    for (let i = 0; i < 5; i++) K.rbox(0.22, 0.24, 0.6, L.cream, -0.48 + i * 0.24, 3.81, 0);
  });
  const hub = [0, 2.55, 0.74], ang = 0.72;
  K.part("hub", {}, () => K.rbox(0.36, 0.36, 0.4, L.orange, hub[0], hub[1] - 0.18, 0.56));
  B.sway("crown", { amp: CROWN * 0.6, root: hub, span: 2.0 }, () => {
    K.part("collars", {}, () => {
      for (let k = 0; k < 4; k++) tilt(B, hub, [0, 0, 1], ang + k * Math.PI / 2, () => K.rbox(0.24, 0.24, 0.2, L.orange, 0, 0.34, 0));
    });
    K.part("shafts", {}, () => {
      for (let k = 0; k < 4; k++) tilt(B, hub, [0, 0, 1], ang + k * Math.PI / 2, () => {
        K.box(0.12, 0.8, 0.1, L.navy, 0, 0.12, 0);
        K.rbox(0.3, 0.42, 0.2, L.navy, 0, 0.9, 0);
      });
    });
    K.part("blades", {}, () => {
      for (let k = 0; k < 4; k++) tilt(B, hub, [0, 0, 1], ang + k * Math.PI / 2, () => K.rbox(0.44, 0.9, 0.16, L.orange, 0, 1.32, 0));
    });
  });
}

const CRANE = { timber: "#d2b47e", beam: "#c49a5e", rope: "#9a6236", kerb: "#5e5a58", pit: "#3c3c3e", slab: "#4a4a4a", slabPale: "#d8d8d8", hang: "#6a6a6c" };

function graphiteCrane(K, L) {
  const B = K.B;
  const mx = -0.8, top = 1.4;
  K.part("footings", {}, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.rbox(0.36, 0.28, 0.36, L.timber, mx + sx * 0.52, 0, sz * 0.56);
  });
  K.part("legs", {}, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      B.push(mx + sx * 0.52, 0.2, sz * 0.56, 0);
      B.rot([1, 0, 0], -sz * 0.24);
      B.rot([0, 0, 1], sx * 0.2);
      K.rbox(0.26, top - 0.12, 0.26, L.timber, 0, 0, 0);
      B.pop(); B.pop(); B.pop();
    }
  });
  K.part("braces", {}, () => {
    K.box(0.9, 0.16, 0.14, L.beam, mx, 0.72, 0.43);
    K.box(0.9, 0.16, 0.14, L.beam, mx, 0.72, -0.43);
    K.box(0.14, 0.16, 0.86, L.beam, mx + 0.4, 0.72, 0);
  });
  K.part("deck", {}, () => K.rbox(1.0, 0.24, 1.0, L.timber, mx, top, 0));
  K.part("mast", {}, () => K.rbox(0.5, 1.3, 0.5, L.timber, mx, top + 0.24, 0));
  K.part("cab", {}, () => K.rbox(0.66, 0.56, 0.66, L.beam, mx, top + 1.5, 0));
  K.part("ballast", {}, () => {
    K.rbox(0.7, 0.6, 0.7, L.timber, mx - 0.6, top + 1.5, -0.1);
    K.rbox(0.56, 0.52, 0.56, L.beam, mx - 0.6, top + 2.0, 0.3);
    K.rbox(0.5, 0.48, 0.5, L.timber, mx - 0.35, top + 2.05, -0.35);
    K.rbox(0.5, 0.36, 0.5, L.beam, mx - 0.55, 0, -0.55);
    K.rbox(0.4, 0.3, 0.4, L.timber, mx - 0.6, 0.36, -0.5);
  });
  K.part("jib", {}, () => K.rbox(2.35, 0.24, 0.26, L.timber, mx + 1.05, top + 1.84, 0));
  K.part("strut", {}, () => tilt(B, [mx + 0.2, top + 0.7, 0], [0, 0, 1], -0.98, () => K.box(0.16, 1.95, 0.16, L.beam, 0, 0, 0)));
  const tip = [mx + 2.1, top + 1.76, 0];
  K.part("pulley", {}, () => K.rbox(0.36, 0.36, 0.36, L.rope, tip[0], tip[1], 0));
  B.sway("crown", { amp: CROWN * 0.7, root: tip, span: 1.4 }, () => {
    K.part("chain", {}, () => {
      for (let i = 0; i < 5; i++) K.rbox(0.12, 0.2, 0.12, L.rope, tip[0], tip[1] - 0.26 - i * 0.26, 0);
    });
    K.part("load", {}, () => K.rbox(0.44, 0.42, 0.44, L.hang, tip[0], tip[1] - 1.72, 0));
  });
  const px = 0.72;
  K.part("kerb", {}, () => {
    K.box(1.56, 0.16, 0.14, L.kerb, px, 0, -0.9);
    K.box(1.56, 0.16, 0.14, L.kerb, px, 0, 0.9);
    K.box(0.14, 0.16, 1.94, L.kerb, px - 0.78, 0, 0);
    K.box(0.14, 0.16, 1.94, L.kerb, px + 0.78, 0, 0);
  });
  K.part("pit", {}, () => K.box(1.42, 0.04, 1.66, L.pit, px, 0, 0));
  K.part("slabs-dark", {}, () => {
    K.rbox(0.44, 0.4, 0.44, L.slab, px - 0.44, 0.04, -0.5);
    K.rbox(0.42, 0.28, 0.44, L.slab, px - 0.44, 0.04, 0.05);
    K.rbox(0.42, 0.22, 0.4, L.slab, px - 0.44, 0.04, 0.55);
    K.rbox(0.46, 0.58, 0.46, L.slab, px + 0.04, 0.04, -0.3);
    K.rbox(0.44, 0.24, 0.5, L.slab, px + 0.04, 0.04, 0.4);
  });
  K.part("slabs-pale", {}, () => {
    for (let i = 0; i < 3; i++) K.rbox(0.46, 0.1, 0.52, L.slabPale, px + 0.5, 0.04 + i * 0.13, -0.42);
    for (let i = 0; i < 2; i++) K.rbox(0.46, 0.1, 0.5, L.slabPale, px + 0.5, 0.04 + i * 0.13, 0.32);
  });
}

const INK = { rock: "#6d6863", rockDark: "#5a5550", pale: "#e4e4da", ink: "#4d4741", quill: "#77716b" };

function inkSlab(K, L, id, x, z, h) {
  const B = K.B, w = 0.3, d = 0.86, bev = 0.32;
  K.part(id, {}, () => {
    tilt(B, [x, 0.6, z], [1, 0, 0], -0.05, () => {
      K.box(w, h, d, L.ink, 0, 0, 0);
      K.box(w + 0.02, h, 0.05, L.pale, -0.01, 0, d / 2);
    });
  });
  K.part(id + "-cap", {}, () => {
    tilt(B, [x, 0.6, z], [1, 0, 0], -0.05, () => {
      K.box(w + 0.02, 0.05, d - bev, L.pale, -0.01, h, -bev / 2);
      K.wedge(w + 0.02, bev, bev + 0.05, L.pale, -0.01, h - bev, d / 2 - bev / 2 + 0.025);
    });
  });
}

function inkMonolith(K, L) {
  K.part("plinth", {}, () => K.rbox(1.75, 0.32, 1.75, L.rock, 0, 0, 0));
  K.part("plinth-top", {}, () => K.rbox(1.4, 0.28, 1.4, L.rockDark, 0, 0.32, 0));
  K.part("corner-rocks", {}, () => {
    K.rbox(0.42, 0.3, 0.42, L.rock, -0.74, 0, -0.74);
    K.rbox(0.4, 0.26, 0.4, L.rock, 0.76, 0, -0.72);
  });
  inkSlab(K, L, "slab-a", -0.42, 0.32, 3.0);
  inkSlab(K, L, "slab-b", 0.02, -0.02, 2.45);
  inkSlab(K, L, "slab-c", 0.46, -0.36, 1.9);
  for (const [id, x, z] of [["quills-l", -0.5, 0.66], ["quills-r", 0.66, 0.5]]) {
    K.part(id + "-base", {}, () => K.rbox(0.56, 0.28, 0.56, L.rock, x, 0, z));
    K.part(id, {}, () => {
      K.cone(0.22, 0, 0.85, L.quill, x - 0.08, 0.28, z - 0.04, 4);
      K.cone(0.18, 0, 0.62, L.quill, x + 0.14, 0.28, z - 0.1, 4);
      K.cone(0.16, 0, 0.48, L.quill, x - 0.02, 0.28, z + 0.16, 4);
    });
  }
}

const SCROLL = { white: "#ffffff", cream: "#f0e6cf", navy: "#1c2f5a", end: "#e2dccd", gold: "#e8b84b", stone: "#d8cfbd" };

function scrollTower(K, L) {
  const B = K.B;
  const ring = [[-0.66, -0.44, 1.95, 1], [0.0, -0.76, 2.0, 0], [0.66, -0.44, 1.95, 1], [0.78, 0.24, 1.7, 0], [0.3, 0.74, 1.45, 1], [-0.34, 0.74, 1.55, 0], [-0.8, 0.22, 1.8, 1]];
  K.part("core", {}, () => K.cyl(0.78, 2.0, L.cream, 0, 0, 0, 8));
  K.part("scrolls-white", {}, () => { for (const [x, z, h, w] of ring) if (w) K.cyl(0.35, h, L.white, x, 0, z, 6); });
  K.part("scrolls-cream", {}, () => { for (const [x, z, h, w] of ring) if (!w) K.cyl(0.35, h, L.cream, x, 0, z, 6); });
  K.part("ties", {}, () => { for (const [x, z, h] of ring) K.cyl(0.38, 0.22, L.navy, x, h * 0.5, z, 6); });
  K.part("scroll-ends", {}, () => { for (const [x, z, h] of ring) K.cyl(0.17, 0.04, L.end, x, h, z, 6); });
  K.part("brim-under", {}, () => K.cyl(1.05, 0.08, L.navy, 0, 1.92, 0, 8));
  K.part("brim", {}, () => K.cyl(1.48, 0.22, L.navy, 0, 2.0, 0, 8));
  K.part("crown-1", {}, () => K.rbox(1.45, 0.5, 1.45, L.navy, 0, 2.22, 0));
  K.part("crown-2", {}, () => K.rbox(1.02, 0.46, 1.02, L.navy, 0, 2.72, 0));
  K.part("tip", {}, () => K.cone(0.48 * R2, 0, 0.62, L.navy, 0, 3.18, 0, 4));
  K.part("finial", {}, () => K.rbox(0.16, 0.12, 0.16, L.gold, 0, 3.56, 0));
  B.sway("crown", { amp: CROWN * 0.5, root: [0, 3.75, 0], span: 0.4 }, () => {
    K.part("star", {}, () => {
      K.rbox(0.24, 0.42, 0.16, L.gold, 0, 3.7, 0);
      K.rbox(0.44, 0.16, 0.16, L.gold, 0, 3.86, 0);
      tilt(B, [0, 3.84, 0], [0, 0, 1], 0.65, () => K.rbox(0.14, 0.16, 0.14, L.gold, 0.17, 0, 0));
      tilt(B, [0, 3.84, 0], [0, 0, 1], -0.65, () => K.rbox(0.14, 0.16, 0.14, L.gold, -0.17, 0, 0));
    });
  });
}

const BLADE = { pale: "#d6cec2", ink: "#2b2624", gold: "#dfbf84", foot: "#bfb5a6" };

function bladeArch(K, L) {
  const B = K.B;
  const segs = [[0.7, 0.68, 0.62, 0.06], [0.64, 0.64, 0.58, 0.3], [0.58, 0.62, 0.54, 0.58], [0.52, 0.58, 0.5, 0.9]];
  for (const s of [-1, 1]) {
    const name = s < 0 ? "l" : "r", dz = s * 0.06;
    K.part("pad-" + name, {}, () => K.rbox(0.82, 0.1, 0.82, L.gold, s * 1.0, 0, 0));
    K.part("foot-" + name, {}, () => K.cone(0.38 * R2, 0.32 * R2, 0.48, L.foot, s * 1.0, 0.1, 0, 4));
    let x = s * 1.0, y = 0.58;
    segs.forEach(([w, h, d, a], i) => {
      K.part(`seg-${name}${i}`, {}, () => {
        tilt(B, [x, y, dz], [0, 0, 1], s * a, () => {
          K.rbox(w, h, d, L.pale, 0, 0, 0);
          K.box(0.05, h - 0.04, d - 0.06, L.ink, -s * (w / 2 + 0.01), 0, 0);
        });
      });
      x -= s * Math.sin(a) * h * 0.92;
      y += Math.cos(a) * h * 0.92;
    });
    K.part("tip-" + name, {}, () => tilt(B, [x, y, dz], [0, 0, 1], s * 1.15, () => {
      K.rbox(0.48, 0.42, 0.48, L.pale, 0, 0, 0);
      K.wedge(0.48, 0.36, 0.48, L.pale, 0, 0.42, 0);
    }));
  }
  K.part("collar", {}, () => K.rbox(0.3, 0.2, 0.5, L.gold, 0, 2.5, 0));
}

const SHARD = { tan: "#c2a47e", tanDark: "#ad8f68", paper: "#e0e0e0", paperGrey: "#c4c4c4", slate: "#5a5458", roof: "#cdb48c", pennant: "#83a056" };

function shardWatchtower(K, L) {
  const B = K.B, y = -0.22;
  K.part("footing", {}, () => K.rbox(1.6, 0.12, 1.6, L.tanDark, 0, 0, 0));
  K.part("base", {}, () => K.cone(0.74 * R2, 0.56 * R2, 1.2 + y, L.tan, 0, 0.12, 0, 4));
  K.part("leaner", {}, () => B.at(0.66, 0.12, 0.25, -Math.PI / 2, () => K.wedge(0.36, 0.9, 0.36, L.roof, 0, 0, 0)));
  K.part("slab-1", {}, () => tilt(B, [0, 1.32 + y, 0], [1, 0, 1], 0.1, () => K.rbox(1.7, 0.12, 1.5, L.paper, 0.05, 0, 0)));
  K.part("slab-2", {}, () => tilt(B, [0, 1.46 + y, 0], [1, 0, -1], 0.09, () => K.rbox(1.45, 0.12, 1.65, L.roof, -0.05, 0, 0.05)));
  K.part("mid", {}, () => K.cone(0.58 * R2, 0.46 * R2, 0.7, L.tan, 0, 1.56 + y, 0, 4));
  K.part("slab-3", {}, () => tilt(B, [0, 2.26 + y, 0], [1, 0, 1], -0.11, () => K.rbox(1.45, 0.12, 1.3, L.paper, 0.05, 0, -0.05)));
  K.part("slab-4", {}, () => tilt(B, [0, 2.4 + y, 0], [1, 0, -1], -0.08, () => K.rbox(1.2, 0.1, 1.35, L.roof, 0, 0, 0.05)));
  K.part("neck", {}, () => K.cone(0.42 * R2, 0.6 * R2, 0.5, L.tan, 0, 2.5 + y, 0, 4));
  K.part("shards", {}, () => {
    for (let k = 0; k < 9; k++) {
      const a = k * Math.PI * 2 / 9 + 0.2, r = 0.68;
      B.at(Math.sin(a) * r, 2.84 + y, Math.cos(a) * r, a, () => tilt(B, [0, 0, 0], [1, 0, 0], 0.6, () => K.spike(0.46, 0.55 + (k % 3) * 0.12, 0.2, L.slate, 0, 0, 0)));
    }
  });
  K.part("posts", {}, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(0.09, 0.45, 0.09, L.tan, sx * 0.32, 3.0 + y, sz * 0.32);
  });
  K.part("roof", {}, () => B.at(0, 3.45 + y, 0, Math.PI / 4, () => K.spike(1.25, 0.32, 1.0, L.roof, 0, 0, 0)));
  K.part("fin", {}, () => B.at(0, 3.45 + y, 0, Math.PI / 4, () => K.spike(0.95, 0.78, 0.18, L.paper, 0, 0, 0, 0.5)));
  B.sway("crown", { amp: CROWN, root: [0, 4.0, 0], span: 0.3 }, () => {
    K.part("pennant", {}, () => B.at(-0.62, 3.95 + y, -0.62, Math.PI / 4, () => K.box(0.04, 0.2, 0.3, L.pennant, 0, 0, 0.15)));
  });
}

const solid = (w, d, h) => Array.from({ length: w * d }, () => ({ pass: false, h }));

export const PROPS = {
  "cat-paint-tube-windmill": { footprint: [3, 3], height: 4, look: PAINT, build: paintTubeWindmill },
  "dragon-graphite-crane": { footprint: [3, 2], height: 4, look: CRANE, build: graphiteCrane },
  "chimera-ink-monolith": { footprint: [2, 2], height: 4, look: INK, build: inkMonolith },
  "wizard-scroll-tower": { footprint: [2, 2], height: 4, look: SCROLL, build: scrollTower },
  "swallow-blade-arch": { footprint: [3, 1], height: 3, look: BLADE, build: bladeArch, mask: [{ pass: false, h: 2.8 }, { pass: true, h: 2.9, over: 1.6 }, { pass: false, h: 2.8 }] },
  "sharkbear-shard-watchtower": { footprint: [2, 2], height: 4, look: SHARD, build: shardWatchtower },
};

const SMALL = "-small";

function entry(type) {
  const base = type.endsWith(SMALL) ? type.slice(0, -SMALL.length) : type;
  const p = PROPS[base];
  if (!p) return null;
  if (base === type) return { ...p, scale: 1 };
  const [w, d] = p.footprint, fw = Math.max(1, w - 1), fd = Math.max(1, d - 1), s = Math.min(fw / w, fd / d);
  return { ...p, footprint: [fw, fd], height: Math.max(1, Math.round(p.height * s)), mask: null, scale: s };
}

export function partsOf(type, style = {}) {
  const B = new Baker();
  const K = lockedKit(B, style, 0);
  const p = entry(type);
  p.build(K, { ...p.look });
  return K.parts.filter((q) => !q.face).map((q) => q.id);
}

export function register(style = {}) {
  const catalog = {}, builders = {};
  for (const type of Object.keys(PROPS).flatMap((t) => [t, t + SMALL])) {
    const p = entry(type), [w, d] = p.footprint;
    catalog[type] = stamp(p.footprint, p.mask || solid(w, d, p.height), { multitile: true });
    builders[type] = (v, rot, st) => {
      const B = new Baker();
      if (p.scale !== 1) B.push(0, 0, 0, 0, p.scale);
      const K = lockedKit(B, st || style, rot || 0);
      p.build(K, { ...p.look, ...(st?.palette?.multitile?.[type.replace(SMALL, "")] || {}) });
      if (p.scale !== 1) B.pop();
      const m = mesh(B);
      m.userData.parts = K.parts.filter((q) => !q.face).map((q) => q.id);
      return m;
    };
  }
  return { catalog, builders };
}

const MODULE = "pieces/multitile-themed-a.js";

function reserved(level, h) {
  const out = new Set(), add = (x, z, r = 0) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) out.add(h.key(x + a, z + b)); };
  for (const [x, z] of h.figure.cells) add(x, z, 1);
  add(...level.spawn, 1);
  const gates = new Set([...h.ofRole("threshold"), "arch"]);
  for (const d of level.decor) if (d === h.lead || gates.has(d.t) || CATALOG[d.t]?.stamp) for (const [x, z] of h.footprint(d)) add(x, z, CATALOG[d.t]?.stamp ? 0 : 1);
  for (const t of level.things || []) {
    const [sw, sd] = t.size || [1, 1];
    for (let a = 0; a < sw; a++) for (let b = 0; b < sd; b++) add(t.x + a, t.z + b, 1);
    for (const [x, z] of [...(t.blocks || []), ...(t.threshold || [])]) add(x, z, 1);
  }
  return out;
}

function sight(h) {
  const r = h.readability();
  h.log.pop();
  return r;
}

function candidates(level, h, type, route) {
  const spec = CATALOG[type], res = reserved(level, h), onR = new Set(route.map(([x, z]) => h.key(x, z)));
  const fc = h.figure.cells, fx = fc.map((c) => c[0]), fz = fc.map((c) => c[1]);
  const F = [(Math.min(...fx) + Math.max(...fx) + 1) / 2, (Math.min(...fz) + Math.max(...fz) + 1) / 2];
  const fMax = Math.max(...fc.map(([x, z]) => x + z)), fLat = F[0] - F[1], fh = h.cell(...h.figure.anchor).h;
  const S = [level.spawn[0] + 0.5, level.spawn[1] + 0.5];
  const toF = Math.atan2(F[1] - S[1], F[0] - S[0]);
  const out = [];
  const rots = spec.footprint[0] === spec.footprint[1] ? [0] : [0, 1];
  for (const rot of rots) {
    const [w, d] = rot % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    for (let z = 0; z + d <= h.D; z++) for (let x = 0; x + w <= h.W; x++) {
      const cs = [];
      for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) cs.push([x + a, z + b]);
      const c0 = h.cell(x, z);
      if (!cs.every(([a, b]) => { const q = h.cell(a, b); return h.land(q) && q.s !== "ramp" && q.s !== "bridge" && q.h === c0.h && !res.has(h.key(a, b)) && !onR.has(h.key(a, b)); })) continue;
      if (cs.some(([a, b]) => a + b > fMax && Math.abs(a - b - fLat) <= 2.5)) continue;
      const C = [x + w / 2, z + d / 2];
      const gap = Math.max(Math.max(0, Math.min(...fx) - (x + w - 1), x - Math.max(...fx)), Math.max(0, Math.min(...fz) - (z + d - 1), z - Math.max(...fz)));
      if (gap < 1 || gap > 5) continue;
      const depth = (C[0] + C[1]) - (F[0] + F[1]);
      let ang = Math.abs(Math.atan2(C[1] - S[1], C[0] - S[0]) - toF);
      if (ang > Math.PI) ang = 2 * Math.PI - ang;
      const rim = cs.filter(([a, b]) => [[1, 0], [0, 1]].some(([p, q]) => !h.land(h.cell(a + p, b + q)))).length / cs.length;
      out.push({ x, z, rot, score: gap + Math.max(0, depth) * 1.5 + ang * 2 + (c0.h < fh ? 1 : 0) + rim * 0.5 });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

export function placeLandmark(level, h, type, o = {}) {
  registerCatalog(register().catalog);
  const route = h.approach();
  const before = sight(h), m0 = h.reach().missing.length, w0 = h.walkN();
  for (const t of [type, type + SMALL]) {
    for (const c of candidates(level, h, t, route)) {
      const S = h.snapshot();
      if (!h.put(t, c.x, c.z, { rot: c.rot, v: 0 })) { h.restore(S); continue; }
      const after = sight(h);
      const ok = h.reach().missing.length <= m0 && h.walkN() >= w0 - CATALOG[t].mask.filter((m) => !m.pass).length && after.walks && after.xrayRun <= Math.max(3, before.xrayRun) && after.tallerInFront.length <= before.tallerInFront.length && after.route === before.route;
      if (!ok) { h.restore(S); continue; }
      level.pieces = [...new Set([...(level.pieces || []), MODULE])];
      h.log.push(`landmark ${t} at ${c.x},${c.z} rot ${c.rot} h${h.cell(c.x, c.z).h}${t !== type ? " (footprint shrunk one step)" : ""}`);
      return { t, ...c };
    }
  }
  h.log.push(`landmark ${type}: no flat clear footprint beside the figure court`);
  return null;
}
