// Load a page in headless Chromium over the DevTools protocol and report what a stub test cannot:
// console errors, uncaught exceptions, CSP violations, failed or blocked requests, a screenshot,
// and the result of one JS expression run in the page.
//
// usage:  node cdp_check.mjs <url> <out.png> [width=1280] [height=800]
// env:    EVALX  JS expression to run in the page (returns a string); default counts markers/canvases
//         WAIT_MS  time to wait after navigation, default 25000 (software WebGL is slow)
// needs:  Node 22+ (global WebSocket and fetch), `nix shell nixpkgs#chromium`.
// Serve the page first (a static server that sends the real CSP header, not file://).
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, png, w = "1280", h = "800"] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const env = { ...process.env, XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || "/tmp/nixcache-cdp" };
const chr = spawn(
  "nix",
  ["shell", "nixpkgs#chromium", "--command", "chromium", "--headless=new", "--no-sandbox",
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars",
    `--user-data-dir=/tmp/chr-cdp-${port}`, `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, "about:blank"],
  { env, stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  if (!target) await sleep(1000);
}
if (!target) { console.log("chromium did not start"); chr.kill(); process.exit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const log = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); return; }
  const p = d.params ?? {};
  if (d.method === "Runtime.consoleAPICalled") log.push(`console.${p.type}: ` + p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  if (d.method === "Runtime.exceptionThrown") log.push("EXCEPTION: " + (p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).slice(0, 400));
  if (d.method === "Log.entryAdded") log.push(`log.${p.entry.level}: ${p.entry.text} ${p.entry.url ?? ""}`.slice(0, 300));
  if (d.method === "Network.loadingFailed") log.push(`NETFAIL: ${p.errorText} blocked=${p.blockedReason ?? ""}`);
  if (d.method === "Network.responseReceived" && p.response.status >= 400) log.push(`HTTP ${p.response.status}: ${p.response.url}`.slice(0, 200));
  if (d.method === "Network.requestWillBeSent") log.push(`req: ${p.request.url}`.slice(0, 160));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
for (const m of ["Runtime", "Log", "Network", "Page"]) await send(`${m}.enable`);
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 500 });
await send("Page.navigate", { url });
await sleep(Number(process.env.WAIT_MS || 25000));
writeFileSync(png, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
const expr = process.env.EVALX || "JSON.stringify({markers:document.querySelectorAll('[class*=marker]').length,canvas:document.querySelectorAll('canvas').length})";
console.log("EVAL:", (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.value);
const uniq = [...new Set(log)];
console.log(uniq.filter((l) => !l.startsWith("req:")).join("\n") || "(no console, CSP or network problems)");
console.log("other origins:", [...new Set(uniq.filter((l) => l.startsWith("req:") && !l.includes("127.0.0.1") && !l.includes("data:")).map((l) => new URL(l.slice(5)).origin))].join(" "));
ws.close(); chr.kill(); process.exit(0);
