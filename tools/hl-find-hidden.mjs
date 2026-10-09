import puppeteer from "puppeteer-core";
import path from "node:path";
const root = "/Users/pibbles/dev/puffer.dev-build/isoworld";
const [name, yaw] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-hl"), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--hide-scrollbars", "--disable-cache"] });
const page = await b.newPage();
await page.setViewport({ width: 600, height: 600 });
await page.goto(`http://localhost:8765/3d/index.html?level=${name}&reset=1&ui=0&nav=0&yaw=${yaw}`);
await page.waitForFunction(() => window.__done || window.__error, { timeout: 60000 });
const r = await page.evaluate(async () => {
  const THREE = await import("three");
  const { surfaceHeight, isWalkable } = await import("/core/level.js");
  const g = window.__game; g.stop();
  const S = g.state, L = S.level, a = S.actor, { scene, camera } = g.renderer.three;
  const hero = scene.children.find((o) => o.userData?.animate);
  const targets = scene.children.filter((o) => o !== hero);
  const ray = new THREE.Raycaster(), dir = new THREE.Vector3();
  const out = [];
  for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
    if (!isWalkable(L, x, z)) continue;
    a.cell = [x, z]; a.path = []; a.moving = false; a.pos.x = x + 0.5; a.pos.z = z + 0.5; a.y = surfaceHeight(L, a.pos.x, a.pos.z);
    g.renderer.snap(); g.renderer.update(S, 0); g.renderer.render(S, 0);
    camera.getWorldDirection(dir); dir.negate();
    let hit = 0, n = 0;
    for (const dy of [0.15, 0.35, 0.55, 0.75, 0.9]) for (const dx of [-0.15, 0, 0.15]) {
      n++;
      const o = new THREE.Vector3(hero.position.x + dx, hero.position.y + dy, hero.position.z);
      ray.set(o, dir);
      const h = ray.intersectObjects(targets, true).find((i) => i.object.visible && !i.object.material?.transparent && i.distance > 0.05);
      if (h) hit++;
    }
    out.push([x, z, hit / n]);
  }
  return out.filter((p) => p[2] >= 0.4).sort((p, q) => q[2] - p[2]).slice(0, 14);
});
console.log(name, yaw, JSON.stringify(r));
await b.close();
