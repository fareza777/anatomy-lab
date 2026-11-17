// Sun–Earth–Moon: orbital position, seasons, daylight and lunar phase.
// Day numbers run 1..365 from 1 January. Angles in radians unless named *Deg.

export const TILT_DEG = 23.44;
export const ECC = 0.0167;
export const PERIHELION_DAY = 3; // ~3 January
/** New moons around 2026 (UTC) as day-of-year: 1.0 = 1 January 00:00. */
export const NEW_MOONS_2026 = [
  -10.93, // 20 Dec 2025 01:43
  18.83, 48.5, 78.06, 107.49, 136.83, 166.12, 195.41, 224.73, 254.14, 283.66, 313.29, 343.04,
  372.85, // 7 Jan 2027 20:24
];

const RAD = Math.PI / 180;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function dateOf(day) {
  let d = Math.max(1, Math.min(365, Math.round(day)));
  for (let m = 0; m < 12; m++) { if (d <= DAYS[m]) return `${d} ${MONTHS[m]}`; d -= DAYS[m]; }
  return "31 Dec";
}

/** Earth's heliocentric longitude (rad, from the March equinox direction) and distance (AU). */
export function orbit(day) {
  const M = (2 * Math.PI * (day - PERIHELION_DAY)) / 365.256; // mean anomaly
  const v = M + 2 * ECC * Math.sin(M) + 1.25 * ECC * ECC * Math.sin(2 * M); // true anomaly (equation of centre)
  const r = (1 - ECC * ECC) / (1 + ECC * Math.cos(v));
  const lonPeri = 102.9 * RAD + Math.PI; // longitude of perihelion, measured as Earth's position angle
  return { angle: v + lonPeri, r };
}

/** Solar declination (deg): positive in northern summer. The Sun's ecliptic longitude is measured
 * from Earth's position at the March equinox (~20 March, day 79). */
export function declination(day) {
  const lambda = orbit(day).angle - orbit(79).angle;
  return Math.asin(Math.sin(TILT_DEG * RAD) * Math.sin(lambda)) / RAD;
}

/** Hours of daylight at a latitude (deg) on a day, including ~0.83° for refraction and the Sun's disc. */
export function daylight(day, latDeg) {
  const d = declination(day) * RAD, L = latDeg * RAD, h0 = -0.833 * RAD;
  const c = (Math.sin(h0) - Math.sin(L) * Math.sin(d)) / (Math.cos(L) * Math.cos(d));
  if (c <= -1) return 24;
  if (c >= 1) return 0;
  return (2 * Math.acos(c)) / (15 * RAD);
}

export function season(day, north = true) {
  const s = day < 79 || day >= 355 ? 0 : day < 172 ? 1 : day < 266 ? 2 : 3; // winter, spring, summer, autumn (north)
  const names = north ? ["Winter", "Spring", "Summer", "Autumn"] : ["Summer", "Autumn", "Winter", "Spring"];
  return names[s];
}

/** Lunar phase: age in days, illuminated fraction and name. */
export function moon(day) {
  // real new moons, so the phase stays right all year (mean months drift by up to a day)
  let i = NEW_MOONS_2026.findIndex((t) => t > day) - 1;
  if (i < 0) i = day < NEW_MOONS_2026[0] ? 0 : NEW_MOONS_2026.length - 2;
  const start = NEW_MOONS_2026[i], len = NEW_MOONS_2026[i + 1] - start;
  const age = Math.max(0, day - start);
  const phase = Math.min(age / len, 0.9999); // 0 new, 0.5 full
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const names = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
  return { age, phase, lit, name: names[Math.round(phase * 8) % 8] };
}
