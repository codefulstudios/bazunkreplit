import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const source=fs.readFileSync("artifacts/sellbuydeal/src/pages/ListingPage.tsx","utf8");
const read=name=>fs.readFileSync("artifacts/sellbuydeal/src/components/listing/"+name,"utf8");
test("listing retains purchase and engagement handlers",()=>{for(const h of ["handleBuyNow","handleMessageSeller","handleWatchlist","handleSendOffer"])assert.match(source,new RegExp(h));});
test("gallery has accessible controls and mobile thumbnails",()=>{const s=read("ListingProductGallery.tsx");for(const x of ["aria-label","aria-pressed","overflow-x-auto","role=\"dialog\"","data-testid=\"button-prev-image\""])assert.ok(s.includes(x),x)});
test("seller follow and related sections extracted",()=>{assert.match(source,/import \{ SellerCard \}/);assert.match(source,/import \{ RelatedListingsBox \}/);assert.match(read("ListingSellerCard.tsx"),/FollowSellerButton/);assert.match(read("RelatedListingsBox.tsx"),/sponsored/);});
test("related recommendations are not shuffled",()=>assert.doesNotMatch(read("RelatedListingsBox.tsx"),/Math\.random\(/));
test("listing grid adapts to mobile and desktop",()=>assert.match(source,/lg:grid-cols-\[minmax/));
