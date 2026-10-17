import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
const router=Router();

router.get("/admin/importers/monitor",async(_req,res)=>{
 try{
  const [listings,ali,usage,health]=await Promise.all([
    db.execute(sql`SELECT id,public_id,title,status,updated_at,
      COALESCE(NULLIF(specifications::jsonb->>'source',''),'unknown') source,
      COALESCE(specifications::jsonb->>'source_last_checked','') checked,
      COALESCE(specifications::jsonb->>'source_price_anomaly','false') price_anomaly
      FROM listings
      WHERE specifications IS NOT NULL AND specifications LIKE '{%'
       AND (LOWER(specifications) LIKE '%amazon%' OR LOWER(specifications) LIKE '%ebay%'
         OR LOWER(specifications) LIKE '%shopify%')
      ORDER BY updated_at DESC LIMIT 500`),
    db.execute(sql`SELECT si.listing_id,si.supplier_source,si.sync_status,si.sync_error,
      si.last_synced_at,si.updated_at,l.title,l.public_id,l.status
      FROM supplier_imports si JOIN listings l ON l.id=si.listing_id
      ORDER BY COALESCE(si.last_synced_at,si.updated_at) DESC LIMIT 300`),
    db.execute(sql`SELECT COUNT(*)::int calls,
      COUNT(*) FILTER(WHERE status>=400 OR status=0)::int failed,
      MAX(used_at) last_call
      FROM ebay_api_usage WHERE used_at>=date_trunc('month',NOW())`),
    db.execute(sql`SELECT integration,last_status,last_message,last_check_at,last_success_at
      FROM system_integration_status WHERE integration ILIKE '%rapidapi%' OR integration ILIKE '%import%'
      ORDER BY last_check_at DESC`)
  ]);
  const sources=["amazon","ebay","aliexpress","shopify"].map(name=>{
    const matching=(listings.rows as any[]).filter(x=>String(x.source).toLowerCase().includes(name));
    const tracked=(ali.rows as any[]).filter(x=>String(x.supplier_source).toLowerCase().includes(name));
    const rows= name==="aliexpress"?tracked:matching;
    const errors=rows.filter(x=>String(x.sync_status||"").toLowerCase()==="error"||String(x.price_anomaly)==="true"||
      ["paused","suspended"].includes(String(x.status||"").toLowerCase()));
    const sorted=rows.map(x=>String(x.last_synced_at||x.checked||x.updated_at||"")).filter(Boolean).sort().reverse();
    const providerStatus=(health.rows as any[]).filter(x=>String(x.integration).includes(name));
    return {key:name,label:name==="ebay"?"eBay":name==="aliexpress"?"AliExpress":name==="shopify"?"Shopify":"Amazon",
      imported:rows.length,failed:errors.length,
      active:rows.filter(x=>String(x.status)==="active"||String(x.sync_status)==="ok").length,
      lastSync:sorted[0]||null,
      health:providerStatus.length?providerStatus.map(x=>({source:x.integration,status:x.last_status,lastCheck:x.last_check_at,lastSuccess:x.last_success_at,message:x.last_message})):[],
      coverage:name==="shopify"?"No verified provider API heartbeat configured; counts derive from tracked listing source only.":name==="ebay"?"Tracked local API calls and imported listing state; RapidAPI billing may differ.":"Tracked listing/source status; last external provider check shown if available.",
      failures:errors.slice(0,20).map(x=>({id:x.listing_id||x.id,title:x.title,publicId:x.public_id,error:x.sync_error|| (x.price_anomaly==="true"?"Price safety pause":"Listing paused"),lastChecked:x.last_synced_at||x.checked||x.updated_at}))
    };
  });
  res.setHeader("Cache-Control","private,no-store");
  res.json({checkedAt:new Date().toISOString(),sources,usage:{ebayRequestsThisMonth:Number((usage.rows[0] as any)?.calls||0),
    ebayErrorsThisMonth:Number((usage.rows[0] as any)?.failed||0),
    ebayLastCall:(usage.rows[0] as any)?.last_call||null},
    note:"Snapshot of up to 500 tagged listings and 300 tracked supplier imports. Zero recorded imports is not proof an upstream API is healthy; missing health checks are displayed as unknown. Provider billing quotas are not retrieved."});
 }catch(e){console.error("Importer monitor unavailable",e);res.status(503).json({error:"Importer reporting unavailable; data or integration tables could not be read"});}
});
export default router;
