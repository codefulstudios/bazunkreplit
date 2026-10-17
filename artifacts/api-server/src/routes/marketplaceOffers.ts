import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";

const router = Router();

export async function ensureMarketplaceOffers() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketplace_offers (
      id text PRIMARY KEY,
      listing_id integer NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_email text NOT NULL,
      seller_email text NOT NULL,
      offer_price numeric(12,2) NOT NULL CHECK (offer_price > 0),
      listing_price numeric(12,2) NOT NULL,
      message text,
      status text NOT NULL DEFAULT 'pending',
      counter_price numeric(12,2),
      counter_message text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS marketplace_offers_buyer_idx ON marketplace_offers (LOWER(buyer_email),created_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS marketplace_offers_seller_idx ON marketplace_offers (LOWER(seller_email),created_at DESC)`);
}

router.get("/offers", async (req, res) => {
  try {
    const email = await authenticatedSellerEmail(req,res);
    if (!email) return;
    await ensureMarketplaceOffers();
    const r=await db.execute(sql`
      SELECT o.id, o.listing_id, o.buyer_email, o.seller_email, o.offer_price, o.listing_price,
             o.message, o.status, o.counter_price, o.counter_message, o.created_at, o.updated_at,
             l.title AS product_title, l.image AS product_image, l.public_id AS public_id,
             COALESCE(l.seller_username,l.seller_name,'Bazunk seller') AS seller_name
      FROM marketplace_offers o JOIN listings l ON l.id=o.listing_id
      WHERE LOWER(o.buyer_email)=${email} OR LOWER(o.seller_email)=${email}
      ORDER BY o.updated_at DESC LIMIT 100
    `);
    res.setHeader("Cache-Control","no-store");
    res.json(r.rows);
  }catch(err){console.error("Could not load offers",err);res.status(500).json({error:"Could not load offers"});}
});

router.post("/offers", async (req,res) => {
  try {
    const email = await authenticatedSellerEmail(req,res);
    if (!email) return;
    const listingId=Number(req.body?.listingId);
    const amount=Number(req.body?.amount);
    const message=typeof req.body?.message==="string"?req.body.message.trim().slice(0,200):"";
    if (!Number.isSafeInteger(listingId)||listingId<1||!Number.isFinite(amount)||amount<=0||amount>1000000){
      res.status(400).json({error:"Provide a listing and a valid offer amount"});return;
    }
    await ensureMarketplaceOffers();
    const l=(await db.execute(sql`
      SELECT id,price,seller_email,status FROM listings WHERE id=${listingId} LIMIT 1
    `)).rows[0] as any;
    if(!l || l.status!=="active"){res.status(404).json({error:"Listing not available"});return;}
    if(String(l.seller_email).toLowerCase()===email){res.status(403).json({error:"Cannot offer on your own listing"});return;}
    const id=randomUUID();
    const r=await db.execute(sql`
      INSERT INTO marketplace_offers(id,listing_id,buyer_email,seller_email,offer_price,listing_price,message)
      VALUES(${id},${listingId},${email},${String(l.seller_email).toLowerCase()},
             ${amount.toFixed(2)},${String(l.price)},${message||null})
      RETURNING id,status,created_at
    `);
    res.status(201).json(r.rows[0]);
  }catch(err){console.error("Could not create offer",err);res.status(500).json({error:"Could not send offer"});}
});

router.patch("/offers/:id", async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);
    if(!email)return;
    await ensureMarketplaceOffers();
    const offer=(await db.execute(sql`SELECT * FROM marketplace_offers WHERE id=${req.params.id} LIMIT 1`)).rows[0] as any;
    if(!offer){res.status(404).json({error:"Offer not found"});return;}
    const action=String(req.body?.action||"");
    const isSeller=String(offer.seller_email).toLowerCase()===email;
    const isBuyer=String(offer.buyer_email).toLowerCase()===email;
    if(!isSeller&&!isBuyer){res.status(403).json({error:"Not your offer"});return;}
    let status:string;
    if(isSeller&&offer.status==="pending"&&["accept","decline","counter"].includes(action)){
      status=action==="accept"?"accepted":action==="decline"?"declined":"countered";
    }else if(isBuyer&&offer.status==="countered"&&["accept-counter","decline-counter"].includes(action)){
      status=action==="accept-counter"?"counter_accepted":"counter_declined";
    }else{res.status(409).json({error:"Offer is not in a state that permits this response"});return;}
    const counter=action==="counter"?Number(req.body?.counterPrice):null;
    if(action==="counter"&&(!Number.isFinite(counter)||!counter||counter<=0)){
      res.status(400).json({error:"Enter a valid counter amount"});return;
    }
    const result=await db.execute(sql`
      UPDATE marketplace_offers SET status=${status},
      counter_price=CASE WHEN ${action==="counter"} THEN ${counter===null?null:counter.toFixed(2)} ELSE counter_price END,
      counter_message=CASE WHEN ${action==="counter"} THEN ${String(req.body?.counterMessage||"").slice(0,200)} ELSE counter_message END,
      updated_at=NOW()
      WHERE id=${req.params.id} AND status=${String(offer.status)}
      RETURNING id,status,updated_at
    `);
    if(!result.rows.length){res.status(409).json({error:"Offer updated elsewhere, refresh"});return;}
    res.json(result.rows[0]);
  }catch(err){console.error("Offer response error",err);res.status(500).json({error:"Could not respond to offer"});}
});
export default router;
