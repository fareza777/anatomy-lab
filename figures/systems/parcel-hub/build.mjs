// Parcel mega-hub: inbound trailer and lift, a cross-belt sorter on a mezzanine with tipping
// trays and chutes, a ground-floor AMR fleet, packing and outbound trailers. The live layer
// runs the trays, falling parcels, induct stream, robots, tug and boxes, and draws the stage
// capacities on the panel below.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpers, pageScript, k, G } from "../../lab/fig.mjs";
import { materialsCss } from "../../lab/materials.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

export const WIDTH = 820;
export const HEIGHT = 520;

const SORTER = { cx: -75, cy: -62, rx: 185, ry: 56, z: 64 };
const DECK = { x: -290, y: -132, w: 462, d: 144, z: 44 };
const CHUTE_ANGLES = [18, 42, 66, 90, 114, 138, 162];
const LOOP = [];
for (let i = 0; i <= 96; i++) {
  const a = (i / 96) * Math.PI * 2;
  LOOP.push([SORTER.cx + SORTER.rx * Math.cos(a), SORTER.cy + SORTER.ry * Math.sin(a), 62]);
}
const CHUTES = CHUTE_ANGLES.map((deg) => {
  const a = (deg * Math.PI) / 180;
  const sx = SORTER.cx + SORTER.rx * Math.cos(a);
  const sy = SORTER.cy + SORTER.ry * Math.sin(a);
  return { a, deg, sx, sy, path: [[sx, sy, 60], [sx, sy + 10, 48], [sx, 36, 12]] };
});
const IND = [[-330, 26, 16], [-330, 6, 16], [-304, -6, 16], [-304, -6, 52], [-288, -28, 54], [-262, -58, 62]];
const TUG = [[-250, 146, 1], [300, 146, 1]];
const PACK = { x: 104, y: 58 };

const P = k.fitProjection([
  [-378, -168, 0], [378, 168, 0], [378, -168, 0], [-378, 168, 0],
  [-352, 18, 48], [356, 120, 48], [-300, -140, 76], [176, -140, 76],
  [-262, -58, 74], [102, 42, 70], [356, 90, 76], [-260, 146, 30],
], WIDTH, HEIGHT, { pad: 14, azimuth: 60, elevation: 26 });

const H = helpers(P);
const { MAT, S, Ln, at, slab, cyl, named, line3, dot, tube, along, poly, clamp } = H;

const TONES = ["wood", "cream", "orange", "teal", "red", "green", "blue"];

function parcel(x, y, z, w, d, h, tone, cls) {
  let s = MAT(tone, slab(x - w / 2, y - d / 2, w, d, z, h, 0.6, 0.15), cls || "");
  s += line3([[x - w / 2 + 0.8, y, z + h + 0.05], [x + w / 2 - 0.8, y, z + h + 0.05]], "ph-tape");
  return s;
}

function ground() {
  let s = `<path class="iso-halo" d="${k.haloOf({ x: -374, y: -164, w: 748, d: 328, r: 18 }, -12, 12, P)}"/>`;
  s += named("Hub floor", MAT("floor", S(k.slabOf({ x: -372, y: -162, w: 744, d: 324, r: 18 }, -12, 12, P, 8, 1))));
  s += `<g class="ph-zone">${MAT("yellow", slab(-362, 4, 122, 138, -2, 2, 8, 0.2))}</g>`;
  s += `<g class="ph-zone ph-zone-blue">${MAT("blue", slab(74, 40, 132, 110, -2, 2, 8, 0.2))}</g>`;
  s += `<g class="ph-zone ph-zone-orange">${MAT("orange", slab(214, 8, 146, 148, -2, 2, 8, 0.2))}</g>`;
  for (let x = -330; x <= 330; x += 60) s += line3([[x, -154, 0.4], [x, 154, 0.4]], "ph-grid");
  for (let y = -140; y <= 140; y += 60) s += line3([[-360, y, 0.4], [360, y, 0.4]], "ph-grid");
  s += line3([[-356, 128, 0.6], [356, 128, 0.6]], "ph-aisle");
  s += line3([[-356, 124, 0.6], [356, 124, 0.6]], "ph-aisle");
  return s;
}

function shell() {
  let s = named("Hub wall", MAT("white", slab(-372, -164, 744, 6, 0, 66, 1, 0.2)));
  s += MAT("glass", slab(-366, -158, 732, 1.2, 40, 16, 0.3, 0.1));
  for (const x of [-358, -230, -100, 30, 160, 290, 358]) s += MAT("steel", slab(x - 3, -163, 6, 10, 0, 70, 1, 0.2));
  // high dock doors on the back wall
  for (const x of [-286, -120, 46]) {
    s += MAT("darksteel", slab(x, -157.5, 84, 4, 0, 34, 1, 0.2));
    for (let i = 0; i < 6; i++) s += line3([[x + 4, -156.2, 4 + i * 5], [x + 80, -156.2, 4 + i * 5]], "ph-door");
    s += MAT("yellow", slab(x, -156.5, 84, 1.6, 34, 2, 0.5, 0.1));
  }
  const t = at([-330, -156, 58]);
  s += `<text class="ph-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">HUB 7 · SORT</text>`;
  for (const [x, y] of [[-250, 30], [-100, 20], [40, 20], [180, 30], [300, 70]]) {
    s += line3([[x, y, 98], [x, y, 88]], "ph-lampwire");
    s += MAT("white", slab(x - 9, y - 3, 18, 6, 86, 2, 2, 0.3));
    s += MAT("yellow", slab(x - 8, y - 2, 16, 4, 85.4, 0.8, 2, 0.1), ' class="ph-lamp"');
  }
  return s;
}

function deck() {
  const { x, y, w, d, z } = DECK;
  let s = MAT("darksteel", slab(x, y, w, d, z, 6, 2, 0.3));
  s += MAT("alu", slab(x + 1, y + 1, w - 2, d - 2, z + 6, 1.6, 1, 0.2));
  s += MAT("yellow", slab(x, y + d - 3, w, 2.2, z + 6, 1.8, 0.6, 0.1));
  for (const [cx, cy] of [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + d - 10], [x + w - 8, y + d - 10], [x + w / 2, y + 8], [x + w / 2, y + d - 10]]) {
    s += MAT("steel", cyl(cx, cy, 4, 0, z, 10));
  }
  // rail along the open front edge
  for (let x2 = x + 6; x2 <= x + w - 6; x2 += 22) s += line3([[x2, y + d - 4, z + 6], [x2, y + d - 4, z + 18]], "ph-rail");
  s += line3([[x + 4, y + d - 4, z + 18], [x + w - 4, y + d - 4, z + 18]], "ph-rail");
  // stairs down at the left front
  for (let i = 0; i < 10; i++) {
    s += MAT("steel", slab(-286, 10 + i * 3.4, 16, 3.6, 0, 4.6 + (9 - i) * 4.2, 0.6, 0.1));
  }
  s += line3([[-270, 8, 6], [-270, 46, 6]], "ph-rail");
  return named("Sorter deck", s);
}

function sorter() {
  let s = "";
  s += line3(LOOP, "ph-track");
  const inner = LOOP.map(([x, y, z]) => [SORTER.cx + (x - SORTER.cx) * 0.9, SORTER.cy + (y - SORTER.cy) * 0.9, z]);
  s += line3(inner, "ph-track-in");
  for (let i = 0; i < LOOP.length - 1; i += 8) {
    const p = LOOP[i];
    s += line3([[p[0], p[1], 62], [p[0], p[1], 50]], "ph-leg");
  }
  for (const [sx, sy, sz] of [[SORTER.cx - SORTER.rx, SORTER.cy, SORTER.z], [SORTER.cx + SORTER.rx, SORTER.cy, SORTER.z], [SORTER.cx, SORTER.cy - SORTER.ry, SORTER.z]]) {
    s += MAT("steel", cyl(sx, sy, 3, 50, sz - 50, 12));
    s += MAT("yellow", cyl(sx, sy, 4, sz - 2, 2, 14));
  }
  // drive wheels with spokes
  for (const deg of [0, 60, 120, 180, 240, 300]) {
    const a = (deg * Math.PI) / 180;
    const sx = SORTER.cx + SORTER.rx * Math.cos(a), sy = SORTER.cy + SORTER.ry * Math.sin(a);
    s += MAT("rubber", cyl(sx, sy, 5, 60, 2, 16));
    s += MAT("chrome", cyl(sx, sy, 2, 62, 1, 10));
  }
  // control pulpit inside the loop
  const px = SORTER.cx, py = SORTER.cy - 6;
  s += MAT("darksteel", slab(px - 16, py - 10, 32, 20, 50, 8, 2, 0.2));
  s += MAT("white", slab(px - 14, py - 8, 28, 16, 58, 10, 1.5, 0.3));
  s += MAT("glass", slab(px - 12, py - 6, 24, 8, 68, 1.4, 0.5, 0.1));
  s += dot([px + 10, py - 6, 63], 1.2, "ph-led");
  s += '<g class="ph-trays" data-part="trays"></g>';
  return named("Cross-belt sorter", s);
}

function chutes() {
  let s = "";
  CHUTES.forEach((ch, i) => {
    const { sx, sy } = ch;
    const W = 8;
    s += `<path class="ph-chute" d="${k.pathOf([[sx - W / 2, sy, 60], [sx + W / 2, sy, 60], [sx + W / 2, 36, 12], [sx - W / 2, 36, 12]].map(at), true)}"/>`;
    s += line3([[sx - W / 2, sy, 60], [sx - W / 2, 36, 12]], "ph-chuteline");
    s += line3([[sx + W / 2, sy, 60], [sx + W / 2, 36, 12]], "ph-chuteline");
    s += line3([[sx - W / 2, 36, 12], [sx + W / 2, 36, 12]], "ph-chuteline");
    // cage
    const cx = sx, cy = 44;
    for (const [dx, dy] of [[-9, -7], [9, -7], [-9, 7], [9, 7]]) {
      s += MAT("steel", slab(cx + dx - 1, cy + dy - 1, 2, 2, 0, 17, 0.4, 0.1));
    }
    for (const dz of [17, 9]) {
      s += line3([[cx - 9, cy - 7, dz], [cx + 9, cy - 7, dz]], "ph-cage");
      s += line3([[cx - 9, cy + 7, dz], [cx + 9, cy + 7, dz]], "ph-cage");
      s += line3([[cx - 9, cy - 7, dz], [cx - 9, cy + 7, dz]], "ph-cage");
      s += line3([[cx + 9, cy - 7, dz], [cx + 9, cy + 7, dz]], "ph-cage");
    }
    s += MAT("rubber", cyl(cx - 6, cy + 7, 1.6, 0, 2, 8));
    s += MAT("rubber", cyl(cx + 6, cy + 7, 1.6, 0, 2, 8));
    for (let j = 0; j < 3; j++) s += parcel(cx - 5 + (j % 2) * 7, cy - 2 + (j % 2) * 6, 2 + j * 3.2, 6, 5, 3, TONES[(i + j) % 7]);
    s += dot([cx + 8, cy - 6, 18.5], 1.2, "ph-led");
    s += `<g data-part="chutefall${i}"></g>`;
  });
  return named("Chutes and cages", s);
}

function induct() {
  let s = "";
  // telescopic belt from the trailer to the lift
  s += MAT("darksteel", slab(-338, 4, 22, 12, 10, 4, 2, 0.2));
  for (let i = 0; i < 6; i++) s += MAT("steel", cyl(-334 + i * 3.2, 10, 1.8, 14, 1.4, 8));
  s += line3([[-330, 14, 16], [-330, 6, 16], [-304, -4, 16]], "ph-belt");
  // lift tower
  for (const dx of [-8, 8]) s += MAT("steel", slab(-312 + dx, -14, 4, 16, 0, 58, 1, 0.2));
  s += MAT("darksteel", slab(-314, -16, 20, 20, 58, 4, 1, 0.2));
  s += line3([[-304, -6, 58], [-304, -6, 30]], "ph-cable");
  s += '<g data-part="lift"></g>';
  // deck belt to the sorter
  s += MAT("darksteel", slab(-294, -46, 20, 44, 50, 4, 2, 0.2));
  for (let i = 0; i < 9; i++) s += MAT("steel", cyl(-288 + (i % 2) * 8, -42 + i * 4.4, 1.8, 54, 1.4, 8));
  s += line3([[-304, -6, 56], [-286, -26, 56], [-262, -58, 62]], "ph-belt");
  // scan arch
  s += MAT("steel", slab(-296, -34, 4, 4, 54, 20, 0.8, 0.1));
  s += MAT("steel", slab(-274, -34, 4, 4, 54, 20, 0.8, 0.1));
  s += MAT("darksteel", slab(-297, -35, 28, 5, 72, 4, 1, 0.1));
  s += line3([[-292, -32, 58], [-276, -32, 58]], "ph-scan");
  s += '<g data-part="inductparcels"></g>';
  return named("Induct", s);
}

function trailerIn() {
  let s = "";
  const x = -352, y = 14;
  s += MAT("white", slab(x, y, 44, 100, 8, 36, 2, 0.4));
  s += MAT("steel", slab(x - 1, y - 1, 46, 102, 6, 4, 2, 0.2));
  s += MAT("darksteel", slab(x + 2, y + 96, 40, 4, 8, 34, 1, 0.2));
  s += MAT("glass", slab(x + 4, y + 100, 36, 1.2, 24, 12, 0.5, 0.1));
  s += MAT("teal", slab(x + 2, y + 2, 10, 92, 30, 6, 1, 0.2));
  for (const wy of [28, 76]) for (const dx of [4, 34]) s += MAT("rubber", cyl(x + dx, y + wy, 5, 0, 8, 14));
  const t = at([x + 10, y + 80, 52]);
  s += `<text class="ph-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">INBOUND</text>`;
  return named("Inbound trailer", s);
}

function trailerOut() {
  let s = "";
  for (const y of [22, 86]) {
    const x = 254;
    s += MAT("white", slab(x, y, 100, 42, 8, 36, 2, 0.4));
    s += MAT("steel", slab(x - 1, y - 1, 102, 44, 6, 4, 2, 0.2));
    s += MAT("darksteel", slab(x + 96, y + 2, 4, 38, 8, 34, 1, 0.2));
    s += MAT("glass", slab(x + 2, y + 4, 1.2, 34, 24, 12, 0.5, 0.1));
    s += MAT("orange", slab(x + 2, y + 2, 90, 8, 30, 6, 1, 0.2));
    for (const wx of [20, 78]) for (const dy of [2, 40]) s += MAT("rubber", cyl(x + wx, y + dy, 5, 0, 8, 14));
  }
  const t = at([282, 26, 52]);
  s += `<text class="ph-sign" x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}">OUTBOUND</text>`;
  return named("Outbound trailers", s);
}

function racks() {
  let s = "";
  for (const y of [66, 96, 126]) {
    const x = -268;
    s += MAT("darksteel", slab(x, y, 112, 16, 0, 6, 1, 0.2));
    for (const dx of [0, 108]) s += MAT("steel", slab(x + dx, y - 1, 4, 18, 0, 38, 1, 0.2));
    for (const z of [10, 22, 34]) {
      s += MAT("steel", slab(x + 2, y + 1, 108, 14, z, 1.6, 0.5, 0.1));
      for (let i = 0; i < 5; i++) s += parcel(x + 9 + i * 20, y + 8, z + 1.8, 13, 9, 7, i % 2 ? "cream" : "wood");
    }
  }
  s += line3([[-90, 68, 0.6], [96, 68, 0.6]], "ph-lane");
  s += line3([[-90, 88, 0.6], [96, 88, 0.6]], "ph-lane");
  s += line3([[-90, 108, 0.6], [96, 108, 0.6]], "ph-lane");
  s += line3([[-90, 128, 0.6], [96, 128, 0.6]], "ph-lane");
  return named("Storage racks", s);
}

function packArea() {
  let s = "";
  const { x, y } = PACK;
  for (let i = 0; i < 3; i++) {
    const px = x + i * 34, py = y + i * 16;
    s += MAT("darksteel", slab(px, py, 28, 22, 0, 6, 2, 0.2));
    s += MAT("wood", slab(px + 1, py + 1, 26, 20, 6, 4, 1, 0.2));
    s += MAT("steel", slab(px + 8, py + 3, 10, 5, 10, 12, 0.6, 0.1));
    s += parcel(px + 14, py + 12, 10, 10, 8, 6, TONES[i]);
    s += dot([px + 24, py + 4, 12], 1.1, "ph-led");
  }
  // pack conveyor and tape head
  s += MAT("darksteel", slab(172, 84, 70, 14, 0, 6, 2, 0.2));
  for (let i = 0; i < 10; i++) s += MAT("steel", cyl(175 + i * 6.8, 88, 1.8, 6, 1.4, 8));
  s += MAT("steel", slab(150, 80, 4, 22, 0, 30, 1, 0.2));
  s += MAT("cream", slab(146, 82, 12, 18, 28, 6, 1, 0.2));
  s += '<g data-part="packhead"></g>';
  s += '<g data-part="packboxes"></g>';
  return named("Pack stations", s);
}

function tug() {
  let s = "";
  s += line3(TUG, "ph-tuglane");
  s += '<g data-part="tug"></g>';
  return named("Tug and carts", s);
}

function outboundCages() {
  let s = "";
  for (const [x, y] of [[196, 102], [222, 118], [204, 132]]) {
    for (const [dx, dy] of [[-9, -7], [9, -7], [-9, 7], [9, 7]]) s += MAT("steel", slab(x + dx - 1, y + dy - 1, 2, 2, 0, 17, 0.4, 0.1));
    for (const dz of [17, 9]) {
      s += line3([[x - 9, y - 7, dz], [x + 9, y - 7, dz]], "ph-cage");
      s += line3([[x - 9, y + 7, dz], [x + 9, y + 7, dz]], "ph-cage");
      s += line3([[x - 9, y - 7, dz], [x - 9, y + 7, dz]], "ph-cage");
      s += line3([[x + 9, y - 7, dz], [x + 9, y + 7, dz]], "ph-cage");
    }
    s += MAT("rubber", cyl(x - 6, y + 7, 1.6, 0, 2, 8));
    s += MAT("rubber", cyl(x + 6, y + 7, 1.6, 0, 2, 8));
    for (let j = 0; j < 4; j++) s += parcel(x - 5 + (j % 2) * 8, y - 4 + Math.floor(j / 2) * 7, 2 + j * 2.4, 7, 6, 3.4, TONES[(j + x) % 7]);
    s += dot([x + 8, y - 6, 18.5], 1.1, "ph-led");
  }
  return named("Outbound cages", s);
}

function flow() {
  let s = "";
  s += line3(IND, "ph-flowline");
  s += line3(LOOP, "ph-flowline");
  CHUTES.forEach((ch) => { s += line3(ch.path, "ph-flowline"); });
  s += line3([[102, 36, 4], [180, 88, 6], [254, 42, 8]], "ph-flowline");
  return `<g class="ph-flow">${s}</g>`;
}

export function figure(theme) {
  const svg = k.figureSvg({
    width: WIDTH, height: HEIGHT, className: "ph-svg",
    label: "A parcel sorting hub in isometric cutaway. A trailer unloads at the left onto a lift that feeds a cross-belt sorter on a mezzanine; carriages tip parcels down seven chutes into cages. Below, AMR robots carry shelf pods between racks and pack stations, and two outbound trailers wait at the right.",
    body: [ground(), shell(), trailerIn(), deck(), sorter(), chutes(), induct(), racks(), packArea(), outboundCages(), trailerOut(), tug(), flow()],
  });
  const plate = k.plateHtml({
    fig: "Fig 29", title: "Parcel mega-hub", hint: "Follow one parcel",
    readout: "", body: `<div class="iso-stage ph-stage" tabindex="0" role="img" aria-label="Parcel sorting hub">${svg}</div>`,
  });

  const css = `
.ph-grid{stroke:var(--anatomy-faint);stroke-width:.8;opacity:.4}
.ph-zone{opacity:.14;mix-blend-mode:multiply}
body[data-theme="dark"] .ph-zone{opacity:.2;mix-blend-mode:screen}
.ph-zone-blue{opacity:.1}
.ph-zone-orange{opacity:.12}
.ph-aisle{stroke:var(--anatomy-faint);stroke-width:2.2;opacity:.7;stroke-dasharray:14 10}
.ph-door{stroke:var(--anatomy-faint);stroke-width:1;opacity:.65}
.ph-sign{fill:var(--anatomy-muted);font:600 9px "LabMono",ui-monospace,monospace;letter-spacing:.1em}
.ph-lampwire{stroke:var(--anatomy-muted);stroke-width:.8;opacity:.6}
.ph-lamp{animation:ph-glow 2.6s ease-in-out infinite}
.ph-rail{stroke:var(--anatomy-muted);stroke-width:1.3;opacity:.9}
.ph-track{stroke:#4b5768;stroke-width:3.4;fill:none;stroke-linejoin:round}
.ph-track-in{stroke:#6b788b;stroke-width:1.4;fill:none;stroke-dasharray:6 5}
.ph-leg{stroke:var(--anatomy-muted);stroke-width:1;opacity:.7}
.ph-chute{fill:rgba(150,170,195,.35);stroke:#5b6675;stroke-width:1;stroke-linejoin:round}
body[data-theme="dark"] .ph-chute{fill:rgba(120,140,165,.22)}
.ph-chuteline{stroke:#6d7b8e;stroke-width:1.2;fill:none}
.ph-cage{stroke:#7d8a99;stroke-width:1;opacity:.85}
.ph-belt{stroke:#4a5566;stroke-width:3;fill:none;stroke-linecap:round;stroke-dasharray:8 5;animation:ph-dash 1.2s linear infinite}
.ph-scan{stroke:#ff5a4a;stroke-width:1.6;stroke-dasharray:3 4;fill:none;animation:ph-dash .5s linear infinite;filter:drop-shadow(0 0 3px #ff5a4a)}
.ph-cable{stroke:#8c96a4;stroke-width:1;opacity:.7}
.ph-tape{stroke:#c9a06a;stroke-width:.9;opacity:.6}
.ph-led{fill:#63e6a3;animation:ph-blink 1.5s steps(2) infinite}
.ph-tuglane{stroke:var(--anatomy-faint);stroke-width:2;stroke-dasharray:12 8;fill:none;opacity:.6}
.ph-lane{stroke:var(--anatomy-faint);stroke-width:1;stroke-dasharray:9 10;fill:none;opacity:.55}
.ph-flow{display:none}
body[data-mode="flow"] .ph-flow{display:block}
body[data-mode="flow"] .ph-svg>g:not(.ph-flow){opacity:.7;transition:opacity .3s}
.ph-flowline{stroke:#3cc8d8;stroke-width:2;stroke-dasharray:7 7;fill:none;animation:ph-dash 1s linear infinite;filter:drop-shadow(0 0 4px #3cc8d8)}
@keyframes ph-dash{to{stroke-dashoffset:-24}}
@keyframes ph-glow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes ph-blink{0%,55%{opacity:1}56%,100%{opacity:.2}}
${materialsCss(["floor", "white", "cream", "steel", "darksteel", "chrome", "yellow", "orange", "teal", "blue", "green", "red", "wood", "rubber", "carbon", "glass", "alu"])}
`;

  const live = `
const state = initialState();
const trayEl = part("trays"), liftEl = part("lift"), inductEl = part("inductparcels"),
  packEl = part("packboxes"), headEl = part("packhead"), tugEl = part("tug");
const chuteEls = [0,1,2,3,4,5,6].map((i) => part("chutefall" + i));
let lastPaint = 0, lastGauge = 0, amrSeed = 0;
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const ping = (t) => { t = ((t % 2) + 2) % 2; return t < 1 ? t : 2 - t; };
Lab.onAction((a) => {
  if (a === "peak") state.surge = 600;
  if (a === "reset") { Object.assign(state, initialState()); Lab.set("pph", 45000); Lab.set("speed", 2.2); Lab.set("amrs", 24); }
});

function box(x, y, z, w, d, h, tone) {
  let s = MAT(tone, slab(x - w / 2, y - d / 2, w, d, z, h, 0.5, 0.1));
  s += line3([[x - w / 2 + 0.6, y, z + h + 0.05], [x + w / 2 - 0.6, y, z + h + 0.05]], "ph-tape");
  return s;
}

function trayAt(a, i, now) {
  const cx = C.SORTER.cx, cy = C.SORTER.cy, rx = C.SORTER.rx, ry = C.SORTER.ry;
  const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
  const dest = C.CHUTES[i % 7];
  let diff = a - dest.a;
  while (diff > Math.PI) diff -= TAU;
  while (diff < -Math.PI) diff += TAU;
  const near = Math.abs(diff) < 0.12;
  const tilt = near ? (1 - Math.abs(diff) / 0.12) * 0.42 : 0;
  const tangent = [-rx * Math.sin(a), ry * Math.cos(a), 0];
  const tl = Math.hypot(tangent[0], tangent[1]) || 1;
  const t = [tangent[0] / tl, tangent[1] / tl, 0];
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const n = [Math.cos(a) * ct, Math.sin(a) * ct, st];
  const v = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
  const vl = Math.hypot(v[0], v[1], v[2]) || 1;
  const vv = [v[0] / vl, v[1] / vl, v[2] / vl];
  const u = [vv[1] * n[2] - vv[2] * n[1], vv[2] * n[0] - vv[0] * n[2], vv[0] * n[1] - vv[1] * n[0]];
  const F = G.frameOf([px, py, 64], n, u, vv);
  let s = MAT("darksteel", slab(px - 7, py - 5, 14, 10, 60, 3.4, 1, 0.15));
  s += MAT("steel", S(G.prismOf(F, [[-5, -3], [5, -3], [5, 3], [-5, 3]], -0.6, 0.6, P)));
  const loaded = a > Math.PI - 0.2 || a < dest.a - 0.05;
  if (loaded && !near) {
    const Fc = G.frameOf([px + n[0] * 1.4, py + n[1] * 1.4, 64 + n[2] * 1.4], n, u, vv);
    s += MAT(C.TONES[i % 7], S(G.prismOf(Fc, [[-2.6, -2], [2.6, -2], [2.6, 2], [-2.6, 2]], 0, 2.6, P)));
  }
  return s;
}

function chuteFall(ci, now) {
  const ch = C.CHUTES[ci];
  let s = "";
  for (let j = 0; j < 2; j++) {
    let f = (now * 0.36 + ci * 0.11 + j * 0.5) % 1;
    if (f < 0.12) continue;
    const p = along(ch.path, (f - 0.12) / 0.88);
    s += box(p[0], p[1], p[2] - 1.5, 5, 4, 3, C.TONES[(ci + j) % 7]);
  }
  return s;
}

function liftSvg(now) {
  const f = (now * 0.3) % 1;
  const z = f < 0.85 ? 12 + (f / 0.85) * 40 : 52 - ((f - 0.85) / 0.15) * 4;
  let s = MAT("chrome", slab(-312, -14, 16, 16, z, 2, 0.6, 0.1));
  s += MAT("orange", slab(-310, -12, 12, 12, z + 2, 1.4, 0.5, 0.1));
  if (f < 0.9) s += box(-304, -6, z + 3, 7, 6, 4, C.TONES[Math.floor(now) % 7]);
  return s;
}

function inductSvg(now) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const p = along(C.IND, (now * 0.22 + i / 6) % 1);
    s += box(p[0], p[1], p[2], 6.5, 5.5, 4, C.TONES[i % 7]);
  }
  return s;
}

function amrSvg(now) {
  let s = "";
  for (let i = 0; i < 8; i++) {
    const x = -70 + ping(now * 0.1 + i * 0.21) * 160;
    const y = 68 + (i % 4) * 20;
    s += MAT("rubber", slab(x - 7, y - 5, 14, 10, 1, 2.6, 1, 0.1));
    s += MAT("orange", slab(x - 6, y - 4, 12, 8, 4, 3.4, 1.3, 0.15));
    s += MAT("darksteel", slab(x - 4, y - 3, 8, 6, 7.4, 1, 0.5, 0.1));
    s += dot([x - 4, y - 3, 8.6], 0.8, "ph-led");
    if (i < 4) {
      s += MAT("darksteel", slab(x - 9, y - 7, 18, 14, 8.4, 2, 0.8, 0.1));
      for (const dz of [11, 19, 27]) {
        s += MAT("steel", slab(x - 8, y - 6, 16, 12, dz, 1.4, 0.5, 0.1));
        for (let j = 0; j < 2; j++) s += box(x - 5 + j * 6, y - 1, dz + 1.4, 5, 5, 4, C.TONES[(i + j) % 7]);
      }
      s += MAT("steel", slab(x - 9, y - 7, 2, 14, 8.4, 22, 0.4, 0.1));
      s += MAT("steel", slab(x + 7, y - 7, 2, 14, 8.4, 22, 0.4, 0.1));
    }
  }
  return s;
}

function packSvg(now) {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const x = 178 + ((now * 16 + i * 18) % 60);
    s += box(x, 90, 12.5, 9, 8, 6, C.TONES[i % 7]);
  }
  return s;
}

function headSvg(now) {
  const bob = 3 * Math.abs(Math.sin(now * 2.8));
  let s = MAT("chrome", slab(152, 84, 7, 10, 34 + bob, 3, 0.5, 0.1));
  s += line3([[155, 89, 37 + bob], [155, 89, 30]], "ph-cable");
  s += dot([155, 89, 29], 1.1, "ph-led");
  return s;
}

function tugSvg(now) {
  const f = ping(now * 0.045);
  const p = along(C.TUG, f);
  const dir = (now * 0.045) % 2 < 1 ? 1 : -1;
  let s = "";
  for (let i = 0; i < 3; i++) {
    const x = p[0] - dir * i * 26;
    if (i === 0) {
      s += MAT("orange", slab(x - 9, 139, 18, 14, 2, 10, 1.4, 0.2));
      s += MAT("glass", slab(x - 6, 141, 12, 10, 10, 1.2, 0.5, 0.1));
      s += MAT("rubber", cyl(x - 6, 137, 3, 0, 5, 10));
      s += MAT("rubber", cyl(x + 6, 137, 3, 0, 5, 10));
    } else {
      s += MAT("steel", slab(x - 10, 138, 20, 16, 2, 3, 1, 0.15));
      for (const dx of [-6, 6]) s += MAT("rubber", cyl(x + dx, 137, 3, 0, 5, 10));
      for (const dz of [5, 12]) {
        s += line3([[x - 9, 140, dz], [x + 9, 140, dz]], "ph-cage");
        s += line3([[x - 9, 152, dz], [x + 9, 152, dz]], "ph-cage");
      }
      s += box(x - 4, 146, 5, 7, 6, 4, C.TONES[i]);
    }
  }
  return s;
}

const cv = document.querySelector(".ph-chart");
function drawChart(o) {
  if (!cv || !cv.clientWidth) return;
  const ctx = cv.getContext("2d");
  const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const vals = [["Induct", o.inductCap, "#4c8ed9"], ["Sorter", o.sorterCap, "#3cc8d8"], ["Chutes", o.chuteCap, "#7a6fc0"], ["Outbound", o.outCap, "#3fae72"], ["Stream", o.thru, "#ff7a45"]];
  const max = Math.max(60000, ...vals.map((v) => v[1])) * 1.12;
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue("--anatomy-muted"), strong = cs.getPropertyValue("--anatomy-strong"), rule = cs.getPropertyValue("--lab-rule");
  const bw = (w - 30) / vals.length;
  ctx.font = "600 18px ui-monospace,monospace"; ctx.textAlign = "center";
  vals.forEach(([label, v, col], i) => {
    const bh = (v / max) * (h - 48), x = 15 + i * bw + bw * 0.16, y = h - 30 - bh;
    ctx.fillStyle = col; ctx.fillRect(x, y, bw * 0.68, bh);
    ctx.fillStyle = strong; ctx.fillText(Math.round(v / 1000) + "k", x + bw * 0.34, y - 7);
    ctx.fillStyle = muted; ctx.font = "500 14px ui-monospace,monospace"; ctx.fillText(label, x + bw * 0.34, h - 8); ctx.font = "600 18px ui-monospace,monospace";
  });
  ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(8, h - 30); ctx.lineTo(w - 8, h - 30); ctx.stroke();
  ctx.strokeStyle = "#ff7a45"; ctx.setLineDash([6, 5]); ctx.beginPath();
  const dy = h - 30 - (o.demand / max) * (h - 48);
  ctx.moveTo(8, dy); ctx.lineTo(w - 8, dy); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#ff7a45"; ctx.font = "500 14px ui-monospace,monospace"; ctx.textAlign = "left"; ctx.fillText("arriving", 12, dy - 6);
}

function frame(dt, now) {
  const u = { pph: Lab.value("pph"), speed: Lab.value("speed"), amrs: Lab.value("amrs") };
  step(state, u, Math.min(dt * SIM_SPEED, 30));
  const o = outputs(state);
  if (now - lastPaint > 0.12) {
    lastPaint = now;
    let trays = "";
    for (let i = 0; i < 40; i++) {
      const a = ((now * 0.055 + i / 40) % 1) * TAU;
      trays += trayAt(a, i, now);
    }
    setHtml(trayEl, trays);
    for (let i = 0; i < 7; i++) setHtml(chuteEls[i], chuteFall(i, now));
    setHtml(liftEl, liftSvg(now));
    setHtml(inductEl, inductSvg(now));
    setHtml(packEl, packSvg(now));
    setHtml(headEl, headSvg(now));
    setHtml(tugEl, tugSvg(now));
  }
  if (now - lastGauge > 0.25) {
    lastGauge = now;
    Lab.gauge("thru", Math.round(o.thru).toLocaleString("en-US") + " /h", o.surge > 0);
    Lab.gauge("util", Math.round(o.util * 100) + " %", o.util > 0.95);
    Lab.gauge("jam", Math.round(o.jam) + " %", o.jam > 55);
    Lab.gauge("robots", Math.round(o.robots) + " / " + Math.round(u.amrs));
    Lab.gauge("sorted", Math.round(o.sorted).toLocaleString("en-US"));
    Lab.gauge("backlog", Math.round(o.backlog).toLocaleString("en-US"), o.backlog > 2000);
    Lab.gauge("bottleneck", o.bottleneck.toUpperCase());
    readout((o.surge > 0 ? "PEAK SURGE · " : "") + Math.round(o.thru).toLocaleString("en-US") + " /h · " + o.bottleneck + " limit");
    document.body.dataset.bottleneck = o.bottleneck;
    drawChart(o);
  }
}
frame(1 / 60, performance.now() / 1000);
loop(frame);
`;

  return {
    plate, css, script: pageScript(P, { SORTER, CHUTES, IND, TUG, TONES }, modelSource + live),
    extra: `<div class="lab-card"><div class="lab-card-head"><span>Stage capacities</span><em>parcels per hour</em></div><canvas class="ph-chart" style="width:100%;height:150px;display:block"></canvas></div>`,
  };
}
