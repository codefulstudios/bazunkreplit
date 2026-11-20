import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const root="artifacts/sellbuydeal/src/pages/admin/";
const css=readFileSync(root+"modern-blue-admin.css","utf8");
const layout=readFileSync(root+"AdminLayout.tsx","utf8");
const editor=readFileSync(root+"AdminComponentEditor.tsx","utf8");
test("shared admin styling covers all management pages",()=>{
 assert.match(layout,/import "\.\/modern-blue-admin\.css"/);
 assert.match(css,/\.bazunk-admin main :is\(input/);
 assert.match(css,/\.bazunk-admin main :is\(button/);
 assert.match(css,/\.bazunk-admin main :is\(th\)/);
 assert.match(css,/\.dark \.bazunk-admin main/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
test("admin appearance controls drive shared components",()=>{
 for(const token of ["--bz-admin-sidebar-width","--bz-admin-radius","--bz-admin-density","data-admin-sidebar","data-admin-button"]){assert.ok(layout.includes(token),token)}
 for(const key of ["sidebarStyle","density","radius","button","shadow","font"]){assert.ok(editor.includes(key),key)}
});
