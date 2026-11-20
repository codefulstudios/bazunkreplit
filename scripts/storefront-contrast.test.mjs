import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
const root="artifacts/sellbuydeal/src/";
const read=(path)=>fs.readFileSync(root+path,"utf8");
const browse=read("pages/BrowsePage.tsx");
const cards=browse.slice(browse.indexOf("function ProductCard("),browse.indexOf("export function BrowsePage("));
test("Browse cards use theme-paired backgrounds and shared contract",()=>{
 assert.match(cards,/bz-product-card bz-browse-product bg-white dark:bg-slate-900/);
 assert.match(cards,/text-slate-900 dark:text-white/);
 assert.match(cards,/object-contain/);
});
test("Browse card content contains no tiny labels or low-contrast gray",()=>{
 assert.doesNotMatch(cards,/text-\[(?:9|10|11)px\]|text-gray-400|text-white\/40/);
 assert.doesNotMatch(cards,/group-hover:text-\[#4A5CE8\]/);
});
test("Marketplace category captions have a paired surface",()=>{
 const css=read("index.css");
 const category=read("components/CategorySection.tsx");
 assert.match(category,/bz-category-label/);
 assert.match(css,/\.bz-category-card \.bz-category-label[\s\S]*?background-color:#17243a !important;color:#fff !important/);
});
test("Featured cards have explicit light and dark title colours",()=>{
 const css=read("index.css");
 assert.match(css,/\.bz-product-card :is\(h2,h3,\.bz-store-title\) \{color:#0f172a !important/);
 assert.match(css,/\.dark \.bz-product-card :is\(h2,h3,\.bz-store-title\) \{color:#f8fafc !important/);
});

// Phase 1 regression guards for cart accessibility and nested admin dialogs.
test("Cart drawer traps focus and restores the invoking control",()=>{
 const cart=read("components/CartDrawer.tsx");
 assert.match(cart,/ref=\{drawerRef\}/);
 assert.match(cart,/event\.key !== "Tab"/);
 assert.match(cart,/returnFocusRef\.current\?\.focus\(\)/);
 assert.match(cart,/role="dialog"/);
});
test("Admin listing promotion uses a native top-layer modal with readable colours",()=>{
 const promotion=read("components/AdminListingPromotion.tsx");
 assert.match(promotion,/dialog\.showModal\(\)/);
 assert.match(promotion,/bg-white p-4 sm:p-6 text-slate-900/);
 assert.doesNotMatch(promotion,/bg-purple-/);
});

test("Phase 3 search suggestions use region-safe server results and keyboard-accessible controls",()=>{
 const nav=read("components/Navbar.tsx");
 const api=readFileSync("artifacts/api-server/src/routes/listings.ts","utf8");
 assert.match(nav,/\/api\/listings\/search-suggestions\?region=/);
 assert.match(nav,/searchSuggestions\.map\(/);
 assert.match(nav,/focus-visible:outline/);
 assert.match(api,/const allowed = new Set\(safe\.map/);
 assert.match(api,/listingRegionFilter\(req\.query\.region\)/);
});
