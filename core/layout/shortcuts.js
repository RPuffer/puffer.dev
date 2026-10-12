import { edgeKey } from "./topology.js";

export const KINDS = ["door", "lever", "ladder", "drop", "pad"];
export const WINDOWS = [[0.4, 0.6], [0.75, 0.95]];
export const DETOUR_REWARD = 6;
export const NEAR_STEPS = 6;
export const SAVE = { cells: 5, share: 0.72 };

const unuk = (s) => s.split(",").map(Number);
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

function routeGraph(M) {
  const adj = new Map();
  const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); if (!adj.has(b)) adj.set(b, new Set()); adj.get(a).add(b); adj.get(b).add(a); };
  for (const l of M.lines) if (l.role !== "exit") for (let i = 1; i < l.units.length; i++) add(l.units[i - 1], l.units[i]);
  return adj;
}

function bfsFrom(adj, from) {
  const d = new Map([[from, 0]]), q = [from];
  for (let i = 0; i < q.length; i++) for (const n of adj.get(q[i]) || []) if (!d.has(n)) { d.set(n, d.get(q[i]) + 1); q.push(n); }
  return d;
}

export function connectPad(M, rng, unit) {
  if (M.used.has(unit)) return { line: null, detour: 0, from: unit };
  const g = M.graph, free = (v) => M.allowPre(v) && !M.used.has(v);
  const prev = new Map([[unit, null]]), q = [unit];
  let hit = null;
  for (let i = 0; i < q.length && !hit; i++) for (const n of g.land(q[i])) {
    if (prev.has(n)) continue;
    if (M.used.has(n) && !M.exit.includes(n) && M.allowPre(n) && n !== M.G) { prev.set(n, q[i]); hit = n; break; }
    if (free(n)) { prev.set(n, q[i]); q.push(n); }
  }
  if (!hit) return null;
  const units = [];
  for (let k = hit; k != null; k = prev.get(k)) units.push(k);
  for (let i = 1; i < units.length; i++) M.h.set(units[i], Math.max(1, Math.min(M.Hg, M.h.get(units[i - 1]))));
  if (units.includes(M.B) && units.length > 1) M.h.set(units[1], M.h.get(M.B));
  return { units, detour: units.length - 1, from: hit };
}

export function drawShortcuts(SH, M, rng, { kinds = ["door", "lever"], windows = null, reward = false, count = 2, ninths = null } = {}) {
  const g = M.graph, s = SH.scale, B = M.B;
  const adj = routeGraph(M);
  const rd = bfsFrom(adj, B);
  const mainIdx = new Map(M.main.map((u, i) => [u, i]));
  const total = Math.max(1, M.main.length - 1);
  const cellOf = (u) => SH.centre(unuk(u));
  const detourOf = (u) => {
    const d = bfsFrom(adj, u);
    let best = Infinity, junction = null;
    for (const [v, dv] of d) if (mainIdx.has(v) && dv < best) { best = dv; junction = v; }
    return { detour: best, junction };
  };
  const progress = (u) => { const { detour, junction } = detourOf(u); return { p: (mainIdx.get(junction) ?? 0) / total, detour, junction }; };
  const nearSet = [...rd.keys()].filter((u) => rd.get(u) * s <= NEAR_STEPS + 1 && g.land(u).length && !M.exit.includes(u));
  const free = (v) => M.allowPre(v) && !M.used.has(v);
  const voidU = (v) => { const [x, z] = unuk(v); return x >= 0 && z >= 0 && x < SH.P.W && z < SH.P.H && !SH.landUnit([x, z]) && !M.used.has(v); };
  const stepNb = (u) => { const [x, z] = unuk(u); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => `${x + dx},${z + dz}`); };
  const voids = (path) => path.filter((u) => !SH.landUnit(unuk(u))).length;
  const out = [];
  const nearCells = [];
  const nearCell = (N, Y) => {
    const c = cellOf(N);
    if (N !== B) return c;
    const y = cellOf(Y), d = [Math.sign(y[0] - c[0]), Math.sign(y[1] - c[1])];
    return [c[0] + d[0], c[1] + d[1]];
  };

  const padUnits = new Set(SH.pads.flatMap((p) => [SH.uk(p.near), SH.uk(p.far)]));
  const options = (kind, useWindows = true) => {
    const opts = [];
    for (const F of rd.keys()) {
      if (padUnits.has(F) && kind === "lever") continue;
      if (F === B || F === M.G || M.exit.includes(F) || rd.get(F) < 3 || !g.land(F).length) continue;
      if (cheb(cellOf(F), cellOf(B)) < 2 * s) continue;
      const pr = progress(F);
      const prev = new Map([[F, null]]), q = [F], depth = new Map([[F, 0]]), vd = new Map([[F, 0]]);
      for (let i = 0; i < q.length; i++) {
        const c = q[i];
        if (depth.get(c) >= 9) continue;
        for (const n of stepNb(c)) {
          if (prev.has(n)) continue;
          const isVoid = voidU(n);
          if (!(free(n) || isVoid)) continue;
          if (isVoid && vd.get(c) >= 5) continue;
          prev.set(n, c); depth.set(n, depth.get(c) + 1); vd.set(n, vd.get(c) + (isVoid ? 1 : 0)); q.push(n);
        }
      }
      for (const Y of q) for (const N of stepNb(Y)) {
        if (!SH.landUnit(unuk(N))) continue;
        if (!nearSet.includes(N) || N === F || prev.has(N) && N !== Y && free(N)) continue;
        if (M.lineEdges.has(edgeKey(Y, N))) continue;
        const units = [];
        for (let k = Y; k != null; k = prev.get(k)) units.unshift(k);
        units.push(N);
        if (units.slice(1, -1).some((u) => !free(u) && !voidU(u))) continue;
        const lm = SH.landmassOf(unuk(N));
        if (units.some((u) => SH.landUnit(unuk(u)) && SH.landmassOf(unuk(u)) !== lm)) continue;
        if (!SH.landUnit(unuk(units[units.length - 2])) && units.length > 2 && false) continue;
        const k = units.length - 1;
        const cost = k + rd.get(N), saving = rd.get(F) - cost;
        if (saving * s < SAVE.cells || cost > SAVE.share * rd.get(F)) continue;
        const hF = M.h.get(F), hN = M.h.get(N);
        let heights = null, hf = null;
        if (kind === "ladder" || kind === "drop") {
          if (hF - hN < 2) continue;
          hf = hF;
        } else {
          const flatEnd = N === B;
          const span = flatEnd ? k - 1 : k;
          if (Math.abs(hF - hN) > span || (flatEnd && k === 1 && hF !== hN)) continue;
          heights = units.map((_, i) => (i === 0 ? hF : i === k ? hN : flatEnd && i === k - 1 ? hN : Math.round(hF + ((hN - hF) * i) / Math.max(1, span))));
          let bad = false;
          for (let i = 1; i < heights.length; i++) if (Math.abs(heights[i] - heights[i - 1]) > 1) bad = true;
          if (bad || heights.some((v) => v < 1 || v > M.Hg)) continue;
        }
        if (kind === "lever" && rd.get(F) < 3) continue;
        const nc = nearCell(N, Y);
        let score = saving + rng.float(0, 1.5) - 1.5 * voids(units);
        if (windows) {
          const w = windows[Math.min(out.length, windows.length - 1)];
          const slack = useWindows ? 0.08 : 0.6;
          if (pr.p < w[0] - slack || pr.p > w[1] + slack) continue;
          score += pr.p >= w[0] && pr.p <= w[1] ? 6 : 0;
        }
        const detourCells = Number.isFinite(pr.detour) ? pr.detour * s : 0;
        let rewardHere = false;
        if (reward && detourCells >= DETOUR_REWARD) {
          if (M.chestAt) continue;
          rewardHere = true;
        }
        if (nearCells.some((c) => cheb(c, nc) < 4)) score -= 8;
        if (ninths) {
          const [fx, fz] = cellOf(F), c = Math.min(2, Math.floor((fx / SH.W) * 3)), r = Math.min(2, Math.floor((fz / SH.D) * 3));
          if (r * 3 + c === ninths[Math.min(out.length, ninths.length - 1)]) score += 4;
        }
        opts.push({ kind, F, N, units, heights, hf, saving, cost, score, nearCell: nc, progress: +pr.p.toFixed(2), detour: detourCells, junction: pr.junction, rewardHere });
      }
    }
    return opts.sort((a, b) => b.score - a.score);
  };

  const taken = (o) => o.units.slice(1, -1).some((u) => M.used.has(u)) || o.units.some((u, i) => i && M.lineEdges.has(edgeKey(o.units[i - 1], u)));
  const ids = {};
  const commit = (o) => {
    const n = (ids[o.kind] = (ids[o.kind] || 0) + 1);
    const id = o.kind === "drop" ? (n > 1 ? `ladder${n}` : "ladder") : n > 1 ? `${o.kind}${n}` : o.kind;
    for (const u of o.units.slice(1, -1)) { M.used.add(u); M.h.set(u, o.hf ?? o.heights[o.units.indexOf(u)]); }
    for (let i = 1; i < o.units.length; i++) M.lineEdges.add(edgeKey(o.units[i - 1], o.units[i]));
    if (o.rewardHere) M.chestAt = { tip: o.F, from: o.junction && o.junction !== o.F ? [...adj.get(o.F)][0] : null, line: id, unit: o.F };
    const sc = { id, kind: o.kind, units: o.units, heights: o.heights, hf: o.hf, far: o.F, near: o.N, nearCell: o.nearCell, progress: o.progress, detour: o.detour, junction: o.junction, reward: o.rewardHere ? "chest" : null, saving: o.saving };
    out.push(sc);
    nearCells.push(o.nearCell);
    return sc;
  };

  const padPair = SH.pads.find((p) => p.role === "shortcut");
  const synthPad = () => {
    if (M.noPads || out.some((q) => q.kind === "pad") || SH.pads.length + (M.exitPad ? 1 : 0) >= 3) return false;
    const busy = new Set(SH.pads.flatMap((p) => [SH.uk(p.near), SH.uk(p.far)]));
    const win = windows ? windows[Math.min(out.length, windows.length - 1)] : [0.5, 0.95];
    const cands = M.main.filter((u, i) => {
      const p = i / total;
      return p >= win[0] && p <= win[1] && !busy.has(u) && u !== M.G && cheb(cellOf(u), cellOf(B)) >= 3 * s && rd.get(u) * s >= 10;
    });
    if (!cands.length || busy.has(B)) return false;
    const F = rng.pick(cands);
    const pad = { id: "s", role: "shortcut", near: unuk(B), far: unuk(F) };
    out.push({ id: "pad", kind: "pad", pad, far: F, near: B, nearCell: cellOf(B), progress: +(mainIdx.get(F) / total).toFixed(2), detour: 0, reward: null });
    nearCells.push(cellOf(B));
    return true;
  };
  for (const kind of kinds) {
    if (out.length >= count) break;
    if (kind === "pad") {
      if (M.noPads || SH.pads.filter((p) => p.role !== "shortcut").length + (M.exitPad ? 1 : 0) >= 3) continue;
      if (!padPair) { synthPad(); continue; }
      const nearU = SH.uk(padPair.near), farU = SH.uk(padPair.far);
      const nearLink = connectPad(M, rng, nearU);
      const farLink = connectPad(M, rng, farU);
      if (!nearLink || !farLink) continue;
      for (const [L, tag] of [[nearLink, "padnear"], [farLink, "padfar"]]) if (L.line !== null && L.units?.length > 1) {
        const units = L.units.slice().reverse();
        for (let i = 1; i < units.length; i++) M.lineEdges.add(edgeKey(units[i - 1], units[i]));
        for (const u of units) M.used.add(u);
        M.lines.push({ id: tag, role: "branch", units });
      }
      const detourCells = farLink.detour * s;
      const rewardHere = reward && detourCells >= DETOUR_REWARD && !M.chestAt;
      if (reward && detourCells >= DETOUR_REWARD && !rewardHere) continue;
      if (rewardHere) M.chestAt = { tip: farU, from: farLink.units?.[farLink.units.length - 2] ?? null, line: "padfar", unit: farU };
      const pr = progress(farLink.from);
      out.push({ id: "pad", kind: "pad", pad: padPair, far: farU, near: nearU, nearCell: cellOf(nearU), progress: +pr.p.toFixed(2), detour: detourCells, junction: pr.junction, reward: rewardHere ? "chest" : null });
      nearCells.push(cellOf(nearU));
      continue;
    }
    const o = options(kind).find((q) => !taken(q));
    if (o) commit(o);
  }
  for (const pass of [true, false]) for (const kind of [...kinds.filter((k) => k !== "pad"), "door", "lever", "ladder", "drop"]) {
    if (out.length >= Math.min(count, 2)) break;
    if (!pass && out.some((q) => q.kind === kind)) continue;
    const o = options(kind, pass).find((q) => !taken(q));
    if (o) commit(o);
  }
  if (!out.length) synthPad();
  if (!out.length) throw new Error(`${SH.id}: no shortcut fits`);
  M.shortcuts = out;
  return out;
}
