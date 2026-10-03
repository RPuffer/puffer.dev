import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ITEMS } from "./gen.mjs";

const OUT = path.dirname(new URL(import.meta.url).pathname);
const MODEL = "gemini-3.1-flash-image";

const NOTES = {
  windmill: [1, "reads well: stone base and timber cap, sails clear; base sits a little back of centre and covers closer to 2x2 than 3x3"],
  watchtower: [1, "reads well: four legs on 2x2, ladder and roof, hero scale right"],
  gatehouse: [1, "reads well: walk-through arch and broken tower; grey stone sits close to the pack's white rocks"],
  "canopy-tree": [1, "reads well: root blocks spread over 3x3, crown matches the pack's round trees"],
  shipwreck: [2, "retry: 5x5 slab with a water back row, hull and dock clear; first try mixed two sand tones and lost the slab edge"],
  shrine: [1, "reads well: stepped plinth fills 3x3, pillars and roof slab, low and wide"],
  "market-row": [1, "reads well: three stalls on a 3x1 strip under one awning, the clearest footprint of the set"],
  "waterfall-cliff": [2, "retry: flat 5x5 slab with the cliff on top; adds grey rock blocks the pack lacks; first try merged cliff and slab"],
  "cat-paint-tube-windmill": [2, "weak: plinth fills 3x3 and colours fit the island, but the tower still reads as a stack, not a paint tube; sails are palette-knife shaped"],
  "dragon-graphite-crane": [1, "reads well: crane over a pit cut into the slab; spread runs past 3x2 and the timber is tan, not graphite"],
  "ember-brimstone-forge": [1, "reads well: glowing mouth, chimney, anvil and horn blocks on sand, island palette"],
  "chimera-ink-monolith": [1, "reads well: three leaning slabs on a 2x2 rock base; slab tops are rounded, edging off-style"],
  "wizard-scroll-tower": [1, "reads well: rolled scrolls under a blue hat roof and star; scrolls are cylinders, smoother than the pack"],
  "swallow-blade-arch": [1, "reads well: two leaning blades form a walk-through arch on 3x1; colours drift to plain grey"],
  "sharkbear-shard-watchtower": [1, "middling: crooked paper slabs read, but the top cap looks like a lantern and the slab is 4x5"],
  "gremlin-specimen-vat": [2, "retry: flat cyan glass with a dark creature silhouette, base and spool on 2x2; first try used see-through glass and loose pipes"],
  "mindbloom-doodle-fountain": [1, "reads well: lilac stepped basin, black bloom crown, four gold caps on 3x3"],
  "eagle-slate-eyrie": [1, "reads well: slate crag, log nest and gold spire on 3x3"],
  "forest-gilt-gazebo": [1, "reads well: gold dome, volute capitals, stepped plinth; grey-lilac island colours mostly absent"],
  "cosmos-stencil-press": [2, "retry: plain stencil frame, spray arm and tape rolls on 4x3; first try printed a picture on the stencil"],
};

const files = Object.keys(ITEMS);
const manifest = {
  model: MODEL,
  price_per_image: 0.045,
  style_images: ["ref/tilesheet.png", "2d/assets/sheet.png"],
  items: files.map((k) => {
    const t = ITEMS[k];
    return { item: k, island: t.island || null, footprint: [t.w, t.d], height_tiles: t.h, file: `pipeline/multitile/${k}.png`, tries: NOTES[k][0], note: NOTES[k][1] };
  }),
  ramp: { item: "windmill-ramp", footprints: [[2, 2], [3, 3], [4, 4]], heights_tiles: [3, 4, 5], file: "pipeline/multitile/windmill-ramp.png", tries: 2, note: "retry: square stone plinths that fill each footprint make 2x2, 3x3 and 4x4 read apart; first try grew in height only" },
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const T = 480, L = 34, COLS = 4, BG = "#2a2a2a";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (text, w) => Buffer.from(`<svg width="${w}" height="${L}"><rect width="100%" height="100%" fill="#1e1e1e"/><text x="10" y="23" font-family="Helvetica" font-size="18" fill="#e8e8e8">${esc(text)}</text></svg>`);
const rows = Math.ceil(files.length / COLS);
const rampH = Math.round((T * COLS) * 768 / 1376);
const comps = [];
for (const [i, k] of files.entries()) {
  const t = ITEMS[k];
  const x = (i % COLS) * T, y = Math.floor(i / COLS) * (T + L);
  const tag = `${k} ${t.w}x${t.d} h${t.h}${t.island ? ` (${t.island})` : ""}`;
  comps.push({ input: label(tag, T), left: x, top: y });
  comps.push({ input: await sharp(path.join(OUT, `${k}.png`)).resize(T, T, { fit: "contain", background: BG }).toBuffer(), left: x, top: y + L });
}
const ry = rows * (T + L);
comps.push({ input: label("windmill-ramp 2x2 h3 / 3x3 h4 / 4x4 h5", T * COLS), left: 0, top: ry });
comps.push({ input: await sharp(path.join(OUT, "windmill-ramp.png")).resize(T * COLS, rampH, { fit: "contain", background: BG }).toBuffer(), left: 0, top: ry + L });
await sharp({ create: { width: T * COLS, height: ry + L + rampH, channels: 3, background: BG } }).composite(comps).png().toFile(path.join(OUT, "sheet.png"));
console.log("manifest.json sheet.png");
