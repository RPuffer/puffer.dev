import fs from "node:fs";
import path from "node:path";
import { decorPass, seedOf } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { loadLevel, table, root } from "./lib.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const seedArg = opt("--seed", null), iterations = +opt("--iterations", 40), brief = opt("--brief", null), out = opt("--out", null);
const write = flag("--write"), quiet = flag("--quiet");
const name = args[0];
if (!name) { console.error("usage: node tools/loops/decor-loop.mjs <level> [--seed n] [--iterations 40] [--brief path] [--write | --out file.json] [--quiet]"); process.exit(2); }

const { file, level, brief: b } = await loadLevel(name, { brief });
const seed = seedArg != null ? +seedArg : seedOf(level.name || name);
const log = [];
const r = decorPass(level, { brief: b, seed, iterations, log });
if (!quiet) for (const m of r.moves) console.log("  " + m);
console.log(log.join("\n"));
console.log(`\nbefore\n${table(r.before)}\n\nafter\n${table(r.after)}`);
const dest = write ? file : out ? path.resolve(root, out) : null;
if (dest) { fs.writeFileSync(dest, JSON.stringify(level)); console.log(`wrote ${path.relative(root, dest)} (seed ${seed})`); }
process.exitCode = r.after.missing > r.before.missing ? 1 : 0;
