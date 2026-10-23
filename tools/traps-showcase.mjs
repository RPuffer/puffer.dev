import fs from "node:fs";
import path from "node:path";
import { registerCatalog } from "../core/catalog.js";
import { placeCharges } from "../core/layout/pickups.js";
import { placeFences } from "../core/layout/fences.js";
import { lightsOutStart } from "../core/traps/kinds.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const COLS = 7, ROWS = 8, PITCH = 11, BLVD = 28;
const W = 4 + 9 * COLS, D = BLVD + PITCH * (ROWS - 1) + 11;
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
land(3, 12, "stone");
line([6, 11], [11, 11], (x, z) => land(x, z));
line([6, 13], [11, 13], (x, z) => land(x, z));

line([15, 15], [15, 17], road);
rect(14, 18, 16, 20, (x, z) => land(x, z, "stone"));
land(16, 21);

line([19, 12], [27, 12], road);
land(28, 12, "stone");
land(24, 13);

line([15, 9], [15, 4], road);
land(15, 3, "stone");

line([12, 15], [12, 15], road);
line([11, 15], [11, 22], road);
land(10, 18, "dirt");
land(11, 23, "stone");

line([18, 15], [19, 15], road);
line([19, 16], [19, 23], road);
land(20, 18);
land(20, 21);
land(20, 23, "stone");

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


line([10, 15], [2, 15], road);
line([2, 16], [2, BLVD + PITCH * (ROWS - 1)], road);
for (let k = 0; k < ROWS; k++) line([3, BLVD + PITCH * k], [W - 3, BLVD + PITCH * k], road);

const things2 = [], traps2 = [], decor2 = [];
const PLOTS = [];
const plot = (name, fn) => PLOTS.push({ name, fn });
const cellAt = (x, z) => cells[z][x];

plot("goose", (P) => {
  P.road([3, 0], [3, 6]);
  for (const c of [[2, 2], [4, 3], [2, 4]]) P.land(c);
  P.chest("goose-chest", [3, 7], 0, "The goose let you by.");
  P.trap({ id: "goose", kind: "t04", cells: P.run([3, 1], [3, 6]), plates: P.at([[2, 2], [4, 3], [2, 4]]), guards: { chest: "goose-chest" } });
});
plot("banana", (P) => {
  P.road([3, 0], [3, 4]);
  P.road([4, 4], [6, 4]);
  P.land([4, 3]);
  P.chest("banana-chest", [7, 4], 3, "You cut the corner.");
  P.trap({ id: "banana", kind: "t05", cells: P.at([[3, 4]]), from: P.A([3, 3]), on: P.A([3, 5]), cut: P.A([4, 3]), guards: { chest: "banana-chest" } });
});
plot("sneeze", (P) => {
  P.road([3, 0], [3, 3]);
  P.land([3, 4], "dirt"); P.land([3, 5], "dirt");
  P.chest("sneeze-chest", [3, 6], 0, "Bless you.");
  P.trap({ id: "sneeze", kind: "t06", cells: P.at([[3, 4], [3, 5]]), guards: { chest: "sneeze-chest" } });
});
plot("mimic", (P) => {
  P.road([3, 0], [3, 4]);
  P.rect([1, 5], [5, 7]);
  P.decor("mushroom", [1, 5]);
  P.thing({ id: "mimic-chest", kind: "chest", ...P.xz([3, 8]), rot: 0, trap: "mimic", decoy: true });
  P.trap({ id: "mimic", kind: "t07", cells: P.at([[3, 8]]), chest: "mimic-chest" });
});
plot("trapdoor", (P) => {
  P.road([3, 0], [3, 0]);
  P.cell([3, 1], { h: 2, s: "ramp", d: "n", p: 1 });
  P.road([3, 2], [3, 3], 2);
  P.cell([3, 4], { h: 2, s: "stone" });
  P.cell([3, 5], { h: 2, s: "stone" });
  P.rect([5, 0], [5, 4]);
  P.land([4, 4]);
  P.land([6, 2]); P.decor("barrel", [6, 2]);
  P.chest("trapdoor-chest", [3, 5], 0, "Loot. Then the floor goes.");
  P.trap({ id: "trapdoor", kind: "t08", cells: P.at([[3, 4]]), land: P.A([4, 4]), chest: "trapdoor-chest" });
});
plot("decoys", (P) => {
  P.road([3, 0], [3, 3]);
  P.rect([2, 4], [5, 4]);
  P.land([2, 5]); P.land([5, 5]);
  P.decor("flower", [4, 4]);
  P.thing({ id: "decoy-fire", kind: "lever", ...P.xz([2, 5]), rot: 0, trap: "campfire", decoy: true, verb: "Light the campfire" });
  P.thing({ id: "decoy-lever", kind: "lever", ...P.xz([5, 5]), rot: 0, trap: "lever", decoy: true });
  P.trap({ id: "campfire", kind: "t09", cells: P.at([[2, 5]]), thing: "decoy-fire", prop: "campfire" });
  P.trap({ id: "lever", kind: "t09", cells: P.at([[5, 5]]), thing: "decoy-lever", prop: "lever" });
});
plot("scoot", (P) => {
  P.road([3, 0], [3, 6]);
  P.rect([4, 1], [4, 6]);
  P.land([5, 3]);
  P.decor("rock", [5, 3]);
  P.chest("scoot-chest", [3, 7], 0, "The hole moved. You did too.");
  P.trap({ id: "scoot", kind: "t10", cells: P.at([[3, 3], [3, 4]]) });
});
plot("painted", (P) => {
  P.road([3, 0], [3, 6]);
  P.rect([4, 2], [4, 4]);
  P.land([2, 3]);
  P.decor("rock", [2, 3]);
  P.trap({ id: "painted", kind: "t11", cells: P.at([[3, 3]]), angle: 315 });
});
plot("spur", (P) => {
  P.road([3, 0], [3, 4]);
  P.road([4, 4], [5, 4]);
  for (const c of [[2, 4], [1, 4], [0, 4]]) P.land(c, "stone");
  P.chest("spur-chest", [6, 4], 3, "The real way paid.");
  P.trap({ id: "spur", kind: "t12", cells: P.at([[2, 4], [1, 4], [0, 4]]), guards: { at: P.A([0, 4]) } });
});
plot("stride", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("stride-chest", [3, 7], 0, "You walked it. Smart.");
  P.trap({ id: "stride", kind: "t13", cells: P.at([[3, 3]]), plate: P.A([3, 4]), guards: { chest: "stride-chest" } });
});
plot("decoy", (P) => {
  P.road([3, 0], [3, 6]);
  P.decor("rock", [4, 2]); P.land([4, 2]);
  P.trap({ id: "decoy", kind: "t14", cells: P.at([[3, 3], [3, 4]]) });
});
plot("faith", (P) => {
  P.road([3, 0], [3, 7]);
  P.chest("faith-chest", [3, 8], 0, "The path held.");
  P.trap({ id: "faith", kind: "t15", cells: P.at([[3, 3], [3, 4], [3, 5]]), h: 1, guards: { chest: "faith-chest" } });
});
plot("nothing", (P) => {
  P.road([3, 0], [3, 7]);
  P.chest("nothing-chest", [3, 8], 0, "Nothing happened. You still got paid.");
  P.trap({ id: "nothing", kind: "t16", cells: P.run([3, 1], [3, 6]), guards: { chest: "nothing-chest" } });
});
plot("twin", (P) => {
  P.road([3, 0], [3, 6]);
  P.land([4, 4]);
  P.trap({ id: "twin", kind: "t17", cells: P.at([[4, 4]]) });
});
plot("barrel", (P) => {
  P.road([3, 0], [3, 7]);
  P.land([4, 4]);
  P.chest("barrel-chest", [3, 8], 0, "You let the barrel by.");
  P.trap({ id: "barrel", kind: "t19", cells: P.run([3, 2], [3, 6]), dodge: P.A([4, 4]), guards: { chest: "barrel-chest" } });
});
plot("rewind", (P) => {
  P.road([3, 0], [3, 7]);
  P.land([4, 5]); P.decor("flower", [4, 5]);
  P.trap({ id: "rewind", kind: "t20", cells: P.at([[3, 5]]) });
});
plot("bridges", (P) => {
  P.road([3, 0], [3, 0]);
  P.cell([3, 1], { h: 1, s: "bridge", p: 1 }); P.cell([3, 2], { h: 1, s: "bridge", p: 1 });
  P.road([3, 3], [3, 3]);
  for (const z of [4, 5, 6]) P.cell([3, z], { h: 1, s: "bridge", p: 1 });
  P.road([3, 7], [3, 7]);
  P.land([4, 3]); P.decor("lantern", [4, 3]);
  P.chest("bridge-chest", [3, 8], 0, "Across both bridges.");
  P.trap({ id: "bridges", kind: "t27", kind1: P.at([[3, 1], [3, 2]]), cells: P.at([[3, 4], [3, 5], [3, 6]]), drop: 2 });
});
plot("signs", (P) => {
  P.road([3, 0], [3, 7]);
  P.land([4, 4]); P.decor("lantern", [4, 4]);
  P.chest("signs-chest", [3, 8], 0, "You waited for the creak.");
  P.trap({ id: "signs", kind: "t28", cells: P.run([3, 1], [3, 3]), second: P.run([3, 4], [3, 6]) });
});
plot("hall", (P) => {
  P.road([3, 0], [3, 8]);
  P.rect([2, 6], [2, 8]); P.land([4, 7]);
  P.decor("torch", [4, 7]);
  P.trap({ id: "hall", kind: "t29", cells: P.run([3, 1], [3, 5]), block: P.A([3, 7]) });
});
plot("chests", (P) => {
  P.road([3, 0], [3, 6]);
  P.road([2, 2], [1, 2]);
  P.road([4, 5], [5, 5]);
  P.chest("real-chest", [0, 2], 1, "A real chest. It pays.");
  P.thing({ id: "seq-mimic-chest", kind: "chest", ...P.xz([6, 5]), rot: 3, trap: "seqmimic", decoy: true });
  P.trap({ id: "seqmimic", kind: "t30", cells: P.at([[6, 5]]), chest: "seq-mimic-chest", real: "real-chest" });
});
plot("coins", (P) => {
  P.road([3, 0], [3, 4]);
  for (const c of [[4, 4], [5, 4], [5, 5], [6, 5], [6, 6]]) P.land(c);
  P.decor("flower", [2, 4]); P.land([2, 4]);
  P.trap({ id: "coins", kind: "t31", coins: P.at([[3, 1], [3, 2], [3, 3], [3, 4], [4, 4], [5, 5], [6, 6]]), angle: 315 });
});
plot("vanish", (P) => {
  P.road([3, 0], [3, 8]);
  P.rect([4, 1], [6, 3]);
  P.rect([4, 5], [4, 7]);
  P.decor("rock", [6, 5]); P.land([6, 5]);
  P.trap({ id: "vanish", kind: "t01", cells: P.rectCells([4, 1], [6, 3]), spring: P.A([3, 5]), gate: P.A([3, 6]) });
});
const garden = (name, kind, extra = {}) => plot(name, (P) => {
  P.road([3, 0], [3, 7]);
  P.rect([1, 1], [2, 7]);
  P.rect([4, 1], [6, 7]);
  P.decor("rock", [5, 3]);
  P.decor("bush", [1, 6]);
  P.trap({ id: name, kind, zone: P.zone(), ...extra });
});
garden("mirror", "t32");
garden("nap", "t34");
garden("slick", "t35");
garden("gusts", "t36", { dir: "e" });
garden("sticky", "t37");
garden("stuck", "t38");
garden("hiccups", "t39");
plot("crates", (P) => {
  P.road([3, 0], [3, 1]);
  P.rect([2, 2], [5, 5]);
  P.cell([6, 3], { h: 1, s: "stone" });
  P.thing({ id: "crate-gate", kind: "gate", ...P.xz([6, 3]), span: "z", edge: P.at([[5, 3], [6, 3]]), blocks: P.at([[6, 3]]), open: "trap:crates" });
  P.chest("crate-chest", [7, 3], 3, "Pushed and paid.");
  P.trap({ id: "crates", kind: "t41", cells: P.rectCells([2, 2], [5, 5]), crates: P.at([[4, 3]]), plate: P.A([4, 5]), bellAt: P.A([2, 5]), gate: "crate-gate" });
});
plot("lights", (P) => {
  P.road([3, 0], [3, 1]);
  P.rect([2, 2], [4, 4]);
  P.land([1, 2]);
  P.cell([5, 3], { h: 1, s: "stone" });
  P.thing({ id: "lights-gate", kind: "gate", ...P.xz([5, 3]), span: "z", edge: P.at([[4, 3], [5, 3]]), blocks: P.at([[5, 3]]), open: "trap:lights" });
  P.chest("lights-chest", [6, 3], 3, "All nine lit.");
  P.trap({ id: "lights", kind: "t42", cells: P.rectCells([2, 2], [4, 4]), bellAt: P.A([1, 2]), start: lightsOutStart([1, 4, 5]), gate: "lights-gate" });
});
plot("onevisit", (P) => {
  P.road([2, 0], [2, 1]);
  P.rect([2, 2], [4, 5]);
  P.cell([1, 5], { h: 1, s: "stone" });
  P.thing({ id: "visit-gate", kind: "gate", ...P.xz([1, 5]), span: "z", edge: P.at([[2, 5], [1, 5]]), blocks: P.at([[1, 5]]), open: "trap:onevisit" });
  P.chest("visit-chest", [0, 5], 1, "Every tile once.");
  P.trap({ id: "onevisit", kind: "t43", cells: P.rectCells([2, 2], [4, 5]), entry: P.A([2, 1]), exit: P.A([2, 5]), gate: "visit-gate" });
});
plot("gaze", (P) => {
  P.road([3, 0], [3, 7]);
  P.land([4, 4]);
  P.land([5, 4]);
  P.thing({ id: "gaze-watcher", kind: "watcher", ...P.xz([5, 4]), radius: 3.5 });
  P.chest("gaze-chest", [3, 8], 0, "Seen across.");
  P.trap({ id: "gaze", kind: "t44", cells: P.at([[3, 3], [3, 4], [3, 5]]), watcher: "gaze-watcher", start: P.A([3, 2]), h: 1, totem: true });
});
plot("valves", (P) => {
  P.road([3, 0], [3, 6]);
  P.land([2, 2]); P.land([4, 4]);
  P.thing({ id: "valve-a", kind: "lever", ...P.xz([2, 2]), rot: 0, trap: "valves", verb: "Pull the valve lever" });
  P.thing({ id: "valve-b", kind: "lever", ...P.xz([4, 4]), rot: 0, trap: "valves", verb: "Pull the valve lever" });
  P.chest("valve-chest", [3, 7], 0, "Through both gates.");
  P.trap({ id: "valves", kind: "t45", gates: P.at([[3, 5], [3, 3]]), levers: ["valve-a", "valve-b"] });
});
plot("angle", (P) => {
  P.road([3, 0], [3, 7]);
  P.chest("angle-chest", [3, 8], 0, "It lined up.");
  P.trap({ id: "angle", kind: "t46", cells: P.at([[3, 3], [3, 4], [3, 5], [3, 6]]), yaw: 135, start: P.A([3, 2]), h: 1 });
});
plot("flash", (P) => {
  P.road([3, 0], [3, 1]);
  P.rect([2, 2], [5, 5]);
  P.cell([4, 6], { h: 1, s: "stone" });
  P.thing({ id: "flash-gate", kind: "gate", ...P.xz([4, 6]), span: "x", edge: P.at([[4, 5], [4, 6]]), blocks: P.at([[4, 6]]), open: "trap:flash" });
  P.chest("flash-chest", [4, 7], 0, "From memory.");
  P.trap({ id: "flash", kind: "t47", cells: P.rectCells([2, 2], [5, 5]), start: P.A([3, 1]), safe: P.at([[3, 2], [3, 3], [4, 3], [4, 4], [4, 5]]), gate: "flash-gate" });
});
plot("counting", (P) => {
  P.road([3, 0], [3, 5]);
  P.land([2, 3]); P.land([4, 3]);
  P.cell([3, 6], { h: 1, s: "stone" });
  P.thing({ id: "count-gate", kind: "gate", ...P.xz([3, 6]), span: "x", edge: P.at([[3, 5], [3, 6]]), blocks: P.at([[3, 6]]), open: "trap:counting" });
  P.chest("count-chest", [3, 7], 0, "Counted out.");
  P.trap({ id: "counting", kind: "t48", cells: P.run([3, 1], [3, 5]), post: P.A([4, 5]), gate: "count-gate" });
});
plot("mirrortwin", (P) => {
  P.road([1, 0], [1, 1]);
  P.rect([1, 2], [2, 5]);
  P.cell([2, 6], { h: 1, s: "stone" });
  P.thing({ id: "twin-gate", kind: "gate", ...P.xz([2, 6]), span: "x", edge: P.at([[2, 5], [2, 6]]), blocks: P.at([[2, 6]]), open: "trap:mirrortwin" });
  P.chest("twin-chest", [2, 7], 0, "You and your twin.");
  P.trap({ id: "mirrortwin", kind: "t49", cells: P.rectCells([1, 2], [2, 5]), ghostCells: P.rectCells([5, 2], [6, 5]), plate: P.A([2, 5]), ghostPlate: P.A([5, 5]), ghostStart: P.A([6, 3]), mirror: "x", gate: "twin-gate" });
});
plot("pictos", (P) => {
  P.road([3, 0], [3, 4]);
  P.rect([2, 5], [5, 5]);
  P.rect([2, 6], [4, 7]);
  P.land([6, 5], "dirt");
  P.chest("picto-chest", [3, 8], 0, "The right picture.");
  P.trap({ id: "pictos", kind: "t50", marks: [{ cell: P.A([3, 1]), glyph: "circle" }, { cell: P.A([3, 2]), glyph: "triangle" }, { cell: P.A([3, 3]), glyph: "square" }], gates: [{ cell: P.A([2, 6]), glyph: "circle" }, { cell: P.A([3, 6]), glyph: "square" }, { cell: P.A([4, 6]), glyph: "triangle" }], ledge: P.A([6, 5]) });
});
plot("fuse", (P) => {
  P.road([3, 0], [3, 7]);
  P.land([4, 1]); P.land([4, 2]);
  P.thing({ id: "fuse-lever", kind: "lever", ...P.xz([4, 1]), rot: 3, trap: "fuse", verb: "Light the fuse" });
  P.chest("fuse-chest", [3, 8], 0, "Across before the bridge rose.");
  P.trap({ id: "fuse", kind: "t51", cells: P.at([[3, 3], [3, 4], [3, 5], [3, 6]]), lever: "fuse-lever", near: P.A([3, 2]), fuseCells: P.at([[4, 2]]), h: 1 });
});
plot("belts", (P) => {
  P.road([3, 0], [3, 1]);
  P.rect([2, 2], [5, 5]);
  P.land([2, 1]); P.land([1, 1]); P.land([1, 2]);
  P.cell([4, 6], { h: 1, s: "stone" });
  P.cell([4, 7], { h: 1, s: "stone" });
  P.thing({ id: "belt-gate", kind: "gate", ...P.xz([4, 7]), span: "x", edge: P.at([[4, 6], [4, 7]]), blocks: P.at([[4, 7]]), open: "trap:belts" });
  P.chest("belt-chest", [4, 8], 0, "Delivered.");
  P.trap({ id: "belts", kind: "t53", cells: P.rectCells([2, 2], [5, 5]), dirs: ["e", "s", "w", "w", "n", "w", "s", "w", "n", "n", "s", "w", "n", "n", "s", "w"], flip: [0, 2, 3, 5, 7, 8, 12, 15], switchAt: P.A([1, 2]), exit: P.A([4, 6]), gate: "belt-gate" });
});

plot("spring", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("spring-chest", [3, 7], 0, "Past the spring.");
  P.trap({ id: "spring", kind: "t18", cells: P.at([[3, 4]]), guards: { chest: "spring-chest" } });
});
plot("pancake", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("pancake-chest", [3, 7], 0, "You read the shadow.");
  P.trap({ id: "pancake", kind: "t22", cells: P.at([[3, 4]]), guards: { chest: "pancake-chest" } });
});
plot("turntable", (P) => {
  P.road([3, 0], [3, 6]);
  P.road([4, 3], [5, 3]);
  P.chest("turn-chest", [3, 7], 0, "Still facing the right way.");
  P.trap({ id: "turntable", kind: "t23", cells: P.at([[3, 3]]), guards: { chest: "turn-chest" } });
});

plot("falsefloor", (P) => {
  P.road([3, 0], [3, 6]);
  P.rect([4, 2], [4, 4]);
  P.decor("rock", [5, 3]);
  P.trap({ id: "falsefloor", kind: "t54", cells: P.at([[3, 3]]) });
});
plot("falsedetour", (P) => {
  P.road([3, 0], [3, 6]);
  P.rect([2, 2], [2, 4]);
  P.rect([4, 2], [4, 4]);
  P.decor("rock", [6, 3]);
  P.trap({ id: "falsedetour", kind: "t55", cells: P.at([[3, 3], [4, 3], [2, 3]]), prev: P.A([3, 2]), next: P.A([3, 4]) });
});
plot("inkpit", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("ink-chest", [3, 7], 0, "Over the ink.");
  P.trap({ id: "inkpit", kind: "t56", cells: P.at([[3, 3]]) });
});
plot("wardarch", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("ward-chest", [3, 7], 0, "The ward took the shock.");
  P.trap({ id: "wardarch", kind: "t57", cells: P.at([[3, 3]]) });
});
plot("gnasher", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("gnash-chest", [3, 7], 0, "Faster than the jaws.");
  P.trap({ id: "gnasher", kind: "t58", cells: P.at([[3, 3]]), phase: 0 });
});
plot("plank", (P) => {
  P.road([3, 0], [3, 6]);
  P.chest("plank-chest", [3, 7], 0, "The plank held in the light.");
  P.trap({ id: "plank", kind: "t59", cells: P.at([[3, 3]]) });
});
plot("seal", (P) => {
  P.road([3, 0], [3, 5]);
  P.cell([3, 6], { h: 1, s: "stone" });
  P.thing({ id: "seal-gate", kind: "gate", ...P.xz([3, 6]), span: "x", edge: P.at([[3, 5], [3, 6]]), blocks: P.at([[3, 6]]), open: "trap:seal" });
  P.chest("seal-chest", [3, 7], 0, "The seal knew you.");
  P.trap({ id: "seal", kind: "t60", cells: P.at([[3, 5]]), cls: "aws", gate: "seal-gate" });
});

if (PLOTS.length > ROWS * COLS) throw new Error(`${PLOTS.length} plots, room for ${ROWS * COLS}`);
const plotAt = {};
PLOTS.forEach((pl, i) => {
  const ox = 4 + 9 * (i % COLS), oz = BLVD + 1 + PITCH * Math.floor(i / COLS);
  plotAt[pl.name] = [ox, oz];
  const A = ([x, z]) => [ox + x, oz + z];
  const P = {
    A,
    at: (cs) => cs.map(A),
    xz: (c) => ({ x: ox + c[0], z: oz + c[1] }),
    cell: (c, v) => { const [x, z] = A(c); cells[z][x] = v; },
    land: (c, s = "grass") => land(...A(c), s),
    road: (a, b, h = 1) => line(A(a), A(b), (x, z) => { cells[z][x] = { h, s: "stone", p: 1 }; }),
    rect: (a, b, s = "grass") => rect(...A(a), ...A(b), (x, z) => land(x, z, s)),
    rectCells: (a, b) => { const out = []; for (let z = a[1]; z <= b[1]; z++) for (let x = a[0]; x <= b[0]; x++) out.push(A([x, z])); return out; },
    run: (a, b) => { const out = []; line(A(a), A(b), (x, z) => out.push([x, z])); return out; },
    zone: () => [ox, oz, ox + 7, oz + 8],
    decor: (t, c) => { const [x, z] = A(c); if (cellAt(x, z).s === "none") land(x, z); decor2.push({ t, x, z, v: 0 }); },
    chest: (id, c, rot, text) => { const [x, z] = A(c); if (cellAt(x, z).s === "none") cells[z][x] = { h: cellAt(x, z - 1)?.h || 1, s: "stone" }; things2.push({ id, kind: "chest", x, z, rot, text }); },
    thing: (t) => { if (cellAt(t.x, t.z).s === "none") land(t.x, t.z); things2.push(t); },
    trap: (t) => traps2.push(t),
  };
  pl.fn(P);
});

const decor = [
  { t: "torch", x: 20, z: 10, v: 0 },
  { t: "torch", x: 12, z: 11, v: 0 },
  { t: "torch", x: 18, z: 11, v: 0 },
  { t: "waymark", x: 26, z: 5, rot: 0, v: 0 },
  { t: "waymark", x: 29, z: 5, rot: 0, v: 0 },
  { t: "lantern", x: 27, z: 2, v: 0 },
  { t: "tree-orange", x: 30, z: 6, v: 0 },
  { t: "rock-big", x: 16, z: 21, v: 0 },
];
decor.push(...decor2);
for (const d of decor) if (cells[d.z][d.x].s === "none") throw new Error(`decor ${d.t} at ${d.x},${d.z} over air`);

const things = [
  { id: "fire", kind: "bonfire", x: 16, z: 10, text: "Bonfire lit. Traps reset when you rest." },
  { id: "plate-gate", kind: "gate", x: 4, z: 2, span: "x", edge: [[4, 3], [4, 2]], blocks: [[4, 2]], open: "trap:order" },
  { id: "plate-chest", kind: "chest", x: 4, z: 1, rot: 2, text: "The order plates paid out." },
  { id: "spikes-chest", kind: "chest", x: 3, z: 12, rot: 1, text: "You beat the spikes to it." },
  { id: "arrows-chest", kind: "chest", x: 28, z: 12, rot: 3, text: "You waited out the volley." },
  { id: "worn-chest", kind: "chest", x: 15, z: 3, rot: 2, text: "Worth the cracks. Mind the way back." },
  { id: "kick-chest", kind: "chest", x: 11, z: 23, rot: 0, text: "The brute was guarding this." },
  { id: "chariot-chest", kind: "chest", x: 20, z: 23, rot: 3, text: "The chariot's toll, unpaid." },
  ...things2,
];

const traps = [
  { id: "spikes", kind: "t03", cells: [[9, 12], [8, 12], [7, 12], [6, 12]], guards: { chest: "spikes-chest" } },
  { id: "arrows", kind: "t25", cells: [[22, 12], [23, 12], [24, 12], [25, 12], [26, 12]], plate: [22, 12], cover: [24, 13], guards: { chest: "arrows-chest" } },
  { id: "worn", kind: "t02", cells: [[15, 7], [15, 6], [15, 5]], guards: { chest: "worn-chest" } },
  { id: "kick", kind: "t24", cells: [[11, 16], [11, 17], [11, 18], [11, 19], [11, 20]], kick: [11, 18], boss: [10, 18], guards: { chest: "kick-chest" } },
  { id: "chariot", kind: "t26", cells: [[19, 16], [19, 17], [19, 18], [19, 19], [19, 20], [19, 21], [19, 22], [19, 23]], plate: [19, 15], notches: [[20, 18], [20, 21]], guards: { chest: "chariot-chest" } },
  { id: "block", kind: "t21", cells: [[22, 9]] },
  { id: "ice", kind: "t52", cells: [[14, 18], [15, 18], [16, 18], [14, 19], [15, 19], [16, 19], [14, 20], [15, 20], [16, 20]] },
  { id: "fog", kind: "t33", zone: [23, 2, 30, 7], text: "Fog rolls in over the garden. You see three cells around you." },
  ...traps2,
  { id: "order", kind: "t40", cells: [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4], [5, 4], [3, 5], [4, 5], [5, 5], [4, 6]], plates: [[3, 3], [5, 3], [3, 5], [5, 5]], lamps: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], order: [2, 0, 3, 1], gate: "plate-gate" },
];

for (const t of traps) for (const c of [...(t.dodge ? [t.dodge] : []), ...(t.cover ? [t.cover] : []), ...(t.notches || [])]) for (const q of t.cells) {
  const d = [c[0] - q[0], c[1] - q[1]];
  if (Math.abs(d[0]) + Math.abs(d[1]) !== 1) continue;
  const b = [c[0] + d[0], c[1] + d[1]];
  if (cells[b[1]]?.[b[0]] && cells[b[1]][b[0]].s === "none" && cells[c[1]][c[0]].h === 1) land(b[0], b[1]);
}

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
  plots: plotAt,
  things,
  traps,
};
const pathCells = [];
cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) pathCells.push([x, z]); }));
const branchOf = (x, z) => z >= 15 || (x === 15 && z >= 15) || (z >= 15 && (x === 11 || x === 12)) || (z >= 15 && (x === 18 || x === 19)) || z <= 9;
level.route = {
  segments: [
    { id: "main", role: "spine", cells: pathCells.filter(([x, z]) => !branchOf(x, z)) },
    { id: "spokes", role: "branch", cells: pathCells.filter(([x, z]) => branchOf(x, z)) },
  ],
  shortcuts: [],
  trapSlots: [],
  features: [],
};
for (const p of level.pieces) {
  const mod = await import(path.join(root, "3d", p));
  if (mod.register) registerCatalog((await mod.register({ palette: level.palette })).catalog || {});
}
if (!process.argv.includes("--no-fences")) {
  const f = placeFences(level, { seed: 1 });
  console.log(`fences ${f.material}: ${f.runs} runs, ${f.cells} cells, ${(f.share * 100).toFixed(1)}% of ${f.edges} edge cells, flank ${f.reasons.flank}, spine ${f.reasons.spine}, gaps ${f.gaps}${f.dropped.length ? ", dropped " + f.dropped.join("; ") : ""}`);
}
level.charges = placeCharges(level, { seed: 1 });
fs.writeFileSync(path.join(root, "levels/traps-showcase.json"), JSON.stringify(level) + "\n");
console.log("wrote levels/traps-showcase.json");
