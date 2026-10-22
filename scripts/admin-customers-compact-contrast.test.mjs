import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const root="artifacts/sellbuydeal/src/";
const users=readFileSync(root+"pages/admin/AdminUsersPage.tsx","utf8");
const css=readFileSync(root+"pages/admin/admin-wordpress-finish.css","utf8");
const shell=readFileSync(root+"pages/admin/AdminLayout.tsx","utf8");
test("Active sidebar label and child icons are readable on light and dark surfaces",()=>{
 assert.match(shell,/wp-nav-link/);
 assert.match(css,/\.admin-nav-link\.wp-nav-child\[aria-current="page"\] :is\(span,svg\)/);
 assert.match(css,/\.admin-nav-link\.wp-nav-active :is\(span,svg\)/);
 assert.match(css,/color:#1255c6!important/);
 assert.match(css,/background:#eaf2ff!important/);
 assert.match(css,/\.dark \.bazunk-admin\.bazunk-admin-wordpress aside \.admin-nav-link/);
 assert.match(css,/color:#f8fafc!important/);
});
test("Customers summary fits five table columns with a compact two-line view",()=>{
 assert.match(users,/admin-users-compact-table/);
 assert.match(users,/table-fixed/);
 assert.match(users,/\["Customer","Marketplace activity","Account & credits","Actions"\]/);
 assert.match(users,/colSpan=\{5\}/);
 assert.match(users,/Fragment key=\{u.email\}/);
 assert.doesNotMatch(users,/\["User", "Selling", "Buying", "Messages", "Reputation/);
 assert.match(css,/table-layout:fixed/);
 assert.match(css,/@media\(max-width:800px\)/);
});
test("All customer management operations remain reachable without horizontal table scrolling",()=>{
 for(const operation of ["saveCredits(u.email,1)","saveCredits(u.email,-1)","toggleBan(u.email,u.banned)",
  "toggleMilestones(u.email)","setDeleteUser(u)","setEditUser(u)","setMsgUser(u)",
  "selectedUserIds","AdminBulkSelection","creditResult[u.email]"]){
  assert.ok(users.includes(operation),operation);
 }
 assert.match(users,/expandedManageEmail===u.email/);
 assert.match(users,/aria-expanded=\{expandedManageEmail===u.email\}/);
 assert.match(users,/admin-users-details-grid/);
 assert.doesNotMatch(users,/overflow-x-auto bz-table-scroll/);
});
