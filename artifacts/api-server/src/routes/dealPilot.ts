import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { ensureMarketplaceOffers } from "./marketplaceOffers.js";
import { featureEnabled } from "../lib/featureFlags.js";
import { ensureDealPilotTables, interpretRequest, dealTerms, matchedQuote,
  pilotSettings, pilotCurrency, refreshDealPilot, type PilotRow, type Region } from "../lib/dealPilot.js";

const router=Router();
const noStore=(res:any)=>res.setHeader("Cache-Control","private,no-store");
const fail=(res:any,err:unknown)=>{console.error("DealPilot request failed",err);res.status(503).json({error:"DealPilot is temporarily unavailable"});};
const validId=(id:string)=>/^[a-f\d-]{36}$/i.test(id);
const money=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)&&n>0&&n<=100000?Math.round(n*100):0;};

router.get("/deal-pilot",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  await ensureDealPilotTables();noStore(res);
  const rows=(await db.execute(sql`SELECT id,user_email,prompt,query,region,max_total_minor,condition,
    alerts_enabled,drafts_enabled,active,created_at,last_checked_at
    FROM marketplace_deal_pilots WHERE LOWER(user_email)=${email} ORDER BY created_at DESC LIMIT 5`)).rows as any[];
  for(const p of rows) {if(p.active)try{await refreshDealPilot(p as PilotRow);}catch(e){console.error("DealPilot refresh failed",p.id,e);}}
  const matches=(await db.execute(sql`SELECT m.pilot_id,m.listing_id,m.total_minor,m.item_minor,m.delivery_minor,
    m.protection_minor,m.discovered_at,l.title,l.image,l.condition,l.price,l.currency,
    l.public_id,l.status,l.seller_name,o.offer_id
    FROM marketplace_deal_pilot_matches m
    JOIN marketplace_deal_pilots p ON p.id=m.pilot_id
    JOIN listings l ON l.id=m.listing_id
    LEFT JOIN marketplace_deal_pilot_sent_offers o ON o.pilot_id=m.pilot_id AND o.listing_id=m.listing_id
    WHERE LOWER(p.user_email)=${email} AND p.active=TRUE AND l.status='active'
      AND (CASE WHEN COALESCE(l.specifications,'') ~ '^\\s*\\{' THEN l.specifications::jsonb->>'marketplace_region' ELSE NULL END)=p.region
      AND m.total_minor<=p.max_total_minor
    ORDER BY m.total_minor ASC,m.discovered_at DESC LIMIT 100`)).rows;
  res.json({pilots:rows.map(p=>({...p,currency:pilotCurrency(p.region)})),matches,settings:await pilotSettings()});
 }catch(e){fail(res,e);}
});
router.post("/deal-pilot",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const prompt=String(req.body?.prompt??"").trim().slice(0,220);
  const parsed=interpretRequest(prompt);
  const region=parsed.region || req.body?.region as Region;
  const amount=req.body?.maxTotal===undefined||req.body.maxTotal===""?parsed.budget:req.body.maxTotal;
  const maximum=money(amount);
  const condition=req.body?.condition && req.body.condition!=="any"?req.body.condition:parsed.condition;
  if(prompt.length<3||!["uk","us"].includes(region)||!maximum||!["any","new","excellent","good"].includes(condition)
    ||dealTerms(parsed.query).length===0) {
    res.status(400).json({error:"Describe the item, select UK or USA and enter a valid maximum total."});return;
  }
  await ensureDealPilotTables();
  const n=(await db.execute(sql`SELECT COUNT(*)::int AS total FROM marketplace_deal_pilots WHERE LOWER(user_email)=${email}`)).rows[0] as any;
  if(Number(n.total)>=5){res.status(409).json({error:"Maximum five DealPilots per account. Delete one to create another."});return;}
  const id=randomUUID();
  await db.execute(sql`INSERT INTO marketplace_deal_pilots
    (id,user_email,prompt,query,region,max_total_minor,condition,alerts_enabled,drafts_enabled)
    VALUES(${id},${email},${prompt},${parsed.query},${region},${maximum},${condition},
      ${req.body?.alertsEnabled!==false},${req.body?.draftsEnabled===true})`);
  res.status(201).json({id,query:parsed.query,region,currency:pilotCurrency(region),maximum});
 }catch(e){fail(res,e);}
});
router.patch("/deal-pilot/:id",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.id)){res.status(400).json({error:"Invalid DealPilot"});return;}
  const keys=["active","alertsEnabled","draftsEnabled"] as const;
  if(!keys.some(k=>typeof req.body?.[k]==="boolean")||
      keys.some(k=>req.body?.[k]!==undefined && typeof req.body?.[k]!=="boolean")){
    res.status(400).json({error:"Choose an active, alerts or offer-drafts setting"});return;
  }
  await ensureDealPilotTables();
  const r=await db.execute(sql`UPDATE marketplace_deal_pilots SET
    active=COALESCE(${req.body?.active??null}::boolean,active),
    alerts_enabled=COALESCE(${req.body?.alertsEnabled??null}::boolean,alerts_enabled),
    drafts_enabled=COALESCE(${req.body?.draftsEnabled??null}::boolean,drafts_enabled),
    updated_at=NOW(),last_checked_at=CASE WHEN ${req.body?.active===true} THEN NULL ELSE last_checked_at END
    WHERE id=${req.params.id} AND LOWER(user_email)=${email} RETURNING id`);
  if(!r.rows.length){res.status(404).json({error:"DealPilot not found"});return;}
  noStore(res);res.json({ok:true});
 }catch(e){fail(res,e);}
});
router.delete("/deal-pilot/:id",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.id)){res.status(400).json({error:"Invalid DealPilot"});return;}
  await ensureDealPilotTables();
  const r=await db.execute(sql`DELETE FROM marketplace_deal_pilots
    WHERE id=${req.params.id} AND LOWER(user_email)=${email} RETURNING id`);
  if(!r.rows.length){res.status(404).json({error:"DealPilot not found"});return;}
  res.json({ok:true});
 }catch(e){fail(res,e);}
});
router.post("/deal-pilot/:id/matches/:listingId/offer",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.id)||!Number.isSafeInteger(Number(req.params.listingId))||Number(req.params.listingId)<1){
    res.status(400).json({error:"Invalid DealPilot match"});return;
  }
  // Explicit human approval is mandatory; never automatically transmit offers.
  if(req.body?.approved!==true){res.status(400).json({error:"Confirm the offer before it is sent"});return;}
  if(!(await featureEnabled("offers"))){res.status(503).json({error:"Marketplace offers are unavailable"});return;}
  await ensureDealPilotTables();await ensureMarketplaceOffers();
  const settings=await pilotSettings();
  if(!settings.offers){res.status(403).json({error:"DealPilot offers are currently disabled"});return;}
  const amount=money(req.body?.amount);
  const lid=Number(req.params.listingId);
  const match=(await db.execute(sql`SELECT p.*,l.price,l.status,l.seller_email,l.currency,l.specifications
    FROM marketplace_deal_pilots p
    JOIN marketplace_deal_pilot_matches m ON m.pilot_id=p.id
    JOIN listings l ON l.id=m.listing_id WHERE p.id=${req.params.id}
    AND m.listing_id=${lid} AND LOWER(p.user_email)=${email}`)).rows[0] as any;
  if(!match||!match.active||!match.drafts_enabled||match.status!=="active"||
    String(match.seller_email).toLowerCase()===email){res.status(409).json({error:"Offer drafts unavailable for this match"});return;}
  if((await db.execute(sql`SELECT 1 FROM marketplace_deal_pilot_sent_offers WHERE pilot_id=${req.params.id} AND listing_id=${lid}`)).rows.length){
    res.status(409).json({error:"You've already sent an offer through this DealPilot"});return;
  }
  const region=match.region as Region;
  const specs=(()=>{try{return JSON.parse(String(match.specifications||"{}"));}catch{return {};}})();
  if(specs.marketplace_region!==region){res.status(409).json({error:"Listing region changed"});return;}
  const totals=await matchedQuote(lid,region);
  if(totals.totalMinor>Number(match.max_total_minor)){res.status(409).json({error:"The current checkout total exceeds your budget. Refresh your matches."});return;}
  if(!amount||amount>Math.round(Number(match.price)*100)||amount<100){
    res.status(400).json({error:"Offer must be at least 1 unit and not exceed the current asking price"});return;
  }
  if(String(match.currency||"").toUpperCase()!==pilotCurrency(region)){
    res.status(409).json({error:"This listing's currency must match the selected marketplace for offers"});return;
  }
  const sent=await db.transaction(async tx=>{
    const lock=(await tx.execute(sql`SELECT m.pilot_id FROM marketplace_deal_pilot_matches m
      WHERE m.pilot_id=${req.params.id} AND m.listing_id=${lid} FOR UPDATE`)).rows;
    if(!lock.length)return null;
    if((await tx.execute(sql`SELECT 1 FROM marketplace_deal_pilot_sent_offers
      WHERE pilot_id=${req.params.id} AND listing_id=${lid}`)).rows.length)return null;
    const current=(await tx.execute(sql`SELECT price,status,seller_email FROM listings WHERE id=${lid} FOR UPDATE`)).rows[0] as any;
    if(!current||current.status!=="active"||String(current.seller_email).toLowerCase()!==String(match.seller_email).toLowerCase()||
      amount>Math.round(Number(current.price)*100))return null;
    const offerId=randomUUID();
    await tx.execute(sql`INSERT INTO marketplace_offers(id,listing_id,buyer_email,seller_email,
      offer_price,listing_price,message) VALUES(${offerId},${lid},${email},
      ${String(match.seller_email).toLowerCase()},${(amount/100).toFixed(2)},
      ${String(current.price)},"DealPilot buyer-approved offer")`);
    await tx.execute(sql`INSERT INTO marketplace_deal_pilot_sent_offers(pilot_id,listing_id,offer_id)
      VALUES(${req.params.id},${lid},${offerId})`);
    return offerId;
  });
  if(!sent){res.status(409).json({error:"Listing or offer changed; refresh and try again"});return;}
  res.status(201).json({offerId:sent,approved:true});
 }catch(e){fail(res,e);}
});
router.get("/admin/deal-pilot",requireAdmin,async(_req,res)=>{
 try{
  await ensureDealPilotTables();noStore(res);
  const [summary,regions,latest,audit]=await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS pilots,COUNT(*) FILTER(WHERE active)::int AS active,
      COUNT(*) FILTER(WHERE alerts_enabled)::int AS with_alerts,
      COUNT(*) FILTER(WHERE drafts_enabled)::int AS with_drafts FROM marketplace_deal_pilots`),
    db.execute(sql`SELECT region,COUNT(*)::int AS total FROM marketplace_deal_pilots GROUP BY region`),
    db.execute(sql`SELECT p.id,p.query,p.region,p.max_total_minor,p.condition,p.active,p.created_at,
      p.last_checked_at,COUNT(m.listing_id)::int AS matches
      FROM marketplace_deal_pilots p LEFT JOIN marketplace_deal_pilot_matches m ON m.pilot_id=p.id
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 25`),
    db.execute(sql`SELECT actor,changes,created_at FROM marketplace_deal_pilot_admin_audit ORDER BY id DESC LIMIT 10`)
  ]);
  const counts=await db.execute(sql`SELECT (SELECT COUNT(*)::int FROM marketplace_deal_pilot_matches) AS matches,
    (SELECT COUNT(*)::int FROM marketplace_deal_pilot_sent_offers) AS sent_offers`);
  res.json({summary:{...summary.rows[0],...counts.rows[0]},regions:regions.rows,latest:latest.rows,
    audit:audit.rows,settings:await pilotSettings()});
 }catch(e){fail(res,e);}
});
router.patch("/admin/deal-pilot/settings",requireAdmin,async(req,res)=>{
 try{
  const values=req.body;
  if(!values||typeof values!=="object"||!["alerts","offers","monitor"].some(k=>typeof values[k]==="boolean")||
     ["alerts","offers","monitor"].some(k=>values[k]!==undefined&&typeof values[k]!=="boolean")){
    res.status(400).json({error:"Supply boolean alert, offer or monitoring settings"});return;
  }
  await ensureDealPilotTables();
  const before=await pilotSettings();
  const after={...before,...Object.fromEntries(["alerts","offers","monitor"].filter(k=>typeof values[k]==="boolean").map(k=>[k,values[k]]))};
  const actor=String((req as any).admin?.email||"Authenticated admin").slice(0,250);
  await db.transaction(async tx=>{
    for(const key of ["alerts","offers","monitor"] as const){
      if(after[key]===before[key])continue;
      await tx.execute(sql`INSERT INTO site_settings(key,value,updated_at)
        VALUES(${"deal_pilot_"+(key==="monitor"?"monitor":key)+"_enabled"},${after[key]?"true":"false"},NOW())
        ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`);
    }
    await tx.execute(sql`INSERT INTO marketplace_deal_pilot_admin_audit(actor,changes)
      VALUES(${actor},${JSON.stringify({before,after})}::jsonb)`);
  });
  noStore(res);res.json({settings:after});
 }catch(e){fail(res,e);}
});
export default router;
