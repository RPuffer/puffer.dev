import fs from "node:fs";

const L = JSON.parse(fs.readFileSync(process.argv[2] || "levels/forest-b.json", "utf8"));
const posts = L.decor.filter((d) => /trunk|fire-bird/.test(d.t)).map((d) => [d.x + 0.5 + (d.ox || 0), d.z + 0.5 + (d.oz || 0), d.t]);
const s2 = Math.SQRT1_2;
let bad = 0;
for (const m of L.decor.filter((d) => d.t === "mist")) {
  const c = [m.x + 0.5 + (m.at?.[0] || 0), m.z + 0.5 + (m.at?.[2] || 0)];
  const hits = posts.filter(([x, z]) => {
    const dx = x - c[0], dz = z - c[1];
    return Math.abs(dx * s2 - dz * s2) < (m.w || 1.9) / 2 + 0.3 && Math.abs(dx * s2 + dz * s2) < 0.4;
  });
  const near = Math.min(...posts.map(([x, z]) => Math.abs((x - c[0]) * s2 + (z - c[1]) * s2)));
  console.log(`mist at ${c.map((v) => v.toFixed(2)).join(",")} y ${m.y}: ${hits.length ? "HITS " + hits.map((h) => h.slice(0, 2).map((v) => v.toFixed(2)).join(",")).join(" ") : "clear"}`);
  bad += hits.length;
}
process.exitCode = bad ? 1 : 0;
