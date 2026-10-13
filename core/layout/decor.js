import { CATALOG, footprintCells, maskCells } from "../catalog.js";
import { N4, DIR, key } from "./grid.js";

const OPP = { n: "s", s: "n", e: "w", w: "e" };
const LOW = 1.2;

export const YIELD = {
  path: "no decor on a path cell, passable or not",
  landing: "no decor on the flat cell above or below a ramp, or at either end of a ladder, door or gate",
  shoulder: `a cell beside the path takes only low decor (height <= ${LOW})`,
  sightline: "no tall decor on the line from the bonfire, the threshold or a vista pad to the core figure",
  room: "plaza cells stay open ground",
};

export const MACHINES = [
  ["anchors", "the core figure, its tower and spires, and the core's own decor copied from the artwork level"],
  ["locks", "one lamp beside every lock and the bonfire"],
  ["features", "each feature module gets the kit it was grown for: a landmark covers a hill, a reward sits on a lookout and in an alcove, a landing stands on an inlet's bank"],
  ["shortcuts", "a landmark near each shortcut's far end, so the player remembers where it opened; a waymark beside the near end"],
  ["approach", "an avenue of waymarks on both shoulders of the road into the core gate, low enough to keep the view"],
  ["turns", "a kit on the outside of a route turn, tall when there is room two cells back, low set dressing when only the shoulder is free"],
  ["gateways", "a pair of waymarks where a road leaves a junction"],
  ["pockets", "a camp or a one-family grove in each off-path pocket, at least six cells apart, the largest pocket of each landmass first"],
  ["rim", "a few tall spires on convex corners of the rim, at least one on every landmass"],
  ["fences", "after traps: sparse themed rails on trap-run flanks and the riskiest spine rims, with gaps at side paths (core/layout/fences.js)"],
];

const SIDE_ROT = { s: 0, w: 1, n: 2, e: 3 };

const GENERIC = /^(market-row|watchtower|canopy-tree|canopy|shrine|arch|road-run|fence-run|windmill|gatehouse|shipwreck|waterfall-cliff|bridge-span)/;
const LAMPISH = /lamp|lantern|pillar|torch|candle|vent|urn|beacon|flame|ember/;

export const PROFILES = {
  wizard: { landmark: "wizard-scroll-tower", spire: "brush-flick-spire", lamp: "cyan-ember-pillar", tall: ["brush-flick-spire", "gnarled-staff-perch"], mid: ["star-doodle-totem", "rock-big"], short: ["rock", "rock-big"], accent: ["rock", "star"] },
};

export function profileFor(base) {
  const fixed = PROFILES[String(base.name || "").split("-")[0]];
  if (fixed && fixed.landmark && CATALOG[fixed.landmark]) return fixed;
  const lead = base.decor.find((d) => d.watch)?.t;
  const types = [...new Set(base.decor.map((d) => d.t))].filter((t) => CATALOG[t] && t !== lead && !CATALOG[t].kit);
  const h = (t) => CATALOG[t].height || 1;
  const area = (t) => CATALOG[t].footprint[0] * CATALOG[t].footprint[1];
  const big = types.filter((t) => area(t) > 1 && !CATALOG[t].passable);
  const landmark = big.filter((t) => !GENERIC.test(t)).sort((a, b) => area(b) - area(a))[0] || big[0] || null;
  const one = types.filter((t) => area(t) === 1 && !CATALOG[t].passable && !CATALOG[t].attach && CATALOG[t].mask == null);
  const tall = one.filter((t) => h(t) >= 1.4 && h(t) <= 2.4).sort((a, b) => h(b) - h(a));
  const mid = one.filter((t) => h(t) >= 0.6 && h(t) < 1.4 && !/^rock/.test(t));
  const lamps = one.filter((t) => h(t) >= 0.8 && h(t) <= 1.3).sort((a, b) => (LAMPISH.test(b) ? 1 : 0) - (LAMPISH.test(a) ? 1 : 0) || Math.abs(h(a) - 1.1) - Math.abs(h(b) - 1.1));
  const short = ["rock", "rock-big"].filter((t) => CATALOG[t]);
  const accent = types.filter((t) => area(t) === 1 && CATALOG[t].passable && h(t) >= 0.08 && h(t) <= 0.6).slice(0, 2);
  return {
    landmark,
    spire: tall[0] || "rock-big",
    lamp: lamps.find((t) => LAMPISH.test(t)) || (CATALOG.waymark ? "waymark" : lamps[0] || null),
    tall: tall.slice(0, 3).length ? tall.slice(0, 3) : ["rock-big"],
    mid: mid.length ? mid.slice(0, 3) : short,
    short,
    accent: accent.length ? ["rock", ...accent] : ["rock"],
  };
}

function line(a, b) {
  const out = [];
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2;
  for (let i = 0; i <= n; i++) out.push([Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n)]);
  return out;
}

export function reservedCells(level) {
  const res = new Set(), [W, D] = level.size;
  const cellAt = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (c.p || c.s === "lift" || c.s === "ramp") res.add(key(x, z));
    if (c.s === "ramp") for (const d of [c.d, OPP[c.d]]) res.add(key(x + DIR[d][0], z + DIR[d][1]));
    if (c.s === "lift") for (const [dx, dz] of N4) res.add(key(x + dx, z + dz));
  }));
  for (const t of level.things) {
    if (t.kind !== "watcher") res.add(key(t.x, t.z));
    for (const c of [...(t.edge || []), ...(t.threshold || [])]) { res.add(key(c[0], c[1])); for (const [dx, dz] of N4) res.add(key(c[0] + dx, c[1] + dz)); }
    if (t.kind === "ladder") { const b = [t.x + DIR[t.d][0], t.z + DIR[t.d][1]]; res.add(key(...b)); }
    if (t.kind === "bonfire" || t.kind === "lever" || t.kind === "chest") for (const [dx, dz] of N4) if (cellAt(t.x + dx, t.z + dz)?.p) res.add(key(t.x + dx, t.z + dz));
  }
  for (const f of level.route?.features || []) for (const c of [...(f.from ? [f.from] : []), ...(f.neck || [])]) res.add(key(...c));
  res.add(key(...level.spawn));
  return res;
}

export function landmassMap(level) {
  const [W, D] = level.size, out = new Map();
  const land = (x, z) => x >= 0 && z >= 0 && x < W && z < D && level.cells[z][x].s !== "none" && level.cells[z][x].s !== "water";
  let id = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!land(x, z) || out.has(key(x, z))) continue;
    const q = [[x, z]];
    out.set(key(x, z), id);
    for (let i = 0; i < q.length; i++) for (const [dx, dz] of N4) {
      const a = q[i][0] + dx, b = q[i][1] + dz;
      if (land(a, b) && !out.has(key(a, b))) { out.set(key(a, b), id); q.push([a, b]); }
    }
    id++;
  }
  return out;
}

function pathDistance(level) {
  const [W, D] = level.size, dist = new Map(), q = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.p) { dist.set(key(x, z), 0); q.push([x, z]); } }));
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i], d = dist.get(key(x, z));
    for (const [dx, dz] of N4) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= D || dist.has(key(nx, nz))) continue;
      dist.set(key(nx, nz), d + 1);
      q.push([nx, nz]);
    }
  }
  return dist;
}

export const kitsFor = (slot, theme) => Object.keys(CATALOG).filter((t) => CATALOG[t].kit?.slots?.includes(slot) && (!theme || theme === "auto" || !CATALOG[t].kit.theme || CATALOG[t].kit.theme === theme));

function faceRot(cells, target) {
  const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length, cz = cells.reduce((s, c) => s + c[1], 0) / cells.length;
  const dx = target[0] - cx, dz = target[1] - cz;
  if (Math.abs(dx) > Math.abs(dz)) return SIDE_ROT[dx > 0 ? "e" : "w"];
  return SIDE_ROT[dz > 0 ? "s" : "n"];
}

function segmentOrder(level, seg) {
  const cells = seg.cells.filter(([x, z]) => level.cells[z][x].p);
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    const p = cells[i];
    if (out.length && out[out.length - 1][0] === p[0] && out[out.length - 1][1] === p[1]) continue;
    out.push(p);
  }
  return out;
}

export function placeDecor(level, base, plan, rng, noise) {
  const out = [], used = new Map(), res = reservedCells(level), dist = pathDistance(level);
  const [W, D] = level.size;
  const theme = level.palette?.kitTheme;
  const cellAt = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  const dOf = (x, z) => dist.get(key(x, z)) ?? 9;
  const { core } = plan;
  const [fx, fz] = core.figure;
  const centre = [fx + 0.5, fz + 0.5];
  const [px0, pz0, px1, pz1] = plan.plaza;
  const room = (x, z) => x >= px0 && x <= px1 && z >= pz0 && z <= pz1;
  const inCore = (x, z) => x >= core.terrace[0] && x <= core.terrace[2] && z >= core.terrace[1] && z <= core.terrace[3];
  const features = level.route?.features || [];
  const featureAt = new Map();
  for (const f of features) for (const c of f.cells) featureAt.set(key(...c), f);

  const fire = level.things.find((t) => t.kind === "bonfire"), chest = level.things.find((t) => t.kind === "chest"), gate = level.things.find((t) => t.open === "watcher:w1");
  const vistas = [[fire.x, fire.z], [chest.x, chest.z], gate.threshold[0]];
  plan.vistas = vistas.map((v) => v.slice());
  const sight = new Set([...vistas.flatMap((v) => line(v, centre)), ...(plan.rewardLines || []).flatMap(([a, b]) => line(a, b))].map(([x, z]) => key(x, z)));

  const lane = (start) => {
    const h = cellAt(...start)?.h, prev = new Map([[key(...start), null]]), q = [start];
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (cellAt(...c).p) { for (let k = key(...c); k; k = prev.get(k)) res.add(k); return; }
      for (const [dx, dz] of N4) {
        const n = [c[0] + dx, c[1] + dz], nc = cellAt(...n);
        if (!nc || prev.has(key(...n)) || nc.h !== h || nc.s === "none" || nc.s === "water" || nc.s === "ramp") continue;
        prev.set(key(...n), key(...c)); q.push(n);
      }
    }
  };
  const lowOnly = new Set();
  for (const f of features) for (const c of [f.from, ...(f.neck || []), f.ramp?.at].filter(Boolean)) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) lowOnly.add(key(c[0] + dx, c[1] + dz));
  for (const f of features) {
    if (f.from) lane(f.from);
    if (f.ramp) lane([f.ramp.at[0] + DIR[f.ramp.d][0], f.ramp.at[1] + DIR[f.ramp.d][1]]);
  }
  const nearLift = new Set();
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "lift") for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) nearLift.add(key(x + dx, z + dz)); }));
  const fits = (t, x, z, rot = 0, o = {}) => {
    const spec = CATALOG[t];
    if (!spec) return null;
    if (spec.kit && spec.footprint[0] * spec.footprint[1] > 1 && footprintCells(t, x, z, rot).some(([a, b]) => nearLift.has(key(a, b)))) return null;
    const foot = footprintCells(t, x, z, rot);
    const h = cellAt(x, z)?.h;
    const tall = (spec.height || 1) > LOW;
    for (const [a, b] of foot) {
      const c = cellAt(a, b), k = key(a, b);
      if (!c || c.h < 1 || c.s === "water" || c.s === "none" || c.s === "ramp" || c.s === "lift" || c.p || c.h !== h) return null;
      if (res.has(k) || used.has(k) || room(a, b)) return null;
      if (!o.core && inCore(a, b)) return null;
      if (!o.feature && featureAt.has(k)) return null;
      if (!o.core) {
        if (tall && !spec.kit && lowOnly.has(k)) return null;
        if (tall && dOf(a, b) < 2) return null;
        if (tall && sight.has(k)) return null;
      }
    }
    return foot;
  };
  const P = plan.profile || profileFor(base);
  const LIGHTS = new Set(["waymark", P.lamp].filter(Boolean));
  const put = (d, o = {}) => {
    const foot = fits(d.t, d.x, d.z, d.rot || 0, o);
    if (!foot) return false;
    if (LIGHTS.has(d.t) && out.some((q) => LIGHTS.has(q.t) && Math.max(Math.abs(q.x - d.x), Math.abs(q.z - d.z)) <= 1)) return false;
    const [fw, fd] = CATALOG[d.t].footprint;
    out.push({ v: 0, rot: 0, ox: 0, oz: 0, ...d, fw, fd });
    for (const [a, b] of foot) used.set(key(a, b), d.t);
    return true;
  };
  const variant = (t) => rng.int(0, (CATALOG[t].variants || 1) - 1);
  const jitter = () => ({ ox: +rng.float(-0.1, 0.1).toFixed(2), oz: +rng.float(-0.1, 0.1).toFixed(2) });

  const placeKit = (types, region, target, o = {}) => {
    const best = [];
    const [lo, hi] = o.dist || [0, 99];
    for (const t of types) {
      const spec = CATALOG[t];
      if (!spec || out.filter((d) => d.t === t).length >= (spec.kit?.max ?? 99)) continue;
      const kd = spec.kit?.dist || [0, 99];
      for (const [x, z] of region) for (const rot of spec.rotates === false ? [0] : [0, 1, 2, 3]) {
        const foot = footprintCells(t, x, z, rot);
        const want = faceRot(foot, target);
        if (spec.rotates !== false && rot !== want) continue;
        if (!fits(t, x, z, rot, o)) continue;
        const ds = foot.map(([a, b]) => dOf(a, b));
        const near = Math.min(...ds);
        if (near < Math.max(lo, kd[0]) || near > Math.min(hi, kd[1])) continue;
        const cx = foot.reduce((s, c) => s + c[0], 0) / foot.length, cz = foot.reduce((s, c) => s + c[1], 0) / foot.length;
        best.push({ t, x, z, rot, score: Math.hypot(cx - target[0], cz - target[1]) + (o.prefer?.[t] || 0) + rng.float(0, 0.3) });
      }
    }
    best.sort((a, b) => a.score - b.score);
    for (const b of best) if (put({ t: b.t, x: b.x, z: b.z, rot: b.rot, v: variant(b.t) }, o)) return b;
    return null;
  };
  const around = (c, r) => { const outR = []; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) outR.push([c[0] + dx, c[1] + dz]); return outR; };
  const landmarks = [];
  const spaced = (c, gap = 6) => landmarks.every((l) => Math.abs(l[0] - c[0]) + Math.abs(l[1] - c[1]) >= gap);
  const WAY = CATALOG.waymark ? "waymark" : null;
  const shoulderPair = (c, along) => {
    if (!WAY) return 0;
    const perp = along === "n" || along === "s" ? ["e", "w"] : ["n", "s"];
    let k = 0;
    for (const s of perp) { const q = [c[0] + DIR[s][0], c[1] + DIR[s][1]]; if (dOf(...q) === 1 && put({ t: WAY, x: q[0], z: q[1] })) k++; }
    return k;
  };

  const lead = base.decor.find((d) => d.watch);
  if (lead) put({ ...lead, x: fx, z: fz, watch: "w1" }, { core: true });
  const lm = P.landmark && CATALOG[P.landmark];
  const towerFits = !!core.blocks.tower && lm && lm.footprint[0] === 2 && lm.footprint[1] === 2;
  if (towerFits) put({ t: P.landmark, x: core.blocks.tower[0], z: core.blocks.tower[1] }, { core: true });
  else if (core.blocks.tower) { const [tx, tz] = core.blocks.tower; for (const [x, z] of [[tx, tz], [tx + 1, tz], [tx, tz + 1], [tx + 1, tz + 1]]) put({ t: P.spire, x, z, v: (x + z) % 2 }, { core: true }); }
  for (const [x, z] of core.blocks.spires) put({ t: P.spire, x, z, v: (x + z) % 2 }, { core: true });
  if (lead) {
    const dx = fx - lead.x, dz = fz - lead.z;
    for (const d of base.decor) {
      if (d === lead || !CATALOG[d.t] || CATALOG[d.t].footprint.some((n) => n > 1)) continue;
      const x = d.x + dx, z = d.z + dz;
      if (!inCore(x, z)) continue;
      const { side, axis, gapX, gapZ, ...rest } = d;
      put({ ...rest, x, z }, { core: true });
    }
  }

  const LAMP = P.lamp && CATALOG[P.lamp] ? P.lamp : null;
  const free = (x, z) => { const c = cellAt(x, z), k = key(x, z); return !!c && c.h >= 1 && !c.p && c.s !== "water" && c.s !== "none" && c.s !== "ramp" && c.s !== "lift" && !res.has(k) && !used.has(k) && !inCore(x, z) && !room(x, z) && !featureAt.has(k); };
  const marks = level.things.filter((t) => ["gate", "door", "ladder", "lever", "bonfire"].includes(t.kind)).map((t) => (t.edge ? t.edge[0] : [t.x, t.z]));
  if (LAMP) for (const [mx, mz] of marks) {
    const near = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (free(mx + dx, mz + dz) && dOf(mx + dx, mz + dz) === 1) near.push([mx + dx, mz + dz, Math.abs(dx) + Math.abs(dz)]);
    near.sort((a, b) => a[2] - b[2]);
    if (near[0]) put({ t: LAMP, x: near[0][0], z: near[0][1], v: variant(LAMP) });
  }

  for (const f of features) {
    const cells = f.cells;
    const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length, cz = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    const nearPath = [...dist.entries()].filter(([, d]) => d === 0).map(([k]) => k.split(",").map(Number)).sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz))[0] || centre;
    if (f.kind === "hill") {
      const b = (!towerFits && lm && !out.some((d) => d.t === P.landmark) ? placeKit([P.landmark], cells, nearPath, { feature: true }) : null) || placeKit(kitsFor("hill", theme), cells, nearPath, { feature: true });
      if (b) landmarks.push([cx, cz]);
      for (const [x, z] of cells) if (!used.has(key(x, z))) put({ t: rng.pick(P.tall), x, z, v: 0, ...jitter() }, { feature: true });
    }
    if (f.kind === "lookout" || f.kind === "alcove") {
      const entry = f.ramp ? f.ramp.at : f.from;
      const kits = kitsFor("reward", theme).concat(kitsFor("pocket", theme));
      const b = placeKit([...new Set(kits)], cells, entry, { feature: true, dist: [0, 99] });
      if (b) landmarks.push([cx, cz]);
      if (f.ramp) { const foot = [f.ramp.at[0] + DIR[f.ramp.d][0], f.ramp.at[1] + DIR[f.ramp.d][1]]; for (const s of f.ramp.d === "n" || f.ramp.d === "s" ? ["e", "w"] : ["n", "s"]) { const q = [foot[0] + DIR[s][0], foot[1] + DIR[s][1]]; if (WAY) put({ t: WAY, x: q[0], z: q[1] }); } }
      if (f.from && WAY) for (const s of Object.keys(DIR)) { const q = [f.from[0] + DIR[s][0], f.from[1] + DIR[s][1]]; if (dOf(...q) === 1 && !featureAt.has(key(...q))) { put({ t: WAY, x: q[0], z: q[1] }); } }
    }
    if (f.kind === "inlet") {
      const bank = [];
      for (const [x, z] of cells) for (const [dx, dz] of N4) for (let k = 1; k <= 2; k++) bank.push([x + dx * k, z + dz * k]);
      const region = bank.flatMap((c) => around(c, 1));
      placeKit(kitsFor("bank", theme), region, [cx, cz]);
    }
  }

  if (lm && !out.some((d) => d.t === P.landmark)) {
    const region = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (free(x, z) && dOf(x, z) >= 2) region.push([x, z]);
    const b = placeKit([P.landmark], region, centre, { dist: [2, 5] });
    if (b) landmarks.push([b.x, b.z]);
  }

  for (const s of level.route?.shortcuts || []) {
    if (spaced(s.far, 5)) {
      const b = placeKit(kitsFor("shortcut-far", theme), around(s.far, 4), s.far);
      if (b) landmarks.push(s.far);
    }
    if (WAY) {
      const ring = N4.map(([dx, dz]) => [s.near[0] + dx, s.near[1] + dz]).filter(([x, z]) => dOf(x, z) === 1 && free(x, z));
      if (ring[0]) put({ t: WAY, x: ring[0][0], z: ring[0][1] });
    }
  }

  const segs = Object.fromEntries((level.route?.segments || []).map((s) => [s.id, s]));
  const appr = segs.approach ? segmentOrder(level, segs.approach) : [];
  for (let i = 0; i < appr.length; i++) {
    const [x, z] = appr[i], c = cellAt(x, z);
    if (c.s === "ramp" || i % 2) continue;
    const nx = appr[i + 1] || appr[i - 1];
    const along = Math.abs(nx[0] - x) ? "e" : "s";
    shoulderPair([x, z], along);
  }

  const turns = [];
  for (const s of level.route?.segments || []) {
    if (s.role !== "spine" && s.role !== "shortcut") continue;
    const o = segmentOrder(level, s);
    for (let i = 1; i < o.length - 1; i++) {
      const a = o[i - 1], b = o[i], c = o[i + 1];
      const din = [b[0] - a[0], b[1] - a[1]], dout = [c[0] - b[0], c[1] - b[1]];
      if (Math.abs(din[0]) + Math.abs(din[1]) !== 1 || Math.abs(dout[0]) + Math.abs(dout[1]) !== 1) continue;
      if (din[0] === dout[0] && din[1] === dout[1]) continue;
      if (inCore(...b) || room(...b)) continue;
      turns.push({ at: b, outside: [b[0] + din[0] - dout[0], b[1] + din[1] - dout[1]], seg: s.id });
    }
  }
  rng.shuffle(turns);
  let turnKits = 0;
  for (const t of turns) {
    if (turnKits >= 5 || !spaced(t.at, 6)) continue;
    const region = around(t.outside, 3).filter(([x, z]) => Math.sign(x - t.at[0]) !== -Math.sign(t.outside[0] - t.at[0]) || Math.sign(z - t.at[1]) !== -Math.sign(t.outside[1] - t.at[1]));
    const b = placeKit(kitsFor("turn", theme), region, t.at);
    if (b) { landmarks.push(t.at); turnKits++; }
  }

  for (const s of level.route?.segments || []) {
    if (s.role !== "spine" || s.id === "approach") continue;
    const o = segmentOrder(level, s);
    const start = o.findIndex(([x, z]) => cellAt(x, z).s !== "ramp" && dOf(x, z) === 0 && !inCore(x, z) && !room(x, z));
    if (start < 0 || start + 1 >= o.length) continue;
    const [x, z] = o[start], nx = o[start + 1];
    shoulderPair([x, z], Math.abs(nx[0] - x) ? "e" : "s");
  }

  const TALL = P.tall.filter((t) => CATALOG[t]), MID = P.mid.filter((t) => CATALOG[t]), SHORT = P.short.filter((t) => CATALOG[t]);
  const seen = new Set(), pockets = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (seen.has(key(x, z)) || !free(x, z) || dOf(x, z) < 2) continue;
    const comp = [[x, z]], q = [[x, z]];
    seen.add(key(x, z));
    for (let i = 0; i < q.length; i++) for (const [dx, dz] of N4) {
      const a = q[i][0] + dx, b = q[i][1] + dz;
      if (seen.has(key(a, b)) || !free(a, b) || dOf(a, b) < 2 || cellAt(a, b).h !== cellAt(x, z).h) continue;
      seen.add(key(a, b)); q.push([a, b]); comp.push([a, b]);
    }
    if (comp.length >= 3) pockets.push(comp);
  }
  const massOf = landmassMap(level);
  pockets.sort((a, b) => b.length - a.length);
  const seenMass = new Set();
  pockets.sort((a, b) => {
    const ma = massOf.get(key(...a[0])), mb = massOf.get(key(...b[0]));
    const fa = seenMass.has(ma) ? 1 : (seenMass.add(ma), 0), fb = seenMass.has(mb) ? 1 : 0;
    return fa - fb;
  });
  let camps = 0;
  const groves = [];
  const grove = (comp, centre) => {
    const fam = rng.pick(TALL);
    const ring = comp.filter(([x, z]) => Math.abs(x - centre[0]) + Math.abs(z - centre[1]) <= 2).sort((a, b) => Math.abs(a[0] - centre[0]) + Math.abs(a[1] - centre[1]) - (Math.abs(b[0] - centre[0]) + Math.abs(b[1] - centre[1])) || rng.float(-1, 1));
    let k = 0;
    for (const [x, z] of ring) {
      const r = Math.abs(x - centre[0]) + Math.abs(z - centre[1]);
      const t = r === 0 ? fam : r === 1 ? (rng.chance(0.5) ? fam : rng.pick(MID)) : rng.pick(SHORT);
      if (r === 2 && rng.chance(0.4)) continue;
      if (put({ t, x, z, v: variant(t), ...jitter() })) k++;
      if (k >= 6) break;
    }
    return k;
  };
  for (const comp of pockets) {
    const cx = comp.reduce((s, c) => s + c[0], 0) / comp.length, cz = comp.reduce((s, c) => s + c[1], 0) / comp.length;
    const byCentre = comp.slice().sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz));
    const near = [...dist.entries()].filter(([, d]) => d === 0).map(([k]) => k.split(",").map(Number)).sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz))[0];
    if (camps < 2 && comp.length >= 6 && spaced(byCentre[0], 6)) {
      const b = placeKit(kitsFor("rest", theme), comp, near, { dist: [2, 99] });
      if (b) { landmarks.push(byCentre[0]); camps++; }
    }
    const left = comp.filter(([x, z]) => !used.has(key(x, z)));
    const seeds = left.slice().sort((a, b) => dOf(...b) - dOf(...a) || rng.float(-1, 1));
    for (const c of seeds) {
      if (groves.length >= 9) break;
      if (groves.some((g) => Math.abs(g[0] - c[0]) + Math.abs(g[1] - c[1]) < 5) || landmarks.some((l) => Math.abs(l[0] - c[0]) + Math.abs(l[1] - c[1]) < 3)) continue;
      if (grove(left, c)) groves.push(c);
    }
  }

  const WAYS = WAY ? CATALOG[WAY].kit?.max ?? 24 : 0;
  for (const slot of level.route?.trapSlots || []) {
    const cells = slot.cells;
    if (cells.length < 4) continue;
    const along = Math.abs(cells[1][0] - cells[0][0]) ? "e" : "s";
    const perp = along === "e" ? ["n", "s"] : ["e", "w"];
    for (let i = 1; i < cells.length - 1; i += 3) {
      if (out.filter((d) => d.t === WAY).length >= WAYS) break;
      const s = perp[(i / 3 | 0) % 2], q = [cells[i][0] + DIR[s][0], cells[i][1] + DIR[s][1]];
      if (dOf(...q) === 1) put({ t: WAY, x: q[0], z: q[1] });
    }
  }

  const rims = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!free(x, z) || dOf(x, z) < 2) continue;
    const open = N4.filter(([dx, dz]) => { const n = cellAt(x + dx, z + dz); return !n || n.s === "none"; });
    if (open.length >= 2 && !(open.length === 2 && open[0][0] === -open[1][0] && open[0][1] === -open[1][1])) rims.push([x, z]);
  }
  rng.shuffle(rims);
  const spires = [];
  const masses = [...new Set(rims.map(([x, z]) => massOf.get(key(x, z))))];
  const cap = Math.max(6, masses.length + 3);
  for (const pass of [0, 1]) for (const [x, z] of rims) {
    const m = massOf.get(key(x, z));
    if (pass === 0 && spires.some((q) => q[2] === m)) continue;
    if (spires.length >= cap || spires.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) < 5)) continue;
    if (put({ t: P.spire, x, z, v: variant(P.spire), ...jitter() })) spires.push([x, z, m]);
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!free(x, z) || dOf(x, z) !== 1 || noise(x / 1.3 + 2, z / 1.3 - 4) < 0.82) continue;
    const t = rng.pick(P.accent.filter((q) => CATALOG[q]));
    if (t) put({ t, x, z, v: variant(t), ...jitter() });
  }
  return out;
}
