import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { sendSystemMessage } from "../lib/systemMessages.js";
import { featureEnabled } from "../lib/featureFlags.js";
const router=Router();
async function ensure(){
 await db.execute(sql`CREATE TABLE IF NOT EXISTS checkout_recovery (
  id BIGSERIAL PRIMARY KEY, buyer_email TEXT NOT NULL,
  cart_items JSONB NOT NULL, consent BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','completed','dismissed')),
  last_reminder_at TIMESTAMPTZ, reminder_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.execute(sql`CREATE INDEX IF NOT EXISTS checkout_recovery_buyer_idx ON checkout_recovery(LOWER(buyer_email),created_at DESC)`);
}
router.post("/checkout-recovery/save",async(req,res)=>{
 try{
  if(!await featureEnabled("checkout_recovery")){res.status(404).json({error:"Unavailable"});return;}
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const items=req.body?.items;
  if(!Array.isArray(items)||!items.length||items.length>50||items.some((x:any)=>!Number.isSafeInteger(x?.id)||x.id<=0||!Number.isInteger(x?.quantity)||x.quantity<1||x.quantity>50)){
   res.status(400).json({error:"Invalid checkout items"});return;
  }
  if(typeof req.body?.consent!=="boolean"){res.status(400).json({error:"Reminder preference required"});return;}
  await ensure();
  await db.execute(sql`UPDATE checkout_recovery SET status='dismissed',updated_at=NOW() WHERE LOWER(buyer_email)=${email} AND status='open'`);
  const row=(await db.execute(sql`INSERT INTO checkout_recovery(buyer_email,cart_items,consent)
    VALUES(${email},${JSON.stringify(items)}::jsonb,${req.body.consent}) RETURNING id`)).rows[0];
  res.json({id:row?.id,saved:true});
 }catch{res.status(503).json({error:"Could not save recovery preference"});}
});
router.post("/checkout-recovery/complete",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  await ensure();await db.execute(sql`UPDATE checkout_recovery SET status='completed',updated_at=NOW() WHERE LOWER(buyer_email)=${email} AND status='open'`);
  res.json({success:true});
 }catch{res.status(503).json({error:"Could not update checkout recovery"});}
});
router.get("/admin/checkout-recovery",requireAdmin,async(_req,res)=>{
 try{
  await ensure();
  const rows=(await db.execute(sql`SELECT r.id,r.buyer_email,r.cart_items,r.reminder_count,r.created_at,r.last_reminder_at,
   EXISTS(SELECT 1 FROM orders o WHERE LOWER(o.buyer_email)=LOWER(r.buyer_email) AND o.created_at>=r.created_at) AS purchased
   FROM checkout_recovery r WHERE r.status='open' AND r.consent=TRUE AND r.created_at<NOW()-INTERVAL '1 hour'
   ORDER BY r.created_at DESC LIMIT 100`)).rows;
  res.setHeader("Cache-Control","private, no-store");res.json({checkouts:rows});
 }catch{res.status(503).json({error:"Recovery queue unavailable"});}
});
router.post("/admin/checkout-recovery/:id/remind",requireAdmin,async(req,res)=>{
 try{
  if(!await featureEnabled("checkout_recovery")){res.status(409).json({error:"Recovery feature disabled"});return;}
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1){res.status(400).json({error:"Invalid recovery id"});return;}
  await ensure();
  // Atomic claim prevents duplicate reminders from concurrent admin requests.
  const claim=(await db.execute(sql`UPDATE checkout_recovery r SET reminder_count=reminder_count+1,last_reminder_at=NOW(),updated_at=NOW()
   WHERE r.id=${id} AND r.status='open' AND r.consent=TRUE AND r.reminder_count<1
    AND r.created_at<NOW()-INTERVAL '1 hour'
    AND NOT EXISTS(SELECT 1 FROM orders o WHERE LOWER(o.buyer_email)=LOWER(r.buyer_email) AND o.created_at>=r.created_at)
   RETURNING buyer_email`)).rows[0] as {buyer_email:string}|undefined;
  if(!claim){res.status(409).json({error:"Checkout is ineligible, already purchased, or reminder already sent"});return;}
  try{
   await sendSystemMessage(claim.buyer_email,{category:"Checkout",subject:"Your Bazunk basket is ready when you are",body:"You left items in your basket. If you still want them, sign in to Bazunk and open your basket to review current availability and checkout prices. No payment has been taken. You can disregard this message if you have changed your mind."});
  }catch(err){
   await db.execute(sql`UPDATE checkout_recovery SET reminder_count=0,last_reminder_at=NULL WHERE id=${id}`);
   throw err;
  }
  res.json({sent:true});
 }catch{res.status(503).json({error:"Reminder could not be delivered"});}
});
export default router;
