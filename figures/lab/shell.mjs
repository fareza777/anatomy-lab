// The lab shell: wraps one Anatomy figure in a mobile-first page with view modes, sliders,
// live gauges and a synced step-by-step explanation. Every system page is built through here,
// so the app gets one consistent control language and one JS contract (window.Lab).
import { ISO_CSS } from "../vendor/anatomy/kit/iso-kit.mjs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const LAB_CSS = `
@font-face{font-family:"LabMono";src:url(../../fonts/JetBrainsMono.ttf) format("truetype");font-weight:100 900;font-display:swap}
@font-face{font-family:"LabDisplay";src:url(../../fonts/SpaceGrotesk.ttf) format("truetype");font-weight:300 700;font-display:swap}
.iso{--anatomy-mono:"LabMono",ui-monospace,Menlo,Consolas,monospace}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
.iso{--lab-accent:#ff7a45;--lab-accent-2:#3cc8d8;--lab-accent-ink:#1a0a03;--lab-rule:#232a36;--lab-chip:#111722;
  --anatomy-page:#070a10;--anatomy-card:#0e1420;--lab-spot:#22304a;--lab-mid:#111a29;--lab-edge:#070b12;--lab-floor:#00000088;--lab-tip-bg:#121a28e6}
.iso[data-theme="light"]{--lab-accent:#e8461a;--lab-accent-2:#0f8597;--lab-accent-ink:#ffffff;--lab-rule:#dfe3ea;--lab-chip:#f8f9fb;
  --anatomy-page:#eef1f5;--anatomy-card:#fbfbfc;--lab-spot:#ffffff;--lab-mid:#f1f4f8;--lab-edge:#dbe2ec;--lab-floor:#5a6b8a22;--lab-tip-bg:#ffffffe6}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
.lab{max-width:720px;margin:0 auto;padding:0 0 28px}
.lab-stage{position:sticky;top:0;z-index:2;background:var(--anatomy-page);padding:10px 10px 6px}
.lab .iso-figure{margin:0}
.lab .iso-plate{padding:34px 8px 34px;box-shadow:0 0 0 1px var(--lab-rule),var(--anatomy-lift);border-radius:18px;overflow:hidden;
  background:radial-gradient(90% 70% at 50% 42%,var(--lab-spot) 0%,var(--lab-mid) 55%,var(--lab-edge) 100%)}
.lab .iso-plate::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 18% at 50% 88%,var(--lab-floor),transparent 70%)}
.lab .iso-plate-corner[data-corner="title"]{color:var(--lab-accent);font-weight:600}
.lab-tip{position:absolute;z-index:5;left:10px;right:10px;top:30px;background:var(--lab-tip-bg);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:14px;padding:8px 12px 9px;box-shadow:0 0 0 1px var(--lab-rule),0 10px 30px #0003;opacity:0;transform:translateY(-8px);transition:opacity .25s,transform .25s var(--anatomy-ease);pointer-events:none}
.lab-tip[data-on]{opacity:1;transform:none}
.lab-tip b{display:block;color:var(--lab-accent);font:600 11px/1.2 var(--anatomy-mono);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px}
.lab-tip span{display:block;color:var(--anatomy-strong);font-size:12.5px;line-height:1.35}
.lab-hl{filter:drop-shadow(0 0 1.5px var(--lab-accent)) drop-shadow(0 0 5px var(--lab-accent));animation:lab-hl 1.2s ease-in-out infinite alternate}
@keyframes lab-hl{from{filter:drop-shadow(0 0 1px var(--lab-accent)) drop-shadow(0 0 3px var(--lab-accent))}to{filter:drop-shadow(0 0 2px var(--lab-accent)) drop-shadow(0 0 8px var(--lab-accent))}}
.lab .iso-plate-corners{inset:12px 14px}
.lab .iso-plate-corner{font-size:9.5px}
.lab .iso-legend{display:none}
.lab .iso-stage{touch-action:none;outline:none;width:min(100%,calc(var(--fig-max-h,340px) * var(--fig-aspect,1)));margin:0 auto}
.lab .iso-stage:focus-visible{box-shadow:0 0 0 2px var(--lab-accent);border-radius:8px}
.lab-panel{padding:4px 16px 0}
.lab-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:6px 0}
.lab-row::-webkit-scrollbar{display:none}
.lab-seg{display:flex;flex:1 1 auto;background:var(--lab-chip);border-radius:12px;padding:3px;box-shadow:0 0 0 1px var(--lab-rule)}
.lab-seg button{flex:1 1 0;min-width:0;white-space:nowrap;border:0;background:transparent;color:var(--anatomy-text);font:600 11px/1 var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;padding:11px 8px;border-radius:9px;transition:background .25s var(--anatomy-ease),color .25s}
.lab-seg button[aria-pressed="true"]{background:var(--anatomy-card);color:var(--anatomy-strong);box-shadow:var(--anatomy-lift)}
.lab-gauges{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:8px 0 4px}
.lab-gauge{background:var(--lab-chip);border-radius:12px;padding:9px 11px 8px;box-shadow:0 0 0 1px var(--lab-rule)}
.lab-gauge b{display:block;color:var(--anatomy-strong);font:600 16px/1.2 var(--anatomy-mono);font-variant-numeric:tabular-nums;letter-spacing:-.01em;overflow-wrap:anywhere}
.lab-gauge b[data-long]{font-size:12.5px;line-height:1.25}
.lab-gauge span{display:block;color:var(--anatomy-muted);font:500 9.5px/1.3 var(--anatomy-mono);letter-spacing:.09em;text-transform:uppercase;margin-top:3px}
.lab-gauge[data-hot] b{color:var(--lab-accent)}
.lab-controls{margin:10px 0 2px}
.lab-ctl{padding:10px 0 4px;border-top:1px solid var(--lab-rule)}
.lab-ctl:first-child{border-top:0}
.lab-ctl-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.lab-ctl-head label{color:var(--anatomy-strong);font:600 12px/1.3 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase}
.lab-ctl-head output{color:var(--lab-accent);font:600 13px/1.3 var(--anatomy-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.lab-ctl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:36px;background:transparent;margin:2px 0 0}
.lab-ctl input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--lab-accent) var(--fill,50%),var(--lab-rule) var(--fill,50%))}
.lab-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;margin-top:-10px;border-radius:50%;background:var(--anatomy-card);box-shadow:0 0 0 1.5px var(--lab-accent),0 2px 6px #0003}
.lab-ctl input[type=range]::-moz-range-track{height:4px;border-radius:4px;background:var(--lab-rule)}
.lab-ctl input[type=range]::-moz-range-progress{height:4px;border-radius:4px;background:var(--lab-accent)}
.lab-ctl input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--anatomy-card);border:1.5px solid var(--lab-accent)}
.lab-ctl small{display:block;color:var(--anatomy-muted);font-size:12px;line-height:1.4;margin-top:-2px}
.lab-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;border:0;background:transparent;color:var(--anatomy-strong);font:600 12px/1.3 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;padding:8px 0;text-align:left}
.lab-toggle i{flex:0 0 auto;width:42px;height:24px;border-radius:12px;background:var(--lab-rule);position:relative;transition:background .25s}
.lab-toggle i::after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:var(--anatomy-card);box-shadow:0 1px 3px #0004;transition:transform .25s var(--anatomy-ease)}
.lab-toggle[aria-checked="true"] i{background:var(--lab-accent)}
.lab-toggle[aria-checked="true"] i::after{transform:translateX(18px)}
.lab-actions{display:flex;gap:8px;margin:6px 0}
.lab-btn{flex:1 1 0;border:0;border-radius:12px;padding:13px 10px;font:600 12px/1 var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;background:var(--lab-chip);color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--lab-rule)}
.lab-btn[data-primary]{background:var(--lab-accent);color:var(--lab-accent-ink);box-shadow:none}
.lab-btn:active{transform:scale(.98)}
.lab-steps{margin:16px 0 0;border-top:1px solid var(--lab-rule);padding-top:12px}
.lab-steps-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.lab-steps-head h2{margin:0;color:var(--anatomy-muted);font:600 10.5px/1 var(--anatomy-mono);letter-spacing:.12em;text-transform:uppercase}
.lab-steps-head .lab-pager{display:flex;gap:6px}
.lab-pager button{width:38px;height:34px;border:0;border-radius:10px;background:var(--lab-chip);color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--lab-rule);font:600 15px/1 var(--anatomy-mono)}
.lab-pips{display:flex;gap:6px;margin:0 0 10px}
.lab-pips button{flex:1 1 0;height:30px;border:0;border-radius:8px;background:var(--lab-chip);box-shadow:0 0 0 1px var(--lab-rule);color:var(--anatomy-muted);font:600 11px/1 var(--anatomy-mono);position:relative;overflow:hidden}
.lab-pips button[aria-current="step"]{background:var(--lab-accent);color:var(--lab-accent-ink);box-shadow:none}
.lab-step h3{margin:2px 0 6px;color:var(--anatomy-strong);font:600 21px/1.25 "LabDisplay",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em}
.lab-step p{margin:0 0 10px;text-align:justify;hyphens:auto;-webkit-hyphens:auto}
.lab-step .lab-kicker{color:var(--lab-accent);font:600 10.5px/1 var(--anatomy-mono);letter-spacing:.12em;text-transform:uppercase}
.lab-step{animation:lab-in .35s var(--anatomy-ease)}
@keyframes lab-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.lab-card{margin:10px 0 4px;background:var(--lab-chip);border-radius:14px;padding:10px 12px 8px;box-shadow:0 0 0 1px var(--lab-rule)}
.lab-card-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.lab-card-head span{color:var(--anatomy-strong);font:600 11px/1 var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase}
.lab-card-head em{color:var(--anatomy-muted);font:500 10px/1 var(--anatomy-mono);font-style:normal;letter-spacing:.06em}
.lab-foot{margin:18px 0 0;color:var(--anatomy-muted);font:500 10.5px/1.5 var(--anatomy-mono);letter-spacing:.04em}
.lab .iso-stage{transform-origin:0 0}
.lab .iso-stage[data-ease]{transition:transform .28s var(--anatomy-ease)}
.lab-zoom{position:absolute;z-index:4;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px}
.lab-zoom button{width:34px;height:34px;border:0;border-radius:11px;background:var(--lab-tip-bg);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--lab-rule),0 4px 12px #0002;font:600 17px/1 var(--anatomy-mono);padding:0}
.lab-zoom button:active{transform:scale(.94)}
.lab-zoom [data-zoom="level"]{font-size:10px;letter-spacing:.02em;height:26px}
.lab-zoom:not([data-zoomed]) [data-zoom="level"],.lab-zoom:not([data-zoomed]) [data-zoom="out"]{display:none}
@media (prefers-reduced-motion:reduce){.lab-step{animation:none}}
body.lab-thumb,body.lab-thumb .lab-stage{background:transparent!important}
body.lab-thumb .iso-plate{background:none!important;box-shadow:none!important;padding:0!important}
body.lab-thumb .iso-plate::before,body.lab-thumb .iso-plate-corners,body.lab-thumb .lab-panel,body.lab-thumb .lab-tip,body.lab-thumb .lab-zoom{display:none!important}
body.lab-thumb .iso-stage{width:100%!important}
@media (min-height:700px) and (max-width:719px){.lab-stage{padding-top:8px}}
`;

// Runtime shared by every page. Figure code talks to it through window.Lab.
const LAB_RUNTIME = `
if (new URLSearchParams(location.search).has("thumb")) document.body.classList.add("lab-thumb");
// Size the figure from the real viewport height (vh can resolve to 0 inside a WebView that is
// still being laid out), and keep it in step with every resize.
const fitFigure = () => { const h = window.innerHeight || document.documentElement.clientHeight; if (h > 0) document.documentElement.style.setProperty("--fig-max-h", Math.round(h * 0.5) + "px"); };
fitFigure(); addEventListener("resize", fitFigure); addEventListener("load", fitFigure);
if (window.ResizeObserver) new ResizeObserver(fitFigure).observe(document.documentElement);
const Lab = (() => {
  const cfg = JSON.parse(document.getElementById("lab-config").textContent);
  const values = {}; const listeners = []; const stepListeners = []; const modeListeners = [];
  let step = -1, mode = cfg.modes && cfg.modes.length ? cfg.modes[0].id : null, touring = false;
  const fmt = (c, v) => (c.format ? c.format.replace("{v}", (+v).toFixed(c.digits ?? 0)) : (+v).toFixed(c.digits ?? 0));
  const native = window.AnatomyNative;
  const emit = (id) => listeners.forEach((fn) => fn(id, values[id], values));
  const fill = (input) => input.style.setProperty("--fill", ((input.value - input.min) / (input.max - input.min)) * 100 + "%");
  function setValue(id, v, quiet) {
    const c = cfg.controls.find((x) => x.id === id); if (!c) return;
    values[id] = c.type === "toggle" ? !!v : Math.min(c.max, Math.max(c.min, +v));
    const el = document.querySelector('[data-ctl="' + id + '"]');
    if (el) {
      if (c.type === "toggle") el.setAttribute("aria-checked", String(values[id]));
      else { const input = el.querySelector("input"); input.value = values[id]; fill(input); el.querySelector("output").textContent = fmt(c, values[id]); }
    }
    if (!quiet) emit(id);
  }
  function setMode(id, quiet) {
    mode = id;
    document.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === id)));
    document.body.dataset.mode = id;
    if (!quiet) modeListeners.forEach((fn) => fn(id));
  }
  function setStep(i, fromUser) {
    const n = cfg.steps.length; if (!n) return;
    step = ((i % n) + n) % n;
    document.querySelectorAll(".lab-pips button").forEach((b, k) => (k === step ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    const s = cfg.steps[step];
    const box = document.querySelector(".lab-step");
    if (box) {
      box.innerHTML = '<div class="lab-kicker">Step ' + (step + 1) + " of " + n + "</div><h3></h3>" + s.body.map(() => "<p></p>").join("");
      box.querySelector("h3").textContent = s.title;
      box.querySelectorAll("p").forEach((p, k) => (p.textContent = s.body[k]));
      box.style.animation = "none"; void box.offsetWidth; box.style.animation = "";
    }
    if (fromUser) touring = false;
    if (s.set) Object.entries(s.set).forEach(([k, v]) => setValue(k, v));
    if (s.mode) setMode(s.mode);
    stepListeners.forEach((fn) => fn(step, s, !!fromUser));
    native && native.onStep && native.onStep(step);
  }
  function build() {
    const seg = document.querySelector(".lab-seg");
    if (seg) seg.addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
    cfg.controls.forEach((c) => {
      values[c.id] = c.value;
      const el = document.querySelector('[data-ctl="' + c.id + '"]');
      if (!el) return;
      if (c.type === "toggle") el.addEventListener("click", () => setValue(c.id, !values[c.id]));
      else { const input = el.querySelector("input"); fill(input); input.addEventListener("input", () => setValue(c.id, input.value)); }
    });
    document.querySelectorAll("[data-action]").forEach((b) => b.addEventListener("click", () => actionListeners.forEach((fn) => fn(b.dataset.action, b))));
    const pips = document.querySelector(".lab-pips");
    if (pips) pips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setStep(+b.dataset.step, true); });
    const prev = document.querySelector('[data-page="prev"]'), next = document.querySelector('[data-page="next"]');
    prev && prev.addEventListener("click", () => setStep(step - 1, true));
    next && next.addEventListener("click", () => setStep(step + 1, true));
    if (mode) setMode(mode, true);
    if (cfg.steps.length) setStep(0, false);
  }
  const actionListeners = [];
  const gauges = {};
  function gauge(id, text, hot) {
    const el = gauges[id] || (gauges[id] = document.querySelector('[data-gauge="' + id + '"] b'));
    if (!el) return;
    if (el.textContent !== text) { el.textContent = text; el.toggleAttribute("data-long", text.length > 9); }
    el.parentElement.toggleAttribute("data-hot", !!hot);
  }
  // Tap a part: highlight it and show what it is.
  const pickListeners = [];
  let tipTimer = 0, lit = null;
  function pick(x, y) {
    const stage = document.querySelector(".iso-stage");
    const svgs = stage ? [...stage.querySelectorAll("svg")] : [];
    const saved = svgs.map((s) => s.style.pointerEvents);
    svgs.forEach((s) => (s.style.pointerEvents = "auto"));
    const hit = document.elementsFromPoint(x, y).map((el) => el.closest && el.closest("[data-name]")).find(Boolean);
    svgs.forEach((s, i) => (s.style.pointerEvents = saved[i]));
    const tip = document.querySelector(".lab-tip");
    if (lit) lit.classList.remove("lab-hl");
    if (!hit || !tip) { tip && tip.removeAttribute("data-on"); lit = null; return; }
    const name = hit.getAttribute("data-name");
    const info = (cfg.parts || []).find((p) => p.name === name);
    lit = hit; hit.classList.add("lab-hl");
    tip.querySelector("b").textContent = name;
    tip.querySelector("span").textContent = info ? info.role : "";
    tip.setAttribute("data-on", "");
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => { tip.removeAttribute("data-on"); if (lit) lit.classList.remove("lab-hl"); lit = null; }, 4200);
    pickListeners.forEach((fn) => fn(name));
    native && native.onPick && native.onPick(name);
  }
  function wirePicker() {
    const stage = document.querySelector(".iso-stage");
    const plate = document.querySelector(".iso-plate");
    if (!stage || !plate) return;
    const tip = document.createElement("div"); tip.className = "lab-tip"; tip.innerHTML = "<b></b><span></span>"; plate.appendChild(tip);
    let down = null, lastTap = null;
    stage.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    stage.addEventListener("pointerup", (e) => {
      const tap = down && !zoom.gestured && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 450;
      down = null;
      if (!tap) return;
      const now = performance.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { lastTap = null; zoom.toggleAt(e.clientX, e.clientY); return; }
      lastTap = { x: e.clientX, y: e.clientY, t: now };
      pick(e.clientX, e.clientY);
    });
  }
  // Zoom: pinch with two fingers (which also pans), double-tap, or the + / - buttons.
  // The stage is scaled with a CSS transform, so the SVG stays sharp and every lab's own
  // pointer maths (which reads the stage's on-screen rect) keeps working.
  const zoom = (() => {
    const MAX = 5;
    let stage, box, s = 1, tx = 0, ty = 0, gestured = false;
    const pts = new Map();
    let pinch = null, pan = null;
    const origin = () => { const r = stage.getBoundingClientRect(); return [r.left - tx, r.top - ty]; };
    function apply(ease) {
      const W = stage.offsetWidth, H = stage.offsetHeight;
      s = Math.min(MAX, Math.max(1, s));
      tx = Math.min(0, Math.max(W * (1 - s), tx)); ty = Math.min(0, Math.max(H * (1 - s), ty));
      if (s < 1.01) { s = 1; tx = 0; ty = 0; }
      ease ? stage.setAttribute("data-ease", "") : stage.removeAttribute("data-ease");
      stage.style.transform = s === 1 ? "" : "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
      if (box) { box.toggleAttribute("data-zoomed", s > 1); box.querySelector('[data-zoom="level"]').textContent = s.toFixed(1) + "\u00d7"; }
    }
    function zoomAt(cx, cy, to, ease) {
      const [ox, oy] = origin();
      const px = (cx - ox - tx) / s, py = (cy - oy - ty) / s;
      s = Math.min(MAX, Math.max(1, to));
      tx = cx - ox - px * s; ty = cy - oy - py * s;
      apply(ease);
    }
    const centre = () => { const r = stage.parentElement.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    function wire() {
      stage = document.querySelector(".lab .iso-stage");
      const plate = document.querySelector(".iso-plate");
      if (!stage || !plate) return;
      box = document.createElement("div"); box.className = "lab-zoom";
      box.innerHTML = '<button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="level" aria-label="Reset zoom">1.0\u00d7</button><button type="button" data-zoom="out" aria-label="Zoom out">\u2212</button>';
      plate.appendChild(box);
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-zoom]"); if (!b) return;
        const [cx, cy] = centre();
        if (b.dataset.zoom === "in") zoomAt(cx, cy, s * 1.6, true);
        else if (b.dataset.zoom === "out") zoomAt(cx, cy, s / 1.6, true);
        else { s = 1; apply(true); }
      });
      // Capture listeners run before each lab's own handlers, so a pinch never turns a crank.
      const opt = { capture: true };
      stage.addEventListener("pointerdown", (e) => {
        if (!pts.size) gestured = false;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        // zoomed in, one finger drags the view around like a map
        pan = pts.size === 1 && s > 1 ? { x: e.clientX, y: e.clientY, tx, ty } : null;
        if (pts.size === 2) {
          const [a, b] = [...pts.values()];
          pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s, tx, ty };
          gestured = true;
        }
        if (gestured) e.stopImmediatePropagation();
      }, opt);
      stage.addEventListener("pointermove", (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pan && pts.size === 1) {
          const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
          if (!gestured && Math.hypot(dx, dy) > 8) gestured = true; // a small wobble is still a tap
          if (!gestured) return;
          e.stopImmediatePropagation();
          tx = pan.tx + dx; ty = pan.ty + dy;
          apply(false);
          return;
        }
        if (!gestured) return;
        e.stopImmediatePropagation();
        if (pts.size < 2 || !pinch) return;
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        // keep the point under the fingers' first midpoint under the current midpoint
        s = pinch.s; tx = pinch.tx; ty = pinch.ty;
        zoomAt(pinch.m[0], pinch.m[1], pinch.s * (d / pinch.d), false);
        tx += m[0] - pinch.m[0]; ty += m[1] - pinch.m[1];
        apply(false);
      }, opt);
      const end = (e) => {
        if (!pts.delete(e.pointerId)) return;
        if (pts.size < 2) pinch = null;
        // after a pinch, the finger still down carries on panning from where the view is now
        if (pts.size === 1 && s > 1) { const [p] = [...pts.values()]; pan = { x: p[0], y: p[1], tx, ty }; }
        if (!pts.size) pan = null;
        if (gestured && pts.size) e.stopImmediatePropagation(); // the last lift still reaches the lab, so its drag ends
      };
      stage.addEventListener("pointerup", end, opt);
      stage.addEventListener("pointercancel", end, opt);
      // a trackpad pinch in a desktop browser arrives as ctrl + wheel
      stage.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, s * Math.exp(-e.deltaY / 200), false); }, { passive: false });
      addEventListener("resize", () => apply(false));
    }
    return {
      wire, get gestured() { return gestured; }, get scale() { return s; },
      toggleAt(x, y) { if (s > 1) { s = 1; apply(true); } else zoomAt(x, y, 2.5, true); },
      set(level) { const [cx, cy] = centre(); zoomAt(cx, cy, level, true); },
      // Centre the point at (fx, fy) of the stage (0..1 each) and zoom to level; 1 resets.
      focus(fx, fy, level) {
        if (!stage) return;
        const W = stage.offsetWidth, Hh = stage.offsetHeight;
        s = Math.max(1, level); tx = W / 2 - s * fx * W; ty = Hh / 2 - s * fy * Hh;
        apply(true);
      },
    };
  })();
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => { build(); zoom.wire(); wirePicker(); }) : (build(), zoom.wire(), wirePicker());
  window.addEventListener("load", () => native && native.ready && native.ready());
  return {
    get values() { return values; }, get step() { return step; }, get mode() { return mode; },
    get theme() { return document.body.dataset.theme; },
    reduced: matchMedia("(prefers-reduced-motion: reduce)"),
    value: (id) => values[id], set: setValue, setMode, setStep, gauge,
    onChange: (fn) => listeners.push(fn), onStep: (fn) => stepListeners.push(fn),
    onMode: (fn) => modeListeners.push(fn), onAction: (fn) => actionListeners.push(fn), onPick: (fn) => pickListeners.push(fn), pick, zoom,
    // Pause everything when the app goes to the background (called from Android).
    paused: false, setPaused(p) { this.paused = !!p; document.dispatchEvent(new CustomEvent("lab-pause", { detail: this.paused })); },
  };
})();
window.Lab = Lab;
`;

function controlHtml(c) {
  if (c.type === "toggle") {
    return `<div class="lab-ctl"><button class="lab-toggle" role="switch" aria-checked="${!!c.value}" data-ctl="${esc(c.id)}">${esc(c.label)}<i aria-hidden="true"></i></button>${c.help ? `<small>${esc(c.help)}</small>` : ""}</div>`;
  }
  const shown = c.format ? c.format.replace("{v}", (+c.value).toFixed(c.digits ?? 0)) : (+c.value).toFixed(c.digits ?? 0);
  return `<div class="lab-ctl" data-ctl="${esc(c.id)}"><div class="lab-ctl-head"><label for="ctl-${esc(c.id)}">${esc(c.label)}</label><output>${esc(shown)}</output></div><input id="ctl-${esc(c.id)}" type="range" min="${c.min}" max="${c.max}" step="${c.step ?? 1}" value="${c.value}">${c.help ? `<small>${esc(c.help)}</small>` : ""}</div>`;
}

/**
 * Assemble one lab page.
 * @param {object} o
 * @param {string} o.title
 * @param {"light"|"dark"} o.theme
 * @param {string} o.plate      plateHtml(...) of the figure
 * @param {Array}  o.modes      [{id,label}]
 * @param {Array}  o.controls   [{id,type:"range"|"toggle",label,min,max,step,value,format,digits,help}]
 * @param {Array}  o.gauges     [{id,label,value}]
 * @param {Array}  o.actions    [{id,label,primary}]
 * @param {Array}  o.steps      [{title, body:[...], set:{ctl:value}, mode}]
 * @param {string} o.script     kit + figure live code; runs after the Lab runtime
 * @param {string} o.css        extra CSS for this figure
 * @param {string} o.foot       a small accuracy/source note
 */
export function labPage(o) {
  const { title, theme, plate, modes = [], controls = [], gauges = [], actions = [], steps = [], script = "", css = "", foot = "", extra = "", parts = [] } = o;
  const config = { modes, controls, steps, parts };
  const panel = [
    modes.length ? `<div class="lab-row"><div class="lab-seg" role="group" aria-label="View">${modes.map((m) => `<button type="button" data-mode="${esc(m.id)}" aria-pressed="false">${esc(m.label)}</button>`).join("")}</div></div>` : "",
    gauges.length ? `<div class="lab-gauges">${gauges.map((g) => `<div class="lab-gauge" data-gauge="${esc(g.id)}"><b${String(g.value ?? "").length > 9 ? " data-long" : ""}>${esc(g.value ?? "–")}</b><span>${esc(g.label)}</span></div>`).join("")}</div>` : "",
    extra,
    actions.length ? `<div class="lab-actions">${actions.map((a) => `<button type="button" class="lab-btn" data-action="${esc(a.id)}"${a.primary ? " data-primary" : ""}>${esc(a.label)}</button>`).join("")}</div>` : "",
    controls.length ? `<div class="lab-controls">${controls.map(controlHtml).join("")}</div>` : "",
    steps.length
      ? `<section class="lab-steps" aria-label="How it works"><div class="lab-steps-head"><h2>How it works</h2><div class="lab-pager"><button type="button" data-page="prev" aria-label="Previous step">‹</button><button type="button" data-page="next" aria-label="Next step">›</button></div></div><div class="lab-pips">${steps.map((s, i) => `<button type="button" data-step="${i}" aria-label="${esc(s.title)}">${i + 1}</button>`).join("")}</div><article class="lab-step" aria-live="polite"></article></section>`
      : "",
    foot ? `<p class="lab-foot">${esc(foot)}</p>` : "",
  ].join("");
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  const all = (LAB_RUNTIME + script).replace(/<\/(script)/gi, "<\\/$1");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><style>${ISO_CSS}${LAB_CSS}${css}</style></head><body class="iso" data-theme="${theme}"><main class="lab"><section class="lab-stage">${plate}</section><section class="lab-panel">${panel}</section></main><script type="application/json" id="lab-config">${json}</script><script type="module">${all}</script></body></html>`;
}
