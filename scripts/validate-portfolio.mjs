import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchChrome, sleep } from "./chrome.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:3000";
const output = resolve("artifacts/portfolio-v2");
const { page, evaluate, waitFor, errors, close } = await launchChrome(output);
const report = { layouts: [], themes: [], cases: [], checks: [], errors };
const capture = async (name, full = false) => {
  const { cssContentSize } = full ? await page("Page.getLayoutMetrics") : {};
  const clip = full ? { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } : undefined;
  const { data } = await page("Page.captureScreenshot", { format: "png", captureBeyondViewport: full, clip });
  const buffer = Buffer.from(data, "base64");
  await writeFile(resolve(output, name + ".png"), buffer);
  return buffer;
};
const click = async selector => {
  const point = await evaluate("(()=>{const b=document.querySelector(" + JSON.stringify(selector) + ").getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()");
  await page("Input.dispatchMouseEvent", { ...point, type: "mousePressed", button: "left", clickCount: 1 });
  await page("Input.dispatchMouseEvent", { ...point, type: "mouseReleased", button: "left", clickCount: 1 });
};
const wheel = deltaY => page("Input.dispatchMouseEvent", { type: "mouseWheel", x: 200, y: 300, deltaX: 0, deltaY });
const prepare = async () => {
  await waitFor("!!window.__pond && document.querySelector('.debug-panel') && document.querySelector('canvas').dataset.ready==='true'");
  await evaluate("window.__pond.togglePause();document.querySelector('.debug-panel').style.display='none';const s=document.createElement('style');s.textContent='nextjs-portal{display:none!important}';document.head.append(s)");
  await sleep(650);
};
try {
  await page("Page.enable"); await page("Runtime.enable"); await page("Log.enable");
  // Mobile has dedicated touch, menu and per-project snap checks in validate-mobile.mjs.
  for (const [width, height] of [[1440,900],[1024,900]]) {
    await page("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await page("Page.navigate", { url: url + "/?debug" }); await prepare();
    await evaluate("localStorage.removeItem('pond-theme');document.documentElement.dataset.theme='dark'");
    const layout = await evaluate(`({
      width:innerWidth,height:innerHeight,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      sections:[...document.querySelectorAll('.snap-section')].map(el=>el.getBoundingClientRect().height),
      snap:getComputedStyle(document.documentElement).scrollSnapType,theme:document.documentElement.dataset.theme,
      canvas:document.querySelector('canvas').getBoundingClientRect().height,
      headerBackground:getComputedStyle(document.querySelector('.site-header')).backgroundColor,
      title:document.querySelector('h1').textContent,headerText:document.querySelector('.site-header').textContent,
      counter:document.querySelector('.project-count')!==null,details:document.querySelectorAll('details').length,
      cycle:window.__pond.stats().cycleSeconds})`);
    assert.equal(layout.client,layout.scroll); assert.deepEqual(layout.sections,[height,height,height]);
    assert.equal(layout.snap,"y mandatory"); assert.equal(layout.theme,"dark"); assert.equal(layout.cycle,480);
    assert.equal(layout.headerBackground,"rgba(0, 0, 0, 0)"); assert.ok(!layout.headerText.includes("Nathan"));
    assert.equal(layout.counter,false); assert.equal(layout.details,0); assert.equal(layout.title,"Hi, I’mNathan TOTO");
    assert.equal(layout.canvas,height+80); report.layouts.push(layout);
    if (width===1440 || width===390) {
      for (const theme of ["dark","light"]) {
        if (await evaluate("document.documentElement.dataset.theme")!==theme) await click(".theme-toggle");
        for (const hour of [12,0]) {
          await evaluate("window.__pond.setHour("+hour+")");
          assert.equal(await evaluate("document.documentElement.dataset.theme"),theme);
          const copy = await evaluate("(()=>{const el=document.querySelector('.hero-copy'),s=getComputedStyle(el),b=el.getBoundingClientRect();return {background:s.backgroundColor,before:getComputedStyle(el,'::before').content,left:b.left,right:b.right,bottom:b.bottom,shadow:s.textShadow}})()");
          assert.equal(copy.background,"rgba(0, 0, 0, 0)"); assert.equal(copy.before,"none");
          assert.ok(copy.left<width/2 && copy.right<=width && copy.bottom<=height);
          assert.notEqual(copy.shadow,"none");
          await capture(width+"-"+theme+"-"+hour);
          report.themes.push({width,theme,hour,copy});

        }
      }
    }
    await evaluate("window.scrollTo({top:0,behavior:'instant'})"); await wheel(height);
    await waitFor("Math.abs(document.querySelector('#projets').getBoundingClientRect().top)<2");
    const desktop=width>=1024;
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.projects-desktop')).display"),desktop?"flex":"none");
    await evaluate("document.querySelectorAll('#projets img').forEach(el=>el.loading='eager')");
    await waitFor("[...document.querySelectorAll(" + JSON.stringify(desktop?".dao-strip img":".projects-mobile img") + ")].every(el=>el.complete&&el.naturalWidth>0)");
    await capture("projects-"+width);
    if(desktop) {
      await wheel(600); await sleep(700);
      assert.ok(await evaluate("document.querySelector('.dao-strip').scrollLeft")>500);
      assert.ok(await evaluate("Math.abs(scrollY-innerHeight)")<2);
      await evaluate("const strip=document.querySelector('.dao-strip');strip.scrollLeft=strip.scrollWidth");
    } else {
      await wheel(500); await sleep(300);
      assert.ok(await evaluate("document.querySelector('.projects-mobile').scrollTop")>100);
      assert.ok(await evaluate("Math.abs(scrollY-innerHeight)")<2);
      await evaluate("const list=document.querySelector('.projects-mobile');list.scrollTop=list.scrollHeight");
    }
    await wheel(height);
    await waitFor("Math.abs(document.querySelector('#contact').getBoundingClientRect().top)<2");
    await waitFor("window.__pond.stats().raf===0 && !window.__pond.stats().visible");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('footer')).backgroundColor"),"rgb(216, 204, 238)");
    await capture("footer-"+width);
  }
  report.checks.push("Desktop: exact full-screen snap sections, visible pond bleed, transparent header, copy bottom-left without background, no counter/name/inline cases; wheel strip releases to violet footer");
  await evaluate("localStorage.removeItem('pond-theme')");
  await page("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await page("Page.navigate",{url:url+"/?debug"}); await prepare();
  assert.equal(await evaluate("document.documentElement.dataset.theme"),"dark");
  await click(".theme-toggle"); await page("Page.reload"); await prepare();
  assert.equal(await evaluate("document.documentElement.dataset.theme"),"light");
  await evaluate("window.scrollTo({top:innerHeight,behavior:'instant'})");
  await waitFor("Math.abs(document.querySelector('#projets').getBoundingClientRect().top)<2");
  await click('.dao-strip a[href="/projects/cephalee"]');
  await waitFor("location.pathname==='/projects/cephalee' && document.querySelector('h1')?.textContent==='Céphalée'");
  await waitFor("!document.documentElement.dataset.transition");
  assert.equal(await evaluate("window.__pond===undefined"),true);
  assert.equal(await evaluate("document.documentElement.dataset.theme"),"light");
  assert.equal(await evaluate("getComputedStyle(document.documentElement).scrollSnapType"),"none");
  await capture("project-cephalee-light");
  for (const [width, height, theme] of [[1440,900,"dark"],[390,844,"dark"],[390,844,"light"],[320,740,"dark"]]) {
    await page("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<1024});
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};window.scrollTo({top:0,behavior:'instant'});document.querySelectorAll('main img').forEach(el=>el.loading='eager')`);
    await waitFor("[...document.querySelectorAll('main img')].every(el=>el.complete && el.naturalWidth>0)");
    const story = await evaluate(`({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      title:document.querySelector('h1').textContent,figures:document.querySelectorAll('figure').length,
      screens:[...document.querySelectorAll('figure img')].map(el=>({alt:el.alt,ratio:el.getBoundingClientRect().width/el.getBoundingClientRect().height,fit:getComputedStyle(el).objectFit})),
      fullViews:document.querySelectorAll('figure a[target="_blank"]').length,
      sources:[...document.querySelectorAll('main section a')].map(el=>el.href),
      note:document.querySelector('main header').textContent})`);
    assert.equal(story.client,story.scroll); assert.equal(story.title,"Céphalée");
    assert.equal(story.figures,4); assert.equal(story.fullViews,4);
    assert.ok(story.screens.every(screen=>screen.alt.length>30 && Math.abs(screen.ratio-1067/1600)<0.005 && screen.fit!=="cover"));
    assert.ok(story.sources.some(href=>href.includes("1553340")));
    assert.ok(story.sources.some(href=>href.includes("cnil.fr")));
    assert.ok(story.sources.some(href=>href.includes("esante.gouv.fr")));
    assert.ok(!story.note.includes("fictif"));
    report.cases.push({width,height,theme,...story});
    await capture(`cephalee-${width}-${theme}`,true);
    if(width===390 && theme==="dark") {
      await evaluate("document.querySelector('#cephalee-screens').scrollIntoView({behavior:'instant'})");
      await capture("cephalee-mobile-screens");
    }
  }
  await page("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("document.documentElement.dataset.theme='light'");
  const caseHtml = await fetch(url+"/projects/cephalee").then(response=>response.text());
  assert.ok(caseHtml.includes("Deux interfaces, un même fil de suivi."));
  assert.ok(caseHtml.includes("/projects/cephalee/partage.webp"));
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('—')"),false);
  report.checks.push("Céphalée: real cover, four uncropped supplied screens, full-size links, external sources, server-rendered decision narrative; 1440/390/320 px, dark/light, no overflow");
  await evaluate("document.querySelector('.project-pager').scrollIntoView({behavior:'instant'})");
  await click('.project-pager a[href="/projects/mousse"]');
  await waitFor("location.pathname==='/projects/mousse' && document.querySelector('h1')?.textContent==='Mousse'");
  await waitFor("!document.documentElement.dataset.transition");
  for (const [width,height,theme] of [[1440,900,"dark"],[390,844,"dark"],[390,844,"light"],[320,740,"dark"]]) {
    await page("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<1024});
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};window.scrollTo({top:0,behavior:'instant'});document.querySelectorAll('main img').forEach(el=>el.loading='eager')`);
    await waitFor("[...document.querySelectorAll('main img')].every(el=>el.complete && el.naturalWidth>0)");
    const story = await evaluate(`({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      title:document.querySelector('h1').textContent,note:document.querySelector('main header').textContent,
      body:document.querySelector('main').textContent,fullViews:document.querySelectorAll('figure a[target="_blank"]').length,
      screens:[...document.querySelectorAll('figure img')].map(el=>({alt:el.alt,ratio:el.getBoundingClientRect().width/el.getBoundingClientRect().height,sourceRatio:Number(el.getAttribute('width'))/Number(el.getAttribute('height')),fit:getComputedStyle(el).objectFit}))})`);
    assert.equal(story.client,story.scroll); assert.equal(story.title,"Mousse");
    assert.ok(story.note.includes("projet personnel") && story.note.includes("quotidien"));
    assert.ok(!story.note.includes("fictif")); assert.equal(story.fullViews,4); assert.equal(story.screens.length,4);
    assert.ok(story.screens.every(screen=>screen.alt.length>30 && Math.abs(screen.ratio-screen.sourceRatio)<0.005 && screen.fit!=="cover"));
    assert.ok(story.body.includes("Gemma E4B") && story.body.includes("Gemma 12B") && story.body.includes("second brain"));
    assert.ok(!story.body.includes("—"));
    report.cases.push({width,height,theme,...story});
    await capture(`mousse-${width}-${theme}-intro`);
    await capture(`mousse-${width}-${theme}`,true);
  }
  const mousseHtml = await fetch(url+"/projects/mousse").then(response=>response.text());
  assert.ok(mousseHtml.includes("Un projet qui part de mon quotidien"));
  assert.ok(mousseHtml.includes("/projects/mousse/second-brain.webp"));
  report.checks.push("Mousse: personal daily-use project, five supplied visuals, four uncropped full-size figures, local Gemma, reminders/habits/widgets/second brain; 1440/390/320 px, dark/light, server-rendered story, no overflow; Céphalée em dashes removed");
  await page("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("document.querySelector('.project-pager').scrollIntoView({behavior:'instant'})");
  await click('.project-pager a[href="/projects/groovenomad"]');
  await waitFor("location.pathname==='/projects/groovenomad' && document.querySelector('h1')?.textContent==='GrooveNomad'");
  await waitFor("!document.documentElement.dataset.transition");
  for (const [width,height,theme] of [[1440,900,"dark"],[390,844,"dark"],[390,844,"light"],[320,740,"dark"]]) {
    await page("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<1024});
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};window.scrollTo({top:0,behavior:'instant'});document.querySelectorAll('main img').forEach(el=>el.loading='eager')`);
    await waitFor("[...document.querySelectorAll('main img')].every(el=>el.complete && el.naturalWidth>0)");
    const story = await evaluate(`({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      note:document.querySelector('main header').textContent,body:document.querySelector('main').textContent,
      phases:[...document.querySelectorAll('#groovenomad-roadmap + p + ol h3')].map(el=>el.textContent),
      fullViews:document.querySelectorAll('figure a[target="_blank"]').length,
      screens:[...document.querySelectorAll('figure img')].map(el=>({alt:el.alt,ratio:el.getBoundingClientRect().width/el.getBoundingClientRect().height,sourceRatio:Number(el.getAttribute('width'))/Number(el.getAttribute('height')),fit:getComputedStyle(el).objectFit}))})`);
    assert.equal(story.client,story.scroll); assert.equal(story.fullViews,3); assert.equal(story.screens.length,3);
    assert.ok(story.note.includes("projet d’école") && story.note.includes("équipe") && !story.note.includes("fictif"));
    assert.ok(story.body.includes("trois personas") && story.body.includes("KPI") && story.body.includes("Make"));
    assert.deepEqual(story.phases,["Lancement","Croissance et structuration","Expansion et leadership"]);
    assert.ok(story.screens.every(screen=>screen.alt.length>30 && Math.abs(screen.ratio-screen.sourceRatio)<0.005 && screen.fit!=="cover"));
    assert.ok(!story.body.includes("—"));
    report.cases.push({project:"groovenomad",width,height,theme,...story});
    await capture(`groovenomad-${width}-${theme}-intro`);
    await capture(`groovenomad-${width}-${theme}`,true);
  }
  const grooveHtml = await fetch(url+"/projects/groovenomad").then(response=>response.text());
  assert.ok(grooveHtml.includes("trois personas") && grooveHtml.includes("Expansion et leadership"));
  report.checks.push("GrooveNomad: school team project, cover and three complete slides, three personas, exactly three roadmap phases, KPI scope without commercial results; 1440/390/320 px dark/light, no overflow, server-rendered story");
  await page("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await click('.project-page main header a[href="/#projets"]');
  await waitFor("location.pathname==='/' && location.hash==='#projets' && Math.abs(document.querySelector('#projets').getBoundingClientRect().top)<2");
  assert.ok(await evaluate("document.querySelector('canvas')!==null"));
  report.checks.push("Real project routes, previous/next, gallery return, engine disposal, persistent theme across reload and navigation");
  for(const slug of ["cephalee","mousse","groovenomad"]) assert.equal((await fetch(url+"/projects/"+slug)).status,200);
  assert.equal((await fetch(url+"/projects/unknown")).status,404);
  await page("Emulation.setScriptExecutionDisabled",{value:true}); await page("Page.navigate",{url}); await sleep(900);
  assert.equal(await evaluate("document.documentElement.dataset.theme"),"dark");
  assert.equal(await evaluate("document.querySelector('.pond-poster img').naturalWidth>0"),true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.theme-toggle')).display"),"none");
  await capture("no-javascript");
  await page("Page.navigate",{url:url+"/projects/groovenomad"}); await sleep(900);
  assert.equal(await evaluate("document.querySelector('h1').textContent"),"GrooveNomad");
  report.checks.push("All projects prerender, invalid slug is 404, landing/poster and project pages work without JavaScript");
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({layouts:report.layouts.length,themes:report.themes.length,checks:report.checks,errors},null,2));
} catch (error) {
  report.failure = { message: error.message, state: await evaluate("({y:scrollY,project:document.querySelector('#projets')?.getBoundingClientRect().top,footer:document.querySelector('#contact')?.getBoundingClientRect().top,strip:document.querySelector('.dao-strip')?.scrollLeft,mobile:document.querySelector('.projects-mobile')?.scrollTop})") };
  await capture("failure");
  throw error;
} finally {
  await writeFile(resolve(output,"report.json"),JSON.stringify(report,null,2)); await close();
}
