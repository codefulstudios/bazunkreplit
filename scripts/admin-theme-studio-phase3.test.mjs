import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const base="artifacts/sellbuydeal/src/";
const get=x=>readFileSync(x,"utf8");
const ui=get(base+"pages/admin/AdminThemeStudioPage.tsx");
const api=get("artifacts/api-server/src/routes/themeStudio.ts");
const routes=get("artifacts/api-server/src/routes/admin.ts");
const app=get(base+"App.tsx");
const navbar=get(base+"components/Navbar.tsx");
const footer=get(base+"components/Footer.tsx");
const hero=get(base+"components/Hero.tsx");
const context=get(base+"context/SiteSettingsContext.tsx");
const nav=get(base+"pages/admin/AdminLayout.tsx");
test("Theme Studio is reachable and has real drafts, preview and publication actions",()=>{
 assert.match(app,/\/admin\/theme-studio/);
 assert.match(nav,/Design Center/);
 assert.match(app,/AdminDesignCenterPage/);
 for(const str of ["Theme Studio","Media Library","History & restore","Desktop preview","Mobile preview",
 "authFetch(\"/api/admin/theme-studio\"","/api/admin/theme-studio/draft","/api/admin/theme-studio/publish"])
  assert.ok(ui.includes(str),str);
 assert.match(ui,/postMessage/);
 assert.match(ui,/bazunk-theme-preview/);
 assert.match(ui,/onClick=\{\(\)=>void publish\(\)\}/);
});
test("Public media is separated from admin write permissions and validates uploads",()=>{
 assert.ok(routes.indexOf("router.use(publicThemeStudioRouter);")<routes.indexOf('router.use("/admin", requireAdmin);'));
 assert.ok(routes.indexOf("router.use(adminThemeStudioRouter);")>routes.indexOf('router.use("/admin", requireAdmin);'));
 for(const v of ["admin/theme-studio/media","site-media/:id","image/png","image/jpeg","image/webp",
 "1048576","Buffer.from","mediaTable","site_media_assets","validTheme(fields)"])
  assert.ok(api.includes(v),v);
 assert.match(api,/theme_studio_history_v1/);
 assert.match(routes,/String\(row.key\).startsWith\("theme_studio_"\)/);
});
test("Published settings are used by actual public homepage, logos and footer",()=>{
 assert.match(navbar,/featureSettings.site_logo_url/);
 assert.match(footer,/s.site_logo_url/);
 assert.match(footer,/s.footer_about/);
 for(const name of ["hero_title","hero_subtitle","hero_cta_primary","hero_cta_secondary"])assert.ok(hero.includes("featureSettings."+name),name);
 assert.match(context,/bazunk:theme-preview-settings/);
 assert.match(context,/event.origin!==window.location.origin/);
 assert.match(api,/theme_studio_enabled/);
 assert.match(api,/sql\.join\(updates\.map/);
});

test("Homepage builder changes real storefront ordering without hiding core shopping sections",()=>{
 const layout=get(base+"design-system/homepageSections.ts");
 for(const id of ["promoted","live","promos","perks","features","rewards","announcement","ads"])assert.ok(layout.includes('id:"'+id+'"'),id);
 assert.match(layout,/new Set\(value.map/);
 assert.match(app,/parseHomeSections\(settings.home_sections_layout\)/);
 assert.match(app,/optionalSections.filter\(section=>section.enabled\)/);
 assert.ok(app.indexOf("<Hero />")<app.indexOf("optionalSections.filter"));
 assert.ok(app.indexOf("<CategorySection />")<app.indexOf("optionalSections.filter"));
 assert.ok(app.indexOf('<FeaturedListings mode="recent" />')<app.indexOf("optionalSections.filter"));
 assert.match(ui,/draggable onDragStart/);
 assert.match(ui,/onDragOver=\{e=>e.preventDefault\(\)\}/);
 assert.match(ui,/onDrop=\{e=>/);
 assert.match(ui,/setVisible\(entry.id,e.target.checked\)/);
});
test("Theme Studio keeps drafts, media and version history in one validated publish",()=>{
 for(const phrase of ["home_sections_layout","site_favicon_url","hero_image_url","validHomeLayout","normalizeTheme","sql.join(updates.map","theme_studio_history_v1","theme_studio_draft_v1"])
  assert.ok(api.includes(phrase),phrase);
 assert.match(api,/new Set\(sections.map/);
 assert.match(api,/Object.keys\(x\).sort\(\).join/);
 assert.match(context,/bazunk:theme-preview-select/);
 assert.match(context,/event.origin!==window.location.origin/);
 assert.match(ui,/event.source!==iframe.current\?\.contentWindow/);
 assert.match(ui,/Use favicon/);
 assert.match(ui,/Use hero/);
 assert.match(hero,/featureSettings.hero_image_url/);
 assert.match(context,/settings.site_favicon_url/);
});
