import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read = path => readFileSync(path,"utf8");
const base="artifacts/sellbuydeal/src/";
test("Dashboard is first and Design Center has inline sidebar subnavigation",()=>{
 const x=read(base+"pages/admin/AdminLayout.tsx");
 assert.ok(x.indexOf('label: "Dashboard"') < x.indexOf('label: "Design Center"'));
 assert.ok(x.indexOf('label: "Design Center"') < x.indexOf('label: "Users"'));
 assert.match(x,/id:"design"/);
 assert.doesNotMatch(x,/pages:\["Dashboard","Design Center"\]/);
 assert.match(x,/DESIGN_SECTIONS/);
 assert.match(x,/bazunk-design-section/);
});
test("Design Center consolidates site settings",()=>{
 const x=read(base+"pages/admin/AdminDesignSystemPage.tsx");
 for(const title of ["Typography & Branding","Homepage Content","Footer","Advertising","Icons & Graphics","Layout & Homepage Sections"])assert.ok(x.includes(title),title);
 assert.match(x,/<AdminSettingsPage key=\{designTab\} embedded initialTab=\{designTab\}/);
});
test("Settings embeds without a second AdminLayout",()=>{
 const x=read(base+"pages/admin/AdminSettingsPage.tsx");
 assert.match(x,/const Shell = embedded \? Fragment : AdminLayout/);
});
test("Homepage appearance is section-scoped",()=>{
 const css=read(base+"design-system/protected.css");
 for(const selector of ["bz-design-home-hero","bz-design-home-categories","bz-design-spotlight","bz-design-home-promos"])assert.ok(css.includes(selector),selector);
 for(const component of ["Hero","FeaturedListings","HomepagePromoCards"])assert.match(read(base+"components/"+component+".tsx"),/readSection\(/);
});
test("Graphic and icon settings are validated by API",()=>{
 const api=read("artifacts/api-server/src/routes/admin.ts");
 assert.match(api,/design_hero_image_url/);
 assert.match(api,/design_category_icon_/);
 assert.match(api,/design_section_/);
 assert.match(api,/contrast\(p.text,p.background\)/);
});
