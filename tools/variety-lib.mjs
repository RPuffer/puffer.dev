import { routeFingerprint, fingerprintClash, SAME_ROUTE } from "../core/layout/topology.js";

export const T = {
  footprintMax: 0.55,
  footprintMean: 0.4,
  centreMax: 0.6,
  centreMean: 0.45,
  commonLand: 0.15,
  commonPath: 0.1,
  centrepiecePerNinth: 3,
  shapesDistinct: 8,
  multiLandmass: 4,
  farDistinct: 10,
  farNinths: 3,
  detour: 6,
};
const WINDOW = [18, 21];

const isLand = (c) => !!c && c.s !== "none" && c.s !== "water";
const k = (x, z) => x + "," + z;
const unk = (s) => s.split(",").map(Number);

function dihedral([x, z], t) {
  let a = t >= 4 ? -x : x, b = z;
  for (let r = 0; r < t % 4; r++) [a, b] = [-b, a];
  return [a, b];
}
function normalise(cells) {
  let mx = Infinity, mz = Infinity;
  for (const [x, z] of cells) { mx = Math.min(mx, x); mz = Math.min(mz, z); }
  return cells.map(([x, z]) => [x - mx, z - mz]);
}
const toSet = (cells) => new Set(cells.map(([x, z]) => k(x, z)));
const jac = (a, b) => { let i = 0; for (const s of a) if (b.has(s)) i++; const u = a.size + b.size - i; return u ? i / u : 1; };
const bbox = (cells) => cells.reduce((b, [x, z]) => [Math.min(b[0], x), Math.min(b[1], z), Math.max(b[2], x), Math.max(b[3], z)], [Infinity, Infinity, -Infinity, -Infinity]);

function canon(L) {
  const [W, D] = L.size, m = !!L.layout?.mirror;
  const fx = (x) => (m ? W - 1 - x : x);
  const land = [], path_ = [];
  L.cells.forEach((row, z) => row.forEach((c, x) => {
    if (isLand(c)) land.push([fx(x), z]);
    if (c.p) path_.push([fx(x), z]);
  }));
  return { W, D, fx, land, path: path_ };
}

function centreCrop(cells) {
  const [x0, z0, x1, z1] = bbox(cells);
  const cx = Math.floor((x0 + x1) / 2), cz = Math.floor((z0 + z1) / 2);
  const hx = WINDOW[0] >> 1, hz = WINDOW[1] >> 1;
  return toSet(cells.filter(([x, z]) => Math.abs(x - cx) <= hx && Math.abs(z - cz) <= hz).map(([x, z]) => [x - cx, z - cz]));
}

function variants(cells) {
  return [...Array(8)].map((_, t) => {
    const moved = normalise(cells.map((c) => dihedral(c, t)));
    return { full: toSet(moved), centre: centreCrop(moved) };
  });
}

function transformLevel(L, t) {
  const [W, D] = L.size, cells = [];
  const pts = [];
  L.cells.forEach((row, z) => row.forEach((c, x) => pts.push([dihedral([x, z], t), c])));
  const n = normalise(pts.map(([p]) => p));
  const W2 = t % 2 ? D : W, D2 = t % 2 ? W : D;
  for (let z = 0; z < D2; z++) cells.push([...Array(W2)].map(() => ({ h: 0, s: "none" })));
  n.forEach(([x, z], i) => { cells[z][x] = pts[i][1]; });
  return { size: [W2, D2], cells, layout: L.layout };
}

function landmasses(L) {
  const land = new Set();
  L.cells.forEach((row, z) => row.forEach((c, x) => { if (isLand(c)) land.add(k(x, z)); }));
  let n = 0;
  const seen = new Set();
  for (const s of land) {
    if (seen.has(s)) continue;
    n++;
    const q = [s];
    seen.add(s);
    while (q.length) {
      const [x, z] = unk(q.pop());
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const t = k(x + dx, z + dz);
        if (land.has(t) && !seen.has(t)) { seen.add(t); q.push(t); }
      }
    }
  }
  return n;
}

function rewardVisible(L, s) {
  const chest = L.things.find((t) => t.kind === "chest");
  if (!s.reward || !chest) return false;
  if (!s.junction) return true;
  return Math.max(Math.abs(chest.x - s.junction[0]), Math.abs(chest.z - s.junction[1])) <= 12;
}

function ninth(p, cells) {
  const [x0, z0, x1, z1] = bbox(cells);
  const c = Math.min(2, Math.floor(((p[0] - x0) / (x1 - x0 + 1)) * 3));
  const r = Math.min(2, Math.floor(((p[1] - z0) / (z1 - z0 + 1)) * 3));
  return r * 3 + c;
}

const stat = (v) => {
  const s = [...v].sort((a, b) => a - b);
  return { mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3), min: +s[0].toFixed(3), max: +s[s.length - 1].toFixed(3) };
};

export function measure(levels, names) {
  const C = levels.map(canon);
  const V = C.map((c) => variants(c.land));
  const FP = levels.map((L) => [...Array(8)].map((_, t) => routeFingerprint(transformLevel(L, t))));
  const pairs = [];
  for (let i = 0; i < levels.length; i++) for (let j = i + 1; j < levels.length; j++) {
    let fp = 0, fpT = 0, foot = 0, centre = 0;
    for (let t = 0; t < 8; t++) {
      const f = fingerprintClash(FP[i][0], FP[j][t]).jaccard;
      if (f > fp) { fp = f; fpT = t; }
      foot = Math.max(foot, jac(V[i][0].full, V[j][t].full));
      centre = Math.max(centre, jac(V[i][0].centre, V[j][t].centre));
    }
    pairs.push({ a: names[i], b: names[j], fingerprint: +fp.toFixed(3), transform: fpT, footprint: +foot.toFixed(3), centre: +centre.toFixed(3) });
  }
  const common = (sets) => { const [first, ...rest] = sets; return [...first].filter((s) => rest.every((r) => r.has(s))).length; };
  const landSets = C.map((c) => toSet(c.land)), pathSets = C.map((c) => toSet(c.path));
  const meanLand = landSets.reduce((a, s) => a + s.size, 0) / landSets.length;
  const meanPath = pathSets.reduce((a, s) => a + s.size, 0) / pathSets.length;
  const commonLand = common(landSets), commonPath = common(pathSets);

  const ninths = Array(9).fill(0);
  const centrepieces = levels.map((L, i) => {
    const w = L.things.find((t) => t.kind === "watcher");
    if (!w) return null;
    const p = [C[i].fx(w.x), w.z];
    ninths[ninth(p, C[i].land)]++;
    return p;
  });

  const kinds = {};
  levels.forEach((L, i) => {
    for (const s of L.route?.shortcuts || []) {
      const far = [C[i].fx(s.far[0]), s.far[1]], near = [C[i].fx(s.near[0]), s.near[1]];
      const K = (kinds[s.kind] ||= { count: 0, far: new Set(), near: new Set(), ninths: new Set() });
      K.count++;
      K.far.add(k(...far));
      K.near.add(k(...near));
      K.ninths.add(ninth(far, C[i].land));
    }
  });
  const shortcutSpread = Object.fromEntries(Object.entries(kinds).map(([kind, K]) => [kind, { count: K.count, distinctFar: K.far.size, distinctNear: K.near.size, farNinths: K.ninths.size }]));

  return {
    islands: names,
    pairs,
    fingerprint: stat(pairs.map((p) => p.fingerprint)),
    footprint: stat(pairs.map((p) => p.footprint)),
    centre: stat(pairs.map((p) => p.centre)),
    commonLand: { cells: commonLand, meanLand: +meanLand.toFixed(1), share: +(commonLand / meanLand).toFixed(3) },
    commonPath: { cells: commonPath, meanPath: +meanPath.toFixed(1), share: +(commonPath / meanPath).toFixed(3) },
    centrepieceNinths: ninths,
    centrepieces,
    shortcutSpread,
    shapes: new Set(levels.map((L) => L.layout?.shape || "frame")).size,
    multiLandmass: levels.filter((L) => landmasses(L) > 1).length,
    detours: levels.flatMap((L, i) => (L.route?.shortcuts || []).filter((s) => (s.detour || 0) >= T.detour).map((s) => ({ island: names[i], kind: s.kind, detour: s.detour, reward: s.reward || null, visible: rewardVisible(L, s) }))),
  };
}


export function checks(M) {
  const results = [];
  const record = (name, ok, detail) => { results.push({ name, ok, detail }); };

  const clones = M.pairs.filter((p) => p.fingerprint >= SAME_ROUTE).sort((a, b) => b.fingerprint - a.fingerprint);
  record("variety route fingerprints differ under all eight rotations and mirrors", !clones.length,
    clones.length ? `${clones.length} pairs at ${SAME_ROUTE}+: ${clones.slice(0, 4).map((p) => `${p.a}/${p.b} ${p.fingerprint}`).join(" | ")}` : `max ${M.fingerprint.max}`);
  record("variety footprint Jaccard (best transform) stays low", M.footprint.max <= T.footprintMax && M.footprint.mean <= T.footprintMean,
    `max ${M.footprint.max} (limit ${T.footprintMax}), mean ${M.footprint.mean} (limit ${T.footprintMean})`);
  record("variety centre windows differ", M.centre.max <= T.centreMax && M.centre.mean <= T.centreMean,
    `${WINDOW[0]}x${WINDOW[1]} window on the bbox centre: max ${M.centre.max} (limit ${T.centreMax}), mean ${M.centre.mean} (limit ${T.centreMean})`);
  record("variety land common to every island stays small", M.commonLand.share <= T.commonLand,
    `${M.commonLand.cells} cells, ${(M.commonLand.share * 100).toFixed(1)}% of mean ${M.commonLand.meanLand} (limit ${T.commonLand * 100}%)`);
  record("variety path common to every island stays small", M.commonPath.share <= T.commonPath,
    `${M.commonPath.cells} cells, ${(M.commonPath.share * 100).toFixed(1)}% of mean ${M.commonPath.meanPath} (limit ${T.commonPath * 100}%)`);
  record("variety centrepieces spread over the bounding-box ninths", Math.max(...M.centrepieceNinths) <= T.centrepiecePerNinth,
    `per ninth ${M.centrepieceNinths.join(" ")} (limit ${T.centrepiecePerNinth})`);
  for (const [kind, s] of Object.entries(M.shortcutSpread)) {
    const want = Math.min(s.count, T.farDistinct), wantN = Math.min(s.count, T.farNinths);
    record(`variety ${kind} shortcut far ends spread`, s.distinctFar >= want && s.farNinths >= wantN,
      `${s.count} ${kind}s, ${s.distinctFar} distinct far cells (want ${want}), ${s.farNinths} ninths (want ${wantN}), ${s.distinctNear} distinct near cells`);
  }
  record("variety run uses enough distinct shapes", M.shapes >= T.shapesDistinct, `${M.shapes} (want ${T.shapesDistinct})`);
  record("variety run has multi-landmass islands", M.multiLandmass >= T.multiLandmass, `${M.multiLandmass} (want ${T.multiLandmass})`);
  const bare = M.detours.filter((d) => !d.reward || !d.visible);
  record(`variety off-route shortcuts of ${T.detour}+ steps end on a reward in view`, !bare.length, bare.length ? bare.map((d) => `${d.island} ${d.kind} detour ${d.detour}${d.reward ? " (reward hidden)" : ""}`).join(" | ") : `${M.detours.length} detours, all rewarded`);

  return results;
}
