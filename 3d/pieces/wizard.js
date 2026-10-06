import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-a.js";
import { placeGeneric } from "./multitile-place-a.js";
import { reachability } from "../../core/procgen.js";
import { CATALOG } from "../../core/catalog.js";
import { canStep, DIRS } from "../../core/level.js";

const ART = {
  robe: ["#2a4fb8", "#1f3d96", "#162c70"],
  robeDark: ["#1a2f72", "#142558", "#0e1a40"],
  lining: ["#10183a", "#0c1230", "#080c22"],
  skin: ["#e0765a", "#c8624a", "#a24c39"],
  skinLight: ["#f39a7e", "#dc8166", "#b9644e"],
  collar: ["#fffdf6", "#e9e6de", "#c9c6bf"],
  star: ["#fff08a", "#f2d95e", "#d0b640"],
  flame: ["#6fe3ff", "#3cc4f0", "#1f97c8"],
  flameCore: ["#e8fbff", "#bdf2ff", "#8fdcf2"],
  staff: ["#b8603f", "#9a4c31", "#7a3a25"],
  ink: ["#1b1420", "#150f19", "#0e0a12"],
  gold: ["#ffc94a", "#eaa92a", "#c4861b"],
  stone: ["#d9d4e6", "#b9b3cc", "#958fab"],
  wood: ["#b8703a", "#96562a", "#733f1d"],
  teal: ["#2fae9c", "#23907f", "#186e61"],
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

function plinth(B, r, h, lo, hi, trim) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
  if (trim) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    B.at(Math.sin(a) * r * 0.93, h * 0.12, Math.cos(a) * r * 0.93, a, () => B.box(0.14, 0.14, 0.06, pal(trim)));
  }
}

function flame(B, x, y, z, k = 1) {
  B.cone(0.13 * k, 0, 0.34 * k, pal(ART.flame), x, y, z, 4);
  B.cone(0.07 * k, 0, 0.22 * k, pal(ART.flameCore), x + 0.02 * k, y + 0.02 * k, z + 0.02 * k, 4);
  B.cone(0.05 * k, 0, 0.16 * k, pal(ART.flame), x - 0.08 * k, y + 0.06 * k, z, 4);
}

function wizard(B, H, look, v, pose = {}, head = null) {
  const s = H / 2.75;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.92, 0.22, look.plinthLo, look.plinthHi, look.trim);
  const y0 = 0.22;
  B.at(0, 0, 0, pose.yaw ?? -0.12, () => {
    B.box(0.12, 0.34, 0.12, pal(ART.skin), -0.14, y0, 0.06);
    B.box(0.12, 0.34, 0.12, pal(ART.skin), 0.14, y0, 0.02);
    B.box(0.16, 0.08, 0.3, pal(ART.skinLight), -0.16, y0, 0.14);
    B.box(0.16, 0.08, 0.3, pal(ART.skinLight), 0.16, y0, 0.1);
    B.rbox(0.36, 1.72, 0.34, 0.12, pal(ART.skin), 0, y0 + 0.3, 0);
    B.box(0.06, 1.2, 0.04, pal(ART.skinLight), 0.1, y0 + 0.5, 0.17);
    B.box(0.34, 0.5, 0.6, pal(ART.robe), -0.26, y0 + 0.18, -0.04);
    B.box(0.34, 0.5, 0.6, pal(ART.robe), 0.26, y0 + 0.18, -0.04);
    B.box(0.86, 0.5, 0.26, pal(ART.robeDark), 0, y0 + 0.18, -0.24);
    B.box(0.3, 0.48, 0.52, pal(ART.robe), -0.24, y0 + 0.68, -0.02);
    B.box(0.3, 0.48, 0.52, pal(ART.robe), 0.24, y0 + 0.68, -0.02);
    B.box(0.76, 0.48, 0.22, pal(ART.robeDark), 0, y0 + 0.68, -0.2);
    B.box(0.66, 0.24, 0.46, pal(ART.robe), 0, y0 + 1.16, -0.06);
    B.box(0.2, 0.24, 0.12, pal(ART.robe), -0.23, y0 + 1.16, 0.2);
    B.box(0.2, 0.24, 0.12, pal(ART.robe), 0.23, y0 + 1.16, 0.2);
    wedge(B, 0.18, 0.44, 0.14, ART.collar, -0.3, y0 + 1.3, 0.02);
    wedge(B, 0.18, 0.44, 0.14, ART.collar, 0.3, y0 + 1.3, 0.02);
    B.box(0.72, 0.4, 0.1, pal(ART.collar), 0, y0 + 1.36, -0.22);
    B.box(0.14, 0.62, 0.08, pal(ART.collar), -0.2, y0 + 0.62, 0.23);
    B.box(0.14, 0.62, 0.08, pal(ART.collar), 0.2, y0 + 0.62, 0.23);
    const stars = [[-0.3, 0.3, 0.27], [-0.2, 0.52, 0.27], [0.3, 0.42, 0.27], [0.22, 0.2, 0.27], [-0.28, 0.86, 0.25], [0.3, 0.98, 0.25], [0.43, 0.34, 0.1], [0.43, 0.56, -0.18], [0.39, 0.84, 0.04], [0.39, 1.0, -0.2], [0.43, 0.2, -0.3], [-0.12, 1.24, 0.26]];
    for (const [x, y, z] of stars) B.box(0.07, 0.07, 0.07, pal(ART.star), x, y0 + y, z);
    B.at(-0.44, y0 + 1.0, 0.04, 0.5, () => {
      B.box(0.28, 0.2, 0.3, pal(ART.robe), 0, 0.06, 0);
      B.box(0.36, 0.34, 0.36, pal(ART.robe), -0.04, -0.3, 0.04);
      B.box(0.24, 0.1, 0.26, pal(ART.lining), -0.04, -0.3, 0.06);
      B.box(0.1, 0.1, 0.44, pal(ART.skin), -0.02, -0.12, 0.38);
      B.box(0.2, 0.05, 0.16, pal(ART.skinLight), -0.02, -0.07, 0.62);
      flame(B, -0.02, pose.lift ?? -0.02, 0.62, pose.flame ?? 1.6);
      if (pose.orb) { B.box(0.3, 0.3, 0.3, pal(ART.flame), -0.02, 0.5, 0.62); B.box(0.16, 0.16, 0.16, pal(ART.flameCore), -0.02, 0.57, 0.8); }
    });
    B.at(0.46, y0 + 0.98, 0.02, -0.2, () => {
      B.box(0.26, 0.24, 0.3, pal(ART.robe), 0, 0.04, 0);
      B.box(0.34, 0.5, 0.34, pal(ART.robe), 0.04, -0.46, 0.02);
      B.box(0.22, 0.1, 0.24, pal(ART.lining), 0.04, -0.46, 0.04);
      B.box(0.14, 0.16, 0.14, pal(ART.skin), 0.12, -0.28, 0.2);
    });
    const sx = 0.6, sz = 0.26;
    if (pose.staff !== false) {
      B.box(0.1, 1.5, 0.1, pal(ART.staff), sx, y0 - 0.02, sz);
      B.box(0.1, 0.26, 0.1, pal(ART.staff), sx - 0.06, y0 + 1.46, sz);
      B.box(0.18, 0.1, 0.1, pal(ART.staff), sx - 0.08, y0 + 1.68, sz);
      B.box(0.1, 0.12, 0.1, pal(ART.staff), sx - 0.18, y0 + 1.6, sz);
    }
    B.box(0.08, 0.06, 0.08, pal(ART.skinLight), sx + 0.03, y0 + 1.2, sz + 0.03);
    const HB = head || B;
    if (head) head.m.copy(B.m);
    HB.at(0, y0 + 1.82, 0, 0.42 + (v % 2) * 0.08, () => {
      const B = HB;
      const t = 0.2;
      B.rbox(0.36, 0.3 + t, 0.34, 0.12, pal(ART.skin), 0, 0, 0);
      B.box(0.06, 0.07, 0.03, pal(ART.ink), -0.08, 0.14, 0.17);
      B.box(0.06, 0.07, 0.03, pal(ART.ink), 0.08, 0.14, 0.17);
      B.box(0.08, 0.04, 0.03, pal(ART.ink), 0.01, 0.02, 0.17);
      B.box(0.06, 0.3, 0.03, pal(ART.skinLight), 0.13, 0.0, 0.16);
      B.push(0, t, 0);
      B.prism(circle(0, 0, 0.64, 0.58, 8, Math.PI / 8), 0.26, 0.34, pal(ART.robe));
      B.prism(circle(0, 0, 0.28, 0.28, 8, Math.PI / 8), 0.34, 0.5, pal(ART.robeDark));
      B.cone(0.26, 0.14, 0.34, pal(ART.robe), 0, 0.5, 0, 8);
      B.at(0.04, 0.84, -0.03, 0, () => {
        B.cone(0.14, 0.05, 0.24, pal(ART.robe), 0, 0, 0, 6);
        B.box(0.26, 0.08, 0.08, pal(ART.robe), 0.12, 0.2, 0);
        B.cone(0.05, 0, 0.14, pal(ART.robe), 0.3, 0.2, 0, 4);
        if (head) {
          const a = B.pos.length / 3;
          flame(B, 0.32, 0.3, 0, 0.55);
          head.flame = [a, B.pos.length / 3];
          head.flameRoot = new THREE.Vector3(0.32, 0.3, 0).applyMatrix4(B.m).toArray();
        }
      });
      B.box(0.12, 0.12, 0.04, pal(ART.star), 0.02, 0.62, 0.22);
      B.pop();
    });
  });
  B.pop();
}

const byName = [
  ["lead", /glizard|wizard|frankfurter|sorcerer(?!y)|combatant/i],
  ["threshold", /gate|arch|torii|portal|marker/i],
  ["basin", /basin(?!_edge)|font/i],
  ["slab", /edge|kerb|curb/i],
  ["light", /lantern|torch|brazier|lamp|beacon/i],
  ["dais", /dais|altar|plinth|pedestal/i],
  ["crag", /crag|spire|rock|cliff/i],
  ["stele", /tablet|stele|monument|obelisk/i],
  ["slab", /slab|rune|glyph|tile/i],
  ["crystal", /crystal|gem|shard/i],
  ["offering", /pot|urn|cauldron|chest|barrel|cache|bowl/i],
  ["mass", /tree|pine|cypress|bush|pillar|totem/i],
];
export const kindOf = (P, t) => {
  const r = P.props?.[t]?.role;
  if (r === "lead") return "lead";
  if (r === "threshold") return "threshold";
  if (r === "creature") return "lead";
  return (byName.find(([k, re]) => (!r || k !== "lead") && re.test(t)) || [r || "detail"])[0];
};

function post(B, H, c0, c1, c2, d, v) {
  B.box(0.46, 0.22, 0.46, pal(c0));
  B.box(0.34, H * 0.36, 0.34, pal(c1), 0, 0.22, 0);
  B.box(0.28, H * 0.3, 0.28, pal(c1), 0, 0.22 + H * 0.36, 0);
  B.box(0.4, 0.12, 0.4, pal(c2), 0, 0.22 + H * 0.66, 0);
  B.box(0.1, 0.1, 0.04, pal(ART.star), 0, 0.22 + H * 0.46, 0.15);
  B.box(0.04, 0.1, 0.1, pal(ART.star), 0.15, 0.22 + H * 0.46, 0);
  const top = 0.34 + H * 0.66;
  B.cone(0.2, 0, 0.34, pal(ART.robe), 0, top, 0, 4);
  B.box(0.1, 0.1, 0.1, pal(ART.star), 0, top + 0.3, 0);
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.24, th, reach + 0.34, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.34, th, 0.24, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.74, 0.16, c2);
    beam(H * 0.74 + 0.22, 0.08, ART.robe);
  }
}

const INDIGO = ["#3a4a8c", "#2b3970", "#1d2750"];
const MUSTARD = ["#ffd23a", "#f0b81e", "#c99212"];
const BUN = ["#f2b35c", "#d99440", "#b0722a"];
const PARCH = ["#fff4d6", "#ecdcb4", "#cdb88c"];

function beamAcross(B, d, y, th, c, w = 0.24) {
  if (!d.side) return;
  const reach = 1.0;
  if (d.axis === "x") B.box(w, th, reach + 0.34, pal(c), 0, y, -d.side * (reach / 2 - 0.05));
  else B.box(reach + 0.34, th, w, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
}

function star(B, y, r, c, x = 0, z = 0) {
  B.box(r * 0.5, 0.12, r * 0.5, pal(c), x, y, z);
  for (let i = 0; i < 5; i++) B.at(x, y, z, (i / 5) * Math.PI * 2, () => B.box(r * 0.3, 0.12, r, pal(c), 0, 0, r * 0.5));
}

function crooked(B, H, c, base) {
  B.box(0.5, 0.18, 0.5, pal(base));
  const segs = [[0.02, 0.0], [-0.06, 0.05], [0.06, -0.03], [-0.04, 0.04], [0.05, 0.0]];
  const hh = (H - 0.6) / segs.length;
  segs.forEach(([x, z], i) => B.box(0.18, hh + 0.02, 0.18, pal(i % 2 ? c : ART.staff), x, 0.18 + i * hh, z));
  const top = 0.18 + segs.length * hh;
  B.box(0.18, 0.26, 0.18, pal(c), 0.05, top, 0);
  B.box(0.46, 0.16, 0.18, pal(c), -0.1, top + 0.24, 0);
  B.box(0.16, 0.26, 0.18, pal(ART.staff), -0.3, top + 0.1, 0);
  B.box(0.1, 0.1, 0.1, pal(ART.star), -0.3, top + 0.02, 0.06);
}

const LENS_KINDS = [
  ["bunGate", /bun|brioche|loaf/i],
  ["starTotem", /star.*totem|star-doodle/i],
  ["runeStele", /rune.*stele|ink.*stele/i],
  ["inkBlade", /brush|flick|ink.*spire|stroke/i],
  ["hatCrest", /hat|crest|cone/i],
  ["staff", /staff|crook|gnarl/i],
  ["vat", /vat|cauldron|barrel/i],
  ["rack", /rack|link|sausage/i],
  ["ember", /cold-fire|ember|brazier|flame/i],
];
const lensKind = (t) => (LENS_KINDS.find(([, re]) => re.test(t)) || [null])[0];

const LENS_BUILD = {
  starTotem(B, H, v, { c0, d }) {
    B.box(0.5, 0.2, 0.5, pal(ART.ink));
    B.box(0.32, H * 0.55, 0.32, pal(ART.robe), 0, 0.2, 0);
    B.box(0.24, H * 0.2, 0.24, pal(ART.robeDark), 0, 0.2 + H * 0.55, 0);
    const y = 0.2 + H * 0.75;
    star(B, y, 0.5, ART.gold);
    star(B, y + 0.14, 0.34, ART.star);
    for (const k of [0.25, 0.45]) B.box(0.08, 0.08, 0.04, pal(ART.star), 0, 0.2 + H * k, 0.17);
    beamAcross(B, d, H * 0.62, 0.16, ART.ink);
    beamAcross(B, d, H * 0.62 + 0.16, 0.06, ART.star, 0.12);
  },
  runeStele(B, H, v, { d }) {
    B.box(0.6, 0.2, 0.44, pal(ART.ink));
    B.box(0.44, H * 0.62, 0.26, pal(ART.ink), 0, 0.2, 0);
    wedge(B, 0.44, H * 0.22, 0.26, ART.ink, 0, 0.2 + H * 0.62, 0);
    for (const [y, w, x] of [[0.3, 0.26, -0.04], [0.45, 0.16, 0.06], [0.6, 0.3, 0]]) B.box(w, 0.06, 0.04, pal(PARCH), x, 0.2 + H * y, 0.13);
    B.box(0.04, H * 0.3, 0.04, pal(PARCH), -0.1, 0.2 + H * 0.3, 0.13);
    beamAcross(B, d, H * 0.7, 0.16, ART.ink);
    beamAcross(B, d, H * 0.7 + 0.16, 0.06, PARCH, 0.12);
  },
  bunGate(B, H, v, { d }) {
    B.box(0.5, 0.18, 0.5, pal(ART.wood));
    const segs = [[0.44, 0.34], [0.5, 0.34], [0.44, 0.34]];
    let y = 0.18;
    for (const [w, h] of segs) { B.rbox(w, h, w, 0.14, pal(BUN), 0, y, 0); y += h; }
    B.rbox(0.36, 0.2, 0.36, 0.14, pal(["#c9803a", "#a8662a", "#86501f"]), 0, y, 0);
    for (const [x, yy, z] of [[0.12, 0.5, 0.25], [-0.1, 0.72, 0.26], [0.26, 0.84, 0.02], [0.02, 1.04, 0.24], [-0.26, 0.36, 0.04]]) B.box(0.07, 0.04, 0.05, pal(PARCH), x, yy, z);
    if (d.side) {
      beamAcross(B, d, y - 0.14, 0.28, ART.skin, 0.28);
      beamAcross(B, d, y + 0.14, 0.06, MUSTARD, 0.1);
    }
  },
  inkBlade(B, H, v, { c0 }) {
    B.rbox(0.62, 0.16, 0.56, 0.1, pal(INDIGO), 0, 0, 0);
    const lean = v % 2 ? -1 : 1;
    const segs = [0.4, 0.34, 0.28, 0.22, 0.16];
    const hh = (H - 0.5) / segs.length;
    segs.forEach((w, i) => B.box(w, hh + 0.01, w * 0.8, pal(i % 2 ? INDIGO : ART.ink), lean * i * i * 0.03, 0.16 + i * hh, 0));
    const tx = lean * 16 * 0.03;
    B.at(tx, 0.16 + segs.length * hh, 0, lean > 0 ? 0 : Math.PI, () => wedge(B, 0.14, 0.34, 0.36, ART.ink, 0, 0, 0));
    B.box(0.06, H * 0.5, 0.04, pal(["#6f86d6", "#5a70bd", "#44579a"]), -0.08, 0.3, 0.17);
  },
  hatCrest(B, H, v) {
    B.prism(circle(0, 0, 0.62, 0.56, 8, Math.PI / 8), 0, 0.14, pal(ART.robe));
    const segs = [0.44, 0.34, 0.26, 0.18, 0.12];
    const hh = (H - 0.5) / segs.length;
    segs.forEach((w, i) => B.box(w, hh + 0.01, w, pal(i % 2 ? ART.robe : ["#4a72e0", "#3a5fc8", "#2a4aa0"]), i * i * 0.025, 0.14 + i * hh, -i * 0.02));
    B.box(0.46, 0.08, 0.46, pal(ART.gold), 0, 0.14 + hh * 0.9, 0);
    const top = 0.14 + segs.length * hh;
    B.box(0.28, 0.1, 0.1, pal(ART.robe), 0.5, top - 0.02, -0.1);
    B.cone(0.06, 0, 0.18, pal(ART.robe), 0.66, top - 0.02, -0.1, 4);
    B.box(0.2, 0.2, 0.05, pal(ART.star), 0, 0.2 + hh * 1.2, 0.2);
    B.box(0.08, 0.08, 0.06, pal(ART.gold), 0, 0.26 + hh * 1.2, 0.22);
  },
  staff(B, H, v, { c0 }) { crooked(B, H, ART.wood, ART.ink); },
  vat(B, H, v) {
    B.cyl(0.36, H * 0.7, pal(ART.wood), 0, 0, 0, 8);
    for (const y of [0.12, H * 0.5]) B.cyl(0.38, 0.07, pal(ART.ink), 0, y, 0, 8);
    B.cyl(0.3, 0.06, pal(MUSTARD), 0, H * 0.7, 0, 8);
    B.rbox(0.24, 0.14, 0.2, 0.08, pal(MUSTARD), 0.06, H * 0.7 + 0.04, 0.02);
    B.box(0.1, H * 0.35, 0.06, pal(MUSTARD), 0.16, H * 0.38, 0.33);
    B.box(0.08, H * 0.22, 0.06, pal(MUSTARD), -0.14, H * 0.5, 0.33);
  },
  rack(B, H, v) {
    B.box(0.5, 0.14, 0.34, pal(ART.ink));
    for (const x of [-0.3, 0.3]) B.box(0.1, H - 0.2, 0.1, pal(ART.wood), x, 0.14, 0);
    B.box(0.8, 0.1, 0.12, pal(ART.wood), 0, H - 0.1, 0);
    for (const [x, n] of [[-0.18, 3], [0.02, 2], [0.2, 3]]) for (let i = 0; i < n; i++) B.rbox(0.13, 0.2, 0.13, 0.06, pal(i % 2 ? ART.skinLight : ART.skin), x, H - 0.34 - i * 0.22, 0.02);
  },
  ember(B, H, v) {
    B.box(0.46, 0.14, 0.46, pal(ART.ink));
    B.box(0.2, H * 0.4, 0.2, pal(INDIGO), 0, 0.14, 0);
    B.cyl(0.3, 0.14, pal(ART.ink), 0, 0.14 + H * 0.4, 0, 8);
    B.cyl(0.24, 0.03, pal(ART.flame), 0, 0.28 + H * 0.4, 0, 8);
    flame(B, 0, 0.4 + H * 0.4, 0, 1.5);
    star(B, 0.16, 0.34, ART.star);
  },
};

function poseOf(text = "") {
  const p = { yaw: -0.3 };
  if (/imaginary staff/i.test(text)) { p.staff = false; p.orb = true; p.yaw = -0.45; }
  if (/slightly west/i.test(text)) { p.flame = 2.1; p.lift = 0.08; }
  if (/levitat/i.test(text)) { p.flame = 1.9; p.lift = 0.18; }
  return p;
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => kindOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ART.stone), plinthHi: pick(dt, 1, ART.gold), trim: ART.star };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = kindOf(P, t);
    const h = role === "lead" ? 2.45 : role === "threshold" ? 2.6 : role === "slab" ? 0.25 : Math.min(2.6, Math.max(0.3, p.height || 1));
    catalog[t] = { footprint: role === "lead" ? [2, 2] : role === "threshold" || role === "dais" ? [1, 1] : p.footprint || [1, 1], passable: role === "lead" || role === "threshold" ? false : role === "slab" ? true : !!p.passable, variants: 2, height: h };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, ART.stone), c1 = pick(tn, 1, ART.wood), c2 = pick(tn, 2, ART.gold);
    const lens = role === "lead" ? null : lensKind(t);
    const pose = poseOf(p.pose || "");
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead" && d.watch) {
        const HB = new Baker(st.light);
        wizard(B, H, look, v, p.pose ? pose : {}, HB);
        const g = new THREE.Group();
        g.add(mesh(B));
        const hm = mesh(HB);
        const rest = -(rot || 0) * (Math.PI / 2) + (p.pose ? pose.yaw ?? -0.12 : -0.12) + 0.42 + (v % 2) * 0.08;
        hm.userData.noMerge = true;
        hm.userData.live = { thing: d.watch, part: "head", rest, limit: 1.5, pivot: [0, 0, 0], flame: HB.flame, flameRoot: HB.flameRoot, hot: [0.86, 1, 1] };
        g.add(hm);
        return g;
      }
      if (role === "lead") wizard(B, H, look, v, p.pose ? pose : {});
      else if (lens && (p.summary || p.parts)) LENS_BUILD[lens](B, H, v, { c0, c1, c2, d });
      else if (role === "threshold") post(B, H, c0, c1, c2, d, v);
      else if (role === "dais") plinth(B, 0.42, H, c0, c1, ART.star);
      else if (role === "basin") {
        B.box(0.44, 0.16, 0.44, pal(c0));
        B.box(0.26, H * 0.5, 0.26, pal(c1), 0, 0.16, 0);
        B.box(0.5, 0.18, 0.5, pal(c0), 0, 0.16 + H * 0.5, 0);
        B.box(0.36, 0.04, 0.36, pal(ART.flame), 0, 0.3 + H * 0.5, 0);
        flame(B, 0, 0.36 + H * 0.5, 0, 0.9);
      } else if (role === "light") {
        const brazier = /brazier/i.test(t);
        if (brazier) {
          for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [0, 0.16]]) B.box(0.08, H * 0.55, 0.08, pal(ART.ink), x, 0, z);
          B.cyl(0.3, 0.2, pal(c0), 0, H * 0.55, 0, 8);
          B.cyl(0.24, 0.03, pal(ART.flame), 0, H * 0.55 + 0.2, 0, 8);
          flame(B, 0, H * 0.55 + 0.2, 0, 1.2);
        } else {
          B.box(0.26, 0.14, 0.26, pal(c0));
          B.box(0.14, H - 0.56, 0.14, pal(ART.wood), 0, 0.14, 0);
          B.box(0.3, 0.06, 0.3, pal(ART.robe), 0, H - 0.42, 0);
          B.box(0.22, 0.24, 0.22, pal(ART.flame), 0, H - 0.36, 0);
          B.cone(0.22, 0, 0.16, pal(ART.robe), 0, H - 0.12, 0, 4);
        }
      } else if (role === "crag") {
        const segs = [[0.84, 0.38], [0.64, 0.33], [0.42, 0.29]];
        let y = 0;
        segs.forEach(([w, f], i) => { const hh = H * f; B.box(w, hh, w * (0.9 + 0.1 * i), pal([c0, c1, c2][i]), i % 2 ? 0.06 : -0.05, y, i % 2 ? -0.04 : 0.05); y += hh; });
        B.cone(0.24, 0, 0.3, pal(c2), 0, y - 0.02, 0, 4);
      } else if (role === "stele") {
        B.box(0.56, 0.18, 0.36, pal(c0));
        B.box(0.44, H - 0.36, 0.2, pal(c1), 0, 0.18, 0);
        B.box(0.5, 0.18, 0.26, pal(c0), 0, H - 0.18, 0);
        for (const y of [0.4, 0.62, 0.84]) B.box(0.24, 0.07, 0.04, pal(ART.robe), 0, H * y, 0.11);
      } else if (role === "slab") {
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), 0, 0.14, pal(c0));
        B.box(0.36, 0.03, 0.08, pal(ART.flame), 0, 0.14, 0);
        B.box(0.08, 0.03, 0.36, pal(ART.flame), 0, 0.14, 0);
      } else if (role === "crystal") {
        B.box(0.36, 0.12, 0.36, pal(c0));
        B.cone(0.14, 0, H * 0.8, pal(ART.flame), -0.06, 0.1, 0, 4);
        B.cone(0.1, 0, H * 0.55, pal(ART.flameCore), 0.12, 0.1, 0.06, 4);
        B.cone(0.09, 0, H * 0.45, pal(ART.flame), 0.02, 0.1, -0.12, 4);
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.07, pal(c2), 0, H * 0.55, 0, 8);
        B.box(0.16, 0.12, 0.16, pal(v % 2 ? ART.flame : ART.gold), 0, H * 0.55 + 0.06, 0);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.62, 0.48, 0.34] : [0.56, 0.44, 0.3];
        const hh = (H - 0.3) / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c2][i % 3]), i % 2 ? 0.04 : -0.03, i * hh, i % 2 ? -0.03 : 0.03));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, H - 0.3, 0, 4);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const walkable = (c) => c && c.h >= 1 && c.s !== "none" && c.s !== "water" && c.s !== "ramp";

function farSpawn(level, brief, h) {
  const grid = brief.composition?.grid || [];
  const [ax, az] = h.figure.anchor;
  let best = null, bd = -1;
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!walkable(c) || grid[z]?.[x] !== "P") return;
    const d = Math.abs(x - ax) + Math.abs(z - az);
    if (d > bd) { bd = d; best = [x, z]; }
  }));
  if (best) level.spawn = best;
}

function lawns(level, h) {
  const [ax, az] = h.figure.anchor;
  if (h.surf.ground === "grass") level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (walkable(c) && (c.s === "stone" || c.s === "dirt") && Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5)) > 2) c.s = "grass";
  }));
  let land = 0, stone = 0;
  for (const row of level.cells) for (const c of row) if (walkable(c)) { land++; if (c.s === "stone") stone++; }
  if (stone < land * 0.6) return;
  level.cells.forEach((row) => row.forEach((c) => { if (walkable(c) && c.s === "stone" && c.h <= 2) c.s = "grass"; }));
}

function ring(level, h, t, want) {
  const [ax, az] = h.figure.anchor;
  const cx = ax + 0.5, cz = az + 0.5;
  const cand = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!walkable(c) || h.decorAt(x, z).length || c.s === h.surf.path) return;
    const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
    if (d < 2.5 || d > 3.5) return;
    cand.push([x, z, Math.atan2(z - cz, x - cx)]);
  }));
  const placed = [];
  for (const [x, z, a] of cand.sort((p, q) => p[2] - q[2])) {
    if (placed.length >= want) break;
    if (placed.some(([px, pz]) => Math.abs(px - x) + Math.abs(pz - z) < 4)) continue;
    const miss = h.reach().missing.length;
    if (!h.put(t, x, z)) continue;
    if (h.reach().missing.length > miss) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    placed.push([x, z]);
  }
  h.log.push(`ring ${t} x${placed.length}`);
}

function causeway(level, h, r) {
  const ps = h.surf.path;
  const on = new Set(r.map(([x, z]) => x + "," + z));
  const at = (x, z) => level.cells[z]?.[x];
  for (const [x, z] of r) {
    const c = at(x, z);
    if (!c || c.s !== ps) continue;
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const a = at(x + dx, z + dz), b = at(x - dx, z - dz);
      const wa = a?.s === "water", wb = b?.s === "water";
      if (wa === wb) continue;
      const [nx, nz] = wa ? [x - dx, z - dz] : [x + dx, z + dz];
      const n = at(nx, nz);
      if (n && walkable(n) && n.h === c.h && !on.has(nx + "," + nz) && !h.decorAt(nx, nz).length) n.s = ps;
    }
  }
}

function solidCauseway(level) {
  const at = (x, z) => level.cells[z]?.[x];
  const wet = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, z + b)?.s === "water");
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "stone" && c.h === 1 && wet(x, z)) c.s = "sand"; }));
}

function rimRamps(level, h, r) {
  const at = (x, z) => level.cells[z]?.[x];
  const on = new Set(r.map(([x, z]) => x + "," + z));
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (c.s !== "ramp" || on.has(x + "," + z)) return;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = at(x + a, z + b); return !n || n.s === "none"; })) return;
    const snap = { ...c }, miss = h.reach().missing.length;
    level.cells[z][x] = { h: c.h, s: h.surf.ground };
    if (h.reach().missing.length > miss) level.cells[z][x] = snap;
    else h.log.push(`rim ramp ${x},${z} flattened`);
  }));
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  const P = level.palette || {};
  const types = Object.keys(P.props || {});
  const of = (k) => types.filter((t) => kindOf(P, t) === k);
  lawns(level, h);
  h.removeDecor((d) => of("dais").includes(d.t));
  const gateT = of("threshold")[0];
  const lightT = of("basin")[0] || of("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  const lamps = [...of("basin"), ...of("light"), "torch", "lantern"];
  h.removeDecor((d) => d.t === gateT || lamps.includes(d.t));
  let r = h.approach();
  if (r.length < 8) { farSpawn(level, brief, h); r = h.approach(); }
  if (r.length) h.path(r);
  causeway(level, h, r);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.5 }) : null;
  const n = h.lights(lightT, { route: r, every: 2, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  if (n < 2) ring(level, h, lightT, 4 - n);
  h.repair({ keep: [gateT] });
  rimRamps(level, h, h.approach());
  solidCauseway(level);
}

function lensName(level, brief) {
  return brief.reading?.lens || (/wizard-(\w+)/.exec(level.name || "") || [])[1] || "";
}

function side(level, h, types, pred, want) {
  const [ax, az] = h.figure.anchor;
  const cand = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!walkable(c) || h.isFig(x, z) || h.decorAt(x, z).length || !pred(x, z, c, ax, az)) return;
    if (h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) < 2)) return;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "ramp")) return;
    cand.push([x, z]);
  }));
  cand.sort((p, q) => (Math.abs(p[0] - ax) + Math.abs(p[1] - az)) - (Math.abs(q[0] - ax) + Math.abs(q[1] - az)));
  let n = 0;
  const r = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  for (const [x, z] of cand) {
    if (n >= want) break;
    if (r.has(h.key(x, z))) continue;
    if (level.decor.some((d) => types.includes(d.t) && Math.abs(d.x - x) + Math.abs(d.z - z) < 2)) continue;
    const t = types[n % types.length];
    const m0 = h.reach().missing.length;
    if (!h.put(t, x, z, { v: n % 2 })) continue;
    if (h.reach().missing.length > m0) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    n++;
  }
  h.log.push(`side ${types.join("/")} x${n}`);
  return n;
}

const LENS_LOOK = {
  medium: { bg: "#f4efe4", light: { dir: [-0.5, 1, 0.3], ambient: 0.9, sun: 0.2 }, sand: { top: "#fbf6ea", lip: "#e4dccb", edge: "#1b1420", dots: "#d9d0bd" }, grass: { top: "#3a55b0", fringe: "#1b1420", fringeDark: "#0e0a12", speck: "#fff08a" } },
  subject: { bg: "#2b1812", light: { dir: [0.45, 1, 0.5], ambient: 0.66, sun: 0.4 } },
  composition: { bg: "#210d2b", light: { dir: [-0.2, 1, 0.8], ambient: 0.8, sun: 0.35 }, grass: { top: "#2f56c4", fringe: "#1f3d96", fringeDark: "#142558", speck: "#fff08a" } },
};

function look(level, L) {
  const k = LENS_LOOK[L];
  if (!k) return;
  if (k.bg) level.bg = k.bg;
  if (k.light) level.light = { ...level.light, ...k.light };
  for (const m of ["sand", "grass"]) if (k[m] && level.palette?.[m]) Object.assign(level.palette[m], k[m]);
}

function finishLens(level, brief, h) {
  const L = lensName(level, brief);
  const props = level.palette?.props || {};
  look(level, L);
  h.dryRim();
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = brief.threshold?.prop && props[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light").find((t) => props[t]) || "lantern";
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && !daisTypes.includes(t) && props[t]?.role !== "lead");
  h.removeDecor((d) => d.t === gateT || d.t === lightT || passT.includes(d.t));
  if (L === "composition") h.removeDecor((d) => /^tree|^flower|^rock/.test(d.t));
  let r = h.spawnAt({ min: 9, max: 16 });
  if (r.length) h.path(r);
  r = h.approach();
  let g = null;
  for (const frac of [0.55, 0.4, 0.7, 0.3]) if (!g && gateT) g = h.gate(gateT, { route: r, frac });
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => !posts.includes(d) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1) && !CATALOG_PASS(d, props));
  h.along(passT, { route: r });
  const [ax, az] = h.figure.anchor;
  if (L === "subject") for (const s of [-1, 1]) side(level, h, [lightT], (x, z, c) => c.h === h.cell(ax, az).h && Math.abs(z - az - 0.5) <= 1.5 && (x - ax - 0.5) * s >= 2 && (x - ax - 0.5) * s <= 3.5, 1);
  else side(level, h, [lightT], (x, z) => x < ax && Math.abs(z - az - 0.5) <= 2.5, L === "medium" ? 2 : 1);
  h.ledges({ keep: [gateT, lightT] });
  occluders(level, h, props, [gateT, lightT]);
  if (L === "composition") {
    const crest = Object.keys(props).find((t) => /crest|hat/.test(t));
    if (crest && !level.decor.some((d) => d.t === crest)) side(level, h, [crest], (x, z, c) => z <= az && x >= ax + 4, 1);
    const gem = Object.keys(props).find((t) => /gem/.test(t)) || "gem";
    h.removeDecor((d) => d.t === gem);
    for (const s of [-1, 1]) side(level, h, [gem], (x, z, c) => c.h >= 2 && Math.abs(z - az - 0.5) <= 1.5 && (x - ax - 0.5) * s >= 2 && (x - ax - 0.5) * s <= 3.5, 1);
  }
  h.repair({ keep: [gateT] });
  const onR = new Set(h.approach().map(([x, z]) => h.key(x, z)));
  h.removeDecor((d) => /stepping|scroll-pad/.test(d.t) && !onR.has(h.key(d.x, d.z)) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => onR.has(h.key(d.x + a, d.z + b))));
  for (const q of posts) if (!level.decor.includes(q) && !h.decorAt(q.x, q.z).length) level.decor.push(q);
  if (L !== "composition") h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.grow(84);
  if (h.walkN() < 84) h.thin(84, { keep: [gateT, lightT] });
  h.rampTone();
  const lost = posts.filter((q) => !level.decor.includes(q));
  if (lost.length) h.log.push(`gate posts lost ${lost.length}`);
  if (L === "medium") placeThings(level, h, { look: THINGS_LOOK });
  if (level.name === "wizard-medium") for (const [x, z] of [[1, 8], [1, 7]]) h.put("stepping-stones", x, z, { v: z % 2 });
  if (level.name === "wizard-medium") placeLandmark(level, h, "wizard-scroll-tower");
  if (level.name === "wizard-medium") placeGeneric(level, h, "market-row", { near: 2 });
}

const FACE = [[0, 1], [-1, 0], [0, -1], [1, 0]];
const THINGS_LOOK = { stone: ART.stone, ash: ART.ink, wood: ART.wood, metal: ART.gold, blade: ART.collar, flame: ART.flame, core: ART.flameCore, lamp: ART.flame, deck: ART.stone, trim: ART.gold, post: ART.robe, cap: ART.star };
const SIDES = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export function placeThings(level, h, o = {}) {
  const key = h.key, P = level.palette || {};
  const lead = level.decor.find((d) => kindOf(P, d.t) === "lead");
  const [sx, sz] = level.spawn;
  const base = h.blockedSet();
  const reachWith = (cells) => reachability({ ...level, blocked: new Set([...base, ...cells.filter(Boolean).map(([x, z]) => key(x, z))]) });
  const missing = (r) => new Set(r.missing.map(([x, z]) => key(x, z)));
  const open0 = reachWith([]);
  const route = h.approach({ walkOnly: true });
  const onR = new Set(route.map(([x, z]) => key(x, z)));
  const fig = h.figure.cells;
  const [fw, fd] = CATALOG[lead?.t]?.footprint || [2, 2];
  const fc = lead ? [lead.x + fw / 2, lead.z + fd / 2] : [0, 0];
  const steps = (x, z) => Object.keys(DIRS).filter((d) => canStep({ ...level, blocked: base }, x, z, d));
  const tail = (m, i) => route.slice(i + 1).some(([a, b]) => m.has(key(a, b)));
  const plugs = cand0();
  function cand0() {
    const out = [];
    level.cells.forEach((row, z) => row.forEach((c, x) => { if (walkable(c) && !h.isFig(x, z) && !h.decorAt(x, z).length && !onR.has(key(x, z)) && Math.abs(x - sx) + Math.abs(z - sz) > 3) out.push([x, z]); }));
    return out;
  }
  const figD0 = (x, z) => Math.min(...fig.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
  let G = null, gi = -1, best = Infinity, plug = null;
  route.forEach(([x, z], i) => {
    const frac = i / (route.length - 1);
    if (i < 2 || i > route.length - 2 || frac < 0.3 || frac > 0.85 || h.cell(x, z).s === "ramp") return;
    const [px, pz] = route[i - 1], [nx, nz] = route[i + 1];
    if (px !== nx && pz !== nz) return;
    if (steps(x, z).length !== 2 && !level.decor.some((d) => d.gapX === x && d.gapZ === z)) return;
    let p = null;
    if (!tail(missing(reachWith([[x, z]])), i)) {
      const opts = plugs.filter((b) => {
        const one = reachWith([b]);
        return one.missing.length === open0.missing.length && tail(missing(reachWith([[x, z], b])), i);
      }).sort((a, b) => figD0(...a) - figD0(...b));
      if (!opts.length) return;
      p = opts[0];
    }
    const th = route[i - 1];
    const d = Math.hypot(th[0] + 0.5 - fc[0], th[1] + 0.5 - fc[1]);
    const posts = level.decor.some((q) => q.gapX === x && q.gapZ === z) ? 0 : 0.3;
    const score = Math.abs(frac - 0.6) + 0.2 * Math.max(0, d - 4.5) + posts + (p ? 0.2 : 0);
    if (score < best) { best = score; G = [x, z]; gi = i; plug = p; }
  });
  if (plug) {
    const t = o.plug || Object.keys(P.props || {}).find((q) => /spire|crag|rock/.test(q)) || "rock";
    if (h.put(t, plug[0], plug[1], { v: 1 })) { h.log.push(`things plug ${t}@${plug}`); base.add(key(...plug)); }
    else plug = null;
  }
  const closed0 = G ? reachWith([G]) : open0;
  const cut = new Set([...missing(closed0)].filter((k) => !missing(open0).has(k)));
  const free = (x, z) => { const c = h.cell(x, z); return walkable(c) && !h.isFig(x, z) && !h.decorAt(x, z).length && !(x === sx && z === sz) && !(G && x === G[0] && z === G[1]); };
  const near = (x, z) => Math.min(...route.map(([a, b]) => Math.abs(a - x) + Math.abs(b - z)));
  const keeps = (cells) => reachWith(cells).missing.length === open0.missing.length && reachWith([G, ...cells]).missing.length === closed0.missing.length;
  const cand = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (free(x, z) && !onR.has(key(x, z))) cand.push([x, z]); }));
  const out = [];
  const md = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  let bon = null;
  for (const c of cand.filter((c) => md(c, [sx, sz]) <= 3 && !cut.has(key(...c))).sort((a, b) => (near(...a) - near(...b)) || (Math.abs(md(a, [sx, sz]) - 2) - Math.abs(md(b, [sx, sz]) - 2)))) {
    if (!keeps([c])) continue;
    bon = c;
    break;
  }
  if (bon) out.push({ id: "b1", kind: "bonfire", x: bon[0], z: bon[1], rot: 0 });
  const idxOf = (x, z) => { let bi = 0, bd = Infinity; route.forEach(([a, b], i) => { const d = Math.abs(a - x) + Math.abs(b - z); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const want = gi > 0 ? Math.round(gi * 0.6) : Math.round(route.length / 2);
  let chest = null;
  for (const c of cand.filter((c) => near(...c) >= 1 && near(...c) <= 2 && !cut.has(key(...c)) && (!bon || Math.max(Math.abs(c[0] - bon[0]), Math.abs(c[1] - bon[1])) >= 3)).sort((a, b) => (near(...a) - near(...b)) || (Math.abs(idxOf(...a) - want) - Math.abs(idxOf(...b) - want)))) {
    if (!keeps(bon ? [c, bon] : [c])) continue;
    chest = c;
    break;
  }
  if (chest) {
    const r = route[idxOf(...chest)];
    const dx = Math.sign(r[0] - chest[0]), dz = Math.sign(r[1] - chest[1]);
    const rot = Math.max(0, FACE.findIndex(([a, b]) => a === (dz ? 0 : dx) && b === dz));
    out.push({ id: "c1", kind: "chest", x: chest[0], z: chest[1], rot, text: o.chestText || "Star-dusted sleeve. Still warm from the frankfurter's spell." });
  }
  if (lead) {
    const th = gi > 0 ? route[gi - 1] : route[Math.max(0, route.length - 3)];
    const radius = +(Math.hypot(th[0] + 0.5 - fc[0], th[1] + 0.5 - fc[1]) + 0.6).toFixed(2);
    lead.watch = "w1";
    out.push({ id: "w1", kind: "watcher", x: lead.x, z: lead.z, size: [fw, fd], radius });
    if (G) {
      const [px] = route[gi - 1];
      out.push({ id: "g1", kind: "gate", x: G[0], z: G[1], span: px !== G[0] ? "z" : "x", blocks: [G], open: "watcher:w1", threshold: [th], ...(level.decor.some((q) => q.gapX === G[0] && q.gapZ === G[1]) ? { frame: false, width: 1.5, height: 1.5 } : {}) });
    }
  }
  const figD = (x, z) => Math.min(...fig.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
  const rim = [];
  for (const [x, z] of cand) {
    if ((chest && x === chest[0] && z === chest[1]) || (bon && x === bon[0] && z === bon[1])) continue;
    const side = SIDES.findIndex(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; });
    if (side < 0) continue;
    const back = side === 2 || side === 3 ? 0 : 3;
    const beyond = cut.has(key(x, z)) ? 0 : 4;
    rim.push([x, z, side, back + beyond + Math.abs(figD(x, z) - 2.5) + (h.cell(x, z).s === h.surf.path ? 1 : 0)]);
  }
  rim.sort((a, b) => a[3] - b[3]);
  if (rim.length) {
    const [x, z, side] = rim[0];
    out.push({ id: "e1", kind: "elevator", x, z, rot: side, run: o.run || ["wizard-medium", "cat-medium"] });
  }
  level.things = out;
  if (o.look) level.palette.things = o.look;
  const solid = out.filter((t) => t.kind === "bonfire" || t.kind === "chest").map((t) => [t.x, t.z]);
  const rOpen = missing(reachWith(solid)), rClosed = missing(reachWith([G, ...solid]));
  const besideOk = (m, t) => t && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => walkable(h.cell(t.x + a, t.z + b)) && !base.has(key(t.x + a, t.z + b)) && !m.has(key(t.x + a, t.z + b)) && !solid.some(([p, q]) => p === t.x + a && q === t.z + b));
  const el = out.find((t) => t.kind === "elevator");
  const ok = {
    route: route.length,
    gateAt: G ? +(gi / (route.length - 1)).toFixed(2) : null,
    gateCuts: cut.size,
    allOpen: rOpen.size === missing(open0).size,
    bonfireClosed: besideOk(rClosed, out.find((t) => t.kind === "bonfire")),
    bonfireToSpawn: bon ? md(bon, [sx, sz]) : null,
    chestOpen: besideOk(rOpen, out.find((t) => t.kind === "chest")),
    elevatorOpen: !!el && !rOpen.has(key(el.x, el.z)),
    elevatorGated: !!el && rClosed.has(key(el.x, el.z)),
  };
  h.log.push(`things ${out.map((t) => `${t.kind}@${t.x},${t.z}`).join(" ")} ${JSON.stringify(ok)}`);
  return ok;
}

function occluders(level, h, props, keep) {
  const n = h.removeDecor((d) => {
    const p = props[d.t];
    if (!p || keep.includes(d.t) || p.passable || p.role === "lead" || (p.height || 1) < 1.4) return false;
    const c = h.cell(d.x, d.z);
    return [[-1, 0], [0, -1], [-1, -1]].some(([a, b]) => { const q = h.cell(d.x + a, d.z + b); return walkable(q) && q.h < c.h && !h.isFig(d.x + a, d.z + b); });
  });
  h.log.push(`occluders dropped ${n}`);
}

function CATALOG_PASS(d, props) {
  return !!props[d.t]?.passable;
}
