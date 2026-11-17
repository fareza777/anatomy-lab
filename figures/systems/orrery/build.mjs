// A brass orrery on a walnut base: a lamp Sun on a column, an arm carrying the Earth with its
// fixed 23.44° tilt, and the Moon on a smaller arm. A month ring and gear train on the base.
// The Earth's lit hemisphere always faces the Sun; a red pin marks the chosen latitude.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 450;

const BASE_R = 210, BASE_H = 18;
const ORBIT = 150, ARM_Z = 104, EARTH_Z = 142, EARTH_R = 25, MOON_R = 7.5, MOON_D = 50;
const SUN_Z = 168, SUN_R = 34;

const P = k.fitProjection([[-BASE_R, -BASE_R, -BASE_H], [BASE_R, BASE_R, -BASE_H], [BASE_R, -BASE_R, -BASE_H], [-BASE_R, BASE_R, -BASE_H], [0, 0, SUN_Z + SUN_R + 20], [-ORBIT - 30, 0, EARTH_Z + 40], [ORBIT + 30, 0, EARTH_Z + 40]], WIDTH, HEIGHT, { pad: 14, azimuth: 45, elevation: 30 });
const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const named = (n, s, extra = "") => `<g data-name="${n}"${extra}>${s}</g>`;
const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function figure(theme) {
  // static: base, month ring, gear train, column and the orbit rail
  const F0 = Zf([0, 0, 0]);
  let base = `<path class="iso-halo" d="${k.haloOf({ x: -BASE_R, y: -BASE_R, w: 2 * BASE_R, d: 2 * BASE_R, r: BASE_R }, -BASE_H, BASE_H, P)}"/>`;
  base += named("Walnut base", mat("walnut", S(G.solidOf([[-BASE_H, BASE_R - 4], [-BASE_H + 4, BASE_R], [-2, BASE_R], [0, BASE_R - 2]], F0, P)) + Ln(k.ring(0, 0, BASE_R - 12, 0, P, 120), { tone: "lo" })));
  // brass month ring with day ticks and month names, placed by each month's orbital angle (set in the page)
  base += named("Calendar ring", mat("brass", S(G.ringBand(-1, 1.6, BASE_R - 46, BASE_R - 14, F0, P), { tone: "hi", crease: "none" })) + `<g data-part="ring"></g>`);
  // gear train under the Sun: drive pinion and the year wheel (drawn live)
  base += `<g data-part="gears" data-name="Gear train"></g>`;
  base += named("Hand crank", mat("brass", S(G.disc(0, 4, 10, Zf([BASE_R - 34, 30, 0]), P)) + S(G.disc(4, 24, 2.4, Zf([BASE_R - 28, 36, 0]), P))) + mat("walnut", S(G.disc(24, 34, 4.2, Zf([BASE_R - 28, 36, 0]), P))));
  const column = named("Sun column", mat("brass", S(G.solidOf([[0, 16], [6, 16], [10, 8, 1], [SUN_Z - SUN_R - 6, 6], [SUN_Z - SUN_R, 12]], F0, P))));

  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "or-svg",
    label: "A brass orrery on a round walnut base. A glowing Sun sits on a central column; an arm carries a tilted Earth around it, and a small arm carries the Moon around the Earth. A calendar ring on the base marks the months.",
    body: [
      base,
      `<g data-part="far"></g>`,
      column,
      `<circle class="or-glow" cx="${k.iso([0, 0, SUN_Z], P)[0]}" cy="${k.iso([0, 0, SUN_Z], P)[1]}" r="${SUN_R * 2.6}"/>`,
      named("Sun", `<circle class="or-sun" cx="${k.iso([0, 0, SUN_Z], P)[0]}" cy="${k.iso([0, 0, SUN_Z], P)[1]}" r="${SUN_R * 1.02}"/>`),
      `<g data-part="near"></g>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 6", title: "Orrery", hint: "Drag to turn the year", readout: "21 Jun", body: `<div class="iso-stage or-stage" tabindex="0" role="slider" aria-label="Day of the year" aria-valuemin="1" aria-valuemax="365" aria-valuenow="172">${svg}</div>` });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="or-sun"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffd35a"/><stop offset=".85" stop-color="#ff9a1f"/><stop offset="1" stop-color="#e2620c"/></radialGradient>
<radialGradient id="or-glow"><stop offset="0" stop-color="#ffcf4a" stop-opacity=".55"/><stop offset=".45" stop-color="#ffb02e" stop-opacity=".18"/><stop offset="1" stop-color="#ff9a1f" stop-opacity="0"/></radialGradient>
<radialGradient id="or-earth" cx=".5" cy=".5" r=".75" fx=".3" fy=".3"><stop offset="0" stop-color="#7fd0ff"/><stop offset=".35" stop-color="#2f86d6"/><stop offset=".62" stop-color="#1b4f8f"/><stop offset=".78" stop-color="#0b1a33"/><stop offset="1" stop-color="#060c18"/></radialGradient>
<radialGradient id="or-moon" cx=".5" cy=".5" r=".75" fx=".3" fy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfd2d8"/><stop offset=".7" stop-color="#4a4e58"/><stop offset="1" stop-color="#16181d"/></radialGradient>
</defs></svg>`;
  const css = `
.or-sun{fill:url(#or-sun);filter:drop-shadow(0 0 6px #ffb02e)}
.or-glow{fill:url(#or-glow);pointer-events:none}
.or-earth{fill:url(#or-earth);stroke:#0b1a33;stroke-width:.4}
.or-moon{fill:url(#or-moon)}
.or-axis{stroke:#e8eef8;stroke-width:1.1;stroke-linecap:round}
body[data-theme="light"] .or-axis{stroke:#1b2433}
.or-eq{fill:none;stroke:#9be2ff;stroke-width:.6;stroke-dasharray:2 2;opacity:.8}
.or-lat{fill:#ff3b5c;stroke:#fff;stroke-width:.5}
.or-orbit{fill:none;stroke:var(--anatomy-mid);stroke-width:.6;stroke-dasharray:1 4;opacity:.8}
.or-tick{stroke:var(--anatomy-hi);stroke-width:.5}
${materialsCss(["walnut", "brass", "darksteel", "steel", "gold"])}
`;

  const live = `
${modelSource}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ ORBIT, ARM_Z, EARTH_Z, EARTH_R, MOON_R, MOON_D, SUN_Z, BASE_R, MONTH_START, MONTHS })};
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const stage = document.querySelector(".or-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { far: q("far"), near: q("near"), ring: q("ring"), gears: q("gears") };
const readout = document.querySelector("[data-readout]");

const A172 = orbit(172).angle;
const TILT = [-Math.cos(A172) * Math.sin(TILT_DEG * RAD), -Math.sin(A172) * Math.sin(TILT_DEG * RAD), Math.cos(TILT_DEG * RAD)];
let day = 172, target = 172, playing = true, last = 0, frame = 0;
// calendar ring: day ticks every 5 days, month names at each month's orbital angle
(function ring() {
  let s = "";
  for (let d = 1; d <= 365; d += 5) { const a = orbit(d).angle, r0 = C.BASE_R - 18, r1 = C.BASE_R - (d % 30 < 5 ? 26 : 22); s += pathOf([iso([r0 * Math.cos(a), r0 * Math.sin(a), 1.7], P), iso([r1 * Math.cos(a), r1 * Math.sin(a), 1.7], P)]); }
  let t = '<path class="or-tick" d="' + s + '"/>';
  C.MONTH_START.forEach((d, i) => { const a = orbit(d + 14).angle, r = C.BASE_R - 36; t += faceTextSvg(topMatrix([r * Math.cos(a), r * Math.sin(a)], 1.7, P, "x"), C.MONTHS[i], { size: 8, tone: "hi", anchor: "middle" }); });
  el.ring.innerHTML = MAT("brass", t);
})();
function gearsSvg(a) {
  const tooth = (cx, cy, r, n, ph) => Array.from({ length: n * 2 }, (_, i) => { const t = ph + i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : r + 2.4; return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)]; });
  let s = S(extrude(tooth(0, 0, 40, 40, a), 0, 4, P), { tone: "hi", crease: "none" }) + lineSvg(ring(0, 0, 26, 4, P, 60), { tone: "mid" });
  s += S(extrude(tooth(56, 24, 14, 14, -a * 40 / 14), 0, 6, P), { tone: "hi", crease: "none" });
  return MAT("brass", s);
}
function earthAt(d) { const o = orbit(d); const R = C.ORBIT * o.r; return [R * Math.cos(o.angle), R * Math.sin(o.angle), C.EARTH_Z]; }
function draw() {
  const e = earthAt(day);
  const o = orbit(day);
  const mn = moon(day);
  // moon position: its phase angle measured from the Sun–Earth line
  const sunDir = [-e[0], -e[1]]; const sl = Math.hypot(sunDir[0], sunDir[1]); sunDir[0] /= sl; sunDir[1] /= sl;
  const ma = Math.atan2(sunDir[1], sunDir[0]) + Math.PI + mn.phase * Math.PI * 2;
  const m = [e[0] + C.MOON_D * Math.cos(ma), e[1] + C.MOON_D * Math.sin(ma), C.EARTH_Z + 2 * Math.sin(ma * 1.0)];
  // arm from the column to the Earth's post
  const armDir = [e[0] / Math.hypot(e[0], e[1]), e[1] / Math.hypot(e[0], e[1]), 0];
  const RR = C.BASE_R - 22; // the calendar ring radius the pointer touches
  let arm = S(G.disc(0, RR, 3.2, G.frameAlong([0, 0, C.ARM_Z], armDir), P));
  // date pointer: a drop rod from the arm's end down onto the calendar ring
  arm += S(G.disc(4, C.ARM_Z, 1.4, Zf([armDir[0] * RR, armDir[1] * RR, 0]), P)) + S(G.solidOf([[0, 0.1], [4, 3.2], [6, 0.1]], Zf([armDir[0] * RR, armDir[1] * RR, 1.8]), P));
  arm += S(G.disc(C.ARM_Z, C.EARTH_Z - C.EARTH_R - 2, 2.2, Zf([e[0], e[1], 0]), P)) + S(G.disc(C.ARM_Z - 4, C.ARM_Z + 4, 6, Zf([e[0], e[1], 0]), P));
  const moonArm = S(G.disc(0, C.MOON_D, 1.1, G.frameAlong([e[0], e[1], C.EARTH_Z - C.EARTH_R - 2], [Math.cos(ma), Math.sin(ma), 0]), P)) + S(G.disc(C.EARTH_Z - C.EARTH_R - 2, m[2] - C.MOON_R, 0.9, Zf([m[0], m[1], 0]), P));
  // Earth disc with a gradient lit toward the Sun on screen
  const ec = iso(e, P), sc = iso([0, 0, C.SUN_Z], P);
  const dx = sc[0] - ec[0], dy = sc[1] - ec[1], dl = Math.hypot(dx, dy);
  const grad = document.getElementById("or-earth");
  grad.setAttribute("fx", String(0.5 + 0.32 * dx / dl)); grad.setAttribute("fy", String(0.5 + 0.32 * dy / dl));
  const mc = iso(m, P), mdx = sc[0] - mc[0], mdy = sc[1] - mc[1], mdl = Math.hypot(mdx, mdy);
  const mg = document.getElementById("or-moon");
  mg.setAttribute("fx", String(0.5 + 0.34 * mdx / mdl)); mg.setAttribute("fy", String(0.5 + 0.34 * mdy / mdl));
  const pr = C.EARTH_R * P.scale * 1.27;
  let earth = '<g data-name="Earth"><circle class="or-earth" cx="' + ec[0] + '" cy="' + ec[1] + '" r="' + pr + '"/>';
  const ax0 = iso([e[0] - TILT[0] * 38, e[1] - TILT[1] * 38, e[2] - TILT[2] * 38], P), ax1 = iso([e[0] + TILT[0] * 38, e[1] + TILT[1] * 38, e[2] + TILT[2] * 38], P);
  earth += '<path class="or-axis" d="' + pathOf([ax0, ax1]) + '"/>';
  earth += '<path class="or-eq" d="' + G.circleOf(G.frameAlong(e, TILT), 0, C.EARTH_R * 1.01, P) + '"/>';
  // latitude pin on the meridian that faces the Sun (local noon)
  const s3 = [-e[0], -e[1], C.SUN_Z - e[2]]; const sd = Math.hypot(...s3); const sh = s3.map((v) => v / sd);
  const dotSN = sh[0] * TILT[0] + sh[1] * TILT[1] + sh[2] * TILT[2];
  const mer = [sh[0] - dotSN * TILT[0], sh[1] - dotSN * TILT[1], sh[2] - dotSN * TILT[2]]; const ml = Math.hypot(...mer); const mh = mer.map((v) => v / ml);
  const L = Lab.value("lat") * RAD;
  const pin = [0, 1, 2].map((i) => e[i] + C.EARTH_R * (Math.cos(L) * mh[i] + Math.sin(L) * TILT[i]));
  const pc = iso(pin, P);
  earth += '<circle class="or-lat" data-name="Your latitude" cx="' + pc[0] + '" cy="' + pc[1] + '" r="3"/></g>';
  const moonSvg = '<circle class="or-moon" data-name="Moon" cx="' + mc[0] + '" cy="' + mc[1] + '" r="' + (C.MOON_R * P.scale * 1.27) + '"/>';
  // split far / near of the Sun column by depth
  const depth = (p) => depthOf(p, P);
  const parts = MAT("brass", arm + moonArm) + earth + moonSvg;
  const near = depth(e) > depth([0, 0, 0]);
  el.far.innerHTML = near ? "" : parts;
  el.near.innerHTML = near ? parts : "";
  el.gears.innerHTML = gearsSvg(-o.angle);
  // numbers
  const dec = declination(day), dl1 = daylight(day, Lab.value("lat"));
  const date = dateOf(day);
  if (readout.textContent !== date) readout.textContent = date;
  stage.setAttribute("aria-valuenow", String(Math.round(day)));
  Lab.gauge("date", date);
  Lab.gauge("season", season(day, Lab.value("lat") >= 0), true);
  Lab.gauge("daylight", Math.floor(dl1) + " h " + Math.round((dl1 % 1) * 60) + " m");
  Lab.gauge("dec", (dec >= 0 ? "+" : "") + dec.toFixed(1) + "°");
  Lab.gauge("dist", o.r.toFixed(4) + " AU");
  Lab.gauge("moon", mn.name + " · " + Math.round(mn.lit * 100) + "%");
  Lab.gauge("noon", (90 - Math.abs(Lab.value("lat") - dec)).toFixed(0) + "°");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  if (playing && !Lab.reduced.matches) target += dt * 12;
  if (target > 365.999) { target -= 365; day -= 365; }
  if (target < 1) { target += 365; day += 365; }
  day += (target - day) * (1 - Math.exp(-dt / 0.15));
  draw();
  frame = requestAnimationFrame(tick);
}
let drag = null;
stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, d: target }; });
stage.addEventListener("pointermove", (e) => { if (!drag) return; if (Math.abs(e.clientX - drag.x) < 6 && playing) return; playing = false; syncPlay(); const w = stage.getBoundingClientRect().width; target = drag.d + ((e.clientX - drag.x) / w) * 200; try { stage.setPointerCapture(e.pointerId); } catch (_) {} });
stage.addEventListener("pointerup", () => { drag = null; }); stage.addEventListener("pointercancel", () => { drag = null; });
function syncPlay() { const b = document.querySelector('[data-action="play"]'); if (b) b.textContent = playing ? "Pause" : "Play"; }
Lab.onAction((id) => { if (id === "play") { playing = !playing; syncPlay(); } });
Lab.onChange(() => {});
Lab.onStep((i, s, user) => { if (user && s.day !== undefined) { playing = false; syncPlay(); target = s.day; if (s.lat !== undefined) Lab.set("lat", s.lat); } });
document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
syncPlay();
frame = requestAnimationFrame(tick);
`;
  return { plate: defs + plate, css, script: kitScript() + latheScript() + live };
}
