import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(p,"utf8");
const root="artifacts/api-server/src/";
const migration=read(root+"index.ts");
const fee=read(root+"lib/marketplaceFees.ts");
const quote=read(root+"lib/checkoutQuote.ts");
const specials=read(root+"lib/specialCheckout.ts");
const findIt=read(root+"lib/findIt.ts");
const cashback=read(root+"lib/cashback.ts");
const terms=read("artifacts/sellbuydeal/src/pages/TermsPage.tsx");
const cart=read("artifacts/sellbuydeal/src/components/CartDrawer.tsx");
const admin=read("artifacts/sellbuydeal/src/pages/admin/AdminSettingsPage.tsx");
const adminCashback=read("artifacts/sellbuydeal/src/pages/admin/AdminCashbackPage.tsx");
const protection=read("artifacts/sellbuydeal/src/pages/BuyerProtectionPage.tsx");

test("6% plus £1 protection across all private-seller checkout paths",()=>{
 assert.match(fee,/protectionPercent = 6, fixedMinor = 100/);
 assert.match(quote,/buyer_protection_fixed_gbp==null \? 100/);
 assert.match(quote,/percentage\(fees.buyer_protection_percent,6\)/);
 assert.match(specials,/buyer_protection_fixed_gbp==null\?100/);
 assert.match(findIt,/buyer_protection_fixed_gbp==null \? 100/);
 assert.match(findIt,/percentage\(fees.buyer_protection_percent,6\)/);
});
test("four configured tiers have safe future defaults and admin quarter-percent precision",()=>{
 for (const [id,rate,spend] of [["bronze","0.25",50],["silver","0.5",150],["gold","0.75",350],["platinum","1",700]]) {
   assert.ok(cashback.includes(`id:"${id}",name:"${id[0].toUpperCase()+id.slice(1)}",rate:${rate},spendGbp:${spend}`));
 }
 assert.match(adminCashback,/step="\.05" value=\{t\.rate\}/);
});
test("one-time migration updates stored settings, not any earned ledger entries",()=>{
 assert.match(migration,/DO \$\$/);
 assert.match(migration,/END \$\$`, "site_settings.pricing_policy_20261020_v2"/);
 for (const setting of ["buyer_protection_percent","buyer_protection_fixed_gbp","buyer_protection_fixed_eur","buyer_protection_fixed_usd","cashback_program_settings"])assert.ok(migration.includes(setting));
 for (const rate of ["0.25","0.5","0.75","1"])assert.ok(migration.includes(`THEN ${rate}::numeric`));
 assert.match(migration,/IF NOT EXISTS \(SELECT 1 FROM site_settings WHERE key=\x27pricing_policy_20261020_v2\x27\)/);
 const start=migration.indexOf("// Versioned, once-only policy migration");
 const end=migration.indexOf("// ── Buyer / seller marketplace messaging",start);
 const block=migration.slice(start,end);
 assert.doesNotMatch(block,/UPDATE\s+(orders|marketplace_cashback_earnings|marketplace_cashback_payouts)/i);
 assert.doesNotMatch(block,/cashback_runtime_policy/);
});
test("fee pricing appears in legal and sitewide explanations",()=>{
 assert.match(terms,/6% of their combined item price plus £1\.00/);
 assert.match(cart,/6% \+ £1 by default/);
 assert.match(protection,/useRawSettings/);
 assert.match(admin,/buyer_protection_percent: "6"/);
 assert.match(admin,/buyer_protection_fixed_gbp: "1\.00"/);
 for(const p of ["BAZUNK-TERMS-UK.md","BAZUNK-TERMS-EU.md","BAZUNK-TERMS-USA.md"]){
   assert.match(read(p),/6% of their combined item price plus £1\.00/);
 }
});
