import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
const router=Router();

async function addrTable(){
 await db.execute(sql`CREATE TABLE IF NOT EXISTS seller_saved_addresses(
 id BIGSERIAL PRIMARY KEY, owner_email TEXT NOT NULL,
 label TEXT NOT NULL, name TEXT NOT NULL, line1 TEXT NOT NULL, line2 TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL, postcode TEXT NOT NULL, country TEXT NOT NULL,
 is_default BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.execute(sql`CREATE INDEX IF NOT EXISTS seller_saved_addresses_owner ON seller_saved_addresses(LOWER(owner_email))`);
}
const result=(r:any)=>r.rows.map((x:any)=>({id:Number(x.id),label:x.label,name:x.name,line1:x.line1,line2:x.line2,city:x.city,postcode:x.postcode,country:x.country,default:x.is_default}));
async function addresses(email:string){
 const rows=await db.execute(sql`SELECT * FROM seller_saved_addresses WHERE LOWER(owner_email)=${email} ORDER BY is_default DESC,id ASC LIMIT 25`);
 return result(rows);
}
router.get("/account/addresses",async(req,res)=>{
 try{const email=await authenticatedSellerEmail(req,res);if(!email)return;await addrTable();
 res.setHeader("Cache-Control","private,no-store");res.json(await addresses(email));}
 catch(e){console.error("Addresses read error",e);res.status(500).json({error:"Saved addresses unavailable"});}
});
router.post("/account/addresses",async(req,res)=>{
 try{const email=await authenticatedSellerEmail(req,res);if(!email)return;await addrTable();
 const a=req.body??{};const fields=["label","name","line1","line2","city","postcode","country"];
 if(fields.some(k=>typeof a[k]!=="string" && !(k==="line2"&&a[k]===undefined))||
  fields.filter(k=>k!=="line2").some(k=>!a[k]?.trim())||
  fields.some(k=>String(a[k]||"").length>180)){res.status(400).json({error:"Complete all required address fields (180 characters maximum)"});return;}
 const count=await db.execute(sql`SELECT COUNT(*)::int AS n FROM seller_saved_addresses WHERE LOWER(owner_email)=${email}`);
 if(Number((count.rows[0] as any).n)>=25){res.status(400).json({error:"Maximum 25 addresses"});return;}
 await db.transaction(async tx=>{
   await tx.execute(sql`INSERT INTO seller_saved_addresses(owner_email,label,name,line1,line2,city,postcode,country,is_default)
    VALUES(${email},${a.label.trim()},${a.name.trim()},${a.line1.trim()},${(a.line2||"").trim()},${a.city.trim()},${a.postcode.trim()},${a.country.trim()},
    NOT EXISTS (SELECT 1 FROM seller_saved_addresses WHERE LOWER(owner_email)=${email}))`);
 });
 res.status(201).json(await addresses(email));
 }catch(e){console.error("Address create",e);res.status(500).json({error:"Could not save address"});}
});
router.patch("/account/addresses/:id",async(req,res)=>{
 try{const email=await authenticatedSellerEmail(req,res);if(!email)return;await addrTable();
 const id=Number(req.params.id), a=req.body??{};
 if(!Number.isSafeInteger(id)||id<1){res.status(400).json({error:"Invalid address"});return;}
 if(a.makeDefault===true){
  await db.transaction(async tx=>{
   const owned=await tx.execute(sql`SELECT id FROM seller_saved_addresses WHERE id=${id} AND LOWER(owner_email)=${email} FOR UPDATE`);
   if(!owned.rows.length)throw Error("Address not found");
   await tx.execute(sql`UPDATE seller_saved_addresses SET is_default=FALSE WHERE LOWER(owner_email)=${email}`);
   await tx.execute(sql`UPDATE seller_saved_addresses SET is_default=TRUE,updated_at=NOW() WHERE id=${id} AND LOWER(owner_email)=${email}`);
  });
 }else{
  const keys=["label","name","line1","line2","city","postcode","country"];
  if(keys.some(k=>typeof a[k]!=="string")||keys.filter(k=>k!=="line2").some(k=>!a[k]?.trim())||
    keys.some(k=>String(a[k]).length>180)){res.status(400).json({error:"Complete required fields"});return;}
  const u=await db.execute(sql`UPDATE seller_saved_addresses SET label=${a.label.trim()},name=${a.name.trim()},
    line1=${a.line1.trim()},line2=${a.line2.trim()},city=${a.city.trim()},postcode=${a.postcode.trim()},country=${a.country.trim()},updated_at=NOW()
    WHERE id=${id} AND LOWER(owner_email)=${email} RETURNING id`);
  if(!u.rows.length){res.status(404).json({error:"Address not found"});return;}
 }
 res.json(await addresses(email));
 }catch(e){res.status(String(e).includes("not found")?404:500).json({error:"Could not update address"});}
});
router.delete("/account/addresses/:id",async(req,res)=>{
 try{const email=await authenticatedSellerEmail(req,res);if(!email)return;await addrTable();
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)){res.status(400).json({error:"Invalid address"});return;}
 await db.transaction(async tx=>{
  await tx.execute(sql`DELETE FROM seller_saved_addresses WHERE id=${id} AND LOWER(owner_email)=${email}`);
  await tx.execute(sql`UPDATE seller_saved_addresses SET is_default=TRUE,updated_at=NOW() WHERE id=(
    SELECT id FROM seller_saved_addresses WHERE LOWER(owner_email)=${email} ORDER BY is_default DESC,id ASC LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM seller_saved_addresses WHERE LOWER(owner_email)=${email} AND is_default=TRUE)`);
 });
 res.json(await addresses(email));
 }catch(e){res.status(500).json({error:"Could not remove address"});}
});

router.get("/dashboard/seller-metrics",async(req,res)=>{
 try{
 const email=await authenticatedSellerEmail(req,res);if(!email)return;
 const [l,s,p]=await Promise.all([
  db.execute(sql`SELECT COUNT(*)::int listing_count,
     COUNT(*) FILTER(WHERE status='active')::int active_listings,
     COALESCE(SUM(views),0)::int views,COALESCE(SUM(watchers),0)::int watchers
     FROM listings WHERE LOWER(seller_email)=${email}`),
  db.execute(sql`SELECT COUNT(*) FILTER (WHERE status NOT IN ('cancelled','refunded'))::int sales,
    COUNT(*) FILTER (WHERE status='delivered')::int delivered,
    COALESCE(SUM(CASE WHEN status NOT IN('cancelled','refunded') THEN seller_net ELSE 0 END),0)::numeric sales_net,
    COALESCE(SUM(CASE WHEN payout_status='paid' OR stripe_transfer_id IS NOT NULL OR payout_status IN ('refund_pending','reversal_pending')
          OR status IN ('disputed','return_requested') THEN 0
        WHEN status='delivered' AND fee_policy='private-buyer-business-seller-v1'
         AND COALESCE(refunded_total,0)=0 THEN GREATEST(COALESCE(seller_net,0),0) ELSE 0 END),0)::numeric eligible,
    COALESCE(SUM(CASE WHEN payout_status='paid' OR stripe_transfer_id IS NOT NULL OR status IN ('cancelled','refunded')
          OR payout_status IN ('refund_pending','reversal_pending') OR status IN ('disputed','return_requested') THEN 0
        WHEN status NOT IN ('delivered') THEN GREATEST(COALESCE(seller_net,0),0) ELSE 0 END),0)::numeric pending,
    COALESCE(SUM(CASE WHEN (payout_status IN ('refund_pending','reversal_pending') OR status IN('disputed','return_requested'))
      AND stripe_transfer_id IS NULL THEN GREATEST(COALESCE(seller_net,0),0) ELSE 0 END),0)::numeric held,
    COALESCE(SUM(CASE WHEN payout_status='paid' OR stripe_transfer_id IS NOT NULL THEN GREATEST(COALESCE(seller_net,0),0) ELSE 0 END),0)::numeric transferred
    FROM orders WHERE LOWER(seller_email)=${email}`),
  db.execute(sql`SELECT COUNT(DISTINCT p.listing_id)::int promoted_listings,
      COUNT(*) FILTER(WHERE p.expires_at>NOW())::int active_promotions,
      COUNT(DISTINCT CASE WHEN l.views>0 THEN p.listing_id END)::int promoted_listings_with_views
    FROM listing_promotions p JOIN listings l ON l.id=p.listing_id
    WHERE LOWER(l.seller_email)=${email}`)
 ]);
 const listings=l.rows[0] as any,orders=s.rows[0] as any,promotions=p.rows[0] as any;
 const views=Number(listings.views)||0,sales=Number(orders.sales)||0;
 res.setHeader("Cache-Control","private,no-store");
 res.json({listings,orders,promotions,salesPer100Views:views?Math.round(sales/views*10000)/100:0,
   note:"Balances use order snapshots, not a Stripe bank balance: eligible means delivered and awaiting admin approval, pending means awaiting delivery, held means order dispute/refund restrictions, transferred means sent to Stripe Connect. Sales per 100 views is an indicative ratio, not unique-buyer conversion or promotion attribution."});
 }catch(e){console.error("Seller metrics error",e);res.status(500).json({error:"Could not load seller metrics"});}
});
export default router;
