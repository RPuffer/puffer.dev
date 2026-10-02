import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { measure } from "./measure.mjs";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const HERO_TILES = 0.93;
const MODEL = "gemini-3.1-flash-image";

const SHEETS = {
  cat: { tries: 1, target: 2.5, notes: ["head is 0.5 of figure height: a big block head on a seated body", "legs 0.17 tile thick, tail a chain of 0.15 tile blocks curling forward", "widest at the haunches plus tail, 1.37 tiles", "accent #c4616d on inner ears and the open mouth only"], verdict: "current figure is a 2.5-tile head-and-bib bust of cones; the sheet is a seated full-body cat 2.1 tiles tall, so it needs a body and fewer cones" },
  dragon: { tries: 2, kept: "first", target: 3, notes: ["head 0.3 of height, thrust forward on an arched plated neck", "legs 0.3 tile thick, tail plates 0.15 tile in a curl", "widest across the folded wings and crest, about 1.7 tiles", "accent #303030 in the eye socket and gullet only"], verdict: "current figure is a black 8-part head-and-neck statue; the sheet stands a white wyvern 2.8 tiles tall with wings and legs, so the body is missing and the value is inverted" },
  ember: { tries: 2, kept: "second", target: 2.5, notes: ["dragon head 0.3 of height on top, skull 0.25 at the base, flame slabs between", "ram horns 0.15 tile thick, curled out to both sides of the skull", "widest at the horns, 1.41 tiles", "accent #d78d37 on the horn and skull faces"], verdict: "current 6-part totem reads as a small skull under a flame cone; the sheet stacks a crested dragon head over a horned skull wrapped in flame slabs, so horns and flame mass are under-built" },
  chimera: { tries: 2, kept: "second", target: 2, notes: ["head 0.3 of height, carried at the front on a ribbed neck arched higher than the back", "forelimbs 0.25 tile thick, splayed wide with spiked claws", "widest at the splayed forelegs, 1.85 tiles", "accent #2d251f in the gaps between armour plates and the eyes"], verdict: "current figure is a grey cluster with no readable head; the sheet gives a ribbed arched neck and a big crested head low at the front" },
  wizard: { tries: 1, target: 2.5, notes: ["head and hat 0.4 of height; hat brim 0.75 tile wide, twice the sausage width", "legs and arms 0.06 tile noodles, staff 0.06 tile", "widest at the open palm and staff, 1.17 tiles", "accent #c2674e on the sausage body, #644b48 on the staff"], verdict: "current figure is close; the sheet widens the hat brim, adds a white collar and shows noodle legs below a shorter robe" },
  swallow: { tries: 2, kept: "second", target: 1.5, notes: ["head 0.3 of height, a single block with a wedge beak", "tail forks are two 0.08 tile blades reaching below the perch", "widest at the folded wing tips, 0.92 tile", "accent #3f2723 on beak and eyes only"], verdict: "current figure is a brown bird with long wing spikes at 2.4 tiles; the sheet perches it at 1.4 tiles, so it is 1.7 times too tall and the spikes too long" },
  cosmos: { tries: 2, kept: "second", target: 3, notes: ["eyeball 0.5 of height on a three-step plinth 0.35 of height", "ring a chain of 0.15 tile blocks tilted about 20 degrees", "widest at the ring, 2.09 tiles", "accent #416262 on two ring blocks only"], verdict: "current figure is a black sphere with a green zigzag collar; the sheet is a tan ringed eyeball with a dark iris on a stepped plinth, so ring, iris and palette all differ" },
  sharkbear: { tries: 2, kept: "second", target: 2.5, notes: ["shark head 0.35 of height, low and forward, dorsal fin a 0.4 tile wedge", "legs 0.3 tile thick bear pillars", "widest at the tail blade sweeping forward, 2.34 tiles", "accent #3c3c3c on eye and mouth slit only"], verdict: "current figure reads as a small grey lump; the sheet is a 2.9-tile hunched bear with a fin and a long tail blade, so it is too small and the tail is missing" },
  gremlin: { tries: 1, target: 2.5, notes: ["faceless box head 0.17 of height on a long neck", "limbs 0.1 tile thick with long webbed feet", "widest at the crouched knees and raised arm, 1.55 tiles", "accent #2c2c2c on the held jaw sphere only"], verdict: "current white crouched robot shares the palette; the sheet is taller, 2.75 tiles, with thinner, longer limbs and a box head" },
  mindbloom: { tries: 2, kept: "first", target: 2.5, notes: ["face 0.25 of height, hair cloud 0.4, plinth 0.35", "neck and plinth steps 0.3 tile, jar a clear 0.4 tile cube", "widest at the spiky hair cloud, 1.37 tiles, about twice the face", "accent green on one flame motif at the brow; the doodle decals are optional"], verdict: "current head with ringed colour hair on a teal base is close; the sheet is taller with a black spiky hair cloud twice the face width on a stepped lavender plinth" },
  eagle: { tries: 2, kept: "second", target: 1.5, notes: ["head 0.55 of height, beak 0.35 tile long", "neck ruff 0.8 tile wide over a 0.3 tile post plinth", "widest at the shoulders, 0.87 tile", "accent #bc9e3b on the beak only"], verdict: "current totem carries a huge beak and a mint lens at 2.1 tiles; the sheet is a 1.7-tile bust with a modest beak and plain eye" },
  forest: { tries: 1, target: 2.5, notes: ["head and crest 0.3 of height, body 0.35, legs 0.35", "legs 0.1 tile, tail a curled 0.2 tile scroll above the back", "widest at the body plus tail scroll, 1.13 tiles", "the charcoal artwork gives a grey sheet: keep the island's flame palette, accent on the beak"], verdict: "current orange flame bird on a pedestal matches the sheet's upright crest and scrolled tail; the 11-part build needs only its crest raised and tail scrolled" },
};

const manifest = {};
for (const [slug, s] of Object.entries(SHEETS)) {
  const file = `pipeline/refsheets/${slug}.png`;
  const m = await measure(path.join(DIR, `${slug}.png`));
  const hero = m.boxes[0];
  const fig = m.boxes[1];
  const ratio = +(fig.h / hero.h).toFixed(2);
  manifest[slug] = {
    file,
    model: MODEL,
    tries: s.tries,
    ...(s.kept ? { kept: s.kept } : {}),
    hero_px: hero.h,
    figure_px: fig.h,
    height_ratio: ratio,
    target_ratio: s.target,
    figure_tiles: +(ratio * HERO_TILES).toFixed(2),
    proportions: s.notes,
    verdict: s.verdict,
  };
}
fs.writeFileSync(path.join(DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const TW = 688, TH = 384 + 34;
const slugs = Object.keys(SHEETS);
const tiles = await Promise.all(slugs.map(async (slug, i) => {
  const label = Buffer.from(`<svg width="${TW}" height="34"><rect width="100%" height="100%" fill="#2a2a2a"/><text x="10" y="24" font-family="Helvetica" font-size="20" fill="#eee">${slug}  ${manifest[slug].height_ratio}x hero</text></svg>`);
  const img = await sharp(path.join(DIR, `${slug}.png`)).resize(TW, 384, { fit: "contain", background: "#404040" }).toBuffer();
  return [{ input: label, left: (i % 3) * TW, top: Math.floor(i / 3) * TH }, { input: img, left: (i % 3) * TW, top: Math.floor(i / 3) * TH + 34 }];
}));
await sharp({ create: { width: TW * 3, height: TH * 4, channels: 3, background: "#404040" } }).composite(tiles.flat()).png().toFile(path.join(DIR, "sheet.png"));
console.log(slugs.map((s) => `${s} ${manifest[s].height_ratio}`).join("\n"));
