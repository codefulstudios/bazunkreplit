import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
const router=Router();
async function ensureTable(){
  await db.execute(sql`CREATE TABLE IF NOT EXISTS seller_bundle_policies(
    seller_email TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    combined_shipping_minor INTEGER NOT NULL DEFAULT 0 CHECK(combined_shipping_minor>=0 AND combined_shipping_minor<=100000),
    multi_item_discount_percent INTEGER NOT NULL DEFAULT 0 CHECK(multi_item_discount_percent BETWEEN 0 AND 50),
    min_items INTEGER NOT NULL DEFAULT 2 CHECK(min_items BETWEEN 2 AND 20),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
router.get("/seller/bundle-policy",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  await ensureTable();
  const record=(await db.execute(sql`SELECT enabled,combined_shipping_minor,multi_item_discount_percent,min_items
    FROM seller_bundle_policies WHERE seller_email=${email}`)).rows[0];
  res.setHeader("Cache-Control","private, no-store");
  res.json(record||{enabled:false,combined_shipping_minor:0,multi_item_discount_percent:0,min_items:2});
 }catch{res.status(503).json({error:"Seller bundle settings unavailable"});}
});
router.put("/seller/bundle-policy",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const {enabled,combinedShippingMinor,multiItemDiscountPercent,minItems}=req.body??{};
  if(typeof enabled!=="boolean"||![combinedShippingMinor,multiItemDiscountPercent,minItems].every(Number.isInteger)
    ||combinedShippingMinor<0||combinedShippingMinor>100000||multiItemDiscountPercent<0||multiItemDiscountPercent>50||minItems<2||minItems>20){
    res.status(400).json({error:"Invalid bundle rules: shipping 0–100000p, discount 0–50%, minimum 2–20 items"});return;
  }
  await ensureTable();
  await db.execute(sql`INSERT INTO seller_bundle_policies(seller_email,enabled,combined_shipping_minor,multi_item_discount_percent,min_items)
    VALUES(${email},${enabled},${combinedShippingMinor},${multiItemDiscountPercent},${minItems})
    ON CONFLICT(seller_email) DO UPDATE SET enabled=EXCLUDED.enabled,
    combined_shipping_minor=EXCLUDED.combined_shipping_minor,
    multi_item_discount_percent=EXCLUDED.multi_item_discount_percent,min_items=EXCLUDED.min_items,updated_at=NOW()`);
  res.json({success:true});
 }catch{res.status(503).json({error:"Could not save seller bundle settings"});}
});
export default router;
