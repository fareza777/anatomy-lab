// Container terminal throughput model.
//
// A berth is a queueing network: quay cranes lift boxes off the ship, automated guided
// vehicles (AGVs) carry them to the yard, and yard cranes stack them. The slowest stage sets
// the tempo, and queues build in front of it. This is a lumped, continuous approximation of a
// discrete-event terminal — enough to feel the bottleneck move as the fleet changes.

export const CRANE_CYCLE = 108;   // s per container move, quay crane
export const AGV_TRIP = 215;      // s per round trip, one AGV
export const YARD_CYCLE = 72;    // s per container move, yard crane
export const YARD_CAPACITY = 5200; // TEU of usable yard space
export const SIM_SPEED = 240;     // plant seconds per real second

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function initialState() {
  return {
    time: 0,
    moved: 0,
    workload: 1800,
    throughput: 0,
    craneCap: 0,
    agvCap: 0,
    yardCap: 0,
    agvWait: 16,
    yardUse: 0.28,
    berth: 0,
    complete: false,
    limit: "quay",
  };
}

export function step(s, u, dt) {
  const cranes = lim(u.cranes, 1, 4);
  const agvs = lim(u.agvs, 2, 12);
  const yard = lim(u.yard, 1, 4);
  s.workload = lim(u.workload, 900, 3600);

  s.craneCap = (cranes * 3600) / CRANE_CYCLE;
  s.agvCap = (agvs * 3600) / AGV_TRIP;
  s.yardCap = (yard * 3600) / YARD_CYCLE;

  // The yard fills as boxes arrive. Near capacity, stacking slows down and the whole line suffers.
  s.yardUse = lim(0.28 + (s.moved / YARD_CAPACITY) * 0.72, 0.28, 0.99);
  const yardPenalty = s.yardUse > 0.88 ? lim(1 - (s.yardUse - 0.88) * 3.5, 0.55, 1) : 1;
  const yardEffective = s.yardCap * yardPenalty;

  s.limit = s.craneCap <= s.agvCap && s.craneCap <= yardEffective ? "quay" : s.agvCap <= yardEffective ? "agv" : "yard";
  const demand = Math.min(s.craneCap, yardEffective);
  s.throughput = s.complete ? 0 : Math.min(demand, s.agvCap);
  s.moved = Math.min(s.workload, s.moved + (s.throughput * dt) / 3600);
  s.complete = s.moved >= s.workload - 1e-6;
  if (s.complete) s.throughput = 0;

  // AGVs queue when the quay and yard ask for more trips than the fleet can supply.
  const agvLoad = demand / Math.max(1, s.agvCap);
  const waitTarget = 16 + Math.max(0, agvLoad - 0.8) * 260 + Math.max(0, s.yardUse - 0.9) * 90;
  s.agvWait += (waitTarget - s.agvWait) * Math.min(1, dt / 24);
  s.berth = s.throughput > 0.1 ? ((s.workload - s.moved) / s.throughput) : 0;
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    throughput: s.throughput,
    craneCap: s.craneCap,
    agvCap: s.agvCap,
    yardCap: s.yardCap,
    agvWait: s.agvWait,
    yardUse: s.yardUse,
    berth: s.berth,
    moved: s.moved,
    limit: s.limit,
    complete: s.complete,
  };
}
