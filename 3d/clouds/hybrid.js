import { buildVolume } from "./volumetric.js";
import { buildSprites, spriteLayout } from "./billboards.js";

export function build(I, assets, params) {
  const vol = buildVolume(I, assets.noise, params, { cover: 1.05, order: 1 });
  const wisps = buildSprites(I, assets.atlas, spriteLayout(I, assets.atlas.meta, { rim: true, under: false, bed: false, wisps: true }), { gain: I.dark ? 0.92 : 1, order: 2 });
  return { objects: [...vol.objects, wisps], targets: vol.targets };
}

export const needs = ["atlas", "noise"];
