// Injection moulding cycle: cooling time from the standard slab formula, and simple rules for
// the defects you get outside the processing window.
export const WALL = 2.0; // mm wall thickness of the part
export const AREA = 2500; // mm² projected area of a 4-cavity tool with runners
export const RESINS = {
  abs: { name: "ABS", lo: 210, hi: 260, mould: 60, eject: 85, alpha: 0.085, colour: "#d8402c" },
  pp: { name: "Polypropylene", lo: 200, hi: 250, mould: 40, eject: 90, alpha: 0.075, colour: "#f2c230" },
  pc: { name: "Polycarbonate", lo: 280, hi: 320, mould: 90, eject: 130, alpha: 0.13, colour: "#5fb6ee" },
};
/** Cooling time (s): t = s²/(π²α) · ln(8/π² · (Tm − Tw)/(Te − Tw)), α in mm²/s. */
export function coolTime(id, melt) {
  const r = RESINS[id];
  return (WALL * WALL) / (Math.PI * Math.PI * r.alpha) * Math.log((8 / (Math.PI * Math.PI)) * (melt - r.mould) / (r.eject - r.mould));
}
/** Melt viscosity relative to the middle of the window (falls ~2.5 % per °C). */
export const viscosity = (id, melt) => Math.exp(0.025 * ((RESINS[id].lo + RESINS[id].hi) / 2 - melt));
/** Peak injection pressure in bar for a fill speed in % of the machine's maximum. */
export const pressure = (id, melt, speed) => 450 + 9 * speed * viscosity(id, melt);
export const clampTonnes = (bar) => (bar * 0.1 * 0.45 * AREA) / 9806.65; // cavity pressure ≈ 45 % of injection pressure
export function fillShare(id, melt, speed) {
  const r = RESINS[id];
  return Math.max(0.25, Math.min(1, 1 - Math.max(0, r.lo - melt) / 35 - Math.max(0, 35 - speed) / 70));
}
export function phases(id, melt, speed, cool) {
  const inject = 0.4 + 1.6 * (1 - speed / 100);
  return { close: 1.0, inject, hold: 1.5, cool, open: 1.0, eject: 0.6 };
}
export function verdict(id, melt, speed, cool) {
  const r = RESINS[id], f = fillShare(id, melt, speed), need = coolTime(id, melt);
  if (f < 0.98) return { text: "Short shot", bad: true };
  if (melt > r.hi + 5) return { text: "Burn marks", bad: true };
  if (speed > 92) return { text: "Flash at the parting line", bad: true };
  if (cool < need * 0.85) return { text: "Warped: ejected too hot", bad: true };
  return { text: "Good part", bad: false };
}
