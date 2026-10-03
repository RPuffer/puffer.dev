import fs from "node:fs";
import sharp from "sharp";
import * as THREE from "three";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const HERE = new URL(".", import.meta.url).pathname;
const ROOT = new URL("../../../", import.meta.url).pathname;
const OUT = ROOT + "3d/assets/multitile/";
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? "1"]; }));
const items = args.filter((a) => !a.startsWith("--"));
const cfgAll = JSON.parse(fs.readFileSync(HERE + "lowpoly.json", "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const h2r = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function readGlb(file) {
  const b = fs.readFileSync(file);
  const jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl));
  const bin = b.slice(20 + jl + 8);
  const view = (i) => { const v = j.bufferViews[i]; return bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };
  const acc = (i) => { const a = j.accessors[i], v = view(a.bufferView), n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]; const Ctor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType]; return new Ctor(v.buffer, v.byteOffset + (a.byteOffset || 0), a.count * n); };
  const prim = j.meshes[0].primitives[0];
  const tex = j.materials[prim.material].pbrMetallicRoughness.baseColorTexture;
  return { pos: Float32Array.from(acc(prim.attributes.POSITION)), uv: acc(prim.attributes.TEXCOORD_0), idx: Array.from(acc(prim.indices)), img: view(j.images[j.textures[tex.index].source].bufferView) };
}

function writeGlb(file, P, C, extras) {
  const n = P.length / 3, N = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    const a = t * 3, ux = P[a + 3] - P[a], uy = P[a + 4] - P[a + 1], uz = P[a + 5] - P[a + 2], vx = P[a + 6] - P[a], vy = P[a + 7] - P[a + 1], vz = P[a + 8] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
    for (let k = 0; k < 3; k++) N.set([nx / l, ny / l, nz / l], a + k * 3);
  }
  const pb = Buffer.from(P.buffer), nb = Buffer.from(N.buffer), cb = Buffer.from(C.buffer), bin = Buffer.concat([pb, nb, cb]);
  const min = [0, 1, 2].map((k) => Math.min(...P.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map((k) => Math.max(...P.filter((_, i) => i % 3 === k)));
  const json = { asset: { version: "2.0", generator: "isoworld multitile mesh lowpoly", extras }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0, mode: 4 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 }, doubleSided: false }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pb.length, target: 34962 }, { buffer: 0, byteOffset: pb.length, byteLength: nb.length, target: 34962 }, { buffer: 0, byteOffset: pb.length + nb.length, byteLength: cb.length, target: 34962 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: n, type: "VEC3", min, max }, { bufferView: 1, componentType: 5126, count: n, type: "VEC3" }, { bufferView: 2, componentType: 5126, count: n, type: "VEC3" }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const bb = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bb.length, 8);
  const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.writeUInt32LE(type, 4); return h; };
  fs.writeFileSync(file, Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bb.length, 0x004e4942), bb]));
}

function bounds(P) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
  return { lo, hi };
}

function place(pos, c) {
  const r = ((c.yaw || 0) * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  for (let i = 0; i < pos.length; i += 3) { const x = pos[i], z = pos[i + 2]; pos[i] = x * cs - z * sn; pos[i + 2] = x * sn + z * cs; }
  const { lo, hi } = bounds(pos), H = hi[1] - lo[1], band = lo[1] + H * (c.baseBand ?? 0.12);
  const blo = [Infinity, Infinity], bhi = [-Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) if (pos[i + 1] <= band) { blo[0] = Math.min(blo[0], pos[i]); bhi[0] = Math.max(bhi[0], pos[i]); blo[1] = Math.min(blo[1], pos[i + 2]); bhi[1] = Math.max(bhi[1], pos[i + 2]); }
  const sy = c.height / H, base = Math.max(bhi[0] - blo[0], bhi[1] - blo[1]);
  const uniform = sy;
  const want = c.baseSpan / base;
  const sxz = c.stretch === false ? uniform : Math.min(want, uniform * (c.maxStretch ?? 1.6));
  const cx = (blo[0] + bhi[0]) / 2, cz = (blo[1] + bhi[1]) / 2;
  for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - cx) * sxz; pos[i + 1] = (pos[i + 1] - lo[1]) * sy; pos[i + 2] = (pos[i + 2] - cz) * sxz; }
  return { stretch: +(sxz / uniform).toFixed(3), baseSpan: +(base * sxz).toFixed(2), rawBase: +(base * uniform).toFixed(2) };
}

function cluster(pos, idx, G, snap) {
  const { lo, hi } = bounds(pos);
  const cell = Math.max(...hi.map((h, k) => h - lo[k])) / G;
  const cid = new Map(), vmap = new Int32Array(pos.length / 3), sum = [];
  for (let v = 0; v < pos.length / 3; v++) {
    const k = [0, 1, 2].map((a) => Math.floor((pos[v * 3 + a] - lo[a]) / cell)).join(",");
    let c = cid.get(k); if (c == null) { c = sum.length; cid.set(k, c); sum.push([0, 0, 0, 0]); }
    vmap[v] = c; const s = sum[c]; s[0] += pos[v * 3]; s[1] += pos[v * 3 + 1]; s[2] += pos[v * 3 + 2]; s[3]++;
  }
  const verts = sum.map((s) => [s[0] / s[3], s[1] / s[3], s[2] / s[3]]);
  if (snap) for (const v of verts) for (let k = 0; k < 3; k++) { const q = lo[k] + Math.round((v[k] - lo[k]) / (cell * snap)) * cell * snap; v[k] += (q - v[k]) * 0.85; }
  const seen = new Map(), tris = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = vmap[idx[t]], b = vmap[idx[t + 1]], c = vmap[idx[t + 2]];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(",");
    if (seen.has(key)) { tris[seen.get(key)].src.push(t / 3); continue; }
    seen.set(key, tris.length); tris.push({ v: [a, b, c], src: [t / 3] });
  }
  return { verts, tris, vmap, cell };
}

async function qem(pos, idx, triFam, triArea, nf, c) {
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(pos), 3));
  g.setIndex(idx);
  g = mergeVertices(g, 1e-4);
  const target = Math.round(c.faces / 2);
  g = await new SimplifyModifier().modify(g, Math.max(0, g.attributes.position.count - target));
  if (!g.index) g = mergeVertices(g, 1e-6);
  const P = g.attributes.position, I = g.index.array;
  const verts = []; for (let i = 0; i < P.count; i++) verts.push([P.getX(i), P.getY(i), P.getZ(i)]);
  if (c.lattice) {
    const { lo } = bounds(pos), step = c.height / c.lattice;
    for (const v of verts) for (let k = 0; k < 3; k++) { const q = lo[k] + Math.round((v[k] - lo[k]) / step) * step; v[k] += (q - v[k]) * (c.latticePull ?? 0.6); }
  }
  const cent = [], cell = c.height / 24, hash = new Map();
  for (let t = 0; t < idx.length / 3; t++) {
    const p = [0, 1, 2].map((k) => (pos[idx[t * 3] * 3 + k] + pos[idx[t * 3 + 1] * 3 + k] + pos[idx[t * 3 + 2] * 3 + k]) / 3);
    cent.push(p);
    const key = p.map((v) => Math.floor(v / cell)).join(",");
    if (!hash.has(key)) hash.set(key, []); hash.get(key).push(t);
  }
  const nearest = (p) => {
    const b = p.map((v) => Math.floor(v / cell));
    for (let r = 1; r <= 4; r++) {
      let best = -1, bd = Infinity;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (const t of hash.get([b[0] + dx, b[1] + dy, b[2] + dz].join(",")) || []) { const d = (cent[t][0] - p[0]) ** 2 + (cent[t][1] - p[1]) ** 2 + (cent[t][2] - p[2]) ** 2; if (d < bd) { bd = d; best = t; } }
      if (best >= 0) return best;
    }
    return 0;
  };
  const tris = [], lab = [];
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) continue;
    const votes = new Float32Array(nf);
    for (const [a, b, d] of [[1 / 3, 1 / 3, 1 / 3], [0.7, 0.15, 0.15], [0.15, 0.7, 0.15], [0.15, 0.15, 0.7], [0.45, 0.45, 0.1], [0.1, 0.45, 0.45], [0.45, 0.1, 0.45]]) {
      const p = [0, 1, 2].map((k) => verts[v[0]][k] * a + verts[v[1]][k] * b + verts[v[2]][k] * d);
      const o = nearest(p); votes[triFam[o]] += 1 + triArea[o] * 0;
    }
    let f = 0; for (let i = 1; i < nf; i++) if (votes[i] > votes[f]) f = i;
    tris.push({ v }); lab.push(f);
  }
  return { verts, tris, lab };
}

async function gainOf(px, info, item, c) {
  if (Array.isArray(c.gain)) return c.gain;
  const { data, info: ci } = await sharp(`${HERE}${item}.cut.png`).raw().toBuffer({ resolveWithObject: true });
  const mi = [0, 0, 0], mt = [0, 0, 0]; let ni = 0, nt = 0;
  for (let i = 0; i < ci.width * ci.height; i++) if (data[i * 4 + 3]) { for (let k = 0; k < 3; k++) mi[k] += data[i * 4 + k]; ni++; }
  for (let i = 0; i < info.width * info.height; i++) { const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2]; if (r + g + b < 15) continue; mt[0] += r; mt[1] += g; mt[2] += b; nt++; }
  return mi.map((v, k) => v / ni / (mt[k] / nt));
}

function voxel(item, c, pos, idx, triFam, triArea, names, fams, fit, gain) {
  const { lo, hi } = bounds(pos), cell = (hi[1] - lo[1]) / c.voxel;
  const dim = hi.map((h, k) => Math.ceil((h - lo[k]) / cell) + 3), at = (x, y, z) => (x * dim[1] + y) * dim[2] + z;
  const N = dim[0] * dim[1] * dim[2], solid = new Uint8Array(N), votes = new Map();
  const P3 = (v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
  for (let t = 0; t < idx.length / 3; t++) {
    const A = P3(idx[t * 3]), B = P3(idx[t * 3 + 1]), C = P3(idx[t * 3 + 2]);
    const e = Math.max(Math.hypot(...A.map((v, i) => v - B[i])), Math.hypot(...B.map((v, i) => v - C[i])), Math.hypot(...C.map((v, i) => v - A[i])));
    const n = Math.max(1, Math.ceil(e / (cell * 0.4)));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, w = 1 - u - v;
      const q = [0, 1, 2].map((k) => Math.floor((A[k] * w + B[k] * u + C[k] * v - lo[k]) / cell) + 1), id = at(...q);
      solid[id] = 1;
      if (!votes.has(id)) votes.set(id, new Float32Array(fams.length));
      votes.get(id)[triFam[t]] += triArea[t] / ((n + 1) * (n + 2) / 2);
    }
  }
  const outside = new Uint8Array(N), st = [0]; outside[0] = 1;
  const nb6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const xyz = (id) => { const z = id % dim[2], y = ((id - z) / dim[2]) % dim[1]; return [Math.floor(id / (dim[1] * dim[2])), y, z]; };
  const inb = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < dim[0] && y < dim[1] && z < dim[2];
  while (st.length) { const [x, y, z] = xyz(st.pop()); for (const [a, b, d] of nb6) { if (!inb(x + a, y + b, z + d)) continue; const j = at(x + a, y + b, z + d); if (outside[j] || solid[j]) continue; outside[j] = 1; st.push(j); } }
  const fam = new Int16Array(N).fill(-1), q = [];
  for (const [id, v] of votes) { let f = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[f]) f = i; fam[id] = f; q.push(id); }
  while (q.length) { const id = q.shift(); const [x, y, z] = xyz(id); for (const [a, b, d] of nb6) { if (!inb(x + a, y + b, z + d)) continue; const j = at(x + a, y + b, z + d); if (outside[j] || fam[j] >= 0) continue; fam[j] = fam[id]; q.push(j); } }
  for (let p = 0; p < (c.smooth ?? 1); p++) {
    const nf = fam.slice();
    for (let id = 0; id < N; id++) { if (outside[id] || fam[id] < 0) continue; const [x, y, z] = xyz(id), cnt = new Map(); for (const [a, b, d] of nb6) { if (!inb(x + a, y + b, z + d)) continue; const f = fam[at(x + a, y + b, z + d)]; if (f >= 0 && !outside[at(x + a, y + b, z + d)]) cnt.set(f, (cnt.get(f) || 0) + 1); } let bf = fam[id], bc = 2; for (const [f, k] of cnt) if (k > bc + (f === fam[id] ? 0 : 1)) { bc = k; bf = f; } nf[id] = bf; }
    fam.set(nf);
  }
  if (c.minVox) {
    const seen = new Uint8Array(N);
    for (let id = 0; id < N; id++) { if (outside[id] || seen[id]) continue; const comp = [id]; seen[id] = 1; for (let k = 0; k < comp.length; k++) { const [x, y, z] = xyz(comp[k]); for (const [a, b, d] of nb6) { if (!inb(x + a, y + b, z + d)) continue; const j = at(x + a, y + b, z + d); if (!outside[j] && !seen[j]) { seen[j] = 1; comp.push(j); } } } if (comp.length < c.minVox) for (const j of comp) outside[j] = 1; }
  }
  const Pp = [], Cc = [], counts = Object.fromEntries(names.map((n) => [n, 0])), swayTris = [];
  const swayFam = c.sway ? names.indexOf(c.sway) : -1;
  const W = (k, i) => lo[k] + (i - 1) * cell;
  for (let ax = 0; ax < 3; ax++) for (const sgn of [1, -1]) {
    if (ax === 1 && sgn < 0) continue;
    const u = (ax + 1) % 3, v = (ax + 2) % 3, n = [0, 0, 0]; n[ax] = sgn;
    const cls = faceClass(...n);
    for (let s = 1; s < dim[ax] - 1; s++) {
      const mask = new Int16Array(dim[u] * dim[v]).fill(-1);
      for (let a = 0; a < dim[u]; a++) for (let b = 0; b < dim[v]; b++) {
        const p = [0, 0, 0]; p[ax] = s; p[u] = a; p[v] = b;
        const id = at(...p); if (outside[id]) continue;
        const o = p.slice(); o[ax] += sgn; if (!outside[at(...o)]) continue;
        mask[a * dim[v] + b] = fam[id] < 0 ? 0 : fam[id];
      }
      for (let a = 0; a < dim[u]; a++) for (let b = 0; b < dim[v]; b++) {
        const f = mask[a * dim[v] + b]; if (f < 0) continue;
        let wb = 1; while (b + wb < dim[v] && mask[a * dim[v] + b + wb] === f) wb++;
        let ha = 1; grow: while (a + ha < dim[u]) { for (let k = 0; k < wb; k++) if (mask[(a + ha) * dim[v] + b + k] !== f) break grow; ha++; }
        for (let i = 0; i < ha; i++) for (let k = 0; k < wb; k++) mask[(a + i) * dim[v] + b + k] = -1;
        const plane = s + (sgn > 0 ? 1 : 0);
        const corner = (da, db) => { const p = [0, 0, 0]; p[ax] = W(ax, plane); p[u] = W(u, a + da); p[v] = W(v, b + db); return p; };
        const q0 = corner(0, 0), q1 = corner(ha, 0), q2 = corner(ha, wb), q3 = corner(0, wb);
        const quad = sgn > 0 ? [[q0, q1, q2], [q0, q2, q3]] : [[q0, q2, q1], [q0, q3, q2]];
        const col = fams[f][cls].map(lin);
        for (const tri of quad) { for (const V of tri) { Pp.push(...V); Cc.push(...col); } if (f === swayFam) swayTris.push(Pp.length / 9 - 1); counts[names[f]]++; }
      }
    }
  }
  const P = Float32Array.from(Pp), b2 = bounds(P);
  const k = c.height / (b2.hi[1] - b2.lo[1]), mx = (b2.lo[0] + b2.hi[0]) / 2, mz = (b2.lo[2] + b2.hi[2]) / 2;
  for (let i = 0; i < P.length; i += 3) { P[i] = (P[i] - (c.recentre ? mx : 0)) * k; P[i + 1] = (P[i + 1] - b2.lo[1]) * k; P[i + 2] = (P[i + 2] - (c.recentre ? mz : 0)) * k; }
  Object.assign(b2, bounds(P));
  const meta = { item, src: c.src, mode: "voxel", voxel: c.voxel, gain: gain.map((x) => +x.toFixed(3)), faces: P.length / 9, families: counts, fit, extent: { x: +(b2.hi[0] - b2.lo[0]).toFixed(2), y: +(b2.hi[1] - b2.lo[1]).toFixed(2), z: +(b2.hi[2] - b2.lo[2]).toFixed(2) }, swayFaces: swayTris.length };
  writeGlb(`${OUT}${opt.out || item}.glb`, P, Float32Array.from(Cc), { sway: c.sway ? { family: c.sway, tris: swayTris } : null, meta });
  return meta;
}

const faceClass = (nx, ny, nz) => (ny > 0.55 ? 0 : nz >= nx ? 1 : 2);

function smoothLabels(tris, lab, area, passes) {
  const edge = new Map();
  tris.forEach((t, i) => { for (let k = 0; k < 3; k++) { const a = t.v[k], b = t.v[(k + 1) % 3], key = a < b ? a + "," + b : b + "," + a; if (!edge.has(key)) edge.set(key, []); edge.get(key).push(i); } });
  const nb = tris.map(() => []);
  for (const l of edge.values()) for (const i of l) for (const j of l) if (i !== j) nb[i].push(j);
  for (let p = 0; p < passes; p++) {
    const next = lab.slice();
    tris.forEach((_, i) => {
      const w = new Map([[lab[i], area[i] * 1.2]]);
      for (const j of nb[i]) w.set(lab[j], (w.get(lab[j]) || 0) + area[j]);
      let best = lab[i], bw = -1; for (const [k, v] of w) if (v > bw) { bw = v; best = k; }
      next[i] = best;
    });
    lab.splice(0, lab.length, ...next);
  }
  return lab;
}

async function one(item) {
  const c = { ...cfgAll[item] };
  for (const [k, v] of Object.entries(opt)) c[k] = isNaN(+v) ? v : +v;
  const { pos, uv, idx, img } = readGlb(`${HERE}raw/${c.src}.glb`);
  const fit = place(pos, c);
  const { data: px, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const gain = await gainOf(px, info, item, c);
  const sample0 = (u, v) => { const x = Math.min(info.width - 1, Math.max(0, Math.round(u * (info.width - 1)))), y = Math.min(info.height - 1, Math.max(0, Math.round(v * (info.height - 1)))), i = (y * info.width + x) * 3; return [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255]; };
  const sample = (u, v) => sample0(u, v).map((x, k) => Math.min(1, x * gain[k]));
  const names = Object.keys(c.families), fams = names.map((n) => c.families[n].map(h2r));
  const famOf = (rgb) => { let best = 0, bd = Infinity; fams.forEach((f, i) => { for (const t of f) { const d = 0.3 * (rgb[0] - t[0]) ** 2 + 0.59 * (rgb[1] - t[1]) ** 2 + 0.11 * (rgb[2] - t[2]) ** 2 + 0.6 * ((rgb[0] - rgb[2]) - (t[0] - t[2])) ** 2 + 0.6 * ((rgb[1] - rgb[0]) - (t[1] - t[0])) ** 2; if (d < bd) { bd = d; best = i; } } }); return best; };
  const T = idx.length / 3, triFam = new Int32Array(T), triArea = new Float32Array(T);
  for (let t = 0; t < T; t++) {
    const [a, b, d] = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]], acc = [0, 0, 0];
    for (const [wa, wb, wd] of [[1 / 3, 1 / 3, 1 / 3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6]]) { const s = sample(uv[a * 2] * wa + uv[b * 2] * wb + uv[d * 2] * wd, uv[a * 2 + 1] * wa + uv[b * 2 + 1] * wb + uv[d * 2 + 1] * wd); for (let k = 0; k < 3; k++) acc[k] += s[k] / 4; }
    triFam[t] = famOf(acc);
    const P = (q) => [pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]], A = P(a), B = P(b), D = P(d);
    const u = B.map((v, k) => v - A[k]), w = D.map((v, k) => v - A[k]);
    triArea[t] = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
  }
  let G = 0, verts, tris, lab;
  if (c.mode === "voxel") return voxel(item, c, pos, idx, triFam, triArea, names, fams, fit, gain);
  if (c.mode === "qem") ({ verts, tris, lab } = await qem(pos, idx, triFam, triArea, fams.length, c));
  else {
    let out;
    for (G = c.grid || 40; G >= 6; G--) { out = cluster(pos, idx, G, c.snap || 0); if (out.tris.length <= c.faces) break; }
    ({ verts, tris } = out);
    lab = tris.map((tr) => { const v = new Float32Array(fams.length); for (const s of tr.src) v[triFam[s]] += triArea[s]; let f = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[f]) f = i; return f; });
  }
  const area = tris.map((tr) => { const [A, B, D] = tr.v.map((v) => verts[v]); const u = B.map((v, k) => v - A[k]), w = D.map((v, k) => v - A[k]); return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2; });
  lab = smoothLabels(tris, lab, area, c.smooth ?? 2);
  const adj = new Map();
  tris.forEach((tr, i) => { for (const v of tr.v) { if (!adj.has(v)) adj.set(v, []); adj.get(v).push(i); } });
  const comp = new Int32Array(tris.length).fill(-1), size = [];
  for (let i = 0; i < tris.length; i++) { if (comp[i] >= 0) continue; const id = size.length, st = [i]; comp[i] = id; let n = 0; while (st.length) { const j = st.pop(); n++; for (const v of tris[j].v) for (const k of adj.get(v)) if (comp[k] < 0) { comp[k] = id; st.push(k); } } size.push(n); }
  const big = Math.max(...size);
  const Pp = [], Cc = [], counts = Object.fromEntries(names.map((n) => [n, 0])), swayTris = [];
  tris.forEach((tr, i) => {
    if (size[comp[i]] < big * (c.minComp ?? 0.02)) return;
    const [A, B, D] = tr.v.map((v) => verts[v]);
    const u = B.map((v, k) => v - A[k]), w = D.map((v, k) => v - A[k]);
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const l = Math.hypot(...n); if (l < 1e-9) return; n = n.map((v) => v / l);
    const col = fams[lab[i]][faceClass(...n)].map(lin);
    for (const V of [A, B, D]) { Pp.push(...V); Cc.push(...col); }
    if (c.sway && names[lab[i]] === c.sway) swayTris.push(Pp.length / 9 - 1);
    counts[names[lab[i]]]++;
  });
  const P = Float32Array.from(Pp), { lo, hi } = bounds(P);
  const meta = { item, src: c.src, gain: gain.map((v) => +v.toFixed(3)), faces: P.length / 9, grid: G, families: counts, fit, extent: { x: +(hi[0] - lo[0]).toFixed(2), y: +(hi[1] - lo[1]).toFixed(2), z: +(hi[2] - lo[2]).toFixed(2) }, swayFaces: swayTris.length };
  const name = opt.out || item;
  writeGlb(`${OUT}${name}.glb`, P, Float32Array.from(Cc), { sway: c.sway ? { family: c.sway, tris: swayTris } : null, meta });
  return meta;
}

for (const it of items.length ? items : Object.keys(cfgAll)) console.log(JSON.stringify(await one(it)));
