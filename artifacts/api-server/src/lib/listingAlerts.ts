import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let initialized=false;
export async function ensureListingAlerts(){
 if(initialized)return;
 // This trigger records price/status changes made through ANY existing listing
 // edit route, including bulk admin and seller updates.
 await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_listing_change_events(
  id BIGSERIAL PRIMARY KEY,listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('price_drop','restock')),
  old_price NUMERIC,new_price NUMERIC,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.execute(sql`CREATE INDEX IF NOT EXISTS marketplace_change_listing_idx
   ON marketplace_listing_change_events(listing_id,created_at DESC)`);
 await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_watch_alert_prefs(
  user_email TEXT NOT NULL,listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price_drop BOOLEAN NOT NULL DEFAULT TRUE,restock BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_email,listing_id))`);
 await db.execute(sql`CREATE OR REPLACE FUNCTION bazunk_listing_alert_changes() RETURNS trigger AS $body$
  BEGIN
   IF NEW.status='active' AND OLD.price IS DISTINCT FROM NEW.price
      AND NEW.price<OLD.price THEN
    INSERT INTO marketplace_listing_change_events(listing_id,event_type,old_price,new_price)
     VALUES(NEW.id,'price_drop',OLD.price,NEW.price);
   END IF;
   IF NEW.status='active' AND (
      OLD.status IS DISTINCT FROM NEW.status OR
      (COALESCE(OLD.quantity,0)<=0 AND COALESCE(NEW.quantity,0)>0)
    ) THEN
    INSERT INTO marketplace_listing_change_events(listing_id,event_type,old_price,new_price)
     VALUES(NEW.id,'restock',OLD.price,NEW.price);
   END IF;
   RETURN NEW;
  END $body$ LANGUAGE plpgsql`);
 await db.execute(sql`DO $block$
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='bazunk_listing_alert_trigger'
     AND tgrelid='listings'::regclass AND NOT tgisinternal) THEN
   CREATE TRIGGER bazunk_listing_alert_trigger AFTER UPDATE OF price,status,quantity
    ON listings FOR EACH ROW EXECUTE FUNCTION bazunk_listing_alert_changes();
  END IF;
 END $block$`);
 initialized=true;
}

export async function listWatchedAlerts(email:string){
 await ensureListingAlerts();
 const r=await db.execute(sql`
 SELECT l.id,l.public_id,l.title,l.price,l.currency,l.status,
   COALESCE(p.price_drop,TRUE) price_drop,COALESCE(p.restock,TRUE) restock
 FROM listing_watchers w JOIN listings l ON l.id=w.listing_id
 LEFT JOIN marketplace_watch_alert_prefs p ON p.listing_id=w.listing_id AND p.user_email=${email}
 WHERE LOWER(w.buyer_email)=${email} AND LOWER(l.seller_email)<>${email}
 ORDER BY w.created_at DESC LIMIT 100`);
 return r.rows;
}
export async function watchAlertEvents(email:string){
 await ensureListingAlerts();
 const r=await db.execute(sql`SELECT e.id,e.event_type,e.old_price,e.new_price,e.created_at,
    l.title,l.public_id,l.currency,l.id listing_id,
    COALESCE(p.price_drop,TRUE) price_drop,COALESCE(p.restock,TRUE) restock
  FROM marketplace_listing_change_events e
  JOIN listings l ON l.id=e.listing_id
  JOIN listing_watchers w ON w.listing_id=e.listing_id
    AND LOWER(w.buyer_email)=${email} AND w.created_at<=e.created_at
  LEFT JOIN marketplace_watch_alert_prefs p ON p.listing_id=e.listing_id AND p.user_email=${email}
  WHERE e.created_at>NOW()-INTERVAL '90 days'
    AND (e.event_type='price_drop' AND COALESCE(p.price_drop,TRUE)
      OR e.event_type='restock' AND COALESCE(p.restock,TRUE))
    AND LOWER(l.seller_email)<>${email}
  ORDER BY e.created_at DESC LIMIT 100`);
 return r.rows;
}
