import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const HOT = {
  coal: ["#2e1a10", "#24140b", "#170c06"],
  soot: ["#42210c", "#361a09", "#261209"],
  hide: ["#8e3a1a", "#742e14", "#5a220d"],
  rust: ["#b0521f", "#933f16", "#733010"],
  brow: ["#724012", "#5c320d", "#452509"],
  horn: ["#7a5530", "#5e3f22", "#432c16"],
  hornDark: ["#5a3c1e", "#452d16", "#30200f"],
  skull: ["#a6601c", "#8a4c14", "#6c3a0e"],
  hornTip: ["#c7a46a", "#a8854e", "#836434"],
  red: ["#e2461c", "#c13612", "#98280b"],
  orange: ["#ff8824", "#e86c10", "#c4560a"],
  amber: ["#f7aa2d", "#e08e18", "#bb7010"],
  yellow: ["#fec632", "#eeae1a", "#cf9010"],
  pale: ["#fff0a8", "#ffde70", "#f4c448"],
  bone: ["#f0d4ad", "#d9b98e", "#b89770"],
  ink: ["#140a05", "#100804", "#0a0502"],
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

function tongue(B, r, h, c, x, y, z, lean = 0) {
  if (!lean) return B.cone(r, 0, h, pal(c), x, y, z, 4);
  B.rot([0, 0, 1], lean, x, y, z);
  B.cone(r, 0, h, pal(c), 0, 0, 0, 4);
  B.pop();
}

function horn(B, side) {
  const segs = [[0.5, 0.62, 0.26, 0.24, 0.4, HOT.horn], [0.7, 0.62, 0.24, 0.22, -0.3, HOT.horn], [0.84, 0.46, 0.2, 0.22, -0.9, HOT.hornDark], [0.86, 0.24, 0.17, 0.2, -1.4, HOT.hornDark]];
  for (const [x, y, w, h, a, c] of segs) {
    B.rot([0, 0, 1], side * a, side * x, y, -0.02);
    B.box(w, h, w, pal(c), 0, -h / 2, 0);
    B.pop();
  }
  B.rot([0, 0, 1], side * -2.7, side * 0.8, 0.14, -0.02);
  B.cone(0.08, 0, 0.2, pal(HOT.hornTip), 0, 0, 0, 4);
  B.pop();
}

function spirit(B, H, look, v) {
  const s = H / 2.6;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.94, 0.2, look.plinthLo, look.plinthHi);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    B.box(0.14, 0.08, 0.14, pal(i % 2 ? HOT.orange : HOT.yellow), Math.cos(a) * 0.7, 0.2, Math.sin(a) * 0.7);
  }
  const y0 = 0.2;
  B.at(0, y0, 0.06, 0.18, () => {
    B.rbox(0.62, 0.3, 0.5, 0.06, pal(HOT.brow), 0, 0, 0.02);
    B.box(0.26, 0.34, 0.2, pal(HOT.pale), 0, 0.02, 0.26);
    B.box(0.16, 0.14, 0.1, pal(HOT.yellow), 0, 0, 0.4);
    for (const x of [-0.24, -0.1, 0.1, 0.24]) B.cone(0.045, 0, 0.14, pal(HOT.bone), x, 0.3, 0.24, 4);
    for (const x of [-0.2, 0.2]) B.cone(0.04, 0, 0.12, pal(HOT.bone), x, 0.02, 0.26, 4);
    B.rbox(0.9, 0.46, 0.7, 0.1, pal(HOT.skull), 0, 0.3, -0.04);
    B.box(0.7, 0.1, 0.12, pal(HOT.brow), 0, 0.3, 0.3);
    for (const x of [-0.2, 0.2]) {
      B.box(0.24, 0.18, 0.06, pal(HOT.ink), x, 0.46, 0.31);
      B.box(0.12, 0.08, 0.05, pal(HOT.yellow), x, 0.5, 0.34);
    }
    B.box(0.12, 0.12, 0.08, pal(HOT.ink), 0, 0.36, 0.33);
    wedge(B, 0.8, 0.14, 0.18, HOT.rust, 0, 0.66, 0.28);
    horn(B, -1);
    horn(B, 1);
  });
  const fy = 0.96;
  B.cyl(0.5, 0.12, pal(HOT.red), 0, fy, 0.02, 7);
  B.cone(0.56, 0.3, 0.36, pal(HOT.orange), 0, fy + 0.12, 0.02, 7);
  for (const [x, z, r, h, c, l] of [[-0.5, 0.12, 0.13, 0.5, HOT.orange, 0.4], [0.5, 0.1, 0.13, 0.54, HOT.amber, -0.4], [-0.34, -0.28, 0.11, 0.56, HOT.red, 0.25], [0.34, -0.26, 0.11, 0.5, HOT.orange, -0.25], [-0.26, 0.36, 0.11, 0.4, HOT.yellow, 0.3], [0.28, 0.34, 0.11, 0.44, HOT.amber, -0.3], [0, -0.36, 0.12, 0.6, HOT.red, 0]]) tongue(B, r, h, c, x, fy + 0.06, z, l);
  B.cone(0.38, 0.18, 0.4, pal(HOT.amber), 0, fy + 0.48, 0.02, 7);
  B.box(0.3, 0.84, 0.26, pal(HOT.yellow), 0, fy + 0.26, 0.1);
  B.box(0.16, 0.84, 0.12, pal(HOT.pale), 0, fy + 0.28, 0.22);
  for (const [x, y, c] of [[-0.22, 1.3, HOT.orange], [0.22, 1.26, HOT.amber]]) tongue(B, 0.1, 0.32, c, x, y, 0.16, -x);
  const hy = fy + 1.02;
  B.at(0, hy, 0.02, 0.38 + (v % 2) * 0.08, () => {
    B.rbox(0.36, 0.3, 0.32, 0.05, pal(HOT.hide), 0, -0.26, -0.06);
    B.rbox(0.6, 0.4, 0.52, 0.08, pal(HOT.hide), 0, 0, -0.04);
    B.box(0.42, 0.12, 0.34, pal(HOT.rust), 0, 0.0, 0.3);
    B.box(0.2, 0.12, 0.16, pal(HOT.pale), 0, 0.0, 0.34);
    wedge(B, 0.4, 0.18, 0.36, HOT.rust, 0, 0.12, 0.3);
    B.box(0.3, 0.06, 0.08, pal(HOT.bone), 0, 0.1, 0.44);
    for (const x of [-0.15, 0.15]) {
      B.box(0.14, 0.06, 0.05, pal(HOT.yellow), x, 0.26, 0.21);
      B.box(0.04, 0.06, 0.03, pal(HOT.ink), x, 0.26, 0.24);
      wedge(B, 0.18, 0.07, 0.12, HOT.brow, x, 0.32, 0.18);
    }
    for (const [x, z, h, c, l] of [[0, -0.1, 0.62, HOT.hide, 0], [-0.16, -0.04, 0.5, HOT.rust, 0.3], [0.16, -0.04, 0.5, HOT.hide, -0.3], [-0.3, -0.12, 0.4, HOT.brow, 0.65], [0.3, -0.12, 0.4, HOT.rust, -0.65], [0, -0.28, 0.44, HOT.brow, 0], [-0.3, 0.08, 0.24, HOT.brow, 1.1], [0.3, 0.08, 0.24, HOT.brow, -1.1]]) tongue(B, 0.09, h, c, x, 0.34, z, l);
  });
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|nest/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, HOT.coal), plinthHi: HOT.soot };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const lead = role === "lead" || role === "creature";
    catalog[t] = { footprint: lead ? [2, 2] : role === "threshold" ? [1, 1] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? Math.min(3, Math.max(2.7, p.height || 2.7)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, HOT.soot), c1 = pick(tn, 1, HOT.brow);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) spirit(B, H, look, v);
      else if (role === "threshold") {
        const ph = H * 0.66;
        B.box(0.5, 0.22, 0.5, pal(HOT.coal));
        B.box(0.36, ph * 0.55, 0.36, pal(c0), 0, 0.22, 0);
        B.box(0.3, ph * 0.45, 0.3, pal(c1), 0.02, 0.22 + ph * 0.55, -0.01);
        const top = 0.22 + ph;
        B.box(0.42, 0.12, 0.42, pal(HOT.yellow), 0, top, 0);
        B.box(0.34, 0.14, 0.34, pal(HOT.soot), 0, top + 0.12, 0);
        for (const sx of [-1, 1]) {
          B.box(0.12, 0.12, 0.12, pal(HOT.horn), sx * 0.24, top + 0.16, 0);
          B.box(0.1, 0.14, 0.1, pal(HOT.horn), sx * 0.32, top + 0.28, 0);
          B.cone(0.06, 0, 0.16, pal(HOT.hornTip), sx * 0.34, top + 0.42, 0, 4);
        }
        B.cone(0.16, 0, 0.3, pal(HOT.orange), 0, top + 0.26, 0, 4);
        B.cone(0.09, 0, 0.2, pal(HOT.yellow), 0.02, top + 0.26, 0.04, 4);
        if (d.side) {
          const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(ph * 0.92, 0.16, HOT.soot);
          beam(ph * 0.92 + 0.16, 0.08, HOT.orange);
        }
      } else if (role === "dais") {
        plinth(B, 0.42, H, c0, HOT.soot);
        B.cyl(0.26, 0.08, pal(HOT.orange), 0, H, 0, 8);
      } else if (role === "light") {
        B.box(0.28, 0.14, 0.28, pal(HOT.coal));
        B.box(0.14, H - 0.6, 0.14, pal(c0), 0, 0.14, 0);
        B.cyl(0.2, 0.14, pal(HOT.soot), 0, H - 0.46, 0, 6);
        B.cone(0.17, 0, 0.32, pal(HOT.orange), 0, H - 0.32, 0, 4);
        B.cone(0.09, 0, 0.22, pal(HOT.yellow), 0.02, H - 0.32, 0.03, 4);
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.5, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.06, pal(HOT.soot), 0, H * 0.5, 0, 8);
        B.box(0.14, 0.12, 0.14, pal(v % 2 ? HOT.orange : HOT.yellow), -0.05, H * 0.5 + 0.06, 0.02);
        B.box(0.1, 0.14, 0.1, pal(HOT.amber), 0.07, H * 0.5 + 0.06, -0.04);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.66, 0.5, 0.36] : [0.6, 0.46, 0.32];
        const hh = (H - 0.34) / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal(i % 2 ? c1 : c0), (i % 2 ? 0.04 : -0.03), i * hh, (i % 2 ? -0.03 : 0.03)));
        B.cone(segs[2] * 0.7, 0, 0.34, pal(v % 2 ? HOT.orange : c1), 0, H - 0.34, 0, 4);
        B.box(0.08, 0.3, 0.02, pal(HOT.orange), 0.12, hh * 0.5, segs[0] / 2 + 0.01);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

function resurface(level, h) {
  const cells = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c)) cells.push([x, z, c]); }
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length / Math.max(1, cells.length) <= 0.3) return;
  const sf = h.surf || {};
  const repl = [sf.ground, sf.raised].find((t) => t && t !== "stone") || "grass";
  const near = (x, z) => h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 1);
  for (const [x, z, c] of stone) if (!near(x, z) && (x * 7 + z * 13) % 6 !== 0) c.s = repl;
  h.log.push(`resurface: ${stone.length} stone of ${cells.length} land to ${repl}, accents kept`);
}

function dropPuddles(level, h) {
  const seen = new Set();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    if (seen.has(h.key(x, z)) || h.cell(x, z)?.s !== "water") continue;
    const comp = [], st = [[x, z]];
    seen.add(h.key(x, z));
    while (st.length) {
      const [a, b] = st.pop();
      comp.push([a, b]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = h.key(a + dx, b + dz);
        if (!seen.has(k) && h.cell(a + dx, b + dz)?.s === "water") { seen.add(k); st.push([a + dx, b + dz]); }
      }
    }
    if (comp.length >= 6) continue;
    for (const [a, b] of comp) h.set(a, b, { h: 0, s: "none" });
    h.log.push(`dropPuddles: ${comp.length} stray water cells to void`);
  }
}

function torches(level, h, r, t, g) {
  const onRoute = new Set(r.map(([x, z]) => h.key(x, z)));
  const far = (x, z) => h.figure.cells.every(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) > 1);
  let n = 0, last = -9;
  for (let i = 1; i < r.length && n < 4; i++) {
    if (i - last < 3) continue;
    const [x, z] = r[i];
    if (g && Math.abs(g[0] - x) + Math.abs(g[1] - z) <= 1) continue;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const a = x + dx, b = z + dz, c = h.cell(a, b);
      if (onRoute.has(h.key(a, b)) || !h.land(c) || c.s === "ramp" || h.decorAt(a, b).length || !far(a, b)) continue;
      const miss0 = h.reach().missing.length;
      if (!h.put(t, a, b)) continue;
      if (h.reach().missing.length > miss0) { level.decor.pop(); continue; }
      n++; last = i;
      break;
    }
  }
  h.log.push(`torches ${t} x${n}`);
}

export function finish(level, brief, h) {
  resurface(level, h);
  dropPuddles(level, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "torch";
  h.removeDecor((d) => d.t === gateT || (d.t === lightT && !!level.palette?.props?.[lightT]));
  let r = h.approach();
  if (r.length < 7) {
    const [ax, az] = h.figure.anchor;
    let best = null;
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
      const c = h.cell(x, z);
      if (!h.land(c) || c.h !== 1 || c.s === "ramp" || h.decorAt(x, z).length) continue;
      const sc = Math.abs(x - ax) + Math.abs(z - az) + (z - x) * 0.1;
      if (!best || sc > best[2]) best = [x, z, sc];
    }
    if (best) {
      level.spawn = [best[0], best[1]];
      h.log.push(`spawn moved to ${best[0]},${best[1]}`);
      r = h.approach();
    }
  }
  if (r.length) h.path(r);
  r = h.approach();
  let g = null;
  for (const frac of [0.55, 0.4, 0.7, 0.25, 0.85]) if (!g && gateT) g = h.gate(gateT, { route: r, frac, figGap: 1 });
  if (g) h.removeDecor((d) => /^tree/.test(d.t) && d.x - g[0] >= -1 && d.x - g[0] <= 2 && d.z - g[1] >= -1 && d.z - g[1] <= 2);
  if (!h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] })) torches(level, h, r, lightT, g);
  const lit = level.decor.filter((d) => d.t === lightT || d.t === "torch" || d.t === "lantern");
  const dr = (d) => Math.min(...r.map(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z)));
  const drop = lit.sort((a, b) => dr(a) - dr(b)).slice(6);
  if (drop.length) h.removeDecor((d) => drop.includes(d));
  h.repair({ keep: [gateT] });
}
