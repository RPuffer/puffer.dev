import puppeteer from "puppeteer-core";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const viaLanding = flag("--landing");
const hops = +(args[1] || 2);
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-probe"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 800, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
await cdp.send("Network.enable");
await cdp.send("Network.clearBrowserCache");
if (process.env.THROTTLE) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: 1.25e6, uploadThroughput: 0.5e6 });
const reqs = new Map();
cdp.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, t: e.timestamp, bytes: 0, cached: false }));
cdp.on("Network.requestServedFromCache", (e) => { const r = reqs.get(e.requestId); if (r) r.cached = true; });
cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r && (e.response.fromDiskCache || e.response.fromPrefetchCache || e.response.fromServiceWorker)) r.cached = true; });
cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
const tally = () => { const all = [...reqs.values()].filter((r) => !r.url.startsWith("data:") && !r.url.includes("__reload")); const net = all.filter((r) => !r.cached); return { count: all.length, net: net.length, kb: Math.round(net.reduce((a, r) => a + r.bytes, 0) / 1024) }; };
const kind = (u) => (u.match(/\.(js|json|glb|webp|png|jpg|html)(\?|$)/) || [, "other"])[1];
const byKind = () => { const o = {}; for (const r of reqs.values()) { if (r.cached) continue; const k = kind(r.url); o[k] = (o[k] || 0) + 1; } return o; };

const out = {};
const urls = () => [...reqs.values()].filter((r) => !r.cached).map((r) => r.url.replace(BASE, ""));
if (viaLanding) {
  await page.goto(`${BASE}/landing/index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__warm === true, { timeout: 60000, polling: 100 }).catch(() => console.log("no __warm"));
  out.landing = { ...tally(), kinds: byKind() };
  if (process.env.URLS) out.landingUrls = urls();
  reqs.clear();
}
const t0 = Date.now();
await page.goto(`${BASE}/3d/index.html?level=cat-medium&reset=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 120000, polling: 50 });
if (process.env.URLS) out.coldUrls = urls();
out.cold = { doneMs: Date.now() - t0, firstMs: await page.evaluate(() => window.__bakes?.[0] && Math.round(performance.now())), ...tally(), kinds: byKind() };
await wait(1500);
out.hops = [];
for (let h = 0; h < hops; h++) {
  reqs.clear();
  const before = await page.evaluate(() => window.__sequence.hops.length);
  await page.evaluate(() => {
    const S = window.__game.state, e = S.things.things.find((t) => t.kind === "elevator" && t.role === "exit");
    S.actor.path = []; S.actor.cell = [e.x, e.z]; S.actor.pos.x = e.x + 0.5; S.actor.pos.z = e.z + 0.5;
    S.things.tap([e.x, e.z]);
  });
  await page.waitForFunction((b) => window.__sequence.hops.length > b, { timeout: 30000, polling: 50 }, before);
  const hop = await page.evaluate(() => window.__sequence.hops.at(-1));
  const pre = await page.evaluate(() => window.__bakes.at(-1));
  out.hops.push({ next: hop.next, hold: +(hop.beats.arrive - hop.beats.hold).toFixed(2), total: hop.total, beats: hop.beats, loadMs: pre.loadMs, ...(process.env.URLS ? { urls: urls() } : {}), ...tally(), kinds: byKind() });
  await wait(2500);
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
