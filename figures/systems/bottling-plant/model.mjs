// Rotary gravity filler: how long a bottle needs under its valve and how long the carousel gives it.
export const VALVES = 72; // a mid-size rotary filler
export const FILL_ARC = 240; // degrees of the turn a bottle spends under its valve
export const VOLUME = 500; // ml
export const PRODUCTS = {
  water: { name: "Still water", q: 120, overhead: 0.3, colour: "#7cc4f2" }, // ml/s at 30 cm head; s for valve open/close
  juice: { name: "Orange juice", q: 92, overhead: 0.4, colour: "#f59a23" },
  soda: { name: "Cola", q: 70, overhead: 1.1, colour: "#5a2e1a" }, // counter-pressure + snift
};
/** Flow through the valve follows Torricelli: Q grows with the square root of the liquid head. */
export const flow = (product, headCm) => PRODUCTS[product].q * Math.sqrt(headCm / 30);
export const needed = (product, headCm) => PRODUCTS[product].overhead + VOLUME / flow(product, headCm);
/** Seconds a bottle spends on the fill arc at a given output (bottles per hour). */
export const available = (bph) => ((3600 / bph) * VALVES * FILL_ARC) / 360;
export const rpm = (bph) => bph / VALVES / 60;
export function fillShare(product, headCm, bph) {
  return Math.min(1, available(bph) / needed(product, headCm));
}
