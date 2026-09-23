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
};

export const footprintCells = (t, x, z, rot = 0) => {
  const [w, d] = CATALOG[t].footprint;
  const [fw, fd] = rot % 2 ? [d, w] : [w, d];
  const out = [];
  for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) out.push([x + dx, z + dz]);
  return out;
};
