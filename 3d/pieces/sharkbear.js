import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-a.js";
import { audit, figure, lockedKit } from "../prims.js";

const HIDE = {
  back: ["#5b7091", "#4a5c79", "#3a4860"],
  side: ["#7890b2", "#627997", "#4d607b"],
  dark: ["#46566f", "#39465b", "#2b3546"],
  belly: ["#e7ebef", "#cdd4dc", "#aab4c0"],
  skull: ["#f5f1e6", "#ddd6c6", "#bab19f"],
  fin: ["#9fb2cc", "#8398b6", "#687c98"],
  accent: ["#ff6a5c", "#e24c3f", "#b8392e"],
};
const INK = ["#1b1f2a", "#141820", "#0d1016"];
const WHITE = ["#ffffff", "#f0ede6", "#d8d2c8"];
const WOOD = ["#b9824e", "#98673a", "#77502c"];
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function blade(B, pts, t, c, x, y, z) {
  B.rot([0, 0, 1], Math.PI / 2, x, y, z);
  B.prism(pts, -t, t, pal(c), { bottom: true });
  B.pop();
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function paw(B, K, x, y, z, h) {
  B.rbox(0.3, h, 0.3, 0.06, pal(K.side), x, y + 0.1, z);
  B.rbox(0.36, 0.14, 0.38, 0.06, pal(K.dark), x, y, z + 0.03);
  for (const dx of [-0.1, 0, 0.1]) B.box(0.06, 0.06, 0.07, pal(WHITE), x + dx, y, z + 0.24);
}

function snout(B, c, r, len, x, y, z) {
  B.rot([1, 0, 0], Math.PI / 2, x, y, z);
  B.cone(r, 0, len, pal(c), 0, 0, 0, 6);
  B.pop();
}

function head(B, K, open) {
  B.rbox(0.62, 0.46, 0.56, 0.12, pal(K.skull), 0, 0.12, -0.04);
  B.rbox(0.5, 0.2, 0.4, 0.1, pal(K.skull), 0, 0.58, -0.08);
  snout(B, K.skull, 0.3, 0.62, 0, 0.36, 0.22);
  B.box(0.54, 0.08, 0.46, pal(K.accent), 0, 0.08 - open * 0.3, 0.2);
  B.rbox(0.5, 0.12, 0.56, 0.06, pal(K.belly), 0, -open, 0.14);
  for (let i = 0; i < 5; i++) {
    const z = 0.02 + i * 0.1, w = 0.24 - i * 0.03;
    for (const sx of [-1, 1]) {
      B.cone(0.035, 0, 0.1, pal(WHITE), sx * w, 0.08 - open * 0.3, z, 4);
      B.cone(0.03, 0, 0.08, pal(WHITE), sx * (w - 0.03), 0.12 - open, z + 0.05, 4);
    }
  }
  for (const sx of [-1, 1]) {
    B.box(0.05, 0.14, 0.14, pal(INK), sx * 0.29, 0.34, 0.14);
    B.box(0.04, 0.05, 0.05, pal(WHITE), sx * 0.31, 0.4, 0.17);
    for (const gz of [-0.12, -0.2, -0.28]) B.box(0.04, 0.22, 0.035, pal(K.dark), sx * 0.3, 0.16, gz);
  }
  blade(B, [[0, -0.62], [0, 0.22], [0.26, 0.0], [0.5, -0.36], [0.66, -0.78], [0.5, -0.74], [0.24, -0.66]], 0.1, K.fin, 0, 0.66, 0);
}

function tail(B, K, y, z, sweep) {
  B.rbox(0.3, 0.26, 0.34, 0.08, pal(K.side), sweep * 0.08, y, z);
  B.rbox(0.22, 0.2, 0.34, 0.06, pal(K.back), sweep * 0.22, y - 0.06, z - 0.26);
  B.at(sweep * 0.36, y - 0.1, z - 0.5, sweep * 0.9, () => {
    blade(B, [[0, 0.1], [0.72, -0.34], [0.6, -0.1], [0.06, 0.16], [-0.36, -0.12], [-0.26, 0.06]], 0.05, K.fin, 0, 0.1, 0);
  });
}

function body(B, K, pose, v, o = {}) {
  const y0 = 0.22;
  const low = pose === "bask";
  const crouch = pose === "stalk";
  const legH = low ? 0.1 : crouch ? 0.3 : 0.42;
  const fy = y0 + legH;
  const ry = y0 + (low ? 0.1 : crouch ? 0.52 : 0.42);
  if (low) {
    paw(B, K, -0.3, y0, 0.58, 0.1);
    paw(B, K, 0.32, y0, 0.66, 0.1);
    B.rbox(0.36, 0.26, 0.42, 0.08, pal(K.side), -0.44, y0, -0.38);
    B.rbox(0.36, 0.26, 0.42, 0.08, pal(K.side), 0.44, y0, -0.38);
  } else {
    paw(B, K, -0.3, y0, 0.4, legH);
    paw(B, K, 0.3, y0, crouch ? 0.56 : 0.36, legH);
    paw(B, K, -0.32, y0, -0.48, ry - y0);
    paw(B, K, 0.32, y0, -0.52, ry - y0);
  }
  B.rbox(0.92, 0.58, 0.72, 0.16, pal(K.side), 0, ry, -0.32);
  B.rbox(0.74, 0.3, 0.56, 0.14, pal(K.back), 0, ry + 0.58, -0.3);
  B.rbox(0.98, 0.62, 0.66, 0.16, pal(K.side), 0, fy, 0.22);
  B.rbox(0.8, 0.34, 0.56, 0.14, pal(K.back), 0, fy + 0.62, 0.14);
  if (!o.hump) B.rbox(0.5, 0.16, 0.4, 0.1, pal(K.dark), 0, fy + 0.96, 0.08);
  B.box(0.6, 0.12, 1.0, pal(K.belly), 0, fy - 0.03, -0.08);
  wedge(B, 0.66, 0.5, 0.2, K.belly, 0, fy + 0.06, 0.6);
  if (!o.hump) blade(B, [[0, -0.2], [0, 0.14], [0.26, -0.12], [0.3, -0.24]], 0.05, K.fin, 0, ry + 0.86, -0.36);
  if (o.hump) hump(B, K, ry, fy, o.hump);
  if (o.curl) curlTail(B, K, ry + 0.1, o.curl);
  else tail(B, K, ry + 0.2, -0.68, v % 2 ? 1 : -1);
  const hy = (low ? fy + 0.3 : crouch ? fy + 0.24 : fy + 0.5) + (o.headY || 0);
  const tilt = o.tilt ?? (low ? 0.08 : crouch ? 0.3 : 0);
  B.at(0.04, hy, 0.62 + (o.headZ || 0), o.headYaw ?? 0.12 + (v % 2) * 0.08, () => {
    B.push(0, 0, 0, 0, 1.18);
    B.rot([1, 0, 0], tilt, 0, 0, 0);
    head(B, K, o.open ?? (crouch ? 0.16 : low ? 0.03 : 0.06));
    B.pop();
    B.pop();
  });
}

const poseOf = (t) => (/bask|sun|lounge|rest|roost/i.test(t) ? "bask" : /stalk|hunt|chimera|crouch|predator/i.test(t) && !/guardian|abyssal|vigil/i.test(t) ? "stalk" : "stand");
const DESIGN_H = { bask: 2.0, stand: 2.5, stalk: 2.3 };
const LEAD_H = { bask: 2.6, stand: 2.9, stalk: 2.8 };

function beast(B, t, H, look, v) {
  const p = poseOf(t);
  B.push(0, 0, 0, 0, H / DESIGN_H[p]);
  plinth(B, 1.0, 0.22, look.plinthLo, look.plinthHi);
  body(B, HIDE, p, v);
  B.pop();
}

function hump(B, K, ry, fy, k) {
  const top = Math.max(ry + 0.62, fy + 0.66);
  B.rbox(1.02, 0.3 * k, 1.12, 0.24, pal(K.side), 0, top, -0.12);
  B.rbox(0.84, 0.22 * k, 0.74, 0.22, pal(K.back), 0, top + 0.3 * k, -0.2);
  B.rbox(0.56, 0.1 * k, 0.4, 0.14, pal(K.back), 0, top + 0.52 * k, -0.24);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) wedge(B, 0.06, 0.1, 0.14, K.dark, sx * 0.52, top + 0.02, -0.6 + i * 0.3);
  blade(B, [[0, -0.16], [0, 0.12], [0.22, -0.08], [0.26, -0.2]], 0.05, K.fin, 0, top + 0.62 * k, -0.4);
}

function curlTail(B, K, y, side) {
  B.rbox(0.3, 0.26, 0.34, 0.08, pal(K.side), side * 0.1, y, -0.66);
  const segs = [[0.3, -0.7], [0.52, -0.46], [0.6, -0.14], [0.58, 0.18], [0.5, 0.46]];
  segs.forEach(([x, z], i) => B.rbox(0.24 - i * 0.03, 0.18 - i * 0.02, 0.28, 0.06, pal(i % 2 ? K.back : K.side), side * x, y - 0.1 - i * 0.03, z));
  B.at(side * 0.5, y - 0.18, 0.62, side * -0.3, () => {
    blade(B, [[0, 0.1], [0.72, -0.34], [0.6, -0.1], [0.06, 0.16], [-0.36, -0.12], [-0.26, 0.06]], 0.05, K.fin, 0, 0.1, 0);
  });
}

const SKINS = {
  graphite: {
    back: ["#8c8a86", "#76746f", "#5f5d59"], side: ["#a8a6a0", "#918f89", "#7a7873"], dark: ["#5a5856", "#474543", "#353331"],
    belly: ["#dcd8cf", "#c3bfb5", "#a39f95"], skull: ["#faf7ef", "#e6e1d6", "#c8c2b4"], fin: ["#ece8de", "#d4cfc3", "#b6b0a2"], accent: ["#4a3a36", "#3a2d2a", "#2a201e"],
  },
  coast: HIDE,
  dusk: {
    back: ["#6a574c", "#56463d", "#43362f"], side: ["#86705f", "#6f5c4e", "#58483d"], dark: ["#4a3b33", "#3a2e28", "#2b221d"],
    belly: ["#eadfc8", "#d2c5ab", "#b3a58a"], skull: ["#fbf3e2", "#e8dcc4", "#cabb9e"], fin: ["#efe2c8", "#d8c9aa", "#b9a88a"], accent: ["#e0523e", "#c23f2f", "#9a3024"],
  },
};

const LENS_POSE = {
  prowl: { skin: "graphite", o: { hump: 1.1, headYaw: -0.3, tilt: 0.52, headY: -0.18, headZ: 0.06, open: 0.14 } },
  grip: { skin: "coast", o: { hump: 0.9, headYaw: -0.2, tilt: 0.42, headY: -0.12, open: 0.1, curl: 1 } },
  turn: { skin: "dusk", o: { hump: 0.95, headYaw: 0.85, tilt: 0.2, open: 0.26, curl: -1 } },
};
const lensPose = (t, text = "") => /gripping|rim|coiled predator/i.test(text) ? "grip" : /turned toward|toward (the )?approach|facing camera/i.test(text) ? "turn" : /stalking quadruped|angled|down left|three-quarters down/i.test(text) ? "prowl" : null;

export function sharkbearSpec(c, o = {}) {
  const hd = { group: "head" }, open = o.open ?? 0.08;
  return {
    name: "sharkbear",
    groups: { head: { pivot: [0, 0.46], ry: o.turn ?? 0 } },
    parts: [
      { id: "fore", prim: "chain", at: [0, 0, 0.4], base: c.side, links: [
        { dims: [0.36, 0.14, 0.4], at: [-0.36, 0, 0.04], base: c.dark },
        { dims: [0.3, 0.66, 0.32], at: [-0.36, 0.1, 0], base: c.side },
        { dims: [0.36, 0.14, 0.4], at: [0.36, 0, 0.04], base: c.dark },
        { dims: [0.3, 0.66, 0.32], at: [0.36, 0.1, 0], base: c.side },
      ] },
      { id: "hind", prim: "chain", at: [0, 0, -0.42], base: c.side, links: [
        { dims: [0.3, 0.3, 0.32], at: [-0.36, 0, 0], base: c.dark },
        { dims: [0.38, 0.46, 0.5], at: [-0.38, 0.26, -0.04], base: c.side },
        { dims: [0.3, 0.3, 0.32], at: [0.36, 0, 0], base: c.dark },
        { dims: [0.38, 0.46, 0.5], at: [0.38, 0.26, -0.04], base: c.side },
      ] },
      { id: "belly", prim: "rbox", dims: [0.62, 0.14, 0.96], at: [0, 0.6, -0.04], base: c.belly },
      { id: "body", prim: "rbox", dims: [0.94, 0.56, 1.12], at: [0, 0.68, -0.08], base: c.side },
      { id: "hips", prim: "rbox", dims: [0.78, 0.26, 0.56], at: [0, 1.24, -0.42], base: c.back },
      { id: "shoulders", prim: "rbox", dims: [1.0, 0.5, 0.62], at: [0, 1.16, 0.18], base: c.back },
      { id: "fin", prim: "spike", dims: [0.56, 0.5, 0.1, -0.16], at: [0, 1.66, 0.06], ry: Math.PI / 2, base: c.fin },
      { id: "tail", prim: "chain", at: [0, 0, 0], base: c.side, links: [
        { dims: [0.34, 0.3, 0.34], at: [0.16, 0.74, -0.72], base: c.side },
        { dims: [0.3, 0.26, 0.32], at: [0.38, 0.52, -0.86], ry: 0.6, base: c.back },
        { dims: [0.27, 0.22, 0.3], at: [0.6, 0.32, -0.8], ry: 1.2, base: c.side },
        { dims: [0.24, 0.18, 0.28], at: [0.76, 0.16, -0.56], ry: 1.9, base: c.back },
        { dims: [0.22, 0.14, 0.28], at: [0.82, 0.06, -0.26], ry: 2.6, base: c.side },
        { dims: [0.2, 0.12, 0.26], at: [0.8, 0.02, 0.04], ry: 3.0, base: c.back },
        { prim: "spike", dims: [0.56, 0.46, 0.08, 0.24], at: [0.78, 0.02, 0.32], ry: 1.4, base: c.fin },
      ] },
      { id: "head", ...hd, prim: "rbox", dims: [0.58, 0.42, 0.6], at: [0, 0.82, 0.74], base: c.skull },
      { id: "snout", ...hd, prim: "wedge", dims: [0.5, 0.3, 0.42], at: [0, 0.9, 1.22], base: c.skull },
      { id: "jaw", ...hd, prim: "rbox", dims: [0.48, 0.12, 0.7], at: [0, 0.72 - open, 0.86], base: c.belly },
      { id: "mouth", ...hd, face: true, prim: "box", dims: [0.44, 0.05, 0.6], at: [0, 0.84 - open, 0.9], base: c.accent },
      { id: "eyeL", ...hd, face: true, prim: "box", dims: [0.04, 0.08, 0.08], at: [-0.3, 1.04, 0.92], base: c.accent },
      { id: "eyeR", ...hd, face: true, prim: "box", dims: [0.04, 0.08, 0.08], at: [0.3, 1.04, 0.92], base: c.accent },
      { id: "gillL", ...hd, face: true, prim: "box", dims: [0.04, 0.2, 0.04], at: [-0.3, 0.9, 0.58], base: c.dark },
      { id: "gillR", ...hd, face: true, prim: "box", dims: [0.04, 0.2, 0.04], at: [0.3, 0.9, 0.58], base: c.dark },
    ],
  };
}

function sharkbearFull(B, H, look, v, ctx) {
  const K = SKINS.graphite, c = { side: K.side[0], back: K.back[0], dark: K.dark[0], belly: K.belly[0], skull: K.skull[0], fin: K.fin[0], accent: "#3c3c3c" };
  const spec = sharkbearSpec(c, { turn: 0.35 + (v % 2) * 0.1, open: 0.08 });
  const a = audit(spec), base = 0.22;
  B.push(0, 0, 0, 0, H / (base + a.height));
  plinth(B, 1.0, base, look.plinthLo, look.plinthHi);
  B.push(0, base, 0, -0.25 + (v % 2) * 0.06, 1);
  const k = lockedKit(B, ctx.style, ctx.rot || 0);
  figure(k, spec);
  B.pop();
  B.pop();
  return k;
}

function stalker(B, H, look, v, lp) {
  const L = LENS_POSE[lp];
  B.push(0, 0, 0, 0, H / 2.6);
  plinth(B, 1.0, 0.22, look.plinthLo, look.plinthHi);
  B.at(0, 0, 0, lp === "turn" ? 0.35 : lp === "prowl" ? 0.1 : 0.25, () => body(B, SKINS[L.skin], "stalk", v, L.o));
  B.pop();
}

function threshold(B, t, H, c0, c1, c2, d) {
  const tall = H * 0.62;
  B.box(0.48, 0.22, 0.48, pal(c2));
  if (/pylon/i.test(t)) {
    B.box(0.38, tall * 0.6, 0.38, pal(c0), 0, 0.22, 0);
    B.box(0.32, tall * 0.4, 0.32, pal(c1), 0, 0.22 + tall * 0.6, 0);
    B.box(0.42, 0.1, 0.42, pal(c2), 0, 0.22 + tall, 0);
    blade(B, [[0, -0.14], [0, 0.14], [0.34, -0.02], [0.44, -0.2], [0.26, -0.18]], 0.06, HIDE.skull, 0, 0.32 + tall, 0);
  } else if (/basalt|jagged|monolith/i.test(t)) {
    B.box(0.4, tall * 0.5, 0.38, pal(c0), 0, 0.22, 0);
    B.box(0.3, tall * 0.35, 0.3, pal(c1), 0.03, 0.22 + tall * 0.5, -0.02);
    B.cone(0.2, 0, tall * 0.4, pal(c0), 0.03, 0.22 + tall * 0.85, -0.02, 4);
    B.cone(0.1, 0, 0.3, pal(HIDE.skull), -0.16, 0.22, 0.14, 4);
  } else {
    B.box(0.36, tall * 0.45, 0.36, pal(c0), 0, 0.22, 0);
    B.box(0.4, 0.1, 0.4, pal(WOOD), 0, 0.22 + tall * 0.45, 0);
    B.box(0.3, tall * 0.35, 0.3, pal(HIDE.skull), 0, 0.32 + tall * 0.45, 0);
    B.cone(0.18, 0, tall * 0.35, pal(HIDE.skull), 0, 0.32 + tall * 0.8, 0, 4);
  }
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.7, 0.14, /pylon|basalt|jagged/i.test(t) ? c2 : WOOD);
    beam(H * 0.7 + 0.14, 0.1, HIDE.accent);
  }
}

function detail(B, t, H, v, c0, c1, c2) {
  if (/drift|log|timber/i.test(t)) {
    B.at(0, 0, 0, v % 2 ? 0.5 : -0.3, () => {
      B.rbox(0.3, 0.26, 0.8, 0.1, pal(WOOD), 0, 0, 0);
      B.box(0.32, 0.08, 0.1, pal(HIDE.skull), 0, 0.2, 0.12);
      B.box(0.32, 0.08, 0.1, pal(HIDE.skull), 0, 0.2, -0.14);
      B.box(0.12, 0.1, 0.16, pal(c1), 0.08, 0.26, 0.3);
    });
  } else if (/stump|trophy/i.test(t)) {
    B.cyl(0.26, H * 0.6, pal(c0), 0, 0, 0, 7);
    B.cyl(0.22, 0.06, pal(c1), 0, H * 0.6, 0, 7);
    B.rot([0, 0, 1], v % 2 ? 0.35 : -0.35, 0, H * 0.6, 0);
    B.cone(0.1, 0, 0.42, pal(HIDE.skull), 0, 0, 0, 4);
    B.pop();
  } else {
    B.box(0.42, H * 0.5, 0.42, pal(c0));
    wedge(B, 0.42, H * 0.5, 0.42, c1, 0, H * 0.5, 0);
  }
}


function rib(B, H, d, off, k, w, c, tip) {
  const n = 7, reach = d.side ? 0.92 : 0.3;
  const inX = d.side ? (d.axis === "x" ? 0 : -d.side) : 1, inZ = d.side ? (d.axis === "x" ? -d.side : 0) : 0;
  const ax = inX ? 0 : 1, az = inX ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), lean = Math.pow(f, 2.2) * reach * k;
    const y = 0.18 + f * H * k * 0.92;
    const bw = w * (1 - f * 0.35);
    B.box(inX ? bw + 0.04 : bw, H * k / n + 0.04, inZ ? bw + 0.04 : bw, pal(i === n - 1 && tip ? tip : c), inX * lean + ax * off, y, inZ * lean + az * off);
  }
}

const LENS_KINDS = [
  ["finGate", /fin-marker|cranial-fin|crest-gate/i],
  ["ribGate", /rib/i],
  ["shard", /shard|slab|flake/i],
  ["bristle", /bristle|quill|hatch-clump/i],
  ["cairn", /tooth|teeth|cairn/i],
  ["flotsam", /flotsam|wrack|cache/i],
  ["spire", /dorsal|spire/i],
  ["berm", /berm|caudal|sweep/i],
  ["jaw", /jaw|crevasse/i],
];
const lensKind = (t, role) => { const k = (LENS_KINDS.find(([, re]) => re.test(t)) || [null])[0]; if (role === "threshold") return k === "ribGate" ? "ribGate" : "finGate"; return k; };

const SLATE = ["#6f6a66", "#5a5552", "#46423f"];
const PAPER = ["#f2ead8", "#ddd3bd", "#c2b69c"];
const BONE = ["#f6f0e2", "#e1d9c6", "#c4baa3"];
const KELP = ["#4f8f7a", "#3d7462", "#2d5a4b"];

const LENS_BUILD = {
  finGate(B, H, v, { c1, d }) {
    B.box(0.5, 0.2, 0.5, pal(SLATE));
    B.box(0.4, 0.22, 0.4, pal(PAPER), 0, 0.2, 0);
    const flip = d.side && ((d.axis === "x") === (d.side < 0)) ? Math.PI : 0;
    B.at(0, 0, 0, (d.axis === "x" ? Math.PI / 2 : 0) + flip, () => {
      const s = H - 0.35;
      blade(B, [[0, -0.26], [0, 0.26], [s * 0.45, 0.16], [s * 0.8, -0.06], [s, -0.36], [s * 0.86, -0.34], [s * 0.5, -0.3]], 0.12, BONE, 0, 0.42, 0);
      blade(B, [[0, -0.3], [0, -0.2], [s * 0.5, -0.24], [s * 0.86, -0.3], [s * 0.4, -0.34]], 0.14, SLATE, 0, 0.42, 0);
    });
  },
  ribGate(B, H, v, { c0, c1, d, t }) {
    B.box(0.48, 0.18, 0.48, pal(/whale/i.test(t) ? ["#8a95a3", "#6f7a88", "#56616e"] : ["#b98a5e", "#9a6e46", "#7a5434"]));
    if (/whale|jaw/i.test(t)) {
      rib(B, H, d, 0, 1, 0.22, BONE, BONE);
      for (let i = 0; i < 4; i++) B.cone(0.05, 0, 0.14, pal(PAPER), (i - 1.5) * 0.09, 0.18 + H * 0.3, 0.14, 4);
    } else {
      rib(B, H, d, -0.26, 0.82, 0.13, c0, BONE);
      rib(B, H, d, 0, 1, 0.15, BONE, BONE);
      rib(B, H, d, 0.26, 0.9, 0.13, c1, BONE);
    }
  },
  shard(B, H, v, { c0 }) {
    B.at(0, 0, 0, v % 2 ? 0.5 : -0.4, () => {
      B.box(0.7, 0.1, 0.5, pal(c0), 0, 0, 0);
      wedge(B, 0.56, H * 0.8, 0.34, SLATE, -0.04, 0.1, -0.02);
      wedge(B, 0.3, H * 0.5, 0.2, PAPER, 0.2, 0.1, 0.16);
      B.box(0.12, 0.04, 0.32, pal(["#3c3a38", "#2e2c2a", "#222"]), -0.2, 0.1, 0.02);
    });
  },
  bristle(B, H, v) {
    B.rbox(0.56, 0.12, 0.5, 0.1, pal(["#6a6560", "#57524e", "#45403c"]), 0, 0, 0);
    const q = v % 2 ? [[0, 0, 0, 1], [0.16, 0.08, 0.35, 0.8], [-0.15, 0.1, -0.35, 0.85], [0.06, -0.16, 0.2, 0.7], [-0.1, -0.12, -0.2, 0.75], [0.18, -0.06, 0.55, 0.6]] : [[0, 0, 0.1, 1], [0.15, -0.1, 0.4, 0.75], [-0.16, 0.06, -0.4, 0.9], [0.08, 0.16, 0.25, 0.8], [-0.08, -0.16, -0.25, 0.7]];
    q.forEach(([x, z, lean, k], i) => {
      B.rot([0, 0, 1], -lean * 0.6, x, 0.1, z);
      B.cone(0.1, 0, H * k, pal(i % 2 ? ["#4a4744", "#3a3836", "#2b2927"] : ["#7d7974", "#67635e", "#524e4a"]), x, 0.1, z, 4);
      B.pop();
    });
    B.box(0.08, 0.04, 0.08, pal(PAPER), 0, 0.1 + H * 0.92, 0);
  },
  cairn(B, H, v, { c0, c1 }) {
    const st = [[0.6, 0.18, SLATE], [0.46, 0.16, ["#8a95a3", "#6f7a88", "#56616e"]], [0.34, 0.14, SLATE]];
    let y = 0;
    st.forEach(([w, hh, c], i) => { B.rbox(w, hh, w * 0.9, 0.08, pal(c), (i % 2 ? 0.04 : -0.03), y, 0); y += hh; });
    const teeth = [[0, 0, 0.36], [0.1, 0.06, 0.26], [-0.1, 0.04, 0.28], [0.02, -0.1, 0.22]];
    for (const [x, z, hh] of teeth) B.cone(0.07, 0, Math.min(hh, H - y), pal(BONE), x, y, z, 4);
    B.rot([0, 0, 1], 0.9, 0.3, 0, 0.18); B.cone(0.06, 0, 0.22, pal(BONE), 0.3, 0, 0.18, 4); B.pop();
  },
  flotsam(B, H, v, { c0 }) {
    B.at(0, 0, 0, v % 2 ? 0.4 : -0.3, () => {
      B.rbox(0.9, 0.14, 0.24, 0.06, pal(WOOD), 0, 0, -0.12);
      B.rbox(0.24, 0.12, 0.8, 0.06, pal(["#c9a77c", "#ad8a60", "#8c6c46"]), 0.18, 0.14, 0.02);
      B.cyl(0.16, H * 0.55, pal(["#9a6a3c", "#7c532c", "#5e3d1e"]), -0.22, 0.14, 0.16, 8);
      B.cyl(0.17, 0.05, pal(SLATE), -0.22, 0.14 + H * 0.3, 0.16, 8);
      B.rbox(0.3, 0.14, 0.26, 0.1, pal(KELP), 0.2, 0.26, 0.2);
      B.box(0.36, 0.05, 0.06, pal(BONE), -0.1, 0.14, -0.3);
    });
  },
  spire(B, H, v, { c0 }) {
    B.prism(circle(0, 0, 0.44, 0.44, 6, Math.PI / 6), 0, 0.2, pal(["#9a8f84", "#7f756b", "#655d55"]));
    B.prism(circle(0, 0, 0.34, 0.34, 6, Math.PI / 6), 0.2, 0.34, pal(["#c9c2b6", "#aea79b", "#918a7f"]));
    const s = H - 0.36;
    B.at(0, 0, 0, v % 2 ? 0.6 : -0.5, () => {
      blade(B, [[0, -0.34], [0, 0.3], [s * 0.4, 0.2], [s * 0.78, -0.02], [s, -0.3], [s * 0.7, -0.3], [s * 0.35, -0.34]], 0.14, BONE, 0, 0.34, 0);
      blade(B, [[0, -0.38], [0, -0.26], [s * 0.35, -0.3], [s * 0.7, -0.34], [s * 0.95, -0.36], [s * 0.3, -0.4]], 0.16, ["#6a574c", "#56463d", "#43362f"], 0, 0.34, 0);
    });
  },
  berm(B, H, v, { c0 }) {
    B.at(0, 0, 0, v % 2 ? 0.8 : -0.8, () => {
      B.rbox(0.9, H * 0.45, 0.46, 0.18, pal(c0), 0, 0, 0);
      B.rbox(0.66, H * 0.2, 0.34, 0.14, pal(["#c49a58", "#a67e40", "#86622c"]), 0.04, H * 0.45, 0);
      for (const [x, z] of [[-0.3, 0.12], [-0.1, -0.1], [0.14, 0.1], [0.32, -0.06]]) B.rbox(0.14, 0.08, 0.12, 0.05, pal(BONE), x, H * 0.62, z);
      B.at(0.36, H * 0.5, 0, 0, () => blade(B, [[0, -0.06], [0, 0.1], [H * 0.55, -0.2], [H * 0.4, -0.12]], 0.05, BONE, 0, 0, 0));
    });
  },
  jaw(B, H, v) {
    B.rbox(0.62, 0.1, 0.62, 0.1, pal(["#5a3322", "#48281a", "#361d12"]), 0, 0, 0);
    B.rbox(0.4, 0.02, 0.4, 0.08, pal(["#241410", "#1b0f0c", "#120a08"]), 0, 0.1, 0);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2;
      B.cone(0.06, 0, H * (i % 2 ? 0.6 : 0.8), pal(BONE), x, 0.08, z, 4);
    }
  },
};

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang|pylon/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|hoard/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem|shard/i]];
const guess = (t) => (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
const roleOf = (P, t) => {
  const r = P.props?.[t]?.role;
  if (r === "creature") return "lead";
  if ((!r || r === "detail") && guess(t) === "threshold") return "threshold";
  return r || guess(t);
};

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ["#9aa5b4", "#808b9b", "#657080"]), plinthHi: pick(dt, 1, ["#d4d8dc", "#b8bec6", "#98a0aa"]) };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const lead = role === "lead";
    const lp = lead ? lensPose(t, p.pose || "") : null;
    const lk = lead ? null : lensKind(t, role);
    catalog[t] = { footprint: lead ? [2, 2] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lp === "prowl" ? 2.7 : lp ? 2.9 : lead ? LEAD_H[poseOf(t)] : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, HIDE.dark), c1 = pick(tn, 1, HIDE.belly), c2 = pick(tn, 2, HIDE.back);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lp === "prowl") { const k = sharkbearFull(B, H, look, v, { style: st, rot }); const m = mesh(B); m.userData.parts = k.parts; return m; }
      if (lp) stalker(B, H, look, v, lp);
      else if (lead) beast(B, t, H, look, v);
      else if (lk) LENS_BUILD[lk](B, H, v, { c0, c1, c2, d, t });
      else if (role === "threshold") threshold(B, t, H, c0, c1, c2, d);
      else if (role === "dais") plinth(B, 0.42, H, c0, c1);
      else if (role === "light") {
        if (/brazier/i.test(t)) {
          B.prism(circle(0, 0, 0.24, 0.24, 8, Math.PI / 8), 0, 0.16, pal(c2));
          B.prism(circle(0, 0, 0.14, 0.14, 8, Math.PI / 8), 0.16, H - 0.4, pal(c0));
          B.cone(0.18, 0.3, 0.2, pal(c1), 0, H - 0.4, 0, 8);
          B.box(0.26, 0.2, 0.26, pal(P.flame || ["#ffd23a", "#f0a020", "#d07a10"]), 0, H - 0.2, 0);
          B.cone(0.12, 0, 0.18, pal(HIDE.accent), 0, H - 0.02, 0, 4);
        } else {
          B.box(0.3, 0.14, 0.3, pal(c0));
          B.box(0.16, H - 0.62, 0.16, pal(c0), 0, 0.14, 0);
          B.box(0.34, 0.08, 0.34, pal(c1), 0, H - 0.48, 0);
          B.box(0.22, 0.24, 0.22, pal(P.flame || ["#ffd23a", "#f0a020", "#d07a10"]), 0, H - 0.4, 0);
          B.cone(0.24, 0, 0.18, pal(c2), 0, H - 0.16, 0, 4);
        }
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(v % 2 ? HIDE.accent : c1), -0.05, H * 0.55, 0.02);
      } else if (role === "mass") {
        B.box(0.34, H * 0.3, 0.34, pal(c0), 0, 0, 0);
        const segs = v % 2 ? [0.8, 0.62, 0.42] : [0.74, 0.56, 0.36];
        const hh = (H * 0.7) / segs.length;
        segs.forEach((w, i) => B.rbox(w, hh, w, 0.1, pal(i % 2 ? c2 : c1), i % 2 ? 0.03 : -0.02, H * 0.3 + i * hh, i % 2 ? -0.02 : 0.02));
      } else detail(B, t, H, v, c0, c1, c2);
      return mesh(B);
    };
  }
  return { catalog, builders };
}

function grow(h, want) {
  const { W, D } = h;
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let pass = 0; pass < 40 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground });
  }
}

function unstone(h, keep) {
  const { W, D } = h;
  let land = 0, stone = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const c = h.cell(x, z); if (h.land(c)) { land++; if (c.s === "stone") stone++; } }
  if (stone / Math.max(1, land) < 0.3) return;
  const base = (c) => (c.h >= 2 && h.surf.raised !== "stone" ? h.surf.raised : h.surf.ground !== "stone" ? h.surf.ground : "grass");
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || keep.has(h.key(x, z)) || (x * 3 + z * 5) % 9 === 0) continue;
    h.set(x, z, { h: c.h, s: base(c) });
  }
  h.log.push(`unstone: ${stone}/${land} stone cells repainted`);
}

function farSpawn(h, level) {
  if (h.approach().length >= 7) return;
  const [cx, cz] = h.figure.anchor;
  let best = null, bs = -1;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || c.h > 1 || h.isFig(x, z) || h.decorAt(x, z).length) continue;
    if (!h.route(level.spawn, [x, z])) continue;
    const sc = Math.max(Math.abs(x - cx), Math.abs(z - cz)) + 0.6 * (x - cx + z - cz);
    if (sc > bs) { bs = sc; best = [x, z]; }
  }
  if (best) { h.log.push(`spawn ${level.spawn} -> ${best}`); level.spawn = best; }
}

function lamps(h, t, route, want, avoid) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0, last = -3;
  for (let i = 1; i < route.length - 1 && n < want; i++) {
    const [x, z] = route[i];
    if (i - last < 3 || h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 2) || avoid.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) <= 1)) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + a, Z = z + b, c = h.cell(X, Z);
      if (!h.land(c) || c.s === "ramp" || on.has(h.key(X, Z)) || h.cell(x, z).h !== c.h) continue;
      if (h.decorAt(X, Z).some((d) => !/flower|grass|tuft/i.test(d.t))) continue;
      const before = h.reach().reached;
      if (h.put(t, X, Z) && h.reach().reached >= before - 1) { n++; last = i; break; }
      h.removeDecor((d) => d.t === t && d.x === X && d.z === Z);
    }
  }
  h.log.push(`lamps ${t} x${n}`);
  return n;
}

const CATALOG_HAS = (level, t) => t === "lantern" || t === "torch" || !!level.palette?.props?.[t];

function thin(h, level, max) {
  const trees = level.decor.filter((d) => /tree|pine|cypress/i.test(d.t));
  if (trees.length <= max) return;
  const drop = new Set(trees.filter((d, i) => i % Math.ceil(trees.length / (trees.length - max)) === 0).slice(0, trees.length - max));
  const n = h.removeDecor((d) => drop.has(d));
  h.log.push(`thin: ${n} of ${trees.length} trees removed`);
}

function seal(h) {
  const { W, D } = h;
  let n = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "water" && c.h === 0) { h.set(x, z, { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground }); n++; }
  }
  if (n) { h.removeDecor((d) => d.t === "waterfall"); h.log.push(`seal: ${n} low water cells closed`); }
}

function ledges(h, types, level) {
  const drop = (x, z) => [[1, 0], [0, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); const c = h.cell(x, z); return !h.land(n) || n.h <= c.h - 2 || (c.h >= 3 && n.h < c.h); });
  const wall = (x, z) => [[-1, 0], [0, -1]].some(([a, b]) => { const n = h.cell(x + a, z + b); const c = h.cell(x, z); return h.land(n) && (n.h >= c.h + 2 || (c.h >= 2 && n.h > c.h)); });
  const n = h.removeDecor((d) => types.includes(d.t) && (drop(d.x, d.z) || (h.role(d.t) === "mass" && (wall(d.x, d.z) || !h.route(level.spawn, [d.x, d.z])))));
  if (n) h.log.push(`ledges: ${n} tall props off cliff lips`);
}

const lensName = (brief) => brief.concept?.lens || (typeof brief.lens === "string" ? brief.lens : "") || "medium";
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function lensPasses(h, brief, skip) {
  const motifs = brief.motifs || [];
  const typeOf = (m) => (m.type && m.type !== "new" && h.role(m.type) ? m.type : m.name);
  const out = [];
  for (const nm of brief.approach?.passes || []) {
    let m = motifs.find((e) => e.name === nm);
    if (!m) { const words = nm.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5); m = motifs.find((e) => words.some((w) => e.name.includes(w))); }
    const t = m && typeOf(m);
    if (t && !skip.includes(t) && !out.includes(t) && h.role(t)) out.push(t);
  }
  return out;
}

function onRim(h, x, z) { return N4.some(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; }); }

function eachLand(h, fn) { for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c)) fn(x, z, c); } }

function safeGate(level, h, gateT, fracs) {
  const posts = () => level.decor.filter((d) => d.t === gateT);
  for (const strict of [true, false]) for (const frac of fracs) {
    const saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const before = JSON.stringify(level.cells.map((r) => r.map((c) => c.h)));
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac, figGap: 2 });
    const ps = posts();
    const ok = g && ps.length === 2 && new Set(ps.map((d) => h.cell(d.x, d.z).h)).size === 1 && h.reach().missing.length <= miss;
    if (ok && (!strict || JSON.stringify(level.cells.map((r) => r.map((c) => c.h))) === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
  }
  return null;
}

const LENS_LOOK = {
  medium: {
    light: { dir: [-0.75, 1, 0.25], ambient: 0.66, sun: 0.44 }, bg: "#2b2628",
    paint: {
      sand: { top: "#efe6d2", lip: "#d6c9ac", edge: "#bfae8c", dots: "#f8f2e4" },
      dirt: { top: "#a59c90", patch: "#8d847a", mottle: "#766e65", border: "#5f5850" },
      stone: { top: "#bdb8b0", pebble: "#d4d0c8", pebbleShade: "#a09a91", rim: "#7f7a73" },
    },
  },
  subject: {
    light: { dir: [0.25, 1, 0.7], ambient: 0.8, sun: 0.22 }, bg: "#1c2a36",
    paint: {
      grass: { top: "#8fb88a", fringe: "#6f9c6c", fringeDark: "#557c55", speck: "#b4d6ac" },
      sand: { top: "#e8dcc0", lip: "#cbbb98", edge: "#b3a17c", dots: "#f4ecd8" },
      water: { top: "#7fd0d8", bubble: "#c2eff3", deep: "#3f9aa6", fall: ["#5fbcc6", "#4aa9b4", "#3a929c"], foam: "#e6fafb" },
    },
  },
  composition: {
    light: { dir: [0.9, 0.75, -0.15], ambient: 0.6, sun: 0.48 }, bg: "#2e3a4e",
  },
};

function look(level, lens) {
  const L = LENS_LOOK[lens];
  if (!L) return;
  level.light = { ...L.light };
  level.bg = L.bg;
  if (level.palette) { level.palette.bg = L.bg; for (const [k, v] of Object.entries(L.paint || {})) level.palette[k] = { ...(level.palette[k] || {}), ...v }; }
}

function smudge(level, h) {
  const [ax, az] = h.figure.anchor;
  let n = 0;
  eachLand(h, (x, z, c) => {
    if (c.s === "ramp" || h.isFig(x, z)) return;
    const d = Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5));
    const seam = onRim(h, x, z) && (x * 5 + z * 3) % 3 === 0;
    if ((d <= 2.1 && (x + z) % 3 !== 0) || seam) { if (c.s !== "dirt") { h.set(x, z, { h: c.h, s: "dirt" }); n++; } }
    else if (c.s === "grass" || (c.s === "dirt" && (x * 7 + z * 5) % 4 !== 0)) h.set(x, z, { h: c.h, s: c.h >= 2 && (x + z) % 5 === 0 ? "stone" : "sand" });
  });
  h.log.push(`smudge ${n}`);
}

function denUp(level, h) {
  const [ax, az] = h.figure.anchor;
  const inGrid = (x, z) => x >= 1 && z >= 1 && x < h.W - 1 && z < h.D - 1;
  for (let z = az - 3; z <= az + 4; z++) for (let x = ax - 3; x <= ax + 4; x++) {
    if (!inGrid(x, z)) continue;
    const d = Math.max(x < ax ? ax - x : x > ax + 1 ? x - ax - 1 : 0, z < az ? az - z : z > az + 1 ? z - az - 1 : 0);
    const corner = Math.abs(x - ax - 0.5) + Math.abs(z - az - 0.5) > 4.2;
    const c = h.cell(x, z);
    if (d <= 1) { h.set(x, z, { h: 3, s: h.isFig(x, z) ? "stone" : (x + z) % 3 ? "grass" : "dirt" }); if (!h.isFig(x, z)) h.clear(x, z); }
    else if (d === 2 && !corner) { h.set(x, z, { h: 2, s: (x * 3 + z) % 4 ? "grass" : "stone" }); h.clear(x, z); }
    else if (d === 3 && !corner && !h.land(c) && (x + z) % 2) h.set(x, z, { h: 1, s: "grass" });
  }
  h.repair();
  h.log.push(`denUp: den bluff h3 around ${ax},${az}`);
}

function tidePool(level, h) {
  const [ax, az] = h.figure.anchor;
  const cand = [];
  eachLand(h, (x, z) => {
    let ok = true;
    for (let b = -1; b <= 2 && ok; b++) for (let a = -1; a <= 3 && ok; a++) if (!(Math.abs(b - 0.5) > 1 && (a === -1 || a === 3))) { const q = h.cell(x + a, z + b); if (!h.land(q) || q.h !== 1 || q.s === "ramp" || h.isFig(x + a, z + b)) ok = false; }
    if (!ok || (level.spawn[0] >= x - 1 && level.spawn[0] <= x + 3 && level.spawn[1] >= z - 1 && level.spawn[1] <= z + 2)) return;
    cand.push([Math.hypot(x - ax, z - az) + (x + z) * 0.1, x, z]);
  });
  cand.sort((p, q) => q[0] - p[0]);
  const m0 = h.reach().missing.length;
  h.log.push(`tidePool: ${cand.length} spots, ${m0} missing before`);
  for (const [, x, z] of cand) {
    const snap = level.cells.map((r) => r.map((c) => ({ ...c }))), dec = level.decor.slice();
    const cells = [[x, z], [x + 1, z], [x + 2, z], [x + 1, z + 1], [x, z + 1]];
    for (const [a, b] of cells) { h.clear(a, b); h.set(a, b, { h: 0, s: "water" }); }
    for (const [a, b] of cells) for (const [dx, dz] of N4) { const q = h.cell(a + dx, b + dz); if (h.land(q) && q.s !== "ramp") h.set(a + dx, b + dz, { h: q.h, s: "sand" }); }
    if (h.reach().missing.length <= m0) { h.log.push(`tidePool at ${x},${z}`); return true; }
    level.cells.splice(0, level.cells.length, ...snap); level.decor.splice(0, level.decor.length, ...dec);
  }
  h.log.push("tidePool: no spot");
  return false;
}

function shore(level, h) {
  eachLand(h, (x, z, c) => {
    if (c.s === "ramp" || c.h !== 1 || h.isFig(x, z)) return;
    if (onRim(h, x, z) && (x * 3 + z) % 4 !== 0) h.set(x, z, { h: 1, s: "sand" });
  });
}

function ridge(level, h, spireT) {
  if (!spireT) return 0;
  h.removeDecor((d) => d.t === spireT);
  const r = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  const [ax, az] = h.figure.anchor;
  const cand = [];
  eachLand(h, (x, z, c) => {
    if (c.s === "ramp" || h.isFig(x, z) || r.has(h.key(x, z)) || c.h < 2) return;
    const back = [h.cell(x - 1, z), h.cell(x, z - 1)].some((q) => !h.land(q) || q.h < c.h);
    const d = Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5));
    if (!back || d < 1.5 || d > 4) return;
    if ([h.cell(x + 1, z), h.cell(x, z + 1)].some((q) => h.land(q) && q.h > c.h)) return;
    cand.push([c.h * 2 - d * 0.5 - (x + z) * 0.2, x, z]);
  });
  cand.sort((a, b) => b[0] - a[0]);
  let n = 0;
  for (const [, x, z] of cand) {
    if (n >= 3) break;
    if (level.decor.some((d) => d.t === spireT && Math.abs(d.x - x) + Math.abs(d.z - z) < 3)) continue;
    const m0 = h.reach().missing.length;
    if (!h.put(spireT, x, z, { v: n % 2 })) continue;
    if (h.reach().missing.length > m0) { h.removeDecor((d) => d.t === spireT && d.x === x && d.z === z); continue; }
    n++;
  }
  h.log.push(`ridge spires ${n}`);
  return n;
}

function badRamps(level, h) {
  let n = 0;
  eachLand(h, (x, z, c) => {
    if (c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], dn = h.cell(x + dx, z + dz), up = h.cell(x - dx, z - dz);
    if (h.land(dn) && dn.h === c.h - 1 && dn.s !== "ramp" && h.land(up) && up.h === c.h && up.s !== "ramp") return;
    h.set(x, z, { h: c.h, s: ["sand", "grass", "dirt"].includes(c.m) ? c.m : c.h >= 2 ? h.surf.raised : h.surf.ground });
    n++;
  });
  if (n) h.log.push(`badRamps flattened ${n}`);
}

function unCobble(level, h, keep, every) {
  let n = 0;
  eachLand(h, (x, z, c) => {
    if (c.s !== "stone" || keep.has(h.key(x, z)) || h.isFig(x, z) || (x * 5 + z * 3) % every === 0) return;
    h.set(x, z, { h: c.h, s: c.h >= 3 ? "dirt" : (x + z) % 2 ? "sand" : "dirt" });
    n++;
  });
  h.log.push(`unCobble ${n}`);
}

function propTidy(level, h, types) {
  const n = h.removeDecor((d) => types.includes(d.t) && (onRim(h, d.x, d.z) || N4.some(([a, b]) => h.cell(d.x + a, d.z + b)?.s === "ramp")));
  if (n) h.log.push(`propTidy ${n}`);
}

function pitFill(level, h) {
  let n = 0;
  const rampNear = (x, z) => N4.some(([a, b]) => { const q = h.cell(x + a, z + b); if (q?.s !== "ramp") return false; const [dx, dz] = h.DIRS[q.d]; return dx === -a && dz === -b || dx === a && dz === b; });
  eachLand(h, (x, z, c) => {
    if (c.s === "ramp" || h.isFig(x, z) || rampNear(x, z) || c.h >= 3) return;
    const f1 = h.cell(x, z + 1), f2 = h.cell(x + 1, z);
    if (!h.land(f1) || !h.land(f2) || f1.h <= c.h || f2.h <= c.h) return;
    if (h.decorAt(x, z).length) h.clear(x, z);
    const before = h.walkN(), saved = { ...c };
    h.set(x, z, { h: c.h + 1, s: c.s });
    if (h.walkN() >= before) { n++; return; }
    h.set(x, z, { h: 0, s: "none" });
    if (h.reach().missing.length || h.walkN() < before - 1) h.set(x, z, saved); else n++;
  });
  if (n) h.log.push(`pitFill ${n}`);
}

function frontClear(level, h, keep) {
  const [ax, az] = h.figure.anchor;
  h.removeDecor((d) => !keep.includes(d.t) && d.x >= ax - 1 && d.x <= ax + 3 && d.z >= az - 1 && d.z <= az + 3 && !h.isFig(d.x, d.z) && (d.x >= ax + 2 || d.z >= az + 2) && (h.footprint(d).length > 1 || (level.palette?.props?.[d.t]?.height || 1) > 0.5));
}

function finishLens(level, brief, h) {
  const lens = lensName(brief);
  look(level, lens);
  h.dryRim();
  const props = level.palette?.props || {};
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = brief.threshold?.prop && props[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || "lantern";
  const spireT = lens === "composition" ? Object.keys(props).find((t) => /spire|dorsal/i.test(t)) : null;
  const passT = lensPasses(h, brief, [gateT, lightT, spireT, ...daisTypes]);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "lantern" || d.t === "torch" || passT.includes(d.t));
  if (lens === "subject") { denUp(level, h); h.grow(98); tidePool(level, h); if (h.walkN() < 92) h.grow(92); shore(level, h); }
  const span = { medium: { min: 9, max: 15 }, subject: { min: 11, max: 18 }, composition: { min: 13, max: 22 } }[lens] || { min: 9, max: 16 };
  let r = h.spawnAt(span);
  if (r.length) h.path(r);
  r = h.approach();
  h.repair();
  const g = gateT ? safeGate(level, h, gateT, lens === "composition" ? [0.45, 0.35, 0.55, 0.65] : [0.6, 0.5, 0.7, 0.4]) : null;
  r = h.approach();
  frontClear(level, h, [gateT]);
  if (spireT) ridge(level, h, spireT);
  h.along(passT, { route: r });
  propTidy(level, h, ["log", ...passT.filter((t) => props[t]?.passable)]);
  if (lens === "composition") unCobble(level, h, new Set(r.map(([x, z]) => h.key(x, z))), 7);
  h.lights(lightT, { route: r, every: 4, skip: 2, max: lens === "medium" ? 2 : 4, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  h.ledges({ keep: [gateT, spireT].filter(Boolean) });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.thin(84, { keep: [gateT, lightT] });
  if (h.walkN() < 84) h.grow(84);
  if (lens === "medium") smudge(level, h);
  if (level.decor.filter((d) => d.t === gateT).length === 1) h.removeDecor((d) => d.t === gateT);
  pitFill(level, h);
  badRamps(level, h);
  h.rampTone();
  h.log.push(`lens ${lens}: walk ${h.walkN()}, posts ${level.decor.filter((d) => d.t === gateT).map((d) => d.x + "," + d.z).join(" ")}`);
  if (level.name === "sharkbear-medium") placeLandmark(level, h, "sharkbear-shard-watchtower");
  if (level.name === "sharkbear-medium") pocketRamp(level, h, 13, 9, "e");
}

function pocketRamp(level, h, x, z, d) {
  const [dx, dz] = h.DIRS[d], c = h.cell(x, z), lo = h.cell(x + dx, z + dz), hi = h.cell(x - dx, z - dz);
  if (!h.land(c) || c.s === "ramp" || h.decorAt(x, z).length || !h.land(lo) || lo.s === "ramp" || lo.h !== c.h - 1 || !h.land(hi) || hi.h !== c.h) return;
  const S = h.snapshot(), m0 = h.reach().missing.length, before = h.approach().length;
  level.cells[z][x] = { h: c.h, s: "ramp", d, m: c.s === "stone" ? "stone" : "sand" };
  if (h.reach().missing.length > m0 || h.approach().length > before) { h.restore(S); h.log.push(`pocketRamp ${x},${z}: rejected`); return; }
  h.log.push(`pocketRamp ${x},${z} down ${d}`);
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  seal(h);
  const types = Object.keys(level.palette?.props || {});
  const daisTypes = types.filter((t) => roleOf(level.palette, t) === "dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = types.find((t) => roleOf(level.palette, t) === "threshold");
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 90);
  let raised = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.h >= 2 && !h.isFig(x, z)) raised++; }
  if (raised < 6) h.dais({ ring: 1, h: 2, s: "stone" });
  farSpawn(h, level);
  let r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  const cut = h.removeDecor((d) => /tree|pine|cypress/i.test(d.t) && near(d));
  if (cut) h.log.push(`clearing: ${cut} trees off the approach`);
  thin(h, level, 9);
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
  unstone(h, keep);
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const bad = () => posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length > 0;
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  h.repair();
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.55, 0.45, 0.65, 0.35, 0.75]) if (!g) g = tryGate(frac, strict);
  const lit = h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  if (lit < 2 && CATALOG_HAS(level, lightT)) lamps(h, lightT, h.approach(), 3 - lit, g ? [g] : []);
  ledges(h, [...h.ofRole("mass"), "rock-big"], level);
  h.repair({ keep: [gateT] });
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  h.log.push(`posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}
