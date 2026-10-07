import sharp from "sharp";

export async function measure(file, cols = null) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const border = [];
  for (let x = 0; x < W; x += 4) border.push(px(x, 0), px(x, H - 1));
  const bg = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);
  const on = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = px(x, y);
    on[y * W + x] = (!cols || (x >= cols[0] && x <= cols[1])) && Math.max(...p.map((v, c) => Math.abs(v - bg[c]))) > 20 ? 1 : 0;
  }
  const col = new Array(W).fill(0);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) col[x] += on[y * W + x];
  const groups = [];
  let start = -1, gap = 0;
  for (let x = 0; x <= W; x++) {
    const filled = x < W && col[x] > 2;
    if (filled) { if (start < 0) start = x; gap = 0; }
    else if (start >= 0 && ++gap >= 6) { groups.push([start, x - gap]); start = -1; gap = 0; }
  }
  const boxes = groups.filter(([a, b]) => b - a > 15).map(([a, b]) => {
    let top = H, bot = 0;
    for (let x = a; x <= b; x++) for (let y = 0; y < H; y++) if (on[y * W + x]) { if (y < top) top = y; if (y > bot) bot = y; }
    return { x0: a, x1: b, top, bot, h: bot - top + 1 };
  });
  return { bg, W, H, boxes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const m = await measure(f);
    console.log(f, JSON.stringify(m.bg), m.boxes.map((b) => `${b.x0}-${b.x1}:${b.top}-${b.bot}(${b.h})`).join(" "));
  }
}
