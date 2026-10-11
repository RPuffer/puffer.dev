import { stamp } from "./features.js";
import { key, walk } from "./grid.js";

export function coreBands(fx, fz) {
  const cheb = (x, z) => Math.max(fx - x, x - (fx + 1), fz - z, z - (fz + 1), 0);
  return { cheb, figure: [fx, fz], dais: [fx - 2, fz - 2, fx + 3, fz + 3], terrace: [fx - 4, fz - 4, fx + 5, fz + 5] };
}

export function planIsland(G, rng, o = {}) {
  const pieces = [], segs = {};
  const seg = (id, role, extra = {}) => (segs[id] = { id, role, cells: [], links: [], ...extra });
  const put = (id, kind, params, segId = id) => {
    const p = stamp(G, id, kind, params, segId);
    pieces.push(p);
    const s = segs[segId];
    if (s) for (const c of p.cells) if (G.in(c.x, c.z)) s.cells.push([c.x, c.z]);
    return p;
  };
  const link = (a, b, via = null) => { segs[a].links.push({ to: b, via }); segs[b].links.push({ to: a, via }); };

  const fx = 12, fz = 13, HC = 3, HD = 4;
  const B = coreBands(fx, fz);
  const gx = rng.pick([13, 14]);
  const sx = rng.pick([11, 12]);
  const ey = rng.pick([12, 13]);
  const dy = ey + rng.pick([3, 4]);
  const px = rng.pick([8, 9]);
  const lx = rng.pick([...Array(4)].map((_, i) => px + i).filter((x) => x >= 9 && x <= sx + 1));
  const ex = rng.pick([px, px + 1, px + 2].filter((x) => x !== lx));
  const cx = rng.pick([5, 6]);
  const wx = Math.max(1, cx - rng.pick([3, 4]));
  const climbZ = rng.int(14, 19);
  const southZ = rng.pick([27, 28, 29]);
  const vx = rng.int(cx + 2, gx - 3);

  seg("core", "core");
  const [tx0, tz0, tx1, tz1] = B.terrace;
  for (let z = tz0; z <= tz1; z++) for (let x = tx0; x <= tx1; x++) {
    const d = B.cheb(x, z);
    G.set(x, z, { h: d <= 2 ? HD : HC, s: d <= 2 ? "stone" : d === 3 ? "sand" : "grass" }, "core");
  }
  const ringN = tz0 + 1, ringS = tz1 - 1, ringW = tx0 + 1, ringE = tx1 - 1;
  const daisRing = [fx - 1, fz - 1, fx + 2, fz + 2];

  seg("approach", "spine");
  seg("terrace", "spine");
  seg("dais", "spine");
  seg("exit", "spine");
  seg("plaza", "bonfire");
  seg("lowroad", "spine");
  seg("outer", "spine");
  seg("chord", "shortcut");
  seg("north", "spine");
  seg("doorway", "shortcut");
  seg("spur", "shortcut");

  put("terrace", "road", { points: [[gx, ringN], [ringW, ringN], [ringW, ringS], [sx, ringS]], h: HC, flank: 0 });
  put("dais-climb", "road", { points: [[sx, ringS], [sx, ringS - 1], [sx, daisRing[3]]], h: HC, steps: [[sx, ringS - 1, "up"]], flank: 0 }, "dais");
  put("dais", "road", { points: [[sx, daisRing[3]], [daisRing[0], daisRing[3]], [daisRing[0], daisRing[1]], [daisRing[2], daisRing[1]], [daisRing[2], ey]], h: HD, flank: 0 });
  put("dais-descent", "road", { points: [[daisRing[2], ey], [ringE, ey], [tx1, ey]], h: HD, steps: [[daisRing[2] + 1, ey, "down"]], flank: 0 }, "exit");
  put("east-ring", "road", { points: [[ringE, ey], [ringE, dy], [tx1, dy]], h: HC, flank: 0 }, "exit");
  put("exit", "causeway", { from: [tx1, ey], dir: "e", len: 6, h: HC });
  link("terrace", "dais"); link("dais", "exit");

  put("approach", "road", { points: [[gx, 5], [gx, tz0 - 1], [gx, ringN]], h: 2, steps: [[gx, tz0 - 1, "up"]], flank: 1 });
  link("approach", "terrace");

  put("plaza", "plaza", { box: [px, 22, px + 3, 25], h: 1, doors: [[px, 23], [ex, 25], [lx, 22], [px + 3, 23]], flank: 1 });
  put("entry", "dock", { from: [ex, 25], dir: "s", len: 2, h: 1 }, "plaza");
  const hub = [ex, 23];
  for (const door of [[px, 23], [ex, 25], [lx, 22], [px + 3, 23]]) for (const [x, z] of walk([door, [door[0], hub[1]], hub])) {
    G.set(x, z, { ...G.at(x, z), p: 1 }, "plaza");
    segs.plaza.cells.push([x, z]);
  }

  put("lowroad", "road", { points: [[px - 1, 23], [cx, 23]], h: 1, flank: 1 });
  link("plaza", "lowroad");
  put("outer", "road", { points: [[cx, 24], [cx, southZ], [wx, southZ], [wx, 9], [cx, 9]], h: 1, steps: [[wx, climbZ, "up"]], flank: 1 });
  link("lowroad", "outer");
  put("chord", "road", { points: [[cx, 10], [cx, 22]], h: 2, steps: [[cx, 21, "down"]], flank: 1 });
  link("chord", "lowroad", { kind: "lever", edge: [[cx, 23], [cx, 22]] });
  put("north", "road", { points: [[cx, 9], [cx, 5], [gx - 1, 5]], h: 2, flank: 1 });
  link("outer", "north"); link("chord", "north"); link("outer", "chord"); link("north", "approach");

  put("doorway", "road", { points: [[tx1 + 1, dy], [tx1 + 3, dy], [tx1 + 3, 23], [px + 4, 23]], h: HC, steps: [[tx1 + 2, dy, "down"], [tx1 + 3, 21, "down"]], flank: 1 });
  link("doorway", "exit"); link("doorway", "plaza", { kind: "door", edge: [[px + 3, 23], [px + 4, 23]] });

  put("spur", "spur", { from: [lx, tz1], dir: "s", len: 3, h: HC });
  link("spur", "terrace"); link("spur", "plaza", { kind: o.drop ? "drop" : "ladder", top: [lx, tz1 + 3], dir: "s" });
  G.set(lx, tz1, { ...G.at(lx, tz1), p: 1 }, "core");
  G.set(lx, ringS, { ...G.at(lx, ringS), p: 1 }, "core");

  seg("vista", "branch");
  put("vista", "peninsula", { from: [vx, 5], dir: "n", len: 3, h: 2, pad: 2 });
  link("vista", "north");

  const blocks = {
    tower: [ringE, tz0],
    spires: [[sx + 2, ringS], [sx + 2, tz1]],
  };
  const sealed = [[ringE, tz0], [ringE + 1, tz0], [ringE, tz0 + 1], [ringE + 1, tz0 + 1], ...blocks.spires];
  const locks = [[[gx, tz0 - 2], [gx, tz0 - 1]], [[cx, 23], [cx, 22]], [[px + 3, 23], [px + 4, 23]], [[lx, tz1 + 3], [lx, tz1 + 4]]];
  return { pieces, segs, core: { ...B, HC, HD, blocks, sealed, gx, sx, ey }, locks, picks: { gx, sx, ey, dy, px, lx, ex, cx, wx, climbZ, southZ, vx }, plaza: [px, 22, px + 3, 25] };
}

export const segKey = (segs) => {
  const m = new Map();
  for (const s of Object.values(segs)) for (const [x, z] of s.cells) if (!m.has(key(x, z))) m.set(key(x, z), s.id);
  return m;
};
