const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos, H = Math.PI / 2;
const r3 = (v) => Math.round(v * 1000) / 1000;
const pulse = (p, k = 6) => Math.max(0, S(p)) ** k;

const cycle = (dur, n, f) => Array.from({ length: n + 1 }, (_, i) => [r3((dur * i) / n), ...f((i / n) * TAU).map(r3)]);

function clip(name, dur, n, tracks) {
  const out = { name, duration: dur, loop: true, tracks: {} };
  for (const [k, f] of Object.entries(tracks)) out.tracks[k] = cycle(dur, n, f);
  return out;
}

const ARM = { L: -1, R: 1 };

const limbs = (parent, pts) => Object.fromEntries(["L", "R"].flatMap((n) => {
  const s = ARM[n];
  return pts.map(([joint, par, [x, y, z]]) => [`${joint}${n}`, [par === parent ? parent : `${par}${n}`, [x * s, y, z]]]);
}));

const head = (y, z = 0) => ({ head: ["torso", [0, y, z]], hair: ["head", [0, y, z]], eyes: ["head", [0, y, z]], brow: ["head", [0, y, z]], mouth: ["head", [0, y, z]] });

const glow = (c) => [c, c, c, c, c];
const L = (prim, dims, at, base, rot = {}) => ({ prim, dims, at, ...(base ? { base } : {}), ...rot });
const flip = (l) => {
  const dims = l.dims.slice();
  if (l.prim === "spike" && dims.length > 3) dims[3] = -dims[3];
  if (l.prim === "taper" && dims.length > 5) dims[5] = -dims[5];
  const out = { ...l, dims, at: [-l.at[0], l.at[1], l.at[2]] };
  if (l.ry) out.ry = -l.ry;
  if (l.rz) out.rz = -l.rz;
  return out;
};
const both = (links) => links.flatMap((l) => [l, flip(l)]);
const chain = (id, base, links, extra = {}) => ({ id, prim: "chain", base, at: [0, 0, 0], links, ...extra });

const legSwing = (A, K, F, phase) => ({
  up: (p) => [A * S(p + phase), 0, 0],
  low: (p) => [4 + K * Math.max(0, -C(p + phase)) ** 1.4, 0, 0],
  foot: (p) => [-F * S(p + phase), 0, 0],
});

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const CLOAK = "#3b3470", CLOAK2 = "#2e2860", HEM = "#5d5199", INK = "#1b1530", VOID = glow("#07050d"), GOLD = "#ffd33d", SCRATCH = "#9f95dd", CUFF = "#b9b0e8";

function onTaper([w0, d0, y0], [w1, d1, y1], face, u, y, out = 0.004) {
  const t = (y - y0) / (y1 - y0), w = w0 + (w1 - w0) * t, d = d0 + (d1 - d0) * t;
  const sx = Math.atan2((w0 - w1) / 2, y1 - y0), sz = Math.atan2((d0 - d1) / 2, y1 - y0);
  if (face === 0) return { at: [u, y, d / 2 + out], ry: 0, rx: -sz };
  if (face === 1) return { at: [w / 2 + out, y, -u], ry: H, rx: -sx };
  if (face === 2) return { at: [-u, y, -d / 2 - out], ry: Math.PI, rx: -sz };
  return { at: [-w / 2 - out, y, u], ry: -H, rx: -sx };
}

function scratches(seed, lo, hi, faces, n, len = [0.1, 0.2]) {
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const f = faces[i % faces.length], half = (f % 2 ? (lo[1] + hi[1]) / 4 : (lo[0] + hi[0]) / 4) - 0.03;
    const h = len[0] + R() * (len[1] - len[0]), y = lo[2] + 0.02 + R() * Math.max(0.01, hi[2] - lo[2] - h - 0.03);
    const u = (R() * 2 - 1) * half * 0.8, lean = (R() < 0.5 ? -1 : 1) * (0.06 + R() * 0.1);
    const { at, ry, rx } = onTaper(lo, hi, f, u, y);
    out.push(L("spike", [0.014, h, 0.006, lean], at, null, { ry, rx }));
  }
  return out;
}

function hemRing(cloth, y, w, d, n, seed, len) {
  const R = rng(seed), out = [];
  const edge = (face, u, span) => {
    const h = len[0] + R() * (len[1] - len[0]), lean = (R() - 0.5) * 0.05, wd = span * (0.9 + R() * 0.5);
    const at = face === 0 ? [u, y, d / 2] : face === 1 ? [w / 2, y, -u] : face === 2 ? [-u, y, -d / 2] : [-w / 2, y, u];
    out.push(L("spike", [wd, h, 0.03, lean], at, cloth, { ry: [0, H, Math.PI, -H][face], rz: Math.PI }));
  };
  for (let f = 0; f < 4; f++) {
    const span = (f % 2 ? d : w), step = span / n;
    for (let i = 0; i < n; i++) edge(f, -span / 2 + step * (i + 0.5), step);
  }
  return out;
}

function wraith() {
  const cloak = [[0.5, 0.44, 0.16], [0.38, 0.34, 0.56]];
  const hood = [[0.44, 0.42, 0.56], [0.36, 0.35, 0.9]];
  const sleeve = (s, n) => [
    { id: `upperArm${n}`, prim: "chain", base: CLOAK, at: [0, 0, 0], links: [
      L("taper", [0.12, 0.13, 0.1, 0.11, 0.2, -0.02 * s, 0], [0.235 * s, 0.34, 0]),
      L("box", [0.124, 0.012, 0.134], [0.236 * s, 0.4, 0], SCRATCH),
    ] },
    { id: `lowerArm${n}`, prim: "chain", base: HEM, at: [0, 0, 0], links: [
      L("taper", [0.16, 0.16, 0.13, 0.14, 0.07], [0.24 * s, 0.28, 0.005]),
      L("box", [0.162, 0.02, 0.162], [0.24 * s, 0.305, 0.005], CUFF),
      ...hemRing(CLOAK, 0.285, 0.16, 0.16, 2, 7 + s, [0.03, 0.06]).map((l) => ({ ...l, at: [l.at[0] + 0.24 * s, l.at[1], l.at[2] + 0.005] })),
    ] },
    { id: `hand${n}`, prim: "chain", base: INK, at: [0, 0, 0], links: [
      L("rbox", [0.085, 0.07, 0.09], [0.24 * s, 0.21, 0.01]),
      ...[-1, 0, 1].map((k) => L("spike", [0.022, 0.06, 0.022, 0.01 * k], [0.24 * s + 0.025 * k, 0.215, 0.04], null, { rz: Math.PI })),
    ] },
  ];
  const drips = [[-0.16, 0.25, 0.14], [-0.04, 0.255, 0.09], [0.07, 0.25, 0.16], [0.19, 0.245, 0.1], [0.275, 0.12, 0.13], [0.27, -0.08, 0.1], [-0.07, -0.25, 0.12], [0.13, -0.25, 0.09], [-0.275, 0.07, 0.15], [-0.27, -0.12, 0.09]];
  const dripLinks = drips.flatMap(([x, z, h]) => [
    L("box", [0.03, h + 0.05, 0.03], [x, 0.16 - h, z]),
    L("rbox", [0.048, 0.055, 0.048], [x, 0.135 - h, z]),
  ]);
  const fall = (k) => chain(`fall${k}`, INK, drips.filter((_, i) => i % 2 === 0).map(([x, z, h], i) => L("box", [0.034, 0.034, 0.034], [x, 0.24 - h - 0.06 * ((k + i) % 3), z])), { joint: "puddle", face: true, blink: [1.5, k / 3, 0.34] });
  const motes = [[0.2, 0.025, 0.24], [-0.22, 0.03, 0.18], [0.03, 0.02, 0.31], [-0.1, 0.05, -0.27], [0.27, 0.035, -0.12]];
  return {
    name: "wraith",
    armSpread: 0.7,
    head: [0.25, 0.45],
    tree: {
      hips: [null, [0, 0.3, 0]],
      hem: ["hips", [0, 0.2, 0]],
      torso: ["hips", [0, 0.48, 0]],
      ...head(0.58),
      tip: ["head", [0, 0.9, -0.04]],
      ...limbs("torso", [["upperArm", "torso", [0.21, 0.54, 0]], ["lowerArm", "upperArm", [0.235, 0.36, 0]], ["hand", "lowerArm", [0.24, 0.29, 0]]]),
      puddle: [null, [0, 0, 0]],
    },
    parts: [
      ...sleeve(-1, "L"),
      ...sleeve(1, "R"),
      { id: "hips", prim: "chain", base: CLOAK, at: [0, 0, 0], links: [
        L("taper", [0.5, 0.44, 0.38, 0.34, 0.4], [0, 0.16, 0]),
        L("taper", [0.2, 0.025, 0.13, 0.02, 0.38], [0.07, 0.16, 0.222], CLOAK2, { rx: -0.13 }),
        L("box", [0.51, 0.03, 0.45], [0, 0.17, 0], HEM),
      ] },
      chain("scratchBody", SCRATCH, scratches(11, [...cloak[0]], [...cloak[1]], [0, 1, 2, 3, 0, 1, 0, 3, 2, 0, 1, 3], 22, [0.12, 0.26]), { joint: "hips", face: true }),
      { id: "hem", prim: "chain", base: CLOAK, at: [0, 0, 0], links: [
        L("taper", [0.53, 0.47, 0.5, 0.44, 0.06], [0, 0.12, 0]),
        ...hemRing(CLOAK, 0.13, 0.53, 0.47, 5, 3, [0.05, 0.13]),
      ] },
      chain("drips", INK, dripLinks, { joint: "hem", face: true }),
      { id: "torso", prim: "chain", base: CLOAK, at: [0, 0, 0], links: [
        L("taper", [0.46, 0.42, 0.38, 0.35, 0.12], [0, 0.46, 0]),
        ...hemRing(CLOAK2, 0.47, 0.46, 0.42, 4, 19, [0.04, 0.09]),
      ] },
      { id: "head", role: "head", prim: "chain", base: CLOAK, at: [0, 0, 0], links: [
        L("taper", [0.44, 0.42, 0.36, 0.35, 0.34, 0, -0.03], [0, 0.56, 0]),
        L("rbox", [0.42, 0.07, 0.11], [0, 0.84, 0.17], CLOAK2),
        ...both([L("rbox", [0.07, 0.3, 0.11], [0.175, 0.55, 0.17], CLOAK2)]),
        L("box", [0.3, 0.29, 0.02], [0, 0.55, 0.215], VOID),
        L("box", [0.3, 0.06, 0.02], [0, 0.78, 0.225], glow("#120c22")),
      ] },
      chain("scratchHood", SCRATCH, scratches(5, [...hood[0]], [...hood[1]], [1, 3, 2, 1, 3, 2, 1, 1, 2], 11, [0.1, 0.2]), { joint: "head", face: true }),
      chain("tip", CLOAK, [
        L("taper", [0.34, 0.32, 0.16, 0.12, 0.13, 0.01, -0.06], [0, 0.89, -0.025]),
        L("taper", [0.16, 0.12, 0.02, 0.02, 0.15, 0.02, -0.1], [0.01, 1.02, -0.085]),
        L("taper", [0.16, 0.1, 0.04, 0.03, 0.06, 0.04, 0.0], [-0.08, 0.89, 0.06], CLOAK2),
        L("spike", [0.014, 0.12, 0.006, -0.05], [0.0, 0.92, 0.12], SCRATCH, { rx: -0.6 }),
        L("spike", [0.014, 0.11, 0.006, 0.05], [0.13, 0.92, -0.02], SCRATCH, { ry: H, rx: -0.2 }),
      ]),
      chain("eyes", glow(GOLD), [
        ...both([L("box", [0.09, 0.13, 0.008], [0.07, 0.63, 0.227], glow("#4a3508"))]),
        ...both([L("box", [0.058, 0.095, 0.01], [0.07, 0.648, 0.232])]),
      ], { face: true, blink: [0.31, 0, 0.95] }),
      chain("brow", glow("#c79a1c"), both([L("box", [0.06, 0.016, 0.01], [0.07, 0.69, 0.232])]), { face: true, blink: [0.31, 0.05, 0.05] }),
      chain("puddle", INK, [
        L("cyl", [0.21, 0.012, 10], [0, 0.002, 0.02]),
        ...motes.flatMap(([x, y, z]) => [L("cone", [0.035, 0, 0.045, 4], [x, y, z]), L("cone", [0.035, 0, 0.035, 4], [x, y, z], null, { rx: Math.PI })]),
      ], { face: true }),
      ...[0, 1, 2].map(fall),
    ],
    clips: {
      idle: clip("idle", 3, 12, {
        "hips.position": (p) => [0, 0.035 + 0.03 * S(p), 0],
        "hips.quaternion": (p) => [2 * S(p + 1), 0, 2 * S(p)],
        "hem.quaternion": (p) => [5 * S(p - 0.9), 0, 4 * S(p - 1.2)],
        "torso.quaternion": (p) => [-2 * S(p + 1.4), 0, -1 * S(p + 0.5)],
        "head.quaternion": (p) => [3 * S(p + 2), 7 * S(p), -3 * S(p)],
        "tip.quaternion": (p) => [-6 * S(p - 0.7), 0, 5 * S(p - 1)],
        "upperArmL.quaternion": (p) => [8 * S(p + 0.6), 0, -9 - 4 * S(p + 0.6)],
        "upperArmR.quaternion": (p) => [8 * S(p + 1.2), 0, 9 + 4 * S(p + 1.2)],
        "lowerArmL.quaternion": (p) => [-12 + 5 * S(p + 1.5), 0, 0],
        "lowerArmR.quaternion": (p) => [-12 + 5 * S(p + 2.1), 0, 0],
      }),
      walk: clip("walk", 0.8, 8, {
        "hips.position": (p) => [0, 0.05 + 0.015 * S(2 * p), 0],
        "hips.quaternion": (p) => [10, 3 * S(p), 3 * S(p)],
        "hem.quaternion": (p) => [16 + 4 * S(2 * p), 0, 4 * S(p)],
        "torso.quaternion": (p) => [-2, -3 * S(p), 0],
        "head.quaternion": (p) => [-6, 2 * S(p), -2 * S(p)],
        "tip.quaternion": (p) => [-16 + 4 * S(2 * p + 0.5), 0, 3 * S(p)],
        "upperArmL.quaternion": (p) => [30 + 6 * S(2 * p + 0.5), 0, -12],
        "upperArmR.quaternion": (p) => [30 + 6 * S(2 * p + 0.9), 0, 12],
        "lowerArmL.quaternion": (p) => [14 + 6 * S(2 * p + 1.2), 0, 0],
        "lowerArmR.quaternion": (p) => [14 + 6 * S(2 * p + 1.6), 0, 0],
      }),
    },
  };
}

const MAUVE = "#9a90ab", PLATE = "#706782", LIGHT = "#bdb3cc", DARK = "#4c4560", CYAN = "#62f4ff", CORE = "#d9fdff", DEEP = "#1d2240";

function sentinel() {
  const rivets = (x, y, z, n, dy, ry = 0) => Array.from({ length: n }, (_, i) => L("box", [0.018, 0.018, 0.01], [x, y + i * dy, z], LIGHT, { ry }));
  const side = (s, n) => [
    { id: `foot${n}`, prim: "chain", base: PLATE, at: [0, 0, 0], links: [
      L("rbox", [0.15, 0.08, 0.21], [0.11 * s, 0, 0.03]),
      L("taper", [0.13, 0.07, 0.11, 0.05, 0.04], [0.11 * s, 0.05, 0.1], MAUVE),
      L("box", [0.152, 0.02, 0.212], [0.11 * s, 0.0, 0.03], DARK),
    ] },
    { id: `lowerLeg${n}`, prim: "chain", base: MAUVE, at: [0, 0, 0], links: [
      L("rbox", [0.13, 0.19, 0.14], [0.11 * s, 0.075, 0]),
      L("taper", [0.11, 0.025, 0.09, 0.02, 0.13], [0.11 * s, 0.09, 0.075], LIGHT),
      L("rbox", [0.11, 0.07, 0.06], [0.11 * s, 0.22, 0.06], PLATE),
    ] },
    { id: `upperLeg${n}`, prim: "chain", base: MAUVE, at: [0, 0, 0], links: [
      L("rbox", [0.14, 0.17, 0.15], [0.11 * s, 0.26, 0]),
      L("box", [0.145, 0.025, 0.155], [0.11 * s, 0.3, 0], PLATE),
    ] },
    { id: `upperArm${n}`, prim: "chain", base: MAUVE, at: [0, 0, 0], links: [
      L("rbox", [0.2, 0.19, 0.22], [0.33 * s, 0.82, 0]),
      L("rbox", [0.23, 0.045, 0.25], [0.335 * s, 0.985, 0], LIGHT),
      L("taper", [0.21, 0.23, 0.15, 0.17, 0.035], [0.335 * s, 1.03, 0], LIGHT),
      L("box", [0.21, 0.025, 0.23], [0.33 * s, 0.82, 0], PLATE),
      L("box", [0.012, 0.11, 0.16], [0.432 * s, 0.86, 0], PLATE),
      ...rivets(0.437 * s, 0.85, 0.07, 3, 0.045, H).concat(rivets(0.437 * s, 0.85, -0.07, 3, 0.045, H)),
    ] },
    { id: `lowerArm${n}`, prim: "chain", base: PLATE, at: [0, 0, 0], links: [
      L("rbox", [0.11, 0.15, 0.12], [0.33 * s, 0.67, 0]),
      L("box", [0.115, 0.02, 0.125], [0.33 * s, 0.74, 0], DARK),
    ] },
    { id: `hand${n}`, prim: "chain", base: MAUVE, at: [0, 0, 0], links: [
      L("rbox", [0.16, 0.16, 0.17], [0.33 * s, 0.51, 0.005]),
      L("rbox", [0.17, 0.04, 0.18], [0.33 * s, 0.64, 0.005], LIGHT),
      ...[-1, 1].map((k) => L("box", [0.06, 0.05, 0.015], [0.33 * s + 0.035 * k, 0.53, 0.09], PLATE)),
      L("box", [0.012, 0.06, 0.012], [0.413 * s, 0.56, 0], glow(CYAN)),
    ] },
  ];
  const shimmer = (k) => chain(`shimmer${k}`, glow(CORE), [0, 1, 2].map((i) => L("box", [0.19, 0.018, 0.006], [0, 0.56 + ((i * 0.11 + k * 0.037) % 0.3), 0.083]))
    .concat([L("box", [0.02, 0.24, 0.006], [(k - 1) * 0.06, 0.6, 0.083], glow("#a8f8ff"))]), { joint: "torso", face: true, blink: [1.1, k / 3, 0.36] });
  const A = legSwing(20, 34, 8, 0), B = legSwing(20, 34, 8, Math.PI);
  return {
    name: "sentinel",
    budget: 16,
    armSpread: 0.45,
    head: [0.18, 0.3],
    tree: {
      hips: [null, [0, 0.44, 0]],
      torso: ["hips", [0, 0.5, 0]],
      ...head(1.06),
      ...limbs("torso", [["upperArm", "torso", [0.31, 0.99, 0]], ["lowerArm", "upperArm", [0.33, 0.83, 0]], ["hand", "lowerArm", [0.33, 0.69, 0]]]),
      ...limbs("hips", [["upperLeg", "hips", [0.11, 0.43, 0]], ["lowerLeg", "upperLeg", [0.11, 0.26, 0]], ["foot", "lowerLeg", [0.11, 0.09, 0]]]),
    },
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "hips", prim: "chain", base: PLATE, at: [0, 0, 0], links: [
        L("rbox", [0.38, 0.1, 0.26], [0, 0.41, 0]),
        ...both([L("taper", [0.14, 0.02, 0.15, 0.02, 0.11], [0.09, 0.33, 0.135], MAUVE, { rx: 0.12 })]),
        L("box", [0.06, 0.06, 0.012], [0, 0.43, 0.135], glow(CYAN)),
      ] },
      { id: "torso", prim: "chain", base: MAUVE, at: [0, 0, 0], links: [
        L("rbox", [0.48, 0.54, 0.2], [0, 0.5, -0.05]),
        ...both([
          L("rbox", [0.11, 0.42, 0.12], [0.185, 0.5, 0.09]),
          L("box", [0.085, 0.17, 0.014], [0.185, 0.53, 0.153], LIGHT),
          L("box", [0.085, 0.17, 0.014], [0.185, 0.72, 0.153], LIGHT),
          L("box", [0.085, 0.012, 0.016], [0.185, 0.705, 0.154], DARK),
          L("box", [0.07, 0.07, 0.1], [0.115, 0.85, 0.09], MAUVE, { rz: Math.PI / 4 }),
        ]),
        L("rbox", [0.48, 0.13, 0.14], [0, 0.91, 0.08]),
        L("box", [0.44, 0.025, 0.145], [0, 0.955, 0.08], LIGHT),
        L("taper", [0.06, 0.05, 0.09, 0.05, 0.07], [0, 0.85, 0.13], LIGHT),
        L("box", [0.24, 0.03, 0.14], [0, 0.5, 0.08], PLATE),
        L("rbox", [0.26, 0.05, 0.22], [0, 1.03, 0], PLATE),
        L("box", [0.3, 0.38, 0.02], [0, 0.56, -0.155], PLATE),
        ...[0, 1, 2, 3].map((i) => L("box", [0.22, 0.014, 0.012], [0, 0.62 + i * 0.07, -0.168], DARK)),
        L("box", [0.06, 0.48, 0.03], [0, 0.52, -0.16], LIGHT),
      ] },
      chain("portal", glow(CYAN), [
        L("box", [0.26, 0.36, 0.02], [0, 0.53, 0.05], glow(DEEP)),
        L("box", [0.21, 0.32, 0.02], [0, 0.54, 0.07]),
        L("box", [0.13, 0.25, 0.01], [0, 0.57, 0.078], glow("#9ef8ff")),
      ], { joint: "torso", face: true }),
      shimmer(0), shimmer(1), shimmer(2),
      { id: "head", role: "head", prim: "chain", base: MAUVE, at: [0, 0, 0], links: [
        L("rbox", [0.34, 0.31, 0.32], [0, 1.06, -0.005]),
        L("rbox", [0.36, 0.055, 0.075], [0, 1.24, 0.135], LIGHT),
        ...both([L("box", [0.035, 0.15, 0.2], [0.17, 1.07, 0.05], PLATE)]),
        L("taper", [0.24, 0.04, 0.2, 0.03, 0.06], [0, 1.06, 0.16], PLATE),
        L("rbox", [0.06, 0.06, 0.3], [0, 1.36, -0.01], LIGHT),
      ] },
      chain("eyes", glow(CYAN), [
        L("box", [0.29, 0.085, 0.012], [0, 1.15, 0.159], glow(DEEP)),
        L("box", [0.25, 0.045, 0.012], [0, 1.17, 0.164]),
        L("box", [0.2, 0.012, 0.008], [0, 1.188, 0.171], glow(CORE)),
      ], { face: true }),
    ],
    clips: {
      idle: clip("idle", 3, 8, {
        "hips.position": (p) => [0, 0.004 + 0.004 * C(p), 0],
        "torso.quaternion": (p) => [-1.5 + 1.5 * C(p), 0, 0],
        "head.quaternion": (p) => [0, 9 * S(p), 0],
        "upperArmL.quaternion": (p) => [2 * S(p), 0, -4 - 1.5 * C(p)],
        "upperArmR.quaternion": (p) => [2 * S(p), 0, 4 + 1.5 * C(p)],
      }),
      walk: clip("walk", 0.9, 8, {
        "hips.position": (p) => [0, 0.012 * Math.abs(C(p)), 0],
        "hips.quaternion": (p) => [0, 5 * S(p), 3 * S(p)],
        "torso.quaternion": (p) => [3, -6 * S(p), -1.5 * S(p)],
        "head.quaternion": (p) => [-2, 3 * S(p), 0],
        "upperLegL.quaternion": A.up, "lowerLegL.quaternion": A.low, "footL.quaternion": A.foot,
        "upperLegR.quaternion": B.up, "lowerLegR.quaternion": B.low, "footR.quaternion": B.foot,
        "upperArmL.quaternion": (p) => [-14 * S(p), 0, -4],
        "upperArmR.quaternion": (p) => [14 * S(p), 0, 4],
        "lowerArmL.quaternion": (p) => [-8 - 6 * Math.max(0, S(p)), 0, 0],
        "lowerArmR.quaternion": (p) => [-8 - 6 * Math.max(0, -S(p)), 0, 0],
      }),
    },
  };
}

const SHELL = "#f6f4ff", SHELL2 = "#d6d0ea", NAVY = "#2f3088", NAVY2 = "#22236a", TIRE = "#2a2838", ICE = "#7ff7ff", EYE = "#8ffcff";
const TAIL = ["#ffa94a", "#f3ea5c", "#62e584", "#e95fd2", "#9b62f2"];

function rover() {
  const AX = [0.2, 0, -0.2], R = 0.085, WX = 0.215;
  const wheel = (z, s) => [
    L("cyl", [R, 0.06, 8], [WX * s, R, z], TIRE, { rz: -H * s }),
    L("cyl", [0.05, 0.012, 8], [(WX + 0.06) * s, R, z], NAVY, { rz: -H * s }),
    L("box", [0.012, 0.13, 0.022], [(WX + 0.072) * s, R - 0.065, z], glow(ICE)),
    L("box", [0.014, 0.022, 0.022], [(WX + 0.072) * s, R - 0.011, z], glow("#ffffff")),
  ];
  const axle = (z, i) => chain(`axle${i}`, TIRE, [...wheel(z, 1), ...wheel(z, -1)]);
  const stripes = TAIL.map((c, i) => L("box", [0.47, 0.013, 0.5 - i * 0.04], [0, 0.29 + i * 0.015, -0.02 - i * 0.02], glow(c)));
  const trail = (k) => chain(`trail${k}`, glow(TAIL[0]), TAIL.map((c, i) => {
    const x = 0.04 + (i - 2) * 0.042, len = (k ? 0.23 : 0.27) - Math.abs(i - 2) * 0.03 + ((i + k) % 2) * 0.02;
    return L("taper", [0.05, 0.03, 0.012, 0.012, len, (i - 2) * 0.012, 0], [x, 0.47 + (i % 2) * 0.02, -0.29], glow(c), { rx: -0.72 - (i % 2) * 0.1 + k * 0.08 });
  }).concat([L("box", [0.03, 0.03, 0.03], [0.1 - k * 0.12, 0.67 - k * 0.04, -0.42], glow("#ffffff")), L("box", [0.02, 0.02, 0.02], [-0.04 + k * 0.15, 0.61 + k * 0.06, -0.44], glow("#fff6b0"))]), { joint: "torso", face: true, blink: [3.2, k / 2, 0.5] });
  const FZ = 0.333;
  const smile = [L("box", [0.06, 0.018, 0.008], [0, 0.315, FZ]), ...both([L("box", [0.018, 0.03, 0.008], [0.039, 0.32, FZ])])];
  return {
    name: "rover",
    head: [0.04, 0.3],
    tree: {
      hips: [null, [0, 0.2, 0]],
      ...Object.fromEntries(AX.map((z, i) => [`axle${i}`, ["hips", [0, R, z]]])),
      torso: ["hips", [0, 0.2, 0]],
      ...head(0.54, -0.3),
      mast: ["torso", [-0.18, 0.58, -0.24]],
    },
    parts: [
      ...AX.map(axle),
      { id: "hips", prim: "chain", base: NAVY, at: [0, 0, 0], links: [
        L("rbox", [0.36, 0.08, 0.6], [0, 0.11, 0]),
        ...both([L("box", [0.012, 0.016, 0.54], [0.181, 0.12, 0], glow(ICE))]),
      ] },
      { id: "torso", prim: "chain", base: SHELL, at: [0, 0, 0], links: [
        L("rbox", [0.46, 0.36, 0.6], [0, 0.18, 0]),
        L("rbox", [0.47, 0.035, 0.61], [0, 0.18, 0], SHELL2),
        L("rbox", [0.48, 0.06, 0.06], [0, 0.17, 0.3], NAVY),
        L("rbox", [0.48, 0.06, 0.05], [0, 0.17, -0.3], NAVY),
        L("rbox", [0.38, 0.2, 0.03], [0, 0.27, 0.3], NAVY2),
        ...both([L("box", [0.05, 0.035, 0.012], [0.19, 0.2, 0.33], glow("#fff2a8")), L("box", [0.04, 0.02, 0.006], [0.135, 0.33, FZ], glow("#ff8fc8"))]),
        L("box", [0.3, 0.03, 0.012], [0, 0.2, -0.326], glow("#ff5fa8")),
        L("box", [0.22, 0.16, 0.01], [0.04, 0.27, -0.302], SHELL2),
        L("box", [0.05, 0.02, 0.014], [0.04, 0.41, -0.306], NAVY),
        ...stripes,
        L("box", [0.01, 0.3, 0.01], [0.231, 0.22, 0.12], SHELL2),
        L("box", [0.01, 0.3, 0.01], [-0.231, 0.22, 0.12], SHELL2),
        L("rbox", [0.1, 0.035, 0.04], [0, 0.505, 0.29], NAVY2),
        L("box", [0.04, 0.02, 0.008], [0, 0.512, 0.312], glow(ICE)),
      ] },
      chain("eyes", glow(EYE), [...both([L("rbox", [0.075, 0.09, 0.012], [0.085, 0.355, 0.322]), L("box", [0.022, 0.026, 0.006], [0.067, 0.41, FZ], glow("#ffffff"))]), ...smile], { joint: "torso", face: true, blink: [0.35, 0, 0.93] }),
      chain("brow", glow(EYE), [...both([L("box", [0.075, 0.016, 0.012], [0.085, 0.39, 0.322])]), ...smile], { joint: "torso", face: true, blink: [0.35, 0.07, 0.07] }),
      { id: "head", role: "head", prim: "chain", base: NAVY, at: [0, 0, 0], links: [
        L("rbox", [0.49, 0.05, 0.62], [0, 0.535, 0]),
        L("taper", [0.42, 0.52, 0.32, 0.4, 0.05], [0, 0.585, -0.01]),
        L("rbox", [0.12, 0.025, 0.04], [0, 0.525, 0.31], SHELL2),
        L("box", [0.3, 0.01, 0.36], [0, 0.635, 0.0], "#3d40a8"),
        L("box", [0.2, 0.03, 0.03], [0, 0.535, -0.31], NAVY2),
      ] },
      chain("badge", glow("#ffd84a"), [
        L("box", [0.06, 0.012, 0.06], [0.05, 0.648, 0.05], glow("#ffd84a"), { ry: Math.PI / 4 }),
        ...TAIL.slice(0, 3).map((c, i) => L("box", [0.012, 0.01, 0.1 - i * 0.02], [0.02 - i * 0.022, 0.648, -0.03 + i * 0.01], glow(c))),
      ], { joint: "head", face: true }),
      chain("mast", NAVY2, [
        L("rbox", [0.05, 0.03, 0.05], [-0.18, 0.585, -0.24]),
        L("box", [0.014, 0.38, 0.014], [-0.18, 0.6, -0.24], "#e9e4f5"),
        L("spike", [0.11, 0.15, 0.008, 0], [-0.18, 0.86, -0.245], "#ffa94a", { rz: H, ry: -H }),
        L("spike", [0.06, 0.08, 0.016, 0], [-0.18, 0.845, -0.245], "#f3ea5c", { rz: H, ry: -H }),
        L("box", [0.03, 0.03, 0.03], [-0.18, 0.98, -0.24], glow("#ff5fa8")),
      ]),
      trail(0), trail(1),
    ],
    clips: {
      idle: clip("idle", 2.4, 16, {
        "hips.position": (p) => [0, 0.004 * S(2 * p), 0],
        "torso.quaternion": (p) => [1.5 * S(p), 0, 1.2 * S(p + 0.6)],
        "head.quaternion": (p) => [-16 * pulse(p, 8), 0, 0],
        "mast.quaternion": (p) => [5 * S(p + 1), 0, 4 * S(2 * p)],
        "axle0.quaternion": (p) => [10 * S(p), 0, 0], "axle1.quaternion": (p) => [10 * S(p), 0, 0], "axle2.quaternion": (p) => [10 * S(p), 0, 0],
      }),
      walk: clip("walk", 0.8, 16, {
        "hips.position": (p) => [0, 0.006 * Math.abs(S(3 * p)), 0],
        "torso.quaternion": (p) => [-3 + 1.5 * S(2 * p), 0, 1.5 * S(p)],
        "head.quaternion": (p) => [-2 * Math.abs(S(3 * p)), 0, 0],
        "mast.quaternion": (p) => [-16 + 5 * S(2 * p), 0, 4 * S(p)],
        "axle0.quaternion": (p) => [(p / TAU) * 900, 0, 0], "axle1.quaternion": (p) => [(p / TAU) * 900, 0, 0], "axle2.quaternion": (p) => [(p / TAU) * 900, 0, 0],
      }),
      wiggle: clip("wiggle", 2, 16, {
        "hips.position": (p) => [0, 0.03 * Math.abs(S(2 * p)), 0],
        "hips.quaternion": (p) => [0, 14 * S(p), 4 * S(2 * p)],
        "torso.quaternion": (p) => [-4 * Math.abs(S(2 * p)), 0, 6 * S(2 * p)],
        "head.quaternion": (p) => [-22 * Math.abs(S(2 * p)), 0, 0],
        "mast.quaternion": (p) => [-6, 0, -18 * S(2 * p)],
        "axle0.quaternion": (p) => [30 * S(p), 0, 0], "axle1.quaternion": (p) => [30 * S(p), 0, 0], "axle2.quaternion": (p) => [30 * S(p), 0, 0],
      }),
    },
  };
}

const BEIGE = "#ead6a4", BEZEL = "#cdb37d", BEIGE2 = "#d8c08a", JEAN = "#2c3a7a", BOOT = "#7a4524", SKIN = "#ffd2a8", HAIR = "#8a4a28", SCREEN = "#1d1630", SEAM = "#b56cff", VENT = "#e57a2a";
const PIX = ["#ff5fd0", "#ffd84a", "#4ff0e0", "#ff9a3c", "#7cf07a", "#b06cff"];

function golem() {
  const side = (s, n) => [
    { id: `foot${n}`, prim: "chain", base: BOOT, at: [0, 0, 0], links: [
      L("box", [0.15, 0.025, 0.2], [0.1 * s, 0, 0.025], "#4a2a16"),
      L("rbox", [0.14, 0.07, 0.18], [0.1 * s, 0.02, 0.02]),
      L("rbox", [0.13, 0.04, 0.06], [0.1 * s, 0.02, 0.085], "#9a5a30"),
    ] },
    { id: `lowerLeg${n}`, prim: "chain", base: JEAN, at: [0, 0, 0], links: [
      L("rbox", [0.12, 0.09, 0.12], [0.1 * s, 0.075, 0]),
      L("box", [0.128, 0.02, 0.128], [0.1 * s, 0.075, 0], "#3a4a94"),
    ] },
    { id: `upperLeg${n}`, prim: "rbox", dims: [0.13, 0.12, 0.13], at: [0.1 * s, 0.15, 0], base: JEAN },
    { id: `upperArm${n}`, prim: "chain", base: BEIGE, at: [0, 0, 0], links: [
      L("rbox", [0.22, 0.2, 0.24], [0.36 * s, 0.52, 0]),
      L("rbox", [0.2, 0.025, 0.22], [0.36 * s, 0.72, 0], BEIGE2),
      L("box", [0.226, 0.02, 0.246], [0.36 * s, 0.55, 0], BEZEL),
      ...[0, 1, 2].map((i) => L("box", [0.012, 0.012, 0.14], [0.473 * s, 0.6 + i * 0.03, 0], BEZEL)),
      ...(s > 0 ? [L("box", [0.11, 0.014, 0.09], [0.37, 0.745, 0.03], VENT), L("box", [0.08, 0.012, 0.012], [0.37, 0.753, 0.0], "#b85a1a")] : []),
    ] },
    { id: `lowerArm${n}`, prim: "chain", base: SKIN, at: [0, 0, 0], links: [
      L("rbox", [0.11, 0.13, 0.11], [0.365 * s, 0.4, 0]),
    ] },
    { id: `hand${n}`, prim: "chain", base: BEIGE, at: [0, 0, 0], links: [
      L("rbox", [0.21, 0.24, 0.23], [0.365 * s, 0.14, 0.01]),
      L("rbox", [0.22, 0.045, 0.24], [0.365 * s, 0.36, 0.01], BEIGE2),
      L("box", [0.224, 0.012, 0.244], [0.365 * s, 0.35, 0.01], glow(SEAM)),
      ...[-1, 0, 1].map((k) => L("rbox", [0.055, 0.05, 0.03], [0.365 * s + 0.062 * k, 0.17, 0.13], BEIGE2)),
      L("rbox", [0.06, 0.1, 0.06], [0.28 * s, 0.2, 0.09], BEIGE2),
    ] },
  ];
  const cell = (r, c) => ({ r, c, base: PIX[(r * 2 + c * 3) % PIX.length] });
  const grid = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) grid.push(cell(r, c));
  const px = ({ r, c, base }) => L("box", [0.044, 0.036, 0.008], [-0.126 + c * 0.058 - 0.01, 0.62 - r * 0.048, 0.208], glow(base));
  const group = (k) => grid.filter((g) => (g.r * 5 + g.c * 7) % 3 === k).map(px);
  return {
    name: "golem",
    armSpread: 0.35,
    head: [0.22, 0.34],
    tree: {
      hips: [null, [0, 0.27, 0]],
      torso: ["hips", [0, 0.3, 0]],
      ...head(0.72),
      ...limbs("torso", [["upperArm", "torso", [0.3, 0.66, 0]], ["lowerArm", "upperArm", [0.365, 0.53, 0]], ["hand", "lowerArm", [0.365, 0.41, 0]]]),
      ...limbs("hips", [["upperLeg", "hips", [0.1, 0.27, 0]], ["lowerLeg", "upperLeg", [0.1, 0.16, 0]], ["foot", "lowerLeg", [0.1, 0.075, 0]]]),
    },
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "hips", prim: "chain", base: JEAN, at: [0, 0, 0], links: [
        L("rbox", [0.34, 0.07, 0.24], [0, 0.23, 0]),
        L("box", [0.35, 0.025, 0.25], [0, 0.27, 0], "#5a3a22"),
      ] },
      { id: "torso", prim: "chain", base: BEIGE, at: [0, 0, 0], links: [
        L("rbox", [0.5, 0.42, 0.38], [0, 0.29, 0]),
        L("rbox", [0.48, 0.035, 0.36], [0, 0.71, 0], BEIGE2),
        L("rbox", [0.52, 0.035, 0.4], [0, 0.28, 0], BEZEL),
        L("box", [0.37, 0.025, 0.035], [-0.01, 0.43, 0.2], BEZEL),
        L("box", [0.37, 0.025, 0.035], [-0.01, 0.675, 0.2], BEZEL),
        ...both([L("box", [0.025, 0.27, 0.035], [0.17, 0.43, 0.2], BEZEL)]).map((l) => ({ ...l, at: [l.at[0] - 0.01, l.at[1], l.at[2]] })),
        L("box", [0.32, 0.22, 0.02], [-0.01, 0.455, 0.195], glow(SCREEN)),
        L("box", [0.06, 0.012, 0.006], [-0.13, 0.66, 0.207], glow("#5a4a80")),
        L("box", [0.012, 0.04, 0.006], [-0.157, 0.63, 0.207], glow("#5a4a80")),
        ...both([L("box", [0.016, 0.016, 0.008], [0.225, 0.69, 0.192], BEZEL), L("box", [0.016, 0.016, 0.008], [0.225, 0.31, 0.205], BEZEL)]),
        L("rbox", [0.46, 0.075, 0.03], [0, 0.325, 0.185], BEIGE2),
        L("box", [0.13, 0.016, 0.01], [-0.1, 0.355, 0.2], "#2a2230"),
        L("box", [0.03, 0.02, 0.01], [-0.005, 0.35, 0.2], BEZEL),
        ...[0, 1, 2, 3].map((i) => L("box", [0.012, 0.03, 0.01], [0.09 + i * 0.022, 0.34, 0.2], BEZEL)),
        L("box", [0.12, 0.014, 0.04], [-0.13, 0.715, 0.08], VENT),
        L("box", [0.34, 0.3, 0.012], [0, 0.34, -0.19], BEIGE2),
        L("cyl", [0.075, 0.015, 8], [0.06, 0.52, -0.195], "#4a3f5a", { rx: -H }),
        ...[0, 1].map((k) => L("box", [0.13, 0.012, 0.012], [0.06, 0.445, -0.21], "#7a6d8a", { rz: k ? Math.PI / 4 : -Math.PI / 4 })),
        ...[0, 1, 2, 3].map((i) => L("box", [0.1, 0.012, 0.012], [-0.1, 0.4 + i * 0.03, -0.2], BEZEL)),
        ...TAIL.slice(0, 3).map((c, i) => L("box", [0.03, 0.02, 0.01], [0.04 + i * 0.04, 0.37, -0.198], c)),
      ] },
      chain("seam", glow(SEAM), [
        L("box", [0.506, 0.012, 0.386], [0, 0.405, 0]),
        ...both([L("box", [0.012, 0.3, 0.012], [0.176, 0.355, -0.196])]),
        L("box", [0.364, 0.012, 0.012], [0, 0.655, -0.196]),
        L("box", [0.3, 0.012, 0.02], [-0.01, 0.705, 0.192]),
      ], { joint: "torso", face: true }),
      chain("pixels", glow(PIX[0]), group(0), { joint: "torso", face: true }),
      chain("pixA", glow(PIX[1]), group(1), { joint: "torso", face: true, blink: [0.7, 0, 0.6] }),
      chain("pixB", glow(PIX[2]), group(2), { joint: "torso", face: true, blink: [0.9, 0.5, 0.55] }),
      chain("ledG", glow("#5cff7a"), [L("box", [0.022, 0.022, 0.01], [0.17, 0.35, 0.206])], { joint: "torso", face: true }),
      chain("ledR", glow("#ff4a6a"), [L("box", [0.022, 0.022, 0.01], [0.2, 0.35, 0.206]), L("box", [0.022, 0.022, 0.01], [0.17, 0.3, 0.2])], { joint: "torso", face: true, blink: [2.3, 0, 0.4] }),
      { id: "head", role: "head", prim: "chain", base: SKIN, at: [0, 0, 0], links: [
        L("rbox", [0.3, 0.27, 0.28], [0, 0.72, 0]),
        ...both([L("rbox", [0.03, 0.07, 0.06], [0.155, 0.8, 0], "#f2b98a")]),
      ] },
      { id: "hair", prim: "chain", base: HAIR, at: [0, 0, 0], links: [
        L("rbox", [0.33, 0.08, 0.31], [0, 0.96, -0.01]),
        L("rbox", [0.33, 0.2, 0.08], [0, 0.8, -0.125]),
        L("rbox", [0.22, 0.05, 0.05], [0.03, 0.94, 0.13]),
        ...both([L("box", [0.02, 0.07, 0.07], [0.158, 0.88, 0.04])]),
      ] },
      chain("eyes", INK, both([L("box", [0.04, 0.065, 0.01], [0.068, 0.83, 0.142])]), { face: true }),
      chain("mouth", INK, [L("box", [0.06, 0.018, 0.01], [0, 0.775, 0.142]), ...both([L("box", [0.018, 0.018, 0.01], [0.035, 0.785, 0.142])]), ...both([L("box", [0.045, 0.02, 0.006], [0.11, 0.79, 0.141], "#ffa98f")])], { face: true }),
    ],
    clips: {
      idle: clip("idle", 3.2, 8, {
        "hips.position": (p) => [0, 0.004 + 0.004 * C(p), 0],
        "torso.quaternion": (p) => [-2 + 2 * C(p), 0, 1.5 * S(p)],
        "head.quaternion": (p) => [2 * S(2 * p), 12 * S(p), 0],
        "upperArmL.quaternion": (p) => [4 * S(p + 0.5), 0, 1 - 1.5 * C(p)],
        "upperArmR.quaternion": (p) => [4 * S(p + 1.1), 0, -1 + 1.5 * C(p)],
        "lowerArmL.quaternion": (p) => [-6 + 3 * S(p), 0, 0],
        "lowerArmR.quaternion": (p) => [-6 + 3 * S(p + 0.8), 0, 0],
      }),
      walk: clip("walk", 1.2, 8, {
        "hips.position": (p) => [0, 0.02 * Math.abs(C(p)) + 0.025 * Math.abs(S(p)) - 0.01, 0],
        "hips.quaternion": (p) => [0, 5 * S(p), 8 * S(p)],
        "torso.quaternion": (p) => [6, -8 * S(p), -4 * S(p)],
        "head.quaternion": (p) => [-4, 5 * S(p), -4 * S(p)],
        "upperLegL.quaternion": (p) => [24 * S(p), 0, 0], "lowerLegL.quaternion": (p) => [4 + 30 * Math.max(0, -C(p)), 0, 0], "footL.quaternion": (p) => [-6 * S(p), 0, 0],
        "upperLegR.quaternion": (p) => [-24 * S(p), 0, 0], "lowerLegR.quaternion": (p) => [4 + 30 * Math.max(0, C(p)), 0, 0], "footR.quaternion": (p) => [6 * S(p), 0, 0],
        "upperArmL.quaternion": (p) => [-24 * S(p - 0.4), 0, -1 - 2 * Math.abs(S(p))],
        "upperArmR.quaternion": (p) => [24 * S(p - 0.4), 0, 1 + 2 * Math.abs(S(p))],
        "lowerArmL.quaternion": (p) => [-12 - 10 * Math.max(0, S(p - 0.6)), 0, 0],
        "lowerArmR.quaternion": (p) => [-12 - 10 * Math.max(0, -S(p - 0.6)), 0, 0],
      }),
    },
  };
}

export const HEROES = { wanderer: wraith, aws: sentinel, dutchie: rover, nm: golem };
const ALIAS = { wretch: "wanderer" };
export const CLASS_KEY = "isoworld:class";

export function heroClass(params = {}, storage = globalThis.localStorage) {
  let v = params.class;
  if (v == null) try { v = storage?.getItem(CLASS_KEY); } catch {}
  v = ALIAS[v] || v;
  return HEROES[v] ? v : null;
}
