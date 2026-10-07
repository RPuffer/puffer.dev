import fs from "node:fs";
import { bakeNoise } from "../../clouds/noise-bake.js";
fs.writeFileSync(new URL("noise64.bin", import.meta.url), bakeNoise());
console.log("noise64.bin");
