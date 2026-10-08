import { island } from "./common.js";
import { build, loadAtlas, buildColumn } from "./billboards.js";
import { rideUniforms } from "../../core/sequence.js";
import { mulberry32 } from "../../core/rng.js";
import { disposeTree } from "../renderer.js";

export const cloudsOff = (params) => params.clouds === "none" || params.clouds === "0";

export async function loadClouds(params, style) {
  if (cloudsOff(params)) return null;
  const atlas = await loadAtlas();
  let objects = [], last = null, column = null;
  return {
    column() {
      if (column) return column;
      const { mesh, tone } = buildColumn(atlas, rideUniforms, mulberry32(4242));
      let toned = null;
      column = {
        objects: [mesh],
        update(ctx) {
          if (rideUniforms.uRide.value <= 0.001) {
            mesh.visible = false;
            if (last && last !== toned) { toned = last; tone.uBg.value.copy(last.bg); tone.uHue.value.copy(last.hue); tone.uGain.value = last.gain; }
            return;
          }
          mesh.visible = true;
          mesh.position.set(ctx.x, ctx.y, ctx.z);
        },
      };
      return column;
    },
    kind: "billboards",
    mount(renderer, state, st = style) {
      const I = island(state, st);
      last = { bg: I.bg, hue: I.hue, gain: I.gain };
      objects = build(I, atlas);
      for (const o of objects) renderer.three.scene.add(o);
      window.__clouds = { kind: "billboards", objects };
      return objects;
    },
    orient(state) {
      for (const o of objects) o.userData.orient?.(state.proj);
    },
    unmount(renderer) {
      this.dispose(renderer, this.detach());
    },
    detach() {
      const old = objects;
      for (const o of old) o.visible = false;
      objects = [];
      window.__clouds = { kind: "billboards", objects };
      return old;
    },
    dispose(renderer, old) {
      for (const o of old) {
        renderer.three.scene.remove(o);
        disposeTree(o);
      }
    },
  };
}
