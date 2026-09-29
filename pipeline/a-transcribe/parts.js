import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "../../3d/baker.js";

const HEX = /^#[0-9a-f]{6}$/i;
const n = (v, d) => (Number.isFinite(+v) ? +v : d);
const palOf = (t, fb) => { const a = Array.isArray(t) && t.every((h) => HEX.test(h)) ? t : fb; return tone(a[0], a[1] || a[0], a[2] || a[1] || a[0]); };

export function partsExtent(parts) {
  let top = 0, lo = Infinity;
  for (const p of parts || []) {
    const at = Array.isArray(p.at) ? p.at : [0, 0, 0], d = p.dims || [];
    const y0 = n(at[1], 0), h = p.prim === "box" || p.prim === "rbox" ? n(d[1], 0.3) : p.prim === "cyl" ? n(d[1], 0.3) : p.prim === "cone" ? n(d[2], 0.3) : p.prim === "prism" ? n(d[0], 0.3) : p.prim === "ball" ? n(d[0], 0.2) * 2 * n(d[1], 1) : p.prim === "beam" ? Math.max(0, n(p.to?.[1], y0) - y0) : 0.3;
    top = Math.max(top, y0 + h, p.prim === "beam" ? n(p.to?.[1], 0) : 0);
    lo = Math.min(lo, p.prim === "ball" ? y0 - n(d[0], 0.2) * n(d[1], 1) : y0);
  }
  return { top: top || 1, lo: Number.isFinite(lo) ? lo : 0 };
}

export function bakeParts(B, parts, o = {}) {
  const fb = o.fallback || ["#d9c9a0", "#bfae84", "#9c8c66"];
  const { top, lo } = partsExtent(parts);
  const k = o.height ? o.height / Math.max(0.2, top - Math.min(0, lo)) : 1;
  const lift = lo < 0 ? -lo : 0;
  const recolor = o.recolor || ((t) => t);
  B.push(0, 0, 0, o.rotY || 0, k);
  for (const p of parts || []) {
    const at = Array.isArray(p.at) ? p.at.map((v) => n(v, 0)) : [0, 0, 0];
    const [x, y0, z] = [at[0], Math.max(0, at[1] + lift), at[2]];
    const d = (p.dims || []).map((v) => Math.max(0.02, Math.abs(n(v, 0.2))));
    const pal = palOf(recolor(p.tones), fb);
    const rot = n(p.rot, 0);
    const draw = () => {
      if (p.prim === "box") B.box(d[0] ?? 0.3, d[1] ?? 0.3, d[2] ?? 0.3, pal, 0, 0, 0);
      else if (p.prim === "rbox") B.rbox(d[0] ?? 0.3, d[1] ?? 0.3, d[2] ?? 0.3, Math.min(0.15, d[3] ?? 0.08), pal, 0, 0, 0);
      else if (p.prim === "cyl") B.cyl(d[0] ?? 0.2, d[1] ?? 0.3, pal, 0, 0, 0, Math.max(5, Math.min(10, Math.round(d[2] ?? 8))));
      else if (p.prim === "cone") B.cone(d[0] ?? 0.2, Math.abs(n(p.dims?.[1], 0)), d[2] ?? 0.3, pal, 0, 0, 0, Math.max(3, Math.min(10, Math.round(d[3] ?? 6))));
      else if (p.prim === "ball") B.ball(d[0] ?? 0.2, pal, 0, (d[0] ?? 0.2) * (d[1] ?? 1), 0, d[1] ?? 1, 0);
      else if (p.prim === "prism" && Array.isArray(p.outline) && p.outline.length >= 3) B.prism(p.outline.map(([u, v]) => [n(u, 0), n(v, 0)]), 0, d[0] ?? 0.3, pal);
      else if (p.prim === "beam" && Array.isArray(p.to)) {
        const a = new THREE.Vector3(0, 0, 0), b = new THREE.Vector3(n(p.to[0], 0) - at[0], n(p.to[1], 0) + lift - y0, n(p.to[2], 0) - at[2]);
        const len = b.length();
        if (len < 0.02) return;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        B.pushMatrix(new THREE.Matrix4().compose(new THREE.Vector3(), q, new THREE.Vector3(1, 1, 1)));
        const r = Math.max(0.05, d[0] ?? 0.06);
        B.box(r * 2, len, r * 2, pal, 0, 0, 0);
        B.pop();
      }
    };
    B.at(x, y0, z, rot, draw);
  }
  B.pop();
  return B;
}

export function partsMesh(parts, o = {}) {
  const B = bakeParts(new Baker(), parts, o);
  return new THREE.Mesh(B.geometry(), bakedMaterial());
}
