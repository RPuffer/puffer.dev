import * as THREE from "three";
import { register as forestA } from "./forest-a.js";

export function register(style) {
  const P = style.palette;
  const T = P.tones?.["fire-bird"] || [];
  const A = forestA({ ...style, palette: { ...P, spirit: T[2] || P.spirit, ember: T[1] || P.ember, flame: T[0] || P.flame } });
  return {
    catalog: { "fire-bird": { ...A.catalog["fire-bird"], height: 2.8 } },
    builders: {
      "fire-bird"(v, rot, st, ctx) {
        const m = A.builders["fire-bird"](v, rot, st, ctx);
        m.rotation.y = rot * (Math.PI / 2);
        const g = new THREE.Group();
        g.add(m);
        return g;
      },
    },
  };
}

const HOT = new Set(["flame", "spirit", "ember", "beak", "spiritEye", "tones", "bg", "flowerOrange", "berry", "gold"]);

function vivid(hex, s, l) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(...c), mn = Math.min(...c), L = (mx + mn) / 2, d = mx - mn;
  let h = 0, S = d ? d / (1 - Math.abs(2 * L - 1)) : 0;
  if (d) h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
  S = Math.min(1, S * s);
  const L2 = Math.min(0.92, L * l), C = (1 - Math.abs(2 * L2 - 1)) * S, X = C * (1 - Math.abs((h % 2 + 2) % 2 - 1)), m = L2 - C / 2;
  const hh = ((h % 6) + 6) % 6;
  const [r, g, b] = hh < 1 ? [C, X, 0] : hh < 2 ? [X, C, 0] : hh < 3 ? [0, C, X] : hh < 4 ? [0, X, C] : hh < 5 ? [X, 0, C] : [C, 0, X];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}
const deep = (v, f) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? f(v) : Array.isArray(v) ? v.map((x) => deep(x, f)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x, f)])) : v;

export async function finish(file = "levels/forest-a-biome.json", opts = {}) {
  const fs = await import("node:fs");
  const { registerCatalog, CATALOG } = await import("../../core/catalog.js");
  const { checkLevel, frameView } = await import("../../core/procgen.js");
  const L = JSON.parse(fs.readFileSync(file, "utf8"));
  registerCatalog(register({ palette: L.palette }).catalog);
  const [W, D] = L.size;
  const at = (x, z) => L.cells[z]?.[x];
  const k = (x, z) => `${x},${z}`;
  const pond = opts.pond || [[1, 9], [2, 9], [3, 9], [1, 10], [2, 10], [3, 10]];
  const ring = opts.ring || [];
  const bites = opts.bites || [[0, 8], [0, 9], [0, 10], [0, 11], [5, 11], [11, 11], [12, 11], [15, 6], [15, 7], [15, 8], [1, 3], [12, 1], [13, 1], [13, 2]];
  for (const [x, z] of ring) L.cells[z][x] = { h: 1, s: "sand" };
  for (const [x, z] of pond) L.cells[z][x] = { h: 0, s: "water" };
  for (const [x, z] of bites) L.cells[z][x] = { h: 0, s: "none" };
  const fall = opts.fall || [2, 9];
  L.cells[fall[1] - 1][fall[0]] = { h: 2, s: "water" };
  L.cells[fall[1] - 1][fall[0] - 1] = { h: 2, s: "grass" };
  const voidAt = (x, z) => { const c = at(x, z); return !c || c.s === "none"; };
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = at(x, z);
    if (c.s === "grass" && c.h === 1 && N4.some(([a, b]) => voidAt(x + a, z + b))) c.s = "sand";
  }
  const gone = new Set([...pond, ...bites].map(([x, z]) => k(x, z)));
  L.decor = L.decor.filter((d) => {
    if (d.t === "waterfall" || d.t === "fire-bird") return d.t !== "waterfall";
    const spec = CATALOG[d.t] || {};
    if (gone.has(k(d.x, d.z))) return false;
    if ((spec.height || 0) >= 1.4 && (voidAt(d.x + 1, d.z) || voidAt(d.x, d.z + 1) || voidAt(d.x + 1, d.z + 1))) return false;
    return true;
  });
  L.decor.push({ t: "waterfall", x: fall[0], z: fall[1], v: 0, rot: 0, ox: 0, oz: 0 });
  for (let i = 0; i < 10; i++) {
    const m = checkLevel(L).map((p) => p.match(/unreachable, first (\d+),(\d+)/)).find(Boolean);
    if (!m) break;
    const [x, z] = [+m[1], +m[2]];
    const j = L.decor.findIndex((d) => /^(log|rock|rock-big|stump|mushroom|bush)$/.test(d.t) && Math.abs(d.x - x) + Math.abs(d.z - z) <= 1);
    if (j >= 0) { L.decor.splice(j, 1); continue; }
    L.cells[z][x] = { h: 0, s: "none" };
  }
  const s = opts.sat ?? 1.3, l = opts.light ?? 1.12;
  for (const key of Object.keys(L.palette)) if (!HOT.has(key)) L.palette[key] = deep(L.palette[key], (h) => vivid(h, s, l));
  L.view = frameView(L).view;
  const problems = checkLevel(L).filter((p) => !/grass share|plateau in/.test(p));
  fs.writeFileSync(file, JSON.stringify(L));
  return problems;
}
