export const NEAR = 3;

const LIVE = {
  bonfire: () => true,
  chest: (s) => s === "closed",
  gate: (s) => s === "closed",
  elevator: (s) => s === "idle",
  watcher: () => true,
  door: (s) => s === "closed",
  ladder: (s) => s !== "down",
  lever: (s) => s === "up",
  pad: (s) => s === "live",
};

export function beckons(t) {
  if (!t || (t.trap && !t.decoy) || t.beckon === false) return false;
  if (t.beckon === true) return true;
  return !!LIVE[t.kind]?.(t.state);
}

export function beckonReach(d, near = NEAR) {
  return Math.min(1, Math.max(0, near + 1 - d));
}
