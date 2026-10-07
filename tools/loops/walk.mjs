import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { CATALOG } from "../../core/catalog.js";
import { makeProjection, viewFrom, levelScreenBounds } from "../../core/iso.js";
import { hash, seedOf } from "../../pipeline/a-transcribe/finish-cluster.mjs";
import { loadLevel, root } from "./lib.mjs";
import { N4, key, prep, bfs, figureRing, leadOf, cellsOf, regionGraph } from "./graph.mjs";

export const POLICIES = ["shortest", "greedy", "random", "novelty"];
const FRAME = [351, 390];
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

export function world(level) {
  const Po = prep(level), Pc = prep(level, { gateClosed: true });
  const things = level.things || [];
  const gate = things.find((t) => (t.kind || t.t) === "gate") || null;
  const [ck, cid] = String(gate?.open || "").split(":");
  const watcher = ck === "watcher" ? things.find((t) => t.id === cid) : null;
  const elevator = things.find((t) => (t.kind || t.t) === "elevator") || null;
  const lead = leadOf(level), fig = lead ? cellsOf(lead) : [];
  const ring = figureRing(level, Po, lead), ringSet = new Set(ring.map((c) => key(...c)));
  const elevCells = elevator ? [[elevator.x, elevator.z], ...N4.map(([dx, dz]) => [elevator.x + dx, elevator.z + dz])].filter(([x, z]) => Po.walkable(x, z)) : [];
  const elevSet = new Set(elevCells.map((c) => key(...c)));
  const opens = (x, z) => {
    if (!gate) return false;
    if (!(gate.threshold || []).some(([a, b]) => a === x && b === z)) return false;
    if (!watcher) return true;
    const [w, d] = watcher.size || [1, 1];
    return Math.hypot(x + 0.5 - (watcher.x + w / 2), z + 0.5 - (watcher.z + d / 2)) < (watcher.radius || 3.5);
  };
  const figC = fig.length ? [fig.reduce((s, c) => s + c[0] + 0.5, 0) / fig.length, fig.reduce((s, c) => s + c[1] + 0.5, 0) / fig.length] : null;
  return { Po, Pc, gate, watcher, elevator, lead, fig, figC, ring, ringSet, elevCells, elevSet, opens };
}

function camera(level, w = 900, h = 800) {
  const view = viewFrom(level, {}), proj = makeProjection(view), B = levelScreenBounds(level, proj);
  const zoom = view.zoom > 0 ? view.zoom * Math.min(w / FRAME[0], h / FRAME[1]) : Math.min(w / (B.maxX - B.minX), h / (B.maxY - B.minY));
  const hw = w / 2 / zoom, hh = h / 2 / zoom;
  const clamp = (v, lo, hi, half) => (hi - lo <= 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v)));
  return (hero, target) => {
    const c = proj.project(...hero), s = proj.project(...target);
    const cx = clamp(c.sx, B.minX, B.maxX, hw), cy = clamp(c.sy, B.minY, B.maxY, hh);
    return Math.abs(s.sx - cx) <= hw / 3 && Math.abs(s.sy - cy) <= hh / 3;
  };
}

function shortest(level, W) {
  const segs = [];
  let at = level.spawn.slice(), open = false;
  const P = () => (open ? W.Po : W.Pc);
  if (W.gate && !bfs(W.Pc, at, (x, z) => W.ringSet.has(key(x, z))).path.length) {
    const s = bfs(W.Pc, at, (x, z) => W.opens(x, z));
    if (s.path.length) { segs.push(s.path); at = s.path[s.path.length - 1]; open = true; }
  }
  const f = bfs(P(), at, (x, z) => W.ringSet.has(key(x, z)));
  if (f.path.length) { segs.push(segs.length ? f.path.slice(1) : f.path); at = f.path[f.path.length - 1]; }
  if (W.elevCells.length) { const e = bfs(W.Po, at, (x, z) => W.elevSet.has(key(x, z))); if (e.path.length) segs.push(e.path.slice(1)); }
  return segs.flat();
}

function run(level, W, policy, o = {}) {
  const seed = o.seed ?? 1, budget = o.budget ?? 300;
  if (policy === "shortest") return shortest(level, W);
  let at = level.spawn.slice(), open = W.gate ? W.opens(...at) : true, gotFig = false;
  const trail = [at.slice()], visits = new Map([[key(...at), 1]]);
  const target = () => (!gotFig ? W.figC : W.elevator ? [W.elevator.x + 0.5, W.elevator.z + 0.5] : null);
  for (let i = 0; i < budget; i++) {
    const P = open ? W.Po : W.Pc;
    const nb = N4.filter(([dx, dz]) => P.step(at[0], at[1], dx, dz)).map(([dx, dz]) => [at[0] + dx, at[1] + dz]);
    if (!nb.length) break;
    const v = (c) => visits.get(key(...c)) || 0, r = (c, s) => hash(seed, c[0], c[1], i * 7 + s);
    let next;
    if (policy === "greedy") {
      const t = target();
      next = nb.map((c) => [c, Math.hypot(c[0] + 0.5 - t[0], c[1] + 0.5 - t[1]) + v(c) * 1.0 + r(c, 1) * 1e-3]).sort((a, b) => a[1] - b[1])[0][0];
    } else if (policy === "random") {
      next = nb[Math.floor(r(at, 2) * nb.length) % nb.length];
    } else {
      const fresh = (c) => { let n = 0; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (P.walkable(c[0] + a, c[1] + b) && !visits.has(key(c[0] + a, c[1] + b))) n++; return n; };
      next = nb.map((c) => [c, v(c) * 10 - fresh(c) + r(c, 3) * 1e-3]).sort((a, b) => a[1] - b[1])[0][0];
    }
    at = next;
    trail.push(at.slice());
    visits.set(key(...at), v(at) + 1);
    if (!open && W.opens(...at)) open = true;
    if (!gotFig && W.ringSet.has(key(...at))) gotFig = true;
    if (gotFig && (!W.elevator || W.elevSet.has(key(...at)))) break;
  }
  return trail;
}

export function xrayCells(level, P, cells) {
  const tall = new Map();
  for (const d of level.decor) {
    const s = CATALOG[d.t];
    if (!s || s.passable || (s.height || 1) < 1.5) continue;
    for (const c of cellsOf(d)) tall.set(key(...c), d);
  }
  return cells.filter(([x, z]) => [[1, 1], [1, 0], [0, 1]].some(([dx, dz]) => { const d = tall.get(key(x + dx, z + dz)); return d && (P.cell(x + dx, z + dz)?.h ?? 0) >= (P.cell(x, z)?.h ?? 0); }));
}

export function walkLevel(level, o = {}) {
  const seed = o.seed ?? seedOf(level.name || "level");
  const W = world(level), inMid = camera(level);
  const G = regionGraph(level, W.Po);
  const crit = shortest(level, W);
  const critNodes = new Set(crit.map((c) => G.nodeOf.get(key(...c))));
  const leaves = G.nodes.filter((n) => G.nodes.length > 1 && G.adj[n.id].size <= 1 && !critNodes.has(n.id));
  const leafOf = new Map();
  for (const n of leaves) for (const c of n.cells) leafOf.set(key(...c), n.id);
  const figTop = W.lead ? [W.figC[0], (W.Po.cell(...W.fig[0])?.h || 0) * (level.view?.tileH || 1.5) + (CATALOG[W.lead.t]?.height || 2) * 0.55, W.figC[1]] : null;
  const tileH = level.view?.tileH || 1.5;
  const out = { level: level.name, seed, critical: crit, policies: {} };
  const xr = xrayCells(level, W.Po, crit);
  let run0 = 0, worst = 0;
  const xs = new Set(xr.map((c) => key(...c)));
  for (const c of crit) { run0 = xs.has(key(...c)) ? run0 + 1 : 0; worst = Math.max(worst, run0); }
  out.xray = { cells: xr, total: xr.length, longestRun: worst };
  const optimal = Math.max(0, crit.length - 1);
  for (const p of POLICIES) {
    const trail = run(level, W, p, { seed, budget: o.budget ?? (p === "greedy" ? 150 : 300) });
    const seen = new Set(), visits = {};
    let back = 0, reversals = 0, near = null, mid = null, ring = null, elev = null, deadSteps = 0;
    const deadNodes = new Set();
    trail.forEach((c, i) => {
      const k = key(...c);
      if (seen.has(k)) back++;
      seen.add(k);
      visits[k] = (visits[k] || 0) + 1;
      if (i >= 2 && trail[i - 2][0] === c[0] && trail[i - 2][1] === c[1]) reversals++;
      if (near == null && W.fig.some((f) => cheb(f, c) <= 3)) near = i;
      if (mid == null && figTop && inMid([c[0] + 0.5, (W.Po.cell(...c)?.h || 0) * tileH + 0.4, c[1] + 0.5], figTop)) mid = i;
      if (ring == null && W.ringSet.has(k)) ring = i;
      if (ring != null && elev == null && W.elevSet.has(k)) elev = i;
      if (leafOf.has(k)) { deadSteps++; deadNodes.add(leafOf.get(k)); }
    });
    out.policies[p] = { steps: trail.length - 1, toFigureThird: mid, toFigureNear: near, toFigure: ring, toElevator: elev, backtracks: back, reversals, overOptimal: ring == null ? null : (W.elevator && elev != null ? elev : ring) - optimal, deadEndSteps: deadSteps, deadEnds: deadNodes.size, cells: seen.size, trail, visits };
  }
  out.optimal = optimal;
  out.deadEnds = leaves.map((n) => ({ id: n.id, h: n.h, kind: n.kind, cells: n.cells.length, at: n.cells[0] }));
  return out;
}

const SEQ = ["#fff5d6", "#fde08a", "#f8b44d", "#ec7b37", "#d4452f", "#a3172f", "#650a33"];
export const heat = (t) => SEQ[Math.min(SEQ.length - 1, Math.floor(Math.max(0, Math.min(1, t)) * (SEQ.length - 1) + 0.5))];

export async function heatmapPng(level, R, file, cell = 34) {
  const [Wd, Dd] = level.size, pw = Wd * cell + 20, ph = Dd * cell + 54;
  const P = prep(level), crit = R.critical, xs = new Set(R.xray.cells.map((c) => key(...c)));
  const panel = (p, ox, oy) => {
    const v = R.policies[p].visits, max = Math.max(1, ...Object.values(v));
    const parts = [`<text x="${ox + 10}" y="${oy + 22}" font-family="Helvetica" font-size="16" font-weight="bold" fill="#222">${p}</text><text x="${ox + 110}" y="${oy + 22}" font-family="Helvetica" font-size="13" fill="#444">${R.policies[p].steps} steps, figure at ${R.policies[p].toFigure ?? "never"}, backtracks ${R.policies[p].backtracks}</text>`];
    for (let z = 0; z < Dd; z++) for (let x = 0; x < Wd; x++) {
      const c = P.cell(x, z);
      if (!P.land(c)) continue;
      const n = v[key(x, z)] || 0, X = ox + 10 + x * cell, Y = oy + 34 + z * cell;
      const g = 230 - (c.h || 0) * 28;
      parts.push(`<rect x="${X}" y="${Y}" width="${cell - 1}" height="${cell - 1}" fill="${n ? heat(Math.log1p(n) / Math.log1p(max)) : `rgb(${g},${g},${g + 6})`}"/>`);
      if (!P.walkable(x, z)) parts.push(`<line x1="${X + 4}" y1="${Y + 4}" x2="${X + cell - 5}" y2="${Y + cell - 5}" stroke="#777" stroke-width="2"/>`);
      if (xs.has(key(x, z))) parts.push(`<rect x="${X + 2}" y="${Y + 2}" width="${cell - 5}" height="${cell - 5}" fill="none" stroke="#e0002a" stroke-width="3"/>`);
    }
    const pt = ([x, z]) => `${ox + 10 + (x + 0.5) * cell},${oy + 34 + (z + 0.5) * cell}`;
    if (crit.length) parts.push(`<polyline points="${crit.map(pt).join(" ")}" fill="none" stroke="#1846c8" stroke-width="4" stroke-opacity="0.85"/>`);
    parts.push(`<circle cx="${pt(level.spawn).split(",")[0]}" cy="${pt(level.spawn).split(",")[1]}" r="7" fill="#1846c8" stroke="#fff" stroke-width="2"/>`);
    for (const f of R.figure || []) parts.push(`<rect x="${ox + 10 + f[0] * cell + 6}" y="${oy + 34 + f[1] * cell + 6}" width="${cell - 13}" height="${cell - 13}" fill="none" stroke="#111" stroke-width="3"/>`);
    return parts.join("");
  };
  const width = pw * 2, height = ph * 2 + 30;
  const body = POLICIES.map((p, i) => panel(p, (i % 2) * pw, (i >> 1) * ph)).join("");
  const legend = `<text x="10" y="${height - 10}" font-family="Helvetica" font-size="13" fill="#333">${level.name}: visits light to dark (log), critical path blue, x-ray cells red, figure black, blocked cells struck, grey by height</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#faf7f0"/>${body}${legend}</svg>`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
}

export function summary(R) {
  const L = [`${R.level}  critical path ${R.optimal} steps, x-ray on route ${R.xray.total} (longest run ${R.xray.longestRun})${R.xray.cells.length ? " at " + R.xray.cells.map((c) => c.join(",")).join(" ") : ""}, dead-end leaves ${R.deadEnds.length}`];
  L.push("policy     steps  fig-third  fig<=3  fig-ring  elevator  over-opt  backtracks  reversals  dead-end steps/nodes  cells");
  for (const p of POLICIES) {
    const q = R.policies[p], f = (v) => String(v ?? "never");
    L.push(`${p.padEnd(10)} ${String(q.steps).padEnd(6)} ${f(q.toFigureThird).padEnd(10)} ${f(q.toFigureNear).padEnd(7)} ${f(q.toFigure).padEnd(9)} ${f(q.toElevator).padEnd(9)} ${f(q.overOptimal).padEnd(9)} ${String(q.backtracks).padEnd(11)} ${String(q.reversals).padEnd(10)} ${`${q.deadEndSteps}/${q.deadEnds}`.padEnd(21)} ${q.cells}`);
  }
  return L.join("\n");
}

async function live(name, R, base) {
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-qa"), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"] });
  const res = {};
  try {
    for (const p of ["shortest", "greedy"]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 900, height: 800 });
      await page.goto(`${base}/3d/index.html?level=${name}&nav=0`, { waitUntil: "load" });
      await page.waitForFunction(() => window.__done === true, { timeout: 20000, polling: 100 });
      await page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.held; }, { timeout: 8000, polling: 100 });
      await new Promise((r) => setTimeout(r, 600));
      const trail = p === "shortest" ? R.critical : R.policies[p].trail;
      let ok = 0, first = null;
      for (let i = 1; i < trail.length; i++) {
        const want = trail[i], from = trail[i - 1];
        const code = await page.evaluate(async (d) => {
          const { screenToWorldDir } = await import("/core/game.js");
          const { DIRS } = await import("/core/level.js");
          const S = window.__game.state;
          for (const [c, sd] of [["KeyW", "up"], ["KeyD", "right"], ["KeyS", "down"], ["KeyA", "left"]]) { const w = DIRS[screenToWorldDir(S.proj, sd)]; if (w[0] === d[0] && w[1] === d[1]) return c; }
          return null;
        }, [want[0] - from[0], want[1] - from[1]]);
        await page.keyboard.down(code); await new Promise((r) => setTimeout(r, 90)); await page.keyboard.up(code);
        await page.waitForFunction(() => { const a = window.__game.state.actor; return !a.path.length && !a.held && !a.moving; }, { timeout: 8000, polling: 50 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 120));
        const got = await page.evaluate(() => window.__game.state.actor.cell.slice());
        if (got[0] === want[0] && got[1] === want[1]) ok++;
        else { if (!first) first = `step ${i} wanted ${want} got ${got}`; break; }
      }
      res[p] = { steps: trail.length - 1, matched: ok, first };
      await page.close();
    }
  } finally { await browser.close(); }
  return res;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const seedArg = opt("--seed", null), budget = opt("--budget", null), outDir = opt("--out", "out/loops/walks"), liveBase = opt("--live", null);
  if (!args.length) { console.error("usage: node tools/loops/walk.mjs <level>[,<level>...] [--seed n] [--budget 300] [--out out/loops/walks] [--live http://localhost:8765]"); process.exit(2); }
  for (const name of args[0].split(",")) {
    const { level } = await loadLevel(name);
    const R = walkLevel(level, { seed: seedArg != null ? +seedArg : undefined, budget: budget != null ? +budget : undefined });
    R.figure = world(level).fig;
    const dir = path.resolve(root, outDir);
    await heatmapPng(level, R, path.join(dir, `${name}-heatmap.png`));
    if (liveBase) R.live = await live(name, R, liveBase.replace(/\/$/, ""));
    const slim = { ...R, policies: Object.fromEntries(Object.entries(R.policies).map(([k, v]) => [k, { ...v, trail: v.trail.map((c) => c.join(",")).join(" ") }])) };
    fs.writeFileSync(path.join(dir, `${name}-walks.json`), JSON.stringify(slim, null, 1) + "\n");
    const s = summary(R) + (R.live ? "\nlive replay: " + Object.entries(R.live).map(([p, v]) => `${p} ${v.matched}/${v.steps}${v.first ? " (" + v.first + ")" : ""}`).join(", ") : "");
    fs.writeFileSync(path.join(dir, `${name}-walks.txt`), s + "\n");
    console.log(s + "\n");
  }
}
