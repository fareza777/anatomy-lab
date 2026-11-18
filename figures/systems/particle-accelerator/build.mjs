// LHC: a full accelerator ring in cutaway with dipoles, quadrupoles, RF cavities, injector
// chain, cryogenic plant and a cutaway detector. The live layer races the two proton beams,
// animates the collision tracks and draws an event display on the panel below.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 820;
export const HEIGHT = 520;

const RING = { cx: 0, cy: 20, rx: 288, ry: 118 };
const DET = { x: 288, y: 20, z: 44, r: 42, half: 36 };
const INJ = { x: -300, y: 70 };

function ringPts(scale = 1, z = 0, n = 120) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([RING.cx + RING.rx * scale * Math.cos(a), RING.cy + RING.ry * scale * Math.sin(a), z]);
  }
  return out;
}

function ringAt(deg, scale = 1, z = 0) {
  const a = (deg * Math.PI) / 180;
  return [RING.cx + RING.rx * scale * Math.cos(a), RING.cy + RING.ry * scale * Math.sin(a), z];
}

const RING_PATH = ringPts(1.0, 0);
const BEAM_A = ringPts(1.014, 14.5);
const BEAM_B = ringPts(0.986, 14.5);
const MAGNET_DEGS = [];
for (let d = 15; d < 360; d += 15) {
  if (Math.abs(d > 180 ? d - 360 : d) < 18) continue;
  if ([75, 105, 255, 285].includes(d)) continue;
  MAGNET_DEGS.push(d);
}

const P = k.fitProjection([
  [-378, -168, 0], [378, 168, 0], [378, -168, 0], [-378, 168, 0],
  [-344, 108, 40], [-336, -70, 62], [344, 20, 90], [0, 146, 30], [-72, 20, 46],
], WIDTH, HEIGHT, { pad: 14, azimuth: 60, elevation: 26 });

const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, tube, along, sector, clamp } = H;

function cshell(F, r0, r1, a0, a1, y0, y1, steps, mat) {
  let s = "";
  for (let i = 0; i < steps; i++) {
    const u0 = a0 + ((a1 - a0) * i) / steps;
    const u1 = a0 + ((a1 - a0) * (i + 1)) / steps;
    const quad = [[r0 * Math.cos(u0), r0 * Math.sin(u0)], [r1 * Math.cos(u0), r1 * Math.sin(u0)], [r1 * Math.cos(u1), r1 * Math.sin(u1)], [r0 * Math.cos(u1), r0 * Math.sin(u1)]];
    s += MAT(mat, S(G.prismOf(F, quad, y0, y1, P)));
  }
  return s;
}

function ground() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -374, y: -164, w: 748, d: 328, r: 20 }, -12, 12, P)}"/>`;
  s += named("Concrete apron", MAT("floor", S(k.slabOf({ x: -372, y: -162, w: 744, d: 324, r: 20 }, -12, 12, P, 8, 1))));
  s += line3(ringPts(0.9, 0.4, 96), "pa-road");
  s += line3(ringPts(0.78, 0.4, 96), "pa-road-lo");
  s += line3([[-350, 120, 0.5], [340, 120, 0.5]], "pa-road-lo");
  for (let i = 0; i < 12; i++) {
    const p = ringAt(i * 30, 0.82, 0.5);
    s += line3([[p[0], p[1], p[2]], [RING.cx + (p[0] - RING.cx) * 0.66, RING.cy + (p[1] - RING.cy) * 0.66, 0.5]], "pa-road-lo");
  }
  const t = at([0, 112, 1]);
  s += `<text class="pa-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">LHC · 26.7 km RING</text>`;
  return s;
}

function tunnel() {
  let s = "";
  const outer = ringPts(1.065, 0);
  const inner = ringPts(0.935, 0);
  s += `<path class="pa-shadow" d="${k.pathOf(ringPts(1.0, -0.6, 120).map(at))}"/>`;
  s += `<path class="pa-band" d="${k.pathOf(outer.concat([...inner].reverse()).map(at), true)}"/>`;
  s += line3(ringPts(1.06, 7), "pa-wall");
  s += line3(ringPts(0.94, 7), "pa-wall");
  s += line3(ringPts(1.06, 0), "pa-wall-lo");
  s += line3(ringPts(0.94, 0), "pa-wall-lo");
  s += line3(ringPts(1.035, 3), "pa-tray");
  for (let i = 0; i < 120; i += 6) {
    const a = (i / 120) * Math.PI * 2;
    const ox = RING.cx + RING.rx * 1.065 * Math.cos(a), oy = RING.cy + RING.ry * 1.065 * Math.sin(a);
    const ix = RING.cx + RING.rx * 0.935 * Math.cos(a), iy = RING.cy + RING.ry * 0.935 * Math.sin(a);
    s += line3([[ox, oy, 0], [ox, oy, 7.5]], "pa-post");
    s += line3([[ix, iy, 0], [ix, iy, 7.5]], "pa-post");
  }
  // magnet stations: dipoles blue, quadrupoles orange
  MAGNET_DEGS.forEach((d, i) => {
    const a = (d * Math.PI) / 180;
    const p = ringAt(d, 1.0, 0);
    const tx = -RING.rx * Math.sin(a), ty = RING.ry * Math.cos(a);
    const tl = Math.hypot(tx, ty) || 1;
    const tan = [tx / tl, ty / tl, 0];
    const u = [tan[1], -tan[0], 0];
    const dipole = i % 2 === 0;
    const F = G.frameOf([p[0], p[1], dipole ? 7 : 6.5], tan, u, [0, 0, 1]);
    const L = dipole ? 9 : 5;
    const poly = dipole ? [[-6, -5], [6, -5], [6, 5], [-6, 5]] : [[-4, -4], [4, -4], [4, 4], [-4, 4]];
    s += MAT(dipole ? "blue" : "orange", S(G.prismOf(F, poly, -L, L, P)));
    s += MAT("chrome", S(G.prismOf(F, dipole ? [[-6.5, 4.4], [6.5, 4.4], [6.5, 5.6], [-6.5, 5.6]] : [[-4.5, 3.4], [4.5, 3.4], [4.5, 4.6], [-4.5, 4.6]], -L - 0.4, L + 0.4, P)));
    s += line3([[p[0] - tan[0] * L, p[1] - tan[1] * L, 13.6], [p[0] + tan[0] * L, p[1] + tan[1] * L, 13.6]], "pa-cryo");
    if (i % 3 === 0) {
      const bp = ringAt(d, 1.09, 0);
      s += MAT("darksteel", slab(bp[0] - 5, bp[1] - 4, 10, 8, 0, 7, 1, 0.2));
      s += MAT(i % 6 === 0 ? "teal" : "yellow", slab(bp[0] - 3, bp[1] - 2, 6, 4, 7, 1.4, 0.5, 0.1));
      s += dot([bp[0] + 2, bp[1] - 2, 9], 0.9, "pa-led");
    }
  });
  // RF cavities replace the magnets at four stations
  for (const d of [75, 105, 255, 285]) {
    const a = (d * Math.PI) / 180;
    const p = ringAt(d, 1.0, 0);
    const tx = -RING.rx * Math.sin(a), ty = RING.ry * Math.cos(a);
    const tl = Math.hypot(tx, ty) || 1;
    const F = G.frameOf([p[0], p[1], 8], [tx / tl, ty / tl, 0], [ty / tl, -tx / tl, 0], [0, 0, 1]);
    s += MAT("copper", S(G.disc(-5, 5, 4.6, F, P)));
    s += MAT("copper", S(G.disc(-5.6, -4.4, 5.6, F, P)) + S(G.disc(4.4, 5.6, 5.6, F, P)));
    s += MAT("gold", S(G.disc(-2, 2, 2.2, F, P)));
    s += line3([[p[0] - 8, p[1], 18], [p[0], p[1], 22], [p[0] + 8, p[1], 18]], "pa-wave");
  }
  // two beam pipes
  s += line3(BEAM_A, "pa-pipe");
  s += line3(BEAM_B, "pa-pipe");
  s += line3(BEAM_A, "pa-pipe-core");
  s += line3(BEAM_B, "pa-pipe-core");
  return named("Accelerator tunnel", s);
}

function cryo() {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const x = -334 + i * 17, y = -70;
    s += MAT("ice", cyl(x, y, 8, 6, 26, 20));
    s += MAT("steel", cyl(x, y, 8.4, 30, 2.4, 20));
    s += MAT("steel", cyl(x, y, 8.4, 4, 2.4, 20));
    s += MAT("blue", cyl(x, y, 2, 32, 4, 12));
    s += line3([[x, y, 36], [x, y, 44], [x + 10, y + 6, 44]], "pa-cryo");
  }
  s += MAT("white", slab(-338, -84, 42, 8, 0, 30, 2, 0.4));
  s += MAT("teal", slab(-336, -83, 38, 2, 22, 5, 0.6, 0.1));
  s += tube([[-296, -64, 12], [-282, -48, 12], [-268, -30, 12], [-252, -18, 12]], 2.2);
  const t = at([-336, -86, 40]);
  s += `<text class="pa-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">CRYOPLANT · 1.9 K</text>`;
  return named("Cryogenic plant", s);
}

function injector() {
  let s = "";
  // linac
  for (let i = 0; i < 3; i++) {
    const x = -350 + i * 15, y = 96;
    s += MAT("white", slab(x, y, 12, 20, 0, 10, 1.5, 0.3));
    s += MAT(i === 1 ? "orange" : "teal", slab(x + 1, y + 2, 10, 3, 10, 8, 0.5, 0.1));
    s += MAT("steel", slab(x + 1, y + 16, 10, 3, 10, 5, 0.5, 0.1));
    s += line3([[x + 6, y + 8, 10], [x + 6, y + 8, 16]], "pa-cryo");
  }
  // booster ring
  const bc = { x: INJ.x, y: INJ.y };
  const bpts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    bpts.push([bc.x + 20 * Math.cos(a), bc.y + 14 * Math.sin(a), 9]);
  }
  s += line3(bpts, "pa-track-lo");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += MAT(i % 2 ? "orange" : "blue", slab(bc.x + 20 * Math.cos(a) - 2, bc.y + 14 * Math.sin(a) - 1.6, 4, 3.2, 9, 3, 0.5, 0.1));
  }
  s += tube([[-298, 84, 12], [-286, 90, 12], [-270, 92, 12], [-256, 86, 12], [-248, 74, 12]], 1.8);
  const t = at([-340, 116, 12]);
  s += `<text class="pa-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">INJECTOR · LINAC + BOOSTER</text>`;
  return named("Injector chain", s);
}

function control() {
  const x = -40, y = 20, w = 64, d = 34;
  let s = MAT("darksteel", slab(x, y, w, d, 0, 6, 2, 0.2));
  s += MAT("white", slab(x + 2, y + 2, w - 4, d - 4, 6, 16, 1.5, 0.3));
  s += MAT("glass", slab(x + 4, y + d - 5, w - 8, 1.4, 12, 7, 0.4, 0.1));
  s += MAT("teal", slab(x + 6, y + 6, 14, 2, 12, 5, 0.4, 0.1));
  s += MAT("violet", slab(x + 24, y + 6, 10, 2, 12, 5, 0.4, 0.1));
  s += MAT("orange", slab(x + 38, y + 6, 12, 2, 12, 5, 0.4, 0.1));
  s += dot([x + w - 6, y + 4, 20], 1, "pa-led");
  const t = at([x + 2, y + d + 4, 14]);
  s += `<text class="pa-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">CONTROL ROOM</text>`;
  return named("Control room", s);
}

function detector() {
  const Fd = G.frameOf([DET.x, DET.y, DET.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const y0 = -DET.half, y1 = DET.half;
  let s = "";
  // platform and feet
  s += MAT("darksteel", slab(DET.x - 52, DET.y - 44, 104, 88, 0, 3, 4, 0.3));
  s += MAT("yellow", slab(DET.x - 52, DET.y + 40, 104, 2.2, 3, 1.4, 0.4, 0.1));
  s += MAT("steel", slab(DET.x - 40, DET.y + 30, 24, 10, 3, 8, 1, 0.2));
  s += MAT("steel", slab(DET.x + 14, DET.y + 30, 24, 10, 3, 8, 1, 0.2));
  // barrel layers, open toward the viewer (+x). Outer layers are painted first so the nested
  // inner layers stay visible through the cutaway.
  s += cshell(Fd, 35, 42, Math.PI / 2, Math.PI * 1.5, y0, y1, 14, "darksteel");
  s += cshell(Fd, 29, 33, Math.PI / 2, Math.PI * 1.5, y0, y1, 14, "blue");
  s += cshell(Fd, 21, 27, Math.PI / 2, Math.PI * 1.5, y0, y1, 14, "orange");
  s += cshell(Fd, 13, 19, Math.PI / 2, Math.PI * 1.5, y0, y1, 14, "green");
  s += cshell(Fd, 6, 11, Math.PI / 2, Math.PI * 1.5, y0, y1, 14, "violet");
  // end rings and the visible cut edges, colour-coded by layer
  const layerMats = [[35, 42, "red"], [29, 33, "blue"], [21, 27, "orange"], [13, 19, "green"], [6, 11, "violet"]];
  layerMats.forEach(([r0, r1, m], li) => {
    s += MAT(m, S(G.ringBand(y0 - 2, y0, r0, r1, Fd, P)));
    s += MAT(m, S(G.ringBand(y1, y1 + 2, r0, r1, Fd, P)));
    s += line3([[DET.x, y0 - 1, DET.z + (r0 + r1) / 2], [DET.x, y1 + 1, DET.z + (r0 + r1) / 2]], "pa-edge" + li);
    s += line3([[DET.x, y0 - 1, DET.z - (r0 + r1) / 2], [DET.x, y1 + 1, DET.z - (r0 + r1) / 2]], "pa-edge" + li);
  });
  // muon chambers on the outside
  for (const a of [Math.PI * 0.72, Math.PI * 1.02, Math.PI * 1.3]) {
    const u = Math.cos(a), v = Math.sin(a);
    s += MAT("darksteel", slab(DET.x + u * 44 - 6, DET.y - 26 + (-v + 1) * 26, 12, 22, DET.z + v * 44 - 4, 8, 1, 0.2));
  }
  // beam pipe through the barrel
  s += line3([[DET.x, DET.y - 100, DET.z], [DET.x, DET.y + 100, DET.z]], "pa-pipe");
  s += line3([[DET.x, DET.y - 100, DET.z], [DET.x, DET.y + 100, DET.z]], "pa-pipe-core");
  s += dot([DET.x, DET.y, DET.z], 3, "pa-flash");
  s += '<g data-part="event"></g>';
  const t = at([DET.x - 50, DET.y + 42, 4]);
  s += `<text class="pa-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">DETECTOR</text>`;
  return named("Detector", s);
}

function beams() {
  return '<g data-part="beams"></g>';
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "pa-svg",
    label: "The Large Hadron Collider in isometric cutaway. A full oval ring tunnel carries blue dipole and orange quadrupole magnets, RF cavities and two counter-rotating proton beams. A cryogenic plant, injector chain and control room sit inside and around the ring; at the right a cutaway detector surrounds the collision point.",
    body: [ground(), tunnel(), cryo(), injector(), control(), `<g class="pa-det">${detector()}</g>`, beams()],
  });
  const plate = k.plateHtml({
    fig: "Fig 30", title: "Particle accelerator", hint: "Follow the beams",
    readout: "", body: `<div class="iso-stage pa-stage" tabindex="0" role="img" aria-label="Particle accelerator ring">${svg}</div>`,
  });

  const css = `
.pa-road{stroke:var(--anatomy-faint);stroke-width:1.6;stroke-dasharray:14 10;fill:none;opacity:.55}
.pa-road-lo{stroke:var(--anatomy-faint);stroke-width:1;stroke-dasharray:8 12;fill:none;opacity:.35}
.pa-shadow{stroke:#000;stroke-width:30;opacity:.07;fill:none}
.pa-band{fill:rgba(130,142,160,.3);stroke:#5c6675;stroke-width:1.2;stroke-linejoin:round}
body[data-theme="dark"] .pa-band{fill:rgba(55,65,80,.75)}
.pa-wall{stroke:#99a5b4;stroke-width:2.6;fill:none;opacity:.95}
.pa-wall-lo{stroke:#59636f;stroke-width:1.3;fill:none}
.pa-post{stroke:#6d7888;stroke-width:1.1;opacity:.85}
.pa-tray{stroke:#8a96a6;stroke-width:1;stroke-dasharray:5 7;fill:none;opacity:.7}
.pa-cryo{stroke:#7fd4f0;stroke-width:1.6;fill:none;opacity:.8}
.pa-pipe{stroke:#b9c3d0;stroke-width:2.2;fill:none;opacity:.9}
.pa-pipe-core{stroke:#e9f2fb;stroke-width:.7;fill:none;opacity:.8}
.pa-track-lo{stroke:#8090a5;stroke-width:2;fill:none;stroke-dasharray:5 5}
.pa-wave{stroke:#e9b949;stroke-width:1.2;fill:none;opacity:.8;animation:pa-wave 1.4s ease-in-out infinite}
.pa-led{fill:#63e6a3;animation:pa-blink 1.8s steps(2) infinite}
.pa-sign{fill:var(--anatomy-muted);font:600 8.5px "LabMono",ui-monospace,monospace;letter-spacing:.1em}
.pa-track{stroke-width:1.5;fill:none;opacity:.9}
.pa-track.t0{stroke:#ff7a45}.pa-track.t1{stroke:#3cc8d8}.pa-track.t2{stroke:#8ee06a}.pa-track.t3{stroke:#e9b949}
.pa-layer0{stroke:#a07cd8;stroke-width:2.4}.pa-layer1{stroke:#57c98a;stroke-width:2.8}.pa-layer2{stroke:#f08a3a;stroke-width:3.2}.pa-layer3{stroke:#5b9be8;stroke-width:2.8}.pa-layer4{stroke:#e05548;stroke-width:3.6}
.pa-edge0{stroke:#e05548;stroke-width:3.6}.pa-edge1{stroke:#5b9be8;stroke-width:3}.pa-edge2{stroke:#f08a3a;stroke-width:3.4}.pa-edge3{stroke:#57c98a;stroke-width:3}.pa-edge4{stroke:#a07cd8;stroke-width:2.6}
.pa-flash{fill:#ffe9a8;filter:drop-shadow(0 0 6px #ffd25a);animation:pa-flash 1.1s ease-out infinite}
.pa-proton-a{fill:#ff9a50;filter:drop-shadow(0 0 3px #ff6a10)}
.pa-proton-b{fill:#5fd8ea;filter:drop-shadow(0 0 3px #2aa8c0)}
body[data-mode="collision"] .pa-svg>g:not(.pa-det){opacity:.3;transition:opacity .35s}
body[data-mode="collision"] .pa-det{filter:drop-shadow(0 0 10px rgba(255,208,120,.35))}
@keyframes pa-wave{0%,100%{opacity:.2}50%{opacity:.95}}
@keyframes pa-blink{0%,55%{opacity:1}56%,100%{opacity:.2}}
@keyframes pa-flash{0%{opacity:1;r:2}30%{opacity:.8}100%{opacity:.15}}
${materialsCss(["floor", "white", "cream", "steel", "darksteel", "chrome", "copper", "gold", "blue", "orange", "teal", "green", "red", "violet", "yellow", "glass", "ice", "carbon"])}
`;

  const live = `
const state = initialState();
const eventEl = part("event"), beamsEl = part("beams");
let lastPaint = 0, lastGauge = 0;
const DET = C.DET;
Lab.onAction((a) => {
  if (a === "inject") { state.energy = 0.45; state.ramping = true; }
  if (a === "reset") { Object.assign(state, initialState()); Lab.set("energy", 6.8); Lab.set("bunches", 2800); Lab.set("beta", 0.55); }
});

const TRACKS = [];
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * TAU + 0.2;
  const y = ((i % 5) - 2) * 0.22;
  const dx = Math.cos(a), dz = Math.sin(a);
  TRACKS.push({ dx, dy: y, dz, len: 16 + (i % 6) * 4, col: i % 4 });
}

function eventSvg(now) {
  let s = "";
  for (let i = 0; i < TRACKS.length; i++) {
    const tr = TRACKS[i];
    let p = (now * 0.5 + i * 0.11) % 1;
    if (p < 0.08) continue;
    const q = (p - 0.08) / 0.92;
    const L = tr.len * q;
    const p0 = [DET.x, DET.y, DET.z];
    const p1 = [DET.x + tr.dx * L * 0.5, DET.y + tr.dy * L * 0.5 + Math.sin(i + now * 2) * 1.4 * q, DET.z + tr.dz * L * 0.5];
    const p2 = [DET.x + tr.dx * L, DET.y + tr.dy * L + Math.sin(i + now * 2) * 3 * q, DET.z + tr.dz * L];
    s += line3([p0, p1, p2], "pa-track t" + tr.col);
    s += dot(p2, 1.1, "pa-track t" + tr.col);
  }
  return s;
}

function beamSvg(now) {
  let s = "";
  for (let i = 0; i < 44; i++) {
    const fa = (now * 0.06 + i / 44) % 1;
    const fb = (-now * 0.06 + i / 44 + 1) % 1;
    const pa = along(C.BEAM_A, fa), pb = along(C.BEAM_B, fb);
    s += dot(pa, 1.25, "pa-proton-a");
    s += dot(pb, 1.25, "pa-proton-b");
  }
  return s;
}

const cv = document.querySelector(".pa-chart");
function drawEvent(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), rule = cs.getPropertyValue("--lab-rule");
  const cx = w * 0.5, cy = h * 0.52, R = Math.min(w * 0.3, h * 0.42);
  [[0.26, "rgba(160,120,220,.9)"], [0.44, "rgba(80,190,130,.9)"], [0.66, "rgba(240,140,60,.9)"], [0.94, "rgba(120,140,170,.9)"]].forEach(([f, col]) => {
    ctx.strokeStyle = col; ctx.globalAlpha = .55; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  });
  const now = performance.now() / 1000;
  const cols = ["#ff7a45", "#3cc8d8", "#8ee06a", "#e9b949"];
  TRACKS.forEach((tr, i) => {
    let p = (now * 0.5 + i * 0.11) % 1;
    if (p < 0.08) return;
    const q = (p - 0.08) / 0.92;
    const a = Math.atan2(tr.dz, tr.dx);
    const L = R * 0.92 * q * (tr.len / 34);
    ctx.strokeStyle = cols[tr.col]; ctx.lineWidth = 2.6; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a + 0.3) * L * 0.6, cy + Math.sin(a + 0.3) * L * 0.6, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    ctx.stroke();
    ctx.fillStyle = cols[tr.col]; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * L, cy + Math.sin(a) * L, 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffe9a8"; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = muted; ctx.font = "500 14px ui-monospace,monospace"; ctx.textAlign = "left";
  ctx.fillText("event " + (3400 + Math.floor(o.collisions / 1e9)), 12, 20);
  ctx.fillStyle = muted; ctx.font = "500 12px ui-monospace,monospace";
  ctx.fillText("tracker · ECAL · HCAL · muon", 12, h - 10);
  ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(w - 2, 8); ctx.lineTo(w - 2, h - 8); ctx.stroke();
}

function frame(dt, now) {
  const u = { energy: Lab.value("energy"), bunches: Lab.value("bunches"), beta: Lab.value("beta") };
  step(state, u, Math.min(dt * SIM_SPEED, 1));
  const o = outputs(state);
  if (now - lastPaint > 0.1) {
    lastPaint = now;
    setHtml(eventEl, eventSvg(now));
    setHtml(beamsEl, beamSvg(now));
  }
  if (now - lastGauge > 0.25) {
    lastGauge = now;
    Lab.gauge("energy", o.energy.toFixed(1) + " TeV", o.energy > 7.0);
    Lab.gauge("field", o.field.toFixed(2) + " T", o.field > 8.25);
    Lab.gauge("lumi", (o.lumi / 1e34).toFixed(2) + "e34", o.lumi < 0.3e34);
    Lab.gauge("collisions", (o.collisions / 1e9).toFixed(1) + "e9 /s", o.lumi < 0.3e34);
    Lab.gauge("stored", Math.round(o.stored) + " MJ");
    Lab.gauge("cryo", o.cryo.toFixed(1) + " K", o.cryo > 2.1);
    Lab.gauge("bunches", Math.round(o.bunches).toLocaleString("en-US"));
    readout((o.ramping ? "RAMPING · " : "") + o.energy.toFixed(1) + " TeV · " + (o.lumi / 1e34).toFixed(1) + "e34 lum · " + (o.collisions / 1e9).toFixed(1) + "e9/s");
    drawEvent(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { BEAM_A, BEAM_B, DET }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Collision event display</span><em>tracks in the detector</em></div><canvas class="pa-chart" style="width:100%;height:170px;display:block"></canvas></div>`,
  };
}
