// The cardiac cycle (Wiggers diagram), normalised to one beat: phase p in [0, 1).
// Timing scales with heart rate: systole shortens less than diastole as the rate rises.

/** Fractions of the beat at a heart rate (bpm). */
export function timing(bpm) {
  const T = 60 / bpm; // s
  const sys = 0.16 + 0.17 * T; // ventricular systole (s), Bazett-like shortening with rate
  const s = Math.min(0.55, sys / T); // fraction of the beat in ventricular systole
  const a = Math.min(0.16, 0.1 / T); // atrial systole fraction
  return { T, atrialStart: 0, atrialEnd: a, ivc: a + 0.05 / T, ejectEnd: a + s, ivr: Math.min(0.95, a + s + 0.07 / T), sys };
}

/** The named phase at p. */
export function phaseOf(p, bpm) {
  const t = timing(bpm);
  if (p < t.atrialEnd) return "Atrial systole";
  if (p < t.ivc) return "Isovolumic contraction";
  if (p < t.ejectEnd) return "Ventricular ejection";
  if (p < t.ivr) return "Isovolumic relaxation";
  return "Ventricular filling";
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Valve openness 0..1 for the AV (tricuspid/mitral) and semilunar (pulmonary/aortic) valves. */
export function valves(p, bpm) {
  const t = timing(bpm);
  const av = p < t.atrialEnd ? 1 : p < t.atrialEnd + 0.02 ? 1 - smooth(t.atrialEnd, t.atrialEnd + 0.02, p) : p < t.ivr ? 0 : smooth(t.ivr, t.ivr + 0.03, p);
  const sl = p < t.ivc ? 0 : p < t.ejectEnd ? Math.min(smooth(t.ivc, t.ivc + 0.02, p), 1 - smooth(t.ejectEnd - 0.02, t.ejectEnd, p)) : 0;
  return { av, sl };
}

/** Ventricular contraction 0 (relaxed, full) .. 1 (fully contracted) and atrial contraction. */
export function contraction(p, bpm) {
  const t = timing(bpm);
  let v;
  if (p < t.ivc) v = 0;
  else if (p < t.ejectEnd) v = Math.sin(((p - t.ivc) / (t.ejectEnd - t.ivc)) * Math.PI * 0.5);
  else if (p < t.ivr) v = 1 - 0.15 * smooth(t.ejectEnd, t.ivr, p);
  else v = 0.85 * (1 - smooth(t.ivr, t.ivr + 0.22, p));
  const a = p < t.atrialEnd ? Math.sin((p / t.atrialEnd) * Math.PI) : 0;
  return { ventricle: v, atrium: a };
}

/** Left-ventricular volume (ml): EDV ~120 ml, ESV ~50 ml at rest; rapid filling, diastasis, atrial kick. */
export function lvVolume(p, bpm) {
  const t = timing(bpm);
  const edv = 120 - Math.max(0, bpm - 70) * 0.22;
  const esv = 50 - Math.max(0, bpm - 70) * 0.2;
  const kick = 18;
  if (p < t.atrialEnd) return edv - kick + kick * smooth(0, t.atrialEnd, p);
  if (p < t.ivc) return edv;
  if (p < t.ejectEnd) return edv - (edv - esv) * Math.sin(((p - t.ivc) / (t.ejectEnd - t.ivc)) * Math.PI * 0.5);
  if (p < t.ivr) return esv;
  const f = (p - t.ivr) / (1 - t.ivr);
  return esv + (edv - kick - esv) * (1 - Math.exp(-f * 4.5)) / (1 - Math.exp(-4.5));
}

/** Pressures (mmHg): left ventricle, aorta, left atrium, right ventricle, pulmonary artery. */
export function pressures(p, bpm) {
  const t = timing(bpm);
  const sysP = 118 + Math.max(0, bpm - 70) * 0.35, diaP = 78 + Math.max(0, bpm - 70) * 0.1;
  const c = contraction(p, bpm);
  let lv;
  if (p < t.ivc) lv = 6 + 6 * c.atrium;
  else if (p < t.ejectEnd) lv = 8 + (sysP - 8) * Math.sin(((p - t.ivc) / (t.ejectEnd - t.ivc)) * Math.PI) ** 0.7;
  else if (p < t.ivr) lv = 80 * (1 - smooth(t.ejectEnd, t.ivr, p)) + 5;
  else lv = 5;
  // aorta: continuous through the beat. During ejection it follows the ventricle up to the
  // systolic peak and sags to ~90 % of it; after valve closure a small dicrotic notch, then a
  // Windkessel (exponential) decay that lands exactly on the diastolic pressure at the next ejection.
  const ej = t.ejectEnd - t.ivc;
  const aoEnd = 0.9 * sysP;
  let ao;
  if (p >= t.ivc && p < t.ejectEnd) {
    const f = (p - t.ivc) / ej;
    const e = (aoEnd - diaP) / (sysP - diaP);
    const g = f < 0.4 ? Math.sin((Math.PI / 2) * (f / 0.4)) : 1 - (1 - e) * ((f - 0.4) / 0.6) ** 1.5;
    ao = diaP + (sysP - diaP) * g;
  } else {
    const since = p >= t.ejectEnd ? p - t.ejectEnd : p + 1 - t.ejectEnd;
    const span = 1 - ej, tau = 0.32;
    const decay = (Math.exp(-since / tau) - Math.exp(-span / tau)) / (1 - Math.exp(-span / tau));
    ao = diaP + (aoEnd - diaP) * decay - 5 * Math.exp(-(((since - 0.015) / 0.01) ** 2)) + 3 * Math.exp(-(((since - 0.04) / 0.02) ** 2));
  }
  const la = 8 + 4 * c.atrium + 3 * smooth(t.ivc, t.ejectEnd, p) * (p < t.ivr ? 1 : 0);
  const rv = lv * 0.21 + 1, pa = Math.max(10, ao * 0.22 - 7);
  return { lv, ao, la, rv, pa, sysP, diaP };
}

/** ECG voltage (mV) at p: P wave, QRS complex and T wave as Gaussians. */
export function ecg(p, bpm) {
  const t = timing(bpm);
  const g = (c, w, a) => a * Math.exp(-(((p - c) / w) ** 2));
  const q = t.atrialEnd + 0.01;
  return g(0.04, 0.025, 0.15) + g(q, 0.008, -0.12) + g(q + 0.018, 0.009, 1.1) + g(q + 0.036, 0.01, -0.25) + g(t.ejectEnd - 0.06, 0.04, 0.32);
}

export function strokeVolume(bpm) { const v = Array.from({ length: 200 }, (_, i) => lvVolume(i / 200, bpm)); return Math.max(...v) - Math.min(...v); }
export const cardiacOutput = (bpm) => (strokeVolume(bpm) * bpm) / 1000;
