import puppeteer from "puppeteer-core";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const [level = "forest-b", keys = "W W A A W D D D", shot = "out/forest-b/walk.png"] = process.argv.slice(2);
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-b"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await b.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width: 900, height: 800 });
  await page.goto(`http://localhost:${process.env.PORT || 8765}/3d/index.html?level=${level}`);
  await page.waitForFunction(() => window.__done === true, { timeout: 60000 });
  const st = () => page.evaluate(() => { const a = window.__game.state.actor; return `${a.cell.join(",")} y ${a.y.toFixed(2)}`; });
  console.log("start", await st());
  for (const k of keys.split(/\s+/)) {
    await page.keyboard.down("Key" + k); await wait(450); await page.keyboard.up("Key" + k); await wait(450);
    console.log(k, await st());
  }
  await page.screenshot({ path: path.join(root, shot) });
  for (const e of errors) console.log("page error:", e);
} finally {
  await b.close();
}
