import * as THREE from "three";

export class Mesher {
  constructor() { this.pos = []; this.nor = []; this.col = []; }

  tri(a, b, c, color) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    const col = color instanceof THREE.Color ? color : new THREE.Color(color);
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(col.r, col.g, col.b);
    }
  }

  quad(a, b, c, d, color) { this.tri(a, b, c, color); this.tri(a, c, d, color); }

  box(x0, y0, z0, x1, y1, z1, { top, side, sideX, sideZ, bottom } = {}) {
    const sx = sideX || side, sz = sideZ || side;
    if (top) this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], top);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], bottom);
    if (sz) {
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], sz);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], sz);
    }
    if (sx) {
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], sx);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], sx);
    }
  }

  wedge(x0, z0, x1, z1, yLow, yHigh, downhill, { top, side }) {
    const H = (x, z) => {
      const t = { n: (z1 - z) / (z1 - z0), s: (z - z0) / (z1 - z0), e: (x - x0) / (x1 - x0), w: (x1 - x) / (x1 - x0) }[downhill];
      return yHigh - (yHigh - yLow) * t;
    };
    const p = (x, z) => [x, H(x, z), z];
    const b = (x, z) => [x, yLow, z];
    this.quad(p(x0, z0), p(x0, z1), p(x1, z1), p(x1, z0), top);
    const edges = [[[x0, z1], [x1, z1]], [[x1, z0], [x0, z0]], [[x1, z1], [x1, z0]], [[x0, z0], [x0, z1]]];
    for (const [[ax, az], [bx, bz]] of edges) {
      const ha = H(ax, az), hb = H(bx, bz);
      if (ha - yLow < 1e-6 && hb - yLow < 1e-6) continue;
      if (ha - yLow < 1e-6) this.tri(b(ax, az), b(bx, bz), p(bx, bz), side);
      else if (hb - yLow < 1e-6) this.tri(b(ax, az), b(bx, bz), p(ax, az), side);
      else this.quad(b(ax, az), b(bx, bz), p(bx, bz), p(ax, az), side);
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}
