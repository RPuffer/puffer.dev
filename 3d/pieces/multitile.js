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
  leaf: "#7ad662",
  leafDeep: "#5cbd5c",
  leafTop: "#94e46c",
  leafTeal: "#3fd9a0",
  post: "#b2704a",
  postDark: "#9c5e3a",
  plank: "#c98250",
  shingle: "#c47a4c",
  shingleAlt: "#b56c42",
  gate: "#d2d2d2",
  gateLight: "#e2e2e2",
  gateDark: "#bdbdbd",
  slit: "#6a6a72",
  hull: "#8e5034",
  hullDark: "#7a4229",
  hullDeck: "#a5643f",
  mast: "#7e4a2e",
  dock: "#e48238",
  dockAlt: "#cf6f2c",
  flag: "#f2f2ec",
  shrine: "#dcdcdc",
  shrineLight: "#ebebeb",
  shrineDark: "#c8c8c8",
  stall: "#b8692f",
  stallTop: "#d08a4c",
  awning: "#3ccfaa",
  awningWhite: "#f4f4ee",
  crate: "#c9843f",
  pot: "#b45a36",
  goods: "#f0d4a0",
  grass: "#a6e06a",
  dirt: "#cf7c5f",
  rock: "#c6c6c6",
  fall: "#2fb4f2",
  fallLight: "#68d2ff",
  pool: "#a0eeff",
  foam: "#eaf9ff",
};

const R2 = Math.SQRT2;
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const solidMask = (w, d, h) => Array.from({ length: w * d }, () => ({ pass: false, h }));
const tilt = (B, x, y, z, axis, a, fn) => { B.push(x, y, z, 0); B.rot(axis, a); fn(); B.pop(); B.pop(); };

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
        K.box(0.56, 1.4, 0.06, L.sail, 0.35, 0.42, -0.02);
        for (let r = 0; r < 5; r++) K.box(0.58, 0.07, 0.05, L.spar, 0.35, 0.5 + r * 0.3, 0.03);
        K.box(0.07, 1.4, 0.05, L.spar, 0.64, 0.42, 0.03);
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
    K.rbox(0.86, 1.7, 0.86, L.trunk, 0, 0.4, 0);
    K.rbox(0.68, 1.0, 0.68, L.trunk, 0, 2.1, 0);
  });
  K.part("buttress", {}, () => {
    for (let k = 0; k < 4; k++) B.at(0, 0, 0, k * Math.PI / 2 + Math.PI / 4, () => K.rbox(0.42, 1.3, 0.5, L.trunk, 0, 0, 0.48));
  });
  K.part("roots", {}, () => {
    for (let k = 0; k < 8; k++) {
      const long = k % 2 === 1;
      B.at(0, 0, 0, k * Math.PI / 4, () => {
        K.wedge(long ? 0.86 : 0.76, long ? 0.92 : 0.78, long ? 1.0 : 0.85, L.root, 0, 0, long ? 1.0 : 0.95);
        K.rbox(long ? 0.72 : 0.62, long ? 0.44 : 0.36, long ? 0.5 : 0.42, L.root, 0, 0, long ? 1.6 : 1.36);
      });
    }
  });
  K.part("boughs", {}, () => {
    tilt(B, 0.1, 2.2, 0, [0, 0, 1], -0.75, () => K.box(0.26, 0.9, 0.26, L.trunk, 0, 0, 0));
    tilt(B, 0, 2.3, 0.1, [1, 0, 0], 0.8, () => K.box(0.24, 0.85, 0.24, L.trunk, 0, 0, 0));
  });
  const root = [0, 2.75, 0], sway = (fn) => B.sway("crown", { amp: CROWN, root, span: 1.8 }, fn);
  const under = [
    [1.1, 0.7, -0.95, 2.35, -0.55, 1], [1.05, 0.7, 0.85, 2.3, -0.9, 1], [1.0, 0.65, -1.05, 2.25, 0.6, 1],
    [0.9, 0.6, 1.25, 2.4, -0.05, 1], [0.9, 0.6, -0.2, 2.4, -1.25, 1],
  ];
  const body = [
    [1.7, 1.0, 0, 2.75, 0, 0], [1.25, 0.9, -0.9, 2.85, -0.45, 0], [1.2, 0.85, 0.8, 2.9, -0.6, 0], [1.2, 0.85, -0.75, 2.8, 0.8, 0],
    [1.15, 0.8, 0.85, 2.75, 0.7, 0], [1.0, 0.8, 1.35, 2.7, 0.05, 0], [1.0, 0.75, -1.4, 2.8, 0.1, 0], [0.95, 0.75, 0.15, 2.7, 1.35, 0], [1.0, 0.7, -0.1, 2.95, -1.35, 0],
  ];
  const top = [[1.05, 0.65, -0.35, 3.6, -0.3, 2], [0.95, 0.6, 0.5, 3.55, 0.25, 2], [0.8, 0.5, -0.55, 3.5, 0.65, 0], [0.75, 0.5, 0.6, 3.5, -0.7, 0], [0.6, 0.38, 0.0, 4.0, 0.0, 2]];
  const lumps = [[0.5, 1.82, 3.0, 0.5], [0.46, -1.82, 3.15, -0.3], [0.44, 0.45, 2.75, 1.82], [0.48, -0.6, 3.1, -1.8], [0.42, 1.55, 3.4, -0.9], [0.4, -1.45, 2.7, 1.35], [0.36, 1.05, 3.7, 0.8]];
  const grow = (rows) => rows.map(([a, h, x, y, z, c]) => [a * 1.06, h * 0.95, x * 1.08, 2.8 + (y - 2.3) * 0.8, z * 1.08, c]);
  under.splice(0, under.length, ...grow(under));
  body.splice(0, body.length, ...grow(body));
  top.splice(0, top.length, ...grow(top));
  const tone = (c) => (c === 1 ? L.leafDeep : c === 2 ? L.leafTop : L.leaf);
  K.part("crown-under", {}, () => sway(() => { for (const [a, h, x, y, z, c] of under) K.rbox(a, h, a, tone(c), x, y, z); }));
  K.part("crown-body", {}, () => sway(() => { for (const [a, h, x, y, z, c] of body) K.rbox(a, h, a, tone(c), x, y, z); }));
  K.part("crown-top", {}, () => sway(() => { for (const [a, h, x, y, z, c] of top) K.rbox(a, h, a, tone(c), x, y, z); }));
  K.part("crown-lumps", {}, () => sway(() => { for (const [a, x, y, z] of lumps) K.rbox(a, a, a, L.leaf, x, y, z); }));
  K.part("accents", {}, () => sway(() => { for (const [a, x, y, z] of [[0.34, 0.7, 2.4, 1.3], [0.3, 1.35, 2.5, 0.5], [0.28, -0.35, 2.4, 1.4]]) K.rbox(a, a, a, L.leafTeal, x, y, z); }));
}

function watchtower(K, L) {
  const B = K.B, c = 0.68, deck = 2.3;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  K.part("footings", {}, () => { for (const [sx, sz] of corners) K.rbox(0.44, 0.34, 0.44, L.postDark, sx * c, 0, sz * c); });
  K.part("legs", {}, () => { for (const [sx, sz] of corners) K.rbox(0.3, deck - 0.3, 0.3, L.post, sx * c, 0.3, sz * c); });
  const brace = (axis, x, z) => {
    const a = Math.atan2(2 * c, 1.9), len = Math.hypot(2 * c, 1.9);
    for (const s of [-1, 1]) tilt(B, x, 1.35, z, axis, s * a, () => K.box(axis[0] ? 0.1 : 0.14, len, axis[0] ? 0.14 : 0.1, L.postDark, 0, -len / 2, 0));
  };
  K.part("brace-front", {}, () => brace([0, 0, 1], 0, c));
  K.part("brace-side", {}, () => brace([1, 0, 0], c, 0));
  K.part("girders", {}, () => {
    K.rbox(1.95, 0.24, 1.95, L.postDark, 0, deck - 0.24, 0);
    K.box(1.6, 0.16, 0.16, L.post, 0, 0.9, c);
    K.box(0.16, 0.16, 1.6, L.post, c, 0.9, 0);
  });
  K.part("deck", {}, () => { for (let i = 0; i < 4; i++) K.box(0.47, 0.12, 2.05, i % 2 ? L.plank : L.post, -0.72 + i * 0.48, deck, 0); });
  K.part("rail-posts", {}, () => {
    for (const [sx, sz] of corners) K.rbox(0.2, 0.62, 0.2, L.post, sx * 0.9, deck + 0.12, sz * 0.9);
    for (const [x, z] of [[0, 0.9], [0.9, 0]]) K.rbox(0.18, 0.55, 0.18, L.post, x, deck + 0.12, z);
  });
  K.part("rails", {}, () => {
    K.box(1.9, 0.12, 0.12, L.plank, 0, deck + 0.5, 0.9);
    K.box(0.12, 0.12, 1.9, L.plank, 0.9, deck + 0.5, 0);
    K.box(1.9, 0.12, 0.12, L.plank, 0, deck + 0.5, -0.9);
    K.box(0.12, 0.12, 1.9, L.plank, -0.9, deck + 0.5, 0);
  });
  K.part("roof-posts", {}, () => { for (const [sx, sz] of corners) K.rbox(0.17, 0.78, 0.17, L.postDark, sx * 0.5, deck + 0.12, sz * 0.5); });
  K.part("eave", {}, () => K.rbox(1.4, 0.14, 1.4, L.postDark, 0, deck + 0.88, 0));
  K.part("roof", {}, () => {
    const R = 1.14, h = 0.82, phi = Math.atan2(R, h), slant = Math.hypot(R, h), r = K.ramp(L.shingle);
    for (let k = 0; k < 4; k++) B.at(0, deck + 1.0, 0, k * Math.PI / 2, () => tilt(B, 0, 0, R, [1, 0, 0], -phi, () => K.spike(2 * R + 0.02, slant, 0.1, k === 0 ? r[1] : k === 1 ? r[0] : r[2], 0, 0, 0)));
  });
  K.part("finial", {}, () => K.cone(0.16 * R2, 0, 0.24, L.postDark, 0, deck + 1.76, 0, 4));
  K.part("ladder", {}, () => {
    for (const x of [-0.58, -0.18]) K.box(0.1, deck + 0.35, 0.1, L.post, x, 0, c + 0.32);
  });
  K.part("rungs", {}, () => { for (let i = 0; i < 7; i++) K.box(0.4, 0.07, 0.08, L.plank, -0.38, 0.3 + i * 0.36, c + 0.32); });
}

function gatehouse(K, L) {
  const B = K.B, tz = -0.48;
  K.part("tower-plinth", {}, () => K.rbox(1.0, 0.5, 1.0, L.gateDark, 1.0, 0, tz));
  K.part("tower", {}, () => K.rbox(0.88, 1.9, 0.88, L.gate, 1.0, 0.5, tz));
  K.part("tower-band", {}, () => K.rbox(0.96, 0.14, 0.96, L.gateLight, 1.0, 1.42, tz));
  K.part("tower-top", {}, () => K.rbox(1.02, 0.18, 1.02, L.gateLight, 1.0, 2.4, tz));
  K.part("crenels", {}, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.rbox(0.32, 0.4, 0.32, L.gate, 1.0 + sx * 0.33, 2.58, tz + sz * 0.33);
  });
  K.part("slit", { face: true }, () => {
    K.box(0.06, 0.4, 0.14, L.slit, 1.45, 1.7, tz);
    K.box(0.14, 0.4, 0.06, L.slit, 1.18, 1.7, tz + 0.45);
  });
  K.part("stub", {}, () => {
    K.rbox(0.92, 0.55, 1.0, L.gateDark, -1.0, 0, tz);
    K.rbox(0.82, 0.75, 0.86, L.gate, -1.0, 0.55, tz);
  });
  K.part("stub-break", {}, () => {
    K.rbox(0.46, 0.5, 0.5, L.gate, -1.16, 1.3, tz - 0.12);
    K.rbox(0.34, 0.3, 0.36, L.gateLight, -1.1, 1.3, tz + 0.24);
    tilt(B, -1.2, 1.8, tz - 0.15, [0, 0, 1], 0.3, () => K.rbox(0.3, 0.28, 0.32, L.gateLight, 0, 0, 0));
  });
  K.part("rubble-block", {}, () => {
    K.rbox(0.7, 0.42, 0.6, L.gate, -1.05, 0, 0.5);
    tilt(B, -0.9, 0.5, 0.45, [1, 0, 0], 0.25, () => K.rbox(0.42, 0.34, 0.4, L.gateLight, 0, 0, 0));
  });
  const vous = (x, y, a, w) => tilt(B, x, y, tz, [0, 0, 1], a, () => K.rbox(w, 0.5, 0.82, L.gateLight, 0, -0.25, 0));
  K.part("arch-foot", {}, () => K.rbox(0.5, 0.5, 0.82, L.gateLight, -0.72, 1.3, tz));
  K.part("arch-left", {}, () => vous(-0.4, 1.98, 0.75, 0.56));
  K.part("arch-key", {}, () => vous(0.06, 2.3, 0, 0.56));
  K.part("arch-right", {}, () => vous(0.5, 2.02, -0.7, 0.5));
  K.part("wall-walk", {}, () => {
    K.rbox(0.9, 0.24, 0.62, L.gate, 0.4, 2.3, tz);
    for (const x of [0.1, 0.5]) K.rbox(0.3, 0.22, 0.3, L.gateLight, x, 2.54, tz + 0.12);
  });
  K.part("rubble", {}, () => {
    for (const [sz, x, z, r] of [[0.3, -1.38, 1.0, 0.4], [0.24, -0.45, 0.9, 0.9], [0.22, -0.2, 0.55, 0.3], [0.2, 0.25, 0.95, 0.7]]) B.at(x, 0, z, r, () => K.rbox(sz, sz * 0.8, sz, L.gateLight, 0, 0, 0));
  });
}

function shipwreck(K, L) {
  const B = K.B, lift = 0.1;
  B.push(-0.2, 0.08, -0.3, 0.2);
  B.push(0, 0, 0, 0, 1.1);
  B.rot([1, 0, 0], 0.07);
  K.part("keel", {}, () => K.rbox(2.7, 0.4, 0.8, L.hullDark, 0, -0.1, 0));
  K.part("hull-left", {}, () => tilt(B, 0, 0.15, 0.48, [1, 0, 0], 0.28, () => K.box(2.9, 0.78, 0.2, L.hull, 0, 0, 0)));
  K.part("hull-right", {}, () => tilt(B, 0.1, 0.15, -0.48, [1, 0, 0], -0.28, () => K.box(2.7, 0.7, 0.2, L.hull, 0, 0, 0)));
  K.part("deck", {}, () => K.box(2.5, 0.1, 0.84, L.hullDeck, 0, 0.32, 0));
  K.part("ribs", {}, () => { for (const x of [-0.55, 0.15, 0.85]) K.box(0.16, 0.6, 1.1, L.hullDark, x, 0.3, 0); });
  K.part("gunwale", {}, () => {
    K.box(1.2, 0.14, 0.26, L.hullDeck, -0.65, 0.92, 0.6);
    K.box(0.7, 0.14, 0.26, L.hullDeck, 0.85, 0.92, 0.6);
    K.box(1.6, 0.14, 0.26, L.hullDeck, 0.1, 0.84, -0.6);
  });
  K.part("bow", {}, () => tilt(B, 1.45, 0.1, 0, [0, 0, 1], -0.75, () => K.cone(0.62 * R2, 0, 1.55, L.hull, 0, 0, 0, 4)));
  K.part("stern", {}, () => tilt(B, -1.45, 0.1, 0, [0, 0, 1], 0.7, () => K.cone(0.6 * R2, 0, 1.35, L.hull, 0, 0, 0, 4)));
  K.part("aft-castle", {}, () => K.rbox(0.8, 0.5, 0.86, L.hullDark, -0.95, 0.42, 0));
  K.part("mast", {}, () => {
    K.rbox(0.34, 0.16, 0.34, L.hullDark, 0.25, 0.42, 0);
    tilt(B, 0.25, 0.5, 0, [0, 0, 1], -0.22, () => { K.rbox(0.22, 1.6, 0.22, L.mast, 0, 0, 0); K.rbox(0.3, 0.14, 0.3, L.hullDark, 0, 0.55, 0); });
  });
  K.part("flag", {}, () => tilt(B, 0.25, 0.5, 0, [0, 0, 1], -0.22, () => B.sway("crown", { amp: CROWN * 1.2, root: [0, 1.3, 0], span: 0.4 }, () => K.box(0.08, 0.32, 0.46, L.flag, 0, 1.25, 0.27))));
  K.part("spar", {}, () => tilt(B, -0.3, 0.9, -0.15, [0.3, 0, 1], 0.95, () => K.rbox(0.16, 1.5, 0.16, L.mast, 0, 0, 0)));
  B.pop(); B.pop(); B.pop();
  K.part("dock-legs", {}, () => { for (const x of [0.15, 1.85]) for (const z of [0.12, 0.88]) K.rbox(0.16, 0.24, 0.16, L.dockAlt, x, lift - 0.1, z); });
  K.part("dock-beams", {}, () => { for (const z of [0.2, 0.8]) K.box(1.9, 0.08, 0.14, L.dockAlt, 1.0, lift + 0.04, z); });
  K.part("dock-planks", {}, () => { for (let i = 0; i < 6; i++) K.rbox(0.28, 0.08, 0.96, i % 2 ? L.dockAlt : L.dock, 0.17 + i * 0.33, lift + 0.08, 0.5); });
}

function shrine(K, L) {
  const p = 1.0, cols = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  K.part("plinth", {}, () => K.rbox(2.92, 0.1, 2.92, L.shrineDark, 0, 0, 0));
  K.part("dais", {}, () => K.rbox(2.5, 0.08, 2.5, L.shrine, 0, 0.1, 0));
  K.part("flags", {}, () => { for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.rbox(0.56, 0.03, 0.56, L.shrineLight, sx * 0.32, 0.18, sz * 0.32); });
  K.part("plinth-blocks", {}, () => { for (const [sx, sz] of cols) K.rbox(0.82, 0.3, 0.82, L.shrineDark, sx * p, 0, sz * p); });
  K.part("bases", {}, () => { for (const [sx, sz] of cols) K.rbox(0.56, 0.2, 0.56, L.shrine, sx * p, 0.3, sz * p); });
  K.part("steps", {}, () => { for (const [sx, sz] of cols) K.rbox(0.42, 0.14, 0.42, L.shrineLight, sx * p, 0.5, sz * p); });
  K.part("columns", {}, () => { for (const [sx, sz] of cols) K.rbox(0.3, 0.92, 0.3, L.shrine, sx * p, 0.64, sz * p); });
  K.part("bands", {}, () => { for (const [sx, sz] of cols) K.rbox(0.36, 0.08, 0.36, L.shrineLight, sx * p, 1.06, sz * p); });
  K.part("capitals", {}, () => { for (const [sx, sz] of cols) K.rbox(0.44, 0.16, 0.44, L.shrineLight, sx * p, 1.56, sz * p); });
  K.part("lintels", {}, () => {
    for (const s of [-1, 1]) {
      K.box(2.0, 0.14, 0.3, L.shrineDark, 0, 1.58, s * p);
      K.box(0.3, 0.14, 2.0, L.shrineDark, s * p, 1.58, 0);
    }
  });
  K.part("roof", {}, () => K.rbox(2.7, 0.24, 2.7, L.shrineLight, 0, 1.72, 0));
  K.part("entry-steps", {}, () => {
    K.rbox(0.8, 0.06, 0.3, L.shrineLight, 0, 0, 1.38);
    K.rbox(0.3, 0.06, 0.8, L.shrineLight, 1.38, 0, 0);
  });
}

function marketRow(K, L) {
  const B = K.B, xs = [-1, 0, 1];
  K.part("counters", {}, () => { for (const x of xs) K.rbox(0.86, 0.55, 0.56, L.stall, x, 0, 0.08); });
  K.part("counter-tops", {}, () => { for (const x of xs) K.rbox(0.94, 0.08, 0.66, L.stallTop, x, 0.55, 0.1); });
  K.part("posts-front", {}, () => { for (const x of [-1.42, -0.5, 0.5, 1.42]) K.rbox(0.13, 1.42, 0.13, L.stall, x, 0, 0.4); });
  K.part("posts-back", {}, () => { for (const x of [-1.42, -0.5, 0.5, 1.42]) K.rbox(0.13, 1.62, 0.13, L.stall, x, 0, -0.4); });
  K.part("beams", {}, () => {
    K.box(2.96, 0.1, 0.12, L.stall, 0, 1.36, 0.4);
    K.box(2.96, 0.1, 0.12, L.stall, 0, 1.56, -0.4);
  });
  const strips = 10, sw = 3.1 / strips;
  const cloth = (y0, z0, ang, depth) => tilt(B, 0, y0, z0, [1, 0, 0], ang, () => {
    for (let i = 0; i < strips; i++) K.box(sw, 0.07, depth, i % 2 ? L.awningWhite : L.awning, -1.55 + sw * (i + 0.5), 0, depth / 2);
  });
  const sway = (fn) => B.sway("crown", { amp: CROWN * 0.5, root: [0, 1.5, 0], span: 0.5 }, fn);
  K.part("awning", {}, () => sway(() => cloth(1.98, -0.46, 0.42, 1.16)));
  K.part("awning-roll", {}, () => sway(() => { for (let i = 0; i < strips; i++) K.rbox(sw, 0.2, 0.24, i % 2 ? L.awningWhite : L.awning, -1.55 + sw * (i + 0.5), 1.86, -0.5); }));
  K.part("shelf", {}, () => K.box(2.9, 0.08, 0.14, L.stallTop, 0, 1.05, -0.4));
  K.part("valance", {}, () => sway(() => { for (let i = 0; i < strips; i++) K.box(sw, 0.3, 0.07, i % 2 ? L.awningWhite : L.awning, -1.55 + sw * (i + 0.5), 1.18, 0.6); }));
  K.part("crates", {}, () => {
    K.rbox(0.3, 0.26, 0.3, L.crate, -1.18, 0.63, 0.05);
    K.rbox(0.28, 0.24, 0.28, L.crate, 0.82, 0.63, -0.02);
    B.at(-0.22, 0, 0.36, 0.2, () => K.rbox(0.32, 0.3, 0.3, L.crate, 0, 0, 0));
  });
  K.part("crate-slats", { face: true }, () => {
    K.box(0.06, 0.2, 0.02, L.stall, -1.18, 0.66, 0.21);
    K.box(0.06, 0.2, 0.02, L.stall, 0.82, 0.65, 0.13);
  });
  K.part("pots", {}, () => {
    for (const [x, z, r] of [[-0.86, 0.12, 0.13], [0.12, 0.08, 0.15], [1.18, 0.15, 0.12]]) { K.cyl(r, 0.22, L.pot, x, 0.63, z, 8); K.cyl(r * 0.6, 0.06, L.pot, x, 0.85, z, 8); }
  });
  K.part("goods", {}, () => {
    K.rbox(0.36, 0.1, 0.3, L.goods, -0.2, 0.63, 0.12);
    K.rbox(0.3, 0.12, 0.26, L.goods, 1.0, 0.63, 0.12);
  });
}

function waterfallCliff(K, L) {
  const B = K.B, fw = 0.8;
  K.part("base", {}, () => K.rbox(2.0, 1.0, 2.0, L.dirt, 0, 0, -0.5));
  K.part("ledge-grass", {}, () => {
    K.rbox(0.72, 0.18, 0.66, L.grass, -0.64, 0.96, 0.17);
    K.rbox(0.72, 0.18, 0.66, L.grass, 0.64, 0.96, 0.17);
  });
  K.part("rocks", {}, () => {
    K.rbox(0.56, 0.46, 1.0, L.rock, -0.72, 0.98, -0.32);
    K.rbox(0.56, 0.5, 0.9, L.rock, 0.72, 0.98, -0.2);
  });
  K.part("pillar-left", {}, () => K.rbox(0.56, 1.0, 0.62, L.dirt, -0.72, 1.44, -1.18));
  K.part("cap-left", {}, () => K.rbox(0.62, 0.22, 0.68, L.grass, -0.72, 2.4, -1.18));
  K.part("pillar-right", {}, () => K.rbox(0.56, 1.3, 1.1, L.dirt, 0.72, 1.48, -0.92));
  K.part("cap-right", {}, () => K.rbox(0.62, 0.22, 1.16, L.grass, 0.72, 2.74, -0.92));
  K.part("source", {}, () => { K.rbox(0.84, 1.86, 0.5, L.dirt, 0, 1.0, -1.25); K.rbox(0.9, 0.2, 0.56, L.grass, 0, 2.86, -1.25); });
  const stream = (y0, y1, z, n, phase) => {
    const seg = (y0 - y1) / n, x0 = -fw / 2;
    for (const [u, w, hex, foam] of [[0, 0.18, L.fall, false], [0.18, 0.08, L.foam, true], [0.26, 0.22, L.fallLight, false], [0.48, 0.08, L.foam, true], [0.56, 0.24, L.fall, false]]) {
      for (let i = 0; i < n; i++) {
        const top = y0 - seg * i, mid = [x0 + u + w / 2, top - seg / 2, z];
        const q = () => K.box(w, seg, 0.12, hex, x0 + u + w / 2, top - seg, z);
        if (foam) B.sway("fall", { phase: phase + i * 0.9, root: mid, span: seg / 2 }, q);
        else B.sway("swatch", { rate: 0.7, duty: 0.2, phase: -(phase + i) * 1.1, root: mid, alt: L.pool }, q);
      }
    }
  };
  K.part("fall-upper", {}, () => stream(2.9, 1.42, -0.94, 5, 0));
  K.part("channel", {}, () => { K.box(fw, 0.08, 1.46, L.fallLight, 0, 1.36, -0.24); K.box(fw + 0.04, 0.1, 0.16, L.foam, 0, 1.4, -0.86); });
  K.part("fall-lower", {}, () => stream(1.46, 0.04, 0.54, 6, 5));
  K.part("pool", {}, () => {
    K.rbox(1.96, 0.05, 0.96, L.pool, 0, 0, 1.0);
    K.rbox(0.9, 0.06, 0.44, L.fallLight, 0, 0, 0.76);
  });
  K.part("foam", {}, () => {
    K.rbox(0.72, 0.18, 0.3, L.foam, 0, 0, 0.7);
    K.rbox(0.3, 0.3, 0.22, L.foam, 0.16, 0, 0.62);
    K.rbox(0.22, 0.14, 0.2, L.foam, -0.24, 0.18, 0.64);
  });
  K.part("bubbles", {}, () => {
    for (const [x, z, s] of [[-0.55, 0.95, 0.16], [-0.3, 1.28, 0.12], [0.45, 1.2, 0.15], [0.66, 0.85, 0.11]]) B.sway("ripple", { amp: 0.035, root: [x, 0.05, z] }, () => K.rbox(s, 0.06, s, L.fallLight, x, 0.05, z));
  });
}

const cellMask = (rows) => rows.flat();
const B_ = (h) => ({ pass: false, h });
const P_ = (h, over) => ({ pass: true, h, ...(over != null ? { over } : {}) });
const W_ = (h) => ({ pass: false, h, span: true });

export const PROPS = {
  "windmill": { footprint: [3, 3], height: 4, build: windmill },
  "canopy-tree": { footprint: [3, 3], height: 4, build: canopyTree },
  "watchtower": { footprint: [2, 2], height: 4, build: watchtower },
  "gatehouse": { footprint: [3, 2], height: 3, build: gatehouse, mask: cellMask([[B_(2.3), P_(2.6, 1.6), B_(3)], [B_(0.9), P_(0.2), P_(0)]]) },
  "shipwreck": { footprint: [4, 2], height: 3, build: shipwreck, mask: cellMask([[W_(1.4), W_(1.6), W_(3), W_(1.6)], [B_(1.2), B_(1.2), P_(0.2), P_(0.2)]]) },
  "shrine": { footprint: [3, 3], height: 2, build: shrine, mask: cellMask([[B_(2), P_(2, 1.6), B_(2)], [P_(2, 1.6), P_(2, 1.6), P_(2, 1.6)], [B_(2), P_(2, 1.6), B_(2)]]) },
  "market-row": { footprint: [3, 1], height: 2, build: marketRow },
  "waterfall-cliff": { footprint: [2, 3], height: 3, build: waterfallCliff, mask: cellMask([[B_(3), B_(3)], [B_(1.6), B_(1.6)], [W_(0.3), W_(0.3)]]) },
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
    catalog[t] = stamp(p.footprint, p.mask || solidMask(w, d, p.height), { multitile: true });
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
