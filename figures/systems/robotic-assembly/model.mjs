// Robotic body shop throughput model.
//
// The line is paced by a takt: one body leaves each station every takt seconds. Welding is the
// only stage that can exceed the takt, because a fixed number of spot welds must be shared by
// the robots. The slowest of the two sets the real cycle, and the difference shows up as either
// idle conveyor time or saturated robots.

export const WELDS_PER_BODY = 46; // spot welds in a body-in-white
export const WELD_SECONDS = 2.6;  // per weld, per robot
export const SIM_SPEED = 8;       // plant seconds per real second

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function initialState() {
  return {
    time: 0,
    built: 0,
    order: 60,
    throughput: 0,
    taktActual: 60,
    weldTime: 0,
    util: 0,
    quality: 99.2,
    bottleneck: "takt",
    mix: false,
    wip: 5,
  };
}

export function step(s, u, dt) {
  const takt = lim(u.takt, 40, 110);
  const robots = lim(Math.round(u.robots), 2, 8);
  s.order = lim(Math.round(u.order), 30, 120);
  s.mix = !!u.mix;

  // Every robot works in parallel on the same body, so the cell time is welds / robots.
  s.weldTime = (WELDS_PER_BODY / robots) * WELD_SECONDS + (s.mix ? 7 : 0);
  s.taktActual = Math.max(takt, s.weldTime);
  s.util = s.weldTime / s.taktActual;
  s.throughput = s.built >= s.order ? 0 : 3600 / s.taktActual;
  s.quality = 99.2 - Math.max(0, 4 - robots) * 0.35 - (s.mix ? 0.25 : 0);
  s.bottleneck = s.weldTime > takt + 0.5 ? "welders" : "takt";
  s.built = Math.min(s.order, s.built + (s.throughput * dt) / 3600);
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    throughput: s.throughput,
    taktActual: s.taktActual,
    weldTime: s.weldTime,
    util: s.util,
    built: s.built,
    order: s.order,
    quality: s.quality,
    bottleneck: s.bottleneck,
    mix: s.mix,
  };
}
