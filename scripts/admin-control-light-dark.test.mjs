import{readFileSync}from"node:fs";import{test}from"node:test";import assert from"node:assert/strict";
const base="artifacts/sellbuydeal/src/pages/admin/";
const old=readFileSync(base+"admin-theme.css","utf8");
const css=readFileSync(base+"modern-blue-admin.css","utf8");
const layout=readFileSync(base+"AdminLayout.tsx","utf8");
test("sidebar group headers remain readable in both themes",()=>{
assert.match(old,/aside button\[aria-controls\^="admin-nav-"\] \{color:#334155!important/);
assert.match(old,/\.dark \.bazunk-admin aside button\[aria-controls\^="admin-nav-"\]/);
});
test("every AdminLayout submenu receives shared styles",()=>{
assert.match(layout,/import "\.\/modern-blue-admin\.css"/);
for(const kind of ['input[type="text"]','input[type="search"]','input[type="password"]','input[type="date"]','select,textarea','[role="combobox"]','input[type="checkbox"]','input[type="radio"]','focus-visible'])assert.ok(css.includes(kind),kind);
assert.match(css,/\.dark \.bazunk-admin main/);
assert.match(css,/color-scheme:dark/);
});
