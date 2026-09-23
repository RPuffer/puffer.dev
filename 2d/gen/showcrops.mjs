import sharp from "sharp";
import { CROPS } from "./crops.mjs";
const dir = new URL("../../ref/", import.meta.url).pathname;
const out = process.argv[2];
const tiles = [];
for (const [k, [f, l, t, w, h]] of Object.entries(CROPS)) tiles.push({ k, buf: await sharp(dir + f + ".png").extract({ left: l, top: t, width: w, height: h }).resize(w * 2, h * 2, { kernel: "nearest" }).png().toBuffer(), w: w * 2, h: h * 2 });
let x = 0, y = 0, rowH = 0; const comp = []; const W = 1400;
for (const t of tiles) { if (x + t.w > W) { x = 0; y += rowH + 20; rowH = 0; } comp.push({ input: t.buf, left: x, top: y }); comp.push({ input: Buffer.from(`<svg width="${t.w}" height="16"><text x="2" y="12" font-size="12" fill="white">${t.k}</text></svg>`), left: x, top: y }); x += t.w + 10; rowH = Math.max(rowH, t.h); }
await sharp({ create: { width: W, height: y + rowH + 10, channels: 3, background: "#000" } }).composite(comp).png().toFile(out);
