export const DEFAULT_VIEW = { pitch: 35.264, yaw: 45, tileH: 1, zoom: 0 };
export const PLAY_PITCH = 45;

const RAD = Math.PI / 180;

export function viewFrom(level = {}, params = {}, base = DEFAULT_VIEW) {
  const v = { ...DEFAULT_VIEW, ...base, ...(level.view || {}) };
  for (const k of ["pitch", "yaw", "tileH", "zoom"]) if (params[k] != null && params[k] !== "" && !isNaN(+params[k])) v[k] = +params[k];
  return v;
}

export function makeProjection(view = DEFAULT_VIEW) {
  const p = view.pitch * RAD, y = view.yaw * RAD;
  const dir = [Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)];
  const right = [Math.cos(y), 0, -Math.sin(y)];
  const up = [-Math.sin(p) * Math.sin(y), Math.cos(p), -Math.sin(p) * Math.cos(y)];
  const dot = (a, x, yy, z) => a[0] * x + a[1] * yy + a[2] * z;
  return {
    view, dir, right, up,
    project(x, yy, z, scale = 1) {
      return { sx: dot(right, x, yy, z) * scale, sy: -dot(up, x, yy, z) * scale, depth: dot(dir, x, yy, z) };
    },
    unprojectGround(sx, sy, groundY = 0, scale = 1) {
      const a = sx / scale, b = -sy / scale;
      const px = right[0] * a + up[0] * b, py = right[1] * a + up[1] * b, pz = right[2] * a + up[2] * b;
      const t = (groundY - py) / dir[1];
      return { x: px + dir[0] * t, y: groundY, z: pz + dir[2] * t };
    },
  };
}

export const cellCenter = (x, z) => ({ x: x + 0.5, z: z + 0.5 });
export const worldToCell = (wx, wz) => [Math.floor(wx), Math.floor(wz)];

export function levelScreenBounds(level, proj, scale = 1) {
  const [W, D] = level.size, T = proj.view.tileH;
  let maxH = 0;
  for (const row of level.cells) for (const c of row) maxH = Math.max(maxH, c.h || 0);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, z] of [[0, 0], [W, 0], [0, D], [W, D]]) for (const yy of [-0.35, (maxH + 2.5) * T]) {
    const s = proj.project(x, yy, z, scale);
    minX = Math.min(minX, s.sx); maxX = Math.max(maxX, s.sx); minY = Math.min(minY, s.sy); maxY = Math.max(maxY, s.sy);
  }
  return { minX, minY, maxX, maxY };
}
