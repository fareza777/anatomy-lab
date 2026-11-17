// Fusion tokamak: a transparent toroidal vessel, twelve superconducting coils, a glowing D-T
// plasma and a small balance-of-plant. The live layer pulses the plasma, sweeps field lines,
// spins the turbine and reacts to disruption or a magnet quench.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 740;
export const HEIGHT = 540;

const R = 118, TZ = 105, VR = 36;

const P = k.fitProjection([
  [-280, -220, 0], [285, 185, 0], [285, -210, 0], [-280, 175, 0], [-210, -120, 240], [130, 130, 90],
], WIDTH, HEIGHT, { pad: 12, azimuth: 58, elevation: 25 });

const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, circle3, tube, clamp, mix, TAU } = H;

const ring = (radius, z, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const t = a0 + ((a1 - a0) * i) / n;
  return [radius * Math.cos(t), radius * Math.sin(t), z];
});

function cutCircle(theta, radius = VR) {
  const dir = [Math.cos(theta), Math.sin(theta), 0], tang = [-Math.sin(theta), Math.cos(theta), 0];
  const frame = G.frameOf([R * dir[0], R * dir[1], TZ], tang, dir, [0, 0, 1]);
  const pts = circle3(frame, 0, radius, 36);
  return line3(pts.concat([pts[0]]), "fk-cut");
}

function vessel() {
  let s = "";
  const body = tube(ring(R, TZ, 2.10, Math.PI * 2 + 1.05, 84), VR, { bend: 24, maxLength: 700 });
  s += `<g class="fk-vessel" data-name="Vacuum vessel">${MAT("glass", body)}</g>`;
  s += MAT("steel", tube(ring(R, TZ, 2.10, Math.PI * 2 + 1.05, 84), VR - 3, { bend: 24, maxLength: 700 }));
  s += cutCircle(2.10) + cutCircle(Math.PI * 2 + 1.05);
  s += MAT("white", tube(ring(R, TZ + 30, 2.10, Math.PI * 2 + 1.05, 84), 5, { bend: 24, maxLength: 700 }));
  s += MAT("white", tube(ring(R, TZ - 30, 2.10, Math.PI * 2 + 1.05, 84), 5, { bend: 24, maxLength: 700 }));
  return s;
}

function coils() {
  let s = "";
  const prof = [[70, 45], [58, 78], [58, 132], [70, 165], [96, 182], [140, 182], [162, 165], [172, 132], [172, 78], [162, 45], [140, 28], [96, 28]];
  for (let i = 0; i < 12; i++) {
    const th = (i / 12) * TAU + Math.PI / 12;
    const dir = [Math.cos(th), Math.sin(th)];
    const pts = prof.map(([r, z]) => [dir[0] * r, dir[1] * r, z]);
    pts.push(pts[0]);
    const t = tube(pts, 4.4, { bend: 7, maxLength: 90 });
    s += `<g class="fk-coil" data-name="Toroidal field coil">${MAT("copper", t)}</g>`;
    const inner = prof.map(([r, z]) => [dir[0] * r * 0.93, dir[1] * r * 0.93, z]);
    inner.push(inner[0]);
    s += MAT("orange", tube(inner, 1.2, { bend: 5, maxLength: 90 }));
  }
  return s;
}

function plasma() {
  let s = `<g class="fk-plasma" data-name="Plasma">`;
  s += MAT("pink", tube(ring(R, TZ, 0, TAU, 96), 17, { bend: 30, maxLength: 650 }));
  s += `<g class="fk-core">${MAT("white", tube(ring(R, TZ, 0, TAU, 96), 7, { bend: 30, maxLength: 650 }))}</g>`;
  s += `</g>`;
  return s;
}

function blanket() {
  let s = `<g data-name="Blanket modules">`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const x = Math.cos(a) * 82, y = Math.sin(a) * 82;
    s += MAT(i % 3 ? "steel" : "copper", slab(x - 7, y - 7, 14, 14, TZ - 22, 34, 1, 0.2));
  }
  s += `</g>`;
  return s;
}

function divertor() {
  let s = `<g data-name="Divertor">`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + 0.1;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    s += MAT(i % 2 ? "darksteel" : "orange", slab(x - 9, y - 9, 18, 18, 66, 10, 1, 0.2));
  }
  s += `</g>`;
  return s;
}

function fieldLines() {
  let s = "";
  for (const [rad, z, ph] of [[R, TZ - 18, 0], [R, TZ, 0.3], [R, TZ + 18, 0.6]]) {
    s += line3(ring(rad, z, ph, ph + TAU, 72), "fk-field");
  }
  s += line3([[R - 35, 0, TZ - 20], [R + 35, 0, TZ - 20]], "fk-field");
  s += line3([[R - 35, 0, TZ + 20], [R + 35, 0, TZ + 20]], "fk-field");
  return `<g class="fk-fields" data-name="Magnetic field lines">${s}</g>`;
}

function neutralBeams() {
  let s = "";
  for (const side of [-1, 1]) {
    const x = side * 214;
    s += `<g data-name="Neutral beam injector">`;
    s += MAT("white", slab(x - 34, -16, 68, 32, 94, 26, 2, 0.4));
    s += MAT("blue", slab(x - 30, -12, 60, 8, 100, 6, 1, 0.2));
    s += MAT("darksteel", slab(x - 38, -20, 8, 40, 88, 38, 1, 0.2));
    s += MAT("steel", cyl(x, 20, 5, 70, 90, 20));
    for (const dx of [-30, 30]) for (const dy of [-12, 12]) s += MAT("steel", cyl(x + dx, dy, 2.2, 0, 94, 12));
    s += line3([[x - 30, -12, 22], [x + 30, 12, 22]], "fk-pipe");
    s += line3([[x - side * 30, 0, 108], [side * (R - 38), 0, 108]], "fk-beam");
    s += `</g>`;
  }
  return s;
}

function plant() {
  let s = "";
  s += named("Cryoplant", MAT("white", slab(-230, -150, 58, 46, 0, 52, 2, 0.4)) + MAT("blue", cyl(-222, -112, 10, 0, 42, 24) + cyl(-200, -112, 10, 0, 42, 24)) + MAT("steel", line3([[-212, -105, 40], [-175, -80, 40], [-160, -50, 40]], "fk-pipe")));
  s += named("Steam generator", MAT("white", slab(168, 74, 52, 38, 0, 36, 2, 0.4)) + MAT("copper", cyl(194, 93, 14, 36, 18, 24)) + MAT("steel", line3([[160, 80, 40], [145, 60, 44], [140, 30, 44]], "fk-pipe")));
  s += `<g data-name="Turbine">${MAT("steel", cyl(238, 112, 16, 0, 30, 28) + cyl(238, 112, 10, 30, 14, 24))}</g>`;
  s += named("Generator", MAT("white", slab(258, 100, 24, 24, 0, 28, 2, 0.4)) + MAT("blue", slab(260, 102, 20, 4, 8, 12, 1, 0.2)));
  s += named("Heat exchanger", MAT("steel", slab(120, 150, 44, 28, 0, 26, 2, 0.4)) + MAT("orange", cyl(142, 164, 8, 26, 12, 20)));
  s += line3([[100, 100, 40], [130, 120, 40], [160, 120, 40]], "fk-pipe");
  s += line3([[220, 112, 30], [238, 112, 30]], "fk-pipe");
  return s;
}

function cryostat() {
  let s = "";
  s += named("Cryostat base", MAT("castalu", cyl(0, 0, 178, 0, 18, 64)) + MAT("steel", cyl(0, 0, 184, 18, 4, 64)));
  for (const [x, y] of [[-150, -80], [150, -80], [-150, 85], [150, 85]]) s += MAT("darksteel", slab(x - 12, y - 12, 24, 24, 18, 16, 2, 0.3));
  s += named("Central solenoid", MAT("copper", cyl(0, 0, 27, 22, 138, 40)) + MAT("darksteel", cyl(0, 0, 30, 22, 9, 40) + cyl(0, 0, 30, 151, 9, 40)));
  for (let z = 35; z < 150; z += 12) s += MAT("orange", cyl(0, 0, 28.5, z, 2.5, 40));
  s += named("Diagnostic port", MAT("steel", cyl(52, -36, 10, TZ + 44, 34, 24)) + MAT("white", cyl(52, -36, 12, TZ + 76, 4, 24)));
  s += named("Pellet injector", MAT("white", cyl(-34, -136, 5, 174, 48, 20)) + MAT("blue", cyl(-34, -136, 6, 220, 5, 20)));
  s += named("Control console", MAT("white", slab(-28, 144, 56, 20, 0, 16, 2, 0.4)) + MAT("blue", slab(-23, 148, 18, 3, 12, 10, 1, 0.2) + slab(1, 148, 18, 3, 12, 10, 1, 0.2)));
  return s;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "fk-svg",
    label: "Cutaway of a tokamak fusion reactor. A glowing pink toroidal plasma sits inside a transparent vacuum vessel, surrounded by twelve copper toroidal-field coils and a central solenoid. Neutral beam injectors enter from both sides; cryoplant, steam generator, turbine and generator sit around the base.",
    body: [
      cryostat(),
      vessel(),
      blanket(),
      divertor(),
      plasma(),
      coils(),
      fieldLines(),
      neutralBeams(),
      plant(),
      `<g data-part="beams"></g>`,
      `<g data-part="turbine"></g>`,
      `<g data-part="hotspots"></g>`,
      `<g data-part="beacon"></g>`,
      `<g data-part="fields-live"></g>`,
    ],
  });
  const plate = k.plateHtml({
    fig: "Fig 24", title: "Fusion tokamak", hint: "Heat the plasma and hold the field",
    readout: "", body: `<div class="iso-stage fk-stage" tabindex="0" role="img" aria-label="Fusion tokamak">${svg}</div>`,
  });

  const css = `
.fk-vessel{opacity:.42}
.fk-vessel [data-mat="glass"] .iso-fill{opacity:.5}
.fk-coil{filter:drop-shadow(0 0 2px rgba(232,150,70,.35))}
.fk-plasma{filter:drop-shadow(0 0 12px rgba(255,80,210,.75))}
.fk-core{filter:drop-shadow(0 0 10px #fff);opacity:.9}
.fk-field{stroke:#4dc6e8;stroke-width:1.4;stroke-dasharray:4 10;fill:none;opacity:.55;animation:fk-flow 3s linear infinite}
.fk-beam{stroke:#ff9d2e;stroke-width:3;stroke-dasharray:12 10;fill:none;opacity:.75;animation:fk-beam 1.2s linear infinite}
.fk-pipe{stroke:#6d7784;stroke-width:2;fill:none}
.fk-blade{stroke:#aab4c0;stroke-width:3;stroke-linecap:round;fill:none}
.fk-cut{fill:none;stroke:#d9e2ec;stroke-width:2;opacity:.9}
@keyframes fk-flow{to{stroke-dashoffset:-56}}
@keyframes fk-beam{50%{opacity:.25}}
body[data-mode="plant"] .fk-plasma{opacity:.28;filter:none}
body[data-mode="plant"] .fk-fields{opacity:.25}
body[data-mode="plant"] .fk-beam{opacity:1}
body[data-alarm="critical"] .fk-plasma{filter:drop-shadow(0 0 16px rgba(255,40,40,.9))}
body[data-alarm="critical"] .fk-plasma [data-mat="pink"]{opacity:.45}
.fk-beacon{fill:#5fe08a;filter:drop-shadow(0 0 5px #3fae72)}
.fk-hot{fill:#fff;filter:drop-shadow(0 0 5px #ff62d6)}
.fk-prop{fill:#ffd9f5;opacity:.8}
${materialsCss(["glass", "steel", "copper", "orange", "pink", "white", "darksteel", "castalu", "blue", "yellow", "red", "floor", "green"])}
`;

  const live = `
const state = initialState();
const hotEl = part("hotspots"), turbineEl = part("turbine"), beaconEl = part("beacon"), beamEl = part("beams"), fieldEl = part("fields-live");
const hotspots = Array.from({ length: 9 }, (_, i) => ({ a: Math.random() * TAU, s: 0.5 + Math.random() * 0.8, f: Math.random() }));
let lastPaint = 0, lastGauge = 0;
Lab.onAction((a) => {
  if (a === "disrupt") { state.disrupted = true; state.T = 2; state.Pfus = 0; state.Q = 0; state.Pe = 0; }
  if (a === "reset") { const p = state.pulse + 1; Object.assign(state, initialState()); state.pulse = p; }
});
function hotspotSvg(now, o) {
  let s = "";
  if (o.Pfus < 1) return s;
  for (const h of hotspots) {
    const a = h.a + now * 0.20 * h.s;
    const x = Math.cos(a) * C.R, y = Math.sin(a) * C.R;
    const z = C.TZ + Math.sin(now * 1.4 + h.f * 8) * 5;
    s += dot([x, y, z], 2.2 + Math.sin(now * 3 + h.f) * 0.8, "fk-hot");
    s += line3([[x, y, z], [x + Math.cos(a) * 14, y + Math.sin(a) * 14, z + 3]], "fk-prop");
  }
  return s;
}
function turbineSvg(now, o) {
  const [cx, cy] = C.TURBINE;
  let s = "";
  const spin = now * (2 + 10 * clamp(o.Pe / 300, 0, 1));
  for (let k = 0; k < 8; k++) {
    const a = spin + k * TAU / 8;
    s += '<path class="fk-blade" d="M' + cx + ' ' + cy + 'L' + (cx + Math.cos(a) * 20) + ' ' + (cy + Math.sin(a) * 20) + '"/>';
  }
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#39424f"/>';
  return s;
}
function beaconSvg(o) {
  const col = o.status === "critical" ? "#ff2f1f" : o.status === "caution" ? "#ffb01f" : "#5fe08a";
  const c = at([-34, -136, 230]);
  return '<circle class="fk-beacon" style="fill:' + col + '" cx="' + c[0] + '" cy="' + c[1] + '" r="4"/>';
}
const cv = document.querySelector(".fk-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), strong = cs.getPropertyValue("--anatomy-strong"), rule = cs.getPropertyValue("--lab-rule");
  const vals = [["Fusion", o.Pfus, "#e04fc4"], ["Heating", o.Paux, "#e1a52f"], ["Electric", o.Pe, "#3fae72"]];
  const max = Math.max(200, ...vals.map((v) => v[1])) * 1.15;
  const bw = (w - 30) / 3, base = h - 30;
  ctx.font = "600 19px ui-monospace,monospace"; ctx.textAlign = "center";
  vals.forEach(([label, v, col], i) => {
    const bh = (v / max) * (h - 54), x = 15 + i * bw + bw * 0.18;
    ctx.fillStyle = col; ctx.fillRect(x, base - bh, bw * 0.64, bh);
    ctx.fillStyle = strong; ctx.fillText(Math.round(v), x + bw * 0.32, base - bh - 7);
    ctx.fillStyle = muted; ctx.font = "500 15px ui-monospace,monospace"; ctx.fillText(label, x + bw * 0.32, h - 8); ctx.font = "600 19px ui-monospace,monospace";
  });
  ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(8, base); ctx.lineTo(w - 8, base); ctx.stroke();
  ctx.fillStyle = muted; ctx.textAlign = "right"; ctx.fillText("MW", w - 12, 18);
}
function frame(dt, now) {
  const u = { heating: Lab.value("heating"), fuel: Lab.value("fuel"), field: Lab.value("field"), cooling: Lab.value("cooling") };
  step(state, u, dt * SIM_SPEED);
  const o = outputs(state);
  if (now - lastPaint > 0.055) {
    lastPaint = now;
    setHtml(hotEl, hotspotSvg(now, o));
    setHtml(turbineEl, turbineSvg(now, o));
    setHtml(beaconEl, beaconSvg(o));
    setHtml(beamEl, o.disrupted || o.quench ? "" : "");
    setHtml(fieldEl, "");
    document.body.dataset.alarm = o.status;
    document.body.dataset.q = o.Q.toFixed(1);
  }
  if (now - lastGauge > 0.22) {
    lastGauge = now;
    Lab.gauge("temp", o.T.toFixed(1) + " keV", o.T < 6);
    Lab.gauge("density", o.n.toFixed(1) + " ×10¹⁹", o.n > 11.5);
    Lab.gauge("confine", (o.tau * 1000).toFixed(0) + " ms", o.tau < 0.35);
    Lab.gauge("fusion", Math.round(o.Pfus) + " MW", o.Pfus < 50);
    Lab.gauge("q", o.Q.toFixed(1), o.Q < 2);
    Lab.gauge("magnet", o.magnet.toFixed(2) + " K", o.magnet > 5.4);
    readout(o.alarms.length ? "⚠ " + o.alarms[0] + " · " + o.status : "Q " + o.Q.toFixed(1) + " · " + Math.round(o.Pfus) + " MW fusion · " + Math.round(o.Pe) + " MW electric");
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, {
      R, TZ, TURBINE: at([238, 112, 44]),
    }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Power balance</span><em>megawatts</em></div><canvas class="fk-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
