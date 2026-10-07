import { island } from "./common.js";

const KINDS = ["billboards", "volumetric", "puffs", "hybrid", "painterly", "cel"];

export async function loadClouds(params, style) {
  const kind = params.clouds;
  if (!kind || kind === "none") return null;
  if (!KINDS.includes(kind)) { console.error(`[clouds] unknown technique ${kind}; try ${KINDS.join(", ")}`); return null; }
  const mod = await import(`./${kind}.js`);
  const assets = {};
  if (mod.needs?.includes("atlas")) assets.atlas = await (await import("./billboards.js")).loadAtlas();
  if (mod.needs?.includes("noise")) assets.noise = await (await import("./noise.js")).loadNoise();
  return {
    kind,
    mount(renderer, state) {
      const I = island(state, style);
      const built = mod.build(I, assets, params);
      const { objects, targets = [] } = Array.isArray(built) ? { objects: built } : built;
      for (const o of objects) renderer.three.scene.add(o);
      window.__clouds = { kind, objects, targets };
      return objects;
    },
  };
}
