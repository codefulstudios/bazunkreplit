import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient.js";

const router=Router();
type Issue={id:string;kind:string;severity:"warning"|"critical"|"info";title:string;detail:string;href:string;amountGbp?:number};
let cache:{at:number;value:unknown}|null=null;

// Read-only reconciliation. No Stripe charges, refunds, transfers, or releases are created.
router.get("/admin/finance/reconciliation",async (_req,res)=>{
  try{
    if(cache&&Date.now()-cache.at<60000){res.setHeader("Cache-Control","private,no-store");res.json(cache.value);return;}
    const [orderResult,totalsResult]=await Promise.all([
      db.execute(sql`SELECT id,stripe_session_id,stripe_transfer_id,fee_policy,item_title,seller_email,
        status,payout_status,buyer_total,seller_net,refunded_total,created_at,updated_at
        FROM orders WHERE stripe_session_id IS NOT NULL
        ORDER BY created_at DESC LIMIT 180`),
      db.execute(sql`SELECT COUNT(*)::int total,
        COUNT(*) FILTER(WHERE status='delivered' AND COALESCE(stripe_transfer_id,'')='' AND COALESCE(payout_status,'') NOT IN ('paid','refunded','test_no_payout'))::int delivered_not_transferred,
        COUNT(*) FILTER(WHERE payout_status IN ('refund_pending','reversal_pending'))::int reversal_pending,
        COUNT(*) FILTER(WHERE stripe_transfer_id IS NOT NULL)::int transfers_recorded
        FROM orders WHERE stripe_session_id IS NOT NULL`)
    ]);
    const orders=orderResult.rows as any[];
    const grouped=new Map<string,any[]>();
    for(const o of orders){const id=String(o.stripe_session_id);grouped.set(id,[...(grouped.get(id)||[]),o]);}
    const sessions=[...grouped.entries()].slice(0,25);
    const issues:Issue[]=[];
    let confirmed=0,unverified=0,checkedTransfers=0,failedTransfers=0;
    let stripeAvailable=true;let stripeError="";
    try{
      const stripe=await getUncachableStripeClient();
      await Promise.all(sessions.map(async ([sessionId,rows])=>{
        try{
          const session=await stripe.checkout.sessions.retrieve(sessionId);
          confirmed++;
          const href="/admin/orders?search="+encodeURIComponent(rows[0].id);
          const expected=rows.reduce((n,o)=>n+Number(o.buyer_total||0),0);
          const got=session.amount_total===null?null:session.amount_total/100;
          if(session.payment_status!=="paid" && rows.some(o=>["confirmed","processing","shipped","delivered","completed"].includes(String(o.status)))){
            issues.push({id:"payment:"+sessionId,kind:"payment_mismatch",severity:"critical",title:"Order recorded without a paid Stripe session",detail:`Stripe: ${session.payment_status}; Bazunk orders: ${rows.map(o=>o.id).join(", ")}`,href});
          }
          if(got!==null&&expected>0&&session.currency?.toLowerCase()==="gbp"&&Math.abs(got-expected)>.02){
            issues.push({id:"total:"+sessionId,kind:"total_mismatch",severity:"warning",title:"Checkout total differs from order snapshots",detail:`Stripe GBP ${got.toFixed(2)}; Bazunk order snapshots GBP ${expected.toFixed(2)}`,href});
          }
        }catch(e){unverified++;issues.push({id:"unverified:"+sessionId,kind:"stripe_unverified",severity:"warning",title:"Cannot verify checkout session",detail:`${sessionId} — ${e instanceof Error?e.message.slice(0,120):"Stripe lookup failed"}`,href:"/admin/orders?search="+encodeURIComponent(rows[0].id)});}
      }));
      const transfers=orders.filter(o=>o.stripe_transfer_id).slice(0,15);
      await Promise.all(transfers.map(async o=>{
        try{
          const t=await stripe.transfers.retrieve(String(o.stripe_transfer_id));checkedTransfers++;
          if(t.reversed || t.amount_reversed>0){
            issues.push({id:"reversed:"+o.id,kind:"transfer_reversed",severity:"critical",title:"Stripe Connect transfer reversed",detail:`Order ${o.id}: ${t.amount_reversed} minor units reversed on transfer ${t.id}`,href:"/admin/orders?search="+encodeURIComponent(o.id)});
          }
        }catch(e){failedTransfers++;issues.push({id:"transfer:"+o.id,kind:"transfer_unverified",severity:"warning",title:"Transfer could not be verified",detail:`Order ${o.id}, transfer ${o.stripe_transfer_id}: ${e instanceof Error?e.message.slice(0,100):"Stripe unavailable"}`,href:"/admin/orders?search="+encodeURIComponent(o.id)});}
      }));
    }catch(e){stripeAvailable=false;stripeError=e instanceof Error?e.message.slice(0,200):"Stripe could not be reached";}
    for(const o of orders){
      if(["refund_pending","reversal_pending"].includes(String(o.payout_status)))issues.push({
        id:"refund:"+o.id,kind:"refund_exception",severity:"critical",title:"Refund or payout reversal awaiting reconciliation",detail:`Order ${o.id}: ${o.payout_status}; refund amount ${o.refunded_total||0}`,
        href:"/admin/orders?search="+encodeURIComponent(o.id)});
      if(o.status==="delivered"&&!o.stripe_transfer_id&&o.payout_status==="release_failed")issues.push({
        id:"payout:"+o.id,kind:"payout_failed",severity:"critical",title:"Seller payout release failed",detail:`Order ${o.id} · seller ${o.seller_email}`,href:"/admin/orders?search="+encodeURIComponent(o.id)});
    }
    const totals=totalsResult.rows[0] as any;
    const report={generatedAt:new Date().toISOString(),stripeAvailable,stripeError:stripeAvailable?null:stripeError,
      totals,scope:{ordersSampled:orders.length,totalOrderCount:Number(totals?.total||0),sessionsSampled:sessions.length,sessionsVerified:confirmed,sessionsUnverified:unverified,transfersChecked:checkedTransfers,transferChecksFailed:failedTransfers},
      issues:issues.sort((a,b)=>(a.severity==="critical"?0:1)-(b.severity==="critical"?0:1)).slice(0,90),
      limits:"Read-only snapshot: latest 180 marketplace orders, 25 Stripe sessions and 15 transfers (60-second cache). Only GBP checkout totals are compared; other currencies and Stripe bank-payout availability are not inferred; unverified amounts must be reviewed in Stripe."};
    cache={at:Date.now(),value:report};res.setHeader("Cache-Control","private,no-store");res.json(report);
  }catch(err){console.error("Finance reconciliation monitor failed",err);res.status(503).json({error:"Reconciliation unavailable; review Stripe and order records before taking action"});}
});
export default router;
