import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { placeLandmark } from "./multitile-themed-a.js";
import { placeGeneric } from "./multitile-place.js";
import { bakeParts } from "../../pipeline/a-transcribe/parts.js";

const INK = {
  espresso: ["#6e3527", "#57281c", "#401c14"],
  umber: ["#9a4a2e", "#7d3a22", "#5f2b19"],
  rust: ["#f06a3c", "#d6532a", "#b3401e"],
  cream: ["#fff3dc", "#f0dfc0", "#d8c29c"],
  sand: ["#f6d49a", "#e3b876", "#c79a58"],
  gold: ["#ffc93a", "#f0aa1e", "#cf8a12"],
  ink: ["#2a1712", "#22120e", "#180c09"],
  moss: ["#7cc65a", "#5fa845", "#468535"],
  mint: ["#8fe0b0", "#6cc594", "#4fa377"],
  amber: ["#ffb347", "#f0922a", "#cf7418"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function otri(B, a, b, c, out, p) {
  const n = V().subVectors(b, a).cross(V().subVectors(c, a));
  if (n.dot(out) < 0) B.tri(a.toArray(), c.toArray(), b.toArray(), p);
  else B.tri(a.toArray(), b.toArray(), c.toArray(), p);
}

function slab(B, pts, o, U, W, t, c) {
  const u = U.clone().normalize(), w0 = W.clone().normalize();
  const N = V().crossVectors(u, w0).normalize();
  const w = V().crossVectors(N, u).normalize();
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const [a, b] = pts[i], [c2, d] = pts[(i + 1) % pts.length]; area += a * d - c2 * b; }
  const P = area < 0 ? [...pts].reverse() : pts;
  const at = (p, s) => o.clone().addScaledVector(u, p[0]).addScaledVector(w, p[1]).addScaledVector(N, s * t / 2);
  const f = P.map((p) => at(p, 1)), k = P.map((p) => at(p, -1));
  const p = pal(c), nN = N.clone().negate();
  for (let i = 1; i < P.length - 1; i++) { otri(B, f[0], f[i], f[i + 1], N, p); otri(B, k[0], k[i], k[i + 1], nN, p); }
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    const e = V().subVectors(f[j], f[i]);
    const out = V().crossVectors(e, N);
    otri(B, f[i], f[j], k[j], out, p);
    otri(B, f[i], k[j], k[i], out, p);
  }
}

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

const BLADE = [[0, -0.14], [0.2, 0.14], [0.6, 0.16], [1.0, 0.04], [0.98, -0.02], [0.6, -0.12], [0.2, -0.18]];
const STRIPE = [[0.12, 0.02], [0.55, 0.06], [0.85, 0.02], [0.55, -0.02], [0.12, -0.04]];
const TAIL = [[0, -0.12], [0.4, -0.07], [1.0, 0.0], [0.45, 0.06], [0, 0.12]];

const POSES = {
  rest: { wing: [0.3, 1.0, -0.62], wLen: 1.0, wFlat: [0, 0.3, 1], tail: [0.26, -0.28, -1], tLen: 0.85, head: -0.35 },
  statue: { wing: [0.22, 1.0, -0.4], wLen: 1.0, wFlat: [0, 0.2, 1], tail: [0.22, -0.4, -1], tLen: 0.8, head: -0.3 },
  flare: { wing: [0.75, 1.0, -0.25], wLen: 1.1, wFlat: [0, 0.4, 1], tail: [0.4, -0.2, -1], tLen: 0.85, head: -0.4 },
};

function swallow(B, pose) {
  const Q = POSES[pose];
  B.box(0.46, 0.22, 0.5, pal(INK.cream), 0, 0, 0.06);
  B.box(0.4, 0.2, 0.46, pal(INK.espresso), 0, 0.22, 0.02);
  wedge(B, 0.46, 0.22, 0.22, INK.cream, 0, 0, 0.42);
  B.box(0.3, 0.26, 0.34, pal(INK.espresso), 0, 0.12, -0.34);
  B.box(0.26, 0.1, 0.3, pal(INK.cream), 0, 0.04, -0.32);
  B.box(0.34, 0.16, 0.08, pal(INK.rust), 0, 0.22, 0.31);
  for (const s of [-1, 1]) {
    const root = V(s * 0.16, 0.34, 0.02);
    const U = V(s * Q.wing[0], Q.wing[1], Q.wing[2]);
    const W = V(s * Q.wFlat[0], Q.wFlat[1], Q.wFlat[2]);
    slab(B, BLADE.map(([a, b]) => [a * Q.wLen, b]), root, U, W, 0.1, INK.espresso);
    slab(B, STRIPE.map(([a, b]) => [a * Q.wLen, b]), root.clone().add(V(s * 0.03, 0.02, 0)), U, W, 0.12, INK.cream);
    slab(B, TAIL.map(([a, b]) => [a * Q.tLen, b]), V(s * 0.08, 0.18, -0.48), V(s * Q.tail[0], Q.tail[1], Q.tail[2]), V(1, 0, 0.2 * s), 0.08, s < 0 ? INK.espresso : INK.umber);
  }
  B.at(0, 0.36, 0.3, Q.head, () => {
    B.rbox(0.36, 0.3, 0.36, 0.06, pal(INK.espresso), 0, 0, 0);
    B.box(0.3, 0.16, 0.12, pal(INK.rust), 0, 0.0, 0.14);
    B.box(0.24, 0.1, 0.1, pal(INK.cream), 0, 0.0, 0.2);
    slab(B, [[0, -0.08], [0.34, 0], [0, 0.08]], V(0, 0.15, 0.2), V(0, -0.08, 1), V(0, 1, 0), 0.16, INK.gold);
    for (const s of [-1, 1]) {
      B.box(0.03, 0.14, 0.14, pal(INK.cream), s * 0.18, 0.1, 0.05);
      B.box(0.03, 0.08, 0.08, pal(INK.ink), s * 0.19, 0.13, 0.07);
      B.box(0.03, 0.03, 0.03, pal(INK.cream), s * 0.2, 0.17, 0.08);
    }
    B.box(0.12, 0.08, 0.26, pal(INK.umber), 0, 0.3, -0.02);
  });
}

function perch(B, pose, lo, hi, post) {
  if (pose === "rest") {
    B.prism(circle(0, 0, 0.9, 0.8, 8, Math.PI / 8), 0, 0.16, pal(lo));
    B.box(0.4, 0.4, 0.4, pal(post), 0, 0.16, 0);
    B.prism(circle(0, 0, 0.62, 0.54, 8, Math.PI / 8), 0.56, 0.7, pal(hi));
    B.prism(circle(0, 0, 0.52, 0.44, 8, Math.PI / 8), 0.7, 0.78, pal(INK.sand));
    return 0.74;
  }
  if (pose === "statue") {
    B.prism(circle(0, 0, 0.92, 0.92, 8, Math.PI / 8), 0, 0.2, pal(lo));
    B.prism(circle(0, 0, 0.72, 0.72, 8, Math.PI / 8), 0.2, 0.42, pal(hi));
    B.box(0.56, 0.2, 0.56, pal(lo), 0, 0.42, 0);
    B.box(0.7, 0.1, 0.7, pal(hi), 0, 0.62, 0);
    return 0.72;
  }
  B.prism(circle(0, 0, 0.86, 0.86, 6, Math.PI / 6), 0, 0.3, pal(lo));
  B.prism(circle(0, 0, 0.44, 0.44, 6, Math.PI / 6), 0.3, 0.62, pal(post));
  B.prism(circle(0, 0, 0.56, 0.56, 6, Math.PI / 6), 0.62, 0.74, pal(hi));
  return 0.74;
}

function lead(B, H, look, pose) {
  const s = H / 2.6;
  B.push(0, 0, 0, 0, s);
  const top = perch(B, pose, look.lo, look.hi, look.post);
  B.at(0.05, top, 0.05, 1.9, () => swallow(B, pose), 1.6);
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|gallow|barrier/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|nest-plat/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|cache|coffer/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem|pinnacle/i]];
const GATE_RE = /gate|torii|barrier|gallow|arch/i;
const roleOf = (P, t) => { const r = P.props?.[t]?.role; if (r && r !== "lead" && GATE_RE.test(t)) return "threshold"; return r || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0]; };
const poseOf = (t, p = "") => /idol|shrine|statue|vigil|totem|figurine/i.test(t) ? "statue" : /aero|gale|boss|dive|storm|bank/i.test(t) || /bank|soar|climb|swoop|flight|wings? (thrown|raised|high)/i.test(p) ? "flare" : "rest";

function fork(B, y, c, w = 0.5) {
  for (const s of [-1, 1]) slab(B, [[0, -0.07], [0.4, -0.03], [0.62, 0], [0.4, 0.04], [0, 0.07]], V(0, y, 0), V(s * 0.55, 1, 0), V(0, 0, 1), 0.12, c);
  B.box(w * 0.5, 0.1, 0.2, pal(c), 0, y - 0.05, 0);
}

const LENS_KINDS = [
  ["trellis", /trellis|pier|lintel|frame/i],
  ["curlArch", /curl.*arch|scroll.*arch|loop.*arch|curl-gate/i],
  ["forkArch", /fork.*arch|tine.*arch|prong/i],
  ["swarm", /midge|swarm|insect|gnat|mote/i],
  ["mudcups", /mud|cup|nest/i],
  ["snag", /snag|driftwood|branch/i],
  ["reeds", /reed|rush|sedge/i],
  ["sickle", /tail|fin|sickle|tine|scythe/i],
  ["blade", /blade|ribbon|pylon|wing|feather|sweep|spire|crest/i],
  ["curl", /curl|spiral|swirl|coil|eddy/i],
  ["smudge", /smudge|boulder|stone|pebble/i],
];
const lensKind = (t, role) => (role === "lead" || role === "creature" ? null : role === "threshold" ? (/fork|tine|prong/i.test(t) ? "forkArch" : /spiral|curl|scroll|coil|loop/i.test(t) ? "curlArch" : "trellis") : (LENS_KINDS.find(([, re]) => re.test(t)) || [role === "threshold" || role === "dais" || role === "light" || role === "offering" || role === "mass" ? null : "parts"])[0]);

function tine(B, len, w, c, o, dir, up) {
  slab(B, [[0, -w], [len * 0.45, -w * 0.6], [len, 0], [len * 0.45, w * 0.7], [0, w]], o, dir, up, 0.1, c);
}

const LENS_BUILD = {
  blade(B, H, v, { c0, c1, c2 }) {
    B.rbox(0.56, 0.16, 0.5, 0.08, pal(c1), 0, 0, 0);
    const lean = v % 2 ? -1 : 1;
    slab(B, BLADE.map(([a, b]) => [a * H * 0.95, b * 1.9]), V(-0.08 * lean, 0.12, 0), V(0.22 * lean, 1, 0.12), V(0, 0, 1), 0.16, c0);
    slab(B, STRIPE.map(([a, b]) => [a * H * 0.95, b * 1.9]), V(-0.06 * lean, 0.16, 0.02), V(0.22 * lean, 1, 0.12), V(0, 0, 1), 0.2, c2 === c0 ? INK.cream : c2);
  },
  sickle(B, H, v, { c0, c1 }) {
    B.rbox(0.44, 0.12, 0.36, 0.06, pal(c1), 0, 0, 0);
    for (const s of [-1, 1]) tine(B, H * (s < 0 ? 1 : 0.8), 0.13, s < 0 ? c0 : INK.umber, V(s * 0.07, 0.1, 0), V(s * 0.45, 1, (v % 2 ? 0.2 : -0.2)), V(0, 0, 1));
  },
  curl(B, H, v, { c0, c1, c2 }) {
    B.rbox(0.74, H * 0.55, 0.64, 0.14, pal(c1), 0, 0, 0);
    B.rbox(0.54, H * 0.3, 0.46, 0.12, pal(c0), 0.04, H * 0.55, -0.02);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.1 + i * 0.035; B.box(0.1, 0.05, 0.1, pal(c2), Math.cos(a) * r, H * 0.85, Math.sin(a) * r); }
  },
  smudge(B, H, v, { c0, c1 }) {
    B.rbox(0.8, H * 0.6, 0.66, 0.15, pal(c0), 0, 0, 0);
    B.rbox(0.5, H * 0.4, 0.42, 0.12, pal(c1), v % 2 ? 0.1 : -0.08, H * 0.6, 0.04);
  },
  mudcups(B, H, v, { c0, c1 }) {
    B.rbox(0.86, 0.12, 0.7, 0.08, pal(c1), 0, 0, 0);
    const cups = v % 2 ? [[-0.2, -0.12, 0.26], [0.22, -0.06, 0.22], [0, 0.22, 0.2]] : [[-0.18, 0.1, 0.25], [0.2, -0.14, 0.24], [0.16, 0.24, 0.18]];
    for (const [x, z, r] of cups) {
      B.cyl(r, H * 0.55, pal(c0), x, 0.12, z, 8);
      B.cyl(r * 0.8, H * 0.2, pal(c1), x, 0.12 + H * 0.55, z, 8);
      B.box(r * 0.7, r * 0.5, 0.04, pal(INK.ink), x, 0.12 + H * 0.3, z + r * 0.92);
    }
  },
  swarm(B, H, v, { c0, c1, P }) {
    B.rbox(0.42, 0.14, 0.42, 0.08, pal(c1), 0, 0, 0);
    B.box(0.2, H * 0.45, 0.2, pal(c0), 0, 0.14, 0);
    B.rbox(0.3, 0.08, 0.3, 0.06, pal(INK.moss), 0, 0.14 + H * 0.45, 0);
    const gold = P.flame || INK.gold;
    for (let i = 0; i < 11; i++) { const a = i * 2.4 + v, r = 0.12 + (i % 4) * 0.07, y = 0.3 + H * 0.45 + (i / 11) * H * 0.45; B.box(0.08, 0.08, 0.08, pal(gold), Math.cos(a) * r, y, Math.sin(a) * r); }
  },
  snag(B, H, v, { c0, c1 }) {
    B.at(0, 0.16, 0, v % 2 ? 0.7 : -0.5, () => {
      B.rbox(0.9, 0.3, 0.32, 0.1, pal(c0), 0, -0.14, 0);
      B.box(0.12, H * 0.55, 0.12, pal(c1), 0.36, 0, 0.04);
      B.box(0.28, 0.1, 0.1, pal(c1), -0.44, 0.02, 0.1);
    });
  },
  reeds(B, H, v, { c0, c1 }) {
    B.rbox(0.6, 0.1, 0.5, 0.08, pal(INK.moss), 0, 0, 0);
    const st = [[-0.16, -0.1, 1], [0.1, -0.14, 0.85], [0.16, 0.12, 0.95], [-0.06, 0.16, 0.75], [0.0, 0.0, 1.05]];
    for (const [x, z, k] of st) { B.box(0.06, H * k * 0.8, 0.06, pal(INK.moss), x, 0.1, z); B.rbox(0.1, H * 0.2 * k, 0.1, 0.04, pal(c0), x, 0.1 + H * k * 0.66, z); }
  },
  trellis(B, H, v, { c0, c1, c2, d }) {
    B.box(0.46, 0.2, 0.46, pal(c1));
    B.box(0.3, H * 0.72, 0.3, pal(c0), 0, 0.2, 0);
    B.box(0.36, 0.1, 0.36, pal(c2), 0, 0.2 + H * 0.4, 0);
    B.rbox(0.36, 0.3, 0.36, 0.1, pal(INK.sand), 0, 0.2 + H * 0.72, 0);
    if (d.side) {
      const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.2, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.2, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
      beam(H * 0.8, 0.16, c0);
      beam(H * 0.8 + 0.16, 0.12, INK.sand);
    }
  },
  curlArch(B, H, v, { c0, c1, c2, d }) {
    B.box(0.46, 0.2, 0.46, pal(c1));
    B.box(0.28, H * 0.6, 0.28, pal(c0), 0, 0.2, 0);
    B.at(0, 0.2 + H * 0.6, 0, d.axis === "x" ? Math.PI / 2 : 0, () => {
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + i * 0.75, r = 0.3 - i * 0.025; B.box(0.14, 0.14, 0.2, pal(i % 2 ? c2 : c0), Math.cos(a) * r * (d.side || 1) * -1, 0.3 + Math.sin(a) * r, 0); }
    });
    if (d.side) {
      const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.18, th, reach + 0.2, pal(c), 0, y, -d.side * (reach / 2)) : B.box(reach + 0.2, th, 0.18, pal(c), -d.side * (reach / 2), y, 0);
      beam(H * 0.62, 0.14, c2);
    }
  },
  forkArch(B, H, v, { c0, c1, c2, d }) {
    B.box(0.46, 0.2, 0.46, pal(c1));
    B.box(0.3, H * 0.55, 0.3, pal(c0), 0, 0.2, 0);
    fork(B, 0.2 + H * 0.55, INK.espresso, 0.46);
    if (d.side) {
      const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.2, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.2, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
      beam(H * 0.5, 0.14, c2);
    }
  },
};

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const gateT = types.find((t) => roleOf(P, t) === "threshold");
  const gt = gateT ? tonesOf(P, gateT) : [];
  const look = { lo: pick(dt, 0, ["#b9a58c", "#9c8a72", "#7c6c58"]), hi: pick(dt, 1, ["#e8d2a8", "#cdb58a", "#a8916a"]), post: pick(gt, 0, INK.umber) };

  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    catalog[t] = { footprint: role === "lead" ? [2, 2] : p.footprint || [1, 1], passable: role === "lead" ? false : !!p.passable, variants: 2, height: role === "lead" ? 2.6 : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, INK.umber), c1 = pick(tn, 1, INK.sand), c2 = pick(tn, 2, INK.rust);
    const pose = poseOf(t, p.pose || "");
    const lens = lensKind(t, role);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (role === "lead" || role === "creature") lead(B, H, look, pose);
      else if (lens && LENS_BUILD[lens]) LENS_BUILD[lens](B, H, v, { c0, c1, c2, d, P });
      else if (lens === "parts" && p.parts?.length) bakeParts(B, p.parts, { height: H, fallback: c0 });
      else if (role === "threshold") {
        B.box(0.46, 0.22, 0.46, pal(c1));
        B.box(0.32, H * 0.6, 0.32, pal(c0), 0, 0.22, 0);
        B.box(0.38, 0.12, 0.38, pal(c2), 0, 0.22 + H * 0.6, 0);
        fork(B, 0.34 + H * 0.6, INK.espresso);
        if (d.side) {
          const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(H * 0.66, 0.16, c2);
          beam(H * 0.66 + 0.22, 0.08, INK.cream);
        }
      } else if (role === "dais") {
        B.prism(circle(0, 0, 0.44, 0.44, 8, Math.PI / 8), 0, H * 0.6, pal(c0));
        B.prism(circle(0, 0, 0.36, 0.36, 8, Math.PI / 8), H * 0.6, H, pal(c1));
      } else if (role === "light") {
        B.box(0.3, 0.14, 0.3, pal(c0));
        B.box(0.16, H - 0.56, 0.16, pal(c0), 0, 0.14, 0);
        B.box(0.3, 0.06, 0.3, pal(c2), 0, H - 0.42, 0);
        B.box(0.22, 0.24, 0.22, pal(P.flame || INK.gold), 0, H - 0.36, 0);
        B.cone(0.22, 0, 0.16, pal(c2), 0, H - 0.12, 0, 4);
      } else if (role === "offering") {
        if (v % 2) {
          B.cyl(0.2, H * 0.6, pal(c0), 0, 0, 0, 8);
          B.cyl(0.24, 0.06, pal(c1), 0, H * 0.6, 0, 8);
        } else {
          B.box(0.5, H * 0.55, 0.36, pal(c0));
          B.box(0.54, H * 0.2, 0.4, pal(c1), 0, H * 0.55, 0);
          B.box(0.08, H * 0.4, 0.42, pal(INK.gold), -0.14, 0.02, 0);
          B.box(0.08, H * 0.4, 0.42, pal(INK.gold), 0.14, 0.02, 0);
        }
      } else if (role === "mass" && /tree|bough|pine/i.test(t)) {
        B.box(0.3, H * 0.45, 0.3, pal(pick(tn, 0, INK.espresso)));
        const cs = v % 2 ? [[0.9, 0.4], [0.7, 0.36], [0.44, 0.3]] : [[0.82, 0.38], [0.62, 0.34], [0.4, 0.28]];
        let y = H * 0.4;
        cs.forEach(([w, h], i) => { B.rbox(w, h, w, 0.12, pal(i === 1 ? c2 : c1), (i % 2 ? 0.04 : -0.03), y, (i % 2 ? -0.03 : 0.03)); y += h; });
      } else if (role === "mass") {
        const segs = v % 2 ? [0.64, 0.48, 0.32] : [0.58, 0.44, 0.3];
        const tot = /barrier|totem/i.test(t) ? H - 0.5 : H - 0.3;
        const hh = tot / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal([c0, c1, c2][i % 3]), (i % 2 ? 0.05 : -0.04), i * hh, (i % 2 ? -0.04 : 0.04)));
        if (/barrier|totem|fork|gale/i.test(t)) fork(B, tot, INK.espresso, 0.4);
        else B.cone(segs[segs.length - 1] * 0.7, 0, 0.3, pal(c2), 0, tot, 0, 4);
      } else if (/stone|paver|step/i.test(t)) {
        B.rbox(0.42, 0.08, 0.36, 0.1, pal(c0), -0.14, 0, -0.1);
        B.rbox(0.34, 0.06, 0.3, 0.1, pal(c1), 0.2, 0, 0.16);
      } else {
        const g = [[0, 0, 0.5, H * 0.7, c0], [0.2, 0.12, 0.34, H * 0.55, c1], [-0.18, 0.16, 0.3, H * 0.45, c2]];
        for (const [x, z, w, h, c] of g) B.rbox(w, h, w, 0.1, pal(c), x, 0, z);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

function fixRamps(level, h) {
  const at = (x, z) => level.cells[z]?.[x];
  for (let z = 0; z < level.cells.length; z++) for (let x = 0; x < level.cells[z].length; x++) {
    const c = at(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = at(x - dx, z - dz);
    if (up && up.h === c.h && up.s !== "ramp") continue;
    const up2 = at(x - 2 * dx, z - 2 * dz), D = at(x + dx, z + dz), D2 = at(x + 2 * dx, z + 2 * dz);
    const flat = (q, hh) => q && q.h === hh && q.s !== "ramp" && h.land(q);
    if (up && up.h === c.h + 1 && flat(up2, up.h) && flat(D, c.h - 1) && flat(D2, c.h - 1) && !h.isFig(x + dx, z + dz) && !h.isFig(x - dx, z - dz)) {
      level.cells[z - dz][x - dx] = { h: up.h, s: "ramp", d: c.d, m: c.m || "stone" };
      level.cells[z][x] = { h: c.h, s: h.surf.path };
      level.cells[z + dz][x + dx] = { h: c.h, s: "ramp", d: c.d, m: c.m || "stone" };
      h.clear(x - dx, z - dz); h.clear(x + dx, z + dz);
      for (const [sx, sz] of [[dz, dx], [-dz, -dx]].filter(([p, q]) => p + q > 0)) {
        const X = x - dx + sx, Z = z - dz + sz, n = at(X, Z), f = at(X + dx, Z + dz);
        if (flat(n, up.h) && f && f.h < up.h && !h.isFig(X, Z)) level.cells[Z][X] = { h: up.h - 1, s: n.s };
      }
    } else level.cells[z][x] = { h: c.h, s: h.surf.path };
  }
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    if (up && ["sand", "grass", "dirt", "stone"].includes(up.s)) c.m = up.s;
  }));
}

function repaint(level, h, keep) {
  const cells = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c && h.land(c) && c.s !== "ramp") cells.push([x, z, c]); }));
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length < cells.length * 0.3) return;
  const wet = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => level.cells[z + dz]?.[x + dx]?.s === "water");
  const to = { 1: "grass", 2: "sand", 3: "grass" };
  for (const [x, z, c] of stone) {
    if (keep.has(h.key(x, z)) || wet(x, z) || (x * 7 + z * 3) % 11 === 0) continue;
    level.cells[z][x] = { h: c.h, s: to[c.h] || "grass" };
  }
}

function finishLens(level, brief, h) {
  h.dryRim();
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = brief.threshold?.prop && level.palette?.props?.[brief.threshold.prop] ? brief.threshold.prop : h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || "lantern";
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && !daisTypes.includes(t));
  h.removeDecor((d) => d.t === gateT || d.t === lightT || passT.includes(d.t));
  let r = h.spawnAt({ min: 9, max: 16 });
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.6 }) : null;
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => /tree|pine|pinnacle|spire|bough|pylon|blade/i.test(d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1));
  const wet = (x, z) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => level.cells[z + dz]?.[x + dx]?.s === "water");
  h.removeDecor((d) => d.t === "stepping-stones" && !wet(d.x, d.z));
  h.along(passT.filter((t) => t !== "stepping-stones"), { route: r });
  h.lights(lightT, { route: r, every: 4, skip: 2, max: 4, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  h.ledges({ keep: [gateT] });
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.thin(84, { keep: [gateT, lightT] });
  if (h.walkN() < 84) h.grow(84);
  h.rampTone();
  if (level.name === "swallow-medium") placeLandmark(level, h, "swallow-blade-arch");
  if (level.name === "swallow-medium") {
    const t = placeGeneric(level, h, "watchtower", { near: 1, span: 0.4, spawnGap: 6, at: [9, 9] });
    if (t) for (const [x, z] of h.footprint(level.decor.find((d) => d.t === t.t && d.x === t.x && d.z === t.z))) level.cells[z][x] = { h: h.cell(x, z).h, s: "stone" };
  }
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0] || Object.keys(level.palette?.props || {}).find((t) => GATE_RE.test(t)) || (brief.motifs || []).map((m) => m.type).find((t) => GATE_RE.test(t || ""));
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "lantern";
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  let r = h.approach();
  if (r.length < 6) {
    let best = null;
    level.cells.forEach((row, z) => row.forEach((c, x) => {
      if (!c || !h.land(c) || c.s === "ramp" || h.isFig(x, z)) return;
      const q = h.approach({ from: [x, z] });
      const sc = q.length + 0.4 * (x + z);
      if (q.length >= 6 && q.length <= 12 && (!best || sc > best[0])) best = [sc, x, z];
    }));
    if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; r = h.approach(); }
  }
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  repaint(level, h, new Set([...r, ...h.figRing()].map(([x, z]) => h.key(x, z))));
  const g = gateT ? h.gate(gateT, { route: r, frac: 0.55 }) : null;
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => /tree|pine|pinnacle|spire|bough/i.test(d.t) && posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1 || Math.abs(q.x - d.x) + Math.abs(q.z - d.z) <= 2 && (d.x < q.x || d.z < q.z)));
  h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  h.repair({ keep: [gateT] });
  rampTone(level, h);
}
