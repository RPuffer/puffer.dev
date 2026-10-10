const meta = () => document.querySelector('meta[name="viewport"]');

function resetZoom() {
  const m = meta();
  if (!m || !window.visualViewport || window.visualViewport.scale <= 1.01) return;
  const base = m.content;
  m.content = base + ",maximum-scale=1";
  requestAnimationFrame(() => { m.content = base; });
}

export function guardPageZoom() {
  if (window.__noZoom) return;
  window.__noZoom = true;
  const st = document.createElement("style");
  st.textContent = "html,body,body *{touch-action:manipulation}canvas,.iw-band,.iw-band *{touch-action:none}";
  document.head.appendChild(st);
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  window.visualViewport?.addEventListener("resize", resetZoom);
  resetZoom();
}
