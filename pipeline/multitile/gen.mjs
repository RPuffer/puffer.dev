import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "pipeline/multitile");
const API = "https://generativelanguage.googleapis.com/v1beta";

export const ITEMS = {
  windmill: { w: 3, d: 3, h: 4, slab: "grass", what: "a windmill: a stone and timber tower with a pointed roof and four big flat sail blades" },
  watchtower: { w: 2, d: 2, h: 4, slab: "grass", what: "a timber watchtower: four log legs, cross braces, a plank platform with a small pointed roof and a ladder" },
  gatehouse: { w: 3, d: 2, h: 3, slab: "grass", what: "a ruined stone gatehouse: two square towers joined by an arch with a walk-through gap, one tower broken off, a few fallen blocks" },
  "canopy-tree": { w: 3, d: 3, h: 4, slab: "grass", what: "a giant canopy tree: one thick trunk with root blocks spreading over the footprint and a wide stacked-block crown like the pack's round trees" },
  shipwreck: { w: 4, d: 2, h: 3, slab: "sand", what: "a shipwreck beached beside a plank dock: a tilted broken wooden hull with one snapped mast, the pack's orange plank dock along one long side", slabNote: "the slab is sand blocks with one row of the pack's water blocks along the far edge" },
  shrine: { w: 3, d: 3, h: 2, slab: "grass", what: "a stone shrine: a stepped square plinth with four short pillars, a flat roof slab and a small altar block in the middle" },
  "market-row": { w: 3, d: 1, h: 2, slab: "sand", what: "a market row: three small timber stalls side by side under one striped awning, crates and pots on the counters" },
  "waterfall-cliff": { w: 2, d: 3, h: 3, slab: "grass", what: "a waterfall cliff block: a stack of the pack's dirt cliff blocks three high with grass on top, the pack's waterfall blocks pouring down its front face into a pool" },
  "cat-paint-tube-windmill": { w: 3, d: 3, h: 4, slab: "grass", island: "cat-medium", what: "a paint-tube windmill: the tower is a giant squeezed paint tube standing on its cap, the four sail blades are palette knives", colours: "#e8dfce, #df9e0c, #363a56, #cf610d, #5ac389, accent #c4616d" },
  "dragon-graphite-crane": { w: 3, d: 2, h: 4, slab: "grass", island: "dragon-medium", what: "a graphite quarry crane: an angular timber crane arm over a pit of stacked graphite slabs, a hanging slab on its rope", colours: "#ededed, #d8d8d8, #4a4a4a, #8fad68, #d2b47e" },
  "ember-brimstone-forge": { w: 3, d: 3, h: 3, slab: "sand", island: "ember-subject", what: "a brimstone forge: a squat dark stone furnace with a glowing mouth, a chimney stack, an anvil block and curved ram-horn blocks flanking the mouth", colours: "#42210c, #261509, #7b4328, #d9822b, #8a7565, accent #ff8a1a glow" },
  "chimera-ink-monolith": { w: 2, d: 2, h: 4, slab: "grass", island: "chimera-medium", what: "an ink-slab monolith: three tall leaning slabs of graphite stone stacked like broken plates, quill-spike blocks at the base", colours: "#e4e4da, #d8d5c8, #4d4741, #997b66, #8fb16d" },
  "wizard-scroll-tower": { w: 2, d: 2, h: 4, slab: "grass", island: "wizard-medium", what: "a parchment-scroll tower: a round tower built from rolled parchment scrolls stacked upright, a pointed midnight-blue hat roof with a star block on top", colours: "#ffffff, #f0e6cf, #122346, #644b48, #e8b84b" },
  "swallow-blade-arch": { w: 3, d: 1, h: 3, slab: "sand", island: "swallow-medium", what: "a calligraphy-blade arch: two tapered blade-shaped pylons leaning together to form a walk-through arch, like a forked swallow tail", colours: "#bfbeb7, #d6cec2, #2b2624, #dfbf84, #81ac64" },
  "sharkbear-shard-watchtower": { w: 2, d: 2, h: 4, slab: "grass", island: "sharkbear-medium", what: "a paper-shard watchtower: a tower of tilted angular paper slabs stacked crookedly, a lookout platform of slate shards and a fin-shaped roof", colours: "#e0e0e0, #c4c4c4, #5a5458, #c2a47e, #83a056" },
  "gremlin-specimen-vat": { w: 2, d: 2, h: 3, slab: "grass", island: "gremlin-subject", what: "a specimen vat: a tall square glass tank on a metal block base with a dim block-built creature floating inside, pipes and a spool on the side", colours: "#dfdfdf, #cad2d6, #8a7b68, #72c484, #dcb858" },
  "mindbloom-doodle-fountain": { w: 3, d: 3, h: 3, slab: "grass", island: "mindbloom-medium", what: "a doodle-bloom fountain: a stepped round basin of blocks with a central column topped by a spiky bloom of black hair-like blocks, three mushroom-cap blocks around the rim", colours: "#c3bdff, #0c0d0e, #2e3536, #f1cd52, #79ae69" },
  "eagle-slate-eyrie": { w: 3, d: 3, h: 4, slab: "grass", island: "eagle-composition", what: "a slate-shard eyrie: a crag of stacked slate shards rising to a big nest of log blocks on top, one tall bristle shingle spire", colours: "#cfc9b9, #e6dfd4, #4a463d, #e0b43a, #8faf6a" },
  "forest-gilt-gazebo": { w: 3, d: 3, h: 3, slab: "grass", island: "forest-volute", what: "a gilt gazebo: a rococo pavilion on a three-step plinth, four columns with volute scroll capitals and a domed gold roof with a flame crest finial", colours: "#e9efe6, #f4e2bf, #d4a83a gold, #3a2b3d, #8fc7a2" },
  "cosmos-stencil-press": { w: 4, d: 3, h: 3, slab: "sand", island: "cosmos-frisket", what: "a stencil press: a big flat bed with a raised hinged frame lifting a cut stencil sheet, a spray nozzle on an arm above, tape-roll blocks beside it", colours: "#ffc9a3, #5fd6e6, #b8a4f2, #f58fa6, #14120b" },
};

const SLAB = { grass: "the pack's grass blocks (green top, red-brown dirt sides)", sand: "the pack's sand blocks (golden top, red-brown dirt sides)" };

export function prompt(item, o = {}) {
  const t = { ...ITEMS[item], ...o };
  const colours = t.colours ? `Colours: ${t.colours}, plus the pack's own slab and hero colours. No other hues.` : "Colours: the pack's own palette only.";
  return `Image 1 and image 2 are an isometric game asset pack: chunky low-poly blocks in flat colour, every block face a single flat tone (top lightest, left middle, right darkest), slightly rounded block edges, no outlines, no gradients, no texture. Image 2's bottom-left row shows the pack's hero: a small cute adventurer with a big blocky brown head of hair, teal tunic and orange backpack. One pack ground block is one tile; the hero stands about one tile tall.

Draw one new multi-tile prop for this pack: ${t.what}. It is one single object, anchored to the tile grid.

Ground: a square slab of exactly 5 by 5 ground blocks, one block high, made of ${SLAB[t.slab]}${t.slabNote ? `; ${t.slabNote}` : ""}. The block seams stay visible so every tile can be counted. The prop's base covers exactly ${t.w} by ${t.d} tiles of the slab, centred, with its edges on the block seams; the remaining slab tiles stay empty. The prop is ${t.h} tiles tall at its highest point, measured in slab-block heights. The pack's hero, exactly as drawn in image 2, stands on one empty front corner tile of the slab for scale.

Build the prop only from chunky stacked blocks, wedges, slabs and tapered boxes, like the pack's trees, rocks and stone well. Straight edges only: a curve becomes a chain of two to four angled blocks. Few large parts, no tiny detail, no patterns, no printed icons, no lettering. Flat two-tone shading on every block (lit top and left faces, darker right face), no outlines, no line art, no gradients, no smooth shading, no texture.

Layout: the slab floating alone in the middle of a flat solid #404040 background filling the whole frame. Same isometric camera as the pack, looking down about 30 degrees, the slab seen corner-on like the pack's ground blocks. No other props, no trees, no scenery, no sky, no cast shadows on the background, no text, no labels, no numbers. ${colours}`;
}

export const RAMP = `Image 1 and image 2 are an isometric game asset pack: chunky low-poly blocks in flat colour, every block face a single flat tone (top lightest, left middle, right darkest), slightly rounded block edges, no outlines, no gradients, no texture. Image 2's bottom-left row shows the pack's hero. One pack ground block is one tile; the hero stands about one tile tall.

Draw one long slab of the pack's grass blocks, exactly 14 tiles long and 5 tiles deep, one block high, block seams visible so every tile can be counted. On it stand three windmills of the same design side by side, left to right, each a stone and timber tower with a pointed roof and four big flat sail blades: the first covers exactly 2 by 2 tiles and is 3 tiles tall; the second covers exactly 3 by 3 tiles and is 4 tiles tall; the third covers exactly 4 by 4 tiles and is 5 tiles tall. One empty tile row between neighbours. The pack's hero, exactly as drawn in image 2, stands on the empty front-left corner tile for scale.

Build only from chunky stacked blocks, wedges and tapered boxes, straight edges only, few large parts, flat two-tone shading on every block, no outlines, no gradients, no smooth shading, no texture. Flat solid #404040 background, same isometric camera as the pack looking down about 30 degrees, slab seen corner-on. No other props, no scenery, no text, no labels, no numbers. Colours: the pack's own palette only.`;

async function jpeg(file) {
  return (await sharp(file).resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 88 }).toBuffer()).toString("base64");
}

export async function newestModel(key) {
  const r = await fetch(`${API}/models?pageSize=200&key=${key}`);
  const names = (await r.json()).models.map((m) => m.name.replace("models/", "")).filter((n) => /^gemini-[\d.]+-flash-image$/.test(n));
  names.sort((x, y) => parseFloat(y.split("-")[1]) - parseFloat(x.split("-")[1]));
  return names[0];
}

export async function generate(text, out, aspect = "1:1") {
  const key = execSync("security find-generic-password -s dev.blacksmith.generator -a gemini -w").toString().trim();
  const model = process.env.MULTITILE_MODEL || (await newestModel(key));
  const parts = [
    { inlineData: { mimeType: "image/png", data: fs.readFileSync(path.join(ROOT, "ref/tilesheet.png")).toString("base64") } },
    { inlineData: { mimeType: "image/jpeg", data: await jpeg(path.join(ROOT, "2d/assets/sheet.png")) } },
    { text },
  ];
  const r = await fetch(`${API}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } } }),
  });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((q) => q.inlineData)?.inlineData?.data;
  if (!img) throw new Error(`${path.basename(out)}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  await sharp(Buffer.from(img, "base64")).png().toFile(out);
  return model;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = process.argv.slice(2);
  const suffix = process.env.MULTITILE_SUFFIX || "";
  const extra = process.env.MULTITILE_EXTRA || "";
  await Promise.all((names.length ? names : Object.keys(ITEMS)).map(async (n) => {
    try {
      const text = n === "windmill-ramp" ? RAMP : prompt(n) + (extra ? `\n\n${extra}` : "");
      const model = await generate(text, path.join(OUT, `${n}${suffix}.png`), n === "windmill-ramp" ? "16:9" : "1:1");
      console.log(`${n} ${model}`);
    } catch (e) { console.log(`FAIL ${e.message}`); }
  }));
}
