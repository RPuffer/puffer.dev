import { island } from "./common.js";
import { build, loadAtlas } from "./billboards.js";
import { disposeTree } from "../renderer.js";

export const cloudsOff = (params) => params.clouds === "none" || params.clouds === "0";

export async function loadClouds(params, style) {
  if (cloudsOff(params)) return null;
  const atlas = await loadAtlas();
  let objects = [];
  return {
    kind: "billboards",
    mount(renderer, state, st = style) {
      objects = build(island(state, st), atlas);
      for (const o of objects) renderer.three.scene.add(o);
      window.__clouds = { kind: "billboards", objects };
      return objects;
    },
    unmount(renderer) {
      for (const o of objects) {
        renderer.three.scene.remove(o);
        disposeTree(o);
      }
      objects = [];
      window.__clouds = { kind: "billboards", objects };
    },
  };
}
