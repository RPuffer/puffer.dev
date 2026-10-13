import fs from "node:fs";
import path from "node:path";
import { registerCatalog } from "../core/catalog.js";
import { placeCharges } from "../core/layout/pickups.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const W = 32, D = 26;
const cells = Array.from({ length: D }, () => Array.from({ length: W }, () => ({ h: 0, s: "none" })));
const land = (x, z, s = "grass") => { cells[z][x] = { h: 1, s }; };
const road = (x, z) => { cells[z][x] = { h: 1, s: "stone", p: 1 }; };
const rect = (x0, z0, x1, z1, f) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) f(x, z); };
const line = (a, b, f) => {
  const dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]);
  for (let x = a[0], z = a[1]; ; x += dx, z += dz) { f(x, z); if (x === b[0] && z === b[1]) break; }
};

rect(12, 10, 18, 14, (x, z) => land(x, z, "sand"));
line([12, 12], [18, 12], road);
line([15, 10], [15, 14], road);

line([11, 12], [4, 12], road);
rect(1, 11, 3, 13, (x, z) => land(x, z));

line([19, 12], [27, 12], road);
line([22, 13], [26, 13], (x, z) => land(x, z));
rect(28, 11, 30, 13, (x, z) => land(x, z));

line([15, 9], [15, 9], road);
line([13, 9], [17, 9], road);
line([13, 8], [13, 4], road);
line([17, 8], [17, 4], road);
line([14, 4], [16, 4], road);
rect(14, 1, 16, 3, (x, z) => land(x, z));

line([12, 15], [12, 15], road);
line([11, 15], [11, 22], road);
land(10, 18, "dirt");
land(10, 17);
land(10, 19);
rect(9, 23, 13, 24, (x, z) => land(x, z));
line([11, 23], [11, 23], road);

line([18, 15], [19, 15], road);
line([19, 16], [19, 23], road);
land(20, 18);
land(20, 21);
rect(21, 20, 23, 22, (x, z) => land(x, z));

line([19, 10], [19, 9], road);
line([20, 9], [24, 9], road);
line([20, 8], [23, 8], (x, z) => land(x, z));
line([20, 10], [23, 10], (x, z) => land(x, z));
line([24, 8], [24, 7], road);
rect(23, 2, 30, 6, (x, z) => land(x, z));
line([24, 6], [24, 3], road);
line([25, 3], [29, 3], road);

line([12, 9], [4, 9], road);
line([4, 8], [4, 7], road);
rect(3, 3, 5, 6, (x, z) => land(x, z, "stone"));
road(4, 6);
road(4, 2);
land(4, 1, "stone");

const decor = [
  { t: "torch", x: 20, z: 10, v: 0 },
  { t: "torch", x: 12, z: 11, v: 0 },
  { t: "torch", x: 18, z: 11, v: 0 },
  { t: "tree-round", x: 1, z: 11, v: 0 },
  { t: "rock", x: 3, z: 13, v: 1 },
  { t: "tree-pine", x: 30, z: 11, v: 1 },
  { t: "bush", x: 14, z: 1, v: 0 },
  { t: "flower", x: 16, z: 2, v: 1 },
  { t: "waymark", x: 26, z: 5, rot: 0, v: 0 },
  { t: "waymark", x: 29, z: 5, rot: 0, v: 0 },
  { t: "lantern", x: 27, z: 2, v: 0 },
  { t: "tree-orange", x: 30, z: 6, v: 0 },
  { t: "rock", x: 9, z: 24, v: 0 },
  { t: "barrel", x: 23, z: 22, v: 0 },
];
for (const d of decor) if (cells[d.z][d.x].s === "none") throw new Error(`decor ${d.t} at ${d.x},${d.z} over air`);

const things = [
  { id: "fire", kind: "bonfire", x: 16, z: 10, text: "Bonfire lit. Traps reset when you rest." },
  { id: "plate-gate", kind: "gate", x: 4, z: 2, span: "x", edge: [[4, 3], [4, 2]], blocks: [[4, 2]], open: "trap:order" },
  { id: "plate-chest", kind: "chest", x: 4, z: 1, rot: 2, text: "The order plates paid out." },
];

const traps = [
  { id: "spikes", kind: "t03", cells: [[9, 12], [8, 12], [7, 12], [6, 12]] },
  { id: "arrows", kind: "t25", cells: [[22, 12], [23, 12], [24, 12], [25, 12], [26, 12]], plate: [23, 12], side: "n" },
  { id: "worn", kind: "t02", cells: [[17, 7], [17, 6], [17, 5]] },
  { id: "kick", kind: "t24", cells: [[11, 16], [11, 17], [11, 18], [11, 19], [11, 20]], kick: [11, 18], boss: [10, 18] },
  { id: "chariot", kind: "t26", cells: [[19, 16], [19, 17], [19, 18], [19, 19], [19, 20], [19, 21], [19, 22], [19, 23]], plate: [19, 15], notches: [[20, 18], [20, 21]] },
  { id: "block", kind: "t21", cells: [[22, 9]] },
  { id: "fog", kind: "t33", zone: [23, 2, 30, 7], text: "Fog rolls in over the garden. You see three cells around you." },
  { id: "order", kind: "t40", cells: [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4], [5, 4], [3, 5], [4, 5], [5, 5], [4, 6]], plates: [[3, 3], [5, 3], [3, 5], [5, 5]], lamps: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], order: [2, 0, 3, 1], gate: "plate-gate" },
];

const level = {
  name: "traps-showcase",
  concept: "trap showcase",
  size: [W, D],
  cells,
  decor,
  spawn: [15, 12],
  bg: "#404040",
  pieces: ["pieces/kits.js"],
  palette: { kitTheme: "wizard" },
  light: { dir: [-0.5, 1, 0.3], ambient: 0.9, sun: 0.2 },
  trapRules: "showcase",
  things,
  traps,
};
for (const p of level.pieces) {
  const mod = await import(path.join(root, "3d", p));
  if (mod.register) registerCatalog((await mod.register({ palette: level.palette })).catalog || {});
}
level.charges = placeCharges(level, { seed: 1 });
fs.writeFileSync(path.join(root, "levels/traps-showcase.json"), JSON.stringify(level) + "\n");
console.log("wrote levels/traps-showcase.json");
