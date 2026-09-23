import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ASSETS = path.resolve(HERE, "../assets");
const root = path.resolve(HERE, "../..");
const b64 = (f) => "data:image/png;base64," + fs.readFileSync(path.join(ASSETS, f)).toString("base64");
const LIP = +(process.env.LIP || 7);

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, ".pp-profile"),
  args: ["--no-first-run", "--disable-background-networking"],
});
try {
  const page = await b.newPage();
  const url = await page.evaluate(async (grassSrc, lip) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
    const g = await load(grassSrc);
    const c = document.createElement("canvas");
    c.width = 128; c.height = 158;
    const x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    const poly = (pts) => { x.beginPath(); pts.forEach(([a, bb], i) => (i ? x.lineTo(a, bb) : x.moveTo(a, bb))); x.closePath(); };
    x.save();
    poly([[0, 121 - lip], [64, 74 - lip], [64, 158], [0, 121]]);
    x.clip();
    poly([[0, 0], [64, 0], [64, 158], [0, 158]]);
    x.clip();
    x.setTransform(1, -84 / 64, 0, 1, 0, 84);
    x.drawImage(g, 0, 0);
    x.restore();
    x.save();
    poly([[64, 74 - lip], [128, 37 - lip], [128, 121], [64, 158]]);
    x.clip();
    x.drawImage(g, 0, 0);
    x.restore();
    return c.toDataURL("image/png");
  }, b64("tile-grass.png"), LIP);
  const buf = Buffer.from(url.split(",")[1], "base64");
  const trimmed = await sharp(buf).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS, "tile-ramp-w.png"), trimmed);
  fs.writeFileSync(path.join(ASSETS, "tile-ramp-n.png"), await sharp(trimmed).flop().png().toBuffer());
  const mf = path.join(ASSETS, "manifest.json");
  const m = JSON.parse(fs.readFileSync(mf, "utf8"));
  for (const s of m.sprites) if (s.id === "tile-ramp-w" || s.id === "tile-ramp-n") { s.w = 128; s.h = 158; s.anchor = [64, 37]; s.source = "composite of tile-grass faces, see gen/ramp.mjs"; }
  fs.writeFileSync(mf, JSON.stringify(m, null, 1));
  console.log("ramp-w, ramp-n written");
} finally {
  await b.close();
}
