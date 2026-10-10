import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CATALOG, registerCatalog } from "../core/catalog.js";
import { makeStyle } from "./style.js";
import { extractTris, fitMatrix } from "./bake.js";

export const BUILDERS = {};
export const GLBS = {};

const here = (p) => new URL(p, import.meta.url).href;

export async function loadPieces(raw) {
  const list = Array.isArray(raw.pieces) ? raw.pieces : [];
  if (!list.length) return;
  const style = makeStyle(raw);
  for (const p of list) {
    try {
      const mod = await import(here(p));
      if (typeof mod.register !== "function") throw new Error("module has no register(style) export");
      const out = (await mod.register(style)) || {};
      registerCatalog(out.catalog || {});
      Object.assign(BUILDERS, out.builders || {});
    } catch (e) {
      console.error(`[pieces] ${p} failed: ${e.message || e}`);
    }
  }
}

export async function loadGlbs(level, style = makeStyle(level)) {
  const types = [...new Set((level.decor || []).map((d) => d.t))].filter((t) => CATALOG[t]?.glb && !GLBS[t]);
  if (!types.length) return;
  const loader = new GLTFLoader();
  await Promise.allSettled(types.map(async (t) => {
    const spec = CATALOG[t];
    try {
      const gltf = await loader.loadAsync(here(spec.glb));
      const data = extractTris(gltf.scene, { swatches: spec.snap ? style.swatches : null, flat: !!spec.flat, shade: spec.shade ?? null });
      if (!data.tris && !data.extras.length) throw new Error("no triangles");
      data.fit = fitMatrix(data, spec.height || 1);
      GLBS[t] = data;
    } catch (e) {
      console.error(`[glb] ${t} (${spec.glb}) failed: ${e.message || e}`);
    }
  }));
}
