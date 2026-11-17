// Electrolysis in a Hofmann voltameter: three glass columns joined at the base, platinum
// electrodes at the foot of the two outer columns, a bench power supply with meters. Gas
// volumes follow Faraday's law; the liquid level falls as gas collects.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../vendor/anatomy/kit/tube.mjs";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

export const WIDTH = 600;
export const HEIGHT = 600;

const BASE = { x: -150, y: -80, w: 300, d: 170, r: 10 };
const TUBE_R = 12, X_L = -58, X_R = 58, Z0 = 40, Z_TOP = 330, CAP = 360; // graduated columns
const RES = { x: 0, z: 400, r: 30 }; // reservoir bulb
const PSU = { x: 60, y: 30, w: 90, d: 58, h: 52 };
const ML_PER_UNIT = 0.25; // 1 world unit of column height = 0.25 ml (column cross-section scaled)

const P = k.fitProjection([...k.boxCorners(BASE, -12, 0), [0, 0, RES.z + RES.r + 20], [-90, 0, 360], [90, 0, 360]], WIDTH, HEIGHT, { pad: 16, azimuth: 60, elevation: 20 });
const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const at = (p) => k.iso(p, P);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const named = (n, s) => `<g data-name="${n}">${s}</g>`;
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(4, r * 3), 8, { P, tube: r });
  return tubePieces(route, r, P, { maxLength: 400, ...opts }).map((p) => tubeSvg(p, { tone: "hi" })).join("");
}

function stand() {
  let s = `<path class="iso-halo" d="${k.haloOf(BASE, -12, 12, P)}"/>`;
  s += named("Retort stand", mat("darksteel", S(k.slabOf(BASE, -12, 12, P, 8, 1.2))) + mat("steel", S(G.disc(0, 450, 4.5, Zf([-110, -40, 0]), P)) +
    [120, 280].map((z) => S(G.disc(-110, X_L - TUBE_R - 2, 3, Xf([0, -40, z]), P)) + S(k.slabOf({ x: X_L - 20, y: -48, w: X_R - X_L + 40, d: 10, r: 2 }, z - 5, 10, P, 3, 0.5))).join("")));
  return s;
}

function psu() {
  const { x, y, w, d, h } = PSU;
  let s = `<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 4 }, 0, h, P)}" style="filter:blur(5px)"/>`;
  let box = S(k.slabOf({ x, y, w, d, r: 4 }, 0, h, P, 4, 1));
  s += named("Power supply", mat("yellow", box) +
    // two meter windows on the front face (y + d)
    [x + 10, x + 50].map((mx) => `<path class="el-meter" d="${k.pathOf([[mx, y + d + 0.2, 22], [mx + 30, y + d + 0.2, 22], [mx + 30, y + d + 0.2, 44], [mx, y + d + 0.2, 44]].map(at), true)}"/>`).join("") +
    `<text data-part="amps" class="el-meter-text" transform="${k.sideMatrix([x + 12, y + d + 0.3], 30, P, "left")}" font-size="7"></text>` +
    `<text data-part="volts" class="el-meter-text" transform="${k.sideMatrix([x + 52, y + d + 0.3], 30, P, "left")}" font-size="7"></text>` +
    k.faceTextSvg(k.sideMatrix([x + 12, y + d + 0.3], 40, P, "left"), "A", { size: 3.4, tone: "hi" }) + k.faceTextSvg(k.sideMatrix([x + 52, y + d + 0.3], 40, P, "left"), "V", { size: 3.4, tone: "hi" }));
  s += named("Current knob", mat("darksteel", S(G.disc(y + d, y + d + 5, 6, G.frameOf([x + 26, 0, 12], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P))));
  s += mat("red", S(k.cylinder(x + 70, y + 10, 4, h, 6, P, 16))) + mat("rubber", S(k.cylinder(x + 82, y + 10, 4, h, 6, P, 16)));
  return s;
}

function apparatus() {
  // the glass is drawn as a translucent body with crisp outlines; liquid and gas are live
  let s = "";
  const glass = (inner) => `<g class="el-glass">${inner}</g>`;
  // bottom bridge tube and the central column up to the reservoir bulb
  s += named("Glass voltameter", glass(mat("glass", S(G.disc(X_L - 4, X_R + 4, 9, Xf([0, 0, Z0 + 6]), P)) +
    S(G.disc(Z0, RES.z - RES.r + 6, 7, Zf([0, 0, 0]), P)) + S(G.sphereOf([RES.x, 0, RES.z], RES.r, P)) + S(G.disc(RES.z + RES.r - 6, RES.z + RES.r + 14, 9, Zf([0, 0, 0]), P)))));
  // the two graduated columns with stopcocks
  for (const x of [X_L, X_R]) {
    s += named(x < 0 ? "Cathode column" : "Anode column", glass(mat("glass", S(G.solidOf([[Z0 - 6, 10], [Z0, TUBE_R], [Z_TOP, TUBE_R], [Z_TOP + 14, 4, 1], [CAP, 3.4]], Zf([x, 0, 0]), P)))) +
      `<g class="el-grad">${Array.from({ length: 13 }, (_, i) => Ln(G.arcOf(Zf([x, 0, 0]), Z_TOP - 10 - i * 20, TUBE_R + 0.2, P), { tone: "hi" })).join("")}</g>`);
    s += named("Stopcock", mat("glass", S(G.disc(-8, 8, 4.5, G.frameOf([x, 0, CAP - 10], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P))) + mat("blue", S(G.disc(8, 13, 6, G.frameOf([x, 0, CAP - 10], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P))));
  }
  return s;
}

const LIVE = `
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
function liquidSvg(x, z0, z1, r, cls) {
  if (z1 <= z0) return "";
  const p = G.disc(z0, z1, r, Zf([x, 0, 0]), P);
  return '<path class="' + cls + '" d="' + p.fill + '"/><path class="el-meniscus" d="' + G.circleOf(Zf([x, 0, 0]), z1, r, P) + '"/>';
}
function bubbles(x, zBottom, zTop, t, rate, cls, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const f = (t * (0.35 + 0.65 * rate) * (0.6 + (i % 5) * 0.12) + i * 0.137) % 1;
    const z = zBottom + f * (zTop - zBottom);
    const wob = Math.sin(t * 4 + i * 1.7) * (C.TUBE_R - 4) * 0.7;
    const c = iso([x + wob * 0.6, wob * 0.5, z], P);
    s += '<circle class="' + cls + '" cx="' + c[0] + '" cy="' + c[1] + '" r="' + (0.9 + (i % 3) * 0.45) + '"/>';
  }
  return s;
}
function electrodeSvg(x, sign) {
  // platinum foil on a lead sealed through the glass foot
  let s = MAT("chrome", S(slabOf({ x: x - 4, y: -0.6, w: 8, d: 1.2, r: 0.2 }, C.Z0 + 6, 22, P, 2, 0.2)));
  s += MAT(sign < 0 ? "rubber" : "red", S(G.disc(C.Z0 - 30, C.Z0 - 6, 1.6, Zf([x, 0, 0]), P)));
  return s;
}
`;

export function figure(theme) {
  const C = { TUBE_R, X_L, X_R, Z0, Z_TOP, CAP, RES, ML: ML_PER_UNIT };
  const B = new Function("G", "P", "C", "solidSvg", "lineSvg", "iso", "pathOf", "slabOf", `${LIVE}; return { liquidSvg, electrodeSvg };`)(G, P, C, k.solidSvg, k.lineSvg, k.iso, k.pathOf, k.slabOf);
  const wires = named("Leads", mat("rubber", tube([[PSU.x + 82, PSU.y + 10, PSU.h + 6], [PSU.x + 82, PSU.y + 10, PSU.h + 26], [X_L, 26, 30], [X_L, 0, Z0 - 30]], 1.6, { bend: 20 })) +
    mat("red", tube([[PSU.x + 70, PSU.y + 10, PSU.h + 6], [PSU.x + 70, PSU.y + 10, PSU.h + 18], [X_R + 8, 20, 22], [X_R, 0, Z0 - 30]], 1.6, { bend: 16 })));
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "el-svg",
    label: "A Hofmann voltameter on a retort stand: three glass columns joined at the bottom, with platinum electrodes in the two outer columns wired to a bench power supply. Bubbles of hydrogen rise in the left column and oxygen in the right, and the gas collects at the top.",
    body: [
      stand(),
      psu(),
      wires,
      `<g data-part="liquid" data-name="Electrolyte"></g>`,
      `<g data-part="electrodes" data-name="Platinum electrodes">${B.electrodeSvg(X_L, -1) + B.electrodeSvg(X_R, 1)}</g>`,
      apparatus(),
      `<g data-part="bubbles"></g>`,
      `<g data-part="labels"></g>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 7", title: "Electrolysis", hint: "Set the current · tap a column", readout: "", body: `<div class="iso-stage el-stage" tabindex="0" role="img" aria-label="Hofmann voltameter">${svg}</div>` });
  const css = `
.el-glass{opacity:.42}
.el-glass .iso-edge{stroke-width:1}
.el-grad{opacity:.8}
.el-water{fill:#7cc8f2;opacity:.55}
.el-water-cath{fill:#7b6cf2;opacity:.6}
.el-water-anode{fill:#f2a35c;opacity:.6}
.el-brine-anode{fill:#cfe86a;opacity:.6}
.el-meniscus{fill:none;stroke:#2f86d6;stroke-width:.6;opacity:.8}
.el-h2{fill:#ffffff;stroke:#5aa7e6;stroke-width:.35;opacity:.9}
.el-o2{fill:#ffffff;stroke:#e68a5a;stroke-width:.35;opacity:.9}
.el-cl2{fill:#e8f58a;stroke:#9bb02a;stroke-width:.35;opacity:.95}
.el-gas-cl{fill:#d9ee6a;opacity:.35}
.el-meter{fill:#0b1510;stroke:#2b3b33;stroke-width:.5}
.el-meter-text{fill:#ff6a3d;font-family:var(--anatomy-mono);font-weight:700}
.el-tag{font-family:var(--anatomy-mono);font-size:9px;font-weight:700}
${materialsCss(["darksteel", "steel", "yellow", "red", "rubber", "glass", "blue", "chrome"])}
`;
  const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
${LIVE}
const stage = document.querySelector(".el-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { liquid: q("liquid"), bubbles: q("bubbles"), amps: q("amps"), volts: q("volts"), labels: q("labels") };
const readout = document.querySelector("[data-readout]");
const F = 96485, VM = 24.47; // C/mol, L/mol at 25 °C and 1 atm
let t = 0, charge = 0, last = 0, frame = 0, mode = "water";
function volumes() {
  const molE = charge / F; // moles of electrons
  const h2 = (molE / 2) * VM * 1000; // ml
  const other = mode === "water" ? (molE / 4) * VM * 1000 : (molE / 2) * VM * 1000 * 0.75; // Cl2 partly dissolves
  return { h2, other };
}
function draw() {
  const I = Lab.value("current");
  const v = volumes();
  const cap = (C.Z_TOP - C.Z0 - 8) * C.ML;
  if (v.h2 >= cap) { charge = 0; }
  const levelL = C.Z_TOP - v.h2 / C.ML, levelR = C.Z_TOP - v.other / C.ML;
  const resLevel = C.RES.z - C.RES.r * 0.6 + Math.min(C.RES.r * 1.2, ((v.h2 + v.other) / C.ML) * 0.05);
  const cath = mode === "water" ? "el-water-cath" : "el-water-cath", anode = mode === "water" ? "el-water-anode" : "el-brine-anode";
  let liq = "";
  liq += liquidSvg(C.X_L, C.Z0, levelL, C.TUBE_R - 1, cath) + liquidSvg(C.X_R, C.Z0, levelR, C.TUBE_R - 1, anode);
  liq += '<path class="el-water" d="' + G.disc(C.X_L, C.X_R, 8, G.frameOf([0, 0, C.Z0 + 6], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P).fill + '"/>';
  liq += liquidSvg(0, C.Z0, Math.min(resLevel, C.RES.z - 10), 6, "el-water");
  liq += '<circle class="el-water" cx="' + iso([0, 0, resLevel], P)[0] + '" cy="' + iso([0, 0, resLevel], P)[1] + '" r="' + (C.RES.r * P.scale * 0.95) + '"/>';
  if (mode === "brine") liq += liquidSvg(C.X_R, levelR, C.Z_TOP + 6, C.TUBE_R - 1, "el-gas-cl");
  el.liquid.innerHTML = liq;
  const rate = Math.min(1, I / 2);
  el.bubbles.innerHTML = I > 0.02 ? bubbles(C.X_L, C.Z0 + 20, levelL, t, rate, "el-h2", Math.round(10 + rate * 26)) + bubbles(C.X_R, C.Z0 + 20, levelR, t * 0.8, rate, mode === "water" ? "el-o2" : "el-cl2", Math.round((mode === "water" ? 5 : 9) + rate * (mode === "water" ? 13 : 22))) : "";
  const tagL = iso([C.X_L - 6, 0, C.CAP + 18], P), tagR = iso([C.X_R - 6, 0, C.CAP + 18], P);
  el.labels.innerHTML = '<text class="el-tag" x="' + tagL[0] + '" y="' + tagL[1] + '" fill="#2f86d6">H₂ (−)</text><text class="el-tag" x="' + tagR[0] + '" y="' + tagR[1] + '" fill="' + (mode === "water" ? "#e8461a" : "#8aa020") + '">' + (mode === "water" ? "O₂ (+)" : "Cl₂ (+)") + '</text>';
  const volts = I < 0.01 ? 0 : (mode === "water" ? 1.23 : 1.36) + 0.45 + 0.35 * Math.log10(1 + I * 10) + I * 2.2;
  el.amps.textContent = I.toFixed(2);
  el.volts.textContent = volts.toFixed(2);
  const ratio = v.other > 0.05 ? (v.h2 / v.other).toFixed(2) + " : 1" : "—";
  const txt = "H₂ " + v.h2.toFixed(1) + " ml · " + (mode === "water" ? "O₂ " : "Cl₂ ") + v.other.toFixed(1) + " ml";
  if (readout.textContent !== txt) readout.textContent = txt;
  Lab.gauge("h2", v.h2.toFixed(1) + " ml");
  Lab.gauge("o2", v.other.toFixed(1) + " ml");
  Lab.gauge("ratio", ratio, true);
  Lab.gauge("charge", charge.toFixed(0) + " C");
  Lab.gauge("volts", volts.toFixed(2) + " V");
  Lab.gauge("mol", ((charge / F) * 1000).toFixed(2) + " mmol e⁻");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  if (!Lab.reduced.matches) { t += dt; charge += Lab.value("current") * dt * Lab.value("speed"); }
  draw();
  frame = requestAnimationFrame(tick);
}
Lab.onMode((m) => { mode = m; charge = 0; });
Lab.onAction((id) => { if (id === "reset") charge = 0; });
Lab.onStep((i, s, user) => { if (user && s.mode) Lab.setMode(s.mode); });
document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
charge = 3200;
frame = requestAnimationFrame(tick);
`;
  return { plate, css, script: kitScript() + latheScript() + live };
}
