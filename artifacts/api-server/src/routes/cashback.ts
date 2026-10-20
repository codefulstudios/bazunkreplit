import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { featureEnabled } from "../lib/featureFlags.js";
import { cashbackConfig, cashbackBalance, ensureCashback, saveCashbackConfig, recordCashbackForSession,
  type CashbackConfig } from "../lib/cashback.js";
import { getUncachableStripeClient } from "../stripeClient.js";

const router=Router();
const fail=(res:any,error:unknown)=>{console.error("Cashback API",error);res.status(503).json({error:"Cashback service temporarily unavailable."});};
const idOk=(id:unknown)=>typeof id==="string"&&/^[0-9a-f-]{36}$/i.test(id);
const poundsToMinor=(value:unknown)=>{
 if(typeof value!=="string"&&typeof value!=="number")return 0;
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(String(value).trim()))return 0;
 const n=Number(value);
 return Number.isFinite(n)&&n>0&&n<=1000000?Math.round(n*100):0;
};
const locked=async(tx:any,email:string)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"cashback:"+email.toLowerCase()}))`);};
const stamp=(res:any)=>res.setHeader("Cache-Control","private,no-store");

router.get("/cashback/settings",async(_req,res)=>{
 try{
  const settings=await cashbackConfig();
  res.setHeader("Cache-Control","no-store");
  res.json({...settings,featureEnabled:await featureEnabled("cashback"),method:"manual_verified",
   notice:"Cashback is awarded only on eligible confirmed Stripe purchases made after the earning programme was activated. Payouts require review and are not automatic."});
 }catch(e){fail(res,e);}
});
router.get("/cashback/account",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  await ensureCashback();
  const [balance,earnings,payouts,settings]=await Promise.all([
   cashbackBalance(email),
   db.execute(sql`SELECT e.order_id,e.spend_minor,e.rate_bps,e.amount_minor,e.tier_id,e.earned_at,e.available_at,
       o.item_title,o.status AS order_status,o.refunded_total
     FROM marketplace_cashback_earnings e JOIN orders o ON o.id=e.order_id
     WHERE LOWER(e.buyer_email)=${email} ORDER BY e.earned_at DESC LIMIT 100`),
   db.execute(sql`SELECT id,amount_minor,status,transfer_reference,decision_note,requested_at,reviewed_at
     FROM marketplace_cashback_payouts WHERE LOWER(buyer_email)=${email}
     ORDER BY requested_at DESC LIMIT 100`),
   cashbackConfig()
  ]);
  stamp(res);res.json({balance,earnings:earnings.rows,payouts:payouts.rows,
    settings:{enabled:settings.enabled,earningEnabled:settings.earningEnabled,
      payoutRequestsEnabled:settings.payoutRequestsEnabled,holdDays:settings.holdDays,
      minPayoutGbp:settings.minPayoutGbp}});
 }catch(e){fail(res,e);}
});
router.post("/cashback/payouts",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const amount=poundsToMinor(req.body?.amount);
  if(!amount){res.status(400).json({error:"Enter a valid GBP amount (two decimals maximum)."});return;}
  await ensureCashback();
  const settings=await cashbackConfig();
  if(!settings.enabled||!settings.payoutRequestsEnabled||!await featureEnabled("cashback")){
   res.status(403).json({error:"Cashback payout requests are not open yet."});return;
  }
  if(amount<Math.round(settings.minPayoutGbp*100)){res.status(400).json({error:`Minimum request is £${settings.minPayoutGbp.toFixed(2)}.`});return;}
  const id=randomUUID();
  const result=await db.transaction(async tx=>{
    await locked(tx,email);
    const balance=await cashbackBalance(email,tx);
    if(amount>balance.availableMinor)return false;
    await tx.execute(sql`INSERT INTO marketplace_cashback_payouts(id,buyer_email,amount_minor)
      VALUES(${id},${email},${amount})`);
    await tx.execute(sql`INSERT INTO marketplace_cashback_audit(actor,action,target_id,details)
      VALUES(${email},'payout_requested',${id},${JSON.stringify({amountMinor:amount})}::jsonb)`);
    return true;
  });
  if(!result){res.status(409).json({error:"Available cashback changed. Refresh your balance."});return;}
  stamp(res);res.status(201).json({id,status:"requested",amountMinor:amount});
 }catch(e){fail(res,e);}
});
router.post("/cashback/payouts/:id/cancel",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!idOk(req.params.id)){res.status(400).json({error:"Invalid request"});return;}
  await ensureCashback();
  const changed=await db.transaction(async tx=>{
   await locked(tx,email);
   const rows=await tx.execute(sql`UPDATE marketplace_cashback_payouts SET status='cancelled',reviewed_at=NOW()
     WHERE id=${req.params.id} AND LOWER(buyer_email)=${email} AND status='requested' RETURNING id`);
   if(!rows.rows.length)return false;
   await tx.execute(sql`INSERT INTO marketplace_cashback_audit(actor,action,target_id)
     VALUES(${email},'payout_cancelled',${req.params.id})`);
   return true;
  });
  if(!changed){res.status(409).json({error:"Only your pending requests can be cancelled."});return;}
  res.json({ok:true});
 }catch(e){fail(res,e);}
});
router.get("/admin/cashback/settings",requireAdmin,async(_req,res)=>{
 try{stamp(res);res.json(await cashbackConfig());}catch(e){fail(res,e);}
});
router.put("/admin/cashback/settings",requireAdmin,async(req,res)=>{
 try{
  const value=req.body as CashbackConfig;
  if(!value||typeof value.enabled!=="boolean"||typeof value.earningEnabled!=="boolean"||
    typeof value.payoutRequestsEnabled!=="boolean"||
    typeof value.payoutPolicy!=="string"||value.payoutPolicy.length>1000||
    !Number.isInteger(value.holdDays)||value.holdDays<14||value.holdDays>90||
    !Number.isFinite(value.minPayoutGbp)||value.minPayoutGbp<5||value.minPayoutGbp>500||
    !Array.isArray(value.tiers)||value.tiers.length!==4){
    res.status(400).json({error:"Invalid cashback programme configuration."});return;
  }
  const ids=["bronze","silver","gold","platinum"];
  const clean=value.tiers.map((t:any,i:number)=>({
    id:ids[i],name:typeof t?.name==="string"?t.name.trim().slice(0,40):"",
    rate:Number(t?.rate),spendGbp:Number(t?.spendGbp),
    perks:Array.isArray(t?.perks)?t.perks.slice(0,12).map((p:any)=>String(p).trim().slice(0,150)).filter(Boolean):[]
  }));
  if(clean.some((t,i)=>!t.name||!Number.isFinite(t.rate)||t.rate<0||t.rate>20||
      !Number.isFinite(t.spendGbp)||t.spendGbp<0||
      (i>0&&t.spendGbp<=clean[i-1].spendGbp))||
     (value.earningEnabled&&!value.enabled)||(value.payoutRequestsEnabled&&!value.enabled)){
    res.status(400).json({error:"Cashback thresholds, rates or earning/payout controls are inconsistent."});return;
  }
  const settings=await saveCashbackConfig({...value,tiers:clean}, "authenticated-admin");
  stamp(res);res.json(settings);
 }catch(e){fail(res,e);}
});
router.get("/admin/cashback/overview",requireAdmin,async(_req,res)=>{
 try{
  await ensureCashback();
  const [earnings,payouts,latest,audit]=await Promise.all([
   db.execute(sql`SELECT COUNT(*)::int AS orders,
     COALESCE(SUM(e.amount_minor),0)::bigint AS gross_minor,
     COALESCE(SUM(CASE WHEN o.status NOT IN ('refunded','cancelled') AND COALESCE(o.refunded_total,0)=0 THEN e.amount_minor ELSE 0 END),0)::bigint AS eligible_minor
     FROM marketplace_cashback_earnings e JOIN orders o ON o.id=e.order_id`),
   db.execute(sql`SELECT status,COUNT(*)::int AS count,COALESCE(SUM(amount_minor),0)::bigint AS amount_minor
     FROM marketplace_cashback_payouts GROUP BY status`),
   db.execute(sql`SELECT id,buyer_email,amount_minor,status,requested_at,reviewed_at,transfer_reference,decision_note
     FROM marketplace_cashback_payouts ORDER BY requested_at DESC LIMIT 100`),
   db.execute(sql`SELECT actor,action,target_id,created_at FROM marketplace_cashback_audit
     ORDER BY id DESC LIMIT 40`)
  ]);
  stamp(res);res.json({earnings:earnings.rows[0],payoutSummary:payouts.rows,payouts:latest.rows,audit:audit.rows});
 }catch(e){fail(res,e);}
});
router.post("/admin/cashback/payouts/:id/decision",requireAdmin,async(req,res)=>{
 try{
  const action=String(req.body?.action||"");
  const note=typeof req.body?.note==="string"?req.body.note.trim().slice(0,500):"";
  const reference=typeof req.body?.reference==="string"?req.body.reference.trim().slice(0,150):"";
  if(!idOk(req.params.id)||!["approve","reject","paid"].includes(action)||
    (action==="reject"&&note.length<10)||
    (action==="paid"&&(reference.length<8||req.body?.externalTransferCompleted!==true))){
    res.status(400).json({error:"Provide a valid decision and reason, or confirm an external payment with its transaction reference."});return;
  }
  await ensureCashback();
  const lookup=(await db.execute(sql`SELECT buyer_email FROM marketplace_cashback_payouts WHERE id=${req.params.id}`)).rows[0] as any;
  if(!lookup){res.status(404).json({error:"Payout request not found"});return;}
  const status=action==="approve"?"approved":action==="reject"?"rejected":"paid";
  const changed=await db.transaction(async tx=>{
    await locked(tx,lookup.buyer_email);
    const item=(await tx.execute(sql`SELECT * FROM marketplace_cashback_payouts WHERE id=${req.params.id} FOR UPDATE`)).rows[0] as any;
    if(!item||!(action==="paid"?item.status==="approved":item.status==="requested"))return false;
    if(action!=="reject"){
      const balance=await cashbackBalance(lookup.buyer_email,tx);
      // Never approve/send more than the original eligible matured earnings after refunds.
      if(balance.adjustmentMinor<0)return false;
    }
    await tx.execute(sql`UPDATE marketplace_cashback_payouts SET status=${status},
      transfer_reference=${action==="paid"?reference:null},decision_note=${note||null},
      reviewed_by='authenticated-admin',reviewed_at=NOW() WHERE id=${req.params.id}`);
    await tx.execute(sql`INSERT INTO marketplace_cashback_audit(actor,action,target_id,details)
      VALUES('authenticated-admin',${"payout_"+status},${req.params.id},
       ${JSON.stringify({note,reference:action==="paid"?reference:null})}::jsonb)`);
    return true;
  });
  if(!changed){res.status(409).json({error:"Request is no longer eligible for that action (status or refundable balance changed)."});return;}
  res.json({ok:true,status});
 }catch(e){fail(res,e);}
});
// Reconcile missing entries only after validating each Stripe checkout; limited & explicitly admin-run.
router.post("/admin/cashback/reconcile",requireAdmin,async(_req,res)=>{
 try{
  const settings=await cashbackConfig();
  if(!settings.enabled||!settings.earningEnabled||!settings.accrualStartedAt){
    res.status(409).json({error:"Activate earning before reconciling new paid orders."});return;
  }
  const candidates=(await db.execute(sql`SELECT DISTINCT o.stripe_session_id
      FROM orders o LEFT JOIN marketplace_cashback_earnings e ON e.order_id=o.id
      WHERE o.stripe_session_id IS NOT NULL AND e.order_id IS NULL
        AND o.created_at>=${settings.accrualStartedAt}::timestamptz
        AND o.price>0 AND o.status NOT IN ('refunded','cancelled')
      ORDER BY o.stripe_session_id LIMIT 25`)).rows as any[];
  const stripe=await getUncachableStripeClient();
  let checked=0,created=0,skipped=0;
  for(const candidate of candidates){
   const session=await stripe.checkout.sessions.retrieve(candidate.stripe_session_id);
   checked++;
   if(session.payment_status!=="paid"||session.currency!=="gbp"||
      !["cart","special_sale"].includes(String(session.metadata?.type))){skipped++;continue;}
   created+=await recordCashbackForSession(candidate.stripe_session_id);
  }
  await db.execute(sql`INSERT INTO marketplace_cashback_audit(actor,action,details)
     VALUES('authenticated-admin','reconcile',${JSON.stringify({checked,created,skipped})}::jsonb)`);
  res.json({checked,created,skipped,limit:25});
 }catch(e){fail(res,e);}
});
export default router;
