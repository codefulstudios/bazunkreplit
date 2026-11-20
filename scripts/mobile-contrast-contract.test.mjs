import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read=p=>readFileSync(p,"utf8");
const css=read("artifacts/sellbuydeal/src/index.css");
const targets=[
 ["Hero.tsx","artifacts/sellbuydeal/src/components/Hero.tsx",["bz-hero-kicker","bz-hero-summary"]],
 ["CookieConsent.tsx","artifacts/sellbuydeal/src/components/CookieConsent.tsx",["bazunk-cookie-consent","bz-cookie-description","bz-cookie-reject","bz-cookie-customise","bz-cookie-accept"]],
 ["OffersPage.tsx","artifacts/sellbuydeal/src/pages/OffersPage.tsx",["text-[#fff0a8]","from-[#9a3412]","from-[#065f46]"]],
 ["DealPilotPanel.tsx","artifacts/sellbuydeal/src/components/DealPilotPanel.tsx",["dark:!text-white","Notify me about matches","Suggest offers for my approval"]],
 ["ImportersPage.tsx","artifacts/sellbuydeal/src/pages/ImportersPage.tsx",["bz-importer-dialog","bz-example-light"]]
];
test("dark remapped background tokens have independent foreground corrections",()=>{
 for(const token of ["text-slate-100","text-slate-200","text-slate-300","text-gray-200","text-orange-300","text-yellow-300","dark:!text-orange-100"]){
  assert.ok(css.includes('[class~="'+token+'"]'),"Unprotected text utility "+token);
 }
 assert.match(css,/\.dark :is\(/);
 assert.match(css,/ACCESSIBILITY CONTRACT/);
});
for(const [name,path,required] of targets) test(name+" protects screenshot text",()=>{
 const source=read(path);
 for(const anchor of required)assert.ok(source.includes(anchor),name+" missing "+anchor);
});
test("cookie decisions keep dark ink on white and orange buttons",()=>{
 assert.match(css,/\.bazunk-cookie-consent \.bz-cookie-reject\s*\{[^}]*color:#111827/);
 assert.match(css,/\.bazunk-cookie-consent \.bz-cookie-accept\s*\{[^}]*color:#111827/);
});
