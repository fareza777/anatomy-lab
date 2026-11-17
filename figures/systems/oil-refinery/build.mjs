// Crude distillation unit: crude oil from the tank is pumped through a fired furnace into the
// bottom of a tall distillation column (cut open at the front). Vapour rises through the trays,
// cooling as it goes; each product condenses at its own height and is drawn off to its tank.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";
import { CUTS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 500;

const COL = { r: 26, z0: 10, z1: 320, feed: 62 };
const DRAW = { gas: 322, petrol: 284, naphtha: 240, kero: 194, diesel: 146, fuel: 96, resid: 16 };
const TANKS = { petrol: [118, -54], naphtha: [182, -54], kero: [246, -54], diesel: [118, 46], fuel: [182, 46], resid: [246, 46] };
const TANK = { r: 24, h: 64 };
const GAS = { x: 70, y: -86, z: 52, r: 24 };
const CRUDE = { x: -236, y: -50, r: 36, h: 82 };
const FURN = { x0: -160, x1: -96, y0: -28, y1: 28, h: 104 };

const P = k.fitProjection([[CRUDE.x - CRUDE.r, CRUDE.y - CRUDE.r, 0], [280, 80, 0], [280, -90, 0], [-260, 40, 0], [0, 0, COL.z1 + 26], [GAS.x, GAS.y - GAS.r, 0]], WIDTH, HEIGHT, { pad: 14, azimuth: 64, elevation: 24 });
const H = helpers(P);
const { MAT, S, slab, cyl, named, tube, Zf, shell } = H;
const ZF = Zf([0, 0, 0]);
const BACK = [Math.PI, 2 * Math.PI];
const colour = (id) => CUTS.find((c) => c.id === id).colour;

function ground() {
  const plan = { x: -280, y: -118, w: 560, d: 196, r: 12 };
  return `<path class="iso-halo" d="${k.haloOf(plan, -10, 10, P)}"/>` + named("Plant floor", MAT("granite", S(k.slabOf(plan, -10, 10, P, 8, 1))));
}

function crudeTank() {
  let s = named("Crude oil tank", MAT("white", S(G.solidOf([[0, CRUDE.r], [CRUDE.h, CRUDE.r], [CRUDE.h + 4, CRUDE.r - 6]], Zf([CRUDE.x, CRUDE.y, 0]), P))));
  s += named("Feed pump", MAT("blue", slab(-196, -6, 22, 16, 0, 16, 2) + S(G.disc(-174, -168, 7, G.frameOf([0, 2, 8], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P))));
  s += named("Crude line", MAT("carbon", tube([[CRUDE.x + CRUDE.r - 4, CRUDE.y + 20, 8], [-200, 2, 8], [-168, 2, 8], [FURN.x0 - 4, 0, 8], [FURN.x0 - 4, 0, 20]], 2.6, { bend: 8 })));
  return s;
}

function furnace() {
  const { x0, x1, y0, y1, h } = FURN;
  let b = slab(x0, y0, x1 - x0, y1 - y0, 0, h, 3, 0.8);
  b += H.poly([[x0 + 8, y1 + 0.3, 10], [x1 - 8, y1 + 0.3, 10], [x1 - 8, y1 + 0.3, 60], [x0 + 8, y1 + 0.3, 60]], "rf-window");
  let s = named("Furnace", MAT("red", b));
  s += `<g data-part="flames" data-name="Furnace"></g>`;
  s += named("Furnace stack", MAT("steel", cyl((x0 + x1) / 2, 0, 9, h, 110, 20)) + MAT("red", cyl((x0 + x1) / 2, 0, 10, h + 96, 6, 20)));
  s += named("Transfer line", MAT("darksteel", tube([[x1, 0, 70], [-50, 0, 70], [-50, 0, COL.feed], [-COL.r + 2, 0, COL.feed]], 4, { bend: 10 })));
  return s;
}

function tank(id, [x, y]) {
  return named(CUTS.find((c) => c.id === id).name + " tank", MAT("white", S(G.solidOf([[0, TANK.r], [TANK.h, TANK.r], [TANK.h + 5, TANK.r - 10], [TANK.h + 7, 2]], Zf([x, y, 0]), P))) + `<g data-part="lvl-${id}"></g>`);
}

function column() {
  let s = halo0(-34, -34, 68, 68);
  s += named("Column skirt", MAT("darksteel", cyl(0, 0, COL.r + 1, 0, COL.z0, 32)));
  s += named("Distillation column", MAT("steel", shell(ZF, COL.r - 2, COL.r, BACK[0], BACK[1], COL.z0, COL.z1)) + MAT("steel", S(G.solidOf([[COL.z1, COL.r], [COL.z1 + 12, COL.r - 8], [COL.z1 + 16, 3]], ZF, P))));
  s += `<g data-part="column" data-name="Trays"></g>`;
  return s;
}
const halo0 = (x, y, w, d) => `<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 30 }, 0, 4, P)}" style="filter:blur(6px)"/>`;

function productLines() {
  let s = "";
  Object.entries(TANKS).forEach(([id, [tx, ty]], i) => {
    const z = DRAW[id], xr = COL.r - 1;
    const pts = id === "resid" ? [[0, xr, z], [0, 40, z], [tx - 30, 40, z], [tx - 30, ty, z], [tx - TANK.r - 1, ty, z]] : [[xr, 0, z], [tx, 0, z], [tx, ty, z], [tx, ty, TANK.h + 7]];
    s += `<g class="rf-line" style="--c:${colour(id)}">` + MAT("darksteel", tube(pts, 2.4, { bend: 6 })) + `<path class="rf-flow" data-flow="${id}" d="${k.pathOf(pts.map(H.at))}"/></g>`;
  });
  const gp = [[0, 0, COL.z1 + 16], [0, 0, DRAW.gas + 20], [GAS.x, 0, DRAW.gas + 20], [GAS.x, GAS.y, DRAW.gas + 20], [GAS.x, GAS.y, GAS.z + GAS.r]];
  s += `<g class="rf-line" style="--c:${colour("gas")}">` + MAT("darksteel", tube(gp, 2, { bend: 6 })) + `<path class="rf-flow" data-flow="gas" d="${k.pathOf(gp.map(H.at))}"/></g>`;
  return named("Product lines", s);
}

function gasSphere() {
  let legs = "";
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; legs += cyl(GAS.x + (GAS.r - 4) * Math.cos(a), GAS.y + (GAS.r - 4) * Math.sin(a), 1.8, 0, GAS.z, 8); }
  return named("Gas sphere", MAT("darksteel", legs) + MAT("white", S(G.sphereOf([GAS.x, GAS.y, GAS.z], GAS.r, P))));
}

const LIVE = `
const ZF = Zf([0, 0, 0]);
const TRAYS = []; for (let z = 26; z < C.COL.z1 - 6; z += 15) TRAYS.push(z);
const temp = (z, bottom) => bottom - (bottom - 95) * clamp((z - C.COL.z0) / (C.COL.z1 - C.COL.z0), 0, 1);
const cutAtTemp = (T) => CUTS.find((c) => T >= c.lo && T < c.hi) || CUTS[CUTS.length - 1];
const bubbles = Array.from({ length: 90 }, () => ({ f: Math.random(), a: Math.PI + Math.random() * Math.PI, r: Math.random() }));
let t = 0, crude = "light", fill = {};
function frame(dt, now) {
  const Tf = Lab.value("furnace"), bpd = Lab.value("bpd") * 1000;
  const y = yields(crude, Tf);
  if (!Lab.reduced.matches) t += dt;
  // trays: half plates with bubble caps and a layer of the liquid that condenses there
  let col = "";
  for (const z of TRAYS) {
    const T = temp(z, Tf - 8), c = cutAtTemp(T);
    col += MAT("stainless", S(G.prismOf(ZF, sector(0, C.COL.r - 2, Math.PI, 2 * Math.PI, 16), z, z + 1.2, P), { tone: "hi", crease: "none" }));
    if (z > C.COL.feed) col += '<g class="rf-liq" style="--c:' + c.colour + '">' + S(G.prismOf(ZF, sector(0, C.COL.r - 3, Math.PI, 2 * Math.PI, 16), z + 1.2, z + 3, P), { tone: "mid", crease: "none" }) + "</g>";
    for (const bx of [-12, 0, 12]) col += MAT("darksteel", S(cylinder(bx, -9, 2.4, z + 1.2, 3.4, P, 10), { tone: "hi", crease: "none" }));
  }
  // the hot residue pool at the bottom
  col += '<g class="rf-liq" style="--c:' + C.RESID + '">' + S(G.prismOf(ZF, sector(0, C.COL.r - 2, Math.PI, 2 * Math.PI, 16), C.COL.z0, C.COL.z0 + 14, P), { tone: "mid", crease: "none" }) + "</g>";
  // rising vapour, coloured by the temperature at its height
  const vap = (100 - y.resid) / 100;
  for (const b of bubbles) {
    if (!Lab.reduced.matches) b.f = (b.f + dt * (0.05 + 0.08 * vap)) % 1;
    const z = mix(C.COL.feed, C.COL.z1 - 4, b.f * (0.3 + 0.7 * vap));
    const rr = (C.COL.r - 4) * b.r;
    col += dot([rr * Math.cos(b.a), rr * Math.sin(b.a) * 0.6, z], 1.3, "rf-vap", "fill:" + ramp(HEAT, (temp(z, Tf - 8) - 60) / 360));
  }
  setHtml(part("column"), col);
  // furnace flames
  let fl = "";
  for (let i = 0; i < 9; i++) { const x = mix(C.FURN.x0 + 12, C.FURN.x1 - 12, i / 8), hgt = 26 + ((Tf - 300) / 120) * 20 + Math.sin(now * 9 + i * 2) * 5; fl += line3([[x, C.FURN.y1 + 0.5, 12], [x + Math.sin(now * 5 + i) * 2, C.FURN.y1 + 0.5, 12 + hgt]], "rf-flame"); }
  fl += line3([[C.FURN.x0 + 10, C.FURN.y1 + 0.6, 50], [C.FURN.x1 - 10, C.FURN.y1 + 0.6, 50], [C.FURN.x1 - 10, C.FURN.y1 + 0.6, 42], [C.FURN.x0 + 10, C.FURN.y1 + 0.6, 42], [C.FURN.x0 + 10, C.FURN.y1 + 0.6, 34], [C.FURN.x1 - 10, C.FURN.y1 + 0.6, 34]], "rf-coil");
  setHtml(part("flames"), fl);
  // product flow in the lines and tank levels
  document.querySelectorAll("[data-flow]").forEach((p) => { const v = y[p.dataset.flow] || 0; p.style.opacity = v > 0.3 ? 1 : 0.1; p.style.animationDuration = (2.6 / Math.max(0.2, v / 12)).toFixed(2) + "s"; });
  for (const [id, [tx, ty]] of Object.entries(C.TANKS)) {
    fill[id] = ((fill[id] || 0.15) + dt * (y[id] / 100) * (bpd / 150000) * 0.05) % 1;
    const h = 3 + fill[id] * (C.TANK.h - 6);
    setHtml(part("lvl-" + id), '<path class="rf-gauge" style="--c:' + (CUTS.find((c) => c.id === id).colour) + '" d="' + pathOf([at([tx + C.TANK.r * 0.71, ty + C.TANK.r * 0.71, 3]), at([tx + C.TANK.r * 0.71, ty + C.TANK.r * 0.71, h])]) + '"/>');
  }
  const light = y.gas + y.petrol + y.naphtha, middle = y.kero + y.diesel;
  Lab.gauge("light", light.toFixed(0) + " %");
  Lab.gauge("middle", middle.toFixed(0) + " %");
  Lab.gauge("resid", y.resid.toFixed(0) + " %", y.resid > 45);
  Lab.gauge("duty", Math.round(duty(crude, Tf, bpd)) + " MW");
  Lab.gauge("top", Math.round(temp(C.COL.z1, Tf - 8)) + " °C");
  Lab.gauge("status", Tf > 400 ? "Cracking & coking risk" : Tf < 330 ? "Diesel left in residue" : "Normal operation", Tf > 400 || Tf < 330);
  readout(CRUDES[crude].name + " · " + Math.round(bpd / 1000) + "k barrels/day");
  if (Math.floor(now * 3) !== frame.k) { frame.k = Math.floor(now * 3); drawTbp(Tf); }
}
const cv = document.querySelector(".rf-tbp");
function drawTbp(Tf) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), rule = cs.getPropertyValue("--lab-rule"), acc = cs.getPropertyValue("--lab-accent");
  const px = (v) => 40 + (v / 100) * (w - 54), py = (T) => h - 28 - ((T + 20) / 640) * (h - 40);
  for (const c of CUTS) { const v0 = tbpAt(crude, Math.max(-20, c.lo)), v1 = c.id === "resid" ? 100 : tbpAt(crude, c.id === "fuel" ? Math.max(350, Math.min(450, Tf + 40)) : c.hi); ctx.fillStyle = c.colour + "55"; ctx.fillRect(px(v0), 8, px(v1) - px(v0), h - 36); }
  ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = "500 18px ui-monospace,monospace";
  for (const T of [0, 200, 400, 600]) { ctx.beginPath(); ctx.moveTo(40, py(T)); ctx.lineTo(w - 10, py(T)); ctx.stroke(); ctx.fillText(T + "°", 0, py(T) + 6); }
  ctx.fillText("% of the crude boiled off →", w - 330, h - 4);
  ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath();
  CRUDES[crude].tbp.forEach(([T, v], i) => (i ? ctx.lineTo(px(v), py(Math.min(620, T))) : ctx.moveTo(px(v), py(T)))); ctx.stroke();
  ctx.setLineDash([8, 6]); ctx.strokeStyle = "#e5484d"; ctx.beginPath(); ctx.moveTo(40, py(Tf)); ctx.lineTo(w - 10, py(Tf)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#e5484d"; ctx.fillText("furnace " + Tf + "°", 48, py(Tf) - 8);
}
Lab.onMode((m) => { crude = m; });
Lab.onStep((i, s, user) => { if (user) { if (s.furnace !== undefined) Lab.set("furnace", s.furnace); if (s.bpd !== undefined) Lab.set("bpd", s.bpd); } document.body.dataset.focus = user ? s.focus || "" : ""; });
loop(frame);
`;

export function figure(theme) {
  const C = { COL, TANKS, TANK, FURN, RESID: colour("resid") };
  const back = Object.entries(TANKS).filter(([, [, y]]) => y < 0).map(([id, p]) => tank(id, p)).join("");
  const front = Object.entries(TANKS).filter(([, [, y]]) => y > 0).map(([id, p]) => tank(id, p)).join("");
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "rf-svg",
    label: "A crude oil distillation unit. Crude from a white storage tank is pumped through a red fired furnace into a tall steel distillation column, shown cut open with its trays. Pipes leave the column at different heights carrying refinery gas to a sphere, and petrol, naphtha, kerosene, diesel, fuel oil and residue to six tanks.",
    body: [ground(), crudeTank(), gasSphere(), back, furnace(), column(), productLines(), front],
  });
  const plate = k.plateHtml({ fig: "Fig 20", title: "Crude distillation", hint: "Heat the furnace · swap the crude", readout: "", body: `<div class="iso-stage rf-stage" tabindex="0" role="img" aria-label="Oil refinery distillation column">${svg}</div>` });
  const css = `
.rf-window{fill:#2a1208}
.rf-flame{stroke:#ff8a1a;stroke-width:5;stroke-linecap:round;opacity:.9;filter:drop-shadow(0 0 3px #ff5a00)}
.rf-coil{fill:none;stroke:#9aa6b4;stroke-width:2.2;stroke-linejoin:round}
.rf-liq .iso-fill,.rf-liq .iso-shade,.rf-liq .iso-top{fill:var(--c)!important}
.rf-liq .iso-line{stroke:none}
.rf-vap{opacity:.85}
.rf-flow{fill:none;stroke:var(--c);stroke-width:1.6;stroke-dasharray:4 7;animation:rf-flow 2s linear infinite;stroke-linecap:round}
@keyframes rf-flow{to{stroke-dashoffset:-22}}
.rf-gauge{stroke:var(--c);stroke-width:4;stroke-linecap:round}
${materialsCss(["granite", "white", "blue", "carbon", "red", "steel", "darksteel", "stainless"])}
`;
  return {
    plate, css, script: pageScript(P, C, modelSource + LIVE),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Boiling curve of the crude</span><em>coloured bands = products</em></div><canvas class="rf-tbp" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
