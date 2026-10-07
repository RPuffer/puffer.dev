import { island } from "./common.js";

const KINDS = ["billboards", "volumetric", "puffs", "hybrid", "painterly", "cel"];

export async function loadClouds(params, style) {
  const kind = params.clouds;
  if (!kind || kind === "none") return null;
  if (!KINDS.includes(kind)) { console.error(`[clouds] unknown technique ${kind}; try ${KINDS.join(", ")}`); return null; }
  const mod = await import(`./${kind}.js`);
  const assets = {};
  if (mod.needs?.includes("atlas")) assets.atlas = await (await import("./billboards.js")).loadAtlas();
  return {
    kind,
    mount(renderer, state) {
      const I = island(state, style);
      const objects = mod.build(I, assets, params, renderer);
      for (const o of objects) renderer.three.scene.add(o);
      window.__clouds = { kind, objects };
      return objects;
    },
  };
}
