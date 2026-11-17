// Colour materials for Anatomy figures.
// The kit shades every solid with four side tones, a top and outline tones, all read from CSS
// custom properties. A material simply redefines those properties on a <g data-mat="…">, so
// every solid, tube and line inside it takes the material's colour while keeping the kit's
// lighting. Each material is generated for both themes from one albedo and a few traits.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255); }
function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToHex([h, s, l]) {
  const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, "0")).join("");
}
// Shift lightness by dl and saturation by ds, with a hue drift toward warm (light) or cool (shade).
const tone = (hex, dl, ds = 0, dh = 0) => { const [h, s, l] = rgbToHsl(hexToRgb(hex)); return hslToHex([(h + dh + 1) % 1, clamp(s + ds), clamp(l + dl)]); };

/**
 * name: [albedo, { metal, gloss, ink }]
 *  metal: 0..1 wider tone spread and cooler shadows (polished metal reads by contrast)
 *  gloss: 0..1 brighter top highlight
 *  ink:   outline darkness in the light theme
 */
export const MATERIALS = {
  // metals
  steel: ["#9aa6b4", { metal: 0.9, gloss: 0.7 }],
  chrome: ["#c4ccd6", { metal: 1, gloss: 1 }],
  darksteel: ["#5b6675", { metal: 0.8, gloss: 0.5 }],
  alu: ["#c9cfd6", { metal: 0.6, gloss: 0.5 }],
  castalu: ["#b9bcc0", { metal: 0.35, gloss: 0.25 }],
  iron: ["#4a4f57", { metal: 0.5, gloss: 0.2 }],
  brass: ["#d4a640", { metal: 0.85, gloss: 0.8 }],
  gold: ["#e9b949", { metal: 0.9, gloss: 0.9 }],
  copper: ["#cf7a46", { metal: 0.85, gloss: 0.8 }],
  bronze: ["#a4703f", { metal: 0.7, gloss: 0.5 }],
  heatblue: ["#6b6fa8", { metal: 0.8, gloss: 0.6 }],
  // paints and plastics
  slate: ["#3d4a5c", { metal: 0.2, gloss: 0.3 }],
  navy: ["#25395a", { metal: 0.2, gloss: 0.3 }],
  red: ["#d8402c", { metal: 0.15, gloss: 0.5 }],
  orange: ["#f07a2a", { metal: 0.1, gloss: 0.5 }],
  yellow: ["#f2c230", { metal: 0.1, gloss: 0.5 }],
  green: ["#3aa36b", { metal: 0.1, gloss: 0.4 }],
  teal: ["#1f9aa6", { metal: 0.1, gloss: 0.45 }],
  blue: ["#2f6fd6", { metal: 0.15, gloss: 0.5 }],
  violet: ["#7a52c7", { metal: 0.1, gloss: 0.45 }],
  pink: ["#e0679a", { metal: 0.05, gloss: 0.4 }],
  cream: ["#efe6d2", { metal: 0, gloss: 0.3 }],
  white: ["#f3f4f6", { metal: 0.05, gloss: 0.4 }],
  ceramic: ["#f1efe8", { metal: 0, gloss: 0.9 }],
  rubber: ["#2b2d31", { metal: 0, gloss: 0.15 }],
  carbon: ["#22252b", { metal: 0.3, gloss: 0.5 }],
  wood: ["#a8743f", { metal: 0, gloss: 0.2 }],
  walnut: ["#6e4a2e", { metal: 0, gloss: 0.25 }],
  glass: ["#bfe3ef", { metal: 0.2, gloss: 1 }],
  pcb: ["#1f7a4a", { metal: 0.1, gloss: 0.4 }],
  // food and factory
  choc: ["#5b3423", { metal: 0.1, gloss: 0.85 }],
  milkchoc: ["#8c5a3a", { metal: 0.1, gloss: 0.8 }],
  whitechoc: ["#eadcbc", { metal: 0.05, gloss: 0.7 }],
  cocoa: ["#7a4a2e", { metal: 0, gloss: 0.3 }],
  stainless: ["#c3cad2", { metal: 0.8, gloss: 0.75 }],
  granite: ["#8f8b86", { metal: 0.1, gloss: 0.3 }],
  floor: ["#cfd3d9", { metal: 0.05, gloss: 0.15 }],
  mint: ["#7fd1b9", { metal: 0.05, gloss: 0.5 }],
  // biology
  muscle: ["#c2423f", { metal: 0, gloss: 0.55 }],
  flesh: ["#e08a7c", { metal: 0, gloss: 0.5 }],
  artery: ["#d93a3a", { metal: 0, gloss: 0.6 }],
  vein: ["#4562c4", { metal: 0, gloss: 0.6 }],
  fat: ["#f0cf7a", { metal: 0, gloss: 0.5 }],
  bone: ["#eee3c8", { metal: 0, gloss: 0.3 }],
  cartilage: ["#cfe3e8", { metal: 0, gloss: 0.6 }],
  nerve: ["#f2d65a", { metal: 0, gloss: 0.5 }],
  lung: ["#eda3a8", { metal: 0, gloss: 0.4 }],
  leaf: ["#4fa14a", { metal: 0, gloss: 0.4 }],
  bark: ["#7b5a3c", { metal: 0, gloss: 0.15 }],
  soil: ["#8a6a48", { metal: 0, gloss: 0.1 }],
  water: ["#3d9be0", { metal: 0.2, gloss: 0.9 }],
  ice: ["#d9f0fb", { metal: 0.2, gloss: 1 }],
  sand: ["#e3c890", { metal: 0, gloss: 0.15 }],
  rock: ["#8c8577", { metal: 0.1, gloss: 0.15 }],
};

function varsFor([albedo, { metal = 0.3, gloss = 0.4 }], theme) {
  const spread = 0.06 + 0.07 * metal;
  if (theme === "light") {
    const base = albedo;
    return {
      "--anatomy-paper": base,
      "--anatomy-face": tone(base, 0.06),
      "--anatomy-top": tone(base, 0.1 + 0.12 * gloss, -0.04, 0.005),
      "--anatomy-lit-top": tone(base, 0.16 + 0.14 * gloss, -0.03, 0.005),
      "--anatomy-lit-shade": tone(base, 0.04),
      "--anatomy-shade-3": tone(base, 0.02),
      "--anatomy-shade-2": tone(base, -spread * 0.9, 0.02, -0.005),
      "--anatomy-shade-1": tone(base, -spread * 1.9, 0.04, -0.01),
      "--anatomy-shade-0": tone(base, -spread * 3.0, 0.06, -0.015),
      "--anatomy-hi": tone(base, -0.42, 0.05),
      "--anatomy-mid": tone(base, -0.28, 0.03),
      "--anatomy-lo": tone(base, -0.17, 0.02),
      "--anatomy-faint": tone(base, -0.09, 0.01),
      "--anatomy-lit": tone(base, -0.5, 0.05),
      "--anatomy-dot": tone(base, -0.45, 0.05),
    };
  }
  const base = tone(albedo, -0.1, -0.06);
  return {
    "--anatomy-paper": tone(base, -0.12),
    "--anatomy-face": tone(base, -0.06),
    "--anatomy-top": tone(base, 0.02 + 0.1 * gloss, -0.03, 0.005),
    "--anatomy-lit-top": tone(base, 0.08 + 0.12 * gloss, -0.03),
    "--anatomy-lit-shade": tone(base, -0.04),
    "--anatomy-shade-3": tone(base, -0.04),
    "--anatomy-shade-2": tone(base, -0.04 - spread * 1.2, 0, -0.008),
    "--anatomy-shade-1": tone(base, -0.04 - spread * 2.2, 0.02, -0.014),
    "--anatomy-shade-0": tone(base, -0.04 - spread * 3.2, 0.03, -0.02),
    "--anatomy-hi": tone(base, 0.3, -0.05),
    "--anatomy-mid": tone(base, 0.12),
    "--anatomy-lo": tone(base, -0.12),
    "--anatomy-faint": tone(base, -0.2),
    "--anatomy-lit": tone(base, 0.42, -0.1),
    "--anatomy-dot": tone(base, 0.4, -0.1),
  };
}

const block = (sel, vars) => `${sel}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;

/** CSS for the given material names (all when omitted). */
export function materialsCss(names = Object.keys(MATERIALS)) {
  const out = [];
  for (const name of names) {
    const m = MATERIALS[name];
    if (!m) throw new Error(`unknown material ${name}`);
    out.push(block(`body[data-theme="light"] [data-mat="${name}"]`, varsFor(m, "light")));
    out.push(block(`body[data-theme="dark"] [data-mat="${name}"]`, varsFor(m, "dark")));
  }
  // tubes read the same tokens; make their bodies follow the material too
  out.push(`[data-mat] .tb-body{fill:var(--anatomy-shade-2)}[data-mat] .tb-shine{fill:var(--anatomy-top)}[data-mat] .tb-shade{fill:var(--anatomy-shade-0)}`);
  out.push(`[data-mat] .iso-dots circle{opacity:.7}`);
  return out.join("\n");
}

/** A colour for direct use (gradients, canvases), e.g. paint("brass", "light", -0.1). */
export const paint = (name, theme = "light", dl = 0) => tone(theme === "light" ? MATERIALS[name][0] : tone(MATERIALS[name][0], -0.1, -0.06), dl);

/** Wrap SVG markup in a material. */
export const mat = (name, svg, extra = "") => `<g data-mat="${name}"${extra}>${svg}</g>`;
