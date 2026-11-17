// What kind of eruption? Silica sets the magma's temperature and viscosity; dissolved gas sets
// how violently it fragments. Plume height from the Mastin et al. (2009) fit.
export function magma(silica, gas) {
  const tempC = 1200 - (silica - 48) * 12;
  const logEta = 2 + 0.29 * (silica - 48); // Pa·s
  const E = gas * logEta; // a simple explosivity score
  let style;
  if (logEta < 4) style = gas < 2.5 ? "Hawaiian" : "Strombolian";
  else if (logEta < 7) style = gas < 1.8 ? "Lava dome" : "Vulcanian";
  else style = gas < 1.4 ? "Lava dome" : "Plinian";
  const explosive = style === "Vulcanian" || style === "Plinian";
  let mer = Math.min(1e9, Math.max(1e3, 10 ** (2 + 0.3 * E))); // kg/s
  if (style === "Vulcanian") mer = Math.min(mer, 1e6);
  if (!explosive) mer = Math.min(Math.max(mer, 1e4), 5e4);
  const plumeKm = explosive ? 2.0 * (mer / 2500) ** 0.241 : style === "Strombolian" ? 0.3 + 0.25 * gas : 0.3 + 0.15 * gas;
  const vei = style === "Plinian" ? (plumeKm < 25 ? 4 : plumeKm < 35 ? 5 : 6) : style === "Vulcanian" ? (plumeKm < 10 ? 2 : 3) : style === "Hawaiian" ? 0 : 1;
  // lava speed down a 10° slope, 0.5 m deep flow (Jeffreys): v = ρ g sinθ h² / (3η)
  const lava = (2700 * 9.81 * Math.sin((10 * Math.PI) / 180) * 0.25) / (3 * 10 ** logEta);
  return { tempC, logEta, E, style, explosive, mer, plumeKm, vei, lava };
}
