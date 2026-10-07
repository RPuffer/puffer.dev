import fs from "node:fs";
import sharp from "sharp";
import { HERE, ROOT, TYPES, specFor, liftedPalette } from "./lib.mjs";

const args = process.argv.slice(2);
const briefPath = args.find((a) => a.endsWith(".json")) || ROOT + "pipeline/seed/brief.json";
const ids = args.filter((a) => !a.endsWith(".json") && !a.startsWith("--"));
const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
const cfg = JSON.parse(fs.readFileSync(HERE + "lowpoly.json", "utf8"));
const LIFT = (await liftedPalette(brief, cfg._lift ?? 0)).map;
const h2r = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const liftHex = (h) => {
  h = h.toLowerCase();
  if (LIFT[h]) return LIFT[h];
  let best = null, bd = Infinity;
  for (const k of Object.keys(LIFT)) { const d = Math.hypot(...h2r(k).map((v, i) => v - h2r(h)[i])); if (d < bd) { bd = d; best = k; } }
  if (!best || bd > 40) return h;
  return "#" + h2r(h).map((v, i) => Math.max(0, Math.min(255, v + h2r(LIFT[best])[i] - h2r(best)[i])).toString(16).padStart(2, "0")).join("");
};
const RAW = ROOT + "3d/assets/forest-c/raw/", OUT = ROOT + "3d/assets/forest-c/";

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luma = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;

function families(type) {
  const spec = specFor(brief, type), fam = new Map();
  if (cfg[type]?.families) return cfg[type].families.map((trip) => ({ trip, rgb: trip.map(hex2rgb), top: liftHex(trip[0]) }));
  for (const p of spec.shape.parts || []) {
    const t = (p.tones || []).map((x) => x.toLowerCase());
    if (!t.length) continue;
    const trip = t.length >= 3 ? t.slice(0, 3) : [t[0], t[1] || t[0], t[1] || t[0]];
    fam.set(trip[0], trip);
  }
  if (!fam.size) { const t = [...new Set(spec.shape.parts.flatMap((p) => p.tones))]; for (let i = 0; i < t.length; i += 3) fam.set(t[i], [t[i], t[i + 1] || t[i], t[i + 2] || t[i]]); }
  for (const extra of cfg[type]?.extraFamilies || []) fam.set(extra[0], extra);
  return [...fam.values()].map((trip) => ({ trip, rgb: trip.map(hex2rgb), top: liftHex(trip[0]) }));
}

function readGlb(file) {
  const b = fs.readFileSync(file);
  const jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl));
  const binStart = 20 + jl + 8, bin = b.slice(binStart);
  const view = (i) => { const v = j.bufferViews[i]; return bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };
  const acc = (i) => { const a = j.accessors[i], v = view(a.bufferView), n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]; const Ctor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType]; return new Ctor(v.buffer, v.byteOffset + (a.byteOffset || 0), a.count * n); };
  const prim = j.meshes[0].primitives[0];
  const pos = Float32Array.from(acc(prim.attributes.POSITION)), uv = acc(prim.attributes.TEXCOORD_0), idx = Array.from(acc(prim.indices));
  const tex = j.materials[prim.material].pbrMetallicRoughness.baseColorTexture;
  const img = view(j.images[j.textures[tex.index].source].bufferView);
  return { pos, uv, idx, img };
}

function writeGlb(file, P, C, alpha = 1) {
  const n = P.length / 3, N = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    const a = t * 3, ux = P[a + 3] - P[a], uy = P[a + 4] - P[a + 1], uz = P[a + 5] - P[a + 2], vx = P[a + 6] - P[a], vy = P[a + 7] - P[a + 1], vz = P[a + 8] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    for (let k = 0; k < 3; k++) N.set([nx / l, ny / l, nz / l], a + k * 3);
  }
  const pb = Buffer.from(P.buffer), nb = Buffer.from(N.buffer), cb = Buffer.from(C.buffer);
  const bin = Buffer.concat([pb, nb, cb]);
  const min = [0, 1, 2].map((k) => Math.min(...P.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map((k) => Math.max(...P.filter((_, i) => i % 3 === k)));
  const json = { asset: { version: "2.0", generator: "isoworld c-meshes lowpoly" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0, mode: 4 }] }],
    materials: [alpha < 1 ? { pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, alpha], metallicFactor: 0, roughnessFactor: 1 }, alphaMode: "BLEND", doubleSided: false, extensions: { KHR_materials_unlit: {} } } : { pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 }, doubleSided: false }],
    ...(alpha < 1 ? { extensionsUsed: ["KHR_materials_unlit"] } : {}),
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pb.length, target: 34962 }, { buffer: 0, byteOffset: pb.length, byteLength: nb.length, target: 34962 }, { buffer: 0, byteOffset: pb.length + nb.length, byteLength: cb.length, target: 34962 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: n, type: "VEC3", min, max }, { bufferView: 1, componentType: 5126, count: n, type: "VEC3" }, { bufferView: 2, componentType: 5126, count: n, type: "VEC3" }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const bb = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bb.length, 8);
  const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.writeUInt32LE(type, 4); return h; };
  fs.writeFileSync(file, Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bb.length, 0x004e4942), bb]));
}

function cluster(pos, idx, G, snap) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
  const cell = Math.max(...hi.map((h, k) => h - lo[k])) / G;
  const cid = new Map(), vmap = new Int32Array(pos.length / 3), sum = [];
  for (let v = 0; v < pos.length / 3; v++) {
    const k = [0, 1, 2].map((a) => Math.floor((pos[v * 3 + a] - lo[a]) / cell)).join(",");
    let c = cid.get(k); if (c == null) { c = sum.length; cid.set(k, c); sum.push([0, 0, 0, 0]); }
    vmap[v] = c; const s = sum[c]; s[0] += pos[v * 3]; s[1] += pos[v * 3 + 1]; s[2] += pos[v * 3 + 2]; s[3]++;
  }
  const verts = sum.map((s) => [s[0] / s[3], s[1] / s[3], s[2] / s[3]]);
  if (snap) for (const v of verts) for (let k = 0; k < 3; k++) { const q = lo[k] + Math.round((v[k] - lo[k]) / (cell * snap)) * cell * snap; v[k] = v[k] + (q - v[k]) * 0.85; }
  const seen = new Map(), tris = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = vmap[idx[t]], b = vmap[idx[t + 1]], c = vmap[idx[t + 2]];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(",");
    if (seen.has(key)) { tris[seen.get(key)].src.push(t / 3); continue; }
    seen.set(key, tris.length); tris.push({ v: [a, b, c], src: [t / 3] });
  }
  return { verts, tris, vmap };
}

async function one(type) {
  const c = cfg[type] || {};
  const { pos, uv, idx, img } = readGlb(`${RAW}${type}.glb`);
  const { data: px, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sample = (u, v) => { const x = Math.min(info.width - 1, Math.max(0, Math.round(u * (info.width - 1)))), y = Math.min(info.height - 1, Math.max(0, Math.round(v * (info.height - 1)))), i = (y * info.width + x) * 3; return [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255]; };
  const fams = families(type);
  const famOf = (rgb) => { let best = 0, bd = Infinity; fams.forEach((f, i) => { for (const t of f.rgb) { const d = 0.3 * (rgb[0] - t[0]) ** 2 + 0.59 * (rgb[1] - t[1]) ** 2 + 0.11 * (rgb[2] - t[2]) ** 2 + (c.hueWeight ?? 0.6) * ((rgb[0] - rgb[2]) - (t[0] - t[2])) ** 2; if (d < bd) { bd = d; best = i; } } }); return best; };
  const T = idx.length / 3, triFam = new Int32Array(T), triArea = new Float32Array(T);
  for (let t = 0; t < T; t++) {
    const [a, b, d] = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]];
    const acc = [0, 0, 0];
    for (const [wa, wb, wd] of [[1 / 3, 1 / 3, 1 / 3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6]]) { const s = sample(uv[a * 2] * wa + uv[b * 2] * wb + uv[d * 2] * wd, uv[a * 2 + 1] * wa + uv[b * 2 + 1] * wb + uv[d * 2 + 1] * wd); acc[0] += s[0] / 4; acc[1] += s[1] / 4; acc[2] += s[2] / 4; }
    triFam[t] = famOf(acc);
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2], vx = pos[d * 3] - pos[a * 3], vy = pos[d * 3 + 1] - pos[a * 3 + 1], vz = pos[d * 3 + 2] - pos[a * 3 + 2];
    triArea[t] = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  if (c.voxel) return voxelize(type, c, pos, idx, triFam, triArea, fams);
  const target = c.faces || 400;
  let G = c.grid || 24, out;
  for (; G >= 5; G--) { out = cluster(pos, idx, G, c.snap || 0); if (out.tris.length <= target) break; }
  const { verts, tris, vmap } = out;
  const vVotes = verts.map(() => new Float32Array(fams.length));
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) vVotes[vmap[idx[t * 3 + k]]][triFam[t]] += triArea[t];
  const adj = new Map();
  tris.forEach((tr, i) => { for (const v of tr.v) { if (!adj.has(v)) adj.set(v, []); adj.get(v).push(i); } });
  const compOf = new Int32Array(tris.length).fill(-1), compSize = [];
  for (let i = 0; i < tris.length; i++) { if (compOf[i] >= 0) continue; const id = compSize.length, st = [i]; compOf[i] = id; let n = 0; while (st.length) { const j = st.pop(); n++; for (const v of tris[j].v) for (const k of adj.get(v)) if (compOf[k] < 0) { compOf[k] = id; st.push(k); } } compSize.push(n); }
  const bigComp = Math.max(...compSize), keepTri = tris.map((_, i) => compSize[compOf[i]] >= bigComp * (c.minComp ?? 0.08));
  const P = [], C = [], rot = c.yaw ? (c.yaw * Math.PI) / 180 : 0, cs = Math.cos(rot), sn = Math.sin(rot);
  const famCount = new Array(fams.length).fill(0);
  for (const [ti, tr] of tris.entries()) {
    if (!keepTri[ti]) continue;
    const votes = new Float32Array(fams.length);
    for (const s of tr.src) votes[triFam[s]] += triArea[s] * 4;
    for (const v of tr.v) for (let f = 0; f < fams.length; f++) votes[f] += vVotes[v][f];
    let f = 0; for (let i = 1; i < fams.length; i++) if (votes[i] > votes[f]) f = i;
    famCount[f]++;
    const top = hex2rgb(fams[f].top).map(lin);
    for (const v of tr.v) { const [x, y, z] = verts[v]; P.push(x * cs - z * sn, y * (c.scaleY || 1), x * sn + z * cs); C.push(...top); }
  }
  writeGlb(`${OUT}${type}.glb`, Float32Array.from(P), Float32Array.from(C), c.alpha || 1);
  meta[type] = { faces: P.length / 9, lean: leanOf(P) };
  return `${type}: ${T} -> ${P.length / 9} faces (${tris.length} before component filter) (grid ${G}), families ${fams.map((f, i) => `${f.trip[0]}->${f.top}x${famCount[i]}`).join(" ")}`;
}

function leanOf(P) {
  let y0 = Infinity, y1 = -Infinity; for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
  const band = (lo, hi) => { let sx = 0, sz = 0, n = 0; for (let i = 0; i < P.length; i += 3) { const u = (P[i + 1] - y0) / (y1 - y0); if (u >= lo && u <= hi) { sx += P[i]; sz += P[i + 2]; n++; } } return [sx / (n || 1), sz / (n || 1)]; };
  const b0 = band(0, 0.15), b1 = band(0.8, 1), h = y1 - y0;
  return [+((b1[0] - b0[0]) / h).toFixed(3), +((b1[1] - b0[1]) / h).toFixed(3)];
}

function voxelize(type, c, pos, idx, triFam, triArea, fams) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
  const cell = Math.max(...hi.map((h, k) => h - lo[k])) / c.voxel;
  const dim = hi.map((h, k) => Math.ceil((h - lo[k]) / cell) + 3);
  const at = (x, y, z) => (x * dim[1] + y) * dim[2] + z;
  const votes = new Map(), solid = new Uint8Array(dim[0] * dim[1] * dim[2]);
  const P3 = (v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
  for (let t = 0; t < idx.length / 3; t++) {
    const A = P3(idx[t * 3]), B = P3(idx[t * 3 + 1]), C = P3(idx[t * 3 + 2]);
    const e = Math.max(Math.hypot(...A.map((v, i) => v - B[i])), Math.hypot(...B.map((v, i) => v - C[i])), Math.hypot(...C.map((v, i) => v - A[i])));
    const n = Math.max(1, Math.ceil(e / (cell * 0.4)));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, w = 1 - u - v;
      const p = [0, 1, 2].map((k) => A[k] * w + B[k] * u + C[k] * v);
      const q = p.map((x, k) => Math.floor((x - lo[k]) / cell) + 1), id = at(...q);
      solid[id] = 1;
      if (!votes.has(id)) votes.set(id, new Float32Array(fams.length));
      votes.get(id)[triFam[t]] += triArea[t] / ((n + 1) * (n + 2) / 2);
    }
  }
  const out = new Uint8Array(solid.length), st = [at(0, 0, 0)]; out[st[0]] = 1;
  while (st.length) { const id = st.pop(), z = id % dim[2], y = ((id - z) / dim[2]) % dim[1], x = Math.floor(id / (dim[1] * dim[2])); for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0 || X >= dim[0] || Y >= dim[1] || Z >= dim[2]) continue; const j = at(X, Y, Z); if (out[j] || solid[j]) continue; out[j] = 1; st.push(j); } }
  const P = [], C = [], rot = c.yaw ? (c.yaw * Math.PI) / 180 : 0, cs = Math.cos(rot), sn = Math.sin(rot);
  const famCount = new Array(fams.length).fill(0);
  const famAt = (x, y, z) => { const v = votes.get(at(x, y, z)); if (!v) return -1; let f = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[f]) f = i; return f; };
  const push = (pts, f) => { const top = hex2rgb(fams[f].top).map(lin); for (const [a, b, d] of [[0, 1, 2], [0, 2, 3]]) for (const k of [a, b, d]) { const [x, y, z] = pts[k]; P.push(x * cs - z * sn, y, x * sn + z * cs); C.push(...top); } };
  const faces = [[[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]], [[0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]], [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]]];
  for (let x = 1; x < dim[0] - 1; x++) for (let y = 1; y < dim[1] - 1; y++) for (let z = 1; z < dim[2] - 1; z++) {
    if (out[at(x, y, z)]) continue;
    let f = famAt(x, y, z);
    if (f < 0) { const near = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([a, b, d]) => famAt(x + a, y + b, z + d)).filter((v) => v >= 0); f = near[0] ?? 0; }
    for (const [n, quad] of faces) {
      if (!out[at(x + n[0], y + n[1], z + n[2])]) continue;
      push(quad.map(([a, b, d]) => [lo[0] + (x - 1 + a) * cell, (lo[1] + (y - 1 + b) * cell) * (c.scaleY || 1), lo[2] + (z - 1 + d) * cell]), f);
      famCount[f] += 2;
    }
  }
  writeGlb(`${OUT}${type}.glb`, Float32Array.from(P), Float32Array.from(C), c.alpha || 1);
  meta[type] = { faces: P.length / 9, voxel: c.voxel, lean: leanOf(P) };
  return `${type}: voxel ${c.voxel} -> ${P.length / 9} faces, families ${fams.map((f, i) => `${f.trip[0]}->${f.top}x${famCount[i]}`).join(" ")}`;
}

const metaFile = OUT + "meta.json";
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
for (const t of ids.length ? ids : Object.keys(TYPES)) console.log(await one(t));
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 1));
