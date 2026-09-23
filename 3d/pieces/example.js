import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "../baker.js";

export function register(style) {
  const P = style.palette;
  return {
    catalog: {
      "rubber-duck": { footprint: [1, 1], passable: false, variants: 2, height: 0.9, rotates: true },
      "glb-well": { footprint: [1, 1], passable: false, variants: 1, height: 1.6, glb: "assets/test/well.glb" },
      "glb-blob": { footprint: [1, 1], passable: false, variants: 1, height: 0.9, glb: "assets/test/blob.glb", snap: true, flat: true },
      "glb-missing": { footprint: [1, 1], passable: true, variants: 1, height: 0.5, glb: "assets/test/missing.glb" },
    },
    builders: {
      "rubber-duck"(variant, rot, style, ctx) {
        const body = variant % 2 ? P.heart : P.gold;
        const B = new Baker();
        const k = ctx.height / 0.9;
        B.rbox(0.62 * k, 0.36 * k, 0.46 * k, 0.16 * k, tone(body[0], body[0], body[1]), 0, 0, 0);
        B.rbox(0.22 * k, 0.2 * k, 0.24 * k, 0.08 * k, tone(body[0], body[0], body[1]), -0.26 * k, 0.26 * k, 0);
        B.rbox(0.36 * k, 0.34 * k, 0.34 * k, 0.12 * k, tone(body[0], body[0], body[1]), 0.18 * k, 0.4 * k, 0);
        B.rbox(0.2 * k, 0.08 * k, 0.16 * k, 0.04 * k, tone(P.flame[1], P.flame[1], P.flame[2]), 0.42 * k, 0.52 * k, 0);
        for (const s of [-1, 1]) B.box(0.05 * k, 0.07 * k, 0.03 * k, tone(P.interior, P.interior, P.interior), 0.24 * k, 0.6 * k, 0.17 * k * s);
        return new THREE.Mesh(B.geometry(), bakedMaterial());
      },
    },
  };
}
