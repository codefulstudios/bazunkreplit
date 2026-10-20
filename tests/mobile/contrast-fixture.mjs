import assert from "node:assert/strict";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

/** Local-build CSS test: checks computed colours, not a remote/possibly stale deploy.
 * Run after `pnpm --filter @workspace/sellbuydeal build`.
 * Two viewport widths and both theme states; fails below WCAG AA 4.5:1.
 */
const assets="artifacts/sellbuydeal/dist/assets";
const files=(await readdir(assets)).filter(name=>name.endsWith(".css"));
assert.ok(files.length,"Build CSS is missing");
const css=(await Promise.all(files.map(f=>readFile(assets+"/"+f,"utf8")))).join("\n");
const browser=await chromium.launch({headless:true});
const samples=[
 {id:"hero-kicker",className:"bz-hero-kicker text-orange-300",bg:"#151d37",value:"Discover something great"},
 {id:"hero-description",className:"bz-hero-summary text-slate-200",bg:"#151d37",value:"Explore unique finds from independent sellers"},
 {id:"cookie-description",className:"bz-cookie-description text-slate-100",outer:"bazunk-cookie-consent",bg:"#07172c",value:"Essential cookies and optional preferences"},
 {id:"cookie-link",className:"bz-cookie-description",outer:"bazunk-cookie-consent",tag:"a",bg:"#07172c",value:"Read our Cookie Policy"},
 {id:"cookie-reject",className:"bz-cookie-reject text-slate-950",outer:"bazunk-cookie-consent",tag:"button",bg:"#ffffff",value:"Reject optional"},
 {id:"cookie-customise",className:"bz-cookie-customise text-white",outer:"bazunk-cookie-consent",tag:"button",bg:"#253958",value:"Customise"},
 {id:"cookie-accept",className:"bz-cookie-accept text-slate-950",outer:"bazunk-cookie-consent",tag:"button",bg:"#f97316",value:"Accept all"},
 {id:"dealpilot-checkbox",className:"text-slate-900 dark:!text-white",tag:"label",bg:"#172541",value:"Suggest offers for my approval",skipLight:true},
 {id:"dealpilot-muted",className:"text-slate-200",tag:"p",bg:"#172541",value:"Your matched items are shown here"},
 {id:"offers-heading",className:"text-[#fff0a8]",tag:"span",bg:"#2528e9",value:"Offers"},
 {id:"offers-metrics",className:"text-white",tag:"span",bg:"#9a3412",value:"Pending Offers"},
 {id:"importer-modal",className:"dark:!text-orange-100",outer:"bz-importer-dialog",tag:"p",bg:"#0d0d0d",value:"See how products move to your Bazunk store",skipLight:true},
 {id:"importer-tab",className:"text-orange-300",tag:"span",bg:"#0d0d0d",value:"Amazon",skipLight:true},
 {id:"importer-preview",className:"!text-slate-950",outer:"bz-importer-dialog bz-example-light !bg-white",tag:"span",bg:"#ffffff",value:"Sample search results",skipLight:true},
 {id:"neutral-slate-100",className:"text-slate-100",bg:"#10223e",value:"Privacy matters",skipLight:true},
 {id:"neutral-slate-300",className:"text-slate-300",bg:"#10223e",value:"Last checked",skipLight:true},
 {id:"neutral-gray-200",className:"text-gray-200",bg:"#10223e",value:"Delivery available",skipLight:true},
 {id:"alert-orange-100",className:"dark:!text-orange-100",bg:"#0d0d0d",value:"Example description",skipLight:true}
];
function escapeHtml(v){return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");}
function fixtureHtml(){
 return samples.map(s=>{
  const tag=s.tag||"p", attr=s.outer?' class="'+escapeHtml(s.outer)+'"':"";
  const style='style="background-color:'+s.bg+';padding:18px;display:block"';
  return '<section data-sample="'+s.id+'" '+attr+' '+style+'><'+tag+' class="'+escapeHtml(s.className)+'" style="font-size:16px;display:inline-block">'+escapeHtml(s.value)+'</'+tag+'></section>';
 }).join("\n");
}
const violations=[];
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.setContent('<!doctype html><html><head><style>'+css+'</style></head><body>'+fixtureHtml()+'</body></html>');
  for(const dark of [false,true]){
   await page.evaluate(mode=>{document.documentElement.classList.toggle("dark",mode);document.documentElement.style.colorScheme=mode?"dark":"light";},dark);
   const computed=await page.evaluate(()=>{
    function triplet(value){const m=value.match(/rgba?\(([^)]+)\)/);return m?(m[1].match(/[\d.]+/g)||[]).slice(0,3).map(Number):null;}
    function lum(rgb){return rgb.map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((acc,x,i)=>acc+x*[.2126,.7152,.0722][i],0);}
    return [...document.querySelectorAll("[data-sample]")].map(el=>{
      const child=el.firstElementChild;
      const fore=triplet(getComputedStyle(child).color);
      const back=triplet(getComputedStyle(el).backgroundColor);
      const ratio=fore&&back?(Math.max(lum(fore),lum(back))+.05)/(Math.min(lum(fore),lum(back))+.05):0;
      return {id:el.dataset.sample,ratio:Number(ratio.toFixed(2)),foreground:getComputedStyle(child).color,background:getComputedStyle(el).backgroundColor};
    });
   });
   for(const row of computed){
    const sample=samples.find(s=>s.id===row.id);
    if(!dark&&sample.skipLight)continue;
    if(row.ratio<4.5) violations.push({...row,width,mode:dark?"dark":"light"});
   }
   await mkdir("mobile-results",{recursive:true});
   await page.screenshot({path:`mobile-results/contrast-${width}-${dark?"dark":"light"}.png`,fullPage:true});
   console.log(`contrast fixtures ${width}px ${dark?"dark":"light"}:`,computed.filter(o=>dark||!samples.find(s=>s.id===o.id).skipLight));
  }
  await context.close();
 }
}finally{await browser.close();}
assert.equal(violations.length,0,"Low-contrast foregrounds:\n"+JSON.stringify(violations,null,2));
