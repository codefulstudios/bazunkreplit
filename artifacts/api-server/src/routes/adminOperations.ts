import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
const router=Router();
// Read-only operational facts, not a synthetic webhook test or a third-party uptime assertion.
router.get("/admin/system-operations",async (_req,res)=>{
 try{
  const start=Date.now();
  const dbStatus=await db.execute(sql`SELECT NOW() AS checked_at,
   (SELECT COUNT(*)::int FROM orders WHERE created_at>NOW()-INTERVAL '24 hours') AS recent_orders,
   (SELECT COUNT(*)::int FROM support_tickets WHERE status IN ('open','in-progress')) AS open_cases`);
  const dbLatencyMs=Date.now()-start;
  const rows=dbStatus.rows[0] as any;
  const table=(await db.execute(sql`SELECT to_regclass('public.webhook_delivery_health') AS name`)).rows[0] as any;
  let webhookRows:any[]=[];
  if(table?.name){
   const r=await db.execute(sql`SELECT provider,COUNT(*) FILTER(WHERE received_at>NOW()-INTERVAL '24 hours')::int received24h,
     COUNT(*) FILTER(WHERE status='failed' AND updated_at>NOW()-INTERVAL '24 hours')::int failed24h,
     MAX(updated_at) FILTER(WHERE status='processed') lastSuccess,
     MAX(updated_at) FILTER(WHERE status='failed') lastFailure
     FROM webhook_delivery_health GROUP BY provider`);
   webhookRows=r.rows as any[];
  }
  const didit=(await db.execute(sql`SELECT
   COUNT(*) FILTER(WHERE created_at>NOW()-INTERVAL '24 hours')::int received24h,
   COUNT(*) FILTER(WHERE LOWER(status) IN ('failed','error','rejected') AND created_at>NOW()-INTERVAL '24 hours')::int failed24h,
   MAX(created_at) FILTER(WHERE event_id IS NOT NULL AND LOWER(status) NOT IN ('failed','error','rejected')) lastSuccess
   FROM verification_webhook_logs`)).rows[0] as any;
  const integrations=[
    {key:"stripe",name:"Stripe payment webhook",configured:!!process.env.STRIPE_WEBHOOK_SECRET,secretConfigured:!!process.env.STRIPE_WEBHOOK_SECRET},
    {key:"shippo",name:"Shippo tracking webhook",configured:!!process.env.SHIPPO_WEBHOOK_SECRET && process.env.SHIPPO_WEBHOOK_SECRET.length>=32,secretConfigured:!!process.env.SHIPPO_WEBHOOK_SECRET},
    {key:"didit",name:"Didit verification webhook",configured:!!process.env.DIDIT_WEBHOOK_SECRET,secretConfigured:!!process.env.DIDIT_WEBHOOK_SECRET}
  ].map(i=>{
    const found=webhookRows.find(x=>x.provider===i.key);
    const count=i.key==="didit"?Number(didit?.received24h||0):Number(found?.received24h||0);
    const failed=i.key==="didit"?Number(didit?.failed24h||0):Number(found?.failed24h||0);
    const lastSuccess=i.key==="didit"?didit?.lastsuccess:found?.lastsuccess;
    return {...i,received24h:count,failed24h:failed,lastSuccess:lastSuccess||null,
      state:!i.configured?"not_configured":failed>0?"attention":count>0?"receiving":"idle",
      detail:!i.configured?"Required webhook secret is not configured":failed>0?`${failed} failure(s) recorded within 24 hours`:
        count>0?`${count} recorded delivery event(s) within 24 hours`:
        "No recent webhook deliveries recorded. Delivery cannot be verified until an actual event arrives."};
  });
  const api={status:"responding",dbStatus:"responding",dbLatencyMs,recentOrders:Number(rows.recent_orders)||0,openSupportCases:Number(rows.open_cases)||0};
  const alerts=integrations.filter(x=>x.state==="attention"||x.state==="not_configured")
    .map(x=>({severity:x.state==="attention"?"critical":"warning",message:x.name+": "+x.detail}));
  res.setHeader("Cache-Control","private,no-store");
  res.json({checkedAt:new Date().toISOString(),api,webhooks:integrations,alerts,
    note:"This endpoint proves the API and database responded. Webhook success is based on authenticated real deliveries, not synthetic test events. Historical Stripe/Shippo receipts only exist from installation onward."});
 }catch(e){console.error("Operational monitoring failed",e);res.status(503).json({error:"API/database operational monitoring failed"});}
});
router.get("/admin/chatwoot/diagnostics",async(_req,res)=>{
 try{
  const rows=await db.execute(sql`SELECT key,value FROM site_settings
   WHERE key IN ('feature_chatwoot_support','chatwoot_identify','chatwoot_hide_admin','chatwoot_pages','chatwoot_position','chatwoot_order_context','chatwoot_region_context')`);
  const settings=Object.fromEntries((rows.rows as any[]).map(x=>[x.key,x.value]));
  const cases=(await db.execute(sql`SELECT
   COUNT(*)::int total,COUNT(*) FILTER(WHERE status NOT IN('closed','resolved'))::int open,
   COUNT(*) FILTER(WHERE created_at>NOW()-INTERVAL '7 days')::int last7d
   FROM support_tickets`)).rows[0] as any;
  const identityConfigured=!!process.env.CHATWOOT_IDENTITY_VALIDATION_SECRET;
  const identificationEnabled=settings.chatwoot_identify==="true";
  const widgetEnabled=settings.feature_chatwoot_support!=="false";
  const concerns=[
   ...(!widgetEnabled?["Chatwoot feature toggle is OFF"]:[]),
   ...(identificationEnabled&&!identityConfigured?["Customer identification enabled without an API HMAC secret"]:[]),
   ...(!identificationEnabled?["Signed-in customer identification is OFF in admin settings"]:[]),
   ...(identityConfigured?[]:["No Chatwoot HMAC identity secret configured on API"]),
  ];
  res.setHeader("Cache-Control","private,no-store");
  res.json({checkedAt:new Date().toISOString(),widgetEnabled,identificationEnabled,identityConfigured,
   signedInIdentityReady:widgetEnabled&&identificationEnabled&&identityConfigured,
   pages:settings.chatwoot_pages||"home,browse,listing,checkout,dashboard,support,other",
   hideAdmin:settings.chatwoot_hide_admin!=="false",cases:{total:Number(cases.total||0),open:Number(cases.open||0),last7d:Number(cases.last7d||0)},
   casesSeparate:true,concerns,liveInboxVerified:false,
   note:"Chatwoot conversations and Bazunk support tickets are separate. No Chatwoot API or inbox login is configured for independent contact/agent verification. Signed-in identification requires a matching Chatwoot inbox secret and live test."});
 }catch(e){console.error("Chatwoot diagnostics unavailable",e);res.status(503).json({error:"Could not validate Chatwoot support configuration"});}
});
export default router;
