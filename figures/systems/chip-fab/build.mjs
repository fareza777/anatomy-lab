// Semiconductor fab: cleanroom hall with an overhead hoist fleet, coat track, EUV scanner,
// etch/deposition cluster, dicing, wire bonding and a package line. The live layer runs the
// pods, the step-and-scan stages, spinning wafers, robot arm, blade and bond head, and draws
// the tested wafer map on the panel below.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 820;
export const HEIGHT = 520;

const SCAN = { x: -150, y: -10 };
const CLUSTER = { x: 22, y: -6 };
const DICE = { x: 150, y: -22 };
const BOND = { x: 224, y: 10 };
const PACK = { x: 286, y: 40 };
const OHT = [[-330, -88, 104], [310, -88, 104], [310, 48, 104], [-330, 48, 104], [-330, -88, 104]];
const AGV = [[-322, 104, 0], [316, 104, 0]];
const CMP = { x: -34, y: 88 };
const FLOW = [[-318, 2, 40], [-270, 6, 38], [-212, 6, 38], [-176, -2, 37], [-130, -2, 37], [-80, -4, 36], [-10, -4, 36], [50, 2, 36], [106, 6, 34], [148, -18, 34], [190, -6, 34], [224, 10, 34], [262, 28, 32], [318, 44, 28]];

const P = k.fitProjection([
  [-378, -170, 0], [378, 170, 0], [378, -170, 0], [-378, 170, 0],
  [-370, -164, 122], [370, -164, 122], [330, 70, 60], [318, 44, 40],
  [-338, -34, 88], [-150, -10, 88], [22, -6, 34], [286, 40, 78],
], WIDTH, HEIGHT, { pad: 14, azimuth: 60, elevation: 25 });

const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, tube, along, clamp } = H;

function wafer(x, y, z, r, tone = "chrome") {
  let s = MAT(tone, S(G.disc(0, 0.9, r, G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P)));
  s += line3([[x, y, z + 0.95], [x + r * 0.78, y, z + 0.95]], "cf-notch");
  return s;
}

function ground() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -374, y: -162, w: 748, d: 324, r: 18 }, -12, 12, P)}"/>`;
  s += named("Cleanroom floor", MAT("floor", S(k.slabOf({ x: -372, y: -160, w: 744, d: 320, r: 18 }, -12, 12, P, 8, 1))));
  s += `<g class="cf-bayfloor">${MAT("yellow", slab(-346, -102, 300, 150, -2, 2, 12, 0.2))}</g>`;
  s += MAT("white", slab(-56, 46, 410, 10, -1, 1.4, 3, 0.15));
  for (let x = -330; x <= 330; x += 60) s += line3([[x, -152, 0.4], [x, 152, 0.4]], "cf-grid");
  for (let y = -140; y <= 140; y += 60) s += line3([[-360, y, 0.4], [360, y, 0.4]], "cf-grid");
  return s;
}

function shell() {
  let s = "";
  for (let i = 0; i < 7; i++) {
    const x = -363 + i * 104;
    s += MAT("white", slab(x, -158, 104, 5, 0, 62, 1, 0.2));
    s += MAT("glass", slab(x + 6, -154.5, 62, 1.2, 38, 15, 0.4, 0.1));
    s += MAT("teal", slab(x + 8, -153.2, 12, 1.0, 54, 2.5, 0.3, 0.1));
    s += MAT("steel", slab(x - 2, -159, 6, 9, 0, 68, 1, 0.2));
  }
  s += line3([[-362, -154, 72], [362, -154, 72]], "cf-rail-lit");
  // air-handling duct along the back of the hall
  s += MAT("white", slab(-344, -96, 700, 12, 106, 7, 2, 0.3));
  s += MAT("teal", slab(-344, -96, 700, 1.6, 107, 3, 0.5, 0.1));
  for (let x = -326; x <= 340; x += 52) {
    s += line3([[x, -90, 113], [x, -90, 118]], "cf-lampwire");
    s += line3([[x, -88, 104], [x, -84, 60]], "cf-ductdrop");
  }
  for (let y = -150; y <= 150; y += 50) s += line3([[-368, y, 118], [368, y, 118]], "cf-ceilbeam");
  for (let x = -350; x <= 350; x += 100) s += line3([[x, -156, 118], [x, 156, 118]], "cf-ceilbeam");
  for (let x = -340; x <= -60; x += 56) for (let y = -90; y <= 30; y += 40) {
    s += MAT("white", slab(x, y, 48, 34, 114, 2, 1, 0.15));
    s += line3([[x, y + 17, 116], [x + 48, y + 17, 116]], "cf-ceilbeam");
  }
  for (const [x, y] of [[-280, 10], [-150, 10], [20, 10], [180, 10], [280, 60], [60, 110]]) {
    s += line3([[x, y, 118], [x, y, 106]], "cf-lampwire");
    s += MAT("white", slab(x - 8, y - 3, 16, 6, 104, 2, 2, 0.3));
    s += MAT("yellow", slab(x - 7, y - 2, 14, 4, 103.4, 0.8, 2, 0.1), ' class="cf-lamp"');
  }
  return s;
}

function toolRow() {
  const xs = [-26, 52, 130, 208];
  let s = "";
  xs.forEach((x, i) => {
    s += MAT("darksteel", slab(x, -126, 40, 50, 0, 8, 2, 0.3));
    s += MAT(i % 2 ? "white" : "cream", slab(x + 2, -124, 36, 40, 8, 28, 1.5, 0.35));
    s += MAT(i % 2 ? "teal" : "orange", slab(x + 26, -120, 10, 32, 12, 18, 1, 0.2));
    s += MAT("chrome", cyl(x + 14, -110, 6, 36, 6, 18));
    s += MAT("darksteel", cyl(x + 14, -110, 7, 41, 2, 18));
    s += MAT("glass", slab(x + 6, -96, 14, 6, 22, 8, 0.8, 0.1));
    s += dot([x + 34, -122, 24], 1.1, "cf-led");
    s += dot([x + 34, -122, 20], 1.1, i === 2 ? "cf-plasma" : "cf-led");
    s += line3([[x + 18, -100, 38], [x + 18, -88, 60], [x + 34, -84, 60]], "cf-duct");
  });
  return named("Process tool row", s);
}

function powerRow() {
  let s = "";
  for (let i = 0; i < 10; i++) {
    const x = -320 + i * 66;
    s += MAT("darksteel", slab(x, -148, 28, 14, 0, 28, 1, 0.2));
    s += MAT("steel", slab(x + 3, -145, 22, 2, 18, 6, 0.5, 0.1));
    for (let j = 0; j < 3; j++) s += dot([x + 7 + j * 6, -143.6, 10 + (i % 2) * 4], 0.9, j === 1 ? "cf-plasma" : "cf-led");
  }
  return named("Power cabinets", s);
}

function cmp() {
  const { x, y } = CMP;
  let s = MAT("darksteel", slab(x - 18, y - 15, 36, 30, 0, 9, 2, 0.25));
  s += MAT("white", slab(x - 16, y - 13, 32, 26, 9, 10, 1.5, 0.3));
  s += MAT("chrome", cyl(x - 4, y, 9, 19, 2, 24));
  s += MAT("teal", cyl(x - 4, y, 7, 21, 1, 24));
  s += MAT("steel", slab(x + 8, y - 8, 6, 16, 19, 12, 1, 0.2));
  s += '<g data-part="cmp"></g>';
  return named("CMP polisher", s);
}

function agvBay() {
  let s = MAT("white", slab(-336, 92, 660, 24, -1, 1.4, 4, 0.15));
  for (let x = -330; x <= 320; x += 40) s += line3([[x, 94, 0.5], [x + 18, 94, 0.5]], "cf-aisle");
  s += '<g data-part="agv"></g>';
  return named("AGV aisle", s);
}

function outbound() {
  let s = MAT("white", slab(286, 74, 76, 70, -1, 2, 4, 0.2));
  for (let i = 0; i < 3; i++) {
    const x = 294 + i * 24, y = 84;
    s += MAT("wood", slab(x, y, 20, 26, 0, 4, 1, 0.2));
    s += MAT("cream", slab(x + 2, y + 2, 16, 20, 4, 12, 0.8, 0.2));
    s += MAT("orange", slab(x + 2, y + 2, 16, 3, 16, 2, 0.5, 0.1));
  }
  s += MAT("steel", slab(286, 112, 76, 4, 0, 22, 1, 0.2));
  return named("Outbound dock", s);
}

function frontRow() {
  const xs = [-300, -234, -168];
  let s = "";
  xs.forEach((x, i) => {
    s += MAT("darksteel", slab(x, 76, 44, 32, 0, 6, 2, 0.25));
    s += MAT("white", slab(x + 2, 78, 40, 28, 6, 20, 1.5, 0.3));
    s += MAT(i === 1 ? "orange" : "teal", slab(x + 30, 80, 8, 22, 9, 12, 0.8, 0.15));
    s += MAT("glass", slab(x + 8, 96, 16, 4, 14, 8, 0.6, 0.1));
    s += MAT("chrome", cyl(x + 10, 86, 4, 26, 4, 16));
    s += dot([x + 6, 96, 22], 1.1, i === 2 ? "cf-plasma" : "cf-led");
  });
  s += MAT("chrome", cyl(-330, 92, 3.4, 0, 16, 14));
  s += MAT("chrome", cyl(-322, 96, 3.4, 0, 16, 14));
  s += MAT("steel", slab(-335, 86, 20, 18, 16, 3, 1, 0.2));
  return named("Inspection row", s);
}

function oht() {
  let s = line3(OHT, "cf-rail");
  for (let i = 0; i < 26; i++) {
    const p = along(OHT, i / 26);
    s += line3([[p[0], p[1], p[2]], [p[0], p[1], 116]], "cf-hanger");
  }
  s += line3(OHT, "cf-rail-lit");
  return named("Overhead hoist fleet", s + '<g data-part="oht"></g>');
}

function stocker() {
  const x = -340, y = -36, w = 46, d = 72;
  let s = MAT("darksteel", slab(x - 2, y - 2, w + 4, d + 4, 0, 8, 2, 0.3));
  s += MAT("white", slab(x, y, w, d, 8, 66, 2, 0.5));
  s += MAT("darksteel", slab(x + w - 3, y + 5, 1.4, d - 10, 16, 46, 0.5, 0.1));
  for (let i = 0; i < 7; i++) s += line3([[x + w - 2.4, y + 8, 20 + i * 6], [x + w - 2.4, y + d - 8, 20 + i * 6]], "cf-slot");
  s += MAT("steel", slab(x - 3, y - 3, w + 6, d + 6, 74, 5, 2, 0.4));
  s += MAT("teal", slab(x + 4, y + d - 8, 12, 2, 66, 3, 0.4, 0.1));
  s += '<g data-part="stockerlift"></g>';
  return named("Stocker", s);
}

function coater() {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const x = -294 + i * 32, y = 10;
    s += MAT("darksteel", slab(x, y, 28, 38, 0, 12, 2, 0.25));
    s += MAT("white", slab(x + 2, y + 2, 24, 34, 12, 18, 1.5, 0.35));
    s += MAT("steel", slab(x + 3, y + 4, 22, 8, 30, 2, 1, 0.1));
    s += MAT("chrome", cyl(x + 14, y + 20, 8, 28, 3, 24));
    s += MAT("teal", slab(x + 4, y + 5, 6, 3, 24, 1, 0.3, 0.1));
  }
  s += '<g data-part="coater"></g>';
  return named("Coat track", s);
}

function scanner() {
  const { x, y } = SCAN;
  let s = MAT("darksteel", slab(x - 58, y - 42, 116, 86, 0, 20, 4, 0.4));
  s += MAT("white", slab(x - 54, y - 38, 32, 72, 20, 34, 2, 0.5));
  s += MAT("white", slab(x + 22, y - 38, 32, 72, 20, 34, 2, 0.5));
  s += MAT("cream", slab(x - 54, y - 38, 108, 10, 54, 8, 2, 0.5));
  s += MAT("cream", slab(x - 54, y + 26, 108, 8, 54, 8, 2, 0.5));
  s += MAT("chrome", slab(x - 40, y - 4, 80, 30, 20, 4, 2, 0.3));
  s += MAT("carbon", slab(x - 34, y + 10, 68, 6, 24, 2, 1, 0.1));
  // lens column hanging from the bridge
  s += MAT("white", cyl(x, y - 4, 14, 44, 18, 30));
  s += MAT("chrome", cyl(x, y - 4, 11, 36, 12, 28));
  s += MAT("steel", cyl(x, y - 4, 13, 62, 4, 30));
  s += MAT("violet", cyl(x, y - 4, 8, 34, 2, 24), ' class="cf-lens"');
  // source box on the right tower
  s += MAT("darksteel", slab(x + 26, y - 22, 26, 36, 62, 22, 2, 0.3));
  s += MAT("violet", slab(x + 29, y - 18, 20, 8, 84, 2, 1, 0.2), ' class="cf-lamp"');
  const t = at([x - 46, y + 36, 36]);
  s += `<text class="cf-screen" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">EUV · 13.5 nm</text>`;
  s += dot([x - 48, y + 32, 30], 1.4, "cf-led");
  s += dot([x + 46, y + 32, 30], 1.4, "cf-led");
  // animated optical path and the two live stages
  s += line3([[x + 26, y - 4, 86], [x + 6, y - 4, 84], [x, y - 4, 78]], "cf-beam");
  s += line3([[x, y - 4, 62], [x, y - 4, 28]], "cf-beam");
  s += '<g data-part="reticle"></g>';
  s += '<g data-part="stage"></g>';
  s += `<circle class="cf-flash" cx="${at([x, y - 4, 27])[0].toFixed(1)}" cy="${at([x, y - 4, 27])[1].toFixed(1)}" r="4.5"/>`;
  return named("EUV scanner", s);
}

function cluster() {
  const { x, y } = CLUSTER;
  let s = MAT("darksteel", slab(x - 26, y - 26, 52, 52, 0, 6, 6, 0.3));
  s += MAT("white", cyl(x, y, 17, 6, 24, 28));
  s += MAT("chrome", cyl(x, y, 12, 30, 4, 24));
  const angs = [45, 135, 225, 315];
  angs.forEach((a, i) => {
    const px = x + Math.cos((a * Math.PI) / 180) * 32;
    const py = y + Math.sin((a * Math.PI) / 180) * 32;
    s += MAT("steel", cyl(px, py, 10, 0, 18, 20));
    s += MAT("darksteel", cyl(px, py, 11, 18, 3, 20));
    s += MAT("glass", cyl(px, py, 7, 21, 1.4, 18));
    s += dot([px, py, 23], 2.2, "cf-plasma");
    s += line3([[px, py, 12], [px + (x - px) * 0.6, py + (y - py) * 0.6, 12]], "cf-duct");
  });
  s += '<g data-part="cluster"></g>';
  return named("Etch cluster", s);
}

function metrology() {
  const x = 88, y = 40;
  let s = MAT("darksteel", slab(x, y, 34, 24, 0, 10, 2, 0.2));
  s += MAT("white", slab(x + 2, y + 2, 30, 20, 10, 14, 1.5, 0.3));
  s += MAT("chrome", slab(x + 4, y + 16, 26, 3, 22, 2, 0.6, 0.1));
  s += MAT("glass", slab(x + 5, y + 8, 12, 8, 24, 1.2, 0.5, 0.1));
  s += dot([x + 24, y + 8, 20], 1.3, "cf-led");
  return named("Metrology", s);
}

function dicing() {
  const { x, y } = DICE;
  let s = MAT("darksteel", slab(x - 26, y - 24, 52, 48, 0, 8, 3, 0.3));
  s += MAT("white", slab(x - 22, y - 20, 44, 40, 8, 12, 2, 0.3));
  s += MAT("chrome", slab(x - 16, y - 12, 32, 26, 20, 2, 1, 0.1));
  s += MAT("steel", slab(x - 24, y + 18, 48, 4, 8, 26, 1, 0.2));
  s += MAT("steel", slab(x - 24, y - 22, 48, 4, 8, 26, 1, 0.2));
  s += MAT("steel", slab(x - 26, y - 22, 4, 44, 32, 4, 1, 0.2));
  s += wafer(x, y - 2, 23, 13);
  s += line3([[x - 20, y + 16, 34], [x - 10, y + 8, 26], [x - 4, y + 1, 24]], "cf-waterjet");
  s += '<g data-part="blade"></g>';
  s += `<text class="cf-screen" x="${at([x - 20, y + 22, 12])[0].toFixed(1)}" y="${at([x - 20, y + 22, 12])[1].toFixed(1)}">DICE</text>`;
  return named("Dicing saw", s);
}

function bonder() {
  const { x, y } = BOND;
  let s = MAT("darksteel", slab(x - 24, y - 20, 48, 40, 0, 9, 2, 0.25));
  s += MAT("white", slab(x - 20, y - 16, 40, 32, 9, 8, 1.5, 0.3));
  for (const dx of [-18, 16]) s += MAT("steel", cyl(x + dx, y - 12, 2, 17, 42, 12));
  s += MAT("cream", slab(x - 22, y - 14, 44, 10, 56, 7, 2, 0.4));
  s += MAT("chrome", slab(x - 14, y + 4, 28, 18, 17, 2, 1, 0.1));
  s += MAT("pcb", slab(x - 8, y + 6, 16, 14, 19, 1.4, 0.5, 0.1));
  for (let i = 0; i < 3; i++) {
    s += MAT("gold", slab(x - 6 + i * 5, y + 8, 3, 3, 20.6, 0.8, 0.3, 0.1));
  }
  s += '<g data-part="bondhead"></g>';
  return named("Wire bonder", s);
}

function packline() {
  const { x, y } = PACK;
  let s = MAT("darksteel", slab(x - 14, y - 6, 84, 20, 0, 12, 2, 0.25));
  for (let i = 0; i < 12; i++) s += MAT("steel", cyl(x - 10 + i * 7, y - 2, 2.4, 11, 2.4, 12));
  s += MAT("steel", slab(x - 14, y - 8, 84, 3, 12, 4, 1, 0.2));
  s += MAT("steel", slab(x - 14, y + 11, 84, 3, 12, 4, 1, 0.2));
  // test handler tower
  s += MAT("white", slab(x - 30, y - 18, 26, 28, 0, 52, 2, 0.4));
  s += MAT("glass", slab(x - 27, y - 15, 16, 14, 30, 14, 1, 0.1));
  s += MAT("teal", slab(x - 27, y - 15, 20, 2, 56, 3, 0.5, 0.1));
  s += dot([x - 5, y - 5, 44], 1.3, "cf-led");
  s += '<g data-part="packages"></g>';
  const t = at([x - 18, y - 10, 60]);
  s += `<text class="cf-screen" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">PACK & TEST</text>`;
  return named("Test handler", s);
}

function subfab() {
  const x = -342, y = 118, w = 268, d = 38;
  let s = MAT("darksteel", slab(x - 2, y - 2, w + 4, d + 4, -1, 3, 2, 0.2));
  s += MAT("carbon", slab(x + 2, y + 2, w - 4, d - 4, 1, 1.2, 1, 0.1));
  s += MAT("blue", slab(x + 6, y + 6, w - 12, 2.4, 2.4, 2.4, 0.6, 0.1));
  s += MAT("orange", slab(x + 6, y + 12, w - 12, 2.4, 2.4, 2.4, 0.6, 0.1));
  s += MAT("steel", slab(x + 6, y + 18, w - 12, 2.4, 2.4, 2.4, 0.6, 0.1));
  for (let i = 0; i < 4; i++) {
    const px = x + 30 + i * 60;
    s += MAT("white", cyl(px, y + 26, 6, 2, 6, 16));
    s += MAT("teal", cyl(px, y + 26, 4.4, 8, 3, 16));
    s += dot([px, y + 26, 11.4], 1.4, i % 2 ? "cf-plasma" : "cf-led");
    s += line3([[px, y + 26, 2], [px, y + 18, 2]], "cf-duct");
  }
  for (const px of [x + 16, x + w - 16]) {
    s += MAT("steel", slab(px - 2, y + 6, 4, 4, 2, 8, 0.5, 0.1));
    s += line3([[px, y + 8, 10], [px, y + 24, 10]], "cf-ductdrop");
  }
  const t = at([x + 8, y + 34, 3]);
  s += `<text class="cf-floortext" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">SUBFAB · VACUUM & CHILLER</text>`;
  return named("Sub-fab services", s);
}

function toolLabels() {
  const items = [["CVD", -6, -112, 40], ["PVD", 72, -112, 40], ["ETCH", 150, -112, 40], ["LITHO", -246, 46, 12], ["CMP", -44, 100, 12], ["CVD", 84, 64, 30], ["DICE", 128, -40, 10], ["BOND", 208, 30, 12], ["TEST", 262, 24, 58]];
  let s = "";
  for (const [text, x, y, z] of items) {
    const t = at([x, y, z]);
    s += `<text class="cf-screen" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">${text}</text>`;
  }
  return s;
}

function flow() {
  return `<g class="cf-flow">${line3(FLOW, "cf-flowline")}<g data-part="flowwafers"></g></g>`;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "cf-svg",
    label: "A semiconductor cleanroom in isometric cutaway. Overhead hoist vehicles carry wafer pods above a yellow lithography bay with a coat track and an EUV scanner. An etch and deposition cluster, metrology, dicing saw, wire bonder and test line fill the hall.",
    body: [ground(), shell(), powerRow(), toolRow(), stocker(), coater(), scanner(), cluster(), metrology(), cmp(), frontRow(), dicing(), bonder(), packline(), subfab(), agvBay(), outbound(), toolLabels(), oht(), flow()],
  });
  const plate = k.plateHtml({
    fig: "Fig 28", title: "Semiconductor fab", hint: "Follow one wafer",
    readout: "", body: `<div class="iso-stage cf-stage" tabindex="0" role="img" aria-label="Semiconductor cleanroom">${svg}</div>`,
  });

  const css = `
.cf-grid{stroke:var(--anatomy-faint);stroke-width:.8;opacity:.45}
.cf-aisle{stroke:var(--anatomy-faint);stroke-width:1.2;opacity:.7;stroke-dasharray:10 8}
.cf-ductdrop{stroke:var(--anatomy-muted);stroke-width:1.1;opacity:.55}
.cf-floortext{fill:var(--anatomy-muted);font:600 9px "LabMono",ui-monospace,monospace;letter-spacing:.16em;opacity:.8}
.cf-ceilbeam{stroke:var(--anatomy-faint);stroke-width:1;opacity:.5}
.cf-lampwire{stroke:var(--anatomy-muted);stroke-width:.8;opacity:.7}
.cf-lamp{animation:cf-glow 2.4s ease-in-out infinite}
.cf-slot{stroke:var(--anatomy-faint);stroke-width:.9;opacity:.8}
.cf-duct{stroke:var(--anatomy-muted);stroke-width:1;opacity:.8}
.cf-bayfloor{opacity:.16;mix-blend-mode:multiply}
body[data-theme="dark"] .cf-bayfloor{opacity:.22;mix-blend-mode:screen}
.cf-notch{stroke:#8fb8ff;stroke-width:1;opacity:.85}
.cf-rail{stroke:#4a5566;stroke-width:3;fill:none;stroke-linejoin:round}
.cf-rail-lit{stroke:#93a4ba;stroke-width:1.1;fill:none;opacity:.75}
.cf-hanger{stroke:var(--anatomy-faint);stroke-width:.9;opacity:.6}
.cf-blade{stroke:#2a3340;stroke-width:1.2;opacity:.9}
.cf-wire{stroke:#e9b949;stroke-width:1.2;fill:none;filter:drop-shadow(0 0 2px #e9b949)}
.cf-screen{fill:var(--anatomy-muted);font:600 8px "LabMono",ui-monospace,monospace;letter-spacing:.08em}
.cf-beam{stroke:#b48cff;stroke-width:2;stroke-dasharray:4 6;fill:none;animation:cf-dash .7s linear infinite;filter:drop-shadow(0 0 4px #8a5cff)}
.cf-flash{fill:#d9c2ff;filter:drop-shadow(0 0 6px #9c6bff);animation:cf-flash .55s steps(2) infinite}
.cf-lens{animation:cf-glow 1.4s ease-in-out infinite}
.cf-plasma{fill:#c07bff;animation:cf-plasma .9s ease-in-out infinite;filter:drop-shadow(0 0 4px #9a4bff)}
.cf-led{fill:#63e6a3;animation:cf-blink 1.6s steps(2) infinite}
.cf-waterjet{stroke:#7fd4f0;stroke-width:1.4;stroke-dasharray:3 4;fill:none;animation:cf-dash .5s linear infinite;opacity:.85}
.cf-flow{display:none}
body[data-mode="flow"] .cf-flow{display:block}
body[data-mode="flow"] .cf-svg>g:not(.cf-flow){opacity:.72;transition:opacity .3s}
.cf-flowline{stroke:#3cc8d8;stroke-width:2;stroke-dasharray:7 7;fill:none;animation:cf-dash 1s linear infinite;filter:drop-shadow(0 0 4px #3cc8d8)}
@keyframes cf-dash{to{stroke-dashoffset:-24}}
@keyframes cf-glow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes cf-flash{0%,49%{opacity:.9}50%,100%{opacity:.15}}
@keyframes cf-plasma{0%,100%{opacity:.25}45%{opacity:1}70%{opacity:.5}}
@keyframes cf-blink{0%,55%{opacity:1}56%,100%{opacity:.25}}
${materialsCss(["floor", "white", "cream", "steel", "darksteel", "chrome", "yellow", "violet", "teal", "green", "pcb", "carbon", "gold", "glass", "blue", "orange", "wood"])}
`;

  const live = `
const state = initialState();
const ohtEl = part("oht"), stageEl = part("stage"), reticleEl = part("reticle"), coaterEl = part("coater"),
  clusterEl = part("cluster"), bladeEl = part("blade"), bondEl = part("bondhead"), packEl = part("packages"),
  liftEl = part("stockerlift"), flowEl = part("flowwafers"), cmpEl = part("cmp"), agvEl = part("agv");
let lastPaint = 0, lastGauge = 0, oht = 0;
const SCAN = C.SCAN, CLUSTER = C.CLUSTER, DICE = C.DICE, BOND = C.BOND, PACK = C.PACK;
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
Lab.onAction((a) => {
  if (a === "reset") { Object.assign(state, initialState()); Lab.set("starts", 90); Lab.set("euv", 250); Lab.set("overlay", 3); Lab.set("defects", 0.08); }
});

function waferSvg(x, y, z, r, angle, tone) {
  let s = MAT(tone || "chrome", S(G.disc(0, 0.9, r, G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P)));
  s += line3([[x, y, z + 0.95], [x + Math.cos(angle) * r * 0.8, y + Math.sin(angle) * r * 0.8, z + 0.95]], "cf-notch");
  return s;
}

function podSvg(p, i) {
  const base = p[2];
  let s = MAT("steel", slab(p[0] - 5, p[1] - 4, 10, 8, base - 4, 4, 1, 0.15));
  s += line3([[p[0] - 3, p[1], base - 4], [p[0] - 3, p[1], base - 12]], "cf-duct");
  s += line3([[p[0] + 3, p[1], base - 4], [p[0] + 3, p[1], base - 12]], "cf-duct");
  s += MAT(i % 2 ? "teal" : "white", slab(p[0] - 5, p[1] - 4, 10, 8, base - 22, 10, 1, 0.25));
  s += MAT("orange", slab(p[0] - 4, p[1] + 4, 8, 1, base - 21, 8, 0.4, 0.1));
  s += MAT("carbon", slab(p[0] - 6, p[1] - 5, 12, 10, base - 24, 2, 1, 0.2));
  s += dot([p[0] - 3, p[1] - 2, base - 13], 0.8, "cf-led");
  return s;
}

function ohtSvg(now) {
  let s = "";
  for (let i = 0; i < 8; i++) {
    const p = along(C.OHT, (now * 0.042 + i / 8) % 1);
    s += podSvg(p, i);
  }
  return s;
}

function stageSvg(now) {
  const f = (now * 0.55) % 1;
  const idx = Math.floor(f * 6), local = (f * 6) % 1;
  const sweep = local < 0.62 ? ease(local / 0.62) : 1 - ease((local - 0.62) / 0.38);
  const col = idx % 3, row = Math.floor(idx / 3);
  const sx = SCAN.x + (col - 1) * 7;
  const sy = SCAN.y + 6 + (row - 0.5) * 5 + (sweep - 0.5) * 4;
  let s = MAT("darksteel", slab(sx - 8, sy - 6, 16, 12, 24, 4, 1, 0.2));
  s += MAT("chrome", slab(sx - 6, sy - 4, 12, 8, 28, 1, 0.6, 0.1));
  s += waferSvg(sx, sy, 29, 4.6, now * 3);
  return s;
}

function reticleSvg(now) {
  const f = (now * 0.55) % 1;
  const idx = Math.floor(f * 6), local = (f * 6) % 1;
  const sweep = local < 0.62 ? ease(local / 0.62) : 1 - ease((local - 0.62) / 0.38);
  const col = idx % 3;
  const rx = SCAN.x - (col - 1) * 5 - (sweep - 0.5) * 6;
  let s = MAT("steel", slab(rx - 7, SCAN.y - 10, 14, 12, 63, 1.6, 0.6, 0.1));
  s += MAT("violet", slab(rx - 5, SCAN.y - 8, 10, 8, 64.6, 0.5, 0.3, 0.1), ' class="cf-lens"');
  return s;
}

function coaterSvg(now) {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const x = -281 + i * 32, y = 30;
    s += waferSvg(x, y, 31.4, 7.2, now * (5 + i) + i);
    s += dot([x, y, 32.4], 1.2, "cf-led");
  }
  return s;
}

function clusterSvg(now) {
  const a = now * 1.4;
  const x = CLUSTER.x, y = CLUSTER.y;
  const ex = x + Math.cos(a) * 20, ey = y + Math.sin(a) * 20;
  let s = MAT("chrome", cyl(x, y, 3, 30, 5, 14));
  s += line3([[x, y, 34], [ex, ey, 34]], "cf-duct");
  s += MAT("chrome", slab(ex - 3, ey - 2, 6, 4, 32, 3, 0.8, 0.1));
  s += dot([ex, ey, 36], 1.7, "cf-plasma");
  return s;
}

function bladeSvg(now) {
  const { x, y } = DICE;
  const F = G.frameOf([x, y - 2, 36], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  let s = MAT("chrome", S(G.disc(-1.6, 1.6, 14, F, P)));
  for (let i = 0; i < 10; i++) {
    const a0 = now * 9 + (i / 10) * TAU;
    const p0 = G.pointOf(F, 0, 2, a0), p1 = G.pointOf(F, 0, 12.5, a0 + 0.18);
    s += line3([p0, p1], "cf-blade");
  }
  return s;
}

function bondSvg(now) {
  const { x, y } = BOND;
  const bob = 3.4 * Math.abs(Math.sin(now * 3.1));
  const z = 50 - bob;
  const hx = x - 6 + Math.sin(now * 1.7) * 3;
  let s = MAT("chrome", slab(hx - 3, y + 2, 6, 6, z, 4, 0.8, 0.1));
  s += line3([[hx, y + 4, z], [hx, y + 4, 26]], "cf-wire");
  s += line3([[hx, y + 4, 24], [hx + 3, y + 5, 21], [hx + 7, y + 6, 21]], "cf-wire");
  s += dot([hx + 7, y + 6, 21], 1.2, "cf-plasma");
  return s;
}

function packSvg(now) {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const x = PACK.x - 8 + ((now * 18 + i * 18) % 68);
    s += MAT("cream", slab(x, PACK.y - 2, 9, 9, 13.4, 5, 0.7, 0.2));
    s += MAT("pcb", slab(x + 1, PACK.y - 1, 7, 7, 18.4, 1, 0.4, 0.1));
    s += MAT("gold", slab(x + 2, PACK.y, 1.4, 1.4, 19.4, 0.4, 0.2, 0.1));
  }
  return s;
}

function liftSvg(now) {
  const z = 24 + 30 * (0.5 + 0.5 * Math.sin(now * 0.7));
  let s = MAT("chrome", slab(-322, -18, 14, 34, z, 2, 0.8, 0.1));
  s += MAT("orange", slab(-320, -16, 10, 30, z + 2, 4, 0.5, 0.1));
  return s;
}

function flowSvg(now) {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const p = along(C.FLOW, (now * 0.02 + i / 3) % 1);
    s += waferSvg(p[0], p[1], p[2], 4.6, now * 2 + i, "teal");
  }
  return s;
}

function cmpSvg(now) {
  const { x, y } = C.CMP;
  const a = now * 2.4;
  let s = MAT("chrome", slab(x - 7, y - 1.4, 14, 2.8, 22, 1.4, 0.7, 0.1));
  s += line3([[x - 4, y, 23.8], [x + 4, y, 23.8]], "cf-blade");
  s += dot([x - 4 + Math.cos(a) * 4.6, y + Math.sin(a) * 1.2, 22.6], 1.1, "cf-plasma");
  s += line3([[x + 10, y - 6, 20], [x + 2, y, 23], [x - 2, y, 23]], "cf-waterjet");
  return s;
}

function agvSvg(now) {
  let s = "";
  for (let i = 0; i < 3; i++) {
    let f = (now * 0.06 + i / 3) % 2;
    let p;
    if (f < 1) p = along(C.AGV, f);
    else { const rev = [C.AGV[1], C.AGV[0], [C.AGV[0][0], C.AGV[0][1], C.AGV[0][2]]]; p = along(rev, f - 1); }
    s += MAT("rubber", slab(p[0] - 8, p[1] - 6, 16, 12, 1, 3, 1, 0.2));
    s += MAT("orange", slab(p[0] - 7, p[1] - 5, 14, 10, 4, 3, 1.5, 0.2));
    s += MAT("darksteel", slab(p[0] - 5, p[1] - 4, 10, 8, 7, 1, 0.6, 0.1));
    s += dot([p[0] - 5, p[1] - 4, 8.2], 0.9, "cf-led");
    if (i !== 1) {
      s += MAT("cream", slab(p[0] - 4, p[1] - 3, 8, 6, 8, 8, 0.8, 0.2));
      s += MAT("teal", slab(p[0] - 4, p[1] + 2.4, 8, 0.8, 9, 6, 0.3, 0.1));
    }
  }
  return s;
}

const cv = document.querySelector(".cf-chart");
function drawMap(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), rule = cs.getPropertyValue("--lab-rule");
  const cx = w * 0.30, cy = h * 0.52, R = Math.min(w * 0.24, h * 0.43);
  const n = 27, s = (R * 2) / n;
  const fail = 1 - o.yield;
  let good = 0, total = 0;
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const px = (gx - n / 2 + 0.5) * s + ((gy % 2) * s) / 2;
      const py = (gy - n / 2 + 0.5) * s;
      if (Math.hypot(px, py) > R * 0.96) continue;
      const hsh = Math.abs(Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453) % 1;
      const pass = hsh > fail;
      total++; if (pass) good++;
      ctx.fillStyle = pass ? "rgba(60,166,107,.92)" : "rgba(216,64,44,.9)";
      ctx.fillRect(cx + px - s * 0.42, cy + py - s * 0.42, s * 0.84, s * 0.84);
    }
  }
  ctx.strokeStyle = "rgba(140,160,190,.45)";
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = muted;
  ctx.font = "500 15px ui-monospace,monospace"; ctx.textAlign = "left";
  ctx.fillText("300 mm wafer · 600 dies · " + Math.round((good / total) * 100) + "% good", 12, 22);
  ctx.fillStyle = "#3aa36b"; ctx.fillRect(w * 0.62, h * 0.30, 9, 9);
  ctx.fillStyle = muted; ctx.font = "500 14px ui-monospace,monospace"; ctx.fillText("pass", w * 0.62 + 15, h * 0.30 + 9);
  ctx.fillStyle = "#d8402c"; ctx.fillRect(w * 0.62, h * 0.42, 9, 9);
  ctx.fillStyle = muted; ctx.fillText("fail", w * 0.62 + 15, h * 0.42 + 9);
  ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(w * 0.60, 16); ctx.lineTo(w * 0.60, h - 16); ctx.stroke();
}

function frame(dt, now) {
  const u = { starts: Lab.value("starts"), euv: Lab.value("euv"), overlay: Lab.value("overlay"), defects: Lab.value("defects") };
  step(state, u, Math.min(dt * SIM_SPEED, 30));
  const o = outputs(state);
  if (now - lastPaint > 0.085) {
    lastPaint = now;
    setHtml(ohtEl, ohtSvg(now));
    setHtml(stageEl, stageSvg(now));
    setHtml(reticleEl, reticleSvg(now));
    setHtml(coaterEl, coaterSvg(now));
    setHtml(clusterEl, clusterSvg(now));
    setHtml(bladeEl, bladeSvg(now));
    setHtml(bondEl, bondSvg(now));
    setHtml(packEl, packSvg(now));
    setHtml(liftEl, liftSvg(now));
    setHtml(cmpEl, cmpSvg(now));
    setHtml(agvEl, agvSvg(now));
    setHtml(flowEl, flowSvg(now));
  }
  if (now - lastGauge > 0.25) {
    lastGauge = now;
    Lab.gauge("thru", Math.round(o.thru) + " /h");
    Lab.gauge("yield", (o.yield * 100).toFixed(1) + " %", o.yield < 0.7);
    Lab.gauge("good", Math.round(o.good).toLocaleString("en-US") + " /h", o.yield < 0.7);
    Lab.gauge("overlay", o.overlay.toFixed(1) + " nm", o.overlay > 4);
    Lab.gauge("defect", o.defects.toFixed(3) + " /cm²", o.defects > 0.2);
    Lab.gauge("wafers", Math.round(o.done).toLocaleString("en-US"));
    Lab.gauge("bottleneck", o.bottleneck.toUpperCase());
    readout(Math.round(o.thru) + " wph · " + (o.yield * 100).toFixed(0) + "% yield · " + o.bottleneck + " limit");
    document.body.dataset.bottleneck = o.bottleneck;
    drawMap(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { OHT, AGV, CMP, FLOW, SCAN, CLUSTER, DICE, BOND, PACK }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Wafer map</span><em>tested dies</em></div><canvas class="cf-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
