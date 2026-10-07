import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { loadPieces, BUILDERS } from "../3d/hooks.js";
import { buildDecor } from "../3d/decor.js";
import { buildCharacter } from "../3d/character.js";
import { makeStyle } from "../3d/style.js";
import { viewFrom } from "../core/iso.js";
import { CATALOG } from "../core/catalog.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ISLANDS = ["cat-medium", "dragon-medium", "chimera-medium", "wizard-medium", "swallow-medium", "sharkbear-medium", "gremlin-subject", "mindbloom-medium", "eagle-composition", "forest-volute", "cosmos-frisket", "ember-subject"];
const manifest = JSON.parse(fs.readFileSync(path.join(root, "pipeline/refsheets/manifest.json"), "utf8"));
const args = process.argv.slice(2);
const json = args.includes("--json");
const list = (args.find((a) => !a.startsWith("--")) || ISLANDS.join(",")).split(",");

const box = (obj) => { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); };

function leadOf(level) {
  const roles = level.palette?.props || {};
  return level.decor.filter((d) => ["lead", "creature"].includes(roles[d.t]?.role)).sort((a, b) => (CATALOG[b.t]?.footprint?.[0] || 1) * (CATALOG[b.t]?.footprint?.[1] || 1) - (CATALOG[a.t]?.footprint?.[0] || 1) * (CATALOG[a.t]?.footprint?.[1] || 1))[0] || null;
}

const rows = [];
for (const name of list) {
  const level = JSON.parse(fs.readFileSync(path.join(root, "levels", `${name}.json`), "utf8"));
  for (const k of Object.keys(BUILDERS)) delete BUILDERS[k];
  await loadPieces({ ...level, pieces: (level.pieces || []).map((p) => path.join(root, "3d", p)) });
  const style = makeStyle(level), view = viewFrom(level, {});
  const lead = leadOf(level);
  const slug = name.split("-")[0];
  const ref = manifest[slug];
  if (!lead) { rows.push({ name, slug, error: "no lead" }); continue; }
  const flat = { ...level, decor: [{ ...lead, x: 1, z: 1, ox: 0, oz: 0 }], cells: level.cells.map((r) => r.map(() => ({ h: 1, s: "sand" }))), things: [] };
  const g = buildDecor(flat, view, style).group;
  const fb = box(g), hb = box(buildCharacter(1, style));
  const T = view.tileH;
  const figH = fb.max.y - T, heroH = hb.max.y - hb.min.y;
  const size = fb.getSize(new THREE.Vector3());
  const ratio = figH / heroH;
  const target = ref?.target_ratio ?? null, sheet = ref?.height_ratio ?? null;
  rows.push({ name, slug, type: lead.t, catalogHeight: CATALOG[lead.t]?.height, figureH: +figH.toFixed(2), footprint: [+size.x.toFixed(2), +size.z.toFixed(2)], heroH: +heroH.toFixed(2), ratio: +ratio.toFixed(2), sheet, target, scale: target ? +(target / ratio).toFixed(2) : null, verdict: ref?.verdict || "" });
}

if (json) console.log(JSON.stringify(rows, null, 1));
else {
  console.log("island             figure                          tiles  catalog  hero   ratio  sheet  target  scale");
  for (const r of rows) {
    if (r.error) { console.log(`${r.name.padEnd(18)} ${r.error}`); continue; }
    console.log(`${r.name.padEnd(18)} ${String(r.type).slice(0, 31).padEnd(31)} ${String(r.figureH).padEnd(6)} ${String(r.catalogHeight).padEnd(8)} ${String(r.heroH).padEnd(6)} ${String(r.ratio).padEnd(6)} ${String(r.sheet).padEnd(6)} ${String(r.target).padEnd(7)} x${r.scale}`);
  }
}
