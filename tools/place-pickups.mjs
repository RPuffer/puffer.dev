import fs from "node:fs";
import path from "node:path";
import { registerCatalog } from "../core/catalog.js";
import { placeCharges, checkCharges } from "../core/layout/pickups.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const names = (args.find((a) => !a.startsWith("--")) || [...run, "traps-showcase"].join(",")).split(",");
let failed = 0;
for (const name of names) {
  const file = path.join(root, "levels", `${name}.json`);
  const text = fs.readFileSync(file, "utf8");
  const raw = JSON.parse(text);
  for (const p of raw.pieces || []) {
    const mod = await import(path.join(root, "3d", p));
    if (mod.register) registerCatalog((await mod.register({ palette: raw.palette || {} })).catalog || {});
  }
  const seed = raw.layout?.seed ?? 1;
  raw.charges = placeCharges(raw, { seed });
  const problems = checkCharges(raw);
  console.log(`${problems.length ? "FAIL" : "ok  "}  ${name}: ${raw.charges.map((c) => `${c.id} ${c.x},${c.z}`).join("; ")}${problems.length ? "  " + problems.join("; ") : ""}`);
  if (problems.length) { failed++; continue; }
  if (!dry) fs.writeFileSync(file, JSON.stringify(raw) + (text.endsWith("\n") ? "\n" : ""));
}
process.exitCode = failed ? 1 : 0;
