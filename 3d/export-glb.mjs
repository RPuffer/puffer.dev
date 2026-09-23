import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Baker, bakedMaterial } from "./baker.js";
import { makePieces } from "./pieces.js";
import { CATALOG } from "../core/catalog.js";

globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((b) => { this.result = "data:application/octet-stream;base64," + Buffer.from(b).toString("base64"); this.onloadend?.(); }); }
};

const [what, out, variant = "0"] = process.argv.slice(2);
if (!what || !out) { console.error("usage: node 3d/export-glb.mjs <catalog-type|blob> <out.glb> [variant]"); process.exit(2); }

function blob() {
  const g = new THREE.IcosahedronGeometry(0.5, 1);
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const cols = [];
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + 0.5;
    const c = new THREE.Color().setHSL(0.28 + 0.1 * rnd() - 0.12 * y, 0.45, 0.35 + 0.35 * y);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  g.scale(1, 1.3, 1);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
}

function piece(t, v) {
  const make = makePieces()[t];
  if (!make) throw new Error(`no builder for ${t}`);
  const B = new Baker();
  B.noCull = true;
  make(B, CATALOG[t]?.height || 1, v, { drop: 1, deck: 1 });
  return new THREE.Mesh(B.geometry(), bakedMaterial());
}

const mesh = what === "blob" ? blob() : piece(what, +variant);
const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, Buffer.from(glb));
console.log(`${out} ${glb.byteLength} bytes`);
