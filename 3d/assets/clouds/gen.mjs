import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const RAW = path.join(ROOT, "out/clouds/raw");
const API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.CLOUD_MODEL || "gemini-3.1-flash-image";

const PROMPTS = [
  "Four separate photo-real cumulus cloud tufts arranged in a loose 2x2 grid, each one isolated with wide empty space around it and not touching the image edges or each other. Real photograph quality: billowing cauliflower tops, bright sunlit white highlights from the upper left, soft blue-grey shaded undersides, soft wispy feathered edges. Background is a perfectly flat, uniform, solid pure magenta (#FF00FF) with no gradient, no sky, no ground, no shadow, no text.",
  "Four separate photo-real low flat stratocumulus cloud puffs, wider than tall, arranged in a loose 2x2 grid, each isolated with wide empty space around it and not touching the edges or each other. Photograph quality: soft rounded bumpy tops lit warm white from above, gentle grey shading below, thin translucent wispy fringes. Background is a perfectly flat, uniform, solid pure magenta (#FF00FF) with no gradient, no sky, no ground, no text.",
  "Four separate photo-real thin wispy cloud wisps and small fluffy cloudlets in a loose 2x2 grid, each isolated with wide empty space around it and not touching the edges or each other. Photograph quality: soft translucent white vapour, delicate feathered edges, faint grey shading. Background is a perfectly flat, uniform, solid pure magenta (#FF00FF) with no gradient, no sky, no text.",
];

const key = execSync("security find-generic-password -s dev.blacksmith.generator -a gemini -w", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
fs.mkdirSync(RAW, { recursive: true });
const which = process.argv.slice(2).map(Number);
await Promise.all((which.length ? which : PROMPTS.map((_, i) => i)).map(async (i) => {
  const r = await fetch(`${API}/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPTS[i] }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } }),
  });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((q) => q.inlineData)?.inlineData?.data;
  if (!img) { console.error(i, r.status, JSON.stringify(j).slice(0, 300)); return; }
  const out = path.join(RAW, `tuft-${i}.png`);
  await sharp(Buffer.from(img, "base64")).png().toFile(out);
  console.log("OK", out, MODEL);
}));
