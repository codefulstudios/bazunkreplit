import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.BASE_URL || 'https://www.bazunk.com').replace(/\/$/, '');
const routes = [
  ['Home', '/'], ['Browse', '/browse'], ['Filtered browse', '/browse?category=electronics'],
  ['Categories', '/categories'], ['Direct Sale', '/direct-sale'],
  ['Sell', '/sell'], ['Checkout', '/checkout'], ['Importers', '/importers'],
  ['Offers', '/my-offers'], ['Admin', '/admin'],
];
const sizes = [{name:'phone-360',width:360,height:780},{name:'phone-390',width:390,height:844},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:768}];
await mkdir('mobile-results',{recursive:true});
const browser = await chromium.launch({headless:true});
const results=[];
try {
  for(const size of sizes) {
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.width<768,hasTouch:true});
    for(const [label,path] of routes) {
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      try {
        const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
        await page.waitForTimeout(1300);
        const data=await page.evaluate(()=>{
          const root=document.documentElement;
          const candidates=[...document.querySelectorAll('button,a,input,select,textarea')].filter(e=>{
            const r=e.getBoundingClientRect();const st=getComputedStyle(e);
            return r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none'&&r.top>=0&&r.top<innerHeight;
          });
          return {title:document.title,bodyWidth:document.body.scrollWidth,viewport:innerWidth,documentWidth:root.scrollWidth,
            tinyControls:candidates.filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24}).length,
            visibleControls:candidates.length,heading:document.querySelector('h1')?.textContent?.trim()||''};
        });
        const overflow=Math.max(data.documentWidth,data.bodyWidth)-size.width;
        const status=response?.status()??0;
        const blocked=/sign.in|log.in|unauthori[sz]ed/i.test(page.url());
        const outcome={size:size.name,label,path,status,overflow,errors,blocked, ...data};
        results.push(outcome);
        if(overflow>3||errors.length||status>=400) {
          await page.screenshot({path:`mobile-results/${size.name}-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`,fullPage:true}).catch(()=>{});
        }
      } catch(e) {results.push({size:size.name,label,path,error:String(e)});}
      await page.close();
    }
    await context.close();
  }
} finally {await browser.close();}
await writeFile('mobile-results/report.json',JSON.stringify(results,null,2));
const failures=results.filter(r=>r.error||r.status>=400||r.overflow>3||r.errors?.length);
console.log(JSON.stringify({tested:results.length,failures:failures.length,details:failures},null,2));
console.log('NOTE: Protected flows require separate authenticated test credentials/session setup. This smoke suite does not submit orders or payments.');
if(failures.length)process.exitCode=1;
