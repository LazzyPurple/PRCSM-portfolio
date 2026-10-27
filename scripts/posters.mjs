// First-frame capture and budgeted WebP encoding adapted from Ardia apps/site/scripts/hero-posters.mjs.
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified: our procedural pond only, responsive framing, fixed capture seed and public assets.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { launchChrome } from "./chrome.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:3000/";
assert.ok((await fetch(url, { signal: AbortSignal.timeout(5000) })).ok, "Start the pond server before capturing posters");
const SEED = 80210;
const QUALITY_MIN = 40;
const QUALITY_MAX = 70;
const OWNED_FILE = /^(ultrawide|wide|mid|tablet|phone)-\d+\.webp$/;
const FRAMES = [
  { name: "ultrawide", media: "(min-aspect-ratio: 2/1)", width: 2400, height: 1000, widths: [1280, 1920, 2400], budget: 160 * 1024 },
  { name: "wide", media: "(min-aspect-ratio: 4/3)", width: 1440, height: 900, widths: [960, 1440, 1920], budget: 140 * 1024 },
  { name: "mid", media: "(min-aspect-ratio: 1/1)", width: 1024, height: 900, widths: [768, 1280, 1600], budget: 120 * 1024 },
  { name: "tablet", media: "(min-aspect-ratio: 3/5)", width: 768, height: 1024, widths: [768, 1200], budget: 100 * 1024 },
  { name: "phone", media: "", width: 390, height: 844, widths: [390, 700], budget: 60 * 1024 },
];
const output = resolve("public/pond");
await mkdir(output, { recursive: true });
const chrome = await launchChrome("artifacts/posters");
const { page, evaluate, waitFor } = chrome;
const manifest = { generatedAt: new Date().toISOString(), baseRevision: "", seed: SEED, browser: "", frames: [] };

try {
  manifest.baseRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  manifest.browser = (await chrome.send("Browser.getVersion")).product;
  await page("Page.enable"); await page("Runtime.enable"); await page("Log.enable");
  await page("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page("Page.addScriptToEvaluateOnNewDocument", { source: `
    let seed=${SEED};Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,options){return getContext.call(this,type,type==='webgl2'?{...options,preserveDrawingBuffer:true}:options)};
    window.__poster=null;
    const observer=new MutationObserver(()=>{
      const canvas=document.querySelector('.pond-canvas[data-ready="true"]');
      if(!canvas||window.__poster)return;
      window.__poster={png:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height};observer.disconnect();
    });observer.observe(document,{subtree:true,attributes:true,attributeFilter:['data-ready']});
  ` });
  for (const frame of FRAMES) {
    const mobile = frame.width < frame.height;
    await page("Emulation.setDeviceMetricsOverride", { width: frame.width, height: frame.height, screenWidth: frame.width, screenHeight: frame.height, deviceScaleFactor: 2, mobile });
    await page("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: 1 });
    await page("Page.navigate", { url });
    await waitFor("!!window.__poster");
    const first = await evaluate("window.__poster");
    const png = Buffer.from(first.png.split(",")[1], "base64");
    const encode = (width, quality) => sharp(png).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
    let largest = Math.min(first.width, Math.max(...frame.widths));
    while ((await encode(largest, QUALITY_MIN)).length > frame.budget) {
      largest = Math.floor(largest * 0.9);
      assert.ok(largest >= 64, "Poster byte budget is too small");
    }
    let low = QUALITY_MIN, high = QUALITY_MAX;
    while (low < high) {
      const quality = Math.ceil((low + high) / 2);
      if ((await encode(largest, quality)).length <= frame.budget) low = quality; else high = quality - 1;
    }
    const files = [];
    for (const width of [...new Set(frame.widths.map(w => Math.min(w, largest)))]) {
      const buffer = await encode(width, low), file = `/pond/${frame.name}-${width}.webp`;
      const meta = await sharp(buffer).metadata();
      assert.ok(buffer.length <= frame.budget && meta.width === width);
      await writeFile(resolve(output, file.split("/").pop()), buffer);
      files.push({ file, width, height: meta.height, bytes: buffer.length, quality: low });
    }
    manifest.frames.push({ name: frame.name, media: frame.media, width: frame.width, height: frame.height,
      captureWidth: first.width, captureHeight: first.height, captureSha256: createHash("sha256").update(png).digest("hex"), budget: frame.budget, files });
    console.log(`${frame.name}: ${files.map(f => `${f.width}w ${(f.bytes / 1024).toFixed(1)} KiB q${f.quality}`).join(", ")}`);
  }
  assert.equal(chrome.errors.length, 0, "Chrome logged errors while capturing posters");
  const current = new Set(manifest.frames.flatMap(frame => frame.files.map(file => file.file.split("/").pop())));
  for (const name of await readdir(output)) if (OWNED_FILE.test(name) && !current.has(name)) await unlink(resolve(output, name));
  await writeFile(resolve("src/pond/posters.json"), JSON.stringify(manifest, null, 2) + "\n");
} finally { await chrome.close(); }
