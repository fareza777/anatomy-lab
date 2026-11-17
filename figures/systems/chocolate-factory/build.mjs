// Bean-to-bar chocolate factory on one isometric floor.
// Back row (left to right): drum roaster, winnower, melanger, conche, then the tempering
// machine. A heated pipe carries tempered chocolate over to the front row, where a depositor
// fills polycarbonate moulds on a conveyor that runs through a cooling tunnel into a wrapper.
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
export const HEIGHT = 480;

const FLOOR = { x: -306, y: -150, w: 580, d: 292, r: 14 };
const BELT = { y0: 67, y1: 113, z: 56, x0: -112, x1: 256 };
const DEP_X = 182;
const TUN = { x0: -22, x1: 122 };
const WRAP = { x0: -196, x1: -112 };
const BOX = { x: -296, y: 64, w: 50, d: 52 };
const ROAST = { x: -238, y: -104 };
const WINN = { x: -134, y: -108 };
const MEL = { x: -24, y: -104 };
const CON = { x0: 54, x1: 172, y: -104 };
const TEMP = { x: 226, y: -58 };

const P = k.fitProjection(
  [...k.boxCorners(FLOOR, -12, 0), [ROAST.x, ROAST.y - 40, 214], [TEMP.x, TEMP.y, 200], [DEP_X, 90, 200]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 45, elevation: 30 },
);

const S = (paths, style = { tone: "hi" }) => k.solidSvg(paths, style);
const Ln = (d, style = { tone: "mid" }) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const at = (p) => k.iso(p, P);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const Yf = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const slab = (x, y, w, d, z, h, r = 2, bevel = 0.6) => S(k.slabOf({ x, y, w, d, r }, z, h, P, r > 4 ? 8 : 3, bevel));
const halo = (x, y, w, d, z = 0, h = 4) => `<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 4 }, z, h, P)}" style="filter:blur(6px)"/>`;
const named = (name, svg, part = "") => `<g data-name="${name}"${part ? ` data-part="${part}"` : ""}>${svg}</g>`;
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(4, r * 3), 8, { P, tube: r });
  return tubePieces(route, r, P, { maxLength: 400, ...opts }).map((p) => tubeSvg(p, { tone: "hi" })).join("");
}
const faceQuad = (pts, cls) => `<path class="${cls}" d="${k.pathOf(pts.map(at), true)}"/>`;

// ---- floor -------------------------------------------------------------------------------
function floor() {
  let s = `<path class="iso-halo" d="${k.haloOf(FLOOR, -12, 12, P)}"/>`;
  s += mat("floor", S(k.slabOf(FLOOR, -12, 12, P, 8, 1.2)) +
    // epoxy tiles
    Array.from({ length: 10 }, (_, i) => Ln(k.lineOnTop([FLOOR.x + 56 * (i + 0.5), FLOOR.y + 8], [FLOOR.x + 56 * (i + 0.5), FLOOR.y + FLOOR.d - 8], 0, P), { tone: "faint" })).join("") +
    Array.from({ length: 4 }, (_, i) => Ln(k.lineOnTop([FLOOR.x + 8, FLOOR.y + 62 * (i + 0.6)], [FLOOR.x + FLOOR.w - 8, FLOOR.y + 62 * (i + 0.6)], 0, P), { tone: "faint" })).join(""));
  // yellow walkway lines between the two rows
  s += mat("yellow", [10, 40].map((y) => S(k.slabOf({ x: FLOOR.x + 18, y, w: FLOOR.w - 36, d: 4, r: 1 }, 0, 0.4, P, 2), { tone: "hi", crease: "none" })).join(""));
  // hatched safety zone in front of the depositor
  for (let i = 0; i < 8; i++) s += mat("yellow", S(k.slabOf({ x: 150 + i * 9, y: 120, w: 5, d: 22, r: 1 }, 0, 0.4, P, 2), { tone: "hi", crease: "none" }));
  return s;
}

// Raw beans arrive in jute sacks on a wooden pallet beside the roaster.
function sacks() {
  const px = -292, py = -64;
  let s = halo(px, py, 64, 52);
  let pallet = "";
  for (const y of [py, py + 22, py + 44]) pallet += slab(px, y, 64, 8, 0, 5, 1, 0.3);
  pallet += slab(px, py, 64, 52, 5, 3, 1, 0.3);
  s += mat("wood", pallet);
  let bags = "";
  const spots = [[px + 2, py + 2, 8], [px + 32, py + 2, 8], [px + 2, py + 26, 8], [px + 32, py + 26, 8], [px + 16, py + 12, 24]];
  for (const [x, y, z] of spots) {
    bags += S(k.slabOf({ x, y, w: 30, d: 24, r: 9 }, z, 16, P, 8, 1.2));
    bags += Ln(k.sideSeam({ x, y, w: 30, d: 24, r: 9 }, z + 8, P, 8), { tone: "lo", dashed: true });
  }
  s += named("Cocoa bean sacks", mat("sand", bags) + mat("red", k.faceTextSvg(k.topMatrix([px + 20, py + 26], 40, P, "x"), "CACAO", { size: 5, tone: "hi" })));
  return s;
}

// ---- back row -----------------------------------------------------------------------------
function roaster() {
  const { x, y } = ROAST;
  let s = halo(x - 44, y - 34, 92, 72);
  let cab = slab(x - 42, y - 32, 84, 62, 0, 52, 3, 0.8);
  cab += Ln(k.sideSeam({ x: x - 42, y: y - 32, w: 84, d: 62, r: 3 }, 40, P, 3), { tone: "lo" });
  // drum supports
  cab += slab(x - 40, y - 8, 8, 16, 52, 14, 1.5) + slab(x + 32, y - 8, 8, 16, 52, 14, 1.5);
  s += named("Roaster cabinet", mat("red", cab));
  // burner window on the front face (y = y+30), glowing with the flame
  s += named("Gas burner", faceQuad([[x - 26, y + 30.2, 12], [x + 4, y + 30.2, 12], [x + 4, y + 30.2, 32], [x - 26, y + 30.2, 32]], "cf-burner") + mat("darksteel", Ln(k.pathOf([at([x - 26, y + 30.3, 12]), at([x + 4, y + 30.3, 12]), at([x + 4, y + 30.3, 32]), at([x - 26, y + 30.3, 32])], true), { tone: "hi" })));
  // control knobs and a roast thermometer on the cabinet face
  s += mat("darksteel", [x + 16, x + 28].map((kx) => S(G.disc(y + 30, y + 34, 3.4, Yf([kx, 0, 22]), P))).join(""));
  // chimney
  s += named("Chimney", mat("darksteel", S(G.disc(52, 210, 7, Zf([x - 30, y - 24, 0]), P)) + S(G.disc(206, 214, 10, Zf([x - 30, y - 24, 0]), P))));
  // hopper
  const HF = Zf([x - 10, y, 0]);
  s += named("Bean hopper", mat("stainless", S(G.solidOf([[112, 6], [118, 6], [144, 24], [150, 25]], HF, P, { rims: "last" })) + S(G.disc(100, 112, 5, HF, P))) + mat("cocoa", S(G.disc(146.5, 148, 22.5, HF, P), { tone: "hi", crease: "none" })));
  // the drum itself is drawn live (it turns)
  s += `<g data-part="drum" data-name="Roasting drum"></g>`;
  // cooling sieve in front
  const CF = Zf([x + 4, y + 64, 0]);
  s += named("Cooling sieve", mat("stainless", S(G.disc(0, 20, 6, CF, P)) + S(G.solidOf([[20, 0.1], [20, 32], [28, 34], [28, 0.1]], CF, P))) + `<g data-part="sieve"></g>`);
  return s;
}

function winnower() {
  const { x, y } = WINN;
  let s = halo(x - 34, y - 30, 66, 60);
  let cab = slab(x - 30, y - 28, 60, 56, 0, 96, 3, 0.8) + Ln(k.sideSeam({ x: x - 30, y: y - 28, w: 60, d: 56, r: 3 }, 70, P, 3), { tone: "lo" });
  // inspection window with nibs falling behind it
  cab += faceQuad([[x - 18, y + 28.2, 30], [x + 10, y + 28.2, 30], [x + 10, y + 28.2, 62], [x - 18, y + 28.2, 62]], "cf-window");
  s += named("Winnower", mat("green", cab) + `<g data-part="nibs"></g>`);
  const CF = Zf([x, y - 6, 0]);
  s += named("Cyclone separator", mat("stainless", S(G.solidOf([[96, 4], [124, 18, 1], [128, 20], [156, 20], [160, 14]], CF, P)) + Ln(G.arcOf(CF, 140, 20, P), { tone: "lo" })));
  // blower on the side
  s += named("Air blower", mat("blue", S(G.disc(y + 28, y + 40, 16, Yf([x + 18, 0, 108]), P)) + S(G.disc(y + 40, y + 46, 6, Yf([x + 18, 0, 108]), P))));
  // shell bin
  s += named("Shell bin", mat("darksteel", slab(x - 46, y + 34, 30, 26, 0, 18, 2, 0.4)) + mat("cocoa", D(Array.from({ length: 22 }, (_, i) => at([x - 43 + (i * 7.3) % 24, y + 37 + ((i * 5.1) % 20), 18.5])), { size: 1.1, tone: "hi" })));
  return s;
}

function melanger() {
  const { x, y } = MEL;
  let s = halo(x - 40, y - 40, 80, 80);
  const F = Zf([x, y, 0]);
  s += named("Melanger stand", mat("teal", S(G.solidOf([[0, 34], [6, 36], [40, 30], [44, 30]], F, P)) + Ln(G.arcOf(F, 20, 33, P), { tone: "lo" })));
  s += named("Granite bowl", mat("stainless", S(G.lathe([[44, 40], [46, 42], [74, 42], [76, 40], [76, 36]], F, P, { fill: "hull" }))));
  s += `<g data-part="melanger" data-name="Granite rollers"></g>`;
  // sugar and milk powder dosing hoppers on a gantry
  s += mat("yellow", slab(x - 44, y - 6, 6, 12, 76, 60, 1.5) + slab(x + 38, y - 6, 6, 12, 76, 60, 1.5) + slab(x - 44, y - 6, 88, 12, 136, 8, 2));
  s += named("Sugar hopper", mat("white", S(G.solidOf([[100, 3], [108, 3], [126, 14], [136, 15]], Zf([x - 18, y, 0]), P))));
  s += named("Milk powder hopper", mat("cream", S(G.solidOf([[100, 3], [108, 3], [126, 14], [136, 15]], Zf([x + 18, y, 0]), P))));
  return s;
}

function conche() {
  const { x0, x1, y } = CON;
  let s = halo(x0 - 4, y - 32, x1 - x0 + 8, 64);
  let base = slab(x0, y - 30, x1 - x0, 60, 0, 30, 3, 0.6);
  base += [x0 + 10, x1 - 10].map((xx) => D([at([xx, y + 30, 6])], { size: 1, tone: "hi" })).join("");
  s += named("Conche frame", mat("blue", base));
  let trough = slab(x0 + 4, y - 26, x1 - x0 - 26, 52, 30, 40, 6, 1);
  s += named("Conche trough", mat("stainless", trough));
  // the chocolate pool and the paddle shaft are live (waves move)
  s += `<g data-part="conche" data-name="Conching paddles"></g>`;
  // gear motor at the end
  s += named("Gear motor", mat("orange", slab(x1 - 22, y - 18, 22, 36, 30, 30, 3, 0.6)) + mat("darksteel", S(G.disc(x1 - 22 - 6, x1 - 22, 9, Xf([0, y, 52]), P))));
  // heating-water jacket pipes
  s += named("Hot-water jacket", mat("copper", tube([[x0 + 12, y + 27, 40], [x0 + 12, y + 40, 40], [x1 - 40, y + 40, 40], [x1 - 40, y + 27, 40]], 2)));
  return s;
}

function temperer() {
  const { x, y } = TEMP;
  let s = halo(x - 34, y - 38, 68, 76);
  let cab = slab(x - 32, y - 36, 64, 72, 0, 112, 4, 1);
  cab += Ln(k.sideSeam({ x: x - 32, y: y - 36, w: 64, d: 72, r: 4 }, 22, P, 4), { tone: "lo" });
  s += named("Tempering machine", mat("white", cab) + mat("red", S(k.slabOf({ x: x - 32.4, y: y + 30, w: 64.8, d: 6.4, r: 1 }, 92, 8, P, 2), { tone: "hi", crease: "none" })));
  // the display on the front face (y = y+36) and its live temperature text
  const scr = [[x - 22, y + 36.2, 50], [x + 14, y + 36.2, 50], [x + 14, y + 36.2, 80], [x - 22, y + 36.2, 80]];
  s += named("Tempering display", faceQuad(scr, "cf-screen") + `<text data-part="temp-text" class="cf-screen-text" transform="${k.sideMatrix([x - 19, y + 36.3], 70, P, "left")}" font-size="11"></text><text data-part="temp-form" class="cf-screen-sub" transform="${k.sideMatrix([x - 19, y + 36.3], 57, P, "left")}" font-size="5.2"></text>`);
  // buttons
  s += mat("green", S(G.disc(y + 36, y + 39, 3, Yf([x + 22, 0, 72]), P))) + mat("red", S(G.disc(y + 36, y + 39, 3, Yf([x + 22, 0, 60]), P)));
  // kettle on top
  const KF = Zf([x, y - 6, 0]);
  s += named("Tempering kettle", mat("stainless", S(G.solidOf([[112, 24], [116, 27], [150, 27], [154, 25]], KF, P)) + Ln(G.arcOf(KF, 130, 27, P), { tone: "lo" })));
  s += named("Agitator motor", mat("yellow", S(G.disc(154, 172, 9, KF, P)) + S(G.disc(172, 176, 5, KF, P))));
  return s;
}

function pipes() {
  // conche -> temperer (low), temperer kettle -> depositor hopper (overhead, heated)
  let s = named("Chocolate pump line", mat("stainless", tube([[CON.x1 - 26, CON.y + 18, 52], [CON.x1 + 10, CON.y + 18, 52], [CON.x1 + 10, TEMP.y - 20, 80], [TEMP.x - 32, TEMP.y - 20, 80]], 3.2)));
  s += named("Heated chocolate main", mat("gold", tube([[TEMP.x + 10, TEMP.y - 6, 154], [TEMP.x + 10, TEMP.y - 6, 196], [TEMP.x + 10, 90, 196], [DEP_X + 4, 90, 196], [DEP_X + 4, 90, 168]], 3.6, { bend: 14 })));
  // pipe hangers
  s += mat("darksteel", [[TEMP.x + 10, 20], [TEMP.x + 10, 60]].map(([px, py]) => S(G.disc(196 - 5, 196 + 5, 1.2, Zf([px, py, 0]), P))).join(""));
  // nib chute winnower -> melanger, liquor pipe melanger -> conche
  s += mat("stainless", tube([[WINN.x + 30, WINN.y + 6, 40], [MEL.x - 40, MEL.y + 6, 72]], 2.6) + tube([[MEL.x + 36, MEL.y + 10, 46], [CON.x0 + 10, CON.y + 10, 62]], 2.6));
  // roaster -> winnower bean elevator
  s += mat("stainless", tube([[ROAST.x + 12, ROAST.y + 44, 10], [ROAST.x + 60, ROAST.y + 30, 10], [ROAST.x + 60, ROAST.y + 10, 100], [WINN.x - 30, WINN.y, 100]], 3, { bend: 12 }));
  return s;
}

// ---- front row ----------------------------------------------------------------------------
function conveyor() {
  const { y0, y1, z, x0, x1 } = BELT;
  let s = halo(x0 - 80, y0 - 6, x1 - x0 + 90, y1 - y0 + 12);
  let frame = "";
  for (let lx = x0 + 12; lx <= x1 - 4; lx += 64) for (const ly of [y0 + 3, y1 - 3]) frame += S(k.cylinder(lx, ly, 2.4, 0, z - 6, P, 16)) + S(k.cylinder(lx, ly, 4.5, 0, 2, P, 20));
  frame += slab(x0 - 78, y0 - 2, x1 - x0 + 78, 4, z - 8, 8, 1) + slab(x0 - 78, y1 - 2, x1 - x0 + 78, 4, z - 8, 8, 1);
  s += named("Conveyor frame", mat("stainless", frame));
  s += named("Conveyor belt", mat("white", slab(x0 - 76, y0 + 2, x1 - x0 + 74, y1 - y0 - 4, z - 3, 3, 1, 0.3)) + mat("darksteel", S(G.disc(y0 + 2, y1 - 2, 4, Yf([x1 - 2, 0, z - 4]), P))));
  return s;
}

function depositor() {
  const x = DEP_X;
  let s = "";
  let g = slab(x - 22, BELT.y0 - 16, 8, 8, 0, 150, 1.5) + slab(x - 22, BELT.y1 + 8, 8, 8, 0, 150, 1.5) + slab(x - 24, BELT.y0 - 18, 12, BELT.y1 - BELT.y0 + 36, 150, 10, 2);
  s += named("Depositor gantry", mat("yellow", g));
  const HF = Zf([x + 4, 90, 0]);
  s += named("Depositor hopper", mat("stainless", S(G.solidOf([[112, 8], [118, 10], [138, 24], [160, 24], [164, 22]], HF, P)) + slab(x - 6, BELT.y0 + 2, 22, BELT.y1 - BELT.y0 - 4, 98, 14, 2)));
  s += named("Piston depositor", mat("darksteel", Array.from({ length: M.CAVITIES }, (_, i) => S(G.disc(86, 98, 2.2, Zf([x + 4, BELT.y0 + 7.5 + i * 10.4, 0]), P))).join("")));
  s += `<g data-part="drops" data-name="Piston depositor"></g>`;
  return s;
}

function tunnel() {
  const { x0, x1 } = TUN;
  const y0 = BELT.y0 - 10, y1 = BELT.y1 + 10;
  let t = slab(x0, y0, x1 - x0, y1 - y0, BELT.z - 4, 50, 6, 1);
  for (let xx = x0 + 18; xx < x1 - 8; xx += 18) t += Ln(k.segment([xx, y1, BELT.z + 4], [xx, y1, BELT.z + 40], P), { tone: "lo" });
  t += faceQuad([[x0 + 10, y1 + 0.2, BELT.z + 10], [x1 - 10, y1 + 0.2, BELT.z + 10], [x1 - 10, y1 + 0.2, BELT.z + 22], [x0 + 10, y1 + 0.2, BELT.z + 22]], "cf-coolwin");
  t += k.faceTextSvg(k.sideMatrix([x0 + 14, y1 + 0.3], BELT.z + 36, P, "left"), "COOLING 12 °C", { size: 6, tone: "hi" });
  let s = named("Cooling tunnel", mat("blue", t));
  s += named("Chiller unit", mat("stainless", slab(x0 + 30, y0 - 4, 70, y1 - y0 + 8, BELT.z + 46, 18, 3, 0.6)) + mat("darksteel", [x0 + 46, x0 + 66, x0 + 86].map((cx) => Ln(k.ring(cx, 90, 7, BELT.z + 64.2, P, 24), { tone: "hi" })).join("")));
  return s;
}

function wrapper() {
  const { x0, x1 } = WRAP;
  const y0 = BELT.y0 - 14, y1 = BELT.y1 + 14;
  let s = halo(x0, y0, x1 - x0, y1 - y0);
  let b = slab(x0, y0, x1 - x0, y1 - y0, 0, 92, 5, 1);
  b += faceQuad([[x0 + 12, y1 + 0.2, 50], [x1 - 12, y1 + 0.2, 50], [x1 - 12, y1 + 0.2, 74], [x0 + 12, y1 + 0.2, 74]], "cf-window");
  s += named("Flow wrapper", mat("red", b));
  s += named("Foil reel", mat("gold", S(G.disc(y0 + 8, y1 - 8, 18, Yf([x0 + 30, 0, 112]), P))) + mat("darksteel", S(G.disc(y1 - 8, y1 - 4, 5, Yf([x0 + 30, 0, 112]), P))) + mat("gold", Ln(k.segment([x0 + 30, 90, 94], [x0 + 30, 90, 92], P), { tone: "hi" })));
  s += named("Paper reel", mat("white", S(G.disc(y0 + 8, y1 - 8, 15, Yf([x1 - 26, 0, 108]), P))) + mat("red", Ln(G.arcOf(Yf([x1 - 26, 0, 108]), y1 - 8, 12, P), { tone: "hi" })));
  return s;
}

function outfeed() {
  let s = halo(BOX.x - 4, BOX.y - 4, 110, BOX.d + 8);
  s += named("Outfeed conveyor", mat("stainless", slab(BOX.x + BOX.w - 6, 80, WRAP.x0 - BOX.x - BOX.w + 8, 20, 30, 6, 1)) + mat("stainless", [BOX.x + BOX.w + 8, WRAP.x0 - 8].map((lx) => S(k.cylinder(lx, 90, 2, 0, 30, P, 16))).join("")));
  s += named("Shipping carton", mat("sand", slab(BOX.x, BOX.y, BOX.w, BOX.d, 0, 30, 1, 0.4)) + mat("sand", Ln(k.planOutline({ x: BOX.x + 3, y: BOX.y + 3, w: BOX.w - 6, d: BOX.d - 6, r: 1 }, 30, P, 2), { tone: "hi" })));
  s += `<g data-part="carton"></g>`;
  return s;
}

// ---- live part builders (page) ------------------------------------------------------------
const LIVE = `
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const slab = (x, y, w, d, z, h, r = 1.5) => S(slabOf({ x, y, w, d, r }, z, h, P, 3, 0.4));
function drumSvg(a, roast) {
  const F = Xf([C.ROAST.x - 34, C.ROAST.y, 78]);
  let s = S(G.solidOf([[0, 22], [4, 28], [64, 28], [68, 22]], F, P));
  s += fadedSvg(G.ribsOf(F, 6, 62, 28.2, 18, P, { phase: a, fade: [0.05, 0.5] }).map((r) => [r.d, r.alpha]), { tone: "lo" });
  s += lineSvg(G.arcOf(F, 34, 28.2, P), { tone: "mid" });
  let door = S(G.disc(68, 72, 26, F, P)) + lineSvg(G.circleOf(F, 72, 12, P), { tone: "hi" });
  const glass = '<path class="cf-sight" style="fill:' + roastFill(roast) + '" d="' + pathOf(Array.from({ length: 24 }, (_, i) => { const t = i / 24 * Math.PI * 2; return iso([C.ROAST.x + 38, C.ROAST.y + 11 * Math.cos(t), 78 + 11 * Math.sin(t)], P); }), true) + '"/>';
  return MAT("stainless", s + door) + glass;
}
function roastFill(c) { const t = roastShade(c); const mix = (a, b) => Math.round(a + (b - a) * t); return "rgb(" + mix(176, 70) + "," + mix(122, 38) + "," + mix(78, 22) + ")"; }
function sieveSvg(a, roast) {
  const pts = Array.from({ length: 26 }, (_, i) => { const r = 6 + (i * 7.31) % 24, t = a * 0.6 + i * 2.4; return iso([C.ROAST.x + 4 + r * Math.cos(t), C.ROAST.y + 64 + r * Math.sin(t), 28.6], P); });
  const arm = lineOnTop([C.ROAST.x + 4, C.ROAST.y + 64], [C.ROAST.x + 4 + 30 * Math.cos(a * 0.6), C.ROAST.y + 64 + 30 * Math.sin(a * 0.6)], 29, P);
  return '<g class="cf-roasted" style="--bean:' + roastFill(roast) + '">' + dotsSvg(pts, { size: 1.3, tone: "hi" }) + '</g>' + MAT("darksteel", lineSvg(arm, { tone: "hi" }));
}
function nibsSvg(t) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const f = (t * 0.9 + i / 10) % 1; pts.push(iso([C.WINN.x - 14 + (i * 3.7) % 22, C.WINN.y + 28.3, 62 - f * 30], P)); }
  return '<g class="cf-nibs">' + dotsSvg(pts, { size: 1, tone: "hi" }) + '</g>';
}
function melangerSvg(a, choc) {
  const { x, y } = C.MEL;
  let s = '<path class="cf-choc cf-choc-' + choc + '" d="' + pathOf(Array.from({ length: 40 }, (_, i) => { const t = i / 40 * Math.PI * 2; return iso([x + 38 * Math.cos(t), y + 38 * Math.sin(t), 70], P); }), true) + '"/>';
  // swirl lines in the liquor
  for (let k2 = 0; k2 < 3; k2++) { const r = 12 + k2 * 9; s += '<path class="cf-swirl" d="' + pathOf(Array.from({ length: 14 }, (_, i) => { const t = a * 1.3 + k2 + i / 14 * 2.2; return iso([x + r * Math.cos(t), y + r * Math.sin(t), 70.2], P); })) + '"/>'; }
  const rollers = [0, Math.PI].map((o) => { const t = a + o; return { t, c: [x + 16 * Math.cos(t), y + 16 * Math.sin(t)] }; }).sort((p, q) => depthOf([p.c[0], p.c[1], 0], P) - depthOf([q.c[0], q.c[1], 0], P));
  let r = "";
  for (const { t, c } of rollers) r += S(G.disc(-11, 11, 10, G.frameAlong([c[0], c[1], 78], [Math.cos(t), Math.sin(t), 0]), P));
  const arm = MAT("yellow", S(G.disc(-24, 24, 2.4, G.frameAlong([x, y, 92], [Math.cos(a), Math.sin(a), 0]), P)) + S(G.disc(74, 96, 4, Zf([x, y, 0]), P)));
  return s + MAT("granite", r) + arm;
}
function concheSvg(t, choc) {
  const x0 = C.CON.x0 + 10, x1 = C.CON.x1 - 30, y = C.CON.y;
  let s = '<path class="cf-choc cf-choc-' + choc + '" d="' + pathOf([[x0, y - 20], [x1, y - 20], [x1, y + 20], [x0, y + 20]].map(([px, py]) => iso([px, py, 70.1], P)), true) + '"/>';
  for (let row = 0; row < 4; row++) {
    const yy = y - 15 + row * 10;
    s += '<path class="cf-swirl" d="' + pathOf(Array.from({ length: 30 }, (_, i) => { const xx = x0 + 3 + (x1 - x0 - 6) * i / 29; return iso([xx, yy + 2.4 * Math.sin(xx * 0.18 - t * 3 + row), 70.3], P); })) + '"/>';
  }
  // paddle tips breaking the surface as the shaft turns
  let paddles = "";
  for (let i = 0; i < 5; i++) { const xx = x0 + 10 + i * ((x1 - x0 - 20) / 4); const ph = t * 2.2 + i * 1.3; const lift = Math.sin(ph); if (lift > 0.2) paddles += slab(xx - 2, y - 2 + 8 * Math.cos(ph), 4, 4, 70, 4 * lift); }
  return s + MAT("stainless", paddles);
}
function mouldSvg(x, state, choc, ok, fill) {
  const z = C.BELT.z;
  let s = MAT("glass", slab(x - 22, C.BELT.y0 + 1, 44, C.BELT.y1 - C.BELT.y0 - 2, z, 6, 2));
  for (let i = 0; i < C.CAV; i++) {
    const plan = { x: x - 18, y: C.BELT.y0 + 4 + i * 10.4, w: 36, d: 7.4, r: 1.2 };
    if (state === "empty" || fill < 0.3) s += '<path class="cf-cavity" d="' + pathOf(ringOf(plan, 2).map(([px, py]) => iso([px, py, z + 6.05], P)), true) + '"/>';
    else {
      const cls = "cf-bar cf-choc-" + choc + (state === "set" ? (ok ? " cf-set" : " cf-bloom") : " cf-liquid");
      s += '<path class="' + cls + '" d="' + pathOf(ringOf(plan, 2).map(([px, py]) => iso([px, py, z + 6.1], P)), true) + '"/>';
      if (state === "set") s += lineSvg(pathOf([iso([plan.x + 6, plan.y + 2, z + 6.2], P), iso([plan.x + 30, plan.y + 2, z + 6.2], P)]), { tone: "faint" });
    }
  }
  return s;
}
function dropsSvg(t, active, choc) {
  if (!active) return "";
  let s = "";
  for (let i = 0; i < C.CAV; i++) {
    const f = (t * 3 + i * 0.27) % 1;
    const z = 86 - f * (86 - C.BELT.z - 7);
    s += '<ellipse class="cf-drop cf-choc-' + choc + '" cx="' + iso([C.DEP_X + 4, C.BELT.y0 + 7.5 + i * 10.4, z], P)[0] + '" cy="' + iso([C.DEP_X + 4, C.BELT.y0 + 7.5 + i * 10.4, z], P)[1] + '" rx="1.5" ry="2.6"/>';
  }
  return s;
}
function wrappedSvg(x) {
  let s = "";
  s += MAT("gold", slab(x - 9, 82, 18, 16, 36, 3, 1));
  s += MAT("red", slab(x - 7, 82.5, 14, 15, 39, 0.6, 1));
  return s;
}
function cartonSvg(n) {
  const layers = Math.min(6, Math.floor(n / 8));
  let s = "";
  for (let l = 0; l < layers; l++) for (let r = 0; r < 2; r++) s += MAT(l % 2 ? "gold" : "red", slab(C.BOX.x + 6 + r * 20, C.BOX.y + 6, 18, C.BOX.d - 12, 4 + l * 4, 3.6, 1));
  return s;
}
`;

export function figure(theme) {
  const C = { ROAST, WINN, MEL, CON, BELT, DEP_X, BOX, CAV: M.CAVITIES };
  const B = new Function(
    "G", "P", "C", "solidSvg", "lineSvg", "dotsSvg", "fadedSvg", "iso", "pathOf", "slabOf", "ringOf", "lineOnTop", "depthOf", "roastShade",
    `${LIVE}; return { drumSvg, sieveSvg, nibsSvg, melangerSvg, concheSvg, mouldSvg, dropsSvg, wrappedSvg, cartonSvg };`,
  )(G, P, C, k.solidSvg, k.lineSvg, k.dotsSvg, k.fadedSvg, k.iso, k.pathOf, k.slabOf, k.ringOf, k.lineOnTop, k.depthOf, M.roastShade);

  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "cf-svg",
    label: "An isometric bean-to-bar chocolate factory. Cocoa beans are roasted in a turning drum, cracked and winnowed, ground to liquor between granite rollers, conched, then tempered and deposited into moulds that ride a conveyor through a cooling tunnel into a flow wrapper.",
    body: [
      floor(),
      `<g data-station="roast">${sacks()}${roaster()}</g>`,
      `<g data-station="winnow">${winnower()}</g>`,
      `<g data-station="grind">${melanger()}</g>`,
      `<g data-station="conche">${conche()}</g>`,
      `<g data-station="temper">${temperer()}</g>`,
      pipes(),
      `<g data-station="wrap-out">${outfeed()}<g data-part="wrapped"></g></g>`,
      conveyor(),
      `<g data-station="wrap">${wrapper()}</g>`,
      `<g data-part="moulds-far"></g>`,
      `<g data-station="cool">${tunnel()}</g>`,
      `<g data-part="moulds-near"></g>`,
      `<g data-station="deposit">${depositor()}</g>`,
    ],
  });
  // first frame
  const firstFrame = (s) => s
    .replace('<g data-part="drum" data-name="Roasting drum"></g>', `<g data-part="drum" data-name="Roasting drum">${B.drumSvg(0, 128)}</g>`)
    .replace('<g data-part="melanger" data-name="Granite rollers"></g>', `<g data-part="melanger" data-name="Granite rollers">${B.melangerSvg(0.6, "dark")}</g>`)
    .replace('<g data-part="conche" data-name="Conching paddles"></g>', `<g data-part="conche" data-name="Conching paddles">${B.concheSvg(0, "dark")}</g>`);

  const plate = k.plateHtml({
    fig: "Fig 2",
    title: "Chocolate factory",
    hint: "Tap any machine",
    readout: "Dark · Form V",
    body: `<div class="iso-stage cf-stage" tabindex="0" role="img" aria-label="Chocolate factory line">${firstFrame(svg)}</div>`,
  });

  const css = `
.cf-burner{fill:url(#cf-flame)}
.cf-window{fill:#2b2f38;opacity:.85}
.cf-coolwin{fill:#9fd8ff;opacity:.7}
.cf-screen{fill:#0d1a14}
.cf-screen-text{fill:#55f2a0;font-family:var(--anatomy-mono);font-weight:700}
.cf-screen-sub{fill:#9be7c4;font-family:var(--anatomy-mono);letter-spacing:.06em}
.cf-screen-text[data-bad]{fill:#ff6b5b}
.cf-sight{stroke:#22252b;stroke-width:.5}
.cf-roasted circle{fill:var(--bean)!important;opacity:1!important}
.cf-nibs circle{fill:#5a3622!important;opacity:.9!important}
.cf-choc{stroke:none}
.cf-choc-dark{fill:#4a2a1b}.cf-choc-milk{fill:#7b4c2e}.cf-choc-white{fill:#eadbb8}
.cf-swirl{fill:none;stroke:#ffffff;stroke-opacity:.25;stroke-width:.8;stroke-linecap:round}
.cf-cavity{fill:#d7e6ee;stroke:#8aa3b3;stroke-width:.5}
body[data-theme="dark"] .cf-cavity{fill:#3a4a58;stroke:#6f8799}
.cf-bar{stroke:#2b170e;stroke-width:.5}
.cf-liquid{filter:brightness(1.25)}
.cf-set{filter:brightness(1.05) saturate(1.1)}
.cf-bloom{filter:grayscale(.55) brightness(1.35)}
.cf-drop{stroke:none}
[data-station]{transition:opacity .4s}
body[data-focus] [data-station]{opacity:.35}
body[data-focus="roast"] [data-station="roast"],body[data-focus="winnow"] [data-station="winnow"],body[data-focus="grind"] [data-station="grind"],body[data-focus="conche"] [data-station="conche"],body[data-focus="temper"] [data-station="temper"],body[data-focus="deposit"] [data-station="deposit"],body[data-focus="cool"] [data-station="cool"],body[data-focus="wrap"] :is([data-station="wrap"],[data-station="wrap-out"]){opacity:1}
${materialsCss(["wood", "floor", "yellow", "red", "darksteel", "stainless", "cocoa", "green", "blue", "teal", "white", "cream", "orange", "copper", "gold", "granite", "glass", "sand", "choc"])}
`;
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="cf-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2b4cff"/><stop offset=".35" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ffd36b"/></linearGradient></defs></svg>`;

  const live = `
${modelSource}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
${LIVE}
const stage = document.querySelector(".cf-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { drum: q("drum"), sieve: q("sieve"), nibs: q("nibs"), mel: q("melanger"), con: q("conche"), far: q("moulds-far"), near: q("moulds-near"), drops: q("drops"), wrapped: q("wrapped"), carton: q("carton"), text: q("temp-text"), form: q("temp-form") };
const burner = stage.querySelector(".cf-burner");
const readout = document.querySelector("[data-readout]");
let t = 0, travel = 0, last = 0, frame = 0, visible = true;
let choc = "dark";
const curveCanvas = document.querySelector(".cf-curve");
function drawCurve(type, work) {
  if (!curveCanvas || !curveCanvas.clientWidth) return;
  const ctx = curveCanvas.getContext("2d");
  const w = curveCanvas.width = curveCanvas.clientWidth * 2, h = curveCanvas.height = curveCanvas.clientHeight * 2;
  const cs = getComputedStyle(document.body);
  const txt = cs.getPropertyValue("--anatomy-muted").trim(), rule = cs.getPropertyValue("--lab-rule").trim(), acc = cs.getPropertyValue("--lab-accent").trim();
  const T = TYPES[type], pts = temperCurve(type, work);
  const px = (m) => 46 + (m / 34) * (w - 60), py = (c) => h - 24 - ((c - 22) / 32) * (h - 40);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(48,164,108,.16)"; ctx.fillRect(46, py(T.hi), w - 60, py(T.lo) - py(T.hi));
  ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.fillStyle = txt; ctx.font = "500 18px ui-monospace,monospace";
  for (const c of [25, 30, 35, 40, 45, 50]) { ctx.beginPath(); ctx.moveTo(46, py(c)); ctx.lineTo(w - 14, py(c)); ctx.stroke(); ctx.fillText(c + "°", 0, py(c) + 6); }
  ctx.fillText("melt", px(5), py(T.melt) - 10); ctx.fillText("seed", px(18), py(T.cool) + 26); ctx.fillText("work", px(28), py(work) - 10);
  ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath(); pts.forEach(([m, c], i) => (i ? ctx.lineTo(px(m), py(c)) : ctx.moveTo(px(m), py(c)))); ctx.stroke();
  const p = (t * 2.2) % 34; let cy = pts[0][1];
  for (let i = 1; i < pts.length; i++) if (p <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; cy = a[1] + (b[1] - a[1]) * ((p - a[0]) / (b[0] - a[0] || 1)); break; } else cy = pts[i][1];
  ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(px(p), py(cy), 8, 0, 6.3); ctx.fill();
}
function draw(dt) {
  const roast = Lab.value("roast"), work = Lab.value("work"), speed = Lab.value("speed");
  const st = temperState(choc, work);
  el.drum.innerHTML = drumSvg(t * 2.4, roast);
  el.sieve.innerHTML = sieveSvg(t * 2, roast);
  el.nibs.innerHTML = nibsSvg(t);
  el.mel.innerHTML = melangerSvg(t * 1.6, choc);
  el.con.innerHTML = concheSvg(t, choc);
  burner.style.opacity = String(0.55 + 0.35 * roastShade(roast) + 0.1 * Math.sin(t * 17));
  // moulds: spaced 60 apart, travelling toward -x
  const SP = 60, offset = travel % SP;
  let far = "", near = "", filling = false;
  for (let i = -1; i < 7; i++) {
    const x = C.BELT.x1 - 6 - offset - i * SP;
    if (x < C.BELT.x0 + 2 || x > C.BELT.x1 - 2) continue;
    let state = "empty", fill = 0;
    if (x <= C.DEP_X + 14 && x > C.DEP_X - 14) { state = "liquid"; fill = (C.DEP_X + 14 - x) / 28; filling = true; }
    else if (x <= C.DEP_X - 14) { state = "liquid"; fill = 1; }
    if (x < ${TUN.x0}) state = "set";
    if (x >= ${TUN.x0} - 20 && x <= ${TUN.x1} + 20) continue;
    const svgM = mouldSvg(x, state, choc, st.ok, fill);
    if (x < ${TUN.x0}) far += svgM; else near += svgM;
  }
  el.far.innerHTML = far; el.near.innerHTML = near;
  el.drops.innerHTML = dropsSvg(t, filling, choc);
  // wrapped bars on the outfeed, one per cavity, spaced along it
  const made = Math.floor(travel / SP) * C.CAV;
  let w = "";
  for (let i = 0; i < 3; i++) { const x = ${WRAP.x0} - 4 - ((travel * 0.9 + i * 22) % 66); if (x > C.BOX.x + C.BOX.w) w += wrappedSvg(x); }
  el.wrapped.innerHTML = w;
  el.carton.innerHTML = cartonSvg(made % 56);
  // display
  el.text.textContent = work.toFixed(1) + "°C";
  el.text.toggleAttribute("data-bad", !st.ok);
  el.form.textContent = st.form.toUpperCase() + (st.ok ? " · OK" : " · CHECK");
  const r = TYPES[choc].label + " · " + st.form;
  if (readout.textContent !== r) readout.textContent = r;
  Lab.gauge("crystal", st.form, !st.ok);
  Lab.gauge("window", TYPES[choc].lo + "–" + TYPES[choc].hi + " °C");
  Lab.gauge("rate", barsPerMinute(speed) + " /min");
  Lab.gauge("kg", kgPerHour(speed).toFixed(0) + " kg/h");
  Lab.gauge("made", made.toLocaleString("en-US"));
  Lab.gauge("flavour", roastNote(roast));
  Lab.gauge("conche", CONCHE_HOURS[choc] + " h");
  Lab.gauge("cocoa", TYPES[choc].cocoa + " %");
  const note = document.querySelector(".cf-note");
  if (note && note.textContent !== st.note) note.textContent = st.note;
  drawCurve(choc, work);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  if (!Lab.reduced.matches) { t += dt; travel += dt * Lab.value("speed") / 60 * 60 * 0.6; }
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !Lab.paused) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
document.addEventListener("lab-pause", (e) => { if (!e.detail) run(); });
Lab.onMode((m) => { choc = m; const T = TYPES[m]; Lab.set("work", (T.lo + T.hi) / 2); run(); });
Lab.onChange(() => run());
Lab.onStep((i, s, user) => { if (user) document.body.dataset.focus = s.focus || ""; if (!user) delete document.body.dataset.focus; run(); });
stage.addEventListener("pointerdown", () => { delete document.body.dataset.focus; });
run();
`;
  return {
    plate: defs + plate,
    css,
    script: kitScript() + latheScript() + live,
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Tempering curve</span><em>green band = Form V window</em></div><canvas class="cf-curve" style="width:100%;height:140px;display:block"></canvas><p class="cf-note" style="margin:6px 2px 2px;font-size:13px;color:var(--anatomy-strong)"></p></div>`,
  };
}
