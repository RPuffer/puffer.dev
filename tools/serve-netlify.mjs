import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const port = +(process.argv[3] || 8766);
const toml = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "netlify.toml"), "utf8");
const rules = [...toml.matchAll(/for = "([^"]+)"\s*\[headers\.values\]\s*([\s\S]*?)(?=\n\[|\s*$)/g)].map(([, glob, body]) => ({
  re: new RegExp("^" + glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"),
  headers: Object.fromEntries([...body.matchAll(/^\s*([\w-]+) = "([^"]*)"/gm)].map((m) => [m[1], m[2]])),
}));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".glb": "model/gltf-binary", ".css": "text/css" };

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(root, url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) { if (!url.endsWith("/")) { res.writeHead(301, { Location: url + "/" }); return res.end(); } file = path.join(file, "index.html"); url += "index.html"; }
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(file), etag = `"${st.size}-${st.mtimeMs | 0}"`;
  const h = { "Cache-Control": "public, max-age=0, must-revalidate", ETag: etag, "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" };
  for (const r of rules) if (r.re.test(url)) Object.assign(h, r.headers);
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, h); return res.end(); }
  res.writeHead(200, { ...h, "Content-Length": st.size });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`netlify-like ${root} on ${port}`));
