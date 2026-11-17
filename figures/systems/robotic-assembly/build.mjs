// Robotic assembly line: an indexing conveyor through five cells, articulated spot-welding robots,
// a paint booth and a final wheel station. Every arm, spark, spray particle and conveyor slat moves.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 720;
export const HEIGHT = 480;

const STATIONS = [-230, -110, 10, 130, 250];
const COLORS = ["red", "blue", "white", "teal", "yellow", "orange"];
const ROBOTS = [
  [-230, -64], [-230, 64],
  [-110, -64], [-110, 64],
  [10, -64], [10, 64],
  [250, -64], [250, 64],
];

const P = k.fitProjection([
  [-325, -130, 0], [325, 130, 0], [325, -130, 0], [-325, 130, 0],
  [-230, -64, 105], [130, 70, 95], [250, 64, 60],
], WIDTH, HEIGHT, { pad: 16, azimuth: 58, elevation: 24 });

const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, Yf, halo } = H;

function floor() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -320, y: -125, w: 640, d: 250, r: 14 }, -8, 12, P)}"/>`;
  s += named("Factory floor", MAT("floor", S(k.slabOf({ x: -320, y: -125, w: 640, d: 250, r: 14 }, -8, 8, P, 8, 1))));
  s += Ln(k.pathOf([[-305, 0, 1], [305, 0, 1]].map(at)), { tone: "lo", dashed: true });
  for (const x of STATIONS) {
    s += Ln(k.pathOf([[x - 44, -100, 1], [x - 44, 100, 1]].map(at)), { tone: "lo", dashed: true });
    s += Ln(k.pathOf([[x + 44, -100, 1], [x + 44, 100, 1]].map(at)), { tone: "lo", dashed: true });
  }
  return s;
}

function conveyor() {
  let s = `<g data-part="slats">`;
  for (let x = -306; x <= 306; x += 14) s += line3([[x, -25, 12.4], [x, 25, 12.4]], "ra-slat");
  s += `</g>`;
  s += named("Conveyor", MAT("darksteel", slab(-310, -27, 620, 54, 4, 8, 2, 0.4)));
  s += MAT("steel", slab(-310, -27, 620, 4, 12, 2, 1, 0.2) + slab(-310, 23, 620, 4, 12, 2, 1, 0.2));
  for (const x of STATIONS) s += MAT("yellow", slab(x - 32, -31, 64, 4, 3, 2, 0.5, 0.2));
  return s;
}

function carSvg(x, y, z, col, wheels, paint = true) {
  const c = paint ? col : "castalu";
  let s = "";
  s += MAT("darksteel", slab(x - 29, y - 14, 58, 28, z, 3, 1, 0.2));
  s += MAT(c, slab(x - 34, y - 16, 62, 32, z + 3, 11, 1.5, 0.5));
  s += MAT(c, slab(x - 15, y - 15, 31, 30, z + 14, 12, 1.5, 0.5));
  s += MAT("glass", slab(x - 12, y - 15.5, 25, 2, z + 17, 8, 0.6, 0.2));
  s += MAT("glass", slab(x - 12, y + 13.5, 25, 2, z + 17, 8, 0.6, 0.2));
  s += MAT("glass", slab(x - 16.4, y - 12, 2, 24, z + 17, 8, 0.6, 0.2));
  if (wheels) {
    for (const dx of [-20, 20]) for (const dy of [-16.5, 16.5]) {
      s += MAT("rubber", S(G.disc(-3, 3, 6.4, Yf([x + dx, y + dy, z + 5]), P)));
      s += MAT("chrome", S(G.disc(-3.4, 3.4, 3, Yf([x + dx, y + dy, z + 5]), P)));
    }
  }
  return s;
}

function bodiesStatic() {
  let s = "";
  STATIONS.forEach((x, i) => {
    s += named("Car body", carSvg(x, 0, 14, COLORS[i % COLORS.length], i >= 4, i >= 3), "car");
  });
  return `<g data-part="bodies" data-name="Car body">${s}</g>`;
}

function robot(x, y, pose, i) {
  const [sx, sy, sz] = pose;
  const base = [x, y, 0], sh = [x, y, 18], el = [sx, sy + (y > 0 ? 12 : -12), sz], wr = [sx + 6, sy, 33];
  let s = `<g class="ra-robot">`;
  s += MAT("darksteel", S(k.slabOf({ x: x - 11, y: y - 11, w: 22, d: 22, r: 4 }, 0, 5, P, 4, 0.4)));
  s += MAT("orange", cyl(x, y, 9, 5, 13, 18));
  s += MAT("orange", cyl(x, y, 6, 17, 4, 14));
  s += line3([sh, el], "ra-arm");
  s += line3([sh, el], "ra-arm-hi");
  s += line3([el, wr], "ra-arm");
  s += line3([el, wr], "ra-arm-hi");
  s += MAT("steel", cyl(el[0], el[1], 4.4, el[2] - 4, 8, 12));
  s += MAT("steel", cyl(wr[0], wr[1], 3.4, wr[2] - 3, 6, 12));
  s += MAT("darksteel", slab(wr[0] - 5, wr[1] - 3, 10, 6, wr[2] - 8, 5, 0.8, 0.2));
  s += dot([wr[0], wr[1], wr[2] - 8], 1.3, "ra-spark");
  s += `</g>`;
  return s;
}

function robotsStatic() {
  let s = "";
  ROBOTS.forEach(([x, y], i) => {
    const inward = y > 0 ? -1 : 1;
    const pose = [x + (i % 2 ? -14 : 14), y + inward * 24, 44 + (i % 3) * 5];
    s += robot(x, y, pose, i);
  });
  return `<g data-part="robots" data-name="Welding robot">${s}</g>`;
}

function booth() {
  const x0 = 96, x1 = 164, y0 = -72, y1 = 72, h = 86;
  let s = "";
  for (const x of [x0, x1]) for (const y of [y0, y1]) s += MAT("white", slab(x - 3, y - 3, 6, 6, 0, h, 1, 0.3));
  s += MAT("white", slab(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, h, 6, 1, 0.3));
  s += MAT("glass", slab(x0, y0, x1 - x0, 3, 14, h - 22, 0.5, 0.2));
  s += MAT("white", slab(x0, y1 - 3, x1 - x0, 3, 14, h - 22, 0.5, 0.2));
  s += MAT("white", slab(x0 + 3, y0 + 4, 4, y1 - y0 - 8, 22, 3, 0.5, 0.2));
  s += MAT("blue", slab(x0 + 4, y0 + 6, 2, 18, 60, 14, 1, 0.2));
  s += MAT("blue", slab(x0 + 4, y1 - 24, 2, 18, 60, 14, 1, 0.2));
  s += MAT("yellow", slab(x0 - 7, y0 + 26, 5, 28, 52, 3, 0.6, 0.2));
  s += named("Paint booth", s, "booth");
  s += `<g data-part="paint"></g>`;
  return s;
}

function fence() {
  let s = "";
  for (const y of [-104, 104]) {
    for (let x = -300; x <= 300; x += 66) {
      if (y < 0 && x > 80 && x < 180) continue;
      s += MAT("yellow", slab(x - 1.4, y - 1.4, 2.8, 2.8, 0, 46, 0.6, 0.2));
    }
    for (const z of [20, 44]) s += line3([[-300, y, z], [80, y, z]], "ra-fence");
    if (y < 0) s += line3([[180, y, 20], [300, y, 20]], "ra-fence") + line3([[180, y, 44], [300, y, 44]], "ra-fence");
  }
  return named("Safety fence", s);
}

function services() {
  let s = "";
  for (const y of [-88, 88]) {
    s += MAT("steel", line3([[-300, y, 92], [300, y, 92]], "ra-pipe"));
    for (let x = -290; x <= 300; x += 74) s += MAT("steel", slab(x - 2, y - 2, 4, 4, 0, 92, 0.8, 0.2));
  }
  s += MAT("blue", line3([[-300, -88, 84], [300, -88, 84]], "ra-cable"));
  s += MAT("orange", line3([[-300, 88, 84], [300, 88, 84]], "ra-cable"));
  for (const x of [-292, -180, -60, 70, 200, 292]) {
    s += named("Control cabinet", MAT("slate", slab(x - 12, -100, 24, 14, 0, 34, 1, 0.3)));
    s += MAT("green", slab(x - 7, -100.5, 5, 1, 26, 3, 0.3, 0));
    s += MAT("red", slab(x + 1, -100.5, 5, 1, 26, 3, 0.3, 0));
  }
  return s;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "ra-svg",
    label: "An automotive body shop in isometric view. A conveyor runs through five stations with car bodies on skids. Articulated welding robots stand on both sides, a glass paint booth encloses one body, and the final station fits wheels.",
    body: [floor(), services(), fence(), conveyor(), booth(), bodiesStatic(), robotsStatic(), `<g data-part="sparks"></g>`],
  });
  const plate = k.plateHtml({
    fig: "Fig 25", title: "Robotic assembly line", hint: "Set the takt, add welders",
    readout: "", body: `<div class="iso-stage ra-stage" tabindex="0" role="img" aria-label="Robotic assembly line">${svg}</div>`,
  });

  const css = `
.ra-slat{stroke:#59636f;stroke-width:1.6}
.ra-arm{stroke:#e8762a;stroke-width:6.4;stroke-linecap:round;fill:none}
.ra-arm-hi{stroke:#ffc07a;stroke-width:1.8;stroke-linecap:round;fill:none;opacity:.9}
.ra-spark{fill:#ffd36a}
.ra-spark-hot{fill:#fff2c0}
.ra-fence{stroke:#e2b431;stroke-width:1.2;stroke-dasharray:5 4;fill:none;opacity:.7}
.ra-pipe{stroke:#8b97a6;stroke-width:2.2;fill:none}
.ra-cable{stroke-width:1.4;fill:none;opacity:.6}
.ra-cone{fill:#ffb347;opacity:.5}
.ra-robot[data-idle] .ra-arm,.ra-robot[data-idle] .ra-arm-hi{stroke:#6d7683}
body[data-mode="cells"] .ra-robot{filter:drop-shadow(0 0 3px #ff9d2e)}
body[data-bottleneck="welders"] .ra-robot{filter:drop-shadow(0 0 4px #ff6a2a)}
${materialsCss(["floor", "darksteel", "steel", "yellow", "castalu", "chrome", "rubber", "glass", "white", "blue", "green", "red", "slate", "orange", "teal"])}
`;

  const live = `
const state = initialState();
const bodiesEl = part("bodies"), robotsEl = part("robots"), sparksEl = part("sparks"), paintEl = part("paint"), slatsEl = part("slats");
const colours = ["red", "blue", "white", "teal", "yellow", "orange"];
let bodies = C.STATIONS.map((x, i) => ({ x, tx: x, col: colours[i % colours.length], painted: i >= 3, wheels: i >= 4 }));
let nextCol = 5, indexTimer = 0, lastPaint = 0, lastGauge = 0, spawnAcc = 0;
let sparks = [], spray = [], tips = [];
const wheelSpin = [];
Lab.onAction((a) => { if (a === "reset") { Object.assign(state, initialState()); Lab.set("takt", 60); Lab.set("robots", 4); Lab.set("order", 60); Lab.set("mix", false); bodies = C.STATIONS.map((x, i) => ({ x, tx: x, col: colours[i % colours.length], painted: i >= 3, wheels: i >= 4 })); indexTimer = 0; } });
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function carLive(b) {
  const z = 14, c = b.painted ? b.col : "castalu";
  let s = "";
  s += MAT("darksteel", slab(b.x - 29, -14, 58, 28, z, 3, 1, 0.2));
  s += MAT(c, slab(b.x - 34, -16, 62, 32, z + 3, 11, 1.5, 0.5));
  s += MAT(c, slab(b.x - 15, -15, 31, 30, z + 14, 12, 1.5, 0.5));
  s += MAT("glass", slab(b.x - 12, -15.5, 25, 2, z + 17, 8, 0.6, 0.2));
  s += MAT("glass", slab(b.x - 12, 13.5, 25, 2, z + 17, 8, 0.6, 0.2));
  s += MAT("glass", slab(b.x - 16.4, -12, 2, 24, z + 17, 8, 0.6, 0.2));
  if (b.wheels) {
    const spin = (b.x + performance.now() * 0.004) % TAU;
    for (const dx of [-20, 20]) for (const dy of [-16.5, 16.5]) {
      s += MAT("rubber", S(G.disc(-3, 3, 6.4, Yf([b.x + dx, 0 + dy, z + 5]), P)));
      s += MAT("chrome", S(G.disc(-3.4, 3.4, 2.6, Yf([b.x + dx, 0 + dy, z + 5]), P)));
      const cx = b.x + dx, cz = z + 5;
      s += line3([[cx, 0 + dy, cz], [cx + Math.cos(spin) * 4.6, 0 + dy, cz + Math.sin(spin) * 4.6]], "ra-spoke");
    }
  }
  return s;
}

function poseFor(i, now, active) {
  const [x, y] = C.ROBOTS[i];
  const side = y > 0 ? -1 : 1;
  if (!active) return { x: x + 2, y: y + side * 14, z: 44 };
  const wob = Math.sin(now * 1.9 + i * 1.7);
  return { x: x + 10 + wob * 9, y: y + side * 24, z: 42 + Math.cos(now * 1.4 + i) * 7 };
}

function robotsSvg(now, activeCount) {
  let s = ""; tips = [];
  for (let i = 0; i < C.ROBOTS.length; i++) {
    const [x, y] = C.ROBOTS[i];
    const active = i < activeCount;
    const p = poseFor(i, now, active);
    const side = y > 0 ? -1 : 1;
    const sh = [x, y, 18], el = [p.x, p.y + side * 12, p.z], wr = [p.x + 8, p.y, 32];
    s += '<g class="ra-robot"' + (active ? "" : " data-idle") + ">";
    s += MAT("darksteel", slab(x - 11, y - 11, 22, 22, 0, 5, 4, 0.4));
    s += MAT("orange", cyl(x, y, 9, 5, 13, 18));
    s += MAT("orange", cyl(x, y, 6, 17, 4, 14));
    s += line3([sh, el], "ra-arm") + line3([sh, el], "ra-arm-hi");
    s += line3([el, wr], "ra-arm") + line3([el, wr], "ra-arm-hi");
    s += MAT("steel", cyl(el[0], el[1], 4.2, el[2] - 4, 8, 12));
    s += MAT("steel", cyl(wr[0], wr[1], 3.2, wr[2] - 3, 6, 12));
    s += MAT("darksteel", slab(wr[0] - 5, wr[1] - 3, 10, 6, wr[2] - 8, 5, 0.8, 0.2));
    s += "</g>";
    if (active) tips.push(wr);
  }
  return s;
}

function bodiesSvg() {
  let s = "";
  for (const b of bodies) if (b.x > -345 && b.x < 345) s += carLive(b);
  return s;
}

function conveySvg(now) {
  const off = (now * 26) % 14;
  let s = "";
  for (let x = -306 + off; x <= 306; x += 14) s += line3([[x, -25, 12.4], [x, 25, 12.4]], "ra-slat");
  return s;
}

function sparkSvg(dt) {
  let s = "";
  if (tips.length) {
    spawnAcc += dt * (14 + tips.length * 10);
    while (spawnAcc > 1 && sparks.length < 90) {
      spawnAcc -= 1;
      const t = tips[(Math.random() * tips.length) | 0];
      sparks.push({ x: t[0], y: t[1], z: t[2] - 8, vx: (Math.random() - 0.5) * 26, vy: (Math.random() - 0.5) * 26, vz: 16 + Math.random() * 24, life: 0.5 + Math.random() * 0.5 });
    }
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.life -= dt; if (p.life <= 0) { sparks.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 60 * dt;
    s += dot([p.x, p.y, Math.max(1, p.z)], p.life > 0.35 ? 1.1 : 0.7, p.life > 0.35 ? "ra-spark-hot" : "ra-spark", "opacity:" + p.life.toFixed(2));
  }
  return s;
}

function paintSvg(dt) {
  const inBooth = bodies.find((b) => Math.abs(b.x - 130) < 45);
  const col = inBooth ? inBooth.col : "blue";
  if (inBooth) for (let i = 0; i < 3; i++) spray.push({ x: 104 + Math.random() * 52, y: -46 + Math.random() * 92, z: 66 + Math.random() * 12, life: 0.7 + Math.random() * 0.5 });
  let s = "";
  for (let i = spray.length - 1; i >= 0; i--) {
    const p = spray[i];
    p.life -= dt; p.z -= dt * 26;
    if (p.life <= 0) { spray.splice(i, 1); continue; }
    s += dot([p.x, p.y, p.z], 1.5, "ra-cone", "fill:" + ({ red: "#e0584a", blue: "#5b8ee0", white: "#eef2f8", teal: "#4bc2cc", yellow: "#f2cf58", orange: "#f2954a", castalu: "#b8bec6" }[col] || "#8fc") + ";opacity:" + (p.life * 0.55).toFixed(2));
  }
  return s;
}

const cv = document.querySelector(".ra-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const vals = [["Weld cell", 3600 / Math.max(1, o.weldTime), "#e08a2c"], ["Conveyor", 3600 / o.taktActual, "#3f8fd0"], ["Output", o.throughput, "#3fae72"]];
  const max = Math.max(75, ...vals.map((v) => v[1])) * 1.15;
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
  const u = { takt: Lab.value("takt"), robots: Lab.value("robots"), order: Lab.value("order"), mix: Lab.value("mix") };
  const sim = Math.min(dt * SIM_SPEED, 12);
  step(state, u, sim);
  const o = outputs(state);
  indexTimer += sim;
  if (indexTimer >= o.taktActual) {
    indexTimer -= o.taktActual;
    for (const b of bodies) { b.tx += 120; if (b.tx >= 250) b.wheels = true; if (b.tx >= 130) b.painted = true; }
    bodies = bodies.filter((b) => b.tx < 340);
    while (bodies.length < 5) {
      bodies.push({ x: -370, tx: C.STATIONS[0], col: colours[nextCol++ % colours.length], painted: false, wheels: false });
    }
  }
  for (const b of bodies) {
    const d = b.tx - b.x;
    b.x += d * Math.min(1, dt * 3.4);
    if (Math.abs(d) < 0.15) b.x = b.tx;
  }
  const active = Math.round(u.robots);
  if (now - lastPaint > 0.05) {
    lastPaint = now;
    setHtml(bodiesEl, bodiesSvg());
    setHtml(robotsEl, robotsSvg(now, active));
    setHtml(sparksEl, sparkSvg(dt));
    setHtml(paintEl, paintSvg(dt));
    setHtml(slatsEl, conveySvg(now));
  }
  if (now - lastGauge > 0.2) {
    lastGauge = now;
    Lab.gauge("output", Math.round(o.throughput) + " /h", o.throughput < 30);
    Lab.gauge("takt", o.taktActual.toFixed(0) + " s", o.bottleneck === "welders");
    Lab.gauge("weld", o.weldTime.toFixed(0) + " s", o.weldTime > o.taktActual - 0.5);
    Lab.gauge("util", Math.round(o.util * 100) + " %", o.util > 0.95);
    Lab.gauge("built", Math.round(o.built) + " / " + o.order);
    Lab.gauge("quality", o.quality.toFixed(1) + " %", o.quality < 98.8);
    readout(o.built >= o.order ? "Batch complete · " + Math.round(state.time / 60) + " min" : (o.bottleneck === "welders" ? "Welders set the pace" : "Conveyor sets the pace") + " · " + Math.round(o.built) + " / " + o.order + " bodies");
    document.body.dataset.bottleneck = o.bottleneck;
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { STATIONS, ROBOTS }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Capacity per hour</span><em>bodies per hour</em></div><canvas class="ra-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
