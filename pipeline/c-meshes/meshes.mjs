import fs from "node:fs";
import sharp from "sharp";
import { fal } from "@fal-ai/client";
import { HERE, ROOT, secret, charge, guard } from "./lib.mjs";

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const force = process.argv.includes("--force");
const picks = JSON.parse(fs.readFileSync(HERE + "picks.json", "utf8"));
const OUT = ROOT + "3d/assets/forest-c/raw/";
fs.mkdirSync(OUT, { recursive: true });
fal.config({ credentials: secret("fal") || process.env.FAL_KEY });
const PRICE = 0.02;

async function one(type) {
  const src = `${HERE}sprites/${type}.${picks[type]}.png`;
  const out = `${OUT}${type}.glb`;
  if (fs.existsSync(out) && !force) return `skip ${type}`;
  const m = await sharp(src).metadata();
  const side = Math.round(Math.max(m.width, m.height) * 1.25);
  const plate = await sharp(src).resize({ width: side, height: side, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).flatten({ background: "#ffffff" }).resize(1024, 1024).png().toBuffer();
  fs.writeFileSync(`${HERE}sprites/plate-${type}.png`, plate);
  guard(PRICE);
  const t0 = Date.now();
  const image_url = await fal.storage.upload(new File([plate], `${type}.png`, { type: "image/png" }));
  const res = await fal.subscribe("fal-ai/trellis", { input: { image_url, ss_sampling_steps: 20, slat_sampling_steps: 20, ss_guidance_strength: 7.5, slat_guidance_strength: 3, mesh_simplify: 0.98, texture_size: 512 }, logs: false });
  charge({ model: "fal-ai/trellis", kind: "mesh", id: type, usd: PRICE });
  const url = res.data?.model_mesh?.url;
  if (!url) throw new Error(`${type}: ${JSON.stringify(res.data).slice(0, 200)}`);
  fs.writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return `OK ${type} ${(fs.statSync(out).size / 1024).toFixed(0)} KB ${((Date.now() - t0) / 1000).toFixed(0)}s`;
}

const todo = ids.length ? ids : Object.keys(picks);
let i = 0;
await Promise.all(Array.from({ length: 4 }, async () => { while (i < todo.length) { const t = todo[i++]; try { console.log(await one(t)); } catch (e) { console.log(`FAIL ${t} ${e.message}`); } } }));
