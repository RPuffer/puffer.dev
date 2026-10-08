export const xray = {
  uHero: { value: [-9999, -9999] },
  uRadius: { value: 0 },
  uDepth: { value: 0 },
  uDepthSoft: { value: 0.0003 },
  uFeet: { value: 0 },
  uSlack: { value: 0 },
};

export const REACH = { radius: 1.6, below: 1.0 };

const HEAD = `uniform vec2 uHero;
uniform float uRadius;
uniform float uDepth;
uniform float uDepthSoft;
uniform float uFeet;
uniform float uSlack;
varying float vXrayY;
float xrayBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float a = mod(q.x, 2.0), b = mod(q.y, 2.0), c = floor(q.x * 0.5), d = floor(q.y * 0.5);
  float v = 8.0 * mod(a + b, 2.0) + 4.0 * b + 2.0 * mod(c + d, 2.0) + d;
  return (v + 0.5) / 16.0;
}
void main() {`;

const cut = (reach) => `#include <clipping_planes_fragment>
  if (uRadius > 0.0) {
    float dd = distance(gl_FragCoord.xy, uHero);
    float rr = uRadius * ${reach ? REACH.radius.toFixed(3) : "1.0"};
    float radial = 1.0 - smoothstep(rr * 0.55, rr, dd);
    float nearer = smoothstep(0.0, uDepthSoft, uDepth ${reach ? "+ uSlack " : ""}- gl_FragCoord.z);
    float above = smoothstep(uFeet ${reach ? "- " + REACH.below.toFixed(3) + " " : ""}+ 0.05, uFeet ${reach ? "- " + REACH.below.toFixed(3) + " " : ""}+ 0.35, vXrayY);
    if (radial * nearer * above > xrayBayer(gl_FragCoord.xy)) discard;
  }`;

export function applyXray(material, reach = false) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uHero: xray.uHero, uRadius: xray.uRadius, uDepth: xray.uDepth, uDepthSoft: xray.uDepthSoft, uFeet: xray.uFeet, uSlack: xray.uSlack });
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying float vXrayY;\nvoid main() {")
      .replace("#include <project_vertex>", "#include <project_vertex>\n  vXrayY = (modelMatrix * vec4(transformed, 1.0)).y;");
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", HEAD).replace("#include <clipping_planes_fragment>", cut(reach));
  };
  material.customProgramCacheKey = () => (reach ? "xray2-reach" : "xray2");
  return material;
}
