/**
 * Staging-only integration test. Requires an admin token and disposable test seller.
 * API_BASE_URL, ADMIN_TOKEN, DEMO_SELLER_EMAIL must be provided.
 * Creates and retires demo listings; never run against production.
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

const token=process.env.ADMIN_TOKEN;
const sellerEmail=process.env.DEMO_SELLER_EMAIL;
if(!base||!token||!sellerEmail||!process.env.STAGING_TEST_CONFIRMATION){
  console.error("Set API_BASE_URL, ADMIN_TOKEN, DEMO_SELLER_EMAIL and STAGING_TEST_CONFIRMATION for a disposable staging environment.");
  process.exit(2);
}
async function call(path,method="GET",body,authorization=token){
 const response=await fetch(base+"/api"+path,{method,headers:{
   "content-type":"application/json",...(authorization?{authorization:"Bearer "+authorization}:{})
 },...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,data};
}
const unauthorized=await call("/admin/demo-creator","GET",undefined,null);
assert.ok([401,403].includes(unauthorized.status),"Admin endpoint must reject unauthenticated access");
const settings=await call("/admin/demo-creator");
assert.equal(settings.status,200,"Admin should access Demo Creator");
const created=[];
try{
 for(const region of ["uk","us"]){
  const result=await call("/admin/demo-creator/listings","POST",{
    sellerEmail,region,title:"Integration sample "+region,
    description:"Disposable staging test listing",category:"Electronics",price:"12.99"
  });
  assert.equal(result.status,201,JSON.stringify(result.data));
  const id=result.data.listingId;created.push(id);
  const publicListing=await call("/listings/"+id,"GET",undefined,null);
  // Listings may be hidden when master settings are disabled.
  assert.ok([200,404].includes(publicListing.status));
  const cart=await call("/stripe/quote-cart","POST",{items:[{id,quantity:1}]},null);
  assert.equal(cart.status,409,"Demo checkout must be blocked");
 }
 const realId=Number(process.env.REAL_LISTING_ID);
 if(Number.isSafeInteger(realId)&&realId>0){
  const real=await call("/stripe/quote-cart","POST",{items:[{id:realId,quantity:1}]},null);
  assert.equal(real.status,200,"Genuine checkout must work");
  const mixed=await call("/stripe/quote-cart","POST",{items:[{id:realId,quantity:1},{id:created[0],quantity:1}]},null);
  assert.equal(mixed.status,409,"Mixed checkout must be blocked");
 }
 console.log("PASS: admin auth, both regions, demo checkout guard");
}finally{
 if(created.length){
  const deleted=await call("/admin/demo-creator/listings/batch-delete","POST",{ids:created});
  assert.equal(deleted.status,200,"Test fixtures must be retired");
 }
}
