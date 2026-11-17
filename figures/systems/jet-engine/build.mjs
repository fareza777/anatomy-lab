// Turbofan jet engine on a display stand, with the back half of every casing cut away.
// Front to back: spinner and fan, booster (low-pressure compressor), high-pressure compressor,
// annular combustor, high- and low-pressure turbines, exhaust cone. Most of the air the fan
// moves goes round the core through the bypass duct.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 620;
export const HEIGHT = 420;

const AX = 100;
const FAN = { x: -180, r0: 14, r1: 80, n: 22 };
const ROWS = [
  ...[-152, -142, -132].map((x, i) => ({ x, r0: 20, r1: 40 - i, n: 26, kind: "lpc" })),
  ...Array.from({ length: 7 }, (_, i) => ({ x: -112 + i * 13, r0: 22 + i * 1.4, r1: 35 - i * 0.6, n: 30, kind: "hpc" })),
  ...[44, 55].map((x) => ({ x, r0: 25, r1: 38, n: 24, kind: "hpt" })),
  ...[70, 82, 94, 106].map((x, i) => ({ x, r0: 24, r1: 42 + i * 1.5, n: 24, kind: "lpt" })),
];
// casing segments: [x0, x1, inner r, outer r, station] — station picks the temperature in Temperature mode
const CASE = [[-160, -122, 41, 44, "T2"], [-122, -22, 36, 39, "T3"], [-22, 36, 40, 44, "T4"], [36, 62, 41, 45, "T4"], [62, 114, 47, 50, "T5"], [114, 160, 40, 43, "T5"]];

const P = k.fitProjection([[-215, -90, AX], [-215, 90, AX], [-215, 0, AX + 92], [175, 0, AX + 50], [175, 0, AX - 50], [-215, 0, AX - 92], [-150, 60, 0], [150, 60, 0], [0, -60, 0]], WIDTH, HEIGHT, { pad: 14, azimuth: 60, elevation: 22 });
const H = helpers(P);
const { MAT, S, Ln, slab, named, shell, Xf } = H;
const F = Xf([0, 0, AX]);
const BACK = [Math.PI / 2, (3 * Math.PI) / 2];

function stand() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -190, y: -70, w: 360, d: 140, r: 10 }, 0, 6, P)}"/>`;
  s += named("Display stand", MAT("navy", slab(-190, -60, 360, 120, 0, 10, 6, 1)) + MAT("yellow", [-120, 60].map((x) => slab(x - 6, -30, 12, 60, 10, AX - 52, 2, 0.6)).join("")));
  return s;
}

function nacelleBack() {
  const segs = [[-215, -196, 80, 88], [-196, -60, 82, 89], [-60, 0, 78, 85], [0, 30, 72, 79]];
  return named("Nacelle", MAT("white", segs.map(([a, b, r0, r1]) => shell(F, r0, r1, BACK[0], BACK[1], a, b)).join("")));
}

function nacelleRims() {
  // front edges of the cut so the outline of the full nacelle reads
  let s = "";
  for (const [x, r] of [[-215, 84], [30, 76]]) s += Ln(k.pathOf(H.circle3(F, x, r, 48).map(H.at), true), { tone: "lo" });
  s += Ln(k.pathOf(H.circle3(F, 160, 41.5, 40).map(H.at), true), { tone: "lo" });
  return named("Nacelle", s);
}

const LIVE = `
const AXF = Xf([0, 0, C.AX]);
const TEMP = [[0, 60, 110, 230], [0.15, 60, 190, 230], [0.32, 150, 210, 90], [0.5, 250, 200, 60], [0.7, 250, 120, 40], [1, 215, 35, 35]];
const BACKA = [Math.PI / 2, 3 * Math.PI / 2];
function blades(row, phase, cls) {
  const out = [];
  for (let i = 0; i < row.n; i++) {
    const a = phase + (i / row.n) * TAU, tw = row.kind === "fan" ? 0.35 : 0.22, th = row.kind === "fan" ? 6 : 2.6;
    const p = (r, ang, dx) => [row.x + dx, r * Math.cos(ang), C.AX + r * Math.sin(ang)];
    const pts = [p(row.r0, a, -th), p(row.r0, a + 0.12, th), p(row.r1, a + tw + 0.12, th), p(row.r1, a + tw, -th)];
    out.push({ y: Math.cos(a + tw / 2), svg: poly(pts, "je-blade " + cls) });
  }
  return out.sort((u, v) => u.y - v.y).map((b) => b.svg).join("");
}
function rotorRow(row, phase) {
  const cls = "je-" + row.kind;
  return '<g class="' + cls + '">' + MAT("steel", S(G.disc(row.x - 2.5, row.x + 2.5, row.r0, AXF, P), { tone: "hi", crease: "none" })) + blades(row, phase, cls) + "</g>";
}
function casing(temps, heat) {
  return C.CASE.map(([a, b, r0, r1, st]) => {
    const style = heat ? "--heat:" + ramp(TEMP, (temps[st] - 280) / 1350) : "";
    return '<g class="je-case' + (heat ? " je-hot" : "") + '" style="' + style + '">' + shell(AXF, r0, r1, BACKA[0], BACKA[1], a, b) + "</g>";
  }).join("");
}
// particles: bypass air (round the core) and core air (through it), coloured by local temperature
const N = 140;
const parts = Array.from({ length: N }, (_, i) => ({ f: Math.random(), a: Math.random() * TAU, core: i % 4 === 0, r: Math.random() }));
function coreTemp(x, c) {
  if (x < -160) return c.T2; if (x < -122) return mix(c.T2, c.T2 + (c.T3 - c.T2) * 0.25, (x + 160) / 38);
  if (x < -22) return mix(c.T2 + (c.T3 - c.T2) * 0.25, c.T3, (x + 122) / 100);
  if (x < 36) return mix(c.T3, c.T4, clamp((x + 22) / 40, 0, 1));
  if (x < 115) return mix(c.T4, c.T5, (x - 36) / 79); return c.T5;
}
function coreR(x) { return x < -122 ? 30 : x < -22 ? 28 - (x + 122) * 0.04 : x < 36 ? 32 : x < 114 ? 35 : 30 - (x - 114) * 0.2; }
let spin1 = 0, spin2 = 0, heat = false;
function frame(dt, now) {
  const thr = Lab.value("throttle") / 100, v0 = Lab.value("speed");
  const c = cycle(thr, v0);
  if (!Lab.reduced.matches) { spin1 += dt * (c.n1 / 100) * 2.2; spin2 += dt * (c.n2 / 100) * 3.4; }
  const temps = { T2: c.T2, T3: c.T3, T4: c.T4, T5: c.T5 };
  setHtml(part("casing"), MAT("steel", casing(temps, heat)));
  let rot = MAT("chrome", S(G.disc(-185, 106, 3.5, AXF, P), { tone: "hi", crease: "none" })) + MAT("steel", S(G.disc(-112, 56, 13, AXF, P), { tone: "mid", crease: "none" }));
  const fan = { x: C.FAN.x, r0: C.FAN.r0, r1: C.FAN.r1, n: C.FAN.n, kind: "fan" };
  let rows = MAT("alu", S(G.disc(C.FAN.x - 5, C.FAN.x + 5, C.FAN.r0, AXF, P))) + '<g class="je-fan">' + blades(fan, spin1, "je-fan") + "</g>";
  rows += MAT("chrome", S(G.solidOf([[-206, 1], [-196, 9], [-186, 14], [-176, 14]], AXF, P)));
  rows += rot;
  for (const row of C.ROWS) {
    if (row.x > -22 && row.x < 36) continue;
    rows += rotorRow(row, (row.kind === "lpc" || row.kind === "lpt" ? spin1 : spin2) * (row.kind === "hpc" || row.kind === "hpt" ? 1 : 1) + row.x);
    if (row.x === -132) rows += combustorSvg(0, c, now);
  }
  rows += combustorSvg(1, c, now);
  rows += MAT("heatblue", S(G.solidOf([[112, 22], [140, 16], [168, 3]], AXF, P)));
  setHtml(part("rotors"), rows);
  // air
  let air = "";
  const speed = 0.12 + 0.5 * (c.n1 / 100);
  for (const p of parts) {
    if (!Lab.reduced.matches) p.f = (p.f + dt * speed * (p.core ? 0.7 : 1)) % 1;
    let x, r, col;
    if (p.core) { x = mix(-200, 175, p.f); r = x < -165 ? mix(12, 30, (x + 200) / 35) : coreR(x) * (0.55 + 0.4 * p.r); col = ramp(TEMP, (coreTemp(x, c) - 280) / 1350); }
    else { x = mix(-205, 60, p.f); r = x < -170 ? mix(20, 72, p.r) : mix(48, 74, p.r) - Math.max(0, x) * 0.1; col = ramp(TEMP, (x < -175 ? c.T2 : c.T13) - 280 > 0 ? ((x < -175 ? c.T2 : c.T13) - 280) / 1350 : 0); }
    const y = r * Math.cos(p.a), z = C.AX + r * Math.sin(p.a);
    if (y < -6 && !p.core) continue;
    air += dot([x, y, z], p.core ? 1.5 : 1.2, "je-air", "fill:" + col);
  }
  setHtml(part("air"), air);
  Lab.gauge("n1", c.n1.toFixed(0) + " %");
  Lab.gauge("thrust", (c.thrust / 1000).toFixed(1) + " kN");
  Lab.gauge("egt", Math.round(c.T5 - 273) + " °C", c.T5 - 273 > 900);
  Lab.gauge("fuel", Math.round(c.fuel * 3600).toLocaleString("en-US") + " kg/h");
  Lab.gauge("opr", c.opr.toFixed(1) + " : 1");
  Lab.gauge("tsfc", c.tsfc.toFixed(1) + " g/kN·s");
  readout("N1 " + c.n1.toFixed(0) + " % · N2 " + c.n2.toFixed(0) + " % · " + Math.round(c.flow) + " kg/s air");
  if (Math.floor(now * 4) !== frame.k) { frame.k = Math.floor(now * 4); drawStations(c); }
}
function combustorSvg(which, c, now) {
  if (which === 0) return "";
  // liner (cut away) with the flame inside, brighter as more fuel burns
  let s = MAT("heatblue", shell(AXF, 24, 27, BACKA[0], BACKA[1], -18, 34)) + MAT("heatblue", shell(AXF, 37, 40, BACKA[0], BACKA[1], -18, 34));
  const glow = clamp((c.T4 - 700) / 900, 0.15, 1);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + Math.sin(now * 7 + i) * 0.08, r = 31 + Math.sin(now * 11 + i * 3) * 3;
    const y = r * Math.cos(a); if (y < -4) continue;
    const len = 10 + glow * 26 + Math.sin(now * 13 + i) * 4;
    s += line3([[-12, y, C.AX + r * Math.sin(a)], [-12 + len, y * 1.02, C.AX + r * 1.02 * Math.sin(a)]], "je-flame", "opacity:" + (0.35 + glow * 0.6).toFixed(2));
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; if (Math.cos(a) < -0.1) continue; s += dot([-18, 31 * Math.cos(a), C.AX + 31 * Math.sin(a)], 1.6, "je-nozzle"); }
  return '<g data-name="Combustor">' + s + "</g>";
}
const chart = document.querySelector(".je-chart");
function drawStations(c) {
  if (!chart || !chart.clientWidth) return;
  const ctx = chart.getContext("2d");
  const w = chart.width = chart.clientWidth * 2, h = chart.height = chart.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const st = [["Inlet", c.T2], ["Fan out", c.T13], ["Comp. out", c.T3], ["Turbine in", c.T4], ["Exhaust", c.T5]];
  const bw = (w - 40) / st.length;
  const muted = getComputedStyle(document.body).getPropertyValue("--anatomy-muted"), strong = getComputedStyle(document.body).getPropertyValue("--anatomy-strong");
  ctx.font = "600 20px ui-monospace,monospace"; ctx.textAlign = "center";
  st.forEach(([name, T], i) => {
    const bh = ((T - 200) / 1500) * (h - 80), x = 20 + i * bw + bw * 0.18, y = h - 40 - bh;
    ctx.fillStyle = ramp(TEMP, (T - 280) / 1350); ctx.fillRect(x, y, bw * 0.64, bh);
    ctx.fillStyle = strong; ctx.fillText(Math.round(T - 273) + "°", x + bw * 0.32, y - 8);
    ctx.fillStyle = muted; ctx.font = "500 17px ui-monospace,monospace"; ctx.fillText(name, x + bw * 0.32, h - 12); ctx.font = "600 20px ui-monospace,monospace";
  });
}
Lab.onMode((m) => { heat = m === "temp"; });
Lab.onStep((i, s, user) => { if (user) { if (s.throttle !== undefined) Lab.set("throttle", s.throttle); if (s.speed !== undefined) Lab.set("speed", s.speed); } });
loop(frame);
`;

export function figure(theme) {
  const C = { AX, FAN, ROWS, CASE };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "je-svg",
    label: "A turbofan jet engine on a display stand with the back half of its casings cut away. A large fan at the front pushes most of the air round the core through the bypass duct. Inside the core, rows of compressor blades squeeze the air, a ring-shaped combustor burns fuel in it, and turbine blades take power back out before the hot gas leaves past the exhaust cone.",
    body: [stand(), nacelleBack(), `<g data-part="casing" data-name="Core casing"></g>`, `<g data-part="rotors" data-name="Compressor and turbine blades"></g>`, `<g data-part="air" data-name="Airflow"></g>`, nacelleRims()],
  });
  const plate = k.plateHtml({ fig: "Fig 15", title: "Turbofan", hint: "Open the throttle", readout: "", body: `<div class="iso-stage je-stage" tabindex="0" role="img" aria-label="Turbofan engine">${svg}</div>` });
  const css = `
.je-blade{stroke:#00000040;stroke-width:.3}
.je-fan .je-blade{fill:#b9c3cf}
.je-lpc .je-blade{fill:#9ab0c8}
.je-hpc .je-blade{fill:#c7ccd3}
.je-hpt .je-blade{fill:#c0703a}
.je-lpt .je-blade{fill:#a27a5a}
body[data-theme="dark"] .je-fan .je-blade{fill:#8f9aa8}
.je-hot .iso-fill,.je-hot .iso-shade,.je-hot .iso-top{fill:var(--heat)!important}
.je-air{opacity:.85}
.je-flame{stroke:#ff9a2a;stroke-width:3.2;stroke-linecap:round;filter:drop-shadow(0 0 2px #ff6a00)}
.je-nozzle{fill:#5b6675}
${materialsCss(["navy", "yellow", "white", "steel", "chrome", "alu", "heatblue"])}
`;
  return {
    plate, css, script: pageScript(P, C, modelSource + LIVE),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Gas temperature through the core</span><em>°C at each station</em></div><canvas class="je-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
