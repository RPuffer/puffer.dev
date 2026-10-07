import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-b.js";
import { placeGeneric, UNPADDED } from "./multitile-place.js";
import { placeRunThings } from "./ember.js";

const INK = {
  coat: ["#5b4a45", "#463833", "#322724"],
  coatHi: ["#74605a", "#5d4b45", "#45352f"],
  white: ["#ffffff", "#eeebe4", "#d4cec4"],
  shade: ["#dcd8d0", "#c4bfb5", "#a8a298"],
  beak: ["#ffd42e", "#f2b71a", "#d49510"],
  ink: ["#1d1716", "#161110", "#0e0a0a"],
  iris: ["#e8f4f6", "#c9dde2", "#a4bcc2"],
  log: ["#b5773f", "#96602f", "#744622"],
  logHi: ["#d39a5a", "#b57f45", "#8f6032"],
  hay: ["#ffd76a", "#f0bd45", "#cf9a2c"],
  stone: ["#e6e1d6", "#cbc4b6", "#a9a193"],
  stoneLo: ["#b9b1a3", "#9d9585", "#7d7567"],
  rock: ["#8b7c73", "#6f625a", "#554a43"],
  rockHi: ["#a8988c", "#8b7c71", "#6c5f56"],
  gold: ["#ffc93a", "#f0aa1e", "#cf8a12"],
  flame: ["#ffd23a", "#f0a020", "#d07a10"],
  bone: ["#fff4dc", "#eadcc0", "#cbb996"],
  pine: ["#5fcf8a", "#46b271", "#328f58"],
  trunk: ["#8a5a3a", "#6e452b", "#53331f"],
};
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

function hook(B, x, y, z, s = 1) {
  B.box(0.2 * s, 0.16 * s, 0.14 * s, pal(INK.beak), x, y, z);
  B.box(0.16 * s, 0.14 * s, 0.14 * s, pal(INK.beak), x, y + 0.02 * s, z + 0.14 * s);
  B.box(0.12 * s, 0.1 * s, 0.1 * s, pal(INK.beak), x, y - 0.04 * s, z + 0.25 * s);
  B.box(0.08 * s, 0.1 * s, 0.07 * s, pal(INK.beak), x, y - 0.12 * s, z + 0.27 * s);
  B.box(0.16 * s, 0.04 * s, 0.2 * s, pal(INK.ink), x, y + 0.02 * s, z + 0.06 * s);
}

function head(B, crouch, K = INK) {
  B.rbox(0.56, 0.46, 0.6, 0.08, pal(K.white), 0, 0, -0.02);
  B.box(0.5, 0.12, 0.38, pal(K.white), 0, 0.4, -0.08);
  B.box(0.4, 0.08, 0.26, pal(K.white), 0, 0.42, -0.24);
  B.box(0.6, 0.08, 0.22, pal(K.white), 0, 0.34, 0.14);
  hook(B, 0, 0.1, 0.32, 1.7);
  for (const s of [-1, 1]) {
    B.box(0.04, 0.13, 0.13, pal(K.iris), s * 0.29, 0.2, 0.12);
    B.box(0.04, 0.08, 0.08, pal(K.ink), s * 0.3, 0.22, 0.15);
    B.box(0.04, 0.05, 0.24, pal(K.ink), s * 0.29, 0.32, 0.1);
    if (crouch) B.box(0.1, 0.06, 0.24, pal(K.white), s * 0.22, 0.4, -0.18);
  }
}

function eagle(B, pose, K = INK) {
  const crouch = pose === "crouch";
  const statue = pose === "statue";
  for (const s of [-1, 1]) {
    B.box(0.14, 0.24, 0.16, pal(K.beak), s * 0.18, 0, 0.14);
    for (const dx of [-0.05, 0.05]) B.box(0.05, 0.05, 0.12, pal(K.beak), s * 0.18 + dx, 0, 0.28);
    B.box(0.04, 0.04, 0.06, pal(K.ink), s * 0.18 - 0.05, 0, 0.36);
    B.box(0.04, 0.04, 0.06, pal(K.ink), s * 0.18 + 0.05, 0, 0.36);
    B.rbox(0.2, 0.2, 0.24, 0.05, pal(K.coatHi), s * 0.18, 0.2, 0.08);
  }
  const y0 = 0.34;
  wedge(B, 0.56, 0.4, 0.4, K.white, 0, y0 - 0.26, -0.62);
  B.box(0.46, 0.14, 0.46, pal(K.white), 0, y0 - 0.18, -0.6);
  B.rbox(0.7, 0.5, 0.7, 0.12, pal(K.coat), 0, y0, -0.04);
  B.rbox(0.8, 0.44, 0.8, 0.12, pal(K.coat), 0, y0 + 0.44, -0.04);
  wedge(B, 0.62, 0.5, 0.2, K.coatHi, 0, y0 + 0.08, 0.36);
  B.rbox(0.7, 0.26, 0.7, 0.1, pal(K.coatHi), 0, y0 + 0.84, -0.04);
  const spread = crouch ? 0.16 : 0;
  for (const s of [-1, 1]) {
    B.at(s * (0.4 + spread), y0 + 0.1, -0.12, s * (crouch ? 0.28 : 0.1), () => {
      B.rbox(0.18, 0.9, 0.82, 0.06, pal(K.coat), 0, -0.02, -0.02);
      B.box(0.22, 0.22, 0.6, pal(K.coatHi), 0, 0.68, 0.04);
      B.box(0.16, 0.44, 0.4, pal(K.coat), 0, -0.24, -0.46);
      B.box(0.2, 0.1, 0.5, pal(K.ink), 0, 0.22, -0.2);
      B.box(0.2, 0.1, 0.4, pal(K.ink), 0, -0.02, -0.34);
    });
    if (crouch) {
      B.box(0.36, 0.14, 0.4, pal(K.coat), s * 0.54, y0 + 0.92, -0.1);
      B.box(0.2, 0.12, 0.24, pal(K.coatHi), s * 0.74, y0 + 1.02, -0.18);
    }
  }
  const ny = y0 + 1.02;
  B.rbox(0.62, 0.22, 0.56, 0.08, pal(K.white), 0, ny, 0.02);
  B.box(0.48, 0.1, 0.12, pal(K.white), 0, ny - 0.08, 0.28);
  B.box(0.3, 0.1, 0.1, pal(K.white), 0, ny - 0.16, 0.3);
  const hy = ny + (crouch ? 0.12 : statue ? 0.26 : 0.2);
  B.rbox(0.46, 0.24, 0.44, 0.08, pal(K.white), 0, ny + 0.14, 0.04);
  B.at(0, hy, crouch ? 0.2 : 0.08, statue ? 0.2 : 0.38, () => {
    if (crouch) B.rot([1, 0, 0], 0.18, 0, 0, 0);
    head(B, crouch, K);
    if (crouch) B.pop();
  });
  return hy + 0.46;
}

function nest(B, hi) {
  B.prism(circle(0, 0, 0.94, 0.9, 8, Math.PI / 8), 0, 0.14, pal(INK.stoneLo));
  const ring = 10;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2, r = 0.66;
    B.at(Math.cos(a) * r, 0.14 + (i % 2) * 0.1, Math.sin(a) * r, -a + Math.PI / 2, () => B.box(0.52, 0.14, 0.16, pal(i % 2 ? INK.log : INK.logHi), 0, 0, 0));
  }
  B.prism(circle(0, 0, 0.6, 0.56, 8, Math.PI / 8), 0.14, 0.34, pal(hi || INK.hay));
  B.box(0.18, 0.12, 0.14, pal(INK.bone), 0.42, 0.34, 0.42);
  B.box(0.14, 0.12, 0.14, pal(INK.gold), 0.5, 0.34, 0.24);
  return 0.3;
}

function altar(B, lo, hi) {
  B.box(1.72, 0.18, 1.72, pal(lo), 0, 0, 0);
  B.box(1.4, 0.18, 1.4, pal(hi), 0, 0.18, 0);
  B.box(1.1, 0.14, 1.1, pal(lo), 0, 0.36, 0);
  B.box(1.14, 0.04, 0.08, pal(INK.gold), 0, 0.44, 0.52);
  B.box(0.08, 0.04, 1.14, pal(INK.gold), 0.52, 0.44, 0);
  return 0.5;
}

function crag(B, lo, hi) {
  B.rbox(1.5, 0.3, 1.4, 0.12, pal(lo), 0, 0, -0.04);
  B.rbox(1.12, 0.24, 1.08, 0.1, pal(hi), -0.04, 0.3, 0);
  B.box(0.18, 0.06, 0.1, pal(INK.bone), 0.6, 0.3, 0.46);
  B.box(0.1, 0.06, 0.2, pal(INK.bone), 0.66, 0.3, 0.34);
  return 0.54;
}

function lead(B, H, look, pose) {
  const s = H / 2.6;
  B.push(0, 0, 0, 0, s);
  const top = pose === "nest" ? nest(B, look.hay) : pose === "statue" ? altar(B, look.lo, look.hi) : crag(B, look.lo, look.hi);
  B.at(0, top, 0.06, -0.3, () => eagle(B, pose));
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|pylon/i], ["dais", /dais|altar|plinth|pedestal|nest|throne/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|cache|bones|basin/i], ["mass", /tree|pine|cypress|spire|pillar|needle|monolith|rock|boulder|cliff|totem|crag/i]];
const GATE_RE = /gate|torii|arch|pylon/i;
const roleOf = (P, t) => { const r = P.props?.[t]?.role; if (r && r !== "lead" && GATE_RE.test(t)) return "threshold"; return r || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0]; };
const poseOf = (t) => /shrine|sentinel|aquila|statue|vigil/i.test(t) && !/gale|raptor/i.test(t) ? "statue" : /gale|raptor|boss|storm|crouch/i.test(t) ? "crouch" : "nest";

function wingCrest(B, y, c, side, w = 0.5) {
  for (const s of side ? [side] : [-1, 1]) {
    B.box(w * 0.5, 0.12, 0.24, pal(c), s * w * 0.3, y, 0);
    B.box(w * 0.4, 0.1, 0.2, pal(c), s * w * 0.62, y + 0.1, 0);
    B.box(w * 0.26, 0.1, 0.16, pal(c), s * w * 0.9, y + 0.2, 0);
  }
}

function tree(B, H, v, trunk, a, b, cone) {
  B.box(0.3, H * 0.36, 0.3, pal(trunk));
  const tiers = cone ? [[0.86, 0.34], [0.7, 0.32], [0.54, 0.3], [0.36, 0.28]] : v % 2 ? [[0.92, 0.4], [0.72, 0.36], [0.46, 0.32]] : [[0.84, 0.38], [0.64, 0.34], [0.42, 0.3]];
  let y = H * 0.3;
  const step = (H - y) / tiers.reduce((s, [, h]) => s + h, 0);
  tiers.forEach(([w, hh], i) => { const t = hh * step; B.box(w, t, w, pal(i % 2 ? b : a), (i % 2 ? 0.03 : -0.02), y, (i % 2 ? -0.03 : 0.02)); y += t; });
}

const CH = {
  paper: ["#f4f0e6", "#e4ded1", "#cbc4b5"],
  chalk: ["#dcd8cd", "#c3beb2", "#a39e92"],
  grey: ["#a29e93", "#85817a", "#66635c"],
  char: ["#57564d", "#42413a", "#2e2d28"],
  black: ["#2c2c29", "#1f1f1c", "#131311"],
  mint: ["#c6eadc", "#a2d4c1", "#7fb4a0"],
  drift: ["#cfcac0", "#b3aea3", "#8e897f"],
  slate: ["#6c6a62", "#56544d", "#403e39"],
  scrub: ["#9aa887", "#7f8c6e", "#626d55"],
};

function crownLaths(B, y, z, cols, n = 7, len = 0.95) {
  for (let i = 0; i < n; i++) {
    const x = -0.46 + (i / (n - 1)) * 0.92, c = cols[i % cols.length];
    B.rot([1, 0, 0], -0.5 - (i % 3) * 0.12, x, y + (i % 2) * 0.06, z);
    B.box(0.13, 0.09, len * (0.8 + (i % 3) * 0.12), pal(c), 0, 0, -len * 0.4);
    B.pop();
  }
}

function bigBeak(B, y, z) {
  B.box(0.54, 0.4, 0.34, pal(INK.beak), 0, y, z);
  B.box(0.3, 0.12, 0.2, pal(CH.grey), 0, y + 0.36, z - 0.06);
  B.box(0.46, 0.36, 0.42, pal(INK.beak), 0, y + 0.02, z + 0.36);
  B.box(0.38, 0.32, 0.3, pal(INK.beak), 0, y - 0.02, z + 0.7);
  B.box(0.3, 0.3, 0.2, pal(INK.beak), 0, y - 0.22, z + 0.9);
  B.box(0.2, 0.24, 0.14, pal(INK.beak), 0, y - 0.42, z + 0.94);
  B.box(0.48, 0.05, 0.86, pal(CH.black), 0, y + 0.06, z + 0.34);
  for (const s of [-1, 1]) B.box(0.04, 0.08, 0.14, pal(CH.black), s * 0.2, y + 0.22, z + 0.2);
}

function bust(B, kind) {
  const shard = kind === "shard";
  let y = 0;
  if (shard) {
    B.box(1.9, 0.3, 1.9, pal(CH.slate), 0, 0, 0);
    B.box(1.64, 0.3, 1.6, pal(CH.char), 0.08, 0.3, -0.08);
    B.box(1.44, 0.26, 1.36, pal(CH.slate), -0.04, 0.6, -0.12);
    wedge(B, 1.64, 0.3, 0.3, CH.chalk, 0.08, 0.3, 0.86);
    wedge(B, 1.44, 0.26, 0.26, CH.grey, -0.04, 0.6, 0.68);
    y = 0.86;
  } else {
    B.box(1.84, 0.18, 1.84, pal(CH.black), 0, 0, 0);
    B.box(1.56, 0.14, 1.56, pal(CH.chalk), 0, 0.18, 0);
    y = 0.32;
  }
  B.box(1.34, 0.5, 1.2, pal(CH.black), 0, y, -0.12);
  for (let i = 0; i < 5; i++) {
    const x = -0.56 + i * 0.28, hgt = 0.36 + (i % 2) * 0.18;
    wedge(B, 0.26, hgt, 0.34, i % 2 ? CH.char : CH.black, x, y, 0.62);
  }
  B.box(1.2, 0.42, 1.1, pal(CH.char), 0, y + 0.5, -0.16);
  B.box(1.1, 0.3, 0.3, pal(CH.black), 0, y + 0.5, 0.44);
  B.rbox(1.08, 0.5, 1.12, 0.12, pal(CH.chalk), 0, y + 0.86, -0.12);
  B.rbox(1.02, 0.64, 1.18, 0.14, pal(CH.paper), 0, y + 1.3, 0.02);
  B.box(0.9, 0.2, 0.8, pal(CH.paper), 0, y + 1.9, -0.14);
  if (shard) {
    for (let i = 0; i < 4; i++) { B.rot([1, 0, 0], -0.55 - i * 0.08, 0, y + 1.9 - i * 0.16, -0.3 - i * 0.18); B.box(0.96 - i * 0.12, 0.1, 0.7, pal(i % 2 ? CH.slate : CH.chalk), 0, 0, -0.3); B.pop(); }
  } else crownLaths(B, y + 2.0, -0.2, [CH.paper, CH.grey, CH.chalk, CH.char]);
  wedge(B, 1.1, 0.2, 0.5, CH.char, 0, y + 1.76, 0.36);
  B.box(1.06, 0.1, 0.24, pal(CH.black), 0, y + 1.7, 0.52);
  for (let i = 0; i < 5; i++) { const x = -0.44 + i * 0.22; B.rot([1, 0, 0], Math.PI, x, y + 1.02 - (i % 2) * 0.1, -0.62); wedge(B, 0.2, 0.34 + (i % 2) * 0.14, 0.14, i % 2 ? CH.chalk : CH.paper, 0, 0, 0); B.pop(); }
  for (const s of [-1, 1]) {
    B.box(0.05, 0.36, 0.44, pal(CH.black), s * 0.53, y + 1.42, 0.3);
    B.box(0.06, 0.26, 0.26, pal(CH.mint), s * 0.54, y + 1.48, 0.32);
    B.box(0.07, 0.14, 0.14, pal(CH.black), s * 0.55, y + 1.52, 0.34);
    B.box(0.075, 0.05, 0.05, pal(CH.paper), s * 0.555, y + 1.6, 0.39);
    B.box(0.05, 0.1, 0.5, pal(CH.grey), s * 0.53, y + 1.0, -0.1);
  }
  bigBeak(B, y + 1.28, 0.66);
  return y + 2.2;
}

function driftNest(B, lo, hi) {
  B.prism(circle(0, 0, 0.98, 0.94, 8, Math.PI / 8), 0, 0.2, pal(CH.slate));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 0.72;
    B.at(Math.cos(a) * r, 0.2 + (i % 3) * 0.1, Math.sin(a) * r, -a + Math.PI / 2 + (i % 2) * 0.3, () => B.box(0.62, 0.14, 0.16, pal(i % 2 ? lo : hi), 0, 0, 0));
  }
  B.prism(circle(0, 0, 0.62, 0.58, 8, Math.PI / 8), 0.2, 0.42, pal(CH.char));
  B.box(0.3, 0.06, 0.08, pal(INK.bone), 0.5, 0.46, 0.42);
  B.box(0.08, 0.06, 0.24, pal(INK.bone), 0.6, 0.46, 0.3);
  return 0.4;
}

const PERCH_K = { ...INK, coat: CH.black, coatHi: CH.char, white: CH.paper, iris: CH.mint };

function lensLead(B, H, kind) {
  if (kind === "perch") {
    B.push(0, 0, 0, 0, (H / 2.6) * 1.6);
    const top = driftNest(B, CH.drift, CH.chalk);
    B.at(0, top, 0.06, -0.3, () => eagle(B, "statue", PERCH_K));
    B.pop();
    return;
  }
  B.push(0, 0, 0, 0, (H / 2.6) * (kind === "shard" ? 1.06 : 1.35));
  B.at(0, 0, 0, -0.3, () => bust(B, kind));
  B.pop();
}

const lensPose = (p = "") => /stance|perch|mantle|wings/i.test(p) ? "perch" : /bust|rigid/i.test(p) ? "shard" : "stroke";

const EAGLE_LENS = [
  ["quill", /quill/i],
  ["stumpGate", /stump/i],
  ["beakPost", /beak.*cantilever|beak_spire/i],
  ["prow", /cantilever|prow_perch|perch/i],
  ["laths", /bristle.*(ridge|flick)|flick/i],
  ["shingles", /shingle|strata|prow/i],
  ["nestRing", /nest|driftwood/i],
  ["snag", /snag/i],
  ["fishbone", /bone/i],
  ["scrub", /scrub|lichen/i],
  ["cairn", /cairn|pebble/i],
  ["chalk", /scumble|boulder/i],
  ["inkPine", /pine|spire/i],
  ["inkPost", /calligraph|post/i],
];
const eagleKind = (t) => (EAGLE_LENS.find(([, re]) => re.test(t)) || [null])[0];

function gateBeam(B, d, y, c, reach = 1.0) {
  if (!d.side) return;
  if (d.axis === "x") B.box(0.22, 0.16, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05));
  else B.box(reach + 0.3, 0.16, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
}

const EAGLE_BUILD = {
  beakPost(B, H, v, d) {
    B.box(0.5, 0.22, 0.5, pal(CH.black));
    B.box(0.36, H * 0.55, 0.36, pal(CH.char), 0, 0.22, 0);
    B.box(0.3, H * 0.3, 0.3, pal(CH.grey), 0, 0.22 + H * 0.55, 0);
    const top = 0.22 + H * 0.85;
    gateBeam(B, d, top - 0.2, CH.black);
    B.at(0, top, 0, d.side ? (d.axis === "x" ? (d.side > 0 ? Math.PI : 0) : (d.side > 0 ? -Math.PI / 2 : Math.PI / 2)) : 0, () => bigBeak(B, 0.2, -0.3), 0.55);
  },
  quill(B, H, v, d) {
    B.cyl(0.34, 0.22, pal(INK.beak), 0, 0, 0, 6);
    B.cyl(0.26, H * 0.5, pal(CH.black), 0, 0.22, 0, 6);
    B.cyl(0.2, H * 0.22, pal(CH.char), 0, 0.22 + H * 0.5, 0, 6);
    B.cone(0.2, 0, H * 0.26, pal(CH.black), 0, 0.22 + H * 0.72, 0, 6);
    B.box(0.44, 0.08, 0.1, pal(CH.paper), 0, 0.22 + H * 0.35, 0);
    gateBeam(B, d, 0.22 + H * 0.46, CH.black);
    gateBeam(B, d, 0.22 + H * 0.46 + 0.18, INK.beak);
  },
  stumpGate(B, H, v, d) {
    B.cyl(0.38, 0.34, pal(CH.drift), 0, 0, 0, 7);
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; B.box(0.36, 0.12, 0.12, pal(CH.drift), Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); }
    B.cyl(0.3, 0.08, pal(CH.grey), 0, 0.34, 0, 7);
    B.box(0.18, 1.05, 0.18, pal(CH.drift), 0.06, 0.34, 0);
    B.box(0.1, 0.1, 0.34, pal(CH.drift), 0.06, 1.0, 0.18);
    gateBeam(B, d, 1.3, CH.drift, 1.1);
  },
  prow(B, H) {
    B.box(0.8, 0.24, 0.8, pal(CH.slate));
    B.box(0.66, 0.28, 0.66, pal(INK.beak), 0, 0.24, 0);
    B.box(0.5, 0.22, 0.5, pal(INK.beak), 0, 0.52, 0.12);
    B.box(0.3, 0.3, 0.22, pal(INK.beak), 0, 0.36, 0.4);
    B.box(0.66, 0.05, 0.4, pal(CH.black), 0, 0.5, 0.1);
  },
  laths(B, H, v) {
    B.box(0.8, 0.14, 0.5, pal(CH.char));
    const cols = [CH.paper, CH.grey, CH.black, CH.chalk, CH.char];
    for (let i = 0; i < 5; i++) {
      const x = -0.3 + i * 0.15, hgt = H * (0.55 + ((i * 3 + v) % 5) * 0.1);
      B.rot([0, 0, 1], -0.22, x, 0.14, 0);
      B.box(0.11, hgt, 0.2 - (i % 2) * 0.06, pal(cols[(i + v) % 5]), 0, 0, (i % 2) * 0.08 - 0.04);
      B.pop();
    }
  },
  shingles(B, H, v) {
    B.box(0.8, 0.14, 0.8, pal(CH.char));
    const n = Math.max(3, Math.round(H / 0.3));
    for (let i = 0; i < n; i++) {
      const w = 0.8 - i * (0.5 / n);
      wedge(B, w, 0.26, 0.42, i % 2 ? CH.black : CH.grey, (i % 2 ? 0.05 : -0.04), 0.14 + i * 0.24, 0.1 - i * 0.05);
      B.box(w, 0.24, 0.24, pal(i % 2 ? CH.black : CH.grey), (i % 2 ? 0.05 : -0.04), 0.14 + i * 0.24, -0.22 - i * 0.05);
    }
  },
  nestRing(B, H) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; B.at(Math.cos(a) * 0.3, (i % 2) * 0.12, Math.sin(a) * 0.3, -a + Math.PI / 2, () => B.box(0.5, 0.14, 0.14, pal(i % 2 ? CH.drift : CH.chalk), 0, 0, 0)); }
  },
  snag(B, H, v) {
    B.box(0.5, 0.16, 0.5, pal(CH.slate));
    B.box(0.28, H * 0.6, 0.28, pal(CH.drift), 0, 0.16, 0);
    B.box(0.22, H * 0.34, 0.22, pal(CH.chalk), 0.04, 0.16 + H * 0.6, 0.02);
    B.at(0, 0.16 + H * 0.5, 0, v % 2 ? 0.8 : -0.6, () => { B.box(0.6, 0.1, 0.1, pal(CH.drift), 0.3, 0, 0); B.box(0.1, 0.24, 0.1, pal(CH.drift), 0.56, 0.1, 0); });
    B.at(0, 0.16 + H * 0.74, 0, v % 2 ? -1.9 : 2.4, () => B.box(0.44, 0.08, 0.08, pal(CH.chalk), 0.22, 0, 0));
    B.box(0.1, 0.1, 0.1, pal(CH.black), 0, 0.16 + H * 0.94, 0);
  },
  fishbone(B) {
    B.rbox(0.66, 0.08, 0.5, 0.08, pal(CH.slate), 0, 0, 0);
    B.at(0, 0.08, 0, 0.5, () => {
      B.box(0.56, 0.06, 0.07, pal(INK.bone), 0, 0, 0);
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) B.box(0.04, 0.05, 0.16, pal(INK.bone), -0.2 + i * 0.1, 0, s * 0.1);
      B.box(0.14, 0.12, 0.16, pal(INK.bone), 0.32, 0, 0);
      B.box(0.12, 0.05, 0.22, pal(INK.bone), -0.32, 0, 0);
    });
  },
  scrub(B, H, v) {
    const c = [CH.scrub, [CH.scrub[1], CH.scrub[2], "#4e5843"]];
    B.rbox(0.62, H * 0.6, 0.5, 0.14, pal(c[0]), -0.05, 0, 0.02);
    B.rbox(0.42, H * 0.5, 0.38, 0.12, pal(c[1]), 0.16, 0, -0.12);
    B.rbox(0.36, H * 0.3, 0.3, 0.1, pal(c[0]), 0.02, H * 0.6, 0);
  },
  lichen(B, H, v) {
    const m = [CH.mint, ["#8fc2ae", "#74a893", "#5a8b78"]];
    B.rbox(0.56, 0.08, 0.5, 0.12, pal(CH.slate), 0, 0, 0);
    for (const [x, z, r, i] of [[-0.14, -0.08, 0.2, 0], [0.14, 0.06, 0.16, 1], [-0.02, 0.18, 0.12, 0]]) B.rbox(r * 2, H * 0.5 * (1 - i * 0.3), r * 2, 0.08, pal(m[(i + v) % 2]), x, 0.08, z);
  },
  cairn(B, H) {
    B.cyl(0.34, 0.14, pal(CH.chalk), 0, 0, 0, 7);
    B.cyl(0.26, 0.14, pal(CH.grey), 0.03, 0.14, 0, 7);
    B.cyl(0.18, 0.14, pal(CH.paper), -0.02, 0.28, 0.02, 7);
    B.box(0.12, 0.1, 0.12, pal(CH.black), 0, 0.42, 0);
  },
  chalk(B, H, v) {
    B.rbox(0.82, H * 0.4, 0.72, 0.12, pal(CH.chalk), 0, 0, 0);
    B.rbox(0.6, H * 0.34, 0.54, 0.1, pal(CH.paper), v % 2 ? 0.06 : -0.06, H * 0.4, 0.02);
    B.box(0.3, 0.05, 0.2, pal(CH.grey), 0.1, H * 0.74, -0.08);
    B.rbox(0.34, H * 0.3, 0.3, 0.08, pal(CH.grey), 0.28, 0, 0.26);
  },
  inkPine(B, H, v) {
    B.box(0.26, H * 0.3, 0.26, pal(CH.char));
    const tiers = [[0.9, 0.36], [0.7, 0.32], [0.5, 0.3], [0.3, 0.28]];
    let y = H * 0.26;
    const step = (H - y) / 1.26;
    tiers.forEach(([w, hh], i) => { const t = hh * step; B.box(w, t, w, pal(i % 2 ? CH.char : CH.black), (i % 2 ? 0.03 : -0.02), y, (i % 2 ? -0.03 : 0.02)); B.box(w * 0.4, 0.05, w + 0.02, pal(CH.grey), (i % 2 ? 0.03 : -0.02), y + t - 0.03, 0); y += t; });
  },
  inkPost(B, H) {
    B.box(0.32, 0.1, 0.32, pal(CH.char));
    B.box(0.16, H * 0.72, 0.16, pal(CH.black), 0, 0.1, 0);
    B.box(0.22, H * 0.2, 0.22, pal(INK.beak), 0, 0.1 + H * 0.72, 0);
  },
};

const EXTRA = [
  ["eagle-ink-pine", "inkPine", [1, 1], false, 2.2],
  ["eagle-chalk-rock", "chalk", [1, 1], false, 0.9],
  ["eagle-ink-post", "inkPost", [1, 1], true, 0.9],
  ["eagle-scrub", "scrub", [1, 1], false, 0.6],
  ["eagle-cairn", "cairn", [1, 1], false, 0.55],
  ["eagle-lichen", "lichen", [1, 1], true, 0.4],
  ["eagle-snag", "snag", [1, 1], false, 2.1],
  ["eagle-stump-gate", "stumpGate", [1, 1], false, 1.4],
  ["eagle-prow", "prow", [1, 1], false, 1.0],
];

const REMAP = {
  medium: { "tree-pine": "eagle-ink-pine", "rock-big": "eagle-chalk-rock", "fence-post": "eagle-ink-post" },
  subject: { bush: "eagle-scrub", "rock-big": "eagle-chalk-rock", stump: "eagle-scrub" },
  composition: { rock: "eagle-cairn", bush: "eagle-lichen", "tree-round": "eagle-snag" },
};

const LENS_LOOK = {
  medium: {
    bg: "#ece7dc", light: { dir: [-0.55, 1, 0.35], ambient: 0.9, sun: 0.24 },
    sand: { top: "#f3efe4", lip: "#d8d2c4", edge: "#2a2a26", dots: "#dcd6c8" },
    grass: { top: "#8d8a81", fringe: "#3e3d37", fringeDark: "#23231f", speck: "#b3afa4" },
    stone: { top: "#c9c4b8", pebble: "#e6e1d6", pebbleShade: "#a9a497", rim: "#6f6c64" },
    dirt: { top: "#6b6961", patch: "#58564f", mottle: "#4a4842", border: "#2e2d29", path: "#77746b" },
  },
  subject: {
    bg: "#262a2d", light: { dir: [-0.7, 1, 0.2], ambient: 0.74, sun: 0.36 },
    sand: { top: "#c9c0ad", lip: "#a89f8c", edge: "#7d7666", dots: "#ddd5c3" },
    grass: { top: "#8a9677", fringe: "#6d785d", fringeDark: "#525b46", speck: "#a6b192" },
    stone: { top: "#b7b3aa", pebble: "#d2cec5", pebbleShade: "#99958c", rim: "#7c7870" },
    dirt: { top: "#9a978e", patch: "#8a877e", mottle: "#a8a59c", border: "#6f6c64", path: "#a29f96" },
  },
  composition: {
    bg: "#a9c2b8", light: { dir: [-0.95, 0.75, 0.15], ambient: 0.68, sun: 0.5 },
    dirt: { top: "#4b4a44", patch: "#3d3c37", mottle: "#57554e", border: "#2a2926", path: "#5c5a53" },
    sand: { top: "#e9e3d4", lip: "#c9c2b1", edge: "#8e887a", dots: "#f5f0e4" },
    stone: { top: "#9d998f", pebble: "#b8b4aa", pebbleShade: "#7e7a71", rim: "#5d5a53" },
  },
};

function lensName(level, brief) {
  return brief.concept?.lens || (/eagle-(\w+)/.exec(level.name || "") || [])[1] || "";
}

function lensLook(level, L) {
  const k = LENS_LOOK[L];
  if (!k) return;
  level.bg = k.bg;
  if (level.palette) level.palette.bg = k.bg;
  level.light = { ...level.light, ...k.light };
  for (const m of ["sand", "grass", "stone", "dirt"]) if (k[m] && level.palette?.[m]) Object.assign(level.palette[m], k[m]);
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const leadT = types.find((t) => roleOf(P, t) === "lead" || roleOf(P, t) === "creature") || "";
  const pose = poseOf(leadT);
  const look = pose === "nest"
    ? { hay: pick(dt, 1, INK.hay) }
    : pose === "statue"
      ? { lo: pick(dt, 0, INK.stoneLo), hi: pick(dt, 1, INK.stone) }
      : { lo: pick(dt, 0, INK.rock), hi: pick(dt, 1, INK.rockHi) };

  const lensMode = !!props[leadT]?.pose;
  const lpose = lensMode ? lensPose(props[leadT].pose) : null;
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const isLead = role === "lead" || role === "creature";
    const ek = lensMode && !isLead ? (role === "threshold" && !/quill|stump|beak/i.test(t) ? "beakPost" : eagleKind(t)) : null;
    const fp = isLead ? [2, 2] : role === "threshold" || (ek && ek !== "beakPost" && ek !== "prow") ? [1, 1] : p.footprint || [1, 1];
    const ht = isLead ? 2.6 : role === "threshold" && lensMode ? Math.max(1.4, Math.min(2.2, p.height || 1)) : Math.min(2.6, Math.max(0.3, p.height || 1));
    catalog[t] = { footprint: lensMode && ek === "prow" ? [1, 1] : lensMode && ek === "beakPost" ? [1, 1] : fp, passable: isLead ? false : !!p.passable, variants: 2, height: ht };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, INK.log), c1 = pick(tn, 1, INK.stone), c2 = pick(tn, 2, INK.gold);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (isLead && lensMode) lensLead(B, H, lpose);
      else if (ek && EAGLE_BUILD[ek]) EAGLE_BUILD[ek](B, H, v, d);
      else if (isLead) lead(B, H, look, pose);
      else if (role === "threshold") {
        const tall = H * 0.7;
        B.box(0.48, 0.24, 0.48, pal(c1));
        B.box(0.34, tall * 0.55, 0.34, pal(c0), 0, 0.24, 0);
        B.box(0.28, tall * 0.45, 0.28, pal(c0), 0, 0.24 + tall * 0.55, 0);
        const top = 0.24 + tall;
        B.box(0.4, 0.12, 0.4, pal(c2), 0, top, 0);
        if (/crag|beak/i.test(t)) { hook(B, 0, top + 0.16, -0.12, 1.6); }
        else B.cone(0.22, 0, 0.22, pal(INK.gold), 0, top + 0.12, 0, 4);
        if (d.side) {
          const reach = 1.0;
          const beam = (y, th, c) => d.axis === "x" ? B.box(0.24, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.24, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(tall * 0.92, 0.16, c2);
          beam(tall * 0.92 + 0.2, 0.1, INK.white);
        } else wingCrest(B, tall * 0.8, INK.white, 0, 0.5);
      } else if (role === "dais") {
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), 0, H * 0.6, pal(c0));
        B.prism(circle(0, 0, 0.36, 0.36, 8, Math.PI / 8), H * 0.6, H, pal(c1));
      } else if (role === "light") {
        B.box(0.32, 0.14, 0.32, pal(c0));
        B.box(0.16, H - 0.6, 0.16, pal(c0), 0, 0.14, 0);
        B.box(0.36, 0.08, 0.36, pal(c2), 0, H - 0.46, 0);
        B.box(0.24, 0.26, 0.24, pal(P.flame || INK.flame), 0, H - 0.38, 0);
        B.cone(0.24, 0, 0.16, pal(c2), 0, H - 0.12, 0, 4);
      } else if (role === "offering" && /bone/i.test(t)) {
        B.rbox(0.56, 0.1, 0.5, 0.08, pal(INK.rock), 0, 0, 0);
        B.at(0, 0.1, 0, 0.5, () => { B.box(0.5, 0.08, 0.08, pal(INK.bone), 0, 0, 0); for (const s of [-1, 1]) B.box(0.1, 0.12, 0.14, pal(INK.bone), s * 0.26, 0, 0); });
        B.at(0.06, 0.1, 0.1, -0.7, () => B.box(0.36, 0.07, 0.07, pal(INK.bone), 0, 0, 0));
        B.rbox(0.2, 0.18, 0.2, 0.06, pal(INK.bone), -0.14, 0.1, -0.12);
        B.box(0.05, 0.05, 0.03, pal(INK.ink), -0.18, 0.18, -0.02);
        B.box(0.05, 0.05, 0.03, pal(INK.ink), -0.1, 0.18, -0.02);
      } else if (role === "offering" && /basin/i.test(t)) {
        B.prism(circle(0, 0, 0.3, 0.3, 8, Math.PI / 8), 0, H * 0.5, pal(c0));
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), H * 0.5, H * 0.8, pal(c1));
        B.prism(circle(0, 0, 0.34, 0.34, 8, Math.PI / 8), H * 0.8, H * 0.84, pal(["#7fe6f2", "#5ccad8", "#3aa7b8"]));
      } else if (role === "offering") {
        if (v % 2 || /urn/i.test(t)) {
          B.cyl(0.2, H * 0.6, pal(c0), 0, 0, 0, 8);
          B.cyl(0.24, 0.08, pal(c2), 0, H * 0.6, 0, 8);
          B.cyl(0.14, H * 0.2, pal(c0), 0, H * 0.68, 0, 8);
        } else {
          B.box(0.5, H * 0.55, 0.36, pal(c0));
          B.box(0.54, H * 0.22, 0.4, pal(c1), 0, H * 0.55, 0);
          B.box(0.08, H * 0.45, 0.42, pal(INK.gold), -0.14, 0.02, 0);
          B.box(0.08, H * 0.45, 0.42, pal(INK.gold), 0.14, 0.02, 0);
        }
      } else if (role === "mass" && /tree|pine|cypress/i.test(t)) {
        tree(B, H, v, pick(tn, 0, INK.trunk), pick(tn, 1, INK.pine), pick(tn, 2, INK.pine), /cypress|cone/i.test(t));
      } else if (role === "mass" && /boulder|rock/i.test(t)) {
        B.rbox(0.62, H * 0.6, 0.56, 0.1, pal(c0), -0.02, 0, 0);
        B.rbox(0.42, H * 0.42, 0.4, 0.08, pal(c1), 0.06, H * 0.55, -0.04);
        B.rbox(0.3, H * 0.3, 0.26, 0.06, pal(c0), 0.24, 0, 0.24);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.66, 0.5, 0.34] : [0.6, 0.46, 0.3];
        const tot = H - 0.3, hh = tot / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c0][i % 3]), (i % 2 ? 0.05 : -0.04), i * hh, (i % 2 ? -0.04 : 0.04)));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, tot, 0, 4);
      } else {
        const g = [[0, 0, 0.5, H * 0.7, c0], [0.2, 0.12, 0.34, H * 0.55, c1], [-0.18, 0.16, 0.3, H * 0.45, c2]];
        for (const [x, z, w, hgt, c] of g) B.rbox(w, hgt, w, 0.1, pal(c), x, 0, z);
      }
      return mesh(B);
    };
  }
  for (const [t, kind, fp, pass, ht] of EXTRA) {
    if (catalog[t]) continue;
    catalog[t] = { footprint: fp, passable: pass, variants: 2, height: ht };
    builders[t] = (v, rot, st, ctx) => { const B = new Baker(); EAGLE_BUILD[kind](B, ctx.height, v, ctx.decor || {}); return mesh(B); };
  }
  return { catalog, builders };
}

function fixRamps(level, h) {
  const at = (x, z) => level.cells[z]?.[x];
  for (let z = 0; z < level.cells.length; z++) for (let x = 0; x < level.cells[z].length; x++) {
    const c = at(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = at(x - dx, z - dz);
    if (up && up.h === c.h && up.s !== "ramp") continue;
    const up2 = at(x - 2 * dx, z - 2 * dz), D = at(x + dx, z + dz), D2 = at(x + 2 * dx, z + 2 * dz);
    const flat = (q, hh) => q && q.h === hh && q.s !== "ramp" && h.land(q);
    if (up && up.h === c.h + 1 && flat(up2, up.h) && flat(D, c.h - 1) && flat(D2, c.h - 1) && !h.isFig(x + dx, z + dz) && !h.isFig(x - dx, z - dz)) {
      level.cells[z - dz][x - dx] = { h: up.h, s: "ramp", d: c.d, m: c.m || "stone" };
      level.cells[z][x] = { h: c.h, s: h.surf.path };
      level.cells[z + dz][x + dx] = { h: c.h, s: "ramp", d: c.d, m: c.m || "stone" };
      h.clear(x - dx, z - dz); h.clear(x + dx, z + dz);
    } else level.cells[z][x] = { h: c.h, s: h.surf.path };
  }
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    const dn = level.cells[z + dz]?.[x + dx];
    const soft = [up?.s, dn?.s, h.surf.path, h.surf.ground].find((m) => ["sand", "grass", "dirt"].includes(m));
    c.m = soft || "sand";
  }));
}

function grow(h, want) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let pass = 0; pass < 40 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground });
  }
}

function repaint(h, keep) {
  let land = 0, stone = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.s !== "ramp") { land++; if (c.s === "stone") stone++; } }
  if (stone < land * 0.3) return;
  const wet = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "water");
  const base = (c) => (c.h >= 2 && h.surf.raised && h.surf.raised !== "stone" ? h.surf.raised : h.surf.ground && h.surf.ground !== "stone" ? h.surf.ground : c.h >= 2 ? "sand" : "grass");
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || keep.has(h.key(x, z)) || wet(x, z) || (x * 7 + z * 3) % 11 === 0) continue;
    h.set(x, z, { h: c.h, s: base(c) });
  }
  h.log.push(`repaint: ${stone}/${land} stone cells`);
}

function dropRimWater(h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c?.s !== "water") continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; })) { h.set(x, z, { h: 0, s: "none" }); n++; }
  }
  if (n) h.log.push(`rim water: ${n}`);
}

function shore(h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c?.s !== "water") continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + a, Z = z + b, q = h.cell(X, Z);
      if (q && q.s !== "none") continue;
      if (X >= 1 && Z >= 1 && X < h.W - 1 && Z < h.D - 1) { h.set(X, Z, { h: c.h, s: "stone" }); n++; }
      else { h.set(x, z, { h: 0, s: "none" }); break; }
    }
  }
  for (let pass = 0; pass < 4 && h.reach().missing.length; pass++) {
    const miss = new Set(h.reach().missing.map(([x, z]) => h.key(x, z)));
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const q = h.cell(x, z);
      if (q && q.s !== "none") continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [x + a, z + b]).filter(([a, b]) => h.land(h.cell(a, b)) && h.cell(a, b).s !== "ramp" && h.cell(a, b).h === 1);
      if (nb.some(([a, b]) => miss.has(h.key(a, b))) && nb.some(([a, b]) => !miss.has(h.key(a, b)))) h.set(x, z, { h: 1, s: "stone" });
    }
  }
  if (n) h.log.push(`shore: ${n}`);
}

function tidy(level, h, gateT) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const route = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  const nearRamp = (x, z) => N.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp");
  const paved = (d) => h.cell(d.x, d.z)?.s === "stone" && h.cell(d.x, d.z).h === 1 && /tree|pine|cypress/i.test(d.t);
  const moved = level.decor.filter((d) => d.t === "well" && nearRamp(d.x, d.z)).length;
  const n = h.removeDecor((d) => (d.t === "well" && nearRamp(d.x, d.z)) || paved(d));
  let put = 0;
  for (let z = 0; z < h.D && put < moved; z++) for (let x = 0; x < h.W && put < moved; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || route.has(h.key(x, z)) || h.isFig(x, z) || h.decorAt(x, z).length || nearRamp(x, z)) continue;
    if (!N.slice(0, 4).some(([a, b]) => h.cell(x + a, z + b)?.s === "water")) continue;
    if (level.decor.some((d) => (d.t === gateT || d.t === "well") && Math.abs(d.x - x) + Math.abs(d.z - z) <= 2)) continue;
    if (h.put("well", x, z)) { if (h.reach().missing.length) h.removeDecor((d) => d.t === "well" && d.x === x && d.z === z); else put++; }
  }
  if (n) h.log.push(`tidy: -${n} +${put} wells`);
}

function ledges(h, types, level) {
  const drop = (x, z) => [[1, 0], [0, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b), c = h.cell(x, z); return !h.land(n) || n.h <= c.h - 2 || (c.h >= 3 && n.h < c.h); });
  const wall = (x, z) => [[-1, 0], [0, -1]].some(([a, b]) => { const n = h.cell(x + a, z + b), c = h.cell(x, z); return h.land(n) && (n.h >= c.h + 2 || (c.h >= 2 && n.h > c.h)); });
  const n = h.removeDecor((d) => types.includes(d.t) && (drop(d.x, d.z) || wall(d.x, d.z)));
  if (n) h.log.push(`ledges: ${n}`);
}

function jag(level, h, floor) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const voidAt = (x, z) => { const q = h.cell(x, z); return !q || q.s === "none"; };
  const hash = (x, z) => (x * 73856093 ^ z * 19349663) >>> 0;
  const sp = level.spawn || [-9, -9];
  let cut = 0, add = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || (Math.abs(x - sp[0]) + Math.abs(z - sp[1]) <= 1)) continue;
    const nv = N.filter(([a, b]) => voidAt(x + a, z + b)).length;
    if (!nv || !(nv >= 2 || hash(x, z) % 5 === 0)) continue;
    if (h.decorAt(x, z).some((d) => ["lead", "threshold", "light", "mass"].includes(h.role(d.t)) || /tree|pine|well/.test(d.t)) || N.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp")) continue;
    const b0 = h.reach(), before = b0.reached;
    const saved = { ...c }, dec = level.decor.slice();
    h.clear(x, z);
    h.set(x, z, { h: 0, s: "none" });
    const r = h.reach();
    if (r.missing.length > b0.missing.length || r.reached < floor || r.reached < before - 1) { h.set(x, z, saved); level.decor.splice(0, level.decor.length, ...dec); } else cut++;
  }
  for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
    if (!voidAt(x, z) || hash(x, z) % 4) continue;
    const nb = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp" && n.h === 1);
    if (nb.length !== 1) continue;
    h.set(x, z, { h: 1, s: nb[0].s === "stone" ? (h.surf.ground !== "stone" ? h.surf.ground : "grass") : nb[0].s });
    if (h.reach().missing.length) h.set(x, z, { h: 0, s: "none" }); else add++;
  }
  h.log.push(`jag: -${cut} +${add}`);
}

function widenStairs(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of route) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d];
    for (const s of [-1, 1]) {
      const X = x + s * dz, Z = z + s * dx, n = h.cell(X, Z), up = h.cell(X - dx, Z - dz), dn = h.cell(X + dx, Z + dz);
      if (!h.land(n) || n.s === "ramp" || n.h !== c.h - 1 || on.has(h.key(X, Z)) || h.isFig(X, Z) || h.decorAt(X, Z).length) continue;
      if (!up || up.h !== c.h || up.s === "ramp" || !h.land(up) || !dn || dn.h !== c.h - 1 || !h.land(dn)) continue;
      const saved = { ...n };
      h.set(X, Z, { h: c.h, s: "ramp", d: c.d, m: c.m || "stone" });
      if (h.reach().missing.length) h.set(X, Z, saved);
    }
  }
}

function moveSpawn(level, h, min) {
  if (h.approach().length >= min) return;
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z)) continue;
    const q = h.approach({ from: [x, z] });
    if (!q.length) continue;
    const sc = Math.min(q.length, 20) + 0.3 * (x + z);
    if (!best || sc > best[0]) best = [sc, x, z, q.length];
  }
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; h.log.push(`spawn ${best[1]},${best[2]} approach ${best[3]}`); }
}

function raiseAerie(level, h, brief) {
  const grid = brief.composition?.grid || [];
  let back = 0;
  grid.forEach((row, z) => [...row].forEach((ch, x) => {
    const c = h.cell(x, z);
    if (!c || ch === "V" || c.s !== "none" || x === 0 || z === 0 || x === h.W - 1 || z === h.D - 1) return;
    h.set(x, z, { h: 1, s: ch === "W" ? "water" : "sand" }); back++;
  }));
  const fc = h.figure.cells, xs = fc.map(([x]) => x), zs = fc.map(([, z]) => z);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 2, z0 = Math.min(...zs) - 1, z1 = Math.max(...zs) + 1;
  const rx = x1, rz = z1;
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c)) continue;
    const d = Math.max(x0 - x, x - x1, z0 - z, z - z1, 0);
    const hh = d === 0 ? 3 : d === 1 || (x === rx && z === rz + 2) ? 2 : 1;
    const s = hh === 3 ? "stone" : hh === 2 ? "sand" : c.s === "ramp" ? "sand" : c.s;
    if (hh !== c.h || c.s === "ramp") { h.set(x, z, { h: hh, s }); n++; }
  }
  const ok = [[rx, rz + 1], [rx, rz + 3]].every(([x, z]) => h.land(h.cell(x, z)));
  if (ok) {
    h.clear(rx, rz); h.clear(rx, rz + 2);
    h.set(rx, rz, { h: 3, s: "ramp", d: "s", m: "sand" });
    h.set(rx, rz + 2, { h: 2, s: "ramp", d: "s", m: "sand" });
  }
  h.log.push(`aerie restored ${back}, raised ${n}, stair ${ok ? rx + "," + rz : "none"}`);
}

function coast(level, h) {
  const wet = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => h.cell(x + a, z + b)?.s === "water");
  const hash = (x, z) => ((x * 73856093) ^ (z * 19349663)) >>> 0;
  let n = 0;
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z)) return;
    const to = c.h >= 3 ? (hash(x, z) % 5 ? "dirt" : "stone") : c.h === 2 ? (hash(x, z) % 6 ? "sand" : "stone") : wet(x, z) || hash(x, z) % 3 === 0 ? "grass" : c.s === "stone" ? "sand" : c.s;
    if (to !== c.s) { c.s = to; n++; }
  }));
  h.log.push(`coast repaint ${n}`);
}



function unhide(level, h) {
  const rampRef = (x, z) => level.cells.some((row, zz) => row.some((c, xx) => c.s === "ramp" && [1, -1].some((k) => xx + k * h.DIRS[c.d][0] === x && zz + k * h.DIRS[c.d][1] === z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z), o = h.cell(x + 1, z + 1);
    if (!h.land(c) || h.isFig(x, z) || !h.land(o) || o.h <= c.h || o.s === "ramp" || h.isFig(x + 1, z + 1) || rampRef(x + 1, z + 1)) continue;
    const saved = { ...o }, dec = level.decor.slice(), m0 = h.reach().missing.length;
    h.clear(x + 1, z + 1);
    h.set(x + 1, z + 1, { h: c.h, s: o.s });
    if (h.reach().missing.length > m0) { h.set(x + 1, z + 1, saved); level.decor.splice(0, level.decor.length, ...dec); } else n++;
  }
  h.log.push(`unhide ${n}`);
}

function finishLens(level, brief, h) {
  const L = lensName(level, brief);
  const props = level.palette?.props || {};
  lensLook(level, L);
  h.dryRim();
  if (L === "subject") raiseAerie(level, h, brief);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = brief.threshold?.prop && props[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold").find((t) => props[t]) || "eagle-stump-gate";
  const lightT = h.ofRole("light").find((t) => props[t]) || "lantern";
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && !daisTypes.includes(t) && props[t]?.role !== "lead");
  h.removeDecor((d) => d.t === gateT || d.t === lightT || passT.includes(d.t));
  if (L === "subject") jag(level, h, 90);
  let r = L === "subject" ? h.spawnAt({ min: 14, max: 20, force: true }) : h.spawnAt({ min: 9, max: 16 });
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  let g = null;
  if (L === "subject" && gateT) {
    const up = r.findIndex((q, i) => i > 1 && r[i + 1] && (h.cell(...r[i + 1]).s === "ramp" || h.cell(...r[i + 1]).h > h.cell(...q).h));
    for (let i = up - 1; i > 1 && !g; i--) {
      const [x, z] = r[i], [px, pz] = r[i - 1], ax = px !== x ? "x" : "z";
      const fl = ax === "z" ? [[x - 1, z], [x + 1, z]] : [[x, z - 1], [x, z + 1]];
      if (fl.some(([a, b]) => !h.cell(a, b) || h.cell(a, b).s === "none" || h.cell(a, b).s === "ramp")) continue;
      const saved = fl.map(([a, b]) => ({ ...h.cell(a, b) }));
      fl.forEach(([a, b]) => { if (h.cell(a, b).s === "water") h.set(a, b, { h: h.cell(x, z).h, s: "sand" }); });
      g = h.gate(gateT, { route: r, at: [x, z] });
      if (!g) fl.forEach(([a, b], j) => h.set(a, b, saved[j]));
    }
  }
  for (const frac of L === "subject" ? [0.35, 0.45, 0.25, 0.55] : L === "composition" ? [0.3, 0.2, 0.4, 0.6] : [0.6, 0.45, 0.7, 0.35]) if (!g && gateT) g = h.gate(gateT, { route: r, frac });
  const [ax, az] = h.figure.anchor;
  for (let a = -1; a <= 2; a++) for (let b = -1; b <= 2; b++) if (!h.isFig(ax + a, az + b)) h.removeDecor((d) => d.t !== gateT && d.x === ax + a && d.z === az + b && !props[d.t]?.passable);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => !posts.includes(d) && /snag|tree|pine|spire|ridge|stack|shingle/i.test(d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  h.along(passT, { route: r });
  h.ledges({ keep: [gateT] });
  h.repair({ keep: [gateT] });
  for (const q of posts) if (!level.decor.includes(q) && !h.decorAt(q.x, q.z).length) level.decor.push(q);
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.grow(84);
  if (h.walkN() < 84) h.thin(84, { keep: [gateT] });
  if (L === "subject") coast(level, h);
  if (L === "composition") {
    const far = (d) => -Math.hypot(d.x - h.figure.anchor[0], d.z - h.figure.anchor[1]);
    for (const [t, keep] of [["tree-round", 3], ["rock", 5], ["bush", 5]]) {
      const list = level.decor.filter((d) => d.t === t).sort((a, b) => far(b) - far(a));
      const drop = new Set(list.slice(keep));
      h.removeDecor((d) => drop.has(d));
    }
  }
  if (L === "medium") unhide(level, h);
  const map = REMAP[L] || {};
  for (const d of level.decor) if (map[d.t]) d.t = map[d.t];
  const tall = (t) => { const e = EXTRA.find(([n]) => n === t); const p = props[t]; return t !== gateT && !(p?.role === "lead") && !(e ? e[3] : p?.passable) && (e ? e[4] : p?.height || 1) >= 1.4; };
  const walk = (c) => h.land(c);
  const occ = h.removeDecor((d) => tall(d.t) && [[-1, 0], [0, -1], [-1, -1]].some(([a, b]) => { const q = h.cell(d.x + a, d.z + b); return walk(q) && q.h < h.cell(d.x, d.z).h && !h.isFig(d.x + a, d.z + b); }));
  h.log.push(`occluders ${occ}`);
  rampTone(level, h);
  if (L === "composition") placeLandmark(level, h, "eagle-slate-eyrie");
  if (L === "composition") placeGeneric(level, h, "watchtower", { ...UNPADDED, look: { post: "#7e7a71", postDark: "#5d5a53", plank: "#b8b4aa", shingle: "#4d4b43" } });
  if (level.name === "eagle-composition") placeRunThings(level, h, { edits: [{ x: 14, z: 2, h: 0 }, { x: 14, z: 3, h: 0 }, { x: 14, z: 4, h: 0 }], chestText: "A bone-pale shale feather, scoured smooth by the west wind." });
  h.log.push(`lens ${L} posts ${level.decor.filter((d) => d.t === gateT).map((d) => d.x + "," + d.z).join(" ")} approach ${h.approach().length} walk ${h.walkN()}`);
}

export function finish(level, brief, h) {
  if (brief.concept?.lens) return finishLens(level, brief, h);
  dropRimWater(h);
  const types = Object.keys(level.palette?.props || {});
  const daisTypes = h.ofRole("dais").concat(types.filter((t) => roleOf(level.palette, t) === "dais"));
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0] || types.find((t) => GATE_RE.test(t));
  const lightT = h.ofRole("light")[0] || types.find((t) => /lantern|torch|brazier|lamp/i.test(t)) || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 90);
  jag(level, h, 84);
  moveSpawn(level, h, 12);
  let r = h.approach();
  if (r.length) h.path(r);
  fixRamps(level, h);
  r = h.approach();
  widenStairs(level, h, r);
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  h.removeDecor((d) => /tree|pine|cypress|needle|boulder|rock/i.test(d.t) && near(d));
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
  repaint(h, keep);
  const [ax, az] = h.figure.anchor;
  for (let a = -1; a <= 2; a++) for (let b = -1; b <= 2; b++) if (!h.isFig(ax + a, az + b)) h.removeDecor((d) => d.x === ax + a && d.z === az + b && h.role(d.t) !== "offering");
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && posts().every((d) => h.cell(d.x, d.z).s !== "ramp") && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  h.repair();
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.5, 0.4, 0.6, 0.3, 0.7]) if (!g) g = tryGate(frac, strict);
  h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  ledges(h, types.filter((t) => roleOf(level.palette, t) === "mass").concat(["rock-big"]), level);
  h.repair({ keep: [gateT] });
  if (gateT && (posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length)) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  shore(h);
  tidy(level, h, gateT);
  rampTone(level, h);
  h.log.push(`posts ${posts().map((d) => d.x + "," + d.z).join(" ")} approach ${h.approach().length} reach ${h.reach().reached}/${h.reach().total}`);
}
