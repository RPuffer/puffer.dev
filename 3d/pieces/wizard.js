import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-a.js";
import { placeGeneric } from "./multitile-place.js";
import { reachability } from "../../core/procgen.js";
import { CATALOG } from "../../core/catalog.js";
import { canStep, DIRS } from "../../core/level.js";
import { outgrow as growOut, echo, grow as widen } from "./outgrowth.js";

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
    B.box(0.2, 0.08, 0.3, pal(ART.skinLight), -0.16, y0, 0.14);
    B.box(0.2, 0.08, 0.3, pal(ART.skinLight), 0.16, y0, 0.1);
    B.rbox(0.36, 1.72, 0.34, 0.12, pal(ART.skin), 0, y0 + 0.3, 0);
    B.box(0.06, 1.2, 0.04, pal(ART.skinLight), 0.1, y0 + 0.5, 0.17);
    B.box(0.34, 0.5, 0.6, pal(ART.robe), -0.26, y0 + 0.18, -0.04);
    B.box(0.34, 0.5, 0.6, pal(ART.robe), 0.26, y0 + 0.18, -0.04);
    B.box(0.82, 0.47, 0.26, pal(ART.robeDark), 0, y0 + 0.18, -0.24);
    B.box(0.3, 0.48, 0.52, pal(ART.robe), -0.24, y0 + 0.68, -0.02);
    B.box(0.3, 0.48, 0.52, pal(ART.robe), 0.24, y0 + 0.68, -0.02);
    B.box(0.74, 0.45, 0.22, pal(ART.robeDark), 0, y0 + 0.68, -0.2);
    B.box(0.66, 0.24, 0.46, pal(ART.robe), 0, y0 + 1.16, -0.07);
    B.box(0.24, 0.24, 0.12, pal(ART.robe), -0.23, y0 + 1.16, 0.2);
    B.box(0.24, 0.24, 0.12, pal(ART.robe), 0.23, y0 + 1.16, 0.2);
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
      B.box(0.2, 0.05, 0.16, pal(ART.skinLight), -0.02, -0.09, 0.62);
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
  B.box(0.16, 0.26, 0.16, pal(c), 0.05, top, 0);
  B.box(0.46, 0.16, 0.18, pal(c), -0.1, top + 0.24, 0);
  B.box(0.16, 0.26, 0.14, pal(ART.staff), -0.3, top + 0.1, 0);
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
    segs.forEach((w, i) => B.box(w, hh + 0.01, w * 0.8, pal(i % 2 ? INDIGO : ART.ink), lean * (i * i * 0.03 + i * 0.012), 0.16 + i * hh, 0));
    const tx = lean * (16 * 0.03 + 4 * 0.012);
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
    const h = role === "lead" ? 2.3 : role === "threshold" ? 2.6 : role === "slab" ? 0.25 : Math.min(2.6, Math.max(0.3, p.height || 1));
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

export const PIN = { "wizard-medium": {"spawn":[3,5],"cells":[[5,5,{"h":3,"s":"ramp","d":"s","m":"stone"}]],"decor":[{"t":"Glizard the Frankfurter Mage","x":11,"z":3,"v":0,"rot":0,"ox":0,"oz":0,"watch":"w1"},{"t":"brush-flick-spire","x":6,"z":1,"v":1,"rot":0,"ox":-0.04,"oz":-0.11},{"t":"stepping-stones","x":9,"z":3,"v":0,"rot":0,"ox":0.05,"oz":0.03},{"t":"stepping-stones","x":10,"z":5,"v":1,"rot":0,"ox":-0.1,"oz":-0.02},{"t":"brush-flick-spire","x":6,"z":3,"v":1,"rot":0,"ox":0.01,"oz":0.03},{"t":"rock","x":10,"z":9,"v":0,"rot":0,"ox":0.05,"oz":-0.01},{"t":"brush-flick-spire","x":9,"z":1,"v":0,"rot":0,"ox":0.02,"oz":-0.04},{"t":"brush-flick-spire","x":1,"z":6,"v":1,"rot":0,"ox":0.01,"oz":0.07},{"t":"stepping-stones","x":2,"z":8,"v":1,"rot":0,"ox":-0.02,"oz":0.07},{"t":"star","x":2,"z":9,"v":0,"rot":0,"ox":-0.02,"oz":0.11},{"t":"star","x":6,"z":8,"v":0,"rot":0,"ox":0.05,"oz":-0.04},{"t":"star","x":13,"z":2,"v":0,"rot":0,"ox":0,"oz":-0.09},{"t":"star","x":4,"z":5,"v":0,"rot":0,"ox":-0.14,"oz":-0.1},{"t":"star","x":10,"z":6,"v":0,"rot":0,"ox":0.13,"oz":0.05},{"t":"star","x":14,"z":2,"v":0,"rot":0,"ox":-0.14,"oz":0.07},{"t":"star-doodle-totem","x":6,"z":6,"v":0,"rot":0,"ox":0,"oz":0,"side":-1,"axis":"z","gapX":7,"gapZ":6},{"t":"star-doodle-totem","x":8,"z":6,"v":0,"rot":0,"ox":0,"oz":0,"side":1,"axis":"z","gapX":7,"gapZ":6},{"t":"cyan-ember-pillar","x":9,"z":2,"v":0,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":9,"z":5,"v":1,"rot":0,"ox":0,"oz":0},{"t":"wizard-scroll-tower","x":7,"z":1,"v":0,"rot":0,"ox":0,"oz":0},{"t":"market-row","x":1,"z":7,"v":0,"rot":1,"ox":0,"oz":0},{"t":"brush-flick-spire","x":9,"z":8,"v":1,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":12,"z":7,"v":1,"rot":0,"ox":0.12,"oz":0.08},{"t":"rock","x":14,"z":4,"v":2,"rot":0,"ox":0.1,"oz":0.12},{"t":"rock","x":8,"z":3,"v":2,"rot":0,"ox":0.1,"oz":0.02},{"t":"rock","x":7,"z":3,"v":1,"rot":0,"ox":0.12,"oz":0.07},{"t":"rock","x":6,"z":2,"v":2,"rot":0,"ox":-0.03,"oz":-0.01},{"t":"rock","x":1,"z":10,"v":2,"rot":0,"ox":-0.04,"oz":0.1},{"t":"rock-big","x":13,"z":6,"v":1,"rot":0,"ox":0.09,"oz":0.05},{"t":"gnarled-staff-perch","x":9,"z":7,"v":0,"rot":0,"ox":0.09,"oz":0.08},{"t":"cyan-ember-pillar","x":4,"z":9,"v":1,"rot":0,"ox":-0.02,"oz":-0.09},{"t":"rock-big","x":6,"z":4,"v":0,"rot":0,"ox":-0.01,"oz":0.09},{"t":"rock","x":9,"z":6,"v":0,"rot":0,"ox":0.07,"oz":0.08},{"t":"cyan-ember-pillar","x":4,"z":4,"v":1,"rot":0,"ox":-0.09,"oz":-0.02},{"t":"rock-big","x":14,"z":6,"v":1,"rot":0,"ox":-0.11,"oz":-0.06},{"t":"rock","x":14,"z":5,"v":1,"rot":0,"ox":-0.07,"oz":0},{"t":"brush-flick-spire","x":4,"z":3,"v":1,"rot":0,"ox":-0.09,"oz":0.08}],"things":[{"id":"b1","kind":"bonfire","x":2,"z":6,"rot":0},{"id":"c1","kind":"chest","x":3,"z":9,"rot":3,"text":"A curl of dried ink, peeled off the Ribbonway."},{"id":"w1","kind":"watcher","x":11,"z":3,"size":[2,2],"radius":6.3},{"id":"g1","kind":"gate","x":7,"z":6,"span":"x","blocks":[[7,6]],"open":"watcher:w1","threshold":[[7,7]],"edge":[[7,7],[7,6]]},{"id":"e1","kind":"elevator","role":"exit","x":12,"z":1,"rot":2},{"id":"e0","kind":"elevator","role":"entry","x":3,"z":4,"rot":2}],"edits":[{"x":5,"z":7,"kind":"lower","from":{"h":3,"s":"ramp"},"to":{"h":2,"s":"sand"}},{"x":7,"z":8,"kind":"ramp","from":{"h":3,"s":"sand"},"to":{"h":3,"s":"ramp"}},{"x":5,"z":6,"kind":"lower","from":{"h":3,"s":"sand"},"to":{"h":2,"s":"sand"}},{"x":5,"z":8,"kind":"lower","from":{"h":3,"s":"grass"},"to":{"h":2,"s":"grass"}}],"back":{"pad":[0,4,0,0],"cells":[[5,9,{"h":3,"s":"sand"}],[4,10,{"h":3,"s":"sand"}],[3,11,{"h":2,"s":"sand"}],[4,9,{"h":3,"s":"sand"}],[3,10,{"h":2,"s":"sand"}],[3,9,{"h":2,"s":"sand"}],[4,8,{"h":2,"s":"sand"}],[5,8,{"h":3,"s":"ramp","d":"n","m":"sand"}],[6,8,{"h":2,"s":"sand"}],[7,8,{"h":2,"s":"sand"}],[8,8,{"h":2,"s":"stone"}],[5,7,{"h":2,"s":"sand"}],[4,7,{"h":2,"s":"sand"}],[6,7,{"h":2,"s":"sand"}],[9,3,{"h":3,"s":"sand"}],[10,3,{"h":4,"s":"ramp","d":"n","m":"sand"}],[11,3,{"h":3,"s":"sand"}],[10,2,{"h":3,"s":"sand"}],[9,2,{"h":3,"s":"sand"}],[11,2,{"h":3,"s":"sand"}],[2,9,{"h":2,"s":"ramp","d":"w","m":"sand"}],[2,10,{"h":1,"s":"sand"}],[1,9,{"h":1,"s":"sand"}],[1,10,{"h":1,"s":"sand"}],[8,4,{"h":3,"s":"sand"}],[8,5,{"h":3,"s":"sand"}],[0,14,{"h":1,"s":"sand"}],[3,8,{"h":1,"s":"sand"}],[9,7,{"h":2,"s":"sand"}],[4,6,{"h":1,"s":"sand"}],[5,6,{"h":2,"s":"ramp","d":"n","m":"sand"}],[6,6,{"h":1,"s":"sand"}],[5,5,{"h":1,"s":"sand"}],[4,5,{"h":1,"s":"sand"}],[6,5,{"h":1,"s":"sand"}],[9,1,{"h":2,"s":"sand"}],[10,1,{"h":3,"s":"ramp","d":"n","m":"sand"}],[11,1,{"h":2,"s":"sand"}],[10,0,{"h":2,"s":"sand"}],[9,0,{"h":2,"s":"sand"}],[11,0,{"h":2,"s":"sand"}],[7,7,{"h":1,"s":"sand"}],[8,7,{"h":1,"s":"stone"}],[8,3,{"h":2,"s":"sand"}]],"decor":[{"t":"star","x":4,"z":8,"v":1,"rot":0,"ox":0,"oz":0},{"t":"star","x":6,"z":8,"v":2,"rot":0,"ox":0,"oz":0},{"t":"star","x":8,"z":8,"v":0,"rot":0,"ox":0,"oz":0},{"t":"star","x":9,"z":3,"v":1,"rot":0,"ox":0,"oz":0},{"t":"star","x":11,"z":3,"v":2,"rot":0,"ox":0,"oz":0},{"t":"rock","x":8,"z":4,"v":0,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":8,"z":5,"v":1,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":0,"z":14,"v":0,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":3,"z":8,"v":2,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":9,"z":7,"v":1,"rot":0,"ox":0,"oz":0},{"t":"star","x":4,"z":6,"v":1,"rot":0,"ox":0,"oz":0},{"t":"star","x":6,"z":6,"v":2,"rot":0,"ox":0,"oz":0},{"t":"star","x":9,"z":1,"v":0,"rot":0,"ox":0,"oz":0},{"t":"star","x":11,"z":1,"v":1,"rot":0,"ox":0,"oz":0},{"t":"cyan-ember-pillar","x":7,"z":7,"v":1,"rot":0,"ox":0,"oz":0},{"t":"rock","x":8,"z":7,"v":2,"rot":0,"ox":0,"oz":0},{"t":"rock","x":8,"z":3,"v":1,"rot":0,"ox":0,"oz":0}]},"grow":{"pad":[4,5,6,8],"cells":[[20,0,{"h":1,"s":"bridge","m":"planks","post":1}],[18,1,{"h":1,"s":"bridge","m":"planks","post":1}],[20,1,{"h":1,"s":"bridge","m":"planks","post":1}],[18,2,{"h":1,"s":"bridge","m":"planks","post":1}],[20,2,{"h":1,"s":"sand"}],[18,3,{"h":1,"s":"bridge","m":"planks","post":1}],[20,3,{"h":1,"s":"sand"}],[21,3,{"h":1,"s":"sand"}],[22,3,{"h":1,"s":"sand"}],[18,4,{"h":1,"s":"sand"}],[19,4,{"h":1,"s":"sand"}],[20,4,{"h":1,"s":"sand"}],[21,4,{"h":1,"s":"sand"}],[22,4,{"h":1,"s":"sand"}],[18,5,{"h":1,"s":"sand"}],[19,5,{"h":1,"s":"sand"}],[20,5,{"h":1,"s":"sand"}],[21,5,{"h":1,"s":"sand"}],[22,5,{"h":1,"s":"sand"}],[18,6,{"h":1,"s":"sand"}],[19,6,{"h":1,"s":"sand"}],[20,6,{"h":1,"s":"sand"}],[21,6,{"h":1,"s":"sand"}],[22,6,{"h":2,"s":"sand"}],[23,6,{"h":2,"s":"sand"}],[24,6,{"h":2,"s":"sand"}],[25,6,{"h":3,"s":"stone"}],[3,7,{"h":3,"s":"bridge","m":"planks","post":1}],[18,7,{"h":1,"s":"sand"}],[19,7,{"h":1,"s":"sand"}],[20,7,{"h":1,"s":"sand"}],[21,7,{"h":2,"s":"ramp","d":"w","m":"sand"}],[22,7,{"h":2,"s":"sand"}],[23,7,{"h":2,"s":"sand"}],[24,7,{"h":2,"s":"sand"}],[25,7,{"h":3,"s":"stone"}],[3,8,{"h":3,"s":"bridge","m":"planks","post":1}],[6,8,{"h":2,"s":"stone"}],[7,8,{"h":2,"s":"stone"}],[8,8,{"h":2,"s":"ramp","d":"e","m":"sand"}],[9,8,{"h":1,"s":"sand"}],[10,8,{"h":1,"s":"sand"}],[11,8,{"h":1,"s":"sand"}],[18,8,{"h":1,"s":"sand"}],[19,8,{"h":1,"s":"sand"}],[20,8,{"h":1,"s":"sand"}],[21,8,{"h":1,"s":"sand"}],[22,8,{"h":2,"s":"sand"}],[23,8,{"h":3,"s":"ramp","d":"w","m":"sand"}],[24,8,{"h":3,"s":"stone"}],[25,8,{"h":3,"s":"stone"}],[3,9,{"h":3,"s":"bridge","m":"planks","post":1}],[5,9,{"h":2,"s":"stone"}],[6,9,{"h":2,"s":"stone"}],[7,9,{"h":1,"s":"sand"}],[8,9,{"h":1,"s":"sand"}],[9,9,{"h":1,"s":"sand"}],[10,9,{"h":1,"s":"sand"}],[11,9,{"h":1,"s":"sand"}],[20,9,{"h":1,"s":"sand"}],[21,9,{"h":1,"s":"sand"}],[22,9,{"h":2,"s":"sand"}],[23,9,{"h":2,"s":"sand"}],[0,10,{"h":3,"s":"stone"}],[1,10,{"h":3,"s":"stone"}],[2,10,{"h":3,"s":"stone"}],[3,10,{"h":3,"s":"stone"}],[4,10,{"h":3,"s":"stone"}],[5,10,{"h":3,"s":"stone"}],[6,10,{"h":3,"s":"stone"}],[7,10,{"h":1,"s":"sand"}],[11,10,{"h":1,"s":"sand"}],[20,10,{"h":1,"s":"sand"}],[21,10,{"h":1,"s":"sand"}],[22,10,{"h":1,"s":"sand"}],[23,10,{"h":1,"s":"sand"}],[0,11,{"h":3,"s":"stone"}],[1,11,{"h":4,"s":"ramp","d":"n","m":"stone"}],[2,11,{"h":3,"s":"sand"}],[3,11,{"h":3,"s":"stone"}],[4,11,{"h":3,"s":"stone"}],[5,11,{"h":3,"s":"stone"}],[6,11,{"h":3,"s":"stone"}],[7,11,{"h":1,"s":"sand"}],[11,11,{"h":1,"s":"sand"}],[12,11,{"h":1,"s":"stone"}],[13,11,{"h":1,"s":"stone"}],[19,11,{"h":1,"s":"sand"}],[20,11,{"h":1,"s":"sand"}],[21,11,{"h":1,"s":"sand"}],[22,11,{"h":1,"s":"sand"}],[23,11,{"h":1,"s":"sand"}],[0,12,{"h":3,"s":"stone"}],[1,12,{"h":4,"s":"sand"}],[2,12,{"h":3,"s":"sand"}],[3,12,{"h":4,"s":"sand"}],[4,12,{"h":3,"s":"stone"}],[5,12,{"h":3,"s":"stone"}],[6,12,{"h":3,"s":"stone"}],[7,12,{"h":3,"s":"ramp","d":"e","m":"sand"}],[19,12,{"h":1,"s":"sand"}],[20,12,{"h":1,"s":"sand"}],[21,12,{"h":1,"s":"sand"}],[22,12,{"h":1,"s":"sand"}],[23,12,{"h":1,"s":"sand"}],[1,13,{"h":4,"s":"sand"}],[2,13,{"h":3,"s":"sand"}],[3,13,{"h":4,"s":"sand"}],[4,13,{"h":4,"s":"sand"}],[5,13,{"h":4,"s":"ramp","d":"e","m":"stone"}],[6,13,{"h":3,"s":"stone"}],[13,13,{"h":2,"s":"sand"}],[19,13,{"h":1,"s":"sand"}],[20,13,{"h":1,"s":"sand"}],[21,13,{"h":1,"s":"sand"}],[22,13,{"h":1,"s":"sand"}],[23,13,{"h":1,"s":"sand"}],[1,14,{"h":4,"s":"sand"}],[2,14,{"h":4,"s":"sand"}],[3,14,{"h":4,"s":"sand"}],[4,14,{"h":4,"s":"sand"}],[19,14,{"h":1,"s":"sand"}],[20,14,{"h":1,"s":"sand"}],[19,15,{"h":1,"s":"sand"}],[20,15,{"h":1,"s":"sand"}],[16,22,{"h":1,"s":"sand"}],[16,23,{"h":1,"s":"sand"}],[4,24,{"h":1,"s":"sand"}],[5,24,{"h":1,"s":"sand"}],[6,24,{"h":1,"s":"sand"}],[14,24,{"h":1,"s":"sand"}],[15,24,{"h":1,"s":"sand"}],[16,24,{"h":1,"s":"sand"}],[4,25,{"h":1,"s":"sand"}],[5,25,{"h":1,"s":"sand"}],[6,25,{"h":1,"s":"sand"}],[14,25,{"h":2,"s":"ramp","d":"n","m":"sand"}],[15,25,{"h":1,"s":"sand"}],[16,25,{"h":1,"s":"sand"}],[4,26,{"h":1,"s":"sand"}],[5,26,{"h":1,"s":"sand"}],[6,26,{"h":1,"s":"sand"}],[14,26,{"h":2,"s":"stone"}],[15,26,{"h":1,"s":"sand"}],[16,26,{"h":1,"s":"sand"}],[14,27,{"h":2,"s":"stone"}],[15,27,{"h":2,"s":"stone"}],[16,27,{"h":2,"s":"stone"}],[17,27,{"h":2,"s":"sand"}],[14,28,{"h":2,"s":"ramp","d":"s","m":"stone"}],[15,28,{"h":2,"s":"stone"}],[16,28,{"h":2,"s":"sand"}],[17,28,{"h":2,"s":"sand"}],[14,29,{"h":1,"s":"sand"}],[15,29,{"h":2,"s":"sand"}],[16,29,{"h":2,"s":"sand"}],[17,29,{"h":2,"s":"sand"}],[14,30,{"h":1,"s":"sand"}],[15,30,{"h":1,"s":"sand"}],[16,30,{"h":2,"s":"sand"}],[17,30,{"h":2,"s":"sand"}],[14,31,{"h":1,"s":"sand"}],[15,31,{"h":1,"s":"sand"}],[16,31,{"h":1,"s":"sand"}],[17,31,{"h":1,"s":"sand"}],[18,31,{"h":1,"s":"sand"}],[14,32,{"h":1,"s":"sand"}],[15,32,{"h":1,"s":"sand"}],[16,32,{"h":1,"s":"sand"}],[17,32,{"h":2,"s":"stone"}],[18,32,{"h":2,"s":"stone"}],[14,33,{"h":1,"s":"sand"}],[15,33,{"h":2,"s":"ramp","d":"w","m":"sand"}],[16,33,{"h":2,"s":"stone"}],[17,33,{"h":2,"s":"stone"}],[18,33,{"h":2,"s":"stone"}]],"decor":[{"t":"rock-big","x":25,"z":6,"v":1,"rot":0,"ox":0.11,"oz":-0.03},{"t":"rock-big","x":25,"z":7,"v":0,"rot":0,"ox":-0.1,"oz":0.04},{"t":"stepping-stones","x":24,"z":6,"v":0,"rot":0,"ox":0,"oz":0.1},{"t":"brush-flick-spire","x":4,"z":10,"v":1,"rot":0,"ox":-0.09,"oz":0.05},{"t":"gnarled-staff-perch","x":5,"z":10,"v":1,"rot":0,"ox":0.02,"oz":0.06},{"t":"brush-flick-spire","x":4,"z":11,"v":1,"rot":0,"ox":-0.1,"oz":0.11},{"t":"gnarled-staff-perch","x":5,"z":11,"v":0,"rot":0,"ox":-0.08,"oz":0.06},{"t":"stepping-stones","x":5,"z":9,"v":1,"rot":0,"ox":0,"oz":0.07},{"t":"gnarled-staff-perch","x":13,"z":11,"v":1,"rot":0,"ox":0.03,"oz":0.1},{"t":"cyan-ember-pillar","x":12,"z":11,"v":0,"rot":0,"ox":-0.08,"oz":-0.03},{"t":"gnarled-staff-perch","x":24,"z":7,"v":1,"rot":0,"ox":0.04,"oz":-0.1},{"t":"brush-flick-spire","x":4,"z":24,"v":0,"rot":0,"ox":0.01,"oz":-0.11},{"t":"rock-big","x":20,"z":8,"v":0,"rot":0,"ox":0.07,"oz":0.11},{"t":"brush-flick-spire","x":16,"z":27,"v":0,"rot":0,"ox":0.03,"oz":-0.11},{"t":"star-doodle-totem","x":17,"z":27,"v":0,"rot":0,"ox":0.11,"oz":0.08},{"t":"rock-big","x":19,"z":13,"v":0,"rot":0,"ox":0.09,"oz":0.06},{"t":"gnarled-staff-perch","x":20,"z":13,"v":1,"rot":0,"ox":0.11,"oz":-0.08},{"t":"cyan-ember-pillar","x":19,"z":11,"v":1,"rot":0,"ox":0,"oz":-0.06},{"t":"brush-flick-spire","x":20,"z":11,"v":0,"rot":0,"ox":-0.12,"oz":0.11},{"t":"star-doodle-totem","x":20,"z":6,"v":1,"rot":0,"ox":-0.11,"oz":0.04},{"t":"rock-big","x":21,"z":6,"v":1,"rot":0,"ox":-0.04,"oz":0.03},{"t":"gnarled-staff-perch","x":15,"z":30,"v":0,"rot":0,"ox":0.03,"oz":0.03},{"t":"cyan-ember-pillar","x":16,"z":30,"v":1,"rot":0,"ox":-0.07,"oz":-0.02},{"t":"brush-flick-spire","x":8,"z":9,"v":1,"rot":0,"ox":-0.04,"oz":0.1},{"t":"star-doodle-totem","x":9,"z":9,"v":0,"rot":0,"ox":-0.04,"oz":0.08},{"t":"rock-big","x":22,"z":3,"v":0,"rot":0,"ox":-0.04,"oz":0.02},{"t":"gnarled-staff-perch","x":21,"z":3,"v":1,"rot":0,"ox":-0.1,"oz":-0.02},{"t":"cyan-ember-pillar","x":0,"z":12,"v":1,"rot":0,"ox":0.07,"oz":0.03},{"t":"brush-flick-spire","x":0,"z":11,"v":0,"rot":0,"ox":-0.02,"oz":0},{"t":"star-doodle-totem","x":23,"z":9,"v":1,"rot":0,"ox":0.09,"oz":-0.06},{"t":"rock-big","x":22,"z":9,"v":0,"rot":0,"ox":0.01,"oz":0.05},{"t":"gnarled-staff-perch","x":23,"z":12,"v":1,"rot":0,"ox":-0.08,"oz":0.08},{"t":"cyan-ember-pillar","x":22,"z":12,"v":0,"rot":0,"ox":0.06,"oz":-0.06},{"t":"brush-flick-spire","x":4,"z":26,"v":1,"rot":0,"ox":-0.02,"oz":-0.04},{"t":"star-doodle-totem","x":5,"z":26,"v":1,"rot":0,"ox":0.12,"oz":-0.1},{"t":"rock-big","x":15,"z":32,"v":1,"rot":0,"ox":-0.07,"oz":0.01},{"t":"gnarled-staff-perch","x":16,"z":32,"v":1,"rot":0,"ox":-0.05,"oz":0.05},{"t":"cyan-ember-pillar","x":19,"z":8,"v":0,"rot":0,"ox":0.07,"oz":-0.12},{"t":"brush-flick-spire","x":20,"z":12,"v":0,"rot":0,"ox":-0.04,"oz":-0.11},{"t":"star-doodle-totem","x":22,"z":4,"v":0,"rot":0,"ox":0.11,"oz":0.01},{"t":"rock-big","x":18,"z":32,"v":0,"rot":0,"ox":0.11,"oz":-0.07},{"t":"gnarled-staff-perch","x":17,"z":32,"v":1,"rot":0,"ox":-0.11,"oz":-0.07},{"t":"cyan-ember-pillar","x":19,"z":15,"v":1,"rot":0,"ox":0.1,"oz":0.09},{"t":"brush-flick-spire","x":20,"z":15,"v":1,"rot":0,"ox":0.05,"oz":-0.02},{"t":"cyan-ember-pillar","x":4,"z":14,"v":0,"rot":0,"ox":-0.06,"oz":0.11},{"t":"star-doodle-totem","x":0,"z":10,"v":1,"rot":0,"ox":0.03,"oz":-0.06},{"t":"gnarled-staff-perch","x":22,"z":10,"v":1,"rot":0,"ox":-0.01,"oz":-0.08}],"docks":[{"kind":"dock","side":"n","at":[18,4],"cells":[[18,3],[18,2],[18,1]]},{"kind":"dock","side":"n","at":[3,10],"cells":[[3,9],[3,8],[3,7]]},{"kind":"dock","side":"n","at":[20,2],"cells":[[20,1],[20,0]]}]}} };

export function finish(level, brief, h) {
  if (brief.lens) {
    finishLens(level, brief, h);
    if (level.name === "wizard-medium") { h.edgeLifts({ entry: [4, 11] }); h.pin(PIN[level.name]); }
    return;
  }
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
  if (level.name === "wizard-medium") for (const [x, z] of [[1, 8], [1, 7]]) if (!(level.things || []).some((t) => t.x === x && t.z === z)) h.put("stepping-stones", x, z, { v: z % 2 });
  if (level.name === "wizard-medium") placeLandmark(level, h, "wizard-scroll-tower");
  if (level.name === "wizard-medium") placeGeneric(level, h, "market-row", { near: 2, hideDepth: 4, hideWeight: 3 });
  if (level.name === "wizard-medium" && h.land(h.cell(3, 5)) && !h.blockedSet().has(h.key(3, 5))) level.spawn = [3, 5];
  if (level.name === "wizard-medium" && faceRamps(level, h, { budget: 4 }).length) {
    const fronts = new Set(h.approach({ walkOnly: true }).flatMap(([x, z]) => [[1, 0], [0, 1], [1, 1]].map(([a, b]) => h.key(x + a, z + b))));
    const fronting = (d) => d.t === "market-row" && h.footprint(d).some(([x, z]) => fronts.has(h.key(x, z)));
    if (h.removeDecor(fronting)) {
      h.log.push("market-row dropped: it fronts the new climb");
      if (placeGeneric(level, h, "market-row", { near: 2, hideDepth: 4, hideWeight: 3, sight: false }) && h.removeDecor(fronting)) h.log.push("market-row dropped again: the second footprint fronts the climb too");
    }
  }
  if (L === "medium") placeThings(level, h, { look: THINGS_LOOK, bonfire: level.name === "wizard-medium" ? [2, 6] : null, chestText: "A curl of dried ink, peeled off the Ribbonway." });
}

const FACE = [[0, 1], [-1, 0], [0, -1], [1, 0]];
const THINGS_LOOK = { stone: ART.stone, ash: ART.ink, wood: ART.wood, metal: ART.gold, blade: ART.collar, flame: ART.flame, core: ART.flameCore, lamp: ART.flame, deck: ART.stone, trim: ART.gold, post: ART.robe, cap: ART.star };
const SIDES = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export function sealGate(level, h, G, th, base, plugT, things = [], o = {}) {
  const key = h.key;
  const tryEdge = (A, F) => {
    const d = [F[0] - A[0], F[1] - A[1]], perp = [d[1], d[0]];
    const edges = new Set([[A, F].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((c) => c.join(",")).join("|")]);
    const L1 = () => ({ ...level, blocked: base, edges });
    const added = [];
    for (const s of [1, -1]) {
      const x = F[0] + s * perp[0], z = F[1] + s * perp[1];
      const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === x - F[0] && DIRS[k][1] === z - F[1]);
      if (!canStep(L1(), F[0], F[1], dir)) continue;
      const c = h.cell(x, z);
      if (!c || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || things.some((t) => t.x === x && t.z === z)) continue;
      const m0 = reachability({ ...level, blocked: base }).missing.length;
      if (!h.put(plugT, x, z, { v: (x + z) % 2 })) continue;
      base.add(key(x, z));
      if (reachability({ ...level, blocked: base }).missing.filter(([a, b]) => a !== x || b !== z).length > m0) { base.delete(key(x, z)); h.removeDecor((q) => q.t === plugT && q.x === x && q.z === z); continue; }
      added.push([x, z]);
    }
    const seen = new Set([key(...A)]), q = [A];
    while (q.length) {
      const [x, z] = q.shift();
      for (const k of Object.keys(DIRS)) {
        if (!canStep(L1(), x, z, k)) continue;
        const nx = x + DIRS[k][0], nz = z + DIRS[k][1];
        if (nx === F[0] && nz === F[1]) {
          for (const [ax, az] of added) { base.delete(key(ax, az)); h.removeDecor((q2) => q2.t === plugT && q2.x === ax && q2.z === az); }
          return false;
        }
        if (!seen.has(key(nx, nz))) { seen.add(key(nx, nz)); q.push([nx, nz]); }
      }
    }
    for (const c of added) h.log.push(`gate flank ${plugT}@${c}`);
    return true;
  };
  if (tryEdge(th, G)) return [th.slice(), G.slice()];
  if (o.next && (!o.near || o.near(G)) && tryEdge(G, o.next)) return [G.slice(), o.next.slice()];
  return null;
}

export function faceRamps(level, h, o = {}) {
  const key = h.key, budget = o.budget ?? 3, edits = [];
  const v = level.view || {}, pi = ((v.pitch ?? 35.264) * Math.PI) / 180, yi = ((v.yaw ?? 45) * Math.PI) / 180, tH = v.tileH ?? 1;
  const cam = [Math.cos(pi) * Math.sin(yi), Math.sin(pi), Math.cos(pi) * Math.cos(yi)];
  const faces = (d) => DIRS[d][0] * tH * cam[0] + cam[1] + DIRS[d][1] * tH * cam[2] > 0.05;
  const away = (c) => c?.s === "ramp" && !faces(c.d);
  const flat = (c) => h.land(c) && c.s !== "ramp" && c.s !== "bridge";
  const lost = () => reachability({ ...level, blocked: h.blockedSet() }).missing.length;
  const route0 = h.approach({ walkOnly: true });
  const ri = route0.findIndex(([x, z]) => away(h.cell(x, z)));
  if (ri < 1 || ri >= route0.length - 1) return edits;
  const [rx, rz] = route0[ri], R = h.cell(rx, rz), m0 = lost();
  const hiOf = (x, z, d) => [x - DIRS[d][0], z - DIRS[d][1]], loOf = (x, z, d) => [x + DIRS[d][0], z + DIRS[d][1]];
  const open = (x, z) => !h.decorAt(x, z).length && !h.isFig(x, z);
  const small = (x, z) => !h.isFig(x, z) && h.decorAt(x, z).every((d) => d !== h.lead && !d.watch && h.footprint(d).length === 1 && (CATALOG[d.t]?.height ?? 1) < 1.5);
  const clear = (x, z) => h.removeDecor((d) => h.footprint(d).some(([a, b]) => a === x && b === z));
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const C = h.cell(x, z);
    if (!flat(C) || C.h < 2 || !small(x, z) || (x === level.spawn[0] && z === level.spawn[1])) continue;
    for (const d of Object.keys(DIRS).filter(faces)) {
      const hi = h.cell(...hiOf(x, z, d)), lo = h.cell(...loOf(x, z, d));
      if (!flat(hi) || hi.h !== C.h || !flat(lo) || lo.h !== C.h - 1 || !small(...loOf(x, z, d)) || !small(...hiOf(x, z, d))) continue;
      const S = h.snapshot();
      h.set(rx, rz, { h: R.h - 1, s: R.m || "sand" });
      clear(x, z); clear(...loOf(x, z, d)); clear(...hiOf(x, z, d));
      h.set(x, z, { h: C.h, s: "ramp", d, m: C.s });
      const extra = [];
      for (const [mx, mz] of reachability({ ...level, blocked: h.blockedSet() }).missing) {
        const M = h.cell(mx, mz);
        if (extra.length >= budget - 2 || !flat(M) || M.h < 2) continue;
        h.set(mx, mz, { ...M, h: M.h - 1 });
        extra.push([mx, mz]);
      }
      const r = h.approach({ walkOnly: true });
      const ok = r.length && lost() <= m0 && r.some(([a, b]) => route0.slice(ri + 1).some(([c, e]) => c === a && e === b)) && !r.some(([a, b]) => away(h.cell(a, b)));
      const keeps = route0.slice(ri + 2).every(([a, b]) => r.some(([c, e]) => c === a && e === b));
      const score = r.length + (keeps ? 0 : 100);
      if (ok && (!best || score < best.score)) best = { x, z, d, score, extra };
      h.restore(S);
    }
  }
  if (!best) { h.log.push(`faceRamps: no camera-facing climb replaces ${rx},${rz}`); return edits; }
  const edit = (x, z, to, kind) => { const c = h.cell(x, z); edits.push({ x, z, kind, from: { h: c.h, s: c.s }, to: { h: to.h, s: to.s } }); h.set(x, z, to); };
  edit(rx, rz, { h: R.h - 1, s: R.m || "sand" }, "lower");
  clear(best.x, best.z); clear(...loOf(best.x, best.z, best.d)); clear(...hiOf(best.x, best.z, best.d));
  edit(best.x, best.z, { h: h.cell(best.x, best.z).h, s: "ramp", d: best.d, m: h.cell(best.x, best.z).s }, "ramp");
  for (const [mx, mz] of best.extra) edit(mx, mz, { ...h.cell(mx, mz), h: h.cell(mx, mz).h - 1 }, "lower");
  const route = h.approach({ walkOnly: true });
  const onR = new Set(route.map(([a, b]) => key(a, b)));
  const upTo = route.findIndex(([a, b]) => a === best.x && b === best.z);
  const fronts = [[1, 0], [0, 1], [1, 1]].map(([a, b]) => [Math.sign(cam[0]) * a, Math.sign(cam[2]) * b]);
  for (const [qx, qz] of route.slice(0, upTo)) {
    for (const [a, b] of fronts) {
      if (edits.length >= budget) break;
      const nx = qx + a, nz = qz + b, N = h.cell(nx, nz), q = h.cell(qx, qz);
      if (!flat(N) || !flat(q) || N.h <= q.h || onR.has(key(nx, nz)) || !small(nx, nz) || (level.things || []).some((t) => t.x === nx && t.z === nz)) continue;
      const S = h.snapshot(), before = edits.length;
      clear(nx, nz);
      edit(nx, nz, { ...N, h: q.h }, "lower");
      const r = h.approach({ walkOnly: true });
      if (!r.length || lost() > m0 || r.length > route.length || r.some(([c, e]) => away(h.cell(c, e)))) { h.restore(S); edits.length = before; }
    }
  }
  level.edits = [...(level.edits || []), ...edits];
  h.log.push(`faceRamps ${edits.map((e) => `${e.kind} ${e.x},${e.z}`).join(", ")}`);
  return edits;
}

function thingPath(level, h, from, to) {
  const key = h.key, things = level.things || [];
  const base = new Set([...h.blockedSet(), ...things.filter((t) => t.kind === "bonfire" || t.kind === "chest").map((t) => key(t.x, t.z))]);
  const L1 = { ...level, blocked: base };
  const prev = new Map([[key(...from), null]]), q = [from];
  while (q.length) {
    const c = q.shift();
    if (c[0] === to[0] && c[1] === to[1]) { const out = []; for (let k = key(...c); k; k = prev.get(k)) out.unshift(k.split(",").map(Number)); return out; }
    for (const d of Object.keys(DIRS)) {
      if (!canStep(L1, c[0], c[1], d)) continue;
      const n = [c[0] + DIRS[d][0], c[1] + DIRS[d][1]];
      if (!prev.has(key(...n))) { prev.set(key(...n), key(...c)); q.push(n); }
    }
  }
  return null;
}

export function exitRoute(level, h) {
  const exit = (level.things || []).find((t) => t.kind === "elevator" && t.role === "exit");
  return (exit && thingPath(level, h, level.spawn, [exit.x, exit.z])) || h.approach({ walkOnly: true });
}

export function entryWalk(level, h, o = {}) {
  const things = level.things || [];
  const entry = things.find((t) => t.kind === "elevator" && t.role === "entry");
  const exit = things.find((t) => t.kind === "elevator" && t.role === "exit");
  const p = entry && exit && thingPath(level, h, o.from || [entry.x, entry.z], [exit.x, exit.z]);
  if (!p || p.length < 2) return [];
  let ti = Math.min(o.ahead ?? 6, p.length - 1);
  for (let i = 1; i <= ti; i++) if (h.cell(...p[i]).s === "ramp") { ti = i; break; }
  return p.slice(1, ti + 1);
}

export function backEntry(level, h, o = {}) {
  const key = h.key, things = level.things || [];
  const entry = things.find((t) => t.kind === "elevator" && t.role === "entry");
  const exit = things.find((t) => t.kind === "elevator" && t.role === "exit");
  const gate = things.find((t) => t.kind === "gate");
  if (!entry || !exit || !gate?.edge) return null;
  const [A, B] = gate.edge, dir = Object.keys(DIRS).find((d) => A[0] + DIRS[d][0] === B[0] && A[1] + DIRS[d][1] === B[1]);
  const behind = dir === "e" || dir === "s" ? A : B;
  const gateKeys = new Set([key(...A), key(...B)]);
  const base = new Set([...h.blockedSet(), ...things.filter((t) => t.kind === "bonfire" || t.kind === "chest").map((t) => key(t.x, t.z))]);
  const target = (from) => entryWalk(level, h, { ...o, from });
  const bad = (from) => { const w = target(from); return !w.length || w.some((c) => c[0] === behind[0] && c[1] === behind[1]); };
  if (!bad([entry.x, entry.z])) return null;
  const [sx, sz] = level.spawn;
  const md = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const sides = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const rimSide = (x, z) => sides.findIndex(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; });
  const shut = reachability({ ...level, blocked: new Set([...base, key(...gate.blocks?.[0] || B)]) });
  const cut = new Set(shut.missing.map(([x, z]) => key(x, z)));
  const small = (x, z) => h.decorAt(x, z).every((d) => d !== h.lead && !d.watch && d.gapX == null && h.footprint(d).length === 1 && (CATALOG[d.t]?.height ?? 1) < 1.5);
  const busy = (x, z) => things.some((t) => t.kind !== "watcher" && t.kind !== "gate" && t !== entry && ((t.x === x && t.z === z) || ((t.kind === "bonfire" || t.kind === "chest") && md([t.x, t.z], [x, z]) === 1)));
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z), k = key(x, z);
    if (!walkable(c) || h.isFig(x, z) || (x === sx && z === sz) || busy(x, z) || !small(x, z) || cut.has(k) || gateKeys.has(k)) continue;
    const d = md([x, z], [sx, sz]), side = rimSide(x, z);
    if (side < 0 || d < 1 || d > (o.max ?? 7) || md([x, z], [exit.x, exit.z]) < 4 || bad([x, z])) continue;
    const score = d + (side === entry.rot ? 0 : 1) + 0.5 * md([x, z], [entry.x, entry.z]);
    if (!best || score < best.score) best = { x, z, side, score };
  }
  if (!best) { h.log.push(`backEntry: no rim cell keeps the gate out of the landing from ${entry.x},${entry.z}`); return null; }
  const was = [entry.x, entry.z];
  h.removeDecor((d) => h.footprint(d).some(([a, b]) => a === best.x && b === best.z));
  entry.x = best.x; entry.z = best.z; entry.rot = best.side;
  h.log.push(`backEntry ${was} -> ${best.x},${best.z}: the landing from ${was} ended on gate cell ${target(was).slice(-1)[0]}`);
  return [best.x, best.z];
}

export function orphanPosts(level, h) {
  const gates = (level.things || []).filter((t) => t.kind === "gate").flatMap((t) => [...(t.blocks || []), ...(t.threshold || []), ...(t.edge || [])]);
  const live = new Set(gates.map(([x, z]) => h.key(x, z)));
  const gone = [];
  const n = h.removeDecor((d) => { const o = d.gapX != null && d !== h.lead && !live.has(h.key(d.gapX, d.gapZ)); if (o) gone.push(`${d.t}@${d.x},${d.z}`); return o; });
  if (n) h.log.push(`orphan posts dropped: ${gone.join(" ")} (gate left ${gates.map((c) => c.join(",")).join(" ")})`);
  return n;
}

export function floorClear(level, h, cells, o = {}) {
  const key = h.key, min = o.min ?? 0.3, keep = new Set(cells.map(([x, z]) => key(x, z)));
  const onR = new Set([...exitRoute(level, h), ...entryWalk(level, h)].map(([x, z]) => key(x, z)));
  const [sx, sz] = level.spawn;
  const things = level.things || [];
  const flat = (c) => walkable(c) && c.s !== "bridge";
  const lid = (d) => CATALOG[d.t]?.passable && d !== h.lead && !d.watch && d.gapX == null && h.footprint(d).length === 1 && (CATALOG[d.t].height ?? 1) >= min && !/stepping|road/.test(d.t);
  const moved = [], dropped = [];
  for (const [x, z] of cells) for (const d of h.decorAt(x, z).filter(lid)) {
    const c = h.cell(x, z);
    const to = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([a, b]) => [x + a, z + b]).find(([a, b]) => { const n = h.cell(a, b); return flat(n) && n.h === c.h && !h.isFig(a, b) && !h.decorAt(a, b).length && !keep.has(key(a, b)) && !onR.has(key(a, b)) && !(a === sx && b === sz) && !things.some((t) => t.x === a && t.z === b); });
    if (to) { moved.push(`${d.t} ${x},${z} -> ${to}`); d.x = to[0]; d.z = to[1]; }
    else { dropped.push(`${d.t}@${x},${z}`); h.removeDecor((e) => e === d); }
  }
  if (moved.length || dropped.length) h.log.push(`floorClear: moved ${moved.join("; ") || "none"}; dropped ${dropped.join(" ") || "none"}`);
  return moved.length + dropped.length;
}

export function placeThings(level, h, o = {}) {
  const key = h.key, P = level.palette || {};
  const lead = h.lead && level.decor.includes(h.lead) ? h.lead : level.decor.find((d) => kindOf(P, d.t) === "lead");
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
  const frail = (c, extra = []) => {
    const m0 = reachWith([c, ...extra]).missing.length;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => free(c[0] + a, c[1] + b)).reduce((n, [a, b]) => n + (reachWith([c, ...extra, [c[0] + a, c[1] + b]]).missing.length > m0 + 1 ? 1 : 0), 0);
  };
  const sides4 = (c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => { const n = h.cell(c[0] + a, c[1] + b); return walkable(n) && n.h === h.cell(...c).h && !base.has(key(c[0] + a, c[1] + b)) && !h.isFig(c[0] + a, c[1] + b); }).length;
  let bon = o.bonfire && free(...o.bonfire) && !onR.has(key(...o.bonfire)) && md(o.bonfire, [sx, sz]) <= 3 && sides4(o.bonfire) >= 1 && keeps([o.bonfire]) ? o.bonfire : null;
  for (const k4 of [2, 1]) for (const c of cand.filter((c) => md(c, [sx, sz]) <= 3 && !cut.has(key(...c)) && sides4(c) >= k4).sort((a, b) => (frail(a) - frail(b)) || (sides4(b) - sides4(a)) || (near(...a) - near(...b)) || (Math.abs(md(a, [sx, sz]) - 2) - Math.abs(md(b, [sx, sz]) - 2)))) {
    if (bon || !keeps([c])) continue;
    bon = c;
    break;
  }
  if (bon) out.push({ id: "b1", kind: "bonfire", x: bon[0], z: bon[1], rot: 0 });
  const idxOf = (x, z) => { let bi = 0, bd = Infinity; route.forEach(([a, b], i) => { const d = Math.abs(a - x) + Math.abs(b - z); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const want = gi > 0 ? Math.round(gi * 0.6) : Math.round(route.length / 2);
  let chest = o.chest && free(...o.chest) && !onR.has(key(...o.chest)) && !cut.has(key(...o.chest)) && sides4(o.chest) >= 1 && keeps(bon ? [o.chest, bon] : [o.chest]) ? o.chest : null;
  for (const [far, gap, k4] of [[2, 3, 2], [3, 2, 2], [4, 2, 2], [2, 3, 1], [4, 2, 1]]) {
    if (chest) break;
    for (const c of cand.filter((c) => near(...c) >= 1 && near(...c) <= far && !cut.has(key(...c)) && Math.max(Math.abs(c[0] - sx), Math.abs(c[1] - sz)) >= 2 && sides4(c) >= k4 && (!bon || Math.max(Math.abs(c[0] - bon[0]), Math.abs(c[1] - bon[1])) >= gap)).sort((a, b) => (frail(a, bon ? [bon] : []) - frail(b, bon ? [bon] : [])) || (near(...a) - near(...b)) || (Math.abs(idxOf(...a) - want) - Math.abs(idxOf(...b) - want)))) {
      if (!keeps(bon ? [c, bon] : [c])) continue;
      chest = c;
      break;
    }
  }
  if (chest) {
    const r = route[idxOf(...chest)];
    const dx = Math.sign(r[0] - chest[0]), dz = Math.sign(r[1] - chest[1]);
    const rot = Math.max(0, FACE.findIndex(([a, b]) => a === (dz ? 0 : dx) && b === dz));
    out.push({ id: "c1", kind: "chest", x: chest[0], z: chest[1], rot, text: o.chestText || "Star-dusted sleeve. Still warm from the frankfurter's spell." });
  }
  if (lead) {
    const th = gi > 0 ? route[gi - 1] : route[Math.max(0, route.length - 3)];
    const far = Math.min(Infinity, ...[bon, chest].filter(Boolean).map(([x, z]) => Math.hypot(x + 0.5 - fc[0], z + 0.5 - fc[1]) - 1.6));
    const radius = +Math.max(Math.hypot(th[0] + 0.5 - fc[0], th[1] + 0.5 - fc[1]) + (o.margin ?? 0.6), Math.min(o.radius ?? 6, far)).toFixed(2);
    lead.watch = "w1";
    out.push({ id: "w1", kind: "watcher", x: lead.x, z: lead.z, size: [fw, fd], radius });
    if (G) {
      const [px] = route[gi - 1];
      const near = (c) => Math.hypot(c[0] + 0.5 - fc[0], c[1] + 0.5 - fc[1]) <= radius - 0.2;
    const e = sealGate(level, h, G, th, base, o.plug || Object.keys(P.props || {}).find((q) => /spire|crag|rock/.test(q)) || "rock", out, { next: route[gi + 1], near });
    const F = e ? e[1] : G;
    out.push({ id: "g1", kind: "gate", x: F[0], z: F[1], span: (e ? e[0][0] : px) !== F[0] ? "z" : "x", blocks: [F], open: "watcher:w1", threshold: [e ? e[0] : th], ...(e ? { edge: e } : level.decor.some((q) => q.gapX === G[0] && q.gapZ === G[1]) ? { frame: false, width: 1.5, height: 1.5 } : {}) });
    h.log.push(e ? `gate edge ${e[0]} | ${e[1]}` : `gate ${G} kept as a cell gate: no edge without a way around`);
    }
  }
  const figD = (x, z) => Math.min(...fig.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
  const taken = (x, z) => out.some((t) => t.x === x && t.z === z) || (chest && x === chest[0] && z === chest[1]) || (bon && x === bon[0] && z === bon[1]);
  const rimSide = (x, z) => SIDES.findIndex(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; });
  const rimAt = (score) => {
    const rim = [];
    for (const [x, z] of cand) {
      if (taken(x, z)) continue;
      const side = rimSide(x, z);
      if (side < 0) continue;
      const sc = score(x, z, side);
      if (sc != null) rim.push([x, z, side, sc]);
    }
    return rim.sort((a, b) => a[3] - b[3])[0] || null;
  };
  const exit = rimAt((x, z, side) => {
    if (G && !cut.has(key(x, z))) return null;
    return (side === 2 || side === 3 ? 0 : 3) + Math.abs(figD(x, z) - 2.5) + (h.cell(x, z).s === h.surf.path ? 1 : 0) - 0.05 * md([x, z], [sx, sz]);
  });
  if (exit) out.push({ id: "e1", kind: "elevator", role: "exit", x: exit[0], z: exit[1], rot: exit[2] });
  const entryAt = (gap) => rimAt((x, z, side) => {
    const d = md([x, z], [sx, sz]);
    if (d > 4 || d < 1 || cut.has(key(x, z)) || (exit && md([x, z], exit) < 4)) return null;
    if (bon && Math.max(Math.abs(x - bon[0]), Math.abs(z - bon[1])) < gap) return null;
    return d + (side === 2 || side === 3 ? 0 : 1.5) + (h.cell(x, z).s === h.surf.path ? 1 : 0);
  });
  const entry = entryAt(2) || entryAt(1);
  if (entry) out.push({ id: "e0", kind: "elevator", role: "entry", x: entry[0], z: entry[1], rot: entry[2] });
  level.things = out;
  if (o.look) level.palette.things = o.look;
  const solid = out.filter((t) => t.kind === "bonfire" || t.kind === "chest").map((t) => [t.x, t.z]);
  const rOpen = missing(reachWith(solid)), rClosed = missing(reachWith([G, ...solid]));
  const besideOk = (m, t) => t && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => walkable(h.cell(t.x + a, t.z + b)) && !base.has(key(t.x + a, t.z + b)) && !m.has(key(t.x + a, t.z + b)) && !solid.some(([p, q]) => p === t.x + a && q === t.z + b));
  const el = out.find((t) => t.kind === "elevator" && t.role === "exit");
  const en = out.find((t) => t.kind === "elevator" && t.role === "entry");
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
    entryOpen: !!en && !rClosed.has(key(en.x, en.z)),
    entryToSpawn: en ? md([en.x, en.z], [sx, sz]) : null,
  };
  h.log.push(`things ${out.map((t) => `${t.role || t.kind}@${t.x},${t.z}`).join(" ")} ${JSON.stringify(ok)}`);
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

export function flattenBump(level, h, route = exitRoute(level, h)) {
  const v = level.view || {}, pi = ((v.pitch ?? 35.264) * Math.PI) / 180, yi = ((v.yaw ?? 45) * Math.PI) / 180, tH = v.tileH ?? 1;
  const cam = [Math.cos(pi) * Math.sin(yi), Math.sin(pi), Math.cos(pi) * Math.cos(yi)];
  const faces = (d) => DIRS[d][0] * tH * cam[0] + cam[1] + DIRS[d][1] * tH * cam[2] > 0.05;
  const key = (c) => c.join(",");
  for (let i = 2; i < route.length - 1; i++) {
    const [down, top, up] = [route[i], route[i - 1], route[i - 2]].map((c) => h.cell(...c));
    if (down?.s !== "ramp" || faces(down.d) || up?.s !== "ramp" || !faces(up.d)) continue;
    if (!h.land(top) || top.s === "ramp" || top.h !== down.h || up.h !== down.h) continue;
    const cells = [route[i - 2], route[i - 1], route[i]];
    if (cells.some((c) => h.decorAt(...c).length || (level.things || []).some((t) => t.x === c[0] && t.z === c[1]))) continue;
    const S = h.snapshot(), m0 = reachability({ ...level, blocked: h.blockedSet() }).missing.length, edits = [];
    for (const c of cells) {
      const was = h.cell(...c), to = { h: down.h - 1, s: was.s === "ramp" ? was.m || top.s : was.s };
      edits.push({ x: c[0], z: c[1], kind: "lower", from: { h: was.h, s: was.s }, to: { h: to.h, s: to.s } });
      h.set(c[0], c[1], to);
    }
    const r = exitRoute(level, h);
    if (!r.length || reachability({ ...level, blocked: h.blockedSet() }).missing.length > m0 || !cells.every((c) => r.some((q) => key(q) === key(c)))) { h.restore(S); h.log.push(`flattenBump: ${cells.map(key).join(" ")} kept, flattening cuts the route`); return []; }
    level.edits = [...(level.edits || []), ...edits];
    h.log.push(`flattenBump lower ${cells.map(key).join(", ")}`);
    return edits;
  }
  return [];
}

export const GROW = { "wizard-medium": [{"kind":"plateau","side":"n","at":[10,1],"size":[2,3],"tier":2,"decor":[{"t":"rock","u":5,"v":1},{"t":"rock","u":4,"v":-1}]},{"kind":"dock","side":"w","at":[3,4],"len":2,"decor":[{"t":"brush-flick-spire","u":2}]},{"kind":"walkway","side":"n","at":[14,1],"len":3,"islet":[2,2],"causeway":true,"decor":[{"t":"brush-flick-spire","u":5,"v":1}]},{"kind":"dock","side":"s","at":[8,10],"len":2,"decor":[]}] };
export const outgrow = (level, o) => [...growOut(level, GROW[level.name], o), ...echo(level, PIN[level.name]?.back), ...widen(level, PIN[level.name]?.grow)];
