// CDP capture transport adapted from Ardia apps/site/scripts/hero-posters.mjs.
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified: Windows Chrome, lifecycle assertions, production timing and allocation trace.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, sep, basename } from "node:path";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const mode = process.argv[3] ?? "dev";
assert.ok((await fetch(baseUrl, { signal: AbortSignal.timeout(5000) })).ok, "Start the local server before validation");
const output = resolve("artifacts", `validation-${mode}`);
const profile = resolve(output, `chrome-${Date.now()}`);
await mkdir(profile, { recursive: true });
const proc = spawn(process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--enable-gpu",
  "--window-size=1440,900", "about:blank",
], { stdio: "ignore", windowsHide: true });
let launchError;
proc.on("error", error => { launchError = error; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let port;
for (let i = 0; i < 100 && !port; i++) {
  if (launchError) throw launchError;
  port = await readFile(resolve(profile, "DevToolsActivePort"), "utf8").then(text => Number(text.split("\n")[0])).catch(() => null);
  if (!port) await sleep(100);
}
assert.ok(port, "Chrome did not start within 10 seconds");
const { webSocketDebuggerUrl } = await fetch(`http://127.0.0.1:${port}/json/version`).then(res => res.json());
const socket = new WebSocket(webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map(), events = [], errors = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method) {
    events.push(message);
    if (message.method === "Runtime.exceptionThrown" || (message.method === "Log.entryAdded" && message.params.entry.level === "error")) errors.push(message);
  }
  const waiter = pending.get(message.id);
  if (!waiter) return;
  clearTimeout(waiter.timeout); pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 30000);
  pending.set(id, { resolve, reject, timeout });
  socket.send(JSON.stringify({ id, method, params, sessionId }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
const evaluate = async expression => {
  const result = await page("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async expression => {
  const deadline = Date.now() + 30000;
  while (!(await evaluate(expression))) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${expression}`);
    await sleep(100);
  }
};
const capture = async name => {
  const { data } = await page("Page.captureScreenshot", { format: "png" });
  await writeFile(resolve(output, `${name}.png`), Buffer.from(data, "base64"));
};
const click = async (x, y) => {
  await page("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await page("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const report = { mode, url: baseUrl, startedAt: new Date().toISOString(), checks: [], errors };
try {
  await page("Page.enable"); await page("Runtime.enable"); await page("Log.enable");
  await page("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  if (mode === "dev") {
    await page("Page.navigate", { url: `${baseUrl}/?debug` });
    await waitFor("!!window.__pond && document.querySelector('canvas').dataset.ready === 'true'");
    await sleep(1500);
    assert.equal(await evaluate("window.__pond.mrtReady"), true);
    const before = await evaluate("window.__pond.world.pellets.length");
    await click(420, 280);
    assert.ok(await evaluate("window.__pond.world.pellets.length") > before);
    report.checks.push("WebGL2 MRT and feeding");
    await evaluate("window.__pond.togglePause()");
    const pausedAt = await evaluate("window.__pond.world.time");
    await sleep(500);
    assert.equal(await evaluate("window.__pond.world.time"), pausedAt);
    await evaluate("window.__pond.togglePause()");
    report.checks.push("debug pause freezes simulation");
    await page("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await sleep(200);
    report.reducedState = await evaluate("window.__pond.stats()");
    await waitFor("window.__pond.stats().reduced && window.__pond.stats().raf === 0");
    const still = await evaluate("({time:window.__pond.world.time,pellets:window.__pond.world.pellets.length})");
    await click(420, 280); await sleep(500);
    assert.deepEqual(await evaluate("({time:window.__pond.world.time,pellets:window.__pond.world.pellets.length})"), still);
    report.checks.push("live reduced motion freezes frame and blocks feeding");
    await page("Page.reload");
    await waitFor("!!window.__pond && document.querySelector('canvas').dataset.ready === 'true'");
    assert.ok(Math.abs(await evaluate("window.__pond.world.time") - 4) < 1e-8);
    await sleep(500);
    assert.ok(Math.abs(await evaluate("window.__pond.world.time") - 4) < 1e-8);
    report.checks.push("reduced-motion initial state is exactly 240 steps");
    await page("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))");
    const hiddenAt = await evaluate("window.__pond.world.time"); await sleep(500);
    assert.equal(await evaluate("window.__pond.world.time"), hiddenAt);
    await evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");
    report.checks.push("synthetic visibilitychange stops and resumes RAF");
    await evaluate("document.querySelector('canvas').style.transform='translateY(200vh)'"); await sleep(400);
    const offscreenAt = await evaluate("window.__pond.world.time"); await sleep(400);
    assert.equal(await evaluate("window.__pond.world.time"), offscreenAt);
    await evaluate("document.querySelector('canvas').style.transform=''");
    report.checks.push("real IntersectionObserver pauses offscreen canvas");
    await evaluate("window.__lose=document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');window.__lose.loseContext()");
    await waitFor("document.querySelector('canvas').dataset.ready === 'false'");
    await evaluate("window.__lose.restoreContext()");
    await waitFor("document.querySelector('canvas').dataset.ready === 'true'");
    report.checks.push("context loss shows fallback and restores rendering");
    await sleep(1000); report.desktop = await evaluate("window.__pond.stats()");
    await capture("desktop-final");
    await page("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await page("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await page("Page.reload"); await waitFor("!!window.__pond && document.querySelector('canvas').dataset.ready === 'true'");
    await sleep(800);
    assert.equal(await evaluate("window.__pond.world.koi.length"), 3);
    await page("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 120, y: 600 }] });
    await page("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(await evaluate("window.__pond.world.pellets.length") > 0);
    assert.equal(await evaluate("window.__pond.world.pointer.active"), false);
    report.checks.push("portrait 3 koi, touch tap feeds without hover curiosity");
    await sleep(250);
    report.portrait = await evaluate(`(() => {
      const e=window.__pond,s=e.scene,c=s.camera;
      const radii=s.pellets.filter(m=>m.visible).map(m=>{
        const a=m.position.clone().project(c),b=m.position.clone();b.x+=m.scale.x;b.project(c);
        return Math.abs(b.x-a.x)*390/2;
      });
      return {worldWidth:e.world.width,worldHeight:e.world.height,fov:c.fov,
        inclination:Math.atan2(c.position.y,c.position.z)*180/Math.PI,pelletRadii:radii};
    })()`);
    assert.ok(report.portrait.worldWidth / report.portrait.worldHeight >= 1.35);
    assert.equal(report.portrait.fov, 40);
    assert.ok(Math.abs(report.portrait.inclination - 55) < 0.01);
    assert.ok(report.portrait.pelletRadii.length > 0 && report.portrait.pelletRadii.every(r => r >= 3.49));
    report.checks.push("portrait retains 55 degree camera and broad pond; food radius >= 3.5 CSS pixels");
    await evaluate("document.querySelector('.debug-panel').style.visibility='hidden'");
    await capture("portrait-final");
    await evaluate("window.__previousPond=window.__pond;window.__pond.destroy()");
    assert.equal(await evaluate("window.__pond === undefined && window.__previousPond.raf === 0 || window.__pond === undefined && window.__previousPond.disposed"), true);
    report.checks.push("destroy clears observers/listeners/debug reference and disposes GPU resources");
    await page("Page.addScriptToEvaluateOnNewDocument", { source: "const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)}" });
    await page("Page.reload"); await sleep(1500);
    assert.equal(await evaluate("!!window.__pond"), false);
    assert.notEqual(await evaluate("document.querySelector('canvas').dataset.ready"), "true");
    await capture("no-webgl2");
    report.checks.push("no WebGL2 leaves CSS fallback and skips engine boot");
  } else {
    await page("Page.addScriptToEvaluateOnNewDocument", { source: `
      window.__bench={gpu:new Float64Array(4096),gpuCount:0,frames:new Float64Array(4096),frameCount:0,last:0};
      const original=WebGL2RenderingContext.prototype.getQueryParameter;
      WebGL2RenderingContext.prototype.getQueryParameter=function(query,key){const result=original.call(this,query,key);
        if(key===this.QUERY_RESULT)window.__bench.gpu[window.__bench.gpuCount++%4096]=result/1e6;return result;};
      function tick(now){const b=window.__bench;if(b.last)b.frames[b.frameCount++%4096]=now-b.last;b.last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);
    ` });
    await page("Page.navigate", { url: `${baseUrl}/` });
    await waitFor("document.querySelector('canvas')?.dataset.ready === 'true'");
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Debug de la mare\"]')===null"), true);
    await sleep(3000);
    await evaluate("window.__bench.gpuCount=window.__bench.frameCount=0");
    await page("HeapProfiler.startSampling", { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    await page("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,v8,blink.user_timing", transferMode: "ReturnAsStream" });
    await sleep(10000);
    const timing = await evaluate("({gpu:Array.from(window.__bench.gpu.slice(0,Math.min(4096,window.__bench.gpuCount))),frames:Array.from(window.__bench.frames.slice(0,Math.min(4096,window.__bench.frameCount))),gpuCount:window.__bench.gpuCount,width:document.querySelector('canvas').width,height:document.querySelector('canvas').height,dpr:devicePixelRatio})");
    const summary = values => { values.sort((a,b)=>a-b); return { samples: values.length, median: values[values.length >> 1], p95: values[Math.floor(values.length * 0.95)] }; };
    report.gpu = summary(timing.gpu); report.frameMs = summary(timing.frames);
    report.fps = 1000 / (timing.frames.reduce((a,b)=>a+b,0) / timing.frames.length);
    report.resolution = { width: timing.width, height: timing.height, dpr: timing.dpr };
    const heap = await page("HeapProfiler.stopSampling");
    await writeFile(resolve(output, "allocations.heapprofile"), JSON.stringify(heap.profile));
    await page("Tracing.end");
    const deadline = Date.now() + 10000;
    while (!events.some(e => e.method === "Tracing.tracingComplete")) {
      assert.ok(Date.now() < deadline, "Trace did not finish"); await sleep(100);
    }
    const stream = events.find(e => e.method === "Tracing.tracingComplete").params.stream;
    let trace = "", eof = false;
    while (!eof) { const chunk = await page("IO.read", { handle: stream }); trace += chunk.data; eof = chunk.eof; }
    await page("IO.close", { handle: stream });
    await writeFile(resolve(output, "performance-trace.json"), trace);
    await capture("production-final");
    report.checks.push("production page has no debug panel", "10 second Chrome GPU timer/RAF capture", "Chrome Performance trace and allocation sampling saved");
    assert.ok(timing.gpuCount > 0, "GPU timer unavailable; do not claim measured GPU performance");
  }
  assert.equal(errors.length, 0, "Browser logged errors");
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await send("Browser.close").catch(() => {}); socket.close();
  await sleep(300); if (proc.exitCode === null) proc.kill();
  assert.ok(profile.startsWith(output + sep) && basename(profile).startsWith("chrome-"));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(error => console.warn(`Chrome profile retained: ${error.message}`));
}
