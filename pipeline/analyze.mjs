import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CATALOG, PALETTE } from "../core/catalog.js";
import { PALETTE as PAL3D } from "../3d/palette.js";
import { askJSON, imagePart, spend } from "./vision.mjs";

const [art, out] = process.argv.slice(2);
if (!art || !out) { console.error("usage: node pipeline/analyze.mjs <art.png> <brief.json>"); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REF = path.join(root, "ref/reference.png");
const SHEET = path.join(root, "ref/tilesheet.png");
const CODES = { G: "ground", R: "raised ground (plateau, one or more blocks above G)", W: "water", V: "void (no land, background shows)", T: "vegetation (trees, bushes, roots)", F: "the figure or focal creature", P: "path" };
const DIMS = { box: 3, rbox: 4, cyl: 3, cone: 4, ball: 2, prism: 1, beam: 1 };
const PRIMS = Object.keys(DIMS);
const HEX = /^#[0-9a-f]{6}$/i;
const K = 8;

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

async function kmeans(file, k) {
  const { data, info } = await sharp(file).flatten({ background: "#ffffff" }).resize(192, 192, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2]]);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  let cents = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) / k) * sorted.length)]]);
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 30; it++) {
    const sums = cents.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => {
      let best = 0, bd = Infinity;
      cents.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; best = j; } });
      assign[i] = best; const s = sums[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    });
    cents = sums.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cents[j]));
  }
  const counts = cents.map(() => 0);
  assign.forEach((a) => counts[a]++);
  return cents.map((c, j) => ({ hex: hex(c), share: +(counts[j] / px.length).toFixed(3) })).filter((c) => c.share > 0).sort((a, b) => b.share - a.share);
}

const measured = await kmeans(art, K);
const meta = await sharp(art).metadata();

const paletteShape = Object.fromEntries(Object.entries(PALETTE).filter(([k]) => k !== "bg").map(([k, v]) => [k, Array.isArray(v) ? `array of ${v.length} hexes` : `object with keys ${Object.keys(v).join(", ")}`]));
const catalogList = Object.entries(CATALOG).map(([t, c]) => `${t} (footprint ${c.footprint.join("x")}, height ${c.height}, ${c.variants} variants${c.passable ? ", passable" : ""})`).join("; ");

const prompt = `You are the art director translating an artwork into a level for a cute isometric low-poly asset pack.

IMAGE 1 is the artwork to translate. IMAGE 2 is the pack's reference island. IMAGE 3 is the pack's tilesheet. The level must feel like IMAGE 1 (mood, palette, motifs, composition) and still be unmistakably built from the same pack as IMAGES 2 and 3.

THE PACK'S GRAMMAR (every shape you describe must obey it):
- Flat colour only. Every part carries exactly three tones: top face brightest, left face (toward screen lower-left) mid, right face (toward screen lower-right) darkest. Light from the upper left. No gradients, no outlines, no texture, no smooth shading, no glow halos drawn as gradients.
- Chunky, toy-like, rounded. Units are tile units: one cell is 1x1; one terrain block is 1 tall (the engine scales it by 1.5). Props sit on one cell, typically 0.3 to 2.4 tall.
- Primitives the modeller has, with the exact "dims" each takes (tile units): box [w,h,d]; rbox [w,h,d,r] rounded box, r 0.05 to 0.15; cyl [r,h,sides] faceted, 6 to 10 sides; cone [r0,r1,h,sides]; ball [r,squashY] low-poly icosphere; prism [h] plus "outline": [[x,z],...] a 2D footprint extruded upward; beam [r] plus "to": [x,y,z], a thin faceted bar from "at" to "to" (branches, roots, ropes, flame strokes). "at" is the bottom centre for box, rbox, cyl, cone, prism, the centre for ball, the start for beam. Optional "rot": [rx,ry,rz] degrees.
- Existing idioms: pine = trunk box 0.16 wide + four stacked rboxes of widths 1.0, 0.83, 0.63, 0.41 of the tier width; round tree = trunk + cluster of 3 to 4 rounded cubes; bush = 5 to 6 overlapping balls; rock = stacked pebbles; wood props in orange; flames are stacked cones in yellow, amber, orange.
- Terrain: blocks with a coloured top (grass, sand, dirt, stone) over a two-tone cliff side, a scalloped fringe of the top colour dripping over the edge, water as flat pale-cyan slabs.

CATALOG TYPES available for reuse: ${catalogList}.

CURRENT PACK PALETTE (JSON, the keys you override): ${JSON.stringify(PALETTE)}

EXTRA PROP COLOURS the 3d build already uses (flame, gem, cap...): ${JSON.stringify(Object.fromEntries(Object.entries(PAL3D).filter(([k]) => !(k in PALETTE))))}

MEASURED PALETTE of IMAGE 1 (k-means over pixels, share of area): ${JSON.stringify(measured)}.

TASK. Return ONE JSON object, no prose outside it, with exactly these keys:

"observations": 8 to 14 items describing what is actually drawn in IMAGE 1 before you interpret it, each {"what": concrete description, "box": [ymin,xmin,ymax,xmax] in IMAGE 1 normalized 0 to 1000, "maps_to": the motif, creature, or grid code it becomes}. Scan IMAGE 1 as a 3x3 grid of regions and report what each holds; cover every figure (including small, faint, partial, or secondary ones, each as its own observation; figures drawn in the same stroke style as the main one often hide among the trees), every distinct tree form (upright, leaning, fallen), roots, logs, light sources, mist, the ground and any path or clearing. Everything later in the JSON must follow from these observations; do not add features the drawing does not have.

"mood": 4 to 8 single words.

"palette": {
  "measured": the measured list above, same order, each item {"hex","share","role"} where role names what that colour is in IMAGE 1 (paper, mist, trunk shadow, stroke...).
  "translation": a per-level override of the pack palette keyed by the pack palette's own keys, with the same shape per key: ${JSON.stringify(paletteShape)}, plus "bg" (hex). Rules: keep each group's three-tone ladder (top brightest, then left, then right; roughly the pack's own luminance ratios top 1.00 : left 0.88 : right 0.66); keep every group in its own hue family (grass stays green, sand stays warm yellow-ochre, water stays cyan, wood stays orange, gold stays gold, trunk stays red-brown) so it still reads as the same toy pack, and pull value, saturation, and hue temperature toward IMAGE 1's mood. If IMAGE 1 is monochrome or near-monochrome, do NOT translate to grey: a grey level no longer reads as the pack. Top tones of grass, sand, water, wood, and the tree groups keep HSL saturation of at least 30% and lightness between 42% and 78%; the background may go dark. For a dark forest: dusk and moss greens, cooled ochre sand, deep teal water, a dark blue-grey background. A figure made of flame or light in IMAGE 1 keeps the pack's warm flame colours as the one hot accent in the level. Every value is a 6-digit hex.
  "notes": one or two sentences on the translation logic.
}

"motifs": 5 to 8 items, strongest first, each a distinct shape observed in IMAGE 1 (for example upright bare trunk, leaning or fallen trunk, root tangle, mist bank, a light or lantern only if the drawing has a light source). Each {"name", "type": an existing catalog type to reuse with new colours, or "new", "variant_of": the catalog type it derives from or null, "footprint": [w,d] in cells, "height": tile units, "passable": bool, "count": how many in a 16x12 island, "cells": exactly "count" grid cells [x,z] where the instances go, matching where IMAGE 1 draws them (never on W or V cells), "where": one sentence tying the placement to the drawing, "shape": {"summary": one sentence, "parts": 3 to 12 items (at least 5 for anything taller than 1.5) each {"prim": one of ${PRIMS.join("|")}, "dims": as specified per primitive, "at": [x,y,z] offset from the cell centre on the ground, "to" for beams, "outline" for prisms, optional "rot", "tones": [top,left,right] hexes from your translation}}}. A modeller who never sees IMAGE 1 must be able to build each motif from "parts" alone, so give real proportions: a bare trunk is tall and thin (e.g. 0.18 wide, 2.6 tall) with 2 to 4 stubby branch beams; mist is flat pale translucent-looking rboxes stacked low, drawn opaque in pale tones; roots are low beams arching out of the ground.

"creatures": every figure in IMAGE 1, including small or secondary ones; name them by what they look like (species, pose), not generically. Build figures from 6 to 12 parts in the pack's chunky toy style: a creature drawn in flowing flame strokes becomes a cute rounded body with stacked cone or beam "flame feathers" in the flame colours, big simple head, a distinctive beak or eye kept from the drawing. Each {"name", "source": what it is in the artwork and where, "becomes": "prop" or "npc", "type": catalog type or "new", "footprint": [w,d], "height": tile units, "shape": same structure as motif shape, "pose": one sentence, "cell": [x,z], an F cell of the grid, "facing": "n|e|s|w", "why": one sentence}. NPCs stand still; they are props the hero can walk up to.

"composition": {
  Every cell reference anywhere in this JSON is [x,z] = [column, row] of this grid.
  "grid": exactly 12 strings of exactly 16 characters, one character per cell, using only these codes: ${Object.entries(CODES).map(([c, d]) => `${c}=${d}`).join(", ")}. Row 0 is the far side of IMAGE 1 (its top, the background), row 11 the near side (its bottom, the foreground); column 0 is IMAGE 1's left edge, column 15 its right. Convert the picture into a plan: IMAGE 1 looks into a scene, so each object belongs on the cell where its BASE touches the ground (a figure's feet, a trunk's foot, a log's resting line), not where its upper parts are drawn. Things standing on the far ground or fading into the background go in rows 0 to 3; the ground at the very bottom of IMAGE 1 is rows 10 and 11; horizontal position in IMAGE 1 maps to the column. Read the drawing as a map: where the drawing has ground, trunks, the figure, open space, mist. The island must be one connected walkable landmass of G, R, P, F with T sitting on land; V only at the rim or where the drawing is empty; W only where IMAGE 1 actually draws water (a dark forest floor is not water). Follow the drawing's real asymmetry: where trunks stand, where fallen trunks lie, where the pale ground or path opens, where the figure stands. Do not centre or mirror things the drawing does not centre or mirror. Put F on the cells the main figure covers (1 to 4 cells) and a separate F for any secondary figure.
  "heights": exactly 12 strings of exactly 16 digits 0 to 3, aligned with grid: 0 for W and V, 1 for G, P, most T, 2 or 3 for R; the focal cell may be raised.
  "focal": {"x","z","what"}: the grid cell of the focal point; that cell must be F.
  "mass": one sentence on where the visual weight sits.
  "read": two to four sentences on the composition: framing, depth, where the eye enters and travels, what the level must preserve.
}

"biome": procgen rules another generator will follow without seeing IMAGE 1: {"trees": {"density": 0 to 1 share of land cells with a tree, "types": [{"type","variant","weight"}] using catalog types or your new motif names}, "water_share": 0 to 1 of the 16x12 grid, "plateau_share": 0 to 1 of land raised above base, "void_share": 0 to 1, "decor_weights": {type or motif name: weight}, "lighting": {"bg": hex, "ambient": 0 to 1, "sun": 0 to 1, "tint": hex, "notes": one sentence}, "rules": 3 to 6 short imperative placement rules}.`;

const hsl = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
  return { s, l };
};
const toHsl = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const hue = !d ? null : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue === null ? null : hue * 60, s, l];
};
const fromHsl = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex([r, g, b].map((v) => (v + m) * 255));
};
function floorSaturation(tr, key, min = 0.3) {
  const ref = PALETTE[key], cur = tr[key], fixed = [];
  const walk = (v, rv, name) => {
    if (!HEX.test(v || "")) return v;
    const [h, s, l] = toHsl(v);
    if (s >= min) return v;
    const out = fromHsl(h ?? toHsl(rv)[0] ?? 0, min, l);
    fixed.push(`${name} ${v}->${out}`);
    return out;
  };
  if (Array.isArray(cur)) tr[key] = cur.map((v, i) => walk(v, ref[i] || ref[0], `${key}[${i}]`));
  else if (cur) for (const sk of Object.keys(cur)) tr[key][sk] = Array.isArray(cur[sk]) ? cur[sk].map((v, i) => walk(v, ref[sk]?.[i] || "#808080", `${key}.${sk}[${i}]`)) : walk(cur[sk], typeof ref[sk] === "string" ? ref[sk] : "#808080", `${key}.${sk}`);
  return fixed;
}
function liftGroup(tr, key, sub, min) {
  const cur = tr[key];
  const probe = cur?.[sub];
  if (!HEX.test(probe || "")) return [];
  const delta = min - toHsl(probe)[2];
  if (delta <= 0) return [];
  const lift = (v) => { if (!HEX.test(v || "")) return v; const [h, s, l] = toHsl(v); return fromHsl(h ?? 0, s, Math.min(0.95, l + delta)); };
  const fixed = [];
  const note = (name, a, b) => { if (a !== b) fixed.push(`${name} ${a}->${b}`); return b; };
  if (Array.isArray(cur)) tr[key] = cur.map((v, i) => note(`${key}[${i}]`, v, lift(v)));
  else for (const sk of Object.keys(cur)) tr[key][sk] = Array.isArray(cur[sk]) ? cur[sk].map((v, i) => note(`${key}.${sk}[${i}]`, v, lift(v))) : note(`${key}.${sk}`, cur[sk], lift(cur[sk]));
  return fixed;
}
const LIFT = [["grass", "top", 0.42], ["sand", "top", 0.5], ["water", "top", 0.45], ["wood", "light", 0.45], ["treeMint", 0, 0.4], ["treeLime", 0, 0.42], ["treeLeaf", 0, 0.4], ["treeTeal", 0, 0.4], ["treeGold", 0, 0.45], ["bushTeal", 0, 0.4], ["cliffUpper", "left", 0.24], ["cliffLower", "left", 0.22], ["dirt", "top", 0.32], ["stone", "top", 0.42]];
const VIVID = [["grass", "top"], ["sand", "top"], ["water", "top"], ["wood", "light"], ["treeMint", 0], ["treeLime", 0], ["treeLeaf", 0], ["treeTeal", 0], ["treeGold", 0]];

const PAL_KEYS = Object.keys(PALETTE).filter((k) => k !== "bg");

function checkShape(s, where, errs) {
  if (!s || typeof s !== "object") return errs.push(`${where}.shape missing`);
  if (typeof s.summary !== "string") errs.push(`${where}.shape.summary missing`);
  if (!Array.isArray(s.parts) || !s.parts.length) return errs.push(`${where}.shape.parts empty`);
  s.parts.forEach((p, i) => {
    if (!PRIMS.includes(p.prim)) errs.push(`${where}.parts[${i}].prim ${p.prim} not in ${PRIMS}`);
    if (!Array.isArray(p.dims) || p.dims.length !== DIMS[p.prim] || !p.dims.every((n) => typeof n === "number")) errs.push(`${where}.parts[${i}].dims must be ${DIMS[p.prim]} numbers for ${p.prim}`);
    if (p.prim === "beam" && !(Array.isArray(p.to) && p.to.length === 3)) errs.push(`${where}.parts[${i}] beam needs "to"`);
    if (p.prim === "prism" && !(Array.isArray(p.outline) && p.outline.length >= 3)) errs.push(`${where}.parts[${i}] prism needs "outline"`);
    if (!Array.isArray(p.at) || p.at.length !== 3) errs.push(`${where}.parts[${i}].at not [x,y,z]`);
    if (!Array.isArray(p.tones) || p.tones.length !== 3 || !p.tones.every((h) => HEX.test(h))) errs.push(`${where}.parts[${i}].tones not 3 hexes`);
  });
}

function repair(b) {
  const c = b.composition;
  if (!Array.isArray(c?.grid) || !Array.isArray(c?.heights) || c.grid.length !== 12 || c.heights.length !== 12) return;
  c.heights = c.heights.map((row, z) => [...String(row).padEnd(16, "1").slice(0, 16)].map((h, x) => {
    const g = c.grid[z]?.[x];
    if (g === "W" || g === "V") return "0";
    return h === "0" || !/[0-3]/.test(h) ? "1" : h;
  }).join(""));
  const onLand = ([x, z]) => { const g = c.grid[z]?.[x]; return g && g !== "W" && g !== "V"; };
  for (const m of b.motifs || []) if (Array.isArray(m.cells)) { m.cells = m.cells.filter((cell) => Array.isArray(cell) && onLand(cell)); m.count = m.cells.length; }
  const nearestF = (x, z) => {
    let best = null, bd = Infinity;
    c.grid.forEach((row, rz) => [...row].forEach((g, rx) => { const d = (rx - x) ** 2 + (rz - z) ** 2; if (g === "F" && d < bd) { bd = d; best = [rx, rz]; } }));
    return best;
  };
  for (const cr of b.creatures || []) if (Array.isArray(cr.cell) && c.grid[cr.cell[1]]?.[cr.cell[0]] !== "F") cr.cell = nearestF(...cr.cell) || cr.cell;
  const f = c.focal;
  if (f && typeof f.x === "number" && c.grid[f.z]?.[f.x] !== "F") {
    let best = null, bd = Infinity;
    c.grid.forEach((row, z) => [...row].forEach((g, x) => { const d = (x - f.x) ** 2 + (z - f.z) ** 2; if (g === "F" && d < bd) { bd = d; best = [x, z]; } }));
    if (best) [f.x, f.z] = best;
  }
}

const clamped = [];
function validate(b) {
  repair(b);
  clamped.length = 0;
  if (b.palette?.translation) for (const k of ["grass", "sand", "water", "wood", "treeMint", "treeLime", "treeLeaf", "treeTeal", "treeGold", "trunk", "bushTeal", "gold", "flowerOrange", "berry"]) clamped.push(...floorSaturation(b.palette.translation, k));
  if (b.palette?.translation) for (const [k, sk, min] of LIFT) clamped.push(...liftGroup(b.palette.translation, k, sk, min));
  const errs = [];
  for (const k of ["mood", "palette", "motifs", "creatures", "composition", "biome"]) if (!(k in b)) errs.push(`missing ${k}`);
  if (errs.length) return errs;
  if (!Array.isArray(b.mood) || b.mood.length < 3) errs.push("mood needs 3+ words");
  const tr = b.palette?.translation || {};
  if (!HEX.test(tr.bg || "")) errs.push("palette.translation.bg not hex");
  for (const k of PAL_KEYS) {
    const ref = PALETTE[k], got = tr[k];
    if (!got) { errs.push(`palette.translation.${k} missing`); continue; }
    if (Array.isArray(ref)) { if (!Array.isArray(got) || got.length !== ref.length || !got.every((h) => HEX.test(h))) errs.push(`palette.translation.${k} must be ${ref.length} hexes`); }
    else for (const sk of Object.keys(ref)) {
      const v = got[sk];
      if (Array.isArray(ref[sk]) ? !(Array.isArray(v) && v.length === ref[sk].length && v.every((h) => HEX.test(h))) : !HEX.test(v || "")) errs.push(`palette.translation.${k}.${sk} bad`);
    }
  }
  for (const [k, sk] of VIVID) {
    const v = tr[k]?.[sk];
    if (!HEX.test(v || "")) continue;
    const { s, l } = hsl(v);
    if (l < 0.3 || l > 0.85) errs.push(`palette.translation.${k}.${sk} ${v} is too grey or too dark/light (HSL s ${s.toFixed(2)} l ${l.toFixed(2)}); keep s >= 0.30, l 0.35..0.80`);
  }
  if (!Array.isArray(b.palette?.measured)) errs.push("palette.measured missing");
  if (!Array.isArray(b.observations) || b.observations.length < 6) errs.push("observations needs 6+ items");
  if (!Array.isArray(b.motifs) || b.motifs.length < 3) errs.push("motifs needs 3+");
  (b.motifs || []).forEach((m, i) => {
    if (!m.name) errs.push(`motifs[${i}].name missing`);
    if (m.type !== "new" && !CATALOG[m.type]) errs.push(`motifs[${i}].type ${m.type} not a catalog type or "new"`);
    checkShape(m.shape, `motifs[${i}]`, errs);
    if (!Array.isArray(m.cells) || !m.cells.length) errs.push(`motifs[${i}].cells missing or all on water/void`);
  });
  if (!Array.isArray(b.creatures)) errs.push("creatures not array");
  (b.creatures || []).forEach((c, i) => {
    if (!["prop", "npc"].includes(c.becomes)) errs.push(`creatures[${i}].becomes must be prop|npc`);
    checkShape(c.shape, `creatures[${i}]`, errs);
    if (!Array.isArray(c.cell) || c.cell.length !== 2) errs.push(`creatures[${i}].cell must be [x,z]`);
    if (typeof c.height !== "number") errs.push(`creatures[${i}].height missing`);
  });
  const c = b.composition || {};
  const codes = new RegExp(`^[${Object.keys(CODES).join("")}]{16}$`);
  if (!Array.isArray(c.grid) || c.grid.length !== 12 || !c.grid.every((r) => codes.test(r))) errs.push("composition.grid must be 12 strings of 16 codes");
  if (!Array.isArray(c.heights) || c.heights.length !== 12 || !c.heights.every((r) => /^[0-3]{16}$/.test(r))) errs.push("composition.heights must be 12 strings of 16 digits 0-3");
  if (!c.focal || typeof c.focal.x !== "number" || typeof c.focal.z !== "number") errs.push("composition.focal needs x,z");
  else if (c.grid?.[c.focal.z]?.[c.focal.x] !== "F") errs.push(`composition.focal (${c.focal.x},${c.focal.z}) is not an F cell`);
  const bi = b.biome || {};
  if (!bi.trees || typeof bi.trees.density !== "number" || !Array.isArray(bi.trees.types)) errs.push("biome.trees bad");
  for (const k of ["water_share", "plateau_share", "void_share"]) if (typeof bi[k] !== "number") errs.push(`biome.${k} not number`);
  if (!bi.lighting || !HEX.test(bi.lighting.bg || "")) errs.push("biome.lighting.bg not hex");
  if (!bi.decor_weights || typeof bi.decor_weights !== "object") errs.push("biome.decor_weights missing");
  if (Array.isArray(c.grid) && c.grid.length === 12) {
    const land = new Set("GRPFT");
    const seen = new Set(); const stack = [];
    for (let z = 0; z < 12 && !stack.length; z++) for (let x = 0; x < 16; x++) if (land.has(c.grid[z]?.[x])) { stack.push([x, z]); seen.add(`${x},${z}`); break; }
    while (stack.length) {
      const [x, z] = stack.pop();
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, k = `${nx},${nz}`;
        if (nx < 0 || nz < 0 || nx > 15 || nz > 11 || seen.has(k) || !land.has(c.grid[nz]?.[nx])) continue;
        seen.add(k); stack.push([nx, nz]);
      }
    }
    const total = c.grid.join("").split("").filter((ch) => land.has(ch)).length;
    if (seen.size !== total) errs.push(`composition.grid land is not one connected mass (${seen.size} of ${total} cells reachable)`);
  }
  return errs;
}

const parts = [await imagePart(art, 1280), await imagePart(REF, 700), await imagePart(SHEET, 700), { text: prompt }];
process.on("exit", () => console.error(`spend: ${spend.calls} calls, ${spend.inTok} in / ${spend.outTok} out tokens, ~$${spend.usd.toFixed(4)}`));
const { data, model } = await askJSON(parts, validate, { temperature: 0.2 });
if (clamped.length) {
  data.palette.clamped = clamped;
  const swap = Object.fromEntries(clamped.map((t) => t.split(" ").pop().split("->")));
  const final = (v) => { let n = 0; while (swap[v] && n++ < 5) v = swap[v]; return v; };
  const deep = (v) => (typeof v === "string" && swap[v] ? final(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  for (const k of ["motifs", "creatures", "biome"]) data[k] = deep(data[k]);
}
data.palette.measured = measured.map((m, i) => ({ ...m, role: data.palette.measured?.[i]?.role || "" }));
const brief = {
  source: { art: path.relative(root, path.resolve(art)), width: meta.width, height: meta.height, model, date: new Date().toISOString().slice(0, 10) },
  mood: data.mood, observations: data.observations, palette: data.palette, motifs: data.motifs, creatures: data.creatures, composition: { legend: CODES, ...data.composition }, biome: data.biome,
};
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(brief, null, 2) + "\n");
console.log(`${out}: ${brief.motifs.length} motifs, ${brief.creatures.length} creatures, model ${model}`);
console.log(brief.composition.grid.join("\n"));
