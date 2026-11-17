// Pressurised-water reactor power plant: a cut-away containment with the reactor, pressuriser,
// steam generator and primary pump, a turbine hall with condenser and generator, and a cooling
// tower. The live layer drives the neutron flux, control rods, steam plume and the instruments.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 680;
export const HEIGHT = 540;

const CONT = { x: -155, y: -10, r: 92, wall: 7, z0: 8, z1: 200, dome: 62 };
const RPV = { x: -180, y: -20, r: 33, z0: 18, z1: 125, coreBot: 42, coreTop: 100 };
const SG = { x: -100, y: 10, r: 23, z0: 20, z1: 135 };
const PZR = { x: -215, y: 30, r: 12, z0: 22, z1: 118 };
const PUMP = { x: -135, y: -60, r: 13 };
const TURB = { x: 25, y: -5, z: 78 };
const GEN = { x: 118, y: -5, z: 78 };
const COND = { x: 38, y: 12, w: 74, d: 46, z: 8, h: 34 };
const TOWER = { x: 285, y: -62, r0: 68, top: 46, z1: 220 };

const P = k.fitProjection([
  [-290, -150, 0], [360, 130, 0], [360, -140, 0], [-300, 110, 0],
  [CONT.x, CONT.y, CONT.z1 + CONT.dome + 20], [TOWER.x, TOWER.y, TOWER.z1 + 80], [245, 75, 135],
], WIDTH, HEIGHT, { pad: 16, azimuth: 62, elevation: 22 });

const H = helpers(P);
const { MAT, S: S0, Ln, at, slab, cyl, named, poly, line3, dot, circle3, shell, tube, halo, clamp, mix, ramp } = H;
// cyl() already returns markup; tolerate both solid paths and ready-made strings here.
const S = (p, st) => (typeof p === "string" ? p : S0(p, st));
const ZC = H.Zf([CONT.x, CONT.y, 0]);
const ZR = H.Zf([RPV.x, RPV.y, 0]);
const ZG = H.Zf([SG.x, SG.y, 0]);
const ZP = H.Zf([PZR.x, PZR.y, 0]);
const TF = H.Xf([TURB.x, TURB.y, TURB.z]);
const GF = H.Xf([GEN.x, GEN.y, GEN.z]);
const BACK = [Math.PI, 2 * Math.PI];
const HALF = [Math.PI / 2, (3 * Math.PI) / 2];

const flowD = (pts) => k.pathOf(G.fillet(pts, 8, 8, { P, tube: 3 }).map(at));
function pipe(pts, r, mat, colour) {
  const d = flowD(pts);
  return MAT(mat, tube(pts, r, { bend: Math.max(6, r * 3) })) +
    (colour ? `<path class="np-flow" style="--flowc:${colour}" d="${d}"/>` : "");
}

function ground() {
  const plan = { x: -290, y: -150, w: 650, d: 260, r: 14 };
  return `<path class="iso-halo" d="${k.haloOf(plan, -10, 10, P)}"/>` +
    named("Plant floor", MAT("granite", S(k.slabOf(plan, -10, 10, P, 8, 1))));
}

function dome() {
  let s = "";
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * (Math.PI / 2), a1 = ((i + 1) / N) * (Math.PI / 2);
    const z0 = CONT.z1 + CONT.dome * Math.sin(a0), z1 = CONT.z1 + CONT.dome * Math.sin(a1);
    const ro = CONT.r * Math.cos(a1);
    if (ro < 1.8) continue;
    s += shell(ZC, Math.max(0.4, ro - CONT.wall), ro, BACK[0], BACK[1], z0, z1, { tone: "hi", crease: "none" });
  }
  return s + cyl(CONT.x, CONT.y, 3, CONT.z1 + CONT.dome - 1, 2, 18);
}

function containment() {
  let s = MAT("castalu", S(cyl(CONT.x, CONT.y, CONT.r + 8, 0, 8, 56)) + shell(ZC, CONT.r - CONT.wall, CONT.r, BACK[0], BACK[1], CONT.z0, CONT.z1) + dome());
  s += MAT("floor", S(cyl(CONT.x, CONT.y, CONT.r - 4, CONT.z0, 2, 56)));
  // cut edges of the cylindrical wall
  s += Ln(k.pathOf([at([CONT.x - CONT.r, CONT.y, CONT.z0]), at([CONT.x - CONT.r, CONT.y, CONT.z1])]), { tone: "lo" });
  s += Ln(k.pathOf([at([CONT.x + CONT.r, CONT.y, CONT.z0]), at([CONT.x + CONT.r, CONT.y, CONT.z1])]), { tone: "lo" });
  // the alarm mast on the dome
  s += MAT("steel", tube([[CONT.x, CONT.y, CONT.z1 + CONT.dome - 2], [CONT.x, CONT.y, CONT.z1 + CONT.dome + 16]], 1.2));
  s += `<g data-part="alarm" data-name="Alarm beacon"><circle class="np-alarm" cx="${at([CONT.x, CONT.y, CONT.z1 + CONT.dome + 17])[0]}" cy="${at([CONT.x, CONT.y, CONT.z1 + CONT.dome + 17])[1]}" r="3.2" opacity=".15"/></g>`;
  return '<g class="np-building" data-name="Containment">' + s + "</g>";
}

function reactor() {
  let s = "";
  s += MAT("darksteel", S(cyl(RPV.x, RPV.y, RPV.r + 5, 0, RPV.z0, 40)));
  s += MAT("steel", S(G.solidOf([[8, RPV.r], [12, RPV.r - 4], [16, RPV.r - 13], [18, 0]], ZR, P)));
  s += MAT("steel", S(shell(ZR, RPV.r - 4, RPV.r, BACK[0], BACK[1], RPV.z0, RPV.z1)));
  s += MAT("darksteel", S(cyl(RPV.x, RPV.y, RPV.r + 2, RPV.z1 - 4, 4, 40)));
  s += MAT("steel", S(G.solidOf([[RPV.z1 + 1, RPV.r], [RPV.z1 + 4, RPV.r - 2], [RPV.z1 + 12, RPV.r - 9], [RPV.z1 + 22, RPV.r - 21], [RPV.z1 + 25, 0]], ZR, P)));
  s += MAT("darksteel", S(cyl(RPV.x, RPV.y, RPV.r - 4, RPV.z1 + 20, 5, 40)));
  // core barrel and support plates
  s += MAT("darksteel", S(shell(ZR, 24, 26, BACK[0], BACK[1], 38, 100)));
  s += MAT("steel", S(cyl(RPV.x, RPV.y, 24, 38, 2, 36)) + S(cyl(RPV.x, RPV.y, 24, 98, 2, 36)));
  // the four cold-leg nozzles
  for (const a of [0.35, 1.7, 3.6, 5.2]) {
    const x = RPV.x + (RPV.r - 2) * Math.cos(a), y = RPV.y + (RPV.r - 2) * Math.sin(a);
    s += MAT("steel", S(cyl(x, y, 5, 92, 12, 18)));
  }
  return named("Reactor pressure vessel", s);
}

function steamGenerator() {
  let s = "";
  s += MAT("darksteel", S(cyl(SG.x, SG.y, SG.r + 4, 0, SG.z0, 36)));
  s += MAT("steel", S(G.solidOf([[8, SG.r], [13, SG.r - 3], [18, SG.r - 10], [20, 0]], ZG, P)));
  s += MAT("white", S(shell(ZG, SG.r - 3, SG.r, BACK[0], BACK[1], SG.z0, 126)));
  s += MAT("steel", S(cyl(SG.x, SG.y, SG.r + 2, 122, 4, 36)));
  s += MAT("white", S(G.solidOf([[126, SG.r], [130, SG.r - 4], [138, SG.r - 13], [145, 0]], ZG, P)));
  // U-tube bundle seen through the cut
  for (let i = -2; i <= 2; i++) {
    const x = SG.x + i * 7;
    s += MAT("copper", tube([[x, SG.y - 1, 36], [x, SG.y - 1, 102], [x + 3.5, SG.y + 1, 110], [x + 7, SG.y - 1, 102], [x + 7, SG.y - 1, 36]], 1.15, { bend: 4 }));
  }
  s += MAT("steel", S(cyl(SG.x, SG.y, 6, 145, 10, 24)));
  s += MAT("steel", S(cyl(SG.x - 16, SG.y + 6, 5, 30, 8, 20)));
  return named("Steam generator", s);
}

function pressurizer() {
  let s = MAT("white", S(cyl(PZR.x, PZR.y, PZR.r, PZR.z0, 96, 32)));
  s += MAT("steel", S(G.solidOf([[12, PZR.r], [18, PZR.r - 3], [22, 0]], ZP, P)));
  s += MAT("steel", S(G.solidOf([[PZR.z1, PZR.r], [PZR.z1 + 4, PZR.r - 3], [PZR.z1 + 10, 0]], ZP, P)));
  for (const z of [28, 33, 38]) s += MAT("red", S(cyl(PZR.x, PZR.y, PZR.r + 0.8, z, 2, 28)));
  s += MAT("steel", S(cyl(PZR.x + 8, PZR.y + 7, 1.6, 30, 70, 12)));
  s += MAT("water", S(cyl(PZR.x + 8, PZR.y + 7, 1.2, 30, 34, 12)));
  s += MAT("steel", S(cyl(PZR.x, PZR.y, 4, PZR.z1 + 10, 12, 18)));
  return named("Pressurizer", s);
}

function pump() {
  const x = PUMP.x, y = PUMP.y, r = PUMP.r;
  let s = MAT("steel", S(cyl(x, y, r, 8, 20, 28)) + S(G.sphereOf([x, y, 30], r * 0.9, P)));
  s += MAT("blue", S(cyl(x, y, 9, 34, 24, 24)) + S(cyl(x, y, 10, 56, 4, 24)));
  s += MAT("chrome", S(cyl(x, y, 3, 60, 6, 16)));
  return named("Primary coolant pump", s);
}

function primaryLoops() {
  let s = "";
  const hot = [[RPV.x + 26, RPV.y, 112], [RPV.x + 40, RPV.y + 4, 120], [SG.x - 14, SG.y, 116], [SG.x - 14, SG.y, 112]];
  s += `<g data-name="Hot leg">${pipe(hot, 4.2, "copper", "#e8804a")}</g>`;
  const cold = [[SG.x - 10, SG.y, 42], [SG.x - 24, SG.y - 10, 34], [PUMP.x + 8, PUMP.y, 26], [PUMP.x - 2, PUMP.y, 26], [RPV.x + 20, RPV.y - 6, 40]];
  s += `<g data-name="Cold leg">${pipe(cold, 3.8, "steel", "#5a9fe0")}</g>`;
  s += `<g data-name="Relief valve">${pipe([[PZR.x, PZR.y, 126], [PZR.x, PZR.y, 176], [PZR.x + 18, PZR.y, 188]], 2.2, "steel", "#ffd166")}</g>`;
  s += `<g data-part="relief"></g>`;
  return s;
}

function secondary() {
  let s = "";
  const steam = [[SG.x, SG.y, 154], [SG.x, SG.y, 174], [SG.x + 52, SG.y + 12, 176], [TURB.x + 10, TURB.y, 116], [TURB.x + 10, TURB.y, 100]];
  s += `<g data-name="Steam line">${pipe(steam, 4.2, "white", "#f7b267")}</g>`;
  const feed = [[COND.x + COND.w - 2, COND.y + 10, 42], [30, 30, 58], [-24, -18, 72], [SG.x - 10, SG.y - 10, 62]];
  s += `<g data-name="Feedwater line">${pipe(feed, 2.6, "water", "#62c6f2")}</g>`;
  return s;
}

function tower() {
  const profile = [[0, 68], [6, 64], [18, 57], [40, 50], [75, 43], [115, 39], [155, 38], [195, 41], [220, 46]];
  let s = MAT("water", S(cyl(TOWER.x, TOWER.y, 78, 0, 3, 48)));
  s += MAT("castalu", S(G.solidOf(profile, H.Zf([TOWER.x, TOWER.y, 0]), P)));
  s += poly(circle3(H.Zf([TOWER.x, TOWER.y, 0]), TOWER.z1 - 0.3, 40, 56), "np-mouth");
  s += Ln(k.pathOf(circle3(H.Zf([TOWER.x, TOWER.y, 0]), TOWER.z1, 46, 56).map(at)), { tone: "mid" });
  return named("Cooling tower", s) + `<g data-part="plume" data-name="Cooling tower plume"></g>`;
}

function turbine() {
  let s = MAT("steel", S(shell(TF, 14, 17, HALF[0], HALF[1], 0, 28)) + shell(TF, 10, 20, HALF[0], HALF[1], 28, 34) + shell(TF, 24, 27, HALF[0], HALF[1], 34, 88) + shell(TF, 12, 18, HALF[0], HALF[1], 88, 106));
  s += MAT("darksteel", S(shell(TF, 27, 30, HALF[0], HALF[1], 32, 36) + shell(TF, 27, 30, HALF[0], HALF[1], 86, 90)));
  // rotor and blade rows visible through the open front
  s += MAT("chrome", S(G.disc(-4, 106, 3.8, TF, P)));
  for (const [a, b, r] of [[4, 8, 12], [18, 22, 15], [45, 49, 21], [62, 66, 22], [78, 82, 22]]) s += MAT("steel", S(G.disc(a, b, r, TF, P)));
  for (const ax of [46, 63, 80]) for (let i = 0; i < 13; i++) {
    const a = -Math.PI / 2 + Math.PI * (i / 12);
    s += line3([[TURB.x + ax, TURB.y + 5 * Math.cos(a), TURB.z + 5 * Math.sin(a)], [TURB.x + ax, TURB.y + 22 * Math.cos(a), TURB.z + 22 * Math.sin(a)]], "np-blade");
  }
  return named("Turbine", s);
}

function generator() {
  let s = MAT("yellow", S(G.solidOf([[0, 8], [3, 18], [8, 22], [44, 22], [49, 18], [52, 8]], GF, P)));
  for (const x of [12, 22, 32, 42]) s += MAT("chrome", S(G.disc(x, x + 2, 23.4, GF, P), { crease: "none" }));
  s += MAT("steel", S(G.disc(52, 55, 16, GF, P)));
  s += MAT("chrome", S(G.disc(-18, 0, 4.5, GF, P)));
  s += `<path class="np-spin" d="${k.pathOf(circle3(GF, 56, 11, 28).map(at), true)}"/>`;
  return named("Generator", s);
}

function condenser() {
  let s = MAT("steel", S(slab(COND.x, COND.y, COND.w, COND.d, COND.z, COND.h, 3, 0.8)));
  for (const z of [16, 24, 32]) s += line3([[COND.x + 4, COND.y + COND.d + 0.2, z], [COND.x + COND.w - 4, COND.y + COND.d + 0.2, z]], "np-cond-tube");
  s += MAT("blue", S(slab(COND.x - 8, COND.y, 8, COND.d, COND.z, COND.h, 2, 0.4)) + S(slab(COND.x + COND.w, COND.y, 8, COND.d, COND.z, COND.h, 2, 0.4)));
  s += MAT("steel", tube([[TURB.x + 50, TURB.y, 62], [TURB.x + 50, TURB.y + 8, 54], [TURB.x + 50, COND.y + 12, 44]], 9, { bend: 8 }));
  return named("Condenser", s);
}

function turbineHall() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -5, y: -70, w: 218, d: 145, r: 8 }, -10, 10, P)}"/>`;
  s += named("Turbine hall floor", MAT("floor", S(k.slabOf({ x: -5, y: -70, w: 218, d: 145, r: 8 }, -8, 14, P, 6, 1))));
  for (const [x, y] of [[0, -64], [0, 68], [204, -64], [204, 68]]) s += named("Turbine hall frame", MAT("yellow", S(slab(x - 3, y - 3, 6, 6, 0, 132, 1, 0.4))));
  for (const y of [-65, 67]) s += named("Turbine hall frame", MAT("yellow", S(slab(0, y - 2, 208, 4, 132, 4, 1, 0.3))));
  for (const x of [0, 68, 136, 204]) s += MAT("yellow", S(slab(x - 2, -65, 4, 134, 132, 4, 1, 0.3)));
  // condenser and turbine sit on a raised steel deck
  s += named("Turbine deck", MAT("darksteel", S(slab(20, -40, 165, 105, 6, 6, 3, 0.6))));
  return s;
}

function pylon() {
  const x = 235, y = 78;
  const leg = (dx, dy) => [[x + dx, y + dy, 0], [x + dx * 0.32, y + dy * 0.32, 112]];
  let s = "";
  for (const [dx, dy] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) s += MAT("carbon", tube(leg(dx, dy), 0.9, { bend: 2 }));
  for (const z of [35, 65, 95]) s += line3([[x - 9 * (1 - z / 160), y - 9 * (1 - z / 160), z], [x + 9 * (1 - z / 160), y + 9 * (1 - z / 160), z]], "np-pylon");
  for (const z of [80, 104]) s += line3([[x - 24, y, z], [x + 24, y, z]], "np-pylon");
  for (const dx of [-24, 0, 24]) s += line3([[x + dx, y, 104], [x + dx, y, 96]], "np-pylon") + dot([x + dx, y, 95], 1.2, "np-insulator");
  s += line3([[x - 24, y, 104], [190, 48, 76], [176, 42, 64]], "np-wire");
  s += line3([[x + 24, y, 104], [300, 90, 96], [360, 110, 90]], "np-wire");
  return named("Transmission pylon", s);
}

function transformer() {
  let s = MAT("green", S(slab(188, 32, 26, 26, 0, 30, 2, 0.5)));
  for (const x of [193, 201, 209]) s += MAT("darksteel", S(slab(x, 55, 2, 8, 4, 22, 0.5, 0.2)));
  s += MAT("darksteel", S(cyl(201, 45, 3, 30, 14, 16)));
  return named("Transformer", s);
}

function coolingLoop() {
  let s = "";
  const out = [[COND.x + COND.w + 6, COND.y + 22, 16], [190, 10, 14], [TOWER.x - 38, TOWER.y + 14, 14], [TOWER.x - 12, TOWER.y, 16]];
  const back = [[TOWER.x + 12, TOWER.y, 16], [TOWER.x + 40, TOWER.y + 18, 14], [200, 38, 14], [COND.x + COND.w + 6, COND.y + 38, 16]];
  s += `<g data-name="Circulating water line">${pipe(out, 2.8, "water", "#4fb8e8")}${pipe(back, 2.8, "water", "#8fd7f2")}</g>`;
  return s;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "np-svg",
    label: "A pressurised-water reactor power plant in cut-away isometric view. Inside a concrete containment building a reactor pressure vessel, pressuriser, steam generator and primary pump form a closed loop. A steam line crosses to a turbine hall containing a turbine, condenser and generator, and a large cooling tower stands on the right.",
    body: [
      ground(),
      coolingLoop(),
      containment(),
      reactor(),
      `<g data-part="glow"></g>`,
      `<g data-part="fuel" data-name="Fuel assemblies"></g>`,
      `<g data-part="rods" data-name="Control rods"></g>`,
      `<g data-part="flux" data-name="Neutron flux"></g>`,
      steamGenerator(),
      pressurizer(),
      pump(),
      primaryLoops(),
      turbineHall(),
      condenser(),
      turbine(),
      generator(),
      secondary(),
      tower(),
      pylon(),
      transformer(),
    ],
  });
  const plate = k.plateHtml({
    fig: "Fig 21", title: "Nuclear power plant", hint: "Pull the rods · press SCRAM",
    readout: "", body: `<div class="iso-stage np-stage" tabindex="0" role="img" aria-label="Pressurised-water reactor power plant">${svg}</div>`,
  });

  const css = `
.np-blade{stroke:#c3cad2;stroke-width:1;opacity:.9}
.np-cond-tube{stroke:#7d8a99;stroke-width:1}
.np-pylon{stroke:#6c7684;stroke-width:.7;fill:none}
.np-wire{stroke:#59636f;stroke-width:.5;fill:none;stroke-dasharray:3 2}
.np-insulator{fill:#d9e1ea}
.np-alarm{animation:np-blink 1s steps(2) infinite}
@keyframes np-blink{to{opacity:.15}}
.np-flow{fill:none;stroke:var(--flowc);stroke-width:2;stroke-dasharray:4 8;stroke-linecap:round;opacity:.85;animation:np-flow 1.6s linear infinite}
@keyframes np-flow{to{stroke-dashoffset:-24}}
.np-spin{fill:none;stroke:var(--anatomy-hi);stroke-width:1.4;stroke-dasharray:4 5;animation:np-spin 1s linear infinite}
@keyframes np-spin{to{stroke-dashoffset:-18}}
.np-mouth{fill:#0b1219;stroke:none}
.np-glow{fill:#ff7a1a;filter:blur(5px);pointer-events:none}
.np-fuel .iso-fill,.np-fuel .iso-shade,.np-fuel .iso-top{fill:var(--fuel)!important}
.np-fuel .iso-line{stroke:#3a1208;stroke-width:.35}
.np-flux{fill:#ffe36b;filter:drop-shadow(0 0 2px #ffae00)}
.np-plume{fill:#dfe7ef}
body[data-mode="neutrons"] .np-building{opacity:.2}
body[data-mode="neutrons"] .np-fuel{filter:drop-shadow(0 0 5px #ff7a1a)}
body[data-mode="neutrons"] .np-flow{opacity:.25}
.np-fuel{transition:opacity .3s}
${materialsCss(["granite", "floor", "castalu", "steel", "darksteel", "chrome", "copper", "water", "navy", "yellow", "red", "orange", "green", "carbon", "white"])}
`;

  const live = `
const ZR = Zf([C.RPV.x, C.RPV.y, 0]);
const FUEL = [[0, 90, 30, 20], [0.35, 190, 60, 25], [0.7, 255, 130, 40], [1, 255, 235, 160]];
const state = initialState();
const fuelEl = part("fuel"), rodEl = part("rods"), glowEl = part("glow"), fluxEl = part("flux"), plumeEl = part("plume"), reliefEl = part("relief"), alarmEl = part("alarm");
const spinEl = document.querySelector(".np-spin");
let mode = Lab.mode, lastPaint = 0, lastGauge = 0;
const flux = Array.from({ length: 70 }, () => ({ a: Math.random() * TAU, r: Math.random() * 22, z: 42 + Math.random() * 58 }));
const plume = Array.from({ length: 52 }, () => ({ f: Math.random(), a: Math.random() * TAU, r: Math.random(), s: 0.7 + Math.random() * 0.6 }));
Lab.onMode((m) => { mode = m; });
Lab.onAction((a) => {
  if (a === "scram") { state.tripped = true; state.tripReason = "Manual SCRAM"; Lab.set("rods", 0); }
  else if (a === "reset") { Object.assign(state, initialState()); Lab.set("rods", 55); Lab.set("load", 100); Lab.set("cooling", 80); }
});
function fuelSvg() {
  const t = clamp(state.n / 1.35, 0, 1);
  const col = ramp(FUEL, 0.08 + t * 0.92);
  let s = "";
  for (const dx of [-15, -5, 5, 15]) for (const dy of [-10, 0, 10]) {
    s += '<g class="np-fuel" style="--fuel:' + col + ';opacity:' + (0.38 + 0.62 * t).toFixed(2) + '">' + cyl(C.RPV.x + dx, C.RPV.y + dy, 3.2, 42, 57, 10) + '</g>';
  }
  return s;
}
function rodSvg() {
  const ins = state.tripped ? 1 : 1 - Lab.value("rods") / 100;
  const top = mix(160, 102, ins), bot = top - 55;
  let s = "";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const x = C.RPV.x + 17 * Math.cos(a), y = C.RPV.y + 17 * Math.sin(a);
    s += MAT("darksteel", cyl(x, y, 2.1, bot, 55, 10));
    s += MAT("yellow", cyl(x, y, 2.8, top - 3, 3.5, 10));
  }
  return s;
}
function glowSvg() {
  const g = 0.12 + 0.55 * clamp(state.n, 0, 1.4);
  return poly(circle3(ZR, 101, 24, 44), "np-glow", "opacity:" + g.toFixed(2));
}
function fluxSvg(dt) {
  if (mode !== "neutrons") return "";
  let s = "";
  for (const p of flux) {
    p.z += dt * (18 + 34 * clamp(state.n, 0, 1.4));
    if (p.z > 100) { p.z = 42; p.a = Math.random() * TAU; p.r = Math.random() * 22; }
    s += dot([C.RPV.x + p.r * Math.cos(p.a), C.RPV.y + p.r * Math.sin(p.a), p.z], 1.2 + Math.random() * 0.7, "np-flux", "opacity:" + (0.25 + 0.65 * clamp(state.n, 0, 1)).toFixed(2));
  }
  return s;
}
function plumeSvg(dt) {
  const heat = clamp(state.mwe / 900, 0, 1.25);
  let s = "";
  for (const p of plume) {
    p.f += dt * (0.1 + 0.16 * heat) * p.s;
    if (p.f > 1) { p.f = 0; p.a = Math.random() * TAU; p.r = Math.random(); }
    const rr = 4 + p.r * (7 + p.f * 14);
    const x = C.TOWER.x + Math.cos(p.a) * rr + p.f * p.f * 26;
    const y = C.TOWER.y + Math.sin(p.a) * rr;
    const z = C.TOWER.z1 + p.f * 86;
    s += dot([x, y, z], 2.2 + p.f * 4.2, "np-plume", "opacity:" + ((1 - p.f) * (0.22 + 0.38 * heat)).toFixed(2));
  }
  return s;
}
function reliefSvg(now) {
  if (state.psteam < 8.35) return "";
  let s = "";
  for (let i = 0; i < 14; i++) {
    const f = (now * 0.9 + i / 14) % 1;
    s += dot([C.PZR.x + 18 + Math.sin(i * 2.1 + now * 5) * 2, C.PZR.y, 190 + f * 28], 2.2, "np-plume", "opacity:" + ((1 - f) * 0.7).toFixed(2));
  }
  return s;
}
const cv = document.querySelector(".np-chart");
function drawChart(r) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const rows = [["Control rods", r.rod], ["Fuel temp", r.doppler], ["Coolant", r.moderator], ["Xenon", r.xenon], ["Boron / trip", r.bias], ["Total", r.rho]];
  const max = 3000, x0 = 74, x1 = w - 92, zero = (x0 + x1) / 2;
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), strong = cs.getPropertyValue("--anatomy-strong"), rule = cs.getPropertyValue("--lab-rule");
  ctx.font = "500 17px ui-monospace,monospace"; ctx.textBaseline = "middle";
  ctx.strokeStyle = rule; ctx.lineWidth = 1;
  for (let i = -max; i <= max; i += max / 2) { const x = zero + (i / max) * (zero - x0); ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, h - 4); ctx.stroke(); }
  rows.forEach(([label, v], i) => {
    const y = 14 + i * ((h - 22) / rows.length);
    const pcm = clamp(v * 1e5, -max, max);
    const x = zero + (pcm / max) * (zero - x0);
    ctx.fillStyle = v >= 0 ? "#3fae72" : "#e0564b";
    ctx.fillRect(Math.min(zero, x), y - 6, Math.abs(x - zero), 12);
    ctx.fillStyle = muted; ctx.textAlign = "left"; ctx.fillText(label, 0, y);
    ctx.fillStyle = strong; ctx.textAlign = "right";
    ctx.fillText((v * 1e5 >= 0 ? "+" : "") + Math.round(v * 1e5), w - 6, y);
  });
  ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.font = "500 15px ui-monospace,monospace";
  ctx.fillText("−3000 pcm", x0 + 24, h - 6); ctx.fillText("+3000 pcm", x1 - 24, h - 6);
}
function frame(dt, now) {
  const u = { rods: Lab.value("rods"), load: Lab.value("load"), cooling: Lab.value("cooling") };
  const sim = Math.min(dt * SIM_SPEED, 0.6);
  for (let i = 0; i < 3; i++) step(state, u, sim / 3);
  if (now - lastPaint > 0.045) {
    lastPaint = now;
    setHtml(fuelEl, fuelSvg());
    setHtml(rodEl, rodSvg());
    setHtml(glowEl, glowSvg());
    setHtml(fluxEl, fluxSvg(now - frame.t || 0.05));
    setHtml(plumeEl, plumeSvg(now - frame.t || 0.05));
    setHtml(reliefEl, reliefSvg(now));
    frame.t = now;
    if (alarmEl) alarmEl.style.opacity = state.tripped ? (Math.sin(now * 9) > 0 ? 1 : 0.2) : 0.15;
    if (spinEl) { spinEl.style.animationDuration = (1.8 / Math.max(0.15, state.mwe / 950)).toFixed(2) + "s"; spinEl.style.opacity = state.mwe > 25 ? 0.9 : 0.15; }
    document.body.classList.toggle("np-tripped", state.tripped);
  }
  if (now - lastGauge > 0.22) {
    lastGauge = now;
    const r = outputs(state, u);
    Lab.gauge("power", Math.round(r.power) + " %", r.power > 112 || r.power < 20);
    Lab.gauge("rho", (r.pcm >= 0 ? "+" : "") + Math.round(r.pcm) + " pcm", Math.abs(r.pcm) > 400);
    Lab.gauge("fuel", Math.round(state.tf) + " °C", state.tf > 950 || state.damage > 0.01);
    Lab.gauge("steam", state.psteam.toFixed(1) + " MPa", state.psteam > 8.35);
    Lab.gauge("mwe", Math.round(state.mwe) + " MW");
    Lab.gauge("xenon", state.xe.toFixed(2) + " ×", state.xe > 1.15);
    const status = state.tripped ? "SCRAM · " + state.tripReason : state.damage > 0.01 ? "FUEL DAMAGE" : state.psteam > 8.35 ? "STEAM DUMP" : "GRID 50 Hz";
    readout("3,000 MWt · " + status);
    drawChart(r);
  }
}
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { RPV: RPV, SG: SG, PZR: PZR, TOWER: TOWER, TURB: TURB, COND: COND }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Reactivity balance</span><em>pcm · positive makes power rise</em></div><canvas class="np-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
