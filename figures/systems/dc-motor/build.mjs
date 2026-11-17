// DC motor: a demonstration motor on a board. Two field magnets face each other across an
// armature coil that turns on a horizontal shaft. A split-ring commutator and two carbon
// brushes reverse the coil current every half turn so the torque always acts the same way.
// The rotor follows J dω/dt = Kt·I − b·ω − τ_load with I = (V − Ke·ω)/R.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../vendor/anatomy/kit/tube.mjs";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

export const WIDTH = 600;
export const HEIGHT = 470;

const BOARD = { x: -150, y: -90, w: 300, d: 180, r: 10 };
const AXZ = 110; // shaft height
const COIL = { r: 42, y0: -46, y1: 32 }; // coil radius from the shaft and its length along y
const MAG = { gap: 56, w: 24, d: 96, h: 74 };
const COMM_Y = 52;
const MOTOR = { R: 1.2, k: 0.02, J: 2.2e-5, b: 1.5e-6 };

const P = k.fitProjection([...k.boxCorners(BOARD, -12, 0), [0, 0, AXZ + 80], [-110, 0, AXZ + 60], [110, 0, AXZ + 60]], WIDTH, HEIGHT, { pad: 16, azimuth: 76, elevation: 26 });
const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const at = (p) => k.iso(p, P);
const Yf = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const named = (n, s) => `<g data-name="${n}">${s}</g>`;
function tube(points, r, opts = {}) {
  const route = G.fillet(points, opts.bend ?? Math.max(4, r * 3), 8, { P, tube: r });
  return tubePieces(route, r, P, { maxLength: 400, ...opts }).map((p) => tubeSvg(p, { tone: "hi" })).join("");
}

function board() {
  let s = `<path class="iso-halo" d="${k.haloOf(BOARD, -12, 12, P)}"/>`;
  s += named("Base board", mat("wood", S(k.slabOf(BOARD, -12, 12, P, 8, 1.2)) + Ln(k.planOutline(k.insetPlan(BOARD, 6), 0, P), { tone: "lo" })));
  // bearing posts at both ends of the shaft
  for (const y of [-70, 74]) s += named("Bearing", mat("brass", S(k.slabOf({ x: -9, y: y - 5, w: 18, d: 10, r: 2 }, 0, AXZ - 8, P, 3, 0.5)) + S(G.disc(y - 6, y + 6, 9, Yf([0, 0, AXZ]), P))));
  // battery pack
  s += named("Battery pack", mat("darksteel", S(k.slabOf({ x: 70, y: 20, w: 70, d: 56, r: 4 }, 0, 30, P, 4, 0.8))) + mat("orange", [84, 100, 116, 132].map((x) => S(G.disc(-0.1, 46, 6.5, G.frameOf([x - 4, 22, 38], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P))).join("")));
  return s;
}

function magnet(x, north) {
  const side = north ? -1 : 1;
  const x0 = north ? x - MAG.w : x;
  let s = S(k.slabOf({ x: x0, y: -MAG.d / 2, w: MAG.w, d: MAG.d, r: 3 }, AXZ - MAG.h / 2, MAG.h, P, 3, 0.8));
  s += k.faceTextSvg(k.topMatrix([x0 + MAG.w / 2, -10], AXZ + MAG.h / 2, P, "x"), north ? "N" : "S", { size: 18, tone: "lo", anchor: "middle" });
  const yoke = mat("iron", S(k.slabOf({ x: north ? x0 - 14 : x0 + MAG.w, y: -MAG.d / 2 - 2, w: 14, d: MAG.d + 4, r: 2 }, 0, AXZ + MAG.h / 2 + 4, P, 3, 0.6)));
  return named(north ? "North magnet" : "South magnet", yoke + mat(north ? "red" : "blue", s)) + `<g data-side="${side}"></g>`;
}

const LIVE = `
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Yf = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
// coil side positions at rotor angle a (0 = coil plane vertical)
const side = (a, s) => [s * C.COIL.r * Math.sin(a), s * C.COIL.r * Math.cos(a)];
function rotorSvg(a, I, dir) {
  const [ax, az] = side(a, 1), [bx, bz] = side(a, -1);
  // armature: the copper loop (several turns drawn as parallel strokes) and the shaft
  const loop = (o) => [[ax + o, C.COIL.y1, C.AXZ + az], [ax + o, C.COIL.y0, C.AXZ + az], [bx + o, C.COIL.y0, C.AXZ + bz], [bx + o, C.COIL.y1, C.AXZ + bz]];
  let coil = "";
  for (let t = -3; t <= 3; t++) coil += '<path class="dm-coil-under" d="' + pathOf(loop(t * 1.1).map((p) => iso(p, P))) + '"/>';
  for (let t = -3; t <= 3; t++) coil += '<path class="dm-coil" d="' + pathOf(loop(t * 1.1).map((p) => iso(p, P))) + '"/>';
  // leads to the commutator segments
  const lead = (x, z) => pathOf([iso([x, C.COIL.y1, C.AXZ + z], P), iso([x * 0.2, C.COMM_Y - 6, C.AXZ + z * 0.2], P)]);
  coil += '<path class="dm-coil" d="' + lead(ax, az) + lead(bx, bz) + '"/>';
  let shaft = S(G.disc(-80, 90, 3.2, Yf([0, 0, C.AXZ]), P));
  // commutator: two copper half-rings with insulating gaps, turning with the coil
  let comm = "";
  for (const h of [0, 1]) {
    const pts = []; for (let i = 0; i <= 18; i++) { const t = a + Math.PI / 2 + h * Math.PI + 0.12 + (i / 18) * (Math.PI - 0.24); pts.push([9 * Math.cos(t), 9 * Math.sin(t)]); }
    pts.push(...pts.slice().reverse().map(([x, z]) => [x * 0.55, z * 0.55]));
    comm += S(G.prismOf(G.frameOf([0, C.COMM_Y - 8, C.AXZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]), pts.slice(0, 19).concat([[0, 0]]), 0, 14, P));
  }
  // current markers moving round the loop in the direction set by the commutator
  let dots = "";
  if (Math.abs(I) > 0.05) {
    const path = loop(0);
    for (let i = 0; i < 10; i++) {
      let f = ((performance.now() / 1000) * 0.6 * Math.sign(I) * dir + i / 10) % 1; if (f < 0) f += 1;
      const seg = Math.floor(f * 3), u = f * 3 - seg;
      const p0 = path[seg], p1 = path[seg + 1];
      const c = iso([p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u], P);
      dots += '<circle class="dm-electron" cx="' + c[0] + '" cy="' + c[1] + '" r="1.5"/>';
    }
  }
  // force arrows on the two long sides (F = I L × B): up on one side, down on the other
  let force = "";
  if (Math.abs(I) > 0.05) {
    const L = Math.min(26, 6 + Math.abs(I) * 2.2) * Math.sign(I) * dir;
    for (const [x, z, sg] of [[ax, az, 1], [bx, bz, -1]]) {
      const p0 = iso([x, (C.COIL.y0 + C.COIL.y1) / 2, C.AXZ + z], P), p1 = iso([x, (C.COIL.y0 + C.COIL.y1) / 2, C.AXZ + z + sg * L], P);
      force += '<path class="dm-force" marker-end="url(#dm-arrow)" d="' + pathOf([p0, p1]) + '"/>';
    }
  }
  return { back: MAT("steel", shaft) + MAT("copper", coil) + dots + force, comm: MAT("copper", comm) };
}
`;

export function figure(theme) {
  const C = { COIL, AXZ, COMM_Y };
  const B = new Function("G", "P", "C", "solidSvg", "iso", "pathOf", `${LIVE}; return { rotorSvg };`)(G, P, C, k.solidSvg, k.iso, k.pathOf);
  const r0 = B.rotorSvg(0.4, 0, 1);
  // field lines across the gap
  let field = "";
  for (const z of [-30, -15, 0, 15, 30]) for (const y of [-30, 0, 30]) field += `<path class="dm-field" marker-end="url(#dm-arrow-b)" d="${k.pathOf([at([-MAG.gap + 2, y, AXZ + z]), at([MAG.gap - 2, y, AXZ + z])])}"/>`;
  const brushes = named("Carbon brushes", mat("carbon", [-1, 1].map((s) => S(k.slabOf({ x: s * 9 + (s < 0 ? -12 : 0), y: COMM_Y - 5, w: 12, d: 8, r: 1 }, AXZ - 4, 8, P, 2, 0.3))).join("")) + mat("brass", [-1, 1].map((s) => S(k.slabOf({ x: s * 22 + (s < 0 ? -4 : 0), y: COMM_Y - 2, w: 4, d: 4, r: 1 }, 0, AXZ + 2, P, 2, 0.3))).join("")));
  const wires = named("Wires", mat("red", tube([[24, COMM_Y, 4], [24, COMM_Y + 20, 4], [84, 46, 10], [84, 40, 30]], 1.4)) + mat("rubber", tube([[-24, COMM_Y, 4], [-24, COMM_Y + 30, 4], [132, 70, 6], [132, 40, 30]], 1.4, { bend: 20 })));
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "dm-svg",
    label: "A demonstration DC motor on a wooden board: a red north magnet and a blue south magnet face each other across a copper armature coil on a horizontal shaft. A split-ring commutator and two carbon brushes connect the coil to a battery pack.",
    body: [board(), magnet(-MAG.gap, true), `<g class="dm-fieldlines" data-name="Magnetic field">${field}</g>`, `<g data-part="rotor" data-name="Armature coil">${r0.back}</g>`, magnet(MAG.gap, false), `<g data-part="comm" data-name="Commutator">${r0.comm}</g>`, brushes, wires],
  });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<marker id="dm-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ff7a1a"/></marker>
<marker id="dm-arrow-b" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5a8bff"/></marker></defs></svg>`;
  const plate = defs + k.plateHtml({ fig: "Fig 8", title: "DC motor", hint: "Set the voltage · add load", readout: "", body: `<div class="iso-stage dm-stage" tabindex="0" role="img" aria-label="DC motor">${svg}</div>` });
  const css = `
.dm-coil{fill:none;stroke:#f0a160;stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round}
.dm-coil-under{fill:none;stroke:#7a3a12;stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}
.dm-electron{fill:#ffe36b;filter:drop-shadow(0 0 1.5px #ffb800)}
.dm-force{fill:none;stroke:#ff7a1a;stroke-width:2.2;stroke-linecap:round}
.dm-field{fill:none;stroke:#5a8bff;stroke-width:.7;stroke-dasharray:3 3;opacity:.55;animation:dm-flow 1.2s linear infinite}
@keyframes dm-flow{to{stroke-dashoffset:-12}}
body[data-mode="plain"] .dm-fieldlines,body[data-mode="plain"] .dm-force{display:none}
${materialsCss(["wood", "brass", "darksteel", "orange", "iron", "red", "blue", "steel", "copper", "carbon", "rubber"])}
`;
  const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
const M = ${JSON.stringify(MOTOR)};
${LIVE}
const stage = document.querySelector(".dm-stage");
const rotor = stage.querySelector('[data-part="rotor"]'), commEl = stage.querySelector('[data-part="comm"]');
const readout = document.querySelector("[data-readout]");
let w = 0, a = 0.4, last = 0, frame = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  const V = Lab.value("volts"), load = Lab.value("load") / 1000; // N·m
  // integrate the real motor in small steps
  let I = 0;
  for (let i = 0; i < 40; i++) {
    const h = dt / 40;
    I = (V - M.k * w) / M.R;
    const tau = M.k * I - M.b * w - Math.min(Math.abs(load), Math.abs(M.k * I)) * Math.sign(w || 1) * (w > 0.5 || load < M.k * I ? 1 : 0);
    w = Math.max(0, w + (tau / M.J) * h);
  }
  I = (V - M.k * w) / M.R;
  // show the rotor at a watchable speed: 1 visual turn per second at 3000 rpm
  const rpm = (w * 60) / (2 * Math.PI);
  if (!Lab.reduced.matches) a += (rpm / 3000) * 2 * Math.PI * dt;
  const dir = Math.cos(a) >= 0 ? 1 : -1; // the commutator flips the current direction each half turn
  const r = rotorSvg(a, I, dir);
  rotor.innerHTML = r.back; commEl.innerHTML = r.comm;
  const tau = M.k * I, pin = V * I, pout = Math.max(0, (tau - M.b * w) * w);
  const text = Math.round(rpm) + " rpm · " + I.toFixed(2) + " A";
  if (readout.textContent !== text) readout.textContent = text;
  Lab.gauge("rpm", Math.round(rpm).toLocaleString() + " rpm");
  Lab.gauge("amps", I.toFixed(2) + " A", I > 6);
  Lab.gauge("emf", (M.k * w).toFixed(2) + " V");
  Lab.gauge("torque", (tau * 1000).toFixed(0) + " mN·m");
  Lab.gauge("pout", pout.toFixed(1) + " W");
  Lab.gauge("eff", pin > 0.01 ? Math.round((pout / pin) * 100) + " %" : "—");
  frame = requestAnimationFrame(tick);
}
document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
Lab.onStep((i, s, user) => { if (user) { if (s.volts !== undefined) Lab.set("volts", s.volts); if (s.load !== undefined) Lab.set("load", s.load); } });
frame = requestAnimationFrame(tick);
`;
  return { plate, css, script: kitScript() + latheScript() + live };
}
