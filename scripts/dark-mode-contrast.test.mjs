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
