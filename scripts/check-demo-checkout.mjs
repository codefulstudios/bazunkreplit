/**
 * Run against a disposable staging environment with:
 * API_BASE_URL=https://staging.example.com
 * DEMO_LISTING_ID=123 REAL_LISTING_ID=456 node scripts/check-demo-checkout.mjs
 * Never use production buyer credentials or submit a real Stripe payment.
 */
import assert from "node:assert/strict";
const base=process.env.API_BASE_URL?.replace(/\/$/,"");
// Never exercise test mutations or checkout probes against production hosts.
if (base) {
  const hostname = new URL(base).hostname.toLowerCase();
  if (hostname === "bazunk.com" || hostname === "www.bazunk.com" || hostname === "bazunk-api.onrender.com" || hostname === "bazunk-web.onrender.com" || !/staging|preview|localhost|127\\.0\\.0\\.1|test/i.test(hostname)) {
    throw new Error("Refusing to run Demo Creator integration checks against a non-staging host.");
  }
}

const demo=Number(process.env.DEMO_LISTING_ID);
const real=Number(process.env.REAL_LISTING_ID);
if(!base||!Number.isSafeInteger(demo)||!Number.isSafeInteger(real)||demo===real){
  console.error("Set API_BASE_URL, DEMO_LISTING_ID and REAL_LISTING_ID for staging.");
  process.exit(2);
}
async function quote(ids){
  const response=await fetch(base+"/api/stripe/quote-cart",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({items:ids.map(id=>({id,quantity:1}))})
  });
  return {status:response.status,body:await response.json()};
}
const demoOnly=await quote([demo]);
assert.equal(demoOnly.status,409,"Demo-only cart must be rejected");
assert.match(demoOnly.body.error||" ",/unavailable|remove/i);
const mixed=await quote([demo,real]);
assert.equal(mixed.status,409,"Mixed cart must be rejected");
const genuine=await quote([real]);
assert.equal(genuine.status,200,"Real-only cart must remain purchasable");
console.log("PASS: demo-only and mixed carts blocked; genuine cart quoted.");
