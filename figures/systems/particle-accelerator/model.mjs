// LHC model: energy ramp, dipole field, luminosity and stored beam energy.
// The beams are always circulating; the energy follows the control with a visible ramp.

export const SIM_SPEED = 1;

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function initialState() {
  return {
    time: 0,
    energy: 6.8,
    target: 6.8,
    field: 8.09,
    lumi: 1e34,
    collisions: 1e9,
    stored: 350,
    cryo: 1.9,
    ramping: false,
    bunches: 2800,
    beta: 0.55,
  };
}

export function step(s, u, dt) {
  const target = lim(u.energy, 1, 7);
  const bunches = lim(u.bunches, 300, 2800);
  const beta = lim(u.beta, 0.08, 1.5);
  s.target = target;
  s.bunches = bunches;
  s.beta = beta;

  const dE = target - s.energy;
  s.ramping = Math.abs(dE) > 0.02;
  if (s.ramping) {
    const rate = 0.8; // TeV per second of plant time
    s.energy += Math.sign(dE) * Math.min(Math.abs(dE), rate * dt);
  } else s.energy = target;

  s.field = 1.19 * s.energy;
  s.lumi = 1e34 * (bunches / 2800) * (0.55 / beta) * Math.pow(lim(s.energy / 6.8, 0.02, 1.03), 2);
  s.collisions = s.lumi * 1e-25;
  s.stored = 350 * (bunches / 2800) * Math.pow(lim(s.energy / 6.8, 0.02, 1.03), 2);
  s.cryo = 1.9 + (s.field > 8.2 ? 0.35 : 0);
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    energy: s.energy,
    field: s.field,
    lumi: s.lumi,
    collisions: s.collisions,
    stored: s.stored,
    cryo: s.cryo,
    bunches: s.bunches,
    beta: s.beta,
    ramping: s.ramping,
  };
}
