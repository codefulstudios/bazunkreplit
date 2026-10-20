import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const origin = process.env.BAZUNK_TEST_URL || "https://www.bazunk.com";
const routes = ["/cashback", "/admin/cashback", "/dashboard"];
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless:true, args:["--no-sandbox"] });
try {
 for (const path of routes) {
   const page = await browser.newPage({ viewport: { width:1365, height:850 }, ignoreHTTPSErrors:false });
   const errors=[], requests=[];
   page.on("pageerror", err => errors.push("PAGE: " + (err.stack || err.message).slice(0,900)));
   page.on("console", msg=>{if(msg.type()==="error") errors.push("CONSOLE: "+msg.text().slice(0,900))});
   page.on("requestfailed", req=>requests.push("FAILED "+req.method()+" "+req.url()+" "+req.failure()?.errorText));
   page.on("response",res=>{if(res.status()>=400)requests.push("HTTP "+res.status()+" "+res.url().slice(0,250))});
   try {
     const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:45000});
     await page.waitForTimeout(8500);
     const state=await page.evaluate(()=>({
       title: document.title,
       href: location.href,
       text: document.body?.innerText?.slice(0,2100)||"",
       bodyCount:document.body?.innerText?.length||0,
       cashback:!!document.querySelector('[data-testid="cashback-page"],[data-testid="admin-cashback"]'),
       root:document.querySelector('#root')?.innerHTML.slice(0,450)||"",
     }));
     console.log(JSON.stringify({route:path,status:response?.status(),...state,errors:errors.slice(0,20),requests:requests.slice(0,25)},null,2));
     await page.screenshot({path:"artifacts/cashback-diag-"+path.replaceAll("/","_")+".png",fullPage:false});
   } catch(err) {console.log(JSON.stringify({route:path,fatal:String(err),errors,requests}));}
   await page.close();
 }
}finally{await browser.close();}
