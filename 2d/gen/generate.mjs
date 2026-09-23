import fs from "node:fs";
import { execSync } from "node:child_process";
import sharp from "sharp";
import { ALL } from "./specs.mjs";
import { CROPS } from "./crops.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const REF = new URL("../../ref/", import.meta.url).pathname;
const RAW = HERE + "raw/";
fs.mkdirSync(RAW, { recursive: true });
const KEY = execSync("security find-generic-password -s dev.blacksmith.generator -a gemini -w", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
const MODEL = process.env.MODEL || "gemini-3.1-flash-image";
const PRICE = 0.045;
const API = "https://generativelanguage.googleapis.com/v1beta";

const STYLE = "Style: identical to the reference images, which show the 'Isometric TILES' asset pack. Chunky, cute, voxel-like forms built from rounded cubes with softly bevelled edges; flat cel shading with three tones per material: top faces lightest, left-facing faces medium, right-facing faces darkest; crisp clean edges like high-resolution pixel art; no black or dark outlines, no gradients, no texture noise, no glossy highlights; bright saturated palette. Camera: true isometric, 35.264 degrees elevation, 45 degrees yaw: vertical edges stay perfectly vertical, horizontal edges run at 30 degrees up to the left and to the right, and a square cell's top face is a rhombus about 1.73 times wider than tall. Output: ONE single object, centred, filling about 70% of the frame, on a perfectly flat, uniform, solid pure magenta #FF00FF background. No ground plane, no cast shadow, no drop shadow, no glow, no text, no border, no other objects, nothing touching the frame edge. Never use magenta, pink or purple in the object itself.";

const png = async (buf) => ({ inlineData: { mimeType: "image/png", data: buf.toString("base64") } });
const refImg = async (f, s) => { const m = await sharp(REF + f + ".png").metadata(); return png(await sharp(REF + f + ".png").resize(m.width * s, m.height * s, { kernel: "nearest" }).png().toBuffer()); };
const cropImg = async (name) => { const [f, l, t, w, h] = CROPS[name]; return png(await sharp(REF + f + ".png").extract({ left: l, top: t, width: w, height: h }).resize(w * 4, h * 4, { kernel: "nearest" }).png().toBuffer()); };

const pickLatest = (id) => { const f = fs.readdirSync(RAW).filter((n) => n.startsWith(id + ".")).sort((a, b) => +b.split(".")[1] - +a.split(".")[1]); return f[0] ? RAW + f[0] : null; };

async function one(spec, extra) {
  const parts = [await refImg("reference", 2), await refImg("tilesheet", 2)];
  let text = `IMAGE 1 and IMAGE 2 are the style reference (an isometric asset pack on a dark background).`;
  if (spec.crop) { parts.push(await cropImg(spec.crop)); text += ` IMAGE 3 is an enlarged close-up of related pieces from the same pack.`; }
  if (spec.base) { const b = process.env.BASEFILE || pickLatest(spec.base); parts.push(await png(fs.readFileSync(b))); text += ` The LAST image is the character to keep consistent.`; }
  text += `\n\nDraw: ${spec.desc}${extra ? " " + extra : ""}\n\n${STYLE}`;
  parts.push({ text });
  const body = { contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } };
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${API}/models/${MODEL}:generateContent?key=${KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((q) => q.inlineData)?.inlineData?.data;
    if (img) {
      const n = fs.readdirSync(RAW).filter((f) => f.startsWith(spec.id + ".")).length;
      const out = `${RAW}${spec.id}.${n}.png`;
      fs.writeFileSync(out, Buffer.from(img, "base64"));
      fs.appendFileSync(HERE + "ledger.jsonl", JSON.stringify({ t: new Date().toISOString(), model: MODEL, id: spec.id, file: out, usd: PRICE }) + "\n");
      return { id: spec.id, out };
    }
    const err = JSON.stringify(j.error || j.promptFeedback || j.candidates?.[0]?.finishReason || j).slice(0, 200);
    fs.appendFileSync(HERE + "ledger.jsonl", JSON.stringify({ t: new Date().toISOString(), model: MODEL, id: spec.id, error: err, usd: 0 }) + "\n");
    if (r.status >= 400 && r.status !== 429 && r.status < 500) return { id: spec.id, error: err };
    await new Promise((s) => setTimeout(s, 4000 * (attempt + 1)));
  }
  return { id: spec.id, error: "exhausted" };
}

const ids = process.argv.slice(2);
const extra = process.env.EXTRA || "";
const todo = ALL.filter((s) => ids.includes("all") || ids.includes(s.id) || ids.some((i) => i.endsWith("*") && s.id.startsWith(i.slice(0, -1))));
const conc = +(process.env.CONC || 6);
const results = [];
let i = 0;
await Promise.all(Array.from({ length: conc }, async () => { while (i < todo.length) { const s = todo[i++]; const r = await one(s, extra); results.push(r); console.log(r.error ? `FAIL ${r.id} ${r.error}` : `OK ${r.id} ${r.out.split("/").pop()}`); } }));
console.log(`images ${results.filter((r) => !r.error).length} usd ${(results.filter((r) => !r.error).length * PRICE).toFixed(3)}`);
