import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-b.js";
import { placeGeneric, UNPADDED } from "./multitile-place.js";
import { placeRunThings } from "./ember.js";
import { outgrow as growOut } from "./outgrowth.js";

const BLOOM = {
  skin: ["#d6cfff", "#bdb4f0", "#9d93d6"],
  skinLo: ["#b9b0ee", "#a097da", "#8279bd"],
  ink: ["#2e2a44", "#252138", "#1b182a"],
  line: ["#4a4468", "#3d3858", "#2f2b45"],
  mint: ["#7cf0a2", "#5ad483", "#3fb068"],
  teal: ["#4fe0ee", "#2fc2d4", "#1f9fb0"],
  yellow: ["#fff07a", "#f0d44e", "#d4b534"],
  pink: ["#f06ac8", "#d64fae", "#b0398e"],
  lilac: ["#c9a8ff", "#ad8cea", "#8f6fcc"],
  lips: ["#c792d8", "#ad78c0", "#8e5fa2"],
  wax: ["#f4efff", "#ddd5f5", "#bfb5e0"],
  glass: ["#e2dcff", "#c8c0f0", "#a79dd6"],
  flame: ["#ffd54a", "#ffb02e", "#f08a1a"],
  smoke: ["#e6e0ff", "#d2caf6", "#b8aee6"],
};
const DOODLE = [BLOOM.mint, BLOOM.teal, BLOOM.yellow, BLOOM.pink, BLOOM.lilac];
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;

const CANDLE_RE = /candle|tumbler|wax|vigil|brazier|pylon/i;
const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|stele|obelisk/i], ["light", /candle|tumbler|lantern|torch|brazier|lamp/i], ["dais", /dais|altar|plinth|pedestal|hearth|throne/i], ["offering", /pot|basket|bowl|offering|urn|censer|chest/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|horn|totem/i]];
const poseOf = (p) => /tilt|tipped|back/i.test(p) ? "tilt" : /horizontal|level|suspend|float/i.test(p) ? "level" : "upright";
const roleOf = (P, t) => {
  const r = P.props?.[t]?.role;
  if (r === "lead") return r;
  if (r === "threshold") return r;
  if (CANDLE_RE.test(t)) return "light";
  return r || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
};

function flame(B, x, y, z, s = 1) {
  B.box(0.03 * s, 0.05 * s, 0.03 * s, pal(BLOOM.ink), x, y, z);
  B.cone(0.08 * s, 0, 0.2 * s, pal(BLOOM.flame), x, y + 0.04 * s, z, 4);
  B.cone(0.04 * s, 0, 0.1 * s, pal(BLOOM.yellow), x, y + 0.04 * s, z, 4);
}

function candle(B, x, y, z, s, glassC = BLOOM.glass) {
  B.cyl(0.2 * s, 0.34 * s, pal(glassC), x, y, z, 8);
  B.cyl(0.17 * s, 0.03 * s, pal(BLOOM.wax), x, y + 0.34 * s, z, 8);
  B.box(0.26 * s, 0.14 * s, 0.03, pal(BLOOM.wax), x, y + 0.1 * s, z + 0.19 * s);
  flame(B, x, y + 0.37 * s, z, s);
}

function smoke(B, x, y, z, n = 3) {
  const offs = [[0.05, 0.02], [-0.06, 0.05], [0.04, -0.03], [-0.03, 0.02]];
  for (let i = 0; i < n; i++) {
    const [dx, dz] = offs[i % offs.length];
    const w = 0.14 - i * 0.02;
    B.rbox(w, 0.06, w * 0.8, 0.03, pal(BLOOM.smoke), x + dx, y + i * 0.16, z + dz);
  }
}

function spike(B, x, y, z, ang, len, w, c) {
  B.at(x, y, z, 0, () => {
    B.pushMatrix(new THREE.Matrix4().makeRotationZ(ang));
    B.cone(w, 0, len, pal(c), 0, 0, 0, 4);
    B.pop();
  });
}

function disc(B, x, y, z, r, c, ring) {
  B.at(x, y, z, 0, () => {
    B.pushMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    B.cyl(r, 0.08, pal(c), 0, -0.04, 0, 8);
    if (ring) B.cyl(r * 0.55, 0.1, pal(BLOOM.ink), 0, -0.05, 0, 8);
    if (ring) B.cyl(r * 0.25, 0.12, pal(c), 0, -0.06, 0, 8);
    B.pop();
  });
}

function head(B, v, pose) {
  if (pose === "tilt") B.pushMatrix(new THREE.Matrix4().makeRotationX(-0.2));
  B.rbox(0.36, 0.3, 0.32, 0.1, pal(BLOOM.skinLo), 0, 0, 0);
  const fy = 0.26;
  B.rbox(0.5, 0.16, 0.5, 0.12, pal(BLOOM.skin), 0, fy, 0.08);
  B.rbox(0.86, 0.24, 0.66, 0.16, pal(BLOOM.skin), 0, fy + 0.14, 0.04);
  B.rbox(1.12, 0.3, 0.76, 0.18, pal(BLOOM.skin), 0, fy + 0.36, 0.01);
  B.rbox(1.16, 0.34, 0.76, 0.18, pal(BLOOM.skin), 0, fy + 0.64, -0.01);
  B.box(0.28, 0.07, 0.04, pal(BLOOM.lips), 0, fy + 0.24, 0.37);
  B.box(0.16, 0.03, 0.04, pal(BLOOM.line), 0, fy + 0.3, 0.38);
  B.box(0.12, 0.18, 0.1, pal(BLOOM.skinLo), 0, fy + 0.36, 0.41);
  for (const x of [-0.27, 0.27]) {
    B.box(0.3, 0.06, 0.04, pal(BLOOM.ink), x, fy + 0.6, 0.39);
    B.box(0.06, 0.05, 0.04, pal(BLOOM.ink), x - 0.16, fy + 0.57, 0.39);
    for (const dx of [-0.08, 0, 0.08]) B.box(0.035, 0.08, 0.04, pal(BLOOM.ink), x + dx, fy + 0.52, 0.4);
    B.rbox(0.1, 0.28, 0.2, 0.05, pal(BLOOM.skinLo), x * 2.2, fy + 0.42, 0);
  }
  B.box(0.24, 0.12, 0.05, pal(BLOOM.wax), 0, fy + 0.82, 0.38);
  B.box(0.1, 0.1, 0.06, pal(BLOOM.teal), 0, fy + 0.83, 0.39);
  B.box(0.05, 0.05, 0.07, pal(BLOOM.ink), 0, fy + 0.855, 0.4);
  const y0 = fy + 0.92;
  const tiers = [[1.36, 0.26, 0], [1.52, 0.26, 0.24], [1.42, 0.24, 0.48], [1.12, 0.22, 0.7], [0.66, 0.2, 0.9]];
  for (const [w, hh, y] of tiers) B.rbox(w, hh, 0.84, 0.18, pal(BLOOM.ink), 0, y0 + y, -0.12);
  B.cone(0.2, 0, 0.26, pal(BLOOM.ink), 0, y0 + 1.08, -0.12, 4);
  for (const s of [-1, 1]) {
    spike(B, s * 0.68, y0 + 0.12, -0.12, -s * 1.9, 0.3, 0.13, BLOOM.ink);
    spike(B, s * 0.74, y0 + 0.36, -0.12, -s * 1.45, 0.34, 0.14, BLOOM.ink);
    spike(B, s * 0.66, y0 + 0.62, -0.12, -s * 1.0, 0.32, 0.13, BLOOM.ink);
    spike(B, s * 0.44, y0 + 0.86, -0.12, -s * 0.55, 0.3, 0.12, BLOOM.ink);
  }
  const d = [[-0.42, 0.2, 0.16, 0, 1], [0.44, 0.26, 0.15, 1, 0], [0, 0.44, 0.19, 2, 1], [-0.5, 0.56, 0.12, 3, 0], [0.48, 0.62, 0.14, 4, 1], [-0.18, 0.8, 0.12, 1, 0], [0.22, 0.86, 0.11, 3, 1]];
  for (const [x, y, r, c, ring] of d) disc(B, x, y0 + y, 0.31, r, DOODLE[(c + v) % DOODLE.length], ring);
  B.box(0.05, 0.36, 0.04, pal(BLOOM.mint), -0.12, y0 + 0.02, 0.31);
  B.box(0.05, 0.3, 0.04, pal(BLOOM.yellow), 0.14, y0 + 0.04, 0.31);
  B.box(0.34, 0.04, 0.04, pal(BLOOM.pink), -0.1, y0 + 0.7, 0.31);
  if (pose === "tilt") B.pop();
}

function bust(B, H, look, v, pose = "upright") {
  const s = H / 2.7;
  B.push(0, 0, 0, 0, s);
  B.prism(circle(0, 0, 0.96, 0.96, 8, Math.PI / 8), 0, 0.18, pal(look.lo));
  B.prism(circle(0, -0.06, 0.78, 0.74, 8, Math.PI / 8), 0.18, 0.3, pal(look.hi));
  let top = 0.3;
  if (pose === "level") {
    candle(B, 0.2, 0.3, 0.5, 1.15);
    smoke(B, 0.18, 0.78, 0.44, 2);
    B.box(0.24, 0.2, 0.24, pal(BLOOM.ink), 0, 0.3, -0.18);
    top = 0.5;
  } else if (pose === "tilt") {
    candle(B, 0.56, 0.3, 0.5, 0.8);
    smoke(B, 0.44, 0.72, 0.46, 3);
  } else {
    candle(B, 0.52, 0.3, 0.52, 0.8);
    smoke(B, 0.46, 0.72, 0.44, 2);
  }
  B.at(0, top, -0.14, 0.4, () => head(B, v, pose));
  B.pop();
}

const SMOKE = ["#d8d2ff", "#bdb4f0", "#a59ee0"];
const OBSID = ["#2e2a44", "#1f1c30", "#141220"];
const BRASS = ["#e8c25a", "#c99e36", "#a07a22"];

function glassPost(B, H, coil) {
  B.prism(circle(0, 0, 0.34, 0.34, 8, Math.PI / 8), 0, 0.16, pal(BLOOM.line));
  const g = Math.max(0.5, H * 0.55);
  B.cyl(0.26, g, pal(BLOOM.glass), 0, 0.16, 0, 8);
  B.cyl(0.22, 0.05, pal(BLOOM.wax), 0, 0.16 + g, 0, 8);
  B.box(0.3, g * 0.4, 0.04, pal(BLOOM.wax), 0, 0.16 + g * 0.25, 0.25);
  B.box(0.08, 0.08, 0.05, pal(BLOOM.ink), 0, 0.16 + g * 0.42, 0.26);
  if (coil) {
    for (let i = 0; i < 8; i++) { const a = i * 0.85, r = 0.16 - i * 0.012; B.box(0.08, 0.06, 0.08, pal(BRASS), Math.cos(a) * r, 0.21 + g + i * 0.04, Math.sin(a) * r); }
    smoke(B, 0, 0.6 + g, 0, 3);
  } else flame(B, 0, 0.2 + g, 0, 2.4);
  return 0.16 + g;
}

const KINDS = [
  ["oculus", /oculus|plinth.*eye|inlay/i],
  ["eyeTotem", /eye|watchful/i],
  ["orbs", /orb/i],
  ["helix", /helix/i],
  ["smoke", /smoke|riser|ribbon|plume/i],
  ["fin", /fin\b|fin$|thought|scallop/i],
  ["jar", /jar|apothecary|vial/i],
  ["stems", /lavender|stem|stump|herb|bundle/i],
  ["mush", /cap|shroom|mush|fung|spore/i],
];
const kindOf = (t) => (KINDS.find(([, re]) => re.test(t)) || [null])[0];

const LENS = {
  oculus(B, H, v) {
    B.prism(circle(0, 0, 0.46, 0.3, 8, Math.PI / 8), 0, 0.1, pal(BLOOM.line));
    B.prism(circle(0, 0, 0.38, 0.22, 8, Math.PI / 8), 0.1, 0.16, pal(BLOOM.wax));
    B.prism(circle(0, 0, 0.14, 0.14, 8, Math.PI / 8), 0.16, 0.2, pal(BLOOM.teal));
    B.prism(circle(0, 0, 0.07, 0.07, 6, 0), 0.2, 0.23, pal(BLOOM.ink));
  },
  eyeTotem(B, H, v) {
    const obelisk = H > 1.5;
    B.box(0.5, 0.14, 0.5, pal(BLOOM.line));
    if (obelisk) {
      B.box(0.34, H * 0.45, 0.34, pal(BLOOM.skinLo), 0, 0.14, 0);
      B.box(0.26, H * 0.12, 0.26, pal(BLOOM.lilac), 0, 0.14 + H * 0.45, 0);
      B.cone(0.2, 0, 0.18, pal(BLOOM.skinLo), 0, 0.14 + H * 0.57, 0, 4);
    }
    const y = obelisk ? H * 0.72 : 0.14, s = obelisk ? 0.8 : 1;
    B.at(0, y, 0, 0.3, () => {
      B.box(0.62 * s, 0.1, 0.3 * s, pal(OBSID), 0, 0, 0);
      B.box(0.12, 0.56 * s, 0.3 * s, pal(OBSID), -0.26 * s, 0.1, 0);
      B.box(0.12, 0.56 * s, 0.3 * s, pal(OBSID), 0.26 * s, 0.1, 0);
      B.box(0.62 * s, 0.1, 0.3 * s, pal(OBSID), 0, 0.1 + 0.56 * s, 0);
      B.cone(0.14 * s, 0, 0.22 * s, pal(OBSID), 0, 0.2 + 0.56 * s, 0, 4);
      B.at(0, 0.38 * s, 0.02, 0, () => {
        B.pushMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        B.cyl(0.2 * s, 0.22 * s, pal(BLOOM.wax), 0, -0.11 * s, 0, 8);
        B.cyl(0.12 * s, 0.26 * s, pal(v % 2 ? BLOOM.mint : BLOOM.teal), 0, -0.13 * s, 0, 8);
        B.cyl(0.06 * s, 0.3 * s, pal(BLOOM.ink), 0, -0.15 * s, 0, 6);
        B.pop();
      });
    });
  },
  orbs(B, H, v, { floating }) {
    const pole = floating ? BRASS : OBSID;
    B.box(0.44, 0.14, 0.44, pal(floating ? BLOOM.line : OBSID));
    B.box(0.16, H * 0.5, 0.16, pal(pole), 0, 0.14, 0);
    const cols = floating ? [BLOOM.mint, BLOOM.lilac, BLOOM.yellow] : [BLOOM.teal, BLOOM.yellow, BLOOM.pink];
    const pts = floating ? [[0, 0, 0.26], [0.04, 0.26, 0.22], [-0.03, 0.48, 0.18]] : [[-0.14, 0, 0.2], [0.16, 0.04, 0.18], [0, 0.24, 0.22], [0.02, 0.02, -0.16]];
    const y0 = 0.14 + H * 0.46;
    pts.forEach(([x, y, r], i) => {
      const c = cols[(i + v) % cols.length];
      B.cyl(r, r * 1.2, pal(c), x, y0 + y, i === 3 ? -0.12 : 0.02, 8);
      B.cyl(r * 0.6, r * 0.3, pal(c), x, y0 + y + r * 1.2, i === 3 ? -0.12 : 0.02, 8);
    });
  },
  helix(B, H, v, { tree }) {
    if (tree) {
      B.box(0.28, H * 0.34, 0.28, pal(OBSID));
      const n = 5, y0 = H * 0.3, hh = (H - y0) / n;
      for (let i = 0; i < n; i++) {
        const w = 0.9 - i * 0.13;
        B.at(0, y0 + i * hh, 0, i * 0.4, () => B.rbox(w, hh * 0.9, w * 0.62, 0.1, pal(i % 2 ? BLOOM.teal : BLOOM.mint), 0, 0, 0));
      }
      B.cyl(0.08, 0.14, pal(BLOOM.yellow), 0, H, 0, 6);
      return;
    }
    B.box(0.42, 0.12, 0.42, pal(BLOOM.line));
    B.box(0.1, H - 0.2, 0.1, pal(OBSID), 0, 0.12, 0);
    const n = 7, hh = (H - 0.3) / n;
    for (let i = 0; i < n; i++) B.at(0, 0.16 + i * hh, 0, i * 0.55 + v, () => B.box(0.56, hh * 0.7, 0.2, pal(i % 2 ? BLOOM.mint : BLOOM.yellow), 0.1, 0, 0));
  },
  smoke(B, H, v) {
    B.rbox(0.36, 0.08, 0.36, 0.1, pal(BLOOM.line), 0, 0, 0);
    const n = 5, hh = (H - 0.1) / n;
    for (let i = 0; i < n; i++) {
      const x = Math.sin(i * 1.3 + v) * 0.14, z = Math.cos(i * 1.3 + v) * 0.08;
      const w = 0.34 - i * 0.03;
      B.at(x, 0.08 + i * hh, z, i * 0.5, () => B.rbox(w, hh * 0.78, w * 0.7, 0.1, pal(i % 2 ? BLOOM.smoke : SMOKE), 0, 0, 0));
    }
  },
  fin(B, H, v) {
    B.box(0.64, 0.16, 0.5, pal(OBSID));
    const segs = [[0.6, 0.34], [0.52, 0.3], [0.42, 0.26], [0.3, 0.22]];
    const hh = (H - 0.5) / segs.length;
    segs.forEach(([w, d], i) => {
      const y = 0.16 + i * hh;
      B.box(w, hh, d, pal(BLOOM.ink), (i % 2 ? 0.05 : -0.04), y, 0);
      B.box(w * 0.6, 0.06, 0.04, pal(DOODLE[(i + v) % DOODLE.length]), (i % 2 ? 0.05 : -0.04), y + hh * 0.5, d / 2 + 0.01);
      spike(B, (i % 2 ? 1 : -1) * w / 2, y + hh * 0.7, 0, (i % 2 ? -1.2 : 1.2), 0.2, 0.08, BLOOM.ink);
    });
    B.cone(0.16, 0, 0.34, pal(BLOOM.ink), 0, 0.16 + segs.length * hh, 0, 4);
  },
  jar(B, H, v) {
    B.box(0.44, 0.08, 0.44, pal(BLOOM.line));
    const g = H * 0.62;
    B.cyl(0.24, g, pal(BLOOM.glass), 0, 0.08, 0, 8);
    B.cyl(0.25, g * 0.5, pal(v % 2 ? BLOOM.pink : BLOOM.teal), 0, 0.1, 0, 8);
    B.cyl(0.13, H * 0.12, pal(BLOOM.glass), 0, 0.08 + g, 0, 8);
    B.cyl(0.1, H * 0.14, pal(["#b07a4a", "#94623a", "#74482a"]), 0, 0.08 + g + H * 0.1, 0, 8);
    B.box(0.26, g * 0.3, 0.04, pal(BLOOM.wax), 0, 0.08 + g * 0.55, 0.24);
  },
  stems(B, H, v) {
    B.rbox(0.44, 0.08, 0.4, 0.1, pal(BLOOM.line), 0, 0, 0);
    const st = [[-0.1, -0.06], [0.1, -0.08], [0.02, 0.1], [-0.12, 0.1], [0.13, 0.08]];
    for (const [x, z] of st) B.box(0.07, H * 0.7, 0.07, pal(["#7ea572", "#638a58", "#4d6e44"]), x, 0.08, z);
    B.box(0.38, 0.08, 0.34, pal(["#b07a4a", "#94623a", "#74482a"]), 0, 0.08 + H * 0.25, 0);
    for (const [x, z] of st) B.rbox(0.13, H * 0.22, 0.13, 0.04, pal((x + z) > 0 ? BLOOM.lilac : ["#a47ae0", "#8c62c8", "#704aa8"]), x, 0.08 + H * 0.7, z);
  },
  mush(B, H, v) {
    const trio = [[0, 0, 1], [0.24, 0.14, 0.7], [-0.2, 0.16, 0.6]].slice(0, v % 2 ? 3 : 2);
    for (const [x, z, k] of trio) {
      B.cyl(0.08 * (k + 0.4), H * 0.5 * k, pal(BLOOM.wax), x, 0, z, 6);
      B.cyl(0.26 * k + 0.06, H * 0.2 * k, pal(BLOOM.mint), x, H * 0.5 * k, z, 8);
      B.cyl(0.16 * k + 0.04, H * 0.14 * k, pal(BLOOM.mint), x, H * 0.7 * k, z, 8);
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + v; B.box(0.06, 0.05, 0.06, pal(i % 2 ? BLOOM.yellow : BLOOM.lilac), x + Math.cos(a) * 0.2 * k, H * 0.68 * k, z + Math.sin(a) * 0.2 * k); }
    }
  },
};

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { lo: pick(dt, 0, ["#9d97c8", "#857fb2", "#6c6697"]), hi: pick(dt, 1, ["#c8c2ec", "#aea8d8", "#908ac0"]) };
  const catalog = {};
  const builders = {};
  const brief4 = types.some((t) => props[t].summary || props[t].parts);
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" ? false : !!p.passable, variants: 2, height: role === "lead" ? (brief4 ? 2.9 : Math.min(2.9, Math.max(2.5, p.height || 2.6))) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, BLOOM.lilac), c1 = pick(tn, 1, BLOOM.skin), c2 = pick(tn, 2, BLOOM.teal);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      const kind = kindOf(t);
      if (role === "lead") bust(B, H, look, v, poseOf(p.pose || ""));
      else if (brief4 && role === "threshold") {
        const top = glassPost(B, H, /coil|incense/i.test(t));
        if (d.side) {
          const reach = 1.0, yb = Math.min(top + 0.1, 1.3);
          const beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(yb, 0.14, BLOOM.ink);
          beam(yb + 0.14, 0.08, BLOOM.pink);
        }
      } else if (brief4 && kind) LENS[kind](B, H, v, { floating: /float|brass/i.test(t) || role === "approach", tree: /tree/i.test(t) });
      else if (role === "threshold") {
        const wax = CANDLE_RE.test(t);
        B.prism(circle(0, 0, 0.3, 0.3, 8, Math.PI / 8), 0, 0.2, pal(look.lo));
        if (wax) {
          B.cyl(0.2, H * 0.62, pal(BLOOM.wax), 0, 0.2, 0, 8);
          B.cyl(0.23, 0.08, pal(BLOOM.lilac), 0, 0.2 + H * 0.3, 0, 8);
          B.cyl(0.14, 0.04, pal(BLOOM.wax), 0, 0.2 + H * 0.62, 0, 8);
          flame(B, 0, 0.2 + H * 0.62, 0, 2.2);
        } else {
          B.box(0.36, H * 0.4, 0.36, pal(c0), 0, 0.2, 0);
          B.box(0.3, H * 0.24, 0.3, pal(c1), 0, 0.2 + H * 0.4, 0);
          B.cyl(0.2, 0.1, pal(BLOOM.yellow), 0, 0.2 + H * 0.64, 0, 8);
          B.rbox(0.3, 0.26, 0.14, 0.06, pal(BLOOM.wax), 0, 0.2 + H * 0.64 + 0.1, 0);
          B.box(0.12, 0.12, 0.16, pal(BLOOM.teal), 0, 0.2 + H * 0.64 + 0.17, 0);
          B.box(0.06, 0.06, 0.18, pal(BLOOM.ink), 0, 0.2 + H * 0.64 + 0.2, 0);
          B.cone(0.14, 0, 0.2, pal(c2), 0, 0.2 + H * 0.64 + 0.36, 0, 4);
        }
        if (d.side) {
          const reach = 1.0, yb = Math.min(H * 0.7, 1.3);
          const beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(yb, 0.16, BLOOM.lilac);
          beam(yb + 0.16, 0.08, BLOOM.pink);
        }
      } else if (role === "light") {
        if (/brazier|pedestal/i.test(t)) {
          B.box(0.44, 0.16, 0.44, pal(look.lo));
          B.box(0.3, H * 0.4, 0.3, pal(look.hi), 0, 0.16, 0);
          candle(B, 0, 0.16 + H * 0.4, 0, 1);
        } else {
          const s = Math.min(2, H / 0.7);
          B.box(0.5, 0.1, 0.5, pal(look.lo));
          candle(B, 0, 0.1, 0, s * 0.8);
          if (H > 1.2) smoke(B, 0.02, 0.1 + s * 0.8 * 0.6 + 0.1, 0, 2);
        }
      } else if (role === "dais") {
        B.prism(circle(0, 0, 0.46, 0.46, 8, Math.PI / 8), 0, H * 0.6, pal(c0));
        B.prism(circle(0, 0, 0.36, 0.36, 8, Math.PI / 8), H * 0.6, H, pal(c1));
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.08, pal(c1), 0, H * 0.55, 0, 8);
        smoke(B, 0, H * 0.55 + 0.12, 0, 2);
      } else if (role === "mass" && /tree/i.test(t)) {
        B.box(0.3, H * 0.42, 0.3, pal(pick(tn, 0, ["#8d4c7d", "#74406a", "#5a3052"])));
        const cs = v % 2 ? [[0.9, 0.4], [0.7, 0.36], [0.44, 0.3]] : [[0.82, 0.38], [0.64, 0.34], [0.42, 0.28]];
        let y = H * 0.38;
        cs.forEach(([w, h], i) => { B.rbox(w, h, w, 0.12, pal(i === 1 ? c2 : c1), i % 2 ? 0.04 : -0.03, y, i % 2 ? -0.03 : 0.03); y += h; });
      } else if (role === "mass") {
        const segs = v % 2 ? [0.62, 0.46, 0.3] : [0.56, 0.42, 0.28];
        const hh = (H - 0.3) / segs.length;
        const cols = /horn|obsidian/i.test(t) ? [BLOOM.ink, BLOOM.line, BLOOM.ink] : [c0, c1, c2];
        segs.forEach((w, i) => B.box(w, hh, w, pal(cols[i % 3]), (i % 2 ? 0.06 : -0.04), i * hh, (i % 2 ? -0.05 : 0.04)));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(/horn|obsidian/i.test(t) ? BLOOM.teal : c2), 0, H - 0.3, 0, 4);
      } else if (/fung|mush|spore/i.test(t)) {
        B.cyl(0.1, H * 0.5, pal(BLOOM.wax), 0, 0, 0, 6);
        B.cyl(0.3, H * 0.22, pal(DOODLE[v % 5]), 0, H * 0.5, 0, 8);
        B.cyl(0.2, H * 0.18, pal(DOODLE[(v + 3) % 5]), 0, H * 0.72, 0, 8);
      } else {
        const g = [[0, 0, 0.46, H * 0.7, c0], [0.2, 0.12, 0.32, H * 0.55, c1], [-0.18, 0.16, 0.28, H * 0.45, c2]];
        for (const [x, z, w, h, c] of g) B.rbox(w, h, w, 0.1, pal(c), x, 0, z);
      }
      return mesh(B);
    };
  }
  const EXTRA = {
    "doodle-disc": [0.08, true, (B, H, v) => { const c = DOODLE[v % DOODLE.length], c2 = DOODLE[(v + 2) % DOODLE.length]; B.cyl(0.3, 0.03, pal(c), 0, 0, 0, 8); B.cyl(0.2, 0.04, pal(BLOOM.ink), 0, 0, 0, 8); B.cyl(0.1, 0.05, pal(c2), 0, 0, 0, 8); if (v % 2) for (let i = 0; i < 5; i++) { const a = i * 1.26; B.box(0.07, 0.04, 0.07, pal(c2), Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38); } }],
    "helix-tree": [2.1, false, (B, H, v) => LENS.helix(B, H, v, { tree: true })],
    "lavender-bundle": [0.7, false, (B, H, v) => LENS.stems(B, H, v)],
    "mind-shroom": [0.9, false, (B, H, v) => LENS.mush(B, H, v)],
  };
  for (const [t, [hh, pass, fn]] of Object.entries(EXTRA)) {
    if (catalog[t]) continue;
    catalog[t] = { footprint: [1, 1], passable: pass, variants: t === "doodle-disc" ? 5 : 2, height: hh };
    builders[t] = (v, rot, st, ctx) => { const B = new Baker(); fn(B, ctx.height, v); return mesh(B); };
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
    if (up && ["sand", "grass", "dirt", "stone"].includes(up.s)) c.m = up.s;
  }));
}

function repaint(level, h, keep) {
  const cells = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c && h.land(c) && c.s !== "ramp") cells.push([x, z, c]); }));
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length < cells.length * 0.3) return;
  const to = { 1: "grass", 2: "dirt", 3: "grass" };
  for (const [x, z, c] of stone) {
    if (keep.has(h.key(x, z)) || (x * 7 + z * 3) % 11 === 0) continue;
    level.cells[z][x] = { h: c.h, s: to[c.h] || "grass" };
  }
}

function thin(level, h, keep) {
  const order = [/^pot$|urn|censer/i, /mushroom|fung|spore/i, /^rock/i, /tree|pine/i];
  const [ax, az] = h.figure.anchor;
  for (const re of order) {
    while (h.reach().total < 84) {
      const c = level.decor.filter((d) => re.test(d.t) && !keep.includes(d.t) && d !== h.lead);
      if (!c.length) break;
      c.sort((a, b) => Math.abs(b.x - ax) + Math.abs(b.z - az) - Math.abs(a.x - ax) - Math.abs(a.z - az));
      const d = c[c.length > 2 ? 1 : 0];
      h.removeDecor((e) => e === d);
    }
  }
}

function causeway(level, h) {
  const [ax, az] = h.figure.anchor;
  const [sx, sz] = level.spawn;
  const x = ax + 1;
  if (Math.abs(sx - x) > 1 || sz <= az + 2) return;
  const col = [];
  for (let z = az + 2; z <= sz; z++) col.push(level.cells[z]?.[x]);
  if (!col.some((c) => c && c.s === "water")) return;
  if (col.some((c) => !c || (c.s !== "water" && !h.land(c)))) return;
  const hh = level.cells[sz][sx].h;
  for (let z = az + 2; z <= sz; z++) {
    const c = level.cells[z][x];
    if (c.s === "water") level.cells[z][x] = { h: hh, s: h.surf.path };
  }
  if (sx !== x && h.land(level.cells[sz][x])) level.spawn = [x, sz];
}

const LOOKS = {
  medium: {
    bg: "#c3bdff",
    sand: { top: "#ece8ff", lip: "#bdb4f0", edge: "#d6cfff", dots: "#f6f3ff" },
    grass: { top: "#7cf0a2", fringe: "#5ad483", fringeDark: "#3fb068", speck: "#fff07a" },
    stone: { top: "#c9a8ff", pebble: "#e0ccff", pebbleShade: "#ad8cea", rim: "#8f6fcc" },
    dirt: { top: "#fff07a", patch: "#f06ac8", mottle: "#4fe0ee", border: "#d4b534", path: "#f6e070" },
    cliffUpper: { left: "#1d1b29", right: "#0e0d14", seam: "#4fe0ee" },
    cliffLower: { left: "#1d1b29", right: "#0e0d14", seam: "#f06ac8", speck: "#7cf0a2" },
  },
  subject: {
    sand: { top: "#f2c752", lip: "#c9861c", edge: "#a86a10", dots: "#ffe39a" },
    dirt: { top: "#6e4a6a", patch: "#744f70", mottle: "#6a4666", border: "#3d2439", path: "#8f6885" },
    stone: { top: "#8e87c0", pebble: "#a5a2cf", pebbleShade: "#6c6697", rim: "#4f4a78" },
  },
  composition: {
    dirt: { top: "#1d1b29", patch: "#23212f", mottle: "#26233a", border: "#0e0d14", path: "#2a2740" },
    sand: { top: "#f4efff", lip: "#ffb02e", edge: "#ddd5f5", dots: "#fff07a" },
    stone: { top: "#c3bdff", pebble: "#d6cfff", pebbleShade: "#a59ee0", rim: "#8279bd" },
    grass: { top: "#a59ee0", fringe: "#8f87cc", fringeDark: "#7068b0", speck: "#d6cfff" },
  },
};
const LIGHTS = {
  medium: { dir: [-0.2, 1, 0.4], ambient: 0.95, sun: 0.1 },
  subject: { dir: [0.7, 0.8, 0.9], ambient: 0.6, sun: 0.48 },
  composition: { dir: [-0.35, 1, 0.55], ambient: 0.84, sun: 0.22 },
};

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const hsh = (x, z) => ((x * 73856093) ^ (z * 19349663)) >>> 0;
const landAt = (h, x, z) => h.land(h.cell(x, z));

function swapTypes(level, map) {
  for (const d of level.decor) if (map[d.t]) { d.t = map[d.t]; d.v = hsh(d.x, d.z) % 2; }
}

function discs(level, h, pred, max) {
  let n = 0;
  for (let z = 0; z < h.D && n < max; z++) for (let x = 0; x < h.W && n < max; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || !pred(x, z, c)) continue;
    if (hsh(x, z) % 3) continue;
    if (h.put("doodle-disc", x, z, { v: hsh(x, z) % 5, ox: ((hsh(x, z) >> 4) % 10 - 5) * 0.03, oz: ((hsh(x, z) >> 8) % 10 - 5) * 0.03 })) n++;
  }
  h.log.push(`discs ${n}`);
}

function southSpawn(level, h) {
  const cx = h.figure.anchor[0] + 0.5;
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z)) continue;
    const sc = z * 3 - Math.abs(x - cx) * 2;
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; }
  return h.approach();
}

function fins(level, h, t, max) {
  const [ax, az] = h.figure.anchor;
  const r = h.approach();
  const onR = (x, z) => r.some(([a, b]) => a === x && b === z);
  const spots = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || c.h < 2 || h.isFig(x, z) || onR(x, z) || h.decorAt(x, z).length) continue;
    const back = N4.some(([a, b]) => (b < 0 || a < 0) && !landAt(h, x + a, z + b));
    const front = [[1, 0], [0, 1]].some(([a, b]) => !landAt(h, x + a, z + b) || h.cell(x + a, z + b).h > c.h);
    if (!back || front || Math.abs(x - ax - 0.5) + Math.abs(z - az - 0.5) < 2.5) continue;
    spots.push([x, z]);
  }
  let n = 0;
  const used = [];
  for (const [x, z] of spots.sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
    if (n >= max || used.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) < 2)) continue;
    const before = h.walkN();
    if (!h.put(t, x, z, { v: n % 2 })) continue;
    if (h.walkN() < before - 1) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    used.push([x, z]); n++;
  }
  h.log.push(`fins ${n}`);
}

function stack(level, h) {
  const [ax, az] = h.figure.anchor;
  const setH = (x, z, hh, s) => { const c = h.cell(x, z); if (h.land(c)) level.cells[z][x] = { h: hh, s }; };
  const rows = [];
  for (let z = 0; z < h.D; z++) rows.push([...Array(h.W).keys()].filter((x) => landAt(h, x, z)));
  let neck0 = -1, neck1 = -1;
  for (let z = az + 2; z < h.D; z++) if (rows[z].length && rows[z].length <= 3) { if (neck0 < 0) neck0 = z; neck1 = z; } else if (neck0 >= 0) break;
  if (neck0 < 0) return h.log.push("stack: no neck");
  for (let z = 0; z < neck0; z++) for (const x of rows[z]) setH(x, z, z <= az + 1 ? 3 : 2, z <= az + 1 ? "dirt" : hsh(x, z) % 4 ? "grass" : "stone");
  for (let z = neck0; z <= neck1; z++) for (const x of rows[z]) setH(x, z, 2, "grass");
  for (let z = neck1 + 1; z < h.D; z++) for (const x of rows[z]) setH(x, z, 1, (x + z) % 2 && hsh(x, z) % 5 === 0 ? "stone" : "sand");
  for (const x of rows[neck1]) if (landAt(h, x, neck1 + 1)) level.cells[neck1][x] = { h: 2, s: "ramp", d: "s", m: "stone" };
  const front = az + 1;
  const sides = rows[front].filter((x) => landAt(h, x, front + 1) && landAt(h, x, front - 1) && Math.abs(x - ax - 0.5) >= 3);
  const pickL = sides.filter((x) => x < ax).sort((a, b) => b - a)[0], pickR = sides.filter((x) => x > ax + 1).sort((a, b) => a - b)[0];
  for (const x of [pickL, pickR]) if (x != null) level.cells[front][x] = { h: 3, s: "ramp", d: "s", m: "stone" };
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) if (h.cell(x, z)?.s === "ramp") h.clear(x, z);
  h.log.push(`stack neck ${neck0}-${neck1}, crown ramps ${pickL},${pickR}`);
}

function finishLens(level, brief, h) {
  const L = brief.concept?.lens || (typeof brief.lens === "string" ? brief.lens : "medium");
  const look = LOOKS[L] || {};
  for (const k of Object.keys(look)) if (k === "bg") level.bg = look.bg; else level.palette[k] = { ...level.palette[k], ...look[k] };
  if (look.bg) level.palette.bg = look.bg;
  if (LIGHTS[L]) level.light = LIGHTS[L];
  h.dryRim();
  const props = level.palette?.props || {};
  const gateT = brief.threshold?.prop && props[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0];
  const daisT = h.ofRole("dais").filter((t) => props[t]?.passable);
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && !daisT.includes(t) && props[t]?.role !== "lead");
  swapTypes(level, { "tree-round": "helix-tree", stump: "lavender-bundle", mushroom: L === "medium" ? "spotted-neon-cap" : "mind-shroom", gem: "doodle-disc" });
  h.removeDecor((d) => d.t === gateT || d.t === lightT || daisT.includes(d.t) || passT.includes(d.t) || d.t === "lantern" || d.t === "torch" || d.t === "marker");
  if (L === "composition") stack(level, h);
  let r = L === "subject" ? h.spawnAt({ min: 10, max: 16 }) : southSpawn(level, h);
  if (r.length) h.path(r, { s: L === "composition" ? "grass" : L === "medium" ? "dirt" : "sand" });
  r = h.approach();
  if (L !== "composition") fixRamps(level, h);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: L === "composition" ? 0.25 : 0.35 }) : null;
  h.along(passT, { route: r });
  if (lightT) h.lights(lightT, { route: r, every: 3, skip: 2, max: 4, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  h.ledges({ keep: [gateT] });
  h.repair({ keep: [gateT] });
  if (L !== "composition") {
    h.pruneRamps({ route: h.approach() });
    h.pruneRamps({ all: true, slotsOnly: true });
    h.openRamps();
    h.pruneRamps({ all: true, nearFig: 1 });
  }
  if (h.walkN() < 84) h.thin(84, { keep: [gateT, lightT] });
  if (h.walkN() < 84) h.grow(84);
  if (L === "subject") { const fin = h.ofRole("mass").find((t) => /fin|thought/.test(t)); if (fin) fins(level, h, fin, 5); }
  if (L === "medium") discs(level, h, (x, z, c) => c.h >= 2, 14);
  if (L === "composition") discs(level, h, (x, z, c) => c.h === 3, 16);
  h.rampTone();
  if (L === "medium") for (const row of level.cells) for (const c of row) if (c && c.s === "ramp") c.m = "grass";
  if (L === "medium") placeLandmark(level, h, "mindbloom-doodle-fountain");
  if (L === "medium") placeGeneric(level, h, "shrine-small", { ...UNPADDED, shrink: false, look: { shrine: "#ece8ff", shrineLight: "#f6f3ff", shrineDark: "#bdb4f0" } });
  if (level.name === "mindbloom-medium") placeRunThings(level, h, { spawn: [12, 9], chestText: "A crowned thought, folded small, humming periwinkle." });
}

export const PIN = { "mindbloom-medium": {"spawn":[12,9],"cells":[],"decor":[{"t":"dreamer-effigy","x":7,"z":2,"v":0,"rot":0,"ox":0,"oz":0,"watch":"w1"},{"t":"spotted-neon-cap","x":4,"z":1,"v":1,"rot":0,"ox":-0.05,"oz":0.12},{"t":"spotted-neon-cap","x":4,"z":2,"v":1,"rot":0,"ox":-0.07,"oz":0},{"t":"eyeball-totem","x":3,"z":1,"v":1,"rot":0,"ox":-0.06,"oz":-0.04},{"t":"helix-tree","x":3,"z":7,"v":1,"rot":0,"ox":0.05,"oz":-0.02},{"t":"helix-tree","x":9,"z":6,"v":1,"rot":0,"ox":-0.02,"oz":0.01},{"t":"helix-tree","x":12,"z":6,"v":1,"rot":0,"ox":0.02,"oz":0.06},{"t":"helix-tree","x":13,"z":8,"v":0,"rot":0,"ox":0.02,"oz":0.09},{"t":"spotted-neon-cap","x":10,"z":3,"v":1,"rot":0,"ox":-0.04,"oz":0.09},{"t":"spotted-neon-cap","x":14,"z":6,"v":0,"rot":0,"ox":-0.04,"oz":-0.06},{"t":"spotted-neon-cap","x":13,"z":7,"v":1,"rot":0,"ox":0.03,"oz":0.09},{"t":"helix-tree","x":6,"z":9,"v":1,"rot":0,"ox":0.01,"oz":0.03},{"t":"doodle-disc","x":7,"z":1,"v":0,"rot":0,"ox":0.04,"oz":-0.06},{"t":"doodle-disc","x":1,"z":4,"v":1,"rot":0,"ox":-0.01,"oz":-0.1},{"t":"doodle-disc","x":6,"z":8,"v":0,"rot":0,"ox":0.05,"oz":-0.04},{"t":"doodle-disc","x":4,"z":4,"v":0,"rot":0,"ox":0.01,"oz":-0.07},{"t":"doodle-disc","x":12,"z":4,"v":0,"rot":0,"ox":-0.1,"oz":0.11},{"t":"doodle-disc","x":10,"z":6,"v":0,"rot":0,"ox":0.13,"oz":0.05},{"t":"doodle-disc","x":9,"z":2,"v":1,"rot":0,"ox":-0.1,"oz":-0.01},{"t":"doodle-disc","x":3,"z":2,"v":1,"rot":0,"ox":0.03,"oz":0.02},{"t":"doodle-disc","x":11,"z":6,"v":1,"rot":0,"ox":0.13,"oz":-0.08},{"t":"doodle-disc","x":10,"z":10,"v":0,"rot":0,"ox":-0.12,"oz":-0.03},{"t":"doodle-disc","x":4,"z":6,"v":0,"rot":0,"ox":0.1,"oz":-0.11},{"t":"candlestick-dais","x":7,"z":9,"v":0,"rot":0,"ox":0,"oz":0,"side":-1,"axis":"z","gapX":8,"gapZ":9},{"t":"candlestick-dais","x":9,"z":9,"v":0,"rot":0,"ox":0,"oz":0,"side":1,"axis":"z","gapX":8,"gapZ":9},{"t":"orb-cluster-crest","x":9,"z":7,"v":1,"rot":0,"ox":0,"oz":0},{"t":"doodle-disc","x":2,"z":2,"v":3,"rot":0,"ox":-0.03,"oz":-0.12},{"t":"doodle-disc","x":6,"z":2,"v":3,"rot":0,"ox":-0.06,"oz":0.06},{"t":"doodle-disc","x":11,"z":2,"v":1,"rot":0,"ox":-0.15,"oz":0.09},{"t":"doodle-disc","x":2,"z":3,"v":4,"rot":0,"ox":-0.09,"oz":-0.12},{"t":"doodle-disc","x":4,"z":3,"v":1,"rot":0,"ox":-0.09,"oz":-0.09},{"t":"doodle-disc","x":5,"z":3,"v":1,"rot":0,"ox":-0.03,"oz":-0.03},{"t":"doodle-disc","x":11,"z":3,"v":0,"rot":0,"ox":0.09,"oz":0.03},{"t":"doodle-disc","x":5,"z":4,"v":4,"rot":0,"ox":0.03,"oz":-0.12},{"t":"doodle-disc","x":6,"z":4,"v":0,"rot":0,"ox":-0.06,"oz":0.09},{"t":"doodle-disc","x":7,"z":4,"v":2,"rot":0,"ox":0,"oz":-0.15},{"t":"doodle-disc","x":11,"z":4,"v":4,"rot":0,"ox":0.03,"oz":-0.06},{"t":"doodle-disc","x":4,"z":5,"v":2,"rot":0,"ox":-0.09,"oz":0.03},{"t":"doodle-disc","x":13,"z":5,"v":4,"rot":0,"ox":-0.09,"oz":0.06},{"t":"mindbloom-doodle-fountain-s","x":2,"z":5,"v":0,"rot":0,"ox":0,"oz":0},{"t":"shrine-small","x":4,"z":9,"v":0,"rot":0,"ox":0,"oz":0},{"t":"smoke-ribbon-pillar","x":6,"z":5,"v":1,"rot":0,"ox":-0.03,"oz":-0.03},{"t":"rock","x":2,"z":7,"v":2,"rot":0,"ox":0.06,"oz":-0.09},{"t":"orb-cluster-crest","x":4,"z":7,"v":0,"rot":0,"ox":-0.08,"oz":0.01},{"t":"rock","x":14,"z":5,"v":0,"rot":0,"ox":0.11,"oz":-0.04},{"t":"smoke-ribbon-pillar","x":6,"z":7,"v":0,"rot":0,"ox":0.07,"oz":0.07},{"t":"orb-cluster-crest","x":5,"z":7,"v":0,"rot":0,"ox":-0.07,"oz":0.03},{"t":"candlestick-dais","x":13,"z":6,"v":0,"rot":0,"ox":0.07,"oz":-0.1},{"t":"rock","x":10,"z":7,"v":1,"rot":0,"ox":0.08,"oz":0.11},{"t":"orb-cluster-crest","x":6,"z":10,"v":1,"rot":0,"ox":0.05,"oz":0.05},{"t":"candlestick-dais","x":7,"z":10,"v":0,"rot":0,"ox":-0.1,"oz":-0.05},{"t":"rock","x":10,"z":5,"v":0,"rot":0,"ox":-0.03,"oz":0.06}],"things":[{"id":"b1","kind":"bonfire","x":12,"z":7,"rot":0},{"id":"c1","kind":"chest","x":11,"z":9,"rot":3,"text":"A crowned thought, folded small, humming periwinkle."},{"id":"w1","kind":"watcher","x":7,"z":2,"size":[2,2],"radius":5.13},{"id":"g1","kind":"gate","x":7,"z":6,"span":"x","blocks":[[7,6]],"open":"watcher:w1","threshold":[[7,7]],"edge":[[7,7],[7,6]]},{"id":"e2","kind":"elevator","x":5,"z":0,"rot":2,"role":"exit"},{"id":"e1","kind":"elevator","x":9,"z":11,"rot":0,"role":"entry"}]} };

export function finish(level, brief, h) {
  if (brief.lens) {
    finishLens(level, brief, h);
    if (level.name === "mindbloom-medium") { h.edgeLifts(); h.pin(PIN[level.name]); }
    return;
  }
  const props = level.palette?.props || {};
  const names = Object.keys(props);
  const P = { props };
  const daisTypes = names.filter((t) => roleOf(P, t) === "dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = names.find((t) => roleOf(P, t) === "threshold");
  const lightT = names.find((t) => roleOf(P, t) === "light" && !/colossal/i.test(t)) || names.find((t) => roleOf(P, t) === "light") || "lantern";
  const bigCandle = names.find((t) => /colossal/i.test(t));
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === bigCandle || d.t === "torch" || d.t === "lantern");
  causeway(level, h);
  let r = h.approach();
  if (r.length < 12) {
    let best = null;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || !h.land(c) || c.s === "ramp" || h.isFig(x, z)) return;
      const q = h.approach({ from: [x, z] });
      const sc = (q.length >= 12 ? 100 - Math.abs(q.length - 15) : q.length) + 0.2 * (x + z);
      if (q.length > r.length && (!best || sc > best[0])) best = [sc, x, z];
    }));
    if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; r = h.approach(); }
  }
  h.log?.push?.(`mindbloom approach ${r.length}`);
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  r = h.approach();
  repaint(level, h, new Set([...r, ...h.figRing()].map(([x, z]) => h.key(x, z))));
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.55 }) : null;
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az + 2], [ax, az + 2], [ax + 1, az + 2], [ax + 2, az + 2], [ax + 2, az + 1], [ax + 2, az]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z && /tree|horn|pillar/i.test(d.t));
  h.removeDecor((d) => /tree|pine|horn|pillar/i.test(d.t) && d.x >= ax - 1 && d.z >= az - 1 && d.x <= ax + 4 && d.z <= az + 4 && (d.x - ax) + (d.z - az) >= 1);
  h.removeDecor((d) => /tree|pine/i.test(d.t) && d.x >= ax - 2 && d.x <= ax + 3 && d.z >= az - 3 && d.z <= az + 3);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => /tree|pillar|horn/i.test(d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 5, avoid: g ? [g] : [], keep: [gateT] });
  if (bigCandle) {
    const ring = h.figRing().filter(([x, z]) => z >= az + 2 || x >= ax + 2);
    for (const [x, z] of ring) if (!r.some(([a, b]) => a === x && b === z) && h.put(bigCandle, x, z)) break;
  }
  h.repair({ keep: [gateT] });
  thin(level, h, [gateT, lightT, bigCandle]);
  rampTone(level, h);
}

export const GROW = { "mindbloom-medium": [{"kind":"plateau","side":"n","at":[8,1],"size":[2,3],"tier":-2,"decor":[{"t":"doodle-disc","u":5,"v":1},{"t":"rock","u":4,"v":-1}]},{"kind":"dock","side":"w","at":[1,6],"len":2,"decor":[{"t":"spotted-neon-cap","u":2}]},{"kind":"dock","side":"s","at":[11,10],"len":2,"decor":[]},{"kind":"walkway","side":"n","at":[13,3],"len":2,"islet":[2,2],"decor":[{"t":"spotted-neon-cap","u":4,"v":1}]}] };
export const outgrow = (level, o) => growOut(level, GROW[level.name], o);
