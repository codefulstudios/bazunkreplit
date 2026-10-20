import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=p=>readFileSync(p,"utf8");
test("DealPilot controls are isolated and editable in admin",()=>{
 const admin=read("artifacts/sellbuydeal/src/pages/admin/AdminDesignSystemPage.tsx");
 const panel=read("artifacts/sellbuydeal/src/components/DealPilotPanel.tsx");
 const css=read("artifacts/sellbuydeal/src/design-system/protected.css");
 const api=read("artifacts/api-server/src/routes/admin.ts");
 assert.match(admin,/<option value="dealpilot">DealPilot page<\/option>/);
 assert.match(admin,/designSettingKey\(area,mode\)/);
 assert.match(panel,/data-design-custom/);
 assert.match(panel,/bz-dp-hero/);
 assert.match(panel,/bz-dp-mission/);
 assert.match(css,/\[data-testid="deal-pilot-panel"\]\[data-design-custom="true"\]/);
 assert.match(api,/storefront\|admin\|dealpilot/);
});
