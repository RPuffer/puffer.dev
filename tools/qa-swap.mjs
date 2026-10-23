import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const orderArg = opt("--order", null);
const laps = +opt("--laps", 2);
const W = +opt("--w", 900), H = +opt("--h", 800);
const BASE = (args[0] || "http://localhost:8765").replace(/\/$/, "");
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
const ORDER = orderArg ? orderArg.split(",") : Array.isArray(run) ? run : run.order;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (status, name, detail = "") => { results.push({ status, name, detail }); console.log(`${status.padEnd(4)} ${name}${detail ? " " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-swap"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
let problems = [];
page.on("pageerror", (e) => problems.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error" || /^\[run\]/.test(m.text())) problems.push(m.type() + " " + m.text()); });

const memory = () => page.evaluate(() => { const m = window.__game.renderer.three.gl.info.memory; return { geometries: m.geometries, textures: m.textures }; });
const frames = (n) => page.evaluate((n) => new Promise((r) => { const f = () => (n-- > 0 ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }), n);
const arrived = (name) => page.waitForFunction((n) => { const S = window.__game.state; return S.level.name === n && !S.actor.locked; }, { timeout: 20000, polling: 50 }, name).then(() => true, () => false);

async function rideExit(name, next) {
  const ok = await page.evaluate(() => {
    const S = window.__game.state, e = S.things?.things.find((t) => t.kind === "elevator" && t.role === "exit");
    if (!e) return false;
    const a = S.actor;
    a.path = []; a.cell = [e.x, e.z]; a.pos.x = e.x + 0.5; a.pos.z = e.z + 0.5;
    return true;
  });
  if (!ok) return `${name} has no exit elevator`;
  const focused = await page.waitForFunction(() => window.__game.state.things.focus?.role === "exit", { timeout: 5000, polling: 30 }).then(() => true, () => false);
  if (!focused) return `exit elevator never took focus on ${name}`;
  const count = await page.evaluate(() => window.__swapCount);
  await page.keyboard.down("KeyF"); await wait(60); await page.keyboard.up("KeyF");
  if (!(await arrived(next))) return `never arrived on ${next}`;
  const s = await page.evaluate(() => ({ count: window.__swapCount, err: window.__swapError, url: location.search, cell: window.__game.state.actor.cell.slice(), entry: window.__game.state.things?.things.find((t) => t.kind === "elevator" && t.role === "entry") }));
  if (s.err) return `__swapError ${s.err}`;
  if (s.count !== count + 1) return `swapCount ${count} -> ${s.count}`;
  const q = new URLSearchParams(s.url);
  if (q.get("level") !== next || q.get("from") !== name || q.get("arrive") !== "entry") return `URL ${s.url}`;
  if (s.entry && (s.entry.x !== s.cell[0] || s.entry.z !== s.cell[1])) return `landed on ${s.cell}, entry ${s.entry.x},${s.entry.z}`;
  return null;
}

try {
  await page.goto(`${BASE}/3d/index.html?level=${ORDER[0]}&from=${ORDER[ORDER.length - 1]}&arrive=entry&reset=1`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 30000, polling: 100 });
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); });
  await frames(10);
  const base = await memory();
  console.log(`base ${ORDER[0]} geometries ${base.geometries} textures ${base.textures}`);
  let hops = 0;
  for (let lap = 1; lap <= laps; lap++) {
    for (let i = 0; i < ORDER.length - 1; i++) {
      problems = [];
      const why = await rideExit(ORDER[i], ORDER[i + 1]);
      hops++;
      await frames(4);
      const m = await memory();
      const label = `lap ${lap} hop ${hops} ${ORDER[i]} -> ${ORDER[i + 1]}`;
      record(why || problems.length ? "FAIL" : "PASS", label, why || problems[0] || `geo ${m.geometries} tex ${m.textures}`);
    }
    problems = [];
    const last = ORDER[ORDER.length - 1];
    await page.evaluate((a, b) => window.__run.swap(a, { from: b, arrive: "entry" }), ORDER[0], last);
    hops++;
    const ok = await arrived(ORDER[0]);
    await frames(10);
    const m = await memory();
    const flat = m.geometries === base.geometries && m.textures === base.textures;
    const err = await page.evaluate(() => window.__swapError);
    record(ok && flat && !err && !problems.length ? "PASS" : "FAIL", `lap ${lap} hop ${hops} ${last} -> ${ORDER[0]} memory`, `geo ${m.geometries}/${base.geometries} tex ${m.textures}/${base.textures}${err ? " err " + err : ""}${problems.length ? " " + problems[0] : ""}`);
  }
  const bakes = await page.evaluate(() => window.__bakes);
  const by = {};
  for (const b of bakes) (by[b.name] ||= []).push(`${b.bakeMs}/${b.frameMs}/${b.loadMs}`);
  console.log("\nper island, boot first then each swap: bake ms / bake to second frame ms / preload ms:");
  for (const [n, list] of Object.entries(by)) console.log(`  ${n.padEnd(18)} ${list.join(" ")}`);
  const worst = bakes.slice(1).reduce((w, b) => (b.bakeMs > (w?.bakeMs ?? -1) ? b : w), null);
  if (worst) console.log(`worst swap bake ${worst.bakeMs} ms on ${worst.name}`);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:things:")) localStorage.removeItem(k); }).catch(() => {});
} catch (e) {
  record("FAIL", "qa-swap", e.message);
} finally {
  await browser.close();
}

const n = (st) => results.filter((r) => r.status === st).length;
console.log(`\n${n("PASS")} pass, ${n("FAIL")} fail`);
process.exitCode = n("FAIL") ? 1 : 0;
