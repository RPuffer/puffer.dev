import * as THREE from "three";
import { lightFactor, packShade } from "./style.js";

const HALF = Math.PI / 2;
const cache = new Map();
export const col = (hex) => {
  if (hex instanceof THREE.Color) return hex;
  let c = cache.get(hex);
  if (!c) { c = new THREE.Color(hex); cache.set(hex, c); }
  return c;
};

export const tone = (top, left, right, mid) => ({ top, left, right, mid });
export const solid = (hex) => ({ top: hex, left: hex, right: hex, mid: hex });

const tmp = new THREE.Color(), tmp2 = new THREE.Color();

export function shadeFor(pal, nx, ny, nz, out = new THREE.Color()) {
  if (typeof pal === "string" || pal instanceof THREE.Color) return out.copy(col(pal));
  if (ny > 0.8) return out.copy(col(pal.top));
  let t = Math.atan2(nx, nz);
  if (t < 0) t = 0;
  if (t > HALF) t = HALF;
  const u = t / HALF;
  if (pal.mid && u > 0.3 && u < 0.7) tmp.copy(col(pal.mid));
  else tmp.copy(col(pal.left)).lerp(col(pal.right), u < 0.3 ? 0 : u > 0.7 ? 1 : u);
  if (ny > 0.35) return out.copy(tmp).lerp(col(pal.top), Math.min(1, (ny - 0.35) / 0.45));
  if (ny < -0.3) return out.copy(tmp).multiplyScalar(0.85);
  return out.copy(tmp);
}

export function roundRect(x0, z0, x1, z1, r, seg = 2) {
  const pts = [];
  r = Math.min(r, (x1 - x0) / 2, (z1 - z0) / 2);
  const corners = [[x1 - r, z1 - r, 0], [x1 - r, z0 + r, 1], [x0 + r, z0 + r, 2], [x0 + r, z1 - r, 3]];
  for (const [cx, cz, k] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = k * HALF + (i / seg) * HALF;
      if (r <= 0) { pts.push([cx, cz]); break; }
      pts.push([cx + Math.sin(a) * r, cz + Math.cos(a) * r]);
    }
  }
  return pts;
}

export function circle(cx, cz, rx, rz = rx, n = 8, a0 = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2; pts.push([cx + Math.sin(a) * rx, cz + Math.cos(a) * rz]); }
  return pts;
}

export class Baker {
  constructor(light = null) {
    this.light = light;
    this.pos = []; this.col = []; this.nor = [];
    this.m = new THREE.Matrix4();
    this.stack = [];
    this.nm = new THREE.Matrix3();
    this._v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  }

  push(x = 0, y = 0, z = 0, rotY = 0, s = 1) {
    this.stack.push(this.m.clone());
    const t = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(s, s, s));
    this.m.multiply(t);
    return this;
  }

  pushMatrix(mat) { this.stack.push(this.m.clone()); this.m.multiply(mat); return this; }

  pop() { this.m = this.stack.pop(); return this; }

  at(x, y, z, rotY, fn, s = 1) { this.push(x, y, z, rotY, s); fn(); this.pop(); }

  tri(a, b, c, pal, cull = true) {
    const [A, B, C] = this._v;
    A.set(a[0], a[1], a[2]).applyMatrix4(this.m);
    B.set(b[0], b[1], b[2]).applyMatrix4(this.m);
    C.set(c[0], c[1], c[2]).applyMatrix4(this.m);
    const ux = B.x - A.x, uy = B.y - A.y, uz = B.z - A.z, vx = C.x - A.x, vy = C.y - A.y, vz = C.z - A.z;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-12) return;
    nx /= l; ny /= l; nz /= l;
    if (cull && !this.noCull && nx < -0.2 && nz < -0.2 && ny < 0.2) return;
    const c0 = shadeFor(pal, nx, ny, nz, tmp2);
    if (this.light) c0.multiplyScalar(lightFactor(this.light, nx, ny, nz));
    for (const P of [A, B, C]) { this.pos.push(P.x, P.y, P.z); this.col.push(c0.r, c0.g, c0.b); this.nor.push(nx, ny, nz); }
  }

  ctri(a, b, c, cols, norms = null, cull = true, shade = false) {
    const [A, B, C] = this._v;
    A.set(a[0], a[1], a[2]).applyMatrix4(this.m);
    B.set(b[0], b[1], b[2]).applyMatrix4(this.m);
    C.set(c[0], c[1], c[2]).applyMatrix4(this.m);
    const ux = B.x - A.x, uy = B.y - A.y, uz = B.z - A.z, vx = C.x - A.x, vy = C.y - A.y, vz = C.z - A.z;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-12) return;
    nx /= l; ny /= l; nz /= l;
    if (cull && !this.noCull && nx < -0.2 && nz < -0.2 && ny < 0.2) return;
    const nm = norms ? this.nm.getNormalMatrix(this.m) : null;
    const P = [A, B, C], n = new THREE.Vector3();
    for (let i = 0; i < 3; i++) {
      if (norms) n.set(norms[i][0], norms[i][1], norms[i][2]).applyMatrix3(nm).normalize(); else n.set(nx, ny, nz);
      tmp2.copy(cols[i]);
      if (shade) tmp2.multiplyScalar(packShade(n.x, n.y, n.z));
      if (this.light) tmp2.multiplyScalar(lightFactor(this.light, n.x, n.y, n.z));
      this.pos.push(P[i].x, P[i].y, P[i].z); this.col.push(tmp2.r, tmp2.g, tmp2.b); this.nor.push(n.x, n.y, n.z);
    }
  }

  quad(a, b, c, d, pal) { this.tri(a, b, c, pal); this.tri(a, c, d, pal); }

  poly(pts, y, pal, down = false) {
    for (let i = 1; i < pts.length - 1; i++) {
      const a = [pts[0][0], y, pts[0][1]], b = [pts[i][0], y, pts[i][1]], c = [pts[i + 1][0], y, pts[i + 1][1]];
      if (down) this.tri(a, c, b, pal); else this.tri(a, b, c, pal);
    }
  }

  prism(pts, y0, y1, pal, { top = true, bottom = false, sides = true, topPal } = {}) {
    if (top) this.poly(pts, y1, topPal || pal);
    if (bottom) this.poly(pts, y0, pal, true);
    if (!sides) return;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      this.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], pal);
    }
  }

  frustum(pts0, pts1, y0, y1, pal, { top = true } = {}) {
    if (top) this.poly(pts1, y1, pal);
    const n = pts0.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.quad([pts0[i][0], y0, pts0[i][1]], [pts0[j][0], y0, pts0[j][1]], [pts1[j][0], y1, pts1[j][1]], [pts1[i][0], y1, pts1[i][1]], pal);
    }
  }

  box(w, h, d, pal, x = 0, y = 0, z = 0, opts) { this.prism([[x + w / 2, z + d / 2], [x + w / 2, z - d / 2], [x - w / 2, z - d / 2], [x - w / 2, z + d / 2]], y, y + h, pal, opts); }

  rbox(w, h, d, r, pal, x = 0, y = 0, z = 0, opts) { this.prism(roundRect(x - w / 2, z - d / 2, x + w / 2, z + d / 2, r), y, y + h, pal, opts); }

  cyl(r, h, pal, x = 0, y = 0, z = 0, n = 8, opts) { this.prism(circle(x, z, r, r, n, Math.PI / n), y, y + h, pal, opts); }

  cone(r0, r1, h, pal, x = 0, y = 0, z = 0, n = 8) {
    const a = circle(x, z, r0, r0, n, Math.PI / n);
    if (r1 <= 0) { for (let i = 0; i < n; i++) { const p = a[i], q = a[(i + 1) % n]; this.tri([p[0], y, p[1]], [q[0], y, q[1]], [x, y + h, z], pal); } return; }
    this.frustum(a, circle(x, z, r1, r1, n, Math.PI / n), y, y + h, pal);
  }

  ball(r, pal, x = 0, y = 0, z = 0, sy = 1, detail = 1) { this.geo(new THREE.IcosahedronGeometry(r, detail), pal, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, sy, 1))); }

  geo(g, pal, mat) {
    const G = g.index ? g.toNonIndexed() : g;
    const p = G.attributes.position.array;
    if (mat) this.pushMatrix(mat);
    for (let i = 0; i < p.length; i += 9) this.tri([p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]], pal);
    if (mat) this.pop();
    g.dispose(); if (G !== g) G.dispose();
  }

  rot(axis, angle, x = 0, y = 0, z = 0) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis).normalize(), angle);
    return this.pushMatrix(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)));
  }

  flat(pts, y, pal) { this.poly(pts, y, pal); }

  vpoly(pts2, pal) {
    for (let i = 1; i < pts2.length - 1; i++) this.tri(pts2[0], pts2[i], pts2[i + 1], pal, false);
  }

  get empty() { return this.pos.length === 0; }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

export const bakedMaterial = () => new THREE.MeshBasicMaterial({ vertexColors: true });
