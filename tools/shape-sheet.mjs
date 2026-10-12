import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SHAPES, FAMILIES, validateLibrary, parseShape, transformShape } from "../core/layout/shapes/index.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "out/layout-variety");
const panelDir = path.join(outDir, "shapes");
fs.mkdirSync(panelDir, { recursive: true });

const lib = validateLibrary();
for (const p of lib.problems) console.log(`FAIL ${p}`);
for (const r of lib.results) if (r.ok) console.log(`PASS ${r.shape.id} land ${r.stats.land} landmasses ${r.stats.landmasses} walk ${r.stats.route} variants ${r.stats.transforms.length}`);
const s = lib.stats;
console.log(`\n${s.shapes} shapes, ${s.multi} multi-landmass, ${s.families} families, ${s.variants} variants; centrepieces per ninth ${s.ninths.join(" ")}`);
console.log(Object.entries(s.perFamily).map(([f, n]) => `${f} ${n}`).join(", "));

const U = 30, PW = 440, PH = 580, MAPY = 70, MAPH = 12 * U;
const FONT = "Helvetica, Arial, sans-serif";
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const MASS = ["#5f8f4e", "#4f7fa8", "#a8794f", "#8a5fa8"];
const ROLE = { connector: "#3fd0e0", shortcut: "#ff9a2e", reward: "#4fe08a" };
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};
const ZONE = { 1: 0.85, 2: 1.05, 3: 1.25, 4: 1.45 };

function mapSvg(shape, ox, oy, u, opts = {}) {
  const P = parseShape(shape);
  let g = "";
  for (let z = 0; z < P.H; z++) for (let x = 0; x < P.W; x++) {
    const key = x + "," + z;
    if (!P.land.has(key)) continue;
    const m = P.landmassOf.get(key), zn = P.zone.get(key);
    const fill = shade(MASS[m % MASS.length], zn ? ZONE[zn] : 1);
    g += `<rect x="${ox + x * u}" y="${oy + z * u}" width="${u}" height="${u}" fill="${fill}" stroke="#0b0d10" stroke-width="${opts.small ? 0.3 : 1}"/>`;
    if (zn && !opts.small) g += `<text x="${ox + x * u + u - 4}" y="${oy + z * u + 11}" text-anchor="end" font-size="9" fill="#0b0d10" font-family="${FONT}">${zn}</text>`;
  }
  if (opts.small) {
    const dot = (p, col) => `<circle cx="${ox + (p[0] + 0.5) * u}" cy="${oy + (p[1] + 0.5) * u}" r="${u * 0.55}" fill="${col}"/>`;
    g += dot(P.keys.entry, "#ff6bd6") + P.keys.centrepieces.map((c) => dot(c, "#ffffff")).join("");
    return g;
  }
  const c = (p) => [ox + (p[0] + 0.5) * u, oy + (p[1] + 0.5) * u];
  for (const p of Object.values(P.pads)) {
    const [a, b] = [c(p.near), c(p.far)];
    g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${ROLE[p.role]}" stroke-width="3" stroke-dasharray="7 5" opacity="0.9"/>`;
  }
  const mark = (p, col, lab, r = 0.42, tc = "#000") => { const [cx, cy] = c(p); return `<circle cx="${cx}" cy="${cy}" r="${u * r}" fill="${col}" stroke="#000" stroke-width="1.5"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="${tc}" font-family="${FONT}">${lab}</text>`; };
  for (const p of Object.values(P.pads)) g += mark(p.near, ROLE[p.role], p.id, 0.38) + mark(p.far, ROLE[p.role], p.id.toUpperCase(), 0.38);
  for (const r of P.keys.rewards) g += mark(r, "#4fe08a", "$", 0.36);
  g += mark(P.keys.bonfire, "#ffd23f", "B");
  for (const cp of P.keys.centrepieces) g += mark(cp, "#ffffff", "C", 0.48);
  g += mark(P.keys.entry, "#ff6bd6", "S") + mark(P.keys.exit, "#ff6bd6", "E");
  return g;
}

function panel(r, ox, oy) {
  const sh = r.shape, st = r.stats;
  const P = parseShape(sh);
  const mx = ox + (PW - P.W * U) / 2, my = oy + MAPY + (MAPH - P.H * U) / 2;
  let g = `<rect x="${ox}" y="${oy}" width="${PW}" height="${PH}" fill="#14171c" rx="6"/>`;
  g += `<text x="${ox + 14}" y="${oy + 26}" fill="#fff" font-size="19" font-weight="bold" font-family="${FONT}">${esc(sh.id)}</text>`;
  g += `<text x="${ox + 14}" y="${oy + 47}" fill="#9fc3e0" font-size="13" font-family="${FONT}">${esc(sh.family)} · ${st.landmasses} landmass${st.landmasses > 1 ? "es" : ""} · ${esc(sh.archetypes.join(", "))}</text>`;
  g += `<rect x="${mx - 2}" y="${my - 2}" width="${P.W * U + 4}" height="${P.H * U + 4}" fill="none" stroke="#2a3038"/>`;
  g += `<line x1="${mx - 2}" y1="${my + P.H * U + 3}" x2="${mx + P.W * U + 3}" y2="${my + P.H * U + 3}" stroke="#ff6bd6" stroke-width="2" opacity="0.5"/>`;
  g += `<line x1="${mx + P.W * U + 3}" y1="${my - 2}" x2="${mx + P.W * U + 3}" y2="${my + P.H * U + 3}" stroke="#ff6bd6" stroke-width="2" opacity="0.5"/>`;
  g += mapSvg(sh, mx, my, U);
  const roles = Object.values(P.pads).map((p) => `${p.id}: ${p.role}`).join(" · ");
  g += `<text x="${ox + 14}" y="${oy + MAPY + MAPH + 20}" fill="#ccc" font-size="12" font-family="${FONT}">${st.land} units land · walk S to C to E ${st.route} · ${st.transforms.length} variants</text>`;
  if (roles) g += `<text x="${ox + 14}" y="${oy + MAPY + MAPH + 36}" fill="#ccc" font-size="12" font-family="${FONT}">pads ${esc(roles)}</text>`;
  const tu = 4, ty = oy + MAPY + MAPH + 46;
  let tx = ox + 14;
  for (const t of st.transforms) {
    const T = parseShape(transformShape(sh, t));
    if (tx + T.W * tu > ox + PW - 8) break;
    g += mapSvg(transformShape(sh, t), tx, ty, tu, { small: true });
    g += `<text x="${tx}" y="${ty + T.H * tu + 11}" fill="#889" font-size="9" font-family="${FONT}">${t}</text>`;
    tx += Math.max(T.W * tu, 22) + 10;
  }
  return g;
}

const legend = (x, y) => {
  const items = [["#ff6bd6", "S entry / E exit lift"], ["#ffffff", "C centrepiece"], ["#ffd23f", "B bonfire"], ["#4fe08a", "$ reward"], [ROLE.connector, "connector pads"], [ROLE.shortcut, "shortcut pads"], [ROLE.reward, "reward pads"]];
  return items.map(([c, t], i) => `<circle cx="${x + i * 170 + 8}" cy="${y - 4}" r="7" fill="${c}" stroke="#000"/><text x="${x + i * 170 + 20}" y="${y}" fill="#ccc" font-size="13" font-family="${FONT}">${esc(t)}</text>`).join("");
};

const ordered = FAMILIES.flatMap((f) => lib.results.filter((r) => r.shape.family === f));
for (const r of ordered) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}"><rect width="100%" height="100%" fill="#0b0d10"/>${panel(r, 0, 0)}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(panelDir, `${r.shape.id}.png`));
}
const COLS = 6, rows = Math.ceil(ordered.length / COLS), HEAD = 96;
const SW = COLS * (PW + 10) + 10, SH = HEAD + rows * (PH + 10) + 10;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="100%" height="100%" fill="#0b0d10"/>`;
svg += `<text x="12" y="30" fill="#fff" font-size="24" font-weight="bold" font-family="${FONT}">Shape library: ${s.shapes} shapes, ${s.multi} multi-landmass, ${s.families} families, ${s.variants} transform variants</text>`;
svg += `<text x="12" y="54" fill="#bbb" font-size="14" font-family="${FONT}">Top down, one square = one shape unit (3x3 cells). Land tint = landmass, lighter = higher zone (digit). Pink edges = near rims (camera side). Thumbnails = allowed rotations and mirrors.</text>`;
svg += legend(12, 82);
ordered.forEach((r, i) => { svg += panel(r, 10 + (i % COLS) * (PW + 10), HEAD + Math.floor(i / COLS) * (PH + 10)); });
svg += "</svg>";
await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, "shape-sheet.png"));
console.log(`\nwrote out/layout-variety/shape-sheet.png and ${ordered.length} panels in out/layout-variety/shapes/`);
process.exitCode = lib.ok ? 0 : 1;
