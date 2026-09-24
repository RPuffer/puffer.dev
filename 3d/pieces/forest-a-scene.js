import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { register as forestA } from "./forest-a.js";

const first = (P, type, i, d) => P.tones?.[type]?.[i] || d;
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const pal3 = (c) => tone(c[0], c[1], c[2]);

export function register(style) {
  const P = style.palette;
  const bark = first(P, "bare-trunk", 0, ["#5c5255", "#59303b", "#41232b"]);
  const root = first(P, "twisted-roots", 0, ["#59303b", "#41232b", "#282330"]);
  const stoneLo = first(P, "shrine-dais", 0, ["#a3a6a1", "#8a8c88", "#5c5e5b"]);
  const stoneHi = first(P, "shrine-dais", 1, ["#b5b8b2", "#949691", "#696b67"]);
  const gold = first(P, "shrine-dais", 2, ["#d4a631", "#ad8421", "#705419"]);
  const gBase = first(P, "threshold-gate", 0, ["#8a8c88", "#747571", "#5c5e5b"]);
  const gWood = first(P, "threshold-gate", 1, ["#a55418", "#833e0f", "#662c08"]);
  const gCap = first(P, "threshold-gate", 2, ["#c16825", "#a55418", "#662c08"]);
  const gRope = first(P, "threshold-gate", 3, ["#f6d881", "#dcc070", "#6b3a1a"]);
  const birdT = P.tones?.["spirit-firebird"] || [];
  const A = forestA({
    ...style,
    palette: {
      ...P, bark, rootWood: root,
      spirit: birdT[2] || P.spirit, ember: birdT[3] || P.ember, flame: birdT[4] || P.flame,
      beak: birdT[5] || P.beak,
      grass: { ...P.grass, top: stoneHi[0], fringe: stoneHi[1], fringeDark: stoneHi[2] },
    },
  });

  const catalog = {
    "spirit-firebird": { footprint: [2, 2], passable: false, variants: 1, height: 3.0, rotates: true },
    "shrine-dais": { footprint: [1, 1], passable: false, variants: 1, height: 0.4 },
    "threshold-gate": { footprint: [1, 1], passable: true, variants: 1, height: 2.6 },
    "bare-trunk": { footprint: [1, 1], passable: false, variants: 3, height: 2.6 },
    "twisted-roots": { footprint: [1, 1], passable: false, variants: 2, height: 0.45, rotates: true },
  };

  const dais = (B, r, h) => {
    B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.45, pal3(stoneLo));
    B.prism(circle(0, 0, r * 0.97, r * 0.97, 8, Math.PI / 8), h * 0.45, h * 0.5, pal3([stoneLo[2], stoneLo[2], stoneLo[2]]));
    B.prism(circle(0, 0, r * 0.82, r * 0.82, 8, Math.PI / 8), h * 0.5, h, pal3(stoneHi));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      B.at(Math.sin(a) * r * 0.9, h * 0.45, Math.cos(a) * r * 0.9, a, () => B.rbox(0.14 * r, 0.06, 0.1 * r, 0.03, pal3(gold)));
    }
  };

  const builders = {
    "spirit-firebird"(v, rot, st, ctx) {
      const g = new THREE.Group();
      const B = new Baker();
      dais(B, 0.98, 0.34);
      g.add(mesh(B));
      const bird = A.builders["fire-bird"](0, rot, st, { ...ctx, height: ctx.height - 0.34 });
      bird.position.y = 0.34;
      bird.rotation.y = rot * (Math.PI / 2);
      g.add(bird);
      return g;
    },
    "shrine-dais"(v, rot, st, ctx) {
      const B = new Baker();
      dais(B, 0.46, ctx.height);
      return mesh(B);
    },
    "threshold-gate"(v, rot, st, ctx) {
      const B = new Baker();
      const H = ctx.height, d = ctx.decor || { x: 0 };
      const side = d.x <= 7 ? 1 : -1;
      const reach = Math.abs(7.5 - d.x) <= 2 ? Math.abs(7.5 - d.x) : 0.35;
      B.box(0.42, 0.28, 0.42, pal3(gBase));
      B.box(0.32, 0.05, 0.32, pal3([gBase[1], gBase[1], gBase[2]]), 0, 0.28, 0);
      B.box(0.3, H * 0.42, 0.3, pal3(gWood), 0, 0.33, 0);
      B.box(0.26, H * 0.46 - 0.33, 0.26, pal3(gWood), 0, 0.33 + H * 0.42, 0);
      B.box(0.32, 0.1, 0.32, pal3(gRope), 0, H * 0.52, 0);
      B.box(0.08, 0.16, 0.06, pal3(gRope), 0.08 * side, H * 0.52 - 0.14, 0.17);
      const top = H * 0.88;
      const cx = side * (reach - 0.35) / 2;
      B.box(reach + 0.35, 0.12, 0.2, pal3(gWood), cx, top - 0.34, 0);
      B.box(reach + 0.55, 0.16, 0.3, pal3(gCap), cx - side * 0.1, top - 0.02, 0);
      B.box(0.2, 0.14, 0.3, pal3(gCap), -side * 0.38, top + 0.08, 0);
      B.box(0.36, 0.1, 0.34, pal3([gCap[2], gCap[2], gCap[2]]), 0, top - 0.12, 0);
      return mesh(B);
    },
    "bare-trunk": A.builders["bare-trunk"],
    "twisted-roots"(v, rot, st, ctx) {
      return A.builders["root-tangle"](v, rot, st, { ...ctx, height: ctx.height * 0.8 });
    },
  };
  return { catalog, builders };
}

export async function finish(file = "levels/forest-a-scene.json", regionsFile = "pipeline/a-transcribe/regions-scene.json") {
  const fs = await import("node:fs");
  const { checkLevel, reachability } = await import("../../core/procgen.js");
  const { registerCatalog } = await import("../../core/catalog.js");
  const L = JSON.parse(fs.readFileSync(file, "utf8"));
  registerCatalog(register({ palette: L.palette }).catalog);
  const R = JSON.parse(fs.readFileSync(regionsFile, "utf8")).cells;
  const [W, D] = L.size;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = L.cells[z][x], code = R[z][x].code || R[z][x].prior?.[0];
    if (c.s === "stone" && c.h >= 2 && !/[RFP]/.test(code || "")) c.s = "grass";
  }
  for (const x of [7, 8]) L.cells[6][x] = { h: 1, s: "stone" };
  for (const x of [6, 9]) L.cells[6][x] = { h: 2, s: "ramp", d: "s", m: "stone" };
  const drop = new Set(["threshold-gate", "shrine-dais"]);
  L.decor = L.decor.filter((d) => !drop.has(d.t) && !([6, 7].includes(d.z) && [5, 6, 7, 8, 9, 10].includes(d.x)));
  const rim = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = L.cells[z + b]?.[x + a]; return !n || n.s === "none"; });
  L.decor = L.decor.filter((d) => !(d.t === "log" && rim(d.x, d.z)));
  const add = (t, x, z, v = 0) => { L.decor = L.decor.filter((d) => !(d.x === x && d.z === z)); L.decor.push({ t, x, z, v, rot: 0, ox: 0, oz: 0 }); };
  add("threshold-gate", 6, 7);
  add("threshold-gate", 9, 7);
  add("pot", 6, 4, 0);
  add("pot", 10, 4, 1);
  for (let i = 0; i < 6; i++) {
    const m = checkLevel(L).map((p) => p.match(/unreachable, first (\d+),(\d+)/)).find(Boolean);
    if (!m) break;
    const [x, z] = [+m[1], +m[2]];
    const j = L.decor.findIndex((d) => /^(pot|log|rock|twisted-roots)$/.test(d.t) && Math.abs(d.x - x) + Math.abs(d.z - z) === 1);
    if (j < 0) break;
    L.decor.splice(j, 1);
  }
  const problems = checkLevel(L).filter((p) => !/grass share|plateau in/.test(p));
  const blocked = new Set();
  const r = reachability({ ...L, blocked });
  fs.writeFileSync(file, JSON.stringify(L));
  return { problems, reach: `${r.reached}/${r.total}`, missing: r.missing };
}
