// CDP capture transport adapted from Ardia apps/site/scripts/hero-posters.mjs.
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified: Windows Chrome, lifecycle assertions, production timing and allocation trace.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchChrome, sleep } from "./chrome.mjs";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const mode = process.argv[3] ?? "dev";
assert.ok((await fetch(baseUrl, { signal: AbortSignal.timeout(5000) })).ok, "Start the local server before validation");
const output = resolve("artifacts", `validation-${mode}`);
const { page, evaluate, waitFor, events, errors, close } = await launchChrome(output);
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
    await page("Network.enable");
    await page("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 1e6, uploadThroughput: 1e6 });
    await page("Page.addScriptToEvaluateOnNewDocument", { source: "window.__cls=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__cls+=entry.value}).observe({type:'layout-shift',buffered:true})" });
    await page("Page.navigate", { url: `${baseUrl}/?debug` });
    await waitFor("document.querySelector('.pond-poster img')?.complete && document.querySelector('.pond-poster img').naturalWidth>0 && document.querySelector('canvas')?.dataset.ready!=='true'");
    report.loadingPoster = await evaluate("({source:document.querySelector('.pond-poster img').currentSrc,opacity:getComputedStyle(document.querySelector('canvas')).opacity})");
    assert.ok(report.loadingPoster.source.includes("/pond/wide-"));
    assert.equal(report.loadingPoster.opacity, "0");
    await capture("loading-poster");
    await page("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await waitFor("!!window.__pond && document.querySelector('canvas').dataset.ready === 'true'");
    await sleep(1500);
    report.posterRequests = await evaluate("performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/pond/')&&entry.name.endsWith('.webp')).map(entry=>entry.name)");
    assert.equal(new Set(report.posterRequests).size, 1, "Download only the matching poster, without a second fallback image");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('canvas')).transitionDuration"), "0.6s");
    assert.ok(await evaluate("window.__cls") < 0.001);
    report.cycle = await evaluate("({hour:window.__pond.hour,time:window.__pond.world.time,running:window.__pond.cycleRunning,seconds:window.__pond.stats().cycleSeconds})");
    assert.equal(report.cycle.seconds, 480);
    assert.equal(report.cycle.running, true);
    assert.ok(Math.abs(report.cycle.hour - 10 - report.cycle.time * 24 / 480) < 0.00001);
    report.checks.push("poster paints before engine on slow connection; 600 ms fade and no layout shift");
    assert.equal(await evaluate("window.__pond.mrtReady"), true);
    const before = await evaluate("window.__pond.world.pellets.length");
    await click(420, 280);
    assert.ok(await evaluate("window.__pond.world.pellets.length") > before);
    report.checks.push("WebGL2 MRT and feeding");
    await evaluate("window.__pond.togglePause()");
    const pausedAt = await evaluate("window.__pond.world.time");
    const pausedHour = await evaluate("window.__pond.hour");
    await sleep(500);
    assert.equal(await evaluate("window.__pond.world.time"), pausedAt);
    assert.equal(await evaluate("window.__pond.hour"), pausedHour);
    report.lighting = [];
    for (const [name, hour] of [["dawn",6],["day",12],["dusk",18],["night",0]]) {
      await evaluate(`window.__pond.setHour(${hour})`);
      await sleep(450);
      const state = await evaluate(`(() => {
        const e=window.__pond,s=e.scene,w=s.target.width,h=s.target.height,pixels=new Uint8Array(w*h*4);
        s.renderer.readRenderTargetPixels(s.target,0,0,w,h,pixels);
        let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]*0.2126+pixels[i+1]*0.7152+pixels[i+2]*0.0722;
        let reflection=null;
        if(e.hour===12||e.hour===0){
          const mask=new Uint8Array(pixels.length),off=new Uint8Array(pixels.length),regions=new Uint8Array(pixels.length);
          s.renderer.readRenderTargetPixels(s.opaque,0,0,w,h,mask,undefined,1);
          s.renderer.readRenderTargetPixels(s.target,0,0,w,h,regions,undefined,1);
          s.water.uniforms.uReflectionStrength.value=0;e.setHour(e.hour);
          s.renderer.readRenderTargetPixels(s.target,0,0,w,h,off);
          let changed=0,protectedPixels=0,discPixels=0;
          for(let i=0;i<pixels.length;i+=4){
            const delta=Math.abs(pixels[i]-off[i])+Math.abs(pixels[i+1]-off[i+1])+Math.abs(pixels[i+2]-off[i+2]);
            if(delta>6){changed++;if(mask[i+3]>80)protectedPixels++}
            if(Math.abs(regions[i+3]/255-0.24)<0.01)discPixels++;
          }
          reflection={changed,protectedPixels,discPixels,sun:s.water.uniforms.uSunVisibility.value,moon:s.water.uniforms.uMoonVisibility.value};
          s.water.uniforms.uReflectionStrength.value=1;e.setHour(e.hour);
        }
        return {hour:e.hour,running:e.cycleRunning,luminance:sum/(w*h),water:s.uniforms.uWater.value.toArray(),
          reflection,
          plants:s.decoration.children.filter(m=>m.name==='shore-flowers'||m.name==='pond-algae').map(m=>m.name)};
      })()`);
      assert.equal(state.hour, hour); assert.equal(state.running, false);
      assert.equal(state.plants.length, 2);
      report.lighting.push({ name, ...state });
      await capture(`cycle-${name}`);
    }
    assert.ok(report.lighting[3].luminance < report.lighting[1].luminance * 0.75);
    assert.ok(report.lighting[3].luminance > report.lighting[1].luminance * 0.1);
    assert.equal(new Set(report.lighting.map(s=>s.water.join(','))).size, 4);
    for(const state of [report.lighting[1],report.lighting[3]]){
      assert.ok(state.reflection.changed>100 && state.reflection.discPixels>100);
      assert.equal(state.reflection.protectedPixels,0,"Celestial reflections must stay off fish, pads and banks");
    }
    assert.equal(report.lighting[1].reflection.sun,1);assert.equal(report.lighting[3].reflection.moon,1);
    report.reflectionPath=[];
    for(const hour of [9,15]){
      await evaluate(`window.__pond.setHour(${hour})`);
      const center=await evaluate(`(()=>{const s=window.__pond.scene,w=s.target.width,h=s.target.height,p=new Uint8Array(w*h*4);
        s.renderer.readRenderTargetPixels(s.target,0,0,w,h,p,undefined,1);let sum=0,count=0;
        for(let i=0;i<p.length;i+=4)if(Math.abs(p[i+3]/255-0.24)<0.01){sum+=(i/4)%w;count++}
        return {x:sum/count,width:w,count};})()`);
      assert.ok(center.count>100);report.reflectionPath.push({hour,...center});
    }
    assert.ok(report.reflectionPath[1].x-report.reflectionPath[0].x>report.reflectionPath[0].width*0.2);
    report.checks.push("visible sun/moon discs and moving solar reflection verified by GPU pixels; fish/pads/banks untouched");
    await evaluate("window.__pond.setHour(23.99);window.__pond.toggleCycle();window.__pond.togglePause()");
    await sleep(500);
    assert.ok(await evaluate("window.__pond.hour") < 1);
    await evaluate("window.__pond.setHour(10);window.__pond.toggleCycle()");
    report.checks.push("480 second cycle advances and wraps midnight; manual dawn/day/dusk/night stay readable with vegetation");
    report.checks.push("debug pause freezes simulation");
    await page("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await sleep(200);
    report.reducedState = await evaluate("window.__pond.stats()");
    await waitFor("window.__pond.stats().reduced && window.__pond.stats().raf === 0");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('canvas')).transitionDuration"), "0s");
    const still = await evaluate("({time:window.__pond.world.time,hour:window.__pond.hour,pellets:window.__pond.world.pellets.length})");
    await click(420, 280); await sleep(500);
    assert.deepEqual(await evaluate("({time:window.__pond.world.time,hour:window.__pond.hour,pellets:window.__pond.world.pellets.length})"), still);
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
    await sleep(650);
    assert.ok(await evaluate("document.querySelector('.pond-poster img').naturalWidth>0 && Number(getComputedStyle(document.querySelector('canvas')).opacity)<0.01"));
    await capture("context-lost-poster");
    await evaluate("window.__lose.restoreContext()");
    await waitFor("document.querySelector('canvas').dataset.ready === 'true'");
    report.checks.push("context loss shows fallback and restores rendering");
    await sleep(1000);
    report.school = await evaluate(`(() => {
      const e=window.__pond;e.togglePause();
      const s=e.scene,shadows=s.decoration.children.filter(m=>m.name==='koi-shadow');
      e.setView('scene');
      const w=s.target.width,h=s.target.height,on=new Uint8Array(w*h*4),off=new Uint8Array(on.length);
      s.renderer.readRenderTargetPixels(s.target,0,0,w,h,on);
      for(const mesh of shadows)mesh.visible=false;
      e.setView('scene');s.renderer.readRenderTargetPixels(s.target,0,0,w,h,off);
      let changed=0;for(let i=0;i<on.length;i+=4)if(off[i]+off[i+1]+off[i+2]-on[i]-on[i+1]-on[i+2]>12)changed++;
      for(const mesh of shadows)mesh.visible=true;
      e.setView('final');e.togglePause();
      const lengths=e.world.koi.map(k=>k.length);
      return {varieties:e.world.koi.map(k=>k.variety),sizeRatio:Math.max(...lengths)/Math.min(...lengths),
        shadows:shadows.length,shadowPixels:changed};
    })()`);
    assert.equal(new Set(report.school.varieties).size, 7);
    assert.ok(report.school.sizeRatio > 2);
    assert.equal(report.school.shadows, report.school.varieties.length);
    assert.ok(report.school.shadowPixels > 100, "Fish shadows must darken visible bottom pixels");
    report.checks.push("seven coat varieties, >2x size range and fish shadows verified by GPU pixel comparison");
    report.desktop = await evaluate("window.__pond.stats()");
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
    await waitFor("document.querySelector('.pond-poster img').complete && document.querySelector('.pond-poster img').naturalWidth>0");
    assert.ok((await evaluate("document.querySelector('.pond-poster img').currentSrc")).includes("/pond/phone-"));
    await capture("no-webgl2");
    report.checks.push("no WebGL2 shows the mobile poster and skips engine boot");
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
  await page("Emulation.setScriptExecutionDisabled", { value: true });
  report.staticPosters = [];
  for (const [width, height, name] of [[2400,1000,"ultrawide"],[1440,900,"wide"],[1024,900,"mid"],[768,1024,"tablet"],[390,844,"phone"]]) {
    await page("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < height });
    await page("Page.reload");
    await waitFor("document.querySelector('.pond-poster img')?.complete && document.querySelector('.pond-poster img').naturalWidth>0");
    const source = await evaluate("document.querySelector('.pond-poster img').currentSrc");
    assert.ok(source.includes(`/pond/${name}-`), source);
    assert.notEqual(await evaluate("document.querySelector('canvas').dataset.ready"), "true");
    const requests = await evaluate("performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/pond/')&&entry.name.endsWith('.webp')).map(entry=>entry.name)");
    assert.equal(new Set(requests).size, 1);
    report.staticPosters.push({ width, height, source, font: await evaluate("getComputedStyle(document.querySelector('p')).fontFamily") });
    if (name === "wide" || name === "phone") await capture(`no-js-${name}`);
  }
  report.checks.push("server-rendered responsive posters work without JavaScript in all five framings; one image per visit");
  assert.equal(errors.length, 0, "Browser logged errors");
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await close();
}
