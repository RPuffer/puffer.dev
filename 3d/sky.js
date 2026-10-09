import * as THREE from "three";
import { motion } from "./motion.js";
import { rideUniforms } from "../core/sequence.js";

export const SKY_BG = "#0d0b1f";
export function skyMode(search = typeof location !== "undefined" ? location.search : "") {
  const v = new URLSearchParams(search).get("sky");
  return v === "procedural" || v === "image" ? v : "none";
}
export const SKY = skyMode();

const VERT = `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = `
uniform vec2 uRes;
uniform float uTime, uYaw, uLift, uImage, uAspect;
uniform vec2 uPan;
uniform float uRide, uRideT, uRideDir;
uniform sampler2D uTex;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
vec3 stars(vec2 q, float cells, float dens, float px, float seed, float sparkle) {
  vec2 p = q * cells, c = floor(p), f = fract(p) - 0.5;
  float r1 = h21(c + seed), r2 = h21(c + seed + 17.3);
  if (r1 > dens) return vec3(0.0);
  vec2 d = f - (vec2(r1 / dens, r2) - 0.5) * 0.7;
  float stretch = 1.0 + uRide * 6.0 * (0.5 + r2);
  d.y /= stretch;
  float rad = px * (0.6 + 0.8 * r2) * cells / uRes.y;
  float tw = 0.55 + 0.45 * sin(uTime * (0.8 + 2.6 * r2) + r1 * 60.0);
  float core = smoothstep(rad, rad * 0.25, length(d));
  float spark = 0.0;
  if (sparkle > 0.0 && r2 > 0.82) {
    vec2 a = abs(d) / (rad * 5.0);
    spark = sparkle * max(0.0, 1.0 - a.x) * max(0.0, 1.0 - a.y * 9.0) + sparkle * max(0.0, 1.0 - a.y) * max(0.0, 1.0 - a.x * 9.0);
  }
  vec3 tint = mix(vec3(0.85, 0.9, 1.0), mix(vec3(1.0, 0.82, 0.62), vec3(0.78, 0.7, 1.0), step(0.5, fract(r2 * 13.0))), 0.6);
  return tint * (core + spark) * tw;
}

void main() {
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 drift = vec2(uYaw / 360.0 * 0.6, 0.0);
  float fall = uRideT * 0.35 * uRideDir;
  vec3 col = mix(vec3(0.075, 0.055, 0.15), vec3(0.025, 0.02, 0.07), smoothstep(-0.6, 0.6, q.y));
  if (uImage > 0.5) {
    vec2 o = q + drift * 0.6 + uPan * 0.5;
    vec2 tc = vec2(0.5 + o.x * 0.9 / uAspect, clamp(0.5 + o.y * 0.9, 0.0, 1.0));
    col = texture2D(uTex, tc).rgb;
  } else {
    vec2 n = q + drift * 0.5 + uPan * 0.45;
    float w = fbm(n * 1.4 + vec2(uTime * 0.006, 0.0));
    float band = exp(-pow((n.y + 0.18 * sin(n.x * 2.1 + 1.3) + 0.05) * 2.4, 2.0));
    float m = w * (0.45 + 0.75 * band);
    float v = smoothstep(0.38, 0.40, m) * 0.32 + smoothstep(0.50, 0.52, m) * 0.28 + smoothstep(0.62, 0.64, m) * 0.24;
    float hue = fbm(n * 0.9 + vec2(5.2, 1.3));
    vec3 neb = mix(vec3(0.30, 0.17, 0.52), vec3(0.11, 0.42, 0.47), smoothstep(0.42, 0.62, hue));
    neb = mix(neb, vec3(0.80, 0.40, 0.24), smoothstep(0.71, 0.73, m) * 0.6);
    float calm = mix(0.55, 1.0, smoothstep(0.1, 0.7, length(q * vec2(0.8, 1.2))));
    col = mix(col, neb, v * calm);
  }
  col += stars(q + drift * 0.3 + uPan * 0.2 + vec2(0.0, fall * 0.5), 46.0, 0.5, 1.1, 3.1, 0.0) * 0.55;
  col += stars(q + drift * 0.6 + uPan * 0.4 + vec2(0.0, fall), 20.0, 0.35, 1.6, 7.7, uImage > 0.5 ? 0.0 : 0.9) * (uImage > 0.5 ? 0.5 : 0.9);
  col = mix(col, vec3(1.0), uLift);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createSky(mode = SKY) {
  if (mode === "none") return null;
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: motion.uTime,
    uYaw: { value: 45 },
    uLift: { value: 0 },
    uImage: { value: 0 },
    uAspect: { value: 2.36 },
    uPan: { value: new THREE.Vector2() },
    uRide: rideUniforms.uRide,
    uRideT: rideUniforms.uRideTime,
    uRideDir: rideUniforms.uRideDir,
    uTex: { value: null },
  };
  if (mode === "image") {
    new THREE.TextureLoader().load(new URL("./assets/sky/nebula.webp", import.meta.url).href, (t) => {
      t.wrapS = THREE.MirroredRepeatWrapping;
      t.colorSpace = THREE.NoColorSpace;
      uniforms.uTex.value = t;
      uniforms.uAspect.value = t.image.width / t.image.height;
      uniforms.uImage.value = 1;
    });
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false, depthWrite: false }));
  mesh.frustumCulled = false;
  mesh.renderOrder = -1e6;
  mesh.name = "sky";
  const base = new THREE.Color(SKY_BG), lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, bl = lum(base);
  return {
    mesh,
    ready: () => mode !== "image" || uniforms.uImage.value > 0,
    update({ w, h, yaw, panX, panY, bg }) {
      uniforms.uRes.value.set(w, h);
      uniforms.uYaw.value = yaw;
      uniforms.uPan.value.set(panX, panY);
      uniforms.uLift.value = bg ? Math.max(0, Math.min(1, (lum(bg) - bl) / (1 - bl))) : 0;
    },
  };
}
