import puppeteer from "puppeteer-core";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const url = process.argv[2] || "http://localhost:8765/3d/index.html?level=dev";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars"],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await b.newPage();
  await page.setViewport({ width: 900, height: 800 });
  await page.goto(url);
  await page.waitForFunction(() => window.__done === true, { timeout: 60000 });
  const st = () => page.evaluate(() => { const a = window.__game.state.actor; return JSON.stringify({ cell: a.cell, y: +a.y.toFixed(2) }); });
  console.log("start      ", await st());
  for (const key of ["KeyW", "KeyD", "KeyS", "KeyA"]) {
    await page.keyboard.down(key); await wait(700); await page.keyboard.up(key); await wait(500);
    console.log("after", key.slice(3), "   ", await st());
  }
  await page.mouse.click(450, 400); await wait(4000);
  console.log("tap centre ", await st());
  await page.screenshot({ path: path.join(root, "out/smoke.png") });
} finally {
  await b.close();
}
