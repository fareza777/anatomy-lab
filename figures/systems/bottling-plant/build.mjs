// Bottling line: empty bottles leave a pallet, pass a rinser, ride round a rotary filler under
// gravity valves, get capped, labelled and checked by a light gate that rejects under-filled
// bottles, then are packed six to a case.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 450;

const FLOOR = { x: -296, y: -96, w: 592, d: 210, r: 14 };
const BELT = { y: 72, z: 40, x0: -286, x1: 288 };
const FILL = { x: -60, y: 0, r: 56, table: 40 };
const RINSE = { x0: -236, x1: -168 };
const CAP = { x: 52 };
const LABEL = { x: 128 };
const GATE = { x: 192 };
const PACK = { x: 254 };

const P = k.fitProjection([...k.boxCorners(FLOOR, -12, 0), [FILL.x, 0, 172], [CAP.x, BELT.y, 150], [-250, -40, 110]], WIDTH, HEIGHT, { pad: 14, azimuth: 66, elevation: 28 });
const H = helpers(P);
const { MAT, S, Ln, slab, cyl, named, poly, tube, halo, Yf, Zf } = H;

// bottle path: infeed belt -> round the filler (150° to 390°) -> outfeed belt
const ARC = Array.from({ length: 33 }, (_, i) => { const a = ((150 + (240 * i) / 32) * Math.PI) / 180; return [FILL.x + FILL.r * Math.cos(a), FILL.y + FILL.r * Math.sin(a), FILL.table]; });
const PATH = [[BELT.x0 + 30, BELT.y, BELT.z], [-128, BELT.y, BELT.z], ...ARC, [8, BELT.y, BELT.z], [BELT.x1 - 40, BELT.y, BELT.z]];

function floor() {
  let s = `<path class="iso-halo" d="${k.haloOf(FLOOR, -12, 12, P)}"/>`;
  let tiles = "";
  for (let i = 1; i < 10; i++) tiles += Ln(k.lineOnTop([FLOOR.x + 59.2 * i, FLOOR.y + 6], [FLOOR.x + 59.2 * i, FLOOR.y + FLOOR.d - 6], 0, P), { tone: "faint" });
  return s + MAT("floor", S(k.slabOf(FLOOR, -12, 12, P, 8, 1.2)) + tiles) + poly([[FLOOR.x + 10, 104, 0.2], [FLOOR.x + FLOOR.w - 10, 104, 0.2], [FLOOR.x + FLOOR.w - 10, 109, 0.2], [FLOOR.x + 10, 109, 0.2]], "bp-lane");
}

function pallet() {
  const x = -262, y = -46;
  let s = halo(x - 30, y - 30, 60, 60);
  s += named("Pallet", MAT("wood", slab(x - 30, y - 30, 60, 60, 0, 8, 1, 0.3)));
  let glass = "";
  for (let l = 0; l < 3; l++) glass += MAT("cream", slab(x - 28, y - 28, 56, 56, 8 + l * 30, 1.5, 1, 0)) + MAT("glass", slab(x - 26, y - 26, 52, 52, 9.5 + l * 30, 28, 3, 0.2), ' class="bp-glassblock"');
  s += named("Pallet of empty bottles", glass);
  s += named("Depalletiser", MAT("yellow", slab(x - 36, y - 36, 6, 72, 0, 130, 1.5) + slab(x + 30, y - 36, 6, 72, 0, 130, 1.5) + slab(x - 36, y - 36, 72, 72, 124, 6, 2)));
  return s;
}

function labelerBack() {
  const x = LABEL.x;
  let s = named("Labeler", MAT("teal", slab(x - 26, BELT.y - 46, 52, 30, 0, 70, 3, 0.8)));
  s += named("Label roll", MAT("white", S(G.disc(70, 84, 18, Zf([x - 8, BELT.y - 32, 0]), P))) + MAT("darksteel", S(G.disc(84, 86, 5, Zf([x - 8, BELT.y - 32, 0]), P))));
  s += `<g data-part="labroll"></g>`;
  return s;
}

function fillerBase() {
  let s = halo(FILL.x - 64, FILL.y - 64, 128, 128);
  s += named("Filler carousel", MAT("stainless", S(G.solidOf([[0, 64], [30, 64], [34, 60], [FILL.table, 60]], Zf([FILL.x, FILL.y, 0]), P))));
  s += named("Carousel table", MAT("darksteel", S(G.disc(FILL.table - 1, FILL.table, 66, Zf([FILL.x, FILL.y, 0]), P))));
  return s;
}

function belt() {
  const { y, z, x0, x1 } = BELT;
  let frame = "";
  for (let lx = x0 + 14; lx <= x1; lx += 52) for (const ly of [y - 7, y + 7]) frame += cyl(lx, ly, 1.8, 0, z - 4, 10);
  frame += slab(x0, y - 9, x1 - x0, 2.5, z - 2, 9, 0.8) ;
  return named("Conveyor", MAT("stainless", frame) + MAT("rubber", slab(x0, y - 7, x1 - x0, 14, z - 3, 3, 1, 0.2)));
}

function column() {
  return named("Centre column", MAT("stainless", cyl(FILL.x, FILL.y, 14, FILL.table, 82, 28)));
}

function bowl() {
  const F = Zf([FILL.x, FILL.y, 0]);
  let s = named("Product bowl", MAT("stainless", S(G.ringBand(118, 136, 36, 66, F, P))) + MAT("stainless", S(G.solidOf([[136, 40], [142, 34], [150, 12], [160, 6]], F, P))));
  s += `<g data-part="bowllevel"></g>`;
  s += named("Product tank", MAT("stainless", S(G.solidOf([[0, 18], [70, 18], [82, 14], [88, 4]], Zf([-150, -66, 0]), P))) + MAT("stainless", tube([[-150, -66, 84], [-150, -66, 176], [FILL.x, FILL.y, 176], [FILL.x, FILL.y, 160]], 3.5, { bend: 16 })));
  return s;
}

function rinser() {
  const { x0, x1 } = RINSE;
  const y0 = BELT.y - 18, y1 = BELT.y + 18;
  let r = slab(x0, y0, x1 - x0, y1 - y0, BELT.z - 4, 58, 5, 1);
  r += poly([[x0 + 8, y1 + 0.3, BELT.z + 6], [x1 - 8, y1 + 0.3, BELT.z + 6], [x1 - 8, y1 + 0.3, BELT.z + 40], [x0 + 8, y1 + 0.3, BELT.z + 40]], "bp-window");
  r += k.faceTextSvg(k.sideMatrix([x0 + 10, y1 + 0.4], BELT.z + 50, P, "left"), "RINSE", { size: 6, tone: "hi" });
  return named("Rinser", MAT("blue", r)) + `<g data-part="spray" data-name="Rinser"></g>`;
}

function capper() {
  const x = CAP.x, y0 = BELT.y - 22, y1 = BELT.y + 22;
  let s = MAT("violet", slab(x - 26, y0, 6, 6, 0, 140, 1.5) + slab(x + 20, y0, 6, 6, 0, 140, 1.5) + slab(x - 26, y1 - 6, 6, 6, 0, 140, 1.5) + slab(x + 20, y1 - 6, 6, 6, 0, 140, 1.5));
  s += MAT("violet", slab(x - 30, y0 - 2, 60, y1 - y0 + 4, 112, 22, 4, 1));
  s = named("Capper", s);
  s += named("Cap sorter", MAT("red", S(G.solidOf([[134, 8], [140, 26], [152, 26], [154, 22]], Zf([x - 4, BELT.y - 8, 0]), P))) + MAT("red", tube([[x + 14, BELT.y - 8, 140], [x + 30, BELT.y, 120], [x + 6, BELT.y, 104]], 2, { bend: 8 })));
  s += `<g data-part="chucks" data-name="Capping chucks"></g>`;
  return s;
}

function gate() {
  const x = GATE.x;
  let s = named("Inspection gate", MAT("carbon", slab(x - 4, BELT.y - 24, 8, 6, 0, 96, 1.5) + slab(x - 4, BELT.y + 18, 8, 6, 0, 96, 1.5) + slab(x - 6, BELT.y - 26, 12, 52, 96, 8, 2)));
  s += `<g data-part="beam" data-name="Inspection gate"></g>`;
  s += named("Reject tray", MAT("red", slab(x + 8, BELT.y + 14, 40, 22, 20, 4, 2) + slab(x + 10, BELT.y + 16, 4, 4, 0, 20, 1) + slab(x + 42, BELT.y + 16, 4, 4, 0, 20, 1)));
  return s;
}

function packer() {
  const x = PACK.x;
  let s = halo(x - 30, BELT.y - 36, 64, 74);
  s += named("Case packer", MAT("green", slab(x - 28, BELT.y - 34, 6, 8, 0, 120, 1.5) + slab(x + 26, BELT.y - 34, 6, 8, 0, 120, 1.5) + slab(x - 30, BELT.y - 36, 64, 20, 112, 12, 3, 0.8)));
  return s;
}

const LIVE = `
const FZ = Zf([0, 0, 0]);
const O = at([0, 0, 0]);
const place = (p, svg) => { const q = at(p); return '<g transform="translate(' + f1(q[0] - O[0]) + "," + f1(q[1] - O[1]) + ')">' + svg + "</g>"; };
const depth = (p) => depthOf(p, P);
// one bottle built once and moved around by translation (the projection is affine)
const GLASS = MAT("glass", S(G.solidOf([[0, 6.2], [1, 7], [17, 7], [23, 4.6], [28, 2.6], [33, 2.6]], FZ, P), { tone: "hi", crease: "none" }), ' class="bp-glass"');
const LIQ = {};
function liquid(level, product) {
  const key = product + Math.round(level * 20);
  if (LIQ[key]) return LIQ[key];
  const h = 1.2 + 25 * Math.round(level * 20) / 20;
  const prof = [[1.2, 6.2]];
  if (h <= 17) prof.push([h, 6.2]); else { prof.push([17, 6.2]); prof.push([h, 6.2 - ((h - 17) / 6) * 2.1]); }
  return (LIQ[key] = level <= 0.02 ? "" : '<g class="bp-liq bp-' + product + '">' + S(G.solidOf(prof, FZ, P), { tone: "mid", crease: "none" }) + "</g>");
}
const CAPSVG = MAT("red", S(G.disc(32.5, 36, 3.1, FZ, P), { tone: "hi", crease: "none" }));
const LABELSVG = (product) => '<g class="bp-label bp-label-' + product + '">' + S(G.ringBand(8, 16, 7, 7.25, FZ, P), { tone: "hi", crease: "none" }) + "</g>";
const VALVE = MAT("stainless", S(G.disc(0, 14, 3.2, FZ, P))) + MAT("darksteel", S(G.disc(-4, 0, 2, FZ, P)));
function bottle(p, level, product, capped, labelled) {
  let s = liquid(level, product) + GLASS;
  if (labelled) s += LABELSVG(product);
  if (capped) s += CAPSVG;
  return place(p, s);
}
// lengths along the bottle path, to know where each bottle is
const SEG = []; let L = 0;
for (let i = 1; i < C.PATH.length; i++) { const a = C.PATH[i - 1], b = C.PATH[i]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); SEG.push(L); }
const ARC0 = SEG[0], ARC1 = SEG[C.ARCN];
const PITCH = (2 * Math.PI * C.FILL.r) / 24;
let travel = 0, t = 0, rejects = 0, made = 0, product = "water";
function frame(dt) {
  const bph = Lab.value("bph"), head = Lab.value("head");
  const share = fillShare(product, head, bph);
  // carousel surface speed at real rpm (2π r per turn)
  const v = rpm(bph) / 60 * 2 * Math.PI * C.FILL.r;
  if (!Lab.reduced.matches) { travel += v * dt; t += dt; }
  made += (bph / 3600) * dt;
  const items = [];
  const off = travel % PITCH;
  for (let d = off; d < L - 4; d += PITCH) {
    let p = along(C.PATH, d / L);
    // fill progress on the arc, limited by how long the valve needs
    const onArc = clamp((d - ARC0 - PITCH * 0.6) / (ARC1 - ARC0 - PITCH * 1.2), 0, 1);
    const level = d < ARC0 ? 0 : 0.92 * Math.min(onArc, share);
    const under = share < 0.985;
    const capped = p[0] > C.CAP.x + 4 && d > ARC1;
    const labelled = p[0] > C.LABEL.x + 6 && d > ARC1;
    if (under && p[0] > C.GATE.x + 8 && d > ARC1) { const f = clamp((p[0] - C.GATE.x - 8) / 22, 0, 1); p = [C.GATE.x + 8 + f * 22, C.BELT.y + f * 22, mix(C.BELT.z, 24, f)]; if (f >= 1) continue; }
    if (p[0] > C.PACK.x - 12) continue; // into the case
    if (p[0] > C.RINSE.x0 - 4 && p[0] < C.RINSE.x1 + 4 && d < ARC0) continue; // hidden in the rinser
    items.push({ p, z: depth(p), svg: bottle(p, level, product, capped, labelled), ring: d >= ARC0 && d <= ARC1 });
  }
  // valves turn with the table
  const ang = travel / C.FILL.r;
  for (let i = 0; i < 24; i++) {
    const a = ang + (i / 24) * 2 * Math.PI, p = [C.FILL.x + C.FILL.r * Math.cos(a), C.FILL.y + C.FILL.r * Math.sin(a), 0];
    items.push({ p, z: depth(p) + 0.1, svg: place([p[0], p[1], 98], VALVE) + line3([[p[0], p[1], 112], [p[0], p[1], 118]], "bp-stem"), ring: true });
  }
  items.sort((a, b) => a.z - b.z);
  const cz = depth([C.FILL.x, C.FILL.y, 0]);
  setHtml(part("ring-back"), items.filter((i) => i.ring && i.z < cz).map((i) => i.svg).join(""));
  setHtml(part("front"), items.filter((i) => !(i.ring && i.z < cz)).map((i) => i.svg).join(""));
  // capping chucks spin and dip on each bottle
  const dip = Math.abs(Math.sin((travel / PITCH) * Math.PI));
  let ch = "";
  for (const dx of [-10, 10]) ch += MAT("chrome", S(cylinder(C.CAP.x + dx, C.BELT.y, 4, C.BELT.z + 40 + dip * 10, 72 - dip * 10, P, 16))) + lineSvg(G.spokesOf(Zf([C.CAP.x + dx, C.BELT.y, 0]), 112, 0.5, 3.8, 3, P, { phase: t * 12 }), { tone: "lo" });
  setHtml(part("chucks"), ch);
  setHtml(part("spray"), Array.from({ length: 10 }, (_, i) => { const f = (t * 2 + i / 10) % 1; return dot([mix(C.RINSE.x0 + 10, C.RINSE.x1 - 10, (i * 0.37) % 1), C.BELT.y + 19, C.BELT.z + 40 - f * 34], 1.1, "bp-drop", "opacity:" + (1 - f).toFixed(2)); }).join(""));
  setHtml(part("labroll"), lineSvg(G.spokesOf(Zf([C.LABEL.x - 8, C.BELT.y - 32, 0]), 84.2, 6, 17, 6, P, { phase: -t * 3 }), { tone: "lo" }));
  const bad = share < 0.985;
  setHtml(part("beam"), line3([[C.GATE.x, C.BELT.y - 18, 62], [C.GATE.x, C.BELT.y + 18, 62]], "bp-beam" + (bad ? " bp-beam-bad" : "")));
  setHtml(part("bowllevel"), '<path class="bp-liq-top bp-' + product + '" d="' + pathOf(circle3(Zf([C.FILL.x, C.FILL.y, 0]), 136.2, 50, 36).map(at), true) + '"/>');
  // case filled six at a time
  const n = Math.floor(made) % 7;
  let cs = MAT("sand", slab(C.PACK.x - 20, C.BELT.y - 16, 40, 30, 0, 28, 1, 0.3));
  for (let i = 0; i < Math.min(6, n); i++) cs += bottle([C.PACK.x - 12 + (i % 3) * 12, C.BELT.y - 8 + Math.floor(i / 3) * 14, 6], 0.92, product, true, true);
  cs += MAT("sand", slab(C.PACK.x - 20, C.BELT.y + 12, 40, 2, 0, 20, 0.5, 0));
  setHtml(part("case"), cs);
  if (bad) rejects += (bph / 3600) * dt;
  Lab.gauge("bph", Math.round(bph).toLocaleString("en-US") + " /h");
  Lab.gauge("rpm", rpm(bph).toFixed(1) + " rpm");
  Lab.gauge("need", needed(product, head).toFixed(1) + " s");
  Lab.gauge("avail", available(bph).toFixed(1) + " s", bad);
  Lab.gauge("status", bad ? "Under-fill " + Math.round(share * 100) + " %" : "On target", bad);
  Lab.gauge("rejects", Math.floor(rejects).toLocaleString("en-US"), rejects >= 1);
  readout(PRODUCTS[product].name + " · " + Math.round(flow(product, head)) + " ml/s per valve");
}
Lab.onMode((m) => { product = m; rejects = 0; });
Lab.onStep((i, s, user) => { if (user) { if (s.bph) Lab.set("bph", s.bph); if (s.head) Lab.set("head", s.head); } document.body.dataset.focus = user ? s.focus || "" : ""; });
loop(frame);
`;

export function figure(theme) {
  const C = { PATH, ARCN: ARC.length, FILL, BELT, RINSE, CAP, LABEL, GATE, PACK };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "bp-svg",
    label: "An isometric bottling line. Empty bottles come off a pallet, pass through a blue rinser, ride round a big stainless rotary filler under filling valves fed from a product bowl, are capped by a purple capper, labelled, checked by an inspection gate that pushes under-filled bottles into a red tray, and are packed six to a case.",
    body: [
      floor(),
      `<g data-station="rinse">${pallet()}</g>`,
      `<g data-station="label">${labelerBack()}</g>`,
      `<g data-station="fill">${fillerBase()}</g>`,
      named("Conveyor", belt()),
      `<g data-station="fill"><g data-part="ring-back" data-name="Filling valves"></g>${column()}</g>`,
      `<g data-part="front" data-name="Bottles"></g>`,
      `<g data-station="fill">${bowl()}</g>`,
      `<g data-station="rinse">${rinser()}</g>`,
      `<g data-station="cap">${capper()}</g>`,
      `<g data-station="inspect">${gate()}</g>`,
      `<g data-station="pack">${packer()}<g data-part="case" data-name="Shipping case"></g></g>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 12", title: "Bottling line", hint: "Speed it up · watch the fill", readout: "", body: `<div class="iso-stage bp-stage" tabindex="0" role="img" aria-label="Bottling line">${svg}</div>` });
  const css = `
.bp-lane{fill:#f2c230;opacity:.55}
.bp-glass{opacity:.55}
.bp-glassblock{opacity:.6}
.bp-liq .iso-fill,.bp-liq .iso-shade,.bp-liq .iso-top{fill:var(--liq)!important}
.bp-liq .iso-line{stroke:none}
.bp-water{--liq:#5fb6ee}.bp-juice{--liq:#f59a23}.bp-soda{--liq:#4a2414}
.bp-liq-top{fill:var(--liq);opacity:.85}
.bp-label .iso-fill,.bp-label .iso-shade,.bp-label .iso-top{fill:var(--lab)!important}
.bp-label-water{--lab:#2f6fd6}.bp-label-juice{--lab:#3aa36b}.bp-label-soda{--lab:#d8402c}
.bp-window{fill:#bfe3ef;opacity:.45}
.bp-drop{fill:#7cc4f2}
.bp-stem{stroke:#9aa6b4;stroke-width:1.2}
.bp-beam{stroke:#30d158;stroke-width:1.4;filter:drop-shadow(0 0 2px #30d158)}
.bp-beam-bad{stroke:#ff453a;filter:drop-shadow(0 0 3px #ff453a)}
[data-station]{transition:opacity .4s}
body[data-focus] [data-station]{opacity:.3}
body[data-focus="rinse"] [data-station="rinse"],body[data-focus="fill"] [data-station="fill"],body[data-focus="cap"] [data-station="cap"],body[data-focus="label"] [data-station="label"],body[data-focus="inspect"] [data-station="inspect"],body[data-focus="pack"] [data-station="pack"]{opacity:1}
${materialsCss(["floor", "wood", "cream", "glass", "yellow", "teal", "white", "darksteel", "stainless", "rubber", "blue", "violet", "red", "chrome", "carbon", "green", "sand"])}
`;
  return { plate, css, script: pageScript(P, C, modelSource + LIVE) };
}
