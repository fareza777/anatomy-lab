// Parcel hub model: induction, cross-belt sorter, chutes and outbound, plus an AMR fleet that
// feeds the induct. At steady state the slowest stage limits the flow; a surge piles up backlog.

export const SIM_SPEED = 26;

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function initialState() {
  return {
    time: 0,
    feed: 0,
    sorted: 0,
    backlog: 0,
    surge: 0,
    jam: 0,
    robots: 0,
    util: 0,
    bottleneck: "sorter",
    inductCap: 0,
    sorterCap: 0,
    chuteCap: 0,
    outCap: 0,
    demand: 0,
  };
}

export function stageCaps(u) {
  return {
    induct: 26000 + u.amrs * 700,
    sorter: u.speed * 17500,
    chutes: 46000,
    outbound: 44000,
  };
}

export function step(s, u, dt) {
  const pph = lim(u.pph, 5000, 160000);
  const speed = lim(u.speed, 0.8, 3);
  const amrs = lim(u.amrs, 4, 60);
  const caps = stageCaps({ pph, speed, amrs });
  s.inductCap = caps.induct;
  s.sorterCap = caps.sorter;
  s.chuteCap = caps.chutes;
  s.outCap = caps.outbound;
  s.surge = Math.max(0, s.surge - dt);
  s.demand = pph * (s.surge > 0 ? 1.7 : 1);

  const capacity = Math.min(caps.induct, caps.sorter, caps.chutes, caps.outbound);
  // The system drains its backlog at up to 15 % of its size per second of plant time while
  // capacity is free; above capacity the backlog grows with every parcel that cannot enter.
  const offer = s.demand + s.backlog * 0.15;
  const feed = Math.min(capacity, offer);
  s.feed = feed;
  s.sorted = Math.min(1e9, s.sorted + (feed * dt) / 3600);
  s.backlog = Math.max(0, s.backlog + ((s.demand - feed) * dt) / 3600);
  s.util = capacity > 0 ? feed / caps.sorter : 0;
  s.robots = Math.min(amrs, Math.max(0, Math.ceil(feed / 1900)));
  s.jam = lim(((speed - 2.25) / 0.55) * 55 + s.util * 45 - 25, 0, 99);
  const minCap = Math.min(caps.induct, caps.sorter, caps.chutes, caps.outbound);
  s.bottleneck = s.demand <= minCap ? "arrivals"
    : minCap === caps.induct ? "induct"
    : minCap === caps.sorter ? "sorter"
    : minCap === caps.chutes ? "chutes" : "outbound";
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    thru: s.feed,
    util: s.util,
    jam: s.jam,
    robots: s.robots,
    sorted: s.sorted,
    backlog: s.backlog,
    bottleneck: s.bottleneck,
    inductCap: s.inductCap,
    sorterCap: s.sorterCap,
    chuteCap: s.chuteCap,
    outCap: s.outCap,
    demand: s.demand,
    surge: s.surge,
  };
}
