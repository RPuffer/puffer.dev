const C1 = 1.70158, C3 = C1 + 1;
export const ease = {
  backOut: (t) => 1 + C3 * (t - 1) ** 3 + C1 * (t - 1) ** 2,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  linear: (t) => t,
};

export function createTweens() {
  const live = [];
  return {
    to(target, prop, value, { duration = 0.5, easing = ease.backOut, delay = 0 } = {}) {
      for (let i = live.length - 1; i >= 0; i--) if (live[i].target === target && live[i].prop === prop) live.splice(i, 1);
      live.push({ target, prop, from: target[prop], value, duration: Math.max(1e-3, duration), easing, t: -delay });
    },
    step(dt) {
      dt = Math.min(Math.max(dt, 0), 0.1);
      for (let i = live.length - 1; i >= 0; i--) {
        const w = live[i];
        w.t += dt;
        if (w.t < 0) continue;
        const k = Math.min(1, w.t / w.duration);
        w.target[w.prop] = w.from + (w.value - w.from) * w.easing(k);
        if (k >= 1) { w.target[w.prop] = w.value; live.splice(i, 1); }
      }
    },
    get active() { return live.length; },
  };
}
