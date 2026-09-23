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
  const stoneUrl = await page.evaluate(async (rampSrc, stoneSrc) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
    const [r, st] = [await load(rampSrc), await load(stoneSrc)];
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
    const [out, o] = mk(128, 158);
    o.drawImage(r, 0, 0);
    const img = o.getImageData(0, 0, 128, 158), d = img.data;
    const [mc, m] = mk(128, 158);
    const mi = m.createImageData(128, 158);
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i + 1] > d[i] + 15 && d[i + 1] > d[i + 2] + 15 && d[i + 3] > 0;
      if (g) { mi.data[i] = 219; mi.data[i + 1] = 201; mi.data[i + 2] = 162; mi.data[i + 3] = d[i + 3]; }
    }
    m.putImageData(mi, 0, 0);
    const [wc, w] = mk(128, 158);
    w.setTransform(1, -42 / 64, 0, 1 + 42 / 37, 0, 42);
    w.beginPath(); w.moveTo(64, 2); w.lineTo(126, 37); w.lineTo(64, 72); w.lineTo(2, 37); w.closePath(); w.clip();
    w.drawImage(st, 0, 0);
    w.setTransform(1, 0, 0, 1, 0, 0);
    w.globalCompositeOperation = "destination-in";
    w.drawImage(mc, 0, 0);
    o.drawImage(mc, 0, 0);
    o.drawImage(wc, 0, 0);
    return out.toDataURL("image/png");
  }, b64("tile-ramp-s.png"), b64("tile-stone.png"));
  const sbuf = Buffer.from(stoneUrl.split(",")[1], "base64");
  fs.writeFileSync(path.join(ASSETS, "tile-ramp-s-stone.png"), sbuf);
  fs.writeFileSync(path.join(ASSETS, "tile-ramp-e-stone.png"), await sharp(sbuf).flop().png().toBuffer());
  const buf = Buffer.from(url.split(",")[1], "base64");
  const trimmed = await sharp(buf).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS, "tile-ramp-w.png"), trimmed);
  fs.writeFileSync(path.join(ASSETS, "tile-ramp-n.png"), await sharp(trimmed).flop().png().toBuffer());
  const mf = path.join(ASSETS, "manifest.json");
  const m = JSON.parse(fs.readFileSync(mf, "utf8"));
  for (const s of m.sprites) if (s.id === "tile-ramp-w" || s.id === "tile-ramp-n") { s.w = 128; s.h = 158; s.anchor = [64, 37]; s.source = "composite of tile-grass faces, see gen/ramp.mjs"; }
  m.sprites = m.sprites.filter((s) => !/^tile-ramp-[se]-stone$/.test(s.id));
  for (const d of ["s", "e"]) m.sprites.push({ id: `tile-ramp-${d}-stone`, type: "ramp", variant: `${d}-stone`, cat: "tile", file: `tile-ramp-${d}-stone.png`, w: 128, h: 158, anchor: [64, 37], footprint: [1, 1], plane: "top", step: 84, dir: d, m: "stone", source: "tile-ramp-s with tile-stone top warped onto the slope, see gen/ramp.mjs" });
  fs.writeFileSync(mf, JSON.stringify(m, null, 1));
  console.log("ramp-w, ramp-n written");
} finally {
  await b.close();
}
