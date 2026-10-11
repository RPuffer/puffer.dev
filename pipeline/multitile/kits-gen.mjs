import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "pipeline/multitile");
const MODEL = process.env.KITS_MODEL || "fal-ai/nano-banana/edit";

export const KIT_SHEET = [
  { kit: "star-shrine", w: 3, d: 2, h: 2, what: "a ruined star shrine: a stepped dark indigo plinth with a chunky gold five-pointed star block standing on top, one tall standing stone and one broken stump beside it, two fallen parchment-white blocks" },
  { kit: "wizard-camp", w: 2, d: 2, h: 1, what: "a wizard's campsite: a small pointed indigo tent dotted with gold star blocks, a squat iron cauldron on three stones with a cyan flame under it, a log stool and a rolled rust-red bedroll" },
  { kit: "lift-landing", w: 2, d: 1, h: 1, what: "a landing stage: a short plank deck with two posts carrying hanging cyan glass lanterns, two stacked crates and one barrel at one end" },
  { kit: "scroll-cart", w: 2, d: 1, h: 1, what: "a scroll cart: a wooden handcart with two chunky wheels piled with rolled parchment scrolls, and a small lectern beside it holding an open tome" },
  { kit: "rune-ring", w: 3, d: 3, h: 1, what: "a rune ring: four short indigo standing stones on the corners of a round flat stone disc with a glowing cyan rune slab in its centre and one chunky gold star floating above the centre" },
  { kit: "waymark", w: 1, d: 1, h: 1, what: "a waymark: a short squat indigo stone post with a small cyan ember flame in a bowl on top" },
];

export function sheetPrompt() {
  const items = KIT_SHEET.map((k, i) => `${i + 1}. ${k.what}. Its base covers exactly ${k.w} by ${k.d} tiles of its slab and it is ${k.h} tile${k.h > 1 ? "s" : ""} tall at its highest point.`).join("\n");
  return `Image 1 and image 2 are an isometric game asset pack: chunky low-poly blocks in flat colour, every block face a single flat tone (top lightest, left middle, right darkest), slightly rounded block edges, no outlines, no gradients, no texture. One pack ground block is one tile; the pack's hero stands about one tile tall.

Draw a reference sheet of six new decor sets for this pack, for a cartoon wizard's floating island. Lay them out as a grid of 3 columns and 2 rows, each set standing alone on its own small slab of the pack's grass blocks (one block high, block seams visible so tiles can be counted), each slab just one tile bigger than its set on every side. The sets, left to right, top row first:
${items}

Build everything only from chunky stacked blocks, wedges, slabs and tapered boxes, like the pack's trees, rocks and stone well. Straight edges only: a curve becomes a chain of two to four angled blocks. Few large parts, no tiny detail, no patterns, no lettering. Flat two-tone shading on every block (lit top and left faces, darker right face), no outlines, no line art, no gradients, no smooth shading, no texture. Colours: dark indigo #2b3b5c, parchment white #ebe5dc, rust red #c97652, mustard gold #f0c438, ice cyan #6ce6f8 for flames and glow, warm wood #cbc5be. Same isometric camera as the pack, looking down about 30 degrees, slabs seen corner-on. Flat solid #404040 background. No hero, no other props, no scenery, no sky, no text, no labels, no numbers.`;
}

const dataUri = async (file, w = 1024) => "data:image/jpeg;base64," + (await sharp(file).resize(w, w, { fit: "inside" }).jpeg({ quality: 88 }).toBuffer()).toString("base64");

async function generate(out) {
  const key = execSync("security find-generic-password -s dev.blacksmith.generator -a fal -w", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  const body = {
    prompt: sheetPrompt(),
    image_urls: [await dataUri(path.join(ROOT, "ref/tilesheet.png")), await dataUri(path.join(ROOT, "2d/assets/sheet.png"))],
    num_images: 1,
    aspect_ratio: "3:2",
    output_format: "png",
  };
  const r = await fetch(`https://fal.run/${MODEL}`, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  const url = j.images?.[0]?.url;
  if (!url) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  await sharp(img).png().toFile(out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--prompt")) { console.log(sheetPrompt()); process.exit(0); }
  const out = path.join(OUT, `kits-sheet${process.env.KITS_SUFFIX || ""}.png`);
  await generate(out);
  console.log(`${path.relative(ROOT, out)} ${MODEL}`);
}
