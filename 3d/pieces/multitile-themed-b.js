import * as THREE from "three";
import { Baker, bakedMaterial } from "../baker.js";
import { lockedKit, ramp } from "../prims.js";
import { CROWN, FLAME } from "../pieces.js";
import { stamp, registerCatalog, CATALOG } from "../../core/catalog.js";

const R2 = Math.SQRT2;
const swatch = (hex) => { const r = ramp(hex); return { top: r[2], left: r[1], right: r[0] }; };
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const solidMask = (w, d, h) => Array.from({ length: w * d }, () => ({ pass: false, h }));

function boxAt(K, w, h, d, c, x, y, z, ry = 0, round = true) {
  K.B.at(x, y, z, ry, () => (round ? K.rbox(w, h, d, c, 0, 0, 0) : K.box(w, h, d, c, 0, 0, 0)));
}

function lay(K, axis, len, r, c, x, y, z, ry = 0) {
  const B = K.B;
  B.push(x, y, z, ry);
  B.rot(axis === "x" ? [0, 0, 1] : [1, 0, 0], Math.PI / 2, 0, 0, 0);
  K.cyl(r, len, c, 0, -len / 2, 0, 6);
  B.pop();
  B.pop();
}

const VAT = { base: "#8a7b68", baseHi: "#a39278", pipe: "#968670", glass: "#b6e8dd", glow: "#dcfff3", ink: "#2d5754", lid: "#d6f6ef", spool: "#e4e4e4", band: "#b5bfc4", hub: "#6c7377" };

function specimenVat(K, L) {
  const B = K.B;
  K.part("skirt", {}, () => K.rbox(1.2, 0.3, 1.2, L.base, 0, 0, 0));
  K.part("plinth", {}, () => K.rbox(1.45, 0.5, 1.45, L.baseHi, 0, 0.28, 0));
  [[0, -0.42], [0, 0.22], [Math.PI / 2, -0.4], [Math.PI, 0.1]].forEach(([ry, u], i) => {
    K.part(`leg-${i}`, {}, () => B.at(0, 0, 0, ry, () => {
      K.rbox(0.34, 0.3, 0.34, L.pipe, u, 0.42, 0.76);
      K.rbox(0.32, 0.62, 0.32, L.pipe, u, 0.06, 0.82);
      K.rbox(0.4, 0.12, 0.38, L.base, u, 0, 0.8);
    }));
  });
  K.part("glass", {}, () => B.sway("swatch", { rate: 0.3, duty: 0.45, root: [0, 1.7, 0], alt: swatch(L.glow) }, () => K.box(1.3, 2.0, 1.3, L.glass, 0, 0.78, 0)));
  K.part("lid", {}, () => K.rbox(1.34, 0.1, 1.34, L.lid, 0, 2.78, 0));
  const plate = (u, y, w, h) => {
    K.box(w, h, 0.03, L.ink, u, y, 0.66);
    K.box(0.03, h, w, L.ink, 0.66, y, -u);
  };
  K.part("specimen-head", {}, () => plate(-0.04, 1.7, 0.66, 0.42));
  K.part("specimen-ears", {}, () => { plate(-0.27, 2.08, 0.26, 0.32); plate(0.2, 2.08, 0.26, 0.32); });
  K.part("specimen-body", {}, () => plate(0.0, 1.32, 0.34, 0.4));
  K.part("specimen-tail", {}, () => { plate(0.16, 1.1, 0.18, 0.26); plate(0.04, 1.02, 0.22, 0.16); });
  const spool = [0.8, 0.34, 0.5];
  K.part("spool", {}, () => lay(K, "x", 0.4, 0.33, L.spool, ...spool));
  K.part("spool-bands", {}, () => { for (const dx of [-0.08, 0.04]) lay(K, "x", 0.06, 0.35, L.band, spool[0] + dx, spool[1], spool[2]); });
  K.part("spool-hub", {}, () => lay(K, "x", 0.42, 0.1, L.hub, ...spool));
  K.part("pipe", {}, () => { K.rbox(0.16, 0.3, 0.16, L.pipe, 0.66, 0.62, 0.5); });
}

const FOUNTAIN = { lilac: "#c3bdff", lilacDeep: "#aaa1f2", slate: "#5a6264", slateDark: "#3e4648", ink: "#1d1e22", gold: "#f1cd52", water: "#9fdcf2", foam: "#e6f7ff" };

function doodleFountain(K, L) {
  const B = K.B;
  K.part("step", {}, () => K.cyl(1.47, 0.24, L.lilacDeep, 0, 0, 0, 8));
  K.part("wall", {}, () => K.cyl(1.25, 0.52, L.lilac, 0, 0.24, 0, 8));
  K.part("pool", {}, () => B.sway("ripple", { amp: 0.035, root: [0, 0.76, 0] }, () => K.cyl(1.0, 0.06, L.water, 0, 0.72, 0, 8)));
  K.part("rim-blocks", {}, () => { for (let k = 0; k < 4; k++) B.at(0, 0, 0, k * Math.PI / 2, () => K.rbox(0.72, 0.18, 0.34, L.lilac, 0, 0.76, 1.06)); });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz], i) => {
    K.part(`cap-${i}`, {}, () => {
      K.rbox(0.2, 0.22, 0.2, L.lilacDeep, sx * 0.72, 0.76, sz * 0.72);
      K.rbox(0.54, 0.2, 0.54, L.gold, sx * 0.72, 0.98, sz * 0.72);
      K.rbox(0.36, 0.14, 0.36, L.gold, sx * 0.72, 1.18, sz * 0.72);
    });
  });
  K.part("column-base", {}, () => K.rbox(0.95, 0.55, 0.95, L.slateDark, 0, 0.6, 0));
  K.part("column-mid", {}, () => K.rbox(0.7, 0.5, 0.7, L.slate, 0, 1.15, 0));
  K.part("column-top", {}, () => K.rbox(0.46, 0.45, 0.46, L.slateDark, 0, 1.65, 0));
  K.part("collar", {}, () => K.rbox(0.72, 0.2, 0.72, L.lilac, 0, 2.1, 0));
  K.part("bubbles", {}, () => B.sway("ripple", { amp: 0.04, root: [0, 0.8, 0] }, () => {
    for (let k = 0; k < 6; k++) B.at(0, 0, 0, k * Math.PI / 3 + 0.3, () => K.cyl(0.1, 0.04, L.foam, 0, 0.78, 0.68, 6, { chamfer: false }));
  }));
  K.part("bloom", {}, () => B.sway("crown", { amp: CROWN, root: [0, 2.3, 0], span: 0.8 }, () => {
    K.spike(0.36, 0.92, 0.32, L.ink, 0, 2.28, 0);
    for (let k = 0; k < 8; k++) B.at(0, 0, 0, k * Math.PI / 4, () => K.spike(0.3, k % 2 ? 0.55 : 0.72, 0.24, L.ink, 0.2, 2.26, 0, k % 2 ? 0.34 : 0.42));
  }));
}

const EYRIE = { slate: "#cfc9b9", slateHi: "#e6dfd4", slateDeep: "#b4ad9d", log: "#9c6238", logDeep: "#80502e", pole: "#8a4b34", gold: "#e8b83a", goldDeep: "#d89a26" };

function slateEyrie(K, L) {
  const B = K.B;
  K.part("crag-base", {}, () => K.cone(1.3 * R2, 1.02 * R2, 0.9, L.slate, 0, 0, 0, 4));
  K.part("shard-front", {}, () => boxAt(K, 0.95, 1.15, 0.7, L.slateHi, 0.3, 0, 1.0, 0.12));
  K.part("shard-right", {}, () => boxAt(K, 0.7, 1.0, 1.0, L.slate, 1.05, 0, -0.15, -0.1));
  K.part("shard-left", {}, () => boxAt(K, 0.8, 0.75, 0.75, L.slateDeep, -0.95, 0, 0.75, 0.25));
  K.part("shard-back", {}, () => boxAt(K, 0.9, 1.4, 0.8, L.slate, -0.6, 0, -0.95, -0.15));
  K.part("crag-mid", {}, () => K.cone(0.95 * R2, 0.78 * R2, 0.75, L.slate, 0, 0.9, 0, 4));
  K.part("shard-mid-front", {}, () => boxAt(K, 0.75, 0.75, 0.55, L.slateHi, 0.15, 0.9, 0.75, -0.18));
  K.part("shard-mid-right", {}, () => boxAt(K, 0.55, 0.65, 0.75, L.slateHi, 0.75, 0.9, 0.1, 0.1));
  K.part("crag-top", {}, () => K.rbox(1.3, 0.42, 1.3, L.slateHi, 0, 1.65, 0));
  K.part("nest-lower", {}, () => {
    for (const s of [-1, 1]) { lay(K, "x", 1.75, 0.15, L.log, 0, 2.2, s * 0.6); lay(K, "z", 1.75, 0.15, L.logDeep, s * 0.6, 2.2, 0); }
  });
  K.part("nest-upper", {}, () => {
    for (const s of [-1, 1]) { lay(K, "x", 1.6, 0.14, L.logDeep, 0.05, 2.46, s * 0.45, 0.35); lay(K, "z", 1.6, 0.14, L.log, s * 0.45, 2.46, -0.05, 0.35); }
  });
  K.part("nest-sticks", {}, () => { for (let k = 0; k < 4; k++) B.at(0, 0, 0, k * Math.PI / 2 + 0.6, () => K.box(0.12, 0.12, 0.55, L.log, 0, 2.36, 0.95)); });
  K.part("pole", {}, () => K.rbox(0.2, 0.45, 0.2, L.pole, 0, 2.1, 0));
  K.part("spire-low", {}, () => K.cone(0.56, 0.26, 0.55, L.gold, 0, 2.42, 0, 4));
  K.part("spire-mid", {}, () => K.cone(0.44, 0.18, 0.5, L.goldDeep, 0, 2.86, 0, 4));
  K.part("spire-tip", {}, () => K.cone(0.32, 0, 0.84, L.gold, 0, 3.16, 0, 4));
}

const GAZEBO = { stone: "#e6d6ac", stoneDeep: "#d3bf8f", col: "#d8c497", volute: "#eef0e4", gold: "#f2c21e", goldDeep: "#dfa818" };

function giltGazebo(K, L) {
  const B = K.B;
  K.part("step-1", {}, () => K.rbox(2.9, 0.15, 2.9, L.stoneDeep, 0, 0, 0));
  K.part("step-2", {}, () => K.rbox(2.56, 0.15, 2.56, L.stone, 0, 0.15, 0));
  K.part("floor", {}, () => K.rbox(2.22, 0.15, 2.22, L.stone, 0, 0.3, 0));
  const posts = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  posts.forEach(([sx, sz], i) => K.part(`column-${i}`, {}, () => {
    const x = sx * 0.8, z = sz * 0.8;
    K.rbox(0.44, 0.16, 0.44, L.stoneDeep, x, 0.45, z);
    K.rbox(0.3, 0.52, 0.3, L.col, x, 0.61, z);
    K.rbox(0.34, 0.08, 0.34, L.stoneDeep, x, 1.13, z);
    K.rbox(0.3, 0.38, 0.3, L.col, x, 1.21, z);
  }));
  posts.forEach(([sx, sz], i) => K.part(`capital-${i}`, {}, () => {
    const x = sx * 0.8, z = sz * 0.8;
    K.rbox(0.5, 0.16, 0.5, L.volute, x, 1.59, z);
    for (const [dx, dz] of [[0.27, 0], [0, 0.27], [-0.27, 0], [0, -0.27]]) K.box(dx ? 0.06 : 0.22, 0.12, dz ? 0.06 : 0.22, L.stoneDeep, x + dx, 1.61, z + dz);
  }));
  K.part("roof", {}, () => K.rbox(2.32, 0.22, 2.32, L.gold, 0, 1.75, 0));
  K.part("dome-low", {}, () => K.cyl(1.02, 0.36, L.goldDeep, 0, 1.97, 0, 8));
  K.part("dome-mid", {}, () => K.cyl(0.82, 0.32, L.gold, 0, 2.33, 0, 8));
  K.part("dome-top", {}, () => K.cyl(0.54, 0.26, L.goldDeep, 0, 2.65, 0, 8));
  K.part("pennant", {}, () => B.sway("crown", { amp: CROWN, root: [0, 2.91, 0], span: 0.5 }, () => {
    K.spike(0.34, 0.52, 0.22, L.gold, 0, 2.91, 0, 0.08);
    K.spike(0.2, 0.36, 0.18, L.goldDeep, 0.14, 2.91, 0.08, 0.12);
  }));
}

const PRESS = { peach: "#ffc9a3", teal: "#5fd6e6", lilac: "#b8a4f2", pink: "#f58fa6", ink: "#2c2720", plank: "#f6dfb2", tape: "#ffaa78", tapeHole: "#c76a48" };

function stencilPress(K, L) {
  const B = K.B;
  const bx = -0.45, bz = 0.1;
  K.part("bed-base", {}, () => K.box(2.7, 0.24, 2.1, L.ink, bx, 0, bz));
  K.part("bed-sides", {}, () => K.rbox(2.9, 0.22, 2.3, L.pink, bx, 0.22, bz));
  K.part("planks", {}, () => { for (let i = 0; i < 4; i++) K.box(2.7, 0.08, 0.48, L.plank, bx, 0.44, bz - 0.78 + i * 0.52); });
  K.part("rails", {}, () => { for (const s of [-1, 1]) K.box(2.94, 0.12, 0.16, L.lilac, bx, 0.44, bz + s * 1.08); });
  B.push(bx, 0.56, bz - 1.05, 0);
  B.rot([1, 0, 0], -0.32, 0, 0, 0);
  K.part("frame", {}, () => {
    for (const z of [0.14, 1.96]) K.rbox(2.8, 0.16, 0.28, L.lilac, 0, 0, z);
    for (const s of [-1, 1]) K.rbox(0.28, 0.16, 2.1, L.lilac, s * 1.26, 0, 1.05);
  });
  K.part("stencil", {}, () => {
    K.box(2.24, 0.05, 0.5, L.peach, 0, 0.04, 0.53);
    K.box(2.24, 0.05, 0.56, L.peach, 0, 0.04, 1.54);
    for (const s of [-1, 1]) K.box(0.62, 0.05, 0.52, L.peach, s * 0.81, 0.04, 1.04);
  });
  K.part("cutout-lip", {}, () => { K.box(1.0, 0.03, 0.08, L.pink, 0, 0.02, 0.82); K.box(0.08, 0.03, 0.52, L.pink, -0.46, 0.02, 1.04); });
  B.pop();
  B.pop();
  K.part("hinge", {}, () => K.box(2.6, 0.14, 0.18, L.ink, bx, 0.5, bz - 1.08));
  const tape = (x, y, z) => { K.cyl(0.26, 0.22, L.tape, x, y, z, 6); K.cyl(0.11, 0.23, L.tapeHole, x, y + 0.005, z, 6, { chamfer: false }); };
  K.part("tape-1", {}, () => tape(1.5, 0, 0.1));
  K.part("tape-2", {}, () => tape(1.62, 0, 0.62));
  K.part("tape-3", {}, () => tape(1.55, 0.22, 0.32));
  const ax = 1.5, az = -0.95;
  K.part("arm-foot", {}, () => K.rbox(0.62, 0.18, 0.62, L.ink, ax, 0, az));
  K.part("arm-low", {}, () => K.rbox(0.44, 0.52, 0.44, L.teal, ax, 0.18, az));
  K.part("arm-mid", {}, () => K.rbox(0.36, 0.55, 0.36, L.ink, ax, 0.7, az));
  K.part("arm-joint", {}, () => K.rbox(0.42, 0.34, 0.42, L.teal, ax, 1.25, az));
  K.part("arm-top", {}, () => K.rbox(0.34, 0.5, 0.34, L.ink, ax, 1.59, az));
  K.part("arm-head", {}, () => K.rbox(0.42, 0.36, 0.42, L.teal, ax, 2.09, az));
  K.part("nozzle", {}, () => {
    B.push(ax - 0.2, 2.27, az, 0);
    B.rot([0, 0, 1], Math.PI / 2, 0, 0, 0);
    K.cone(0.3 * R2, 0.13 * R2, 0.8, L.peach, 0, 0, 0, 4);
    B.pop();
    B.pop();
  });
  K.part("nozzle-tip", {}, () => K.rbox(0.2, 0.2, 0.2, L.teal, ax - 1.08, 2.17, az));
}

const FORGE = { stone: "#5e3520", stoneDeep: "#42210c", soot: "#2e1a0c", rust: "#7b4328", ash: "#8a7565", horn: "#4e2a14", glow: "#ff8a1a", hot: "#ffd24a", ember: "#d9822b" };

function brimstoneForge(K, L) {
  const B = K.B;
  const cx = -0.2, cz = -0.25;
  K.part("base", {}, () => K.rbox(2.0, 0.35, 2.0, L.stoneDeep, cx, 0, cz));
  K.part("body", {}, () => K.rbox(1.76, 0.85, 1.76, L.stone, cx, 0.35, cz));
  K.part("courses", {}, () => {
    K.rbox(0.62, 0.36, 0.2, L.stoneDeep, cx + 0.42, 0.62, cz + 0.9);
    K.rbox(0.2, 0.4, 0.66, L.stoneDeep, cx + 0.9, 0.4, cz + 0.2);
    K.rbox(0.2, 0.34, 0.5, L.stone, cx + 0.9, 0.82, cz - 0.42);
  });
  K.part("shoulder", {}, () => K.rbox(1.4, 0.4, 1.4, L.stoneDeep, cx, 1.2, cz));
  K.part("chimney-low", {}, () => K.rbox(0.92, 0.45, 0.92, L.stone, cx - 0.05, 1.6, cz - 0.05));
  K.part("chimney-mid", {}, () => K.rbox(0.7, 0.48, 0.7, L.stoneDeep, cx - 0.05, 2.05, cz - 0.05));
  K.part("chimney-top", {}, () => {
    const y = 2.53, x = cx - 0.05, z = cz - 0.05;
    for (const s of [-1, 1]) { K.rbox(0.86, 0.42, 0.16, L.stone, x, y, z + s * 0.35); K.rbox(0.16, 0.42, 0.54, L.stone, x + s * 0.35, y, z); }
    K.box(0.54, 0.05, 0.54, L.soot, x, y + 0.3, z);
  });
  const mx = cx - 0.15, mz = cz + 0.9;
  K.part("mouth-frame", {}, () => {
    K.rbox(1.02, 0.24, 0.3, L.stoneDeep, mx, 0.94, mz);
    for (const s of [-1, 1]) K.rbox(0.22, 0.6, 0.3, L.stoneDeep, mx + s * 0.4, 0.34, mz);
  });
  K.part("mouth-glow", {}, () => B.sway("swatch", { rate: 0.4, duty: 0.5, root: [mx, 0.6, mz], alt: swatch(L.hot) }, () => K.box(0.6, 0.6, 0.06, L.glow, mx, 0.34, mz + 0.06)));
  K.part("flame", {}, () => B.sway("flame", { amp: FLAME, root: [mx, 0.36, mz], span: 0.5 }, () => {
    K.cone(0.16, 0, 0.46, L.hot, mx - 0.08, 0.36, mz + 0.14, 5);
    K.cone(0.11, 0, 0.32, L.glow, mx + 0.14, 0.36, mz + 0.16, 5);
  }));
  K.part("hearth", {}, () => K.rbox(1.12, 0.2, 0.42, L.rust, mx, 0, mz + 0.34));
  K.part("anvil-foot", {}, () => { K.rbox(0.52, 0.22, 0.42, L.rust, 0.98, 0, 0.62); K.rbox(0.3, 0.22, 0.26, L.horn, 0.98, 0.22, 0.62); });
  K.part("anvil-top", {}, () => K.rbox(0.78, 0.2, 0.44, L.rust, 0.98, 0.44, 0.62));
  K.part("anvil-horn", {}, () => {
    B.push(0.6, 0.54, 0.62, 0);
    B.rot([0, 0, 1], Math.PI / 2, 0, 0, 0);
    K.cone(0.09 * R2, 0, 0.34, L.ash, 0, 0, 0, 4);
    B.pop();
    B.pop();
  });
  K.part("horn-left", {}, () => {
    boxAt(K, 0.4, 0.38, 0.4, L.horn, -1.12, 0.74, 0.05, 0.3);
    boxAt(K, 0.42, 0.42, 0.42, L.horn, -1.2, 0.34, 0.5, 0.5);
    boxAt(K, 0.4, 0.36, 0.4, L.horn, -1.0, 0, 0.95, 0.7);
  });
  K.part("horn-right", {}, () => {
    boxAt(K, 0.4, 0.36, 0.4, L.horn, mx - 0.25, 0, 1.18, -0.3);
    boxAt(K, 0.42, 0.4, 0.42, L.horn, mx + 0.22, 0, 1.18, 0.2);
    boxAt(K, 0.38, 0.36, 0.38, L.horn, mx + 0.58, 0.28, 1.0, 0.5);
  });
}

export const PROPS = {
  "gremlin-specimen-vat": { footprint: [2, 2], height: 3, build: specimenVat, look: VAT },
  "mindbloom-doodle-fountain": { footprint: [3, 3], height: 3, build: doodleFountain, look: FOUNTAIN },
  "eagle-slate-eyrie": { footprint: [3, 3], height: 4, build: slateEyrie, look: EYRIE },
  "forest-gilt-gazebo": { footprint: [3, 3], height: 3, build: giltGazebo, look: GAZEBO },
  "cosmos-stencil-press": { footprint: [4, 3], height: 3, build: stencilPress, look: PRESS },
  "ember-brimstone-forge": { footprint: [3, 3], height: 3, build: brimstoneForge, look: FORGE },
};

const COMPACT = Object.fromEntries(Object.entries(PROPS).filter(([, p]) => Math.min(...p.footprint) > 2).map(([t, p]) => {
  const [w, d] = p.footprint, k = Math.min((w - 1) / w, (d - 1) / d);
  return [`${t}-s`, { footprint: [w - 1, d - 1], height: Math.ceil(p.height * k), build: (K, L) => { K.B.push(0, 0, 0, 0, k); p.build(K, L); K.B.pop(); }, look: p.look, of: t }];
}));
const ALL = { ...PROPS, ...COMPACT };

export function partsOf(type, style = {}) {
  const B = new Baker();
  const K = lockedKit(B, style, 0);
  ALL[type].build(K, { ...ALL[type].look });
  return K.parts.filter((p) => !p.face && !p.chainOf).map((p) => p.id);
}

export function register(style = {}) {
  const catalog = {}, builders = {};
  for (const [t, p] of Object.entries(ALL)) {
    const [w, d] = p.footprint;
    catalog[t] = stamp(p.footprint, solidMask(w, d, p.height), { multitile: true });
    builders[t] = (v, rot, st) => {
      const B = new Baker();
      const K = lockedKit(B, st || style, rot || 0);
      p.build(K, { ...p.look, ...(st?.palette?.multitile?.[p.of || t] || {}) });
      const m = mesh(B);
      m.userData.parts = K.parts.filter((q) => !q.face).map((q) => q.id);
      return m;
    };
  }
  return { catalog, builders };
}

const SELF = "pieces/multitile-themed-b.js";
const KEEP_ROLES = ["lead", "threshold", "dais", "light"];

export function placeLandmark(level, h, type, o = {}) {
  const at = placeOne(level, h, type, o);
  if (at || !COMPACT[`${type}-s`]) return at;
  h.log.push(`landmark ${type}: shrinking one footprint step`);
  return placeOne(level, h, `${type}-s`, o);
}

function placeOne(level, h, type, o) {
  registerCatalog(register().catalog);
  const route = o.route || h.approach() || [];
  const onR = new Set(route.map(([x, z]) => h.key(x, z)));
  const figs = h.figure.cells;
  const fx = figs.map((c) => c[0]), fz = figs.map((c) => c[1]);
  const fMax = Math.max(...figs.map(([x, z]) => x + z)), fMin = Math.min(...figs.map(([x, z]) => x + z));
  const fLat = (Math.min(...fx) + Math.max(...fx)) / 2 - (Math.min(...fz) + Math.max(...fz)) / 2;
  const hard = (d) => d === h.lead || CATALOG[d.t]?.stamp || d.side || d.axis || KEEP_ROLES.includes(level.palette?.props?.[d.t]?.role) || (o.keep || []).includes(d.t);
  const [W, D] = level.size;
  const spec = ALL[type];
  const rots = spec.footprint[0] === spec.footprint[1] ? [0] : [0, 1];
  const cand = [];
  for (const rot of rots) {
    const [w, d] = rot ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    for (let z = 0; z + d <= D; z++) for (let x = 0; x + w <= W; x++) {
      const cs = [];
      for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) cs.push([x + dx, z + dz]);
      const c0 = h.cell(x, z);
      if (!c0 || !h.land(c0)) continue;
      let ok = true, removed = 0;
      for (const [a, b] of cs) {
        const q = h.cell(a, b);
        if (!h.land(q) || q.s === "ramp" || q.s === "bridge" || q.h !== c0.h || h.isFig(a, b) || onR.has(h.key(a, b))) { ok = false; break; }
        const ds = h.decorAt(a, b);
        if (ds.some(hard)) { ok = false; break; }
        removed += ds.length;
      }
      if (!ok) continue;
      if (cs.some(([a, b]) => a + b > fMax && Math.abs(a - b - fLat) <= 2.5)) continue;
      const gap = Math.max(Math.max(0, Math.min(...fx) - (x + w - 1), x - Math.max(...fx)), Math.max(0, Math.min(...fz) - (z + d - 1), z - Math.max(...fz)));
      if (gap < 1 || gap > (o.near ?? 4)) continue;
      const sum = x + z + (w + d) / 2 - 1;
      const behind = sum <= fMin ? 0 : sum <= fMax ? 0.5 : 2;
      const rim = cs.filter(([a, b]) => [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dz]) => !h.land(h.cell(a + dx, b + dz)))).length;
      let veil = 0;
      for (const [a, b] of cs) for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]]) { const q = h.cell(a + dx, b + dz); if (q && q.h > c0.h && !cs.some(([u, v]) => u === a + dx && v === b + dz)) veil = Math.max(veil, q.h - c0.h); }
      cand.push({ score: gap + behind + removed * 0.4 + rim * 0.05 + veil * 1.5 + (c0.h < (h.cell(...h.figure.anchor)?.h ?? 1) ? 0.3 : 0), x, z, rot, removed });
    }
  }
  cand.sort((a, b) => a.score - b.score);
  const len0 = (h.approach() || []).length, m0 = h.reach().missing.length;
  for (const c of cand) {
    const S = h.snapshot();
    if (!h.put(type, c.x, c.z, { rot: c.rot })) { h.restore(S); continue; }
    const r2 = h.approach();
    if (h.reach().missing.length > m0 || !r2 || r2.length !== len0) { h.restore(S); continue; }
    const [w, d] = c.rot ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    const fs = c.x + w - 1 + c.z + d - 1, lat = c.x + (w - 1) / 2 - c.z - (d - 1) / 2;
    const veil = h.removeDecor((e) => !hard(e) && (CATALOG[e.t]?.height ?? 0) >= 1.2 && e.x + e.z > fs && e.x + e.z <= fs + 3 && Math.abs(e.x - e.z - lat) <= (w + d) / 2);
    h.log.push(`landmark ${type} at ${c.x},${c.z} rot ${c.rot}, ${c.removed} decor cleared, ${veil} tall decor in front cleared`);
    if (!level.pieces) level.pieces = [];
    if (!level.pieces.includes(SELF)) level.pieces.push(SELF);
    return [c.x, c.z];
  }
  h.log.push(`landmark ${type}: no flat clear footprint beside the figure`);
  return null;
}
