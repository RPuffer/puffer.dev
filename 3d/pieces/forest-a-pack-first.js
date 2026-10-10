import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "../baker.js";
import { register as forestA } from "./forest-a.js";

const first = (P, type, i, d) => P.tones?.[type]?.[i] || d;

export function register(style) {
  const P = style.palette;
  const bark = first(P, "bare-trunk", 0, P.trunk ? [P.trunk[0], P.trunk[1], P.trunk[1]] : null);
  const root = first(P, "root-tangle", 0, bark);
  const log = first(P, "fallen-log", 0, [P.wood.light, P.wood.mid, P.wood.dark]);
  const cloud = first(P, "mist-wisp", 0, ["#ffffff", "#d5f5ff", "#a6a6a6"]);

  const trunks = forestA({ ...style, palette: { ...P, bark, rootWood: root } });
  const logs = forestA({ ...style, palette: { ...P, bark: log, wood: { ...P.wood, end: first(P, "fallen-log", 1, [P.wood.end])[0] } } });

  const catalog = {
    "fire-bird": trunks.catalog["fire-bird"],
    "bare-trunk": { footprint: [1, 1], passable: false, variants: 3, height: 2.4 },
    "fallen-log": trunks.catalog["fallen-log"],
    "root-tangle": trunks.catalog["root-tangle"],
    "mist-wisp": { footprint: [1, 1], passable: true, variants: 2, height: 0.28 },
  };

  const builders = {
    "fire-bird": trunks.builders["fire-bird"],
    "bare-trunk": trunks.builders["bare-trunk"],
    "root-tangle": trunks.builders["root-tangle"],
    "fallen-log": logs.builders["fallen-log"],
    "mist-wisp"(v, rot, st, ctx) {
      const B = new Baker();
      const k = ctx.height / 0.28;
      const pal = tone(cloud[0], cloud[1], cloud[2]);
      const lobes = v ? [[-0.1, 0, -0.06, 0.62, 0.12, 0.42], [0.14, 0.11, 0.12, 0.44, 0.13, 0.32]] : [[0.06, 0, 0.04, 0.7, 0.12, 0.45], [-0.12, 0.12, -0.1, 0.5, 0.14, 0.35]];
      B.sway("mist", { amp: 0.05 }, () => { for (const [x, y, z, w, h, d] of lobes) B.rbox(w, h * k, d, 0.12, pal, x, y * k, z); });
      return new THREE.Mesh(B.geometry(), bakedMaterial());
    },
  };
  return { catalog, builders };
}
