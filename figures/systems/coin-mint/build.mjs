// Coin mint: copper-alloy strip unrolls from a coil into a blanking press, which punches round
// blanks. The blanks ride a belt through a rimming mill (which raises the edge), an annealing
// furnace and a washing drum, climb an elevator into the coining press, are struck between two
// dies inside a collar, and drop down a chute into the counting bin.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 600;
export const HEIGHT = 440;

const FLOOR = { x: -292, y: -86, w: 584, d: 196, r: 14 };
const STRIP = { z: 64, y0: -14, y1: 14 };
const COIL = { x: -246, zc: 58, r: 40, ri: 14 };
const BP = { x: -150 }; // blanking press
const BELT = { y0: 54, y1: 74, z: 26, x0: -168, x1: 120 };
const RIM = { x: -86 };
const OVEN = { x0: -50, x1: 30 };
const DRUM = { x0: 46, x1: 104, z: 52, r: 22 };
const CP = { x: 196, bed: 62 }; // coining press
const HOP = { x: 162, y: 34, z: 178 };
const BIN = { x: 262, y: 50 };

const P = k.fitProjection([...k.boxCorners(FLOOR, -12, 0), [CP.x, 0, 236], [COIL.x, 0, COIL.zc + COIL.r + 4], [HOP.x, HOP.y, HOP.z + 20]], WIDTH, HEIGHT, { pad: 14, azimuth: 68, elevation: 27 });
const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, poly, tube, halo, Xf, Yf, Zf } = H;

function floor() {
  let s = `<path class="iso-halo" d="${k.haloOf(FLOOR, -12, 12, P)}"/>`;
  let tiles = "";
  for (let i = 1; i < 10; i++) tiles += Ln(k.lineOnTop([FLOOR.x + 58.4 * i, FLOOR.y + 6], [FLOOR.x + 58.4 * i, FLOOR.y + FLOOR.d - 6], 0, P), { tone: "faint" });
  s += MAT("floor", S(k.slabOf(FLOOR, -12, 12, P, 8, 1.2)) + tiles);
  // yellow safety lane in front of the line
  s += poly([[FLOOR.x + 10, 92, 0.2], [FLOOR.x + FLOOR.w - 10, 92, 0.2], [FLOOR.x + FLOOR.w - 10, 98, 0.2], [FLOOR.x + 10, 98, 0.2]], "cm-lane");
  return s;
}

function coil() {
  const F = Yf([COIL.x, 0, COIL.zc]);
  let s = halo(COIL.x - 36, -26, 72, 52);
  const stand = (y) => named("Coil stand", MAT("darksteel", slab(COIL.x - 30, y, 60, 4, 0, 8, 1) + S(G.prismOf(Yf([COIL.x, y, 0]), [[-26, 8], [26, 8], [3, COIL.zc + 2], [-3, COIL.zc + 2]], 0, 4, P))));
  s += stand(-22);
  s += named("Metal coil", MAT("copper", S(G.ringBand(-16, 16, COIL.ri, COIL.r, F, P))) + MAT("steel", S(G.disc(-19, 19, COIL.ri - 1, F, P))), "");
  s += `<g data-part="coil-spin" data-name="Metal coil"></g>`;
  s += stand(18);
  return s;
}

function straightener() {
  const x = -202;
  let s = slab(x - 18, -24, 36, 48, 0, 50, 3, 0.6);
  let rolls = "";
  for (const [dx, z] of [[-10, 69], [0, 59], [10, 69]]) rolls += S(G.disc(-17, 17, 4.5, Yf([x + dx, 0, z]), P));
  return named("Straightener rolls", MAT("teal", s) + MAT("chrome", rolls));
}

function stripStatic() {
  // strip from the top of the coil down to the straightener, then flat through the press
  const top = COIL.zc + COIL.r;
  let s = MAT("copper", poly([[COIL.x, STRIP.y0, top], [-214, STRIP.y0, STRIP.z + 1.4], [-214, STRIP.y1, STRIP.z + 1.4], [COIL.x, STRIP.y1, top]], "cm-strip"));
  s += MAT("copper", slab(-214, STRIP.y0, 60, STRIP.y1 - STRIP.y0, STRIP.z, 1.4, 0.5, 0));
  return named("Metal strip", s);
}

function blankingPress() {
  const x = BP.x;
  let s = halo(x - 36, -42, 72, 84);
  let body = slab(x - 32, -40, 64, 80, 0, 56, 4, 1); // bed
  body += slab(x - 30, -40, 60, 16, 56, 112, 3, 0.8); // back column
  body += slab(x - 34, -42, 68, 74, 160, 26, 4, 1); // crown
  s += named("Blanking press", MAT("orange", body));
  s += named("Blanking die", MAT("darksteel", slab(x - 22, -18, 44, 36, 56, 7, 2)));
  s += `<g data-part="strip-mid" data-name="Metal strip"></g>`;
  s += `<g data-part="ram1" data-name="Punch ram"></g>`;
  s += named("Flywheel", MAT("iron", S(G.disc(-50, -42, 26, Yf([x, 0, 172]), P))));
  s += `<g data-part="fly1" data-name="Flywheel"></g>`;
  // the blank chute from under the die to the front belt
  s += named("Blank chute", MAT("stainless", poly([[x - 8, 40, 50], [x + 8, 40, 50], [x + 8, BELT.y0 + 4, BELT.z + 4], [x - 8, BELT.y0 + 4, BELT.z + 4]], "cm-chute")));
  return s;
}

function scrap() {
  const x = -96;
  let s = halo(x - 18, -26, 36, 52);
  s += named("Scrap bin", MAT("navy", slab(x - 18, -24, 36, 48, 0, 36, 2, 0.6)) + `<g data-part="scrap" data-name="Scrap bin"></g>`);
  return s;
}

function belt() {
  const { y0, y1, z, x0, x1 } = BELT;
  let frame = "";
  for (let lx = x0 + 8; lx <= x1; lx += 48) for (const ly of [y0 + 2, y1 - 2]) frame += cyl(lx, ly, 2, 0, z - 4, 12);
  frame += slab(x0, y0 - 2, x1 - x0, 3, z - 6, 6, 1) + slab(x0, y1 - 1, x1 - x0, 3, z - 6, 6, 1);
  return named("Conveyor", MAT("stainless", frame) + MAT("rubber", slab(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, z - 3, 3, 1, 0.2)));
}

function rimMill() {
  const x = RIM.x;
  let s = named("Rimming mill", MAT("violet", slab(x - 22, BELT.y0 - 18, 44, 18, 0, 58, 3, 0.8) + slab(x - 22, BELT.y0 - 18, 44, BELT.y1 - BELT.y0 + 36, 58, 10, 3, 0.8)));
  s += `<g data-part="rimwheel" data-name="Rimming mill"></g>`;
  return s;
}

function oven() {
  const { x0, x1 } = OVEN;
  const y0 = BELT.y0 - 10, y1 = BELT.y1 + 10;
  let o = slab(x0, y0, x1 - x0, y1 - y0, BELT.z - 6, 46, 5, 1);
  o += poly([[x0 + 8, y1 + 0.3, BELT.z + 4], [x1 - 8, y1 + 0.3, BELT.z + 4], [x1 - 8, y1 + 0.3, BELT.z + 18], [x0 + 8, y1 + 0.3, BELT.z + 18]], "cm-glow");
  o += k.faceTextSvg(k.sideMatrix([x0 + 10, y1 + 0.4], BELT.z + 32, P, "left"), "ANNEAL 750 °C", { size: 6, tone: "hi" });
  return named("Annealing furnace", MAT("red", o));
}

function drumBack() {
  const F = Xf([0, BELT.y0 + 10, DRUM.z]);
  let stand = "";
  for (const x of [DRUM.x0 + 4, DRUM.x1 - 4]) stand += slab(x - 3, BELT.y0 - 6, 6, 32, 0, DRUM.z - 18, 1.5);
  return named("Washing drum", MAT("darksteel", stand) + MAT("stainless", S(G.solidOf([[DRUM.x0, DRUM.r - 4], [DRUM.x0 + 4, DRUM.r], [DRUM.x1 - 4, DRUM.r], [DRUM.x1, DRUM.r - 4]], F, P))) + `<g data-part="drum"></g>`);
}

function elevator() {
  const a = [DRUM.x1 + 6, BELT.y0 + 10, BELT.z], b = [HOP.x - 6, HOP.y, HOP.z - 8];
  let s = named("Bucket elevator", MAT("yellow", poly([[a[0], a[1] - 7, a[2]], [b[0], b[1] - 7, b[2]], [b[0], b[1] + 7, b[2]], [a[0], a[1] + 7, a[2]]], "cm-ramp") + tube([[a[0] + 2, a[1] + 9, 0], [a[0] + 2, a[1] + 9, a[2]]], 2) + tube([[b[0] - 6, b[1] + 9, 60], [b[0] - 6, b[1] + 9, b[2]]], 2)));
  s += `<g data-part="elev" data-name="Bucket elevator"></g>`;
  s += named("Feed hopper", MAT("stainless", S(G.solidOf([[HOP.z - 26, 4], [HOP.z - 10, 6], [HOP.z + 4, 16], [HOP.z + 14, 16]], Zf([HOP.x, HOP.y, 0]), P))) + MAT("stainless", tube([[HOP.x, HOP.y, HOP.z - 26], [HOP.x, HOP.y, CP.bed + 30], [CP.x - 20, 6, CP.bed + 14]], 3.2, { bend: 14 })));
  return s;
}

function coiningPress() {
  const x = CP.x;
  let s = halo(x - 44, -48, 88, 96);
  s += named("Coining press", MAT("blue", slab(x - 42, -46, 84, 92, 0, CP.bed, 5, 1)));
  const rod = (rx, ry) => MAT("chrome", cyl(rx, ry, 5, CP.bed, 140, 20));
  s += named("Tie rods", rod(x - 30, -34) + rod(x + 30, -34));
  s += named("Lower die & collar", MAT("darksteel", cyl(x, 0, 16, CP.bed, 8, 28)) + MAT("steel", cyl(x, 0, 8, CP.bed + 8, 2, 24)));
  s += `<g data-part="ram2" data-name="Coining ram"></g>`;
  s += `<g data-part="feed" data-name="Feed finger"></g>`;
  s += named("Tie rods", rod(x - 30, 34) + rod(x + 30, 34));
  s += named("Coining press", MAT("blue", slab(x - 44, -48, 88, 96, CP.bed + 140, 34, 5, 1)));
  s += named("Flywheel", MAT("iron", S(G.disc(-60, -50, 34, Yf([x, 0, CP.bed + 158]), P))));
  s += `<g data-part="fly2" data-name="Flywheel"></g>`;
  s += named("Coin chute", MAT("stainless", poly([[x + 16, -6, CP.bed + 4], [x + 16, 8, CP.bed + 4], [BIN.x - 10, BIN.y + 6, 40], [BIN.x - 10, BIN.y - 8, 40]], "cm-chute")));
  return s;
}

function bin() {
  let s = halo(BIN.x - 22, BIN.y - 22, 44, 44);
  s += named("Counting bin", MAT("green", slab(BIN.x - 20, BIN.y - 20, 40, 40, 0, 38, 3, 0.8)));
  s += `<g data-part="pile" data-name="Counting bin"></g>`;
  s += named("Coin counter", MAT("carbon", slab(BIN.x - 18, BIN.y + 20, 36, 3, 18, 16, 1)) + `<g data-part="count"></g>`);
  return s;
}

const LIVE = `
const A = ALLOYS;
const coilF = Yf([C.COIL.x, 0, C.COIL.zc]);
function blankSvg(x, y, z, alloy, glow, rimmed) {
  const T = A[alloy].tint;
  let s = MAT(alloy === "brass" ? "gold" : alloy === "cuni" ? "steel" : "gold", S(cylinder(x, y, 6.5, z, 2.2, P, 20), { tone: "hi", crease: "none" }));
  if (alloy === "bimetal") s += MAT("steel", S(cylinder(x, y, 3.8, z + 2.2, 0.15, P, 16), { tone: "mid", crease: "none", flat: true }));
  if (rimmed) s += '<path class="cm-rim" d="' + pathOf(circleRing(x, y, 5.6, 18).map(([a, b]) => iso([a, b, z + 2.3], P)), true) + '"/>';
  if (glow > 0.02) s += '<path class="cm-hot" style="opacity:' + glow.toFixed(2) + '" d="' + pathOf(circleRing(x, y, 6.6, 18).map(([a, b]) => iso([a, b, z + 2.3], P)), true) + '"/>';
  return s;
}
function draw(t, cyc, alloy, verdict) {
  const ph = cyc % 1;
  // blanking ram: dwell at top, fast stroke down at ph 0.45-0.6
  const down = Math.max(0, Math.sin(Math.PI * clamp((ph - 0.35) / 0.4, 0, 1)));
  const z1 = C.STRIP.z + 6 + (1 - down) * 34;
  const r1 = MAT("orange", slab(C.BP.x - 26, -26, 52, 52, z1 + 10, 160 - z1 - 10, 3, 0.8)) + MAT("chrome", [-12, 0, 12].map((dy) => cylinder(C.BP.x, dy, 4, z1, 10, P, 14)).map((p) => S(p)).join(""));
  setHtml(part("ram1"), r1);
  // strip through the press: holes appear after the die and move on each stroke
  const adv = (Math.floor(cyc) + clamp((ph - 0.6) / 0.3, 0, 1)) * 27;
  let strip = MAT("copper", slab(-154, C.STRIP.y0, 56, C.STRIP.y1 - C.STRIP.y0, C.STRIP.z, 1.4, 0.5, 0));
  for (let i = 0; i < 4; i++) { const hx = -142 + ((adv + i * 27) % 54); for (const hy of [-6, 6]) strip += '<path class="cm-hole" d="' + pathOf(circleRing(hx + (hy > 0 ? 13 : 0), hy, 5, 14).map(([a, b]) => iso([a, b, C.STRIP.z + 1.45], P)), true) + '"/>'; }
  setHtml(part("strip-mid"), strip + MAT("copper", poly([[-98, C.STRIP.y0, C.STRIP.z + 1.4], [-92, C.STRIP.y0, 40], [-92, C.STRIP.y1, 40], [-98, C.STRIP.y1, C.STRIP.z + 1.4]], "cm-strip")));
  // coil turns as strip is drawn off
  setHtml(part("coil-spin"), MAT("copper", lineSvg(G.spokesOf(coilF, 16, C.COIL.ri + 3, C.COIL.r - 2, 10, P, { phase: -adv / 40 }), { tone: "lo" }) + lineSvg(G.arcOf(coilF, 16, 27, P), { tone: "faint" })));
  setHtml(part("fly1"), lineSvg(G.spokesOf(Yf([C.BP.x, 0, 172]), -50.2, 6, 24, 5, P, { phase: t * 5 }), { tone: "hi" }));
  setHtml(part("fly2"), lineSvg(G.spokesOf(Yf([C.CP.x, 0, C.CP.bed + 158]), -60.2, 8, 32, 6, P, { phase: t * 5 }), { tone: "hi" }));
  setHtml(part("scrap"), MAT("copper", Array.from({ length: Math.min(6, 2 + Math.floor(t / 20)) }, (_, i) => slab(-110 + (i % 2) * 6, -18 + i * 6, 24, 3, 32 + (i % 3), 1.2, 0.5, 0)).join("")));
  // blanks along the belt: raw -> rimmed -> red hot in the furnace -> cleaned
  const sp = 22, off = (t * 26) % sp;
  let bl = "";
  for (let x = C.BELT.x0 + 14 + off; x < C.BELT.x1 - 4; x += sp) {
    if (x > C.DRUM.x0 - 4 && x < C.DRUM.x1 + 4) continue;
    const inOven = x > C.OVEN.x0 && x < C.OVEN.x1;
    if (inOven) continue;
    const glow = x > C.OVEN.x1 ? clamp(1 - (x - C.OVEN.x1) / 26, 0, 1) : 0;
    bl += blankSvg(x, (C.BELT.y0 + C.BELT.y1) / 2, C.BELT.z, alloy, glow, x > C.RIM.x + 10);
  }
  setHtml(part("blanks"), bl);
  setHtml(part("rimwheel"), MAT("chrome", S(G.disc(68, 72, 15, Zf([C.RIM.x, (C.BELT.y0 + C.BELT.y1) / 2, 0]), P))) + lineSvg(G.spokesOf(Zf([C.RIM.x, (C.BELT.y0 + C.BELT.y1) / 2, 0]), 72.2, 4, 14, 6, P, { phase: t * 3 }), { tone: "hi" }));
  const dF = Xf([0, C.BELT.y0 + 10, C.DRUM.z]);
  setHtml(part("drum"), fadedSvg(G.ribsOf(dF, C.DRUM.x0 + 5, C.DRUM.x1 - 5, C.DRUM.r + 0.2, 16, P, { phase: t * 1.4, fade: [0.05, 0.5] }).map((r) => [r.d, r.alpha]), { tone: "lo" }));
  // elevator buckets carry blanks up to the hopper
  const a = [C.DRUM.x1 + 6, C.BELT.y0 + 10, C.BELT.z + 3], b = [C.HOP.x - 6, C.HOP.y, C.HOP.z - 5];
  let el = "";
  for (let i = 0; i < 6; i++) { const f = ((t * 0.18 + i / 6) % 1); el += blankSvg(mix(a[0], b[0], f), mix(a[1], b[1], f), mix(a[2], b[2], f), alloy, 0, true); }
  setHtml(part("elev"), el);
  // coining ram strikes once per cycle at ph ~0.5
  const hit = Math.max(0, Math.sin(Math.PI * clamp((ph - 0.3) / 0.4, 0, 1)));
  const z2 = C.CP.bed + 10 + (1 - hit) * 40;
  const r2 = MAT("blue", slab(C.CP.x - 36, -38, 72, 76, z2 + 22, C.CP.bed + 140 - z2 - 22, 4, 1)) + MAT("darksteel", S(cylinder(C.CP.x, 0, 14, z2 + 6, 16, P, 28))) + MAT("steel", S(cylinder(C.CP.x, 0, 7.5, z2, 6, P, 24)));
  setHtml(part("ram2"), r2);
  const flash = ph > 0.47 && ph < 0.56;
  let feed = "";
  const fx = C.CP.x - 30 + clamp((ph < 0.3 ? ph / 0.3 : ph > 0.7 ? 1 - (ph - 0.7) / 0.3 : 1), 0, 1) * 30;
  feed += blankSvg(fx > C.CP.x - 2 ? C.CP.x : fx, 0, C.CP.bed + 8, alloy, 0, true);
  if (flash) feed += '<circle class="cm-flash" cx="' + at([C.CP.x, 0, C.CP.bed + 10])[0] + '" cy="' + at([C.CP.x, 0, C.CP.bed + 10])[1] + '" r="' + (verdict.bad ? 9 : 14) + '"/>';
  // the struck coin slides down the chute
  const out = (ph + 0.5) % 1;
  if (out < 0.5) { const f = out / 0.5; feed += blankSvg(mix(C.CP.x + 18, C.BIN.x - 10, f), mix(0, C.BIN.y - 1, f), mix(C.CP.bed + 5, 41, f), alloy, 0, true); }
  setHtml(part("feed"), feed);
}
function pileSvg(n, alloy) {
  const layers = Math.min(9, 1 + Math.floor(n / 40));
  let s = "";
  for (let l = 0; l < layers; l++) for (let i = 0; i < 6; i++) { const ang = i * 1.05 + l; s += blankSvg(C.BIN.x + 9 * Math.cos(ang) * (1 - l / 12), C.BIN.y + 9 * Math.sin(ang) * (1 - l / 12), 6 + l * 3.2, alloy, 0, true); }
  return s;
}
let t = 0, cyc = 0, minted = 0, alloy = "brass";
const coinCanvas = document.querySelector(".cm-coin");
function drawCoin(alloyId, f, bad, over) {
  if (!coinCanvas || !coinCanvas.clientWidth) return;
  const ctx = coinCanvas.getContext("2d");
  const w = coinCanvas.width = coinCanvas.clientWidth * 2, h = coinCanvas.height = coinCanvas.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const R = h * 0.42, cx = h * 0.5, cy = h * 0.5;
  const T = A[alloyId].tint;
  const body = (r, c0, c1) => { const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); };
  body(R, T[0], alloyId === "bimetal" ? "#a07a22" : T[1]);
  if (alloyId === "bimetal") body(R * 0.66, "#eef1f4", "#9aa2ad");
  if (over) { ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.stroke(); }
  // relief appears as the metal flows into the die: low areas first, the rim and lettering last
  const emboss = (fn, need) => { const a = clamp((f - need) / (1 - need + 1e-6), 0, 1); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(1.2, 1.2); ctx.fillStyle = "rgba(0,0,0,.3)"; fn(); ctx.translate(-2.2, -2.2); ctx.fillStyle = "rgba(255,255,255,.55)"; fn(); ctx.restore(); };
  const star = () => { ctx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? R * 0.18 : R * 0.42, a = -Math.PI / 2 + (i * Math.PI) / 8; ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } ctx.closePath(); ctx.fill(); };
  const rim = () => { ctx.beginPath(); ctx.arc(cx, cy, R * 0.97, 0, TAU); ctx.arc(cx, cy, R * 0.86, 0, TAU, true); ctx.fill(); };
  const dents = () => { for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; ctx.beginPath(); ctx.arc(cx + R * 0.81 * Math.cos(a), cy + R * 0.81 * Math.sin(a), R * 0.018, 0, TAU); ctx.fill(); } };
  const text = () => { ctx.font = "700 " + Math.round(R * 0.13) + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.fillText("ANATOMY LAB", cx, cy + R * 0.66); ctx.fillText("2026", cx, cy - R * 0.55); };
  emboss(star, 0.15); emboss(rim, 0.55); emboss(text, 0.75); emboss(dents, 0.9);
  // the reeded edge, seen as a band beside the face
  const ex = h + 30, ew = w - ex - 20, ey = cy - R * 0.25;
  ctx.fillStyle = T[1]; ctx.fillRect(ex, ey, ew, R * 0.5);
  ctx.fillStyle = "rgba(0,0,0,.25)"; for (let x = ex + 3; x < ex + ew; x += 7) ctx.fillRect(x, ey, 2.5, R * 0.5 * clamp(f * 1.3, 0.2, 1));
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--anatomy-muted"); ctx.font = "500 20px ui-monospace,monospace"; ctx.textAlign = "left";
  ctx.fillText("Reeded edge", ex, ey - 12); ctx.fillText(Math.round(f * 100) + " % of relief filled", ex, ey + R * 0.5 + 34);
  ctx.fillStyle = bad ? "#e5484d" : "#30a46c"; ctx.fillText(bad ? "Reject" : "Pass", ex, ey + R * 0.5 + 62);
}
function run(dt) {
  const tonnes = Lab.value("force"), spm = Lab.value("speed");
  const gpa = pressure(tonnes), f = fill(alloy, gpa), v = verdict(alloy, gpa);
  const vis = 0.35 + (spm / 750) * 0.5; // strikes per second shown (the real press is far faster)
  if (!Lab.reduced.matches) { t += dt; cyc += dt * vis; }
  minted += dt * spm / 60;
  draw(t, cyc, alloy, v);
  setHtml(part("pile"), pileSvg(minted / 40, alloy));
  setHtml(part("count"), '<text class="cm-count" transform="' + sideMatrix([C.BIN.x - 14, C.BIN.y + 23.2], 28, P, "left") + '" font-size="7">' + Math.floor(minted).toLocaleString("en-US") + "</text>");
  Lab.gauge("press", gpa.toFixed(2) + " GPa", gpa > A[alloy].full * 1.25);
  Lab.gauge("fill", Math.round(f * 100) + " %", f < 0.97);
  Lab.gauge("verdict", v.text, v.bad);
  Lab.gauge("rate", Math.round(spm * 60).toLocaleString("en-US") + " /h");
  Lab.gauge("life", (dieLife(alloy, gpa) / 1e6).toFixed(2) + " M");
  Lab.gauge("strip", Math.round(stripUse() * 100) + " %");
  readout(tonnes + " t · " + A[alloy].name);
  if (Math.floor(t * 4) !== run.k) { run.k = Math.floor(t * 4); drawCoin(alloy, f, v.bad, gpa > A[alloy].full * 1.25); }
}
Lab.onMode((m) => { alloy = m; minted = 0; run.k = -1; });
Lab.onChange(() => { run.k = -1; });
Lab.onStep((i, s, user) => { if (user && s.force) Lab.set("force", s.force); document.body.dataset.focus = user ? s.focus || "" : ""; });
loop(run);
`;

export function figure(theme) {
  const C = { COIL, STRIP, BP, BELT, RIM, OVEN, DRUM, CP, HOP, BIN };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "cm-svg",
    label: "An isometric coin mint. A coil of metal strip feeds an orange blanking press that punches round blanks. The blanks travel on a belt through a rimming mill, an annealing furnace and a washing drum, ride an elevator into a blue coining press that strikes them between dies, and slide down a chute into a counting bin.",
    body: [
      floor(),
      `<g data-station="blank">${scrap()}${coil()}${straightener()}${stripStatic()}${blankingPress()}</g>`,
      `<g data-station="strike">${coiningPress()}</g>`,
      `<g data-station="move">${belt()}<g data-part="blanks" data-name="Blanks"></g></g>`,
      `<g data-station="rim">${rimMill()}</g>`,
      `<g data-station="anneal">${oven()}${drumBack()}</g>`,
      `<g data-station="strike">${elevator()}</g>`,
      `<g data-station="count">${bin()}</g>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 11", title: "Coin mint", hint: "Set the force · pick an alloy", readout: "", body: `<div class="iso-stage cm-stage" tabindex="0" role="img" aria-label="Coin mint">${svg}</div>` });
  const css = `
.cm-lane{fill:#f2c230;opacity:.55}
.cm-strip{fill:#cf7a46;stroke:#7a3a12;stroke-width:.4}
.cm-hole{fill:#2a2f38;stroke:#7a3a12;stroke-width:.3}
body[data-theme="light"] .cm-hole{fill:#5b6675}
.cm-chute{fill:#c3cad2;stroke:#5b6675;stroke-width:.5}
.cm-ramp{fill:#f2c230;stroke:#a07a10;stroke-width:.5}
body[data-theme="dark"] .cm-chute{fill:#7b8794}
.cm-glow{fill:#ff8a2a;filter:drop-shadow(0 0 3px #ff6a00);animation:cm-glow 1.6s ease-in-out infinite alternate}
@keyframes cm-glow{to{fill:#ffc04a}}
.cm-rim{fill:none;stroke:#00000055;stroke-width:.6}
.cm-hot{fill:#ff6a1a;mix-blend-mode:screen}
.cm-flash{fill:#fff6c8;opacity:.85;filter:blur(3px)}
.cm-count{fill:#55f2a0;font-family:var(--anatomy-mono);font-weight:700}
[data-station]{transition:opacity .4s}
body[data-focus] [data-station]{opacity:.3}
body[data-focus="blank"] [data-station="blank"],body[data-focus="rim"] [data-station="rim"],body[data-focus="anneal"] [data-station="anneal"],body[data-focus="strike"] [data-station="strike"],body[data-focus="count"] [data-station="count"]{opacity:1}
${materialsCss(["floor", "copper", "darksteel", "teal", "chrome", "orange", "iron", "stainless", "navy", "rubber", "violet", "red", "yellow", "blue", "steel", "green", "carbon", "gold"])}
`;
  const live = pageScript(P, C, modelSource + LIVE);
  return {
    plate, css, script: live,
    extra: `<div class="lab-card"><div class="lab-card-head"><span>The struck coin</span><em>relief fills from the middle out</em></div><canvas class="cm-coin" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
