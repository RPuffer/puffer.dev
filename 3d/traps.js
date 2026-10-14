import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "./baker.js";
import { applyXray } from "./xray.js";
import { applyMotion } from "./motion.js";
import { ramp } from "./prims.js";
import { surfaceY, liftLevel } from "./terrain.js";
import { DIRS } from "../core/level.js";
import { BEAT } from "../core/traps/kinds.js";
import { lookOf, chestBase, chestLid, leverBase, leverArm } from "./things.js";

const pal = (hex) => { const r = ramp(hex); return tone(r[2], r[1], r[0]); };
const C = {
  iron: "#5a5866", ironDark: "#34323c", steel: "#c9cfd8", stone: "#b9b1a6", stoneDark: "#857c72", slab: "#d6cbb8",
  bone: "#ece2c8", boneDark: "#b8aa86", wood: "#9a6436", rust: "#a8532c", brute: "#7f8f5a", bruteDark: "#55603c", hide: "#8a5a3a",
  plate: "#cfc3ad", gold: "#f0c438", ember: "#ff8a3d", crack: "#3a3036", void: "#14121a", coil: "#c46a2c", disc: "#8fa0b8", ink: "#2a1f33", ice: "#cdeeff", iceDeep: "#8fd0f0", iceLine: "#ffffff",
};

const mat = () => applyMotion(applyXray(bakedMaterial(), false));
function bake(build, light) {
  const B = new Baker(light);
  build(B);
  const m = new THREE.Mesh(B.geometry(), mat());
  m.userData.noMerge = true;
  return m;
}
const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

function spikesBase(B, k) {
  B.box(0.86, 0.03, 0.86, pal(C.ironDark), 0, 0, 0);
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, 0]]) B.cyl(0.075, 0.035, pal(C.ink), x, 0.005, z, 6);
}
function spikeTips(B) {
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, 0]]) B.cone(0.07, 0, 0.42, pal(C.steel), x, 0, z, 5);
}
function slab(B, w, h, col, y = 0) { B.rbox(w, h, w, 0.04, pal(col), 0, y, 0); }
function arrow(B) {
  B.box(0.045, 0.045, 0.56, pal(C.wood), 0, 0, 0);
  B.rot([1, 0, 0], Math.PI / 2, 0, 0, 0.26);
  B.cone(0.08, 0, 0.18, pal(C.steel), 0, 0, 0, 4);
  B.pop();
  B.box(0.14, 0.015, 0.1, pal(C.bone), 0, 0, -0.24);
  B.box(0.015, 0.14, 0.1, pal(C.bone), 0, 0, -0.24);
}
function arrowSlot(B) {
  B.rbox(0.26, 0.56, 0.26, 0.04, pal(C.stone), 0, 0, 0);
  B.rbox(0.3, 0.06, 0.3, 0.03, pal(C.stoneDark), 0, 0.56, 0);
  B.box(0.16, 0.07, 0.03, pal(C.ink), 0, 0.36, 0.125);
}
function brute(B, part) {
  const body = pal(C.brute), dark = pal(C.bruteDark), hide = pal(C.hide), bone = pal(C.bone);
  if (part === "leg") { B.rbox(0.2, 0.5, 0.22, 0.05, dark, 0, -0.5, 0); B.rbox(0.26, 0.12, 0.34, 0.04, hide, 0, -0.58, 0.05); return; }
  B.rbox(0.2, 0.5, 0.22, 0.05, dark, -0.15, 0, 0);
  B.rbox(0.26, 0.12, 0.34, 0.04, hide, -0.15, 0, 0.05);
  B.rbox(0.62, 0.6, 0.5, 0.12, body, 0, 0.45, 0);
  B.rbox(0.66, 0.2, 0.54, 0.06, hide, 0, 0.45, 0);
  B.rbox(0.36, 0.32, 0.34, 0.08, body, 0, 1.02, 0.04);
  B.box(0.24, 0.05, 0.04, pal(C.ink), 0, 1.15, 0.21);
  for (const s of [-1, 1]) {
    B.cone(0.06, 0, 0.22, bone, s * 0.16, 1.28, 0.02, 4);
    B.rbox(0.18, 0.5, 0.18, 0.05, body, s * 0.42, 0.55, 0.04);
    B.rbox(0.2, 0.16, 0.2, 0.05, dark, s * 0.42, 0.48, 0.04);
  }
}
function chariot(B) {
  const bone = pal(C.bone), dark = pal(C.boneDark), wood = pal(C.wood), iron = pal(C.iron);
  B.rbox(0.7, 0.36, 0.6, 0.04, wood, 0, 0.32, 0);
  B.rbox(0.74, 0.08, 0.64, 0.03, iron, 0, 0.66, 0);
  B.at(0, 0.34, 0, 0, () => {
    B.rot([0, 0, 1], Math.PI / 2, 0, 0, 0);
    for (const s of [-1, 1]) { B.cyl(0.34, 0.08, iron, 0, s * 0.38, 0, 10); B.cyl(0.12, 0.1, dark, 0, s * 0.39, 0, 6); }
    B.pop();
  });
  B.rbox(0.12, 0.5, 0.12, 0.03, bone, 0, 0.7, -0.15);
  B.ball(0.15, bone, 0, 1.3, -0.15, 1, 0);
  B.box(0.18, 0.04, 0.03, pal(C.ink), 0, 1.31, -0.01);
  B.rbox(0.42, 0.3, 0.1, 0.03, dark, 0, 0.95, -0.15);
  B.box(0.08, 0.08, 0.7, wood, 0, 0.45, 0.6);
  B.ball(0.2, bone, 0, 0.6, 0.98, 0.8, 0);
  for (const s of [-1, 1]) B.cone(0.05, 0, 0.18, dark, s * 0.12, 0.72, 0.98, 4);
}
function rut(B, n) {
  for (const s of [-0.28, 0.28]) B.box(0.09, 0.012, n, pal(C.crack), s, 0, (n - 1) / 2);
}
function cracks(B, stage, seed) {
  const r = (i) => ((Math.sin(seed * 12.9 + i * 78.2) * 43758.5) % 1 + 1) % 1;
  const n = stage === 1 ? 2 : stage === 2 ? 5 : 8;
  for (let i = 0; i < n; i++) B.at((r(i) - 0.5) * 0.6, 0, (r(i + 9) - 0.5) * 0.6, r(i + 3) * Math.PI, () => B.box(0.04, 0.012, 0.22 + r(i + 5) * 0.3, pal(C.crack), 0, 0, 0));
}
function pressPlate(B, col) { B.rbox(0.66, 0.06, 0.66, 0.04, pal(col), 0, 0, 0); B.rbox(0.44, 0.02, 0.44, 0.03, pal(C.stoneDark), 0, 0.06, 0); }
function lampPost(B) { B.rbox(0.12, 0.62, 0.12, 0.03, pal(C.iron), 0, 0, 0); B.box(0.22, 0.05, 0.22, pal(C.ironDark), 0, 0.62, 0); }
function springBase(B) {
  B.box(0.84, 0.012, 0.84, pal(C.ironDark), 0, 0, 0);
}
function springCoil(B) {
  for (let i = 0; i < 4; i++) B.cyl(0.2 - (i % 2) * 0.05, 0.05, pal(C.coil), 0, i * 0.06, 0, 8);
}
function turntable(B) {
  B.cyl(0.46, 0.05, pal(C.disc), 0, 0, 0, 16);
  B.cyl(0.08, 0.02, pal(C.ink), 0, 0.05, 0, 8);
  for (let i = 0; i < 4; i++) B.at(0, 0.05, 0, (i * Math.PI) / 2, () => { B.box(0.06, 0.012, 0.22, pal(C.gold), 0.28, 0, 0); B.cone(0.08, 0, 0.1, pal(C.gold), 0.28, 0, 0.14, 3); });
}
function iceTile(B, seed) {
  B.rbox(0.98, 0.05, 0.98, 0.03, pal(C.iceDeep), 0, 0, 0);
  B.rbox(0.9, 0.03, 0.9, 0.03, pal(C.ice), 0, 0.05, 0);
  const r = (k) => { const s = Math.sin((seed + 1) * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  for (let k = 0; k < 2; k++) B.box(0.34 + r(k) * 0.3, 0.012, 0.03, pal(C.iceLine), (r(k + 3) - 0.5) * 0.5, 0.08, (r(k + 6) - 0.5) * 0.5);
}
function star(B) { for (let i = 0; i < 5; i++) B.at(0, 0, 0, (i * Math.PI * 2) / 5, () => B.cone(0.06, 0, 0.26, pal(C.gold), 0, 0, 0, 3)); }

function honkPlate(B) { B.cyl(0.24, 0.035, pal(C.stoneDark), 0, 0, 0, 10); B.cyl(0.17, 0.03, pal(C.gold), 0, 0.035, 0, 10); }
function goose(B) {
  const w = pal("#f4f1ea"), o = pal("#f08a24");
  B.ball(0.24, w, 0, 0.26, 0, 0.75, 1);
  B.cone(0.1, 0, 0.18, w, 0, 0.24, -0.26, 4);
  B.rbox(0.09, 0.34, 0.09, 0.04, w, 0, 0.3, 0.14);
  B.ball(0.1, w, 0, 0.68, 0.17, 1, 1);
  B.box(0.06, 0.05, 0.14, o, 0, 0.66, 0.3);
  for (const s of [-1, 1]) { B.box(0.035, 0.12, 0.035, o, s * 0.08, 0.02, 0); B.box(0.02, 0.02, 0.02, pal(C.ink), s * 0.06, 0.71, 0.24); }
}
function scuffMark(B) {
  B.box(0.34, 0.008, 0.06, pal("#e8d27a"), 0.05, 0, 0.08);
  B.box(0.2, 0.008, 0.05, pal("#c9b45a"), -0.1, 0, -0.06);
  B.box(0.09, 0.008, 0.09, pal("#6b5320"), 0.2, 0, 0.06);
}
function dustPile(B, seed) {
  const r = (i) => ((Math.sin(seed * 31.7 + i * 12.3) * 9137.5) % 1 + 1) % 1;
  for (let i = 0; i < 5; i++) B.ball(0.07 + r(i) * 0.06, pal("#b8a88c"), (r(i + 3) - 0.5) * 0.6, 0.01, (r(i + 7) - 0.5) * 0.6, 0.4, 0);
}
function teeth(B) {
  for (let i = 0; i < 6; i++) B.cone(0.035, 0, 0.09, pal(C.bone), -0.25 + i * 0.1, 0, 0.2, 3);
  B.box(0.3, 0.03, 0.2, pal("#d0405a"), 0, 0.02, 0.05);
}
function tail(B) { B.cone(0.05, 0, 0.26, pal(C.wood), 0, 0, 0, 4); B.ball(0.05, pal(C.gold), 0, 0.26, 0, 1, 0); }
function campfire(B) {
  for (let i = 0; i < 6; i++) B.ball(0.08, pal(C.stoneDark), Math.cos(i) * 0.26, 0.02, Math.sin(i) * 0.26, 0.6, 0);
  for (const a of [0.5, -0.6]) B.at(0, 0.06, 0, a, () => B.box(0.42, 0.08, 0.08, pal(C.wood), 0, 0, 0));
  B.box(0.3, 0.32, 0.01, pal(C.ember), 0, 0.08, 0);
  B.box(0.16, 0.2, 0.012, pal("#ffd75a"), 0, 0.08, 0.005);
}
function holeTile(B) { B.box(0.94, 0.02, 0.94, pal(C.void), 0, 0, 0); }
function seam(B) {
  B.box(0.92, 0.012, 0.03, pal(C.ink), 0, 0, 0.45);
  B.box(0.92, 0.012, 0.03, pal(C.ink), 0, 0, -0.45);
  B.box(0.03, 0.012, 0.92, pal(C.ink), 0.45, 0, 0);
  B.box(0.03, 0.012, 0.92, pal(C.ink), -0.45, 0, 0);
  B.box(0.18, 0.012, 0.03, pal("#d04a6a"), 0.22, 0, 0.3);
  B.box(0.03, 0.012, 0.1, pal("#d04a6a"), 0.3, 0, 0.26);
}
function mossStone(B, seed) {
  const r = (i) => ((Math.sin(seed * 17.1 + i * 41.3) * 5113.1) % 1 + 1) % 1;
  B.at((r(1) - 0.5) * 0.1, 0, (r(2) - 0.5) * 0.1, (r(3) - 0.5) * 0.5, () => { B.rbox(0.78, 0.05, 0.74, 0.06, pal("#8f9a86"), 0, 0, 0); B.box(0.3, 0.012, 0.22, pal("#6f9a4a"), (r(4) - 0.5) * 0.3, 0.05, (r(5) - 0.5) * 0.3); });
}
function signPost(B, col) {
  B.box(0.07, 0.8, 0.07, pal(C.wood), 0, 0, 0);
  B.rbox(0.56, 0.3, 0.06, 0.03, pal(col), 0, 0.62, 0);
  for (let i = 0; i < 3; i++) B.box(0.36 - i * 0.08, 0.025, 0.01, pal(C.ink), 0, 0.82 - i * 0.07, 0.035);
}
function coinMesh(B) { B.cyl(0.16, 0.04, pal(C.gold), 0, 0, 0, 12); B.cyl(0.1, 0.045, pal("#ffe07a"), 0, 0, 0, 12); }
function glove(B) { B.ball(0.18, pal("#d8343c"), 0, 0, 0.22, 1, 1); B.box(0.12, 0.12, 0.08, pal(C.bone), 0, 0, 0.03); for (let i = 0; i < 3; i++) B.box(0.05, 0.05, 0.08, pal(C.iron), 0, 0, -0.06 - i * 0.08); }
function faithSlab(B) { B.rbox(0.92, 0.18, 0.92, 0.06, pal(C.slab), 0, -0.18, 0); B.box(0.6, 0.012, 0.6, pal(C.stone), 0, 0.001, 0); }
function scorch(B, seed) {
  const r = (i) => ((Math.sin(seed * 23.3 + i * 7.7) * 7331.3) % 1 + 1) % 1;
  for (let i = 0; i < 3; i++) B.cyl(0.08 + r(i) * 0.12, 0.008, pal("#3c3032"), (r(i + 2) - 0.5) * 0.5, 0, (r(i + 5) - 0.5) * 0.5, 7);
}
function warnSign(B) {
  B.box(0.07, 0.7, 0.07, pal(C.wood), 0, 0, 0);
  B.at(0, 0.82, 0, 0, () => { B.rot([0, 0, 1], Math.PI / 4, 0, 0, 0); B.box(0.34, 0.34, 0.05, pal("#f0c438"), 0, -0.17, 0); B.pop(); });
  B.box(0.04, 0.16, 0.06, pal(C.ink), 0, 0.8, 0);
  B.box(0.04, 0.04, 0.06, pal(C.ink), 0, 0.72, 0);
}
function statue(B) {
  const s = pal(C.stone), d = pal(C.stoneDark);
  B.rbox(0.8, 0.22, 0.8, 0.05, d, 0, 0, 0);
  B.ball(0.3, s, 0, 0.58, 0, 1.15, 1);
  B.ball(0.24, s, 0, 1.05, 0.04, 1, 1);
  for (const x of [-1, 1]) { B.cone(0.08, 0, 0.24, s, x * 0.14, 1.2, 0, 4); B.box(0.05, 0.05, 0.03, d, x * 0.08, 1.08, 0.24); }
  B.cone(0.06, 0, 0.3, s, 0, 0.2, -0.3, 4);
}
function barrel(B) {
  B.at(0, 0, 0, 0, () => {
    B.rot([0, 0, 1], Math.PI / 2, 0, 0, 0);
    B.cyl(0.3, 0.7, pal(C.wood), 0, -0.35, 0, 10);
    for (const y of [-0.27, 0.23]) B.cyl(0.31, 0.04, pal(C.iron), 0, y, 0, 10);
    B.pop();
  });
}
function rewindGlyph(B) { for (const x of [-0.12, 0.12]) B.at(x, 0, 0, 0, () => { B.rot([0, 0, 1], Math.PI / 2, 0, 0, 0); B.cone(0.12, 0, 0.2, pal("#5fe3ff"), 0, -0.1, 0, 3); B.pop(); }); }
function plank(B) { B.rbox(0.94, 0.06, 0.24, 0.02, pal(C.wood), 0, 0, -0.32); B.rbox(0.94, 0.06, 0.24, 0.02, pal("#86562e"), 0, 0, -0.04); B.rbox(0.94, 0.06, 0.24, 0.02, pal(C.wood), 0, 0, 0.24); }
function gateBarsTrap(B, col) {
  for (const x of [-0.3, -0.1, 0.1, 0.3]) B.box(0.06, 1.1, 0.06, pal(col), x, 0, 0);
  for (const y of [0.15, 0.95]) B.box(0.72, 0.07, 0.07, pal(col), 0, y, 0);
}
function padlock(B) { B.rbox(0.26, 0.2, 0.12, 0.04, pal(C.gold), 0, 0, 0); B.box(0.04, 0.14, 0.04, pal(C.iron), -0.08, 0.2, 0); B.box(0.04, 0.14, 0.04, pal(C.iron), 0.08, 0.2, 0); B.box(0.2, 0.04, 0.04, pal(C.iron), 0, 0.3, 0); }
function pennant(B, col) { B.box(0.05, 1.1, 0.05, pal(C.wood), 0, 0, 0); }
function crate(B) { B.rbox(0.8, 0.7, 0.8, 0.04, pal(C.wood), 0, 0, 0); for (const y of [0.04, 0.6]) B.box(0.84, 0.06, 0.84, pal("#86562e"), 0, y, 0); B.box(0.84, 0.06, 0.06, pal("#86562e"), 0, 0.33, 0); }
function bell(B) { B.box(0.06, 0.7, 0.06, pal(C.iron), 0, 0, 0); B.box(0.36, 0.05, 0.06, pal(C.iron), 0.15, 0.7, 0); B.cone(0.14, 0.05, 0.2, pal(C.gold), 0.3, 0.45, 0, 8); }
function tileSlab(B, col) { B.rbox(0.86, 0.05, 0.86, 0.05, pal(col), 0, 0, 0); }
function eyeTotem(B) { B.rbox(0.5, 1.2, 0.5, 0.08, pal(C.stoneDark), 0, 0, 0); B.ball(0.3, pal(C.stone), 0, 1.45, 0, 1, 1); }
function glyphShape(B, g, col) {
  if (g === "circle") B.cyl(0.14, 0.04, pal(col), 0, 0, 0, 12);
  else if (g === "triangle") B.cyl(0.17, 0.04, pal(col), 0, 0, 0, 3);
  else B.box(0.24, 0.04, 0.24, pal(col), 0, 0, 0);
}
function waymarkPost(B) { B.rbox(0.18, 1.0, 0.18, 0.04, pal(C.stoneDark), 0, 0, 0); B.rbox(0.42, 0.42, 0.08, 0.04, pal(C.stone), 0, 0.9, 0); }
function arch(B) { for (const x of [-0.42, 0.42]) B.rbox(0.14, 1.2, 0.14, 0.03, pal(C.stone), x, 0, 0); B.rbox(1.0, 0.18, 0.18, 0.04, pal(C.stone), 0, 1.2, 0); }
function beltTile(B) { B.rbox(0.92, 0.06, 0.92, 0.04, pal(C.ironDark), 0, 0, 0); for (const x of [-0.3, 0, 0.3]) B.box(0.04, 0.01, 0.84, pal(C.iron), x, 0.06, 0); }
function beltArrow(B) { B.box(0.08, 0.02, 0.3, pal(C.gold), 0, 0, -0.06); B.rot([1, 0, 0], Math.PI / 2, 0, 0.01, 0.08); B.cone(0.14, 0, 0.2, pal(C.gold), 0, 0, 0, 3); B.pop(); }
function fuseBit(B) { B.box(0.06, 0.06, 1.0, pal("#3a3036"), 0, 0, 0); }
function ghostBlob(B) { B.ball(0.24, pal("#cfe8ff"), 0, 0.3, 0, 1.3, 1); B.ball(0.18, pal("#cfe8ff"), 0, 0.72, 0, 1, 1); }

export function buildTraps(state, style) {
  const L = state.level, view = state.view, light = style.light;
  const LL = liftLevel(L);
  const T = state.traps;
  const group = new THREE.Group();
  group.name = "traps";
  const items = [];
  const Y = (c) => surfaceY(LL, view, c[0], c[1]);
  const place = (m, c, dy = 0, rot = 0) => { m.position.set(c[0] + 0.5, Y(c) + dy, c[1] + 0.5); m.rotation.y = rot; group.add(m); return m; };
  const yawOf = (d) => Math.atan2(d[0], d[1]);
  const dirOf = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
  let fog = null, puff = null;
  const K = lookOf(style);
  const huds = [];
  const N4 = Object.values(DIRS);
  const yH = (h) => (h ?? 1) * view.tileH;
  const outline = (col) => { const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.94, 0.02, 0.94)), new THREE.LineBasicMaterial({ color: col })); m.visible = false; group.add(m); return m; };
  const puffs = (col) => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), glowMat(col, 0.85)); m.userData.a = (i / 6) * Math.PI * 2; g.add(m); }
    g.visible = false;
    group.add(g);
    return {
      show(c, u, dy = 0.3) {
        g.visible = !!c && u >= 0 && u < 1;
        if (!g.visible) return;
        for (const m of g.children) { m.position.set(c[0] + 0.5 + Math.sin(m.userData.a) * u * 0.6, Y(c) + dy + u * 0.4, c[1] + 0.5 + Math.cos(m.userData.a) * u * 0.6); m.scale.setScalar(1 + u * 1.4); m.material.opacity = 0.85 * (1 - u); }
      },
    };
  };
  const hallLook = (cells) => {
    cells.forEach((c, i) => place(bake((B) => scorch(B, i + c[0] * 3 + c[1] * 5), light), c, 0.004));
    const d = dirOf(cells[0], cells[1]);
    for (const [c, build, k] of [[cells[0], (B) => warnSign(B), -1], [cells[cells.length - 1], (B) => signPost(B, "#cfe8a8"), 1]]) {
      const s = bake(build, light);
      s.position.set(c[0] + 0.5 + d[0] * 0.3 * k + d[1] * 0.42, Y(c), c[1] + 0.5 + d[1] * 0.3 * k - d[0] * 0.42);
      s.rotation.y = yawOf([-d[0] * k, -d[1] * k]);
      group.add(s);
    }
  };
  const blockLook = (it, t, c) => {
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 1.0, 0.96)), new THREE.LineBasicMaterial({ color: "#5fe3ff", transparent: true }));
    place(box, c, 0.5);
    const pop = bake((B) => star(B), light);
    group.add(pop);
    it.update = () => {
      box.visible = !!(t.revealed || t.chalk);
      box.material.opacity = t.solid || t.disarmed ? 1 : 0.35;
      box.material.color.set(t.solid || t.disarmed ? "#5fe3ff" : "#f4efe4");
      pop.visible = t.star >= 0;
      if (pop.visible) { const s = 0.4 + t.star * 1.4; pop.scale.setScalar(s); pop.position.set(c[0] + 0.5, Y(c) + 0.9 + t.star * 0.5, c[1] + 0.5); pop.rotation.y = t.star * 6; }
    };
  };

  for (const t of T.list) {
    const it = { t, update: null };
    if (t.kind === "t03") {
      for (const c of t.cells) place(bake((B) => spikesBase(B), light), c, 0.004);
      const tips = t.cells.map((c) => place(bake((B) => spikeTips(B), light), c, -0.44));
      it.update = () => {
        const warn = !t.disarmed && t.beat === 1 ? 0.06 * Math.max(0, Math.sin((T.time % BEAT) / BEAT * Math.PI)) : 0;
        const up = t.disarmed ? 0 : t.up;
        for (const [i, m] of tips.entries()) m.position.y = Y(t.cells[i]) - 0.44 + up * 0.44 + warn;
      };
    } else if (t.kind === "t25") {
      const d = dirOf(t.cells[0], t.cells[1] || t.cells[0]);
      const away = t.cover ? [Math.sign(t.cells[0][0] - t.cover[0]) * Math.abs(d[1]), Math.sign(t.cells[0][1] - t.cover[1]) * Math.abs(d[0])] : [0, 0];
      const side = DIRS[t.side] || (away[0] || away[1] ? away : [-d[1], d[0]]);
      const c0 = t.cells[0];
      const plate = place(bake((B) => slab(B, 0.74, 0.07, C.slab), light), t.plate, 0.0);
      const post = bake((B) => arrowSlot(B), light);
      post.position.set(c0[0] + 0.5 - d[0] * 0.36 + side[0] * 0.36, Y(c0), c0[1] + 0.5 - d[1] * 0.36 + side[1] * 0.36);
      post.rotation.y = yawOf(d);
      group.add(post);
      const slitGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.03), glowMat(C.ember));
      slitGlow.position.set(0, 0.36, 0.12);
      post.add(slitGlow);
      const shot = bake((B) => arrow(B), light);
      shot.name = "t25-arrow";
      shot.rotation.y = yawOf(d);
      shot.scale.setScalar(1.5);
      group.add(shot);
      const lane = t.cells.length;
      const yAt = (s) => Y(t.cells[Math.max(0, Math.min(lane - 1, Math.round(s)))]);
      it.update = () => {
        plate.position.y = Y(t.plate) - (t.pressed ? 0.05 : 0);
        slitGlow.visible = !t.disarmed && (t.fireAt != null ? Math.floor(T.time * 12) % 2 === 0 : t.arrow != null);
        const s = t.arrow;
        shot.visible = s != null && !t.disarmed;
        if (!shot.visible) return;
        const out = Math.max(0, s - lane + 0.5);
        const lat = 0.15 + 0.21 * Math.max(0, Math.min(1, 0.5 - s));
        shot.position.set(c0[0] + 0.5 + d[0] * s + side[0] * lat, yAt(s) + 0.36 - out * out * 2, c0[1] + 0.5 + d[1] * s + side[1] * lat);
        shot.rotation.x = -out * 0.6;
      };
    } else if (t.kind === "t02") {
      const stages = t.cells.map((c, i) => [1, 2, 3].map((s) => { const m = place(bake((B) => cracks(B, s, i + c[0] * 7 + c[1] * 3), light), c, 0.006); m.visible = false; return m; }));
      const holes = t.cells.map((c) => { const m = place(bake((B) => { B.box(0.94, 0.02, 0.94, pal(C.void), 0, 0, 0); }, light), c, 0.008); m.visible = false; return m; });
      const debris = t.cells.flatMap((c, i) => [0, 1, 2].map((j) => { const m = place(bake((B) => B.rbox(0.28, 0.12, 0.24, 0.03, pal(C.stone), 0, 0, 0), light), c, 0); m.userData.c = c; m.userData.o = [(j - 1) * 0.25, ((i + j) % 3 - 1) * 0.2]; m.visible = false; return m; }));
      let fall = -1;
      T.on((e) => { if (e.trap === t && e.type === "collapse") fall = 0; if (e.type === "reset") fall = -1; });
      it.update = (dt) => {
        const k = t.broken ? 3 : Math.min(3, t.crossings || 0);
        stages.forEach((s) => s.forEach((m, i) => { m.visible = !t.broken && k >= i + 1; }));
        for (const h of holes) h.visible = !!t.broken;
        if (fall >= 0) fall += dt;
        for (const m of debris) {
          m.visible = fall >= 0 && fall < 1.6;
          const c = m.userData.c, o = m.userData.o;
          m.position.set(c[0] + 0.5 + o[0], Y(c) - 4 * fall * fall, c[1] + 0.5 + o[1]);
          m.rotation.x = fall * 4;
        }
      };
    } else if (t.kind === "t24") {
      const face = dirOf(t.boss, t.kick);
      const body = place(bake((B) => brute(B, "body"), light), t.boss, 0, yawOf(face));
      body.scale.setScalar(1.35);
      const leg = bake((B) => brute(B, "leg"), light);
      leg.position.set(0.15, 0.5, 0);
      body.add(leg);
      const bang = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), glowMat("#ff5a3d"));
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), glowMat("#ff5a3d"));
      bar.position.y = 0.22;
      bang.add(bar, dot);
      place(bang, t.boss, 2.1);
      const swoosh = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.62, 16, 1, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      place(swoosh, t.kick, 0.45, yawOf(face) - Math.PI / 2);
      it.update = () => {
        const f = t.disarmed ? 0 : t.leg || 0;
        leg.rotation.x = f <= 1 ? f * 1.3 : 1.3 - (f - 1) * 3;
        const hop = t.state === "recover" ? Math.abs(Math.sin(t.timer * 8)) * 0.3 * Math.max(0, 1 - t.timer / 1.4) : 0;
        body.position.y = Y(t.boss) + hop + (t.state === "windup" ? 0.08 * f : 0);
        body.rotation.x = t.state === "windup" ? -0.25 * f : t.state === "kick" ? 0.2 : 0;
        body.rotation.z = t.state === "recover" ? Math.sin(t.timer * 8) * 0.2 : 0;
        bang.visible = t.state === "windup" && Math.floor(t.timer * 10) % 2 === 0;
        bang.rotation.y = -body.rotation.y;
        swoosh.material.opacity = t.state === "kick" ? 0.85 * (1 - t.timer / 0.25) : 0;
      };
    } else if (t.kind === "t26") {
      const d = dirOf(t.cells[0], t.cells[1]);
      const ruts = place(bake((B) => rut(B, t.cells.length), light), t.cells[0], 0.006, yawOf(d));
      const plate = place(bake((B) => pressPlate(B, C.bone), light), t.plate, 0.0);
      const car = bake((B) => chariot(B), light);
      car.rotation.y = yawOf(d);
      group.add(car);
      it.update = () => {
        plate.position.y = Y(t.plate) - (t.awake ? 0.04 : 0) + (t.awake && t.pos == null ? (Math.random() - 0.5) * 0.02 : 0);
        car.visible = t.pos != null;
        if (t.pos == null) return;
        const c0 = t.cells[0], u = t.pos;
        const end = t.cells.length - 1;
        const at = [c0[0] + d[0] * u, c0[1] + d[1] * u];
        const cl = [Math.max(0, Math.min(end, Math.round(u)))].map((i) => t.cells[i])[0];
        const over = u > end + 0.5 ? (u - end - 0.5) : 0;
        car.position.set(at[0] + 0.5, Y(cl) - over * over * 3, at[1] + 0.5);
        car.rotation.x = over * 0.8;
      };
      void ruts;
    } else if (t.kind === "t21") {
      const c = t.cells[0];
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 1.0, 0.96)), new THREE.LineBasicMaterial({ color: "#5fe3ff", transparent: true }));
      place(box, c, 0.5);
      const pop = bake((B) => star(B), light);
      group.add(pop);
      it.update = () => {
        box.visible = !!(t.revealed || t.chalk);
        box.material.opacity = t.solid || t.disarmed ? 1 : 0.35;
        box.material.color.set(t.solid || t.disarmed ? "#5fe3ff" : "#f4efe4");
        pop.visible = t.star >= 0;
        if (pop.visible) { const s = 0.4 + t.star * 1.4; pop.scale.setScalar(s); pop.position.set(c[0] + 0.5, Y(c) + 0.9 + t.star * 0.5, c[1] + 0.5); pop.rotation.y = t.star * 6; }
      };
    } else if (t.kind === "t33") {
      fog = { t, canvas: null };
    } else if (t.kind === "t40") {
      const plates = t.plates.map((c) => place(bake((B) => pressPlate(B, C.plate), light), c, 0));
      const lamps = t.plates.map((c, i) => {
        const o = t.lamps?.[i] || [0.38, -0.38];
        const post = bake((B) => lampPost(B), light);
        post.position.set(c[0] + 0.5 + o[0], Y(c), c[1] + 0.5 + o[1]);
        group.add(post);
        const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), glowMat("#6b5a40"));
        g.position.set(post.position.x, post.position.y + 0.76, post.position.z);
        group.add(g);
        return g;
      });
      const on = new THREE.Color(C.gold), off = new THREE.Color("#5a4c3a"), bad = new THREE.Color("#e84a5f");
      it.update = () => {
        t.plates.forEach((c, i) => {
          plates[i].position.y = Y(c) - (t.lit?.[i] && t.show == null ? 0.04 : 0);
          lamps[i].material.color.copy(t.wrong >= 0 ? bad : t.lit?.[i] ? on : off);
          lamps[i].scale.setScalar(t.lit?.[i] ? 1.3 : 1);
        });
      };
    } else if (t.kind === "t18") {
      const c = t.cells[0];
      place(bake((B) => springBase(B), light), c, 0.002);
      const coil = place(bake((B) => springCoil(B), light), c, 0.012);
      const lid = bake((B) => slab(B, 0.74, 0.035, C.slab), light);
      const hinge = new THREE.Group();
      hinge.add(lid);
      place(hinge, c, 0.012);
      const axis = new THREE.Vector3(), H = 0.37;
      it.update = () => {
        const b = t.boing, f = t.dir ? [-t.dir[0], -t.dir[1]] : [0, -1];
        const a = b < 0 ? 0 : b < 0.08 ? b / 0.08 : Math.pow(1 - Math.min(1, (b - 0.08) / 0.52), 2);
        hinge.position.set(c[0] + 0.5 - f[0] * H, Y(c) + 0.012, c[1] + 0.5 - f[1] * H);
        lid.position.set(f[0] * H, 0, f[1] * H);
        axis.set(f[1], 0, -f[0]).normalize();
        hinge.quaternion.setFromAxisAngle(axis, -1.1 * a);
        const lift = Math.sin(1.1 * a) * H;
        coil.visible = lift > 0.02;
        coil.scale.y = Math.max(0.01, lift / 0.22);
      };
    } else if (t.kind === "t22") {
      const c = t.cells[0];
      const P = state.level, open = (dx, dz) => { const q = P.cells[c[1] + dz]?.[c[0] + dx]; return q && q.s !== "none" && q.h >= 1; };
      const across = open(1, 0) || open(-1, 0) ? [0, 1] : [1, 0];
      place(bake((B) => {
        for (const s2 of [-1, 1]) B.rbox(0.14, 2.1, 0.14, 0.03, pal(C.stoneDark), across[0] * s2 * 0.43, 0, across[1] * s2 * 0.43);
        B.rbox(across[0] ? 1.06 : 0.2, 0.16, across[0] ? 0.2 : 1.06, 0.03, pal(C.stone), 0, 2.1, 0);
      }, light), c, 0);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, depthWrite: false }));
      place(shadow, c, 0.012);
      const stone = place(bake((B) => { B.rbox(0.74, 0.5, 0.74, 0.08, pal(C.stone), 0, 0, 0); B.box(0.5, 0.02, 0.5, pal(C.stoneDark), 0, 0.5, 0); }, light), c, 1.55);
      it.update = () => {
        const d = t.disarmed ? 0 : t.drop || 0;
        stone.position.y = Y(c) + 1.55 * (1 - d) + 0.01;
        shadow.material.opacity = t.disarmed ? 0 : 0.15 + 0.5 * (t.shadow || 0);
        shadow.scale.setScalar(0.6 + 0.4 * (t.shadow || 0));
      };
    } else if (t.kind === "t23") {
      const c = t.cells[0];
      const disc = place(bake((B) => turntable(B), light), c, 0.004);
      it.update = () => { disc.rotation.y = -(t.spin || 0); };
    } else if (t.kind === "t52") {
      const tiles = t.cells.map((c, i) => place(bake((B) => iceTile(B, i + c[0] * 3 + c[1] * 7), light), c, 0.004));
      const glints = t.cells.map((c, i) => {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.07).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), glowMat("#ffffff", 0.8));
        g.userData.k = i;
        return place(g, c, 0.06);
      });
      it.update = () => {
        for (const m of tiles) m.visible = !t.disarmed;
        for (const g of glints) {
          const u = ((t.glint || 0) * 1.4 - g.userData.k * 0.35) % 3;
          g.visible = !t.disarmed && u >= 0 && u < 0.5;
          if (g.visible) { g.material.opacity = 0.85 * Math.sin((u / 0.5) * Math.PI); g.scale.x = 0.6 + u; }
        }
      };
    } else if (t.kind === "t04") {
      for (const c of t.plates) place(bake((B) => honkPlate(B), light), c, 0.004);
      const bird = bake((B) => goose(B), light);
      group.add(bird);
      const fx = puffs("#ffffff");
      it.update = () => {
        bird.visible = !!t.goose && !t.disarmed;
        if (bird.visible) { const c = t.goose; bird.position.set(c[0] + 0.5, Y(c) + (t.sit < 0.4 ? Math.abs(Math.sin(t.sit * 20)) * 0.08 : 0), c[1] + 0.5); bird.rotation.y = Math.sin(T.time * 1.3) * 0.7; }
        fx.show(t.puff >= 0 ? t.puffAt : null, t.puff / 0.6);
      };
    } else if (t.kind === "t05") {
      place(bake((B) => scuffMark(B), light), t.cells[0], 0.006, yawOf(dirOf(t.from, t.cells[0])));
    } else if (t.kind === "t06") {
      const piles = t.cells.map((c, i) => place(bake((B) => dustPile(B, i + c[0] * 5 + c[1] * 3), light), c, 0.004));
      const fx = puffs("#d8ccb4");
      it.update = () => {
        t.cells.forEach((c, i) => { piles[i].visible = !t.disarmed && !t.dusted?.has(c[0] + "," + c[1]); });
        fx.show(t.puff >= 0 ? t.puffAt : null, t.puff / 0.9);
      };
    } else if (t.kind === "t07" || t.kind === "t30") {
      const home = t.cells[0], q = state.things?.byId?.[t.chest];
      const rot = -((q?.rot) || 0) * (Math.PI / 2);
      const body = new THREE.Group();
      body.add(bake((B) => chestBase(B, K), light));
      const lid = bake((B) => chestLid(B, K), light);
      lid.position.set(0, 0.34, -0.22);
      lid.rotation.order = "YXZ";
      body.add(lid);
      const fangs = bake((B) => teeth(B), light);
      fangs.position.set(0, 0.32, -0.02);
      body.add(fangs);
      const wag = bake((B) => tail(B), light);
      wag.position.set(0, 0.22, -0.3);
      wag.rotation.order = "YXZ";
      body.add(wag);
      group.add(body);
      const coin = bake((B) => coinMesh(B), light);
      coin.rotation.x = Math.PI / 2;
      group.add(coin);
      it.update = () => {
        const a = state.actor, near = Math.hypot(a.pos.x - home[0] - 0.5, a.pos.z - home[1] - 0.5) < 3;
        const from = t.from || home, to = t.pos || home, u = Math.min(1, t.hop ?? 1);
        body.position.set(from[0] + 0.5 + (to[0] - from[0]) * u, Y(to) + Math.sin(Math.PI * u) * 0.35, from[1] + 0.5 + (to[1] - from[1]) * u);
        body.rotation.y = t.state === "chase" ? Math.atan2(a.pos.x - body.position.x, a.pos.z - body.position.z) : rot;
        lid.rotation.x = t.state === "chase" ? -(0.35 + 0.35 * Math.abs(Math.sin(T.time * 12))) : t.state === "bored" ? -0.5 : 0;
        fangs.visible = t.state !== "idle";
        wag.rotation.x = -0.9;
        wag.rotation.z = (near || t.state !== "idle") && !t.disarmed ? Math.sin(T.time * 14) * 0.6 : 0;
        coin.visible = t.coin >= 0;
        if (coin.visible) { const c = t.pos; coin.position.set(c[0] + 0.5, Y(c) + 0.6 + t.coin * 0.8, c[1] + 0.5); coin.rotation.z = t.coin * 9; }
      };
    } else if (t.kind === "t08") {
      const pad = t.cells[0];
      const slabM = place(bake((B) => slab(B, 0.9, 0.05, C.stone), light), pad, 0.002);
      const pit = place(bake((B) => holeTile(B), light), pad, 0.004);
      it.update = () => {
        pit.visible = !!t.sprung;
        const u = t.drop >= 0 ? Math.min(1, t.drop / 0.55) : 0;
        slabM.position.set(pad[0] + 0.5 + (t.land[0] - pad[0]) * u, Y(pad) + (Y(t.land) - Y(pad)) * u - Math.sin(Math.PI * u) * 0.1 + (t.sprung && u >= 1 ? 0.002 : 0.002), pad[1] + 0.5 + (t.land[1] - pad[1]) * u);
      };
    } else if (t.kind === "t09") {
      const c = t.cells[0], q = state.things?.byId?.[t.thing];
      const rot = -((q?.rot) || 0) * (Math.PI / 2);
      const smoke = puffs("#8a8a8a");
      let arm = null;
      if (t.prop === "lever") {
        place(bake((B) => leverBase(B, K), light), c, 0, rot);
        arm = place(bake((B) => leverArm(B, K), light), c, 0.26, rot);
      } else place(bake((B) => campfire(B), light), c, 0, rot);
      it.update = () => {
        if (arm) {
          const u = t.fx >= 0 ? Math.min(1, t.fx / 0.4) : 0;
          arm.rotation.x = t.broken ? 1.4 : -0.65;
          arm.position.set(c[0] + 0.5 + (t.broken ? 0.35 : 0), Y(c) + (t.broken ? 0.02 + (1 - u) * 0.4 : 0.26), c[1] + 0.5);
        }
        smoke.show(t.fx >= 0 && t.prop !== "lever" ? c : null, t.fx / 1.6, 0.4 + t.fx * 0.5);
      };
    } else if (t.kind === "t10") {
      const pits = t.cells.map((c) => place(bake((B) => holeTile(B), light), c, 0.006));
      const chalk = outline("#f4efe4");
      it.update = () => {
        pits.forEach((m, i) => { m.visible = !!t.open && i === t.at; });
        chalk.visible = !!t.chalk && !!t.chalkAt;
        if (chalk.visible) chalk.position.set(t.chalkAt[0] + 0.5, Y(t.chalkAt) + 0.02, t.chalkAt[1] + 0.5);
      };
    } else if (t.kind === "t11") {
      const c = t.cells[0];
      const lines = place(bake((B) => seam(B), light), c, 0.006);
      const pit = place(bake((B) => holeTile(B), light), c, 0.007);
      const shreds = puffs("#e8dcc4");
      it.update = () => {
        lines.visible = !!t.seam && !t.torn && !t.disarmed;
        pit.visible = !!t.torn;
        shreds.show(t.rip >= 0 && t.rip < 1 ? c : null, t.rip, 0.1 - t.rip * 0.8);
      };
    } else if (t.kind === "t12") {
      t.cells.forEach((c, i) => place(bake((B) => mossStone(B, i + c[0] * 3 + c[1] * 7), light), c, 0.004));
      const last = t.cells[t.cells.length - 1], d = dirOf(t.cells[t.cells.length - 2], last);
      const s = bake((B) => signPost(B, C.slab), light);
      s.position.set(last[0] + 0.5 + d[0] * 0.4 + d[1] * 0.3, Y(last), last[1] + 0.5 + d[1] * 0.4 + d[0] * 0.3);
      s.rotation.y = yawOf([-d[0], -d[1]]);
      group.add(s);
    } else if (t.kind === "t13") {
      const bait = t.cells[0];
      place(bake((B) => spikesBase(B), light), bait, 0.004);
      place(bake((B) => spikeTips(B), light), bait, -0.3);
      const d = dirOf(bait, t.plate);
      place(bake((B) => pressPlate(B, C.plate), light), t.plate, 0.002);
      const fist = bake((B) => glove(B), light);
      fist.rotation.y = yawOf([-d[0], -d[1]]);
      group.add(fist);
      it.update = () => {
        fist.visible = t.glove >= 0;
        if (fist.visible) { const u = Math.sin(Math.min(1, t.glove / 0.35) * Math.PI); fist.position.set(t.plate[0] + 0.5 - d[0] * (0.2 + u * 0.5), Y(t.plate) + 0.15 + u * 0.4, t.plate[1] + 0.5 - d[1] * (0.2 + u * 0.5)); }
      };
    } else if (t.kind === "t14") {
      const [dec, real] = t.cells;
      const mark = outline("#ff3cc8");
      mark.position.set(dec[0] + 0.5, Y(dec) + 0.03, dec[1] + 0.5);
      group.add(mark);
      const fx = puffs("#ffffff");
      const tips = place(bake((B) => spikeTips(B), light), real, -0.44);
      it.update = () => {
        mark.visible = !!t.painted && !t.disarmed;
        fx.show(t.honk >= 0 ? dec : null, t.honk / 0.6);
        const u = t.spike >= 0 ? Math.min(1, t.spike * 8) * (t.spike < 0.6 ? 1 : 0) : 0;
        tips.visible = u > 0;
        tips.position.y = Y(real) - 0.44 + u * 0.44;
      };
    } else if (t.kind === "t15") {
      const tiles = t.cells.map((c) => { const m = bake((B) => faithSlab(B), light); m.position.set(c[0] + 0.5, yH(t.h), c[1] + 0.5); group.add(m); return m; });
      it.update = () => tiles.forEach((m, i) => { const u = t.disarmed ? 1 : t.lift?.[i] || 0; m.visible = u > 0.02; m.position.y = yH(t.h) - (1 - u) * 1.4; });
    } else if (t.kind === "t16" || t.kind === "t29") {
      hallLook(t.cells);
      if (t.kind === "t29") blockLook(it, t, t.block);
    } else if (t.kind === "t17") {
      const c = t.cells[0];
      const look = N4.map((d) => [c[0] + d[0], c[1] + d[1]]).find((q) => L.cells[q[1]]?.[q[0]]?.p) || [c[0], c[1] + 1];
      place(bake((B) => statue(B), light), c, 0, yawOf(dirOf(c, look)));
    } else if (t.kind === "t19") {
      const d = dirOf(t.cells[0], t.cells[1]);
      const keg = bake((B) => barrel(B), light);
      group.add(keg);
      const yaw = yawOf([d[1], -d[0]]);
      it.update = () => {
        keg.visible = t.roll != null && !t.disarmed;
        if (!keg.visible) return;
        const s = t.roll, c0 = t.cells[0], n = t.cells.length;
        const cl = t.cells[Math.max(0, Math.min(n - 1, Math.round(s)))];
        keg.position.set(c0[0] + 0.5 + d[0] * s, Y(cl) + 0.32, c0[1] + 0.5 + d[1] * s);
        keg.rotation.set(0, yaw, 0);
        keg.rotateX(-s * 3);
      };
    } else if (t.kind === "t20") {
      const glyph = bake((B) => rewindGlyph(B), light);
      group.add(glyph);
      it.update = () => {
        glyph.visible = t.rewind >= 0;
        if (glyph.visible) { const a = state.actor; glyph.position.set(a.pos.x, a.y * view.tileH + 1.5 + Math.sin(T.time * 8) * 0.05, a.pos.z); glyph.rotation.y = Math.PI / 4 - (view.yaw * Math.PI) / 180; }
      };
    } else if (t.kind === "t27") {
      const wob = (t.kind1 || []).map((c) => place(bake((B) => plank(B), light), c, 0.01));
      const still = t.cells.map((c) => place(bake((B) => plank(B), light), c, 0.01));
      const di = t.drop ?? 2;
      it.update = () => {
        wob.forEach((m, i) => { m.rotation.z = Math.sin(T.time * 26 + i) * 0.09 * (t.wob?.[i] || 0); });
        const u = t.fall >= 0 ? t.fall : -1, m = still[di], c = t.cells[di];
        m.visible = !t.gone || (u >= 0 && u < 1.5);
        m.position.y = Y(c) + 0.01 - (t.gone && u >= 0 ? 4 * u * u : 0);
        m.rotation.x = t.gone && u >= 0 ? u * 3 : 0;
      };
    } else if (t.kind === "t28") {
      for (const run of [t.cells, t.second]) {
        const d = dirOf(run[0], run[1]), c = run[0];
        const s = bake((B) => warnSign(B), light);
        s.position.set(c[0] + 0.5 - d[0] * 0.3 + d[1] * 0.42, Y(c), c[1] + 0.5 - d[1] * 0.3 - d[0] * 0.42);
        s.rotation.y = yawOf([-d[0], -d[1]]);
        group.add(s);
      }
      const all = [...t.cells, ...t.second];
      const pits = all.map((c) => place(bake((B) => holeTile(B), light), c, 0.006));
      it.update = () => all.forEach((c, i) => { const h = t.holes?.get(c[0] + "," + c[1]); pits[i].visible = !!h && T.time >= h.from && T.time < h.to; });
    } else if (t.kind === "t31") {
      const last = t.coins.length - 1;
      const coin = bake((B) => coinMesh(B), light);
      group.add(coin);
      const c = t.coins[last];
      const lines = place(bake((B) => seam(B), light), c, 0.006);
      const pit = place(bake((B) => holeTile(B), light), c, 0.007);
      it.update = () => {
        const q = t.coins[Math.min(t.got || 0, last)];
        coin.visible = !t.torn && !t.disarmed;
        coin.position.set(q[0] + 0.5, Y(q) + 0.45 + Math.sin(T.time * 3) * 0.05, q[1] + 0.5);
        coin.rotation.y = T.time * 3;
        lines.visible = !!t.seam && !t.torn;
        pit.visible = !!t.torn;
      };
    } else if (t.kind === "t01") {
      const pits = t.cells.map((c) => place(bake((B) => holeTile(B), light), c, 0.006));
      const bars = bake((B) => gateBarsTrap(B, C.iron), light);
      const gd = dirOf(t.spring, t.gate);
      bars.rotation.y = yawOf([gd[1], -gd[0]]) + Math.PI / 2;
      group.add(bars);
      it.update = () => {
        pits.forEach((m) => { m.visible = !!t.gone; });
        const u = t.up ? (t.pop >= 0 ? Math.min(1, t.pop / 0.2) : 1) : 0;
        bars.visible = u > 0;
        bars.position.set(t.gate[0] + 0.5, Y(t.gate) - 1.1 * (1 - u), t.gate[1] + 0.5);
      };
    } else if (t.kind === "t32") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24).rotateX(Math.PI / 2), glowMat("#b06cff", 0.7));
      group.add(ring);
      it.update = () => {
        ring.visible = !!t.on && !t.disarmed;
        if (!ring.visible) return;
        const a = state.actor, s = t.swirl >= 0 ? 1.6 - t.swirl * 0.5 : 1;
        ring.position.set(a.pos.x, a.y * view.tileH + 0.08, a.pos.z);
        ring.scale.setScalar(s);
        ring.rotation.y = -T.time * 3;
      };
    } else if (t.kind === "t34") {
      const hud = document.createElement("div");
      hud.className = "iw-nap";
      hud.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:6;pointer-events:none;font:600 15px system-ui,sans-serif;color:#3a2a10;background:#ffd75a;border-radius:16px;padding:4px 12px;box-shadow:0 2px 0 #b8860b;display:none";
      document.body.appendChild(hud);
      huds.push(hud);
      it.update = () => {
        const on = !!t.on && !t.disarmed;
        hud.style.display = on ? "" : "none";
        if (on) { const s = Math.max(0, Math.ceil(t.left)); hud.textContent = `☀ nap in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
      };
    } else if (t.kind === "t35") {
      const z = t.zone || [0, 0, L.size[0] - 1, L.size[1] - 1];
      const glaze = bake((B) => {
        for (let cz = z[1]; cz <= z[3]; cz++) for (let cx = z[0]; cx <= z[2]; cx++) {
          const c = L.cells[cz]?.[cx];
          if (!c || c.p || c.s === "none" || c.s === "water" || c.h < 1) continue;
          B.at(cx + 0.5, Y([cx, cz]) + 0.004, cz + 0.5, 0, () => B.box(0.9, 0.012, 0.9, pal(C.ice), 0, 0, 0));
        }
      }, light);
      group.add(glaze);
      it.update = () => { glaze.visible = !t.disarmed; };
    } else if (t.kind === "t36") {
      const z = t.zone || [0, 0, L.size[0] - 1, L.size[1] - 1];
      const spots = [[z[0], z[1]], [z[2], z[1]], [z[0], z[3]], [z[2], z[3]]].filter((c) => (L.cells[c[1]]?.[c[0]]?.h || 0) >= 1);
      const wind = DIRS[t.dir] || DIRS.e;
      const flags = spots.map((c) => {
        place(bake((B) => pennant(B), light), c, 0);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26).translate(0.25, 0, 0), new THREE.MeshBasicMaterial({ color: "#e84a5f", side: THREE.DoubleSide }));
        f.position.set(c[0] + 0.5, Y(c) + 0.95, c[1] + 0.5);
        f.rotation.y = -Math.atan2(wind[1], wind[0]);
        group.add(f);
        return f;
      });
      const streaks = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.04), glowMat("#ffffff", 0.7)); m.rotation.y = -Math.atan2(wind[1], wind[0]); group.add(m); return m; });
      it.update = () => {
        for (const f of flags) { f.scale.y = t.warn ? 1 + Math.sin(T.time * 30) * 0.3 : 1; f.rotation.x = t.warn ? Math.sin(T.time * 24) * 0.5 : Math.sin(T.time * 2) * 0.1; }
        const a = state.actor;
        streaks.forEach((m, i) => {
          m.visible = t.gust >= 0 && !!t.on;
          if (!m.visible) return;
          const u = t.gust * 2.5 - 0.6 + i * 0.3;
          m.position.set(a.pos.x + wind[0] * u, a.y * view.tileH + 0.3 + i * 0.25, a.pos.z + wind[1] * u + (i - 1) * 0.2);
        });
      };
    } else if (t.kind === "t37") {
      const goo = bake((B) => { for (let i = 0; i < 4; i++) B.ball(0.08, pal("#7ccf5a"), Math.cos(i * 1.6) * 0.2, 0, Math.sin(i * 1.6) * 0.2, 0.4, 0); }, light);
      group.add(goo);
      it.update = () => { const a = state.actor; goo.visible = !!t.on && !t.disarmed; goo.position.set(a.pos.x, a.y * view.tileH + 0.01, a.pos.z); goo.scale.setScalar(a.moving ? 1.2 : 1); };
    } else if (t.kind === "t38") {
      const lock = bake((B) => padlock(B), light);
      group.add(lock);
      it.update = () => { const a = state.actor; lock.visible = !!t.on && !t.disarmed; lock.position.set(a.pos.x + 0.35, a.y * view.tileH + 1.6 + Math.sin(T.time * 2) * 0.05, a.pos.z); lock.rotation.y = Math.PI / 4 - (view.yaw * Math.PI) / 180; };
    } else if (t.kind === "t39") {
      const cv = document.createElement("canvas");
      cv.width = 128; cv.height = 64;
      const tex = new THREE.CanvasTexture(cv);
      const bub = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      bub.scale.set(0.8, 0.4, 1);
      bub.renderOrder = 30;
      group.add(bub);
      let shown = null;
      it.update = () => {
        const a = state.actor;
        bub.visible = !!t.on && !t.disarmed;
        if (!bub.visible) return;
        bub.position.set(a.pos.x, a.y * view.tileH + 1.55 + (t.hic >= 0 ? Math.sin(t.hic * 20) * 0.08 : 0), a.pos.z);
        const txt = t.hic >= 0 ? "HIC!" : `hic in ${t.left ?? 7}`;
        if (txt === shown) return;
        shown = txt;
        const g = cv.getContext("2d");
        g.clearRect(0, 0, 128, 64);
        g.fillStyle = "#ffffff";
        g.beginPath(); g.roundRect?.(4, 8, 120, 48, 20); g.fill();
        g.fillStyle = "#3a3036";
        g.font = "bold 26px system-ui,sans-serif";
        g.textAlign = "center";
        g.fillText(txt, 64, 42);
        tex.needsUpdate = true;
      };
    } else if (t.kind === "t41") {
      place(bake((B) => pressPlate(B, C.gold), light), t.plate, 0.002);
      if (t.bellAt) place(bake((B) => bell(B), light), t.bellAt, 0);
      const boxes = t.crates.map(() => { const m = bake((B) => crate(B), light); group.add(m); return m; });
      it.update = () => boxes.forEach((m, i) => {
        const c = t.pos?.[i] || t.crates[i], mv = t.moved?.i === i ? t.moved : null;
        const u = mv ? Math.min(1, mv.t / 0.2) : 1, f = mv ? mv.from : c;
        m.position.set(f[0] + 0.5 + (c[0] - f[0]) * u, Y(c), f[1] + 0.5 + (c[1] - f[1]) * u);
      });
    } else if (t.kind === "t42") {
      const on = new THREE.Color("#ffd75a"), off = new THREE.Color("#3a3a52");
      const tiles = t.cells.map((c) => place(new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.84).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: off })), c, 0.012));
      if (t.bellAt) place(bake((B) => bell(B), light), t.bellAt, 0);
      it.update = () => tiles.forEach((m, i) => m.material.color.copy(t.lit?.[i] ? on : off));
    } else if (t.kind === "t43") {
      const tiles = t.cells.map((c) => place(bake((B) => tileSlab(B, same(c, t.exit) ? C.gold : C.slab), light), c, 0.004));
      it.update = () => t.cells.forEach((c, i) => { const gone = t.crumbled?.has(c[0] + "," + c[1]); tiles[i].position.y = Y(c) + (gone ? -0.25 : 0.004); tiles[i].visible = !gone || T.time % 0.4 < 0.3 || true; tiles[i].scale.setScalar(gone ? 0.7 : 1); });
    } else if (t.kind === "t44") {
      const panes = t.cells.map((c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.92), new THREE.MeshBasicMaterial({ color: "#9fe8ff", transparent: true, opacity: 0.2, depthWrite: false })); m.position.set(c[0] + 0.5, yH(t.h) - 0.04, c[1] + 0.5); group.add(m); return m; });
      const w = state.things?.byId?.[t.watcher];
      let eye = null;
      if (w && t.totem) {
        const sx = w.x + (w.size?.[0] || 1) / 2, sz = w.z + (w.size?.[1] || 1) / 2;
        const tot = bake((B) => eyeTotem(B), light);
        tot.position.set(sx, Y([w.x, w.z]), sz);
        group.add(tot);
        eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glowMat("#3a3036"));
        group.add(eye);
        eye.userData.c = [sx, Y([w.x, w.z]) + 1.45, sz];
      }
      it.update = () => {
        const u = t.disarmed ? 1 : t.fade || 0;
        for (const m of panes) { m.material.opacity = 0.15 + 0.7 * u; m.material.color.set(u > 0.5 ? "#7fdcff" : "#cfefff"); }
        if (eye && w) { const [x, y, z] = eye.userData.c, a = w.target || 0, lk = w.look || 0; eye.position.set(x + Math.sin(a) * 0.28 * lk, y, z + Math.cos(a) * 0.28 * lk); eye.visible = lk > 0.05; }
      };
    } else if (t.kind === "t45") {
      const cols = ["#3f7fe0", "#e04a4a"];
      const bars = t.gates.map((c, i) => { const m = bake((B) => gateBarsTrap(B, cols[i]), light); m.position.set(c[0] + 0.5, Y(c), c[1] + 0.5); m.rotation.y = t.gateYaw?.[i] ?? 0; group.add(m); return m; });
      const arms = (t.levers || []).map((id) => {
        const q = state.things?.byId?.[id];
        if (!q) return null;
        const r = -((q.rot) || 0) * (Math.PI / 2);
        place(bake((B) => leverBase(B, K), light), [q.x, q.z], 0, r);
        return place(bake((B) => leverArm(B, K), light), [q.x, q.z], 0.26, r);
      });
      it.update = () => {
        bars.forEach((m, i) => { const want = i === t.open ? -1.15 : 0; m.position.y += (Y(t.gates[i]) + want - m.position.y) * 0.2; });
        for (const a of arms) if (a) a.rotation.x = t.open ? 0.65 : -0.65;
      };
    } else if (t.kind === "t46") {
      const d = dirOf(t.cells[0], t.cells[t.cells.length - 1]), side = [-d[1], d[0]];
      const planks = t.cells.map((c, i) => { const m = bake((B) => plank(B), light); m.rotation.y = yawOf(side); group.add(m); m.userData.k = i % 2 ? 1 : -1; return m; });
      it.update = () => planks.forEach((m, i) => {
        const c = t.cells[i], off = (1 - (t.disarmed ? 1 : t.align || 0)) * m.userData.k;
        m.position.set(c[0] + 0.5 + side[0] * off * 0.6, yH(t.h) - 0.06 + off * 0.5, c[1] + 0.5 + side[1] * off * 0.6);
      });
    } else if (t.kind === "t47") {
      const tiles = t.cells.map((c, i) => { const m = place(bake((B) => tileSlab(B, "#b9c8d8"), light), c, 0.004); m.userData.k = i; return m; });
      const safe = new Set(t.safe.map((c) => c[0] + "," + c[1]));
      const glows = t.cells.map((c) => { const m = place(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2), glowMat("#7dfcb0", 0.8)), c, 0.07); m.visible = false; return m; });
      place(bake((B) => pressPlate(B, C.gold), light), t.start, 0.002);
      const splash = puffs("#6fb8ff");
      it.update = () => {
        tiles.forEach((m, i) => { m.rotation.z = Math.sin(T.time * 3 + i * 1.7) * 0.03; });
        const on = t.glow >= 0;
        t.cells.forEach((c, i) => { glows[i].visible = on && safe.has(c[0] + "," + c[1]); if (glows[i].visible) glows[i].material.opacity = 0.8 * Math.min(1, (2 - t.glow) * 2); });
        splash.show(t.dunk >= 0 ? t.dunkAt : null, t.dunk / 0.9);
      };
    } else if (t.kind === "t48") {
      const n = t.cells.length, at = t.post || t.cells[n - 1];
      const marks = [];
      for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), glowMat("#5a4c3a")); m.position.set(at[0] + 0.5 - 0.3 + i * (0.6 / Math.max(1, n - 1)), Y(at) + 1.0, at[1] + 0.5); group.add(m); marks.push(m); }
      place(bake((B) => { B.rbox(0.8, 0.86, 0.1, 0.04, pal(C.wood), 0, 0.5, 0); B.box(0.07, 0.6, 0.07, pal(C.wood), -0.3, 0, 0); B.box(0.07, 0.6, 0.07, pal(C.wood), 0.3, 0, 0); }, light), at, 0, 0).position.z -= 0.05;
      const on = new THREE.Color(C.gold), off = new THREE.Color("#5a4c3a"), bad = new THREE.Color("#e84a5f");
      it.update = () => marks.forEach((m, i) => m.material.color.copy(t.bad >= 0 ? bad : i < (t.solved ? n : t.count || 0) ? on : off));
    } else if (t.kind === "t49") {
      place(bake((B) => pressPlate(B, C.gold), light), t.plate, 0.002);
      const strip = bake((B) => { for (const c of t.ghostCells) B.at(c[0] + 0.5, 0, c[1] + 0.5, 0, () => { B.rbox(0.96, 0.6, 0.96, 0.05, pal("#9aa8c8"), 0, -0.6, 0); B.box(0.8, 0.012, 0.8, pal("#c8d4f0"), 0, 0, 0); }); }, light);
      strip.position.y = yH(1);
      group.add(strip);
      const gp = place(bake((B) => pressPlate(B, "#a8c8ff"), light), t.ghostPlate, 0.002);
      gp.position.y = yH(1) + 0.002;
      const ghost = bake((B) => ghostBlob(B), light);
      ghost.material.transparent = true;
      ghost.material.opacity = 0.7;
      group.add(ghost);
      it.update = () => {
        const f = t.from || t.ghost, g = t.ghost, u = t.move ?? 1;
        const bump = t.bump >= 0 ? Math.sin(t.bump / 0.4 * Math.PI) * 0.15 : 0;
        ghost.position.set(f[0] + 0.5 + (g[0] - f[0]) * u, Y(g) + Math.sin(Math.PI * u) * 0.1 + bump, f[1] + 0.5 + (g[1] - f[1]) * u);
      };
    } else if (t.kind === "t50") {
      for (const m of t.marks) {
        const c = m.cell, o = m.side || [0.42, 0];
        const post = bake((B) => waymarkPost(B), light);
        post.position.set(c[0] + 0.5 + o[0], Y(c), c[1] + 0.5 + o[1]);
        group.add(post);
        const g = bake((B) => glyphShape(B, m.glyph, C.ink), light);
        g.rotation.x = Math.PI / 2;
        g.position.set(post.position.x, post.position.y + 1.11, post.position.z + 0.05);
        group.add(g);
      }
      for (const q of t.gates) {
        const c = q.cell;
        place(bake((B) => arch(B), light), c, 0, q.yaw || 0);
        const g = bake((B) => glyphShape(B, q.glyph, C.gold), light);
        g.rotation.x = Math.PI / 2;
        g.rotation.z = q.yaw || 0;
        g.position.set(c[0] + 0.5, Y(c) + 1.55, c[1] + 0.5);
        group.add(g);
      }
      const fx = puffs("#ffffff");
      it.update = () => fx.show(t.tip >= 0 ? t.ledge : null, t.tip);
    } else if (t.kind === "t51") {
      const q = state.things?.byId?.[t.lever];
      if (q) { const r = -((q.rot) || 0) * (Math.PI / 2); place(bake((B) => leverBase(B, K), light), [q.x, q.z], 0, r); }
      const arm = q ? place(bake((B) => leverArm(B, K), light), [q.x, q.z], 0.26, -((q.rot) || 0) * (Math.PI / 2)) : null;
      const fuse = (t.fuseCells || []).map((c) => place(bake((B) => B.box(0.08, 0.05, 0.9, pal("#3a3036"), 0, 0, 0), light), c, 0.01));
      const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), glowMat("#ffd75a"));
      group.add(spark);
      const d = dirOf(t.cells[0], t.cells[t.cells.length - 1] || t.cells[0]);
      const planks = t.cells.map((c) => { const m = bake((B) => plank(B), light); m.rotation.y = yawOf([-d[1], d[0]]); group.add(m); return m; });
      it.update = () => {
        if (arm) arm.rotation.x = t.lit >= 0 ? 0.65 : -0.65;
        const u = t.lit >= 0 ? t.lit / (t.secs || 5) : 0;
        const k = Math.floor(u * fuse.length);
        fuse.forEach((m, i) => { m.visible = t.lit < 0 || i >= k; });
        spark.visible = t.lit >= 0 && fuse.length > 0;
        if (spark.visible) { const c = t.fuseCells[Math.min(fuse.length - 1, k)]; spark.position.set(c[0] + 0.5, Y(c) + 0.12 + Math.random() * 0.05, c[1] + 0.5); }
        planks.forEach((m, i) => { const c = t.cells[i], low = t.lower || 0; m.position.set(c[0] + 0.5, yH(t.h) - 0.06 - (1 - low) * 0.9, c[1] + 0.5); m.rotation.x = (1 - low) * 1.2; m.visible = low > 0.02; });
      };
    } else if (t.kind === "t53") {
      t.cells.forEach((c) => place(bake((B) => beltTile(B), light), c, 0.004));
      const arrows = t.cells.map((c) => place(bake((B) => beltArrow(B), light), c, 0.08));
      if (t.switchAt) place(bake((B) => pressPlate(B, "#ff8a3d"), light), t.switchAt, 0.002);
      place(bake((B) => pressPlate(B, C.gold), light), t.exit, 0.002);
      const impl = state.traps.byId[t.id]?.impl;
      it.update = () => t.cells.forEach((c, i) => { const d = impl?.dirAt ? impl.dirAt(t, i) : DIRS[t.dirs[i]]; arrows[i].rotation.y = yawOf(d); arrows[i].position.x = c[0] + 0.5 + d[0] * (((T.time * 2) % 1) - 0.5) * 0.3; arrows[i].position.z = c[1] + 0.5 + d[1] * (((T.time * 2) % 1) - 0.5) * 0.3; });
    }
    items.push(it);
  }

  if (fog) {
    const cv = document.createElement("canvas");
    cv.className = "iw-fog";
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5";
    document.body.appendChild(cv);
    fog.canvas = cv;
  }

  const puffMesh = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), glowMat("#f4efe4", 0.9));
    m.userData.a = (i / 7) * Math.PI * 2;
    puffMesh.add(m);
  }
  puffMesh.visible = false;
  group.add(puffMesh);
  const offLife = state.life?.on((e) => { if (e.type === "flop") puff = { t: 0, at: [state.actor.pos.x, state.actor.y * view.tileH, state.actor.pos.z] }; });

  const v3 = new THREE.Vector3();
  return {
    group,
    update(S, dt) {
      for (const it of items) if (it.update) it.update(dt);
      if (puff) {
        puff.t += dt;
        const u = (puff.t - 0.7) / 0.6;
        puffMesh.visible = u > 0 && u < 1;
        if (puffMesh.visible) for (const m of puffMesh.children) {
          m.position.set(puff.at[0] + Math.sin(m.userData.a) * u * 0.7, puff.at[1] + 0.3 + u * 0.4, puff.at[2] + Math.cos(m.userData.a) * u * 0.7);
          m.scale.setScalar(1 + u * 1.5);
          m.material.opacity = 0.9 * (1 - u);
        }
        if (u >= 1) puff = null;
      }
    },
    render(camera, w, h) {
      if (!fog?.canvas) return;
      const cv = fog.canvas, dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, cv.width, cv.height);
      const thick = fog.t.disarmed ? 0 : fog.t.thick ?? 1;
      cv.style.display = thick < 0.01 ? "none" : "";
      if (thick < 0.01) return;
      g.fillStyle = `rgba(214,220,226,${(0.94 * thick).toFixed(3)})`;
      g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = "destination-out";
      const proj = (x, y, z) => { v3.set(x, y, z).project(camera); return [(v3.x + 1) / 2 * cv.width, (1 - v3.y) / 2 * cv.height]; };
      const cellPx = (() => { const a = proj(0, 0, 0), b = proj(1, 0, 0); return Math.hypot(b[0] - a[0], b[1] - a[1]); })();
      const hole = (p, r, soft = 0.45) => {
        const gr = g.createRadialGradient(p[0], p[1], r * (1 - soft), p[0], p[1], r);
        gr.addColorStop(0, "rgba(0,0,0,1)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.arc(p[0], p[1], r, 0, Math.PI * 2);
        g.fill();
      };
      const a = state.actor;
      hole(proj(a.pos.x, a.y * view.tileH + 0.4, a.pos.z), cellPx * 3.2);
      for (const q of state.things?.things || []) {
        if (q.kind === "bonfire") hole(proj(q.x + 0.5, Y([q.x, q.z]) + 0.3, q.z + 0.5), cellPx * (q.state === "lit" ? 3.2 : 0.9));
        else if (q.kind === "watcher") hole(proj(q.x + q.size[0] / 2, Y([q.x, q.z]) + 1.5, q.z + q.size[1] / 2), cellPx * 1.6, 0.7);
        else if (q.kind === "elevator") hole(proj(q.x + 0.5, Y([q.x, q.z]) + 0.4, q.z + 0.5), cellPx * 0.8, 0.7);
      }
      for (const d of L.decor || []) if (/waymark|lamp|lantern/.test(d.t)) hole(proj(d.x + 0.5, Y([d.x, d.z]) + 1, d.z + 0.5), cellPx * 0.7, 0.8);
    },
    dispose() {
      offLife?.();
      fog?.canvas?.remove();
      for (const h of huds) h.remove();
    },
  };
}

export function heroFx(hero, a, view, base) {
  const fx = a.fx;
  hero.rotation.x = 0;
  hero.rotation.z = 0;
  hero.scale.setScalar(base);
  if (!fx) return;
  const u = Math.min(1, fx.t / fx.dur);
  if (fx.kind === "hop") { hero.position.y += (fx.lift || 0) * view.tileH; return; }
  if (fx.kind === "knock") {
    const [dx, dz] = fx.dir || [0, 0];
    const push = Math.min(u * 3, 1) * 1.6 + u * 1.2;
    hero.position.x = fx.from[0] + dx * push;
    hero.position.z = fx.from[1] + dz * push;
    hero.position.y += Math.sin(Math.min(1, u * 3) * Math.PI) * 0.5 - Math.pow(Math.max(0, u - 0.2), 2) * 26;
    hero.rotation.z = Math.sin(u * 40) * 0.6;
    hero.rotation.x = u * 3;
    return;
  }
  if (fx.kind === "flop") {
    hero.rotation.x = -Math.min(1, u * 4) * Math.PI / 2;
    hero.scale.setScalar(base * (u < 0.55 ? 1 : Math.max(0.001, 1 - (u - 0.55) / 0.2)));
  }
}
