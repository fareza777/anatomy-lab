// Pressurised-water reactor power plant, lumped-parameter model.
//
// The model couples four loops that a real PWR couples:
//   1. neutronics  – point kinetics with one delayed-neutron group, solved with the prompt-jump
//                    approximation so a 60 fps page can run it without a stiff solver;
//   2. thermal     – fuel, primary coolant, steam-generator and steam pressure;
//   3. secondary   – turbine load, condenser back-pressure, generator output;
//   4. isotopes    – iodine-135 → xenon-135, with burn-up while the reactor runs.
// Time is accelerated: 1 real second ≈ 4 s of plant time, and the xenon clock is sped up
// another 240× so the operator can watch an hours-long xenon transient in half a minute.
// This is a teaching model, not an operator-training simulator.

export const RATED_MW = 3000;   // thermal power, MW
export const BETA = 0.0065;     // delayed-neutron fraction
export const LAMBDA = 0.0784;   // one-group precursor decay constant, 1/s
export const SIM_SPEED = 4;     // plant seconds per real second
export const XENON_SPEED = 240; // extra time-lapse for the iodine/xenon clock

const ROD_REF = 55;             // % withdrawn at which the bank contributes zero
const ROD_WORTH = 0.00011;      // reactivity per % of travel (about 1.1 pcm/%)
const BIAS = 0.028;             // fixed reactivity from boron and the equilibrium rod bank
const XE_WORTH = 0.028;         // xenon worth at equilibrium, 2.8 % Δk/k
const DOPPLER = 2.6e-5;         // fuel-temperature coefficient, Δk/k per °C
const MODERATOR = 1.1e-4;       // coolant-temperature coefficient, Δk/k per °C

const C_FUEL = 40;              // MJ/K, fuel + cladding
const C_COOLANT = 1100;         // MJ/K, primary water + metal
const H_FUEL = 8;               // MW/K, fuel to coolant
const UA_STEAM = 180;           // MW/K, steam generator
const K_STEAM = 18000;          // MJ per MPa, steam-generator/steam-line capacitance
const TAU_DECAY = 40;           // s, decay-heat smoothing
const TAU_I = (6.6 * 3600) / XENON_SPEED;
const TAU_XE = (9.2 * 3600) / XENON_SPEED;

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function initialState() {
  return {
    time: 0,
    x: 1,          // delayed precursors, normalised so n = 1 at criticality
    n: 1,          // fission power / rated
    tf: 680,       // average fuel temperature, °C
    tc: 305,       // average primary coolant temperature, °C
    psteam: 7.0,   // steam pressure, MPa
    pcond: 14,     // condenser pressure, kPa
    eff: 0.319,    // turbine/generator efficiency
    mwe: 956,      // electrical output, MW
    iodine: 1,     // ¹³⁵I, normalised to equilibrium at full power
    xe: 1,         // ¹³⁵Xe, normalised
    decay: 195,    // decay heat, MW
    tripped: false,
    turbineTripped: false,
    tripReason: "",
    damage: 0,
  };
}

/** Reactivity breakdown, in Δk/k. */
export function reactivity(s, u) {
  const rods = s.tripped ? 0 : lim(u.rods, 0, 100);
  const rod = ROD_WORTH * (rods - ROD_REF);
  const doppler = -DOPPLER * (s.tf - 680);
  const moderator = -MODERATOR * (s.tc - 305);
  const xenon = -XE_WORTH * s.xe;
  const trip = s.tripped ? -0.06 : 0;
  return { rods, rod, doppler, moderator, xenon, trip, bias: BIAS + trip, rho: BIAS + rod + doppler + moderator + xenon + trip };
}

export function step(s, u, dt) {
  // Protect the model from unphysical excursions while still letting the operator see a trip.
  if (!s.tripped) {
    if (s.tf > 1130) { s.tripped = true; s.tripReason = "High fuel temperature"; }
    else if (s.psteam > 9.6) { s.tripped = true; s.tripReason = "High steam pressure"; }
    else if (s.tc > 360) { s.tripped = true; s.tripReason = "High coolant temperature"; }
  }
  const r = reactivity(s, u);
  // A reactor trip also trips the turbine; afterwards only decay heat reaches the steam generator.
  if (s.tripped) s.turbineTripped = true;
  // Prompt jump: n = x·β/(β−ρ). Clamp just below prompt criticality; a real trip follows.
  let rho = lim(r.rho, -0.2, 0.00635);
  if (rho > 0.0058 && !s.tripped) { s.tripped = true; s.tripReason = "Prompt critical — automatic trip"; }
  const denom = Math.max(1e-4, BETA - rho);
  const rate = (LAMBDA * rho) / denom;
  s.x = lim(s.x * Math.exp(rate * dt), 1e-12, 80);
  s.n = lim((s.x * BETA) / denom, 0, 80);

  // Decay heat: about 6.5 % of rated power at shutdown, falling with a 40 s time constant.
  const decayTarget = 0.065 * RATED_MW * s.n;
  s.decay += (decayTarget - s.decay) * Math.min(1, dt / TAU_DECAY);
  const pthermal = 0.935 * RATED_MW * s.n + s.decay;

  // Fuel and primary coolant.
  s.tf += ((pthermal - H_FUEL * (s.tf - s.tc)) * dt) / C_FUEL;
  const tsat = 100 * Math.pow(Math.max(0.3, s.psteam) / 0.101325, 0.25); // °C, rough water saturation
  const qsg = lim(UA_STEAM * Math.max(0, s.tc - tsat), 0, 5000);
  s.tc += ((H_FUEL * (s.tf - s.tc) - qsg) * dt) / C_COOLANT;

  // Steam pressure: heat in from the steam generator, out through the turbine and relief valve.
  const load = s.turbineTripped ? 0 : lim(u.load, 0, 105) / 100;
  const qturb = load * RATED_MW * Math.sqrt(lim(s.psteam / 7, 0.15, 1.6));
  const qrelief = s.psteam > 8.4 ? Math.min(1600, 1100 * (s.psteam - 8.4)) : 0;
  s.psteam = lim(s.psteam + ((qsg - qturb - qrelief) * dt) / K_STEAM, 0.4, 14);

  // Condenser and generator. Poor cooling water raises back-pressure and costs efficiency.
  const qreject = qturb * 0.68;
  s.pcond = lim(5 + (9 * Math.pow(qreject / 2000, 2)) / Math.pow(Math.max(0.12, u.cooling / 80), 2), 4, 95);
  s.eff = lim(0.34 - 0.0035 * (s.pcond - 8), 0.15, 0.35);
  s.mwe = qturb * s.eff;

  // Iodine → xenon. Xenon burns up in a high flux, which is why it peaks after a shutdown.
  s.iodine = lim(s.iodine + ((s.n - s.iodine) / TAU_I) * dt, 0, 3.5);
  const production = (0.05 * s.n + 0.95 * s.iodine) * 1.6;
  const loss = s.xe * (1 + 0.6 * s.n);
  s.xe = lim(s.xe + ((production - loss) / TAU_XE) * dt, 0, 3.5);

  s.time += dt;
  s.damage = lim((s.tf - 1200) / 1000, 0, 1);
  if (s.tf > 2800) s.tf = 2800;
  if (s.tc > 500) s.tc = 500;
  return s;
}

/** Values for the gauges and the reactivity chart. */
export function outputs(s, u) {
  const r = reactivity(s, u);
  return {
    ...r,
    power: s.n * 100,
    pcm: r.rho * 1e5,
    mwe: s.mwe,
    tsat: 100 * Math.pow(Math.max(0.3, s.psteam) / 0.101325, 0.25),
  };
}
