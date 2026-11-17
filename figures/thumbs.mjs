// Capture every built lab figure with a transparent background, both themes, for the app's cards.
//   node thumbs.mjs [filter]   -> app/src/main/assets/thumbs/<id>-<theme>.png (then webp via Python)
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromePort } from "./vendor/anatomy/scripts/chrome-port.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LABS = join(HERE, "..", "app", "src", "main", "assets", "labs");
const OUT = join(HERE, "..", "app", "src", "main", "assets", "thumbs");
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const chrome = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = mkdtempSync(join(tmpdir(), "lab-thumbs-"));
const proc = spawn(chrome, ["--headless=new", "--do-not-de-elevate", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "about:blank"]);
const port = await chromePort(proc, profile);
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); let loaded = () => {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === "Page.loadEventFired") loaded(); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const c = ++id; pending.set(c, r); ws.send(JSON.stringify({ id: c, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 900, deviceScaleFactor: 1.6, mobile: false });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const sys of readdirSync(LABS)) {
  if (only.length && !only.some((o) => sys.includes(o))) continue;
  for (const theme of ["light", "dark"]) {
    const file = join(LABS, sys, `${theme}.html`);
    if (!existsSync(file)) continue;
    const done = new Promise((r) => { loaded = r; setTimeout(r, 8000); });
    await send("Page.navigate", { url: pathToFileURL(file).href + "?thumb" });
    await done; await sleep(2200);
    const box = (await send("Runtime.evaluate", { expression: `(()=>{const r=document.querySelector('.iso-stage').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()`, returnByValue: true })).result.result.value;
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
    writeFileSync(join(OUT, `${sys}-${theme}.png`), Buffer.from(shot.result.data, "base64"));
    console.log("thumb", sys, theme, Math.round(box.w), "x", Math.round(box.h));
  }
}
ws.close(); proc.kill("SIGKILL"); try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
