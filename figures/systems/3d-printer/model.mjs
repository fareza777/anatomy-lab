// FDM 3D printer: material windows, flow and the part being printed.
// Units: mm, mm/s, degC, seconds.

export const MATERIALS_3D = {
  pla: { label: "PLA", lo: 190, hi: 220, bed: 60, color: "orange", density: 1.24, maxFlow: 15 },
  petg: { label: "PETG", lo: 225, hi: 250, bed: 80, color: "teal", density: 1.27, maxFlow: 12 },
  tpu: { label: "TPU", lo: 210, hi: 235, bed: 50, color: "violet", density: 1.21, maxFlow: 4 },
};

export const FILAMENT_D = 1.75; // mm
export const LINE_W = 0.45; // mm extrusion width (0.4 mm nozzle)
export const PART_H = 64; // mm, height of the vase

/** Radius of the vase at height h and angle t: a twisting, six-lobed vase. */
export function vaseR(h, t) {
  const base = 26 + 7 * Math.sin((h / PART_H) * Math.PI * 1.15) - 4 * (h / PART_H);
  return base * (1 + 0.09 * Math.cos(6 * t + h * 0.045));
}

/** Perimeter length of one layer at height h (mm), by sampling. */
export function perimeter(h) {
  let len = 0, prev = null;
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2, r = vaseR(h, t);
    const p = [r * Math.cos(t), r * Math.sin(t)];
    if (prev) len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

/** Volumetric flow (mm^3/s) for a speed and layer height. */
export const flow = (speed, layer) => speed * layer * LINE_W;

/** Two walls per layer: filament length (m) and mass (g) for the whole vase. */
export function usage(layer, mat) {
  let vol = 0;
  for (let h = 0; h < PART_H; h += layer) vol += perimeter(h) * 2 * layer * LINE_W;
  vol += Math.PI * 26 * 26 * 0.8; // solid base
  const area = Math.PI * (FILAMENT_D / 2) ** 2;
  return { meters: vol / area / 1000, grams: (vol / 1000) * MATERIALS_3D[mat].density, vol };
}

/** Print time (s) for the vase at a speed and layer height (walls only, plus travel overhead). */
export function printTime(speed, layer) {
  let t = 0;
  for (let h = 0; h < PART_H; h += layer) t += (perimeter(h) * 2) / speed + 1.2;
  return t;
}

/** Quality call-outs from the settings. */
export function verdict(mat, temp, speed, layer) {
  const m = MATERIALS_3D[mat];
  const f = flow(speed, layer);
  if (temp < m.lo - 5) return { ok: false, text: "Too cold: the plastic can't melt fast enough — under-extrusion and weak layers." };
  if (f > m.maxFlow) return { ok: false, text: `Flow ${f.toFixed(1)} mm³/s exceeds what the hotend can melt (${m.maxFlow}) — slow down or use thinner layers.` };
  if (temp > m.hi + 5) return { ok: false, text: "Too hot: oozing and stringing between moves, glossy blobs." };
  if (layer > 0.3) return { ok: false, text: "Layers thicker than 75% of the nozzle bond poorly." };
  return { ok: true, text: "Good settings: each layer fuses to the one below." };
}
