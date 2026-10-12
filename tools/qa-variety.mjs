import fs from "node:fs";
import path from "node:path";
import { measure, checks, T } from "./variety-lib.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const listArg = args.find((a) => !a.startsWith("--"));
const names = listArg ? listArg.split(",") : JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const levels = names.map((n) => JSON.parse(fs.readFileSync(path.join(root, "levels", `${n}.json`), "utf8")));

const M = measure(levels, names);
const results = checks(M);
if (!jsonOut) for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name} ${r.detail}`);
const fail = results.filter((r) => !r.ok);
if (jsonOut) console.log(JSON.stringify({ thresholds: T, metrics: { ...M, pairs: undefined }, results }, null, 1));
else console.log(`\n${results.length - fail.length} passed, ${fail.length} failed`);
process.exitCode = fail.length ? 1 : 0;
