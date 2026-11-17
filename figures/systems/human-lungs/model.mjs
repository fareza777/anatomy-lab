// Breathing and gas exchange: alveolar ventilation, the alveolar gas equation and the
// oxygen–haemoglobin dissociation curve (Severinghaus).
export const DEAD_SPACE = 150; // ml
export const VCO2 = 200; // ml/min CO2 produced at rest
export const pressureAt = (alt) => 760 * Math.exp(-alt / 8434); // mmHg
export function gases(rate, tidal, alt) {
  const VE = (rate * tidal) / 1000; // L/min
  const VA = (rate * Math.max(0, tidal - DEAD_SPACE)) / 1000;
  const PaCO2 = Math.min(120, (0.863 * VCO2) / Math.max(0.3, VA));
  const Pb = pressureAt(alt);
  const PiO2 = 0.2095 * (Pb - 47);
  const PAO2 = Math.max(0, PiO2 - PaCO2 / 0.8);
  const PaO2 = Math.max(0, PAO2 - 8);
  const SpO2 = 100 / (1 + 23400 / (PaO2 ** 3 + 150 * PaO2));
  const pH = 6.1 + Math.log10(24 / (0.03 * PaCO2));
  return { VE, VA, PaCO2, PiO2, PAO2, PaO2, SpO2, pH, Pb };
}
