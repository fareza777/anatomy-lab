// Container terminal: a ship at the quay, three ship-to-shore cranes, a fleet of AGVs and a
// yard served by rubber-tyred gantries. The live layer animates every crane cycle and vehicle.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 700;
export const HEIGHT = 500;

const WATER = { x: -310, y: -175, w: 630, d: 150, z: -8 };
const QUAY = { x: -310, y: -25, w: 630, d: 58, z: 0 };
const YARD = { x: -295, y: 36, w: 610, d: 108, z: 0 };
const SHIP = { x: -255, y: -148, w: 300, d: 92, z: -2 };
const CRANES = [-198, -78, 42];
const RTG = [-128, 68];
const LANES = [10, 22, 34];
const STACK_ROWS = [54, 84, 114];
const COLOURS = ["red", "blue", "green", "orange", "white", "teal", "yellow"];

const P = k.fitProjection([
  [-320, -185, 0], [340, 155, 0], [340, -175, 0], [-320, 145, 0], [-200, -140, 165], [70, 140, 80],
], WIDTH, HEIGHT, { pad: 14, azimuth: 62, elevation: 22 });

const H = helpers(P);
const { MAT, S: S0, Ln, at, slab, cyl, named, poly, line3, dot, tube, halo } = H;
const S = (p, st) => (typeof p === "string" ? p : S0(p, st));
const SS = S;
const HALO = (plan, z = -10, h = 10) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`;

function water() {
  let s = HALO({ x: WATER.x, y: WATER.y, w: WATER.w, d: WATER.d, r: 12 });
  s += named("Harbour water", MAT("water", S(k.slabOf({ x: WATER.x, y: WATER.y, w: WATER.w, d: WATER.d, r: 12 }, WATER.z, 8, P, 6, 1))));
  s += `<g data-part="ripples"></g>`;
  return s;
}

function ship() {
  const { x, y, w, d, z } = SHIP;
  const hullPlan = [[x, y], [x, y + d], [x + w - 45, y + d], [x + w, y + d - 18], [x + w + 32, y + d / 2], [x + w, y + 18], [x + w - 45, y], [x + w - 95, y]];
  let hull = MAT("navy", S(k.extrude(hullPlan, z, 18, P, { convex: false })));
  hull += MAT("red", S(k.extrude(hullPlan, z - 1, 4, P, { convex: false })));
  hull += MAT("floor", S(k.slabOf({ x: x + 8, y: y + 8, w: w - 42, d: d - 16, r: 2 }, z + 18, 2, P, 3, 0.3)));
  // deck cargo: a full bay of boxes in several colours
  let cargo = "";
  for (let i = 0; i < 19; i++) for (let j = 0; j < 5; j++) {
    const bx = x + 18 + i * 12, by = y + 16 + j * 12, h = 7 + ((i * 7 + j * 5) % 3) * 6;
    cargo += MAT(COLOURS[(i + j * 3) % COLOURS.length], SS(slab(bx, by, 10, 9, z + 20, h, 0.6, 0.25)));
  }
  let bridge = MAT("white", SS(slab(x + 16, y + 12, 30, d - 20, z + 20, 46, 2, 0.5)));
  bridge += MAT("glass", SS(slab(x + 18, y + 13, 26, 4, z + 52, 10, 1, 0.2)));
  bridge += MAT("darksteel", S(cyl(x + 31, y + 12, 4, z + 66, 10, 14)));
  return named("Container ship", HALO({ x, y, w: w + 30, d, r: 10 }, z - 8, 8) + hull + cargo + bridge, "ship");
}

function quay() {
  let s = HALO({ x: QUAY.x, y: QUAY.y, w: QUAY.w, d: QUAY.d, r: 10 });
  s += named("Quay", MAT("castalu", S(k.slabOf({ x: QUAY.x, y: QUAY.y, w: QUAY.w, d: QUAY.d, r: 10 }, QUAY.z, 8, P, 6, 1))));
  for (const x of [-270, -210, -150, -90, -30, 30, 90, 150, 210, 270]) s += named("Mooring bollard", MAT("darksteel", S(cyl(x, -20, 3, 8, 6, 12))));
  s += Ln(k.pathOf([[-300, 2, 8], [300, 2, 8]].map(at)), { tone: "lo", dashed: true });
  s += Ln(k.pathOf([[-300, 28, 8], [300, 28, 8]].map(at)), { tone: "lo", dashed: true });
  return s;
}

function yard() {
  let s = HALO({ x: YARD.x, y: YARD.y, w: YARD.w, d: YARD.d, r: 8 });
  s += named("Container yard", MAT("floor", S(k.slabOf({ x: YARD.x, y: YARD.y, w: YARD.w, d: YARD.d, r: 8 }, YARD.z, 8, P, 6, 1))));
  for (const y of STACK_ROWS) s += Ln(k.pathOf([[-285, y + 13, 8], [300, y + 13, 8]].map(at)), { tone: "lo", dashed: true });
  return s;
}

function stacks() {
  let s = "";
  for (const y of STACK_ROWS) {
    for (let i = 0; i < 14; i++) {
      const x = -270 + i * 40;
      if (Math.abs(x + 128) < 28 || Math.abs(x - 68) < 28) continue; // RTG runway lanes
      const high = 2 + ((i * 7 + y) % 3);
      for (let h = 0; h < high; h++) {
        const mat = COLOURS[(i + h * 2 + y) % COLOURS.length];
        s += MAT(mat, SS(slab(x - 9, y - 5.5, 18, 11, 8 + h * 8.4, 8, 0.6, 0.3)));
      }
    }
  }
  return named("Container stacks", s);
}

function craneFrame(x) {
  let s = "";
  for (const y of [-140, 18]) for (const dx of [-15, 15]) s += MAT("orange", SS(slab(x + dx - 3, y - 3, 6, 6, 0, 132, 1, 0.3)));
  s += MAT("orange", SS(slab(x - 17, -144, 34, 168, 130, 9, 2, 0.4)));
  s += MAT("orange", SS(slab(x - 12, -144, 24, 8, 139, 14, 1, 0.3)));
  s += MAT("darksteel", SS(slab(x - 3, -144, 6, 168, 126, 4, 1, 0.2)));
  s += line3([[x - 15, -138, 20], [x - 15, 10, 120]], "bt-brace");
  s += line3([[x + 15, -138, 20], [x + 15, 10, 120]], "bt-brace");
  s += line3([[x - 15, 16, 18], [x - 15, -132, 120]], "bt-brace");
  return named("Ship-to-shore crane", s);
}

function rtgFrame(x) {
  let s = "";
  for (const y of [46, 124]) for (const dx of [-14, 14]) s += MAT("yellow", SS(slab(x + dx - 3, y - 3, 6, 6, 8, 90, 1, 0.3)));
  s += MAT("yellow", SS(slab(x - 17, 43, 34, 84, 96, 8, 1.5, 0.3)));
  s += line3([[x - 14, 46, 18], [x - 14, 124, 90]], "bt-brace") + line3([[x + 14, 46, 18], [x + 14, 124, 90]], "bt-brace");
  s += MAT("darksteel", S(cyl(x - 14, 46, 5, 8, 5, 14)) + S(cyl(x + 14, 46, 5, 8, 5, 14)) + S(cyl(x - 14, 124, 5, 8, 5, 14)) + S(cyl(x + 14, 124, 5, 8, 5, 14)));
  return named("Yard gantry crane", s);
}

function routes() {
  let s = "";
  for (const y of LANES) s += line3([[-290, y, 9], [300, y, 9]], "bt-route");
  for (const x of CRANES) s += line3([[x, -136, 142], [x, 12, 142]], "bt-route");
  return `<g class="bt-routes">${s}</g>`;
}

function runways() {
  let s = "";
  for (const x of RTG) for (const y of [46, 124]) s += Ln(k.pathOf([[x - 17, y, 9], [x + 17, y, 9]].map(at)), { tone: "lo" });
  return s;
}

function staticCranes() {
  let s = "";
  CRANES.forEach((x, i) => {
    const ty = [-72, -8, 4][i], hz = [72, 102, 40][i];
    s += '<g class="bt-crane">';
    s += MAT("yellow", slab(x - 10, ty - 7, 20, 14, 136, 5, 1, 0.3));
    s += line3([[x - 5, ty, 136], [x - 5, ty, hz + 6]], "bt-cable") + line3([[x + 5, ty, 136], [x + 5, ty, hz + 6]], "bt-cable");
    s += MAT("orange", slab(x - 8, ty - 6, 16, 12, hz, 4, 1, 0.3));
    s += MAT(COLOURS[i], slab(x - 6, ty - 4.5, 12, 9, hz - 9, 8, 0.5, 0.25));
    s += '</g>';
  });
  return s;
}

function staticAgvs() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const x = -248 + i * 86, y = LANES[i % 3];
    s += '<g class="bt-agv">';
    s += MAT("blue", slab(x - 11, y - 6, 22, 12, 9, 4, 1, 0.3) + slab(x - 11, y - 6, 7, 12, 13, 7, 0.6, 0.25));
    s += MAT("yellow", slab(x + 5, y - 5, 5, 10, 13, 5, 0.4, 0.2));
    s += MAT(COLOURS[(i + 2) % COLOURS.length], slab(x - 8, y - 4.5, 13, 9, 13, 7.4, 0.4, 0.2));
    s += '</g>';
  }
  return s;
}

function staticRtgs() {
  let s = "";
  RTG.forEach((x, i) => {
    const ty = 86;
    s += '<g class="bt-yard">';
    s += MAT("yellow", slab(x - 9, ty - 5, 18, 10, 97, 4, 1, 0.3));
    s += line3([[x - 4, ty, 97], [x - 4, ty, 54]], "bt-cable") + line3([[x + 4, ty, 97], [x + 4, ty, 54]], "bt-cable");
    s += MAT("darksteel", slab(x - 7, ty - 5, 14, 10, 50, 3, 0.8, 0.2));
    s += MAT(COLOURS[(i + 3) % COLOURS.length], slab(x - 6, ty - 4, 12, 8, 42, 7.4, 0.4, 0.2));
    s += '</g>';
  });
  return s;
}

function staticTrucks() {
  let s = "";
  for (const [y, col] of [[26, "green"], [82, "white"]]) {
    s += MAT(col, slab(264, y - 8, 8, 16, 8, 12, 1, 0.3) + slab(264, y + 8, 8, 16, 8, 10, 1, 0.3));
    s += MAT("green", slab(265, y - 6, 6, 18, 20, 8, 0.4, 0.2));
  }
  return s;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "bt-svg",
    label: "An automated container terminal in isometric view. A container ship lies at the quay under three ship-to-shore cranes. Automated guided vehicles carry containers from the cranes to a yard of stacked containers served by rubber-tyred gantry cranes.",
    body: [
      water(),
      ship(),
      quay(),
      yard(),
      routes(),
      runways(),
      ...CRANES.map(craneFrame),
      `<g data-part="cranes">${staticCranes()}</g>`,
      `<g data-part="agvs">${staticAgvs()}</g>`,
      stacks(),
      ...RTG.map(rtgFrame),
      `<g data-part="rtgs">${staticRtgs()}</g>`,
      `<g data-part="trucks">${staticTrucks()}</g>`,
    ],
  });
  const plate = k.plateHtml({
    fig: "Fig 22", title: "Container terminal", hint: "Add cranes and AGVs",
    readout: "", body: `<div class="iso-stage bt-stage" tabindex="0" role="img" aria-label="Container terminal">${svg}</div>`,
  });

  const css = `
.bt-brace{stroke:#d78a24;stroke-width:1.3;fill:none;opacity:.8}
.bt-cable{stroke:#262c35;stroke-width:1.1;fill:none}
.bt-ripple{fill:#eaf6ff}
.bt-route{stroke:#2f9ad8;stroke-width:1.4;stroke-dasharray:4 6;fill:none;opacity:.65}
body[data-mode="operations"] .bt-routes{display:none}
.bt-wheel{fill:#1c222c}
.bt-yellow .iso-fill,.bt-yellow .iso-shade,.bt-yellow .iso-top{fill:#f2c230!important}
.bt-red .iso-fill,.bt-red .iso-shade,.bt-red .iso-top{fill:#d8402c!important}
.bt-blue .iso-fill,.bt-blue .iso-shade,.bt-blue .iso-top{fill:#2f6fd6!important}
.bt-green .iso-fill,.bt-green .iso-shade,.bt-green .iso-top{fill:#3aa36b!important}
.bt-orange .iso-fill,.bt-orange .iso-shade,.bt-orange .iso-top{fill:#f07a2a!important}
.bt-white .iso-fill,.bt-white .iso-shade,.bt-white .iso-top{fill:#e9edf2!important}
.bt-teal .iso-fill,.bt-teal .iso-shade,.bt-teal .iso-top{fill:#1f9aa6!important}
body[data-limit="agv"] .bt-agv{filter:drop-shadow(0 0 3px #ff9d2e)}
body[data-limit="yard"] .bt-yard{filter:drop-shadow(0 0 3px #ff9d2e)}
body[data-limit="quay"] .bt-crane{filter:drop-shadow(0 0 3px #ff9d2e)}
${materialsCss(["water", "navy", "red", "floor", "castalu", "darksteel", "orange", "yellow", "white", "glass", "blue", "green", "teal"])}
`;

  const live = `
const state = initialState();
const SS = (p) => (typeof p === "string" ? p : S(p));
const craneEl = part("cranes"), agvEl = part("agvs"), rtgEl = part("rtgs"), truckEl = part("trucks"), rippleEl = part("ripples"), shipEl = part("ship");
const colours = ["red", "blue", "green", "orange", "white", "teal", "yellow"];
const agvs = Array.from({ length: 12 }, (_, i) => ({ lane: i % 3, x: -280 + i * 46, dir: i % 2 ? -1 : 1, load: i % 3 !== 0, col: colours[i % colours.length] }));
const trucks = Array.from({ length: 3 }, (_, i) => ({ x: 268 + i * 10, y: 18 + i * 36, dir: i % 2 ? -1 : 1 }));
const ripples = Array.from({ length: 44 }, () => ({ x: -300 + Math.random() * 610, y: -170 + Math.random() * 138, f: Math.random(), s: 0.5 + Math.random() }));
let mode = Lab.mode, lastPaint = 0, lastGauge = 0;
Lab.onMode((m) => { mode = m; });
Lab.onAction((a) => { if (a === "reset") { Object.assign(state, initialState()); Lab.set("workload", 1800); } });
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function craneSvg(now, rate) {
  let s = "";
  const shipY = -108, landY = 10;
  C.CRANES.forEach((x, i) => {
    const f = (now * (0.035 + 0.055 * rate) + i * 0.34) % 1;
    let ty, hz;
    if (f < 0.18) { ty = shipY; hz = mix(88, 34, ease(f / 0.18)); }
    else if (f < 0.28) { ty = shipY; hz = mix(34, 104, ease((f - 0.18) / 0.1)); }
    else if (f < 0.5) { ty = mix(shipY, landY, ease((f - 0.28) / 0.22)); hz = 104; }
    else if (f < 0.62) { ty = landY; hz = mix(104, 30, ease((f - 0.5) / 0.12)); }
    else if (f < 0.72) { ty = landY; hz = mix(30, 104, ease((f - 0.62) / 0.1)); }
    else { ty = mix(landY, shipY, ease((f - 0.72) / 0.28)); hz = 104; }
    const carrying = f < 0.62;
    const col = colours[(i + Math.floor(now / 8)) % colours.length];
    s += '<g class="bt-crane">';
    s += MAT("yellow", SS(slab(x - 10, ty - 7, 20, 14, 136, 5, 1, 0.3)));
    s += line3([[x - 5, ty, 136], [x - 5, ty, hz + 6]], "bt-cable") + line3([[x + 5, ty, 136], [x + 5, ty, hz + 6]], "bt-cable");
    s += MAT("orange", SS(slab(x - 8, ty - 6, 16, 12, hz, 4, 1, 0.3)));
    if (carrying) s += MAT(col, SS(slab(x - 6, ty - 4.5, 12, 9, hz - 9, 8, 0.5, 0.25)));
    s += "</g>";
  });
  return s;
}
function agvSvg(dt, rate) {
  const active = Math.round(Lab.value("agvs"));
  let s = "";
  for (let i = 0; i < active; i++) {
    const v = agvs[i];
    v.x += v.dir * dt * (11 + 34 * rate);
    if (v.x > 288) { v.x = 288; v.dir = -1; v.load = !v.load; }
    if (v.x < -292) { v.x = -292; v.dir = 1; v.load = !v.load; }
    const y = C.LANES[v.lane];
    s += '<g class="bt-agv" data-name="AGV">';
    s += MAT("blue", SS(slab(v.x - 11, y - 6, 22, 12, 9, 4, 1, 0.3)) + SS(slab(v.x - 11, y - 6, 7, 12, 13, 7, 0.6, 0.25)));
    s += MAT("yellow", SS(slab(v.x + 5, y - 5, 5, 10, 13, 5, 0.4, 0.2)));
    if (v.load) s += MAT(v.col, SS(slab(v.x - 8, y - 4.5, 13, 9, 13, 7.4, 0.4, 0.2)));
    s += "</g>";
  }
  return s;
}
function rtgSvg(now, rate) {
  let s = "";
  C.RTG.forEach((x, i) => {
    const f = (now * (0.035 + 0.05 * rate) + i * 0.45) % 1;
    const ty = mix(54, 118, 0.5 - 0.5 * Math.cos(f * TAU));
    const hz = f < 0.35 ? mix(82, 30, f / 0.35) : f < 0.65 ? 30 : mix(30, 82, (f - 0.65) / 0.35);
    s += '<g class="bt-yard">';
    s += MAT("yellow", SS(slab(x - 9, ty - 5, 18, 10, 97, 4, 1, 0.3)));
    s += line3([[x - 4, ty, 97], [x - 4, ty, hz + 5]], "bt-cable") + line3([[x + 4, ty, 97], [x + 4, ty, hz + 5]], "bt-cable");
    s += MAT("darksteel", SS(slab(x - 7, ty - 5, 14, 10, hz, 3, 0.8, 0.2)));
    if (f > 0.2 && f < 0.7) s += MAT(colours[(i + 3) % colours.length], SS(slab(x - 6, ty - 4, 12, 8, hz - 8, 7.4, 0.4, 0.2)));
    s += "</g>";
  });
  return s;
}
function truckSvg(dt, rate) {
  let s = "";
  for (const t of trucks) {
    t.y += t.dir * dt * (9 + 16 * rate);
    if (t.y > 128) { t.y = 128; t.dir = -1; }
    if (t.y < 12) { t.y = 12; t.dir = 1; }
    s += MAT("white", SS(slab(t.x - 4, t.y - 8, 8, 16, 8, 12, 1, 0.3)) + SS(slab(t.x - 4, t.y + 8, 8, 16, 8, 10, 1, 0.3)));
    s += MAT("green", SS(slab(t.x - 3, t.y - 6, 6, 18, 20, 8, 0.4, 0.2)));
  }
  return s;
}
function rippleSvg(dt) {
  let s = "";
  for (const r of ripples) {
    r.f += dt * 0.08 * r.s;
    if (r.f > 1) { r.f = 0; r.x = -300 + Math.random() * 610; r.y = -170 + Math.random() * 138; }
    s += dot([r.x + r.f * 8, r.y, -2], 0.8, "bt-ripple", "opacity:" + ((1 - r.f) * 0.5).toFixed(2));
  }
  return s;
}
const cv = document.querySelector(".bt-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const vals = [["Quay", o.craneCap, "#e08a2c"], ["AGV", o.agvCap, "#3f8fd0"], ["Yard", o.yardCap, "#8a7bd8"], ["Actual", o.throughput, "#3fae72"]];
  const max = Math.max(140, ...vals.map((v) => v[1])) * 1.15;
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), strong = cs.getPropertyValue("--anatomy-strong"), rule = cs.getPropertyValue("--lab-rule");
  const bw = (w - 30) / vals.length;
  ctx.font = "600 19px ui-monospace,monospace"; ctx.textAlign = "center";
  vals.forEach(([label, v, col], i) => {
    const bh = (v / max) * (h - 48), x = 15 + i * bw + bw * 0.18, y = h - 30 - bh;
    ctx.fillStyle = col; ctx.fillRect(x, y, bw * 0.64, bh);
    ctx.fillStyle = strong; ctx.fillText(Math.round(v), x + bw * 0.32, y - 7);
    ctx.fillStyle = muted; ctx.font = "500 15px ui-monospace,monospace"; ctx.fillText(label, x + bw * 0.32, h - 8); ctx.font = "600 19px ui-monospace,monospace";
  });
  ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(8, h - 30); ctx.lineTo(w - 8, h - 30); ctx.stroke();
}
function frame(dt, now) {
  const u = { cranes: Lab.value("cranes"), agvs: Lab.value("agvs"), yard: Lab.value("yard"), workload: Lab.value("workload") };
  const sim = Math.min(dt * SIM_SPEED, 30);
  step(state, u, sim);
  const o = outputs(state);
  const rate = clamp(o.throughput / Math.max(20, o.craneCap), 0, 1);
  if (now - lastPaint > 0.045) {
    lastPaint = now;
    setHtml(craneEl, craneSvg(now, rate));
    setHtml(agvEl, agvSvg(dt, rate));
    setHtml(rtgEl, rtgSvg(now, rate));
    setHtml(truckEl, truckSvg(dt, rate));
    setHtml(rippleEl, rippleSvg(dt));
    if (shipEl) shipEl.setAttribute("transform", "translate(0 " + (Math.sin(now * 0.7) * 1.2).toFixed(2) + ")");
  }
  if (now - lastGauge > 0.22) {
    lastGauge = now;
    Lab.gauge("moves", Math.round(o.throughput) + " /h", o.throughput < 30);
    Lab.gauge("quay", Math.round(o.craneCap) + " /h");
    Lab.gauge("wait", Math.round(o.agvWait) + " s", o.agvWait > 90);
    Lab.gauge("yardfill", Math.round(o.yardUse * 100) + " %", o.yardUse > 0.88);
    Lab.gauge("berth", o.complete ? "done" : o.berth.toFixed(1) + " h", o.berth > 30);
    Lab.gauge("moved", Math.round(o.moved).toLocaleString("en-US") + " TEU");
    readout(o.complete ? "Vessel complete · " + Math.round(state.time / 3600) + " h shift" : Math.round(o.moved).toLocaleString("en-US") + " / " + state.workload.toLocaleString("en-US") + " TEU · " + o.limit + " limit");
    document.body.dataset.limit = o.limit;
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { CRANES, RTG, LANES }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Throughput vs capacity</span><em>containers per hour</em></div><canvas class="bt-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
