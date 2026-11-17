// Two-stage launch to low orbit: point-mass flight over a round Earth (in a local frame with
// the centrifugal term), exponential atmosphere, drag, and a simple pitch-over programme.
export const G0 = 9.80665, RE = 6371e3, MU = 3.986e14;
export const ST1 = { dry: 25600, prop: 395700, thrustSL: 7607e3, ispSL: 282, ispVac: 311 };
export const ST2 = { dry: 3900, prop: 92670, thrust: 981e3, isp: 348 };
export const FAIRING = 1700, AREA = 10.5, CD = 0.35;
export const rho = (h) => 1.225 * Math.exp(-Math.max(0, h) / 8500);
export const deltaV = (isp, m0, m1) => isp * G0 * Math.log(m0 / m1);
export function initial(payload) {
  return { t: 0, h: 0, x: 0, vv: 0, vh: 0, stage: 1, p1: ST1.prop, p2: ST2.prop, fairing: true, payload, maxQ: 0, event: "On the pad", done: false, meco: 0, seco: 0 };
}
export const mass = (s) => (s.stage === 1 ? ST1.dry + s.p1 : 0) + ST2.dry + s.p2 + s.payload + (s.fairing ? FAIRING : 0);
/** Pitch from vertical (radians): straight up for 12 s, then a steady turn toward horizontal. */
export const pitch = (t, h) => (t < 12 ? 0 : Math.min(Math.PI / 2 * 0.98, (Math.PI / 2) * Math.pow((t - 12) / 230, 0.62) + (h > 160e3 ? 0.08 : 0)));
export function step(s, dt) {
  if (s.done) return s;
  const n = { ...s };
  n.t += dt;
  const m = mass(s);
  let thrust = 0, mdot = 0;
  if (s.stage === 1 && s.p1 > 0) {
    const f = rho(s.h) / 1.225; // nozzle back-pressure: thrust and Isp rise as the air thins
    const isp = ST1.ispVac - (ST1.ispVac - ST1.ispSL) * f;
    thrust = ST1.thrustSL * (isp / ST1.ispSL);
    mdot = thrust / (isp * G0);
    n.p1 = Math.max(0, s.p1 - mdot * dt);
    if (n.p1 === 0) { n.stage = 2; n.meco = n.t; n.event = "Stage separation"; }
  } else if (s.stage === 2 && s.p2 > 0 && n.t > s.meco + 4) {
    thrust = ST2.thrust; mdot = thrust / (ST2.isp * G0);
    n.p2 = Math.max(0, s.p2 - mdot * dt);
    if (n.p2 === 0 || (s.h > 140e3 && perigee(s) > 180e3)) { n.done = true; n.seco = n.t; }
  }
  if (s.fairing && s.h > 110e3) { n.fairing = false; n.fairT = n.t; }
  const v = Math.hypot(s.vv, s.vh), q = 0.5 * rho(s.h) * v * v, drag = q * CD * AREA;
  n.maxQ = Math.max(s.maxQ, q);
  const th = pitch(s.t, s.h), r = RE + s.h;
  const ax = (thrust * Math.sin(th) - (v > 0 ? (drag * s.vh) / v : 0)) / m;
  const ay = (thrust * Math.cos(th) - (v > 0 ? (drag * s.vv) / v : 0)) / m - MU / (r * r) + (s.vh * s.vh) / r;
  n.vh = s.vh + ax * dt; n.vv = s.vv + ay * dt;
  n.h = Math.max(0, s.h + n.vv * dt); n.x = s.x + n.vh * dt;
  if (n.h === 0 && n.t > 5) { n.vv = 0; }
  n.acc = Math.hypot(ax, ay + MU / (r * r) - (s.vh * s.vh) / r) / G0;
  n.q = q;
  if (!n.done) {
    if (n.t < 1) n.event = "Lift-off";
    else if (q > 25e3 && q >= n.maxQ * 0.98 && s.stage === 1) n.event = "Max-Q";
    else if (n.fairT && n.t < n.fairT + 6) n.event = "Fairing separation";
    else if (n.stage === 2 && n.t < n.meco + 4) n.event = "Stage separation";
    else if (n.stage === 2) n.event = "Second stage burn";
    else if (n.stage === 1 && n.t > 1) n.event = "First stage burn";
  } else {
    const peri = perigee(n);
    n.event = peri > 120e3 ? "Orbit reached" : "Too slow for orbit";
  }
  return n;
}
/** Perigee altitude (m) of the conic through the current state. */
export function perigee(s) {
  const r = RE + s.h, v2 = s.vv * s.vv + s.vh * s.vh;
  const a = 1 / (2 / r - v2 / MU), hmom = r * s.vh, e = Math.sqrt(Math.max(0, 1 - (hmom * hmom) / (MU * a)));
  return a > 0 ? a * (1 - e) - RE : -RE;
}
