// The water cycle on an island diorama. A heightmap of voxel columns rises from the sea to a
// mountain; the block is cut so its front faces show topsoil, an aquifer and bedrock. The Sun
// drives evaporation (Clausius–Clapeyron), wind carries clouds inland, air forced up the
// mountain cools and rains (or snows above the freezing level), and rivers and groundwater
// carry the water back to the sea.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { kitScript, latheScript } from "../../lab/inline.mjs";
import { materialsCss, mat } from "../../lab/materials.mjs";

export const WIDTH = 600;
export const HEIGHT = 520;

const CELL = 20, NX = 16, NY = 11;
const X0 = -160, Y0 = -110;
const SEA = 18; // sea level
const BOTTOM = -70;
const PEAK = [-90, -40];

function heightAt(x, y) {
  const d = Math.hypot((x - PEAK[0]) / 1.1, y - PEAK[1]);
  const mountain = 150 * Math.exp(-((d / 70) ** 2));
  const plain = 34 * Math.exp(-(((x + 20) / 120) ** 2)) * Math.exp(-((y / 140) ** 2));
  const shelf = Math.max(0, 1 - Math.max(0, x - 40) / 90);
  return Math.max(2, (mountain + plain + 6) * shelf);
}

const P = k.fitProjection([[X0, Y0, BOTTOM], [X0 + NX * CELL, Y0, BOTTOM], [X0, Y0 + NY * CELL, BOTTOM], [X0 + NX * CELL, Y0 + NY * CELL, BOTTOM], [PEAK[0], PEAK[1], 260], [140, -80, 280]], WIDTH, HEIGHT, { pad: 12, azimuth: 45, elevation: 30 });
const S = (p, st = { tone: "hi" }) => k.solidSvg(p, st);
const Ln = (d, st = { tone: "mid" }) => k.lineSvg(d, st);
const at = (p) => k.iso(p, P);

function terrain() {
  // columns back to front; each column's top material depends on height
  const cols = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x = X0 + i * CELL, y = Y0 + j * CELL;
    const h = Math.round(heightAt(x + CELL / 2, y + CELL / 2) / 4) * 4;
    cols.push({ x, y, h, depth: k.depthOf([x + CELL / 2, y + CELL / 2, 0], P) });
  }
  cols.sort((a, b) => a.depth - b.depth);
  let s = "";
  // the cut block: bedrock, aquifer and soil bands under everything
  const plan = { x: X0, y: Y0, w: NX * CELL, d: NY * CELL, r: 0 };
  s += `<path class="iso-halo" d="${k.haloOf(plan, BOTTOM, 10, P)}"/>`;
  s += `<g data-name="Bedrock">${mat("rock", S(k.slabOf(plan, BOTTOM, 40, P, 2, 0.5)))}</g>`;
  s += `<g data-name="Aquifer">${mat("sand", S(k.slabOf(plan, BOTTOM + 40, 18, P, 2, 0.3)))}</g>`;
  s += `<g data-name="Soil">${mat("soil", S(k.slabOf(plan, BOTTOM + 58, -BOTTOM - 58, P, 2, 0.3)))}</g>`;
  s += `<path data-part="gw" class="wc-gw" d="${k.pathOf([at([X0 + 20, Y0 + NY * CELL + 0.2, BOTTOM + 49]), at([X0 + NX * CELL - 10, Y0 + NY * CELL + 0.2, BOTTOM + 49])])}${k.pathOf([at([X0 + NX * CELL + 0.2, Y0 + 20, BOTTOM + 49]), at([X0 + NX * CELL + 0.2, Y0 + NY * CELL - 10, BOTTOM + 49])])}"/>`;
  s += `<g data-name="Ocean">${'<g class="wc-water">' + mat("water", S(k.slabOf(plan, 0, SEA, P, 2, 0.3), { tone: "hi", crease: "none" })) + "</g>"}<g data-part="waves"></g></g>`;
  for (const c of cols) {
    if (c.h <= SEA - 2) continue;
    const material = c.h > 120 ? "white" : c.h > 86 ? "rock" : c.h > SEA + 6 ? "leaf" : "sand";
    s += mat(material, S(k.slabOf({ x: c.x, y: c.y, w: CELL, d: CELL, r: 0 }, SEA - 1, c.h - SEA + 1, P, 2, 0.4), { tone: "hi", crease: "faint" }));
  }
  // a few trees on the plain
  const trees = [[-10, 20], [10, -30], [-40, 50], [20, 60], [-60, 10], [0, -60]];
  let t = "";
  for (const [x, y] of trees) {
    const h = heightAt(x, y);
    if (h < SEA + 8) continue;
    const base = Math.round(h / 4) * 4;
    t += mat("bark", S(k.cylinder(x, y, 1.6, base, 8, P, 10))) + mat("leaf", S(G.sphereOf([x, y, base + 13], 7, P)));
  }
  s += `<g data-name="Forest">${t}</g>`;
  return s;
}

// a river path down the mountain to the sea (follows the steepest descent roughly)
function riverPath() {
  const pts = [];
  let x = PEAK[0] + 26, y = PEAK[1] + 18;
  for (let i = 0; i < 40; i++) {
    const h = heightAt(x, y);
    pts.push([x, y, Math.round(h / 4) * 4 + 0.6]);
    if (h < SEA) break;
    // step mostly toward the sea (+x) and down-slope
    let best = null;
    for (let a = -1.2; a <= 1.2; a += 0.3) { const nx = x + 8 * Math.cos(a), ny = y + 8 * Math.sin(a); const nh = heightAt(nx, ny) - a * 0; if (!best || nh < best.h) best = { x: nx, y: ny, h: nh }; }
    x = best.x; y = best.y;
  }
  return pts;
}

export function figure(theme) {
  const river = riverPath();
  const C = { X0, Y0, NX, NY, CELL, SEA, PEAK };
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "wc-svg",
    label: "An island diorama cut away to show its layers. The Sun shines on the sea; vapour rises and forms clouds that drift inland, rain or snow on the mountain, and rivers and groundwater flow back to the sea.",
    body: [
      terrain(),
      `<path class="wc-river" data-name="River" d="${k.pathOf(river.map(at))}"/>`,
      `<g data-part="vapour"></g>`,
      `<circle class="wc-sunglow" cx="${at([150, -90, 280])[0]}" cy="${at([150, -90, 280])[1]}" r="60"/><circle data-name="Sun" class="wc-sun" cx="${at([150, -90, 280])[0]}" cy="${at([150, -90, 280])[1]}" r="20"/>`,
      `<g data-part="clouds"></g>`,
      `<g data-part="rain"></g>`,
      `<path data-part="snowline" class="wc-snowline" d=""/>`,
    ],
  });
  const plate = k.plateHtml({ fig: "Fig 10", title: "Water cycle", hint: "Warm the Sun · blow the wind", readout: "", body: `<div class="iso-stage wc-stage" tabindex="0" role="img" aria-label="Water cycle diorama">${svg}</div>` });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="wc-sun"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#ffd35a"/><stop offset="1" stop-color="#ff9a1f"/></radialGradient>
<radialGradient id="wc-glow"><stop offset="0" stop-color="#ffd35a" stop-opacity=".5"/><stop offset="1" stop-color="#ffb02e" stop-opacity="0"/></radialGradient>
<radialGradient id="wc-cloud" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef2f8"/><stop offset="1" stop-color="#b9c4d6"/></radialGradient>
<radialGradient id="wc-storm" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#d7dde8"/><stop offset=".7" stop-color="#9aa6ba"/><stop offset="1" stop-color="#6b778c"/></radialGradient>
</defs></svg>`;
  const css = `
.wc-water{opacity:.82}
.wc-wave{fill:none;stroke:#ffffff;stroke-width:.7;opacity:.5;stroke-linecap:round}
.wc-river{fill:none;stroke:#3fa9f5;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:6 4;animation:wc-flow 1s linear infinite}
.wc-gw{fill:none;stroke:#3fa9f5;stroke-width:1.4;stroke-dasharray:3 5;opacity:.85;animation:wc-flow 2.4s linear infinite}
@keyframes wc-flow{to{stroke-dashoffset:-20}}
.wc-sun{fill:url(#wc-sun);filter:drop-shadow(0 0 6px #ffb02e)}
.wc-sunglow{fill:url(#wc-glow)}
.wc-vap{fill:#bfe6ff}
.wc-cloud{fill:url(#wc-cloud)}
.wc-cloud.storm{fill:url(#wc-storm)}
.wc-drop{stroke:#5fb4f2;stroke-width:1;stroke-linecap:round;opacity:.85}
.wc-flake{fill:#ffffff;stroke:#9bb4d6;stroke-width:.3}
.wc-snowline{fill:none;stroke:#ffffff;stroke-width:1;stroke-dasharray:2 3;opacity:.8}
${materialsCss(["rock", "sand", "soil", "white", "leaf", "bark", "water"])}
`;
  const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
const heightAt = ${heightAt.toString()};
const PEAK = C.PEAK;
const stage = document.querySelector(".wc-stage");
const q = (n) => stage.querySelector('[data-part="' + n + '"]');
const el = { vap: q("vapour"), clouds: q("clouds"), rain: q("rain"), waves: q("waves"), snow: q("snowline") };
const readout = document.querySelector("[data-readout]");
const es = (T) => 6.112 * Math.exp((17.67 * T) / (T + 243.5)); // saturation vapour pressure, hPa
let t = 0, last = 0, frame = 0;
const clouds = [{ x: 150, y: -30, m: 0.3 }, { x: 60, y: 40, m: 0.5 }, { x: -30, y: -60, m: 0.7 }];
function cloudSvg(c, storm) {
  const s = 10 + c.m * 16, z = 200 + c.m * 20;
  let out = "";
  const puffs = [[0, 0, 1], [-0.9, 0.2, 0.75], [0.9, 0.1, 0.8], [-0.4, -0.6, 0.7], [0.5, -0.5, 0.7], [0, 0.5, 0.7]];
  for (const [dx, dy, r] of puffs) { const p = iso([c.x + dx * s * 1.4, c.y + dy * s, z + r * s * 0.6], P); out += '<circle class="wc-cloud' + (storm ? " storm" : "") + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * s * P.scale * 1.27) + '"/>'; }
  return out;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (Lab.paused) { frame = 0; return; }
  const T = Lab.value("temp"), wind = Lab.value("wind");
  const evap = (es(T) / es(20)) * 1.0; // relative evaporation rate
  if (!Lab.reduced.matches) t += dt;
  // evaporation: faint vapour rising over the sea
  let v = "";
  const n = Math.round(10 + evap * 14);
  for (let i = 0; i < n; i++) { const f = (t * 0.25 * (0.6 + evap * 0.4) + i * 0.173) % 1; const x = 60 + ((i * 37) % 90), y = -100 + ((i * 53) % 200); const p = iso([x, y, C.SEA + f * 170], P); v += '<circle class="wc-vap" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (1.2 + f * 1.6) + '" opacity="' + (0.55 * (1 - f)) + '"/>'; }
  el.vap.innerHTML = v;
  // waves
  let w = "";
  for (let i = 0; i < 6; i++) { const x = 70 + ((i * 41) % 80), y = -90 + ((i * 67) % 180), ph = t * 1.5 + i; w += '<path class="wc-wave" d="' + pathOf([iso([x, y + 2 * Math.sin(ph), C.SEA + 0.2], P), iso([x + 12, y + 2 * Math.sin(ph + 1), C.SEA + 0.2], P)]) + '"/>'; }
  el.waves.innerHTML = w;
  // clouds: gain moisture over the sea, drift inland with the wind, rain over the mountain
  let cs = "", rain = "", raining = 0, rainRate = 0;
  const freezeZ = Math.max(0, (T / 6.5) * 60); // freezing level in model units: 6.5 °C per km, 1 km = 60 units
  for (const c of clouds) {
    if (!Lab.reduced.matches) c.x -= wind * 9 * dt;
    if (c.x > 40) c.m = Math.min(1.4, c.m + evap * 0.06 * dt);
    const ground = heightAt(c.x, c.y);
    const lift = ground > 60; // orographic lift over high ground
    const storm = c.m > 0.9 && lift;
    if (storm || (c.m > 1.2)) {
      raining++;
      const rate = Math.min(1, c.m - 0.6);
      rainRate += rate * (2 + T * 0.25);
      c.m = Math.max(0.2, c.m - rate * 0.12 * dt);
      for (let i = 0; i < 14; i++) {
        const f = (t * 2.2 + i * 0.071) % 1, px = c.x + ((i * 13) % 30) - 15, py = c.y + ((i * 7) % 20) - 10;
        const zTop = 200, zBot = Math.max(C.SEA, heightAt(px, py));
        const z = zTop - f * (zTop - zBot);
        const snow = zBot > freezeZ || z > freezeZ + 20;
        if (snow) { const p = iso([px, py, z], P); rain += '<circle class="wc-flake" cx="' + p[0] + '" cy="' + p[1] + '" r="1.3"/>'; }
        else rain += '<path class="wc-drop" d="' + pathOf([iso([px, py, z], P), iso([px - wind * 1.2, py, z - 7], P)]) + '"/>';
      }
    }
    if (c.x < -170) { c.x = 160; c.y = -80 + Math.random() * 160; c.m = 0.2; }
    cs += cloudSvg(c, storm);
  }
  el.clouds.innerHTML = cs; el.rain.innerHTML = rain;
  // snowline: a dashed contour round the mountain at the freezing level
  const pts = [];
  if (freezeZ < 150) for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; let r = 0; for (let rr = 0; rr < 120; rr += 2) { if (heightAt(PEAK[0] + rr * 1.1 * Math.cos(a), PEAK[1] + rr * Math.sin(a)) < freezeZ) { r = rr; break; } } pts.push(iso([PEAK[0] + r * 1.1 * Math.cos(a), PEAK[1] + r * Math.sin(a), freezeZ + 1], P)); }
  el.snow.setAttribute("d", pts.length ? pathOf(pts, true) : "");
  const txt = T.toFixed(0) + " °C · " + (raining ? "raining" : "dry");
  if (readout.textContent !== txt) readout.textContent = txt;
  Lab.gauge("es", es(T).toFixed(1) + " hPa");
  Lab.gauge("evap", "×" + evap.toFixed(2), evap > 1.6);
  Lab.gauge("rain", rainRate.toFixed(1) + " mm/h");
  Lab.gauge("freeze", (T > 0 ? (T / 6.5).toFixed(1) : "0.0") + " km");
  Lab.gauge("clouds", Math.round((clouds.reduce((a, c) => a + Math.min(1, c.m), 0) / 3) * 100) + " %");
  Lab.gauge("residence", "≈ 9 days");
  frame = requestAnimationFrame(tick);
}
Lab.onStep((i, s, user) => { if (user) { if (s.temp !== undefined) Lab.set("temp", s.temp); if (s.wind !== undefined) Lab.set("wind", s.wind); } });
document.addEventListener("lab-pause", (e) => { if (!e.detail && !frame) { last = 0; frame = requestAnimationFrame(tick); } });
frame = requestAnimationFrame(tick);
`;
  return { plate: defs + plate, css, script: kitScript() + latheScript() + live };
}
