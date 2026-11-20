import {readFileSync} from "node:fs";import {test} from "node:test";import assert from "node:assert/strict";
const p="artifacts/sellbuydeal/src/pages/admin/";
const page=readFileSync(p+"AdminDashboardPage.tsx","utf8");
const css=readFileSync(p+"modern-blue-admin.css","utf8");
test("sales and growth charts share responsive modern blue arrangement",()=>{
 for(const token of ["admin-charts grid","xl:grid-cols-2","admin-chart-card","Sales & GMV","Registration trends","admin-chart-plot"])assert.ok(page.includes(token),token);
 assert.match(css,/admin-chart-card\{min-height:375px/);
 assert.match(css,/\.dark \.bazunk-admin \.admin-charts/);
});
test("sales chart uses separate order and currency axes",()=>{
 assert.match(page,/yAxisId="orders"/);
 assert.match(page,/yAxisId="gmv"/);
 assert.match(page,/orientation="right"/);
 assert.match(page,/data=\{s\.salesTrend\}/);
 assert.match(page,/data=\{s\.userTrend\}/);
});
