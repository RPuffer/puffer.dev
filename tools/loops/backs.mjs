import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { CATALOG, registerCatalog, footprintCells } from "../../core/catalog.js";
import { prepareLevel } from "../../core/level.js";
import { findPath } from "../../core/path.js";
import { checkLevel, reachability } from "../../core/procgen.js";
import { echo } from "../../3d/pieces/outgrowth.js";
import { ISLANDS } from "./rebuild.mjs";
import { root } from "./lib.mjs";

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const ref = (args.find((a) => a.startsWith("--ref=")) || "--ref=6973682").slice(6);
const write = args.includes("--write"), map = args.includes("--map");
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const OUT = { n: [0, -1], w: [-1, 0] };
const key = (x, z) => x + "," + z;
const LAND = /^(grass|sand|dirt|stone)$/;
const LANDMARK = /tower|market|arch|gazebo|fountain|forge|press|monolith|crane|vat|eyrie|shrine|canopy|windmill|totem|effigy|-s$|small/;
const GENERIC = /^(windmill|canopy-tree|watchtower|gatehouse|shipwreck|shrine|market-row|waterfall-cliff)(-small)?$/;
const area = (t) => (CATALOG[t]?.footprint || [1, 1]).reduce((a, b) => a * b, 1);

function routeOf(raw) {
  const L = prepareLevel(JSON.parse(JSON.stringify(raw)));
  for (const t of L.things) if (t.kind === "gate") for (const [x, z] of t.blocks || []) L.blocked.delete(key(x, z));
  L.edges.clear();
  const exit = L.things.find((t) => t.kind === "elevator" && t.role === "exit");
  const entry = L.things.find((t) => t.kind === "elevator" && t.role === "entry");
  const main = findPath(L, L.spawn, [exit.x, exit.z]) || [];
  const ent = entry ? findPath(L, [entry.x, entry.z], [exit.x, exit.z]) || [] : [];
  return { L, main, ent, missing: reachability(L).missing.length, warnings: L.warnings.length };
}

function apply(raw, cells, decor) {
  const xs = cells.map((c) => c[0]), zs = cells.map((c) => c[1]);
  const pad = cells.length ? [Math.max(0, -Math.min(...xs)), Math.max(0, -Math.min(...zs)), 0, 0] : [0, 0, 0, 0];
  const spec = { pad, cells: cells.map(([x, z, c]) => [x + pad[0], z + pad[1], c]), decor: decor.map((d) => ({ ...d, x: d.x + pad[0], z: d.z + pad[1] })) };
  const L = JSON.parse(JSON.stringify(raw));
  echo(L, spec);
  return { L, spec };
}

function ok(raw, base, cells, decor) {
  const { L, spec } = apply(raw, cells, decor);
  const r = routeOf(L), [px, pz] = spec.pad;
  const s = (p, dx = 0, dz = 0) => p.map(([x, z]) => key(x - dx, z - dz)).join(" ");
  if (s(r.main, px, pz) !== s(base.main) || s(r.ent, px, pz) !== s(base.ent)) return "route changed";
  if (r.missing !== base.missing) return `unreachable ${base.missing} -> ${r.missing}`;
  if (r.warnings > base.warnings) return "prepare warning";
  const p = checkLevel(L).filter((q) => !/grass share|plateau in/.test(q));
  if (p.length > base.problems) return p[0];
  return null;
}

function plan(raw) {
  const [W, D] = raw.size;
  const base = { ...routeOf(raw), problems: checkLevel(raw).filter((q) => !/grass share|plateau in/.test(q)).length };
  const route = new Set([...base.main, ...base.ent].map(([x, z]) => key(x, z)));
  const busy = new Set();
  for (const t of raw.things || []) { const [w, d] = t.size || [1, 1]; for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) busy.add(key(t.x + dx, t.z + dz)); for (const f of ["blocks", "threshold", "edge"]) for (const [x, z] of t[f] || []) busy.add(key(x, z)); }
  for (const g of raw.outgrowths || []) for (const [x, z] of g.cells) if (g.kind === "dock" || raw.cells[z][x].s === "bridge") busy.add(key(x, z));
  const land = [];
  raw.cells.forEach((r, z) => r.forEach((c, x) => { if (c.h >= 1 && c.s !== "none" && c.s !== "water") land.push([x, z]); }));
  const cx = land.reduce((a, [x]) => a + x, 0) / land.length, cz = land.reduce((a, [, z]) => a + z, 0) / land.length;
  const isBack = (x, z) => x - cx + (z - cz) < 0;
  const occ = new Set();
  const mark = (d) => { for (const [x, z] of CATALOG[d.t] ? footprintCells(d.t, d.x, d.z, d.rot || 0) : [[d.x, d.z]]) occ.add(key(x, z)); };
  raw.decor.forEach(mark);
  const front = raw.decor.filter((d) => !isBack(d.x, d.z) && !d.watch && CATALOG[d.t] && !LANDMARK.test(d.t) && area(d.t) === 1);
  const freq = (pred) => { const f = {}; for (const d of front.filter((d) => pred(CATALOG[d.t]))) f[d.t] = (f[d.t] || 0) + 1; return Object.entries(f).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t]) => t); };
  const solid = freq((s) => !s.passable);
  const softAll = {};
  for (const d of raw.decor) if (CATALOG[d.t]?.passable && area(d.t) === 1 && !LANDMARK.test(d.t) && !/stepping|bridge|road/.test(d.t)) softAll[d.t] = (softAll[d.t] || 0) + (isBack(d.x, d.z) ? 1 : 3);
  const soft = Object.entries(softAll).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t]) => t);
  const budget = { step1: 3, step2: 2 };
  const cells = [], decor = [], notes = [];
  const added = new Map();
  const at = (x, z) => added.get(key(x, z)) || raw.cells[z]?.[x];
  const free = (x, z) => { const c = at(x, z); return !c || c.s === "none"; };
  let pick = 0;
  const prop = (list, x, z) => ({ t: list[pick++ % Math.min(2, list.length)], x, z, v: pick % 3, rot: 0, ox: 0, oz: 0 });
  const tryAdd = (cs, ds, label) => {
    const why = ok(raw, base, [...cells, ...cs], [...decor, ...ds]);
    if (why) return why;
    cells.push(...cs); decor.push(...ds);
    for (const [x, z, c] of cs) added.set(key(x, z), c);
    ds.forEach(mark);
    notes.push(label);
    return null;
  };
  const hostile = (x, z) => { const c = at(x, z); return c && c.s !== "none" && (busy.has(key(x, z)) || /lift|bridge|ramp|water/.test(c.s)); };
  const ring = (rims) => {
    const cand = new Map();
    for (const [rx, rz, side] of rims) {
      const c = at(rx, rz), [ox, oz] = OUT[side], q = [rx + ox, rz + oz];
      if (!c || !LAND.test(c.s) || c.h < 2 || busy.has(key(rx, rz)) || !free(...q)) continue;
      const k = key(...q), h = c.h - 1, prev = cand.get(k);
      cand.set(k, { q, side, h: prev ? Math.min(prev.h, h) : h, s: prev?.s || c.s });
    }
    for (const [k, c] of [...cand]) if (N4.some(([dx, dz]) => hostile(c.q[0] + dx, c.q[1] + dz)) || N4.some(([dx, dz]) => { const n = at(c.q[0] + dx, c.q[1] + dz); return n && n.s !== "none" && n.h === c.h && LAND.test(n.s) && !cand.has(key(c.q[0] + dx, c.q[1] + dz)) && false; })) cand.delete(k);
    return cand;
  };
  const comps = (cand) => {
    const out = [], seen = new Set();
    for (const [k, c] of cand) {
      if (seen.has(k)) continue;
      const comp = [], st = [c];
      seen.add(k);
      while (st.length) { const a = st.pop(); comp.push(a); for (const [dx, dz] of N4) { const nk = key(a.q[0] + dx, a.q[1] + dz), b = cand.get(nk); if (b && !seen.has(nk) && b.h === a.h) { seen.add(nk); st.push(b); } } }
      comp.sort((a, b) => a.q[0] - b.q[0] || a.q[1] - b.q[1]);
      out.push(comp);
    }
    return out.sort((a, b) => b.length - a.length || a[0].q[0] - b[0].q[0] || a[0].q[1] - b[0].q[1]);
  };
  const terrace = (comp, tag) => {
    const plain = comp.map((a) => [...a.q, { h: a.h, s: a.s }]);
    const deco = (skip) => {
      const ds = [];
      comp.forEach((a, i) => { if (!skip.has(key(...a.q)) && i % 2 === 0 && soft.length) ds.push(prop(soft, ...a.q)); });
      return ds;
    };
    const cap = () => { const e = comp.at(-1); if (comp.length >= 3 && solid.length) tryAdd([], [prop(solid, ...e.q)], `cap ${e.q}`); };
    if (!tryAdd(plain, deco(new Set()), `${tag} ${comp.length} h${comp[0].h} at ${comp[0].q} (joins same-height land)`)) return cap();
    if (comp.length === 1 || budget[tag] <= 0) {
      if (comp.length <= 3 && solid.length && !tryAdd(plain, comp.map((a) => prop(solid, ...a.q)), `${tag} ${comp.length} h${comp[0].h} at ${comp[0].q} (planted)`)) return;
      return notes.push(`${tag} ${comp.length} at ${comp[0].q}: skipped`);
    }
    const opts = [];
    for (const a of comp) for (const [dx, dz] of N4) {
      const u = [a.q[0] - dx, a.q[1] - dz], uc = at(...u), land2 = [a.q[0] + dx, a.q[1] + dz];
      if (!uc || !LAND.test(uc.s) || uc.h !== a.h + 1 || occ.has(key(...u)) || busy.has(key(...u))) continue;
      const inComp = comp.some((b) => b.q[0] === land2[0] && b.q[1] === land2[1]);
      if (!inComp && !free(...land2)) continue;
      const d = Object.keys({ n: 0, e: 0, s: 0, w: 0 }).find((k) => ({ n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] })[k].join() === [dx, dz].join());
      opts.push({ a, u, land2, inComp, d, score: route.has(key(...u)) * 100 + Math.abs(comp.indexOf(a) - (comp.length - 1) / 2) + (inComp ? 0 : 0.5) });
    }
    opts.sort((p, q) => p.score - q.score);
    let why = "no ramp spot";
    for (const o of opts) {
      const [lx, lz] = [o.land2[0] - o.a.q[0], o.land2[1] - o.a.q[1]], lat = [lz, lx];
      const extra = o.inComp ? [] : [o.land2, [o.land2[0] + lat[0], o.land2[1] + lat[1]], [o.land2[0] - lat[0], o.land2[1] - lat[1]]].filter((c, i) => i === 0 || (free(...c) && comp.some((b) => b.q[0] === c[0] - lx && b.q[1] === c[1] - lz)));
      if (extra.some((c) => !free(...c) || N4.some(([dx, dz]) => hostile(c[0] + dx, c[1] + dz)))) continue;
      const cs = [...comp.map((a) => [...a.q, a === o.a ? { h: a.h + 1, s: "ramp", d: o.d, m: a.s } : { h: a.h, s: a.s }]), ...extra.map((c) => [...c, { h: o.a.h, s: o.a.s }])];
      const skip = new Set([key(...o.a.q), key(...o.land2)]);
      why = tryAdd(cs, deco(skip), `${tag} ${comp.length}+${extra.length} h${comp[0].h} ramp at ${o.a.q} d${o.d}`);
      if (!why) { budget[tag]--; const e = comp[comp.indexOf(o.a) < comp.length / 2 ? comp.length - 1 : 0]; if (comp.length >= 3 && solid.length) tryAdd([], [prop(solid, ...e.q)], `cap ${e.q}`); return; }
      why = tryAdd(cs, [], `${tag} ${comp.length}+${extra.length} h${comp[0].h} ramp at ${o.a.q} d${o.d} (bare)`);
      if (!why) { budget[tag]--; return; }
    }
    if (solid.length && !tryAdd(plain, comp.map((a) => prop(solid, ...a.q)), `${tag} ${comp.length} h${comp[0].h} at ${comp[0].q} (planted)`)) return;
    notes.push(`${tag} ${comp.length} at ${comp[0].q}: ${why}`);
  };
  for (let pass = 0, grew = 1; pass < 3 && grew; pass++) {
    grew = 0;
    const out = new Set(), st = [];
    for (let x = -1; x <= W; x++) for (const z of [-1, D]) st.push([x, z]);
    for (let z = 0; z < D; z++) for (const x of [-1, W]) st.push([x, z]);
    for (const c of st) out.add(key(...c));
    while (st.length) { const [x, z] = st.pop(); for (const [dx, dz] of N4) { const n = [x + dx, z + dz]; if (n[0] < -1 || n[1] < -1 || n[0] > W || n[1] > D || out.has(key(...n)) || !free(...n)) continue; out.add(key(...n)); st.push(n); } }
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (!free(x, z) || !out.has(key(x, z)) || !isBack(x, z)) continue;
      const nb = N4.map(([dx, dz]) => at(x + dx, z + dz)).filter((c) => c && LAND.test(c.s) && c.h >= 1);
      if (nb.length < 2 || N4.some(([dx, dz]) => hostile(x + dx, z + dz))) continue;
      const h = Math.min(...nb.map((c) => c.h)), f = {};
      for (const c of nb) f[c.s] = (f[c.s] || 0) + 1;
      const sf = Object.entries(f).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
      if (!tryAdd([[x, z, { h, s: sf }]], [], `notch ${x},${z} h${h}`)) grew++;
    }
  }
  const rims = [];
  for (const side of ["n", "w"]) for (let i = 0; i < (side === "n" ? W : D); i++) {
    for (let u = 0; u < (side === "n" ? D : W); u++) { const x = side === "n" ? i : u, z = side === "n" ? u : i; if (!free(x, z)) { rims.push([x, z, side]); break; } }
  }
  for (const comp of comps(ring(rims))) terrace(comp, "step1");
  const r2 = cells.filter(([, , c]) => c.s !== "ramp" && c.h >= 2).map(([x, z]) => { const side = rims.find(([a, b, s]) => (s === "n" && a === x) || (s === "w" && b === z))?.[2]; return [x, z, side]; }).filter((r) => r[2]);
  for (const comp of comps(ring(r2))) terrace(comp, "step2");
  const newRamps = cells.filter(([, , c]) => c.s === "ramp").length;
  if (newRamps < 2) {
    const rects = [];
    for (const [w, d] of [[3, 2], [2, 3], [2, 2]]) for (const [x0, z0] of land) {
      const rc = [];
      for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) rc.push([x0 + dx, z0 + dz]);
      if (!rc.every(([x, z]) => { const c = at(x, z); return c && LAND.test(c.s) && c.h === 1 && isBack(x, z) && !occ.has(key(x, z)) && !busy.has(key(x, z)) && !route.has(key(x, z)) && !N4.some(([dx, dz]) => /lift|bridge/.test(at(x + dx, z + dz)?.s || "")); })) continue;
      const rim = rc.filter(([x, z]) => N4.some(([dx, dz]) => free(x + dx, z + dz))).length;
      if (!rim) continue;
      rects.push({ rc, rim, score: rim * 10 + w * d - (x0 + z0) * 0.1 });
    }
    rects.sort((a, b) => b.score - a.score);
    notes.push(`plateau candidates ${rects.length}`);
    let done = false;
    for (const R of rects.slice(0, 40)) {
      const own = new Set(R.rc.map(([x, z]) => key(x, z)));
      const ramps = [];
      for (const [x, z] of R.rc) for (const [dx, dz] of N4) {
        const r = [x + dx, z + dz], dn = [x + 2 * dx, z + 2 * dz], rc = at(...r), dc = at(...dn);
        if (own.has(key(...r)) || !rc || !LAND.test(rc.s) || rc.h !== 1 || occ.has(key(...r)) || busy.has(key(...r)) || route.has(key(...r))) continue;
        if (!dc || !LAND.test(dc.s) || dc.h !== 1 || occ.has(key(...dn))) continue;
        const dir = Object.entries({ n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }).find(([, v]) => v[0] === dx && v[1] === dz)[0];
        ramps.push({ r, dir, s: rc.s });
      }
      for (const rp of ramps) {
        const far = R.rc.map((c) => ({ c, dd: Math.abs(c[0] - rp.r[0]) + Math.abs(c[1] - rp.r[1]) })).sort((a, b) => b.dd - a.dd)[0].c;
        const cs = [...R.rc.map(([x, z]) => [x, z, { h: 2, s: at(x, z).s }]), [...rp.r, { h: 2, s: "ramp", d: rp.dir, m: rp.s }]];
        const label = `plateau ${R.rc.length} cells at ${R.rc[0]} h2 ramp at ${rp.r} d${rp.dir}`;
        if (solid.length && !tryAdd(cs, [prop(solid, ...far)], label + ", 1 decor")) { done = true; break; }
        if (!tryAdd(cs, [], label)) { done = true; break; }
      }
      if (done) break;
    }
    if (!done) notes.push("plateau: none fits");
  }
  const backCells = land.filter(([x, z]) => isBack(x, z)).length, frontCells = land.length - backCells;
  const dens = (pred) => raw.decor.filter((d) => pred(d.x, d.z)).length;
  const want = Math.round((dens((x, z) => !isBack(x, z)) / frontCells) * backCells) - dens(isBack);
  let put = 0;
  if (want > 0 && (solid.length || soft.length)) {
    const spots = land.filter(([x, z]) => isBack(x, z) && !occ.has(key(x, z)) && !busy.has(key(x, z)) && !route.has(key(x, z)) && LAND.test(raw.cells[z][x].s) && !N4.some(([dx, dz]) => hostile(x + dx, z + dz)))
      .map(([x, z]) => ({ x, z, rim: N4.filter(([dx, dz]) => free(x + dx, z + dz)).length, near: N4.filter(([dx, dz]) => occ.has(key(x + dx, z + dz))).length }))
      .sort((a, b) => b.rim + b.near * 0.5 - (a.rim + a.near * 0.5) || a.x + a.z - (b.x + b.z));
    for (const s of spots) {
      if (put >= want) break;
      if (N4.some(([dx, dz]) => decor.some((d) => d.x === s.x + dx && d.z === s.z + dz && put % 3 === 2))) continue;
      const list = solid.length && put % 3 !== 1 ? solid : soft.length ? soft : solid;
      if (!tryAdd([], [prop(list, s.x, s.z)], `decor ${s.x},${s.z}`)) put++;
    }
    notes.push(`back decor +${put} of ${want}`);
  }
  const all = [...raw.decor, ...decor];
  const big = (pred) => all.filter((d) => CATALOG[d.t] && area(d.t) > 1 && pred(d.x, d.z));
  const fb = big((x, z) => !isBack(x, z)), bb = big(isBack);
  if (fb.length > bb.length) {
    const types = [...new Set(fb.filter((d) => !d.watch && !GENERIC.test(d.t) && !/lead|creature/.test(raw.palette?.props?.[d.t]?.role || "")).map((d) => d.t))];
    let placed = false;
    const pool = [...land, ...cells.map(([x, z]) => [x, z])];
    for (const t of types) {
      const tries = [];
      for (const [x, z] of pool) for (const rot of [0, 1]) {
        if (!isBack(x, z)) continue;
        const fp = footprintCells(t, x, z, rot), h = at(x, z).h;
        if (fp.some(([a, b]) => { const c = at(a, b); return !c || !LAND.test(c.s) || c.h !== h || occ.has(key(a, b)) || busy.has(key(a, b)) || route.has(key(a, b)); })) continue;
        const rim = fp.filter(([a, b]) => N4.some(([dx, dz]) => free(a + dx, b + dz))).length;
        tries.push({ x, z, rot, score: rim * 10 - (x + z) });
      }
      tries.sort((a, b) => b.score - a.score);
      for (const p of tries.slice(0, 60)) if (!tryAdd([], [{ t, x: p.x, z: p.z, v: 0, rot: p.rot, ox: 0, oz: 0 }], `landmark ${t} at ${p.x},${p.z} rot ${p.rot}`)) { placed = true; break; }
      if (placed) break;
    }
    if (!placed) notes.push(`landmark: none fits (${types.join(" ") || "no non-generic type"})`);
  }
  return { cells, decor, notes: notes.filter((n) => !/^(decor|notch|cap) /.test(n)).concat([`notch fill ${notes.filter((n) => /^notch /.test(n)).length}`]), base };
}

for (const [name, art] of ISLANDS.filter(([l]) => !only || only.split(",").includes(l))) {
  const raw = JSON.parse(execFileSync("git", ["show", `${ref}:levels/${name}.json`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }));
  for (const p of raw.pieces || []) { const m = await import(path.join(root, "3d", p)); if (m.register) registerCatalog(m.register({ palette: raw.palette || {} }).catalog); }
  const r = plan(raw);
  const { L, spec } = apply(raw, r.cells, r.decor);
  console.log(`== ${name}: ${r.cells.length} cells, ${r.decor.length} decor, pad ${spec.pad}\n  ${r.notes.join("\n  ")}`);
  if (map) L.cells.forEach((row, z) => console.log("   " + row.map((c, x) => { const nw = spec.cells.some(([a, b]) => a === x && b === z); const d = L.decor.some((e) => e.x === x && e.z === z); const ch = c.s === "none" ? "." : c.s === "ramp" ? "r" : c.s === "lift" ? "L" : c.s === "bridge" ? "=" : String(c.h); return nw ? (d ? "#" : ch === "r" ? "R" : "+") : ch; }).join("")));
  if (write && r.cells.length + r.decor.length) {
    const file = path.join(root, "3d/pieces", art + ".js");
    const src = fs.readFileSync(file, "utf8").split("\n");
    const i = src.findIndex((l) => l.startsWith("export const PIN = "));
    const PIN = JSON.parse(src[i].slice("export const PIN = ".length).replace(/;\s*$/, ""));
    PIN[name].back = spec;
    src[i] = "export const PIN = { " + Object.entries(PIN).map(([k, v]) => JSON.stringify(k) + ": " + JSON.stringify(v)).join(", ") + " };";
    fs.writeFileSync(file, src.join("\n"));
  }
}
