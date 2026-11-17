// Bean-to-bar chocolate line: the numbers the figure prints and the states it shows.
// Tempering windows follow common couverture guidance (melt, cool to seed, rework to
// the Form V working temperature). Units: degC, minutes, grams.

export const TYPES = {
  dark: { label: "Dark", melt: 50, cool: 27.5, lo: 31, hi: 32, cocoa: 70, color: "choc" },
  milk: { label: "Milk", melt: 45, cool: 26.5, lo: 29, hi: 30, cocoa: 35, color: "milkchoc" },
  white: { label: "White", melt: 42, cool: 25.5, lo: 28, hi: 29, cocoa: 28, color: "whitechoc" },
};

export const BAR_GRAMS = 100;
export const CAVITIES = 4; // bars per mould
export const CONCHE_HOURS = { dark: 12, milk: 18, white: 10 };

/** Crystal outcome at a working temperature. */
export function temperState(type, work) {
  const t = TYPES[type];
  if (work > t.hi + 0.4) return { form: "Unstable", ok: false, note: "Too warm: Form V crystals melt, bars set soft and bloom grey." };
  if (work < t.lo - 1.0) return { form: "Form IV", ok: false, note: "Too cool: thick, over-crystallised, dull and crumbly." };
  if (work < t.lo - 0.2) return { form: "Form V+IV", ok: false, note: "A little cool: thick to deposit, slight dullness." };
  return { form: "Form V", ok: true, note: "In temper: glossy surface, clean snap, slow melt on the tongue." };
}

/** Roast profile: drum temperature to colour and flavour. */
export function roastNote(c) {
  if (c < 118) return "Fruity, bright";
  if (c < 128) return "Balanced";
  if (c < 140) return "Rich, nutty";
  return "Roasty, bitter";
}

/** Roast colour 0 (pale) .. 1 (dark). */
export const roastShade = (c) => Math.min(1, Math.max(0, (c - 105) / 45));

export const barsPerMinute = (mouldsPerMinute) => mouldsPerMinute * CAVITIES;
export const kgPerHour = (mouldsPerMinute) => (barsPerMinute(mouldsPerMinute) * 60 * BAR_GRAMS) / 1000;

/** The tempering curve over one batch, as [minutes, degC] points ending at the working temperature. */
export function temperCurve(type, work) {
  const t = TYPES[type];
  return [[0, 30], [4, t.melt], [10, t.melt], [18, t.cool], [22, t.cool], [26, work], [34, work]];
}
