// Shared drawing helpers for the newer systems. The same source runs in Node (to build the
// static figure) and in the page (for parts that move), so both draw identically.
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import * as TB from "../vendor/anatomy/kit/tube.mjs";
import { kitScript, latheScript, tubeScript } from "./inline.mjs";

// Everything here expects `P` (the projection) and the kit globals to be in scope.
export const HELPERS_SRC = String.raw`
const TAU = Math.PI * 2;
const MAT = (n, s, extra) => '<g data-mat="' + n + '"' + (extra || "") + ">" + s + "</g>";
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Ln = (d, st) => lineSvg(d, st || { tone: "mid" });
const at = (p) => iso(p, P);
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const Yf = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const slab = (x, y, w, d, z, h, r = 2, bevel = 0.5) => S(slabOf({ x, y, w, d, r }, z, h, P, r > 4 ? 8 : 3, bevel));
const cyl = (x, y, r, z, h, steps = 24, st) => S(cylinder(x, y, r, z, h, P, steps), st);
const named = (name, svg, part) => '<g data-name="' + name + '"' + (part ? ' data-part="' + part + '"' : "") + ">" + svg + "</g>";
const attr = (cls, style) => ' class="' + cls + '"' + (style ? ' style="' + style + '"' : "");
const poly = (pts, cls, style) => "<path" + attr(cls, style) + ' d="' + pathOf(pts.map(at), true) + '"/>';
const line3 = (pts, cls, style) => "<path" + attr(cls, style) + ' d="' + pathOf(pts.map(at)) + '"/>';
const dot = (p, r, cls, style) => { const c = at(p); return "<circle" + attr(cls, style) + ' cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" r="' + r + '"/>'; };
const ellipse3 = (p, rx, ry, cls, style) => { const c = at(p); return "<ellipse" + attr(cls, style) + ' cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" rx="' + rx + '" ry="' + ry + '"/>'; };
// A circle lying in a frame's (u,v) plane at axial position s.
const circle3 = (F, s, r, n = 32) => Array.from({ length: n }, (_, i) => { const t = (i / n) * TAU; return G.pointOf(F, s, r, t); });
// Toothed outline for a gear (in the frame's u,v plane).
function gearPoly(teeth, r, depth, phase = 0) {
  const pts = [], n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const t = phase + (i / n) * TAU, tip = Math.floor(i / 2) % 2 === 0;
    pts.push([(tip ? r : r - depth) * Math.cos(t), (tip ? r : r - depth) * Math.sin(t)]);
  }
  return pts;
}
const gear = (F, teeth, r, depth, s0, s1, phase, st) => S(G.prismOf(F, gearPoly(teeth, r, depth, phase), s0, s1, P), st);
// Annulus sector (r0..r1, angle a0..a1) as a 2D outline, for cut-away shells.
function sector(r0, r1, a0, a1, n = 24) {
  const out = [], inn = [];
  for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; out.push([r1 * Math.cos(t), r1 * Math.sin(t)]); inn.push([r0 * Math.cos(t), r0 * Math.sin(t)]); }
  return out.concat(inn.reverse());
}
const shell = (F, r0, r1, a0, a1, s0, s1, st) => S(G.prismOf(F, sector(r0, r1, a0, a1), s0, s1, P), st);
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(4, r * 3), 8, { P, tube: r });
  return TB.tubePieces(route, r, P, { maxLength: 400, ...opts }).map((p) => TB.tubeSvg(p, { tone: "hi" })).join("");
}
const halo = (x, y, w, d, z = 0, h = 4) => '<path class="iso-halo" d="' + haloOf({ x, y, w, d, r: 4 }, z, h, P) + '" style="filter:blur(6px)"/>';
// Linear interpolation along a polyline by fraction f (0..1).
function along(pts, f) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); seg.push(l); total += l; }
  let d = (((f % 1) + 1) % 1) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const u = seg[i] ? Math.min(1, d / seg[i]) : 0; const a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
    d -= seg[i];
  }
  return pts[pts.length - 1];
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
// Colour ramp: t in 0..1 across [[t, r, g, b], ...]
function ramp(stops, t) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const a = stops[i - 1], b = stops[i], u = (t - a[0]) / (b[0] - a[0] || 1); return "rgb(" + Math.round(mix(a[1], b[1], u)) + "," + Math.round(mix(a[2], b[2], u)) + "," + Math.round(mix(a[3], b[3], u)) + ")"; }
  const l = stops[stops.length - 1]; return "rgb(" + l[1] + "," + l[2] + "," + l[3] + ")";
}
const HEAT = [[0, 70, 130, 230], [0.35, 90, 200, 220], [0.55, 250, 210, 80], [0.75, 250, 120, 40], [1, 220, 40, 30]];
`;

const NAMES = ["TAU", "MAT", "S", "Ln", "at", "f1", "Xf", "Yf", "Zf", "slab", "cyl", "named", "attr", "poly", "line3", "dot", "ellipse3", "circle3", "gearPoly", "gear", "sector", "shell", "tube", "halo", "along", "clamp", "mix", "ramp", "HEAT"];

/** Node-side helpers bound to a projection. */
export function helpers(P) {
  const kitNames = Object.keys(k);
  const make = new Function("P", "G", "TB", ...kitNames, `${HELPERS_SRC}\nreturn { ${NAMES.join(", ")} };`);
  return make(P, G, TB, ...kitNames.map((n) => k[n]));
}

/** Page-side script: kit globals, G, TB, constants, helpers, then the system's live code. */
export function pageScript(P, C, live) {
  return `${kitScript()}${latheScript()}${tubeScript()}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
${HELPERS_SRC}
// Pause the loop while the app is in the background.
const loop = (fn) => {
  let last = 0, frame = 0;
  const tick = (now) => { const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now; if (Lab.paused) { frame = 0; return; } fn(dt, now / 1000); frame = requestAnimationFrame(tick); };
  document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
  frame = requestAnimationFrame(tick);
};
const part = (n) => document.querySelector('.iso-stage [data-part="' + n + '"]');
const setHtml = (el, html) => { if (el && el.__h !== html) { el.innerHTML = html; el.__h = html; } };
const readout = (text) => { const r = document.querySelector("[data-readout]"); if (r && r.textContent !== text) r.textContent = text; };
${live}`;
}

export { k, G };
