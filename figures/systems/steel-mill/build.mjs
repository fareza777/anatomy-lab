// Integrated steel mill: blast furnace, skip hoist, ladle car, basic oxygen furnace, continuous
// caster and a hot strip mill. The live layer moves the skip, ladle, pour, strand, slab and steam.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 760;
export const HEIGHT = 480;

const F = { x: -245, y: -30, r: 39 };
const SKIP_A = [-150, 60, 6], SKIP_B = [-243, -8, 96];
const RAIL = { y: 56, x0: -200, x1: -30 };
const BOF = { x: -30, y: 4 };
const CAST = { x: 68, y: -8 };
const TABLE = { x: 104, y: -32, w: 202, d: 64, z: 20 };
const COIL = { x: 300, y: 0, z: 32 };
const CHIMNEY = { x: -312, y: -78 };

const P = k.fitProjection([
  [-330, -140, 0], [330, 140, 0], [330, -140, 0], [-330, 140, 0],
  [-245, -30, 112], [-310, -80, 120], [300, 0, 60], [68, 0, 66],
], WIDTH, HEIGHT, { pad: 16, azimuth: 61, elevation: 25 });

const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, tube, halo, Yf, Zf } = H;

const hot = (s) => `<g class="sm-hot">${s}</g>`;
const hottest = (s) => `<g class="sm-hottest">${s}</g>`;

function ground() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -325, y: -135, w: 650, d: 270, r: 16 }, -10, 12, P)}"/>`;
  s += named("Mill floor", MAT("floor", S(k.slabOf({ x: -325, y: -135, w: 650, d: 270, r: 16 }, -10, 10, P, 8, 1))));
  s += Ln(k.pathOf([[-310, 30, 1], [310, 30, 1]].map(at)), { tone: "lo", dashed: true });
  return s;
}

function furnace() {
  const { x, y } = F;
  let s = "";
  s += named("Blast furnace", MAT("darksteel", cyl(x, y, 44, 0, 16, 30)));
  s += MAT("iron", cyl(x, y, 39, 16, 72, 30));
  for (const z of [28, 46, 64, 84]) s += MAT("steel", cyl(x, y, 40.4, z, 2.6, 30));
  s += MAT("iron", S(G.solidOf([[88, 39], [98, 30]], Zf([x, y, 0]), P)));
  s += MAT("steel", cyl(x, y, 28, 98, 6, 24));
  s += MAT("darksteel", cyl(x, y, 20, 104, 5, 20));
  // tuyeres and bustle main around the waist
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tx = x + Math.cos(a) * 40, ty = y + Math.sin(a) * 40;
    s += MAT("darksteel", cyl(tx, ty, 2.4, 26, 7, 8));
  }
  s += `<g data-part="tapholeglow">${named("Taphole", MAT("orange", cyl(x + 38, y + 4, 3.4, 15, 6, 10), ' class="sm-hot"'))}</g>`;
  s += MAT("orange", slab(x + 34, y + 1, 18, 7, 14, 2, 0.5, 0.1));
  // downcomer to the dust catcher
  s += named("Downcomer", MAT("steel", tube([[x - 8, y, 100], [x - 42, y + 24, 92], [x - 62, y + 60, 62], [x - 62, y + 66, 16]], 3.2)));
  s += MAT("darksteel", cyl(x - 62, y + 66, 8, 8, 26, 16));
  return s;
}

function stoves() {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const x = -308 + i * 20, y = 18 + i * 22;
    s += named("Hot blast stove", MAT("darksteel", cyl(x, y, 9, 0, 52, 20)));
    s += MAT("steel", S(G.solidOf([[52, 9], [60, 4]], Zf([x, y, 0]), P)));
    s += MAT("steel", cyl(x, y, 9.4, 38, 2, 20));
  }
  s += named("Chimney", MAT("iron", cyl(CHIMNEY.x, CHIMNEY.y, 6.5, 0, 108, 18)));
  s += MAT("steel", cyl(CHIMNEY.x, CHIMNEY.y, 7, 104, 4, 18));
  s += `<g data-part="smoke"></g>`;
  return s;
}

function skipBridge() {
  let s = "";
  for (const dy of [-6, 6]) {
    s += line3([SKIP_A, [SKIP_A[0] + 2, SKIP_A[1] + dy, SKIP_A[2]], [SKIP_B[0], SKIP_B[1] + dy, SKIP_B[2]]], "sm-rail");
  }
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const p = [SKIP_A[0] + (SKIP_B[0] - SKIP_A[0]) * t, SKIP_A[1] + (SKIP_B[1] - SKIP_A[1]) * t, SKIP_A[2] + (SKIP_B[2] - SKIP_A[2]) * t];
    s += line3([[p[0], p[1] - 6, p[2]], [p[0], p[1] + 6, p[2]]], "sm-rail");
    s += line3([[p[0], p[1], p[2]], [p[0], p[1], 1]], "sm-rail");
  }
  s += named("Skip hoist", s);
  s += `<g data-part="skip"></g>`;
  return s;
}

function skipSvg(t) {
  const p = [SKIP_A[0] + (SKIP_B[0] - SKIP_A[0]) * t, SKIP_A[1] + (SKIP_B[1] - SKIP_A[1]) * t, SKIP_A[2] + (SKIP_B[2] - SKIP_A[2]) * t];
  let s = MAT("yellow", slab(p[0] - 9, p[1] - 7, 18, 14, p[2], 11, 1, 0.3));
  s += MAT("darksteel", slab(p[0] - 7, p[1] - 5, 14, 10, p[2] + 11, 4, 0.6, 0.2));
  for (let i = 0; i < 5; i++) s += MAT("rock", slab(p[0] - 5 + (i % 3) * 4, p[1] - 3 + (i % 2) * 4, 4, 4, p[2] + 15, 3, 0.5, 0.2));
  return s;
}

function ladleCar(x, pouring) {
  let s = "";
  for (const dy of [-7, 7]) {
    s += MAT("rubber", slab(x - 16, RAIL.y + dy - 3, 6, 6, 2, 6, 1, 0.2) + slab(x + 10, RAIL.y + dy - 3, 6, 6, 2, 6, 1, 0.2));
  }
  s += MAT("yellow", slab(x - 18, RAIL.y - 9, 36, 18, 6, 5, 1, 0.3));
  s += MAT("darksteel", cyl(x, RAIL.y, 13, 11, 22, 22));
  s += MAT("steel", cyl(x, RAIL.y, 13.6, 28, 2, 22));
  s += hot(cyl(x, RAIL.y, 11, 29, 1.4, 22));
  s += MAT("steel", slab(x - 15, RAIL.y - 2, 4, 4, 22, 6, 0.5, 0.1) + slab(x + 11, RAIL.y - 2, 4, 4, 22, 6, 0.5, 0.1));
  if (pouring) s += `<path class="sm-pour" d="${k.pathOf([[x + 2, RAIL.y, 40], [x + 2, RAIL.y, 32]].map(at))}"/>`;
  return s;
}

function railLine() {
  let s = "";
  for (const dy of [-7, 7]) s += line3([[RAIL.x0, RAIL.y + dy, 2], [RAIL.x1, RAIL.y + dy, 2]], "sm-rail");
  for (let x = RAIL.x0; x <= RAIL.x1; x += 16) s += line3([[x, RAIL.y - 9, 1], [x, RAIL.y + 9, 1]], "sm-rail-lo");
  return named("Ladle rail", s);
}

function bof() {
  const { x, y } = BOF;
  let s = "";
  s += named("Basic oxygen furnace", MAT("darksteel", slab(x - 24, y - 20, 48, 40, 0, 8, 2, 0.4)));
  s += MAT("steel", cyl(x, y, 19, 8, 6, 24));
  s += MAT("iron", cyl(x, y, 17, 14, 28, 24));
  s += MAT("steel", cyl(x, y, 19.5, 40, 4, 24));
  s += MAT("orange", cyl(x, y, 16, 43, 1.5, 24), ' class="sm-hottest"');
  for (const dx of [-20, 20]) s += MAT("darksteel", cyl(x + dx, y, 5, 24, 8, 14));
  s += MAT("steel", slab(x - 26, y - 4, 52, 8, 30, 4, 1, 0.2));
  // water-cooled hood and lance
  s += MAT("steel", cyl(x, y, 15, 56, 6, 20));
  s += MAT("darksteel", cyl(x, y, 5, 50, 28, 14));
  s += MAT("steel", tube([[x, y, 78], [x + 20, y + 18, 84], [x + 34, y + 44, 48]], 2.6));
  s += named("Oxygen lance", MAT("chrome", cyl(x, y, 2.2, 44, 34, 10)));
  return s;
}

function caster() {
  const { x, y } = CAST;
  let s = "";
  s += named("Tundish", MAT("darksteel", slab(x - 18, y - 14, 36, 28, 44, 12, 1, 0.3)));
  s += MAT("orange", slab(x - 14, y - 10, 28, 20, 55, 1.4, 0.5, 0.1), ' class="sm-hot"');
  s += MAT("steel", slab(x - 4, y - 7, 8, 14, 36, 8, 0.6, 0.2));
  s += MAT("darksteel", slab(x - 8, y - 8, 16, 16, 26, 11, 1, 0.2));
  s += `<g data-part="strand" data-name="Continuous caster">${strandSvg()}</g>`;
  // pinch rolls and secondary cooling
  for (let i = 0; i < 4; i++) {
    s += MAT("steel", S(G.disc(-5, 5, 4, Yf([x + 12 + i * 9, y, 34 - i * 5]), P)));
  }
  for (let i = 0; i < 5; i++) s += MAT("water", slab(x + 16 + i * 8, y - 10, 2, 20, 20 + i * 2, 1, 0.3, 0.1));
  return s;
}

function strandSvg() {
  const { x, y } = CAST;
  const pts = [[x, y, 42], [x + 12, y, 34], [x + 26, y, 24], [x + 40, y, 22], [x + 58, y, 22]];
  return `<path class="sm-strand" d="${k.pathOf(pts.map(at))}"/>` + `<path class="sm-strand-core" d="${k.pathOf(pts.map(at))}"/>`;
}

function rollerTable() {
  let s = "";
  s += named("Roller table", MAT("darksteel", slab(TABLE.x, TABLE.y, TABLE.w, TABLE.d, 8, 8, 2, 0.4)));
  for (let x = TABLE.x + 6; x <= TABLE.x + TABLE.w - 6; x += 11) {
    s += MAT("steel", line3([[x, TABLE.y + 2, TABLE.z], [x, TABLE.y + TABLE.d - 2, TABLE.z]], "sm-roller"));
  }
  return s;
}

function millStands() {
  let s = "";
  for (const x of [188, 238]) {
    s += named("Rolling stand", MAT("iron", slab(x - 5, -38, 10, 18, 10, 46, 1, 0.3) + slab(x - 5, 20, 10, 18, 10, 46, 1, 0.3)));
    s += MAT("white", slab(x - 9, -40, 18, 80, 56, 7, 1, 0.4));
    s += MAT("chrome", S(G.disc(-15, 15, 6.5, Yf([x, 0, 30]), P)));
    s += MAT("chrome", S(G.disc(-15, 15, 6.5, Yf([x, 0, 43]), P)));
  }
  s += MAT("steel", slab(170, -44, 12, 88, 10, 5, 1, 0.2) + slab(248, -44, 12, 88, 10, 5, 1, 0.2));
  return s;
}

function coiler() {
  let s = named("Coil", MAT("orange", S(G.disc(-11, 11, 15, Yf([COIL.x, COIL.y, COIL.z]), P)), ' class="sm-hot"'));
  s += MAT("darksteel", slab(COIL.x - 6, COIL.y - 18, 12, 4, 6, 26, 1, 0.2));
  s += `<g data-part="coilmark"></g>`;
  return s;
}

function flow() {
  let s = "";
  s += line3([[-205, -30, 22], [-90, 30, 22]], "sm-flowline");
  s += line3([[-30, 30, 48], [50, 10, 48], [68, 0, 52]], "sm-flowline");
  s += line3([[108, 0, 24], [180, 0, 24], [280, 0, 24]], "sm-flowline");
  return `<g class="sm-flow">${s}</g>`;
}

function steamStatic() {
  let s = "";
  for (let i = 0; i < 16; i++) {
    s += dot([CHIMNEY.x + Math.sin(i * 2.1) * 8, CHIMNEY.y + Math.cos(i * 1.7) * 6, 112 + i * 7], 4 + (i % 4), "sm-smoke", `opacity:${(0.28 - i * 0.012).toFixed(2)}`);
  }
  return named("Stack plume", s);
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "sm-svg",
    label: "An integrated steel mill in isometric view. A tall blast furnace stands at the left with its skip hoist and hot blast stoves. A ladle car runs on rails to a basic oxygen furnace, which pours into a continuous caster. A glowing slab moves along a roller table through two rolling stands to a coiled strip at the right.",
    body: [ground(), stoves(), furnace(), skipBridge().replace('<g data-part="skip"></g>', `<g data-part="skip">${skipSvg(0.55)}</g>`), railLine(), `<g data-part="ladlecar" data-name="Ladle car">${ladleCar(-95, false)}</g>`, bof(), caster(), rollerTable(), `<g data-part="slab">${MAT("orange", slab(168, -22, 48, 44, 21, 6, 1, 0.2), ' class="sm-hot"')}</g>`, millStands(), coiler(), flow(), steamStatic(), `<g data-part="steam"></g>`, `<g data-part="pour"></g>`],
  });
  const plate = k.plateHtml({
    fig: "Fig 26", title: "Integrated steel mill", hint: "Follow the heat",
    readout: "", body: `<div class="iso-stage sm-stage" tabindex="0" role="img" aria-label="Integrated steel mill">${svg}</div>`,
  });

  const css = `
.sm-rail{stroke:#59616c;stroke-width:2.4;fill:none}
.sm-rail-lo{stroke:#3f4650;stroke-width:1.2;fill:none;opacity:.8}
.sm-roller{stroke:#8e99a6;stroke-width:2.2;opacity:.9}
.sm-hot{filter:drop-shadow(0 0 5px #ff8a2a) drop-shadow(0 0 12px #ff5a10)}
.sm-hottest{filter:drop-shadow(0 0 8px #ffb03a) drop-shadow(0 0 18px #ff6a10)}
.sm-strand{stroke:#ffbe5a;stroke-width:7;stroke-linecap:round;fill:none;stroke-dasharray:18 10;animation:sm-flow 0.9s linear infinite;filter:drop-shadow(0 0 7px #ff7a1a)}
.sm-strand-core{stroke:#fff0c0;stroke-width:2.4;stroke-linecap:round;fill:none;opacity:.9}
.sm-pour{stroke:#ffd27a;stroke-width:6;stroke-linecap:round;fill:none;filter:drop-shadow(0 0 7px #ff7a1a)}
.sm-flowline{stroke:#ff8a2a;stroke-width:1.6;stroke-dasharray:6 7;fill:none;opacity:.75;animation:sm-dash 1.4s linear infinite}
.sm-smoke{fill:#c9d3de}
body[data-mode="plant"] .sm-flow{display:none}
@keyframes sm-flow{to{stroke-dashoffset:-28}}
@keyframes sm-dash{to{stroke-dashoffset:-26}}
${materialsCss(["floor", "darksteel", "iron", "steel", "chrome", "yellow", "orange", "rock", "water", "white", "rubber"])}
`;

  const live = `
const state = initialState();
const skipEl = part("skip"), ladleEl = part("ladlecar"), pourEl = part("pour"), slabEl = part("slab"), steamEl = part("steam"), coilEl = part("coilmark"), strandEl = part("strand"), glowEl = part("tapholeglow");
let lastPaint = 0, lastGauge = 0, tapFlash = 0, steam = [], lastSlab = 0;
const RAIL = C.RAIL, TABLE = C.TABLE, COIL = C.COIL;
Lab.onAction((a) => {
  if (a === "reset") { Object.assign(state, initialState()); Lab.set("blast", 92); Lab.set("oxygen", 100); Lab.set("casting", 1.8); Lab.set("rolling", 92); tapFlash = 0; }
  if (a === "tap") { tapFlash = 3.2; }
});
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function skipLive(t) {
  const A = C.SKIP_A, B = C.SKIP_B;
  const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
  let s = MAT("yellow", slab(p[0] - 9, p[1] - 7, 18, 14, p[2], 11, 1, 0.3));
  s += MAT("darksteel", slab(p[0] - 7, p[1] - 5, 14, 10, p[2] + 11, 4, 0.6, 0.2));
  for (let i = 0; i < 5; i++) s += MAT("rock", slab(p[0] - 5 + (i % 3) * 4, p[1] - 3 + (i % 2) * 4, 4, 4, p[2] + 15, 3, 0.5, 0.2));
  return s;
}

function ladleSvg(x, pouring) {
  let s = "";
  for (const dy of [-7, 7]) s += MAT("rubber", slab(x - 16, RAIL.y + dy - 3, 6, 6, 2, 6, 1, 0.2) + slab(x + 10, RAIL.y + dy - 3, 6, 6, 2, 6, 1, 0.2));
  s += MAT("yellow", slab(x - 18, RAIL.y - 9, 36, 18, 6, 5, 1, 0.3));
  s += MAT("darksteel", cyl(x, RAIL.y, 13, 11, 22, 22));
  s += MAT("steel", cyl(x, RAIL.y, 13.6, 28, 2, 22));
  s += MAT("orange", cyl(x, RAIL.y, 11, 29, 1.4, 22), ' class="sm-hot"');
  s += MAT("steel", slab(x - 15, RAIL.y - 2, 4, 4, 22, 6, 0.5, 0.1) + slab(x + 11, RAIL.y - 2, 4, 4, 22, 6, 0.5, 0.1));
  return s;
}

function pourSvg(active) {
  if (!active) return "";
  const x = C.BOF.x + 14, y = C.BOF.y + 24;
  const d = pathOf([[x, y, 44], [x - 4, y + 12, 38], [x - 8, y + 22, 32]].map(at));
  return '<path class="sm-pour" d="' + d + '"/>';
}

function slabSvg(x, temp) {
  const t = clamp((temp - 700) / 900, 0, 1);
  const col = t > 0.72 ? "orange" : t > 0.4 ? "red" : "darksteel";
  let s = MAT(col, slab(x - 24, -22, 48, 44, TABLE.z + 1, 6, 1, 0.2), t > 0.4 ? ' class="sm-hot"' : "");
  s += MAT("darksteel", slab(x - 26, -24, 52, 48, TABLE.z - 1, 2, 1, 0.1));
  return s;
}

function steamSvg(dt) {
  if (Math.random() < dt * 18) steam.push({ x: 250 + Math.random() * 34, y: -20 + Math.random() * 40, z: 24 + Math.random() * 6, life: 0.8 + Math.random() * 0.8 });
  let s = "";
  for (let i = steam.length - 1; i >= 0; i--) {
    const p = steam[i]; p.life -= dt; p.z += dt * 20; p.x += dt * 4;
    if (p.life <= 0) { steam.splice(i, 1); continue; }
    s += dot([p.x, p.y, p.z], 4 + (1 - p.life) * 6, "sm-smoke", "opacity:" + (p.life * 0.35).toFixed(2));
  }
  return s;
}

const cv = document.querySelector(".sm-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const vals = [["Iron", o.iron, "#c26a3a"], ["Steel", o.steel, "#d09a3a"], ["Caster", state.cast * 105, "#bc4c4c"], ["Mill", 200 * Lab.value("rolling") / 100, "#7a6fc0"], ["Strip", o.strip, "#3fae72"]];
  const max = Math.max(120, ...vals.map((v) => v[1])) * 1.15;
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), strong = cs.getPropertyValue("--anatomy-strong"), rule = cs.getPropertyValue("--lab-rule");
  const bw = (w - 30) / vals.length;
  ctx.font = "600 19px ui-monospace,monospace"; ctx.textAlign = "center";
  vals.forEach(([label, v, col], i) => {
    const bh = (v / max) * (h - 48), x = 15 + i * bw + bw * 0.16, y = h - 30 - bh;
    ctx.fillStyle = col; ctx.fillRect(x, y, bw * 0.68, bh);
    ctx.fillStyle = strong; ctx.fillText(Math.round(v), x + bw * 0.34, y - 7);
    ctx.fillStyle = muted; ctx.font = "500 14px ui-monospace,monospace"; ctx.fillText(label, x + bw * 0.34, h - 8); ctx.font = "600 19px ui-monospace,monospace";
  });
  ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(8, h - 30); ctx.lineTo(w - 8, h - 30); ctx.stroke();
}

function frame(dt, now) {
  const u = { blast: Lab.value("blast"), oxygen: Lab.value("oxygen"), casting: Lab.value("casting"), rolling: Lab.value("rolling") };
  const sim = Math.min(dt * SIM_SPEED, 30);
  step(state, u, sim);
  const o = outputs(state);
  if (tapFlash > 0) tapFlash = Math.max(0, tapFlash - dt);
  if (now - lastPaint > 0.05) {
    lastPaint = now;
    const cyc = (now * 0.11) % 1;
    const st = cyc < 0.55 ? ease(cyc / 0.55) : 1 - ease((cyc - 0.55) / 0.45);
    setHtml(skipEl, skipLive(st));
    const lx = -190 + 150 * (0.5 + 0.5 * Math.sin(now * 0.28));
    setHtml(ladleEl, ladleSvg(lx, lx < -46));
    setHtml(pourEl, pourSvg(lx < -46));
    const speed = clamp(o.strip / 190, 0.15, 1);
    lastSlab += dt * (26 + 54 * speed);
    const sx = TABLE.x + 22 + (lastSlab % (TABLE.w - 50));
    setHtml(slabEl, slabSvg(sx, 1180 - (sx - TABLE.x) * 1.1));
    setHtml(steamEl, steamSvg(dt));
    setHtml(coilEl, line3([[COIL.x, COIL.y - 11, COIL.z], [COIL.x + Math.cos(now * 2) * 12, COIL.y - 11, COIL.z + Math.sin(now * 2) * 12]], "sm-roller"));
    if (glowEl) glowEl.setAttribute("opacity", tapFlash > 0 ? "1" : "0.35");
  }
  if (now - lastGauge > 0.2) {
    lastGauge = now;
    Lab.gauge("iron", Math.round(o.iron) + " t/h");
    Lab.gauge("steel", Math.round(o.steel) + " t/h");
    Lab.gauge("temp", Math.round(o.temp) + " °C", o.temp > 1570 || o.temp < 1430);
    Lab.gauge("strip", Math.round(o.strip) + " t/h", o.strip < 120);
    Lab.gauge("cast", o.casting.toFixed(1) + " m/min");
    Lab.gauge("tapped", Math.round(o.tapped).toLocaleString("en-US") + " t");
    readout(tapFlash > 0 ? "Tapping the furnace · " + Math.round(o.temp) + " °C" : Math.round(o.strip) + " t/h of strip · " + o.bottleneck + " limit");
    document.body.dataset.bottleneck = o.bottleneck;
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { SKIP_A, SKIP_B, RAIL, BOF, TABLE, COIL, CAST }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Stage capacity</span><em>tonnes per hour</em></div><canvas class="sm-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
