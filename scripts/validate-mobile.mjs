import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchChrome, sleep } from "./chrome.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:3000";
const output = resolve("artifacts/mobile");
const { page, evaluate, waitFor, errors, close } = await launchChrome(output);
const report = { layouts: [], checks: [], errors };
const screenshot = async name => {
  const { data } = await page("Page.captureScreenshot", { format: "png" });
  await writeFile(resolve(output, name + ".png"), Buffer.from(data,"base64"));
};
const click = async selector => {
  const p = await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
  await page("Input.dispatchMouseEvent",{...p,type:"mousePressed",button:"left",clickCount:1});
  await page("Input.dispatchMouseEvent",{...p,type:"mouseReleased",button:"left",clickCount:1});
};
const flick = async (width,height) => {
  for(let i=0;i<5;i++) {
    await page("Input.dispatchTouchEvent",{type:i===0?"touchStart":"touchMove",touchPoints:[{x:width*.75,y:height*(.8-i*.14)}]});
    await sleep(16);
  }
  await page("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
};
try {
  await page("Page.enable"); await page("Runtime.enable"); await page("Log.enable");
  await page("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__opening=null;
    new MutationObserver(()=>{
      const e=window.__pond;
      if(window.__opening||!e||document.querySelector('canvas')?.dataset.ready!=='true')return;
      const s=e.scene,m=s.camera.projectionMatrix.clone().multiply(s.camera.matrixWorldInverse).elements;
      const b=document.querySelector('canvas').getBoundingClientRect();
      const pixels=new Uint8Array(s.target.width*s.target.height*4);
      s.renderer.readRenderTargetPixels(s.target,0,0,s.target.width,s.target.height,pixels,undefined,1);
      const fish=s.koi.map(model=>{
        const p=model.mesh.geometry.attributes.position.array;
        let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,painted=0;
        for(let i=0;i<p.length;i+=3){
          const x=p[i],y=p[i+1],z=p[i+2],w=m[3]*x+m[7]*y+m[11]*z+m[15];
          const sx=((m[0]*x+m[4]*y+m[8]*z+m[12])/w+1)*b.width/2;
          const sy=(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/w)*b.height/2;
          left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
        }
        const region=Math.round(model.mesh.material.uniforms.uRegion.value*255);
        const start=Math.floor((1-innerHeight/b.height)*s.target.height)*s.target.width*4;
        for(let i=Math.max(0,start);i<pixels.length;i+=4)if(Math.abs(pixels[i+3]-region)<=1)painted++;
        return {left,right,top,bottom,painted};
      });
      window.__opening={fish,width:b.width,height:innerHeight,time:e.world.time};
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-ready']});
  ` });
  for (const [width,height] of [[390,844],[320,740],[768,1024],[844,390]]) {
    await page("Emulation.setDeviceMetricsOverride",{width,height,screenWidth:width,screenHeight:height,deviceScaleFactor:1,mobile:true});
    await page("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});
    await page("Page.navigate",{url:url+"/?debug"});
    await waitFor("!!window.__opening && !!document.querySelector('.debug-panel')");
    const opening=await evaluate("window.__opening");
    for(const fish of opening.fish) {
      assert.ok(fish.left>=0 && fish.right<=opening.width && fish.top>=0 && fish.bottom<=height);
      assert.ok(fish.painted>80,"Each koi must actually appear in the rendered first frame, not only inside the frustum");
    }
    await evaluate("window.__pond.togglePause();document.querySelector('.debug-panel').style.display='none';const style=document.createElement('style');style.textContent='nextjs-portal{display:none!important}';document.head.append(style);document.documentElement.dataset.theme='dark'");
    await sleep(650); await screenshot("pond-"+width);
    assert.equal(await evaluate("document.documentElement.scrollWidth===document.documentElement.clientWidth"),true);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-header')).display"),"none");
    assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.mobile-menu-bar')).backdropFilter"),"none");
    await click(".mobile-nav > button");
    await waitFor("document.querySelector('dialog').open && document.body.style.overflow==='hidden'");
    assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"),true);
    await screenshot("menu-dark-"+width);
    await click(".mobile-menu .theme-toggle");
    assert.equal(await evaluate("document.documentElement.dataset.theme"),"light");
    await screenshot("menu-light-"+width);
    await page("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
    await page("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
    await waitFor("!document.querySelector('dialog').open && document.body.style.overflow!== 'hidden'");
    assert.equal(await evaluate("document.activeElement===document.querySelector('.mobile-nav > button')"),true);
    await evaluate("document.documentElement.dataset.theme='dark'");
    const positions=await evaluate("[...document.querySelectorAll('.mobile-project'),document.querySelector('footer')].map(el=>el.getBoundingClientRect().top+scrollY)");
    for(let i=0;i<positions.length;i++) {
      await flick(width,height);
      await waitFor("Math.abs(scrollY-"+positions[i]+")<2");
      if(i===0) {
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.projects-mobile-heading')).position"),"static");
        await screenshot("projects-first-"+width);
      }
      if(i===1) {
        assert.ok(await evaluate("document.querySelector('.projects-mobile-heading').getBoundingClientRect().bottom")<0);
        await screenshot("projects-second-"+width);
      }
    }
    await click(".mobile-nav > button");
    await click('.mobile-menu-links a[href="/#projets"]');
    await waitFor("!document.querySelector('dialog').open && Math.abs(document.querySelector('#projets').getBoundingClientRect().top)<2");
    report.layouts.push({width,height,opening,projectStops:positions});
  }
  report.checks.push("Every koi and fin starts inside the small viewport and is visible in GPU flow pixels");
  report.checks.push("Native touch flicks stop on each project, heading scrolls away, footer reached after last project");
  report.checks.push("Glass menu opens modally, traps focus, toggles theme, closes on Escape/link, restores scrolling/focus");
  await page("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await page("Page.navigate",{url:url+"/?debug"}); await waitFor("!!window.__opening");
  await click(".mobile-nav > button");
  await waitFor("document.querySelector('dialog').open");
  await page("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await waitFor("!document.querySelector('dialog').open && document.body.style.overflow!=='hidden'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-nav')).display"),"none");
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.site-header')).display"),"none");
  report.checks.push("Resizing to desktop closes mobile menu and restores the original desktop navbar");
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({layouts:report.layouts.length,checks:report.checks,errors},null,2));
} catch(error) {
  report.failure={message:error.message,state:await evaluate("({y:scrollY,heading:document.querySelector('.projects-mobile-heading')?.getBoundingClientRect().top,cards:[...document.querySelectorAll('.mobile-project')].map(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height}))})")};
  await screenshot("failure"); throw error;
} finally {
  await writeFile(resolve(output,"report.json"),JSON.stringify(report,null,2)); await close();
}
