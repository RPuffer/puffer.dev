import * as THREE from "three";
import { uniformsFor, GLSL_COMMON } from "./common.js";

const VERT = `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = `
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec3 uRay;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform float uSteps;
uniform float uSigma;
uniform float uCover;
uniform float uGain;
uniform float uRimPad;
uniform float uStop;
varying vec3 vWorld;

float density(vec3 p) {
  float h = (p.y - uBoxMin.y) / (uBoxMax.y - uBoxMin.y);
  float prof = smoothstep(0.0, 0.14, h) * (1.0 - smoothstep(0.3, 1.0, h));
  float d = distance(p.xz, uCenter);
  float cov = uCover * mix(1.0, 0.7, smoothstep(uRadius, uRadius + 6.0, d)) * (1.0 - smoothstep(uRadius + 6.0, uRadius + 12.0, d));
  float mask = islandAt(p.xz).b;
  float inside = smoothstep(uRimPad, 0.5, mask) * smoothstep(uBase - 0.5, uBase + 0.1, p.y);
  vec3 wind = vec3(0.012, 0.0, 0.007) * uTime;
  vec2 n = texture(uNoise, p * vec3(0.075, 0.13, 0.075) + wind).rg;
  float shape = prof * cov * (1.0 - inside);
  float th = 1.0 - shape * 0.8;
  float dens = clamp((n.r - th) / max(1.0 - th, 0.05) * 1.6, 0.0, 1.0);
  float det = texture(uNoise, p * vec3(0.26, 0.34, 0.26) + wind * 2.3).g;
  dens = clamp(dens - (1.0 - det) * 0.45 * (1.0 - dens), 0.0, 1.0);
  return dens;
}

void main() {
  vec3 rd = uRay, ro = vWorld;
  vec3 inv = 1.0 / rd, t0 = (uBoxMin - ro) * inv, t1 = (uBoxMax - ro) * inv, tm = max(t0, t1);
  float tExit = min(min(tm.x, tm.y), tm.z);
  float dt = tExit / uSteps, j = hash12(gl_FragCoord.xy);
  vec3 shade = mix(uBg * 1.5 + 0.02, uHue * 0.3, 0.55);
  vec3 sun = mix(vec3(1.0), uHue, 0.16) * uGain;
  float T = 1.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 96; i++) {
    if (float(i) >= uSteps) break;
    vec3 p = ro + rd * (float(i) + j) * dt;
    vec4 c = islandCell(p.xz);
    if (p.y < c.r && p.y > c.g && islandAt(p.xz).b > uStop) break;
    float d = density(p);
    if (d > 0.003) {
      float dl = density(p + uLight * 0.45) + density(p + uLight * 1.1) * 0.5;
      float lt = exp(-dl * 3.2);
      float h = (p.y - uBoxMin.y) / (uBoxMax.y - uBoxMin.y);
      vec3 sc = mix(shade, sun, clamp(lt * (0.45 + 0.75 * h) + 0.05, 0.0, 1.0));
      sc = mix(sc, uBg, max(fogAt(p.xz), smoothstep(uBase - 0.4, uBase - 2.8, p.y) * 0.45) * 0.85);
      float a = 1.0 - exp(-d * dt * uSigma);
      col += T * a * sc;
      T *= 1.0 - a;
      if (T < 0.015) break;
    }
  }
  float alpha = 1.0 - T;
#ifdef HALF
  gl_FragColor = vec4(col, alpha);
#else
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(col / alpha, alpha);
  #include <colorspace_fragment>
#endif
}`;

const COMPOSITE = `
uniform sampler2D uTarget;
uniform vec2 uInv;
void main() {
  vec4 c = texture2D(uTarget, gl_FragCoord.xy * uInv);
  if (c.a < 0.003) discard;
  gl_FragColor = vec4(c.rgb / c.a, c.a);
  #include <colorspace_fragment>
}`;

export function buildVolume(I, noise, params = {}, { cover = 1, sigma = 8, rimPad = 0.3, order = 1, steps: defSteps = 28, res: defRes = 0.5 } = {}) {
  const pad = 11, top = I.base + 0.5 * I.T + 0.25, bot = I.base - 2.8;
  const min = new THREE.Vector3(I.box.x0 - pad, bot, I.box.z0 - pad), max = new THREE.Vector3(I.box.x1 + pad, top, I.box.z1 + pad);
  const geo = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z);
  geo.translate((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
  const steps = Math.max(4, Math.min(96, Number(params.csteps) || defSteps));
  const res = Math.max(0.25, Math.min(1, Number(params.cres) || defRes));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...uniformsFor(I),
      uNoise: { value: noise },
      uRay: { value: I.dir.clone().negate() },
      uBoxMin: { value: min }, uBoxMax: { value: max },
      uSteps: { value: steps }, uSigma: { value: sigma }, uCover: { value: cover }, uGain: { value: I.dark ? 0.9 : 1 }, uRimPad: { value: rimPad }, uStop: { value: res >= 1 ? 0.45 : 0.6 },
    },
    vertexShader: VERT,
    fragmentShader: GLSL_COMMON + FRAG,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.name = "clouds-volume";
  if (res >= 1) return { objects: [mesh], targets: [] };
  mat.defines = { HALF: 1 };
  mat.transparent = false;
  mat.blending = THREE.NoBlending;
  mat.depthTest = false;
  const offscreen = new THREE.Scene();
  offscreen.add(mesh);
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const inv = new THREE.Vector2(1, 1), size = new THREE.Vector2(), clear = new THREE.Color();
  const composite = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uTarget: { value: target.texture }, uInv: { value: inv } },
    vertexShader: VERT,
    fragmentShader: COMPOSITE,
    transparent: true,
    depthWrite: false,
  }));
  composite.frustumCulled = false;
  composite.renderOrder = order;
  composite.name = "clouds-volume-composite";
  composite.onBeforeRender = (r, scene, camera) => {
    r.getDrawingBufferSize(size);
    const w = Math.max(1, Math.round(size.x * res)), h = Math.max(1, Math.round(size.y * res));
    if (target.width !== w || target.height !== h) { target.setSize(w, h); inv.set(1 / size.x, 1 / size.y); }
    const prev = r.getRenderTarget(), alpha = r.getClearAlpha();
    r.getClearColor(clear);
    r.setRenderTarget(target);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.render(offscreen, camera);
    r.setRenderTarget(prev);
    r.setClearColor(clear, alpha);
  };
  return { objects: [composite], targets: [target] };
}

export function build(I, assets, params) {
  return buildVolume(I, assets.noise, params);
}

export const needs = ["noise"];
