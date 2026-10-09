import { neighbours, isWalkable } from "./level.js";

const key = (x, z) => x + "," + z;
const TURN_COST = 1e-3;

function push(heap, n) {
  heap.push(n);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (!less(heap[i], heap[p])) break;
    [heap[i], heap[p]] = [heap[p], heap[i]];
    i = p;
  }
}

function pop(heap) {
  const top = heap[0], last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < heap.length && less(heap[l], heap[m])) m = l;
      if (r < heap.length && less(heap[r], heap[m])) m = r;
      if (m === i) break;
      [heap[i], heap[m]] = [heap[m], heap[i]];
      i = m;
    }
  }
  return top;
}

const less = (a, b) => a.f < b.f || (a.f === b.f && a.g > b.g);

export function findPath(L, from, to) {
  const [sx, sz] = from, [tx, tz] = to;
  if (sx === tx && sz === tz) return [[sx, sz]];
  if (!isWalkable(L, tx, tz)) return null;
  const h = (x, z) => Math.abs(x - tx) + Math.abs(z - tz);
  const open = [];
  push(open, { x: sx, z: sz, g: 0, f: h(sx, sz), d: null });
  const came = new Map(), gScore = new Map([[key(sx, sz), 0]]);
  while (open.length) {
    const cur = pop(open);
    if (cur.x === tx && cur.z === tz) {
      const out = [[tx, tz]];
      let k = key(tx, tz);
      while (came.has(k)) { const p = came.get(k); out.push(p); k = key(p[0], p[1]); }
      return out.reverse();
    }
    if (cur.g > gScore.get(key(cur.x, cur.z))) continue;
    for (const [nx, nz, dir] of neighbours(L, cur.x, cur.z)) {
      const g = cur.g + 1 + (cur.d && cur.d !== dir ? TURN_COST : 0), k = key(nx, nz);
      if (g < (gScore.get(k) ?? Infinity)) {
        gScore.set(k, g);
        came.set(k, [cur.x, cur.z]);
        push(open, { x: nx, z: nz, g, f: g + h(nx, nz), d: dir });
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

export function routeTo(L, from, to) {
  const direct = findPath(L, from, to);
  if (direct) return { cells: direct, reached: true };
  let best = null, bd = Infinity;
  for (const c of reachable(L, from)) {
    const d = Math.hypot(c[0] - to[0], c[1] - to[1]);
    if (d < bd) { bd = d; best = c; }
  }
  const cells = best && findPath(L, from, best);
  return cells ? { cells, reached: false } : null;
}

export function pathToward(L, from, to) {
  return routeTo(L, from, to)?.cells || null;
}
