import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const dashboard=readFileSync("artifacts/sellbuydeal/src/pages/DashboardPage.tsx","utf8");
const app=readFileSync("artifacts/sellbuydeal/src/App.tsx","utf8");
test("Cashback and Importers are page routes, not empty inline dashboard panels",()=>{
 assert.match(dashboard,/const DASHBOARD_PAGE_ROUTES:[^=]*= \{/);
 for(const [section,path] of [["cashback","cashback"],["open-importers","importers"],["my-store","my-store"]]){
   const route=section.includes("-")?'"'+section+'"':section;
   assert.ok(dashboard.includes(route+': "/'+path+'"'),"Missing route for "+section);
 }
 assert.match(dashboard,/const destination=DASHBOARD_PAGE_ROUTES\[id\]/);
 assert.match(dashboard,/setLocation\(destination\)/);
 assert.match(app,/<Route path="\/cashback">/);
 assert.match(app,/<Route path="\/admin\/cashback">/);
});
test("Mobile and desktop dashboard menus use the same route-aware navigation",()=>{
 const snippets=[...dashboard.matchAll(/onClick=\{\(\) => \{\s*setActiveSection\(item\.id\);[\s\S]{0,140}?\}\}/g)];
 assert.equal(snippets.length,2,"Both mobile and desktop menus must call route-aware navigation");
});
test("Old bookmarked cashback dashboard sections redirect to actual page",()=>{
 assert.match(dashboard,/allIds\.includes\(s\) && !DASHBOARD_PAGE_ROUTES\[s\]/);
 assert.match(dashboard,/const section=new URLSearchParams\(window\.location\.search\)\.get\("section"\)/);
 assert.match(dashboard,/if\(destination\) setLocation\(destination\)/);
});
test("Cashback toggle hides its dashboard menu item",()=>{
 assert.match(dashboard,/"cashback":"cashback"/);
});
