import * as THREE from "three";
import { ballLayout, buildBalls, color } from "./balls.js";

const FRAG = `
uniform vec3 uLit;
uniform vec3 uShade;
void main() {
  vec3 N = normalize(vN);
  float l = dot(N, uLight) + (vW.y - vC.y) * 0.25;
  vec3 col = l > 0.18 ? uLit : uShade;
  float f = max(fogAt(vC.xz), smoothstep(uBase - 0.4, uBase - 2.6, vC.y) * 0.5);
  col = mix(col, uBg, f * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const LINE = `
uniform vec3 uLine;
void main() {
  float f = max(fogAt(vC.xz), smoothstep(uBase - 0.4, uBase - 2.6, vC.y) * 0.5);
  gl_FragColor = vec4(mix(uLine, uBg, f * 0.9), 1.0);
  #include <colorspace_fragment>
}`;

export function build(I) {
  const warm = I.hue.r > I.hue.b + 0.15;
  const lit = warm ? "#fff1e2" : "#ffffff", shade = warm ? "#f0a184" : "#9cc6f6", line = warm ? "#8a3f2c" : "#3f6fb0";
  const list = ballLayout(I);
  return [
    buildBalls(I, list, { frag: FRAG, detail: 2, uniforms: { uLit: { value: color(lit) }, uShade: { value: color(shade) } }, name: "clouds-cel" }),
    buildBalls(I, list, { frag: LINE, detail: 1, grow: 0.045, side: THREE.BackSide, uniforms: { uLine: { value: color(line) } }, name: "clouds-cel-line" }),
  ];
}
