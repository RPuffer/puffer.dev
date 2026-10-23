import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] || "build");
const PAGE = path.join(OUT, "3d/index.html");
const ENTRY = path.join(OUT, "3d/main.js");
const MAP = { three: "3d/vendor/three.module.js", "three/addons/": "3d/vendor/jsm/" };
const SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

const resolve = (spec, from) => {
  if (spec === "three") return path.join(OUT, MAP.three);
  if (spec.startsWith("three/addons/")) return path.join(OUT, MAP["three/addons/"], spec.slice(13));
  if (/^\.{1,2}\//.test(spec)) return path.resolve(path.dirname(from), spec);
  return null;
};

const walk = (file, seen = new Set()) => {
  if (seen.has(file) || !fs.existsSync(file)) return seen;
  seen.add(file);
  for (const m of fs.readFileSync(file, "utf8").matchAll(SPEC)) {
    const dep = resolve(m[1], file);
    if (dep && /\.m?js$/.test(dep)) walk(dep, seen);
  }
  return seen;
};
const seen = walk(ENTRY);
const rel = (f) => path.relative(path.dirname(PAGE), f).split(path.sep).join("/");

const pieces = {};
for (const f of fs.readdirSync(path.join(OUT, "levels"))) {
  if (!f.endsWith(".json") || f === "run.json") continue;
  const raw = JSON.parse(fs.readFileSync(path.join(OUT, "levels", f), "utf8"));
  const mods = new Set();
  for (const p of Array.isArray(raw.pieces) ? raw.pieces : []) walk(path.resolve(OUT, "3d", p), mods);
  pieces[f.slice(0, -5)] = [...mods].filter((m) => !seen.has(m)).map(rel);
}
const hint = `<script>(()=>{const P=${JSON.stringify(pieces)},n=(new URLSearchParams(location.search).get("level")||"").replace(/[^a-z0-9_-]/gi,""),h=document.head,add=(r,u,a)=>{const l=document.createElement("link");l.rel=r;l.href=u;if(a){l.as=a;l.crossOrigin="anonymous"}h.appendChild(l)};if(!P[n])return;add("preload","../levels/"+n+".json","fetch");add("preload","../levels/run.json","fetch");add("preload","assets/clouds/atlas.json","fetch");for(const m of P[n])add("modulepreload",m)})()</script>`;

const html = fs.readFileSync(PAGE, "utf8").replace(/<link rel="modulepreload"[^>]*>\n/g, "").replace(/<script>\(\(\)=>\{const P=.*<\/script>\n/g, "");
const links = [...seen].map((f) => `<link rel="modulepreload" href="${rel(f)}">`).concat(hint).join("\n");
if (!html.includes("</head>")) throw new Error(`${PAGE} has no </head>`);
fs.writeFileSync(PAGE, html.replace("</head>", `${links}\n</head>`));
console.log(`modulepreload: ${seen.size} modules, ${Object.keys(pieces).length} level hints into ${path.relative(process.cwd(), PAGE)}`);
