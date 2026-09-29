import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const FAUVE = {
  magenta: ["#ee4f8e", "#cf3a78", "#a82a62"],
  pink: ["#f68fb6", "#e06f9c", "#c0527e"],
  yellow: ["#ffd23a", "#f0b81e", "#cf9612"],
  orange: ["#ff8a2a", "#ec6c16", "#c9530d"],
  blue: ["#4f55d6", "#3b3fb5", "#2c2e8f"],
  teal: ["#27a888", "#1d8a6d", "#156a54"],
  lilac: ["#c9b6ea", "#b09bd6", "#8f7bb8"],
  ink: ["#2a1f33", "#21192a", "#170f1e"],
  white: ["#fffaf0", "#efe6d6", "#d7cbb6"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function cat(B, H, style, v) {
  const s = H / 2.2;
  const F = FAUVE;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.9, 0.24, style.plinthLo, style.plinthHi);
  const y0 = 0.24;
  B.rbox(0.44, 0.46, 0.7, 0.08, pal(F.magenta), -0.24, y0, -0.12);
  B.rbox(0.44, 0.46, 0.7, 0.08, pal(F.yellow), 0.24, y0, -0.12);
  B.box(0.2, 0.14, 0.26, pal(F.orange), -0.26, y0, 0.3);
  B.box(0.2, 0.14, 0.26, pal(F.orange), 0.26, y0, 0.3);
  B.rbox(0.36, 0.52, 0.34, 0.06, pal(F.magenta), -0.14, y0 + 0.14, 0.12);
  B.rbox(0.36, 0.52, 0.34, 0.06, pal(F.yellow), 0.16, y0 + 0.14, 0.12);
  B.box(0.14, 0.44, 0.14, pal(F.pink), -0.16, y0 + 0.02, 0.28);
  B.box(0.14, 0.44, 0.14, pal(F.orange), 0.16, y0 + 0.02, 0.28);
  B.rbox(0.62, 0.4, 0.5, 0.08, pal(F.orange), 0, y0 + 0.66, 0.04);
  wedge(B, 0.62, 0.16, 0.2, F.teal, 0, y0 + 0.66, 0.34);
  B.rbox(0.44, 0.22, 0.3, 0.05, pal(F.yellow), 0.02, y0 + 1.02, 0.02);
  B.box(0.18, 0.14, 0.18, pal(F.blue), 0.5, y0, -0.32);
  B.box(0.16, 0.14, 0.34, pal(F.teal), 0.56, y0, -0.02);
  B.box(0.14, 0.12, 0.3, pal(F.orange), 0.46, y0, 0.28);
  B.box(0.12, 0.1, 0.14, pal(F.magenta), 0.34, y0, 0.46);
  const hy = y0 + 1.2;
  B.at(0, hy, 0.08, 0.38 + (v % 2) * 0.1, () => {
    B.rbox(0.36, 0.5, 0.52, 0.08, pal(F.blue), -0.19, 0, 0);
    B.rbox(0.36, 0.5, 0.52, 0.08, pal(F.magenta), 0.17, 0, 0);
    B.rbox(0.18, 0.36, 0.54, 0.05, pal(F.yellow), 0.04, 0.12, 0.01);
    B.box(0.46, 0.2, 0.2, pal(F.yellow), 0.02, 0.02, 0.3);
    B.box(0.24, 0.16, 0.14, pal(F.orange), -0.12, 0.02, 0.33);
    B.box(0.14, 0.1, 0.1, pal(F.lilac), 0.0, 0.16, 0.4);
    B.box(0.2, 0.08, 0.06, pal(F.ink), 0.02, 0.0, 0.41);
    B.box(0.03, 0.05, 0.03, pal(F.white), -0.05, 0.03, 0.44);
    B.box(0.03, 0.05, 0.03, pal(F.white), 0.09, 0.03, 0.44);
    for (const [x, c] of [[-0.14, F.yellow], [0.18, F.yellow]]) {
      B.box(0.13, 0.11, 0.04, pal(c), x, 0.27, 0.26);
      B.box(0.04, 0.09, 0.03, pal(F.ink), x, 0.28, 0.28);
    }
    B.cone(0.15, 0, 0.34, pal(F.orange), -0.2, 0.46, -0.04, 4);
    B.cone(0.07, 0, 0.18, pal(F.blue), -0.2, 0.66, -0.04, 4);
    B.cone(0.15, 0, 0.36, pal(F.pink), 0.2, 0.46, -0.04, 4);
    B.cone(0.07, 0, 0.18, pal(F.yellow), 0.2, 0.68, -0.04, 4);
  });
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|fang/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|cushion|crag/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, ["#9d8fa6", "#847790", "#655a70"]), plinthHi: pick(dt, 1, ["#c7b9cf", "#a799b0", "#85778f"]) };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = p.role;
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" ? false : !!p.passable, variants: 2, height: role === "lead" ? Math.min(3, Math.max(2.6, p.height || 2.6)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, FAUVE.orange), c1 = pick(tn, 1, FAUVE.yellow), c2 = pick(tn, 2, FAUVE.magenta);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead" || role === "creature") cat(B, H, look, v);
      else if (role === "threshold") {
        B.box(0.44, 0.24, 0.44, pal(c0));
        B.box(0.3, H * 0.62, 0.3, pal(c1), 0, 0.24, 0);
        B.box(0.36, 0.14, 0.36, pal(c2), 0, 0.24 + H * 0.62, 0);
        const top = 0.38 + H * 0.62;
        B.cone(0.13, 0, 0.3, pal(FAUVE.orange), -0.08, top, 0, 4);
        B.cone(0.13, 0, 0.3, pal(FAUVE.pink), 0.08, top, 0, 4);
        if (d.side) {
          const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(H * 0.7, 0.14, c2);
          beam(H * 0.7 + 0.2, 0.08, FAUVE.blue);
        }
      } else if (role === "dais") {
        plinth(B, 0.42, H, c0, c1);
      } else if (role === "light") {
        B.box(0.24, 0.12, 0.24, pal(c0));
        B.box(0.1, H - 0.5, 0.1, pal(c0), 0, 0.12, 0);
        B.box(0.28, 0.06, 0.28, pal(c2), 0, H - 0.4, 0);
        B.box(0.2, 0.22, 0.2, pal(P.flame || FAUVE.yellow), 0, H - 0.34, 0);
        B.cone(0.2, 0, 0.14, pal(c2), 0, H - 0.12, 0, 4);
      } else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(c2), 0, H * 0.55, 0, 8);
        const k = v % 2 ? FAUVE.teal : FAUVE.yellow;
        B.box(0.16, 0.16, 0.16, pal(k), -0.05, H * 0.55, 0.02);
        B.box(0.12, 0.2, 0.12, pal(c1), 0.07, H * 0.55, -0.04);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.62, 0.48, 0.34] : [0.56, 0.44, 0.3];
        const hh = (H - 0.3) / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c2][i % 3]), (i % 2 ? 0.04 : -0.03), i * hh, (i % 2 ? -0.03 : 0.03)));
        B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, H - 0.3, 0, 4);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

export function finish(level, brief, h) {
  if (level.name === "cat-1") return home(level, brief, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  let r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.55 }) : null;
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  h.repair({ keep: [gateT] });
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const hash = (x, z) => (x * 73856093 ^ z * 19349663) >>> 0;
const voidAt = (h, x, z) => { const q = h.cell(x, z); return !q || q.s === "none"; };
const walled = (h, x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return n && n.h > h.cell(x, z).h; });
const isTree = (t) => /tree|pine/.test(t);

function grow(h, want) {
  for (let pass = 0; pass < 60 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N4.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length + ((x * 7 + z * 5) % 3) * 0.3;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground });
  }
}

function jag(level, h, floor) {
  const sp = level.spawn || [-9, -9];
  let cut = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || Math.abs(x - sp[0]) + Math.abs(z - sp[1]) <= 1) continue;
    const nv = N4.filter(([a, b]) => voidAt(h, x + a, z + b)).length;
    if (!nv || !(nv >= 2 || hash(x, z) % 3 === 0)) continue;
    if (N4.some(([a, b]) => h.cell(x + a, z + b)?.s === "ramp")) continue;
    const b0 = h.reach(), saved = { ...c }, dec = level.decor.slice();
    h.clear(x, z);
    h.set(x, z, { h: 0, s: "none" });
    const r = h.reach();
    if (r.missing.length > b0.missing.length || r.reached < floor || r.reached < b0.reached - 1) { h.set(x, z, saved); level.decor.splice(0, level.decor.length, ...dec); } else cut++;
  }
  h.log.push(`jag: -${cut}`);
}

function moveSpawn(level, h, lo, hi) {
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || walled(h, x, z) || [-1, 0].some((b) => voidAt(h, x + 1, z + b))) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo || q.length > hi) continue;
    const sc = q.length + 0.5 * (x + z);
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { level.spawn = [best[1], best[2]]; h.log.push(`spawn moved to ${best[1]},${best[2]}`); } else h.log.push(`spawn kept: no approach of ${lo} to ${hi}`);
}

function pruneRamps(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp" || on.has(h.key(x, z))) continue;
    const [dx, dz] = h.DIRS[c.d], lo = h.cell(x + dx, z + dz);
    if (!h.land(lo)) continue;
    const old = { ...c }, before = h.reach().missing.length;
    h.set(x, z, { h: lo.h, s: lo.s === "stone" ? "grass" : lo.s });
    if (h.reach().missing.length > before) h.set(x, z, old); else n++;
  }
  if (n) h.log.push(`pruneRamps: ${n}`);
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    const lo = level.cells[z + dz]?.[x + dx], soft = ["sand", "grass", "dirt"];
    if (up && soft.includes(up.s)) c.m = up.s;
    else if (lo && soft.includes(lo.s)) c.m = lo.s;
    else c.m = soft.includes(h.surf.raised) ? h.surf.raised : "sand";
  }));
}

function trees(level, h, route, max) {
  const near = (d, k) => route.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= k);
  const fig = (d) => h.figure.cells.some(([x, z]) => Math.abs(x - d.x) <= 2 && Math.abs(z - d.z) <= 2);
  const front = (d) => { const c = h.cell(d.x, d.z); return [[1, 0], [0, 1], [1, 1]].some(([a, b]) => { const n = h.cell(d.x + a, d.z + b); return !h.land(n) || n.h < c.h - 1 || (n.h > c.h && n.s !== "ramp"); }); };
  const hides = (d) => route.some(([x, z]) => x <= d.x && z <= d.z && d.x - x + d.z - z <= 4);
  h.removeDecor((d) => isTree(d.t) && (near(d, 1) || fig(d) || front(d) || hides(d)));
  const left = level.decor.filter((d) => isTree(d.t)).sort((a, b) => (a.x + a.z) - (b.x + b.z) || hash(a.x, a.z) - hash(b.x, b.z));
  const drop = new Set(left.filter((d, i) => i % 2 === 1 || i >= max * 2).slice(0, Math.max(0, left.length - max)));
  h.removeDecor((d) => drop.has(d));
}

function moreLights(level, h, t, route, want) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  const lit = () => level.decor.filter((d) => d.t === t);
  for (const [x, z] of route) {
    if (lit().length >= want) break;
    for (const [a, b] of N4) {
      const X = x + a, Z = z + b, c = h.cell(X, Z);
      if (!h.land(c) || c.s === "ramp" || on.has(h.key(X, Z)) || h.decorAt(X, Z).length || c.h !== h.cell(x, z).h) continue;
      if (N4.some(([p, q]) => h.cell(X + p, Z + q)?.s === "ramp")) continue;
      if (h.figure.cells.some(([fx, fz]) => Math.abs(fx - X) <= 2 && Math.abs(fz - Z) <= 2)) continue;
      if (lit().some((d) => Math.abs(d.x - X) + Math.abs(d.z - Z) < 3)) continue;
      if (h.put(t, X, Z)) break;
    }
  }
}

function repaint(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s !== "stone" || on.has(h.key(x, z)) || h.isFig(x, z) || hash(x, z) % 7 === 0) continue;
    c.s = c.h >= 2 ? "sand" : "grass";
    n++;
  }
  if (n) h.log.push(`repaint: ${n} stone cells off the approach`);
}

function home(level, brief, h) {
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type || m.name).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  grow(h, 84);
  let r = h.approach();
  if (r.length < 12 || walled(h, ...level.spawn)) { moveSpawn(level, h, 12, 22); r = h.approach(); }
  jag(level, h, 84);
  r = h.approach();
  if (r.length) h.path(r);
  r = h.approach();
  pruneRamps(level, h, r);
  r = h.approach();
  trees(level, h, r, 6);
  h.repair();
  repaint(level, h, h.approach());
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && !posts().some((d) => h.cell(d.x, d.z).s === "ramp") && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.55, 0.45, 0.65, 0.35, 0.75]) if (!g) g = tryGate(frac, strict);
  h.lights(lightT, { route: h.approach(), every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  moreLights(level, h, lightT, h.approach(), 4);
  h.repair({ keep: [gateT] });
  const bad = () => posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length > 0;
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  rampTone(level, h);
  h.log.push(`approach ${h.approach().length} posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}
