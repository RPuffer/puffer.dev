import { BLOBS } from "./blobs.js";
import { RIDGES } from "./ridges.js";
import { RINGS } from "./rings.js";
import { CRESCENTS } from "./crescents.js";
import { ARCHIPELAGOS } from "./archipelagos.js";
import { TIERS } from "./tiers.js";
import { HUBS } from "./hubs.js";
import { BRIDGES } from "./bridges.js";
import { SPIRALS } from "./spirals.js";
import { TWINS } from "./twins.js";
import { SATELLITES } from "./satellites.js";

export const SHAPES = [...BLOBS, ...RIDGES, ...RINGS, ...CRESCENTS, ...ARCHIPELAGOS, ...TIERS, ...HUBS, ...BRIDGES, ...SPIRALS, ...TWINS, ...SATELLITES];
export const FAMILIES = ["blob", "ridge", "ring", "crescent", "archipelago", "tiers", "hub", "bridge", "spiral", "twin", "satellite"];
export const ARCHETYPE_NAMES = ["ring", "figure8", "spiral", "switchback", "comb", "twin", "maze"];
export const TRANSFORMS = ["r0", "r90", "r180", "r270", "m0", "m90", "m180", "m270"];
export const LINK_ROLES = ["connector", "shortcut", "reward"];
export const UNIT = 3;

export const RULES = {
  maxSide: 12,
  maxLandmasses: 4,
  minLandmass: 2,
  minLand: 30,
  minWalk: 8,
  bonfireWalk: 2,
  shortcutNear: 3,
  shortcutSaves: 2,
  maxPairs: 3,
  libraryShapes: 30,
  libraryMulti: 10,
  libraryFamilies: 8,
  libraryNinths: 7,
  libraryCentreShare: 0.25,
};

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const RIM = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const NEAR_RIMS = ["s", "e"];
const KEY_CHARS = "SECB$";
const PAD_CHARS = "pqr";
const k = (x, z) => x + "," + z;
const unk = (s) => s.split(",").map(Number);

export function transformMap(map, t) {
  let rows = map.map((r) => r.split(""));
  if (t[0] === "m") rows = rows.map((r) => r.slice().reverse());
  for (let i = 0; i < +t.slice(1) / 90; i++) {
    const H = rows.length, W = rows[0].length;
    rows = [...Array(W)].map((_, z) => [...Array(H)].map((_, x) => rows[H - 1 - x][z]));
  }
  return rows.map((r) => r.join(""));
}

export const transformShape = (shape, t) => ({ ...shape, map: transformMap(shape.map, t), transform: t });

export function parseShape(shape) {
  const map = shape.map, H = map.length, W = map[0]?.length || 0;
  const land = new Set(), zone = new Map(), problems = [];
  const keys = { entry: null, exit: null, centrepieces: [], bonfire: null, rewards: [] };
  const pads = {};
  map.forEach((row, z) => {
    if (row.length !== W) problems.push(`row ${z} is ${row.length} wide, not ${W}`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const isPad = PAD_CHARS.includes(ch.toLowerCase()) && /[a-z]/i.test(ch);
      if (!(ch === "#" || /[1-4]/.test(ch) || KEY_CHARS.includes(ch) || isPad)) { problems.push(`unknown char "${ch}" at ${x},${z}`); return; }
      land.add(k(x, z));
      if (/[1-4]/.test(ch)) zone.set(k(x, z), ch);
      if (ch === "S") keys.entry ? problems.push("more than one S") : (keys.entry = [x, z]);
      if (ch === "E") keys.exit ? problems.push("more than one E") : (keys.exit = [x, z]);
      if (ch === "B") keys.bonfire ? problems.push("more than one B") : (keys.bonfire = [x, z]);
      if (ch === "C") keys.centrepieces.push([x, z]);
      if (ch === "$") keys.rewards.push([x, z]);
      if (isPad) {
        const p = (pads[ch.toLowerCase()] ||= { id: ch.toLowerCase(), near: null, far: null });
        const end = ch === ch.toLowerCase() ? "near" : "far";
        if (p[end]) problems.push(`pad ${ch} appears twice`);
        p[end] = [x, z];
      }
    });
  });
  const landmassOf = new Map(), landmasses = [];
  for (const s of land) {
    if (landmassOf.has(s)) continue;
    const id = landmasses.length, cells = [];
    const q = [s];
    landmassOf.set(s, id);
    while (q.length) {
      const c = q.pop();
      cells.push(unk(c));
      const [x, z] = unk(c);
      for (const [dx, dz] of N4) {
        const t = k(x + dx, z + dz);
        if (land.has(t) && !landmassOf.has(t)) { landmassOf.set(t, id); q.push(t); }
      }
    }
    landmasses.push({ id, cells, area: cells.length });
  }
  for (const [id, p] of Object.entries(pads)) p.role = shape.links?.[id] || null;
  return { W, H, land, zone, keys, pads, landmasses, landmassOf, problems };
}

function distances(P, from, roles) {
  const edges = new Map();
  for (const p of Object.values(P.pads)) {
    if (!p.near || !p.far || !roles.has(p.role)) continue;
    edges.set(k(...p.near), [...(edges.get(k(...p.near)) || []), k(...p.far)]);
    edges.set(k(...p.far), [...(edges.get(k(...p.far)) || []), k(...p.near)]);
  }
  const dist = new Map([[k(...from), 0]]);
  const q = [k(...from)];
  while (q.length) {
    const c = q.shift(), d = dist.get(c), [x, z] = unk(c);
    const next = N4.map(([dx, dz]) => k(x + dx, z + dz)).filter((t) => P.land.has(t)).concat(edges.get(c) || []);
    for (const t of next) if (!dist.has(t)) { dist.set(t, d + 1); q.push(t); }
  }
  return dist;
}

export function reach(P, from, roles = ["connector", "reward"]) {
  let set = new Set(roles);
  let dist = distances(P, from, set);
  const sc = Object.values(P.pads).filter((p) => p.role === "shortcut" && p.far && dist.has(k(...p.far)));
  if (sc.length && !set.has("shortcut")) {
    set.add("shortcut");
    dist = distances(P, from, set);
  }
  return dist;
}

const walk = (P, a, b, roles) => distances(P, a, new Set(roles)).get(k(...b)) ?? Infinity;

export function rimsOf(P, at) {
  return Object.entries(RIM).filter(([, [dx, dz]]) => {
    for (let x = at[0] + dx, z = at[1] + dz; x >= 0 && z >= 0 && x < P.W && z < P.H; x += dx, z += dz) if (P.land.has(k(x, z))) return false;
    return true;
  }).map(([d]) => d);
}

export function ninthOf(P, at) {
  const c = Math.min(2, Math.floor(((at[0] + 0.5) / P.W) * 3));
  const r = Math.min(2, Math.floor(((at[1] + 0.5) / P.H) * 3));
  return r * 3 + c;
}

export function resolveTransforms(shape) {
  const want = shape.transforms === "near" || !shape.transforms ? TRANSFORMS : shape.transforms;
  const seen = new Set(), out = [];
  for (const t of want) {
    const m = transformMap(shape.map, t);
    const P = parseShape({ ...shape, map: m });
    if (shape.transforms === "near" || !shape.transforms) {
      if (!P.keys.entry || !rimsOf(P, P.keys.entry).some((d) => NEAR_RIMS.includes(d))) continue;
    }
    const sig = m.join("/");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(t);
  }
  return out;
}

export function validateShape(shape) {
  const problems = [];
  const P = parseShape(shape);
  problems.push(...P.problems);
  const { keys, pads, landmasses } = P;
  if (!shape.id) problems.push("no id");
  if (!FAMILIES.includes(shape.family)) problems.push(`unknown family ${shape.family}`);
  if (P.W > RULES.maxSide || P.H > RULES.maxSide) problems.push(`map ${P.W}x${P.H} exceeds ${RULES.maxSide} units a side`);
  if (!keys.entry) problems.push("no entry lift S");
  if (!keys.exit) problems.push("no exit lift E");
  if (!keys.bonfire) problems.push("no bonfire B");
  if (!keys.centrepieces.length || keys.centrepieces.length > 3) problems.push(`${keys.centrepieces.length} centrepiece slots, want 1 to 3`);
  for (const a of shape.archetypes || []) if (!ARCHETYPE_NAMES.includes(a)) problems.push(`unknown archetype ${a}`);
  if (!shape.archetypes?.length) problems.push("no archetypes");
  for (const d of new Set(P.zone.values())) if (!shape.heights?.[d]) problems.push(`height zone ${d} has no range`);
  const padList = Object.values(pads);
  for (const p of padList) {
    if (!p.near || !p.far) problems.push(`pad ${p.id} has no partner`);
    if (!LINK_ROLES.includes(p.role)) problems.push(`pad ${p.id} has no link role`);
    if (p.near && p.far && P.landmassOf.get(k(...p.near)) === P.landmassOf.get(k(...p.far))) problems.push(`pad ${p.id} joins a landmass to itself`);
  }
  for (const id of Object.keys(shape.links || {})) if (!pads[id]) problems.push(`link ${id} has no pads`);
  if (padList.length > RULES.maxPairs) problems.push(`${padList.length} teleporter pairs, max ${RULES.maxPairs}`);
  for (const role of LINK_ROLES) if (padList.filter((p) => p.role === role).length > 1 && role !== "connector") problems.push(`more than one ${role} pair`);
  if (landmasses.length > RULES.maxLandmasses) problems.push(`${landmasses.length} landmasses, max ${RULES.maxLandmasses}`);
  for (const L of landmasses) if (L.area < RULES.minLandmass) problems.push(`landmass at ${L.cells[0]} has ${L.area} unit`);
  if (P.land.size < RULES.minLand) problems.push(`${P.land.size} land units, want ${RULES.minLand}`);

  const stats = { land: P.land.size, landmasses: landmasses.length, pairs: padList.length };
  if (problems.length || !keys.entry || !keys.exit || !keys.bonfire) return { ok: false, problems, stats };

  if (!rimsOf(P, keys.entry).length) problems.push("entry lift S is not on the rim");
  if (!rimsOf(P, keys.exit).length) problems.push("exit lift E is not on the rim");
  const all = reach(P, keys.entry);
  const critical = distances(P, keys.entry, new Set(["connector"]));
  const points = [["exit", keys.exit], ["bonfire", keys.bonfire], ...keys.centrepieces.map((c) => ["centrepiece", c]), ...keys.rewards.map((c) => ["reward", c]), ...padList.flatMap((p) => [[`pad ${p.id}`, p.near], [`pad ${p.id.toUpperCase()}`, p.far]])];
  for (const [label, at] of points) if (!all.has(k(...at))) problems.push(`${label} at ${at} unreachable`);
  for (const L of landmasses) if (!L.cells.some((c) => all.has(k(...c)))) problems.push(`landmass at ${L.cells[0]} unreachable`);
  if (!critical.has(k(...keys.exit))) problems.push("exit needs more than walking and connectors");
  for (const c of keys.centrepieces) if (!critical.has(k(...c))) problems.push(`centrepiece ${c} needs more than walking and connectors`);
  const bw = critical.get(k(...keys.bonfire)) ?? Infinity;
  if (bw > RULES.bonfireWalk) problems.push(`bonfire is ${bw} units from S, max ${RULES.bonfireWalk}`);
  for (const p of padList.filter((q) => q.role === "shortcut")) {
    const near = walk(P, p.near, keys.bonfire, ["connector"]);
    const without = walk(P, p.far, keys.bonfire, ["connector"]);
    const saves = without - (1 + near);
    if (near > RULES.shortcutNear) problems.push(`shortcut ${p.id} near pad is ${near} units from the bonfire, max ${RULES.shortcutNear}`);
    if (!(saves >= RULES.shortcutSaves)) problems.push(`shortcut ${p.id} saves ${saves} units, want ${RULES.shortcutSaves}`);
  }
  const c0 = keys.centrepieces[0];
  const route = walk(P, keys.entry, c0, ["connector"]) + walk(P, c0, keys.exit, ["connector"]);
  if (!(route >= RULES.minWalk)) problems.push(`walk S to C to E is ${route} units, want ${RULES.minWalk}`);

  const transforms = resolveTransforms(shape);
  if (!transforms.length) problems.push("no allowed transform keeps S on the near rim");
  for (const t of transforms) {
    const T = parseShape(transformShape(shape, t));
    if (!rimsOf(T, T.keys.entry).some((d) => NEAR_RIMS.includes(d))) problems.push(`transform ${t} puts S on the far rim`);
  }
  if (Array.isArray(shape.transforms) && transforms.length < shape.transforms.length) problems.push("two allowed transforms give the same map");

  Object.assign(stats, { route, bonfireWalk: bw, transforms, centreNinth: ninthOf(P, c0), size: [P.W, P.H] });
  return { ok: !problems.length, problems, stats };
}

export function validateLibrary(shapes = SHAPES) {
  const problems = [];
  const results = shapes.map((s) => ({ shape: s, ...validateShape(s) }));
  for (const r of results) for (const p of r.problems) problems.push(`${r.shape.id}: ${p}`);
  const ids = shapes.map((s) => s.id);
  for (const id of new Set(ids)) if (ids.filter((i) => i === id).length > 1) problems.push(`duplicate id ${id}`);
  const multi = results.filter((r) => r.stats.landmasses > 1).length;
  const families = new Set(shapes.map((s) => s.family));
  const ninths = Array(9).fill(0);
  for (const r of results) if (r.stats.centreNinth != null) ninths[r.stats.centreNinth]++;
  const covered = ninths.filter(Boolean).length;
  if (shapes.length < RULES.libraryShapes) problems.push(`library has ${shapes.length} shapes, want ${RULES.libraryShapes}`);
  if (multi < RULES.libraryMulti) problems.push(`${multi} multi-landmass shapes, want ${RULES.libraryMulti}`);
  if (families.size < RULES.libraryFamilies) problems.push(`${families.size} families, want ${RULES.libraryFamilies}`);
  if (covered < RULES.libraryNinths) problems.push(`centrepieces cover ${covered} ninths, want ${RULES.libraryNinths}`);
  if (ninths[4] / shapes.length > RULES.libraryCentreShare) problems.push(`${ninths[4]} centrepieces in the centre ninth, max ${Math.floor(RULES.libraryCentreShare * shapes.length)}`);
  const perFamily = Object.fromEntries(FAMILIES.map((f) => [f, shapes.filter((s) => s.family === f).length]));
  return { ok: !problems.length, problems, results, stats: { shapes: shapes.length, multi, families: families.size, perFamily, ninths, variants: results.reduce((a, r) => a + (r.stats.transforms?.length || 0), 0) } };
}
