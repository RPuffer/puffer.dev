const ROOT = new URL("../", import.meta.url);
const MAP = { three: "3d/vendor/three.module.js", "three/addons/": "3d/vendor/jsm/" };
const CLOUDS = ["3d/assets/clouds/atlas.webp", "3d/assets/clouds/atlas.json"];
const SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;
const GLB = /["'`]([^"'`]+\.glb)["'`]/g;

const fetched = new Map();
const levels = new Map();

export const idle = (f, timeout = 2000) => {
  const run = () => (typeof requestIdleCallback === "function" ? requestIdleCallback(f, { timeout }) : setTimeout(f, 50));
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(run, 0));
  else run();
};

const pull = (url, read) => fetch(String(url), { priority: "low" }).then((r) => (r.ok ? r[read]() : Promise.reject(new Error(`${url} ${r.status}`))));

const get = (url) => {
  const key = String(url);
  if (!fetched.has(key)) {
    const p = pull(key, "arrayBuffer").then(() => true);
    p.catch(() => {});
    fetched.set(key, p);
  }
  return fetched.get(key);
};

const resolve = (spec, from) => {
  if (spec === "three") return new URL(MAP.three, ROOT);
  if (spec.startsWith("three/addons/")) return new URL(MAP["three/addons/"] + spec.slice(13), ROOT);
  if (/^(\.{1,2}\/|\/)/.test(spec)) return new URL(spec, from);
  return null;
};

const crawled = new Map();
function crawl(url) {
  const key = String(url);
  if (!crawled.has(key)) crawled.set(key, walk(key));
  return crawled.get(key);
}

async function walk(key) {
  const text = await pull(key, "text");
  const deps = [...text.matchAll(SPEC)].map((m) => resolve(m[1], key)).filter(Boolean);
  const glbs = [...text.matchAll(GLB)].filter((m) => !m[1].includes("${")).map((m) => new URL(m[1], new URL("3d/hooks.js", ROOT))).filter((u) => u.origin === ROOT.origin);
  for (const g of glbs) get(g);
  for (const d of deps) crawl(d);
}

async function crawlAll(url) {
  crawl(url);
  for (let n = -1; n !== crawled.size;) {
    n = crawled.size;
    await Promise.allSettled([...crawled.values()]);
  }
}

export function rawLevel(name) {
  const safe = String(name || "").replace(/[^a-z0-9_-]/gi, "");
  if (!levels.has(safe)) {
    const p = pull(new URL(`levels/${safe}.json`, ROOT), "json");
    p.catch(() => {});
    levels.set(safe, p);
  }
  return levels.get(safe);
}

export function takeLevel(name) {
  const p = levels.get(String(name || ""));
  levels.delete(String(name || ""));
  return p || null;
}

export async function warmIsland(name, { modules = "import" } = {}) {
  const raw = await rawLevel(name);
  const pieces = (Array.isArray(raw.pieces) ? raw.pieces : []).map((p) => new URL(p, new URL("3d/hooks.js", ROOT)));
  if (modules === "import") await Promise.allSettled(pieces.map((u) => import(u.href)));
  else await Promise.allSettled(pieces.map((u) => crawlAll(u)));
  return raw;
}

export async function warmPage(name) {
  crawled.set(String(new URL("core/warm.js", ROOT)), Promise.resolve());
  get(new URL("3d/index.html", ROOT));
  get(new URL("levels/run.json", ROOT));
  for (const c of CLOUDS) get(new URL(c, ROOT));
  await Promise.allSettled([crawlAll(new URL("3d/main.js", ROOT)), warmIsland(name, { modules: "fetch" })]);
  return crawled.size;
}
