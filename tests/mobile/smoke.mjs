import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.BASE_URL || 'https://www.bazunk.com').replace(/\/$/, '');
const routes = [
  ['Home', '/'], ['Browse', '/browse'], ['Filtered browse', '/browse?category=electronics'],
  ['Categories', '/categories'], ['Direct Sale', '/sell/direct'],
  ['Sell', '/sell'], ['Checkout', '/checkout'], ['Importers', '/importers'],
  ['Offers', '/offers'], ['Admin', '/admin'],
];
const authenticated = process.env.MOBILE_AUTH_STORAGE_STATE;
const skipProtectedWithoutSession = true;
const authRoutes = [
  ['Seller dashboard', '/dashboard'],
  ['Seller listing', '/sell/direct'],
  ['Seller importer', '/importers'],
  ['Offers authenticated', '/offers'],
  ['Checkout authenticated', '/checkout'],
  ['Admin dashboard', '/admin/dashboard'],
  ['Admin products', '/admin/products'],
];
const sizes = [{name:'phone-360',width:360,height:780},{name:'phone-390',width:390,height:844},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:768}];
await mkdir('mobile-results',{recursive:true});
const browser = await chromium.launch({headless:true});
const results=[];
try {
  for(const size of sizes) {
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.width<768,hasTouch:true});
    for(const [label,path] of routes) {
      if (skipProtectedWithoutSession && !authenticated && ['Checkout','Importers','Offers','Admin','Sell'].includes(label)) {
        results.push({size:size.name,label,path,skipped:'Requires an authenticated test session'});
        continue;
      }
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
            visibleControls:candidates.length,heading:document.querySelector('h1')?.textContent?.trim()||'',offscreenElements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();const st=getComputedStyle(e);return r.width>0&&r.height>0&&st.position!=='fixed'&&st.visibility!=='hidden'&&r.right>innerWidth+4&&r.left<innerWidth}).slice(0,12).map(e=>({tag:e.tagName,classes:typeof e.className==='string'?e.className.slice(0,120):'',right:Math.round(e.getBoundingClientRect().right)}))};
        });
        const overflow=Math.max(data.documentWidth,data.bodyWidth)-size.width;
        const status=response?.status()??0;
        const blocked=/sign.in|log.in|unauthori[sz]ed/i.test(page.url());
        const pageNotFound=/page not found|404 not found/i.test((await page.locator('body').innerText().catch(()=>'' )).slice(0,3000));
        const outcome={size:size.name,label,path,status,overflow,errors,blocked,pageNotFound, ...data};
        results.push(outcome);
        if(overflow>3||errors.length||status>=400) {
          await page.screenshot({path:`mobile-results/${size.name}-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`,fullPage:true}).catch(()=>{});
        }
      } catch(e) {results.push({size:size.name,label,path,error:String(e)});}
      await page.close();
    }
    await context.close();
    if (authenticated) {
      // An exported test-account storage state is supplied via an encrypted Actions secret.
      // Never automate purchases, payouts, imports, listing publication or admin writes.
      const authContext = await browser.newContext({viewport:{width:size.width,height:size.height},storageState:JSON.parse(authenticated),deviceScaleFactor:1,isMobile:size.width<768,hasTouch:true});
      for (const [label,path] of authRoutes) {
        const page=await authContext.newPage();
        try {
          const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
          await page.waitForTimeout(1700);
          const data=await page.evaluate(()=>({
            viewport:innerWidth, width:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
            heading:document.querySelector('h1')?.textContent?.trim()||''
          }));
          const redirectedToLogin=/sign-in|login|sign-up/i.test(new URL(page.url()).pathname);
          results.push({size:size.name,label,path,authenticated:true,status:response?.status()??0,overflow:data.width-size.width,redirectedToLogin,...data});
        } catch(e) {results.push({size:size.name,label,path,authenticated:true,error:String(e)});}
        // Never capture authenticated screenshots: they may expose private user data.
        await page.close();
      }
      await authContext.close();
    }
  }
} finally {await browser.close();}
await writeFile('mobile-results/report.json',JSON.stringify(results,null,2));
const failures=results.filter(r=>r.error||r.status>=400||r.overflow>3||r.errors?.length||r.pageNotFound||(r.authenticated&&r.redirectedToLogin));
console.log(JSON.stringify({checked:results.filter(r=>!r.skipped).length,skipped:results.filter(r=>r.skipped).length,failures:failures.length,details:failures},null,2));
console.log(authenticated?'Authenticated read-only route checks enabled; no purchases or mutations performed.':'Authenticated checks skipped: set MOBILE_AUTH_STORAGE_STATE secret to enable.');
if(failures.length)process.exitCode=1;
