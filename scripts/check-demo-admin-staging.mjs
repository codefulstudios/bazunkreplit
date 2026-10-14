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
const catalogue=await call("/admin/demo-creator/catalogue");
assert.equal(catalogue.status,200);
assert.ok(catalogue.data.products.length>=80);
assert.ok(catalogue.data.categories.length>=15);
try{
 for(const region of ["uk","us"]){
  const result=await call("/admin/demo-creator/listings","POST",{
    sellerEmail,region,title:"Integration sample "+region,
    description:"Disposable staging test listing",category:"Electronics",price:"12.99"
  });
  assert.equal(result.status,201,JSON.stringify(result.data));
  const id=result.data.listingId;created.push(id);
  const registry=await call("/admin/demo-creator");
  assert.equal(registry.status,200);
  const entry=registry.data.listings.find(l=>Number(l.listing_id)===id);
  assert.ok(entry,"Created listing must be registered");
  assert.equal(entry.region,region,"Demo listing region must match");
  const publicListing=await call("/listings/"+id,"GET",undefined,null);
  // Listings may be hidden when master settings are disabled.
  assert.ok([200,404].includes(publicListing.status));
  if(publicListing.status===200) assert.equal(Number(publicListing.data.quantity ?? publicListing.data.listing?.quantity ?? 0),0,"Demo inventory must remain zero");
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
 const generated=await call("/admin/demo-creator/generate","POST",{
   sellerEmail,region:"uk",count:2,mode:"random",category:"All categories",
   preventDuplicates:true,requireApproval:true
 });
 assert.equal(generated.status,201,JSON.stringify(generated.data));
 created.push(...generated.data.listingIds);
 assert.equal(generated.data.pendingApproval,true);
 const afterGenerate=await call("/admin/demo-creator");
 const generatedRows=afterGenerate.data.listings.filter(l=>generated.data.listingIds.includes(Number(l.listing_id)));
 assert.equal(generatedRows.length,2);
 assert.ok(generatedRows.every(l=>l.enabled===false),"Approval required: generated listings must be unpublished");
 assert.equal(new Set(generatedRows.map(l=>l.title)).size,2,"Generation must not duplicate products");
 const approved=await call("/admin/demo-creator/listings/"+generated.data.listingIds[0],"PATCH",{enabled:true});
 assert.equal(approved.status,200,"Admin should publish an approved demo listing");
 const disabled=await call("/admin/demo-creator/listings/"+generated.data.listingIds[0],"PATCH",{enabled:false});
 assert.equal(disabled.status,200,"Admin should unpublish a demo listing");
 const badCategory=await call("/admin/demo-creator/generate","POST",{sellerEmail,region:"uk",count:1,mode:"category",category:"Not a category"});
 assert.equal(badCategory.status,400);
 console.log("PASS: admin auth, both regions, zero inventory, checkout guard, catalogue, unique generation, approval toggles");
}finally{
 if(created.length){
  const deleted=await call("/admin/demo-creator/listings/batch-delete","POST",{ids:created});
  assert.equal(deleted.status,200,"Test fixtures must be retired");
 }
}
