// FDM 3D printer (bed-slinger): the bed moves in Y, the carriage in X and the gantry in Z.
// The nozzle traces each layer's outline of a twisting six-lobed vase; finished layers stack
// up on the bed in the filament's colour.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../vendor/anatomy/kit/tube.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 600;

const BASE = { x: -170, y: -170, w: 340, d: 330, r: 10 };
const BED_Z = 66; // top of the print surface
const FRAME_X = 150, FRAME_TOP = 430;
const SPOOL = [0, -120, FRAME_TOP + 70];

const P = k.fitProjection(
  [...k.boxCorners(BASE, -10, 0), [FRAME_X + 20, 0, FRAME_TOP + 20], [-FRAME_X - 20, 0, FRAME_TOP + 20], [SPOOL[0], SPOOL[1], SPOOL[2] + 70]],
  WIDTH, HEIGHT, { pad: 16, azimuth: 40, elevation: 28 },
);

const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const D = (pts, st) => k.dotsSvg(pts, st);
const at = (p) => k.iso(p, P);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const Yf = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const slab = (x, y, w, d, z, h, r = 1.5, b = 0.5) => S(k.slabOf({ x, y, w, d, r }, z, h, P, 3, b));
const named = (n, s, extra = "") => `<g data-name="${n}"${extra}>${s}</g>`;
// A 20x20 aluminium extrusion with its T-slot grooves.
function extrusionX(x0, x1, y, z) { return slab(x0, y - 10, x1 - x0, 20, z, 20, 1, 0.4) + Ln(k.segment([x0 + 2, y + 10, z + 10], [x1 - 2, y + 10, z + 10], P), { tone: "lo" }) + Ln(k.lineOnTop([x0 + 2, y], [x1 - 2, y], z + 20, P), { tone: "lo" }); }
function extrusionY(y0, y1, x, z) { return slab(x - 10, y0, 20, y1 - y0, z, 20, 1, 0.4) + Ln(k.segment([x + 10, y0 + 2, z + 10], [x + 10, y1 - 2, z + 10], P), { tone: "lo" }) + Ln(k.lineOnTop([x, y0 + 2], [x, y1 - 2], z + 20, P), { tone: "lo" }); }
function extrusionZ(x, y, z0, z1) { return slab(x - 10, y - 10, 20, 20, z0, z1 - z0, 1, 0.4) + Ln(k.segment([x, y + 10, z0 + 2], [x, y + 10, z1 - 2], P), { tone: "lo" }) + Ln(k.segment([x + 10, y, z0 + 2], [x + 10, y, z1 - 2], P), { tone: "lo" }); }
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(4, r * 3), 8, { P, tube: r });
  return tubePieces(route, r, P, { maxLength: 400, ...opts }).map((p) => tubeSvg(p, { tone: "hi" })).join("");
}

function base() {
  let s = `<path class="iso-halo" d="${k.haloOf(BASE, -10, 10, P)}"/>`;
  s += mat("rubber", [[-100, -160], [100, -160], [-100, 150], [100, 150]].map(([x, y]) => S(k.cylinder(x, y, 9, -10, 10, P, 24))).join(""));
  let f = extrusionY(-160, 150, -100, 0) + extrusionY(-160, 150, 100, 0) + extrusionX(-110, 110, -170, 0) + extrusionX(-110, 110, 160, 0);
  s += named("Base frame", mat("darksteel", f));
  // Y rails and motor
  s += named("Y linear rods", mat("chrome", S(G.disc(-150, 150, 4, Yf([-45, 0, 32]), P)) + S(G.disc(-150, 150, 4, Yf([45, 0, 32]), P))));
  s += named("Y motor", mat("darksteel", slab(-21, -168, 42, 42, 20, 42, 2, 0.6)) + mat("iron", slab(-19, -170, 38, 4, 22, 38, 1)));
  // power supply and controller with its display
  s += named("Power supply", mat("darksteel", slab(110, -150, 56, 110, 0, 50, 2, 0.6)) + D(Array.from({ length: 24 }, (_, i) => at([166, -140 + (i % 8) * 12, 12 + Math.floor(i / 8) * 12])), { size: 0.7, tone: "lo" }));
  s += named("Controller & display", mat("navy", slab(-60, 150, 120, 30, 0, 52, 3, 0.8)) + `<path class="p3-lcd" d="${k.pathOf([[-44, 180.2, 14], [24, 180.2, 14], [24, 180.2, 42], [-44, 180.2, 42]].map(at), true)}"/><text data-part="lcd1" class="p3-lcdtext" transform="${k.sideMatrix([-40, 180.3], 34, P, "left")}" font-size="6.4"></text><text data-part="lcd2" class="p3-lcdtext" transform="${k.sideMatrix([-40, 180.3], 22, P, "left")}" font-size="5.4"></text>` + mat("chrome", S(G.disc(180, 186, 6, Yf([42, 0, 28]), P))));
  return s;
}

function uprightsBack() {
  // the vertical frame, its top bar and the Z screws stand behind the bed's centre line
  let s = "";
  s += named("Z frame", mat("darksteel", extrusionZ(-FRAME_X, 0, 20, FRAME_TOP) + extrusionZ(FRAME_X, 0, 20, FRAME_TOP) + extrusionX(-FRAME_X - 10, FRAME_X + 10, 0, FRAME_TOP)));
  for (const x of [-FRAME_X + 24, FRAME_X - 24]) {
    s += named("Z motors", mat("darksteel", slab(x - 21, -21, 42, 42, 20, 40, 2, 0.6)));
    s += named("Z lead screws", mat("brass", S(G.disc(60, FRAME_TOP - 6, 4, Zf([x, 0, 0]), P)) + k.fadedSvg(G.ribsOf(Zf([x, 0, 0]), 64, FRAME_TOP - 10, 4.1, 10, P, { twist: 30, fade: [0.05, 0.5] }).map((r) => [r.d, r.alpha]), { tone: "lo" })));
    s += named("Z linear rods", mat("chrome", S(G.disc(20, FRAME_TOP, 4, Zf([x + (x < 0 ? -12 : 12), -14, 0]), P))));
  }
  // spool holder and spool
  const F = Yf([SPOOL[0], 0, SPOOL[2]]);
  s += named("Spool holder", mat("darksteel", slab(-8, -16, 16, 14, FRAME_TOP + 20, SPOOL[2] - FRAME_TOP - 12, 1.5) + S(G.disc(SPOOL[1] - 36, -10, 4, Yf([0, 0, SPOOL[2]]), P))));
  s += `<g data-part="spool" data-name="Filament spool"></g>`;
  return s;
}

// ---- live builders --------------------------------------------------------------------------
const LIVE = `
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const Yf = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const slab = (x, y, w, d, z, h, r = 1.5) => S(slabOf({ x, y, w, d, r }, z, h, P, 3, 0.5));
const ringAt = (h, n = 72) => Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2, r = vaseR(h, t); return [r * Math.cos(t), r * Math.sin(t)]; });
function bedSvg() {
  let s = MAT("darksteel", slab(-60, -12, 120, 24, 24, 10) + slab(-100, -100, 200, 200, 34, 4, 3));
  // levelling knobs and springs between the carriage plate and the heated bed
  for (const [x, y] of [[-88, -88], [88, -88], [-88, 88], [88, 88]]) s += MAT("orange", S(cylinder(x, y, 5.5, 38, 16, P, 20)));
  s += MAT("red", slab(-100, -100, 200, 200, 54, 8, 3));
  s += MAT("gold", slab(-100, -100, 200, 200, 62, 4, 4));
  s += lineSvg(planOutline({ x: -90, y: -90, w: 180, d: 180, r: 2 }, C.BED_Z, P), { tone: "faint" });
  return s;
}
function partSvg(layers, layer, colorMat) {
  // finished height, drawn as bands of 3 mm so the layer lines read without thousands of paths
  const h = layers * layer;
  if (h <= 0) return "";
  let s = "";
  const band = 3;
  for (let z0 = 0; z0 < h - 1e-6; z0 += band) {
    const z1 = Math.min(h, z0 + band);
    const ring = ringAt((z0 + z1) / 2);
    s += solidSvg(extrude(ring, C.BED_Z + z0, z1 - z0, P), { tone: "hi", crease: "none" });
    s += lineSvg(ringSeam(ring, C.BED_Z + z0 + (z1 - z0) / 2, P), { tone: "faint" });
  }
  return MAT(colorMat, s);
}
function wetSvg(layerIndex, layer, frac) {
  const h = layerIndex * layer;
  const n = Math.max(2, Math.floor(72 * frac));
  const pts = Array.from({ length: n + 1 }, (_, i) => { const t = (i / 72) * Math.PI * 2, r = vaseR(h, t); return iso([r * Math.cos(t), r * Math.sin(t), C.BED_Z + h + layer], P); });
  return '<path class="p3-wet" d="' + pathOf(pts) + '"/>';
}
function carriageSvg() {
  let s = "";
  // X carriage block rides both rods; extruder motor and fan shroud in front
  s += MAT("violet", slab(-24, -6, 48, 26, 18, 52, 3));
  s += MAT("darksteel", slab(-21, 20, 42, 30, 34, 40, 2));
  s += MAT("darksteel", S(G.disc(50, 56, 12, Yf([0, 0, 54]), P))) + MAT("orange", lineSvg(G.circleOf(Yf([0, 0, 54]), 56, 7, P), { tone: "hi" }));
  s += MAT("violet", slab(-16, 20, 32, 22, 6, 28, 3));
  s += MAT("darksteel", S(G.disc(42, 45, 10, Yf([0, 0, 20]), P)) + lineSvg(G.circleOf(Yf([0, 0, 20]), 45, 6, P), { tone: "lo" }));
  // heater block and nozzle
  s += MAT("alu", slab(-8, -6, 16, 14, 8, 10, 1));
  s += MAT("brass", S(G.solidOf([[0, 0.3], [5, 4, 1], [8, 4]], Zf([0, 0, 0]), P)));
  return s;
}
function spoolSvg(a, colorMat) {
  const F = Yf([C.SPOOL[0], 0, C.SPOOL[2]]);
  let s = MAT("white", S(G.disc(C.SPOOL[1] - 30, C.SPOOL[1] - 26, 60, F, P)));
  s += MAT(colorMat, S(G.disc(C.SPOOL[1] - 26, C.SPOOL[1] + 26, 50, F, P)) + fadedSvg(G.ribsOf(F, C.SPOOL[1] - 26, C.SPOOL[1] + 26, 50.2, 40, P, { phase: a, fade: [0.05, 0.5] }).map((r) => [r.d, r.alpha]), { tone: "lo" }));
  s += MAT("white", S(G.disc(C.SPOOL[1] + 26, C.SPOOL[1] + 30, 60, F, P)) + lineSvg(G.circleOf(F, C.SPOOL[1] + 30, 18, P), { tone: "hi" }));
  return s;
}
`;

export function figure(theme) {
  const C = { BED_Z, SPOOL };
  const B = new Function("G", "P", "C", "solidSvg", "lineSvg", "dotsSvg", "fadedSvg", "iso", "pathOf", "slabOf", "extrude", "ringSeam", "planOutline", "cylinder", "vaseR",
    `${LIVE}; return { bedSvg, partSvg, wetSvg, carriageSvg, spoolSvg };`)(G, P, C, k.solidSvg, k.lineSvg, k.dotsSvg, k.fadedSvg, k.iso, k.pathOf, k.slabOf, k.extrude, k.ringSeam, k.planOutline, k.cylinder, M.vaseR);

  const gantry = () => {
    // two X rods on the gantry, between the two Z carriages; moves as one group
    let s = "";
    for (const x of [-FRAME_X + 24, FRAME_X - 24]) s += mat("violet", slab(x - 22, -12, 44, 34, 0, 60, 3, 0.6));
    s += mat("chrome", S(G.disc(-FRAME_X + 40, FRAME_X - 40, 4, Xf([0, 14, 22]), P)) + S(G.disc(-FRAME_X + 40, FRAME_X - 40, 4, Xf([0, 14, 58]), P)));
    s += mat("rubber", Ln(k.segment([-FRAME_X + 40, 22, 40], [FRAME_X - 40, 22, 40], P), { tone: "hi" }));
    return s;
  };

  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "p3-svg",
    label: "An open-frame FDM 3D printer printing a twisting six-lobed vase. The heated bed slides front to back, the print head slides left to right on a gantry, and the gantry climbs one layer at a time on two lead screws.",
    body: [
      base(),
      uprightsBack(),
      `<g data-part="bed" data-name="Heated bed">${B.bedSvg()}<g data-part="part" data-name="Printed vase"></g><g data-part="wet" data-name="Printed vase"></g></g>`,
      `<g data-part="gantry" data-name="X gantry">${gantry()}<g data-part="carriage" data-name="Print head">${B.carriageSvg()}<circle data-part="glow" class="p3-glow" cx="${at([0, 0, 1])[0]}" cy="${at([0, 0, 1])[1]}" r="4"/></g></g>`,
      `<path data-part="filament" data-name="Filament" class="p3-filament" d=""/>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 3", title: "3D printer", hint: "Tap a part", readout: "Layer 1", body: `<div class="iso-stage p3-stage" tabindex="0" role="img" aria-label="3D printer">${svg}</div>` });

  const css = `
.p3-wet{fill:none;stroke:var(--p3-fil,#f07a2a);stroke-width:2.2;stroke-linecap:round;filter:drop-shadow(0 0 2px #ffb070)}
.p3-filament{fill:none;stroke:var(--p3-fil,#f07a2a);stroke-width:1.8;stroke-linecap:round}
.p3-glow{fill:#ff8a3a;opacity:.8;filter:blur(2px)}
.p3-lcd{fill:#0e2a47;stroke:#06182b;stroke-width:.5}
.p3-lcdtext{fill:#8fe3ff;font-family:var(--anatomy-mono);font-weight:600}
[data-part="filament-line"] .tb-body{fill:var(--p3-fil,#f07a2a)}
${materialsCss(["rubber", "darksteel", "chrome", "iron", "navy", "brass", "violet", "white", "orange", "teal", "red", "gold", "alu"])}
`;

  const live = `
${modelSource}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
${LIVE}
const stage = document.querySelector(".p3-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { filament: q("filament"), bed: q("bed"), part: q("part"), wet: q("wet"), gantry: q("gantry"), carriage: q("carriage"), spool: q("spool"), lcd1: q("lcd1"), lcd2: q("lcd2"), glow: q("glow") };
const readout = document.querySelector("[data-readout]");
let matId = "pla", layerIdx = 0, theta = 0, last = 0, frame = 0, visible = true, drawnLayers = -1, spoolA = 0, elapsed = 0;
const colorOf = { pla: "#f07a2a", petg: "#1f9aa6", tpu: "#7a52c7" };
function setMaterial(m) {
  matId = m; const M3 = MATERIALS_3D[m];
  document.body.style.setProperty("--p3-fil", colorOf[m]);
  Lab.set("temp", Math.round((M3.lo + M3.hi) / 2));
  drawnLayers = -1;
}
function draw() {
  const layer = Lab.value("layer"), speed = Lab.value("speed"), temp = Lab.value("temp");
  const total = Math.round(PART_H / layer);
  if (layerIdx >= total) { layerIdx = 0; drawnLayers = -1; elapsed = 0; }
  const h = layerIdx * layer;
  const r = vaseR(h, theta);
  const nx = r * Math.cos(theta), ny = r * Math.sin(theta);
  el.bed.setAttribute("transform", translateAlong(P, [0, -ny, 0]));
  el.gantry.setAttribute("transform", translateAlong(P, [0, 0, C.BED_Z + h + layer]));
  el.carriage.setAttribute("transform", translateAlong(P, [nx, 0, 0]));
  if (drawnLayers !== layerIdx) { el.part.innerHTML = partSvg(layerIdx, layer, MATERIALS_3D[matId].color); drawnLayers = layerIdx; }
  el.wet.innerHTML = wetSvg(layerIdx, layer, theta / (Math.PI * 2));
  el.spool.innerHTML = spoolSvg(spoolA, MATERIALS_3D[matId].color);
  const gz = C.BED_Z + h + layer;
  const route = [[C.SPOOL[0], C.SPOOL[1] + 10, C.SPOOL[2] - 50], [0, -30, ${FRAME_TOP} + 4]];
  const end = [nx, 36, gz + 74];
  for (let i = 1; i <= 16; i++) { const f = i / 16; const a = route[1]; route.push([a[0] + (end[0] - a[0]) * f, a[1] + (end[1] - a[1]) * f, a[2] + (end[2] - a[2]) * f + Math.sin(f * Math.PI) * 30]); }
  el.filament.setAttribute("d", pathOf(route.map((p) => iso(p, P))));
  const v = verdict(matId, temp, speed, layer);
  el.glow.style.opacity = String(Math.min(1, Math.max(0.1, (temp - 150) / 100)));
  const u = usage(layer, matId), T = printTime(speed, layer);
  el.lcd1.textContent = "L " + (layerIdx + 1) + "/" + total + "  " + h.toFixed(1) + "mm";
  el.lcd2.textContent = temp + "°C  BED " + MATERIALS_3D[matId].bed + "°C";
  const text = "Layer " + (layerIdx + 1) + " / " + total;
  if (readout.textContent !== text) readout.textContent = text;
  Lab.gauge("layer", (layerIdx + 1) + " / " + total);
  Lab.gauge("height", h.toFixed(1) + " mm");
  Lab.gauge("flow", flow(speed, layer).toFixed(1) + " mm³/s", flow(speed, layer) > MATERIALS_3D[matId].maxFlow);
  Lab.gauge("filament", u.meters.toFixed(1) + " m · " + u.grams.toFixed(0) + " g");
  Lab.gauge("time", Math.floor(T / 3600) + " h " + Math.round((T % 3600) / 60) + " min");
  Lab.gauge("temp", temp + " °C", !v.ok);
  const note = document.querySelector(".p3-note");
  if (note && note.textContent !== v.text) { note.textContent = v.text; note.style.color = v.ok ? "" : "var(--lab-accent)"; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  if (!Lab.reduced.matches) {
    // time-lapse: one layer per ~1.4 s at 60 mm/s, scaled by speed
    const rate = (Lab.value("speed") / 60) * (Math.PI * 2) / 1.4;
    theta += rate * dt; spoolA += dt * 0.3;
    while (theta >= Math.PI * 2) { theta -= Math.PI * 2; layerIdx += Math.max(1, Math.round(1.4 / Lab.value("layer"))); }
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !Lab.paused) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
document.addEventListener("lab-pause", (e) => { if (!e.detail) run(); });
Lab.onMode((m) => { setMaterial(m); run(); });
Lab.onChange((id) => { if (id === "layer") { layerIdx = 0; drawnLayers = -1; } run(); });
Lab.onAction((id) => { if (id === "restart") { layerIdx = 0; theta = 0; drawnLayers = -1; run(); } });
Lab.onStep((i, s, user) => { if (user && s.layerFrac !== undefined) { layerIdx = Math.floor(s.layerFrac * PART_H / Lab.value("layer")); drawnLayers = -1; } run(); });
setMaterial("pla"); layerIdx = Math.floor(0.45 * PART_H / Lab.value("layer"));
run();
`;
  return {
    plate,
    css,
    script: kitScript() + latheScript() + live,
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Print check</span><em>live from your settings</em></div><p class="p3-note" style="margin:2px;font-size:13.5px;line-height:1.45;color:var(--anatomy-strong)"></p></div>`,
  };
}
