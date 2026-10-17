import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function recordWebhookDelivery(provider:string,eventId:string,eventType:string,status:"processed"|"failed",error?:string){
 try{
  await db.execute(sql`CREATE TABLE IF NOT EXISTS webhook_delivery_health(
   provider TEXT NOT NULL,event_id TEXT NOT NULL,event_type TEXT NOT NULL,
   status TEXT NOT NULL CHECK(status IN('processed','failed')),
   error TEXT,received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   PRIMARY KEY(provider,event_id))`);
  await db.execute(sql`INSERT INTO webhook_delivery_health(provider,event_id,event_type,status,error)
    VALUES(${provider},${eventId},${eventType},${status},${error?.slice(0,300)||null})
    ON CONFLICT(provider,event_id) DO UPDATE SET status=EXCLUDED.status,error=EXCLUDED.error,updated_at=NOW()`);
 }catch(e){console.error("Webhook health recording failed",e);}
}
