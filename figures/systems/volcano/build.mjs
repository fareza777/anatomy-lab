// A stratovolcano as a voxel diorama, cut in half through the summit. The cut face shows the
// alternating layers of lava and ash that build the cone, the conduit and the magma chamber
// below. The eruption style follows the magma: runny basalt fountains and flows, sticky
// gas-rich rhyolite blasts a towering ash column.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 560;
export const HEIGHT = 500;

const CELL = 16, NX = 18, NY = 6;
const X0 = -(NX * CELL) / 2, Y0 = -NY * CELL; // back half only: y from -96 to 0
const GROUND = 16, BOTTOM = -110;
const height = (x, y) => {
  const d = Math.hypot(x, y);
  let h = GROUND + Math.max(0, 150 - 1.08 * d);
  if (d < 22) h -= (22 - d) * 1.5; // the crater
  h += Math.sin(x * 0.11 + y * 0.07) * 4 + Math.cos(x * 0.05 - y * 0.13) * 3;
  return Math.max(GROUND, Math.round(h / 4) * 4);
};
const COLS = [];
for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const x = X0 + i * CELL, y = Y0 + j * CELL; COLS.push({ x, y, h: height(x + CELL / 2, y + CELL / 2) }); }
const CHAMBER = { x: 0, z: -66, rx: 70, rz: 24 };
const CRATER_Z = Math.min(...COLS.filter((c) => Math.abs(c.x + CELL / 2) < 12 && c.y + CELL === 0).map((c) => c.h));

const P = k.fitProjection([[X0, Y0, BOTTOM], [-X0, Y0, BOTTOM], [X0, 0, BOTTOM], [-X0, 0, BOTTOM], [0, -40, 330], [X0, Y0, 60], [-X0, 0, 60]], WIDTH, HEIGHT, { pad: 14, azimuth: 72, elevation: 24 });
const H = helpers(P);
const { MAT, S, slab, named, poly } = H;

function block() {
  // bedrock under the whole diorama
  return named("Bedrock", MAT("rock", S(k.slabOf({ x: X0, y: Y0, w: NX * CELL, d: NY * CELL, r: 0 }, BOTTOM, GROUND - BOTTOM, P, 2, 0.6), { tone: "hi", crease: "none" })));
}

function columns() {
  const order = [...COLS].sort((a, b) => k.depthOf([a.x, a.y, 0], P) - k.depthOf([b.x, b.y, 0], P));
  let s = "";
  for (const c of order) {
    if (c.h <= GROUND) continue;
    const top = c.h > 130 ? "white" : c.h > 96 ? "rock" : c.h > 50 ? "bark" : "leaf";
    s += MAT(top === "white" ? "rock" : top, slab(c.x, c.y, CELL, CELL, GROUND, c.h - GROUND - 3, 0.5, 0.2)) + MAT(top, slab(c.x, c.y, CELL, CELL, c.h - 3, 3, 0.5, 0.2));
  }
  return named("Volcano cone", s);
}

function trees() {
  let s = "";
  for (const c of COLS) if (c.h > GROUND + 4 && c.h < 44 && (c.x * 7 + c.y * 3) % 5 === 0) s += MAT("bark", H.cyl(c.x + 8, c.y + 8, 1.2, c.h, 6, 8)) + MAT("leaf", S(G.solidOf([[c.h + 4, 5], [c.h + 16, 0.5]], H.Zf([c.x + 8, c.y + 8, 0]), P)));
  return named("Forest", s);
}

// the cut face at y = 0: strata in each column, then the plumbing
function cutFace() {
  let s = "";
  const row = COLS.filter((c) => c.y + CELL === 0);
  for (const c of row) {
    const xc = Math.abs(c.x + CELL / 2);
    // below ground: flat bedrock layers
    for (let z = BOTTOM; z < GROUND; z += 18) s += poly([[c.x, 0.2, z], [c.x + CELL, 0.2, z], [c.x + CELL, 0.2, Math.min(GROUND, z + 18)], [c.x, 0.2, Math.min(GROUND, z + 18)]], "vo-bed vo-bed" + (Math.floor((z - BOTTOM) / 18) % 3));
    // the cone: layers that dip outward like the slopes
    const off = 0.42 * xc, BAND = 17;
    let z = GROUND;
    while (z < c.h) {
      const band = Math.floor((z + off) / BAND), next = Math.min(c.h, band * BAND + BAND - off);
      s += poly([[c.x, 0.25, z], [c.x + CELL, 0.25, z], [c.x + CELL, 0.25, next], [c.x, 0.25, next]], band % 2 ? "vo-lava" : "vo-ash");
      z = next;
    }
  }
  // magma chamber, conduit and a side dyke and sill
  const ell = Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2; return [CHAMBER.x + CHAMBER.rx * Math.cos(a), 0.4, CHAMBER.z + CHAMBER.rz * Math.sin(a)]; });
  s += `<g data-name="Magma chamber">${poly(ell, "vo-magma")}</g>`;
  s += `<g data-name="Conduit">${poly([[-5, 0.4, CHAMBER.z + CHAMBER.rz - 4], [5, 0.4, CHAMBER.z + CHAMBER.rz - 4], [5, 0.4, CRATER_Z], [-5, 0.4, CRATER_Z]], "vo-magma")}</g>`;
  s += `<g data-name="Dyke">${poly([[20, 0.4, -40], [26, 0.4, -40], [62, 0.4, 70], [57, 0.4, 72]], "vo-magma vo-dim")}</g>`;
  s += `<g data-name="Sill">${poly([[-60, 0.4, 8], [-12, 0.4, 8], [-12, 0.4, 12], [-60, 0.4, 13]], "vo-magma vo-dim")}</g>`;
  return named("Cut face", s);
}

const LIVE = `
const CX = 0, CY = -6;
// steepest-descent lava path from the crater down the left flank
const PATH = (() => { const pts = [[CX, CY, C.CRATER_Z + 2]]; for (let i = 1; i <= 9; i++) { const x = CX - i * 14, y = CY - i * 4.5; pts.push([x, y, C.HEIGHT_AT(x, y) + 1]); } return pts; })();
const puffs = Array.from({ length: 46 }, (_, i) => ({ f: Math.random(), a: Math.random() * TAU, s: 0.6 + Math.random() * 0.8, i }));
const bombs = Array.from({ length: 30 }, () => ({ t: Math.random(), vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.2, v: 0.7 + Math.random() * 0.6 }));
let t = 0, flash = 0;
function frame(dt, now) {
  const m = magma(Lab.value("silica"), Lab.value("gas"));
  if (!Lab.reduced.matches) t += dt;
  const glow = clamp(0.4 + (m.tempC - 850) / 700, 0.3, 1);
  document.body.style.setProperty("--vo-glow", glow.toFixed(2));
  let s = "";
  const top = C.CRATER_Z;
  if (m.style === "Hawaiian" || m.style === "Strombolian") {
    // fountains and bursts: incandescent clots thrown up and falling back
    const hgt = m.style === "Hawaiian" ? 50 : 30 + Lab.value("gas") * 10;
    for (const b of bombs) {
      if (!Lab.reduced.matches) b.t = (b.t + dt * b.v * (m.style === "Strombolian" ? 0.9 : 0.6)) % 1;
      const u = b.t, z = top + hgt * 4 * u * (1 - u), x = CX + b.vx * u * (m.style === "Strombolian" ? 60 : 24), y = CY + b.vy * u * 30;
      s += dot([x, y, z], m.style === "Hawaiian" ? 2.4 : 1.8, "vo-bomb");
    }
    // a lava flow down the flank; longer for runnier lava
    const reach = clamp(m.lava / 2, 0.15, 1);
    const n = Math.max(2, Math.round(PATH.length * reach));
    s += line3(PATH.slice(0, n), "vo-flow") + line3(PATH.slice(0, n), "vo-flow-core");
  }
  if (m.style === "Lava dome") {
    s += MAT("rock", S(G.solidOf([[top, 16], [top + 10, 12], [top + 16, 4]], Zf([CX, CY, 0]), P))) + '<g class="vo-crack">' + line3([[CX - 8, CY + 10, top + 6], [CX + 2, CY + 14, top + 12], [CX + 8, CY + 11, top + 5]], "vo-flow-core") + "</g>";
    for (let i = 0; i < 6; i++) { const f = (t * 0.2 + i / 6) % 1; s += ellipse3([CX + Math.sin(i) * 6, CY, top + 18 + f * 60], 6 + f * 14, 4 + f * 8, "vo-steam", "opacity:" + (0.6 * (1 - f)).toFixed(2)); }
  }
  if (m.explosive) {
    // an eruption column: puffs rising to the plume height, then spreading as an umbrella
    const colTop = top + clamp(m.plumeKm / 45, 0.12, 1) * 170;
    for (const p of puffs) {
      if (!Lab.reduced.matches) p.f = (p.f + dt * 0.12 * (m.style === "Plinian" ? 1.3 : 0.8)) % 1;
      const z = mix(top, colTop, Math.min(1, p.f * 1.25));
      const spread = p.f > 0.8 ? (p.f - 0.8) * 5 : 0;
      const r = (6 + p.f * 26) * p.s * (m.style === "Plinian" ? 1.3 : 1);
      const x = CX + Math.cos(p.a) * (p.f * 18 + spread * 90), y = CY + Math.sin(p.a) * (p.f * 8 + spread * 30);
      s += ellipse3([x, y, z], f1(r), f1(r * 0.8), "vo-ash" + (p.i % 3), "opacity:" + (0.85 - spread * 0.5).toFixed(2));
    }
    if (m.style === "Plinian") {
      // pyroclastic flows racing down the flanks and lightning in the column
      for (let i = 0; i < 8; i++) { const f = (t * 0.35 + i / 8) % 1, side = i % 2 ? 1 : -1; const x = CX + side * f * 120, z = C.HEIGHT_AT(x, -30) + 6; s += ellipse3([x, -30, z], f1(10 + f * 10), f1(6 + f * 5), "vo-ash1", "opacity:" + (0.9 * (1 - f)).toFixed(2)); }
      if (Math.random() < dt * 1.2) flash = 0.15;
      if (flash > 0) { flash -= dt; const x0 = CX + (Math.random() - 0.5) * 30; s += line3([[x0, CY, colTop - 10], [x0 + 6, CY, colTop - 40], [x0 - 4, CY, colTop - 60], [x0 + 8, CY, colTop - 90]], "vo-bolt"); }
    }
    for (let i = 0; i < 30; i++) { const f = (t * 0.3 + i / 30) % 1; s += dot([CX + 60 + (i % 7) * 12 - 40, CY - 20 + (i % 3) * 8, colTop - f * (colTop - 60)], 0.9, "vo-fall"); }
  }
  setHtml(part("erupt"), s);
  const eta = m.logEta;
  Lab.gauge("temp", Math.round(m.tempC).toLocaleString("en-US") + " °C");
  Lab.gauge("eta", "10^" + eta.toFixed(1) + " Pa·s");
  Lab.gauge("style", m.style, m.explosive);
  Lab.gauge("plume", m.plumeKm.toFixed(1) + " km", m.plumeKm > 20);
  Lab.gauge("mer", m.mer.toExponential(1).replace("e+", " × 10^") + " kg/s");
  Lab.gauge("vei", "VEI " + m.vei, m.vei >= 4);
  readout(m.style + " · " + Lab.value("silica") + " % silica");
}
Lab.onStep((i, s, user) => { if (user) { if (s.silica !== undefined) Lab.set("silica", s.silica); if (s.gas !== undefined) Lab.set("gas", s.gas); } });
loop(frame);
`;

export function figure(theme) {
  const C = { CRATER_Z };
  // the page reuses the same terrain function to put lava and ash on the slopes
  const live = LIVE.replace(/C\.HEIGHT_AT/g, "HEIGHT_AT");
  const heightSrc = `const GROUND = ${GROUND};\nconst HEIGHT_AT = ${height.toString()};\n`;
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "vo-svg",
    label: "A voxel stratovolcano cut in half through its summit. The cut face shows alternating layers of dark lava and pale ash sloping outward, a vertical conduit of glowing magma rising from a large magma chamber underground, a side dyke and a sill. Forest covers the lower slopes and snow the top.",
    body: [block(), columns(), trees(), cutFace(), `<g data-part="erupt" data-name="Eruption"></g>`],
  });
  const plate = k.plateHtml({ fig: "Fig 18", title: "Stratovolcano", hint: "Change the magma", readout: "", body: `<div class="iso-stage vo-stage" tabindex="0" role="img" aria-label="Volcano">${svg}</div>` });
  const css = `
.vo-bed{stroke:#00000022;stroke-width:.3}
.vo-bed0{fill:#6e6a62}.vo-bed1{fill:#7c776d}.vo-bed2{fill:#625e57}
.vo-lava{fill:#4f4640;stroke:#00000022;stroke-width:.25}
.vo-ash{fill:#c9b48a;stroke:#00000022;stroke-width:.25}
body[data-theme="dark"] .vo-ash{fill:#a8946e}
.vo-magma{fill:#ff5a1f;filter:drop-shadow(0 0 3px #ff3d00);opacity:var(--vo-glow,.9);animation:vo-pulse 2.4s ease-in-out infinite alternate}
.vo-dim{opacity:calc(var(--vo-glow,.9) * .75)}
@keyframes vo-pulse{to{fill:#ffb02e}}
.vo-bomb{fill:#ffb02e;filter:drop-shadow(0 0 2px #ff5a00)}
.vo-flow{fill:none;stroke:#c2410c;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
.vo-flow-core{fill:none;stroke:#ffb02e;stroke-width:2.4;stroke-linecap:round;stroke-dasharray:6 5;animation:vo-run 1.4s linear infinite;filter:drop-shadow(0 0 2px #ff6a00)}
@keyframes vo-run{to{stroke-dashoffset:-22}}
.vo-ash0{fill:#8d8a86}.vo-ash1{fill:#a7a39d}.vo-ash2{fill:#76726d}
.vo-steam{fill:#f3f4f6}
.vo-fall{fill:#6b6863;opacity:.7}
.vo-bolt{fill:none;stroke:#fff6a8;stroke-width:1.6;filter:drop-shadow(0 0 3px #c9b8ff)}
${materialsCss(["rock", "leaf", "bark", "white"])}
`;
  return { plate, css, script: pageScript(P, C, heightSrc + modelSource + live) };
}
