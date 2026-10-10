import { CATALOG } from "../core/catalog.js";
import { prepareLevel } from "../core/level.js";
import { start, readParams } from "../core/game.js";
import { createRenderer } from "./renderer.js";

const entries = [];
for (const [t, spec] of Object.entries(CATALOG)) for (let v = 0; v < spec.variants; v++) entries.push({ t, v });
const cols = 8, W = cols * 2 + 1, rows = Math.ceil(entries.length / cols), D = rows * 2 + 2;
const cells = [];
for (let z = 0; z < D; z++) {
  const row = [];
  for (let x = 0; x < W; x++) row.push(z === D - 1 ? { h: 0, s: "water" } : { h: 1, s: z % 2 ? "sand" : "grass" });
  cells.push(row);
}
const decor = entries.map(({ t, v }, i) => {
  const x = 1 + (i % cols) * 2, z = 1 + Math.floor(i / cols) * 2;
  if (CATALOG[t].attach === "cliff" || t === "stepping-stones") cells[z][x] = { h: 0, s: "water" };
  if (t === "ladder") { cells[z][x] = { h: 2, s: "sand" }; cells[z + 1][x] = { h: 1, s: "sand" }; return { t, v, x, z, rot: 2 }; }
  if (t === "scaffold") { cells[z][x] = { h: 2, s: "bridge", m: "logs", w: 0 }; }
  if (t === "waterfall") cells[z - 1][x] = { h: 1, s: "water" };
  return { t, v, x, z, rot: 0 };
});
const level = prepareLevel({ name: "catalog", size: [W, D], cells, decor, spawn: [0, 0], bg: "#404040", view: { pitch: 35.264, yaw: 45, tileH: 1, zoom: 0 } });
const params = { ...readParams(), hero: "0" };
start(level, createRenderer(document.body), { params });
