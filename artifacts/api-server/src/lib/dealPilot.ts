import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { quoteCart } from "./checkoutQuote.js";
import { convertAmount } from "../fxRates.js";
import { featureEnabled } from "./featureFlags.js";

export type Region = "uk" | "us";
export const pilotCurrency = (region:Region) => region === "uk" ? "GBP" : "USD";

/** Deterministic, editable interpretation. No paid AI API or invented matches. */
export function interpretRequest(prompt:string) {
  const explicitRegion = /\b(usa?|united states|america|american)\b/i.test(prompt) ? "us" :
    /\b(uk|united kingdom|britain|british)\b/i.test(prompt) ? "uk" : null;
  const amount = prompt.match(/(?:under|below|maximum|max|up to|less than)\s*([£$])?\s*([\d,]+(?:\.\d{1,2})?)/i)
    || prompt.match(/([£$])\s*([\d,]+(?:\.\d{1,2})?)/);
  const budget = amount ? Number((amount[2] || "").replace(/,/g,"")) : null;
  const condition = /\b(brand.new|sealed|unused)\b/i.test(prompt) ? "new" :
    /\b(excellent|mint|like.new)\b/i.test(prompt) ? "excellent" :
    /\b(good condition|good shape)\b/i.test(prompt) ? "good" : "any";
  const query = prompt
    .replace(/\b(find|search|look for|looking for|show me|i want|please|a|an|me|only|in|with|condition|priced|price|budget)\b/gi," ")
    .replace(/(?:under|below|maximum|max|up to|less than)\s*[£$]?\s*[\d,]+(?:\.\d{1,2})?/gi," ")
    .replace(/[£$][\d,]+(?:\.\d{1,2})?/g," ")
    .replace(/\b(uk|united kingdom|britain|british|us|usa|united states|america|american|excellent|mint|like.new|good|brand.new|sealed|unused)\b/gi," ")
    .replace(/[,.;!?]/g," ").replace(/\s+/g," ").trim().slice(0,100);
  return {region:explicitRegion,budget:Number.isFinite(budget)?budget:null,condition,query};
}
export function dealTerms(query:string):string[]{
  const clean=query.toLowerCase().replace(/playstation\s*5/g,"ps5").replace(/\bsony\b/g," ").replace(/[^a-z0-9 ]/g," ");
  return [...new Set(clean.split(/\s+/).filter(w=>w.length>=2 && !["the","and","for","new","used","item","console"].includes(w)))].slice(0,5);
}

export async function ensureDealPilotTables(){
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_deal_pilots (
    id TEXT PRIMARY KEY, user_email TEXT NOT NULL, prompt TEXT NOT NULL, query TEXT NOT NULL,
    region TEXT NOT NULL CHECK(region IN ('uk','us')),
    max_total_minor INTEGER NOT NULL CHECK(max_total_minor>0),
    condition TEXT NOT NULL CHECK(condition IN ('any','new','excellent','good')),
    alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE, drafts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_checked_at TIMESTAMPTZ
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS deal_pilots_user_idx ON marketplace_deal_pilots (LOWER(user_email),created_at DESC)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_deal_pilot_matches (
    pilot_id TEXT NOT NULL REFERENCES marketplace_deal_pilots(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    total_minor INTEGER NOT NULL, item_minor INTEGER NOT NULL, delivery_minor INTEGER NOT NULL,
    protection_minor INTEGER NOT NULL, discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(pilot_id,listing_id)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_deal_pilot_sent_offers (
    pilot_id TEXT NOT NULL REFERENCES marketplace_deal_pilots(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    offer_id TEXT NOT NULL, approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(pilot_id,listing_id)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_deal_pilot_admin_audit (
    id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, changes JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
export async function pilotSettings(){
  const r=await db.execute(sql`SELECT key,value FROM site_settings WHERE key IN
    ('deal_pilot_alerts_enabled','deal_pilot_offers_enabled','deal_pilot_monitor_enabled')`);
  const x=Object.fromEntries((r.rows as any[]).map(row=>[String(row.key),String(row.value)]));
  return {alerts:x.deal_pilot_alerts_enabled!=="false",
    offers:x.deal_pilot_offers_enabled!=="false",monitor:x.deal_pilot_monitor_enabled!=="false"};
}
export type PilotRow={id:string;user_email:string;query:string;region:Region;max_total_minor:number;condition:string;active:boolean;last_checked_at:string|null};

/** Re-check the actual single-item Stripe checkout quote, including current protection and delivery.
 * Checkout recalculates at purchase; promotions, shipping and currency rates can still change.
 */
export async function matchedQuote(listingId:number,region:Region){
  const quote=await quoteCart([{id:listingId,quantity:1}]);
  if(quote.units.length!==1)throw Error("Single-item quote unavailable");
  const convert = async (minor:number) => region==="uk" ? minor : Math.round((await convertAmount(minor/100,"GBP","USD"))*100);
  return {totalMinor:await convert(quote.totalMinor),
    itemMinor:await convert(quote.units[0].priceMinor),
    deliveryMinor:await convert(quote.deliveryMinor),
    protectionMinor:await convert(quote.buyerProtectionMinor)};
}
export async function refreshDealPilot(p:PilotRow,force=false) {
  if(!p.active)return;
  if(!force && p.last_checked_at && Date.now()-new Date(p.last_checked_at).getTime()<10*60_000)return;
  const terms=dealTerms(p.query);
  if(!terms.length)return;
  const wordPredicates=terms.map(term=>sql`STRPOS(REPLACE(LOWER(l.title),'playstation 5','ps5'),${term})>0`);
  const allowedConditions=p.condition==="new" ? ["new","brand-new","sealed","unused"] :
    p.condition==="excellent" ? ["excellent","like-new","like new","mint","new","brand-new"] :
    p.condition==="good" ? ["good","excellent","like-new","like new","mint","new","brand-new"] : [];
  const clause=allowedConditions.length ?
    sql`AND LOWER(l.condition) IN (${sql.join(allowedConditions.map(c=>sql`${c}`),sql`,`)})` : sql``;
  const rows=(await db.execute(sql`SELECT l.id,l.price,l.seller_email
    FROM listings l WHERE l.status='active' AND l.price>0
      AND LOWER(l.seller_email)<>${p.user_email.toLowerCase()}
      AND (CASE WHEN COALESCE(l.specifications,'') ~ '^\\s*\\{' THEN l.specifications::jsonb->>'marketplace_region' ELSE NULL END)=${p.region}
      AND NOT EXISTS(SELECT 1 FROM site_settings s WHERE s.value='false'
         AND (s.key='category_visible_'||l.category OR s.key='category_visible_'||l.category||'__'||COALESCE(l.subcategory,'')))
      AND ${sql.join(wordPredicates,sql` AND `)} ${clause}
    ORDER BY l.created_at DESC LIMIT 24`)).rows as Array<{id:number;price:string;seller_email:string}>;
  for(const item of rows) {
    try {
      const totals=await matchedQuote(item.id,p.region);
      if(totals.totalMinor<=0 || totals.totalMinor>p.max_total_minor)continue;
      await db.execute(sql`INSERT INTO marketplace_deal_pilot_matches
        (pilot_id,listing_id,total_minor,item_minor,delivery_minor,protection_minor)
        VALUES(${p.id},${item.id},${totals.totalMinor},${totals.itemMinor},${totals.deliveryMinor},${totals.protectionMinor})
        ON CONFLICT(pilot_id,listing_id) DO UPDATE SET
        total_minor=EXCLUDED.total_minor,item_minor=EXCLUDED.item_minor,
        delivery_minor=EXCLUDED.delivery_minor,protection_minor=EXCLUDED.protection_minor,updated_at=NOW()`);
    }catch { /* A removed, demo, or unquotable listing must not become a deal. */ }
  }
  await db.execute(sql`UPDATE marketplace_deal_pilots SET last_checked_at=NOW()
    WHERE id=${p.id} AND active=TRUE`);
}
/** Server-side polling keeps matching even if a buyer has closed the site. */
export function startDealPilotMonitor(){
  let busy=false;
  const scan=async()=>{
    if(busy||!(await featureEnabled("deal_pilot")))return;
    busy=true;
    try{
      await ensureDealPilotTables();
      const settings=await pilotSettings();
      if(!settings.monitor)return;
      const r=await db.execute(sql`SELECT id,user_email,query,region,max_total_minor,condition,active,last_checked_at
        FROM marketplace_deal_pilots WHERE active=TRUE AND
          (last_checked_at IS NULL OR last_checked_at<NOW()-INTERVAL '10 minutes')
        ORDER BY last_checked_at ASC NULLS FIRST LIMIT 40`);
      for(const p of r.rows as PilotRow[]) {
        try{await refreshDealPilot(p,true);}catch(e){console.error("DealPilot scan failed",p.id,e);}
      }
    }catch(e){console.error("DealPilot monitor unavailable",e);}
    finally{busy=false;}
  };
  // No duplicate startup scan while other migrations are still running.
  setInterval(()=>{void scan();},15*60_000).unref();
}
