import * as THREE from "three";
import { readParams } from "../core/game.js";
import { CATALOG } from "../core/catalog.js";
import { loadPieces, loadGlbs } from "./hooks.js";
import { makeStyle } from "./style.js";
import { buildDecor } from "./decor.js";
import { DEFAULT_VIEW } from "../core/iso.js";

export const PORTRAIT = { w: 300, h: 267, ss: 3, fill: 0.74, ink: "#2a1f33", outline: 2.6 };

const mix = (a, b, t) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const chroma = (hex) => { const c = new THREE.Color(hex); return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b); };
const lum = (hex) => { const c = new THREE.Color(hex); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; };

export function focalOf(raw) {
  const decor = raw.decor || [];
  const lead = decor.find((d) => d.watch && CATALOG[d.t]);
  if (lead) return lead;
  return decor.filter((d) => CATALOG[d.t]).sort((a, b) => (CATALOG[b.t].height || 1) - (CATALOG[a.t].height || 1))[0] || null;
}

function stage(raw, focal) {
  const spec = CATALOG[focal.t];
  const [fw, fd] = spec.footprint;
  const size = [fw + 2, fd + 2];
  const cells = Array.from({ length: size[1] }, () => Array.from({ length: size[0] }, () => ({ h: 0, s: "none" })));
  return { ...raw, size, cells, decor: [{ t: focal.t, x: 1, z: 1, v: focal.v || 0, rot: 0, ox: 0, oz: 0 }], things: [] };
}

function shoot(group, w, h) {
  const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  gl.setPixelRatio(1);
  gl.setSize(w, h, false);
  gl.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(group);
  const pitch = THREE.MathUtils.degToRad(DEFAULT_VIEW.pitch), yaw = THREE.MathUtils.degToRad(DEFAULT_VIEW.yaw);
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const box = new THREE.Box3().setFromObject(group), mid = box.getCenter(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  camera.position.copy(mid).addScaledVector(dir, 200);
  camera.up.set(0, 1, 0);
  camera.lookAt(mid);
  camera.updateMatrixWorld();
  const pts = [];
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    const p = o.geometry?.attributes?.position;
    if (!p) return;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 1) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse).clone());
  });
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const half = Math.max(x1 - x0, (y1 - y0)) / 2 / PORTRAIT.fill;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, aspect = w / h;
  camera.left = cx - half * aspect; camera.right = cx + half * aspect;
  camera.top = cy + half; camera.bottom = cy - half;
  camera.updateProjectionMatrix();
  gl.render(scene, camera);
  const foot = new THREE.Vector3(mid.x, box.min.y, mid.z).project(camera);
  return { canvas: gl.domElement, foot: [(foot.x + 1) / 2 * w, (1 - foot.y) / 2 * h], span: (x1 - x0) / (2 * half * aspect) * w };
}

function tinted(src, color) {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function paletteOf(style) {
  const P = style.palette, bg = style.bg;
  const disc = ["grass", "sand", "dirt"].map((k) => P[k]?.top).filter(Boolean).sort((a, b) => chroma(b) * (b === P.grass?.top ? 1.6 : 1) - chroma(a) * (a === P.grass?.top ? 1.6 : 1))[0] || "#8fd6c4";
  const dark = lum(bg) < 0.45;
  return {
    outer: mix(bg, "#000000", dark ? 0.25 : 0.12),
    edge: mix(disc, bg, 0.55),
    disc: mix(disc, "#ffffff", 0.18),
    core: mix(disc, "#ffffff", 0.4),
    rim: mix(disc, "#ffffff", 0.8),
  };
}

function compose(shot, pal) {
  const { w, h, ss } = PORTRAIT, W = w * ss, H = h * ss;
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const g = out.getContext("2d");
  const cx = W / 2, cy = H / 2, R = H * 0.5;
  g.fillStyle = pal.outer;
  g.fillRect(0, 0, W, H);
  const disc = g.createRadialGradient(cx - R * 0.25, cy - R * 0.35, R * 0.05, cx, cy, R);
  disc.addColorStop(0, pal.core);
  disc.addColorStop(0.55, pal.disc);
  disc.addColorStop(1, pal.edge);
  g.fillStyle = disc;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  const [fx, fy] = shot.foot;
  g.save();
  g.fillStyle = "rgba(20,16,30,0.22)";
  g.beginPath(); g.ellipse(fx, fy, shot.span * 0.42, shot.span * 0.12, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  g.save();
  g.filter = `blur(${7 * ss}px)`;
  g.globalAlpha = 0.95;
  g.drawImage(tinted(shot.canvas, pal.rim), 0, 0);
  g.restore();
  const ink = tinted(shot.canvas, PORTRAIT.ink), o = PORTRAIT.outline * ss;
  for (let a = 0; a < 16; a++) g.drawImage(ink, Math.cos(a / 16 * Math.PI * 2) * o, Math.sin(a / 16 * Math.PI * 2) * o);
  g.drawImage(shot.canvas, 0, 0);
  const small = document.createElement("canvas");
  small.width = w; small.height = h;
  const s = small.getContext("2d");
  s.imageSmoothingQuality = "high";
  s.drawImage(out, 0, 0, w, h);
  return small;
}

export async function renderPortrait(name) {
  const safe = String(name || "").replace(/[^a-z0-9_-]/gi, "");
  const raw = await (await fetch(new URL(`../levels/${safe}.json`, import.meta.url))).json();
  await loadPieces(raw);
  const style = makeStyle(raw);
  const focal = focalOf(raw);
  if (!focal) throw new Error(`${safe}: no focal decor`);
  const L = stage(raw, focal);
  await loadGlbs(L, style);
  const { group } = buildDecor(L, { tileH: 1 }, style);
  const { w, h, ss } = PORTRAIT;
  const shot = shoot(group, w * ss, h * ss);
  const pic = compose(shot, paletteOf(style));
  document.body.style.background = "#404040";
  pic.style.cssText = `width:${w}px;height:${h}px;display:block;margin:auto`;
  document.body.appendChild(pic);
  window.__portrait = { level: safe, focal: focal.t, url: pic.toDataURL("image/png") };
  window.__done = true;
}

const params = readParams();
renderPortrait(params.level).catch((e) => { console.error(e); window.__error = String(e.message || e); window.__done = true; });
