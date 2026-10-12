import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:8765").replace(/\/$/, "");
const out = path.join(root, "out/layout-variety");
const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8")).order;
const names = (flag("--levels", null) || [...run, "wizard-medium-r1", "wizard-medium-r2", "wizard-medium-r3"].join(",")).split(",");
const levels = names.map((n) => JSON.parse(fs.readFileSync(path.join(root, "levels", `${n}.json`), "utf8")));
fs.mkdirSync(out, { recursive: true });

const TIER = ["#1b2333", "#c9d6a3", "#a9c47f", "#86ad63", "#668f4c", "#4d723b", "#3a5a2e", "#2c4624", "#20351b"];
const MARK = { bonfire: ["#ff8a1d", "B"], chest: ["#f5c243", "$"], elevator: ["#ffffff", "L"], watcher: ["#e86aa0", "W"], gate: ["#ff4d4d", "G"], door: ["#b06a2c", "D"], ladder: ["#c9a263", "K"], lever: ["#9a7ae0", "V"], pad: ["#5ef0ff", "P"] };

function panel(L, name, ox, oy, size) {
  const [W, D] = L.size, c = Math.min((size - 20) / W, (size - 44) / D);
  const parts = [`<rect x="${ox}" y="${oy}" width="${size}" height="${size}" fill="#0e1220"/>`];
  const x0 = ox + (size - W * c) / 2, y0 = oy + 34 + (size - 44 - D * c) / 2;
  L.cells.forEach((row, z) => row.forEach((q, x) => {
    if (q.s === "none") return;
    const col = q.s === "water" ? "#3b6fa8" : q.s === "lift" ? "#ffffff" : q.s === "ramp" ? "#d8c08a" : TIER[Math.min(8, q.h)];
    parts.push(`<rect x="${(x0 + x * c).toFixed(1)}" y="${(y0 + z * c).toFixed(1)}" width="${c.toFixed(2)}" height="${c.toFixed(2)}" fill="${col}"/>`);
    if (q.p) parts.push(`<rect x="${(x0 + x * c + c * 0.25).toFixed(1)}" y="${(y0 + z * c + c * 0.25).toFixed(1)}" width="${(c * 0.5).toFixed(2)}" height="${(c * 0.5).toFixed(2)}" fill="#3a2a1a" opacity="0.75"/>`);
  }));
  const byId = Object.fromEntries(L.things.map((t) => [t.id, t]));
  for (const t of L.things) if (t.kind === "pad" && t.end === "near" && byId[t.to]) {
    const o = byId[t.to];
    parts.push(`<line x1="${x0 + (t.x + 0.5) * c}" y1="${y0 + (t.z + 0.5) * c}" x2="${x0 + (o.x + 0.5) * c}" y2="${y0 + (o.z + 0.5) * c}" stroke="${t.role === "shortcut" ? "#ff9ef0" : "#5ef0ff"}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
  }
  for (const t of L.things) {
    const m = MARK[t.kind];
    if (!m) continue;
    const cx = x0 + (t.x + (t.size ? t.size[0] / 2 : 0.5)) * c, cz = y0 + (t.z + (t.size ? t.size[1] / 2 : 0.5)) * c;
    parts.push(`<circle cx="${cx}" cy="${cz}" r="${Math.max(3, c * 0.7)}" fill="${m[0]}" stroke="#000" stroke-width="0.8"/>`);
    parts.push(`<text x="${cx}" y="${cz + 3}" font-size="${Math.max(7, c)}" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#111">${m[1]}</text>`);
  }
  const land = L.cells.flat().filter((q) => q.s !== "none" && q.s !== "water").length;
  const lay = L.layout || {};
  const sc = (L.route?.shortcuts || []).map((s) => s.kind).join("+");
  parts.push(`<text x="${ox + 8}" y="${oy + 15}" font-size="13" font-family="sans-serif" font-weight="700" fill="#fff">${name}</text>`);
  parts.push(`<text x="${ox + 8}" y="${oy + 29}" font-size="10.5" font-family="sans-serif" fill="#b8c2d8">${lay.shape} ${lay.transform} x${lay.scale} ${lay.archetype} · ${land} land · ${sc}</text>`);
  return parts.join("");
}

async function routeSheet() {
  const cols = 5, size = 340, rows = Math.ceil(levels.length / cols);
  const body = levels.map((L, i) => panel(L, names[i], (i % cols) * size, Math.floor(i / cols) * size, size)).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * size}" height="${rows * size}"><rect width="100%" height="100%" fill="#070910"/>${body}</svg>`;
  fs.writeFileSync(path.join(out, "route-sheet.svg"), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(out, "route-sheet.png"));
  console.log(path.join(out, "route-sheet.png"));
}

async function shots() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-sheet"),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
  });
  const sizes = { desktop: [1100, 760, false], phone: [390, 844, true] };
  const problems = [];
  try {
    for (const [tag, [w, h, touch]] of Object.entries(sizes)) {
      const dir = path.join(out, "shots", tag);
      fs.mkdirSync(dir, { recursive: true });
      for (const name of names.slice(0, +flag("--count", names.length))) {
        const page = await browser.newPage();
        await page.setCacheEnabled(false);
        page.on("pageerror", (e) => problems.push(`${name} ${tag} pageerror ${e.message}`));
        page.on("console", (m) => { if (m.type() === "error") problems.push(`${name} ${tag} console ${m.text()}`); });
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
        await page.goto(`${BASE}/3d/index.html?level=${name}&reset=1&clouds=none&hero=0&cam=1&ui=0`, { waitUntil: "load" });
        await page.waitForFunction(() => window.__done === true, { timeout: 30000, polling: 100 }).catch(() => problems.push(`${name} ${tag} never finished loading`));
        await new Promise((r) => setTimeout(r, 900));
        await page.screenshot({ path: path.join(dir, `${name}.png`) });
        await page.close();
      }
      const files = names.slice(0, +flag("--count", names.length)).map((n) => path.join(dir, `${n}.png`)).filter((f) => fs.existsSync(f));
      const cols = tag === "phone" ? 8 : 4, tw = tag === "phone" ? 260 : 440, th = Math.round((tw * h) / w);
      const tiles = await Promise.all(files.map((f) => sharp(f).resize(tw, th).toBuffer()));
      const rows = Math.ceil(tiles.length / cols);
      await sharp({ create: { width: cols * tw, height: rows * (th + 22), channels: 3, background: "#0b0d14" } })
        .composite(tiles.flatMap((buf, i) => {
          const left = (i % cols) * tw, top = Math.floor(i / cols) * (th + 22);
          const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="22"><text x="6" y="16" font-size="14" font-family="sans-serif" fill="#fff">${path.basename(files[i], ".png")}</text></svg>`);
          return [{ input: buf, left, top: top + 22 }, { input: label, left, top }];
        }))
        .png().toFile(path.join(out, `contact-${tag}.png`));
      console.log(path.join(out, `contact-${tag}.png`));
    }
  } finally {
    await browser.close();
  }
  for (const p of problems) console.log("PROBLEM", p);
  process.exitCode = problems.length ? 1 : 0;
}

if (!args.includes("--shots-only")) await routeSheet();
if (args.includes("--shots") || args.includes("--shots-only")) await shots();
