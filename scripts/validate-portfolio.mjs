import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { launchChrome, sleep } from "./chrome.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:3000";
const output = resolve("artifacts/portfolio");
const { page, evaluate, waitFor, errors, close } = await launchChrome(output);
const report = { contrast: [], layouts: [], checks: [], errors };
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const capture = async name => {
  const { data } = await page("Page.captureScreenshot", { format: "png" });
  const buffer = Buffer.from(data, "base64");
  await writeFile(resolve(output, `${name}.png`), buffer);
  return buffer;
};
try {
  await page("Page.enable"); await page("Runtime.enable"); await page("Log.enable");
  for (const [width, height] of [[1440, 900], [390, 844], [320, 740], [844, 390]]) {
    await page("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await page("Page.navigate", { url: `${url}/?debug` });
    await waitFor("!!window.__pond && document.querySelector('.debug-panel') && document.querySelector('canvas').dataset.ready==='true'");
    await evaluate("window.__pond.togglePause();document.querySelector('.debug-panel').style.display='none';const style=document.createElement('style');style.textContent='nextjs-portal{display:none !important}';document.head.append(style)");
    await sleep(650);
    const layout = await evaluate(`({width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth,documentWidth:document.documentElement.scrollWidth,
      headings:document.querySelectorAll('h1').length,links:[...document.querySelectorAll('nav a')].map(a=>a.getAttribute('href')),
      hero:document.querySelector('.hero').getBoundingClientRect().height})`);
    assert.equal(layout.width, width); assert.equal(layout.documentWidth, layout.clientWidth); assert.equal(layout.headings, 1);
    assert.deepEqual(layout.links, ["#mare", "#projets", "https://www.linkedin.com/in/nathan-toto/", "https://github.com/LazzyPurple", "mailto:nathan.toto@proton.me"]);
    report.layouts.push(layout);
    for (const hour of width > 800 && height < 500 || width === 320 ? [12] : [0, 6, 12, 18]) {
      await evaluate(`window.__pond.setHour(${hour})`);
      const tone = await evaluate("document.querySelector('.hero').dataset.tone");
      assert.equal(tone, hour >= 7 && hour < 19 ? "day" : "night");
      const regions = await evaluate(`([...document.querySelectorAll('.display-title span,.hero-description > p,.hero-description > a,.hero-copy > .eyebrow,.site-header nav > a,.wordmark')].map(el=>{
        const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect();
        return {text:el.textContent,x:b.x,y:b.y,width:b.width,height:b.height,color:getComputedStyle(el).color,large:el.closest('h1')!==null};
      }))`);
      await capture(`${width}-${height}-${hour}`);
      await evaluate("document.querySelectorAll('.site-header,.hero-copy,.hero-bottom').forEach(el=>el.style.visibility='hidden')");
      const { data, info } = await sharp(await capture(`background-${width}-${height}-${hour}`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (const region of regions) {
        const foreground = luminance(region.color.match(/[\d.]+/g).slice(0, 3).map(Number));
        let minimum = Infinity;
        for (let y = Math.max(0, Math.floor(region.y)); y < Math.min(info.height, region.y + region.height); y += 2) {
          for (let x = Math.max(0, Math.floor(region.x)); x < Math.min(info.width, region.x + region.width); x += 2) {
            const i = (y * info.width + x) * 3;
            const background = luminance([data[i], data[i + 1], data[i + 2]]);
            minimum = Math.min(minimum, (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05));
          }
        }
        if (Number.isFinite(minimum)) {
          assert.ok(minimum >= (region.large ? 3 : 4.5), `${width}px ${hour}h ${region.text}: contrast ${minimum}`);
          report.contrast.push({ width, height, hour, tone, text: region.text, minimum: Number(minimum.toFixed(2)) });
        }
      }
      await evaluate("document.querySelectorAll('.site-header,.hero-copy,.hero-bottom').forEach(el=>el.style.visibility='')");
    }
    await evaluate("window.scrollTo({top:document.querySelector('#projets').offsetTop+1,behavior:'instant'});window.__pond.togglePause()");
    await waitFor("!window.__pond.stats().visible && window.__pond.stats().raf===0");
    const stoppedAt = await evaluate("window.__pond.world.time");
    await page("Input.dispatchMouseEvent", { type: "mouseMoved", x: 100, y: 100 });
    assert.equal(await evaluate("window.__pond.world.pointer.active"), false);
    await sleep(300);
    assert.equal(await evaluate("window.__pond.world.time"), stoppedAt);
    await evaluate("document.querySelectorAll('.project-image img').forEach(i=>i.loading='eager')");
    await waitFor("[...document.querySelectorAll('.project-image img')].every(i=>i.complete && i.naturalWidth>0)");
    await capture(`projects-${width}-${height}`);
    const gallery = await evaluate("({display:getComputedStyle(document.querySelector('.project-gallery')).display,overflow:document.querySelector('.project-gallery').scrollWidth>document.querySelector('.project-gallery').clientWidth})");
    assert.equal(gallery.display, width <= 800 ? "grid" : "flex");
    if (width > 800) assert.equal(gallery.overflow, true);
    await evaluate("document.querySelector('.project summary').click()");
    assert.equal(await evaluate("document.querySelector('.project details').open"), true);
    await evaluate("document.querySelector('#mare').scrollIntoView({behavior:'instant'})");
    await waitFor("window.__pond.stats().visible && window.__pond.stats().raf!==0");
  }
  report.checks.push("No horizontal page overflow at 320, 390, 844 and 1440px; 5 header links; desktop strip and mobile list; cases expand; pond pauses offscreen and resumes");
  await page("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(200);
  report.reducedState = await evaluate("window.__pond.stats()");
  await waitFor("window.__pond.stats().reduced && window.__pond.stats().raf===0");
  assert.equal(await evaluate("getComputedStyle(document.documentElement).scrollBehavior"), "auto");
  report.checks.push("Reduced motion stops the pond and disables smooth scrolling");
  await page("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page("Emulation.setScriptExecutionDisabled", { value: true });
  await page("Page.navigate", { url }); await sleep(1500);
  assert.equal(await evaluate("document.querySelectorAll('.project').length"), 3);
  assert.equal(await evaluate("document.querySelector('.pond-poster img').naturalWidth>0"), true);
  await capture("no-javascript");
  report.checks.push("Hero, poster, links and cases work without JavaScript");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await close();
}
