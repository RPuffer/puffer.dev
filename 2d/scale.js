const cache = new Map();

function halve(src, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(src, 0, 0, w, h);
  return c;
}

export function scaledSprite(sp, k) {
  const key = sp.id + "@" + k.toFixed(4);
  let s = cache.get(key);
  if (s) return s;
  if (cache.size > 4000) cache.clear();
  const W = Math.max(1, Math.round(sp.w * k)), H = Math.max(1, Math.round(sp.h * k));
  let src = sp.img, w = sp.w, h = sp.h;
  while (w / 2 > W && h / 2 > H) { w = Math.round(w / 2); h = Math.round(h / 2); src = halve(src, w, h); }
  const c = halve(src, W, H);
  s = { c, w: W, h: H, fx: W / (sp.w * k), fy: H / (sp.h * k) };
  cache.set(key, s);
  return s;
}
