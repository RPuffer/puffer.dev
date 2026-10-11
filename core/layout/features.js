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


const boxCells = ([x0, z0, x1, z1]) => { const out = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) out.push([x, z]); return out; };
const inBox = ([x0, z0, x1, z1], x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
const edgeOf = ([x0, z0, x1, z1], x, z, d) => (d === "n" ? z === z0 : d === "s" ? z === z1 : d === "w" ? x === x0 : x === x1);
const cornerOf = ([x0, z0, x1, z1], x, z) => (x === x0 || x === x1) && (z === z0 || z === z1);
const landing = (G, ramp) => { const [x, z] = ahead(ramp.at, ramp.d), c = G.at(x, z); return cell(x, z, c ? c.h : -9, { s: c?.s }); };

function leanOn(G, ctx, box, { minDist = 1, extra = [], owner = null, h = null } = {}) {
  const cells = [...boxCells(box), ...extra];
  if (cells.some(([x, z]) => !G.in(x, z) || G.at(x, z).s !== "none" || ctx.avoid.has(key(x, z)))) return null;
  if (boxCells(box).some(([x, z]) => (ctx.dist.get(key(x, z)) ?? 9) < minDist)) return null;
  let touch = 0, lh = h, who = owner;
  for (const [x, z] of boxCells(box)) for (const [dx, dz] of N4) {
    const nx = x + dx, nz = z + dz;
    if (inBox(box, nx, nz) || extra.some(([a, b]) => a === nx && b === nz)) continue;
    const n = G.at(nx, nz);
    if (!n || !G.land(nx, nz)) continue;
    if (n.p || n.s === "ramp" || n.s === "lift" || ctx.avoid.has(key(nx, nz))) return null;
    if (lh == null) lh = n.h;
    if (n.h !== lh) return null;
    if (who == null) who = G.who(nx, nz);
    if (G.who(nx, nz) !== who) return null;
    touch++;
  }
  return touch >= 2 ? { h: lh, owner: who, touch } : null;
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
    about: "A raised knoll off the route that carries a landmark and frames a view. It sits one tier above the land it leans on with no ramp, so it never joins two routes and nobody walks on it; the decor pass covers every cell.",
    build: ({ center, r = 1, box, h }) => {
      const cells = [];
      if (box) for (const [x, z] of boxCells(box)) cells.push(cell(x, z, h, { path: false, hill: true, s: "grass" }));
      else for (let z = center[1] - r; z <= center[1] + r; z++) for (let x = center[0] - r; x <= center[0] + r; x++) if (Math.abs(x - center[0]) + Math.abs(z - center[1]) <= r) cells.push(cell(x, z, h, { path: false, hill: true }));
      const at = box ? [box[0], box[1]] : center;
      return { cells, flank: 0, box, attach: { in: at, out: at } };
    },
    valid: (G, p) => {
      const out = inBounds(G, p);
      for (const c of p.cells) for (const [dx, dz] of N4) {
        const n = G.at(c.x + dx, c.z + dz);
        if (!n || p.cells.some((q) => q.x === c.x + dx && q.z === c.z + dz)) continue;
        if (n.p && n.h === c.h) out.push(`${p.name}: ${c.x},${c.z} level with path at ${c.x + dx},${c.z + dz}`);
        else if (G.land(c.x + dx, c.z + dz) && n.h === c.h) out.push(`${p.name}: ${c.x},${c.z} level with land at ${c.x + dx},${c.z + dz}`);
      }
      return out;
    },
    site: (G, ctx, { size = [3, 2] } = {}) => {
      const out = [];
      for (const [w, d] of [size, [size[1], size[0]]]) G.each((_, x0, z0) => {
        const box = [x0, z0, x0 + w - 1, z0 + d - 1];
        const lean = leanOn(G, ctx, box, { minDist: 2 });
        if (lean) out.push({ params: { box, h: lean.h + 1 }, owner: lean.owner, score: lean.touch });
      });
      return out;
    },
  },
  lookout: {
    role: "branch",
    about: "A raised pad grown out over the drop, one tier above the land it leans on and reached by one ramp from that land. It is a dead end off the route, so it holds a reward.",
    build: ({ box, h, ramp }) => {
      const cells = boxCells(box).map(([x, z]) => cell(x, z, h, { path: false, room: true, s: "stone" }));
      cells.push(cell(ramp.at[0], ramp.at[1], h, { path: false, s: "ramp", d: ramp.d }));
      return { cells, flank: 0, box, ramp, attach: { in: ahead(ramp.at, ramp.d), out: [box[0], box[1]] } };
    },
    valid: (G, p) => {
      const out = [...inBounds(G, p), ...rampProblems({ ...p, cells: [...p.cells, landing(G, p.ramp)] })];
      for (const c of p.cells) for (const [dx, dz] of N4) {
        const x = c.x + dx, z = c.z + dz, n = G.at(x, z);
        if (!n || p.cells.some((q) => q.x === x && q.z === z)) continue;
        if (G.land(x, z) && n.h === p.cells[0].h) out.push(`${p.name}: ${c.x},${c.z} level with land at ${x},${z}`);
      }
      return out;
    },
    site: (G, ctx, { size = [4, 3] } = {}) => {
      const out = [];
      for (const [w, d] of [size, [size[1], size[0]]]) G.each((_, x0, z0) => {
        const box = [x0, z0, x0 + w - 1, z0 + d - 1];
        for (const dir of Object.keys(DIR)) {
          const corners = boxCells(box).filter(([x, z]) => edgeOf(box, x, z, dir) && cornerOf(box, x, z));
          for (const corner of corners) {
            const at = ahead(corner, dir), foot = ahead(at, dir);
            const f = G.at(...foot), a = G.at(...at);
            if (!f || !a || a.s !== "none" || !G.land(...foot) || f.p || f.s === "ramp" || ctx.avoid.has(key(...foot)) || ctx.avoid.has(key(...at))) continue;
            if (N4.some(([dx, dz]) => { const n = G.at(at[0] + dx, at[1] + dz); return n && n !== f && !inBox(box, at[0] + dx, at[1] + dz) && G.land(at[0] + dx, at[1] + dz); })) continue;
            const lean = leanOn(G, ctx, box, { minDist: 2, extra: [at], owner: G.who(...foot), h: f.h });
            if (lean && lean.h === f.h) out.push({ params: { box, h: f.h + 1, ramp: { at, d: dir } }, owner: G.who(...foot), score: lean.touch + 2 });
          }
        }
      });
      return out;
    },
  },
  alcove: {
    role: "branch",
    about: "A pocket room off the route: a one-wide neck from a road's flank out over the drop into a small room at the road's height. The neck has air on both sides, so the room reads as its own place and holds a reward or a camp.",
    build: ({ neck, box, h, from }) => {
      const cells = neck.map(([x, z]) => cell(x, z, h, { path: false, neck: true, s: "sand" }));
      for (const [x, z] of boxCells(box)) cells.push(cell(x, z, h, { path: false, room: true, s: "stone" }));
      return { cells, flank: 0, box, neck, from, attach: { in: from, out: [box[0], box[1]] } };
    },
    valid: (G, p) => {
      const out = inBounds(G, p), h = p.cells[0].h, mine = new Set(p.cells.map((c) => key(c.x, c.z)));
      for (const c of p.cells) for (const [dx, dz] of N4) {
        const x = c.x + dx, z = c.z + dz, n = G.at(x, z);
        if (!n || mine.has(key(x, z)) || (x === p.from[0] && z === p.from[1])) continue;
        if (G.land(x, z) && n.h === h) out.push(`${p.name}: ${c.x},${c.z} level with land at ${x},${z}`);
      }
      const f = G.at(...p.from);
      if (!f || f.h !== h || !G.land(...p.from)) out.push(`${p.name}: entry ${p.from} not level land`);
      return out;
    },
    site: (G, ctx, { size = [3, 3], neck: nl = 1 } = {}) => {
      const out = [];
      G.each((c0, px, pz) => {
        if (!c0.p || c0.s === "ramp" || c0.s === "lift" || ctx.avoid.has(key(px, pz))) return;
        for (const dir of Object.keys(DIR)) {
          let [x, z] = [px, pz], c = null, ok = true;
          for (let k = 1; k <= 3; k++) {
            const nx = ahead([x, z], dir), n = G.at(...nx);
            if (!n || n.s === "none") break;
            if (!G.land(...nx) || n.p || n.s === "ramp" || n.h !== c0.h || ctx.avoid.has(key(...nx))) { ok = false; break; }
            [x, z] = nx; c = n;
          }
          if (!ok || !c || G.at(...ahead([x, z], dir))?.s !== "none") continue;
          const neck = [];
          for (let k = 1; k <= nl; k++) neck.push(ahead([x, z], dir, k));
          const tip = neck[neck.length - 1], first = ahead(tip, dir);
          const side = dir === "n" || dir === "s" ? [1, 0] : [0, 1];
          const [w, d] = side[0] ? size : [size[1], size[0]];
          const half = Math.floor((side[0] ? w : d) / 2);
          const x0 = first[0] - side[0] * half + Math.min(0, DIR[dir][0]) * (w - 1), z0 = first[1] - side[1] * half + Math.min(0, DIR[dir][1]) * (d - 1);
          const box = [x0, z0, x0 + w - 1, z0 + d - 1];
          const all = [...neck, ...boxCells(box)];
          if (all.some(([a, b]) => !G.in(a, b) || G.at(a, b).s !== "none" || ctx.avoid.has(key(a, b)))) continue;
          let bad = false;
          for (const [a, b] of all) for (const [dx, dz] of N4) {
            const nx = a + dx, nz = b + dz;
            if (nx === x && nz === z) continue;
            if (all.some(([p, q]) => p === nx && q === nz)) continue;
            if (G.land(nx, nz) && G.at(nx, nz).h === c.h) bad = true;
          }
          if (bad) continue;
          out.push({ params: { neck, box, h: c.h, from: [x, z] }, owner: G.who(x, z), score: 3 });
        }
      });
      return out;
    },
  },
  inlet: {
    role: "flank",
    about: "A bay of still water cut into the flank from the rim, beside the route but never on it. It breaks a straight shore and gives the decor pass a bank.",
    build: ({ box }) => ({ cells: boxCells(box).map(([x, z]) => cell(x, z, 0, { path: false, s: "water" })), flank: 0, box, attach: { in: [box[0], box[1]], out: [box[2], box[3]] } }),
    valid: (G, p) => {
      const out = inBounds(G, p);
      for (const c of p.cells) for (const [dx, dz] of N4) {
        const n = G.at(c.x + dx, c.z + dz);
        if (n?.s === "ramp" || n?.s === "lift") out.push(`${p.name}: ${c.x},${c.z} touches ${n.s} at ${c.x + dx},${c.z + dz}`);
      }
      return out;
    },
    site: (G, ctx, { size = [2, 2] } = {}) => {
      const out = [];
      for (const [w, d] of [size, [size[1], size[0]]]) G.each((_, x0, z0) => {
        const box = [x0, z0, x0 + w - 1, z0 + d - 1], cells = boxCells(box);
        if (cells.some(([x, z]) => { const c = G.at(x, z); return !c || !G.land(x, z) || c.p || c.s === "ramp" || ctx.avoid.has(key(x, z)) || (ctx.dist.get(key(x, z)) ?? 9) < 1; })) return;
        const h = G.at(x0, z0).h;
        if (cells.some(([x, z]) => G.at(x, z).h !== h)) return;
        let mouth = 0, shore = 0;
        for (const [x, z] of cells) for (const [dx, dz] of N4) {
          if (inBox(box, x + dx, z + dz)) continue;
          const n = G.at(x + dx, z + dz);
          if (!n || n.s === "none") mouth++;
          else if (G.land(x + dx, z + dz)) shore++;
          if (n && (n.s === "ramp" || n.s === "lift" || ctx.avoid.has(key(x + dx, z + dz)))) shore = -99;
        }
        if (mouth >= 2 && mouth <= Math.max(w, d) && shore >= 4) out.push({ params: { box }, owner: null, score: shore - mouth });
      });
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
