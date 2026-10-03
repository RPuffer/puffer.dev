import fs from "node:fs";
import path from "node:path";
import { registerCatalog } from "../../core/catalog.js";
import { analyse, BANDS, SINGLETON_MAX, TYPE_MAX } from "../../pipeline/a-transcribe/finish-cluster.mjs";

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

export async function loadLevel(name, o = {}) {
  const file = path.join(root, "levels", `${name}.json`);
  const level = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const p of level.pieces || []) {
    const mod = await import(path.join(root, "3d", p));
    if (mod.register) registerCatalog(mod.register({ palette: level.palette || {} }).catalog);
  }
  const briefPath = o.brief || path.join(root, "pipeline/seed/concepts", `${name}.json`);
  const brief = fs.existsSync(briefPath) ? JSON.parse(fs.readFileSync(briefPath, "utf8")) : null;
  return { file, level, brief };
}

const f2 = (v) => (v == null ? "n/a" : v.toFixed(2));
const mark = (ok) => (ok ? "pass" : "FAIL");
const inBand = (v, [lo, hi]) => v == null || (v >= lo && v <= hi);

export function rows(m) {
  const out = [];
  for (const zn of ["figure", "threshold", "approach", "rim", "all"]) {
    const v = m.density[zn], n = zn === "all" ? m.walk : m.zones[zn];
    out.push([`density ${zn}`, `${f2(v)} (${n} cells)`, `${BANDS[zn][0]}-${BANDS[zn][1]}`, v == null ? "n/a" : mark(inBand(v, BANDS[zn]))]);
  }
  out.push(["singleton share", `${f2(m.singletonShare)} (${m.singletons}/${m.props})`, `< ${SINGLETON_MAX}`, mark(m.singletonShare < SINGLETON_MAX)]);
  out.push(["top type share", `${f2(m.typeShare)} ${Object.entries(m.types).map(([t, n]) => `${t} ${n}`).join(", ")}`, `<= ${TYPE_MAX}`, mark(m.typeShare <= TYPE_MAX)]);
  out.push(["rim density <= figure court", `${f2(m.density.rim)} vs ${f2(m.density.figure)}`, "", m.density.figure == null ? "n/a" : mark(!m.rimOverFigure)]);
  out.push(["one-type clusters", `${m.mono}`, "0", mark(!m.mono)]);
  out.push(["clusters", `${m.clusters} (${m.multi} of 2+, largest ${m.largest})`, "", ""]);
  out.push(["mean cluster spacing", m.spacing == null ? "n/a" : `${m.spacing.toFixed(2)} cells`, "", ""]);
  out.push(["same-family share (3+)", f2(m.similar), ">= 0.67", m.similar == null ? "n/a" : mark(m.similar >= 2 / 3)]);
  out.push(["trail gap on approach", `${m.trailGap} route cells`, "<= 3", mark(m.trailGap <= 3)]);
  out.push(["prop-to-surface fit", m.fit.length ? m.fit.join("; ") : "0 mismatches", "0", mark(!m.fit.length)]);
  const beats = m.beats.length ? `${m.beats.filter((b) => b.ok).length}/${m.beats.length}` : "n/a";
  out.push(["story beats on route", beats + (m.beats.filter((b) => !b.ok).length ? " missing: " + m.beats.filter((b) => !b.ok).map((b) => b.phrase.trim().slice(0, 40)).join(", ") : ""), "all", m.beats.length ? mark(m.beats.every((b) => b.ok)) : "n/a"]);
  out.push(["route / reach / x-ray run", `${m.route} steps, ${m.reach}, ${m.xrayRun}`, "", m.missing ? "FAIL" : "pass"]);
  if (m.edgeRatio != null) out.push(["figure vs rim edge ratio", f2(m.edgeRatio), "> 1.2", mark(m.edgeRatio > 1.2)]);
  return out;
}

export function table(m) {
  return rows(m).map((r) => r.map((c, i) => String(c).padEnd([28, 46, 10, 4][i])).join(" ")).join("\n");
}

export { analyse };
