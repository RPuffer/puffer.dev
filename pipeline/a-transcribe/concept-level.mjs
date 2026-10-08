import fs from "node:fs";
import path from "node:path";
import { registerCatalog, CATALOG, PALETTE as CORE } from "../../core/catalog.js";
import { checkLevel, frameView, reachability } from "../../core/procgen.js";
import { prepareLevel, DIRS } from "../../core/level.js";
import { cliffPalette, cliffShape, surfaceMix, bridges } from "./lens-terrain.mjs";

const BASE = new Set(Object.keys(CATALOG));
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ROT = { n: 0, w: 1, s: 2, e: 3 };
const SURF = ["grass", "sand", "dirt", "stone"];
const HOT = new Set(["flame", "spirit", "ember", "beak", "spiritEye", "hero", "gem", "flowerOrange", "berry", "heart", "cap"]);

const hexMix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const mixDeep = (v, tint, t) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? hexMix(v, tint, t) : Array.isArray(v) ? v.map((x) => mixDeep(x, tint, t)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mixDeep(x, tint, t)])) : v;
const chroma = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return Math.max(...c) - Math.min(...c); };
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const HINTS = [["threshold", /gate|arch|torii|threshold|portal|door|entry|fang/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|nest|throne|cushion|mat\b|platform|crag/i], ["light", /lantern|torch|brazier|lamp|candle|beacon|fire-pot|firepot/i], ["offering", /pot|basket|bowl|offering|chest|cairn|tribute|urn|jar|coin|gem/i], ["mass", /tree|pine|cypress|spire|pillar|monolith|rock|cliff|column|obelisk|totem|wall|hedge|bush|trunk/i]];
const ROLES = ["threshold", "dais", "light", "offering", "mass", "detail", "approach"];
export const hintFor = (p) => (p.kind === "lead creature" ? "lead" : ROLES.includes(p.role) ? p.role : p.kind === "creature" ? "creature" : (HINTS.find(([, re]) => re.test(p.type)) || HINTS.find(([, re]) => re.test(`${p.variant_of || ""} ${p.summary}`)) || ["detail"])[0]);

export function newProps(brief) {
  const out = [];
  const seen = new Set();
  const f = brief.composition?.focal || {};
  const cr = brief.creatures || [];
  const lead = cr.find((c) => c.cell?.[0] === f.x && c.cell?.[1] === f.z) || cr[0];
  for (const [kind, list] of [["creature", cr], ["motif", brief.motifs || []]]) for (const e of list) {
    if (e.type && e.type !== "new" && BASE.has(e.type)) continue;
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    out.push({ kind: e === lead ? "lead creature" : kind, type: e.name, footprint: e === lead ? [2, 2] : e.footprint || [1, 1], height: e.height, passable: !!e.passable, count: e.count ?? 1, variant_of: e.variant_of || null, summary: e.shape?.summary || "", parts: e.shape?.parts || [], pose: e.pose, role: e.role });
  }
  return out;
}

export async function build({ root, flag, has, regions, brief }) {
  const concept = brief.concept.name;
  const briefArg = flag("--brief", null);
  const name = flag("--level", flag("--name", briefArg ? path.basename(briefArg, ".json") : `forest-a-${concept}`));
  const outPath = path.resolve(root, flag("--out", `levels/${name}.json`));
  const piecesRel = `pieces/${flag("--pieces", name)}.js`, piecesAbs = path.resolve(root, "3d", piecesRel);
  const props = newProps(brief);

  if (has("--props") || (props.length && !fs.existsSync(piecesAbs))) {
    console.log(`new prop types for 3d/${piecesRel} (${props.length}):`);
    for (const p of props) console.log(`- ${p.type} [${p.kind}, role ${hintFor(p)}] footprint ${p.footprint.join("x")}, height ${p.height}, passable ${p.passable}, count ${p.count}${p.variant_of ? `, variant_of ${p.variant_of}` : ""}: ${p.summary}`);
    if (!fs.existsSync(piecesAbs)) { console.log(`3d/${piecesRel} is missing: write it (pipeline/a-transcribe/props.md), then rerun`); process.exitCode = 1; }
    return;
  }

  const T = brief.palette.translation, bi = brief.biome || {}, lt = bi.lighting || {};
  const S = bi.surfaces || {};
  const pick = (v, d) => (SURF.includes(v) ? v : d);
  const surf = { ground: pick(S.ground, "grass"), raised: pick(S.raised, "grass"), path: pick(S.path, "dirt"), shore: pick(S.shore, pick(S.ground, "grass")), mist: SURF.includes(S.mist) ? S.mist : null };

  let palette = {};
  for (const k of Object.keys(CORE)) if (k !== "bg") palette[k] = T[k] ?? CORE[k];
  palette.dirt = { ...palette.dirt, path: hexMix(palette.dirt.top, palette.dirt.border || palette.dirt.top, 0.25) };
  const tint = /^#[0-9a-f]{6}$/i.test(lt.tint || "") && chroma(lt.tint) > 0.15 ? lt.tint : null;
  const tintMix = +flag("--tint", 0.08);
  if (tint) palette = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, HOT.has(k) ? v : mixDeep(v, tint, tintMix)]));
  Object.assign(palette, {
    bark: ["#a58f93", "#86707a", "#6a5662"],
    rootWood: ["#8c6a6c", "#6e5258", "#553f47"],
    mist: ["#dfe8f5", "#c9d5e6", "#b3c0d4"],
    spirit: ["#ff9a3c", "#f06a1e", "#c9481a"],
    ember: ["#ffcf4a", "#f5a51d", "#dd7a12"],
    flame: ["#ffe082", "#ffb31d", "#ff831d"],
    beak: ["#fff4d6", "#f2dfb0", "#d8bf86"],
    spiritEye: "#2a2230",
  });
  palette.tones = {};
  for (const p of props) {
    const uniq = [];
    for (const part of p.parts) if (Array.isArray(part.tones) && !uniq.some((u) => u.join() === part.tones.join())) uniq.push(part.tones);
    palette.tones[p.type] = uniq;
  }
  const lensOn = !!brief.concept?.lens;
  palette.props = Object.fromEntries(props.map((p) => [p.type, { role: hintFor(p), footprint: p.footprint, height: p.height, passable: p.passable, variant_of: p.variant_of, ...(lensOn ? { summary: p.summary, parts: p.parts } : {}), ...(lensOn && hintFor(p) === "lead" && brief.figure_pose ? { pose: brief.figure_pose.pose || String(brief.figure_pose) } : {}) }]));
  const lensLog = [];
  if (brief.cliff_treatment) lensLog.push(`cliff palette ${cliffPalette(palette, brief.cliff_treatment).join(" ")}`);
  const bg = lt.bg || T.bg;
  palette.bg = bg;

  const mod = await import(piecesAbs);
  const reg = mod.register({ palette });
  registerCatalog(reg.catalog);
  const missing = props.filter((p) => !CATALOG[p.type]);
  if (missing.length) { console.log(`3d/${piecesRel} does not register: ${missing.map((p) => p.type).join(", ")}`); process.exitCode = 1; return; }

  const [W, D] = regions.size, R = regions.cells, gridMap = regions.gridMap;
  const k = (x, z) => `${x},${z}`;
  const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
  const cells = R.map((row) => row.map((c) => {
    if (c.s === "water") return { h: 0, s: "water" };
    if (c.h === 0) return { h: 0, s: "none" };
    if (c.s === "path") return { h: c.h, s: surf.path };
    if (c.h >= 2) return { h: c.h, s: surf.raised };
    return { h: c.h, s: surf.mist && c.motif.includes("mist") ? surf.mist : surf.ground };
  }));
  const at = (x, z) => (inb(x, z) ? cells[z][x] : null);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = cells[z][x];
    if (c.s !== "water") continue;
    c.h = N4.some(([dx, dz]) => { const n = at(x + dx, z + dz); return !n || n.s === "none"; }) ? 0 : 1;
  }
  const isPath = (x, z) => R[z][x].s === "path";
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = cells[z][x];
    if (c.h !== 1 || c.s === "water" || isPath(x, z) || R[z][x].knoll) continue;
    const wet = N4.some(([dx, dz]) => at(x + dx, z + dz)?.s === "water");
    const rim = N4.some(([dx, dz]) => { const n = at(x + dx, z + dz); return !n || n.s === "none"; });
    if (wet || rim) c.s = surf.shore;
  }

  const fig = regions.figure;
  const figSet = new Set(fig.cells.map(([x, z]) => k(x, z)));
  const fc = [fig.anchor[0] + 1, fig.anchor[1] + 1];
  if (brief.surface_mix) lensLog.push(`surface_mix ${brief.surface_mix.pattern}: ${surfaceMix(cells, brief.surface_mix, { focal: fc, shapedSurfaces: brief.composition?.shaped?.surfaces, skip: (x, z) => isPath(x, z) || figSet.has(k(x, z)) })} cells`);
  if (brief.cliff_treatment) lensLog.push(`cliff ${brief.cliff_treatment.style}: ${cliffShape(cells, brief.cliff_treatment, (x, z) => figSet.has(k(x, z)))} cells`);
  {
    const landC = cells.flat().filter((c) => c.h >= 1 && c.s !== "water" && c.s !== "none").length;
    const target = brief.shaper ? 0 : Math.round((+bi.plateau_share || 0) * landC);
    let raised = cells.flat().filter((c) => c.h >= 2 && c.s !== "water").length;
    while (raised < target) {
      let best = null;
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        const c = cells[z][x], r = R[z][x];
        if (c.h !== 1 || c.s === "water" || r.s === "path" || r.knoll || figSet.has(k(x, z))) continue;
        if (!N4.some(([dx, dz]) => (at(x + dx, z + dz)?.h ?? 0) >= 2 && at(x + dx, z + dz).s !== "water")) continue;
        if (N4.some(([dx, dz]) => R[z + dz]?.[x + dx]?.s === "path")) continue;
        const sc = (/[TR]/.test(r.code) ? 0 : 1.5) - Math.hypot(x + 0.5 - fc[0], z + 0.5 - fc[1]) * 0.15 + (x + z) * 0.08 + hash(x, z, 40) * 0.6;
        if (!best || sc < best[2]) best = [x, z, sc];
      }
      if (!best) break;
      cells[best[1]][best[0]] = { h: 2, s: surf.raised };
      raised++;
    }
  }
  const walk = (c) => c && c.h >= 1 && c.s !== "none" && c.s !== "water" && c.s !== "lift";
  const ramps = [];
  const tryRampAt = (x, z, need, relaxed = false) => {
    const c = cells[z][x];
    if (!walk(c) || c.s === "ramp" || figSet.has(k(x, z))) return false;
    for (const d of ["s", "e", "w", "n"]) {
      const [dx, dz] = DIRS[d], lo = at(x + dx, z + dz), hi = at(x - dx, z - dz);
      if (!walk(lo) || !walk(hi) || lo.h !== c.h - 1 || hi.h !== c.h || lo.s === "ramp" || hi.s === "ramp" || figSet.has(k(x - dx, z - dz))) continue;
      if (need && !need(x + dx, z + dz, x - dx, z - dz)) continue;
      if (!relaxed && N4.some(([ex, ez]) => at(x + ex, z + ez)?.s === "ramp")) continue;
      cells[z][x] = { h: c.h, s: "ramp", d, m: "stone" };
      ramps.push([x, z, d]);
      return true;
    }
    return false;
  };

  const spawnPick = () => {
    const cand = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const c = cells[z][x]; if (walk(c) && c.s !== "ramp" && !figSet.has(k(x, z))) cand.push([x, z, (isPath(x, z) ? 0 : 100) - (x + z) * 2 + Math.abs(x - z - (W - D) / 2)]); }
    cand.sort((a, b) => a[2] - b[2]);
    return cand[0].slice(0, 2);
  };
  const shapedStart = brief.composition?.shaped?.start;
  let spawn = shapedStart && walk(at(...shapedStart)) && !figSet.has(k(...shapedStart)) ? shapedStart : spawnPick();
  const L = { name, size: [W, D], cells, decor: [], spawn };
  let fixes = 0;
  const report0 = [];
  const repairTerrain = (ignore = () => new Set()) => {
  for (let pass = 0; pass < 80; pass++) {
    const ig = ignore(), r0 = reachability({ ...L, cells, blocked: new Set(figSet) }), r = { ...r0, missing: r0.missing.filter(([x, z]) => !ig.has(k(x, z))) };
    if (!r.missing.length) break;
    const miss = new Set(r.missing.map(([x, z]) => k(x, z)));
    let done = false;
    for (const [x, z] of r.missing) if (tryRampAt(x, z, (lx, lz, hx, hz) => !miss.has(k(lx, lz)) && miss.has(k(hx, hz)))) { done = true; break; }
    if (!done) for (let z = 0; z < D && !done; z++) for (let x = 0; x < W && !done; x++) if (!miss.has(k(x, z)) && tryRampAt(x, z, (lx, lz, hx, hz) => miss.has(k(lx, lz)) && !miss.has(k(hx, hz)))) done = true;
    if (done) { fixes++; continue; }
    const [x0, z0] = r.missing[0];
    const comp = [], seen = new Set([k(x0, z0)]), st = [[x0, z0]];
    while (st.length) { const [a, b] = st.pop(); comp.push([a, b]); for (const [dx, dz] of N4) { const kk = k(a + dx, b + dz); if (miss.has(kk) && !seen.has(kk)) { seen.add(kk); st.push([a + dx, b + dz]); } } }
    if (comp.length <= 3 && !comp.some(([a, b]) => figSet.has(k(a, b)))) {
      for (const [a, b] of comp) {
        const hs = N4.filter(([dx, dz]) => { const n = at(a + dx, b + dz); return walk(n) && n.s !== "ramp" && !miss.has(k(a + dx, b + dz)); }).map(([dx, dz]) => at(a + dx, b + dz).h);
        const rimCell = N4.some(([dx, dz]) => { const n = at(a + dx, b + dz); return !n || n.s === "none"; });
        const lo = hs.length ? Math.min(...hs) : 0;
        cells[b][a] = rimCell || !lo ? { h: 0, s: "none" } : { h: lo, s: lo >= 2 ? surf.raised : surf.ground };
      }
      fixes++; continue;
    }
    const top = Math.max(...comp.map(([a, b]) => cells[b][a].h));
    for (const [a, b] of comp) { const c = cells[b][a]; if (c.h === top && top > 1) { c.h--; if (c.s === "ramp") cells[b][a] = { h: c.h, s: surf.raised }; } }
    if (top <= 1) { for (const [a, b] of comp) if (!figSet.has(k(a, b))) cells[b][a] = { h: 0, s: "none" }; }
    fixes++;
  }
  };
  repairTerrain();
  const hasH3 = () => cells.flat().some((c) => walk(c) && c.h === 3 && c.s !== "ramp");
  if (!brief.shaper && !hasH3() && (+(brief.biome?.plateau_share) || 0) >= 0.15) {
    const cand = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const c = cells[z][x]; if (walk(c) && c.h === 2 && c.s !== "ramp" && !figSet.has(k(x, z)) && N4.every(([dx, dz]) => { const n = at(x + dx, z + dz); return walk(n) && n.h >= 2; })) cand.push([x, z]); }
    cand.sort((a, b) => hash(...a, 41) - hash(...b, 41));
    for (const [x, z] of cand) {
      const saved = cells.map((row) => row.map((c) => ({ ...c }))), nr = ramps.length;
      const grp = [[x, z], ...N4.map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => cand.some(([p, q]) => p === a && q === b))];
      if (grp.length < 2) continue;
      for (const [a, b] of grp) cells[b][a].h = 3;
      let ok = false;
      for (let z2 = 0; z2 < D && !ok; z2++) for (let x2 = 0; x2 < W && !ok; x2++) if (cells[z2][x2].h === 3 && grp.some(([p, q]) => p === x2 && q === z2)) ok = tryRampAt(x2, z2, null);
      if (ok && !reachability({ ...L, cells, blocked: new Set(figSet) }).missing.length) { report0.push(`terrace h3 at ${grp.map((g) => g.join(",")).join(" ")}`); break; }
      for (let z2 = 0; z2 < D; z2++) for (let x2 = 0; x2 < W; x2++) cells[z2][x2] = saved[z2][x2];
      ramps.length = nr;
    }
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const c = cells[z][x]; if (c.s !== "water") continue; c.h = N4.some(([dx, dz]) => { const n = at(x + dx, z + dz); return !n || n.s === "none"; }) ? 0 : 1; }
  if (brief.composition?.shaped?.bridge?.length && brief.shaper?.params?.bridge === "planks") {
    const saved = cells.map((row) => row.map((c) => ({ ...c })));
    const before = reachability({ ...L, cells, blocked: new Set(figSet) }).reached;
    const n = bridges(cells, brief.composition.shaped.bridge.filter(([x, z]) => cells[z]?.[x]?.s !== "ramp"));
    if (reachability({ ...L, cells, blocked: new Set(figSet) }).reached < before) { for (let z2 = 0; z2 < D; z2++) for (let x2 = 0; x2 < W; x2++) cells[z2][x2] = saved[z2][x2]; lensLog.push("bridge planks reverted: cut reach"); }
    else lensLog.push(`bridge planks ${n}`);
  }
  spawn = walk(at(...spawn)) && at(...spawn).s !== "ramp" ? spawn : spawnPick();
  L.spawn = spawn;

  const land = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (walk(cells[z][x]) && cells[z][x].s !== "ramp") land.push([x, z]);
  const decor = [], used = new Set(), blocked = new Set();
  cells.forEach((row, z) => row.forEach((c, x) => { if (c.s === "bridge") used.add(k(x, z)); }));
  L.decor = decor;
  const typeFor = (nm) => {
    if (CATALOG[nm]) return nm;
    const m = [...(brief.motifs || []), ...(brief.creatures || [])].find((e) => e.name === nm);
    if (m) return m.type && m.type !== "new" && CATALOG[m.type] ? m.type : CATALOG[m.name] ? m.name : null;
    return null;
  };
  const voidAt = (x, z) => { const n = at(x, z); return !n || n.s === "none"; };
  const place = (t, x, z, o = {}) => {
    const spec = CATALOG[t];
    if (!spec) return false;
    const rot = o.rot || 0, [fw, fd] = rot % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    const fp = [];
    for (let dz = 0; dz < fd; dz++) for (let dx = 0; dx < fw; dx++) fp.push([x + dx, z + dz]);
    if (t === "waterfall") {
      const c = at(x, z);
      if (!c || c.s !== "water" || c.h !== 0 || used.has(k(x, z))) return false;
    } else for (const [a, b] of fp) {
      const c = at(a, b);
      if (!walk(c) || c.s === "ramp" || used.has(k(a, b))) return false;
      if (!o.fig && figSet.has(k(a, b))) return false;
      if (!o.fig && spec.height >= 1 && fig.cells.some(([p, q]) => Math.max(Math.abs(p - a), Math.abs(q - b)) <= 1 || (a + b > p + q && Math.abs(a - p) <= 2 && Math.abs(b - q) <= 2 && Math.abs((a - b) - (p - q)) <= 2))) return false;
      if (!spec.passable && (a === spawn[0] && b === spawn[1])) return false;
      if (!spec.passable && !o.onPath && isPath(a, b)) return false;
      if (!o.fig && spec.height >= 1.4 && (voidAt(a + 1, b) || voidAt(a, b + 1) || voidAt(a + 1, b + 1))) return false;
      if (!spec.passable && N4.some(([dx, dz]) => { const n = at(a + dx, b + dz); return n?.s === "ramp" && (a + dx - DIRS[n.d][0] === a && b + dz - DIRS[n.d][1] === b || a + dx + DIRS[n.d][0] === a && b + dz + DIRS[n.d][1] === b); })) return false;
    }
    if (!spec.passable && t !== "waterfall") {
      for (const [a, b] of fp) blocked.add(k(a, b));
      if (reachability({ ...L, blocked }).missing.length) { for (const [a, b] of fp) blocked.delete(k(a, b)); return false; }
    }
    for (const [a, b] of fp) used.add(k(a, b));
    decor.push({ t, x, z, v: o.v ?? Math.floor(hash(x, z, 1) * spec.variants), rot, ox: +(o.ox || 0).toFixed(2), oz: +(o.oz || 0).toFixed(2) });
    return true;
  };
  const rotFor = (t, x, z) => (CATALOG[t]?.rotates ? Math.floor(hash(x, z, 5) * 4) : 0);
  const near = (x, z, r, f) => { const order = []; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) order.push([x + dx, z + dz, Math.abs(dx) + Math.abs(dz) + hash(x + dx, z + dz, 9) * 0.5]); order.sort((a, b) => a[2] - b[2]); for (const [a, b] of order) if (f(a, b)) return [a, b]; return null; };
  const report = [...lensLog, ...report0];

  const cr = brief.creatures || [];
  const lead = cr.find((c) => c.cell?.[0] === brief.composition.focal.x && c.cell?.[1] === brief.composition.focal.z) || cr[0];
  if (lead) {
    const t = typeFor(lead.name) || typeFor(lead.type);
    const ok = t && place(t, fig.anchor[0], fig.anchor[1], { rot: brief.concept.variant || brief.concept.lens ? 0 : { w: 0, s: 1, e: 2, n: 3 }[lead.facing] ?? 0, fig: true, v: 0 });
    report.push(`${t} at focal ${fig.anchor}${ok ? "" : " FAILED"}`);
  }
  for (const c of cr) {
    if (c === lead || !Array.isArray(c.cell)) continue;
    const t = typeFor(c.name);
    const [gx, gz] = gridMap[c.cell[1]]?.[c.cell[0]] || c.cell;
    if (t && near(gx, gz, 2, (a, b) => place(t, a, b, { rot: rotFor(t, a, b) }))) report.push(`${t} near ${gx},${gz}`);
  }

  const counts = {};
  const bump = (t) => (counts[t] = (counts[t] || 0) + 1);
  const falls = [];
  for (const m of brief.motifs || []) {
    const t = typeFor(m.name);
    if (!t) { report.push(`skip motif ${m.name}: no type`); continue; }
    let n = 0;
    for (const cell of m.cells || []) {
      const [gx, gz] = gridMap[cell[1]]?.[cell[0]] || cell;
      if (t === "waterfall") { falls.push([gx, gz]); n++; continue; }
      const onPath = /torch|lantern|gate|threshold|arch/i.test(m.name + " " + t) ? false : undefined;
      const hit = near(gx, gz, 1, (a, b) => place(t, a, b, { rot: rotFor(t, a, b), onPath, ox: CATALOG[t].footprint[0] === 1 ? (hash(a, b, 2) - 0.5) * 0.24 : 0, oz: CATALOG[t].footprint[1] === 1 ? (hash(a, b, 3) - 0.5) * 0.24 : 0 }));
      if (hit) { n++; bump(t); }
    }
    report.push(`${m.name} -> ${t}: ${t === "waterfall" ? `${n} anchor cells, placed below` : `${n}/${(m.cells || []).length}`}`);
  }

  const wantFalls = (brief.motifs || []).filter((m) => typeFor(m.name) === "waterfall").reduce((a, m) => a + (m.count || 1), 0) || ((bi.decor_weights || {}).waterfall ? 1 : 0);
  if (wantFalls) {
    const cand = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const c = cells[z][x];
      if (c.s !== "water" || c.h !== 0) continue;
      for (const d of ["n", "w", "e", "s"]) {
        const hi = at(x + DIRS[d][0], z + DIRS[d][1]);
        if (hi && hi.s !== "none" && hi.h > c.h) cand.push([x, z, d, (d === "n" || d === "w" ? 0 : 5) + (hi.s === "water" ? 0 : 2) + Math.min(...falls.map(([a, b]) => Math.abs(a - x) + Math.abs(b - z)), 20) * 0.1]);
      }
    }
    cand.sort((a, b) => a[3] - b[3]);
    let n = 0;
    for (const [x, z, d] of cand) { if (n >= wantFalls) break; if (place("waterfall", x, z, { rot: ROT[d] })) { n++; bump("waterfall"); } }
    report.push(`waterfall: ${n}/${wantFalls}`);
  }

  const landN = land.length;
  const trees = bi.trees || { density: 0, types: [] };
  const ttypes = (trees.types || []).map((e) => ({ t: typeFor(e.type), w: +e.weight || 0 })).filter((e) => e.t && e.w > 0);
  const treeSet = new Set(ttypes.map((e) => e.t));
  const tw = ttypes.reduce((a, e) => a + e.w, 0);
  const wpick = (list, sum, u) => { let acc = 0; for (const e of list) { acc += e.w / sum; if (u < acc) return e.t; } return list[list.length - 1]?.t; };
  const treeTarget = Math.round((+trees.density || 0) * landN);
  const gap = (+trees.density || 0) >= 0.3 ? 1 : 2;
  const isTree = (d) => treeSet.has(d.t) || /^tree/.test(d.t);
  let nTrees = decor.filter(isTree).length;
  const code = (x, z) => R[z][x].code || R[z][x].prior?.[0];
  const tcells = [...land].sort((a, b) => ((code(...a) === "T" ? 0 : code(...a) === "R" ? 1 : 2) + hash(...a, 21)) - ((code(...b) === "T" ? 0 : code(...b) === "R" ? 1 : 2) + hash(...b, 21)));
  for (const [x, z] of tcells) {
    if (nTrees >= treeTarget || !tw) break;
    if (gap > 1 && decor.some((d) => isTree(d) && Math.max(Math.abs(d.x - x), Math.abs(d.z - z)) < gap)) continue;
    const t = wpick(ttypes, tw, hash(x, z, 22));
    if (place(t, x, z, { rot: rotFor(t, x, z), ox: (hash(x, z, 23) - 0.5) * 0.2, oz: (hash(x, z, 24) - 0.5) * 0.2 })) { nTrees++; bump(t); }
  }
  report.push(`trees ${nTrees}/${treeTarget} (density ${trees.density} of ${landN} land)`);

  const dw = Object.entries(bi.decor_weights || {}).map(([nm, w]) => ({ t: typeFor(nm), w: +w || 0 })).filter((e) => e.t && e.t !== "waterfall" && e.w > 0 && !treeSet.has(e.t));
  const dsum = dw.reduce((a, e) => a + e.w, 0);
  const dTarget = Math.round((+bi.decor_density || 0.12) * landN);
  let nd = 0;
  for (const [x, z] of [...land].sort((a, b) => hash(...a, 31) - hash(...b, 31))) {
    if (nd >= dTarget || !dsum) break;
    const t = wpick(dw, dsum, hash(x, z, 32));
    if (!CATALOG[t].passable && isPath(x, z)) continue;
    if (CATALOG[t].passable && isPath(x, z) && !/coin|gem|star|heart/.test(t)) continue;
    if (place(t, x, z, { rot: rotFor(t, x, z), ox: (hash(x, z, 33) - 0.5) * 0.3, oz: (hash(x, z, 34) - 0.5) * 0.3 })) { nd++; bump(t); }
  }
  report.push(`scatter ${nd}/${dTarget} (decor_density ${bi.decor_density})`);

  const light = { dir: [-0.35, 1, 0.55], ambient: Math.max(0.5, Math.min(1, +lt.ambient || 0.86)), sun: Math.max(0, Math.min(0.5, +lt.sun || 0)) };
  const level = {
    name, concept, size: [W, D], cells, decor, spawn, bg,
    palette,
    materials: { ramp: ["stone", "sand", "grass", "dirt"] },
    light,
    pieces: props.length ? [piecesRel] : [],
  };
  if (!level.pieces.length) delete level.pieces;
  if (typeof mod.finish === "function" && mod.finish.length >= 1 && !has("--no-finish")) {
    const { makeHelpers } = await import("./finish-helpers.mjs");
    let H;
    const terrain = () => {
      const before = fixes;
      repairTerrain(() => H.blockedSet());
      if (fixes === before) return 0;
      H.log.push(`terrain repair: ${fixes - before} fixes`);
      const dropped = H.removeDecor((d) => d.t !== "waterfall" && H.footprint(d).some(([a, b]) => !walk(at(a, b)) || at(a, b).s === "ramp"));
      if (dropped) H.log.push(`dropped ${dropped} decor left off land`);
      return fixes - before;
    };
    H = makeHelpers(level, { regions, brief, figure: fig, surf, terrain });
    await mod.finish(level, brief, H);
    if (!H.isPinned()) H.repair();
    blocked.clear();
    for (const k2 of H.blockedSet()) blocked.add(k2);
    if (!walk(at(...level.spawn)) || at(...level.spawn).s === "ramp") level.spawn = spawnPick();
    if (typeof mod.outgrow === "function") {
      for (const line of mod.outgrow(level)) report.push("outgrowth: " + line);
      blocked.clear();
      for (const k2 of H.blockedSet()) blocked.add(k2);
    }
    for (const line of H.log) report.push("finish: " + line);
  }
  level.view = frameView(level).view;
  const problems = checkLevel(level);
  const procgenOnly = problems.filter((p) => /grass share|plateau in/.test(p));
  const real = problems.filter((p) => !procgenOnly.includes(p));
  try { const P = prepareLevel(JSON.parse(JSON.stringify(level))); if (P.warnings?.length) real.push("prepareLevel: " + P.warnings[0]); } catch (e) { real.push("prepareLevel: " + e.message); }
  const reach = reachability({ ...level, blocked });
  fs.writeFileSync(outPath, JSON.stringify(level));
  const byType = {};
  for (const d of level.decor) byType[d.t] = (byType[d.t] || 0) + 1;
  const hs = [0, 0, 0, 0];
  for (const row of cells) for (const c of row) if (c.s !== "none" && c.s !== "water") hs[c.h]++;
  const water = cells.flat().filter((c) => c.s === "water").length;
  console.log(`concept ${concept}: surfaces ${JSON.stringify(surf)}, light ${JSON.stringify(light)}, bg ${bg}${tint ? `, tint ${tint} x${tintMix}` : ""}`);
  for (const line of report) console.log("  " + line);
  for (let z = 0; z < D; z++) console.log("  " + cells[z].map((c) => (c.s === "none" ? "." : c.s === "water" ? "~" : c.s === "ramp" ? "/" : String(c.h))).join("") + "  " + cells[z].map((c, x) => { const d = level.decor.find((e) => e.x === x && e.z === z); return d ? d.t[0].toUpperCase() : c.s === "none" ? " " : c.s[0]; }).join(""));
  console.log(`wrote ${path.relative(root, outPath)}: ${W}x${D}, land h1/h2/h3 ${hs.slice(1).join("/")}, water ${water}, spawn ${level.spawn}, ramps ${ramps.map((r) => r.join("")).join(" ")}, repairs ${fixes}, reach ${reach.reached}/${reach.total}`);
  console.log("decor " + JSON.stringify(byType));
  if (procgenOnly.length) console.log("procgen-only rules not applied: " + procgenOnly.join("; "));
  console.log(real.length ? "FAIL\n  " + real.join("\n  ") : "PASS: checkLevel + prepareLevel clean");
  process.exitCode = real.length ? 1 : 0;
}
