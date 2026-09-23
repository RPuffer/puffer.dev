import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { askJSON, imagePart, spend } from "./vision.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = opt("--out");
const style = opt("--style") || path.join(root, "ref/reference.png");
const annotate = opt("--annotate");
const votes = Math.max(1, +(opt("--votes") || 3));
const render = args[0];
if (!render) { console.error("usage: node pipeline/critic.mjs <render.png> [--out report.json] [--style ref/reference.png] [--annotate out.png] [--votes 3]"); process.exit(2); }

const meta = await sharp(render).metadata();
const W = meta.width, H = meta.height;
const SEV = ["high", "medium", "low"];

const prompt = `You are the QA critic for a cute isometric low-poly game level.

IMAGE 1 is the render under review. IMAGE 2 is the style target: the asset pack the level must look like. Everything IMAGE 2 does is correct by definition, including: a flat dark background; blocks cropped by the frame; small unreachable decorative islets; stacked terraces with tall cliff sides; waterfalls pouring from an upper pool; a LOG BRIDGE drawn as a sagging row of separate logs with gaps between them and pale ropes hanging down from it; a timber TOWER (scaffold) standing in the lower pool or on rocks under the end of that bridge; a rope ladder hanging down a cliff; coins floating a little above the ground next to short fence posts; flat bright colours. None of these are defects. The render may use new props and a different palette than IMAGE 2; judge those against the pack's grammar, not against IMAGE 2's exact content.

Work in two passes.
PASS 1, inventory: list every prop taller than a flower (each tree, rock, barrel, well, stump, bush, figure, tower, lantern...). For each, look at the exact pixels where its trunk, legs, or bottom meet something and say what that is. A prop is grounded only if its base sits on the TOP face of a land block (or a tower in a pool, a waterfall at a cliff, a ladder on a cliff, as in IMAGE 2). A base drawn in front of a cliff SIDE face, over the dark background, or over a lower terrace than the block it seems to belong to means it is floating. A base on water, on a bridge deck, or on a stair is the wrong surface. Two props whose silhouettes merge into one (a rock inside a tree canopy, a trunk through another prop) are interpenetrating.
PASS 2, defects: report real defects only, using this rubric:
1. Floating props: a tree, rock, barrel, or other prop whose base does not touch a land top (hovering in the air, hanging past a cliff edge over empty space or lower ground). Coins, stars, and hearts are meant to float.
2. Sunken or wrong-surface props: a prop standing in water, on a bridge deck, on a ramp or stair, or half buried in a block.
3. Interpenetrating geometry: two props occupying the same spot, a prop cutting through another prop, a trunk passing through a canopy that is not its own, a prop poking through terrain.
4. Scale mismatches: a prop far too big or too small next to the tiles and the other props.
5. Off-grid placement: tiles or props visibly misaligned with the isometric grid.
6. Style breaks: smooth or glossy shading, gradients, outlines, photoreal or noisy texture, blur, anything that is not flat-coloured three-tone faces.
7. Palette clashes: a colour that fights the rest of the level or is garish against it.
8. Layout nonsense: a main walkable area cut off from the rest, a bridge to nowhere, a path ending in a wall, water pouring from nothing.
9. Anything else a player would call broken or unnatural.

Severity: "high" = a player would notice at once and call it a bug; every rule 1, 2, or 3 defect is high (a prop hovering, a barrel or tree standing on water or on a bridge, two props fused together). "medium" = noticeable on a second look. "low" = a nitpick. Do not pad the list: a clean render gets an empty list. Do not report the frame crop, the background colour, or things IMAGE 2 also does.

Return ONLY JSON: {"inventory": [{"prop": short name, "box_2d": [ymin, xmin, ymax, xmax] normalized 0 to 1000, "rests_on": "block top"|"cliff side or air"|"water"|"bridge"|"stair"|"another prop"|"by design (as in IMAGE 2)"}], "items": [{"issue": one sentence naming the object and the fault, "rule": the rubric number 1 to 9, "in_style_image": true if IMAGE 2 shows the same kind of object drawn the same way (for example the log bridge, the tower, the pools, the ladder), else false, "severity": "high"|"medium"|"low", "box_2d": [ymin, xmin, ymax, xmax] around the faulty object in IMAGE 1, normalized 0 to 1000, "fix_hint": one imperative sentence}], "verdict": one line}.`;

const validate = (d) => {
  const errs = [];
  if (!Array.isArray(d.items)) errs.push("items must be an array");
  if (!Array.isArray(d.inventory)) errs.push("inventory must be an array");
  if (typeof d.verdict !== "string") errs.push("verdict must be a string");
  (d.items || []).forEach((it, i) => {
    if (typeof it.issue !== "string") errs.push(`items[${i}].issue`);
    if (!SEV.includes(it.severity)) errs.push(`items[${i}].severity must be high|medium|low`);
    if (!Array.isArray(it.box_2d) || it.box_2d.length !== 4 || !it.box_2d.every((n) => typeof n === "number")) errs.push(`items[${i}].box_2d must be 4 numbers`);
    if (typeof it.fix_hint !== "string") errs.push(`items[${i}].fix_hint`);
    if (!(+it.rule >= 1 && +it.rule <= 9)) errs.push(`items[${i}].rule must be 1..9`);
  });
  return errs;
};

const parts = [{ text: "IMAGE 1, the render under review:" }, await imagePart(render, 1024, true), { text: "IMAGE 2, the style target:" }, await imagePart(style, 1024, true), { text: prompt }];
const runs = await Promise.all(Array.from({ length: votes }, () => askJSON(parts, validate, { temperature: votes > 1 ? 0.4 : 0 })));
const model = runs[0].model;
const clamp = (v, m) => Math.max(0, Math.min(m, Math.round(v)));
const toBox = ([y0, x0, y1, x1]) => [clamp((Math.min(x0, x1) / 1000) * W, W), clamp((Math.min(y0, y1) / 1000) * H, H), clamp((Math.max(x0, x1) / 1000) * W, W), clamp((Math.max(y0, y1) / 1000) * H, H)];
const FLOOR = new Set([1, 2, 3]);
const dropped = [];
const cand = runs.flatMap(({ data }, run) => data.items.filter((it) => {
  if (it.in_style_image === true) { dropped.push(it.issue); return false; }
  return true;
}).map((it) => ({ run, issue: it.issue, rule: +it.rule || null, severity: FLOOR.has(+it.rule) ? "high" : it.severity, box: toBox(it.box_2d), fix_hint: it.fix_hint })));
const iou = (a, b) => {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy;
  return u > 0 ? (ix * iy) / u : 0;
};
const inside = (a, b) => { const cx = (a[0] + a[2]) / 2, cy = (a[1] + a[3]) / 2; return cx >= b[0] && cx <= b[2] && cy >= b[1] && cy <= b[3]; };
const clusters = [];
for (const c of cand) {
  const hit = clusters.find((k) => !k.some((m) => m.run === c.run) && k.some((m) => iou(m.box, c.box) >= 0.25 || (inside(m.box, c.box) && inside(c.box, m.box))));
  if (hit) hit.push(c); else clusters.push([c]);
}
const need = Math.ceil(votes / 2);
const rank = (sv) => SEV.indexOf(sv);
const items = clusters.filter((k) => k.length >= need).map((k) => {
  const counts = SEV.map((sv) => k.filter((m) => m.severity === sv).length);
  const severity = SEV[counts.indexOf(Math.max(...counts))];
  const rep = [...k].sort((a, b) => rank(a.severity) - rank(b.severity))[0];
  const med = (i) => { const v = k.map((m) => m.box[i]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  return { issue: rep.issue, rule: rep.rule, severity, support: `${k.length}/${votes}`, box: [0, 1, 2, 3].map(med), fix_hint: rep.fix_hint };
}).sort((a, b) => rank(a.severity) - rank(b.severity));
const minority = clusters.filter((k) => k.length < need).map((k) => ({ issue: k[0].issue, severity: k[0].severity, support: `${k.length}/${votes}`, box: k[0].box }));
const high = items.filter((i) => i.severity === "high").length;
const verdict = high ? `${high} high-severity fault${high > 1 ? "s" : ""} agreed by ${need}+ of ${votes} passes: ${items.filter((i) => i.severity === "high").map((i) => i.issue.replace(/\.$/, "")).join("; ")}.` : items.length ? `No agreed high-severity faults; ${items.length} lesser item${items.length > 1 ? "s" : ""}.` : "Clean: no fault agreed by a majority of passes.";
const inventory = (runs[0].data.inventory || []).map(({ box_2d, ...v }) => ({ ...v, box: Array.isArray(box_2d) && box_2d.length === 4 ? toBox(box_2d) : null }));
const report = { render: path.relative(root, path.resolve(render)), size: [W, H], model, style: path.relative(root, path.resolve(style)), verdict, votes, high, items, minority, dropped, inventory };

if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n"); }

if (annotate) {
  const colour = { high: "#ff2d55", medium: "#ffb31d", low: "#4fc3ff" };
  const k = Math.max(1, Math.round(Math.max(W, H) / 500));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${items.map((it, i) => {
    const [x0, y0, x1, y1] = it.box, c = colour[it.severity], fs = 11 * k;
    return `<rect x="${x0}" y="${y0}" width="${Math.max(1, x1 - x0)}" height="${Math.max(1, y1 - y0)}" fill="none" stroke="${c}" stroke-width="${2 * k}"/><rect x="${x0}" y="${Math.max(0, y0 - fs - 3 * k)}" width="${fs * 1.4}" height="${fs + 3 * k}" fill="${c}"/><text x="${x0 + 2 * k}" y="${Math.max(fs, y0 - 2 * k)}" font-family="Helvetica, Arial" font-weight="bold" font-size="${fs}" fill="#000">${esc(String(i + 1))}</text>`;
  }).join("")}</svg>`;
  fs.mkdirSync(path.dirname(path.resolve(annotate)), { recursive: true });
  await sharp(render).composite([{ input: Buffer.from(svg) }]).png().toFile(annotate);
}

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(`${report.render} ${W}x${H} ${model}`);
console.log(`${pad("#", 3)} ${pad("sev", 6)} ${pad("vote", 5)} ${pad("box", 20)} issue / fix`);
items.forEach((it, i) => console.log(`${pad(i + 1, 3)} ${pad(it.severity, 6)} ${pad(it.support, 5)} ${pad(it.box.join(","), 20)} ${it.issue}\n${" ".repeat(38)}fix: ${it.fix_hint}`));
if (dropped.length) console.log(`dropped as drawn the same in the style image: ${dropped.length}`);
if (minority.length) console.log(`minority items (below ${need}/${votes} votes, not counted): ${minority.length}`);
console.log(`verdict: ${verdict}`);
console.log(`${high ? "FAIL" : "PASS"}: ${high} high, ${items.length - high} other`);
console.error(`spend: ${spend.calls} calls, ${spend.inTok} in / ${spend.outTok} out tokens, ~$${spend.usd.toFixed(4)}`);
process.exitCode = high ? 1 : 0;
