import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const read=p=>readFileSync("artifacts/sellbuydeal/src/"+p,"utf8");
const layout=read("pages/admin/AdminLayout.tsx");
const app=read("App.tsx");
const dashboard=read("pages/admin/AdminDashboardWordpressPage.tsx");
const common=read("components/admin/AdminUi.tsx");
const workspace=read("pages/admin/AdminWorkspacePages.tsx");
const styles=read("pages/admin/admin-wordpress.css");
test("WordPress-style menu has Dashboard first and every approved section",()=>{
 const names=["Listings","Orders","Customers","Sellers","Payments","Marketing","Content","Design Center","Importers","Analytics","Settings"];
 assert.match(layout,/Dashboard<\/span>/);
 for(const n of names)assert.match(layout,new RegExp('label:"'+n+'"'));
 assert.ok(layout.indexOf("Dashboard</span>")<layout.indexOf("{NAV_GROUPS.map(group=>"));
 assert.match(layout,/DESIGN_SECTIONS\.map/);
 assert.match(layout,/aria-expanded=\{expanded\}/);
});
test("Existing management tools remain reachable through menu groups",()=>{
 const keys=[...layout.matchAll(/label: "([^"]+)",\s*href: "(\/admin\/[^"]+)"/g)].map(m=>m[1]);
 const grouped=[...layout.matchAll(/pages:\[([^\]]+)\]/g)].flatMap(m=>[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]));
 for(const name of keys.filter(k=>!["Dashboard","Design Center"].includes(k)))assert.ok(grouped.includes(name),name+" no longer appears in admin menu");
});
test("Real dashboard uses the actual admin statistics and orders APIs",()=>{
 assert.match(app,/AdminDashboardWordpressPage as AdminDashboardPage/);
 assert.match(app,/<Route path="\/admin\/dashboard" component=\{AdminDashboardPage\}/);
 assert.match(dashboard,/authFetch\("\/api\/admin\/stats"/);
 assert.match(dashboard,/authFetch\("\/api\/admin\/orders\?q=&status="/);
 for(const prop of ["orderCount","gmv","userCount","activeListings","openDisputes","openReturns"])assert.ok(dashboard.includes("stats."+prop));
 for(const component of ["AdminPageHeading","AdminPanel","AdminQuickLink","AdminStatCard","AdminTableWrap","AdminActionRequired"])assert.ok(dashboard.includes(component));
 assert.doesNotMatch(dashboard,/1,248|48,320|3,642/);
});
test("Content and Analytics hubs point only to real existing admin routes",()=>{
 assert.match(app,/<Route path="\/admin\/content"/);
 assert.match(app,/<Route path="\/admin\/analytics"/);
 assert.match(workspace,/authFetch\("\/api\/admin\/stats"/);
 assert.match(workspace,/href="\/admin\/design-system"/);
 assert.match(workspace,/href="\/admin\/system-status"/);
});
test("All reusable controls have focus-safe presentation and dark mode styles",()=>{
 for(const k of ["AdminPageHeading","AdminPanel","AdminStatCard","AdminQuickLink","AdminEmptyState","AdminTableWrap"])assert.ok(common.includes("function "+k));
 assert.match(styles,/\.bazunk-admin-wp/);
 assert.match(styles,/\.dark \.bazunk-admin-wp/);
 assert.match(styles,/focus-visible/);
 assert.match(layout,/import "\.\/admin-wordpress\.css"/);
});
