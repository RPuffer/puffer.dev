import { CATALOG, footprintCells } from "../catalog.js";
import { N4, DIR, key } from "./grid.js";

const OPP = { n: "s", s: "n", e: "w", w: "e" };
const LOW = 1.2;

export const YIELD = {
  path: "no decor on a path cell, passable or not",
  landing: "no decor on the flat cell above or below a ramp, or at either end of a ladder, door or gate",
  shoulder: `a cell beside the path takes only low decor (height <= ${LOW}) and only every so often`,
  sightline: "no tall decor on the line from the bonfire, the threshold or a vista pad to the core figure",
  room: "plaza cells stay open ground",
};

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
  res.add(key(...level.spawn));
  return res;
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

export function placeDecor(level, base, plan, rng, noise) {
  const out = [], used = new Map(), res = reservedCells(level), dist = pathDistance(level);
  const [W, D] = level.size;
  const cellAt = (x, z) => (x >= 0 && z >= 0 && x < W && z < D ? level.cells[z][x] : null);
  const { core } = plan;
  const [fx, fz] = core.figure;
  const centre = [fx + 0.5, fz + 0.5];
  const [px0, pz0, px1, pz1] = plan.plaza;
  const room = (x, z) => x >= px0 && x <= px1 && z >= pz0 && z <= pz1;
  const inCore = (x, z) => x >= core.terrace[0] && x <= core.terrace[2] && z >= core.terrace[1] && z <= core.terrace[3];

  const fire = level.things.find((t) => t.kind === "bonfire"), chest = level.things.find((t) => t.kind === "chest"), gate = level.things.find((t) => t.open === "watcher:w1");
  const vistas = [[fire.x, fire.z], [chest.x, chest.z], gate.threshold[0]];
  plan.vistas = vistas.map((v) => v.slice());
  const sight = new Set(vistas.flatMap((v) => line(v, centre)).map(([x, z]) => key(x, z)));

  const fits = (t, x, z, rot = 0, o = {}) => {
    const spec = CATALOG[t];
    if (!spec) return null;
    const foot = footprintCells(t, x, z, rot);
    const h = cellAt(x, z)?.h;
    for (const [a, b] of foot) {
      const c = cellAt(a, b), k = key(a, b);
      if (!c || c.h < 1 || c.s === "water" || c.s === "none" || c.s === "ramp" || c.s === "lift" || c.p || c.h !== h) return null;
      if (res.has(k) || used.has(k) || room(a, b)) return null;
      if (!o.core) {
        const tall = (spec.height || 1) > LOW;
        if (tall && (dist.get(k) ?? 9) < 2) return null;
        if (tall && sight.has(k)) return null;
      }
    }
    return foot;
  };
  const put = (d, o = {}) => {
    const foot = fits(d.t, d.x, d.z, d.rot || 0, o);
    if (!foot) return false;
    const [fw, fd] = CATALOG[d.t].footprint;
    out.push({ v: 0, rot: 0, ox: 0, oz: 0, ...d, fw, fd });
    for (const [a, b] of foot) used.set(key(a, b), d.t);
    return true;
  };

  const lead = base.decor.find((d) => d.watch);
  if (lead) put({ ...lead, x: fx, z: fz, watch: "w1" }, { core: true });
  put({ t: "wizard-scroll-tower", x: core.blocks.tower[0], z: core.blocks.tower[1] }, { core: true });
  for (const [x, z] of core.blocks.spires) put({ t: "brush-flick-spire", x, z, v: (x + z) % 2 }, { core: true });

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

  const TALL = ["brush-flick-spire", "gnarled-staff-perch", "star-doodle-totem", "rock-big"].filter((t) => CATALOG[t]);
  const SHORT = ["rock", "star", "stepping-stones"].filter((t) => CATALOG[t]);
  const LAMP = CATALOG["cyan-ember-pillar"] ? "cyan-ember-pillar" : null;
  const free = (x, z) => { const c = cellAt(x, z), k = key(x, z); return !!c && c.h >= 1 && !c.p && c.s !== "water" && c.s !== "none" && c.s !== "ramp" && c.s !== "lift" && !res.has(k) && !used.has(k) && !inCore(x, z) && !room(x, z); };
  const jitter = () => ({ ox: +rng.float(-0.1, 0.1).toFixed(2), oz: +rng.float(-0.1, 0.1).toFixed(2) });
  const variant = (t) => rng.int(0, (CATALOG[t].variants || 1) - 1);
  const marks = level.things.filter((t) => ["gate", "door", "ladder", "lever", "bonfire"].includes(t.kind)).map((t) => (t.edge ? t.edge[0] : [t.x, t.z]));
  if (LAMP) for (const [mx, mz] of marks) {
    const near = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (free(mx + dx, mz + dz) && (dist.get(key(mx + dx, mz + dz)) ?? 9) === 1) near.push([mx + dx, mz + dz, Math.abs(dx) + Math.abs(dz)]);
    near.sort((a, b) => a[2] - b[2]);
    if (near[0]) put({ t: LAMP, x: near[0][0], z: near[0][1], v: variant(LAMP) });
  }
  const groves = [];
  const pool = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (free(x, z) && (dist.get(key(x, z)) ?? 9) >= 2) pool.push([x, z, noise(x / 3 + 5, z / 3 + 11)]);
  pool.sort((a, b) => b[2] - a[2]);
  for (const [x, z] of pool) {
    if (groves.length >= 7) break;
    if (groves.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) < 6)) continue;
    groves.push([x, z]);
  }
  for (const [gx, gz] of groves) {
    const fam = rng.pick(TALL), n = rng.int(3, 6);
    const spots = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dz) <= 2 && free(gx + dx, gz + dz)) spots.push([gx + dx, gz + dz]);
    rng.shuffle(spots);
    let k = 0;
    for (const [x, z] of spots) {
      if (k >= n) break;
      const t = k === 0 || rng.chance(0.7) ? fam : rng.pick(SHORT);
      if (put({ t, x, z, v: variant(t), ...jitter() })) k++;
    }
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (!free(x, z)) continue;
    const d = dist.get(key(x, z)) ?? 9;
    const rim = N4.some(([dx, dz]) => { const n = cellAt(x + dx, z + dz); return !n || n.s === "none"; });
    if (rim && d >= 2 && noise(x / 1.7 - 3, z / 1.7 + 8) > 0.66) put({ t: "brush-flick-spire", x, z, v: variant("brush-flick-spire"), ...jitter() });
    else if (d === 1 && rng.chance(0.07)) { const t = rng.pick(SHORT); put({ t, x, z, v: variant(t), ...jitter() }); }
  }
  return out;
}
