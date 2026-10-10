import * as THREE from "three";
import idle from "./clips/idle.json" with { type: "json" };
import walk from "./clips/walk.json" with { type: "json" };
import land from "./clips/land.json" with { type: "json" };
import brace from "./clips/brace.json" with { type: "json" };
import wiggle from "./clips/wiggle.json" with { type: "json" };
import spin from "./clips/spin.json" with { type: "json" };
import pump from "./clips/pump.json" with { type: "json" };
import floss from "./clips/floss.json" with { type: "json" };
import shuffle from "./clips/shuffle.json" with { type: "json" };
import loser from "./clips/loser.json" with { type: "json" };
import bounce from "./clips/bounce.json" with { type: "json" };

export const CLIP_DATA = { idle, walk, land, brace, wiggle, spin, pump, floss, shuffle, loser, bounce };
export const DANCES = ["wiggle", "floss", "spin", "shuffle", "pump", "loser", "bounce"];
export const JOINTS = ["hips", "torso", "head", "upperArmL", "lowerArmL", "handL", "upperArmR", "lowerArmR", "handR", "upperLegL", "lowerLegL", "footL", "upperLegR", "lowerLegR", "footR"];
export const REST = { upperArmL: [0, 0, -7], upperArmR: [0, 0, 7] };

const D = Math.PI / 180;
const q = new THREE.Quaternion(), e = new THREE.Euler();
const quat = ([x, y, z]) => q.setFromEuler(e.set(x * D, y * D, z * D));

export function toClip(json, restPos = {}) {
  const tracks = [], seen = new Set();
  for (const [key, keys] of Object.entries(json.tracks)) {
    const [part, prop] = key.split(".");
    if (!JOINTS.includes(part)) throw new Error(`clip ${json.name}: unknown part ${part}`);
    const times = keys.map((k) => k[0]);
    if (prop === "quaternion") tracks.push(new THREE.QuaternionKeyframeTrack(key, times, keys.flatMap((k) => { quat(k.slice(1)); return [q.x, q.y, q.z, q.w]; })));
    else if (prop === "position") {
      const r = restPos[part] || [0, 0, 0];
      tracks.push(new THREE.VectorKeyframeTrack(key, times, keys.flatMap(([, x, y, z]) => [r[0] + x, r[1] + y, r[2] + z])));
    } else throw new Error(`clip ${json.name}: unknown property ${key}`);
    seen.add(key);
  }
  const ends = [0, json.duration];
  for (const j of JOINTS) {
    if (seen.has(`${j}.quaternion`)) continue;
    quat(REST[j] || [0, 0, 0]);
    tracks.push(new THREE.QuaternionKeyframeTrack(`${j}.quaternion`, ends, [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w]));
  }
  for (const [part, r] of Object.entries(restPos)) if (!seen.has(`${part}.position`)) tracks.push(new THREE.VectorKeyframeTrack(`${part}.position`, ends, [...r, ...r]));
  const clip = new THREE.AnimationClip(json.name, json.duration, tracks);
  clip.userData = { loop: json.loop !== false };
  return clip;
}

export const buildClips = (restPos) => Object.fromEntries(Object.entries(CLIP_DATA).map(([n, j]) => [n, toClip(j, restPos)]));
