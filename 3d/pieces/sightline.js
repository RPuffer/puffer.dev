import { reachability, VIEW } from "../../core/procgen.js";
import { CATALOG } from "../../core/catalog.js";
import { canStep, DIRS } from "../../core/level.js";

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function camera(level) {
  const v = level.view || {}, pi = ((v.pitch ?? VIEW.pitch) * Math.PI) / 180, yi = ((v.yaw ?? VIEW.yaw) * Math.PI) / 180, tH = v.tileH ?? VIEW.tileH;
  const cam = [Math.cos(pi) * Math.sin(yi), Math.sin(pi), Math.cos(pi) * Math.cos(yi)];
  const faces = (d) => DIRS[d][0] * tH * cam[0] + cam[1] + DIRS[d][1] * tH * cam[2] > 0.05;
  const away = (c) => c?.s === "ramp" && !faces(c.d);
  return { cam, tH, faces, away, front: [Math.sign(cam[0]) || 1, Math.sign(cam[2]) || 1] };
}

function walkLevel(level, h) {
  const blocked = new Set(h.blockedSet());
  for (const t of level.things || []) if (t.kind === "bonfire" || t.kind === "chest") blocked.add(h.key(t.x, t.z));
  return { ...level, blocked, edges: new Set() };
}

export function pathBetween(level, h, from, goals) {
  const L = walkLevel(level, h), key = h.key;
  const isGoal = (x, z) => goals.some(([a, b]) => a === x && b === z);
  const prev = new Map([[key(...from), null]]), q = [from];
  while (q.length) {
    const [x, z] = q.shift();
    if (isGoal(x, z)) { const out = []; for (let k = key(x, z); k; k = prev.get(k)) out.unshift(k.split(",").map(Number)); return out; }
    for (const d of Object.keys(DIRS)) {
      if (!canStep(L, x, z, d)) continue;
      const X = x + DIRS[d][0], Z = z + DIRS[d][1];
      if (prev.has(key(X, Z))) continue;
      prev.set(key(X, Z), key(x, z)); q.push([X, Z]);
    }
  }
  return null;
}

export function routeCells(level, h) {
  const exit = (level.things || []).find((t) => t.kind === "elevator" && t.role === "exit");
  return (exit && pathBetween(level, h, level.spawn, [[exit.x, exit.z]])) || [];
}

export function courtCell(level, h) {
  const ring = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    if (!h.land(h.cell(x, z)) || h.isFig(x, z)) continue;
    if (Math.min(...h.figure.cells.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)))) === 1) ring.push([x, z]);
  }
  const p = ring.length && pathBetween(level, h, level.spawn, ring);
  return p ? p[p.length - 1] : null;
}

export function dropFront(level, h, cell, o = {}) {
  const C = camera(level), [sx, sz] = C.front, [x, z] = cell, reach = o.reach ?? 2;
  const top = (a, b) => { const c = h.cell(a, b); return c && c.s !== "none" ? (c.h || 0) * C.tH : 0; };
  const gate = (level.things || []).find((t) => t.kind === "gate");
  const gateCells = [...(gate?.threshold || []), ...(gate?.blocks || []), ...(gate?.edge || [])].map(([a, b]) => h.key(a, b));
  const y0 = top(x, z) + (o.lift ?? 0.15);
  let n = 0;
  for (let k = 1; k <= reach; k++) {
    const fx = x + k * sx, fz = z + k * sz;
    for (const d of h.decorAt(fx, fz)) {
      const spec = CATALOG[d.t] || level.palette?.props?.[d.t] || {};
      if (d === h.lead || d.watch || h.footprint(d).length > 1 || top(fx, fz) + (spec.height ?? 1) <= y0 + k - 0.5) continue;
      if (d.gapX != null && gateCells.includes(h.key(d.gapX, d.gapZ))) continue;
      const mates = d.gapX != null ? level.decor.filter((e) => e !== d && e.gapX === d.gapX && e.gapZ === d.gapZ) : [];
      h.removeDecor((e) => e === d);
      for (const m of mates) for (const k2 of ["side", "axis", "gapX", "gapZ"]) delete m[k2];
      h.log.push(`dropFront ${d.t}@${fx},${fz}: it hides the floor at ${x},${z}${mates.length ? `, its mate at ${mates.map((m) => m.x + "," + m.z).join(" ")} stays as a prop` : ""}`);
      n++;
    }
  }
  return n;
}

export function moveFront(level, h, cell, o = {}) {
  const C = camera(level), [sx, sz] = C.front, [x, z] = cell, reach = o.reach ?? 2;
  const top = (a, b) => { const c = h.cell(a, b); return c && c.s !== "none" ? (c.h || 0) * C.tH : 0; };
  const y0 = top(x, z) + (o.lift ?? 0.15);
  const thingAt = (a, b) => (level.things || []).some((t) => t.x === a && t.z === b);
  const route = new Set(routeCells(level, h).map(([a, b]) => h.key(a, b)));
  const shadow = new Set();
  for (const [a, b] of [...route].map((k) => k.split(",").map(Number)).concat([cell])) for (let k = 1; k <= reach; k++) shadow.add(h.key(a + k * sx, b + k * sz));
  let n = 0;
  for (let k = 1; k <= reach; k++) {
    const fx = x + k * sx, fz = z + k * sz;
    for (const d of h.decorAt(fx, fz)) {
      const spec = CATALOG[d.t] || level.palette?.props?.[d.t] || {};
      if (d === h.lead || d.watch || d.gapX != null || h.footprint(d).length > 1 || top(fx, fz) + (spec.height ?? 1) <= y0 + k - 0.5) continue;
      const spots = [];
      for (let b = 0; b < h.D; b++) for (let a = 0; a < h.W; a++) {
        const c = h.cell(a, b);
        if (!h.land(c) || c.s === "ramp" || c.s === "bridge" || h.isFig(a, b) || thingAt(a, b) || h.decorAt(a, b).length || route.has(h.key(a, b)) || shadow.has(h.key(a, b)) || (a === level.spawn[0] && b === level.spawn[1])) continue;
        spots.push([Math.abs(a - fx) + Math.abs(b - fz), a, b]);
      }
      spots.sort((p, q) => p[0] - q[0]);
      const m0 = h.reach().missing.length, ox = d.x, oz = d.z;
      let moved = null;
      for (const [, a, b] of spots.slice(0, 12)) { d.x = a; d.z = b; if (h.reach().missing.length <= m0) { moved = [a, b]; break; } }
      if (!moved) { d.x = ox; d.z = oz; continue; }
      h.log.push(`moveFront ${d.t}@${fx},${fz} -> ${moved}: it hid the floor at ${x},${z}`);
      n++;
    }
  }
  return n;
}

export function clearFloor(level, h, cells, o = {}) {
  const lift = o.lift ?? 0.15;
  const dropped = [];
  for (const [x, z] of cells) h.removeDecor((d) => {
    const spec = CATALOG[d.t] || level.palette?.props?.[d.t] || {};
    const hit = d !== h.lead && !d.watch && d.gapX == null && !!spec.passable && !spec.mask && h.footprint(d).length === 1 && (spec.height ?? 1) > lift && d.x === x && d.z === z;
    if (hit) dropped.push(`${d.t}@${x},${z}`);
    return hit;
  });
  if (dropped.length) h.log.push(`clearFloor: ${dropped.join(", ")} sat on route cells above the floor`);
  return dropped.length;
}

export function moveElevator(level, h, role, [x, z]) {
  const e = (level.things || []).find((t) => t.kind === "elevator" && t.role === role);
  const c = h.cell(x, z);
  if (!e || !c || c.h < 1 || ["none", "water", "ramp", "bridge"].includes(c.s) || h.isFig(x, z) || (level.things || []).some((t) => t !== e && t.x === x && t.z === z)) { h.log.push(`moveElevator ${role} -> ${x},${z}: not a flat free cell`); return false; }
  const sides = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const rot = sides.findIndex(([a, b]) => { const q = h.cell(x + a, z + b); return !q || q.s === "none"; });
  if (rot < 0) { h.log.push(`moveElevator ${role} -> ${x},${z}: not a rim cell`); return false; }
  const S0 = h.snapshot(), m0 = h.reach().missing.length;
  h.removeDecor((d) => d !== h.lead && h.footprint(d).some(([a, b]) => a === x && b === z));
  if (h.reach().missing.length > m0 || !pathBetween(level, h, level.spawn, [[x, z]])) { h.restore(S0); h.log.push(`moveElevator ${role} -> ${x},${z}: unreachable`); return false; }
  h.log.push(`moveElevator ${role} ${e.x},${e.z} -> ${x},${z} rot ${rot}`);
  Object.assign(e, { x, z, rot });
  return true;
}

export function faceClimb(level, h, o = {}) {
  const key = h.key, budget = o.budget ?? 3, edits = [];
  const C = camera(level);
  const flat = (c) => h.land(c) && c.s !== "ramp" && c.s !== "bridge";
  const lost = () => reachability({ ...level, blocked: h.blockedSet() }).missing.length;
  const route0 = h.approach({ walkOnly: true });
  const ri = route0.findIndex(([x, z]) => C.away(h.cell(x, z)));
  if (ri < 1 || ri >= route0.length - 1) return edits;
  const [rx, rz] = route0[ri], R = h.cell(rx, rz), m0 = lost();
  const hiOf = (x, z, d) => [x - DIRS[d][0], z - DIRS[d][1]], loOf = (x, z, d) => [x + DIRS[d][0], z + DIRS[d][1]];
  const thingAt = (x, z) => (level.things || []).some((t) => t.x === x && t.z === z);
  const small = (x, z) => !h.isFig(x, z) && !thingAt(x, z) && h.decorAt(x, z).every((d) => d !== h.lead && !d.watch && d.gapX == null && h.footprint(d).length === 1 && (CATALOG[d.t]?.height ?? 1) < 1.5);
  const clear = (x, z) => h.removeDecor((d) => h.footprint(d).some(([a, b]) => a === x && b === z));
  const onList = (list, a, b) => list.some(([c, e]) => c === a && e === b);
  const after = route0.slice(ri + 1), tail = route0.slice(ri + 2);
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const cell = h.cell(x, z);
    if (!flat(cell) || cell.h < 2 || !small(x, z) || (x === level.spawn[0] && z === level.spawn[1])) continue;
    for (const d of Object.keys(DIRS).filter(C.faces)) {
      const hi = h.cell(...hiOf(x, z, d)), lo = h.cell(...loOf(x, z, d));
      if (!flat(hi) || hi.h !== cell.h || !flat(lo) || lo.h !== cell.h - 1 || !small(...loOf(x, z, d)) || !small(...hiOf(x, z, d))) continue;
      const S = h.snapshot();
      h.set(rx, rz, { h: R.h - 1, s: R.m || h.surf.ground });
      clear(x, z); clear(...loOf(x, z, d)); clear(...hiOf(x, z, d));
      h.set(x, z, { h: cell.h, s: "ramp", d, m: cell.s });
      const extra = [];
      for (const [mx, mz] of reachability({ ...level, blocked: h.blockedSet() }).missing) {
        const M = h.cell(mx, mz);
        if (extra.length >= budget - 2 || !flat(M) || M.h < 2) continue;
        h.set(mx, mz, { ...M, h: M.h - 1 });
        extra.push([mx, mz]);
      }
      const r = h.approach({ walkOnly: true });
      const ok = r.length && lost() <= m0 && r.some(([a, b]) => onList(after, a, b)) && !r.some(([a, b]) => C.away(h.cell(a, b)));
      const keeps = tail.every(([a, b]) => onList(r, a, b));
      const score = r.length + (keeps ? 0 : 100);
      if (ok && (!best || score < best.score)) best = { x, z, d, score, extra };
      h.restore(S);
    }
  }
  if (!best) { h.log.push(`faceClimb: no camera-facing climb replaces ${rx},${rz}`); return edits; }
  const edit = (x, z, to, kind) => { const c = h.cell(x, z); edits.push({ x, z, kind, from: { h: c.h, s: c.s }, to: { h: to.h, s: to.s } }); h.set(x, z, to); };
  edit(rx, rz, { h: R.h - 1, s: R.m || h.surf.ground }, "lower");
  clear(best.x, best.z); clear(...loOf(best.x, best.z, best.d)); clear(...hiOf(best.x, best.z, best.d));
  edit(best.x, best.z, { h: h.cell(best.x, best.z).h, s: "ramp", d: best.d, m: h.cell(best.x, best.z).s }, "ramp");
  for (const [mx, mz] of best.extra) edit(mx, mz, { ...h.cell(mx, mz), h: h.cell(mx, mz).h - 1 }, "lower");
  const route = h.approach({ walkOnly: true });
  const onR = new Set(route.map(([a, b]) => key(a, b)));
  const upTo = route.findIndex(([a, b]) => a === best.x && b === best.z);
  const [fx, fz] = C.front;
  for (const [qx, qz] of route.slice(0, upTo)) {
    for (const [a, b] of [[fx, fz], [fx, 0], [0, fz]]) {
      if (edits.length >= budget) break;
      const nx = qx + a, nz = qz + b, N = h.cell(nx, nz), q = h.cell(qx, qz);
      if (!flat(N) || !flat(q) || N.h <= q.h || onR.has(key(nx, nz)) || !small(nx, nz) || thingAt(nx, nz)) continue;
      const S = h.snapshot(), before = edits.length;
      clear(nx, nz);
      edit(nx, nz, { ...N, h: q.h }, "lower");
      const r = h.approach({ walkOnly: true });
      if (!r.length || lost() > m0 || r.length > route.length || r.some(([c, e]) => C.away(h.cell(c, e)))) { h.restore(S); edits.length = before; }
    }
  }
  level.edits = [...(level.edits || []), ...edits];
  h.log.push(`faceClimb ${edits.map((e) => `${e.kind} ${e.x},${e.z}`).join(", ")}`);
  return edits;
}
