import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { analyse } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { loadLevel, root } from "./lib.mjs";
import { ISLANDS, rebuild } from "./rebuild.mjs";
import { prep, bfs, key, thingCells } from "./graph.mjs";
import { measure } from "./layout-metrics.mjs";
import { walkLevel } from "./walk.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.findIndex((a) => a === k || a.startsWith(k + "=")); if (i < 0) return d; const a = args[i]; if (a.includes("=")) { args.splice(i, 1); return a.split("=")[1]; } const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const terrain = +opt("--terrain", 4);
const base = opt("--base", "http://localhost:8765").replace(/\/$/, "");
const outDir = opt("--out", "out/loops/walks");
const noWalk = flag("--no-walk");
const name = args[0];
if (!name) { console.error("usage: node tools/loops/pass.mjs <level> [--terrain=4] [--no-walk] [--base http://localhost:8765] [--out out/loops/walks]"); process.exit(2); }

process.env.PP_PROFILE ||= ".pp-profile-pass";
const file = path.join(root, "levels", `${name}.json`);
const sha = () => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 10);
const logFile = path.join(root, "out/loops/pass", `${name}.log`);
fs.mkdirSync(path.dirname(logFile), { recursive: true });
fs.writeFileSync(logFile, "");
const log = (s) => fs.appendFileSync(logFile, s.endsWith("\n") ? s : s + "\n");
const node = (step, script, a, ok = [0]) => {
  log(`== ${step}: node ${script} ${a.join(" ")}`);
  try {
    log(execFileSync(process.execPath, [path.join(root, script), ...a], { cwd: root, encoding: "utf8", env: process.env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }));
    return 0;
  } catch (e) {
    log(String(e.stdout || "") + String(e.stderr || ""));
    if (!ok.includes(e.status)) throw new Error(`${step} exited ${e.status}; see ${path.relative(root, logFile)}`);
    return e.status;
  }
};

const before = sha();
const fails = [];
const art = ISLANDS.find(([l]) => l === name)?.[1];
try {
  if (art) { log(`== rebuild ${name} --art ${art}`); const r = rebuild(name, art, { decor: false }); log(`seed ${r.seed} build ${r.ok ? "PASS" : "FAIL"}`); if (!r.ok) fails.push("build-level"); }
  else log(`== rebuild skipped: ${name} has no island module`);
  for (let round = 1; ; round++) {
    const h = sha();
    node(`decor loop ${round}`, "tools/loops/decor-loop.mjs", [name, "--write", "--quiet"], [0, 1]);
    node(`layout loop ${round}`, "tools/loops/layout-loop.mjs", [name, `--terrain=${terrain}`, "--write"]);
    if (art || sha() === h) break;
    if (round === 8) { fails.push("loops still moving after 8 rounds"); break; }
  }
  if (!noWalk) node("walk", "tools/loops/walk.mjs", [name, "--live", base, "--out", outDir]);
  fs.rmSync(path.join(root, outDir, `${name}.png`), { force: true });
  node("overlay", "tools/loops/overlay.mjs", [name, "--base", base, "--out", outDir]);
  if (node("qa-levels", "tools/qa-levels.mjs", [base, name], [0, 1])) fails.push("qa-levels");
} catch (e) {
  fails.push(e.message);
}

const { level, brief } = await loadLevel(name);
const P = prep(level);
const seen = bfs(P, level.spawn).seen;
const reach = P.walk.filter(([x, z]) => seen.has(key(x, z))).length;
if (reach !== P.walk.length) fails.push(`reach ${reach}/${P.walk.length}`);
for (const t of level.things || []) {
  const kind = t.kind || t.t;
  const cells = kind === "elevator" ? thingCells(t) : kind === "bonfire" || kind === "chest" ? [[t.x + 1, t.z], [t.x - 1, t.z], [t.x, t.z + 1], [t.x, t.z - 1]] : [];
  if (cells.length && !cells.some(([x, z]) => seen.has(key(x, z)))) fails.push(`${kind} ${t.id} unreachable`);
}
const A = analyse(level, { brief }).metrics;
const M = measure(level, { frame: false }).m;
const G = walkLevel(level).policies.greedy;
const after = sha();
const fig = M.fig.spawn == null ? "none" : M.fig.spawn ? "y" : "n";
const line = `${name} walkable ${reach}/${P.walk.length} singletons ${A.singletonShare.toFixed(2)} density ${A.density.all.toFixed(2)} figure-from-spawn ${fig} greedy ${G.steps} edits ${(level.edits || []).length} level ${before === after ? "unchanged" : `${before}->${after}`} ${fails.length ? "FAIL " + fails.join("; ") : "PASS"}`;
log(line);
console.log(line);
process.exitCode = fails.length ? 1 : 0;
