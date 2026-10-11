import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = JSON.parse(fs.readFileSync(path.join(root, "levels/sharkbear-medium.json"), "utf8"));
const clone = () => JSON.parse(JSON.stringify(src));
const PIECE = "pieces/concept-focal.js";

const inRect = (d, [x0, z0, x1, z1]) => d.x >= x0 && d.x <= x1 && d.z >= z0 && d.z <= z1;
const block = (x, z) => ({ t: "cf-block", x, z, v: 0, rot: 0, ox: 0, oz: 0 });
const clear = (L, rects) => { L.decor = L.decor.filter((d) => !rects.some((r) => inRect(d, r))); };
const set = (L, x, z, c) => { L.cells[z][x] = c; };
const noRun = (L) => { L.things = (L.things || []).filter((t) => t.kind === "bonfire" || t.kind === "chest"); };

function focalA() {
  const L = clone();
  L.name = "concept-focal-a";
  noRun(L);
  clear(L, [[12, 6, 28, 14]]);
  L.decor = L.decor.filter((d) => d.t !== "selachian-ursine-stalker");
  for (let x = 15; x <= 24; x++) for (let z = 9; z <= 11; z++) set(L, x, z, { h: 3, s: "stone" });
  set(L, 15, 10, { h: 3, s: "ramp", d: "w", m: "stone" });
  set(L, 14, 10, { h: 2, s: "ramp", d: "w", m: "stone" });
  set(L, 13, 10, { h: 1, s: "sand" });
  set(L, 13, 9, { h: 1, s: "sand" });
  for (const [x, z] of [[14, 9], [14, 11]]) set(L, x, z, { h: 0, s: "none" });
  for (let x = 25; x <= 27; x++) for (let z = 9; z <= 11; z++) { set(L, x, z, { h: 1, s: "sand" }); L.decor.push(block(x, z)); }
  for (const [x, z] of [[19, 9], [23, 13], [23, 7], [17, 13], [15, 8]]) L.decor.push(block(x, z));
  for (const [x, z] of [[23, 13], [23, 7], [17, 13], [15, 8]]) if (L.cells[z][x].s === "none") set(L, x, z, { h: 1, s: "sand" });
  L.spawn = [13, 9];
  return L;
}

function focalB() {
  const L = clone();
  L.name = "concept-focal-b";
  noRun(L);
  L.decor = L.decor.filter((d) => d.t !== "selachian-ursine-stalker");
  clear(L, [[17, 11, 18, 12], [19, 16, 21, 17], [26, 12, 26, 12], [24, 14, 25, 15], [14, 16, 14, 16], [22, 9, 22, 9], [15, 12, 16, 13]]);
  for (const [x, z] of [[17, 11], [18, 11], [17, 12], [18, 12], [26, 12], [25, 15], [14, 16], [22, 9]]) L.decor.push(block(x, z));
  return L;
}

function focalC() {
  const L = clone();
  L.name = "concept-focal-c";
  noRun(L);
  L.decor = L.decor.filter((d) => d.t !== "selachian-ursine-stalker");
  clear(L, [[15, 9, 21, 15]]);
  for (let x = 17; x <= 19; x++) for (let z = 11; z <= 13; z++) { set(L, x, z, { h: 1, s: "sand" }); L.decor.push(block(x, z)); }
  return L;
}

function follow() {
  const L = clone();
  L.name = "concept-follow";
  return L;
}

for (const L of [focalA(), focalB(), focalC(), follow()]) {
  L.pieces = [...(L.pieces || []), PIECE];
  delete L.edits;
  delete L.outgrowths;
  const out = path.join(root, "levels", L.name + ".json");
  fs.writeFileSync(out, JSON.stringify(L));
  console.log(out);
}
