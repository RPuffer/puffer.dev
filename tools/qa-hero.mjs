import fs from "node:fs";
import path from "node:path";
import { audit } from "../3d/prims.js";
import { heroSpec } from "../3d/character.js";
import { CLIP_DATA, DANCES } from "../3d/clips.js";
import { root, launch, openHero, fitZoom, posePage } from "./hero-lib.mjs";

const BASE = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const LEVEL = process.argv[3] || "cat-medium";
const OUT = path.join(root, "out/qa-hero");
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const a = audit(heroSpec());
record("audit passes", a.ok, `${a.parts} parts over 0.15 tile, ${a.parts + a.face} total, height ${a.height.toFixed(2)}, head ${a.headRatio.toFixed(2)}${a.errors.length ? ", " + a.errors.join("; ") : ""}`);
const total = heroSpec().parts.length;
record("part count 16 to 20", total >= 16 && total <= 20, `${total}`);

const names = Object.keys(CLIP_DATA);
record("seven clips from JSON", names.length === 7 && ["idle", "walk", "land", "brace", ...DANCES].every((n) => CLIP_DATA[n]?.name === n), names.join(" "));
for (const n of names) {
  const c = CLIP_DATA[n], counts = Object.values(c.tracks).map((k) => k.length);
  const inRange = Object.values(c.tracks).every((k) => k[0][0] === 0 && Math.abs(k[k.length - 1][0] - c.duration) < 1e-6);
  const durOk = !DANCES.includes(n) || (c.duration >= 2 && c.duration <= 2.3);
  record(`clip ${n} keys`, counts.every((k) => k >= 6 && k <= 10) && inRange && durOk, `${counts.length} tracks, ${Math.min(...counts)} to ${Math.max(...counts)} keys, ${c.duration} s${c.loop ? " loop" : ""}`);
}

const browser = await launch();
try {
  const z = await fitZoom(browser, BASE, LEVEL);
  const { page, problems } = await openHero(browser, BASE, `level=${LEVEL}&zoom=${(z * 6).toFixed(2)}`, { width: 600, height: 600 });
  record("page loads", !problems.length, problems.join("; "));
  const live = await page.evaluate(() => window.__hero.userData.audit.ok && Object.keys(window.__hero.userData.actions).length);
  record("hero in page audits and binds clips", live === 7, `${live} actions`);

  for (const n of names) {
    const d = CLIP_DATA[n].duration;
    const poses = [];
    let worst = null;
    for (let k = 0; k < 4; k++) {
      const t = (d * k) / 4 + (CLIP_DATA[n].loop ? 0 : d / 8);
      await posePage(page, n, t);
      await page.screenshot({ path: path.join(OUT, `${n}-${k}.png`) });
      const r = await page.evaluate(async () => {
        const THREE = await import("three");
        const h = window.__hero;
        h.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().makeTranslation(-h.position.x, -h.position.y, -h.position.z);
        const box = new THREE.Box3(), out = [];
        h.traverse((o) => {
          if (!o.isMesh) return;
          o.geometry.computeBoundingBox();
          box.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
          out.push([o.parent.name, box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]);
        });
        const quats = Object.fromEntries(Object.entries(h.userData.joints).map(([k, g]) => [k, g.quaternion.toArray().concat(g.position.toArray())]));
        return { out, quats };
      });
      poses.push(r.quats);
      for (const [id, x0, y0, z0, x1, y1, z1] of r.out) {
        const over = Math.max(-0.6 - x0, x1 - 0.6, -0.6 - z0, z1 - 0.6, -0.1 - y0, y1 - 1.3, 0);
        if (over > 0 && (!worst || over > worst[1])) worst = [`${id} at phase ${k}`, over];
      }
    }
    const moved = poses.slice(1).some((p) => Object.keys(p).some((j) => p[j].some((v, i) => Math.abs(v - poses[0][j][i]) > 1e-3)));
    record(`clip ${n} four phases inside 1.2 x 1.4 box`, !worst, worst ? `${worst[0]} out by ${worst[1].toFixed(3)}` : "x, z within 0.6, y -0.1 to 1.3");
    record(`clip ${n} moves`, moved, moved ? "" : "four phases identical");
  }

  const blend = await page.evaluate(() => {
    const h = window.__hero, A = h.userData.actions, actor = { facing: 0, moving: true, walkPhase: 0 }, dt = 1 / 60;
    for (let i = 0; i < 40; i++) { actor.walkPhase += dt * 3.2 * Math.PI * 1.6; h.userData.animate(actor, dt); }
    const before = h.userData.clip();
    actor.moving = false; actor.walkPhase = 0;
    let t = 0;
    while (t < 1) {
      h.userData.animate(actor, dt); t += dt;
      if (A.walk.getEffectiveWeight() === 0 || !A.walk.isRunning() && !A.walk.enabled) break;
    }
    return { before, t, after: h.userData.clip(), idle: A.idle.getEffectiveWeight() };
  });
  record("walk blends to idle under 0.3 s", blend.before === "walk" && blend.after === "idle" && blend.t < 0.3, `${blend.before} to ${blend.after} in ${blend.t.toFixed(3)} s, idle weight ${blend.idle.toFixed(2)}`);

  const shots = await page.evaluate(() => {
    const h = window.__hero, actor = { facing: 0, moving: false, walkPhase: 0 }, dt = 1 / 60;
    h.userData.pose("idle", 0);
    h.userData.play("land");
    for (let i = 0; i < 60; i++) h.userData.animate(actor, dt);
    const afterLand = h.userData.clip();
    h.userData.play("brace");
    for (let i = 0; i < 90; i++) h.userData.animate(actor, dt);
    const afterBrace = h.userData.clip();
    actor.moving = true;
    for (let i = 0; i < 5; i++) { actor.walkPhase += 0.2; h.userData.animate(actor, dt); }
    return { afterLand, afterBrace, moving: h.userData.clip() };
  });
  record("land returns to idle, brace holds, walking breaks brace", shots.afterLand === "idle" && shots.afterBrace === "brace" && shots.moving === "walk", JSON.stringify(shots));
  await page.close();

  const q = await openHero(browser, BASE, `level=${LEVEL}&clip=wiggle`, { width: 400, height: 400 });
  const forced = await q.page.evaluate(() => {
    const h = window.__hero, actor = { facing: 0, moving: true, walkPhase: 1 };
    for (let i = 0; i < 10; i++) h.userData.animate(actor, 1 / 60);
    return h.userData.clip();
  });
  record("?clip=wiggle loops one clip", forced === "wiggle" && !q.problems.length, `${forced}${q.problems.length ? " " + q.problems.join("; ") : ""}`);
  await q.page.close();
} finally {
  await browser.close();
}

const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails} pass, ${fails} fail`);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 1));
process.exitCode = fails ? 1 : 0;
