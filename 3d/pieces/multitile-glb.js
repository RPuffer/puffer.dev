import * as THREE from "three";
import { Baker, bakedMaterial } from "../baker.js";
import { stamp } from "../../core/catalog.js";
import { CROWN } from "../pieces.js";

const ITEMS = {
  "glb-windmill": { file: "windmill", footprint: [3, 3], height: 4 },
  "glb-canopy-tree": { file: "canopy-tree", footprint: [3, 3], height: 4 },
};

const loaded = typeof window === "undefined" ? {} : await load();

async function load() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const out = {};
  await Promise.all(Object.entries(ITEMS).map(async ([t, it]) => {
    try {
      const gltf = await new GLTFLoader().loadAsync(new URL(`../assets/multitile/${it.file}.glb`, import.meta.url).href);
      let geo = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; });
      out[t] = { geo, sway: gltf.asset?.extras?.sway || null };
    } catch (e) { console.error(`[multitile-glb] ${t}: ${e.message || e}`); }
  }));
  return out;
}

function build(t) {
  const m = loaded[t];
  if (!m?.geo) return null;
  const P = m.geo.attributes.position, C = m.geo.attributes.color, n = P.count / 3;
  const swayed = new Set(m.sway?.tris || []);
  let rootY = Infinity, topY = 0;
  for (let i = 0; i < P.count; i++) { topY = Math.max(topY, P.getY(i)); if (swayed.has((i / 3) | 0)) rootY = Math.min(rootY, P.getY(i)); }
  const B = new Baker();
  const emit = (tri) => {
    const v = [0, 1, 2].map((k) => [P.getX(tri * 3 + k), P.getY(tri * 3 + k), P.getZ(tri * 3 + k)]);
    const cols = [0, 1, 2].map((k) => new THREE.Color(C.getX(tri * 3 + k), C.getY(tri * 3 + k), C.getZ(tri * 3 + k)));
    B.ctri(v[0], v[1], v[2], cols);
  };
  for (let i = 0; i < n; i++) if (!swayed.has(i)) emit(i);
  if (swayed.size) B.sway("crown", { amp: CROWN, root: [0, rootY, 0], span: topY - rootY }, () => { for (const i of swayed) emit(i); });
  return new THREE.Mesh(B.geometry(), bakedMaterial());
}

export function register() {
  const catalog = {}, builders = {};
  for (const [t, it] of Object.entries(ITEMS)) {
    const [w, d] = it.footprint;
    catalog[t] = stamp(it.footprint, Array.from({ length: w * d }, () => ({ pass: false, h: it.height })), { shade: false });
    builders[t] = () => build(t);
  }
  return { catalog, builders };
}
