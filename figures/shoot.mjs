// Screenshot built lab pages at phone size and report console errors (for checking work).
//   node shoot.mjs <id> [theme] [--js "expression"] [--wait ms] [--out dir] [--full]
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromePort } from "./vendor/anatomy/scripts/chrome-port.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LABS = join(HERE, "..", "app", "src", "main", "assets", "labs");
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const js = opt("--js", "");
const wait = +opt("--wait", "1800");
const out = opt("--out", join(tmpdir(), "lab-shots"));
const full = args.includes("--full"); if (full) args.splice(args.indexOf("--full"), 1);
const [sys, theme = "light"] = args;
mkdirSync(out, { recursive: true });
const file = join(LABS, sys, `${theme}.html`);
if (!existsSync(file)) { console.error("missing", file); process.exit(1); }
const chrome = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = mkdtempSync(join(tmpdir(), "lab-shoot-"));
const proc = spawn(chrome, ["--headless=new", "--do-not-de-elevate", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "about:blank"]);
const port = await chromePort(proc, profile);
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); let loaded = () => {};
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.method === "Page.loadEventFired") loaded();
  if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === "Runtime.consoleAPICalled" && (d.params.type === "error" || d.params.type === "warning")) errors.push(d.params.args.map((a) => a.value ?? a.description).join(" "));
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const c = ++id; pending.set(c, r); ws.send(JSON.stringify({ id: c, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 412, height: 860, deviceScaleFactor: 2, mobile: true });
const done = new Promise((r) => { loaded = r; setTimeout(r, 8000); });
await send("Page.navigate", { url: pathToFileURL(file).href });
await done; await sleep(wait);
if (js) { const r = await send("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true }); console.log("js:", JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text)); await sleep(900); }
const params = { format: "jpeg", quality: 80 };
if (full) { const h = (await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.result.value; params.clip = { x: 0, y: 0, width: 412, height: h, scale: 1 }; params.captureBeyondViewport = true; }
const shot = await send("Page.captureScreenshot", params);
const name = join(out, `${sys}-${theme}${js ? "-js" : ""}.jpg`);
writeFileSync(name, Buffer.from(shot.result.data, "base64"));
console.log(name);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
ws.close(); proc.kill("SIGKILL"); try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
