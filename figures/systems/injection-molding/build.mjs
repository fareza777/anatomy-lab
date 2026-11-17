// Injection moulding machine, cut away. Pellets fall from the hopper into a heated barrel where a
// turning screw melts and carries them forward; the screw then rams forward like a plunger and
// shoots the melt into a closed steel mould. A toggle clamp holds the mould shut, the part cools,
// the mould opens and ejector pins push the part out into the bin.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 430;

const BASE = { x: -280, y: -46, w: 500, d: 92 };
const AX = 108; // machine centre height
const BAR = { x0: -236, x1: -54, r: 13 }; // barrel
const FIX = { x: -40, t: 16 }; // fixed platen (x is its mould face is x + t)
const MOULD = { w: 26, h: 74, d: 44 }; // each mould half: thickness along x, height, depth
const MOV = { closed: 0, open: 52 }; // moving half offset
const REAR = { x: 168 };
const BIN = { x: 20, y: 66 };

const P = k.fitProjection([...k.boxCorners(BASE, 0, 0), [BASE.x, 0, 190], [REAR.x + 30, 0, 190], [BIN.x, BIN.y + 22, 0], [-200, 0, 196]], WIDTH, HEIGHT, { pad: 16, azimuth: 64, elevation: 26 });
const H = helpers(P);
const { MAT, S, Ln, slab, cyl, named, poly, tube, halo, shell, Xf, Zf } = H;
const MF = FIX.x + FIX.t; // mould face of the fixed platen

function base() {
  let s = halo(BASE.x, BASE.y, BASE.w, BASE.d, 0, 8);
  s += named("Machine base", MAT("slate", slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, 62, 6, 1.2)));
  s += named("Control panel", MAT("carbon", slab(-120, BASE.y + BASE.d, 54, 3, 18, 34, 1)) + `<g data-part="screen"></g>`);
  return s;
}

const tieBar = (y, z) => MAT("chrome", S(G.disc(FIX.x, REAR.x, 5, Xf([0, y, z]), P)));

function injectionBack() {
  const F = Xf([0, 0, AX]);
  let s = named("Injection cylinder", MAT("orange", slab(-276, -26, 34, 52, 62, 70, 4, 1)));
  s += named("Carriage", MAT("orange", slab(BAR.x0 - 6, -24, BAR.x1 - BAR.x0 + 6, 48, 62, 22, 3, 0.8)));
  // barrel cut away: only its back half, with heater bands round it
  s += named("Barrel", MAT("steel", shell(F, BAR.r - 4, BAR.r, Math.PI / 2, (3 * Math.PI) / 2, BAR.x0, BAR.x1)));
  s += `<g data-part="bands" data-name="Heater bands"></g>`;
  s += `<g data-part="screw" data-name="Screw"></g>`;
  s += named("Nozzle", MAT("steel", S(G.solidOf([[BAR.x1, 9], [BAR.x1 + 6, 9], [FIX.x - 2, 3]], F, P))));
  return s;
}

function fixedPlaten() {
  let s = named("Fixed platen", MAT("orange", slab(FIX.x, -56, FIX.t, 112, 62, 112, 4, 1)));
  s += tieBar(-40, AX + 40) + tieBar(-40, AX - 40);
  return s;
}

function mouldFixed() {
  // cavity half, cut away at the front so the part shows
  const x0 = MF, z0 = AX - MOULD.h / 2;
  let s = MAT("darksteel", slab(x0, -MOULD.d, MOULD.w, MOULD.d, z0, MOULD.h, 2, 0.6));
  s += MAT("steel", slab(x0, 0, MOULD.w, 2, z0, 14, 0.5, 0) + slab(x0, 0, MOULD.w, 2, z0 + MOULD.h - 14, 14, 0.5, 0));
  s += MAT("teal", tube([[x0 + 6, -MOULD.d, z0 + 6], [x0 + 6, -MOULD.d - 12, z0 + 6], [x0 + 6, -MOULD.d - 12, 70]], 1.6, { bend: 4 }));
  return named("Mould (cavity half)", s);
}

function rearAndFront() {
  let s = named("Rear platen", MAT("orange", slab(REAR.x, -56, 18, 112, 62, 112, 4, 1)));
  s += named("Clamp cylinder", MAT("orange", S(G.disc(REAR.x + 18, REAR.x + 50, 22, Xf([0, 0, AX]), P))) + MAT("chrome", S(G.disc(REAR.x + 50, REAR.x + 54, 8, Xf([0, 0, AX]), P))));
  s += named("Tie bars", tieBar(40, AX + 40) + tieBar(40, AX - 40));
  return s;
}

function hopper() {
  const x = -196, F = Zf([x, 0, 0]);
  let s = named("Hopper", MAT("glass", S(G.solidOf([[AX + 14, 5], [AX + 30, 7], [AX + 52, 26], [AX + 86, 26]], F, P), { tone: "hi", crease: "none" }), ' class="im-glass"') + MAT("steel", S(G.disc(AX + 86, AX + 90, 27, F, P))));
  s += `<g data-part="pellets" data-name="Plastic pellets"></g>`;
  return s;
}

function bin() {
  let s = halo(BIN.x - 26, BIN.y - 16, 56, 32);
  s += named("Parts bin", MAT("blue", slab(BIN.x - 26, BIN.y - 16, 52, 32, 0, 26, 3, 0.6)));
  s += named("Drop chute", MAT("stainless", poly([[MF + 4, 34, 62], [MF + 60, 34, 62], [BIN.x + 20, BIN.y - 10, 28], [BIN.x - 20, BIN.y - 10, 28]], "im-chute")));
  s += `<g data-part="binparts" data-name="Moulded parts"></g>`;
  return s;
}

const LIVE = `
const AXF = Xf([0, 0, C.AX]);
const BX = C.BAR;
function brick(x, y, z, colour, fill, hot) {
  // a 4 x 2 stud brick lying on its side in the mould (studs face +x)
  const h = 34 * fill;
  let s = '<g class="im-part' + (hot ? " im-hot" : "") + '" style="--resin:' + colour + '">';
  s += S(slabOf({ x: x, y: y, w: 13, d: 18, r: 1 }, z, h, P, 2, 0.3), { tone: "hi", crease: "faint" });
  if (fill > 0.98) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s += S(G.disc(x + 13, x + 16, 3, Xf([0, y + 4.5 + j * 9, z + 4.3 + i * 8.5]), P), { tone: "hi", crease: "none" });
  return s + "</g>";
}
function screwSvg(pos, rot, melt) {
  // flights as thin discs on a core; rotation shows as the flights sliding along
  const x0 = BX.x0 + 4 - pos, x1 = BX.x1 - 8 - pos;
  let s = MAT("chrome", S(G.disc(x0 - 30, x1, 5.5, AXF, P)));
  const pitch = 13, ph = (rot % 1) * pitch;
  let fl = "";
  for (let x = x0 + ph; x < x1 - 6; x += pitch) {
    const hot = clamp((x - (BX.x0 + 60)) / 80, 0, 1);
    fl += '<g class="im-melt" style="opacity:' + (0.25 + hot * 0.7).toFixed(2) + ';--m:' + melt + '">' + S(G.disc(x + 1.5, x + pitch - 1.5, 8.4, AXF, P), { tone: "mid", crease: "none" }) + "</g>";
    fl += MAT("chrome", S(G.disc(x, x + 1.4, 8.8, AXF, P), { tone: "hi", crease: "none" }));
  }
  // the melt cushion in front of the screw tip
  const cush = BX.x1 - 2 - (x1);
  if (cush > 2) fl += '<g class="im-melt im-hot" style="--m:' + melt + '">' + S(G.disc(x1, BX.x1 - 2, 8.8, AXF, P), { tone: "mid", crease: "none" }) + "</g>";
  return s + fl;
}
function bandsSvg(melt) {
  let s = "";
  const zones = 4;
  for (let i = 0; i < zones; i++) {
    const x = BX.x0 + 24 + i * 40, temp = melt - (zones - 1 - i) * 12;
    s += '<g class="im-band" style="--glow:' + ramp(HEAT, (temp - 90) / 230) + '">' + S(G.prismOf(AXF, sector(BX.r + 0.4, BX.r + 4, Math.PI / 2, 3 * Math.PI / 2, 16), x, x + 26, P), { tone: "hi", crease: "faint" }) + "</g>";
  }
  return s;
}
let t = 0, made = 0, resin = "abs", lastCycle = -1;
const bins = [];
function frame(dt) {
  const melt = Lab.value("melt"), speed = Lab.value("speed"), cool = Lab.value("cool");
  const R = RESINS[resin], v = verdict(resin, melt, speed, cool), fill = fillShare(resin, melt, speed);
  const ph = phases(resin, melt, speed, cool);
  const order = ["close", "inject", "hold", "cool", "open", "eject"];
  const total = order.reduce((a, k) => a + ph[k], 0);
  if (!Lab.reduced.matches) t += dt * 1.6; // shown 1.6× faster than real time
  const cycle = Math.floor(t / total), tc = t % total;
  let acc = 0, stage = "close", u = 0;
  for (const k of order) { if (tc < acc + ph[k]) { stage = k; u = (tc - acc) / ph[k]; break; } acc += ph[k]; }
  const ease = (x) => x * x * (3 - 2 * x);
  const gap = stage === "close" ? (1 - ease(u)) * C.MOV.open : stage === "open" ? ease(u) * C.MOV.open : stage === "eject" ? C.MOV.open : 0;
  // screw: forward during injection, back (while turning) during cooling as it melts the next shot
  const stroke = 34;
  const pos = stage === "inject" ? -stroke + stroke * ease(u) : stage === "hold" ? 0 : stage === "cool" ? -stroke * ease(Math.min(1, u * 1.3)) : -stroke;
  const turning = stage === "cool" && u < 0.77;
  frame.rot = (frame.rot || 0) + (turning ? dt * 3 : 0);
  setHtml(part("screw"), screwSvg(-pos - stroke, frame.rot, R.colour));
  setHtml(part("bands"), bandsSvg(melt));
  // pellets fall into the throat while the screw turns
  let pel = "";
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 3 + (i % 5) * 4; pel += dot([-196 + r * Math.cos(a), r * Math.sin(a), C.AX + 40 + (i % 7) * 5], 1.4, "im-pellet", "fill:" + R.colour); }
  if (turning) for (let i = 0; i < 4; i++) { const f = (t * 1.5 + i / 4) % 1; pel += dot([-196, 0, C.AX + 36 - f * 24], 1.4, "im-pellet", "fill:" + R.colour); }
  setHtml(part("pellets"), pel);
  // part inside the mould: fills during injection, glows, then cools
  const mf = C.MF;
  const partFill = stage === "close" ? 0 : stage === "inject" ? u * fill : fill;
  const hot = stage === "inject" || stage === "hold" || (stage === "cool" && u < 0.5);
  let mv = "";
  const z0 = C.AX - 17;
  if (stage !== "eject" && partFill > 0) mv += brick(mf + C.MOULD.w - 14 + (stage === "open" ? gap * 0.5 : 0), -19, z0, R.colour, partFill, hot);
  // moving half, platen and toggle
  const mx = mf + C.MOULD.w + gap;
  mv += named("Mould (core half)", MAT("darksteel", slab(mx, -C.MOULD.d, C.MOULD.w, C.MOULD.d, C.AX - C.MOULD.h / 2, C.MOULD.h, 2, 0.6)) + MAT("steel", slab(mx, 0, C.MOULD.w, 2, C.AX - C.MOULD.h / 2, 14, 0.5, 0)));
  if (stage === "eject") { const f = ease(u); mv += MAT("chrome", [-6, 6].map((dz) => S(G.disc(mx - 6 * f, mx + 2, 1.4, Xf([0, 6, C.AX + dz]), P))).join("")); mv += brick(mx - 14 - 10 * f, -19 + f * 30, z0 - f * 40, R.colour, fill, false); }
  const px = mx + C.MOULD.w;
  mv += named("Moving platen", MAT("orange", slab(px, -56, 16, 112, 62, 112, 4, 1)));
  // toggle: two links per side that straighten as the mould closes
  const L = (C.REAR.x - px - 16) / 2, bend = Math.sqrt(Math.max(0, 62 * 62 - L * L));
  let tg = "";
  for (const zs of [1, -1]) {
    const a = [px + 16, -20, C.AX + zs * 30], c = [C.REAR.x, -20, C.AX + zs * 30], b = [(a[0] + c[0]) / 2, -20, C.AX + zs * (30 + bend * 0.6)];
    tg += tube([a, b, c], 3, { bend: 2 });
  }
  mv += named("Toggle clamp", MAT("steel", tg));
  setHtml(part("moving"), mv);
  // finished parts pile up in the bin; defective ones are shown dull
  if (cycle !== lastCycle) { if (lastCycle >= 0) { made++; bins.push({ c: R.colour, bad: v.bad, a: Math.random() * 6, r: Math.random() * 14 }); if (bins.length > 14) bins.shift(); } lastCycle = cycle; }
  setHtml(part("binparts"), bins.map((b, i) => brick(C.BIN.x - 12 + Math.cos(b.a) * b.r * 0.6, C.BIN.y - 8 + Math.sin(b.a) * 6, 6 + Math.floor(i / 6) * 4, b.bad ? "#8a8f98" : b.c, 1, false)).join(""));
  const need = coolTime(resin, melt), bar = pressure(resin, melt, speed);
  setHtml(part("screen"), '<text class="im-screen" transform="' + sideMatrix([-114, C.BASE.y + C.BASE.d + 3.2], 46, P, "left") + '" font-size="6">' + stage.toUpperCase() + " " + Math.round(melt) + "°C</text>");
  Lab.gauge("cycle", total.toFixed(1) + " s");
  Lab.gauge("need", need.toFixed(1) + " s", cool < need * 0.85);
  Lab.gauge("rate", Math.round((3600 / total) * 4).toLocaleString("en-US") + " /h");
  Lab.gauge("bar", Math.round(bar).toLocaleString("en-US") + " bar", bar > 1500);
  Lab.gauge("clamp", clampTonnes(bar).toFixed(0) + " t");
  Lab.gauge("quality", v.text, v.bad);
  readout(R.name + " · " + stage + " · " + made + " shots");
}
Lab.onMode((m) => { resin = m; const R = RESINS[m]; Lab.set("melt", Math.round((R.lo + R.hi) / 2)); });
Lab.onStep((i, s, user) => { if (user) { for (const key of ["melt", "speed", "cool"]) if (s[key] !== undefined) Lab.set(key, s[key]); } });
loop(frame);
`;

export function figure(theme) {
  const C = { AX, BAR, MOULD, MOV, REAR, BIN, MF, BASE };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "im-svg",
    label: "A cut-away injection moulding machine. On the left a hopper of plastic pellets feeds a heated barrel with a turning screw, shown cut open. The screw shoots molten plastic into a two-part steel mould held shut by a toggle clamp between orange platens on the right. When the mould opens, ejector pins push out a small toy brick, which drops into a blue bin.",
    body: [base(), fixedPlaten(), injectionBack(), mouldFixed(), `<g data-part="moving"></g>`, rearAndFront(), hopper(), bin()],
  });
  const plate = k.plateHtml({ fig: "Fig 13", title: "Injection moulding", hint: "Set melt · speed · cooling", readout: "", body: `<div class="iso-stage im-stage" tabindex="0" role="img" aria-label="Injection moulding machine">${svg}</div>` });
  const css = `
.im-glass{opacity:.5}
.im-chute{fill:#c3cad2;stroke:#7b8794;stroke-width:.5;opacity:.85}
body[data-theme="dark"] .im-chute{fill:#7b8794}
.im-pellet{stroke:#00000044;stroke-width:.3}
.im-part .iso-fill,.im-part .iso-shade,.im-part .iso-top{fill:var(--resin)!important}
.im-part .iso-shade[data-shade="0"]{filter:brightness(.7)}
.im-part .iso-shade[data-shade="1"]{filter:brightness(.85)}
.im-hot .iso-fill,.im-hot .iso-shade,.im-hot .iso-top{fill:#ff8a3a!important;filter:drop-shadow(0 0 2px #ff6a00)}
.im-melt .iso-fill,.im-melt .iso-shade,.im-melt .iso-top{fill:var(--m)!important}
.im-melt.im-hot .iso-fill,.im-melt.im-hot .iso-shade,.im-melt.im-hot .iso-top{fill:#ff9a4a!important}
.im-melt .iso-line{stroke:none}
.im-band .iso-fill,.im-band .iso-shade,.im-band .iso-top{fill:var(--glow)!important}
.im-screen{fill:#55f2a0;font-family:var(--anatomy-mono);font-weight:700}
${materialsCss(["slate", "carbon", "chrome", "orange", "steel", "darksteel", "teal", "glass", "blue", "stainless"])}
`;
  return { plate, css, script: pageScript(P, C, modelSource + LIVE) };
}
