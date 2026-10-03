import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { secret } from "../../c-meshes/lib.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const { fal } = await import(pathToFileURL(createRequire(new URL("../../c-meshes/meshes.mjs", import.meta.url)).resolve("@fal-ai/client")).href);
const CAP = 2, PRICE = 0.02, LEDGER = HERE + "ledger.jsonl";
const args = process.argv.slice(2);
const tag = args.find((a) => a.startsWith("--tag="))?.slice(6) || "1";
const steps = +(args.find((a) => a.startsWith("--steps="))?.slice(8) || 20);
const ss = +(args.find((a) => a.startsWith("--ss="))?.slice(5) || 7.5);
const slat = +(args.find((a) => a.startsWith("--slat="))?.slice(7) || 3);
const items = args.filter((a) => !a.startsWith("--"));
const spent = () => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).usd).reduce((a, b) => a + b, 0) : 0);

fal.config({ credentials: secret("fal") || process.env.FAL_KEY });
fs.mkdirSync(HERE + "raw", { recursive: true });

async function one(item) {
  if (spent() + PRICE > CAP) throw new Error(`cap $${CAP} reached`);
  const plate = fs.readFileSync(`${HERE}${item}.plate.png`);
  const image_url = await fal.storage.upload(new File([plate], `${item}.png`, { type: "image/png" }));
  const input = { image_url, ss_sampling_steps: steps, slat_sampling_steps: steps, ss_guidance_strength: ss, slat_guidance_strength: slat, mesh_simplify: 0.98, texture_size: 512 };
  const res = await fal.subscribe("fal-ai/trellis", { input, logs: false });
  fs.appendFileSync(LEDGER, JSON.stringify({ t: new Date().toISOString(), model: "fal-ai/trellis", id: `${item}.${tag}`, usd: PRICE, input: { ...input, image_url: undefined } }) + "\n");
  const url = res.data?.model_mesh?.url;
  if (!url) throw new Error(JSON.stringify(res.data).slice(0, 200));
  const out = `${HERE}raw/${item}.${tag}.glb`;
  fs.writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return `OK ${item}.${tag} ${(fs.statSync(out).size / 1024).toFixed(0)} KB`;
}

for (const r of await Promise.allSettled(items.map(one))) console.log(r.status === "fulfilled" ? r.value : `FAIL ${r.reason.message}`);
console.log(`spent $${spent().toFixed(2)} of $${CAP}`);
