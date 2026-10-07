import { island } from "./common.js";
import { build, loadAtlas } from "./billboards.js";

export const cloudsOff = (params) => params.clouds === "none" || params.clouds === "0";

export async function loadClouds(params, style) {
  if (cloudsOff(params)) return null;
  const atlas = await loadAtlas();
  return {
    kind: "billboards",
    mount(renderer, state) {
      const objects = build(island(state, style), atlas);
      for (const o of objects) renderer.three.scene.add(o);
      window.__clouds = { kind: "billboards", objects };
      return objects;
    },
  };
}
