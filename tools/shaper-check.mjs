import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SHAPER_NAMES } from "../pipeline/a-transcribe/shapers.mjs";
import { reachability } from "../core/procgen.js";
import { CATALOG } from "../core/catalog.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const seeds = (args.find((a) => a.startsWith("--seeds="))?.slice(8) || "1,2,3").split(",").map(Number);
const FLOOR = 80;
const VARIANTS = {
  mound: [{}, { peak: [0.3, 0.3], height: 2, lobes: 2 }],
  basin: [{ pool: true }, { open: "e", wall: 2, focal: "wall" }],
  radial: [{}, { order: "ripple", rings: 4, spokes: 2 }],
  spiral: [{}, { climb: "out", hand: "ccw", turns: 1.6 }],
  patchwork: [{}, { patch: 2, holes: 3 }],
  ribbon: [{ fork: true }, { from: "w", rise: "arch", width: 3 }],
  shards: [{}, { count: 6, cracks: false }],
  symmetric: [{}, { axis: "diag", tiers: 2 }],
  "twin-mass": [{ bridge: "planks" }, { split: "x", heights: [1, 3], focal: "b" }],
};
const MIX = [{ pattern: "rings", period: 2.5, surfaces: [{ s: "grass", share: 0.5 }, { s: "sand", share: 0.4 }, { s: "stone", share: 0.1 }] }, { pattern: "patches", surfaces: [{ s: "grass", share: 0.4 }, { s: "dirt", share: 0.3 }, { s: "sand", share: 0.3 }] }];
const CLIFF = ["banded", "sheer", "stepped", "mossy", "soft"];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shaper-check-"));
const brief = (name, params, i) => ({
  source: { art: "pipeline/seed/forest.png" },
  mood: ["check"], observations: [], palette: { translation: { bg: "#303040" } },
  motifs: [{ name: "check-rock", type: "rock", count: 3, cells: [[4, 4], [10, 6], [6, 8]], role: "mass" }, { name: "check-torch", type: "torch", count: 2, cells: [[7, 8], [9, 8]], role: "light" }],
  creatures: [{ name: "check-well", type: "well", cell: [8, 4], facing: "s", height: 1.6 }],
  composition: { grid: Array.from({ length: 12 }, (_, z) => (z === 4 ? "GGGGGGGGFGGGGGGG" : "GGGGGGGGGGGGGGGG")), heights: Array.from({ length: 12 }, () => "1111111111111111"), focal: { x: 8, z: 4 } },
  biome: { trees: { density: 0.1, types: [{ type: "tree-pine", weight: 1 }] }, water_share: 0, plateau_share: 0, void_share: 0.3, decor_weights: { rock: 1, flower: 1 }, decor_density: 0.08, lighting: { bg: "#303040", ambient: 0.9, sun: 0.2 }, surfaces: { ground: "grass", raised: "grass", path: "dirt", shore: "sand" } },
  shaper: { name, params },
  surface_mix: MIX[i % MIX.length],
  cliff_treatment: { style: CLIFF[i % CLIFF.length], upper: ["#b7766a", "#96584f", "#7d4a44"], lower: ["#c98a6c", "#a0624f", "#86503f"] },
  concept: { name: "lens-check", lens: "check" },
});

const fails = [], rows = [];
let i = 0;
for (const name of SHAPER_NAMES) {
  if (only.length && !only.includes(name)) continue;
  for (const params of VARIANTS[name] || [{}]) for (const seed of seeds) {
    const tag = `${name}-${i}-${seed}`, bp = path.join(tmp, `${tag}.json`), lp = path.join(tmp, `${tag}.level.json`);
    fs.writeFileSync(bp, JSON.stringify(brief(name, params, i)));
    let out = "";
    try {
      out = execFileSync(process.execPath, [path.join(root, "pipeline/a-transcribe/build-level.mjs"), "--art", "forest", "--brief", bp, "--level", tag, "--pieces", "example", "--seed", String(seed), "--out", lp, "--regions", path.join(tmp, `${tag}.regions.json`), "--shaped", path.join(tmp, `${tag}.shaped.json`)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] }).toString();
    } catch (e) { out = (e.stdout || "").toString() + (e.stderr || "").toString(); }
    const problems = [];
    if (!fs.existsSync(lp)) { fails.push(`${tag}: no level written\n${out.split("\n").filter((l) => /Error|error|at .*mjs/.test(l)).slice(0, 4).join("\n")}`); i++; continue; }
    const L = JSON.parse(fs.readFileSync(lp, "utf8"));
    const [W, D] = L.size;
    const blocked = new Set();
    for (const d of L.decor) if (CATALOG[d.t] && !CATALOG[d.t].passable) blocked.add(`${d.x},${d.z}`);
    const lead = L.decor.find((d) => d.t === "well");
    const fig = new Set(lead ? [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => `${lead.x + a},${lead.z + b}`) : []);
    const r0 = reachability({ ...L, blocked }), missing = r0.missing.filter(([x, z]) => !fig.has(`${x},${z}`));
    const r = { reached: r0.reached, total: r0.reached + missing.length, missing };
    const bare = reachability({ ...L, blocked: new Set() }).reached - fig.size;
    if (bare < FLOOR) problems.push(`terrain walkable ${bare} < ${FLOOR}`);
    if (r.missing.length) problems.push(`${r.missing.length} walkable cells unreachable from spawn`);
    const land = (c) => c && c.s !== "none";
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if ((x === 0 || z === 0 || x === W - 1 || z === D - 1) && land(L.cells[z][x])) { problems.push(`rim cell ${x},${z} not void`); z = D; break; }
    const hs = L.cells.flat().filter(land).map((c) => c.h);
    if (Math.max(...hs) > 3) problems.push(`height ${Math.max(...hs)} > 3`);
    const widths = L.cells.map((row) => row.filter(land).length).filter((n) => n);
    const cols = Array.from({ length: W }, (_, x) => L.cells.filter((row) => land(row[x])).length).filter((n) => n);
    const fill = L.cells.flat().filter(land).length / (widths.length * cols.length);
    if (new Set(widths).size < 3 && new Set(cols).size < 3) problems.push("outline too regular");
    if (fill > 0.9) problems.push(`outline fills ${Math.round(fill * 100)}% of its bounding box`);
    if (/^FAIL/m.test(out) && !/^\s+\d+ walkable cells unreachable, first/m.test(out.split(/^FAIL/m)[1] || "")) problems.push(out.split("\n").slice(out.split("\n").findIndex((l) => /^FAIL/.test(l)) + 1).filter(Boolean).slice(0, 3).map((l) => l.trim()).join(" | "));
    const tiers = [1, 2, 3].map((h) => L.cells.flat().filter((c) => land(c) && c.s !== "water" && c.h === h).length);
    rows.push(`${tag.padEnd(16)} terrain ${String(bare).padStart(3)} decor-walk ${String(r.reached).padStart(3)}/${String(r.total).padEnd(3)} h1/h2/h3 ${tiers.join("/")} ${problems.length ? "FAIL " + problems.join("; ") : "ok"}`);
    for (const p of problems) fails.push(`${tag}: ${p}`);
    i++;
  }
}
console.log(rows.join("\n"));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails.length ? `\n${fails.length} FAIL\n` + fails.join("\n") : `\nPASS: ${rows.length} builds, every shaper >= ${FLOOR} walkable terrain cells, all reachable with decor, void rim, heights <= 3`);
process.exitCode = fails.length ? 1 : 0;
