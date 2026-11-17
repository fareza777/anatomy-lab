// Fridge-freezer seen from behind and to one side, with the side panel cut away. Inside: shelves
// of food, the freezer with its evaporator coil and fan. Outside on the back: the black condenser
// grid and, at the bottom, the compressor. Refrigerant runs round the loop whenever the
// thermostat switches the compressor on.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 480;
export const HEIGHT = 540;

const BOX = { x0: -56, x1: 56, y0: -40, y1: 40, h: 300 };
const WALL = 7;
const DIV = 198; // freezer floor
const MACH = { y0: -40, h: 48, x0: -56 }; // machine bay at the bottom back

const P = k.fitProjection([[BOX.x0, BOX.y0 - 14, 0], [BOX.x1, BOX.y0 - 14, 0], [BOX.x0, BOX.y1, 0], [BOX.x1, BOX.y1, 0], [BOX.x0, BOX.y0 - 14, BOX.h], [BOX.x1, BOX.y1, BOX.h], [BOX.x1, BOX.y0 - 14, BOX.h]], WIDTH, HEIGHT, { pad: 22, azimuth: -28, elevation: 20 });
const H = helpers(P);
const { MAT, S, slab, cyl, named, tube, Zf } = H;

// the refrigerant loop as one polyline, with the index where each section starts
function loop() {
  const pts = [];
  const mark = {};
  mark.discharge = 0;
  pts.push([8, -50, 30], [8, -50, 54], [40, -49, 286]);
  mark.condenser = pts.length - 1;
  for (let i = 0, z = 286; z >= 64; z -= 24, i++) { pts.push([i % 2 ? 40 : -40, -49, z]); pts.push([i % 2 ? -40 : 40, -49, z]); }
  mark.capillary = pts.length - 1;
  pts.push([-46, -50, 52], [-50, -44, 60], [-50, -36, 206], [-47, -26, 286]);
  mark.evaporator = pts.length - 1;
  for (let i = 0, z = 286; z >= 214; z -= 12, i++) { pts.push([-47, i % 2 ? 26 : -26, z]); pts.push([-47, i % 2 ? -26 : 26, z]); }
  mark.suction = pts.length - 1;
  pts.push([-49, -42, 205], [-44, -51, 60], [-12, -51, 30]);
  return { pts, mark };
}
const LOOP = loop();

function cabinet() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: BOX.x0, y: BOX.y0 - 12, w: BOX.x1 - BOX.x0, d: BOX.y1 - BOX.y0 + 12, r: 4 }, 0, 6, P)}"/>`;
  // far shells first: the door (front), the far side, top, bottom, divider
  let w = slab(BOX.x0, BOX.y1 - WALL, BOX.x1 - BOX.x0, WALL, 0, BOX.h, 2, 0.5);
  w += slab(BOX.x0, BOX.y0, WALL, BOX.y1 - BOX.y0, 0, BOX.h, 2, 0.5);
  w += slab(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0, BOX.h - WALL, WALL, 2, 0.5);
  w += slab(BOX.x0, BOX.y0 + MACH.h * 0 + 0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0, 0, 18, 2, 0.5);
  s += named("Cabinet", MAT("white", w));
  // the inner liner on the far wall, so the inside reads as a bright white box
  const xi = BOX.x0 + WALL + 0.3;
  s += named("Inner liner", H.poly([[xi, BOX.y0 + WALL, 18], [xi, BOX.y1 - WALL, 18], [xi, BOX.y1 - WALL, BOX.h - WALL], [xi, BOX.y0 + WALL, BOX.h - WALL]], "fr-liner"));
  s += named("Insulation foam", MAT("yellow", slab(BOX.x0 + 1, BOX.y0 + 1, BOX.x1 - BOX.x0 - 2, BOX.y1 - BOX.y0 - 2, DIV, 10, 1, 0)));
  s += named("Door seal", MAT("rubber", slab(BOX.x0 + 4, BOX.y1 - WALL - 2, BOX.x1 - BOX.x0 - 8, 2, 20, BOX.h - 30, 1, 0)));
  return s;
}

function food() {
  const items = [];
  const add = (x, y, svg) => items.push({ d: k.depthOf([x, y, 0], P), svg });
  // glass shelves
  for (const z of [72, 132]) add(0, 0, named("Glass shelf", MAT("glass", slab(BOX.x0 + WALL, BOX.y0 + WALL, BOX.x1 - BOX.x0 - WALL, BOX.y1 - BOX.y0 - 2 * WALL, z, 2, 0.5, 0), ' class="fr-glass"')));
  add(-10, 10, named("Crisper drawer", MAT("glass", slab(-46, -30, 92, 60, 18, 36, 3, 0.3), ' class="fr-glass"') + MAT("leaf", [-30, -12, 8, 26].map((x, i) => S(G.sphereOf([x, (i % 2) * 14 - 8, 30], 8, P))).join(""))));
  add(-30, 20, named("Milk", MAT("white", slab(-40, 10, 16, 16, 74, 44, 1, 0.3)) + MAT("blue", slab(-40, 10, 16, 16, 106, 6, 1, 0))));
  add(-6, -16, named("Juice", MAT("orange", S(G.solidOf([[74, 6], [104, 6], [110, 3], [116, 3]], Zf([-6, -16, 0]), P)))));
  add(20, 8, named("Fruit bowl", MAT("red", [[14, 2], [24, 8], [18, 14]].map(([x, y]) => S(G.sphereOf([x, y, 82], 6.5, P))).join(""))));
  add(-20, -10, named("Eggs", MAT("cream", [0, 1, 2, 3].map((i) => S(G.sphereOf([-30 + i * 8, -12, 138], 3.4, P))).join(""))));
  add(20, 10, named("Cheese", MAT("yellow", slab(10, 2, 26, 16, 134, 10, 1, 0.3))));
  add(0, 0, named("Freezer drawer", MAT("glass", slab(-40, -24, 80, 48, DIV + 10, 28, 2, 0.3), ' class="fr-glass"') + MAT("ice", [0, 1, 2, 3, 4].map((i) => slab(-30 + i * 12, -10, 9, 9, DIV + 14, 7, 1, 0.2)).join("")) + MAT("pink", S(G.disc(DIV + 14, DIV + 32, 10, Zf([20, 10, 0]), P)))));
  return items;
}

function machinery() {
  let s = named("Compressor", MAT("carbon", S(G.solidOf([[0, 15], [16, 16], [30, 13], [38, 4]], Zf([-4, -54, 0]), P))) + MAT("rubber", slab(-24, -66, 40, 24, 0, 3, 1, 0)));
  s += named("Filter-drier", MAT("copper", S(G.disc(-46, -36, 3, G.frameOf([0, -52, 50], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P))));
  return s;
}

const LIVE = `
const PATH = C.LOOP.pts, M = C.LOOP.mark;
let segLen = [], total = 0;
for (let i = 1; i < PATH.length; i++) { const l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1], PATH[i][2] - PATH[i - 1][2]); segLen.push(l); total += l; }
const cum = [0]; segLen.forEach((l) => cum.push(cum[cum.length - 1] + l));
const at01 = (i) => cum[i] / total;
// colour of the refrigerant along the loop: hot gas, condensing, warm liquid, cold mix, cold vapour
function stateAt(f) {
  if (f < at01(M.condenser)) return ["#e5484d", "Hot gas"];
  if (f < at01(M.capillary)) return [ramp([[0, 229, 72, 77], [1, 245, 166, 35]], (f - at01(M.condenser)) / (at01(M.capillary) - at01(M.condenser))), "Condensing"];
  if (f < at01(M.evaporator)) return ["#7cc4f2", "Expanding"];
  if (f < at01(M.suction)) return ["#2f6fd6", "Boiling"];
  return ["#5fb6ee", "Cool vapour"];
}
let st = start(Lab.value("room")), trace = [], flow = 0, frost = 0;
function frame(dt, now) {
  const set = Lab.value("set"), room = Lab.value("room"), door = Lab.value("door");
  const warp = 90; // 1.5 minutes of fridge time per second
  for (let i = 0; i < 6; i++) st = step(st, (dt * warp) / 6, set, room, door);
  if (!trace.length || st.time - trace[trace.length - 1][0] > 20) { trace.push([st.time, st.T, st.on]); if (trace.length > 160) trace.shift(); }
  if (st.on && !Lab.reduced.matches) flow += dt * 0.05;
  frost = clamp(frost + dt * (st.on ? 0.004 : -0.002) + (door ? dt * 0.003 : 0), 0, 1);
  let d = "";
  for (let i = 0; i < 70; i++) { const f = (flow + i / 70) % 1; const [col] = stateAt(f); d += dot(along(PATH, f), 1.6, "fr-ref", "fill:" + col); }
  setHtml(part("ref"), d);
  // freezer fan and cold air falling into the fridge while the compressor runs
  const fanF = G.frameOf([-30, 30, 244], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
  let air = MAT("darksteel", S(G.disc(0, 3, 9, fanF, P))) + lineSvg(G.spokesOf(fanF, 3.2, 1, 8.6, 5, P, { phase: st.on ? now * 18 : 0 }), { tone: "hi" });
  if (st.on) for (let i = 0; i < 16; i++) { const f = (now * 0.3 + i / 16) % 1; air += dot([mix(-40, 40, (i * 0.37) % 1), mix(-20, 24, (i * 0.61) % 1), mix(C.DIV - 4, 30, f)], 1.3, "fr-cold", "opacity:" + (0.7 * (1 - f)).toFixed(2)); }
  if (door) for (let i = 0; i < 12; i++) { const f = (now * 0.4 + i / 12) % 1; air += dot([mix(-46, 46, (i * 0.53) % 1), mix(30, 10, f), mix(180, 40, (i * 0.29) % 1)], 1.5, "fr-warm", "opacity:" + (0.7 * (1 - f)).toFixed(2)); }
  setHtml(part("air"), air);
  part("frost").style.opacity = (0.15 + frost * 0.7).toFixed(2);
  part("glowc").style.opacity = st.on ? 1 : 0;
  const duty = st.time > 0 ? st.runTime / st.time : 0;
  const kwh = st.time > 0 ? (st.energy / st.time) * 86400 / 3.6e6 : 0;
  Lab.gauge("temp", st.T.toFixed(1) + " °C", st.T > 8);
  Lab.gauge("comp", st.on ? "Running" : "Off", st.on);
  Lab.gauge("duty", Math.round(duty * 100) + " %");
  Lab.gauge("cop", cop(st.T, room).toFixed(2));
  Lab.gauge("power", Math.round(st.power) + " W");
  Lab.gauge("kwh", kwh.toFixed(2) + " kWh/day");
  readout("Freezer ≈ " + Math.round(st.T - 22) + " °C · room " + room + " °C");
  if (Math.floor(now * 4) !== frame.k) { frame.k = Math.floor(now * 4); drawTrace(set); }
}
const cv = document.querySelector(".fr-trace");
function drawTrace(set) {
  if (!cv || !cv.clientWidth || trace.length < 2) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), rule = cs.getPropertyValue("--lab-rule"), acc = cs.getPropertyValue("--lab-accent");
  const t0 = trace[0][0], t1 = trace[trace.length - 1][0];
  const px = (t) => 46 + ((t - t0) / Math.max(1, t1 - t0)) * (w - 56), py = (T) => h - 26 - ((T + 1) / 12) * (h - 40);
  ctx.fillStyle = "rgba(47,111,214,.12)";
  trace.forEach(([t, , on], i) => { if (on && i) ctx.fillRect(px(trace[i - 1][0]), 6, px(t) - px(trace[i - 1][0]), h - 32); });
  ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = "500 18px ui-monospace,monospace";
  for (const T of [0, 4, 8]) { ctx.beginPath(); ctx.moveTo(46, py(T)); ctx.lineTo(w - 8, py(T)); ctx.stroke(); ctx.fillText(T + "°", 4, py(T) + 6); }
  ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(46, py(set)); ctx.lineTo(w - 8, py(set)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath(); trace.forEach(([t, T], i) => (i ? ctx.lineTo(px(t), py(T)) : ctx.moveTo(px(t), py(T)))); ctx.stroke();
  ctx.fillText("blue = compressor running", w - 290, h - 4);
}
Lab.onChange((id) => { if (id === "room") { st = { ...st }; } });
Lab.onStep((i, s, user) => { if (user) { for (const key of ["set", "room", "door"]) if (s[key] !== undefined) Lab.set(key, s[key]); } });
loop(frame);
`;

export function figure(theme) {
  const C = { LOOP, DIV };
  const items = food().sort((a, b) => a.d - b.d).map((i) => i.svg).join("");
  const condenser = named("Condenser coil", MAT("carbon", tube(LOOP.pts.slice(LOOP.mark.condenser, LOOP.mark.capillary + 1), 1.8, { bend: 6 })) + Array.from({ length: 14 }, (_, i) => H.line3([[-40 + i * 6.15, -50.5, 64], [-40 + i * 6.15, -50.5, 286]], "fr-wire")).join(""));
  const evap = named("Evaporator coil", MAT("stainless", tube(LOOP.pts.slice(LOOP.mark.evaporator, LOOP.mark.suction + 1), 1.8, { bend: 4 })) + `<g data-part="frost" class="fr-frost">${MAT("ice", slab(-50, -28, 4, 56, 210, 80, 1, 0))}</g>`);
  const lines = named("Refrigerant lines", MAT("copper", tube(LOOP.pts.slice(0, LOOP.mark.condenser + 1), 1.6, { bend: 6 }) + tube(LOOP.pts.slice(LOOP.mark.capillary, LOOP.mark.evaporator + 1), 0.8, { bend: 6 }) + tube(LOOP.pts.slice(LOOP.mark.suction), 1.6, { bend: 6 })));
  const back = named("Back panel", MAT("white", slab(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, WALL, MACH.h, BOX.h - MACH.h, 2, 0.5)));
  const cut = named("Insulation foam", MAT("yellow", [[BOX.x1 - 2, BOX.y0, 0, BOX.h, WALL], [BOX.x1 - 2, BOX.y1 - WALL, 0, BOX.h, WALL]].map(([x, y, z, h, d]) => slab(x, y, 2, d, z, h, 0.3, 0)).join("") + slab(BOX.x1 - 2, BOX.y0, 2, BOX.y1 - BOX.y0, BOX.h - WALL, WALL, 0.3, 0) + slab(BOX.x1 - 2, BOX.y0, 2, BOX.y1 - BOX.y0, DIV, 10, 0.3, 0)));
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "fr-svg",
    label: "A fridge-freezer seen from behind and to one side with its side panel removed. Inside are glass shelves with milk, juice, fruit, eggs and cheese, a vegetable drawer and, in the freezer at the top, a frosted evaporator coil and fan. On the back is a black condenser grid and at the bottom a black compressor. Dots of refrigerant flow round the loop, red when hot and blue when cold.",
    body: [cabinet(), evap, items, `<g data-part="air" data-name="Cold air"></g>`, back, condenser, machinery(), lines, `<g data-part="ref" data-name="Refrigerant"></g>`, `<g data-part="glowc" class="fr-hum" data-name="Compressor">${H.ellipse3([-4, -54, 22], 26, 12, "fr-hum-ring")}</g>`, cut],
  });
  const plate = k.plateHtml({ fig: "Fig 19", title: "Fridge-freezer", hint: "Open the door · heat the room", readout: "", body: `<div class="iso-stage fr-stage" tabindex="0" role="img" aria-label="Refrigerator">${svg}</div>` });
  const css = `
.fr-glass{opacity:.45}
.fr-liner{fill:#e9eef3}
body[data-theme="dark"] .fr-liner{fill:#5b6675}
.fr-wire{stroke:#22252b;stroke-width:.5;opacity:.8}
.fr-ref{stroke:#00000033;stroke-width:.3}
.fr-cold{fill:#9fd8ff}
.fr-warm{fill:#ffb36b}
.fr-frost{transition:opacity .6s}
.fr-hum{transition:opacity .4s}
.fr-hum-ring{fill:none;stroke:#7cc4f2;stroke-width:1.2;stroke-dasharray:3 4;animation:fr-hum .35s linear infinite}
@keyframes fr-hum{to{stroke-dashoffset:-7}}
${materialsCss(["white", "yellow", "rubber", "glass", "leaf", "blue", "orange", "red", "cream", "ice", "pink", "carbon", "copper", "stainless", "darksteel"])}
`;
  return {
    plate, css, script: pageScript(P, C, modelSource + LIVE),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Fridge temperature</span><em>the thermostat's sawtooth</em></div><canvas class="fr-trace" style="width:100%;height:130px;display:block"></canvas></div>`,
  };
}
