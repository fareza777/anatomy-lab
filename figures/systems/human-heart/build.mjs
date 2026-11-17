// Human heart: a teaching model cut along its long axis, standing on a walnut pedestal beside
// an ECG monitor. The cut face shows the four chambers; they contract, the four valves open
// and close and blood moves through them in step with the Wiggers cycle and the ECG trace.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../vendor/anatomy/kit/tube.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 600;

const FACE_Y = 14, BACK_Y = -14;
const PED = { x: -150, y: -90, w: 300, d: 170, r: 12 };
const MON = { x: 92, y: -40, w: 56, d: 44 };

const P = k.fitProjection([...k.boxCorners(PED, -14, 0), [-90, 0, 330], [90, 0, 330], [0, -30, 340]], WIDTH, HEIGHT, { pad: 16, azimuth: 66, elevation: 18 });

const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const at = (p) => k.iso(p, P);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const named = (n, s, extra = "") => `<g data-name="${n}"${extra}>${s}</g>`;
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(6, r * 2.8), 10, { P, tube: r });
  return tubePieces(route, typeof r === "number" ? r : r, P, { maxLength: 60, ...opts }).map((p) => tubeSvg(p, { tone: "hi" })).join("");
}

// ---- the heart's outline and chambers on the cut plane (x across, z up) --------------------
const OUTER = [[-58, 238], [-70, 212], [-74, 182], [-66, 152], [-50, 124], [-24, 98], [6, 80], [32, 70], [50, 78], [66, 100], [78, 132], [80, 168], [74, 200], [58, 226], [34, 240], [8, 244], [-24, 246]];
const CH = {
  ra: [[-60, 224], [-64, 200], [-58, 174], [-40, 166], [-26, 176], [-24, 204], [-36, 224]],
  rv: [[-54, 160], [-44, 132], [-24, 108], [0, 94], [8, 104], [-4, 124], [-12, 146], [-24, 160], [-40, 166]],
  la: [[22, 228], [44, 232], [62, 216], [62, 196], [44, 186], [24, 190], [16, 210]],
  lv: [[14, 176], [32, 180], [52, 170], [58, 142], [50, 112], [36, 94], [22, 100], [12, 122], [8, 150]],
};
// valves as hinge points with two leaflets each: [hingeA, hingeB]
const VALVES = {
  tricuspid: [[-52, 168], [-28, 172]],
  mitral: [[22, 186], [48, 184]],
  pulmonary: [[-16, 158], [-2, 166]],
  aortic: [[14, 178], [30, 184]],
};
// conduction system path for the electrical mode
const NODES = { sa: [-46, 228], av: [-8, 168] };
const CONDUCT = [[[-46, 228], [-38, 200], [-8, 168]], [[-8, 168], [-6, 150], [-8, 120], [-2, 96], [18, 84]], [[-8, 150], [-26, 122], [-40, 140]], [[-6, 150], [24, 116], [46, 104], [56, 130]]];

function catmull(points, closed = true, steps = 6) {
  const n = points.length, out = [];
  const g = (i) => points[(i + n) % n];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = closed ? g(i - 1) : points[Math.max(0, i - 1)], p1 = g(i), p2 = g(i + 1), p3 = closed ? g(i + 2) : points[Math.min(n - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k2) => 0.5 * (2 * p1[k2] + (-p0[k2] + p2[k2]) * t + (2 * p0[k2] - 5 * p1[k2] + 4 * p2[k2] - p3[k2]) * t2 + (-p0[k2] + 3 * p1[k2] - 3 * p2[k2] + p3[k2]) * t3)));
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

function heartBody() {
  // the solid half-heart: back face, side wall and the cut face with its muscle colour
  const outer = catmull(OUTER);
  const back = outer.map(([x, z]) => at([x * 0.97, BACK_Y, z]));
  const front = outer.map(([x, z]) => at([x, FACE_Y, z]));
  let s = `<path class="ht-wall" d="${k.pathOf(back, true)}"/>`;
  // side band: quads between back and front on the visible (lower-right) rim
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    s += `<path class="ht-side" d="${k.pathOf([back[i], back[j], front[j], front[i]], true)}"/>`;
  }
  s += `<path class="ht-face" d="${k.pathOf(front, true)}"/><path class="ht-gloss" d="${k.pathOf(front, true)}"/>`;
  // coronary arteries and veins running over the visible rim
  s += `<path class="ht-coronary" d="${k.pathOf(catmull([[78, 170], [74, 140], [64, 112], [50, 92]], false, 6).map(([x, z]) => at([x + 2, FACE_Y - 6, z])))}"/>`;
  s += `<path class="ht-coronary ht-cv" d="${k.pathOf(catmull([[74, 196], [80, 168], [78, 132]], false, 6).map(([x, z]) => at([x + 2, FACE_Y - 10, z])))}"/>`;
  // epicardial fat along the grooves and the coronary arteries on the outer surface
  s += `<path class="ht-fat" d="${k.pathOf(catmull([[-30, 244], [-8, 236], [16, 240], [26, 230], [4, 226], [-20, 232]]).map(([x, z]) => at([x, FACE_Y + 0.2, z])), true)}"/>`;
  return s;
}

function vessels() {
  // drawn behind the half-heart so they enter it where the cut face covers them
  let s = "";
  // aorta: ascends from the left ventricle, arches over and descends behind
  s += named("Aorta", mat("artery", tube([[22, 2, 200], [16, 2, 262], [6, -4, 296], [-22, -14, 300], [-44, -20, 284], [-50, -24, 250], [-52, -26, 130]], 11, { bend: 30 })) +
    mat("artery", tube([[-6, -8, 296], [-10, -8, 336]], 5) + tube([[-20, -12, 300], [-24, -12, 338]], 4.4) + tube([[-34, -16, 296], [-40, -18, 332]], 4.6)));
  // pulmonary trunk and arteries
  s += named("Pulmonary artery", mat("vein", tube([[-10, 6, 190], [-6, 8, 250], [10, 8, 270], [58, 2, 272], [86, -6, 262]], 10, { bend: 24 }) + tube([[-4, 8, 258], [-40, -4, 266], [-84, -12, 258]], 7.4, { bend: 20 })));
  // venae cavae
  s += named("Superior vena cava", mat("vein", tube([[-52, -4, 330], [-52, -4, 232]], 9.5)));
  s += named("Inferior vena cava", mat("vein", tube([[-50, -6, 160], [-54, -6, 120], [-58, -8, 96]], 10)));
  // pulmonary veins into the left atrium
  s += named("Pulmonary veins", mat("artery", tube([[96, -10, 226], [60, -6, 220]], 5.5) + tube([[98, -10, 200], [60, -6, 204]], 5.5)));
  return s;
}

function pedestal() {
  let s = `<path class="iso-halo" d="${k.haloOf(PED, -14, 14, P)}"/>`;
  s += named("Display stand", mat("walnut", S(k.slabOf(PED, -14, 14, P, 8, 1.2)) + Ln(k.planOutline(k.insetPlan(PED, 6), 0, P), { tone: "lo" })) +
    mat("brass", S(k.cylinder(-20, -4, 6, 0, 104, P, 24)) + S(k.cylinder(-20, -4, 14, 0, 3, P, 32)) + S(k.cylinder(-20, -4, 9, 96, 6, P, 24)) +
      S(k.slabOf({ x: -72, y: 46, w: 80, d: 22, r: 2 }, 0, 1.4, P, 3, 0.4)) +
      k.faceTextSvg(k.topMatrix([-66, 56], 1.4, P, "x"), "COR · HUMAN HEART", { size: 4.6, tone: "hi" }) +
      k.faceTextSvg(k.topMatrix([-66, 63], 1.4, P, "x"), "LONG-AXIS SECTION 1:1", { size: 3.4, tone: "mid" })));
  // ECG monitor on the stand
  const m = MON;
  let mon = S(k.slabOf({ x: m.x, y: m.y, w: m.w, d: m.d, r: 4 }, 0, 60, P, 4, 1));
  s += named("ECG monitor", mat("white", mon) + `<path class="ht-screen" d="${k.pathOf([[m.x + 6, m.y + m.d + 0.2, 16], [m.x + m.w - 6, m.y + m.d + 0.2, 16], [m.x + m.w - 6, m.y + m.d + 0.2, 52], [m.x + 6, m.y + m.d + 0.2, 52]].map(at), true)}"/><path data-part="ecg" class="ht-ecg" d=""/><text data-part="bpm" class="ht-bpm" transform="${k.sideMatrix([m.x + 8, m.y + m.d + 0.3], 48, P, "left")}" font-size="5.5"></text>`);
  // the lead from the monitor to three electrode pads
  s += named("ECG electrodes", mat("red", tube([[m.x + 10, m.y + m.d - 6, 6], [m.x - 10, 60, 2], [-90, 60, 2]], 1.2)) + mat("white", [[-96, 60], [-80, 66], [-104, 52]].map(([x, y]) => S(k.cylinder(x, y, 5, 0, 1.6, P, 20))).join("")));
  return s;
}

// ---- page -----------------------------------------------------------------------------------
export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "ht-svg",
    label: "A model of the human heart cut along its long axis on a walnut stand, with an ECG monitor. The cut face shows the right atrium and ventricle (blue blood) and the left atrium and ventricle (red blood) with the four valves between them. The chambers contract and the valves open and close in time with the heartbeat.",
    body: [
      pedestal(),
      vessels(),
      `<g data-name="Heart muscle (myocardium)">${heartBody()}</g>`,
      `<g data-part="chambers"></g>`,
      `<g data-part="valves"></g>`,
      `<g data-part="conduction" class="ht-cond"></g>`,
      `<g data-part="flow"></g>`,
    ],
  });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="ht-blue" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#7d97ee"/><stop offset=".55" stop-color="#3f5fbf"/><stop offset="1" stop-color="#22357f"/></radialGradient>
<radialGradient id="ht-red" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ff7a74"/><stop offset=".55" stop-color="#d8303a"/><stop offset="1" stop-color="#8f1420"/></radialGradient>
<linearGradient id="ht-gloss" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
</defs></svg>`;
  const plate = defs + k.plateHtml({ fig: "Fig 4", title: "Human heart", hint: "Tap a chamber or valve", readout: "75 bpm", body: `<div class="iso-stage ht-stage" tabindex="0" role="img" aria-label="Human heart">${svg}</div>` });

  const css = `
.ht-wall{fill:#7d1f22}
.ht-side{fill:#9a2b2c;stroke:#9a2b2c;stroke-width:.6}
.ht-face{fill:#c94a45;stroke:#6b1416;stroke-width:.8;vector-effect:non-scaling-stroke}
body[data-theme="dark"] .ht-face{fill:#b23d3a}
.ht-fat{fill:#f0cf7a;opacity:.9}
.ht-ch{stroke:#5a0f12;stroke-width:.7;vector-effect:non-scaling-stroke}
.ht-blue{fill:url(#ht-blue)}.ht-red{fill:url(#ht-red)}
.ht-gloss{fill:url(#ht-gloss);pointer-events:none}
.ht-coronary{fill:none;stroke:#e8323a;stroke-width:1.6;stroke-linecap:round}
.ht-cv{stroke:#4a5fc0}
.ht-valve{fill:none;stroke:#fff1d6;stroke-width:2.2;stroke-linecap:round;filter:drop-shadow(0 0 .6px #5a0f12)}
.ht-chord{fill:none;stroke:#f6e3c4;stroke-width:.5;opacity:.8}
.ht-dot-b{fill:#9db4ff}.ht-dot-r{fill:#ffb3a8}
.ht-screen{fill:#06150f;stroke:#0d2a1c;stroke-width:.6}
.ht-ecg{fill:none;stroke:#3dff8f;stroke-width:1.1;stroke-linejoin:round;filter:drop-shadow(0 0 1.5px #3dff8f)}
.ht-bpm{fill:#3dff8f;font-family:var(--anatomy-mono);font-weight:700}
.ht-cond{opacity:0;transition:opacity .4s}
body[data-mode="electrical"] .ht-cond{opacity:1}
body[data-mode="electrical"] .ht-ch{opacity:.55}
.ht-path{fill:none;stroke:#ffe36b;stroke-width:1.4;stroke-linecap:round;opacity:.5}
.ht-pulse{fill:#fff6b0;filter:drop-shadow(0 0 3px #ffd000)}
.ht-node{fill:#ffd000;stroke:#7a5a00;stroke-width:.5}
body[data-mode="flow"] .ht-face{fill:#d9a49e}
${materialsCss(["artery", "vein", "walnut", "brass", "white", "red"])}
`;

  const live = `
${modelSource}
const P = ${JSON.stringify(P)};
const FACE_Y = ${FACE_Y};
const CH = ${JSON.stringify(CH)}, VALVES = ${JSON.stringify(VALVES)}, CONDUCT = ${JSON.stringify(CONDUCT)}, NODES = ${JSON.stringify(NODES)}, MON = ${JSON.stringify(MON)};
${catmull.toString()}
const stage = document.querySelector(".ht-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { ch: q("chambers"), valves: q("valves"), cond: q("conduction"), flow: q("flow"), ecg: q("ecg"), bpm: q("bpm") };
const readout = document.querySelector("[data-readout]");
const F = (x, z, dy = 0) => iso([x, FACE_Y + 0.25 + dy, z], P);
const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
const scaled = (pts, s) => { const c = centroid(pts); return pts.map(([x, z]) => [c[0] + (x - c[0]) * s, c[1] + (z - c[1]) * s]); };
let p = 0.3, last = 0, frame = 0, visible = true, history = [];
const NAMES = { ra: "Right atrium", rv: "Right ventricle", la: "Left atrium", lv: "Left ventricle" };
function chamber(id, s, cls) {
  const pts = catmull(scaled(CH[id], s));
  return '<path data-name="' + NAMES[id] + '" class="ht-ch ' + cls + '" d="' + pathOf(pts.map(([x, z]) => F(x, z)), true) + '"/>';
}
function valve(id, open, color) {
  const [a, b] = VALVES[id];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) / 2;
  // leaflets hinge at a and b; closed they meet at the middle, open they swing downstream
  const down = id === "tricuspid" || id === "mitral" ? -1 : 1;
  const n = [-dz / (2 * L), dx / (2 * L)].map((v) => v * down);
  const ang = open * 1.2;
  const tip = (h, dir) => { const ux = dir * (dx / (2 * L)), uz = dir * (dz / (2 * L)); return [h[0] + (ux * Math.cos(ang) + n[0] * Math.sin(ang)) * L * 0.95, h[1] + (uz * Math.cos(ang) + n[1] * Math.sin(ang)) * L * 0.95]; };
  const t1 = tip(a, 1), t2 = tip(b, -1);
  let s = '<g data-name="' + ({ tricuspid: "Tricuspid valve", mitral: "Mitral valve", pulmonary: "Pulmonary valve", aortic: "Aortic valve" })[id] + '">';
  s += '<path class="ht-valve" d="' + pathOf([F(a[0], a[1], 0.1), F(t1[0], t1[1], 0.1)]) + pathOf([F(b[0], b[1], 0.1), F(t2[0], t2[1], 0.1)]) + '"/>';
  if (down < 0) {
    // chordae tendineae tie the AV leaflets to the papillary muscles below
    const pap = [mid[0] + n[0] * 30, mid[1] + n[1] * 30];
    s += '<path class="ht-chord" d="' + pathOf([F(t1[0], t1[1], 0.1), F(pap[0], pap[1], 0.1), F(t2[0], t2[1], 0.1)]) + '"/>';
  }
  return s + "</g>";
}
// flow paths in face coordinates: [path, colour class, which gate]
const FLOWS = [
  [[[-52, 250], [-50, 214], [-44, 190], [-40, 172], [-36, 150], [-24, 128], [-10, 112]], "b", "av"],
  [[[-20, 120], [-14, 140], [-10, 156], [-8, 176], [-6, 206]], "b", "sl"],
  [[[70, 214], [52, 208], [36, 200], [34, 184], [32, 160], [30, 130], [32, 108]], "r", "av"],
  [[[36, 110], [30, 140], [24, 168], [22, 190], [20, 214]], "r", "sl"],
];
function flowDots(t, v, bpm) {
  let s = "";
  for (const [path, col, gate] of FLOWS) {
    const g = gate === "av" ? v.av : v.sl;
    if (g < 0.05) continue;
    const pts = catmull(path, false, 4);
    for (let i = 0; i < 7; i++) {
      const f = (t * 0.9 + i / 7) % 1;
      const idx = Math.min(pts.length - 1, Math.floor(f * (pts.length - 1)));
      const [x, z] = pts[idx];
      const c = F(x, z, 0.3);
      s += '<circle class="ht-dot-' + col + '" cx="' + c[0] + '" cy="' + c[1] + '" r="' + (1.1 + 0.6 * g) + '" opacity="' + (0.4 + 0.6 * g) + '"/>';
    }
  }
  return s;
}
function conduction(p, bpm) {
  const tm = timing(bpm);
  let s = "";
  for (const path of CONDUCT) s += '<path class="ht-path" d="' + pathOf(catmull(path, false, 5).map(([x, z]) => F(x, z, 0.2))) + '"/>';
  for (const k2 of ["sa", "av"]) { const c = F(NODES[k2][0], NODES[k2][1], 0.3); s += '<circle class="ht-node" cx="' + c[0] + '" cy="' + c[1] + '" r="2.4"/>'; }
  // the impulse: SA node at p=0, reaches AV node at the end of the P wave, then races down the bundles
  const seg = [[0, tm.atrialEnd * 0.9, 0], [tm.atrialEnd * 0.9 + 0.03, tm.atrialEnd + 0.06, 1], [tm.atrialEnd + 0.04, tm.atrialEnd + 0.09, 2], [tm.atrialEnd + 0.04, tm.atrialEnd + 0.1, 3]];
  for (const [a, b, i] of seg) {
    if (p < a || p > b) continue;
    const pts = catmull(CONDUCT[i], false, 6);
    const [x, z] = pts[Math.min(pts.length - 1, Math.floor(((p - a) / (b - a)) * (pts.length - 1)))];
    const c = F(x, z, 0.4);
    s += '<circle class="ht-pulse" cx="' + c[0] + '" cy="' + c[1] + '" r="3"/>';
  }
  return s;
}
function ecgPath() {
  const x0 = MON.x + 8, x1 = MON.x + MON.w - 8, zc = 30, y = MON.y + MON.d + 0.3;
  return pathOf(history.map((v, i) => iso([x0 + ((x1 - x0) * i) / (HIST - 1), y, zc + v * 14], P)));
}
const HIST = 90;
function draw(dt) {
  const bpm = Lab.value("bpm");
  const c = contraction(p, bpm), v = valves(p, bpm);
  const sv = 1 - 0.2 * c.ventricle, sa = 1 - 0.16 * c.atrium;
  el.ch.innerHTML = chamber("ra", sa, "ht-blue") + chamber("la", sa, "ht-red") + chamber("rv", sv, "ht-blue") + chamber("lv", sv, "ht-red");
  el.valves.innerHTML = valve("tricuspid", v.av) + valve("mitral", v.av) + valve("pulmonary", v.sl) + valve("aortic", v.sl);
  el.flow.innerHTML = Lab.mode === "electrical" ? "" : flowDots(p * 3, v, bpm);
  el.cond.innerHTML = Lab.mode === "electrical" ? conduction(p, bpm) : "";
  history.push(ecg(p, bpm)); while (history.length > HIST) history.shift();
  el.ecg.setAttribute("d", history.length > 1 ? ecgPath() : "");
  el.bpm.textContent = bpm + " BPM";
  const pr = pressures(p, bpm);
  const phase = phaseOf(p, bpm);
  const text = bpm + " bpm · " + phase;
  if (readout.textContent !== text) readout.textContent = text;
  Lab.gauge("phase", phase, phase === "Ventricular ejection");
  Lab.gauge("bp", Math.round(pr.sysP) + "/" + Math.round(pr.diaP));
  Lab.gauge("lv", Math.round(pr.lv) + " mmHg");
  Lab.gauge("vol", Math.round(lvVolume(p, bpm)) + " ml");
  Lab.gauge("sv", Math.round(strokeVolume(bpm)) + " ml");
  Lab.gauge("co", cardiacOutput(bpm).toFixed(1) + " L/min");
  Lab.gauge("valvesState", (v.av > 0.5 ? "AV open" : "AV shut") + " · " + (v.sl > 0.5 ? "SL open" : "SL shut"));
  Lab.gauge("slow", "×" + (Lab.value("slow") > 1 ? Lab.value("slow").toFixed(0) : "1"));
}
let lastSlow = 1;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  if (!Lab.reduced.matches) p = (p + dt / (timing(Lab.value("bpm")).T * Lab.value("slow"))) % 1;
  window.__heartP = p;
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !Lab.paused) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
document.addEventListener("lab-pause", (e) => { if (!e.detail) run(); });
Lab.onChange(() => run());
Lab.onMode(() => run());
Lab.onStep((i, s, user) => { if (user && s.p !== undefined) { p = s.p; Lab.set("slow", 6); } run(); });
run();
`;
  return {
    plate,
    css,
    script: kitScript() + latheScript() + live,
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Wiggers diagram</span><em><i style="color:#d8303a">LV</i> · <i style="color:#e2a72e">aorta</i> · <i style="color:#3f5fbf">LA</i></em></div><canvas class="ht-wig" style="width:100%;height:130px;display:block"></canvas></div><script type="module">
const cv = document.querySelector(".ht-wig");
function loop(){ if (window.Lab && cv.clientWidth) { const ctx = cv.getContext("2d"); const w = cv.width = cv.clientWidth*2, h = cv.height = cv.clientHeight*2; const bpm = Lab.value("bpm"); ctx.clearRect(0,0,w,h); const cs=getComputedStyle(document.body); ctx.strokeStyle=cs.getPropertyValue("--lab-rule"); ctx.lineWidth=1; for(const v of [0,40,80,120]){const y=h-18-(v/150)*(h-30); ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(w,y); ctx.stroke(); ctx.fillStyle=cs.getPropertyValue("--anatomy-muted"); ctx.font="500 17px ui-monospace,monospace"; ctx.fillText(v,0,y+6);} const line=(f,c)=>{ctx.strokeStyle=c; ctx.lineWidth=3.5; ctx.beginPath(); for(let i=0;i<=200;i++){const q=i/200,y=h-18-(f(q)/150)*(h-30),x=30+q*(w-36); i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.stroke();}; line(q=>pressures(q,bpm).ao,"#e2a72e"); line(q=>pressures(q,bpm).la,"#3f5fbf"); line(q=>pressures(q,bpm).lv,"#d8303a"); const px=30+(window.__heartP||0)*(w-36); ctx.strokeStyle=cs.getPropertyValue("--lab-accent"); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,6); ctx.lineTo(px,h-14); ctx.stroke(); } requestAnimationFrame(loop); }
${modelSource.replace(/^function /gm, "function ")}
loop();
</script>`,
  };
}
