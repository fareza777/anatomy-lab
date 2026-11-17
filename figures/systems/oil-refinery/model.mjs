// Atmospheric crude distillation: product yields from the crude's true-boiling-point (TBP)
// curve, cut at fixed boiling ranges. Anything that boils above the furnace temperature stays
// liquid and leaves the bottom of the column as residue.
export const CRUDES = {
  light: { name: "Light crude", tbp: [[-20, 0], [30, 4], [110, 22], [180, 38], [250, 52], [350, 70], [450, 84], [550, 92], [750, 100]], density: 830 },
  heavy: { name: "Heavy crude", tbp: [[-20, 0], [30, 1.5], [110, 8], [180, 17], [250, 27], [350, 43], [450, 58], [550, 70], [800, 100]], density: 930 },
};
export const CUTS = [
  { id: "gas", name: "Refinery gas", lo: -50, hi: 30, colour: "#c9cfd6" },
  { id: "petrol", name: "Petrol", lo: 30, hi: 110, colour: "#f2d34a" },
  { id: "naphtha", name: "Naphtha", lo: 110, hi: 180, colour: "#f59a23" },
  { id: "kero", name: "Kerosene", lo: 180, hi: 250, colour: "#e8761a" },
  { id: "diesel", name: "Diesel", lo: 250, hi: 350, colour: "#c2571a" },
  { id: "fuel", name: "Fuel oil", lo: 350, hi: 450, colour: "#7a3c1a" },
  { id: "resid", name: "Residue", lo: 450, hi: 2000, colour: "#2b1d16" },
];
export function tbpAt(crude, T) {
  const c = CRUDES[crude].tbp;
  if (T <= c[0][0]) return 0;
  for (let i = 1; i < c.length; i++) if (T <= c[i][0]) { const [t0, v0] = c[i - 1], [t1, v1] = c[i]; return v0 + ((v1 - v0) * (T - t0)) / (t1 - t0); }
  return 100;
}
/** Volume % of each product. Fuel oil is limited by how hot the furnace makes the feed. */
export function yields(crude, furnace) {
  const top = Math.min(450, furnace + 40); // flash-zone overflash lifts a little more than the furnace temperature
  const out = {};
  for (const c of CUTS) {
    if (c.id === "resid") continue;
    const hi = c.id === "fuel" ? Math.max(350, top) : Math.min(c.hi, top);
    out[c.id] = Math.max(0, tbpAt(crude, hi) - tbpAt(crude, c.lo));
  }
  out.resid = 100 - Object.values(out).reduce((a, b) => a + b, 0);
  return out;
}
/** Furnace duty in MW: heat the feed (already preheated to ~240 °C by exchangers) and vaporise what goes up. */
export function duty(crude, furnace, bpd) {
  const kg = (bpd * 0.159 * CRUDES[crude].density) / 86400;
  const vap = (100 - yields(crude, furnace).resid) / 100;
  return (kg * (2.6 * Math.max(0, furnace - 240) + vap * 280)) / 1000;
}
