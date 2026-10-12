import { createRng, hashSeed } from "../rng.js";
import { prepareLevel, isWalkable, DIRS } from "../level.js";
import { forbiddenCells, validateTraps, excluded } from "./rules.js";

const key = (x, z) => x + "," + z;
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const N4 = Object.entries(DIRS);

const quiet = (raw) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return prepareLevel(JSON.parse(JSON.stringify(raw))); } finally { console.warn = warn; }
};

function pathRuns(raw, free) {
  const cells = raw.cells, D = cells.length, W = cells[0].length;
  const isPath = (x, z) => x >= 0 && z >= 0 && x < W && z < D && cells[z][x].p && cells[z][x].s !== "ramp" && free(x, z);
  const runs = [];
  for (const [dx, dz] of [[1, 0], [0, 1]]) {
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (!isPath(x, z) || isPath(x - dx, z - dz)) continue;
      const run = [];
      for (let k = 0; isPath(x + dx * k, z + dz * k) && cells[z + dz * k][x + dx * k].h === cells[z][x].h; k++) run.push([x + dx * k, z + dz * k]);
      if (run.length >= 2) runs.push(run);
    }
  }
  return runs;
}

const windows = (run, n) => Array.from({ length: Math.max(0, run.length - n + 1) }, (_, i) => run.slice(i, i + n));

export const FOOTPRINTS = {
  t03: ({ runs }) => runs.flatMap((r) => windows(r, Math.min(4, r.length))).filter((c) => c.length >= 2).map((cells) => ({ cells })),
  t25: ({ runs, P }) => runs.filter((r) => r.length >= 3).flatMap((r) => windows(r, Math.min(4, r.length))).flatMap((cells) => {
    const d = [Math.sign(cells[1][0] - cells[0][0]), Math.sign(cells[1][1] - cells[0][1])];
    return N4.filter(([, v]) => v[0] === -d[1] && v[1] === d[0] || v[0] === d[1] && v[1] === -d[0]).map(([side, v]) => {
      const wallOpen = cells.filter((c) => !isWalkable(P, c[0] + v[0], c[1] + v[1])).length;
      return { cells, plate: cells[1], side, score: wallOpen };
    });
  }).sort((a, b) => b.score - a.score),
  t02: ({ raw, free }) => (raw.route?.segments || []).filter((s) => /^loop/.test(s.id)).flatMap((s) => {
    const cs = s.cells.filter(([x, z]) => raw.cells[z][x].s !== "ramp" && free(x, z));
    const out = [];
    for (let i = 0; i + 3 <= cs.length; i++) {
      const w = cs.slice(i, i + 3);
      if (w.every((c, j) => !j || Math.abs(c[0] - w[j - 1][0]) + Math.abs(c[1] - w[j - 1][1]) === 1)) out.push({ cells: w });
    }
    return out;
  }),
  t18: ({ runs }) => runs.filter((r) => r.length >= 5).flatMap((r) => r.slice(2, -2).map((c) => ({ cells: [c] }))),
  t23: ({ runs, P }) => runs.flatMap((r) => r.slice(1, -1)).map((c) => ({ cells: [c], score: N4.filter(([, v]) => isWalkable(P, c[0] + v[0], c[1] + v[1])).length })).sort((a, b) => b.score - a.score),
  t21: ({ runs, P }) => runs.flatMap((r) => r.slice(1, -1)).filter((c) => N4.filter(([, v]) => isWalkable(P, c[0] + v[0], c[1] + v[1])).length >= 3).map((c) => ({ cells: [c] })),
};

export function placeTraps(raw, kinds, { position = null, seed = raw.name } = {}) {
  const rng = createRng(hashSeed(`${seed}:traps`));
  const P = quiet(raw);
  const forbidden = forbiddenCells(raw);
  const taken = [];
  const free = (x, z) => !forbidden.has(key(x, z));
  const runs = pathRuns(raw, free);
  const placed = [];
  const problems = [];
  for (const [i, kind] of kinds.entries()) {
    if (placed.some((t) => excluded(t.kind, kind))) { problems.push(`${kind} excluded by an earlier pick`); continue; }
    const make = FOOTPRINTS[kind];
    if (!make) { problems.push(`${kind}: no footprint finder`); continue; }
    let options = make({ raw, P, runs, free });
    options = options.filter((o) => o.cells.every((c) => free(c[0], c[1])) && !o.cells.some((c) => taken.some((q) => cheb(c, q) < 3)));
    if (!options.length) { problems.push(`${kind}: no footprint fits`); continue; }
    const top = options.some((o) => o.score != null) ? options.filter((o) => o.score === options[0].score) : options;
    const order = rng.shuffle(top.slice()).concat(rng.shuffle(options.filter((o) => !top.includes(o))));
    let ok = false;
    for (const o of order.slice(0, 40)) {
      const { score, ...rest } = o;
      const t = { id: `${kind}-${i}`, kind, ...rest };
      if (!validateTraps(raw, { position, traps: [...placed, t] }).length) { placed.push(t); taken.push(...t.cells); ok = true; break; }
    }
    if (!ok) problems.push(`${kind}: every footprint broke a rule`);
  }
  return { traps: placed, problems };
}
