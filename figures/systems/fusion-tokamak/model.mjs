// A tokamak is a magnetic bottle. This lumped model tracks the plasma temperature, density and
// confinement time, then derives fusion power, gain Q and the electricity that a thermal cycle
// could make. Field, heating, fuelling and cryogenic cooling are the four coupled controls.
export const SIM_SPEED = 1.0;

const lim = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function initialState() {
  return {
    T: 12.0,
    n: 8.8,
    B: 5.6,
    magnet: 4.2,
    fuel: 60,
    heat: 70,
    field: 80,
    cooling: 80,
    tau: 0.85,
    Pfus: 534,
    Paux: 59,
    Q: 9.0,
    Pe: 150,
    disrupted: false,
    quench: false,
    pulse: 1,
    time: 0,
  };
}

export function step(s, u, dt) {
  dt = Math.max(0, Math.min(dt, 0.5));
  if (!dt) return s;
  const field = lim(u.field / 100, 0, 1);
  const heat = lim(u.heating / 100, 0, 1);
  const fuel = lim(u.fuel / 100, 0, 1);
  const cooling = lim(u.cooling / 100, 0, 1);
  s.field = u.field; s.heat = u.heating; s.fuel = u.fuel; s.cooling = u.cooling;

  const B = 2 + 4.5 * field;
  const heating = 10 + 70 * heat;
  const nTarget = 4 + 8 * fuel;

  // Density follows the pellet injectors with a lag; the edge pumps always pull some out.
  s.n += (nTarget - s.n) * 0.40 * dt;

  // Confinement improves with field and density, and degrades a little as auxiliary heating rises.
  s.tau = lim(0.8 * Math.pow(B / 5.3, 1.2) * Math.pow(Math.max(s.n, 0.1) / 8, 0.4) * Math.pow(heating / 50, -0.3), 0.08, 4.0);
  if (heating < 30) s.tau *= 0.45;

  // D-T reactivity peaks around 14 keV. The Gaussian is a readable stand-in for the real
  // cross-section, which falls steeply on both sides of that peak.
  const sig = Math.exp(-Math.pow((s.T - 14) / 5.5, 2));
  let Pfus = 420 * Math.pow(Math.max(s.n, 0) / 8, 2) * sig * Math.pow(B / 5.3, 1.5);
  if (s.T < 4) Pfus *= Math.pow(Math.max(0, s.T) / 4, 2);

  // Cryogenics: the coils are superconducting only while cold. Too little cooling and the
  // magnet warms through its stability margin and quenches; the plasma loses confinement.
  s.magnet += (0.020 + 0.12 * (1 - cooling) - 0.09 * cooling) * dt;
  s.magnet = lim(s.magnet, 3.8, 12);
  if (s.magnet > 6.0) s.quench = true;

  // Greenwald-like density limit: too much fuel at low field detaches the plasma and disrupts.
  const nG = 12 * (B / 5.3);
  if (s.n > nG * 1.05) s.disrupted = true;

  if (s.quench || s.disrupted) Pfus = 0;

  // Power balance: auxiliary heating plus alpha self-heating sets an equilibrium temperature.
  const heatTotal = heating + 0.15 * Pfus;
  const Teq = 4 + 8 * (heatTotal / 120) * Math.pow(B / 5.3, 0.3) * Math.sqrt(Math.max(0.1, s.tau / 0.85));
  s.T += (Teq - s.T) * 0.80 * dt;
  s.T = lim(s.T, 0, 40);
  s.B = s.quench ? 0 : B;
  s.Paux = heating;
  s.Pfus = Pfus;
  s.Q = s.Paux > 0.1 ? Pfus / s.Paux : 0;
  s.Pe = Pfus > 0 ? Pfus * 0.35 * cooling * (0.6 + 0.4 * B / 6.5) : 0;
  s.time += dt;
  return s;
}

export function outputs(s) {
  const alarms = [];
  if (s.disrupted) alarms.push("disruption");
  if (s.quench) alarms.push("magnet quench");
  if (s.T < 5 && !s.disrupted) alarms.push("plasma cold");
  if (s.Q < 2 && !s.disrupted && !s.quench) alarms.push("low gain");
  if (s.magnet > 5.5 && !s.quench) alarms.push("coil warming");
  if (s.n > 11.5 && !s.disrupted) alarms.push("density limit");
  return {
    T: s.T,
    n: s.n,
    B: s.B,
    tau: s.tau,
    Pfus: s.Pfus,
    Paux: s.Paux,
    Q: s.Q,
    Pe: s.Pe,
    magnet: s.magnet,
    disrupted: s.disrupted,
    quench: s.quench,
    pulse: s.pulse,
    time: s.time,
    triple: s.n * s.T * s.tau,
    status: s.disrupted || s.quench ? "critical" : alarms.length ? "caution" : "nominal",
    alarms,
  };
}
