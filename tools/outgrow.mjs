import fs from "node:fs";
import path from "node:path";
import { CATALOG, blockedCells, registerCatalog } from "../core/catalog.js";
import { frameView } from "../core/procgen.js";
import { outgrow, thingCells, plan } from "../3d/pieces/outgrowth.js";
import { ISLANDS } from "./loops/rebuild.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const mode = args.includes("--write") ? "write" : args.includes("--map") ? "map" : "dry";
const blockedOf = (L) => { const s = new Set(); for (const d of L.decor) if (CATALOG[d.t] && d.t !== "waterfall") for (const [a, b] of blockedCells(d)) s.add(a + "," + b); return s; };

for (const [name, art] of ISLANDS.filter(([l]) => !only || only.split(",").includes(l))) {
  const file = path.join(root, "levels", name + ".json");
  const L = JSON.parse(fs.readFileSync(file, "utf8"));
  const mod = await import(path.join(root, "3d/pieces", art + ".js"));
  for (const m of [mod, ...(await Promise.all((L.pieces || []).filter((p) => !p.endsWith(art + ".js")).map((p) => import(path.join(root, "3d", p)))))]) { try { const reg = m.register?.({ palette: L.palette }); if (reg?.catalog) registerCatalog(reg.catalog); } catch {} }
  const blocked = blockedOf(L), busy = new Set([...thingCells(L), ...blocked]);
  if (mode === "map") {
    console.log(`== ${name} ${L.size} spawn ${L.spawn} catalog ${Object.keys(CATALOG).length}`);
    console.log("   " + [...Array(L.size[0]).keys()].map((x) => x % 10).join(""));
    L.cells.forEach((row, z) => console.log(String(z).padStart(2) + " " + row.map((c, x) => { const kk = x + "," + z; if (c.s === "none") return "."; if (c.s === "lift") return "L"; if (c.s === "water") return "~"; if (c.s === "bridge") return "="; if (c.s === "ramp") return "r"; if (busy.has(kk)) return "T"; if (blocked.has(kk) || L.decor.some((d) => d.x === x && d.z === z)) return "#"; return String(c.h); }).join("")));
    const types = {};
    for (const d of L.decor) types[d.t] = (types[d.t] || 0) + 1;
    console.log("decor", Object.entries(types).map(([t, n]) => t + ":" + n).join(" "));
    continue;
  }
  if (args.includes("--pick")) { console.log(`  "${name}": ${JSON.stringify(pick(L, busy))},`); continue; }
  const specs = mod.GROW?.[name];
  if (!specs) { console.log(`${name}: no GROW`); continue; }
  const log = outgrow(L, specs, { busy });
  L.view = frameView(L).view;
  console.log(`${name}: ${log.join("; ")}`);
  if (mode === "write") fs.writeFileSync(file, JSON.stringify(L));
}

function pick(L, busy) {
  const [W, D] = L.size;
  const counts = {};
  for (const d of L.decor) if (!d.watch && !/-s$|small|watchtower|market|arch|gazebo|tower|fountain|forge|press|monolith|crane|vat|eyrie|shrine|canopy|bridge|road|fence|stepping|rock-big|tree/.test(d.t)) counts[d.t] = (counts[d.t] || 0) + 1;
  const props = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const prop = props[0] || "rock", prop2 = props.find((t) => t !== prop && t !== "rock") || prop;
  const cands = (side) => {
    const out = [], [ox, oz] = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[side];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const c = L.cells[z][x], n = L.cells[z + oz]?.[x + ox];
      if (c.h >= 1 && /grass|sand|dirt|stone/.test(c.s) && !busy.has(x + "," + z) && (!n || n.s === "none")) out.push({ at: [x, z], h: c.h, mid: side === "n" || side === "s" ? Math.abs(x - W / 2) : Math.abs(z - D / 2) });
    }
    return out.sort((a, b) => a.mid - b.mid);
  };
  const seed = [...L.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7), r = (n, i) => (seed >>> (i * 3)) % n;
  const psize = [[2, 3], [3, 3], [2, 2], [3, 2]][r(4, 0)], tier2 = r(3, 1) === 0, dlen = 2 + r(3, 2), wlen = 1 + r(3, 3), wfirst = r(2, 4) ? "n" : "w";
  const plateau = (side, size, a) => { const n = tier2 ? 2 : 1, tier = a.h >= 3 || (tier2 && a.h >= 2 && a.h - 2 >= 1 && r(2, 5)) ? -n : n, v0 = -Math.floor((size[1] - 1) / 2); const st = 2 * n - 1, d = [{ t: prop, u: st + size[0], v: v0 + size[1] - 1 }]; if (size[1] > 2) d.push({ t: "rock", u: st + 1, v: v0 }); return { kind: "plateau", side, at: a.at, size, tier, decor: d }; };
  const walk = (side, a) => ({ kind: "walkway", side, at: a.at, len: wlen, islet: [2, 2], ...(r(2, 6) ? { causeway: true } : {}), decor: [{ t: prop2, u: wlen + 2, v: 1 }] });
  const want = [
    (a) => plateau("n", psize, a),
    (a) => ({ kind: "dock", side: "w", at: a.at, len: dlen, decor: [{ t: prop2, u: dlen }] }),
    (a) => walk(wfirst, a),
    (a) => ({ kind: "dock", side: r(2, 7) ? "e" : "s", at: a.at, len: 2, decor: [] }),
    (a) => walk(wfirst === "n" ? "w" : "n", a),
    (a) => plateau("w", [2, 2], a),
  ];
  const chosen = [];
  for (const mk of want) {
    if (chosen.length >= 4) break;
    const side = mk({ at: [0, 0], h: 1 }).side;
    if (side !== "e" && side !== "s" && chosen.filter((c) => c.side === "n" || c.side === "w").length >= 3) continue;
    if (chosen.filter((c) => c.side === side).length >= 2) continue;
    if ((side === "e" || side === "s") && chosen.some((c) => c.side === "e" || c.side === "s")) continue;
    let cs = cands(side);
    if (mk({ at: [0, 0], h: 1 }).kind === "dock") cs = cs.sort((a, b) => a.h - b.h || a.mid - b.mid);
    for (const a of cs) { const sp = mk(a); if (!plan(L, [...chosen, sp], { busy }).problems.length) { chosen.push(sp); break; } }
  }
  return chosen;
}
