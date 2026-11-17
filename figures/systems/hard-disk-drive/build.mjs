// Hard disk drive with its lid off: a stack of platters on the spindle motor, the actuator arm
// swung by a voice-coil motor between two magnets, and a read/write head flying over the
// tracks. Ask for a track: the arm seeks (accelerate, coast, brake, settle), then waits for
// the sector to come round under the head, then reads.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

export const WIDTH = 600;
export const HEIGHT = 470;

const CASE = { x: -150, y: -110, w: 300, d: 210, r: 10 };
const SPIN = [-40, -6]; // spindle centre
const PLATTER_R = 84, HUB_R = 17;
const PIVOT = [100, 64]; // actuator pivot
const ARM_LEN = Math.hypot(PIVOT[0] - SPIN[0], PIVOT[1] - SPIN[1]) * 0.93;
const DECK = 10; // case floor height
const PLATTER_Z = [24, 34];

const P = k.fitProjection([...k.boxCorners(CASE, -8, 40)], WIDTH, HEIGHT, { pad: 18, azimuth: 40, elevation: 34 });
const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const at = (p) => k.iso(p, P);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const named = (n, s) => `<g data-name="${n}">${s}</g>`;

function caseBody() {
  let s = `<path class="iso-halo" d="${k.haloOf(CASE, -8, 8, P)}"/>`;
  // the cast base: floor plus walls, drawn as a slab and an inner recess outline
  s += named("Base casting", mat("castalu", S(k.slabOf(CASE, -8, DECK + 8, P, 8, 1)) + Ln(k.planOutline(k.insetPlan(CASE, 8), DECK, P, 8), { tone: "lo" }) +
    k.corners(CASE, 12).map(([x, y]) => Ln(k.ring(x, y, 3.2, DECK, P, 16), { tone: "hi" })).join("")));
  // a printed circuit board edge and connector at the back
  s += named("Interface connector", mat("pcb", S(k.slabOf({ x: -60, y: CASE.y + 2, w: 120, d: 10, r: 1 }, DECK, 6, P, 2, 0.3))) + mat("gold", Array.from({ length: 14 }, (_, i) => S(k.slabOf({ x: -54 + i * 8, y: CASE.y + 3, w: 4, d: 3, r: 0.4 }, DECK + 6, 1, P, 2))).join("")));
  // voice-coil magnets (top magnet removed, bottom one shown) around the pivot
  s += named("Voice-coil magnet", mat("darksteel", S(k.slabOf({ x: PIVOT[0] - 10, y: PIVOT[1] - 6, w: 54, d: 46, r: 8 }, DECK, 6, P, 8, 0.6))) + mat("chrome", S(k.slabOf({ x: PIVOT[0] - 4, y: PIVOT[1], w: 44, d: 36, r: 6 }, DECK + 6, 2, P, 8, 0.4))));
  // filter and ramp
  s += named("Recirculation filter", mat("white", S(k.slabOf({ x: -140, y: 54, w: 22, d: 30, r: 3 }, DECK, 14, P, 3, 0.4))));
  s += named("Parking ramp", mat("darksteel", S(k.slabOf({ x: 52, y: -84, w: 14, d: 22, r: 2 }, DECK, PLATTER_Z[1] + 6 - DECK, P, 2, 0.3))));
  return s;
}

const LIVE = `
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
function plattersSvg(a, track, sector) {
  const F = Zf([C.SPIN[0], C.SPIN[1], 0]);
  let s = MAT("darksteel", S(G.disc(C.DECK, C.PZ[0] - 1, 22, F, P)));
  for (const z of C.PZ) {
    const d = G.disc(z - 1.3, z, C.R, F, P);
    s += MAT("chrome", S(d, { tone: "hi", crease: "none" })) + '<path class="hd-sheen" d="' + d.top + '"/>';
    // concentric data zones and the requested track glowing
    for (let r = C.HUB + 8; r < C.R - 3; r += 9) s += lineSvg(ring(C.SPIN[0], C.SPIN[1], r, z, P, 90), { tone: "faint" });
  }
  const zTop = C.PZ[C.PZ.length - 1];
  const tr = C.HUB + 8 + track * (C.R - C.HUB - 14);
  s += '<path class="hd-track" d="' + ring(C.SPIN[0], C.SPIN[1], tr, zTop + 0.1, P, 120) + '"/>';
  // the target sector, a short arc that rotates with the disc
  const sec = []; for (let i = 0; i <= 10; i++) { const t = a + sector + i * 0.02; sec.push(iso([C.SPIN[0] + tr * Math.cos(t), C.SPIN[1] + tr * Math.sin(t), zTop + 0.2], P)); }
  s += '<path class="hd-sector" d="' + pathOf(sec) + '"/>';
  // spindle hub and clamp with its screws (they show the rotation)
  s += MAT("steel", S(G.disc(zTop, zTop + 6, C.HUB, F, P)) + S(G.disc(zTop + 6, zTop + 7.5, C.HUB - 5, F, P)));
  const dots = []; for (let i = 0; i < 6; i++) { const t = a + i * Math.PI / 3; dots.push(iso([C.SPIN[0] + 11 * Math.cos(t), C.SPIN[1] + 11 * Math.sin(t), zTop + 7.5], P)); }
  s += dotsSvg(dots, { size: 0.9, tone: "hi" });
  return s;
}
function armSvg(theta, flying) {
  // arm swings about the pivot; theta is its angle in the floor plane
  const [px, py] = C.PIVOT;
  const tip = [px + C.ARM * Math.cos(theta), py + C.ARM * Math.sin(theta)];
  const zTop = C.PZ[C.PZ.length - 1] + 2.5;
  const dir = [Math.cos(theta), Math.sin(theta)], nrm = [-dir[1], dir[0]];
  const poly = [[px + nrm[0] * 9, py + nrm[1] * 9], [tip[0] + nrm[0] * 2.6, tip[1] + nrm[1] * 2.6], [tip[0] - nrm[0] * 2.6, tip[1] - nrm[1] * 2.6], [px - nrm[0] * 9, py - nrm[1] * 9]];
  let s = MAT("castalu", S(extrude(poly, zTop, 2, P)));
  // the flexure and slider with the head at the tip
  s += MAT("steel", S(extrude([[tip[0] - dir[0] * 16 + nrm[0] * 1.6, tip[1] - dir[1] * 16 + nrm[1] * 1.6], [tip[0] + nrm[0] * 1.6, tip[1] + nrm[1] * 1.6], [tip[0] - nrm[0] * 1.6, tip[1] - nrm[1] * 1.6], [tip[0] - dir[0] * 16 - nrm[0] * 1.6, tip[1] - dir[1] * 16 - nrm[1] * 1.6]], zTop - 1, 1, P)));
  s += '<circle class="hd-head' + (flying ? " hd-reading" : "") + '" cx="' + iso([tip[0], tip[1], zTop - 1.2], P)[0] + '" cy="' + iso([tip[0], tip[1], zTop - 1.2], P)[1] + '" r="2.2"/>';
  // voice coil on the far side of the pivot
  const back = [px - dir[0] * 26, py - dir[1] * 26];
  const coil = [[px - dir[0] * 8 + nrm[0] * 18, py - dir[1] * 8 + nrm[1] * 18], [back[0] + nrm[0] * 14, back[1] + nrm[1] * 14], [back[0] - nrm[0] * 14, back[1] - nrm[1] * 14], [px - dir[0] * 8 - nrm[0] * 18, py - dir[1] * 8 - nrm[1] * 18]];
  s += MAT("copper", S(extrude(coil, zTop - 3, 5, P)));
  s += MAT("steel", S(G.disc(C.DECK, zTop + 4, 7, Zf([px, py, 0]), P)) + S(G.disc(zTop + 4, zTop + 6, 4, Zf([px, py, 0]), P)));
  // ribbon cable to the connector
  s += '<path class="hd-flex" d="' + pathOf([iso([px + 8, py - 10, C.DECK + 6], P), iso([px + 30, py - 40, C.DECK + 4], P), iso([40, -98, C.DECK + 4], P)]) + '"/>';
  return { svg: s, tip };
}
`;

export function figure(theme) {
  const C = { SPIN, R: PLATTER_R, HUB: HUB_R, PIVOT, ARM: ARM_LEN, DECK, PZ: PLATTER_Z };
  const B = new Function("G", "P", "C", "solidSvg", "lineSvg", "dotsSvg", "iso", "pathOf", "ring", "extrude", `${LIVE}; return { plattersSvg, armSvg };`)(G, P, C, k.solidSvg, k.lineSvg, k.dotsSvg, k.iso, k.pathOf, k.ring, k.extrude);
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "hd-svg",
    label: "A 3.5-inch hard disk drive with its lid removed: two mirror platters on a spindle, an actuator arm on a pivot with a copper voice coil, and the read/write head flying over a highlighted track.",
    body: [caseBody(), `<g data-part="platters" data-name="Platters">${B.plattersSvg(0, 0.5, 0)}</g>`, `<g data-part="arm" data-name="Actuator arm">${B.armSvg(Math.PI * 1.12, false).svg}</g>`],
  });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="hd-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb4d6" stop-opacity=".55"/><stop offset=".3" stop-color="#ffffff" stop-opacity=".1"/><stop offset=".46" stop-color="#d7c2ff" stop-opacity=".45"/><stop offset=".52" stop-color="#bff1ff" stop-opacity=".5"/><stop offset=".6" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="#6f86ad" stop-opacity=".55"/></linearGradient></defs></svg>`;
  const plate = defs + k.plateHtml({ fig: "Fig 9", title: "Hard disk drive", hint: "Pick a track · tap a part", readout: "", body: `<div class="iso-stage hd-stage" tabindex="0" role="img" aria-label="Hard disk drive">${svg}</div>` });
  const css = `
.hd-sheen{fill:url(#hd-sheen);pointer-events:none}
.hd-track{fill:none;stroke:#3dd6ff;stroke-width:1.3;opacity:.85;filter:drop-shadow(0 0 2px #3dd6ff)}
.hd-sector{fill:none;stroke:#ff3b8a;stroke-width:3;stroke-linecap:round;filter:drop-shadow(0 0 2px #ff3b8a)}
.hd-head{fill:#d8dde4;stroke:#3b4250;stroke-width:.6}
.hd-reading{fill:#3dff8f;filter:drop-shadow(0 0 3px #3dff8f)}
.hd-flex{fill:none;stroke:#d9a03a;stroke-width:3;stroke-linejoin:round;opacity:.85}
${materialsCss(["castalu", "pcb", "gold", "darksteel", "chrome", "white", "steel", "copper"])}
`;
  const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
${LIVE}
const stage = document.querySelector(".hd-stage");
const platEl = stage.querySelector('[data-part="platters"]'), armEl = stage.querySelector('[data-part="arm"]');
const readout = document.querySelector("[data-readout]");
// arm angle for a radius r from the spindle (law of cosines on the pivot–spindle–head triangle)
const D = Math.hypot(C.PIVOT[0] - C.SPIN[0], C.PIVOT[1] - C.SPIN[1]);
const base = Math.atan2(C.SPIN[1] - C.PIVOT[1], C.SPIN[0] - C.PIVOT[0]);
const angleFor = (r) => base + Math.acos((C.ARM * C.ARM + D * D - r * r) / (2 * C.ARM * D));
const rFor = (u) => C.HUB + 8 + u * (C.R - C.HUB - 14);
let a = 0, last = 0, frame = 0, theta = angleFor(rFor(0.5)), cur = 0.5, from = 0.5, seekT = 0, seekDur = 0, state = "idle", waitT = 0, reads = 0, sector = 1.2, stats = { seek: 0, lat: 0 };
let auto = true, autoT = 0;
function requestTrack(u) {
  from = cur; seekT = 0;
  const dist = Math.abs(u - from);
  // seek time model: ~0.6 ms track-to-track, ~8.5 ms average (1/3 stroke), ~16 ms full stroke
  seekDur = dist < 0.002 ? 0 : 0.6 + 15 * Math.sqrt(dist);
  target = u; state = "seek"; sector = Math.random() * Math.PI * 2; stats.seek = seekDur;
}
let target = 0.5;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  const rpm = Lab.value("rpm");
  const slow = Lab.value("slow");
  const sdt = dt / slow; // simulated seconds
  // the disc turns at the true rate divided by the slow-motion factor
  a += (rpm / 60) * 2 * Math.PI * sdt;
  if (auto && state === "idle") { autoT += dt; if (autoT > 1.2) { autoT = 0; requestTrack(Math.random()); } }
  if (state === "seek") {
    seekT += sdt * 1000; // ms
    const f = Math.min(1, seekT / seekDur);
    const e = f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f); // bang-bang: accelerate then brake
    cur = from + (target - from) * e;
    if (f >= 1) { cur = target; state = "latency"; waitT = 0; }
  } else if (state === "latency") {
    waitT += sdt * 1000;
    // wait until the target sector (fixed on the disc) passes under the head
    const headAng = Math.atan2(armTip()[1] - C.SPIN[1], armTip()[0] - C.SPIN[0]);
    const secAng = (a + sector) % (Math.PI * 2);
    let d = ((headAng - secAng) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (d < 0.25 || waitT > 60000 / rpm) { state = "read"; waitT = 0; stats.lat = Math.max(0, waitT); reads++; }
  } else if (state === "read") {
    waitT += dt; if (waitT > 0.5) state = "idle";
  }
  theta = angleFor(rFor(cur));
  const arm = armSvg(theta, state === "read");
  armEl.innerHTML = arm.svg;
  platEl.innerHTML = plattersSvg(a, target, sector);
  const latAvg = 30000 / rpm; // ms, half a revolution
  const rate = (rpm / 60) * 1.9 * (0.55 + 0.45 * cur); // MB/s, outer tracks hold more sectors
  const text = state === "seek" ? "Seeking…" : state === "latency" ? "Waiting for sector" : state === "read" ? "Reading" : "Idle";
  if (readout.textContent !== text) readout.textContent = text;
  Lab.gauge("state", text, state === "read");
  Lab.gauge("track", Math.round(target * 450000).toLocaleString("en-US"));
  Lab.gauge("seek", stats.seek.toFixed(1) + " ms");
  Lab.gauge("latency", latAvg.toFixed(2) + " ms");
  Lab.gauge("rate", Math.round(rate) + " MB/s");
  Lab.gauge("fly", "≈ 3 nm");
  frame = requestAnimationFrame(tick);
}
function armTip() { return [C.PIVOT[0] + C.ARM * Math.cos(theta), C.PIVOT[1] + C.ARM * Math.sin(theta)]; }
Lab.onAction((id) => { if (id === "seek") { auto = false; requestTrack(Lab.value("track") / 100); } if (id === "auto") auto = true; });
Lab.onChange((id) => { if (id === "track") { auto = false; requestTrack(Lab.value("track") / 100); } });
document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
frame = requestAnimationFrame(tick);
`;
  return { plate, css, script: kitScript() + latheScript() + live };
}
