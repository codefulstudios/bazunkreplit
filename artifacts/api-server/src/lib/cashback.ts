import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { featureEnabled } from "./featureFlags.js";

export type CashbackTier={id:string;name:string;rate:number;spendGbp:number;perks:string[]};
export type CashbackConfig={
 enabled:boolean;payoutPolicy:string;tiers:CashbackTier[];
 earningEnabled:boolean;payoutRequestsEnabled:boolean;holdDays:number;minPayoutGbp:number;
 accrualStartedAt:string|null;
};
const tiers:CashbackTier[]=[
 {id:"bronze",name:"Bronze",rate:1,spendGbp:0,perks:[]},
 {id:"silver",name:"Silver",rate:1.5,spendGbp:250,perks:[]},
 {id:"gold",name:"Gold",rate:2,spendGbp:750,perks:[]},
 {id:"platinum",name:"Platinum",rate:3,spendGbp:2000,perks:[]}
];
/** Runtime policy deliberately starts DISABLED. Existing promotional flags are not a promise of funded earnings. */
const runtimeDefaults={earningEnabled:false,payoutRequestsEnabled:false,holdDays:30,minPayoutGbp:5,accrualStartedAt:null as string|null};
let schemaReady:Promise<void>|null=null;
export function ensureCashback():Promise<void>{
 if(!schemaReady){schemaReady=(async()=>{
 await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_cashback_earnings(
   order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
   buyer_email TEXT NOT NULL, spend_minor INTEGER NOT NULL CHECK(spend_minor>0),
   rate_bps INTEGER NOT NULL CHECK(rate_bps BETWEEN 0 AND 2000),
   amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
   tier_id TEXT NOT NULL, earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   available_at TIMESTAMPTZ NOT NULL
 )`);
 await db.execute(sql`CREATE INDEX IF NOT EXISTS cashback_earnings_buyer_idx
    ON marketplace_cashback_earnings(LOWER(buyer_email),available_at)`);
 await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_cashback_payouts(
   id TEXT PRIMARY KEY,buyer_email TEXT NOT NULL,
   amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
   status TEXT NOT NULL DEFAULT 'requested'
     CHECK(status IN ('requested','approved','rejected','cancelled','paid')),
   transfer_reference TEXT,decision_note TEXT,reviewed_by TEXT,
   requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ
 )`);
 await db.execute(sql`CREATE INDEX IF NOT EXISTS cashback_payouts_buyer_idx
    ON marketplace_cashback_payouts(LOWER(buyer_email),requested_at DESC)`);
 await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_cashback_audit(
   id BIGSERIAL PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,
   target_id TEXT,details JSONB NOT NULL DEFAULT '{}'::jsonb,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
 await db.execute(sql`INSERT INTO site_settings(key,value,updated_at)
    VALUES('cashback_runtime_policy',${JSON.stringify(runtimeDefaults)},NOW())
    ON CONFLICT(key) DO NOTHING`);
 })().catch(err=>{schemaReady=null;throw err;});}
 return schemaReady;
}
const raw=(v:unknown)=>{try{return JSON.parse(String(v));}catch{return null;}};
export async function cashbackConfig():Promise<CashbackConfig>{
 await ensureCashback();
 const data=await db.execute(sql`SELECT key,value FROM site_settings
    WHERE key IN ('cashback_program_settings','cashback_runtime_policy')`);
 const settings=Object.fromEntries((data.rows as any[]).map(x=>[String(x.key),raw(x.value)]));
 const marketing=settings.cashback_program_settings??{};
 const rt=settings.cashback_runtime_policy??{};
 return {
   enabled:marketing.enabled===true,
   payoutPolicy:typeof marketing.payoutPolicy==="string"?marketing.payoutPolicy:"Cashback withdrawals are not yet active.",
   tiers:tiers.map(defaultTier=>{
     const row=(Array.isArray(marketing.tiers)?marketing.tiers:[]).find((v:any)=>v.id===defaultTier.id);
     return {id:defaultTier.id,name:String(row?.name||defaultTier.name),
       rate:Number.isFinite(Number(row?.rate))?Number(row.rate):defaultTier.rate,
       spendGbp:Number.isFinite(Number(row?.spendGbp))?Number(row.spendGbp):defaultTier.spendGbp,
       perks:Array.isArray(row?.perks)?row.perks.map(String):[]};
   }),
   earningEnabled:rt.earningEnabled===true,
   payoutRequestsEnabled:rt.payoutRequestsEnabled===true,
   holdDays:Number.isInteger(rt.holdDays)?rt.holdDays:30,
   minPayoutGbp:Number.isFinite(rt.minPayoutGbp)?rt.minPayoutGbp:5,
   accrualStartedAt:typeof rt.accrualStartedAt==="string"?rt.accrualStartedAt:null
 };
}
export async function saveCashbackConfig(next:CashbackConfig,actor:string){
 await ensureCashback();
 // Lock settings to serialise financial policy activation.
 return db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('cashback_config'))`);
   const old=await cashbackConfig();
   const start=next.earningEnabled&&!old.earningEnabled ? new Date().toISOString() : old.accrualStartedAt;
   // Existing earnings never change their rate or hold period.
   const marketing={enabled:next.enabled,payoutPolicy:next.payoutPolicy,tiers:next.tiers};
   const runtime={earningEnabled:next.earningEnabled,payoutRequestsEnabled:next.payoutRequestsEnabled,
     holdDays:next.holdDays,minPayoutGbp:next.minPayoutGbp,accrualStartedAt:start};
   for(const [key,payload] of [["cashback_program_settings",marketing],["cashback_runtime_policy",runtime]] as const){
     await tx.execute(sql`INSERT INTO site_settings(key,value,updated_at) VALUES(${key},${JSON.stringify(payload)},NOW())
        ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`);
   }
   await tx.execute(sql`INSERT INTO marketplace_cashback_audit(actor,action,target_id,details)
     VALUES(${actor},'config_updated','cashback',${JSON.stringify({before:old,after:{...marketing,...runtime}})}::jsonb)`);
   return {...marketing,...runtime};
 });
}
/** Only called following a Stripe-verified successful checkout. Idempotent per order. */
export async function recordCashbackForSession(sessionId:string){
 const settings=await cashbackConfig();
 if(!settings.enabled||!settings.earningEnabled||!settings.accrualStartedAt||!await featureEnabled("cashback"))return 0;
 const orders=(await db.execute(sql`SELECT id,buyer_email,seller_email,price,created_at
    FROM orders WHERE stripe_session_id=${sessionId}
    AND status NOT IN ('refunded','cancelled') AND COALESCE(refunded_total,0)=0
    AND price>0 AND created_at>=${settings.accrualStartedAt}::timestamptz
    ORDER BY id`)).rows as any[];
 let created=0;
 for(const order of orders){
   if(String(order.buyer_email||"").toLowerCase()===String(order.seller_email||"").toLowerCase())continue;
   const spendMinor=Math.round(Number(order.price)*100);
   if(spendMinor<=0||spendMinor>100000000)continue;
   // Lifetime qualifying completed/paid purchases determine tier; excludes the current checkout.
   const history=(await db.execute(sql`SELECT COALESCE(SUM(price),0) AS spent FROM orders
     WHERE LOWER(buyer_email)=LOWER(${order.buyer_email})
       AND stripe_session_id IS NOT NULL AND stripe_session_id<> ${sessionId}
       AND created_at<${order.created_at}::timestamptz
       AND status NOT IN ('refunded','cancelled') AND COALESCE(refunded_total,0)=0`)).rows[0] as any;
   const lifetime=Number(history?.spent||0);
   const tier=[...settings.tiers].reverse().find(t=>lifetime>=t.spendGbp)??settings.tiers[0];
   const rateBps=Math.round(tier.rate*100);
   const amountMinor=Math.round(spendMinor*rateBps/10000);
   if(amountMinor<=0)continue;
   const at=new Date(new Date(order.created_at).getTime()+settings.holdDays*86400000).toISOString();
   const result=await db.execute(sql`INSERT INTO marketplace_cashback_earnings
     (order_id,buyer_email,spend_minor,rate_bps,amount_minor,tier_id,available_at)
     VALUES(${order.id},${String(order.buyer_email).toLowerCase()},${spendMinor},
       ${rateBps},${amountMinor},${tier.id},${at}::timestamptz)
     ON CONFLICT(order_id) DO NOTHING RETURNING order_id`);
   created+=result.rows.length;
 }
 return created;
}
/** An order that is refunded, cancelled or disputed cannot be withdrawn against. */
const validOrder=sql`o.status NOT IN ('refunded','cancelled')
 AND COALESCE(o.refunded_total,0)=0
 AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.order_id=o.id
   AND d.status NOT IN ('resolved','rejected','closed','cancelled'))
 AND NOT EXISTS (SELECT 1 FROM returns r WHERE r.order_id=o.id
   AND r.status NOT IN ('resolved','rejected','closed','cancelled'))`;
export async function cashbackBalance(email:string,tx:any=db){
 const earn=(await tx.execute(sql`SELECT
   COALESCE(SUM(CASE WHEN ${validOrder} THEN e.amount_minor ELSE 0 END),0)::int AS earned,
   COALESCE(SUM(CASE WHEN ${validOrder} AND e.available_at<=NOW() THEN e.amount_minor ELSE 0 END),0)::int AS matured
   FROM marketplace_cashback_earnings e JOIN orders o ON o.id=e.order_id
   WHERE LOWER(e.buyer_email)=LOWER(${email})`)).rows[0] as any;
 const paid=(await tx.execute(sql`SELECT
   COALESCE(SUM(amount_minor) FILTER(WHERE status='paid'),0)::int AS paid,
   COALESCE(SUM(amount_minor) FILTER(WHERE status IN ('requested','approved')),0)::int AS reserved
   FROM marketplace_cashback_payouts WHERE LOWER(buyer_email)=LOWER(${email})`)).rows[0] as any;
 const earned=Number(earn?.earned||0),matured=Number(earn?.matured||0);
 const paidMinor=Number(paid?.paid||0),reserved=Number(paid?.reserved||0);
 return {earnedMinor:earned,maturedMinor:matured,pendingMinor:Math.max(0,earned-matured),
   paidMinor,reservedMinor:reserved,availableMinor:Math.max(0,matured-paidMinor-reserved),
   adjustmentMinor:Math.min(0,matured-paidMinor-reserved)};
}
