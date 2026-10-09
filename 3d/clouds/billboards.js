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
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
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
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
  const mult = Math.max(0.25, +(q.get("cloudx") || 1)), back = q.get("cloudback") === "1";
  for (const p of rimPoints(I, rng, { every: 1, outset: 0.75 })) out.push({ x: p.x, y: p.bot + 0.1 + rng() * 0.25 * T, z: p.z, s: 2.2 + rng() * 0.8, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 0.95 });
  for (const p of underPoints(I, rng, { step: 2.2, y0: B - 1.7, y1: B - 0.7 })) out.push({ x: p.x, y: p.y, z: p.z, s: 3.2 + rng() * 1.2, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 1 });
  for (const p of scatter(I, rng, { count: Math.round(70 * mult), inner: I.radius * 0.75, outer: I.radius + 3.5, yMin: B - 1.2, yMax: B + 0.1, minGap: 1.1 / Math.sqrt(mult) })) out.push({ x: p.x, y: p.y, z: p.z, s: 2.6 + rng() * 1.4, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 1 });
  for (const p of scatter(I, rng, { count: Math.round(70 * mult), inner: I.radius + 2, outer: I.radius + 7.5, yMin: B - 2.2, yMax: B - 0.6, minGap: 1.8 / Math.sqrt(mult) })) out.push({ x: p.x, y: p.y, z: p.z, s: 3.6 + rng() * 2, tile: pick(meta, ["flat", "tuft"], rng()), alpha: 1 });
  if (back) for (const p of scatter(I, rng, { count: 36, inner: I.radius + 2, outer: I.radius + 18, yMin: B - 6, yMax: B - 3.5, minGap: 4 })) out.push({ x: p.x, y: p.y, z: p.z, s: 8 + rng() * 5, tile: pick(meta, ["tuft", "flat"], rng()), alpha: 0.9 });
  return out;
}

export function buildSprites(I, atlas, list, gain) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const data = new Float32Array(list.length * 4);
  const mesh = new THREE.InstancedMesh(geo, null, list.length);
  const m = new THREE.Matrix4(), rng = I.rng("sprite-phase");
  list.sort((a, b) => depthOf(I, a) - depthOf(I, b));
  for (const p of list) { p.ph = rng() * 6.2832; p.rot = (rng() - 0.5) * 0.25; }
  const aData = new THREE.InstancedBufferAttribute(data, 4);
  geo.setAttribute("aData", aData);
  const lay = (dir) => {
    list.sort((a, b) => (a.x * dir.x + a.y * dir.y + a.z * dir.z) - (b.x * dir.x + b.y * dir.y + b.z * dir.z));
    list.forEach((p, i) => {
      m.makeScale(p.s, p.s, p.s).setPosition(p.x, p.y, p.z);
      mesh.setMatrixAt(i, m);
      data.set([p.tile, p.ph, p.rot, p.alpha], i * 4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    aData.needsUpdate = true;
  };
  lay(I.dir);
  mesh.userData.orient = (proj) => {
    const dir = new THREE.Vector3(...proj.dir), right = new THREE.Vector3(...proj.right), up = new THREE.Vector3(...proj.up);
    lay(dir);
    const u = mesh.material.uniforms;
    u.uLightScreen.value = new THREE.Vector2(I.light.dot(right), I.light.dot(up)).normalize();
    u.uFlip.value = u.uLightScreen.value.x > 0.15 ? 1 : 0;
  };
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

export const COLUMN = { count: 24, span: 18, speed: 7, radius: [2.6, 6.5], size: [1.1, 2.2], alpha: 0.55 };

const COLUMN_VERT = `
uniform vec2 uAtlas; uniform float uRide; uniform float uRideTime; uniform float uRideDir; uniform vec3 uColumn;
attribute vec4 aC; attribute vec2 aD;
varying vec2 vUv; varying vec2 vQ;
void main() {
  vec3 c = vec3(cos(aC.x) * aC.y, mod(aC.z - uRideTime * uColumn.y * aD.y * uRideDir, uColumn.x) - uColumn.x * 0.5, sin(aC.x) * aC.y);
  vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec2 q = position.xy * vec2(aC.w, aC.w * (1.0 + 1.4 * uRide));
  vec3 w = c + R * q.x + U * q.y;
  vQ = position.xy * 2.0;
  vec2 cell = vec2(mod(aD.x, uAtlas.x), floor(aD.x / uAtlas.x));
  vUv = vec2((cell.x + uv.x) / uAtlas.x, 1.0 - (cell.y + 1.0 - uv.y) / uAtlas.y);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
}`;

const COLUMN_FRAG = `
uniform sampler2D uAtlasTex; uniform vec3 uBg; uniform vec3 uHue; uniform float uGain; uniform float uRide; uniform vec3 uColumn;
varying vec2 vUv; varying vec2 vQ;
void main() {
  vec4 t = texture2D(uAtlasTex, vUv);
  float a = t.a * uRide * uColumn.z;
  if (a < 0.004) discard;
  float lit = clamp(t.r * 1.1, 0.0, 1.0);
  vec3 shade = mix(uBg * 1.5 + 0.02, uHue * 0.32, 0.55);
  vec3 sun = mix(vec3(1.0), uHue, 0.16) * uGain;
  gl_FragColor = vec4(mix(shade, sun, lit * lit * (3.0 - 2.0 * lit)), a);
  #include <colorspace_fragment>
}`;

export function buildColumn(atlas, rideUniforms, rng) {
  const N = COLUMN.count, geo = new THREE.PlaneGeometry(1, 1);
  const aC = new Float32Array(N * 4), aD = new Float32Array(N * 2);
  const tiles = atlas.meta.tiles.map((t, i) => (t.kind !== "flat" ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i < N; i++) {
    const r = COLUMN.radius[0] + (COLUMN.radius[1] - COLUMN.radius[0]) * rng();
    aC.set([rng() * Math.PI * 2, r, (i + rng() * 0.8) * COLUMN.span / N, COLUMN.size[0] + (COLUMN.size[1] - COLUMN.size[0]) * rng()], i * 4);
    aD.set([tiles[Math.floor(rng() * tiles.length)], 0.75 + 0.5 * rng()], i * 2);
  }
  geo.setAttribute("aC", new THREE.InstancedBufferAttribute(aC, 4));
  geo.setAttribute("aD", new THREE.InstancedBufferAttribute(aD, 2));
  const tone = { uBg: { value: new THREE.Color() }, uHue: { value: new THREE.Color() }, uGain: { value: 1 } };
  const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
    uniforms: { ...rideUniforms, ...tone, uAtlasTex: { value: atlas.tex }, uAtlas: { value: new THREE.Vector2(...atlas.meta.grid) }, uColumn: { value: new THREE.Vector3(COLUMN.span, COLUMN.speed, COLUMN.alpha) } },
    vertexShader: COLUMN_VERT,
    fragmentShader: COLUMN_FRAG,
    transparent: true,
    depthWrite: false,
  }), N);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.name = "clouds-column";
  mesh.visible = false;
  return { mesh, tone };
}
