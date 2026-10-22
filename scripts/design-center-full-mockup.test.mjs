import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const root="artifacts/sellbuydeal/src/";
const page=read(root+"pages/admin/AdminDesignCenterPage.tsx");
const css=read(root+"pages/admin/admin-design-center.css");
const fields=read(root+"design-system/designCenterFields.ts");
const api=read("artifacts/api-server/src/routes/themeStudio.ts");
const app=read(root+"App.tsx");
const shell=read(root+"pages/admin/AdminLayout.tsx");
const context=read(root+"context/SiteSettingsContext.tsx");
const header=read(root+"components/Navbar.tsx");
const footer=read(root+"components/Footer.tsx");
test("Design Center is a full separate workspace with all approved focused editors",()=>{
 for(const label of ["Overview","Homepage","Header & Navigation","Footer","Branding & Logos","Sitewide Text","Icons","SEO & Meta","Media Library","Templates","Version History"])
  assert.ok(page.includes(label),label);
 assert.match(page,/aria-label="Design Center sections"/);
 assert.match(page,/bzdc-overview-grid/);
 assert.match(page,/bzdc-builder-grid/);
 assert.match(page,/bzdc-edit-grid/);
 assert.match(page,/bzdc-library/);
 assert.doesNotMatch(shell,/const DESIGN_SECTIONS/);
 assert.match(app,/<Route path="\/admin\/design-system" component=\{AdminDesignCenterPage\}/);
 assert.match(app,/<Route path="\/admin\/theme-studio" component=\{AdminDesignCenterPage\}/);
 assert.match(app,/<Route path="\/admin\/design-advanced" component=\{AdminDesignSystemPage\}/);
});
test("Every new text, SEO, image and icon setting is validated by the publish API",()=>{
 const keys=["seo_title","seo_description","seo_og_image_url","header_search_placeholder","icon_overrides",
  "footer_facebook","footer_twitter","footer_instagram","footer_youtube",
  "announcement_text","categories_title","features_title"];
 for(const key of keys){assert.ok(fields.includes(key),key+" UI defaults");assert.ok(api.includes('"'+key+'"'),key+" server");}
 assert.match(api,/validIconOverrides\(str\)/);
 assert.match(api,/validHomeLayout\(str\)/);
 assert.match(api,/mediaKeys\.map\(key=>fields\[key\]\)/);
 assert.match(api,/sql\.join\(updates\.map/);
 assert.match(page,/api\/admin\/theme-studio\/publish/);
 assert.match(page,/api\/admin\/theme-studio\/draft/);
 assert.match(page,/editVersion\.current/);
 assert.match(page,/pendingSave\.current/);
});
test("Sitewide text, SEO and icon changes affect real public components",()=>{
 assert.match(header,/header_search_placeholder/);
 assert.match(header,/iconForPlacement\(studioIcons,"header_cart"\)/);
 assert.match(header,/iconForPlacement\(studioIcons,"header_home"\)/);
 assert.match(header,/iconForPlacement\(studioIcons,"header_search"\)/);
 assert.match(footer,/iconForPlacement\(studioIcons,"footer_facebook"\)/);
 assert.match(footer,/iconForPlacement\(studioIcons,"footer_youtube"\)/);
 assert.match(context,/settings\.seo_title/);
 assert.match(context,/og:image/);
 assert.match(context,/bazunk:theme-preview-settings/);
 assert.match(page,/window\.location\.origin/);
});
test("Mockup styling is scoped, responsive and contrast-aware",()=>{
 for(const selector of [".bzdc-workspace",".bzdc-menu-link.selected",".bzdc-panel",".bzdc-asset",
  ".bzdc-section-item",".bzdc-fields",".bzdc-builder-grid",".bzdc-device-tabs","@media(max-width:780px)"])
  assert.ok(css.includes(selector),selector);
 assert.match(css,/\.dark \.bazunk-admin-wordpress \.bzdc-root/);
 assert.match(css,/color:#125bd3!important/);
 assert.match(css,/color:#ffffff!important|color:white!important/);
 assert.doesNotMatch(css,/(^|\n)\s*(?:body|html)\s*\{/);
});
test("Legacy advanced appearance settings are preserved as an isolated destination",()=>{
 assert.match(page,/navigate\("\/admin\/design-advanced"\)/);
 assert.match(app,/AdminDesignSystemPage/);
 assert.match(fields,/DEFAULT_ICON_OVERRIDES/);
 assert.match(page,/Restore to draft/);
});
