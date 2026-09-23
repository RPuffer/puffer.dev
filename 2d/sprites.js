const loadImage = (url) => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => fail(new Error("sprite " + url));
  img.src = url;
});

export async function loadSprites(base) {
  const manifest = await (await fetch(new URL("manifest.json", base))).json();
  const byId = new Map(), byType = new Map();
  await Promise.all(manifest.sprites.map(async (s) => {
    const sp = { ...s, img: await loadImage(new URL(s.file, base)) };
    byId.set(s.id, sp);
    if (!byType.has(s.type)) byType.set(s.type, []);
    byType.get(s.type).push(sp);
  }));
  for (const list of byType.values()) list.sort((a, b) => String(a.variant).localeCompare(String(b.variant)) || (a.rot || 0) - (b.rot || 0));
  const decor = (type, v = 0, rot = 0) => {
    const list = byType.get(type);
    if (!list) return null;
    const r = rot % 2;
    const pool = list.filter((s) => (s.rot || 0) === r);
    const use = pool.length ? pool : list;
    const variants = [...new Set(use.map((s) => s.variant))];
    const want = variants[((v % variants.length) + variants.length) % variants.length];
    return use.find((s) => s.variant === want) || use[0];
  };
  return { manifest, byId, byType, get: (id) => byId.get(id), decor };
}
