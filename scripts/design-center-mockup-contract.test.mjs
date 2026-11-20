import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=p=>readFileSync(p,"utf8");
test("Mockup platform selector and previews are present",()=>{
 const page=read("artifacts/sellbuydeal/src/pages/admin/AdminDesignSystemPage.tsx");
 for(const label of ["Frontend Web","Frontend Mobile","Admin","Apply frontend web changes to mobile too","Desktop Preview","Mobile Preview","Design Sync & Inheritance","Preview page","Publish"])assert.ok(page.includes(label),label);
});
test("Mobile design inheritance is real and server validated",()=>{
 const ctx=read("artifacts/sellbuydeal/src/context/SiteSettingsContext.tsx");
 const api=read("artifacts/api-server/src/routes/admin.ts");
 assert.match(ctx,/design_mobile_inherit_web/);
 assert.match(ctx,/max-width: 767px/);
 assert.match(api,/design_mobile_inherit_web/);
 assert.match(api,/design_\(draft_\)\?palette_\(storefront\|admin\|dealpilot\|mobile\)/);
});
