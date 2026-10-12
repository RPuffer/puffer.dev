import * as THREE from "three";
import { buildCharacter } from "./character.js";
import { motion } from "./motion.js";

const q = new URLSearchParams(location.search);
const cls = q.get("class") || null, clip = q.get("clip") || "idle";
const yaws = (q.get("yaw") || "0,90,180,270").split(",").map(Number);
const cw = +(q.get("w") || 300), H = +(q.get("h") || 420), W = cw * yaws.length;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(new THREE.Color(q.get("bg") || "#2e2a4a"), 1);
renderer.setScissorTest(true);
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
let hero;
try { hero = buildCharacter(1, null, cls); } catch (e) { window.__error = String(e); throw e; }
scene.add(hero);
const tile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1), new THREE.MeshBasicMaterial({ color: 0xd8d2e4 }));
tile.position.y = -0.04;
scene.add(tile);
const half = +(q.get("span") || 0.8), aspect = H / cw;
const cam = new THREE.OrthographicCamera(-half, half, half * aspect, -half * aspect, 0.1, 100);
const d = new THREE.Vector3(1, 0.82, 1).normalize();
const target = new THREE.Vector3(0, +(q.get("ty") || 0.62), 0);
cam.position.copy(target).addScaledVector(d, 20);
cam.lookAt(target);
cam.updateProjectionMatrix();

let tris = 0, calls = 0;
hero.traverse((o) => { if (o.isMesh) { calls++; tris += o.geometry.attributes.position.count / 3; } });
const box = new THREE.Box3().setFromObject(hero);
window.__stats = { cls, tris, calls, height: box.max.y, x: [box.min.x, box.max.x], z: [box.min.z, box.max.z], audit: hero.userData.audit };

const draw = (t) => {
  motion.uTime.value = t;
  hero.userData.pose(clip, t % hero.userData.actions[clip].getClip().duration);
  yaws.forEach((deg, i) => {
    hero.rotation.y = (deg * Math.PI) / 180;
    hero.updateMatrixWorld(true);
    const x = i * cw;
    renderer.setViewport(x, 0, cw, H);
    renderer.setScissor(x, 0, cw, H);
    renderer.render(scene, cam);
  });
};
window.__setTime = draw;
draw(Number(q.get("t") || 0));
window.__done = true;
