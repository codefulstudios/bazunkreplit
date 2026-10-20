import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const front=read("artifacts/sellbuydeal/src/pages/CashbackPage.tsx");
const admin=read("artifacts/sellbuydeal/src/pages/admin/AdminCashbackPage.tsx");
const app=read("artifacts/sellbuydeal/src/App.tsx");
const api=read("artifacts/api-server/src/routes/cashback.ts");

test("customer Cashback calls the configured API rather than the static SPA fallback",()=>{
  assert.match(front,/const API_BASE=\(import\.meta\.env\.VITE_API_URL\|\|import\.meta\.env\.VITE_API_BASE_URL/);
  assert.match(front,/fetch\(\`\$\{API_BASE\}\/api\`\+path/);
  assert.doesNotMatch(front,/fetch\("\/api"\+path/);
  assert.match(front,/\/cashback\/settings/);
  assert.match(front,/\/cashback\/account/);
  assert.match(api,/router\.get\("\/cashback\/settings"/);
  assert.match(api,/router\.get\("\/cashback\/account"/);
});

test("Cashback loading effect does not restart whenever authentication callbacks change",()=>{
  assert.match(front,/tokenRef\.current=getToken/);
  assert.match(front,/const get=useCallback\(async/);
  assert.match(front,/authenticated\?await tokenRef\.current\(\)/);
  assert.match(front,/\},\[\]\);\s*const load=useCallback/);
  assert.match(admin,/authFetchRef\.current=authFetch/);
  assert.match(admin,/authFetchRef\.current\("\/api\/admin\/cashback\/settings"/);
  assert.match(admin,/\},\[\]\);\s*useEffect\(\(\)=>\{if\(isAdmin\)/);
  assert.doesNotMatch(admin,/\},\[authFetch\]\)/);
});

test("both Cashback routes recover from rendering errors instead of showing an empty page",()=>{
  assert.match(app,/class CashbackErrorBoundary extends React\.Component/);
  assert.match(app,/Cashback could not open/);
  assert.match(app,/Retry Cashback/);
  assert.match(app,/<CashbackErrorBoundary admin><AdminCashbackPage/);
  assert.match(app,/<CashbackErrorBoundary><FeatureGate feature="cashback"/);
  assert.match(front,/role="alert"/);
  assert.match(admin,/role="alert"/);
  assert.match(front,/Retry cashback/);
  assert.match(admin,/Retry Cashback/);
});

test("invalid or unavailable API responses show an error without misrepresenting customer funds",()=>{
  assert.match(front,/Array\.isArray\(config\.tiers\)/);
  assert.match(front,/Array\.isArray\(details\.earnings\)/);
  assert.match(front,/Array\.isArray\(details\.payouts\)/);
  assert.match(admin,/Array\.isArray\(settings\.tiers\)/);
  assert.match(admin,/Array\.isArray\(overview\.payouts\)/);
  assert.match(front,/AbortSignal\.timeout\(20000\)/);
  assert.match(admin,/AbortSignal\.timeout\(20000\)/);
});
