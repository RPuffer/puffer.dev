import { DIR, N4, dirOf, key, walk } from "./grid.js";

const OPP = { n: "s", s: "n", e: "w", w: "e" };
const cell = (x, z, h, extra = {}) => ({ x, z, h, ...extra });
const ahead = ([x, z], d, k = 1) => [x + DIR[d][0] * k, z + DIR[d][1] * k];

function roadCells(points, h0, steps = []) {
  const at = new Map(steps.map(([x, z, way]) => [key(x, z), way]));
  const line = walk(points), out = [];
  let h = h0;
  for (let i = 0; i < line.length; i++) {
    const [x, z] = line[i], way = at.get(key(x, z));
    if (!way) { out.push(cell(x, z, h, { path: true })); continue; }
    const nx = line[i + 1] || line[i], px = line[i - 1] || line[i];
    const mv = dirOf(Math.sign(nx[0] - px[0]), Math.sign(nx[1] - px[1]));
    if (way === "up") { h += 1; out.push(cell(x, z, h, { path: true, s: "ramp", d: OPP[mv] })); }
    else { out.push(cell(x, z, h, { path: true, s: "ramp", d: mv })); h -= 1; }
  }
  return out;
}

function rampProblems(piece) {
  const out = [], byKey = new Map(piece.cells.map((c) => [key(c.x, c.z), c]));
  for (const c of piece.cells) {
    if (c.s !== "ramp") continue;
    const lo = byKey.get(key(...ahead([c.x, c.z], c.d))), hi = byKey.get(key(...ahead([c.x, c.z], OPP[c.d])));
    if (!lo || lo.h !== c.h - 1 || lo.s === "ramp") out.push(`${piece.name}: ramp ${c.x},${c.z} has no flat landing below`);
    if (!hi || hi.h !== c.h || hi.s === "ramp") out.push(`${piece.name}: ramp ${c.x},${c.z} has no flat landing above`);
  }
  return out;
}

function inBounds(G, piece) {
  return piece.cells.filter((c) => !G.in(c.x, c.z)).map((c) => `${piece.name}: ${c.x},${c.z} off the grid`);
}

function lineOut(from, d, len, h, surface) {
  const cells = [];
  let p = from;
  for (let i = 0; i < len; i++) { p = ahead(p, d); cells.push(cell(p[0], p[1], h, { path: true, ...(surface ? { s: surface } : {}) })); }
  return cells;
}

export const FEATURES = {
  road: {
    role: "route",
    about: "A worn path through waypoints. Height changes only through an up or down step, which becomes a ramp with a flat landing at each end.",
    build: ({ points, h, steps = [], flank = 1 }) => ({ cells: roadCells(points, h, steps), flank, attach: { in: points[0], out: points[points.length - 1] } }),
    valid: (G, p) => [...inBounds(G, p), ...rampProblems(p)],
  },
  plaza: {
    role: "route",
    about: "A flat room on the route: the bonfire yard, a rejoin node, a vista pad. Only the cells that link its doors are path; the rest is open ground.",
    build: ({ box: [x0, z0, x1, z1], h, doors = [], flank = 1 }) => {
      const cells = [];
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cells.push(cell(x, z, h, { path: false, room: true }));
      return { cells, flank, doors, attach: { in: doors[0], out: doors[doors.length - 1] } };
    },
    valid: (G, p) => {
      const out = inBounds(G, p);
      if (p.doors.some(([x, z]) => !p.cells.some((c) => c.x === x && c.z === z))) out.push(`${p.name}: a door sits outside the room`);
      return out;
    },
  },
  dock: {
    role: "route",
    about: "A straight pier from the route to the rim, ending on the lift tile. Nothing beside it, nothing beyond it, so the lift touches the island on one side only.",
    build: ({ from, dir, len, h, lift = true, surface = null }) => {
      const cells = lineOut(from, dir, len, h, surface);
      if (lift) { const end = ahead(cells.length ? [cells[cells.length - 1].x, cells[cells.length - 1].z] : from, dir); cells.push(cell(end[0], end[1], h, { path: true, s: "lift" })); }
      return { cells, flank: 0, attach: { in: from, out: [cells[cells.length - 1].x, cells[cells.length - 1].z] }, dir };
    },
    valid: (G, p) => {
      const out = inBounds(G, p), end = p.cells[p.cells.length - 1];
      if (end.s === "lift") for (const [dx, dz] of N4) {
        const n = G.at(end.x + dx, end.z + dz), mine = p.cells.some((c) => c.x === end.x + dx && c.z === end.z + dz);
        if (!mine && n && n.s !== "none" && n.s !== "water" && n.h === end.h) out.push(`${p.name}: lift ${end.x},${end.z} touches land at ${end.x + dx},${end.z + dz}`);
      }
      return out;
    },
  },
  causeway: {
    role: "route",
    about: "A raised one-wide stone walk with open air on both sides. It carries the route across low ground at its own height, so nothing below can step onto it.",
    build: (o) => ({ ...FEATURES.dock.build({ ...o, surface: o.surface || "stone" }), flank: 0 }),
    valid: (G, p) => FEATURES.dock.valid(G, p),
  },
  spur: {
    role: "shortcut",
    about: "A one-wide jut at height that ends in a cliff over a lower route cell: the top of a ladder or a one-way drop.",
    build: ({ from, dir, len, h }) => ({ cells: lineOut(from, dir, len, h), flank: 0, attach: { in: from, out: ahead(from, dir, len) }, dir }),
    valid: (G, p) => {
      const out = inBounds(G, p), tip = p.cells[p.cells.length - 1], below = ahead([tip.x, tip.z], p.dir), b = G.at(...below);
      if (!b || b.h > tip.h - 2) out.push(`${p.name}: cliff below ${tip.x},${tip.z} is under two tiers`);
      return out;
    },
  },
  peninsula: {
    role: "branch",
    about: "A dead-end road out to the rim that ends on a small pad: a vista back at the core, and the place for a chest.",
    build: ({ from, dir, len, h, pad = 2 }) => {
      const cells = lineOut(from, dir, len, h);
      const tip = [cells[cells.length - 1].x, cells[cells.length - 1].z];
      const side = dir === "n" || dir === "s" ? DIR.e : DIR.s;
      for (let i = 1; i < pad; i++) { const p = ahead(tip, dir, 0); cells.push(cell(p[0] + side[0] * i, p[1] + side[1] * i, h, { path: false, room: true })); }
      return { cells, flank: 1, attach: { in: from, out: tip }, tip, dir };
    },
    valid: (G, p) => inBounds(G, p),
  },
  hill: {
    role: "flank",
    about: "A raised knoll off the route that carries tall decor and frames a view. It sits one tier above the land around it with no ramp, so it never joins two routes.",
    build: ({ center: [cx, cz], r, h }) => {
      const cells = [];
      for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) if (Math.abs(x - cx) + Math.abs(z - cz) <= r) cells.push(cell(x, z, h, { path: false, hill: true }));
      return { cells, flank: 0, attach: { in: [cx, cz], out: [cx, cz] } };
    },
    valid: (G, p) => {
      const out = inBounds(G, p);
      for (const c of p.cells) for (const [dx, dz] of N4) {
        const n = G.at(c.x + dx, c.z + dz);
        if (n?.p && n.h === c.h) out.push(`${p.name}: ${c.x},${c.z} level with path at ${c.x + dx},${c.z + dz}`);
      }
      return out;
    },
  },
};

export function stamp(G, name, kind, params, owner) {
  const spec = FEATURES[kind];
  const piece = { name, kind, owner, ...spec.build(params) };
  const clash = [];
  for (const c of piece.cells) {
    if (!G.in(c.x, c.z)) continue;
    const cur = G.at(c.x, c.z), who = G.who(c.x, c.z);
    if (cur.p && who !== owner && !(c.path && cur.h === c.h && cur.s !== "ramp" && c.s !== "ramp" && c.s !== "lift")) { clash.push(`${name}: ${c.x},${c.z} already path of ${who}`); continue; }
    const s = c.s || (cur.s !== "none" && cur.s !== "water" && cur.s !== "ramp" && cur.s !== "lift" ? cur.s : "sand");
    const next = { h: c.h, s };
    if (c.d) next.d = c.d;
    if (c.s === "ramp") next.m = "stone";
    if (c.path) next.p = 1;
    if (cur.p && !c.path) next.p = 1;
    G.set(c.x, c.z, next, cur.p && who !== owner ? who : owner);
  }
  piece.problems = [...clash, ...spec.valid(G, piece)];
  return piece;
}
