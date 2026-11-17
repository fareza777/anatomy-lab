// Four-stroke engine on a test bench, in full colour.
// Air-cooled single, DOHC two-valve head, overhung crank. The front half of the crankcase,
// barrel, head and piston is cut away at y = 0 (section faces painted red, as on real
// cutaway engines). A WebGL layer renders the charge, flame front and exhaust in the
// chamber; a bench console reads engine speed and cylinder pressure on live dials.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../vendor/anatomy/kit/tube.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript, glScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 640;

// ---- world layout (mm) -------------------------------------------------------------------
const W = {
  plate: { x: -196, y: -128, w: 392, d: 236, r: 12 },
  plateH: 14, footH: 7,
  crankZ: 120,
  case: { x0: -82, x1: 82, y0: -58, z0: 22, z1: 198, wall: 8 },
  bore: 40, barrelR: 50, finR: 72,
  valveX: 22, camR: 14,
  plug: [0, -27],
  beltY: -88,
};
const R = M.crankR;
const L = M.ENGINE.rod;
const PIN_TDC = W.crankZ + R + L;
const CROWN_ABOVE_PIN = 30;
const CHAMBER = M.clearanceCc / ((Math.PI * 16) / 10);
W.deck = Math.round((PIN_TDC + CROWN_ABOVE_PIN + CHAMBER) * 10) / 10;
W.headTop = W.deck + 50;
W.carrierTop = W.headTop + 18;
const BUCKET_H = 10;
W.camZ = W.carrierTop + 1 + W.camR - 1;
const BUCKET_TOP = W.camZ - W.camR;
const CONSOLE = { x: -186, y: 22, w: 118, d: 64, r: 4 };
const CONSOLE_H = 34;
const DIALS = [{ id: "tach", at: [-156, 54], r: 19 }, { id: "press", at: [-104, 54], r: 19 }];
const COIL = [128, -78];

const P = k.fitProjection(
  [...k.boxCorners(W.plate, -W.plateH - W.footH, 0), [0, W.beltY, W.camZ + 30], [-W.finR, 0, W.headTop + 60], [W.plug[0], W.plug[1], W.headTop + 80]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 58, elevation: 24 },
);

const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const at = (p) => k.iso(p, P);
const Y = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const Zf = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const TAU = Math.PI * 2;
const arcPts = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / n; return [r * Math.cos(t), r * Math.sin(t)]; });
const halfAnnulus = (r0, r1, n = 40) => [...arcPts(r1, Math.PI, TAU, n), ...arcPts(r0, TAU, Math.PI, n)];
const named = (name, svg, extra = "") => `<g data-name="${name}"${extra}>${svg}</g>`;
function hull2(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const cutRect = (x0, x1, z0, z1) => `<path class="lab-cut" d="${k.pathOf([at([x0, 0, z0]), at([x1, 0, z0]), at([x1, 0, z1]), at([x0, 0, z1])], true)}"/>`;
const cavity = (pts, cls = "") => `<path class="lab-cavity ${cls}" d="${k.pathOf(pts.map(([x, z]) => at([x, 0.2, z])), true)}"/>`;
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(3, r * 2.6), 8, { P, tube: r });
  return tubePieces(route, r, P, { maxLength: 400, ...opts }).map((p) => tubeSvg(p, { tone: opts.tone ?? "hi" })).join("");
}
const hexNut = (x, y, z, r, h) => S(G.prismOf(Zf([x, y, 0]), Array.from({ length: 6 }, (_, i) => [r * Math.cos((i / 6) * TAU + 0.3), r * Math.sin((i / 6) * TAU + 0.3)]), z, z + h, P), { tone: "hi" });

// ---- bench -------------------------------------------------------------------------------
function bench() {
  const { plate } = W;
  const out = [`<path class="iso-halo" d="${k.haloOf(plate, -W.plateH - W.footH, W.plateH, P)}"/>`];
  out.push(mat("rubber", k.corners(plate, 26).map(([x, y]) => S(k.cylinder(x, y, 9, -W.plateH - W.footH, W.footH, P, 28), { tone: "hi" })).join("")));
  let top = S(k.slabOf(plate, -W.plateH, W.plateH, P, 8, 1.4), { tone: "hi" });
  top += Ln(k.planOutline(k.insetPlan(plate, 7), 0, P), { tone: "lo" });
  for (const y of [-96, -40, 16, 72]) top += Ln(k.lineOnTop([plate.x + 12, y], [plate.x + plate.w - 12, y], 0, P), { tone: "mid" }) + Ln(k.lineOnTop([plate.x + 12, y + 4], [plate.x + plate.w - 12, y + 4], 0, P), { tone: "faint" });
  const screws = k.corners(plate, 12);
  top += Ln(screws.map(([x, y]) => k.ring(x, y, 3, 0, P, 16)).join(""), { tone: "mid" }) + D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.6, tone: "hi" });
  out.push(mat("slate", top));
  const strip = { x: -40, y: plate.y + plate.d - 18, w: 220, d: 9, r: 1 };
  let ruler = S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "hi", crease: "none" });
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.8, [2.4, 4.4], P);
  ruler += Ln(ticks.minor, { tone: "mid" }) + Ln(ticks.major, { tone: "hi" });
  out.push(mat("brass", ruler));
  out.push(mat("darksteel", [-66, 46].map((x) => S(k.slabOf({ x, y: -74, w: 20, d: 74, r: 2 }, 0, 22, P, 3, 0.6), { tone: "hi" }) + hexNut(x + 10, -64, 22, 4, 3) + hexNut(x + 10, -10, 22, 4, 3)).join("")));
  const label = { x: 104, y: plate.y + 14, w: 70, d: 32, r: 2 };
  out.push(mat("brass", S(k.slabOf(label, 0, 1.4, P, 3, 0.4), { tone: "hi" }) +
    k.faceTextSvg(k.topMatrix([label.x + 6, label.y + 11], 1.4, P, "x"), "4T · 402 cc", { size: 5.4, tone: "hi" }) +
    k.faceTextSvg(k.topMatrix([label.x + 6, label.y + 22], 1.4, P, "x"), "CR 10:1 · DOHC", { size: 4.4, tone: "mid" }) +
    D([[label.x + 3, label.y + 3], [label.x + label.w - 3, label.y + 3], [label.x + 3, label.y + label.d - 3], [label.x + label.w - 3, label.y + label.d - 3]].map(([x, y]) => at([x, y, 1.4])), { size: 0.5 })));
  return out.join("");
}

function camCover() {
  const c = { x: 60, y: 24, w: 110, d: 52, r: 10 };
  let s = `<path class="iso-halo" d="${k.haloOf(c, 0, 8, P)}" style="filter:blur(5px)"/>`;
  s += S(k.slabOf(c, 0, 12, P, 8, 1), { tone: "hi" });
  s += Ln(k.planOutline(k.insetPlan(c, 5), 12, P, 8), { tone: "mid" });
  for (let x = c.x + 22; x < c.x + c.w - 14; x += 22) s += S(k.slabOf({ x: x - 1.5, y: c.y + 8, w: 3, d: c.d - 16, r: 1 }, 12, 4, P, 2), { tone: "mid", crease: "none" });
  const holes = [[c.x + 8, c.y + 8], [c.x + c.w - 8, c.y + 8], [c.x + 8, c.y + c.d - 8], [c.x + c.w - 8, c.y + c.d - 8]];
  s += Ln(holes.map(([x, y]) => k.ring(x, y, 2.6, 12, P, 14)).join(""), { tone: "hi" });
  s += k.faceTextSvg(k.topMatrix([c.x + 30, c.y + c.d - 12], 12, P, "x"), "DOHC 402", { size: 5, tone: "lo" });
  const bolts = [[c.x + c.w + 12, c.y + 10], [c.x + c.w + 12, c.y + 22], [c.x + c.w + 12, c.y + 34], [c.x + c.w + 12, c.y + 46]];
  return named("Cam cover", mat("red", s) + mat("steel", bolts.map(([x, y]) => hexNut(x, y, 0, 3.6, 3)).join("")));
}

function instrumentConsole() {
  const c = CONSOLE;
  let s = `<path class="iso-halo" d="${k.haloOf(c, 0, CONSOLE_H, P)}" style="filter:blur(5px)"/>`;
  s += S(k.slabOf(c, 0, CONSOLE_H, P, 6, 1.2), { tone: "hi" });
  s += Ln(k.sideSeam(c, CONSOLE_H - 6, P, 6), { tone: "faint" });
  s += D([at([c.x + 10, c.y + c.d - 10, CONSOLE_H]), at([c.x + 20, c.y + c.d - 10, CONSOLE_H])], { size: 1.1, tone: "hi" });
  let out = mat("navy", s);
  for (const d of DIALS) {
    const [x, y] = d.at;
    out += mat("chrome", S(k.cylinder(x, y, d.r + 3, CONSOLE_H, 3, P, 56, 0.6), { tone: "hi" }));
    let face = S(k.cylinder(x, y, d.r, CONSOLE_H + 2.6, 0.6, P, 56), { tone: "hi", crease: "none" });
    const sweep = Math.PI * 1.5, from = -Math.PI * 0.75;
    const t = k.radialTicks(x, y, d.r - 2, 40, 5, CONSOLE_H + 3.2, [1.4, 3], P, from, sweep);
    face += Ln(t.minor, { tone: "mid" }) + Ln(t.major, { tone: "hi" });
    if (d.id === "tach") face += Ln(k.onTop(Array.from({ length: 12 }, (_, i) => { const a = from + sweep * (6 / 7 + (i / 11) / 7); return [x + Math.sin(a) * (d.r - 2.5), y - Math.cos(a) * (d.r - 2.5)]; }), CONSOLE_H + 3.25, P), { tone: "red" });
    face += k.faceTextSvg(k.topMatrix([x, y + 9], CONSOLE_H + 3.2, P, "x"), d.id === "tach" ? "RPM ×1000" : "BAR", { size: 2.8, tone: "mid", anchor: "middle" });
    out += named(d.id === "tach" ? "Tachometer" : "Pressure gauge", mat("white", face) + `<path data-part="needle-${d.id}" class="iso-line lab-needle" data-free="end" d=""/>` + mat("darksteel", S(k.cylinder(x, y, 1.6, CONSOLE_H + 3.2, 0.8, P, 16), { tone: "hi" })));
  }
  // the pressure transducer line from the head to the console
  const line = tube([[-72, -40, 360], [-96, -40, 360], [-96, -40, 120], [-96, 40, 120], [-96, 40, CONSOLE_H + 4], [-104, 40, CONSOLE_H + 4]], 1.6);
  return named("Test console", out) + named("Pressure gauge", `<g data-part="sensor-line">${mat("copper", line)}</g>`);
}

// ---- engine, static -------------------------------------------------------------------------
function timingBelt() {
  const y = W.beltY;
  const pulleys = [[0, W.crankZ, 11], [-W.valveX, W.camZ, 22], [W.valveX, W.camZ, 22]];
  const ring = [];
  for (const [x, z, r] of pulleys) for (let i = 0; i < 48; i++) { const t = (i / 48) * TAU; ring.push([x + (r + 3) * Math.cos(t), z + (r + 3) * Math.sin(t)]); }
  let belt = S(G.prismOf(Y([0, y - 4, 0]), hull2(ring), 0, 8, P), { tone: "hi", crease: "none" });
  belt += Ln(k.pathOf(hull2(ring.map(([x, z]) => [x * 0.95, z])).map(([x, z]) => at([x, y + 4.2, z])), true), { tone: "mid", dashed: true });
  const tens = S(G.disc(y - 6, y + 4, 9, Y([-38, 0, 250]), P), { tone: "hi" }) + D([at([-38, y + 4, 250])], { size: 0.9, tone: "hi" });
  return named("Timing belt", mat("rubber", belt) + mat("steel", tens + S(G.disc(0, 30, 6, Y([0, y, W.crankZ]), P), { tone: "hi" })));
}

function crankcase() {
  const c = W.case;
  let s = `<path class="iso-halo" d="${k.haloOf({ x: c.x0, y: c.y0, w: c.x1 - c.x0, d: -c.y0, r: 4 }, c.z0, c.z1 - c.z0, P)}"/>`;
  s += S(k.slabOf({ x: c.x0, y: c.y0, w: c.x1 - c.x0, d: c.wall, r: 3 }, c.z0, c.z1 - c.z0, P, 3, 0.6), { tone: "hi" });
  for (const x of [-52, 52]) s += S(k.slabOf({ x: x - 2, y: c.y0 + c.wall, w: 4, d: 6, r: 0 }, c.z0 + 9, c.z1 - c.z0 - 17, P, 2), { tone: "mid", crease: "none" });
  s += S(k.slabOf({ x: c.x0, y: c.y0 + c.wall, w: c.wall, d: -c.y0 - c.wall, r: 0 }, c.z0, c.z1 - c.z0, P, 2), { tone: "hi" });
  s += S(k.slabOf({ x: c.x0 + c.wall, y: c.y0 + c.wall, w: c.x1 - c.x0 - 2 * c.wall, d: -c.y0 - c.wall, r: 0 }, c.z0, 9, P, 2), { tone: "hi" });
  s += S(G.disc(c.y0 + c.wall, c.y0 + c.wall + 12, 26, Y([0, 0, W.crankZ]), P), { tone: "hi" });
  s += Ln(G.circleOf(Y([0, 0, W.crankZ]), c.y0 + c.wall + 12, 20, P), { tone: "mid" });
  s += D(G.dotsOf(Y([0, 0, W.crankZ]), c.y0 + c.wall + 12, 23, 6, P, { all: true, phase: 0.3 }), { size: 0.6, tone: "hi" });
  for (const [x0, x1] of [[c.x0 + c.wall, -W.barrelR], [W.barrelR, c.x1 - c.wall]]) s += S(k.slabOf({ x: x0, y: c.y0 + c.wall, w: x1 - x0, d: -c.y0 - c.wall, r: 0 }, c.z1 - 8, 8, P, 2), { tone: "hi" });
  s += D([-70, -35, 0, 35, 70].map((x) => at([x, c.y0 + 2, c.z1])), { size: 0.6, tone: "hi" });
  const oil = `<path class="lab-oil" d="${k.pathOf([[c.x0 + c.wall, -1], [c.x1 - c.wall, -1], [c.x1 - c.wall, c.y0 + c.wall], [c.x0 + c.wall, c.y0 + c.wall]].map(([x, y]) => at([x, y, c.z0 + 16])), true)}"/>`;
  const cuts = cutRect(c.x0, c.x0 + c.wall, c.z0, c.z1) + cutRect(c.x0 + c.wall, c.x1 - c.wall, c.z0, c.z0 + 9) + cutRect(c.x0 + c.wall, -W.barrelR, c.z1 - 8, c.z1) + cutRect(W.barrelR, c.x1 - c.wall, c.z1 - 8, c.z1);
  const dip = mat("steel", S(G.disc(c.z1 - 70, c.z1 + 14, 1.6, Zf([-66, -30, 0]), P), { tone: "hi" })) + mat("yellow", S(G.disc(-33, -29, 6, Y([-66, 0, c.z1 + 20]), P), { tone: "hi" }) + Ln(G.circleOf(Y([-66, 0, c.z1 + 20]), -29, 3.2, P), { tone: "hi" }));
  return named("Crankcase", mat("castalu", s) + named("Engine oil", oil) + cuts) + named("Dipstick", dip);
}
const caseRightWall = () => { const c = W.case; return named("Crankcase", mat("castalu", S(k.slabOf({ x: c.x1 - c.wall, y: c.y0 + c.wall, w: c.wall, d: -c.y0 - c.wall, r: 0 }, c.z0, c.z1 - c.z0, P, 2), { tone: "hi" })) + cutRect(c.x1 - c.wall, c.x1, c.z0, c.z1)); };

function barrel() {
  const z0 = W.case.z1, z1 = W.deck;
  let s = S(k.extrude(halfAnnulus(W.bore, W.barrelR + 10), z0, 6, P, { convex: false }), { tone: "hi" });
  let cuts = cutRect(-W.barrelR - 10, -W.bore, z0, z0 + 6) + cutRect(W.bore, W.barrelR + 10, z0, z0 + 6);
  s += S(k.extrude(halfAnnulus(W.bore, W.barrelR), z0 + 6, z1 - z0 - 6, P, { convex: false }), { tone: "hi", crease: "none" });
  cuts += cutRect(-W.barrelR, -W.bore, z0 + 6, z1) + cutRect(W.bore, W.barrelR, z0 + 6, z1);
  let fins = "";
  for (let z = z0 + 16; z < z1 - 6; z += 10) {
    fins += S(k.extrude(halfAnnulus(W.barrelR, W.finR), z, 3, P, { convex: false }), { tone: "hi", crease: "none" });
    cuts += cutRect(-W.finR, -W.barrelR, z, z + 3) + cutRect(W.barrelR, W.finR, z, z + 3);
  }
  const hone = Array.from({ length: 6 }, (_, i) => z0 + 26 + i * 22).map((z) => Ln(k.pathOf(arcPts(W.bore - 0.3, Math.PI * 1.08, Math.PI * 1.92, 24).map(([x, y]) => at([x, y, z]))), { tone: "faint", free: true })).join("");
  return named("Cylinder barrel", mat("iron", s + fins + hone) + cuts);
}

const PORT_IN = [[-72, 368], [-72, 388], [-50, 386], [-34, 376], [-25, 0], [-9, 0], [-12, 9], [-28, 368], [-48, 364]];
const PORT_EX = PORT_IN.map(([x, z]) => [-x, z - 6]);
function head() {
  const z0 = W.deck, z1 = W.headTop;
  const fixPort = (pts) => pts.map(([x, z]) => [x, z < 50 ? W.deck + z + 1 : z]);
  let s = S(k.slabOf({ x: -72, y: -56, w: 144, d: 56, r: 0 }, z0 + 1.4, z1 - z0 - 1.4, P, 2, 0.6), { tone: "hi" });
  for (let z = z0 + 9; z < z1 - 4; z += 8) s += Ln(k.sideSeam({ x: -72, y: -56, w: 144, d: 56, r: 0 }, z, P, 2), { tone: "lo" });
  let carrier = S(k.slabOf({ x: -60, y: -56, w: 120, d: 56, r: 0 }, z1, W.carrierTop - z1, P, 2, 0.6), { tone: "hi" });
  for (const x of [-W.valveX, W.valveX]) carrier += S(k.slabOf({ x: x - 13, y: -50, w: 26, d: 14, r: 2 }, W.carrierTop, W.camZ - W.carrierTop, P, 3, 0.5), { tone: "hi" }) + S(G.disc(-36, -35, 14, Y([x, 0, W.camZ]), P), { tone: "hi" });
  const gasket = mat("copper", S(k.extrude(halfAnnulus(W.bore, W.barrelR + 10), z0, 1.4, P, { convex: false }), { tone: "hi", crease: "none" }));
  let cuts = cutRect(-72, 72, z0, z1) + cavity(fixPort(PORT_IN), "lab-cavity-in") + cavity(fixPort(PORT_EX), "lab-cavity-ex");
  cuts += cavity([[-W.bore, z0 + 0.4], [W.bore, z0 + 0.4], [W.bore - 4, z0 + 4], [-W.bore + 4, z0 + 4]]);
  for (const x of [-W.valveX, W.valveX]) cuts += `<path class="lab-guide" d="${k.pathOf([at([x - 5, 0.3, z0 + 22]), at([x + 5, 0.3, z0 + 22]), at([x + 5, 0.3, z1]), at([x - 5, 0.3, z1])], true)}"/>`;
  cuts += cutRect(-60, 60, z1, W.carrierTop);
  for (const x of [-W.valveX, W.valveX]) cuts += cavity([[x - 11.5, W.carrierTop], [x + 11.5, W.carrierTop], [x + 11.5, z1 + 2], [x - 11.5, z1 + 2]]);
  const studs = [[-52, -46], [52, -46], [-52, -8], [52, -8]].map(([x, y]) => hexNut(x, y, W.carrierTop, 4.4, 4) + D([at([x, y, W.carrierTop + 4])], { size: 0.8, tone: "hi" })).join("");
  return named("Cylinder head", gasket + mat("castalu", s) + mat("alu", carrier) + cuts) + named("Head studs", mat("steel", studs));
}

function intake() {
  const F = Xf([0, -24, 381]);
  const runner = S(G.disc(-112, -72, 12, F, P), { tone: "hi" }) + S(G.disc(-76, -72, 17, F, P), { tone: "hi" });
  const throttle = S(G.disc(-122, -108, 16, F, P), { tone: "hi" }) + Ln(G.arcOf(F, -115, 16, P), { tone: "mid" }) + S(G.disc(-42, -40, 7, Y([-115, 0, 381]), P), { tone: "hi" });
  const fz = 322, FZ = Zf([-156, -24, fz]);
  let filter = S(G.solidOf([[0, 30], [4, 33], [70, 33], [74, 29]], FZ, P), { tone: "hi" });
  filter += k.fadedSvg(G.ribsOf(FZ, 8, 66, 33.2, 44, P, { fade: [0.05, 0.5], seams: true }).map((r) => [r.d, r.alpha]), { tone: "lo" });
  const lid = S(G.solidOf([[0, 31], [3, 31], [5, 22, 1], [7, 0]], Zf([-156, -24, fz + 74]), P), { tone: "hi" }) + hexNut(-156, -24, fz + 81, 5, 4);
  const inj = S(G.disc(392, 412, 4.5, Zf([-92, -24, 0]), P), { tone: "hi" }) + S(G.disc(412, 420, 6.5, Zf([-92, -24, 0]), P), { tone: "hi" });
  const fuel = tube([[-92, -24, 420], [-92, -24, 434], [-104, 8, 434], [-104, 8, 26]], 2.2, { bend: 10 });
  const pump = `<path class="iso-halo" d="${k.haloOf({ x: -114, y: -2, w: 20, d: 20, r: 10 }, 0, 4, P)}" style="filter:blur(3px)"/>` + S(k.cylinder(-104, 8, 9, 0, 22, P, 32, 0.6), { tone: "hi" }) + Ln(k.sideArc(-104, 8, 9, 8, P, 20), { tone: "mid" });
  return named("Intake runner", mat("alu", runner)) + named("Throttle body", mat("darksteel", throttle)) + named("Air filter", mat("red", filter) + mat("chrome", lid)) + named("Fuel injector", mat("rubber", inj) + mat("blue", fuel) + mat("yellow", pump + S(k.cylinder(-104, 8, 4, 22, 4, P, 20), { tone: "hi" })));
}

function exhaust() {
  const F = Xf([0, -24, 372]);
  let header = S(G.disc(72, 78, 18, F, P), { tone: "hi" }) + S(G.disc(78, 118, 12, F, P), { tone: "hi" }) + S(G.sphereOf([122, -24, 372], 13.5, P), { tone: "hi" });
  header += S(G.disc(62, 368, 12, Zf([122, -24, 0]), P), { tone: "hi" }) + S(G.sphereOf([122, -24, 58], 13.5, P), { tone: "hi" });
  const SF = Xf([122, -24, 58]);
  let can = S(G.solidOf([[0, 9], [8, 21, 1], [12, 22], [48, 22], [52, 21, 1], [56, 8]], SF, P), { tone: "hi" });
  can += Ln(G.arcOf(SF, 20, 22, P), { tone: "mid" }) + Ln(G.arcOf(SF, 40, 22, P), { tone: "mid" }) + S(G.disc(56, 66, 6, SF, P), { tone: "hi" });
  const saddles = [132, 160].map((x) => S(k.slabOf({ x: x - 4, y: -36, w: 8, d: 24, r: 1.5 }, 0, 38, P, 2, 0.4), { tone: "hi" })).join("");
  const o2 = S(G.disc(112, 124, 3.6, Zf([100, -24, 0]), P), { tone: "hi" });
  return named("Exhaust header", mat("heatblue", header) + mat("steel", o2)) + named("Silencer", mat("darksteel", saddles) + mat("chrome", can));
}

function coil() {
  const [x, y] = COIL;
  const base = S(k.slabOf({ x: x - 16, y: y - 12, w: 32, d: 24, r: 3 }, 0, 6, P, 3, 0.5), { tone: "hi" });
  const body = S(G.solidOf([[0, 13], [44, 13], [46, 11], [52, 11], [54, 6]], Zf([x, y, 6]), P), { tone: "hi" });
  const tower = S(G.disc(60, 70, 4, Zf([x, y, 0]), P), { tone: "hi" });
  const lead = tube([[x, y, 70], [x, y, 100], [60, -60, 480], [W.plug[0] + 14, W.plug[1], W.carrierTop + 70], [W.plug[0], W.plug[1], W.carrierTop + 62]], 2.4, { bend: 14 });
  return named("Ignition coil", mat("darksteel", base) + mat("rubber", body) + mat("red", tower)) + `<g data-part="ht-lead">${named("Ignition coil", mat("red", lead))}</g>`;
}

function sparkPlug() {
  const [x, y] = W.plug;
  const F = Zf([x, y, 0]);
  const well = S(G.disc(W.headTop - 4, W.carrierTop + 4, 8, F, P), { tone: "hi" });
  const hex = S(G.prismOf(F, Array.from({ length: 6 }, (_, i) => [9 * Math.cos((i / 6) * TAU + 0.5), 9 * Math.sin((i / 6) * TAU + 0.5)]), W.carrierTop + 4, W.carrierTop + 12, P), { tone: "hi" });
  const FI = Zf([x, y, W.carrierTop + 12]);
  let ins = S(G.solidOf([[0, 6], [26, 5.5, 1], [34, 4.4, 1], [40, 3]], FI, P), { tone: "hi" });
  for (const s of [8, 13, 18]) ins += Ln(G.arcOf(FI, s, 5.9, P), { tone: "mid" });
  const term = S(G.disc(W.carrierTop + 52, W.carrierTop + 58, 3.4, F, P), { tone: "hi" });
  return named("Spark plug", mat("castalu", well) + mat("steel", hex + term) + mat("ceramic", ins));
}

// ---- moving parts: rebuilt per frame in the page, and once here for the first paint ---------
const LIVE = `
const FY = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const PRISM_Y = (o, poly, s0, s1) => G.prismOf(FY(o), poly, s0, s1, P);
const DISC_Y = (o, s0, s1, r) => G.disc(s0, s1, r, FY(o), P);
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const rot = (pts, a) => pts.map(([x, z]) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)]);
function crankSvg(phi) {
  const a = (phi * Math.PI) / 180;
  const pin = [W.crankR * Math.sin(a), W.crankZ + W.crankR * Math.cos(a)];
  const dir = Math.atan2(pin[1] - W.crankZ, pin[0]);
  const web = rot(G.stadium(30, 22, W.crankR, 40), dir);
  const cw = rot(Array.from({ length: 25 }, (_, i) => { const t = Math.PI * 0.62 + (i / 24) * Math.PI * 0.76; return [60 * Math.cos(t), 60 * Math.sin(t)]; }).concat([[0, 0]]), dir);
  let s = solidSvg(DISC_Y([0, 0, W.crankZ], -46, -26, 16), { tone: "hi" });
  s += solidSvg(PRISM_Y([0, 0, W.crankZ], cw, -26, -14), { tone: "hi" });
  for (const da of [-0.38, 0, 0.38]) { const t = dir + Math.PI + da; s += lineSvg(G.circleOf(FY([44 * Math.cos(t), 0, W.crankZ + 44 * Math.sin(t)]), -14, 4.2, P), { tone: "hi" }); }
  s += solidSvg(PRISM_Y([0, 0, W.crankZ], web, -26, -14), { tone: "hi" });
  s += lineSvg(G.circleOf(FY([0, 0, W.crankZ]), -14, 9, P), { tone: "mid" });
  const pinS = solidSvg(DISC_Y([pin[0], 0, pin[1]], -14, 12, 17), { tone: "hi" });
  return { svg: MAT("darksteel", s) + MAT("chrome", pinS), pin };
}
function rodSvg(pin, pinZ) {
  const dx = 0 - pin[0], dz = pinZ - pin[1];
  const len = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
  let s = solidSvg(PRISM_Y([pin[0], 0, pin[1]], rot(G.stadium(26, 14, len, 40), ang), -9, 9), { tone: "hi", lit: true });
  s += lineSvg(G.circleOf(FY([pin[0], 0, pin[1]]), 9, 19, P), { tone: "mid" });
  const p = (d) => [pin[0] + Math.cos(ang) * d, pin[1] + Math.sin(ang) * d];
  const a0 = p(30), a1 = p(len - 20);
  const nx = -Math.sin(ang) * 6, nz = Math.cos(ang) * 6;
  s += lineSvg(pathOf([iso([a0[0] + nx, 9, a0[1] + nz], P), iso([a1[0] + nx * 0.6, 9, a1[1] + nz * 0.6], P)]), { tone: "mid" });
  s += lineSvg(pathOf([iso([a0[0] - nx, 9, a0[1] - nz], P), iso([a1[0] - nx * 0.6, 9, a1[1] - nz * 0.6], P)]), { tone: "mid" });
  const c0 = [pin[0] - Math.sin(ang) * 27, pin[1] + Math.cos(ang) * 27], c1 = [pin[0] + Math.sin(ang) * 27, pin[1] - Math.cos(ang) * 27];
  s += lineSvg(pathOf([iso([c0[0], 9, c0[1]], P), iso([c1[0], 9, c1[1]], P)]), { tone: "hi" });
  let bolts = "";
  for (const sg of [-1, 1]) { const b = [pin[0] - Math.sin(ang) * 21 * sg - Math.cos(ang) * 3, pin[1] + Math.cos(ang) * 21 * sg - Math.sin(ang) * 3]; bolts += solidSvg(DISC_Y([b[0], 0, b[1]], 9, 11.5, 3.6), { tone: "hi" }); }
  const washer = solidSvg(DISC_Y([pin[0], 0, pin[1]], 12, 15, 21), { tone: "hi" }) + dotsSvg([iso([pin[0], 15, pin[1]], P)], { size: 0.8, tone: "hi" });
  const pinEnd = lineSvg(G.circleOf(FY([0, 0, pinZ]), 9, 9, P), { tone: "hi" });
  return MAT("steel", s + pinEnd) + MAT("gold", bolts) + MAT("brass", washer);
}
function camSvg(x, phi, center, mtl) {
  const a = (((phi - center) / 2) * Math.PI) / 180 - Math.PI / 2;
  const half = (M.ENGINE.ivc - M.ENGINE.ivo) / 4 * Math.PI / 180;
  const prof = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    const d = Math.atan2(Math.sin(t), Math.cos(t));
    const lift = Math.abs(d) < half ? M.ENGINE.lift * Math.cos((Math.PI / 2) * d / half) ** 2 : 0;
    const r = W.camR + lift;
    return [r * Math.cos(t + a), r * Math.sin(t + a)];
  });
  const shaft = solidSvg(DISC_Y([x, 0, W.camZ], -38, -12, 8), { tone: "hi" });
  const lobe = solidSvg(PRISM_Y([x, 0, W.camZ], prof, -9, 9), { tone: "hi" });
  const nose = solidSvg(DISC_Y([x, 0, W.camZ], 9, 12, 8), { tone: "hi" }) + dotsSvg([iso([x, 12, W.camZ], P)], { size: 0.8, tone: "hi" });
  return MAT("steel", shaft) + MAT(mtl, lobe) + MAT("steel", nose);
}
function sprocketSvg(x, z, r, teeth, a) {
  const pts = Array.from({ length: teeth * 2 }, (_, i) => { const t = a + (i / (teeth * 2)) * Math.PI * 2; const rr = i % 2 ? r : r + 2.2; return [x + rr * Math.cos(t), z + rr * Math.sin(t)]; });
  let s = solidSvg(G.prismOf(FY([0, W.beltY - 6, 0]), pts, 0, 5, P), { tone: "hi", crease: "none" });
  s += lineSvg(G.circleOf(FY([x, 0, z]), W.beltY - 1, r * 0.55, P), { tone: "mid" });
  for (let i = 0; i < 4; i++) { const t = a + i * Math.PI / 2 + 0.4; s += lineSvg(G.circleOf(FY([x + r * 0.62 * Math.cos(t), 0, z + r * 0.62 * Math.sin(t)]), W.beltY - 1, r * 0.13, P), { tone: "mid" }); }
  const mark = [x + r * 0.85 * Math.cos(a), z + r * 0.85 * Math.sin(a)];
  s += dotsSvg([iso([mark[0], W.beltY - 1, mark[1]], P)], { size: 1, tone: "hi" });
  return MAT("gold", s);
}
function helix(cx, cy, r, z0, z1, turns) {
  const n = Math.ceil(turns * 28), V = towardViewer(P);
  const back = [], front = []; let cur = null, curFront = null;
  const flush = () => { if (cur && cur.length > 1) (curFront ? front : back).push(pathOf(cur)); };
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * turns * Math.PI * 2;
    const p = [cx + r * Math.cos(t), cy + r * Math.sin(t), z0 + ((z1 - z0) * i) / n];
    const f = Math.cos(t) * V[0] + Math.sin(t) * V[1] > 0;
    if (cur === null || f !== curFront) { flush(); cur = cur ? [cur[cur.length - 1]] : []; curFront = f; }
    cur.push(iso(p, P));
  }
  flush();
  return { back: back.join(""), front: front.join("") };
}
function valveSvg(x, lift, tint) {
  const z0 = W.deck - lift;
  const F = G.frameOf([x, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  let v = solidSvg(G.solidOf([[z0, 15], [z0 + 2.4, 15], [z0 + 7, 5, 1], [z0 + 12, 3.5]], F, P), { tone: "hi", lit: true });
  v += solidSvg(G.disc(z0 + 12, BUCKET_TOP - lift - 6, 3.5, F, P), { tone: "hi" });
  const top = BUCKET_TOP - lift - 6, bot = W.headTop + 2;
  const coil = helix(x, 0, 9, bot, top, 6.5);
  const back = '<path class="iso-line lab-spring" data-tone="mid" d="' + coil.back + '"/>', front = '<path class="iso-line lab-spring" data-tone="hi" d="' + coil.front + '"/>';
  const ret = solidSvg(G.disc(top - 1, top + 1, 10, F, P), { tone: "hi" });
  const bucket = solidSvg(G.disc(BUCKET_TOP - lift - BUCKET_H, BUCKET_TOP - lift, 11, F, P), { tone: "hi" });
  return MAT("green", back) + MAT(tint, v) + MAT("steel", ret) + MAT("green", front) + MAT("chrome", bucket);
}
function pistonSvg(crown) {
  const ring = (r0, r1) => { const a = [], n = 36; for (let i = 0; i <= n; i++) { const t = Math.PI + (i / n) * Math.PI; a.push([r1 * Math.cos(t), r1 * Math.sin(t)]); } for (let i = n; i >= 0; i--) { const t = Math.PI + (i / n) * Math.PI; a.push([r0 * Math.cos(t), r0 * Math.sin(t)]); } return a; };
  const half = []; for (let i = 0; i <= 36; i++) { const t = Math.PI + (i / 36) * Math.PI; half.push([39 * Math.cos(t), 39 * Math.sin(t)]); }
  let s = solidSvg(extrude(ring(35, 39), crown - 58, 48, P, { convex: false }), { tone: "hi", crease: "none" });
  s += solidSvg(extrude(half, crown - 10, 10, P), { tone: "hi", lit: true });
  s += solidSvg(G.disc(-35, -16, 12, FY([0, 0, crown - W.crownAbovePin]), P), { tone: "hi" });
  const cut = (x0, x1, z0, z1) => '<path class="lab-cut" d="' + pathOf([iso([x0, 0, z0], P), iso([x1, 0, z0], P), iso([x1, 0, z1], P), iso([x0, 0, z1], P)], true) + '"/>';
  let cuts = cut(-39, -35, crown - 58, crown - 10) + cut(35, 39, crown - 58, crown - 10) + cut(-39, 39, crown - 10, crown);
  for (const dz of [-5, -10.5, -16]) for (const x of [-39, 37.2]) cuts += '<path class="lab-ring" d="' + pathOf([iso([x, 0.2, crown + dz - 1.1], P), iso([x + 1.8, 0.2, crown + dz - 1.1], P), iso([x + 1.8, 0.2, crown + dz + 1.1], P), iso([x, 0.2, crown + dz + 1.1], P)], true) + '"/>';
  const soot = '<path class="lab-soot" d="' + pathOf(half.map(([x, y]) => iso([x * 0.9, y * 0.9, crown + 0.05], P)), true) + '"/>';
  return MAT("alu", s + soot) + cuts;
}
function needle(cx, cy, r, z, frac) {
  const a = -Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1.02, Math.max(0, frac));
  return lineOnTop([cx - Math.sin(a) * 3, cy + Math.cos(a) * 3], [cx + Math.sin(a) * (r - 3), cy - Math.cos(a) * (r - 3)], z, P);
}
`;

// ---- page ------------------------------------------------------------------------------------
export function figure(theme) {
  const sharedConst = `const W = ${JSON.stringify({ ...W, crankR: R, crownAbovePin: CROWN_ABOVE_PIN })}; const BUCKET_TOP = ${BUCKET_TOP}; const BUCKET_H = ${BUCKET_H}; const DIALS = ${JSON.stringify(DIALS)}; const CONSOLE_H = ${CONSOLE_H};`;
  const B = new Function(
    "G", "P", "M", "solidSvg", "lineSvg", "dotsSvg", "iso", "pathOf", "extrude", "towardViewer", "lineOnTop",
    `${sharedConst}${LIVE}; return { crankSvg, rodSvg, camSvg, valveSvg, pistonSvg, sprocketSvg, needle };`,
  )(G, P, M, k.solidSvg, k.lineSvg, k.dotsSvg, k.iso, k.pathOf, k.extrude, k.towardViewer, k.lineOnTop);

  const phi0 = 330;
  const crank = B.crankSvg(phi0);
  const pinZ = W.crankZ + M.pinHeight(phi0);
  const crown = pinZ + CROWN_ABOVE_PIN;
  const IN_C = (M.ENGINE.ivo + M.ENGINE.ivc) / 2, EX_C = (M.ENGINE.evo + M.ENGINE.evc) / 2;

  const back = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "eng-back",
    label: "A sectioned single-cylinder four-stroke engine on a test bench. The front half of the crankcase, finned barrel, cylinder head and piston is cut away and painted red, so the crankshaft, connecting rod, piston, two cam-driven poppet valves and the spark plug can be watched working together. A console on the bench reads engine speed and cylinder pressure.",
    body: [
      bench(),
      camCover(),
      instrumentConsole(),
      `<g data-part="belt">${timingBelt()}<g data-part="sprockets" data-name="Timing belt">${B.sprocketSvg(0, W.crankZ, 11, 14, 0) + B.sprocketSvg(-W.valveX, W.camZ, 22, 28, 0) + B.sprocketSvg(W.valveX, W.camZ, 22, 28, 0)}</g></g>`,
      `<g data-part="case">${crankcase()}</g>`,
      `<g data-part="barrel">${barrel()}</g>`,
      `<g data-part="piston" data-name="Piston">${B.pistonSvg(crown)}</g>`,
      `<g data-part="crank" data-name="Crankshaft">${crank.svg}</g>`,
      `<g data-part="rod" data-name="Connecting rod">${B.rodSvg(crank.pin, pinZ)}</g>`,
      `<g data-part="case-r">${caseRightWall()}</g>`,
      `<g data-part="coil">${coil()}</g>`,
      `<g data-part="intake">${intake()}</g>`,
      `<g data-part="exhaust">${exhaust()}</g>`,
      `<g data-part="head">${head()}</g>`,
    ],
  });
  const sparkAt = at([W.plug[0], W.plug[1] + 6, W.deck + 1]);
  const front = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "eng-front", label: "",
    body: [
      `<g data-part="valves"><g data-part="valve-in" data-name="Intake valve">${B.valveSvg(-W.valveX, M.intakeLift(phi0), "steel")}</g><g data-part="valve-ex" data-name="Exhaust valve">${B.valveSvg(W.valveX, M.exhaustLift(phi0), "heatblue")}</g></g>`,
      `<g data-part="cams"><g data-part="cam-in" data-name="Intake camshaft">${B.camSvg(-W.valveX, phi0, IN_C, "blue")}</g><g data-part="cam-ex" data-name="Exhaust camshaft">${B.camSvg(W.valveX, phi0, EX_C, "orange")}</g></g>`,
      `<g data-part="plug">${sparkPlug()}<circle data-part="spark" class="lab-spark" cx="${sparkAt[0]}" cy="${sparkAt[1]}" r="3.4"/></g>`,
    ],
  });

  const plate = k.plateHtml({
    fig: "Fig 1",
    title: "Four-stroke engine",
    hint: "Drag to turn · tap a part",
    readout: "330° · Compression",
    body: `<div class="iso-stage eng-stage" tabindex="0" role="slider" aria-label="Engine crank angle. Arrow keys turn the crank." aria-valuemin="0" aria-valuemax="720" aria-valuenow="${phi0}">${back}<canvas class="eng-gas" aria-hidden="true"></canvas>${front}</div>`,
  });

  const css = `
.eng-stage{position:relative}
.eng-stage svg{position:relative}
.eng-stage .eng-front,.eng-stage .eng-gas{position:absolute;inset:0;width:100%;height:100%}
.eng-gas,.eng-front{pointer-events:none}
body[data-theme="dark"] .eng-gas{mix-blend-mode:screen}
.lab-cut{fill:url(#lab-hatch);stroke:#9e2a1c;stroke-width:.5;vector-effect:non-scaling-stroke}
.lab-cavity{fill:#3a3f48;stroke:#22252b;stroke-width:.5;vector-effect:non-scaling-stroke}
.lab-cavity-in{fill:#2b4f8f}
.lab-cavity-ex{fill:#8f3d1f}
.lab-guide{fill:#b08a4a;stroke:#6b5228;stroke-width:.4}
.lab-ring{fill:#2b2d31}
.lab-soot{fill:#3a2f28;opacity:.18}
.lab-oil{fill:#e0a83a;opacity:.45}
.lab-spring{stroke-width:1.2}
.lab-needle{stroke:#e5372a;stroke-width:1.3}
.lab-spark{fill:#fffbe0;opacity:0;filter:drop-shadow(0 0 3px #7fc6ff) drop-shadow(0 0 7px #ffd36b)}
[data-part]{transition:opacity .5s}
body[data-mode="xray"] :is([data-part="case"],[data-part="case-r"],[data-part="barrel"],[data-part="head"],[data-part="belt"],[data-part="intake"],[data-part="exhaust"],[data-part="coil"]){opacity:.2}
body[data-mode="exploded"] :is([data-part="ht-lead"],[data-part="sensor-line"]){opacity:0}
${materialsCss(["slate", "rubber", "brass", "darksteel", "red", "steel", "navy", "chrome", "white", "castalu", "yellow", "iron", "copper", "alu", "blue", "heatblue", "ceramic", "gold", "orange", "green"])}
`;
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<pattern id="lab-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" style="fill:#e2533b"/><line x1="0" y1="0" x2="0" y2="4" style="stroke:#b3301d" stroke-width="1.1"/></pattern>
</defs></svg>`;

  const FRAG = `
uniform float uCrown; uniform float uDeck; uniform float uR; uniform vec2 uPlug;
uniform float uFlame; uniform float uFront; uniform float uMix; uniform float uExh; uniform float uHeat; uniform float uLight; uniform float uSwirl;
void main(){
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 o = rayOf(vb); vec3 d = towardViewer();
  float a = d.x*d.x + d.y*d.y, b = 2.0*(o.x*d.x + o.y*d.y), c = o.x*o.x + o.y*o.y - uR*uR;
  float disc = b*b - 4.0*a*c;
  if (disc <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float sq = sqrt(disc);
  float t0 = (-b - sq)/(2.0*a), t1 = (-b + sq)/(2.0*a);
  t1 = min(t1, -o.y/d.y);
  t0 = max(t0, (uCrown - o.z)/d.z); t1 = min(t1, (uDeck - o.z)/d.z);
  if (t1 <= t0) { gl_FragColor = vec4(0.0); return; }
  vec3 col = vec3(0.0); float alpha = 0.0;
  const int N = 18;
  float dt = (t1 - t0)/float(N);
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + hash12(gl_FragCoord.xy + float(i))) * dt;
    vec3 p = o + d*t;
    float rr = length(p.xy)/uR;
    float edge = 1.0 - smoothstep(0.86, 1.0, rr);
    float n = fbm3(vec3(p.x*0.07 + uSwirl, p.y*0.07 - uSwirl*0.6, p.z*0.09 + uTime*0.4));
    float mixD = uMix * (0.35 + 0.65*n) * edge * 0.06;
    vec3 mixC = mix(vec3(0.45,0.75,1.0), vec3(0.18,0.45,0.95), uLight);
    float dist = length(p - vec3(uPlug, uDeck));
    float front = smoothstep(uFront + 6.0, uFront - 10.0, dist + (n - 0.5)*14.0);
    float flameD = uFlame * front * edge * 0.18;
    vec3 flameC = mix(vec3(1.0,0.82,0.35), vec3(0.35,0.55,1.0), smoothstep(uFront - 6.0, uFront + 4.0, dist));
    float exhD = uExh * (0.4 + 0.6*n) * edge * 0.055;
    vec3 exhC = mix(mix(vec3(0.55,0.42,0.33), vec3(1.0,0.42,0.1), uHeat), mix(vec3(0.42,0.33,0.27), vec3(0.95,0.32,0.06), uHeat), uLight);
    float dens = (mixD + flameD + exhD) * dt;
    vec3 c = (mixC*mixD + flameC*flameD*(1.7 - 0.6*uLight) + exhC*exhD) / max(1e-4, mixD + flameD + exhD);
    float aa = 1.0 - exp(-dens);
    col += (1.0 - alpha) * c * aa; alpha += (1.0 - alpha) * aa;
  }
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, alpha);
}`;

  const live = `
${modelSource}
const M = { ENGINE, crankR, pinHeight, intakeLift, exhaustLift, sparkAt, burned, pressure, strokeOf, volume, pistonSpeed, manifold, indicated, sweptCc, clearanceCc, wrap720 };
const P = ${JSON.stringify(P)};
${sharedConst}
${LIVE}
const stage = document.querySelector(".eng-stage");
const part = (n) => stage.querySelector('[data-part="' + n + '"]');
const parts = { crank: part("crank"), rod: part("rod"), piston: part("piston"), vin: part("valve-in"), vex: part("valve-ex"), cin: part("cam-in"), cex: part("cam-ex"), spr: part("sprockets"), spark: part("spark"), head: part("head"), barrel: part("barrel"), cams: part("cams"), valves: part("valves"), plug: part("plug"), intake: part("intake"), tach: part("needle-tach"), press: part("needle-press") };
const readout = document.querySelector("[data-readout]");
const IN_C = ${IN_C}, EX_C = ${EX_C};
let phi = ${phi0}, target = null, playing = true, last = 0, frame = 0, visible = true;
let explode = 0, explodeTarget = 0, indicatedCache = null, tachShown = 0, pressShown = 0;
const pv = document.querySelector(".eng-pv");
const pvCtx = pv ? pv.getContext("2d") : null;
const canvas = stage.querySelector(".eng-gas");
const layer = glLayer({ canvas, fragment: ${JSON.stringify(FRAG)}, view: [${WIDTH}, ${HEIGHT}], camera: glCamera(P), uniforms: ["uCrown","uDeck","uR","uPlug","uFlame","uFront","uMix","uExh","uHeat","uLight","uSwirl"], onError: () => {} });
const env = { flame: { at: 0 }, mix: { at: 0 }, exh: { at: 0 } };

function drawPv(rpm, thr) {
  if (!pvCtx || !pv.clientWidth) return;
  const w = pv.width = pv.clientWidth * 2, h = pv.height = pv.clientHeight * 2;
  const cs = getComputedStyle(document.body);
  const ink = cs.getPropertyValue("--anatomy-strong").trim(), acc = cs.getPropertyValue("--lab-accent").trim(), faint = cs.getPropertyValue("--lab-rule").trim(), txt = cs.getPropertyValue("--anatomy-muted").trim();
  const vmax = volume(180), pmax = 80;
  const px = (v) => 40 + ((v - clearanceCc * 0.6) / (vmax - clearanceCc * 0.6)) * (w - 56);
  const py = (p) => h - 26 - Math.log10(Math.max(0.2, p) / 0.2) / Math.log10(pmax / 0.2) * (h - 44);
  pvCtx.clearRect(0, 0, w, h);
  pvCtx.lineWidth = 1; pvCtx.strokeStyle = faint; pvCtx.fillStyle = txt; pvCtx.font = "500 18px ui-monospace,monospace";
  for (const p of [0.5, 1, 5, 10, 50]) { pvCtx.beginPath(); pvCtx.moveTo(40, py(p)); pvCtx.lineTo(w - 12, py(p)); pvCtx.stroke(); pvCtx.fillText(String(p), 0, py(p) + 6); }
  pvCtx.fillText("V →", w - 54, h - 4);
  const seg = [[0, 180, "#3b82f6"], [180, 360, "#a855f7"], [360, 540, "#f97316"], [540, 720, "#78716c"]];
  pvCtx.lineWidth = 3;
  for (const [a, b, c] of seg) { pvCtx.strokeStyle = c; pvCtx.beginPath(); for (let q = a; q <= b; q += 2) { const x = px(volume(q)), y = py(pressure(q, rpm, thr)); q === a ? pvCtx.moveTo(x, y) : pvCtx.lineTo(x, y); } pvCtx.stroke(); }
  const x = px(volume(phi)), y = py(pressure(phi, rpm, thr));
  pvCtx.fillStyle = acc; pvCtx.beginPath(); pvCtx.arc(x, y, 8, 0, Math.PI * 2); pvCtx.fill();
  pvCtx.strokeStyle = ink; pvCtx.lineWidth = 2; pvCtx.stroke();
}

function draw(dt) {
  const rpm = Lab.value("rpm"), thr = Lab.value("throttle") / 100;
  const p = wrap720(phi);
  const crank = crankSvg(p % 360);
  const pinZ = W.crankZ + pinHeight(p);
  const crown = pinZ + W.crownAbovePin;
  parts.crank.innerHTML = crank.svg;
  parts.rod.innerHTML = rodSvg(crank.pin, pinZ);
  parts.piston.innerHTML = pistonSvg(crown);
  const li = intakeLift(p), le = exhaustLift(p);
  parts.vin.innerHTML = valveSvg(-W.valveX, li, "steel");
  parts.vex.innerHTML = valveSvg(W.valveX, le, "heatblue");
  parts.cin.innerHTML = camSvg(-W.valveX, p, IN_C, "blue");
  parts.cex.innerHTML = camSvg(W.valveX, p, EX_C, "orange");
  const camA = -(p / 2) * Math.PI / 180, crA = -p * Math.PI / 180;
  parts.spr.innerHTML = sprocketSvg(0, W.crankZ, 11, 14, crA) + sprocketSvg(-W.valveX, W.camZ, 22, 28, camA) + sprocketSvg(W.valveX, W.camZ, 22, 28, camA);
  const up = (g, dz) => g && g.setAttribute("transform", translateAlong(P, [0, 0, dz * explode]));
  up(parts.head, 120); up(parts.cams, 120); up(parts.valves, 120); up(parts.plug, 120); up(parts.intake, 120); up(parts.barrel, 60);
  const s = sparkAt(rpm, thr), xb = burned(p, rpm, thr);
  const sinceSpark = wrap720(p - s);
  const flameTarget = sinceSpark < ENGINE.evo - s ? Math.max(0, 1 - Math.max(0, sinceSpark - 70) / 60) * thr ** 0.3 : 0;
  const mixTarget = (p < ENGINE.ivc || p > 700 ? Math.min(1, li / 3 + (p > 40 && p < ENGINE.ivc ? 0.7 : 0)) : (p < s ? 0.85 : 0.85 * (1 - xb))) * (0.35 + 0.65 * thr);
  const exhTarget = p >= s ? Math.min(1, xb) * (p > ENGINE.evo ? Math.max(0.15, 1 - (p - ENGINE.evo) / 220) : 1) : 0;
  const ease = (st, tg, upT, downT) => { st.at += (tg - st.at) * (1 - Math.exp(-dt / (tg > st.at ? upT : downT))); };
  ease(env.flame, flameTarget, 0.02, 0.16); ease(env.mix, mixTarget, 0.12, 0.2); ease(env.exh, exhTarget, 0.08, 0.3);
  parts.spark.style.opacity = sinceSpark < 8 && !Lab.reduced.matches ? String(1 - sinceSpark / 8) : "0";
  if (layer && explode < 0.05) {
    layer.draw({ uCrown: crown, uDeck: W.deck, uR: W.bore - 0.5, uPlug: [W.plug[0], W.plug[1]], uFlame: env.flame.at, uFront: 4 + 60 * Math.min(1, sinceSpark / 45), uMix: env.mix.at, uExh: env.exh.at, uHeat: Math.max(0, 1 - Math.max(0, p - 380) / 220), uLight: Lab.theme === "light" ? 1 : 0, uSwirl: p / 90 }, performance.now() / 1000);
  } else if (layer) layer.clear();
  const bar = pressure(p, rpm, thr);
  tachShown += (rpm - tachShown) * (1 - Math.exp(-dt / 0.4));
  pressShown += (bar - pressShown) * (1 - Math.exp(-dt / 0.05));
  parts.tach.setAttribute("d", needle(DIALS[0].at[0], DIALS[0].at[1], DIALS[0].r, CONSOLE_H + 3.6, tachShown / 7000));
  parts.press.setAttribute("d", needle(DIALS[1].at[0], DIALS[1].at[1], DIALS[1].r, CONSOLE_H + 3.6, pressShown / 70));
  const st = strokeOf(p);
  const text = Math.round(p) + "° · " + st;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(p)));
  stage.setAttribute("aria-valuetext", text);
  Lab.gauge("stroke", st, st === "Power");
  Lab.gauge("angle", Math.round(p) + "°");
  Lab.gauge("pressure", (bar < 10 ? bar.toFixed(2) : bar.toFixed(1)) + " bar", bar > 20);
  Lab.gauge("volume", volume(p).toFixed(0) + " cc");
  Lab.gauge("speed", Math.abs(pistonSpeed(p, rpm)).toFixed(1) + " m/s");
  Lab.gauge("valves", (li > 0.05 ? li.toFixed(1) : "0") + " / " + (le > 0.05 ? le.toFixed(1) : "0"));
  if (!indicatedCache || indicatedCache.key !== rpm + ":" + thr) indicatedCache = { key: rpm + ":" + thr, ...indicated(rpm, thr) };
  Lab.gauge("power", indicatedCache.kw.toFixed(1) + " kW");
  Lab.gauge("slow", "×" + Math.round(slowFactor(rpm)));
  drawPv(rpm, thr);
}
const visualRevs = (rpm) => 0.22 + 0.78 * Math.min(1, Math.max(0, (rpm - 800) / 5200));
const slowFactor = (rpm) => rpm / 60 / visualRevs(rpm);
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  const calm = Lab.reduced.matches;
  explode += (explodeTarget - explode) * (calm ? 1 : 1 - Math.exp(-dt / 0.35));
  if (Math.abs(explodeTarget - explode) < 0.002) explode = explodeTarget;
  if (target !== null) {
    const d = ((target - phi) % 720 + 1080) % 720 - 360;
    if (Math.abs(d) < 0.3) { phi = target; target = null; } else phi += d * (calm ? 1 : 1 - Math.exp(-dt / 0.3));
  } else if (playing && explode < 0.02 && !calm) {
    phi += 360 * visualRevs(Lab.value("rpm")) * dt;
  }
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !Lab.paused) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
document.addEventListener("lab-pause", (e) => { if (!e.detail) run(); });

let drag = null;
stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, phi, moved: false }; });
stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.moved && Math.abs(e.clientX - drag.x) < 8) return;
  if (!drag.moved) { drag.moved = true; playing = false; target = null; syncPlay(); try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
  const w = stage.getBoundingClientRect().width;
  phi = drag.phi + ((e.clientX - drag.x) / w) * 540; run();
});
const endDrag = () => { drag = null; };
stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("keydown", (e) => {
  const by = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 90, PageDown: -90 }[e.key];
  if (by === undefined) return; e.preventDefault(); playing = false; syncPlay(); target = wrap720((target ?? phi) + by); run();
});
function syncPlay() { const b = document.querySelector('[data-action="play"]'); if (b) b.textContent = playing ? "Pause" : "Play"; }
Lab.onAction((id) => {
  if (id === "play") { playing = !playing; if (playing) target = null; syncPlay(); run(); }
  if (id === "step") { playing = false; syncPlay(); target = wrap720((target ?? phi) + 15); run(); }
});
Lab.onMode((m) => { explodeTarget = m === "exploded" ? 1 : 0; run(); });
Lab.onChange(() => { indicatedCache = null; run(); });
Lab.onStep((i, s, user) => { if (user && s.phi !== undefined) { playing = false; syncPlay(); target = s.phi; } run(); });
syncPlay();
run();
`;

  return {
    plate: defs + plate,
    css,
    script: kitScript() + glScript() + latheScript() + live,
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Indicator diagram</span><em><i style="color:#3b82f6">intake</i> · <i style="color:#a855f7">comp</i> · <i style="color:#f97316">power</i> · <i style="color:#78716c">exh</i></em></div><canvas class="eng-pv" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
