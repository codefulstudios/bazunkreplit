import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";

// Mounted only after requireAdmin; never expose financial review data publicly.
const router = Router();
type Item={id:string;title:string;detail:string;status:string;at:string;href:string};
type Queue={key:string;label:string;count:number|null;href:string;description:string;items:Item[];warning?:string};
function item(id:unknown,title:unknown,detail:unknown,status:unknown,at:unknown,href:string):Item{
  return {id:String(id),title:String(title??""),detail:String(detail??""),status:String(status??""),at:String(at??""),href};
}

router.get("/admin/action-required", async (_req,res)=>{
  try{
    const [refundOrders,refundReturns,disputes,compliance,appeals] = await Promise.all([
      db.execute(sql`SELECT id,item_title,buyer_email,payout_status,updated_at
        FROM orders WHERE payout_status IN ('refund_pending','reversal_pending')
        ORDER BY updated_at DESC LIMIT 60`),
      db.execute(sql`SELECT id,item_title,buyer_email,status,updated_at
        FROM returns WHERE COALESCE(NULLIF(TRIM(refund_amount),''),'0') NOT IN ('0','0.00')
          AND status NOT IN ('closed','completed','refund_issued','declined','rejected','cancelled')
        ORDER BY updated_at DESC LIMIT 60`),
      db.execute(sql`SELECT id,item_title,buyer_email,status,created_at
        FROM disputes WHERE status NOT IN ('closed','resolved_refund','resolved_no_action','resolved','rejected')
        ORDER BY created_at DESC LIMIT 60`),
      db.execute(sql`SELECT id,seller_email,status,opened_at FROM seller_compliance_cases
        WHERE status NOT IN ('closed','resolved','dismissed') ORDER BY opened_at DESC LIMIT 60`),
      db.execute(sql`SELECT id,seller_email,status,created_at FROM seller_compliance_appeals
        WHERE status='pending' ORDER BY created_at DESC LIMIT 60`)
    ]);
    const refunds=[
      ...(refundOrders.rows as any[]).map(x=>item(x.id,x.item_title,"Order refund or payout reconciliation · "+x.buyer_email,x.payout_status,x.updated_at,"/admin/orders?search="+encodeURIComponent(x.id))),
      ...(refundReturns.rows as any[]).map(x=>item(x.id,x.item_title,"Return refund request · "+x.buyer_email,x.status,x.updated_at,"/admin/returns"))
    ];
    const disputeItems=(disputes.rows as any[]).map(x=>item(x.id,x.item_title,x.buyer_email,x.status,x.created_at,"/admin/disputes"));
    const caseItems=[
      ...(compliance.rows as any[]).map(x=>item(x.id,"Seller compliance case #"+x.id,x.seller_email,x.status,x.opened_at,"/admin/seller-compliance")),
      ...(appeals.rows as any[]).map(x=>item(x.id,"Seller appeal #"+x.id,x.seller_email,x.status,x.created_at,"/admin/seller-compliance"))
    ];
    const queues:Queue[]=[
      {key:"refunds",label:"Refunds & reconciliations",count:refunds.length,href:"/admin/orders",
        description:"Unresolved payout reversals, refund processing and return refund requests",items:refunds.slice(0,6)},
      {key:"disputes",label:"Open disputes",count:disputeItems.length,href:"/admin/disputes",
        description:"Buyer-protection cases awaiting review or resolution",items:disputeItems.slice(0,6)},
      {key:"compliance",label:"Seller compliance",count:caseItems.length,href:"/admin/seller-compliance",
        description:"Open seller-risk reviews and pending appeals",items:caseItems.slice(0,6)}
    ];

    // Payment failure source is Stripe itself. This checks a bounded recent
    // sample, not every historic failed payment; report incomplete coverage.
    try{
      const stripe=await getUncachableStripeClient();
      const intents=await stripe.paymentIntents.list({limit:100,created:{gte:Math.floor(Date.now()/1000)-30*86400}});
      const failed=intents.data.filter(p=>p.last_payment_error && p.status!=="succeeded");
      queues.push({key:"payments",label:"Failed payment attempts",count:failed.length,href:"/admin/payments",
        description:"Stripe payment intents with recent unresolved failures",warning:"Last 30 days; checks up to 100 newest Stripe payment intents. Not an all-time total.",
        items:failed.slice(0,6).map(p=>item(p.id,"Payment "+p.id,
          [p.receipt_email||p.customer||"Stripe customer",p.last_payment_error?.message||"Payment failed"].join(" · "),
          p.status,new Date(p.created*1000).toISOString(),"/admin/payments"))});
    }catch(err){
      logger.warn({err},"Stripe failure review unavailable");
      queues.push({key:"payments",label:"Failed payment attempts",count:null,href:"/admin/payments",
        description:"Stripe payment-intent failures",warning:"Stripe verification unavailable — count unknown. Review Stripe directly.",
        items:[]});
    }
    res.setHeader("Cache-Control","private, no-store");
    res.json({queues,updatedAt:new Date().toISOString(),note:"Counts show actionable database queues; Stripe payment failures are only the bounded recent sample described. No refund or payout is processed from this overview."});
  }catch(err){
    logger.error({err},"Admin action-required overview failed");
    res.status(503).json({error:"Cannot load action-required overview; no counts have been assumed"});
  }
});
export default router;
