import puppeteer from "puppeteer-core";
import path from "node:path";

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

export async function launch() {
  return puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-hero"),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
  });
}

export async function openHero(browser, base, query, { width = 900, height = 800 } = {}) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console " + m.text()); });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${base}/3d/index.html?${query}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 30000, polling: 100 });
  const err = await page.evaluate(() => window.__error || null);
  if (err) problems.push("error " + err);
  await page.evaluate(() => {
    window.__game.pause();
    const scene = window.__game.renderer.three.scene;
    window.__hero = scene.children.find((o) => o.userData?.animate);
  });
  return { page, problems };
}

export async function fitZoom(browser, base, level) {
  const { page } = await openHero(browser, base, `level=${level}`);
  const z = await page.evaluate(() => { const c = window.__game.renderer.three.camera; return window.innerWidth / (c.right - c.left); });
  await page.close();
  return z;
}

export const posePage = (page, name, t) => page.evaluate((n, tt) => {
  window.__hero.userData.pose(n, tt);
  window.__game.renderer.render(window.__game.state, 0);
}, name, t);
