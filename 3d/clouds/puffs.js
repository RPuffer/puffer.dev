import * as THREE from "three";
import { Baker, tone } from "../baker.js";
import { applyMotion } from "../motion.js";
import { mixHex, rgbHex } from "../prims.js";
import { ballLayout } from "./balls.js";

export function build(I) {
  const warm = I.hue.r > I.hue.b + 0.15;
  const base = warm ? ["#fff3e6", "#f2c9b0", "#d99a80"] : ["#ffffff", "#e1e8f6", "#bfcbe6"];
  const bg = rgbHex(I.bg.clone().convertLinearToSRGB().toArray());
  const B = new Baker(I.styleLight), rng = I.rng("puffs");
  const pals = new Map();
  const palFor = (f) => {
    const k = Math.round(f * 8);
    if (!pals.has(k)) pals.set(k, tone(...base.map((h) => mixHex(h, bg, (k / 8) * 0.9))));
    return pals.get(k);
  };
  for (const p of ballLayout(I)) {
    const d = Math.hypot(p.x - I.center.x, p.z - I.center.y);
    const s = (t) => Math.min(1, Math.max(0, t)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, t)));
    const f = Math.max(s((d - I.radius - 1.5) / 7.5), s((I.base - 0.4 - p.y) / 2.2) * 0.5);
    B.sway("mist", { amp: 0.14, phase: rng() * 6.283, root: [p.x, p.y, p.z] }, () => B.ball(p.r, palFor(f), p.x, p.y, p.z, p.sy, 1));
  }
  const mesh = new THREE.Mesh(B.geometry(), applyMotion(new THREE.MeshBasicMaterial({ vertexColors: true })));
  mesh.name = "clouds-puffs";
  return [mesh];
}
