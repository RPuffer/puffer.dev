import * as THREE from "three";
import { MATERIALS } from "../core/catalog.js";
import { PALETTE, HERO } from "./palette.js";

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

export function mergeOver(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) out[k] = isObj(v) && isObj(base[k]) ? { ...base[k], ...v } : v;
  return out;
}

export function swatchesOf(pal) {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) out.add(v.toLowerCase());
    else if (Array.isArray(v)) v.forEach(walk);
    else if (isObj(v)) Object.values(v).forEach(walk);
  };
  for (const [k, v] of Object.entries(pal)) if (k !== "bg" && k !== "hero") walk(v);
  return [...out];
}

function lightOf(l) {
  if (!l) return null;
  const d = new THREE.Vector3(...(Array.isArray(l.dir) && l.dir.length === 3 ? l.dir : [0.3, 1, 0.6])).normalize();
  return { dir: d, ambient: Number.isFinite(l.ambient) ? l.ambient : 0.6, sun: Number.isFinite(l.sun) ? l.sun : 0.4 };
}

export function makeStyle(level = {}) {
  const palette = mergeOver(PALETTE, level.palette);
  const materials = mergeOver(MATERIALS, level.materials);
  const hero = mergeOver(HERO, level.palette?.hero);
  return { palette, materials, hero, light: lightOf(level.light), bg: level.bg || palette.bg, swatches: swatchesOf(palette) };
}

export const lightFactor = (light, nx, ny, nz) => light.ambient + light.sun * Math.max(0, nx * light.dir.x + ny * light.dir.y + nz * light.dir.z);

const PACK = { dir: new THREE.Vector3(0.3, 1, 0.6).normalize(), ambient: 0.55, sun: 0.5 };
const PACK_TOP = lightFactor(PACK, 0, 1, 0);
export const BACK = 0.8;
export const packShade = (nx, ny, nz) => lightFactor(PACK, nx, ny, nz) / PACK_TOP * (1 - (1 - BACK) * Math.max(0, -nz) * (1 - Math.abs(ny)));

export function sideBand(nx, nz) {
  const H = Math.PI / 2, t = Math.atan2(nx, nz);
  if (t >= 0 && t <= H) return ["left", "right", t / H];
  if (t > H) return ["right", "back", (t - H) / H];
  if (t >= -H) return ["left", "right", -t / H];
  return ["right", "back", (-t - H) / H];
}

const toSrgb = (hex) => { const c = new THREE.Color(hex); c.convertLinearToSRGB(); return [c.r, c.g, c.b]; };

export function snapper(swatches) {
  const list = swatches.map((h) => ({ lin: new THREE.Color(h), srgb: toSrgb(h) }));
  const probe = new THREE.Color();
  return (color) => {
    probe.copy(color).convertLinearToSRGB();
    let best = null, bd = Infinity;
    for (const s of list) {
      const dr = probe.r - s.srgb[0], dg = probe.g - s.srgb[1], db = probe.b - s.srgb[2];
      const d = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (d < bd) { bd = d; best = s; }
    }
    return best ? color.copy(best.lin) : color;
  };
}
