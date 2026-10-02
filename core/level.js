import { CATALOG, SURFACES, WALKABLE, blockedCells, maskCells } from "./catalog.js";
import { THING_KINDS, normalizeThing, thingBlocks } from "./interact.js";

export const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
export const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" };

export const isGenName = (name) => /^gen(-\d+)?$/i.test(String(name || ""));

export async function loadLevel(name, opts = {}) {
  if (isGenName(name)) {
    const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
    const seed = opts.seed ?? (String(name).match(/^gen-(\d+)$/i)?.[1]) ?? q.get("seed") ?? "1";
    const { generateLevel } = await import("./procgen.js");
    const raw = generateLevel(seed);
    if (opts.beforePrepare) await opts.beforePrepare(raw);
    return prepareLevel(raw);
  }
  const safe = String(name || "home").replace(/[^a-z0-9_-]/gi, "");
  if (!safe) throw new Error(`Level name "${name}" has no usable characters; use letters, digits, - or _.`);
  const file = `levels/${safe}.json`;
  let res;
  try { res = await fetch(new URL(`../${file}`, import.meta.url)); } catch (e) { throw new Error(`Could not fetch ${file}: ${e.message || e}`); }
  if (res.status === 404) throw new Error(`Level "${safe}" not found: ${file} does not exist.`);
  if (!res.ok) throw new Error(`Level "${safe}" failed to load: ${file} returned HTTP ${res.status}.`);
  let raw;
  try { raw = await res.json(); } catch (e) { throw new Error(`Level "${safe}": ${file} is not valid JSON (${e.message || e}).`); }
  if (opts.beforePrepare) await opts.beforePrepare(raw);
  return prepareLevel(raw);
}

export function validateLevel(L) {
  const errors = [], warnings = [];
  if (!Array.isArray(L.size) || L.size.length !== 2) errors.push("size must be [W, D]");
  if (!Array.isArray(L.cells)) errors.push("cells must be an array");
  if (errors.length) return { errors, warnings };
  const [W, D] = L.size;
  if (L.cells.length !== D) errors.push(`cells has ${L.cells.length} rows, size says ${D}`);
  L.cells.forEach((row, z) => {
    if (!Array.isArray(row) || row.length !== W) { errors.push(`row ${z} has ${row?.length} cells, size says ${W}`); return; }
    row.forEach((c, x) => {
      if (!c || typeof c.h !== "number" || c.h < 0 || c.h > 8) errors.push(`cell ${x},${z}: bad h`);
      if (!SURFACES.includes(c?.s)) errors.push(`cell ${x},${z}: unknown surface ${c?.s}`);
      if (c?.s === "ramp" && !DIRS[c.d]) errors.push(`cell ${x},${z}: ramp needs d n|e|s|w`);
      if (c?.s === "ramp" && c.h < 1) errors.push(`cell ${x},${z}: ramp needs h >= 1`);
    });
  });
  for (const [i, d] of (L.decor || []).entries()) {
    if (!CATALOG[d.t]) warnings.push(`decor ${i}: unknown type ${d.t}, skipped`);
    else if (!(d.x >= 0 && d.x < W && d.z >= 0 && d.z < D)) warnings.push(`decor ${i}: ${d.t} at ${d.x},${d.z} outside level, skipped`);
  }
  if (!Array.isArray(L.spawn)) errors.push("spawn must be [x, z]");
  if (L.things != null && !Array.isArray(L.things)) errors.push("things must be an array");
  const ids = new Set();
  for (const [i, t] of (Array.isArray(L.things) ? L.things : []).entries()) {
    const kind = t?.kind || t?.t;
    if (!THING_KINDS.includes(kind)) warnings.push(`thing ${i}: unknown kind ${kind}, skipped`);
    else if (!(t.x >= 0 && t.x < W && t.z >= 0 && t.z < D)) warnings.push(`thing ${i}: ${kind} at ${t.x},${t.z} outside level, skipped`);
    if (t?.id != null && ids.has(t.id)) warnings.push(`thing ${i}: duplicate id ${t.id}`);
    ids.add(t?.id);
  }
  return { errors, warnings };
}

export function prepareLevel(raw) {
  const { errors, warnings } = validateLevel(raw);
  if (errors.length) throw new Error("level invalid: " + errors.slice(0, 5).join("; "));
  const L = { bg: raw.palette?.bg || "#404040", ...raw, warnings };
  const [W, D] = L.size;
  L.decor = (raw.decor || []).filter((d) => CATALOG[d.t] && d.x >= 0 && d.x < W && d.z >= 0 && d.z < D);
  L.blocked = new Set();
  L.cover = new Map();
  for (const d of L.decor) {
    for (const [x, z] of blockedCells(d)) L.blocked.add(x + "," + z);
    if (CATALOG[d.t].mask) for (const m of maskCells(d.t, d.x, d.z, d.rot || 0)) if (m.over != null) L.cover.set(m.x + "," + m.z, { t: d.t, over: m.over, h: m.h });
  }
  L.things = (Array.isArray(raw.things) ? raw.things : []).filter((t) => THING_KINDS.includes(t?.kind || t?.t) && t.x >= 0 && t.x < W && t.z >= 0 && t.z < D).map((t, i) => normalizeThing({ id: "t" + i, ...t }));
  for (const t of L.things) for (const [x, z] of thingBlocks(t)) L.blocked.add(x + "," + z);
  if (!isWalkable(L, L.spawn[0], L.spawn[1])) {
    const alt = firstWalkable(L);
    warnings.push(`spawn ${L.spawn} not walkable, using ${alt}`);
    if (alt) L.spawn = alt;
  }
  for (const w of warnings) console.warn("[level]", w);
  return L;
}

export const cellAt = (L, x, z) => (x >= 0 && z >= 0 && x < L.size[0] && z < L.size[1] ? L.cells[z][x] : null);

export function isWalkable(L, x, z) {
  const c = cellAt(L, x, z);
  return !!c && c.h >= 1 && WALKABLE.has(c.s) && !L.blocked.has(x + "," + z);
}

function firstWalkable(L) {
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) if (isWalkable(L, x, z)) return [x, z];
  return null;
}

export function edgeHeight(c, dir) {
  if (c.s !== "ramp") return c.h;
  if (dir === c.d) return c.h - 1;
  if (dir === OPPOSITE[c.d]) return c.h;
  return null;
}

export function canStep(L, x, z, dir) {
  if (!isWalkable(L, x, z)) return false;
  const [dx, dz] = DIRS[dir];
  if (!isWalkable(L, x + dx, z + dz)) return false;
  const a = edgeHeight(cellAt(L, x, z), dir), b = edgeHeight(cellAt(L, x + dx, z + dz), OPPOSITE[dir]);
  return a != null && b != null && a === b;
}

export function neighbours(L, x, z) {
  const out = [];
  for (const dir of Object.keys(DIRS)) if (canStep(L, x, z, dir)) out.push([x + DIRS[dir][0], z + DIRS[dir][1], dir]);
  return out;
}

export function surfaceHeight(L, wx, wz) {
  const x = Math.floor(wx), z = Math.floor(wz), c = cellAt(L, x, z);
  if (!c) return 0;
  if (c.s !== "ramp") return c.h;
  const fx = wx - x, fz = wz - z;
  const t = { n: 1 - fz, s: fz, e: fx, w: 1 - fx }[c.d];
  return c.h - Math.min(1, Math.max(0, t));
}
