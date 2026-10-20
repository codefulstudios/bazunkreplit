import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const direct=src("artifacts/sellbuydeal/src/pages/DirectSalePage.tsx");
const listingRoute=src("artifacts/api-server/src/routes/listings.ts");
const checkout=src("artifacts/sellbuydeal/src/pages/CheckoutPage.tsx");
const browse=src("artifacts/sellbuydeal/src/pages/BrowsePage.tsx");
const app=src("artifacts/sellbuydeal/src/App.tsx");
const nav=src("artifacts/sellbuydeal/src/components/MobileShopNav.tsx");
const inbox=src("artifacts/sellbuydeal/src/pages/MobileNotificationsPage.tsx");

test("phone Direct Sale has its own simplified five-step journey",()=>{
 assert.match(direct,/mobileSteps\s*=\s*\[1, 2, 3, 4, 6\]/);
 assert.match(direct,/mobileLabels\s*=\s*\["Item", "Photos", "Details", "Delivery", "Publish"\]/);
 assert.match(direct,/id="mobile-direct-sale-steps"/);
 assert.match(direct,/hidden lg:block min-w-0 lg:col-start-2/);
 assert.match(direct,/data-testid="mobile-direct-sale-actions"/);
 assert.match(direct,/data-testid="mobile-next-listing"/);
 assert.match(direct,/data-testid="mobile-publish-listing"/);
 assert.match(direct,/type="submit" disabled=\{publishing\|\|published\}/);
});
test("mobile publication uses existing authenticated API, validates fields and preserves drafts",()=>{
 assert.match(direct,/async function handlePublish\(e: React.FormEvent\)/);
 for(const field of ["Title is required","Price must be greater than 0","Category is required","Description is required"])assert.ok(direct.includes(field));
 assert.match(direct,/Authorization: `Bearer \$\{token\}`/);
 assert.match(direct,/marketplaceRegion,/);
 assert.match(direct,/status: "active"/);
 assert.match(direct,/mobile-save-draft/);
 assert.match(direct,/handleSaveDraft/);
 assert.match(direct,/e\.target\.value\s*=\s*"";/);
});
test("shopping navigation routes are mobile-only and keep checkout unobstructed",()=>{
 assert.match(nav,/md:hidden/);
 assert.match(nav,/location\.startsWith\("\/listing\/"\)/);
 assert.match(nav,/href:"\/sell\/direct"/);
 assert.match(nav,/href:"\/notifications"/);
 assert.match(nav,/openCart/);
 assert.ok(!nav.includes('location.startsWith("/checkout")'));
 assert.match(app,/<MobileShopNav \/>/);
 assert.match(app,/<Route path="\/notifications" component=\{MobileNotificationsPage\} \/>/);
});
test("notifications are server-backed and user authenticated",()=>{
 assert.match(nav,/fetch\("\/api\/notifications"/);
 assert.match(inbox,/getToken\(\)/);
 assert.match(inbox,/fetch\("\/api\/notifications\/read"/);
 assert.match(inbox,/Mark all read/);
 assert.match(inbox,/!isSignedIn/);
});
test("mobile checkout shows trustworthy total before payment without changing Stripe flow",()=>{
 const block=checkout.indexOf("Mobile order cost breakdown");
 const pay=checkout.indexOf("data-testid=\"button-continue-payment\"");
 assert.ok(block>=0 && pay>block,"Mobile fee breakdown must precede payment");
 assert.match(checkout,/data-testid="mobile-checkout-total"/);
 assert.match(checkout,/quote\?formatPrice\(subtotal\)/);
 assert.match(checkout,/buyerProtectionFee/);
 assert.match(checkout,/delivery/);
 assert.match(checkout,/quotedKey!==cartKey/);
 assert.match(checkout,/sticky bottom-2/);
 assert.match(checkout,/fetch\("\/api\/stripe\/checkout-cart"/);
});
test("mobile browse offers one-tap sorts and avoids per-card motion layout",()=>{
 assert.match(browse,/data-testid="mobile-browse-sort"/);
 assert.match(browse,/aria-pressed=\{sort===value\}/);
 assert.match(browse,/grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2\.5 sm:gap-4/);
 const cards=browse.split("function ProductCard(")[1]?.split("export function BrowsePage()")[0]||"";
 assert.ok(!cards.includes("layout\n"),"Product tiles should not force framer layout calculations");
 assert.match(cards,/loading="lazy" decoding="async"/);
});

test("saved draft updates keep mobile delivery and inventory fields",()=>{
  const patch=listingRoute.split('router.patch("/listings/:id"')[1]||
    listingRoute.split('router.patch("/listings/')[1]||"";
  assert.ok(patch,"PATCH listings endpoint must exist");
  for(const key of ["shipOrigin","shipOriginOther","shipZone","carrier","shippingPrice","handlingCharge","quantity","sku"]){
    assert.ok(patch.includes(key),`Draft publishing must preserve ${key}`);
  }
  assert.match(direct,/metadata\.photos/);
  assert.match(direct,/async function shrinkPhoto/);
  assert.match(direct,/capture="environment"/);
});

test("browse controls remain labelled and flexible at 320px",()=>{
 assert.match(browse,/aria-label="Grid view"/);
 assert.match(browse,/aria-label="List view"/);
 assert.match(browse,/aria-label="Remove category filter"/);
 assert.match(browse,/flex min-w-0 max-w-full flex-wrap items-center gap-2/);
});
