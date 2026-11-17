// Mechanical watch movement seen from the back, with the bridges removed so the whole gear
// train shows: mainspring barrel → centre wheel → third wheel → fourth (seconds) wheel →
// escape wheel → pallet lever → balance wheel and hairspring.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 560;
export const HEIGHT = 460;

const R_PLATE = 120;
// wheel centres, tip radii, teeth, pinion radius and height
const W = {
  barrel: { c: [-62, 22], r: 40, n: 78, pin: 0, z: [4, 14], mat: "brass" },
  centre: { c: [-22, 0], r: 31, n: 80, pin: 7, z: [15, 17], mat: "gold" },
  third: { c: [6, -27], r: 24, n: 75, pin: 6, z: [18, 20], mat: "gold" },
  fourth: { c: [24, -2], r: 22, n: 80, pin: 5, z: [21, 23], mat: "gold" },
  escape: { c: [44, -18], r: 13, n: 20, pin: 4, z: [24, 25.5], mat: "steel" },
};
const PAL = { c: [56, -6], z: 26.5 };
const BAL = { c: [71, 14], r: 22, z: 30 };

const RIM = Array.from({ length: 24 }, (_, i) => [(R_PLATE + 10) * Math.cos((i / 24) * Math.PI * 2), (R_PLATE + 10) * Math.sin((i / 24) * Math.PI * 2), 0]);
const P = k.fitProjection([...RIM, ...RIM.map(([x, y]) => [x, y, -10]), [0, 0, 44], [-R_PLATE - 30, 0, 10]], WIDTH, HEIGHT, { pad: 18, azimuth: 60, elevation: 52 });
const H = helpers(P);
const { MAT, S, Ln, cyl, named, Zf } = H;

function plate() {
  const F = Zf([0, 0, 0]);
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -R_PLATE, y: -R_PLATE, w: R_PLATE * 2, d: R_PLATE * 2, r: R_PLATE }, -8, 8, P)}"/>`;
  s += named("Case", MAT("steel", S(G.ringBand(-10, 2, R_PLATE, R_PLATE + 10, F, P))));
  let perl = "";
  for (let r = 14; r < R_PLATE - 8; r += 13) for (let i = 0, n = Math.round((2 * Math.PI * r) / 13); i < n; i++) { const a = (i / n) * Math.PI * 2; perl += H.dot([r * Math.cos(a), r * Math.sin(a), 0.1], 3.2, "mw-perl"); }
  s += named("Main plate", MAT("cream", S(G.disc(-8, 0, R_PLATE, F, P))) + perl);
  // the crown and stem at 3 o'clock on the dial side, which is 9 o'clock seen from the back
  s += named("Crown", MAT("steel", S(G.disc(-R_PLATE - 26, -R_PLATE - 10, 10, G.frameOf([0, 0, -4], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P))) + MAT("steel", S(G.disc(-R_PLATE - 10, -R_PLATE + 4, 3, G.frameOf([0, 0, -4], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P))));
  s += named("Ratchet & click", MAT("steel", S(G.prismOf(Zf([W.barrel.c[0], W.barrel.c[1], 0]), H.gearPoly(40, 16, 2.2, 0), 14.5, 16.5, P))));
  return s;
}

function jewels() {
  let s = "";
  for (const w of Object.values(W)) if (w.pin) s += cyl(w.c[0], w.c[1], 2.6, 0, 0.6, 14);
  s += cyl(PAL.c[0], PAL.c[1], 2.2, 0, 0.6, 14) + cyl(BAL.c[0], BAL.c[1], 2.8, 0, 0.6, 14);
  return named("Jewels", MAT("red", s));
}

function cock() {
  // the balance cock: a bridge screwed to the plate that holds the top balance pivot
  const [bx, by] = BAL.c;
  const arm = [[bx - 4, by - 3], [bx + 4, by - 3], [bx + 32, by + 26], [bx + 25, by + 32]];
  let s = S(G.prismOf(Zf([0, 0, 0]), arm, BAL.z + 6, BAL.z + 8.5, P));
  s += S(G.prismOf(Zf([0, 0, 0]), [[bx + 23, by + 24], [bx + 33, by + 24], [bx + 33, by + 34], [bx + 23, by + 34]], 0, BAL.z + 6, P));
  s += cyl(bx, by, 6, BAL.z + 9, 1.2, 20);
  return named("Balance cock", MAT("gold", s) + MAT("red", cyl(bx, by, 2.2, BAL.z + 10.2, 0.6, 14)) + `<g data-part="regulator" data-name="Regulator"></g>`);
}

const LIVE = `
const ZF = (c) => Zf([c[0], c[1], 0]);
const D2R = Math.PI / 180;
function wheel(w, angle) {
  const F = ZF(w.c);
  let s = MAT(w.mat, gear(F, w.n, w.r, Math.max(1.4, w.r * 0.06), w.z[0], w.z[1], angle, { tone: "hi", crease: "none" }));
  // spokes cut out of the wheel: four dark windows
  if (w.r > 20) for (let i = 0; i < 4; i++) { const a = angle + i * Math.PI / 2 + Math.PI / 4; const pts = []; for (let j = 0; j <= 8; j++) { const t = a - 0.5 + j / 8; pts.push([w.c[0] + w.r * 0.78 * Math.cos(t), w.c[1] + w.r * 0.78 * Math.sin(t), w.z[1] + 0.05]); } for (let j = 8; j >= 0; j--) { const t = a - 0.42 + (j / 8) * 0.84; pts.push([w.c[0] + w.r * 0.32 * Math.cos(t), w.c[1] + w.r * 0.32 * Math.sin(t), w.z[1] + 0.05]); } s += poly(pts, "mw-window"); }
  if (w.pin) s += MAT("steel", gear(F, 8, w.pin, w.pin * 0.3, w.z[0] - 3, w.z[1] + 0.8, -angle * 3, { tone: "hi", crease: "none" }));
  return s;
}
function escapeWheel(angle) {
  const w = C.W.escape, pts = [];
  for (let i = 0; i < 20; i++) {
    const a = angle + (i / 20) * 2 * Math.PI, st = (2 * Math.PI) / 20;
    pts.push([(w.r - 4) * Math.cos(a), (w.r - 4) * Math.sin(a)], [w.r * Math.cos(a + st * 0.45), w.r * Math.sin(a + st * 0.45)], [(w.r - 1) * Math.cos(a + st * 0.62), (w.r - 1) * Math.sin(a + st * 0.62)], [(w.r - 4) * Math.cos(a + st * 0.7), (w.r - 4) * Math.sin(a + st * 0.7)]);
  }
  return MAT("steel", S(G.prismOf(ZF(w.c), pts, w.z[0], w.z[1], P), { tone: "hi", crease: "none" })) + MAT("steel", gear(ZF(w.c), 8, w.pin, 1.2, w.z[0] - 3, w.z[1] + 0.8, angle * 2, { tone: "hi", crease: "none" }));
}
function barrelSpring(wind, angle) {
  // the mainspring seen through the barrel: wound tight round the arbor, or loose against the wall
  const w = C.W.barrel, rOut = 9 + (w.r - 15) * (0.4 + 0.6 * (1 - wind));
  const pts = [];
  for (let i = 0; i <= 260; i++) { const f = i / 260, th = angle + f * 9 * 2 * Math.PI; const r = 7 + (rOut - 7) * f; pts.push([w.c[0] + r * Math.cos(th), w.c[1] + r * Math.sin(th), w.z[1] + 0.2]); }
  return line3(pts, "mw-spring") + MAT("steel", cyl(w.c[0], w.c[1], 6, w.z[1], 1, 18));
}
function lever(beat, pv) {
  // pallet lever: rocks ±7° between two banking pins at each beat
  const a0 = Math.atan2(C.BAL.c[1] - C.PAL.c[1], C.BAL.c[0] - C.PAL.c[0]) + pv * 7 * D2R;
  const rot = (x, y) => [C.PAL.c[0] + x * Math.cos(a0) - y * Math.sin(a0), C.PAL.c[1] + x * Math.sin(a0) + y * Math.cos(a0)];
  const body = [rot(-3, -11), rot(2, -11), rot(2, -2), rot(15, -1.2), rot(17, -2.6), rot(19, 0), rot(17, 2.6), rot(15, 1.2), rot(2, 2), rot(2, 11), rot(-3, 11)];
  let s = MAT("steel", S(G.prismOf(Zf([0, 0, 0]), body, C.PAL.z, C.PAL.z + 1.6, P), { tone: "hi", crease: "none" }));
  for (const y of [-10, 10]) { const p = rot(-6, y); s += MAT("red", S(slabOf({ x: p[0] - 1.6, y: p[1] - 1.2, w: 3.2, d: 2.4, r: 0.4 }, C.PAL.z - 0.4, 2.4, P, 2, 0), { tone: "hi", crease: "none" })); }
  for (const pin of [-1, 1]) { const p = rot(12, pin * 6.5); s += MAT("brass", cyl(p[0], p[1], 0.9, 0, C.PAL.z + 2, 10)); }
  return s;
}
function balance(theta, amp) {
  const [bx, by] = C.BAL.c, z = C.BAL.z, F = Zf([bx, by, 0]);
  let s = "";
  // hairspring: an Archimedean spiral that opens and closes as the balance swings
  const pts = [];
  const breathe = theta / (2 * Math.PI) * 0.6;
  for (let i = 0; i <= 220; i++) { const f = i / 220, th = theta * (1 - f) + f * 12 * 2 * Math.PI * (1 + breathe * 0.02); const r = 2.5 + 12.5 * f; pts.push([bx + r * Math.cos(th), by + r * Math.sin(th), z - 1.5]); }
  s += line3(pts, "mw-hair");
  // the rim, drawn as a thick stroked ring so the hairspring shows through the middle
  s += line3(circle3(F, z, C.BAL.r - 1.5, 48).concat([G.pointOf(F, z, C.BAL.r - 1.5, 0)]), "mw-rim-side") + line3(circle3(F, z + 2.4, C.BAL.r - 1.5, 48).concat([G.pointOf(F, z + 2.4, C.BAL.r - 1.5, 0)]), "mw-rim");
  for (let i = 0; i < 3; i++) { const a = theta + (i * 2 * Math.PI) / 3; s += MAT("gold", S(G.prismOf(F, [[2 * Math.cos(a + 1.5), 2 * Math.sin(a + 1.5)], [(C.BAL.r - 2) * Math.cos(a + 0.06), (C.BAL.r - 2) * Math.sin(a + 0.06)], [(C.BAL.r - 2) * Math.cos(a - 0.06), (C.BAL.r - 2) * Math.sin(a - 0.06)], [2 * Math.cos(a - 1.5), 2 * Math.sin(a - 1.5)]], z + 1, z + 2.6, P), { tone: "hi", crease: "none" })); }
  for (let i = 0; i < 8; i++) { const a = theta + (i * 2 * Math.PI) / 8 + 0.3; s += dot([bx + (C.BAL.r - 1.5) * Math.cos(a), by + (C.BAL.r - 1.5) * Math.sin(a), z + 3.2], 1.1, "mw-screw"); }
  s += MAT("steel", cyl(bx, by, 1.4, z - 6, 12, 10));
  // the impulse (roller) jewel just below the rim, pointing at the lever when theta = 0
  const ra = Math.atan2(C.PAL.c[1] - by, C.PAL.c[0] - bx) + theta;
  s += MAT("red", cyl(bx + 4.5 * Math.cos(ra), by + 4.5 * Math.sin(ra), 0.9, C.PAL.z, 3, 10));
  return s;
}
let simT = 0, beats = 0, lastBeat = -1, lastTrainKey = "";
function frame(dt) {
  const slow = Lab.value("slow"), wind = Lab.value("wind") / 100, reg = Lab.value("reg");
  const amp = amplitude(wind) * D2R;
  if (!Lab.reduced.matches) simT += dt / slow;
  // balance: θ = A sin(2π f t); one beat each time it passes the centre
  const f = F0 * (1 + rate(reg, wind) / 86400);
  const theta = wind > 0.01 ? amp * Math.sin(2 * Math.PI * f * simT) : 0;
  const beat = wind > 0.01 ? Math.floor(2 * f * simT + 0.5) : lastBeat;
  if (beat !== lastBeat) { beats += 1; lastBeat = beat; }
  const pv = beat % 2 ? 1 : -1;
  const esc = -(beats * Math.PI) / 20; // half a tooth per beat
  const key = beats + ":" + Math.round(wind * 50);
  if (key !== lastTrainKey) {
    lastTrainKey = key;
    let tr = MAT("brass", "") + wheel(C.W.barrel, esc * TRAIN.barrel) + barrelSpring(wind, esc * TRAIN.barrel);
    tr += wheel(C.W.centre, -esc * TRAIN.centre) + wheel(C.W.third, esc * TRAIN.third) + wheel(C.W.fourth, -esc * TRAIN.fourth) + escapeWheel(esc);
    setHtml(part("train"), tr);
  }
  setHtml(part("lever"), lever(beat, pv));
  setHtml(part("balance"), balance(theta, amp));
  // regulator index arm on the cock moves with the setting
  const [bx, by] = C.BAL.c, ra = -0.9 + reg * 0.35;
  setHtml(part("regulator"), MAT("steel", line3([[bx, by, C.BAL.z + 10.4], [bx + 30 * Math.cos(ra), by + 30 * Math.sin(ra), C.BAL.z + 10.4]], "mw-index")));
  const r = rate(reg, wind);
  Lab.gauge("bph", BPH.toLocaleString("en-US") + " bph");
  Lab.gauge("amp", Math.round(amplitude(wind)) + "°", amplitude(wind) < 200);
  Lab.gauge("rate", (r >= 0 ? "+" : "") + r.toFixed(1) + " s/d", Math.abs(r) > 10);
  Lab.gauge("reserve", (wind * RESERVE_H).toFixed(0) + " h", wind < 0.15);
  Lab.gauge("escape", escapeRpm().toFixed(0) + " rpm");
  Lab.gauge("beats", beats.toLocaleString("en-US"));
  readout((1 / slow).toFixed(slow > 10 ? 2 : 1) + "× speed · " + Math.round(amplitude(wind)) + "° swing");
}
const focusEsc = () => { const p = at([(C.W.escape.c[0] + C.BAL.c[0]) / 2, (C.W.escape.c[1] + C.BAL.c[1]) / 2, 24]); Lab.zoom.focus(p[0] / C.WIDTH, p[1] / C.HEIGHT, 2.6); };
Lab.onMode((m) => { if (m === "escapement") focusEsc(); else Lab.zoom.focus(0.5, 0.5, 1); });
Lab.onStep((i, s, user) => { if (user) { for (const key of ["slow", "wind", "reg"]) if (s[key] !== undefined) Lab.set(key, s[key]); } });
loop(frame);
`;

export function figure(theme) {
  const C = { W, PAL, BAL, WIDTH, HEIGHT };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "mw-svg",
    label: "The back of a mechanical watch movement with its bridges removed. A brass mainspring barrel drives a train of gold wheels to a steel escape wheel. A pallet lever with two red jewels lets the escape wheel advance half a tooth each time the balance wheel, a gold ring on a fine hairspring, swings past.",
    body: [plate(), jewels(), `<g data-part="train" data-name="Gear train"></g>`, `<g data-part="lever" data-name="Pallet lever"></g>`, `<g data-part="balance" data-name="Balance wheel"></g>`, cock()],
  });
  const plate_ = k.plateHtml({ fig: "Fig 14", title: "Watch movement", hint: "Slow it down · wind it up", readout: "", body: `<div class="iso-stage mw-stage" tabindex="0" role="img" aria-label="Mechanical watch movement">${svg}</div>` });
  const css = `
.mw-perl{fill:none;stroke:#00000014;stroke-width:.6}
body[data-theme="dark"] .mw-perl{stroke:#ffffff10}
.mw-window{fill:#00000055}
.mw-spring{fill:none;stroke:#3c4b5e;stroke-width:.7}
.mw-hair{fill:none;stroke:#2f6fd6;stroke-width:.45}
body[data-theme="dark"] .mw-hair{stroke:#7aa7ff}
.mw-screw{fill:#c9cfd6;stroke:#5b6675;stroke-width:.3}
.mw-rim{fill:none;stroke:#e9b949;stroke-width:3.4}
.mw-rim-side{fill:none;stroke:#a87a1e;stroke-width:3.4}
.mw-index{stroke:#9aa6b4;stroke-width:1.6;stroke-linecap:round}
${materialsCss(["steel", "cream", "red", "gold", "brass"])}
`;
  return { plate: plate_, css, script: pageScript(P, C, modelSource + LIVE) };
}
