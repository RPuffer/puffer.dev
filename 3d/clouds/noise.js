import * as THREE from "three";
import { NOISE_N } from "./noise-bake.js";

export async function loadNoise(N = NOISE_N) {
  const buf = await (await fetch(new URL("../assets/clouds/noise64.bin", import.meta.url))).arrayBuffer();
  const data = new Uint8Array(buf);
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
