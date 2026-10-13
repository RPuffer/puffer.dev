import fs from "node:fs";
import path from "node:path";
import { registerCatalog } from "../core/catalog.js";
import { generateLayout, routeDistances } from "../core/layout/index.js";
import { world, distances } from "../core/layout/check.js";
import { prepareLevel } from "../core/level.js";
import { SHAPES, resolveTransforms } from "../core/layout/shapes/index.js";
import { measure, checks } from "./variety-lib.mjs";
import { placeTraps } from "../core/traps/place.js";
import { placeCharges, checkCharges } from "../core/layout/pickups.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const baseName = flag("--base", "wizard-medium");
const dry = args.includes("--dry");
const ascii = args.includes("--ascii");
if (ascii) fs.mkdirSync(path.join(root, flag("--ascii-dir", "out/layout")), { recursive: true });

const PHASE = { pads: true, deck: true, mask: true };

export const BAKES = {
  "wizard-medium": [
    { seed: 1, name: "wizard-medium-r1", shape: "blob-pear", archetype: "figure8", area: 520, shortcuts: ["door", "lever"], features: "showpiece" },
    { seed: 2, name: "wizard-medium-r2", shape: "ridge-zigzag", archetype: "switchback", area: 560, shortcuts: ["drop", "door"], require: "drop", features: [["hill", { size: [3, 2] }], ["alcove", { size: [3, 3] }]] },
    { seed: 3, name: "wizard-medium-r3", shape: "hub-cross", archetype: "maze", area: 640, shortcuts: ["lever", "ladder"], features: [["hill", { size: [3, 2] }], ["lookout", { size: [4, 3] }], ["inlet", { size: [2, 2] }]] },
  ],
};

const H = (size) => ["hill", { size }];
const RUN_RECIPES = [
  "showpiece",
  [H([3, 2]), ["alcove", { size: [3, 3] }], ["inlet", { size: [2, 3] }]],
  [H([3, 2]), ["lookout", { size: [4, 3] }], ["inlet", { size: [2, 2] }]],
  [H([3, 2]), ["alcove", { size: [3, 3] }], ["lookout", { size: [4, 3] }]],
];
export const RUN_PLAN = [
  { shape: "ridge-diagonal", archetype: "switchback", area: 360, shortcuts: ["door", "lever"] },
  { shape: "tier-ziggurat", archetype: "spiral", area: 560, open: true, shortcuts: ["lever", "ladder"] },
  { shape: "twin-dumbbell", archetype: "figure8", area: 520, shortcuts: ["pad", "door"] },
  { shape: "crescent-horn", archetype: "ring", area: 430, shortcuts: ["drop", "lever"] },
  { shape: "arch-chain", archetype: "comb", area: 600, shortcuts: ["door", "pad"] },
  { shape: "spiral-snail", archetype: "spiral", area: 640, shortcuts: ["ladder", "door"] },
  { shape: "sat-moons", archetype: "ring", area: 580, shortcuts: ["lever", "drop"] },
  { shape: "twin-tiered", archetype: "twin", area: 760, shortcuts: ["drop", "pad"] },
  { shape: "hub-isles", archetype: "figure8", area: 820, shortcuts: ["door", "ladder"] },
  { shape: "atoll-islet", archetype: "twin", area: 700, shortcuts: ["pad", "lever"] },
  { shape: "bridge-span", archetype: "switchback", area: 900, shortcuts: ["ladder", "door"] },
  { shape: "sat-cluster", archetype: "maze", area: 960, shortcuts: ["lever", "drop"] },
];
const runOrder = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const TRAP_PLAN = [["t03", "t18"], ["t25", "t23"], ["t23", "t03"]];
BAKES.run = runOrder.map((name, i) => ({ base: name, name, seed: 101 + i, ...(TRAP_PLAN[i] ? { traps: TRAP_PLAN[i] } : {}), ninths: [(i * 4) % 9, (i * 4 + 6) % 9], ...RUN_PLAN[i % RUN_PLAN.length], pads: PHASE.pads && i >= 2, features: RUN_RECIPES[i % RUN_RECIPES.length], run: true }));
for (const list of Object.values(BAKES)) for (const b of list) Object.assign(b, { windows: PHASE.deck ? undefined : false, reward: PHASE.deck, mask: PHASE.mask, ...(PHASE.pads ? {} : { pads: false }), ...b });

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
const VARIANTS = +flag("--variants", 10);
function closeWalk(raw) {
  const warn = console.warn;
  console.warn = () => {};
  const P = prepareLevel(JSON.parse(JSON.stringify(raw)));
  console.warn = warn;
  const W = world(P);
  let at = raw.spawn.slice(), moved = 0;
  for (let hop = 0; hop < 3; hop++) {
    const d = distances(W, at);
    let best = null, bd = -1;
    for (const [k, v] of d) {
      const [x, z] = k.split(",").map(Number), dx = x - at[0], dz = z - at[1];
      if (Math.abs(dx - dz) > 7 || Math.abs(dx + dz) > 9) continue;
      if (v > bd) { bd = v; best = [x, z]; }
    }
    if (!best) break;
    at = best;
    moved = Math.max(moved, Math.abs(at[0] - raw.spawn[0]) + Math.abs(at[1] - raw.spawn[1]));
  }
  return moved;
}
const cache = new Map();
const bases = [];
for (const b of list) { const base = readBase(b.base || baseName); await register(base); bases.push(base); }
const variant = (i, v) => {
  const k = i + ":" + v;
  if (!cache.has(k)) {
    const shape = SHAPES.find((q) => q.id === list[i].shape);
    const ts = shape ? resolveTransforms(shape) : [];
    const transform = list[i].transform || (ts.length ? ts[(list[i].seed + v) % ts.length] : undefined);
    const r = generateLayout(bases[i], { ...list[i], transform, seed: list[i].seed + v * 1000 });
    cache.set(k, { ...r, variant: v, ok: !!r.level && !r.problems.length && (!list[i].open || closeWalk(r.level) >= 9) });
  }
  return cache.get(k);
};
const fits = (b, r) => r.ok && (!b.require || r.level.route.shortcuts.some((q) => q.kind === b.require)) && (b.run || r.level.route.shortcuts.length >= 2);
const pick = list.map((b, i) => { for (let v = 0; v < VARIANTS; v++) if (fits(b, variant(i, v))) return v; for (let v = 0; v < VARIANTS; v++) if (variant(i, v).ok) return v; return 0; });
const runScore = () => {
  if (!list.every((b) => b.run)) return 0;
  const lv = list.map((b, i) => variant(i, pick[i]));
  if (!lv.every((r) => r.ok)) return -99;
  const M = measure(lv.map((r) => r.level), names);
  const res = checks(M);
  const over = (v, lim) => Math.max(0, v - lim + 0.03);
  return res.filter((r) => r.ok).length * 100 + lv.reduce((a, r) => a + r.level.route.shortcuts.length, 0) - 300 * (over(M.centre.max, 0.6) + over(M.footprint.max, 0.55) + over(M.centre.mean, 0.45) + over(M.footprint.mean, 0.4));
};
if (list.every((b) => b.run)) {
  let score = runScore();
  for (let round = 0; round < 3; round++) {
    let better = false;
    for (let i = 0; i < list.length; i++) for (let v = 0; v < VARIANTS; v++) {
      if (v === pick[i] || !variant(i, v).ok) continue;
      const was = pick[i];
      pick[i] = v;
      const sc = runScore();
      if (sc > score) { score = sc; better = true; } else pick[i] = was;
    }
    if (!better) break;
  }
  console.log(`run variety score ${score}`);
}
for (const [i, b] of list.entries()) {
  const best = variant(i, pick[i]);
  const { level, attempt, history } = best;
  const problems = [...best.problems];
  if (b.traps && level) {
    const r = placeTraps(level, b.traps, { position: i + 1 });
    level.traps = r.traps;
    problems.push(...r.problems);
  }
  if (level) { level.charges = placeCharges(level, { seed: level.layout?.seed ?? b.seed }); problems.push(...checkCharges(level)); }
  const dist = routeDistances(level).map((s) => `${s.id} ${s.locked}->${s.unlocked}`).join(", ");
  const land = level.cells.flat().filter((c) => c.s !== "none" && c.s !== "water").length;
  console.log(`${b.name}: ${level.layout.shape} ${level.layout.transform} x${level.layout.scale} ${b.archetype}, seed ${b.seed}${best.variant ? ` variant ${best.variant}` : ""} attempt ${attempt}, size ${level.size.join("x")}, land ${land}, ${level.decor.length} decor, path ${level.cells.flat().filter((c) => c.p).length} cells, pads ${level.things.filter((t) => t.kind === "pad").length / 2}, features ${(level.route.features || []).map((f) => f.kind).join("+")}; shortcuts ${dist}`);
  if (args.includes("--why")) for (const [k, h] of (history || []).entries()) console.log(`  attempt ${k}: ${h.join(" | ")}`);
  if (problems.length) { failed++; console.log("  FAIL\n  " + problems.slice(0, 12).join("\n  ")); }
  if (ascii) fs.writeFileSync(path.join(flag("--ascii-dir", "out/layout"), `${b.name}.txt`), draw(level) + "\n" + problems.join("\n") + "\n");
  if (!dry && !problems.length) fs.writeFileSync(path.join(root, "levels", `${b.name}.json`), JSON.stringify(level) + "\n");
}
process.exitCode = failed ? 1 : 0;

function draw(L) {
  const th = new Map(L.things.map((t) => [t.x + "," + t.z, { bonfire: "B", chest: "C", gate: "G", elevator: "E", watcher: "W", door: "D", ladder: "K", lever: "V", pad: "P" }[t.kind]]));
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
