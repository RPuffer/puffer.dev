export const ALIAS = {
  "bush-cluster": { t: "bush", v: 1, mul: 1.7 },
};

export const MUL = { scaffold: 1.3, marker: 0.55, well: 1.3 };

export const COMPOUND = {
  "fence-pen": [
    { t: "fence", rot: 0, ox: 0, oz: -0.3 },
    { t: "fence", rot: 1, ox: -0.3, oz: 0 },
    { t: "fence", rot: 1, ox: 0.3, oz: 0 },
    { t: "fence", rot: 0, ox: 0, oz: 0.3 },
  ],
};

export function expandDecor(list) {
  const out = [];
  for (const d of list) {
    const parts = COMPOUND[d.t];
    if (!parts) { out.push(d); continue; }
    for (const p of parts) out.push({ ...d, t: p.t, rot: p.rot ?? d.rot, ox: (d.ox || 0) + (p.ox || 0), oz: (d.oz || 0) + (p.oz || 0), base: d.t });
  }
  return out;
}
