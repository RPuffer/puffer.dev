import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "pipeline/refsheets");
const API = "https://generativelanguage.googleapis.com/v1beta";

export const FIGURES = {
  cat: { label: "cat", ratio: "2.5", form: "a seated cat shown as a full chunky body with its big head, not just a bust" },
  dragon: { label: "dragon", ratio: "3", form: "a standing wyvern dragon" },
  ember: { label: "ember spirit", ratio: "2.5", form: "a floating totem: dragon head stacked above a horned skull, with blocky flame tongues", fix: "flames included, no taller than two and a half hero heights" },
  chimera: { label: "chimera", ratio: "2", form: "a low quadruped armoured beast, longer than tall", fix: "it is low and long, its back only twice the hero's height" },
  wizard: { label: "wizard", ratio: "2.5", form: "a standing hot-dog wizard with pointed hat and staff" },
  swallow: { label: "swallow", ratio: "1.5", form: "a swallow perched upright on a small block perch, wings folded, forked tail" },
  cosmos: { label: "cosmos eye monument", ratio: "3", form: "a monument: a giant eyeball ringed like a planet, standing on a stepped stone plinth", fix: "plinth included, no taller than three hero heights" },
  sharkbear: { label: "sharkbear", ratio: "2.5", form: "a hunched quadruped bear with a shark head, dorsal fin and tail fin" },
  gremlin: { label: "gremlin", ratio: "2.5", form: "a crouching lanky faceless creature with long limbs" },
  mindbloom: { label: "mindbloom bust", ratio: "2.5", form: "a monument bust: a big human head with spiky blooming hair, standing on a candle-jar plinth" },
  eagle: { label: "eagle", ratio: "1.5", form: "an eagle bust: head and shoulders of a bald eagle on a short block plinth, hooked beak", fix: "the whole bust, plinth included, is only one and a half hero heights tall" },
  forest: { label: "forest fire-bird", ratio: "2.5", form: "a standing rooster-like fire bird with an arched crest, puffed chest and high flame tail" },
};

const hex = (v) => (typeof v === "string" ? v : v.hex);
const role = (v) => (typeof v === "string" ? "" : v.role || "");

export function prompt(slug) {
  const a = JSON.parse(fs.readFileSync(path.join(ROOT, `pipeline/seed/analysis/${slug}.json`)));
  const f = FIGURES[slug];
  const acc = a.palette.accents[0];
  const s = a.subject;
  return `Image 1 is an artwork. Image 2 and image 3 are an isometric game asset pack: chunky low-poly blocks in flat colour, every block face a single flat tone (top lightest, left middle, right darkest), slightly rounded block edges, no outlines, no gradients, no texture. The bottom-left row of image 3 shows the pack's hero: a small cute adventurer with a big blocky brown head of hair, teal tunic and orange backpack.

Draw a character reference sheet of the focal figure of image 1 (${s.what}) remade as a piece of this asset pack: ${f.form}. Shape notes from the artwork: ${s.pose}. ${s.stylisation}. Keep the artwork's character and silhouette, but build it only from chunky stacked blocks, wedges, slabs and tapered boxes, like the pack's trees, rocks and hero. Straight edges only, no smooth curves: a curve becomes a chain of two to four angled blocks. Few large parts, at most twelve, no tiny detail except on the face. No patterns, no printed icons, no feather or fur strokes on the faces. Flat two-tone shading on every block (lit top and left faces, darker right face), no outlines, no line art, no gradients, no airbrush, no painterly marks, no texture.

Layout: a flat solid #404040 background filling the whole frame, no ground, no floor tiles, no cast shadows, no text, no labels, no numbers. One row, left to right: the pack's hero exactly as drawn in image 3, then the figure three times, all at the same scale and standing on one shared baseline: front three-quarter view, side view, back three-quarter view. Same isometric camera as the pack, looking down about 30 degrees. Scale: the figure is ${f.ratio} times as tall as the hero${f.fix ? `; ${f.fix}` : ""}. Leave clear empty gaps between the hero and every pose.

Colours: the artwork's own colours ${a.palette.dominant.map(hex).join(", ")}, plus one accent ${hex(acc)} (${role(acc) || "as in the artwork"}) used on one small part only. No other hues.`;
}

async function art(file) {
  return (await sharp(file).resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 88 }).toBuffer()).toString("base64");
}

export async function newestModel(key) {
  const r = await fetch(`${API}/models?pageSize=200&key=${key}`);
  const names = (await r.json()).models.map((m) => m.name.replace("models/", "")).filter((n) => /^gemini-[\d.]+-flash-image$/.test(n));
  names.sort((x, y) => parseFloat(y.split("-")[1]) - parseFloat(x.split("-")[1]));
  return names[0];
}

export async function generate(slug, out) {
  const key = execSync("security find-generic-password -s dev.blacksmith.generator -a gemini -w").toString().trim();
  const model = process.env.REFSHEET_MODEL || (await newestModel(key));
  const parts = [
    { inlineData: { mimeType: "image/jpeg", data: await art(path.join(ROOT, `pipeline/seed/${slug}.png`)) } },
    { inlineData: { mimeType: "image/png", data: fs.readFileSync(path.join(ROOT, "ref/tilesheet.png")).toString("base64") } },
    { inlineData: { mimeType: "image/jpeg", data: await art(path.join(ROOT, "2d/assets/sheet.png")) } },
    { text: prompt(slug) },
  ];
  const r = await fetch(`${API}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } } }),
  });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((q) => q.inlineData)?.inlineData?.data;
  if (!img) throw new Error(`${slug}: ${r.status} ${JSON.stringify(j).slice(0, 400)}`);
  await sharp(Buffer.from(img, "base64")).png().toFile(out);
  return model;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slugs = process.argv.slice(2);
  const suffix = process.env.REFSHEET_SUFFIX || "";
  await Promise.all((slugs.length ? slugs : Object.keys(FIGURES)).map(async (slug) => {
    try {
      const model = await generate(slug, path.join(OUT, `${slug}${suffix}.png`));
      console.log(`${slug} ${model}`);
    } catch (e) { console.log(`FAIL ${e.message}`); }
  }));
}
