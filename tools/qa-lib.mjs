export function screenOf(page, cell, { topmost = false } = {}) {
  return page.evaluate(async ([cx, cz, topmost]) => {
    const g = window.__game, S = g.state, r = g.renderer, el = r.element || document.body;
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    const hits = (px, py) => {
      if (px < 0 || py < 0 || px >= w || py >= h) return false;
      if (topmost && document.elementFromPoint(px, py) !== el) return false;
      const c = r.pick(px, py, w, h);
      return !!c && c[0] === cx && c[1] === cz;
    };
    if (!r.three?.camera) {
      let sx = 0, sy = 0, n = 0;
      for (let py = 3; py < h; py += 6) for (let px = 3; px < w; px += 6) if (hits(px, py)) { sx += px; sy += py; n++; }
      return n ? [sx / n, sy / n, n] : null;
    }
    const THREE = await import("three");
    const { surfaceY, liftLevel } = await import("/3d/terrain.js");
    const cam = r.three.camera, y = surfaceY(liftLevel(S.level), S.view, cx, cz);
    const proj = (ox, oz) => { const v = new THREE.Vector3(cx + ox, y, cz + oz).project(cam); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; };
    const [mx, my] = proj(0.5, 0.5);
    if (hits(mx, my)) return [mx, my, 1];
    for (const [ox, oz] of [[0.3, 0.3], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3], [0.5, 0.2], [0.5, 0.8], [0.2, 0.5], [0.8, 0.5]]) {
      const [px, py] = proj(ox, oz);
      if (hits(px, py)) return [px, py, 1];
    }
    for (let rad = 4; rad <= 24; rad += 4) for (let a = 0; a < 16; a++) {
      const px = mx + Math.cos(a * Math.PI / 8) * rad, py = my + Math.sin(a * Math.PI / 8) * rad;
      if (hits(px, py)) return [px, py, 1];
    }
    return null;
  }, [cell[0], cell[1], topmost]);
}

export function watchdog(seconds = Number(process.env.QA_STALL_S || 180)) {
  let last = Date.now(), label = "start";
  const t = setInterval(() => {
    if (Date.now() - last < seconds * 1000) return;
    console.log(`FAIL  qa stalled ${seconds} s after: ${label}`);
    process.exit(2);
  }, 5000);
  t.unref();
  return (name) => { last = Date.now(); label = name; };
}
