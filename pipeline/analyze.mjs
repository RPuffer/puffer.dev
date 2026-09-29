import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CATALOG, PALETTE } from "../core/catalog.js";
import { PALETTE as PAL3D } from "../3d/palette.js";
import { askJSON, imagePart, spend } from "./vision.mjs";
import { SHAPERS, SHAPER_NAMES } from "./a-transcribe/shapers.mjs";

const argv = process.argv.slice(2);
const flagIdx = new Set();
const flag = (k, d) => { const i = argv.indexOf(k); if (i < 0) return d; flagIdx.add(i).add(i + 1); return argv[i + 1]; };
const deepMode = argv.includes("--deep");
if (deepMode) flagIdx.add(argv.indexOf("--deep"));
const lensName = flag("--lens", null);
const analysisArg = flag("--analysis", null);
const conceptName = lensName ? `lens-${lensName}` : flag("--concept", "scene");
const variant = +flag("--variant", 0) || 0;
const avoidList = String(flag("--avoid", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const positional = argv.filter((a, i) => !flagIdx.has(i));
const art = positional[0];
const slug = art ? path.basename(art).replace(/\.[^.]+$/, "") : "";
const out = positional[1] || (deepMode ? `pipeline/seed/analysis/${slug}.json` : lensName ? `pipeline/seed/concepts/${slug}-${lensName}.json` : variant ? `pipeline/seed/concepts/${slug}-${variant}.json` : `pipeline/seed/concepts/${conceptName}.json`);
if (!art) { console.error("usage: node pipeline/analyze.mjs <art.png> [brief.json] [--concept scene|literal|pack-first|biome|motif-remap|composition-only] [--variant 1|2|3] [--avoid a.json,b.json]\n       node pipeline/analyze.mjs --deep <art.png> [analysis.json]\n       node pipeline/analyze.mjs --lens medium|subject|composition --analysis <analysis.json> <art.png> [brief.json] [--avoid a.json,b.json]"); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REF = path.join(root, "ref/reference.png");
const SHEET = path.join(root, "ref/tilesheet.png");
const CODES = { G: "ground", R: "raised ground (plateau, one or more blocks above G)", W: "water", V: "void (no land, background shows)", T: "vegetation (trees, bushes, roots)", F: "the figure or focal creature", P: "path" };
const DIMS = { box: 3, rbox: 4, cyl: 3, cone: 4, ball: 2, prism: 1, beam: 1 };
const PRIMS = Object.keys(DIMS);
const HEX = /^#[0-9a-f]{6}$/i;
const K = 8;

const CONCEPTS = {
  literal: `Translate IMAGE 1 literally: its mood, its objects where it draws them, its composition. Palette for a dark forest: dusk and moss greens, cooled ochre sand, deep teal water, a dark blue-grey background. Motifs are the drawing's own shapes, mostly "new". surfaces: {"ground":"grass","raised":"grass","path":"dirt","shore":"grass","mist":null}.`,
  "pack-first": `Start from the pack, not the drawing. The level is a standard bright daytime pack island like IMAGE 2; IMAGE 1 contributes only a handful of its signature shapes as props.
- mood: the pack's sunny toy mood first (bright, cheerful words), then one or two words of the drawing's hush.
- palette.translation: copy CURRENT PACK PALETTE almost verbatim; move any group at most 10% in value or hue toward IMAGE 1. bg and biome.lighting.bg a neutral dark grey like #3b3d42. lighting: daylight, ambient 0.9 to 1.0, sun 0.1 to 0.2, tint a pale warm white.
- motifs: 6 to 8. At most 4 are "new" and they are only the drawing's signature shapes: a chunky bare trunk, a low mist wisp, a root tangle, a fallen log. Each new motif has count 1 to 3 and all new-motif counts together total at most 8. Every other motif reuses a catalog type as it is (type set to tree-pine, tree-round, bush, bush-cluster, flower, rock, mushroom, stump, coin...), named after what it stands for in the drawing, with counts that make a lively pack island. The fire-bird is the only creature ("becomes":"npc") and keeps the pack's flame colours.
- composition: a pack island in IMAGE 1's layout: a grass plateau tier (R, heights 2 and some 3) where IMAGE 1's trunks mass, an open grass and sand floor at height 1 where IMAGE 1 is open ground, one pale dirt path (P) from the near rim to the bird's feet, V on a ragged rim so the island stays irregular. Keep the focal cell where IMAGE 1's bird stands. No water unless a small pool fits the open floor.
- biome: trees.density 0.12 to 0.2, types tree-pine and tree-round (weights about even) plus the bare trunk at weight 0.2 at most; decor_weights over flower, bush, rock, mushroom, coin, gem (and the new motifs at small weights); decor_density 0.12 to 0.18; plateau_share 0.25 to 0.35; water_share 0 to 0.05; surfaces {"ground":"grass","raised":"grass","path":"dirt","shore":"sand","mist":null}. Rules keep new props few and the island bright.`,
  scene: `Read IMAGE 1 as a place in a souls-like game with a story. IMAGE 1 is usually a creature portrait with no environment: invent the place the creature belongs to. This overrides the rules above that tie the grid and motifs to what IMAGE 1 draws: "observations" still describe IMAGE 1 honestly (the creature, its colours, its marks, its expression), but their maps_to, the grid, the motifs and the biome describe the invented place. Draw the place's motifs from the creature: its colours, markings, textures, attributes and the world it implies. Props and layout serve the scene.
- The scene grammar: an approach path (P) that starts at the near rim (row 10 or 11), passes a threshold about halfway (a gate, arch, pair of pillars or pair of tall props straddling the path), and arrives at the focal point where the creature waits as a still figure. The creature stands on 2 to 4 F cells, near the middle or far half of the grid, never on the rim.
- palette.translation: every group keeps the pack's saturation (top tones HSL saturation 45% or more, lightness 45 to 75%) and its hue family; IMAGE 1's own hues enter through the tree groups, flowers, gold, berry and wood accents and the lighting tint, never by greying the pack. bg and lighting.bg a dark hex that sets off the level. lighting: ambient 0.6 to 0.95, sun 0.1 to 0.4.
- creatures: the first creature is IMAGE 1's creature ("becomes":"npc", "type":"new"), at the focal cell, facing "s". Build it as a still toy figure from 8 to 14 stacked flat blocks and wedges: box and rbox for body, head, legs, paws, tail segments; prism outlines for ears, wedges, beaks, fins, flames; at most one or two small balls for eyes. Height 1.5 to 3.0 tiles depending on the subject. It faces +z (the cell's front, "s"), its head turned slightly so the camera reads it three-quarter. Its tones are IMAGE 1's creature colours pushed to the pack's flat saturated grammar. Its "pose" says what it is doing, still, in this scene. Add a secondary creature only if the scene calls for one.
- motifs: 6 to 8, in scene order: the threshold (new or a catalog pair), the dais, perch, nest or altar under the creature (new), story props next to the focal point (catalog pot, chest, barrel, gem, coin, crate, well, or new), lights along the approach in pairs on both sides of the path (catalog torch or lantern, 4 to 6 total), enclosing masses on the far and side edges (catalog trees or a new shape drawn from the creature), and ground detail. At most 4 motifs are "new"; every new motif is built from flat blocks and wedges like the creature. Place cells so the scene reads: lights in pairs along the path, story props on the clearing beside the focal cell, the threshold straddling the path.
- composition: V on a ragged rim with void on every side; heights 1 to 3; the grid, heights and focal describe the invented place in plan, row 0 far, row 11 near.
- biome: decor_weights over the scene's props; decor_density 0.08 to 0.14; trees.density 0.1 to 0.3 of catalog trees or the enclosing new motif; surfaces from grass|sand|dirt|stone. Rules describe the approach, threshold, focal order.
- "scene": {"place": one sentence naming the place, "approach": one sentence on how the hero arrives and what the threshold is, "creature_doing": one sentence on what the creature is doing, "palette_key": one sentence naming the palette translation and light, "terrain": one sentence naming the terrain emphasis, "summary": one sentence that sums up the reading}.`,
  biome: `Read IMAGE 1 as a biome, a dark pine forest with a still pool, and build it from the pack's existing pieces at the drawing's density. The fire-bird is the only new prop.
- mood: dense, dim, still, damp words.
- palette.translation: dusk pine forest: treeMint and treeTeal and treeLeaf deep cool greens (still saturated), grass a moss green, water a deep teal, sand a cooled ochre, bg and lighting.bg a dark blue-green grey. lighting: ambient 0.65 to 0.8, sun 0.2 to 0.35, tint a cool green-blue.
- motifs: 5 to 7, every one a catalog type (never "new"): the drawing's tall trunks become tree-pine (count 8 to 14), fallen trunks become log, roots and ground clutter become mushroom, rock, rock-big, stump, bush; the pool's drop becomes waterfall (count 1). Name each after what it stands for in the drawing. The fire-bird is the only creature and the only new shape.
- composition: add a still pool: 8 to 14 W cells in one blob in the open lower-left foreground of IMAGE 1 (where its dark ground pools), touching the rim so it can spill into the void; the ground right behind the pool is raised one tier (R, height 2) so a waterfall can drop into it. Dense T on the far rows and both sides at heights 1 and 2; the bird on open ground near the pool at the focal cell; a thin dirt path (P) from the near rim to the bird.
- biome: trees.density 0.35 to 0.5, types tree-pine weight 0.8 or more plus tree-round; decor_weights mushroom, rock, rock-big, stump, log, bush, waterfall; decor_density 0.15 to 0.22; water_share 0.06 to 0.1; plateau_share 0.15 to 0.25; surfaces {"ground":"grass","raised":"grass","path":"dirt","shore":"sand","mist":null}.`,
  "motif-remap": `Map IMAGE 1's shapes and tones onto pack pieces by likeness, not by object. Ask of every stroke "which pack piece looks like this?", never "what is this?".
- The flame strokes of the bird and its tail become tree-orange trees (orange canopies) and ember gems (catalog gem) scattered on the ground around it.
- The swirling ground strokes become a spiral path: one continuous coil of P cells, one cell wide, each P cell 4-adjacent to the next, entering at the near rim (row 10 or 11), then circling the focal cell at a distance of 2 to 4 cells for at least three quarters of a turn before it reaches the bird. Terraces step up along the coil: the outer ring of the coil at height 1, the middle at 2, the ring touching the focal cell at 3, so the spiral climbs to the bird. Keep V on a ragged outer rim.
- The pale mist becomes pale sand: surfaces.mist "sand" and surfaces.ground "sand" on the open floor; grass only on the terraces.
- The dark vertical trunks become tree-pine in its darkest variant and stumps.
- mood: warm, swirling, glowing, ember words.
- palette.translation: warm ember dusk: sand pale cream-ochre, grass an olive green, wood and treeGold hot orange and amber, water a teal, bg and lighting.bg a dark warm brown-grey. lighting: ambient 0.75 to 0.85, sun 0.2 to 0.3, tint amber.
- motifs: 5 to 7, every one a catalog type (tree-orange, gem, tree-pine, stump, rock, flower in flowerOrange), none "new"; name each after the stroke it stands for. The fire-bird is the only creature.
- biome: trees.density 0.15 to 0.25, types tree-orange weight 0.6 or more plus tree-pine; decor_weights gem, flower, rock, stump, coin; decor_density 0.12 to 0.18; plateau_share 0.35 to 0.5; water_share 0; surfaces {"ground":"sand","raised":"grass","path":"dirt","shore":"sand","mist":"sand"}.`,
  "composition-only": `Take only IMAGE 1's masses, void, and focal point for the layout. Ignore its colours, objects, and mood: the palette and decor are the plain pack of IMAGE 2.
- mood: the pack's own mood words (bright, toy, sunny, cosy), none from the drawing.
- palette.translation: CURRENT PACK PALETTE verbatim, every hex unchanged. bg and lighting.bg "#404040". lighting ambient 1, sun 0, tint "#ffffff".
- composition: heavy dark masses of IMAGE 1 become raised land (R, heights 2 and, at their darkest core, 3), light open areas become open ground (G, height 1), and the palest edges and corners become V so the island is irregular with void on every side (row 0, row 11, column 0 and column 15 are mostly V). Trace IMAGE 1's real, asymmetric masses: where its dark trunk mass is heavier on one side, the raised land is heavier on that side; never mirror left and right or frame the island with a symmetric ring. The bird's position is the focal F. A plain dirt path (P) from the near rim to the focal cell.
- motifs: 5 to 7, every one a catalog type in the reference island's mix (tree-pine, tree-round, bush, bush-cluster, flower, rock, mushroom, fence, barrel, coin), none "new", named plainly after the piece; cells follow the masses (trees on the raised masses, flowers and bushes on open ground). The fire-bird is the only creature, in flame colours, standing at the focal cell.
- biome: trees.density 0.2 to 0.3, types tree-pine and tree-round; decor_weights over the reference mix; decor_density 0.15 to 0.2; plateau_share 0.3 to 0.4; water_share 0 to 0.06; surfaces {"ground":"sand","raised":"grass","path":"dirt","shore":"sand","mist":null}.`,
};
const STOCK = `FORBIDDEN, because round 3 collapsed every artwork into them: a sunny garden or grass terrace home climbing to a perch; a shrine or temple court behind a still pool crossed on a causeway; a flat arena or caldera ringed by tall cliffs. Also forbidden as lighting: stock times of day (midday sun, golden hour, dusk, sunset, twilight, night, moonlight, dawn). Light is argued from the piece's own value structure and medium (paper white showing through ink, the black ground of an airbrush, the flat unshaded blaze of fauvist colour, graphite's grey haze), and named as that, not as a clock time.`;
const LENSES = {
  medium: `LENS "medium": the artwork's MATERIAL AND MARKS become the island's physical character. Start from ANALYSIS.medium and ANALYSIS.palette, not from the subject. The ground is made of the marks: single-stroke ink becomes ribbon land and sweeping arcs of path with void where the paper is empty (shaper "ribbon", or "spiral" for a curl); airbrush gradients become soft radial terraces fading outward (shaper "radial"); fauvist or knife strokes become a patchwork of flat colour blocks at different heights (shaper "patchwork"); charcoal smudge becomes soft-edged dark masses with pale mist lying in the hollows (shaper "mound" or "basin"); pencil hatching or scratchy ink becomes angular slabs split by thin seams (shaper "shards"); vector doodles become dense small ornament on a tidy mirrored plan (shaper "symmetric"). Choose shaper params from the marks themselves (how many strokes, how wide, which way they sweep, how many blocks). Palette, surface_mix and cliff_treatment follow the medium (ink: paper-pale sand and ink-dark cliffs; airbrush: rings of surfaces fading by value; fauvist: saturated patches; charcoal: soft grey-green, mossy or soft cliffs). New props are the marks made solid: a brush flick as a curved blade of stone, a smudge as a low soft boulder, a doodle as a ring of beads, a knife stroke as a flat tilted slab. The figure's pose comes from how it is drawn (a single continuous stroke, a stack of colour patches), and it may be a monument of the marks rather than a living creature.`,
  subject: `LENS "subject": the SUBJECT'S NATURE AND STORY become the place. Start from ANALYSIS.subject and ANALYSIS.story. Ask where this creature or figure actually lives or would be found in its own world, what it builds, eats, guards, leaves behind, what is broken or abandoned there, and what a visitor would pass on the way in (its tracks, its leftovers, its kin, the things that fear it). The place is specific to this species or character, not a generic shrine: a swallow's mud-cup colony under a barn eave, an eagle's aerie on a sea stack, a wizard's cluttered cookhouse. Pick the shaper that fits that habitat (for example "twin-mass" for a nest facing its hunting ground, "basin" for a den hollow, "mound" for a burrow hill, "shards" for a broken ruin, "spiral" for a tower climb) and argue it in "why". The figure's pose and the props come from what the subject is DOING in the piece (ANALYSIS.subject.doing), shown as that action frozen, not seated on a plinth. Props are the subject's world: its nest material, prey, tools, trail, the structures it uses. Palette and light come from that world's own materials and the subject's own colours (river silt and wet stone, sea spray and guano, soot and copper pots), not from the paper or canvas the piece is made on.`,
  composition: `LENS "composition": the drawing's STRUCTURE becomes the terrain literally. Start from ANALYSIS.composition. The main mass becomes the highest land, placed where it sits in the frame; the flow lines become the path and the ridges, running the same way; the negative space becomes void (bays and gaps cut into the island) or open ground; symmetry or its absence decides "symmetric" versus an asymmetric shaper; scale cues decide how big the figure stands against the land. Choose the shaper and its params as a transcription: peak, center, from, ratio, split, turns and hand must be read off the frame positions in the analysis (x left to right 0..1, z top to bottom 0..1). Map picture to plan this way: the top of the frame is the far rim (row 0), the bottom is the near rim (row 11). Lighting follows ANALYSIS.palette.value_structure: where the lights and darks fall becomes where sun and shadow fall, and a high-key or low-key picture sets ambient. The figure stands at the focal point and its pose repeats the drawing's main gesture line. Palette follows the value map: the surfaces are ranked by value as the picture's areas are (the emptiest area becomes the palest surface, the densest the darkest), with the piece's accent hue kept for the focal point and its threshold. Props mark the structure: posts along a flow line, a gap where the negative space opens, a counterweight at the second mass.`,
};
const LENS_KEYS = () => `

"lens": {"aspect": which parts of ANALYSIS this reading uses, "place": one sentence naming the place (never a garden terrace, water shrine or arena), "summary": one sentence, "differs": one sentence on how this place differs from the other readings listed below}.
"shaper": {"name": one of ${SHAPER_NAMES.join("|")}, "params": the shaper's params object, "why": one sentence tying the shape to ANALYSIS}. Shapers and params: ${SHAPER_NAMES.map((n) => `${n} (${SHAPERS[n].params}; reads as ${SHAPERS[n].reads})`).join("; ")}. The shaper replaces your composition.grid's outline and heights: keep grid and heights honest, but the builder takes the land shape from the shaper and moves motif cells to the nearest land.
"surface_mix": {"pattern": one of rings|bands|patches|scatter|height|shaper|uniform, "period": 1.5 to 4 cells for rings and bands, "surfaces": 2 to 4 items {"s": grass|sand|dirt|stone, "share": 0 to 1}, "why": one sentence}. Stone reads as cobble pads and is capped at 0.2 share; never use stone as the main surface.
"cliff_treatment": {"style": one of banded|sheer|stepped|mossy|soft, "upper": [left, right, seam] hexes for cliffs above the floor, "lower": [left, right, seam] hexes for the floor's cliffs, "why": one sentence}. banded: upper and lower clearly different hues; sheer: dark cliffs and bare tops; stepped: every rise one block; mossy: green-tinged cliffs under grass; soft: pale low-contrast cliffs. Cliff hexes keep the pack's saturation (HSL s 0.3 or more, l 0.25 to 0.7).
"lighting": {"time": a short phrase naming the light as the piece makes it, never a stock time of day, "ambient": 0.55 to 1, "sun": 0 to 0.5, "tint": hex, "bg": hex, "why": one sentence citing ANALYSIS.palette.value_structure}.
"figure_pose": {"pose": one sentence a modeller can build, "action": 1 to 3 words, "facing": left|right|camera|away, "why": one sentence citing ANALYSIS.subject or ANALYSIS.composition}.
"approach": {"from": where on the rim the visitor starts, "passes": 3 to 5 things passed in order, each named after a motif or a terrain feature, "shape": one sentence}.
"threshold": {"kind": one sentence naming what marks the crossing into the figure's space (argued from this reading, not a default gate), "prop": the motif name that is the threshold}.
Every motif also carries "role": one of threshold|dais|light|offering|mass|detail|approach. At least 3 motifs are "new" and at least 2 of those are shapes no other reading of this artwork uses.`;
const LENS_PROMPT = () => `${LENSES[lensName]}

${STOCK}

ANALYSIS of IMAGE 1 (a separate close reading; ground every choice in it and quote its specifics):
${JSON.stringify(analysis, null, 1)}
${lensAvoid.length ? `
OTHER READINGS OF THIS ARTWORK ALREADY MADE. Yours must be a different place: a different shaper name, a different surface_mix pattern, a different cliff style, a different light, a different threshold, different new props:
${lensAvoid.map((b) => `- ${b.concept?.lens}: ${b.lens?.place} Shaper ${b.shaper?.name} ${JSON.stringify(b.shaper?.params)}; surfaces ${b.surface_mix?.pattern}; cliff ${b.cliff_treatment?.style}; light "${b.lighting?.time}"; threshold ${b.threshold?.kind}; props ${(b.motifs || []).filter((m) => m.type === "new").map((m) => m.name).join(", ")}.`).join("\n")}` : ""}

Each reading must also look different from the others at a glance: a different dominant surface (the largest share in surface_mix), a different background hue family, and a different light.

The rest of the brief (palette.translation, motifs, creatures, composition, biome) serves this reading. Keep the pack: saturated three-tone palette, chunky stacked-block props, the figure as a still toy figure 1.5 to 3 tiles tall. biome.surfaces is the fallback before surface_mix applies. biome.lighting may repeat "lighting".`;
const lensFixes = [];
const STOCK_TIME = /\b(mid-?day|noon|golden hour|dusk|sunset|twilight|night|moonli(t|ght)|dawn|sunrise)\b/i;
const STOCK_PLACE = /\b(shrine|arena|caldera|causeway|temple)\b/i;
function validateLens(b) {
  const e = [];
  lensFixes.length = 0;
  const sh = b.shaper || {};
  if (!SHAPER_NAMES.includes(sh.name)) e.push(`shaper.name must be one of ${SHAPER_NAMES.join("|")}`);
  if (!sh.params || typeof sh.params !== "object") e.push("shaper.params must be an object");
  if (lensAvoid.some((o) => o.shaper?.name === sh.name)) e.push(`shaper.name ${sh.name} is already used by another reading of this artwork; pick a different shaper`);
  const sm = b.surface_mix || {};
  if (!["rings", "bands", "patches", "scatter", "height", "shaper", "uniform"].includes(sm.pattern)) e.push("surface_mix.pattern bad");
  if (!Array.isArray(sm.surfaces) || !sm.surfaces.length || !sm.surfaces.every((x) => ["grass", "sand", "dirt", "stone"].includes(x?.s) && typeof x.share === "number")) e.push("surface_mix.surfaces needs [{s, share}]");
  else { const t = sm.surfaces.reduce((a, x) => a + x.share, 0) || 1; for (const x of sm.surfaces) x.share = +(x.share / t).toFixed(3); const st = sm.surfaces.find((x) => x.s === "stone"); if (st && st.share > 0.2) { const rest = sm.surfaces.filter((x) => x !== st); const spare = st.share - 0.2; st.share = 0.2; if (rest.length) rest.forEach((x) => (x.share = +(x.share + spare / rest.length).toFixed(3))); else sm.surfaces.push({ s: "grass", share: +spare.toFixed(3) }); } }
  const ct = b.cliff_treatment || {};
  if (!["banded", "sheer", "stepped", "mossy", "soft"].includes(ct.style)) e.push("cliff_treatment.style bad");
  for (const k of ["upper", "lower"]) if (!Array.isArray(ct[k]) || ct[k].length !== 3 || !ct[k].every((h) => HEX.test(h))) e.push(`cliff_treatment.${k} needs 3 hexes`);
  const li = b.lighting || {};
  if (typeof li.time !== "string" || !li.time) e.push("lighting.time missing");
  else if (STOCK_TIME.test(li.time)) e.push(`lighting.time "${li.time}" is a stock time of day; name the light the piece makes instead`);
  for (const k of ["ambient", "sun"]) if (typeof li[k] !== "number") e.push(`lighting.${k} not number`);
  for (const k of ["tint", "bg"]) if (!HEX.test(li[k] || "")) e.push(`lighting.${k} not hex`);
  if (!b.figure_pose?.pose || !b.figure_pose?.action) e.push("figure_pose.pose/action missing");
  if (!Array.isArray(b.approach?.passes) || b.approach.passes.length < 3) e.push("approach.passes needs 3+ items");
  if (!b.threshold?.kind || !b.threshold?.prop) e.push("threshold.kind/prop missing");
  else if (!(b.motifs || []).some((m) => m.name === b.threshold.prop)) e.push(`threshold.prop ${b.threshold.prop} is not a motif name`);
  if (!b.lens?.place || !b.lens?.summary) e.push("lens.place/summary missing");
  else if (STOCK_PLACE.test(b.lens.place)) e.push(`lens.place "${b.lens.place}" names a stock place (shrine, arena, caldera, causeway, temple); invent the place this lens implies`);
  const dom = (m) => [...(m?.surfaces || [])].sort((a, c) => c.share - a.share)[0]?.s;
  const hue = (h) => { if (!HEX.test(h || "")) return null; const [r, g, bb] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), d = mx - mn; if (d < 0.04) return { h: null, l: (mx + mn) / 2 }; const hh = mx === r ? ((g - bb) / d + 6) % 6 : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4; return { h: hh * 60, l: (mx + mn) / 2 }; };
  const taken = new Set(lensAvoid.map((o) => dom(o.surface_mix)).filter(Boolean));
  if (Array.isArray(sm.surfaces) && sm.surfaces.length && taken.has(dom(sm))) {
    const free = ["grass", "sand", "dirt"].filter((x) => !taken.has(x));
    const top = [...sm.surfaces].sort((a, c) => c.share - a.share)[0];
    const alt = sm.surfaces.find((x) => free.includes(x.s));
    if (alt) { const t = top.share; top.share = alt.share; alt.share = t; }
    else if (free.length) top.s = free[0];
    lensFixes.push(`surface_mix led with ${dom(sm)} after a sibling took ${[...taken].join("/")}`);
  }
  const clash = (bg) => lensAvoid.some((o) => { const a = hue(bg), c = hue(o.lighting?.bg); return a && c && Math.abs(a.l - c.l) < 0.06 && (a.h === null || c.h === null || Math.min(Math.abs(a.h - c.h), 360 - Math.abs(a.h - c.h)) < 35); });
  if (HEX.test(li.bg || "") && clash(li.bg)) {
    const [hh, ss, ll] = toHsl(li.bg);
    for (const [dh, dl] of [[60, 0], [-60, 0], [120, 0.04], [180, 0], [0, 0.1]]) { const nb = fromHsl(((hh ?? 220) + dh + 360) % 360, Math.max(0.25, ss), Math.min(0.4, ll + dl)); if (!clash(nb)) { lensFixes.push(`lighting.bg ${li.bg}->${nb}`); li.bg = nb; break; } }
  }
  const newM = (b.motifs || []).filter((m) => m.type === "new");
  if (newM.length < 3) e.push("at least 3 motifs must be new");
  const used = new Set(lensAvoid.flatMap((o) => (o.motifs || []).map((m) => m.name)));
  if (newM.filter((m) => !used.has(m.name)).length < 2) e.push("at least 2 new motifs must not appear in other readings");
  for (const [i, m] of (b.motifs || []).entries()) if (!["threshold", "dais", "light", "offering", "mass", "detail", "approach"].includes(m.role)) e.push(`motifs[${i}].role bad`);
  return e;
}

const DEEP_GENERIC = /\b(evocative|captures the essence|showcases|a sense of|striking|masterful|beautifully|stunning|dynamic composition)\b/i;
async function runDeep() {
  const prompt = `You are a painter and printmaker giving a close reading of one artwork (IMAGE 1) for a game designer who will never see it. Everything you write must be true of THIS piece and false of a generic picture of the same subject: name positions in the frame (upper-left third, lower edge, centre-right), counts (three strokes, twelve lashes), directions (sweeps up and right), widths, textures, and what the tool physically did (the pen lifted, the brush dragged dry, the airbrush sprayed a soft halo). No praise words (evocative, striking, captures, showcases, dynamic, beautifully).

MEASURED PALETTE (k-means over pixels, share of area): ${JSON.stringify(measured)}.

Return ONE JSON object with exactly these keys:
"medium": {"technique": the medium and tool as exactly as you can tell (ballpoint pen, acrylic with palette knife, airbrush on black board, graphite pencil, charcoal, marker, vector), "marks": 4 to 6 items, each one sentence describing a specific kind of mark, where it is and how it was made (e.g. "one unbroken pen line runs from the tail tip up through the back to the beak without lifting"), "surface": the ground or paper and how much of it shows, "edges": how forms end (hard contour, feathered, smudged, bleeding, crisp vector), "density": where the marks are dense and where sparse, "as_material": one sentence: if these marks were a physical substance, what would they be}.
"palette": {"measured": the measured list above in order, each {"hex","share","role"} naming what that colour is in the piece, "value_structure": two sentences on key (high/low), contrast, and where the darkest and lightest values sit in the frame, "dominant": 2 to 3 hexes, "accents": 1 to 3 hexes with where they appear, "temperature": one sentence}.
"subject": {"what": what it is, species or character, "doing": what it is doing at this instant, "pose": body position and gesture line, "facing": which way it faces in the frame, "expression": its expression or attitude, "stylisation": how the artist simplified or exaggerated it}.
"story": {"nature": what kind of being this is as a living thing or character in its own world (never "an emblem", "a study" or "a portrait": read the subject, not the paper), "habitat": the concrete place it would live or be found, named as a place in that world (a barn eave colony, a sea-stack aerie, a cluttered cookhouse), "implies": what just happened or is about to, "world": two or three physical things that would surround it there}.
"composition": {"mass": where the visual weight sits, with frame position, "mass_box": [ymin,xmin,ymax,xmax] normalized 0 to 1000, "flow_lines": 2 to 4 items each {"line": what forms it, "from": [x,y] 0..1, "to": [x,y] 0..1, "curve": straight|arc|S|spiral}, "negative_space": where the empty ground is and about what share of the frame, "symmetry": whether and how it is symmetric, "scale_cues": what tells the size of the subject, "focal": {"what", "at": [x,y] 0..1}, "frame": how the frame crops or crowds the subject}.
"energy": {"register": 3 single words, "tempo": still|poised|flowing|surging|explosive, "why": one sentence}.
"details": 3 to 4 items each {"what": a specific detail a viewer would remember, "where": frame position, "why": one sentence}.
"unlike": one sentence on what makes this piece unlike any other picture of its subject.`;
  const check = (d) => {
    const e = [];
    for (const k of ["medium", "palette", "subject", "story", "composition", "energy", "details", "unlike"]) if (!(k in d)) e.push(`missing ${k}`);
    if (e.length) return e;
    if (!Array.isArray(d.medium.marks) || d.medium.marks.length < 4) e.push("medium.marks needs 4+");
    if (!Array.isArray(d.composition.flow_lines) || d.composition.flow_lines.length < 2 || !d.composition.flow_lines.every((f) => Array.isArray(f.from) && Array.isArray(f.to))) e.push("composition.flow_lines needs 2+ with from/to");
    if (!Array.isArray(d.composition.mass_box) || d.composition.mass_box.length !== 4) e.push("composition.mass_box needs 4 numbers");
    if (!Array.isArray(d.composition.focal?.at)) e.push("composition.focal.at needs [x,y]");
    if (!Array.isArray(d.details) || d.details.length < 3) e.push("details needs 3+");
    const text = JSON.stringify(d);
    const g = text.match(DEEP_GENERIC);
    if (g) e.push(`generic praise word "${g[0]}": replace it with a concrete observation`);
    return e;
  };
  process.on("exit", () => console.error(`spend: ${spend.calls} calls, ${spend.inTok} in / ${spend.outTok} out tokens, ~$${spend.usd.toFixed(4)}`));
  const { data, model } = await askJSON([await imagePart(art, 1600), { text: prompt }], check, { temperature: 0.3, retries: 3 });
  data.palette.measured = measured.map((m, i) => ({ ...m, role: data.palette.measured?.[i]?.role || "" }));
  const outDoc = { source: { art: path.relative(root, path.resolve(art)), width: meta.width, height: meta.height, model, date: new Date().toISOString().slice(0, 10) }, ...data };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(outDoc, null, 2) + "\n");
  console.log(`${out}: ${data.medium.technique} | ${data.subject.doing} | ${data.unlike}`);
}

const VARIANTS = {
  1: `READING 1, THE HOME. The place is where the creature lives day to day, built up around it over time (a den, nest, garden, workshop, hoard, burrow, roost, whatever fits this creature), and it is doing an everyday, unguarded thing there. Terrain emphasis: stacked terraces that climb to a high home perch; plateau_share 0.35 to 0.5, at least 4 cells at height 3 around or behind the focal cell, water_share 0 to 0.04. Approach shape: the path winds, entering the near rim off-centre and switching back at least twice as it climbs the terraces. Palette key: warm midday light (ambient 0.85 to 0.95, sun 0.1 to 0.2, tint a pale warm white); grass and trees carry IMAGE 1's warmest dominant hue family as accents, surfaces lean grass and sand.`,
  2: `READING 2, THE SHRINE. The place is built by others to honour, seal, or petition the creature (a temple, ruin, altar court, sunken sanctum, festival ground), and the creature is enthroned, sleeping, or keeping a vigil there. Terrain emphasis: water. A still pool, moat arm, or sacred spring of 12 to 24 W cells (water_share 0.08 to 0.15) that the approach path skirts or crosses over a land causeway, with the shrine clearing at height 2 beyond it; the land stays one connected mass. Approach shape: axial, a straight processional line from the near rim to the shrine. Palette key: dusk or night (ambient 0.6 to 0.75, sun 0.25 to 0.4, tint a cool colour drawn from IMAGE 1's coolest hue); stone and IMAGE 1's coolest hue lead; surfaces lean stone.`,
  3: `READING 3, THE ENCOUNTER. The place is out in the wild or on the edge of the world where the hero meets the creature mid-act (hunting, calling out, guarding a pass, emerging, feeding, playing), a boss-arena clearing. Terrain emphasis: a mostly flat open arena floor at height 1 (plateau_share 0.15 to 0.25) walled by tall height 3 cliffs or pillars on the far and side edges, with void biting deep notches into the rim; water_share 0. Approach shape: the path enters from a near side corner (columns 0 to 4 or 11 to 15, rows 8 to 11) and crosses the arena floor on a diagonal of stepped segments. Palette key: a bold time of day unlike the other two, golden hour or strange-sky (ambient 0.7 to 0.85, sun 0.2 to 0.35, tint a saturated hue taken from IMAGE 1's second strongest colour); dirt and sand lead the surfaces.`,
};
const avoid = avoidList.map((f) => { const b = JSON.parse(fs.readFileSync(f, "utf8")); const sc = b.scene || {}; return `- ${path.basename(f)}: ${sc.summary || ""} Place: ${sc.place || ""} Approach: ${sc.approach || ""} Creature: ${sc.creature_doing || ""} Palette: ${sc.palette_key || ""} Terrain: ${sc.terrain || ""} Motifs: ${(b.motifs || []).map((m) => m.name).join(", ")}.`; });
if (variant && !VARIANTS[variant]) { console.error(`unknown variant ${variant}; one of ${Object.keys(VARIANTS).join(", ")}`); process.exit(2); }
if (lensName && !LENSES[lensName]) { console.error(`unknown lens ${lensName}; one of ${Object.keys(LENSES).join(", ")}`); process.exit(2); }
if (lensName && !analysisArg) { console.error("--lens needs --analysis <analysis.json> (make one with --deep)"); process.exit(2); }
if (!lensName && !CONCEPTS[conceptName]) { console.error(`unknown concept ${conceptName}; one of ${Object.keys(CONCEPTS).join(", ")}`); process.exit(2); }

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
if (deepMode) { await runDeep(); process.exit(0); }
const analysis = lensName ? JSON.parse(fs.readFileSync(analysisArg, "utf8")) : null;
const siblings = lensName ? Object.keys(LENSES).filter((l) => l !== lensName).map((l) => path.join(path.dirname(path.resolve(out)), `${slug}-${l}.json`)).filter((f) => fs.existsSync(f) && !avoidList.includes(f)) : [];
const lensAvoid = [...avoidList, ...siblings].map((f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } }).filter((b) => b?.lens);

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
  "translation": a per-level override of the pack palette keyed by the pack palette's own keys, with the same shape per key: ${JSON.stringify(paletteShape)}, plus "bg" (hex). Rules: keep each group's three-tone ladder (top brightest, then left, then right; roughly the pack's own luminance ratios top 1.00 : left 0.88 : right 0.66); keep every group in its own hue family (grass stays green, sand stays warm yellow-ochre, water stays cyan, wood stays orange, gold stays gold, trunk stays red-brown) so it still reads as the same toy pack, and pull value, saturation, and hue temperature toward the mood the CONCEPT STRATEGY below asks for. If IMAGE 1 is monochrome or near-monochrome, do NOT translate to grey: a grey level no longer reads as the pack. Top tones of grass, sand, water, wood, and the tree groups keep HSL saturation of at least 30% and lightness between 42% and 78%; the background may go dark. A figure made of flame or light in IMAGE 1 keeps the pack's warm flame colours as the one hot accent in the level. Every value is a 6-digit hex.
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

"biome": procgen rules another generator will follow without seeing IMAGE 1: {"trees": {"density": 0 to 1 share of land cells with a tree, "types": [{"type","variant","weight"}] using catalog types or your new motif names}, "water_share": 0 to 1 of the 16x12 grid, "plateau_share": 0 to 1 of land raised above base, "void_share": 0 to 1, "decor_weights": {type or motif name: weight}, "lighting": {"bg": hex, "ambient": 0 to 1, "sun": 0 to 1, "tint": hex, "notes": one sentence}, "rules": 3 to 6 short imperative placement rules, "decor_density": 0 to 1 share of land cells that carry scatter decor from decor_weights, "surfaces": {"ground": surface of plain G cells, "raised": surface of R cells, "path": surface of P cells, "shore": surface of land cells beside water or void, each one of grass|sand|dirt|stone, "mist": surface for pale mist ground or null to keep mist as props}}.${conceptName === "scene" ? `

"scene": the scene object the CONCEPT STRATEGY below defines.` : ""}${lensName ? LENS_KEYS() : ""}

CONCEPT STRATEGY "${conceptName}" (it overrides any rule above it contradicts, including which features the drawing must contain):
${lensName ? LENS_PROMPT() : CONCEPTS[conceptName]}${variant ? `

VARIANT (it refines the strategy above and wins where they differ):
${VARIANTS[variant]}` : ""}${avoid.length ? `

EARLIER READINGS OF THIS SAME ARTWORK. Yours must be a different scene: a different kind of place, a different approach and threshold, a different creature action, a different palette key, a different terrain emphasis, and motif names that do not repeat theirs.
${avoid.join("\n")}` : ""}`;

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
  for (const m of b.motifs || []) if (m && m.type && m.type !== "new" && !CATALOG[m.type]) { m.variant_of = m.variant_of || m.type; m.type = "new"; }
  for (const m of b.motifs || []) if (Array.isArray(m.cells)) { m.cells = m.cells.filter((cell) => Array.isArray(cell) && (m.type === "waterfall" ? c.grid[cell[1]]?.[cell[0]] === "W" || onLand(cell) : onLand(cell))); m.count = m.cells.length; }
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
  if (lensName) errs.push(...validateLens(b));
  if (conceptName === "scene") { const sc = b.scene || {}; for (const k of ["place", "approach", "creature_doing", "palette_key", "terrain", "summary"]) if (typeof sc[k] !== "string" || !sc[k]) errs.push(`scene.${k} missing`); }
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
  for (const [k, v] of Object.entries(bi.surfaces || {})) if (v !== null && !["grass", "sand", "dirt", "stone"].includes(v)) errs.push(`biome.surfaces.${k} ${v} not grass|sand|dirt|stone|null`);
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
const { data, model } = await askJSON(parts, validate, { temperature: lensName ? 0.4 : 0.2, retries: lensName ? 4 : 3 });
if (clamped.length) {
  data.palette.clamped = clamped;
  const swap = Object.fromEntries(clamped.map((t) => t.split(" ").pop().split("->")));
  const final = (v) => { let n = 0; while (swap[v] && n++ < 5) v = swap[v]; return v; };
  const deep = (v) => (typeof v === "string" && swap[v] ? final(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  for (const k of ["motifs", "creatures", "biome"]) data[k] = deep(data[k]);
}
data.palette.measured = measured.map((m, i) => ({ ...m, role: data.palette.measured?.[i]?.role || "" }));
if (lensName) {
  data.biome.lighting = { ...data.biome.lighting, bg: data.lighting.bg, ambient: data.lighting.ambient, sun: data.lighting.sun, tint: data.lighting.tint, notes: `${data.lighting.time}: ${data.lighting.why}` };
  const lead = (data.creatures || []).find((c) => c.cell?.[0] === data.composition.focal.x && c.cell?.[1] === data.composition.focal.z) || data.creatures?.[0];
  if (lead) lead.pose = data.figure_pose.pose;
  for (const m of data.motifs || []) if (m.name === data.threshold.prop) m.role = "threshold";
}
const brief = {
  source: { art: path.relative(root, path.resolve(art)), width: meta.width, height: meta.height, model, date: new Date().toISOString().slice(0, 10) },
  mood: data.mood, observations: data.observations, palette: data.palette, motifs: data.motifs, creatures: data.creatures, composition: { legend: CODES, ...data.composition }, biome: data.biome,
  scene: data.scene,
  ...(lensName ? { lens: lensFixes.length ? { ...data.lens, fixes: [...lensFixes] } : data.lens, shaper: data.shaper, surface_mix: data.surface_mix, cliff_treatment: data.cliff_treatment, lighting: data.lighting, figure_pose: data.figure_pose, approach: data.approach, threshold: data.threshold, analysis: path.relative(root, path.resolve(analysisArg)) } : {}),
  concept: { name: conceptName, lens: lensName || undefined, fragment: lensName ? LENSES[lensName] : CONCEPTS[conceptName], variant: variant || undefined, variantFragment: VARIANTS[variant], avoid: avoidList.length ? avoidList : undefined },
};
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(brief, null, 2) + "\n");
if (brief.scene) console.log(`scene: ${brief.scene.summary}`);
if (brief.lens) console.log(`lens ${lensName}: ${brief.lens.place} | shaper ${brief.shaper.name} ${JSON.stringify(brief.shaper.params)} | surfaces ${brief.surface_mix.pattern} ${brief.surface_mix.surfaces.map((e) => e.s + " " + e.share).join(", ")} | cliff ${brief.cliff_treatment.style} | light ${brief.lighting.time}`);
console.log(`${out}: ${brief.motifs.length} motifs, ${brief.creatures.length} creatures, model ${model}`);
console.log(brief.composition.grid.join("\n"));
