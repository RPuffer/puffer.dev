import { stamp } from "./features.js";
import { key, walk, DIR } from "./grid.js";
import { buildTopology, nodeCell, nk } from "./topology.js";

export const FRAME = { X: 3, Z: 3 };

export function coreBands(fx, fz) {
  const cheb = (x, z) => Math.max(fx - x, x - (fx + 1), fz - z, z - (fz + 1), 0);
  return { cheb, figure: [fx, fz], dais: [fx - 2, fz - 2, fx + 3, fz + 3], terrace: [fx - 4, fz - 4, fx + 5, fz + 5] };
}

const dirTo = (a, b) => Object.keys(DIR).find((d) => DIR[d][0] === Math.sign(b[0] - a[0]) && DIR[d][1] === Math.sign(b[1] - a[1]));

export function planIsland(G, rng, o = {}) {
  const pieces = [], segs = {}, extraLinks = [];
  const seg = (id, role, extra = {}) => (segs[id] = { id, role, cells: [], links: [], ...extra });
  const put = (id, kind, params, segId = id) => {
    const p = stamp(G, id, kind, params, segId);
    pieces.push(p);
    const s = segs[segId];
    if (s) for (const c of p.cells) if (G.in(c.x, c.z)) s.cells.push([c.x, c.z]);
    return p;
  };
  const link = (a, b, via = null) => { segs[a].links.push({ to: b, via }); segs[b].links.push({ to: a, via }); };

  const { X, Z } = FRAME;
  const fx = 12 + X, fz = 13 + Z, HC = 3, HD = 4;
  const B = coreBands(fx, fz);
  const topo = buildTopology(o.archetype || "ring", rng);
  const [gx, gz] = nodeCell(topo.E);
  const sx = rng.pick([11, 12]) + X;
  const ey = rng.pick([12, 13]) + Z;
  const dy = ey + rng.pick([3, 4]);
  const px = rng.pick([8, 9]) + X;
  const lx = rng.pick([...Array(4)].map((_, i) => px + i).filter((x) => x >= 9 + X && x <= sx + 1));
  const ex = rng.pick([px, px + 1, px + 2].filter((x) => x !== lx));
  const PZ = 22 + Z;

  seg("core", "core");
  const [tx0, tz0, tx1, tz1] = B.terrace;
  for (let z = tz0; z <= tz1; z++) for (let x = tx0; x <= tx1; x++) {
    const d = B.cheb(x, z);
    G.set(x, z, { h: d <= 2 ? HD : HC, s: d <= 2 ? "stone" : d === 3 ? "sand" : "grass" }, "core");
  }
  const ringN = tz0 + 1, ringS = tz1 - 1, ringW = tx0 + 1, ringE = tx1 - 1;
  const daisRing = [fx - 1, fz - 1, fx + 2, fz + 2];

  for (const [id, role] of [["approach", "spine"], ["terrace", "spine"], ["dais", "spine"], ["exit", "spine"], ["plaza", "bonfire"], ["lowroad", "spine"], ["doorway", "shortcut"], ["spur", "shortcut"]]) seg(id, role);

  put("terrace", "road", { points: [[gx, ringN], [ringW, ringN], [ringW, ringS], [sx, ringS]], h: HC, flank: 0 });
  put("dais-climb", "road", { points: [[sx, ringS], [sx, ringS - 1], [sx, daisRing[3]]], h: HC, steps: [[sx, ringS - 1, "up"]], flank: 0 }, "dais");
  put("dais", "road", { points: [[sx, daisRing[3]], [daisRing[0], daisRing[3]], [daisRing[0], daisRing[1]], [daisRing[2], daisRing[1]], [daisRing[2], ey]], h: HD, flank: 0 });
  put("dais-descent", "road", { points: [[daisRing[2], ey], [ringE, ey], [tx1, ey]], h: HD, steps: [[daisRing[2] + 1, ey, "down"]], flank: 0 }, "exit");
  put("east-ring", "road", { points: [[ringE, ey], [ringE, dy], [tx1, dy]], h: HC, flank: 0 }, "exit");
  put("exit", "causeway", { from: [tx1, ey], dir: "e", len: 6, h: HC });
  link("terrace", "dais"); link("dais", "exit");

  const hE = topo.h(topo.E);
  put("approach", "road", { points: [[gx, gz], [gx, tz0 - 1], [gx, ringN]], h: hE, steps: hE < HC ? [[gx, tz0 - 1, "up"]] : [], flank: hE < HC ? 1 : 0 });
  link("approach", "terrace");

  put("plaza", "plaza", { box: [px, PZ, px + 3, PZ + 3], h: 1, doors: [[px, PZ + 1], [ex, PZ + 3], [lx, PZ], [px + 3, PZ + 1]], flank: 1 });
  put("entry", "dock", { from: [ex, PZ + 3], dir: "s", len: 2, h: 1 }, "plaza");
  const hub = [ex, PZ + 1];
  for (const door of [[px, PZ + 1], [ex, PZ + 3], [lx, PZ], [px + 3, PZ + 1]]) for (const [x, z] of walk([door, [door[0], hub[1]], hub])) {
    G.set(x, z, { ...G.at(x, z), p: 1 }, "plaza");
    segs.plaza.cells.push([x, z]);
  }

  const [sxC, szC] = nodeCell(topo.S);
  put("lowroad", "road", { points: [[px - 1, PZ + 1], [sxC, szC]], h: 1, flank: 1 });
  link("plaza", "lowroad");

  const unitOwner = (a, b) => `u${nk(a)}-${nk(b)}`;
  const atNode = new Map();
  const chordLast = topo.lines.find((l) => l.id === "chord").steps.slice(-1)[0];
  const lastOwner = unitOwner(...chordLast);
  const chests = [];
  for (const l of topo.lines) {
    seg(l.id, l.role);
    for (const [a, b] of l.steps) {
      const owner = unitOwner(a, b);
      const A = nodeCell(a), Bc = nodeCell(b), ha = topo.h(a), hb = topo.h(b);
      const first = [A[0] + Math.sign(Bc[0] - A[0]), A[1] + Math.sign(Bc[1] - A[1])];
      const p = stamp(G, owner, "road", { points: [A, Bc], h: ha, steps: hb !== ha ? [[first[0], first[1], hb > ha ? "up" : "down"]] : [], flank: 1 }, owner);
      pieces.push(p);
      for (const c of p.cells) segs[l.id].cells.push([c.x, c.z]);
      for (const n of [a, b]) { if (!atNode.has(nk(n))) atNode.set(nk(n), []); atNode.get(nk(n)).push(owner); }
    }
    if (l.chest) chests.push({ line: l, tip: l.nodes[l.nodes.length - 1], from: l.nodes[l.nodes.length - 2] });
  }
  for (const [n, owners] of atNode) for (let i = 0; i < owners.length; i++) for (let j = i + 1; j < owners.length; j++) {
    if ((owners[i] === lastOwner || owners[j] === lastOwner) && n === nk(topo.u)) continue;
    extraLinks.push([owners[i], owners[j]]);
  }
  for (const own of atNode.get(nk(topo.S)) || []) if (!(own === lastOwner && nk(topo.u) === nk(topo.S))) extraLinks.push(["lowroad", own]);
  for (const own of atNode.get(nk(topo.E)) || []) extraLinks.push(["approach", own]);

  const main = topo.lines.find((l) => l.id === "main");
  link("lowroad", "main"); link("main", "approach");
  for (const l of topo.lines) if (l.id !== "main" && l.id !== "chord") link(l.id, "main");
  link("chord", "main"); link("chord", "lowroad", { kind: "lever" });

  const chordCells = segs.chord.cells.filter((c, i, arr) => i === arr.findIndex((q) => q[0] === c[0] && q[1] === c[1]));
  const uCell = nodeCell(topo.u);
  const block = chordCells[chordCells.length - 2];
  const leverGate = { threshold: uCell, block };

  put("doorway", "road", { points: [[tx1 + 1, dy], [tx1 + 3, dy], [tx1 + 3, PZ + 1], [px + 4, PZ + 1]], h: HC, steps: [[tx1 + 2, dy, "down"], [tx1 + 3, PZ - 1, "down"]], flank: 1 });
  link("doorway", "exit"); link("doorway", "plaza", { kind: "door", edge: [[px + 3, PZ + 1], [px + 4, PZ + 1]] });

  put("spur", "spur", { from: [lx, tz1], dir: "s", len: 3, h: HC });
  link("spur", "terrace"); link("spur", "plaza", { kind: o.drop ? "drop" : "ladder", top: [lx, tz1 + 3], dir: "s" });
  G.set(lx, tz1, { ...G.at(lx, tz1), p: 1 }, "core");
  G.set(lx, ringS, { ...G.at(lx, ringS), p: 1 }, "core");

  let chest = null;
  for (const c of chests) {
    const tip = nodeCell(c.tip), back = nodeCell(c.from), d0 = dirTo(back, tip);
    const out = [d0, ...(c.tip[0] === 0 ? ["w"] : []), ...(c.tip[1] === 0 ? ["n"] : []), ...(c.tip[1] === 10 ? ["s"] : []), ...Object.keys(DIR)];
    for (const d of out) {
      const cx = tip[0] + DIR[d][0], cz = tip[1] + DIR[d][1], cur = G.at(cx, cz);
      if (!cur || cur.s !== "none") continue;
      G.set(cx, cz, { h: topo.h(c.tip), s: "stone", room: true }, unitOwner(...c.line.steps.slice(-1)[0]));
      chest = { x: cx, z: cz, rot: { n: 0, s: 2, w: 3, e: 1 }[d], tip };
      break;
    }
    if (chest) break;
  }

  const blocks = { tower: [ringE, tz0], spires: [[sx + 2, ringS], [sx + 2, tz1]] };
  const sealed = [[ringE, tz0], [ringE + 1, tz0], [ringE, tz0 + 1], [ringE + 1, tz0 + 1], ...blocks.spires];
  const locks = [[[gx, tz0 - 2], [gx, tz0 - 1]], [leverGate.threshold, leverGate.block], [[px + 3, PZ + 1], [px + 4, PZ + 1]], [[lx, tz1 + 3], [lx, tz1 + 4]]];
  return {
    pieces, segs, extraLinks, topology: topo, chest, leverGate,
    lever: { node: nodeCell(topo.v), h: topo.h(topo.v), first: chordCells[1] },
    core: { ...B, HC, HD, blocks, sealed, gx, sx, ey },
    locks,
    picks: { archetype: topo.archetype, gx, sx, ey, dy, px, lx, ex, PZ, exitX: tx1 + 7 },
    plaza: [px, PZ, px + 3, PZ + 3],
  };
}

export const segKey = (segs) => {
  const m = new Map();
  for (const s of Object.values(segs)) for (const [x, z] of s.cells) if (!m.has(key(x, z))) m.set(key(x, z), s.id);
  return m;
};
