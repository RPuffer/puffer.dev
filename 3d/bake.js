import * as THREE from "three";
import { snapper } from "./style.js";

const pixelCache = new WeakMap();

function pixelsOf(tex) {
  const img = tex?.image;
  if (!img || !img.width) return null;
  let px = pixelCache.get(img);
  if (px) return px;
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(img.width, img.height) : Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  px = { w: img.width, h: img.height, data: cx.getImageData(0, 0, img.width, img.height).data, flipY: !!tex.flipY };
  pixelCache.set(img, px);
  return px;
}

function sample(px, u, v, out) {
  u = ((u % 1) + 1) % 1; v = ((v % 1) + 1) % 1;
  if (px.flipY) v = 1 - v;
  const x = Math.min(px.w - 1, Math.floor(u * px.w)), y = Math.min(px.h - 1, Math.floor(v * px.h));
  const i = (y * px.w + x) * 4;
  return out.setRGB(px.data[i] / 255, px.data[i + 1] / 255, px.data[i + 2] / 255, THREE.SRGBColorSpace);
}

const mergeable = (o, m) => o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !o.userData.noMerge && !m.userData?.noMerge && !m.transparent && m.opacity >= 1;

export function extractTris(root, { swatches = null, flat = false, shade = null } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const snap = swatches?.length ? snapper(swatches) : null;
  const pos = [], col = [], nor = [], shadeTri = [], tags = [], extras = [];
  const rel = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color(), t = new THREE.Color();
  root.traverse((o) => {
    if (!o.isMesh && !o.isLine && !o.isPoints && !o.isSprite) return;
    rel.multiplyMatrices(inv, o.matrixWorld);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!o.isMesh || mats.some((m) => !mergeable(o, m))) {
      const e = o.clone(false);
      e.userData.rel = rel.clone();
      extras.push(e);
      return;
    }
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    if (!flat && !g.attributes.normal) { if (g === o.geometry) g = g.clone(); g.computeVertexNormals(); }
    nm.getNormalMatrix(rel);
    const P = g.attributes.position, C = g.attributes.color, U = g.attributes.uv, N = g.attributes.normal;
    const SW = g.attributes.aSway, RT = g.attributes.aRoot, AL = g.attributes.aAlt;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: P.count, materialIndex: 0 }];
    const sh = shade ?? !C;
    for (const grp of groups) {
      const m = mats[grp.materialIndex || 0] || mats[0];
      const px = m.map ? pixelsOf(m.map) : null;
      const both = m.side === THREE.DoubleSide;
      const end = Math.min(P.count, grp.start + grp.count);
      for (let i = grp.start; i + 2 < end; i += 3) {
        const cols = [], tp = [], tn = [];
        let tg = null;
        if (SW && (SW.getX(i) > 0 || SW.getX(i + 1) > 0 || SW.getX(i + 2) > 0)) {
          tg = { sw: [], rt: [], alt: [] };
          for (let k = 0; k < 3; k++) {
            const j = i + k;
            tg.sw.push(SW.getX(j), SW.getY(j), SW.getZ(j), SW.getW(j));
            v.fromBufferAttribute(RT, j).applyMatrix4(rel); tg.rt.push(v.x, v.y, v.z);
            tg.alt.push(AL ? AL.getX(j) : 0, AL ? AL.getY(j) : 0, AL ? AL.getZ(j) : 0);
          }
        }
        for (let k = 0; k < 3; k++) {
          const j = i + k;
          v.fromBufferAttribute(P, j).applyMatrix4(rel); tp.push(v.x, v.y, v.z);
          if (N) { n.fromBufferAttribute(N, j).applyMatrix3(nm).normalize(); tn.push(n.x, n.y, n.z); }
          c.copy(m.color || t.setRGB(1, 1, 1));
          if (C) c.multiply(t.fromBufferAttribute(C, j));
          if (px && U) c.multiply(sample(px, U.getX(j), U.getY(j), t));
          cols.push(c.clone());
        }
        if (flat) {
          const avg = cols[0].clone().add(cols[1]).add(cols[2]).multiplyScalar(1 / 3);
          if (px && U) { const u = (U.getX(i) + U.getX(i + 1) + U.getX(i + 2)) / 3, w = (U.getY(i) + U.getY(i + 1) + U.getY(i + 2)) / 3; avg.copy(m.color || t.setRGB(1, 1, 1)).multiply(sample(px, u, w, t)); }
          cols[0] = cols[1] = cols[2] = avg;
        }
        if (snap) for (const q of new Set(cols)) snap(q);
        const push = (a, b, d) => {
          pos.push(tp[a * 3], tp[a * 3 + 1], tp[a * 3 + 2], tp[b * 3], tp[b * 3 + 1], tp[b * 3 + 2], tp[d * 3], tp[d * 3 + 1], tp[d * 3 + 2]);
          col.push(cols[a], cols[b], cols[d]);
          nor.push(!flat && tn.length ? [tn.slice(a * 3, a * 3 + 3), tn.slice(b * 3, b * 3 + 3), tn.slice(d * 3, d * 3 + 3)] : null);
          shadeTri.push(sh);
          tags.push(tg && { sw: [a, b, d].flatMap((q) => tg.sw.slice(q * 4, q * 4 + 4)), rt: [a, b, d].flatMap((q) => tg.rt.slice(q * 3, q * 3 + 3)), alt: [a, b, d].flatMap((q) => tg.alt.slice(q * 3, q * 3 + 3)) });
        };
        push(0, 1, 2);
        if (both) push(0, 2, 1);
      }
    }
    if (g !== o.geometry) g.dispose();
  });
  const box = new THREE.Box3();
  for (let i = 0; i < pos.length; i += 3) box.expandByPoint(v.set(pos[i], pos[i + 1], pos[i + 2]));
  for (const e of extras) {
    if (!e.geometry) continue;
    if (!e.geometry.boundingBox) e.geometry.computeBoundingBox();
    box.union(e.geometry.boundingBox.clone().applyMatrix4(e.userData.rel));
  }
  return { pos, col, nor, shade: shadeTri, tags, extras, box, tris: pos.length / 9 };
}

export function fitMatrix(data, height) {
  const b = data.box;
  if (b.isEmpty()) return new THREE.Matrix4();
  const h = b.max.y - b.min.y, s = h > 1e-6 ? height / h : 1;
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  return new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-cx, -b.min.y, -cz));
}

export function bakeInto(B, data, extrasParent, prepMaterial) {
  const { pos, col, nor, shade, tags } = data;
  for (let t = 0, i = 0; i < pos.length; i += 9, t++) {
    B.vtag = tags?.[t] || null;
    B.ctri([pos[i], pos[i + 1], pos[i + 2]], [pos[i + 3], pos[i + 4], pos[i + 5]], [pos[i + 6], pos[i + 7], pos[i + 8]], [col[t * 3], col[t * 3 + 1], col[t * 3 + 2]], nor[t], true, shade[t]);
  }
  B.vtag = null;
  for (const e of data.extras) {
    const o = e.clone();
    o.matrixAutoUpdate = false;
    o.matrix.multiplyMatrices(B.m, e.userData.rel);
    if (prepMaterial && o.material) o.material = Array.isArray(o.material) ? o.material.map(prepMaterial) : prepMaterial(o.material);
    extrasParent.add(o);
  }
}
