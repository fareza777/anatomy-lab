// Roller coaster: a closed 3D circuit through a station, lift hill, loop, airtime hills and a
// helix. The live layer runs the train along the spline and draws the riders' arms on the hills.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 760;
export const HEIGHT = 470;

// The loop is generated as a circle; the rest of the circuit is hand-placed.
const LOOP = [];
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2;
  LOOP.push([55 + 17 * Math.sin(a), 0, 28 - 17 * Math.cos(a)]);
}
const CTRL = [
  [-250, -55, 10], [-214, -55, 10], [-190, -50, 11], [-172, -40, 14], [-158, -22, 26], [-146, -4, 40], [-136, 0, 47], [-122, 0, 48],
  [-108, 0, 42], [-96, 0, 26], [-84, 0, 10], [-66, 0, 6], [-50, 0, 8], [-34, 0, 17], [-18, 0, 26], [-2, 0, 23], [10, 0, 12], [24, 0, 7], [40, 0, 8],
  ...LOOP,
  [70, 0, 9], [88, 0, 14], [104, 0, 24], [122, 0, 27], [140, 0, 20], [156, 0, 8],
  [180, 16, 12], [202, 38, 16], [211, 64, 18], [201, 90, 17], [178, 110, 15], [150, 122, 14], [118, 128, 14], [84, 128, 16], [50, 124, 19], [16, 116, 21],
  [-18, 106, 19], [-52, 96, 16], [-86, 88, 13], [-118, 78, 11], [-150, 64, 10], [-178, 46, 11], [-202, 24, 12], [-222, -8, 11], [-236, -34, 10],
];

function spline(points, steps = 6) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length], p1 = points[i];
    const p2 = points[(i + 1) % points.length], p3 = points[(i + 2) % points.length];
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      const q = [0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3));
      out.push([Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, Math.round(q[2] * 14.5) / 10]);
    }
  }
  return out;
}

const TRACK = spline(CTRL, 6);
const MAXZ = Math.max(...TRACK.map((p) => p[2]));
const LEN = TRACK.reduce((a, p, i) => { const q = TRACK[(i + 1) % TRACK.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); }, 0);

const P = k.fitProjection([[-320, -140, 0], [320, 140, 0], [320, -140, 0], [-320, 140, 0], [-136, 0, 72], [55, 0, 66], [-220, -55, 48], [211, 64, 26]], WIDTH, HEIGHT, { pad: 18, azimuth: 60, elevation: 26 });
const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, along, halo } = H;

function offsets(track, w) {
  const L = [], R = [];
  for (let i = 0; i < track.length; i++) {
    const a = track[(i - 1 + track.length) % track.length], b = track[(i + 1) % track.length];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
    L.push([track[i][0] + nx * w, track[i][1] + ny * w, track[i][2]]);
    R.push([track[i][0] - nx * w, track[i][1] - ny * w, track[i][2]]);
  }
  return [L, R];
}
const [RAIL_L, RAIL_R] = offsets(TRACK, 2.2);

function ground() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -320, y: -140, w: 640, d: 280, r: 18 }, -12, 14, P)}"/>`;
  s += named("Park ground", MAT("granite", S(k.slabOf({ x: -320, y: -140, w: 640, d: 280, r: 18 }, -12, 12, P, 8, 1))));
  s += MAT("leaf", S(k.slabOf({ x: -300, y: -120, w: 150, d: 60, r: 20 }, 0, 1.4, P, 6, 0.4)));
  s += MAT("leaf", S(k.slabOf({ x: 120, y: 40, w: 150, d: 70, r: 24 }, 0, 1.4, P, 6, 0.4)));
  s += MAT("cream", S(k.slabOf({ x: -250, y: -96, w: 74, d: 58, r: 6 }, 0, 1.6, P, 5, 0.3)));
  s += MAT("cream", S(k.slabOf({ x: -140, y: -80, w: 70, d: 24, r: 8 }, 0, 1.6, P, 5, 0.3)));
  s += MAT("cream", S(k.slabOf({ x: 40, y: -96, w: 160, d: 22, r: 8 }, 0, 1.6, P, 5, 0.3)));
  return s;
}

function track() {
  let s = "";
  s += `<path class="rc-spine" d="${k.pathOf(RAIL_L.map(at), true)}"/>`;
  s += `<path class="rc-spine" d="${k.pathOf(RAIL_R.map(at), true)}"/>`;
  s += `<path class="rc-rail" d="${k.pathOf(RAIL_L.map(at), true)}"/>`;
  s += `<path class="rc-rail" d="${k.pathOf(RAIL_R.map(at), true)}"/>`;
  for (let i = 0; i < TRACK.length; i += 5) s += line3([RAIL_L[i], RAIL_R[i]], "rc-tie");
  // lift chain
  for (let i = 1; i < 15; i++) {
    const p = along(TRACK, i * 0.0055);
    s += dot([p[0], p[1], p[2] - 1], 0.9, "rc-chain");
  }
  return named("Track", s);
}

function supports() {
  let s = "";
  for (let i = 4; i < TRACK.length; i += 7) {
    const p = TRACK[i];
    if (p[2] < 5 || (p[0] > -252 && p[0] < -188)) continue;
    s += line3([[p[0], p[1], p[2] - 1], [p[0], p[1], 0]], "rc-post");
    s += line3([[p[0] - 2, p[1], 0], [p[0] + 2, p[1], 0]], "rc-post-lo");
    s += dot([p[0], p[1], 0], 1.8, "rc-foot");
  }
  return named("Support column", s);
}

function station() {
  const x = -252, w = 62, y = -55;
  let s = "";
  for (const [dy, d] of [[-24, 18], [7, 18]]) s += MAT("wood", slab(x, y + dy, w, d, 10, 4, 1, 0.3));
  s += MAT("yellow", slab(x, y - 1.6, w, 3.2, 11.4, 1, 0.4, 0.1));
  for (const dx of [4, w - 4]) for (const dy of [-27, 24]) s += MAT("steel", cyl(x + dx, y + dy, 1.6, 0, 44, 8));
  s += MAT("red", slab(x - 2, y - 31, w + 4, 62, 44, 4, 1, 0.3));
  s += MAT("cream", slab(x + 2, y - 29, w - 4, 58, 42, 1.5, 0.5, 0.1));
  const t = at([x + 9, y - 24, 46]);
  s += `<text class="rc-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}" text-anchor="start">THUNDER RUN</text>`;
  s += MAT("darksteel", slab(x + w - 6, y - 23, 4, 4, 11.4, 8, 0.5, 0.1));
  return named("Station", s);
}

function trees() {
  let s = "";
  const T = [[-298, -118], [-266, 112], [-186, -122], [46, -118], [214, -104], [286, -66], [292, 74], [236, 116], [76, 120], [-124, 118], [-276, 86], [168, -116], [-38, -110], [262, 18], [-300, 24]];
  T.forEach(([x, y], i) => {
    s += MAT("bark", cyl(x, y, 1.8, 0, 9 + (i % 3), 8));
    s += MAT("leaf", cyl(x, y, 7 + (i % 4) * 1.5, 8 + (i % 3), 7 + (i % 3) * 2, 12));
    s += MAT("leaf", cyl(x, y, 4.5, 15 + (i % 3) * 2, 5, 10));
  });
  return named("Trees", s);
}

function trainCar(x, z, col, arm) {
  let s = "";
  s += MAT("darksteel", slab(x - 7, -59, 14, 8, z - 3, 2, 0.8, 0.1));
  s += MAT(col, slab(x - 7, -59, 14, 8, z, 4, 1.2, 0.3));
  s += MAT("darksteel", slab(x - 7, -59, 14, 8, z + 4, 1.4, 0.6, 0.1));
  s += MAT("white", slab(x - 7.4, -60, 1.6, 10, z, 3, 0.4, 0.1));
  for (const dx of [-3.6, 3.6]) {
    s += MAT("flesh", cyl(x + dx, -55, 1.6, z + 5.2, 3.2, 8));
    s += line3([[x + dx, -55, z + 7], [x + dx - 2, -55, z + 11]], "rc-arm");
    s += line3([[x + dx, -55, z + 7], [x + dx + 2, -55, z + 11]], "rc-arm");
  }
  s += dot([x - 5, -59.5, z - 1], 1, "rc-wheel") + dot([x + 5, -59.5, z - 1], 1, "rc-wheel");
  return s;
}

function trainStatic() {
  let s = "";
  for (let i = 0; i < 5; i++) s += trainCar(-244 + i * 12, 15.5, i % 2 ? "orange" : "red");
  return named("Train", s);
}

function forces() {
  let s = "";
  for (const [x, z] of [[55, 17], [72, 36], [55, 64]]) {
    s += line3([[x, 0, z], [x, 0, z + 10]], "rc-force");
    s += dot([x, 0, z + 10], 1.4, "rc-force-tip");
  }
  return `<g class="rc-force">${s}</g>`;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "rc-svg",
    label: "A steel roller coaster in isometric view. The track leaves a covered station, climbs a lift hill, drops into a vertical loop, runs over airtime hills and a descending helix before the brake run. A five-car train waits at the station.",
    body: [ground(), supports(), track(), station(), trees(), forces(), `<g data-part="train" data-name="Train">${trainStatic()}</g>`],
  });
  const plate = k.plateHtml({
    fig: "Fig 27", title: "Roller coaster", hint: "Ride the circuit",
    readout: "", body: `<div class="iso-stage rc-stage" tabindex="0" role="img" aria-label="Roller coaster">${svg}</div>`,
  });

  const css = `
.rc-spine{stroke:#27313d;stroke-width:7;fill:none;stroke-linejoin:round}
.rc-rail{stroke:#d3dce7;stroke-width:2.4;fill:none;stroke-linejoin:round}
.rc-tie{stroke:var(--anatomy-faint);stroke-width:1.1;opacity:.85}
.rc-post{stroke:var(--anatomy-muted);stroke-width:2}
.rc-post-lo{stroke:var(--anatomy-faint);stroke-width:1}
.rc-foot{fill:var(--anatomy-muted);opacity:.7}
.rc-wheel{fill:#1b2028}
.rc-arm{stroke:#f3d7c4;stroke-width:1.5;stroke-linecap:round;fill:none}
.rc-chain{fill:#7d8a99}
.rc-sign{fill:var(--lab-accent);font:700 10px "LabDisplay",ui-sans-serif,sans-serif;letter-spacing:.14em}
.rc-force{stroke:#ff7a45;stroke-width:1.8;stroke-linecap:round;fill:none;opacity:.9}
.rc-force-tip{fill:#ff7a45}
body[data-mode="ride"] .rc-force{display:none}
body[data-mode="forces"] .rc-svg{filter:saturate(1.05)}
${materialsCss(["granite", "leaf", "cream", "wood", "yellow", "steel", "red", "orange", "white", "flesh", "bark", "darksteel"])}
`;

  const live = `
const state = initialState();
const trainEl = part("train");
let progress = 0, hold = 2.2, lastPaint = 0, lastGauge = 0;
const TRACK = C.TRACK, MAXZ = C.MAXZ;
const LEN = TRACK.reduce((a, p, i) => { const q = TRACK[(i + 1) % TRACK.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); }, 0);
Lab.onAction((a) => {
  if (a === "dispatch") { hold = 0; state.laps += 1; }
      if (a === "reset") { Object.assign(state, initialState()); Lab.set("lift", 30); Lab.set("cars", 5); Lab.set("dispatch", 25); Lab.set("brake", 0.7); progress = 0; hold = 2.2; }
});

function carAt(x, y, z, col, arm, i) {
  let s = "";
  s += MAT("darksteel", slab(x - 6, y - 4, 12, 8, z - 3, 2, 0.8, 0.1));
  s += MAT(col, slab(x - 6, y - 4, 12, 8, z, 4, 1.2, 0.3));
  s += MAT("darksteel", slab(x - 6, y - 4, 12, 8, z + 4, 1.4, 0.6, 0.1));
  s += MAT("white", slab(x - 6.4, y - 4.6, 1.4, 9.2, z, 3, 0.4, 0.1));
  for (let k = 0; k < 2; k++) {
    const dx = k ? 3.2 : -3.2;
    s += MAT("flesh", cyl(x + dx, y, 1.4, z + 5, 3, 8));
    s += line3([[x + dx, y, z + 7], [x + dx - 2, y, z + 10 + arm]], "rc-arm");
    s += line3([[x + dx, y, z + 7], [x + dx + 2, y, z + 10 + arm]], "rc-arm");
  }
  s += dot([x - 4.4, y + 4, z - 1], 0.9, "rc-wheel") + dot([x + 4.4, y + 4, z - 1], 0.9, "rc-wheel");
  return s;
}

function trainSvg(now) {
  const cars = Math.round(Lab.value("cars"));
  const spacing = 12 / LEN;
  let s = "";
  for (let i = cars - 1; i >= 0; i--) {
    const p = along(TRACK, progress - i * spacing);
    const q = along(TRACK, progress - (i + 1) * spacing);
    const arm = Math.sin(now * 3.2 + i * 1.1) * 1.4;
    s += carAt(p[0], p[1], p[2] + 1, i % 2 ? "orange" : "red", arm, i);
  }
  return s;
}

const cv = document.querySelector(".rc-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), rule = cs.getPropertyValue("--lab-rule");
  ctx.strokeStyle = rule; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, h - 22); ctx.lineTo(w - 10, h - 22); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < TRACK.length; i += 2) {
    const x = 10 + (i / (TRACK.length - 1)) * (w - 20);
    const y = h - 26 - (TRACK[i][2] / MAXZ) * (h - 46);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.strokeStyle = "#3f8fd0"; ctx.lineWidth = 3; ctx.stroke();
  ctx.lineTo(w - 10, h - 22); ctx.lineTo(10, h - 22); ctx.closePath();
  ctx.fillStyle = "rgba(63,143,208,.16)"; ctx.fill();
  const p = Math.round(progress * (TRACK.length - 1));
  const x = 10 + (p / (TRACK.length - 1)) * (w - 20);
  const y = h - 26 - (TRACK[p][2] / MAXZ) * (h - 46);
  ctx.fillStyle = "#ff7a45"; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = muted; ctx.font = "500 14px ui-monospace,monospace"; ctx.textAlign = "left";
  ctx.fillText("track profile · " + Math.round(o.lift) + " m lift", 12, 18);
}

function frame(dt, now) {
  const u = { lift: Lab.value("lift"), cars: Lab.value("cars"), dispatch: Lab.value("dispatch"), brake: Lab.value("brake") };
  step(state, u, Math.min(dt, 0.2));
  const o = outputs(state);
  if (hold > 0) hold -= dt;
  else {
    const here = along(TRACK, progress);
    const factor = 0.3 + 0.7 * Math.sqrt(clamp((MAXZ - here[2]) / MAXZ, 0, 1));
    progress += dt * 0.075 * factor;
    if (progress >= 1) { progress -= 1; hold = 1.8; state.laps += 1; }
  }
  if (now - lastPaint > 0.03) {
    lastPaint = now;
    setHtml(trainEl, trainSvg(now));
  }
  if (now - lastGauge > 0.2) {
    lastGauge = now;
    Lab.gauge("speed", Math.round(o.speed) + " km/h", o.speed > 95);
    Lab.gauge("g", o.gMax.toFixed(1) + " g", o.gMax > 5.5);
    Lab.gauge("time", o.rideTime.toFixed(0) + " s");
    Lab.gauge("capacity", Math.round(o.capacity) + " /h", o.capacity < 350);
    Lab.gauge("energy", o.energy.toFixed(1) + " MJ");
    Lab.gauge("laps", Math.round(o.laps).toString());
    readout(Math.round(o.speed) + " km/h · " + o.gMax.toFixed(1) + " g · " + o.bottleneck + " limit");
    document.body.dataset.bottleneck = o.bottleneck;
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { TRACK, MAXZ }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Circuit profile</span><em>height along the lap</em></div><canvas class="rc-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
