// The lungs, seen from the front with the chest wall removed: trachea and bronchial tree, two
// lungs (three lobes on the right, two on the left round the heart), the diaphragm below and the
// back halves of the ribs and spine behind. The lungs swell as the diaphragm pulls down.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 520;
export const HEIGHT = 500;

const CARINA = [0, 4, 176];
const LUNG = { x: 44, z0: 44, z1: 206 };

const P = k.fitProjection([[-110, -50, 20], [110, -50, 20], [-110, 40, 20], [110, 40, 20], [0, 0, 262], [-100, 0, 220], [100, 0, 220]], WIDTH, HEIGHT, { pad: 16, azimuth: 78, elevation: 12 });
const H = helpers(P);
const { MAT, S, named, tube, cyl, Zf } = H;

function spine() {
  let s = "";
  for (let z = 14; z < 250; z += 15) s += cyl(0, -46, 8, z, 11, 18) + H.slab(-3, -60, 6, 12, z + 2, 7, 1, 0.3);
  return named("Spine", MAT("bone", s));
}

function ribs() {
  // back halves of eleven pairs of ribs, sloping down from the spine
  let s = "";
  for (let i = 0; i < 10; i++) {
    const z = 236 - i * 19, w = 52 + Math.min(i, 5) * 9 - Math.max(0, i - 7) * 6;
    for (const side of [-1, 1]) {
      const pts = [];
      for (let j = 0; j <= 10; j++) { const a = (j / 10) * Math.PI * 0.62; pts.push([side * (6 + w * Math.sin(a)), -46 + 50 * (1 - Math.cos(a)) * 0.8, z - j * 2.4]); }
      s += tube(pts, 2.6, { bend: 8 });
    }
  }
  return named("Ribs", MAT("bone", s));
}

// a fixed, seeded bronchial tree
function bronchi() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = [];
  function grow(p, dir, len, w, depth, side) {
    const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    out.push({ a: p, b: q, w, depth });
    if (depth >= 5) return;
    for (const turn of [-1, 1]) {
      const ang = (0.42 + rnd() * 0.25) * turn, c = Math.cos(ang), sn = Math.sin(ang);
      // rotate in the x–z plane, with a little wander in y
      const d = [dir[0] * c - dir[2] * sn, dir[1] + (rnd() - 0.5) * 0.5, dir[0] * sn + dir[2] * c];
      const n = Math.hypot(...d);
      grow(q, d.map((v) => v / n), len * (0.66 + rnd() * 0.08), w * 0.72, depth + 1, side);
    }
  }
  grow(CARINA, [-0.62, 0, -0.78], 24, 5.2, 1, -1); // right main bronchus: shorter and steeper
  grow(CARINA, [0.78, 0, -0.62], 28, 4.6, 1, 1);
  return out;
}

const LIVE = `
const lungProfile = [[0, 0.6], [0.04, 0.82], [0.12, 0.95], [0.24, 1], [0.38, 0.98], [0.52, 0.91], [0.66, 0.79], [0.78, 0.64], [0.88, 0.46], [0.95, 0.28], [1, 0.06]];
function lung(side, b, cls) {
  // a lathe whose base sinks with the diaphragm and whose radius swells with each breath
  const x = side * C.LUNG.x * (1 + (b - 1) * 0.6), z0 = C.LUNG.z0 - (b - 1) * 90, z1 = C.LUNG.z1;
  const r = 36 * b;
  const prof = lungProfile.map(([t, f]) => [mix(z0, z1, t), r * f]);
  let s = S(G.solidOf(prof, Zf([x, 0, 0]), P, { smooth: true }), { tone: "hi", crease: "none" });
  // fissures between the lobes: two on the right, one on the left
  const fiss = side < 0 ? [[0.62, 0.3], [0.38, 0.05]] : [[0.58, 0.32]];
  for (const [t0, t1] of fiss) s += line3([[x - side * r * 0.9, r * 0.32, mix(z0, z1, t0)], [x, r * 0.95, mix(z0, z1, (t0 + t1) / 2)], [x + side * r * 0.75, r * 0.4, mix(z0, z1, t1)]], "lu-fissure");
  return '<g class="lu-lung ' + cls + '" data-name="' + (side < 0 ? "Right lung" : "Left lung") + '">' + MAT("lung", s) + "</g>";
}
function diaphragm(b) {
  const z = C.LUNG.z0 - 6 - (b - 1) * 90;
  return named("Diaphragm", MAT("muscle", S(G.solidOf([[z - 12, 86], [z - 2, 84], [z + 12, 70], [z + 24, 44], [z + 30, 14], [z + 31, 2]], Zf([0, -6, 0]), P, { smooth: true }), { tone: "hi", crease: "none" })));
}
function tree(b, airways) {
  let s = "";
  const scale = (p) => [p[0] * (1 + (b - 1) * 0.6), p[1] * b, C.CARINA[2] + (p[2] - C.CARINA[2]) * (1 + (b - 1) * 0.9)];
  const list = airways ? C.TREE : C.TREE.filter((t) => t.depth <= 1);
  for (const t of list) s += line3([scale(t.a), scale(t.b)], "lu-airway", "stroke-width:" + f1(t.w * P.scale * 1.6));
  return s;
}
let phase = 0, breaths = 0;
const air = Array.from({ length: 40 }, () => ({ f: Math.random(), k: Math.floor(Math.random() * 1e6) }));
function frame(dt, now) {
  const rate = Lab.value("rate"), tidal = Lab.value("tidal"), alt = Lab.value("alt");
  const g = gases(rate, tidal, alt);
  const T = 60 / rate, prev = phase;
  if (!Lab.reduced.matches) phase = (phase + dt / T) % 1;
  if (phase < prev) breaths++;
  // inspiration takes ~40 % of the cycle, expiration the rest
  const v = phase < 0.4 ? 0.5 - 0.5 * Math.cos((phase / 0.4) * Math.PI) : 0.5 + 0.5 * Math.cos(((phase - 0.4) / 0.6) * Math.PI);
  const b = 1 + v * (tidal / 6000) * 0.9;
  const airways = Lab.mode === "airways";
  setHtml(part("dia"), diaphragm(b));
  setHtml(part("lungs"), lung(-1, b, airways ? "lu-xray" : "") + lung(1, b, airways ? "lu-xray" : ""));
  setHtml(part("tree"), tree(b, airways));
  // air moving in (inspiration) or out through the trachea and main bronchi
  const inhaling = phase < 0.4;
  let a = "";
  for (const p of air) {
    if (!Lab.reduced.matches) p.f = (p.f + dt * (inhaling ? 1 : -0.7) * 0.9 + 1) % 1;
    const t = C.TREE[p.k % 6] || C.TREE[0];
    const pos = p.f < 0.5 ? [0, 4, mix(258, C.CARINA[2], p.f * 2)] : (() => { const u = (p.f - 0.5) * 2, tt = C.TREE[p.k % C.TREE.length]; return [mix(tt.a[0], tt.b[0], u), mix(tt.a[1], tt.b[1], u), mix(tt.a[2], tt.b[2], u)]; })();
    a += dot(pos, 1.3, inhaling ? "lu-o2" : "lu-co2");
  }
  setHtml(part("air"), a);
  Lab.gauge("ve", g.VE.toFixed(1) + " L/min");
  Lab.gauge("va", g.VA.toFixed(1) + " L/min", g.VA < 3);
  Lab.gauge("co2", Math.round(g.PaCO2) + " mmHg", g.PaCO2 > 45 || g.PaCO2 < 35);
  Lab.gauge("o2", Math.round(g.PAO2) + " mmHg", g.PAO2 < 60);
  Lab.gauge("spo2", Math.round(g.SpO2) + " %", g.SpO2 < 92);
  Lab.gauge("ph", g.pH.toFixed(2), g.pH < 7.35 || g.pH > 7.45);
  readout((inhaling ? "Breathing in" : "Breathing out") + " · " + breaths + " breaths");
  drawAlveolus(g, now, inhaling);
}
const cv = document.querySelector(".lu-alv");
const mol = Array.from({ length: 46 }, (_, i) => ({ o2: i % 3 !== 0, f: Math.random(), y: Math.random() }));
function drawAlveolus(g, now, inhaling) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const dark = document.body.dataset.theme === "dark";
  // alveolus (air sac) on the left, capillary on the right, a thin wall between
  const wall = w * 0.5;
  ctx.fillStyle = dark ? "#3a2a33" : "#fde3e6"; ctx.beginPath(); ctx.ellipse(wall * 0.52, h / 2, wall * 0.5, h * 0.44, 0, 0, 6.3); ctx.fill();
  const sat = g.SpO2 / 100;
  const grad = ctx.createLinearGradient(wall, 0, w, 0); grad.addColorStop(0, "rgb(" + Math.round(70 + 150 * sat) + ",40," + Math.round(140 - 100 * sat) + ")"); grad.addColorStop(1, "rgb(" + Math.round(90 + 140 * sat) + ",30,40)");
  ctx.fillStyle = grad; ctx.fillRect(wall + 6, h * 0.18, w - wall - 12, h * 0.64);
  ctx.strokeStyle = dark ? "#e8a0a8" : "#c46a75"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wall + 3, h * 0.12); ctx.lineTo(wall + 3, h * 0.88); ctx.stroke();
  // red blood cells drifting through
  ctx.fillStyle = "rgba(255,255,255,.18)";
  for (let i = 0; i < 7; i++) { const x = wall + 20 + ((now * 60 + i * 70) % (w - wall - 40)); ctx.beginPath(); ctx.ellipse(x, h * (0.3 + (i % 3) * 0.2), 22, 12, 0, 0, 6.3); ctx.fill(); }
  // gas molecules: O2 crosses into the blood at a rate set by the pressure gap, CO2 the other way
  const push = clamp((g.PAO2 - 40) / 70, 0.05, 1.2);
  for (const m of mol) {
    m.f = (m.f + 0.004 * (m.o2 ? push : clamp(g.PaCO2 / 40, 0.2, 2))) % 1;
    const x = m.o2 ? mix(wall * 0.15, w * 0.9, m.f) : mix(w * 0.9, wall * 0.15, m.f);
    ctx.fillStyle = m.o2 ? "#ff4d4d" : "#4d8bff";
    ctx.beginPath(); ctx.arc(x, h * (0.22 + m.y * 0.56), 6, 0, 6.3); ctx.fill();
  }
  ctx.fillStyle = dark ? "#e8edf5" : "#1b2230"; ctx.font = "600 20px ui-monospace,monospace";
  ctx.fillText("Air sac", 18, 30); ctx.fillText("Capillary", wall + 18, 30);
  ctx.font = "500 18px ui-monospace,monospace"; ctx.fillStyle = "#ff4d4d"; ctx.fillText("O₂ " + Math.round(g.PAO2) + " mmHg →", 18, h - 16);
  ctx.fillStyle = "#4d8bff"; ctx.fillText("← CO₂ " + Math.round(g.PaCO2), wall + 18, h - 16);
}
Lab.onStep((i, s, user) => { if (user) { for (const key of ["rate", "tidal", "alt"]) if (s[key] !== undefined) Lab.set(key, s[key]); } });
loop(frame);
`;

export function figure(theme) {
  const C = { LUNG, CARINA, TREE: bronchi() };
  const heart = named("Aorta", MAT("artery", tube([[6, 12, 104], [4, 10, 136], [14, -6, 150], [22, -26, 132], [22, -30, 60]], 4.5, { bend: 12 })))
    + named("Pulmonary arteries", MAT("vein", tube([[-4, 20, 104], [-6, 16, 126], [-30, 6, 138]], 3.6, { bend: 8 }) + tube([[-6, 16, 126], [26, 4, 136]], 3.2, { bend: 8 })))
    + named("Heart", MAT("muscle", S(G.sphereOf([16, 20, 86], 21, P)) + S(G.sphereOf([0, 18, 98], 15, P))));
  const trachea = named("Trachea", MAT("cartilage", S(G.disc(CARINA[2], 262, 7.5, Zf([CARINA[0], CARINA[1], 0]), P))) + Array.from({ length: 12 }, (_, i) => H.Ln(k.pathOf(H.circle3(Zf([CARINA[0], CARINA[1], 0]), CARINA[2] + 5 + i * 6.8, 7.7, 24).filter((p) => p[1] > CARINA[1] - 1).map(H.at)), { tone: "lo" })).join(""));
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "lu-svg",
    label: "The lungs seen from the front with the chest wall removed. The trachea branches into two bronchi and a tree of smaller airways inside two pink lungs, three lobes on the right and two on the left. The heart sits between them, the dome-shaped diaphragm lies underneath, and the backs of the ribs and the spine are behind.",
    body: [spine(), ribs(), `<g data-part="dia"></g>`, `<g data-part="lungs"></g>`, heart, `<g data-part="tree" data-name="Bronchial tree"></g>`, trachea, `<g data-part="air" data-name="Air"></g>`],
  });
  const plate = k.plateHtml({ fig: "Fig 17", title: "Lungs", hint: "Breathe faster · climb higher", readout: "", body: `<div class="iso-stage lu-stage" tabindex="0" role="img" aria-label="Lungs">${svg}</div>` });
  const css = `
.lu-fissure{fill:none;stroke:#b0555e;stroke-width:.9;opacity:.7}
.lu-xray{opacity:.38}
.lu-airway{fill:none;stroke:#dbe9f0;stroke-linecap:round}
body[data-theme="dark"] .lu-airway{stroke:#c9dfe9}
.lu-o2{fill:#7cc4f2}
.lu-co2{fill:#c9cfd6}
${materialsCss(["bone", "lung", "muscle", "artery", "vein", "cartilage"])}
`;
  return {
    plate, css, script: pageScript(P, C, modelSource + LIVE),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Inside one air sac</span><em>red O₂ in, blue CO₂ out</em></div><canvas class="lu-alv" style="width:100%;height:130px;display:block"></canvas></div>`,
  };
}
