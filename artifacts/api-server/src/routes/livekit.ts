import { Router } from "express";
import { AccessToken, LiveKitAPI, StreamOutput, StreamProtocol } from "livekit-server-sdk";
import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";
import { logger } from "../lib/logger.js";
import { storage } from "../storage.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function getLiveKitConfig(): { apiKey: string; apiSecret: string; wsUrl: string } | null {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl     = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  return { apiKey, apiSecret, wsUrl };
}


async function authenticatedEmail(req: Request): Promise<string | null> {
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) return null;
  const user = await clerkClient.users.getUser(auth.userId);
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
}

function liveKitApi() {
  const cfg = getLiveKitConfig();
  if (!cfg) return null;
  return new LiveKitAPI({ host: cfg.wsUrl.replace(/^ws/, "http"), apiKey: cfg.apiKey, secret: cfg.apiSecret });
}

router.get("/livekit/config", (_req, res) => {
  const cfg = getLiveKitConfig();
  res.json({ configured: !!cfg, wsUrl: cfg?.wsUrl ?? null });
});

router.get("/livekit/token", async (req, res) => {
  const cfg = getLiveKitConfig();
  if (!cfg) {
    res.status(503).json({ error: "LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET to your secrets." });
    return;
  }

  const { room, identity, canPublish } = req.query as Record<string, string>;
  if (canPublish === "true") {
    const email = await authenticatedEmail(req);
    if (!email || email !== String(identity).trim().toLowerCase()) {
      res.status(401).json({ error: "You must be signed in as the broadcaster." });
      return;
    }
    try {
      const owned:any = await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE broadcast_room=${String(room || "")} AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE LIMIT 1`);
      if (!owned.rows?.length) { res.status(403).json({ error: "Start your own live session before publishing to this room." }); return; }
    } catch (err) { logger.error({ err }, "Live room authorization failed"); res.status(503).json({ error: "Unable to verify live room ownership." }); return; }
  } else {
    try {
      const active:any = await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE broadcast_room=${String(room || "")} AND is_live=TRUE LIMIT 1`);
      if (!active.rows?.length) { res.status(404).json({ error: "This live room is not active." }); return; }
    } catch (err) { logger.error({ err }, "Live room lookup failed"); res.status(503).json({ error: "Unable to verify live room." }); return; }
  }
  if (!room || !identity) {
    res.status(400).json({ error: "room and identity query parameters are required" });
    return;
  }

  try {
    const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
      identity,
      ttl: "6h",
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: canPublish === "true",
      canSubscribe: true,
    });
    const token = await at.toJwt();

    // identity is the broadcaster's email (see LiveKitBroadcaster/LiveKitViewer
    // callers). A publish-capable token means this user is going live —
    // complete the "Go Live!" milestone. Fire-and-forget: never block or
    // fail the stream over a milestone-tracking issue.
    if (canPublish === "true") {
      storage.completeMilestone(identity, "first-live").catch((err) => {
        logger.error({ err, identity }, "Failed to record first-live milestone");
      });
    }

    res.json({ token, wsUrl: cfg.wsUrl });
  } catch (err) {
    logger.error({ err }, "Failed to generate LiveKit token");
    res.status(500).json({ error: "Failed to generate token" });
  }
});


router.post("/livekit/youtube/start", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in to start a YouTube broadcast." }); return; }
  const api = liveKitApi();
  if (!api) { res.status(503).json({ error: "LiveKit is not configured on the server." }); return; }

  const roomName = String(req.body?.roomName ?? "").trim();
  const streamKey = String(req.body?.streamKey ?? "").trim();
  const rtmpsUrl = String(req.body?.rtmpsUrl ?? "").trim().replace(/\/$/, "");
  if (!roomName || !streamKey || !rtmpsUrl) {
    res.status(400).json({ error: "Room, YouTube RTMPS URL and stream key are required." }); return;
  }
  if (!/^rtmps:\/\//i.test(rtmpsUrl)) {
    res.status(400).json({ error: "Use the secure RTMPS Stream URL from YouTube Live Control Room." }); return;
  }
  if (/\s/.test(streamKey) || streamKey.length < 6) {
    res.status(400).json({ error: "The YouTube stream key does not look valid." }); return;
  }

  try {
    const owner:any = await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE broadcast_room=${roomName} AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE LIMIT 1`);
    if (!owner.rows?.length) { res.status(403).json({ error: "This Bazunk live room does not belong to the signed-in seller." }); return; }
    // Never persist or log the stream key. It is used only to create this LiveKit egress.
    const output = new StreamOutput({ protocol: StreamProtocol.RTMP, urls: [`${rtmpsUrl}/${streamKey}`] });
    const info = await api.egress.startRoomCompositeEgress(roomName, { stream: output }, { layout: "speaker" });
    logger.info({ roomName, egressId: info.egressId, broadcaster: email }, "Started YouTube Live relay");
    res.json({ ok: true, egressId: info.egressId });
  } catch (err) {
    logger.error({ err, roomName, broadcaster: email }, "Failed to start YouTube Live relay");
    res.status(502).json({ error: "LiveKit could not start the YouTube relay. Check Egress is enabled and the RTMPS URL/key are correct." });
  }
});

router.post("/livekit/youtube/stop", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in to stop a YouTube broadcast." }); return; }
  const api = liveKitApi();
  if (!api) { res.status(503).json({ error: "LiveKit is not configured on the server." }); return; }
  const roomName = String(req.body?.roomName ?? "").trim();
  if (!roomName) { res.status(400).json({ error: "Room is required." }); return; }
  try {
    const owner:any = await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE broadcast_room=${roomName} AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
    if (!owner.rows?.length) { res.status(403).json({ error: "This Bazunk live room does not belong to the signed-in seller." }); return; }
    const active = await api.egress.listEgress({ roomName, active: true });
    await Promise.all(active.map((e) => api.egress.stopEgress(e.egressId)));
    logger.info({ roomName, stopped: active.length, broadcaster: email }, "Stopped YouTube Live relay");
    res.json({ ok: true, stopped: active.length });
  } catch (err) {
    logger.error({ err, roomName, broadcaster: email }, "Failed to stop YouTube Live relay");
    res.status(502).json({ error: "Could not stop the YouTube relay." });
  }
});


// ── Public Bazunk live-room state + live chat ──────────────────────────────

router.get("/live/sessions", async (_req,res) => {
  try {
    const r:any=await db.execute(sql`SELECT * FROM live_stream_sessions WHERE is_live=TRUE ORDER BY started_at DESC LIMIT 100`);
    res.json({sessions:(r.rows||[]).map((x:any)=>({id:x.id,sellerId:x.seller_email,sellerName:x.seller_name,sellerInitials:x.seller_initials,title:x.title,platform:x.platform,streamUrl:x.stream_url,isLive:x.is_live,productIds:x.product_ids||[],viewerCount:x.viewer_count||0,startedAt:x.started_at}))});
  } catch { res.status(500).json({error:"Could not load live streams."}); }
});

router.post("/live/session", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in to create a live session." }); return; }
  const b = req.body ?? {};
  if (!b.id || !b.title || !b.platform || !b.streamUrl || String(b.id).length > 120 || String(b.title).length > 160 || !/^[a-z0-9_-]{1,120}$/i.test(String(b.id))) { res.status(400).json({ error: "Invalid live session." }); return; }
  if (b.platform === "livekit" && (!b.broadcastRoom || String(b.broadcastRoom) !== String(b.streamUrl))) { res.status(400).json({ error: "Invalid broadcast room." }); return; }
  try {
    const existing:any = await db.execute(sql`SELECT seller_email FROM live_stream_sessions WHERE id=${String(b.id)} LIMIT 1`);
    if (existing.rows?.length && String(existing.rows[0].seller_email).toLowerCase() !== email) { res.status(403).json({ error: "You cannot modify another seller\'s stream." }); return; }
  } catch (err) { logger.error({ err }, "Failed to check live session ownership"); res.status(503).json({ error: "Unable to verify stream ownership." }); return; }
  try {
    await db.execute(sql`
      INSERT INTO live_stream_sessions (id,seller_email,seller_name,seller_initials,title,platform,stream_url,broadcast_room,is_live,product_ids,viewer_count,started_at)
      VALUES (${String(b.id)},${email},${String(b.sellerName||email)},${String(b.sellerInitials||"")},${String(b.title)},${String(b.platform)},${String(b.streamUrl)},${b.broadcastRoom ? String(b.broadcastRoom) : null},TRUE,${JSON.stringify(Array.isArray(b.productIds)?b.productIds:[])}::jsonb,0,${b.startedAt ? new Date(b.startedAt) : new Date()})
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, stream_url=EXCLUDED.stream_url, broadcast_room=EXCLUDED.broadcast_room, is_live=TRUE, product_ids=EXCLUDED.product_ids WHERE LOWER(live_stream_sessions.seller_email)=LOWER(EXCLUDED.seller_email)
    `);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "Failed to persist live session"); res.status(500).json({ error: "Could not create live session." }); }
});

router.get("/live/session/:id", async (req, res) => {
  try {
    const r:any = await db.execute(sql`SELECT * FROM live_stream_sessions WHERE id=${req.params.id} LIMIT 1`);
    const x:any = r.rows?.[0];
    if (!x) { res.status(404).json({ error: "Stream not found" }); return; }
    res.json({ id:x.id,sellerId:x.seller_email,sellerName:x.seller_name,sellerInitials:x.seller_initials,title:x.title,platform:x.platform,streamUrl:x.stream_url,isLive:x.is_live,productIds:x.product_ids||[],viewerCount:x.viewer_count||0,startedAt:x.started_at });
  } catch { res.status(500).json({ error: "Could not load stream." }); }
});

router.post("/live/session/:id/end", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in required." }); return; }
  try {
    const r:any = await db.execute(sql`UPDATE live_stream_sessions SET is_live=FALSE, ended_at=NOW() WHERE id=${req.params.id} AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE RETURNING id`);
    if (!r.rows?.length) { res.status(404).json({ error: "No active stream owned by you was found." }); return; }
    res.json({ ok:true });
  } catch (err) { logger.error({ err }, "Failed to end live session"); res.status(500).json({ error: "Could not end live session." }); }
});

router.get("/live/session/:id/messages", async (req,res) => {
  try {
    const r:any=await db.execute(sql`SELECT id,sender_email,sender_name,text,created_at FROM live_stream_messages WHERE session_id=${req.params.id} ORDER BY created_at ASC LIMIT 200`);
    res.json({ messages:r.rows||[] });
  } catch { res.status(500).json({ error:"Could not load live chat." }); }
});

router.post("/live/session/:id/messages", async (req,res) => {
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in to chat."});return;}
  try {
    await ensureCreatorTables();
    const blocked:any=await db.execute(sql`SELECT 1 FROM live_creator_chat_blocks WHERE session_id=${req.params.id} AND blocked_email=${email} LIMIT 1`);
    if(blocked.rows?.length){res.status(403).json({error:"You cannot chat in this stream."});return;}
  }catch(err){logger.error({err},"Chat moderation lookup failed");res.status(503).json({error:"Chat unavailable."});return;}
  const text=String(req.body?.text??"").trim().slice(0,500);
  if(!text){res.status(400).json({error:"Message is empty."});return;}
  try {
    const active:any=await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE id=${req.params.id} AND is_live=TRUE LIMIT 1`);
    if(!active.rows?.length){res.status(404).json({error:"This stream is not live."});return;}
  } catch(err){logger.error({err},"Live chat stream lookup failed");res.status(503).json({error:"Unable to verify stream."});return;}
  const auth=getAuth(req); const u=auth.userId?await clerkClient.users.getUser(auth.userId):null;
  const name=u ? ([u.firstName,u.lastName].filter(Boolean).join(" ") || email.split("@")[0]) : email.split("@")[0];
  const r:any=await db.execute(sql`INSERT INTO live_stream_messages(session_id,sender_email,sender_name,text) VALUES(${req.params.id},${email},${name},${text}) RETURNING id,sender_email,sender_name,text,created_at`);
  res.json({message:r.rows?.[0]});
});


// Persistent Shop-the-Stream spotlight. The server owns the pinned product,
// not browser localStorage, so all viewers see the same product.
async function ensureLiveSpotlights() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_stream_spotlights (
    session_id TEXT PRIMARY KEY,
    product_id INTEGER NOT NULL,
    featured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
router.get("/live/session/:id/featured", async (req,res) => {
  try {
    await ensureLiveSpotlights();
    const r:any = await db.execute(sql`SELECT p.product_id AS "productId", p.featured_at AS "featuredAt"
      FROM live_stream_spotlights p JOIN live_stream_sessions s ON s.id=p.session_id
      WHERE p.session_id=${req.params.id} AND s.is_live=TRUE LIMIT 1`);
    res.json({featured:r.rows?.[0] ?? null});
  } catch(err) { logger.error({err},"Failed to load live spotlight"); res.status(503).json({error:"Unable to load featured product."}); }
});
router.put("/live/session/:id/featured", async (req,res) => {
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in as the seller."});return;}
  const productId=Number(req.body?.productId);
  if(!Number.isSafeInteger(productId)||productId<=0){res.status(400).json({error:"Valid product ID required."});return;}
  try {
    const owned:any=await db.execute(sql`SELECT product_ids FROM live_stream_sessions
      WHERE id=${req.params.id} AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE LIMIT 1`);
    if(!owned.rows?.length){res.status(403).json({error:"You do not own an active stream."});return;}
    const ids=owned.rows[0].product_ids;
    if(!Array.isArray(ids)||!ids.some((id:unknown)=>Number(id)===productId)){
      res.status(400).json({error:"Product must be part of this stream."});return;
    }
    await ensureLiveSpotlights();
    await db.execute(sql`INSERT INTO live_stream_spotlights(session_id,product_id,featured_at)
      VALUES(${req.params.id},${productId},NOW())
      ON CONFLICT(session_id) DO UPDATE SET product_id=EXCLUDED.product_id,featured_at=NOW()`);
    res.json({ok:true,featured:{productId,featuredAt:new Date().toISOString()}});
  } catch(err){logger.error({err},"Failed to pin live product");res.status(503).json({error:"Unable to pin product."});}
});
router.delete("/live/session/:id/featured", async(req,res)=>{
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in as the seller."});return;}
  try {
    const owned:any=await db.execute(sql`SELECT 1 FROM live_stream_sessions
      WHERE id=${req.params.id} AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE LIMIT 1`);
    if(!owned.rows?.length){res.status(403).json({error:"You do not own an active stream."});return;}
    await ensureLiveSpotlights();
    await db.execute(sql`DELETE FROM live_stream_spotlights WHERE session_id=${req.params.id}`);
    res.json({ok:true});
  }catch(err){logger.error({err},"Failed to clear live spotlight");res.status(503).json({error:"Unable to clear spotlight."});}
});


// Authoritative live product quote. Never trust promotional prices from the browser.
router.get("/live/session/:id/product/:productId/quote",async(req,res)=>{
  const productId=Number(req.params.productId);
  if(!Number.isSafeInteger(productId)||productId<=0){res.status(400).json({error:"Invalid product."});return;}
  try{
    const r:any=await db.execute(sql`SELECT l.id,l.title,l.price,l.quantity,l.status
      FROM listings l JOIN live_stream_sessions s ON s.id=${req.params.id}
      WHERE l.id=${productId} AND s.is_live=TRUE
      AND s.product_ids::jsonb @> ${JSON.stringify([productId])}::jsonb LIMIT 1`);
    const p:any=r.rows?.[0];
    if(!p){res.status(404).json({error:"Product is unavailable in this stream."});return;}
    const quantity=Math.max(0,Number(p.quantity??0));
    const available=quantity>0 && ["active","approved","published"].includes(String(p.status).toLowerCase());
    res.setHeader("Cache-Control","no-store");
    let price=Number(p.price),discountPercent=0;
    const eventsTable=(await db.execute(sql`SELECT to_regclass('public.live_sale_events') AS name`)).rows[0]?.name;
    if(eventsTable){
      const promotion:any=await db.execute(sql`SELECT discount_percent FROM live_sale_events
        WHERE session_id=${req.params.id} AND product_id=${productId} AND kind='flash'
        AND cancelled_at IS NULL AND ends_at>NOW() ORDER BY created_at DESC LIMIT 1`);
      const pct=Number(promotion.rows?.[0]?.discount_percent??0);
      if(Number.isInteger(pct)&&pct>=1&&pct<=70){
        discountPercent=pct;price=Math.max(0.01,Math.round(price*(100-pct))/100);
      }
    }
    res.json({id:Number(p.id),title:p.title,price,quantity,available,discountPercent});
  }catch(err){logger.error({err},"Failed to quote live product");res.status(503).json({error:"Could not verify live price and stock."});}
});

async function ensureLiveEvents(){
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_sale_events (
    id BIGSERIAL PRIMARY KEY, session_id TEXT NOT NULL, product_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('auction','flash')),
    starting_price NUMERIC(12,2), current_bid NUMERIC(12,2), discount_percent INTEGER,
    ends_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ, winner_email TEXT
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_sale_bids (
    id BIGSERIAL PRIMARY KEY, event_id BIGINT NOT NULL REFERENCES live_sale_events(id),
    bidder_email TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
router.get("/live/session/:id/events",async(req,res)=>{
  try{
    await ensureLiveEvents();
    const r:any=await db.execute(sql`SELECT id,product_id AS "productId",kind,starting_price AS "startingPrice",
      current_bid AS "currentBid",discount_percent AS "discountPercent",ends_at AS "endsAt",
      cancelled_at IS NOT NULL AS cancelled,
      CASE WHEN ends_at<=NOW() THEN 'ended' ELSE 'active' END AS status
      FROM live_sale_events WHERE session_id=${req.params.id} ORDER BY created_at DESC LIMIT 30`);
    res.setHeader("Cache-Control","no-store");
    res.json({events:r.rows||[]});
  }catch(err){logger.error({err},"Live events lookup failed");res.status(503).json({error:"Could not load live sales."});}
});
router.post("/live/session/:id/events",async(req,res)=>{
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in as the seller."});return;}
  const productId=Number(req.body?.productId),minutes=Number(req.body?.minutes),kind=String(req.body?.kind||"");
  const startingPrice=Number(req.body?.startingPrice),discount=Number(req.body?.discountPercent);
  if(!Number.isSafeInteger(productId)||productId<=0||!Number.isInteger(minutes)||minutes<1||minutes>120||
    !["auction","flash"].includes(kind)||(kind==="auction"&&(!Number.isFinite(startingPrice)||startingPrice<=0))||
    (kind==="flash"&&(!Number.isInteger(discount)||discount<1||discount>70))){
    res.status(400).json({error:"Invalid event settings."});return;
  }
  try{
    const owned:any=await db.execute(sql`SELECT product_ids FROM live_stream_sessions WHERE id=${req.params.id}
      AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE LIMIT 1`);
    if(!owned.rows?.length){res.status(403).json({error:"Active seller session required."});return;}
    if(!Array.isArray(owned.rows[0].product_ids)||!owned.rows[0].product_ids.some((x:unknown)=>Number(x)===productId)){
      res.status(400).json({error:"Product is not in this stream."});return;
    }
    const item:any=await db.execute(sql`SELECT price,quantity,status FROM listings WHERE id=${productId} AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
    if(!item.rows?.length||Number(item.rows[0].quantity)<=0||!["active","approved","published"].includes(String(item.rows[0].status).toLowerCase())){
      res.status(400).json({error:"An available seller-owned listing is required."});return;
    }
    await ensureLiveEvents();
    const existing:any=await db.execute(sql`SELECT 1 FROM live_sale_events WHERE session_id=${req.params.id}
      AND product_id=${productId} AND ends_at>NOW() AND cancelled_at IS NULL LIMIT 1`);
    if(existing.rows?.length){res.status(409).json({error:"An event for this product is already active."});return;}
    const r:any=await db.execute(sql`INSERT INTO live_sale_events(session_id,product_id,kind,starting_price,discount_percent,ends_at)
      VALUES(${req.params.id},${productId},${kind},${kind==="auction"?startingPrice.toFixed(2):null},
      ${kind==="flash"?discount:null},NOW()+${minutes}*INTERVAL '1 minute') RETURNING id,ends_at`);
    res.status(201).json({ok:true,event:r.rows?.[0]});
  }catch(err){logger.error({err},"Could not create live event");res.status(503).json({error:"Could not start live event."});}
});
router.post("/live/session/:id/events/:eventId/bids",async(req,res)=>{
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in to bid."});return;}
  const amount=Number(req.body?.amount),eventId=Number(req.params.eventId);
  if(!Number.isSafeInteger(eventId)||!Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==amount*100){
    res.status(400).json({error:"Enter a valid bid amount in pounds and pence."});return;
  }
  try{
    await ensureLiveEvents();
    // A conditional UPDATE makes competing bids atomic: a lower simultaneous bid
    // cannot overwrite a higher one. Never accept a bid after the server deadline.
    const r:any=await db.execute(sql`UPDATE live_sale_events e SET current_bid=${amount.toFixed(2)}
      FROM live_stream_sessions s WHERE e.id=${eventId} AND e.session_id=${req.params.id}
      AND s.id=e.session_id AND s.is_live=TRUE AND e.kind='auction'
      AND e.ends_at>NOW() AND e.cancelled_at IS NULL
      AND LOWER(s.seller_email)<>LOWER(${email})
      AND ${amount.toFixed(2)}::numeric >= COALESCE(e.current_bid+0.01,e.starting_price)
      RETURNING e.id`);
    if(!r.rows?.length){res.status(409).json({error:"Auction ended, unavailable, or your bid is too low."});return;}
    await db.execute(sql`INSERT INTO live_sale_bids(event_id,bidder_email,amount) VALUES(${eventId},${email},${amount.toFixed(2)})`);
    res.status(201).json({ok:true,amount});
  }catch(err){logger.error({err},"Live bid failed");res.status(503).json({error:"Bid could not be recorded."});}
});
router.post("/live/session/:id/events/:eventId/cancel",async(req,res)=>{
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in as the seller."});return;}
  try{
    await ensureLiveEvents();
    const r:any=await db.execute(sql`UPDATE live_sale_events e SET cancelled_at=NOW()
      FROM live_stream_sessions s WHERE e.id=${Number(req.params.eventId)} AND e.session_id=${req.params.id}
      AND s.id=e.session_id AND LOWER(s.seller_email)=LOWER(${email})
      AND e.ends_at>NOW() AND e.cancelled_at IS NULL RETURNING e.id`);
    if(!r.rows?.length){res.status(404).json({error:"Active event not found."});return;}
    res.json({ok:true});
  }catch(err){logger.error({err},"Live event cancellation failed");res.status(503).json({error:"Could not cancel event."});}
});
// Events are promotional/bidding records only. Payment capture and auction winner
// fulfilment must be implemented in the existing checkout service before launch.


async function ensureCreatorTables(){
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_creator_schedules(
    id BIGSERIAL PRIMARY KEY,seller_email TEXT NOT NULL,title TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),cancelled_at TIMESTAMPTZ)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_creator_followers(
    seller_email TEXT NOT NULL,follower_email TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(seller_email,follower_email))`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_creator_notifications(
    id BIGSERIAL PRIMARY KEY,recipient_email TEXT NOT NULL,seller_email TEXT NOT NULL,
    schedule_id BIGINT,content TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),read_at TIMESTAMPTZ)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_creator_replays(
    id BIGSERIAL PRIMARY KEY,session_id TEXT NOT NULL,seller_email TEXT NOT NULL,
    title TEXT NOT NULL,url TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS live_creator_chat_blocks(
    session_id TEXT NOT NULL,blocked_email TEXT NOT NULL,blocked_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(session_id,blocked_email))`);
}
router.get("/live/creator/schedules",async(_req,res)=>{
  try{await ensureCreatorTables();const r:any=await db.execute(sql`SELECT id,seller_email AS "sellerEmail",title,scheduled_at AS "scheduledAt"
    FROM live_creator_schedules WHERE cancelled_at IS NULL AND scheduled_at>NOW() ORDER BY scheduled_at ASC LIMIT 100`);
    res.json({schedules:r.rows||[]});}catch(err){logger.error({err},"Schedules failed");res.status(503).json({error:"Schedules unavailable."});}
});
router.post("/live/creator/schedules",async(req,res)=>{
  const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
  const title=String(req.body?.title||"").trim().slice(0,160),date=new Date(req.body?.scheduledAt);
  if(!title||!Number.isFinite(date.getTime())||date.getTime()<Date.now()+60000||date.getTime()>Date.now()+90*86400000){
    res.status(400).json({error:"Provide a title and a date within the next 90 days."});return;}
  try{await ensureCreatorTables();
    const r:any=await db.execute(sql`INSERT INTO live_creator_schedules(seller_email,title,scheduled_at)
      VALUES(${email},${title},${date}) RETURNING id`);
    const id=r.rows[0].id;
    await db.execute(sql`INSERT INTO live_creator_notifications(recipient_email,seller_email,schedule_id,content)
      SELECT follower_email,${email},${id},${title} FROM live_creator_followers WHERE seller_email=${email}`);
    res.status(201).json({ok:true,id});
  }catch(err){logger.error({err},"Scheduling failed");res.status(503).json({error:"Could not schedule event."});}
});
router.post("/live/creator/:seller/follow",async(req,res)=>{
  const email=await authenticatedEmail(req),seller=String(req.params.seller).trim().toLowerCase();
  if(!email){res.status(401).json({error:"Sign in to follow."});return;}
  if(!seller.includes("@")||seller===email){res.status(400).json({error:"Invalid creator."});return;}
  try{await ensureCreatorTables();
    await db.execute(sql`INSERT INTO live_creator_followers(seller_email,follower_email) VALUES(${seller},${email}) ON CONFLICT DO NOTHING`);
    res.json({ok:true});
  }catch(err){logger.error({err},"Follow failed");res.status(503).json({error:"Could not follow creator."});}
});
router.get("/live/creator/notifications",async(req,res)=>{
  const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
  try{await ensureCreatorTables();
    const r:any=await db.execute(sql`SELECT id,seller_email AS "sellerEmail",content,created_at AS "createdAt"
      FROM live_creator_notifications WHERE recipient_email=${email} ORDER BY created_at DESC LIMIT 50`);
    res.json({notifications:r.rows||[]});
  }catch(err){logger.error({err},"Notifications failed");res.status(503).json({error:"Notifications unavailable."});}
});
router.get("/live/session/:id/creator-analytics",async(req,res)=>{
  const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
  try{await ensureCreatorTables();
    const r:any=await db.execute(sql`SELECT s.id,s.viewer_count AS "viewerCount",
      (SELECT COUNT(*)::int FROM live_stream_messages m WHERE m.session_id=s.id) AS "chatMessages",
      (SELECT COUNT(*)::int FROM live_sale_bids b JOIN live_sale_events e ON e.id=b.event_id WHERE e.session_id=s.id) AS bids,
      (SELECT COUNT(*)::int FROM live_creator_followers f WHERE f.seller_email=s.seller_email) AS followers
      FROM live_stream_sessions s WHERE s.id=${req.params.id} AND LOWER(s.seller_email)=LOWER(${email}) LIMIT 1`);
    if(!r.rows?.length){res.status(404).json({error:"Session not found."});return;}
    res.json({analytics:r.rows[0]});
  }catch(err){logger.error({err},"Creator analytics failed");res.status(503).json({error:"Analytics unavailable."});}
});
router.get("/live/session/:id/replays",async(req,res)=>{
  try{await ensureCreatorTables();const r:any=await db.execute(sql`SELECT id,title,url,created_at AS "createdAt" FROM live_creator_replays
    WHERE session_id=${req.params.id} ORDER BY created_at DESC LIMIT 20`);res.json({replays:r.rows||[]});
  }catch(err){logger.error({err},"Replays failed");res.status(503).json({error:"Replays unavailable."});}
});
router.post("/live/session/:id/replays",async(req,res)=>{
  const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
  const title=String(req.body?.title||"").trim().slice(0,160),url=String(req.body?.url||"").trim();
  let parsed:URL;try{parsed=new URL(url);if(parsed.protocol!=="https:")throw Error();}catch{res.status(400).json({error:"Valid HTTPS replay URL required."});return;}
  if(!title||url.length>2000){res.status(400).json({error:"Invalid replay details."});return;}
  try{await ensureCreatorTables();
    const owned:any=await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE id=${req.params.id} AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
    if(!owned.rows?.length){res.status(403).json({error:"Not your stream."});return;}
    const r:any=await db.execute(sql`INSERT INTO live_creator_replays(session_id,seller_email,title,url)
      VALUES(${req.params.id},${email},${title},${url}) RETURNING id`);
    res.status(201).json({ok:true,id:r.rows[0].id});
  }catch(err){logger.error({err},"Replay save failed");res.status(503).json({error:"Could not save replay."});}
});
router.post("/live/session/:id/moderation/block",async(req,res)=>{
  const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
  const target=String(req.body?.email||"").trim().toLowerCase();
  if(!target.includes("@")||target===email){res.status(400).json({error:"Invalid participant."});return;}
  try{await ensureCreatorTables();
    const owned:any=await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE id=${req.params.id} AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
    if(!owned.rows?.length){res.status(403).json({error:"Not your stream."});return;}
    await db.execute(sql`INSERT INTO live_creator_chat_blocks(session_id,blocked_email,blocked_by)
      VALUES(${req.params.id},${target},${email}) ON CONFLICT DO NOTHING`);
    res.json({ok:true});
  }catch(err){logger.error({err},"Moderation failed");res.status(503).json({error:"Could not block participant."});}
});


// Moderation actions require the owner of the stream. Deleted messages are
// removed from the shared database so they disappear on the next chat refresh.
router.delete("/live/session/:id/messages/:messageId",async(req,res)=>{
 const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
 const messageId=Number(req.params.messageId);
 if(!Number.isSafeInteger(messageId)||messageId<=0){res.status(400).json({error:"Invalid message."});return;}
 try{
  const owned:any=await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE id=${req.params.id}
    AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
  if(!owned.rows?.length){res.status(403).json({error:"Not your stream."});return;}
  const deleted:any=await db.execute(sql`DELETE FROM live_stream_messages WHERE id=${messageId}
    AND session_id=${req.params.id} RETURNING id`);
  if(!deleted.rows?.length){res.status(404).json({error:"Message not found."});return;}
  res.json({ok:true});
 }catch(err){logger.error({err},"Moderation delete failed");res.status(503).json({error:"Could not delete message."});}
});
router.post("/live/session/:id/moderation/unblock",async(req,res)=>{
 const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
 const target=String(req.body?.email||"").trim().toLowerCase();
 if(!target.includes("@")){res.status(400).json({error:"Invalid participant."});return;}
 try{
  await ensureCreatorTables();
  const owned:any=await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE id=${req.params.id}
    AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
  if(!owned.rows?.length){res.status(403).json({error:"Not your stream."});return;}
  await db.execute(sql`DELETE FROM live_creator_chat_blocks WHERE session_id=${req.params.id} AND blocked_email=${target}`);
  res.json({ok:true});
 }catch(err){logger.error({err},"Unblock failed");res.status(503).json({error:"Could not unblock participant."});}
});
router.delete("/live/creator/schedules/:id",async(req,res)=>{
 const email=await authenticatedEmail(req);if(!email){res.status(401).json({error:"Sign in required."});return;}
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0){res.status(400).json({error:"Invalid schedule."});return;}
 try{await ensureCreatorTables();
  const r:any=await db.execute(sql`UPDATE live_creator_schedules SET cancelled_at=NOW()
    WHERE id=${id} AND LOWER(seller_email)=LOWER(${email}) AND cancelled_at IS NULL RETURNING id`);
  if(!r.rows?.length){res.status(404).json({error:"Schedule not found."});return;}
  res.json({ok:true});
 }catch(err){logger.error({err},"Cancel schedule failed");res.status(503).json({error:"Could not cancel schedule."});}
});

export default router;

