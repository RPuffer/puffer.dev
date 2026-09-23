import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { ROOT, HERE, charge } from "./lib.mjs";

const round = process.argv[2] || "x";
const level = process.argv[3] || "forest-c";
const prof = process.env.PP_PROFILE || ".pp-profile-c";
fs.rmSync(ROOT + prof + "/Default/Cache", { recursive: true, force: true });
fs.rmSync(ROOT + prof + "/Default/Code Cache", { recursive: true, force: true });
fs.mkdirSync(HERE + "critic", { recursive: true });
const summary = [];
for (const [w, h] of [[351, 390], [900, 800]]) {
  const png = `out/${level}-${w}.png`;
  execFileSync("node", ["tools/shot.mjs", `http://localhost:8765/3d/index.html?level=${level}&hero=0`, png, String(w), String(h)], { cwd: ROOT, env: { ...process.env, PP_PROFILE: prof }, stdio: "inherit" });
  let out = "";
  try { out = execFileSync("node", ["pipeline/critic.mjs", png, "--annotate", `out/${level}-r${round}-${w}-ann.png`, "--out", `pipeline/c-meshes/critic/r${round}-${w}.json`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const usd = +(out.match(/~\$([\d.]+)/)?.[1] || 0.05);
  charge({ model: "gemini-3.8-flash", kind: "critic", id: `r${round}-${w}`, usd });
  const rep = JSON.parse(fs.readFileSync(HERE + `critic/r${round}-${w}.json`, "utf8"));
  summary.push(`${w}: ${rep.high} high / ${rep.items.length} items`);
  for (const it of rep.items) console.log(`  [${w}] ${it.severity} ${it.support} ${it.issue}`);
}
console.log(`round ${round}: ${summary.join("; ")}`);
