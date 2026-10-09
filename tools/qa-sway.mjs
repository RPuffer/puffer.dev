import fs from "node:fs";
import path from "node:path";
import { loadPieces, BUILDERS } from "../3d/hooks.js";
import { buildDecor } from "../3d/decor.js";
import { Baker } from "../3d/baker.js";
import { makeStyle } from "../3d/style.js";
import { registerStamps } from "../3d/stamps.js";
import { viewFrom } from "../core/iso.js";
import { CATALOG, registerCatalog } from "../core/catalog.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ISLANDS = ["cat-medium", "wizard-medium", "swallow-medium", "forest-volute", "mindbloom-medium", "cosmos-frisket", "gremlin-subject", "eagle-composition", "dragon-medium", "sharkbear-medium", "chimera-medium", "ember-subject"];
const MODES = ["static", "crown", "flame", "ripple", "fall", "mist", "pickup", "swatch"];
const TOL = 0.01;
const FACE_GAP = 0.004, FACE_WIN = 0.12, FACE_AREA = 2e-4;
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const only = args.find((a) => a.startsWith("--type="))?.slice(7);
const list = (args.find((a) => !a.startsWith("--")) || ISLANDS.join(",")).split(",");

function bound(s, y) {
  const [mode, amp, , span] = s.sw, ry = s.rt[1];
  const w = Math.min(1, Math.max(0, (y - ry) / Math.max(span, 1e-3)));
  if (mode === 1) return [amp * w, 0, 0.55 * amp * w];
  if (mode === 2) return [1.4 * amp * w * w, 0.7 * amp * w * w, 0.6 * amp * w * w];
  if (mode === 3) return [amp, 0, amp];
  if (mode === 5) return [amp, 0.3 * amp, 0.6 * amp];
  if (mode === 6) return [0.18 * s.r, amp, 0.18 * s.r];
  return [0, 0, 0];
}

function parts(g) {
  const P = g.attributes.position.array, C = g.attributes.color.array, S = g.attributes.aSway.array, R = g.attributes.aRoot.array;
  const n = P.length / 9, key = [], par = new Int32Array(n).map((_, i) => i);
  const find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  const seen = new Map();
  for (let t = 0; t < n; t++) {
    const v = t * 3, m = S[v * 4] === 7 ? 0 : S[v * 4];
    key[t] = m ? [m, S[v * 4 + 1], S[v * 4 + 2], S[v * 4 + 3], R[v * 3], R[v * 3 + 1], R[v * 3 + 2]].map((x) => +x.toFixed(4)).join(",") : "0";
    for (let k = 0; k < 3; k++) {
      const i = (v + k) * 3, id = key[t] + "|" + [P[i], P[i + 1], P[i + 2]].map((x) => Math.round(x * 1e4)).join(",");
      const o = seen.get(id);
      if (o === undefined) seen.set(id, t); else par[find(t)] = find(o);
    }
  }
  const map = new Map();
  for (let t = 0; t < n; t++) {
    const r = find(t);
    let p = map.get(r);
    if (!p) {
      const v = t * 3;
      p = { key: key[t], sw: [...S.slice(v * 4, v * 4 + 4)], rt: [...R.slice(v * 3, v * 3 + 3)], verts: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      if (p.sw[0] === 7) p.sw = [0, 0, 0, 0];
      map.set(r, p);
    }
    for (let k = 0; k < 3; k++) {
      const i = (t * 3 + k) * 3, q = [P[i], P[i + 1], P[i + 2]];
      p.verts.push(q);
      for (let a = 0; a < 3; a++) { p.min[a] = Math.min(p.min[a], q[a]); p.max[a] = Math.max(p.max[a], q[a]); }
    }
  }
  const out = [...map.values()];
  for (const p of out) {
    const seenP = new Map(), sum = [0, 0, 0];
    let area = 0;
    for (let i = 0; i < p.verts.length; i += 3) {
      const [a, b, c] = p.verts.slice(i, i + 3), u = [0, 1, 2].map((k) => b[k] - a[k]), v = [0, 1, 2].map((k) => c[k] - a[k]);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n);
      if (l < 1e-9) continue;
      area += l;
      for (let k = 0; k < 3; k++) sum[k] += n[k];
      const nn = n.map((x) => x / l), d = nn[0] * a[0] + nn[1] * a[1] + nn[2] * a[2];
      seenP.set([...nn, d].map((x) => Math.round(x * 1e3)).join(), [nn, d]);
    }
    const planes = [...seenP.values()];
    if (planes.length >= 4 && Math.hypot(...sum) < 0.02 * area && p.verts.every((q) => planes.every(([n, d]) => n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - d < 1e-3))) p.planes = planes;
    if (p.sw[0] === 6) p.r = Math.max(...p.verts.map((q) => Math.hypot(q[0] - p.rt[0], q[2] - p.rt[2])));
    p.peak = Math.max(...p.verts.map((q) => Math.max(...bound(p, q[1]))));
  }
  return out;
}

function over(q, A, rel, strict) {
  if (A.planes) {
    const sd = A.planes.map(([n, d]) => [n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - d, Math.abs(n[0]) * rel[0] + Math.abs(n[1]) * rel[1] + Math.abs(n[2]) * rel[2]]);
    if (sd.some(([s]) => s > 1e-4)) return Math.min(...sd.map(([s, r]) => r - s));
    if (sd.some(([s, r]) => s > -2e-3 && r <= TOL)) return 0;
    return strict ? TOL + Math.min(...sd.map(([s]) => -s)) + Math.max(...sd.map(([, r]) => r)) : Math.max(...sd.map(([s, r]) => s + r));
  }
  const out = [0, 1, 2].map((a) => Math.max(0, A.min[a] - q[a], q[a] - A.max[a]));
  if (out.some((o) => o > 0)) return Math.min(...[0, 1, 2].map((a) => rel[a] - out[a]));
  const depth = [0, 1, 2].map((a) => Math.min(q[a] - A.min[a], A.max[a] - q[a]));
  if (depth.some((d, a) => d < 2e-3 && rel[a] <= TOL)) return 0;
  return strict ? TOL + Math.min(...depth) + Math.max(...rel) : Math.max(...depth.map((d, a) => rel[a] - d));
}
const boxGap = (A, B) => Math.sqrt([0, 1, 2].reduce((s, a) => s + Math.max(0, A.min[a] - B.max[a], B.min[a] - A.max[a]) ** 2, 0));
const samePhase = (A, B) => A.sw[0] === B.sw[0] && A.sw[2] === B.sw[2] && Math.abs(A.rt[0] - B.rt[0]) < 1e-4 && Math.abs(A.rt[2] - B.rt[2]) < 1e-4;

function check(ps) {
  const fails = [];
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const A = ps[i], B = ps[j];
    if (A.key === B.key || (!A.peak && !B.peak)) continue;
    if (boxGap(A, B) > A.peak + B.peak + TOL) continue;
    const strict = A.sw[0] > 0 && B.sw[0] > 0;
    let worst = 0, at = null;
    for (const [P, Q] of [[A, B], [B, A]]) for (const v of P.verts) {
      const bp = bound(P, v[1]), bq = bound(Q, v[1]);
      const o = over(v, Q, bp.map((x, a) => x + bq[a]), strict);
      if (o > worst) { worst = o; at = v; }
    }
    if (worst > TOL) fails.push({ A, B, worst, at });
  }
  return fails;
}

const label = (p) => `${MODES[p.sw[0]]}${p.sw[0] ? `(amp ${+p.sw[1].toFixed(3)} root y ${+p.rt[1].toFixed(2)})` : ""} [${p.min.map((x) => x.toFixed(2))}..${p.max.map((x) => x.toFixed(2))}]`;

function bakeOne(t, v, base) {
  const spec = CATALOG[t];
  const [fw, fd] = spec.footprint || [1, 1];
  const N = Math.max(fw, fd) + 4;
  const cells = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ h: 1, s: "sand" })));
  const L = { ...base, size: [N, N], decor: [{ t, x: 1, z: 1, v, rot: 0, ox: 0, oz: 0 }], cells, things: [] };
  const { group } = buildDecor(L, viewFrom(L, {}), makeStyle(L));
  const out = [], geos = [];
  group.updateMatrixWorld(true);
  group.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.aSway) { out.push(...parts(o.geometry)); geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); } });
  out.geos = geos;
  return out;
}

function clip(poly, a, b) {
  const out = [], side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
const area2 = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
const orient = (t) => (area2(t) < 0 ? [t[0], t[2], t[1]] : t);

function faces(geos) {
  const tris = [], seen = new Map(), par = [];
  const find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  for (const g of geos) {
    const P = g.attributes.position.array, C = g.attributes.color.array, S = g.attributes.aSway.array, R = g.attributes.aRoot.array;
    for (let v = 0; v < P.length; v += 9) {
      const vi = v / 3, sw = [...S.slice(vi * 4, vi * 4 + 4)], rt = [...R.slice(vi * 3, vi * 3 + 3)];
      if (sw[0] === 7) sw.fill(0);
      const t = tris.length, q = [0, 1, 2].map((k) => [P[v + k * 3], P[v + k * 3 + 1], P[v + k * 3 + 2]]);
      par.push(t);
      for (const x of q) { const id = x.map((c) => Math.round(c * 1e4)).join(); const o = seen.get(id); if (o === undefined) seen.set(id, t); else par[find(t)] = find(o); }
      const u = [0, 1, 2].map((a) => q[1][a] - q[0][a]), w = [0, 1, 2].map((a) => q[2][a] - q[0][a]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...n);
      if (l < 1e-9) { tris.push(null); continue; }
      const nn = n.map((x) => x / l), ax = nn.map(Math.abs).indexOf(Math.max(...nn.map(Math.abs)));
      const [i, j] = [0, 1, 2].filter((a) => a !== ax);
      const p2 = orient(q.map((x) => [x[i], x[j]]));
      tris.push({ col: [...C.slice(v, v + 3)].map((x) => Math.round(x * 255)).join(), sw, rt, r: Math.max(...q.map((x) => Math.hypot(x[0] - rt[0], x[2] - rt[2]))), n: nn, d: nn[0] * q[0][0] + nn[1] * q[0][1] + nn[2] * q[0][2], p2, q, min: [0, 1].map((k) => Math.min(...p2.map((x) => x[k]))), max: [0, 1].map((k) => Math.max(...p2.map((x) => x[k]))) });
    }
  }
  const box = new Map();
  tris.forEach((t, i) => { if (!t) return; const c = find(i), b = box.get(c) || box.set(c, [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]]).get(c); for (const x of t.q) for (let a = 0; a < 3; a++) { b[0][a] = Math.min(b[0][a], x[a]); b[1][a] = Math.max(b[1][a], x[a]); } });
  const buckets = new Map();
  tris.forEach((t, i) => { if (!t) return; t.c = find(i); const k = t.n.map((x) => Math.round(x * 50)).join(); (buckets.get(k) || buckets.set(k, []).get(k)).push(t); });
  const hits = new Map();
  for (const list of buckets.values()) {
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].d - list[i].d < FACE_WIN; j++) {
      const A = list[i], B = list[j];
      if (A.c === B.c || A.n[0] * B.n[0] + A.n[1] * B.n[1] + A.n[2] * B.n[2] < 0.999) continue;
      const same = samePhase(A, B) && A.sw[1] === B.sw[1] && A.sw[3] === B.sw[3] && A.rt[1] === B.rt[1];
      const rel = Math.max(...[...A.q, ...B.q].map((v) => { const ba = bound(A, v[1]), bb = bound(B, v[1]); return [0, 1, 2].reduce((s, k) => s + Math.abs(A.n[k]) * (same ? Math.abs(ba[k] - bb[k]) : ba[k] + bb[k]), 0); }));
      if (B.d - A.d >= FACE_GAP + rel || (same && A.col === B.col)) continue;
      if (A.max[0] <= B.min[0] || B.max[0] <= A.min[0] || A.max[1] <= B.min[1] || B.max[1] <= A.min[1]) continue;
      let poly = A.p2;
      for (let e = 0; e < 3 && poly.length; e++) poly = clip(poly, B.p2[e], B.p2[(e + 1) % 3]);
      const a = poly.length > 2 ? Math.abs(area2(poly)) : 0;
      if (a < 1e-6) continue;
      const id = A.c < B.c ? `${A.c},${B.c}` : `${B.c},${A.c}`, h = hits.get(id) || hits.set(id, { area: 0, gap: B.d - A.d, rel, boxes: [box.get(A.c), box.get(B.c)], at: A.q[0], n: A.n }).get(id);
      h.area += a;
    }
  }
  return [...hits.values()].filter((h) => h.area > FACE_AREA);
}

Object.defineProperty(Baker.prototype, "cull", { get: () => false, set() {} });
const loadErrors = [];
const err = console.error;
console.error = (...a) => { if (String(a[0]).startsWith("[pieces]")) loadErrors.push(a.join(" ")); err(...a); };
const results = new Map(), zfight = new Map();
let tested = 0;
async function sweep(name, base) {
  for (const t of Object.keys(CATALOG)) {
    if (only && t !== only) continue;
    if (CATALOG[t].cat !== "decor" || CATALOG[t].glb) continue;
    for (let v = 0; v < (CATALOG[t].variants || 1); v++) {
      let ps;
      try { ps = bakeOne(t, v, base); } catch (e) { if (verbose) console.error(`${name} ${t} v${v} bake failed: ${e.message}`); continue; }
      tested++;
      const id = `${t} v${v}`, zf = faces(ps.geos);
      if (zf.length && !zfight.has(id)) zfight.set(id, { name, zf });
      if (!ps.some((p) => p.peak)) continue;
      const fails = check(ps);
      if (fails.length && !results.has(id)) results.set(id, { name, fails });
    }
  }
}

const blank = { name: "base", cells: [[{ h: 1, s: "sand" }]], decor: [], pieces: [] };
const stamps = registerStamps(makeStyle(blank));
registerCatalog(stamps.catalog);
Object.assign(BUILDERS, stamps.builders);
await sweep("base", blank);
for (const name of list) {
  const level = JSON.parse(fs.readFileSync(path.join(root, "levels", `${name}.json`), "utf8"));
  for (const k of Object.keys(BUILDERS)) delete BUILDERS[k];
  await loadPieces({ ...level, pieces: (level.pieces || []).map((p) => path.join(root, "3d", p)) });
  await sweep(name, { ...level, decor: [], things: [] });
}
for (const [id, { name, fails }] of results) {
  console.log(`FAIL ${id} (${name})`);
  for (const f of fails.slice(0, verbose ? 99 : 3)) console.log(`  ${f.worst.toFixed(3)} over: ${label(f.A)} x ${label(f.B)} near [${f.at.map((x) => x.toFixed(2))}]`);
}
for (const [id, { name, zf }] of zfight) {
  console.log(`FAIL ${id} (${name}) coplanar faces`);
  for (const h of zf.slice(0, verbose ? 99 : 3)) console.log(`  area ${h.area.toFixed(4)} gap ${h.gap.toFixed(4)} need ${(FACE_GAP + h.rel).toFixed(4)} normal [${h.n.map((x) => x.toFixed(2))}] near [${h.at.map((x) => x.toFixed(2))}]${verbose ? " " + h.boxes.map((b) => `[${b[0].map((x) => x.toFixed(2))}..${b[1].map((x) => x.toFixed(2))}]`).join(" x ") : ""}`);
}
for (const e of loadErrors) console.log(`FAIL load ${e}`);
const fails = results.size + zfight.size + loadErrors.length + (tested ? 0 : 1);
console.log(`qa-sway: ${tested} prop variants, ${fails} fail`);
process.exitCode = fails ? 1 : 0;
