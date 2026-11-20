import {readFileSync} from "node:fs";import {test} from "node:test";import assert from "node:assert/strict";
const dir="artifacts/sellbuydeal/src/pages/admin/";
const dashboard=readFileSync(dir+"AdminDashboardPage.tsx","utf8");
const css=readFileSync(dir+"modern-blue-admin.css","utf8");
test("KPI grid uses consistent responsive card hierarchy",()=>{
 for(const token of ["admin-kpi-grid","xl:grid-cols-4","min-[480px]:grid-cols-2","admin-kpi-label","admin-kpi-value","admin-kpi-icon","admin-kpi-sub"])assert.ok(dashboard.includes(token),token);
 assert.match(css,/height:156px;min-height:156px/);
 assert.match(css,/\.dark \.bazunk-admin \.admin-kpi-grid/);
});
test("KPI tiles use live server stats, not mockup placeholder figures",()=>{
 assert.match(dashboard,/authFetch\("\/api\/admin\/stats"\)/);
 assert.match(dashboard,/s\.gmv/);assert.match(dashboard,/s\.activeListings/);
 assert.match(dashboard,/s\.openDisputes/);
});
