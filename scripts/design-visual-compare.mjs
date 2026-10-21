import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
// Compares REAL rendered screenshots, not mockup images. Authenticated routes
// are deliberately skipped without a provisioned test session.
const baseline=(process.env.BAZUNK_VISUAL_BASELINE_URL||"https://www.bazunk.com").replace(/\/$/,"");
const candidate=(process.env.BAZUNK_VISUAL_CANDIDATE_URL||"").replace(/\/$/,"");
const auth=process.env.BAZUNK_AUTH_STATE_PATH;
const routes=(process.env.BAZUNK_VISUAL_ROUTES||(auth?"/admin/dashboard,/admin/design-system":"/,/sell")).split(",").map(x=>x.trim()).filter(Boolean);
const viewports=[{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844}];
const folder="artifacts/design-visual-comparison";
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
const summary=[];
async function capture(base,route,vp,dark,label){
 const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,...(auth?{storageState:auth}:{})});
 const page=await context.newPage();
 const url=base+route;
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:40000});
 await page.evaluate(isDark=>{document.documentElement.classList.toggle("dark",isDark);document.documentElement.style.colorScheme=isDark?"dark":"light"},dark);
 await page.waitForTimeout(1200);
 if(route.startsWith("/admin") && !await page.locator(".bazunk-admin").count())throw Error("AUTH_REQUIRED: admin session missing for "+url);
 const name=[label,vp.name,dark?"dark":"light",route.replace(/[^a-z0-9]/gi,"_")].join("-");
 const filepath=path.join(folder,name+".png");
 const buffer=await page.screenshot({path:filepath,fullPage:true,animations:"disabled"});
 const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>window.innerWidth+2}));
 await context.close();
 return {filepath,buffer,dimensions};
}
try{
 for(const vp of viewports)for(const dark of [false,true])for(const route of routes){
  const record={route,viewport:vp.name,theme:dark?"dark":"light"};
  try{
   const a=await capture(baseline,route,vp,dark,"baseline");
   const b=candidate?await capture(candidate,route,vp,dark,"candidate"):null;
   let compared=null;
   if(b){
    const {PNG}=await import("pngjs");
    const pixelmatch=(await import("pixelmatch")).default;
    const im1=PNG.sync.read(a.buffer),im2=PNG.sync.read(b.buffer);
    if(im1.width===im2.width&&im1.height===im2.height){
     const diff=new PNG({width:im1.width,height:im1.height});
     const changed=pixelmatch(im1.data,im2.data,diff.data,im1.width,im1.height,{threshold:.15});
     const diffPath=path.join(folder,["diff",vp.name,dark?"dark":"light",route.replace(/[^a-z0-9]/gi,"_")].join("-")+".png");
     await fs.writeFile(diffPath,PNG.sync.write(diff));
     compared={changedPixels:changed,totalPixels:im1.width*im1.height,percent:+(100*changed/(im1.width*im1.height)).toFixed(2),diffPath};
    }else compared={dimensionsDiffer:true,baseline:{w:im1.width,h:im1.height},candidate:{w:im2.width,h:im2.height}};
   }
   summary.push({...record,baseline:a.filepath,candidate:b?.filepath||null,baselineSize:a.dimensions,candidateSize:b?.dimensions||null,comparison:compared});
  }catch(e){summary.push({...record,error:String(e)});}
 }
}finally{await browser.close()}
await fs.writeFile(path.join(folder,"report.json"),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(summary.some(x=>x.error))process.exitCode=1;
