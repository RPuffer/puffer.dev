export const VIEWS = {
  home: { frame: [351, 390] },
};

export const DEFAULT_VIEW2D = { scale: 0.5, frame: [351, 390], center: null, nudge: [0, 0] };

export function view2d(level, params = {}, spritePxPerUnit = 90.5) {
  const lv = level.view || {};
  const v = { ...DEFAULT_VIEW2D, fit: !(lv.zoom > 0) };
  if (lv.zoom > 0) v.scale = lv.zoom / spritePxPerUnit;
  if (Array.isArray(lv.center)) v.center = lv.center;
  Object.assign(v, VIEWS[level.name] || {});
  if (params.scale && !isNaN(+params.scale)) { v.scale = +params.scale; v.fit = false; }
  const c = String(params.center || "").split(",").map(Number);
  if (c.length === 3 && c.every((n) => !isNaN(n))) v.center = c;
  return v;
}
