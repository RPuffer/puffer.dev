import sharp from "sharp";
import fs from "node:fs";
const [out, ...files] = process.argv.slice(2);
const S = 300, cols = 4;
const comp = [];
for (const [i, f] of files.entries()) {
  comp.push({ input: await sharp(f).resize(S, S).png().toBuffer(), left: (i % cols) * S, top: Math.floor(i / cols) * (S + 18) + 18 });
  comp.push({ input: Buffer.from(`<svg width="${S}" height="18"><text x="3" y="14" font-size="14" fill="white">${f.split("/").pop()}</text></svg>`), left: (i % cols) * S, top: Math.floor(i / cols) * (S + 18) });
}
await sharp({ create: { width: S * cols, height: Math.ceil(files.length / cols) * (S + 18), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
