import { chromium } from "playwright";
import fs from "node:fs/promises";
const base=(process.env.BAZUNK_TEST_URL||"https://www.bazunk.com").replace(/\/$/,"");
const routes=(process.env.BAZUNK_TEST_ROUTES||"/,/login,/sell").split(",");
const browser=await chromium.launch({headless:true});
let failures=0;
for(const viewport of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844}]){
 for(const dark of [false,true]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  const page=await context.newPage();
  for(const route of routes){
   try{
    const url=base+route;
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForTimeout(800);
    await page.evaluate(isDark=>{document.documentElement.classList.toggle("dark",isDark);document.documentElement.style.colorScheme=isDark?"dark":"light";},dark);
    await page.waitForTimeout(200);
    const result=await page.evaluate(()=>{
     function rgb(s){const m=s.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);return m?[+m[1],+m[2],+m[3]]:null;}
     function lum(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);}
     function bg(el){for(let n=el;n;n=n.parentElement){const color=getComputedStyle(n).backgroundColor;if(color&&!color.includes("0, 0, 0, 0")&&!color.includes("0 0 0 / 0")){const m=rgb(color);if(m)return m;}}return [255,255,255];}
     const issues=[];
     const els=[...document.querySelectorAll("main p,main label,main button,main a,main input,main textarea,main select,main td,main th,[role=dialog] button,[role=dialog] label")];
     for(const el of els.slice(0,800)){
      const st=getComputedStyle(el),rect=el.getBoundingClientRect();
      if(!rect.width||!rect.height||st.visibility==="hidden"||st.display==="none"||st.opacity==="0")continue;
      if(st.backgroundImage!=="none"||el.closest("svg"))continue;
      const fg=rgb(st.color),back=bg(el);if(!fg)continue;
      const ratio=(Math.max(lum(fg),lum(back))+.05)/(Math.min(lum(fg),lum(back))+.05);
      if(ratio<4.5&&!el.matches(":disabled")&&issues.length<15)issues.push({tag:el.tagName,text:(el.textContent||el.getAttribute("placeholder")||"").trim().slice(0,55),ratio:+ratio.toFixed(2)});
     }
     return issues;
    });
    const filename="artifacts/contrast-"+viewport.name+"-"+(dark?"dark":"light")+"-"+route.replace(/[^a-z0-9]/gi,"_")+".png";
    await fs.mkdir("artifacts",{recursive:true});
    await page.screenshot({path:filename,fullPage:true});
    const focusables=page.locator("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])");
    if(await focusables.count()){await page.keyboard.press("Tab");const focused=await page.evaluate(()=>document.activeElement!==document.body);if(!focused)console.warn("No keyboard focus detected",route);}
    console.log(JSON.stringify({url,viewport:viewport.name,mode:dark?"dark":"light",contrastWarnings:result,screenshot:filename}));
    if(result.length && process.env.CONTRAST_STRICT==="1")failures++;
   }catch(e){console.error("CHECK FAILED",route,viewport.name,dark,String(e));failures++;}
  }
  await context.close();
 }
}
await browser.close();
if(failures)process.exitCode=1;
