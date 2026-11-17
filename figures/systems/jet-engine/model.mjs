// Two-spool high-bypass turbofan, sea level, modelled as an ideal Brayton cycle with component
// efficiencies. Sized like a narrow-body airliner engine (≈ 120 kN class).
const CP_AIR = 1005, CP_GAS = 1150, LHV = 43e6, K = 0.2857;
export const BPR = 5.5;
export const MAX_FLOW = 350; // kg/s total air at full power
export function cycle(throttle, v0) {
  const n1 = 22 + 78 * throttle; // % fan speed
  const n = n1 / 100;
  const flow = MAX_FLOW * n ** 1.5;
  const core = flow / (1 + BPR), bypass = flow - core;
  const T2 = 288 + (v0 * v0) / (2 * CP_AIR); // ram temperature rise
  const opr = 1 + 31 * n ** 2.2;
  const fpr = 1 + 0.6 * n ** 2;
  const T3 = T2 * (1 + (opr ** K - 1) / 0.88);
  const T13 = T2 * (1 + (fpr ** K - 1) / 0.88);
  const T4 = 800 + 800 * throttle ** 1.2;
  const fuel = (core * CP_GAS * (T4 - T3)) / (0.99 * LHV);
  const work = (T3 - T2) * CP_AIR + (1 + BPR) * (T13 - T2) * CP_AIR; // per kg of core air
  const T5 = T4 - work / CP_GAS;
  const vb = Math.sqrt(2 * CP_AIR * T13 * (1 - fpr ** -K) * 0.92) + v0 * 0.9;
  const vc = 300 + 250 * throttle + v0 * 0.6;
  const thrust = bypass * (vb - v0) + (core + fuel) * vc - core * v0;
  return { n1, n2: 60 + 40 * n ** 0.6, flow, core, bypass, opr, fpr, T2, T3, T13, T4, T5, fuel, thrust, tsfc: (fuel / thrust) * 1e6, vb, vc };
}
