import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { analyse } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { loadLevel, root } from "./lib.mjs";
import { key, TILE } from "./graph.mjs";
import { measure, screen } from "./layout-metrics.mjs";
import { walkLevel, heat } from "./walk.mjs";

const hullOf = (pts) => {
  const p = [...new Map(pts.map((q) => [q.join(","), q])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
};

export async function readability(level, brief, render, out, o = {}) {
  const meta = await sharp(render).metadata();
  const S = screen(level, meta.width, meta.height);
  const R = measure(level, { frame: false });
  const Wk = o.walks || walkLevel(level, o);
  const A = analyse(level, { brief });
  const g = (x, z) => (R.P.cell(x, z)?.h || 0) * TILE;
  const diamond = (x, z, inset = 0) => [[x + inset, z + inset], [x + 1 - inset, z + inset], [x + 1 - inset, z + 1 - inset], [x + inset, z + 1 - inset]].map(([a, b]) => S(a, g(x, z) + 0.02, b).map((v) => v.toFixed(1)).join(",")).join(" ");
  const top = (x, z, lift = 0.1) => S(x + 0.5, g(x, z) + lift, z + 0.5);
  const parts = [];
  const visits = {};
  for (const p of o.policies || ["greedy", "novelty"]) for (const [k, n] of Object.entries(Wk.policies[p].visits)) visits[k] = (visits[k] || 0) + n;
  const max = Math.max(1, ...Object.values(visits));
  for (const [k, n] of Object.entries(visits)) { const [x, z] = k.split(",").map(Number); parts.push(`<polygon points="${diamond(x, z)}" fill="${heat(Math.log1p(n) / Math.log1p(max))}" fill-opacity="0.62"/>`); }
  for (const k of R.spawnVis) { const [x, z] = k.split(",").map(Number); const [px, py] = top(x, z, 0.05); parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.2" fill="#14b86a" stroke="#fff" stroke-width="1"/>`); }
  const xs = new Set(Wk.xray.cells.map((c) => key(...c)));
  for (const c of Wk.xray.cells) parts.push(`<polygon points="${diamond(c[0], c[1], 0.08)}" fill="none" stroke="#e0002a" stroke-width="4"/>`);
  if (Wk.critical.length) parts.push(`<polyline points="${Wk.critical.map(([x, z]) => top(x, z, 0.15).join(",")).join(" ")}" fill="none" stroke="#1846c8" stroke-width="6" stroke-linejoin="round" stroke-opacity="0.9"/>`);
  const colors = ["#7a3cff", "#00a3a3", "#d1007a", "#5a7d00", "#c46a00", "#0057c2"];
  A.clusters.forEach((c, i) => {
    const cells = c.flatMap((p) => p.cells);
    if (c.length === 1) {
      const [x, z] = cells[0], [px, py] = top(x, z, 0.4);
      parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="17" fill="none" stroke="#ff2a2a" stroke-width="3" stroke-dasharray="5 4"/>`);
      return;
    }
    const pts = hullOf(cells.flatMap(([x, z]) => [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]]));
    const col = colors[i % colors.length], hy = Math.max(...cells.map(([x, z]) => g(x, z))) + 0.3;
    parts.push(`<polygon points="${pts.map(([x, z]) => S(x, hy, z).map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${col}" fill-opacity="0.08" stroke="${col}" stroke-width="2.5"/>`);
  });
  for (const e of level.edits || []) {
    const [px, py] = top(e.x, e.z, 0.2);
    parts.push(`<polygon points="${diamond(e.x, e.z, 0.04)}" fill="none" stroke="#ff00d4" stroke-width="3" stroke-dasharray="6 3"/><text x="${(px + 12).toFixed(1)}" y="${(py - 6).toFixed(1)}" font-family="Helvetica" font-size="13" font-weight="bold" fill="#b0009a">${e.kind} ${e.from.h}>${e.to.h}</text>`);
  }
  const [sx, sy] = top(...level.spawn, 0.2);
  parts.push(`<circle cx="${sx}" cy="${sy}" r="9" fill="#1846c8" stroke="#fff" stroke-width="2.5"/>`);
  const q = Wk.policies.greedy, nv = Wk.policies.novelty;
  const lines = [
    `${level.name}  critical path ${Wk.optimal}  x-ray ${Wk.xray.total} (run ${Wk.xray.longestRun})  spawn isovist ${(R.m.spawnIso * 100).toFixed(0)}%  clusters ${A.clusters.length} (${A.singles.length} single)${(level.edits || []).length ? `  terrain edits ${level.edits.length}` : ""}`,
    `greedy: figure ${q.toFigure ?? "never"} steps, ${q.backtracks} backtracks;  novelty: figure ${nv.toFigure ?? "never"}, ${nv.deadEndSteps} dead-end steps`,
    `heat greedy+novelty visits, blue route, red x-ray cells, green dots seen from spawn, hulls clusters, dashed red rings singletons, magenta terrain edits`,
  ];
  parts.push(`<rect x="8" y="8" width="${meta.width - 16}" height="70" rx="4" fill="#000" fill-opacity="0.66"/>` + lines.map((t, i) => `<text x="16" y="${28 + i * 20}" font-family="Helvetica" font-size="${i ? 12.5 : 15}" fill="#fff">${t}</text>`).join(""));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${parts.join("")}</svg>`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(render).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
  return { out, xs: xs.size };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const outDir = opt("--out", "out/loops/walks"), base = opt("--base", "http://localhost:8765"), renderArg = opt("--render", null);
  if (!args.length) { console.error("usage: node tools/loops/overlay.mjs <level>[,<level>...] [--render file.png] [--out out/loops/walks] [--base http://localhost:8765]"); process.exit(2); }
  for (const name of args[0].split(",")) {
    const { level, brief } = await loadLevel(name);
    const dir = path.resolve(root, outDir);
    const render = renderArg ? path.resolve(root, renderArg) : path.join(dir, `${name}.png`);
    if (!fs.existsSync(render)) execFileSync(process.execPath, [path.join(root, "tools/shot.mjs"), `${base}/3d/index.html?level=${name}&hero=0`, render, "900", "800"], { cwd: root, stdio: "inherit" });
    const r = await readability(level, brief, render, path.join(dir, `${name}-overlay.png`));
    console.log(`wrote ${path.relative(root, r.out)}`);
  }
}
