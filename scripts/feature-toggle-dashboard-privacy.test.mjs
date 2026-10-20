import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const admin = read("artifacts/sellbuydeal/src/pages/admin/AdminFeatureFlagsPage.tsx");
const dashboard = read("artifacts/sellbuydeal/src/pages/DashboardPage.tsx");
const api = read("artifacts/api-server/src/routes/adminFeatureControls.ts");
const siteSettings = read("artifacts/sellbuydeal/src/context/SiteSettingsContext.tsx");

test("admin switches can be used without an offscreen audit reason", () => {
  assert.match(admin, /Reason for next toggle change or rollback \(optional\)/);
  assert.match(admin, /const auditReason=requestedReason \|\|/);
  assert.match(admin, /Admin \$\{entry\?"rollback":"toggle"\}/);
  assert.match(admin, /disabled=\{busy!==null\|\|!meta\|\|meta\.readOnly\}/);
  assert.doesNotMatch(admin, /disabled=\{[^}]*reason\.trim\(\)\.length<8/);
  assert.match(admin, /role="switch" type="button" aria-checked=\{f.enabled\}/);
  assert.match(admin, /window\.confirm\(/);
});

test("feature changes confirm database persistence and refresh public site settings", () => {
  assert.match(admin, /\/api\/admin\/feature-flags/);
  assert.match(admin, /expectedEnabled:f\.enabled/);
  assert.match(admin, /const persisted=current\.find/);
  assert.match(admin, /persisted\.enabled!==nextEnabled/);
  assert.match(admin, /cache:"no-store"/);
  assert.match(admin, /bazunk-settings-updated/);
  assert.match(siteSettings, /window\.addEventListener\("bazunk-settings-updated", loadSettings\)/);
  assert.match(api, /feature_toggle_changes/);
  assert.match(api, /pg_advisory_xact_lock/);
  assert.match(api, /const before=row\?\.value==null\?true/);
  assert.match(api, /"production"/);
});

test("admin environment metadata does not depend on optional history retrieval", () => {
  const start=admin.indexOf("const loadControls=async()");
  const end=admin.indexOf("useEffect(()=>{if(token)",start);
  const controls=admin.slice(start,end);
  assert.match(controls, /setMeta\(md as Meta\)/);
  assert.match(controls, /setHistory\(Array\.isArray/);
  assert.ok(controls.indexOf("setMeta(md as Meta)")<controls.indexOf("setHistory("));
  assert.doesNotMatch(controls,/Promise\.all/);
});

test("dashboard sidebar never reveals account email; email still available for account tools", () => {
  assert.match(dashboard, /<p className="font-bold text-gray-900">\{user\.username\}<\/p>/);
  const marker=dashboard.indexOf("{/* Nav menu — icon rail");
  assert.ok(marker>0);
  const sidebar=dashboard.slice(marker-750,marker);
  assert.doesNotMatch(sidebar, /user\.email/);
  assert.doesNotMatch(sidebar, /savedProfile\.email/);
  assert.match(dashboard, /savedProfile\.email/);
});
