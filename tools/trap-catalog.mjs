import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const md = fs.readFileSync(path.join(root, "docs/TRAPS.md"), "utf8");
const block = md.split("## Machine-readable")[1]?.match(/```json\n([\s\S]*?)\n```/);
if (!block) throw new Error("docs/TRAPS.md has no Machine-readable json block");
const list = JSON.parse(block[1]);
const keep = ["id", "name", "tier", "footprint", "trigger", "visibility", "health", "pull", "excludes", "members"];
const rows = list.map((t) => "  " + JSON.stringify(Object.fromEntries(keep.filter((k) => t[k] != null).map((k) => [k, t[k]]))) + ",");
const out = `export const TRAP_CATALOG = [\n${rows.join("\n")}\n];\n\nexport const TRAP_BY_ID = Object.fromEntries(TRAP_CATALOG.map((t) => [t.id, t]));\n`;
fs.writeFileSync(path.join(root, "core/traps/catalog.js"), out);
console.log(`wrote core/traps/catalog.js: ${list.length} traps`);
