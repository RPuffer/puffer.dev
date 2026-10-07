import * as THREE from "three";
import { uniformsFor, GLSL_COMMON, scatter, rimPoints, underPoints, depthOf } from "./common.js";

const VERT = `
attribute vec4 aData;
uniform vec2 uAtlas;
uniform float uFlip;
varying vec2 vUv;
varying vec2 vQ;
varying vec3 vWorld;
varying vec3 vCenter;
varying float vAlpha;
void main() {
  vec3 c = instanceMatrix[3].xyz;
  float s = length(instanceMatrix[0].xyz);
  float ph = aData.y;
  c += vec3(sin(uTime * 0.13 + ph) * 0.3, sin(uTime * 0.21 + ph * 1.7) * 0.05, cos(uTime * 0.1 + ph * 0.6) * 0.3);
  vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float a = aData.z + sin(uTime * 0.07 + ph) * 0.04;
  vec2 q = mat2(cos(a), sin(a), -sin(a), cos(a)) * position.xy * (1.0 + 0.03 * sin(uTime * 0.17 + ph * 2.3));
  vec3 w = c + (R * q.x + U * q.y) * s;
  vWorld = w;
  vCenter = c;
  vQ = position.xy * 2.0;
  vAlpha = aData.w;
  float tile = aData.x;
  vec2 cell = vec2(mod(tile, uAtlas.x), floor(tile / uAtlas.x));
  vec2 t = uv;
  if (uFlip > 0.5) t.x = 1.0 - t.x;
  vUv = vec2((cell.x + t.x) / uAtlas.x, 1.0 - (cell.y + 1.0 - t.y) / uAtlas.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FRAG = `
uniform sampler2D uAtlasTex;
uniform float uGain;
varying vec2 vUv;
varying vec2 vQ;
varying vec3 vWorld;
varying vec3 vCenter;
varying float vAlpha;
void main() {
  vec4 t = texture2D(uAtlasTex, vUv);
  float a = t.a * vAlpha;
  if (a < 0.004) discard;
  float side = dot(vQ, uLightScreen);
  float lit = clamp(t.r * 1.1 + side * 0.16, 0.0, 1.0);
  vec3 shade = mix(uBg * 1.5 + 0.02, uHue * 0.32, 0.55);
  vec3 sun = mix(vec3(1.0), uHue, 0.16) * uGain;
  vec3 col = mix(shade, sun, lit * lit * (3.0 - 2.0 * lit));
  float mask = islandAt(vWorld.xz).b;
  a *= 1.0 - smoothstep(0.36, 0.5, mask) * smoothstep(uBase - 0.35, uBase, vWorld.y);
  float f = max(fogAt(vCenter.xz), smoothstep(uBase - 0.4, uBase - 2.6, vCenter.y) * 0.55);
  col = mix(col, uBg, f * 0.85);
  a *= fadeAt(vCenter.xz);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

export async function loadAtlas() {
  const base = new URL("../assets/clouds/", import.meta.url);
  const [tex, meta] = await Promise.all([
    new THREE.TextureLoader().loadAsync(new URL("atlas.webp", base).href),
    fetch(new URL("atlas.json", base)).then((r) => r.json()),
  ]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  return { tex, meta };
}

const pick = (meta, kinds, r) => {
  const ids = meta.tiles.map((t, i) => (kinds.includes(t.kind) ? i : -1)).filter((i) => i >= 0);
  return ids[Math.min(ids.length - 1, Math.floor(r * ids.length))];
};

export function layout(I, meta) {
  const rng = I.rng("billboards"), out = [], B = I.base, T = I.T;
  for (const p of rimPoints(I, rng, { every: 1, outset: 0.75 })) out.push({ x: p.x, y: p.bot + 0.1 + rng() * 0.25 * T, z: p.z, s: 2.2 + rng() * 0.8, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 0.95 });
  for (const p of underPoints(I, rng, { step: 2.2, y0: B - 1.7, y1: B - 0.7 })) out.push({ x: p.x, y: p.y, z: p.z, s: 3.2 + rng() * 1.2, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 1 });
  for (const p of scatter(I, rng, { count: 70, inner: I.radius * 0.75, outer: I.radius + 5, yMin: B - 1.2, yMax: B + 0.1, minGap: 1.1 })) out.push({ x: p.x, y: p.y, z: p.z, s: 2.6 + rng() * 1.4, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 1 });
  for (const p of scatter(I, rng, { count: 70, inner: I.radius + 3, outer: I.radius + 11, yMin: B - 2.2, yMax: B - 0.6, minGap: 1.8 })) out.push({ x: p.x, y: p.y, z: p.z, s: 3.6 + rng() * 2, tile: pick(meta, ["flat", "tuft"], rng()), alpha: 1 });
  return out;
}

export function buildSprites(I, atlas, list, gain) {
  list.sort((a, b) => depthOf(I, a) - depthOf(I, b));
  const geo = new THREE.PlaneGeometry(1, 1);
  const data = new Float32Array(list.length * 4);
  const mesh = new THREE.InstancedMesh(geo, null, list.length);
  const m = new THREE.Matrix4(), rng = I.rng("sprite-phase");
  list.forEach((p, i) => {
    m.makeScale(p.s, p.s, p.s).setPosition(p.x, p.y, p.z);
    mesh.setMatrixAt(i, m);
    data.set([p.tile, rng() * 6.2832, (rng() - 0.5) * 0.25, p.alpha], i * 4);
  });
  geo.setAttribute("aData", new THREE.InstancedBufferAttribute(data, 4));
  mesh.material = new THREE.ShaderMaterial({
    uniforms: { ...uniformsFor(I), uAtlasTex: { value: atlas.tex }, uAtlas: { value: new THREE.Vector2(...atlas.meta.grid) }, uFlip: { value: I.lightScreen.x > 0.15 ? 1 : 0 }, uGain: { value: gain } },
    vertexShader: GLSL_COMMON + VERT,
    fragmentShader: GLSL_COMMON + FRAG,
    transparent: true,
    depthWrite: false,
  });
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = "clouds-billboards";
  return mesh;
}

export function build(I, atlas) {
  return [buildSprites(I, atlas, layout(I, atlas.meta), I.gain)];
}
