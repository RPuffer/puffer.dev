export const SWAY = { crown: 1, flame: 2, ripple: 3, fall: 4, mist: 5, pickup: 6, swatch: 7 };

export const motion = { uTime: { value: 0 }, auto: true };

const HEAD = `uniform float uTime;
attribute vec4 aSway;
attribute vec3 aRoot;
attribute vec3 aAlt;
float swayHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853; }
void main() {`;

const COLOR = `#include <color_vertex>
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
  if (aSway.x > 6.5 && uTime > 0.0) {
    float sPh = aSway.z + swayHash(aRoot.xz);
    if (fract(uTime * aSway.y + sPh / 6.2831853) < aSway.w) vColor.rgb = aAlt;
  }
#endif`;

const MOVE = `#include <begin_vertex>
  if (aSway.x > 0.5 && aSway.x < 6.5) {
    float sMode = aSway.x, sAmp = aSway.y, sSpan = max(aSway.w, 1e-3);
    float sPh = aSway.z + swayHash(aRoot.xz);
    float sEnv = smoothstep(0.0, 1.5, uTime);
    float sW = clamp((transformed.y - aRoot.y) / sSpan, 0.0, 1.0);
    vec3 sP = transformed;
    if (sMode < 1.5) {
      sP.xz += sAmp * sW * vec2(sin(uTime * 1.3 + sPh), 0.55 * sin(uTime * 0.97 + sPh * 1.7));
    } else if (sMode < 2.5) {
      float sT = sW * sW;
      sP.xz += sAmp * sT * vec2(sin(uTime * 9.0 + sPh) + 0.4 * sin(uTime * 13.7 + sPh * 1.3), 0.6 * sin(uTime * 11.3 + sPh * 2.1));
      sP.y += sAmp * 0.7 * sT * sin(uTime * 12.1 + sPh * 0.7);
    } else if (sMode < 3.5) {
      sP.xz += sAmp * vec2(sin(uTime * 0.9 + sPh), cos(uTime * 0.7 + sPh));
    } else if (sMode < 4.5) {
      float sS = 0.8 + 0.2 * sin(uTime * 3.2 - aSway.z);
      sP.y = aRoot.y + (transformed.y - aRoot.y) * sS - (1.0 - sS) * sSpan;
    } else if (sMode < 5.5) {
      sP.xz += sAmp * vec2(sin(uTime * 0.5 + sPh), 0.6 * sin(uTime * 0.37 + sPh * 1.3));
      sP.y += 0.3 * sAmp * sin(uTime * 0.8 + sPh);
    } else {
      float sA = 0.18 * sin(uTime * 1.6 + sPh);
      vec2 sR = transformed.xz - aRoot.xz;
      sP.xz = aRoot.xz + mat2(cos(sA), -sin(sA), sin(sA), cos(sA)) * sR;
      sP.y += sAmp * sin(uTime * 2.0 + sPh);
    }
    transformed = mix(transformed, sP, sEnv);
  }`;

export function applyMotion(material) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey?.() || "";
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev.call(material, shader, r);
    shader.uniforms.uTime = motion.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", HEAD)
      .replace("#include <color_vertex>", COLOR)
      .replace("#include <begin_vertex>", MOVE);
  };
  material.customProgramCacheKey = () => prevKey + "+motion1";
  return material;
}

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initMotion(params) {
  const t = Number(params.t);
  motion.uTime.value = Number.isFinite(t) && params.t !== undefined && params.t !== "" ? t : 0;
  motion.auto = params.hero !== "0" && !(params.t !== undefined && params.t !== "") && !reduced();
  if (typeof window !== "undefined") window.__setTime = (s) => { motion.auto = false; motion.uTime.value = Number(s) || 0; };
}

export function stepMotion(dt) {
  if (motion.auto) motion.uTime.value += Math.min(dt, 0.1);
}
