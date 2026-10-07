import fs from "node:fs";
import sharp from "sharp";
import { HERE, ROOT, TYPES, specFor, tonesOf, key, secret, charge, guard } from "./lib.mjs";

const args = process.argv.slice(2);
const briefPath = args.find((a) => a.endsWith(".json")) || ROOT + "pipeline/seed/brief.json";
const ids = args.filter((a) => !a.endsWith(".json") && !a.startsWith("--"));
const N = +(args.find((a) => a.startsWith("--n="))?.slice(4) || 2);
const note = args.find((a) => a.startsWith("--note="))?.slice(7) || "";
const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
const MODEL = process.env.MODEL || "gemini-3.1-flash-image";
const PRICE = 0.045;
const API = "https://generativelanguage.googleapis.com/v1beta";
const KEY = secret("gemini") || process.env.GEMINI_API_KEY;
const RAW = HERE + "sprites/raw/", OUT = HERE + "sprites/";
fs.mkdirSync(RAW, { recursive: true });

const CROPS = {
  trunk: ["reference", 170, 10, 70, 105], log: ["tilesheet", 0, 55, 200, 180], bird: ["tilesheet", 0, 55, 200, 180],
  tree: ["reference", 170, 10, 70, 105], mist: ["reference", 30, 0, 60, 70], stump: ["reference", 125, 178, 40, 38],
};
const CROP_OF = { "bare-trunk-tall": "trunk", "leaning-trunk": "trunk", "fallen-log": "log", "root-tangle": "log", "mist-bank": "mist", "mossy-stump": "stump", "fire-bird": "bird", "flame-wisp": "bird", "forest-tree": "tree" };

const img = (buf) => ({ inlineData: { mimeType: "image/png", data: buf.toString("base64") } });
const ref = async (f, s) => { const p = ROOT + "ref/" + f + ".png"; const m = await sharp(p).metadata(); return img(await sharp(p).resize(m.width * s, m.height * s, { kernel: "nearest" }).png().toBuffer()); };
const crop = async ([f, l, t, w, h]) => img(await sharp(ROOT + "ref/" + f + ".png").extract({ left: l, top: t, width: w, height: h }).resize(w * 4, h * 4, { kernel: "nearest" }).png().toBuffer());

const STYLE = "Style: identical to the reference images, the 'Isometric TILES' asset pack. Chunky, cute, low-poly voxel-like forms built from a few rounded boxes and blocky cylinders with softly bevelled edges; flat cel shading with exactly three tones per material (top faces lightest, left-facing faces medium, right-facing faces darkest); crisp clean edges; no outlines, no gradients, no texture noise, no glossy highlights, no fine detail, no thin strands. Camera: true isometric three-quarter view, 35 degrees elevation, 45 degrees yaw; vertical edges stay vertical. Output: ONE single object, centred, filling about 70% of the frame, on a perfectly flat, uniform, solid pure magenta #FF00FF background. No ground plane, no base tile, no cast shadow, no glow, no text, no other objects, nothing touching the frame edge. Never use magenta, pink or purple in the object.";

function prompt(type, spec) {
  const tones = tonesOf(spec).join(", ");
  const h = spec.height, fp = spec.footprint || [1, 1];
  const scale = `It stands ${h} tile-heights tall on a ${fp[0]}x${fp[1]} cell footprint (one cell is one grass block in the reference).`;
  const pose = spec.pose ? ` Pose: ${spec.pose}` : "";
  return `Draw: ${type.replace(/-/g, " ")} as a new prop for this asset pack. ${spec.shape.summary}${pose} ${scale} Use only these colours (hex): ${tones}. Keep it a solid, closed, chunky shape readable at a small size, simple enough to model in a few hundred polygons.${note ? " " + note : ""}\n\n${STYLE}`;
}

async function one(type) {
  const spec = specFor(brief, type);
  const parts = [await ref("reference", 2), await ref("tilesheet", 2), await crop(CROPS[CROP_OF[type]])];
  parts.push({ text: `IMAGE 1 and IMAGE 2 are the style reference (an isometric asset pack on a dark background). IMAGE 3 is an enlarged close-up of related pieces from the same pack.\n\n${prompt(type, spec)}` });
  const body = { contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } };
  for (let a = 0; a < 3; a++) {
    guard(PRICE);
    const r = await fetch(`${API}/models/${MODEL}:generateContent?key=${KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    const data = j.candidates?.[0]?.content?.parts?.find((q) => q.inlineData)?.inlineData?.data;
    if (data) {
      const n = fs.readdirSync(RAW).filter((f) => f.startsWith(type + ".")).length;
      const raw = `${RAW}${type}.${n}.png`;
      fs.writeFileSync(raw, Buffer.from(data, "base64"));
      charge({ model: MODEL, kind: "sprite", id: type, file: raw.replace(ROOT, ""), usd: PRICE });
      fs.writeFileSync(`${OUT}${type}.${n}.png`, await key(raw));
      return `${type}.${n}`;
    }
    console.error(`retry ${type}: ${JSON.stringify(j.error || j.candidates?.[0]?.finishReason || j).slice(0, 160)}`);
    await new Promise((s) => setTimeout(s, 4000 * (a + 1)));
  }
  return null;
}

const todo = ids.length ? ids : Object.keys(TYPES);
const jobs = todo.flatMap((t) => Array.from({ length: N }, () => t));
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) { const t = jobs[i++]; const r = await one(t); console.log(r ? `OK ${r}` : `FAIL ${t}`); } }));

const files = fs.readdirSync(OUT).filter((f) => /^[a-z-]+\.\d+\.png$/.test(f)).sort();
const cell = 200, cols = 6, rows = Math.ceil(files.length / cols);
const comp = [];
for (const [k, f] of files.entries()) comp.push({ input: await sharp(OUT + f).resize(cell - 20, cell - 36, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: (k % cols) * cell + 10, top: Math.floor(k / cols) * cell + 4 }, { input: Buffer.from(`<svg width="${cell}" height="24"><text x="4" y="16" font-size="13" fill="#ddd" font-family="sans-serif">${f.replace(".png", "")}</text></svg>`), left: (k % cols) * cell, top: Math.floor(k / cols) * cell + cell - 26 });
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#3b3b3b" } }).composite(comp).png().toFile(HERE + "sprites/contact.png");
console.log("contact sheet", HERE + "sprites/contact.png");
