// Two-stage rocket on its launch pad, cut open down the front to show the propellant tanks.
// Press Launch: the pad falls away, the sky darkens, the first stage separates and falls back,
// the fairing splits open, and the second stage pushes the payload toward orbit.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 460;
export const HEIGHT = 540;

const R = 13;
const S1 = { z0: 22, fuel: [32, 86], lox: [88, 164], top: 168, inter: [168, 190] };
const S2 = { z0: 190, fuel: [194, 212], lox: [214, 244], top: 248 };
const FAIR = { z0: 248, z1: 300 };
const PAD = { x: -110, y: -80, w: 220, d: 160 };

const P = k.fitProjection([[0, 0, 306], [PAD.x, PAD.y, 0], [PAD.x + PAD.w, PAD.y + PAD.d, 0], [PAD.x, PAD.y + PAD.d, 0], [PAD.x + PAD.w, PAD.y, 0], [-80, -40, 230]], WIDTH, HEIGHT, { pad: 18, azimuth: 62, elevation: 14 });
const H = helpers(P);
const { MAT, S, slab, cyl, named, shell, tube, Zf } = H;
const ZF = Zf([0, 0, 0]);
const BACK = [Math.PI, 2 * Math.PI];

function ground() {
  let s = `<path class="iso-halo" d="${k.haloOf(PAD, -10, 10, P)}"/>`;
  s += named("Launch pad", MAT("granite", S(k.slabOf({ ...PAD, r: 10 }, -10, 10, P, 8, 1))) + MAT("darksteel", slab(-26, -26, 52, 52, 0, 6, 3)));
  s += named("Flame trench", MAT("carbon", slab(-14, 18, 28, 60, 0.1, 0.4, 2, 0)));
  // the tower: a square lattice with crew arms
  const tx = -64, ty = -46, w = 22, top = 260;
  let t = "";
  for (const [dx, dy] of [[0, 0], [w, 0], [0, w], [w, w]]) t += cyl(tx + dx, ty + dy, 1.6, 0, top, 8);
  let lattice = "";
  for (let z = 0; z < top; z += 20) for (const [a, b] of [[[tx, ty + w], [tx + w, ty + w]], [[tx + w, ty], [tx + w, ty + w]]]) lattice += H.line3([[a[0], a[1], z], [b[0], b[1], z + 20]], "rk-lattice") + H.line3([[a[0], a[1], z + 20], [b[0], b[1], z]], "rk-lattice") + H.line3([[a[0], a[1], z], [b[0], b[1], z]], "rk-lattice");
  s += named("Launch tower", MAT("red", t) + lattice + MAT("red", slab(tx - 2, ty - 2, w + 4, w + 4, top, 6, 1)));
  s += named("Crew access arm", MAT("red", slab(tx + w, ty + 6, 54 - w, 8, 236, 6, 1)));
  s += named("Lightning mast", MAT("steel", cyl(tx + w / 2, ty + w / 2, 1, top + 6, 40, 8)));
  return s;
}

function tank(z0, z1, cls) {
  return shell(ZF, R - 1.4, R, BACK[0], BACK[1], z0, z1);
}

function stage1() {
  let s = named("First stage", MAT("white", tank(S1.z0, S1.inter[0])));
  s += named("Engine section", MAT("carbon", tank(10, S1.z0)) + MAT("darksteel", S(G.disc(S1.z0 - 2, S1.z0, R - 1.4, ZF, P))));
  s += `<g data-part="tanks1"></g>`;
  s += named("Common bulkhead", MAT("steel", S(G.disc(S1.fuel[1], S1.lox[0], R - 1.6, ZF, P), { tone: "mid" })));
  s += named("LOX downcomer", MAT("steel", tube([[4, -3, S1.lox[0]], [4, -3, S1.z0]], 1.4)));
  s += named("Interstage", MAT("carbon", tank(S1.inter[0], S1.inter[1])));
  for (const a of [0.5, 2.1, 3.7, 5.3]) s += named("Landing legs", MAT("carbon", H.line3([[R * Math.cos(a), R * Math.sin(a), 12], [R * Math.cos(a), R * Math.sin(a), 70]], "rk-leg")));
  for (const a of [0.8, 2.4, 3.9, 5.5]) s += named("Grid fins", MAT("darksteel", slab(Math.cos(a) * (R + 3) - 3, Math.sin(a) * (R + 3) - 3, 6, 6, S1.inter[1] - 12, 9, 0.5, 0)));
  // nine engines: eight in a ring and one in the middle
  let eng = "";
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * 2 * Math.PI, r = i === 8 ? 0 : 8.5; eng += S(G.solidOf([[10, 1.6], [6, 2.4], [0, 3.6]], Zf([r * Math.cos(a), r * Math.sin(a), 0]), P)); }
  s += named("Merlin-class engines", MAT("darksteel", eng));
  return s;
}

function stage2() {
  let s = named("Vacuum engine", MAT("heatblue", S(G.solidOf([[S2.z0 + 2, 3], [S2.z0 - 6, 5], [S2.z0 - 18, 9.5]], ZF, P))));
  s += named("Second stage", MAT("white", tank(S2.z0, S2.top)));
  s += `<g data-part="tanks2"></g>`;
  s += named("Common bulkhead", MAT("steel", S(G.disc(S2.fuel[1], S2.lox[0], R - 1.6, ZF, P), { tone: "mid" })));
  return s;
}

function payload() {
  let s = named("Payload adapter", MAT("darksteel", S(G.solidOf([[FAIR.z0, 9], [FAIR.z0 + 6, 6]], ZF, P))));
  s += named("Satellite", MAT("gold", slab(-6, -6, 12, 12, FAIR.z0 + 6, 18, 1, 0.3)) + MAT("navy", slab(-7.5, -2, 1.2, 4, FAIR.z0 + 8, 26, 0.3, 0) + slab(6.3, -2, 1.2, 4, FAIR.z0 + 8, 26, 0.3, 0)) + MAT("white", S(G.solidOf([[FAIR.z0 + 24, 1], [FAIR.z0 + 30, 5]], ZF, P))));
  return s;
}

const LIVE = `
const ZF = Zf([0, 0, 0]);
const RR = C.R - 1.6;
const liquid = (z0, z1, cls) => (z1 - z0 > 0.4 ? '<g class="rk-liq ' + cls + '">' + S(cylinder(0, 0, RR, z0, z1 - z0, P, 28), { tone: "mid", crease: "none" }) + "</g>" : "");
function tanks(s) {
  const f1 = s.p1 / ST1.prop, f2 = s.p2 / ST2.prop;
  // RP-1 and LOX burn at about 1 : 2.3 by mass; both levels fall together
  setHtml(part("tanks1"), liquid(C.S1.fuel[0], mix(C.S1.fuel[0], C.S1.fuel[1] - 1, f1), "rk-rp1") + liquid(C.S1.lox[0] + 1, mix(C.S1.lox[0] + 1, C.S1.lox[1] - 1, f1), "rk-lox"));
  setHtml(part("tanks2"), liquid(C.S2.fuel[0], mix(C.S2.fuel[0], C.S2.fuel[1] - 1, f2), "rk-rp1") + liquid(C.S2.lox[0] + 1, mix(C.S2.lox[0] + 1, C.S2.lox[1] - 1, f2), "rk-lox"));
}
function plume(zTop, rBase, len, spread, flick) {
  const p0 = at([0, 0, zTop]), p1 = at([0, 0, zTop - len]);
  const w0 = rBase * P.scale * 1.6, w1 = (rBase + spread) * P.scale * 1.6;
  const d = "M" + f1(p0[0] - w0) + " " + f1(p0[1]) + " L" + f1(p0[0] + w0) + " " + f1(p0[1]) + " L" + f1(p1[0] + w1) + " " + f1(p1[1]) + " Q" + f1(p1[0]) + " " + f1(p1[1] + w1 * 0.6) + " " + f1(p1[0] - w1) + " " + f1(p1[1]) + " Z";
  const core = "M" + f1(p0[0] - w0 * 0.6) + " " + f1(p0[1]) + " L" + f1(p0[0] + w0 * 0.6) + " " + f1(p0[1]) + " L" + f1(p0[0]) + " " + f1(p0[1] + (p1[1] - p0[1]) * (0.45 + flick * 0.1)) + " Z";
  return '<path class="rk-plume" d="' + d + '"/><path class="rk-core" d="' + core + '"/>';
}
const plate = document.querySelector(".iso-plate");
const world = part("world"), s1g = part("s1"), fairg = part("fairing"), sky = part("sky"), plumeEl = part("plume");
const clouds = Array.from({ length: 14 }, (_, i) => ({ alt: 800 + i * 900 + Math.random() * 500, x: (Math.random() - 0.5) * C.WIDTH * 1.2, w: 40 + Math.random() * 70 }));
const stars = Array.from({ length: 60 }, () => [Math.random() * C.WIDTH, Math.random() * C.HEIGHT * 0.8, Math.random()]);
let st = initial(15000), running = false, wall = 0, trail = [];
function reset() { st = initial(Lab.value("payload") * 1000); running = false; trail = []; Lab.gauge("status", "On the pad"); }
function skyColour(h) {
  const k1 = clamp(h / 30000, 0, 1), k2 = clamp((h - 30000) / 40000, 0, 1);
  const top = [mix(mix(70, 18, k1), 4, k2), mix(mix(150, 50, k1), 6, k2), mix(mix(235, 140, k1), 20, k2)];
  const bot = [mix(mix(190, 90, k1), 8, k2), mix(mix(225, 140, k1), 14, k2), mix(mix(250, 220, k1), 40, k2)];
  return "linear-gradient(180deg,rgb(" + top.map(Math.round) + "),rgb(" + bot.map(Math.round) + "))";
}
function draw(now) {
  const h = st.h;
  plate.style.background = skyColour(h);
  // the world sinks away below the rocket: 4 units per metre for the first metres
  const drop = Math.min(2000, h * 4 * P.scale * 0.9);
  world.setAttribute("transform", "translate(0," + f1(drop) + ")");
  // clouds and stars
  let sk = "";
  const sa = clamp((h - 25000) / 30000, 0, 1);
  if (sa > 0) sk += stars.map(([x, y, b]) => '<circle class="rk-star" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (0.5 + b) + '" style="opacity:' + (sa * (0.4 + b * 0.6)).toFixed(2) + '"/>').join("");
  for (const c of clouds) { const y = C.HEIGHT * 0.55 - (c.alt - h) * 0.12; if (y < -40 || y > C.HEIGHT + 40) continue; sk += '<ellipse class="rk-cloud" cx="' + f1(C.WIDTH / 2 + c.x) + '" cy="' + f1(y) + '" rx="' + f1(c.w) + '" ry="' + f1(c.w * 0.3) + '"/>'; }
  if (h > 15000) { const rr = 4000 / (1 + h / 60000), top = C.HEIGHT * 0.9 + Math.min(40, h / 8000); sk += '<circle class="rk-earth" cx="' + C.WIDTH / 2 + '" cy="' + f1(top + rr) + '" r="' + f1(rr) + '"/>'; }
  setHtml(sky, sk);
  // first stage falls away after separation
  if (st.stage === 2) { const dt = st.t - st.meco; s1g.setAttribute("transform", "translate(" + f1(-dt * 2) + "," + f1(dt * dt * 3 + dt * 8) + ") rotate(" + f1(-dt * 3) + " " + f1(at([0, 0, 100])[0]) + " " + f1(at([0, 0, 100])[1]) + ")"); s1g.style.opacity = clamp(1 - dt / 12, 0, 1); }
  else { s1g.removeAttribute("transform"); s1g.style.opacity = 1; }
  if (!st.fairing) { const dt = st.t - st.fairT; fairg.querySelectorAll("[data-half]").forEach((e) => e.setAttribute("transform", "translate(" + f1((e.dataset.half === "l" ? -1 : 1) * dt * 7) + "," + f1(dt * dt * 2) + ") rotate(" + f1((e.dataset.half === "l" ? -1 : 1) * dt * 6) + ")")); fairg.style.opacity = clamp(1 - dt / 6, 0, 1); }
  else { fairg.querySelectorAll("[data-half]").forEach((e) => e.removeAttribute("transform")); fairg.style.opacity = 1; }
  // exhaust: wider as the outside air pressure falls
  const fl = Math.sin(now * 40) * 0.5 + 0.5;
  const thin = 1 - rho(h) / 1.225;
  let pl = "";
  if (running && !st.done) {
    if (st.stage === 1) pl = plume(4, 9, 60 + thin * 60 + fl * 6, 4 + thin * 40, fl);
    else if (st.t > st.meco + 4) pl = plume(C.S2.z0 - 18, 8, 52 + fl * 4, 16, fl);
  }
  if (running && st.t < 8) pl += Array.from({ length: 10 }, (_, i) => { const a = i * 0.7 + now; const r = 20 + st.t * 14 + i * 6; return '<ellipse class="rk-smoke" cx="' + f1(at([r * Math.cos(a), r * Math.sin(a) * 0.4, 0])[0]) + '" cy="' + f1(at([0, 0, 0])[1] + drop - 6) + '" rx="' + f1(18 + st.t * 4) + '" ry="' + f1(8 + st.t * 2) + '"/>'; }).join("");
  setHtml(plumeEl, pl);
  // tilt the rocket with its pitch so the turn toward orbit shows
  const tilt = (pitch(st.t, h) * 180) / Math.PI * 0.35;
  part("rocket").setAttribute("transform", "rotate(" + f1(tilt) + " " + f1(at([0, 0, 150])[0]) + " " + f1(at([0, 0, 150])[1]) + ")");
  tanks(st);
}
function gauges() {
  const v = Math.hypot(st.vv, st.vh), m = mass(st);
  const dv1 = st.stage === 1 ? deltaV(ST1.ispVac, m, m - st.p1) : 0;
  const m2 = ST2.dry + st.p2 + st.payload;
  const dv2 = deltaV(ST2.isp, m2, m2 - st.p2);
  const mm = Math.floor(st.t / 60), ss = Math.floor(st.t % 60);
  Lab.gauge("time", "T+" + mm + ":" + String(ss).padStart(2, "0"));
  Lab.gauge("alt", (st.h / 1000).toFixed(1) + " km");
  Lab.gauge("vel", (v / 1000).toFixed(2) + " km/s");
  Lab.gauge("acc", (st.acc || 0).toFixed(1) + " g", (st.acc || 0) > 4.5);
  Lab.gauge("dv", ((dv1 + dv2) / 1000).toFixed(2) + " km/s");
  Lab.gauge("status", st.event, st.event === "Too slow for orbit");
  readout(st.stage === 1 ? "Stage 1 · " + Math.round((st.p1 / ST1.prop) * 100) + " % propellant" : "Stage 2 · " + Math.round((st.p2 / ST2.prop) * 100) + " % propellant");
}
const traj = document.querySelector(".rk-traj");
function drawTraj() {
  if (!traj || !traj.clientWidth) return;
  const ctx = traj.getContext("2d");
  const w = traj.width = traj.clientWidth * 2, hh = traj.height = traj.clientHeight * 2;
  ctx.clearRect(0, 0, w, hh);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), rule = cs.getPropertyValue("--lab-rule"), acc = cs.getPropertyValue("--lab-accent");
  const px = (x) => 50 + (x / 2000e3) * (w - 70), py = (h) => hh - 34 - (h / 320e3) * (hh - 50);
  ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = "500 18px ui-monospace,monospace";
  for (const h of [0, 100e3, 200e3, 300e3]) { ctx.beginPath(); ctx.moveTo(50, py(h)); ctx.lineTo(w - 10, py(h)); ctx.stroke(); ctx.fillText(h / 1000 + "", 4, py(h) + 6); }
  ctx.fillText("km downrange →", w - 190, hh - 6);
  ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath();
  trail.forEach(([x, h], i) => (i ? ctx.lineTo(px(x), py(h)) : ctx.moveTo(px(x), py(h)))); ctx.stroke();
  ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(px(st.x), py(st.h), 7, 0, 6.3); ctx.fill();
}
function frame(dt, now) {
  if (running && !st.done) {
    const warp = Lab.value("warp");
    let left = dt * warp;
    while (left > 0) { const h = Math.min(0.1, left); st = step(st, h); left -= h; }
    if (!trail.length || st.t - trail[trail.length - 1][2] > 2) trail.push([st.x, st.h, st.t]);
  }
  draw(now);
  gauges();
  if (Math.floor(now * 5) !== frame.k) { frame.k = Math.floor(now * 5); drawTraj(); }
}
Lab.onAction((a) => { if (a === "launch") { if (st.done || st.t > 0) reset(); running = true; } if (a === "reset") reset(); });
Lab.onChange((id) => { if (id === "payload" && !running) reset(); });
Lab.onStep((i, s, user) => { if (user && s.payload !== undefined) { Lab.set("payload", s.payload); reset(); } if (user && s.launch) running = true; });
reset();
loop(frame);
`;

export function figure(theme) {
  const C = { R, S1, S2, FAIR, WIDTH, HEIGHT };
  // the fairing: two clamshell halves, back halves only so the satellite shows
  const fair = (half) => {
    // an ogive: radius falls along a circular arc from the base to the tip
    const N = 14, L = FAIR.z1 - FAIR.z0, cyl0 = 16;
    const rad = (z) => (z <= cyl0 ? R : R * Math.sqrt(Math.max(0.02, 1 - ((z - cyl0) / (L - cyl0)) ** 2)));
    const segs = [[FAIR.z0, FAIR.z0 + cyl0, R], ...Array.from({ length: N }, (_, i) => { const a = cyl0 + ((L - cyl0) * i) / N, b = cyl0 + ((L - cyl0) * (i + 1)) / N; return [FAIR.z0 + a, FAIR.z0 + b, Math.max(1.4, rad((a + b) / 2))]; })];
    const a0 = half === "l" ? Math.PI : 1.5 * Math.PI, a1 = half === "l" ? 1.5 * Math.PI : 2 * Math.PI;
    return `<g data-half="${half}">` + MAT("white", segs.map(([z0, z1, r]) => shell(ZF, r - 1.2, r, a0, a1, z0, z1)).join("")) + "</g>";
  };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "rk-svg",
    label: "A two-stage rocket on its launch pad beside a red tower, cut open down the front. The first stage holds a tank of kerosene below a tank of liquid oxygen and has nine engines; the second stage has its own smaller tanks and one large vacuum engine; a satellite sits inside the nose fairing.",
    body: [
      `<g data-part="sky"></g>`,
      `<g data-part="world" data-name="Launch pad">${ground()}</g>`,
      `<g data-part="rocket"><g data-part="plume" data-name="Exhaust"></g><g data-part="s1">${stage1()}</g>${stage2()}${payload()}<g data-part="fairing" data-name="Payload fairing">${fair("l")}${fair("r")}</g></g>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 16", title: "Launch to orbit", hint: "Set the payload · launch", readout: "", body: `<div class="iso-stage rk-stage" tabindex="0" role="img" aria-label="Rocket launch">${svg}</div>` });
  const css = `
.rk-svg{overflow:visible}
body.lab-thumb [data-part="sky"]{display:none}
.rk-lattice{stroke:#d8402c;stroke-width:.6;opacity:.8}
.rk-leg{stroke:#22252b;stroke-width:2.2;stroke-linecap:round}
.rk-liq .iso-fill,.rk-liq .iso-shade,.rk-liq .iso-top{fill:var(--liq)!important}
.rk-liq .iso-line{stroke:none}
.rk-rp1{--liq:#e2a43a}.rk-lox{--liq:#8fd3ff}
.rk-plume{fill:#ffb347;opacity:.85;filter:blur(1.5px) drop-shadow(0 0 6px #ff7a00)}
.rk-core{fill:#fff8d8}
.rk-smoke{fill:#e8e8ea;opacity:.75;filter:blur(2px)}
.rk-cloud{fill:#ffffff;opacity:.8;filter:blur(1.5px)}
.rk-star{fill:#fff}
.rk-earth{fill:#2f6fd6;stroke:#9fd8ff;stroke-width:6;filter:drop-shadow(0 0 10px #7cc4f2)}
${materialsCss(["granite", "darksteel", "carbon", "red", "steel", "white", "heatblue", "gold", "navy"])}
`;
  return {
    plate, css, script: pageScript(P, C, modelSource + LIVE),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Flight path</span><em>altitude (km) against distance downrange</em></div><canvas class="rk-traj" style="width:100%;height:140px;display:block"></canvas></div>`,
  };
}
