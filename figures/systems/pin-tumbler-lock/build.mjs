// Pin-tumbler lock: a brass cylinder sectioned along its length on a display block.
// Five pin stacks (key pin + driver pin + spring) sit in the shell and plug. Slide the key in:
// each key pin rides the key's cuts; when every split lands on the shear line the plug turns.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

export const WIDTH = 600;
export const HEIGHT = 470;

// Lock axis runs along x. Plug radius 12, shell radius 22. Shear line at z = PLUG_TOP.
const AX = { z: 60, y: 0 };
const PLUG_R = 12, SHELL_R = 22;
const PLUG_TOP = AX.z + PLUG_R; // shear line
const PIN_X = [-36, -18, 0, 18, 36];
const KEY_TRUE = [3, 7, 4, 8, 2]; // cut depths (0..9) of the right key
const KEY_WRONG = [6, 2, 7, 3, 5];
const DEPTH_MM = 1.6; // each depth step lowers the key's edge by this much (scaled units)
const KEY_TOP = AX.z + 4; // top edge of an uncut key blade inside the plug
const PLINTH = { x: -110, y: -50, w: 220, d: 100, r: 10 };

const P = k.fitProjection([...k.boxCorners(PLINTH, -16, 0), [-140, 0, AX.z + 60], [110, 0, AX.z + 70]], WIDTH, HEIGHT, { pad: 18, azimuth: 70, elevation: 22 });
const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const at = (p) => k.iso(p, P);
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const named = (n, s, extra = "") => `<g data-name="${n}"${extra}>${s}</g>`;
const arc = (r, a0, a1, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / n; return [r * Math.cos(t), r * Math.sin(t)]; });

// Section helpers: the lock is cut at y = 0; the back half (y <= 0) remains.
const cutPoly = (pts, cls) => `<path class="${cls}" d="${k.pathOf(pts.map(([x, z]) => at([x, 0.1, z])), true)}"/>`;

function plinth() {
  let s = `<path class="iso-halo" d="${k.haloOf(PLINTH, -16, 16, P)}"/>`;
  s += named("Display block", mat("walnut", S(k.slabOf(PLINTH, -16, 16, P, 8, 1.2)) + Ln(k.planOutline(k.insetPlan(PLINTH, 6), 0, P), { tone: "lo" })));
  s += mat("brass", S(k.slabOf({ x: -70, y: 26, w: 70, d: 18, r: 2 }, 0, 1.2, P, 3, 0.4)) + k.faceTextSvg(k.topMatrix([-66, 36], 1.2, P, "x"), "5-PIN TUMBLER · CUTAWAY", { size: 3.6, tone: "hi" }));
  // two brass saddles carry the cylinder
  s += mat("darksteel", [-60, 40].map((x) => S(k.slabOf({ x, y: -16, w: 16, d: 32, r: 2 }, 0, AX.z - SHELL_R + 2, P, 3, 0.4))).join(""));
  return s;
}

function shellBack() {
  // back half of the cylinder housing (a half-annulus prism along x) plus the pin tower
  const F = Xf([0, 0, AX.z]);
  // housing: half shell around the plug, drawn as a lathe half by clipping via the section face
  let s = S(G.prismOf(F, [...arc(SHELL_R, Math.PI, 2 * Math.PI, 30).map(([y, z]) => [y, z])], -64, 56, P));
  // pin tower on top of the housing (back half)
  s += S(k.slabOf({ x: -50, y: -12, w: 100, d: 12, r: 0 }, AX.z + SHELL_R - 6, 48, P, 2, 0.4));
  // the face of the cut: shell ring section and tower section, with bored pin chambers
  let cut = "";
  cut += cutPoly([[-64, AX.z - SHELL_R], [56, AX.z - SHELL_R], [56, AX.z - PLUG_R - 0.6], [-64, AX.z - PLUG_R - 0.6]], "lk-cut");
  cut += cutPoly([[-64, PLUG_TOP + 0.6], [56, PLUG_TOP + 0.6], [56, AX.z + SHELL_R - 6], [50, AX.z + SHELL_R - 6], [50, AX.z + SHELL_R + 42], [-50, AX.z + SHELL_R + 42], [-50, AX.z + SHELL_R - 6], [-64, AX.z + SHELL_R - 6]], "lk-cut");
  for (const x of PIN_X) cut += cutPoly([[x - 3.6, PLUG_TOP + 0.6], [x + 3.6, PLUG_TOP + 0.6], [x + 3.6, AX.z + SHELL_R + 36], [x - 3.6, AX.z + SHELL_R + 36]], "lk-bore");
  // the face plate and keyway at the front end
  const face = S(G.disc(56, 62, SHELL_R + 4, F, P));
  return named("Cylinder shell", mat("brass", s) + cut) + named("Face plate", mat("brass", face));
}

// ---- live --------------------------------------------------------------------------------------
const LIVE = `
const MAT = (n, s) => '<g data-mat="' + n + '">' + s + '</g>';
const S = (p, st) => solidSvg(p, st || { tone: "hi" });
const Xf = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const cutPoly = (pts, cls) => '<path class="' + cls + '" d="' + pathOf(pts.map(([x, z]) => iso([x, 0.2, z], P)), true) + '"/>';
function bladeTop(u, cuts) {
  // u: position along the blade from bow (0) to tip (120); each cut is a valley centred on its bitting position
  let top = C.KEY_TOP + 5;
  if (u > 110) top -= (u - 110) * 1.2;
  for (let i = 0; i < 5; i++) {
    const c = 28 + i * 18; // bitting positions sit under the pins when fully inserted
    const depth = 1.4 + cuts[i] * C.DEPTH;
    const v = depth - Math.abs(u - c) * 1.1;
    if (v > 0) top = Math.min(top, C.KEY_TOP + 5 - v);
  }
  return top;
}
function keySvg(ins, cuts, turn) {
  const tip = -64 + ins * 120;
  const bow = tip - 120;
  const pts = [];
  for (let u = 0; u <= 120; u += 1.5) pts.push([bow + u, bladeTop(u, cuts)]);
  pts.push([bow + 120, C.AXz - 6]);
  pts.push([bow, C.AXz - 6]);
  // the blade is a thin plate in the section plane (y from -1.5 to 1.5); draw its face polygon
  const face = '<path class="lk-key" d="' + pathOf(pts.map(([x, z]) => iso([x, 1.6, z], P)), true) + '"/>';
  const back = '<path class="lk-key-side" d="' + pathOf(pts.map(([x, z]) => iso([x, -1.6, z], P)), true) + '"/>';
  // bow (head of the key) outside the lock
  const FB = G.frameOf([bow - 20, 0, C.AXz + 2], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const head = S(G.disc(-1.8, 1.8, 19, FB, P)) + S(G.disc(-1.8, 1.8, 7, G.frameOf([bow - 4, 0, C.AXz + 2], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P));
  const ring = lineSvg(G.circleOf(FB, 1.8, 6, P), { tone: "hi" }) + lineSvg(G.circleOf(FB, 1.8, 15, P), { tone: "lo" });
  return MAT("chrome", head + ring) + back + face;
}
function pinHeightAt(i, ins, cuts) {
  // the key pin's bottom rests on the blade under it (or on the plug floor when no key)
  const tip = -64 + ins * 120, bow = tip - 120;
  const u = C.PIN_X[i] - bow;
  if (u < 0 || u > 120) return C.AXz - 8; // no key under this pin: pin falls into the empty keyway
  return bladeTop(u, cuts);
}
function pinsSvg(ins, cuts, turn, picked) {
  let s = "";
  let allSet = true;
  for (let i = 0; i < 5; i++) {
    const keyPinLen = C.SHEAR - (C.KEY_TOP + 5 - 1.4 - C.TRUE[i] * C.DEPTH); // cut to put the split on the shear line for the right key
    const bottom = pinHeightAt(i, ins, cuts);
    const split = bottom + keyPinLen; // top of the key pin
    const ok = Math.abs(split - C.SHEAR) < 0.7;
    if (!ok) allSet = false;
    const x = C.PIN_X[i];
    const driverLen = 12;
    const driverTop = Math.max(split + driverLen, C.SHEAR + driverLen);
    const springTop = C.TOWER_TOP - 4;
    // spring above the driver
    const coil = [];
    const n = 9;
    for (let j = 0; j <= n * 8; j++) { const t = j / (n * 8); const zz = driverTop + (springTop - driverTop) * t; coil.push(iso([x + 3 * Math.sin(t * n * Math.PI * 2), 0.4, zz], P)); }
    s += '<g data-name="Spring">' + MAT("steel", '<path class="lk-spring" d="' + pathOf(coil) + '"/>') + '</g>';
    s += '<g data-name="Driver pin">' + MAT("steel", cutPoly([[x - 3.2, driverTop - driverLen], [x + 3.2, driverTop - driverLen], [x + 3.2, driverTop], [x - 3.2, driverTop]], "lk-pin")) + '</g>';
    s += '<g data-name="Key pin">' + MAT("brass", cutPoly([[x - 3.2, bottom + 1.5], [x - 1.4, bottom], [x + 1.4, bottom], [x + 3.2, bottom + 1.5], [x + 3.2, split], [x - 3.2, split]], "lk-pin")) + '</g>';
    if (ok) s += '<circle class="lk-ok" cx="' + iso([x, 0.5, C.SHEAR], P)[0] + '" cy="' + iso([x, 0.5, C.SHEAR], P)[1] + '" r="1.6"/>';
  }
  return { svg: s, allSet };
}
function plugSvg(turn) {
  // the plug's section: a rectangle on the cut plane (rotation shown by the cam at the back)
  let s = cutPoly([[-64, C.AXz - C.PLUG_R], [56, C.AXz - C.PLUG_R], [56, C.SHEAR], [-64, C.SHEAR]], "lk-plug");
  // keyway slot in the plug
  s += cutPoly([[-64, C.AXz - 8], [56, C.AXz - 8], [56, C.AXz + 10], [-64, C.AXz + 10]], "lk-keyway");
  for (const x of C.PIN_X) s += cutPoly([[x - 3.6, C.AXz + 10], [x + 3.6, C.AXz + 10], [x + 3.6, C.SHEAR], [x - 3.6, C.SHEAR]], "lk-bore");
  // tailpiece cam at the back end turns with the plug
  const F = Xf([0, 0, C.AXz]);
  const cam = G.prismOf(G.frameOf([-72, 0, C.AXz], [1, 0, 0], [0, 1, 0], [0, 0, 1]), [[-4, -14], [4, -14], [4, 14], [-4, 14]].map(([y, z]) => [y * Math.cos(turn) - z * Math.sin(turn), y * Math.sin(turn) + z * Math.cos(turn)]), 0, 6, P);
  return s + MAT("steel", S(cam)) + MAT("brass", lineSvg(G.circleOf(F, -64, C.PLUG_R, P), { tone: "hi" }));
}
`;

export function figure(theme) {
  const C = { KEY_TOP, AXz: AX.z, PLUG_R, SHEAR: PLUG_TOP, PIN_X, TRUE: KEY_TRUE, DEPTH: DEPTH_MM, TOWER_TOP: AX.z + SHELL_R + 42 };
  const B = new Function("G", "P", "C", "solidSvg", "lineSvg", "iso", "pathOf", `${LIVE}; return { keySvg, pinsSvg, plugSvg };`)(G, P, C, k.solidSvg, k.lineSvg, k.iso, k.pathOf);

  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "lk-svg",
    label: "A brass pin-tumbler lock cut in half along its length on a walnut block. Five pin stacks of key pin, driver pin and spring sit across the line between the fixed shell and the turning plug. A key slides into the plug and lifts each pin stack.",
    body: [
      plinth(),
      `<g data-part="plug" data-name="Plug">${B.plugSvg(0)}</g>`,
      shellBack(),
      `<g data-part="pins">${B.pinsSvg(0, KEY_TRUE, 0).svg}</g>`,
      `<g data-part="key" data-name="Key">${B.keySvg(0, KEY_TRUE, 0)}</g>`,
      `<path class="lk-shear" d="${k.pathOf([at([-64, 0.6, PLUG_TOP]), at([56, 0.6, PLUG_TOP])])}" data-name="Shear line"/>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 5", title: "Pin-tumbler lock", hint: "Drag the key in · tap a pin", readout: "Key out", body: `<div class="iso-stage lk-stage" tabindex="0" role="slider" aria-label="Key insertion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}</div>` });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="lk-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#e7b84a"/><line x1="0" y1="0" x2="0" y2="4" stroke="#b9862a" stroke-width="1"/></pattern></defs></svg>`;
  const css = `
.lk-cut{fill:url(#lk-hatch);stroke:#8a5f14;stroke-width:.5;vector-effect:non-scaling-stroke}
.lk-plug{fill:#f0c766;stroke:#8a5f14;stroke-width:.5}
.lk-keyway{fill:#3a2c18}
.lk-bore{fill:#2e2a24}
.lk-pin{fill:var(--anatomy-top);stroke:var(--anatomy-hi);stroke-width:.5}
.lk-spring{fill:none;stroke:var(--anatomy-hi);stroke-width:.8}
.lk-key{fill:#d7dde4;stroke:#5b6675;stroke-width:.6}
.lk-key-side{fill:#9aa6b4}
.lk-shear{fill:none;stroke:#ff3b5c;stroke-width:1;stroke-dasharray:3 2}
.lk-ok{fill:#3dff8f;filter:drop-shadow(0 0 2px #3dff8f)}
${materialsCss(["walnut", "brass", "darksteel", "steel", "chrome"])}
`;
  const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
const WRONG = ${JSON.stringify(KEY_WRONG)};
${LIVE}
const stage = document.querySelector(".lk-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { key: q("key"), pins: q("pins"), plug: q("plug") };
const readout = document.querySelector("[data-readout]");
let ins = 0, target = 0, turn = 0, turnTarget = 0, last = 0, frame = 0, keyMode = "right", tour = true, tourT = 0;
const cuts = () => (keyMode === "right" ? C.TRUE : WRONG);
function draw() {
  const pins = pinsSvg(ins, cuts(), turn);
  el.pins.innerHTML = pins.svg;
  el.key.innerHTML = keySvg(ins, cuts(), turn);
  el.plug.innerHTML = plugSvg(turn);
  const open = pins.allSet && ins > 0.995;
  const state = ins < 0.02 ? "Key out" : !open ? (ins < 0.995 ? "Inserting…" : "Pins not aligned — locked") : turn > 1.2 ? "Unlocked" : "Pins aligned — turn";
  if (readout.textContent !== state) readout.textContent = state;
  stage.setAttribute("aria-valuenow", String(Math.round(ins * 100)));
  Lab.gauge("state", state.split(" —")[0], open);
  Lab.gauge("insert", Math.round(ins * 100) + " %");
  Lab.gauge("aligned", pins.svg.split("lk-ok").length - 1 + " / 5");
  Lab.gauge("bitting", cuts().join("-"));
  Lab.gauge("combos", (10 ** 5).toLocaleString());
  Lab.gauge("turn", Math.round(turn * 57.3) + "°");
  return open;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  if (tour && !Lab.reduced.matches) {
    tourT += dt;
    const c = tourT % 7;
    target = c < 2.6 ? c / 2.6 : c < 5.6 ? 1 : 1 - (c - 5.6) / 1.4;
  }
  ins += (target - ins) * (1 - Math.exp(-dt / 0.18));
  const open = draw();
  turnTarget = open && (tour ? (tourT % 7) > 3.4 && (tourT % 7) < 5.2 : Lab.value("turn") > 0) ? Math.PI / 2 : 0;
  turn += (turnTarget - turn) * (1 - Math.exp(-dt / 0.2));
  frame = requestAnimationFrame(tick);
}
let drag = null;
stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, ins: target }; });
stage.addEventListener("pointermove", (e) => { if (!drag) return; if (Math.abs(e.clientX - drag.x) < 6 && tour) return; tour = false; const w = stage.getBoundingClientRect().width; target = Math.min(1, Math.max(0, drag.ins + (e.clientX - drag.x) / (w * 0.6))); try { stage.setPointerCapture(e.pointerId); } catch (_) {} });
stage.addEventListener("pointerup", () => { drag = null; });
stage.addEventListener("pointercancel", () => { drag = null; });
Lab.onMode((m) => { keyMode = m; tour = true; tourT = 0; });
Lab.onAction((id) => { tour = false; if (id === "insert") target = 1; if (id === "remove") { target = 0; Lab.set("turn", 0); } if (id === "turnkey") Lab.set("turn", Lab.value("turn") ? 0 : 1); });
Lab.onStep((i, s, user) => { if (user) { tour = false; if (s.ins !== undefined) target = s.ins; if (s.key) { keyMode = s.key; Lab.setMode(s.key, true); } } });
document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
frame = requestAnimationFrame(tick);
`;
  return { plate: defs + plate, css, script: kitScript() + latheScript() + live };
}
