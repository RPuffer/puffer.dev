const G = (file, height, extra = {}) => ({ footprint: [1, 1], passable: false, variants: 1, height, glb: `assets/forest-c/${file}.glb`, shade: true, rotates: true, ...extra });

export const TYPES = {
  "bare-trunk-tall": G("bare-trunk-tall", 2.7),
  "leaning-trunk": G("leaning-trunk", 2.2),
  "fallen-log": G("fallen-log", 0.45),
  "root-tangle": G("root-tangle", 0.35, { passable: true }),
  "mist-bank": G("mist-bank", 0.35, { passable: true }),
  "mossy-stump": G("mossy-stump", 0.6),
  "fire-bird": G("fire-bird", 2.4, { footprint: [2, 2] }),
  "flame-wisp": G("flame-wisp", 0.8),
  "forest-tree": G("forest-tree", 2.2),
};

export function register() {
  return { catalog: TYPES, builders: {} };
}
