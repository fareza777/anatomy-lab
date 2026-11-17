// Mechanical watch: a balance and hairspring oscillator released by a Swiss lever escapement.
export const BPH = 28800; // beats per hour (4 Hz)
export const F0 = BPH / 3600 / 2; // oscillations per second
export const RESERVE_H = 42; // power reserve when fully wound
export const ESC_TEETH = 20;
/** Balance amplitude (degrees) from the mainspring's state of wind (0..1). */
export const amplitude = (wind) => Math.min(310, 150 + 165 * Math.sqrt(Math.max(0, wind)));
/**
 * Rate in seconds per day. The regulator changes the hairspring's active length:
 * f ∝ √(κ/I) and κ ∝ 1/L, so a length change ΔL/L shifts the rate by about −½·ΔL/L.
 * At low amplitude the balance runs fast (a typical isochronism error).
 */
export function rate(regulator, wind) {
  const dL = -regulator * 0.0005; // regulator −1..+1 → ΔL/L of +0.05 %..−0.05 %
  const fromLength = 86400 * (1 / Math.sqrt(1 + dL) - 1);
  const fromAmplitude = Math.max(0, 220 - amplitude(wind)) * 0.12;
  return fromLength + fromAmplitude;
}
// Gear train: the escape wheel advances half a tooth per beat.
export const escapeRpm = () => (BPH / 60) / (ESC_TEETH * 2); // 12 rpm
export const TRAIN = { escape: 1, fourth: 1 / 12, third: 1 / 90, centre: 1 / 720, barrel: 1 / 5760 };
