import * as THREE from "three";
import { scatter, rimPoints, underPoints, uniformsFor, GLSL_COMMON } from "./common.js";

export function ballLayout(I, { density = 1, rimScale = 1 } = {}) {
  const rng = I.rng("balls"), out = [], B = I.base;
  const add = (x, y, z, r, sy = 0.72) => out.push({ x, y, z, r, sy });
  for (const p of rimPoints(I, rng, { every: 1, outset: 0.5, jitter: 0.2 })) {
    const r = (0.5 + rng() * 0.22) * rimScale, tx = p.nz, tz = p.nx;
    add(p.x, p.bot + 0.12, p.z, r);
    if (rng() < 0.7) add(p.x + tx * (rng() - 0.5) * 0.9 + p.nx * 0.25, p.bot + 0.3 + rng() * 0.15, p.z + tz * (rng() - 0.5) * 0.9 + p.nz * 0.25, r * (0.55 + rng() * 0.2));
  }
  for (const p of underPoints(I, rng, { step: 2.2, y0: B - 1.2, y1: B - 0.6 })) add(p.x, p.y, p.z, 1.1 + rng() * 0.4, 0.6);
  for (const p of scatter(I, rng, { count: Math.round(55 * density), inner: I.radius * 0.75, outer: I.radius + 5.5, yMin: B - 1.0, yMax: B - 0.2, minGap: 1.3 })) {
    const r = 0.75 + rng() * 0.45;
    add(p.x, p.y, p.z, r);
    for (let k = 0; k < 2; k++) { const a = rng() * 6.283; add(p.x + Math.cos(a) * r * 0.8, p.y + 0.15 + rng() * 0.25, p.z + Math.sin(a) * r * 0.8, r * (0.45 + rng() * 0.25)); }
  }
  for (const p of scatter(I, rng, { count: Math.round(45 * density), inner: I.radius + 3.5, outer: I.radius + 11, yMin: B - 2.0, yMax: B - 0.9, minGap: 1.9 })) {
    const r = 1.0 + rng() * 0.6;
    add(p.x, p.y, p.z, r, 0.6);
    const a = rng() * 6.283;
    add(p.x + Math.cos(a) * r * 0.7, p.y + 0.2, p.z + Math.sin(a) * r * 0.7, r * 0.55);
  }
  return out;
}

const VERT = `
uniform float uGrow;
uniform float uDrift;
varying vec3 vN;
varying vec3 vW;
varying vec3 vC;
void main() {
  vec3 c = instanceMatrix[3].xyz;
  vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  float ph = hash12(floor(c.xz * 7.0)) * 6.2832;
  c += uDrift * vec3(sin(uTime * 0.23 + ph), 0.35 * sin(uTime * 0.31 + ph * 1.3), cos(uTime * 0.19 + ph));
  vec3 w = c + position * (s + uGrow);
  vN = normalize(position / s);
  vW = w;
  vC = c;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

export const GLSL_NOISE = `
float vhash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(vhash(i), vhash(i + vec3(1, 0, 0)), f.x), mix(vhash(i + vec3(0, 1, 0)), vhash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(vhash(i + vec3(0, 0, 1)), vhash(i + vec3(1, 0, 1)), f.x), mix(vhash(i + vec3(0, 1, 1)), vhash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;

export function buildBalls(I, list, { frag, uniforms = {}, detail = 2, grow = 0, side = THREE.FrontSide, drift = 0.12, name = "clouds-balls", order = 0 }) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute("uv");
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...uniformsFor(I), uGrow: { value: grow }, uDrift: { value: drift }, uView: { value: I.dir }, ...uniforms },
    vertexShader: GLSL_COMMON + VERT,
    fragmentShader: GLSL_COMMON + GLSL_NOISE + "uniform vec3 uView;\nvarying vec3 vN;\nvarying vec3 vW;\nvarying vec3 vC;\n" + frag,
    side,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  const m = new THREE.Matrix4();
  list.forEach((p, i) => { m.makeScale(p.r, p.r * p.sy, p.r).setPosition(p.x, p.y, p.z); mesh.setMatrixAt(i, m); });
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.name = name;
  return mesh;
}

export const color = (hex) => new THREE.Color(hex);
