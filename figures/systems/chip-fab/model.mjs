// Chip fab model: wafer starts, scanner throughput, defect-limited yield and the back end.
//
// Three stages set the tempo: the lithography scanner (its EUV source power decides how many
// wafers it can expose), the etch/deposition cluster, and the back end (dicing, bonding, test).
// Defects and overlay error decide how many of the dies on each wafer are good.

export const SIM_SPEED = 36;

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export const DIE_PER_WAFER = 600;
export const WAFER_MM = 300;

export function initialState() {
  return {
    time: 0,
    done: 0,
    thru: 90,
    yield: 0.85,
    good: 0,
    dies: 0,
    scannerCap: 125,
    backendCap: 110,
    bottleneck: "back end",
    overlay: 3,
    defects: 0.08,
    energy: 0,
  };
}

// Murphy's yield model against a fixed defect density, times an overlay penalty around the
// 2.5 nm budget a modern immersion or EUV layer is allowed.
export function yieldOf(defects, overlay) {
  const ad = 1.2 * defects;
  const murphy = ad > 1e-6 ? Math.pow((1 - Math.exp(-ad)) / ad, 2) : 1;
  const over = lim(1 - Math.max(0, overlay - 2.5) / 12, 0.42, 1);
  return lim(murphy * over, 0.05, 0.995);
}

export function step(s, u, dt) {
  const starts = lim(u.starts, 10, 180);
  const euv = lim(u.euv, 50, 600);
  const overlay = lim(u.overlay, 0.5, 8);
  const defects = lim(u.defects, 0.005, 1);

  // A scanner exposes about 0.5 wafers an hour per watt of source power once overheads are in.
  // The back end (dicing, bonding, test) is a hard 110 wafers an hour here.
  s.scannerCap = euv * 0.52;
  s.backendCap = 110;
  s.thru = Math.min(starts, s.scannerCap, s.backendCap);
  s.bottleneck = starts <= s.scannerCap && starts <= s.backendCap ? "wafer starts"
    : s.scannerCap <= s.backendCap ? "scanner" : "back end";
  s.overlay = overlay;
  s.defects = defects;
  s.yield = yieldOf(defects, overlay);
  s.energy = 6.8 * s.thru / 130;
  s.done = Math.min(1e9, s.done + (s.thru * dt) / 3600);
  s.good = s.thru * DIE_PER_WAFER * s.yield;
  s.dies = s.thru * DIE_PER_WAFER;
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    thru: s.thru,
    yield: s.yield,
    good: s.good,
    scannerCap: s.scannerCap,
    backendCap: s.backendCap,
    bottleneck: s.bottleneck,
    overlay: s.overlay,
    defects: s.defects,
    done: s.done,
    energy: s.energy,
  };
}
