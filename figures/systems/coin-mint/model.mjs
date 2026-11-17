// Coin striking model: the pressure on a 24 mm blank, how much of the die relief fills,
// and what that does to die life and output.
export const COIN_D = 24; // mm
export const BLANKS_PER_HIT = 8; // blanking press punches a staggered row of 8 per stroke
export const ALLOYS = {
  brass: { name: "Nickel-brass", full: 2.6, hv: [150, 85], tint: ["#e7c45a", "#b88a2a"] },
  cuni: { name: "Copper-nickel", full: 3.0, hv: [170, 95], tint: ["#d9dde2", "#9aa2ad"] },
  bimetal: { name: "Bimetallic", full: 3.2, hv: [175, 100], tint: ["#e7c45a", "#c7ccd3"] },
};
export const area = (d = COIN_D) => (Math.PI * d * d) / 4; // mm²
/** Mean contact pressure in GPa for a press force in tonnes-force. */
export const pressure = (tonnes, d = COIN_D) => (tonnes * 9806.65) / area(d) / 1000;
/** Fraction of the die relief filled: nothing below ~35 % of the full-fill pressure. */
export function fill(alloy, gpa) {
  const full = ALLOYS[alloy].full;
  return Math.min(1, Math.max(0, (gpa - 0.35 * full) / (0.65 * full)));
}
/** Die life falls steeply with overload (a fourth-power wear law, illustrative). */
export function dieLife(alloy, gpa) {
  const r = gpa / ALLOYS[alloy].full;
  return Math.round(Math.min(2e6, 1.2e6 / Math.max(0.6, r) ** 4) / 1000) * 1000;
}
export function verdict(alloy, gpa) {
  const f = fill(alloy, gpa), r = gpa / ALLOYS[alloy].full;
  if (r > 1.25) return { text: "Overstruck: flash & die wear", bad: true };
  if (f >= 0.97) return { text: "Full strike", bad: false };
  if (f >= 0.7) return { text: "Weak rim & lettering", bad: true };
  return { text: "Blank barely marked", bad: true };
}
/** Share of the strip turned into blanks for a staggered (hexagonal) layout with a web gap. */
export function stripUse(d = COIN_D, web = 1.6) {
  const pitch = d + web;
  return (area(d) / (pitch * pitch * Math.sqrt(3) / 2));
}
