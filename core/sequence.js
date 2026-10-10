export const BPM = 140;

export const SEQ = {
  close: 1.2,
  danceAt: 0.3,
  danceMax: 2.3,
  drop: 1.2,
  braceLead: 0.5,
  holdMin: 1.8,
  holdMax: 8,
  arrive: 1.4,
  settle: 0.8,
  overshoot: 0.05,
  back: 1.0,
  heroFrac: 0.3,
  jitter: 0.01,
  rideFrom: 2.2,
  rideIn: 0.5,
  rideOut: 0.6,
  short: 0.6,
  flash: 0.15,
};

export const rideUniforms = { uRide: { value: 0 }, uRideTime: { value: 0 }, uRideDir: { value: 1 } };

export const islandLabel = (name) => { const n = String(name || "").split("-")[0]; return n.charAt(0).toUpperCase() + n.slice(1); };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - (1 - t) ** 3;

export function createSequence({ game, run, view, rise = 2.4, short = () => false, dances = [], doc = typeof document !== "undefined" ? document : null }) {
  const fit = dances.filter((d) => d.duration <= SEQ.danceMax);
  const pool = fit.map((d) => d.name), span = Object.fromEntries(fit.map((d) => [d.name, d.duration]));
  let s = null, count = 0, frozen = null, veil = null;
  const hops = [];
  const api = {
    state: "idle",
    hops,
    get active() { return !!s; },
    get beat() { return s?.beat || "idle"; },
    get time() { return s?.t ?? null; },
    get zoomScale() { return view.zoomScale; },
    freeze(beat) { frozen = beat || null; },
    navigate,
    abort,
  };
  if (typeof window !== "undefined") window.__sequence = api;

  const facing = () => { const d = game.state.proj.dir; return Math.atan2(d[0], d[2]); };
  const lift = () => game.state.things?.things.find((t) => t.id === s.thingId);

  const mark = (beat) => {
    s.beat = beat;
    s.beats[beat] = +s.t.toFixed(3);
    api.state = beat;
  };

  const shade = (a, color) => {
    if (!doc) return;
    if (!veil) {
      veil = doc.createElement("div");
      veil.style.cssText = "position:fixed;inset:0;z-index:12;pointer-events:none;opacity:0";
      doc.body.appendChild(veil);
    }
    if (color) veil.style.background = color;
    veil.style.opacity = String(a);
  };

  function begin(e) {
    const st = game.state;
    s = { t: 0, thingId: e.thing.id, from: st.level.name, next: e.next, arrive: e.thing.arrive, beats: {}, clips: {}, short: short(), prepared: null, failed: null, navigated: false };
    s.dir = s.arrive === "exit" ? -1 : 1;
    rideUniforms.uRideDir.value = s.dir;
    rideUniforms.uRideTime.value = 0;
    if (s.short) { mark("rise"); return; }
    s.dance = pool.length ? pool[count++ % pool.length] : null;
    view.glow?.(true);
    view.seq({ frac: SEQ.heroFrac });
    st.actor.facing = facing();
    mark("close");
    run.preload(e.next).then((p) => { if (s && s.next === e.next) s.prepared = p; }, (err) => { if (s && s.next === e.next) s.failed = err; });
  }

  function navigate(next, from, arrive) {
    if (!s || s.next !== next) return false;
    s.navigated = true;
    if (s.short) { s.fadeAt = s.t; mark("fade"); shade(0, game.state.level.bg || null); }
    return true;
  }

  function finish() {
    view.release?.();
    view.glow?.(false);
    const total = +s.t.toFixed(3);
    hops.push({ from: s.from, next: s.next, dance: s.dance || null, beats: s.beats, clips: Object.fromEntries(Object.entries(s.clips).map(([b, c]) => [b, [...c]])), total, failed: !!s.failAt });
    s = null;
    api.state = "idle";
    rideUniforms.uRide.value = 0;
  }

  function abort() {
    if (!s) return;
    shade(0);
    view.release?.();
    view.glow?.(false);
    view.seq({ k: 0, y: 0, keep: null, shake: 0 });
    s = null;
    api.state = "idle";
    rideUniforms.uRide.value = 0;
  }

  function fail(err) {
    s.failAt = s.t;
    s.failFrom = { k: s.k ?? 0, y: view.drop };
    window.__swapError = String(err?.message || err || "The lift stalls");
    console.warn("[sequence] " + window.__swapError);
    view.hero?.userData.play?.("idle");
    view.seq({ shake: 0 });
    mark("fail");
  }

  function stepShort(dt) {
    if (!s.navigated) return;
    const u = (s.t - s.fadeAt) / (SEQ.short / 2);
    if (!s.swapping) {
      shade(clamp01(u));
      if (u < 1) return;
      s.swapping = true;
      const from = game.state.things;
      run.swap(s.next, { from: s.from, arrive: s.arrive }).then(() => { if (s) { s.swapped = s.t; mark("swap"); shade(1, game.state.level.bg || null); game.state.things?.say?.(islandLabel(s.next)); } }, (err) => {
        window.__swapError = String(err?.message || err);
        if (game.state.things === from) from?.stall();
        if (s) { s.swapped = s.t; s.failAt = s.t; mark("fail"); }
      });
      return;
    }
    if (s.swapped == null) return;
    const v = (s.t - s.swapped) / (SEQ.short / 2);
    shade(1 - clamp01(v));
    if (v >= 1) { shade(0); finish(); }
  }

  function stage() {
    const p = s.prepared;
    s.steps = run.stager(p, { from: s.from, arrive: s.arrive });
    s.stepAt = -1;
  }

  function settleNew() {
    const st = game.state, T = st.things;
    const e = T?.things.find((t) => t.kind === "elevator" && t.role === s.arrive && t.x === st.actor.cell[0] && t.z === st.actor.cell[1]);
    st.actor.locked = true;
    st.actor.path = [];
    st.actor.held = null;
    st.actor.facing = facing();
    s.landId = e?.id || null;
    if (e) { e.state = "landing"; e.ride = 1; e.lift = -s.dir * rise; }
    s.D2 = view.dropSpan();
    view.holdBg?.();
    view.seq({ y: s.dir * s.D2, keep: s.landId, frac: SEQ.heroFrac });
    if (s.dance) view.hero?.userData.play?.(s.dance, { fade: 0, at: (s.t - s.danceAt) % span[s.dance] });
    view.snap();
  }

  function stepFull(dt) {
    const t = s.t;
    if (s.failAt != null) {
      const u = clamp01((t - s.failAt) / SEQ.back);
      s.k = s.failFrom.k * (1 - inOut(u));
      view.seq({ k: s.k, y: s.failFrom.y * (1 - easeOut(u)) });
      rideUniforms.uRide.value *= 1 - u;
      if (u >= 1) {
        view.seq({ k: 0, y: 0, keep: null });
        game.state.things?.stall();
        finish();
      }
      return;
    }
    if (s.arriveAt == null) {
      s.k = inOut(clamp01(t / SEQ.close));
      view.seq({ k: s.k });
    }
    if (!s.danced && t >= SEQ.danceAt) {
      s.danced = true;
      s.danceAt = t;
      if (s.dance) view.hero?.userData.play?.(s.dance);
      mark("dance");
    }
    if (s.dropAt == null && s.navigated) {
      if (s.failed) return fail(s.failed);
      s.dropAt = t;
      s.bg = game.state.level.bg || null;
      s.D = view.dropSpan();
      const th = lift();
      if (th) th.state = "shaft";
      view.seq({ keep: s.thingId });
      view.flash?.(SEQ.flash);
      mark("drop");
    }
    if (s.dropAt == null) return;
    if (s.holdAt == null) view.seq({ y: -s.dir * s.D * easeIn(clamp01((t - s.dropAt) / SEQ.drop)) });
    if (s.holdAt == null && t - s.dropAt >= SEQ.drop) { s.holdAt = t; mark("hold"); }
    if (s.arriveAt == null) {
      const r = clamp01((t - SEQ.rideFrom) / SEQ.rideIn);
      rideUniforms.uRide.value = r;
    }
    if (s.holdAt != null && s.arriveAt == null) {
      if (!s.steps) {
        if (s.failed) return fail(s.failed);
        if (s.prepared) stage();
        else if (t - s.holdAt >= SEQ.holdMax) return fail(new Error("The lift stalls"));
        return;
      }
      if (s.stepAt < s.steps.length - 1) {
        if (game.state.frame === s.frame) return;
        s.frame = game.state.frame;
        s.stepAt++;
        s.steps[s.stepAt]();
        if (s.stepAt === 0) settleNew();
        return;
      }
      if (t - s.holdAt < SEQ.holdMin) return;
      if (!s.braced) {
        s.braced = t;
        view.hero?.userData.play?.("brace");
        view.seq({ shake: SEQ.jitter });
        mark("brace");
      }
      if (t - s.braced < SEQ.braceLead) return;
      run.commit(s.next, s.from, s.arrive);
      view.release?.();
      view.fadeBg?.();
      game.state.things?.say?.(islandLabel(s.next));
      s.arriveAt = t;
      view.seq({ shake: 0 });
      mark("arrive");
    }
    if (s.arriveAt == null) return;
    const u = clamp01((t - s.arriveAt) / SEQ.arrive);
    s.k = 1 - inOut(u);
    view.seq({ k: s.k, y: s.dir * s.D2 * (1 - easeOut(u)) });
    rideUniforms.uRide.value = 1 - clamp01((t - s.arriveAt) / SEQ.rideOut);
    const e = s.landId ? game.state.things?.byId[s.landId] : null;
    if (e) {
      const v = clamp01((t - s.arriveAt - (SEQ.arrive - SEQ.settle)) / SEQ.settle);
      const dip = v > 0.6 ? SEQ.overshoot * Math.sin(Math.PI * (v - 0.6) / 0.4) : 0;
      e.lift = s.dir * (dip - rise * (1 - inOut(v)));
    }
    if (u < 1) return;
    if (e) { e.lift = null; e.ride = 0; e.rideDir = 0; e.state = "idle"; }
    view.seq({ k: 0, y: 0, keep: null, shake: 0 });
    view.hero?.userData.play?.("land");
    game.state.actor.locked = false;
    mark("land");
    finish();
  }

  game.onTick((dt) => {
    if (!s) return;
    if (frozen && s.beat === frozen) return;
    s.t += dt;
    rideUniforms.uRideTime.value += dt * rideUniforms.uRide.value;
    if (s.short) stepShort(dt);
    else stepFull(dt);
    const c = s && view.hero?.userData.clip?.();
    if (c) (s.clips[s.beat] ||= new Set()).add(c);
  });

  run.onLoad((state) => {
    state.things?.on((e) => {
      if (e.type === "ride" && e.next && state.params.nav !== "0" && !s) begin(e);
    });
  });

  return api;
}
