import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const demo=read('artifacts/api-server/src/routes/demoCreator.ts');
const listings=read('artifacts/api-server/src/routes/listings.ts');
const checkout=read('artifacts/api-server/src/lib/checkoutQuote.ts');
const detail=read('artifacts/sellbuydeal/src/pages/ListingPage.tsx');
const routes=read('artifacts/api-server/src/routes/index.ts');
const app=read('artifacts/sellbuydeal/src/App.tsx');

test('demo creator is routed behind admin authentication',()=>{
 assert.match(demo,/router\.use\("\/admin\/demo-creator", requireAdmin\)/);
 assert.match(routes,/router\.use\(demoCreatorRouter\)/);
 assert.match(app,/path="\/admin\/demo-creator"/);
});
test('demo visibility defaults off and public listing query respects approval',()=>{
 assert.match(demo,/demo_creator_settings \(key TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE\)/);
 assert.match(listings,/NOT d\.enabled/);
 assert.match(listings,/key='master'/);
 assert.match(listings,/key='listings'/);
});
test('demo listing has zero stock and cannot be purchased',()=>{
 assert.match(demo,/demo_creator:true/);
 assert.match(demo,/\},0\) RETURNING id/);
 assert.match(checkout,/Demo listings are for preview only and cannot be purchased/);
 assert.match(detail,/disabled=\{isDemoListing\}/);
 assert.match(detail,/Temporarily out of stock/);
});
test('admin publishing and regional fixtures exist',()=>{
 assert.match(demo,/listings\/batch-publish/);
 assert.match(demo,/marketplace_region:region/);
 assert.match(demo,/pendingApproval:requireApproval/);
});

test('public category counts exclude hidden demos',()=>{
 assert.match(listings,/const demoVisibility = await categoryVisibility\(\)/);
 assert.match(listings,/AND \$\{demoVisibility\}/);
});
