import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ASSETS = path.resolve(HERE, "../assets");
const root = path.resolve(HERE, "../..");
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, ".pp-profile"),
  args: ["--no-first-run", "--disable-background-networking"],
});
try {
  const page = await b.newPage();
  const url = await page.evaluate(() => {
    const W = 40, TH = 23, D = 7;
    const c = document.createElement("canvas");
    c.width = W; c.height = TH + D + 2;
    const x = c.getContext("2d");
    const poly = (pts, fill) => { x.beginPath(); pts.forEach(([a, bb], i) => (i ? x.lineTo(a, bb) : x.moveTo(a, bb))); x.closePath(); x.fillStyle = fill; x.fill(); };
    const cx = W / 2, t = 1, m = t + TH / 2, bt = t + TH;
    poly([[0, m], [cx, bt], [cx, bt + D], [0, m + D]], "#dd9200");
    poly([[cx, bt], [W, m], [W, m + D], [cx, bt + D]], "#bd6f00");
    poly([[cx, t], [W, m], [cx, bt], [0, m]], "#f1b900");
    poly([[cx, t + 4], [W - 7, m], [cx, bt - 4], [7, m]], "#f4c41e");
    poly([[cx, t + 4], [W - 7, m], [cx + 4, m - 1], [cx - 3, t + 6]], "#ffe082");
    return c.toDataURL("image/png");
  });
  fs.writeFileSync(path.join(ASSETS, "marker-0.png"), Buffer.from(url.split(",")[1], "base64"));
  const mf = path.join(ASSETS, "manifest.json");
  const m = JSON.parse(fs.readFileSync(mf, "utf8"));
  m.sprites = m.sprites.filter((s) => s.id !== "marker-0");
  m.sprites.push({ id: "marker-0", type: "marker", variant: 0, cat: "decor", file: "marker-0.png", w: 40, h: 33, anchor: [20, 16], footprint: [1, 1], source: "drawn by gen/marker.mjs" });
  fs.writeFileSync(mf, JSON.stringify(m, null, 1));
  console.log("marker written");
} finally {
  await b.close();
}
