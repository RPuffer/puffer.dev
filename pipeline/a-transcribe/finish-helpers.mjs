import { CATALOG } from "../../core/catalog.js";
import { reachability } from "../../core/procgen.js";
import { DIRS, OPPOSITE, canStep } from "../../core/level.js";

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIR_OF = (dx, dz) => Object.keys(DIRS).find((d) => DIRS[d][0] === dx && DIRS[d][1] === dz);

export function makeHelpers(level, { regions, brief, figure, surf, terrain = () => 0 }) {
  const [W, D] = level.size;
  const log = [];
  const key = (x, z) => `${x},${z}`;
  const cell = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  const land = (c) => !!c && c.h >= 1 && c.s !== "none" && c.s !== "water";
  const figCells = figure.cells.map(([x, z]) => [x, z]);
  const isFig = (x, z) => figCells.some(([a, b]) => a === x && b === z);
  const lead = level.decor.find((d) => d.x === figure.anchor[0] && d.z === figure.anchor[1]);
  const footprint = (d) => {
    const spec = CATALOG[d.t] || { footprint: [1, 1] };
    const [fw, fd] = (d.rot || 0) % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    const out = [];
    for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) out.push([d.x + dx, d.z + dz]);
    return out;
  };
  const decorAt = (x, z) => level.decor.filter((d) => footprint(d).some(([a, b]) => a === x && b === z));
  const removeDecor = (pred) => {
    let n = 0;
    for (let i = level.decor.length - 1; i >= 0; i--) if (level.decor[i] !== lead && pred(level.decor[i])) { level.decor.splice(i, 1); n++; }
    return n;
  };
  const clear = (x, z, keepPassable = false) => removeDecor((d) => (!keepPassable || !CATALOG[d.t]?.passable) && footprint(d).some(([a, b]) => a === x && b === z));
  const set = (x, z, c) => { if (!cell(x, z)) return false; level.cells[z][x] = { ...c }; return true; };
  const put = (t, x, z, o = {}) => {
    if (!CATALOG[t]) { log.push(`put ${t}: not in catalog`); return false; }
    const d = { t, x, z, v: o.v ?? 0, rot: o.rot ?? 0, ox: o.ox ?? 0, oz: o.oz ?? 0 };
    for (const [a, b] of footprint(d)) { const c = cell(a, b); if ((!land(c) || c.s === "ramp") && t !== "waterfall") { log.push(`put ${t} ${x},${z}: not on flat land`); return false; } }
    if (o.keep && footprint(d).some(([a, b]) => decorAt(a, b).some((e) => e !== lead && o.keep.includes(e.t)))) return false;
    for (const [a, b] of footprint(d)) clear(a, b);
    for (const k of Object.keys(o)) if (!(k in d)) d[k] = o[k];
    level.decor.push(d);
    return true;
  };
  const blockedSet = () => {
    const s = new Set();
    for (const d of level.decor) if (!CATALOG[d.t]?.passable && d.t !== "waterfall") for (const [a, b] of footprint(d)) s.add(key(a, b));
    return s;
  };
  const reach = () => reachability({ ...level, blocked: blockedSet() });

  const plateau = (x0, z0, x1, z1, o = {}) => {
    const h = o.h ?? 2, s = o.s ?? (h >= 2 ? surf.raised : surf.ground);
    let n = 0;
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      const c = cell(x, z);
      if (!c || (!o.fill && !land(c))) continue;
      if (o.keepPath && c.s === surf.path) { level.cells[z][x] = { h, s: c.s }; n++; continue; }
      level.cells[z][x] = { h, s: isFig(x, z) && o.figSurface ? o.figSurface : s };
      if (!isFig(x, z) && o.clear !== false) clear(x, z, true);
      n++;
    }
    log.push(`plateau ${x0},${z0}-${x1},${z1} h${h} ${s} (${n} cells)`);
    return n;
  };

  const dais = (o = {}) => {
    const ring = o.ring ?? 1, s = o.s ?? "stone";
    const xs = figCells.map((c) => c[0]), zs = figCells.map((c) => c[1]);
    const h = o.h ?? Math.max(...figCells.map(([x, z]) => cell(x, z)?.h || 1));
    const x0 = Math.min(...xs) - ring, x1 = Math.max(...xs) + ring, z0 = Math.min(...zs) - ring, z1 = Math.max(...zs) + ring;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const c = cell(x, z);
      if (!land(c) && !isFig(x, z)) continue;
      level.cells[z][x] = { h, s };
      if (!isFig(x, z)) clear(x, z, !o.clearAll);
    }
    log.push(`dais h${h} ${s} ring ${ring} around ${figure.anchor}`);
    return { h, box: [x0, z0, x1, z1] };
  };

  const stairs = (x, z, d, o = {}) => {
    const c = cell(x, z);
    if (!land(c) || !DIRS[d]) { log.push(`stairs ${x},${z}: not land or bad dir ${d}`); return false; }
    const h = o.h ?? c.h;
    level.cells[z][x] = { h, s: "ramp", d, m: o.m ?? "stone" };
    clear(x, z);
    return true;
  };

  const route = (from, to, o = {}) => {
    const goal = Array.isArray(to[0]) ? to : [to];
    const isGoal = (x, z) => goal.some(([a, b]) => a === x && b === z);
    const prev = new Map([[key(...from), null]]), q = [from];
    while (q.length) {
      const [x, z] = q.shift();
      if (isGoal(x, z)) { const out = []; for (let k = key(x, z); k; k = prev.get(k)) out.unshift(k.split(",").map(Number)); return out; }
      for (const [dx, dz] of N4) {
        const X = x + dx, Z = z + dz, c = cell(X, Z);
        if (!land(c) || prev.has(key(X, Z)) || (isFig(X, Z) && !isGoal(X, Z))) continue;
        if (!o.any && !canStep({ ...level, blocked: new Set() }, x, z, DIR_OF(dx, dz))) continue;
        prev.set(key(X, Z), key(x, z)); q.push([X, Z]);
      }
    }
    return null;
  };

  const figRing = () => {
    const out = [];
    for (const [x, z] of figCells) for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz; if (!isFig(X, Z) && land(cell(X, Z)) && !out.some(([a, b]) => a === X && b === Z)) out.push([X, Z]); }
    return out;
  };

  const path = (cells, o = {}) => {
    const s = o.s ?? surf.path;
    const out = [];
    for (let i = 0; i < cells.length; i++) {
      const [x, z] = cells[i], c = cell(x, z);
      if (!land(c) || isFig(x, z)) continue;
      if (c.s !== "ramp" && c.s !== "bridge") level.cells[z][x] = { h: c.h, s };
      if (o.clear !== false) clear(x, z, true);
      out.push([x, z]);
    }
    for (let i = 1; i < out.length; i++) {
      const [ax, az] = out[i - 1], [bx, bz] = out[i], A = cell(ax, az), B = cell(bx, bz);
      if (Math.abs(ax - bx) + Math.abs(az - bz) !== 1 || A.s === "ramp" || B.s === "ramp" || A.s === "bridge" || B.s === "bridge") continue;
      if (canStep({ ...level, blocked: new Set() }, ax, az, DIR_OF(bx - ax, bz - az))) continue;
      if (Math.abs(A.h - B.h) !== 1) continue;
      const [lo, hi, li, hiIdx] = A.h < B.h ? [out[i - 1], out[i], i - 1, i] : [out[i], out[i - 1], i, i - 1];
      const dDown = DIR_OF(lo[0] - hi[0], lo[1] - hi[1]);
      const beyond = out[hiIdx + (hiIdx > li ? 1 : -1)];
      const straight = !beyond || (beyond[0] - hi[0] === hi[0] - lo[0] && beyond[1] - hi[1] === hi[1] - lo[1]);
      if (straight && !isFig(...hi)) stairs(hi[0], hi[1], dDown, { m: o.m ?? "stone" });
      else {
        const before = out[li + (li < hiIdx ? -1 : 1)];
        const HI = cell(...hi);
        if (!before || (lo[0] - before[0] === hi[0] - lo[0] && lo[1] - before[1] === hi[1] - lo[1])) stairs(lo[0], lo[1], DIR_OF(before ? before[0] - lo[0] : lo[0] - hi[0], before ? before[1] - lo[1] : lo[1] - hi[1]), { h: HI.h, m: o.m ?? "stone" });
        else log.push(`path: step ${lo}->${hi} turns on both sides, no stairs`);
      }
    }
    log.push(`path ${out.length} cells ${s}`);
    return out;
  };

  const steppable = (x, z, dx, dz) => canStep({ ...level, blocked: new Set() }, x, z, DIR_OF(dx, dz));
  const approach = (o = {}) => {
    const from = o.from || level.spawn, goals = figRing(), pathS = o.s ?? surf.path;
    const dist = new Map([[key(...from), 0]]), prev = new Map(), open = [[0, from[0], from[1], 0, 0]];
    let end = null;
    while (open.length) {
      open.sort((a, b) => a[0] - b[0]);
      const [d, x, z, pdx, pdz] = open.shift();
      if (d > (dist.get(key(x, z)) ?? Infinity)) continue;
      if (goals.some(([a, b]) => a === x && b === z)) { end = [x, z]; break; }
      for (const [dx, dz] of N4) {
        const X = x + dx, Z = z + dz, c = cell(X, Z), c0 = cell(x, z);
        if (!land(c) || isFig(X, Z)) continue;
        const ok = steppable(x, z, dx, dz);
        if (!ok && (o.walkOnly || Math.abs(c.h - c0.h) !== 1 || c.s === "ramp" || c0.s === "ramp")) continue;
        const nd = d + 1 + (c.s === pathS ? 0 : 1.5) + (ok ? 0 : 3) + ((pdx || pdz) && (pdx !== dx || pdz !== dz) ? 0.6 : 0) + (ok ? 0 : (pdx !== dx || pdz !== dz) ? 6 : 0);
        if (nd < (dist.get(key(X, Z)) ?? Infinity)) { dist.set(key(X, Z), nd); prev.set(key(X, Z), key(x, z)); open.push([nd, X, Z, dx, dz]); }
      }
    }
    if (!end) { log.push("approach: no route from spawn to the creature"); return []; }
    const out = [];
    for (let k = key(...end); k; k = prev.get(k)) out.unshift(k.split(",").map(Number));
    return out;
  };

  const flank = (x, z, t, o = {}) => {
    const r = o.route;
    let axis = o.axis;
    if (!axis && r) { const i = r.findIndex(([a, b]) => a === x && b === z); const p = r[i - 1] || r[i + 1]; if (p) axis = p[0] !== x ? "x" : "z"; }
    axis = axis || "z";
    const hc = cell(x, z)?.h;
    const sides = (axis === "z" ? [[x - 1, z, -1], [x + 1, z, 1]] : [[x, z - 1, -1], [x, z + 1, 1]]).filter(([a, b]) => !r || !r.some(([p, q]) => p === a && q === b));
    const taken = ([a, b]) => decorAt(a, b).some((e) => e === lead || (o.keep || []).includes(e.t));
    const flat = ([a, b]) => { const c = cell(a, b); return land(c) && c.s !== "ramp" && !isFig(a, b) && c.h === hc && !taken([a, b]); };
    const shapeable = ([a, b]) => { const c = cell(a, b); return c && !isFig(a, b) && !taken([a, b]) && ((land(c) && c.s !== "ramp" && Math.abs(c.h - hc) <= 1) || (o.fill && c.s === "none")); };
    const byRamp = ([a, b]) => N4.some(([dx, dz]) => cell(a + dx, b + dz)?.s === "ramp");
    let use = sides.filter((c) => flat(c) && (o.pair || !byRamp(c)));
    const snapC = level.cells.map((row) => row.slice());
    if (o.pair && use.length < 2) {
      if (!o.shape || sides.length < 2 || !sides.every(shapeable)) return 0;
      for (const [a, b] of sides) if (cell(a, b).h !== hc || cell(a, b).s === "none") level.cells[b][a] = { h: hc, s: cell(a, b).s === "none" ? (hc >= 2 ? surf.raised : surf.ground) : cell(a, b).s };
      use = sides;
    }
    if (!use.length) return 0;
    const snap = level.decor.slice(), miss0 = o.miss0 ?? reach().missing.length;
    for (const [a, b, side] of use) put(t, a, b, { v: o.v ?? 0, rot: o.rot ?? 0, side: o.pair ? side : undefined, axis, gapX: x, gapZ: z });
    if (o.safe !== false && reach().missing.length > miss0) {
      level.decor.length = 0; level.decor.push(...snap);
      snapC.forEach((row, zz) => row.forEach((c, xx) => { level.cells[zz][xx] = c; }));
      return 0;
    }
    return use.length;
  };

  const gate = (t, o = {}) => {
    const r = o.route || approach();
    if (r.length < 3) return null;
    const want = Math.round((r.length - 1) * (o.frac ?? 0.5));
    const figDist = ([x, z]) => Math.min(...figCells.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
    const order = r.map((c, i) => [c, i]).filter(([c, i]) => i > 0 && i < r.length - 1 && figDist(c) >= 1 && cell(...c).s !== "ramp").sort((a, b) => (figDist(a[0]) > (o.figGap ?? 2) ? 0 : 50) + (figDist(a[0]) > 1 ? 0 : 50) + Math.abs(a[1] - want) - (figDist(b[0]) > (o.figGap ?? 2) ? 0 : 50) - (figDist(b[0]) > 1 ? 0 : 50) - Math.abs(b[1] - want));
    const miss0 = reach().missing.length;
    for (const [shape, fill] of [[false, false], [true, false], [true, o.fill !== false]]) for (const [at] of o.at ? [[o.at]] : order) if (flank(at[0], at[1], t, { ...o, route: r, pair: true, shape, fill, miss0 })) { log.push(`gate ${t} flanking ${at}${fill ? " (flanks built up)" : shape ? " (flanks levelled)" : ""}`); return at; }
    log.push(`gate ${t}: no cell on the route with two flat flanks`);
    return null;
  };

  const lights = (t, o = {}) => {
    const r = o.route || approach();
    const every = o.every ?? 3, skip = o.skip ?? 1, max = o.max ?? 6, avoid = o.avoid || [];
    let n = 0, last = -every;
    for (let i = skip; i < r.length - 1 && n < max; i++) {
      if (i - last < every || figCells.some(([a, b]) => Math.max(Math.abs(a - r[i][0]), Math.abs(b - r[i][1])) <= 2) || avoid.some(([a, b]) => Math.abs(a - r[i][0]) + Math.abs(b - r[i][1]) <= 1)) continue;
      const got = flank(r[i][0], r[i][1], t, { route: r, v: o.v, keep: o.keep });
      if (got) { n += got; last = i; }
    }
    log.push(`lights ${t} x${n}`);
    return n;
  };

  const repair = (o = {}) => {
    const keep = new Set(o.keep || []);
    terrain();
    for (let i = 0; i < 40; i++) {
      const r = reach();
      if (!r.missing.length) return r;
      let best = -1, gain = 0;
      level.decor.forEach((d, j) => {
        if (d === lead || CATALOG[d.t]?.passable || keep.has(d.t)) return;
        const [x] = level.decor.splice(j, 1);
        const g = r.missing.length - reach().missing.length;
        level.decor.splice(j, 0, x);
        if (g > gain) { gain = g; best = j; }
      });
      if (best < 0) {
        const miss = new Set(r.missing.map(([x, z]) => key(x, z)));
        best = level.decor.findIndex((d) => d !== lead && !CATALOG[d.t]?.passable && !keep.has(d.t) && footprint(d).some(([a, b]) => miss.has(key(a, b)) || N4.some(([dx, dz]) => miss.has(key(a + dx, b + dz)))));
        if (best < 0) return r;
      }
      log.push(`repair: removed ${level.decor[best].t} at ${level.decor[best].x},${level.decor[best].z} (+${gain})`);
      level.decor.splice(best, 1);
    }
    return reach();
  };

  const walkN = () => reach().reached;
  const rampTone = (o = {}) => {
    let n = 0;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || c.s !== "ramp") return;
      const [dx, dz] = DIRS[c.d], up = cell(x - dx, z - dz), dn = cell(x + dx, z + dz);
      const pick = [up, dn].map((q) => q?.s).find((sv) => ["sand", "grass", "dirt"].includes(sv)) || (o.stone ? up?.s : null);
      if (pick && c.m !== pick) { c.m = pick; n++; }
    }));
    log.push(`rampTone ${n}`);
    return n;
  };
  const grow = (min = 84, o = {}) => {
    let n = 0;
    for (let guard = 0; guard < 80 && walkN() < min; guard++) {
      let best = null;
      for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
        const c = cell(x, z);
        if (!c || c.s !== "none") continue;
        const nb = N4.map(([dx, dz]) => cell(x + dx, z + dz)).filter((q) => land(q) && q.s !== "ramp");
        if (!nb.length) continue;
        const h = Math.min(...nb.map((q) => q.h));
        const sc = Math.hypot(x - W / 2, z - D / 2) - nb.length * 0.6 + (o.back ? z * 0.3 : 0);
        if (!best || sc < best[3]) best = [x, z, h, sc];
      }
      if (!best) break;
      level.cells[best[1]][best[0]] = { h: best[2], s: o.s ?? (best[2] >= 2 ? surf.raised : surf.ground) };
      n++;
    }
    log.push(`grow ${n} cells, walk ${walkN()}`);
    return n;
  };
  const thin = (min = 84, o = {}) => {
    const order = o.order || [/pot|urn|jar|chest|crate|barrel/, /mushroom|rock|bush/, /tree|pine|spire|pillar/, /./];
    const keep = new Set(o.keep || []);
    let n = 0;
    for (const re of order) {
      if (walkN() >= min) break;
      const cand = level.decor.filter((d) => d !== lead && !CATALOG[d.t]?.passable && !keep.has(d.t) && re.test(d.t) && d.t !== "waterfall");
      cand.sort((a, b) => Math.hypot(b.x - figure.anchor[0], b.z - figure.anchor[1]) - Math.hypot(a.x - figure.anchor[0], a.z - figure.anchor[1]));
      for (const d of cand) { if (walkN() >= min) break; const i = level.decor.indexOf(d); if (i >= 0) { level.decor.splice(i, 1); n++; } }
    }
    log.push(`thin ${n} blockers, walk ${walkN()}`);
    return n;
  };
  const spawnAt = (o = {}) => {
    const lo = o.min ?? 8, hi = o.max ?? 16;
    let r = approach();
    if (r.length >= lo && r.length <= hi && !o.force) return r;
    let best = null;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!land(c) || c.s === "ramp" || isFig(x, z) || blockedSet().has(key(x, z))) return;
      const onRim = N4.some(([dx, dz]) => { const q = cell(x + dx, z + dz); return !q || q.s === "none"; });
      if (o.rim !== false && !onRim) return;
      const q = approach({ from: [x, z] });
      if (!q.length) return;
      const sc = Math.abs(q.length - (lo + hi) / 2) - (o.front === false ? 0 : (x + z) * 0.15);
      if (!best || sc < best[0]) best = [sc, x, z];
    }));
    if (best) { clear(best[1], best[2]); level.spawn = [best[1], best[2]]; r = approach(); log.push(`spawn ${level.spawn}, approach ${r.length}`); }
    return r;
  };
  const along = (types, o = {}) => {
    const r = o.route || approach();
    const list = types.filter((t) => CATALOG[t]);
    if (r.length < 4 || !list.length) return 0;
    let n = 0;
    list.forEach((t, i) => {
      const want = Math.round(((i + 1) / (list.length + 1)) * (r.length - 1));
      const order = r.map((c, j) => [c, j]).sort((a, b) => Math.abs(a[1] - want) - Math.abs(b[1] - want));
      for (const [[x, z]] of order.slice(0, 6)) {
        const sides = N4.map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => !r.some(([p, q]) => p === a && q === b) && land(cell(a, b)) && cell(a, b).s !== "ramp" && !isFig(a, b) && !decorAt(a, b).length && !N4.some(([dx, dz]) => cell(a + dx, b + dz)?.s === "ramp"));
        sides.sort((a, b) => ((a[0] + a[1]) - (b[0] + b[1])) * (o.front ? -1 : 1));
        let ok = false;
        for (const [a, b] of sides) {
          const m0 = reach().missing.length;
          if (!put(t, a, b, { v: i % 2 })) continue;
          if (reach().missing.length > m0) { removeDecor((d) => d.t === t && d.x === a && d.z === b); continue; }
          ok = true; n++; break;
        }
        if (ok) break;
      }
    });
    log.push(`along ${n}/${list.length}: ${list.join(", ")}`);
    return n;
  };
  const passes = () => {
    const names = brief.approach?.passes || [];
    return names.map((nm) => { const m = [...(brief.motifs || []), ...(brief.creatures || [])].find((e) => e.name === nm); return m ? (m.type && m.type !== "new" && CATALOG[m.type] ? m.type : m.name) : null; }).filter((t) => t && CATALOG[t]);
  };
  const ledges = (o = {}) => {
    const n = removeDecor((d) => {
      if ((o.keep || []).includes(d.t) || CATALOG[d.t]?.passable) return false;
      const c = cell(d.x, d.z);
      if (!c) return false;
      const front = [cell(d.x + 1, d.z), cell(d.x, d.z + 1)];
      const tallFront = front.some((q) => land(q) && q.h > c.h);
      const lip = (CATALOG[d.t]?.height || 1) >= (o.tall ?? 1.4) && front.some((q) => !q || q.s === "none");
      return tallFront || lip;
    });
    log.push(`ledges dropped ${n}`);
    return n;
  };
  const dryRim = (o = {}) => {
    let n = 0;
    for (let pass = 0; pass < 4; pass++) level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || c.s !== "water") return;
      const open = N4.some(([dx, dz]) => { const q = cell(x + dx, z + dz); return !q || q.s === "none"; });
      if (!open) return;
      level.cells[z][x] = o.void ? { h: 0, s: "none" } : { h: 1, s: surf.shore || surf.ground };
      removeDecor((d) => d.t === "waterfall" && d.x === x && d.z === z);
      n++;
    }));
    removeDecor((d) => d.t === "waterfall" && cell(d.x, d.z)?.s !== "water");
    log.push(`dryRim ${n}`);
    return n;
  };
  const openRamps = () => {
    let n = 0;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || c.s !== "ramp") return;
      const [dx, dz] = DIRS[c.d];
      for (const [a, b] of [[dz, dx], [-dz, -dx]]) {
        const X = x + a, Z = z + b, q = cell(X, Z);
        if (!land(q) || q.s === "ramp" || q.h <= c.h || isFig(X, Z)) continue;
        const before = reach().reached, saved = q;
        level.cells[Z][X] = { ...q, h: c.h };
        if (reach().reached < before) level.cells[Z][X] = saved; else { clear(X, Z, true); n++; }
      }
    }));
    log.push(`openRamps ${n}`);
    return n;
  };
  const pruneRamps = (o = {}) => {
    const keep = new Set((o.route || approach()).map(([x, z]) => key(x, z)));
    let n = 0;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || c.s !== "ramp" || (!o.all && keep.has(key(x, z)))) return;
      const [dx, dz] = DIRS[c.d];
      const side = [[dz, dx], [-dz, -dx]].map(([a, b]) => cell(x + a, z + b));
      if (o.slotsOnly && !side.every((q) => land(q) && q.h >= c.h)) return;
      if (o.nearFig != null && !figCells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= o.nearFig)) return;
      const before = reach().reached;
      level.cells[z][x] = { h: c.h, s: c.m && c.m !== "stone" ? c.m : (c.h >= 2 ? surf.raised : surf.ground) };
      if (reach().reached < before) level.cells[z][x] = c; else n++;
    }));
    log.push(`pruneRamps ${n}`);
    return n;
  };
  const role = (t) => level.palette?.props?.[t]?.role || (CATALOG[t] ? t : null);
  const ofRole = (r) => Object.entries(level.palette?.props || {}).filter(([, p]) => p.role === r).map(([t]) => t);
  return { W, D, walkN, dryRim, pruneRamps, openRamps, rampTone, grow, thin, spawnAt, along, passes, ledges, role, ofRole, footprint, cell, set, land, key, isFig, figure: { anchor: figure.anchor, cells: figCells }, lead, regions, brief, surf, DIRS, OPPOSITE, decorAt, removeDecor, clear, put, plateau, dais, stairs, path, route, approach, figRing, flank, gate, lights, reach, repair, blockedSet, log };
}
