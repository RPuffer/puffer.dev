const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos;
const r3 = (v) => Math.round(v * 1000) / 1000;

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

const head = (y) => ({ head: ["torso", [0, y, 0]], hair: ["head", [0, y, 0]], eyes: ["head", [0, y, 0]], brow: ["head", [0, y, 0]], mouth: ["head", [0, y, 0]] });

const legSwing = (A, K, F, phase) => ({
  up: (p) => [A * S(p + phase), 0, 0],
  low: (p) => [4 + K * Math.max(0, -C(p + phase)) ** 1.4, 0, 0],
  foot: (p) => [-F * S(p + phase), 0, 0],
});

const CLOAK = "#3b3470", HEM = "#5d5199", INK = "#1b1530", GOLD = "#ffd33d", SCRATCH = "#9f95dd";
const slash = (x, y, z, h, lean, ry = 0) => ({ prim: "spike", dims: [0.018, h, 0.008, lean], at: [x, y, z], ry });
const SCRATCHES = [
  slash(-0.15, 0.2, 0.215, 0.16, 0.12), slash(-0.02, 0.2, 0.215, 0.16, -0.12), slash(0.06, 0.23, 0.215, 0.12, 0.1),
  slash(-0.1, 0.33, 0.19, 0.12, 0.13), slash(0.1, 0.34, 0.19, 0.1, -0.1),
  slash(0.245, 0.2, -0.05, 0.15, 0.12, Math.PI / 2), slash(0.245, 0.21, 0.08, 0.13, -0.11, Math.PI / 2),
  slash(-0.245, 0.2, 0.03, 0.15, -0.12, Math.PI / 2), slash(-0.245, 0.22, -0.1, 0.12, 0.1, Math.PI / 2),
  slash(-0.06, 0.2, -0.215, 0.15, 0.12), slash(0.08, 0.22, -0.215, 0.12, -0.1),
];

function wraith() {
  const side = (s, n) => [
    { id: `upperArm${n}`, prim: "rbox", dims: [0.11, 0.14, 0.12], at: [0.22 * s, 0.4, 0], base: CLOAK },
    { id: `lowerArm${n}`, prim: "chain", base: CLOAK, at: [0.23 * s, 0.29, 0], links: [{ prim: "rbox", dims: [0.12, 0.1, 0.13], at: [0, 0, 0] }, { prim: "box", dims: [0.125, 0.025, 0.135], at: [0, 0.015, 0], base: HEM }] },
    { id: `hand${n}`, prim: "rbox", dims: [0.08, 0.08, 0.08], at: [0.23 * s, 0.22, 0.01], base: INK },
  ];
  const drips = [[-0.15, 0.18, 0.1], [0.04, 0.19, 0.15], [0.17, 0.16, 0.08], [0.215, -0.06, 0.12], [-0.08, -0.19, 0.1], [0.12, -0.18, 0.07], [-0.215, 0.07, 0.09]];
  return {
    name: "wraith",
    armSpread: 0.75,
    head: [0.3, 0.45],
    tree: {
      hips: [null, [0, 0.3, 0]],
      torso: ["hips", [0, 0.4, 0]],
      ...head(0.56),
      ...limbs("torso", [["upperArm", "torso", [0.21, 0.53, 0]], ["lowerArm", "upperArm", [0.225, 0.4, 0]], ["hand", "lowerArm", [0.23, 0.3, 0]]]),
      puddle: [null, [0, 0, 0]],
    },
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "hips", prim: "chain", base: CLOAK, at: [0, 0.18, 0], links: [{ prim: "rbox", dims: [0.48, 0.13, 0.42], at: [0, 0, 0] }, { prim: "box", dims: [0.49, 0.03, 0.43], at: [0, 0, 0], base: HEM }, { prim: "rbox", dims: [0.43, 0.15, 0.37], at: [0, 0.12, 0] }] },
      { id: "drips", joint: "hips", prim: "chain", base: INK, at: [0, 0.18, 0], links: drips.map(([x, z, h]) => ({ prim: "box", dims: [0.05, h, 0.05], at: [x, -h + 0.03, z] })) },
      { id: "drops", joint: "hips", face: true, prim: "chain", base: INK, at: [0, 0, 0], links: drips.filter((_, i) => i % 2 === 0).map(([x, z, h]) => ({ prim: "box", dims: [0.04, 0.04, 0.04], at: [x, 0.18 - h + 0.03 - 0.07, z] })) },
      { id: "scratch", joint: "hips", face: true, prim: "chain", base: SCRATCH, at: [0, 0, 0], links: SCRATCHES },
      { id: "torso", prim: "rbox", dims: [0.38, 0.18, 0.33], at: [0, 0.4, 0], base: CLOAK },
      { id: "head", role: "head", prim: "rbox", dims: [0.42, 0.38, 0.4], at: [0, 0.56, 0], base: CLOAK },
      { id: "hair", prim: "chain", base: CLOAK, at: [0, 0.93, 0], links: [{ prim: "rbox", dims: [0.3, 0.08, 0.3], at: [0, 0, -0.04] }, { prim: "spike", dims: [0.22, 0.2, 0.2, 0.16], at: [0.02, 0.07, -0.06], ry: Math.PI / 2 }] },
      { id: "brim", joint: "head", face: true, prim: "box", dims: [0.36, 0.05, 0.03], at: [0, 0.855, 0.205], base: HEM },
      { id: "brow", face: true, prim: "box", dims: [0.32, 0.25, 0.02], at: [0, 0.6, 0.207], base: INK },
      { id: "eyes", face: true, prim: "chain", base: GOLD, at: [0, 0.68, 0.222], links: [-1, 1].map((s) => ({ prim: "box", dims: [0.06, 0.1, 0.012], at: [0.07 * s, 0, 0] })) },
      { id: "puddle", prim: "chain", base: INK, at: [0, 0.004, 0], links: [{ prim: "cyl", dims: [0.2, 0.012], at: [0, 0, 0.02] }, { prim: "box", dims: [0.045, 0.045, 0.045], at: [0.18, 0, 0.22], base: CLOAK }, { prim: "box", dims: [0.04, 0.04, 0.04], at: [-0.2, 0, 0.17], base: CLOAK }] },
    ],
    clips: {
      idle: clip("idle", 2.4, 8, {
        "hips.position": (p) => [0, 0.03 * S(p), 0],
        "hips.quaternion": (p) => [2 * S(p + 1), 0, 1.5 * S(p)],
        "torso.quaternion": (p) => [-2 * S(p + 1.4), 0, 0],
        "head.quaternion": (p) => [3 * S(p + 2), 6 * S(p), -2 * S(p)],
        "upperArmL.quaternion": (p) => [6 * S(p + 0.6), 0, -9 - 3 * S(p + 0.6)],
        "upperArmR.quaternion": (p) => [6 * S(p + 1.2), 0, 9 + 3 * S(p + 1.2)],
        "lowerArmL.quaternion": (p) => [-10 + 4 * S(p + 1.5), 0, 0],
        "lowerArmR.quaternion": (p) => [-10 + 4 * S(p + 2.1), 0, 0],
      }),
      walk: clip("walk", 0.8, 8, {
        "hips.position": (p) => [0, 0.035 + 0.02 * S(2 * p), 0],
        "hips.quaternion": (p) => [12, 3 * S(p), 3 * S(p)],
        "torso.quaternion": (p) => [-3, -3 * S(p), 0],
        "head.quaternion": (p) => [-8, 2 * S(p), -2 * S(p)],
        "upperArmL.quaternion": (p) => [32 + 6 * S(2 * p + 0.5), 0, -12],
        "upperArmR.quaternion": (p) => [32 + 6 * S(2 * p + 0.9), 0, 12],
        "lowerArmL.quaternion": (p) => [14 + 6 * S(2 * p + 1.2), 0, 0],
        "lowerArmR.quaternion": (p) => [14 + 6 * S(2 * p + 1.6), 0, 0],
      }),
    },
  };
}

const MAUVE = "#9a90ab", PLATE = "#706782", CYAN = "#62f4ff";

function sentinel() {
  const side = (s, n) => [
    { id: `foot${n}`, prim: "rbox", dims: [0.14, 0.09, 0.19], at: [0.11 * s, 0, 0.03], base: PLATE },
    { id: `lowerLeg${n}`, prim: "rbox", dims: [0.125, 0.18, 0.13], at: [0.11 * s, 0.085, 0], base: MAUVE },
    { id: `upperLeg${n}`, prim: "rbox", dims: [0.135, 0.17, 0.14], at: [0.11 * s, 0.26, 0], base: MAUVE },
    { id: `upperArm${n}`, prim: "rbox", dims: [0.18, 0.19, 0.2], at: [0.32 * s, 0.85, 0], base: MAUVE },
    { id: `lowerArm${n}`, prim: "rbox", dims: [0.11, 0.14, 0.12], at: [0.315 * s, 0.72, 0], base: PLATE },
    { id: `hand${n}`, prim: "rbox", dims: [0.149, 0.149, 0.149], at: [0.315 * s, 0.565, 0], base: MAUVE },
  ];
  const A = legSwing(20, 34, 8, 0), B = legSwing(20, 34, 8, Math.PI);
  return {
    name: "sentinel",
    armSpread: 0.45,
    head: [0.2, 0.3],
    tree: {
      hips: [null, [0, 0.44, 0]],
      torso: ["hips", [0, 0.5, 0]],
      ...head(1.05),
      ...limbs("torso", [["upperArm", "torso", [0.31, 0.99, 0]], ["lowerArm", "upperArm", [0.315, 0.83, 0]], ["hand", "lowerArm", [0.315, 0.7, 0]]]),
      ...limbs("hips", [["upperLeg", "hips", [0.11, 0.43, 0]], ["lowerLeg", "upperLeg", [0.11, 0.26, 0]], ["foot", "lowerLeg", [0.11, 0.09, 0]]]),
    },
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "hips", prim: "rbox", dims: [0.38, 0.1, 0.26], at: [0, 0.41, 0], base: PLATE },
      { id: "torso", prim: "chain", base: MAUVE, at: [0, 0.5, 0], links: [
        { prim: "rbox", dims: [0.48, 0.54, 0.22], at: [0, 0, -0.04] },
        { prim: "rbox", dims: [0.15, 0.54, 0.1], at: [-0.165, 0, 0.11] },
        { prim: "rbox", dims: [0.15, 0.54, 0.1], at: [0.165, 0, 0.11] },
        { prim: "rbox", dims: [0.2, 0.11, 0.1], at: [0, 0.43, 0.11] },
        { prim: "box", dims: [0.2, 0.05, 0.1], at: [0, 0, 0.11], base: PLATE },
        { prim: "box", dims: [0.17, 0.38, 0.02], at: [0, 0.05, 0.075], base: CYAN },
      ] },
      { id: "head", role: "head", prim: "rbox", dims: [0.34, 0.33, 0.32], at: [0, 1.05, 0], base: MAUVE },
      { id: "brow", face: true, prim: "box", dims: [0.28, 0.1, 0.012], at: [0, 1.17, 0.162], base: PLATE },
      { id: "eyes", face: true, prim: "box", dims: [0.24, 0.05, 0.012], at: [0, 1.195, 0.17], base: CYAN },
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

const SKIN = "#ffd2a8", HAIR = "#8a4a28", SUIT = "#2f3088", SUIT2 = "#24256a", SNEAK = "#f6f7ff", SOLE = "#7ff7ff";
const TAIL = ["#ffa94a", "#f3ea5c", "#62e584", "#e95fd2", "#9b62f2"];

function runner() {
  const side = (s, n) => [
    { id: `foot${n}`, prim: "chain", base: SNEAK, at: [0.065 * s, 0, 0.035], links: [{ prim: "box", dims: [0.115, 0.03, 0.19], at: [0, 0, 0], base: SOLE }, { prim: "rbox", dims: [0.105, 0.065, 0.17], at: [0, 0.025, -0.005] }] },
    { id: `lowerLeg${n}`, prim: "rbox", dims: [0.08, 0.16, 0.085], at: [0.065 * s, 0.08, 0], base: SUIT },
    { id: `upperLeg${n}`, prim: "rbox", dims: [0.088, 0.16, 0.092], at: [0.065 * s, 0.235, 0], base: SUIT },
    { id: `upperArm${n}`, prim: "rbox", dims: [0.07, 0.12, 0.075], at: [0.17 * s, 0.5, 0], base: SUIT },
    { id: `lowerArm${n}`, prim: "rbox", dims: [0.065, 0.1, 0.07], at: [0.17 * s, 0.41, 0], base: SUIT },
    { id: `hand${n}`, prim: "rbox", dims: [0.08, 0.08, 0.08], at: [0.17 * s, 0.345, 0], base: SKIN },
  ];
  const strands = TAIL.flatMap((base, j) => {
    const x = -0.12 + j * 0.06, y0 = 0.2 + [0, 0.05, 0.1, 0.06, 0.01][j];
    return [0, 1, 2, 3].map((k) => ({ prim: "box", dims: [0.065 - k * 0.01, 0.045 - k * 0.006, 0.11], at: [x * (1 + k * 0.12), y0 + k * 0.04, -0.17 - k * 0.085], base }));
  });
  const A = legSwing(46, 72, 14, 0), B = legSwing(46, 72, 14, Math.PI);
  return {
    name: "runner",
    head: [0.26, 0.45],
    tree: {
      hips: [null, [0, 0.4, 0]],
      torso: ["hips", [0, 0.45, 0]],
      ...head(0.64),
      ...limbs("torso", [["upperArm", "torso", [0.165, 0.615, 0]], ["lowerArm", "upperArm", [0.17, 0.505, 0]], ["hand", "lowerArm", [0.17, 0.41, 0]]]),
      ...limbs("hips", [["upperLeg", "hips", [0.065, 0.39, 0]], ["lowerLeg", "upperLeg", [0.065, 0.235, 0]], ["foot", "lowerLeg", [0.065, 0.085, 0]]]),
    },
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "hips", prim: "rbox", dims: [0.22, 0.08, 0.16], at: [0, 0.38, 0], base: SUIT2 },
      { id: "torso", prim: "rbox", dims: [0.26, 0.19, 0.17], at: [0, 0.45, 0], base: SUIT },
      { id: "head", role: "head", prim: "rbox", dims: [0.32, 0.32, 0.3], at: [0, 0.64, 0], base: SKIN },
      { id: "hair", prim: "chain", base: HAIR, at: [0, 0.64, 0], links: [{ prim: "rbox", dims: [0.35, 0.09, 0.33], at: [0, 0.25, -0.01] }, { prim: "rbox", dims: [0.35, 0.18, 0.09], at: [0, 0.1, -0.14] }] },
      { id: "tail", joint: "hair", prim: "chain", base: TAIL[0], at: [0, 0.64, 0], links: strands },
      { id: "eyes", face: true, prim: "chain", base: INK, at: [0, 0.74, 0.153], links: [-1, 1].map((s) => ({ prim: "box", dims: [0.045, 0.075, 0.012], at: [0.07 * s, 0, 0] })) },
      { id: "mouth", face: true, prim: "box", dims: [0.06, 0.022, 0.012], at: [0, 0.7, 0.153], base: INK },
    ],
    clips: {
      idle: clip("idle", 1, 8, {
        "hips.position": (p) => [0, 0.012 * S(2 * p), 0],
        "torso.quaternion": (p) => [4 + 2 * S(2 * p), 0, 0],
        "head.quaternion": (p) => [-2, 4 * S(p), 0],
        "upperLegL.quaternion": () => [-6, 0, 0], "lowerLegL.quaternion": (p) => [12 + 6 * S(2 * p), 0, 0], "footL.quaternion": (p) => [-6 - 6 * S(2 * p), 0, 0],
        "upperLegR.quaternion": () => [-6, 0, 0], "lowerLegR.quaternion": (p) => [12 + 6 * S(2 * p), 0, 0], "footR.quaternion": (p) => [-6 - 6 * S(2 * p), 0, 0],
        "upperArmL.quaternion": (p) => [8 * S(p), 0, -10],
        "upperArmR.quaternion": (p) => [-8 * S(p), 0, 10],
        "lowerArmL.quaternion": () => [-40, 0, 0],
        "lowerArmR.quaternion": () => [-40, 0, 0],
      }),
      walk: clip("walk", 0.6, 8, {
        "hips.position": (p) => [0, 0.03 * Math.abs(C(p)) - 0.02, 0],
        "hips.quaternion": (p) => [6, 8 * S(p), 0],
        "torso.quaternion": (p) => [10, -12 * S(p), 0],
        "head.quaternion": (p) => [-12, 4 * S(p), 0],
        "upperLegL.quaternion": A.up, "lowerLegL.quaternion": A.low, "footL.quaternion": A.foot,
        "upperLegR.quaternion": B.up, "lowerLegR.quaternion": B.low, "footR.quaternion": B.foot,
        "upperArmL.quaternion": (p) => [-46 * S(p), 0, -8],
        "upperArmR.quaternion": (p) => [46 * S(p), 0, 8],
        "lowerArmL.quaternion": (p) => [-62 - 12 * S(p), 0, 0],
        "lowerArmR.quaternion": (p) => [-62 + 12 * S(p), 0, 0],
      }),
    },
  };
}

const BEIGE = "#ead6a4", NAVY = "#2c3a7a", BOOT = "#7a4524", SCREEN = "#241c3a", SEAM = "#b56cff", VENT = "#e57a2a";
const PIX = ["#ff5fd0", "#ffd84a", "#4ff0e0", "#ff9a3c", "#7cf07a", "#b06cff"];

function golem() {
  const side = (s, n) => [
    { id: `foot${n}`, prim: "rbox", dims: [0.13, 0.07, 0.16], at: [0.09 * s, 0, 0.02], base: BOOT },
    { id: `lowerLeg${n}`, prim: "rbox", dims: [0.11, 0.09, 0.11], at: [0.09 * s, 0.065, 0], base: NAVY },
    { id: `upperLeg${n}`, prim: "rbox", dims: [0.12, 0.1, 0.12], at: [0.09 * s, 0.155, 0], base: NAVY },
    { id: `upperArm${n}`, prim: "rbox", dims: [0.17, 0.17, 0.2], at: [0.335 * s, 0.49, 0], base: BEIGE },
    { id: `lowerArm${n}`, prim: "rbox", dims: [0.09, 0.1, 0.09], at: [0.345 * s, 0.39, 0], base: SKIN },
    { id: `hand${n}`, prim: "rbox", dims: [0.18, 0.2, 0.2], at: [0.355 * s, 0.19, 0.02], base: BEIGE },
  ];
  const grid = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) grid.push({ r, c, base: PIX[(r * 2 + c * 3) % PIX.length] });
  const px = ({ r, c, base }) => ({ prim: "box", dims: [0.04, 0.035, 0.012], at: [-0.104 + c * 0.052, 0.615 - r * 0.05 - 0.165, 0], base });
  const group = (k) => grid.filter((g) => (g.r * 5 + g.c * 7) % 3 === k).map(px);
  return {
    name: "golem",
    armSpread: 0.4,
    head: [0.28, 0.45],
    tree: {
      hips: [null, [0, 0.25, 0]],
      torso: ["hips", [0, 0.3, 0]],
      ...head(0.66),
      ...limbs("torso", [["upperArm", "torso", [0.33, 0.62, 0]], ["lowerArm", "upperArm", [0.345, 0.49, 0]], ["hand", "lowerArm", [0.355, 0.39, 0]]]),
      ...limbs("hips", [["upperLeg", "hips", [0.09, 0.25, 0]], ["lowerLeg", "upperLeg", [0.09, 0.155, 0]], ["foot", "lowerLeg", [0.09, 0.07, 0]]]),
    },
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "vent", joint: "upperArmR", face: true, prim: "box", dims: [0.08, 0.012, 0.07], at: [0.335, 0.655, 0.02], base: VENT },
      { id: "hips", prim: "rbox", dims: [0.34, 0.07, 0.24], at: [0, 0.24, 0], base: NAVY },
      { id: "torso", prim: "chain", base: BEIGE, at: [0, 0.3, 0], links: [
        { prim: "rbox", dims: [0.5, 0.36, 0.34], at: [0, 0, 0] },
        { prim: "box", dims: [0.506, 0.016, 0.346], at: [0, 0.1, 0], base: SEAM },
        { prim: "box", dims: [0.3, 0.22, 0.02], at: [0, 0.13, 0.175], base: SCREEN },
        { prim: "box", dims: [0.13, 0.024, 0.012], at: [-0.12, 0.04, 0.174], base: INK },
        { prim: "box", dims: [0.1, 0.012, 0.04], at: [-0.13, 0.355, 0.09], base: VENT },
      ] },
      { id: "pixels", joint: "torso", face: true, prim: "chain", base: PIX[0], at: [0, 0.3, 0.19], links: group(0) },
      { id: "pixA", joint: "torso", face: true, blink: [0.7, 0, 0.6], prim: "chain", base: PIX[1], at: [0, 0.3, 0.19], links: group(1) },
      { id: "pixB", joint: "torso", face: true, blink: [0.9, 0.5, 0.55], prim: "chain", base: PIX[2], at: [0, 0.3, 0.19], links: group(2) },
      { id: "ledG", joint: "torso", face: true, blink: [1.3, 0, 0.5], prim: "box", dims: [0.026, 0.026, 0.012], at: [0.15, 0.34, 0.174], base: "#5cff7a" },
      { id: "ledR", joint: "torso", face: true, blink: [1.3, 0.5, 0.5], prim: "box", dims: [0.026, 0.026, 0.012], at: [0.19, 0.34, 0.174], base: "#ff4a6a" },
      { id: "head", role: "head", prim: "rbox", dims: [0.32, 0.3, 0.3], at: [0, 0.66, 0], base: SKIN },
      { id: "hair", prim: "chain", base: HAIR, at: [0, 0.66, 0], links: [{ prim: "rbox", dims: [0.35, 0.08, 0.33], at: [0, 0.24, -0.01] }, { prim: "rbox", dims: [0.35, 0.17, 0.08], at: [0, 0.1, -0.135] }] },
      { id: "eyes", face: true, prim: "chain", base: INK, at: [0, 0.75, 0.153], links: [-1, 1].map((s) => ({ prim: "box", dims: [0.042, 0.07, 0.012], at: [0.068 * s, 0, 0] })) },
      { id: "mouth", face: true, prim: "box", dims: [0.06, 0.022, 0.012], at: [0, 0.71, 0.153], base: INK },
    ],
    clips: {
      idle: clip("idle", 3.2, 8, {
        "hips.position": (p) => [0, 0.004 + 0.004 * C(p), 0],
        "torso.quaternion": (p) => [-2 + 2 * C(p), 0, 1.5 * S(p)],
        "head.quaternion": (p) => [2 * S(2 * p), 12 * S(p), 0],
        "upperArmL.quaternion": (p) => [4 * S(p + 0.5), 0, -3 - 2 * C(p)],
        "upperArmR.quaternion": (p) => [4 * S(p + 1.1), 0, 3 + 2 * C(p)],
        "lowerArmL.quaternion": (p) => [-6 + 3 * S(p), 0, 0],
        "lowerArmR.quaternion": (p) => [-6 + 3 * S(p + 0.8), 0, 0],
      }),
      walk: clip("walk", 1.1, 8, {
        "hips.position": (p) => [0, 0.018 * Math.abs(C(p)) + 0.03 * Math.abs(S(p)), 0],
        "hips.quaternion": (p) => [0, 4 * S(p), 7 * S(p)],
        "torso.quaternion": (p) => [5, -7 * S(p), -3 * S(p)],
        "head.quaternion": (p) => [-3, 4 * S(p), -4 * S(p)],
        "upperLegL.quaternion": (p) => [24 * S(p), 0, 0], "lowerLegL.quaternion": (p) => [4 + 30 * Math.max(0, -C(p)), 0, 0], "footL.quaternion": (p) => [-6 * S(p), 0, 0],
        "upperLegR.quaternion": (p) => [-24 * S(p), 0, 0], "lowerLegR.quaternion": (p) => [4 + 30 * Math.max(0, C(p)), 0, 0], "footR.quaternion": (p) => [6 * S(p), 0, 0],
        "upperArmL.quaternion": (p) => [-22 * S(p), 0, -4 - 3 * Math.abs(S(p))],
        "upperArmR.quaternion": (p) => [22 * S(p), 0, 4 + 3 * Math.abs(S(p))],
        "lowerArmL.quaternion": (p) => [-10 - 8 * Math.max(0, S(p)), 0, 0],
        "lowerArmR.quaternion": (p) => [-10 - 8 * Math.max(0, -S(p)), 0, 0],
      }),
    },
  };
}

export const HEROES = { wanderer: wraith, aws: sentinel, dutchie: runner, nm: golem };
const ALIAS = { wretch: "wanderer" };
export const CLASS_KEY = "isoworld:class";

export function heroClass(params = {}, storage = globalThis.localStorage) {
  let v = params.class;
  if (v == null) try { v = storage?.getItem(CLASS_KEY); } catch {}
  v = ALIAS[v] || v;
  return HEROES[v] ? v : null;
}
