import assert from "node:assert/strict";
import fs from "node:fs";
import {test} from "node:test";

const css=fs.readFileSync("artifacts/sellbuydeal/src/index.css","utf8");
function palette(anchor){
  const start=css.indexOf(anchor);
  assert.ok(start>=0,"Missing palette "+anchor);
  const block=css.slice(css.indexOf("{",start)+1,css.indexOf("}",start));
  return Object.fromEntries([...block.matchAll(/(--bz-[\w-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)].map(([,k,v])=>[k,v]));
}
const themes={light:palette(":root {\n  --bz-surface-page"),dark:palette(".dark {\n  --bz-surface-page")};
function luminance(hex){const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [mode,t] of Object.entries(themes)){
  for(const surface of ["page","card","raised","field"]){
    for(const text of ["primary","secondary","muted"]){
      test(mode+" "+text+" text on "+surface+" >=4.5:1",()=>{
        const fg=t["--bz-text-"+text],bg=t["--bz-surface-"+surface];
        assert.ok(fg&&bg,"Missing palette token");
        assert.ok(ratio(fg,bg)>=4.5,mode+" "+text+" on "+surface+" is "+ratio(fg,bg).toFixed(2)+":1");
      });
    }
  }
  for(const kind of ["primary","secondary"]){
    test(mode+" "+kind+" action text >=4.5:1",()=>{
      const fg=t["--bz-action-"+kind+"-text"],bg=t["--bz-action-"+kind];
      assert.ok(ratio(fg,bg)>=4.5,"Action contrast "+ratio(fg,bg).toFixed(2)+":1");
    });
  }
}
for(const part of ["select","dropdown-menu","popover","dialog"]){
  test(part+" overlay has dark background and foreground",()=>{
    const source=fs.readFileSync("artifacts/sellbuydeal/src/components/ui/"+part+".tsx","utf8");
    assert.match(source,/dark:bg-/);
    assert.match(source,/dark:text-/);
  });
}

const source=(path)=>fs.readFileSync("artifacts/sellbuydeal/src/"+path,"utf8");
test("front-end categories hero has explicit high-contrast surface",()=>{
  assert.match(source("pages/CategoriesPage.tsx"),/bz-contrast-hero relative overflow-hidden/);
  assert.match(css,/\.dark \.bz-contrast-hero[\s\S]*?background-image:linear-gradient/);
  assert.match(css,/\.dark \.bz-contrast-hero :is\(h1,h2,h3,h4,p,span,small,svg\)[\s\S]*?color:#152344 !important/);
});
for(const [name,file] of [["Snap & Sell","AdminSnapSellPage.tsx"],["DealPilot","AdminDealPilotPage.tsx"],["Find It","AdminFindItPage.tsx"]]){
 test(name+" dark hero uses contrast contract",()=>{
   assert.match(source("pages/admin/"+file),/bz-contrast-hero rounded-3xl/);
 });
}
test("bright hero colour meets WCAG AA on all text",()=>{
 assert.ok(ratio("#152344","#fff7dc")>=4.5);
 assert.ok(ratio("#152344","#ffd9a2")>=4.5);
 assert.ok(ratio("#152344","#ffba7b")>=4.5);
});
test("dark section-heading text meets WCAG AA",()=>{
 assert.ok(ratio("#ffffff","#17243a")>=4.5);
});
