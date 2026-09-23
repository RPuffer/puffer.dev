export const SURFACES = ["grass", "sand", "dirt", "stone", "water", "none", "ramp", "bridge"];

export const WALKABLE = new Set(["grass", "sand", "dirt", "stone", "ramp", "bridge"]);

const decor = (footprint, passable, variants, height, extra = {}) => ({ cat: "decor", footprint, passable, variants, height, ...extra });

export const CATALOG = {
  "tree-pine": decor([1, 1], false, 3, 2.4),
  "tree-round": decor([1, 1], false, 3, 2.2),
  "tree-orange": decor([1, 1], false, 2, 2.2),
  "bush": decor([1, 1], false, 2, 0.6),
  "rock": decor([1, 1], false, 3, 0.5),
  "rock-big": decor([1, 1], false, 2, 0.9),
  "well": decor([1, 1], false, 1, 1.6),
  "fence": decor([1, 1], false, 1, 0.8, { rotates: true }),
  "fence-post": decor([1, 1], false, 1, 0.8),
  "barrel": decor([1, 1], false, 1, 0.7),
  "pot": decor([1, 1], false, 2, 0.6),
  "crate": decor([1, 1], false, 1, 0.7),
  "chest": decor([1, 1], false, 1, 0.6, { rotates: true }),
  "mushroom": decor([1, 1], false, 2, 0.5),
  "flower": decor([1, 1], true, 3, 0.3),
  "coin": decor([1, 1], true, 1, 0.5, { floats: true }),
  "gem": decor([1, 1], true, 2, 0.6),
  "torch": decor([1, 1], false, 1, 1.2),
  "campfire": decor([1, 1], false, 1, 0.5),
  "signpost": decor([1, 1], false, 1, 1.1, { rotates: true }),
  "waterfall": decor([1, 1], false, 1, 1.0, { rotates: true, attach: "cliff" }),
  "stepping-stones": decor([1, 1], true, 2, 0.1),
  "log": decor([1, 1], false, 1, 0.4, { rotates: true }),
  "lantern": decor([1, 1], false, 1, 1.0),
  "bush-cluster": decor([1, 1], false, 2, 1.1),
  "stump": decor([1, 1], false, 1, 0.6, { rotates: true }),
  "fence-pen": decor([1, 1], false, 1, 0.8),
  "marker": decor([1, 1], true, 1, 0.08),
  "ladder": decor([1, 1], true, 1, 1.5, { rotates: true, attach: "cliff" }),
  "scaffold": decor([1, 1], true, 1, 2.0, { attach: "under" }),
  "star": decor([1, 1], true, 1, 0.5, { floats: true }),
  "heart": decor([1, 1], true, 1, 0.5, { floats: true }),
};

export const MATERIALS = { bridge: ["planks", "logs"], ramp: ["stone", "sand", "grass", "dirt"] };

export const PALETTE = {
  bg: "#404040",
  grass: { top: "#aae26c", fringe: "#8ac967", fringeDark: "#73aa4f", speck: "#c4ef86" },
  sand: { top: "#f4c41e", lip: "#dd9200", edge: "#f1b900", dots: "#f1cd52" },
  dirt: { top: "#ffe082", patch: "#ffe087", mottle: "#f8d87c", border: "#f4c41e" },
  stone: { top: "#ffe082", pebble: "#fff0c3", pebbleShade: "#e8dab1", rim: "#dbc9a2" },
  cliffUpper: { left: "#c3856c", right: "#a7695f", seam: "#915b53" },
  cliffLower: { left: "#d6856b", right: "#a15b52", seam: "#ba695e", speck: "#905148" },
  water: { top: "#a0eeff", bubble: "#daf7ff", deep: "#00d4ff", fall: ["#00daff", "#00ceff", "#00c7ff"], foam: "#daf7ff" },
  wood: { light: "#ff831d", mid: "#dc7016", dark: "#bd4c0b", shadow: "#a04b14", end: "#f6d881" },
  treeMint: ["#68e09e", "#5ac389", "#44a46b"],
  treeLime: ["#c4ef86", "#8ce263", "#73aa4f"],
  treeLeaf: ["#8ce263", "#64c960", "#50ab46"],
  treeTeal: ["#00ffbf", "#00e09b", "#00c386", "#00a568"],
  treeGold: ["#f1cd52", "#f1b900", "#dd9200"],
  trunk: ["#b06a57", "#9f5950"],
  rock: ["#e3e3e3", "#d4d4d4", "#ababab", "#8f8f8f"],
  wellStone: ["#dbc9a2", "#c7b693", "#b1a483"],
  flowerOrange: ["#ff831d", "#f1b900"],
  berry: ["#fe738f", "#f45f7d"], bushTeal: ["#8fffc2", "#68e09e", "#5ac389"],
  gold: ["#f1b900", "#dd9200", "#ffe082"],
};

export function registerCatalog(entries = {}) {
  for (const [t, e] of Object.entries(entries)) CATALOG[t] = { cat: "decor", footprint: [1, 1], passable: false, variants: 1, height: 1, ...e };
  return CATALOG;
}

export const footprintCells = (t, x, z, rot = 0) => {
  const [w, d] = CATALOG[t].footprint;
  const [fw, fd] = rot % 2 ? [d, w] : [w, d];
  const out = [];
  for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) out.push([x + dx, z + dz]);
  return out;
};
