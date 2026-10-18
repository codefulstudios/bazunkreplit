import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { ensureListingAlerts,listWatchedAlerts } from "../lib/listingAlerts.js";
const router=Router();

router.get("/watch-alerts",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  res.setHeader("Cache-Control","private,no-store");
  res.json({items:await listWatchedAlerts(email),note:"Watchlist preferences and price/restock notifications are stored on your account and synced across devices."});
 }catch(e){console.error("Watch alerts unavailable",e);res.status(503).json({error:"Could not load watch alerts"});}
});
router.patch("/watch-alerts/:id",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<=0){res.status(400).json({error:"Invalid listing"});return;}
  const priceDrop=req.body?.priceDrop,restock=req.body?.restock;
  if(typeof priceDrop!=="boolean"||typeof restock!=="boolean"){res.status(400).json({error:"Choose price-drop and restock alerts on or off"});return;}
  await ensureListingAlerts();
  const r=await db.execute(sql`INSERT INTO marketplace_watch_alert_prefs(user_email,listing_id,price_drop,restock)
    SELECT ${email},w.listing_id,${priceDrop},${restock}
    FROM listing_watchers w WHERE w.listing_id=${id} AND LOWER(w.buyer_email)=${email}
    ON CONFLICT(user_email,listing_id) DO UPDATE SET price_drop=EXCLUDED.price_drop,
    restock=EXCLUDED.restock,updated_at=NOW() RETURNING listing_id`);
  if(!r.rows.length){res.status(404).json({error:"Watch this item first to receive alerts"});return;}
  res.json({id,priceDrop,restock});
 }catch(e){console.error("Watch preferences update failed",e);res.status(503).json({error:"Could not save your notification preferences"});}
});
router.get("/admin/listing-alerts/monitor",async(_req,res)=>{
 try{
  await ensureListingAlerts();
  const [ev,prefs,searches]=await Promise.all([
   db.execute(sql`SELECT event_type,COUNT(*)::int total FROM marketplace_listing_change_events
    WHERE created_at>NOW()-INTERVAL '7 days' GROUP BY event_type`),
   db.execute(sql`SELECT COUNT(*)::int subscriptions,
    COUNT(*) FILTER(WHERE price_drop)::int price_drop_enabled,
    COUNT(*) FILTER(WHERE restock)::int restock_enabled FROM marketplace_watch_alert_prefs`),
   db.execute(sql`SELECT COUNT(*)::int saved_searches,
    COUNT(*) FILTER(WHERE alert_enabled)::int search_alerts FROM marketplace_saved_searches`)
  ]);
  res.setHeader("Cache-Control","private,no-store");
  res.json({events:ev.rows,watchers:prefs.rows[0],searches:searches.rows[0],updatedAt:new Date().toISOString(),
   note:"Real listing update events are stored by a database trigger. Notification receipts are fetched in-app; no push or email delivery is implied. Preferences not explicitly changed use default-on."});
 }catch(e){console.error("Listing alerts admin monitor failed",e);res.status(503).json({error:"Listing alerts monitor unavailable"});}
});
export default router;
