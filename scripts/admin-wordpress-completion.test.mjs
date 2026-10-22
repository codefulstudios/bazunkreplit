import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=path=>readFileSync(path,"utf8");
const base="artifacts/sellbuydeal/src/";
const app=read(base+"App.tsx");
const shell=read(base+"pages/admin/AdminLayout.tsx");
const hubs=read(base+"pages/admin/AdminOperationsHubs.tsx");
const analytics=read(base+"pages/admin/AdminManagementHubs.tsx");
const styles=read(base+"pages/admin/admin-wordpress-finish.css");

test("Every WordPress sidebar destination resolves to a real admin app route",()=>{
 const destinations=[...shell.matchAll(/href: "(\/admin\/[^"]+)"/g)].map(match=>match[1]);
 const routes=new Set([...app.matchAll(/<Route path="(\/admin\/[^"]+)"/g)].map(match=>match[1]));
 assert.ok(destinations.length>=35);
 assert.equal(new Set(destinations).size,destinations.length);
 for(const dest of destinations)assert.ok(routes.has(dest),"Broken admin navigation: "+dest);
 assert.match(shell,/Dashboard<\/span>/);
});
test("WordPress-style Marketing, Importers and Settings have focused overview screens",()=>{
 for(const [page,component] of [
  ["/admin/marketing","AdminMarketingOverviewPage"],
  ["/admin/importer-overview","AdminImporterOverviewPage"],
  ["/admin/settings-overview","AdminSettingsOverviewPage"]
 ]){
  assert.ok(app.includes('<Route path="'+page+'" component={'+component+'} />'),page);
  assert.ok(shell.includes('href: "'+page+'"'),page);
  assert.ok(hubs.includes("function "+component+"("),component);
 }
 assert.match(hubs,/onChange=\{event=>setQuery\(event.target.value\)\}/);
 assert.match(hubs,/aria-expanded=\{expanded\[group.title\]!==false\}/);
 assert.match(hubs,/navigate\(tool.href\)/);
 assert.match(hubs,/No matching tools/);
});
test("Original marketplace, importer, compliance, refund, and feature routes remain linked",()=>{
 for(const route of ["/admin/listings","/admin/orders","/admin/payments","/admin/promotions",
  "/admin/cashback","/admin/returns","/admin/disputes","/admin/imports",
  "/admin/importer-control","/admin/feature-toggles","/admin/system-status",
  "/admin/audit-log","/admin/seller-compliance"]){
  assert.ok(shell.includes('href: "'+route+'"'),"Missing original route "+route);
  assert.ok(app.includes('<Route path="'+route+'"'),"Missing route handler "+route);
 }
});
test("Theme Studio remains unchanged while other operations are made consistent",()=>{
 assert.ok(shell.includes('href: "/admin/theme-studio"'));
 assert.ok(app.includes('<Route path="/admin/theme-studio"'));
 assert.match(shell,/import "\.\/admin-wordpress-finish\.css"/);
 assert.match(styles,/\.dark \.bazunk-admin-wordpress/);
 for(const token of ["wp-operations-home","wp-operations-tools","wp-operations-search","focus-visible","wp-operations-tool:hover"])assert.ok(styles.includes(token),token);
 assert.doesNotMatch(styles,/(?:^|\n)body\s*\{/);
});
test("Analytics exports the real API summary and trend series as CSV",()=>{
 for(const token of ["/api/admin/stats","Export CSV","exportAnalytics","salesTrend.map","userTrend.map","text/csv","Last refreshed"])assert.ok(analytics.includes(token),token);
 assert.match(analytics,/onClick=\{exportAnalytics\}/);
 assert.match(analytics,/normalized\.replaceAll/);
});
