import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-a.js";
import { placeGeneric } from "./multitile-place-a.js";

const INK = {
  bone: ["#ebe8dc", "#d6d2c4", "#beb9a8"],
  bone2: ["#d6d2c4", "#beb9a8", "#a8a290"],
  mid: ["#a4a095", "#89847a", "#6c665f"],
  dark: ["#6c665f", "#4d4741", "#3a342e"],
  deep: ["#3a342e", "#2d251f", "#1f1914"],
  gold: ["#ebb834", "#d19a17", "#b07e0b"],
  ember: ["#ffb31d", "#ff831d", "#dc5a10"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const sat = (h) => { const c = rgb(h); return Math.max(...c) - Math.min(...c); };
const lum = (h) => { const c = rgb(h); return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };

function tilt(B, x, y, z, rx, ry, rz, fn) {
  B.pushMatrix(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1)));
  fn();
  B.pop();
}

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r * 0.92, 7, 0.3), 0, h * 0.55, pal(lo));
  B.prism(circle(0.03, -0.02, r * 0.84, r * 0.78, 7, 0.1), h * 0.55, h, pal(hi));
}

function claws(B, x, y, z, c) {
  for (const dx of [-0.11, 0, 0.11]) wedge(B, 0.08, 0.1, 0.16, c, x + dx, y, z);
}

function chimera(B, H, K, v, pose = {}) {
  const s = H / 2.45;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.95, 0.22, K.plinthLo, K.plinthHi);
  const y0 = 0.22;
  B.rbox(0.44, 0.56, 0.58, 0.08, pal(K.dark), -0.44, y0, -0.3);
  B.rbox(0.44, 0.56, 0.58, 0.08, pal(K.dark), 0.44, y0, -0.3);
  B.rbox(0.52, 0.84, 0.82, 0.1, pal(K.bone), -0.23, y0 + 0.06, 0.02);
  B.rbox(0.5, 0.84, 0.82, 0.1, pal(K.bone2), 0.24, y0 + 0.06, 0.02);
  for (const [w, y] of [[0.76, 0.16], [0.7, 0.3], [0.6, 0.44], [0.46, 0.58]]) B.box(w, 0.05, 0.06, pal(K.mid), 0, y0 + y, 0.44);
  B.box(0.05, 0.62, 0.05, pal(K.dark), 0.01, y0 + 0.1, 0.45);
  B.rbox(1.14, 0.16, 0.94, 0.12, pal(K.bone), 0, y0 + 0.88, -0.02);
  for (const [x, z] of [[-0.54, 0.32], [0.54, 0.3], [-0.58, -0.2], [0.58, -0.22]]) B.cone(0.08, 0, 0.24, pal(K.bone2), x, y0 + 0.88, z, 4);
  for (const side of [-1, 1]) {
    const x = side * 0.62;
    B.rbox(0.36, 0.4, 0.36, 0.06, pal(K.dark), x, y0, 0.36);
    B.rbox(0.42, 0.42, 0.4, 0.06, pal(K.mid), x, y0 + 0.38, 0.3);
    for (const [dx, dy] of [[-0.1, 0.14], [0.09, 0.26], [-0.05, 0.5], [0.1, 0.62]]) B.cone(0.05, 0, 0.13, pal(K.bone), x + dx, y0 + dy, 0.52, 4);
    B.box(0.42, 0.1, 0.42, pal(K.dark), x, y0, 0.44);
    claws(B, x, y0, 0.7, K.bone);
  }
  const tail = [[-0.62, 0.34, -0.54, 0.26], [-0.72, 0.58, -0.64, 0.23], [-0.78, 0.84, -0.64, 0.2], [-0.8, 1.08, -0.56, 0.18], [-0.78, 1.3, -0.44, 0.16], [-0.74, 1.48, -0.3, 0.14]];
  tail.forEach(([x, y, z, w], i) => B.box(w, 0.24, w, pal(i % 2 ? K.bone2 : K.dark), x, y0 + y, z));
  tilt(B, -0.74, y0 + 1.7, -0.22, 0.8, 0, 0, () => B.cone(0.08, 0, 0.3, pal(K.bone), 0, 0, 0, 4));
  B.rbox(0.5, 0.36, 0.46, 0.08, pal(K.dark), -0.1, y0 + 0.96, 0.08);
  const turn = pose.turn ?? 0.38 + (v % 2) * 0.1;
  for (let i = 0; i < 6; i++) {
    const x = -0.46 + i * 0.17, h = [0.5, 0.72, 0.8, 0.7, 0.56, 0.42][i];
    tilt(B, x, y0 + 1.36, -0.22 + Math.abs(i - 2.5) * 0.04, -0.6, 0, (i - 2.5) * 0.14, () => {
      B.box(0.1, h, 0.28, pal(i % 2 ? K.bone2 : K.bone), 0, 0, 0);
      B.box(0.11, h * 0.4, 0.1, pal(K.dark), 0, h * 0.3, -0.1);
    });
  }
  B.at(0.44, y0 + 1.02, -0.04, turn + 0.6, () => {
    B.rbox(0.26, 0.34, 0.26, 0.05, pal(K.dark), 0, 0, 0);
    B.rbox(0.4, 0.32, 0.42, 0.06, pal(K.dark), 0, 0.32, 0.04);
    wedge(B, 0.32, 0.16, 0.2, K.mid, 0, 0.32, 0.34);
    for (const [x, y] of [[-0.12, 0.54], [0.0, 0.58], [0.12, 0.54], [0.06, 0.44]]) B.box(0.08, 0.08, 0.04, pal(K.accent), x, y, 0.26);
    B.cone(0.07, 0, 0.22, pal(K.bone), -0.12, 0.64, 0, 4);
    B.cone(0.07, 0, 0.26, pal(K.bone), 0.12, 0.64, -0.04, 4);
  });
  B.box(0.16, 0.2, 0.05, pal(K.deep), 0.3, y0 + 0.9, 0.45);
  B.box(0.08, 0.12, 0.04, pal(K.accent), 0.3, y0 + 0.94, 0.47);
  B.at(-0.16, y0 + 1.18, 0.28, turn, () => {
    B.rbox(0.72, 0.36, 0.6, 0.08, pal(K.bone), 0, 0.12, 0);
    B.rbox(0.78, 0.12, 0.52, 0.06, pal(K.bone2), 0.02, 0.48, -0.04);
    for (const [x, z, h] of [[-0.28, 0.12, 0.24], [-0.06, 0.04, 0.3], [0.2, 0, 0.24], [-0.18, -0.18, 0.2]]) B.cone(0.07, 0, h, pal(K.bone2), x, 0.6, z, 4);
    B.box(0.58, 0.22, 0.36, pal(K.bone), -0.02, 0.16, 0.44);
    for (const x of [-0.22, -0.09, 0.04, 0.17]) B.box(0.06, 0.09, 0.05, pal(K.bone), x, 0.08, 0.6);
    B.box(0.52, 0.12, 0.32, pal(K.deep), -0.02, 0.02, 0.44);
    B.box(0.54, 0.1, 0.34, pal(K.bone2), -0.02, -0.1 - (pose.jaw ?? (v % 2 ? 0.04 : 0)), 0.42);
    for (const x of [-0.2, -0.03, 0.14]) B.box(0.06, 0.08 + (pose.jaw || 0), 0.05, pal(K.bone), x, -(pose.jaw || 0), 0.56);
    for (const x of [-0.18, 0.16]) {
      B.box(0.22, 0.14, 0.04, pal(K.deep), x, 0.32, 0.3);
      B.box(0.09, 0.09, 0.03, pal(K.accent), x + 0.03, 0.34, 0.32);
    }
  });
  B.pop();
}

function bonePost(B, H, c0, c1, c2, K, v, d = {}) {
  B.rbox(0.48, 0.24, 0.48, 0.06, pal(K.dark), 0, 0, 0);
  const segs = [[0.34, 0.0], [0.3, 0.05], [0.26, 0.1], [0.22, 0.14]];
  const top = d.side ? H * 0.72 : H - 0.26;
  const hh = (top - 0.24) / segs.length;
  segs.forEach(([w, dz], i) => {
    B.box(w, hh, w, pal(i % 2 ? c1 : c0), 0, 0.24 + i * hh, d.side ? 0 : dz);
    B.box(w + 0.04, 0.05, w + 0.04, pal(K.dark), 0, 0.24 + i * hh + hh - 0.05, d.side ? 0 : dz);
  });
  if (!d.side) { tilt(B, 0, top, 0.26, 0.6, 0, v % 2 ? 0.15 : -0.1, () => B.cone(0.12, 0, 0.32, pal(c2), 0, 0, 0, 4)); return; }
  const lean = (a) => d.axis === "x" ? [-d.side * a, 0] : [0, d.side * a];
  const [rx1, rz1] = lean(0.6), [rx2, rz2] = lean(1.15);
  const L1 = 0.5, off = L1 * Math.sin(0.6), up = L1 * Math.cos(0.6);
  const ox = d.axis === "x" ? 0 : -d.side * off, oz = d.axis === "x" ? -d.side * off : 0;
  tilt(B, 0, top - 0.04, 0, rx1, 0, rz1, () => { B.box(0.2, L1, 0.2, pal(c0), 0, 0, 0); B.box(0.22, 0.05, 0.22, pal(K.dark), 0, L1 * 0.5, 0); });
  tilt(B, ox, top - 0.08 + up, oz, rx2, 0, rz2, () => { B.box(0.15, 0.2, 0.15, pal(c1), 0, 0, 0); B.cone(0.1, 0, 0.26, pal(c1), 0, 0.2, 0, 4); });
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang|pillar/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|mound/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn/i], ["mass", /tree|pine|spire|monolith|rock|cliff|totem|bastion/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

const LENS_KINDS = [
  ["oculus", /oculus|stela|eye/i],
  ["vent", /vent|chimney/i],
  ["node", /ocellus|node|lens/i],
  ["talon", /talon|claw|perch/i],
  ["ribbed", /ribbed|plates|breast/i],
  ["slab", /slab|molt|shell|carapace-slab/i],
  ["qpillar", /quill-pillar|pillar/i],
  ["quills", /quill|needle|spire/i],
  ["tail", /tail|stinger|pinnacle/i],
  ["ridge", /crest|ridge|spine|horn|blade/i],
  ["boulder", /boulder|graphite|scree|rock/i],
];
const lensKind = (t, role) => role === "lead" || role === "creature" ? null : role === "threshold" ? (/oculus|stela|eye/i.test(t) ? "oculus" : /talon|claw|perch/i.test(t) ? "talon" : "ribbed") : (LENS_KINDS.find(([, re]) => re.test(t)) || [null])[0];

function beamAcross(B, d, y, th, c, w = 0.2) {
  if (!d.side) return;
  const reach = 1.0;
  if (d.axis === "x") B.box(w, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05));
  else B.box(reach + 0.3, th, w, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
}

function hatch(B, w, y, z, c, n = 4) {
  for (let i = 0; i < n; i++) B.box(0.03, 0.02, w, pal(c), -w / 2 + (i + 0.5) * (w / n), y, z);
}

const LENS_BUILD = {
  quills(B, H, v, { c0, c1, K }) {
    B.prism(circle(0, 0, 0.4, 0.36, 6, 0.2), 0, 0.14, pal(K.dark));
    B.prism(circle(0.02, 0, 0.3, 0.28, 6, 0.5), 0.14, 0.24, pal(c1));
    const q = v % 2 ? [[0, 0, 1, 0.1, 0.1], [-0.2, 0.14, 0.72, -0.25, 0.1], [0.2, -0.12, 0.66, 0.2, -0.2], [0.16, 0.18, 0.5, 0.3, 0.3], [-0.18, -0.16, 0.56, -0.2, -0.3]] : [[0.04, -0.02, 1, -0.1, 0.12], [-0.2, -0.14, 0.7, -0.3, -0.2], [0.22, 0.1, 0.74, 0.3, 0.14], [-0.12, 0.2, 0.52, -0.1, 0.35], [0.18, -0.2, 0.46, 0.25, -0.3]];
    for (const [x, z, k, rz, rx] of q) tilt(B, x, 0.22, z, rx, 0, rz, () => { B.cone(0.1, 0, (H - 0.2) * k, pal(c0), 0, 0, 0, 4); B.cone(0.06, 0, (H - 0.2) * k * 0.6, pal(K.dark), 0.03, 0, 0.03, 4); });
  },
  qpillar(B, H, v, { c0, c1, K }) {
    B.rbox(0.6, 0.22, 0.6, 0.06, pal(K.dark), 0, 0, 0);
    const top = H - 0.35;
    B.prism(circle(0, 0, 0.26, 0.26, 6, 0.3), 0.22, top, pal(K.mid));
    for (let i = 0; i < 4; i++) B.prism(circle(0, 0, 0.29, 0.29, 6, 0.3), 0.3 + i * (top - 0.3) / 4, 0.36 + i * (top - 0.3) / 4, pal(K.dark));
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39 + v, y = 0.4 + (i / 14) * (top - 0.5);
      tilt(B, Math.sin(a) * 0.24, y, Math.cos(a) * 0.24, Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1, () => B.cone(0.07, 0, 0.3, pal(i % 3 ? c0 : c1), 0, 0, 0, 4));
    }
    B.cone(0.24, 0, 0.35, pal(c0), 0, top, 0, 6);
  },
  ribbed(B, H, v, { c0, c1, K, d }) {
    B.rbox(0.56, 0.18, 0.5, 0.06, pal(K.dark), 0, 0, 0);
    const n = 5, top = d.side ? H * 0.8 : H;
    const hh = (top - 0.18) / n;
    for (let i = 0; i < n; i++) {
      const w = 0.54 - i * 0.05;
      B.rbox(w, hh * 0.72, 0.42 - i * 0.03, 0.12, pal(i % 2 ? c1 : c0), 0, 0.18 + i * hh, 0);
      B.box(w + 0.04, hh * 0.28, 0.46 - i * 0.03, pal(K.dark), 0, 0.18 + i * hh + hh * 0.72, 0);
    }
    B.cone(0.12, 0, 0.26, pal(c0), 0, top, 0, 4);
    if (d.side) {
      beamAcross(B, d, top - 0.34, 0.14, c0, 0.34);
      beamAcross(B, d, top - 0.2, 0.08, K.dark, 0.3);
      beamAcross(B, d, top - 0.12, 0.12, c1, 0.26);
    }
  },
  talon(B, H, v, { c0, c1, K, d }) {
    const top = d.side ? H * 0.78 : H * 0.6;
    B.prism(circle(0, 0, 0.42, 0.38, 5, 0.4), 0, top * 0.55, pal(K.deep));
    B.prism(circle(0.03, 0.02, 0.34, 0.3, 5, 0.9), top * 0.55, top, pal(K.dark));
    for (const [i, z] of [[0, -0.14], [1, 0], [2, 0.14]]) tilt(B, 0.1, top - 0.05, z + 0.04, 0, 0, -0.9 - i * 0.1, () => { B.box(0.09, 0.3, 0.09, pal(c0), 0, 0, 0); tilt(B, 0, 0.28, 0, 0, 0, -0.8, () => B.cone(0.06, 0, 0.26, pal(c1), 0, 0, 0, 4)); });
    for (let i = 0; i < 3; i++) B.box(0.44, 0.03, 0.04, pal(K.deep), 0, top * (0.3 + i * 0.2), 0.36);
    if (d.side) { beamAcross(B, d, top, 0.16, K.dark, 0.3); beamAcross(B, d, top + 0.16, 0.1, c0, 0.22); }
  },
  oculus(B, H, v, { c0, c1, K, d, gold }) {
    const top = d.side ? H * 0.85 : H;
    B.rbox(0.62, 0.2, 0.46, 0.06, pal(K.dark), 0, 0, 0);
    B.box(0.46, top - 0.2, 0.3, pal(K.deep), 0, 0.2, 0);
    B.box(0.5, 0.08, 0.34, pal(K.dark), 0, top - 0.3, 0);
    for (const s of [-1, 1]) tilt(B, s * 0.26, 0.3, 0, 0, 0, s * 0.25, () => B.box(0.1, top * 0.7, 0.34, pal(c0), 0, 0, 0));
    const ey = top * 0.55;
    for (const z of [0.16, -0.16]) {
      B.rbox(0.3, 0.46, 0.04, 0.1, pal(c1), 0, ey - 0.23, z);
      B.box(0.12, 0.38, 0.05, pal(gold), 0, ey - 0.19, z);
      B.box(0.04, 0.3, 0.06, pal(K.deep), 0, ey - 0.15, z);
    }
    B.cone(0.2, 0, 0.3, pal(c0), 0, top - 0.22, 0, 4);
    if (d.side) { beamAcross(B, d, top - 0.3, 0.16, K.deep, 0.32); beamAcross(B, d, top - 0.14, 0.1, c0, 0.26); }
  },
  vent(B, H, v, { c0, K, glow }) {
    B.prism(circle(0, 0, 0.42, 0.42, 7, 0.2), 0, 0.2, pal(K.dark));
    B.prism(circle(0, 0, 0.34, 0.34, 7, 0.5), 0.2, H * 0.5, pal(K.deep));
    B.prism(circle(0, 0, 0.3, 0.3, 7, 0.2), H * 0.5, H * 0.6, pal(c0));
    B.prism(circle(0, 0, 0.3, 0.3, 7, 0.2), H * 0.6, H * 0.72, pal(K.deep));
    B.ball(0.2, pal(glow), 0, H * 0.78, 0, 1, 1);
    B.box(0.05, 0.26, 0.05, pal(K.deep), 0, H * 0.66, 0.19);
    for (const s of [-1, 1]) tilt(B, s * 0.28, H * 0.62, 0, 0, 0, -s * 0.5, () => B.cone(0.08, 0, 0.3, pal(c0), 0, 0, 0, 4));
    for (let i = 0; i < 3; i++) B.box(0.06, 0.06, 0.06, pal(glow), (i - 1) * 0.12, H * 0.3 + i * 0.05, 0.33);
  },
  node(B, H, v, { c0, c1, K, glow }) {
    B.prism(circle(0, 0, 0.4, 0.34, 6, 0.3), 0, H * 0.4, pal(K.dark));
    B.prism(circle(0, 0, 0.34, 0.3, 6, 0.3), H * 0.4, H * 0.62, pal(c0));
    for (const x of [-0.13, 0.13]) { B.ball(0.12, pal(K.deep), x, H * 0.66, 0.1, 1, 1); B.ball(0.08, pal(glow), x, H * 0.7, 0.16, 1, 1); }
    B.cone(0.08, 0, 0.2, pal(c1), 0, H * 0.62, -0.14, 4);
  },
  slab(B, H, v, { c0, c1, K }) {
    const pts = v % 2 ? [[-0.4, -0.3], [0.1, -0.42], [0.42, -0.1], [0.3, 0.36], [-0.3, 0.4]] : [[-0.42, -0.1], [-0.1, -0.4], [0.4, -0.3], [0.38, 0.3], [-0.2, 0.42]];
    B.prism(pts, 0, 0.08, pal(K.dark));
    B.prism(pts.map(([x, z]) => [x * 0.9, z * 0.9]), 0.08, 0.16, pal(c0));
    B.box(0.04, 0.02, 0.6, pal(K.deep), 0.02, 0.16, 0);
    hatch(B, 0.5, 0.165, 0.16, c1, 5);
  },
  tail(B, H, v, { c0, c1, K }) {
    B.rbox(0.5, 0.16, 0.5, 0.06, pal(K.dark), 0, 0, 0);
    const n = 9, s = v % 2 ? 1 : -1, top = H - 0.3;
    let px = 0, py = 0.16;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = t * 3.4;
      const x = s * (-0.2 + Math.sin(a * 0.5) * 0.38), y = 0.16 + (1 - Math.cos(Math.min(a, 2.6) * 0.62)) / (1 - Math.cos(1.61)) * (top - 0.3), w = 0.14 - t * 0.07;
      B.box(w * 2, Math.max(0.12, y - py + 0.06), w * 1.6, pal(i % 2 ? K.dark : c0), x, i ? py : y, 0);
      B.box(w * 2.3, 0.04, 0.06, pal(c1), x, y + 0.08, w * 0.8);
      px = x; py = y;
    }
    for (const k of [-1, 1]) tilt(B, px, py + 0.1, k * 0.05, k * 0.6, 0, s * 0.9, () => B.cone(0.06, 0, 0.28, pal(c0), 0, 0, 0, 4));
  },
  ridge(B, H, v, { c0, c1, K }) {
    B.rbox(0.62, 0.3, 0.5, 0.06, pal(K.dark), 0, 0, 0);
    B.box(0.5, 0.12, 0.4, pal(c1), 0, 0.3, 0);
    const bl = v % 2 ? [[-0.16, 1, 0.1], [0.06, 0.8, 0.0], [0.22, 0.55, -0.1]] : [[-0.18, 0.7, -0.08], [0.02, 1, 0.04], [0.2, 0.62, 0.12]];
    for (const [x, k, z] of bl) tilt(B, x, 0.4, z, -0.45, 0, -0.1, () => {
      const L = (H - 0.4) * k;
      B.box(0.1, L, 0.3, pal(c0), 0, 0, 0);
      B.box(0.11, L * 0.45, 0.12, pal(K.deep), 0, L * 0.3, -0.12);
      for (let i = 1; i < 4; i++) B.box(0.12, 0.03, 0.32, pal(K.mid), 0, L * i / 4, 0);
      B.cone(0.08, 0, 0.2, pal(c0), 0, L, 0.08, 4);
    });
  },
  boulder(B, H, v, { c0, c1, K }) {
    B.prism(circle(0, 0, 0.44, 0.38, 5, v * 0.7), 0, H * 0.5, pal(K.deep));
    B.prism(circle(0.06, -0.04, 0.3, 0.28, 5, 0.3 + v), H * 0.5, H * 0.82, pal(K.dark));
    B.prism(circle(-0.2, 0.2, 0.2, 0.18, 4, 0.2), 0, H * 0.34, pal(K.mid));
    B.box(0.2, 0.03, 0.03, pal(c0), 0.08, H * 0.82, 0.12);
    hatch(B, 0.3, H * 0.5 + 0.005, 0.3, K.mid, 4);
  },
};

const poseOf = (p = "") => /snarl|wrench|crank|left/i.test(p) ? { turn: -0.55, jaw: 0.12 } : {};

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const leadT = types.find((t) => roleOf(P, t) === "lead");
  const lt = leadT ? tonesOf(P, leadT) : [];
  const accent = lt.filter((c) => sat(c[0]) > 0.35).sort((a, b) => sat(b[0]) - sat(a[0]))[0] || INK.gold;
  const bones = lt.filter((c) => sat(c[0]) < 0.25).sort((a, b) => lum(b[0]) - lum(a[0]));
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const K = {
    bone: bones[0] || INK.bone,
    bone2: bones[1] || INK.bone2,
    mid: INK.mid,
    dark: INK.dark,
    deep: INK.deep,
    accent,
    plinthLo: pick(dt, 1, INK.mid),
    plinthHi: pick(dt, 0, INK.bone2),
  };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const lens = P.props[t]?.summary ? lensKind(t, role) : null;
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" || role === "threshold" ? false : !!p.passable, variants: 2, height: role === "lead" ? Math.min(3, Math.max(2.4, p.height || 2.5)) : role === "threshold" && lens ? Math.max(1.7, Math.min(2.4, p.height || 1)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, INK.bone), c1 = pick(tn, 1, INK.bone2), c2 = pick(tn, 2, INK.mid);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead" || role === "creature") chimera(B, H, K, v, poseOf(p.pose));
      else if (lens && LENS_BUILD[lens]) LENS_BUILD[lens](B, H, v, { c0, c1, c2, d, K, gold: K.accent, glow: INK.ember });
      else if (role === "threshold") {
        bonePost(B, H, c0, c1, c2, K, v, d);
      } else if (role === "dais") {
        plinth(B, 0.42, H, c1, c0);
      } else if (role === "light") {
        B.box(0.26, 0.14, 0.26, pal(K.dark));
        B.box(0.12, H - 0.5, 0.12, pal(c0), 0, 0.14, 0);
        B.box(0.28, 0.06, 0.28, pal(K.dark), 0, H - 0.4, 0);
        B.box(0.2, 0.22, 0.2, pal(INK.ember), 0, H - 0.34, 0);
        B.cone(0.2, 0, 0.14, pal(c1), 0, H - 0.12, 0, 4);
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(K.accent), -0.04, H * 0.55, 0.02);
      } else if (role === "mass") {
        B.rbox(0.66, 0.34, 0.66, 0.08, pal(K.dark), 0, 0, 0);
        const segs = v % 2 ? [0.54, 0.4, 0.28] : [0.5, 0.38, 0.26];
        const hh = (H - 0.7) / segs.length;
        segs.forEach((w, i) => wedge(B, w, hh, w, [c0, c1, c0][i], (i % 2 ? 0.04 : -0.03), 0.34 + i * hh, (i % 2 ? -0.03 : 0.03)));
        segs.forEach((w, i) => B.box(w * 0.9, hh * 0.5, w * 0.5, pal(i % 2 ? c0 : c1), (i % 2 ? 0.04 : -0.03), 0.34 + i * hh, -w * 0.2));
        tilt(B, 0, H - 0.4, -0.02, 0.25 * (v % 2 ? 1 : -1), 0, 0.15, () => B.cone(0.13, 0, 0.42, pal(c0), 0, 0, 0, 4));
      } else {
        B.rbox(0.8, 0.14, 0.8, 0.08, pal(K.dark));
        B.rbox(0.62, 0.12, 0.62, 0.06, pal(c0), 0, 0.14, 0);
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + v;
          B.cone(0.06, 0, 0.2, pal(c1), Math.cos(a) * 0.26, 0.26, Math.sin(a) * 0.26, 4);
        }
        B.box(0.16, 0.12, 0.16, pal(INK.ember), 0, 0.26, 0);
      }
      return mesh(B);
    };
  }
  catalog["ink-hatch"] = { footprint: [1, 1], passable: true, variants: 2, height: 0.1 };
  builders["ink-hatch"] = (v) => {
    const B = new Baker();
    B.at(0, 0, 0, v % 2 ? 0.5 : -0.4, () => {
      for (let i = 0; i < 5; i++) B.box(0.05, 0.02, 0.62 - Math.abs(i - 2) * 0.12, pal(K.deep), -0.24 + i * 0.12, 0, 0);
      for (let i = 0; i < 4; i++) B.box(0.5 - Math.abs(i - 1.5) * 0.12, 0.03, 0.04, pal(K.dark), 0, 0.01, -0.18 + i * 0.12);
    });
    return mesh(B);
  };
  return { catalog, builders };
}

const K2 = (x, z) => `${x},${z}`;

function moveSpawn(level, h) {
  const fc = h.figure.cells, cx = fc.reduce((a, c) => a + c[0], 0) / fc.length, cz = fc.reduce((a, c) => a + c[1], 0) / fc.length;
  let best = null, bs = -1;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length) continue;
    if (!h.route(level.spawn, [x, z])) continue;
    const sc = Math.max(Math.abs(x - cx), Math.abs(z - cz)) + 0.6 * (x - cx + z - cz);
    if (sc > bs) { bs = sc; best = [x, z]; }
  }
  if (best) level.spawn = best;
}

function repaint(level, h, route, gate) {
  const keep = new Set();
  for (const [x, z] of route) keep.add(K2(x, z));
  for (const [x, z] of h.figure.cells) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) keep.add(K2(x + dx, z + dz));
  if (gate) for (const g of [].concat(gate)) if (g && g.x !== undefined) keep.add(K2(g.x, g.z));
  const low = h.surf.ground === "stone" ? "grass" : h.surf.ground;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "stone" && !keep.has(K2(x, z))) c.s = c.h >= 2 ? "grass" : low;
  }
}

function placeGate(h, t, r) {
  const want = Math.round((r.length - 1) * 0.55);
  const open = ([x, z], R) => {
    const c = h.cell(x, z);
    if (!c || c.s === "ramp") return false;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const n = h.cell(x + dx, z + dz), near = Math.abs(dx) <= 1 && Math.abs(dz) <= 1;
      if (near && (!n || n.s === "none" || n.s === "ramp" || h.isFig(x + dx, z + dz))) return false;
      if (n && n.h > c.h && dx + dz <= 1) return false;
    }
    return true;
  };
  for (const R of [2, 1]) {
    const order = r.map((c, i) => [c, i]).filter(([c, i]) => i > 1 && i < r.length - 2 && open(c, R)).sort((a, b) => Math.abs(a[1] - want) - Math.abs(b[1] - want));
    for (const [at] of order) { const g = h.gate(t, { route: r, at }); if (g) return g; }
  }
  return h.gate(t, { route: r, frac: 0.55 });
}

function dropRimWater(h) {
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "water" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; })) h.set(x, z, { h: 0, s: "none" });
  }
}

function flattenStubs(h) {
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || c.h < 2) continue;
    const ns = N.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) || n?.s === "ramp");
    if (ns.some((n) => n.h >= c.h)) continue;
    const lo = Math.max(1, ...ns.filter((n) => n.s !== "ramp").map((n) => n.h));
    const before = h.reach().missing.length, old = { ...c };
    c.h = lo;
    if (h.reach().missing.length > before) h.set(x, z, old);
  }
}

function widenStairs(h, route, level, gateT) {
  const posts = level.decor.filter((d) => d.t === gateT);
  const nearPost = (x, z) => posts.some((d) => Math.abs(d.x - x) <= 1 && Math.abs(d.z - z) <= 1);
  const onRoute = new Set(route.map(([x, z]) => K2(x, z)));
  const seeds = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (c?.s === "ramp" && onRoute.has(K2(x, z))) seeds.push([x, z, c]); }
  for (const [x, z, c] of seeds) {
    const [dx, dz] = h.DIRS[c.d], px = dz ? 1 : 0, pz = dx ? 1 : 0;
    for (const sgn of [-1, 1]) for (let k = 1; k <= 3; k++) {
      const X = x + sgn * px * k, Z = z + sgn * pz * k, n = h.cell(X, Z), hi = h.cell(X - dx, Z - dz), lo = h.cell(X + dx, Z + dz);
      if (!h.land(n) || n.s === "ramp" || n.h !== c.h - 1 || !h.land(hi) || hi.s === "ramp" || hi.h !== c.h || !h.land(lo) || lo.h !== c.h - 1 || h.isFig(X, Z) || nearPost(X, Z)) break;
      const before = h.reach().missing.length, old = { ...n }, dec = h.decorAt(X, Z).map((d) => ({ ...d }));
      h.stairs(X, Z, c.d, { h: c.h });
      if (h.reach().missing.length > before) { h.set(X, Z, old); for (const d of dec) h.put(d.t, d.x, d.z, d); break; }
    }
  }
}

function pathRamps(h, route, level, gateT) {
  const posts = level.decor.filter((d) => d.t === gateT);
  const m = ["sand", "grass", "dirt"].includes(h.surf.path) ? h.surf.path : null;
  if (!m) return;
  const seen = new Set();
  const grow = (x, z) => {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp" || seen.has(K2(x, z)) || posts.some((d) => Math.abs(d.x - x) <= 2 && Math.abs(d.z - z) <= 2)) return;
    seen.add(K2(x, z));
    c.m = m;
    const [dx, dz] = h.DIRS[c.d];
    grow(x + dz, z + dx); grow(x - dz, z - dx);
  };
  for (const [x, z] of route) grow(x, z);
}

const LOOK = {
  medium: {
    sand: { top: "#e8e3d2", lip: "#c9c2ad", edge: "#a39c88", dots: "#f4f1e6" },
    dirt: { top: "#6a635b", patch: "#57514a", mottle: "#4a443e", border: "#3a352f", path: "#77706a" },
    stone: { top: "#cfcabb", pebble: "#e8e4d8", pebbleShade: "#a9a393", rim: "#8a8476" },
    cliffUpper: { left: "#4a433e", right: "#35302c", seam: "#221e1b" },
    cliffLower: { left: "#38322e", right: "#29241f", seam: "#1a1714", speck: "#e8e3d2" },
    rock: ["#7a736a", "#5c554e", "#443e38", "#2e2925"],
    bg: "#1d1c1a",
  },
  subject: {
    grass: { top: "#8e8a4a", fringe: "#6f6b36", fringeDark: "#524f26", speck: "#b3ad62" },
    sand: { top: "#e0b243", lip: "#bf8f2a", edge: "#9c721c", dots: "#f0cf6e" },
    stone: { top: "#cfc9b8", pebble: "#e6e1d2", pebbleShade: "#a8a191", rim: "#857e70" },
    cliffUpper: { left: "#6b4a3a", right: "#523628", seam: "#3b261c" },
    cliffLower: { left: "#4a3129", right: "#36221c", seam: "#261712", speck: "#e0b243" },
    bg: "#1e1715",
  },
  composition: {
    dirt: { top: "#6e6159", patch: "#695d55", mottle: "#675b53", border: "#3e3530", path: "#8a7d72" },
    sand: { top: "#e2c68c", lip: "#c4a468", edge: "#a2834c", dots: "#f0dcae" },
    stone: { top: "#e4e0d2", pebble: "#f3f0e6", pebbleShade: "#bdb7a6", rim: "#968f80" },
    cliffUpper: { left: "#7a6457", right: "#5c4a3f", seam: "#43352c" },
    cliffLower: { left: "#524339", right: "#3d3029", seam: "#2a201b", speck: "#9b8a7b" },
    rock: ["#8c7f74", "#6e6259", "#554a43", "#3c332e"],
    bg: "#3b2e52",
  },
};

function lensLook(level, lens) {
  const L = LOOK[lens];
  if (!L) return;
  for (const [k, v] of Object.entries(L)) if (Array.isArray(v)) level.palette[k] = v; else if (k === "bg") level.bg = level.palette.bg = v; else level.palette[k] = { ...(level.palette[k] || {}), ...v };
}

function levelRamps(h) {
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = h.cell(x - dx, z - dz), dn = h.cell(x + dx, z + dz);
    if (h.land(up) && up.s !== "ramp" && up.h === c.h && h.land(dn) && dn.h === c.h - 1) continue;
    h.set(x, z, { h: c.h, s: c.m && c.m !== "stone" ? c.m : h.surf.ground });
    n++;
  }
  h.log.push(`levelRamps ${n}`);
}

function frontSpawn(level, h, lo, hi) {
  let best = null;
  const blocked = h.blockedSet();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || blocked.has(h.key(x, z))) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; })) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo || q.length > hi) continue;
    const sc = z * 2 + x * 0.5 + q.length * 0.2;
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; h.log.push(`frontSpawn ${level.spawn}`); }
  return h.approach();
}

function swell(level, h) {
  const fc = h.figure.cells, cx = fc.reduce((a, c) => a + c[0], 0) / fc.length, cz = fc.reduce((a, c) => a + c[1], 0) / fc.length;
  const snap = level.cells.map((row) => row.map((c) => ({ ...c }))), dsnap = level.decor.slice(), w0 = h.walkN();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c)) continue;
    const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
    const t = d <= 1.6 ? 3 : d <= 3.6 ? 2 : 1;
    if (t > c.h || c.s === "ramp") { level.cells[z][x] = { h: Math.max(t, c.h), s: t >= 3 ? "sand" : t === 2 ? "sand" : c.s === "ramp" ? h.surf.ground : c.s }; if (!h.isFig(x, z)) h.clear(x, z); }
  }
  for (let guard = 0; guard < 12; guard++) {
    const base = h.walkN();
    let best = null;
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
      const c = h.cell(x, z);
      if (!h.land(c) || c.s === "ramp" || c.h < 2 || h.isFig(x, z)) continue;
      for (const d of Object.keys(h.DIRS)) {
        const [dx, dz] = h.DIRS[d], dn = h.cell(x + dx, z + dz), up = h.cell(x - dx, z - dz);
        if (!h.land(dn) || dn.s === "ramp" || dn.h !== c.h - 1 || !h.land(up) || up.s === "ramp" || up.h !== c.h) continue;
        if ([[dz, dx], [-dz, -dx]].some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp")) continue;
        const old = { ...c }, dec = h.decorAt(x, z).map((e) => ({ ...e }));
        h.stairs(x, z, d, { h: c.h, m: "sand" });
        const g = h.walkN() - base;
        h.set(x, z, old); for (const e of dec) level.decor.push(e);
        if (g > 0 && (!best || g > best[0])) best = [g, x, z, d];
      }
    }
    if (!best) break;
    h.stairs(best[1], best[2], best[3], { m: "sand" });
  }
  const r = h.approach();
  if (r.length) h.path(r);
  const w1 = h.walkN(), r1 = h.approach().length;
  if (w1 < Math.min(w0, 84) - 6 || !r1) {
    snap.forEach((row, z) => row.forEach((c, x) => { level.cells[z][x] = c; }));
    level.decor.length = 0; level.decor.push(...dsnap);
    h.log.push(`swell reverted walk ${w1} of ${w0}, route ${r1}`);
  } else h.log.push(`swell walk ${h.walkN()}`);
}

function crest(level, h, t, n = 5) {
  if (!t) return;
  const [ax, az] = h.figure.anchor;
  const cand = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || x + z > ax + az) continue;
    const d = Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5));
    if (d < 1.4 || d > 3.2 || [h.cell(x + 1, z), h.cell(x, z + 1)].some((q) => h.land(q) && q.h > c.h)) continue;
    cand.push([d + (c.h < 2 ? 3 : 0), x, z]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  let k = 0;
  for (const [, x, z] of cand) {
    if (k >= n) break;
    const m0 = h.reach().missing.length;
    if (!h.put(t, x, z, { v: k % 2 })) continue;
    if (h.reach().missing.length > m0) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    k++;
  }
  h.log.push(`crest ${t} x${k}`);
}

function finishLens(level, brief, h) {
  const lens = brief.concept?.lens || (typeof brief.lens === "string" ? brief.lens : "");
  lensLook(level, lens);
  h.dryRim();
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = brief.threshold?.prop && level.palette?.props?.[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const passT = h.passes().filter((t) => t !== gateT && !daisTypes.includes(t));
  h.removeDecor((d) => d.t === gateT || passT.includes(d.t) || d.t === "lantern");
  if (lens === "composition") swell(level, h);
  const slabT = Object.keys(level.palette.props || {}).find((t) => /slab/i.test(t));
  if (slabT) h.removeDecor((d) => d.t === slabT);
  let r = lens === "subject" ? frontSpawn(level, h, 9, 18) : h.spawnAt({ min: 10, max: 17 });
  if (r.length) h.path(r);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: lens === "composition" ? 0.7 : 0.55 }) : null;
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1], [ax, az + 2], [ax + 1, az + 2]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t !== gateT && !CATALOG_PASS(level, d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  h.along(passT.filter((t) => t !== slabT), { route: r });
  if (slabT) {
    let n = 0;
    r.forEach(([x, z], i) => { if (i % 2 === 0 && n < 7 && i < r.length - 2 && h.cell(x, z)?.s !== "ramp" && !h.decorAt(x, z).length && h.put(slabT, x, z, { v: i % 2 ? 1 : 0 })) n++; });
  }
  const glowT = Object.keys(level.palette.props || {}).find((t) => /vent|node/i.test(t));
  if (glowT && lens !== "medium") h.lights(glowT, { route: r, every: 4, skip: 2, max: lens === "subject" ? 4 : 2, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  if (lens === "medium") {
    const onR = new Set(h.approach().map(([x, z]) => h.key(x, z)));
    let k = 0;
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
      const c = h.cell(x, z);
      if (k >= 16 || !h.land(c) || c.s !== "sand" || onR.has(h.key(x, z)) || h.isFig(x, z) || h.decorAt(x, z).length || (x * 5 + z * 3) % 4) continue;
      if (h.put("ink-hatch", x, z, { v: (x + z) % 2 })) k++;
    }
    h.log.push(`ink-hatch x${k}`);
  }
  if (lens === "composition") {
    h.removeDecor((d) => /ridge/i.test(d.t) && (h.cell(d.x, d.z)?.h || 1) < 2);
    const nodeT = Object.keys(level.palette.props || {}).find((t) => /node/i.test(t));
    let k = 0;
    if (nodeT) h.removeDecor((d) => d.t === nodeT && ++k > 3);
    crest(level, h, Object.keys(level.palette.props || {}).find((t) => /ridge/i.test(t)), 5);
  }
  h.ledges({ keep: [gateT] });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.thin(84, { keep: [gateT] });
  if (h.walkN() < 84) h.grow(84);
  levelRamps(h);
  h.repair({ keep: [gateT] });
  if (h.walkN() < 84) h.grow(84);
  h.rampTone();
  if (level.name === "chimera-medium") placeLandmark(level, h, "chimera-ink-monolith");
  if (level.name === "chimera-medium") placeGeneric(level, h, "watchtower", { near: 2, span: 0.6 });
}

const CATALOG_PASS = (level, t) => !!level.palette?.props?.[t]?.passable && !/perch|oculus|ribbed/i.test(t);

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  const daisTypes = h.ofRole("dais").filter((t) => !level.palette?.props?.[t]?.passable || (level.palette.props[t].footprint || [1, 1])[0] > 1);
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  let r = h.approach();
  if (r.length < 10) { moveSpawn(level, h); r = h.approach(); }
  if (r.length) h.path(r);
  r = h.approach();
  const g = gateT ? placeGate(h, gateT, r) : null;
  widenStairs(h, r, level, gateT);
  pathRamps(h, r, level, gateT);
  dropRimWater(h);
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  repaint(level, h, r, g);
  flattenStubs(h);
  h.repair({ keep: [gateT] });
}
