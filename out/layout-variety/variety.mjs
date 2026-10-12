import fs from "node:fs";
import path from "node:path";
import sharp from "/Users/pibbles/dev/puffer.dev-build/isoworld/node_modules/sharp/dist/index.cjs";
import { routeFingerprint, fingerprintClash } from "/Users/pibbles/dev/puffer.dev-build/isoworld/core/layout/topology.js";

const root = "/Users/pibbles/dev/puffer.dev-build/isoworld";
const outDir = path.join(root, "out/layout-variety");
fs.mkdirSync(outDir, { recursive: true });
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"))).order;
const INTENDED = [["ring", false], ["switchback", false], ["spiral", false], ["maze", false], ["twin", false], ["figure8", false], ["comb", false], ["twin", true], ["ring", true], ["maze", true], ["spiral", true], ["switchback", true]];
const names = [...run, "wizard-medium-r1", "wizard-medium-r2", "wizard-medium-r3"];
const intended = Object.fromEntries([...run.map((n, i) => [n, INTENDED[i][0] + (INTENDED[i][1] ? " mirrored" : "")]), ["wizard-medium-r1", "figure8"], ["wizard-medium-r2", "comb mirrored"], ["wizard-medium-r3", "maze"]]);
const levels = names.map((n) => JSON.parse(fs.readFileSync(path.join(root, `levels/${n}.json`))));
const [W, D] = levels[0].size;
const FRAME_SEGS = new Set(["approach", "terrace", "dais", "exit", "plaza", "lowroad", "doorway", "spur", "core", "entry"]);

const canon = (L) => {
  const m = L.layout.mirror;
  const fx = (x) => (m ? W - 1 - x : x);
  const cell = (x, z) => L.cells[z][fx(x)];
  return { cell, fx };
};
const land = (c) => c && c.s !== "none" && c.s !== "water";
const sets = levels.map((L) => {
  const { cell, fx } = canon(L);
  const landS = new Set(), pathS = new Set(), sig = new Map();
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = cell(x, z);
    if (land(c)) landS.add(x + "," + z);
    if (c.p) pathS.add(x + "," + z);
    sig.set(x + "," + z, `${c.s}|${c.h}|${c.p ? 1 : 0}`);
  }
  const frameCells = new Set(), latticeCells = new Set();
  for (const s of L.route.segments) for (const [x, z] of s.cells) (FRAME_SEGS.has(s.id) ? frameCells : latticeCells).add(fx(x) + "," + z);
  return { landS, pathS, sig, frameCells, latticeCells, fx };
});

const unflip = (L) => (L.layout.mirror ? { ...L, cells: L.cells.map((r) => r.slice().reverse()), layout: { ...L.layout, mirror: false } } : L);
const CENTRE = { x0: 10, z0: 11, x1: 27, z1: 31 };
const inCentre = (k) => { const [x, z] = k.split(",").map(Number); return x >= CENTRE.x0 && x <= CENTRE.x1 && z >= CENTRE.z0 && z <= CENTRE.z1; };
const jac = (a, b) => { let i = 0; for (const k of a) if (b.has(k)) i++; const u = a.size + b.size - i; return u ? i / u : 1; };
const filt = (s, f) => new Set([...s].filter(f));
const pairs = [];
for (let i = 0; i < levels.length; i++) for (let j = i + 1; j < levels.length; j++) {
  const A = sets[i], B = sets[j];
  let same = 0, n = 0;
  for (const [k, v] of A.sig) if (inCentre(k)) { n++; if (B.sig.get(k) === v) same++; }
  pairs.push({
    a: names[i], b: names[j],
    footprint: jac(A.landS, B.landS),
    centreLand: jac(filt(A.landS, inCentre), filt(B.landS, inCentre)),
    centrePath: jac(filt(A.pathS, inCentre), filt(B.pathS, inCentre)),
    centreCellsIdentical: same / n,
    framePath: jac(A.frameCells, B.frameCells),
    westPath: jac(filt(A.pathS, (k) => !inCentre(k)), filt(B.pathS, (k) => !inCentre(k))),
    fingerprint: fingerprintClash(routeFingerprint(levels[i]), routeFingerprint(levels[j])).jaccard,
    fingerprintUnflipped: fingerprintClash(routeFingerprint(unflip(levels[i])), routeFingerprint(unflip(levels[j]))).jaccard,
  });
}
const stat = (k, ps = pairs) => { const v = ps.map((p) => p[k]).sort((a, b) => a - b); return { mean: +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(3), min: +v[0].toFixed(3), median: +v[v.length >> 1].toFixed(3), max: +v[v.length - 1].toFixed(3) }; };
const runPairs = pairs.filter((p) => run.includes(p.a) && run.includes(p.b));
const keys = ["footprint", "centreLand", "centrePath", "centreCellsIdentical", "framePath", "westPath", "fingerprint", "fingerprintUnflipped"];
const summary = Object.fromEntries(keys.map((k) => [k, stat(k, runPairs)]));

const perLevel = levels.map((L, i) => {
  const S = sets[i];
  const pathN = S.pathS.size;
  const fp = routeFingerprint(L);
  const sc = L.route.shortcuts.map((s) => ({ kind: s.kind, far: [S.fx(s.far[0]), s.far[1]], near: [S.fx(s.near[0]), s.near[1]] }));
  const fig = L.things.find((t) => t.kind === "watcher");
  const fire = L.things.find((t) => t.kind === "bonfire");
  const lifts = L.things.filter((t) => t.kind === "elevator").map((t) => [t.role, S.fx(t.x), t.z]);
  return {
    name: names[i], intended: intended[names[i]], realised: L.layout.archetype, mirror: L.layout.mirror,
    land: S.landS.size, path: pathN,
    frameShareOfPath: +(S.frameCells.size / (S.frameCells.size + S.latticeCells.size)).toFixed(3),
    latticePathCells: S.latticeCells.size,
    ...Object.fromEntries(fp.topology.split(' ').reduce((a,v,i,arr)=>i%2?a:[...a,[arr[i],+arr[i+1]]],[])),
    figure: [S.fx(fig.x), fig.z], bonfire: [S.fx(fire.x), fire.z], lifts,
    shortcuts: sc,
    features: (L.route.features || []).map((f) => f.kind),
  };
});

const landFreq = new Map(), pathFreq = new Map();
for (const S of sets) { for (const k of S.landS) landFreq.set(k, (landFreq.get(k) || 0) + 1); for (const k of S.pathS) pathFreq.set(k, (pathFreq.get(k) || 0) + 1); }
const R = run.length;
const runSets = sets.slice(0, R);
const constLand = [...new Set(runSets.flatMap((s) => [...s.landS]))].filter((k) => runSets.every((s) => s.landS.has(k)));
const constPath = [...new Set(runSets.flatMap((s) => [...s.pathS]))].filter((k) => runSets.every((s) => s.pathS.has(k)));
const meanLand = runSets.reduce((a, s) => a + s.landS.size, 0) / R;
const meanPath = runSets.reduce((a, s) => a + s.pathS.size, 0) / R;
const scSpread = {};
for (const kind of ["door", "ladder", "drop", "lever"]) {
  const pts = perLevel.slice(0, R).flatMap((l) => l.shortcuts.filter((s) => s.kind === kind).map((s) => s.far));
  if (!pts.length) continue;
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const uniq = new Set(pts.map((p) => p.join(","))).size;
  const near = perLevel.slice(0, R).flatMap((l) => l.shortcuts.filter((s) => s.kind === kind).map((s) => s.near));
  scSpread[kind] = { count: pts.length, distinctFarCells: uniq, farX: [Math.min(...xs), Math.max(...xs)], farZ: [Math.min(...zs), Math.max(...zs)], nearDistinct: new Set(near.map((p) => p.join(","))).size };
}
const fixed = {
  figureDistinct: new Set(perLevel.map((l) => l.figure.join(","))).size,
  bonfireDistinct: new Set(perLevel.slice(0, R).map((l) => l.bonfire.join(","))).size,
  entryLiftDistinct: new Set(perLevel.slice(0, R).map((l) => l.lifts.find((q) => q[0] === "entry").slice(1).join(","))).size,
  exitLiftDistinct: new Set(perLevel.slice(0, R).map((l) => l.lifts.find((q) => q[0] === "exit").slice(1).join(","))).size,
  constLandCells: constLand.length, meanLand: +meanLand.toFixed(1), constLandShare: +(constLand.length / meanLand).toFixed(3),
  constPathCells: constPath.length, meanPath: +meanPath.toFixed(1), constPathShare: +(constPath.length / meanPath).toFixed(3),
  meanFrameShareOfPath: +(perLevel.slice(0, R).reduce((a, l) => a + l.frameShareOfPath, 0) / R).toFixed(3),
};
fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify({ note: "Mirrored islands are flipped back to canonical x before comparison. centre window x 10..27, z 11..31 covers core, plaza, door, ladder, exit causeway. Run pairs only in summary (66 pairs).", centreWindow: CENTRE, summary, fixed, shortcutSpread: scSpread, perLevel, pairs }, null, 1));

const C = 11, PADX = 14, PADT = 40, PW = W * C + PADX * 2, PH = D * C + PADT + 46;
const hcol = (h) => ["#2b3a4a", "#7d9a5a", "#9fb56a", "#c9c47a", "#e6d79a", "#f3e7c0"][Math.min(h, 5)];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function panel(L, i, ox, oy) {
  const S = sets[i], P = perLevel[i];
  const { cell } = canon(L);
  let g = `<g transform="translate(${ox},${oy})"><rect width="${PW}" height="${PH}" fill="#14171c"/>`;
  g += `<text x="${PADX}" y="16" fill="#eee" font-size="13" font-family="Helvetica" font-weight="bold">${esc(P.name)}</text>`;
  g += `<text x="${PADX}" y="32" fill="#9ab" font-size="10.5" font-family="Helvetica">intended ${esc(P.intended)} · realised ${esc(P.realised)}${P.mirror ? " (mirrored, shown unflipped)" : ""}</text>`;
  const T = (x, z) => [PADX + x * C, PADT + z * C];
  g += `<rect x="${PADX + CENTRE.x0 * C}" y="${PADT + CENTRE.z0 * C}" width="${(CENTRE.x1 - CENTRE.x0 + 1) * C}" height="${(CENTRE.z1 - CENTRE.z0 + 1) * C}" fill="none" stroke="#555" stroke-dasharray="3 3"/>`;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = cell(x, z); const [px, pz] = T(x, z);
    if (c.s === "none") continue;
    let f = c.s === "water" ? "#2f6a9a" : c.s === "lift" ? "#c040c0" : hcol(c.h);
    g += `<rect x="${px}" y="${pz}" width="${C}" height="${C}" fill="${f}"/>`;
    if (c.p) g += `<rect x="${px + 2}" y="${pz + 2}" width="${C - 4}" height="${C - 4}" fill="${S.frameCells.has(x + "," + z) ? "#b03a2e" : "#2e2e2e"}"/>`;
    if (c.s === "ramp") g += `<text x="${px + C / 2}" y="${pz + C - 2}" text-anchor="middle" font-size="9" fill="#fff" font-family="Helvetica">^</text>`;
  }
  const mark = (p, col, lab) => { const [px, pz] = T(p[0], p[1]); return `<circle cx="${px + C / 2}" cy="${pz + C / 2}" r="${C * 0.62}" fill="${col}" stroke="#000"/><text x="${px + C / 2}" y="${pz + C / 2 + 3.5}" text-anchor="middle" font-size="9" font-weight="bold" fill="#000" font-family="Helvetica">${lab}</text>`; };
  const SC = { door: ["#ff9a2e", "D"], ladder: ["#c58cff", "L"], drop: ["#c58cff", "V"], lever: ["#ff4d4d", "G"] };
  for (const s of P.shortcuts) {
    const [a, b] = [T(...s.far), T(...s.near)];
    g += `<line x1="${a[0] + C / 2}" y1="${a[1] + C / 2}" x2="${b[0] + C / 2}" y2="${b[1] + C / 2}" stroke="${SC[s.kind][0]}" stroke-width="2"/>`;
    g += mark(s.far, SC[s.kind][0], SC[s.kind][1]);
  }
  const lever = L.things.find((t) => t.kind === "lever");
  if (lever) g += mark([S.fx(lever.x), lever.z], "#ff4d4d", "l");
  g += mark(P.figure, "#ffffff", "F");
  g += mark(P.bonfire, "#ffd23f", "B");
  for (const [role, x, z] of P.lifts) g += mark([x, z], "#ff6bd6", role === "entry" ? "S" : "E");
  const chest = L.things.find((t) => t.kind === "chest");
  if (chest) g += mark([S.fx(chest.x), chest.z], "#3fe0a0", "C");
  g += `<text x="${PADX}" y="${PH - 26}" fill="#ccc" font-size="10" font-family="Helvetica">land ${P.land} · path ${P.path} · frame share of path ${(P.frameShareOfPath * 100).toFixed(0)}%</text>`;
  g += `<text x="${PADX}" y="${PH - 12}" fill="#ccc" font-size="10" font-family="Helvetica">loops ${P.cycles} · junctions ${P.junctions} · dead ends ${P.ends} · ${esc(P.features.join("+"))}</text>`;
  return g + "</g>";
}
function heat(title, freq, n, ox, oy) {
  let g = `<g transform="translate(${ox},${oy})"><rect width="${PW}" height="${PH}" fill="#14171c"/><text x="${PADX}" y="16" fill="#eee" font-size="13" font-family="Helvetica" font-weight="bold">${esc(title)}</text><text x="${PADX}" y="32" fill="#9ab" font-size="10.5" font-family="Helvetica">all 15 layouts, mirrored ones unflipped; white = in every one</text>`;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const v = (freq.get(x + "," + z) || 0) / n; if (!v) continue;
    const l = Math.round(20 + v * 80);
    g += `<rect x="${PADX + x * C}" y="${PADT + z * C}" width="${C}" height="${C}" fill="hsl(${v === 1 ? 0 : 200},${v === 1 ? 0 : 60}%,${l}%)"/>`;
  }
  return g + "</g>";
}
const COLS = 6, rows = Math.ceil((levels.length + 3) / COLS);
const legendH = 60;
const SW = COLS * (PW + 8) + 8, SH = rows * (PH + 8) + 8 + legendH;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="100%" height="100%" fill="#0b0d10"/>`;
svg += `<text x="12" y="24" fill="#fff" font-size="18" font-family="Helvetica" font-weight="bold">Route-first layouts, top down (12 run islands + wizard-medium r1..r3)</text>`;
svg += `<text x="12" y="46" fill="#bbb" font-size="12" font-family="Helvetica">Red path = fixed frame (approach, terrace, dais, exit, plaza, low road, doorway, spur). Dark path = lattice journey. F figure · B bonfire · S/E lifts · C chest · D door · L ladder · V drop · G lever gate, l lever. Dashed box = centre window used for overlap. Fill shade = height.</text>`;
const all = levels.map((L, i) => [L, i]);
let k = 0;
for (const [L, i] of all) { const r = Math.floor(k / COLS), c = k % COLS; svg += panel(L, i, 8 + c * (PW + 8), legendH + 8 + r * (PH + 8)); k++; }
for (const [t, f] of [["land frequency", landFreq], ["path frequency", pathFreq]]) { const r = Math.floor(k / COLS), c = k % COLS; svg += heat(t, f, levels.length, 8 + c * (PW + 8), legendH + 8 + r * (PH + 8)); k++; }
svg += "</svg>";
fs.writeFileSync(path.join(outDir, "route-sheet.svg"), svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, "route-sheet.png"));
console.log(JSON.stringify({ summary, fixed, scSpread }, null, 1));
console.log(perLevel.map((l) => `${l.name} ${l.intended}->${l.realised} land ${l.land} path ${l.path} frame ${l.frameShareOfPath} loops ${l.cycles} j ${l.junctions} e ${l.ends}`).join("\n"));
const top = [...pairs].sort((a, b) => b.centreCellsIdentical - a.centreCellsIdentical).slice(0, 5);
console.log(pairs.filter(p=>p.fingerprintUnflipped>=0.8||p.fingerprint>=0.6).map(p=>`${p.a}~${p.b} fp ${p.fingerprint.toFixed(2)} unflipped ${p.fingerprintUnflipped.toFixed(2)}`).join('\n'));
console.log(top.map((p) => `${p.a}~${p.b} centreIdent ${p.centreCellsIdentical.toFixed(2)} fp ${p.fingerprint.toFixed(2)}`).join("\n"));
