import {readFileSync} from "node:fs";import {test} from "node:test";import assert from "node:assert/strict";
const css=readFileSync("artifacts/sellbuydeal/src/pages/admin/admin-theme.css","utf8");
const modern=readFileSync("artifacts/sellbuydeal/src/pages/admin/modern-blue-admin.css","utf8");
test("admin sidebar link foregrounds are dark on light and bright on dark",()=>{
 assert.match(css,/aside \.admin-nav-link:not\(\[aria-current="page"\]\)\{color:#243954!important/);
 assert.match(css,/\.dark \.bazunk-admin aside \.admin-nav-link:not\(\[aria-current="page"\]\)/);
 assert.match(css,/aside \.admin-nav-link\[aria-current="page"\][\s\S]*color:#fff!important/);
});
test("admin search and signout readable in both modes",()=>{
 for(const x of ["#162b48","#526780","#e9f1ff","#cbd8eb","admin-sidebar-signout-label"])assert.ok(css.includes(x),x);
 assert.match(modern,/\.dark \.bazunk-admin aside \.admin-sidebar-search label/);
});
