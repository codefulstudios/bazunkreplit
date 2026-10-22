import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";
const dir="artifacts/sellbuydeal/src/pages/admin/";
const layout=readFileSync(dir+"AdminLayout.tsx","utf8");
const styles=readFileSync(dir+"modern-blue-admin.css","utf8");
test("WordPress sidebar keeps all routes and twelve top-level sections",()=>{
 const routes=[...layout.matchAll(/href: "(\/admin\/[^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(routes).size,routes.length);
 assert.ok(routes.length>=30);
 assert.match(layout,/Dashboard<\/span>/);
 assert.match(layout,/DESIGN_SECTIONS/);
 for(const name of ["listings","orders","customers","sellers","payments","marketing","content","design","importers","analytics","settings"])assert.match(layout,new RegExp('id:"'+name+'"'));
});
test("sidebar has keyboard-accessible groups, collapse, and mobile drawer",()=>{
 for(const content of ["aria-expanded={expanded}","aria-controls={`admin-nav-","aria-current={active?","toggleSidebar","aria-label={sidebarCollapsed?","lg:hidden","savedAdminNavScrollTop"])assert.ok(layout.includes(content),content);
});
test("sidebar light/dark and compact rail styles are scoped",()=>{
 for(const content of [".bazunk-admin aside",".dark .bazunk-admin aside",'data-sidebar-collapsed="true"',"@media(max-width:1023px)",".admin-nav-link[aria-current"]) assert.ok(styles.includes(content),content);
});
