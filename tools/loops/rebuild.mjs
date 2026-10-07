import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { root } from "./lib.mjs";

export const ISLANDS = [
  ["cat-medium", "cat"], ["dragon-medium", "dragon"], ["chimera-medium", "chimera"], ["wizard-medium", "wizard"],
  ["swallow-medium", "swallow"], ["sharkbear-medium", "sharkbear"], ["gremlin-subject", "gremlin"], ["mindbloom-medium", "mindbloom"],
  ["eagle-composition", "eagle"], ["forest-volute", "forest"], ["cosmos-frisket", "cosmos"], ["ember-subject", "ember"],
];

const GENERIC = /^(windmill|canopy-tree|watchtower|gatehouse|shipwreck|shrine|market-row|waterfall-cliff)(-small)?$/;

export function seedOf(level) {
  const p = path.join(root, "pipeline/a-transcribe/shaped", `${level}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")).composition?.shaped?.seed ?? 1 : 1;
}

export function rebuild(level, art, o = {}) {
  const seed = o.seed ?? seedOf(level);
  const run = (args) => execFileSync(process.execPath, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const b = run(["pipeline/a-transcribe/build-level.mjs", "--art", art, "--brief", `pipeline/seed/concepts/${level}.json`, "--level", level, "--pieces", art, "--seed", String(seed)]);
  if (o.decor !== false) run(["tools/loops/decor-loop.mjs", level, "--write", "--quiet"]);
  return { seed, ok: /PASS/.test(b) };
}

function strip(L) {
  const c = JSON.parse(JSON.stringify(L));
  c.decor = c.decor.filter((d) => !GENERIC.test(d.t));
  c.pieces = (c.pieces || []).filter((p) => !/multitile(-place-a|-place)?\.js$/.test(p));
  if (c.palette) delete c.palette.multitile;
  return JSON.stringify(c);
}

export function compare(level, ref = "HEAD") {
  const now = fs.readFileSync(path.join(root, "levels", `${level}.json`), "utf8");
  let old;
  try { old = execFileSync("git", ["show", `${ref}:levels/${level}.json`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }); } catch { return { status: "new" }; }
  if (now === old) return { status: "identical" };
  const A = JSON.parse(old), B = JSON.parse(now);
  const g = (L) => L.decor.filter((d) => GENERIC.test(d.t)).map((d) => `${d.t}@${d.x},${d.z}r${d.rot || 0}`).join(" ");
  if (strip(A) === strip(B)) return { status: "placer-only", was: g(A), now: g(B) };
  const diffs = Object.keys({ ...A, ...B }).filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
  return { status: "differs", keys: diffs.join(","), was: g(A), now: g(B) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith("--"));
  const noDecor = args.includes("--no-decor");
  const ref = (args.find((a) => a.startsWith("--ref=")) || "--ref=HEAD").slice(6);
  const list = only ? ISLANDS.filter(([l]) => only.split(",").includes(l)) : ISLANDS;
  let bad = 0;
  for (const [level, art] of list) {
    const { seed, ok } = rebuild(level, art, { decor: !noDecor });
    const c = compare(level, ref);
    if (c.status === "differs") bad++;
    console.log(`${level.padEnd(18)} seed ${String(seed).padEnd(2)} build ${ok ? "PASS" : "FAIL"}  ${c.status}${c.keys ? ` [${c.keys}]` : ""}${c.was !== undefined && c.was !== c.now ? `  generic ${c.was || "none"} -> ${c.now || "none"}` : ""}`);
  }
  process.exitCode = bad ? 1 : 0;
}
