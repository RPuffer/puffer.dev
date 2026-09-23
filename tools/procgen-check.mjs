import { generateLevel, checkLevel, levelStats } from "../core/procgen.js";
import { prepareLevel } from "../core/level.js";

const N = +(process.argv[2] || 200), start = +(process.argv[3] || 1);
const fails = [], rows = [], decorCounts = {}, attempts = [];
const t0 = performance.now();
for (let seed = start; seed < start + N; seed++) {
  let L;
  try { L = generateLevel(seed); } catch (e) { fails.push(`seed ${seed}: ${e.message}`); continue; }
  const problems = checkLevel(L);
  const again = JSON.stringify(generateLevel(seed));
  if (again !== JSON.stringify(L)) problems.push("not deterministic");
  try { const P = prepareLevel(JSON.parse(again)); if (P.warnings.length) problems.push("prepareLevel warnings: " + P.warnings[0]); } catch (e) { problems.push("prepareLevel: " + e.message); }
  if (!L.view || !(L.view.zoom > 0) || L.view.center?.length !== 3) problems.push("view block incomplete");
  for (const p of problems) fails.push(`seed ${seed}: ${p}`);
  const s = levelStats(L);
  s.decor = L.decor.length;
  const byType = {};
  for (const d of L.decor) byType[d.t] = (byType[d.t] || 0) + 1;
  for (const [t, n] of Object.entries(byType)) (decorCounts[t] ||= []).push(n);
  s.zoom = L.view.zoom;
  rows.push(s);
  attempts.push(L.attempt);
}
const ms = performance.now() - t0;

const base = generateLevel(1), clone = () => JSON.parse(JSON.stringify(base));
const mutants = {
  "spawn blocked": (L) => L.decor.push({ t: "rock", x: L.spawn[0], z: L.spawn[1] }),
  "overlap": (L) => { const d = L.decor.find((e) => e.t !== "waterfall"); L.decor.push({ ...d, t: "bush" }); },
  "unreachable": (L) => { L.cells[0][0] = { h: 2, s: "sand" }; L.cells[0][1] = { h: 0, s: "none" }; L.cells[1][0] = { h: 0, s: "none" }; L.cells[1][1] = { h: 0, s: "none" }; },
  "bad ramp": (L) => { const [x, z] = L.spawn; L.cells[z][x] = { h: 3, s: "ramp", d: "n", m: "stone" }; },
  "waterfall on land": (L) => L.decor.push({ t: "waterfall", x: L.spawn[0], z: L.spawn[1], rot: 0 }),
};
for (const [name, mut] of Object.entries(mutants)) {
  const L = clone();
  mut(L);
  if (!checkLevel(L).length) fails.push(`checker missed mutant: ${name}`);
}

const dist = (xs) => {
  const v = [...xs].sort((a, b) => a - b), q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const mean = v.reduce((a, b) => a + b, 0) / (v.length || 1);
  return `min ${fmt(v[0])}  p10 ${fmt(q(0.1))}  med ${fmt(q(0.5))}  p90 ${fmt(q(0.9))}  max ${fmt(v[v.length - 1])}  mean ${fmt(mean)}`;
};
const fmt = (x) => (x == null ? "-" : Number.isInteger(x) ? String(x) : x.toFixed(2));

console.log(`procgen-check: ${rows.length}/${N} seeds generated in ${(ms / 1000).toFixed(1)} s (two generations each)`);
console.log("\nsize");
for (const k of ["land", "plateau", "grassShare", "water", "ramps", "bridges", "dirt", "decor", "zoom"]) console.log(`  ${k.padEnd(11)} ${dist(rows.map((r) => r[k]))}`);
console.log(`  ${"bbox w".padEnd(11)} ${dist(rows.map((r) => r.bbox[0]))}`);
console.log(`  ${"bbox d".padEnd(11)} ${dist(rows.map((r) => r.bbox[1]))}`);
console.log(`  ${"attempt".padEnd(11)} ${dist(attempts)}`);
console.log("\ndecor per island (islands carrying the type: per-island counts)");
for (const [t, ns] of Object.entries(decorCounts).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${t.padEnd(16)} ${String(ns.length).padStart(3)} islands  ${dist(ns)}`);
console.log(`\n${fails.length ? "FAIL" : "PASS"}: ${fails.length} problems`);
for (const f of fails.slice(0, 30)) console.log("  " + f);
process.exitCode = fails.length ? 1 : 0;
