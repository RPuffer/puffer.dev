import { neighbours, isWalkable } from "./level.js";

const key = (x, z) => x + "," + z;

export function findPath(L, from, to) {
  const [sx, sz] = from, [tx, tz] = to;
  if (sx === tx && sz === tz) return [[sx, sz]];
  if (!isWalkable(L, tx, tz)) return null;
  const h = (x, z) => Math.abs(x - tx) + Math.abs(z - tz);
  const open = [{ x: sx, z: sz, g: 0, f: h(sx, sz) }];
  const came = new Map(), gScore = new Map([[key(sx, sz), 0]]);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f || (open[i].f === open[bi].f && open[i].g > open[bi].g)) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === tx && cur.z === tz) {
      const out = [[tx, tz]];
      let k = key(tx, tz);
      while (came.has(k)) { const p = came.get(k); out.push(p); k = key(p[0], p[1]); }
      return out.reverse();
    }
    if (cur.g > gScore.get(key(cur.x, cur.z))) continue;
    for (const [nx, nz] of neighbours(L, cur.x, cur.z)) {
      const g = cur.g + 1, k = key(nx, nz);
      if (g < (gScore.get(k) ?? Infinity)) {
        gScore.set(k, g);
        came.set(k, [cur.x, cur.z]);
        open.push({ x: nx, z: nz, g, f: g + h(nx, nz) });
      }
    }
  }
  return null;
}

export function reachable(L, from) {
  const seen = new Set([key(from[0], from[1])]), out = [from], q = [from];
  while (q.length) {
    const [x, z] = q.shift();
    for (const [nx, nz] of neighbours(L, x, z)) {
      const k = key(nx, nz);
      if (!seen.has(k)) { seen.add(k); out.push([nx, nz]); q.push([nx, nz]); }
    }
  }
  return out;
}

export function pathToward(L, from, to) {
  const direct = findPath(L, from, to);
  if (direct) return direct;
  let best = null, bd = Infinity;
  for (const c of reachable(L, from)) {
    const d = Math.hypot(c[0] - to[0], c[1] - to[1]);
    if (d < bd) { bd = d; best = c; }
  }
  return best ? findPath(L, from, best) : null;
}
