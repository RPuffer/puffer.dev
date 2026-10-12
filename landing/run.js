const KEY = (n) => "isoworld:things:" + n;
const saved = (n) => {
  try { const v = JSON.parse(localStorage.getItem(KEY(n)) || "null"); return v && typeof v === "object" ? v : null; } catch { return null; }
};
const lit = (s) => !!(s && Array.isArray(s.respawn) && Object.values(s.things || {}).some((t) => t?.state === "lit"));
const play = (n, reset) => "../3d/index.html?level=" + encodeURIComponent(n) + (reset ? "&reset=1" : "");

export const ROLES = [
  ["Amazon Web Services", "Software Development Engineer II, API Gateway", "2023 to present"],
  ["Amazon Web Services", "Software Development Engineer I, Lambda", "2022 to 2023"],
  ["Dutchie", "Software Engineer, promoted to Senior inside a year", "2021 to 2022"],
  ["Northwestern Mutual", "Associate Software Engineer, promoted to Software Engineer in 2019", "2017 to 2021"],
  ["Pixel Hangers (Digital CMS)", "Software Engineer", "2016 to 2017"],
  ["University of Wisconsin Milwaukee", "BS, Computer Engineering, with honors", "December 2016"],
];

let warmed = false;
const warm = (name) => {
  if (warmed || navigator.connection?.saveData) return;
  warmed = true;
  import("../core/warm.js").then(({ idle, warmPage }) => idle(() => warmPage(name).finally(() => { window.__warm = true; }), 4000)).catch(() => {});
};

export async function wire({ begin, cont, label }) {
  let order = ["cat-medium"];
  try { order = (await (await fetch("../levels/run.json")).json()).order; } catch {}
  begin.href = play(order[0], true);
  begin.addEventListener("click", () => { for (const n of order) try { localStorage.removeItem(KEY(n)); } catch {} });
  const state = order.map(saved);
  warm(order[0]);
  let at = -1;
  for (let i = 0; i < order.length; i++) if (lit(state[i])) at = i;
  if (at < 0) for (let i = 0; i < order.length; i++) if (state[i]) at = i;
  if (at >= 0 && cont) {
    cont.href = play(order[at]);
    if (label) label.textContent = "island " + (at + 1) + ", " + order[at].split("-")[0];
    cont.hidden = false;
    begin.textContent = "Reset";
    begin.classList.add("reset");
    begin.parentNode.append(begin);
    let armed = 0;
    begin.addEventListener("click", (e) => {
      if (armed) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      begin.textContent = "Tap again to reset";
      armed = setTimeout(() => { armed = 0; begin.textContent = "Reset"; }, 3000);
    }, { capture: true });
  }
  return order;
}

export function rolesList(el) {
  el.innerHTML = ROLES.map(([who, what, when]) => `<li><b>${who}</b><span>${what}</span><i>${when}</i></li>`).join("");
}

export async function settle() {
  await Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
  window.__done = true;
}
