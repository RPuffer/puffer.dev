export const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const DIR = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
export const dirOf = (dx, dz) => Object.keys(DIR).find((d) => DIR[d][0] === dx && DIR[d][1] === dz);
export const key = (x, z) => x + "," + z;
export const unkey = (k) => k.split(",").map(Number);

export function createGrid(W, D) {
  const cells = Array.from({ length: D }, () => Array.from({ length: W }, () => ({ h: 0, s: "none" })));
  const owner = Array.from({ length: D }, () => new Array(W).fill(null));
  return {
    W, D, cells, owner,
    in: (x, z) => x >= 0 && z >= 0 && x < W && z < D,
    at(x, z) { return this.in(x, z) ? cells[z][x] : null; },
    set(x, z, c, who) { if (!this.in(x, z)) return false; cells[z][x] = { ...c }; if (who !== undefined) owner[z][x] = who; return true; },
    who(x, z) { return this.in(x, z) ? owner[z][x] : null; },
    land(x, z) { const c = this.at(x, z); return !!c && c.h >= 1 && c.s !== "none" && c.s !== "water"; },
    each(f) { for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) f(cells[z][x], x, z); },
  };
}

export function walk(points) {
  const out = [];
  const push = (x, z) => { const l = out[out.length - 1]; if (!l || l[0] !== x || l[1] !== z) out.push([x, z]); };
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    if (!i) { push(x, z); continue; }
    let [cx, cz] = out[out.length - 1];
    while (cx !== x) { cx += Math.sign(x - cx); push(cx, cz); }
    while (cz !== z) { cz += Math.sign(z - cz); push(cx, cz); }
  }
  return out;
}
