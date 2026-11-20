import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const root="artifacts/sellbuydeal/src/";
const read=(path)=>readFileSync(root+path,"utf8");
const ui=read("components/admin/AdminUi.tsx");
const css=read("pages/admin/admin-wordpress-phase2.css");
const shell=read("pages/admin/AdminLayout.tsx");
const pages=[
 ["Listings","pages/admin/AdminListingsPage.tsx"],
 ["Orders","pages/admin/AdminOrdersPage.tsx"],
 ["Customers","pages/admin/AdminUsersPage.tsx"],
 ["Sellers","pages/admin/AdminSellerCompliancePage.tsx"],
 ["Payments","pages/admin/AdminPaymentsPage.tsx"]
];
test("Shared management components include accessible headings and actionable tabs",()=>{
 assert.match(ui,/function AdminManagementHeader/);
 assert.match(ui,/function AdminStatusTabs/);
 assert.match(ui,/aria-pressed=\{value===option.value\}/);
 assert.match(ui,/onChange\(option.value\)/);
});
test("All five operational pages adopt the shared visual system without removing their existing APIs",()=>{
 for(const [name,p] of pages){
  const s=read(p);
  assert.ok(s.includes("AdminManagementHeader"),name);
  assert.ok(s.includes('title="'+name+'"'),name);
  assert.ok(s.includes("AdminStatusTabs")||name==="Payments",name);
  assert.match(s,/<AdminLayout>/);
 }
 assert.match(read("pages/admin/AdminListingsPage.tsx"),/authFetch/);
 assert.match(read("pages/admin/AdminOrdersPage.tsx"),/AdminBulkSelection/);
 assert.match(read("pages/admin/AdminUsersPage.tsx"),/AdminBulkSelection/);
 assert.match(read("pages/admin/AdminSellerCompliancePage.tsx"),/AdminComplianceCaseHistory/);
 assert.match(read("pages/admin/AdminPaymentsPage.tsx"),/AdminFinanceReconciliation/);
});
test("Visual system stays scoped to admin and provides robust light and dark semantics",()=>{
 assert.match(shell,/import "\.\/admin-wordpress-phase2\.css"/);
 for(const item of ["wp-management-header","wp-status-tabs","wp-management-metrics","wp-management-table-card","wp-operations-ink","focus-visible"]){
  assert.ok(css.includes(item),item)
 }
 assert.match(css,/\.dark \.bazunk-admin-wordpress/);
 assert.doesNotMatch(css,/(?:^|\n)body\s*\{/);
});
