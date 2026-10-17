import { refreshSavedSearchMatches } from "../lib/savedSearches.js";
import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { ensureMarketplaceOffers } from "./marketplaceOffers.js";

const router=Router();
type Event={id:string;type:"order"|"sale"|"offer"|"bid"|"message"|"search";title:string;desc:string;time:string;href:string};
async function ensureReads(){
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_notification_reads (
    recipient_email text NOT NULL, event_id text NOT NULL, read_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(recipient_email,event_id)
  )`);
}
function event(id:string,type:Event["type"],title:string,desc:string,time:unknown,href:string):Event{
  return {id,type,title,desc,time:time?new Date(String(time)).toISOString():new Date(0).toISOString(),href};
}
router.get("/notifications",async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    await Promise.all([ensureReads(),ensureMarketplaceOffers(),refreshSavedSearchMatches(email)]);
    const [orders,bids,outbid,wins,offers,messages,reads,searchMatches]=await Promise.all([
      db.execute(sql`SELECT id,buyer_email,seller_email,item_title,status,updated_at FROM orders
        WHERE LOWER(buyer_email)=${email} OR LOWER(seller_email)=${email}
        ORDER BY updated_at DESC LIMIT 80`),
      db.execute(sql`SELECT b.id,b.created_at,b.amount,a.id auction_id,a.title,a.seller_email
        FROM bids b JOIN auctions a ON a.id=b.auction_id
        WHERE LOWER(a.seller_email)=${email} AND LOWER(b.bidder_email)<>${email}
        ORDER BY b.created_at DESC LIMIT 40`),
      db.execute(sql`SELECT DISTINCT ON(a.id) a.id,a.title,a.current_bid,a.winner_email,a.updated_at
        FROM auctions a JOIN bids b ON b.auction_id=a.id
        WHERE LOWER(b.bidder_email)=${email} AND LOWER(a.winner_email)<> ${email}
          AND a.current_bid > (SELECT MAX(own.amount) FROM bids own WHERE own.auction_id=a.id AND LOWER(own.bidder_email)=${email})
        ORDER BY a.id,a.updated_at DESC LIMIT 30`),
      db.execute(sql`SELECT id,title,winner_bid,updated_at FROM auctions
        WHERE status='ended' AND LOWER(winner_email)=${email}
        ORDER BY updated_at DESC LIMIT 30`),
      db.execute(sql`SELECT o.id,o.listing_id,o.buyer_email,o.seller_email,o.status,o.offer_price,o.counter_price,o.created_at,o.updated_at,l.title
        FROM marketplace_offers o JOIN listings l ON l.id=o.listing_id
        WHERE LOWER(o.seller_email)=${email} OR LOWER(o.buyer_email)=${email}
        ORDER BY o.updated_at DESC LIMIT 60`),
      db.execute(sql`SELECT m.id,m.created_at,c.id conversation_id,l.title listing_title
        FROM marketplace_messages m JOIN marketplace_conversations c ON c.id=m.conversation_id
        JOIN listings l ON l.id=c.listing_id
        WHERE (LOWER(c.buyer_email)=${email} OR LOWER(c.seller_email)=${email})
        AND LOWER(m.sender_email)<>${email}
        ORDER BY m.created_at DESC LIMIT 60`),
      db.execute(sql`SELECT event_id FROM marketplace_notification_reads
        WHERE recipient_email=${email} ORDER BY read_at DESC LIMIT 500`),
      db.execute(sql`SELECT m.search_id,m.listing_id,m.matched_at,s.name,l.title,l.public_id
        FROM marketplace_saved_search_matches m
        JOIN marketplace_saved_searches s ON s.id=m.search_id
        JOIN listings l ON l.id=m.listing_id
        WHERE LOWER(s.user_email)=${email} AND s.alert_enabled=TRUE AND l.status='active'
        ORDER BY m.matched_at DESC LIMIT 80`)
    ]);
    const events:Event[]=[];
    for(const o of orders.rows as any[]){
      const asBuyer=String(o.buyer_email).toLowerCase()===email;
      const type=asBuyer?"order":"sale";
      events.push(event(`${type}:${o.id}:${o.status}`,type,
        asBuyer?"Order update":"Sale update",
        `${o.item_title} — ${o.status}`,o.updated_at,
        asBuyer?"/dashboard?section=orders":"/dashboard?section=sales"));
    }
    for(const b of bids.rows as any[])events.push(event(`bid:new:${b.id}`,"bid","New auction bid",
      `${b.title} — £${Number(b.amount).toFixed(2)}`,b.created_at,"/dashboard?section=my-auctions"));
    for(const b of outbid.rows as any[])events.push(event(`bid:outbid:${b.id}:${b.current_bid}`,"bid","You've been outbid",
      `${b.title} — leading bid £${Number(b.current_bid).toFixed(2)}`,b.updated_at,`/auctions/${encodeURIComponent(String(b.id))}`));
    for(const b of wins.rows as any[])events.push(event(`bid:won:${b.id}`,"bid","Auction won!",
      `${b.title} — £${Number(b.winner_bid).toFixed(2)}`,b.updated_at,`/auctions/${encodeURIComponent(String(b.id))}`));
    for(const o of offers.rows as any[]){
      const seller=String(o.seller_email).toLowerCase()===email;
      if(seller)events.push(event(`offer:received:${o.id}`,"offer","New offer received",
        `${o.title} — £${Number(o.offer_price).toFixed(2)}`,o.created_at,"/offers"));
      else if(o.status!=="pending")events.push(event(`offer:response:${o.id}:${o.status}`,"offer","Offer updated",
        `${o.title} — ${o.status.replaceAll("_"," ")}`,o.updated_at,"/offers"));
    }
    for(const m of messages.rows as any[])events.push(event(`message:${m.id}`,"message","New message",
      `About ${m.listing_title}`,m.created_at,`/messages?conversation=${m.conversation_id}`));
    for(const m of searchMatches.rows as any[])events.push(event(
      `search:${m.search_id}:${m.listing_id}`,"search","Saved search match",
      `${m.name}: ${m.title}`,m.matched_at,`/listing/${encodeURIComponent(String(m.public_id||m.listing_id))}`
    ));
    const seen=new Set((reads.rows as any[]).map(r=>String(r.event_id)));
    const filtered=events.sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,100)
      .map(e=>({...e,unread:!seen.has(e.id)}));
    res.setHeader("Cache-Control","no-store");
    res.json({notifications:filtered,unread:filtered.filter(e=>e.unread).length});
  }catch(err){console.error("Notification feed failed",err);res.status(500).json({error:"Could not load notifications"});}
});
router.post("/notifications/read",async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    const ids=req.body?.ids;
    if(!Array.isArray(ids)||ids.length>100||ids.some((id:unknown)=>typeof id!=="string"||id.length>180||id.length<1)){
      res.status(400).json({error:"Invalid notification ids"});return;
    }
    await ensureReads();
    if(ids.length){
      await db.execute(sql`INSERT INTO marketplace_notification_reads(recipient_email,event_id)
        VALUES ${sql.join(ids.map((id:string)=>sql`(${email},${id})`),sql`,`)}
        ON CONFLICT(recipient_email,event_id) DO NOTHING`);
    }
    res.json({ok:true});
  }catch(err){console.error("Mark read failed",err);res.status(500).json({error:"Could not mark notifications as read"});}
});
export default router;
