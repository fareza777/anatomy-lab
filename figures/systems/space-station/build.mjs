// Space station life support: a cutaway habitat can with two decks of closed-loop machinery.
// Solar wings track, radiator panels shed heat, fans turn, bubbles rise in the electrolyser and
// the cabin atmosphere drifts with crew load, power and the scrubber settings.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 720;
export const HEIGHT = 520;

const P = k.fitProjection([
  [-265, -155, 0], [265, 90, 0], [265, -145, 0], [-265, 80, 0], [-210, -105, 230], [110, 70, 100],
], WIDTH, HEIGHT, { pad: 14, azimuth: 58, elevation: 24 });

const H = helpers(P);
const { MAT, S: S0, Ln, at, slab, cyl, named, line3, dot, circle3, sector, shell, Zf, clamp, mix } = H;
const S = (p, st) => (typeof p === "string" ? p : S0(p, st));
const F = Zf([0, 0, 0]);

const R = 94, WALL = 6, Z0 = 8, Z1 = 196;
const DECK1 = 68, DECK2 = 130;

const half = (r0, r1, z, h, tone) => S(shell(F, r0, r1, Math.PI, Math.PI * 2, z, h), tone);
const HALO = (x, y, w, d, z = 0, h = 8) => `<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 20 }, z, h, P)}"/>`;

function person(x, y, z, phase = 0) {
  let s = "";
  s += MAT("white", slab(x - 4, y - 3, 8, 6, z + 12, 14, 1, 0.3));
  s += MAT("steel", slab(x + 2, y - 2, 4, 5, z + 16, 11, 0.5, 0.2));
  s += MAT("white", slab(x - 4, y - 1, 3, 3, z, 12, 1, 0.2) + slab(x + 1, y - 1, 3, 3, z, 12, 1, 0.2));
  s += MAT("blue", slab(x - 4, y - 3, 8, 3, z + 25, 3, 0.6, 0.2));
  s += dot([x, y - 1, z + 31], 4.3, "sl-helmet");
  s += dot([x + 1, y - 2, z + 31], 2.7, "sl-visor");
  s += line3([[x - 4, y, z + 23], [x - 7 - Math.sin(phase) * 2, y, z + 16]], "sl-arm");
  s += line3([[x + 4, y, z + 23], [x + 7 + Math.sin(phase) * 2, y, z + 16]], "sl-arm");
  return s;
}

function habitatShell() {
  let s = HALO(-110, -110, 220, 220, 0, 12);
  s += `<g class="sl-shell" data-name="Habitat shell">`;
  s += MAT("white", half(R - WALL, R, Z0, Z1 - Z0));
  s += MAT("slate", half(R - WALL - 2, R - WALL, Z0 + 1, Z1 - Z0 - 2));
  s += MAT("white", half(0, R, Z1, 6));
  s += MAT("steel", half(0, R, Z1 - 6, 3));
  s += MAT("white", half(R - WALL, R, Z0 - 4, 5));
  for (const z of [44, 104, 164]) s += MAT("steel", half(R - 1, R + 2, z, 2.5));
  for (const x of [-R + 1, R - 7]) s += MAT("steel", slab(x, -5, 6, 5, Z0, Z1 - Z0, 0.8, 0.2));
  for (const x of [-R + 2, R - 7]) for (const z of [DECK1 + 2, DECK2 + 2, 178]) s += MAT("orange", slab(x, -7, 5, 7, z, 5, 0.5, 0.2));
  s += `</g>`;
  // full lower floor and the two half decks, with a railing along the cut edge
  s += MAT("floor", S(k.cylinder(0, 0, R - WALL, Z0 - 4, 5, P, 64)));
  s += MAT("floor", half(0, R - WALL, DECK1 - 4, 5));
  s += MAT("floor", half(0, R - WALL, DECK2 - 4, 5));
  for (const z of [DECK1, DECK2]) {
    s += line3([[-84, 0, z], [84, 0, z]], "sl-rail");
    for (const x of [-72, -36, 0, 36, 72]) s += line3([[x, 0, z], [x, 0, z + 22]], "sl-rail");
  }
  s += MAT("darksteel", line3([[0, -82, 10], [0, -82, 194]], "sl-ladder") + line3([[6, -82, 10], [6, -82, 194]], "sl-ladder"));
  for (let z = 14; z < 194; z += 12) s += line3([[-1, -82, z], [7, -82, z]], "sl-rung");
  return s;
}

function solarWing(side) {
  const py = -22;
  let s = MAT("steel", line3([[side * 90, py, 150], [side * 130, py, 150]], "sl-boom") + line3([[side * 90, py, 140], [side * 130, py, 150]], "sl-boom"));
  for (let i = 0; i < 3; i++) {
    const x = side * (137 + i * 40);
    s += MAT("navy", slab(x - 18, py - 20, 36, 40, 151, 2, 1, 0.2));
    s += line3([[x - 17, py - 19, 153], [x + 17, py - 19, 153]], "sl-cell") + line3([[x - 17, py + 19, 153], [x + 17, py + 19, 153]], "sl-cell");
    for (let g = -12; g <= 12; g += 12) s += line3([[x + g, py - 19, 153], [x + g, py + 19, 153]], "sl-cell");
    s += MAT("steel", slab(x - 2, py - 22, 4, 44, 149, 2, 0.5, 0.2));
  }
  return `<g class="sl-wing" data-name="Solar array" data-side="${side}">${s}</g>`;
}

function radiator(side) {
  let s = MAT("steel", line3([[side * 90, -62, 158], [side * 126, -74, 164]], "sl-boom"));
  s += MAT("white", slab(side * 126 - 21, -96, 42, 6, 124, 78, 1, 0.2));
  s += MAT("steel", slab(side * 126 - 23, -98, 46, 4, 121, 4, 0.5, 0.2) + slab(side * 126 - 23, -98, 46, 4, 202, 4, 0.5, 0.2));
  s += MAT("orange", line3([[side * 126 - 18, -99, 198], [side * 126 + 18, -99, 198]], "sl-rad-line"));
  for (let z = 134; z < 200; z += 11) s += line3([[side * 126 - 18, -97, z], [side * 126 + 18, -97, z]], "sl-rad-line");
  return `<g class="sl-rad" data-name="Radiator">${s}</g>`;
}

function equipment() {
  let s = "";
  // lower deck: water tanks, urine processor, battery and pumps
  s += `<g data-name="Water tanks">`;
  for (const [x, y] of [[-58, -46], [-24, -46]]) {
    s += MAT("glass", cyl(x, y, 14, DECK1 - 52, 50, 32));
    s += MAT("steel", cyl(x, y, 15, DECK1 - 52, 2, 32) + cyl(x, y, 15, DECK1 - 3, 3, 32));
    s += line3([[x, y - 14, DECK1 - 44], [x, y - 14, DECK1 - 8]], "sl-tank-line");
  }
  s += `</g>`;
  s += named("Urine processor", MAT("white", slab(8, -62, 28, 24, DECK1 - 54, 34, 2, 0.4)) + MAT("green", slab(12, -64, 20, 3, DECK1 - 22, 16, 1, 0.2)) + MAT("steel", cyl(22, -58, 5, DECK1 - 20, 14, 16)), "urine");
  s += named("Battery bank", MAT("darksteel", slab(48, -64, 30, 24, DECK1 - 54, 12, 1, 0.2) + slab(48, -64, 30, 24, DECK1 - 40, 12, 1, 0.2) + slab(48, -64, 30, 24, DECK1 - 26, 12, 1, 0.2)));
  s += named("Circulation pump", MAT("steel", cyl(-78, -24, 8, DECK1 - 32, 12, 20)) + MAT("blue", cyl(-78, -24, 9, DECK1 - 18, 3, 20)));

  // middle deck: electrolyser, CO2 scrubber, Sabatier reactor, racks and the plant chamber
  s += named("O2 electrolyser", MAT("teal", cyl(-60, -48, 13, DECK1 + 4, 40, 28)) + MAT("steel", cyl(-60, -48, 14, DECK1 + 4, 4, 28) + cyl(-60, -48, 14, DECK1 + 40, 4, 28)) + MAT("chrome", cyl(-60, -48, 5, DECK1 + 8, 32, 20)));
  s += named("CO2 scrubber", MAT("green", cyl(-18, -58, 12, DECK1 + 6, 38, 24)) + MAT("steel", cyl(-18, -58, 13, DECK1 + 6, 4, 24) + cyl(-18, -58, 13, DECK1 + 40, 4, 24)) + MAT("orange", cyl(-18, -58, 7, DECK1 + 10, 30, 20)));
  s += named("Sabatier reactor", MAT("copper", cyl(20, -52, 10, DECK1 + 4, 34, 24)) + MAT("steel", cyl(20, -52, 11, DECK1 + 4, 3, 24) + cyl(20, -52, 11, DECK1 + 34, 4, 24)) + MAT("red", cyl(20, -52, 4, DECK1 + 8, 26, 16)));
  s += named("Equipment rack", MAT("white", slab(46, -64, 34, 26, DECK1 + 4, 42, 2, 0.4)) + MAT("blue", slab(49, -62, 28, 2, DECK1 + 12, 6, 1, 0.2) + slab(49, -62, 28, 2, DECK1 + 24, 6, 1, 0.2)));
  s += `<g data-name="Plant chamber">`;
  for (let i = 0; i < 2; i++) {
    s += MAT("steel", slab(-74, -20, 52, 18, DECK1 + 8 + i * 18, 4, 1, 0.2));
    for (let j = 0; j < 5; j++) s += MAT("leaf", slab(-70 + j * 10, -17, 7, 12, DECK1 + 12 + i * 18, 8, 1, 0.2));
    s += MAT("pink", slab(-70, -18, 44, 2, DECK1 + 26 + i * 18, 3, 0.5, 0.2));
  }
  s += `</g>`;

  // upper deck: bunks, exercise bike, galley and a working crew
  s += `<g data-name="Crew quarters">`;
  for (let i = 0; i < 3; i++) {
    s += MAT("white", slab(-64, -58, 38, 20, DECK2 + 4 + i * 16, 12, 1, 0.3));
    s += MAT("blue", slab(-60, -55, 30, 14, DECK2 + 8 + i * 16, 3, 0.5, 0.2));
  }
  s += `</g>`;
  s += named("Exercise bike", MAT("steel", line3([[-6, -30, DECK2 + 2], [-6, -30, DECK2 + 22]], "sl-boom") + line3([[-20, -30, DECK2 + 2], [8, -30, DECK2 + 2]], "sl-boom") + cyl(-22, -30, 8, DECK2 + 2, 3, 20)) + MAT("red", slab(-10, -34, 8, 8, DECK2 + 20, 4, 1, 0.2)));
  s += named("Galley", MAT("white", slab(36, -62, 40, 26, DECK2 + 4, 28, 2, 0.4)) + MAT("steel", slab(40, -64, 32, 3, DECK2 + 12, 3, 0.5, 0.2)) + MAT("green", slab(42, -60, 8, 8, DECK2 + 16, 6, 1, 0.2)));
  s += named("Docking port", MAT("steel", cyl(18, -10, 18, Z1 - 2, 10, 32) + cyl(18, -10, 13, Z1 + 8, 3, 32)) + MAT("darksteel", cyl(18, -10, 9, Z1 + 11, 2, 32)));
  s += named("Antenna", MAT("steel", line3([[-52, -40, Z1 + 2], [-58, -42, Z1 + 34]], "sl-boom")) + MAT("white", cyl(-58, -42, 11, Z1 + 32, 2, 24)));
  return s;
}

function pipes() {
  let s = "";
  s += line3([[-60, -48, DECK1 + 44], [-60, -35, 154], [-24, -12, 154], [-10, -8, 150]], "sl-pipe sl-pipe-o2");
  s += line3([[-18, -58, DECK1 + 44], [-18, -35, 142], [-4, -20, 140], [-3, -14, 136]], "sl-pipe sl-pipe-air");
  s += line3([[-58, -46, DECK1 - 4], [-58, -35, DECK1 + 8], [-60, -48, DECK1 + 6]], "sl-pipe sl-pipe-water");
  s += line3([[8, -54, DECK1 - 20], [-14, -48, DECK1 + 8], [-14, -44, DECK1 + 14]], "sl-pipe sl-pipe-water");
  s += line3([[20, -52, DECK1 + 38], [20, -30, 142], [10, -18, 142]], "sl-pipe sl-pipe-co2");
  return `<g class="sl-pipes" data-name="Life-support plumbing">${s}</g>`;
}

function fansStatic() {
  let s = "";
  for (const [x, y, z] of [[0, -82, 158], [44, -74, 104], [-8, -72, 28]]) {
    s += `<g data-name="Circulation fan"><circle class="sl-fan-ring" cx="${at([x, y, z])[0]}" cy="${at([x, y, z])[1]}" r="11"/>${dot([x, y, z], 2, "sl-fan-hub")}</g>`;
  }
  return s;
}

function stars() {
  let s = "";
  let seed = 13;
  for (let i = 0; i < 46; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const x = -250 + (seed / 233280) * 500;
    seed = (seed * 9301 + 49297) % 233280;
    const y = -130 + (seed / 233280) * 200;
    seed = (seed * 9301 + 49297) % 233280;
    const z = 210 + (seed / 233280) * 30;
    s += dot([x, y, z], 0.7, "sl-star");
  }
  return s;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "sl-svg",
    label: "Cutaway of an orbital habitat module. The front half of the white cylindrical shell is removed to show two decks of life-support equipment: water tanks, an oxygen electrolyser, a carbon-dioxide scrubber, a Sabatier reactor, a plant chamber, crew quarters and an exercise area. Solar arrays and radiator panels project from the outside.",
    body: [
      stars(),
      habitatShell(),
      equipment(),
      pipes(),
      `<g data-part="fans">${fansStatic()}</g>`,
      solarWing(-1), solarWing(1), radiator(-1), radiator(1),
      `<g data-part="bubbles"></g>`,
      `<g data-part="levels"></g>`,
      `<g data-part="crew" data-name="Astronaut">${[-2, 20, 43, -30].map((x, i) => person(x, -12 + i * 2, DECK2, i * 1.7)).join("")}</g>`,
      `<g data-part="beacon">${dot([18, -10, Z1 + 15], 3.5, "sl-beacon")}</g>`,
      `<g data-part="solar-static"></g>`,
    ],
  });
  const plate = k.plateHtml({
    fig: "Fig 23", title: "Orbital life support", hint: "Balance crew, power and recycling",
    readout: "", body: `<div class="iso-stage sl-stage" tabindex="0" role="img" aria-label="Space station life support">${svg}</div>`,
  });

  const css = `
.sl-helmet{fill:#f3f4f6;stroke:#5b6675;stroke-width:1.2}
.sl-visor{fill:#1f3a5c;opacity:.9}
.sl-arm{stroke:#d9dde3;stroke-width:3.5;stroke-linecap:round;fill:none}
.sl-rail{stroke:#7d8795;stroke-width:1.6;fill:none}
.sl-ladder,.sl-rung{stroke:#5b6675;stroke-width:2;fill:none}
.sl-boom{stroke:#6d7784;stroke-width:2.2;fill:none}
.sl-cell{stroke:#7ea6d9;stroke-width:.8;opacity:.55;fill:none}
.sl-rad-line{stroke:#9fc3d8;stroke-width:.9;opacity:.7;fill:none}
.sl-tank-line{stroke:#7fc7e6;stroke-width:1.2;opacity:.8;fill:none}
.sl-star{fill:var(--anatomy-muted);opacity:.35}
.sl-beacon{fill:#e8402c;filter:drop-shadow(0 0 4px #ff3b2f)}
.sl-fan-ring{fill:none;stroke:#6d7784;stroke-width:1.2}
.sl-fan-hub{fill:#39424f}
.sl-fan-blade{stroke:#aab4c0;stroke-width:2.4;stroke-linecap:round;fill:none}
.sl-bubble{fill:#9fe8ff;opacity:.8}
.sl-pipe{fill:none;stroke-width:2.4;stroke-dasharray:7 9;animation:sl-flow 1.4s linear infinite}
.sl-pipe-o2{stroke:#2fb8d8}
.sl-pipe-air{stroke:#e1a52f}
.sl-pipe-water{stroke:#477ed8}
.sl-pipe-co2{stroke:#d56a3a}
@keyframes sl-flow{to{stroke-dashoffset:-32}}
body[data-mode="loops"] .sl-shell{opacity:.24}
body[data-mode="loops"] .sl-pipe{stroke-width:4;filter:drop-shadow(0 0 4px rgba(80,190,230,.7))}
body[data-alarm="caution"] .sl-beacon{animation:sl-pulse 1.2s ease-in-out infinite}
body[data-alarm="critical"] .sl-beacon{animation:sl-pulse .55s ease-in-out infinite}
@keyframes sl-pulse{50%{opacity:.2}}
${materialsCss(["white", "steel", "floor", "glass", "water", "teal", "green", "copper", "red", "blue", "navy", "darksteel", "chrome", "pink", "leaf", "orange", "slate"])}
`;

  const live = `
const state = initialState();
const fansEl = part("fans"), bubblesEl = part("bubbles"), levelsEl = part("levels"), crewEl = part("crew"), beaconEl = part("beacon");
const wings = [...document.querySelectorAll(".sl-wing")];
const rads = [...document.querySelectorAll(".sl-rad")];
const tanks = [[-58, -46], [-24, -46]];
const bubbles = Array.from({ length: 18 }, (_, i) => ({ x: -60 + (Math.random() - 0.5) * 16, y: -48 + (Math.random() - 0.5) * 16, f: Math.random(), s: 0.5 + Math.random() * 0.6 }));
const hist = { o2: [], co2: [] };
let lastPaint = 0, lastGauge = 0, lastHist = 0;
Lab.onAction((a) => {
  if (a === "leak") state.leak = true;
  if (a === "seal") state.leak = false;
  if (a === "reset") Object.assign(state, initialState());
});
function fanSvg(now) {
  let s = "";
  C.FANS.forEach(([x, y, z], i) => {
    const a0 = now * 2.4 + i * 1.1;
    for (let k = 0; k < 3; k++) {
      const a = a0 + k * TAU / 3;
      s += line3([[x, y, z], [x + Math.cos(a) * 10, y, z + Math.sin(a) * 10]], "sl-fan-blade");
    }
    s += dot([x, y, z], 2.2, "sl-fan-hub");
  });
  return s;
}
function bubbleSvg(now) {
  let s = "";
  for (const b of bubbles) {
    const f = (now * 0.12 * b.s + b.f) % 1;
    s += dot([b.x + Math.sin(f * 7 + b.f * 9) * 2, b.y, C.DECK1 + 10 + f * 32], 1.1, "sl-bubble");
  }
  return s;
}
function levelSvg(o) {
  let s = "";
  for (const [x, y] of C.TANKS) {
    const h = Math.max(1, 34 * clamp(o.water / 100, 0, 1));
    s += MAT("water", cyl(x, y, 11.5, C.DECK1 - 51, h, 28));
  }
  return s;
}
function personSvg(x, y, z, phase) {
  let s = "";
  s += MAT("white", slab(x - 4, y - 3, 8, 6, z + 12, 14, 1, 0.3));
  s += MAT("steel", slab(x + 2, y - 2, 4, 5, z + 16, 11, 0.5, 0.2));
  s += MAT("white", slab(x - 4, y - 1, 3, 3, z, 12, 1, 0.2) + slab(x + 1, y - 1, 3, 3, z, 12, 1, 0.2));
  s += MAT("blue", slab(x - 4, y - 3, 8, 3, z + 25, 3, 0.6, 0.2));
  s += dot([x, y - 1, z + 31], 4.3, "sl-helmet");
  s += dot([x + 1, y - 2, z + 31], 2.7, "sl-visor");
  s += line3([[x - 4, y, z + 23], [x - 7 - Math.sin(phase) * 2, y, z + 16]], "sl-arm");
  s += line3([[x + 4, y, z + 23], [x + 7 + Math.sin(phase) * 2, y, z + 16]], "sl-arm");
  return s;
}
function crewSvg(n, now) {
  let s = "";
  C.CREW.slice(0, n).forEach(([x, y], i) => { s += personSvg(x, y, C.DECK2 + Math.sin(now * 1.4 + i) * 0.8, now * 1.8 + i * 1.4); });
  return s;
}
function beaconSvg(o) {
  const col = o.status === "critical" ? "#ff2f1f" : o.status === "caution" ? "#ffb01f" : "#5fe08a";
  return '<circle class="sl-beacon" style="fill:' + col + '" cx="' + at([18, -10, C.Z1 + 15])[0] + '" cy="' + at([18, -10, C.Z1 + 15])[1] + '" r="3.5"/>';
}
const cv = document.querySelector(".sl-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), strong = cs.getPropertyValue("--anatomy-strong"), rule = cs.getPropertyValue("--lab-rule");
  const padL = 40, padB = 26, plotW = w - padL - 12, plotH = h - padB - 14;
  const line = (arr, lo, hi, col) => {
    if (arr.length < 2) return;
    ctx.beginPath();
    arr.forEach((v, i) => { const x = padL + (i / Math.max(1, arr.length - 1)) * plotW, y = 14 + (1 - (v - lo) / (hi - lo)) * plotH; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  };
  ctx.strokeStyle = rule; ctx.lineWidth = 1.5;
  for (const q of [0, .5, 1]) { const y = 14 + q * plotH; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - 12, y); ctx.stroke(); }
  line(hist.o2, 14, 25, "#2fb8d8");
  line(hist.co2.map((v) => Math.min(6000, v)), 0, 6000, "#e1a52f");
  ctx.font = "600 15px ui-monospace,monospace"; ctx.fillStyle = muted; ctx.textAlign = "left";
  ctx.fillText("O₂ 14–25 kPa", padL, h - 8);
  ctx.fillStyle = "#e1a52f"; ctx.fillText("CO₂ 0–6000 ppm", padL + 150, h - 8);
  ctx.fillStyle = strong; ctx.textAlign = "right"; ctx.fillText(Math.round(o.o2 * 10) / 10 + " kPa", w - 14, 22);
}
function frame(dt, now) {
  const u = { crew: Lab.value("crew"), power: Lab.value("power"), scrubber: Lab.value("scrubber"), recycler: Lab.value("recycler") };
  step(state, u, dt * SIM_SPEED);
  const o = outputs(state);
  if (o.time - lastHist > 0.55) { lastHist = o.time; hist.o2.push(o.o2); hist.co2.push(o.co2); if (hist.o2.length > 120) { hist.o2.shift(); hist.co2.shift(); } }
  const swing = Math.sin(now * 0.22) * 8 + (u.power - 50) * 0.12;
  wings.forEach((w) => {
    const side = Number(w.dataset.side) || 1;
    const p = side < 0 ? C.PIVOT_L : C.PIVOT_R;
    w.setAttribute("transform", "rotate(" + (side * swing).toFixed(2) + " " + p[0] + " " + p[1] + ")");
  });
  rads.forEach((r) => { r.style.opacity = (0.55 + clamp((o.temp - 20) / 9, 0, 1) * 0.4).toFixed(2); });
  if (now - lastPaint > 0.055) {
    lastPaint = now;
    setHtml(fansEl, fanSvg(now));
    setHtml(bubblesEl, o.o2prod > 0.001 ? bubbleSvg(now) : "");
    setHtml(levelsEl, levelSvg(o));
    setHtml(crewEl, crewSvg(Math.round(u.crew), now));
    setHtml(beaconEl, beaconSvg(o));
  }
  if (now - lastGauge > 0.22) {
    lastGauge = now;
    Lab.gauge("o2", o.o2.toFixed(1) + " kPa", o.o2 < 17);
    Lab.gauge("co2", Math.round(o.co2).toLocaleString("en-US") + " ppm", o.co2 > 5000);
    Lab.gauge("pressure", o.pressure.toFixed(1) + " kPa", o.pressure < 90);
    Lab.gauge("water", Math.round(o.water) + " %", o.water < 25);
    Lab.gauge("temp", o.temp.toFixed(1) + " °C", o.temp > 26);
    Lab.gauge("power", (o.powerMargin >= 0 ? "+" : "") + o.powerMargin.toFixed(1) + " kW", o.powerMargin < 0);
    readout(o.alarms.length ? "⚠ " + o.alarms[0] + " · " + o.status : o.o2prod < 0.001 ? "electrolysis off · reserve holding" : "nominal · pO₂ " + o.o2.toFixed(1) + " kPa");
    document.body.dataset.alarm = o.status;
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, {
      TANKS: [[-58, -46], [-24, -46]],
      DECK1, DECK2, Z1,
      FANS: [[0, -82, 158], [44, -74, 104], [-8, -72, 28]],
      CREW: [[-2, -12], [20, -10], [43, -8], [-30, -16], [58, -16], [10, -26]],
      PIVOT_L: H.at([-100, -22, 151]),
      PIVOT_R: H.at([100, -22, 151]),
    }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Cabin atmosphere</span><em>recent trend</em></div><canvas class="sl-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
