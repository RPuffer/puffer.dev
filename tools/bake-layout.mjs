import fs from "node:fs";
import path from "node:path";
import { registerCatalog } from "../core/catalog.js";
import { generateLayout, routeDistances } from "../core/layout/index.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const baseName = flag("--base", "wizard-medium");
const dry = args.includes("--dry");
const ascii = args.includes("--ascii");
if (ascii) fs.mkdirSync(path.join(root, flag("--ascii-dir", "out/layout")), { recursive: true });

export const BAKES = {
  "wizard-medium": [
    { seed: 1, name: "wizard-medium-r1", features: "showpiece" },
    { seed: 2, name: "wizard-medium-r2", mirror: true, drop: true, features: [["hill", { size: [3, 2] }], ["alcove", { size: [3, 3] }]] },
    { seed: 3, name: "wizard-medium-r3", features: [["hill", { size: [3, 2] }], ["lookout", { size: [4, 3] }], ["inlet", { size: [2, 2] }]] },
  ],
};

const H = (size) => ["hill", { size }];
const RUN_RECIPES = [
  "showpiece",
  [H([3, 2]), ["alcove", { size: [3, 3] }], ["inlet", { size: [2, 3] }]],
  [H([3, 2]), ["lookout", { size: [4, 3] }], ["inlet", { size: [2, 2] }]],
  [H([3, 2]), ["alcove", { size: [3, 3] }], ["lookout", { size: [4, 3] }]],
];
const runOrder = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
BAKES.run = runOrder.map((name, i) => ({ base: name, name, seed: 101 + i, drop: i % 3 === 2, features: RUN_RECIPES[i % RUN_RECIPES.length], run: true }));

const readBase = (name) => {
  const b = path.join(root, "levels/base", `${name}.json`);
  return JSON.parse(fs.readFileSync(fs.existsSync(b) ? b : path.join(root, "levels", `${name}.json`), "utf8"));
};
const registered = new Set();
async function register(base) {
  for (const p of [...new Set([...(base.pieces || []), "pieces/kits.js"])]) {
    if (registered.has(p)) continue;
    registered.add(p);
    const mod = await import(path.join(root, "3d", p));
    if (mod.register) registerCatalog((await mod.register({ palette: base.palette || {} })).catalog || {});
  }
}

const only = flag("--only", null);
const list = (BAKES[baseName] || []).filter((b) => !only || only.split(",").includes(b.name));
const names = list.map((b) => b.name);
let failed = 0;
for (const [i, b] of list.entries()) {
  const base = readBase(b.base || baseName);
  await register(base);
  const { level, problems, attempt, history } = generateLayout(base, b);
  if (!b.run) for (const t of level.things) if (t.kind === "elevator") t.to = names[(i + (t.role === "exit" ? 1 : names.length - 1)) % names.length];
  const dist = routeDistances(level).map((s) => `${s.id} ${s.locked}->${s.unlocked}`).join(", ");
  console.log(`${b.name}: seed ${b.seed} attempt ${attempt}${b.mirror ? " mirrored" : ""}, ${level.decor.length} decor, path ${level.cells.flat().filter((c) => c.p).length} cells, features ${(level.route.features || []).map((f) => f.kind).join("+")}; shortcuts ${dist}`);
  if (args.includes("--why")) for (const [k, h] of (history || []).entries()) console.log(`  attempt ${k}: ${h.join(" | ")}`);
  if (problems.length) { failed++; console.log("  FAIL\n  " + problems.slice(0, 12).join("\n  ")); }
  if (ascii) fs.writeFileSync(path.join(flag("--ascii-dir", "out/layout"), `${b.name}.txt`), draw(level) + "\n" + problems.join("\n") + "\n");
  if (!dry && !problems.length) fs.writeFileSync(path.join(root, "levels", `${b.name}.json`), JSON.stringify(level) + "\n");
}
process.exitCode = failed ? 1 : 0;

function draw(L) {
  const th = new Map(L.things.map((t) => [t.x + "," + t.z, { bonfire: "B", chest: "C", gate: "G", elevator: "E", watcher: "W", door: "D", ladder: "K", lever: "V" }[t.kind]]));
  const dec = new Map();
  for (const d of L.decor) dec.set(d.x + "," + d.z, d.t[0]);
  return L.cells.map((row, z) => `${String(z).padStart(2)} ` + row.map((c, x) => {
    if (c.s === "none") return "   ";
    if (c.s === "water") return " ~ ";
    const mark = th.get(x + "," + z) || dec.get(x + "," + z) || (c.p ? "#" : " ");
    const s = c.s === "ramp" ? "^v><"["nsew".indexOf(c.d)] : c.s === "lift" ? "L" : c.s[0];
    return `${c.h}${s}${mark}`;
  }).join("")).join("\n");
}
