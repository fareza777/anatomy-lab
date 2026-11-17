// Pure model of a single-cylinder, four-stroke, spark-ignition engine.
// Everything the figure moves and every number it prints comes from here.
// Units: mm, degrees, bar, cc. Cycle angle phi runs 0..720 deg; phi = 0 is TDC at the start of intake.

export const ENGINE = {
  bore: 80, // mm
  stroke: 80, // mm  -> crank radius 40
  rod: 140, // mm  centre to centre
  cr: 10, // compression ratio
  ivo: -10, ivc: 220, // intake opens 10 deg BTDC, closes 40 deg ABDC
  evo: 500, evc: 730, // exhaust opens 40 deg BBDC, closes 10 deg ATDC
  lift: 8, // mm peak valve lift
  burn: 50, // deg, Wiebe burn duration
};

export const crankR = ENGINE.stroke / 2;
export const sweptCc = (Math.PI * (ENGINE.bore / 20) ** 2 * ENGINE.stroke) / 10; // ~402 cc
export const clearanceCc = sweptCc / (ENGINE.cr - 1);

const RAD = Math.PI / 180;
export const wrap720 = (phi) => ((phi % 720) + 720) % 720;

/** Pin height above the crank axis (slider-crank). */
export function pinHeight(phi) {
  const t = phi * RAD;
  const r = crankR, l = ENGINE.rod;
  return r * Math.cos(t) + Math.sqrt(l * l - (r * Math.sin(t)) ** 2);
}

/** Piston travel from TDC in mm. */
export const travel = (phi) => crankR + ENGINE.rod - pinHeight(phi);

/** Cylinder volume in cc. */
export const volume = (phi) => clearanceCc + (Math.PI * (ENGINE.bore / 20) ** 2 * travel(phi)) / 10;

/** Instantaneous piston velocity in m/s at a given rpm (positive = moving down). */
export function pistonSpeed(phi, rpm) {
  const h = 0.05;
  return ((travel(phi + h) - travel(phi - h)) / (2 * h)) * (rpm * 6) / 1000;
}

/** Valve lift (mm) for a window [open, close] in cycle degrees, smooth sin^2 profile. */
function windowLift(phi, open, close) {
  const span = close - open;
  let x = wrap720(phi - open);
  if (x > span) return 0;
  return ENGINE.lift * Math.sin((Math.PI * x) / span) ** 2;
}
export const intakeLift = (phi) => windowLift(phi, ENGINE.ivo, ENGINE.ivc);
export const exhaustLift = (phi) => windowLift(phi, ENGINE.evo, ENGINE.evc);

/** Spark advance in degrees BTDC: more advance at higher speed and lighter load. */
export const sparkAdvance = (rpm, throttle) => 8 + 22 * Math.min(1, Math.max(0, (rpm - 800) / 5200)) + 6 * (1 - throttle);
export const sparkAt = (rpm, throttle) => 360 - sparkAdvance(rpm, throttle);

/** Manifold pressure (bar) from throttle opening 0..1. */
export const manifold = (throttle) => 0.28 + 0.7 * throttle;

/** Mass fraction burned (Wiebe). */
export function burned(phi, rpm, throttle) {
  const s = sparkAt(rpm, throttle);
  const x = (wrap720(phi) - s) / ENGINE.burn;
  if (x <= 0) return 0;
  return 1 - Math.exp(-5 * Math.min(x, 3) ** 3);
}

/** Cylinder pressure in bar (simplified single-zone model). */
export function pressure(phi, rpm, throttle) {
  const p = wrap720(phi);
  const pin = manifold(throttle);
  if (p < ENGINE.ivc) return pin; // intake valve open: cylinder sits at manifold pressure
  const n = 1.32; // polytropic exponent
  const vIvc = volume(ENGINE.ivc);
  const motored = (q) => pin * (vIvc / volume(q)) ** n;
  if (p < ENGINE.evo) return motored(p) * (1 + 3.0 * burned(p, rpm, throttle));
  const pEvo = motored(ENGINE.evo) * (1 + 3.0 * burned(ENGINE.evo, rpm, throttle));
  let pe = 1.08 + (pEvo - 1.08) * Math.exp(-(p - ENGINE.evo) / 22); // blowdown, then exhaust stroke
  if (p > 700) pe += (pin - 1.08) * ((p - 700) / 20); // valve overlap: settle to manifold pressure
  return pe;
}

export function strokeOf(phi) {
  const p = wrap720(phi);
  if (p < 180) return "Intake";
  if (p < 360) return "Compression";
  if (p < 540) return "Power";
  return "Exhaust";
}

/** Indicated work per cycle (J) by integrating p dV, and indicated power (kW). */
export function indicated(rpm, throttle) {
  let work = 0;
  const step = 1;
  for (let p = 0; p < 720; p += step) {
    const dV = (volume(p + step) - volume(p)) * 1e-6; // m^3
    work += ((pressure(p, rpm, throttle) + pressure(p + step, rpm, throttle)) / 2) * 1e5 * dV;
  }
  return { work, kw: (work * rpm) / 120 / 1000 };
}
