const G = (file, height, extra = {}) => ({ footprint: [1, 1], passable: false, variants: 1, height, glb: `assets/forest-c/${file}.glb`, shade: true, rotates: true, ...extra });

export const HOVER = { "flame-wisp": { body: 0.55, lift: 0.3 } };

export const TYPES = {
  "bare-trunk-tall": G("bare-trunk-tall", 2.7),
  "leaning-trunk": G("leaning-trunk", 2.2),
  "fallen-log": G("fallen-log", 0.45),
  "root-tangle": G("root-tangle", 0.35, { passable: true }),
  "mist-bank": G("mist-bank", 0.35, { passable: true }),
  "mossy-stump": G("mossy-stump", 0.6),
  "fire-bird": G("fire-bird", 2.4, { footprint: [2, 2] }),
  "flame-wisp": { footprint: [1, 1], passable: false, variants: 1, height: 0.85, shade: true, rotates: true },
  "forest-tree": G("forest-tree", 2.2),
};

const hovering = typeof window === "undefined" ? {} : await loadHovering();

async function loadHovering() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const out = {};
  await Promise.all(Object.entries(HOVER).map(async ([t, h]) => {
    try {
      const gltf = await new GLTFLoader().loadAsync(new URL(`../assets/forest-c/${t}.glb`, import.meta.url).href);
      const root = gltf.scene, box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
      const s = h.body / size.y;
      root.scale.setScalar(s);
      root.position.set(-(box.min.x + size.x / 2) * s, h.lift - box.min.y * s, -(box.min.z + size.z / 2) * s);
      out[t] = root;
    } catch (e) { console.error(`[forest-c] ${t}: ${e.message || e}`); }
  }));
  return out;
}

export function register() {
  const builders = {};
  for (const t of Object.keys(HOVER)) builders[t] = () => { if (!hovering[t]) return null; const c = hovering[t].clone(); const w = new c.constructor(); w.add(c); return w; };
  return { catalog: TYPES, builders };
}
