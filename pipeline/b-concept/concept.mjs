import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const [art, briefPath, outDir = "pipeline/b-concept/candidates", n = "5", tag = ""] = process.argv.slice(2);
if (!art || !briefPath) { console.error("usage: node pipeline/b-concept/concept.mjs <art.png> <brief.json> [outDir] [count] [tag]"); process.exit(2); }
const KEY = (() => { try { return execSync("security find-generic-password -s dev.blacksmith.generator -a gemini -w", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return process.env.GEMINI_API_KEY || ""; } })();
if (!KEY) { console.error("no Gemini key"); process.exit(3); }
const API = "https://generativelanguage.googleapis.com/v1beta";
const PRICE = 0.045;

async function pickModel() {
  if (process.env.CONCEPT_MODEL) return process.env.CONCEPT_MODEL;
  const j = await (await fetch(`${API}/models?pageSize=200&key=${KEY}`)).json();
  const ids = (j.models || []).map((m) => m.name.replace(/^models\//, "")).filter((id) => /^gemini-\d+(\.\d+)?-flash-image$/.test(id));
  ids.sort((a, b) => parseFloat(b.match(/gemini-([\d.]+)/)[1]) - parseFloat(a.match(/gemini-([\d.]+)/)[1]));
  if (!ids.length) throw new Error("no flash image model listed");
  return ids[0];
}

const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
const T = brief.palette.translation;
const bg = T.bg || brief.biome?.lighting?.bg || "#1c222b";
const pal = [
  `background ${bg}`,
  `grass tops ${T.grass.top} with fringe ${T.grass.fringe}`,
  `dirt path ${T.dirt.top}`,
  `upper cliff sides ${T.cliffUpper.left} / ${T.cliffUpper.right}`,
  `lower cliff sides ${T.cliffLower.left} / ${T.cliffLower.right}`,
  `bark ${T.trunk[0]} / ${T.trunk[1]} and wood ${T.wood.light} / ${T.wood.dark}`,
  `moss and pine canopies ${T.treeMint.join(", ")}`,
  `stone ${T.rock.slice(0, 3).join(", ")}`,
  `fire-bird flame ${"#ffe082, #ffb31d, #ff831d"}`,
].join("; ");
const motifs = brief.motifs.map((m) => `${m.name} (${m.count}): ${m.shape.summary}`).join(" ");
const creature = brief.creatures[0];
const text = [
  "IMAGE 1 is a charcoal drawing. IMAGE 2 and IMAGE 3 show the target art style: a cute isometric tile asset pack.",
  "Repaint the scene of IMAGE 1 as ONE compact isometric floating island built from the square tile blocks of IMAGE 2, drawn in exactly IMAGE 2's style and camera: true isometric view from the upper left, flat colours with no gradients and no outlines, rounded chunky blocks, NO black or dark outlines on any shape (edges are only colour changes between faces, as in IMAGE 2), scalloped grass fringe dripping over the cliff edges, cliff sides with vertical bevel stripes, top face brightest, left face mid, right face darkest.",
  "The island has exactly two ground levels: a lower terrace, and a raised plateau one block higher, joined by a short stair or slope. Show the edges of the island floating over the background, like IMAGE 2: each land column is only one or two blocks deep with background below it, and the tiles form a clearly visible square grid about 8 tiles across.",
  `Keep the drawing's composition: tall bare tree trunks with stubby branches wall the back and the right side, one thick trunk leans in from the right, twisted roots and fallen logs fill the front left, a pale dirt path runs from the front up to the centre, low pale mist tiers lie between the back trunks. ${motifs}`,
  `In the centre-left, standing still on a small mound, is the fire-bird spirit: ${creature.shape.summary} It is built from chunky stacked flame shapes like the pack's trees, standing upright, about three blocks tall, facing left, the only bright warm object in the scene. A tiny flame wisp floats near its tail.`,
  `Moody dusk forest palette: ${pal}.`,
  `Plain flat background colour ${bg} filling the whole frame around the island. No text, no labels, no border, no characters other than the fire-bird and the wisp, no sky, no ground plane beyond the island.`,
].join("\n");

const img64 = async (f, w) => (await sharp(f).resize({ width: w, withoutEnlargement: true }).flatten({ background: "#000" }).jpeg({ quality: 90 }).toBuffer()).toString("base64");
const parts = [
  { inlineData: { mimeType: "image/jpeg", data: await img64(art, 900) } },
  { inlineData: { mimeType: "image/jpeg", data: await img64("ref/reference.png", 702) } },
  { inlineData: { mimeType: "image/jpeg", data: await img64("ref/tilesheet.png", 702) } },
  { text },
];

const model = await pickModel();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `prompt${tag}.txt`), text + "\n");
const ledger = path.join(path.dirname(outDir), "ledger.jsonl");
console.log(`model ${model}, ${n} candidates`);

async function one(i) {
  const r = await fetch(`${API}/models/${model}:generateContent?key=${KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:5" } } }),
  });
  const j = await r.json();
  const data = j.candidates?.[0]?.content?.parts?.find((q) => q.inlineData)?.inlineData?.data;
  fs.appendFileSync(ledger, JSON.stringify({ date: new Date().toISOString().slice(0, 10), model, i, ok: !!data, usd: data ? PRICE : 0 }) + "\n");
  if (!data) { console.error(`cand ${i}:`, JSON.stringify(j.error || j.promptFeedback || j).slice(0, 300)); return null; }
  const out = path.join(outDir, `cand${tag}-${i}.png`);
  await sharp(Buffer.from(data, "base64")).png().toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${out} ${m.width}x${m.height} $${PRICE}`);
  return out;
}
const got = (await Promise.all(Array.from({ length: +n }, (_, i) => one(i + 1)))).filter(Boolean);
console.log(`spend: $${(got.length * PRICE).toFixed(3)} (${got.length} images)`);
