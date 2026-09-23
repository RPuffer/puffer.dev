import fs from "node:fs";
import sharp from "sharp";
const A = new URL("../assets/", import.meta.url).pathname;
const M = JSON.parse(fs.readFileSync(A + "manifest.json", "utf8"));
const S = M.sprites;
const pad = 16, maxW = 2200;
const groups = [S.filter((s) => s.cat === "tile" || s.type === "waterfall"), S.filter((s) => s.cat === "decor" && s.type !== "waterfall"), S.filter((s) => s.cat === "character")];
const comp = []; let y = pad;
for (const g of groups) {
  let x = pad, rowH = 0;
  for (const s of g) { if (x + s.w > maxW) { x = pad; y += rowH + pad; rowH = 0; } comp.push({ input: A + s.file, left: x, top: y }); x += s.w + pad; rowH = Math.max(rowH, s.h); }
  y += rowH + pad * 3;
}
await sharp({ create: { width: maxW, height: y, channels: 4, background: "#404040" } }).composite(comp).png().toFile(A + "sheet.png");

const TW = M.tileWidth, T2 = M.topFaceHeight / 2, ST = M.blockStep;
const get = (id) => S.find((s) => s.id === id);
const cells = [
  [2, 2, 2, 1, 1],
  [2, 2, 1, 1, 1],
  [1, 1, 1, 1, 0],
  [1, 1, 1, 0, 0],
];
const surf = [["grass", "grass", "dirt", "sand", "sand"], ["grass", "stone", "sand", "sand", "sand"], ["grass", "dirt", "stone", "sand", "water"], ["sand", "sand", "sand", "water", "water"]];
const deco = [["tree-pine-0", 0, 0], ["tree-round-0", 1, 0], ["tree-orange-0", 4, 1], ["bush-0", 0, 2], ["well-0", 0, 3], ["barrel-0", 3, 0], ["coin-0", 2, 2], ["rock-0", 3, 2], ["fence-0", 1, 2], ["hero-front-0", 2, 3], ["flower-0", 4, 0]];
const items = [];
const ox = 700, oy = 420;
const scr = (x, z, h) => [ox + (x - z) * TW / 2, oy + (x + z) * T2 - h * ST];
for (let z = 0; z < cells.length; z++) for (let x = 0; x < cells[0].length; x++) {
  const h = cells[z][x], s = surf[z][x];
  if (s === "water") { const sp = get("tile-water"); const [sx, sy] = scr(x, z, 0.35); items.push({ k: (x + z) * 10, sp, sx, sy }); continue; }
  for (let l = 1; l <= h; l++) { const sp = get(l === h ? `tile-${s}` : "tile-cliff"); const [sx, sy] = scr(x, z, l); items.push({ k: (x + z) * 10 + l * 0.1, sp, sx, sy }); }
}
for (const [id, x, z] of deco) { const sp = get(id); const h = cells[z][x]; const [sx, sy] = scr(x + 0, z + 0, h); items.push({ k: (x + z) * 10 + 5, sp, sx, sy }); }
items.sort((a, b) => a.k - b.k);
await sharp({ create: { width: 1400, height: 1100, channels: 4, background: "#404040" } }).composite(items.map((i) => ({ input: A + i.sp.file, left: Math.round(i.sx - i.sp.anchor[0]), top: Math.round(i.sy - i.sp.anchor[1]) }))).png().toFile(process.argv[2] || "/dev/null");
console.log("sheet", maxW, y);
