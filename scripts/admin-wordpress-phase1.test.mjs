import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const src="artifacts/sellbuydeal/src/";
const read=p=>readFileSync(src+p,"utf8");
const layout=read("pages/admin/AdminLayout.tsx");
const app=read("App.tsx");
const dashboard=read("pages/admin/AdminWordPressDashboard.tsx");
const css=read("pages/admin/admin-wordpress.css");
test("Approved top-level WordPress admin menu exists in exact order",()=>{
 const actual=[...layout.matchAll(/\{id:"(listings|orders|customers|sellers|payments|marketing|content|design|importers|analytics|settings)"/g)].map(m=>m[1]);
 assert.deepEqual(actual,["listings","orders","customers","sellers","payments","marketing","content","design","importers","analytics","settings"]);
 assert.match(layout,/Dashboard<\/span>/);
 assert.match(layout,/DESIGN_SECTIONS/);
 assert.match(layout,/bazunk-design-section/);
});
test("All legacy administration routes remain available",()=>{
 const required=["/admin/users","/admin/seller-compliance","/admin/trust-proof","/admin/listings","/admin/importer-control","/admin/snap-sell","/admin/deal-pilot","/admin/find-it","/admin/imports","/admin/demo-creator","/admin/cashback","/admin/classifieds","/admin/orders","/admin/payments","/admin/auctions","/admin/flash-sales","/admin/disputes","/admin/returns","/admin/support","/admin/chatwoot","/admin/rewards","/admin/credits-economy","/admin/referrals","/admin/promotions","/admin/reviews","/admin/audit-log","/admin/system-status","/admin/feature-toggles","/admin/emails","/admin/settings"];
 for(const route of required)assert.ok(layout.includes('href: "'+route+'"'),"Missing "+route);
});
test("New admin pages route to functioning components",()=>{
 for(const token of ["AdminWordPressDashboard","AdminContentPage","AdminAnalyticsPage","/admin/dashboard","/admin/analytics","/admin/content"])assert.ok(app.includes(token),token);
});
test("Dashboard uses live API metrics and orders without mockup placeholders",()=>{
 for(const token of ['/api/admin/stats','/api/admin/orders?q=&status=',"AdminMetric","AdminPanel","AdminActionRequired","Marketplace Performance","Recent Orders","Quick Links"])assert.ok(dashboard.includes(token),token);
 for(const fake of ["1,248","48,320","3,642"])assert.ok(!dashboard.includes(fake),"Mockup placeholder found: "+fake);
});
test("Reusable components and scoped light/dark visual rules exist",()=>{
 const ui=read("components/admin/AdminUi.tsx");
 for(const token of ["AdminPageHeader","AdminPanel","AdminMetric","AdminAction","AdminTableFrame","AdminEmptyState"])assert.ok(ui.includes(token),token);
 for(const token of [".bazunk-admin-wordpress",".dark .bazunk-admin-wordpress",".wp-nav-link",".wp-dashboard-kpis","focus-visible"])assert.ok(css.includes(token),token);
});
